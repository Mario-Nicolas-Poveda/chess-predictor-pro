import 'server-only';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import type { ImageType } from '@/core/shared/http/sniffImage';
import type { AvatarStorage } from '../domain/AvatarStorage';

// bucket público "avatars" (migración 0005): solo el backend escribe
export class SupabaseAvatarStorage implements AvatarStorage {
  private bucket = () => supabaseAdmin.storage.from('avatars');

  async put(path: string, bytes: Uint8Array, contentType: ImageType) {
    const { error } = await this.bucket().upload(path, bytes, { contentType, upsert: false, cacheControl: '31536000' });
    if (error) throw error;
    return this.bucket().getPublicUrl(path).data.publicUrl;
  }

  async remove(path: string) {
    const { error } = await this.bucket().remove([path]);
    if (error) throw error;
  }
}
