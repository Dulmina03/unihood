import { describe, expect, it } from 'vitest';
import { defaultExploreState, exploreHref, parseExploreQuery } from '../src/lib/explore/query';
const campus = '20000000-0000-4000-8000-000000000001', entrance = '30000000-0000-4000-8000-000000000001';
describe('exploration URL contract', () => {
  it('round trips a canonical, encoded and shareable selection', () => {
    const state = {...defaultExploreState, university: 'synthetic-demo', campus, entrance, q: 'East & North', view: 'list' as const, category: 'essentials' as const};
    const url = exploreHref(state);
    expect(parseExploreQuery(new URLSearchParams(url.split('?')[1]))).toEqual({valid: true, state});
    expect(exploreHref()).toBe('/explore');
    expect(exploreHref({university: undefined})).toBe('/explore');
  });
  it.each(['university=INVALID', 'campus=bad', `entrance=${entrance}`, `campus=${campus}`, 'university=a&university=b', 'view=earth', 'category=private', 'q=%00', 'q=%20', `q=${'x'.repeat(101)}`, 'lat=1&lng=2', 'X-Role=owner', '__proto__=x', 'view='])('rejects unsupported or malformed state without reflecting it: %s', (query) => {
    const result = parseExploreQuery(new URLSearchParams(query));
    expect(result.valid).toBe(false);
  });
  it('allows supported defaults and trims a name filter', () => {
    expect(parseExploreQuery(new URLSearchParams('q=%20Main%20&view=map&category=entrances'))).toEqual({valid: true, state: {...defaultExploreState, q: 'Main'}});
  });
});

it('round trips public service layer, page, sort and canonical public selection',()=>{
 const state={...defaultExploreState,university:'synthetic-demo',campus,entrance,category:'essentials' as const,poiCategory:'pharmacy',poiSort:'newest' as const,poiPage:'2',place:'40000000-0000-4000-8000-000000000001'};
 expect(parseExploreQuery(new URLSearchParams(exploreHref(state).split('?')[1]))).toEqual({valid:true,state});
 for(const q of ['poiPage=0','poiPage=10001','poiSort=distance','poiCategory=BAD',`place=${state.place}`])expect(parseExploreQuery(new URLSearchParams(q)).valid).toBe(false);
});
