import { MATCHES, MODES } from './beto/data';
import { AVATAR_BASE, AVATAR_POINT } from './beto/poses';
import { useBeto, type BetoSettings } from './beto/useBeto';
import { BetoChat } from './components/BetoChat';

const avatar = (src: string) => ({ backgroundImage: `url(${src})` });

const VOICE = [
  { mode: MODES.COACH, quote: '“Ok, campeón. América llega con tres victorias seguidas, pero Chivas aprieta de visita. Vamos a leerlo con calma.”', when: 'análisis, datos, orientación en el sitio.' },
  { mode: MODES.REGANO, quote: '“¡Alto ahí! Perdiste tres seguidas y quieres doblar. Eso no es estrategia, es berrinche. Banca de 10 minutos.”', when: 'rachas de pérdida, querer recuperar, jugar enojado.' },
  { mode: MODES.IMPULSO, quote: '“¡Eso es! Pusiste tu límite y lo respetaste. Así se juega: con cabeza y con plan.”', when: 'límites respetados, buenas decisiones, regreso tras pausa.' },
  { mode: MODES.CHISTE, quote: '“Tu defensa está como portón de rancho: abierta todo el día. Ya, ya… ¿analizamos algo serio?”', when: 'romper tensión, ambiente de partido, piques entre aficiones.' },
];

const COLORS = [
  ['Azul Big Bola', '#0B4FF5'], ['Azul eléctrico', '#1E90FF'], ['Noche', '#06122E'],
  ['Hielo', '#EEF3FA'], ['Cancha', '#1EE3A0'], ['Silbatazo', '#FFB020'],
];

const STEPS = [
  ['1 · Escucha', 'Mensaje, botón o clic en “La opinión de BETO”.'],
  ['2 · Lee la intención', 'Partido, pronóstico, casino, sitio o señal de riesgo. Elige el modo de voz.'],
  ['3 · Consulta APIs', 'Solo responde con datos reales de las fuentes conectadas.'],
  ['4 · Responde', 'Máximo tres frases y una tarjeta con el dato.'],
];

const SOURCES = [
  ['Partidos', 'Calendario, marcador en vivo, alineaciones, estadísticas, forma reciente, historial directo.'],
  ['Momios', 'Cuotas por mercado, movimientos de línea, probabilidad implícita.'],
  ['Casino', 'Catálogo, proveedor, RTP, volatilidad, mesas en vivo, jackpots activos.'],
  ['Sitio', 'Secciones, promociones vigentes, cuenta, depósitos y retiros, ayuda.'],
  ['Usuario', 'Equipo favorito, deportes que sigue, límites activos, sesión actual.'],
];

const RULES = [
  'Nunca promete resultados. Todo pronóstico es orientativo.',
  'Detecta rachas de pérdida y propone pausa o límite.',
  'Si no hay dato en la API, lo dice. No inventa.',
  'Solo +18. Nunca incentiva a recuperar pérdidas.',
  'Puede regañar la decisión, nunca a la persona.',
  'Chistes de cancha, sin ofender aficiones ni personas.',
];

export function App({ settings }: { settings: BetoSettings }) {
  const beto = useBeto(settings);

  return (
    <div className="page">
      <section className="section" data-screen-label="01 Sitio + BETO">
        <div className="intro">
          <div className="eyebrow">Big Bola · Sistema BETO</div>
          <h1 className="intro__title">BETO, tu coach de entretenimiento</h1>
          <p className="intro__text">Chat en vivo dentro del sitio. Lee partidos, recomienda juegos de casino, orienta en el sitio y te habla como entrenador. Prueba los botones o escríbele.</p>
        </div>

        <div className="site">
          <div className="site__nav">
            <div className="site__logo">BIG BOLA</div>
            <nav className="site__links"><span>Deportes</span><span>Partidos</span><span>Casino</span><span>Mi equipo</span></nav>
            <div className="site__badge">DEMO CONCEPTUAL</div>
          </div>

          <div className="site__body">
            <div className="site__main">
              <div>
                <div className="hero__line">Vive el partido</div>
                <div className="hero__line hero__line--blue">con tu equipo</div>
                <p className="hero__sub">Información, análisis y pasión por el deporte.</p>
              </div>
              <div className="sports">
                <span className="sport sport--on">Fútbol</span>
                <span className="sport">Béisbol</span>
                <span className="sport">Básquetbol</span>
                <span className="sport">Casino</span>
              </div>
              <div className="featured">
                <div className="featured__title">Partidos destacados</div>
                <div className="featured__grid">
                  {MATCHES.map(p => (
                    <div key={p.id} className="match">
                      <div className="match__top">
                        <span className="match__liga">{p.liga}</span>
                        {p.marcador && <span className="live-pill">EN VIVO</span>}
                      </div>
                      <div className="match__teams">
                        <span>{p.local}</span>
                        <span className="match__centro">{p.marcador || p.hora}</span>
                        <span style={{ textAlign: 'right' }}>{p.visita}</span>
                      </div>
                      <button className="match__btn" onClick={() => beto.askScripted('La opinión de BETO: ' + p.local + ' vs ' + p.visita)}>La opinión de BETO ›</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="site__chat">
              <BetoChat beto={beto} />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--sub" data-screen-label="02 Sistema gráfico">
        <div className="sec-head"><div className="eyebrow">02</div><h2>Sistema gráfico</h2></div>

        <div className="gs-grid">
          <div className="gs-poses">
            <div className="gs-pose">
              <img src={AVATAR_BASE} alt="BETO pose base" />
              <div className="gs-pose__cap"><strong>Pose base</strong><span>Coach · Impulso · Chiste</span></div>
            </div>
            <div className="gs-pose">
              <img src={AVATAR_POINT} alt="BETO señalando" />
              <div className="gs-pose__cap"><strong>Pose señala</strong><span>Regaño · Llamado a la acción</span></div>
            </div>
            <div className="gs-avatars">
              <div className="panel-label">Avatares</div>
              <div className="gs-avatars__row">
                <div className="avatar avatar--72" style={avatar(AVATAR_BASE)} />
                <div className="avatar avatar--46" style={avatar(AVATAR_POINT)} />
                <div className="avatar avatar--30" style={avatar(AVATAR_BASE)} />
              </div>
              <div className="gs-avatars__text">Recorte circular al rostro. 72 px lanzador, 46 px encabezado, 30 px mensajes. El avatar del encabezado cambia a la pose señala en modo regaño.</div>
            </div>
          </div>

          <div className="panel">
            <div className="panel-label">Color</div>
            <div className="swatches">
              {COLORS.map(([name, hex]) => (
                <div key={hex} className="swatch">
                  <div className="swatch__chip" style={{ background: hex, border: hex === '#06122E' ? '1px solid #22396E' : undefined }} />
                  <span>{name} · {hex}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel panel--type">
            <div className="panel-label">Tipografía · Figtree</div>
            <div className="type-display">¡A la cancha!</div>
            <div className="type-h">Encabezados y botones · 800</div>
            <div className="type-body">Mensajes de chat · 500, 14.5 px, interlineado 1.45. Etiquetas de modo en 900 con tracking abierto.</div>
            <div className="pill-row">
              {Object.values(MODES).map(m => <span key={m.label} className="mode-pill mode-pill--lg" style={{ background: m.bg, color: m.fg }}>{m.label}</span>)}
            </div>
          </div>

          <div className="panel">
            <div className="panel-label">Lanzador</div>
            <div className="gs-nudge">¡Oye, tú! Ya va a empezar el Clásico. ¿Lo leemos?</div>
            <div className="gs-launch"><span className="avatar avatar--40" style={avatar(AVATAR_POINT)} />Habla con BETO</div>
            <div className="gs-note">La burbuja aparece solo con un disparador real: partido en vivo del equipo favorito, inicio de un partido destacado o regreso tras una pausa.</div>
          </div>
        </div>

        <div className="voices">
          <div className="panel-label">Modos de voz</div>
          <div className="voices__grid">
            {VOICE.map(v => (
              <div key={v.mode.label} className="voice">
                <span className="mode-pill mode-pill--lg" style={{ background: v.mode.bg, color: v.mode.fg }}>{v.mode.label}</span>
                <div className="voice__quote">{v.quote}</div>
                <div className="voice__when"><strong>Cuándo:</strong> {v.when}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--sub section--last" data-screen-label="03 Cerebro de BETO">
        <div className="sec-head"><div className="eyebrow">03</div><h2>Cerebro de BETO</h2></div>
        <div className="steps">
          {STEPS.map(([t, d]) => <div key={t} className="step"><span className="step__t">{t}</span><span className="step__d">{d}</span></div>)}
        </div>
        <div className="sources">
          {SOURCES.map(([t, d]) => <div key={t} className="source"><strong>{t}</strong><span>{d}</span></div>)}
        </div>
        <div className="rules">
          <div className="rules__title">Reglas del coach</div>
          <div className="rules__grid">{RULES.map(r => <span key={r}>{r}</span>)}</div>
        </div>
      </section>
    </div>
  );
}
