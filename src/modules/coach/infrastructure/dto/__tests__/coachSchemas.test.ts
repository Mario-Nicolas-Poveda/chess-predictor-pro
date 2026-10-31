import { describe, expect, it } from 'vitest';
import { CoachAdviceSchema, CoachPlanSchema } from '../coachSchemas';

const tip = { title: 'Revisa qué queda sin defensa', body: 'Antes de soltar la pieza, mira qué casillas deja de proteger.', category: 'tactics' };
const advice = { summary: 'Derrota con negras. Tu precisión fue 66 %.', tips: [tip], drill: 'Repasa jaques, capturas y amenazas.' };
const plan = { headline: 'Precisión media de 66 % en 3 partidas.', focus: [tip], drill: advice.drill };

describe('CoachAdviceSchema', () => {
  it('acepta un consejo válido y plies sale [] si no viene', () => {
    expect(CoachAdviceSchema.parse(advice).tips[0]?.plies).toEqual([]);
  });

  it('rechaza 4 consejos', () => {
    expect(CoachAdviceSchema.safeParse({ ...advice, tips: [tip, tip, tip, tip] }).success).toBe(false);
  });

  it('rechaza una categoría que no existe', () => {
    expect(CoachAdviceSchema.safeParse({ ...advice, tips: [{ ...tip, category: 'magia' }] }).success).toBe(false);
  });

  it('rechaza un resumen de 5 letras', () => {
    expect(CoachAdviceSchema.safeParse({ ...advice, summary: 'corto' }).success).toBe(false);
  });
});

describe('CoachPlanSchema', () => {
  it('acepta un plan válido', () => {
    expect(CoachPlanSchema.parse(plan).focus).toHaveLength(1);
  });

  it('rechaza 4 focos', () => {
    expect(CoachPlanSchema.safeParse({ ...plan, focus: [tip, tip, tip, tip] }).success).toBe(false);
  });

  it('rechaza una categoría que no existe', () => {
    expect(CoachPlanSchema.safeParse({ ...plan, focus: [{ ...tip, category: 'magia' }] }).success).toBe(false);
  });

  it('rechaza un titular de 5 letras', () => {
    expect(CoachPlanSchema.safeParse({ ...plan, headline: 'corto' }).success).toBe(false);
  });
});
