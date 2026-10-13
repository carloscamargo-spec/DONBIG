// POST /api/beto — cerebro de BETO con IA. Recibe el historial del chat, deja que
// Claude consulte las herramientas (partidos, pronósticos, casino, sitio...) y
// devuelve { text, mode, card }. Si algo falla, el cliente usa respuestas armadas.
import Anthropic from '@anthropic-ai/sdk';
import type { Config } from '@netlify/functions';
import { CASINO, PLAYERS, SITIO, STATS, MATCHES, findMatch, findSections, isMode, norm, type ModeKey } from '../../src/beto/data';
import { forecastCard, gamesCard, linksCard, matchCard, pauseCard, playersCard, statsCard, type Card } from '../../src/beto/cards';

const MODEL = process.env.BETO_MODEL || 'claude-sonnet-5-5';
const MAX_TOOL_ROUNDS = 4;
const INTENSITIES = ['suave', 'normal', 'rudo'] as const;

const client = new Anthropic();

const equipo = { type: 'object' as const, properties: { equipo: { type: 'string' } }, required: ['equipo'] };

const TOOLS: Anthropic.Beta.BetaTool[] = [
  { name: 'buscar_partidos', description: 'Partidos en vivo y próximos en Big Bola, con hora o marcador, forma y un dato clave.', input_schema: { type: 'object', properties: { equipo: { type: 'string' } } } },
  { name: 'pronostico_partido', description: 'Probabilidades orientativas (local, empate, visita) para un partido.', input_schema: equipo },
  { name: 'juegos_casino', description: 'Catálogo de juegos de casino con RTP y volatilidad. estilo: tranquilo o adrenalina.', input_schema: { type: 'object', properties: { estilo: { type: 'string' } } } },
  { name: 'info_sitio', description: 'Secciones del sitio Big Bola (cuenta, depósitos, promociones, juego responsable, ayuda).', input_schema: { type: 'object', properties: { tema: { type: 'string' } } } },
  { name: 'jugadores_clave', description: 'Jugadores clave de un partido con estadísticas y la opinión de BETO sobre cada uno.', input_schema: equipo },
  { name: 'estadisticas_partido', description: 'Estadísticas comparadas de un partido y posibilidades (mercados) con probabilidad orientativa.', input_schema: equipo },
  { name: 'sugerir_pausa', description: 'Muestra al usuario opciones de pausa de 10 minutos y de poner un límite. Úsala ante rachas de pérdida o intención de recuperar.', input_schema: { type: 'object', properties: {} } },
];

/** Ejecuta una herramienta. Devuelve el texto para Claude y, si aplica, la tarjeta para el chat. */
function runTool(name: string, input: Record<string, unknown>): { result: string; card?: Card | null } {
  const str = (k: string) => (typeof input[k] === 'string' ? (input[k] as string) : '');
  switch (name) {
    case 'buscar_partidos': {
      const p = str('equipo') ? findMatch(norm(str('equipo'))) : undefined;
      const list = p ? [p] : MATCHES;
      return { result: JSON.stringify(list), card: matchCard(list[0]) };
    }
    case 'pronostico_partido': {
      const p = findMatch(norm(str('equipo')));
      if (!p) return { result: 'Sin datos para ese equipo.' };
      return { result: JSON.stringify({ partido: p.local + ' vs ' + p.visita, probabilidades: p.prob }), card: forecastCard(p) };
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
      const p = findMatch(norm(str('equipo')));
      if (!p) return { result: 'Sin datos para ese equipo.' };
      return { result: JSON.stringify(PLAYERS[p.id] || []), card: playersCard(p) };
    }
    case 'estadisticas_partido': {
      const p = findMatch(norm(str('equipo')));
      if (!p || !STATS[p.id]) return { result: 'Sin datos para ese equipo.' };
      return { result: JSON.stringify(STATS[p.id]), card: statsCard(p) };
    }
    case 'sugerir_pausa':
      return { result: 'Tarjeta de pausa mostrada.', card: pauseCard() };
    default:
      return { result: 'Herramienta desconocida.' };
  }
}

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
  '- Responde de inmediato; es un chat en vivo.';

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
  let body: { history?: unknown; intensity?: unknown };
  try { body = await req.json(); } catch { return json({ error: 'bad_json' }, 400); }
  const messages = parseHistory(body.history);
  if (!messages) return json({ error: 'bad_history' }, 400);
  const intensity = INTENSITIES.includes(body.intensity as never) ? (body.intensity as string) : 'normal';

  let card: Card | null = null;
  try {
    for (let round = 0; round <= MAX_TOOL_ROUNDS; round++) {
      const response = await client.beta.messages.create({
        model: MODEL,
        max_tokens: 2048,
        betas: ['server-side-fallback-2026-07-01'],
        fallbacks: 'default',
        output_config: { effort: 'low' },
        system: systemPrompt(intensity),
        tools: TOOLS,
        messages,
      });

      if (response.stop_reason === 'refusal') return json({ error: 'refusal' }, 502);

      if (response.stop_reason === 'tool_use' && round < MAX_TOOL_ROUNDS) {
        messages.push({ role: 'assistant', content: response.content });
        const results: Anthropic.Beta.BetaToolResultBlockParam[] = [];
        for (const block of response.content) {
          if (block.type !== 'tool_use') continue;
          const r = runTool(block.name, (block.input ?? {}) as Record<string, unknown>);
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
