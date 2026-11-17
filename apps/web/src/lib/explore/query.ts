import { PoiCategoryCodeSchema, PublicIdSchema, UniversitySlugSchema } from '@unihood/contracts';
export type ExploreState = {university: string; campus: string; entrance: string; category: 'entrances' | 'boardings' | 'essentials'; q: string; gate: 'all' | 'primary'; sort: 'directory' | 'name'; view: 'map' | 'list'; poiCategory:string; poiSort:'name'|'newest'; poiPage:string; place:string; boarding:string};
export const defaultExploreState: ExploreState = {university: '', campus: '', entrance: '', category: 'entrances', q: '', gate: 'all', sort: 'directory', view: 'map', poiCategory:'', poiSort:'name', poiPage:'1', place:'', boarding:''};
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
    else if (key === 'gate' && ['all', 'primary'].includes(value)) state.gate = value as ExploreState['gate'];
    else if (key === 'sort' && ['directory', 'name'].includes(value)) state.sort = value as ExploreState['sort'];
    else if (key === 'view' && ['map', 'list'].includes(value)) state.view = value as ExploreState['view'];
    else if(key==='poiCategory'&&PoiCategoryCodeSchema.safeParse(value).success) state.poiCategory=value;
    else if(key==='poiSort'&&['name','newest'].includes(value)) state.poiSort=value as ExploreState['poiSort'];
    else if(key==='poiPage'&&/^(?:[1-9]|[1-9][0-9]{1,3}|10000)$/.test(value))state.poiPage=value;
    else if(key==='boarding'&&PublicIdSchema.safeParse(value).success)state.boarding=value;
    else if(key==='place'&&PublicIdSchema.safeParse(value).success)state.place=value;
    else if (key === 'q' && value.length <= 100 && !/[\u0000-\u001f\u007f]/.test(value) && value.trim()) state.q = value.trim();
    else return {valid: false, state: {...defaultExploreState}};
  }
  return {valid: !(state.boarding && (state.category!=='boardings'||!state.campus)) && !(state.campus && !state.university) && !(state.entrance && !state.campus) && !(state.place && (state.category!=='essentials'||!state.entrance)), state};
}
export function exploreHref(state: Partial<ExploreState> = {}) {
  const full = {...defaultExploreState, ...state};
  const params = new URLSearchParams();
  for (const key of keys as (keyof ExploreState)[]) if (full[key] && full[key] !== defaultExploreState[key]) params.set(key, full[key]);
  const query = params.toString();
  return `/explore${query ? `?${query}` : ''}`;
}
