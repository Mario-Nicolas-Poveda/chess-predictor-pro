'use client';

import { useState, type ReactNode, type RefObject } from 'react';
import { ArrowDown, ArrowUp, X } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Button } from '@/components/ui/Button';
import { Switch } from '@/components/ui/Switch';
import { useLightDismiss } from '@/components/ui/useLightDismiss';
import { ACCENTS, BOARD_MODES, HERO_LAYOUTS, PIECE_MATERIALS, PROFILE_PIECES, THEMES } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import { RemoveAvatar } from '../avatar/RemoveAvatar';
import { useSession } from '../hooks/useProfile';
import { usePreferences } from '../preferences/PreferencesProvider';
import { canHide, moveSection, toggleSection } from '../preferences/sections';
import { ACCENT_LABEL, HERO_LABEL, MATERIAL_LABEL, PIECE_LABEL, SECTION_LABEL, THEME_LABEL, THEME_SWATCH, accentHex, type SectionId } from '../theme/themes';

const MATERIAL_HEX = { w: '#f3eadb', b: '#2a1d18' } as const;   // los de pieceMaterials() del kit 3D
const STATUS = {
  idle: ['Los cambios se ven y se guardan al instante.', 'bg-ink-faint'], saving: ['Guardando…', 'bg-accent animate-pulse'],
  saved: ['Guardado.', 'bg-accent'], error: ['No se pudo guardar', 'bg-loss'],
} as const;
const BOARD = {
  '3d': ['Tablero 3D', 'Piezas en relieve y animaciones.'],
  '2d': ['Tablero 2D', 'Plano y más ligero. Ideal en el móvil.'],
} as const;
const ring = 'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-accent';
const pill = `inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-caption shadow-[inset_0_0_0_1px_var(--t-rule)] transition-colors hover:bg-band peer-checked:bg-ink peer-checked:text-paper peer-checked:shadow-none peer-checked:hover:bg-ink ${ring}`;

// Panel lateral: cada cambio se ve al instante en la página y se guarda solo. Con `onPhoto` (dashboard), también la foto.
export function CustomizeSheet({ ref, onPhoto }: { ref: RefObject<HTMLDialogElement | null>; onPhoto?: () => void }) {
  const { prefs, status, set, flush, reset } = usePreferences();
  const profile = useSession()?.profile;
  const [announce, setAnnounce] = useState('');

  const move = (id: SectionId, dir: -1 | 1) => {
    const order = moveSection(prefs.sectionOrder, id, dir);
    set('sectionOrder', order);
    setAnnounce(`${SECTION_LABEL[id]}, posición ${order.indexOf(id) + 1} de ${order.length}`);
  };
  // "Listo", la X, tocar fuera y Esc: guardar lo pendiente y cerrar
  const done = async () => { await flush(); ref.current?.close(); };
  useLightDismiss(ref, () => void done());

  return (
    <dialog ref={ref} aria-labelledby="pz-title" className="sheet">
      <div className="flex h-full flex-col">
        <header className="flex items-center justify-between px-6 py-5">
          <h2 id="pz-title" className="font-display text-[32px] font-semibold leading-none">Personaliza tu perfil.</h2>
          <button type="button" aria-label="Cerrar" onClick={() => void done()}
            className="grid size-9 place-items-center rounded-full hover:bg-band">
            <X size={18} aria-hidden="true" />
          </button>
        </header>

        <p aria-live="polite" className="flex items-center gap-2 px-6 pb-4 text-caption text-ink-soft">
          <span aria-hidden="true" className={`size-2 shrink-0 rounded-full ${STATUS[status][1]}`} />
          {STATUS[status][0]}
          {status === 'error' && <>{' · '}<button type="button" onClick={() => void flush()} className="font-medium text-accent hover:underline">Reintentar</button></>}
        </p>

        <div className="min-h-0 flex-1 space-y-8 overflow-y-auto px-6 pb-8">
          {onPhoto && profile && (
            <Group title="Foto de perfil">
              <div className="flex flex-wrap items-center gap-3">
                <Avatar user={profile} size={64} />
                <Button variant="ghost" className="h-10! px-4! text-caption" onClick={onPhoto}>{profile.avatarUrl ? 'Cambiar foto' : 'Subir foto'}</Button>
                <RemoveAvatar className="h-10! px-4! text-caption" label="Quitar" />
              </div>
              <p className="mt-2 text-caption text-ink-faint">{profile.avatarUrl ? 'Tu foto actual · 512 × 512.' : 'JPG, PNG o WebP · hasta 5 MB.'}</p>
            </Group>
          )}

          <Group title="Tablero en las partidas">
            <div className="grid grid-cols-2 gap-2">
              {BOARD_MODES.map(m => (
                <Radio key={m} name="pz-board" checked={prefs.boardMode === m} onChange={() => set('boardMode', m)}
                  className={`flex h-full flex-col gap-2 rounded-2xl p-3 shadow-[inset_0_0_0_1px_var(--t-rule)] transition-colors hover:bg-band peer-checked:shadow-[inset_0_0_0_2px_var(--t-ink)] ${ring}`}>
                  <BoardSketch mode={m} />
                  <span className="font-medium">{BOARD[m][0]}</span>
                  <span className="text-caption text-ink-soft">{BOARD[m][1]}</span>
                </Radio>
              ))}
            </div>
            <p className="mt-2 text-caption text-ink-faint">También puedes cambiarlo durante una partida, arriba del tablero.</p>
          </Group>

          <Group title="Tema">
            <div className="grid grid-cols-2 gap-2">
              {THEMES.map(t => (
                <Radio key={t} name="pz-theme" checked={prefs.theme === t} onChange={() => set('theme', t)}
                  className={`flex items-center gap-3 rounded-2xl p-3 text-caption shadow-[inset_0_0_0_1px_var(--t-rule)] transition-colors hover:bg-band peer-checked:shadow-[inset_0_0_0_2px_var(--t-ink)] ${ring}`}>
                  <span aria-hidden="true" className="flex size-8 shrink-0 overflow-hidden rounded-full shadow-[inset_0_0_0_1px_rgb(0_0_0/.1)]">
                    {THEME_SWATCH[t].map(c => <span key={c} className="flex-1" style={{ background: c }} />)}
                  </span>
                  {THEME_LABEL[t]}
                </Radio>
              ))}
            </div>
          </Group>

          <Group title="Color de acento">
            <div className="flex gap-3">
              {ACCENTS.map(a => (
                <Radio key={a} name="pz-accent" label={ACCENT_LABEL[a]} checked={prefs.accent === a} onChange={() => set('accent', a)}
                  className={`block size-10 rounded-full transition-shadow peer-checked:shadow-[0_0_0_3px_var(--t-panel),0_0_0_5px_var(--t-ink)] ${ring}`}
                  style={{ background: accentHex(prefs.theme, a) }} />
              ))}
            </div>
          </Group>

          <Group title="Tu pieza 3D">
            <div className="flex flex-wrap gap-2">
              {PROFILE_PIECES.map(p => (
                <Radio key={p} name="pz-piece" checked={prefs.piece === p} onChange={() => set('piece', p)} className={pill}>{PIECE_LABEL[p].name}</Radio>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {PIECE_MATERIALS.map(m => (
                <Radio key={m} name="pz-material" checked={prefs.material === m} onChange={() => set('material', m)} className={pill}>
                  {/* muestra del material: con el acento Tinta, "Del acento" y "Ébano" son casi iguales */}
                  <span aria-hidden="true" className="size-3.5 rounded-full shadow-[inset_0_0_0_1px_rgb(127_127_127/.45)]"
                    style={{ background: m === 'a' ? accentHex(prefs.theme, prefs.accent) : MATERIAL_HEX[m] }} />
                  {MATERIAL_LABEL[m]}
                </Radio>
              ))}
            </div>
          </Group>

          <Group title="Encabezado">
            <div className="flex flex-col gap-2">
              {HERO_LAYOUTS.map(h => (
                <Radio key={h} name="pz-hero" checked={prefs.heroLayout === h} onChange={() => set('heroLayout', h)}
                  className={`flex items-baseline justify-between gap-4 rounded-2xl px-4 py-3 shadow-[inset_0_0_0_1px_var(--t-rule)] transition-colors hover:bg-band peer-checked:shadow-[inset_0_0_0_2px_var(--t-ink)] ${ring}`}>
                  <span>{HERO_LABEL[h].name}</span>
                  <span className="font-mono text-[11px] text-ink-faint">{HERO_LABEL[h].hint}</span>
                </Radio>
              ))}
            </div>
          </Group>

          <Group title="Secciones · orden y visibilidad">
            <ol className="flex flex-col">
              {prefs.sectionOrder.map((id, i) => {
                const shown = !prefs.hiddenSections.includes(id);
                return (
                  <li key={id} className="flex items-center gap-2 py-2">
                    <span className={`flex-1 ${shown ? '' : 'text-ink-faint'}`}>{SECTION_LABEL[id]}</span>
                    <IconButton label={`Subir ${SECTION_LABEL[id]}`} disabled={i === 0} onClick={() => move(id, -1)}><ArrowUp size={16} aria-hidden="true" /></IconButton>
                    <IconButton label={`Bajar ${SECTION_LABEL[id]}`} disabled={i === prefs.sectionOrder.length - 1} onClick={() => move(id, 1)}><ArrowDown size={16} aria-hidden="true" /></IconButton>
                    <Switch label={`Mostrar ${SECTION_LABEL[id]}`} checked={shown} disabled={shown && !canHide(prefs, id)}
                      onChange={() => set('hiddenSections', toggleSection(prefs, id))} />
                  </li>
                );
              })}
            </ol>
            <p aria-live="polite" className="sr-only">{announce}</p>
          </Group>
        </div>

        <footer className="flex items-center gap-4 px-6 py-4 shadow-[0_-1px_0_var(--t-rule)]">
          <button type="button" onClick={() => void reset()} className="text-caption font-medium text-accent hover:underline underline-offset-4">Restablecer</button>
          <span className="flex-1" />
          <Button onClick={() => void done()}>Listo</Button>
        </footer>
      </div>
    </dialog>
  );
}

/** Dibujo de línea de 48 × 40: tablero en perspectiva con una pieza, o cuadrícula plana. */
function BoardSketch({ mode }: { mode: '3d' | '2d' }) {
  return (
    <svg aria-hidden="true" width="48" height="40" viewBox="0 0 48 40" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round">
      {mode === '3d' ? <>
        <path d="M4 34 L12 18 H36 L44 34 Z" /><path d="M8 26 H40 M18 18 L16 34 M30 18 L32 34" />
        <path d="M22 22 h4 l-1 -7 a3 3 0 1 0 -2 0 Z" fill="currentColor" />
      </> : <>
        <rect x="8" y="4" width="32" height="32" rx="2" /><path d="M16 4 V36 M24 4 V36 M32 4 V36 M8 12 H40 M8 20 H40 M8 28 H40" />
      </>}
    </svg>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <fieldset>
      <legend className="eyebrow mb-3">{title}</legend>
      {children}
    </fieldset>
  );
}

// Radio nativo (las flechas cambian de opción sin código extra) con su aspecto en el <span> hermano.
function Radio({ name, checked, onChange, label, className, style, children }:
  { name: string; checked: boolean; onChange: () => void; label?: string; className: string; style?: React.CSSProperties; children?: ReactNode }) {
  return (
    <label className="block cursor-pointer" title={label}>
      <input type="radio" name={name} checked={checked} onChange={onChange} aria-label={label} className="peer sr-only" />
      <span className={className} style={style}>{children}</span>
    </label>
  );
}

function IconButton({ label, disabled, onClick, children }: { label: string; disabled: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button type="button" aria-label={label} disabled={disabled} onClick={onClick}
      className="grid size-9 place-items-center rounded-full text-ink-soft hover:bg-band hover:text-ink disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent">
      {children}
    </button>
  );
}
