import { describe, expect, it } from 'vitest';
import { JoinQueueSchema, MatchIdSchema } from '../matchmakingSchemas';

describe('contratos de matchmaking', () => {
  it('JoinQueue acepta los ritmos del contrato', () => {
    expect(JoinQueueSchema.parse({ timeControl: '10+0' })).toEqual({ timeControl: '10+0' });
  });

  it('JoinQueue rechaza un ritmo inexistente y campos extra', () => {
    expect(JoinQueueSchema.safeParse({ timeControl: '1+0' }).success).toBe(false);
    expect(JoinQueueSchema.safeParse({ timeControl: '10+0', userId: 'x' }).success).toBe(false);
  });

  it('MatchId exige un uuid', () => {
    expect(MatchIdSchema.safeParse('abc').success).toBe(false);
    expect(MatchIdSchema.safeParse('7f3a1c2e-9b4d-4e8f-a1b2-c3d4e5f60718').success).toBe(true);
  });
});
