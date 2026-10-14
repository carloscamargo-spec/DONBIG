// Respuestas armadas: se usan en los botones rápidos, en "La opinión de BETO"
// y como respaldo cuando la IA está apagada o falla. Trabajan sobre el Dataset
// actual (real de API-Football o de ejemplo).
import { CASINO, DEMO, SITIO, featuredMatch, findMatch, findSections, liveMatch, matchName, norm, type Dataset, type ModeKey } from './data';
import { forecastCard, gamesCard, linksCard, matchCard, pauseCard, playersCard, statsCard, type Card } from './cards';

export interface Reply {
  text: string;
  mode: ModeKey;
  card?: Card | null;
}

const NO_DATA: Reply = { text: 'Ahorita no tengo partidos en el radar, campeón. En cuanto haya jornada te la leo completita.', mode: 'COACH' };

export function scripted(raw: string, ds: Dataset = DEMO): Reply {
  const t = norm(raw);
  const pick = () => findMatch(t, ds.matches) || featuredMatch(ds.matches);

  if (/perd|recuper|doblar|le subo|todo o nada|desquit/.test(t))
    return { text: '¡Alto ahí! 🛑 ¿Vas perdiendo y quieres subirle para recuperar? Eso no es estrategia, es berrinche. Banca de 10 minutos y regresas con cabeza fría.', mode: 'REGANO', card: pauseCard() };
  if (/chiste|broma|risa/.test(t))
    return { text: '¿Sabes por qué la defensa de tu equipo no usa GPS? Porque igual siempre llega tarde 😂. Ya, ya… ¿analizamos algo serio?', mode: 'CHISTE' };
  if (/vivo|ahorita|ahora/.test(t)) {
    const live = liveMatch(ds.matches);
    if (live) return { text: '¡Esto está que arde! 🔥 ' + matchName(live) + ' va ' + live.marcador + '. Aquí está la lectura.', mode: 'COACH', card: matchCard(live) };
    const next = featuredMatch(ds.matches);
    if (!next) return NO_DATA;
    return { text: 'Ahorita no hay nada en vivo. Lo que sigue es ' + matchName(next) + ' (' + (next.hora || 'por confirmar') + '). Ve calentando.', mode: 'COACH', card: matchCard(next) };
  }
  if (/jugador|figura|goleador|estrella|crack/.test(t)) {
    const p = findMatch(t, ds.matches) || ds.matches.find(m => ds.players[m.id]?.length) || featuredMatch(ds.matches);
    if (!p) return NO_DATA;
    const card = playersCard(p, ds);
    if (!card) return { text: 'De ' + matchName(p) + ' no tengo jugadores destacados todavía. Pregúntame por otro partido, campeón.', mode: 'COACH' };
    return { text: 'Estos son los que mueven el ' + matchName(p) + ' 💪. Mi opinión va en cada uno; tú decides a quién seguirle la pista.', mode: 'COACH', card };
  }
  if (/estadist|numeros|stats|posibilidad|mercado/.test(t)) {
    const p = findMatch(t, ds.matches) || ds.matches.find(m => ds.stats[m.id] && !m.finished) || featuredMatch(ds.matches);
    if (!p) return NO_DATA;
    const card = statsCard(p, ds);
    if (!card) return { text: 'Todavía no hay números para ' + matchName(p) + '. Aquí está lo que sí sé.', mode: 'COACH', card: matchCard(p) };
    return { text: 'Números sobre la mesa 📊 para el ' + matchName(p) + '. Léelos con calma: son tendencia, no garantía.', mode: 'COACH', card };
  }
  if (/pronost|quien gana|ganador|favorito/.test(t)) {
    const p = pick();
    if (!p) return NO_DATA;
    const card = forecastCard(p);
    if (!card) return { text: 'Para ' + matchName(p) + ' todavía no tengo pronóstico. Te dejo la ficha del partido.', mode: 'COACH', card: matchCard(p) };
    const [h, , a] = p.prob!;
    const fav = h === a ? 'Está parejo' : (h > a ? p.local : p.visita) + ' trae ventaja';
    return { text: 'Mi lectura, no mi bola de cristal: ' + fav + ', pero esto no está escrito. Úsalo como guía, no como promesa.', mode: 'COACH', card };
  }
  if (/casino|juego|ruleta|slot|tragamon|blackjack|crash/.test(t))
    return { text: '¿Tranquilo o con adrenalina? Te armé alineación de los dos 🎰. Blackjack si quieres pensar, Crash Gol si quieres sudar.', mode: 'COACH', card: gamesCard(CASINO) };
  if (/ayuda|cuenta|deposit|retiro|promo|limite|sitio|donde/.test(t)) {
    const hit = findSections(t);
    return { text: 'Te doy el mapa de la cancha. ¿A dónde vamos?', mode: 'COACH', card: linksCard(hit.length ? hit : SITIO.slice(0, 4)) };
  }
  const p = findMatch(t, ds.matches) || (/analisis|partido|opinion/.test(t) ? featuredMatch(ds.matches) : undefined);
  if (p) return { text: p.local + ' contra ' + p.visita + '. Aquí está la lectura, campeón. Fíjate en la forma reciente antes de emocionarte.', mode: 'COACH', card: matchCard(p) };
  return { text: 'Dame algo con qué trabajar, campeón: un equipo, un deporte o si quieres casino. Con eso armamos la jugada.', mode: 'COACH' };
}
