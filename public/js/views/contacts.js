import { OPERATORS, TEMPS, opById, initial, isAgency } from '../data.js';
import { withToken } from '../hub.js';
import { icon, esc, $, $$, ago, hhmm, toast, sheet, closeSheet, openDrawer, closeDrawer, confirmSheet, qrSVG, vcard, download, LOGO_M } from '../ui.js';

let el, ctx;
const ui = { q: '', filter: 'all', op: null, selected: null };
const wide = () => matchMedia('(min-width: 901px)').matches;

const TEMP_S = { hot: 'hot', warm: 'warm', cold: 'cold' };

// Contacts tout juste saisis : l'animation d'arrivée reprend où elle en était si la liste est redessinée
const fresh = new Map();
export function markFresh(id) { fresh.set(id, performance.now()); }
function freshAttr(id) {
  const t = fresh.get(id);
  if (t == null) return '';
  const elapsed = performance.now() - t;
  if (elapsed > 700) { fresh.delete(id); return ''; }
  return ` is-new" style="animation-delay:-${Math.round(elapsed)}ms`;
}

export function leadRow(l, c) {
  const me = c.me().id;
  const op = opById(l.operator);
  const flag = l.transfer && !l.transfer.ack && l.transfer.to === me ? '<span class="flag">Transmis</span>' : '';
  const short = { 'Agence événementielle': 'Agence', 'Agence séminaire / DMC': 'Agence · DMC', 'Lieu / hôtel': 'Lieu' }[l.profile] || l.profile;
  const tags = [short && `<span class="tag ${isAgency(l) ? 'agency' : ''}">${esc(short)}</span>`, l.eventType && `<span class="tag">${esc(l.eventType)}</span>`, ...(l.needs || []).slice(0, 2).map((n) => `<span class="tag blue">${esc(n)}</span>`),
    (l.needs || []).length > 2 && `<span class="tag">+${l.needs.length - 2}</span>`, l.demo && '<span class="tag">démo</span>'].filter(Boolean).join('');
  return `<button class="lead-row ${ui.selected === l.id ? 'is-sel' : ''}${freshAttr(l.id)}" data-lead="${l.id}" aria-label="${esc(l.name || 'Contact')}${l.company ? ', ' + esc(l.company) : ''}">
    <span class="led" data-s="${TEMP_S[l.temperature] || 'cold'}" title="${TEMPS[l.temperature]?.label || ''}"></span>
    <span style="min-width:0"><span class="name">${esc(l.name || 'Sans nom')}</span>
      <span class="co">${esc(l.company || '—')}${l.role ? ` · ${esc(l.role)}` : ''}</span>${tags ? `<span class="tags">${tags}</span>` : ''}</span>
    <span class="meta">${flag || `<span>${ago(l.createdAt)}</span>`}<span class="avatar ${op.id === me ? 'me' : ''}" title="Suivi par ${esc(op.name)}">${initial(op.name)}</span></span>
  </button>`;
}

function filtered() {
  const me = ctx.me().id;
  const q = ui.q.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  return ctx.hub.state.leads.filter((l) => {
    if (ui.filter === 'mine' && l.operator !== me) return false;
    if (ui.filter === 'hot' && l.temperature !== 'hot') return false;
    if (ui.filter === 'agency' && !isAgency(l)) return false;
    if (ui.filter === 'in' && !(l.transfer && l.transfer.to === me)) return false;
    if (ui.op && l.operator !== ui.op) return false;
    if (!q) return true;
    const hay = [l.name, l.company, l.role, l.email, l.phone, l.notes, l.eventType, ...(l.needs || [])].join(' ').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
    return q.split(/\s+/).every((t) => hay.includes(t));
  });
}

function mount(root, c) {
  el = root;
  ctx = c;
  el.innerHTML = `<div class="rack">
    <article class="module span-5 md-5" id="ct-list-mod" style="--i:0">
      <header class="mod-head"><span class="n">01</span><span class="t">Contacts</span><span class="r" id="ct-count"></span></header>
      <div class="mod-body" style="padding-bottom:12px">
        <label class="search"><span class="sr">Rechercher</span>${icon('search')}<input class="input" id="ct-q" type="search" placeholder="Nom, société, besoin…" autocomplete="off" enterkeyhint="search"></label>
        <div class="chips sm mt-2" id="ct-filters" role="group" aria-label="Filtres">
          <button class="chip" data-f="all" aria-pressed="true">Tous</button>
          <button class="chip" data-f="mine" aria-pressed="false">Les miens</button>
          <button class="chip" data-f="hot" aria-pressed="false">Chauds</button>
          <button class="chip" data-f="agency" aria-pressed="false">Agences</button>
          <button class="chip" data-f="in" aria-pressed="false">Reçus</button>
        </div>
        <div id="ct-opfilter"></div>
      </div>
      <div id="ct-list" style="padding:0 10px 12px"></div>
      <footer class="row" style="padding:12px 18px 16px;border-top:1px solid var(--line)">
        <a class="btn btn-quiet btn-sm" id="ct-export" href="${withToken('/api/export.csv')}" download>${icon('download')}Export CSV</a>
        <span class="spacer"></span>
        <button class="btn btn-quiet btn-sm" id="ct-demo-clear" hidden>${icon('trash')}Retirer la démo</button>
      </footer>
    </article>
    <article class="module span-7 md-7 sticky" id="ct-detail-mod" style="--i:1">
      <header class="mod-head"><span class="n">02</span><span class="t">Fiche</span><span class="r" id="ct-detail-meta"></span></header>
      <div id="ct-detail"></div>
    </article>
  </div>`;

  const q = $('#ct-q', el);
  q.addEventListener('input', () => { ui.q = q.value; renderList(); });
  $('#ct-filters', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-f]');
    if (!b) return;
    ui.filter = b.dataset.f;
    $$('[data-f]', el).forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderList();
  });
  $('#ct-opfilter', el).addEventListener('click', (e) => { if (e.target.closest('[data-clear-op]')) { ui.op = null; renderList(); } });
  $('#ct-list', el).addEventListener('click', (e) => { const r = e.target.closest('[data-lead]'); if (r) select(r.dataset.lead); });
  $('#ct-export', el).addEventListener('click', (e) => {
    if (ctx.hub.state.mode !== 'hub' || ctx.hub.state.status !== 'online') { e.preventDefault(); exportLocal(); }
  });
  $('#ct-demo-clear', el).addEventListener('click', async () => {
    if (!(await confirmSheet({ title: 'Retirer les contacts de démo ?', text: 'Seuls les contacts marqués « démo » sont supprimés. Les vrais contacts restent.', ok: 'Retirer', danger: true }))) return;
    for (const l of ctx.hub.state.leads.filter((x) => x.demo)) await ctx.hub.deleteLead(l.id);
    toast({ title: 'Démo retirée', tone: 'live' });
  });
  update();
}

function renderList() {
  const list = filtered();
  const all = ctx.hub.state.leads;
  $('#ct-count', el).textContent = list.length === all.length ? `${all.length}` : `${list.length} / ${all.length}`;
  $('#ct-opfilter', el).innerHTML = ui.op ? `<div class="row mt-2"><span class="tag blue">Suivis par ${esc(opById(ui.op).name)}</span><button class="btn btn-quiet btn-sm" data-clear-op>${icon('x')}Effacer</button></div>` : '';
  $('#ct-demo-clear', el).hidden = !all.some((l) => l.demo);
  $('#ct-list', el).innerHTML = list.length
    ? list.map((l) => leadRow(l, ctx)).join('')
    : `<div class="empty">${LOGO_M}<div>${all.length ? 'Aucun contact ne correspond.' : 'Aucun contact pour l’instant.'}</div></div>`;
  $$('.lead-row', el).forEach((r) => r.classList.toggle('is-sel', r.dataset.lead === ui.selected));
}

function detailHTML(l) {
  const me = ctx.me().id;
  const op = opById(l.operator);
  const by = opById(l.capturedBy || l.operator);
  const tr = l.transfer;
  const mailSubject = encodeURIComponent('Médiacom · suite à notre échange sur le salon');
  const hist = [...(l.history || [])].reverse().map((h) => h.type === 'transfer'
    ? `<li><time>${hhmm(h.at)}</time><b>${esc(opById(h.from).name)}</b> a transmis à <b>${esc(opById(h.to).name)}</b>${h.note ? ` : « ${esc(h.note)} »` : ''}</li>`
    : `<li><time>${hhmm(h.at)}</time>Saisi par <b>${esc(opById(h.by).name)}</b></li>`).join('');
  return `<div class="mod-body">
    ${tr && !tr.ack && tr.to === me ? `<div class="banner" style="background:rgba(49,146,255,.08);border-color:rgba(49,146,255,.4);color:#cfe3ff;margin-bottom:18px">${icon('send')}<div style="flex:1"><b>${esc(opById(tr.from).name)} vous a transmis ce contact</b>${tr.note ? `<br>« ${esc(tr.note)} »` : ''}</div><button class="btn btn-primary btn-sm" data-act="ack">Pris en charge</button></div>` : ''}
    <div class="row" style="align-items:flex-start">
      <div style="min-width:0;flex:1">
        <span class="eyebrow"><span class="led" data-s="${TEMP_S[l.temperature]}" style="display:inline-block;margin-right:8px;vertical-align:-1px"></span>${TEMPS[l.temperature]?.label || ''}${l.demo ? ' · démo' : ''}</span>
        <h2 class="h2 mt-1" style="overflow-wrap:anywhere">${esc(l.name || 'Sans nom')}</h2>
        <p class="lede" style="margin-top:4px">${esc(l.company || 'Société non renseignée')}${l.role ? ` · ${esc(l.role)}` : ''}</p>
      </div>
      <span class="avatar ${op.id === me ? 'me' : ''}" style="width:44px;height:44px;font-size:16px" title="Suivi par ${esc(op.name)}">${initial(op.name)}</span>
    </div>
    <div class="row wrap mt-3">
      ${l.phone ? `<a class="btn btn-quiet btn-sm" href="tel:${esc(l.phone.replace(/\s/g, ''))}">${icon('phone')}Appeler</a>` : ''}
      ${l.email ? `<a class="btn btn-quiet btn-sm" href="mailto:${esc(l.email)}?subject=${mailSubject}">${icon('mail')}E-mail</a>` : ''}
      <button class="btn btn-quiet btn-sm" data-act="transfer">${icon('send')}Transmettre</button>
      <button class="btn btn-quiet btn-sm" data-act="qr">${icon('pass')}QR fiche</button>
    </div>
    <div class="temps mt-3" role="group" aria-label="Potentiel">
      ${Object.entries(TEMPS).map(([k, t]) => `<button class="temp" data-t="${k}" data-act="temp" aria-pressed="${l.temperature === k}"><span class="led" data-s="${k}"></span><b>${t.label}</b></button>`).join('')}
    </div>
    <div class="divider"></div>
    <dl class="dl">
      <dt>Téléphone</dt><dd>${l.phone ? `<a href="tel:${esc(l.phone.replace(/\s/g, ''))}">${esc(l.phone)}</a>` : '<span class="dim">—</span>'}</dd>
      <dt>E-mail</dt><dd>${l.email ? `<a href="mailto:${esc(l.email)}">${esc(l.email)}</a>` : '<span class="dim">—</span>'}</dd>
      <dt>Profil</dt><dd>${esc(l.profile || '—')}${l.volume ? ` <span class="dim">· ${esc(l.volume)}</span>` : ''}</dd>
      <dt>Événement</dt><dd>${esc(l.eventType || '—')}</dd>
      <dt>Période</dt><dd>${l.period ? esc(new Date(l.period + '-01').toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })) : '—'}</dd>
      <dt>Jauge</dt><dd>${esc(l.audience || '—')}${l.audience ? ' personnes' : ''}</dd>
      <dt>Budget</dt><dd>${esc(l.budget || '—')}</dd>
      <dt>Besoins</dt><dd>${(l.needs || []).length ? `<span class="tags" style="display:flex;flex-wrap:wrap;gap:6px">${l.needs.map((n) => `<span class="tag blue">${esc(n)}</span>`).join('')}</span>` : '—'}</dd>
      <dt>Notes</dt><dd style="white-space:pre-wrap">${esc(l.notes || '—')}</dd>
    </dl>
    ${l.cardPhoto ? `<div class="divider"></div><span class="eyebrow">Carte de visite</span><img src="${esc(l.cardPhoto.startsWith('/api/') ? withToken(l.cardPhoto) : l.cardPhoto)}" alt="Carte de visite" class="mt-2" style="border-radius:12px;border:1px solid var(--line-2);max-height:260px;object-fit:contain;background:#000">` : ''}
    <div class="divider"></div>
    <span class="eyebrow">Historique</span>
    <ul class="timeline mt-2" style="margin-bottom:0">${hist || `<li><time>${hhmm(l.createdAt)}</time>Saisi par <b>${esc(by.name)}</b></li>`}</ul>
    <div class="row mt-4">
      <button class="btn btn-quiet btn-sm" data-act="edit">${icon('edit')}Modifier</button>
      <span class="spacer"></span>
      <button class="btn btn-danger btn-sm" data-act="delete">${icon('trash')}Supprimer</button>
    </div>
  </div>`;
}

// La fiche est relue au moment du clic : jamais d'action sur une copie périmée
function bindDetail(host, id) {
  host.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-act]');
    if (!b) return;
    const l = ctx.hub.state.leads.find((x) => x.id === id);
    if (!l) return;
    const act = b.dataset.act;
    if (act === 'temp') ctx.hub.saveLead({ id: l.id, temperature: b.dataset.t });
    if (act === 'ack') { await ctx.hub.ack(l.id); toast({ title: 'Contact pris en charge', tone: 'live' }); }
    if (act === 'transfer') transferSheet(l);
    if (act === 'qr') qrSheet(l);
    if (act === 'edit') { await closeDrawer({ force: true }); ctx.newLead(l); }
    if (act === 'delete') {
      if (!(await confirmSheet({ title: `Supprimer ${l.name || 'ce contact'} ?`, text: 'La fiche disparaît de toutes les tablettes du stand. Cette action est définitive.', ok: 'Supprimer', danger: true }))) return;
      ctx.hub.deleteLead(l.id);
      ui.selected = null;
      closeDrawer({ force: true });
      toast({ title: 'Contact supprimé', tone: 'cold' });
    }
  });
}

function renderDetail() {
  const host = $('#ct-detail', el);
  const l = ctx.hub.state.leads.find((x) => x.id === ui.selected);
  $('#ct-detail-meta', el).textContent = l ? `saisi ${ago(l.createdAt)}` : '';
  if (!l) {
    host.innerHTML = `<div class="empty" style="min-height:360px">${LOGO_M}<div>Sélectionnez un contact pour afficher sa fiche.</div></div>`;
    return;
  }
  const fresh = host.cloneNode(false);
  fresh.innerHTML = detailHTML(l);
  host.replaceWith(fresh);
  bindDetail(fresh, l.id);
}

function select(id) {
  ui.selected = id;
  $$('.lead-row', el).forEach((r) => r.classList.toggle('is-sel', r.dataset.lead === id));
  const l = ctx.hub.state.leads.find((x) => x.id === id);
  if (!l) return;
  if (wide()) { renderDetail(); return; }
  openDrawer(`<div class="drawer-head"><span class="eyebrow">Fiche contact</span><span class="spacer"></span><button class="btn btn-quiet btn-icon btn-sm" data-close aria-label="Fermer">${icon('x')}</button></div>
    <div class="drawer-body" style="padding:0">${detailHTML(l)}</div>`, {
    label: 'Fiche contact', kind: 'lead', lead: id,
    onMount: (d) => { d.querySelector('[data-close]').onclick = () => closeDrawer(); bindDetail(d.querySelector('.drawer-body'), id); },
  });
}

function transferSheet(l) {
  const me = ctx.me().id;
  const others = OPERATORS.filter((o) => o.id !== l.operator);
  let to = others.find((o) => o.id !== me)?.id || others[0]?.id;
  const QUICK = ['Veut un devis', 'Question technique', 'À rappeler cette semaine', 'Grand compte'];
  const dlg = sheet(`<div class="sheet-head"><span class="eyebrow">Transmettre</span><h2>À qui passer ${esc(l.name || 'ce contact')}&nbsp;?</h2></div>
    <div class="sheet-body stack">
      <div class="strips" style="grid-template-columns:repeat(${others.length},minmax(0,1fr))" role="radiogroup">
        ${others.map((o) => `<button class="strip ${o.id === to ? 'me' : ''}" role="radio" aria-checked="${o.id === to}" data-to="${o.id}"><span class="avatar">${initial(o.name)}</span><span class="scribble">${esc(o.name)}</span><span class="role">${esc(o.role)}</span></button>`).join('')}
      </div>
      <div class="field"><label for="tr-note">Note pour le collègue</label><textarea class="input" id="tr-note" rows="3" placeholder="Ce qu’il faut savoir avant de rappeler"></textarea></div>
      <div class="chips sm">${QUICK.map((q) => `<button class="chip" data-q="${esc(q)}" aria-pressed="false">${esc(q)}</button>`).join('')}</div>
    </div>
    <div class="sheet-foot"><button class="btn btn-quiet" data-close>Annuler</button><button class="btn btn-primary" data-go>${icon('send')}Transmettre</button></div>`);
  dlg.querySelectorAll('[data-to]').forEach((b) => b.addEventListener('click', () => {
    to = b.dataset.to;
    dlg.querySelectorAll('[data-to]').forEach((x) => { x.classList.toggle('me', x === b); x.setAttribute('aria-checked', x === b); });
  }));
  const note = dlg.querySelector('#tr-note');
  dlg.querySelectorAll('[data-q]').forEach((b) => b.addEventListener('click', () => {
    const on = b.getAttribute('aria-pressed') !== 'true';
    b.setAttribute('aria-pressed', on);
    const parts = note.value.split(' · ').filter(Boolean).filter((p) => p !== b.dataset.q);
    if (on) parts.push(b.dataset.q);
    note.value = parts.join(' · ');
  }));
  dlg.querySelector('[data-go]').addEventListener('click', async () => {
    await ctx.hub.transfer(l.id, me, to, note.value.trim());
    closeSheet();
    toast({ title: `Transmis à ${opById(to).name}`, text: ctx.hub.state.status === 'online' ? 'Sa tablette sonne maintenant.' : 'Il le recevra dès la reconnexion au hub.', tone: 'blue' });
  });
}

function qrSheet(l) {
  const card = vcard({ name: l.name || 'Contact salon', org: l.company, title: l.role, tel: l.phone, email: l.email,
    note: [l.eventType, (l.needs || []).join(', '), l.notes].filter(Boolean).join(' · ').slice(0, 300) });
  sheet(`<div class="sheet-head"><span class="eyebrow">QR fiche · sans réseau</span><h2>${esc(l.name || 'Contact')}</h2>
      <p class="lede">Scannez avec l’appareil photo d’un iPhone pour ajouter ce contact au répertoire, ou avec le mode « Badge » d’une autre tablette pour le reprendre.</p></div>
    <div class="sheet-body" style="display:grid;place-items:center"><div class="qr" style="width:min(320px,80vw)">${qrSVG(card, { ecc: 'L' })}</div></div>
    <div class="sheet-foot"><button class="btn btn-quiet" data-vcf>${icon('download')}Fichier .vcf</button><button class="btn btn-primary" data-close>Terminé</button></div>`, {
    onMount: (d) => { d.querySelector('[data-vcf]').onclick = () => download(`${(l.name || 'contact').replace(/\W+/g, '-')}.vcf`, card, 'text/vcard'); },
  });
}

function exportLocal() {
  const cell = (v) => {
    let s = String(Array.isArray(v) ? v.join(', ') : v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // pas de formule exécutée à l'ouverture dans Excel
    return `"${s.replace(/"/g, '""')}"`;
  };
  const head = ['Enregistré le', 'Nom', 'Société', 'Profil', 'Événements / an', 'Fonction', 'Téléphone', 'Email', 'Événement', 'Période', 'Jauge', 'Budget', 'Besoins', 'Potentiel', 'Suivi par', 'Notes'];
  const rows = ctx.hub.state.leads.filter((l) => !l.demo).map((l) => [new Date(l.createdAt).toLocaleString('fr-FR'), l.name, l.company, l.profile, l.volume, l.role, l.phone, l.email, l.eventType, l.period, l.audience, l.budget, l.needs, TEMPS[l.temperature]?.label, opById(l.operator).name, l.notes].map(cell).join(';'));
  download(`mediacom-contacts-${new Date().toISOString().slice(0, 10)}.csv`, '﻿' + [head.map(cell).join(';'), ...rows].join('\r\n'), 'text/csv;charset=utf-8');
}

export async function loadDemo(c) {
  const now = Date.now();
  const D = [
    { name: 'Claire Martin', company: 'Calanques Séminaires (démo)', profile: 'Agence séminaire / DMC', volume: 'Plus de 20 / an', role: 'Cheffe de projet', eventType: 'Séminaire', audience: '100 – 300', budget: '15 – 40 k€', needs: ['Son', 'Écran LED', 'Vidéo & captation'], temperature: 'hot', operator: 'coraline', notes: 'Séminaire de 2 jours en avril dans un hôtel d’Aix, plénière + 4 ateliers. Cherche un seul prestataire technique pour toute l’année.', mins: 12 },
    { name: 'Julien Roux', company: 'Agence Azur Events (démo)', profile: 'Agence événementielle', volume: '6 à 20 / an', role: 'Directeur de production', eventType: 'Convention / plénière', audience: '300 – 800', budget: '40 k€ +', needs: ['Son', 'Lumière', 'Écran LED', 'Streaming / hybride'], temperature: 'hot', operator: 'mazen', notes: 'Convention annuelle d’un client pharma, retransmission vers 3 sites. Veut une visite technique du lieu.', mins: 35 },
    { name: 'Inès Haddad', company: 'Maison Ferrand (démo)', profile: 'Entreprise', volume: '1 à 5 / an', role: 'Office manager', eventType: 'Soirée d’entreprise', audience: '100 – 300', budget: '5 – 15 k€', needs: ['Lumière', 'Mapping laser façade'], temperature: 'warm', operator: 'nolan', notes: 'Soirée des 30 ans en juin, lieu pas encore choisi.', mins: 70 },
    { name: 'Thomas Girard', company: 'Littoral DMC (démo)', profile: 'Agence séminaire / DMC', volume: '6 à 20 / an', role: 'Responsable incentive', eventType: 'Incentive / team building', audience: '100 – 300', budget: 'À définir', needs: ['Son', 'Scène mobile MediaScène', 'Structure & levage'], temperature: 'warm', operator: 'eric', notes: 'Incentive en plein air en septembre, intéressé par la MediaScène 60 m².', mins: 125 },
    { name: 'Sarah Benali', company: 'Château des Pins (démo)', profile: 'Lieu / hôtel', volume: 'Plus de 20 / an', role: 'Responsable commercial', eventType: 'Séminaire', audience: '< 100', budget: 'À définir', needs: ['Son', 'Vidéo & captation'], temperature: 'cold', operator: 'mazen', notes: 'Cherche un prestataire à recommander à ses clients séminaires.', mins: 190 },
  ];
  for (const d of D) {
    const { mins, ...rest } = d;
    await c.hub.saveLead({ id: c.hub.newId(), ...rest, phone: '', email: '', demo: true, capturedBy: rest.operator, createdAt: now - mins * 60000 });
  }
  toast({ title: 'Démo chargée', text: '5 contacts marqués « démo », exclus de l’export CSV.', tone: 'blue' });
}

const IGNORE = new Set(['words', 'wall', 'tarifs', 'settings', 'presence']);
function update(reason) {
  if (!el || IGNORE.has(reason)) return;
  renderList();
  if (wide()) { renderDetail(); return; }
  // Tiroir ouvert sur une fiche : on le tient à jour, ou on le ferme si la fiche a disparu
  const d = $('#drawer');
  if (d.dataset.kind !== 'lead' || !d.classList.contains('is-open')) return;
  const l = ctx.hub.state.leads.find((x) => x.id === d.dataset.lead);
  if (!l) { closeDrawer({ force: true }); return; }
  const body = d.querySelector('.drawer-body');
  const y = body.scrollTop;
  body.innerHTML = detailHTML(l);
  body.scrollTop = y;
}

export default {
  id: 'contacts', title: 'Contacts', short: 'Contacts', sub: 'Saisie, suivi et transferts', icon: 'contacts',
  mount, update,
  enter() { update(); if (!ui.selected && wide()) { const first = filtered()[0]; if (first) { ui.selected = first.id; renderDetail(); renderList(); } } },
  select(id) { if (el) select(id); else ui.selected = id; },
  filterBy(op) { ui.op = op; if (el) renderList(); },
};
