// Silbatazo sintetizado con Web Audio: dos pitidos (corto y largo) con vibrato.
let ac: AudioContext | null = null;

/** Crea/reanuda el AudioContext. Llamar desde un gesto del usuario. */
export function unlockAudio(enabled: boolean): AudioContext | null {
  if (!enabled) return null;
  try {
    if (!ac) {
      const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ac = new Ctx();
    }
    if (ac.state === 'suspended') void ac.resume();
    return ac;
  } catch {
    return null;
  }
}

export function playWhistle() {
  const ctx = unlockAudio(true);
  if (!ctx) return;
  const t0 = ctx.currentTime + 0.02;
  ([[0, 0.16], [0.22, 0.5]] as const).forEach(([st, dur]) => {
    const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
    o.type = 'sine';
    o.frequency.value = 2900;
    lfo.frequency.value = 34;
    lg.gain.value = 260;
    lfo.connect(lg);
    lg.connect(o.frequency);
    g.gain.setValueAtTime(0, t0 + st);
    g.gain.linearRampToValueAtTime(0.12, t0 + st + 0.02);
    g.gain.setValueAtTime(0.12, t0 + st + dur - 0.04);
    g.gain.linearRampToValueAtTime(0, t0 + st + dur);
    o.connect(g);
    g.connect(ctx.destination);
    o.start(t0 + st); lfo.start(t0 + st);
    o.stop(t0 + st + dur + 0.02); lfo.stop(t0 + st + dur + 0.02);
  });
}
