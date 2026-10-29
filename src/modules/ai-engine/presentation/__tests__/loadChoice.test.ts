import { describe, expect, it } from 'vitest';
import { loadChoice } from '../components/AiLobby';

describe('última elección de Contra la IA', () => {
  it('sin nada guardado: el nivel recomendado, blancas, sin reloj y con predicción', () => {
    expect(loadChoice(null, 3)).toEqual({ level: 3, color: 'white', timeControl: 'none', prediction: true });
  });

  it('recupera lo guardado', () => {
    const saved = { level: 5, color: 'black', timeControl: '5+0', prediction: false };
    expect(loadChoice(JSON.stringify(saved), 3)).toEqual(saved);
  });

  it('descarta campo a campo lo que no vale y no lanza con JSON roto', () => {
    expect(loadChoice(JSON.stringify({ level: 9, color: 'red', timeControl: '3+2', prediction: 'sí' }), 2))
      .toEqual({ level: 2, color: 'white', timeControl: 'none', prediction: true });
    expect(loadChoice('{roto', 1).level).toBe(1);
  });
});
