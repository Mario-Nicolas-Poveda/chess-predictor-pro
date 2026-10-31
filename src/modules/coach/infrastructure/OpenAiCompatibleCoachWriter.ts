import type { z } from 'zod';
import { CoachAdviceSchema, CoachPlanSchema, type CoachAdvice, type CoachPlan } from './dto/coachSchemas';
import type { CoachWriter, Written } from '../application/ports/CoachWriter';
import type { CoachInput } from '../domain/coachInput';
import type { PlanInput } from '../domain/planInput';

export const PROMPT_VERSION = 1;

const RULES = `Reglas:
- Usa SOLO los datos que te doy. No inventes jugadas, variantes ni evaluaciones.
- Nombra las jugadas como vienen en los datos (por ejemplo "14… Cxe5"), en notación española (R rey, D dama, T torre, A alfil, C caballo).
- Tutea al jugador. Tono cercano y concreto, sin regaños ni exageraciones. Nada de emojis ni markdown.
- Consejos accionables: qué revisar o qué hacer distinto la próxima vez.
- Responde SOLO con un objeto JSON válido, sin texto antes ni después.`;

export const ADVICE_SYSTEM = `Eres el entrenador de ajedrez de Chess Predictor Pro. Analizas una partida terminada de un jugador aficionado a partir de los datos de un motor.
${RULES}
Formato exacto:
{"summary": "2 o 3 frases: cómo fue la partida y cuál fue el punto de quiebre, máx. 380 caracteres",
 "tips": [{"title": "máx. 70 caracteres", "body": "máx. 300 caracteres", "category": "opening|tactics|strategy|endgame|time|mindset", "plies": [números de ply de los datos que menciona el consejo]}],
 "drill": "un ejercicio concreto para practicar, máx. 240 caracteres"}
Da entre 1 y 3 tips, del más importante al menos. Si hay historial, conecta el consejo con lo que se repite.`;

export const PLAN_SYSTEM = `Eres el entrenador de ajedrez de Chess Predictor Pro. Con las estadísticas de las últimas partidas analizadas de un jugador aficionado, armas un plan de entrenamiento corto.
${RULES}
Formato exacto:
{"headline": "una frase que resume su momento, máx. 150 caracteres",
 "focus": [{"title": "máx. 70 caracteres", "body": "máx. 300 caracteres", "category": "opening|tactics|strategy|endgame|time|mindset"}],
 "drill": "la rutina de práctica de esta semana, máx. 240 caracteres"}
Da entre 1 y 3 focos, del más importante al menos.`;

export interface LlmConfig {
  baseUrl: string;         // p. ej. https://generativelanguage.googleapis.com/v1beta/openai  (sin la barra final)
  apiKey: string;
  model: string;
  jsonMode: boolean;       // manda response_format: json_object (solo si tu proveedor lo acepta)
  timeoutMs: number;       // por llamada; hay como máximo 2 llamadas
  temperature?: number | null;   // null = no se manda (algunos modelos de razonamiento solo aceptan el valor por defecto)
  maxTokens?: number;      // por defecto 1500 (en los modelos que "piensan", el razonamiento cuenta aquí)
  reasoningEffort?: 'none' | 'minimal' | 'low' | 'medium' | 'high';   // solo si el modelo lo acepta
  fetch?: typeof fetch;    // para los tests
}

export class LlmError extends Error {
  constructor(message: string, readonly status?: number) { super(message); }
}

/** Saca el JSON aunque el modelo lo envuelva en ```json … ``` o agregue texto alrededor. */
export function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const raw = fenced?.[1] ?? text;
  const start = raw.indexOf('{'), end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) throw new LlmError('La respuesta no trae un objeto JSON');
  return JSON.parse(raw.slice(start, end + 1));
}

/**
 * Cualquier proveedor con la API de "chat completions" de OpenAI: OpenAI, Gemini (capa de compatibilidad),
 * Groq, OpenRouter… Se elige con variables de entorno. Valida la respuesta con zod y reintenta una vez.
 */
export class OpenAiCompatibleCoachWriter implements CoachWriter {
  constructor(private readonly c: LlmConfig) {}

  advise(input: CoachInput, signal?: AbortSignal): Promise<Written<CoachAdvice>> {
    const allowed = new Set<number>([...input.errores.map(e => e.ply), ...input.momentosClave]);
    return this.run(ADVICE_SYSTEM, input, CoachAdviceSchema, signal).then(v => ({
      value: { ...v, tips: v.tips.map(t => ({ ...t, plies: [...new Set(t.plies)].filter(p => allowed.has(p)) })) },  // solo plies reales
      source: 'llm' as const, model: this.c.model,
    }));
  }

  plan(input: PlanInput, signal?: AbortSignal): Promise<Written<CoachPlan>> {
    return this.run(PLAN_SYSTEM, input, CoachPlanSchema, signal).then(value => ({ value, source: 'llm' as const, model: this.c.model }));
  }

  private async run<S extends z.ZodType>(system: string, input: unknown, schema: S, signal?: AbortSignal): Promise<z.infer<S>> {
    const messages: { role: 'system' | 'user' | 'assistant'; content: string }[] = [
      { role: 'system', content: system },
      { role: 'user', content: 'Datos (JSON):\n' + JSON.stringify(input) },
    ];
    for (let attempt = 1; attempt <= 2; attempt++) {
      const text = await this.call(messages, signal);
      let problem: string;
      try {
        const parsed = schema.safeParse(extractJson(text));
        if (parsed.success) return parsed.data;
        problem = parsed.error.issues.slice(0, 5).map(i => `${i.path.join('.') || 'raíz'}: ${i.message}`).join('; ');
      } catch (e) {
        problem = (e as Error).message;
      }
      messages.push({ role: 'assistant', content: text },
        { role: 'user', content: `Tu respuesta no cumple el formato (${problem}). Devuelve solo el objeto JSON corregido.` });
    }
    throw new LlmError('El modelo no devolvió un JSON válido');
  }

  private async call(messages: object[], outer?: AbortSignal): Promise<string> {
    const signal = AbortSignal.any([AbortSignal.timeout(this.c.timeoutMs), ...(outer ? [outer] : [])]);
    const res = await (this.c.fetch ?? fetch)(`${this.c.baseUrl}/chat/completions`, {
      method: 'POST', signal,
      headers: { 'content-type': 'application/json', authorization: `Bearer ${this.c.apiKey}` },
      body: JSON.stringify({
        model: this.c.model, messages, max_tokens: this.c.maxTokens ?? 1500,
        ...(this.c.temperature === null ? {} : { temperature: this.c.temperature ?? 0.4 }),
        ...(this.c.jsonMode ? { response_format: { type: 'json_object' } } : {}),
        ...(this.c.reasoningEffort ? { reasoning_effort: this.c.reasoningEffort } : {}),
      }),
    });
    if (!res.ok) throw new LlmError(`El proveedor respondió ${res.status}`, res.status);   // 401 clave, 429 cuota, 5xx caída
    const body = (await res.json()) as { choices?: { message?: { content?: string }; finish_reason?: string }[] };
    const choice = body.choices?.[0];
    if (choice?.finish_reason === 'length') throw new LlmError('Respuesta cortada: sube COACH_LLM_MAX_TOKENS');   // reintentar no ayuda
    const text = choice?.message?.content;
    if (!text) throw new LlmError('Respuesta vacía del proveedor');
    return text;
  }
}

/** Intenta con el modelo y, si falla por lo que sea (sin clave, cuota, caída, JSON malo), usa las plantillas. */
export class FallbackCoachWriter implements CoachWriter {
  constructor(private readonly primary: CoachWriter | null, private readonly fallback: CoachWriter,
              private readonly log: (msg: string, e: unknown) => void = (m, e) => console.warn(m, e)) {}
  async advise(i: CoachInput, s?: AbortSignal) {
    if (this.primary) try { return await this.primary.advise(i, s); } catch (e) { this.log('[coach] modelo falló, uso plantillas', e); }
    return this.fallback.advise(i, s);
  }
  async plan(i: PlanInput, s?: AbortSignal) {
    if (this.primary) try { return await this.primary.plan(i, s); } catch (e) { this.log('[coach] modelo falló, uso plantillas', e); }
    return this.fallback.plan(i, s);
  }
}
