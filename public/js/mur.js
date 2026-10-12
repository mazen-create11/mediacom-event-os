// Mur LED : nuage de mots sans chevauchement, showreel, MediaScène, message, noir.
// Lit le flux public du hub (aucune donnée personnelle), ou le stockage local hors hub.
import { wallFeed } from './hub.js';
import { PHOTOS, VIDEOS, MEDIASCENE, COMPANY, photo, video, poster } from './data.js';
import { LOGO_M, qrSVG, esc, wifiPayload } from './ui.js';

const preview = new URLSearchParams(location.search).has('preview');
if (preview) document.body.classList.add('preview');

const $ = (s) => document.querySelector(s);
const wallEl = $('#wall');
const cloudEl = $('#w-cloud');
$('#w-m').innerHTML = LOGO_M;

const SEEDS = ['Séminaire', 'Convention', 'Plénière', 'Incentive', 'Soirée', 'Congrès', 'Son', 'Lumière', 'Image', 'Émotion', 'Marseille', 'Live'];
const state = { wall: { scene: 'cloud', accept: true }, words: [], info: null, spotId: null };

/* ---------- Bandeau ---------- */
const tick = [COMPANY.baseline, `Depuis ${COMPANY.since}`, 'Marseille', 'Sonorisation', 'Lumière', 'Écrans LED', 'Captation & streaming', 'Scène mobile MediaScène', 'Mapping laser'];
$('#w-track').innerHTML = [...tick, ...tick].map((t) => `<span>${esc(t)}</span><i>◆</i>`).join('');

/* ---------- QR de participation ---------- */
async function loadInfo() {
  try {
    state.info = await (await fetch('/api/info', { cache: 'no-store' })).json();
  } catch {
    state.info = { base: location.origin };
  }
  renderJoin();
}

function renderJoin() {
  const base = state.info?.base || location.origin;
  const url = `${base}/nuage`;
  const wifi = state.info?.wifi;
  const steps = [];
  if (wifi?.ssid) {
    steps.push(`<div class="w-step"><b>1 · Wi-Fi</b><div class="qr">${qrSVG(wifiPayload(wifi.ssid, wifi.pass), { ecc: 'M', margin: 1 })}</div><span>Rejoignez le réseau du stand</span><small>${esc(wifi.ssid)}</small></div>`);
  }
  steps.push(`<div class="w-step"><b>${wifi?.ssid ? '2 · ' : ''}Votre mot</b><div class="qr">${qrSVG(url, { ecc: 'M', margin: 1 })}</div><span>Flashez, écrivez, regardez-le apparaître</span><small>${esc(url.replace(/^https?:\/\//, ''))}</small></div>`);
  $('#w-steps').innerHTML = steps.join('');
  $('#w-steps').classList.toggle('two', steps.length > 1);
  $('#w-last').hidden = steps.length > 1 || !$('#w-last-t').textContent;
  $('#w-mini-join').innerHTML = `<div class="qr">${qrSVG(url, { ecc: 'M', margin: 1 })}</div><p>Envoyez votre mot sur le mur</p>`;
}

/* ---------- Nuage : placement en spirale, sans collision ---------- */
const measureCtx = document.createElement('canvas').getContext('2d');
let fontReady = document.fonts?.load ? document.fonts.load('500 40px Jost').catch(() => {}) : Promise.resolve();
const nodes = new Map(); // key -> element

function wordsForCloud() {
  const real = state.words.filter((w) => !w.hidden);
  const list = real.map((w) => ({ key: w.id, text: w.text, count: w.count || 1, at: w.at || 0, seed: false }));
  if (real.length < 10) {
    const have = new Set(real.map((w) => w.text.toLowerCase()));
    SEEDS.filter((s) => !have.has(s.toLowerCase())).slice(0, 12 - real.length).forEach((s, i) => list.push({ key: 'seed-' + s, text: s, count: 1, at: -i, seed: true }));
  }
  // Les plus cités d'abord, puis les plus récents : au plus 60 mots à l'écran
  list.sort((a, b) => (a.seed - b.seed) || (b.count - a.count) || (a.at - b.at));
  return list.slice(0, 48);
}

function layout() {
  const W = cloudEl.clientWidth, H = cloudEl.clientHeight;
  if (!W || !H) return;
  const cqw = wallEl.clientWidth / 100;
  const list = wordsForCloud();
  const maxC = Math.max(1, ...list.map((w) => w.count));
  let scale = 1;
  let placed = null;
  for (let attempt = 0; attempt < 6 && !placed; attempt++, scale *= 0.88) placed = place(list, W, H, cqw, maxC, scale);
  if (!placed) placed = place(list.slice(0, 30), W, H, cqw, maxC, scale);
  render(placed || [], cqw);
}

function place(list, W, H, cqw, maxC, scale) {
  const rects = [];
  const out = [];
  const cx = W / 2, cy = H / 2;
  for (let i = 0; i < list.length; i++) {
    const w = list[i];
    const t = Math.sqrt((w.count - 1) / Math.max(1, maxC - 1));
    const sizeCqw = (w.seed ? 2.6 : 2.9 + t * 5.4) * scale * (i === 0 && !w.seed ? 1.08 : 1);
    const px = sizeCqw * cqw;
    measureCtx.font = `500 ${px}px Jost, sans-serif`;
    const tw = measureCtx.measureText(w.text).width;
    const th = px * 0.92;
    const pad = px * 0.18;
    let ok = false;
    for (let s = 0; s < 1400; s++) {
      const a = s * 0.31;
      const r = 1.1 * s ** 0.85;
      const x = cx + Math.cos(a) * r * 1.6 - tw / 2;
      const y = cy + Math.sin(a) * r * 0.82 - th / 2;
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

const COLORS = ['#ffffff', '#cfe3ff', '#69adff', '#3192ff'];
function render(placed, cqw) {
  const seen = new Set();
  for (const w of placed) {
    seen.add(w.key);
    let n = nodes.get(w.key);
    const fresh = !n;
    if (!n) {
      n = document.createElement('span');
      n.className = 'w-word-i';
      n.textContent = w.text;
      cloudEl.append(n);
      nodes.set(w.key, n);
    }
    const tier = w.seed ? 1 : w.rank < 3 ? 0 : w.rank < 10 ? 1 : w.rank % 3 === 0 ? 3 : 2;
    n.classList.toggle('seed', w.seed);
    n.style.setProperty('--x', `${w.x.toFixed(1)}px`);
    n.style.setProperty('--y', `${w.y.toFixed(1)}px`);
    n.style.setProperty('--c', COLORS[tier]);
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

// Projecteur sur le dernier mot reçu
let spotTimer = 0;
function spotlight(id) {
  const n = nodes.get(id);
  if (!n) return;
  n.classList.add('spot');
  let beam = cloudEl.querySelector('.w-spot');
  if (!beam) { beam = document.createElement('i'); beam.className = 'w-spot'; cloudEl.prepend(beam); }
  const x = parseFloat(n.style.getPropertyValue('--x')) + n.offsetWidth / 2;
  const y = parseFloat(n.style.getPropertyValue('--y')) + n.offsetHeight;
  const top = -cloudEl.offsetTop;
  beam.style.left = `${x}px`;
  beam.style.top = `${top}px`;
  beam.style.height = `${y - top}px`;
  beam.style.marginLeft = `-${beam.offsetWidth / 2}px`;
  beam.classList.add('on');
  clearTimeout(spotTimer);
  spotTimer = setTimeout(() => { n.classList.remove('spot'); beam.classList.remove('on'); }, 3200);
}

/* ---------- Showreel : vidéos réelles intercalées avec les photos ---------- */
const REEL = (() => {
  const photos = PHOTOS.filter((p) => p.w >= 1000 && p.w > p.h).map((p) => ({ ...p, type: 'photo' }));
  const vids = VIDEOS.map((v) => ({ ...v, type: 'video' }));
  if (!vids.length) return photos;
  const out = [];
  let vi = 0;
  photos.forEach((p, i) => { if (i % 2 === 0 && vi < vids.length) out.push(vids[vi++]); out.push(p); });
  while (vi < vids.length) out.push(vids[vi++]);
  return out;
})();
let reelI = 0, reelTimer = 0, reelOn = false;
function startReel() {
  const host = $('#w-reel');
  if (!host.children.length) {
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
    const v = slides[reelI].querySelector('video');
    if (v) {
      v.currentTime = 0;
      v.play().catch(() => {});
      v.onended = next;
      reelTimer = setTimeout(next, Math.min((item.dur || 20) * 1000, 24000)); // garde-fou
    } else {
      reelTimer = setTimeout(next, 7000);
    }
    // Préchargement de l'élément suivant
    const nx = slides[(reelI + 1) % slides.length]?.querySelector('video');
    if (nx && nx.preload !== 'auto') nx.preload = 'auto';
  };
  show();
}
function stopReel() {
  reelOn = false;
  clearTimeout(reelTimer);
  document.querySelectorAll('#w-reel video').forEach((v) => v.pause());
}

/* ---------- MediaScène : la gamme de 60 à 120 m² ---------- */
let msI = 0, msTimer = 0, msBuilt = false;
function startMS() {
  if (!msBuilt) {
    msBuilt = true;
    const [m60, m120] = MEDIASCENE.models;
    const card = (m, i) => `<article class="w-ms-card" style="--i:${i}"><header><b>${esc(m.name)}</b><span>${esc(m.label)}</span></header>
      <dl>${m.key.map((k) => `<div><dt>${esc(k.v)}</dt><dd>${esc(k.l)}</dd></div>`).join('')}</dl></article>`;
    $('#w-ms-cards').innerHTML = card(m60, 0) + card(m120, 1);
    $('#w-ms-ruler').innerHTML = [60, 80, 100, 120].map((v, i) => `<span style="--i:${i}"><i></i>${v}</span>`).join('') + '<b></b>';
    $('#w-ms-photo').innerHTML = MEDIASCENE.photos.map((p) => `<div class="s" style="background-image:url('${photo(p.f)}')"></div>`).join('');
  }
  const slides = [...$('#w-ms-photo').children];
  const set = () => {
    slides.forEach((s, i) => s.classList.toggle('on', i === msI % slides.length));
    $('#w-ms-cap').textContent = MEDIASCENE.photos[msI % slides.length].c;
    msI++;
  };
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
    // Taille ajustée à la longueur : un message court occupe l'écran, un long reste lisible
    const len = text.length;
    box.style.fontSize = `${Math.max(3.6, Math.min(8.4, 8.4 - (len - 18) * 0.085))}cqw`;
    box.innerHTML = text.split(/\s+/).map((wd, i) => `<span class="wd"><span style="--i:${i}">${esc(wd)}</span></span>`).join(' ');
    box.classList.remove('in'); void box.offsetWidth; box.classList.add('in');
  }
  $('#w-msg-k').textContent = state.eventName && state.eventName !== 'Salon' ? `Médiacom · ${state.eventName}` : 'Médiacom · Le son, la lumière, l’image';
  clearInterval(countTimer);
  const cd = $('#w-count');
  const to = Number(w.countdownTo) || 0;
  if (to > Date.now() - 60000 && to) {
    cd.hidden = false;
    const total = Math.max(1, to - (Number(w.countdownFrom) || w.updatedAt || Date.now()));
    const tick = () => {
      const left = Math.max(0, to - Date.now());
      const m = Math.floor(left / 60000), sec = Math.floor((left % 60000) / 1000);
      $('#w-count-t').textContent = left ? `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}` : 'Maintenant';
      $('#w-count-bar').style.transform = `scaleX(${(1 - left / total).toFixed(4)})`;
      cd.classList.toggle('now', !left);
      if (!left) clearInterval(countTimer);
    };
    tick();
    countTimer = setInterval(tick, 250);
  } else {
    cd.hidden = true;
  }
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
}

function applyWall() {
  const w = state.wall || {};
  setScene(w.scene || 'cloud');
  renderMessage(w);
  const ph0 = w.photo || 'scene-m-rouge';
  const mb = $('#w-msg-bg');
  if (mb.dataset.f !== ph0) { mb.dataset.f = ph0; mb.style.backgroundImage = `url('${photo(ph0)}')`; }
  $('#w-question').textContent = w.question || 'Votre prochain événement, en un mot\u00a0?';
  const bg = $('#w-photo');
  const ph = w.photo || 'scene-m-rouge';
  if (bg.dataset.f !== ph) { bg.dataset.f = ph; bg.classList.remove('on'); setTimeout(() => { bg.style.backgroundImage = `url('${photo(ph)}')`; bg.classList.add('on'); }, 400); }
}

// Encart « dernier mot reçu » : toujours le plus récent des mots visibles, vide si le mur est vidé
function showLast(pop = false) {
  const w = state.words.filter((x) => !x.hidden).sort((a, b) => (b.at || 0) - (a.at || 0))[0];
  const box = $('#w-last');
  const t = $('#w-last-t');
  const changedText = t.textContent !== (w?.text || '');
  t.textContent = w?.text || '';
  box.hidden = !w || !!$('#w-steps.two');
  if (pop && w && changedText) { box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); }
}

function applyWords() {
  showLast();
  $('#w-sends').textContent = new Intl.NumberFormat('fr-FR').format(state.words.reduce((s, w) => s + (w.count || 1), 0));
  if (current === 'cloud') fontReady.then(layout);
}

function onData(d) {
  if (d.eventName) state.eventName = d.eventName;
  if (d.wall) { state.wall = d.wall; applyWall(); }
  if (d.words) { state.words = d.words.filter((w) => !w.hidden); applyWords(); }
  if (d.word && !d.word.hidden) {
    const i = state.words.findIndex((w) => w.id === d.word.id);
    if (i >= 0) state.words[i] = d.word; else state.words.push(d.word);
    applyWords();
    showLast(true);
    fontReady.then(() => setTimeout(() => spotlight(d.word.id), 60));
  }
}

// L'aperçu dans la tablette reçoit ses données de l'application (pas de connexion de plus au hub)
if (preview) {
  addEventListener('message', (e) => { if (e.origin === location.origin && e.data?.type === 'mc-wall') onData(e.data); });
  parent.postMessage({ type: 'mc-wall-ready' }, location.origin);
} else {
  wallFeed(onData);
}

new ResizeObserver(() => current === 'cloud' && layout()).observe(wallEl);
// Les largeurs de mots se mesurent avec la vraie police : on replace tout quand elle arrive
document.fonts?.addEventListener?.('loadingdone', () => current === 'cloud' && layout());
loadInfo();
setInterval(loadInfo, 60000);
applyWall();
fontReady.then(layout);

// Plein écran au clic (régie du mur)
if (!preview) wallEl.addEventListener('dblclick', () => document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen?.());
