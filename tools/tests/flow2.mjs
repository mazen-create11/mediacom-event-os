import { chromium } from '/Users/chabanmazen/node_modules/playwright-core/index.mjs';
const BASE = 'http://127.0.0.1:3100';
const T = process.env.T;
const OUT = 'tools/tests/shots';
const exe = '/Users/chabanmazen/Library/Caches/ms-playwright/chromium_headless_shell-1248/chrome-headless-shell-mac-arm64/chrome-headless-shell';
const browser = await chromium.launch({ executablePath: exe });
const errs = [];
const watch = (p, n) => { p.on('pageerror', (e) => errs.push(n + ' ' + e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(n + ' ' + m.text())); };
const api = (m, u, b) => fetch(BASE + u, { method: m, headers: { 'Content-Type': 'application/json', 'x-stand-token': T }, body: b ? JSON.stringify(b) : undefined }).then((r) => r.json());
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Tablette appairée
const tab = await browser.newPage({ viewport: { width: 1180, height: 1500 } }); watch(tab, 'tab');
await tab.goto(`${BASE}/?t=${T}#mur`, { waitUntil: 'networkidle' });
await tab.evaluate(() => localStorage.setItem('mc_op', 'mazen')); await tab.reload({ waitUntil: 'networkidle' }); await sleep(900);
console.log('1. état écran (sans écran) :', await tab.$eval('#mw-screen', (e) => e.textContent.trim()));

// Ordinateur du mur : /ecran se signale
const scr = await browser.newPage({ viewport: { width: 1600, height: 800 } }); watch(scr, 'ecran');
await scr.goto(`${BASE}/ecran`, { waitUntil: "load" }); await sleep(1800);
console.log('2. état écran (branché) :', await tab.$eval('#mw-screen', (e) => e.textContent.trim()));

// Participation : mots, sondage, questions
for (const w of ['Convention', 'Plénière', 'Émotion', 'Convention', 'Marseille', 'Convention', 'Lumière']) await api('POST', '/api/words', { text: w, pid: 'p' + Math.random() });
await api('PUT', '/api/poll', { title: 'Quel format pour votre prochain séminaire ?', options: ['Plénière + ateliers', 'Convention', 'Soirée', 'Hybride'] });
for (let i = 0; i < 9; i++) await api('POST', '/api/poll/vote', { optionIds: ['o' + (1 + (i % 3))], pid: 'v' + i });
const q1 = await api('POST', '/api/questions', { text: 'Quel délai pour une plénière de 400 personnes ?', pid: 'qa' });
await api('POST', '/api/questions', { text: 'Proposez-vous la captation en direct ?', pid: 'qb' });
for (let i = 0; i < 4; i++) await api('POST', '/api/questions/vote', { id: q1.question.id, pid: 'u' + i });
await api('POST', '/api/questions/set', { id: q1.question.id, answered: true });
await sleep(900);
console.log('3. stats session :', await tab.$$eval('#mw-session .ses-stat', (els) => els.map((e) => e.textContent.trim().replace(/\s+/g, ' ')).join(' | ')));
console.log('   état écran :', await tab.$eval('#mw-screen', (e) => e.textContent.trim()));

// Nuage : question au centre (défaut), puis au-dessus
await sleep(1200);
console.log('4. layout écran :', await scr.$eval('#wall', (e) => e.dataset.layout), '| mots placés :', await scr.$$eval('.w-word-i', (l) => l.length));
const over = await scr.evaluate(() => {
  const t = document.querySelector('#w-title').getBoundingClientRect();
  return [...document.querySelectorAll('.w-word-i')].filter((w) => { const r = w.getBoundingClientRect(); return r.left < t.right && r.right > t.left && r.top < t.bottom && r.bottom > t.top; }).map((w) => w.textContent);
});
console.log('   mots qui chevauchent la question :', over.length ? over.join(', ') : 'aucun');
await scr.screenshot({ path: `${OUT}/ecran-nuage-centre.png` });
await tab.click('[data-layout="haut"]'); await sleep(1800);
console.log('   après « au-dessus » :', await scr.$eval('#wall', (e) => e.dataset.layout));
await scr.screenshot({ path: `${OUT}/ecran-nuage-haut.png` });
await tab.click('[data-layout="centre"]'); await sleep(600);

// Sondage et questions à l'écran pour la capture
await tab.click('[data-scene="poll"]'); await sleep(1500); await scr.screenshot({ path: `${OUT}/ecran-sondage.png` });
await tab.click('[data-scene="cloud"]'); await sleep(400);
await tab.screenshot({ path: `${OUT}/tab-ecran-session.png`, fullPage: true });

// Nouvelle session : archive, client, question
await tab.click('[data-ses="new"]'); await sleep(500);
await tab.fill('#ses-n', 'Convention Acme 2026'); await tab.fill('#ses-c', 'Acme'); await tab.click('[data-sq]'); await sleep(100);
await tab.screenshot({ path: `${OUT}/tab-nouvelle-session.png` });
await tab.click('#ses-new-f button.btn-primary'); await sleep(1500);
const st = await api('GET', '/api/state');
console.log('5. nouvelle session :', st.session.name, '| client écran :', st.wall.theme.client, '| mots :', st.words.length, '| sondage :', st.poll, '| archivées :', st.sessions.length, '| stats arch. :', JSON.stringify(st.sessions[0]?.stats));
console.log('   liste tablette :', await tab.$$eval('.ses-row', (l) => l.map((r) => r.querySelector('b').textContent)));
console.log('   écran (client) :', await scr.$eval('#w-brand', (e) => e.textContent.trim()), '| titre :', await scr.$eval('#w-question', (e) => e.textContent));

// Rapport : session close et en direct
const rp = await browser.newPage({ viewport: { width: 900, height: 1400 } }); watch(rp, 'rapport');
await rp.goto(`${BASE}/rapport?id=${st.sessions[0].id}&t=${T}`, { waitUntil: 'networkidle' }); await sleep(600);
console.log('6. rapport :', await rp.$eval('h1', (e) => e.textContent), '|', await rp.$$eval('.stats b', (l) => l.map((b) => b.textContent).join('/')), '| blocs :', await rp.$$eval('.block h2', (l) => l.map((h) => h.textContent)));
await rp.screenshot({ path: `${OUT}/rapport-close.png`, fullPage: true });
await rp.goto(`${BASE}/rapport?id=live&t=${T}`, { waitUntil: 'networkidle' }); await sleep(600);
console.log('   rapport live :', await rp.$eval('h1', (e) => e.textContent), '|', await rp.$eval('#bar-t', (e) => e.textContent));
const r401 = await fetch(`${BASE}/rapport?id=live`).then((r) => r.status);
const a401 = await fetch(`${BASE}/api/sessions/live`).then((r) => r.status);
console.log('   sans jeton : page', r401, '· api', a401);

// CSV d'une session close
await tab.click('[data-ses="csv"]').catch(() => {});
const csv = await fetch(`${BASE}/api/sessions/${st.sessions[0].id}/export.csv?t=${T}`).then((r) => r.text());
console.log('7. CSV lignes :', csv.split('\r\n').length, '| 1re :', csv.split('\r\n')[1]);

// Pass : validation du Book
await tab.goto(`${BASE}/#pass`, { waitUntil: 'networkidle' }); await sleep(900);
console.log('8. book :', await tab.$eval('#bv-r', (e) => e.textContent.trim()), '| cartes :', await tab.$$eval('.bv-card', (l) => l.length));
const first = await tab.$('.bv-card.on');
const fname = await first.$eval('.bv-t b', (e) => e.textContent);
await first.click(); await sleep(800);
const st2 = await api('GET', '/api/state');
console.log('   retirée :', fname, '→ bookHide =', JSON.stringify(st2.settings.bookHide), '|', await tab.$eval('#bv-r', (e) => e.textContent.trim()));
await tab.click('[data-f="off"]'); await sleep(300);
await tab.screenshot({ path: `${OUT}/tab-pass-book.png`, fullPage: true });
await tab.click(`.bv-card.off[data-bv="${st2.settings.bookHide[0]}"]`); await sleep(800);
console.log('   remise :', JSON.stringify((await api('GET', '/api/state')).settings.bookHide));
// l'écran reçoit book dans le flux public
const pub = await fetch(`${BASE}/api/wall/stream`, { signal: AbortSignal.timeout(800) }).then((r) => r.text()).catch(() => '');
console.log('   flux public contient book :', /"book":\{/.test(pub));

// Contacts : « tester créer un nouveau contact » (Nolan)
await tab.goto(`${BASE}/#contacts`, { waitUntil: 'networkidle' }); await sleep(600);
const before = (await api('GET', '/api/state')).leads.length;
await tab.click('#go'); await sleep(700);
await tab.fill('#f-name', 'Claire Test'); await tab.fill('#f-company', 'Acme Séminaires'); await tab.fill('#f-phone', '06 12 34 56 78'); await tab.fill('#f-email', 'claire@acme.test');
await tab.screenshot({ path: `${OUT}/tab-contact-saisie.png` });
await tab.click('#cap-save'); await sleep(1200);
const after = await api('GET', '/api/state');
console.log('9. contact créé :', after.leads.length - before, '| nom :', after.leads[0]?.name, '| société :', after.leads[0]?.company, '| par :', after.leads[0]?.capturedBy || after.leads[0]?.operator);
await tab.screenshot({ path: `${OUT}/tab-contacts.png` });

// Écran perdu : on ferme l'écran, la tablette le voit
await scr.close(); await sleep(16500);
await tab.goto(`${BASE}/#mur`, { waitUntil: 'networkidle' }); await sleep(700);
console.log('10. écran fermé → état :', await tab.$eval('#mw-screen', (e) => e.textContent.trim()));

console.log('ERREURS CONSOLE :', errs.length ? errs : 'aucune');
await browser.close();
