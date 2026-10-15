# Médiacom Event OS · passe du 15/10/2026

Source : trois vocaux de Nolan (direction technique) enregistrés le 13/10 avec Mazen, transcrits le 15/10 (ElevenLabs Scribe, diarisation), relus en entier. La version Antigravity du 13/10 avait été annulée par Mazen (« annule tout, reviens à la version précédente ») : le dépôt était resté propre au commit du 12/10.

## Ce que Nolan a demandé, et ce qui a été fait

| Demande de Nolan | Réponse dans l'application |
|---|---|
| « Il me faut un lien qui diffusera que ça » : son PC alimente le mur par un boîtier de commutation, l'écran ne reçoit rien à distance | `/ecran` suit la tablette ; `/ecran/nuage`, `/ecran/sondage`, `/ecran/questions`, `/ecran/showreel`, `/ecran/mediascene`, `/ecran/message`, `/ecran/externe`, `/ecran/noir` restent figés. Sortie pure : ni bandeau, ni compteur. Bouton « Liens de l'écran » (QR + copier) dans l'onglet Écran, carte sur `/setup`. |
| Vendre le concept : nuage de mots, questions-réponses, QCM administrés par Médiacom (3 à 4 k€ la session chez les autres) | Trois activités natives : nuage, **sondage** (2 à 6 réponses, choix multiple, ouvrir / clore, remise à zéro, barres et pourcentages en direct), **questions** (envoi, vote des participants, épingler / répondu / masquer). Quatre sondages prêts pour la démo du salon. |
| Modération, clore les réponses, nombre de réponses par personne | Interrupteurs « Accepter les réponses » et « Accepter les questions », limite de mots par personne (illimité, 1, 2, 3), modération mot à mot et question par question. |
| « Tout ce qui bouge distrait l'œil » en séminaire | Style **Sobre** par défaut : fond nuit fixe, aucun faisceau. « Lumière » garde l'ambiance d'origine sur demande. |
| Fond uni, dégradé ou image ; DA du client | Habillage : Sobre, Lumière, Couleur, Dégradé, Photo ; dix couleurs + couleur libre ; nom et logo du client (réduit à 320 px, stocké dans l'état du mur) ; signature Médiacom activable. L'encre passe en sombre sur un fond clair. |
| Nuage : utiliser son outil, ou « mettre ça à la place de nuage » | Scène **Externe** : n'importe quelle adresse (son outil sur son VPS) s'affiche plein écran dans la même sortie ; la tablette garde la main. |
| Enlever les réglages du nuage de la tablette, élargir l'aperçu | Aperçu plein cadre, une touche par scène, un panneau par activité, l'habillage à part. |
| Book : pas de concerts plein air, de gala sportif, ni la vidéo « inventée » | 11 photos (concerts, festival, fan zone, ring) et le triptyque d'Allauch passent en réserve : absents du Book et du showreel. Interrupteur « Tout le book » dans Pass (décision Éric). |
| « Peut-être mettre la 160, c'est la plus grande » | Scène 160 m² avec régie ajoutée partout (Book, écran, 3D) depuis la fiche technique : 13,50 × 10,50 m, 38 t, 6 t en toiture, 100 km/h sans bâche, 5 h 30 à 4. |
| Contacts : « rien à dire » | Inchangé. |

## Technique
- Hub `server.js` : état `poll`, `pollVotes`, `questions`, `wordsBy` ; routes `/api/poll*`, `/api/questions*` ; `PUT /api/wall` accepte `theme`, `externalUrl`, `maxPerPerson`, `reelSet`, `qaTitle`, `qaOpen` (nettoyage strict : couleurs hex, logo image seulement, URL http(s) seulement). Identité participant = `pid` du navigateur.
- Démo Cloudflare : mêmes routes dans `functions/api/[[path]].js`, tables D1 `wordsby`, `pvotes`, `questions`, `qvotes` (schéma appliqué le 15/10), `public/_redirects` pour `/ecran/*` et `/live` (cibles sans `.html`, sinon Pages renvoie un 308).
- Service worker : `keyOf` et `clean` n'existaient pas (aucun cache hors-ligne ne fonctionnait depuis le 12/10) ; réparés, version `mc-os-v4.0.0`.
- Tests : 23 captures Playwright (écran × 11, tablette × 7, téléphone × 5), zéro erreur console ; parcours navigateur tablette → téléphone (sondage lancé, vote, question, soutien, répondu, habillage) ; garde-fous API (limite par personne, revote, lien dans une question, 4e question en 2 min, thème et URL invalides).

## Hors périmètre de cette passe
- VPS de Nolan (178.16.130.4) : clé SSH toujours refusée, jeton Hostinger « Masen » refusé (401) sur toutes les variantes de lecture. Script prêt : `tools/vps/deployer.sh hôte domaine [clé]`.
- Test réel iPad et sortie sur le processeur LED du stand.
