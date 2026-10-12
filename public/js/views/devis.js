import { TARIFS_DEFAULT, EVENT_TYPES, opById } from '../data.js';
import { icon, esc, $, $$, toast, fmtEUR, reduced } from '../ui.js';

let el, ctx;
const cfg = { type: 'Séminaire / plénière', pax: 300, days: 1, opts: new Set(['son', 'lumiere']) };
let shown = { min: 0, max: 0 };

const tarifs = () => {
  const t = ctx.hub.state.tarifs;
  return t && Array.isArray(t.options) ? t : structuredClone(TARIFS_DEFAULT);
};

function compute() {
  const t = tarifs();
  const pal = t.audience.find((a) => cfg.pax <= (a.max ?? Infinity)) || t.audience[t.audience.length - 1];
  const lines = [{ l: 'Forfait de base (équipe, transport, montage)', v: t.base }];
  if (pal.add) lines.push({ l: `Jauge ${cfg.pax} personnes`, v: pal.add });
  const quote = [];
  for (const o of t.options) {
    if (!cfg.opts.has(o.id)) continue;
    if (o.price == null || o.price === '') quote.push(o.label);
    else lines.push({ l: o.label, v: Number(o.price) });
  }
  const sub = lines.reduce((s, x) => s + x.v, 0);
  const mult = 1 + (cfg.days - 1) * (t.days ?? 0.6);
  if (cfg.days > 1) lines.push({ l: `${cfg.days} jours d’exploitation (× ${mult.toFixed(2).replace('.', ',')})`, v: Math.round(sub * (mult - 1)) });
  const min = Math.round((sub * mult) / 50) * 50;
  const max = Math.round((min * (t.spread || 1.35)) / 50) * 50;
  return { lines, quote, min, max, t };
}

function mount(root, c) {
  el = root;
  ctx = c;
  el.innerHTML = `<div class="rack">
    <article class="module span-7 md-7" style="--i:0">
      <header class="mod-head"><span class="n">01</span><span class="t">Configuration</span></header>
      <div class="mod-body stack">
        <div class="field"><span class="lbl">Type d’événement</span><div class="chips sm" id="dv-type">${EVENT_TYPES.map((t) => `<button class="chip" data-v="${esc(t)}" aria-pressed="${t === cfg.type}">${esc(t)}</button>`).join('')}</div></div>
        <div class="fader"><label for="dv-pax">Participants</label><output id="dv-pax-o" for="dv-pax"></output><input type="range" id="dv-pax" min="50" max="3000" step="50" value="${cfg.pax}"></div>
        <div class="fader"><label for="dv-days">Jours d’exploitation</label><output id="dv-days-o" for="dv-days"></output><input type="range" id="dv-days" min="1" max="5" step="1" value="${cfg.days}"></div>
        <div id="dv-opts"></div>
      </div>
    </article>

    <article class="module span-5 md-5 sticky" style="--i:1">
      <header class="mod-head"><span class="n">02</span><span class="t">Estimation</span><span class="r">HT</span></header>
      <div class="mod-body">
        <div id="dv-banner"></div>
        <span class="eyebrow">Fourchette indicative</span>
        <div class="range mt-2"><span class="eyebrow">de</span><span class="big-num" id="dv-min">0</span><span class="eyebrow">à</span><span class="big-num" id="dv-max" style="color:var(--blue-2)">0</span></div>
        <div class="divider"></div>
        <div id="dv-lines"></div>
        <div id="dv-quote"></div>
        <div class="row wrap mt-3">
          <button class="btn btn-primary btn-sm" id="dv-lead">${icon('plus')}Associer à un contact</button>
          <button class="btn btn-quiet btn-sm" id="dv-copy">${icon('copy')}Copier</button>
          <button class="btn btn-quiet btn-sm" id="dv-print">${icon('print')}Imprimer</button>
        </div>
      </div>
    </article>

    <article class="module span-12" style="--i:2">
      <header class="mod-head"><span class="n">03</span><span class="t">Barème</span><span class="r" id="dv-status"></span></header>
      <div class="mod-body">
        <p class="lede" style="margin-top:0">Montants de départ repris de l’ancienne version, jamais validés. Éric les corrige ici puis valide : le bandeau d’avertissement disparaît sur toutes les tablettes.</p>
        <div id="dv-edit" class="mt-2" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(210px,1fr));gap:12px"></div>
        <div class="row wrap mt-3">
          <input class="input" id="dv-by" placeholder="Validé par (nom)" style="max-width:240px;height:44px">
          <button class="btn btn-quiet btn-sm" id="dv-validate">${icon('check')}Valider le barème</button>
          <span class="spacer"></span>
          <button class="btn btn-quiet btn-sm" id="dv-reset">Revenir aux valeurs de départ</button>
        </div>
      </div>
    </article>
  </div>`;

  const pax = $('#dv-pax', el), days = $('#dv-days', el);
  const sync = () => {
    cfg.pax = Number(pax.value); cfg.days = Number(days.value);
    for (const r of [pax, days]) r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
    $('#dv-pax-o', el).textContent = `${cfg.pax.toLocaleString('fr-FR')} pers.`;
    $('#dv-days-o', el).textContent = `${cfg.days} jour${cfg.days > 1 ? 's' : ''}`;
    renderResult();
  };
  pax.addEventListener('input', sync);
  days.addEventListener('input', sync);
  $('#dv-type', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-v]');
    if (!b) return;
    cfg.type = b.dataset.v;
    $$('[data-v]', $('#dv-type', el)).forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderResult();
  });
  $('#dv-opts', el).addEventListener('click', (e) => {
    const s = e.target.closest('[data-opt]');
    if (!s) return;
    cfg.opts.has(s.dataset.opt) ? cfg.opts.delete(s.dataset.opt) : cfg.opts.add(s.dataset.opt);
    s.setAttribute('aria-checked', cfg.opts.has(s.dataset.opt));
    renderResult();
  });

  $('#dv-lead', el).addEventListener('click', () => ctx.newLead({ eventType: cfg.type, notes: recap(), needs: neededFromOpts() }));
  $('#dv-copy', el).addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(recap()); toast({ title: 'Récapitulatif copié', tone: 'live' }); }
    catch { toast({ title: 'Copie impossible ici', text: 'Utilisez « Associer à un contact ».', tone: 'warm' }); }
  });
  $('#dv-print', el).addEventListener('click', printQuote);

  $('#dv-edit', el).addEventListener('change', (e) => {
    const i = e.target.closest('[data-k]');
    if (!i) return;
    const t = tarifs();
    const v = i.value.trim() === '' ? null : Math.max(0, Number(i.value.replace(',', '.')));
    const k = i.dataset.k;
    if (k === 'base') t.base = v ?? 0;
    else if (k === 'spread') t.spread = v || 1.35;
    else if (k === 'days') t.days = v ?? 0.6;
    else if (k.startsWith('aud')) t.audience[Number(k.slice(3))].add = v ?? 0;
    else t.options.find((o) => o.id === k).price = v;
    t.status = 'A_VALIDER'; t.validatedBy = ''; t.validatedAt = 0;
    ctx.hub.setTarifs(t);
  });
  $('#dv-validate', el).addEventListener('click', () => {
    const by = $('#dv-by', el).value.trim();
    if (!by) { toast({ title: 'Indiquez qui valide', tone: 'warm' }); $('#dv-by', el).focus(); return; }
    ctx.hub.setTarifs({ ...tarifs(), status: 'VALIDE', validatedBy: by, validatedAt: Date.now() });
    toast({ title: 'Barème validé', text: `par ${esc(by)}`, tone: 'live' });
  });
  $('#dv-reset', el).addEventListener('click', () => ctx.hub.setTarifs(structuredClone(TARIFS_DEFAULT)));
  sync();
  update();
}

function neededFromOpts() {
  const map = { son: 'Son', lumiere: 'Lumière', led: 'Écran LED', stream: 'Streaming', scene: 'Scène mobile MediaScène', mapping: 'Mapping laser façade' };
  return [...cfg.opts].map((o) => map[o]).filter(Boolean);
}

function recap() {
  const r = compute();
  const t = r.t;
  return [`Estimation Médiacom (${t.status === 'VALIDE' ? 'barème validé' : 'indicative, non contractuelle'})`,
    `${cfg.type} · ${cfg.pax} personnes · ${cfg.days} jour${cfg.days > 1 ? 's' : ''}`,
    ...r.lines.map((x) => `- ${x.l} : ${fmtEUR(x.v)}`),
    r.quote.length ? `- Sur devis : ${r.quote.join(', ')}` : '',
    `Fourchette : ${fmtEUR(r.min)} à ${fmtEUR(r.max)} HT`].filter(Boolean).join('\n');
}

function tween(from, to) {
  if (reduced()) { setNums(to.min, to.max); return; }
  const t0 = performance.now(), d = 520;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / d);
    const e = 1 - (1 - k) ** 3;
    setNums(from.min + (to.min - from.min) * e, from.max + (to.max - from.max) * e);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
function setNums(a, b) {
  $('#dv-min', el).textContent = fmtEUR(Math.round(a / 10) * 10);
  $('#dv-max', el).textContent = fmtEUR(Math.round(b / 10) * 10);
}

function renderResult() {
  const r = compute();
  $('#dv-lines', el).innerHTML = r.lines.map((x) => `<div class="row" style="justify-content:space-between;padding:7px 0;font-size:14px;border-bottom:1px solid var(--line)"><span class="muted">${esc(x.l)}</span><span class="mono">${fmtEUR(x.v)}</span></div>`).join('');
  $('#dv-quote', el).innerHTML = r.quote.length ? `<div class="row wrap mt-2" style="gap:6px"><span class="eyebrow">Sur devis</span>${r.quote.map((q) => `<span class="tag">${esc(q)}</span>`).join('')}</div>` : '';
  const next = { min: r.min, max: r.max };
  tween(shown, next);
  shown = next;
}

function printQuote() {
  const r = compute();
  const w = window.open('', '_blank');
  if (!w) { toast({ title: 'Fenêtre bloquée', text: 'Autorisez les fenêtres pour imprimer.', tone: 'warm' }); return; }
  w.document.write(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>Estimation Médiacom</title>
    <style>body{font:15px/1.5 system-ui,sans-serif;color:#0b1220;margin:40px;max-width:720px}h1{font-size:24px;margin:0 0 4px}small{color:#5b6779}
    table{width:100%;border-collapse:collapse;margin:20px 0}td{padding:8px 0;border-bottom:1px solid #e3e8ef}td:last-child{text-align:right;font-variant-numeric:tabular-nums}
    .tot{font-size:22px;font-weight:600;margin-top:12px}.warn{margin-top:24px;padding:10px 12px;border:1px solid #f0c27a;background:#fff8ec;font-size:13px}</style></head><body>
    <h1>Estimation Médiacom</h1><small>${esc(cfg.type)} · ${cfg.pax} personnes · ${cfg.days} jour${cfg.days > 1 ? 's' : ''} · ${new Date().toLocaleDateString('fr-FR')}</small>
    <table>${r.lines.map((x) => `<tr><td>${esc(x.l)}</td><td>${fmtEUR(x.v)}</td></tr>`).join('')}${r.quote.map((q) => `<tr><td>${esc(q)}</td><td>sur devis</td></tr>`).join('')}</table>
    <div class="tot">Fourchette : ${fmtEUR(r.min)} à ${fmtEUR(r.max)} HT</div>
    <div class="warn">${r.t.status === 'VALIDE' ? `Barème validé par ${esc(r.t.validatedBy)}. ` : ''}Estimation indicative et non contractuelle, établie sur le salon. Un devis détaillé suit après visite technique ou brief.</div>
    <p><small>Médiacom · 25 bd de Saint-Marcel, 13011 Marseille · 04 91 35 55 55 · contact@mediacom.org</small></p>
    <script>onload=()=>print()<\/script></body></html>`);
  w.document.close();
}

function update() {
  if (!el) return;
  const t = tarifs();
  $('#dv-opts', el).innerHTML = t.options.map((o) => `<div class="toggle-row"><div class="l"><b>${esc(o.label)}</b><small>${o.price == null ? 'Sur devis' : fmtEUR(o.price) + ' HT'}</small></div>
    <button class="switch" role="switch" data-opt="${o.id}" aria-checked="${cfg.opts.has(o.id)}" aria-label="${esc(o.label)}"></button></div>`).join('');
  const valid = t.status === 'VALIDE';
  $('#dv-banner', el).innerHTML = valid ? '' : `<div class="banner" style="margin-bottom:16px">${icon('alert')}<div>Barème à valider par Éric. Estimation indicative, non contractuelle.</div></div>`;
  $('#dv-status', el).innerHTML = valid ? `<span class="led on"></span>validé par ${esc(t.validatedBy)}` : '<span class="led" data-s="warm"></span>à valider';
  const field = (k, label, v, suffix = '€') => `<div class="field"><label for="dv-e-${k}">${esc(label)}</label><div class="row"><input class="input" id="dv-e-${k}" data-k="${k}" inputmode="decimal" value="${v ?? ''}" placeholder="sur devis" style="height:44px"><span class="dim mono" style="width:22px">${suffix}</span></div></div>`;
  if (!el.contains(document.activeElement) || !document.activeElement.dataset.k) {
    $('#dv-edit', el).innerHTML = [field('base', 'Forfait de base', t.base),
      ...t.audience.map((a, i) => field('aud' + i, a.max === Infinity || a.max == null ? `Jauge au-delà de ${t.audience[i - 1]?.max ?? 0}` : `Jauge jusqu’à ${a.max}`, a.add)),
      ...t.options.map((o) => field(o.id, o.label, o.price)),
      field('days', 'Coefficient par jour en plus', t.days, '×'), field('spread', 'Écart haut de fourchette', t.spread, '×')].join('');
  }
  renderResult();
}

export default {
  id: 'devis', title: 'Devis express', short: 'Devis', sub: 'Fourchette indicative en direct', icon: 'devis',
  mount, update,
};
