#!/bin/bash
# Ordinateur du mur LED (Mac) : ouvre la sortie écran en kiosque, plein écran, sans barre ni dialogue.
# 1. Remplacer URL par l'adresse du hub du stand (ex. http://192.168.1.20:3000/ecran) ou de la démo.
#    /ecran suit la tablette ; /ecran/noir, /ecran/sondage… restent figés.
# 2. Réglages › Économiseur d'écran et Batterie : jamais de veille écran quand il est branché.
# 3. Pour un lancement automatique : Réglages › Général › Ouverture, ajouter ce fichier.
URL="${1:-https://mediacom-event-os.pages.dev/ecran}"
PROFIL="$HOME/Library/Application Support/Mediacom-Ecran"

for APP in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge" "/Applications/Chromium.app/Contents/MacOS/Chromium"; do
  [ -x "$APP" ] && break
done
if [ ! -x "$APP" ]; then
  echo "Chrome ou Edge introuvable : ouvrez $URL dans Safari puis Présentation › Activer le mode plein écran."
  open "$URL"
  exit 0
fi

# caffeinate garde l'écran allumé tant que la fenêtre tourne
exec caffeinate -d "$APP" --kiosk --user-data-dir="$PROFIL" --no-first-run --noerrdialogs --disable-session-crashed-bubble --disable-infobars --autoplay-policy=no-user-gesture-required --overscroll-history-navigation=0 --disable-pinch "$URL"
