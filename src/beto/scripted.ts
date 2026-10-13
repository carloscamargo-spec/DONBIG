// Respuestas armadas: se usan en los botones rápidos, en "La opinión de BETO"
// y como respaldo cuando la IA está apagada o falla.
import { CASINO, MATCHES, SITIO, findMatch, findSections, norm, type ModeKey } from './data';
import { forecastCard, gamesCard, linksCard, matchCard, pauseCard, playersCard, statsCard, type Card } from './cards';

export interface Reply {
  text: string;
  mode: ModeKey;
  card?: Card | null;
}

export function scripted(raw: string): Reply {
  const t = norm(raw);
  if (/perd|recuper|doblar|le subo|todo o nada|desquit/.test(t))
    return { text: '¡Alto ahí! 🛑 ¿Vas perdiendo y quieres subirle para recuperar? Eso no es estrategia, es berrinche. Banca de 10 minutos y regresas con cabeza fría.', mode: 'REGANO', card: pauseCard() };
  if (/chiste|broma|risa/.test(t))
    return { text: '¿Sabes por qué la defensa de tu equipo no usa GPS? Porque igual siempre llega tarde 😂. Ya, ya… ¿analizamos algo serio?', mode: 'CHISTE' };
  if (/vivo|ahorita|ahora/.test(t))
    return { text: "¡Esto está que arde! 🔥 Tigres–Monterrey va 1-1 al 63'. Rayados está llegando más y Tigres se está colgando del travesaño.", mode: 'COACH', card: matchCard(MATCHES[1]) };
  if (/jugador|figura|goleador|estrella|crack/.test(t)) {
    const p = findMatch(t) || MATCHES[0];
    return { text: 'Estos son los que mueven el partido 💪. Mi opinión va en cada uno; tú decides a quién seguirle la pista.', mode: 'COACH', card: playersCard(p) };
  }
  if (/estadist|numeros|stats|posibilidad|mercado/.test(t)) {
    const p = findMatch(t) || MATCHES[0];
    return { text: 'Números sobre la mesa 📊. ' + p.local + ' domina casi todo, pero ojo con las posibilidades: ambos equipos tienen gol.', mode: 'COACH', card: statsCard(p) };
  }
  if (/pronost|quien gana|ganador|favorito/.test(t)) {
    const p = findMatch(t) || MATCHES[0];
    return { text: 'Mi lectura, no mi bola de cristal: ' + p.local + ' trae ventaja, pero esto no está escrito. Úsalo como guía, no como promesa.', mode: 'COACH', card: forecastCard(p) };
  }
  if (/casino|juego|ruleta|slot|tragamon|blackjack|crash/.test(t))
    return { text: '¿Tranquilo o con adrenalina? Te armé alineación de los dos 🎰. Blackjack si quieres pensar, Crash Gol si quieres sudar.', mode: 'COACH', card: gamesCard(CASINO) };
  if (/ayuda|cuenta|deposit|retiro|promo|limite|sitio|donde/.test(t)) {
    const hit = findSections(t);
    return { text: 'Te doy el mapa de la cancha. ¿A dónde vamos?', mode: 'COACH', card: linksCard(hit.length ? hit : SITIO.slice(0, 4)) };
  }
  const p = findMatch(t);
  if (p) return { text: p.local + ' contra ' + p.visita + '. Aquí está la lectura, campeón. Fíjate en la forma reciente antes de emocionarte.', mode: 'COACH', card: matchCard(p) };
  return { text: 'Dame algo con qué trabajar, campeón: un equipo, un deporte o si quieres casino. Con eso armamos la jugada.', mode: 'COACH' };
}
