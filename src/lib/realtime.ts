'use client';

import type { SupabaseClient } from '@supabase/supabase-js';

let client: Promise<SupabaseClient> | null = null;

/** Un solo cliente (un solo WebSocket) para toda la app, cargado solo cuando se necesita. null = sin variables: solo polling. */
export function realtimeClient(): Promise<SupabaseClient> | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return (client ??= import('@supabase/supabase-js').then(({ createClient }) =>
    createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })));
}
