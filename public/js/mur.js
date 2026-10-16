// Écran LED : nuage de mots, sondage, questions, showreel, MediaScène, message, page externe, noir.
// Lit le flux public du hub (aucune donnée personnelle), ou le stockage local hors hub.
// Adresses : /mur (sortie habillée, suit la tablette) · /ecran (sortie pure pour l'ordinateur du mur, suit la tablette)
//            /ecran/nuage, /ecran/sondage, /ecran/questions, /ecran/showreel, /ecran/mediascene, /ecran/message, /ecran/externe, /ecran/noir (figés)
import { wallFeed } from './hub.js';
import { PHOTOS, VIDEOS, MEDIASCENE, COMPANY, isSem, setBookOverrides, photo, video, poster } from './data.js';
import { LOGO_M, qrSVG, esc, wifiPayload } from './ui.js';

const SLUGS = { nuage: 'cloud', sondage: 'poll', questions: 'questions', showreel: 'reel', mediascene: 'mediascene', message: 'message', externe: 'external', noir: 'black' };
const params = new URLSearchParams(location.search);
const preview = params.has('preview');
const pure = /^\/ecran/.test(location.pathname) || params.has('pure');
const locked = SLUGS[(location.pathname.match(/^\/ecran\/([a-z-]+)/) || [])[1]] || SLUGS[params.get('scene')] || null;
document.body.classList.toggle('preview', preview);
document.body.classList.toggle('pure', pure);

const $ = (s) => document.querySelector(s);
const wallEl = $('#wall');
const cloudEl = $('#w-cloud');

const SEEDS = ['Séminaire', 'Convention', 'Plénière', 'Incentive', 'Soirée', 'Congrès', 'Son', 'Lumière', 'Image', 'Émotion', 'Marseille', 'Live'];
const state = { wall: { scene: 'cloud', accept: true, theme: {} }, words: [], poll: null, questions: [], info: null, eventName: '' };
const INTERACTIVE = new Set(['cloud', 'poll', 'questions']);

/* ---------- Bandeau (sortie habillée seulement) ---------- */
const tick = [COMPANY.baseline, `Depuis ${COMPANY.since}`, 'Marseille', 'Sonorisation', 'Lumière', 'Écrans LED', 'Captation & streaming', 'Scène mobile MediaScène', 'Mapping laser'];
$('#w-track').innerHTML = [...tick, ...tick].map((t) => `<span>${esc(t)}</span><i>◆</i>`).join('');

/* ---------- Habillage : style de fond, couleurs, marque ---------- */
function luminance(hex) {
  const n = parseInt(hex.slice(1), 16);
  const c = [16, 8, 0].map((s) => ((n >> s) & 255) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
}
let lastTheme = '';
function applyTheme() {
  const t = Object.assign({ style: 'sobre', c1: '#0a2f6b', c2: '#3192ff', brand: true, logo: '', client: '' }, state.wall.theme || {});
  const sig = JSON.stringify(t);
  if (sig === lastTheme) return;
  lastTheme = sig;
  wallEl.dataset.theme = t.style;
  wallEl.style.setProperty('--t1', t.c1);
  wallEl.style.setProperty('--t2', t.c2);
  // Encre : blanc sur fond sombre, nuit sur fond clair (couleur unie ou dégradé clairs)
  const light = (t.style === 'uni' && luminance(t.c1) > 0.5) || (t.style === 'degrade' && (luminance(t.c1) + luminance(t.c2)) / 2 > 0.5);
  wallEl.classList.toggle('ink-dark', light);
  wallEl.classList.toggle('no-brand', t.brand === false);
  const by = t.brand !== false ? `<span class="w-by"><span class="w-m">${LOGO_M}</span><span>Médiacom</span></span>` : '';
  // Aux couleurs du client : son logo, sinon son nom en tête ; Médiacom signe en petit
  $('#w-brand').innerHTML = t.logo
    ? `<img class="w-client" src="${t.logo}" alt="${esc(t.client || 'Client')}">${by}`
    : t.client
      ? `<span class="w-word w-client-name">${esc(t.client)}</span>${by}`
      : `<span class="w-m">${LOGO_M}</span><span class="w-word">MEDIACOM</span><span class="w-base">Le son · la lumière · l’image</span>`;
}

/* ---------- QR de participation ---------- */
async function loadInfo() {
  try { state.info = await (await fetch('/api/info', { cache: 'no-store' })).json(); } catch { state.info = { base: location.origin }; }
  renderJoin();
}
function renderJoin() {
  const base = state.info?.base || location.origin;
  const url = `${base}/nuage`;
  const wifi = state.info?.wifi;
  const verb = { cloud: 'Envoyez votre mot', poll: 'Votez depuis votre téléphone', questions: 'Posez votre question' }[current] || 'Participez';
  $('#w-join').innerHTML = `${wifi?.ssid ? `<div class="w-step"><div class="qr">${qrSVG(wifiPayload(wifi.ssid, wifi.pass), { ecc: 'M', margin: 1 })}</div><div><b>1 · Wi-Fi</b><span>${esc(wifi.ssid)}</span></div></div>` : ''}
    <div class="w-step"><div class="qr">${qrSVG(url, { ecc: 'M', margin: 1 })}</div><div><b>${wifi?.ssid ? '2 · ' : ''}${esc(verb)}</b><span>Flashez le code</span><small>${esc(url.replace(/^https?:\/\//, ''))}</small></div></div>`;
}

/* ---------- Titre de l'activité ---------- */
function renderTitle() {
  const w = state.wall;
  const box = $('#w-title');
  let k = '', q = '', closed = false;
  if (current === 'cloud') { k = 'Nuage de mots'; q = w.question || 'Votre prochain événement, en un mot ?'; closed = w.accept === false; }
  if (current === 'poll') { k = 'Sondage'; q = state.poll?.title || 'Le sondage arrive…'; closed = !!state.poll && state.poll.open === false; }
  if (current === 'questions') { k = 'Vos questions'; q = w.qaTitle || 'Une question pour les intervenants ?'; closed = w.qaOpen === false; }
  box.hidden = !k;
  if (!k) return;
  $('#w-title-k').textContent = state.eventName && state.eventName !== 'Salon' ? `${k} · ${state.eventName}` : k;
  const h = $('#w-question');
  if (h.textContent !== q) { h.textContent = q; h.classList.remove('in'); void h.offsetWidth; h.classList.add('in'); }
  h.style.fontSize = `${Math.max(2.2, Math.min(3.4, 3.4 - (q.length - 36) * 0.025))}cqw`;
  $('#w-closed').hidden = !closed;
}

/* ---------- Nuage : placement en spirale, sans collision ---------- */
const measureCtx = document.createElement('canvas').getContext('2d');
const fontReady = document.fonts?.load ? document.fonts.load('500 40px Jost').catch(() => {}) : Promise.resolve();
const nodes = new Map();

function wordsForCloud() {
  const real = state.words.filter((w) => !w.hidden);
  const list = real.map((w) => ({ key: w.id, text: w.text, count: w.count || 1, at: w.at || 0, seed: false }));
  if (real.length < 10) {
    const have = new Set(real.map((w) => w.text.toLowerCase()));
    SEEDS.filter((s) => !have.has(s.toLowerCase())).slice(0, 12 - real.length).forEach((s, i) => list.push({ key: 'seed-' + s, text: s, count: 1, at: -i, seed: true }));
  }
  list.sort((a, b) => (a.seed - b.seed) || (b.count - a.count) || (a.at - b.at));
  return list.slice(0, 56);
}
function layout() {
  const W = cloudEl.clientWidth, H = cloudEl.clientHeight;
  if (!W || !H) return;
  const cqw = wallEl.clientWidth / 100;
  const list = wordsForCloud();
  const maxC = Math.max(1, ...list.map((w) => w.count));
  let scale = 1, placed = null;
  for (let attempt = 0; attempt < 6 && !placed; attempt++, scale *= 0.88) placed = place(list, W, H, cqw, maxC, scale);
  if (!placed) placed = place(list.slice(0, 30), W, H, cqw, maxC, scale);
  render(placed || [], cqw);
}
// Question au centre (relecture Nolan) : le nuage s'organise autour d'elle, jamais dessus
function titleRect() {
  const t = $('#w-title');
  if (wallEl.dataset.layout !== 'centre' || t.hidden) return null;
  const a = t.getBoundingClientRect(), c = cloudEl.getBoundingClientRect();
  const pad = wallEl.clientWidth * 0.012;
  return { x: a.left - c.left - pad, y: a.top - c.top - pad, w: a.width + pad * 2, h: a.height + pad * 2 };
}
function place(list, W, H, cqw, maxC, scale) {
  const rects = [], out = [];
  const tr = titleRect();
  if (tr) rects.push(tr);
  const cx = W / 2, cy = H / 2;
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    const t = Math.sqrt((w.count - 1) / Math.max(1, maxC - 1));
    const sizeCqw = (w.seed ? 2.4 : 2.8 + t * 5.6) * scale * (i === 0 && !w.seed ? 1.08 : 1);
    const px = sizeCqw * cqw;
    measureCtx.font = `500 ${px}px Jost, sans-serif`;
    const tw = measureCtx.measureText(w.text).width, th = px * 0.92, pad = px * 0.2;
    let ok = false;
    for (let s = 0; s < 1600; s++) {
      const a = s * 0.31, r = 1.1 * s ** 0.85;
      const x = cx + Math.cos(a) * r * 2.1 - tw / 2, y = cy + Math.sin(a) * r * 0.78 - th / 2;
      if (x < 0 || y < 0 || x + tw > W || y + th > H) continue;
      if (rects.some((q) => x < q.x + q.w + pad && x + tw + pad > q.x && y < q.y + q.h + pad && y + th + pad > q.y)) continue;
      rects.push({ x, y, w: tw, h: th });
      out.push({ ...w, x, y, sizeCqw, rank: i });
      ok = true;
      break;
    }
    if (!ok) { if (w.seed) continue; return null; }
  }
  return out;
}
function render(placed) {
  const seen = new Set();
  for (const w of placed) {
    seen.add(w.key);
    let n = nodes.get(w.key);
    const fresh = !n;
    if (!n) { n = document.createElement('span'); n.className = 'w-word-i'; n.textContent = w.text; cloudEl.append(n); nodes.set(w.key, n); }
    const tier = w.seed ? 1 : w.rank < 3 ? 0 : w.rank < 10 ? 1 : w.rank % 3 === 0 ? 3 : 2;
    n.classList.toggle('seed', w.seed);
    n.dataset.tier = tier;
    n.style.setProperty('--x', `${w.x.toFixed(1)}px`);
    n.style.setProperty('--y', `${w.y.toFixed(1)}px`);
    n.style.fontSize = `${w.sizeCqw.toFixed(3)}cqw`;
    if (fresh) {
      n.style.transition = 'none';
      n.classList.add('enter');
      requestAnimationFrame(() => { n.style.transition = ''; });
      n.addEventListener('animationend', () => n.classList.remove('enter'), { once: true });
    }
  }
  for (const [k, n] of nodes) if (!seen.has(k)) { n.style.opacity = '0'; nodes.delete(k); setTimeout(() => n.remove(), 1000); }
}
let spotTimer = 0;
function spotlight(id) {
  const n = nodes.get(id);
  if (!n) return;
  n.classList.add('spot');
  clearTimeout(spotTimer);
  spotTimer = setTimeout(() => n.classList.remove('spot'), 3200);
}
function showLast(pop = false) {
  const w = state.words.filter((x) => !x.hidden).sort((a, b) => (b.at || 0) - (a.at || 0))[0];
  const box = $('#w-last'), t = $('#w-last-t');
  const changedText = t.textContent !== (w?.text || '');
  t.textContent = w?.text || '';
  box.hidden = !w;
  if (pop && w && changedText) { box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); }
}

/* ---------- Sondage : barres, pourcentages, total ---------- */
let pollSig = '';
function renderPoll() {
  const p = state.poll;
  const host = $('#w-poll');
  const foot = $('#w-poll-foot');
  if (!p) { host.innerHTML = '<p class="w-empty">La tablette prépare le sondage.</p>'; foot.textContent = ''; pollSig = ''; return; }
  const total = p.total || p.options.reduce((s, o) => s + (o.count || 0), 0);
  const max = Math.max(1, ...p.options.map((o) => o.count || 0));
  if (pollSig !== p.id + ':' + p.options.length) {
    pollSig = p.id + ':' + p.options.length;
    host.innerHTML = p.options.map((o, i) => `<div class="w-opt" style="--i:${i}" data-id="${o.id}"><div class="w-opt-head"><span class="w-opt-l">${esc(o.label)}</span><span><small class="w-opt-n"></small><b class="w-opt-p">0 %</b></span></div><div class="w-opt-track"><i></i></div></div>`).join('');
    host.dataset.n = p.options.length;
    host.classList.remove('in'); void host.offsetWidth; host.classList.add('in');
  }
  p.options.forEach((o) => {
    const el = host.querySelector(`[data-id="${o.id}"]`);
    if (!el) return;
    const n = o.count || 0, pct = total ? Math.round((n / total) * 100) : 0;
    el.classList.toggle('lead', total > 0 && n === max);
    el.querySelector('.w-opt-p').textContent = `${pct} %`;
    el.querySelector('.w-opt-track i').style.transform = `scaleX(${total ? n / max : 0})`;
    el.querySelector('.w-opt-n').textContent = n ? `${n} vote${n > 1 ? 's' : ''}` : '';
  });
  foot.textContent = total ? `${total} vote${total > 1 ? 's' : ''}${p.voters && p.voters !== total ? ` · ${p.voters} participants` : ''}${p.multiple ? ' · plusieurs réponses possibles' : ''}` : (p.open === false ? 'Vote clos' : 'Flashez le code pour voter');
}

/* ---------- Questions : les plus soutenues en grand ---------- */
function renderQA() {
  const host = $('#w-qa');
  const list = state.questions.filter((q) => !q.hidden).sort((a, b) => (b.pinned - a.pinned) || (a.answered - b.answered) || (b.votes - a.votes) || (b.at - a.at)).slice(0, 6);
  if (!list.length) { host.innerHTML = '<p class="w-empty">Les premières questions s’affichent ici.</p>'; return; }
  const max = Math.max(1, ...list.map((q) => q.votes || 0));
  const seen = new Set(list.map((q) => q.id));
  for (const el of [...host.children]) if (!seen.has(el.dataset.id)) el.remove();
  list.forEach((q, i) => {
    let el = host.querySelector(`[data-id="${q.id}"]`);
    if (!el) { el = document.createElement('article'); el.className = 'w-q enter'; el.dataset.id = q.id; host.append(el); }
    const big = i === 0 && list.length > 1;
    el.className = `w-q ${big ? 'big' : ''} ${q.answered ? 'done' : ''} ${q.pinned ? 'pin' : ''} ${el.classList.contains('enter') ? 'enter' : ''}`;
    el.style.order = i;
    el.innerHTML = `<p>${esc(q.text)}</p><footer><span class="w-q-v ${q.votes ? '' : 'zero'}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>${q.votes || 0}</span>${q.answered ? '<span class="w-q-done">Répondu</span>' : ''}${q.pinned ? '<span class="w-q-done">À l’écran</span>' : ''}<i class="w-q-bar" style="--v:${((q.votes || 0) / max).toFixed(3)}"></i></footer>`;
  });
  host.dataset.n = list.length;
}

/* ---------- Showreel : photos et vidéos du séminaire ---------- */
function reelList() {
  const all = state.wall.reelSet === 'all';
  const photos = PHOTOS.filter((p) => p.w >= 1000 && p.w > p.h && (all || isSem(p))).map((p) => ({ ...p, type: 'photo' }));
  const vids = VIDEOS.filter((v) => all || isSem(v)).map((v) => ({ ...v, type: 'video' }));
  const out = [];
  let vi = 0;
  photos.forEach((p, i) => { if (i % 2 === 0 && vi < vids.length) out.push(vids[vi++]); out.push(p); });
  while (vi < vids.length) out.push(vids[vi++]);
  return out;
}
let REEL = reelList(), reelKey = '';
let reelI = 0, reelTimer = 0, reelOn = false;
function startReel() {
  const host = $('#w-reel');
  const key = state.wall.reelSet || 'seminaire';
  if (key !== reelKey || !host.children.length) {
    reelKey = key; REEL = reelList(); reelI = 0;
    host.innerHTML = REEL.map((p) => p.type === 'video'
      ? `<div class="s v"><video muted playsinline preload="metadata" poster="${poster(p.f)}" src="${video(p.f)}"></video></div>`
      : `<div class="s" style="background-image:url('${photo(p.f)}')"></div>`).join('');
  }
  reelOn = true;
  const show = () => {
    if (!reelOn) return;
    clearTimeout(reelTimer);
    const slides = [...host.children];
    const item = REEL[reelI];
    slides.forEach((el, i) => {
      el.classList.toggle('on', i === reelI);
      const v = el.querySelector('video');
      if (v && i !== reelI) setTimeout(() => { if (!el.classList.contains('on')) v.pause(); }, 1500);
    });
    const cap = $('.w-reel-cap');
    $('#w-reel-k').textContent = `${item.k || (item.type === 'video' ? 'En prestation' : 'Réalisation')} · ${String(reelI + 1).padStart(2, '0')} / ${String(REEL.length).padStart(2, '0')}`;
    $('#w-reel-t').textContent = item.c;
    cap.classList.remove('swap'); void cap.offsetWidth; cap.classList.add('swap');
    const next = () => { reelI = (reelI + 1) % REEL.length; show(); };
    const v = slides[reelI]?.querySelector('video');
    if (v) { v.currentTime = 0; v.play().catch(() => {}); v.onended = next; reelTimer = setTimeout(next, Math.min((item.dur || 20) * 1000, 24000)); }
    else reelTimer = setTimeout(next, 7000);
    const nx = slides[(reelI + 1) % slides.length]?.querySelector('video');
    if (nx && nx.preload !== 'auto') nx.preload = 'auto';
  };
  show();
}
function stopReel() { reelOn = false; clearTimeout(reelTimer); document.querySelectorAll('#w-reel video').forEach((v) => v.pause()); }

/* ---------- MediaScène : la gamme de 60 à 160 m² ---------- */
let msI = 0, msTimer = 0, msBuilt = false;
function startMS() {
  if (!msBuilt) {
    msBuilt = true;
    const card = (m, i) => `<article class="w-ms-card" style="--i:${i}"><header><b>${esc(m.name)}</b><span>${esc(m.label)}</span></header>
      <dl>${m.key.map((k) => `<div><dt>${esc(k.v)}</dt><dd>${esc(k.l)}</dd></div>`).join('')}</dl></article>`;
    $('#w-ms-cards').innerHTML = MEDIASCENE.models.map(card).join('');
    $('#w-ms-ruler').innerHTML = MEDIASCENE.sizes.map((v, i) => `<span style="--i:${i}"><i></i>${v}</span>`).join('') + '<b></b>';
    $('#w-ms-photo').innerHTML = MEDIASCENE.photos.map((p) => `<div class="s" style="background-image:url('${photo(p.f)}')"></div>`).join('');
  }
  const slides = [...$('#w-ms-photo').children];
  const set = () => { slides.forEach((s, i) => s.classList.toggle('on', i === msI % slides.length)); $('#w-ms-cap').textContent = MEDIASCENE.photos[msI % slides.length].c; msI++; };
  set();
  clearInterval(msTimer);
  msTimer = setInterval(set, 8000);
}

/* ---------- Message : révélation mot à mot, compte à rebours optionnel ---------- */
let lastMessage = null, countTimer = 0;
function renderMessage(w) {
  const text = w.message || 'Bienvenue sur le stand Médiacom';
  const box = $('#w-message');
  if (text !== lastMessage) {
    lastMessage = text;
    box.style.fontSize = `${Math.max(3.6, Math.min(8.4, 8.4 - (text.length - 18) * 0.085))}cqw`;
    box.innerHTML = text.split(/\s+/).map((wd, i) => `<span class="wd"><span style="--i:${i}">${esc(wd)}</span></span>`).join(' ');
    box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
  }
  const client = state.wall.theme?.client;
  $('#w-msg-k').textContent = client ? client : state.eventName && state.eventName !== 'Salon' ? `Médiacom · ${state.eventName}` : 'Médiacom · Le son, la lumière, l’image';
  clearInterval(countTimer);
  const cd = $('#w-count');
  const to = Number(w.countdownTo) || 0;
  if (to > Date.now() - 60000 && to) {
    cd.hidden = false;
    const total = Math.max(1, to - (Number(w.countdownFrom) || w.updatedAt || Date.now()));
    const tickFn = () => {
      const left = Math.max(0, to - Date.now());
      const m = Math.floor(left / 60000), sec = Math.floor((left % 60000) / 1000);
      $('#w-count-t').textContent = left ? `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : 'Maintenant';
      $('#w-count-bar').style.transform = `scaleX(${(1 - left / total).toFixed(4)})`;
      cd.classList.toggle('now', !left);
      if (!left) clearInterval(countTimer);
    };
    tickFn();
    countTimer = setInterval(tickFn, 250);
  } else cd.hidden = true;
}

/* ---------- Page externe ---------- */
function renderExternal() {
  const url = state.wall.externalUrl || '';
  const f = $('#w-ext');
  $('#w-ext-empty').hidden = !!url;
  if (current === 'external' && url) { if (f.src !== url) f.src = url; }
  else if (f.src) f.removeAttribute('src');
}

/* ---------- Scènes ---------- */
let current = null;
function setScene(scene) {
  if (scene === current) return;
  current = scene;
  wallEl.dataset.scene = scene;
  document.querySelectorAll('.w-scene').forEach((s) => s.classList.toggle('on', s.dataset.scene === scene));
  if (scene === 'reel') startReel(); else stopReel();
  if (scene === 'mediascene') startMS(); else clearInterval(msTimer);
  if (scene === 'cloud') fontReady.then(() => requestAnimationFrame(layout));
  if (scene === 'poll') renderPoll();
  if (scene === 'questions') renderQA();
  renderExternal();
  renderTitle();
  renderJoin();
  $('#w-join').classList.toggle('on', INTERACTIVE.has(scene));
}

function applyWall() {
  const w = state.wall || {};
  applyTheme();
  const lay = w.cloudLayout === 'haut' ? 'haut' : 'centre';
  if (wallEl.dataset.layout !== lay) { wallEl.dataset.layout = lay; if (current === 'cloud') fontReady.then(() => requestAnimationFrame(layout)); }
  setScene(locked || w.scene || 'cloud');
  renderMessage(w);
  renderTitle();
  renderExternal();
  if (current === 'reel' && (w.reelSet || 'seminaire') !== reelKey) startReel();
  const ph = w.photo || 'scene-m-rouge';
  const mb = $('#w-msg-bg');
  if (mb.dataset.f !== ph) { mb.dataset.f = ph; mb.style.backgroundImage = `url('${photo(ph)}')`; }
  const bg = $('#w-photo');
  if (bg.dataset.f !== ph) { bg.dataset.f = ph; bg.classList.remove('on'); setTimeout(() => { bg.style.backgroundImage = `url('${photo(ph)}')`; bg.classList.add('on'); }, 400); }
}

function counts() {
  const words = state.words.reduce((s, w) => s + (w.count || 1), 0);
  const votes = state.poll?.total || 0;
  const qs = state.questions.filter((q) => !q.hidden).length;
  const n = current === 'poll' ? votes : current === 'questions' ? qs : words;
  $('#w-sends').textContent = new Intl.NumberFormat('fr-FR').format(n);
  $('#w-sends-l').textContent = current === 'poll' ? (n > 1 ? 'votes' : 'vote') : current === 'questions' ? (n > 1 ? 'questions' : 'question') : (n > 1 ? 'mots envoyés' : 'mot envoyé');
}

function applyWords() {
  showLast();
  counts();
  if (current === 'cloud') fontReady.then(layout);
}

// Dernier état connu : à la relance de l'ordinateur du mur, l'écran repart sur la bonne scène avant même le réseau
let cacheTimer = 0;
function remember() {
  if (preview) return;
  clearTimeout(cacheTimer);
  cacheTimer = setTimeout(() => { try { localStorage.setItem('mc_ecran_last', JSON.stringify({ wall: state.wall, words: state.words, poll: state.poll, questions: state.questions, eventName: state.eventName, book: state.book })); } catch { /* stockage plein ou privé */ } }, 1500);
}
function onData(d) {
  if (d.eventName) state.eventName = d.eventName;
  if (d.book) { state.book = d.book; setBookOverrides(d.book); if (current === 'reel') { reelKey = ''; startReel(); } }
  if (d.wall) { state.wall = d.wall; applyWall(); }
  remember();
  if (d.words) { state.words = d.words.filter((w) => !w.hidden); applyWords(); }
  if (d.poll !== undefined) { state.poll = d.poll; if (current === 'poll') { renderPoll(); renderTitle(); } counts(); }
  if (d.questions) { state.questions = d.questions; if (current === 'questions') renderQA(); counts(); }
  if (d.word && !d.word.hidden) {
    const i = state.words.findIndex((w) => w.id === d.word.id);
    if (i >= 0) state.words[i] = d.word; else state.words.push(d.word);
    applyWords();
    showLast(true);
    fontReady.then(() => setTimeout(() => spotlight(d.word.id), 60));
  }
}

if (preview) {
  addEventListener('message', (e) => { if (e.origin === location.origin && e.data?.type === 'mc-wall') onData(e.data); });
  parent.postMessage({ type: 'mc-wall-ready' }, location.origin);
} else {
  try { const c = JSON.parse(localStorage.getItem('mc_ecran_last') || 'null'); if (c?.wall) onData(c); } catch { /* pas de cache */ }
  wallFeed(onData);

  // L'ordinateur du mur ne doit jamais s'endormir ni disparaître sans que la tablette le sache
  let lock = null;
  const keepAwake = async () => { try { lock = await navigator.wakeLock?.request('screen'); } catch { /* refusé hors HTTPS ou onglet caché */ } };
  keepAwake();
  document.addEventListener('visibilitychange', () => { if (!document.hidden && (!lock || lock.released)) keepAwake(); });
  if (location.protocol.startsWith('http')) {
    let sid = '';
    try { sid = localStorage.getItem('mc_screen_id') || ''; if (!sid) { sid = 'scr-' + Math.random().toString(36).slice(2, 8); localStorage.setItem('mc_screen_id', sid); } } catch { sid = 'scr-' + Math.random().toString(36).slice(2, 8); }
    const ping = () => fetch('/api/screen/ping', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id: sid, scene: current || state.wall.scene || '', locked: locked || '', w: innerWidth, h: innerHeight, fs: !!document.fullscreenElement }), keepalive: true }).catch(() => {});
    setTimeout(ping, 400); // après la première scène
    setInterval(ping, 5000);
    document.addEventListener('fullscreenchange', ping);
  }
}

new ResizeObserver(() => current === 'cloud' && layout()).observe(wallEl);
document.fonts?.addEventListener?.('loadingdone', () => current === 'cloud' && layout());
loadInfo();
setInterval(loadInfo, 60000);
applyWall();
fontReady.then(layout);

// Plein écran au double-clic (ordinateur du mur) ; « f » au clavier
if (!preview) {
  const toggleFS = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
  wallEl.addEventListener('dblclick', toggleFS);
  addEventListener('keydown', (e) => { if (e.key === 'f' || e.key === 'F') toggleFS(); });
}
