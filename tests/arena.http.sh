#!/usr/bin/env bash
set -e
B=${B:-http://localhost:3000/api/v1}; J1=$(mktemp); J2=$(mktemp); R=$RANDOM
j()  { curl -s -H 'content-type: application/json' "$@"; echo; }
st() { curl -s -o /dev/null -w '%{http_code}\n' "$@"; }

echo "== dos jugadores emparejados"
j -c $J1 -X POST $B/auth/register -d "{\"email\":\"a$R@t.dev\",\"username\":\"a_$R\",\"password\":\"Clave1234\"}" >/dev/null
j -c $J2 -X POST $B/auth/register -d "{\"email\":\"b$R@t.dev\",\"username\":\"b_$R\",\"password\":\"Clave1234\"}" >/dev/null
j -b $J1 -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}' >/dev/null
j -b $J2 -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}' >/dev/null
S=$(curl -s -b $J2 $B/matchmaking/status)
M=$(echo "$S" | sed -n 's/.*"match":{"id":"\([^"]*\)".*/\1/p'); echo "partida $M"
C=$(echo "$S" | sed -n 's/.*"yourColor":"\([a-z]*\)".*/\1/p')
if [ "$C" = "white" ]; then W=$J2; K=$J1; else W=$J1; K=$J2; fi     # W juega con blancas

echo "== 200 estado + ETag";            curl -s -D - -o /dev/null -b $W $B/matches/$M/state | grep -i etag
E=$(curl -s -D - -o /dev/null -b $W $B/matches/$M/state | tr -d '\r' | sed -n 's/^[Ee][Tt]ag: *//p')   # sin \r: el sed de Git Bash lo quita solo
echo "== 304 sin cambios";              st -b $W -H "If-None-Match: $E" $B/matches/$M/state
echo "== 409 negras en pending";        j -b $K -X POST $B/matches/$M/moves -d '{"uci":"e7e5","ply":0}'
echo "== 422 ilegal";                   j -b $W -X POST $B/matches/$M/moves -d '{"uci":"e2e5","ply":0}'
echo "== 400 uci mal escrita";          j -b $W -X POST $B/matches/$M/moves -d '{"uci":"e9","ply":0}'
echo "== 400 campo de más";             j -b $W -X POST $B/matches/$M/moves -d '{"uci":"e2e4","ply":0,"x":1}'
echo "== 415 sin JSON";                 st -b $W -X POST $B/matches/$M/moves -d 'uci=e2e4'
echo "== 201 e4 + Location";            curl -s -D - -o /dev/null -b $W -H 'content-type: application/json' -X POST $B/matches/$M/moves -d '{"uci":"e2e4","ply":0}' | grep -iE '^HTTP|^location'
echo "== 409 STALE_PLY";                j -b $W -X POST $B/matches/$M/moves -d '{"uci":"d2d4","ply":0}'
echo "== 409 abandonar ya no se puede"; j -b $W -X DELETE $B/matches/$M
echo "== 200 jugada guardada";          j -b $W $B/matches/$M/moves/1
echo "== 404 jugada que no existe";     j -b $W $B/matches/$M/moves/9
echo "== 201 ofrecer tablas";           st -b $W -X POST $B/matches/$M/draw-offer
echo "== 409 ofrecer otra vez";         j -b $K -X POST $B/matches/$M/draw-offer
echo "== 204 retirar la oferta";        st -b $W -X DELETE $B/matches/$M/draw-offer
echo "== mate del pastor"
for p in "K e7e5 1" "W f1c4 2" "K b8c6 3" "W d1h5 4" "K g8f6 5"; do set -- $p
  if [ $1 = W ]; then CK=$W; else CK=$K; fi
  st -b $CK -H 'content-type: application/json' -X POST $B/matches/$M/moves -d "{\"uci\":\"$2\",\"ply\":$3}"
done
echo "== 201 Dxf7#";                    j -b $W -X POST $B/matches/$M/moves -d '{"uci":"h5f7","ply":6}' | grep -o '"reason":"[a-z]*"'
echo "== 409 jugar tras el final";      j -b $K -X POST $B/matches/$M/moves -d '{"uci":"a7a6","ply":7}'
echo "== 409 rendirse tras el final";   j -b $K -X POST $B/matches/$M/resign
echo "== 404 sin oferta de tablas";     j -b $K -X DELETE $B/matches/$M/draw-offer
echo "== 404 sin oferta de revancha";   j -b $K -X DELETE $B/matches/$M/rematch
echo "== 202 revancha ofrecida";        st -b $K -X POST $B/matches/$M/rematch
echo "== 409 ya la pediste";            j -b $K -X POST $B/matches/$M/rematch
echo "== 201 el rival acepta";          curl -s -D - -o /dev/null -b $W -X POST $B/matches/$M/rematch | grep -iE '^HTTP|^location'
echo "== 200 historial";                j -b $W "$B/matches?limit=5"
echo "== 400 limit fuera";              j -b $W "$B/matches?limit=99"
echo "== 200 historia del perfil";      j -b $W "$B/profile/history?days=30"
echo "== 405 método no permitido";      st -b $W -X PUT $B/matches/$M/moves
# la revancha recién aceptada es una partida con ELO en juego (pending) en la posición inicial
echo "== 403 analizar tu partida con ELO"; j -b $W -X POST $B/ai/move -d '{"fen":"rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1","level":3}'
echo "== 403 predicción con ELO";       j -b $W $B/matches/$M/prediction
echo "== 403 tercero";                  J3=$(mktemp); j -c $J3 -X POST $B/auth/register -d "{\"email\":\"c$R@t.dev\",\"username\":\"c_$R\",\"password\":\"Clave1234\"}" >/dev/null; j -b $J3 $B/matches/$M/state
echo "== 401 sin sesión";               j $B/matches/$M/state
rm -f $J1 $J2 $J3
