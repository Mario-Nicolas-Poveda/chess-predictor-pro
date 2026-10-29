import type { ImageType } from '@/core/shared/http/sniffImage';
import type { AvatarStorage } from '../domain/AvatarStorage';
import type { UserRepository } from '../domain/UserRepository';
import { userNotFound } from './GetUserProfile';

// sube la foto a una ruta nueva (se cachea un año sin invalidar nada) y borra la anterior
export class SetAvatar {
  constructor(private users: UserRepository, private storage: AvatarStorage,
              private limit: (key: string) => Promise<void>,   // 429 si pasó el límite de subidas
              private newId: () => string = () => crypto.randomUUID()) {}

  async execute(userId: string, file: { bytes: Uint8Array; type: ImageType }) {
    await this.limit(`avatar:${userId}`);
    const current = await this.users.getAvatar(userId);
    if (!current) throw userNotFound();
    const ext = file.type.split('/')[1];
    const path = `${userId}/${this.newId()}.${ext === 'jpeg' ? 'jpg' : ext}`;
    const url = await this.storage.put(path, file.bytes, file.type);
    try { await this.users.setAvatar(userId, url, path); }
    catch (e) { await this.storage.remove(path).catch(() => {}); throw e; }   // no dejar el archivo huérfano
    if (current.path) await this.storage.remove(current.path).catch(e => console.error('[avatar] borrar la anterior', e));
    return { url, created: !current.url };
  }
}
