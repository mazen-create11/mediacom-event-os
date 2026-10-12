import { PHOTOS, VIDEOS, UNIVERS, MEDIASCENE, PROOFS, GEAR, photo, video, poster } from '../data.js';
import { icon, esc, $, $$, LOGO_M, reduced } from '../ui.js';

let el, ctx;
let univers = 'all';
let tab = 'corporate';
let model = 'ms60';
let heroTimer = 0;

const HEROES = {
  corporate: {
    photos: ['convention-palais', 'gala-award', 'pleniere-palais', 'scene-m-rouge'].map((f) => PHOTOS.find((p) => p.f === f)),
    eyebrow: 'Séminaires · conventions · soirées',
    title: 'Votre plénière, sonorisée, éclairée et filmée par la même équipe.',
    text: 'Son, lumière, écrans LED, captation et streaming, fournis et exploités par une seule équipe technique, à Marseille depuis 1999.',
    needs: ['Son', 'Écran LED', 'Vidéo & captation'],
  },
  mediascene: {
    photos: MEDIASCENE.photos,
    eyebrow: 'Scène mobile · MediaScène',
    title: 'La scène mobile, de 60 à 120&nbsp;m².',
    text: 'Deux formats déployés par vérins hydrauliques : la MediaScène 60&nbsp;m² sur remorque de 3,5&nbsp;t, et la scène 3-en-1 de 80, 100 ou 120&nbsp;m² sur semi-remorque.',
    needs: ['Scène mobile MediaScène'],
  },
};

function mount(root, c) {
  el = root;
  ctx = c;
  el.innerHTML = `<div class="stagger-root">
    <div class="row wrap" style="--i:0">
      <div class="seg book-tabs" id="bk-tabs" role="tablist"><span class="thumb"></span>
        <button role="tab" data-tab="corporate" aria-selected="true">Séminaires & conventions</button>
        <button role="tab" data-tab="mediascene" aria-selected="false">Scène mobile MediaScène</button>
      </div>
    </div>
    <section class="book-hero mt-2" id="bk-hero" style="--i:1">
      <div class="hero-media" id="bk-media"></div>
      <div class="copy" id="bk-copy"></div>
    </section>
    <div id="bk-band" class="mt-2" style="--i:2"></div>

    <div class="row wrap mt-4" style="--i:3;align-items:flex-end">
      <div><span class="eyebrow">Réalisations</span><h2 class="h2 mt-1">Ce que nos équipes ont mis en lumière</h2></div>
      <span class="spacer"></span>
      <button class="btn btn-quiet" data-present="gallery">${icon('expand')}Présenter la sélection</button>
    </div>
    <div class="chips sm mt-2" id="bk-filters" role="group" aria-label="Univers" style="--i:4">
      ${UNIVERS.map((u) => `<button class="chip" data-u="${u.id}" aria-pressed="${u.id === univers}">${esc(u.label)}</button>`).join('')}
    </div>
    <div class="gallery mt-3" id="bk-gallery" style="--i:5"></div>

    <div class="module mt-3" style="--i:6">
      <header class="mod-head"><span class="n">PARC</span><span class="t">Matériel cité sur mediacom.org</span></header>
      <div class="mod-body row wrap">${GEAR.map((g) => `<span class="tag blue" style="height:30px;font-size:13px">${esc(g)}</span>`).join('')}
        <span class="dim" style="font-size:13px">Partenaire L-Acoustics · parc son, lumière, vidéo, structures et distribution électrique</span></div>
    </div>
    <p class="dim mt-2" style="font-size:12px">Photos : mediacom.org. Crédits mentionnés sur les images concernées (Benjamin Gayté-Sorbier, Sophie Vernet). Chiffres MediaScène : fiches techniques constructeur.</p>
  </div>`;

  const seg = $('#bk-tabs', el);
  const moveThumb = () => { const b = seg.querySelector('[aria-selected="true"]'); const t = seg.querySelector('.thumb'); t.style.width = b.offsetWidth + 'px'; t.style.transform = `translateX(${b.offsetLeft - 4}px)`; };
  new ResizeObserver(moveThumb).observe(seg);
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-tab]');
    if (!b || b.dataset.tab === tab) return;
    tab = b.dataset.tab;
    $$('[data-tab]', seg).forEach((x) => x.setAttribute('aria-selected', x === b));
    moveThumb();
    renderHero(true);
  });

  $('#bk-filters', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-u]');
    if (!b) return;
    univers = b.dataset.u;
    $$('[data-u]', el).forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderGallery();
  });
  el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-present]');
    if (p) {
      if (p.dataset.present === 'hero') present(HEROES[tab].photos, 0, tab === 'mediascene' ? 'MediaScène' : 'Séminaires & conventions');
      else present(current(), 0, 'Réalisations');
    }
    const shot = e.target.closest('[data-shot]');
    if (shot) present(current(), Number(shot.dataset.shot), 'Réalisations');
    const need = e.target.closest('[data-lead-need]');
    if (need) ctx.newLead({ needs: HEROES[tab].needs, eventType: tab === 'corporate' ? 'Séminaire' : '' });
    const m = e.target.closest('[data-model]');
    if (m && m.dataset.model !== model) { model = m.dataset.model; renderBand(true); }
    if (e.target.closest('[data-go3d]')) { ctx.go('scene'); import('./scene.js').then((s) => s.default.showMediaScene?.()); }
  });
  renderHero(false);
  renderGallery();
}

function renderHero(animate) {
  const h = HEROES[tab];
  const media = $('#bk-media', el);
  media.innerHTML = h.photos.map((p, i) => `<img src="${photo(p.f)}" alt="${esc(p.c)}" class="${i === 0 ? 'on' : ''}" ${i ? 'loading="lazy"' : 'fetchpriority="high"'} decoding="async">`).join('');
  const copy = $('#bk-copy', el);
  copy.innerHTML = `<span class="eyebrow" style="color:#9cc8ff">${h.eyebrow}</span>
    <h2>${h.title}</h2><p>${h.text}</p>
    <div class="row wrap">
      <button class="btn btn-primary" data-present="hero">${icon('play')}Présenter</button>
      <button class="btn btn-ghost" data-lead-need>${icon('plus')}Contact intéressé</button>
      ${tab === 'mediascene' ? `<button class="btn btn-ghost" data-go3d>${icon('scene')}Voir le déploiement en 3D</button>` : ''}
    </div>`;
  if (animate && !reduced()) {
    copy.animate([{ opacity: 0, transform: 'translateY(10px)', filter: 'blur(6px)' }, { opacity: 1, transform: 'none', filter: 'none' }], { duration: 520, easing: 'cubic-bezier(.22,1,.36,1)' });
    media.animate([{ opacity: 0.2 }, { opacity: 1 }], { duration: 700, easing: 'ease-out' });
  }
  clearInterval(heroTimer);
  let i = 0;
  if (!reduced()) heroTimer = setInterval(() => {
    if (!el.classList.contains('is-active') || document.hidden) return;
    const imgs = [...media.children];
    i = (i + 1) % imgs.length;
    imgs.forEach((im, k) => im.classList.toggle('on', k === i));
  }, 7000);
  renderBand(false);
}

function renderBand(animate) {
  const band = $('#bk-band', el);
  if (tab === 'corporate') {
    band.innerHTML = `<div class="spec-grid">${PROOFS.map((p) => `<div class="spec"><b>${esc(p.v)}</b><span>${esc(p.l)}</span></div>`).join('')}</div>`;
  } else {
    const m = MEDIASCENE.models.find((x) => x.id === model);
    band.innerHTML = `<div class="ms-band">
      <div class="ms-models" role="radiogroup" aria-label="Format de scène">${MEDIASCENE.models.map((x) => `<button class="ms-model" role="radio" data-model="${x.id}" aria-checked="${x.id === model}"><b>${esc(x.name)}</b><span>${esc(x.label)}</span></button>`).join('')}</div>
      <div class="spec-grid" id="bk-specs">${m.specs.map((s, i) => `<div class="spec" style="--i:${i}"><b>${esc(s.v)}</b><span>${esc(s.l)}</span></div>`).join('')}</div>
    </div>`;
  }
  if (animate && !reduced()) $$('.spec', band).forEach((n, i) => n.animate([{ opacity: 0, transform: 'translateY(6px)' }, { opacity: 1, transform: 'none' }], { duration: 380, delay: i * 35, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }));
}

const current = () => [
  ...(univers === 'all' || univers === 'video' ? VIDEOS.map((v) => ({ ...v, type: 'video' })) : []),
  ...PHOTOS.filter((p) => univers === 'all' || p.u === univers),
];

function renderGallery() {
  const label = Object.fromEntries(UNIVERS.map((u) => [u.id, u.label]));
  $('#bk-gallery', el).innerHTML = current().map((p, i) => `<button class="shot ${p.type === 'video' ? 'is-video' : ''}" data-shot="${i}" aria-label="Agrandir : ${esc(p.c)}" style="animation:rise 600ms var(--ease-out) both;animation-delay:${Math.min(i, 12) * 40}ms">
      <img src="${p.type === 'video' ? poster(p.f) : photo(p.f, true)}" alt="${esc(p.c)}" width="${p.w}" height="${p.h}" loading="lazy" decoding="async">
      ${p.type === 'video' ? `<span class="play">${icon('play')}</span>` : ''}
      <figcaption><span class="eyebrow">${p.type === 'video' ? 'Vidéo' : esc(label[p.u])}</span>${esc(p.c)}</figcaption></button>`).join('');
}

/* ---------- Mode présentation plein écran ---------- */
export function present(list, start = 0, title = '', { attract = false } = {}) {
  const host = $('#show');
  let idx = start, playing = !reduced(), timer = 0, bar = null;
  host.innerHTML = `${list.map((p, i) => p.type === 'video'
    ? `<div class="slide is-video" data-i="${i}"><video muted playsinline preload="none" poster="${poster(p.f)}"></video></div>`
    : `<div class="slide" data-i="${i}"><img alt="${esc(p.c)}" decoding="async"></div>`).join('')}
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
  const load = (i) => {
    const im = slides[i]?.querySelector('img');
    if (im && !im.src) im.src = photo(list[i].f);
    const v = slides[i]?.querySelector('video');
    if (v && !v.src) { v.src = video(list[i].f); v.preload = 'auto'; }
  };
  const show = (i) => {
    idx = (i + list.length) % list.length;
    load(idx); load((idx + 1) % list.length);
    slides.forEach((s, k) => {
      s.classList.toggle('on', k === idx);
      const v = s.querySelector('video');
      if (v && k !== idx) v.pause();
    });
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
    const v = slides[idx].querySelector('video');
    const dur = v ? Math.min((list[idx].dur || 20) * 1000, 30000) : 6500;
    if (v) { v.currentTime = 0; v.play().catch(() => {}); }
    bar = $('.progress i', host).animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: dur, easing: 'linear', fill: 'forwards' });
    timer = setTimeout(() => show(idx + 1), dur);
  };
  const close = () => {
    clearTimeout(timer);
    host.querySelectorAll('video').forEach((v) => { v.pause(); v.removeAttribute('src'); v.load(); });
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
