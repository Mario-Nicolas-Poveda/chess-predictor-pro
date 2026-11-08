import 'server-only';
import { supabaseAdmin } from '../db/supabaseAdmin';

/** ¿Existe el invitado y no venció? Solo para tokens de invitado (withAuth): un jugador no llega aquí. */
export async function guestAlive(userId: string): Promise<boolean> {
  const { data, error } = await supabaseAdmin.from('users').select('id')
    .eq('id', userId).eq('role', 'guest').gt('guest_expires_at', new Date().toISOString()).maybeSingle();
  if (error) throw error;
  return !!data;
}
