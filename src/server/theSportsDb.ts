// Conector de TheSportsDB (v1, gratis con la clave pública "123", 30 consultas/min).
//
// Trae calendario, resultados y tabla de:
//  - Liga MX (respaldo cuando API-Football no da la temporada actual en su plan gratis)
//  - Premier League, NFL y MLB (referencias de otros deportes para BETO).
// No trae pronósticos ni jugadores, así que la probabilidad se ESTIMA con la tabla
// (rendimiento por partido + ventaja de local). Es orientativa y alimenta los momios simulados.
import type { Dataset, Match, MatchStats, Sport } from '../beto/data';
import { HOUR, MIN, cached, form, kickoff, shortName, teamKeys, type Json } from './apiFootball';

const KEY = process.env.THESPORTSDB_KEY || '123';
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}/`;

interface League { id: number; name: string; deporte: Sport; max: number; draw: boolean; round: string; unit: string }

export const LIGA_MX: League = { id: Number(process.env.BETO_TSDB_LEAGUE_ID || 4350), name: 'Liga MX', deporte: 'futbol', max: 4, draw: true, round: 'Jornada', unit: 'Goles' };
export const EXTRA_LEAGUES: League[] = [
  { id: 4328, name: 'Premier League', deporte: 'futbol', max: 2, draw: true, round: 'Jornada', unit: 'Goles' },
  { id: 4391, name: 'NFL', deporte: 'nfl', max: 2, draw: false, round: 'Semana', unit: 'Puntos' },
  { id: 4424, name: 'MLB', deporte: 'beisbol', max: 2, draw: false, round: '', unit: 'Carreras' },
];

const IN_PLAY = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP', 'IN PLAY', 'Q1', 'Q2', 'Q3', 'Q4', 'OT']);
const FINISHED = new Set(['FT', 'AET', 'PEN', 'MATCH FINISHED', 'AWD', 'WO', 'AOT', 'FINAL']);
const DEAD = new Set(['PST', 'CANC', 'ABD', 'POSTPONED', 'CANCELLED']);

async function tsdb(path: string): Promise<Json> {
  const res = await fetch(BASE + path, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`HTTP ${res.status} en ${path}`);
  const text = await res.text();
  try { return JSON.parse(text); } catch { throw new Error('respuesta no es JSON en ' + path); }
}

const status = (e: Json) => String(e.strStatus ?? '').trim().toUpperCase();

/** Fecha del evento en UTC (strTimestamp viene sin zona). */
function startIso(e: Json): string {
  const ts = e.strTimestamp as string | undefined;
  if (ts) return /[zZ]|[+-]\d\d:?\d\d$/.test(ts) ? ts : ts + 'Z';
  return `${e.dateEvent}T${e.strTime || '00:00:00'}Z`;
}

const score = (v: unknown) => (v === null || v === undefined || v === '' ? null : Number(v));

function isFinished(e: Json) {
  if (FINISHED.has(status(e))) return true;
  const played = Date.now() - new Date(startIso(e)).getTime() > 4 * HOUR;
  return played && score(e.intHomeScore) !== null && score(e.intAwayScore) !== null;
}

/** Nombre corto: Liga MX con el mapa de apodos; NFL/MLB el mote ("Kansas City Chiefs" → "Chiefs"). */
function teamName(raw: string, lg: League) {
  if (lg.deporte === 'futbol') return shortName(raw).replace(/\s+FC$/, '');
  const w = String(raw).trim().split(/\s+/);
  const two = ['Sox', 'Jays'].includes(w[w.length - 1]);
  return w.slice(two ? -2 : -1).join(' ');
}

// ---------- Datos ----------

const events = (lg: League, kind: 'next' | 'past') => cached(`tsdb-${kind}-${lg.id}`, 20 * MIN, async () => {
  const r = await tsdb(kind === 'next' ? `eventsnextleague.php?id=${lg.id}` : `eventspastleague.php?id=${lg.id}`);
  return (Array.isArray(r?.events) ? r.events : []) as Json[];
});

const table = (lg: League, season: string) => cached(`tsdb-table-${lg.id}-${season}`, 3 * HOUR, async () => {
  const r = await tsdb(`lookuptable.php?l=${lg.id}&s=${encodeURIComponent(season)}`);
  return (Array.isArray(r?.table) ? r.table : []) as Json[];
});

// ---------- Estimación con la tabla ----------

interface Row { rank: number; pts: number; pj: number; w: number; l: number; gf: number; ga: number; form: string }

function row(t: Json): Row | null {
  const pj = Number(t.intPlayed);
  if (!pj) return null;
  return {
    rank: Number(t.intRank), pts: Number(t.intPoints) || 0, pj, w: Number(t.intWin) || 0, l: Number(t.intLoss) || 0,
    gf: Number(t.intGoalsFor) || 0, ga: Number(t.intGoalsAgainst) || 0, form: String(t.strForm ?? ''),
  };
}

/** Probabilidad local/empate/visita estimada (orientativa). Sin empate en NFL/MLB. */
function estimate(h: Row, a: Row, lg: League): [number, number, number] {
  if (!lg.draw) {
    const wr = (r: Row) => r.w / r.pj;
    const home = Math.min(0.85, Math.max(0.15, 0.5 + (wr(h) - wr(a)) * 0.6 + 0.04));
    const ph = Math.round(home * 100);
    return [ph, 0, 100 - ph];
  }
  const strength = (r: Row) => r.pts / r.pj + 0.35 * ((r.gf - r.ga) / r.pj);
  const diff = strength(h) + 0.25 - strength(a); // 0.25 = ventaja de local
  const draw = 0.27;
  const home = 1 / (1 + Math.exp(-0.8 * diff));
  const ph = Math.round((1 - draw) * home * 100), pa = Math.round((1 - draw) * (1 - home) * 100);
  return [ph, 100 - ph - pa, pa];
}

const per = (n: number, pj: number) => Math.round((n / pj) * 10) / 10;

function enrich(m: Match, h: Row | null, a: Row | null, lg: League, stats: Record<string, MatchStats>) {
  if (h) m.formaLocal = form(h.form);
  if (a) m.formaVisita = form(a.form);
  if (!h || !a) return;
  m.prob = estimate(h, a, lg);
  const unit = lg.unit.toLowerCase();
  m.dato = lg.draw
    ? `${m.local} va ${h.rank}º con ${h.pts} pts; ${m.visita} va ${a.rank}º con ${a.pts} pts.`
    : `${m.local} trae récord de ${h.w}-${h.l}; ${m.visita} de ${a.w}-${a.l}.`;
  const rows: [string, number, number][] = lg.draw
    ? [['Puntos/p', per(h.pts, h.pj), per(a.pts, a.pj)]]
    : [['Victorias', h.w, a.w], ['Derrotas', h.l, a.l]];
  rows.push([`${lg.unit} a favor/p`, per(h.gf, h.pj), per(a.gf, a.pj)], [`${lg.unit} en contra/p`, per(h.ga, h.pj), per(a.ga, a.pj)]);
  const pos: [string, string][] = [[`Gana ${m.local}`, m.prob[0] + '%']];
  if (lg.draw) pos.push(['Empate', m.prob[1] + '%']);
  pos.push([`Gana ${m.visita}`, m.prob[2] + '%']);
  if (lg.draw) {
    const goals = (h.gf / h.pj + a.ga / a.pj + a.gf / a.pj + h.ga / h.pj) / 2;
    pos.push([goals > 2.6 ? 'Más de 2.5 goles' : 'Menos de 2.5 goles', 'Tendencia']);
  } else {
    const total = Math.round(((h.gf + a.ga) / h.pj / 2 + (a.gf + h.ga) / a.pj / 2) * 10) / 10;
    pos.push([`Total esperado ≈ ${total} ${unit}`, 'Tendencia']);
  }
  stats[m.id] = { rows, pos };
}

// ---------- Partidos por liga ----------

function toMatch(e: Json, lg: League): Match {
  const st = status(e);
  const local = teamName(e.strHomeTeam, lg), visita = teamName(e.strAwayTeam, lg);
  const hs = score(e.intHomeScore) ?? 0, as = score(e.intAwayScore) ?? 0;
  const m: Match = {
    id: 'tsdb-' + e.idEvent, deporte: lg.deporte,
    liga: lg.name + (lg.round && e.intRound && Number(e.intRound) < 100 ? ` · ${lg.round} ${e.intRound}` : ''),
    local, visita, formaLocal: '', formaVisita: '', dato: '',
    keys: [...teamKeys(e.strHomeTeam), ...teamKeys(e.strAwayTeam), local.toLowerCase(), visita.toLowerCase()],
  };
  if (IN_PLAY.has(st)) m.marcador = `${hs} - ${as} · ${st === 'HT' ? 'MT' : 'En juego'}`;
  else if (isFinished(e)) { m.hora = `Final ${hs} - ${as}`; m.finished = true; }
  else m.hora = kickoff(startIso(e));
  return m;
}

async function leagueData(lg: League): Promise<{ matches: Match[]; stats: Record<string, MatchStats> }> {
  const [next, past] = await Promise.all([events(lg, 'next'), events(lg, 'past').catch(() => [] as Json[])]);
  const seen = new Set<string>();
  const all = [...next, ...past].filter(e => e?.idEvent && !seen.has(e.idEvent) && seen.add(e.idEvent) && !DEAD.has(status(e)));
  const t = (e: Json) => new Date(startIso(e)).getTime();
  const live = all.filter(e => IN_PLAY.has(status(e)));
  const upcoming = all.filter(e => !IN_PLAY.has(status(e)) && !isFinished(e)).sort((a, b) => t(a) - t(b));
  const done = all.filter(e => isFinished(e)).sort((a, b) => t(b) - t(a));
  const chosen = [...live, ...upcoming, ...done].slice(0, lg.max);
  if (!chosen.length) throw new Error('no devolvió partidos de ' + lg.name);

  const season = String(chosen[0].strSeason || '');
  const rows = new Map<string, Row>();
  if (season) {
    const tb = await table(lg, season).catch(e => { console.warn(`TheSportsDB tabla ${lg.name}:`, (e as Error).message); return [] as Json[]; });
    for (const r of tb) { const x = row(r); if (x) rows.set(String(r.idTeam), x); }
  }
  const stats: Record<string, MatchStats> = {};
  const matches = chosen.map(e => {
    const m = toMatch(e, lg);
    enrich(m, rows.get(String(e.idHomeTeam)) ?? null, rows.get(String(e.idAwayTeam)) ?? null, lg, stats);
    if (!m.dato) m.dato = `Partido de ${lg.name}` + (lg.round && e.intRound && Number(e.intRound) < 100 ? `, ${lg.round.toLowerCase()} ${e.intRound}` : '') + '.';
    return m;
  });
  return { matches, stats };
}

/** Liga MX desde TheSportsDB (respaldo de API-Football). */
export async function theSportsDbDataset(): Promise<Dataset> {
  const { matches, stats } = await leagueData(LIGA_MX);
  return { source: 'thesportsdb', updatedAt: new Date().toISOString(), matches, players: {}, stats };
}

/** Premier League, NFL y MLB. Cada liga que falle simplemente no aparece. */
export async function extraLeagues(): Promise<{ matches: Match[]; stats: Record<string, MatchStats>; errors: string[] }> {
  const res = await Promise.allSettled(EXTRA_LEAGUES.map(leagueData));
  const out = { matches: [] as Match[], stats: {} as Record<string, MatchStats>, errors: [] as string[] };
  res.forEach((r, i) => {
    if (r.status === 'fulfilled') { out.matches.push(...r.value.matches); Object.assign(out.stats, r.value.stats); }
    else out.errors.push(EXTRA_LEAGUES[i].name + ': ' + (r.reason as Error).message);
  });
  return out;
}
