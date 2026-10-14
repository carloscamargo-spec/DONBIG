// Conector de TheSportsDB (v1, gratis con la clave pública "123", 30 consultas/min).
// Respaldo cuando API-Football no da la temporada actual en su plan gratis.
//
// Da calendario, resultados y tabla de Liga MX (liga 4350). No trae pronósticos
// ni goleadores, así que la probabilidad se ESTIMA con la tabla (puntos y goles
// por partido + ventaja de local). Es orientativa y sirve para los momios simulados.
import type { Dataset, Match, MatchStats } from '../beto/data';
import { HOUR, MIN, cached, form, kickoff, roundLabel, shortName, teamKeys, type Json } from './apiFootball';

const KEY = process.env.THESPORTSDB_KEY || '123';
const BASE = `https://www.thesportsdb.com/api/v1/json/${KEY}/`;
const LEAGUE = Number(process.env.BETO_TSDB_LEAGUE_ID || 4350); // Liga MX
const MAX_MATCHES = 4;

const IN_PLAY = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP']);
const FINISHED = new Set(['FT', 'AET', 'PEN', 'MATCH FINISHED', 'AWD', 'WO']);
const DEAD = new Set(['PST', 'CANC', 'ABD']);

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
  const played = Date.now() - new Date(startIso(e)).getTime() > 3 * HOUR;
  return played && score(e.intHomeScore) !== null && score(e.intAwayScore) !== null;
}

// ---------- Datos ----------

const events = (kind: 'next' | 'past') => cached(`tsdb-${kind}-${LEAGUE}`, 20 * MIN, async () => {
  const r = await tsdb(kind === 'next' ? `eventsnextleague.php?id=${LEAGUE}` : `eventspastleague.php?id=${LEAGUE}`);
  return (Array.isArray(r?.events) ? r.events : []) as Json[];
});

const table = (season: string) => cached(`tsdb-table-${LEAGUE}-${season}`, 3 * HOUR, async () => {
  const r = await tsdb(`lookuptable.php?l=${LEAGUE}&s=${encodeURIComponent(season)}`);
  return (Array.isArray(r?.table) ? r.table : []) as Json[];
});

// ---------- Estimación con la tabla ----------

interface Row { rank: number; pts: number; pj: number; gf: number; ga: number; form: string }

function row(t: Json): Row | null {
  const pj = Number(t.intPlayed);
  if (!pj) return null;
  return { rank: Number(t.intRank), pts: Number(t.intPoints), pj, gf: Number(t.intGoalsFor), ga: Number(t.intGoalsAgainst), form: String(t.strForm ?? '') };
}

/** Probabilidad local/empate/visita estimada (orientativa). */
function estimate(h: Row, a: Row): [number, number, number] {
  const strength = (r: Row) => r.pts / r.pj + 0.35 * ((r.gf - r.ga) / r.pj);
  const diff = strength(h) + 0.25 - strength(a); // 0.25 = ventaja de local
  const draw = 0.27;
  const home = 1 / (1 + Math.exp(-0.8 * diff));
  const ph = Math.round((1 - draw) * home * 100), pa = Math.round((1 - draw) * (1 - home) * 100);
  return [ph, 100 - ph - pa, pa];
}

const per = (n: number, pj: number) => Math.round((n / pj) * 10) / 10;

function enrich(m: Match, h: Row | null, a: Row | null, stats: Record<string, MatchStats>) {
  if (h) m.formaLocal = form(h.form);
  if (a) m.formaVisita = form(a.form);
  if (!h || !a) return;
  m.prob = estimate(h, a);
  m.dato = `${m.local} va ${h.rank}º con ${h.pts} pts; ${m.visita} va ${a.rank}º con ${a.pts} pts.`;
  const goals = (h.gf / h.pj + a.ga / a.pj + a.gf / a.pj + h.ga / h.pj) / 2;
  stats[m.id] = {
    rows: [
      ['Puntos/p', per(h.pts, h.pj), per(a.pts, a.pj)],
      ['Goles a favor/p', per(h.gf, h.pj), per(a.gf, a.pj)],
      ['Goles en contra/p', per(h.ga, h.pj), per(a.ga, a.pj)],
      ['Partidos jugados', h.pj, a.pj],
    ],
    pos: [
      [`Gana ${m.local}`, m.prob[0] + '%'], ['Empate', m.prob[1] + '%'], [`Gana ${m.visita}`, m.prob[2] + '%'],
      [goals > 2.6 ? 'Más de 2.5 goles' : 'Menos de 2.5 goles', 'Tendencia'],
    ],
  };
}

// ---------- Dataset ----------

function toMatch(e: Json): Match {
  const st = status(e);
  const local = shortName(e.strHomeTeam), visita = shortName(e.strAwayTeam);
  const hs = score(e.intHomeScore) ?? 0, as = score(e.intAwayScore) ?? 0;
  const m: Match = {
    id: 'tsdb-' + e.idEvent, liga: roundLabel(e.intRound ? 'Jornada ' + e.intRound : undefined),
    local, visita, formaLocal: '', formaVisita: '', dato: '',
    keys: [...teamKeys(e.strHomeTeam), ...teamKeys(e.strAwayTeam)],
  };
  if (IN_PLAY.has(st)) m.marcador = `${hs} - ${as} · ${st === 'HT' ? 'MT' : 'En juego'}`;
  else if (isFinished(e)) { m.hora = `Final ${hs} - ${as}`; m.finished = true; }
  else m.hora = kickoff(startIso(e));
  return m;
}

export async function theSportsDbDataset(): Promise<Dataset> {
  const [next, past] = await Promise.all([events('next'), events('past').catch(() => [] as Json[])]);
  const seen = new Set<string>();
  const all = [...next, ...past].filter(e => e?.idEvent && !seen.has(e.idEvent) && seen.add(e.idEvent) && !DEAD.has(status(e)));
  const t = (e: Json) => new Date(startIso(e)).getTime();
  const live = all.filter(e => IN_PLAY.has(status(e)));
  const upcoming = all.filter(e => !IN_PLAY.has(status(e)) && !isFinished(e)).sort((a, b) => t(a) - t(b));
  const done = all.filter(e => isFinished(e)).sort((a, b) => t(b) - t(a));
  const chosen = [...live, ...upcoming, ...done].slice(0, MAX_MATCHES);
  if (!chosen.length) throw new Error('no devolvió partidos de Liga MX');

  const season = String(chosen[0].strSeason || '');
  const rows = new Map<string, Row>();
  if (season) {
    const tb = await table(season).catch(e => { console.warn('TheSportsDB tabla:', (e as Error).message); return [] as Json[]; });
    for (const r of tb) { const x = row(r); if (x) rows.set(String(r.idTeam), x); }
  }

  const ds: Dataset = { source: 'thesportsdb', updatedAt: new Date().toISOString(), matches: [], players: {}, stats: {} };
  for (const e of chosen) {
    const m = toMatch(e);
    enrich(m, rows.get(String(e.idHomeTeam)) ?? null, rows.get(String(e.idAwayTeam)) ?? null, ds.stats);
    if (!m.dato) m.dato = 'Partido de Liga MX' + (e.intRound ? ', jornada ' + e.intRound : '') + '.';
    ds.matches.push(m);
  }
  return ds;
}
