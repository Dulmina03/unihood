import { exploreHref, parseExploreQuery, type ExploreState } from '../explore/query';
export function poiDetailHref(id: string, state?: ExploreState) {
  const query = state ? exploreHref({...state, place: id}).split('?')[1] : '';
  return `/places/${id}${query ? `?${query}` : ''}`;
}
// Only established exploration keys survive; arbitrary origins/geometry never form a return link.
export function poiReturnHref(id: string, values: Record<string, string | string[] | undefined>) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (Array.isArray(value)) return '/explore';
    if (value !== undefined) params.append(key, value);
  }
  const parsed = parseExploreQuery(params);
  return parsed.valid && parsed.state.category === 'essentials' && parsed.state.place === id ? exploreHref(parsed.state) : '/explore';
}
