# Sprint 1 · Dev 2 · Jose · Frontend

> **Para Claude Code (en la máquina de Jose).** Lee `CLAUDE.md` y `docs/git-flow.md` primero.
> Trabajas para **Jose**. Haz las fases **en orden**. Antes de cada fase: revisa sus dependencias (casi todas son PRs de Mario). Al terminar: checks, mensajes en `.pr/` y bloque **ACCIÓN DEL DEV**.
> **Nunca** hagas commit, push, merge ni PR. **Nunca** pongas atribución a Claude.

**Meta del sprint:** el usuario entra a la landing 3D, se registra o inicia sesión (correo+clave o Google), cae en su perfil con stats en 0 y ELO 1200, y edita sus datos. Dashboard con **barra de navegación superior** (sin barra lateral), como en el diseño escogido, responsive.

**Jose:** tema, shell con barra superior, landing, login/registro, perfil, sesión en la UI.
**Mario:** API, BD, JWT, protección de rutas (`proxy.ts`), OAuth. Contrato API en §10. No inventar endpoints.

---

## 0. Mapa del sprint

| Fase | Issue | Rama | Para empezar | Para abrir el PR |
|---|---|---|---|---|
| 0 | — | — | PR #1 de Mario abierto | — (aprobar #1) |
| 1 | #6 | `feature/s1-6-ui-shell` | `feature/s1-1-estructura-base` MERGED | — |
| 2 | #7 | `feature/s1-7-landing-3d` | #1 MERGED | — |
| 3 | #8 | `feature/s1-8-auth-ui` | #6 MERGED · contratos de #2 (o temporales) | `feature/s1-3-auth-api` MERGED |
| 4 | #9 | `feature/s1-9-profile-ui` | #6 MERGED | `feature/s1-4-profile-api` MERGED |
| 5 | #10 | `feature/s1-10-session-ui` | #8 MERGED | `feature/s1-5-oauth-google` MERGED |
| 6 | — | `bugfix/s1-<N>-<slug>` | `release/v0.1.0` abierto | — |

Revisas los PRs de Mario: los de los issues #1 a #5, el del release (#11) y el back-merge `main`→`develop`. (Los PR tienen su propio número; se ubican por rama.)

### Plan por días

| Día | Jose | Mario (para saber qué esperar) |
|---|---|---|
| 1 | Fase 0 (aprobar #1) → Fase 1 shell | setup, PR #1 |
| 2–3 | Fase 1 → Fase 2 landing | #2 núcleo y contratos |
| 4–5 | Fase 3 login/registro (mocks → real) | #3 auth |
| 6–7 | Fase 4 perfil (mocks → real) | #4 perfil + proxy |
| 8 | Fase 5 sesión, móvil, accesibilidad | #5 Google |
| 9 | integración, revisar PRs | integración |
| 10 | bugfix de release, ensayo demo | release v0.1.0 |

---

## 1. Protocolo de Claude Code (cada fase)

**Al empezar la fase:**
```bash
git status                                                 # limpio
git fetch origin
gh pr view <rama-dependencia> --json state -q .state       # MERGED / OPEN / no existe
gh pr list --search "review-requested:@me" --state open    # PRs de Mario esperando a Jose
```
- Hay PRs de Mario esperando → **avisar primero**: "Mario espera tu revisión en #N" (y ofrecer revisarlo, §1.1).
- Dependencia para **empezar** no MERGED → **PARAR**:
  ```
  ⏸ ESPERANDO (Jose)
  Falta: <rama> de Mario · estado: <OPEN/APPROVED/sin abrir>
  Mientras tanto puedes: <fase sin esa dependencia, o revisar PRs>
  ```
- Dependencia para **abrir PR** no MERGED → trabajar con mocks (§4) y, al terminar, **no** preparar PR: avisar "Fase lista con mocks. Espero `<rama>` de Mario para conectar la API real y abrir el PR."
- Todo bien → crear rama (pedir "sí"):
  ```bash
  git switch develop && git pull
  gh issue develop <N> --base develop --name <rama> --checkout
  ```

**Cuando Mario mergea algo que Jose necesita** (lo ves con `git fetch` o porque Mario avisa):
```
──────── ACCIÓN DEL DEV (Jose) ────────
Estado: entró <rama de Mario> en develop. Hay que traerlo a tu rama.
1) git add -A && git commit -F .pr/commit-<N>.txt     (guarda tu avance)
2) git merge origin/develop                            (conflictos → dime y te ayudo)
Después: dime "listo" y conecto la API real / quito mocks.
────────────────────────────────────────
```

**Al terminar la fase:** `npm run lint && npm run typecheck && npm test && npm run build` → escribir `.pr/commit-<N>.txt` y `.pr/PR-<N>.md` → bloque ACCIÓN DEL DEV (formato en `CLAUDE.md`) → tras el merge: `git switch develop && git pull`.

### 1.1 Revisar un PR de Mario
```bash
gh pr diff <n>
gh pr checks <n>
gh pr checkout <n> && npm ci && npm run dev    # probar si toca
```
Claude Code escribe `.pr/review-<n>.md` (qué está bien · qué cambiar con archivo:línea · si rompe el contrato §10). Jose publica:
```bash
gh pr review <n> --approve --body-file .pr/review-<n>.md
# o
gh pr review <n> --request-changes --body-file .pr/review-<n>.md
```

---

## 2. Fase 0 · Entrar al repo y aprobar #1

```bash
# aceptar invitación de GitHub primero
git clone <url> && cd chess-predictor-pro
npm ci
git config core.hooksPath .githooks      # bloquea mensajes con atribución a Claude
cp .env.example .env.local               # valores reales: pedirlos a Mario por privado
```
Revisar PR #1 (§1.1): árbol de carpetas, CI, `.claude/settings.json`, que `npm run dev` arranque. Aprobar.
Esperar a que Mario haga merge → Fase 1.

---

## 3. Sistema visual del dashboard

Fuente: `docs/design/dashboard-claude-design.png` (diseño escogido en Claude Design; muestra el perfil **con partidas**, Sprint 3+). **Se sigue tal cual: paleta, barra superior y composición.** De la landing se toma el tono editorial: serif grande, etiquetas mono, detalles de ajedrez reales (notación, coordenadas del tablero), movimiento sobrio.

### 3.1 Paleta (tokens)

| Token | Hex | Uso |
|---|---|---|
| `paper` | `#f6efe3` | fondo de página |
| `vellum` | `#fbf8f1` | campos de formulario, panel lateral de edición |
| `ink` | `#2a1417` | texto principal, círculo del avatar |
| `ink-soft` | `#5c4a46` | texto secundario |
| `ink-faint` | `#74645d` | etiquetas (contraste ≥ 4.5:1 sobre `paper`) |
| `rule` | `#e2d6c5` | líneas divisorias |
| `sand` | `#dacbb8` | derrotas, raya de "sin dato" |
| `wine` | `#6e1e2b` | acento: cifra del ELO, victorias, subrayado del menú activo, botón principal |
| `wine-deep` | `#561621` | hover del acento |
| `wine-tint` | `#f0e7e2` | relleno de gráfica |
| `cream` | `#f5ece0` | texto sobre `wine` e `ink` |
| `danger` | `#a3341f` | errores de formulario |
| `ok` | `#3f6b45` | confirmaciones |

### 3.2 Tipografía
- **Display:** Cormorant Garamond (como el diseño). Números con cifras antiguas: `font-variant-numeric: oldstyle-nums`.
- **Texto:** Manrope.
- **Mono:** JetBrains Mono, para etiquetas en mayúsculas espaciadas y notación (`1. e4`).
- La landing usa las mismas tres fuentes (sustituyen a las de la referencia) para que la marca se lea como una sola.

### 3.3 Reglas de composición (obligatorias)
1. **Nada de tarjetas para agrupar.** Sin caja con borde + fondo + radio + sombra alrededor de cada bloque. Se agrupa con **espacio** y **líneas** (`border-t border-rule`).
2. **Todo vive sobre `paper`.** Sin superficies de color. El acento es tipográfico: la cifra del ELO en `wine`, enorme.
3. Estadísticas como **texto grande + barras finas**, columnas separadas por una línea vertical (`border-l border-rule`), no cajas.
4. Navegación en **barra superior** clara: logo a la izquierda, menú centrado, usuario a la derecha, `border-b border-rule` debajo. **Sin barra lateral.**
5. Edición en **panel deslizante** desde la derecha (`<dialog>`), no en otra tarjeta debajo.
6. Radios pequeños (`rounded-md` en botones e inputs, `rounded-[3px]` en chips y celdas). Nada de `rounded-2xl` ni `rounded-full` en bloques.
7. Detalle de ajedrez real: notación en mono; etiquetas y ejes en mono (`12 sep`, `1500`).

---

## 4. Fase 1 · Tema y shell con barra superior (#6)

**Empezar:** `feature/s1-1-estructura-base` MERGED. **Rama:** `feature/s1-6-ui-shell`

### 4.1 `src/app/globals.css` (Tailwind v4)
```css
@import "tailwindcss";

@theme {
  --color-paper: #f6efe3;
  --color-vellum: #fbf8f1;
  --color-ink: #2a1417;
  --color-ink-soft: #5c4a46;
  --color-ink-faint: #74645d;
  --color-rule: #e2d6c5;
  --color-sand: #dacbb8;
  --color-wine: #6e1e2b;
  --color-wine-deep: #561621;
  --color-wine-tint: #f0e7e2;
  --color-cream: #f5ece0;
  --color-danger: #a3341f;
  --color-ok: #3f6b45;

  --font-display: var(--font-cormorant), 'Cormorant Garamond', Georgia, serif;
  --font-sans: var(--font-manrope), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
}

html { color-scheme: light; }
body { @apply bg-paper text-ink font-sans antialiased; }
:focus-visible { outline: 2px solid var(--color-wine); outline-offset: 3px; }

@utility eyebrow { @apply font-mono text-[11px] uppercase tracking-[.16em] text-ink-faint; }
@utility onum { font-variant-numeric: oldstyle-nums proportional-nums; }
@utility tnum { font-variant-numeric: tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; transition-duration: .01ms !important; }
}
```

### 4.2 Fuentes · `src/lib/fonts.ts`
```ts
import { Cormorant_Garamond, Manrope, JetBrains_Mono } from 'next/font/google';
export const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['400', '500', '600'], style: ['normal', 'italic'], variable: '--font-cormorant' });
export const manrope = Manrope({ subsets: ['latin'], variable: '--font-manrope' });
export const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains' });
```
`src/app/layout.tsx`: `<html lang="es" className={`${cormorant.variable} ${manrope.variable} ${jetbrains.variable}`}>` + `<Toaster />` de sonner:
```tsx
<Toaster position="bottom-right" toastOptions={{ style: { background: '#2a1417', color: '#f5ece0', border: 'none' } }} />
```

### 4.3 Navegación · `src/components/layout/nav.ts`
Menú plano, sin grupos ni iconos (como el diseño):
```ts
export type NavItem = { href: string; label: string; ready: boolean; sprint: number };
export const NAV: NavItem[] = [
  { href: '/dashboard/profile',     label: 'Perfil',       ready: true,  sprint: 1 },
  { href: '/dashboard/play',        label: 'Jugar',        ready: false, sprint: 2 },
  { href: '/dashboard/ai',          label: 'Contra la IA', ready: false, sprint: 4 },
  { href: '/dashboard/coach',       label: 'Coach',        ready: false, sprint: 5 },
  { href: '/dashboard/tournaments', label: 'Torneos',      ready: false, sprint: 6 },
  { href: '/dashboard/ranking',     label: 'Ranking',      ready: false, sprint: 6 },
];
```
Cada sprint cambia `ready: true` y crea su carpeta de ruta.

### 4.4 Barra superior · `src/components/layout/TopNav.tsx`
Logo `Chess Predictor` en display con *Pro* en itálica `wine` · menú centrado · usuario a la derecha · línea `rule` debajo. El ítem activo va en `ink` medio y con un subrayado `wine` de 2 px que pisa la línea inferior.
```tsx
'use client';
export function TopNav({ user }: { user?: { username: string } }) {
  const pathname = usePathname();
  return (
    <header className="border-b border-rule">
      <div className="mx-auto flex h-20 max-w-6xl items-center gap-8 px-4 sm:px-8 lg:px-14">
        <Link href="/" className="font-display text-[1.6rem] leading-none text-ink">
          Chess Predictor <em className="text-wine">Pro</em>
        </Link>

        <nav aria-label="Principal" className="mx-auto hidden md:block">
          <ul className="flex items-center gap-8">
            {NAV.map(it => <NavLink key={it.href} item={it} active={pathname.startsWith(it.href)} />)}
          </ul>
        </nav>

        <UserBlock user={user} className="hidden md:flex" />   {/* (Fase 5) */}
        <MobileMenu user={user} className="ml-auto md:hidden" />
      </div>
    </header>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const base = 'relative flex h-20 items-center text-[15px]';
  if (!item.ready) return (
    <li><span aria-disabled="true" title={`Disponible en el Sprint ${item.sprint}`}
      className={`${base} cursor-not-allowed text-ink-faint`}>{item.label}</span></li>
  );
  return (
    <li><Link href={item.href} aria-current={active ? 'page' : undefined}
      className={`${base} transition-colors hover:text-ink ${active
        ? 'font-medium text-ink after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-wine'
        : 'text-ink-soft'}`}>
      {item.label}
    </Link></li>
  );
}
```

### 4.5 Móvil · `src/components/layout/MobileMenu.tsx`
- En `< md` la barra superior deja solo el logo y un botón `Menu` (lucide) a la derecha.
- El botón abre un `<dialog>` a pantalla completa sobre `paper` con el mismo `NAV` en lista vertical (`font-display text-3xl`, activo en `wine`) y `UserBlock` abajo. `Esc` y botón `X` cierran. Al navegar, cerrar.

### 4.6 Shell · `src/app/(frontend)/dashboard/layout.tsx`
```tsx
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopNav />
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-8 lg:px-14 lg:py-16">{children}</main>
    </div>
  );
}
```
`dashboard/page.tsx` → `redirect('/dashboard/profile')`.
`dashboard/profile/page.tsx` → por ahora solo `<h1 className="font-display text-6xl">Perfil</h1>`.

### 4.7 Componentes base · `src/components/ui/`
- `Button` — `primary`: `h-10 rounded-md bg-wine px-4 text-sm font-medium text-cream hover:bg-wine-deep` · `secondary`: `border border-ink/20 hover:border-ink/45` · `quiet`: texto `wine` con subrayado al hover. Prop `loading` → spinner + `disabled`.
- `Field` — label (`text-sm font-medium`) + control + pista (`text-xs text-ink-faint`) + error (`text-xs text-danger`, `id` enlazado con `aria-describedby`; control con `aria-invalid`).
- `Input` / `Textarea` / `Select` — `h-11 w-full rounded-md border border-rule bg-vellum px-3 text-ink placeholder:text-ink-faint focus:border-wine focus:outline-none focus:ring-2 focus:ring-wine/15 aria-[invalid=true]:border-danger`.
- `Section` (título display + dato a la derecha + `border-t border-rule pt-6`) · `Skeleton` (`animate-pulse rounded bg-rule`).
- **No crear `Card`.**

`.pr/commit-6.txt`
```
feat(ui): añadir tema, fuentes y shell del dashboard con barra superior

- tokens de la paleta del diseño escogido (paper, ink, wine, sand)
- Cormorant Garamond, Manrope y JetBrains Mono con next/font
- barra superior con menú por sprint y menú móvil
- componentes base: Button, Field, Input, Textarea, Select, Section

Refs #6
```
Título PR: `feat(ui): tema y shell del dashboard con barra superior`. Adjuntar captura desktop + móvil en el PR.

---

## 5. Fase 2 · Landing 3D (#7)

**Empezar:** #1 MERGED. **Rama:** `feature/s1-7-landing-3d`
Fuente: `docs/design/landing-reference.html`.

1. **CSS** → `src/app/(frontend)/_components/landing/landing.css`. Prefijar todo con `.landing ` (`.landing .nav`, `.landing .chapter`…). Quitar reglas de `html, body`. Fuentes → `var(--font-display)`, `var(--font-sans)`, `var(--font-mono)`. Borrar el `<link>` de Google Fonts. El contenedor `.landing` lleva su propio fondo oscuro (`#100c09`); su paleta (noche, marfil, latón) se queda solo en la landing.
2. **Markup** → `Landing.tsx` (`'use client'`), todo dentro de `<div className="landing" ref={rootRef}>`. `class`→`className`; `style="--w:.41"` → `style={{ '--w': 0.41 } as React.CSSProperties}`.
3. **Botones de acción** → `next/link`: "Crear cuenta" → `/register`, "Jugar ahora" → `/login`. Los de navegar secciones (`data-goto`) se quedan.
4. **Script** → `initLanding.ts`:
   ```ts
   import * as THREE from 'three';
   export function initLanding(root: HTMLElement, opts: { displayFont: string }): () => void {
     // cuerpo del IIFE de la referencia:
     //  document.querySelectorAll → root.querySelectorAll
     //  getElementById('stage')   → root.querySelector('canvas')
     //  window.THREE              → THREE (import); borrar <script> del CDN
     //  frameCanvas: ctx.font = `500 30px ${opts.displayFont}`
     //  guardar rafId en cada requestAnimationFrame
     //  fallback sin WebGL: clase 'static' en root, no en body
     return () => {
       cancelAnimationFrame(rafId);
       removeEventListener('scroll', readScroll);
       removeEventListener('resize', resize);
       scene.traverse(o => {
         const m = o as THREE.Mesh;
         m.geometry?.dispose();
         (Array.isArray(m.material) ? m.material : [m.material]).forEach(mt => {
           (mt as THREE.MeshStandardMaterial | undefined)?.map?.dispose(); mt?.dispose();
         });
       });
       renderer.dispose();
     };
   }
   ```
5. **Montar**:
   ```tsx
   useEffect(() => {
     if (!rootRef.current) return;
     return initLanding(rootRef.current, { displayFont: cormorant.style.fontFamily });
   }, []);
   ```
   React monta dos veces en dev (Strict Mode). Verificar en DevTools que hay **1 solo `<canvas>`**.
6. `src/app/(frontend)/page.tsx` → `<Landing />` + `export const metadata = { title: 'Chess Predictor Pro' }`.

Revisar: scroll ida y vuelta, la apertura se juega, flechas en "Predicción", móvil 390 px sin scroll horizontal, `prefers-reduced-motion` sin inercia.

`.pr/commit-7.txt`
```
feat(landing): portar landing con recorrido 3D del tablero

- escena three.js 0.149 montada en useEffect con limpieza completa
- capítulos por scroll: arena, contra la IA, predicción, coach, torneos
- CTAs a /register y /login; fallback sin WebGL

Refs #7
```
Título PR: `feat(landing): landing con recorrido 3D`. Adjuntar GIF corto o capturas.

---

## 6. Fases 3 y 4 · Cliente API, auth y perfil

### 6.1 Cliente y mocks (inicio de Fase 3)

`src/lib/apiClient.ts`
```ts
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string,
              public fields?: Record<string, string[]>) { super(message); }
}
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`/api/v1${path}`, {
    ...init, credentials: 'same-origin',
    headers: { 'content-type': 'application/json', ...init.headers },
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(res.status, body.error?.code ?? 'UNKNOWN',
    body.error?.message ?? 'Algo salió mal. Intenta de nuevo.', body.error?.fields);
  return body as T;
}
```

`src/modules/auth/presentation/api/authApi.ts`
```ts
export interface AuthApi {
  register(i: RegisterInput): Promise<{ user: PublicUser }>;
  login(i: LoginInput): Promise<{ user: PublicUser }>;
  logout(): Promise<void>;
  me(): Promise<{ user: { id: string; username: string } }>;
}
const http: AuthApi = {
  register: i => apiFetch('/auth/register', { method: 'POST', body: JSON.stringify(i) }),
  login:    i => apiFetch('/auth/login',    { method: 'POST', body: JSON.stringify(i) }),
  logout:   () => apiFetch('/auth/logout',  { method: 'POST' }),
  me:       () => apiFetch('/auth/me'),
};
const wait = () => new Promise(r => setTimeout(r, 400));
const mock: AuthApi = {
  async register(i) { await wait();
    if (i.username === 'taken') throw new ApiError(409, 'USERNAME_TAKEN', 'Ese usuario ya existe', { username: ['No disponible'] });
    return { user: { id: 'mock', email: i.email, username: i.username } }; },
  async login(i) { await wait();
    if (i.password !== 'Demo1234') throw new ApiError(401, 'INVALID_CREDENTIALS', 'Correo o contraseña incorrectos');
    return { user: { id: 'mock', email: i.email, username: 'demo' } }; },
  async logout() { await wait(); },
  async me() { return { user: { id: 'mock', username: 'demo' } }; },
};
export const authApi = process.env.NEXT_PUBLIC_API_MOCK === '1' ? mock : http;
```
`src/modules/dashboard/presentation/api/profileApi.ts`: igual, `get()` y `update(patch)`. El mock guarda en memoria el JSON de §10 y lanza 409 si `username === 'taken'`.

**Contratos:**
- `feature/s1-2-core-jwt` MERGED → importar de `@/modules/auth/infrastructure/dto/authSchemas` y `@/modules/dashboard/infrastructure/dto/profileSchemas`.
- No MERGED → copiar el contrato §10 a `src/lib/contracts.tmp.ts` (**otro nombre**, así no choca con el archivo de Mario). Al entrar #2: cambiar imports y borrar el temporal en el mismo commit.

**Mocks:** `NEXT_PUBLIC_API_MOCK=1` en `.env.local` hasta que entre la API real. Cuando entra el `proxy.ts` de Mario (#4), `/dashboard` sin cookie real redirige a `/login` → apagar mocks del todo.

### 6.2 Fase 3 · Login y registro (#8)

**Empezar:** #6 MERGED. **Abrir PR:** `feature/s1-3-auth-api` MERGED. **Rama:** `feature/s1-8-auth-ui`

Rutas: `src/app/(frontend)/(auth)/layout.tsx`, `login/page.tsx`, `register/page.tsx`.

Layout dividido:
```text
lg ┌──────────────── ink ────────────────┬──────── paper ────────┐
   │ tablero wine/transparente al 20 %   │  formulario max-w-sm  │
   │ "Cada partida empieza               │                       │
   │  con una jugada."  (Cormorant it.)  │                       │
   │ 1. e4                (mono, sand)   │                       │
   └─────────────────────────────────────┴───────────────────────┘
móvil: solo la columna paper, con una franja ink de 56 px arriba con el logo
```
Tablero sin imágenes:
```css
background: repeating-conic-gradient(var(--color-wine) 0 25%, transparent 0 50%) 0 0 / 64px 64px;
```

`RegisterForm.tsx`
```tsx
'use client';
export function RegisterForm() {
  const router = useRouter();
  const { register, handleSubmit, setError, formState: { errors, isSubmitting } } =
    useForm<RegisterInput>({ resolver: zodResolver(RegisterSchema), mode: 'onBlur' });

  const onSubmit = handleSubmit(async values => {
    try {
      await authApi.register(values);
      router.replace('/dashboard/profile');
      router.refresh();
    } catch (e) {
      if (e instanceof ApiError && e.fields)
        Object.entries(e.fields).forEach(([k, v]) => setError(k as keyof RegisterInput, { message: v[0] }));
      else setError('root', { message: e instanceof ApiError ? e.message : 'Sin conexión. Intenta de nuevo.' });
    }
  });
  // título "Crear cuenta" (display) · correo · usuario (pista "3–20: letras, números y _")
  // contraseña con mostrar/ocultar (pista "Mínimo 8, con una letra y un número")
  // botón primario "Crear cuenta" · separador "o" · <GoogleButton/>
  // "¿Ya tienes cuenta? Entrar" → /login
}
```
`LoginForm.tsx`: igual con `LoginSchema`. Error 401 → mensaje arriba del formulario. Después de entrar:
```ts
const next = searchParams.get('next');
router.replace(next?.startsWith('/dashboard') ? next : '/dashboard/profile');   // nunca a URLs externas
```
`?error=oauth` → aviso arriba: "No se pudo entrar con Google. Intenta de nuevo o usa tu correo."
`useSearchParams` → envolver el form en `<Suspense>` en la página (si no, falla el build).

`GoogleButton.tsx`: `<a href="/api/v1/auth/oauth/google">` estilo `secondary`, ancho completo, texto "Continuar con Google", logo según la guía de marca de Google. Es un `<a>`, no `fetch`.

Títulos: "Entrar · Chess Predictor Pro", "Crear cuenta · Chess Predictor Pro".

`.pr/commit-8.txt`
```
feat(auth): añadir pantallas de login y registro conectadas a la API

- formularios con react-hook-form y los contratos zod compartidos
- errores por campo (400/409) y generales (401, red)
- redirección segura con ?next y aviso de error de Google

Refs #8
```
Título PR: `feat(auth): pantallas de login y registro`.

### 6.3 Fase 4 · Perfil (#9)

**Empezar:** #6 MERGED. **Abrir PR:** `feature/s1-4-profile-api` MERGED. **Rama:** `feature/s1-9-profile-ui`

`hooks/useProfile.ts`
```ts
export function useProfile() {
  const router = useRouter();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const load = useCallback(() => {
    setError(null);
    profileApi.get().then(r => setProfile(r.profile)).catch(e => {
      if (e instanceof ApiError && e.status === 401) router.replace('/login?next=/dashboard/profile');
      else setError('No pudimos cargar tu perfil.');
    });
  }, [router]);
  useEffect(load, [load]);
  return { profile, setProfile, error, retry: load };
}
```

**Composición de la página (Sprint 1, mismo orden que `docs/design/dashboard-claude-design.png`, con datos en 0):**
```text
PERFIL · DEMO@CHESSPREDICTOR.DEV  (eyebrow)                        ELO ACTUAL (eyebrow)
demo                (Cormorant, enorme)                             1200  (wine, onum, enorme)
Usuario Demo · Colombia · Miembro desde octubre de 2026             Sin partidas todavía
✎ Editar perfil  (quiet)
──────────────────────────────────────────────────────────────────────── (border-t rule)
0 PARTIDAS                          — de victorias │ PRECISIÓN SEGÚN EL COACH
0 victorias                          derrotas 0    │ ───  (raya sand)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │ Aparece cuando el coach haya
(barra vacía en rule)                              │ revisado tus partidas.
────────────────────────────────────────────────────────────────────────
Evolución de Elo                                            ÚLTIMOS 30 DÍAS
1500 ─────────────────────────────────────────────────────── (ejes en mono)
1200 - - - - - - - - - - - - - - - - - - - - - - - - - - - -  (línea discontinua)
"Tu curva empieza con tu primera partida."
────────────────────────────────────────────────────────────────────────
Últimas partidas                                       ▮ Victoria  ▮ Derrota
[ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ][ ]  (20 celdas vacías)
Más antigua                                            Racha actual · —
```

`ProfileHeader.tsx`
```tsx
<header className="grid gap-10 pb-14 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
  <div className="min-w-0">
    <p className="eyebrow">Perfil · {profile.email}</p>
    <h1 className="mt-4 break-words font-display text-[clamp(4rem,12vw,9rem)] leading-[.85] tracking-[-.02em]">
      {profile.username}
    </h1>
    <p className="mt-6 text-ink-soft">{[profile.displayName, countryName, `Miembro desde ${fecha}`].filter(Boolean).join(' · ')}</p>
    <Button variant="quiet" className="mt-6" onClick={openEditor}><Pencil size={14} aria-hidden /> Editar perfil</Button>
  </div>
  <EloFigure elo={profile.eloRating} games={profile.stats.gamesPlayed} />
</header>
```
- `EloFigure` (sin fondo ni caja, alineado a la derecha en `lg`): `eyebrow` "ELO actual" · número `font-display onum text-wine text-[clamp(5rem,12vw,9.5rem)] leading-none mt-6` · línea `text-sm text-ink-soft`: "Sin partidas todavía" (Sprint 3+: triángulo `wine` + "**+250** en los últimos 30 días").
- Fecha: `new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' })` → "octubre de 2026". País: `new Intl.DisplayNames(['es'], { type: 'region' }).of(code)`.
- Si hay `avatarUrl`, mostrarlo con `<img>` 56 px redondo junto al eyebrow (no `next/image`, así no hay que configurar dominios).

`RecordSection.tsx` (partidas + precisión; sin cajas, columnas separadas por una línea vertical)
```tsx
<section className="grid gap-10 border-t border-rule pt-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)] lg:gap-0">
  <div className="lg:pr-12">
    <div className="flex items-baseline justify-between">
      <p className="eyebrow">{gamesPlayed} partidas</p>
      <p className="text-sm text-ink-soft"><b className="font-semibold text-ink">{gamesPlayed ? `${winRate} %` : '—'}</b> de victorias</p>
    </div>
    <div className="mt-8 flex items-end justify-between">
      <p><span className="font-display onum text-[4.5rem] leading-none text-wine">{wins}</span><span className="ml-3 text-ink-soft">victorias</span></p>
      <p><span className="mr-3 text-ink-soft">derrotas</span><span className="font-display onum text-[4.5rem] leading-none text-ink-faint">{losses}</span></p>
    </div>
    <div aria-hidden className="mt-3 flex h-1.5 gap-1">
      {gamesPlayed
        ? <><div className="bg-wine" style={{ flexGrow: wins }} /><div className="bg-sand" style={{ flexGrow: losses }} /></>
        : <div className="flex-1 bg-rule" />}
    </div>
  </div>
  <div className="lg:border-l lg:border-rule lg:pl-12">
    <p className="eyebrow">Precisión según el coach</p>
    <div aria-hidden className="mt-12 h-0.5 w-20 bg-sand" />
    <p className="mt-10 max-w-xs text-ink-soft">Aparece cuando el coach haya revisado tus partidas.</p>
  </div>
</section>
```

Secciones inferiores, **a todo el ancho y una debajo de otra** (`mt-14 space-y-14`), cada una con `Section` (título `font-display text-[2.5rem]`, dato a la derecha en `eyebrow`, `border-t border-rule pt-8`).
- `EloChart` vacío: SVG `viewBox="0 0 1200 300"`, líneas horizontales `rule` con etiquetas mono (`1500`, `1400`, `1300`, `1200`), línea `stroke-dasharray="4 6"` en `ink-faint` sobre 1200, texto "Tu curva empieza con tu primera partida." Dato a la derecha: "Últimos 30 días".
- `ResultsStrip` vacío: `flex gap-2`, 20 celdas `h-14 flex-1 rounded-[2px] border border-dashed border-sand`; leyenda arriba a la derecha con raya `bg-wine` "Victoria" y raya `bg-sand` "Derrota"; pie en mono `text-xs text-ink-faint`: "Más antigua" a la izquierda, "Racha actual · —" a la derecha.

Cargando → `Skeleton` con la misma forma (nombre, cifra del ELO, bloque de partidas). Error → texto + botón "Reintentar" (`retry`).

`EditProfileSheet.tsx` — `<dialog>` que sale por la derecha
```tsx
<dialog ref={ref} aria-labelledby="edit-title"
  className="m-0 ml-auto h-dvh max-h-dvh w-full max-w-md bg-vellum p-0 text-ink backdrop:bg-ink/40">
  <form onSubmit={onSubmit} className="flex h-full flex-col">
    <header className="flex items-center justify-between border-b border-rule px-6 py-5">
      <h2 id="edit-title" className="font-display text-3xl">Editar perfil</h2>
      <button type="button" onClick={close} aria-label="Cerrar"><X size={18} /></button>
    </header>
    <div className="flex-1 divide-y divide-rule overflow-y-auto px-6">
      {/* cada Field en py-5: Nombre visible · Usuario · País · Bio (contador n/160) · URL de avatar */}
    </div>
    <footer className="flex justify-end gap-3 border-t border-rule px-6 py-4">
      <Button variant="secondary" type="button" onClick={discard}>Descartar</Button>
      <Button type="submit" loading={isSubmitting} disabled={!isDirty}>Guardar cambios</Button>
    </footer>
  </form>
</dialog>
```
- Abrir: `ref.current?.showModal()`. `Esc` cierra (nativo). Foco inicial en "Nombre visible".
- País (`<select>`): Colombia CO, Argentina AR, Chile CL, Ecuador EC, España ES, Estados Unidos US, México MX, Perú PE, Venezuela VE, "Sin especificar" → `null`.
- Enviar **solo** campos cambiados (`dirtyFields`). Texto vacío → `null`.
- OK → `setProfile(r.profile)`, `reset(r.profile)`, cerrar, `toast.success('Perfil actualizado')`.
- 409 → error en Usuario "No disponible". 400 → errores por campo. 401 → `/login`.
- Si cambia el username, Mario reemite la cookie. Nada extra.

`.pr/commit-9.txt`
```
feat(profile): mostrar y editar el perfil del usuario

- cabecera con nombre en display y cifra de ELO en vino
- bloque de partidas y precisión sin tarjetas; estados vacíos de gráfica e historial
- panel lateral de edición con envío solo de campos cambiados
- estados de carga, error y 401

Refs #9
```
Título PR: `feat(profile): vista y edición del perfil`. Capturas desktop + móvil.

---

## 7. Fase 5 · Sesión en la UI (#10)

**Empezar:** #8 MERGED. **Abrir PR:** `feature/s1-5-oauth-google` MERGED (para probar Google de punta a punta). **Rama:** `feature/s1-10-session-ui`

- `UserBlock` (derecha de la barra superior y abajo del menú móvil), como el diseño: inicial en círculo `size-10 rounded-full bg-ink text-cream font-display` (o avatar), al lado `username` en `text-sm font-medium` y debajo el enlace "Cerrar sesión" (`text-xs text-ink-soft underline`).
  Datos: `authApi.me()` + `profileApi.get()` (o un contexto `SessionProvider` en el layout del dashboard que cargue el perfil una vez y lo compartan TopNav y página).
- Cerrar sesión:
  ```ts
  await authApi.logout();
  router.replace('/login');
  router.refresh();
  ```
- Cualquier 401 en el dashboard → `/login?next=<ruta actual>`.
- Pulir: 390 px y 1440 px sin scroll horizontal · Tab recorre todo con foco visible · `Esc` cierra menú y panel · sin errores en consola · `<title>` por página ("Perfil · Chess Predictor Pro").

`.pr/commit-10.txt`
```
feat(ui): gestionar la sesión en el dashboard

- bloque de usuario con cierre de sesión en barra superior y menú móvil
- redirección a login ante 401 conservando la ruta
- ajustes de accesibilidad y móvil

Refs #10
```
Título PR: `feat(ui): sesión, cierre de sesión y ajustes móviles`.

---

## 8. Fase 6 · Release (Día 10)

Mario abre `release/v0.1.0`. Desde ahí, **solo arreglos**:
```bash
git fetch origin
git switch -c bugfix/s1-<N>-<slug> origin/release/v0.1.0
```
(Crear antes un issue `type:bug` para tener `<N>`.) PR con `--base release/v0.1.0`. Commit tipo `fix(<ámbito>): ...`.
Revisar y aprobar el PR del release a `main` y el back-merge `main` → `develop`.

---

## 9. Para después: diseño completo del dashboard (Sprint 3 en adelante)

El diseño escogido muestra datos que aún no existen. **No implementar ahora**; dejar los huecos listos:

| Elemento del diseño | Sprint | Qué cambia |
|---|---|---|
| Logros ("Primera victoria", "Racha de 5", "Top 100") | 3 y 6 | texto `font-display italic text-2xl` bajo el nombre, separados por un punto `·` en `sand` (sin chips ni bordes) |
| "▲ +250 en los últimos 30 días" bajo la cifra del ELO | 3 | delta desde el historial de ELO |
| Barra victorias/derrotas | 3 | proporción real `wine` / `sand` y "68 % de victorias" |
| Evolución de Elo | 3 | `EloChart` con datos: área `wine-tint` + línea `wine` 1.5 px, SVG propio (sin librería); ejes en mono, fechas abajo (`12 sep`, `27 sep`, `12 oct · hoy`), punto final marcado |
| Últimas N partidas | 3 | `ResultsStrip` con datos: victoria = barra alta `bg-wine`, derrota = barra corta (⅓ de alto, pegada abajo) `bg-sand`; tooltip con rival y fecha; pie "Racha actual · 5 victorias" |
| Precisión según el coach | 5 | valor desde el AI Coach en lugar de la raya |
| Menú superior | 2–6 | cada sprint pasa su ítem a `ready: true` |

---

## 10. Contrato API (idéntico en el .md de Mario)

Base `/api/v1`. JSON. Sesión = cookie httpOnly `cpp_session` (la pone y la quita el servidor; el front **no** la lee ni la guarda). Nada en `localStorage`.

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

`profile` (también es el mock):
```json
{
  "id": "uuid", "email": "demo@chesspredictor.dev", "username": "demo",
  "displayName": "Usuario Demo", "avatarUrl": null, "country": "CO", "bio": null,
  "eloRating": 1200, "authProvider": "local", "createdAt": "2026-10-20T15:00:00Z",
  "stats": { "gamesPlayed": 0, "wins": 0, "losses": 0, "draws": 0, "winRate": 0, "currentStreak": 0, "bestElo": 1200 }
}
```
Reglas: username 3–20 `[a-zA-Z0-9_]` · password ≥ 8 con letra y número · displayName ≤ 40 · bio ≤ 160 · country ISO-2 · avatarUrl https · PATCH con campos extra (`eloRating`, `email`) → 400.

---

## 11. Prueba manual (con backend real)

- [ ] `/` landing completa ida y vuelta, 1 solo canvas
- [ ] "Crear cuenta" → `/register`
- [ ] Registro con datos malos → errores por campo sin llamar a la API
- [ ] Correo repetido → error en el campo correo
- [ ] Registro OK → perfil con stats en 0 y ELO 1200
- [ ] Editar nombre, país, bio → toast → recargar → se mantiene
- [ ] Usuario `demo` → "No disponible"
- [ ] Cerrar sesión → `/login`
- [ ] `/dashboard/profile` sin sesión → `/login?next=...` → entrar → vuelve al perfil
- [ ] Clave mala → mensaje arriba
- [ ] `demo@chesspredictor.dev` / `Demo1234` → perfil demo
- [ ] Continuar con Google → perfil con foto
- [ ] Con sesión, `/login` → redirige al perfil
- [ ] Móvil 390 px: landing, login, perfil, menú
- [ ] Ninguna tarjeta-caja ni superficie de color; navegación arriba, sin barra lateral

## 12. Hecho cuando (Sprint 1)
- [ ] Checklist §11 completo
- [ ] Mocks apagados y `contracts.tmp.ts` borrado
- [ ] Token fuera de JS y de `localStorage`
- [ ] `npm run lint`, `typecheck`, `test`, `build` y CI verdes
- [ ] Issues #6–#10 cerrados por sus PR
- [ ] Ningún commit o PR con atribución a IA

## 13. Demo (parte de Jose)
1. `/` → recorrido completo de la landing.
2. "Crear cuenta" → registro → perfil (barra superior, ELO en vino, estadísticas en 0).
3. "Editar perfil" → cambiar nombre, país y bio → guardar → recargar → persiste.
4. Usuario `demo` → "No disponible".
5. Cerrar sesión → abrir `/dashboard/profile` → redirige a login.
6. "Continuar con Google" → perfil con foto.
7. DevTools en móvil → mismo flujo con el menú móvil.
