import { createHub } from './hub.js';
import { OPERATORS, opById, initial } from './data.js';
import { icon, LOGO_M, esc, $, $$, toast, sheet, closeSheet, closeDrawer, drawerOpen, chime, unlockAudio } from './ui.js';
import regie from './views/regie.js';
import contacts from './views/contacts.js';
import mur from './views/mur.js';
import book from './views/book.js';
import devis from './views/devis.js';
import scene from './views/scene.js';
import elec from './views/elec.js';
import pass from './views/pass.js';
import { openCapture } from './views/capture.js';
import { present } from './views/book.js';
import { initAttract } from './attract.js';

const VIEWS = [regie, contacts, mur, book, devis, scene, elec, pass];

const ctx = {
  me: () => opById(localStorage.getItem('mc_op') || ''),
  hasMe: () => !!OPERATORS.find((o) => o.id === localStorage.getItem('mc_op')),
  go,
  newLead: (prefill) => openCapture(ctx, prefill),
  openLead: (id) => { go('contacts'); contacts.select?.(id); },
};
const hub = createHub({ kind: 'tablet', operator: () => localStorage.getItem('mc_op') || '' });
ctx.hub = hub;

/* ---------- Rail de touches ---------- */
$('.rail-logo').innerHTML = LOGO_M;
$('#rail-keys').innerHTML = VIEWS.map((v, i) => `<a class="key" href="#${v.id}" data-view="${v.id}" aria-label="${esc(v.title)}">${icon(v.icon)}<span>${esc(v.short || v.title)}</span>${v.id === 'contacts' ? '<b class="badge" id="badge-contacts" hidden></b>' : ''}</a>`).join('');

/* ---------- Montage paresseux des vues ---------- */
const mounted = new Set();
let current = null;

function go(id, { instant = false } = {}) {
  const view = VIEWS.find((v) => v.id === id) || VIEWS[0];
  if (location.hash.slice(1) !== view.id) history.replaceState(null, '', '#' + view.id);
  if (current === view) return;
  current?.leave?.();
  $$('.view').forEach((s) => s.classList.remove('is-active'));
  const el = $(`#v-${view.id}`);
  if (!mounted.has(view.id)) {
    view.mount(el, ctx);
    mounted.add(view.id);
    el.querySelector('.rack, .stagger-root')?.classList.add('stagger');
  }
  document.body.classList.toggle('no-anim', instant);
  el.classList.add('is-active');
  current = view;
  view.enter?.();
  $$('.key[data-view]').forEach((k) => (k.dataset.view === view.id ? k.setAttribute('aria-current', 'page') : k.removeAttribute('aria-current')));
  $('#view-idx').textContent = String(VIEWS.indexOf(view) + 1).padStart(2, '0');
  $('#view-title').textContent = view.title;
  $('#view-sub').textContent = view.sub || '';
  document.title = `${view.title} · Médiacom`;
  $('#stage').scrollTop = 0;
  $('#go').classList.toggle('is-away', !!view.hideGo);
  // Le bouton se fait discret là où l'on travaille autre chose que la saisie
  $('#go').classList.toggle('is-compact', !['regie', 'contacts'].includes(view.id));
}

window.addEventListener('hashchange', () => go(location.hash.slice(1)));

/* ---------- Opérateur de la tablette ---------- */
function renderOperator() {
  const me = ctx.me();
  $('#op-btn').innerHTML = `<span class="avatar me">${initial(me.name)}</span><span class="who"><b>${esc(me.name)}</b><small>${esc(me.role)}</small></span>`;
}

function pickOperator({ first = false } = {}) {
  const cur = localStorage.getItem('mc_op');
  const dlg = sheet(`<div class="sheet-head"><span class="eyebrow">${first ? 'Mise en service' : 'Opérateur'}</span><h2>Qui tient cette tablette&nbsp;?</h2>
      <p class="lede">Les contacts saisis ici sont signés à ce nom, et les transferts de vos collègues arrivent sur cet écran.</p></div>
    <div class="sheet-body"><div class="strips" style="grid-template-columns:repeat(2,minmax(0,1fr))">
      ${OPERATORS.map((o) => `<button class="strip ${o.id === cur ? 'me' : ''}" data-op="${o.id}" style="padding:18px 10px">
        <span class="avatar ${o.id === cur ? 'me' : ''}" style="width:52px;height:52px;font-size:20px">${initial(o.name)}</span>
        <span class="scribble">${esc(o.name)}</span><span class="role">${esc(o.role)}</span></button>`).join('')}
    </div></div>`, {
    onMount: (d) => d.querySelectorAll('[data-op]').forEach((b) => b.addEventListener('click', () => {
      localStorage.setItem('mc_op', b.dataset.op);
      closeSheet();
      renderOperator();
      hub.connect();
      refreshAll('operator');
      toast({ title: `Session ${opById(b.dataset.op).name}`, text: 'Vos contacts et transferts sont rattachés à ce nom.', tone: 'blue' });
    })),
  });
  // Choix obligatoire au premier lancement : ni clic hors de la feuille, ni Échap
  if (first) dlg.onclick = null;
  dlg.oncancel = first ? (e) => e.preventDefault() : null;
}
$('#op-btn').addEventListener('click', () => pickOperator());

/* ---------- Équipe connectée & état du hub ---------- */
function renderCrew() {
  const online = new Set(hub.state.presence.map((p) => p.op).filter(Boolean));
  const me = ctx.me().id;
  if (hub.state.mode === 'hub' && hub.state.status === 'online') online.add(me);
  $('#crew').innerHTML = OPERATORS.map((o) => `<span class="avatar ${o.id === me ? 'me' : ''}" title="${esc(o.name)} · ${online.has(o.id) ? 'connecté' : 'hors ligne'}">${initial(o.name)}<span class="led ${online.has(o.id) ? 'on' : ''}"></span></span>`).join('');
}

const STATUS = {
  online: { s: 'live', t: 'En ligne' },
  connecting: { s: 'warm', t: 'Connexion' },
  offline: { s: 'off', t: 'Hors ligne' },
  local: { s: 'cold', t: 'Local' },
  unpaired: { s: 'off', t: 'À appairer' },
};
function renderStatus() {
  const st = STATUS[hub.state.status] || STATUS.offline;
  const q = hub.outboxSize();
  $('#hub-led').innerHTML = `<span class="led" data-s="${st.s}"></span><span>${st.t}${q ? `<br>${q} en attente` : ''}</span>`;
  $('#hub-led').title = {
    online: 'Synchronisé avec le hub du stand',
    connecting: 'Connexion au hub du stand…',
    offline: 'Hub injoignable : les saisies sont gardées et partiront au retour du réseau',
    local: 'Mode local : données gardées sur cet appareil',
    unpaired: 'Tablette non appairée : scannez le QR de la page /setup',
  }[hub.state.status];
}

let lastStatus = null;
hub.on('status', (s) => {
  renderStatus();
  renderCrew();
  if (s === 'unpaired' && lastStatus !== s) toast({ title: 'Tablette non appairée', text: 'Scannez le QR « Équipe » affiché sur le Mac du stand (page /setup).', tone: 'off', timeout: 9000 });
  if (s === 'online' && lastStatus === 'offline') toast({ title: 'Synchronisation rétablie', text: 'Les saisies en attente sont envoyées.', tone: 'live' });
  lastStatus = s;
});
hub.on('queued', renderStatus);
hub.on('presence', () => { renderCrew(); refreshAll('presence'); });

/* ---------- Mise à jour des vues ---------- */
function refreshAll(reason) {
  for (const v of VIEWS) if (mounted.has(v.id)) v.update?.(reason);
  renderBadge();
  $('#tc-event').textContent = hub.state.settings?.eventName || 'Salon';
}
hub.on('change', (reason) => { refreshAll(reason); if (['hello', 'words', 'wall', 'settings'].includes(reason)) feedPreviews(); });

// Aperçus du mur (iframes) : nourris par l'app, sans flux réseau supplémentaire
const wallData = () => ({ type: 'mc-wall', wall: hub.state.wall, words: hub.state.words.filter((w) => !w.hidden), eventName: hub.state.settings?.eventName });
function feedPreviews(extra) {
  for (const f of document.querySelectorAll('iframe[src^="/mur"]')) f.contentWindow?.postMessage({ ...wallData(), ...extra }, location.origin);
}
addEventListener('message', (e) => {
  if (e.origin === location.origin && e.data?.type === 'mc-wall-ready') e.source?.postMessage(wallData(), location.origin);
});
hub.on('word', (w) => feedPreviews({ word: w }));

function pendingTransfers() {
  const me = ctx.me().id;
  return hub.state.leads.filter((l) => l.transfer && !l.transfer.ack && l.transfer.to === me);
}
function renderBadge() {
  const n = pendingTransfers().length;
  const b = $('#badge-contacts');
  if (!b) return;
  b.hidden = !n;
  b.textContent = n;
}

hub.on('transfer', (t) => {
  if (t.to !== ctx.me().id) return;
  chime('transfer');
  navigator.vibrate?.([30, 60, 30]);
  toast({
    cls: 'transfer', tone: 'blue', timeout: 12000,
    title: `${opById(t.from).name} vous passe un contact`,
    text: `<b style="color:#fff">${esc(t.lead.name || 'Sans nom')}</b>${t.lead.company ? ' · ' + esc(t.lead.company) : ''}${t.note ? `<br>« ${esc(t.note)} »` : ''}`,
    actions: [{ label: 'Ouvrir la fiche', run: () => ctx.openLead(t.lead.id) }, { label: 'Plus tard' }],
  });
});
hub.on('alert', (a) => {
  if (a.to !== 'all' && a.to !== ctx.me().id) return;
  chime('alert');
  toast({ title: `Régie · ${a.from}`, text: esc(a.text), tone: 'hot', timeout: 15000 });
});

/* ---------- Horloge / timecode ---------- */
function tick() {
  const d = new Date(Date.now() + hub.state.serverOffset);
  $('#tc-clock').textContent = d.toLocaleTimeString('fr-FR', { hour12: false });
}
setInterval(tick, 1000);
tick();

/* ---------- Clavier (clavier Bluetooth ou Mac) ---------- */
document.addEventListener('keydown', (e) => {
  const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName) || e.target.isContentEditable;
  if (e.key === 'Escape') { if (drawerOpen()) closeDrawer(); return; }
  if (typing || e.metaKey || e.ctrlKey || e.altKey) return;
  if (e.key === 'n' || e.key === 'N') { e.preventDefault(); ctx.newLead(); }
  const n = Number(e.key);
  if (n >= 1 && n <= VIEWS.length) go(VIEWS[n - 1].id, { instant: true });
});

$('#go').addEventListener('click', () => ctx.newLead());
$('#scrim').addEventListener('click', () => closeDrawer());
document.addEventListener('pointerdown', unlockAudio, { once: true });
document.addEventListener('visibilitychange', () => document.body.classList.toggle('is-hidden', document.hidden));

/* ---------- Démarrage ---------- */
initAttract(present);
renderOperator();
renderStatus();
renderCrew();
hub.connect();
go(location.hash.slice(1) || 'regie', { instant: true });
refreshAll('boot');
if (!ctx.hasMe()) pickOperator({ first: true });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}
