// Onglet Écran : la régie de l'écran LED depuis la tablette.
// Un aperçu plein cadre, une touche par scène, le panneau de l'activité en cours, l'habillage,
// et les liens dédiés pour l'ordinateur du mur (Nolan commute ses sources depuis un boîtier :
// l'écran ne reçoit rien à distance, il affiche une adresse).
import { PHOTOS, photo } from '../data.js';
import { icon, esc, $, $$, toast, confirmSheet, sheet, closeSheet, qrSVG, ago, download } from '../ui.js';
import { withToken } from '../hub.js';

let el, ctx, sessions = [], screenTimer = 0;
const SCENES = [
  { id: 'cloud', label: 'Nuage', icon: 'cloud', hint: 'Nuage de mots' },
  { id: 'poll', label: 'Sondage', icon: 'poll', hint: 'Sondage à choix' },
  { id: 'questions', label: 'Questions', icon: 'question', hint: 'Questions du public' },
  { id: 'reel', label: 'Showreel', icon: 'image', hint: 'Photos et vidéos' },
  { id: 'mediascene', label: 'MediaScène', icon: 'scene', hint: 'Scène mobile' },
  { id: 'message', label: 'Message', icon: 'message', hint: 'Message plein écran' },
  { id: 'external', label: 'Externe', icon: 'external', hint: 'Page web tierce' },
  { id: 'black', label: 'Noir', icon: 'blackout', hint: 'Écran noir' },
];
const SLUG = { cloud: 'nuage', poll: 'sondage', questions: 'questions', reel: 'showreel', mediascene: 'mediascene', message: 'message', external: 'externe', black: 'noir' };
const BACKS = ['scene-m-rouge', 'convention-palais', 'gala-award', 'plateau-bleu-rouge', 'regie-concert', 'facade-bleu-rose'];
const MESSAGES = ['Bienvenue sur le stand Médiacom', 'Démonstration lumière', 'Parlez-nous de votre prochain séminaire', 'Merci pour votre visite'];
const QUESTIONS = ['Votre prochain événement, en un mot ?', 'Ce qui fait un séminaire réussi, en un mot ?', 'Votre ville préférée pour un séminaire ?', 'Le mot d’ordre de votre prochaine convention ?'];
const QA_TITLES = ['Une question pour les intervenants ?', 'Vos questions à la direction', 'Ce que vous aimeriez savoir sur Médiacom ?'];
const POLLS = [
  { title: 'Quel format pour votre prochain séminaire ?', options: ['Plénière classique', 'Convention hybride', 'Soirée + ateliers', 'Incentive en extérieur'] },
  { title: 'Combien d’événements organisez-vous par an ?', options: ['1 à 5', '6 à 20', 'Plus de 20'] },
  { title: 'Ce qui compte le plus chez un prestataire technique ?', options: ['La réactivité', 'Le prix', 'Le matériel', 'Une seule équipe pour tout'] },
  { title: 'Êtes-vous satisfaits de cette présentation ?', options: ['Oui', 'Non'] },
];
const SWATCHES = ['#0a2f6b', '#3192ff', '#0a1222', '#1d2a44', '#5b2a86', '#b3261e', '#d97706', '#0f766e', '#f3f4f6', '#ffffff'];
const STYLES = [
  { id: 'sobre', label: 'Sobre', hint: 'Nuit, rien ne bouge' },
  { id: 'lumiere', label: 'Lumière', hint: 'Faisceaux, photo' },
  { id: 'uni', label: 'Couleur', hint: 'Un fond uni' },
  { id: 'degrade', label: 'Dégradé', hint: 'Deux couleurs' },
  { id: 'photo', label: 'Photo', hint: 'Une réalisation' },
];
const COUNTDOWNS = [0, 5, 10, 15, 30];
let countdown = 0, sort = 'recent', panelKey = '', swatchTarget = 'c1', info = null;
let draft = { title: '', options: ['', ''], multiple: false };

const wall = () => ctx.hub.state.wall || {};
const theme = () => Object.assign({ style: 'sobre', c1: '#0a2f6b', c2: '#3192ff', brand: true, logo: '', client: '' }, wall().theme || {});
const base = () => ctx.hub.state.settings?.publicUrl || info?.base || location.origin;

function mount(root, c) {
  el = root;
  ctx = c;
  el.innerHTML = `<div class="rack">
    <article class="module span-12" style="--i:0">
      <header class="mod-head"><span class="n">01</span><span class="t">Sortie écran · suit la tablette</span>
        <span class="r"><span class="screen-state" id="mw-screen"></span><span id="mw-state"></span><button class="btn btn-quiet btn-sm" id="mw-links">${icon('link')}Liens de l’écran</button></span></header>
      <div class="mod-body">
        <div class="wall-wrap wall-big"><div class="wall-preview" id="mw-preview"><iframe src="/ecran?preview=1" title="Aperçu de l’écran" tabindex="-1"></iframe></div>
          <button class="btn btn-quiet btn-sm wall-full-btn" id="mw-full">${icon('expand')}Plein écran</button></div>
        <div class="scene-keys mt-3" id="mw-scenes" role="radiogroup" aria-label="Scène affichée" style="grid-template-columns:repeat(8,minmax(0,1fr))">
          ${SCENES.map((s) => `<button class="key" role="radio" data-scene="${s.id}" title="${esc(s.hint)}">${icon(s.icon)}<span>${s.label}</span></button>`).join('')}
        </div>
      </div>
    </article>

    <article class="module span-7 md-7" style="--i:1">
      <header class="mod-head"><span class="n">02</span><span class="t" id="mw-panel-t">Activité</span><span class="r" id="mw-panel-r"></span></header>
      <div class="mod-body" id="mw-panel"></div>
    </article>

    <article class="module span-5 md-5" style="--i:2">
      <header class="mod-head"><span class="n">03</span><span class="t">Habillage de l’écran</span><span class="r" id="mw-theme-r"></span></header>
      <div class="mod-body" id="mw-theme"></div>
    </article>

    <article class="module span-12" style="--i:3">
      <header class="mod-head"><span class="n">04</span><span class="t">Session interactive</span><span class="r" id="mw-ses-r"></span></header>
      <div class="mod-body" id="mw-session"></div>
    </article>
  </div>`;

  const fit = () => { const w = $('#mw-preview', el); w.querySelector('iframe').style.transform = `scale(${w.clientWidth / 1600})`; };
  new ResizeObserver(fit).observe($('#mw-preview', el));
  fetch('/api/info', { cache: 'no-store' }).then((r) => r.json()).then((d) => { info = d; }).catch(() => {});

  $('#mw-scenes', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-scene]');
    if (!b) return;
    if (b.dataset.scene === 'external' && !wall().externalUrl) { ctx.hub.setWall({ scene: 'external' }); toast({ title: 'Aucun lien externe', text: 'Renseignez l’adresse à afficher dans le panneau Activité.', tone: 'warm' }); return; }
    if (b.dataset.scene === 'poll' && !ctx.hub.state.poll) { ctx.hub.setWall({ scene: 'poll' }); toast({ title: 'Sondage', text: 'Choisissez un sondage prêt ou écrivez le vôtre, puis lancez-le.', tone: 'blue' }); return; }
    ctx.hub.setWall({ scene: b.dataset.scene });
  });
  $('#mw-full', el).addEventListener('click', fullPreview);
  $('#mw-links', el).addEventListener('click', linksSheet);
  $('#mw-panel', el).addEventListener('click', onPanelClick);
  $('#mw-panel', el).addEventListener('submit', onPanelSubmit);
  $('#mw-panel', el).addEventListener('input', onPanelInput);
  $('#mw-theme', el).addEventListener('click', onThemeClick);
  $('#mw-theme', el).addEventListener('change', onThemeChange);
  $('#mw-theme', el).addEventListener('submit', (e) => { e.preventDefault(); const v = $('#th-client', el)?.value.trim(); ctx.hub.setWall({ theme: { client: v || '' } }); toast({ title: v ? `Écran aux couleurs de ${v}` : 'Nom du client retiré', tone: 'live' }); });
  $('#mw-session', el).addEventListener('click', onSessionClick);
  $('#mw-session', el).addEventListener('submit', onSessionSubmit);
  clearInterval(screenTimer);
  screenTimer = setInterval(renderScreen, 5000);
  renderTheme(true);
  update('boot');
  ctx.hub.listSessions().then((l) => { sessions = l || []; renderSession(); }).catch(() => {});
}

/* =========================================================================
   Panneau Activité : dépend de la scène affichée
   ========================================================================= */
function renderPanel(force) {
  const w = wall();
  const scene = w.scene || 'cloud';
  const key = scene + '|' + (ctx.hub.state.poll?.id || '');
  const host = $('#mw-panel', el);
  const rebuild = force || key !== panelKey;
  panelKey = key;
  const t = $('#mw-panel-t', el), r = $('#mw-panel-r', el);
  r.innerHTML = '';

  if (scene === 'cloud') {
    t.textContent = 'Nuage de mots';
    if (rebuild) host.innerHTML = `
      <div class="field"><label for="mw-q">Question posée</label>
        <form class="row" id="mw-q-f"><input class="input" id="mw-q" placeholder="Votre prochain événement, en un mot ?" maxlength="80"><button class="btn btn-quiet btn-icon" aria-label="Appliquer la question">${icon('check')}</button></form>
        <div class="chips sm mt-1" id="mw-q-presets">${QUESTIONS.map((q) => `<button class="chip" data-q="${esc(q)}" aria-pressed="false">${esc(q)}</button>`).join('')}</div></div>
      <div class="grid-2 mt-3">
        <div class="toggle-row"><div class="l"><b>Accepter les réponses</b><small>Clore fige le nuage et prévient les visiteurs</small></div><button class="switch" role="switch" id="mw-accept" aria-label="Accepter les réponses"></button></div>
        <div class="field"><span class="lbl">Réponses par personne</span><div class="chips sm" id="mw-max">${[0, 1, 2, 3].map((n) => `<button class="chip" data-max="${n}" aria-pressed="false">${n ? n : 'Illimité'}</button>`).join('')}</div></div>
      </div>
      <div class="field mt-3"><span class="lbl">Question à l’écran</span><div class="chips sm" id="mw-layout"><button class="chip" data-layout="centre" aria-pressed="false">Au centre, les mots autour</button><button class="chip" data-layout="haut" aria-pressed="false">Au-dessus du nuage</button></div></div>
      <div class="divider"></div>
      <div class="row wrap"><div><span class="eyebrow">Modération</span><h3 class="h3 mt-1">Mots reçus <span class="dim mono" style="font-size:13px" id="mw-count"></span></h3></div>
        <span class="spacer"></span>
        <div class="seg" id="mw-sort"><span class="thumb"></span><button aria-selected="true" data-sort="recent">Récents</button><button aria-selected="false" data-sort="top">Plus cités</button></div></div>
      <div class="word-list mt-3" id="mw-words"></div>
      <div class="row wrap mt-3">
        <form class="row" id="mw-add" style="flex:1;min-width:260px"><input class="input" id="mw-add-in" placeholder="Ajouter un mot à la main" maxlength="28" style="height:40px"><button class="btn btn-quiet btn-sm">${icon('plus')}Ajouter</button></form>
        <button class="btn btn-danger btn-sm" data-act="clear-words">${icon('trash')}Vider le nuage</button>
      </div>`;
    const q = $('#mw-q', el);
    if (document.activeElement !== q) q.value = w.question || '';
    $('#mw-accept', el).setAttribute('aria-checked', w.accept !== false);
    $$('[data-max]', host).forEach((b) => b.setAttribute('aria-pressed', Number(b.dataset.max) === (Number(w.maxPerPerson) || 0)));
    $$('[data-layout]', host).forEach((b) => b.setAttribute('aria-pressed', b.dataset.layout === (w.cloudLayout === 'haut' ? 'haut' : 'centre')));
    if (rebuild) {
      const seg = $('#mw-sort', el);
      const moveThumb = () => { const b = seg.querySelector('[aria-selected="true"]'); const th = seg.querySelector('.thumb'); th.style.width = b.offsetWidth + 'px'; th.style.transform = `translateX(${b.offsetLeft}px)`; };
      requestAnimationFrame(moveThumb);
      seg.addEventListener('click', (e) => { const b = e.target.closest('[data-sort]'); if (!b) return; sort = b.dataset.sort; $$('[data-sort]', seg).forEach((x) => x.setAttribute('aria-selected', x === b)); moveThumb(); renderWords(); });
    }
    renderWords();
    r.innerHTML = `<span class="led" data-s="${w.accept === false ? '' : 'live'}"></span>${w.accept === false ? 'clos' : 'ouvert'}`;
  }

  if (scene === 'poll') {
    t.textContent = 'Sondage';
    const p = ctx.hub.state.poll;
    if (rebuild) host.innerHTML = `
      ${p ? `<div class="poll-live" id="mw-poll-live"></div><div class="divider"></div>` : ''}
      <span class="eyebrow">${p ? 'Nouveau sondage' : 'Lancer un sondage'}</span>
      <div class="chips sm mt-2" id="mw-poll-presets">${POLLS.map((x, i) => `<button class="chip" data-poll="${i}" aria-pressed="false">${esc(x.title)}</button>`).join('')}</div>
      <form class="stack mt-3" id="mw-poll-f" style="gap:10px">
        <div class="field"><label for="mw-poll-t">Question</label><input class="input" id="mw-poll-t" placeholder="Quel format pour votre prochain séminaire ?" maxlength="120" value="${esc(draft.title)}"></div>
        <div class="field"><span class="lbl">Réponses (2 à 6)</span><div class="stack" id="mw-poll-opts" style="gap:8px"></div></div>
        <div class="row wrap">
          <button type="button" class="btn btn-quiet btn-sm" data-act="poll-add">${icon('plus')}Une réponse de plus</button>
          <label class="toggle-row" style="padding:0;border:0;gap:10px"><span class="l"><b style="font-size:13px">Plusieurs réponses</b></span><button type="button" class="switch" role="switch" id="mw-poll-multi" aria-checked="${draft.multiple}" aria-label="Plusieurs réponses possibles"></button></label>
          <span class="spacer"></span>
          <button class="btn btn-primary">${icon('play')}Lancer à l’écran</button>
        </div>
      </form>`;
    if (rebuild) renderDraftOptions();
    renderPollLive();
    if (p) r.innerHTML = `<span class="led" data-s="${p.open === false ? '' : 'live'}"></span>${p.total || 0} vote${(p.total || 0) > 1 ? 's' : ''}`;
  }

  if (scene === 'questions') {
    t.textContent = 'Questions du public';
    if (rebuild) host.innerHTML = `
      <div class="field"><label for="mw-qa-t">Titre à l’écran</label>
        <form class="row" id="mw-qa-f"><input class="input" id="mw-qa-t" placeholder="Une question pour les intervenants ?" maxlength="80"><button class="btn btn-quiet btn-icon" aria-label="Appliquer le titre">${icon('check')}</button></form>
        <div class="chips sm mt-1" id="mw-qa-presets">${QA_TITLES.map((q) => `<button class="chip" data-qa="${esc(q)}" aria-pressed="false">${esc(q)}</button>`).join('')}</div></div>
      <div class="toggle-row mt-3"><div class="l"><b>Accepter les questions</b><small>Les votes restent possibles une fois clos</small></div><button class="switch" role="switch" id="mw-qa-open" aria-label="Accepter les questions"></button></div>
      <div class="divider"></div>
      <div class="row wrap"><div><span class="eyebrow">Modération</span><h3 class="h3 mt-1">Questions reçues <span class="dim mono" style="font-size:13px" id="mw-qa-count"></span></h3></div><span class="spacer"></span><button class="btn btn-danger btn-sm" data-act="clear-q">${icon('trash')}Tout effacer</button></div>
      <div class="q-list mt-3" id="mw-qa-list"></div>`;
    const qt = $('#mw-qa-t', el);
    if (document.activeElement !== qt) qt.value = w.qaTitle || '';
    $('#mw-qa-open', el).setAttribute('aria-checked', w.qaOpen !== false);
    renderQuestions();
    r.innerHTML = `<span class="led" data-s="${w.qaOpen === false ? '' : 'live'}"></span>${w.qaOpen === false ? 'clos' : 'ouvert'}`;
  }

  if (scene === 'message') {
    t.textContent = 'Message plein écran';
    if (rebuild) host.innerHTML = `
      <div class="field"><label for="mw-msg">Message</label>
        <form class="row" id="mw-msg-f"><input class="input" id="mw-msg" placeholder="Votre message" maxlength="120"><button class="btn btn-primary btn-icon" aria-label="Afficher le message">${icon('send')}</button></form>
        <div class="chips sm mt-1" id="mw-presets">${MESSAGES.map((m) => `<button class="chip" data-msg="${esc(m)}" aria-pressed="false">${esc(m)}</button>`).join('')}</div></div>
      <div class="row wrap mt-3" style="gap:8px"><span class="lbl" style="font:500 10.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--text-3)">Compte à rebours</span>
        <div class="chips sm" id="mw-cd">${COUNTDOWNS.map((m) => `<button class="chip" data-cd="${m}" aria-pressed="${m === countdown}">${m ? m + ' min' : 'Aucun'}</button>`).join('')}</div></div>
      <p class="dim mt-3" style="font-size:12.5px;margin-bottom:0">Le message apparaît mot à mot. Avec un compte à rebours, l’écran affiche le temps restant avant la démonstration.</p>`;
    const m = $('#mw-msg', el);
    if (document.activeElement !== m && !m.value) m.value = w.message || '';
  }

  if (scene === 'reel') {
    t.textContent = 'Showreel';
    if (rebuild) host.innerHTML = `
      <span class="eyebrow">Sélection</span>
      <div class="chips mt-2" id="mw-reel"><button class="chip" data-reel="seminaire" aria-pressed="false">Séminaires et soirées</button><button class="chip" data-reel="all" aria-pressed="false">Tout le book</button></div>
      <p class="dim mt-3" style="font-size:12.5px;margin-bottom:0">Par défaut, l’écran montre les plénières, soirées, mises en lumière et les deux clips Studio 13. Concerts, festivals et gala sportif ne sortent que sur « Tout le book ».</p>`;
    $$('[data-reel]', host).forEach((b) => b.setAttribute('aria-pressed', b.dataset.reel === (w.reelSet || 'seminaire')));
  }

  if (scene === 'mediascene') {
    t.textContent = 'MediaScène';
    if (rebuild) host.innerHTML = `<p class="lede" style="margin:0">L’écran présente la gamme de 60 à 160 m² : plateau, charge en toiture, vent, temps de montage, avec les photos de la scène en exploitation.</p>
      <div class="row wrap mt-3"><button class="btn btn-quiet btn-sm" data-act="go3d">${icon('scene')}Déploiement en 3D</button><button class="btn btn-quiet btn-sm" data-act="gobook">${icon('book')}Fiches dans le Book</button></div>`;
  }

  if (scene === 'external') {
    t.textContent = 'Page externe';
    if (rebuild) host.innerHTML = `
      <form class="field" id="mw-ext-f"><label for="mw-ext">Adresse à afficher en plein écran</label>
        <div class="row"><input class="input" id="mw-ext" placeholder="https://… (outil de Nolan, vidéo, site)" inputmode="url" autocapitalize="off" value="${esc(w.externalUrl || '')}"><button class="btn btn-primary btn-icon" aria-label="Afficher">${icon('check')}</button></div></form>
      <p class="dim mt-3" style="font-size:12.5px;margin-bottom:0">La page s’ouvre dans l’écran, sans en-tête ni bandeau. Si le site refuse d’être intégré, ouvrez son adresse directement sur l’ordinateur du mur.</p>`;
    const x = $('#mw-ext', el);
    if (document.activeElement !== x) x.value = w.externalUrl || '';
  }

  if (scene === 'black') {
    t.textContent = 'Écran noir';
    if (rebuild) host.innerHTML = `<p class="lede" style="margin:0">L’écran est noir. Touchez une autre scène pour reprendre. Le lien <code class="mono" style="color:var(--blue-2)">/ecran/noir</code> donne un noir permanent à l’ordinateur du mur.</p>`;
  }
}

function renderWords() {
  const host = $('#mw-words', el);
  if (!host) return;
  const words = [...ctx.hub.state.words].sort(sort === 'top' ? (a, b) => b.count - a.count || b.at - a.at : (a, b) => b.at - a.at);
  const total = words.reduce((s, w) => s + (w.count || 1), 0);
  $('#mw-count', el).textContent = `${words.length} mots, ${total} envois`;
  host.innerHTML = words.length
    ? words.map((w) => `<span class="word ${w.hidden ? 'is-hidden' : ''}" title="Reçu ${ago(w.at)}">${esc(w.text)}<span class="c">×${w.count}</span><button data-hide="${w.id}" aria-label="${w.hidden ? 'Réafficher' : 'Masquer'} ${esc(w.text)}">${icon(w.hidden ? 'eye' : 'eyeOff')}</button></span>`).join('')
    : '<p class="dim" style="margin:0">Aucun mot pour l’instant. L’écran affiche des mots d’amorce en attendant les visiteurs.</p>';
}

function renderDraftOptions() {
  const host = $('#mw-poll-opts', el);
  if (!host) return;
  host.innerHTML = draft.options.map((o, i) => `<div class="row"><span class="mono dim" style="width:22px;font-size:12px">${String.fromCharCode(65 + i)}</span><input class="input" data-opt="${i}" placeholder="Réponse ${i + 1}" maxlength="60" value="${esc(o)}" style="height:42px">${draft.options.length > 2 ? `<button type="button" class="btn btn-quiet btn-sm btn-icon" data-act="poll-del" data-i="${i}" aria-label="Retirer">${icon('x')}</button>` : ''}</div>`).join('');
}

function renderPollLive() {
  const host = $('#mw-poll-live', el);
  const p = ctx.hub.state.poll;
  if (!host || !p) return;
  const total = p.total || p.options.reduce((s, o) => s + (o.count || 0), 0);
  const max = Math.max(1, ...p.options.map((o) => o.count || 0));
  host.innerHTML = `<div class="row wrap"><div><span class="eyebrow">À l’écran · ${total} vote${total > 1 ? 's' : ''}${p.voters ? ` · ${p.voters} participant${p.voters > 1 ? 's' : ''}` : ''}</span><h3 class="h3 mt-1">${esc(p.title)}</h3></div><span class="spacer"></span>
      <div class="toggle-row" style="padding:0;border:0;gap:10px"><span class="l"><b style="font-size:13px">Vote ouvert</b></span><button class="switch" role="switch" id="mw-poll-open" aria-checked="${p.open !== false}" aria-label="Vote ouvert"></button></div></div>
    <div class="bars mt-3">${p.options.map((o) => `<div class="bar-row ${total && o.count === max ? 'lead' : ''}"><span class="l">${esc(o.label)}</span><span class="track"><i style="--v:${total ? (o.count / max).toFixed(3) : 0}"></i></span><b class="mono">${total ? Math.round((o.count / total) * 100) : 0} %</b><small class="mono dim">${o.count || 0}</small></div>`).join('')}</div>
    <div class="row wrap mt-3"><button class="btn btn-quiet btn-sm" data-act="poll-demo">${icon('plus')}Vote de démonstration</button><span class="spacer"></span><button class="btn btn-danger btn-sm" data-act="poll-reset">${icon('reset')}Remettre à zéro</button></div>`;
}

function renderQuestions() {
  const host = $('#mw-qa-list', el);
  if (!host) return;
  const list = [...ctx.hub.state.questions].sort((a, b) => (b.pinned - a.pinned) || (a.hidden - b.hidden) || (a.answered - b.answered) || (b.votes - a.votes) || (b.at - a.at));
  $('#mw-qa-count', el).textContent = `${list.filter((q) => !q.hidden).length} visibles`;
  host.innerHTML = list.length ? list.map((q) => `<div class="q-row ${q.hidden ? 'is-hidden' : ''} ${q.answered ? 'is-done' : ''} ${q.pinned ? 'is-pin' : ''}">
      <span class="v mono">${q.votes || 0}</span>
      <div class="t"><p>${esc(q.text)}</p><small class="dim mono">${ago(q.at)}${q.pinned ? ' · à l’écran' : ''}${q.answered ? ' · répondu' : ''}${q.hidden ? ' · masquée' : ''}</small></div>
      <div class="a">
        <button class="btn btn-quiet btn-sm btn-icon" data-qset="pinned" data-id="${q.id}" aria-pressed="${!!q.pinned}" aria-label="Mettre en avant">${icon('pin')}</button>
        <button class="btn btn-quiet btn-sm btn-icon" data-qset="answered" data-id="${q.id}" aria-pressed="${!!q.answered}" aria-label="Répondu">${icon('check')}</button>
        <button class="btn btn-quiet btn-sm btn-icon" data-qset="hidden" data-id="${q.id}" aria-pressed="${!!q.hidden}" aria-label="${q.hidden ? 'Réafficher' : 'Masquer'}">${icon(q.hidden ? 'eye' : 'eyeOff')}</button>
      </div></div>`).join('') : '<p class="dim" style="margin:0">Aucune question pour l’instant. Les visiteurs posent les leurs depuis la page du QR, et votent pour celles des autres.</p>';
}

function onPanelClick(e) {
  const hub = ctx.hub;
  const act = e.target.closest('[data-act]')?.dataset.act;
  if (act === 'clear-words') return confirmSheet({ title: 'Vider le nuage ?', text: 'Tous les mots reçus disparaissent de l’écran et de la liste.', ok: 'Vider', danger: true }).then((ok) => ok && hub.clearWords());
  if (act === 'clear-q') return confirmSheet({ title: 'Effacer toutes les questions ?', text: 'La liste et l’écran repartent à zéro.', ok: 'Effacer', danger: true }).then((ok) => ok && hub.clearQuestions());
  if (act === 'poll-add') { if (draft.options.length < 6) { readDraft(); draft.options.push(''); renderDraftOptions(); } return; }
  if (act === 'poll-del') { readDraft(); draft.options.splice(Number(e.target.closest('[data-i]').dataset.i), 1); renderDraftOptions(); return; }
  if (act === 'poll-reset') return confirmSheet({ title: 'Remettre les votes à zéro ?', text: 'La question reste affichée, les barres repartent de zéro.', ok: 'Remettre à zéro', danger: true }).then((ok) => ok && hub.pollReset());
  if (act === 'poll-demo') { const p = hub.state.poll; const o = p.options[Math.floor(Math.random() * p.options.length)]; hub.vote([o.id], 'demo-' + Math.random().toString(36).slice(2, 8)).then(() => toast({ title: 'Vote de démonstration', text: esc(o.label), tone: 'blue' })).catch((err) => toast({ title: 'Vote refusé', text: esc(err.message), tone: 'warm' })); return; }
  if (act === 'go3d') { ctx.go('scene'); import('./scene.js').then((s) => s.default.showMediaScene?.()); return; }
  if (act === 'gobook') { ctx.go('book'); return; }

  const q = e.target.closest('[data-q]'); if (q) { $('#mw-q', el).value = q.dataset.q; hub.setWall({ question: q.dataset.q }); toast({ title: 'Question à l’écran', text: esc(q.dataset.q), tone: 'live' }); return; }
  const qa = e.target.closest('[data-qa]'); if (qa) { $('#mw-qa-t', el).value = qa.dataset.qa; hub.setWall({ qaTitle: qa.dataset.qa }); toast({ title: 'Titre à l’écran', text: esc(qa.dataset.qa), tone: 'live' }); return; }
  const mx = e.target.closest('[data-max]'); if (mx) { hub.setWall({ maxPerPerson: Number(mx.dataset.max) }); return; }
  const ly = e.target.closest('[data-layout]'); if (ly) { hub.setWall({ cloudLayout: ly.dataset.layout }); return; }
  const rl = e.target.closest('[data-reel]'); if (rl) { hub.setWall({ reelSet: rl.dataset.reel }); return; }
  const pp = e.target.closest('[data-poll]'); if (pp) { const d = POLLS[Number(pp.dataset.poll)]; draft = { title: d.title, options: [...d.options], multiple: false }; $('#mw-poll-t', el).value = d.title; $('#mw-poll-multi', el).setAttribute('aria-checked', 'false'); renderDraftOptions(); return; }
  const ms = e.target.closest('[data-msg]'); if (ms) { $('#mw-msg', el).value = ms.dataset.msg; sendMsg(ms.dataset.msg); return; }
  const cd = e.target.closest('[data-cd]'); if (cd) { countdown = Number(cd.dataset.cd); $$('[data-cd]', el).forEach((x) => x.setAttribute('aria-pressed', x === cd)); return; }
  const hd = e.target.closest('[data-hide]'); if (hd) { const w = hub.state.words.find((x) => x.id === hd.dataset.hide); if (w) hub.hideWord(w.id, !w.hidden); return; }
  const qs = e.target.closest('[data-qset]'); if (qs) { const cur = hub.state.questions.find((x) => x.id === qs.dataset.id); if (cur) hub.setQuestion(cur.id, { [qs.dataset.qset]: !cur[qs.dataset.qset] }); return; }

  if (e.target.closest('#mw-accept')) { const accept = !(wall().accept !== false); hub.setWall({ accept }); toast({ title: accept ? 'Réponses ouvertes' : 'Réponses closes', text: accept ? '' : 'Les visiteurs voient « réponses closes ».', tone: accept ? 'live' : 'warm' }); return; }
  if (e.target.closest('#mw-qa-open')) { const open = !(wall().qaOpen !== false); hub.setWall({ qaOpen: open }); return; }
  if (e.target.closest('#mw-poll-open')) { const p = hub.state.poll; if (p) hub.pollOpen(!(p.open !== false)); return; }
  if (e.target.closest('#mw-poll-multi')) { draft.multiple = !draft.multiple; $('#mw-poll-multi', el).setAttribute('aria-checked', draft.multiple); return; }
}

function readDraft() {
  draft.title = $('#mw-poll-t', el)?.value.trim() || draft.title;
  $$('[data-opt]', el).forEach((i) => { draft.options[Number(i.dataset.opt)] = i.value; });
}
function onPanelInput(e) { if (e.target.matches('[data-opt], #mw-poll-t')) readDraft(); }

async function onPanelSubmit(e) {
  e.preventDefault();
  const hub = ctx.hub;
  const id = e.target.id;
  if (id === 'mw-q-f') { hub.setWall({ question: $('#mw-q', el).value.trim() }); toast({ title: 'Question mise à jour', tone: 'live' }); }
  if (id === 'mw-qa-f') { hub.setWall({ qaTitle: $('#mw-qa-t', el).value.trim() }); toast({ title: 'Titre mis à jour', tone: 'live' }); }
  if (id === 'mw-msg-f') { const m = $('#mw-msg', el).value.trim(); if (m) sendMsg(m); }
  if (id === 'mw-ext-f') { const u = $('#mw-ext', el).value.trim(); if (u && !/^https?:\/\//i.test(u)) return toast({ title: 'Adresse incomplète', text: 'Elle doit commencer par https://', tone: 'warm' }); hub.setWall({ externalUrl: u, scene: u ? 'external' : wall().scene }); toast({ title: u ? 'Page externe à l’écran' : 'Lien retiré', tone: 'live' }); }
  if (id === 'mw-add') { const v = $('#mw-add-in', el).value.trim(); if (!v) return; try { await hub.sendWord(v); $('#mw-add-in', el).value = ''; } catch (err) { toast({ title: 'Mot refusé', text: esc(err.message), tone: 'warm' }); } }
  if (id === 'mw-poll-f') {
    readDraft();
    const options = draft.options.map((o) => o.trim()).filter(Boolean);
    if (options.length < 2) return toast({ title: 'Deux réponses au minimum', tone: 'warm' });
    await hub.setPoll({ title: draft.title || 'Votre avis ?', options, multiple: draft.multiple });
    hub.setWall({ scene: 'poll' });
    toast({ title: 'Sondage lancé', text: esc(draft.title), tone: 'live' });
    panelKey = '';
    renderPanel(true);
  }
}

function sendMsg(m) {
  const now = Date.now() + ctx.hub.state.serverOffset;
  ctx.hub.setWall({ message: m, scene: 'message', countdownTo: countdown ? now + countdown * 60000 : 0, countdownFrom: now });
  toast({ title: 'Message à l’écran', text: esc(m) + (countdown ? ` · compte à rebours ${countdown} min` : ''), tone: 'blue' });
}

/* =========================================================================
   Habillage : style de fond, couleurs, photo, client
   ========================================================================= */
function renderTheme(force) {
  const t = theme();
  const host = $('#mw-theme', el);
  if (force || !host.children.length) host.innerHTML = `
    <div class="scene-keys" id="th-styles" role="radiogroup" aria-label="Style de fond" style="grid-template-columns:repeat(5,minmax(0,1fr));gap:8px">
      ${STYLES.map((s) => `<button class="key th-key" role="radio" data-style="${s.id}" title="${esc(s.hint)}"><i class="th-dot" data-style="${s.id}"></i><span>${s.label}</span></button>`).join('')}
    </div>
    <div id="th-colors" class="mt-3">
      <div class="row wrap" style="gap:8px"><span class="lbl" style="font:500 10.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--text-3)">Couleur</span>
        <div class="seg" id="th-target" style="height:30px"><span class="thumb"></span><button aria-selected="true" data-target="c1" style="height:26px;font-size:11px">Fond</button><button aria-selected="false" data-target="c2" style="height:26px;font-size:11px">Seconde</button></div></div>
      <div class="swatches mt-2" id="th-swatches">${SWATCHES.map((c) => `<button class="swatch" data-color="${c}" style="--c:${c}" aria-label="${c}"></button>`).join('')}<label class="swatch custom" title="Autre couleur"><input type="color" id="th-pick" aria-label="Couleur personnalisée"><span>+</span></label></div>
    </div>
    <div id="th-photos" class="mt-3"><span class="lbl" style="font:500 10.5px/1 var(--f-mono);letter-spacing:.14em;text-transform:uppercase;color:var(--text-3)">Photo de fond</span>
      <div class="mt-2" style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">${BACKS.map((f) => `<button data-back="${f}" aria-pressed="false" style="position:relative;aspect-ratio:16/10;border-radius:8px;overflow:hidden;border:2px solid transparent"><img src="${photo(f, true)}" alt="" style="width:100%;height:100%;object-fit:cover" loading="lazy"></button>`).join('')}</div></div>
    <div class="divider"></div>
    <span class="eyebrow">Aux couleurs du client</span>
    <form class="row mt-2" id="th-client-f"><input class="input" id="th-client" placeholder="Nom du client (affiché sur le message)" maxlength="40" style="height:42px"><button class="btn btn-quiet btn-icon btn-sm" aria-label="Appliquer">${icon('check')}</button></form>
    <div class="row wrap mt-2" id="th-logo-row">
      <label class="btn btn-quiet btn-sm">${icon('image')}Logo du client<input type="file" id="th-logo" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden></label>
      <span id="th-logo-prev"></span>
    </div>
    <div class="toggle-row mt-3"><div class="l"><b>Signature Médiacom</b><small>Marque en haut de l’écran, discrète avec un logo client</small></div><button class="switch" role="switch" id="th-brand" aria-label="Signature Médiacom"></button></div>
    <p class="dim mt-3" style="font-size:12px;margin-bottom:0">Argument de vente : l’écran se met aux couleurs de chaque client en quelques secondes, fond, couleur et logo compris.</p>`;

  $$('[data-style]', $('#th-styles', el)).forEach((b) => b.setAttribute('aria-checked', b.dataset.style === t.style));
  $('#th-colors', el).hidden = !(t.style === 'uni' || t.style === 'degrade');
  $$('[data-target]', el).forEach((b) => b.hidden = b.dataset.target === 'c2' && t.style !== 'degrade');
  $('#th-photos', el).hidden = !(t.style === 'lumiere' || t.style === 'photo');
  const cur = t[swatchTarget];
  $$('[data-color]', el).forEach((b) => b.setAttribute('aria-pressed', b.dataset.color === cur));
  const pick = $('#th-pick', el); if (pick && pick.value !== cur) pick.value = cur;
  $$('[data-back]', el).forEach((b) => { const on = b.dataset.back === (wall().photo || 'scene-m-rouge'); b.setAttribute('aria-pressed', on); b.style.borderColor = on ? 'var(--blue)' : 'transparent'; });
  const ci = $('#th-client', el); if (document.activeElement !== ci) ci.value = t.client || '';
  $('#th-logo-prev', el).innerHTML = t.logo ? `<span class="row" style="gap:8px"><img src="${t.logo}" alt="" style="height:32px;width:auto;max-width:120px;object-fit:contain;background:#fff;border-radius:6px;padding:3px"><button class="btn btn-quiet btn-sm btn-icon" data-act="logo-del" aria-label="Retirer le logo">${icon('x')}</button></span>` : '<span class="dim" style="font-size:12px">PNG ou SVG sur fond transparent, de préférence</span>';
  $('#th-brand', el).setAttribute('aria-checked', t.brand !== false);
  $('#mw-theme-r', el).textContent = STYLES.find((s) => s.id === t.style)?.label || '';
  const seg = $('#th-target', el);
  const b = seg.querySelector('[aria-selected="true"]'); const th = seg.querySelector('.thumb');
  if (b) { th.style.width = b.offsetWidth + 'px'; th.style.transform = `translateX(${b.offsetLeft}px)`; }
}

function onThemeClick(e) {
  const hub = ctx.hub;
  const st = e.target.closest('button[data-style]'); if (st) { hub.setWall({ theme: { style: st.dataset.style } }); return; }
  const tg = e.target.closest('[data-target]'); if (tg) { swatchTarget = tg.dataset.target; $$('[data-target]', el).forEach((x) => x.setAttribute('aria-selected', x === tg)); renderTheme(); return; }
  const sw = e.target.closest('[data-color]'); if (sw) { hub.setWall({ theme: { [swatchTarget]: sw.dataset.color } }); return; }
  const bk = e.target.closest('[data-back]'); if (bk) { hub.setWall({ photo: bk.dataset.back }); return; }
  if (e.target.closest('[data-act="logo-del"]')) { hub.setWall({ theme: { logo: '' } }); return; }
  if (e.target.closest('#th-brand')) { hub.setWall({ theme: { brand: !(theme().brand !== false) } }); }
}
function onThemeChange(e) {
  if (e.target.id === 'th-pick') { ctx.hub.setWall({ theme: { [swatchTarget]: e.target.value } }); return; }
  if (e.target.id === 'th-logo' && e.target.files[0]) loadLogo(e.target.files[0]).then((data) => { ctx.hub.setWall({ theme: { logo: data } }); toast({ title: 'Logo client à l’écran', tone: 'live' }); }).catch((err) => toast({ title: 'Logo refusé', text: esc(err.message), tone: 'warm' })).finally(() => { e.target.value = ''; });
}
// Le logo part en petit (320 px de haut, PNG) : il tient dans l'état du mur, et reste net sur 4 m de large
function loadLogo(file) {
  return new Promise((resolve, reject) => {
    if (file.size > 6 * 1024 * 1024) return reject(new Error('Fichier trop lourd (6 Mo max)'));
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const h = 320, w = Math.round((img.naturalWidth / img.naturalHeight) * h);
      const c = Object.assign(document.createElement('canvas'), { width: Math.min(w, 1400), height: h });
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      let data = c.toDataURL('image/png');
      if (data.length > 78000) data = c.toDataURL('image/webp', 0.85);
      if (data.length > 78000) return reject(new Error('Logo trop détaillé : exportez-le en PNG simple'));
      resolve(data);
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Image illisible')); };
    img.src = url;
  });
}

/* =========================================================================
   Liens de l'écran (ordinateur du mur, Nolan)
   ========================================================================= */
function linksSheet() {
  const b = base();
  const links = [
    { t: 'Écran, suit la tablette', u: `${b}/ecran`, main: true },
    ...SCENES.map((s) => ({ t: `${s.label} · figé`, u: `${b}/ecran/${SLUG[s.id]}` })),
    { t: 'Visiteurs (QR)', u: `${b}/nuage` },
    { t: 'Mur habillé (en-tête, bandeau)', u: `${b}/mur` },
  ];
  sheet(`<div class="sheet-head"><span class="eyebrow">Ordinateur du mur</span><h2>Une adresse par scène</h2>
      <p class="lede">Ouvrir <b>/ecran</b> dans Chrome sur le PC relié au boîtier vidéo, double-clic pour le plein écran : il suit ce que la tablette choisit. Les adresses figées restent sur une scène quoi qu’il arrive.</p></div>
    <div class="sheet-body"><div class="links">${links.map((l) => `<div class="link-row ${l.main ? 'main' : ''}"><div class="qr sm">${qrSVG(l.u, { ecc: 'M', margin: 1 })}</div><div class="t"><b>${esc(l.t)}</b><code>${esc(l.u)}</code></div><button class="btn btn-quiet btn-sm" data-copy="${esc(l.u)}">${icon('copy')}Copier</button></div>`).join('')}</div>
      <p class="dim mt-3" style="font-size:12px">Adresse de base : ${esc(b)}. Pour une adresse internet, renseignez « Adresse publique » dans l’onglet Pass.</p></div>`, {
    onMount: (d) => d.addEventListener('click', async (e) => {
      const c = e.target.closest('[data-copy]'); if (!c) return;
      try { await navigator.clipboard.writeText(c.dataset.copy); toast({ title: 'Adresse copiée', text: esc(c.dataset.copy), tone: 'live' }); }
      catch { toast({ title: 'Copie impossible', text: 'Sélectionnez l’adresse et copiez-la à la main.', tone: 'warm' }); }
    }),
  });
}

function update(reason) {
  if (!el) return;
  if (reason === 'screens') { renderScreen(); return; }
  if (reason === 'session' || reason === 'sessions') { if (reason === 'sessions' && ctx.hub.state.mode !== 'local') sessions = ctx.hub.state.sessions || sessions; renderSession(); return; }
  if (reason && !['words', 'wall', 'poll', 'questions', 'hello', 'boot', 'settings'].includes(reason)) return;
  if (['words', 'poll', 'questions', 'hello', 'boot', 'settings'].includes(reason)) renderSession();
  if (reason === 'hello' || reason === 'boot') renderScreen();
  const w = wall();
  $$('[data-scene]', el).forEach((b) => { const on = b.dataset.scene === (w.scene || 'cloud'); b.setAttribute('aria-checked', on); on ? b.setAttribute('aria-current', 'page') : b.removeAttribute('aria-current'); });
  $('#mw-state', el).innerHTML = `<span class="led" data-s="${w.scene === 'black' ? '' : 'hot'}"></span>${SCENES.find((s) => s.id === (w.scene || 'cloud'))?.label || ''}`;
  if (reason === 'words') { renderWords(); return; }
  if (reason === 'questions') { renderQuestions(); return; }
  if (reason === 'poll' && (w.scene || 'cloud') === 'poll' && panelKey === 'poll|' + (ctx.hub.state.poll?.id || '')) { renderPollLive(); $('#mw-panel-r', el).innerHTML = `<span class="led" data-s="${ctx.hub.state.poll?.open === false ? '' : 'live'}"></span>${ctx.hub.state.poll?.total || 0} votes`; return; }
  renderPanel(reason === 'boot');
  renderTheme();
}

// Sortie de l'écran en plein écran sur la tablette (pour la montrer à un client sans quitter l'app)
function fullPreview() {
  const host = $('#show');
  host.innerHTML = `<div class="wall-full"><iframe src="/ecran?preview=1" title="Écran plein cadre"></iframe></div>
    <button class="btn btn-quiet btn-icon" style="position:absolute;top:calc(16px + env(safe-area-inset-top));right:16px;z-index:2" aria-label="Fermer">${icon('x')}</button>`;
  host.classList.add('is-open');
  host.requestFullscreen?.().catch(() => {});
  const close = () => { document.removeEventListener('keydown', onKey); host.classList.remove('is-open'); host.innerHTML = ''; if (document.fullscreenElement) document.exitFullscreen().catch(() => {}); };
  const onKey = (e) => e.key === 'Escape' && close();
  host.onclick = close;
  host.onpointerdown = host.onpointerup = null;
  document.addEventListener('keydown', onKey);
}

/* =========================================================================
   Écran connecté : l'ordinateur du mur se signale toutes les 5 s
   ========================================================================= */
function renderScreen() {
  const box = $('#mw-screen', el);
  if (!box) return;
  const hub = ctx.hub;
  if (hub.state.mode === 'local') { box.innerHTML = ''; return; }
  const now = Date.now() + (hub.state.serverOffset || 0);
  const list = (hub.state.screens || []).filter((s) => now - s.at < 120000);
  const stateEl = $('#mw-state', el);
  if (stateEl) stateEl.hidden = list.some((s) => now - s.at <= 15000); // l'écran réel prime sur la scène demandée
  if (!list.length) { box.innerHTML = `<span class="led" data-s="off"></span>Aucun écran branché`; box.title = 'Ouvrez /ecran sur l’ordinateur du mur : il apparaîtra ici.'; return; }
  box.innerHTML = list.map((s) => {
    const lost = now - s.at > 15000;
    const name = s.locked ? `figé · ${SCENES.find((x) => SLUG[x.id] === s.locked.replace(/^\//, ''))?.label || s.locked}` : (SCENES.find((x) => x.id === s.scene)?.label || '');
    return `<span class="led" data-s="${lost ? 'warm' : 'live'}"></span>${lost ? `Écran perdu depuis ${Math.round((now - s.at) / 1000)} s` : `Écran ${esc(name)}${s.fs ? ' · plein écran' : ''}${s.w ? ` · ${s.w}×${s.h}` : ''}`}`;
  }).join('<span class="sep"></span>');
  box.title = list.map((s) => `${s.id} · depuis ${ago(s.since)}`).join('\n');
}

/* =========================================================================
   Session : une prestation = une session ; close, elle garde ses résultats (rapport client)
   ========================================================================= */
const fmtDate = (ts) => new Date(ts).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
function renderSession() {
  const host = $('#mw-session', el);
  if (!host) return;
  const hub = ctx.hub;
  const s = hub.state.session || { name: hub.state.settings?.eventName || 'Salon', client: '', startedAt: 0 };
  const st = hub.sessionStats();
  const client = wall().theme?.client || s.client || '';
  const cloudLink = hub.state.mode === 'hub' ? withToken('/rapport?id=live') : '/rapport?id=live';
  const stat = (n, l1, l2) => `<div class="ses-stat"><b>${n}</b><span>${n > 1 ? l2 : l1}</span></div>`;
  $('#mw-ses-r', el).innerHTML = `<span class="led" data-s="live"></span>${st.sends + st.votes + st.questions} participations`;
  host.innerHTML = `
    <div class="ses-now">
      <div class="ses-head">
        <div><span class="eyebrow">En cours${s.startedAt ? ` · depuis ${fmtDate(s.startedAt)}` : ''}</span>
          <h3 class="h3 mt-1">${esc(s.name || 'Salon')}${client ? ` <span class="dim">pour</span> ${esc(client)}` : ''}</h3></div>
        <span class="spacer"></span>
        <a class="btn btn-quiet btn-sm" href="${cloudLink}" target="_blank" rel="noopener">${icon('book')}Rapport en direct</a>
        <button class="btn btn-primary btn-sm" data-ses="new">${icon('plus')}Nouvelle session</button>
      </div>
      <div class="ses-stats mt-3">
        ${stat(st.sends, 'mot envoyé', 'mots envoyés')}${stat(st.words, 'mot distinct', 'mots distincts')}${stat(st.votes, 'vote', 'votes')}${stat(st.voters, 'votant', 'votants')}${stat(st.questions, 'question', 'questions')}${stat(st.qvotes, 'soutien', 'soutiens')}
      </div>
      <form class="row wrap mt-3" id="mw-ses-f" style="gap:8px">
        <input class="input" id="mw-ses-name" placeholder="Nom de la session (SBE Marseille, plénière…)" maxlength="80" value="${esc(s.name === 'Salon' ? '' : s.name || '')}" style="flex:1;min-width:220px;height:40px">
        <input class="input" id="mw-ses-client" placeholder="Client (affiché à l’écran)" maxlength="40" value="${esc(client)}" style="flex:1;min-width:180px;height:40px">
        <button class="btn btn-quiet btn-sm">${icon('check')}Renommer</button>
      </form>
      <p class="dim mt-2" style="font-size:12.5px;margin-bottom:0">Argument de vente : la session interactive est administrée par Médiacom. Le client ne voit que l’écran et le QR ; il repart avec le rapport (mots, votes, questions).</p>
    </div>
    <div class="divider"></div>
    <div class="row wrap"><span class="eyebrow">Sessions closes</span><span class="spacer"></span><span class="dim mono" style="font-size:12px">${sessions.length ? `${sessions.length} archivée${sessions.length > 1 ? 's' : ''}` : ''}</span></div>
    <div class="ses-list mt-2">${sessions.length ? sessions.map((x) => `<div class="ses-row" data-id="${esc(x.id)}">
        <div class="t"><b>${esc(x.name || 'Session')}</b>${x.client ? `<span class="dim"> · ${esc(x.client)}</span>` : ''}<small class="dim mono">${fmtDate(x.startedAt || x.endedAt)} → ${fmtDate(x.endedAt)} · ${x.stats?.sends || 0} mots · ${x.stats?.votes || 0} votes · ${x.stats?.questions || 0} questions</small></div>
        <div class="a"><a class="btn btn-quiet btn-sm" href="${hub.state.mode === 'hub' ? withToken('/rapport?id=' + encodeURIComponent(x.id)) : '/rapport?id=' + encodeURIComponent(x.id)}" target="_blank" rel="noopener">${icon('book')}Rapport</a>
          <button class="btn btn-quiet btn-sm" data-ses="csv" data-id="${esc(x.id)}">${icon('download')}CSV</button>
          <button class="btn btn-quiet btn-sm btn-icon" data-ses="del" data-id="${esc(x.id)}" aria-label="Supprimer">${icon('trash')}</button></div>
      </div>`).join('') : '<p class="dim" style="font-size:13px;margin:0">Aucune session close. « Nouvelle session » archive celle-ci avec ses résultats et repart à zéro pour le client suivant.</p>'}</div>`;
}

async function onSessionClick(e) {
  const hub = ctx.hub;
  const b = e.target.closest('[data-ses]');
  if (!b) return;
  if (b.dataset.ses === 'new') return newSessionSheet();
  if (b.dataset.ses === 'del') {
    const ok = await confirmSheet({ title: 'Supprimer cette session close ?', text: 'Son rapport et ses résultats disparaissent définitivement.', ok: 'Supprimer', danger: true });
    if (!ok) return;
    await hub.deleteSession(b.dataset.id);
    sessions = await hub.listSessions();
    renderSession();
    return;
  }
  if (b.dataset.ses === 'csv') {
    const s = await hub.getSession(b.dataset.id);
    if (!s) return toast({ title: 'Session introuvable', tone: 'warm' });
    download(`mediacom-session-${(s.client || s.name || 'session').replace(/[^\w-]+/g, '-').toLowerCase()}.csv`, sessionCSV(s), 'text/csv');
  }
}
function csvCell(v) { let s = v == null ? '' : String(v); if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; return `"${s.replace(/"/g, '""')}"`; }
function sessionCSV(s) {
  const rows = [['Rubrique', 'Texte', 'Nombre', 'Détail'].map(csvCell).join(';')];
  (s.words || []).forEach((w) => rows.push(['Nuage · ' + (s.question || 'mot'), w.text, w.count, ''].map(csvCell).join(';')));
  if (s.poll) s.poll.options.forEach((o) => rows.push(['Sondage · ' + s.poll.title, o.label, o.count || 0, s.poll.total ? Math.round(((o.count || 0) / s.poll.total) * 100) + ' %' : ''].map(csvCell).join(';')));
  (s.questions || []).forEach((q) => rows.push(['Question', q.text, q.votes || 0, [q.answered ? 'répondue' : '', q.pinned ? 'mise en avant' : ''].filter(Boolean).join(', ')].map(csvCell).join(';')));
  return '﻿' + rows.join('\r\n');
}
async function onSessionSubmit(e) {
  e.preventDefault();
  if (e.target.id !== 'mw-ses-f') return;
  const name = $('#mw-ses-name', el).value.trim(), client = $('#mw-ses-client', el).value.trim();
  await ctx.hub.updateSession({ name: name || 'Salon', client });
  toast({ title: 'Session renommée', text: esc(name || 'Salon') + (client ? ' · ' + esc(client) : ''), tone: 'live' });
  renderSession();
}
function newSessionSheet() {
  const hub = ctx.hub;
  const st = hub.sessionStats();
  const has = st.sends || st.votes || st.questions;
  sheet(`<div class="sheet-head"><span class="eyebrow">Session interactive</span><h2>Nouvelle session</h2>
      <p class="lede">${has ? `La session en cours (${st.sends} mots, ${st.votes} votes, ${st.questions} questions) est archivée avec son rapport.` : 'La session en cours est vide : rien à archiver.'} L’écran repart à zéro, le QR ne change pas.</p></div>
    <div class="sheet-body"><form class="stack" id="ses-new-f" style="gap:14px">
      <div class="field"><label for="ses-n">Nom de la session</label><input class="input" id="ses-n" placeholder="Plénière du matin, Convention Acme…" maxlength="80" autofocus></div>
      <div class="field"><label for="ses-c">Client (affiché à l’écran, vide = Médiacom seul)</label><input class="input" id="ses-c" placeholder="Nom du client" maxlength="40" value="${esc(wall().theme?.client || '')}"></div>
      <div class="field"><label for="ses-q">Première question du nuage</label><input class="input" id="ses-q" placeholder="${esc(QUESTIONS[0])}" maxlength="120" value="${esc(wall().question || '')}">
        <div class="chips sm mt-1">${QUESTIONS.map((q) => `<button type="button" class="chip" data-sq="${esc(q)}">${esc(q)}</button>`).join('')}</div></div>
      ${has ? `<div class="toggle-row"><div class="l"><b>Archiver la session en cours</b><small>Décoché : ses résultats sont perdus</small></div><button type="button" class="switch" role="switch" id="ses-arch" aria-checked="true" aria-label="Archiver"></button></div>` : ''}
      <div class="row"><span class="spacer"></span><button class="btn btn-primary">${icon('play')}Ouvrir la session</button></div>
    </form></div>`, {
    onMount: (d) => {
      d.addEventListener('click', (e) => {
        const c = e.target.closest('[data-sq]'); if (c) { d.querySelector('#ses-q').value = c.dataset.sq; return; }
        const a = e.target.closest('#ses-arch'); if (a) a.setAttribute('aria-checked', a.getAttribute('aria-checked') !== 'true');
      });
      d.querySelector('#ses-new-f').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = d.querySelector('#ses-n').value.trim(), client = d.querySelector('#ses-c').value.trim(), question = d.querySelector('#ses-q').value.trim();
        const archive = d.querySelector('#ses-arch')?.getAttribute('aria-checked') !== 'false';
        closeSheet();
        try {
          await hub.newSession({ name, client, question, archive });
          sessions = await hub.listSessions();
          hub.setWall({ scene: 'cloud' });
          renderSession();
          toast({ title: `Session ${esc(name || 'ouverte')}`, text: archive && has ? 'La précédente est archivée, son rapport est prêt.' : 'Écran et compteurs à zéro.', tone: 'live' });
        } catch (err) { toast({ title: 'Session impossible', text: esc(err.message), tone: 'warm' }); }
      });
    },
  });
}

export default {
  id: 'mur', title: 'Écran', short: 'Écran', sub: 'Régie de l’écran LED du stand', icon: 'wall',
  mount, update,
};
