// Prépare public/ : polices auto-hébergées, bundles vendors (three, jsQR, QR), photos optimisées.
// Usage : cd tools && npm install && npm run build
import { build } from 'esbuild';
import { cpSync, mkdirSync, existsSync, readdirSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const pub = join(root, 'public');
const nm = join(here, 'node_modules');

const ensure = (p) => mkdirSync(p, { recursive: true });

// 1. Polices
ensure(join(pub, 'fonts'));
cpSync(join(nm, '@fontsource-variable/jost/files/jost-latin-wght-normal.woff2'), join(pub, 'fonts/jost.woff2'));
for (const w of [400, 500, 600, 700]) {
  cpSync(join(nm, `@fontsource/jetbrains-mono/files/jetbrains-mono-latin-${w}-normal.woff2`), join(pub, `fonts/jbmono-${w}.woff2`));
}

// 2. Vendors en modules ES
ensure(join(pub, 'js/vendor'));
const common = { bundle: true, format: 'esm', minify: true, target: ['safari15', 'chrome100'], logLevel: 'warning' };
await build({
  ...common,
  stdin: {
    contents: `export * from 'three'; export { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';`,
    resolveDir: here,
  },
  outfile: join(pub, 'js/vendor/three.js'),
});
await build({ ...common, stdin: { contents: `import jsQR from 'jsqr'; export default jsQR;`, resolveDir: here }, outfile: join(pub, 'js/vendor/jsqr.js') });
await build({ ...common, stdin: { contents: `import qrcode from 'qrcode-generator'; export default qrcode;`, resolveDir: here }, outfile: join(pub, 'js/vendor/qrcode.js') });

// 3. Photos (source : _research/photos_mediacom_org, numéros de la planche _research/sheet.jpg)
const PHOTOS = {
  '27': 'scene-m-rouge', '14': 'plateau-bleu-rouge', '13': 'faisceaux-rouges', '12': 'lasers',
  '21': 'regie-concert', '22': 'facade-violette', '49': 'facade-bleu-rose', '36': 'facade-rouge',
  '42': 'facade-bleue', '40': 'gala-award', '53': 'convention-palais', '15': 'pleniere-palais',
  '23': 'festival-plein-air', '02': 'concert-plage', '01': 'fan-zone-marseille', '17': 'concert-camargue',
  '31': 'artifices-port', '10': 'artifices-notre-dame', '45': 'gala-ring', '61': 'vieux-port-scene',
  '28': 'concert-couchant', '41': 'soiree-piscine', '54': 'soiree-jardin',
};
// Recadrages : retirer bandeaux/coins logos incrustés par le site
const CROPS = { '53': '100%x82%+0+0', '15': '100%x80%+0+0', '10': '100%x76%+0+0', '22': '100%x95%+0+0' };
const src = join(root, '_research/photos_mediacom_org');
const out = join(pub, 'assets/photos');
ensure(out);
const files = readdirSync(src);
for (const [num, name] of Object.entries(PHOTOS)) {
  const f = files.find((x) => x.startsWith(num + '.'));
  if (!f) { console.warn('photo manquante', num); continue; }
  const dst = join(out, `${name}.jpg`);
  if (existsSync(dst)) continue;
  const crop = CROPS[num] ? ['-gravity', 'South', '-crop', CROPS[num], '+repage'] : [];
  const base = [join(src, f), '-auto-orient', ...crop, '-strip', '-colorspace', 'sRGB', '-interlace', 'Plane'];
  execFileSync('magick', [...base, '-resize', '1800x1800>', '-quality', '80', dst]);
  execFileSync('magick', [...base, '-resize', '720x720>', '-quality', '74', join(out, `${name}-s.jpg`)]);
}

// 3b. Photos MediaScène réelles (non retouchées) — source : dossier prospection podium
const MS = { 'ms60-concert-public-reel': 'mediascene-concert', 'hero-vieux-port-reel': 'mediascene-vieux-port',
  'mediascene-les-gets': 'mediascene-les-gets', 'hero-scene-nuit': 'mediascene-nuit', 'ete-mediascene': 'mediascene-festival' };
for (const [from, name] of Object.entries(MS)) {
  const dst = join(out, `${name}.jpg`);
  if (existsSync(dst)) continue;
  const base = [join(root, '_research/mediascene', `${from}.jpg`), '-auto-orient', '-strip', '-colorspace', 'sRGB', '-interlace', 'Plane'];
  execFileSync('magick', [...base, '-resize', '1800x1800>', '-quality', '82', dst]);
  execFileSync('magick', [...base, '-resize', '720x720>', '-quality', '74', join(out, `${name}-s.jpg`)]);
}
cpSync(join(root, '_research/mediascene/logo-mediascene.png'), join(pub, 'assets/logo-mediascene.png'));

// 4. Icônes PWA depuis le logo vectoriel
ensure(join(pub, 'icons'));
for (const s of [192, 512, 180]) {
  const dst = join(pub, `icons/icon-${s}.png`);
  if (existsSync(dst)) continue;
  const svg = readFileSync(join(pub, 'assets/logo-m.svg'), 'utf8').replace('currentColor', '#ffffff');
  execFileSync('magick', ['-background', 'none', '-density', '600', 'svg:-', '-resize', `${Math.round(s * 0.5)}x`,
    '-gravity', 'center', '-background', '#04080f', '-extent', `${s}x${s}`, dst], { input: svg });
}
console.log('build ok');
