import { useEffect, useRef } from 'react';
import { MODES } from '../beto/data';
import { AVATAR_BASE, AVATAR_POINT } from '../beto/poses';
import type { BetoApi } from '../beto/useBeto';
import { BetoFigure } from './BetoFigure';
import { MessageCard } from './MessageCard';

const avatarStyle = (src: string) => ({ backgroundImage: `url(${src})` });

/** Chat de BETO (abierto) o lanzador "Habla con BETO" (minimizado). */
export function BetoChat({ beto }: { beto: BetoApi }) {
  const { state: s } = beto;
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [s.messages, s.typing, s.open]);

  const figProps = { pose: s.pose, typing: s.typing, react: s.react, whistling: s.whistling, whistleId: s.whistleId };

  if (!s.open) {
    return (
      <div className="launcher">
        <div className="launcher__nudge">{beto.nudge}</div>
        <div className="launcher__stage">
          <BetoFigure {...figProps} wrap={{ position: 'absolute', left: -124, top: 0, width: 360 }} title="Habla con BETO" onClick={beto.open} />
        </div>
        <button className="launcher__btn" onClick={beto.open}>Habla con BETO</button>
      </div>
    );
  }

  return (
    <div className="chat">
      <div className="chat__header">
        <BetoFigure {...figProps} wrap={{ position: 'absolute', right: 44, bottom: -89, width: 466 }} title="Pícale a BETO" onClick={beto.pokeBeto} />
        <button className="chat__min" onClick={beto.close} aria-label="Minimizar">–</button>
        <div className="chat__header-fade" />
      </div>

      <div ref={scrollRef} className="chat__scroll">
        {s.messages.map(m => {
          if (m.from === 'user') {
            return (
              <div key={m.id} className="msg-user"><div className="msg-user__bubble">{m.text}</div></div>
            );
          }
          const mode = m.mode ? MODES[m.mode] : null;
          return (
            <div key={m.id} className="msg-beto">
              <div className="avatar avatar--30" style={avatarStyle(m.mode === 'REGANO' ? AVATAR_POINT : AVATAR_BASE)} />
              <div className="msg-beto__col">
                {mode && <span className="mode-pill" style={{ background: mode.bg, color: mode.fg }}>{mode.label}</span>}
                <div className="msg-beto__bubble">{m.text}</div>
                {m.card && <MessageCard card={m.card} onPlay={beto.playGame} onPause={beto.takePause} onLimit={beto.setLimit} />}
              </div>
            </div>
          );
        })}
        {s.typing && (
          <div className="msg-beto msg-beto--typing">
            <div className="avatar avatar--30" style={avatarStyle(AVATAR_BASE)} />
            <div className="typing">
              {[0, 1, 2].map(i => <span key={i} style={{ animationDelay: i * 0.15 + 's' }} />)}
            </div>
          </div>
        )}
      </div>

      <div className="chat__chips">
        {beto.chips.map(c => (
          <button key={c} className={'chip' + (beto.isReply(c) ? ' chip--reply' : '')} onClick={() => beto.askChip(c)} onMouseEnter={beto.hoverChip}>{c}</button>
        ))}
      </div>

      <div className="chat__input-row">
        <input
          className="chat__input"
          value={s.input}
          onChange={e => beto.setInput(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') beto.ask(s.input); }}
          placeholder="Pregúntale a BETO…"
          aria-label="Mensaje para BETO"
        />
        <button className="chat__send" onClick={() => beto.ask(s.input)} aria-label="Enviar">↑</button>
      </div>
      <div className="chat__legal">Pronósticos orientativos. Sin resultados garantizados. +18 · Juega con responsabilidad.</div>
      <div className="chat__footer">
        <div className="chat__footer-name">BETO</div>
        <div className="chat__footer-sub">Tu coach de entretenimiento</div>
        <span className="chat__footer-mode" style={{ background: beto.headerMode.bg, color: beto.headerMode.fg }}>{beto.headerMode.label}</span>
      </div>
    </div>
  );
}
