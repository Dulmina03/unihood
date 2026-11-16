import { describe, expect, it } from 'vitest';
import { filterEntrances } from '../src/lib/explore/results';
import { defaultExploreState, exploreHref, parseExploreQuery } from '../src/lib/explore/query';
const provenance = {dataKind: 'SYNTHETIC' as const, sourceLabel: 'Synthetic test', verifiedAt: null};
const gates = [{id: '30000000-0000-4000-8000-000000000001', campusId: '20000000-0000-4000-8000-000000000001', name: 'Zèbra North Gate', location: {lat: 0, lng: 0}, isPrimary: true, provenance}, {id: '30000000-0000-4000-8000-000000000002', campusId: '20000000-0000-4000-8000-000000000001', name: 'Alpha South Gate', location: {lat: 0, lng: 0}, isPrimary: false, provenance}];
describe('public-only refined discovery', () => {
  it('matches normalized name tokens and primary type without geographic ordering', () => {
    expect(filterEntrances(gates, {...defaultExploreState, q: ' GATE  zebra ', gate: 'primary'})).toEqual([gates[0]]);
    expect(filterEntrances(gates, {...defaultExploreState, q: 'south', gate: 'primary'})).toEqual([]);
    expect(filterEntrances(gates, {...defaultExploreState, category: 'boardings'})).toEqual([]);
    expect(filterEntrances(gates, {...defaultExploreState, category: 'essentials'})).toEqual([]);
  });
  it('sorts a copy by name, leaving directory order and original input unchanged', () => {
    expect(filterEntrances(gates, {...defaultExploreState, sort: 'name'})).toEqual([gates[1], gates[0]]);
    expect(filterEntrances(gates, defaultExploreState)).toEqual(gates); expect(gates[0].name).toBe('Zèbra North Gate');
  });
  it('round trips refined filters and omits defaults from stable links', () => {
    const state = {...defaultExploreState, gate: 'primary' as const, sort: 'name' as const, q: 'North Gate'};
    expect(parseExploreQuery(new URLSearchParams(exploreHref(state).split('?')[1]))).toEqual({valid: true, state});
    expect(exploreHref(defaultExploreState)).toBe('/explore');
  });
  it.each(['sort=distance', 'gate=private', 'gate=primary&gate=all', 'sort=name&sort=directory', 'saved=PRIVATE_CANARY', 'lat=4&lng=5'])('rejects unsupported sharing/filter inputs: %s', (query) => {
    expect(parseExploreQuery(new URLSearchParams(query))).toEqual({valid: false, state: defaultExploreState});
  });
});
