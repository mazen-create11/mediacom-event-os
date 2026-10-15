#!/usr/bin/env bash
# Déploie le hub sur un VPS Debian/Ubuntu : Node (paquet de la distribution, 18+), service systemd, Caddy en HTTPS.
# Usage : bash tools/vps/deployer.sh root@178.16.130.4 salon.exemple.fr [chemin_cle_ssh]
# Rien n'est envoyé du dossier data/ (données personnelles). Le VPS sert la version publique :
# mots, sondage, questions et écran partagés ; les contacts restent dans chaque tablette.
set -euo pipefail
HOTE="${1:?hôte ssh, ex. root@178.16.130.4}"; DOMAINE="${2:?nom de domaine pointé sur le VPS}"; CLE="${3:-}"
SSH=(ssh -o BatchMode=yes -o ConnectTimeout=12); [ -n "$CLE" ] && SSH+=(-i "$CLE" -o IdentitiesOnly=yes)
cd "$(dirname "$0")/../.."
echo "→ Envoi des fichiers vers $HOTE:/opt/mediacom-event-os"
rsync -az --delete -e "${SSH[*]}" --exclude data --exclude _legacy --exclude _research --exclude _archive --exclude tools/node_modules --exclude .git ./ "$HOTE:/opt/mediacom-event-os/"
"${SSH[@]}" "$HOTE" bash -s "$DOMAINE" <<'REMOTE'
set -euo pipefail
DOMAINE="$1"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
command -v node >/dev/null || apt-get install -y -qq nodejs
command -v caddy >/dev/null || apt-get install -y -qq caddy
node -e 'const v=+process.versions.node.split(".")[0]; if (v<18) { console.error("Node "+v+" trop ancien : installer Node 18 ou plus"); process.exit(1); }'
id -u mediacom >/dev/null 2>&1 || useradd -r -m -d /var/lib/mediacom-event-os -s /usr/sbin/nologin mediacom
mkdir -p /var/lib/mediacom-event-os/data && chown -R mediacom:mediacom /var/lib/mediacom-event-os /opt/mediacom-event-os
cat > /etc/systemd/system/mediacom-event-os.service <<UNIT
[Unit]
Description=Médiacom Event OS (hub du stand)
After=network.target
[Service]
User=mediacom
WorkingDirectory=/opt/mediacom-event-os
Environment=PORT=3000 HTTPS=0 DATA_DIR=/var/lib/mediacom-event-os/data NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
UNIT
cat > /etc/caddy/Caddyfile <<CADDY
$DOMAINE {
  encode zstd gzip
  reverse_proxy 127.0.0.1:3000 {
    flush_interval -1
  }
}
CADDY
systemctl daemon-reload
systemctl enable --now mediacom-event-os
systemctl restart mediacom-event-os caddy
sleep 1
curl -fsS http://127.0.0.1:3000/api/health && echo
echo "✓ hub actif, jeton équipe :" && cat /var/lib/mediacom-event-os/data/config.json
REMOTE
echo "→ En ligne : https://$DOMAINE/ecran (écran) · https://$DOMAINE/nuage (visiteurs) · https://$DOMAINE/?t=JETON (tablettes)"
echo "  Renseigner https://$DOMAINE dans Pass › Adresse publique pour que les QR pointent sur le domaine."
