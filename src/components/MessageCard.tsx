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
              <div className="bar__labels"><span>{b.label}</span><span>{b.pct}</span></div>
              <div className="bar__track"><div className="bar__fill" style={{ width: b.pct }} /></div>
            </div>
          ))}
          <div className="card__note">Orientativo. Sin resultados garantizados.</div>
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
              <button className="btn-play" onClick={() => onPlay(g.name)}>Jugar</button>
            </div>
          ))}
          <div className="card__foot">Catálogo de ejemplo. +18.</div>
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
            <div key={l.name} className="list-row list-row--link">
              <div className="list-row__text">
                <span className="list-row__name">{l.name}</span>
                <span className="list-row__meta">{l.desc}</span>
              </div>
              <span className="list-row__chev">›</span>
            </div>
          ))}
        </div>
      );
  }
}
