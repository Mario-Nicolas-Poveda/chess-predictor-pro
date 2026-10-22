export type AiLevelId = 1 | 2 | 3 | 4 | 5;

export interface EngineLevel {
  id: AiLevelId;
  depth: number;      // profundidad máxima (medias jugadas)
  quiesce: boolean;   // seguir las capturas al final de la búsqueda
  noise: number;      // centipeones de azar que se suman a cada jugada de la raíz (se equivoca a propósito)
  ms: number;         // tiempo máximo para pensar
}

/** Lo que usa el motor. Lo que ve el usuario (nombre, ELO, texto) está en aiSchemas.ts. */
export const ENGINE_LEVELS: Record<AiLevelId, EngineLevel> = {
  1: { id: 1, depth: 1, quiesce: false, noise: 160, ms: 250 },
  2: { id: 2, depth: 2, quiesce: false, noise: 60, ms: 400 },
  3: { id: 3, depth: 2, quiesce: true, noise: 25, ms: 600 },
  4: { id: 4, depth: 3, quiesce: true, noise: 8, ms: 900 },
  5: { id: 5, depth: 4, quiesce: true, noise: 0, ms: 1400 },
};
