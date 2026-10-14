import { useEffect, useMemo, useState, type ReactNode } from 'react';
import type { Dataset, Match } from '../beto/data';
import type { BetoSettings } from '../beto/useBeto';
import { askBeto } from '../beto/api';
import { AVATAR_POINT } from '../beto/poses';
import { GENERIC_POSTS, buildPosts, fmtCount, postFor, tagFor, type XPost } from '../beto/xposts';
import '../xfeed.css';

const avatar = { backgroundImage: `url(${AVATAR_POINT})` };

/** Resalta hashtags, menciones y onomatopeyas. */
function rich(text: string): ReactNode {
  return text.split(/(#[\p{L}\p{N}_]+|@[\w]+|¡[A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ ,.…!¡]*!)/gu).map((part, i) =>
    part.startsWith('#') || part.startsWith('@') ? <span key={i} className="x-link">{part}</span>
      : /^¡[A-ZÁÉÍÓÚÑ]/.test(part) ? <strong key={i} className="x-ono">{part}</strong>
        : part);
}

const Verified = () => (
  <svg className="x-verified" viewBox="0 0 22 22" aria-label="Cuenta verificada"><path fill="currentColor" d="M20.4 11c0-1.4-.8-2.6-2-3.2.4-1.3.2-2.8-.8-3.8s-2.4-1.3-3.8-.8C13.2 2 12 1.2 11 1.2S8.8 2 8.2 3.2c-1.3-.5-2.8-.2-3.8.8s-1.3 2.5-.8 3.8C2.4 8.4 1.6 9.6 1.6 11s.8 2.6 2 3.2c-.5 1.3-.2 2.8.8 3.8s2.5 1.3 3.8.8c.6 1.2 1.8 2 3.2 2s2.6-.8 3.2-2c1.3.5 2.8.2 3.8-.8s1.3-2.5.8-3.8c1.2-.6 2-1.8 2-3.2Z" /><path fill="#FFFFFF" d="m9.6 15.2-3.5-3.5 1.4-1.4 2.1 2.1 5-5 1.4 1.4z" /></svg>
);

const Icon = ({ d }: { d: string }) => <svg viewBox="0 0 24 24" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>;
const ICONS = {
  reply: 'M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v8a2.5 2.5 0 0 1-2.5 2.5H11l-5 4v-4h0.5A2.5 2.5 0 0 1 4 13.5z',
  repost: 'M7 7h10l-3-3M17 17H7l3 3M17 7v6M7 17v-6',
  like: 'M12 20s-7-4.4-8.6-9A4.6 4.6 0 0 1 12 6.6 4.6 4.6 0 0 1 20.6 11C19 15.6 12 20 12 20Z',
  views: 'M5 20V12M10 20V6M15 20v-9M20 20V4',
  share: 'M12 15V3m0 0L7.5 7.5M12 3l4.5 4.5M5 13v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6',
};

export function XFeed({ dataset, settings }: { dataset: Dataset; settings: BetoSettings }) {
  const base = useMemo(() => buildPosts(dataset), [dataset]);
  const [mine, setMine] = useState<XPost[]>([]);
  const [liked, setLiked] = useState<Record<string, boolean>>({});
  const [reposted, setReposted] = useState<Record<string, boolean>>({});
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [following, setFollowing] = useState(false);
  const [topic, setTopic] = useState(0);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState('');

  const topics = useMemo<{ label: string; value: Match | string }[]>(() => [
    ...dataset.matches.slice(0, 10).map(m => ({ label: `${m.local} vs ${m.visita} · ${tagFor(m)}`, value: m as Match | string })),
    { label: 'Casino en vivo y slots', value: 'casino' },
    { label: 'Juego responsable', value: 'responsable' },
  ], [dataset]);
  useEffect(() => { if (topic >= topics.length) setTopic(0); }, [topic, topics.length]);

  const posts = [...mine, ...base];

  const publish = async () => {
    const t = topics[topic]?.value;
    if (!t || busy) return;
    setBusy(true); setNote('');
    const prompt = typeof t === 'string'
      ? t === 'casino'
        ? 'Escribe un post para X sobre los juegos de casino en vivo y slots de Big Bola, con humor de coach y onomatopeyas.'
        : 'Escribe un post para X recordando jugar con responsabilidad, con humor de coach y onomatopeyas.'
      : `Escribe un post para X sobre ${t.local} vs ${t.visita} (${t.liga}${t.marcador ? ', en vivo ' + t.marcador : t.hora ? ', ' + t.hora : ''}).`;
    let text = '';
    if (settings.liveAI) {
      try {
        const r = await askBeto({ endpoint: settings.endpoint, history: [{ role: 'user', content: prompt }], intensity: settings.intensity, channel: 'x' });
        text = (r?.text ?? '').replace(/\s*\n+\s*/g, ' ').trim();
      } catch { text = ''; }
    }
    const fallback = typeof t === 'string' ? { text: t === 'casino' ? GENERIC_POSTS[2] : GENERIC_POSTS[1] } : postFor(t, Date.now());
    const media = typeof t === 'string' ? undefined : fallback.media;
    if (!text) setNote(settings.liveAI ? 'La IA no respondió; BETO publicó una frase armada.' : 'IA apagada: BETO publicó una frase armada.');
    const post: XPost = { id: 'new' + Date.now(), text: text ? (text.length > 280 ? text.slice(0, 277).trimEnd() + '…' : text) : fallback.text, media, time: 'ahora', replies: 0, reposts: 0, likes: 0, views: 1, ai: !!text };
    setMine(prev => [post, ...prev]);
    setBusy(false);
  };

  const trends = dataset.matches.slice(0, 4).map(m => ({
    cat: tagFor(m).slice(1) + ' · Tendencia',
    tag: '#' + (m.local + m.visita).replace(/[^\p{L}\p{N}]/gu, ''),
    n: 1200 + [...m.id].reduce((h, c) => (h * 31 + c.charCodeAt(0)) % 100000, 7) % 20000,
  }));

  return (
    <div className="x-wrap">
      <div className="x-col">
        <div className="x-profile">
          <div className="x-banner"><span>BIG BOLA · COACH</span></div>
          <div className="x-profile__row">
            <div className="x-avatar x-avatar--big" style={avatar} />
            <button className={'x-follow' + (following ? ' x-follow--on' : '')} onClick={() => setFollowing(f => !f)}>{following ? 'Siguiendo' : 'Seguir'}</button>
          </div>
          <div className="x-profile__name">BETO 🏆 <Verified /></div>
          <div className="x-muted">@BetoBigBola</div>
          <p className="x-bio">Coach de entretenimiento de <span className="x-link">@BigBolaMx</span> 🏟️ Te leo el partido, te regaño y te aplaudo. Onomatopeyas incluidas. +18 · Juega con responsabilidad.</p>
          <div className="x-muted x-profile__meta"><span>📍 Estadio Big Bola</span><span>🔗 <span className="x-link">bigbola.mx</span></span><span>🗓 Se unió en enero de 2026</span></div>
          <div className="x-profile__counts"><span><strong>312</strong> Siguiendo</span><span><strong>{following ? '48.3 mil' : '48.2 mil'}</strong> Seguidores</span></div>
          <div className="x-tabs"><span className="x-tab x-tab--on">Posts</span><span className="x-tab">Respuestas</span><span className="x-tab">Destacados</span><span className="x-tab">Multimedia</span></div>
        </div>

        <div className="x-compose">
          <div className="x-avatar" style={avatar} />
          <div className="x-compose__body">
            <label className="x-muted x-compose__label" htmlFor="x-topic">¿De qué quieres que postee BETO?</label>
            <select id="x-topic" className="x-select" value={topic} onChange={e => setTopic(Number(e.target.value))}>
              {topics.map((t, i) => <option key={t.label + i} value={i}>{t.label}</option>)}
            </select>
            <div className="x-compose__foot">
              <span className="x-muted">{note || (settings.liveAI ? 'BETO lo escribe con IA, máx. 280 caracteres.' : 'IA apagada: usa frases armadas.')}</span>
              <button className="x-post-btn" onClick={publish} disabled={busy}>{busy ? 'Escribiendo…' : '✨ Que BETO publique'}</button>
            </div>
          </div>
        </div>

        <div className="x-feed">
          {posts.map(p => {
            const isLiked = !!liked[p.id], isRe = !!reposted[p.id];
            const voted = votes[p.id];
            return (
              <article key={p.id} className={'x-post' + (p.time === 'ahora' ? ' x-post--new' : '')}>
                <div className="x-avatar" style={avatar} />
                <div className="x-post__body">
                  <div className="x-post__head">
                    <strong>BETO 🏆</strong> <Verified /> <span className="x-muted">@BetoBigBola · {p.time}</span>
                    {p.ai && <span className="x-ai">IA</span>}
                  </div>
                  <div className="x-post__text">{rich(p.text)}</div>
                  {p.media?.kind === 'score' && (
                    <div className="x-score">
                      <div className="x-score__top"><span>{p.media.liga}</span><span className={'x-score__st' + (p.media.status === 'EN VIVO' ? ' x-score__st--live' : '')}>{p.media.status}</span></div>
                      <div className="x-score__main">
                        <span className="x-score__team">{p.media.local}</span>
                        <span className="x-score__num">{p.media.hs} <i>-</i> {p.media.as}</span>
                        <span className="x-score__team x-score__team--r">{p.media.visita}</span>
                      </div>
                      <div className="x-score__brand">BETO · BIG BOLA</div>
                    </div>
                  )}
                  {p.media?.kind === 'poll' && (() => {
                    const counts = p.media.base.map((n, i) => n + (voted === i ? 1 : 0));
                    const total = counts.reduce((a, b) => a + b, 0) || 1;
                    return (
                      <div className="x-poll">
                        {p.media.options.map((o, i) => voted === undefined
                          ? <button key={o} className="x-poll__opt" onClick={() => setVotes(v => ({ ...v, [p.id]: i }))}>{o}</button>
                          : (
                            <div key={o} className={'x-poll__res' + (voted === i ? ' x-poll__res--mine' : '')}>
                              <span className="x-poll__fill" style={{ width: Math.round((counts[i] / total) * 100) + '%' }} />
                              <span className="x-poll__label">{o}{voted === i && ' ✓'}</span>
                              <span className="x-poll__pct">{Math.round((counts[i] / total) * 100)}%</span>
                            </div>
                          ))}
                        <div className="x-muted x-poll__foot">{fmtCount(total)} votos · {voted === undefined ? 'Quedan 23 horas' : 'Votaste'}</div>
                      </div>
                    );
                  })()}
                  <div className="x-actions">
                    <span className="x-act x-act--reply"><Icon d={ICONS.reply} />{fmtCount(p.replies)}</span>
                    <button className={'x-act x-act--re' + (isRe ? ' x-act--on' : '')} onClick={() => setReposted(r => ({ ...r, [p.id]: !isRe }))} aria-label="Repostear"><Icon d={ICONS.repost} />{fmtCount(p.reposts + (isRe ? 1 : 0))}</button>
                    <button className={'x-act x-act--like' + (isLiked ? ' x-act--on' : '')} onClick={() => setLiked(l => ({ ...l, [p.id]: !isLiked }))} aria-label="Me gusta"><Icon d={ICONS.like} />{fmtCount(p.likes + (isLiked ? 1 : 0))}</button>
                    <span className="x-act"><Icon d={ICONS.views} />{fmtCount(p.views)}</span>
                    <span className="x-act"><Icon d={ICONS.share} /></span>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      </div>

      <aside className="x-side">
        <div className="x-box">
          <h4>Qué está pasando</h4>
          {trends.map(t => (
            <div key={t.tag} className="x-trend">
              <span className="x-muted">{t.cat}</span>
              <strong>{t.tag}</strong>
              <span className="x-muted">{fmtCount(t.n)} posts</span>
            </div>
          ))}
          <div className="x-trend"><span className="x-muted">Big Bola · Tendencia</span><strong>#BETOretos</strong><span className="x-muted">8,412 posts</span></div>
          <div className="x-trend"><span className="x-muted">México · Tendencia</span><strong>#JuegoResponsable</strong><span className="x-muted">3,190 posts</span></div>
        </div>
        <div className="x-box x-box--note">
          <h4>Simulación</h4>
          <p>Esta cuenta no existe en X. Los posts se arman con los partidos reales del momento (Liga MX, Premier League, NFL y MLB) y el botón ✨ los escribe con IA.</p>
          <p>Estilo: onomatopeyas y burlas de cancha a jugadas y marcadores, nunca a personas ni aficiones. +18.</p>
        </div>
      </aside>
    </div>
  );
}
