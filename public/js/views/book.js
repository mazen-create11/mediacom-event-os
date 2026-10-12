import { PHOTOS, UNIVERS, MEDIASCENE, GEAR, photo } from '../data.js';
import { icon, esc, $, $$, LOGO_M, reduced } from '../ui.js';

let el, ctx;
let univers = 'all';

function mount(root, c) {
  el = root;
  ctx = c;
  const ms = MEDIASCENE.photos;
  el.innerHTML = `<div class="stagger-root">
    <section class="book-hero" style="--i:0">
      <img id="bk-hero-img" src="${photo(ms[0].f)}" alt="${esc(ms[0].c)}" fetchpriority="high">
      <div class="copy">
        <span class="eyebrow" style="color:#9cc8ff">Scène mobile · <b>MediaScène</b></span>
        <h2>La scène mobile qui se déploie en 2&nbsp;heures.</h2>
        <p>Podium hydraulique de 60&nbsp;m², déployé par deux personnes, toiture calculée pour un vent de 72&nbsp;km/h. Son, lumière et écrans fournis par la même équipe.</p>
        <div class="row wrap">
          <button class="btn btn-primary" data-present="mediascene">${icon('play')}Présenter</button>
          <button class="btn btn-ghost" data-lead-need="Scène mobile MediaScène">${icon('plus')}Contact intéressé</button>
        </div>
      </div>
    </section>

    <div class="spec-grid mt-2" style="--i:1">${MEDIASCENE.specs.map((s) => `<div class="spec"><b>${esc(s.v)}</b><span>${esc(s.l)}</span></div>`).join('')}</div>

    <div class="row wrap mt-4" style="--i:2;align-items:flex-end">
      <div><span class="eyebrow">Réalisations</span><h2 class="h2 mt-1">Ce que nos équipes ont mis en lumière</h2></div>
      <span class="spacer"></span>
      <button class="btn btn-quiet" data-present="gallery">${icon('expand')}Présenter la sélection</button>
    </div>
    <div class="chips sm mt-2" id="bk-filters" role="group" aria-label="Univers" style="--i:3">
      ${UNIVERS.map((u) => `<button class="chip" data-u="${u.id}" aria-pressed="${u.id === univers}">${esc(u.label)}</button>`).join('')}
    </div>
    <div class="gallery mt-3" id="bk-gallery" style="--i:4"></div>

    <div class="module mt-3" style="--i:5">
      <header class="mod-head"><span class="n">PARC</span><span class="t">Matériel cité sur mediacom.org</span></header>
      <div class="mod-body row wrap">${GEAR.map((g) => `<span class="tag blue" style="height:30px;font-size:13px">${esc(g)}</span>`).join('')}
        <span class="dim" style="font-size:13px">Partenaire L-Acoustics · parc son, lumière, vidéo, structures et distribution électrique</span></div>
    </div>
    <p class="dim mt-2" style="font-size:12px">Photos : mediacom.org. Crédits mentionnés sur les images concernées (Benjamin Gayté-Sorbier, Sophie Vernet).</p>
  </div>`;

  // Fondu enchaîné discret sur la photo d'ouverture
  let i = 0;
  const img = $('#bk-hero-img', el);
  if (!reduced()) setInterval(() => {
    if (!el.classList.contains('is-active') || document.hidden) return;
    i = (i + 1) % ms.length;
    const next = new Image();
    next.src = photo(ms[i].f);
    next.decode().then(() => {
      img.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, easing: 'ease-out', fill: 'forwards' }).finished.then(() => {
        img.src = next.src; img.alt = ms[i].c;
        img.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 700, easing: 'ease-out', fill: 'forwards' });
      });
    }).catch(() => {});
  }, 8000);

  $('#bk-filters', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-u]');
    if (!b) return;
    univers = b.dataset.u;
    $$('[data-u]', el).forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderGallery();
  });
  el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-present]');
    if (p) present(p.dataset.present === 'mediascene' ? MEDIASCENE.photos : current(), 0, p.dataset.present === 'mediascene' ? 'MediaScène' : 'Réalisations');
    const shot = e.target.closest('[data-shot]');
    if (shot) present(current(), Number(shot.dataset.shot), 'Réalisations');
    const need = e.target.closest('[data-lead-need]');
    if (need) ctx.newLead({ needs: [need.dataset.leadNeed], notes: '' });
  });
  renderGallery();
}

const current = () => PHOTOS.filter((p) => univers === 'all' || p.u === univers);

function renderGallery() {
  const label = Object.fromEntries(UNIVERS.map((u) => [u.id, u.label]));
  $('#bk-gallery', el).innerHTML = current().map((p, i) => `<button class="shot" data-shot="${i}" aria-label="Agrandir : ${esc(p.c)}" style="animation:rise 600ms var(--ease-out) both;animation-delay:${Math.min(i, 12) * 40}ms">
      <img src="${photo(p.f, true)}" alt="${esc(p.c)}" width="${p.w}" height="${p.h}" loading="lazy" decoding="async">
      <figcaption><span class="eyebrow">${esc(label[p.u])}</span>${esc(p.c)}</figcaption></button>`).join('');
}

/* ---------- Mode présentation plein écran ---------- */
export function present(list, start = 0, title = '', { attract = false } = {}) {
  const host = $('#show');
  let idx = start, playing = !reduced(), timer = 0, bar = null;
  host.innerHTML = `${list.map((p, i) => `<div class="slide" data-i="${i}"><img alt="${esc(p.c)}" decoding="async"></div>`).join('')}
    <div class="shade"></div>
    <div class="brand">${LOGO_M}<span>Médiacom · ${esc(title)}</span></div>
    <div class="cap"><span class="eyebrow" id="sh-k" style="color:#9cc8ff"></span><h3 id="sh-t"></h3></div>
    <div class="ctrl">
      <button class="btn btn-quiet btn-icon" data-sh="prev" aria-label="Précédente">${icon('left')}</button>
      <button class="btn btn-quiet btn-icon" data-sh="play" aria-label="Lecture ou pause"></button>
      <button class="btn btn-quiet btn-icon" data-sh="next" aria-label="Suivante">${icon('right')}</button>
      <button class="btn btn-quiet btn-icon" data-sh="close" aria-label="Fermer">${icon('x')}</button>
    </div>
    <div class="progress"><i></i></div>
    ${attract ? '<div class="attract-hint"><span class="eyebrow" style="color:#fff">Touchez l’écran pour découvrir Médiacom</span></div>' : ''}`;
  const slides = $$('.slide', host);
  const load = (i) => { const im = slides[i]?.querySelector('img'); if (im && !im.src) im.src = photo(list[i].f); };
  const show = (i) => {
    idx = (i + list.length) % list.length;
    load(idx); load((idx + 1) % list.length);
    slides.forEach((s, k) => s.classList.toggle('on', k === idx));
    $('#sh-k', host).textContent = `${String(idx + 1).padStart(2, '0')} / ${String(list.length).padStart(2, '0')}`;
    $('#sh-t', host).textContent = list[idx].c;
    const cap = $('.cap', host);
    cap.getAnimations().forEach((a) => a.cancel());
    cap.animate([{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(4px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 700, easing: 'cubic-bezier(.22,1,.36,1)' });
    restart();
  };
  const restart = () => {
    clearTimeout(timer);
    bar?.cancel();
    $('[data-sh="play"]', host).innerHTML = icon(playing ? 'pause' : 'play');
    if (!playing) return;
    bar = $('.progress i', host).animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: 6500, easing: 'linear', fill: 'forwards' });
    timer = setTimeout(() => show(idx + 1), 6500);
  };
  const close = () => {
    clearTimeout(timer);
    host.classList.remove('is-open');
    document.removeEventListener('keydown', onKey);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    host.innerHTML = '';
  };
  const onKey = (e) => {
    if (e.key === 'Escape') close();
    if (e.key === 'ArrowRight') show(idx + 1);
    if (e.key === 'ArrowLeft') show(idx - 1);
    if (e.key === ' ') { e.preventDefault(); playing = !playing; restart(); }
  };
  let swiped = false;
  host.onclick = (e) => {
    if (attract) { close(); return; }
    if (swiped) { swiped = false; return; }
    const b = e.target.closest('[data-sh]');
    if (!b) { show(idx + 1); return; }
    const a = b.dataset.sh;
    if (a === 'prev') show(idx - 1);
    if (a === 'next') show(idx + 1);
    if (a === 'play') { playing = !playing; restart(); }
    if (a === 'close') close();
  };
  let x0 = null;
  host.onpointerdown = (e) => { x0 = e.clientX; };
  host.onpointerup = (e) => { if (x0 != null && Math.abs(e.clientX - x0) > 50) { swiped = true; show(idx + (e.clientX < x0 ? 1 : -1)); } x0 = null; };
  document.addEventListener('keydown', onKey);
  host.classList.add('is-open');
  host.classList.toggle('attract', attract);
  if (!attract) host.requestFullscreen?.().catch(() => {});
  show(idx);
}

export default {
  id: 'book', title: 'Book', short: 'Book', sub: 'Réalisations et MediaScène', icon: 'book',
  mount,
};
