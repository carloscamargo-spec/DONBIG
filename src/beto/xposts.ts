// Posts de BETO en X (simulación). Se arman con los partidos del Dataset:
// narrador burlón con onomatopeyas, que se burla de jugadas y marcadores
// (nunca de personas ni aficiones). La IA puede escribir posts nuevos.
import type { Dataset, Match } from './data';

export type XMedia =
  | { kind: 'score'; liga: string; local: string; visita: string; hs: number; as: number; status: string }
  | { kind: 'poll'; options: string[]; base: number[] };

export interface XPost {
  id: string;
  text: string;
  time: string;
  replies: number;
  reposts: number;
  likes: number;
  views: number;
  media?: XMedia;
  ai?: boolean;
}

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
};
const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length];

export const tagFor = (m: Match) =>
  /premier/i.test(m.liga) ? '#PremierLeague' : m.deporte === 'nfl' ? '#NFL' : m.deporte === 'beisbol' ? '#MLB' : m.deporte === 'basquet' ? '#NBA' : '#LigaMX';

const scoreOf = (s?: string) => {
  const x = s?.match(/(\d+)\s*-\s*(\d+)/);
  return x ? [Number(x[1]), Number(x[2])] as const : null;
};

const when = (m: Match) => m.hora ?? '';

/** Texto del post para un partido. */
export function matchPost(m: Match, seed = hash(m.id)): string {
  const tag = tagFor(m);
  const live = !!m.marcador;
  const sc = scoreOf(m.marcador ?? m.hora);
  const sport = m.deporte ?? 'futbol';

  if ((live || m.finished) && sc) {
    const [h, a] = sc;
    const w = h > a ? m.local : m.visita, l = h > a ? m.visita : m.local;
    const ws = Math.max(h, a), ls = Math.min(h, a), diff = ws - ls;
    if (live) {
      return pick([
        `¡AAAAH! 🔥 ${m.local} ${h}-${a} ${m.visita} EN VIVO y esto está que ¡TRUENA, TRUENA! ¿Quién se lo lleva? 👀 ${tag}`,
        `¡TIC, TAC, TIC, TAC! ⏱️ ${m.local} ${h}-${a} ${m.visita} y el reloj corriendo. Si alguien se duerme, ¡ZAS!, se lo comen. ${tag}`,
      ], seed);
    }
    if (sport === 'nfl') {
      return pick([
        `¡BOOM! 🏈 ${w} ${ws}-${ls} ${l}. A la línea ofensiva de ${l} le pasaron por encima: ¡BRRRUM! ¡PAF! ¡PAF! Lunes de video y hielo, muchachos. ${tag}`,
        `¡HUT, HUT… PLAF! 🏈 ${l} se quedó tirado en el emparrillado: ${w} ${ws}-${ls}. Touchdown de ${w} y ¡CHAS!, se acabó la fiesta. ${tag}`,
      ], seed);
    }
    if (sport === 'beisbol') {
      return pick([
        `¡CRACK! ⚾ ${w} ${ws}-${ls} ${l}. Al pitcheo de ${l} le dieron ¡PLOC, PLOC, PLOC! como piñata en posada 🪅 ${tag}`,
        `¡FIUUUU! ⚾ La pelota sigue volando… ${w} ${ws}-${ls} ${l}. El bulpén de ${l} pidió ¡AUXILIO! ${tag}`,
      ], seed);
    }
    if (diff === 0 && h === 0) {
      return `¡ZZZZZZ! 😴 0-0 entre ${m.local} y ${m.visita}. Me dormí dos veces y desperté con el mismo marcador. Hasta el silbato bostezó: ¡PIII… UUUH! ${tag}`;
    }
    if (diff === 0) {
      return `¡TOMA! ¡DAME! ¡TOMA! 🥊 ${m.local} ${h}-${a} ${m.visita}. Se dieron con todo y nadie se llevó nada. ¡CLAP, CLAP! 👏 ${tag}`;
    }
    if (diff >= 3) {
      return pick([
        `¡PUM! ¡PUM! ¡PUM! 💥 ${w} le metió ${ws}-${ls} a ${l}. Alguien revise si la defensa de ${l} llegó al estadio… ¡CRASH! ${tag}`,
        `¡ÑAAAM! 🍽️ ${w} se comió a ${l}: ${ws}-${ls}. ${l}, ¡PLAF!, a la lona y a entrenar desde el lunes. ${tag}`,
      ], seed);
    }
    return pick([
      `¡ZAS! ⚡ ${w} ${ws}-${ls} ${l}. Ganó sin despeinarse… bueno, poquito 😅 ${l}: ¡PLAF!, a levantarse. ${tag}`,
      `¡PUM! Y a cobrar ✅ ${w} ${ws}-${ls} ${l}. La defensa de ${l} hizo ¡FIUUU! y el balón pasó como Pedro por su casa. ${tag}`,
    ], seed);
  }

  const fav = m.prob ? (m.prob[0] >= m.prob[2] ? m.local : m.visita) : null;
  const pct = m.prob ? Math.max(m.prob[0], m.prob[2]) : null;
  const lectura = fav ? ` Mi lectura: ${fav} ${pct}%.` : '';
  if (sport === 'nfl') {
    return pick([
      `¡HUT, HUT, HIKE! 🏈 ${m.local} vs ${m.visita} (${when(m)}).${lectura} ¿Quién se lleva el emparrillado? ${tag}`,
      `¡PAF! ¡PAF! Semana de golpes 🏈 ${m.local} recibe a ${m.visita} (${when(m)}).${lectura} Voten 👇 ${tag}`,
    ], seed);
  }
  if (sport === 'beisbol') {
    return pick([
      `¡ZUUUUM! ⚾ Recta de 100 millas: ${m.local} vs ${m.visita} (${when(m)}).${lectura} ¿Quién la saca del parque? 👀 ${tag}`,
      `¡PLAYBALL! ⚾ ${m.local} vs ${m.visita} (${when(m)}).${lectura} Palomitas listas y ¡CRACK! a ver quién batea. ${tag}`,
    ], seed);
  }
  return pick([
    `¡TOC, TOC! 🚪 ${m.visita}, ¿hay alguien en tu defensa? Que viene ${m.local} (${when(m)}).${lectura} ¿Ustedes qué dicen? ${tag}`,
    `¡RIIING! ⏰ Despiértense: ${m.local} vs ${m.visita} (${when(m)}).${lectura} El que se duerma, ¡ZAS!, se lo comen. ${tag}`,
  ], seed);
}

/** Posts de coach que no dependen de un partido. */
export const GENERIC_POSTS = [
  '¡DING, DING, DING! 🎰 Dato de coach: el bono de bienvenida de Big Bola tiene rollover de 15x y 10 días. Leer la letra chiquita también es entrenar 🤓 +18 #BETOdatos',
  '¡PIIIIIP! 🟨 Tarjeta amarilla para el que juega enojado. Si vas perdiendo: banca, agua y respira. Nadie remonta con berrinche. #JuegoResponsable',
  '¡PLOP! 🎡 Cayó la bola en el 0 y más de uno hizo ¡NOOOO! Por eso el 0 es la ventaja de la casa: juega por diversión, no por necesidad. #CasinoEnVivo',
  '¡RIIIING! ⏰ 6:30 a.m. Los campeones ya están despiertos y repasando la jornada. Los demás… ¡ZZZZ! Hoy toca leer partidos, no adivinar. #BETOretos',
];

export function postFor(topic: Match | string, n: number): Pick<XPost, 'text' | 'media'> {
  if (typeof topic === 'string') return { text: topic };
  const sc = scoreOf(topic.marcador ?? topic.hora);
  const media: XMedia | undefined = (topic.marcador || topic.finished) && sc
    ? { kind: 'score', liga: topic.liga, local: topic.local, visita: topic.visita, hs: sc[0], as: sc[1], status: topic.marcador ? 'EN VIVO' : 'FINAL' }
    : { kind: 'poll', options: topic.prob && topic.prob[1] ? [topic.local, 'Empate', topic.visita] : [topic.local, topic.visita], base: pollBase(topic) };
  return { text: matchPost(topic, hash(topic.id) + n), media };
}

function pollBase(m: Match) {
  const total = 1800 + (hash(m.id) % 4000);
  if (!m.prob) return [Math.round(total * .55), Math.round(total * .45)];
  const [h, d, a] = m.prob;
  return d ? [h, d, a].map(v => Math.round((v / 100) * total)) : [h, a].map(v => Math.round((v / (h + a)) * total));
}

const TIMES = ['14 min', '1 h', '2 h', '4 h', '6 h', '9 h', '12 h', '1 d', '1 d', '2 d', '3 d', '4 d'];

/** Feed inicial: en vivo, resultados, próximos, intercalando posts de coach. */
export function buildPosts(ds: Dataset): XPost[] {
  const live = ds.matches.filter(m => m.marcador);
  const done = ds.matches.filter(m => m.finished && !m.marcador);
  const next = ds.matches.filter(m => !m.finished && !m.marcador);
  const topics: (Match | string)[] = [...live, ...done.slice(0, 3), ...next.slice(0, 5)];
  topics.splice(Math.min(1, topics.length), 0, GENERIC_POSTS[3]);
  topics.splice(Math.min(4, topics.length), 0, GENERIC_POSTS[0]);
  topics.push(GENERIC_POSTS[1], GENERIC_POSTS[2]);
  return topics.slice(0, 12).map((t, i) => {
    const id = typeof t === 'string' ? 'g' + hash(t) : 'm' + t.id;
    const h = hash(id);
    return {
      id, time: TIMES[i] ?? `${i - 6} d`, ...postFor(t, 0),
      replies: 18 + (h % 380), reposts: 60 + ((h >>> 3) % 2400), likes: 400 + ((h >>> 5) % 9600), views: 9000 + ((h >>> 7) % 240000),
    };
  });
}

export function fmtCount(n: number) {
  if (n >= 1e6) return (n / 1e6).toFixed(1).replace(/\.0$/, '') + ' M';
  if (n >= 1e4) return (n / 1e3).toFixed(1).replace(/\.0$/, '') + ' mil';
  return n.toLocaleString('es-MX');
}
