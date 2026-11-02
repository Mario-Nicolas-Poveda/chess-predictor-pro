import type { CoachAdvice, CoachPlan, CoachSource } from '../../infrastructure/dto/coachSchemas';
import type { CoachInput } from '../../domain/coachInput';
import type { PlanInput } from '../../domain/planInput';

export interface Written<T> { value: T; source: CoachSource; model: string | null }

/** Escribe los consejos. Hay dos: con un modelo de lenguaje y con plantillas (sin red). */
export interface CoachWriter {
  advise(input: CoachInput, signal?: AbortSignal): Promise<Written<CoachAdvice>>;
  plan(input: PlanInput, signal?: AbortSignal): Promise<Written<CoachPlan>>;
}
