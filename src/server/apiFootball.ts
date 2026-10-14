// Conector de API-Football (v3) para BETO. Solo corre en el servidor (funciones de Netlify).
//
// Arma un Dataset con los partidos de Liga MX (en vivo, próximos y recién terminados),
// el pronóstico, la forma, la comparativa y los goleadores de cada partido.
//
// El plan gratis da ~100 consultas al día, así que todo pasa por una caché en
// Netlify Blobs (compartida entre instancias) con respaldo en memoria. Si la API
// falla o se acaba la cuota, se sirve lo último guardado; si no hay nada, el DEMO.
import { getStore } from '@netlify/blobs';
import { DEMO, norm, type Dataset, type Match, type MatchStats, type Player } from '../beto/data';

const BASE = 'https://v3.football.api-sports.io';
const LEAGUE = Number(process.env.BETO_LEAGUE_ID || 262); // 262 = Liga MX
const TZ = 'America/Mexico_City';
const MAX_MATCHES = 4;

export const MIN = 60_000, HOUR = 60 * MIN;
const TTL = {
  season: 24 * HOUR,
  fixturesLive: Number(process.env.BETO_LIVE_TTL_MIN || 5) * MIN,
  fixturesIdle: 30 * MIN,
  prediction: 6 * HOUR,
  topscorers: 12 * HOUR,
};

const IN_PLAY = new Set(['1H', 'HT', '2H', 'ET', 'BT', 'P', 'LIVE', 'INT', 'SUSP']);
const UPCOMING = new Set(['NS', 'TBD']);
const FINISHED = new Set(['FT', 'AET', 'PEN']);

class ApiFootballError extends Error {}

/** Clave de API-Sports. Acepta API_FOOTBALL_KEY o API_FOOTBALL (como quedó en Netlify). */
const apiKey = () => (process.env.API_FOOTBALL_KEY || process.env.API_FOOTBALL || '').trim();

// ---------- HTTP ----------

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Json = any;

async function af(path: string, params: Record<string, string | number>): Promise<Json[]> {
  const key = apiKey();
  if (!key) throw new ApiFootballError('Falta la variable API_FOOTBALL_KEY');
  const url = new URL(path, BASE);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v));
  const res = await fetch(url, { headers: { 'x-apisports-key': key }, signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new ApiFootballError(`HTTP ${res.status} en ${path}`);
  const body = await res.json();
  const errs = body?.errors;
  const msg = Array.isArray(errs) ? errs.join('; ') : errs && typeof errs === 'object' ? Object.values(errs).join('; ') : '';
  if (msg) throw new ApiFootballError(msg);
  return Array.isArray(body?.response) ? body.response : [];
}

// ---------- Caché ----------

interface Entry<T> { at: number; ttl: number; data: T }
const memory = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();
/** Fallas recientes por clave: no se reintenta antes de RETRY_AFTER para no gastar cuota. */
const failures = new Map<string, { until: number; error: Error }>();
const RETRY_AFTER = 10 * MIN;

function store() {
  try { return getStore('beto-api-football'); } catch { return null; }
}

async function readEntry<T>(key: string): Promise<Entry<T> | null> {
  const m = memory.get(key) as Entry<T> | undefined;
  if (m) return m;
  try {
    const e = (await store()?.get(key, { type: 'json' })) as Entry<T> | null;
    if (e) memory.set(key, e);
    return e ?? null;
  } catch { return null; }
}

async function writeEntry<T>(key: string, e: Entry<T>) {
  memory.set(key, e);
  try { await store()?.setJSON(key, e); } catch { /* sin Blobs (local): solo memoria */ }
}

/** Devuelve el valor en caché si sigue vigente; si no, lo pide. Si falla, sirve el viejo. */
export async function cached<T>(key: string, ttl: number | ((data: T) => number), load: () => Promise<T>): Promise<T> {
  const old = await readEntry<T>(key);
  if (old && Date.now() - old.at < old.ttl) return old.data;
  const fail = failures.get(key);
  if (fail && Date.now() < fail.until) {
    if (old) return old.data;
    throw fail.error;
  }
  if (inflight.has(key)) return inflight.get(key) as Promise<T>;
  const p = (async () => {
    try {
      const data = await load();
      await writeEntry(key, { at: Date.now(), ttl: typeof ttl === 'function' ? ttl(data) : ttl, data });
      failures.delete(key);
      return data;
    } catch (e) {
      failures.set(key, { until: Date.now() + RETRY_AFTER, error: e as Error });
      if (old) { console.warn('API-Football: uso caché vieja de', key, '-', (e as Error).message); return old.data; }
      throw e;
    } finally { inflight.delete(key); }
  })();
  inflight.set(key, p);
  return p;
}

// ---------- Utilidades de formato ----------

/** Nombres cortos como los dice la afición. */
const SHORT: Record<string, string> = {
  'club america': 'América', 'america': 'América', 'guadalajara chivas': 'Chivas', 'guadalajara': 'Chivas',
  'tigres uanl': 'Tigres', 'u.n.a.m. - pumas': 'Pumas', 'unam pumas': 'Pumas', 'pumas unam': 'Pumas',
  'atletico san luis': 'San Luis', 'fc juarez': 'Juárez', 'leon': 'León', 'queretaro': 'Querétaro',
  'santos laguna': 'Santos', 'mazatlan': 'Mazatlán', 'mazatlan fc': 'Mazatlán', 'monterrey': 'Monterrey',
  'cruz azul': 'Cruz Azul', 'toluca': 'Toluca', 'pachuca': 'Pachuca', 'atlas': 'Atlas', 'necaxa': 'Necaxa',
  'puebla': 'Puebla', 'tijuana': 'Tijuana', 'club tijuana': 'Tijuana',
};
/** Apodos extra para encontrar el partido cuando el usuario escribe. */
const ALIASES: Record<string, string[]> = {
  'América': ['aguilas', 'americanistas'], 'Chivas': ['guadalajara', 'rebano'], 'Monterrey': ['rayados'],
  'Tigres': ['felinos', 'uanl'], 'Pumas': ['unam'], 'Cruz Azul': ['maquina', 'cementeros'], 'Toluca': ['diablos'],
  'Pachuca': ['tuzos'], 'Santos': ['laguna', 'guerreros'], 'Tijuana': ['xolos'], 'León': ['esmeraldas', 'fiera'],
  'Atlas': ['zorros'], 'Puebla': ['franja', 'camoteros'], 'Querétaro': ['gallos'], 'Necaxa': ['rayos'],
  'Juárez': ['bravos'], 'Mazatlán': ['canoneros'], 'San Luis': ['potosinos'],
};
const STOP = new Set(['club', 'fc', 'cf', 'de', 'del', 'la', 'el', 'futbol', 'deportivo', 'city', 'angeles']);

export const shortName = (name: string) => SHORT[norm(name)] ?? name;

export function teamKeys(raw: string): string[] {
  const short = shortName(raw);
  const words = `${norm(raw)} ${norm(short)}`.split(/[^a-z0-9]+/).filter(w => w.length >= 4 && !STOP.has(w));
  return [...new Set([norm(short), ...words, ...(ALIASES[short] ?? [])])];
}

const DAY_FMT = new Intl.DateTimeFormat('es-MX', { timeZone: TZ, weekday: 'short' });
const TIME_FMT = new Intl.DateTimeFormat('es-MX', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false });
const DATE_FMT = new Intl.DateTimeFormat('es-MX', { timeZone: TZ, day: 'numeric', month: 'numeric' });
const ISO_DAY = new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' });

export function kickoff(iso: string) {
  const d = new Date(iso);
  const wd = DAY_FMT.format(d).replace('.', '');
  const day = wd.charAt(0).toUpperCase() + wd.slice(1);
  const far = d.getTime() - Date.now() > 6 * 24 * HOUR;
  return `${day}${far ? ' ' + DATE_FMT.format(d) : ''} ${TIME_FMT.format(d)}`;
}

const isoDay = (offsetDays: number) => ISO_DAY.format(new Date(Date.now() + offsetDays * 24 * HOUR));

export function roundLabel(round: string | undefined) {
  const n = round?.match(/(\d+)\s*$/)?.[1];
  return 'Liga MX · ' + (n ? 'Jornada ' + n : round || 'Temporada');
}

const FORM: Record<string, string> = { W: 'G', D: 'E', L: 'P' };
export const form = (s: string | null | undefined) =>
  (s || '').slice(-5).split('').map(c => FORM[c] ?? c).join(' ');

const pct = (v: unknown) => {
  const n = parseInt(String(v ?? ''), 10);
  return Number.isFinite(n) ? n : null;
};
const num = (v: unknown) => {
  const n = parseFloat(String(v ?? ''));
  return Number.isFinite(n) ? n : null;
};

// ---------- Mapeo ----------

function baseMatch(f: Json): Match {
  const st = f.fixture.status.short as string;
  const local = shortName(f.teams.home.name), visita = shortName(f.teams.away.name);
  const h = f.goals.home ?? 0, a = f.goals.away ?? 0;
  const m: Match = {
    id: String(f.fixture.id), liga: roundLabel(f.league.round), local, visita,
    formaLocal: '', formaVisita: '', dato: '',
    keys: [...teamKeys(f.teams.home.name), ...teamKeys(f.teams.away.name)],
  };
  if (IN_PLAY.has(st)) m.marcador = `${h} - ${a} · ${st === 'HT' ? 'MT' : (f.fixture.status.elapsed ?? 0) + "'"}`;
  else if (FINISHED.has(st)) { m.hora = `Final ${h} - ${a}`; m.finished = true; }
  else m.hora = kickoff(f.fixture.date);
  return m;
}

function applyPrediction(m: Match, f: Json, pr: Json, stats: Record<string, MatchStats>) {
  const p = pr?.predictions, th = pr?.teams?.home, ta = pr?.teams?.away;
  const ph = pct(p?.percent?.home), pd = pct(p?.percent?.draw), pa = pct(p?.percent?.away);
  if (ph !== null && pd !== null && pa !== null) m.prob = [ph, pd, pa];
  m.formaLocal = form(th?.league?.form);
  m.formaVisita = form(ta?.league?.form);

  // Dato: historial directo, o la comparativa general.
  const h2h: Json[] = Array.isArray(pr?.h2h) ? pr.h2h.slice(0, 6) : [];
  const homeId = f.teams.home.id;
  if (h2h.length >= 2) {
    const wins = h2h.filter(g => (g.teams?.home?.id === homeId ? g.teams.home.winner : g.teams?.away?.winner) === true).length;
    m.dato = `${m.local} ganó ${wins} de los últimos ${h2h.length} duelos directos contra ${m.visita}.`;
  } else if (pr?.comparison?.total) {
    m.dato = `Comparativa general: ${m.local} ${pr.comparison.total.home} vs ${m.visita} ${pr.comparison.total.away}.`;
  }

  // Estadísticas y posibilidades.
  const rows: [string, number, number][] = [];
  const gf = [num(th?.league?.goals?.for?.average?.total), num(ta?.league?.goals?.for?.average?.total)];
  const ga = [num(th?.league?.goals?.against?.average?.total), num(ta?.league?.goals?.against?.average?.total)];
  if (gf[0] !== null && gf[1] !== null) rows.push(['Goles a favor/p', gf[0], gf[1]]);
  if (ga[0] !== null && ga[1] !== null) rows.push(['Goles en contra/p', ga[0], ga[1]]);
  const cmp = pr?.comparison ?? {};
  for (const [k, label] of [['form', 'Forma %'], ['att', 'Ataque %'], ['def', 'Defensa %'], ['h2h', 'Historial directo %']] as const) {
    const a = pct(cmp[k]?.home), b = pct(cmp[k]?.away);
    if (a !== null && b !== null && rows.length < 5) rows.push([label, a, b]);
  }
  const pos: [string, string][] = [];
  if (m.prob) {
    pos.push([`Gana ${m.local}`, m.prob[0] + '%'], ['Empate', m.prob[1] + '%'], [`Gana ${m.visita}`, m.prob[2] + '%']);
  }
  const uo = String(p?.under_over ?? '');
  const line = uo.match(/^([+-])\s*([\d.]+)/);
  if (line) pos.push([(line[1] === '+' ? 'Más de ' : 'Menos de ') + line[2] + ' goles', 'Tendencia']);
  if (rows.length || pos.length) stats[m.id] = { rows, pos };
}

const POS: Record<string, string> = { Attacker: 'DEL', Midfielder: 'MED', Defender: 'DEF', Goalkeeper: 'POR' };
const TAKES = [
  'Si le llega limpia, la mete. Hay que vigilarlo de cerca.',
  'Peligro constante en el área. No le den espacio.',
  'Pieza clave en el ataque. Si se apaga él, se apaga el equipo.',
];

function playersFor(f: Json, scorers: Json[]): Player[] {
  const ids = new Set([f.teams.home.id, f.teams.away.id]);
  return scorers
    .map((s, i) => ({ s, rank: i + 1, st: s.statistics?.[0] }))
    .filter(x => x.st && ids.has(x.st.team?.id))
    .slice(0, 3)
    .map(({ s, rank, st }, i) => {
      const g = st.goals?.total ?? 0, as = st.goals?.assists ?? 0, pj = st.games?.appearences ?? st.games?.appearances ?? 0;
      const op = rank === 1 ? `El máximo goleador de la Liga MX. ${TAKES[0]}` : `Es ${rank}º en la tabla de goleo. ${TAKES[i % TAKES.length]}`;
      return { name: s.player?.name ?? '—', team: shortName(st.team?.name ?? ''), pos: POS[st.games?.position] ?? '—', stat: `${g} goles · ${as} asist. · ${pj} PJ`, op };
    });
}

// ---------- Dataset ----------

async function currentSeason(): Promise<number> {
  if (process.env.BETO_SEASON) return Number(process.env.BETO_SEASON);
  return cached(`season-${LEAGUE}`, TTL.season, async () => {
    const r = await af('/leagues', { id: LEAGUE, current: 'true' });
    const year = r[0]?.seasons?.find((s: Json) => s.current)?.year;
    if (!year) throw new ApiFootballError('No encontré la temporada actual de la liga ' + LEAGUE);
    return year as number;
  });
}

async function fixtures(season: number): Promise<Json[]> {
  return cached(`fixtures-${LEAGUE}-${season}`,
    (list: Json[]) => (list.some(f => IN_PLAY.has(f.fixture.status.short)) ? TTL.fixturesLive : TTL.fixturesIdle),
    async () => {
      let list = await af('/fixtures', { league: LEAGUE, season, from: isoDay(-1), to: isoDay(10), timezone: TZ });
      if (!list.length) list = await af('/fixtures', { league: LEAGUE, next: MAX_MATCHES, timezone: TZ });
      return list;
    });
}

function pickFixtures(list: Json[]): Json[] {
  const by = (s: Set<string>) => list.filter(f => s.has(f.fixture.status.short));
  const t = (f: Json) => f.fixture.timestamp as number;
  return [
    ...by(IN_PLAY),
    ...by(UPCOMING).sort((a, b) => t(a) - t(b)),
    ...by(FINISHED).sort((a, b) => t(b) - t(a)),
  ].slice(0, MAX_MATCHES);
}

async function buildDataset(): Promise<Dataset> {
  const season = await currentSeason();
  const chosen = pickFixtures(await fixtures(season));
  const [preds, scorers] = await Promise.all([
    Promise.allSettled(chosen.map(f =>
      cached(`prediction-${f.fixture.id}`, TTL.prediction, async () => (await af('/predictions', { fixture: f.fixture.id }))[0] ?? null))),
    cached(`topscorers-${LEAGUE}-${season}`, TTL.topscorers, () => af('/players/topscorers', { league: LEAGUE, season }))
      .catch(e => { console.warn('API-Football topscorers:', (e as Error).message); return [] as Json[]; }),
  ]);
  const ds: Dataset = { source: 'api-football', updatedAt: new Date().toISOString(), matches: [], players: {}, stats: {} };
  chosen.forEach((f, i) => {
    const m = baseMatch(f);
    const pr = preds[i];
    if (pr.status === 'fulfilled' && pr.value) applyPrediction(m, f, pr.value, ds.stats);
    else if (pr.status === 'rejected') console.warn('API-Football prediction', f.fixture.id, (pr.reason as Error).message);
    if (!m.dato) m.dato = 'Partido de ' + m.liga.replace('Liga MX · ', '') + ' de la Liga MX.';
    const pl = playersFor(f, scorers);
    if (pl.length) ds.players[m.id] = pl;
    ds.matches.push(m);
  });
  return ds;
}

/** Dataset de API-Football, o lanza error si no se puede. */
async function apiFootballDataset(): Promise<Dataset> {
  const ds = await buildDataset();
  if (!ds.matches.length) throw new ApiFootballError('no devolvió partidos de Liga MX en estas fechas');
  return ds;
}

/**
 * Dataset para BETO.
 * Fútbol mexicano: API-Football (si hay clave y el plan da la temporada), si no TheSportsDB.
 * Además suma Premier League, NFL y MLB de TheSportsDB. Si nada responde, datos de ejemplo.
 */
export async function getDataset(): Promise<Dataset> {
  const notes: string[] = [];
  const { theSportsDbDataset, extraLeagues } = await import('./theSportsDb');
  const extrasP = extraLeagues().catch(e => ({ matches: [], stats: {}, errors: [(e as Error).message] }));

  let core: Dataset | null = null;
  if (apiKey()) {
    try { core = await apiFootballDataset(); }
    catch (e) { console.error('API-Football:', (e as Error).message); notes.push('API-Football: ' + (e as Error).message); }
  }
  if (!core) {
    try { core = await theSportsDbDataset(); }
    catch (e) { console.error('TheSportsDB Liga MX:', (e as Error).message); notes.push('TheSportsDB Liga MX: ' + (e as Error).message); }
  }
  const extras = await extrasP;
  if (extras.errors.length) { console.warn('TheSportsDB:', extras.errors.join(' · ')); notes.push(...extras.errors); }

  if (!core && !extras.matches.length) return { ...DEMO, notice: notes.join(' · ') };
  const ds: Dataset = core ?? { source: 'thesportsdb', updatedAt: new Date().toISOString(), matches: [], players: {}, stats: {} };
  ds.matches = [...ds.matches, ...extras.matches];
  ds.stats = { ...ds.stats, ...extras.stats };
  if (notes.length) ds.notice = notes.join(' · ');
  return ds;
}
