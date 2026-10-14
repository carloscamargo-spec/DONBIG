import type { Card } from '../beto/cards';

interface Actions {
  onPlay: (name: string) => void;
  onPause: () => void;
  onLimit: () => void;
}

/** Tarjeta de datos debajo de un mensaje de BETO. */
export function MessageCard({ card, onPlay, onPause, onLimit }: { card: Card } & Actions) {
  switch (card.type) {
    case 'match':
      return (
        <div className="card card--dark">
          <div className="card__row">
            <span className="card__liga">{card.liga}</span>
            {card.isLive && <span className="live-pill live-pill--sm">EN VIVO</span>}
          </div>
          <div className="card__teams">
            <span>{card.local}</span>
            <span className="card__centro">{card.centro}</span>
            <span style={{ textAlign: 'right' }}>{card.visita}</span>
          </div>
          <div className="card__forma">
            <div>Forma: <strong>{card.formaLocal}</strong></div>
            <div style={{ textAlign: 'right' }}>Forma: <strong>{card.formaVisita}</strong></div>
          </div>
          <div className="card__dato"><strong>Dato BETO · </strong>{card.dato}</div>
        </div>
      );

    case 'forecast':
      return (
        <div className="card card--light card--pad">
          <div className="card__head">
            <span className="card__title">Pronóstico BETO</span>
            <span className="card__sub">{card.titulo}</span>
          </div>
          {card.bars.map(b => (
            <div key={b.label} className="bar">
              <div className="bar__labels"><span>{b.label}</span><span>{b.momio && <em className="bar__odds">{b.momio}</em>}{b.pct}</span></div>
              <div className="bar__track"><div className="bar__fill" style={{ width: b.pct }} /></div>
            </div>
          ))}
          <div className="card__note">{card.bars.some(b => b.momio) ? 'Momios simulados para el demo, no son los de bigbola.mx. ' : ''}Orientativo. Sin resultados garantizados.</div>
        </div>
      );

    case 'bonus':
      return (
        <div className="card card--bonus">
          <div className="bonus__eyebrow">BIGBOLA.MX · {card.titulo.toUpperCase()}</div>
          <div className="bonus__offer">{card.oferta}</div>
          <ul className="bonus__list">
            {card.condiciones.map(c => <li key={c}>{c}</li>)}
          </ul>
          {card.promos.length > 0 && (
            <div className="bonus__promos">
              <span className="bonus__promos-title">OTRAS PROMOS</span>
              {card.promos.map(p => <div key={p.titulo}><strong>{p.titulo}:</strong> {p.detalle}</div>)}
            </div>
          )}
          <a className="bonus__cta" href={card.url} target="_blank" rel="noopener noreferrer">Ver términos en bigbola.mx ›</a>
          <div className="card__note card__note--dark">+18 · Revisa vigencia y T&C. Juega con responsabilidad.</div>
        </div>
      );

    case 'guide':
      return (
        <div className="card card--light card--pad">
          <div className="card__head">
            <span className="card__title">Cómo se juega {card.name}</span>
            <span className="card__sub">{card.tipo}</span>
          </div>
          <ol className="guide__steps">
            {card.como.map(c => <li key={c}>{c}</li>)}
          </ol>
          <div className="player__op"><strong>Tip de BETO · </strong>{card.tip}</div>
          <a className="guide__link" href={card.url} target="_blank" rel="noopener noreferrer">Verlo en bigbola.mx ›</a>
          <div className="card__note">+18 · Pruébalo en demo primero. Juega con responsabilidad.</div>
        </div>
      );

    case 'payments':
      return (
        <div className="card card--light card--list">
          <div className="card__head players__head">
            <span className="card__title">Depósitos en Big Bola</span>
          </div>
          {card.metodos.map(m => (
            <div key={m.metodo} className="list-row">
              <div className="list-row__text">
                <span className="list-row__name">{m.metodo}</span>
                <span className="list-row__meta">{m.detalle}</span>
              </div>
            </div>
          ))}
          <div className="card__foot">{card.retiro} <a href={card.url} target="_blank" rel="noopener noreferrer">Más info ›</a></div>
        </div>
      );

    case 'games':
      return (
        <div className="card card--light card--list">
          {card.games.map(g => (
            <div key={g.name} className="list-row">
              <div className="list-row__text">
                <span className="list-row__name">{g.name}</span>
                <span className="list-row__meta">{g.meta}</span>
              </div>
              <a className="btn-play" href={g.url} target="_blank" rel="noopener noreferrer" onClick={() => onPlay(g.name)}>Jugar</a>
            </div>
          ))}
          <div className="card__foot">Juegos de bigbola.mx · +18.</div>
        </div>
      );

    case 'pause':
      return (
        <div className="card card--pause">
          <div className="pause__title">Banca de 10 minutos</div>
          <div className="pause__text">Respira, sal a la banca y regresa con cabeza fría.</div>
          <div className="pause__actions">
            <button className="pause__btn pause__btn--solid" onClick={onPause}>Pausa 10 min</button>
            <button className="pause__btn pause__btn--ghost" onClick={onLimit}>Poner un límite</button>
          </div>
        </div>
      );

    case 'players':
      return (
        <div className="card card--light card--list">
          <div className="card__head players__head">
            <span className="card__title">Jugadores clave</span>
            <span className="card__sub">{card.titulo}</span>
          </div>
          {card.list.map(j => (
            <div key={j.name} className="player">
              <div className="player__top">
                <span className="player__pos">{j.pos}</span>
                <span className="player__name">{j.name}</span>
                <span className="player__team">{j.team}</span>
              </div>
              <span className="player__stat">{j.stat}</span>
              <div className="player__op"><strong>BETO opina · </strong>{j.op}</div>
            </div>
          ))}
        </div>
      );

    case 'stats':
      return (
        <div className="card card--dark card--stats">
          <div className="stats__head">
            <span>{card.local}</span><span className="stats__label">ESTADÍSTICAS</span><span>{card.visita}</span>
          </div>
          {card.rows.map(r => (
            <div key={r.label} className="stats__row">
              <div className="stats__nums"><strong>{r.a}</strong><span>{r.label}</span><strong>{r.b}</strong></div>
              <div className="stats__bars">
                <div className="stats__a" style={{ width: r.wa }} />
                <div className="stats__b" style={{ width: r.wb }} />
              </div>
            </div>
          ))}
          <div className="stats__pos">
            <span className="stats__pos-title">POSIBILIDADES</span>
            {card.pos.map(o => (
              <div key={o.label} className="stats__pos-row"><span>{o.label}</span><strong>{o.pct}</strong></div>
            ))}
          </div>
          <div className="card__note card__note--dark">Orientativo. Sin resultados garantizados.</div>
        </div>
      );

    case 'links':
      return (
        <div className="card card--light card--list">
          {card.links.map(l => (
            <a key={l.name} className="list-row list-row--link" href={l.url} target="_blank" rel="noopener noreferrer">
              <div className="list-row__text">
                <span className="list-row__name">{l.name}</span>
                <span className="list-row__meta">{l.desc}</span>
              </div>
              <span className="list-row__chev">›</span>
            </a>
          ))}
        </div>
      );
  }
}
