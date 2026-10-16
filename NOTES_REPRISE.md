# Médiacom Event OS : notes de reprise (16/10/2026)

## Passe du 16/10/2026 (seconde lecture des vocaux ; rapport `docs/rapports/2026-10-16/RAPPORT.md`)
- **Sessions** : `db.session` / `db.sessions`, routes `/api/session/new`, `/api/sessions[/live|/:id|/:id/export.csv]`, module 04 de l'onglet Écran, mode local dans `localStorage mc_sessions`. Démo en ligne : clés `session`, `sessions`, `screens`, `settings` dans la table `kv` (pas de nouvelle table).
- **Rapport** `/rapport` (`rapport.html`, `js/rapport.js`, `css/rapport.css`) : jeton du hub dans l'URL (`withToken`), sinon démo en ligne, sinon cache de la tablette.
- **Écran surveillé** : `POST /api/screen/ping` toutes les 5 s depuis `/ecran` (mémoire serveur, purge 20 s), état dans `#mw-screen` ; Wake Lock ; cache `mc_ecran_last` ; lanceurs `tools/ecran/`.
- **Nuage** : `wall.cloudLayout` `centre` (défaut) ou `haut` ; `titleRect()` réservé dans la spirale de `place()`.
- **Book** : `settings.bookHide / bookShow`, `setBookOverrides()` dans `data.js`, `publicWall().book` pour l'écran, module 03 du Pass.
- Piège : `networkidle` de Playwright ne se déclenche jamais sur `/ecran` (SSE + pings), attendre `load`.
- Session en ligne renommée « Démo SBE Marseille », jeu de démo rechargé (10 mots, sondage, 2 questions).
- **Navigation** (`fc47d95`, `0f98688`) : flèche « page précédente » dans l'en-tête, historique `pushState`, Échap = retour, défilement restitué au retour.
- **MediaScène 3D refaite** (`335d622`, agent Opus 5.5, `public/js/views/scene.js` seul) : géométrie par taille d'après les fiches 07-docs, la note de calcul et mediascene.eu (60 : 9,08 × 6,58, plancher 1,05, toit 4,87 ; 3-en-1 : 12,30 × 6,86/8,11/9,36, plancher 1,45, toit 7,97 compté depuis le sol ; 160 : 13,50 × 10,50, plancher 1,20, toit 8 m). Remorque fermée blanche (60) ou semi noire, déploiement 12 s en 6 phases (calage, ailes de toit, planchers, colonnes, poteaux/garde-corps/escalier, bâches/son/lumière). À valider par Nolan : 7,97 m depuis le sol ou le plancher ; cinématique de la 160 (interprétée) ; poteaux de la 60 (tubes alu ou treillis noir). Étiquette `v2026-10-16b`.

## Passe du 15/10/2026 (retour de Nolan, 3 vocaux du 13/10 ; rapport `docs/rapports/2026-10-15/RAPPORT.md`)
- Sorties d'écran dédiées : `/ecran` (suit la tablette), `/ecran/<scène>` figées, sortie pure sans bandeau. Nolan alimente le mur par un boîtier de commutation : une adresse par entrée.
- Activités : nuage, **sondage**, **questions** (votes des participants), page **externe** (son outil), habillage sobre / lumière / couleur / dégradé / photo + logo client. Onglet « Mur LED » devenu « Écran » : aperçu plein cadre, un panneau par activité.
- Book et showreel en sélection séminaire ; 11 photos + triptyque d'Allauch en réserve (`sem: false`), interrupteur « Tout le book » dans Pass. MediaScène 160 m² ajoutée (Book, écran, 3D).
- Service worker réparé (`keyOf`, `clean` manquaient). Démo Cloudflare mise à jour (D1 : tables `wordsby`, `pvotes`, `questions`, `qvotes` ; `_redirects` vers `/mur` sans `.html`).
- Toujours bloqué : VPS de Nolan 178.16.130.4 (clé refusée) et jeton Hostinger « Masen » (401). Script prêt : `tools/vps/deployer.sh`.

## Historique : 12/10/2026

## État
Refonte complète livrée le 12/10/2026 (Claude Code). L'ancienne version est dans `_legacy/` et dans le premier commit git.

- DA « Régie de nuit » : l'app est un équipement de régie. Modules rack, touches d'exécuteur à LED (grandMA3), VU-mètre, tranches de console, faisceaux de lyres en fond, un seul accent bleu Médiacom `#3192ff`, rouge réservé aux contacts chauds. Jost (équivalent Futura du site) + JetBrains Mono, auto-hébergées. Références Pinterest : consoles de régie, plugins audio, UI bleu nuit (planches dans le scratchpad de la session, non conservées).
- Hub `server.js` sans dépendance : HTTP :3000 (visiteurs, mur), HTTPS :3443 (équipe, autorité de certification générée dans `data/certs/`), SSE temps réel, appairage par jeton, modération et limitation de débit des mots.
- Testé le 12/10 : 8 vues + mur (5 scènes) + pages téléphone, 0 erreur console ; parcours saisie → doublon → transfert Mazen → Coraline (toast + badge) ; charge 600 envois en 1,5 s avec 60 écrans abonnés, 0 perte ; HTTPS validé sur l'IP Wi-Fi.

## Passe du 12/10 après-midi
- Public visé : agences séminaires et événementielles. Profil et volume annuel à la saisie, filtre « Agences », démo et suggestions du mur adaptées.
- MediaScène : gamme 60 m² (remorque 3,5 t) et 3-en-1 80/100/120 m² (semi-remorque 26 t), chiffres relus dans `~/Desktop/prospection-podium-mobile/07-docs/`. Les fiches 70, 120 et 160 m² du même dossier ne sont pas reprises (hors gamme annoncée).
- Scène 3D MediaScène déployable, mur (scène MediaScène, message avec compte à rebours), Book à deux ouvertures, bilan `/bilan`, photos 2 880 px.

## En ligne (12/10, fin de journée)
- Démo : https://mediacom-event-os.pages.dev (Cloudflare Pages + D1, voir `functions/api/`). Code : https://github.com/mazen-create11/mediacom-event-os (public).
- Envois de mots illimités. Rapport complet : `docs/rapports/2026-10-12/RAPPORT.md`.

## Reste à faire
- Test réel sur iPad : installation du certificat, caméra (badge QR), ajout à l'écran d'accueil, son du carillon.
- Mur LED réel : vérifier la sortie 2:1 sur le processeur (Novastar) et la lisibilité à 5 m ; brancher `/ecran` sur l'entrée du boîtier de Nolan.
- Nolan : lui donner les liens `/ecran/...` (bouton « Liens de l'écran ») et, s'il garde son outil pour le nuage, coller son adresse dans la scène Externe.
- Vidéos de réalisations : aucune fournie (emplacement prêt dans le showreel du mur).
- Questions équipe : barème (Éric), consommations (Nolan), Wi-Fi du stand (SSID fixe ?), tunnel internet pour les visiteurs en 4G (`publicUrl` dans Pass).

## Pièges connus
- iOS : l'icône « écran d'accueil » a un stockage séparé de Safari ; le jeton reste donc dans l'URL (`?t=`) et dans le stockage local.
- Service worker, caméra en direct et presse-papiers exigent HTTPS de confiance sur iPad (sinon repli : appareil photo natif + lecture du QR sur la photo).
- `data/` contient des données personnelles : ne jamais le versionner ni l'envoyer.
