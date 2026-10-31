import type { CoachWriter } from '../application/ports/CoachWriter';
import { FallbackCoachWriter, OpenAiCompatibleCoachWriter, type LlmConfig } from './OpenAiCompatibleCoachWriter';
import { TemplateCoachWriter } from './TemplateCoachWriter';

type Env = Record<string, string | undefined>;

const EFFORTS = ['none', 'minimal', 'low', 'medium', 'high'] as const;

/** Lee el modelo de las variables de entorno. null = falta alguna de las tres obligatorias. */
export function llmConfig(env: Env = process.env): LlmConfig | null {
  const baseUrl = env.COACH_LLM_BASE_URL?.trim().replace(/\/+$/, '');
  const apiKey = env.COACH_LLM_API_KEY?.trim();
  const model = env.COACH_LLM_MODEL?.trim();
  const effort = env.COACH_LLM_REASONING_EFFORT?.trim();
  return baseUrl && apiKey && model ? {
    baseUrl, apiKey, model,
    jsonMode: env.COACH_LLM_JSON_MODE === '1',
    timeoutMs: Number(env.COACH_LLM_TIMEOUT_MS) || 15_000,
    maxTokens: Number(env.COACH_LLM_MAX_TOKENS) || 1500,
    temperature: env.COACH_LLM_TEMPERATURE === 'off' ? null : Number(env.COACH_LLM_TEMPERATURE) || 0.4,
    reasoningEffort: (EFFORTS as readonly string[]).includes(effort ?? '') ? (effort as LlmConfig['reasoningEffort']) : undefined,
  } : null;
}

/**
 * Sin las tres variables obligatorias, el coach funciona solo con plantillas.
 * Se usa SOLO desde el contenedor del servidor: la clave nunca llega al navegador (no lleva NEXT_PUBLIC_).
 */
export function makeCoachWriter(env: Env = process.env, log?: (msg: string, e: unknown) => void): CoachWriter {
  const config = llmConfig(env);
  return new FallbackCoachWriter(config ? new OpenAiCompatibleCoachWriter(config) : null, new TemplateCoachWriter(), log);
}

/** Qué está configurado, sin mostrar la clave (para el log de arranque y el script de prueba). */
export function describeCoachWriter(env: Env = process.env): string {
  const c = llmConfig(env);
  if (!c) return 'solo plantillas (sin modelo configurado)';
  return `modelo ${c.model} en ${URL.canParse(c.baseUrl) ? new URL(c.baseUrl).host : 'una URL inválida'}`;   // el arranque no debe caerse por esto
}
