// Respuestas armadas: se usan en los botones rápidos, en "La opinión de BETO"
// y como respaldo cuando la IA está apagada o falla. Trabajan sobre el Dataset
// actual (real de API-Football o de ejemplo).
import { CASINO, DEMO, SITIO, SPORTS, featuredMatch, findGame, findMatch, findSections, liveMatch, matchName, norm, simOdds, sportIn, type Dataset, type ModeKey } from './data';
import { bonusCard, forecastCard, gamesCard, guideCard, linksCard, matchCard, pauseCard, paymentsCard, playersCard, statsCard, type Card } from './cards';

export interface Reply {
  text: string;
  mode: ModeKey;
  card?: Card | null;
  /** Respuestas rápidas que BETO ofrece después de una pregunta. */
  replies?: string[];
}

const NO_DATA: Reply = { text: 'Ahorita no tengo partidos en el radar, campeón. En cuanto haya jornada te la leo completita.', mode: 'COACH' };

export function scripted(raw: string, ds: Dataset = DEMO): Reply {
  const t = norm(raw);
  const sport = sportIn(t);
  const pool = sport ? ds.matches.filter(m => (m.deporte ?? 'futbol') === sport) : ds.matches;
  const pick = () => findMatch(t, ds.matches) || featuredMatch(pool);
  const game = findGame(t);

  if (/perd|recuper|doblar|le subo|todo o nada|desquit/.test(t))
    return { text: '¡Alto ahí! 🛑 ¿Vas perdiendo y quieres subirle para recuperar? Eso no es estrategia, es berrinche. Banca de 10 minutos y regresas con cabeza fría.', mode: 'REGANO', card: pauseCard() };
  if (/bono|bienvenida|promo|giros|freebet|rollover/.test(t))
    return { text: 'Ojo aquí, campeón 🏆: el bono de bienvenida de Big Bola es 300% hasta $30,000 más 100 giros gratis, con depósito desde $100. Pero el rollover es 15 veces el bono y tienes 10 días. Lee la letra chiquita antes de entrar a la cancha.', mode: 'COACH', card: bonusCard() };
  if (/deposit|retir|cobrar|oxxo|spei|tarjeta|pago/.test(t))
    return { text: 'Así se mete y se saca el balón en Big Bola. OXXO desde $100, SPEI desde $50, y para cobrar el mínimo es $100. Tú pones el límite, no la mesa 💪.', mode: 'COACH', card: paymentsCard() };
  if (/momio|cuota|cuanto da/.test(t) && !game) {
    const p = pick();
    if (!p) return NO_DATA;
    const card = forecastCard(p);
    if (!card || !p.prob) return { text: 'Para ' + matchName(p) + ' todavía no tengo momios. Te dejo la ficha del partido.', mode: 'COACH', card: matchCard(p) };
    const o = simOdds(p.prob[0]);
    return { text: 'Momios del ' + matchName(p) + ' (simulados para el demo): ' + p.local + ' paga ' + (o ? o.dec : '—') + '. Momio bajo = favorito, pero favorito no es seguro. ¿Lo juegas directo o te explico cómo armar un parlay?', mode: 'COACH', card, replies: ['Explícame el parlay', 'Otro partido'] };
  }
  // ---- Casino: explicar juegos con calma y seguir la plática ----
  if (game && !/bono|bienvenida/.test(t) || (game && /como|explica|reglas|que es|ensena/.test(t)))
    return {
      text: 'Va, te lo explico como en el vestidor, sin prisa 🤝. ' + game.name + ' es ' + ({ 'Slot': 'un slot', 'Casino en vivo': 'un juego de mesa con crupier en vivo', 'Show en vivo': 'un show en vivo' } as Record<string, string>)[game.tipo] + '. Mira la tarjeta paso a paso. ' + game.pregunta,
      mode: 'COACH', card: guideCard(game!), replies: game.opciones,
    };
  if (/primera vez|soy nuevo|nunca he jugado|desde cero/.test(t))
    return { text: '¡Bienvenido a la cancha, campeón! Todos empezamos en la banca. Mi consejo: prueba primero en modo demo, que no cuesta nada, y luego entras con un presupuesto chiquito. ¿Te late?', mode: 'IMPULSO', replies: ['Primero en demo', '¿Cuánto me pongo de tope?'] };
  if (/demo|gratis|sin dinero|practicar/.test(t))
    return { text: 'Así se entrena 💪. En Big Bola muchos juegos tienen versión demo: créditos de mentira, cero riesgo. Juégala hasta que le entiendas y luego decides. ¿Qué juego quieres practicar?', mode: 'IMPULSO', card: gamesCard(CASINO.filter(g => g.tipo === 'Slot')), replies: ['Gates of Olympus', 'Sweet Bonanza'] };
  if (/tope|presupuesto|cuanto me pongo|si, dime|administr/.test(t))
    return { text: 'Regla de vestidor: el tope se decide ANTES de jugar, no a la mitad. Divide en sesiones, por ejemplo $200 = 40 giros de $5, y si se acaba, se acaba: mañana hay otro partido. ¿Cuánto tenías pensado para hoy?', mode: 'COACH', replies: ['$100', '$300', 'Prefiero no decir'] };
  const amount = t.match(/\$\s?([\d,]+)/);
  if (amount)
    return { text: 'Bien ahí, $' + amount[1] + ' y ni un peso más 👏. Apuntalo en Mi cuenta › Juego responsable para que el sistema te cuide la espalda. ¿Arrancamos con algo tranquilo o con adrenalina?', mode: 'IMPULSO', replies: ['Algo tranquilo', 'Con adrenalina'] };
  if (/prefiero no decir/.test(t))
    return { text: 'Respeto, eso es entre tú y tu cartera 😄. Nomás que el número exista antes de empezar. ¿Tranquilo o adrenalina?', mode: 'COACH', replies: ['Algo tranquilo', 'Con adrenalina'] };
  if (/tranquil|mesa tranquila/.test(t))
    return { text: 'Para ir con calma: mesas en vivo donde tú decides el ritmo. Ojo: no cuentan para el rollover del bono. ¿Cuál te explico?', mode: 'COACH', card: gamesCard(CASINO.filter(g => g.estilo === 'tranquilo')), replies: ['Blackjack', 'Ruleta', 'Baccarat'] };
  if (/adrenalina|otro slot|quiero bonus|emocion/.test(t))
    return { text: 'Ah, vienes a sudar la camiseta 🔥. Estos pagan fuerte pero tardan: volatilidad alta, así que apuesta chico. ¿Cuál te explico?', mode: 'COACH', card: gamesCard(CASINO.filter(g => g.estilo === 'adrenalina')), replies: ['Gates of Olympus', 'Crazy Time', 'Sweet Bonanza'] };
  if (/algo rapido/.test(t))
    return { text: 'Para un ratito: Baccarat, que se juega en segundos, o un par de vueltas de Crazy Time. ¿Cuál te explico?', mode: 'COACH', replies: ['Baccarat', 'Crazy Time'] };
  if (/rojo o negro|a lo seguro/.test(t))
    return { text: 'Rojo o negro: 18 de 37 casillas, casi 49% de acertar, y paga 1 a 1. Es la apuesta del que quiere durar en la mesa. ¿Le ponemos tope antes de entrar?', mode: 'COACH', replies: ['¿Cuánto me pongo de tope?', 'Mejor otro juego'] };
  if (/a un numero|pleno/.test(t))
    return { text: 'Un número solo: 1 de 37, menos de 3% de pegarle, pero paga 35 a 1. Emoción pura, campeón; no le metas lo de la renta 😅. ¿Cuántas tiradas te vas a dar?', mode: 'CHISTE', replies: ['Pocas, nomás para probar', '¿Cuánto me pongo de tope?'] };
  if (/para divertirme|nomas para probar|pocas/.test(t))
    return { text: '¡Eso es! Jugar para divertirse es la mejor estrategia que existe. Disfruta y cuando deje de ser divertido, a la banca. ¿Te recomiendo un juego o vemos un partido?', mode: 'IMPULSO', replies: ['Recomiéndame un juego', 'Analizar el partido'] };
  if (/ya se jugar|ya lo conozco/.test(t))
    return { text: 'Veterano, me gusta 😎. Entonces nomás te pregunto lo importante: ¿ya traes tu tope del día?', mode: 'COACH', replies: ['Sí, ya tengo', '¿Cuánto me pongo de tope?'] };
  if (/si, ya tengo/.test(t))
    return { text: 'Así se juega: con plan. Ve y diviértete, aquí te espero en el medio tiempo. ¿Vemos algún partido mientras?', mode: 'IMPULSO', replies: ['Analizar el partido', 'Momios del partido'] };
  if (/otro juego|mejor otro|ya tengo cuenta/.test(t)) {
    if (/ya tengo cuenta/.test(t)) return { text: 'Perfecto. Entonces a depositar con cabeza: elige método y monto antes de emocionarte. ¿Te explico algún juego para estrenar?', mode: 'COACH', card: paymentsCard(), replies: ['Recomiéndame un juego'] };
    return { text: 'Va, te enseño la alineación completa. ¿Cuál te llama?', mode: 'COACH', card: gamesCard(CASINO) };
  }

  if (/parlay|combinada/.test(t))
    return { text: 'El parlay es como una jugada en cadena: juntas 2 o más selecciones y los momios se multiplican. Si una falla, se cae toda la jugada. En Big Bola hay aumento de ganancias de hasta 100% en parlays. Mi consejo: 2 o 3 selecciones, no 10. ¿Armamos uno con calma?', mode: 'COACH', replies: ['Analizar el partido', 'Ver un pronóstico'] };
  if (/otro partido/.test(t)) {
    const others = ds.matches.filter(m => !m.finished);
    const o = others[Math.floor(Math.random() * others.length)];
    if (o) return { text: 'Va, cambiamos de cancha: ' + matchName(o) + ' (' + (o.marcador || o.hora || '') + '). ¿Qué te late ver?', mode: 'COACH', card: matchCard(o), replies: ['Ver un pronóstico', 'Momios del partido'] };
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
    return { text: 'Antes de recomendarte, dime algo: ¿vienes con calma o con ganas de adrenalina? 🎰 Te dejo la alineación completa mientras.', mode: 'COACH', card: gamesCard(CASINO), replies: ['Algo tranquilo', 'Con adrenalina', 'Es mi primera vez'] };
  if (/ayuda|cuenta|limite|sitio|donde|responsable|autoexclu|bingo|faq/.test(t)) {
    const hit = findSections(t);
    return { text: 'Te doy el mapa de la cancha. ¿A dónde vamos?', mode: 'COACH', card: linksCard(hit.length && !/sitio|mapa|seccion/.test(t) ? hit : SITIO.slice(0, 7)) };
  }
  if (sport && !findMatch(t, ds.matches)) {
    const sp = featuredMatch(pool);
    if (!sp) return { text: 'Ahorita no tengo juegos de ' + SPORTS[sport].label + ' en el radar, campeón. ¿Vemos otro deporte?', mode: 'COACH', replies: ['Fútbol', 'NFL', 'Béisbol'].filter(x => norm(x) !== norm(SPORTS[sport].label)) };
    return { text: SPORTS[sport].label + ' en la mira 👀: ' + matchName(sp) + ' (' + (sp.marcador || sp.hora || '') + '). ¿Te doy el pronóstico o los momios?', mode: 'COACH', card: matchCard(sp), replies: ['Ver un pronóstico', 'Momios del partido'] };
  }
  const p = findMatch(t, ds.matches) || (/analisis|partido|opinion/.test(t) ? featuredMatch(ds.matches) : undefined);
  if (p) return { text: p.local + ' contra ' + p.visita + '. Aquí está la lectura, campeón. Fíjate en la forma reciente antes de emocionarte.', mode: 'COACH', card: matchCard(p) };
  return { text: 'Dame algo con qué trabajar, campeón: un equipo, un deporte o si quieres casino. Con eso armamos la jugada. ¿Qué te late?', mode: 'COACH', replies: ['Fútbol', 'NFL', 'Béisbol', 'Casino'].slice(0, 3) };
}
