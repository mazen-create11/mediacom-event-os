import { PHOTOS, photo } from '../data.js';
import { icon, esc, $, $$, toast, confirmSheet, ago } from '../ui.js';

let el, ctx;
const SCENES = [
  { id: 'cloud', label: 'Nuage', icon: 'cloud' },
  { id: 'reel', label: 'Showreel', icon: 'image' },
  { id: 'mediascene', label: 'MediaScène', icon: 'scene' },
  { id: 'message', label: 'Message', icon: 'message' },
  { id: 'black', label: 'Noir', icon: 'blackout' },
];
const BACKS = ['scene-m-rouge', 'convention-palais', 'gala-award', 'plateau-bleu-rouge', 'regie-concert', 'facade-bleu-rose'];
const MESSAGES = ['Bienvenue sur le stand Médiacom', 'Démonstration lumière', 'Parlez-nous de votre prochain séminaire', 'Merci pour votre visite'];
const COUNTDOWNS = [0, 5, 10, 15, 30];
let countdown = 0;
let sort = 'recent';

function mount(root, c) {
  el = root;
  ctx = c;
  el.innerHTML = `<div class="rack">
    <article class="module span-8 md-8" style="--i:0">
      <header class="mod-head"><span class="n">01</span><span class="t">Sortie mur LED · 4 × 2 m</span><span class="r" id="mw-state"></span></header>
      <div class="mod-body">
        <div class="wall-wrap"><div class="wall-preview" id="mw-preview"><iframe src="/mur.html?preview=1" title="Aperçu du mur LED" tabindex="-1"></iframe></div>
          <button class="btn btn-quiet btn-sm wall-full-btn" id="mw-full">${icon('expand')}Plein écran</button></div>
        <div class="scene-keys mt-3" id="mw-scenes" role="radiogroup" aria-label="Scène affichée" style="grid-template-columns:repeat(5,minmax(0,1fr))">
          ${SCENES.map((s) => `<button class="key" role="radio" data-scene="${s.id}">${icon(s.icon)}<span>${s.label}</span></button>`).join('')}
        </div>
        <div class="divider"></div>
        <div class="row wrap"><div><span class="eyebrow">Modération</span><h3 class="h3 mt-1">Mots reçus <span class="dim mono" style="font-size:13px" id="mw-count"></span></h3></div>
          <span class="spacer"></span>
          <div class="seg" id="mw-sort"><span class="thumb"></span><button aria-selected="true" data-sort="recent">Récents</button><button aria-selected="false" data-sort="top">Plus cités</button></div>
        </div>
        <div class="word-list mt-3" id="mw-words"></div>
        <div class="row wrap mt-3">
          <form class="row" id="mw-add" style="flex:1;min-width:260px"><input class="input" id="mw-add-in" placeholder="Ajouter un mot à la main" maxlength="28" style="height:40px"><button class="btn btn-quiet btn-sm">${icon('plus')}Ajouter</button></form>
          <button class="btn btn-danger btn-sm" id="mw-clear">${icon('trash')}Vider le mur</button>
        </div>
      </div>
    </article>

    <article class="module span-4 md-4" style="--i:1">
      <header class="mod-head"><span class="n">02</span><span class="t">Réglages</span></header>
      <div class="mod-body">
        <div class="toggle-row"><div class="l"><b>Accepter les mots</b><small>Coupez pendant une démo ou en fin de journée</small></div><button class="switch" role="switch" id="mw-accept" aria-label="Accepter les mots"></button></div>
        <div class="field mt-2"><label for="mw-q">Question du nuage</label>
          <div class="row"><input class="input" id="mw-q" placeholder="Votre prochain événement, en un mot ?" maxlength="80"><button class="btn btn-quiet btn-icon" id="mw-q-save" aria-label="Appliquer la question">${icon('check')}</button></div></div>
        <div class="field mt-3"><label for="mw-msg">Message plein écran</label>
          <div class="row"><input class="input" id="mw-msg" placeholder="Votre message" maxlength="120"><button class="btn btn-quiet btn-icon" id="mw-msg-save" aria-label="Afficher le message">${icon('send')}</button></div>
          <div class="chips sm mt-1" id="mw-presets">${MESSAGES.map((m) => `<button class="chip" data-msg="${esc(m)}" aria-pressed="false">${esc(m)}</button>`).join('')}</div>
          <div class="row wrap mt-2" style="gap:8px"><span class="lbl" style="font:500 10.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--text-3)">Compte à rebours</span>
            <div class="chips sm" id="mw-cd">${COUNTDOWNS.map((m) => `<button class="chip" data-cd="${m}" aria-pressed="${m === countdown}">${m ? m + ' min' : 'Aucun'}</button>`).join('')}</div></div></div>
        <div class="field mt-3"><span class="lbl">Fond du nuage</span>
          <div id="mw-backs" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">
            ${BACKS.map((f) => `<button data-back="${f}" aria-pressed="false" style="position:relative;aspect-ratio:16/10;border-radius:8px;overflow:hidden;border:2px solid transparent"><img src="${photo(f, true)}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy"></button>`).join('')}
          </div></div>
        <a class="btn btn-quiet btn-sm mt-3" href="/mur" target="_blank" rel="noopener">${icon('expand')}Ouvrir la sortie plein écran</a>
      </div>
    </article>

  </div>`;

  const fit = () => { const w = $('#mw-preview', el); w.querySelector('iframe').style.transform = `scale(${w.clientWidth / 1600})`; };
  new ResizeObserver(fit).observe($('#mw-preview', el));

  $('#mw-scenes', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-scene]');
    if (b) ctx.hub.setWall({ scene: b.dataset.scene });
  });
  $('#mw-accept', el).addEventListener('click', () => {
    const accept = !(ctx.hub.state.wall.accept !== false);
    ctx.hub.setWall({ accept });
    toast({ title: accept ? 'Le mur accepte les mots' : 'Mur en pause', text: accept ? '' : 'Les visiteurs voient un message d’attente.', tone: accept ? 'live' : 'warm' });
  });
  $('#mw-q-save', el).addEventListener('click', () => { ctx.hub.setWall({ question: $('#mw-q', el).value.trim() }); toast({ title: 'Question mise à jour', tone: 'live' }); });
  const sendMsg = (m) => {
    const now = Date.now() + ctx.hub.state.serverOffset;
    ctx.hub.setWall({ message: m, scene: 'message', countdownTo: countdown ? now + countdown * 60000 : 0, countdownFrom: now });
    toast({ title: 'Message à l’écran', text: esc(m) + (countdown ? ` · compte à rebours ${countdown} min` : ''), tone: 'blue' });
  };
  $('#mw-cd', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-cd]');
    if (!b) return;
    countdown = Number(b.dataset.cd);
    $$('[data-cd]', el).forEach((x) => x.setAttribute('aria-pressed', x === b));
  });
  $('#mw-full', el).addEventListener('click', fullPreview);
  $('#mw-msg-save', el).addEventListener('click', () => { const m = $('#mw-msg', el).value.trim(); if (m) sendMsg(m); });
  $('#mw-presets', el).addEventListener('click', (e) => { const b = e.target.closest('[data-msg]'); if (b) { $('#mw-msg', el).value = b.dataset.msg; sendMsg(b.dataset.msg); } });
  $('#mw-backs', el).addEventListener('click', (e) => { const b = e.target.closest('[data-back]'); if (b) ctx.hub.setWall({ photo: b.dataset.back }); });

  const seg = $('#mw-sort', el);
  const moveThumb = () => { const b = seg.querySelector('[aria-selected="true"]'); const t = seg.querySelector('.thumb'); t.style.width = b.offsetWidth + 'px'; t.style.transform = `translateX(${b.offsetLeft}px)`; };
  seg.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sort]');
    if (!b) return;
    sort = b.dataset.sort;
    $$('[data-sort]', seg).forEach((x) => x.setAttribute('aria-selected', x === b));
    moveThumb();
    renderWords();
  });
  requestAnimationFrame(moveThumb);
  new ResizeObserver(moveThumb).observe(seg);

  $('#mw-add', el).addEventListener('submit', async (e) => {
    e.preventDefault();
    const v = $('#mw-add-in', el).value.trim();
    if (!v) return;
    try { await ctx.hub.sendWord(v); $('#mw-add-in', el).value = ''; } catch (err) { toast({ title: 'Mot refusé', text: esc(err.message), tone: 'warm' }); }
  });
  $('#mw-clear', el).addEventListener('click', async () => {
    if (!(await confirmSheet({ title: 'Vider le mur ?', text: 'Tous les mots reçus disparaissent de l’écran et de la liste.', ok: 'Vider', danger: true }))) return;
    ctx.hub.clearWords();
  });
  $('#mw-words', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-hide]');
    if (!b) return;
    const w = ctx.hub.state.words.find((x) => x.id === b.dataset.hide);
    if (w) ctx.hub.hideWord(w.id, !w.hidden);
  });
  update();
}

function renderWords() {
  const words = [...ctx.hub.state.words].sort(sort === 'top' ? (a, b) => b.count - a.count || b.at - a.at : (a, b) => b.at - a.at);
  const total = words.reduce((s, w) => s + (w.count || 1), 0);
  $('#mw-count', el).textContent = `${words.length} mots, ${total} envois`;
  $('#mw-words', el).innerHTML = words.length
    ? words.map((w) => `<span class="word ${w.hidden ? 'is-hidden' : ''}" title="Reçu ${ago(w.at)}">${esc(w.text)}<span class="c">×${w.count}</span><button data-hide="${w.id}" aria-label="${w.hidden ? 'Réafficher' : 'Masquer'} ${esc(w.text)}">${icon(w.hidden ? 'eye' : 'eyeOff')}</button></span>`).join('')
    : '<p class="dim" style="margin:0">Aucun mot pour l’instant. Le mur affiche des mots d’amorce en attendant les visiteurs.</p>';
}

function update(reason) {
  if (!el || (reason && !['words', 'wall', 'hello', 'boot'].includes(reason))) return;
  const w = ctx.hub.state.wall || {};
  $$('[data-scene]', el).forEach((b) => (b.dataset.scene === (w.scene || 'cloud') ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current')));
  $$('[data-scene]', el).forEach((b) => b.setAttribute('aria-checked', b.dataset.scene === (w.scene || 'cloud')));
  $('#mw-accept', el).setAttribute('aria-checked', w.accept !== false);
  $('#mw-state', el).innerHTML = `<span class="led" data-s="${w.scene === 'black' ? '' : 'hot'}"></span>${SCENES.find((s) => s.id === (w.scene || 'cloud'))?.label}`;
  const q = $('#mw-q', el);
  if (document.activeElement !== q) q.value = w.question || '';
  $$('[data-back]', el).forEach((b) => { const on = b.dataset.back === (w.photo || 'scene-m-rouge'); b.setAttribute('aria-pressed', on); b.style.borderColor = on ? 'var(--blue)' : 'transparent'; });
  renderWords();
}

// Sortie du mur en plein écran sur la tablette (pour la montrer à un client sans quitter l'app)
function fullPreview() {
  const host = $('#show');
  host.innerHTML = `<div class="wall-full"><iframe src="/mur.html?preview=1" title="Mur LED plein écran"></iframe></div>
    <button class="btn btn-quiet btn-icon" style="position:absolute;top:calc(16px + env(safe-area-inset-top));right:16px;z-index:2" aria-label="Fermer">${icon('x')}</button>`;
  host.classList.add('is-open');
  host.requestFullscreen?.().catch(() => {});
  const close = () => {
    document.removeEventListener('keydown', onKey);
    host.classList.remove('is-open');
    host.innerHTML = '';
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
  };
  const onKey = (e) => e.key === 'Escape' && close();
  host.onclick = close;
  host.onpointerdown = host.onpointerup = null;
  document.addEventListener('keydown', onKey);
}

export default {
  id: 'mur', title: 'Mur LED', short: 'Mur LED', sub: 'Régie de l’écran du stand', icon: 'wall',
  mount, update,
};
