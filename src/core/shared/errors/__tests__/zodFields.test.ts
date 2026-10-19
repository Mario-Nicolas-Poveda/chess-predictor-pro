import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { zodFields } from '../zodFields';

const fieldsOf = (schema: z.ZodType, data: unknown) => zodFields(schema.safeParse(data).error!);

// el caso del uuid (fields.id) está en los contratos de matchmaking, con MatchParamsSchema
describe('zodFields', () => {
  it('campo de más en un esquema strict → Campo no permitido', () => {
    expect(fieldsOf(z.object({ a: z.string() }).strict(), { a: 'x', elo: 1 })).toEqual({ elo: ['Campo no permitido'] });
  });

  it('error anidado → clave con puntos', () => {
    expect(Object.keys(fieldsOf(z.object({ user: z.object({ name: z.string() }) }), { user: { name: 1 } })))
      .toEqual(['user.name']);
  });

  it('cuerpo que no es objeto → _', () => {
    expect(Object.keys(fieldsOf(z.object({ a: z.string() }), 'hola'))).toEqual(['_']);
  });
});
