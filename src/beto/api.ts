// Cliente del cerebro de BETO (/api/beto). Lo usan el chat del sitio, la
// simulación de WhatsApp y los posts de X; cada uno pide su "canal" y el
// servidor ajusta el estilo de BETO.
import { MODES, type ModeKey } from './data';
import type { Reply } from './scripted';

export type Channel = 'web' | 'whatsapp' | 'x';

export interface BetoAnswer extends Reply {
  /** Lagartijas que BETO asigna (+) o perdona (-) en WhatsApp. */
  pushups?: number;
}

export async function askBeto(opts: {
  endpoint: string;
  history: { role: 'user' | 'assistant'; content: string }[];
  intensity: string;
  channel?: Channel;
}): Promise<BetoAnswer | null> {
  const res = await fetch(opts.endpoint, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ history: opts.history, intensity: opts.intensity, channel: opts.channel ?? 'web' }),
  });
  if (!res.ok) return null;
  const r = await res.json();
  if (!(r && typeof r.text === 'string' && r.text && MODES[r.mode as ModeKey])) return null;
  return {
    ...r,
    replies: Array.isArray(r.replies) ? r.replies.filter((x: unknown) => typeof x === 'string').slice(0, 3) : undefined,
    pushups: typeof r.pushups === 'number' && Number.isFinite(r.pushups) ? r.pushups : undefined,
  } as BetoAnswer;
}
