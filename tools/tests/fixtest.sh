B=localhost:3100
j() { curl -s -m 5 -X "$1" "$B$2" -H 'Content-Type: application/json' "${@:4}" ${3:+-d "$3"}; echo; }
echo "1. tunnel (X-Forwarded-For depuis localhost) -> staff attendu false :"; curl -s -m 5 $B/api/health -H 'X-Forwarded-For: 8.8.8.8'; echo; curl -s -m 5 -o /dev/null -w "   /api/state via tunnel : %{http_code}\n" $B/api/state -H 'X-Forwarded-For: 8.8.8.8'
curl -s -m 5 -o /dev/null -w "   Host public via localhost : %{http_code}\n" $B/api/state -H 'Host: stand.trycloudflare.com'
echo "2. modification partielle ne touche pas au suivi :"
j POST /api/leads '{"id":"ld-fix00001","name":"Test Fix","operator":"mazen","capturedBy":"mazen","temperature":"warm"}' >/dev/null
j POST /api/transfer '{"leadId":"ld-fix00001","from":"mazen","to":"nolan","note":"x"}' >/dev/null
j POST /api/leads '{"id":"ld-fix00001","temperature":"hot","operator":"mazen","transfer":null,"history":[]}' | python3 -c "import json,sys;l=json.load(sys.stdin)['lead'];print('   operator=',l['operator'],'| transfer.to=',l['transfer']['to'],'| history=',len(l['history']),'| temp=',l['temperature'])"
echo "3. suppression mémorisée -> 410 au rejeu :"; j DELETE /api/leads/ld-fix00001 >/dev/null; curl -s -m 5 -o /dev/null -w "   %{http_code}\n" -X POST $B/api/leads -H 'Content-Type: application/json' -d '{"id":"ld-fix00001","name":"zombie"}'
echo "4. mot masqué non rediffusé :"; (curl -s -N -m 4 $B/api/wall/stream > /tmp/mc_ws.txt &) ; sleep 0.5
W=$(curl -s -X POST $B/api/words -H 'Content-Type: application/json' -d '{"text":"Masqueur"}' | python3 -c "import json,sys;print(json.load(sys.stdin)['word']['id'])")
curl -s -o /dev/null -X POST $B/api/words/hide -H 'Content-Type: application/json' -d "{\"id\":\"$W\",\"hidden\":true}"
curl -s -o /dev/null -X POST $B/api/words -H 'Content-Type: application/json' -d '{"text":"masqueur"}'; sleep 3.6
echo "   événements 'word' reçus par le mur : $(grep -c '^event: word$' /tmp/mc_ws.txt) (attendu 1)"
echo "5. requêtes malformées répondues :"; curl -s -m 5 -o /dev/null -w "   /%%00 -> %{http_code}\n" "$B/%00"; printf 'GET / HTTP/1.1\r\nHost: [bad\r\n\r\n' | nc -w 3 localhost 3100 | head -1 | sed 's/^/   Host invalide -> /'
echo "6. CSV injection :"; j POST /api/leads '{"id":"ld-fix00002","name":"=HYPERLINK(\"x\")","phone":"+33 6 12","operator":"eric"}' >/dev/null; curl -s $B/api/export.csv | grep -a "HYPERLINK" | cut -c1-80 | sed 's/^/   /'; j DELETE /api/leads/ld-fix00002 >/dev/null
echo "7. QR Wi-Fi échappé : (vérifié côté client)"
echo "8. rotation du jeton :"; OLD=$(python3 -c "import json;print(json.load(open('data/config.json'))['token'])"); j POST /api/token/rotate '{"device":"x"}' | head -c 60; echo; NEW=$(python3 -c "import json;print(json.load(open('data/config.json'))['token'])"); IP=$(ipconfig getifaddr en0)
curl -s -o /dev/null -w "   ancien jeton -> %{http_code} (attendu 401)\n" "http://$IP:3100/api/state" -H "x-stand-token: $OLD"; curl -s -o /dev/null -w "   nouveau jeton -> %{http_code}\n" "http://$IP:3100/api/state" -H "x-stand-token: $NEW"
curl -s -o /dev/null -X POST $B/api/words/clear -H 'Content-Type: application/json' -d '{}'
