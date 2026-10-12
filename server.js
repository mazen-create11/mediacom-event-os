/**
 * SERVEUR STAND LOCAL & SYNC HORS-LIGNE MEDIACOM
 * Permet de synchroniser 3 à 4 iPads / tablettes en Wi-Fi local sans connexion internet.
 * Lancez simplement : node server.js
 */

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Fichier non trouvé');
      } else {
        res.writeHead(500);
        res.end('Erreur serveur: ' + err.code);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-cache'
      });
      res.end(content, 'utf-8');
    }
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(`🚀 SERVEUR STAND MEDIACOM PRÊT & OPÉRATIONNEL`);
  console.log(`📡 URL Locale : http://localhost:${PORT}`);
  console.log(`📱 Accès Tablettes (Wi-Fi local) : http://<IP_DU_PC>:${PORT}`);
  console.log(`🖥️  Écran Mur LED Public : http://localhost:${PORT}/display.html`);
  console.log(`📲 Scan Visiteur Mobile : http://localhost:${PORT}/client.html`);
  console.log(`======================================================\n`);
});
