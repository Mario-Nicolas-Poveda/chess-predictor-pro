import 'server-only';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { AppError, ConflictError, ServiceUnavailableError } from '@/core/shared/errors/AppError';
import type { GuestRepository } from '../application/ports/GuestRepository';
import { toSessionUser } from './toSessionUser';

const expired = () => new AppError('SESSION_EXPIRED', 'Tu sesión de invitado terminó', 401);
// mismos códigos y fields que el registro (RegisterUser)
const RPC_ERRORS: Record<string, () => AppError> = {
  GUEST_CAPACITY:     () => new ServiceUnavailableError('No hay cupo para invitados ahora: crea tu cuenta (es gratis)', 'GUEST_CAPACITY', 600),
  EMAIL_TAKEN:        () => new ConflictError('EMAIL_TAKEN', 'Ese correo ya está registrado', { email: ['Ya registrado'] }),
  USERNAME_TAKEN:     () => new ConflictError('USERNAME_TAKEN', 'Ese usuario ya existe', { username: ['No disponible'] }),
  ALREADY_REGISTERED: () => new ConflictError('ALREADY_REGISTERED', 'Ya tienes cuenta'),
  GUEST_EXPIRED:      expired,
  USER_NOT_FOUND:     expired,
};
const fromRpc = (e: { message: string }) => RPC_ERRORS[e.message.split(':')[0] ?? '']?.() ?? e;

export class SupabaseGuestRepository implements GuestRepository {
  async create(ttlS: number, max: number) {
    const { data, error } = await supabaseAdmin.rpc('guest_create', { p_ttl_s: ttlS, p_max: max });
    if (error) throw fromRpc(error);
    return toSessionUser(data);
  }
  async upgrade(userId: string, email: string, username: string, passwordHash: string) {
    const { data, error } = await supabaseAdmin.rpc('guest_upgrade', { p_user: userId, p_email: email, p_username: username, p_hash: passwordHash });
    if (error) throw fromRpc(error);
    return toSessionUser(data);
  }
  async delete(userId: string) {
    const { data, error } = await supabaseAdmin.rpc('guest_delete', { p_user: userId });
    if (error) throw error;
    return data === true;
  }
  async get(userId: string) {
    const { data, error } = await supabaseAdmin.from('users')
      .select('id, email, username, display_name, avatar_url, elo_rating, role, guest_expires_at').eq('id', userId).maybeSingle();
    if (error) throw error;
    return data ? toSessionUser(data) : null;
  }
}
