import { COMPANY, OPERATORS, opById } from '../data.js';
import { icon, esc, $, $$, toast, qrSVG, vcard, download, ago, LOGO_M } from '../ui.js';
import { attractMinutes, setAttractMinutes } from '../attract.js';

let el, ctx, info = null;
let pick = 'vcard';

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
          <div class="qr" id="ps-pair" style="width:150px;flex:none"></div>
          <div><b style="font-weight:500">Appairer une tablette</b><p class="muted" style="margin:6px 0 0;font-size:14px">Scannez avec la tablette à ajouter : elle rejoint l’équipe et reçoit les contacts en direct. Ce QR donne accès aux données du stand, ne le montrez pas au public.</p></div>
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
          <p class="dim" style="font-size:12.5px;margin:0">Le Wi-Fi renseigné ajoute un QR « Rejoindre le Wi-Fi » sur le mur : sans lui, seuls les visiteurs déjà connectés au réseau du stand peuvent envoyer un mot.</p>
          <div class="row"><button class="btn btn-primary btn-sm">${icon('check')}Enregistrer</button><a class="btn btn-quiet btn-sm" href="/setup" target="_blank" rel="noopener">${icon('link')}Page d’appairage</a></div>
        </form>
      </div>
    </article>
  </div>`;

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
  $('#ps-vcf', el).addEventListener('click', () => download('Mediacom-Marseille.vcf', CARD, 'text/vcard'));
  $('#ps-full', el).addEventListener('click', fullQR);
  $('#ps-settings', el).addEventListener('submit', (e) => {
    e.preventDefault();
    ctx.hub.setSettings({ eventName: $('#ps-ev', el).value.trim() || 'Salon', wifiSsid: $('#ps-ssid', el).value.trim(), wifiPass: $('#ps-pass', el).value, publicUrl: $('#ps-pub', el).value.trim().replace(/\/$/, '') });
    toast({ title: 'Réglages enregistrés', text: 'Le mur LED se met à jour.', tone: 'live' });
    loadInfo();
  });
  renderQR();
  loadInfo();
  update();
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

async function loadInfo() {
  if (ctx.hub.state.mode === 'local') { $('#ps-pair', el).innerHTML = '<p class="dim" style="font-size:12px;padding:8px;color:#333">Hub non lancé</p>'; return; }
  try {
    info = await (await fetch('/api/info', { cache: 'no-store' })).json();
    $('#ps-pair', el).innerHTML = info.pairUrl ? qrSVG(info.pairUrl, { ecc: 'M', margin: 1 }) : '<p style="font-size:12px;padding:8px;color:#333">Appairez d’abord cette tablette</p>';
  } catch { /* hors ligne */ }
}

function update() {
  if (!el) return;
  const s = ctx.hub.state.settings || {};
  const set = (id, v) => { const i = $(id, el); if (document.activeElement !== i) i.value = v || ''; };
  set('#ps-ev', s.eventName === 'Salon' ? '' : s.eventName);
  set('#ps-ssid', s.wifiSsid);
  set('#ps-pass', s.wifiPass);
  set('#ps-pub', s.publicUrl);
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
