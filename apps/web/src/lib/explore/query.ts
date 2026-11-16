import { PublicIdSchema, UniversitySlugSchema } from '@unihood/contracts';
export type ExploreState = {university: string; campus: string; entrance: string; category: 'entrances' | 'boardings' | 'essentials'; q: string; view: 'map' | 'list'};
export const defaultExploreState: ExploreState = {university: '', campus: '', entrance: '', category: 'entrances', q: '', view: 'map'};
const keys = Object.keys(defaultExploreState);
// Reject unknown/repeated fields and arbitrary spatial/identity parameters. Never reflect bad values.
export function parseExploreQuery(params: URLSearchParams): {valid: boolean; state: ExploreState} {
  const state = {...defaultExploreState};
  for (const [key, value] of params) {
    if (!keys.includes(key) || params.getAll(key).length !== 1 || !value) return {valid: false, state: {...defaultExploreState}};
    if (key === 'university' && UniversitySlugSchema.safeParse(value).success) state.university = value;
    else if (key === 'campus' && PublicIdSchema.safeParse(value).success) state.campus = value;
    else if (key === 'entrance' && PublicIdSchema.safeParse(value).success) state.entrance = value;
    else if (key === 'category' && ['entrances', 'boardings', 'essentials'].includes(value)) state.category = value as ExploreState['category'];
    else if (key === 'view' && ['map', 'list'].includes(value)) state.view = value as ExploreState['view'];
    else if (key === 'q' && value.length <= 100 && !/[\u0000-\u001f\u007f]/.test(value) && value.trim()) state.q = value.trim();
    else return {valid: false, state: {...defaultExploreState}};
  }
  return {valid: !(state.campus && !state.university) && !(state.entrance && !state.campus), state};
}
export function exploreHref(state: Partial<ExploreState> = {}) {
  const full = {...defaultExploreState, ...state};
  const params = new URLSearchParams();
  for (const key of keys as (keyof ExploreState)[]) if (full[key] && full[key] !== defaultExploreState[key]) params.set(key, full[key]);
  const query = params.toString();
  return `/explore${query ? `?${query}` : ''}`;
}
