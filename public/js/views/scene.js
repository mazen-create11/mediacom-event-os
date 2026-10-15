// Configurateur 3D : plateau, mur LED incurvé animé, truss, lyres et faisceaux, brume, salle.
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
  return { size, W, D, clear: m.clearance, deckH: m.deckH, trailer: m.trailer, name: m.name, load: m.id === 'ms60' ? '1,6 t' : m.id === 'ms160' ? '6 t' : '10,1 t' };
}
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
    $('#s3-note', el).textContent = 'Cotes des fiches techniques. Déploiement simplifié pour la démonstration : vérins de calage, montée du toit, ailes, planchers.';
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

  /* ---------- MediaScène : remorque, toit sur vérins, ailes et planchers dépliables ---------- */
  const ms = { p: 1, from: 1, to: 1, t0: 0, dur: 9000, parts: null };
  const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - (-2 * k + 2) ** 3 / 2);
  const clamp01 = (k) => Math.max(0, Math.min(1, k));
  const STEPS = [[0, 0.12, 'Calage sur vérins'], [0.1, 0.42, 'Montée du toit'], [0.4, 0.66, 'Ouverture des ailes'], [0.62, 0.84, 'Dépliage des planchers'], [0.82, 1, 'Son et lumière']];

  // Habillage de la remorque : MEDIASCÈNE sur les flancs, lisible quand la scène est repliée
  const brandTex = {};
  function brand(flip) {
    if (brandTex[flip]) return brandTex[flip];
    const c = document.createElement('canvas'); c.width = 2048; c.height = 512;
    const g = c.getContext('2d');
    g.fillStyle = '#eef1f6'; g.fillRect(0, 0, 2048, 512);
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.fillStyle = '#0b1830'; g.font = '600 200px Jost, sans-serif'; g.letterSpacing = '28px'; g.fillText('MEDIASCÈNE', 1024, 220);
    g.fillStyle = '#1670e4'; g.font = '500 58px "JB Mono", monospace'; g.letterSpacing = '16px'; g.fillText('LA SCÈNE MOBILE · MÉDIACOM', 1024, 395);
    const t = new T.CanvasTexture(c);
    t.colorSpace = T.SRGBColorSpace;
    t.anisotropy = 4;
    t.center.set(0.5, 0.5);
    t.rotation = flip ? Math.PI : 0;
    brandTex[flip] = t;
    return t;
  }

  function buildMS() {
    const m = msModel();
    const W = m.W, half = 1.25, wing = (m.D - 2 * half) / 2;
    const roofOpen = m.deckH + m.clear + 0.2, roofClosed = m.deckH + wing + 0.45;
    const zc = -2; // centre du plateau
    const deckMat = new T.MeshStandardMaterial({ color: 0x5a4130, roughness: 0.8 }); // plancher marron foncé (fiche 60 m²)
    const roofMat = new T.MeshStandardMaterial({ color: 0x2c3442, roughness: 0.5, metalness: 0.45 });
    const skinMat = new T.MeshStandardMaterial({ color: 0xe9edf3, roughness: 0.45, metalness: 0.25 });
    const alu = new T.MeshStandardMaterial({ color: 0xaab3c0, roughness: 0.35, metalness: 0.85 }); // châssis aluminium
    // Lumière de fin de journée : la structure se lit même repliée
    const sky = new T.HemisphereLight(0x8aa4cf, 0x1a1f2a, 1.35); group.add(sky);
    const sun = new T.DirectionalLight(0xffe2c0, 1.1); sun.position.set(-14, 18, 16); group.add(sun);
    const wash = new T.SpotLight(0xcfe3ff, 0, 40, 0.5, 0.7, 1.2); wash.position.set(0, 9, 14); group.add(wash);
    wash.target.position.set(0, m.deckH, -2); group.add(wash.target);
    const boxM = (w, h, d, mat) => new T.Mesh(new T.BoxGeometry(w, h, d), mat);
    const root = new T.Group(); root.position.z = zc; group.add(root);
    const P = { jacks: [], feet: [], columns: [] };

    // Remorque : châssis, roues, timon
    const chassis = boxM(m.trailer, 0.32, 2.3, alu); chassis.position.y = m.deckH - 0.24; root.add(chassis);
    const tow = boxM(1.6, 0.12, 0.16, alu); tow.position.set(m.trailer / 2 + 0.7, m.deckH - 0.3, 0); root.add(tow);
    for (const x of [-0.75, 0.75]) for (const z of [-1.02, 1.02]) {
      const wh = new T.Mesh(new T.CylinderGeometry(0.42, 0.42, 0.3, 24), black); wh.rotation.x = Math.PI / 2; wh.position.set(x, 0.42, z); root.add(wh);
    }
    // Vérins de calage (origine en haut, s'allongent vers le sol)
    for (const x of [-m.trailer / 2 + 0.5, m.trailer / 2 - 0.5]) for (const z of [-1.05, 1.05]) {
      const geo = new T.CylinderGeometry(0.07, 0.07, 1, 10); geo.translate(0, -0.5, 0);
      const j = new T.Mesh(geo, metal); j.position.set(x, m.deckH - 0.4, z); root.add(j); P.jacks.push(j);
    }
    // Plancher central et planchers dépliables
    const deck = boxM(W, 0.12, 2 * half, deckMat); deck.position.y = m.deckH; root.add(deck);
    const floorWing = (side) => {
      const piv = new T.Group(); piv.position.set(0, m.deckH, side * half);
      const panel = boxM(W, 0.12, wing, deckMat); panel.position.z = side * wing / 2; piv.add(panel);
      // Pieds de reprise au sol sous le bord extérieur
      for (const x of [-W / 2 + 0.3, 0, W / 2 - 0.3]) {
        const geo = new T.BoxGeometry(0.08, 1, 0.08); geo.translate(0, -0.5, 0);
        const f = new T.Mesh(geo, metal); f.position.set(x, 0, side * (wing - 0.15)); piv.add(f); P.feet.push(f);
      }
      root.add(piv); return piv;
    };
    P.floorF = floorWing(1); P.floorB = floorWing(-1);
    // Garde-corps arrière (norme 2022 sur la fiche) : simple lisse
    // Toit : partie centrale, ailes articulées, colonnes télescopiques
    const roof = new T.Group(); root.add(roof); P.roof = roof;
    const rc = boxM(W + 0.4, 0.22, 2 * half, roofMat); roof.add(rc);
    const rcTop = boxM(W + 0.4, 0.02, 2 * half, skinMat); rcTop.position.y = 0.12; roof.add(rcTop);
    const roofWing = (side) => {
      const piv = new T.Group(); piv.position.set(0, 0, side * (half + 0.12));
      const len = wing + 0.5;
      const panel = boxM(W + 0.4, 0.16, len, roofMat); panel.position.z = side * len / 2; piv.add(panel);
      const top = boxM(W + 0.4, 0.02, len, new T.MeshStandardMaterial({ map: brand(side < 0), roughness: 0.45, metalness: 0.15 })); top.position.set(0, 0.09, side * len / 2); piv.add(top);
      roof.add(piv); return { piv, len };
    };
    P.roofF = roofWing(1); P.roofB = roofWing(-1);
    for (const x of [-W / 2 + 0.25, W / 2 - 0.25]) {
      const geo = new T.BoxGeometry(0.34, 1, 0.34); geo.translate(0, 0.5, 0);
      const c = new T.Mesh(geo, metal); c.position.set(x, m.deckH, 0); root.add(c); P.columns.push(c);
    }
    // Fond de scène (bâche) et lignes de son accrochées sous l'aile avant
    const backGeo = new T.PlaneGeometry(W, 1); backGeo.translate(0, -0.5, 0);
    P.back = new T.Mesh(backGeo, new T.MeshStandardMaterial({ color: 0x07090d, roughness: 1, side: T.DoubleSide }));
    P.back.position.set(0, roofOpen - 0.1, -half - wing + 0.05); root.add(P.back);
    P.arrays = [];
    for (const x of [-W / 2 + 0.55, W / 2 - 0.55]) {
      const arr = new T.Group(); arr.position.set(x, roofOpen - 0.2, half + wing - 0.2);
      for (let k = 0; k < 6; k++) { const b = boxM(0.6, 0.3, 0.42, black); b.position.y = -0.2 - k * 0.32; b.rotation.x = k * 0.03; arr.add(b); }
      root.add(arr); P.arrays.push(arr);
    }
    // Lyres sur l'avant du toit (allumées en fin de déploiement)
    const n = Math.max(4, Math.round(W / 2));
    for (let i = 0; i < n; i++) addLyre(-W / 2 + 0.9 + (i * (W - 1.8)) / (n - 1), roofOpen - 0.45, zc + half + wing - 0.6, i);
    // Public debout
    const audience = new T.MeshStandardMaterial({ color: 0x0d121d, roughness: 0.9 });
    const pos = [];
    let seed = 11;
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    const front = zc + half + wing + 4;
    for (let i = 0; i < 220; i++) pos.push([(rnd() - 0.5) * (W + 10), 0.85, front + rnd() ** 0.8 * 14]);
    const im = new T.InstancedMesh(new T.CapsuleGeometry(0.2, 1.1, 4, 8), audience, pos.length);
    const dummy = new T.Object3D();
    pos.forEach((p, i) => { dummy.position.set(...p); dummy.updateMatrix(); im.setMatrixAt(i, dummy.matrix); });
    group.add(im);
    addHaze(W + 2, roofOpen, zc - 3, zc + 8);
    ms.parts = { P, m, roofOpen, roofClosed, half, wing, wash };
    world.trussH = roofOpen;
    world.stageH = m.deckH;
    pose(ms.p);
  }

  // Pose de la scène pour une progression p entre 0 (repliée) et 1 (déployée)
  function pose(p) {
    if (!ms.parts) return;
    const { P, m, roofOpen, roofClosed } = ms.parts;
    const seg = (i) => ease(clamp01((p - STEPS[i][0]) / (STEPS[i][1] - STEPS[i][0])));
    const pj = seg(0), pr = seg(1), pw = seg(2), pf = seg(3), pl = seg(4);
    P.jacks.forEach((j) => { j.scale.y = 0.05 + (m.deckH - 0.4) * pj; });
    const ry = roofClosed + (roofOpen - roofClosed) * pr;
    P.roof.position.y = ry;
    P.columns.forEach((c) => { c.scale.y = Math.max(0.01, ry - m.deckH); });
    P.roofF.piv.rotation.x = (Math.PI / 2) * (1 - pw);
    P.roofB.piv.rotation.x = (-Math.PI / 2) * (1 - pw);
    P.floorF.rotation.x = (-Math.PI / 2) * (1 - pf);
    P.floorB.rotation.x = (Math.PI / 2) * (1 - pf);
    P.feet.forEach((f) => { f.visible = pf > 0.98; f.scale.y = m.deckH; });
    P.back.scale.y = Math.max(0.001, (roofOpen - m.deckH - 0.2) * pl);
    P.back.visible = pl > 0;
    P.arrays.forEach((a) => { a.scale.y = Math.max(0.001, pl); a.visible = pl > 0; });
    ms.pl = pl;
    ms.parts.wash.intensity = 260 * pl;
    for (const l of lyres) {
      l.light.intensity = 120 * pl;
      l.cone.material.opacity = 0.075 * pl;
      l.head.visible = pl > 0;
    }
    if (haze) haze.material.opacity = 0.035 * pl;
    const bar = $('#s3-deploy-bar', el);
    if (bar) bar.style.transform = `scaleX(${p.toFixed(3)})`;
    const step = STEPS.find(([a, b]) => p >= a && p < b);
    const st = $('#s3-deploy-step', el);
    if (st) st.textContent = p >= 1 ? 'Déployée' : p <= 0 ? 'Repliée, prête à rouler' : step?.[2] || '';
  }

  function deploy(from, to) {
    ms.from = from; ms.to = to; ms.t0 = performance.now();
    ms.p = from;
    if (reduced()) { ms.p = to; pose(to); }
  }

  function rebuild() {
    clear();
    ms.parts = null;
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
    if (conf.format === 'mediascene') {
      const m = msModel();
      const span = m.trailer + 5;
      const hfov = 2 * Math.atan(Math.tan((camera.fov * Math.PI) / 360) * camera.aspect);
      const d = Math.max(16, (span / 2) / Math.tan(hfov / 2) + 2);
      return { public: [[-d * 0.32, m.clear + 3.4, d * 0.92], [0, m.deckH + m.clear * 0.4, -2]], scene: [[span * 0.55, m.clear + 1.5, 9], [0, m.deckH + 1, -2]], top: [[0, d * 0.95, d * 0.55], [0, 0, -1]] };
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
