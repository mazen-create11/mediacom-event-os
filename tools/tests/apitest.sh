B=localhost:3100
j() { curl -s -X "$1" "$B$2" -H 'Content-Type: application/json' ${3:+-d "$3"}; echo; }
j POST /api/words '{"text":"Gala"}'
j POST /api/words '{"text":"gala"}'
j POST /api/words '{"text":"www.spam.com"}'
j POST /api/words '{"text":"putain"}'
j POST /api/words '{"text":"Technique"}'
j GET /api/wall
j POST /api/leads '{"id":"ld-test0001","name":"Test Lead","company":"ACME","operator":"mazen","temperature":"hot","createdAt":1}' | head -c 160; echo
j POST /api/transfer '{"leadId":"ld-test0001","from":"mazen","to":"nolan","note":"devis"}' | head -c 200; echo
curl -s $B/api/export.csv; echo
j DELETE /api/leads/ld-test0001
j POST /api/words/clear '{}'
echo "--- non-staff via LAN IP:"
IP=$(ipconfig getifaddr en0); curl -s http://$IP:3100/api/state | head -c 100; echo
curl -s -X POST http://$IP:3100/api/words -H 'Content-Type: application/json' -d '{"text":"Concert"}'; echo
curl -s -X POST http://$IP:3100/api/words -H 'Content-Type: application/json' -d '{"text":"Festival"}'; echo
TOK=$(python3 -c "import json;print(json.load(open('$HOME/.gemini/antigravity/scratch/mediacom-event-app/data/config.json'))['token'])")
curl -s http://$IP:3100/api/state -H "x-stand-token: $TOK" | head -c 80; echo
curl -s -X POST localhost:3100/api/words/clear -H 'Content-Type: application/json' -d '{}'; echo
