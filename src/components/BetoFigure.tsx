import { useLayoutEffect, useRef, type CSSProperties } from 'react';
import { ANIM, EYES, POSES, POSE_KEYS, type Pose, type ReactAnim } from '../beto/poses';

interface Props {
  /** Posición/tamaño del contenedor (absoluto dentro del encabezado o del lanzador). */
  wrap: CSSProperties;
  pose: Pose;
  typing: boolean;
  react: { id: number; mode: ReactAnim | null };
  whistling: boolean;
  whistleId: number;
  title: string;
  onClick: () => void;
}

/**
 * BETO animado: respira siempre (betoIdle), reacciona según el modo, parpadea cada 3 s
 * y muestra "¡PRRRT!" al pitar. Los 6 gestos están montados todo el tiempo y solo
 * cambia la opacidad, para que nunca se quede en blanco al cambiar de gesto.
 */
export function BetoFigure({ wrap, pose, typing, react, whistling, whistleId, title, onClick }: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const anim = typing ? 'betoTalk .7s ease-in-out infinite' : (react.mode && ANIM[react.mode]) || 'none';

  // Reinicia la animación de reacción sin volver a crear las imágenes.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.animation = 'none';
    void el.offsetWidth;
    el.style.animation = anim;
  }, [anim, react.id]);

  return (
    <div className="beto-fig" style={wrap}>
      <div ref={ref} className="beto-fig__body" onClick={onClick} title={title}>
        {POSE_KEYS.map((p, i) => (
          <img
            key={p}
            src={POSES[p]}
            alt={i === 0 ? 'BETO' : ''}
            draggable={false}
            className={'beto-fig__img' + (i === 0 ? ' beto-fig__img--base' : '')}
            style={{ opacity: p === pose ? 1 : 0 }}
          />
        ))}
        {EYES[pose].map((e, i) => (
          <div key={i} className="beto-fig__lid" style={{ left: e.l, top: e.t, width: e.w, height: e.h }} />
        ))}
      </div>
      {whistling && (
        <div key={'w' + whistleId} className="beto-prrt">
          <div className="beto-prrt__wave" />
          <div className="beto-prrt__label">¡PRRRT!</div>
        </div>
      )}
    </div>
  );
}
