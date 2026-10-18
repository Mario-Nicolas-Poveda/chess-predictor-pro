#!/usr/bin/env bash
# Uso: bash scripts/lh.sh /dashboard/play desktop   |   bash scripts/lh.sh / mobile
# Requiere npm run build && npm start en otra terminal. Da la mediana de 3 corridas.
# Opcional: BASE=http://localhost:3200 (otro puerto) · TOKEN=<cpp_session> (sin la cuenta demo)
set -e
BASE=${BASE:-http://localhost:3000}
URL="$BASE$1"; MODE=${2:-desktop}; mkdir -p .lighthouse
if [ -z "$TOKEN" ]; then
  TOKEN=$(curl -s -c - -H 'content-type: application/json' -X POST "$BASE/api/v1/auth/login" \
    -d '{"email":"demo@chesspredictor.dev","password":"Demo1234"}' | awk '/cpp_session/ {print $7}')
fi
PRESET=""; [ "$MODE" = "desktop" ] && PRESET="--preset=desktop"
for i in 1 2 3; do
  npx -y lighthouse "$URL" $PRESET --only-categories=performance --quiet \
    --chrome-flags="--headless=new" --extra-headers "{\"Cookie\":\"cpp_session=$TOKEN\"}" \
    --output=json --output-path=".lighthouse/run-$i.json"
done
node -e '
const fs=require("fs");const r=[1,2,3].map(i=>JSON.parse(fs.readFileSync(`.lighthouse/run-${i}.json`)));
const med=a=>a.sort((x,y)=>x-y)[1];
const s=med(r.map(x=>x.categories.performance.score*100));
const tbt=med(r.map(x=>x.audits["total-blocking-time"].numericValue));
const lcp=med(r.map(x=>x.audits["largest-contentful-paint"].numericValue));
const cls=med(r.map(x=>x.audits["cumulative-layout-shift"].numericValue));
console.log(`rendimiento ${Math.round(s)} · TBT ${Math.round(tbt)} ms · LCP ${(lcp/1000).toFixed(2)} s · CLS ${cls.toFixed(3)}`);'
