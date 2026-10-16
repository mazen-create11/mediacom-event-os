import { COMPANY, OPERATORS, opById, PHOTOS, VIDEOS, isSem, photo, poster } from '../data.js';
import { icon, esc, $, $$, toast, qrSVG, vcard, download, ago, LOGO_M } from '../ui.js';
import { attractMinutes, setAttractMinutes } from '../attract.js';
import { withToken } from '../hub.js';
import { confirmSheet } from '../ui.js';

let el, ctx, info = null;
let pick = 'vcard';
let bvFilter = 'all';
const MEDIA = () => [...VIDEOS.map((v) => ({ ...v, type: 'video' })), ...PHOTOS.map((p) => ({ ...p, type: 'photo' }))];

const CARD = vcard({ name: 'Éric Algoud', org: `Médiacom · ${COMPANY.baseline}`, title: 'Direction', tel: COMPANY.phone, tel2: COMPANY.phoneAlt,
  email: COMPANY.email, url: COMPANY.site, adr: '25 boulevard de Saint-Marcel;Marseille;;13011;France',
  note: `Prestataire technique son, lumière, vidéo et scène mobile depuis ${COMPANY.since}.` });

const CODES = {
  vcard: { label: 'Fiche contact', text: () => CARD, hint: 'Ajoute Médiacom au répertoire, sans réseau.', ecc: 'L' },
  site: { label: 'mediacom.org', text: () => COMPANY.site, hint: 'Le site et toutes les prestations.', ecc: 'M' },
  scene: { label: 'MediaScène', text: () => COMPANY.siteScene, hint: 'La scène mobile, fiches et disponibilités.', ecc: 'M' },
  avis: { label: 'Avis Google', text: () => COMPANY.reviews, hint: 'Laisser un avis après un événement.', ecc: 'M' },
};

function mount(root, c) {
  el = root;
  ctx = c;
  el.innerHTML = `<div class="rack">
    <article class="module span-6" style="--i:0">
      <header class="mod-head"><span class="n">01</span><span class="t">Pass visiteur</span><span class="r">fonctionne en 4G</span></header>
      <div class="mod-body">
        <div class="seg" id="ps-pick" style="display:grid;grid-template-columns:repeat(4,minmax(0,1fr));width:100%"><span class="thumb"></span>
          ${Object.entries(CODES).map(([k, v]) => `<button data-k="${k}" aria-selected="${k === pick}">${esc(v.label)}</button>`).join('')}</div>
        <div style="display:grid;place-items:center;padding:26px 0 8px">
          <div class="qr" id="ps-qr" style="width:min(320px,72vw)"></div>
          <p class="muted mt-2" id="ps-hint" style="text-align:center;margin-bottom:0"></p>
        </div>
        <div class="row wrap mt-2" style="justify-content:center">
          <button class="btn btn-primary" id="ps-full">${icon('expand')}Plein écran</button>
          <button class="btn btn-quiet" id="ps-vcf">${icon('download')}Fichier .vcf</button>
        </div>
        <div class="divider"></div>
        <dl class="dl"><dt>Adresse</dt><dd>${esc(COMPANY.address)}</dd><dt>Téléphone</dt><dd><a href="tel:${COMPANY.phone.replace(/\s/g, '')}">${COMPANY.phone}</a></dd>
          <dt>E-mail</dt><dd><a href="mailto:${COMPANY.email}">${COMPANY.email}</a></dd></dl>
      </div>
    </article>

    <article class="module span-6" style="--i:1">
      <header class="mod-head"><span class="n">02</span><span class="t">Hub du stand</span><span class="r" id="ps-hub"></span></header>
      <div class="mod-body">
        <div class="row" style="align-items:flex-start;gap:18px">
          <div class="qr" id="ps-pair" style="width:150px;height:150px;flex:none;position:relative;overflow:hidden"></div>
          <div><b style="font-weight:500">Appairer une tablette</b><p class="muted" style="margin:6px 0 12px;font-size:14px">Ce QR donne accès à tous les contacts du stand : il reste masqué, s’affiche 30 secondes à la demande, jamais face au public.</p>
            <div class="row wrap"><button class="btn btn-quiet btn-sm" id="ps-reveal">${icon('eye')}Afficher 30 s</button><button class="btn btn-danger btn-sm" id="ps-rotate">Changer le code</button></div></div>
        </div>
        <div class="divider"></div>
        <div class="field"><span class="lbl">Mode vitrine de cette tablette</span>
          <div class="chips sm" id="ps-attract">${[[0, 'Désactivé'], [2, '2 min'], [3, '3 min'], [5, '5 min']].map(([m, l]) => `<button class="chip" data-m="${m}" aria-pressed="${attractMinutes() === m}">${l}</button>`).join('')}</div>
          <small class="dim" style="font-size:12.5px">Sans personne devant, la tablette lance le diaporama MediaScène et réalisations. Un toucher le referme.</small></div>
        <div class="divider"></div>
        <span class="eyebrow">Appareils connectés</span>
        <div id="ps-devices" class="mt-2"></div>
        <div class="divider"></div>
        <form class="stack" id="ps-settings" style="gap:14px">
          <div class="field"><label for="ps-ev">Nom de l’événement</label><input class="input" id="ps-ev" placeholder="SBE Marseille 2026"></div>
          <div class="grid-2">
            <div class="field"><label for="ps-ssid">Wi-Fi du stand</label><input class="input" id="ps-ssid" placeholder="Nom du réseau" autocapitalize="off"></div>
            <div class="field"><label for="ps-pass">Mot de passe Wi-Fi</label><input class="input" id="ps-pass" placeholder="Mot de passe" autocapitalize="off"></div>
          </div>
          <div class="field"><label for="ps-pub">Adresse publique (option)</label><input class="input" id="ps-pub" placeholder="https://… si un tunnel internet est actif" autocapitalize="off" inputmode="url"></div>
          <div class="toggle-row"><div class="l"><b>Tout le book</b><small>Par défaut, seules les références séminaires, soirées et mises en lumière sont montrées. Réaffiche concerts, festivals et gala sportif (décision Éric).</small></div><button type="button" class="switch" role="switch" id="ps-bookall" aria-label="Tout le book" aria-checked="false"></button></div>
          <p class="dim" style="font-size:12.5px;margin:0">Le Wi-Fi renseigné ajoute un QR « Rejoindre le Wi-Fi » sur le mur : sans lui, seuls les visiteurs déjà connectés au réseau du stand peuvent envoyer un mot.</p>
          <div class="row"><button class="btn btn-primary btn-sm">${icon('check')}Enregistrer</button><a class="btn btn-quiet btn-sm" href="/setup" target="_blank" rel="noopener">${icon('link')}Page d’appairage</a></div>
        </form>
      </div>
    </article>

    <article class="module span-12" style="--i:2">
      <header class="mod-head"><span class="n">03</span><span class="t">Book · validation d’Éric</span><span class="r" id="bv-r"></span></header>
      <div class="mod-body">
        <p class="lede" style="margin:0 0 14px">Relecture de Nolan : concerts, festivals et gala sportif n’ont rien à faire sur un salon du séminaire, et deux vidéos restent à confirmer. Un toucher retire ou remet chaque référence dans le Book et le showreel. La décision finale revient à Éric.</p>
        <div class="row wrap" style="gap:8px"><div class="seg" id="bv-filter" style="height:34px"><span class="thumb"></span><button aria-selected="true" data-f="all" style="height:30px;font-size:12px">Tout</button><button aria-selected="false" data-f="on" style="height:30px;font-size:12px">Montrées</button><button aria-selected="false" data-f="off" style="height:30px;font-size:12px">Retirées</button><button aria-selected="false" data-f="video" style="height:30px;font-size:12px">Vidéos</button></div>
          <span class="spacer"></span><button class="btn btn-quiet btn-sm" id="bv-copy">${icon('copy')}Copier la liste pour Éric</button><button class="btn btn-quiet btn-sm" id="bv-reset">${icon('reset')}Sélection d’origine</button></div>
        <div class="bookv mt-3" id="bv-grid"></div>
      </div>
    </article>
  </div>`;
  const bvSeg = $('#bv-filter', el);
  const bvThumb = () => { const b = bvSeg.querySelector('[aria-selected="true"]'); const t = bvSeg.querySelector('.thumb'); t.style.width = b.offsetWidth + 'px'; t.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  new ResizeObserver(bvThumb).observe(bvSeg);
  bvSeg.addEventListener('click', (e) => { const b = e.target.closest('[data-f]'); if (!b) return; bvFilter = b.dataset.f; $$('[data-f]', bvSeg).forEach((x) => x.setAttribute('aria-selected', x === b)); bvThumb(); renderBook(bvFilter); });
  $('#bv-grid', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-bv]');
    if (!b) return;
    const m = MEDIA().find((x) => x.f === b.dataset.bv);
    if (!m) return;
    const s = ctx.hub.state.settings || {};
    let hide = [...(s.bookHide || [])], show = [...(s.bookShow || [])];
    const wasOn = isSem(m);
    if (wasOn) { if (m.sem !== false) hide.push(m.f); show = show.filter((x) => x !== m.f); }
    else { if (m.sem === false) show.push(m.f); hide = hide.filter((x) => x !== m.f); }
    ctx.hub.setSettings({ bookHide: [...new Set(hide)], bookShow: [...new Set(show)] });
    toast({ title: wasOn ? 'Retirée du Book' : 'Remise dans le Book', text: esc(m.c), tone: wasOn ? 'warm' : 'live' });
  });
  $('#bv-reset', el).addEventListener('click', () => { ctx.hub.setSettings({ bookHide: [], bookShow: [] }); toast({ title: 'Sélection d’origine', text: 'Retour au tri séminaire proposé par Nolan.', tone: 'blue' }); });
  $('#bv-copy', el).addEventListener('click', async () => {
    const off = MEDIA().filter((m) => !isSem(m)), on = MEDIA().filter((m) => isSem(m));
    const txt = `Book Médiacom · salon du séminaire · ${new Date().toLocaleDateString('fr-FR')}\n\nRETIRÉES (${off.length}) :\n${off.map((m) => `- ${m.type === 'video' ? 'Vidéo' : 'Photo'} · ${m.c}${m.k ? ` (${m.k})` : ''}`).join('\n')}\n\nMONTRÉES (${on.length}) :\n${on.map((m) => `- ${m.type === 'video' ? 'Vidéo' : 'Photo'} · ${m.c}`).join('\n')}\n\nÀ valider par Éric : droits des photos et vidéos, triptyque d’Allauch (origine inconnue).`;
    try { await navigator.clipboard.writeText(txt); toast({ title: 'Liste copiée', text: `${off.length} retirées, ${on.length} montrées`, tone: 'live' }); } catch { toast({ title: 'Copie impossible', tone: 'warm' }); }
  });
  renderBook(bvFilter);

  const seg = $('#ps-pick', el);
  const moveThumb = () => { const b = seg.querySelector('[aria-selected="true"]'); const t = seg.querySelector('.thumb'); t.style.width = b.offsetWidth + 'px'; t.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  new ResizeObserver(moveThumb).observe(seg);
  seg.addEventListener('click', (e) => { const b = e.target.closest('[data-k]'); if (!b) return; pick = b.dataset.k; $$('[data-k]', seg).forEach((x) => x.setAttribute('aria-selected', x === b)); moveThumb(); renderQR(); });
  $('#ps-attract', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-m]');
    if (!b) return;
    setAttractMinutes(Number(b.dataset.m));
    $$('[data-m]', el).forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  $('#ps-reveal', el).addEventListener('click', () => renderPair(true));
  $('#ps-rotate', el).addEventListener('click', async () => {
    const ok = await confirmSheet({ title: 'Changer le code d’appairage ?', text: 'Toutes les autres tablettes et téléphones de l’équipe seront déconnectés et devront scanner le nouveau QR. À faire si le QR a été vu par quelqu’un d’extérieur.', ok: 'Changer le code', danger: true });
    if (!ok) return;
    try { await ctx.hub.rotateToken(); await loadInfo(); toast({ title: 'Nouveau code actif', text: 'Appairez de nouveau les autres appareils.', tone: 'live' }); }
    catch { toast({ title: 'Impossible sans le hub', tone: 'off' }); }
  });
  $('#ps-vcf', el).addEventListener('click', () => download('Mediacom-Marseille.vcf', CARD, 'text/vcard'));
  $('#ps-full', el).addEventListener('click', fullQR);
  $('#ps-settings', el).addEventListener('submit', (e) => {
    e.preventDefault();
    ctx.hub.setSettings({ eventName: $('#ps-ev', el).value.trim() || 'Salon', wifiSsid: $('#ps-ssid', el).value.trim(), wifiPass: $('#ps-pass', el).value, publicUrl: $('#ps-pub', el).value.trim().replace(/\/$/, '') });
  });
  $('#ps-bookall', el).addEventListener('click', () => {
    const on = !(ctx.hub.state.settings?.bookAll === true);
    ctx.hub.setSettings({ bookAll: on });
    toast({ title: on ? 'Tout le book est visible' : 'Book séminaire', text: on ? 'Concerts, festivals et gala sportif réapparaissent dans le Book et le showreel.' : 'Retour à la sélection séminaire.', tone: 'blue' });
    toast({ title: 'Réglages enregistrés', text: 'Le mur LED se met à jour.', tone: 'live' });
    loadInfo();
  });
  renderQR();
  loadInfo();
  update();
}

// Validation du Book : chaque référence, son état, et le pourquoi (tri Nolan ou décision prise sur la tablette)
function renderBook(filter = bvFilter) {
  const host = $('#bv-grid', el);
  if (!host) return;
  const s = ctx.hub.state.settings || {};
  const hide = new Set(s.bookHide || []), show = new Set(s.bookShow || []);
  const all = MEDIA();
  const list = all.filter((m) => filter === 'all' || (filter === 'video' ? m.type === 'video' : filter === 'on' ? isSem(m) : !isSem(m)));
  const off = all.filter((m) => !isSem(m)).length;
  $('#bv-r', el).innerHTML = `<span class="led" data-s="${off ? 'warm' : 'live'}"></span>${all.length - off} montrées · ${off} retirées`;
  host.innerHTML = list.length ? list.map((m) => {
    const on = isSem(m);
    const why = show.has(m.f) ? 'remise sur la tablette' : hide.has(m.f) ? 'retirée sur la tablette' : m.sem === false ? 'tri Nolan : hors séminaire' : '';
    return `<button class="bv-card ${on ? 'on' : 'off'}" data-bv="${esc(m.f)}" aria-pressed="${on}" title="${on ? 'Retirer du Book' : 'Remettre dans le Book'}">
      <span class="bv-img"><img src="${m.type === 'video' ? poster(m.f) : photo(m.f, true)}" alt="" loading="lazy">${m.type === 'video' ? `<i class="bv-play">${icon('play')}</i>` : ''}<i class="bv-state">${on ? 'Book' : 'Retirée'}</i></span>
      <span class="bv-t"><b>${esc(m.c)}</b><small>${esc([m.type === 'video' ? 'Vidéo' : 'Photo', m.k, why].filter(Boolean).join(' · '))}</small></span></button>`;
  }).join('') : '<p class="dim" style="margin:0">Rien dans ce filtre.</p>';
}

function renderQR() {
  const c = CODES[pick];
  const box = $('#ps-qr', el);
  box.innerHTML = qrSVG(c.text(), { ecc: c.ecc });
  box.animate([{ opacity: 0, transform: 'scale(.97)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 260, easing: 'cubic-bezier(.22,1,.36,1)' });
  $('#ps-hint', el).textContent = c.hint;
  $('#ps-vcf', el).hidden = pick !== 'vcard';
}

function fullQR() {
  const c = CODES[pick];
  const host = $('#show');
  host.innerHTML = `<div style="position:absolute;inset:0;display:grid;place-items:center;background:#04080f;padding:24px">
    <div style="display:flex;flex-direction:column;align-items:center;gap:22px;text-align:center">
      <div style="width:56px;color:#fff">${LOGO_M}</div>
      <div class="qr" style="width:min(70vh,82vw);padding:22px">${qrSVG(c.text(), { ecc: c.ecc })}</div>
      <div><span class="eyebrow" style="color:#9cc8ff">${esc(c.label)}</span><p style="margin:8px 0 0;font-size:20px">${esc(c.hint)}</p></div>
    </div>
    <button class="btn btn-quiet btn-icon" style="position:absolute;top:calc(16px + env(safe-area-inset-top));right:16px" aria-label="Fermer">${icon('x')}</button></div>`;
  host.classList.add('is-open');
  const close = () => { host.classList.remove('is-open'); host.innerHTML = ''; document.removeEventListener('keydown', onKey); };
  const onKey = (e) => e.key === 'Escape' && close();
  host.onclick = close;
  host.onpointerdown = host.onpointerup = null;
  document.addEventListener('keydown', onKey);
}

let revealTimer = 0;
function renderPair(show = false) {
  const box = $('#ps-pair', el);
  clearTimeout(revealTimer);
  if (!info?.pairUrl) { box.innerHTML = '<p style="font-size:12px;padding:8px;color:#333">Appairez d’abord cette tablette</p>'; return; }
  box.innerHTML = show ? qrSVG(info.pairUrl, { ecc: 'M', margin: 1 })
    : `<div style="position:absolute;inset:0;display:grid;place-items:center;background:repeating-linear-gradient(45deg,#e9eef6 0 8px,#f6f8fb 8px 16px);color:#46546a"><span style="width:34px;height:34px;display:block">${icon('eyeOff')}</span></div>`;
  if (show) revealTimer = setTimeout(() => renderPair(false), 30000);
}

async function loadInfo() {
  if (ctx.hub.state.mode !== 'hub') { $('#ps-pair', el).innerHTML = `<p style="font-size:12px;padding:8px;color:#333">${ctx.hub.state.mode === 'cloud' ? 'Démo en ligne : pas d’appairage' : 'Hub non lancé'}</p>`; return; }
  try {
    info = await (await fetch(withToken('/api/info'), { cache: 'no-store' })).json();
    renderPair();
  } catch { /* hors ligne */ }
}

function update(reason) {
  if (!el || ['words', 'wall', 'tarifs', 'lead', 'lead:delete'].includes(reason)) return;
  const s = ctx.hub.state.settings || {};
  const set = (id, v) => { const i = $(id, el); if (document.activeElement !== i) i.value = v || ''; };
  set('#ps-ev', s.eventName === 'Salon' ? '' : s.eventName);
  set('#ps-ssid', s.wifiSsid);
  set('#ps-pass', s.wifiPass);
  set('#ps-pub', s.publicUrl);
  $('#ps-bookall', el)?.setAttribute('aria-checked', s.bookAll === true);
  if (!reason || ['settings', 'hello', 'boot'].includes(reason)) renderBook();
  const st = ctx.hub.state.status;
  $('#ps-hub', el).innerHTML = `<span class="led" data-s="${st === 'online' ? 'live' : st === 'local' ? 'cold' : 'off'}"></span>${{ online: 'en ligne', local: 'mode local', offline: 'hors ligne', connecting: 'connexion', unpaired: 'non appairée' }[st]}`;
  const devs = ctx.hub.state.presence;
  $('#ps-devices', el).innerHTML = devs.length
    ? devs.map((d) => `<div class="load-row" style="grid-template-columns:auto minmax(0,1fr) auto"><span class="led on"></span><span>${esc(d.op ? opById(d.op).name : 'Sans opérateur')} <span class="dim">· ${esc({ tablet: 'tablette', master: 'iPhone régie', wall: 'mur' }[d.kind] || d.kind)}</span></span><span class="w">${ago(d.since)}</span></div>`).join('')
    : '<p class="dim" style="font-size:13px;margin:0">Aucun appareil connecté au hub.</p>';
}

export default {
  id: 'pass', title: 'Pass & réglages', short: 'Pass', sub: 'QR visiteurs et hub du stand', icon: 'pass',
  mount, update,
  enter() { update(); },
};
