# Sprint 2 · Dev 2 · Jose · Frontend · 3D, movimiento, personalización y Jugar

> **Para Claude Code (en la máquina de Jose).** Lee primero `CLAUDE.md`, `docs/git-flow.md` y esta guía completa.
> Trabajas para **Jose**. Haz las fases **en orden**. Antes de cada fase revisa sus dependencias (casi todas son PRs de Mario). Al terminar: checks, mensajes en `.pr/` y bloque **ACCIÓN DEL DEV**.
>
> **Reglas que no se rompen**
> 1. **Nunca** ejecutes `git commit`, `git push`, `git merge`, `git rebase`, `git tag`, `gh pr create`, `gh pr merge`, `gh pr review` ni `gh release create`. Los ejecuta Jose.
> 2. Escribe el mensaje del commit en `.pr/commit-<issue>.txt` y el del PR en `.pr/PR-<issue>.md`. Después avisa a Jose con el bloque ACCIÓN DEL DEV.
> 3. **Sin atribución:** nada de `Co-Authored-By`, "Generated with Claude Code" ni enlaces de sesión.
> 4. No leas `.env` ni `.env.local`.
> 5. **No cambies el contrato API** (§14). Si algo no cuadra, para y dile a Jose que hable con Mario.

**Fechas:** lunes 26 → sábado 31 de octubre de 2026 · **Release:** `v0.2.0`

**Meta del sprint**
1. **Escenas 3D con three.js en todas las pantallas**, con las mismas piezas de la landing:
   - **Login:** tablero 3D jugable.
   - **Perfil:** pieza 3D que gira sobre un pedestal.
   - **Jugar:** escenario 3D que cambia en cada paso de la búsqueda.
2. **Jugar:** elegir ritmo → "Buscando rival…" → "Partida encontrada" → cuenta atrás → página de la partida.
3. **Perfil personalizable y guardado en la cuenta:**
   - tema, color de acento, pieza 3D y material;
   - orden del encabezado;
   - orden y visibilidad de las secciones.
   - La **Evolución de Elo se abre con un botón**.
4. **Movimiento con criterio:** contadores, gráfica que se dibuja, transiciones. Solo `transform`/`opacity`.
5. **Optimizado:** three.js carga después del primer pintado, renderiza solo cuando hace falta y se pausa fuera de pantalla. Lighthouse ≥ 85 en escritorio en las rutas con 3D.
6. **Sin el botón "N"** de Next.js en la esquina.

**Referencia visual (obligatoria):** canvas **"Sprint 2 · Vistas de referencia"** (pídele el enlace a Mario). Ábrelo en modo **Play** para ver la interacción real:
- *Login · tablero 3D*
- *Perfil · personalizable*
- *Jugar · búsqueda en 3D*

Esta guía las traduce a código de producción. `docs/design/DESIGN.md` aporta la estructura (espacio, escala tipográfica, botones píldora, bandas alternas); los colores son los nuestros.

---

## 0. Mapa del sprint

Los números de issue los crea Mario en su Fase 0. Aquí van como `<N-…>`; usa los reales (`gh issue list --assignee @me --milestone "Sprint 2 · Matchmaking"`).

| Fase | Issue | Rama | Para empezar | Para abrir el PR |
|---|---|---|---|---|
| 0 | — | — | issues del Sprint 2 creados | — (revisar PR `errores-http` de Mario) |
| 1 | #29 | `feature/s2-29-movimiento-cabecera-temas` | Fase 0 | — |
| 2 | #30 | `feature/s2-30-kit-3d` | Fase 0 | — |
| 3 | #31 | `feature/s2-31-jugar-3d` | #29 y #30 MERGED · contratos #25 (o temporales) | #26 MERGED |
| 4 | #32 | `feature/s2-32-login-tablero-3d` | #30 MERGED | — |
| 5 | #33 | `feature/s2-33-perfil-3d` | #29 y #30 MERGED | — |
| 6 | #34 | `feature/s2-34-personalizar-perfil` | #33 MERGED · contratos de preferencias (#25) | #28 MERGED |
| 7 | #35 | `feature/s2-35-landing-optimizada` | #30 MERGED | — |
| 8 | — | `bugfix/s2-<N>-<slug>` | `release/v0.2.0` abierto | — |

### Plan por días

| Día | Fecha | Jose | Mario (para saber qué esperar) |
|---|---|---|---|
| 1 | lun 26 oct | Fase 1 (movimiento, cabecera, temas, indicador apagado) · empezar Fase 2 | Issues + errores HTTP |
| 2 | mar 27 oct | Fase 2 (kit 3D, PR) · Fase 3 con mocks | BD y contratos (matchmaking + preferencias) |
| 3 | mié 28 oct | Fase 4 (login con tablero 3D) | API de matchmaking |
| 4 | jue 29 oct | Fase 3 con API real → PR · Fase 5 (perfil 3D) | Tests + bots |
| 5 | vie 30 oct | Fase 6 (personalizar, con la API de preferencias) · Fase 7 si da tiempo | API de preferencias · integración |
| 6 | sáb 31 oct | Bugfix del release · ensayo | Release `v0.2.0` |

**Prioridad si el tiempo no alcanza:** la Fase 7 (landing) pasa al Sprint 3. Las Fases 1–6 son las que se presentan.

---

## 1. Protocolo de Claude Code (cada fase)

**Al empezar:**
```bash
git status                                                  # limpio
git fetch origin
gh pr view <rama-dependencia> --json state -q .state        # MERGED / OPEN / no existe
gh pr list --search "review-requested:@me" --state open     # PRs de Mario esperando a Jose
```
- PRs de Mario esperando → avisar primero y ofrecer revisarlo (§1.1).
- Dependencia **para empezar** sin MERGED → **PARAR**:
  ```
  ⏸ ESPERANDO (Jose)
  Falta: <rama> de Mario · estado: <OPEN/APPROVED/sin abrir>
  Mientras tanto puedes: <otra fase sin esa dependencia o revisar PRs>
  ```
- Dependencia **para abrir PR** sin MERGED → trabajar con mocks y, al terminar, **no** preparar el PR. Avisar: "Fase lista con mocks. Espero `<rama>` de Mario para conectar la API real."
- Todo bien → crear la rama vinculada al issue (pedir "sí"):
  ```bash
  git switch develop && git pull
  gh issue develop <N> --base develop --name <rama> --checkout
  ```

**Cuando entra en `develop` algo de Mario que necesitas:**
```
──────── ACCIÓN DEL DEV (Jose) ────────
Estado: entró <rama de Mario> en develop. Hay que traerlo a tu rama.
1) git add -A && git commit -F .pr/commit-<N>.txt     (guarda tu avance)
2) git merge origin/develop                            (conflictos → dime y te ayudo)
Después: dime "listo" y sigo (quito mocks / uso los contratos reales).
────────────────────────────────────────
```

**Al terminar la fase:**
1. `npm run lint && npm run typecheck && npm test && npm run build`. Si algo falla, arréglalo.
2. Producción local: `npm start` tras el build. Revisar consola y, si la fase toca UI, Lighthouse (§3.5).
3. Escribir `.pr/commit-<N>.txt` y `.pr/PR-<N>.md` con `Closes #<N>`, GIF o capturas y números de Lighthouse.
4. Bloque (Claude Code **no** ejecuta ninguno de estos comandos; los ejecuta Jose):
   ```
   ──────── ACCIÓN DEL DEV (Jose) ────────
   Estado: <qué quedó listo> · lint, typecheck, test y build OK · Lighthouse <n>.
   1) Revisa:   git status && git diff --stat
   2) Commit:   git add -A && git commit -F .pr/commit-<N>.txt
   3) Push:     git push -u origin <rama>
   4) PR:       gh pr create --base develop --title "<título>" --body-file .pr/PR-<N>.md
   5) Avisa a Mario: "PR listo para revisión: <rama>"
   Después: cuando Mario apruebe y CI esté verde → gh pr merge <rama> --merge
            git switch develop && git pull
   ────────────────────────────────────────
   ```
5. Si la fase quedó con mocks porque falta la API de Mario, el bloque llega solo hasta el paso 3 (commit y push de la rama) y termina con: "PR pendiente: espero `<rama de Mario>`."

### 1.1 Revisar un PR de Mario
```bash
gh pr diff <n> && gh pr checks <n>
gh pr checkout <n> && npm ci && npm run dev     # probar si toca
```
Claude Code escribe `.pr/review-<n>.md` (qué está bien · qué cambiar con archivo:línea · si cambia el contrato §14). Jose publica con `gh pr review <n> --approve --body-file .pr/review-<n>.md` (o `--request-changes`).

---

## 2. Sistema visual v2 con temas

### 2.1 Qué se toma de `DESIGN.md` y cómo se traduce

| En DESIGN.md | En Chess Predictor Pro |
|---|---|
| Fondo blanco / banda gris alternadas, **sin líneas divisorias** | `paper` / `band` del tema activo, alternadas según el orden visible de las secciones |
| Texto principal y secundario | `ink`, `ink-soft`, `ink-faint` del tema |
| Un único acento **solo para el botón principal** | `accent`: el color que eligió el usuario (por defecto vino `#6e1e2b`). Solo en el botón principal relleno y en datos destacados |
| Enlaces con "›" | Color `accent`, subrayado solo en hover |
| Titulares gigantes con interletrado negativo | Cormorant Garamond 600, 80–168 px, `letter-spacing -0.02em…-0.03em` |
| Cuerpo 17 px, `line-height 1.47` | Manrope 17 px, `line-height 1.47`, `letter-spacing -0.01em` |
| Botones píldora sin sombra | `rounded-full`, alto 44–56 px, sin sombra |
| Tarjetas de 28 px | **No usamos tarjetas para agrupar texto.** 28 px solo enmarca **medios 3D**: tablero del login, escenario de Jugar |
| Barra superior pegajosa con desenfoque | Cabecera de 60 px; con scroll pasa a `paper/82` + `backdrop-blur 20px` |
| 100–120 px de aire entre secciones, ancho 1200 px | `py-[96px]` escritorio, `py-16` móvil, `max-w-[1200px]` |
| Sin sombras | Igual. Solo el tooltip de la gráfica lleva fondo `ink` |

### 2.2 Temas y acentos (los mismos de la vista "Perfil · personalizable")
`src/modules/dashboard/presentation/theme/themes.ts`
```ts
import type { ACCENTS, SECTION_IDS, THEMES } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';

export type ThemeId = (typeof THEMES)[number];
export type AccentId = (typeof ACCENTS)[number];

export const THEME_LABEL: Record<ThemeId, string> = { pergamino: 'Pergamino', noche: 'Noche', salvia: 'Salvia', pizarra: 'Pizarra' };
export const ACCENT_LABEL: Record<AccentId, string> = { vino: 'Vino', laton: 'Latón', bosque: 'Bosque', oceano: 'Océano', tinta: 'Tinta' };

/** Colores del acento: versión para temas claros y para el tema oscuro (mismo tono, contraste suficiente). */
export const ACCENT_HEX: Record<AccentId, { light: string; dark: string }> = {
  vino:   { light: '#6e1e2b', dark: '#d0697a' },
  laton:  { light: '#86561c', dark: '#d9a35c' },
  bosque: { light: '#2f5d46', dark: '#7fbf9c' },
  oceano: { light: '#244f7a', dark: '#86b2e0' },
  tinta:  { light: '#2a1417', dark: '#efe5d2' },
};

/** Colores que usa la escena 3D del perfil para el pedestal, según el tema. */
export const THEME_3D: Record<ThemeId, { tileL: string; tileD: string; frame: string; dark: boolean }> = {
  pergamino: { tileL: '#efe4d3', tileD: '#c9b08e', frame: '#4a2c24', dark: false },
  noche:     { tileL: '#d6bd91', tileD: '#5b3a24', frame: '#2c1b10', dark: true },
  salvia:    { tileL: '#e9eee2', tileD: '#9fb197', frame: '#2c3b30', dark: false },
  pizarra:   { tileL: '#e7ebf1', tileD: '#9aa6b8', frame: '#1f2937', dark: false },
};

export type SectionId = (typeof SECTION_IDS)[number];
export const SECTION_LABEL: Record<SectionId, string> = { rend: 'Rendimiento', elo: 'Evolución de Elo', forma: 'Últimas partidas', next: 'Siguiente partida' };

export const accentHex = (theme: ThemeId, accent: AccentId) => (THEME_3D[theme].dark ? ACCENT_HEX[accent].dark : ACCENT_HEX[accent].light);
```

### 2.3 Tokens · `src/app/globals.css` (Tailwind v4, reemplaza el `@theme` del Sprint 1)
Los colores que cambian con el tema son **variables CSS** (`--t-*`). Las utilidades de Tailwind apuntan a ellas con `@theme inline`, y cambiar `data-theme` / `data-accent` en `<html>` recolorea toda la app sin re-render.
```css
@import "tailwindcss";

/* Colores con tema: las utilidades (bg-paper, text-ink, bg-accent…) leen estas variables */
@theme inline {
  --color-paper: var(--t-bg);
  --color-band: var(--t-band);
  --color-vellum: var(--t-panel);
  --color-ink: var(--t-ink);
  --color-ink-soft: var(--t-soft);
  --color-ink-faint: var(--t-faint);
  --color-muted: var(--t-muted);
  --color-rule: var(--t-rule);
  --color-loss: var(--t-loss);
  --color-accent: var(--t-acc);
  --color-on-accent: var(--t-on-acc);
}

/* Colores fijos */
@theme {
  --color-wine: #6e1e2b;          /* marca: landing y login */
  --color-wine-deep: #561621;
  --color-cream: #f5ece0;
  --color-wash: #e7dccb;
  --color-ember: #8a4b1f;
  --color-danger: #a3341f;
  --color-ok: #3f6b45;

  --font-display: var(--font-cormorant), 'Cormorant Garamond', Georgia, serif;
  --font-sans: var(--font-manrope), system-ui, sans-serif;
  --font-mono: var(--font-jetbrains), ui-monospace, monospace;
  --font-chess: var(--font-chess-symbols), 'Segoe UI Symbol', 'DejaVu Sans', serif;

  --text-display: 7rem;      --text-display--line-height: .9;   --text-display--letter-spacing: -0.025em;
  --text-heading-lg: 5rem;   --text-heading-lg--line-height: 1; --text-heading-lg--letter-spacing: -0.02em;
  --text-heading: 3.5rem;    --text-heading--line-height: 1.04; --text-heading--letter-spacing: -0.01em;
  --text-body: 1.0625rem;    --text-body--line-height: 1.47;    --text-body--letter-spacing: -0.01em;
  --text-caption: .875rem;   --text-caption--line-height: 1.3;

  --ease-out: cubic-bezier(.22, 1, .36, 1);
}

/* Temas */
:root, [data-theme="pergamino"] { --t-bg:#f6efe3; --t-band:#eee4d4; --t-panel:#fbf8f1; --t-ink:#2a1417; --t-soft:#5c4a46; --t-faint:#74645d; --t-muted:#a39282; --t-rule:#e2d6c5; --t-loss:#b8a58c; --t-on-acc:#fbf8f1; color-scheme: light; }
[data-theme="noche"]   { --t-bg:#14100d; --t-band:#1e1813; --t-panel:#1e1813; --t-ink:#efe5d2; --t-soft:#cbbca6; --t-faint:#a8977f; --t-muted:#6f6152; --t-rule:#3a2e24; --t-loss:#6a584a; --t-on-acc:#14100d; color-scheme: dark; }
[data-theme="salvia"]  { --t-bg:#eef1e9; --t-band:#e1e7d9; --t-panel:#f7f9f4; --t-ink:#1d2a21; --t-soft:#4a5a4e; --t-faint:#5f6f63; --t-muted:#98a69a; --t-rule:#cdd7c6; --t-loss:#a6b5a0; --t-on-acc:#fbf8f1; color-scheme: light; }
[data-theme="pizarra"] { --t-bg:#edf0f4; --t-band:#e1e6ed; --t-panel:#f7f9fb; --t-ink:#18212d; --t-soft:#465264; --t-faint:#5d6979; --t-muted:#98a3b2; --t-rule:#cbd3de; --t-loss:#a3aebd; --t-on-acc:#fbf8f1; color-scheme: light; }

/* Acentos: valor claro por defecto; el tema oscuro usa la versión clara del color */
:root { --t-acc: #6e1e2b; }
[data-accent="vino"]   { --t-acc: #6e1e2b; }  [data-theme="noche"][data-accent="vino"]   { --t-acc: #d0697a; }
[data-accent="laton"]  { --t-acc: #86561c; }  [data-theme="noche"][data-accent="laton"]  { --t-acc: #d9a35c; }
[data-accent="bosque"] { --t-acc: #2f5d46; }  [data-theme="noche"][data-accent="bosque"] { --t-acc: #7fbf9c; }
[data-accent="oceano"] { --t-acc: #244f7a; }  [data-theme="noche"][data-accent="oceano"] { --t-acc: #86b2e0; }
[data-accent="tinta"]  { --t-acc: #2a1417; }  [data-theme="noche"][data-accent="tinta"]  { --t-acc: #efe5d2; }

body { @apply bg-paper text-ink font-sans text-body antialiased; transition: background-color .5s, color .5s; }
:focus-visible { outline: 2px solid var(--t-acc); outline-offset: 3px; }

@utility eyebrow { @apply font-mono text-[11px] uppercase tracking-[.16em] text-ink-faint; }
/* Cifras grandes: SIEMPRE lining. Con oldstyle el 3, 4, 5, 7 y 9 de Cormorant bajan de la línea y tapan el texto de abajo (bug visto en la vista) */
@utility nums { font-variant-numeric: lining-nums tabular-nums; }

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after { animation-duration: .01ms !important; animation-iteration-count: 1 !important; transition-duration: .01ms !important; }
}

@keyframes rise { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: none; } }
@utility animate-rise { animation: rise .8s var(--ease-out) both; }

/* Paneles laterales con <dialog> nativo + transición CSS */
.sheet {
  margin: 0 0 0 auto; height: 100dvh; max-height: 100dvh; width: min(26rem, 100vw);
  border: 0; padding: 0; background: var(--t-panel); color: var(--t-ink);
  transform: translateX(100%);
  transition: transform .5s var(--ease-out), overlay .5s allow-discrete, display .5s allow-discrete;
}
.sheet[open] { transform: none; }
@starting-style { .sheet[open] { transform: translateX(100%); } }
.sheet::backdrop { background: rgb(20 12 10 / 0); transition: background .45s, overlay .45s allow-discrete, display .45s allow-discrete; }
.sheet[open]::backdrop { background: rgb(20 12 10 / .38); }
@starting-style { .sheet[open]::backdrop { background: rgb(20 12 10 / 0); } }
```
Reglas:
- En el **dashboard**, todo color sale de `paper/band/ink/ink-soft/ink-faint/muted/rule/loss/accent/on-accent`. Nunca un hex suelto.
- En **landing y login**, `wine` es fijo (sin tema).

### 2.4 Sin parpadeo de tema al cargar
El perfil llega por API después del primer pintado. Para no ver un flash del tema por defecto, la **última** preferencia conocida se guarda en `localStorage` (solo como caché; la verdad está en la API) y un script mínimo la aplica antes de pintar.
`src/app/layout.tsx`:
```tsx
<html lang="es" className={`${cormorant.variable} ${manrope.variable} ${jetbrains.variable} ${chessSymbols.variable}`} suppressHydrationWarning>
  <head>
    <script dangerouslySetInnerHTML={{ __html:
      "try{if(location.pathname.indexOf('/dashboard')===0){var p=JSON.parse(localStorage.getItem('cpp:prefs')||'null');if(p){var d=document.documentElement;d.dataset.theme=p.theme;d.dataset.accent=p.accent}}}catch(e){}" }} />
  </head>
  <body>…</body>
</html>
```

### 2.5 Componentes v2 (`src/components/ui/`)

| Componente | Estilo |
|---|---|
| `Button` `primary` | `h-12 px-7 rounded-full bg-accent text-on-accent font-medium transition-[filter,transform] hover:brightness-95 active:scale-[.98]` · uno por sección |
| `Button` `ghost` | `h-12 px-7 rounded-full shadow-[inset_0_0_0_1px_var(--t-ink)] hover:bg-band active:scale-[.98]` |
| `TextLink` | `text-accent hover:underline underline-offset-4` + `" ›"` |
| `Input` | `h-[52px] rounded-[14px] border border-rule bg-vellum px-4 focus:border-accent focus:outline-none` |
| `Band` | `<section>` a ancho completo, `bg-paper` o `bg-band`, `py-16 lg:py-[96px]`, hijo `mx-auto max-w-[1200px] px-5 lg:px-10` |
| `SectionTitle` | `font-display font-semibold text-heading` con punto final ("Rendimiento.") + subtítulo `text-ink-soft` |
| `BigNumber` | `font-display nums leading-[.9]` + etiqueta **debajo** con `mt-3`, nunca encima ni pegada |
| `Segmented` | grupo de `<input type="radio" className="peer sr-only">` + `<label>` píldora; seleccionado `bg-ink text-paper` |
| `Switch` | `<button role="switch" aria-checked>` 44×26 con perilla que se desliza (transform) |

**Prohibido:** `Card`, `shadow-*` salvo anillos de foco y selección, bordes entre secciones, `oldstyle-nums` en cifras grandes.

---

## 3. Movimiento, 3D y rendimiento

### 3.1 Librerías
- **Motion** (`motion`) en modo ligero: `LazyMotion` + `domAnimation` + `strict`, componente `m`. Para UI.
- **three.js** (`three@0.149.0`, ya fijado en el Sprint 1) para **todas** las escenas 3D, mediante un **kit compartido** (Fase 2). Así las piezas, la luz y las sombras son iguales en landing, login, perfil y Jugar.
- **chess.js** para validar jugadas en el tablero del login (y en la arena del Sprint 3).

### 3.2 Tokens · `src/lib/motion.ts`
```ts
export const EASE_OUT = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
export const DUR = { fast: 0.15, base: 0.25, slow: 0.45, reveal: 0.7, draw: 1.4 } as const;
export const SPRING = { type: 'spring', stiffness: 380, damping: 32, mass: 0.8 } as const;
export const SPRING_SOFT = { type: 'spring', stiffness: 160, damping: 22 } as const;
export const SPRING_HOP = { type: 'spring', stiffness: 520, damping: 26 } as const;   // salto del caballo 2D (alternativa sin WebGL)
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: DUR.reveal, ease: EASE_OUT } },
} as const;
```

### 3.3 Reglas de animación UI
1. Solo `transform` y `opacity` (y atributos SVG). Barras: `scaleX`/`scaleY` con `transform-origin`.
2. Arriba del pliegue: entrada con CSS (`animate-rise`). Abajo: `whileInView` con `once: true`.
3. Sin `setState` por frame: contadores con `ref` + `onUpdate`; valores continuos con motion values.
4. Controles 150–250 ms · entradas 450–700 ms · dibujo de gráfica 1,4 s.
5. `MotionConfig reducedMotion="user"` + la regla CSS: con "reducir movimiento" todo aparece en su estado final.
6. Nada queda invisible si falla el JavaScript.
7. Valores animados accesibles (`aria-label` con el valor final) y cambios de estado con `aria-live="polite"`.

### 3.4 Reglas de las escenas 3D (Claude Code las cumple en cada escena)
1. **React manda, la escena obedece.** El estado vive en React (chess.js, fase de matchmaking, preferencias). La escena expone métodos (`update`, `setPiece`, `setPhase`…) y React los llama **desde `useEffect`** cuando cambian los datos. La escena **nunca** lee el estado de React por su cuenta.
   *Por qué:* en la vista de referencia, la escena esperaba un aviso que nunca llegaba y por eso no cambiaba la pieza. Con efectos explícitos eso no pasa.
2. **Un `WebGLRenderer` por pantalla**, creado en el cliente y destruido al salir (`dispose()` + `forceContextLoss()`).
3. **Carga diferida:** `three` y la escena se importan con `import()` **después del primer pintado** (`requestIdleCallback`). Mientras tanto se ve un fondo estático del mismo color. Al estar listo, el canvas entra con un fundido.
4. **Render bajo demanda:** solo se dibuja cuando algo se mueve (una animación, una órbita, el cursor). Quieto = 0 frames.
5. **Pausa automática:** fuera de pantalla (`IntersectionObserver`) o con la pestaña oculta.
6. **Calidad adaptativa:**
   - **Alta:** DPR ≤ 2, sombras de 1024 y tornos de 48 segmentos.
   - **Baja:** DPR ≤ 1,25, sombras de 512 y tornos de 32 segmentos.

   Se usa calidad baja con ≤ 4 núcleos, ≤ 4 GB de memoria o pantalla táctil.
7. **Geometrías compartidas:** los tornos de las piezas se crean **una vez** por calidad y se reutilizan. Al destruir una escena no se borran las compartidas.
8. **Reducir movimiento:** sin órbitas, sin giro automático, sin caídas. Las animaciones saltan al estado final.
9. **Sin WebGL:** cada pantalla tiene una alternativa 2D (§6.6). El texto y los controles nunca dependen del 3D.
10. **Accesibilidad:** el `<canvas>` lleva `aria-hidden`. Todo lo que se puede hacer en 3D se puede hacer también con botones (jugadas candidatas en el login, selector de pieza en el perfil).

### 3.5 Presupuesto (producción local, Lighthouse escritorio)

| Ruta | Rendimiento | LCP | CLS | TBT |
|---|---|---|---|---|
| `/login` | ≥ 85 | ≤ 2,0 s | ≤ 0,05 | ≤ 200 ms |
| `/dashboard/profile` | ≥ 85 | ≤ 2,0 s | ≤ 0,05 | ≤ 200 ms |
| `/dashboard/play` | ≥ 85 | ≤ 2,0 s | ≤ 0,05 | ≤ 200 ms |
| `/` | ≥ 80 | ≤ 2,5 s | ≤ 0,05 | ≤ 250 ms |

Y además:
- En la salida de `next build`, **ninguna** ruta tiene `three` en su "First Load JS": three vive en un chunk aparte que se descarga una vez y queda en caché para las demás pantallas.
- Con la pestaña Performance, en reposo (sin mover nada) no hay frames de render.
- En móvil (< 1024 px), `/login` **no** descarga three ni chess.js.

---

## 4. Fase 0 · Arranque

```bash
git switch develop && git pull
npm ci
git config core.hooksPath .githooks
```
1. Comprueba `docs/sprints/sprint-2/` y tus issues.
2. Pide a Mario el enlace del canvas **"Sprint 2 · Vistas de referencia"** y el archivo `DESIGN.md`. Guarda `DESIGN.md` en `docs/design/` (va en el PR de la Fase 1).
3. Revisa el PR `feature/s2-24-errores-http` de Mario: el formato de error ahora puede traer `meta`.

---

## 5. Fase 1 · Movimiento base, cabecera, temas e indicador apagado (#29)

**Rama:** `feature/s2-29-movimiento-cabecera-temas` · **Depende de:** Fase 0

### 5.1 Dependencias del sprint (solo aquí, para no chocar en `package.json`)
```bash
npm i motion chess.js
npm ls three          # debe decir three@0.149.0; si no, npm i three@0.149.0 @types/three@0.149.0
```
Fuentes: `src/lib/fonts.ts` con la fuente de símbolos de ajedrez → **Anexo A.1**. Copia `DESIGN.md` a `docs/design/`.

### 5.2 Apagar el indicador de desarrollo · `next.config.ts`
**Añade** claves; **no borres** las que existen (`cacheComponents: true` se queda).
```ts
import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  cacheComponents: true,     // ya estaba
  devIndicators: false,      // quita el botón "N" de la esquina inferior izquierda
  poweredByHeader: false,
  reactStrictMode: true,
};
export default nextConfig;
```
Reinicia `npm run dev`. El aviso de **error** de Next sigue apareciendo ante errores reales; se quita arreglando el error. En producción no aparece ninguno.

### 5.3 Proveedor de movimiento · `src/components/motion/MotionProvider.tsx`
```tsx
'use client';
import { LazyMotion, MotionConfig, domAnimation } from 'motion/react';
import { EASE_OUT } from '@/lib/motion';

export function MotionProvider({ children }: { children: React.ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user" transition={{ duration: 0.5, ease: EASE_OUT }}>{children}</MotionConfig>
    </LazyMotion>
  );
}
```
En el root layout envuelve `{children}`. En todo el proyecto: `import * as m from 'motion/react-m'` (nunca `motion.div`).

### 5.4 Primitivas · `src/components/motion/`
`Reveal.tsx`, `CountUp.tsx` y `GrowBar.tsx`:
```tsx
// Reveal.tsx
'use client';
import * as m from 'motion/react-m';
import { fadeUp } from '@/lib/motion';
export function Reveal({ children, delay = 0, className }: { children: React.ReactNode; delay?: number; className?: string }) {
  return <m.div className={className} variants={fadeUp} initial="hidden" whileInView="show" viewport={{ once: true, margin: '-10% 0px' }} transition={{ delay }}>{children}</m.div>;
}

// CountUp.tsx: cuenta sin re-render por frame
'use client';
import { useEffect, useRef } from 'react';
import { animate, useInView, useReducedMotion } from 'motion/react';
import { EASE_OUT } from '@/lib/motion';
const plain = (n: number) => String(Math.round(n));
export function CountUp({ to, from = 0, duration = 1.2, format = plain, className }:
  { to: number; from?: number; duration?: number; format?: (n: number) => string; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: '-10% 0px' });
  const reduce = useReducedMotion();
  useEffect(() => {
    const el = ref.current;
    if (!el || !inView) return;
    if (reduce) { el.textContent = format(to); return; }
    const c = animate(from, to, { duration, ease: EASE_OUT, onUpdate: v => { el.textContent = format(v); } });
    return () => c.stop();
  }, [inView, reduce, from, to, duration, format]);
  return <span ref={ref} className={className} aria-label={format(to)}>{format(reduce ? to : from)}</span>;
}

// GrowBar.tsx
'use client';
import * as m from 'motion/react-m';
import { EASE_OUT } from '@/lib/motion';
export function GrowBar({ className, delay = 0 }: { className?: string; delay?: number }) {
  return <m.span className={className} style={{ originX: 0 }} initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true }} transition={{ duration: 0.9, ease: EASE_OUT, delay }} />;
}
```

### 5.5 Cabecera · `src/components/layout/SiteHeader.tsx`
Reemplaza `Sidebar.tsx` y `MobileBar.tsx` del Sprint 1 (bórralos). `nav.ts`:
```ts
export const NAV = [
  { href: '/dashboard/profile', label: 'Perfil', ready: true, sprint: 1 },
  { href: '/dashboard/play', label: 'Jugar', ready: true, sprint: 2, isNew: true },
  { href: '/dashboard/ai', label: 'Contra la IA', ready: false, sprint: 4 },
  { href: '/dashboard/coach', label: 'Coach', ready: false, sprint: 5 },
  { href: '/dashboard/tournaments', label: 'Torneos', ready: false, sprint: 6 },
  { href: '/dashboard/ranking', label: 'Ranking', ready: false, sprint: 6 },
] as const;
```
- `sticky top-0 z-20 h-[60px]`. Arriba es transparente; con scroll > 8 px pasa a `bg-paper/82 backdrop-blur-[20px]`. Se detecta con `useScroll` + `useMotionValueEvent`, y el `setState` solo ocurre al cruzar el umbral.
- Logo · navegación centrada (deshabilitados en `text-muted` con `aria-disabled` y `title="Próximamente"`; "Jugar" con "Nuevo" en `text-accent`) · usuario (inicial en círculo `bg-ink text-paper`, nombre, "Cerrar sesión").
- **Subrayado deslizante**: un `<m.span>` de 1 px de ancho base que se mueve con `x` y se estira con `scaleX`, medido con `offsetLeft`/`offsetWidth` del enlace activo + `ResizeObserver`. Código completo en **Anexo A.2**.
- Móvil (< 768 px): botón "Menú" que abre un `<dialog className="sheet">` con la lista.

### 5.6 Transición entre páginas · `src/app/(frontend)/dashboard/template.tsx`
```tsx
'use client';
import * as m from 'motion/react-m';
import { EASE_OUT } from '@/lib/motion';
export default function DashboardTemplate({ children }: { children: React.ReactNode }) {
  return <m.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT }}>{children}</m.div>;
}
```

### 5.7 Proveedor de preferencias, versión local · `src/modules/dashboard/presentation/preferences/PreferencesProvider.tsx`
En esta fase **no** guarda nada: aplica tema y acento en `<html>` y expone el contexto. La persistencia llega en la Fase 6.
```tsx
'use client';
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DEFAULT_PREFERENCES, type ProfilePreferences } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';

type Ctx = {
  prefs: ProfilePreferences;
  set: <K extends keyof ProfilePreferences>(key: K, value: ProfilePreferences[K]) => void;
  replace: (p: ProfilePreferences) => void;
};
const PreferencesContext = createContext<Ctx | null>(null);

export function PreferencesProvider({ initial, children }: { initial?: ProfilePreferences; children: React.ReactNode }) {
  const [prefs, setPrefs] = useState<ProfilePreferences>(initial ?? DEFAULT_PREFERENCES);

  // Aplica el tema en <html> y lo quita al salir del dashboard
  useEffect(() => {
    const d = document.documentElement;
    d.dataset.theme = prefs.theme; d.dataset.accent = prefs.accent;
    try { localStorage.setItem('cpp:prefs', JSON.stringify({ theme: prefs.theme, accent: prefs.accent })); } catch {}
    return () => { delete d.dataset.theme; delete d.dataset.accent; };
  }, [prefs.theme, prefs.accent]);

  const value = useMemo<Ctx>(() => ({
    prefs,
    set: (key, v) => setPrefs(p => ({ ...p, [key]: v })),
    replace: setPrefs,
  }), [prefs]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences() {
  const ctx = useContext(PreferencesContext);
  if (!ctx) throw new Error('usePreferences fuera de PreferencesProvider');
  return ctx;
}
```
`dashboard/layout.tsx`: `<PreferencesProvider>` envuelve `<SiteHeader/>` y `<main>`. Cuando llegue el perfil, `replace(profile.preferences)`.
Si los contratos de #25 no han entrado, copia §14 (preferencias) a `src/lib/contracts.tmp.ts` y bórralo cuando entren.

El `<dialog>` "Editar perfil" del Sprint 1 pasa a `className="sheet"` (`showModal()` / `close()`; la transición es CSS, §2.3).

### 5.8 Cierre
`.pr/commit-29.txt`
```
feat(ui): sistema visual v2 con temas, movimiento base y cabecera superior

- colores con tema por variables css (pergamino, noche, salvia, pizarra) y cinco acentos
- caché del tema en localStorage aplicada antes de pintar, sin parpadeo
- motion con LazyMotion + domAnimation en modo strict; primitivas Reveal, CountUp, GrowBar
- cabecera pegajosa con desenfoque y subrayado deslizante; se elimina la barra lateral
- transición entre páginas del dashboard y panel lateral con dialog + css
- devIndicators: false para quitar el botón de desarrollo de Next

Refs #29
```
Título del PR: `feat(ui): sistema visual v2 con temas y cabecera superior`.

---

## 6. Fase 2 · Kit 3D compartido (#30)

**Rama:** `feature/s2-30-kit-3d` · **Depende de:** Fase 0

Base de las escenas de login, perfil, Jugar y landing. Las formas de las piezas salen de `docs/design/landing-reference.html` (perfiles de torno, cabeza del caballo, almenas, cruz).

### 6.1 Archivos
```text
src/components/three/
  kit.ts            # geometrías compartidas, piezas, tablero, colores, liberar memoria
  tween.ts          # animaciones de objetos 3D (posición con salto, escala) y curvas
  stage.ts          # renderer + escena + cámara + luces + bucle bajo demanda + pausas
  quality.ts        # detectQuality()
  useThreeScene.ts  # hook: carga diferida, StrictMode, fallo de WebGL
  ThreeCanvas.tsx   # <canvas> con fondo, fundido de entrada y alternativa sin WebGL
  scenes/           # una escena por pantalla (Fases 3, 4, 5 y 7)
```

### 6.2 `kit.ts`
```ts
import * as THREE from 'three';
import type { Quality } from './quality';

export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export const srgb = (hex: string) => new THREE.Color(hex).convertSRGBToLinear();

const BASE: [number, number][] = [[0, 0], [.36, 0], [.36, .055], [.335, .085], [.3, .105], [.3, .13], [.25, .15]];
const PROFILES: Record<PieceType, [number, number][]> = {
  p: [...BASE, [.18, .2], [.12, .33], [.1, .4], [.17, .42], [.17, .45], [.075, .47], ...arc(.56, .11, -45, 90)],
  r: [...BASE, [.23, .2], [.2, .5], [.27, .56], [.27, .66], [0, .66]],
  n: [...BASE, [.22, .2], [.2, .3], [.25, .34], [0, .34]],
  b: [...BASE, [.2, .2], [.12, .48], [.18, .5], [.18, .53], [.1, .555], [.15, .62], [.16, .68], [.12, .76], [.05, .82], [0, .84]],
  q: [...BASE, [.22, .2], [.13, .6], [.21, .63], [.21, .66], [.13, .68], [.2, .83], [.23, .87], [.14, .87], [.09, .9], [0, .92]],
  k: [...BASE, [.23, .2], [.14, .62], [.22, .65], [.22, .68], [.14, .7], [.2, .86], [.21, .89], [.15, .9], [.07, .96], [0, .97]],
};
function arc(cy: number, r: number, a0: number, a1: number): [number, number][] {
  return Array.from({ length: 11 }, (_, i) => {
    const a = ((a0 + (a1 - a0) * i / 10) * Math.PI) / 180;
    return [Math.max(0, r * Math.cos(a)), cy + r * Math.sin(a)] as [number, number];
  });
}

type Geos = Record<PieceType, THREE.BufferGeometry> & {
  merlon: THREE.BufferGeometry; ball: THREE.BufferGeometry; crossV: THREE.BufferGeometry; crossH: THREE.BufferGeometry; head: THREE.BufferGeometry;
};
const cache = new Map<Quality, Geos>();

/** Geometrías creadas una sola vez por calidad. Marcadas como compartidas para no liberarlas con una escena. */
function geos(q: Quality): Geos {
  const hit = cache.get(q);
  if (hit) return hit;
  const seg = q === 'high' ? 48 : 32;
  const lathe = (pts: [number, number][]) => new THREE.LatheGeometry(pts.map(([x, y]) => new THREE.Vector2(x, y)), seg);
  const head = new THREE.ExtrudeGeometry(
    new THREE.Shape([[-.21, .3], [.17, .3], [.14, .48], [.3, .6], [.37, .69], [.33, .76], [.13, .8], [.07, .93], [0, .86], [-.08, .91], [-.13, .78], [-.23, .6], [-.25, .44]]
      .map(([x, y]) => new THREE.Vector2(x, y))),
    { depth: .16, bevelEnabled: true, bevelThickness: .04, bevelSize: .03, bevelSegments: 3, curveSegments: 8 });
  head.translate(0, 0, -.08);
  const g = {
    p: lathe(PROFILES.p), r: lathe(PROFILES.r), n: lathe(PROFILES.n), b: lathe(PROFILES.b), q: lathe(PROFILES.q), k: lathe(PROFILES.k),
    merlon: new THREE.BoxGeometry(.11, .1, .13), ball: new THREE.SphereGeometry(1, 16, 12),
    crossV: new THREE.BoxGeometry(.055, .22, .055), crossH: new THREE.BoxGeometry(.17, .055, .055), head,
  } satisfies Geos;
  Object.values(g).forEach(geo => { geo.userData.shared = true; });
  cache.set(q, g);
  return g;
}

export function pieceMaterials() {
  return {
    w: new THREE.MeshPhysicalMaterial({ color: srgb('#f3eadb'), roughness: .34, clearcoat: .5, clearcoatRoughness: .25 }),
    b: new THREE.MeshPhysicalMaterial({ color: srgb('#2a1d18'), roughness: .3, clearcoat: .75, clearcoatRoughness: .18 }),
  };
}

/** Pieza con sombras. facing 1 = blancas (miran a -z), -1 = negras. */
export function createPiece(type: PieceType, mat: THREE.Material, q: Quality, facing = 1): THREE.Group {
  const g = geos(q);
  const grp = new THREE.Group();
  const mk = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, s = 1) => {
    const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.scale.setScalar(s); m.castShadow = m.receiveShadow = true; grp.add(m); return m;
  };
  mk(g[type]);
  if (type === 'r') for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; mk(g.merlon, Math.cos(a) * .215, .71, Math.sin(a) * .215).rotation.y = -a; }
  if (type === 'n') { mk(g.head); grp.rotation.y = facing < 0 ? -Math.PI / 2 : Math.PI / 2; }
  if (type === 'b') mk(g.ball, 0, .87, 0, .04);
  if (type === 'q') { for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2; mk(g.ball, Math.cos(a) * .2, .885, Math.sin(a) * .2, .036); } mk(g.ball, 0, .97, 0, .055); }
  if (type === 'k') { mk(g.crossV, 0, 1.08, 0); mk(g.crossH, 0, 1.1, 0); }
  return grp;
}

/** Tablero 8×8 con marco. Cada casilla lleva userData.square ('e4'). Blancas en +z. */
export function createBoard(colors: { light: string; dark: string; frame: string }) {
  const group = new THREE.Group();
  const light = new THREE.MeshStandardMaterial({ color: srgb(colors.light), roughness: .6 });
  const dark = new THREE.MeshStandardMaterial({ color: srgb(colors.dark), roughness: .6 });
  const tile = new THREE.BoxGeometry(1, .12, 1);
  const squares: THREE.Mesh[] = [];
  for (let r = 0; r < 8; r++) for (let c = 0; c < 8; c++) {
    const m = new THREE.Mesh(tile, (r + c) % 2 === 0 ? light : dark);
    m.position.set(c - 3.5, -.06, r - 3.5); m.receiveShadow = true;
    m.userData.square = 'abcdefgh'[c] + (8 - r);
    group.add(m); squares.push(m);
  }
  const frame = new THREE.Mesh(new THREE.BoxGeometry(9, .3, 9), new THREE.MeshStandardMaterial({ color: srgb(colors.frame), roughness: .5 }));
  frame.position.y = -.2; frame.castShadow = frame.receiveShadow = true; group.add(frame);
  return { group, squares };
}

export const squareToXZ = (sq: string) => ({ x: 'abcdefgh'.indexOf(sq[0]) - 3.5, z: 3.5 - (Number(sq[1]) - 1) });

/** Libera geometrías y materiales de un árbol, salvo las geometrías compartidas del kit. */
export function disposeTree(root: THREE.Object3D) {
  root.traverse(o => {
    const m = o as THREE.Mesh;
    if (m.geometry && !m.geometry.userData.shared) m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : m.material ? [m.material] : [];
    mats.forEach(mt => mt.dispose());
  });
}
```

### 6.3 `quality.ts` y `tween.ts`
```ts
// quality.ts
export type Quality = 'high' | 'low';
export function detectQuality(): Quality {
  const nav = navigator as Navigator & { deviceMemory?: number };
  const low = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || matchMedia('(pointer: coarse)').matches;
  return low ? 'low' : 'high';
}

// tween.ts
import type { Object3D } from 'three';
export const ease = {
  out: (t: number) => 1 - (1 - t) ** 3,
  inOut: (t: number) => (t < .5 ? 4 * t ** 3 : 1 - (-2 * t + 2) ** 3 / 2),
  bounce: (t: number) => {
    const n = 7.5625, d = 2.75;
    if (t < 1 / d) return n * t * t;
    if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75;
    if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375;
    return n * (t -= 2.625 / d) * t + .984375;
  },
};
type V = { x: number; y: number; z: number };
type T = { obj: Object3D; from: V; to: V; t0: number; dur: number; hop: number; ease: (t: number) => number; scale?: [number, number]; done?: () => void };
export type TweenOpts = { dur: number; delay?: number; hop?: number; ease?: (t: number) => number; scaleTo?: number; done?: () => void };

export class Tweens {
  private list: T[] = [];
  onStart?: () => void;
  constructor(private instant: boolean) {}
  /** Mueve un objeto (con salto opcional en arco). Reemplaza cualquier animación previa del mismo objeto. */
  to(obj: Object3D, to: Partial<V>, o: TweenOpts) {
    this.list = this.list.filter(t => t.obj !== obj);
    const p = obj.position;
    this.list.push({
      obj, from: { x: p.x, y: p.y, z: p.z }, to: { x: to.x ?? p.x, y: to.y ?? p.y, z: to.z ?? p.z },
      t0: performance.now() + (this.instant ? 0 : o.delay ?? 0), dur: this.instant ? 1 : o.dur,
      hop: this.instant ? 0 : o.hop ?? 0, ease: o.ease ?? ease.inOut,
      scale: o.scaleTo !== undefined ? [obj.scale.x, o.scaleTo] : undefined, done: o.done,
    });
    this.onStart?.();
  }
  /** Avanza todas; devuelve true si queda alguna activa. */
  update(now: number): boolean {
    for (let i = this.list.length - 1; i >= 0; i--) {
      const t = this.list[i], k = Math.min(1, (now - t.t0) / t.dur);
      if (k < 0) continue;
      const e = t.ease(k), p = t.obj.position;
      p.set(t.from.x + (t.to.x - t.from.x) * e, t.from.y + (t.to.y - t.from.y) * e + Math.sin(Math.PI * k) * t.hop, t.from.z + (t.to.z - t.from.z) * e);
      if (t.scale) t.obj.scale.setScalar(Math.max(.001, t.scale[0] + (t.scale[1] - t.scale[0]) * e));
      if (k >= 1) { this.list.splice(i, 1); t.done?.(); }
    }
    return this.list.length > 0;
  }
  clear() { this.list = []; }
}
```

### 6.4 `stage.ts`: render bajo demanda con pausas
```ts
import * as THREE from 'three';
import { disposeTree } from './kit';
import { Tweens } from './tween';
import type { Quality } from './quality';

export type StageOptions = { quality: Quality; reducedMotion: boolean; fov?: number; continuous?: boolean };
export type FrameFn = (now: number, dt: number) => boolean | void;   // devolver true = "sigo animando, pide otro frame"

export function createStage(canvas: HTMLCanvasElement, o: StageOptions) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: o.quality === 'high', alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(o.quality === 'high' ? 2 : 1.25, window.devicePixelRatio || 1));
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = o.quality === 'high' ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(o.fov ?? 32, 1, .1, 100);
  const hemi = new THREE.HemisphereLight(0xfff6e8, 0xb9a48a, .85);
  const key = new THREE.DirectionalLight(0xfff0dc, 1.35);
  key.position.set(4, 10, 6); key.castShadow = true;
  const sm = o.quality === 'high' ? 1024 : 512;
  key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -7, right: 7, top: 7, bottom: -7 });
  key.shadow.bias = -.0005; key.shadow.normalBias = .02;
  const fill = new THREE.DirectionalLight(0xdfe6ff, .25); fill.position.set(-6, 4, -5);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(60, 60), new THREE.ShadowMaterial({ opacity: .16 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.36; ground.receiveShadow = true;
  scene.add(hemi, key, fill, ground);

  const tweens = new Tweens(o.reducedMotion);
  const frames = new Set<FrameFn>();
  let continuous = !!o.continuous && !o.reducedMotion;
  let raf = 0, last = 0, visible = true;

  const loop = (now: number) => {
    raf = 0;
    if (!visible || document.hidden) { last = 0; return; }
    const dt = last ? Math.min(64, now - last) : 16; last = now;
    let busy = tweens.update(now);
    frames.forEach(fn => { if (fn(now, dt)) busy = true; });
    renderer.render(scene, camera);
    if (continuous || busy) raf = requestAnimationFrame(loop); else last = 0;
  };
  const invalidate = () => { if (!raf) raf = requestAnimationFrame(loop); };
  tweens.onStart = invalidate;

  const resize = () => {
    const w = canvas.clientWidth, h = canvas.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); invalidate();
  };
  const ro = new ResizeObserver(resize); ro.observe(canvas); resize();
  const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) invalidate(); });
  io.observe(canvas);
  const onVis = () => { if (!document.hidden) invalidate(); };
  document.addEventListener('visibilitychange', onVis);

  return {
    THREE, renderer, scene, camera, hemi, key, tweens, invalidate,
    setContinuous(on: boolean) { continuous = on && !o.reducedMotion; invalidate(); },
    onFrame(fn: FrameFn) { frames.add(fn); invalidate(); return () => { frames.delete(fn); }; },
    dispose() {
      cancelAnimationFrame(raf); ro.disconnect(); io.disconnect();
      document.removeEventListener('visibilitychange', onVis);
      tweens.clear(); disposeTree(scene); renderer.dispose(); renderer.forceContextLoss();
    },
  };
}
export type Stage = ReturnType<typeof createStage>;
```

### 6.5 `useThreeScene.ts`: carga diferida + StrictMode + fallo
```ts
'use client';
import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import type { Quality } from './quality';

export type SceneFactory<S> = (canvas: HTMLCanvasElement, ctx: { quality: Quality; reducedMotion: boolean }) => S;
type Disposable = { dispose(): void };

const whenIdle = (fn: () => void) =>
  'requestIdleCallback' in window ? window.requestIdleCallback(fn, { timeout: 1200 }) : window.setTimeout(fn, 250);
const cancelIdle = (id: number) =>
  'cancelIdleCallback' in window ? window.cancelIdleCallback(id) : window.clearTimeout(id);

/**
 * `load` DEBE ser estable (definida fuera del componente), por ejemplo:
 *   const loadPractice = () => import('./scenes/practiceScene').then(m => m.createPracticeScene);
 */
export function useThreeScene<S extends Disposable>(load: () => Promise<SceneFactory<S>>) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scene, setScene] = useState<S | null>(null);
  const [failed, setFailed] = useState(false);
  const reduce = !!useReducedMotion();

  useEffect(() => {
    let alive = true;
    let created: S | null = null;
    const id = whenIdle(async () => {
      try {
        const [factory, { detectQuality }] = await Promise.all([load(), import('./quality')]);
        if (!alive || !canvasRef.current) return;
        created = factory(canvasRef.current, { quality: detectQuality(), reducedMotion: reduce });
        setScene(created);
      } catch (e) {
        console.error('[3d] no se pudo crear la escena', e);
        if (alive) setFailed(true);
      }
    });
    return () => { alive = false; cancelIdle(id as number); created?.dispose(); setScene(null); };
  }, [load, reduce]);

  return { canvasRef, scene, failed };
}
```
`ThreeCanvas.tsx`: `<div className="relative" style={{ background }}>` + `<canvas ref aria-hidden className={'absolute inset-0 size-full transition-opacity duration-700 ' + (ready ? 'opacity-100' : 'opacity-0')} />`. Si `failed`, renderiza `fallback` (prop).

### 6.6 Alternativas sin WebGL

| Pantalla | Alternativa |
|---|---|
| Login | Se oculta el panel 3D y el formulario ocupa la pantalla |
| Perfil | Glifo grande de la pieza elegida (`font-chess`, 160 px, color `ink`) sobre un pedestal hecho con CSS |
| Jugar | Tablero 4×4 con un caballo que salta en 2D (`KnightLoop`, Motion; código en **Anexo A.5**) |

### 6.7 Tests
- `kit.test.ts` (Vitest, entorno `node`): `squareToXZ('a1')` → `{ x: -3.5, z: 3.5 }`, `squareToXZ('h8')` → `{ x: 3.5, z: -3.5 }`.
- `tween.test.ts`: con `instant = true`, `update()` deja el objeto en el destino en una llamada.

### 6.8 Cierre
`.pr/commit-30.txt`
```
feat(3d): kit compartido de three.js para todas las escenas

- piezas por torno con geometrías compartidas por calidad
- tablero 8×8 con casillas identificadas para selección con rayos
- escenario con render bajo demanda y pausa fuera de pantalla o pestaña oculta
- calidad adaptativa por cpu, memoria y tipo de puntero
- hook useThreeScene con carga diferida, StrictMode y alternativa sin webgl

Refs #30
```
Título del PR: `feat(3d): kit compartido de three.js`.

---

## 7. Fase 3 · Jugar con escena 3D (#31)

**Rama:** `feature/s2-31-jugar-3d`
**Para empezar:** #29 y #30 MERGED. Contratos de #25 (o `contracts.tmp.ts`).
**Para abrir el PR:** #26 MERGED. Para probar solo: #27.
Referencia: "Jugar · búsqueda en 3D".

### 7.1 Estructura
Dos columnas que en móvil pasan a una (el escenario va debajo del texto):
- **Izquierda:** textos y controles de cada fase.
- **Derecha:** escenario 3D cuadrado de hasta 600 px, `rounded-[28px] overflow-hidden`, fondo `bg-band`, con una etiqueta mono abajo a la izquierda ("Los reyes esperan" · "Buscando en tu rango" · "Frente a frente" · "Posición inicial").

El canvas **no** se vuelve a montar entre fases: vive fuera de los bloques condicionales.

```text
src/modules/matchmaking/presentation/
  api/matchmakingApi.ts       # http + mock (Anexo A.3)
  hooks/useMatchmaking.ts     # máquina de estados + polling (Anexo A.4)
  components/PlayScreen.tsx   # columnas + AnimatePresence de los textos
  components/PlayStage.tsx    # <ThreeCanvas> + escena; alternativa: KnightLoop 2D
  components/Lobby.tsx · Searching.tsx · MatchFound.tsx · EloRangeBar.tsx · TipRotator.tsx · KnightLoop.tsx (Anexo A.5)
src/components/three/scenes/playScene.ts
src/app/(frontend)/dashboard/play/page.tsx
src/app/(frontend)/dashboard/arena/[matchId]/page.tsx   # 'use client' con useParams
```

### 7.2 Escena · `playScene.ts`
API (React la llama desde efectos):
```ts
export type PlayPhase = 'lobby' | 'searching' | 'matched' | 'arena';
export interface PlayScene {
  setPhase(phase: PlayPhase): void;
  setRange(halfWidth: number): void;   // ±100…±400 del servidor: las ondas llegan más lejos cuanto más se amplía
  dispose(): void;
}
export const createPlayScene: SceneFactory<PlayScene> = (canvas, ctx) => { … };
```

| Fase | Qué se ve | Cámara |
|---|---|---|
| `lobby` | Rey blanco en e1 y rey negro en e8 | Órbita lenta (radio 13, alto 9, 0,0012 rad/frame) |
| `searching` | Un caballo blanco cae con rebote en d4 y salta en L a una casilla al azar cada 900 ms (arco de 1,2, cabeza hacia donde salta: `rotation.y = atan2(-dz, dx)`). Dos anillos vino salen del centro y se desvanecen cada 1,8 s; su radio máximo es `0.6 + 4.2 × halfWidth / 400` | Órbita más rápida y baja (11,5 / 7,5 / 0,0045) |
| `matched` | El caballo se hunde y desaparece; los reyes saltan a d4 y e5, frente a frente. Una luz puntual vino en el centro hace un destello (0 → 3 en 600 ms → 0,8) | Se acerca (8,6 / 5,2) y casi se detiene |
| `arena` | Los reyes vuelven a e1/e8 y caen las 30 piezas restantes con rebote escalonado (30 ms entre piezas) | Fija desde arriba (12,5 / 9,5) |

- Al encuadrar, multiplica la distancia por `max(1, 1.02 / camera.aspect)` para que el tablero quepa también en pantallas verticales.
- La órbita usa `setContinuous(true)` en `lobby` y `searching`, y `false` en `arena` (quieto = 0 frames).
- Con reducir movimiento: sin órbita, sin saltos (el caballo queda quieto en d4), sin ondas.

### 7.3 Conexión React → escena · `PlayStage.tsx`
```tsx
'use client';
const loadPlay = () => import('@/components/three/scenes/playScene').then(m => m.createPlayScene);

export function PlayStage({ phase, halfWidth }: { phase: PlayPhase; halfWidth: number }) {
  const { canvasRef, scene, failed } = useThreeScene(loadPlay);
  useEffect(() => { scene?.setPhase(phase); }, [scene, phase]);          // cada cambio de fase llega por aquí
  useEffect(() => { scene?.setRange(halfWidth); }, [scene, halfWidth]);
  if (failed) return <KnightLoop />;
  return <ThreeCanvas ref={canvasRef} ready={!!scene} label={STAGE_LABEL[phase]} />;
}
```
`PlayScreen` traduce el estado de `useMatchmaking`: `loading`/`lobby`/`joining` → `lobby` · `searching`/`leaving` → `searching` · `matched` → `matched`. Al navegar a la partida, la página de arena muestra la fase `arena`.

### 7.4 Textos y controles (columna izquierda)
**Lobby**
- eyebrow "Jugar" · `h1` "Encuentra rival." (64–96 px) · "Elige el ritmo y te emparejamos con alguien de tu nivel."
- Ritmos como píldoras `Segmented` (radiogroup; ← → cambian): "3 + 2 Blitz", "5 + 0 Blitz", "10 + 0 Rápida".
- "● N jugadores buscando ahora" desde `stats()`; si falla, la línea se oculta.
- Botón principal "Buscar partida" (`h-14`) + nota mono "rivales entre {elo-100} y {elo+100}".

**Buscando**
- eyebrow con el ritmo · `h1` "Buscando rival…" (72 px) · reloj `m:ss` mono 40 px.
- `EloRangeBar`: banda centrada en tu ELO que se escala con `scaleX` según `eloRange`.
- `TipRotator`: consejo cada 6 s.
- Botón fantasma "Cancelar búsqueda".

**Partida encontrada**
- eyebrow con el ritmo · `h1` "Partida encontrada."
- Tú (entra desde la izquierda) · "vs" en itálica acento (`scale` 0.6 → 1) · rival (entra desde la derecha). Cada uno con inicial, nombre en Cormorant 36 y "Blancas · 1450" o "Negras · 1478".
- "Entrando a la arena en **5**" + barra `scaleX 1 → 0` de 5 s (una sola animación).
- Botón principal "Entrar ahora" · enlace "Volver al lobby" (DELETE /matches/:id → 204).
- Al llegar a 0 → `router.push('/dashboard/arena/' + id)`, con `router.prefetch` al montar.

### 7.5 API, mocks, polling y códigos
Código completo en el anexo:
- `apiClient.ts` con `ApiError` que trae `meta` y acepta `signal` · `matchmakingApi.ts` con `http` + `mock` (`NEXT_PUBLIC_API_MOCK=1`) → **Anexo A.3**.
- `useMatchmaking.ts`: reducer, reanudar al entrar, polling con `setTimeout` encadenado que se pausa con la pestaña oculta y backoff, salida con `fetch(..., { keepalive: true })` en `pagehide`, y **sin** salir de la cola al desmontar → **Anexo A.4**.
- `EloRangeBar`, `TipRotator` y la página de la partida → **Anexo A.5** y **A.6**.

Manejo de respuestas:

| Llamada | Código | UI |
|---|---|---|
| `join` | 201 | Buscando |
| `join` | 409 `ALREADY_IN_QUEUE` | Reanuda (pide `status`) |
| `join` | 409 `ACTIVE_MATCH_EXISTS` | Carga `meta.matchId` → partida encontrada |
| `leave` | 204 / 404 `NOT_IN_QUEUE` | Lobby (sin error en 404) |
| `status` | 200 `matched` / `idle` | Encontrada / lobby |
| `status` | red/500 | Reintento con backoff; a los 5 fallos, lobby con error |
| `match` | 403 / 404 / 400 | "No participas" / "No existe" / "Enlace no válido" |
| `abort` | 204 / 404 / 409 | Lobby |
| cualquiera | 401 | `/login?next=/dashboard/play` |

**Página de la partida** (`arena/[matchId]`): `pending` → "La arena llega en el Sprint 3." + "Abandonar y volver" (DELETE → 204), con el `PlayStage` en fase `arena`. `aborted` → "Tu rival abandonó la partida." + "Buscar otra".

### 7.6 Cierre
Probar con dos navegadores (uno en incógnito) y con un bot (`POST /api/v1/dev/bots/queue`).

`.pr/commit-31.txt`
```
feat(matchmaking): jugar con escena 3D, búsqueda y partida encontrada

- escenario 3D por fase: reyes en espera, caballo que salta con ondas, cara a cara y posición inicial
- ondas que crecen con el rango de ELO del servidor
- lobby con ritmos accesibles, búsqueda con reloj y rango, cuenta atrás con precarga
- polling encadenado con pausa, backoff y salida con keepalive
- manejo de 201, 204, 400, 401, 403, 404, 409 y errores de red

Refs #31
```
Título del PR: `feat(matchmaking): jugar con escena 3D`. GIF del flujo + Lighthouse de `/dashboard/play`.

---

## 8. Fase 4 · Login y registro con tablero 3D (#32)

**Rama:** `feature/s2-32-login-tablero-3d` · **Depende de:** #30 MERGED
Referencia: "Login · tablero 3D".

### 8.1 Qué hace
Pantalla dividida en escritorio:
- **Izquierda (`#eee4d4`):** "Mientras entras" · "Mueven las blancas." · texto corto · **tablero 3D** cuadrado de hasta 600 px (`rounded-[28px]`, fondo `#e6d9c4`) con el estado en itálica abajo · "Jugadas más probables · ejemplo" con 3 filas que **son botones** (juegan esa jugada) · "Reiniciar posición".
- **Derecha:** formulario del Sprint 1 con estilo v2 (**Anexo A.10**). `/register` usa el mismo layout: el panel vive en `src/app/(frontend)/(auth)/layout.tsx`.

En el tablero:
- Al cargar, las 32 piezas caen con rebote escalonado.
- La cámara sigue un poco al cursor (parallax suave).
- Al tocar una pieza blanca, se levanta y aparecen discos vino en los destinos vacíos y anillos en las capturas. La casilla bajo el cursor se tiñe si es seleccionable y el cursor pasa a `pointer`.
- La pieza viaja en arco (los caballos saltan más alto); la capturada se hunde y desaparece. Las dos casillas de la última jugada quedan marcadas.
- El rival responde a los 900 ms con el libro de aperturas; las flechas de jugadas probables están dibujadas sobre el tablero.

Posición inicial: tras **1.e4 e5 2.Cf3 Cc6**. En móvil (< 1024 px) el panel no se muestra y **no** se descarga ni three ni chess.js.

### 8.2 Archivos
```text
src/components/chess/types.ts · pieces.ts      # ids estables y movePieces (Anexo A.7)
src/modules/auth/presentation/practice/
  book.ts                 # START_FEN, REPLIES, FALLBACK_REPLIES, CANDIDATES (Anexo A.8)
  usePracticeGame.ts      # chess.js + vista para la escena
  PracticeBoard3D.tsx     # ThreeCanvas + estado + candidatas + reiniciar
  PracticeBoardLazy.tsx   # solo ≥1024 px; carga PracticeBoard3D (Anexo A.9)
src/components/three/scenes/practiceScene.ts
```

### 8.3 Escena · `practiceScene.ts`
```ts
export type PracticeView = {
  pieces: BoardPiece[];                 // con id estable
  selected: Square | null;
  targets: Square[];                    // destinos vacíos
  captures: Square[];                   // destinos con pieza rival
  lastMove: [Square, Square] | null;
  arrows: { from: Square; to: Square; weight: number }[];   // weight 0..1
  interactive: boolean;                 // false mientras "piensa" el rival
};
export interface PracticeScene {
  update(view: PracticeView): void;
  onSquare(fn: (sq: Square) => void): void;
  onPickable(fn: (pickable: boolean) => void): void;   // para el cursor pointer
  dispose(): void;
}
```
Implementación, con `createStage(canvas, { quality, reducedMotion, fov: 32, continuous: false })`:

1. **Tablero:** `createBoard({ light: '#efe4d3', dark: '#c9b08e', frame: '#4a2c24' })`.
2. **Piezas por id:** un `Map<id, Group>` + `Map<id, Square>`. En `update()`:
   - **Primera vez:** cada pieza nace en `y = 5 + rand*2` y cae con `ease.bounce` (900 ms, retraso `200 + i*35`).
   - **Id que ya no está:** `tweens.to(g, { y: -0.4 }, { dur: 380, scaleTo: 0, done: () => g.visible = false })`.
   - **Id que cambió de casilla:** `tweens.to(g, { x, y: 0, z }, { dur: 560, hop: type === 'n' ? 1.1 : .45 })`.
   - **Tipo distinto** (coronación): se reemplaza la malla.
   - **Seleccionada:** sube a `y = .3` en 180 ms. La que deja de estarlo vuelve a 0.
3. **Marcas** (pools reutilizados, sin crear mallas en cada `update`):
   - 28 discos `CylinderGeometry(.16, .16, .03)` y 8 anillos `TorusGeometry(.4, .045)`, vino al 55 %.
   - Plano de selección (vino 30 %), plano de hover (vino 14 %) y 2 planos de última jugada (`#c8a676` al 55 %).
   - Todo a `y = .006–.02` con `depthWrite: false`.
4. **Flechas:** `ShapeGeometry` plana (cuerpo .13, punta .38 × .34), vino con opacidad `.3 + .5 × weight`, a `y = .02`. Se rehacen solo si cambió la lista (comparar con una clave `from+to` unida).
5. **Selección con rayos:** `Raycaster` contra casillas y mallas de piezas (`userData.pieceId` → casilla actual). Clic = `pointerdown` + `pointerup` a menos de 8 px. `pointermove` → plano de hover + `onPickable`.
6. **Parallax:** objetivo `mouse * (.9, .5)`. En `onFrame`, la cámara se acerca un 5 % por frame y devuelve `true` mientras no llegue (así pide frames solo cuando hace falta). Posición base `(0, 10.4, 9.2) × max(1, 1.02 / aspect)` mirando a `(0, 0, .45)`.

### 8.4 Lógica · `usePracticeGame.ts` (React manda)
- Estado: `chess.js` en un `useRef`, `pieces` (ids estables con `movePieces`), `selected`, `lastMove`, `history`, `busy`, `status`.
- `onSquare(sq)` (detalle en **Anexo A.8**):
  - si hay selección y `sq` es destino → `play`;
  - si `sq` tiene pieza blanca → seleccionar (o deseleccionar);
  - si no → limpiar.
- `targets`/`captures` = `game.moves({ square, verbose: true })` separados por `captured`.
- `play(from, to)`: `game.move({ from, to, promotion: 'q' })` dentro de `try` (chess.js **lanza** si es ilegal). Después de 900 ms responde el rival (`REPLIES` → `FALLBACK_REPLIES` → una legal al azar), con el `timeout` guardado en un ref y limpiado al desmontar.
- `playCandidate(c)` juega directo una de las filas.
- `view: PracticeView` con `useMemo`.
- Estado en español: "Tu turno. Toca una pieza blanca." · "Elige casilla para tu caballo." · "Jugaste Ac4. El rival piensa…" · "El rival respondió Ac5. Tu turno." · "Fin de la demo. Reinicia la posición."

`PracticeBoard3D.tsx`:
```tsx
'use client';
const loadPractice = () => import('@/components/three/scenes/practiceScene').then(m => m.createPracticeScene);

export default function PracticeBoard3D() {
  const game = usePracticeGame();
  const { canvasRef, scene, failed } = useThreeScene(loadPractice);
  const [pickable, setPickable] = useState(false);

  useEffect(() => { scene?.onSquare(game.onSquare); scene?.onPickable(setPickable); }, [scene, game.onSquare]);
  useEffect(() => { scene?.update(game.view); }, [scene, game.view]);       // React empuja; la escena obedece

  if (failed) return null;                                                  // sin WebGL: solo el formulario
  return (
    <>
      <ThreeCanvas ref={canvasRef} ready={!!scene} className="aspect-square w-full max-w-[600px] rounded-[28px] bg-[#e6d9c4]"
        style={{ cursor: pickable ? 'pointer' : 'default' }}>
        <p role="status" aria-live="polite" className="absolute inset-x-5 bottom-4 font-display italic text-[21px]">{game.status}</p>
      </ThreeCanvas>
      <Candidates items={game.candidates} disabled={game.busy} onPlay={game.playCandidate} onReset={game.reset} />
    </>
  );
}
```
`Candidates`: `<ol>` de `<button>` en grid `4.5rem | barra | nombre | %`, con hover `bg-wash`, `aria-label="Jugar Ac4, Italiana, 52 por ciento"` y barra `scaleX` animada. Sin datos → "Sin datos de predicción para esta posición en la demo."

### 8.5 Cierre
Lighthouse `/login` ≥ 85. En la pestaña Network en móvil no aparece ni `three` ni `chess.js`.

`.pr/commit-32.txt`
```
feat(auth): login y registro con tablero 3D jugable

- tablero three.js con piezas que caen, se levantan y viajan en arco
- selección con rayos, destinos y capturas marcados, última jugada y flechas de predicción
- jugadas candidatas como botones accesibles que juegan la jugada
- chess.js valida; la escena solo dibuja lo que React le envía
- carga diferida solo en escritorio; el formulario no depende del 3D

Refs #32
```
Título del PR: `feat(auth): login con tablero 3D`.

---

## 9. Fase 5 · Perfil animado con pieza 3D y Elo bajo botón (#33)

**Rama:** `feature/s2-33-perfil-3d` · **Depende de:** #29 y #30 MERGED
Referencia: "Perfil · personalizable".

### 9.1 Estructura (todo lee `usePreferences()`)
**Héroe** (`bg-paper`, `py-[72px]`): tres bloques en fila que se reordenan con CSS `order` según `prefs.heroLayout`.

| `heroLayout` | Orden |
|---|---|
| `clasico` | nombre · pieza · ELO |
| `invertido` | ELO · pieza · nombre |
| `pieza` | pieza · nombre · ELO |

- **Nombre:**
  - eyebrow "Perfil · correo" · nombre en Cormorant 88–152 px · datos ("Alicia Romero · Colombia · Miembro desde…") · logros en itálica separados por "·".
  - Botones: "Personalizar" (principal, ícono de deslizadores; abre el panel de la Fase 6) y "Editar datos" (fantasma, abre el panel del Sprint 1).
- **Pieza:**
  - canvas 340 × 380 con la pieza 3D sobre un pedestal de 3×3 casillas que gira sola y se gira arrastrando con inercia;
  - debajo, **selector de pieza**: 6 botones redondos de 42 px con ♔ ♕ ♖ ♗ ♘ ♙ (`font-chess`, `role="radio"`, `aria-label` "Rey", "Dama"…), y el seleccionado con `bg-ink text-paper`;
  - al final, "Elige tu pieza · arrastra para girarla" en mono.
- **ELO:**
  - eyebrow "ELO actual" · número 96–168 px en `text-accent`, `nums`, `leading-[.9]`, con `CountUp`;
  - "▲ +250 en los últimos 30 días" con `mt-5`;
  - se alinea a la derecha si queda último y a la izquierda si queda primero.

**Secciones** en un contenedor `flex flex-col`. Cada una lleva `style={{ order }}` según `prefs.sectionOrder`, va `hidden` si está en `prefs.hiddenSections`, y su fondo **alterna según el orden visible**: la primera visible lleva `band`, la siguiente `paper`, y así.
```ts
const visible = prefs.sectionOrder.filter(id => !prefs.hiddenSections.includes(id));
const bgOf = (id: SectionId) => (visible.indexOf(id) % 2 === 0 ? 'bg-band' : 'bg-paper');
```

| Id | Sección | Contenido |
|---|---|---|
| `rend` | "Rendimiento." | 4 cifras `BigNumber` (victorias en `text-accent`, derrotas, % victorias, precisión del coach "—") con la etiqueta **debajo** (`mt-3`) · barra victorias/derrotas con `GrowBar` |
| `elo` | "Evolución de Elo." | **Cerrada por defecto** (§9.2) |
| `forma` | "Últimas 34 partidas." | Tira de barras que crecen escalonadas (victoria alta en `accent`, derrota baja en `loss`) · `ResultsStrip`, **Anexo A.12** |
| `next` | "¿Otra más?" | Botón principal "Buscar partida" → `/dashboard/play` · "Ver ranking ›" |

### 9.2 Evolución de Elo con botón
```tsx
const [open, setOpen] = useState(false);
<Band id="elo" …>
  <div className="flex flex-wrap items-end justify-between gap-5">
    <div>
      <SectionTitle>Evolución de Elo.</SectionTitle>
      <p className="text-ink-soft"><strong className="text-accent">+250</strong> en 30 días · máximo 1450 · mínimo 1196</p>
    </div>
    <button type="button" aria-expanded={open} aria-controls="elo-panel" onClick={() => setOpen(o => !o)}
      className={`inline-flex h-12 items-center gap-2.5 rounded-full px-5 shadow-[inset_0_0_0_1px_var(--t-ink)] transition-colors ${open ? 'bg-ink text-paper' : ''}`}>
      <TrendIcon aria-hidden /> {open ? 'Ocultar evolución' : 'Ver evolución'}
    </button>
  </div>
  {/* se abre con grid-template-rows 0fr → 1fr (sin medir alturas en JS) */}
  <div id="elo-panel" inert={!open}
    className={`grid transition-[grid-template-rows] duration-600 ease-[var(--ease-out)] ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
    <div className="min-h-0 overflow-hidden">
      <div className={`pt-7 transition-opacity duration-400 ${open ? 'opacity-100' : 'opacity-0'}`}>
        <EloChart points={history} currentElo={profile.eloRating} drawn={open} />
      </div>
    </div>
  </div>
</Band>
```
- `EloChart` (código en **Anexo A.11**): el recorte que la dibuja anima con `animate={{ width: drawn ? W : 0 }}` (retraso de 250 ms). Se dibuja **cada vez que se abre**.
- Sigue el tooltip con cursor y con ← → Home End Esc, anunciado con `aria-live`.
- Sin historial (Sprint 2): el resumen dice "Aún sin partidas" y la gráfica abierta muestra la línea discontinua en el ELO actual con "Tu curva empieza con tu primera partida."

### 9.3 Escena · `pieceScene.ts`
```ts
export interface PieceScene {
  setPiece(type: PieceType, material: 'w' | 'b' | 'a'): void;   // cambia la pieza con una caída con rebote (900 ms)
  setTheme(t: { tileL: string; tileD: string; frame: string; dark: boolean }, accentHex: string): void;
  dispose(): void;
}
```
- Cámara `fov 30`, posición `(0, 2.9, 8.4)` mirando a `(0, 1, 0)`. **Lo bastante lejos para que la cruz del rey y las esquinas del pedestal no se corten al girar** (bug visto en la vista).
- Pedestal: 3×3 casillas de `.66` + marco `2.2 × .22`, colores de `THEME_3D[theme]`.
- Pieza `createPiece(type, material, quality)` escalada ×2.2, con un vaivén de ±.03 en `y`. Material `a` = `MeshPhysicalMaterial` con el color del acento.
- Luz: hemisférica .85 (.45 en tema oscuro) + foco cálido 1.6 (2.2 en oscuro) con sombra + contraluz frío .5.
- Giro: `setContinuous(true)` con velocidad automática .006 rad/frame. Al arrastrar (`pointerdown` + `setPointerCapture`), `stage.rotation.y += dx * .012` y al soltar la inercia se va frenando hasta la velocidad automática (×.97 por frame). Cursor `grab`/`grabbing`. `touch-action: pan-y` para no bloquear el scroll en móvil.
- Fuera de pantalla (al bajar por el perfil) el bucle se pausa solo (`IntersectionObserver` del stage).
- Reducir movimiento: sin giro automático ni caída. El arrastre sí funciona.

`PieceShowcase.tsx`:
```tsx
const loadPiece = () => import('@/components/three/scenes/pieceScene').then(m => m.createPieceScene);
const { prefs } = usePreferences();
const { canvasRef, scene, failed } = useThreeScene(loadPiece);
useEffect(() => { scene?.setPiece(prefs.piece, prefs.material); }, [scene, prefs.piece, prefs.material]);
useEffect(() => { scene?.setTheme(THEME_3D[prefs.theme], accentHex(prefs.theme, prefs.accent)); }, [scene, prefs.theme, prefs.accent]);
```
El selector de pieza llama `set('piece', 'n')`. En esta fase el cambio solo vive en la página; en la Fase 6 se guarda.

### 9.4 Datos en este sprint
Sin historial todavía (llega en el Sprint 3): `EloChart` y `ResultsStrip` muestran estado vacío; las cifras en 0 y "% victorias" con "—".
**Página de muestra** `src/app/(frontend)/dev/perfil/page.tsx` (Server Component): si `process.env.ENABLE_DEV_ROUTES !== 'true'` → `notFound()`. Si no, renderiza la vista con datos de ejemplo de `fixtures/profileDemo.ts` (31 puntos de 1200 a 1450, 34 resultados con 23 victorias y las 5 últimas ganadas, rótulo "Datos de ejemplo").

### 9.5 Cierre
Lighthouse `/dashboard/profile` ≥ 85. Profiler: sin re-render continuo. Performance: con el héroe fuera de pantalla no hay frames 3D.

`.pr/commit-33.txt`
```
feat(dashboard): perfil con pieza 3D, bandas reordenables y elo bajo demanda

- pieza 3D sobre pedestal que gira sola y con arrastre, selector de seis piezas
- encabezado y secciones ordenados por preferencias con bandas alternas según lo visible
- evolución de elo cerrada por defecto; se abre con un botón y la gráfica se dibuja
- cifras con números lining para que no tapen las etiquetas
- página de muestra con datos de ejemplo solo en desarrollo

Refs #33
```
Título del PR: `feat(dashboard): perfil con pieza 3D y elo bajo botón`.

---

## 10. Fase 6 · Personalizar el perfil (#34)

**Rama:** `feature/s2-34-personalizar-perfil`
**Para empezar:** #33 MERGED y contratos de preferencias (#25).
**Para abrir el PR:** #28 de Mario MERGED.

### 10.1 Panel "Personaliza tu perfil."
`<dialog className="sheet" aria-labelledby="pz-title">`, abierto con el botón "Personalizar" (`showModal()`). Los cambios **se ven al instante** en la página. `Esc` y la X cierran.

| Grupo | Control | Valores |
|---|---|---|
| Tema | 4 opciones (`Segmented` en grid de 2) con muestra de color | Pergamino · Noche · Salvia · Pizarra |
| Color de acento | 5 círculos de 40 px (`<input type="radio">` + `<label>` con `aria-label`); el elegido lleva doble anillo | Vino · Latón · Bosque · Océano · Tinta |
| Tu pieza 3D | 6 píldoras + 3 de material | Rey · Dama · Torre · Alfil · Caballo · Peón · Marfil · Ébano · Del acento |
| Encabezado | 3 filas con el nombre y una pista mono | Clásico (nombre · pieza · ELO) · Invertido · Pieza primero |
| Secciones · orden y visibilidad | Una fila por sección: nombre · ↑ · ↓ (deshabilitados en los extremos) · `Switch` | Rendimiento · Evolución de Elo · Últimas partidas · Siguiente partida |

- Pie fijo: "Restablecer" (texto `accent`) + estado ("Guardando…" / "Guardado" / "No se pudo guardar", `aria-live`) + botón principal "Listo".
- Mover una sección anuncia con `aria-live`: "Evolución de Elo, posición 1 de 4".
- No se puede ocultar la última sección visible: el `Switch` queda deshabilitado (el contrato lo exige: máximo 3 ocultas).

### 10.2 Persistencia · se amplía `PreferencesProvider`
```ts
// api/preferencesApi.ts
export const preferencesApi = {
  get: () => apiFetch<{ preferences: ProfilePreferences }>('/profile/preferences', { cache: 'no-store' }),
  save: (p: ProfilePreferences, signal?: AbortSignal) =>
    apiFetch<{ preferences: ProfilePreferences }>('/profile/preferences', { method: 'PUT', body: JSON.stringify(p), signal }),
  reset: () => apiFetch<void>('/profile/preferences', { method: 'DELETE' }),     // 204
};
```
En el provider:
- **Optimista:** cada cambio se aplica al instante y se programa un guardado con **debounce de 600 ms**. Solo vale el último: cada guardado nuevo aborta el anterior (`AbortController`).
- Se guarda el **objeto completo** (PUT). Antes de enviar se valida con `ProfilePreferencesSchema.safeParse`; si falla, no se envía (es un bug del front).
- **OK 200** → `lastSaved = respuesta` y estado "Guardado".
- **400** → se vuelve a `lastSaved` + toast "No se pudo guardar esa combinación." **401** → `/login?next=/dashboard/profile`. **Red/500** → se mantiene lo local, estado "No se pudo guardar" y botón "Reintentar".
- **"Listo"** → si hay guardado pendiente, se envía ya (`flush`) y se cierra.
- **"Restablecer"** → `DELETE` (204) → `replace(DEFAULT_PREFERENCES)` y `lastSaved = DEFAULT_PREFERENCES`.
- Tema y acento se copian a `localStorage` (`cpp:prefs`) solo para el anti-parpadeo de §2.4.
- Al cargar el perfil (`GET /profile`, que ya trae `preferences`) → `replace(profile.preferences)` y `lastSaved` igual.

### 10.3 Pruebas
`preferences.test.ts` (Vitest + Testing Library):
- mover una sección arriba y abajo;
- no permitir ocultar la última visible;
- tras 600 ms se llama `save` una sola vez aunque haya 3 cambios seguidos;
- con 400 se revierte al último guardado.

### 10.4 Cierre
Probar: personalizar en Chrome, abrir la misma cuenta en Firefox (o incógnito) → mismo tema, acento, pieza, encabezado y secciones. Recargar → sin parpadeo de tema.

`.pr/commit-34.txt`
```
feat(profile): panel para personalizar el perfil guardado en la cuenta

- tema, acento, pieza 3D, material, encabezado, orden y visibilidad de secciones
- vista previa al instante y guardado optimista con debounce y cancelación
- restablecer con DELETE 204; reversión ante 400 y reintento ante fallos de red
- caché local del tema para evitar parpadeo al cargar

Refs #34
```
Título del PR: `feat(profile): personalizar el perfil`.

---

## 11. Fase 7 · Landing 3D optimizada (#35)

**Rama:** `feature/s2-35-landing-optimizada` · **Depende de:** #30 MERGED

**La landing usa el kit.** `landingScene.ts` toma las piezas de `createPiece` (sin duplicar perfiles de torno) y el bucle de `createStage` (render bajo demanda, pausas y calidad). El componente `Landing.tsx` y la escena están en **Anexo A.13**.

Lo demás se mantiene:
- `three` en un chunk aparte que se importa tras el primer pintado;
- `useScroll` + `useSpring` + `useTransform` de Motion para la cámara y los capítulos, sin re-render;
- polvo solo en calidad alta, a ~30 fps;
- fondo estático y texto legible mientras carga o sin WebGL.

`.pr/commit-35.txt`
```
perf(landing): landing sobre el kit 3D compartido con carga diferida y scroll con motion

- piezas y bucle del kit compartido; sin geometría duplicada
- three en chunk aparte importado tras el primer pintado
- render bajo demanda, pausa con pestaña oculta y calidad adaptativa
- useScroll + useSpring + useTransform para cámara y capítulos sin re-render

Refs #35
```

---

## 12. Fase 8 · Release (sáb 31)

Mario abre `release/v0.2.0`. Desde ahí, **solo arreglos**:
```bash
git fetch origin
git switch -c bugfix/s2-<N>-<slug> origin/release/v0.2.0
```
(Antes, issue `type:bug` para tener `<N>`.) PR con `--base release/v0.2.0`, commit `fix(<ámbito>): …`. Revisar y aprobar el PR del release a `main` y el back-merge `main` → `develop`.

---

## 13. Buenas prácticas (Claude Code las revisa antes de cada PR)

- **Server Components por defecto**; `'use client'` solo en islas con estado, efectos o eventos.
- **Separación:** lógica en hooks (`useMatchmaking`, `usePracticeGame`, `usePreferences`), dibujo 3D en escenas (`scenes/*.ts`, sin React), presentación en componentes.
- **React → escena solo por efectos** (§3.4.1). Ninguna escena guarda referencias a estado de React ni lo consulta en su bucle.
- **Tipos del contrato importados**, nunca redefinidos (salvo `contracts.tmp.ts`, que se borra).
- **Limpieza completa:** todo `setTimeout`, `setInterval`, `requestAnimationFrame`, `AbortController`, observer, listener y escena se limpia en el `return` del efecto.
- **Nada de `any`.** Errores de API como `ApiError` con `code`.
- **Accesibilidad:** botones reales, radios nativos, `aria-live`, foco visible, teclado en tablero (vía candidatas), gráfica, radiogroups y panel; contraste ≥ 4.5:1 en los 4 temas.
- **Sin `localStorage` para la sesión**; solo para la caché de tema.

---

## 14. Contrato API · Sprint 2 (idéntico en el .md de Mario)

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

## 15. Prueba manual (producción local: `npm run build && npm start`)

- [ ] No aparece el botón "N" de Next
- [ ] `/login` escritorio:
  - [ ] piezas caen al cargar y la cámara sigue el cursor;
  - [ ] tocar pieza → se levanta con destinos marcados;
  - [ ] jugar → arco, captura que se hunde, rival responde;
  - [ ] flechas y % cambian;
  - [ ] candidatas juegan con teclado;
  - [ ] "Reiniciar" funciona.
- [ ] `/login` móvil (390 px): solo formulario; Network sin `three` ni `chess.js`
- [ ] Perfil:
  - [ ] la pieza 3D gira sola y se gira arrastrando;
  - [ ] los 6 botones cambian la pieza con una caída;
  - [ ] la cruz del rey y el pedestal nunca se cortan.
- [ ] Perfil: 1450 y 23 **no** tapan "en los últimos 30 días" ni "victorias" en pantalla completa
- [ ] "Evolución de Elo" cerrada al entrar; "Ver evolución" la abre y la gráfica se dibuja; "Ocultar evolución" la cierra; con Tab no se entra al contenido cerrado
- [ ] Personalizar:
  - [ ] cada opción se ve al instante;
  - [ ] "Guardado" aparece;
  - [ ] recargar mantiene todo, sin parpadeo;
  - [ ] otro navegador ve lo mismo;
  - [ ] "Restablecer" vuelve a Pergamino/Vino/Rey;
  - [ ] no deja ocultar las 4 secciones.
- [ ] Tema Noche: textos legibles, acento claro, pedestal oscuro y más luz en la pieza
- [ ] Jugar con dos cuentas:
  - [ ] reyes → caballo saltando con ondas → reyes al centro con destello;
  - [ ] ambos ven "Partida encontrada" con colores opuestos;
  - [ ] cuenta atrás → página de la partida con las piezas cayendo.
- [ ] Jugar con un bot: emparejado en ≤ 2 s
- [ ] Cancelar (204) y cancelar dos veces (404 manejado) sin error visible
- [ ] Bajar por el perfil: con la pieza fuera de pantalla, sin frames 3D (pestaña Performance)
- [ ] Con "reducir movimiento": sin órbitas, giros ni caídas; todo visible
- [ ] Sin WebGL (Chrome → `chrome://flags` → desactivar WebGL): login solo formulario, perfil con glifo, Jugar con el 4×4 2D
- [ ] Lighthouse según §3.5, sin errores en consola

## 16. Hecho cuando (Sprint 2)
- [ ] Checklist §15 completo
- [ ] Mocks apagados y `contracts.tmp.ts` borrado
- [ ] `three` fuera del First Load JS de todas las rutas (`next build`)
- [ ] `npm run lint`, `typecheck`, `test`, `build` y CI verdes
- [ ] Issues #29, #30, #31, #32, #33, #34 (y #35 si entró) cerrados por sus PR
- [ ] Ningún commit ni PR con atribución a IA

## 17. Demo (parte de Jose)
1. `/` → recorrido 3D de la landing.
2. `/login` → jugar Ac4 en el tablero 3D, ver la respuesta y las flechas; entrar.
3. Perfil → girar la pieza, cambiar a caballo, abrir "Ver evolución" (en `/dev/perfil` con datos de ejemplo).
4. "Personalizar" → tema Noche, acento Latón, pieza Torre de ébano, encabezado "Pieza primero", subir "Últimas partidas" → abrir la misma cuenta en otro navegador y mostrar que se guardó.
5. Jugar con dos navegadores lado a lado → búsqueda 3D → "Partida encontrada" a la vez → cuenta atrás → piezas cayendo en la página de la partida.
6. Lighthouse en vivo de `/dashboard/profile`.

---

## Anexo A · Código de apoyo

Código completo de lo que las fases nombran. Claude Code lo copia y lo ajusta a lo que ya existe en el repo, sin cambiar el comportamiento descrito.

### A.1 Fuentes · `src/lib/fonts.ts`
```ts
import { Cormorant_Garamond, Manrope, JetBrains_Mono, Noto_Sans_Symbols_2 } from 'next/font/google';

export const cormorant = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600'], style: ['normal', 'italic'], variable: '--font-cormorant', display: 'swap' });
export const manrope   = Manrope({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-manrope', display: 'swap' });
export const jetbrains = JetBrains_Mono({ subsets: ['latin'], weight: ['400', '500'], variable: '--font-jetbrains', display: 'swap', preload: false });
// Glifos ♔♕♖♗♘♙ del selector de pieza y de las alternativas 2D. preload false para no cargarla en todas las páginas.
export const chessSymbols = Noto_Sans_Symbols_2({ subsets: ['symbols'], weight: '400', variable: '--font-chess-symbols', display: 'swap', preload: false });
```
Si el build dice que el subset `symbols` no existe, usa el que liste el mensaje de error.

### A.2 Cabecera · `SiteHeader.tsx`
```tsx
'use client';
import { useLayoutEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { useMotionValueEvent, useScroll } from 'motion/react';
import * as m from 'motion/react-m';
import { NAV } from './nav';
import { SPRING } from '@/lib/motion';

export function SiteHeader({ user }: { user?: { username: string; displayName: string | null } }) {
  const pathname = usePathname();
  const listRef = useRef<HTMLUListElement>(null);
  const [bar, setBar] = useState<{ x: number; w: number } | null>(null);
  const [scrolled, setScrolled] = useState(false);
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', y => { const s = y > 8; setScrolled(prev => (prev === s ? prev : s)); });

  useLayoutEffect(() => {
    const ul = listRef.current;
    if (!ul) return;
    const measure = () => {
      const a = ul.querySelector<HTMLElement>('[aria-current="page"]');
      setBar(a ? { x: a.offsetLeft, w: a.offsetWidth } : null);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(ul);
    return () => ro.disconnect();
  }, [pathname]);

  return (
    <header data-scrolled={scrolled}
      className="sticky top-0 z-20 transition-colors duration-300 data-[scrolled=true]:bg-paper/82 data-[scrolled=true]:backdrop-blur-[20px] data-[scrolled=true]:backdrop-saturate-150">
      <div className="mx-auto flex min-h-[60px] max-w-[1200px] items-center gap-8 px-5 lg:px-10">
        {/* logo: rey en círculo + "Chess Predictor Pro" en Cormorant */}
        <nav aria-label="Principal" className="hidden flex-1 justify-center md:flex">
          <ul ref={listRef} className="relative flex gap-x-7 text-caption">
            {NAV.map(item => {
              const active = pathname.startsWith(item.href);
              if (!item.ready)
                return <li key={item.href}><span aria-disabled title="Próximamente" className="cursor-default py-5 text-muted">{item.label}</span></li>;
              return (
                <li key={item.href}>
                  <Link href={item.href} aria-current={active ? 'page' : undefined}
                    className={`inline-block py-5 transition-colors ${active ? 'text-ink' : 'text-ink-soft hover:text-ink'}`}>
                    {item.label}{'isNew' in item && item.isNew && <span className="ml-1.5 text-[11px] font-semibold text-accent">Nuevo</span>}
                  </Link>
                </li>
              );
            })}
            {bar && (
              <m.span aria-hidden className="absolute bottom-0 left-0 h-0.5 w-px bg-accent"
                style={{ originX: 0 }} initial={false} animate={{ x: bar.x, scaleX: bar.w }} transition={SPRING} />
            )}
          </ul>
        </nav>
        {/* usuario: inicial en círculo bg-ink text-paper · nombre · "Cerrar sesión" · en móvil, botón "Menú" que abre <dialog className="sheet"> */}
      </div>
    </header>
  );
}
```
`dashboard/layout.tsx`: `<PreferencesProvider>` + `<SiteHeader />` + `<main>` **sin** `max-w` (las bandas van a ancho completo; cada banda centra su contenido).

### A.3 Cliente API y `matchmakingApi.ts`
`src/lib/apiClient.ts` (se amplía el del Sprint 1):
```ts
export class ApiError extends Error {
  constructor(public status: number, public code: string, message: string,
              public fields?: Record<string, string[]>, public meta?: Record<string, unknown>) { super(message); }
}
// en apiFetch:
//   - acepta init.signal (para cancelar);
//   - error → new ApiError(res.status, body.error?.code ?? 'UNKNOWN', body.error?.message ?? 'Error inesperado', body.error?.fields, body.error?.meta)
//   - 204 → return undefined (ya estaba)
```
`src/modules/matchmaking/presentation/api/matchmakingApi.ts`:
```ts
import { apiFetch } from '@/lib/apiClient';
import type { MatchmakingStatus, MatchSummary, QueueStats, TimeControl } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

export interface MatchmakingApi {
  join(timeControl: TimeControl): Promise<MatchmakingStatus>;
  leave(): Promise<void>;
  status(signal?: AbortSignal): Promise<MatchmakingStatus>;
  stats(): Promise<QueueStats>;
  match(id: string): Promise<{ match: MatchSummary }>;
  abort(id: string): Promise<void>;
}

const http: MatchmakingApi = {
  join: tc => apiFetch('/matchmaking/queue', { method: 'POST', body: JSON.stringify({ timeControl: tc }) }),
  leave: () => apiFetch('/matchmaking/queue', { method: 'DELETE' }),
  status: signal => apiFetch('/matchmaking/status', { signal, cache: 'no-store' }),
  stats: () => apiFetch('/matchmaking/stats', { cache: 'no-store' }),
  match: id => apiFetch(`/matches/${id}`),
  abort: id => apiFetch(`/matches/${id}`, { method: 'DELETE' }),
};

export const matchmakingApi: MatchmakingApi = process.env.NEXT_PUBLIC_API_MOCK === '1' ? createMock() : http;
```
**Mock** (`createMock()`, misma interfaz):
- guarda `joinedAt` en memoria;
- `status()` devuelve `searching` (con `eloRange` que se amplía igual que el servidor) y a los 6 s `matched` contra `bob_gambito (1478)`;
- `join` dos veces → `ApiError(409, 'ALREADY_IN_QUEUE')`;
- `leave` sin estar en la cola → `ApiError(404, 'NOT_IN_QUEUE')`.

### A.4 Máquina de estados · `useMatchmaking.ts`
```ts
'use client';
import { useCallback, useEffect, useReducer } from 'react';
import { useRouter } from 'next/navigation';
import { ApiError } from '@/lib/apiClient';
import { matchmakingApi } from '../api/matchmakingApi';
import type { MatchmakingStatus, MatchSummary, TimeControl } from '@/modules/matchmaking/infrastructure/dto/matchmakingSchemas';

type Searching = Extract<MatchmakingStatus, { state: 'searching' }>;
export type PlayState =
  | { phase: 'loading' }
  | { phase: 'lobby'; error?: string }
  | { phase: 'joining'; timeControl: TimeControl }
  | { phase: 'searching'; status: Searching }
  | { phase: 'leaving'; status: Searching }
  | { phase: 'matched'; match: MatchSummary };

type Action =
  | { type: 'LOBBY'; error?: string }
  | { type: 'JOIN'; timeControl: TimeControl }
  | { type: 'SEARCHING'; status: Searching }
  | { type: 'LEAVE' }
  | { type: 'MATCHED'; match: MatchSummary };

function reducer(s: PlayState, a: Action): PlayState {
  switch (a.type) {
    case 'LOBBY':     return { phase: 'lobby', error: a.error };
    case 'JOIN':      return s.phase === 'lobby' ? { phase: 'joining', timeControl: a.timeControl } : s;
    case 'SEARCHING': return s.phase === 'leaving' ? s : { phase: 'searching', status: a.status };
    case 'LEAVE':     return s.phase === 'searching' ? { phase: 'leaving', status: s.status } : s;
    case 'MATCHED':   return { phase: 'matched', match: a.match };
  }
}

export function useMatchmaking() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, { phase: 'loading' });
  const toLogin = useCallback(() => router.replace('/login?next=/dashboard/play'), [router]);

  const apply = useCallback((s: MatchmakingStatus) => {
    if (s.state === 'idle') dispatch({ type: 'LOBBY' });
    else if (s.state === 'searching') dispatch({ type: 'SEARCHING', status: s });
    else dispatch({ type: 'MATCHED', match: s.match });
  }, []);

  // 1) Al entrar: reanudar lo que haya (seguía buscando o ya tenía partida)
  useEffect(() => {
    const ctrl = new AbortController();
    matchmakingApi.status(ctrl.signal).then(apply).catch(e => {
      if (ctrl.signal.aborted) return;
      if (e instanceof ApiError && e.status === 401) toLogin();
      else dispatch({ type: 'LOBBY', error: 'No pudimos cargar el estado. Intenta de nuevo.' });
    });
    return () => ctrl.abort();
  }, [apply, toLogin]);

  // 2) Polling mientras busca: setTimeout encadenado (nunca setInterval), pausa con la pestaña oculta, backoff con errores
  useEffect(() => {
    if (state.phase !== 'searching') return;
    const ctrl = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;
    const tick = async () => {
      if (document.hidden) { timer = setTimeout(tick, 1000); return; }
      try {
        const s = await matchmakingApi.status(ctrl.signal);
        failures = 0;
        apply(s);
        if (s.state === 'searching') timer = setTimeout(tick, s.pollAfterMs ?? 2000);
      } catch (e) {
        if (ctrl.signal.aborted) return;
        if (e instanceof ApiError && e.status === 401) { toLogin(); return; }
        failures += 1;
        if (failures >= 5) dispatch({ type: 'LOBBY', error: 'Perdimos la conexión. Vuelve a buscar.' });
        else timer = setTimeout(tick, Math.min(2000 * 2 ** failures, 15000));
      }
    };
    timer = setTimeout(tick, 0);
    return () => { ctrl.abort(); clearTimeout(timer); };
  }, [state.phase, apply, toLogin]);

  // 3) Si cierra la pestaña mientras busca: salir de la cola (keepalive deja terminar la petición)
  useEffect(() => {
    if (state.phase !== 'searching') return;
    const onHide = () => { void fetch('/api/v1/matchmaking/queue', { method: 'DELETE', keepalive: true, credentials: 'same-origin' }); };
    window.addEventListener('pagehide', onHide);
    return () => window.removeEventListener('pagehide', onHide);
  }, [state.phase]);

  const join = useCallback(async (tc: TimeControl) => {
    dispatch({ type: 'JOIN', timeControl: tc });
    try {
      apply(await matchmakingApi.join(tc));
    } catch (e) {
      if (!(e instanceof ApiError)) return dispatch({ type: 'LOBBY', error: 'Sin conexión. Intenta de nuevo.' });
      if (e.status === 401) return toLogin();
      if (e.code === 'ALREADY_IN_QUEUE') return apply(await matchmakingApi.status());
      const matchId = e.meta?.matchId;
      if (e.code === 'ACTIVE_MATCH_EXISTS' && typeof matchId === 'string')
        return dispatch({ type: 'MATCHED', match: (await matchmakingApi.match(matchId)).match });
      dispatch({ type: 'LOBBY', error: e.message });
    }
  }, [apply, toLogin]);

  const cancel = useCallback(async () => {
    dispatch({ type: 'LEAVE' });
    try { await matchmakingApi.leave(); dispatch({ type: 'LOBBY' }); }
    catch (e) {
      if (e instanceof ApiError && e.code === 'NOT_IN_QUEUE') return dispatch({ type: 'LOBBY' });   // ya estaba fuera
      dispatch({ type: 'LOBBY', error: 'No pudimos cancelar. Intenta de nuevo.' });
    }
  }, []);

  const abandon = useCallback(async (matchId: string) => {
    try { await matchmakingApi.abort(matchId); } catch { /* 404/409: igual vuelve al lobby */ }
    dispatch({ type: 'LOBBY' });
  }, []);

  return { state, join, cancel, abandon };
}
```
**Decisión:** no se sale de la cola al desmontar, porque en desarrollo React monta dos veces y eso sacaría al usuario por error.
- Si navega a otra página de la app y vuelve, la búsqueda se **reanuda** (paso 1).
- Si cierra la pestaña, sale por `pagehide`.
- Si no vuelve, el backend lo deja de emparejar a los 15 s.

### A.5 Piezas de la pantalla Jugar
**Textos que cambian.** `PlayScreen.tsx` usa `AnimatePresence mode="wait"` en la columna izquierda. Cada fase es un `<m.section key={fase}>` con `initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}`. Un `<p role="status" aria-live="polite" className="sr-only">` anuncia cada cambio de fase.

**Lobby:**
- Ritmos en `role="radiogroup"` con etiquetas de `TIME_CONTROL_LABEL`.
- Mientras `joining`: botón deshabilitado con "Buscando…".
- `error` → texto `text-danger` sobre el botón.
- El punto de "jugadores buscando" late con una animación CSS.

**`EloRangeBar`**: pista de 1000 a 2000 y banda **centrada en tu ELO**. La banda ocupa el 80 % (±400) y se escala con `scaleX`, así que solo se anima con transform.
```tsx
const center = (elo - 1000) / 10;                                  // % de la pista
<p className="font-mono text-caption">Rango de ELO · {range.min} – {range.max}</p>
<div className="relative h-2 rounded bg-rule">
  <div className="absolute inset-0 overflow-hidden rounded">
    <m.span className="absolute inset-y-0 rounded bg-accent/35" style={{ left: `${center - 40}%`, width: '80%', originX: 0.5 }}
      animate={{ scaleX: (range.max - range.min) / 800 }} transition={SPRING_SOFT} />
  </div>
  <span className="absolute top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent ring-[3px] ring-paper" style={{ left: `${center}%` }} />
</div>
{/* debajo: 1000 · 1500 · 2000 en mono */}
```

**`TipRotator`**: consejo en Cormorant itálica que cambia cada 6 s con `AnimatePresence mode="wait"` (fundido + 6 px). Consejos:
- "Desarrolla caballos antes que alfiles."
- "Enroca pronto: el rey seguro juega mejor."
- "Controla el centro con peones y piezas."
- "Antes de mover, pregúntate qué amenaza el rival."

**Reloj de búsqueda**: `m:ss` desde `joinedAt`, con un solo `setInterval(1000)`.

**`KnightLoop`** (alternativa sin WebGL del escenario):
```tsx
'use client';
import { useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { SPRING_HOP } from '@/lib/motion';

const PATH = [[0,0],[1,2],[3,3],[2,1],[0,2],[1,0],[3,1],[2,3]] as const;   // cada paso es una jugada de caballo

export function KnightLoop() {
  const reduce = useReducedMotion();
  const [step, setStep] = useState(0);
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setStep(s => (s + 1) % 14), 700);   // va y vuelve por el camino
    return () => clearInterval(id);
  }, [reduce]);
  const idx = step < 8 ? step : 14 - step;
  const [c, r] = PATH[idx];
  return (
    <div aria-hidden className="relative grid aspect-square w-full max-w-[600px] grid-cols-4 overflow-hidden rounded-[28px]">
      {Array.from({ length: 16 }, (_, i) => (
        <span key={i} className={(Math.floor(i / 4) + (i % 4)) % 2 ? 'bg-[#c9b08e]' : 'bg-[#efe4d3]'} />
      ))}
      <m.span className="absolute left-0 top-0 flex size-1/4 items-center justify-center"
        animate={{ x: `${c * 100}%`, y: `${r * 100}%` }} transition={SPRING_HOP}>
        <span className="font-chess text-[clamp(40px,8vw,96px)] leading-none text-[#2a1417]">{'♞︎'}</span>
      </m.span>
    </div>
  );
}
```

### A.6 Página de la partida · `dashboard/arena/[matchId]/page.tsx`
`'use client'` con `useParams()`: con `cacheComponents`, leer `params` en un Server Component exige `<Suspense>`.
- Carga `matchmakingApi.match(id)`.
- Muestra `<PlayStage phase="arena" />` a la derecha.

| Respuesta | UI |
|---|---|
| 200 `pending` | eyebrow "Partida {id corto} · alice vs bob_gambito" · `h1` "La arena llega en el Sprint 3." · "La partida quedó creada y ambos jugadores la ven." · botón fantasma "Abandonar y volver" (`abort` → `/dashboard/play`). Revisa el estado cada 5 s (mismo patrón de polling) por si el rival abandona |
| 200 `aborted` | "Tu rival abandonó la partida." + botón principal "Buscar otra" → `/dashboard/play` |
| 404 `MATCH_NOT_FOUND` | "Esta partida no existe." + enlace a Jugar |
| 403 | "No participas en esta partida." + enlace a Jugar |
| 400 | "El enlace de la partida no es válido." |
| 401 | `/login?next=…` |

### A.7 Tipos y piezas con id estable · `src/components/chess/`
Las piezas necesitan un **id que no cambie** para que la escena las mueva de casilla en casilla (en vez de borrarlas y crearlas).
```ts
// types.ts
export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type Square = `${'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h'}${1 | 2 | 3 | 4 | 5 | 6 | 7 | 8}`;
export interface BoardPiece { id: string; type: PieceType; color: Color; square: Square }
export interface Arrow { from: Square; to: Square; weight: number }   // 0..1 → opacidad
export interface MoveLike { from: Square; to: Square; promotion?: PieceType }

// pieces.ts
import { Chess } from 'chess.js';
import type { BoardPiece, MoveLike, Square } from './types';

export function piecesFromFen(fen: string): BoardPiece[] {
  const out: BoardPiece[] = [];
  const count: Record<string, number> = {};
  new Chess(fen).board().forEach(row => row.forEach(cell => {
    if (!cell) return;
    const key = cell.color + cell.type;
    count[key] = (count[key] ?? 0) + 1;
    out.push({ id: `${key}${count[key]}`, type: cell.type, color: cell.color, square: cell.square as Square });
  }));
  return out;
}

/** Aplica una jugada YA validada por chess.js a la lista de piezas, conservando ids. */
export function movePieces(pieces: BoardPiece[], mv: MoveLike): BoardPiece[] {
  const mover = pieces.find(p => p.square === mv.from);
  if (!mover) return pieces;
  const fileDiff = mv.to.charCodeAt(0) - mv.from.charCodeAt(0);
  const isCastle = mover.type === 'k' && Math.abs(fileDiff) === 2;
  const targetOccupied = pieces.some(p => p.square === mv.to);
  const isEnPassant = mover.type === 'p' && fileDiff !== 0 && !targetOccupied;
  const capturedSq = isEnPassant ? (`${mv.to[0]}${mv.from[1]}` as Square) : mv.to;
  const rank = mv.from[1];
  const rookFrom = isCastle ? ((fileDiff > 0 ? `h${rank}` : `a${rank}`) as Square) : null;
  const rookTo   = isCastle ? ((fileDiff > 0 ? `f${rank}` : `d${rank}`) as Square) : null;

  return pieces
    .filter(p => p.square !== capturedSq || p.id === mover.id)
    .map(p => {
      if (p.id === mover.id) return { ...p, square: mv.to, type: mv.promotion ?? p.type };
      if (rookFrom && p.square === rookFrom) return { ...p, square: rookTo! };
      return p;
    });
}
```
Test (`pieces.test.ts`):
- el enroque corto y el largo mueven la torre;
- la captura al paso elimina el peón correcto;
- la coronación cambia el tipo y conserva el id.

### A.8 Libro y lógica del tablero del login
```ts
// book.ts
export const START_FEN = 'r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3';  // 1.e4 e5 2.Cf3 Cc6

// Respuesta del rival según la jugada del usuario (from+to)
export const REPLIES: Record<string, string> = {
  f1c4: 'f8c5', f1b5: 'a7a6', d2d4: 'e5d4', b1c3: 'g8f6', f3e5: 'c6e5', f3g5: 'd8g5', f1e2: 'g8f6', d2d3: 'g8f6',
};
export const FALLBACK_REPLIES = ['g8f6', 'd7d6', 'f8e7', 'h7h6', 'a7a6'];

// Jugadas candidatas por historial (from+to separados por espacio). Porcentajes de ejemplo.
export const CANDIDATES: Record<string, { from: string; to: string; pct: number; name: string; san: string }[]> = {
  '': [
    { from: 'f1', to: 'c4', pct: 52, name: 'Italiana', san: 'Ac4' },
    { from: 'f1', to: 'b5', pct: 31, name: 'Española', san: 'Ab5' },
    { from: 'd2', to: 'd4', pct: 17, name: 'Escocesa', san: 'd4' },
  ],
  'f1c4 f8c5': [
    { from: 'c2', to: 'c3', pct: 41, name: 'Giuoco piano', san: 'c3' },
    { from: 'd2', to: 'd3', pct: 27, name: 'Pianissimo', san: 'd3' },
    { from: 'b1', to: 'c3', pct: 19, name: 'Desarrollo', san: 'Cc3' },
  ],
  'f1b5 a7a6': [
    { from: 'b5', to: 'a4', pct: 58, name: 'Retirada', san: 'Aa4' },
    { from: 'b5', to: 'c6', pct: 24, name: 'Variante del cambio', san: 'Axc6' },
    { from: 'b1', to: 'c3', pct: 11, name: 'Desarrollo', san: 'Cc3' },
  ],
  'd2d4 e5d4': [
    { from: 'f3', to: 'd4', pct: 71, name: 'Recaptura', san: 'Cxd4' },
    { from: 'c2', to: 'c3', pct: 18, name: 'Gambito escocés', san: 'c3' },
    { from: 'f1', to: 'c4', pct: 11, name: 'Gambito', san: 'Ac4' },
  ],
};
```
`usePracticeGame()`:
- `const game = useRef(new Chess(START_FEN))`. Estado: `pieces` (de `piecesFromFen`), `selected`, `lastMove`, `history: string[]`, `busy`, `status`.
- `onSquare(sq)` (estable con `useCallback`; lee el estado con refs para no cambiar de identidad en cada render):
  - con `busy` → nada;
  - si hay selección y `sq` está en `targets` o `captures` → `play(selected, sq)`;
  - si `sq` tiene pieza blanca → seleccionarla (o deseleccionar si es la misma);
  - si no → limpiar la selección.
- `play(from, to)`:
  - `const mv = game.current.move({ from, to, promotion: 'q' })` dentro de `try` (chess.js **lanza** si es ilegal);
  - `setPieces(p => movePieces(p, mv))`, `lastMove`, `history`, estado "Jugaste {san}. El rival piensa…" y `busy = true`.
- A los 900 ms responde el rival: `REPLIES[from+to]`, luego `FALLBACK_REPLIES` y, si ninguna es legal, una al azar de `game.moves({ verbose: true })`. Estado "El rival respondió {san}. Tu turno."
- `game.isGameOver()` → "Fin de la demo. Reinicia la posición."
- `reset()` → nueva instancia con `START_FEN`, todo el estado inicial y las piezas vuelven a caer.
- Candidatas: `CANDIDATES[history.join(' ')] ?? []`. Flechas solo cuando no está `busy`, con `weight = pct / 100`.
- Notación en español: en el SAN de chess.js se cambia la primera letra si es pieza (`K→R`, `Q→D`, `R→T`, `B→A`, `N→C`).

### A.9 Carga diferida · `PracticeBoardLazy.tsx`
```tsx
'use client';
import dynamic from 'next/dynamic';
import { useSyncExternalStore } from 'react';

const Skeleton = () => <div aria-hidden className="aspect-square w-full max-w-[600px] rounded-[28px] bg-[#e6d9c4]" />;
const PracticeBoard3D = dynamic(() => import('./PracticeBoard3D'), { ssr: false, loading: Skeleton });

const query = '(min-width: 1024px)';
const subscribe = (cb: () => void) => { const mq = matchMedia(query); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); };
const isDesktop = () => matchMedia(query).matches;

export function PracticeBoardLazy() {
  const desktop = useSyncExternalStore(subscribe, isDesktop, () => false);
  return desktop ? <PracticeBoard3D /> : null;       // en móvil no se descarga ni three ni chess.js
}
```
En móvil la columna izquierda se oculta y el formulario ocupa toda la pantalla.

### A.10 Formulario de login y registro
Se mantiene la lógica del Sprint 1 (react-hook-form + contratos Zod), con estilo v2:
- logo + "¿Sin cuenta? Crear una ›" arriba;
- `h1` "Entrar." (80 px);
- correo y contraseña con "Mostrar" (`Input` de §2.5);
- botón principal "Entrar" a ancho completo (en login es `bg-wine`, fijo, sin tema) · "o" · "Continuar con Google" como botón fantasma;
- pie con la universidad;
- entrada con `animate-rise` (CSS). Si hay `?error=oauth`, el aviso aparece arriba con `animate-rise`.

### A.11 `EloChart.tsx`
```tsx
'use client';
import { useId, useMemo, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import * as m from 'motion/react-m';
import { DUR, EASE_OUT } from '@/lib/motion';

const W = 1000, H = 320;
const clamp01 = (t: number) => Math.min(1, Math.max(0, t));

export function EloChart({ points, currentElo, drawn }:
  { points: { date: string; elo: number }[]; currentElo: number; drawn: boolean }) {
  const clipId = useId();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;

  const geo = useMemo(() => {
    if (n < 2) return null;
    const elos = points.map(p => p.elo);
    const lo = Math.floor((Math.min(...elos) - 50) / 100) * 100;
    const hi = Math.ceil((Math.max(...elos) + 50) / 100) * 100;
    const y = (v: number) => H - ((v - lo) / (hi - lo)) * H;
    const x = (i: number) => (i / (n - 1)) * W;
    const line = 'M' + points.map((p, i) => `${x(i).toFixed(1)} ${y(p.elo).toFixed(1)}`).join(' L');
    const grid: { v: number; y: number }[] = [];
    for (let v = lo; v <= hi; v += 100) grid.push({ v, y: y(v) });
    return { y, line, area: `${line} L${W} ${H} L0 ${H} Z`, grid };
  }, [points, n]);

  if (!geo) return <EloChartEmpty elo={currentElo} />;   // línea discontinua en el ELO actual + "Tu curva empieza con tu primera partida."

  const pick = (clientX: number, rect: DOMRect) => {
    const i = Math.round(clamp01((clientX - rect.left) / rect.width) * (n - 1));
    setHover(prev => (prev === i ? prev : i));
  };
  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') setHover(h => Math.min(n - 1, (h ?? n - 1) + 1));
    else if (e.key === 'ArrowLeft') setHover(h => Math.max(0, (h ?? n - 1) - 1));
    else if (e.key === 'Home') setHover(0);
    else if (e.key === 'End') setHover(n - 1);
    else if (e.key === 'Escape') setHover(null);
    else return;
    e.preventDefault();
  };
  const hp = hover !== null ? points[hover] : null;

  return (
    <figure className="m-0">
      <div role="img" tabIndex={0}
        aria-label={`Elo de ${points[0].elo} a ${points[n - 1].elo} en ${n} días. Usa las flechas para recorrer los días.`}
        onPointerMove={e => pick(e.clientX, e.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setHover(null)} onKeyDown={onKey}
        onFocus={() => setHover(n - 1)} onBlur={() => setHover(null)}
        className="relative h-80 cursor-crosshair rounded-[10px] focus-visible:outline-offset-8">
        <svg aria-hidden viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible">
          <defs>
            <clipPath id={clipId}>
              {/* se dibuja cada vez que se abre la sección */}
              <m.rect x={0} y={-20} height={H + 40} initial={false}
                animate={{ width: drawn || reduce ? W : 0 }}
                transition={drawn ? { duration: DUR.draw, ease: EASE_OUT, delay: 0.25 } : { duration: 0 }} />
            </clipPath>
          </defs>
          {geo.grid.map(g => <line key={g.v} x1={0} x2={W} y1={g.y} y2={g.y} stroke="var(--color-rule)" vectorEffect="non-scaling-stroke" />)}
          <g clipPath={`url(#${clipId})`}>
            <path d={geo.area} fill="var(--color-accent)" fillOpacity={0.08} />
            <path d={geo.line} fill="none" stroke="var(--color-accent)" strokeWidth={2.5} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
          </g>
        </svg>
        {/* en HTML posicionado con %: etiquetas del eje Y, punto final y, si hp, línea vertical + punto + tooltip bg-ink text-paper rounded-[10px] */}
      </div>
      <p aria-live="polite" className="sr-only">{hp ? `${hp.date}: ${hp.elo}` : ''}</p>
    </figure>
  );
}
```
Las etiquetas del eje y el tooltip van en HTML posicionado con `%`, no dentro del SVG estirado, para que el texto no se deforme. Todas las cifras con la utilidad `nums`.

### A.12 `ResultsStrip.tsx`
```tsx
<m.div role="img" aria-label={`Últimas ${n} partidas: ${wins} victorias, ${losses} derrotas`}
  className="flex h-[72px] items-end gap-2"
  initial="hidden" whileInView="show" viewport={{ once: true, margin: '-10% 0px' }}
  variants={{ show: { transition: { staggerChildren: 0.025 } } }}>
  {results.map(r => (
    <m.span key={r.id} title={`${r.result === 'win' ? 'Victoria' : r.result === 'loss' ? 'Derrota' : 'Tablas'} contra ${r.opponent} · ${r.date}`}
      className="flex-1 rounded-[3px]"
      style={{ height: r.result === 'win' ? 72 : r.result === 'draw' ? 48 : 30, originY: 1,
               background: r.result === 'win' ? 'var(--color-accent)' : 'var(--color-loss)' }}
      variants={{ hidden: { scaleY: 0 }, show: { scaleY: 1, transition: { duration: 0.6, ease: EASE_OUT } } }} />
  ))}
</m.div>
```
- Leyenda: "▮ Victoria ▮ Derrota" (marcas de 4 px). Debajo, "Más antigua · Hoy" en mono.
- Vacío: 34 marcas de 2 px en `rule` + "Aquí aparecerá cada partida que juegues."

### A.13 Landing sobre el kit
`_components/landing/landingScene.ts`:
```ts
import { createStage } from '@/components/three/stage';
import { createBoard, createPiece, pieceMaterials, squareToXZ } from '@/components/three/kit';
import type { SceneFactory } from '@/components/three/useThreeScene';

export interface LandingScene { setProgress(p: number): void; dispose(): void }

export const createLandingScene: SceneFactory<LandingScene> = (canvas, { quality, reducedMotion }) => {
  const dust = quality === 'high' && !reducedMotion;
  const stage = createStage(canvas, { quality, reducedMotion, fov: 35, continuous: dust });
  // tablero, piezas, jugadas de la apertura, flechas y overlays: lógica del Sprint 1,
  // pero las piezas salen de createPiece() y el tablero de createBoard() (sin perfiles de torno duplicados)
  let progress = 0, lastDust = 0;
  stage.onFrame(now => {
    update(progress, now);                                     // cámara, jugadas y overlays (código del Sprint 1)
    if (dust && now - lastDust >= 33) { lastDust = now; stepDust(); }   // polvo a ~30 fps
  });
  return {
    setProgress(p) { progress = p; stage.invalidate(); },
    dispose: stage.dispose,
  };
};
```
`Landing.tsx`:
```tsx
'use client';
import { useEffect } from 'react';
import { useMotionValueEvent, useReducedMotion, useScroll, useSpring, useTransform, type MotionValue } from 'motion/react';
import * as m from 'motion/react-m';
import { useThreeScene } from '@/components/three/useThreeScene';

const loadLanding = () => import('./landingScene').then(m => m.createLandingScene);

export function Landing() {
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const smooth = useSpring(scrollYProgress, { stiffness: 90, damping: 22, mass: 0.6, restDelta: 0.0005 });
  const progress = reduce ? scrollYProgress : smooth;
  const { canvasRef, scene } = useThreeScene(loadLanding);

  useEffect(() => { scene?.setProgress(progress.get()); }, [scene, progress]);
  useMotionValueEvent(progress, 'change', p => scene?.setProgress(p));

  return (
    <div className="landing">
      {/* fondo estático (degradado oscuro) detrás del canvas mientras carga o sin WebGL */}
      <canvas ref={canvasRef} aria-hidden className={`fixed inset-0 size-full transition-opacity duration-700 ${scene ? 'opacity-100' : 'opacity-0'}`} />
      {CHAPTERS.map(ch => <Chapter key={ch.id} {...ch} progress={progress} />)}
    </div>
  );
}

function Chapter({ a, b, progress, children }: { a: number; b: number; progress: MotionValue<number>; children: React.ReactNode }) {
  const F = 0.035;
  const opacity = useTransform(progress, a <= 0 ? [b, b + F] : b >= 1 ? [a - F, a] : [a - F, a, b, b + F],
                                         a <= 0 ? [1, 0]     : b >= 1 ? [0, 1]     : [0, 1, 1, 0]);
  const y = useTransform(opacity, [0, 1], [16, 0]);
  const visibility = useTransform(opacity, o => (o < 0.01 ? 'hidden' : 'visible'));
  return <m.section className="chapter" style={{ opacity, y, visibility }}>{children}</m.section>;
}
```
- El primer capítulo se pinta visible desde el servidor (progreso 0 → opacidad 1): la página está completa aunque el 3D no haya cargado.
- La lista de jugadas del capítulo "Contra la IA" se resalta desde el mismo `progress` con `useMotionValueEvent`, que cambia clases en el DOM solo cuando cambia la jugada activa.
- Lighthouse `/` ≥ 80. Con la página quieta y calidad baja, **no** hay frames de render.
