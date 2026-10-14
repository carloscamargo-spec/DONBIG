// Tarjetas que acompañan los mensajes de BETO. Son datos planos (serializables)
// para que el servidor de IA y las respuestas armadas produzcan lo mismo.
import { CASINO, DEMO, simOdds, type CasinoGame, type Dataset, type Match, type SiteSection } from './data';
import { BONO_BIENVENIDA, PAGOS, PROMOS } from './bigbola';

export type Card =
  | { type: 'match'; liga: string; local: string; visita: string; centro: string; isLive: boolean; formaLocal: string; formaVisita: string; dato: string }
  | { type: 'forecast'; titulo: string; bars: { label: string; pct: string; momio?: string }[] }
  | { type: 'games'; games: { name: string; meta: string; url: string }[] }
  | { type: 'bonus'; titulo: string; oferta: string; condiciones: string[]; promos: { titulo: string; detalle: string }[]; url: string }
  | { type: 'payments'; metodos: { metodo: string; detalle: string }[]; retiro: string; url: string }
  | { type: 'pause' }
  | { type: 'players'; titulo: string; list: { name: string; team: string; pos: string; stat: string; op: string }[] }
  | { type: 'stats'; local: string; visita: string; rows: { label: string; a: string; b: string; wa: string; wb: string }[]; pos: { label: string; pct: string }[] }
  | { type: 'links'; links: { name: string; desc: string; url: string }[] };

export const matchCard = (p: Match): Card => ({
  type: 'match', liga: p.liga, local: p.local, visita: p.visita, centro: p.marcador || p.hora || '',
  isLive: !!p.marcador, formaLocal: p.formaLocal, formaVisita: p.formaVisita, dato: p.dato,
});

export const forecastCard = (p: Match): Card | null => {
  if (!p.prob) return null;
  const labels = [p.local, 'Empate', p.visita];
  return {
    type: 'forecast', titulo: p.local + ' vs ' + p.visita,
    bars: p.prob.map((v, i) => ({ label: labels[i], pct: v + '%', v })).filter(b => b.v > 0).map(({ label, pct, v }) => {
      const o = simOdds(v);
      return { label, pct, momio: o ? o.dec + ' (' + o.us + ')' : undefined };
    }),
  };
};

export const gamesCard = (list: CasinoGame[] = CASINO): Card => ({
  type: 'games', games: list.map(g => ({ name: g.name, meta: g.tipo + ' · ' + g.nota, url: g.url })),
});

export const pauseCard = (): Card => ({ type: 'pause' });

export const playersCard = (p: Match, ds: Dataset = DEMO): Card | null => {
  const list = ds.players[p.id] || [];
  return list.length ? { type: 'players', titulo: p.local + ' vs ' + p.visita, list: list.map(j => ({ ...j })) } : null;
};

export const statsCard = (p: Match, ds: Dataset = DEMO): Card | null => {
  const st = ds.stats[p.id];
  if (!st) return null;
  return {
    type: 'stats', local: p.local, visita: p.visita,
    rows: st.rows.map(([label, a, b]) => {
      const tot = a + b || 1;
      return { label, a: String(a), b: String(b), wa: Math.round((a / tot) * 100) + '%', wb: Math.round((b / tot) * 100) + '%' };
    }),
    pos: st.pos.map(([label, pct]) => ({ label, pct })),
  };
};

export const linksCard = (list: SiteSection[]): Card => ({
  type: 'links', links: list.map(l => ({ name: l.name, desc: l.desc, url: l.url })),
});

/** Bono de bienvenida de bigbola.mx con sus condiciones clave. */
export const bonusCard = (full = false): Card => ({
  type: 'bonus', titulo: BONO_BIENVENIDA.titulo, oferta: BONO_BIENVENIDA.oferta,
  condiciones: full ? BONO_BIENVENIDA.condiciones : BONO_BIENVENIDA.condiciones.slice(0, 6),
  promos: PROMOS.map(({ titulo, detalle }) => ({ titulo, detalle })), url: BONO_BIENVENIDA.url,
});

export const paymentsCard = (): Card => ({ type: 'payments', metodos: PAGOS.depositos, retiro: PAGOS.retiro, url: PAGOS.url });
