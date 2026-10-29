#!/usr/bin/env bash
set -e
B=${B:-http://localhost:3000/api/v1}; J=$(mktemp); R=$RANDOM; T=$(mktemp -d)
# curl de Git Bash es de Windows: con -F file=@ necesita la ruta de Windows
command -v cygpath >/dev/null && T=$(cygpath -m "$T")
st() { curl -s -o /dev/null -w '%{http_code}\n' "$@"; }
curl -s -c $J -H 'content-type: application/json' -X POST $B/auth/register \
  -d "{\"email\":\"f$R@t.dev\",\"username\":\"f_$R\",\"password\":\"Clave1234\"}" >/dev/null
printf 'RIFF\x24\x00\x00\x00WEBPVP8 \x18\x00\x00\x00' > $T/a.webp; head -c 200 /dev/urandom >> $T/a.webp
{ printf 'RIFF\x24\x00\x00\x00WEBPVP8 '; head -c 1200000 /dev/zero; } > $T/big.webp
echo '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>' > $T/x.svg

echo "== 404 quitar sin foto";      st -b $J -X DELETE $B/profile/avatar
echo "== 415 sin multipart";        st -b $J -X PUT -H 'content-type: application/json' -d '{}' $B/profile/avatar
echo "== 400 sin archivo";          st -b $J -X PUT -F "otro=1" $B/profile/avatar
echo "== 415 svg";                  st -b $J -X PUT -F "file=@$T/x.svg;type=image/webp" $B/profile/avatar
echo "== 413 más de 1 MB";          st -b $J -X PUT -F "file=@$T/big.webp;type=image/webp" $B/profile/avatar
echo "== 201 primera foto";         curl -s -D - -o /dev/null -b $J -X PUT -F "file=@$T/a.webp;type=image/webp" $B/profile/avatar | grep -iE '^HTTP|^location'
echo "== 200 reemplazo";            st -b $J -X PUT -F "file=@$T/a.webp;type=image/webp" $B/profile/avatar
echo "== perfil con avatarUrl";     curl -s -b $J $B/profile | grep -o '"avatarUrl":"[^"]*"'
echo "== 204 quitar";               st -b $J -X DELETE $B/profile/avatar
echo "== 404 quitar otra vez";      st -b $J -X DELETE $B/profile/avatar
echo "== 401 sin sesión";           st -X DELETE $B/profile/avatar
rm -rf $J $T
