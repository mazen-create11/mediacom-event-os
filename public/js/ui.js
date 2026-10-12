// Utilitaires d'interface partagés : icônes, échappement, toasts, tiroir, feuille modale,
// rouleau de chiffres, carillon de régie, QR en SVG.
import qrcode from './vendor/qrcode.js';

const P = {
  regie: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><path d="M1 14h6M9 8h6M17 16h6"/>',
  contacts: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  wall: '<rect x="2" y="4" width="20" height="12" rx="1.5"/><path d="M7 20h10M12 16v4"/><path d="M6 8h.01M10 8h.01M14 8h.01M18 8h.01M6 12h.01M10 12h.01M14 12h.01M18 12h.01"/>',
  book: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
  devis: '<rect x="4" y="2" width="16" height="20" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h4"/>',
  scene: '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/>',
  elec: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  pass: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><path d="M14 14h3v3h-3zM20 14v.01M14 20h.01M17 20h4v-3"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.9.4 1.8.7 2.7a2 2 0 0 1-.5 2.1L8 9.8a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.7.7a2 2 0 0 1 1.7 2z"/>',
  mail: '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="m22 7-10 6L2 7"/>',
  send: '<path d="m22 2-7 20-4-9-9-4 20-7z"/><path d="M22 2 11 13"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z"/><circle cx="12" cy="13" r="3.5"/>',
  scan: '<path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2M7 12h10"/>',
  edit: '<path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  trash: '<path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M9.9 4.2A10.4 10.4 0 0 1 12 4c6.5 0 10 8 10 8a17.6 17.6 0 0 1-2.2 3.2M6.6 6.6A17.4 17.4 0 0 0 2 12s3.5 8 10 8a9.7 9.7 0 0 0 5.4-1.6M2 2l20 20"/><path d="M14.1 14.1a3 3 0 1 1-4.2-4.2"/>',
  play: '<path d="M6 4v16l14-8z"/>',
  pause: '<path d="M7 4h3v16H7zM14 4h3v16h-3z"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  expand: '<path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  wifi: '<path d="M5 12.6a10 10 0 0 1 14 0M8.5 16.1a5 5 0 0 1 7 0M2 8.8a15 15 0 0 1 20 0M12 20h.01"/>',
  alert: '<path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
  cloud: '<path d="M4 7h10M4 12h16M4 17h7"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  blackout: '<circle cx="12" cy="12" r="9"/><path d="m5.6 5.6 12.8 12.8"/>',
  users: '<circle cx="9" cy="8" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h2a6 6 0 0 1 6 6v1M16 4a4 4 0 0 1 0 8M22 21v-1a6 6 0 0 0-4-5.6"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  print: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.2-6.2 3.2L7 14.2 2 9.3l6.9-1z"/>',
  pin: '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="3"/>',
};
export const icon = (name, cls = '') => `<svg viewBox="0 0 24 24" class="${cls}" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${P[name] || ''}</svg>`;

export const LOGO_M = '<svg viewBox="0 0 256 242" aria-hidden="true"><path fill="currentColor" d="M0 0L128.6 134L256 0V110.4L130.6 241L0 110.1Z M0 152.4V242H80.3Z M256 152.5V242H175.9Z"/></svg>';

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (m) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]));
export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ago(ts, now = Date.now()) {
  const s = Math.max(0, Math.round((now - ts) / 1000));
  if (s < 45) return 'à l’instant';
  const m = Math.round(s / 60);
  if (m < 60) return `il y a ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `il y a ${h} h${m % 60 ? ' ' + String(m % 60).padStart(2, '0') : ''}`;
  return new Date(ts).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
}
export const hhmm = (ts) => new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
export const fmtEUR = (n) => new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n) + ' €';
export const fmtN = (n) => new Intl.NumberFormat('fr-FR').format(n);

/* ---------- Rouleau de chiffres ---------- */
export function odometer(el, value) {
  const str = String(value);
  if (el.dataset.v === str) return;
  const digits = [...str];
  if (el.children.length !== digits.length || !el.classList.contains('odo')) {
    el.classList.add('odo');
    el.innerHTML = digits.map(() => `<span class="d">${[...'0123456789'].map((n) => `<i>${n}</i>`).join('')}</span>`).join('');
    el.setAttribute('aria-label', str);
  }
  el.dataset.v = str;
  el.setAttribute('aria-label', str);
  digits.forEach((d, i) => {
    const col = el.children[i];
    const n = /\d/.test(d) ? Number(d) : 0;
    col.style.transform = `translateY(-${n}em)`;
  });
}

/* ---------- Toasts ---------- */
export function toast({ title, text = '', tone = 'blue', timeout = 3600, actions = [], cls = '' }) {
  const host = $('#toasts');
  if (!host) return;
  const el = document.createElement('div');
  el.className = `toast ${cls}`;
  el.setAttribute('role', 'status');
  el.innerHTML = `<span class="led" data-s="${tone}"></span><div><b>${esc(title)}</b>${text ? `<small>${text}</small>` : ''}${actions.length ? `<div class="actions">${actions.map((a, i) => `<button class="btn btn-sm ${i ? 'btn-quiet' : 'btn-primary'}" data-i="${i}">${esc(a.label)}</button>`).join('')}</div>` : ''}</div>`;
  const close = () => { el.classList.add('out'); setTimeout(() => el.remove(), 200); };
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-i]');
    if (b) actions[b.dataset.i].run?.();
    close();
  });
  host.prepend(el);
  while (host.children.length > 4) host.lastElementChild.remove();
  if (timeout) setTimeout(close, timeout);
  return close;
}

/* ---------- Tiroir latéral ---------- */
let drawerCleanup = null;
let drawerGuard = null; // renvoie true si le tiroir peut se fermer sans perte

// Ne remplace jamais une saisie en cours : renvoie false et prévient
export function openDrawer(html, { onMount, label = 'Fiche', kind = '', lead = '', guard = null } = {}) {
  const d = $('#drawer');
  const s = $('#scrim');
  if (drawerOpen() && drawerGuard && !drawerGuard()) {
    toast({ title: 'Saisie en cours', text: 'Enregistrez ou annulez le contact en cours d’abord.', tone: 'warm' });
    return false;
  }
  drawerCleanup?.();
  drawerCleanup = null;
  drawerGuard = guard;
  d.dataset.kind = kind;
  d.dataset.lead = lead;
  d.innerHTML = html;
  d.setAttribute('aria-label', label);
  d.classList.remove('is-closing');
  d.hidden = false;
  requestAnimationFrame(() => { d.classList.add('is-open'); s.classList.add('is-open'); });
  d.querySelector('[data-close]')?.focus({ preventScroll: true });
  drawerCleanup = onMount?.(d) || null;
  return true;
}
export async function closeDrawer({ force = false } = {}) {
  const d = $('#drawer');
  if (!d.classList.contains('is-open')) return true;
  if (!force && drawerGuard && !drawerGuard()) {
    const ok = await confirmSheet({ title: 'Abandonner ce contact ?', text: 'Les informations déjà saisies seront perdues.', ok: 'Abandonner', danger: true });
    if (!ok) return false;
  }
  drawerGuard = null;
  d.dataset.kind = '';
  d.dataset.lead = '';
  d.classList.add('is-closing');
  d.classList.remove('is-open');
  $('#scrim').classList.remove('is-open');
  drawerCleanup?.();
  drawerCleanup = null;
  setTimeout(() => { if (!d.classList.contains('is-open')) d.hidden = true; }, 260);
  return true;
}
export const drawerOpen = () => $('#drawer')?.classList.contains('is-open');

/* ---------- Feuille modale (dialog natif) ---------- */
export function sheet(html, { onMount } = {}) {
  const dlg = $('#sheet');
  dlg.innerHTML = html;
  if (!dlg.open) dlg.showModal();
  dlg.onclick = (e) => { if (e.target === dlg || e.target.closest('[data-close]')) dlg.close(); };
  onMount?.(dlg);
  return dlg;
}
export const closeSheet = () => $('#sheet')?.open && $('#sheet').close();

/* Confirmation sans boîte native (les alert/confirm bloquent l'iPad en salon) */
export function confirmSheet({ title, text, ok = 'Confirmer', danger = false }) {
  return new Promise((resolve) => {
    const dlg = sheet(`<div class="sheet-head"><span class="eyebrow">Confirmation</span><h2>${esc(title)}</h2></div>
      <div class="sheet-body"><p class="muted" style="margin:0">${esc(text)}</p></div>
      <div class="sheet-foot"><button class="btn btn-quiet" data-close>Annuler</button><button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-ok>${esc(ok)}</button></div>`);
    let done = false;
    dlg.querySelector('[data-ok]').onclick = () => { done = true; dlg.close(); resolve(true); };
    dlg.addEventListener('close', () => !done && resolve(false), { once: true });
  });
}

/* ---------- Carillon de régie (Web Audio, aucun fichier) ---------- */
let actx = null;
export function unlockAudio() {
  if (actx) return;
  try { actx = new (window.AudioContext || window.webkitAudioContext)(); } catch { /* pas d'audio */ }
}
export function chime(kind = 'transfer') {
  if (!actx) return;
  if (actx.state === 'suspended') actx.resume();
  const t = actx.currentTime;
  const notes = kind === 'transfer' ? [659.25, 987.77] : kind === 'alert' ? [880, 880, 880] : [783.99];
  notes.forEach((f, i) => {
    const o = actx.createOscillator();
    const g = actx.createGain();
    o.type = 'sine';
    o.frequency.value = f;
    const s = t + i * 0.14;
    g.gain.setValueAtTime(0.0001, s);
    g.gain.exponentialRampToValueAtTime(0.22, s + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, s + 0.55);
    o.connect(g).connect(actx.destination);
    o.start(s);
    o.stop(s + 0.6);
  });
}

/* ---------- QR en SVG (net sur mur LED et à l'impression) ---------- */
export function qrSVG(text, { ecc = 'M', margin = 2, dark = '#04080f' } = {}) {
  const qr = qrcode(0, ecc);
  qr.addData(unescape(encodeURIComponent(text)), 'Byte');
  qr.make();
  const n = qr.getModuleCount();
  const size = n + margin * 2;
  let d = '';
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += `M${c + margin} ${r + margin}h1v1h-1z`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges"><rect width="${size}" height="${size}" fill="#fff"/><path fill="${dark}" d="${d}"/></svg>`;
}

// Format standard des QR Wi-Fi : caractères spéciaux échappés, réseau ouvert sans mot de passe
export function wifiPayload(ssid, pass) {
  const e = (v) => String(v ?? '').replace(/([\\;,:"])/g, '\\$1');
  return pass ? `WIFI:T:WPA;S:${e(ssid)};P:${e(pass)};;` : `WIFI:T:nopass;S:${e(ssid)};;`;
}

export function download(name, content, type) {
  const url = URL.createObjectURL(content instanceof Blob ? content : new Blob([content], { type }));
  const a = Object.assign(document.createElement('a'), { href: url, download: name });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}

export function vcard({ name, org, title, tel, tel2, email, url, adr, note }) {
  const [last, first] = name.includes(' ') ? [name.split(' ').slice(1).join(' '), name.split(' ')[0]] : [name, ''];
  return ['BEGIN:VCARD', 'VERSION:3.0', `N:${last};${first};;;`, `FN:${name}`, org && `ORG:${org}`, title && `TITLE:${title}`,
    tel && `TEL;TYPE=WORK,VOICE:${tel}`, tel2 && `TEL;TYPE=WORK:${tel2}`, email && `EMAIL;TYPE=INTERNET,PREF:${email}`,
    url && `URL:${url}`, adr && `ADR;TYPE=WORK:;;${adr}`, note && `NOTE:${note}`, 'END:VCARD'].filter(Boolean).join('\r\n');
}
