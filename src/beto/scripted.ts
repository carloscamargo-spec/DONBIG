// Respuestas armadas: se usan en los botones rápidos, en "La opinión de BETO"
// y como respaldo cuando la IA está apagada o falla. Trabajan sobre el Dataset
// actual (real de API-Football o de ejemplo).
import { CASINO, DEMO, SITIO, featuredMatch, findMatch, findSections, liveMatch, matchName, norm, simOdds, type Dataset, type ModeKey } from './data';
import { bonusCard, forecastCard, gamesCard, linksCard, matchCard, pauseCard, paymentsCard, playersCard, statsCard, type Card } from './cards';

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
  if (/bono|bienvenida|promo|giros|freebet|rollover/.test(t))
    return { text: 'Ojo aquí, campeón 🏆: el bono de bienvenida de Big Bola es 300% hasta $30,000 más 100 giros gratis, con depósito desde $100. Pero el rollover es 15 veces el bono y tienes 10 días. Lee la letra chiquita antes de entrar a la cancha.', mode: 'COACH', card: bonusCard() };
  if (/deposit|retir|cobrar|oxxo|spei|tarjeta|pago/.test(t))
    return { text: 'Así se mete y se saca el balón en Big Bola. OXXO desde $100, SPEI desde $50, y para cobrar el mínimo es $100. Tú pones el límite, no la mesa 💪.', mode: 'COACH', card: paymentsCard() };
  if (/momio|cuota|paga|cuanto da/.test(t)) {
    const p = pick();
    if (!p) return NO_DATA;
    const card = forecastCard(p);
    if (!card || !p.prob) return { text: 'Para ' + matchName(p) + ' todavía no tengo momios. Te dejo la ficha del partido.', mode: 'COACH', card: matchCard(p) };
    const o = simOdds(p.prob[0]);
    return { text: 'Momios del ' + matchName(p) + ' (simulados para el demo): ' + p.local + ' paga ' + (o ? o.dec : '—') + '. Momio bajo = favorito, pero favorito no es seguro. Si vas a parlay, en Big Bola hay aumento de ganancias de hasta 100%.', mode: 'COACH', card };
  }
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
    return { text: '¿Tranquilo o con adrenalina? Te armé alineación de los dos 🎰. Blackjack en vivo si quieres pensar, Gates of Olympus o Crazy Time si quieres sudar. Recuerda: ruleta y blackjack no cuentan para el rollover del bono.', mode: 'COACH', card: gamesCard(CASINO) };
  if (/ayuda|cuenta|limite|sitio|donde|responsable|autoexclu|bingo|faq/.test(t)) {
    const hit = findSections(t);
    return { text: 'Te doy el mapa de la cancha. ¿A dónde vamos?', mode: 'COACH', card: linksCard(hit.length && !/sitio|mapa|seccion/.test(t) ? hit : SITIO.slice(0, 7)) };
  }
  const p = findMatch(t, ds.matches) || (/analisis|partido|opinion/.test(t) ? featuredMatch(ds.matches) : undefined);
  if (p) return { text: p.local + ' contra ' + p.visita + '. Aquí está la lectura, campeón. Fíjate en la forma reciente antes de emocionarte.', mode: 'COACH', card: matchCard(p) };
  return { text: 'Dame algo con qué trabajar, campeón: un equipo, un deporte o si quieres casino. Con eso armamos la jugada.', mode: 'COACH' };
}
