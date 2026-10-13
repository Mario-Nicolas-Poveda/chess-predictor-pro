import 'server-only';
import { escapeLike } from '@/core/shared/db/escapeLike';
import { supabaseAdmin } from '@/core/shared/db/supabaseAdmin';
import { AppError } from '@/core/shared/errors/AppError';
import type { AuthUser } from '../domain/AuthUser';
import type { AuthUserRepository } from '../domain/AuthUserRepository';

type Row = { id: string; email: string; username: string; password_hash: string | null;
  auth_provider: 'local' | 'google'; google_id: string | null };
const map = (r: Row): AuthUser => ({ id: r.id, email: r.email, username: r.username,
  passwordHash: r.password_hash, authProvider: r.auth_provider, googleId: r.google_id });

export class SupabaseAuthUserRepository implements AuthUserRepository {
  private async one(col: string, val: string, ci = false) {
    const q = supabaseAdmin.from('users').select('*');
    const { data, error } = await (ci ? q.ilike(col, escapeLike(val)) : q.eq(col, val)).maybeSingle<Row>();
    if (error) throw error;
    return data ? map(data) : null;
  }
  findByEmail(e: string)    { return this.one('email', e, true); }
  findByUsername(u: string) { return this.one('username', u, true); }
  findByGoogleId(g: string) { return this.one('google_id', g); }
  async create(d: Parameters<AuthUserRepository['create']>[0]) {
    const { data, error } = await supabaseAdmin.from('users').insert({
      email: d.email, username: d.username, password_hash: d.passwordHash,
      auth_provider: d.authProvider, google_id: d.googleId ?? null,
      display_name: d.displayName ?? null, avatar_url: d.avatarUrl ?? null,
    }).select('*').single<Row>();
    if (error?.code === '23505') throw new AppError('CONFLICT', 'Correo o usuario ya existe', 409);
    if (error) throw error;
    return map(data);
  }
  async linkGoogle(id: string, g: string) {
    const { error } = await supabaseAdmin.from('users').update({ google_id: g }).eq('id', id);
    if (error) throw error;
  }
}
