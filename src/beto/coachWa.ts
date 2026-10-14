// BETO en WhatsApp: guion de la simulación, banco de retos (trivia) y lagartijas.
// La idea: BETO despierta al usuario y lo entrena hasta volverlo especialista en
// deportes y juegos. Si no sabe un dato o se duerme, le tocan lagartijas (en broma).
// Las lagartijas nunca son por no apostar o no depositar: el bono es opcional.
import { featuredMatch, type Dataset, type Match } from './data';

export const LEVEL_GOAL = 5;

export interface Quiz {
  id: string;
  q: string;
  options: string[];
  correct: number;
  ok: string;
  bad: string;
  /** Lagartijas si falla. */
  pushups: number;
}

/** Partido de la semana: si juegan Chivas o Necaxa, ese; si no, el destacado con pronóstico. */
export function matchOfWeek(ds: Dataset): Match | undefined {
  const open = ds.matches.filter(m => !m.finished);
  const fav = (m: Match) => /chivas|necaxa/i.test(m.local + ' ' + m.visita);
  return open.find(m => fav(m) && m.prob) ?? open.find(m => m.prob && (m.deporte ?? 'futbol') === 'futbol') ?? open.find(m => m.prob) ?? featuredMatch(ds.matches);
}

/** Trivia del partido con la lectura de BETO (pronóstico orientativo). */
export function matchQuiz(m: Match | undefined): Quiz | null {
  if (!m?.prob) return null;
  const [h, , a] = m.prob;
  const correct = Math.abs(h - a) < 6 ? 2 : h > a ? 0 : 1;
  const options = [m.local, m.visita, 'Llegan parejos'];
  return {
    id: 'match-' + m.id,
    q: `📊 ${m.local} vs ${m.visita}: según los números, ¿quién llega mejor?`,
    options, correct, pushups: 20,
    ok: `¡ESO! 💪 Ese es mi especialista. Dato extra: ${m.dato}`,
    bad: `¡Uff! ❌ Era *${options[correct]}*. ${m.dato} Por no saberlo: 20 lagartijas 💪`,
  };
}

/** Trivia de NFL o MLB con el récord de la tabla, si hay datos. */
export function sportQuiz(ds: Dataset): Quiz | null {
  for (const m of ds.matches) {
    if (m.deporte !== 'nfl' && m.deporte !== 'beisbol') continue;
    const wins = ds.stats[m.id]?.rows.find(r => r[0] === 'Victorias');
    if (!wins || wins[1] === wins[2]) continue;
    const correct = wins[1] > wins[2] ? 0 : 1;
    const icon = m.deporte === 'nfl' ? '🏈' : '⚾';
    return {
      id: 'sport-' + m.id,
      q: `${icon} ${m.liga.split(' · ')[0]}: ¿quién trae más victorias, ${m.local} o ${m.visita}?`,
      options: [m.local, m.visita], correct, pushups: 15,
      ok: `¡Correcto! ${m.dato} Ya no solo sabes de futbol 😎`,
      bad: `❌ Era *${correct === 0 ? m.local : m.visita}*. ${m.dato} 15 lagartijas por andar distraído.`,
    };
  }
  return null;
}

export const GAME_QUIZZES: Quiz[] = [
  {
    id: 'gates', q: '🎰 Gates of Olympus: ¿cuántos símbolos iguales necesitas para ganar?',
    options: ['3 en línea', '5 en línea', '8 o más en cualquier lado'], correct: 2, pushups: 20,
    ok: '¡Correcto! 8 o más en cualquier parte del tablero, sin líneas. Ya piensas como especialista 🧠',
    bad: '❌ Son 8 o más iguales en cualquier lugar del tablero: no hay líneas. 20 lagartijas 💪',
  },
  {
    id: 'ruleta', q: '🎡 Ruleta europea: ¿cuántas casillas tiene?',
    options: ['36', '37', '38'], correct: 1, pushups: 15,
    ok: '¡Exacto! Del 0 al 36 son 37. Y ese 0 es la ventaja de la casa 😉',
    bad: '❌ Son 37: del 0 al 36. La de 38 es la americana, que trae doble cero. 15 lagartijas.',
  },
  {
    id: 'blackjack', q: '🃏 Blackjack: ¿cuánto suele pagar un blackjack natural (As + figura)?',
    options: ['1 a 1', '3 a 2', '2 a 1'], correct: 1, pushups: 15,
    ok: '¡Así se juega! Normalmente paga 3 a 2. Revisa siempre las reglas de la mesa 🃏',
    bad: '❌ Normalmente paga 3 a 2. Si alguna mesa paga menos, cámbiate de mesa. 15 lagartijas.',
  },
  {
    id: 'bono', q: '🎁 Bono de bienvenida de Big Bola: ¿cuántas veces hay que apostar el bono (rollover)?',
    options: ['5 veces', '15 veces', '30 veces'], correct: 1, pushups: 50,
    ok: '¡Así se lee la letra chiquita! 🤓 15 veces el bono y tienes 10 días. Activarlo o no es tu decisión; lo importante es que ya sabes cómo funciona.',
    bad: '❌ Es *15 veces* el bono, en 10 días. Por querer entrar sin leer la letra chiquita: ¡50 lagartijas! 😤 (Y ojo: el bono es opcional, nadie te obliga.)',
  },
  {
    id: 'parlay', q: '🧩 Armas un parlay de 3 selecciones y falla una. ¿Qué pasa?',
    options: ['Cobras las otras 2', 'Se cae toda la jugada', 'Te regresan tu dinero'], correct: 1, pushups: 20,
    ok: '¡Bien leído! Si falla una, se cae todo. Por eso: 2 o 3 selecciones, no 10 🧠',
    bad: '❌ Si una falla, se cae toda la jugada. 20 lagartijas y a repasar 📚',
  },
];

/** Retos en orden para esta sesión. */
export function buildQuizzes(ds: Dataset): Quiz[] {
  const q = [matchQuiz(matchOfWeek(ds)), GAME_QUIZZES[0], GAME_QUIZZES[1], sportQuiz(ds), GAME_QUIZZES[2], GAME_QUIZZES[3], GAME_QUIZZES[4]];
  return q.filter((x): x is Quiz => !!x);
}

export const NAGS = [
  '¿Te volviste a dormir? 😴 ¡PRRRT! ¡Arriba, campeón!',
  'Van 10 lagartijas por dormilón 😤💪 Contesta o se duplican.',
  'Último aviso ⏰ Te voy a dejar en visto como tú a mí 👀',
];

export const WAKE_UP = '¡Buenos días, campeón! ☀️ Son las 6:30 y tú todavía con la almohada pegada 😴';
/** Nota de voz de BETO: audio real del coach (public/assets/beto-coach.mp3, 12 s). */
export const VOICE = {
  src: '/assets/beto-coach.mp3',
  dur: 12.4,
  /** Alturas de las barras, calculadas de la onda del audio. */
  wave: [15, 13, 20, 12, 5, 6, 7, 16, 15, 15, 11, 5, 14, 14, 10, 6, 12, 9, 13, 11, 10, 5, 15, 14, 16, 13, 10, 6, 15, 6],
  /** Lo que dice el audio (transcripción). Vacío mientras no se tenga el texto. */
  transcript: '',
};

/** Formato de hora de WhatsApp en español de México. */
export function waTime(minutes: number) {
  const h24 = Math.floor(minutes / 60) % 24, m = minutes % 60;
  const h = h24 % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${h24 < 12 ? 'a.m.' : 'p.m.'}`;
}
