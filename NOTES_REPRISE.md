# Médiacom Event OS : notes de reprise (12/10/2026)

## État
Refonte complète livrée le 12/10/2026 (Claude Code). L'ancienne version est dans `_legacy/` et dans le premier commit git.

- DA « Régie de nuit » : l'app est un équipement de régie. Modules rack, touches d'exécuteur à LED (grandMA3), VU-mètre, tranches de console, faisceaux de lyres en fond, un seul accent bleu Médiacom `#3192ff`, rouge réservé aux contacts chauds. Jost (équivalent Futura du site) + JetBrains Mono, auto-hébergées. Références Pinterest : consoles de régie, plugins audio, UI bleu nuit (planches dans le scratchpad de la session, non conservées).
- Hub `server.js` sans dépendance : HTTP :3000 (visiteurs, mur), HTTPS :3443 (équipe, autorité de certification générée dans `data/certs/`), SSE temps réel, appairage par jeton, modération et limitation de débit des mots.
- Testé le 12/10 : 8 vues + mur (5 scènes) + pages téléphone, 0 erreur console ; parcours saisie → doublon → transfert Mazen → Coraline (toast + badge) ; charge 600 envois en 1,5 s avec 60 écrans abonnés, 0 perte ; HTTPS validé sur l'IP Wi-Fi.

## Reste à faire
- Test réel sur iPad : installation du certificat, caméra (badge QR), ajout à l'écran d'accueil, son du carillon.
- Mur LED réel : vérifier la sortie 2:1 sur le processeur (Novastar) et la lisibilité à 5 m.
- Vidéos de réalisations : aucune fournie (emplacement prêt dans le showreel du mur).
- Questions équipe : barème (Éric), consommations (Nolan), Wi-Fi du stand (SSID fixe ?), tunnel internet pour les visiteurs en 4G (`publicUrl` dans Pass).

## Pièges connus
- iOS : l'icône « écran d'accueil » a un stockage séparé de Safari ; le jeton reste donc dans l'URL (`?t=`) et dans le stockage local.
- Service worker, caméra en direct et presse-papiers exigent HTTPS de confiance sur iPad (sinon repli : appareil photo natif + lecture du QR sur la photo).
- `data/` contient des données personnelles : ne jamais le versionner ni l'envoyer.
