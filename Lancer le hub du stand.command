#!/bin/zsh
# Double-cliquer pour démarrer le hub du stand Médiacom (Mac relié au Wi-Fi du stand).
cd "$(dirname "$0")" || exit 1

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js n'est pas installé sur ce Mac : https://nodejs.org (version LTS), puis relancez."
  read -k 1 "?Appuyez sur une touche pour fermer."
  exit 1
fi

# Empêche le Mac de se mettre en veille tant que le hub tourne
caffeinate -dimsu -w $$ &

( sleep 2 && open "http://localhost:3000/setup" ) &
echo "Hub Médiacom en cours de démarrage… (fermez cette fenêtre pour l'arrêter)"
exec node server.js
