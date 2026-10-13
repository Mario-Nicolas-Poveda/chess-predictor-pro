# Sprint 1 · Dev 1 · Mario · Backend

> **Para Claude Code (en la máquina de Mario).** Lee `CLAUDE.md` y `docs/git-flow.md` primero.
> Trabajas para **Mario**. Haz las fases **en orden**. Antes de cada fase: revisa sus dependencias. Al terminar: checks, mensajes en `.pr/` y bloque **ACCIÓN DEL DEV**.
> **Nunca** hagas commit, push, merge, tag ni PR. **Nunca** pongas atribución a Claude.

**Meta del sprint:** un usuario se registra, entra (correo+clave o Google), ve su perfil con stats en 0 y ELO 1200, y edita sus datos. Todo se prueba con curl y con la UI de Jose.

**Mario:** estructura, BD, JWT, auth, API de perfil, protección de rutas, OAuth, release.
**Jose:** UI. Consume el contrato API de §9. **No cambiar el contrato sin avisar a Jose.**

---

## 0. Mapa del sprint

| Fase | Issue | Rama | Depende de | Al terminar, avisar a Jose |
|---|---|---|---|---|
| 0 | #1 | `feature/s1-1-estructura-base` | — | "Revisa y aprueba #1" |
| 1 | #2 | `feature/s1-2-core-jwt` | #1 MERGED | "Contratos Zod en develop: ya puedes importarlos" |
| 2 | #3 | `feature/s1-3-auth-api` | #2 MERGED | "API auth en develop: apaga mocks de auth" |
| 3 | #4 | `feature/s1-4-profile-api` | #2 MERGED para empezar · #3 MERGED para abrir PR | "API perfil + proxy en develop: apaga mocks de perfil" |
| 4 | #5 | `feature/s1-5-oauth-google` | #3 MERGED | "Google listo: prueba el botón" |
| 5 | — | — | — | Integración y revisión de PRs de Jose |
| 6 | #11 | `release/v0.1.0` | #2–#10 MERGED | "Release abierto: solo bugfix" |

Revisas los PRs de Jose: los de los issues #6 a #10. (Los PR tienen su propio número; se ubican por rama.)

### Plan por días (2 semanas)

| Día | Mario | Jose (para saber qué esperar) |
|---|---|---|
| 1 | Fase 0 (setup, PR #1) | Revisa #1. Luego #6 shell |
| 2 | Fase 1 (#2) | #6 shell, #7 landing |
| 3–4 | Fase 2 (#3) | #7 landing, #8 auth UI con mocks |
| 5–6 | Fase 3 (#4) | #8 a API real, #9 perfil con mocks |
| 7–8 | Fase 4 (#5) | #9 a API real, #10 sesión |
| 9 | Fase 5 · integración | integración |
| 10 | Fase 6 · release v0.1.0, ensayo demo | ensayo demo |

---

## 1. Protocolo de Claude Code (cada fase)

**Al empezar la fase:**
```bash
git status                       # debe estar limpio
git fetch origin
gh pr view <rama-dependencia> --json state -q .state   # debe decir MERGED
gh pr list --search "review-requested:@me" --state open # PRs de Jose esperando a Mario
```
- Si hay PRs de Jose pendientes → **avisar primero**: "Jose espera tu revisión en #N".
- Si una dependencia no está `MERGED` → **PARAR** y avisar:
  ```
  ⏸ ESPERANDO (Mario)
  Falta: <rama/PR> de <quién> · estado: <OPEN/APPROVED/sin abrir>
  Mientras tanto puedes: <tarea sin dependencia de esta lista>
  ```
- Todo bien → crear rama (pedir "sí"):
  ```bash
  git switch develop && git pull     # (pull = fetch + fast-forward; si pide merge commit, avisar)
  gh issue develop <N> --base develop --name <rama> --checkout
  ```

**Tareas sin dependencia** (para cuando hay que esperar): configurar Supabase (§3.1), configurar Google Cloud (§6.1), revisar PRs de Jose, escribir tests.

**Al terminar la fase:**
```bash
git fetch origin
```
Si `origin/develop` tiene commits nuevos → avisar a Mario que sincronice ANTES del PR:
```
──────── ACCIÓN DEL DEV (Mario) ────────
Estado: develop cambió (entró trabajo de Jose). Hay que sincronizar.
1) git add -A && git commit -F .pr/commit-<N>.txt
2) git merge origin/develop          (si hay conflictos, dime y te ayudo)
Después: dime "listo" y corro los checks otra vez.
────────────────────────────────────────
```
Luego `npm run lint && npm run typecheck && npm test && npm run build`, escribir `.pr/commit-<N>.txt` y `.pr/PR-<N>.md`, y mostrar el bloque ACCIÓN DEL DEV de la fase.

**Después del merge de cada PR** (Mario lo hace con `gh pr merge <rama> --merge`): pedir a Mario `git switch develop && git pull` y enviar el aviso a Jose de la tabla §0.

---

## 2. Fase 0 · Estructura (#1)

Seguir **`00_SETUP_REPO_GITFLOW_MARIO.md`** completo. Termina con PR #1 abierto.
Mientras Jose revisa: §3.1 (Supabase) y §6.1 (Google Cloud), que no dependen de código.

---

## 3. Fase 1 · Núcleo, contratos y migración (#2)

**Depende de:** `feature/s1-1-estructura-base` MERGED.
**Rama:** `feature/s1-2-core-jwt`

### 3.1 Supabase (Mario en el navegador; Claude Code guía)
1. Crear proyecto en supabase.com (región más cercana: `us-east-1`).
2. Settings → API: copiar `URL` y `service_role` key.
3. Mario crea `.env.local` (Claude Code **no** lo lee):
   ```bash
   cp .env.example .env.local
   ```
   `JWT_SECRET` (funciona en Git Bash y PowerShell):
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('base64'))"
   ```

### 3.2 Migración `supabase/migrations/0001_users.sql`
```sql
create table public.users (
  id            uuid primary key default gen_random_uuid(),
  email         text not null,
  username      text not null,
  password_hash text,                          -- null si entró con Google
  display_name  text,
  avatar_url    text,
  country       char(2),
  bio           text check (char_length(bio) <= 160),
  auth_provider text not null default 'local' check (auth_provider in ('local','google')),
  google_id     text unique,
  elo_rating    int  not null default 1200,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create unique index users_email_key    on public.users (lower(email));
create unique index users_username_key on public.users (lower(username));

create table public.user_stats (
  user_id        uuid primary key references public.users(id) on delete cascade,
  games_played   int not null default 0,
  wins           int not null default 0,
  losses         int not null default 0,
  draws          int not null default 0,
  current_streak int not null default 0,
  best_elo       int not null default 1200
);

create function public.create_user_stats() returns trigger
language plpgsql as $$
begin
  insert into public.user_stats (user_id) values (new.id);
  return new;
end $$;
create trigger trg_users_stats after insert on public.users
for each row execute function public.create_user_stats();

create function public.touch_updated_at() returns trigger
language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger trg_users_updated before update on public.users
for each row execute function public.touch_updated_at();

-- RLS activo sin policies: solo el backend (service_role) lee y escribe
alter table public.users      enable row level security;
alter table public.user_stats enable row level security;
```

`supabase/seed.sql` (demo: `demo@chesspredictor.dev` / `Demo1234`)
```sql
insert into public.users (email, username, password_hash, display_name, country)
values ('demo@chesspredictor.dev', 'demo',
        extensions.crypt('Demo1234', extensions.gen_salt('bf', 10)), 'Usuario Demo', 'CO');
```
Mario pega ambos en Supabase → SQL Editor → Run. Si `extensions.crypt` falla, usar `crypt` y `gen_salt` sin prefijo.

### 3.3 `src/core/shared`

`env.ts`
```ts
import 'server-only';
import { z } from 'zod';

export const env = z.object({
  SUPABASE_URL: z.url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  JWT_SECRET: z.string().min(32),
  JWT_EXPIRES_IN: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  APP_URL: z.url(),
}).parse(process.env);
```

`errors/AppError.ts`
```ts
export class AppError extends Error {
  constructor(public code: string, message: string, public status = 400,
              public fields?: Record<string, string[]>) { super(message); }
}
```

`errors/toErrorResponse.ts`
```ts
import { NextResponse } from 'next/server';
import { ZodError, z } from 'zod';
import { AppError } from './AppError';

export function toErrorResponse(e: unknown) {
  if (e instanceof ZodError)
    return NextResponse.json({ error: { code: 'VALIDATION_ERROR', message: 'Datos inválidos',
      fields: z.flattenError(e).fieldErrors } }, { status: 400 });
  if (e instanceof AppError)
    return NextResponse.json({ error: { code: e.code, message: e.message, fields: e.fields } }, { status: e.status });
  console.error(e);
  return NextResponse.json({ error: { code: 'INTERNAL', message: 'Error interno' } }, { status: 500 });
}
```

`db/supabaseAdmin.ts`
```ts
import 'server-only';
import { createClient } from '@supabase/supabase-js';
import { env } from '../env';

export const supabaseAdmin = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
```

`auth/jwt.ts` — sin `server-only` ni `env.ts`: lo usa `proxy.ts`
```ts
import { SignJWT, jwtVerify } from 'jose';

export type Session = { userId: string; username: string };
const key = () => new TextEncoder().encode(process.env.JWT_SECRET);

export async function signToken(s: Session) {
  return new SignJWT({ username: s.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(s.userId)
    .setIssuedAt()
    .setExpirationTime(process.env.JWT_EXPIRES_IN ?? '7d')
    .sign(key());
}

export async function verifyToken(token?: string | null): Promise<Session | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ['HS256'] });
    return payload.sub ? { userId: payload.sub, username: String(payload.username) } : null;
  } catch { return null; }
}
```
La guía tenía `verifyJwt` síncrono; ahora es `await verifyToken(...)`.

`auth/session.ts`
```ts
import type { NextRequest, NextResponse } from 'next/server';

export const SESSION_COOKIE = 'cpp_session';
const MAX_AGE = 60 * 60 * 24 * 7;

export function setSessionCookie(res: NextResponse, token: string) {
  res.cookies.set(SESSION_COOKIE, token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === 'production',
  });
}
export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 });
}
// cookie (navegador) o Bearer (curl/Postman)
export function readToken(req: NextRequest) {
  const h = req.headers.get('authorization');
  if (h?.startsWith('Bearer ')) return h.slice(7);
  return req.cookies.get(SESSION_COOKIE)?.value ?? null;
}
```

`auth/withAuth.ts`
```ts
import type { NextRequest } from 'next/server';
import { verifyToken, type Session } from './jwt';
import { readToken } from './session';
import { AppError } from '../errors/AppError';
import { toErrorResponse } from '../errors/toErrorResponse';

export function withAuth(handler: (req: NextRequest, s: Session) => Promise<Response>) {
  return async (req: NextRequest) => {
    try {
      const s = await verifyToken(readToken(req));
      if (!s) throw new AppError('UNAUTHORIZED', 'Sesión inválida o expirada', 401);
      return await handler(req, s);
    } catch (e) { return toErrorResponse(e); }
  };
}
```

`src/app/api/v1/health/route.ts`
```ts
import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { error } = await supabaseAdmin.from('users').select('id', { head: true, count: 'exact' });
  return NextResponse.json({ status: 'ok', db: error ? 'down' : 'ok' }, { status: error ? 503 : 200 });
}
```

### 3.4 Contratos Zod (los importa Jose: **solo zod, sin imports de servidor**)

`src/modules/auth/infrastructure/dto/authSchemas.ts`
```ts
import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('Correo inválido'));

export const usernameSchema = z.string().trim().min(3, 'Mínimo 3 caracteres').max(20, 'Máximo 20')
  .regex(/^[a-zA-Z0-9_]+$/, 'Solo letras, números y _');
export const passwordSchema = z.string().min(8, 'Mínimo 8 caracteres').max(72)
  .regex(/[A-Za-z]/, 'Debe tener una letra').regex(/\d/, 'Debe tener un número');

export const RegisterSchema = z.object({ email, username: usernameSchema, password: passwordSchema });
export const LoginSchema = z.object({ email, password: z.string().min(1, 'Escribe tu contraseña') });
export type RegisterInput = z.infer<typeof RegisterSchema>;
export type LoginInput = z.infer<typeof LoginSchema>;
export type PublicUser = { id: string; email: string; username: string };
```

`src/modules/dashboard/infrastructure/dto/profileSchemas.ts`
```ts
import { z } from 'zod';
import { usernameSchema } from '@/modules/auth/infrastructure/dto/authSchemas';

export const UpdateProfileSchema = z.object({
  displayName: z.string().trim().max(40, 'Máximo 40').nullable().optional(),
  username: usernameSchema.optional(),
  country: z.string().length(2).toUpperCase().nullable().optional(),
  bio: z.string().trim().max(160, 'Máximo 160').nullable().optional(),
  avatarUrl: z.string().trim().regex(/^https:\/\/\S+$/, 'Debe ser una URL https').nullable().optional(),
}).strict();
export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>;

export type ProfileStats = { gamesPlayed: number; wins: number; losses: number; draws: number;
  winRate: number; currentStreak: number; bestElo: number };
export type Profile = {
  id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null;
  country: string | null; bio: string | null; eloRating: number; authProvider: 'local' | 'google';
  createdAt: string; stats: ProfileStats;
};
```

Tests mínimos de esquemas: `src/modules/auth/infrastructure/dto/__tests__/schemas.test.ts` (email en mayúsculas → minúsculas; clave sin número falla; `UpdateProfileSchema` rechaza `eloRating`).

### 3.5 Cierre de la fase
Probar: `npm run dev` → `curl http://localhost:3000/api/v1/health` → `{"status":"ok","db":"ok"}`.

`.pr/commit-2.txt`
```
feat(core): añadir núcleo compartido, contratos zod y migración de usuarios

- env validado con zod, AppError y formato único de errores
- cliente Supabase solo servidor (service_role)
- JWT HS256 con jose, cookie httpOnly y wrapper withAuth
- contratos RegisterSchema, LoginSchema y UpdateProfileSchema para backend y frontend
- migración users + user_stats con trigger, RLS y seed demo
- GET /api/v1/health

Refs #2
```
`.pr/PR-2.md`
```markdown
## Qué hace
Núcleo compartido (env, errores, Supabase, JWT, sesión), contratos Zod que usa Jose y migración de usuarios.

Closes #2

## Sprint / Dev / Área
Sprint 1 · Mario · backend

## Cómo probar
1. Ejecutar `supabase/migrations/0001_users.sql` y `supabase/seed.sql` en Supabase
2. `.env.local` con valores reales → `npm run dev`
3. `curl http://localhost:3000/api/v1/health` → `{"status":"ok","db":"ok"}`
4. `npm test`

## Para Jose
Ya puedes importar `RegisterSchema`, `LoginSchema`, `UpdateProfileSchema` y los tipos `Profile`, `PublicUser`.

## Checklist
- [x] lint, typecheck, test, build
- [x] Sin secretos
- [x] Sin atribución a IA
```
Bloque ACCIÓN DEL DEV con título PR: `feat(core): núcleo compartido, contratos zod y migración de usuarios`.
Tras merge → aviso a Jose: **"Contratos Zod en develop. Haz `git fetch origin && git merge origin/develop` en tu rama y ya puedes importarlos."**

---

## 4. Fase 2 · API de autenticación (#3)

**Depende de:** `feature/s1-2-core-jwt` MERGED.
**Rama:** `feature/s1-3-auth-api`

`src/modules/auth/domain/`
```ts
// AuthUser.ts
import type { PublicUser } from '../infrastructure/dto/authSchemas';
export interface AuthUser {
  id: string; email: string; username: string;
  passwordHash: string | null; authProvider: 'local' | 'google'; googleId: string | null;
}
export const toPublic = (u: AuthUser): PublicUser => ({ id: u.id, email: u.email, username: u.username });

// AuthUserRepository.ts
export interface AuthUserRepository {
  findByEmail(email: string): Promise<AuthUser | null>;
  findByUsername(username: string): Promise<AuthUser | null>;
  findByGoogleId(googleId: string): Promise<AuthUser | null>;
  create(data: { email: string; username: string; passwordHash: string | null;
    authProvider: 'local' | 'google'; googleId?: string; displayName?: string; avatarUrl?: string }): Promise<AuthUser>;
  linkGoogle(userId: string, googleId: string): Promise<void>;
}

// PasswordHasher.ts
export interface PasswordHasher { hash(p: string): Promise<string>; compare(p: string, h: string): Promise<boolean>; }
```
Nota de capas: el dominio importa solo el **tipo** `PublicUser` del DTO. Si se quiere dominio 100 % puro, mover `PublicUser` a `domain/` y reexportarlo desde el DTO.

`application/RegisterUser.ts`
```ts
export class RegisterUser {
  constructor(private users: AuthUserRepository, private hasher: PasswordHasher) {}
  async execute(i: RegisterInput) {
    if (await this.users.findByEmail(i.email))
      throw new AppError('EMAIL_TAKEN', 'Ese correo ya está registrado', 409, { email: ['Ya registrado'] });
    if (await this.users.findByUsername(i.username))
      throw new AppError('USERNAME_TAKEN', 'Ese usuario ya existe', 409, { username: ['No disponible'] });
    const user = await this.users.create({ email: i.email, username: i.username,
      passwordHash: await this.hasher.hash(i.password), authProvider: 'local' });
    return toPublic(user);
  }
}
```

`application/LoginUser.ts` — mismo mensaje si no existe o si la clave es mala
```ts
export class LoginUser {
  constructor(private users: AuthUserRepository, private hasher: PasswordHasher) {}
  async execute(i: LoginInput) {
    const u = await this.users.findByEmail(i.email);
    const ok = !!u?.passwordHash && await this.hasher.compare(i.password, u.passwordHash);
    if (!u || !ok) throw new AppError('INVALID_CREDENTIALS', 'Correo o contraseña incorrectos', 401);
    return toPublic(u);
  }
}
```

`infrastructure/BcryptPasswordHasher.ts`
```ts
import bcrypt from 'bcryptjs';
export class BcryptPasswordHasher implements PasswordHasher {
  hash(p: string) { return bcrypt.hash(p, 10); }
  compare(p: string, h: string) { return bcrypt.compare(p, h); }
}
```

`infrastructure/SupabaseAuthUserRepository.ts`
```ts
type Row = { id: string; email: string; username: string; password_hash: string | null;
  auth_provider: 'local' | 'google'; google_id: string | null };
const map = (r: Row): AuthUser => ({ id: r.id, email: r.email, username: r.username,
  passwordHash: r.password_hash, authProvider: r.auth_provider, googleId: r.google_id });
const escapeLike = (v: string) => v.replace(/[\\%_]/g, m => '\\' + m);   // sin esto "de_mo" encuentra "demo"

export class SupabaseAuthUserRepository implements AuthUserRepository {
  private async one(col: string, val: string, ci = false) {
    const q = supabaseAdmin.from('users').select('*');
    const { data, error } = await (ci ? q.ilike(col, escapeLike(val)) : q.eq(col, val)).maybeSingle<Row>();
    if (error) throw error;
    return data ? map(data) : null;
  }
  findByEmail(e: string)    { return this.one('email', e, true); }
  findByUsername(u: string) { return this.one('username', u, true); }
  findByGoogleId(g: string) { return this.one('google_id', g); }
  async create(d: Parameters<AuthUserRepository['create']>[0]) {
    const { data, error } = await supabaseAdmin.from('users').insert({
      email: d.email, username: d.username, password_hash: d.passwordHash,
      auth_provider: d.authProvider, google_id: d.googleId ?? null,
      display_name: d.displayName ?? null, avatar_url: d.avatarUrl ?? null,
    }).select('*').single<Row>();
    if (error?.code === '23505') throw new AppError('CONFLICT', 'Correo o usuario ya existe', 409);
    if (error) throw error;
    return map(data);
  }
  async linkGoogle(id: string, g: string) {
    const { error } = await supabaseAdmin.from('users').update({ google_id: g }).eq('id', id);
    if (error) throw error;
  }
}
```

`presentation/controllers/container.ts`
```ts
const users = new SupabaseAuthUserRepository();
const hasher = new BcryptPasswordHasher();
export const registerUser = new RegisterUser(users, hasher);
export const loginUser = new LoginUser(users, hasher);
```

Rutas (`src/app/api/v1/auth/...`):
```ts
// register/route.ts
export async function POST(req: NextRequest) {
  try {
    const user = await registerUser.execute(RegisterSchema.parse(await req.json()));
    const res = NextResponse.json({ user }, { status: 201 });
    setSessionCookie(res, await signToken({ userId: user.id, username: user.username }));
    return res;
  } catch (e) { return toErrorResponse(e); }
}
```
- `login/route.ts`: igual con `LoginSchema` + `loginUser`, status 200.
- `logout/route.ts`: `POST` → `new NextResponse(null, { status: 204 })` + `clearSessionCookie`.
- `me/route.ts`: `export const GET = withAuth(async (_req, s) => NextResponse.json({ user: { id: s.userId, username: s.username } }));`

Tests `src/modules/auth/application/__tests__/auth.test.ts` (repo en memoria + hasher falso, sin BD):
- RegisterUser: crea · `EMAIL_TAKEN` con mayúsculas distintas · `USERNAME_TAKEN`
- LoginUser: OK · clave mala → `INVALID_CREDENTIALS` · usuario Google sin clave → 401

`tests/auth.http.sh` — parte auth (la parte de perfil se añade en Fase 3). Script completo en §8.
En Windows: correr con **Git Bash** (`bash tests/auth.http.sh`).

`.pr/commit-3.txt`
```
feat(auth): registrar, iniciar y cerrar sesión con JWT en cookie

- casos de uso RegisterUser y LoginUser con repositorio Supabase y bcrypt
- POST /auth/register, POST /auth/login, POST /auth/logout, GET /auth/me
- mismo error para usuario inexistente y clave incorrecta
- tests con repositorio en memoria

Refs #3
```
`.pr/PR-3.md` (misma plantilla): Cómo probar → `npm test` + `bash tests/auth.http.sh` (secciones health → me). Sección **Para Jose:** "Endpoints de auth listos según contrato §9. Apaga `NEXT_PUBLIC_API_MOCK` para auth."
Título PR: `feat(auth): registro, login, logout y sesión con JWT`.
Tras merge → aviso a Jose: **"API de auth en develop. Sincroniza y apaga mocks de auth."**

---

## 5. Fase 3 · API de perfil y protección de rutas (#4)

**Depende de:** `feature/s1-2-core-jwt` MERGED para empezar. `feature/s1-3-auth-api` MERGED para abrir el PR (hace falta login para probar).
**Rama:** `feature/s1-4-profile-api`

`dashboard/domain/User.ts`
```ts
export interface UserStats { gamesPlayed: number; wins: number; losses: number; draws: number;
  currentStreak: number; bestElo: number; }
export interface User {
  id: string; email: string; username: string; displayName: string | null; avatarUrl: string | null;
  country: string | null; bio: string | null; eloRating: number;
  authProvider: 'local' | 'google'; createdAt: string; stats: UserStats;
}
export const winRate = (s: UserStats) => s.gamesPlayed === 0 ? 0 : Math.round((s.wins / s.gamesPlayed) * 100);
```
`UserRepository`: `findById(id)`, `isUsernameTaken(username, exceptId)`, `update(id, patch)`.

`SupabaseUserRepository.findById` (join 1-1):
```ts
const { data, error } = await supabaseAdmin.from('users')
  .select('*, user_stats(*)').eq('id', id).maybeSingle();
// user_stats llega como objeto (PK compartida). Si llega array, tomar [0].
```

Casos de uso:
- `GetUserProfile.execute(id)` → si no existe: `AppError('NOT_FOUND', 'Usuario no encontrado', 404)` (no `Error`, si no da 500).
- `UpdateUserProfile.execute(id, input)` → username cambia y `isUsernameTaken(username, id)` → `AppError('USERNAME_TAKEN', ..., 409, { username: ['No disponible'] })`. Devuelve `findById` completo.

`presentation/controllers/container.ts` (dashboard): instancia repo + casos de uso.

`src/app/api/v1/profile/route.ts`
```ts
const toDto = (p: User): Profile => ({ ...p, stats: { ...p.stats, winRate: winRate(p.stats) } });

export const GET = withAuth(async (_req, s) =>
  NextResponse.json({ profile: toDto(await getUserProfile.execute(s.userId)) }));

export const PATCH = withAuth(async (req, s) => {
  const p = await updateUserProfile.execute(s.userId, UpdateProfileSchema.parse(await req.json()));
  const res = NextResponse.json({ profile: toDto(p) });
  if (p.username !== s.username)   // el username va dentro del JWT → reemitir
    setSessionCookie(res, await signToken({ userId: p.id, username: p.username }));
  return res;
});
```

`src/proxy.ts` (Next 16+; en Next 15 → `src/middleware.ts` con `export async function middleware`)
```ts
import { NextResponse, type NextRequest } from 'next/server';
import { verifyToken } from '@/core/shared/auth/jwt';
import { SESSION_COOKIE } from '@/core/shared/auth/session';

export async function proxy(req: NextRequest) {
  const s = await verifyToken(req.cookies.get(SESSION_COOKIE)?.value);
  const { pathname } = req.nextUrl;
  if (pathname.startsWith('/dashboard') && !s)
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(pathname)}`, req.url));
  if ((pathname === '/login' || pathname === '/register') && s)
    return NextResponse.redirect(new URL('/dashboard/profile', req.url));
  return NextResponse.next();
}
export const config = { matcher: ['/dashboard/:path*', '/login', '/register'] };
```

Tests: username ocupado → 409 · mismo username propio → OK · `winRate` = 0 con 0 partidas.

`.pr/commit-4.txt`
```
feat(profile): consultar y editar perfil y proteger rutas del dashboard

- GET /profile con stats y winRate
- PATCH /profile con validación estricta (ELO y email no editables)
- reemisión de JWT si cambia el username
- proxy redirige /dashboard sin sesión a /login y /login con sesión al perfil

Refs #4
```
Título PR: `feat(profile): API de perfil y protección de rutas`. **Para Jose:** "Perfil + proxy listos. Con el proxy activo, `/dashboard` sin cookie real redirige a `/login`: apaga todos los mocks."
Tras merge → aviso a Jose: **"API de perfil y proxy en develop. Sincroniza y apaga mocks de perfil."**

---

## 6. Fase 4 · Google OAuth 2.0 (#5)

**Depende de:** `feature/s1-3-auth-api` MERGED.
**Rama:** `feature/s1-5-oauth-google`

### 6.1 Google Cloud (Mario en el navegador; puede hacerse desde el Día 1)
1. APIs & Services → OAuth consent screen → External → "Chess Predictor Pro" → test users: Mario, Jose, el profe.
2. Credentials → Create OAuth client ID → Web application.
3. Redirect URI: `http://localhost:3000/api/v1/auth/oauth/google/callback` (+ la de Vercel si despliegan).
4. Client ID / Secret → `.env.local` de Mario. Pasar a Jose por privado (nunca en el repo).

### 6.2 Código
`src/app/api/v1/auth/oauth/google/route.ts`
```ts
export async function GET() {
  const state = crypto.randomUUID();
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({
    client_id: env.GOOGLE_CLIENT_ID!, response_type: 'code', scope: 'openid email profile',
    redirect_uri: `${env.APP_URL}/api/v1/auth/oauth/google/callback`, state, prompt: 'select_account',
  }).toString();
  const res = NextResponse.redirect(url);
  res.cookies.set('oauth_state', state, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 600,
    secure: process.env.NODE_ENV === 'production' });
  return res;
}
```

`.../google/callback/route.ts`
```ts
export async function GET(req: NextRequest) {
  const fail = NextResponse.redirect(new URL('/login?error=oauth', req.url));
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  if (!code || !state || state !== req.cookies.get('oauth_state')?.value) return fail;   // anti-CSRF
  try {
    const g = await googleOAuthClient.exchange(code);
    if (!g.email_verified) return fail;
    const user = await loginWithGoogle.execute(g);
    const res = NextResponse.redirect(new URL('/dashboard/profile', req.url));
    setSessionCookie(res, await signToken({ userId: user.id, username: user.username }));
    res.cookies.set('oauth_state', '', { path: '/', maxAge: 0 });
    return res;
  } catch (e) { console.error(e); return fail; }
}
```

`infrastructure/GoogleOAuthClient.ts` → `exchange(code)`:
- `POST https://oauth2.googleapis.com/token` (form-urlencoded: `code, client_id, client_secret, redirect_uri, grant_type=authorization_code`) → `access_token`
- `GET https://openidconnect.googleapis.com/v1/userinfo` con `Authorization: Bearer <access_token>` → `{ sub, email, email_verified, name, picture }`

`application/LoginWithGoogle.ts`:
1. `findByGoogleId(sub)` → existe → devolver.
2. `findByEmail(email)` → existe (cuenta local) → `linkGoogle(id, sub)` → devolver.
3. Nuevo → username = parte antes de `@` limpia a `[a-z0-9_]`, máx. 15 + 4 dígitos al azar; reintentar si choca → `create({ authProvider: 'google', passwordHash: null, googleId: sub, displayName: name, avatarUrl: picture })`.

Tests: los 3 caminos.

`.pr/commit-5.txt`
```
feat(oauth): iniciar sesión con Google mediante OAuth 2.0

- flujo authorization code con state anti-CSRF en cookie
- vincula cuenta existente por email o crea usuario nuevo
- errores redirigen a /login?error=oauth

Refs #5
```
Título PR: `feat(oauth): login con Google (OAuth 2.0)`. **Para Jose:** "El botón `<a href="/api/v1/auth/oauth/google">` ya funciona; pídeme las credenciales por privado."

---

## 7. Fase 5 · Integración (Día 9) y Fase 6 · Release v0.1.0 (Día 10)

### Integración
1. `gh pr list --state open` → no debe quedar nada del Sprint 1 abierto salvo lo que se esté cerrando.
2. `git switch develop && git pull && npm ci && npm run dev`.
3. Correr `bash tests/auth.http.sh` + checklist §10 junto con Jose.
4. Bugs → issue `type:bug` + rama `feature/s1-<N>-fix-<slug>` desde `develop` (antes del release).

### Release (#11)
**Depende de:** #2 a #10 MERGED. Verificar:
```bash
gh issue list --milestone "Sprint 1 · Auth, Dashboard y Perfil" --state open
```
Solo debe quedar #11 abierto. Si no → PARAR y avisar qué falta y de quién.

Claude Code prepara (sin commit):
```bash
git switch develop && git pull
git switch -c release/v0.1.0
npm version 0.1.0 --no-git-tag-version
```
`CHANGELOG.md`:
```markdown
## [0.1.0] - <fecha>
### Añadido
- Registro e inicio de sesión con correo y contraseña (JWT en cookie httpOnly)
- Inicio de sesión con Google (OAuth 2.0)
- Perfil con estadísticas en 0 y ELO 1200; edición de datos básicos
- Protección de rutas del dashboard
- Landing con recorrido 3D
- Shell del dashboard con barra superior
```
`.pr/commit-11.txt`
```
chore(release): preparar v0.1.0

Refs #11
```
`.pr/PR-11.md`: "Release del Sprint 1 → main" + `Closes #11` + lista del changelog.

```
──────── ACCIÓN DEL DEV (Mario) ────────
Estado: release/v0.1.0 lista (versión 0.1.0 + changelog). Checks OK.
1) git add -A && git commit -F .pr/commit-11.txt
2) git push -u origin release/v0.1.0
3) Avisa a Jose: "Release abierto. Solo arreglos: rama bugfix/s1-<N>-<slug> desde release/v0.1.0, PR al release."
4) Cuando no haya más arreglos:
   gh pr create --base main --head release/v0.1.0 --title "chore(release): v0.1.0 · Sprint 1" --body-file .pr/PR-11.md
5) Jose aprueba + CI verde → gh pr merge release/v0.1.0 --merge
6) git switch main && git pull
   git tag -a v0.1.0 -m "Sprint 1: auth, dashboard y perfil"
   git push origin v0.1.0
   gh release create v0.1.0 --generate-notes --title "v0.1.0 · Sprint 1"
7) Back-merge:
   gh pr create --base develop --head main --title "chore(release): sincronizar main en develop tras v0.1.0" --body "Back-merge de v0.1.0."
   Jose aprueba → gh pr merge main --merge   (NO borrar main: la regla de deletion lo impide)
Después: Sprint 1 cerrado. Cerrar milestone: gh api -X PATCH repos/OWNER/REPO/milestones/<n> -f state=closed
────────────────────────────────────────
```
Ojo con el paso 7: `--delete-branch-on-merge` no borra `main` porque está protegida.

---

## 8. Script `tests/auth.http.sh` (Git Bash)

```bash
#!/usr/bin/env bash
set -e
B=${B:-http://localhost:3000/api/v1}; J=$(mktemp); U="u$RANDOM"
j() { curl -s -H 'content-type: application/json' "$@"; echo; }
echo "== health";         j $B/health
echo "== register 201";   j -c $J -X POST $B/auth/register -d "{\"email\":\"$U@test.dev\",\"username\":\"$U\",\"password\":\"Clave1234\"}"
echo "== register 409";   j -X POST $B/auth/register -d "{\"email\":\"$U@test.dev\",\"username\":\"x$U\",\"password\":\"Clave1234\"}"
echo "== register 400";   j -X POST $B/auth/register -d '{"email":"malo","username":"a","password":"123"}'
echo "== me";             j -b $J $B/auth/me
# --- desde Fase 3 ---
echo "== profile (0s)";   j -b $J $B/profile
echo "== patch";          j -b $J -c $J -X PATCH $B/profile -d '{"displayName":"Mario P","country":"CO","bio":"Italiana siempre"}'
echo "== patch elo 400";  j -b $J -X PATCH $B/profile -d '{"eloRating":3000}'
echo "== patch user 409"; j -b $J -X PATCH $B/profile -d '{"username":"demo"}'
# ---
echo "== logout 204";     curl -s -o /dev/null -w '%{http_code}\n' -b $J -c $J -X POST $B/auth/logout
echo "== me 401";         j -b $J $B/auth/me
echo "== login demo";     j -X POST $B/auth/login -d '{"email":"demo@chesspredictor.dev","password":"Demo1234"}'
echo "== login 401";      j -X POST $B/auth/login -d '{"email":"demo@chesspredictor.dev","password":"mala1234"}'
rm -f $J
```

---

## 9. Contrato API (idéntico en el .md de Jose)

Base `/api/v1`. JSON. Sesión = cookie httpOnly `cpp_session` (JWT HS256, 7 días). También acepta `Authorization: Bearer <jwt>`.

Error siempre:
```json
{ "error": { "code": "USERNAME_TAKEN", "message": "Ese usuario ya existe", "fields": { "username": ["No disponible"] } } }
```

| Método | Ruta | Body | OK | Errores |
|---|---|---|---|---|
| GET | `/health` | — | 200 `{status, db}` | 503 |
| POST | `/auth/register` | `{email, username, password}` | 201 `{user}` + cookie | 400 VALIDATION_ERROR · 409 EMAIL_TAKEN / USERNAME_TAKEN |
| POST | `/auth/login` | `{email, password}` | 200 `{user}` + cookie | 400 · 401 INVALID_CREDENTIALS |
| POST | `/auth/logout` | — | 204, borra cookie | — |
| GET | `/auth/me` | — | 200 `{user:{id, username}}` | 401 UNAUTHORIZED |
| GET | `/auth/oauth/google` | — | 302 a Google | — |
| GET | `/auth/oauth/google/callback` | — | 302 `/dashboard/profile` + cookie | 302 `/login?error=oauth` |
| GET | `/profile` | — | 200 `{profile}` | 401 · 404 |
| PATCH | `/profile` | `{displayName?, username?, country?, bio?, avatarUrl?}` | 200 `{profile}` | 400 · 401 · 409 USERNAME_TAKEN |

`user` = `{ id, email, username }`

`profile`:
```json
{
  "id": "uuid", "email": "demo@chesspredictor.dev", "username": "demo",
  "displayName": "Usuario Demo", "avatarUrl": null, "country": "CO", "bio": null,
  "eloRating": 1200, "authProvider": "local", "createdAt": "2026-10-20T15:00:00Z",
  "stats": { "gamesPlayed": 0, "wins": 0, "losses": 0, "draws": 0, "winRate": 0, "currentStreak": 0, "bestElo": 1200 }
}
```
Reglas: username 3–20 `[a-zA-Z0-9_]` · password ≥ 8 con letra y número · displayName ≤ 40 · bio ≤ 160 · country ISO-2 · avatarUrl https · PATCH con campos extra (`eloRating`, `email`) → 400.

**Datos para Sprint 3+** (el diseño del dashboard los va a pedir; no implementar ahora): historial de ELO por fecha, últimas N partidas (resultado), logros. Saldrán de una tabla `matches` en el módulo `arena`.

---

## 10. Hecho cuando (Sprint 1)

- [ ] Migración + seed aplicados
- [ ] `npm test` verde · CI verde en `develop`
- [ ] `bash tests/auth.http.sh` verde
- [ ] Contraseñas solo como hash en BD
- [ ] Secretos fuera del repo
- [ ] `/dashboard/*` sin sesión → `/login`
- [ ] Google funciona con test users
- [ ] Issues #1–#5 y #11 cerrados por sus PR
- [ ] `v0.1.0` en `main` con tag y GitHub Release; `main` sincronizado en `develop`
- [ ] Ningún commit o PR con atribución a IA

## 11. Demo (parte de Mario)
1. GitHub: milestone Sprint 1 al 100 %, issues cerrados, ramas vinculadas, PRs revisados, tag `v0.1.0`.
2. Terminal: `npm test` y `bash tests/auth.http.sh` (201, 409, 400, 401).
3. Supabase: `users` con hash (no clave) y `user_stats` en 0 creada por el trigger.
4. Capas: route → controller/container → caso de uso → repositorio. Cambiar Supabase = tocar solo `infrastructure`.
