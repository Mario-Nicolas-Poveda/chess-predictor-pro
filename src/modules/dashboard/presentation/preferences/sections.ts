import type { ProfilePreferences } from '@/modules/dashboard/infrastructure/dto/preferencesSchemas';
import type { SectionId } from '../theme/themes';

type Order = ProfilePreferences['sectionOrder'];

/** Sube (-1) o baja (+1) una sección; en los extremos devuelve el mismo orden. */
export function moveSection(order: Order, id: SectionId, dir: -1 | 1): Order {
  const i = order.indexOf(id), j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = [...order];
  [next[i], next[j]] = [next[j]!, next[i]!];
  return next;
}

/** El contrato exige al menos una sección visible: la última visible no se puede ocultar. */
export const canHide = (p: ProfilePreferences, id: SectionId) =>
  p.hiddenSections.includes(id) || p.sectionOrder.length - p.hiddenSections.length > 1;

export function toggleSection(p: ProfilePreferences, id: SectionId): ProfilePreferences['hiddenSections'] {
  if (p.hiddenSections.includes(id)) return p.hiddenSections.filter(s => s !== id);
  return canHide(p, id) ? [...p.hiddenSections, id] : p.hiddenSections;
}
