#!/usr/bin/env bash
set -e
B=${B:-http://localhost:3000/api/v1}; J=$(mktemp); R=$RANDOM
j()  { curl -s -H 'content-type: application/json' "$@"; echo; }
st() { curl -s -o /dev/null -w '%{http_code}\n' "$@"; }
ply() { curl -s -b $J "$B/matches/$1/state" | grep -o '"ply":[0-9]*' | head -1; }
START='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1'

j -c $J -X POST $B/auth/register -d "{\"email\":\"ia$R@t.dev\",\"username\":\"ia_t$R\",\"password\":\"Clave1234\"}" >/dev/null

echo "== 200 niveles (recomendado)";            j -b $J $B/ai/levels | grep -o '"recommended":[0-9]'
echo "== 400 nivel 7";                          j -b $J -X POST $B/ai/games -d '{"level":7}'
echo "== 415 sin JSON";                         st -b $J -X POST $B/ai/games -d 'level=3'
echo "== 201 partida contra Alfil, con negras"
# -i: cabeceras y cuerpo en la misma salida (sin archivo temporal: el curl de Git Bash es de Windows)
H=$(curl -s -i -b $J -H 'content-type: application/json' -X POST $B/ai/games -d '{"level":3,"color":"black"}' | tr -d '\r')
echo "$H" | grep -iE '^HTTP|^location'
M=$(echo "$H" | sed -n 's/.*"state":{"id":"\([^"]*\)".*/\1/p'); echo "partida $M"
echo "== 409 otra sin terminar";                j -b $J -X POST $B/ai/games -d '{"level":1}' | grep -o '"code":"[A-Z_]*"\|"matchId":"[^"]*"'
echo "== la IA abre (máx. 5 s)"
for i in $(seq 1 10); do P=$(ply $M); [ "$P" = '"ply":1' ] && break; sleep 0.5; done; echo "$P"
echo "== 200 predicción + ETag";                curl -s -D - -o /dev/null -b $J $B/matches/$M/prediction | grep -iE '^HTTP|^etag'
E=$(curl -s -D - -o /dev/null -b $J $B/matches/$M/prediction | tr -d '\r' | sed -n 's/^[Ee][Tt]ag: *//p')
echo "== 304 predicción sin cambios";           st -b $J -H "If-None-Match: $E" $B/matches/$M/prediction
echo "== 409 nada que deshacer";                j -b $J -X DELETE "$B/matches/$M/moves/last?ply=1"
echo "== 201 tu jugada e5";                     st -b $J -H 'content-type: application/json' -X POST $B/matches/$M/moves -d '{"uci":"e7e5","ply":1}'
for i in $(seq 1 10); do P=$(ply $M); [ "$P" = '"ply":3' ] && break; sleep 0.5; done; echo "la IA respondió: $P"
echo "== 409 ply viejo";                        j -b $J -X DELETE "$B/matches/$M/moves/last?ply=2"
echo "== 204 deshacer";                         st -b $J -X DELETE "$B/matches/$M/moves/last?ply=3"
echo "== 400 ply=0";                            j -b $J -X DELETE "$B/matches/$M/moves/last?ply=0"
echo "== 405 GET en moves/last";                st -b $J "$B/matches/$M/moves/last"
echo "== 200 jugada sugerida";                  j -b $J -X POST $B/ai/move -d "{\"fen\":\"$START\",\"level\":2}"
echo "== 400 FEN roto";                         j -b $J -X POST $B/ai/move -d '{"fen":"hola","level":2}'
echo "== 422 posición de mate";                 j -b $J -X POST $B/ai/move -d '{"fen":"rnb1kbnr/pppp1ppp/8/4p3/6Pq/5P2/PPPPP2P/RNBQKBNR w KQkq - 1 3","level":2}'
echo "== 429 tras 30 jugadas sugeridas"
for i in $(seq 1 31); do C=$(st -b $J -H 'content-type: application/json' -X POST $B/ai/move -d "{\"fen\":\"$START\",\"level\":1}"); done; echo "$C"
curl -s -D - -o /dev/null -b $J -H 'content-type: application/json' -X POST $B/ai/move -d '{"fen":"8/8/8/8/8/8/8/K6k w - - 0 1","level":1}' | grep -i retry-after
echo "== 200 rendirse contra la IA (sin ELO)";  j -b $J -X POST $B/matches/$M/resign | grep -o '"rated":false\|"reason":"resign"'
echo "== 409 sin revancha contra la IA";        j -b $J -X POST $B/matches/$M/rematch | grep -o '"code":"[A-Z_]*"'
echo "== 401 sin sesión";                       j $B/ai/levels
rm -f $J
