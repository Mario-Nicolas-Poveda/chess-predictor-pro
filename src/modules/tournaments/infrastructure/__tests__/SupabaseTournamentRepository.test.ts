import { describe, expect, it, vi } from 'vitest';

vi.mock('@/core/shared/db/supabaseAdmin', () => ({ supabaseAdmin: {} }));
const { fromRpc } = await import('../SupabaseTournamentRepository');

describe('fromRpc', () => {
  it('códigos de las funciones SQL → HTTP; lo desconocido sigue igual (500)', () => {
    expect(fromRpc({ message: 'TOURNAMENT_FULL' })).toMatchObject({ code: 'TOURNAMENT_FULL', status: 409 });
    expect(fromRpc({ message: 'NOT_REGISTERED' })).toMatchObject({ code: 'NOT_REGISTERED', status: 404 });
    const e = { message: 'deadlock detected' };
    expect(fromRpc(e)).toBe(e);
  });
});
