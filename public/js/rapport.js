// Rapport de session : ce que le client emporte après une session interactive administrée par Médiacom.
// /rapport?id=live (session en cours) ou /rapport?id=<session close>. Lit le hub (jeton), la démo en ligne,
// ou, sans serveur, le stockage local de la tablette.
import { hubKind, withToken } from './hub.js';
import { COMPANY } from './data.js';
import { esc, LOGO_M } from './ui.js';

const params = new URLSearchParams(location.search);
const id = params.get('id') || 'live';
const $ = (s) => document.querySelector(s);
const fmtDT = (ts) => new Date(ts).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });
const fmtT = (ts) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
const n = (v) => new Intl.NumberFormat('fr-FR').format(v || 0);
const plural = (v, one, many) => `${n(v)} ${v > 1 ? many : one}`;

function load(key, fallback) { try { return JSON.parse(localStorage.getItem(key)) ?? fallback; } catch { return fallback; } }

// Sans serveur : la session vit dans le cache de la tablette
function localSession() {
  if (id !== 'live') return load('mc_sessions', []).find((s) => s.id === id) || null;
  const c = load('mc_os_cache_v3', {});
  const ws = (c.words || []).filter((w) => !w.hidden), p = c.poll || null, qs = (c.questions || []).filter((q) => !q.hidden);
  const s = c.session || { id: 'local', name: c.settings?.eventName || 'Salon', client: '', startedAt: 0 };
  return {
    ...s, name: s.name || c.settings?.eventName || 'Salon', client: c.wall?.theme?.client || s.client || '', live: true, endedAt: Date.now(),
    stats: { words: ws.length, sends: ws.reduce((a, w) => a + (w.count || 1), 0), votes: p?.total || 0, voters: p?.voters || 0, questions: qs.length, qvotes: qs.reduce((a, q) => a + (q.votes || 0), 0) },
    question: c.wall?.question || '', qaTitle: c.wall?.qaTitle || '',
    words: ws.sort((a, b) => b.count - a.count || a.at - b.at).slice(0, 120), poll: p, questions: qs.sort((a, b) => b.votes - a.votes || a.at - b.at),
  };
}

async function fetchSession() {
  const kind = await hubKind();
  if (kind === 'none' || kind === 'down') return { s: localSession(), kind };
  const r = await fetch(withToken(id === 'live' ? '/api/sessions/live' : `/api/sessions/${encodeURIComponent(id)}`), { cache: 'no-store' });
  if (r.status === 401) throw new Error('Cette page demande l’appairage : ouvrez-la depuis la tablette (bouton « Rapport »).');
  if (!r.ok) throw new Error(r.status === 404 ? 'Session introuvable : elle a peut-être été supprimée.' : 'Le serveur ne répond pas.');
  return { s: await r.json(), kind };
}

function cloud(words, question) {
  if (!words.length) return '<p class="empty">Aucun mot reçu.</p>';
  const max = Math.max(...words.map((w) => w.count || 1)), min = Math.min(...words.map((w) => w.count || 1));
  const size = (c) => 15 + ((c - min) / Math.max(1, max - min)) * 33;
  const top = words.slice(0, 40);
  // Les plus cités au centre : on alterne gauche/droite autour du premier
  const ordered = [];
  top.forEach((w, i) => (i % 2 ? ordered.push(w) : ordered.unshift(w)));
  return `<div class="cloud">${ordered.map((w) => `<span style="font-size:${size(w.count || 1).toFixed(1)}px;font-weight:${(w.count || 1) >= max * 0.6 ? 600 : 500}">${esc(w.text)}</span>`).join(' ')}</div>
    <table class="tbl"><thead><tr><th>#</th><th>Mot</th><th class="r">Fois</th><th class="r">Part</th></tr></thead><tbody>
    ${words.slice(0, 12).map((w, i) => `<tr><td class="mono dim">${String(i + 1).padStart(2, '0')}</td><td>${esc(w.text)}</td><td class="r mono">${n(w.count)}</td><td class="r mono dim">${Math.round(((w.count || 1) / words.reduce((a, x) => a + (x.count || 1), 0)) * 100)} %</td></tr>`).join('')}
    </tbody></table>`;
}

function poll(p) {
  if (!p) return '';
  const total = p.total || p.options.reduce((a, o) => a + (o.count || 0), 0);
  const max = Math.max(1, ...p.options.map((o) => o.count || 0));
  return `<section class="block">
    <header><span class="k">Sondage</span><h2>${esc(p.title)}</h2><p class="sub">${total ? `${plural(total, 'vote', 'votes')}${p.voters && p.voters !== total ? ` · ${plural(p.voters, 'participant', 'participants')}` : ''}${p.multiple ? ' · plusieurs réponses possibles' : ''}` : 'Aucun vote'}${p.open === false ? ' · vote clos' : ''}</p></header>
    <div class="bars">${p.options.map((o) => { const c = o.count || 0, pct = total ? Math.round((c / total) * 100) : 0; return `<div class="bar ${total && c === max ? 'lead' : ''}"><span class="l">${esc(o.label)}</span><span class="track"><i style="width:${total ? (c / max) * 100 : 0}%"></i></span><b class="mono">${pct} %</b><small class="mono dim">${n(c)}</small></div>`; }).join('')}</div>
  </section>`;
}

function questions(qs, title) {
  if (!qs.length) return '';
  return `<section class="block">
    <header><span class="k">Questions du public</span><h2>${esc(title || 'Vos questions')}</h2><p class="sub">${plural(qs.length, 'question', 'questions')} · ${plural(qs.reduce((a, q) => a + (q.votes || 0), 0), 'soutien', 'soutiens')} · ${qs.filter((q) => q.answered).length} répondue${qs.filter((q) => q.answered).length > 1 ? 's' : ''}</p></header>
    <ol class="qs">${qs.map((q) => `<li class="${q.answered ? 'done' : ''}"><b class="mono">${n(q.votes)}</b><div><p>${esc(q.text)}</p><small class="mono dim">${fmtT(q.at)}${q.answered ? ' · répondue' : ''}${q.pinned ? ' · mise en avant' : ''}</small></div></li>`).join('')}</ol>
  </section>`;
}

function render(s, kind) {
  const st = s.stats || {};
  const start = s.startedAt || s.endedAt, end = s.endedAt || Date.now();
  const mins = Math.max(1, Math.round((end - start) / 60000));
  document.title = `${s.client ? s.client + ' · ' : ''}${s.name || 'Session'} · Rapport Médiacom`;
  $('#bar-t').textContent = s.live ? 'Session en cours · rapport provisoire' : 'Rapport de session';
  $('#b-live').hidden = !s.live;
  $('#sheet').innerHTML = `
    <header class="head">
      <div class="brand"><span class="m">${LOGO_M}</span><span><b>MÉDIACOM</b><small>${esc(COMPANY.baseline)}</small></span></div>
      <div class="meta mono"><span>${s.live ? 'Rapport provisoire' : 'Rapport de session'}</span><span>${esc(fmtDT(end))}</span>${kind === 'cloud' ? '<span>démo en ligne</span>' : ''}</div>
    </header>
    <section class="title">
      <span class="k">Session interactive${s.client ? ' · ' + esc(s.client) : ''}</span>
      <h1>${esc(s.name || 'Session')}</h1>
      <p class="sub">${start && start !== end ? `${esc(fmtDT(start))} → ${esc(fmtT(end))} · ${mins < 90 ? `${mins} min` : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')}`}` : esc(fmtDT(end))}. Session administrée en direct par l’équipe Médiacom : nuage de mots, sondage et questions du public sur l’écran LED, participation par QR code.</p>
    </section>
    <section class="stats">
      <div><b>${n(st.sends)}</b><span>${st.sends > 1 ? 'mots envoyés' : 'mot envoyé'}</span><small>${plural(st.words, 'mot distinct', 'mots distincts')}</small></div>
      <div><b>${n(st.votes)}</b><span>${st.votes > 1 ? 'votes' : 'vote'}</span><small>${plural(st.voters, 'participant', 'participants')}</small></div>
      <div><b>${n(st.questions)}</b><span>${st.questions > 1 ? 'questions' : 'question'}</span><small>${plural(st.qvotes, 'soutien', 'soutiens')}</small></div>
      <div><b>${n((st.sends || 0) + (st.votes || 0) + (st.questions || 0))}</b><span>participations</span><small>en ${mins < 90 ? `${mins} min` : `${Math.floor(mins / 60)} h ${String(mins % 60).padStart(2, '0')}`}</small></div>
    </section>
    <section class="block">
      <header><span class="k">Nuage de mots</span><h2>${esc(s.question || 'Votre prochain événement, en un mot ?')}</h2><p class="sub">${st.sends ? `${plural(st.sends, 'réponse', 'réponses')}, les plus citées en grand` : 'Aucune réponse'}</p></header>
      ${cloud(s.words || [], s.question)}
    </section>
    ${poll(s.poll)}
    ${questions(s.questions || [], s.qaTitle)}
    <footer class="foot">
      <div><b>Médiacom</b> · ${esc(COMPANY.address)} · ${esc(COMPANY.phone)} · ${esc(COMPANY.email)}</div>
      <div class="mono dim">Prestataire technique son, lumière, image et scène mobile depuis ${COMPANY.since}. Données de participation anonymes : aucun nom, aucun numéro.</div>
    </footer>`;
  $('#sheet').removeAttribute('aria-busy');
}

async function go() {
  try {
    const { s, kind } = await fetchSession();
    if (!s) throw new Error('Session introuvable sur cet appareil.');
    render(s, kind);
  } catch (e) {
    $('#sheet').innerHTML = `<div class="err"><h1>Rapport indisponible</h1><p>${esc(e.message)}</p><p><a href="/#mur">Retour à la tablette</a></p></div>`;
    $('#sheet').removeAttribute('aria-busy');
  }
}
$('#b-print').addEventListener('click', () => print());
$('#b-live').addEventListener('click', go);
go();
if (id === 'live') setInterval(go, 30000);
