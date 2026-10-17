# Sprint 2 · Dev 1 · Mario · Backend · Matchmaking

> **Para Claude Code (en la máquina de Mario).** Lee primero `CLAUDE.md`, `docs/git-flow.md` y esta guía completa.
> Trabajas para **Mario**. Haz las fases **en orden**. Antes de cada fase revisa sus dependencias; al terminarla corre los checks, escribe los mensajes en `.pr/` y muestra el bloque **ACCIÓN DEL DEV**.
>
> **Reglas que no se rompen**
> 1. **Nunca** ejecutes `git commit`, `git push`, `git merge`, `git rebase`, `git tag`, `gh pr create`, `gh pr merge`, `gh pr review` ni `gh release create`. Los ejecuta Mario.
> 2. Escribe el mensaje del commit en `.pr/commit-<issue>.txt` y el del PR en `.pr/PR-<issue>.md`. Después avisa a Mario con el bloque ACCIÓN DEL DEV.
> 3. **Sin atribución:** nada de `Co-Authored-By`, "Generated with Claude Code" ni enlaces de sesión, ni en commits ni en PRs.
> 4. Pide "sí" antes de cualquier cambio en GitHub (milestone, issues, `gh issue develop`) o en Supabase.
> 5. No leas `.env` ni `.env.local`.

**Fechas:** lunes 26 → sábado 31 de octubre de 2026 · **Release:** `v0.2.0`
**Meta del sprint:**
1. Un usuario con sesión entra a "Jugar", elige ritmo, busca partida y queda emparejado con otro jugador disponible. Los dos ven "Partida encontrada" y la partida queda creada en la base de datos.
2. Cada usuario **personaliza su perfil** (tema, color de acento, pieza 3D, material, disposición del encabezado, orden y visibilidad de secciones) y eso **se guarda en su cuenta**.
3. La API responde siempre con el código HTTP correcto (200, 201, 204, 400, 401, 403, 404, 409, 415, 500, 503).

**Mario:** códigos HTTP y errores, tablas y emparejamiento en Postgres, API de matchmaking, bots de prueba, **API de preferencias del perfil**, release.
**Jose:** interfaz con escenas 3D (three.js) en login, perfil y Jugar, animaciones, personalización del perfil, optimización. Consume el contrato de §9. **No cambies el contrato sin avisar a Jose.**

**Diseño de referencia:** canvas "Sprint 2 · Vistas de referencia" (Login · tablero 3D, Perfil · personalizable, Jugar · búsqueda en 3D). Las preferencias de §6b salen del panel "Personalizar" de la vista de perfil.

---

## 0. Mapa del sprint

Los números de issue los asigna GitHub al crearlos (Fase 0). En esta guía van como `<N-…>`; Claude Code los reemplaza por los reales.

| Fase | Issue | Rama | Depende de | Al terminar, avisar a Jose |
|---|---|---|---|---|
| 0 | — | — | `v0.1.0` publicado y `main` sincronizado en `develop` | "Issues del Sprint 2 creados: los tuyos son …" |
| 1 | #24 | `feature/s2-24-errores-http` | Fase 0 | "Catálogo HTTP en develop. Los errores traen `code` estable." |
| 2 | #25 | `feature/s2-25-matchmaking-db` | Fase 1 MERGED | "**Contratos de matchmaking en develop.** Ya puedes importarlos." |
| 3 | #26 | `feature/s2-26-matchmaking-api` | Fase 2 MERGED | "**API de matchmaking en develop.** Apaga los mocks de Jugar." |
| 4 | #27 | `feature/s2-27-bots-dev` | Fase 3 MERGED | "Bots listos: ya puedes probar Jugar tú solo." |
| 5 | #28 | `feature/s2-28-preferencias-perfil` | Fase 1 MERGED (los contratos ya entraron en la Fase 2) | "**API de preferencias en develop.** Conecta el panel Personalizar." |
| 6 | — | — | — | Integración y revisión de PRs de Jose |
| 7 | #36 | `release/v0.2.0` | todo el Sprint 2 MERGED | "Release abierto: solo bugfix." |

Revisas los PRs de Jose del Sprint 2 (7 features). Los ubicas por rama con `gh pr list --search "review-requested:@me"`.

### Plan por días

| Día | Fecha | Mario | Jose (para saber qué esperar) |
|---|---|---|---|
| 1 | lun 26 oct | Fase 0 + Fase 1 (errores HTTP) | Movimiento base, cabecera, temas · kit 3D |
| 2 | mar 27 oct | Fase 2 (BD + contratos de matchmaking **y de preferencias**) | Kit 3D (PR) · Jugar 3D con mocks |
| 3 | mié 28 oct | Fase 3 (API matchmaking) | Login con tablero 3D |
| 4 | jue 29 oct | Fase 3 (tests y PR) + Fase 4 (bots) | Jugar con API real · perfil 3D animado |
| 5 | vie 30 oct | Fase 5 (preferencias) en la mañana · integración | Personalización conectada · landing |
| 6 | sáb 31 oct | Release `v0.2.0`, ensayo | Bugfix del release, ensayo |

Si el Sprint 1 cierra antes del 24, el Sprint 2 puede empezar antes: las features salen de `develop` aunque exista `release/v0.1.0`.

---

## 1. Protocolo de Claude Code (cada fase)

**Al empezar:**
```bash
git status                                                  # limpio
git fetch origin
gh pr view <rama-dependencia> --json state -q .state        # debe decir MERGED
gh pr list --search "review-requested:@me" --state open     # PRs de Jose esperando
```
- PRs de Jose esperando → avisar primero: "Jose espera tu revisión en <rama>". Ofrecer revisarlo (§1.1).
- Dependencia sin MERGED → **PARAR**:
  ```
  ⏸ ESPERANDO (Mario)
  Falta: <rama> de <quién> · estado: <OPEN/APPROVED/sin abrir>
  Mientras tanto puedes: <tarea sin esa dependencia>
  ```
- Todo bien → crear la rama vinculada al issue (pedir "sí"):
  ```bash
  git switch develop && git pull
  gh issue develop <N> --base develop --name <rama> --checkout
  ```

**Al terminar:**
1. `git fetch origin`. Si `origin/develop` avanzó → pedir a Mario que guarde su avance y sincronice:
   ```
   ──────── ACCIÓN DEL DEV (Mario) ────────
   Estado: develop cambió. Hay que traerlo a tu rama antes del PR.
   1) git add -A && git commit -F .pr/commit-<N>.txt
   2) git merge origin/develop          (conflictos → dime y te ayudo)
   Después: dime "listo" y repito los checks.
   ────────────────────────────────────────
   ```
2. `npm run lint && npm run typecheck && npm test && npm run build`. Si algo falla, arréglalo antes de avisar.
3. Escribir `.pr/commit-<N>.txt` y `.pr/PR-<N>.md` (plantilla `.github/pull_request_template.md`, con `Closes #<N>`).
4. Bloque:
   ```
   ──────── ACCIÓN DEL DEV (Mario) ────────
   Estado: <qué quedó listo> · lint, typecheck, test y build OK.
   1) Revisa:   git status && git diff --stat
   2) Commit:   git add -A && git commit -F .pr/commit-<N>.txt
   3) Push:     git push -u origin <rama>
   4) PR:       gh pr create --base develop --title "<título>" --body-file .pr/PR-<N>.md
   5) Avisa a Jose: "PR listo para revisión: <rama>"
   Después: cuando Jose apruebe y CI esté verde → gh pr merge <rama> --merge
            git switch develop && git pull
   ────────────────────────────────────────
   ```
5. Tras el merge: enviar a Jose el aviso de la tabla §0.

### 1.1 Revisar un PR de Jose
```bash
gh pr diff <n>
gh pr checks <n>
gh pr checkout <n> && npm ci && npm run dev     # si hay que probar
```
Escribe `.pr/review-<n>.md` con: qué está bien, qué cambiar (archivo:línea), si rompe el contrato §9, si hay llamadas a la API con códigos mal manejados. Mario publica:
`gh pr review <n> --approve --body-file .pr/review-<n>.md` (o `--request-changes`).

---

## 2. Fase 0 · Preparar el Sprint 2 en GitHub

**Depende de:** release `v0.1.0` cerrado.
```bash
git fetch origin --tags
git tag -l v0.1.0                                   # debe existir
gh pr list --base develop --head main --state merged --limit 1   # back-merge main→develop hecho
```
Si falta algo → PARAR y avisar a Mario (cerrar primero el Sprint 1, ver guía del Sprint 1 §7).

Con permiso, crear milestone e issues (`OWNER/REPO` = el real):
```bash
gh api -X POST repos/OWNER/REPO/milestones \
  -f title="Sprint 2 · Matchmaking" \
  -f description="26–31 oct 2026. Cola, emparejamiento, Partida encontrada, códigos HTTP, animaciones e interacción. Release v0.2.0." \
  -f due_on="2026-11-01T04:59:00Z"
```

Crear **en este orden** (los números salen consecutivos si nadie abre PRs mientras tanto). Cuerpo de cada issue: rama, guía (`docs/sprints/sprint-2/<archivo>.md · fase <n>`), dependencias y "Hecho cuando" (sácalos de cada fase de las guías).

| Clave | Título | Assignee | Labels |
|---|---|---|---|
| `N-err` | Catálogo de códigos HTTP y errores tipados | Mario | dev:mario, area:backend, type:feature |
| `N-db` | Tablas de cola y partidas, emparejamiento en Postgres y contratos | Mario | dev:mario, area:backend, type:feature |
| `N-api` | API de matchmaking: entrar, estado, salir, partida | Mario | dev:mario, area:backend, type:feature |
| `N-bot` | Bots de prueba y estadísticas de la cola | Mario | dev:mario, area:backend, type:feature |
| `N-prefs` | API de preferencias del perfil (guardar, leer y restablecer) | Mario | dev:mario, area:backend, type:feature |
| `N-shell` | Movimiento base, cabecera nueva, temas y sistema visual v2 | Jose | dev:jose, area:frontend, type:feature |
| `N-3d` | Kit 3D compartido con three.js (piezas, tablero, escena, calidad) | Jose | dev:jose, area:frontend, type:feature |
| `N-play` | Jugar con escena 3D: elegir ritmo, buscando, partida encontrada | Jose | dev:jose, area:frontend, type:feature |
| `N-board` | Login y registro con tablero 3D interactivo | Jose | dev:jose, area:frontend, type:feature |
| `N-dash` | Perfil animado con pieza 3D y Elo bajo botón | Jose | dev:jose, area:frontend, type:feature |
| `N-custom` | Panel Personalizar del perfil conectado a la API | Jose | dev:jose, area:frontend, type:feature |
| `N-perf` | Optimización de la landing 3D | Jose | dev:jose, area:frontend, type:feature |
| `N-rel` | Release v0.2.0 | Mario | dev:mario, area:infra, type:release |

```bash
gh issue create -R OWNER/REPO --title "<título>" --assignee <usuario> \
  --label "<labels>" --milestone "Sprint 2 · Matchmaking" --body-file .pr/issue-s2-<clave>.md
```

Copiar las dos guías del Sprint 2 al repo (van en el PR de la Fase 1):
```bash
mkdir -p docs/sprints/sprint-2
# Mario indica la carpeta donde descargó los .md
cp "<carpeta>/SPRINT2_DEV1_MARIO_BACKEND.md" docs/sprints/sprint-2/
cp "<carpeta>/SPRINT2_DEV2_JOSE_FRONTEND.md" docs/sprints/sprint-2/
```
Avisar a Jose: "Issues del Sprint 2 creados. Los tuyos: 29, 30, 31, 32, 33, 34, 35."

---

## 3. Fase 1 · Catálogo de códigos HTTP y errores tipados (#24)

**Rama:** `feature/s2-24-errores-http` · **Depende de:** Fase 0

Regla del proyecto: cada respuesta usa el código que corresponde. Éxito sin cuerpo = **204**. Recurso inexistente = **404**. Hoy un JSON roto en el body termina en 500, y eso se corrige aquí.

### 3.1 Catálogo (se copia también en `docs/api/codigos-http.md`)

| Código | Cuándo | `error.code` |
|---|---|---|
| **200 OK** | GET correcto, PATCH correcto | — |
| **201 Created** | POST que crea algo (registro, entrar a la cola). Lleva cabecera `Location` | — |
| **204 No Content** | DELETE correcto, logout. **Sin cuerpo** | — |
| **400 Bad Request** | Datos que no pasan Zod · JSON mal formado · id con formato inválido | `VALIDATION_ERROR`, `INVALID_JSON` |
| **401 Unauthorized** | Sin sesión o JWT vencido | `UNAUTHORIZED` |
| **403 Forbidden** | Con sesión, pero sin permiso sobre ese recurso | `FORBIDDEN` |
| **404 Not Found** | El recurso no existe · ruta de API inexistente | `NOT_FOUND`, `NOT_IN_QUEUE`, `MATCH_NOT_FOUND`, `ROUTE_NOT_FOUND` |
| **405 Method Not Allowed** | Método no soportado en una ruta que existe (Next lo responde solo con cabecera `Allow`) | — |
| **409 Conflict** | Choca con el estado actual | `EMAIL_TAKEN`, `USERNAME_TAKEN`, `ALREADY_IN_QUEUE`, `ACTIVE_MATCH_EXISTS`, `MATCH_NOT_PENDING`, `CONFLICT` |
| **415 Unsupported Media Type** | Body que no es `application/json` en POST/PATCH | `UNSUPPORTED_MEDIA_TYPE` |
| **500 Internal Server Error** | Error no previsto (se registra con `console.error`, no se expone el detalle) | `INTERNAL` |
| **503 Service Unavailable** | La base de datos no responde (`/health`) | `SERVICE_UNAVAILABLE` |

Cuerpo de error, siempre igual:
```json
{ "error": { "code": "NOT_IN_QUEUE", "message": "No estás en la cola", "fields": {}, "meta": {} } }
```
`fields` (errores por campo) y `meta` (datos extra, por ejemplo `{ "matchId": "…" }`) son opcionales.

### 3.2 `src/core/shared/errors/AppError.ts` (reemplaza el actual)
```ts
export type ErrorFields = Record<string, string[]>;
export type ErrorMeta = Record<string, unknown>;

export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly fields?: ErrorFields,
    public readonly meta?: ErrorMeta,
  ) {
    super(message);
    this.name = new.target.name;
  }
}

export class ValidationError extends AppError {
  constructor(message = 'Datos inválidos', fields?: ErrorFields, code = 'VALIDATION_ERROR') { super(code, message, 400, fields); }
}
export class UnauthorizedError extends AppError {
  constructor(message = 'Sesión inválida o expirada') { super('UNAUTHORIZED', message, 401); }
}
export class ForbiddenError extends AppError {
  constructor(message = 'No tienes permiso para esto') { super('FORBIDDEN', message, 403); }
}
export class NotFoundError extends AppError {
  constructor(code = 'NOT_FOUND', message = 'No encontrado', meta?: ErrorMeta) { super(code, message, 404, undefined, meta); }
}
export class ConflictError extends AppError {
  constructor(code: string, message: string, fields?: ErrorFields, meta?: ErrorMeta) { super(code, message, 409, fields, meta); }
}
export class UnsupportedMediaTypeError extends AppError {
  constructor() { super('UNSUPPORTED_MEDIA_TYPE', 'El cuerpo debe ser JSON', 415); }
}
export class ServiceUnavailableError extends AppError {
  constructor(message = 'Servicio no disponible') { super('SERVICE_UNAVAILABLE', message, 503); }
}
```
Mantener compatibilidad: los `new AppError('EMAIL_TAKEN', …, 409, …)` del Sprint 1 siguen funcionando, pero pásalos a `ConflictError` en esta misma fase.

### 3.3 `src/core/shared/http/responses.ts`
```ts
import { NextResponse } from 'next/server';

export const ok = <T>(data: T, init?: ResponseInit) => NextResponse.json(data, { status: 200, ...init });

export const created = <T>(data: T, location: string) =>
  NextResponse.json(data, { status: 201, headers: { Location: location } });

export const noContent = () => new NextResponse(null, { status: 204 });
```

### 3.4 `src/core/shared/http/readJson.ts`: lee y valida el body en un solo paso
```ts
import type { NextRequest } from 'next/server';
import type { ZodType } from 'zod';
import { UnsupportedMediaTypeError, ValidationError } from '../errors/AppError';

export async function readJson<T>(req: NextRequest, schema: ZodType<T>): Promise<T> {
  const type = req.headers.get('content-type') ?? '';
  if (!type.toLowerCase().includes('application/json')) throw new UnsupportedMediaTypeError();
  let raw: unknown;
  try { raw = await req.json(); }
  catch { throw new ValidationError('El cuerpo no es un JSON válido', undefined, 'INVALID_JSON'); }
  return schema.parse(raw);     // ZodError → 400 en toErrorResponse
}
```
Reemplazar en todas las rutas del Sprint 1: `Schema.parse(await req.json())` → `await readJson(req, Schema)`.

### 3.5 `src/core/shared/errors/toErrorResponse.ts`
```ts
import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { AppError } from './AppError';

export function toErrorResponse(e: unknown) {
  if (e instanceof ZodError)
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos',
      fields: z.flattenError(e).fieldErrors } }, { status: 400 });
  if (e instanceof AppError)
    return NextResponse.json({ error: { code: e.code, message: e.message, fields: e.fields, meta: e.meta } },
      { status: e.status });
  console.error('[api] error no controlado', e);
  return NextResponse.json({ error: { code: 'INTERNAL', message: 'Error interno' } }, { status: 500 });
}
```

### 3.6 `withAuth` con parámetros de ruta (lo necesitan `/matches/[id]`)
```ts
import type { NextRequest } from 'next/server';
import { verifyToken, type Session } from './jwt';
import { readToken } from './session';
import { UnauthorizedError } from '../errors/AppError';
import { toErrorResponse } from '../errors/toErrorResponse';

type Ctx<P> = { params: Promise<P> };

export function withAuth<P = Record<string, never>>(
  handler: (req: NextRequest, session: Session, params: P) => Promise<Response>,
) {
  return async (req: NextRequest, ctx: Ctx<P>) => {
    try {
      const session = await verifyToken(readToken(req));
      if (!session) throw new UnauthorizedError();
      const params = ctx?.params ? await ctx.params : ({} as P);
      return await handler(req, session, params);
    } catch (e) { return toErrorResponse(e); }
  };
}
```
En Next 15+ `params` es una Promise, por eso el `await`.

### 3.7 404 en JSON para rutas de API que no existen
`src/app/api/v1/[...notFound]/route.ts`
```ts
import { NextResponse } from 'next/server';

const notFound = () =>
  NextResponse.json({ error: { code: 'ROUTE_NOT_FOUND', message: 'Esta ruta de la API no existe' } }, { status: 404 });

export { notFound as GET, notFound as POST, notFound as PATCH, notFound as PUT, notFound as DELETE };
```
Next da prioridad a las rutas concretas, así que este comodín solo atiende lo que no existe.

### 3.8 Nota sobre `cacheComponents`
El proyecto tiene `cacheComponents: true` en `next.config.ts`. Con eso **no** se permite `export const dynamic = …` en las rutas. Si `health/route.ts` lo tiene, quítalo y marca la ruta como dinámica así:
```ts
import { connection } from 'next/server';
export async function GET() {
  await connection();          // fuerza ejecución en cada request
  // …
}
```
Haz lo mismo en cualquier GET que no lea `req` (por ejemplo `/matchmaking/stats` si no usara sesión).

### 3.9 Tests (`src/core/shared/**/__tests__`)
- `toErrorResponse`: ZodError → 400 con `fields`; `NotFoundError` → 404; `ConflictError` con `meta` → 409 y `meta`; `Error` cualquiera → 500 sin filtrar el mensaje.
- `readJson`: sin content-type → 415; JSON roto → 400 `INVALID_JSON`; JSON válido que no cumple el schema → ZodError.
- `responses`: `noContent()` → status 204 y `await res.text() === ''`; `created()` lleva `Location`.

### 3.10 Cierre
`.pr/commit-24.txt`
```
feat(core): catálogo de códigos HTTP y errores tipados

- clases ValidationError, UnauthorizedError, ForbiddenError, NotFoundError,
  ConflictError, UnsupportedMediaTypeError y ServiceUnavailableError
- readJson: 415 si no es JSON y 400 INVALID_JSON si el cuerpo está roto
- helpers ok, created (con Location) y noContent (204 sin cuerpo)
- 404 ROUTE_NOT_FOUND en JSON para rutas de API inexistentes
- withAuth recibe los params de ruta
- docs/api/codigos-http.md y guías del sprint 2

Refs #24
```
Título del PR: `feat(core): catálogo de códigos HTTP y errores tipados`
En el PR, sección **Para Jose**: "Los errores ahora pueden traer `meta`. Ver tabla de códigos en `docs/api/codigos-http.md`."

---

## 4. Fase 2 · Base de datos y contratos de matchmaking (#25)

**Rama:** `feature/s2-25-matchmaking-db` · **Depende de:** Fase 1 MERGED

### 4.1 Diseño

- **Cola en Postgres, no en memoria.** En Vercel cada request puede caer en una instancia distinta, así que una cola en memoria no se comparte.
- **Emparejamiento atómico en una función SQL** (`mm_try_pair`). Usa un candado de transacción por ritmo (`pg_advisory_xact_lock`), así dos requests simultáneas nunca toman al mismo rival.
- **Aviso por polling.** El cliente consulta el estado cada ~2 s, y cada consulta marca al jugador como presente (`last_seen_at`) e intenta emparejarlo. Quien deja de consultar más de 15 s ya no cuenta para emparejar, y a los 60 s se borra.
- **Ventana de ELO que se amplía:** ±100 al empezar, +50 cada 10 s de espera, máximo ±400.

### 4.2 `supabase/migrations/0002_matchmaking.sql`
```sql
-- Cola de búsqueda: una fila por jugador buscando
create table public.matchmaking_queue (
  user_id      uuid primary key references public.users(id) on delete cascade,
  elo          int  not null,
  time_control text not null check (time_control in ('3+2', '5+0', '10+0')),
  is_bot       boolean not null default false,
  joined_at    timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);
create index matchmaking_queue_tc_elo_idx  on public.matchmaking_queue (time_control, elo);
create index matchmaking_queue_seen_idx    on public.matchmaking_queue (last_seen_at);

-- Partidas: el Sprint 3 (arena) agrega jugadas y resultado
create table public.matches (
  id           uuid primary key default gen_random_uuid(),
  white_id     uuid not null references public.users(id) on delete cascade,
  black_id     uuid not null references public.users(id) on delete cascade,
  time_control text not null check (time_control in ('3+2', '5+0', '10+0')),
  status       text not null default 'pending' check (status in ('pending', 'active', 'finished', 'aborted')),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint matches_distinct_players check (white_id <> black_id)
);
create index matches_white_status_idx on public.matches (white_id, status);
create index matches_black_status_idx on public.matches (black_id, status);
create trigger trg_matches_updated before update on public.matches
  for each row execute function public.touch_updated_at();

alter table public.matchmaking_queue enable row level security;
alter table public.matches           enable row level security;

-- Ventana de ELO según el tiempo esperado
create or replace function public.mm_window(waited interval)
returns int language sql immutable as $$
  select least(400, 100 + 50 * floor(extract(epoch from waited) / 10)::int)
$$;

-- Intenta emparejar a p_user. Devuelve el id de la partida creada o null.
create or replace function public.mm_try_pair(p_user uuid)
returns uuid language plpgsql as $$
declare
  me     public.matchmaking_queue%rowtype;
  rival  public.matchmaking_queue%rowtype;
  win    int;
  new_id uuid;
  w_id   uuid;
  b_id   uuid;
begin
  select * into me from public.matchmaking_queue where user_id = p_user;
  if not found then return null; end if;

  -- Un emparejamiento a la vez por ritmo
  perform pg_advisory_xact_lock(hashtext('mm:' || me.time_control));

  -- Releer con el candado tomado: otro proceso pudo emparejarlo ya
  select * into me from public.matchmaking_queue where user_id = p_user;
  if not found then return null; end if;

  update public.matchmaking_queue set last_seen_at = now() where user_id = p_user;
  win := public.mm_window(now() - me.joined_at);

  select q.* into rival
  from public.matchmaking_queue q
  where q.user_id <> p_user
    and q.time_control = me.time_control
    and (q.is_bot or q.last_seen_at > now() - interval '15 seconds')
    and abs(q.elo - me.elo) <= greatest(win, public.mm_window(now() - q.joined_at))
  order by abs(q.elo - me.elo), q.joined_at
  limit 1;

  if not found then return null; end if;

  if random() < 0.5 then w_id := me.user_id; b_id := rival.user_id;
  else                   w_id := rival.user_id; b_id := me.user_id; end if;

  insert into public.matches (white_id, black_id, time_control)
  values (w_id, b_id, me.time_control)
  returning id into new_id;

  delete from public.matchmaking_queue where user_id in (me.user_id, rival.user_id);
  return new_id;
end $$;

-- Limpia entradas abandonadas y bots viejos
create or replace function public.mm_cleanup()
returns void language sql as $$
  delete from public.matchmaking_queue
  where (not is_bot and last_seen_at < now() - interval '60 seconds')
     or (is_bot and joined_at < now() - interval '5 minutes');
$$;

-- Solo el backend (service_role) puede ejecutar estas funciones.
-- Sin esto, cualquiera con la anon key podría llamar mm_try_pair por la API REST de Supabase.
revoke execute on function public.mm_window(interval)  from public, anon, authenticated;
revoke execute on function public.mm_try_pair(uuid)    from public, anon, authenticated;
revoke execute on function public.mm_cleanup()         from public, anon, authenticated;
grant  execute on function public.mm_window(interval)  to service_role;
grant  execute on function public.mm_try_pair(uuid)    to service_role;
grant  execute on function public.mm_cleanup()         to service_role;
```
Mario la ejecuta en Supabase → SQL Editor. Claude Code no toca Supabase.

`supabase/seed_bots.sql` (no pueden iniciar sesión: `password_hash` null)
```sql
insert into public.users (email, username, password_hash, display_name, elo_rating)
values ('bot_ana@bots.local',  'bot_ana',  null, 'Ana (bot)',  1420),
       ('bot_luis@bots.local', 'bot_luis', null, 'Luis (bot)', 1510),
       ('bot_sara@bots.local', 'bot_sara', null, 'Sara (bot)', 1260)
on conflict do nothing;
```

### 4.3 Contratos Zod (los importa Jose: **solo zod, sin imports de servidor**)
`src/modules/matchmaking/infrastructure/dto/matchmakingSchemas.ts`
```ts
import { z } from 'zod';

export const TIME_CONTROLS = ['3+2', '5+0', '10+0'] as const;
export const TimeControlSchema = z.enum(TIME_CONTROLS);
export type TimeControl = z.infer<typeof TimeControlSchema>;

export const TIME_CONTROL_LABEL: Record<TimeControl, { label: string; kind: 'Blitz' | 'Rápida' }> = {
  '3+2':  { label: '3 + 2',  kind: 'Blitz' },
  '5+0':  { label: '5 + 0',  kind: 'Blitz' },
  '10+0': { label: '10 + 0', kind: 'Rápida' },
};

export const JoinQueueSchema = z.object({ timeControl: TimeControlSchema }).strict();
export type JoinQueueInput = z.infer<typeof JoinQueueSchema>;

export const MatchIdSchema = z.uuid('Id de partida inválido');

export type PlayerSummary = { id: string; username: string; displayName: string | null; avatarUrl: string | null; elo: number };

export type MatchSummary = {
  id: string;
  timeControl: TimeControl;
  status: 'pending' | 'active' | 'finished' | 'aborted';
  createdAt: string;
  yourColor: 'white' | 'black';
  you: PlayerSummary;
  opponent: PlayerSummary;
};

export type MatchmakingStatus =
  | { state: 'idle' }
  | { state: 'searching'; timeControl: TimeControl; joinedAt: string; waitedSeconds: number;
      elo: number; eloRange: { min: number; max: number }; searchingNow: number; pollAfterMs: number }
  | { state: 'matched'; match: MatchSummary };

export type QueueStats = { searching: Record<TimeControl, number>; total: number };
```

**Contratos de preferencias del perfil** (van en este mismo PR para que Jose construya el panel "Personalizar" desde el día 2; la API llega en la Fase 5).
`src/modules/dashboard/infrastructure/dto/preferencesSchemas.ts`
```ts
import { z } from 'zod';

export const THEMES = ['pergamino', 'noche', 'salvia', 'pizarra'] as const;
export const ACCENTS = ['vino', 'laton', 'bosque', 'oceano', 'tinta'] as const;
export const PROFILE_PIECES = ['k', 'q', 'r', 'b', 'n', 'p'] as const;          // rey, dama, torre, alfil, caballo, peón
export const PIECE_MATERIALS = ['w', 'b', 'a'] as const;                       // marfil, ébano, color del acento
export const HERO_LAYOUTS = ['clasico', 'invertido', 'pieza'] as const;        // nombre·pieza·ELO | ELO·pieza·nombre | pieza·nombre·ELO
export const SECTION_IDS = ['rend', 'elo', 'forma', 'next'] as const;          // Rendimiento, Evolución de Elo, Últimas partidas, Siguiente partida

const unique = <T>(a: readonly T[]) => new Set(a).size === a.length;

export const ProfilePreferencesSchema = z.object({
  theme: z.enum(THEMES),
  accent: z.enum(ACCENTS),
  piece: z.enum(PROFILE_PIECES),
  material: z.enum(PIECE_MATERIALS),
  heroLayout: z.enum(HERO_LAYOUTS),
  sectionOrder: z.array(z.enum(SECTION_IDS)).length(SECTION_IDS.length)
    .refine(unique, 'Cada sección debe aparecer una sola vez'),
  hiddenSections: z.array(z.enum(SECTION_IDS)).max(SECTION_IDS.length - 1, 'Deja al menos una sección visible')
    .refine(unique, 'Sección repetida'),
}).strict();

export type ProfilePreferences = z.infer<typeof ProfilePreferencesSchema>;

export const DEFAULT_PREFERENCES: ProfilePreferences = {
  theme: 'pergamino', accent: 'vino', piece: 'k', material: 'w', heroLayout: 'clasico',
  sectionOrder: ['rend', 'elo', 'forma', 'next'], hiddenSections: [],
};
```
Y en `profileSchemas.ts` (Sprint 1), el tipo `Profile` suma un campo:
```ts
import type { ProfilePreferences } from './preferencesSchemas';
export type Profile = { /* …lo del Sprint 1… */ preferences: ProfilePreferences };
```

### 4.4 Tests
`matchmakingSchemas.test.ts`: `JoinQueueSchema` rechaza `'1+0'` y campos extra; `MatchIdSchema` rechaza `'abc'`.
`preferencesSchemas.test.ts`: `DEFAULT_PREFERENCES` es válido · `sectionOrder` con repetidos → error · `hiddenSections` con las 4 → error · tema inexistente → error · campo extra → error.

### 4.5 Cierre
`.pr/commit-25.txt`
```
feat(db): tablas de cola y partidas con emparejamiento atómico en postgres

- matchmaking_queue y matches con RLS y sin policies
- mm_try_pair con advisory lock por ritmo y ventana de ELO creciente
- mm_cleanup para entradas abandonadas; execute solo para service_role
- seed de bots sin contraseña
- contratos zod y tipos de matchmaking para backend y frontend
- contratos de preferencias del perfil (tema, acento, pieza, material, encabezado, secciones)

Refs #25
```
Título del PR: `feat(db): cola, partidas y contratos de matchmaking y preferencias`
**Para Jose:** "Contratos en `src/modules/matchmaking/infrastructure/dto/matchmakingSchemas.ts` y `src/modules/dashboard/infrastructure/dto/preferencesSchemas.ts`. Importa tipos, `TIME_CONTROL_LABEL` y `DEFAULT_PREFERENCES` de ahí."

---

## 5. Fase 3 · API de matchmaking (#26)

**Rama:** `feature/s2-26-matchmaking-api` · **Depende de:** Fase 2 MERGED

### 5.1 Estructura (módulo nuevo, Clean Architecture)
```text
src/modules/matchmaking/
  domain/
    QueueEntry.ts              # { userId, elo, timeControl, joinedAt, lastSeenAt, isBot }
    Match.ts                   # entidad + canBeAbortedBy(userId)
    eloWindow.ts               # misma regla que mm_window, para mostrarla en la UI
    MatchmakingRepository.ts   # puerto (interfaz)
    PlayerDirectory.ts         # puerto: datos públicos de jugadores (sin depender del módulo dashboard)
  application/
    JoinQueue.ts
    LeaveQueue.ts
    GetMatchmakingStatus.ts
    GetMatch.ts
    AbortMatch.ts
    GetQueueStats.ts
  infrastructure/
    SupabaseMatchmakingRepository.ts
    SupabasePlayerDirectory.ts
    dto/matchmakingSchemas.ts  # (Fase 2)
  presentation/controllers/
    container.ts               # inyección de dependencias
src/app/api/v1/
  matchmaking/queue/route.ts   # POST (entrar) · DELETE (salir)
  matchmaking/status/route.ts  # GET
  matchmaking/stats/route.ts   # GET
  matches/[id]/route.ts        # GET · DELETE (abandonar partida pendiente)
```

### 5.2 Dominio
```ts
// domain/eloWindow.ts
export const eloWindow = (waitedSeconds: number) => Math.min(400, 100 + 50 * Math.floor(waitedSeconds / 10));

// domain/MatchmakingRepository.ts
import type { TimeControl, MatchSummary } from '../infrastructure/dto/matchmakingSchemas';
export interface QueueEntry { userId: string; elo: number; timeControl: TimeControl; joinedAt: Date; lastSeenAt: Date; isBot: boolean }
export interface MatchRecord { id: string; whiteId: string; blackId: string; timeControl: TimeControl;
  status: MatchSummary['status']; createdAt: Date }

export interface MatchmakingRepository {
  findEntry(userId: string): Promise<QueueEntry | null>;
  enqueue(entry: Pick<QueueEntry, 'userId' | 'elo' | 'timeControl' | 'isBot'>): Promise<QueueEntry>;
  dequeue(userId: string): Promise<boolean>;                 // true si borró algo
  tryPair(userId: string): Promise<string | null>;           // rpc mm_try_pair
  cleanup(): Promise<void>;                                  // rpc mm_cleanup
  countSearching(): Promise<Record<TimeControl, number>>;
  findOpenMatchFor(userId: string): Promise<MatchRecord | null>;  // pending (< 10 min) o active
  findMatch(id: string): Promise<MatchRecord | null>;
  setMatchStatus(id: string, status: MatchRecord['status']): Promise<void>;
}

// domain/PlayerDirectory.ts
import type { PlayerSummary } from '../infrastructure/dto/matchmakingSchemas';
export interface PlayerDirectory { get(id: string): Promise<PlayerSummary | null>; getMany(ids: string[]): Promise<PlayerSummary[]> }
```
"Partida abierta" = `status = 'active'`, o `status = 'pending'` creada hace menos de 10 minutos. Así una partida pendiente olvidada no bloquea al usuario para siempre.

### 5.3 Casos de uso (reglas y códigos)

| Caso de uso | Regla | Resultado |
|---|---|---|
| `JoinQueue(userId, tc)` | Si tiene partida abierta → `ConflictError('ACTIVE_MATCH_EXISTS', 'Ya tienes una partida en curso', undefined, { matchId })` | 409 |
| | Si ya está en la cola → `ConflictError('ALREADY_IN_QUEUE', 'Ya estás buscando partida')` | 409 |
| | Lee su ELO con `PlayerDirectory`; si no existe → `NotFoundError()` | 404 |
| | `enqueue` → devuelve el estado `searching` | **201** + `Location: /api/v1/matchmaking/status` |
| `LeaveQueue(userId)` | `dequeue` borró → **204**; no estaba → `NotFoundError('NOT_IN_QUEUE', 'No estás en la cola')` | 204 / 404 |
| `GetMatchmakingStatus(userId)` | `cleanup()` · partida abierta → `matched` · en cola → `tryPair`; si hay id → `matched`, si no → `searching` · si no → `idle` | 200 |
| `GetMatch(userId, id)` | No existe → `NotFoundError('MATCH_NOT_FOUND', 'La partida no existe')` · no es jugador → `ForbiddenError('No participas en esta partida')` | 200 / 404 / 403 |
| `AbortMatch(userId, id)` | 404 / 403 igual que arriba · `status !== 'pending'` → `ConflictError('MATCH_NOT_PENDING', 'Solo se puede abandonar una partida que no ha empezado')` · OK → `aborted` | **204** / 404 / 403 / 409 |
| `GetQueueStats()` | Conteo por ritmo de jugadores presentes (últimos 15 s o bots) | 200 |

`GetMatchmakingStatus` en estado `searching` devuelve:
```ts
{ state: 'searching', timeControl, joinedAt: entry.joinedAt.toISOString(),
  waitedSeconds, elo: entry.elo,
  eloRange: { min: entry.elo - eloWindow(waitedSeconds), max: entry.elo + eloWindow(waitedSeconds) },
  searchingNow: stats[timeControl], pollAfterMs: 2000 }
```

Para armar `MatchSummary` desde un `MatchRecord`: `yourColor` = `'white'` si `whiteId === userId`. `you` y `opponent` salen de `PlayerDirectory.getMany([whiteId, blackId])`.

### 5.4 Infraestructura
`SupabaseMatchmakingRepository` (fragmentos clave):
```ts
async tryPair(userId: string) {
  const { data, error } = await supabaseAdmin.rpc('mm_try_pair', { p_user: userId });
  if (error) throw error;
  return (data as string | null) ?? null;
}

async enqueue(e) {
  const { data, error } = await supabaseAdmin.from('matchmaking_queue')
    .insert({ user_id: e.userId, elo: e.elo, time_control: e.timeControl, is_bot: e.isBot })
    .select('*').single();
  if (error?.code === '23505') throw new ConflictError('ALREADY_IN_QUEUE', 'Ya estás buscando partida');
  if (error) throw error;
  return mapEntry(data);
}

async dequeue(userId: string) {
  const { data, error } = await supabaseAdmin.from('matchmaking_queue')
    .delete().eq('user_id', userId).select('user_id');
  if (error) throw error;
  return (data?.length ?? 0) > 0;
}

async findOpenMatchFor(userId: string) {
  // La regla "partida abierta" vive en SQL (mm_open_match) para no duplicarla
  const { data, error } = await supabaseAdmin.rpc('mm_open_match', { p_user: userId });
  if (error) throw error;
  const row = Array.isArray(data) ? data[0] : data;
  return row ? mapMatch(row) : null;
}

async countSearching() {
  const since = new Date(Date.now() - 15_000).toISOString();
  const { data, error } = await supabaseAdmin.from('matchmaking_queue')
    .select('time_control').or(`is_bot.eq.true,last_seen_at.gt.${since}`);
  if (error) throw error;
  const out = { '3+2': 0, '5+0': 0, '10+0': 0 } as Record<TimeControl, number>;
  for (const r of data ?? []) out[r.time_control as TimeControl]++;
  return out;
}
```
`userId` sale siempre del JWT, nunca del body.

Agregar a `0002_matchmaking.sql` (antes de los `revoke`):
```sql
-- Partida abierta de un jugador: activa, o pendiente de menos de 10 minutos
create or replace function public.mm_open_match(p_user uuid)
returns setof public.matches language sql stable as $$
  select * from public.matches
  where (white_id = p_user or black_id = p_user)
    and (status = 'active' or (status = 'pending' and created_at > now() - interval '10 minutes'))
  order by created_at desc
  limit 1;
$$;
revoke execute on function public.mm_open_match(uuid) from public, anon, authenticated;
grant  execute on function public.mm_open_match(uuid) to service_role;
```

`SupabasePlayerDirectory`: `select id, username, display_name, avatar_url, elo_rating from users where id in (...)`.

### 5.5 Rutas
```ts
// src/app/api/v1/matchmaking/queue/route.ts
export const POST = withAuth(async (req, s) => {
  const { timeControl } = await readJson(req, JoinQueueSchema);
  const status = await joinQueue.execute(s.userId, timeControl);
  return created(status, '/api/v1/matchmaking/status');
});

export const DELETE = withAuth(async (_req, s) => {
  await leaveQueue.execute(s.userId);          // lanza NotFoundError si no estaba
  return noContent();                          // 204 sin cuerpo
});

// src/app/api/v1/matchmaking/status/route.ts
export const GET = withAuth(async (_req, s) =>
  ok(await getStatus.execute(s.userId), { headers: { 'Cache-Control': 'no-store' } }));

// src/app/api/v1/matchmaking/stats/route.ts
export const GET = withAuth(async () =>
  ok(await getQueueStats.execute(), { headers: { 'Cache-Control': 'no-store' } }));

// src/app/api/v1/matches/[id]/route.ts
export const GET = withAuth<{ id: string }>(async (_req, s, { id }) => {
  const matchId = MatchIdSchema.parse(id);                  // 400 si no es uuid
  return ok({ match: await getMatch.execute(s.userId, matchId) });
});

export const DELETE = withAuth<{ id: string }>(async (_req, s, { id }) => {
  await abortMatch.execute(s.userId, MatchIdSchema.parse(id));
  return noContent();
});
```

### 5.6 Tests (repositorio en memoria, sin BD)
`src/modules/matchmaking/application/__tests__/matchmaking.test.ts`
- JoinQueue: OK devuelve `searching` · dos veces → 409 `ALREADY_IN_QUEUE` · con partida abierta → 409 `ACTIVE_MATCH_EXISTS` y `meta.matchId`.
- LeaveQueue: estaba → resuelve · no estaba → 404 `NOT_IN_QUEUE`.
- GetStatus: `idle` · `searching` con `eloRange` correcto a los 0 s, 10 s y 90 s (100, 150, 400) · `matched` cuando `tryPair` devuelve id.
- GetMatch: 404 · 403 para un tercero · `yourColor` correcto para cada jugador.
- AbortMatch: 204 en `pending` · 409 en `active` · 403 para un tercero.
- `eloWindow`: 0 → 100, 9 → 100, 10 → 150, 200 → 400.

### 5.7 Script `tests/matchmaking.http.sh` (Git Bash)
```bash
#!/usr/bin/env bash
set -e
B=${B:-http://localhost:3000/api/v1}; J1=$(mktemp); J2=$(mktemp); R=$RANDOM
j()  { curl -s -H 'content-type: application/json' "$@"; echo; }
st() { curl -s -o /dev/null -w '%{http_code}\n' "$@"; }

echo "== registrar dos jugadores"
j -c $J1 -X POST $B/auth/register -d "{\"email\":\"p1$R@t.dev\",\"username\":\"p1_$R\",\"password\":\"Clave1234\"}"
j -c $J2 -X POST $B/auth/register -d "{\"email\":\"p2$R@t.dev\",\"username\":\"p2_$R\",\"password\":\"Clave1234\"}"

echo "== 415 sin JSON";              st -b $J1 -X POST $B/matchmaking/queue -d 'timeControl=10+0'
echo "== 400 JSON roto";             j  -b $J1 -X POST $B/matchmaking/queue -d '{malo'
echo "== 400 ritmo inválido";        j  -b $J1 -X POST $B/matchmaking/queue -d '{"timeControl":"1+0"}'
echo "== 404 salir sin estar";       st -b $J1 -X DELETE $B/matchmaking/queue
echo "== 201 p1 entra";              j  -b $J1 -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}'
echo "== 409 p1 entra otra vez";     j  -b $J1 -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}'
echo "== 200 p1 buscando";           j  -b $J1 $B/matchmaking/status
echo "== 201 p2 entra";              j  -b $J2 -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}'
echo "== 200 p2 emparejado";         S=$(curl -s -b $J2 $B/matchmaking/status); echo "$S"
M=$(echo "$S" | sed -n 's/.*"match":{"id":"\([^"]*\)".*/\1/p')
echo "== 200 p1 ve la misma partida"; j -b $J1 $B/matches/$M
echo "== 400 id inválido";           j  -b $J1 $B/matches/abc
echo "== 404 partida inexistente";   j  -b $J1 $B/matches/00000000-0000-4000-8000-000000000000
echo "== 409 entrar con partida abierta"; j -b $J1 -X POST $B/matchmaking/queue -d '{"timeControl":"10+0"}'
echo "== 204 p1 abandona";           st -b $J1 -X DELETE $B/matches/$M
echo "== 409 abandonar otra vez";    j  -b $J2 -X DELETE $B/matches/$M
echo "== 404 ruta inexistente";      j  -b $J1 $B/no-existe
echo "== 401 sin sesión";            j  $B/matchmaking/status
rm -f $J1 $J2
```

### 5.8 Cierre
`.pr/commit-26.txt`
```
feat(matchmaking): entrar, consultar, salir y ver partida con códigos http correctos

- casos de uso JoinQueue, LeaveQueue, GetMatchmakingStatus, GetMatch, AbortMatch, GetQueueStats
- POST /matchmaking/queue 201 + Location, DELETE 204 o 404
- GET /matchmaking/status con ventana de ELO y pollAfterMs
- GET y DELETE /matches/:id con 400, 403, 404 y 409
- tests con repositorio en memoria y script de prueba de punta a punta

Refs #26
```
Título del PR: `feat(matchmaking): API de cola y partida encontrada`
**Para Jose:** "API lista según el contrato (§14 de tu guía). Apaga `NEXT_PUBLIC_API_MOCK` para Jugar. Prueba con dos navegadores (uno en incógnito) y dos cuentas."

---

## 6. Fase 4 · Bots de prueba y estadísticas (#27)

**Rama:** `feature/s2-27-bots-dev` · **Depende de:** Fase 3 MERGED

Para que Jose (y la demo) prueben "Partida encontrada" sin una segunda persona.

**Solo en desarrollo:** si `process.env.ENABLE_DEV_ROUTES !== 'true'`, las rutas responden **404** como si no existieran. En Vercel la variable no se define.

```text
src/app/api/v1/dev/bots/queue/route.ts   # POST: mete un bot a la cola · DELETE: saca a todos los bots
src/modules/matchmaking/application/AddBotToQueue.ts
```
```ts
const BotSchema = z.object({
  timeControl: TimeControlSchema,
  username: z.enum(['bot_ana', 'bot_luis', 'bot_sara']).optional(),   // por defecto, el de ELO más cercano a quien lo pide
}).strict();

export const POST = withAuth(async (req, s) => {
  if (process.env.ENABLE_DEV_ROUTES !== 'true') throw new NotFoundError('ROUTE_NOT_FOUND', 'Esta ruta de la API no existe');
  const input = await readJson(req, BotSchema);
  const bot = await addBotToQueue.execute(s.userId, input);     // enqueue con is_bot = true
  return created({ bot }, '/api/v1/matchmaking/stats');
});

export const DELETE = withAuth(async () => {
  if (process.env.ENABLE_DEV_ROUTES !== 'true') throw new NotFoundError('ROUTE_NOT_FOUND', 'Esta ruta de la API no existe');
  await removeBots.execute();
  return noContent();
});
```
- Bot ya en cola → 409 `ALREADY_IN_QUEUE`.
- Los bots no consultan el estado; `mm_try_pair` los acepta por `is_bot` y `mm_cleanup` los borra a los 5 min.
- `.env.example` agrega `ENABLE_DEV_ROUTES=false`. Mario y Jose ponen `true` en su `.env.local`.

Probar: `seed_bots.sql` en Supabase → `POST /dev/bots/queue {"timeControl":"10+0"}` → desde la UI "Buscar partida 10+0" → "Partida encontrada" en ≤ 2 s contra el bot.

`.pr/commit-27.txt`
```
feat(matchmaking): bots de prueba en desarrollo y estadísticas de la cola

- POST y DELETE /dev/bots/queue solo con ENABLE_DEV_ROUTES=true; si no, 404
- seed de bots sin contraseña
- GET /matchmaking/stats con jugadores buscando por ritmo

Refs #27
```
Título del PR: `feat(matchmaking): bots de prueba y estadísticas de la cola`
**Para Jose:** "Pon `ENABLE_DEV_ROUTES=true` en tu `.env.local` y llama `POST /api/v1/dev/bots/queue` antes de buscar."

---

## 6b. Fase 5 · API de preferencias del perfil (#28)

**Rama:** `feature/s2-28-preferencias-perfil` · **Depende de:** Fase 1 MERGED (usa `readJson`, `noContent`) y Fase 2 MERGED (contratos)

El panel "Personalizar" del perfil (ver la vista "Perfil · personalizable") cambia tema, acento, pieza 3D, material, disposición del encabezado y orden/visibilidad de secciones. Eso se guarda **en la cuenta** para que se vea igual en cualquier navegador.

### 6b.1 Migración `supabase/migrations/0003_profile_preferences.sql`
```sql
alter table public.users
  add column preferences jsonb not null default '{}'::jsonb,
  add constraint users_preferences_is_object check (jsonb_typeof(preferences) = 'object');
```
Una columna JSONB y no una tabla aparte porque son pocos datos, siempre se leen junto al perfil y su forma la valida Zod.
Mario la ejecuta en Supabase → SQL Editor.

### 6b.2 Dominio y casos de uso (módulo `dashboard`)
```text
src/modules/dashboard/
  domain/PreferencesRepository.ts      # get(userId) · save(userId, prefs) · clear(userId)
  application/GetProfilePreferences.ts
  application/SaveProfilePreferences.ts
  application/ResetProfilePreferences.ts
  infrastructure/SupabasePreferencesRepository.ts
```
```ts
// application/GetProfilePreferences.ts
import { DEFAULT_PREFERENCES, ProfilePreferencesSchema, type ProfilePreferences } from '../infrastructure/dto/preferencesSchemas';

export class GetProfilePreferences {
  constructor(private repo: PreferencesRepository) {}
  async execute(userId: string): Promise<ProfilePreferences> {
    const stored = await this.repo.get(userId);                       // null si el usuario no existe
    if (stored === null) throw new NotFoundError('NOT_FOUND', 'Usuario no encontrado');
    // Lo guardado puede venir de una versión vieja: se mezcla con los valores por defecto y se valida
    const merged = ProfilePreferencesSchema.safeParse({ ...DEFAULT_PREFERENCES, ...stored });
    return merged.success ? merged.data : DEFAULT_PREFERENCES;
  }
}
```
- `SaveProfilePreferences.execute(userId, prefs)` → recibe el objeto **completo** ya validado y lo guarda. Usuario inexistente → `NotFoundError`. Devuelve lo guardado.
- `ResetProfilePreferences.execute(userId)` → pone `preferences = '{}'`. Es idempotente: restablecer dos veces no es error.
- `GetUserProfile` (Sprint 1) agrega `preferences` usando `GetProfilePreferences`, así el perfil llega con todo en una sola petición.

### 6b.3 Rutas · `src/app/api/v1/profile/preferences/route.ts`
```ts
export const GET = withAuth(async (_req, s) =>
  ok({ preferences: await getPreferences.execute(s.userId) }, { headers: { 'Cache-Control': 'no-store' } }));

export const PUT = withAuth(async (req, s) => {
  const prefs = await readJson(req, ProfilePreferencesSchema);      // 415 si no es JSON · 400 si no cumple
  return ok({ preferences: await savePreferences.execute(s.userId, prefs) });
});

export const DELETE = withAuth(async (_req, s) => {
  await resetPreferences.execute(s.userId);
  return noContent();                                                 // 204 sin cuerpo
});
```
**PUT** con el objeto completo (no PATCH): el cliente siempre tiene el estado entero, y así no hay que fusionar parciales en el servidor.

| Método | Éxito | Errores |
|---|---|---|
| GET | 200 `{ preferences }` (por defecto si no hay nada guardado) | 401 · 404 |
| PUT | 200 `{ preferences }` | 400 `VALIDATION_ERROR`/`INVALID_JSON` · 401 · 404 · 415 |
| DELETE | **204** sin cuerpo (también si no había nada guardado) | 401 · 404 |

### 6b.4 Tests
- `GetProfilePreferences`: sin nada guardado → `DEFAULT_PREFERENCES` · guardado parcial `{ theme: 'noche' }` → noche + resto por defecto · guardado inválido `{ theme: 'neón' }` → por defecto · usuario inexistente → 404.
- `SaveProfilePreferences`: guarda y devuelve lo mismo.
- `ResetProfilePreferences`: dos veces seguidas no falla.

Agregar a `tests/auth.http.sh` (después de la sección de perfil):
```bash
echo "== prefs por defecto 200"; j -b $J $B/profile/preferences
echo "== prefs guardar 200";     j -b $J -X PUT $B/profile/preferences -d '{"theme":"noche","accent":"laton","piece":"n","material":"a","heroLayout":"pieza","sectionOrder":["elo","rend","forma","next"],"hiddenSections":["next"]}'
echo "== prefs repetidas 400";   j -b $J -X PUT $B/profile/preferences -d '{"theme":"noche","accent":"laton","piece":"n","material":"a","heroLayout":"pieza","sectionOrder":["elo","elo","forma","next"],"hiddenSections":[]}'
echo "== prefs sin JSON 415";    curl -s -o /dev/null -w '%{http_code}\n' -b $J -X PUT $B/profile/preferences -d 'theme=noche'
echo "== perfil trae prefs";     j -b $J $B/profile
echo "== prefs restablecer 204"; curl -s -o /dev/null -w '%{http_code}\n' -b $J -X DELETE $B/profile/preferences
```

### 6b.5 Cierre
`.pr/commit-28.txt`
```
feat(profile): guardar, leer y restablecer las preferencias del perfil

- columna preferences jsonb en users con check de objeto
- GET y PUT /profile/preferences validados con zod; DELETE 204 idempotente
- lo guardado se mezcla con los valores por defecto y se valida al leer
- GET /profile incluye preferences

Refs #28
```
Título del PR: `feat(profile): API de preferencias del perfil`
**Para Jose:** "Preferencias listas (contrato, §14 de tu guía). El perfil ya trae `preferences`. Conecta el panel: PUT con el objeto completo, DELETE para restablecer."

---

## 7. Fase 6 · Integración (vie 30) y Fase 7 · Release `v0.2.0` (sáb 31)

### Integración
1. `gh pr list --state open --base develop` → nada del Sprint 2 abierto salvo lo que se esté cerrando.
2. `git switch develop && git pull && npm ci && npm run build && npm start`. Probar en **producción local**: así se mide el rendimiento real y no aparece el indicador de Next.
3. `bash tests/auth.http.sh && bash tests/matchmaking.http.sh`.
4. Con Jose: dos navegadores, dos cuentas, "Buscar partida" → "Partida encontrada" en ambos.
5. Bugs → issue `type:bug` + `feature/s2-<N>-fix-<slug>` desde `develop`.

### Release (#36)
**Depende de:** todos los issues del milestone cerrados salvo #36:
```bash
gh issue list --milestone "Sprint 2 · Matchmaking" --state open
```
Claude Code prepara (sin commit):
```bash
git switch develop && git pull
git switch -c release/v0.2.0
npm version 0.2.0 --no-git-tag-version
```
`CHANGELOG.md`:
```markdown
## [0.2.0] - 2026-10-31
### Añadido
- Matchmaking: elegir ritmo, buscar rival con ventana de ELO creciente y "Partida encontrada"
- Partidas pendientes visibles para ambos jugadores y abandonables
- Catálogo de códigos HTTP (201 con Location, 204 sin cuerpo, 400, 401, 403, 404, 409, 415, 503)
- Bots de prueba para desarrollo
- Perfil personalizable guardado en la cuenta: tema, acento, pieza 3D, material, encabezado, orden y visibilidad de secciones
- Escenas 3D con three.js en login (tablero jugable), perfil (pieza que gira) y Jugar (búsqueda animada)
- Evolución de Elo bajo demanda con un botón
### Cambiado
- Navegación en cabecera superior; sistema visual v2 con temas
- Landing 3D más ligera
```
`.pr/commit-36.txt`: `chore(release): preparar v0.2.0` + `Refs #36`.
Después, igual que el Sprint 1 (guía del Sprint 1 §7): PR `release/v0.2.0` → `main`, merge, tag `v0.2.0`, `gh release create v0.2.0 --generate-notes --title "v0.2.0 · Sprint 2"`, PR `main` → `develop`, cerrar milestone. **Todos esos comandos los ejecuta Mario**; Claude Code solo los muestra en el bloque ACCIÓN DEL DEV.

---

## 8. Seguridad y buenas prácticas (revisar en cada PR)

- `userId` sale **siempre** del JWT, nunca del body ni de la URL.
- Las funciones SQL solo las ejecuta `service_role`; RLS sigue activo sin policies.
- Un 500 nunca expone el mensaje interno; se registra con `console.error('[api] …')`.
- Respuestas de estado con `Cache-Control: no-store`.
- Cada caso de uso recibe sus dependencias por constructor (`container.ts`); nada de `supabaseAdmin` dentro de `application/`.
- Un archivo, una responsabilidad; nombres en inglés en código y mensajes al usuario en español.
- Cualquier cambio de contrato (§9) va en la sección **Para Jose** del PR.

---

## 9. Contrato API · Sprint 2 (idéntico en el .md de Jose)

Base `/api/v1`. Sesión por cookie httpOnly `cpp_session` (o `Authorization: Bearer`). Todo lo de abajo exige sesión (401 si no hay).

| Método | Ruta | Body | Éxito | Errores |
|---|---|---|---|---|
| POST | `/matchmaking/queue` | `{ timeControl: '3+2' \| '5+0' \| '10+0' }` | **201** `MatchmakingStatus` (`searching`) + `Location` | 400 `VALIDATION_ERROR`/`INVALID_JSON` · 404 · 409 `ALREADY_IN_QUEUE` · 409 `ACTIVE_MATCH_EXISTS` (`meta.matchId`) · 415 |
| DELETE | `/matchmaking/queue` | — | **204** sin cuerpo | 404 `NOT_IN_QUEUE` |
| GET | `/matchmaking/status` | — | **200** `MatchmakingStatus` | — |
| GET | `/matchmaking/stats` | — | **200** `QueueStats` | — |
| GET | `/matches/:id` | — | **200** `{ match: MatchSummary }` | 400 (id no uuid) · 403 `FORBIDDEN` · 404 `MATCH_NOT_FOUND` |
| DELETE | `/matches/:id` | — | **204** sin cuerpo | 400 · 403 · 404 · 409 `MATCH_NOT_PENDING` |
| POST | `/dev/bots/queue` (solo dev) | `{ timeControl, username? }` | **201** `{ bot }` | 404 si dev apagado · 409 |
| DELETE | `/dev/bots/queue` (solo dev) | — | **204** | 404 si dev apagado |
| GET | `/profile` | — | **200** `{ profile }` · ahora incluye `profile.preferences` | 401 · 404 |
| GET | `/profile/preferences` | — | **200** `{ preferences }` (por defecto si no hay nada guardado) | 401 · 404 |
| PUT | `/profile/preferences` | `ProfilePreferences` completo | **200** `{ preferences }` | 400 `VALIDATION_ERROR`/`INVALID_JSON` · 401 · 404 · 415 |
| DELETE | `/profile/preferences` | — | **204** sin cuerpo (restablecer; idempotente) | 401 · 404 |
| * | ruta inexistente bajo `/api/v1` | — | — | **404** `ROUTE_NOT_FOUND` |

`ProfilePreferences`:
```json
{ "theme": "pergamino", "accent": "vino", "piece": "k", "material": "w", "heroLayout": "clasico",
  "sectionOrder": ["rend", "elo", "forma", "next"], "hiddenSections": [] }
```
Valores: `theme` pergamino · noche · salvia · pizarra | `accent` vino · laton · bosque · oceano · tinta | `piece` k · q · r · b · n · p | `material` w (marfil) · b (ébano) · a (acento) | `heroLayout` clasico · invertido · pieza | `sectionOrder` las 4 secciones sin repetir | `hiddenSections` máximo 3.

`MatchmakingStatus`:
```json
{ "state": "idle" }
{ "state": "searching", "timeControl": "10+0", "joinedAt": "2026-10-28T15:00:00Z", "waitedSeconds": 14,
  "elo": 1450, "eloRange": { "min": 1300, "max": 1600 }, "searchingNow": 12, "pollAfterMs": 2000 }
{ "state": "matched", "match": { …MatchSummary } }
```
`MatchSummary`:
```json
{ "id": "7f3a…", "timeControl": "10+0", "status": "pending", "createdAt": "2026-10-28T15:00:14Z",
  "yourColor": "white",
  "you":      { "id": "…", "username": "alice",       "displayName": "Alicia Romero", "avatarUrl": null, "elo": 1450 },
  "opponent": { "id": "…", "username": "bob_gambito", "displayName": null,            "avatarUrl": null, "elo": 1478 } }
```
`QueueStats`: `{ "searching": { "3+2": 4, "5+0": 2, "10+0": 6 }, "total": 12 }`

Reglas: ventana de ELO ±100, +50 cada 10 s, máximo ±400 · sin consultar el estado 15 s = no cuenta para emparejar · 60 s = fuera de la cola · partida `pending` deja de bloquear a los 10 min.

Error siempre: `{ "error": { "code": "…", "message": "…", "fields"?: {…}, "meta"?: {…} } }` · Catálogo: `docs/api/codigos-http.md` (tabla §3.1 de la guía de Mario).

> El front no lee ni escribe la cookie: la envía el navegador solo. `Authorization: Bearer` existe para pruebas con curl.

---

## 10. Hecho cuando (Sprint 2)

- [ ] `0002_matchmaking.sql`, `0003_profile_preferences.sql` y `seed_bots.sql` aplicados en Supabase
- [ ] Preferencias: PUT guarda, GET devuelve lo guardado, DELETE responde 204 y vuelve a los valores por defecto
- [ ] `npm test` verde; CI verde en `develop`
- [ ] `tests/auth.http.sh` y `tests/matchmaking.http.sh` verdes; cada código del script coincide con el comentario
- [ ] Ningún endpoint responde 500 ante datos malos (siempre 400/404/409/415)
- [ ] DELETE correctos devuelven 204 **sin cuerpo**
- [ ] Dos cuentas reales quedan emparejadas desde la UI
- [ ] Issues del backend y #36 cerrados por sus PR; `v0.2.0` con tag y GitHub Release; `main` sincronizado en `develop`
- [ ] Ningún commit ni PR con atribución a IA

## 11. Demo (parte de Mario)
1. Terminal: `bash tests/matchmaking.http.sh` y explicar cada código (201, 204, 400, 403, 404, 409, 415).
2. Supabase: fila en `matchmaking_queue` mientras alguien busca; desaparece y aparece la fila en `matches` al emparejar.
3. Explicar el candado (`pg_advisory_xact_lock`): dos requests a la vez nunca toman al mismo rival.
4. Personalizar el perfil en un navegador, abrir la misma cuenta en otro y ver el mismo tema y pieza (columna `preferences` en Supabase).
4. GitHub: milestone Sprint 2 al 100 %, ramas vinculadas a issues, tag `v0.2.0`.
