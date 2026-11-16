import { describe, expect, it } from 'vitest';
import { allowedMapResource, mapProvider, styleUrl } from '../src/lib/maps/provider';
import { publicGates } from '../src/lib/maps/points';
const campus = '20000000-0000-4000-8000-000000000001';
const gate = {id: '30000000-0000-4000-8000-000000000001', campusId: campus, name: 'Synthetic gate', location: {lat: 0, lng: 0}, isPrimary: true, provenance: {dataKind: 'SYNTHETIC', sourceLabel: 'Synthetic test fixture', verifiedAt: null}};
describe('credential-free map boundary', () => {
  it('defaults missing and serializes only reviewed public configuration', () => {
    expect(mapProvider({SECRET_KEY: 'PRIVATE_CANARY', NEXT_PUBLIC_MAP_STYLE_URL: 'https://evil.invalid/?key=secret'})).toEqual({kind: 'missing'});
    expect(mapProvider({MAP_PROVIDER: 'openfreemap', SECRET_KEY: 'PRIVATE_CANARY'})).toEqual({kind: 'openfreemap', style: 'liberty'});
    expect(mapProvider({MAP_PROVIDER: 'openfreemap', MAP_STYLE: 'bright'})).toEqual({kind: 'openfreemap', style: 'bright'});
    expect(styleUrl({kind: 'openfreemap', style: 'liberty'})).toBe('https://tiles.openfreemap.org/styles/liberty');
  });
  it.each([{MAP_PROVIDER: 'arbitrary'}, {MAP_PROVIDER: 'openfreemap', MAP_STYLE: 'https://private.invalid'}, {MAP_PROVIDER: 'openfreemap', MAP_STYLE: 'liberty?key=private'}])('rejects unsupported configuration without reflecting secrets', (env) => {
    expect(mapProvider(env)).toEqual({kind: 'invalid'});
  });
  it.each(['http://tiles.openfreemap.org/x', 'https://tiles.openfreemap.org.evil.invalid/x', 'https://user:secret@tiles.openfreemap.org/x', 'https://tiles.openfreemap.org/x?key=private', 'data:abc', '/private', 'https://tiles.openfreemap.org:444/x', 'https://tiles.openfreemap.org/x#private'])('blocks unreviewed resource URL %s', (url) => expect(allowedMapResource(url)).toBe(false));
  it('allows reviewed credential-free styles, glyphs, sprites and tile paths', () => {
    for (const path of ['styles/liberty', 'fonts/Noto%20Sans/0-255.pbf', 'sprites/ofm@2x.png', 'planet/0/0/0.pbf']) expect(allowedMapResource(`https://tiles.openfreemap.org/${path}`)).toBe(true);
  });
  it('admits only strict public gate DTOs for the current campus, with no duplicate or boarding properties', () => {
    expect(publicGates([gate, gate, {...gate, visibility: 'HIDDEN'}, {...gate, location: {lat: 999, lng: 0}}, {...gate, campusId: '20000000-0000-4000-8000-000000000002'}, {kind: 'BOARDING', privateLocation: [1, 2]}], campus)).toEqual([gate]);
  });
});
