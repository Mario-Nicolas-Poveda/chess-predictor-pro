import { describe, expect, it } from 'vitest';
import { zodFields } from '@/core/shared/errors/zodFields';
import { AI_LEVELS, AiMoveSchema, CreateAiGameSchema, TakebackQuerySchema, recommendedLevel } from '../aiSchemas';

const START = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';

describe('contrato de Contra la IA', () => {
  it('crear partida: solo el nivel → blancas, sin reloj y con predicción', () => {
    expect(CreateAiGameSchema.parse({ level: 3 })).toEqual({ level: 3, color: 'white', timeControl: 'none', prediction: true });
  });

  it('nivel 7, ritmo 3+2 o campo de más → error', () => {
    expect(CreateAiGameSchema.safeParse({ level: 7 }).success).toBe(false);
    expect(CreateAiGameSchema.safeParse({ level: 3, timeControl: '3+2' }).success).toBe(false);
    expect(CreateAiGameSchema.safeParse({ level: 3, rated: true }).success).toBe(false);
  });

  it('FEN: el inicial vale; uno roto da fields.fen', () => {
    expect(AiMoveSchema.parse({ fen: START, level: 2 })).toEqual({ fen: START, level: 2 });
    const r = AiMoveSchema.safeParse({ fen: 'hola', level: 2 });
    expect(r.success).toBe(false);
    expect(zodFields(r.error!)).toHaveProperty('fen');
  });

  it('deshacer: ply desde la query, 1 o más', () => {
    expect(TakebackQuerySchema.parse({ ply: '3' })).toEqual({ ply: 3 });
    expect(TakebackQuerySchema.safeParse({ ply: '0' }).success).toBe(false);
  });

  it('nivel recomendado = el de ELO más cercano', () => {
    expect(recommendedLevel(1450)).toBe(3);
    expect(recommendedLevel(500)).toBe(1);
    expect(recommendedLevel(2600)).toBe(5);
    expect(AI_LEVELS.map(l => l.level)).toEqual([1, 2, 3, 4, 5]);
  });
});
