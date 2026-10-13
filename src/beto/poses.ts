// Gestos de BETO. Las 6 imágenes comparten escala y encuadre (1000×625) para que
// no salte al cambiar de gesto. EYES ubica los párpados de cada gesto para el parpadeo.

export type Pose = 'saludo' | 'lado' | 'pito' | 'festejo' | 'duda' | 'frente';
export type ReactAnim = 'COACH' | 'REGANO' | 'IMPULSO' | 'CHISTE' | 'GLANCE' | 'JAB' | 'WHISTLE';

export const POSES: Record<Pose, string> = {
  saludo: '/assets/beto-saludo.png',
  lado: '/assets/beto-lado.png',
  pito: '/assets/beto-pito.png',
  festejo: '/assets/beto-festejo.png',
  duda: '/assets/beto-duda.png',
  frente: '/assets/beto-frente.png',
};

export const POSE_KEYS = Object.keys(POSES) as Pose[];

type Eye = { l: string; t: string; w: string; h: string };
export const EYES: Record<Pose, [Eye, Eye]> = {
  saludo: [{ l: '61.50%', t: '26.72%', w: '3.40%', h: '3.68%' }, { l: '68.50%', t: '25.12%', w: '3.60%', h: '4.00%' }],
  lado: [{ l: '61.30%', t: '28.00%', w: '3.20%', h: '3.36%' }, { l: '69.30%', t: '27.36%', w: '3.00%', h: '3.04%' }],
  pito: [{ l: '60.90%', t: '28.00%', w: '3.40%', h: '3.04%' }, { l: '68.50%', t: '27.04%', w: '3.20%', h: '3.36%' }],
  festejo: [{ l: '61.10%', t: '24.48%', w: '4.40%', h: '5.92%' }, { l: '68.70%', t: '23.84%', w: '4.20%', h: '5.92%' }],
  duda: [{ l: '61.30%', t: '28.32%', w: '3.80%', h: '3.68%' }, { l: '68.90%', t: '26.08%', w: '3.60%', h: '4.32%' }],
  frente: [{ l: '61.70%', t: '28.96%', w: '2.80%', h: '3.36%' }, { l: '69.90%', t: '27.68%', w: '2.60%', h: '3.36%' }],
};

export const ANIM: Record<ReactAnim, string> = {
  COACH: 'betoCoach .8s ease-out',
  REGANO: 'betoRegano .75s ease-out',
  IMPULSO: 'betoImpulso .8s ease-out',
  CHISTE: 'betoChiste .9s ease-in-out',
  GLANCE: 'betoGlance 1.6s ease-in-out',
  JAB: 'betoJab .7s ease-out',
  WHISTLE: 'betoWhistle .7s linear',
};

/** Avatares circulares (retrato con fondo negro). */
export const AVATAR_BASE = '/assets/beto-brazos.jpg';
export const AVATAR_POINT = '/assets/beto-senala.jpg';
