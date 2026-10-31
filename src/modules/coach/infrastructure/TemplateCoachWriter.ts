import { CoachAdviceSchema, CoachPlanSchema, type CoachAdvice, type CoachPlan, type TipCategory } from './dto/coachSchemas';
import type { CoachWriter, Written } from '../application/ports/CoachWriter';
import type { CoachInput } from '../domain/coachInput';
import type { PlanInput } from '../domain/planInput';

type Tip = CoachAdvice['tips'][number];

/** Un consejo por motivo. {j} = la jugada, {m} = la mejor, {p} = la pieza. `plan` es el texto para el historial. */
const BY_MOTIF: Record<string, { title: string; body: string; plan: string; category: TipCategory; drill: string }> = {
  'dejó una pieza sin defensa': {
    title: 'Revisa qué queda sin defensa', category: 'tactics',
    body: 'En {j} tu {p} quedó sin defensa y el rival lo aprovechó. Antes de soltar la pieza, mira qué casillas deja de proteger tu jugada.',
    plan: 'Pierdes material por piezas que quedan sin defensa. Antes de cada jugada, mira qué deja de proteger.',
    drill: 'Antes de cada jugada, repasa jaques, capturas y amenazas del rival (las tuyas y las suyas).',
  },
  'no capturó una pieza que se podía ganar': {
    title: 'Busca las capturas que ganan', category: 'tactics',
    body: 'En {j} podías ganar material con {m}. Cuando el rival mueve, pregúntate qué dejó sin proteger.',
    plan: 'Se te escapan capturas que ganan material. Después de cada jugada del rival, busca qué dejó sin proteger.',
    drill: 'Resuelve 10 ejercicios de "gana material en 1 jugada" antes de tu próxima partida.',
  },
  'tenía mate y no lo dio': {
    title: 'Mira primero los jaques', category: 'tactics',
    body: 'En {j} tenías mate con {m}. Revisar todos los jaques posibles antes de elegir te habría dado la partida.',
    plan: 'Has dejado pasar mates. Antes de elegir, revisa siempre todos tus jaques.',
    drill: 'Haz 10 ejercicios de mate en 1 y mate en 2.',
  },
  'permitió un mate': {
    title: 'Protege a tu rey antes de atacar', category: 'tactics',
    body: 'Después de {j} el rival tenía mate. Antes de jugar, revisa qué jaques puede dar tu rival.',
    plan: 'Algunas partidas se pierden por mates que se podían ver. Antes de jugar, revisa los jaques del rival.',
    drill: 'Antes de cada jugada, imagina la respuesta más fuerte del rival: primero sus jaques.',
  },
  'sacó la dama muy pronto': {
    title: 'Desarrolla antes de sacar la dama', category: 'opening',
    body: 'Sacaste la dama en las primeras jugadas. Así el rival gana tiempo atacándola mientras saca sus piezas.',
    plan: 'Sueles sacar la dama muy pronto. Primero caballos y alfiles; la dama después.',
    drill: 'En tus próximas 3 partidas, mueve la dama solo después de sacar caballos y alfiles.',
  },
  'no enrocó a tiempo': {
    title: 'Enroca pronto', category: 'opening',
    body: 'Tu rey siguió en el centro mucho tiempo. Enrocar temprano lo protege y conecta tus torres.',
    plan: 'Tu rey se queda en el centro demasiado tiempo. Enrocar pronto lo protege y conecta tus torres.',
    drill: 'Proponte enrocar antes de la jugada 10 en tus próximas partidas.',
  },
  'tardó en sacar las piezas menores': {
    title: 'Saca caballos y alfiles primero', category: 'opening',
    body: 'En la jugada 10 aún tenías piezas menores en su casilla inicial. Desarrollarlas pronto te da el control del centro.',
    plan: 'Tardas en sacar caballos y alfiles. Desarrollarlos pronto te da el control del centro.',
    drill: 'En la apertura, cuenta tus piezas desarrolladas cada pocas jugadas.',
  },
  'se quedó sin tiempo': {
    title: 'Administra el reloj', category: 'time',
    body: 'El reloj pesó al final. Juega las jugadas obvias rápido y guarda tiempo para las posiciones difíciles.',
    plan: 'El reloj te pesa al final. Juega rápido las jugadas obvias y guarda tiempo para las difíciles.',
    drill: 'Juega una partida de 10 + 0 tratando de llegar a la jugada 20 con más de la mitad del tiempo.',
  },
};
const WITH_ARTICLE: Record<string, string> = { apertura: 'la apertura', 'medio juego': 'el medio juego', final: 'el final' };
const fill = (s: string, v: Record<string, string>) => s.replace(/\{(\w)\}/g, (_, k: string) => v[k] ?? '');

/** Sin red ni costo: siempre responde. Se usa si no hay modelo configurado o si el modelo falla. */
export class TemplateCoachWriter implements CoachWriter {
  async advise(i: CoachInput): Promise<Written<CoachAdvice>> {
    const tips: Tip[] = [], used = new Set<string>();
    for (const e of i.errores) {
      const key = e.motivo?.replace(/ \(.*\)$/, '');
      const t = key ? BY_MOTIF[key] : null;
      if (!t || used.has(key!) || tips.length >= 3) continue;
      used.add(key!);
      const piece = e.motivo?.match(/\((.*)\)/)?.[1] ?? 'pieza';
      tips.push({ title: t.title, body: fill(t.body, { j: e.jugada, m: e.mejor ?? 'otra jugada', p: piece }), category: t.category, plies: [e.ply] });
    }
    for (const h of i.habitos) {
      const t = BY_MOTIF[h];
      if (!t || used.has(h) || tips.length >= 3) continue;
      used.add(h);
      tips.push({ title: t.title, body: t.body, category: t.category, plies: [] });
    }
    const worst = i.errores[0];
    if (!tips.length) {
      tips.push(worst
        ? { title: 'Tu jugada más cara', body: `${worst.jugada} fue ${worst.tipo}${worst.mejor ? `; era mejor ${worst.mejor}` : ''}. Busca qué cambió en la posición después de esa jugada.`, category: 'strategy', plies: [worst.ply] }
        : { title: 'Partida limpia', body: 'No hubo errores claros. Repasa la apertura y busca dónde podías apretar más.', category: 'mindset', plies: [] });
    }
    const p = i.partida.precision;
    const summary = `${i.jugador.resultado.charAt(0).toUpperCase()}${i.jugador.resultado.slice(1)} con ${i.jugador.color}. ` +
      `Tu precisión fue ${p.tuya} % (tu rival ${p.rival} %)` +
      (worst ? `, y tu jugada más cara fue ${worst.jugada} (${worst.tipo}).` : ', sin errores claros.');
    const firstKey = [...used][0];
    const drill = (firstKey && BY_MOTIF[firstKey]?.drill) || 'Repasa esta partida jugada a jugada y explica en voz alta el plan de cada una.';
    return { value: CoachAdviceSchema.parse({ summary, tips, drill }), source: 'template', model: null };
  }

  async plan(i: PlanInput): Promise<Written<CoachPlan>> {
    const focus: CoachPlan['focus'] = [];
    for (const m of i.motivosFrecuentes) {
      const t = BY_MOTIF[m.motivo];
      if (t && focus.length < 3) focus.push({ title: t.title, body: `${t.plan} (Pasó ${m.veces} ${m.veces === 1 ? 'vez' : 'veces'} en tus últimas partidas.)`, category: t.category });
    }
    if (i.faseConMasErrores && focus.length < 3)
      focus.push({ title: `Más cuidado en ${WITH_ARTICLE[i.faseConMasErrores] ?? i.faseConMasErrores}`, body: 'Es la fase donde más te equivocas. Cuando llegues a ella, piensa un poco más cada jugada.', category: i.faseConMasErrores === 'final' ? 'endgame' : i.faseConMasErrores === 'apertura' ? 'opening' : 'strategy' });
    if (!focus.length) focus.push({ title: 'Sigue así', body: 'No hay un error que se repita. Sube de nivel contra la IA para encontrar tus puntos débiles.', category: 'mindset' });
    const headline = `Precisión media de ${i.precisionMedia} % en ${i.partidasAnalizadas} partidas (${i.tendencia}).`;
    const drill = BY_MOTIF[i.motivosFrecuentes[0]?.motivo ?? '']?.drill ?? 'Juega 3 partidas contra la IA un nivel por encima del tuyo y analízalas.';
    return { value: CoachPlanSchema.parse({ headline, focus, drill }), source: 'template', model: null };
  }
}
