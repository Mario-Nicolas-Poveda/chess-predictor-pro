import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { analyseMatch } from '../../domain/analyseMatch';
import { buildCoachInput, type CoachInput } from '../../domain/coachInput';
import { buildPlanInput } from '../../domain/planInput';
import { game, sanOf } from '../../domain/__tests__/games';
import { describeCoachWriter, llmConfig, makeCoachWriter } from '../coachWriterFactory';
import { extractJson, FallbackCoachWriter, LlmError, OpenAiCompatibleCoachWriter, type LlmConfig } from '../OpenAiCompatibleCoachWriter';
import { TemplateCoachWriter } from '../TemplateCoachWriter';

const VALID = {
  summary: 'Perdiste por un mate que se podía ver en la apertura.',
  tips: [{ title: 'Mira los jaques', body: 'Antes de jugar 3… Cf6 revisa qué jaques tiene tu rival.', category: 'tactics', plies: [6] }],
  drill: 'Antes de cada jugada, busca los jaques del rival.',
};
const reply = (content: string, finish = 'stop') =>
  new Response(JSON.stringify({ choices: [{ message: { content }, finish_reason: finish }] }), { status: 200 });

type Sent = { url: string; headers: Record<string, string>; body: Record<string, unknown> };
function fakeFetch(...responses: Response[]) {
  const sent: Sent[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    sent.push({ url, headers: init.headers as Record<string, string>, body: JSON.parse(init.body as string) });
    return responses.shift() ?? new Response(null, { status: 500 });
  }) as unknown as typeof fetch;
  return { fn, sent };
}
const config = (fn: typeof fetch, over: Partial<LlmConfig> = {}): LlmConfig =>
  ({ baseUrl: 'https://llm.test/v1', apiKey: 'clave-secreta', model: 'modelo-x', jsonMode: false, timeoutMs: 1000, fetch: fn, ...over });

let input: CoachInput;
beforeAll(async () => {
  const a = await analyseMatch(game(['e4', 'e5', 'Bc4', 'Nc6', 'Qh5', 'Nf6', 'Qxf7#']), { sanOf });
  input = buildCoachInput(a, 'black', { result: 'loss', reason: 'checkmate', opponent: 'human', opponentElo: 1200, timeControl: '10+0', yourElo: 1150 },
    { games: 0, accuracyAvg: null, blundersPerGame: null, topMotif: null, worstPhase: null, streak: null });
}, 20_000);

describe('extractJson', () => {
  it('quita los ``` y el texto alrededor', () => {
    expect(extractJson('Aquí va:\n```json\n{"a":1}\n```\nListo')).toEqual({ a: 1 });
    expect(extractJson('Claro: {"a":1} ¿algo más?')).toEqual({ a: 1 });
  });

  it('sin objeto JSON es un error', () => {
    expect(() => extractJson('no sé')).toThrow(LlmError);
  });
});

describe('OpenAiCompatibleCoachWriter', () => {
  it('llama a chat/completions con la clave y devuelve la fuente', async () => {
    const { fn, sent } = fakeFetch(reply(JSON.stringify(VALID)));
    const r = await new OpenAiCompatibleCoachWriter(config(fn)).advise(input);
    expect(r).toMatchObject({ source: 'llm', model: 'modelo-x' });
    expect(sent[0]?.url).toBe('https://llm.test/v1/chat/completions');
    expect(sent[0]?.headers.authorization).toBe('Bearer clave-secreta');
    expect(sent[0]?.body).toMatchObject({ model: 'modelo-x', temperature: 0.4, max_tokens: 1500 });
  });

  it('una respuesta inválida se corrige una vez, con los errores', async () => {
    const { fn, sent } = fakeFetch(reply('```json\n{"summary":"corto","tips":[]}\n```'), reply(JSON.stringify(VALID)));
    const r = await new OpenAiCompatibleCoachWriter(config(fn)).advise(input);
    expect(sent).toHaveLength(2);
    expect(r.value.summary).toBe(VALID.summary);
    const messages = sent[1]?.body.messages as { role: string; content: string }[];
    expect(messages.at(-1)?.content).toMatch(/^Tu respuesta no cumple el formato \(.*summary/);
    expect(messages.at(-2)?.role).toBe('assistant');
  });

  it('dos respuestas inválidas son un error', async () => {
    const { fn, sent } = fakeFetch(reply('nada'), reply('tampoco'));
    await expect(new OpenAiCompatibleCoachWriter(config(fn)).advise(input)).rejects.toThrow('no devolvió un JSON válido');
    expect(sent).toHaveLength(2);
  });

  it('solo deja plies que existen, sin repetir', async () => {
    const { fn } = fakeFetch(reply(JSON.stringify({ ...VALID, tips: [{ ...VALID.tips[0], plies: [6, 6, 99] }] })));
    const r = await new OpenAiCompatibleCoachWriter(config(fn)).advise(input);
    expect(r.value.tips[0]?.plies).toEqual([6]);
  });

  it('manda los campos opcionales solo si se configuran', async () => {
    const send = async (over: Partial<LlmConfig>) => {
      const { fn, sent } = fakeFetch(reply(JSON.stringify(VALID)));
      await new OpenAiCompatibleCoachWriter(config(fn, over)).advise(input);
      return sent[0]!.body;
    };
    expect(await send({})).not.toHaveProperty('response_format');
    expect(await send({})).not.toHaveProperty('reasoning_effort');
    expect(await send({ jsonMode: true })).toMatchObject({ response_format: { type: 'json_object' } });
    expect(await send({ temperature: null })).not.toHaveProperty('temperature');
    expect(await send({ reasoningEffort: 'low' })).toMatchObject({ reasoning_effort: 'low' });
  });

  it('una respuesta cortada no se reintenta', async () => {
    const { fn, sent } = fakeFetch(reply('{"summary":"Perdis', 'length'), reply(JSON.stringify(VALID)));
    await expect(new OpenAiCompatibleCoachWriter(config(fn)).advise(input)).rejects.toThrow('COACH_LLM_MAX_TOKENS');
    expect(sent).toHaveLength(1);
  });

  it('un error del proveedor lleva su código', async () => {
    const { fn } = fakeFetch(new Response(null, { status: 401 }));
    await expect(new OpenAiCompatibleCoachWriter(config(fn)).advise(input)).rejects.toMatchObject({ status: 401 });
  });

  it('respeta la señal de quien llama', async () => {
    const fn = ((_: string, init: RequestInit) => new Promise((_ok, fail) => {
      init.signal!.addEventListener('abort', () => fail(init.signal!.reason));
    })) as unknown as typeof fetch;
    await expect(new OpenAiCompatibleCoachWriter(config(fn, { timeoutMs: 60_000 })).advise(input, AbortSignal.timeout(20)))
      .rejects.toMatchObject({ name: 'TimeoutError' });
  });

  it('el plan se valida con su propio formato', async () => {
    const plan = { headline: 'Vas mejorando en las aperturas.', focus: [{ title: 'Enroca pronto', body: 'Tu rey se queda en el centro demasiado tiempo.', category: 'opening' }], drill: 'Enroca antes de la jugada 10.' };
    const { fn } = fakeFetch(reply(JSON.stringify(plan)));
    const stats = { games: 3, accuracyAvg: 70, accuracyFirstHalf: 70, accuracySecondHalf: 70, blundersPerGame: 1, errorsByPhase: { opening: 1, middlegame: 0, endgame: 0 }, topMotifs: [], openings: [], results: { wins: 1, draws: 0, losses: 2, timeouts: 0 }, yourElo: 1200 };
    const r = await new OpenAiCompatibleCoachWriter(config(fn)).plan(buildPlanInput(stats));
    expect(r).toMatchObject({ source: 'llm', value: { headline: plan.headline } });
  });
});

describe('FallbackCoachWriter', () => {
  it('con un 429 usa las plantillas y lo registra', async () => {
    const log = vi.fn();
    const { fn } = fakeFetch(new Response(null, { status: 429 }));
    const writer = new FallbackCoachWriter(new OpenAiCompatibleCoachWriter(config(fn)), new TemplateCoachWriter(), log);
    expect(await writer.advise(input)).toMatchObject({ source: 'template', model: null });
    expect(log).toHaveBeenCalledOnce();
    expect(log.mock.calls[0]?.[1]).toMatchObject({ status: 429 });
  });
});

describe('fábrica', () => {
  const env = { COACH_LLM_BASE_URL: 'https://llm.test/v1/', COACH_LLM_API_KEY: 'clave-secreta', COACH_LLM_MODEL: 'modelo-x' };
  afterEach(() => { vi.unstubAllGlobals(); });

  it('sin las tres variables: plantillas, sin llamar a fetch', async () => {
    const fn = vi.fn();
    vi.stubGlobal('fetch', fn);
    expect(llmConfig({ ...env, COACH_LLM_MODEL: ' ' })).toBeNull();
    expect((await makeCoachWriter({}).advise(input)).source).toBe('template');
    expect(fn).not.toHaveBeenCalled();
  });

  it('con las tres: el modelo, y quita la barra final de la URL', async () => {
    const { fn, sent } = fakeFetch(reply(JSON.stringify(VALID)));
    vi.stubGlobal('fetch', fn);
    expect((await makeCoachWriter(env).advise(input)).source).toBe('llm');
    expect(sent[0]?.url).toBe('https://llm.test/v1/chat/completions');
  });

  it('con un 503: plantillas', async () => {
    const { fn } = fakeFetch(new Response(null, { status: 503 }));
    vi.stubGlobal('fetch', fn);
    expect((await makeCoachWriter(env, () => {}).advise(input)).source).toBe('template');
  });

  it('lee las opcionales; un esfuerzo desconocido se ignora', () => {
    expect(llmConfig({ ...env, COACH_LLM_JSON_MODE: '1', COACH_LLM_TIMEOUT_MS: '5000', COACH_LLM_MAX_TOKENS: '900', COACH_LLM_TEMPERATURE: 'off', COACH_LLM_REASONING_EFFORT: 'low' }))
      .toMatchObject({ jsonMode: true, timeoutMs: 5000, maxTokens: 900, temperature: null, reasoningEffort: 'low' });
    expect(llmConfig({ ...env, COACH_LLM_REASONING_EFFORT: 'turbo' })).toMatchObject({ jsonMode: false, timeoutMs: 15_000, maxTokens: 1500, temperature: 0.4, reasoningEffort: undefined });
  });

  it('describe lo configurado sin mostrar la clave y sin caerse con una URL mala', () => {
    expect(describeCoachWriter({})).toBe('solo plantillas (sin modelo configurado)');
    expect(describeCoachWriter(env)).toBe('modelo modelo-x en llm.test');
    expect(describeCoachWriter(env)).not.toContain('clave-secreta');
    expect(describeCoachWriter({ ...env, COACH_LLM_BASE_URL: 'esto no es una url' })).toBe('modelo modelo-x en una URL inválida');
  });
});
