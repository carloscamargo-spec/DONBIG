// POST /api/beto — cerebro de BETO con IA. Recibe el historial del chat, deja que
// Claude consulte las herramientas (partidos, pronósticos, casino, sitio...) y
// devuelve { text, mode, card }. Si algo falla, el cliente usa respuestas armadas.
import Anthropic from '@anthropic-ai/sdk';
import type { Config } from '@netlify/functions';
import { CASINO, SITIO, findMatch, findSections, isMode, norm, simOdds, type Dataset, type ModeKey } from '../../src/beto/data';
import { BONO_BIENVENIDA, KNOWLEDGE, PAGOS, PROMOS } from '../../src/beto/bigbola';
import { bonusCard, forecastCard, gamesCard, linksCard, matchCard, pauseCard, paymentsCard, playersCard, statsCard, type Card } from '../../src/beto/cards';
import { getDataset } from '../../src/server/apiFootball';

const MODEL = process.env.BETO_MODEL || 'claude-sonnet-5-5';
const MAX_TOOL_ROUNDS = 4;
const INTENSITIES = ['suave', 'normal', 'rudo'] as const;

/** Clave de Anthropic. Acepta ANTHROPIC_API_KEY o beto_key1 / BETO_KEY1 (como quedó en Netlify). */
const ANTHROPIC_KEY = (process.env.ANTHROPIC_API_KEY || process.env.beto_key1 || process.env.BETO_KEY1 || '').trim();
const client = new Anthropic({ apiKey: ANTHROPIC_KEY || undefined });

const equipo = { type: 'object' as const, properties: { equipo: { type: 'string' } }, required: ['equipo'] };

const TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: 'buscar_partidos', description: 'Partidos de Liga MX en vivo, próximos y recién terminados, con hora o marcador, forma y un dato clave. Sin equipo devuelve todos.', input_schema: { type: 'object', properties: { equipo: { type: 'string' } } } },
  { name: 'pronostico_partido', description: 'Probabilidades orientativas (local, empate, visita) para un partido.', input_schema: equipo },
  { name: 'juegos_casino', description: 'Juegos de casino de bigbola.mx (slots y casino en vivo) con nota de cada uno. estilo: tranquilo o adrenalina.', input_schema: { type: 'object', properties: { estilo: { type: 'string' } } } },
  { name: 'info_sitio', description: 'Secciones del sitio Big Bola (cuenta, depósitos, promociones, juego responsable, ayuda).', input_schema: { type: 'object', properties: { tema: { type: 'string' } } } },
  { name: 'jugadores_clave', description: 'Jugadores clave de un partido con estadísticas y la opinión de BETO sobre cada uno.', input_schema: equipo },
  { name: 'estadisticas_partido', description: 'Estadísticas comparadas de un partido y posibilidades (mercados) con probabilidad orientativa.', input_schema: equipo },
  { name: 'momios_partido', description: 'Momios (cuotas) de un partido en formato decimal y americano. Son SIMULADOS a partir del pronóstico para el demo; dilo así.', input_schema: equipo },
  { name: 'bono_bienvenida', description: 'Bono de bienvenida y promociones de bigbola.mx con sus condiciones (rollover, plazos, juegos que no cuentan). Muestra la tarjeta del bono.', input_schema: { type: 'object', properties: {} } },
  { name: 'metodos_pago', description: 'Métodos de depósito y retiro de bigbola.mx con mínimos y máximos. Muestra la tarjeta de pagos.', input_schema: { type: 'object', properties: {} } },
  { name: 'sugerir_pausa', description: 'Muestra al usuario opciones de pausa de 10 minutos y de poner un límite. Úsala ante rachas de pérdida o intención de recuperar.', input_schema: { type: 'object', properties: {} } },
];

/** Ejecuta una herramienta. Devuelve el texto para Claude y, si aplica, la tarjeta para el chat. */
function runTool(name: string, input: Record<string, unknown>, ds: Dataset): { result: string; card?: Card | null } {
  const str = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '');
  const find = (k: string) => findMatch(norm(str(k)), ds.matches);
  const strip = ({ keys: _k, ...m }: Dataset['matches'][number]) => m;
  switch (name) {
    case 'buscar_partidos': {
      const p = str('equipo') ? find('equipo') : undefined;
      if (str('equipo') && !p) return { result: 'Ese equipo no aparece en los partidos que tengo. Partidos disponibles: ' + JSON.stringify(ds.matches.map(strip)) };
      const list = p ? [p] : ds.matches;
      if (!list.length) return { result: 'No hay partidos disponibles.' };
      return { result: JSON.stringify(list.map(strip)), card: matchCard(list[0]) };
    }
    case 'pronostico_partido': {
      const p = find('equipo');
      if (!p) return { result: 'Sin datos para ese equipo.' };
      if (!p.prob) return { result: 'No hay pronóstico disponible para ' + p.local + ' vs ' + p.visita + '.', card: matchCard(p) };
      return { result: JSON.stringify({ partido: p.local + ' vs ' + p.visita, probabilidades: { local: p.prob[0], empate: p.prob[1], visita: p.prob[2] } }), card: forecastCard(p) };
    }
    case 'juegos_casino': {
      const estilo = norm(str('estilo'));
      const l = CASINO.filter(g => !estilo || g.estilo === estilo);
      const list = l.length ? l : CASINO;
      return { result: JSON.stringify(list), card: gamesCard(list) };
    }
    case 'info_sitio': {
      const hit = findSections(norm(str('tema')));
      const list = hit.length ? hit : SITIO;
      return { result: JSON.stringify(list), card: linksCard(list) };
    }
    case 'jugadores_clave': {
      const p = find('equipo');
      if (!p) return { result: 'Sin datos para ese equipo.' };
      const list = ds.players[p.id] || [];
      if (!list.length) return { result: 'No hay jugadores destacados para ' + p.local + ' vs ' + p.visita + '.' };
      return { result: JSON.stringify(list), card: playersCard(p, ds) };
    }
    case 'estadisticas_partido': {
      const p = find('equipo');
      if (!p || !ds.stats[p.id]) return { result: 'Sin estadísticas para ese equipo.' };
      return { result: JSON.stringify(ds.stats[p.id]), card: statsCard(p, ds) };
    }
    case 'momios_partido': {
      const p = find('equipo');
      if (!p) return { result: 'Sin datos para ese equipo.' };
      if (!p.prob) return { result: 'No hay momios para ' + p.local + ' vs ' + p.visita + '.', card: matchCard(p) };
      const [h, d, a] = p.prob.map(v => simOdds(v));
      return { result: JSON.stringify({ partido: p.local + ' vs ' + p.visita, simulados: true, local: h, empate: d, visita: a }), card: forecastCard(p) };
    }
    case 'bono_bienvenida':
      return { result: JSON.stringify({ bono: BONO_BIENVENIDA, promos: PROMOS }), card: bonusCard(true) };
    case 'metodos_pago':
      return { result: JSON.stringify(PAGOS), card: paymentsCard() };
    case 'sugerir_pausa':
      return { result: 'Tarjeta de pausa mostrada.', card: pauseCard() };
    default:
      return { result: 'Herramienta desconocida.' };
  }
}

const TODAY = new Intl.DateTimeFormat('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });

const dataNote = (ds: Dataset) => ds.source !== 'demo'
  ? '\nDatos: partidos reales de Liga MX vía ' + (ds.source === 'thesportsdb' ? 'TheSportsDB (pronóstico estimado con la tabla, sin goleadores)' : 'API-Football') + ' (actualizados ' + (ds.updatedAt ? TODAY.format(new Date(ds.updatedAt)) : 'recientemente') + '). Solo cubren Liga MX; si preguntan por otra liga o deporte, di que por ahora solo traes Liga MX.'
  : '\nDatos: son DE EJEMPLO, no reales. Si el usuario pregunta si son reales, díselo con honestidad.';

const systemPrompt = (intensity: string) =>
  'Eres BETO, el coach de entretenimiento de Big Bola (bigbola.mx), México. Hablas como entrenador: fuerte, directo y chistoso, en español mexicano coloquial (campeón, órale, banca, cancha). Puedes regañar y puedes motivar. Intensidad: ' + intensity + '.\n' +
  'Reglas:\n' +
  '- Empieza SIEMPRE con una etiqueta: [COACH], [REGANO], [IMPULSO] o [CHISTE].\n' +
  '- Máximo 3 frases cortas. Sin listas ni markdown.\n' +
  '- Usa un emoji de vez en cuando (⚽ 🔥 💪 😤 😂 📊 🏆 👀), máximo uno por mensaje y no en todos.\n' +
  '- Da tu opinión de jugadores y estadísticas con las herramientas jugadores_clave y estadisticas_partido.\n' +
  '- Usa las herramientas para cualquier dato de partidos, pronósticos, casino o el sitio. Nunca inventes datos; si no hay, dilo.\n' +
  '- Los pronósticos son orientativos; nunca garantices resultados.\n' +
  '- Si el usuario quiere recuperar pérdidas, doblar o juega enojado: [REGANO] y usa sugerir_pausa.\n' +
  '- Regaña la decisión, nunca a la persona. Solo mayores de 18.\n' +
  '- La tarjeta con datos aparece sola debajo de tu mensaje; no repitas todos los números.\n' +
  '- Responde de inmediato; es un chat en vivo.\n' +
  '- Sobre bonos y promociones: explica la oferta con sus condiciones clave (rollover, plazo, juegos que no cuentan) y manda a confirmar vigencia en bigbola.mx. Nunca uses un bono como gancho para recuperar pérdidas ni presiones a depositar.\n' +
  '- Los momios que das son simulados para el demo; si los mencionas, aclara que los reales están en bigbola.mx.\n\n' +
  KNOWLEDGE;

/** Valida el historial que manda el navegador: solo texto, roles alternados, empieza con user. */
function parseHistory(raw: unknown): Anthropic.Beta.BetaMessageParam[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Anthropic.Beta.BetaMessageParam[] = [];
  for (const m of raw.slice(-12)) {
    if (!m || (m.role !== 'user' && m.role !== 'assistant') || typeof m.content !== 'string') return null;
    const content = m.content.slice(0, 2000);
    const prev = out[out.length - 1];
    if (prev && prev.role === m.role) prev.content += '\n' + content;
    else out.push({ role: m.role, content });
  }
  while (out.length && out[0].role !== 'user') out.shift();
  if (!out.length || out[out.length - 1].role !== 'user') return null;
  return out;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

export default async (req: Request) => {
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);
  if (!ANTHROPIC_KEY) {
    console.error('Falta ANTHROPIC_API_KEY (o beto_key1): BETO responde con frases armadas.');
    return json({ error: 'no_key' }, 503);
  }
  let body: { history?: unknown; intensity?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const messages = parseHistory(body.history);
  if (!messages) return json({ error: 'bad_history' }, 400);
  const intensity = INTENSITIES.includes(body.intensity as never) ? (body.intensity as string) : 'normal';

  let card: Card | null = null;
  const ds = await getDataset();
  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 2048,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: systemPrompt(intensity) + '\nHoy es ' + TODAY.format(new Date()) + ' (hora del centro de México).' + dataNote(ds),
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === 'refusal') return json({ error: 'refusal' }, 502);

      if (response.stop_reason === 'tool_use' && round < MAX_TOOL_ROUNDS) {
        messages.push({ role: 'assistant', content: response.content });
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          const r = runTool(block.name, (block.input ?? {}) as Record<string, unknown>, ds);
          if (r.card) card = r.card;
          results.push({ type: 'tool_result', tool_use_id: block.id, content: r.result });
        }
        messages.push({ role: 'user', content: results });
        continue;
      }

      const text = response.content.flatMap(b => (b.type === 'text' ? [b.text] : [])).join('').trim();
      const tag = text.match(/^\s*\[(COACH|REGA[NÑ]O|IMPULSO|CHISTE)\]\s*/i);
      const key = tag ? norm(tag[1]).toUpperCase() : 'COACH';
      const mode: ModeKey = isMode(key) ? key : 'COACH';
      const clean = text.replace(/^\s*\[[^\]]+\]\s*/, '').trim();
      if (!clean) return json({ error: 'empty' }, 502);
      return json({ text: clean, mode, card });
    }
    return json({ error: 'too_many_rounds' }, 502);
  } catch (e) {
    if (e instanceof Anthropic.APIError) {
      console.error('Claude API error', e.status, e.message);
      return json({ error: 'upstream', status: e.status }, 502);
    }
    console.error(e);
    return json({ error: 'internal' }, 500);
  }
};

export const config: Config = { path: '/api/beto' };
