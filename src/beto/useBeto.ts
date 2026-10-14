// Motor del chat de BETO: mensajes, poses, reacciones, silbato, regaños por
// inactividad y ciclo de gestos con el chat minimizado.
import { useCallback, useEffect, useRef, useState } from 'react';
import { CHIPS, CHIP_Q, MODES, NAGS, NUDGES, POKES, featuredMatch, liveMatch, matchName, type Dataset, type ModeKey } from './data';
import type { Card } from './cards';
import { scripted, type Reply } from './scripted';
import type { Pose, ReactAnim } from './poses';
import { playWhistle, unlockAudio } from './whistle';

export type Intensity = 'suave' | 'normal' | 'rudo';

export interface BetoSettings {
  /** Responde con IA a las preguntas libres. Los botones rápidos siempre usan respuestas armadas. */
  liveAI: boolean;
  intensity: Intensity;
  /** Sonido del silbato con el chat abierto. */
  sound: boolean;
  /** Endpoint del cerebro con IA. */
  endpoint: string;
  /** Endpoint de partidos (API-Football). */
  dataEndpoint: string;
}

export interface Msg {
  id: number;
  from: 'user' | 'beto';
  text: string;
  mode?: ModeKey;
  card?: Card | null;
}

interface State {
  open: boolean;
  input: string;
  typing: boolean;
  chipOffset: number;
  last: string | null;
  messages: Msg[];
  pose: Pose;
  basePose: Pose;
  react: { id: number; mode: ReactAnim | null };
  whistleId: number;
  whistling: boolean;
  cycle: number;
}

let uid = 0;
const mk = (from: Msg['from'], text: string, mode?: ModeKey, card?: Card | null): Msg => ({ id: ++uid, from, text, mode, card });

const hasCard = (m: Msg) => !!m.card;

export function useBeto(settings: BetoSettings, dataset: Dataset) {
  const [state, setState] = useState<State>(() => ({
    open: true, input: '', typing: false, chipOffset: 0, last: null,
    messages: [mk('beto', '¿Qué onda, campeón? 👋 Soy BETO, tu coach. Aquí no se viene a adivinar, se viene a leer el partido. ¿A qué equipo le vas?', 'COACH')],
    pose: 'saludo', basePose: 'saludo', react: { id: 0, mode: null }, whistleId: 0, whistling: false, cycle: 0,
  }));
  const set = useCallback((patch: Partial<State> | ((s: State) => Partial<State>)) =>
    setState(s => ({ ...s, ...(typeof patch === 'function' ? patch(s) : patch) })), []);

  // Los timers leen siempre el estado y los ajustes más recientes.
  const sRef = useRef(state);
  sRef.current = state;
  const cfg = useRef(settings);
  cfg.current = settings;
  const dsRef = useRef(dataset);
  dsRef.current = dataset;

  const t = useRef({ pose: 0, whistle: 0, lastAct: Date.now(), nags: 0, pokes: 0 });

  const bump = useCallback((mode: ReactAnim) => set(s => ({ react: { id: s.react.id + 1, mode } })), [set]);

  const setPose = useCallback((pose: Pose, anim?: ReactAnim | null, ms?: number, keep?: boolean) => {
    clearTimeout(t.current.pose);
    set(s => ({ pose, basePose: keep ? pose : s.basePose }));
    if (anim) bump(anim);
    if (ms) t.current.pose = window.setTimeout(() => set(s => ({ pose: s.basePose })), ms);
  }, [set, bump]);

  const point = useCallback((ms = 2600) => setPose('lado', 'JAB', ms), [setPose]);

  const whistle = useCallback(() => {
    set(s => ({ whistleId: s.whistleId + 1, whistling: true }));
    setPose('pito', 'WHISTLE', 1400);
    clearTimeout(t.current.whistle);
    t.current.whistle = window.setTimeout(() => set({ whistling: false }), 1100);
    if (sRef.current.open && cfg.current.sound) playWhistle();
  }, [set, setPose]);

  const reactTo = useCallback((mode: ModeKey | undefined, card: boolean) => {
    if (mode === 'REGANO') { whistle(); window.setTimeout(() => setPose('frente', 'REGANO', 0, true), 1300); return; }
    if (mode === 'COACH' && card) { setPose('lado', 'JAB', 0, true); return; }
    if (mode === 'COACH') { setPose('duda', 'COACH', 0, true); return; }
    if (mode === 'IMPULSO') { setPose('festejo', 'IMPULSO', 0, true); return; }
    if (mode === 'CHISTE') { setPose('saludo', 'CHISTE', 0, true); return; }
  }, [whistle, setPose]);

  const push = useCallback((msg: Msg) => {
    set(s => ({ messages: [...s.messages, msg] }));
    reactTo(msg.mode, hasCard(msg));
  }, [set, reactTo]);

  const aiReply = useCallback(async (msgs: Msg[]): Promise<Reply | null> => {
    const history = msgs.map(m => ({ role: m.from === 'user' ? 'user' : 'assistant', content: m.from === 'user' ? m.text : '[' + (m.mode || 'COACH') + '] ' + m.text }));
    const res = await fetch(cfg.current.endpoint, {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ history, intensity: cfg.current.intensity }),
    });
    if (!res.ok) return null;
    const r = await res.json();
    return r && typeof r.text === 'string' && r.text && MODES[r.mode as ModeKey] ? (r as Reply) : null;
  }, []);

  const ask = useCallback(async (text: string, opts: { chip?: string | null; forceScript?: boolean } = {}) => {
    const clean = (text || '').trim();
    const s = sRef.current;
    if (!clean || s.typing) return;
    unlockAudio(cfg.current.sound);
    t.current.lastAct = Date.now(); t.current.nags = 0;
    const msgs = [...s.messages, mk('user', clean)];
    set({ messages: msgs, input: '', typing: true, open: true, last: opts.chip ?? null, chipOffset: s.chipOffset + 2 });
    sRef.current = { ...sRef.current, typing: true };

    let r: Reply | null = null;
    if (cfg.current.liveAI && !opts.forceScript) {
      try { r = await aiReply(msgs); } catch { r = null; }
    }
    if (!r) {
      await new Promise(res => setTimeout(res, 650));
      r = scripted(opts.chip ? CHIP_Q[opts.chip] : clean, dsRef.current);
    }
    const reply = r;
    set(st => ({ typing: false, messages: [...st.messages, mk('beto', reply.text, reply.mode, reply.card)] }));
    reactTo(reply.mode, !!reply.card);
  }, [set, aiReply, reactTo]);

  const pokeBeto = useCallback(() => {
    unlockAudio(cfg.current.sound);
    const [text, mode] = POKES[(t.current.pokes = t.current.pokes + 1) % POKES.length];
    whistle();
    window.setTimeout(() => set(s => ({ messages: [...s.messages, mk('beto', text, mode)] })), 500);
  }, [whistle, set]);

  useEffect(() => {
    // Minimizado: cambia de gesto cada 6 s.
    const closedTimer = window.setInterval(() => {
      if (sRef.current.open) return;
      const c = sRef.current.cycle + 1;
      set({ cycle: c });
      [
        () => setPose('saludo', 'CHISTE', 0, true),
        () => setPose('lado', 'JAB', 0, true),
        () => whistle(),
        () => setPose('festejo', 'IMPULSO', 0, true),
        () => setPose('duda', 'GLANCE', 0, true),
      ][c % 5]();
    }, 6000);

    // Se molesta si no avanzas: 25 s el primero, luego cada 30 s, hasta 3.
    t.current.lastAct = Date.now(); t.current.nags = 0;
    const nagTimer = window.setInterval(() => {
      const s = sRef.current;
      if (!s.open || s.typing || t.current.nags >= NAGS.length) return;
      if (Date.now() - t.current.lastAct < (t.current.nags ? 30000 : 25000)) return;
      const [tpl, mode] = NAGS[t.current.nags++];
      const fm = featuredMatch(dsRef.current.matches);
      const text = tpl.replace('{partido}', fm ? matchName(fm) : 'partido');
      t.current.lastAct = Date.now();
      if (mode === 'REGANO') whistle();
      window.setTimeout(() => push(mk('beto', text, mode)), mode === 'REGANO' ? 500 : 0);
    }, 3000);

    // De vez en cuando cambia de expresión unos 4 s y regresa a la de su último modo.
    const idleTimer = window.setInterval(() => {
      const s = sRef.current;
      if (s.typing || !s.open || s.pose !== s.basePose) return;
      const opts = ([['lado', 'JAB'], ['saludo', 'CHISTE'], ['festejo', 'IMPULSO'], ['duda', 'GLANCE'], ['pito', 'WHISTLE']] as [Pose, ReactAnim][])
        .filter(o => o[0] !== s.pose);
      const o = opts[Math.floor(Math.random() * opts.length)];
      setPose(o[0], o[1], 4000);
    }, 10000);

    const timers = t.current;
    return () => {
      clearInterval(closedTimer); clearInterval(nagTimer); clearInterval(idleTimer);
      clearTimeout(timers.pose); clearTimeout(timers.whistle);
    };
  }, [set, setPose, whistle, push]);

  const pool = CHIPS.filter(c => c !== state.last);
  const chips = Array.from({ length: 4 }, (_, i) => pool[(state.chipOffset + i) % pool.length]);
  const lastBeto = [...state.messages].reverse().find(m => m.from === 'beto');

  return {
    state,
    chips,
    headerMode: MODES[lastBeto?.mode ?? 'COACH'],
    nudge: nudgeText(NUDGES[state.cycle % NUDGES.length], dataset),
    ask,
    askChip: (c: string) => ask(c, { chip: c, forceScript: true }),
    askScripted: (text: string) => ask(text, { forceScript: true }),
    hoverChip: () => { const s = sRef.current; if (!s.typing && s.pose !== 'lado') point(1400); },
    setInput: (input: string) => set({ input }),
    open: () => set({ open: true }),
    close: () => set({ open: false }),
    pokeBeto,
    playGame: (name: string) => push(mk('beto', name + ' en la cancha. Antes de entrar: tú pones el límite, no la mesa. ¿Cuánto te vas a jugar hoy como máximo?', 'COACH')),
    takePause: () => push(mk('beto', '¡Eso, campeón! Pausa activada. Los grandes también salen a la banca. Te veo en 10.', 'IMPULSO')),
    setLimit: () => push(mk('beto', 'Límite puesto. Así se juega: con plan. Lo ajustas cuando quieras en Mi cuenta › Juego responsable.', 'IMPULSO')),
  };
}

export type BetoApi = ReturnType<typeof useBeto>;

function nudgeText(tpl: string, ds: Dataset) {
  if (tpl !== '{nudge}') return tpl;
  const live = liveMatch(ds.matches);
  if (live) return '¡Oye, tú! El ' + matchName(live) + ' va ' + live.marcador + '. ¿Lo leemos juntos?';
  const next = featuredMatch(ds.matches);
  return next ? '¡Oye, tú! Ya viene el ' + matchName(next) + (next.hora ? ' (' + next.hora + ')' : '') + '. ¿Lo leemos?' : '¿Y esa cara? Ven, te armo la jugada.';
}
