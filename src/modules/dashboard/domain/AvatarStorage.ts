import type { ImageType } from '@/core/shared/http/sniffImage';

// dónde viven los archivos de las fotos (Supabase Storage en infrastructure)
export interface AvatarStorage {
  put(path: string, bytes: Uint8Array, contentType: ImageType): Promise<string>;   // devuelve la URL pública
  remove(path: string): Promise<void>;
}
