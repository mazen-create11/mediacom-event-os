# Rapport du 16 octobre 2026 : seconde lecture des vocaux de Nolan

Relecture mot à mot des trois mémos du 13/10 (transcription ElevenLabs du 15/10, hors git) et comparaison point par point avec ce qui était livré la veille. Cinq demandes n'étaient couvertes qu'à moitié. Elles le sont maintenant, testées en local (hub :3100, Playwright, 0 erreur console) et en ligne.

## Ce que Nolan a dit, et ce qui y répond

| Nolan, 13/10 | Était livré le 15/10 | Ajouté le 16/10 |
|---|---|---|
| « Moi, c'est créer une session, ça fait un lien. » « Qu'on puisse réutiliser sur toutes les prestations. » | Un seul état global, remis à zéro à la main | **Sessions** : module 04 de l'onglet Écran. Nouvelle session = nom, client, première question ; la précédente est archivée avec ses résultats. Liste des sessions closes, suppression, CSV. |
| « On vend un service. Les mecs ont pris 3 à 4 000 € juste pour administrer une session. » | Rien à remettre au client | **Rapport de session** `/rapport?id=live` ou `?id=<session>` : A4 imprimable, mots les plus cités, barres du sondage, questions classées par soutiens, compteurs, durée. C'est le livrable qui justifie le prix. |
| « Un lien qui me fera office d'écran », sur son PC relié au boîtier de commutation | `/ecran` et `/ecran/<scène>` | **Écran surveillé** : la page `/ecran` se signale toutes les 5 s ; la tablette affiche « Écran Nuage · 1600×800 · plein écran » ou « Écran perdu depuis 20 s ». Veille bloquée (Wake Lock), dernier état gardé en local (relance sans réseau sur la bonne scène), **lanceurs kiosque** `tools/ecran/Ecran-Mediacom.bat` et `.command`. |
| « Les questions, c'est mieux que ce soit au milieu. » (Mazen) « C'est ça. » (Nolan) | Question au-dessus du nuage | **Question au centre, les mots autour** (défaut), ou au-dessus : choix dans le panneau Nuage. Le placement en spirale réserve la zone de la question, aucun chevauchement (vérifié). |
| « On peut appliquer la DA du client. » | Logo, couleurs, nom sur le message | Sans logo, le **nom du client prend la tête de l'écran**, Médiacom signe en petit. La nouvelle session pose le client d'un coup. |
| Book : « concerts en plein air, gala sportif, MMA… à voir avec Éric », deux vidéos à confirmer | Tri `sem: false` et interrupteur « Tout le book » | **Validation d'Éric** (Pass, module 03) : les 26 références en vignettes, un toucher retire ou remet chacune, filtre montrées / retirées / vidéos, « Copier la liste pour Éric ». Appliqué au Book, au showreel et à l'écran. |
| Contacts : « juste tester créer un nouveau contact » | Non testé | Testé en Playwright : fiche créée, signée Mazen, synchronisée au hub. |
| « Tout ce qui bouge distrait l'œil » | Style sobre, bandeau masqué en sortie pure | Vérifié : aucune animation continue en sobre et en `/ecran`. |

## Ce que ça change pour la vente

Le client ne voit que l'écran et le QR. Médiacom crée la session sur la tablette (nom du client, question d'ouverture), pilote nuage / sondage / questions, modère, clôt, puis remet le rapport imprimé ou en PDF. La session suivante repart à zéro sans toucher aux liens. Un opérateur non technique suit le parcours en trois touches : Nouvelle session, scène, Rapport.

## Technique

- `server.js` : `db.session`, `db.sessions` (60 max), routes `POST /api/session/new`, `PUT /api/session`, `GET /api/sessions`, `GET /api/sessions/live`, `GET|DELETE /api/sessions/:id`, `GET /api/sessions/:id/export.csv` ; `POST /api/screen/ping` (public, mémoire seulement, purge à 20 s) ; `wall.cloudLayout` ; `settings.bookHide / bookShow` ; `publicWall()` porte `book`.
- `functions/api/[[path]].js` : mêmes routes sur D1 (clés `session`, `sessions` 12 max, `screens`, `settings` dans la table `kv`, aucun changement de schéma). `/wall/state?all=1` renvoie réglages, écrans, session.
- `hub.js` : `newSession`, `updateSession`, `listSessions`, `getSession`, `deleteSession`, `liveSession`, `sessionStats` ; mode local = `localStorage mc_sessions` ; flux public avec `book`.
- `mur.js` : `titleRect()` réservé dans `place()`, `data-layout`, Wake Lock, ping, cache `mc_ecran_last`, nom client en tête.
- `views/mur.js` : état écran, chips de disposition, module 04. `views/pass.js` : module 03. `data.js` : `setBookOverrides()`. `rapport.html`, `js/rapport.js`, `css/rapport.css`. `sw.js` v4.1.0.

## Vérifications

- Parcours local complet (`flow2.mjs`) : écran branché → stats → disposition → sondage → nouvelle session (archive, client, question) → rapport close et live → CSV → validation Book (retirer, remettre, flux public) → création de contact → écran perdu. 0 erreur console.
- En ligne : état étendu, ping, nouvelle session « Démo SBE Marseille » (jeu de démo rechargé : 10 mots, sondage 9 votes, 2 questions), réglages Book, pages `/rapport`, `/ecran/sondage`, `/nuage` en 200.

## Toujours bloqué, et la solution la plus simple

Le VPS de Nolan (clé refusée) et le jeton Hostinger (401) n'ont pas bougé. Pour obtenir `salon.<domaine>/ecran` sans toucher au VPS : Nolan ajoute dans sa zone DNS un enregistrement `CNAME salon → mediacom-event-os.pages.dev`, Mazen déclare le domaine dans Cloudflare Pages (Custom domains). Une minute de chaque côté, certificat automatique. Le script `tools/vps/deployer.sh` reste prêt si Nolan préfère héberger lui-même.

## À faire valider

- Éric : liste du Book (bouton « Copier la liste pour Éric »), droits des vidéos, triptyque d'Allauch.
- Nolan : tester `/ecran` sur le PC du boîtier avec le lanceur, choisir le nom de domaine, décider nuage Médiacom ou son outil (scène Externe).
- Mazen : tarif de la « session interactive administrée » (référence donnée par Nolan : 3 à 6 k€ chez les concurrents).

---

# Après-midi du 16/10 : navigation, étiquettes, MediaScène 3D

## Demandes de Mazen et interprétation

- « Revenir en arrière » = un bouton de retour dans l'app, pas un retour de version. Livré : flèche « page précédente » dans l'en-tête (`fc47d95`), puis, sur son « oui », restitution du défilement au retour (`0f98688`).
- Étiquettes git posées pour pouvoir revenir à une version : `v2026-10-12`, `v2026-10-15`, `v2026-10-16`, `v2026-10-16b`. Retour = `git checkout <étiquette> -- public server.js functions` puis redéploiement.
- Scène Externe expliquée : n'importe quelle adresse https en plein écran (outil de Nolan, vidéo, site) ; lien figé `/ecran/externe` ; vide tant que Nolan n'a pas donné son adresse.
- « vasy, et ouvre » (après la proposition d'une vidéo du déploiement) : l'app a été ouverte sur la scène 3D ; la vidéo de 12 s pour le showreel est **commencée mais non livrée** (interrompue par « enregistre tout »), voir « Reste ».

## Navigation retour (`fc47d95`, `0f98688`)

- `public/index.html` : bouton `#back` dans `.top-title`. `app.js` : pile `trail`, `goBack()` (ferme tiroir ou feuille d'abord, sinon `history.back()`), `popstate`, `go(id, {instant, fromHistory})` avec `pushState` / `replaceState`, rail intercepté, Échap = retour quand rien n'est ouvert, `scrollPos` par vue restitué si `fromHistory`.
- Tests `tools/tests/back.mjs` et `tools/tests/scroll.mjs` (hub de test :3200, `MC_TOKEN` en variable d'env) : rail, flèche, geste navigateur, suivant, tiroir, Échap, défilement 900 → 0 → 900. 0 erreur console.

## MediaScène 3D refaite (`335d622`, agent Opus 5.5 effort max, 63 min)

Seul `public/js/views/scene.js` est modifié. Sources : 7 PDF de `~/Desktop/prospection-podium-mobile/07-docs/`, note de calcul DEKRA de la 60 (copie texte hors git : `_archive/2026-10-16/note-de-calcul-mediascene-60-dekra.txt`), photos de l'app et de `_research/mediascene/` (aucune `-premium`), 5 pages de mediascene.eu via Firecrawl une à la fois.

| Taille | Plateau, hauteur de plancher | Sous toit | Toit | Porteur |
|---|---|---|---|---|
| 60 | 9,08 × 6,58 m, plancher 1,05 m | 4,87 m depuis le plancher | 9,56 × 7,76 m | remorque alu 3,5 t, timon, 2 essieux, coffre blanc 11,02 × 2,50 × 4 m |
| 3-en-1 80 / 100 / 120 | 12,30 × 6,86 / 8,11 / 9,36 m, plancher 1,45 m | 7,97 m compté depuis le sol | 7,94 m de profondeur, casquette, rallonge en 120 | semi-remorque noire 26 t, 2 essieux |
| 160 | 13,50 × 10,50 m, plancher 1,20 m | 8 m depuis le plancher | 14 × 12 m, déport son 1,50 m | semi-remorque 3 essieux |

- Déploiement 12 s en 6 phases, ordre hydraulique des fiches : calage (4 vérins), ailes de toit à 20°, planchers sur pieds, toit sur colonnes télescopiques à 3 éléments, poteaux / garde-corps / escalier / avancée / casquette, bâches / son / ponts lumière, lyres allumées à la fin. Rejouable.
- Châssis galva sur la 60, noir sur les semi-remorques ; toit blanc dessus, noir dessous ; tubes alu (60), H30V noirs (3-en-1), tours tri (160) ; line arrays, garde-corps noirs, escalier alu, jupe.
- Le réglage Lyres agit désormais sur la MediaScène. 110 à 141 appels de rendu, 50 à 61 k triangles, 60 images/s, mémoire stable après 12 reconstructions. Autres formats inchangés.
- Captures : `docs/rapports/2026-10-16/3d/` (planche des 15 vues, 3 séquences de déploiement, planche portrait iPad, 3 vues public).
- En ligne : `scene.js` de production = dépôt (même empreinte SHA-1).

### À faire trancher par Nolan

1. Les 7,97 m du 3-en-1 : comptés depuis le sol (choix retenu, plans EMS à 8,6 m hors-tout) ou depuis le plancher (toit à remonter de 1,45 m).
2. Cinématique de la 160 : aucun document ; interprétation (ailes et planchers en 2 panneaux, toit avant les planchers), dite sous les cotes dans l'app. Régies latérales de 4 m non modélisées.
3. Poteaux de la 60 : tubes alu (note de calcul, photo de nuit) ou treillis noir (photo des Gets).

Contradictions relevées : fiche « Scène mobile 120 » à 14 × 8 m et 6,2 m sous charpente (EMS suivi, confirmé par le site) ; semi de la 160 entre 13,80 et 14,20 m ; plateau de la 60 donné à 9,08 × 6,58, 9 × 6,70 ou 9,25 × 6,59 (cotes de `data.js` gardées). Écartés : fiche 70 m² et doc ULMA Brio (scène fixe). Estimés faute de document : hauteur sur route, épaisseurs, sections de colonnes, longueur des ailes de son, position des ponts, nombre d'enceintes, pneus, largeur de toit du 3-en-1 (12,90 m), longueur de casquette.

## Reste

- **Vidéo du déploiement** (proposition acceptée par « vasy ») : rendu 12 s en 2:1 (1728 × 864 comme les vidéos existantes), capturé image par image depuis `scene.js` en pilotant `ms.t0` / `ms.dur`, encodé en H.264, ajouté à `VIDEOS` dans `data.js` (`sem: true`, poster) pour le showreel de l'écran. Non commencé dans le code.
- Décisions en attente inchangées : domaine `salon.…` (CNAME), tarif de la session, liste du Book pour Éric, droits vidéos et triptyque d'Allauch, adresse de l'outil de Nolan, test iPad et boîtier LED.
