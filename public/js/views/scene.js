// Configurateur 3D : plateau, mur LED incurvé animé, truss, lyres et faisceaux, brume, salle ; MediaScène déployable (60 à 160 m²).
import { icon, esc, $, $$, toast, download, reduced } from '../ui.js';
import { MEDIASCENE } from '../data.js';

let el, ctx, T = null, world = null, building = null, active = false;
const conf = { format: 'pleniere', width: 8, pitch: 2.6, theme: 'bleu', lyres: 6, haze: true, auto: true, msSize: 60 };
const THEMES = {
  bleu: { a: 0x3192ff, b: 0x9fd0ff, label: 'Bleu Médiacom' },
  chaud: { a: 0xffa53d, b: 0xffe2b0, label: 'Ambre' },
  rouge: { a: 0xff3b3b, b: 0xff9a7a, label: 'Rouge scène' },
  blanc: { a: 0xf2f6ff, b: 0xbfd8ff, label: 'Blanc froid' },
};
const FORMATS = { pleniere: 'Plénière', gala: 'Gala', concert: 'Concert', mediascene: 'MediaScène' };
const fmt = (n) => String(n).replace('.', ',');

// Dimensions des fiches techniques : 60 m² (remorque 3,5 t), 3-en-1 80/100/120 m² (semi-remorque) et 160 m² avec régie
function msModel() {
  const size = conf.msSize;
  const m = MEDIASCENE.models.find((x) => x.sizes.includes(size));
  const [W, D] = m.deck[size];
  return { id: m.id, geo: MS_GEO[m.id], size, W, D, clear: m.clearance, deckH: m.deckH, trailer: m.trailer, name: m.name, load: m.id === 'ms60' ? '1,6 t' : m.id === 'ms160' ? '6 t' : '10,1 t' };
}
// Géométrie 3D par modèle (m). Sources : fiches techniques Médiacom, note de calcul EMS STAGE 60 (DEKRA / Abaqsys,
// 25/03/2026 : toit 9,56 × 7,76 m, plancher 9,25 × 6,59 m), doc EMS Stage 100 (plans : hors-tout 8,6 m), fiche SM 160.
// under : 'plateau' = hauteur sous points moteurs comptée depuis le plancher, 'sol' = depuis le sol (plans EMS 3-en-1).
// Ailes de toit et planchers : 1 panneau (60, 3-en-1) ou 2 panneaux articulés (160, pour tenir dans 4,10 m sur route).
const MS_GEO = {
  ms60: {
    box: 2.5, roadH: 4, roadDeck: 0.85, roofW: 9.56, roofFront: 2.63, roofBack: 2.63, roofT: 0.24, floorT: 0.14, folds: 1, under: 'plateau',
    trailer: 'timon', axles: [-0.42, 0.42], wheelR: 0.33, tyreW: 0.2, tow: 1.75, frame: 'alu', struct: 'alu', colW: 0.9, colT: 0.22,
    post: 'tube', edge: 0.3, edgeTri: true, edgeMat: 'alu', son: 'tri', wingSon: 0.85, arrays: 6, ponts: [1.1, -1.5], pont: 0.3, drop: 0.55,
    deck: 0x3a2a20, top: 0xe9edf2, floorSkin: 0xdfe4ea, brand: true,
  },
  ms120: {
    box: 2.46, roadH: 4, roadDeck: 1.2, base: 6.86, roofW: 12.9, roofFront: 2.74, roofBack: 2.74, roofT: 0.26, floorT: 0.12, folds: 1, under: 'sol',
    trailer: 'semi', axles: [-4.6, -3.25], wheelR: 0.54, tyreW: 0.38, frame: 'acier', struct: 'acier', colW: 1.3, colT: 0.3,
    post: 'h30', postSize: 0.3, postIn: 0.2, edge: 0.34, edgeTri: true, edgeMat: 'alu', son: 'carre', wingSon: 1.3, arrays: 8,
    cap: { 80: 1.25, 100: 1.25, 120: 2.5 }, ponts: [0.9, 3.7, -1.3], pont: 0.3, drop: 1.2,
    deck: 0x18191c, top: 0xe9edf2, floorSkin: 0xdfe4ea, brand: true,
  },
  ms160: {
    box: 2.55, roadH: 4.1, roadDeck: 1.12, roofW: 14, roofFront: 5.475, roofBack: 3.975, roofT: 0.42, floorT: 0.15, folds: 2, under: 'plateau',
    trailer: 'semi', axles: [-5.3, -3.95, -2.6], wheelR: 0.48, tyreW: 0.38, frame: 'acier', struct: 'acier', colW: 2, colT: 0.25,
    post: 'tri', postSize: 0.5, postIn: 0.4, edge: 0.42, edgeTri: false, edgeMat: 'acier', son: 'carre', wingSon: 1.1, arrays: 10,
    ponts: [2.7, -4.8, -1.6], pont: 0.5, drop: 1.4, fascia: 0.75, order: ['calage', 'ailes', 'toit', 'planchers', 'poteaux', 'son'],
    deck: 0x231d18, top: 0x41464f, floorSkin: 0x6b4a33, brand: false,
  },
};
const LOGO_PATH = 'M0 0L128.6 134L256 0V110.4L130.6 241L0 110.1Z M0 152.4V242H80.3Z M256 152.5V242H175.9Z';

function specs() {
  const w = conf.width, h = Math.round((w * 9) / 16 * 2) / 2;
  const cols = Math.round(w / 0.5), rows = Math.round(h / 0.5);
  return { w, h, area: w * h, px: Math.round((w * 1000) / conf.pitch), py: Math.round((h * 1000) / conf.pitch), cabinets: cols * rows };
}

function mount(root, c) {
  el = root;
  ctx = c;
  el.innerHTML = `<div class="rack">
    <article class="module span-8 md-8 sticky" style="--i:0">
      <header class="mod-head"><span class="n">01</span><span class="t">Plateau 3D</span><span class="r">glisser pour tourner · pincer pour zoomer</span></header>
      <div class="mod-body" style="padding:12px">
        <div class="stage3d" id="s3-host">
          <div class="hud" id="s3-hud"></div>
          <div class="cams">
            <button class="btn btn-quiet btn-sm" data-cam="public">Public</button>
            <button class="btn btn-quiet btn-sm" data-cam="scene">Scène</button>
            <button class="btn btn-quiet btn-sm" data-cam="top">Plongée</button>
          </div>
          <div class="empty" id="s3-loading" style="position:absolute;inset:0">Chargement du plateau…</div>
        </div>
      </div>
    </article>
    <article class="module span-4 md-4" style="--i:1">
      <header class="mod-head"><span class="n">02</span><span class="t">Configuration</span></header>
      <div class="mod-body stack">
        <div class="field"><span class="lbl">Format</span><div class="chips sm" id="s3-format">${Object.entries(FORMATS).map(([k, v]) => `<button class="chip" data-format="${k}" aria-pressed="${k === conf.format}">${v}</button>`).join('')}</div></div>
        <div class="stack" id="s3-led-ctrl" style="gap:18px">
          <div class="fader"><label for="s3-w">Largeur du mur LED</label><output id="s3-w-o"></output><input type="range" id="s3-w" min="4" max="14" step="1" value="${conf.width}"></div>
          <div class="field"><span class="lbl">Pas de pixel</span><div class="chips sm" id="s3-pitch">${[2.6, 3.9].map((p) => `<button class="chip" data-pitch="${p}" aria-pressed="${p === conf.pitch}">P${String(p).replace('.', ',')}</button>`).join('')}</div></div>
        </div>
        <div class="stack" id="s3-ms-ctrl" style="gap:14px" hidden>
          <div class="field"><span class="lbl">Taille du plateau</span><div class="chips sm" id="s3-ms-size">${MEDIASCENE.sizes.map((v) => `<button class="chip" data-size="${v}" aria-pressed="${v === conf.msSize}">${v} m²</button>`).join('')}</div></div>
          <div class="deploy"><button class="btn btn-primary" id="s3-deploy">${icon('play')}Rejouer le déploiement</button>
            <div class="deploy-track"><i id="s3-deploy-bar"></i></div><span class="deploy-step" id="s3-deploy-step"></span></div>
        </div>
        <div class="field"><span class="lbl">Lumière</span><div class="chips sm" id="s3-theme">${Object.entries(THEMES).map(([k, t]) => `<button class="chip" data-theme="${k}" aria-pressed="${k === conf.theme}">${t.label}</button>`).join('')}</div></div>
        <div class="fader"><label for="s3-l">Lyres</label><output id="s3-l-o"></output><input type="range" id="s3-l" min="2" max="10" step="2" value="${conf.lyres}"></div>
        <div>
          <div class="toggle-row"><div class="l"><b>Brume</b><small>Rend les faisceaux visibles</small></div><button class="switch" role="switch" data-tg="haze" aria-checked="${conf.haze}" aria-label="Brume"></button></div>
          <div class="toggle-row"><div class="l"><b>Rotation automatique</b><small>Pour la démo en libre-service</small></div><button class="switch" role="switch" data-tg="auto" aria-checked="${conf.auto}" aria-label="Rotation automatique"></button></div>
        </div>
        <div class="spec-grid" id="s3-specs" style="grid-template-columns:repeat(2,minmax(0,1fr))"></div>
        <p class="dim" style="font-size:12px;margin:0" id="s3-note"></p>
        <div class="row wrap">
          <button class="btn btn-quiet btn-sm" id="s3-shot">${icon('camera')}Capture</button>
          <button class="btn btn-primary btn-sm" id="s3-lead">${icon('plus')}Associer à un contact</button>
        </div>
      </div>
    </article>
  </div>`;

  const w = $('#s3-w', el), l = $('#s3-l', el);
  const syncFaders = () => {
    for (const r of [w, l]) r.style.setProperty('--p', `${((r.value - r.min) / (r.max - r.min)) * 100}%`);
    $('#s3-w-o', el).textContent = `${conf.width} m`;
    $('#s3-l-o', el).textContent = conf.lyres;
    renderSpecs();
  };
  w.addEventListener('input', () => { conf.width = Number(w.value); syncFaders(); world?.rebuild(); });
  l.addEventListener('input', () => { conf.lyres = Number(l.value); syncFaders(); world?.rebuild(); });
  $('#s3-format', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-format]');
    if (b) setFormat(b.dataset.format);
  });
  $('#s3-ms-size', el).addEventListener('click', (e) => {
    const b = e.target.closest('[data-size]');
    if (!b) return;
    conf.msSize = Number(b.dataset.size);
    $$('[data-size]', el).forEach((x) => x.setAttribute('aria-pressed', x === b));
    renderSpecs();
    world?.rebuild();
    world?.deploy(0, 1);
    world?.camTo('public');
  });
  $('#s3-deploy', el).addEventListener('click', () => world?.deploy(0, 1));
  el.addEventListener('click', (e) => {
    const p = e.target.closest('[data-pitch]');
    if (p) { conf.pitch = Number(p.dataset.pitch); $$('[data-pitch]', el).forEach((x) => x.setAttribute('aria-pressed', x === p)); renderSpecs(); }
    const t = e.target.closest('[data-theme]');
    if (t) { conf.theme = t.dataset.theme; $$('[data-theme]', el).forEach((x) => x.setAttribute('aria-pressed', x === t)); world?.recolor(); }
    const g = e.target.closest('[data-tg]');
    if (g) { conf[g.dataset.tg] = !conf[g.dataset.tg]; g.setAttribute('aria-checked', conf[g.dataset.tg]); world?.toggles(); }
    const cam = e.target.closest('[data-cam]');
    if (cam) world?.camTo(cam.dataset.cam);
  });
  $('#s3-shot', el).addEventListener('click', () => {
    if (!world) return;
    world.renderOnce();
    world.renderer.domElement.toBlob((b) => b && download(`mediacom-plateau-${conf.format}.png`, b));
  });
  $('#s3-lead', el).addEventListener('click', () => {
    if (conf.format === 'mediascene') {
      const m = msModel();
      ctx.newLead({ needs: ['Scène mobile MediaScène', 'Son', 'Lumière'], notes: `Scène 3D : ${m.name}, plateau ${m.size} m² (${fmt(m.W)} × ${fmt(m.D)} m).` });
      return;
    }
    const s = specs();
    ctx.newLead({ eventType: { pleniere: 'Convention / plénière', gala: 'Soirée d’entreprise', concert: 'Événement public', mediascene: 'Événement public' }[conf.format], needs: ['Écran LED', 'Lumière', 'Structure & levage'],
      notes: `Plateau 3D : ${FORMATS[conf.format]}, mur LED ${s.w} × ${s.h} m P${String(conf.pitch).replace('.', ',')} (${s.px} × ${s.py} px, ${s.cabinets} cabinets), ${conf.lyres} lyres, lumière ${THEMES[conf.theme].label.toLowerCase()}.` });
  });
  syncFaders();
}

function setFormat(f) {
  conf.format = f;
  $$('[data-format]', el).forEach((x) => x.setAttribute('aria-pressed', x.dataset.format === f));
  const ms = f === 'mediascene';
  $('#s3-led-ctrl', el).hidden = ms;
  $('#s3-ms-ctrl', el).hidden = !ms;
  renderSpecs();
  if (!world) return;
  world.rebuild();
  if (ms) world.deploy(0, 1);
  world.camTo('public');
}

function renderSpecs() {
  if (conf.format === 'mediascene') {
    const m = msModel();
    $('#s3-specs', el).innerHTML = [[`${fmt(m.W)} × ${fmt(m.D)} m`, 'Plateau'], [`${m.size} m²`, 'Surface'], [`${fmt(m.clear)} m`, 'Sous points moteurs'], [m.load, 'Charge en toiture']]
      .map(([v, l]) => `<div class="spec"><b style="font-size:17px">${v}</b><span>${l}</span></div>`).join('');
    $('#s3-hud', el).innerHTML = `<span class="tag blue">MediaScène</span><span class="tag">${esc(m.name)} · ${m.size} m²</span>`;
    $('#s3-note', el).textContent = {
      ms60: 'Cotes de la fiche 60 m² et de la note de calcul EMS. Ordre hydraulique de la fiche : calage, ailes de toit, planchers, montée du toit.',
      ms120: 'Cotes de la fiche EMS Stage 3-en-1. Ordre hydraulique de la fiche : calage, ailes de toit, planchers, montée du toit.',
      ms160: 'Cotes de la fiche SM 160. Ordre de déploiement à confirmer par la direction technique.',
    }[m.id];
    return;
  }
  $('#s3-note', el).textContent = 'Cabinets de 500 × 500 mm. Consommation à confirmer par la direction technique.';
  const s = specs();
  $('#s3-specs', el).innerHTML = [[`${s.w} × ${s.h} m`, 'Mur LED'], [`${String(s.area).replace('.', ',')} m²`, 'Surface'], [`${s.px} × ${s.py}`, 'Résolution (px)'], [`${s.cabinets}`, 'Cabinets']]
    .map(([v, l]) => `<div class="spec"><b style="font-size:17px">${v}</b><span>${l}</span></div>`).join('');
  $('#s3-hud', el).innerHTML = `<span class="tag blue">${FORMATS[conf.format]}</span><span class="tag">LED ${s.w} × ${s.h} m · P${String(conf.pitch).replace('.', ',')}</span><span class="tag">${conf.lyres} lyres</span>`;
}

/* ---------- Monde three.js ---------- */
async function build() {
  T = T || (await import('../vendor/three.js'));
  const host = $('#s3-host', el);
  const renderer = new T.WebGLRenderer({ antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.6));
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  host.prepend(renderer.domElement);
  $('#s3-loading', el)?.remove();

  const scene = new T.Scene();
  scene.background = new T.Color(0x020409);
  scene.fog = new T.FogExp2(0x03060d, 0.022);
  const camera = new T.PerspectiveCamera(42, 16 / 9, 0.1, 200);
  const controls = new T.OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.maxPolarAngle = Math.PI * 0.49;
  controls.minDistance = 6;
  controls.maxDistance = 46;
  controls.autoRotateSpeed = 0.35;

  scene.add(new T.HemisphereLight(0x2a3a5a, 0x05070c, 0.55));
  const key = new T.DirectionalLight(0x8fb6ff, 0.35);
  key.position.set(-8, 14, 12);
  scene.add(key);

  // Sol légèrement réfléchissant
  const floor = new T.Mesh(new T.PlaneGeometry(120, 120), new T.MeshStandardMaterial({ color: 0x0a0e16, roughness: 0.38, metalness: 0.35 }));
  floor.rotation.x = -Math.PI / 2;
  scene.add(floor);
  const grid = new T.GridHelper(120, 120, 0x15203a, 0x0c1324);
  grid.position.y = 0.002;
  grid.material.transparent = true;
  grid.material.opacity = 0.35;
  scene.add(grid);

  // Texture du mur LED (canvas animé)
  const led = document.createElement('canvas');
  led.width = 1024; led.height = 576;
  const lctx = led.getContext('2d');
  const ledTex = new T.CanvasTexture(led);
  ledTex.colorSpace = T.SRGBColorSpace;
  ledTex.wrapS = T.RepeatWrapping;
  ledTex.repeat.x = -1;
  ledTex.offset.x = 1;
  const logo = new Path2D(LOGO_PATH);

  // Texture de particule pour la brume
  const dot = document.createElement('canvas');
  dot.width = dot.height = 64;
  const dctx = dot.getContext('2d');
  const g = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  dctx.fillStyle = g; dctx.fillRect(0, 0, 64, 64);
  const dotTex = new T.CanvasTexture(dot);

  const group = new T.Group();
  scene.add(group);
  let lyres = [];
  let haze = null;
  let wallMesh = null, glow = null;

  const metal = new T.MeshStandardMaterial({ color: 0x8f9bb0, roughness: 0.35, metalness: 0.9, emissive: 0x1a2436, emissiveIntensity: 0.6 });
  const black = new T.MeshStandardMaterial({ color: 0x0b0f17, roughness: 0.8, metalness: 0.1 });

  function clear() {
    group.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material && o.material !== metal && o.material !== black) (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m.dispose()); });
    group.clear();
    lyres = [];
  }

  function addLyre(x, y, z, i) {
    const head = new T.Group();
    head.position.set(x, y, z);
    const yoke = new T.Mesh(new T.BoxGeometry(0.34, 0.12, 0.34), black); yoke.position.y = 0.3; head.add(yoke);
    const body = new T.Mesh(new T.CylinderGeometry(0.16, 0.2, 0.42, 16), black); head.add(body);
    const lens = new T.Mesh(new T.CircleGeometry(0.14, 20), new T.MeshBasicMaterial({ color: THEMES[conf.theme].b, toneMapped: false }));
    lens.userData.tint = 'b';
    lens.rotation.x = Math.PI / 2; lens.position.y = -0.215; head.add(lens);
    group.add(head);
    const light = new T.SpotLight(THEMES[conf.theme].a, 120, 40, 0.22, 0.6, 1.4);
    light.position.copy(head.position);
    light.userData.tint = 'a';
    const target = new T.Object3D();
    group.add(light, target);
    light.target = target;
    const len = 16;
    const cone = new T.Mesh(new T.ConeGeometry(Math.tan(0.2) * len, len, 32, 1, true), new T.MeshBasicMaterial({ color: THEMES[conf.theme].a, transparent: true, opacity: 0.075, blending: T.AdditiveBlending, depthWrite: false, side: T.DoubleSide }));
    cone.geometry.translate(0, -len / 2, 0); // sommet à l'origine
    cone.userData.tint = 'a';
    cone.position.copy(head.position);
    group.add(cone);
    lyres.push({ head, light, target, cone, lens, phase: i * 0.9, side: i % 2 ? 1 : -1 });
  }

  function addHaze(width, height, z1, z2) {
    const N = 700;
    const hp = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { hp[i * 3] = (Math.random() - 0.5) * width; hp[i * 3 + 1] = Math.random() ** 1.6 * height; hp[i * 3 + 2] = z1 + Math.random() * (z2 - z1); }
    const hg = new T.BufferGeometry();
    hg.setAttribute('position', new T.BufferAttribute(hp, 3));
    haze = new T.Points(hg, new T.PointsMaterial({ map: dotTex, size: 1.1, transparent: true, opacity: 0.035, depthWrite: false, blending: T.AdditiveBlending, color: 0x9fbfff }));
    group.add(haze);
  }

  /* ---------- MediaScène : remorque, vérins de calage, ailes de toit et planchers dépliants, colonnes télescopiques ---------- */
  const ms = { p: 1, from: 1, to: 1, t0: 0, dur: 12000, parts: null, pl: 1 };
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const lerp = (a, b, k) => a + (b - a) * k;
  // Six phases ; ordre hydraulique des fiches EMS : calage (4 vérins), ailes de toit (4), planchers (4), toit (2 vérins colonnes)
  const WIN = [[0, 0.13], [0.13, 0.3], [0.3, 0.48], [0.48, 0.68], [0.68, 0.85], [0.85, 1]];
  const ORDER = ['calage', 'ailes', 'planchers', 'toit', 'poteaux', 'son'];
  const PHASE = { calage: 'Calage sur 4 vérins', ailes: 'Ouverture des ailes de toit', planchers: 'Dépliage des planchers', toit: 'Montée du toit sur les colonnes', poteaux: 'Poteaux, garde-corps, escalier', son: 'Bâches, son et lumière' };

  // Pièces fusionnées : un appel de rendu par sous-ensemble, pour tenir sur iPad
  const _m4 = new T.Matrix4(), _q = new T.Quaternion(), _e = new T.Euler(), _one = new T.Vector3(1, 1, 1), _p = new T.Vector3(), _u = new T.Vector3(), _Y = new T.Vector3(0, 1, 0);
  function merge(list) {
    let nv = 0, ni = 0;
    for (const g of list) { nv += g.attributes.position.count; ni += g.index.count; }
    const pos = new Float32Array(nv * 3), nor = new Float32Array(nv * 3), uv = new Float32Array(nv * 2), idx = new Uint32Array(ni);
    let ov = 0, oi = 0;
    for (const g of list) {
      pos.set(g.attributes.position.array, ov * 3);
      nor.set(g.attributes.normal.array, ov * 3);
      uv.set(g.attributes.uv.array, ov * 2);
      const a = g.index.array;
      for (let i = 0; i < a.length; i++) idx[oi + i] = a[i] + ov;
      ov += g.attributes.position.count;
      oi += a.length;
      g.dispose();
    }
    const out = new T.BufferGeometry();
    out.setAttribute('position', new T.BufferAttribute(pos, 3));
    out.setAttribute('normal', new T.BufferAttribute(nor, 3));
    out.setAttribute('uv', new T.BufferAttribute(uv, 2));
    out.setIndex(new T.BufferAttribute(idx, 1));
    return out;
  }
  function kit() {
    const list = [];
    const put = (g, x, y, z, rx, ry, rz) => { g.applyMatrix4(_m4.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _one)); list.push(g); };
    const k = {
      box(w, h, d, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0) { put(new T.BoxGeometry(w, h, d), x, y, z, rx, ry, rz); return k; },
      cyl(r, h, x = 0, y = 0, z = 0, rx = 0, ry = 0, rz = 0, seg = 10) { put(new T.CylinderGeometry(r, r, h, seg), x, y, z, rx, ry, rz); return k; },
      // Barre de section carrée entre deux points
      bar(a, b, t = 0.04) {
        _u.set(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
        const len = _u.length();
        if (len < 1e-4) return k;
        const g = new T.BoxGeometry(t, len, t);
        g.applyMatrix4(_m4.compose(_p.set((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (a[2] + b[2]) / 2), _q.setFromUnitVectors(_Y, _u.normalize()), _one));
        list.push(g);
        return k;
      },
      mesh(material) { return new T.Mesh(merge(list), material); },
    };
    return k;
  }
  // Poutre treillis entre deux points : section carrée ou rectangulaire [a, b], ou triangulée
  function lattice(k, a, b, size, tri = false, chord = 0.05, diag = 0.028) {
    const A = new T.Vector3(...a), u = new T.Vector3(...b).sub(A);
    const len = u.length();
    u.normalize();
    const w1 = new T.Vector3().crossVectors(u, Math.abs(u.y) > 0.9 ? new T.Vector3(1, 0, 0) : _Y).normalize();
    const w2 = new T.Vector3().crossVectors(w1, u).normalize();
    const [s1, s2] = Array.isArray(size) ? size : [size, size];
    const offs = (tri ? [[0, 0.58], [-0.5, -0.29], [0.5, -0.29]] : [[0.5, 0.5], [-0.5, 0.5], [-0.5, -0.5], [0.5, -0.5]])
      .map(([i, j]) => w1.clone().multiplyScalar(i * s1).addScaledVector(w2, j * s2));
    const n = Math.max(1, Math.round(len / (Math.max(s1, s2) * 1.25)));
    const at = (i, o) => A.clone().addScaledVector(u, (len * i) / n).add(o).toArray();
    for (const o of offs) k.bar(at(0, o), at(n, o), chord);
    for (let f = 0; f < offs.length; f++) {
      const o1 = offs[f], o2 = offs[(f + 1) % offs.length];
      for (let i = 0; i < n; i++) k.bar(at(i, i % 2 ? o1 : o2), at(i + 1, i % 2 ? o2 : o1), diag);
    }
    return k;
  }
  // Garde-corps barreaudé (arrêté du 25/07/2022), 1,10 m, posé au niveau du plancher
  function guard(k, a, b, h = 1.1) {
    const dx = b[0] - a[0], dz = b[2] - a[2], len = Math.hypot(dx, dz);
    const at = (t, y) => [a[0] + dx * t, a[1] + y, a[2] + dz * t];
    k.bar(at(0, h), at(1, h), 0.05).bar(at(0, 0.1), at(1, 0.1), 0.04);
    const posts = Math.max(1, Math.round(len / 2));
    for (let i = 0; i <= posts; i++) k.bar(at(i / posts, 0), at(i / posts, h), 0.05);
    const bars = Math.round(len / 0.14);
    for (let i = 1; i < bars; i++) k.bar(at(i / bars, 0.1), at(i / bars, h), 0.022);
    return k;
  }
  // Ligne de diffusion suspendue, courbure en J vers le public
  function lineArray(n, mat) {
    const k = kit();
    k.box(0.84, 0.07, 0.62, 0, -0.035, 0);
    let y = -0.07, z = 0, ang = 0;
    for (let i = 0; i < n; i++) {
      ang += i < n * 0.55 ? 0.01 : 0.055;
      k.box(0.78, 0.26, 0.5, 0, y - 0.13 * Math.cos(ang), z + 0.13 * Math.sin(ang), ang);
      y -= 0.265 * Math.cos(ang);
      z += 0.265 * Math.sin(ang);
    }
    return k.mesh(mat);
  }

  // Habillage de l'aile de toit avant : flanc de la remorque fermée, dessus du toit une fois déployé
  const brandTex = {};
  function brand(aspect) {
    const key = aspect.toFixed(2);
    if (brandTex[key]) return brandTex[key];
    const c = document.createElement('canvas');
    c.width = 2048;
    c.height = Math.round(2048 / aspect);
    const draw = () => {
      const g = c.getContext('2d'), w = c.width, h = c.height;
      g.fillStyle = '#eceff4'; g.fillRect(0, 0, w, h);
      // Marquage de gabarit orange aux angles, comme sur la remorque
      const m = h * 0.07, a = h * 0.2, e = h * 0.035;
      g.fillStyle = '#f08a1c';
      for (const [x, y, sx, sy] of [[m, m, 1, 1], [w - m, m, -1, 1], [m, h - m, 1, -1], [w - m, h - m, -1, -1]]) {
        g.fillRect(sx > 0 ? x : x - a, sy > 0 ? y : y - e, a, e);
        g.fillRect(sx > 0 ? x : x - e, sy > 0 ? y : y - a, e, a);
      }
      g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillStyle = '#0b1830'; g.font = `600 ${Math.round(h * 0.3)}px Jost, sans-serif`; g.letterSpacing = `${Math.round(h * 0.045)}px`;
      g.fillText('MEDIASCÈNE', w / 2, h * 0.44);
      g.fillStyle = '#3192ff'; g.fillRect(w / 2 - h * 0.5, h * 0.64, h, h * 0.014);
      g.fillStyle = '#1670e4'; g.font = `500 ${Math.round(h * 0.07)}px "JB Mono", monospace`; g.letterSpacing = `${Math.round(h * 0.025)}px`;
      g.fillText('SCÈNE MOBILE HYDRAULIQUE · MÉDIACOM', w / 2, h * 0.76);
    };
    draw();
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    document.fonts?.ready?.then(() => { draw(); t.needsUpdate = true; });
    brandTex[key] = t;
    return t;
  }

  function buildMS() {
    const m = msModel(), G = m.geo;
    const W = m.W, D = m.D, half = G.box / 2, rW = G.roofW;
    const D0 = G.base || D, av = D - D0; // plateau porté par la remorque, puis avancée de scène (100 et 120 m²)
    const lift = m.deckH - G.roadDeck; // course des vérins de calage
    const under = G.under === 'sol' ? m.clear : m.deckH + m.clear; // sous-face du toit (points moteurs), depuis le sol
    const rT = G.roofT, fT = G.floorT, n = G.folds, panelT = 0.07;
    const hinge = half - n * (rT + fT + 0.03) - 0.02; // planchers repliés à l'intérieur des ailes de toit
    const floorL = D0 / 2 - hinge;
    const hR = n > 1 ? half - rT - 0.02 : half; // charnière des ailes de toit ; sur la 160 le 2e panneau se replie par-dessus
    const wingB = half + G.roofBack - hR, wingF = half + G.roofFront - hR;
    const roadUnder = Math.max(G.roadH - rT, G.roadDeck + floorL / n + 0.06); // sous-face du toit, remorque fermée
    const workUnder = under - lift; // même cote dans le repère de la remorque calée
    const zc = -2.5;
    const mat = (color, o) => new T.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, ...o });
    const M = {
      alu: mat(0xb9c2ce, { roughness: 0.32, metalness: 0.85 }),
      galva: mat(0x8e98a4, { roughness: 0.45, metalness: 0.7 }),
      steel: mat(0x262b34, { roughness: 0.42, metalness: 0.6 }),
      tarp: mat(0x0d1016, { roughness: 0.95, metalness: 0 }),
      deck: mat(G.deck, { roughness: 0.85, metalness: 0.05 }),
      skin: mat(G.top, { roughness: 0.45, metalness: 0.1 }),
      under: mat(0x101318, { roughness: 0.8, metalness: 0.2 }),
      edge: mat(0x59626e, { roughness: 0.5, metalness: 0.5 }),
      tyre: mat(0x0f1012, { roughness: 0.92, metalness: 0 }),
      red: mat(0xd31f2a, { emissive: 0x8a0a10, emissiveIntensity: 0.7 }),
      chrome: mat(0xe2e8ef, { roughness: 0.15, metalness: 1 }),
      spk: mat(0x23272e, { roughness: 0.5, metalness: 0.35 }),
      floorSkin: mat(G.floorSkin, { roughness: 0.5, metalness: 0.1 }),
    };
    const frame = G.frame === 'alu' ? M.galva : M.steel; // châssis alu (60) ou acier noir RAL 9005 (semi-remorques)
    const struct = G.struct === 'alu' ? M.alu : M.steel;
    // Lumière de fin de journée : la structure se lit même repliée
    const sky = new T.HemisphereLight(0x8aa4cf, 0x1a1f2a, 1.3); group.add(sky);
    const sun = new T.DirectionalLight(0xffe2c0, 1.15); sun.position.set(-14, 18, 16); group.add(sun);
    const wash = new T.SpotLight(0xcfe3ff, 0, 60, 0.55, 0.7, 1.2); wash.position.set(0, under + 1.5, zc + 18); group.add(wash);
    wash.target.position.set(0, m.deckH + 1, zc); group.add(wash.target);
    const add = (parent, o, x = 0, y = 0, z = 0) => { o.position.set(x, y, z); parent.add(o); return o; };
    const hide = (o) => { o.visible = false; return o; };
    const root = add(group, new T.Group(), 0, 0, zc);
    const rig = add(root, new T.Group()); // tout ce que soulèvent les vérins de calage
    const P = { rig };

    // ----- Remorque : châssis, essieux, timon (60) ou pivot d'attelage (semi-remorques)
    const cTop = G.roadDeck - fT, cH = G.frame === 'alu' ? 0.16 : 0.34, cBot = cTop - cH;
    const Lc = W + 0.2, wR = G.wheelR, wz = half - 0.34;
    const ch = kit();
    for (const z of [-0.55, 0.55]) ch.box(Lc, cH, 0.12, 0, cTop - cH / 2, z); // longerons
    for (const z of [-half + 0.05, half - 0.05]) ch.box(Lc, 0.1, 0.08, 0, cTop - 0.05, z); // rives
    for (let x = -Lc / 2 + 0.2; x <= Lc / 2; x += 1.25) ch.box(0.08, 0.1, G.box - 0.1, x, cTop - 0.06, 0); // traverses
    const ax0 = Math.min(...G.axles), ax1 = Math.max(...G.axles);
    if (G.trailer === 'timon') {
      // Timon ALCO à hauteur variable, tête d'attelage, roue jockey
      const xe = Lc / 2, xt = xe + G.tow, y = cTop - cH / 2;
      ch.bar([xe, y, -0.66], [xt - 0.4, y - 0.05, 0], 0.09).bar([xe, y, 0.66], [xt - 0.4, y - 0.05, 0], 0.09);
      ch.box(0.55, 0.12, 0.14, xt - 0.2, y - 0.06, 0);
      ch.cyl(0.04, y - 0.14, xt - 0.8, (y - 0.14) / 2 + 0.14, 0.12);
      ch.cyl(0.1, 0.08, xt - 0.8, 0.1, 0.12, Math.PI / 2);
    } else {
      // Plaque et pivot d'attelage à l'avant, barre anti-encastrement à l'arrière
      ch.box(1.2, 0.1, G.box - 0.3, Lc / 2 - 0.75, cBot - 0.05, 0);
      ch.cyl(0.05, 0.14, Lc / 2 - 0.9, cBot - 0.17, 0);
      ch.box(0.12, 0.16, G.box - 0.2, -Lc / 2 - 0.1, 0.55, 0);
      for (const z of [-0.9, 0.9]) ch.bar([-Lc / 2 + 0.2, cBot, z], [-Lc / 2 - 0.1, 0.62, z], 0.08);
    }
    rig.add(ch.mesh(frame));
    const lamps = kit();
    for (const z of [-half + 0.3, half - 0.3]) lamps.box(0.06, 0.14, 0.32, -Lc / 2 - 0.04, cTop - 0.12, z);
    rig.add(lamps.mesh(M.red));
    // Roues : restent au sol quand les vérins soulèvent le châssis (câbles de maintien des essieux)
    const wk = kit(), rk = kit();
    for (const x of G.axles) {
      wk.cyl(0.06, 2 * wz, x, wR, 0, Math.PI / 2, 0, 0, 8);
      for (const z of [-wz, wz]) { wk.cyl(wR, G.tyreW, x, wR, z, Math.PI / 2, 0, 0, 22); rk.cyl(wR * 0.6, G.tyreW + 0.02, x, wR, z, Math.PI / 2, 0, 0, 16); }
    }
    for (const z of [-wz, wz]) rk.box(ax1 - ax0 + 2 * wR + 0.3, 0.04, G.tyreW + 0.16, (ax0 + ax1) / 2, 2 * wR + 0.06, z); // garde-boue
    root.add(wk.mesh(M.tyre), rk.mesh(M.galva));
    // Vérins de calage aux 4 coins (+ béquilles avant des semi-remorques) : corps fixe, tige jusqu'au sol
    const jx = W / 2 - 0.4, jz = half - 0.2;
    const jacks = [[-jx, -jz], [-jx, jz], [jx, -jz], [jx, jz]];
    if (G.trailer !== 'timon') jacks.push([W / 2 - 2, -0.75], [W / 2 - 2, 0.75]);
    const jb = kit(), jr = kit(), jp = kit();
    for (const [x, z] of jacks) { jb.cyl(0.085, 0.42, x, cBot - 0.1, z); jr.cyl(0.05, 1, x, -0.5, z, 0, 0, 0, 8); jp.box(0.34, 0.04, 0.34, x, 0.02, z); }
    rig.add(jb.mesh(M.steel));
    P.rodTop = cBot - 0.3;
    P.rods = add(rig, jr.mesh(M.chrome), 0, P.rodTop, 0);
    P.pads = add(rig, jp.mesh(M.galva));

    // ----- Plancher central et planchers dépliants, pieds réglables sous le bord extérieur
    const deckMats = (bottom) => [M.edge, M.edge, M.deck, bottom, M.edge, M.edge];
    add(rig, new T.Mesh(new T.BoxGeometry(W, fT, 2 * hinge), deckMats(M.under)), 0, G.roadDeck - fT / 2, 0);
    const floorWing = (side) => {
      const l = floorL / n, secs = [];
      let host = rig;
      for (let i = 0; i < n; i++) {
        const piv = add(host, new T.Group(), 0, i ? 0 : G.roadDeck, side * (i ? l : hinge));
        add(piv, new T.Mesh(new T.BoxGeometry(W, fT, l), deckMats(M.floorSkin)), 0, -fT / 2, (side * l) / 2);
        const lg = kit(), cnt = Math.max(3, Math.round(W / 2.3));
        for (let j = 0; j <= cnt; j++) {
          const x = -W / 2 + 0.25 + (j * (W - 0.5)) / cnt;
          lg.cyl(0.035, 1, x, -0.5, 0, 0, 0, 0, 8).box(0.2, 0.025, 0.2, x, -0.99, 0);
        }
        secs.push({ piv, side, legs: hide(add(piv, lg.mesh(M.galva), 0, -fT, side * (l - 0.14))) });
        host = piv;
      }
      return secs;
    };
    P.floors = [floorWing(1), floorWing(-1)];

    // ----- Toit : module central, ailes articulées (panneaux fibre, sous-face noire), poutres de rive
    const roof = add(rig, new T.Group(), 0, roadUnder, 0);
    P.roof = roof;
    const roofMats = (top) => [M.edge, M.edge, top, M.under, M.edge, M.edge];
    add(roof, new T.Mesh(new T.BoxGeometry(rW, panelT, 2 * hR), roofMats(M.skin)), 0, rT - panelT / 2, 0);
    const rc = kit();
    for (const z of [-hR + 0.2, hR - 0.2]) lattice(rc, [-rW / 2, (rT - panelT) / 2, z], [rW / 2, (rT - panelT) / 2, z], [0.16, rT - panelT], false, 0.05, 0.026);
    roof.add(rc.mesh(struct));
    const roofWing = (side) => {
      const l = (side > 0 ? wingF : wingB) / n, secs = [];
      let host = roof;
      for (let i = 0; i < n; i++) {
        const piv = add(host, new T.Group(), 0, i ? 0 : rT, side * (i ? l : hR));
        const top = G.brand && side > 0 && !i ? new T.MeshStandardMaterial({ map: brand(rW / l), roughness: 0.45, metalness: 0.1 }) : M.skin;
        add(piv, new T.Mesh(new T.BoxGeometry(rW, panelT, l), roofMats(top)), 0, -panelT / 2, (side * l) / 2);
        // Ossature : longerons dans la largeur, traverses dans la profondeur
        const k = kit(), beams = Math.max(1, Math.round(l / 1.4));
        for (let j = 1; j < beams; j++) k.box(rW, rT - panelT, 0.07, 0, -(rT + panelT) / 2, (side * j * l) / beams);
        for (let x = -rW / 2 + 0.1; x <= rW / 2; x += 1.55) k.box(0.06, (rT - panelT) * 0.7, l - 0.1, x, -panelT - (rT - panelT) * 0.35, (side * l) / 2);
        piv.add(k.mesh(struct));
        if (i === n - 1) { // poutre de rive (face et lointain)
          const e = kit(), zz = side * (l - G.edge * 0.4);
          lattice(e, [-rW / 2, -G.edge / 2, zz], [rW / 2, -G.edge / 2, zz], G.edgeTri ? G.edge : [G.edge * 0.8, G.edge], G.edgeTri, 0.05, 0.028);
          piv.add(e.mesh(G.edgeMat === 'alu' ? M.alu : M.steel));
        }
        secs.push({ piv, side });
        host = piv;
      }
      return secs;
    };
    P.wings = [roofWing(1), roofWing(-1)];
    const front = P.wings[0][n - 1].piv, lF = wingF / n; // dernier panneau de l'aile de face

    // ----- Colonnes télescopiques en bout de remorque (2 vérins colonnes), 3 éléments emboîtés
    const colX = W / 2 + G.colT / 2 + 0.03, H0 = roadUnder - cBot;
    P.cols = [0, 1, 2].map((i) => {
      const k = kit(), shrink = i * 0.07;
      for (const s of [-1, 1]) lattice(k, [s * colX, cBot + 0.04 + i * 0.03, 0], [s * colX, roadUnder - 0.02 - i * 0.03, 0], [G.colW - 2 * shrink, G.colT - shrink], false, 0.07 - i * 0.01, 0.04);
      return add(rig, k.mesh(struct));
    });
    const cyl = kit(), rod = kit();
    for (const s of [-1, 1]) { cyl.cyl(0.11, H0 - 0.4, s * colX, cBot + H0 / 2, 0, 0, 0, 0, 12); rod.cyl(0.07, 1, s * colX, 0.5, 0, 0, 0, 0, 12); }
    rig.add(cyl.mesh(M.steel));
    P.rodY = roadUnder - 0.2;
    P.colRod = add(rig, rod.mesh(M.galva), 0, P.rodY, 0);

    // ----- Bâches de route aux extrémités du coffre, roulées à l'ouverture
    const endX = W / 2 + G.colT + 0.07, endK = kit();
    for (const s of [-1, 1]) endK.box(0.03, 1, G.box - 0.04, s * endX, -0.5, 0);
    P.ends = add(roof, endK.mesh(M.tarp));
    P.endLen = roadUnder - G.roadDeck + 0.1;

    // ----- Poteaux de coin : tubes alu inclinés (60), H30V noirs (3-en-1), tours 500 tri (160)
    P.posts = [];
    const pIn = G.post === 'tube' ? 0.06 : G.postIn, zPost = D0 / 2 - pIn;
    for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
      const bot = new T.Vector3(sx * (W / 2 - pIn), m.deckH, sz * zPost);
      const top = G.post === 'tube' ? new T.Vector3(sx * (rW / 2 - 0.1), under, sz > 0 ? hR + wingF - 0.12 : -(hR + wingB - 0.12)) : new T.Vector3(bot.x, under, bot.z);
      const len = top.distanceTo(bot), k = kit();
      if (G.post === 'tube') k.cyl(0.055, len, 0, -len / 2, 0, 0, 0, 0, 10);
      else lattice(k, [0, 0, 0], [0, -len, 0], G.postSize, G.post === 'tri', 0.06, 0.035);
      const mesh = hide(add(root, k.mesh(G.post === 'h30' ? M.steel : M.alu), top.x, top.y, top.z));
      mesh.quaternion.setFromUnitVectors(new T.Vector3(0, -1, 0), bot.sub(top).normalize());
      P.posts.push(mesh);
    }

    // ----- Garde-corps noirs sur 3 côtés, escalier alu à jardin
    const zBack = -D0 / 2 + 0.04, zFront = D0 / 2 + av - 0.04, gx = W / 2 - 0.04, stZ = zBack + 1.25, sw = 0.9;
    const gl = guard(kit(), [-gx, 0, zBack], [-gx, 0, stZ - sw / 2 - 0.1]);
    guard(gl, [-gx, 0, stZ + sw / 2 + 0.1], [-gx, 0, zFront]);
    P.rails = [guard(kit(), [-gx, 0, zBack], [gx, 0, zBack]), guard(kit(), [gx, 0, zBack], [gx, 0, zFront]), gl].map((k) => hide(add(root, k.mesh(M.steel), 0, m.deckH, 0)));
    const h = m.deckH, nSt = Math.max(4, Math.round(h / 0.19)), run = 0.27, runL = nSt * run, st = kit();
    for (const z of [-sw / 2, sw / 2]) {
      st.bar([0, -0.06, z], [-runL, -h, z], 0.07).bar([0.05, 0.95, z], [-runL, -h + 0.95, z], 0.045);
      st.bar([-runL, -h, z], [-runL, -h + 0.95, z], 0.045).bar([0.05, 0, z], [0.05, 0.95, z], 0.045);
    }
    for (let i = 1; i < nSt; i++) st.box(run - 0.03, 0.04, sw, -(i - 0.5) * run, -(i * h) / nSt, 0);
    P.stairs = hide(add(root, st.mesh(M.alu), -W / 2, h, stZ));

    // ----- Avancée de scène du 3-en-1 (100 et 120 m²) : fermes alu, pieds vérins réglables, plancher CTBX
    if (av > 0) {
      const ag = new T.Group(), ak = kit();
      add(ag, new T.Mesh(new T.BoxGeometry(W, 0.1, av), deckMats(M.under)), 0, -0.05, av / 2);
      for (const z of [0.25, av - 0.25]) lattice(ak, [-W / 2 + 0.1, -0.36, z], [W / 2 - 0.1, -0.36, z], [0.25, 0.5], false, 0.045, 0.025);
      const legs = Math.round(W / 2.4);
      for (let j = 0; j <= legs; j++) for (const z of [0.25, av - 0.25]) ak.cyl(0.04, h - 0.1, -W / 2 + 0.2 + (j * (W - 0.4)) / legs, -0.1 - (h - 0.1) / 2, z, 0, 0, 0, 8);
      ag.add(ak.mesh(M.alu));
      P.avancee = hide(add(root, ag, 0, h, D0 / 2));
    }
    // Jupe de scène noire sur la face
    const sk = kit();
    sk.box(W, 1, 0.03, 0, -0.5, 0);
    P.skirt = hide(add(root, sk.mesh(M.tarp), 0, h - 0.02, D0 / 2 + av + 0.03));

    // ----- Casquette du 3-en-1 : prolonge le toit au-dessus de l'avancée (courte en 80/100, rallonge en 120)
    let soundHost = front, soundZ = lF - G.edge * 0.4;
    if (G.fascia) { // lambrequin noir de face (160), déroulé une fois le toit en place
      const fk = kit();
      fk.box(rW + 0.1, G.fascia, 0.04, 0, -G.fascia / 2 + 0.02, lF + 0.03);
      P.fascia = hide(add(front, fk.mesh(M.tarp)));
    }
    if (G.cap) {
      const Lcap = G.cap[m.size], cg = new T.Group(), ck = kit(), val = kit();
      add(cg, new T.Mesh(new T.BoxGeometry(rW, 0.05, Lcap), roofMats(M.tarp)), 0, -0.025, Lcap / 2);
      for (const x of [-rW / 2 + 0.1, rW / 2 - 0.1]) ck.box(0.1, 0.2, Lcap, x, -0.15, Lcap / 2);
      lattice(ck, [-rW / 2, -0.22, Lcap - 0.15], [rW / 2, -0.22, Lcap - 0.15], 0.3, true, 0.045, 0.025);
      cg.add(ck.mesh(M.alu));
      val.box(rW, 0.6, 0.03, 0, -0.3, Lcap + 0.02); // lambrequin noir
      cg.add(val.mesh(M.tarp));
      P.cap = hide(add(front, cg, 0, -0.08, lF));
      P.capZ = lF;
      P.capL = Lcap;
      soundHost = cg;
      soundZ = Lcap - 0.2;
    }
    // ----- Ailes de son et line arrays : 400 kg par côté (60), 1,2 t par aile (3-en-1), 1,5 t en déport de face (160)
    P.sound = [];
    for (const s of [-1, 1]) {
      const wg = new T.Group(), wk2 = kit();
      if (G.son === 'tri') { lattice(wk2, [0, -0.16, 0], [s * G.wingSon, -0.16, 0], 0.3, true, 0.045, 0.026); wk2.bar([0, -0.6, -0.12], [s * G.wingSon * 0.75, -0.24, -0.12], 0.05); }
      else lattice(wk2, [0, -0.22, 0], [s * G.wingSon, -0.22, 0], 0.4, false, 0.055, 0.03);
      wg.add(wk2.mesh(G.son === 'tri' ? M.alu : M.steel));
      const ax = s * (G.wingSon - 0.4);
      const chain = add(wg, new T.Mesh(new T.BoxGeometry(0.03, 1, 0.03).translate(0, -0.5, 0), M.steel), ax, -0.35, 0);
      const arr = add(wg, lineArray(G.arrays, M.spk), ax, -0.45, 0);
      P.sound.push({ wg: hide(add(soundHost, wg, s * (rW / 2), 0, soundZ)), arr, chain });
    }

    // ----- Ponts lumière sur palans (descendent au trim), lyres sur le pont de face
    P.trusses = [];
    const tl = W - 1.2;
    for (const zr of G.ponts) {
      const z = zr > 0 ? hR + wingF - zr : -(hR + wingB) - zr;
      const tk = kit(), chains = kit();
      lattice(tk, [-tl / 2, -G.pont / 2, 0], [tl / 2, -G.pont / 2, 0], G.pont, true, 0.045, 0.025);
      for (const x of [-tl / 3, tl / 3]) chains.box(0.03, 1, 0.03, x, -0.5, z);
      P.trusses.push({ tg: hide(add(roof, tk.mesh(M.alu), 0, -0.1, z)), ch: hide(add(roof, chains.mesh(M.steel))), z });
    }
    const yLyre = under - G.drop - G.pont - 0.38;
    for (let i = 0; i < conf.lyres; i++) addLyre(-tl / 2 + 0.6 + (i * (tl - 1.2)) / Math.max(1, conf.lyres - 1), yLyre, zc + P.trusses[0].z, i);

    // ----- Fond de scène et bâches latérales, déroulés en fin de montage
    const bd = kit(), sd = kit(), sZ0 = -D0 / 2 - 0.12, sZ1 = zPost;
    bd.box(W + 2 * G.colT + 0.1, 1, 0.03, 0, -0.5, 0);
    for (const s of [-1, 1]) sd.box(0.03, 1, sZ1 - sZ0, s * endX, -0.5, (sZ0 + sZ1) / 2);
    P.tarps = [hide(add(root, bd.mesh(M.tarp), 0, under, sZ0)), hide(add(root, sd.mesh(M.tarp), 0, under, 0))];

    // Public debout, en silhouettes de nuit comme sur les photos de concert
    const zStage = zc + D0 / 2 + av;
    const audience = new T.MeshBasicMaterial({ color: 0x03050a });
    const pos = [];
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < 130; i++) pos.push([(rnd() - 0.5) * (W + 4), 0.85, zStage + 3 + rnd() ** 0.8 * 5]);
    const im = new T.InstancedMesh(new T.CapsuleGeometry(0.2, 1.1, 4, 8), audience, pos.length);
    const dummy = new T.Object3D();
    pos.forEach((p, i) => { dummy.position.set(...p); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    group.add(im);
    addHaze(W + 2, under, zc - 3, zc + 8);

    const halfX = Math.max(Lc / 2 + (G.trailer === 'timon' ? G.tow : 0), rW / 2 + G.wingSon + 0.5);
    ms.parts = { P, m, G, D0, lift, rT, fT, roadUnder, workUnder, legLen: h - fT, tarpH: under - h, wash,
      box: { halfX, top: under + rT, zF: zStage + (G.cap ? G.cap[m.size] : 0), zB: zc - D0 / 2 - 0.8, deckH: h } };
    world.trussH = under;
    world.stageH = h;
    pose(ms.p);
  }

  // Pose de la scène pour une progression p entre 0 (repliée, prête à rouler) et 1 (déployée)
  function pose(p) {
    if (!ms.parts) return;
    const { P, m, G, D0, lift, rT, fT, roadUnder, workUnder, legLen, tarpH, wash } = ms.parts;
    const order = G.order || ORDER, sp = {};
    order.forEach((k, i) => { sp[k] = ease(clamp01((p - WIN[i][0]) / (WIN[i][1] - WIN[i][0]))); });
    const { calage: s1, ailes: s2, planchers: s3, toit: s4, poteaux: s5, son: s6 } = sp;
    // 1. Calage : les tiges descendent au sol, puis soulèvent le châssis
    const reach = clamp01(s1 / 0.5), up = clamp01((s1 - 0.45) / 0.55);
    P.rig.position.y = lift * up;
    const L = lerp(0.02, P.rodTop + P.rig.position.y, reach);
    P.rods.scale.y = L;
    P.pads.position.y = P.rodTop - L;
    // 2. Ailes de toit : de pendantes à entrouvertes (20° sous l'horizontale, photo « ouverture hydraulique »), à plat pendant la montée du toit
    const wingA = lerp(Math.PI / 2, 0.35, s2) * (1 - s4);
    for (const secs of P.wings) secs.forEach(({ piv, side }, i) => {
      if (!i) { piv.rotation.x = side * wingA; return; }
      const u = clamp01((s2 - 0.35) / 0.65); // 2e panneau (160) : replié par-dessus, se déploie vers l'extérieur
      piv.rotation.x = -side * Math.PI * (1 - u);
      piv.position.y = 0.02 * (1 - u);
    });
    P.ends.visible = s2 < 1;
    P.ends.scale.y = Math.max(0.01, P.endLen * (1 - s2));
    // 3. Planchers : relevés puis à plat, pieds réglables au sol
    const fa = clamp01(s3 / 0.78), lg = clamp01((s3 - 0.75) / 0.25);
    const two = P.floors[0].length > 1; // 160 : 2e panneau déplié en l'air, puis rabattu avec le 1er
    for (const secs of P.floors) secs.forEach(({ piv, side, legs }, i) => {
      if (!i) piv.rotation.x = -side * (Math.PI / 2) * (1 - (two ? clamp01((fa - 0.4) / 0.6) : fa));
      else {
        const u = clamp01(fa / 0.4);
        piv.rotation.x = side * Math.PI * (1 - u);
        piv.position.y = -(2 * fT + 0.03) * (1 - u);
      }
      legs.visible = lg > 0;
      legs.scale.y = Math.max(0.01, legLen * lg);
    });
    // 4. Montée du toit : 2 vérins colonnes, éléments télescopiques
    const ry = lerp(roadUnder, workUnder, s4), dy = ry - roadUnder;
    P.roof.position.y = ry;
    P.cols[1].position.y = dy / 2;
    P.cols[2].position.y = dy;
    P.colRod.scale.y = Math.max(0.01, ry - P.rodY);
    // 5. Poteaux de coin, garde-corps, escalier, avancée, casquette, jupe
    const po = clamp01(s5 / 0.55), ra = clamp01((s5 - 0.25) / 0.5), sta = clamp01((s5 - 0.5) / 0.5), sk = clamp01((s5 - 0.4) / 0.6);
    P.posts.forEach((o) => { o.visible = po > 0; o.scale.y = Math.max(0.01, po); });
    P.rails.forEach((o) => { o.visible = ra > 0; o.scale.y = Math.max(0.01, ra); });
    P.stairs.visible = sta > 0;
    P.stairs.scale.setScalar(Math.max(0.01, sta));
    if (P.avancee) {
      const a = clamp01(s5 / 0.6), b = clamp01((s5 - 0.55) / 0.3), av = m.D - D0;
      P.avancee.visible = a > 0;
      P.avancee.position.set(0, m.deckH - 0.3 * (1 - b), D0 / 2 - av * (1 - a));
    }
    if (P.cap) {
      const c = clamp01(s5 / 0.7);
      P.cap.visible = c > 0;
      P.cap.position.z = P.capZ - P.capL * (1 - c);
    }
    P.skirt.visible = sk > 0;
    P.skirt.scale.y = Math.max(0.01, (m.deckH - 0.02) * sk);
    if (P.fascia) { P.fascia.visible = sk > 0; P.fascia.scale.y = Math.max(0.01, sk); }
    // 6. Bâches, son et lumière
    const tarp = clamp01(s6 / 0.5), snd = clamp01((s6 - 0.05) / 0.55), tr = clamp01(s6 / 0.45), ws = clamp01((s5 - 0.6) / 0.4);
    const pl = clamp01((s6 - 0.4) / 0.6);
    P.tarps.forEach((o) => { o.visible = tarp > 0; o.scale.y = Math.max(0.01, tarpH * tarp); });
    P.sound.forEach(({ wg, arr, chain }) => {
      wg.visible = ws > 0;
      wg.scale.x = Math.max(0.01, ws);
      arr.visible = snd > 0;
      arr.position.y = -0.45 - 0.6 * snd;
      chain.scale.y = 0.1 + 0.6 * snd;
    });
    P.trusses.forEach(({ tg, ch }) => {
      const d = lerp(0.1, G.drop, tr);
      tg.visible = ch.visible = s6 > 0;
      tg.position.y = -d;
      ch.scale.y = Math.max(0.01, d);
    });
    ms.pl = pl;
    wash.intensity = 260 * pl;
    for (const l of lyres) {
      l.light.intensity = 120 * pl;
      l.cone.material.opacity = 0.075 * pl;
      l.head.visible = tr >= 1;
    }
    if (haze) haze.material.opacity = 0.035 * pl;
    const bar = $('#s3-deploy-bar', el);
    if (bar) bar.style.transform = `scaleX(${p.toFixed(3)})`;
    const step = WIN.findIndex(([a, b]) => p >= a && p < b);
    const st = $('#s3-deploy-step', el);
    if (st) st.textContent = p >= 1 ? 'Déployée' : p <= 0 ? 'Repliée, prête à rouler' : PHASE[order[step]] || '';
  }

  function deploy(from, to) {
    ms.from = from; ms.to = to; ms.t0 = performance.now();
    ms.p = from;
    if (reduced()) { ms.p = to; pose(to); }
  }

  function rebuild() {
    clear();
    ms.parts = null;
    const msMode = conf.format === 'mediascene';
    scene.fog.density = msMode ? 0.011 : 0.022;
    scene.background.setHex(msMode ? 0x060c19 : 0x020409);
    scene.fog.color.setHex(msMode ? 0x060c19 : 0x03060d);
    if (conf.format === 'mediascene') { buildMS(); toggles(); recolor(); return; }
    const s = specs();
    const stageH = conf.format === 'concert' ? 1.4 : 0.8;
    const stageW = s.w + 6, stageD = 7;
    const zWall = -2.6;

    // Plateau
    const stage = new T.Mesh(new T.BoxGeometry(stageW, stageH, stageD), black);
    stage.position.set(0, stageH / 2, -1.5);
    group.add(stage);
    const nez = new T.Mesh(new T.BoxGeometry(stageW, 0.04, 0.04), new T.MeshBasicMaterial({ color: THEMES[conf.theme].a }));
    nez.position.set(0, stageH - 0.02, -1.5 + stageD / 2 + 0.01);
    nez.userData.tint = 'a';
    group.add(nez);

    // Mur LED incurvé
    const R = s.w * 1.6;
    const theta = s.w / R;
    const geo = new T.CylinderGeometry(R, R, s.h, 64, 1, true, Math.PI - theta / 2, theta);
    wallMesh = new T.Mesh(geo, new T.MeshBasicMaterial({ map: ledTex, side: T.BackSide, toneMapped: false }));
    wallMesh.position.set(0, stageH + 0.3 + s.h / 2, zWall + R);
    group.add(wallMesh);
    // Halo du mur sur le plateau
    glow = new T.Mesh(new T.PlaneGeometry(s.w * 2.2, s.h * 2.2), new T.MeshBasicMaterial({ map: dotTex, color: THEMES[conf.theme].a, transparent: true, opacity: 0.22, blending: T.AdditiveBlending, depthWrite: false }));
    glow.position.set(0, stageH + 0.3 + s.h / 2, zWall + 0.3);
    glow.userData.tint = 'a';
    group.add(glow);
    // Structure arrière du mur
    const back = new T.Mesh(new T.BoxGeometry(s.w + 0.2, s.h + 0.2, 0.12), black);
    back.position.set(0, stageH + 0.3 + s.h / 2, zWall - 0.25);
    group.add(back);

    // Truss : deux tours et une poutre de face
    const trussH = stageH + s.h + 2.2;
    const tw = stageW - 0.8;
    const beam = (w, h, d, x, y, z) => { const m = new T.Mesh(new T.BoxGeometry(w, h, d), metal); m.position.set(x, y, z); group.add(m); };
    const zTruss = 0.8;
    for (const x of [-tw / 2, tw / 2]) { beam(0.3, trussH, 0.3, x, trussH / 2, zTruss); beam(0.3, trussH, 0.3, x, trussH / 2, zWall - 0.6); }
    beam(tw + 0.3, 0.3, 0.3, 0, trussH, zTruss);
    beam(tw + 0.3, 0.3, 0.3, 0, trussH, zWall - 0.6);
    beam(0.3, 0.3, zTruss - zWall + 0.9, -tw / 2, trussH, (zTruss + zWall - 0.6) / 2);
    beam(0.3, 0.3, zTruss - zWall + 0.9, tw / 2, trussH, (zTruss + zWall - 0.6) / 2);

    // Lyres + faisceaux
    for (let i = 0; i < conf.lyres; i++) addLyre(-tw / 2 + 0.8 + (i * (tw - 1.6)) / Math.max(1, conf.lyres - 1), trussH - 0.45, zTruss, i);

    // Salle
    const audience = new T.MeshStandardMaterial({ color: 0x0d121d, roughness: 0.9, metalness: 0.1 });
    const dummy = new T.Object3D();
    const addInstances = (geo, mat, positions, rot = 0) => {
      const im = new T.InstancedMesh(geo, mat, positions.length);
      positions.forEach((p, i) => { dummy.position.set(p[0], p[1], p[2]); dummy.rotation.set(0, p[3] ?? rot, 0); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
      group.add(im);
    };
    const z0 = 4.5;
    if (conf.format === 'pleniere') {
      const seats = [], backs = [];
      for (let r = 0; r < 12; r++) for (let c = -9; c <= 9; c++) {
        if (c === 0) continue;
        const x = c * 0.62 + (c > 0 ? 0.6 : -0.6), z = z0 + r * 1.05;
        seats.push([x, 0.45, z]); backs.push([x, 0.72, z + 0.22]);
      }
      addInstances(new T.BoxGeometry(0.46, 0.08, 0.44), audience, seats);
      addInstances(new T.BoxGeometry(0.46, 0.5, 0.06), audience, backs);
      // Pupitre
      const pup = new T.Mesh(new T.BoxGeometry(0.7, 1.1, 0.5), black);
      pup.position.set(s.w / 2 + 1.2, stageH + 0.55, 0.8);
      group.add(pup);
    } else if (conf.format === 'gala') {
      const tables = [], chairs = [];
      for (let r = 0; r < 4; r++) for (let c = -3; c <= 3; c++) {
        const x = c * 3.2 + (r % 2 ? 1.6 : 0), z = z0 + 1 + r * 3.2;
        if (Math.abs(x) > 11) continue;
        tables.push([x, 0.38, z]);
        for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; chairs.push([x + Math.cos(a) * 1.15, 0.45, z + Math.sin(a) * 1.15, -a]); }
      }
      addInstances(new T.CylinderGeometry(0.9, 0.9, 0.76, 28), new T.MeshStandardMaterial({ color: 0xd9dfea, roughness: 0.7 }), tables);
      addInstances(new T.BoxGeometry(0.42, 0.9, 0.42), audience, chairs);
    } else {
      const pos = [];
      let seed = 7;
      const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
      for (let i = 0; i < 360; i++) pos.push([(rnd() - 0.5) * (stageW + 4), 0.85, z0 - 1 + rnd() ** 0.8 * 14]);
      addInstances(new T.CapsuleGeometry(0.2, 1.1, 4, 8), audience, pos);
      // Régie façade
      const fod = new T.Mesh(new T.BoxGeometry(3, 1.1, 1.6), black);
      fod.position.set(0, 0.55, z0 + 16);
      group.add(fod);
    }

    // Silhouette d'échelle (1,80 m) au bord du plateau
    const human = new T.Mesh(new T.CapsuleGeometry(0.22, 1.36, 4, 10), new T.MeshStandardMaterial({ color: 0x1b2436, roughness: 0.7 }));
    human.position.set(-s.w / 2 + 0.6, stageH + 0.9, 1.2);
    group.add(human);

    // Brume
    addHaze(stageW + 2, trussH - 0.5, -2, 8);
    toggles();
    recolor();
    world.trussH = trussH;
    world.stageH = stageH;
  }

  function recolor() {
    const th = THEMES[conf.theme];
    group.traverse((o) => {
      if (!o.userData.tint) return;
      const c = o.userData.tint === 'a' ? th.a : th.b;
      if (o.isLight) o.color.setHex(c); else o.material.color.setHex(c);
    });
  }

  function toggles() {
    if (haze) haze.visible = conf.haze;
    lyres.forEach((l) => { l.cone.visible = conf.haze; });
    if (haze && ms.parts) haze.material.opacity = 0.035 * (ms.pl ?? 1);
    controls.autoRotate = conf.auto && !reduced();
  }

  // Contenu du mur : dégradé vivant, logo, baseline
  function drawLED(t) {
    const W = led.width, H = led.height, th = THEMES[conf.theme];
    const hex = (n) => '#' + n.toString(16).padStart(6, '0');
    const base = lctx.createLinearGradient(0, 0, 0, H);
    base.addColorStop(0, '#040a18'); base.addColorStop(1, hex(th.a) + '55');
    lctx.fillStyle = '#03060f';
    lctx.fillRect(0, 0, W, H);
    lctx.fillStyle = base;
    lctx.fillRect(0, 0, W, H);
    for (let k = 0; k < 6; k++) { // bandes lumineuses qui balaient l'écran
      const x = ((t * 60 + k * 190) % (W + 300)) - 150;
      const band = lctx.createLinearGradient(x - 90, 0, x + 90, 0);
      band.addColorStop(0, '#00000000'); band.addColorStop(0.5, hex(th.b) + '22'); band.addColorStop(1, '#00000000');
      lctx.fillStyle = band; lctx.fillRect(x - 90, 0, 180, H);
    }
    for (let i = 0; i < 3; i++) {
      const x = W * (0.5 + 0.45 * Math.sin(t * 0.25 + i * 2.1));
      const gr = lctx.createRadialGradient(x, H * (0.6 + 0.2 * Math.cos(t * 0.3 + i)), 0, x, H * 0.6, W * 0.45);
      gr.addColorStop(0, hex(i === 1 ? th.b : th.a) + '66'); gr.addColorStop(1, '#00000000');
      lctx.fillStyle = gr; lctx.fillRect(0, 0, W, H);
    }
    lctx.save();
    lctx.translate(W / 2 - 64, H / 2 - 120);
    lctx.scale(0.5, 0.5);
    lctx.fillStyle = '#ffffff';
    lctx.shadowColor = hex(th.a); lctx.shadowBlur = 40;
    lctx.fill(logo);
    lctx.restore();
    lctx.fillStyle = '#ffffff';
    lctx.font = '600 44px Jost, sans-serif';
    lctx.textAlign = 'center';
    lctx.letterSpacing = '12px';
    lctx.fillText('MEDIACOM', W / 2 + 6, H / 2 + 60);
    lctx.font = '500 18px "JB Mono", monospace';
    lctx.fillStyle = hex(th.b);
    lctx.letterSpacing = '6px';
    const ev = ctx.hub.state.settings?.eventName;
    lctx.fillText((ev && ev !== 'Salon' ? ev : 'Le son · la lumière · l’image').toUpperCase(), W / 2 + 3, H / 2 + 100);
    // Joints des cabinets
    const cols = Math.round(conf.width / 0.5), rows = Math.round(((conf.width * 9) / 16) / 0.5);
    lctx.strokeStyle = 'rgba(0,0,0,0.45)';
    lctx.lineWidth = 1.2;
    lctx.beginPath();
    for (let c = 1; c < cols; c++) { const x = (c / cols) * W; lctx.moveTo(x, 0); lctx.lineTo(x, H); }
    for (let r = 1; r < rows; r++) { const y = (r / rows) * H; lctx.moveTo(0, y); lctx.lineTo(W, y); }
    lctx.stroke();
    ledTex.needsUpdate = true;
  }

  // Distance calculée pour que le plateau tienne dans la largeur, quel que soit le format de l'écran
  function presets() {
    if (conf.format === 'mediascene' && ms.parts) {
      // Cadrage calculé sur l'encombrement déployé : remorque, ailes de son, hauteur du toit
      const { halfX, top, zF, zB, deckH } = ms.parts.box;
      const vfov = (camera.fov * Math.PI) / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      const d = Math.max(15, (halfX + 2) / Math.tan(hfov / 2), (top * 0.62) / Math.tan(vfov / 2));
      const zm = (zF + zB) / 2, ty = deckH + (top - deckH) * 0.38;
      return {
        public: [[-d * 0.28, ty + d * 0.24, zF + d * 0.86], [halfX * 0.06, ty, zm]],
        scene: [[halfX + d * 0.25, deckH + (top - deckH) * 0.2 + 2, zF + d * 0.62], [-0.8, deckH + (top - deckH) * 0.35, zm]],
        top: [[0, top + d * 0.62, zm + d * 0.62], [0, deckH + (top - deckH) * 0.45, zm + 1]],
      };
    }
    const span = specs().w + 9;
    const hfov = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
    const d = Math.max(14, (span / 2) / Math.tan(hfov / 2) + 2);
    return { public: [[0, 5.2, d - 1], [0, 2.8, -1]], scene: [[span * 0.42, 4.4, 2.6], [-2, 1.6, 10]], top: [[0, d * 0.95, d * 0.7], [0, 0, 3]] };
  }
  let camAnim = null;
  function camTo(name, instant = false) {
    const [p, t] = presets()[name];
    if (instant || reduced()) { camera.position.set(...p); controls.target.set(...t); controls.update(); return; }
    const p0 = camera.position.clone(), t0 = controls.target.clone(), start = performance.now();
    camAnim = (now) => {
      const k = Math.min(1, (now - start) / 1100), e = k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2;
      camera.position.lerpVectors(p0, new T.Vector3(...p), e);
      controls.target.lerpVectors(t0, new T.Vector3(...t), e);
      if (k >= 1) camAnim = null;
    };
  }

  function resize() {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    if (!framed) { camTo('public', true); framed = true; }
  }
  let framed = false;
  new ResizeObserver(resize).observe(host);

  let running = false, last = 0, ledT = 0;
  const v = new T.Vector3(), up = new T.Vector3(0, -1, 0);
  function frame(now) {
    if (!running) return;
    requestAnimationFrame(frame);
    const t = now / 1000;
    camAnim?.(now);
    controls.update();
    if (conf.format !== 'mediascene' && now - ledT > 33) { drawLED(t); ledT = now; }
    if (ms.parts && ms.p !== ms.to) {
      const k = clamp01((now - ms.t0) / ms.dur);
      ms.p = ms.from + (ms.to - ms.from) * k;
      pose(ms.p);
    }
    for (const l of lyres) {
      const tx = l.head.position.x + Math.sin(t * 0.55 + l.phase) * 3.2 * l.side;
      const tz = 6 + Math.cos(t * 0.42 + l.phase) * 5;
      l.target.position.set(tx, 0, tz);
      v.subVectors(l.target.position, l.head.position).normalize();
      l.cone.quaternion.setFromUnitVectors(up, v);
      l.head.lookAt(l.target.position);
      l.head.rotateX(-Math.PI / 2);
    }
    if (haze) haze.rotation.y = Math.sin(t * 0.05) * 0.05;
    renderer.render(scene, camera);
    last = now;
  }
  function start() { if (running) return; running = true; resize(); requestAnimationFrame(frame); }
  function stop() { running = false; }
  function renderOnce() { drawLED(performance.now() / 1000); renderer.render(scene, camera); }

  world = { renderer, rebuild, recolor, toggles, camTo, start, stop, renderOnce, deploy };
  rebuild();
  camTo('public', true);
  if (conf.format === 'mediascene') deploy(0, 1);
  controls.addEventListener('start', () => { controls.autoRotate = false; });
  controls.addEventListener('end', () => { setTimeout(() => toggles(), 6000); });
  if (document.fonts?.load) document.fonts.load('600 44px Jost').then(() => drawLED(0));
}

export default {
  id: 'scene', title: 'Scène 3D', short: 'Scène 3D', sub: 'Plateau, mur LED et lumière en temps réel', icon: 'scene',
  mount,
  async enter() {
    active = true;
    if (!world) {
      try { await (building ||= build()); } catch (e) {
        console.error(e);
        const l = $('#s3-loading', el);
        if (l) l.textContent = 'La 3D n’est pas disponible sur cet appareil.';
        return;
      }
    }
    if (active && !document.hidden) world.start();
  },
  leave() { active = false; world?.stop(); },
  // Ouverture directe sur la MediaScène (depuis le Book), déploiement rejoué
  showMediaScene() { if (el) setFormat('mediascene'); else conf.format = 'mediascene'; },
};
document.addEventListener('visibilitychange', () => { if (!world) return; if (document.hidden) world.stop(); else if (active) world.start(); });
