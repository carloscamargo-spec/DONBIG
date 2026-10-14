// Reproductor de notas de voz de BETO (audio real). Un solo audio suena a la vez
// en toda la página: si empieza otro reproductor, este se pausa.
import { useCallback, useEffect, useRef, useState } from 'react';

export interface VoiceClip {
  src: string;
  /** Duración en segundos (respaldo mientras el navegador carga el audio). */
  dur: number;
  /** Alturas de las barras de la onda, calculadas del audio. */
  wave: number[];
  /** Lo que dice el audio; vacío si no se conoce. */
  transcript: string;
}

/** Bienvenida de BETO en el chat del sitio (public/assets/beto-bienvenida.mp3, 19 s). */
export const WELCOME_VOICE: VoiceClip = {
  src: '/assets/beto-bienvenida.mp3',
  dur: 19.2,
  wave: [20, 15, 14, 13, 19, 15, 16, 12, 18, 19, 18, 19, 15, 14, 14, 17, 15, 13, 16, 17, 13, 16, 18, 19, 18, 12, 13, 12, 12, 8],
  transcript: '',
};

const SPEEDS = [1, 1.5, 2];
const EVENT = 'beto-voice-play';

export const mmss = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

export function useVoice() {
  const ref = useRef<HTMLAudioElement | null>(null);
  const me = useRef(Math.random().toString(36).slice(2));
  const playingRef = useRef<string | null>(null);
  const [playing, setPlayingState] = useState<string | null>(null);
  const [pos, setPos] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [heard, setHeard] = useState<Record<string, boolean>>({});

  const setPlaying = (v: string | null) => { playingRef.current = v; setPlayingState(v); };

  const audioFor = useCallback((src: string) => {
    let a = ref.current;
    if (!a || a.dataset.src !== src) {
      a?.pause();
      a = new Audio(src);
      a.preload = 'auto';
      a.dataset.src = src;
      a.onended = () => { setPlaying(null); setPos(0); if (ref.current) ref.current.currentTime = 0; };
      a.onerror = () => setPlaying(null);
      ref.current = a;
      setPos(0);
    }
    return a;
  }, []);

  const toggle = useCallback((src: string) => {
    const a = audioFor(src);
    if (playingRef.current === src) { a.pause(); setPlaying(null); return; }
    window.dispatchEvent(new CustomEvent(EVENT, { detail: me.current }));
    a.playbackRate = speed;
    setPlaying(src);
    setHeard(h => ({ ...h, [src]: true }));
    a.play().catch(() => setPlaying(null));
  }, [audioFor, speed]);

  const seek = useCallback((clip: VoiceClip, ratio: number) => {
    const a = audioFor(clip.src);
    const total = Number.isFinite(a.duration) && a.duration > 0 ? a.duration : clip.dur;
    a.currentTime = Math.min(1, Math.max(0, ratio)) * total;
    setPos(a.currentTime);
    if (playingRef.current !== clip.src) toggle(clip.src);
  }, [audioFor, toggle]);

  const nextSpeed = useCallback(() => {
    const sp = SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length];
    setSpeed(sp);
    if (ref.current) ref.current.playbackRate = sp;
  }, [speed]);

  // Si otro reproductor de la página empieza a sonar, este se pausa.
  useEffect(() => {
    const onOther = (e: Event) => {
      if ((e as CustomEvent).detail !== me.current && playingRef.current) { ref.current?.pause(); setPlaying(null); }
    };
    window.addEventListener(EVENT, onOther);
    return () => { window.removeEventListener(EVENT, onOther); ref.current?.pause(); };
  }, []);

  // Avance suave de la barra mientras suena.
  useEffect(() => {
    if (playing === null) return;
    let raf = 0;
    let last = -1;
    const tick = () => {
      const t = ref.current?.currentTime ?? 0;
      if (Math.abs(t - last) >= 0.05) { last = t; setPos(t); } // ~20 cuadros por segundo bastan
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  /** Estado para pintar una nota de voz. */
  const view = (clip: VoiceClip) => {
    const a = ref.current;
    const mine = a?.dataset.src === clip.src;
    const on = playing === clip.src;
    const active = on || (mine && pos > 0);
    const total = mine && a && Number.isFinite(a.duration) && a.duration > 0 ? a.duration : clip.dur;
    const ratio = active ? Math.min(1, pos / total) : 0;
    return { on, ratio, label: mmss(active ? pos : total), total, heard: !!heard[clip.src] };
  };

  return { playing, speed, toggle, seek, nextSpeed, view };
}

export type VoiceApi = ReturnType<typeof useVoice>;
