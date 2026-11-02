# Latencia de la API

Toda respuesta con sesión lleva `Server-Timing: app;dur=<ms>`: lo que tardó el servidor. Se ve en DevTools → Network → Timing ("Server Timing").

## Cómo medir

```bash
npm run build && npm start
bash scripts/latency.sh /profile 30
bash scripts/latency.sh "/matches?limit=10" 30
B=https://chess-predictor-pro.vercel.app/api/v1 bash scripts/latency.sh /profile 30
```

Cada corrida crea un usuario `@t.dev`: se borra con `supabase/cleanup_test_users.sql`.

## Cómo leerlo

| Resultado | Qué significa |
|---|---|
| `app` alto y TTFB parecido | El tiempo se va en el servidor; casi siempre, las consultas a Supabase |
| `app` bajo y TTFB alto | Red o arranque en frío |

Antes de cambiar código por lentitud, mira **https://status.supabase.com**. El 25/10 hubo un incidente y se vieron de 1 a 2,5 s.

## Mediciones

31 de octubre de 2026, desde Colombia, 30 consultas por ruta, con Supabase en estado operativo. Tiempos en ms.

| Dónde corre la app | Ruta | TTFB p50 | TTFB p95 | `app` p50 | `app` p95 |
|---|---|---:|---:|---:|---:|
| Local (`npm start`) | `/profile` | 310 | 650 | 303 | 644 |
| Local (`npm start`) | `/matches?limit=10` | 842 | 2240 | 836 | 2233 |
| Vercel, `iad1` (v0.4.1) | `/profile` | 645 | 1665 | — | — |
| Vercel, `iad1` (v0.4.1) | `/matches?limit=10` | 646 | 1027 | — | — |

- **Local:** `app` es casi igual al TTFB, así que el tiempo se va en el viaje entre esta máquina y Supabase, y crece con cada consulta. Un 401, que no toca la BD, tardó 1,8 ms.
- **Vercel:** la versión medida todavía no trae la cabecera, así que no se puede separar red de servidor. Una respuesta que casi no toca la BD ya tarda de 330 a 400 ms desde aquí, porque `curl` abre una conexión nueva en cada consulta. Falta medirlo con `v0.5.0`.
- La cuenta de prueba no tiene partidas: `/matches` con historial hace más consultas (rivales e insignias del coach).
