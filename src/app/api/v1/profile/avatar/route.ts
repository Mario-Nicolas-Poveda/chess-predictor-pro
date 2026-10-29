import { withAuth } from '@/core/shared/auth/withAuth';
import { PayloadTooLargeError, UnsupportedMediaTypeError, ValidationError } from '@/core/shared/errors/AppError';
import { created, noContent, ok } from '@/core/shared/http/responses';
import { sniffImage } from '@/core/shared/http/sniffImage';
import { AVATAR_MAX_BYTES, type AvatarResponse } from '@/modules/dashboard/infrastructure/dto/profileSchemas';
import { removeAvatar, setAvatar } from '@/modules/dashboard/presentation/controllers/container';

const tooLarge = () => new PayloadTooLargeError('FILE_TOO_LARGE', 'La foto pesa más de 1 MB');
const noFile = () => new ValidationError('Datos inválidos', { file: ['Adjunta una imagen'] });

// PUT crea o reemplaza el recurso "foto de perfil": 201 si no había, 200 si la reemplaza
export const PUT = withAuth(async (req, s) => {
  if (!(req.headers.get('content-type') ?? '').startsWith('multipart/form-data'))
    throw new UnsupportedMediaTypeError('Envía la foto como multipart/form-data con el campo "file"');
  // 413 sin leer el cuerpo (64 KB de margen para el boundary y las cabeceras del formulario)
  if (Number(req.headers.get('content-length') ?? 0) > AVATAR_MAX_BYTES + 64 * 1024) throw tooLarge();
  const form = await req.formData().catch(() => { throw noFile(); });
  const file = form.get('file');
  if (!(file instanceof File) || file.size === 0) throw noFile();
  if (file.size > AVATAR_MAX_BYTES) throw tooLarge();
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = sniffImage(bytes);
  if (!type) throw new UnsupportedMediaTypeError('Solo JPG, PNG o WebP');
  const r = await setAvatar.execute(s.userId, { bytes, type });   // 429 · 404
  const body: AvatarResponse = { avatarUrl: r.url };
  return r.created ? created(body, r.url) : ok(body);
});

export const DELETE = withAuth(async (_req, s) => {
  await removeAvatar.execute(s.userId);   // 404 NO_AVATAR
  return noContent();
});
