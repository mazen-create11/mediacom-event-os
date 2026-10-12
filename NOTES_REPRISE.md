# Mediacom Event OS : notes de reprise (mis à jour le 09/10/2026, 11:20)

## 1. État réel : ce qui est fait / pas fait
**Aucune refonte n'est encore codée.** Le dossier de travail est préparé et la recherche est faite.
L'app qui tourne sur http://localhost:3000 est toujours l'ancienne version (fichiers à la racine, inchangés).

Fait :
- Audit complet du code existant (index.html, app.js, server.js, sw.js, display/master/nuage/contact, scene3d.js).
- Analyse de la DA réelle du site mediacom.org (voir §2).
- Récupération de 66 vraies photos du site (`_research/photos_mediacom_org/`, planche : `_research/sheet.jpg`).
- Outils de build testés (three r170, jsQR, qrcode-generator, esbuild) : `_research/build/package.json`.
- Squelette créé : `public/` (css, js/vendor, fonts, assets/photos, data, icons), `src/`, `scripts/`, `data/`.
- Copie de sécurité des anciens fichiers : `_legacy/`. Backup zip du 09/10 11:03 dans `scratch/`.

À savoir :
- `icons/` (2 SVG placeholders) et le dossier `assets/` (vide) ont été supprimés. Ils sont dans le zip de backup. Ils seront remplacés par de vrais icônes PNG générés depuis le logo.
- Le serveur a été arrêté puis relancé (même ancienne version, port 3000, log : `/tmp/mc-server.log`).
- `/tmp/mc/` est volatil : tout ce qui compte a été copié dans `_research/`.

## 2. DA Mediacom (extraite de mediacom.org, à respecter)
- Fond bleu-nuit presque noir (~#04080f) + photos de scène (fumée, faisceaux bleu/rouge), panneaux "verre dépoli" sur photo.
- Couleurs CSS du site : bleu `#3192ff` (accent n°1), `#0077fd`, noir `#1a1a1a`, blanc. Pas de cyan, pas d'or, pas de violet.
- Typo : Futura PT + Neue Kabel (Typekit, non utilisables hors-ligne). Équivalent libre à embarquer : **Jost** (Futura-like) + JetBrains Mono pour les chiffres.
- Logo : "M" blanc en chevrons (viewBox 398x375 : chevron principal + 2 petits triangles) + mot "mediacom" en minuscules. Baseline : "LE SON, LA LUMIÈRE, L'IMAGE".
- Style : eyebrows en MAJUSCULES très espacées, nav MAJUSCULES, boutons contour blanc 2px MAJUSCULES, titres sentence-case.
- Contraste : bouton plein = `#1670e4` + texte blanc (AA). `#3192ff` réservé au texte/accent sur fond sombre.
- Règle de marque (`~/brands/mediacom/BRAND.md`) : **Médiacom = prestataire technique, jamais "agence"** (corriger le placeholder "Agence Event PACA").
- Coordonnées vérifiées : 25 bd de Saint-Marcel 13011 Marseille, tél 04 88 80 13 77, contact@mediacom.org, avis Google : https://maps.app.goo.gl/nyXYYP8LgnCxwS8D6.
- Instagram `mediacom.marseille` : NON vérifié, à retirer de contact.html tant que pas confirmé.

## 3. Priorité n°1 : hub local (server.js) : synchro temps réel sans internet
Cible : `node server.js` = hub (stockage + temps réel) sur le Wi-Fi du stand, zéro dépendance npm.
- Stockage `data/db.json` (écriture atomique tmp+rename, debounce) : leads, mots, logs, tarifs, réglages.
- Temps réel : SSE `/api/stream` (heartbeat 15 s, reconnexion auto côté client, watchdog 40 s, reprise sur `visibilitychange`/`online`).
- API : `GET /api/state`, `POST/DELETE /api/leads`, `POST /api/leads/:id/photo` (fichier JPEG, pas de base64 dans la DB), `POST /api/transfer`, `POST /api/leads/:id/ack`, `POST /api/words` (public), `/api/words/clear|hide`, `POST /api/alert`, `GET/PUT /api/tarifs`, `GET /api/export.csv`, `GET /api/info`, `GET /api/health`.
- Transferts de lead : persistés (`lead.transfer = {from,to,note,at,ack}`) pour ne pas être perdus si la tablette cible est hors-ligne ; carillon + toast à l'arrivée.
- Présence des appareils (qui est connecté, quel opérateur) : c'est ce qui permet à la console master (iPhone) de voir les tablettes.
- Mode hors-ligne côté client : cache local du dernier état + file d'attente (outbox) rejouée à la reconnexion, ids générés côté client (idempotent).
- **Sécurité / RGPD** : les leads sont des données personnelles. Jeton de stand généré au 1er lancement (`data/config.json`), exigé sur toutes les routes "staff" ; localhost autorisé d'office. Appairage d'un appareil : ouvrir `/?t=JETON` une fois (QR affiché sur `/setup`). Les visiteurs n'ont accès qu'à l'envoi de mots + contact.
- Modération des mots : longueur max, anti-URL, filtre de gros mots FR, limite de débit par IP, interrupteur "accepter les mots" (master). Agrégation des doublons (taille du mot = nombre d'envois).
- Ne plus servir `server.js` ni `data/` (aujourd'hui tout le dossier est servi) : racine statique = `public/` uniquement, anti path-traversal, gzip en cache, ETag.
- Pas de leads de démo par défaut (risque de polluer les vraies données) : bouton "charger / effacer la démo".

## 4. HTTPS local (iPad : Service Worker + caméra)
- `http://192.168.x.x` = Safari bloque SW et caméra. Il faut du HTTPS **de confiance**, pas auto-signé simple.
- Plan : mini-CA locale générée par le serveur via `openssl` (OpenSSL 3.6 dispo dans `/opt/homebrew/bin`, ne pas utiliser LibreSSL `/usr/bin`), certificat serveur avec SAN = localhost + IP(s) LAN + `mediacom.local`, durée ≤ 825 jours (exigence Apple), régénéré si l'IP change. Fichiers dans `data/certs/`.
- Serveur HTTP :3000 (visiteurs + téléchargement du CA) **et** HTTPS :3443 (équipe).
- Page `/setup` : QR + marche à suivre iPad : télécharger `/mediacom-ca.crt` → Réglages > Profil téléchargé > Installer → Réglages > Général > Informations > Réglages des certificats > activer la confiance.
- Les visiteurs restent en HTTP (pas besoin de caméra/SW, évite l'avertissement de certificat).
- Les QR du mur doivent pointer vers l'IP LAN (pas `localhost`), via `/api/info` ; variable `PUBLIC_URL` possible (ex. tunnel cloudflared) si on veut atteindre des visiteurs en 4G.
- **Point d'attention** : un QR en IP locale ne marche que si le visiteur est sur le Wi-Fi du stand. Prévoir un 2e QR "Rejoindre le Wi-Fi" (`WIFI:T:WPA;S:ssid;P:mdp;;`) sur le mur, réglable dans /setup.

## 5. Scan du QR d'un collègue (lecture caméra non codée aujourd'hui)
- Lecteur caméra avec **jsQR** (bundle local, fonctionne sur iPad, pas de BarcodeDetector sur Safari).
- Générateur QR : **qrcode-generator** en SVG (net sur mur LED ; l'ancien `qrcode.min.js` gère mal l'UTF-8 accentué).
- Formats reconnus : `MCLEAD1:<base64url JSON>` (transfert hors-ligne sans photo), vCard (badge visiteur → préremplit le formulaire), autre texte/URL → note.
- Avec le hub, le transfert normal passe par le serveur ; le QR devient le plan B 100% hors-ligne.
- Le QR "Pass Contact" doit encoder **directement la vCard d'Éric** (marche sans réseau) avec option "page contact".

## 6. Book + 3D : vraies photos + vrai rendu three.js
Photos retenues (numéros de `_research/sheet.jpg`) :
- Hero / fonds : 27 (scène avec "M" Mediacom, LED), 14 (scène bleu/rouge), 13 (lumière rouge), 21, 12 (lasers)
- Concerts/festivals : 02, 23, 01, 17 (Camargue)
- Événements/galas : 22, 49 (façades en lumière), 10 (feux d'artifice Marseille)
- Corporate/séminaires : 40, 53, 15
- Matériel (détourés fond blanc) : 04 (L-Acoustics), 09 (Robe), 19 (dalle LED), 20 (console Yamaha)
- À faire : redimensionner (1600 px max, JPEG q≈78) vers `public/assets/photos/` avec noms parlants ; ne pas inventer de légendes précises (lieux/prestations) : légendes génériques, à valider par Éric. Vérifier les droits d'usage des photos (certaines portent un crédit "© Benjamin GAYTÉ-SORBIER" : n°02/03).
- Aucune vidéo disponible : prévoir l'emplacement, à demander à Éric.
- Book : filtres par univers, lightbox, **mode Présentation plein écran** (flèches/swipe/autoplay/Échap) à la place du bouton "Présenter" actuel.
- Retirer du texte les marques non vérifiées (Kiva II, Shure Axient…). Matériel confirmé par le site : L-Acoustics (A15, KS21, LISA), Robe i-Forte, Yamaha DM3, Novastar (VX600/MCTRL4K), Blackmagic ATEM.
- 3D three.js (bundle esbuild local, module ES) : mur LED incurvé (cylindre, joints de cabinets 500 mm, contenu animé sur canvas), truss, lyres avec SpotLight + cônes additifs, brume de particules, mobilier (plénière / lounge / gala), thèmes lumière, silhouette d'échelle, presets caméra (Public/Scène/Plan), OrbitControls, pause hors écran, DPR plafonné pour iPad, specs calculées (m², résolution selon pas, nb de cabinets). Conso LED/lyres : à confirmer par Nolan avant de pousser vers le calcul élec.

## 7. Devis : tarifs à valider par Éric
- Sortir les tarifs du code vers `public/data/tarifs.default.json` + édition via le hub (`/api/tarifs`).
- Statut `A_VALIDER` : bandeau visible partout + mention "estimation indicative non contractuelle" sur l'export/impression. Éric peut éditer, puis marquer "validé par / le" : le bandeau disparaît.
- Lignes sans prix connu = "sur devis" (exclues du total), plutôt que d'inventer de nouveaux montants. Les valeurs actuelles (base 1500, LED 2800, son 1400, lumière 1600, streaming 1200, paliers jauge) restent des **placeholders**.
- Vue imprimable (CSS print) + copie du récapitulatif.

## 8. Refonte UI/UX (parti pris : "Scène", pas dashboard SaaS générique)
- Un seul accent (bleu Mediacom) ; statuts sémantiques discrets ; icônes SVG (plus d'emoji) ; cibles tactiles ≥ 44 px ; rythme 4/8 ; animations 150–300 ms ; `prefers-reduced-motion` ; `min-height: 100dvh` ; chiffres tabulaires.
- Nav : sidebar ≥ 1100 px, rail d'icônes 700–1099 px, tab bar < 700 px. Présence de l'équipe (pastilles vertes) + statut de connexion au hub bien visibles.
- Capture lead : commutateur de mode (Express / Badge / Carte), chips de besoins sans marques inventées, **champ Budget manquant** (le JS lisait `lead-budget` qui n'existe pas), fiche lead en tiroir latéral avec historique, recherche + filtres (Tous / Mes contacts / Chauds / Transferts reçus).
- Mur LED (display.html) : scène 2:1 (4x2 m) responsive via container units, photo de fond assombrie, nuage de mots à placement sans collision (spirale + rectangles) avec animation d'entrée du dernier mot, QR SVG + QR Wi-Fi, ticker sobre.
- nuage.html (visiteur) : mobile-first, erreurs claires si hors Wi-Fi stand. master.html (iPhone) : présence tablettes en direct, flux de leads, modération, alerte régie, export CSV, interrupteur mots.
- Typo Jost + JetBrains Mono auto-hébergées (woff2 dans `public/fonts/`). Aucun CDN au runtime.
- Service Worker : stale-while-revalidate pour le statique, jamais d'`/api`, liste de précache complète, version de cache.

## 9. Architecture cible
```
server.js            hub (http + https, SSE, JSON), 0 dépendance
scripts/             génération certificats, build
src/                 sources three.js / QR / scan (esbuild → public/js/vendor)
public/              index, display, nuage, contact, master, setup, sw.js, manifest, css/, js/ (modules ES), fonts/, assets/photos/, data/
data/                db.json, config.json (jeton), certs/, cards/   (à mettre dans .gitignore)
_legacy/             anciens fichiers (référence)
_research/           photos du site, logo, CSS du site, planche-contact
```
Build : `cd _research/build && npm i` (ou déplacer ce package.json à la racine) puis esbuild des bundles ; le runtime n'a besoin que de Node.

## 10. Ordre d'exécution recommandé
1. Assets : fonts Jost/JetBrains, photos optimisées, icônes PNG (depuis `_research/logo.png`), bundles three/jsQR/QR.
2. `server.js` hub + `scripts/` certificats + `/setup`. Tests API en ligne de commande (curl) avant toute UI.
3. Design system CSS (tokens + composants) puis `public/js/hub.js` (SDK client, outbox).
4. Pages : display → nuage → master → index (vues Leads, Mur LED, Book, Devis, 3D, Élec, Contact/QR) → contact.
5. Scan QR + transfert, devis éditable, scène 3D.
6. Test réel : 2 navigateurs + téléphone sur le Wi-Fi, coupure/reprise réseau, iPad en HTTPS (caméra, SW offline), mur LED 2:1.
7. Mettre à jour README (vérifier que "synchro auto" y est maintenant vrai), supprimer les promesses non tenues.

## 11. Limites déjà connues (ancienne liste, statut)
1. Pas de synchro entre appareils → **à faire (§3)**.
2. QR avec `localhost` inutilisable par les téléphones → IP LAN via `/api/info` (§4).
3. SW + caméra exigent HTTPS → CA locale (§4).
4. Scan QR collègue non codé → §5.
5. Book sans vraies photos, "Présenter" à repenser → §6.
6. 3D = Canvas 2D simulé → three.js (§6).
7. Tarifs inventés → à valider par Éric (§7).
8. Liens Instagram/Google à vérifier → Google vérifié (JSON-LD du site), Instagram à retirer.

## Lancer en local (version actuelle)
```bash
cd /Users/chabanmazen/.gemini/antigravity/scratch/mediacom-event-app
node server.js
```
- Mac : http://localhost:3000 — iPad/iPhone (même Wi-Fi) : http://<IP du Mac>:3000 (l'IP peut changer).

## Questions ouvertes pour l'équipe
- Éric : valider les tarifs, fournir vidéos/photos autorisées, confirmer le compte Instagram.
- Nolan : conso réelle du mur LED et des lyres (calcul électrique).
- Wi-Fi du stand : routeur dédié avec SSID/mot de passe fixes pour le QR "Rejoindre le Wi-Fi" ? Ou tunnel internet pour les visiteurs en 4G ?
