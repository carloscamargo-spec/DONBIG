import { Fragment, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { norm, type Dataset } from '../beto/data';
import { forecastCard, matchCard, statsCard, type Card } from '../beto/cards';
import { scripted } from '../beto/scripted';
import { askBeto } from '../beto/api';
import type { BetoSettings } from '../beto/useBeto';
import { AVATAR_BASE } from '../beto/poses';
import { playWhistle, unlockAudio } from '../beto/whistle';
import { LEVEL_GOAL, NAGS, VOICE_NOTE, WAKE_UP, buildQuizzes, matchOfWeek, waTime, type Quiz } from '../beto/coachWa';
import { MessageCard } from './MessageCard';
import '../whatsapp.css';

type WaMsg =
  | { id: number; kind: 'date'; text: string }
  | { id: number; kind: 'notice'; text: string; tone: 'info' | 'push' | 'ok' }
  | { id: number; kind: 'text'; from: 'beto' | 'user'; text: string; time: string; card?: Card | null; buttons?: string[] }
  | { id: number; kind: 'voice'; transcript: string; dur: number; time: string }
  | { id: number; kind: 'poll'; quiz: Quiz; voted?: number; time: string }
  | { id: number; kind: 'badge'; time: string };

type DistOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;
type NewMsg = DistOmit<WaMsg, 'id' | 'time'>;

const START = 6 * 60 + 30; // 6:30 a.m.
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const WAVE = [4, 9, 14, 7, 12, 18, 10, 6, 15, 20, 12, 8, 16, 11, 6, 13, 19, 9, 5, 12, 16, 8, 14, 10, 6, 11, 7, 4];

/** *negritas*, _cursivas_ y saltos de línea como en WhatsApp. */
function fmt(text: string): ReactNode {
  return text.split('\n').map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/(\*[^*\n]+\*|_[^_\n]+_)/g).map((part, j) =>
        part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <strong key={j}>{part.slice(1, -1)}</strong>
          : part.startsWith('_') && part.endsWith('_') && part.length > 2 ? <em key={j}>{part.slice(1, -1)}</em>
            : part)}
    </Fragment>
  ));
}

export function WhatsAppSim({ dataset, settings }: { dataset: Dataset; settings: BetoSettings }) {
  const [msgs, setMsgs] = useState<WaMsg[]>([]);
  const [typing, setTyping] = useState(false);
  const [pushups, setPushups] = useState(0);
  const [progress, setProgress] = useState(0);
  const [input, setInput] = useState('');
  const [playing, setPlaying] = useState<number | null>(null);
  const [transcripts, setTranscripts] = useState<Record<number, boolean>>({});
  const [clock, setClock] = useState(START);

  const rootRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const r = useRef({
    id: 0, clock: START, started: false, visible: false, alive: true, busy: 0,
    lastAct: Date.now(), nags: 0, quizIdx: 0, shown: 0, quizzes: [] as Quiz[], progress: 0, leveled: false, pushups: 0,
    queue: Promise.resolve(),
  });
  const ds = useRef(dataset); ds.current = dataset;
  const cfg = useRef(settings); cfg.current = settings;
  const msgsRef = useRef(msgs); msgsRef.current = msgs;

  // ---------- Motor de mensajes ----------

  const add = useCallback((m: NewMsg, withTime = true) => {
    const id = ++r.current.id;
    const time = withTime ? waTime(r.current.clock++) : '';
    if (withTime) setClock(r.current.clock - 1);
    setMsgs(prev => [...prev, { ...m, id, time } as WaMsg]);
    return id;
  }, []);

  /** Encola acciones de BETO para que salgan en orden, con "escribiendo…". */
  const enqueue = useCallback((fn: () => Promise<void>) => {
    r.current.queue = r.current.queue.then(async () => {
      if (!r.current.alive) return;
      r.current.busy++;
      try { await fn(); } finally { r.current.busy--; }
    });
    return r.current.queue;
  }, []);

  const typeFor = useCallback(async (ms: number) => {
    setTyping(true);
    await sleep(ms);
    setTyping(false);
  }, []);

  const say = useCallback((text: string, extra: { card?: Card | null; buttons?: string[] } = {}) => enqueue(async () => {
    await typeFor(Math.min(1800, 500 + text.length * 14));
    if (r.current.alive) add({ kind: 'text', from: 'beto', text, ...extra });
  }), [enqueue, typeFor, add]);

  const notice = useCallback((text: string, tone: 'info' | 'push' | 'ok') => enqueue(async () => { add({ kind: 'notice', text, tone }, false); }), [enqueue, add]);

  /** Suma (o tacha) lagartijas en orden, después de los mensajes ya encolados. */
  const addPushups = useCallback((n: number) => enqueue(async () => {
    const before = r.current.pushups;
    const after = Math.max(0, before + n);
    if (after === before) return;
    r.current.pushups = after;
    setPushups(after);
    add({ kind: 'notice', text: after > before ? `💪 BETO te puso ${after - before} lagartijas` : `✅ ${before - after} lagartijas tachadas`, tone: after > before ? 'push' : 'ok' }, false);
  }), [enqueue, add]);

  // ---------- Retos ----------

  const nextQuiz = useCallback(() => {
    const st = r.current;
    if (st.quizIdx >= st.quizzes.length) {
      say(st.progress >= LEVEL_GOAL
        ? 'Por hoy ya entrenaste como profesional 🏆 Mañana a las 6:30 te despierto con más retos. ¿Vemos algún partido mientras?'
        : `Se me acabaron los retos de hoy 😅 Vas ${st.progress}/${LEVEL_GOAL}. Mañana a las 6:30 seguimos, ¡no te duermas!`,
      { buttons: ['Analizar el partido', 'Recomiéndame un juego'] });
      return;
    }
    const quiz = st.quizzes[st.quizIdx++];
    say(`Reto ${++st.shown} 👇 Contesta en la encuesta.`);
    enqueue(async () => { await typeFor(700); add({ kind: 'poll', quiz }); });
  }, [say, enqueue, typeFor, add]);

  const vote = useCallback((msgId: number, option: number) => {
    const m = msgsRef.current.find(x => x.id === msgId);
    if (!m || m.kind !== 'poll' || m.voted !== undefined || r.current.busy) return;
    r.current.lastAct = Date.now(); r.current.nags = 0;
    setMsgs(prev => prev.map(x => (x.id === msgId && x.kind === 'poll' ? { ...x, voted: option } : x)));
    const q = m.quiz;
    if (option === q.correct) {
      const p = ++r.current.progress;
      setProgress(p);
      say(q.ok);
      notice(`✅ Reto superado · ${Math.min(p, LEVEL_GOAL)}/${LEVEL_GOAL}`, 'ok');
      if (p >= LEVEL_GOAL && !r.current.leveled) {
        r.current.leveled = true;
        say('🏆 ¡LO LOGRASTE! De la cama a la cancha en una mañana. Ya eres *Especialista BETO nivel 1* 💪');
        enqueue(async () => { await typeFor(600); add({ kind: 'badge' }); });
        say('¿Seguimos entrenando o vemos un partido?', { buttons: ['Siguiente reto 💪', 'Analizar el partido'] });
      } else {
        say('¿Otro?', { buttons: ['Siguiente reto 💪'] });
      }
    } else {
      say(q.bad);
      addPushups(q.pushups);
      say('Cuando las hagas me avisas 👀', { buttons: ['Ya las hice 💪', 'Siguiente reto 💪'] });
    }
  }, [say, notice, enqueue, typeFor, add, addPushups]);

  // ---------- Respuestas del usuario ----------

  const freeText = useCallback(async (text: string) => {
    let ans = null as Awaited<ReturnType<typeof askBeto>>;
    if (cfg.current.liveAI) {
      const history = msgsRef.current.flatMap(m =>
        m.kind === 'text' ? [{ role: m.from === 'user' ? 'user' as const : 'assistant' as const, content: m.text }]
          : m.kind === 'voice' ? [{ role: 'assistant' as const, content: '(audio) ' + m.transcript }]
            : m.kind === 'poll' ? [{ role: 'assistant' as const, content: 'Encuesta: ' + m.quiz.q + (m.voted !== undefined ? ` (contestó: ${m.quiz.options[m.voted]})` : '') }]
              : []).slice(-12);
      history.push({ role: 'user', content: text });
      setTyping(true);
      try { ans = await askBeto({ endpoint: cfg.current.endpoint, history, intensity: cfg.current.intensity, channel: 'whatsapp' }); } catch { ans = null; }
      setTyping(false);
    }
    if (ans) {
      const parts = ans.text.split(/\n\s*\n/).map(x => x.trim()).filter(Boolean).slice(0, 3);
      parts.forEach((p, i) => say(p, i === parts.length - 1 ? { card: ans!.card, buttons: ans!.replies } : {}));
      if (ans.pushups) addPushups(ans.pushups);
      return;
    }
    const s = scripted(text, ds.current);
    say(s.text, { card: s.card, buttons: s.replies });
  }, [say, enqueue, addPushups]);

  const handle = useCallback((raw: string) => {
    const t = norm(raw);
    const m = matchOfWeek(ds.current);
    if (/ya las hice/.test(t)) {
      const p = r.current.pushups;
      if (p === 0) { say('¿Cuáles? Si no debes ninguna 😂 Pero me encanta la actitud. ¡Siguiente!', { buttons: ['Siguiente reto 💪'] }); return; }
      say(`¡ESO! 🔥 ${p} lagartijas. Así se entrena, campeón.`);
      addPushups(-p);
      say('¿Seguimos?', { buttons: ['Siguiente reto 💪'] });
      return;
    }
    if (/manana las hago/.test(t)) {
      say('¿Mañana? 😒 Mañana también hay partido. +10 por flojo.');
      addPushups(10);
      say('Te espero 👀', { buttons: ['Ya las hice 💪'] });
      return;
    }
    if (/me los se/.test(t)) {
      const q = r.current.quizzes[r.current.quizIdx];
      if (q?.id.startsWith('match-')) { say('Va, demuéstralo 👇'); nextQuiz(); } else nextQuiz();
      return;
    }
    if (/ni idea/.test(t)) {
      if (m) {
        say('¡Ay, campeón! 😤 Así no se llega a la final. Apunta:', { card: statsCard(m, ds.current) ?? forecastCard(m) ?? matchCard(m) });
        if (r.current.quizzes[r.current.quizIdx]?.id.startsWith('match-')) r.current.quizIdx++;
      }
      say('Por no sabértelos: 20 lagartijas 💪👇');
      addPushups(20);
      say('Cuando las termines, me avisas.', { buttons: ['Ya las hice 💪', 'Mañana las hago 😅'] });
      return;
    }
    if (/siguiente reto|otro reto|^(dale|vamos|le entro|listo|si|va)\b/.test(t)) { nextQuiz(); return; }
    freeText(raw);
  }, [say, addPushups, nextQuiz, freeText]);

  const send = useCallback((text: string) => {
    const clean = text.trim();
    if (!clean) return;
    unlockAudio(cfg.current.sound);
    r.current.lastAct = Date.now(); r.current.nags = 0;
    setMsgs(prev => prev.map(x => (x.kind === 'text' && x.buttons ? { ...x, buttons: undefined } : x)));
    add({ kind: 'text', from: 'user', text: clean });
    setInput('');
    if (!r.current.started) return;
    handle(clean);
  }, [add, handle]);

  // ---------- Arranque al verse en pantalla y regaños por dormirse ----------

  const start = useCallback(() => {
    const st = r.current;
    if (st.started) return;
    st.started = true;
    st.quizzes = buildQuizzes(ds.current);
    st.lastAct = Date.now();
    add({ kind: 'date', text: 'HOY' }, false);
    add({ kind: 'notice', text: '🔒 Simulación de BETO en WhatsApp Business. Los mensajes y audios son de demostración.', tone: 'info' }, false);
    say(WAKE_UP);
    enqueue(async () => { await typeFor(1200); add({ kind: 'voice', transcript: VOICE_NOTE, dur: 9 }); });
    const m = matchOfWeek(ds.current);
    if (m) say(`Esta semana juega *${m.local} vs ${m.visita}* (${m.marcador || m.hora}) 🔥 ¿Ya te sabes estos datos?`, { card: matchCard(m), buttons: ['Sí, me los sé 😎', 'Ni idea 🙈'] });
    else say('Hoy no hay partido en el radar, pero el cerebro también se entrena. ¿Arrancamos?', { buttons: ['Siguiente reto 💪'] });
    enqueue(async () => { st.lastAct = Date.now(); });
  }, [add, say, enqueue, typeFor]);

  useEffect(() => {
    const st = r.current;
    st.alive = true;
    const el = rootRef.current;
    const io = new IntersectionObserver(([e]) => {
      st.visible = e.isIntersecting;
      if (e.isIntersecting) start();
    }, { threshold: 0.35 });
    if (el) io.observe(el);
    const nag = window.setInterval(() => {
      if (!st.started || !st.visible || st.busy || st.nags >= NAGS.length) return;
      if (Date.now() - st.lastAct < (st.nags ? 30000 : 25000)) return;
      const i = st.nags++;
      st.lastAct = Date.now();
      if (i === 0 && cfg.current.sound) playWhistle();
      say(NAGS[i]);
      if (i === 1) addPushups(10);
    }, 3000);
    return () => { st.alive = false; io.disconnect(); clearInterval(nag); window.speechSynthesis?.cancel(); };
  }, [start, say, enqueue, addPushups]);

  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [msgs, typing]);

  // ---------- Nota de voz ----------

  const playVoice = (m: Extract<WaMsg, { kind: 'voice' }>) => {
    const synth = window.speechSynthesis;
    if (playing === m.id) { synth?.cancel(); setPlaying(null); return; }
    setPlaying(m.id);
    setTranscripts(t => ({ ...t, [m.id]: true }));
    r.current.lastAct = Date.now();
    let done = false;
    const stop = () => { if (!done) { done = true; setPlaying(p => (p === m.id ? null : p)); } };
    if (cfg.current.sound && synth && typeof SpeechSynthesisUtterance !== 'undefined') {
      synth.cancel();
      const u = new SpeechSynthesisUtterance(m.transcript);
      u.lang = 'es-MX';
      const voice = synth.getVoices().find(v => v.lang === 'es-MX') ?? synth.getVoices().find(v => v.lang.startsWith('es'));
      if (voice) u.voice = voice;
      u.rate = 1.05; u.pitch = 0.85;
      u.onend = stop;
      synth.speak(u);
    }
    window.setTimeout(stop, m.dur * 1000 + 400);
  };

  // ---------- Vista ----------

  const lastButtonsId = [...msgs].reverse().find(m => m.kind === 'text' && m.buttons?.length)?.id;
  const avatar = { backgroundImage: `url(${AVATAR_BASE})` };

  return (
    <div className="wa-wrap" ref={rootRef}>
      <div className="wa-phone" aria-label="Simulación de chat de WhatsApp con BETO">
        <div className="wa-status"><span>{waTime(clock).replace(/ [ap]\.m\.$/, '')}</span><span className="wa-status__icons">▂▄▆ ᯤ ▮▮▮</span></div>
        <div className="wa-head">
          <svg className="wa-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M15.5 4.5 8 12l7.5 7.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
          <div className="wa-avatar" style={avatar} />
          <div className="wa-head__who">
            <div className="wa-head__name">BETO Coach <span className="wa-verified" title="Cuenta de empresa verificada">✓</span></div>
            <div className="wa-head__status">{typing ? 'escribiendo…' : 'en línea'}</div>
          </div>
          <svg className="wa-ico" viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="7" width="12" height="10" rx="2" fill="none" stroke="currentColor" strokeWidth="2" /><path d="m15 11 5-3v8l-5-3" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
          <svg className="wa-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M6.6 3.5h3l1.5 4-2 1.3a11 11 0 0 0 6.1 6.1l1.3-2 4 1.5v3a2 2 0 0 1-2.2 2A17 17 0 0 1 4.6 5.7a2 2 0 0 1 2-2.2Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /></svg>
        </div>
        <div className="wa-pin">
          <span>📌</span>
          <div className="wa-pin__text"><strong>Reto: Especialista BETO</strong> · {Math.min(progress, LEVEL_GOAL)}/{LEVEL_GOAL}</div>
          <span className={'wa-pin__push' + (pushups ? ' wa-pin__push--on' : '')}>💪 {pushups}</span>
        </div>

        <div className="wa-body" ref={bodyRef}>
          {msgs.map(m => {
            if (m.kind === 'date') return <div key={m.id} className="wa-date">{m.text}</div>;
            if (m.kind === 'notice') return <div key={m.id} className={'wa-notice wa-notice--' + m.tone}>{m.text}</div>;
            if (m.kind === 'badge') {
              return (
                <div key={m.id} className="wa-row">
                  <div className="wa-msg wa-msg--in wa-badge">
                    <div className="wa-badge__medal">🏆</div>
                    <div className="wa-badge__title">Especialista BETO</div>
                    <div className="wa-badge__sub">Nivel 1 · Deportes y juegos</div>
                    <div className="wa-badge__stars">★ ★ ★ ★ ★</div>
                    <span className="wa-meta">{m.time}</span>
                  </div>
                </div>
              );
            }
            if (m.kind === 'voice') {
              const on = playing === m.id;
              return (
                <div key={m.id} className="wa-row">
                  <div className="wa-msg wa-msg--in wa-voice">
                    <div className="wa-voice__main">
                      <button className="wa-voice__play" onClick={() => playVoice(m)} aria-label={on ? 'Pausar audio' : 'Reproducir audio'}>{on ? '❚❚' : '▶'}</button>
                      <div className="wa-voice__wave">
                        {WAVE.map((h, i) => <span key={i} style={{ height: h }} />)}
                        <div key={on ? 'on' : 'off'} className={'wa-voice__fill' + (on ? ' wa-voice__fill--on' : '')} style={{ animationDuration: m.dur + 's' }} />
                      </div>
                      <div className="wa-voice__pic" style={avatar}><span>🎙</span></div>
                    </div>
                    <div className="wa-voice__foot">
                      <span>0:{String(m.dur).padStart(2, '0')}</span>
                      <button className="wa-voice__tr" onClick={() => setTranscripts(t => ({ ...t, [m.id]: !t[m.id] }))}>{transcripts[m.id] ? 'Ocultar transcripción' : 'Ver transcripción'}</button>
                      <span className="wa-meta wa-meta--inline">{m.time}</span>
                    </div>
                    {transcripts[m.id] && <div className="wa-voice__text">“{m.transcript}”</div>}
                  </div>
                </div>
              );
            }
            if (m.kind === 'poll') {
              const voted = m.voted !== undefined;
              const votes = m.quiz.options.map((_, i) => (voted ? (i === m.voted ? 1 : 0) + (i === m.quiz.correct ? 1 : 0) : 0));
              return (
                <div key={m.id} className="wa-row">
                  <div className="wa-msg wa-msg--in wa-poll">
                    <div className="wa-poll__q">{m.quiz.q}</div>
                    <div className="wa-poll__hint">{voted ? 'Votaste · BETO también' : 'Selecciona una opción'}</div>
                    {m.quiz.options.map((o, i) => (
                      <button key={o} className={'wa-poll__opt' + (voted && i === m.voted ? ' wa-poll__opt--mine' : '')} onClick={() => vote(m.id, i)} disabled={voted}>
                        <span className={'wa-poll__radio' + (voted && i === m.voted ? ' wa-poll__radio--on' : '')} />
                        <span className="wa-poll__label">{o}{voted && i === m.quiz.correct && ' ✓'}</span>
                        <span className="wa-poll__count">{voted ? votes[i] : ''}</span>
                        <span className="wa-poll__bar"><span style={{ width: (voted ? (votes[i] / 2) * 100 : 0) + '%' }} /></span>
                      </button>
                    ))}
                    <span className="wa-meta">{m.time}</span>
                  </div>
                </div>
              );
            }
            const mine = m.from === 'user';
            const live = m.id === lastButtonsId;
            return (
              <div key={m.id} className={'wa-row' + (mine ? ' wa-row--out' : '')}>
                <div className="wa-stack">
                  <div className={'wa-msg ' + (mine ? 'wa-msg--out' : 'wa-msg--in')}>
                    {m.card && <div className="wa-card"><MessageCard card={m.card} onPlay={n => say(`${n}: primero pruébalo en demo, campeón 😉`)} onPause={() => say('¡Eso! Banca de 10 minutos. Aquí te espero 💪')} onLimit={() => say('Límite puesto. Así se juega: con plan 💪')} /></div>}
                    <span className="wa-text">{fmt(m.text)}</span>
                    <span className="wa-meta">{m.time}{mine && <span className="wa-ticks">✓✓</span>}</span>
                  </div>
                  {!mine && m.buttons && m.buttons.length > 0 && (
                    <div className="wa-btns">
                      {m.buttons.map(b => <button key={b} className="wa-btn" disabled={!live} onClick={() => send(b)}>↩ {b}</button>)}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {typing && (
            <div className="wa-row"><div className="wa-msg wa-msg--in wa-typing"><span /><span /><span /></div></div>
          )}
        </div>

        <form className="wa-input" onSubmit={e => { e.preventDefault(); send(input); }}>
          <div className="wa-input__field">
            <span className="wa-input__ico" aria-hidden="true">☺</span>
            <input value={input} onChange={e => setInput(e.target.value)} placeholder="Mensaje" aria-label="Mensaje para BETO en WhatsApp" />
            <span className="wa-input__ico" aria-hidden="true">📎</span>
          </div>
          <button className="wa-send" type="submit" aria-label="Enviar">{input.trim() ? '➤' : '🎤'}</button>
        </form>
      </div>

      <div className="wa-aside">
        <div className="wa-aside__tag">SIMULACIÓN · WHATSAPP BUSINESS</div>
        <h3>BETO no te deja dormir</h3>
        <p>El coach vive en el WhatsApp del usuario. Lo despierta, le cuenta qué se juega en la semana y lo entrena hasta volverlo especialista en deportes y juegos.</p>
        <ul className="wa-aside__list">
          <li><strong>☀️ Te despierta</strong><span>Mensajes y notas de voz para que no te duermas en la jornada.</span></li>
          <li><strong>📊 Te entrena</strong><span>Trivia con datos reales de Liga MX, NFL y MLB, y con las reglas de los juegos del casino.</span></li>
          <li><strong>💪 Te reta</strong><span>Lagartijas por cada dato que no sabes o por dormirte. Se borran cuando avisas que las hiciste.</span></li>
          <li><strong>🏆 Te sube de nivel</strong><span>5 retos superados y pasas a Especialista BETO.</span></li>
        </ul>
        <p className="wa-aside__note">Escríbele lo que quieras: responde con IA en modo WhatsApp. En producción se conectaría a WhatsApp Business con permiso del usuario y plantillas aprobadas. Los retos nunca son por apostar ni depositar. +18.</p>
      </div>
    </div>
  );
}
