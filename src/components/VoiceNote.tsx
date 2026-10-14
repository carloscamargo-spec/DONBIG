import { useState, type CSSProperties, type ReactNode } from 'react';
import type { VoiceApi, VoiceClip } from '../beto/useVoice';

interface Props {
  clip: VoiceClip;
  voice: VoiceApi;
  /** Prefijo de clases: 'wa' (WhatsApp) o 'bv' (chat de BETO en el sitio). */
  skin: 'wa' | 'bv';
  /** Foto de BETO junto a la onda (estilo WhatsApp). */
  avatar?: CSSProperties;
  /** Texto a la izquierda del pie (p. ej. "Bienvenida de BETO"). */
  caption?: ReactNode;
  /** Hora del mensaje, a la derecha del pie. */
  time?: ReactNode;
}

/** Nota de voz con play/pausa, onda que se pinta al avanzar, salto al tocar y velocidad 1×/1.5×/2×. */
export function VoiceNote({ clip, voice, skin, avatar, caption, time }: Props) {
  const [showText, setShowText] = useState(false);
  const v = voice.view(clip);
  const c = (name: string) => `${skin}-voice__${name}`;

  return (
    <>
      <div className={c('main')}>
        <button className={c('play') + (!v.heard ? ' ' + c('play--invite') : '')} onClick={() => voice.toggle(clip.src)} aria-label={v.on ? 'Pausar audio' : 'Reproducir audio'}>
          <svg viewBox="0 0 24 24" aria-hidden="true">{v.on ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" /> : <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />}</svg>
        </button>
        <div
          className={c('wave')}
          role="slider" aria-label="Avance del audio" aria-valuemin={0} aria-valuemax={Math.round(v.total)} aria-valuenow={Math.round(v.ratio * v.total)}
          onClick={e => { const r = e.currentTarget.getBoundingClientRect(); voice.seek(clip, (e.clientX - r.left) / r.width); }}
        >
          {clip.wave.map((h, i) => <span key={i} className={(i + 0.5) / clip.wave.length <= v.ratio ? c('bar--played') : ''} style={{ height: h }} />)}
          <i className={c('knob')} style={{ left: v.ratio * 100 + '%' }} />
        </div>
        {v.on
          ? <button className={c('speed')} onClick={voice.nextSpeed} aria-label="Velocidad de reproducción">{voice.speed}×</button>
          : avatar && <div className={c('pic')} style={avatar}><span>🎙</span></div>}
      </div>
      <div className={c('foot')}>
        <span>{v.label}</span>
        {caption && <span className={c('caption')}>{caption}</span>}
        {clip.transcript
          ? <button className={c('tr')} onClick={() => setShowText(x => !x)}>{showText ? 'Ocultar transcripción' : 'Ver transcripción'}</button>
          : <span className={c('spacer')} />}
        {time}
      </div>
      {clip.transcript && showText && <div className={c('text')}>“{clip.transcript}”</div>}
    </>
  );
}
