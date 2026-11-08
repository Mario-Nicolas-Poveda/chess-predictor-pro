# Chess Predictor Pro

Ajedrez en línea con predicción y entrenador. Juegas contra personas (con ELO) o contra una IA de 6 niveles que te muestra la probabilidad de ganar jugada a jugada. Al terminar, el AI Coach analiza tu partida, y además hay ranking global y torneos de eliminación directa.

Proyecto de Programación Web 2026-2 · Universidad Popular del Cesar · **https://chess-predictor-pro.vercel.app**

## Qué hace
- **Cuentas:** registro e inicio de sesión con JWT en cookie `httpOnly`, o con Google (OAuth 2.0). Perfil con foto y preferencias.
- **Jugar sin cuenta:** un invitado entra con un botón y juega contra la IA (7 días). Lo demás lo ve con candado; al crear su cuenta conserva sus partidas. Acceso por ruta: [`docs/api/roles.md`](docs/api/roles.md).
- **Arena:** emparejamiento por ritmo (3+2, 5+0, 10+0), reloj del servidor, tablas, rendición, revancha y aviso en tiempo real (Supabase Realtime). Tablero 3D y 2D, y el estado llega en el primer HTML.
- **Contra la IA:** 6 niveles con un motor propio; predicción de ventaja, deshacer y salir sin registrar mientras no hayas jugado.
- **AI Coach:** precisión, errores (?!, ?, ??), momentos clave y consejos de un modelo de lenguaje configurable, con plantillas de respaldo. Plan con tus últimas partidas.
- **Ranking global:** solo personas y partidas con ELO entre personas. Ordena por ELO o victorias, busca y muestra tu puesto.
- **Torneos** de 4 u 8: inscripción, llave sembrada por ELO, W.O. si las blancas no juegan a tiempo, y la llave en vivo.

## Stack
Next.js (App Router) · TypeScript estricto · Tailwind v4 · Zod · Supabase (Postgres + Realtime + Storage) · JWT (jose) · OAuth 2.0 Google · Three.js · Vitest · Vercel.

## Arquitectura
Monolito modular con Clean Architecture. Cada módulo en `src/modules/<módulo>/` tiene:

| Capa | Qué va | Ejemplo |
|---|---|---|
| `domain` | reglas puras, sin dependencias | `tournaments/domain/bracket.ts` |
| `application` | casos de uso y puertos | `ranking/application/GetRanking.ts` |
| `infrastructure` | Supabase, motor, LLM, contratos Zod | `arena/infrastructure/SupabaseArenaRepository.ts` |
| `presentation` | `container.ts` (inyección), clientes de la API, componentes | `tournaments/presentation/controllers/container.ts` |

Módulos: `auth`, `dashboard`, `matchmaking`, `arena`, `ai-engine`, `coach`, `ranking`, `tournaments`. Las rutas de `src/app/api/v1/**` solo validan, llaman al caso de uso y responden.

Lo que tiene que ser atómico (jugadas, reloj, ELO, avance de la llave, W.O.) vive en funciones SQL con la fila bloqueada. El servidor usa la `service_role` y las tablas tienen RLS sin políticas, así que el navegador no puede leerlas.

## API
REST bajo `/api/v1`, con un cuerpo de error fijo `{ error: { code, message, fields?, meta? } }`. Usa ETag con 304 (comparación débil), `Location` en 201/202 y `Retry-After` en 429. Todos los códigos y cuándo salen: [`docs/api/codigos-http.md`](docs/api/codigos-http.md). Latencia medida: [`docs/api/latencia.md`](docs/api/latencia.md).

## Cómo correrlo
```bash
npm ci
cp .env.example .env.local   # PowerShell: Copy-Item .env.example .env.local · llena los valores
```
1. En un proyecto de Supabase, aplica en orden `supabase/migrations/0001_users.sql` … `0010_roles_invitado.sql` (SQL Editor).
2. Producción local:
   ```bash
   npm run build && npm start   # http://localhost:3000
   ```
   O `npm run dev` para desarrollo.
3. Checks: `npm run lint && npm run typecheck && npm test && npm run build`.

Después de clonar, activa el hook de commits una vez: `git config core.hooksPath .githooks`.

### Pruebas de punta a punta (Git Bash, con `npm start` corriendo)
| Script | Qué prueba |
|---|---|
| `tests/auth.http.sh` | registro, login, sesión, logout |
| `tests/matchmaking.http.sh` · `tests/arena.http.sh` | cola, partida, jugadas, tablas, revancha |
| `tests/ai.http.sh` | partida contra la IA, predicción, deshacer, salir sin registrar |
| `tests/coach.http.sh` | análisis en cola (202), polling con ETag, plan (`FULL=1`) |
| `tests/avatar.http.sh` | foto de perfil (413, 415) |
| `tests/tournament.http.sh` | ranking y un torneo de 4 completo (≈ 45 s) |
| `tests/roles.http.sh` | invitado: entrar, contra la IA, 403 `ACCOUNT_REQUIRED`, pasar a jugador, salir (401 `SESSION_EXPIRED`) |

`bots.http.sh` y `tournament.http.sh` necesitan `ENABLE_DEV_ROUTES=true` en `.env.local`. En Vercel no se define.

### Crear torneos reales
```bash
npx tsx --env-file=.env.local scripts/tournament.ts create "Copa" --size 8 --tc 3+2 --starts 2026-12-04T09:00:00-05:00
npx tsx --env-file=.env.local scripts/tournament.ts list
```

## Limpiar usuarios de prueba
Los scripts `tests/*.http.sh` crean usuarios (`@t.dev`, `@test.dev`) y torneos. Bórralos antes de cada demo con [`supabase/cleanup_test_users.sql`](supabase/cleanup_test_users.sql) en el SQL Editor:
1. Selecciona el bloque 1 (vista previa) y pulsa Run. `partidas_con_cuentas_reales` debe ser 0.
2. Corre el archivo completo y elige **Run without RLS**: el aviso "table without RLS" es por `test_users`, una tabla temporal que la API no puede ver. Si alguna prueba jugó contra una cuenta real, no borra nada.
3. Si la vista previa lista fotos, bórralas en Storage → `avatars`.

Los invitados no hace falta borrarlos: se borran al cerrar sesión o a los 7 días.

## Git Flow
Ramas, versiones, commits y PRs: [docs/git-flow.md](docs/git-flow.md). Historial: [CHANGELOG.md](CHANGELOG.md).

## Equipo
- Mario Poveda · Dev 1 · Backend: API, base de datos, autenticación, CI y releases
- Jose · Dev 2 · Frontend: UI, landing 3D, arena y dashboard
