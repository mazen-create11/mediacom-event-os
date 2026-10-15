import { LOADS_DEFAULT, LINE_MAX } from '../data.js';
import { icon, esc, $, $$, toast, fmtN } from '../ui.js';

let el, ctx;
const KEY = 'mc_elec_v3';
let loads = (() => { try { return JSON.parse(localStorage.getItem(KEY)) || structuredClone(LOADS_DEFAULT); } catch { return structuredClone(LOADS_DEFAULT); } })();
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(loads)); } catch { /* */ } };
const LINES = [{ id: 'l1', label: 'Ligne 1', sub: 'PC 16 A · 230 V' }, { id: 'l2', label: 'Ligne 2', sub: 'PC 16 A · 230 V' }];
const PRESETS = [{ n: 'Lyre', w: 900 }, { n: 'Projecteur LED', w: 200 }, { n: 'Écran de retour', w: 150 }, { n: 'Console', w: 120 }, { n: 'Ordinateur', w: 250 }];

function arc(pct) {
  const r = 80, c = Math.PI * r;
  const p = Math.min(pct, 1.15);
  const col = pct > 1 ? '#ff4d4d' : pct > 0.8 ? '#ffb547' : '#3192ff';
  return `<svg viewBox="0 0 200 120" style="width:100%;max-width:300px;margin:0 auto">
    <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="rgba(255,255,255,.06)" stroke-width="14" stroke-linecap="round"/>
    <path d="M20 100 A80 80 0 0 1 180 100" fill="none" stroke="${col}" stroke-width="14" stroke-linecap="round"
      stroke-dasharray="${c}" stroke-dashoffset="${c * (1 - Math.min(p, 1))}" style="transition:stroke-dashoffset 900ms var(--ease-spring),stroke 400ms;filter:drop-shadow(0 0 8px ${col}88)"/>
    <text x="100" y="92" text-anchor="middle" font-family="JB Mono, monospace" font-weight="600" font-size="30" fill="#fff">${Math.round(pct * 100)}%</text>
  </svg>`;
}

function mount(root, c) {
  el = root;
  ctx = c;
  el.innerHTML = `<div class="rack">
    ${LINES.map((l, i) => `<article class="module span-6" style="--i:${i}">
      <header class="mod-head"><span class="n">0${i + 1}</span><span class="t">${l.label}</span><span class="r">${l.sub}</span></header>
      <div class="mod-body">
        <div id="el-g-${l.id}"></div>
        <div class="row" style="justify-content:center;gap:28px;margin-top:4px">
          <div class="kv" style="align-items:center"><span class="eyebrow">Puissance</span><b id="el-w-${l.id}"></b></div>
          <div class="kv" style="align-items:center"><span class="eyebrow">Intensité</span><b id="el-a-${l.id}"></b></div>
          <div class="kv" style="align-items:center"><span class="eyebrow">Marge</span><b id="el-m-${l.id}"></b></div>
        </div>
        <div id="el-warn-${l.id}" class="mt-2"></div>
        <div class="mt-2" id="el-list-${l.id}"></div>
      </div>
    </article>`).join('')}
    <article class="module span-12" style="--i:2">
      <header class="mod-head"><span class="n">03</span><span class="t">Ajouter un appareil</span><span class="r">valeurs indicatives, à confirmer par la direction technique</span></header>
      <div class="mod-body">
        <form class="row wrap" id="el-form" style="align-items:flex-end">
          <div class="field" style="flex:2;min-width:200px"><label for="el-n">Appareil</label><input class="input" id="el-n" placeholder="Nom de l’appareil" required></div>
          <div class="field" style="flex:1;min-width:120px"><label for="el-wv">Watts</label><input class="input" id="el-wv" inputmode="numeric" placeholder="900" required></div>
          <div class="field"><span class="lbl">Ligne</span><div class="seg" id="el-line" style="display:grid;grid-template-columns:1fr 1fr"><span class="thumb"></span><button type="button" data-l="l1" aria-selected="true">L1</button><button type="button" data-l="l2" aria-selected="false">L2</button></div></div>
          <button class="btn btn-primary">${icon('plus')}Ajouter</button>
        </form>
        <div class="chips sm mt-2" id="el-presets">${PRESETS.map((p) => `<button class="chip" data-p="${esc(p.n)}|${p.w}" aria-pressed="false">${esc(p.n)} · ${p.w} W</button>`).join('')}</div>
        <div class="row mt-3"><span class="dim" style="font-size:13px">Calcul : intensité = puissance ÷ 230 V. Seuil d’alerte à 80 % de ${fmtN(LINE_MAX)} W par ligne.</span><span class="spacer"></span><button class="btn btn-quiet btn-sm" id="el-reset">Revenir au stand type</button></div>
      </div>
    </article>
  </div>`;

  let line = 'l1';
  const seg = $('#el-line', el);
  const moveThumb = () => { const b = seg.querySelector('[aria-selected="true"]'); const t = seg.querySelector('.thumb'); t.style.width = b.offsetWidth + 'px'; t.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  new ResizeObserver(moveThumb).observe(seg);
  seg.addEventListener('click', (e) => { const b = e.target.closest('[data-l]'); if (!b) return; line = b.dataset.l; $$('[data-l]', seg).forEach((x) => x.setAttribute('aria-selected', x === b)); moveThumb(); });
  $('#el-presets', el).addEventListener('click', (e) => { const b = e.target.closest('[data-p]'); if (!b) return; const [n, w] = b.dataset.p.split('|'); $('#el-n', el).value = n; $('#el-wv', el).value = w; });
  $('#el-form', el).addEventListener('submit', (e) => {
    e.preventDefault();
    const name = $('#el-n', el).value.trim(), w = Math.round(Number($('#el-wv', el).value.replace(/\s/g, '')));
    if (!name || !(w > 0)) return toast({ title: 'Nom et puissance requis', tone: 'warm' });
    loads[line].push({ id: 'x' + Date.now().toString(36), name, w });
    save(); render();
    $('#el-n', el).value = ''; $('#el-wv', el).value = '';
    const tot = loads[line].reduce((s, x) => s + x.w, 0);
    if (tot > LINE_MAX) toast({ title: `${line === 'l1' ? 'Ligne 1' : 'Ligne 2'} en surcharge`, text: `${fmtN(tot)} W pour ${fmtN(LINE_MAX)} W disponibles : risque de disjonction.`, tone: 'hot', timeout: 7000 });
  });
  el.addEventListener('click', (e) => {
    const b = e.target.closest('[data-rm]');
    if (b) { const [l, id] = b.dataset.rm.split('|'); loads[l] = loads[l].filter((x) => x.id !== id); save(); render(); }
  });
  $('#el-reset', el).addEventListener('click', () => { loads = structuredClone(LOADS_DEFAULT); save(); render(); });
  render();
}

function render() {
  for (const l of LINES) {
    const items = loads[l.id];
    const w = items.reduce((s, x) => s + x.w, 0);
    const pct = w / LINE_MAX;
    $(`#el-g-${l.id}`, el).innerHTML = arc(pct);
    $(`#el-w-${l.id}`, el).textContent = `${fmtN(w)} W`;
    $(`#el-a-${l.id}`, el).textContent = `${(w / 230).toFixed(1).replace('.', ',')} A`;
    $(`#el-m-${l.id}`, el).textContent = `${fmtN(Math.max(0, LINE_MAX - w))} W`;
    $(`#el-m-${l.id}`, el).style.color = pct > 1 ? 'var(--hot)' : pct > 0.8 ? 'var(--warm)' : '';
    $(`#el-warn-${l.id}`, el).innerHTML = pct > 1
      ? `<div class="banner" style="background:rgba(255,77,77,.08);border-color:rgba(255,77,77,.4);color:#ffb3b3">${icon('alert')}<div>Surcharge : déplacez ${fmtN(w - LINE_MAX)} W vers l’autre ligne.</div></div>`
      : pct > 0.8 ? `<div class="banner">${icon('alert')}<div>Ligne chargée à plus de 80 %. Évitez d’ajouter un appareil.</div></div>` : '';
    $(`#el-list-${l.id}`, el).innerHTML = items.map((x) => `<div class="load-row"><span>${esc(x.name)}</span><span class="w">${fmtN(x.w)} W</span>
      <button class="btn btn-quiet btn-icon btn-sm" data-rm="${l.id}|${x.id}" aria-label="Retirer ${esc(x.name)}">${icon('x')}</button></div>`).join('') || '<p class="dim" style="font-size:13px">Aucun appareil sur cette ligne.</p>';
  }
}

export default {
  id: 'elec', title: 'Électricité', short: 'Élec', sub: 'Charge des deux lignes du stand', icon: 'elec',
  mount,
};
