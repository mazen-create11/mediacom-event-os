// Charge : 60 écrans abonnés au flux du mur + 600 envois de mots en rafale (50 en parallèle)
import http from 'node:http';
const B = { host: 'localhost', port: 3100 };
let received = 0;
const subs = [];
for (let i = 0; i < 60; i++) {
  const req = http.get({ ...B, path: '/api/wall/stream' }, (res) => { res.on('data', (d) => { received += (String(d).match(/event: word\n/g) || []).length; }); });
  subs.push(req);
}
const words = Array.from({ length: 600 }, (_, i) => ['Gala', 'Concert', 'Festival', 'Séminaire', 'Convention', 'Lumière', 'Son', 'Image'][i % 8] + (i % 5 === 0 ? ' ' + (i % 37) : ''));
const post = (text) => new Promise((resolve) => {
  const body = JSON.stringify({ text });
  const r = http.request({ ...B, method: 'POST', path: '/api/words', headers: { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
  r.on('error', () => resolve(0)); r.end(body);
});
await new Promise((r) => setTimeout(r, 500));
const t0 = Date.now();
const codes = {};
for (let i = 0; i < words.length; i += 50) {
  const batch = await Promise.all(words.slice(i, i + 50).map(post));
  batch.forEach((c) => (codes[c] = (codes[c] || 0) + 1));
}
const dt = Date.now() - t0;
await new Promise((r) => setTimeout(r, 800));
console.log(`600 envois en ${dt} ms (${Math.round(600000 / dt)}/s) · codes`, codes, `· événements reçus par les 60 écrans : ${received} (attendu ${600 * 60})`);
subs.forEach((s) => s.destroy());
process.exit(0);
