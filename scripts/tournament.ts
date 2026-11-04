/**
 * Crear o listar torneos en la BD de .env.local (producción si .env.local apunta a producción).
 *   npx tsx --env-file=.env.local scripts/tournament.ts create "Copa de la presentación" --size 8 --tc 3+2 --starts 2026-12-04T09:00:00-05:00
 *   npx tsx --env-file=.env.local scripts/tournament.ts list
 * Usa la clave service_role del .env.local (nunca se imprime). La hora lleva zona: -05:00 es Bogotá.
 */
import { createClient } from '@supabase/supabase-js';
import { CreateTournamentSchema } from '../src/modules/tournaments/infrastructure/dto/tournamentSchemas';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY (usa --env-file=.env.local)'); process.exit(1); }
const db = createClient(url, key, { auth: { persistSession: false } });

const [cmd, ...rest] = process.argv.slice(2);
const flag = (name: string) => { const i = rest.indexOf(`--${name}`); return i >= 0 ? rest[i + 1] : undefined; };
const fmt = (iso: string) => new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' });

async function main() {
  if (cmd === 'list') {
    const { data, error } = await db.from('tournaments').select('id, name, size, time_control, starts_at, status')
      .order('starts_at', { ascending: false }).limit(20);
    if (error) throw error;
    for (const t of data ?? []) console.log(`${t.id}  ${t.status.padEnd(9)} ${fmt(t.starts_at)}  ${t.time_control}  ${t.size}  ${t.name}`);
    return;
  }
  if (cmd === 'create') {
    const starts = flag('starts');
    if (!starts || Number.isNaN(Date.parse(starts))) throw new Error('--starts con fecha y zona, por ejemplo 2026-12-04T09:00:00-05:00');
    const input = CreateTournamentSchema.parse({
      name: rest[0], size: Number(flag('size') ?? 8), timeControl: flag('tc') ?? '5+0',
      startsInS: Math.max(1, Math.round((Date.parse(starts) - Date.now()) / 1000)), noshowS: Number(flag('noshow') ?? 300),
    });
    const { data, error } = await db.rpc('tour_create', {
      p_name: input.name, p_time_control: input.timeControl, p_size: input.size,
      p_starts_at: new Date(starts).toISOString(), p_noshow_s: input.noshowS,
    });
    if (error) throw new Error(error.message);
    console.log(`Creado ${data.id}: «${data.name}» · ${fmt(data.starts_at)} · ${data.time_control} · ${data.size} cupos`);
    return;
  }
  console.error('Uso: tournament.ts create "<nombre>" --size 4|8 --tc 3+2|5+0|10+0 --starts <ISO con zona> [--noshow 300]  ·  tournament.ts list');
  process.exit(1);
}
main().catch(e => { console.error(e instanceof Error ? e.message : e); process.exit(1); });
