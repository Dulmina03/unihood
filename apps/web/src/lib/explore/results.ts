import type { PublicGate } from '../maps/points';
import type { ExploreState } from './query';
const normalize = (text: string) => text.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('en');
// Name/type only: never infer proximity or official boarding facts.
export function filterEntrances(items: PublicGate[], state: ExploreState) {
  if (state.category !== 'entrances') return [];
  const words = normalize(state.q).trim().split(/\s+/).filter(Boolean);
  const result = items.filter((item) => (state.gate !== 'primary' || item.isPrimary) && words.every((word) => normalize(item.name).includes(word)));
  return state.sort === 'name' ? result.sort((a, b) => a.name.localeCompare(b.name, 'en') || a.id.localeCompare(b.id)) : result;
}
