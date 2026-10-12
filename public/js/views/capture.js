import { EVENT_TYPES, NEEDS, AUDIENCE, BUDGETS, TEMPS, opById } from '../data.js';
import { icon, esc, $, $$, toast, openDrawer, closeDrawer, ago } from '../ui.js';
import { markFresh } from './contacts.js';
import { withToken } from '../hub.js';

let stream = null;
let scanRAF = 0;
let camGen = 0; // invalide toute ouverture de caméra encore en cours

function stopCamera() {
  camGen++;
  cancelAnimationFrame(scanRAF);
  scanRAF = 0;
  stream?.getTracks().forEach((t) => t.stop());
  stream = null;
}

const single = (name, list, value) => `<div class="chips sm" role="radiogroup" data-single="${name}">${list.map((v) => `<button type="button" class="chip" role="radio" aria-pressed="${v === value}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;
const multi = (name, list, values = []) => `<div class="chips sm" role="group" data-multi="${name}">${list.map((v) => `<button type="button" class="chip" aria-pressed="${values.includes(v)}" data-v="${esc(v)}">${esc(v)}</button>`).join('')}</div>`;

// Lecture d'un QR de badge : vCard, MECARD, ou texte libre
function parseCode(text) {
  const out = {};
  if (/BEGIN:VCARD/i.test(text)) {
    const get = (k) => (new RegExp(`^${k}(?:;[^:]*)?:(.*)$`, 'im').exec(text) || [])[1]?.trim();
    const n = get('N');
    out.name = get('FN') || (n ? n.split(';').reverse().filter(Boolean).join(' ') : '');
    out.company = (get('ORG') || '').split(';')[0];
    out.role = get('TITLE');
    out.phone = get('TEL');
    out.email = get('EMAIL');
  } else if (/^MECARD:/i.test(text)) {
    const get = (k) => (new RegExp(`${k}:([^;]*)`, 'i').exec(text) || [])[1];
    out.name = (get('N') || '').split(',').reverse().join(' ').trim();
    out.company = get('ORG');
    out.phone = get('TEL');
    out.email = get('EMAIL');
  } else {
    out.notes = `Badge : ${text}`;
  }
  return out;
}

export function openCapture(ctx, prefill = null) {
  const editing = !!prefill?.id && ctx.hub.state.leads.some((l) => l.id === prefill.id);
  const l = prefill || {};
  let photo = l.cardPhoto || null;
  const leadId = l.id || ctx.hub.newId(); // fixé à l'ouverture : un double appui ne crée pas de doublon
  let dirty = false;
  let saving = false;
  let temperature = l.temperature || 'warm';

  const html = `<div class="drawer-head">
      <span class="eyebrow"><b>${editing ? 'Modifier' : 'Nouveau contact'}</b>${editing ? '' : ` · saisi par ${esc(ctx.me().name)}`}</span>
      <span class="spacer"></span>
      <button class="btn btn-quiet btn-icon btn-sm" data-close aria-label="Fermer">${icon('x')}</button>
    </div>
    <form class="drawer-body stack" id="cap-form" novalidate autocomplete="off">
      ${editing ? '' : `<div class="seg" id="cap-mode" role="tablist" aria-label="Mode de saisie">
        <span class="thumb"></span>
        <button type="button" role="tab" aria-selected="true" data-mode="express">${icon('edit')}Express</button>
        <button type="button" role="tab" aria-selected="false" data-mode="badge">${icon('scan')}Badge</button>
        <button type="button" role="tab" aria-selected="false" data-mode="card">${icon('camera')}Carte</button>
      </div>`}
      <div id="cap-cam" hidden></div>
      <div class="grid-2">
        <div class="field"><label for="f-name">Nom</label><input class="input" id="f-name" name="name" value="${esc(l.name || '')}" placeholder="Prénom Nom" autocapitalize="words" enterkeyhint="next"></div>
        <div class="field"><label for="f-company">Société</label><input class="input" id="f-company" name="company" value="${esc(l.company || '')}" placeholder="Entreprise, collectivité…" autocapitalize="words" enterkeyhint="next"></div>
        <div class="field"><label for="f-phone">Téléphone</label><input class="input" id="f-phone" name="phone" value="${esc(l.phone || '')}" inputmode="tel" placeholder="06 00 00 00 00" enterkeyhint="next"></div>
        <div class="field"><label for="f-email">E-mail</label><input class="input" id="f-email" name="email" value="${esc(l.email || '')}" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="nom@societe.fr" enterkeyhint="next"></div>
      </div>
      <div class="field"><label for="f-role">Fonction</label><input class="input" id="f-role" name="role" value="${esc(l.role || '')}" placeholder="Direction communication, service événements…" enterkeyhint="done"></div>
      <div id="cap-dupe"></div>
      <div class="field"><span class="lbl">Potentiel</span>
        <div class="temps" role="radiogroup" id="cap-temp">${Object.entries(TEMPS).map(([k, t]) => `<button type="button" class="temp" data-t="${k}" role="radio" aria-pressed="${temperature === k}"><span class="led" data-s="${k}"></span><b>${t.label}</b><small>${t.hint}</small></button>`).join('')}</div></div>
      <div class="field"><span class="lbl">Type d’événement</span>${single('eventType', EVENT_TYPES, l.eventType)}</div>
      <div class="field"><span class="lbl">Besoins</span>${multi('needs', NEEDS, l.needs)}</div>
      <div class="grid-2">
        <div class="field"><span class="lbl">Jauge</span>${single('audience', AUDIENCE, l.audience)}</div>
        <div class="field"><span class="lbl">Budget</span>${single('budget', BUDGETS, l.budget)}</div>
      </div>
      <div class="field"><label for="f-period">Période envisagée</label><input class="input" id="f-period" name="period" type="month" value="${esc(l.period || '')}"></div>
      <div class="field"><label for="f-notes">Notes</label><textarea class="input" id="f-notes" name="notes" rows="3" placeholder="Lieu, date, contraintes, prochaine étape…">${esc(l.notes || '')}</textarea></div>
      <div id="cap-photo"></div>
      <input type="file" accept="image/*" capture="environment" id="cap-file" hidden>
    </form>
    <div class="drawer-foot">
      <button class="btn btn-quiet" data-close type="button">Annuler</button>
      <span class="spacer"></span>
      <button class="btn btn-primary btn-lg" id="cap-save" type="button">${icon('check')}${editing ? 'Enregistrer' : '<span class="hide-sm">Enregistrer le contact</span><span class="show-sm">Enregistrer</span>'}</button>
    </div>`;

  openDrawer(html, {
    label: editing ? 'Modifier le contact' : 'Nouveau contact',
    kind: 'capture',
    guard: () => !dirty || saving,
    onMount(d) {
      const form = $('#cap-form', d);
      const val = (n) => form.elements[n]?.value.trim() || '';

      d.querySelectorAll('[data-close]').forEach((b) => (b.onclick = () => closeDrawer()));
      form.addEventListener('input', () => { dirty = true; });
      setTimeout(() => $('#f-name', d)?.focus({ preventScroll: true }), editing ? 0 : 380);

      // Puces simples et multiples
      form.addEventListener('click', (e) => {
        const chip = e.target.closest('.chip');
        if (!chip) return;
        dirty = true;
        const group = chip.parentElement;
        if (group.dataset.single) {
          const on = chip.getAttribute('aria-pressed') !== 'true';
          $$('.chip', group).forEach((c) => c.setAttribute('aria-pressed', c === chip && on));
        } else if (group.dataset.multi) {
          chip.setAttribute('aria-pressed', chip.getAttribute('aria-pressed') !== 'true');
        }
      });
      $('#cap-temp', d).addEventListener('click', (e) => {
        const b = e.target.closest('[data-t]');
        if (!b) return;
        temperature = b.dataset.t;
        dirty = true;
        $$('[data-t]', d).forEach((x) => x.setAttribute('aria-pressed', x === b));
      });

      // Entrée = champ suivant (clavier iPad)
      const order = ['f-name', 'f-company', 'f-phone', 'f-email', 'f-role'];
      form.addEventListener('keydown', (e) => {
        if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA') return;
        e.preventDefault();
        const i = order.indexOf(e.target.id);
        if (i >= 0 && i < order.length - 1) $('#' + order[i + 1], d).focus();
        else e.target.blur();
      });

      // Doublons : même e-mail, même téléphone ou même nom + société
      const dupe = $('#cap-dupe', d);
      const checkDupe = () => {
        const email = val('email').toLowerCase();
        const phone = val('phone').replace(/\D/g, '');
        const name = val('name').toLowerCase();
        const co = val('company').toLowerCase();
        const hit = ctx.hub.state.leads.find((x) => x.id !== l.id && (
          (email && x.email?.toLowerCase() === email) || (phone.length >= 8 && x.phone?.replace(/\D/g, '') === phone) ||
          (name.length > 3 && x.name?.toLowerCase() === name && (!co || x.company?.toLowerCase() === co))));
        dupe.innerHTML = hit ? `<div class="banner">${icon('alert')}<div style="flex:1">Déjà saisi par <b>${esc(opById(hit.capturedBy || hit.operator).name)}</b> ${ago(hit.createdAt)} : ${esc(hit.name || '')}${hit.company ? ', ' + esc(hit.company) : ''}.</div><button type="button" class="btn btn-quiet btn-sm" data-open="${hit.id}">Ouvrir</button></div>` : '';
      };
      ['name', 'company', 'phone', 'email'].forEach((n) => form.elements[n].addEventListener('input', checkDupe));
      dupe.addEventListener('click', async (e) => {
        const b = e.target.closest('[data-open]');
        if (b && (await closeDrawer())) ctx.openLead(b.dataset.open);
      });

      // Photo de carte
      const photoHost = $('#cap-photo', d);
      const renderPhoto = () => {
        photoHost.innerHTML = photo ? `<div class="field"><span class="lbl">Carte de visite</span><div class="row" style="align-items:flex-start"><img src="${esc(photo.startsWith('/api/') ? withToken(photo) : photo)}" alt="Carte de visite" style="width:180px;border-radius:10px;border:1px solid var(--line-2)"><button type="button" class="btn btn-quiet btn-sm" data-rm-photo>${icon('trash')}Retirer</button></div></div>` : '';
        const rm = photoHost.querySelector('[data-rm-photo]');
        if (rm) rm.onclick = () => { photo = null; dirty = true; renderPhoto(); };
      };
      renderPhoto();

      // Modes
      const cam = $('#cap-cam', d);
      const seg = $('#cap-mode', d);
      const moveThumb = (btn) => {
        const t = seg.querySelector('.thumb');
        t.style.width = btn.offsetWidth + 'px';
        t.style.transform = `translateX(${btn.offsetLeft}px)`;
      };
      if (seg) {
        requestAnimationFrame(() => moveThumb(seg.querySelector('[aria-selected="true"]')));
        seg.addEventListener('click', (e) => {
          const b = e.target.closest('[data-mode]');
          if (!b) return;
          $$('[data-mode]', seg).forEach((x) => x.setAttribute('aria-selected', x === b));
          moveThumb(b);
          setMode(b.dataset.mode);
        });
      }

      const fileInput = $('#cap-file', d);
      let fileMode = 'card';
      fileInput.addEventListener('change', async () => {
        const f = fileInput.files?.[0];
        fileInput.value = '';
        if (!f) return;
        const img = await createImageBitmap(f).catch(() => null);
        if (!img) return toast({ title: 'Image illisible', tone: 'off' });
        if (fileMode === 'card') { photo = toJPEG(img); dirty = true; renderPhoto(); toast({ title: 'Carte ajoutée à la fiche', tone: 'live' }); }
        else decodeStill(img);
      });

      async function setMode(mode) {
        stopCamera();
        const gen = camGen;
        if (mode === 'express') { cam.hidden = true; cam.innerHTML = ''; return; }
        cam.hidden = false;
        const label = mode === 'badge' ? 'Cadrez le QR code du badge visiteur' : 'Cadrez la carte de visite, à plat et éclairée';
        const live = !!navigator.mediaDevices?.getUserMedia && window.isSecureContext;
        cam.innerHTML = live
          ? `<div class="cam"><video playsinline muted autoplay></video><div class="frame"></div>${mode === 'badge' ? '<div class="scanline"></div>' : ''}<div class="hint">${label}</div></div>
             ${mode === 'card' ? `<div class="row mt-2"><button type="button" class="btn btn-primary" data-snap>${icon('camera')}Prendre la photo</button></div>` : ''}`
          : `<div class="banner" style="background:rgba(49,146,255,.07);border-color:rgba(49,146,255,.35);color:#cfe3ff">${icon(mode === 'badge' ? 'scan' : 'camera')}<div style="flex:1">${mode === 'badge' ? 'Photographiez le QR du badge : il est lu automatiquement.' : 'Photographiez la carte : elle est jointe à la fiche.'}</div></div>
             <div class="row mt-2"><button type="button" class="btn btn-primary" data-file>${icon('camera')}Ouvrir l’appareil photo</button></div>`;
        const fb = cam.querySelector('[data-file]');
        if (fb) { fb.onclick = () => { fileMode = mode; fileInput.click(); }; return; }
        try {
          const s = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false });
          // Mode changé ou tiroir fermé pendant l'autorisation : on coupe tout de suite
          if (gen !== camGen || !d.isConnected || d.dataset.kind !== 'capture') { s.getTracks().forEach((t) => t.stop()); return; }
          stream = s;
          const video = cam.querySelector('video');
          video.srcObject = stream;
          await video.play().catch(() => {});
          if (mode === 'badge') scanLoop(video);
          const snap = cam.querySelector('[data-snap]');
          if (snap) snap.onclick = () => { photo = toJPEG(video); dirty = true; renderPhoto(); toast({ title: 'Carte ajoutée à la fiche', tone: 'live' }); };
        } catch {
          if (gen !== camGen) return;
          cam.innerHTML = `<div class="banner">${icon('alert')}<div>Caméra indisponible ici. Utilisez l’appareil photo de la tablette.</div></div><div class="row mt-2"><button type="button" class="btn btn-primary" data-file>${icon('camera')}Ouvrir l’appareil photo</button></div>`;
          cam.querySelector('[data-file]').onclick = () => { fileMode = mode; fileInput.click(); };
        }
      }

      let jsQR = null;
      async function getJsQR() { return jsQR || (jsQR = (await import('../vendor/jsqr.js')).default); }
      const scanCanvas = document.createElement('canvas');
      const sctx = scanCanvas.getContext('2d', { willReadFrequently: true });

      async function scanLoop(video) {
        const decode = await getJsQR();
        let last = 0;
        const step = (t) => {
          if (!stream) return;
          if (t - last > 180 && video.readyState >= 2) {
            last = t;
            const w = 640, h = Math.round((video.videoHeight / video.videoWidth) * 640) || 480;
            scanCanvas.width = w; scanCanvas.height = h;
            sctx.drawImage(video, 0, 0, w, h);
            const code = decode(sctx.getImageData(0, 0, w, h).data, w, h, { inversionAttempts: 'dontInvert' });
            if (code?.data) { applyCode(code.data); return; }
          }
          scanRAF = requestAnimationFrame(step);
        };
        scanRAF = requestAnimationFrame(step);
      }

      async function decodeStill(img) {
        const decode = await getJsQR();
        const scale = Math.min(1, 1400 / Math.max(img.width, img.height));
        scanCanvas.width = Math.round(img.width * scale); scanCanvas.height = Math.round(img.height * scale);
        sctx.drawImage(img, 0, 0, scanCanvas.width, scanCanvas.height);
        const code = decode(sctx.getImageData(0, 0, scanCanvas.width, scanCanvas.height).data, scanCanvas.width, scanCanvas.height);
        if (code?.data) applyCode(code.data);
        else toast({ title: 'Aucun QR détecté', text: 'Rapprochez-vous et évitez les reflets.', tone: 'warm' });
      }

      function applyCode(text) {
        stopCamera();
        navigator.vibrate?.(40);
        const data = parseCode(text);
        for (const k of ['name', 'company', 'role', 'phone', 'email']) if (data[k] && form.elements[k]) form.elements[k].value = data[k];
        if (data.notes) form.elements.notes.value = [form.elements.notes.value, data.notes].filter(Boolean).join('\n');
        checkDupe();
        const express = seg?.querySelector('[data-mode="express"]');
        if (express) express.click();
        toast({ title: 'Badge lu', text: data.name ? esc(data.name) : 'Contenu ajouté aux notes', tone: 'live' });
      }

      function toJPEG(src) {
        const w0 = src.videoWidth || src.width, h0 = src.videoHeight || src.height;
        const s = Math.min(1, 1100 / Math.max(w0, h0));
        const c = document.createElement('canvas');
        c.width = Math.round(w0 * s); c.height = Math.round(h0 * s);
        c.getContext('2d').drawImage(src, 0, 0, c.width, c.height);
        return c.toDataURL('image/jpeg', 0.78);
      }

      // Enregistrement
      const saveBtn = d.querySelector('#cap-save');
      saveBtn.onclick = save;
      function save() {
        if (saving) return;
        const pick = (name) => form.querySelector(`[data-single="${name}"] [aria-pressed="true"]`)?.dataset.v || '';
        const lead = {
          id: leadId,
          name: val('name'), company: val('company'), role: val('role'),
          phone: val('phone').replace(/\s+/g, ' '), email: val('email').toLowerCase(),
          eventType: pick('eventType'), audience: pick('audience'), budget: pick('budget'),
          needs: $$('[data-multi="needs"] [aria-pressed="true"]', form).map((c) => c.dataset.v),
          period: val('period'), notes: val('notes'), temperature,
        };
        // Photo envoyée seulement si elle a changé : une photo encore en attente d'envoi n'est jamais écrasée
        if (photo !== (l.cardPhoto || null)) lead.cardPhoto = photo;
        if (!lead.name && !lead.company && !lead.phone && !lead.email) {
          toast({ title: 'Fiche vide', text: 'Renseignez au moins un nom, une société, un téléphone ou un e-mail.', tone: 'warm' });
          $('#f-name', d).focus();
          return;
        }
        if (lead.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(lead.email)) {
          toast({ title: 'E-mail à vérifier', text: esc(lead.email), tone: 'warm' });
          $('#f-email', d).focus();
          return;
        }
        if (!editing) { lead.operator = ctx.me().id; lead.capturedBy = ctx.me().id; }
        saving = true;
        saveBtn.disabled = true;
        stopCamera();
        markFresh(lead.id);
        ctx.hub.saveLead(lead); // enregistré sur la tablette tout de suite, envoyé au hub ensuite
        closeDrawer({ force: true });
        toast({
          title: editing ? 'Fiche mise à jour' : 'Contact enregistré',
          text: `${esc(lead.name || lead.company)}${ctx.hub.state.status === 'online' ? ' · visible sur toutes les tablettes' : ''}`,
          tone: lead.temperature === 'hot' ? 'hot' : 'live',
          actions: editing ? [] : [{ label: 'Voir la fiche', run: () => ctx.openLead(lead.id) }],
        });
      }

      return () => stopCamera();
    },
  });
}
