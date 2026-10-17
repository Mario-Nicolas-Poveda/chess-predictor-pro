#!/usr/bin/env bash
# Requiere ENABLE_DEV_ROUTES=true en .env.local y supabase/seed_bots.sql aplicado
set -e
B=${B:-http://localhost:3000/api/v1}; J=$(mktemp); R=$RANDOM
j()  { curl -sS -H 'content-type: application/json' "$@"; echo; }
st() { curl -sS -o /dev/null -w '%{http_code}\n' "$@"; }

echo "== registrar jugador (ELO 1200)"
j -c $J -X POST $B/auth/register -d "{\"email\":\"pb$R@t.dev\",\"username\":\"pb_$R\",\"password\":\"Clave1234\"}"

echo "== 401 sin sesión";                    j  -X POST $B/dev/bots/queue -d '{"timeControl":"10+0"}'
echo "== 204 sacar bots (cola limpia)";      st -b $J -X DELETE $B/dev/bots/queue
echo "== 400 bot inexistente";               j  -b $J -X POST $B/dev/bots/queue -d '{"timeControl":"10+0","username":"bot_x"}'
echo "== 201 entra el más cercano (bot_sara)"; j -b $J -X POST $B/dev/bots/queue -d '{"timeControl":"10+0"}'
echo "== 409 el mismo bot otra vez";         j  -b $J -X POST $B/dev/bots/queue -d '{"timeControl":"10+0","username":"bot_sara"}'
echo "== 200 stats cuenta al bot";           j  -b $J $B/matchmaking/stats
echo "== 201 entrar a la cola";              j  -b $J -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}'
echo "== 200 emparejado con el bot";         S=$(curl -sS -b $J $B/matchmaking/status); echo "$S"
M=$(echo "$S" | sed -n 's/.*"match":{"id":"\([^"]*\)".*/\1/p')
echo "== 204 abandonar la partida";          st -b $J -X DELETE $B/matches/$M
rm -f $J
