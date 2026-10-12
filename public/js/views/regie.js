import { OPERATORS, NEEDS, opById, initial, isAgency } from '../data.js';
import { icon, esc, $, $$, odometer, ago, hhmm, LOGO_M } from '../ui.js';
import { leadRow, loadDemo } from './contacts.js';

let el, ctx;

const VU_MAX = 12; // contacts par heure en pleine échelle

function vuSVG() {
  const cx = 160, cy = 178, r = 140;
  const ticks = [];
  for (let v = 0; v <= VU_MAX; v += 0.5) {
    const a = (-48 + (v / VU_MAX) * 96) * (Math.PI / 180);
    const major = v % 3 === 0;
    const r1 = r - (major ? 16 : 9);
    const x1 = cx + Math.sin(a) * r1, y1 = cy - Math.cos(a) * r1;
    const x2 = cx + Math.sin(a) * r, y2 = cy - Math.cos(a) * r;
    const hot = v >= 9;
    ticks.push(`<line x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}" stroke="${hot ? '#ff4d4d' : 'rgba(200,215,240,.55)'}" stroke-width="${major ? 2 : 1}"/>`);
    if (major) {
      const rl = r - 30;
      ticks.push(`<text x="${(cx + Math.sin(a) * rl).toFixed(1)}" y="${(cy - Math.cos(a) * rl + 4).toFixed(1)}" text-anchor="middle" font-family="JB Mono, monospace" font-size="11" fill="${hot ? '#ff7a7a' : 'rgba(200,215,240,.6)'}">${v}</text>`);
    }
  }
  const arc = (from, to, rad) => {
    const a1 = (-48 + (from / VU_MAX) * 96) * (Math.PI / 180), a2 = (-48 + (to / VU_MAX) * 96) * (Math.PI / 180);
    return `M${(cx + Math.sin(a1) * rad).toFixed(1)} ${(cy - Math.cos(a1) * rad).toFixed(1)} A${rad} ${rad} 0 0 1 ${(cx + Math.sin(a2) * rad).toFixed(1)} ${(cy - Math.cos(a2) * rad).toFixed(1)}`;
  };
  return `<svg viewBox="0 0 320 160" role="img" aria-label="Cadence de contacts par heure">
    <defs><radialGradient id="vug" cx="50%" cy="100%" r="80%"><stop offset="0" stop-color="#3192ff" stop-opacity=".22"/><stop offset="1" stop-color="#3192ff" stop-opacity="0"/></radialGradient></defs>
    <rect width="320" height="160" fill="url(#vug)"/>
    <path d="${arc(0, 9, r + 4)}" stroke="rgba(49,146,255,.55)" stroke-width="2" fill="none"/>
    <path d="${arc(9, 12, r + 4)}" stroke="#ff4d4d" stroke-width="3" fill="none"/>
    ${ticks.join('')}
    <g class="needle" style="transform-origin:160px 178px;transform:rotate(-48deg)">
      <line x1="160" y1="178" x2="160" y2="44" stroke="#f3f6fb" stroke-width="2" stroke-linecap="round"/>
      <line x1="160" y1="70" x2="160" y2="44" stroke="#ff4d4d" stroke-width="2" stroke-linecap="round"/>
    </g>
    <circle cx="160" cy="178" r="26" fill="#0a111e" stroke="rgba(160,190,235,.2)"/>
  </svg>`;
}

function mount(root, c) {
  el = root;
  ctx = c;
  el.innerHTML = `<div class="rack">
    <article class="module span-4" style="--i:0">
      <header class="mod-head"><span class="n">01</span><span class="t">Contacts du stand</span><span class="r" id="rg-today"></span></header>
      <div class="mod-body">
        <div class="unit-row"><div class="big-num" id="rg-total">0</div>
          <div class="kv" style="text-align:right"><span class="eyebrow">Dernière heure</span><b id="rg-hour">0</b></div></div>
        <div class="vu mt-2" id="rg-vu">${vuSVG()}<span class="vu-label">Contacts / heure</span><span class="vu-val" id="rg-vu-val">0</span></div>
      </div>
    </article>

    <article class="module span-4" style="--i:1">
      <header class="mod-head"><span class="n">02</span><span class="t">Contacts chauds</span><span class="r"><span class="led" data-s="hot"></span>priorité</span></header>
      <div class="mod-body">
        <div class="unit-row"><div class="big-num hot" id="rg-hot">0</div>
          <div class="kv" style="text-align:right"><span class="eyebrow">Part du total</span><b id="rg-hot-pct">0 %</b></div></div>
        <div class="segbar hot mt-3" id="rg-hot-bar"></div>
        <div class="row mt-3" style="gap:18px">
          <div class="kv"><span class="eyebrow">Tièdes</span><b id="rg-warm">0</b></div>
          <div class="kv"><span class="eyebrow">Froids</span><b id="rg-cold">0</b></div>
          <div class="kv"><span class="eyebrow">Agences</span><b id="rg-ag">0</b></div>
          <div class="kv"><span class="eyebrow">Transferts</span><b id="rg-tr">0</b></div>
        </div>
      </div>
    </article>

    <article class="module span-4 md-full" style="--i:2">
      <header class="mod-head"><span class="n">03</span><span class="t">Mur LED</span><span class="r" id="rg-wall-state"></span></header>
      <div class="mod-body">
        <a class="wall-preview" href="#mur" aria-label="Piloter le mur LED" id="rg-wall"></a>
        <div class="row mt-2"><div class="kv"><span class="eyebrow">Mots reçus</span><b id="rg-words">0</b></div>
          <div class="kv"><span class="eyebrow">Envois</span><b id="rg-sends">0</b></div>
          <span class="spacer"></span><a class="btn btn-quiet btn-sm" href="#mur">Piloter ${icon('right')}</a></div>
      </div>
    </article>

    <article class="module span-5" style="--i:3">
      <header class="mod-head"><span class="n">04</span><span class="t">Équipe · tranches</span><span class="r">contacts suivis</span></header>
      <div class="mod-body"><div class="strips" id="rg-strips"></div></div>
    </article>

    <article class="module span-7" style="--i:4">
      <header class="mod-head"><span class="n">05</span><span class="t">Timeline du jour</span><span class="r" id="rg-tl-range"></span></header>
      <div class="mod-body">
        <div class="spectrum" id="rg-spectrum" style="height:172px"></div>
        <div class="spectrum-axis" id="rg-axis"></div>
      </div>
    </article>

    <article class="module span-7" style="--i:5">
      <header class="mod-head"><span class="n">06</span><span class="t">Derniers contacts</span><span class="r"><a href="#contacts" class="dim">Tout voir</a><span class="dim">·</span><a href="/bilan" class="bilan-link">Bilan du jour</a></span></header>
      <div class="mod-body" style="padding:8px 10px 10px" id="rg-latest"></div>
    </article>

    <article class="module span-5" style="--i:6">
      <header class="mod-head"><span class="n">07</span><span class="t">Besoins exprimés</span><span class="r">sur tout le salon</span></header>
      <div class="mod-body"><div class="stack" id="rg-needs" style="gap:12px"></div></div>
    </article>
  </div>`;

  // Aperçu en direct du mur (mise à l'échelle de l'iframe 1600 × 800)
  const wall = $('#rg-wall', el);
  wall.innerHTML = `<iframe src="/mur.html?preview=1" title="Aperçu du mur LED" loading="lazy" tabindex="-1"></iframe>`;
  const fit = () => { const f = wall.querySelector('iframe'); f.style.transform = `scale(${wall.clientWidth / 1600})`; };
  new ResizeObserver(fit).observe(wall);

  el.addEventListener('click', (e) => {
    const strip = e.target.closest('[data-strip]');
    if (strip) { ctx.go('contacts'); import('./contacts.js').then((m) => m.default.filterBy?.(strip.dataset.strip)); }
    const row = e.target.closest('[data-lead]');
    if (row) ctx.openLead(row.dataset.lead);
    if (e.target.closest('[data-demo]')) loadDemo(ctx);
  });
  update();
  setInterval(() => { if (el.classList.contains('is-active')) update('tick'); }, 30000);
}

function update(reason) {
  if (!el || reason === 'tarifs' || reason === 'settings') return;
  if (reason === 'words' || reason === 'wall') return updateWall();
  const { leads, words } = ctx.hub.state;
  const now = Date.now();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const today = leads.filter((l) => (l.createdAt || 0) >= startOfDay.getTime());
  const lastHour = leads.filter((l) => now - (l.createdAt || 0) < 3600000).length;
  const hot = leads.filter((l) => l.temperature === 'hot').length;

  odometer($('#rg-total', el), leads.length);
  odometer($('#rg-hot', el), hot);
  $('#rg-hour', el).textContent = lastHour;
  $('#rg-today', el).textContent = `${today.length} aujourd’hui`;
  $('#rg-vu-val', el).textContent = `${lastHour}/h`;
  const v = Math.min(lastHour, VU_MAX);
  $('#rg-vu .needle', el).style.transform = `rotate(${-48 + (v / VU_MAX) * 96}deg)`;

  const pct = leads.length ? Math.round((hot / leads.length) * 100) : 0;
  $('#rg-hot-pct', el).textContent = `${pct} %`;
  $('#rg-hot-bar', el).style.setProperty('--level', pct / 100);
  $('#rg-warm', el).textContent = leads.filter((l) => l.temperature === 'warm').length;
  $('#rg-cold', el).textContent = leads.filter((l) => l.temperature === 'cold').length;
  $('#rg-tr', el).textContent = leads.filter((l) => l.transfer).length;
  $('#rg-ag', el).textContent = leads.filter(isAgency).length;

  const visible = words.filter((w) => !w.hidden);
  $('#rg-words', el).textContent = visible.length;
  $('#rg-sends', el).textContent = words.reduce((s, w) => s + (w.count || 1), 0);
  const wall = ctx.hub.state.wall || {};
  $('#rg-wall-state', el).innerHTML = wall.scene === 'black' ? '<span class="led"></span>noir' : `<span class="led" data-s="hot"></span>${wall.accept === false ? 'en pause' : 'en direct'}`;

  // Tranches d'équipe
  const me = ctx.me().id;
  const online = new Set(ctx.hub.state.presence.map((p) => p.op));
  if (ctx.hub.state.status === 'online') online.add(me);
  const counts = OPERATORS.map((o) => leads.filter((l) => l.operator === o.id));
  const max = Math.max(4, ...counts.map((c) => c.length));
  $('#rg-strips', el).innerHTML = OPERATORS.map((o, i) => {
    const mine = counts[i];
    const h = mine.filter((l) => l.temperature === 'hot').length;
    return `<button class="strip ${o.id === me ? 'me' : ''}" data-strip="${o.id}" aria-label="Contacts de ${esc(o.name)}">
      <span class="scribble">${esc(o.name)}</span>
      <span class="strip-meters"><span class="meter" style="--level:${(mine.length / max).toFixed(3)}"></span><span class="meter thin" style="--level:${(h / max).toFixed(3)}"></span></span>
      <span class="count mono">${mine.length}</span>
      <span class="state"><span class="led ${online.has(o.id) ? 'on' : ''}"></span>${online.has(o.id) ? 'connecté' : 'absent'}</span>
    </button>`;
  }).join('');

  // Timeline par tranches de 30 minutes
  const firstH = Math.min(9, ...today.map((l) => new Date(l.createdAt).getHours()));
  const lastH = Math.max(19, new Date().getHours() + 1);
  const slots = (lastH - firstH) * 2;
  const bins = Array.from({ length: slots }, () => ({ n: 0, hot: false }));
  for (const l of today) {
    const d = new Date(l.createdAt);
    const i = (d.getHours() - firstH) * 2 + (d.getMinutes() >= 30 ? 1 : 0);
    if (bins[i]) { bins[i].n++; if (l.temperature === 'hot') bins[i].hot = true; }
  }
  const nowSlot = (new Date().getHours() - firstH) * 2 + (new Date().getMinutes() >= 30 ? 1 : 0);
  const peak = Math.max(3, ...bins.map((b) => b.n));
  $('#rg-spectrum', el).innerHTML = bins.map((b, i) => `<span class="bar ${b.hot ? 'hot' : ''} ${i === nowSlot ? 'now' : ''} ${i > nowSlot ? 'future' : ''}" title="${String(firstH + Math.floor(i / 2)).padStart(2, '0')}:${i % 2 ? '30' : '00'} · ${b.n} contact${b.n > 1 ? 's' : ''}"><i style="--h:${(b.n / peak).toFixed(3)}"></i></span>`).join('');
  $('#rg-axis', el).innerHTML = [firstH, Math.round((firstH + lastH) / 2), lastH].map((h) => `<span>${String(h).padStart(2, '0')}:00</span>`).join('');
  $('#rg-tl-range', el).textContent = 'tranches de 30 min';

  // Besoins
  const needCount = new Map();
  for (const l of leads) for (const n of l.needs || []) needCount.set(n, (needCount.get(n) || 0) + 1);
  const top = [...needCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const topMax = top[0]?.[1] || 1;
  $('#rg-needs', el).innerHTML = top.length
    ? top.map(([n, c]) => `<div><div class="row" style="justify-content:space-between;font-size:13.5px"><span>${esc(n)}</span><span class="mono dim">${c}</span></div>
        <div class="segbar calm mt-1" style="height:8px;--level:${(c / topMax).toFixed(3)}"></div></div>`).join('')
    : '<p class="dim" style="margin:0;font-size:13.5px">Les besoins cochés à la saisie s’afficheront ici.</p>';

  // Derniers contacts
  const latest = leads.slice(0, 4);
  $('#rg-latest', el).innerHTML = latest.length
    ? latest.map((l) => leadRow(l, ctx)).join('')
    : `<div class="empty">${LOGO_M}<div><b style="color:var(--text);font-weight:500">Premier contact du salon</b><br>Appuyez sur « Nouveau contact » : 20 secondes suffisent.</div>
        <button class="btn btn-quiet btn-sm" data-demo>Charger une démo</button></div>`;
}

function updateWall() {
  const { words } = ctx.hub.state;
  $('#rg-words', el).textContent = words.filter((w) => !w.hidden).length;
  $('#rg-sends', el).textContent = words.reduce((s, w) => s + (w.count || 1), 0);
  const wall = ctx.hub.state.wall || {};
  $('#rg-wall-state', el).innerHTML = wall.scene === 'black' ? '<span class="led"></span>noir' : `<span class="led" data-s="hot"></span>${wall.accept === false ? 'en pause' : 'en direct'}`;
}

export default {
  id: 'regie', title: 'Régie', short: 'Régie', sub: 'Vue d’ensemble du stand', icon: 'regie',
  mount, update,
  enter() { update(); },
};
