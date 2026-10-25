'use client';

import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { avatarApi, fileProblem, sizeProblem, uploadFailure } from './avatarApi';
import { centered, type Crop } from './crop';
import { CropArea, CropPreview, D } from './CropArea';
import { exportAvatar } from './exportAvatar';
import { sampleImage } from './sampleImage';

type Picked = { url: string; bitmap: ImageBitmap };
const PREVIEWS = [[96, 'En tu perfil'], [40, 'En una partida'], [30, 'En la barra de arriba']] as const;

/** "Tu foto de perfil.": elegir o arrastrar, validar, recortar en círculo y subir a 512 × 512. */
export function AvatarDialog({ open, onClose, onSaved }: { open: boolean; onClose: () => void; onSaved: (url: string) => void }) {
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const pickBtn = useRef<HTMLButtonElement>(null);
  const [picked, setPicked] = useState<Picked | null>(null);
  const [crop, setCrop] = useState<Crop | null>(null);
  const [error, setError] = useState<{ text: string; code?: string } | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) { d.showModal(); pickBtn.current?.focus(); }
    if (!open && d.open) d.close();
  }, [open]);

  // liberar la foto anterior al cambiarla o al cerrar
  useEffect(() => () => { if (picked) { URL.revokeObjectURL(picked.url); picked.bitmap.close(); } }, [picked]);

  const take = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    const bad = fileProblem(file);
    if (bad) return setError({ text: bad });
    let bitmap: ImageBitmap;
    try { bitmap = await createImageBitmap(file); }   // respeta la orientación EXIF de las fotos del celular
    catch { return setError({ text: 'No pudimos abrir esa imagen. Prueba con otra.' }); }
    const small = sizeProblem(bitmap.width, bitmap.height);
    if (small) { bitmap.close(); return setError({ text: small }); }
    setPicked({ url: URL.createObjectURL(file), bitmap });
    setCrop(centered(bitmap.width, bitmap.height, D));
  };

  const sample = async () => {
    const acc = getComputedStyle(ref.current!).getPropertyValue('--t-acc').trim() || '#6e1e2b';
    await take(await sampleImage(acc));
  };

  const drop = (e: DragEvent) => { e.preventDefault(); setOver(false); void take(e.dataTransfer.files[0]); };

  const save = async () => {
    if (!picked || !crop) return;
    setBusy(true); setError(null);
    try {
      const url = await avatarApi.put(await exportAvatar(picked.bitmap, crop, D));
      onSaved(url);
      toast.success('Foto actualizada.');
      onClose();
    } catch (e) {
      const f = uploadFailure(e);
      if (f.login) router.replace('/login?next=/dashboard/profile');
      else setError(f);
    } finally { setBusy(false); }
  };

  const reset = () => { setPicked(null); setError(null); setOver(false); onClose(); };

  return (
    <dialog ref={ref} aria-labelledby="avatar-title" onClose={reset}
      onCancel={e => { if (busy) e.preventDefault(); }}
      onClick={e => { if (e.target === e.currentTarget && !busy) ref.current?.close(); }}   // tocar fuera cierra (no mientras sube)
      className="m-auto w-[min(600px,calc(100vw-16px))] max-h-[calc(100dvh-16px)] overflow-y-auto rounded-[22px] bg-paper p-4 text-ink shadow-[0_18px_50px_-12px_rgb(0_0_0/.35)] backdrop:bg-[rgb(20_12_10/.38)] sm:p-7">
      <header className="flex items-start justify-between gap-4">
        <h2 id="avatar-title" className="font-display text-[32px] font-semibold leading-tight">Tu foto de perfil.</h2>
        <button type="button" aria-label="Cerrar" disabled={busy} onClick={() => ref.current?.close()}
          className="grid size-10 shrink-0 place-items-center rounded-full hover:bg-band disabled:opacity-40"><X size={18} aria-hidden="true" /></button>
      </header>

      <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" hidden
        onChange={e => { void take(e.target.files?.[0]); e.target.value = ''; }} />

      {picked && crop ? (
        <div className="mt-5 flex flex-wrap items-start justify-center gap-6">
          <CropArea src={picked.url} crop={crop} onChange={setCrop} />
          <div className="flex flex-col gap-4">
            {PREVIEWS.map(([size, label]) => (
              <div key={size} className="flex items-center gap-3">
                <CropPreview src={picked.url} crop={crop} size={size} />
                <span className="text-sm text-ink-soft">{label}</span>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div onDragOver={e => { e.preventDefault(); setOver(true); }} onDragLeave={() => setOver(false)} onDrop={drop}
          className={`mt-5 flex h-[260px] flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed text-center transition-colors ${over ? 'border-accent bg-band' : 'border-rule'}`}>
          <p className="font-display text-2xl">Arrastra una foto aquí</p>
          <p className="text-sm text-ink-soft">o</p>
          <Button ref={pickBtn} onClick={() => input.current?.click()}>Elegir archivo</Button>
          <button type="button" onClick={() => void sample()} className="mt-1 text-sm text-accent underline underline-offset-4">Probar con una imagen de ejemplo</button>
        </div>
      )}

      <p className="mt-4 text-caption text-ink-soft">JPG, PNG o WebP · hasta 5 MB · mínimo 128 × 128 px. Se guarda recortada a 512 × 512.</p>
      {error && (
        <p role="alert" className="mt-3 text-sm text-danger">
          {error.text} {error.code && <span className="ml-1 font-mono text-xs text-ink-faint">{error.code}</span>}
        </p>
      )}

      {picked && (
        <div className="mt-5 flex flex-wrap justify-end gap-3">
          <Button variant="ghost" disabled={busy} onClick={() => input.current?.click()}>Elegir otra</Button>
          <Button loading={busy} onClick={() => void save()}>{busy ? 'Subiendo…' : 'Guardar foto'}</Button>
        </div>
      )}
    </dialog>
  );
}
