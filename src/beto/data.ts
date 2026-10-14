// Datos de BETO. Los partidos, jugadores y estadísticas llegan de API-Football
// (ver src/server/apiFootball.ts) como un Dataset; si no hay conexión se usa DEMO.
// Casino, secciones del sitio y frases siguen siendo de ejemplo.

export type ModeKey = 'COACH' | 'REGANO' | 'IMPULSO' | 'CHISTE';

export interface Match {
  id: string;
  liga: string;
  local: string;
  visita: string;
  hora?: string;
  marcador?: string;
  formaLocal: string;
  formaVisita: string;
  /** Local, empate, visita. Un 0 en empate significa que el deporte no lo permite. */
  prob?: [number, number, number];
  dato: string;
  /** Palabras con las que el usuario puede referirse a los equipos (normalizadas). */
  keys?: string[];
  /** Partido terminado (no cuenta como destacado para análisis). */
  finished?: boolean;
}

export interface CasinoGame {
  name: string;
  tipo: string;
  nota: string;
  estilo: 'tranquilo' | 'adrenalina';
  url: string;
}

export interface SiteSection {
  name: string;
  desc: string;
  tags: string;
  url: string;
}

export interface Player {
  name: string;
  team: string;
  pos: string;
  stat: string;
  op: string;
}

export interface MatchStats {
  rows: [string, number, number][];
  pos: [string, string][];
}

export interface Dataset {
  /** 'api-football' o 'thesportsdb' = datos reales; 'demo' = datos de ejemplo. */
  source: 'api-football' | 'thesportsdb' | 'demo';
  updatedAt: string | null;
  matches: Match[];
  players: Record<string, Player[]>;
  stats: Record<string, MatchStats>;
  /** Por qué se están usando datos de ejemplo, si aplica. */
  notice?: string;
}

export const MATCHES: Match[] = [
  { id: 'ame-chi', liga: 'Liga MX · Jornada 12', local: 'América', visita: 'Chivas', hora: 'Sáb 19:05', formaLocal: 'G G G E P', formaVisita: 'G E G P G', prob: [48, 27, 25], dato: 'América ganó 4 de sus últimos 6 clásicos en casa.' },
  { id: 'tig-mty', liga: 'Liga MX · Jornada 12', local: 'Tigres', visita: 'Monterrey', marcador: "1 - 1 · 63'", formaLocal: 'E G P G E', formaVisita: 'G G E G P', prob: [34, 38, 28], dato: 'Monterrey suma 7 tiros a puerta; Tigres solo 3.' },
  { id: 'dod-yan', liga: 'MLB · Serie Mundial', local: 'Dodgers', visita: 'Yankees', hora: 'Dom 18:08', formaLocal: 'G G P G G', formaVisita: 'G P G G P', prob: [55, 0, 45], dato: 'El abridor de Dodgers trae 1.98 de efectividad en octubre.' },
  { id: 'lal-gsw', liga: 'NBA · Temporada regular', local: 'Lakers', visita: 'Warriors', hora: 'Mar 21:30', formaLocal: 'P G G P G', formaVisita: 'G G G P G', prob: [46, 0, 54], dato: 'Warriors promedia 15 triples por partido de visita.' },
];

// Juegos que aparecen en bigbola.mx (slots y casino en vivo).
export const CASINO: CasinoGame[] = [
  { name: 'Blackjack en vivo', tipo: 'Casino en vivo', nota: 'Para pensar cada jugada · no cuenta para el rollover del bono', estilo: 'tranquilo', url: 'https://www.bigbola.mx/casino/' },
  { name: 'Immersive Roulette', tipo: 'Casino en vivo', nota: 'Ruleta con crupier real · no cuenta para el rollover', estilo: 'tranquilo', url: 'https://www.bigbola.mx/casino/' },
  { name: 'Crazy Time', tipo: 'Show en vivo', nota: 'Rueda con rondas de bonus, mucha acción', estilo: 'adrenalina', url: 'https://www.bigbola.mx/casino/' },
  { name: 'Gates of Olympus', tipo: 'Slot', nota: 'Multiplicadores de Zeus · volatilidad alta', estilo: 'adrenalina', url: 'https://www.bigbola.mx/' },
  { name: 'Sweet Bonanza', tipo: 'Slot', nota: 'Dulces en cascada y giros gratis', estilo: 'adrenalina', url: 'https://www.bigbola.mx/' },
  { name: 'Chests of Cai Shen 2', tipo: 'Slot', nota: 'Aquí van los 100 giros gratis del bono de bienvenida', estilo: 'adrenalina', url: 'https://www.bigbola.mx/' },
];

// Secciones reales de bigbola.mx.
export const SITIO: SiteSection[] = [
  { name: 'Apuestas deportivas', desc: 'Prepartido, parlays y mejores momios', tags: 'deporte apuesta momio cuota parlay partidos', url: 'https://www.bigbola.mx/apuestas-deportivas/' },
  { name: 'Deportes en vivo', desc: 'Apuestas en vivo y pago anticipado', tags: 'vivo marcador cashout anticipado', url: 'https://www.bigbola.mx/deportes-en-vivo/' },
  { name: 'Casino en vivo', desc: 'Ruleta, blackjack, baccarat y Crazy Time', tags: 'casino ruleta blackjack baccarat crupier', url: 'https://www.bigbola.mx/casino/' },
  { name: 'Slots', desc: 'Más de 100 máquinas, Megaways y demos', tags: 'slots tragamonedas maquinas juegos', url: 'https://www.bigbola.mx/' },
  { name: 'Bingo', desc: 'Bingo en línea', tags: 'bingo', url: 'https://www.bigbola.mx/bingo/' },
  { name: 'Promociones', desc: 'Bono de bienvenida y promos vigentes', tags: 'promo bono promociones bienvenida giros', url: 'https://www.bigbola.mx/promociones/' },
  { name: 'Depósitos y retiros', desc: 'OXXO Pay, SPEI, tarjeta y monederos', tags: 'cuenta deposito retiro pago oxxo spei tarjeta verificacion cobrar', url: 'https://www.bigbola.mx/depositos-y-retiros/' },
  { name: 'Juego responsable', desc: 'Límites, pausas y autoexclusión', tags: 'limite pausa responsable autoexclusion', url: 'https://www.bigbola.mx/juego-responsable/' },
  { name: 'Preguntas frecuentes', desc: 'Momios, apuestas en vivo, cuenta y soporte', tags: 'ayuda soporte contacto faq preguntas', url: 'https://www.bigbola.mx/faqs/' },
];

/**
 * Momios SIMULADOS a partir de las probabilidades (margen de casa ~6%).
 * Sirven para el demo; no son los momios reales de bigbola.mx.
 */
export function simOdds(pct: number) {
  if (!pct) return null;
  const dec = Math.max(1.01, Math.round((100 / (pct * 1.06)) * 100) / 100);
  const us = dec >= 2 ? '+' + Math.round((dec - 1) * 100) : '-' + Math.round(100 / (dec - 1));
  return { dec: dec.toFixed(2), us };
}

export const MODES: Record<ModeKey, { label: string; bg: string; fg: string }> = {
  COACH: { label: 'MODO COACH', bg: '#0B4FF5', fg: '#FFFFFF' },
  REGANO: { label: 'REGAÑO', bg: '#FFB020', fg: '#241600' },
  IMPULSO: { label: 'IMPULSO', bg: '#1EE3A0', fg: '#03261A' },
  CHISTE: { label: 'CHISTE', bg: '#8EC9FF', fg: '#06122E' },
};

export const isMode = (m: string): m is ModeKey => m in MODES;

export const PLAYERS: Record<string, Player[]> = {
  'ame-chi': [
    { name: 'Henry Martín', team: 'América', pos: 'DEL', stat: '7 goles · 3 asist. · 2.4 tiros/p', op: 'Huele el área como nadie. Si le llega limpia, la mete.' },
    { name: 'Álvaro Fidalgo', team: 'América', pos: 'MED', stat: '89% pases · 4 asist.', op: 'El cerebro. Si Chivas no lo presiona, América juega a placer.' },
    { name: 'Roberto Alvarado', team: 'Chivas', pos: 'EXT', stat: '4 goles · 2.1 regates/p', op: 'El más peligroso de visita. Desequilibra por derecha.' },
  ],
  'tig-mty': [
    { name: 'André-Pierre Gignac', team: 'Tigres', pos: 'DEL', stat: '5 goles · 1 hoy', op: 'Ya anotó. Con espacios te castiga, pero hoy está muy solo.' },
    { name: 'Sergio Canales', team: 'Monterrey', pos: 'MED', stat: '3 pases clave hoy', op: 'Está moviendo los hilos. Todo lo peligroso de Rayados pasa por él.' },
    { name: 'Germán Berterame', team: 'Monterrey', pos: 'DEL', stat: '4 tiros hoy · 1 gol', op: 'Está encendido. Si alguien desempata, apuesto a que es él.' },
  ],
  'dod-yan': [
    { name: 'Shohei Ohtani', team: 'Dodgers', pos: 'BD', stat: '.310 AVG · 4 HR en playoffs', op: 'Un batazo y te cambia la serie. Respeto total.' },
    { name: 'Aaron Judge', team: 'Yankees', pos: 'JD', stat: '.265 AVG · 3 HR en playoffs', op: 'Arrancó frío pero cuando se calienta no hay quien lo pare.' },
  ],
  'lal-gsw': [
    { name: 'LeBron James', team: 'Lakers', pos: 'AL', stat: '25.4 pts · 8.1 reb · 7.9 ast', op: 'El rey sigue mandando. Controla el ritmo del partido.' },
    { name: 'Stephen Curry', team: 'Warriors', pos: 'BA', stat: '27.8 pts · 4.9 triples/p', op: 'Si se calienta desde lejos, se acabó la discusión.' },
  ],
};

export const STATS: Record<string, MatchStats> = {
  'ame-chi': { rows: [['Goles por partido', 2.1, 1.4], ['Posesión %', 58, 47], ['Tiros a puerta/p', 6.2, 4.1], ['Goles recibidos/p', 0.8, 1.1]], pos: [['Ambos anotan', '58%'], ['Más de 2.5 goles', '52%'], ['América gana y ambos anotan', '27%']] },
  'tig-mty': { rows: [['Posesión hoy %', 44, 56], ['Tiros a puerta', 3, 7], ['Córners', 2, 5], ['Tarjetas', 2, 1]], pos: [['Habrá otro gol', '71%'], ['Monterrey anota el siguiente', '46%'], ['Termina empatado', '38%']] },
  'dod-yan': { rows: [['Carreras/juego', 5.4, 4.9], ['AVG equipo', 0.262, 0.251], ['ERA abridores', 3.12, 3.65], ['HR en playoffs', 18, 15]], pos: [['Más de 8.5 carreras', '49%'], ['Dodgers gana por 2+', '31%'], ['Hay home run de Ohtani', '34%']] },
  'lal-gsw': { rows: [['Puntos/p', 114.2, 117.6], ['Triples/p', 11.8, 15.1], ['Rebotes/p', 45.3, 43.9], ['% tiro de campo', 48.1, 46.7]], pos: [['Más de 228.5 puntos', '55%'], ['Curry 5+ triples', '47%'], ['Se define por 5 o menos', '41%']] },
};

/** Mensajes cuando el usuario no escribe: 25 s el primero, luego cada 30 s, hasta 3. */
export const NAGS: [string, ModeKey][] = [
  ['¡Ey! ¿Te dormiste en la banca? 😤 Aquí se viene a jugar, no a calentar la silla. ¿Qué analizamos?', 'REGANO'],
  ['Sigo aquí parado como poste de portería 🥅. Dame un equipo y armamos la jugada, campeón.', 'CHISTE'],
  ['Última llamada 📣. Si no me dices nada, me voy a ver el {partido} solo.', 'REGANO'],
];

export const POKES: [string, ModeKey][] = [
  ['¡Oye! A mí no me piques, picale a un partido. ¿Qué analizamos?', 'CHISTE'],
  ['¡Silbatazo! Tiempo fuera. ¿Qué necesitas, campeón?', 'COACH'],
  ['Si me vuelves a picar te mando a dar vueltas a la cancha. Mejor pregúntame algo.', 'CHISTE'],
];

export const NUDGES = [
  '{nudge}',
  '¡Silbatazo! Ya viene la jornada. ¿La leemos juntos?',
  '¡Así se juega! Aquí estoy cuando me necesites.',
  '¿Y esa cara? Ven, te armo la jugada.',
];

export const CHIPS = ['Analizar el partido', 'Bono de bienvenida', 'Momios del partido', 'Jugadores clave', 'Estadísticas y posibilidades', 'Ver un pronóstico', '¿Qué hay en vivo?', 'Recomiéndame un juego', '¿Cómo deposito?', 'Voy perdiendo, ¿le subo?', 'Cuéntame un chiste', 'Ayuda con el sitio'];

export const CHIP_Q: Record<string, string> = {
  'Analizar el partido': 'analisis partido',
  'Ver un pronóstico': 'pronostico',
  'Jugadores clave': 'jugadores',
  'Estadísticas y posibilidades': 'estadisticas',
  '¿Qué hay en vivo?': 'en vivo',
  'Recomiéndame un juego': 'casino juego',
  'Voy perdiendo, ¿le subo?': 'perdiendo le subo',
  'Cuéntame un chiste': 'chiste',
  'Ayuda con el sitio': 'ayuda sitio',
  'Bono de bienvenida': 'bono bienvenida',
  'Momios del partido': 'momios',
  '¿Cómo deposito?': 'deposito',
};

export const norm = (s: string | undefined | null) =>
  (s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export const DEMO: Dataset = { source: 'demo', updatedAt: null, matches: MATCHES, players: PLAYERS, stats: STATS };

const matchKeys = (p: Match) => p.keys ?? [norm(p.local), norm(p.visita)];

/** Busca el partido de un equipo mencionado en el texto (ya normalizado). */
export const findMatch = (t: string, matches: Match[] = MATCHES) =>
  matches.find(p => matchKeys(p).some(k => k && t.includes(k)));

/** Partido a destacar cuando el usuario no menciona equipo: en vivo, luego el próximo. */
export const featuredMatch = (matches: Match[]) =>
  matches.find(p => p.marcador) ?? matches.find(p => !p.finished) ?? matches[0];

export const liveMatch = (matches: Match[]) => matches.find(p => p.marcador);

export const matchName = (p: Match) => p.local + '–' + p.visita;

export const findSections = (t: string) => SITIO.filter(s => s.tags.split(' ').some(k => t.includes(k)));
