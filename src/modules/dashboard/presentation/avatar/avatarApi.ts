import { ApiError, apiFetch, toApiError } from '@/lib/apiClient';
import { AVATAR_SOURCE_MAX_BYTES, AVATAR_TYPES, type AvatarResponse } from '@/modules/dashboard/infrastructure/dto/profileSchemas';

const MIN = 128;
const mb = (bytes: number) => (bytes / 1024 / 1024).toLocaleString('es-CO', { maximumFractionDigits: 1 });

/** Por qué no sirve el archivo antes de abrirlo (tipo y peso), o null. */
export function fileProblem(f: { type: string; size: number }): string | null {
  if (!(AVATAR_TYPES as readonly string[]).includes(f.type)) return 'Ese archivo no es una imagen JPG, PNG o WebP.';
  if (f.size > AVATAR_SOURCE_MAX_BYTES) return `Esa imagen pesa ${mb(f.size)} MB. El máximo es ${mb(AVATAR_SOURCE_MAX_BYTES)} MB.`;
  return null;
}

/** Por qué no sirve la imagen ya abierta (medida), o null. */
export const sizeProblem = (w: number, h: number) =>
  w < MIN || h < MIN ? `La imagen es muy pequeña (${w} × ${h} px). El mínimo es ${MIN} × ${MIN}.` : null;

export type UploadFailure = { login: true } | { login?: false; text: string; code?: string };

/** Qué decir cuando la subida falla. */
export function uploadFailure(e: unknown): UploadFailure {
  if (!(e instanceof ApiError)) return { text: 'No hay conexión. Tu foto no se subió; inténtalo de nuevo.' };
  if (e.status === 401) return { login: true };
  if (e.status === 429) {
    const min = Math.max(1, Math.ceil(Number(e.meta?.retryAfterS ?? 60) / 60));
    return { text: `Cambiaste la foto muchas veces. Prueba en ${min} min.` };
  }
  if (e.status === 415) return { text: 'El servidor no acepta ese formato. Usa JPG, PNG o WebP.', code: 'HTTP 415' };
  if (e.status === 400 || e.status === 413) return { text: 'El servidor rechazó la foto por su tamaño.', code: `HTTP ${e.status}` };
  return { text: e.message, code: `HTTP ${e.status}` };
}

export const avatarApi = {
  /** 201 (no había) o 200 (reemplazo) → la URL pública. Sin content-type a mano: el navegador pone el boundary. */
  async put(blob: Blob): Promise<string> {
    const form = new FormData();
    form.append('file', blob, blob.type === 'image/webp' ? 'avatar.webp' : 'avatar.jpg');
    const res = await fetch('/api/v1/profile/avatar', { method: 'PUT', body: form, credentials: 'same-origin' });
    if (!res.ok) throw await toApiError(res);
    return ((await res.json()) as AvatarResponse).avatarUrl;
  },
  /** 204; un 404 NO_AVATAR también deja la cuenta sin foto. */
  async remove(): Promise<void> {
    try { await apiFetch<void>('/profile/avatar', { method: 'DELETE' }); }
    catch (e) { if (!(e instanceof ApiError && e.code === 'NO_AVATAR')) throw e; }
  },
};
