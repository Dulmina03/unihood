import { describe, expect, it } from 'vitest';
import { UniversitySchema, CampusEntranceSchema, PublicCoordinateSchema, UniversitySlugSchema, UniversityListQuerySchema, EntranceListQuerySchema } from './university';
const provenance = {dataKind: 'SYNTHETIC', sourceLabel: 'Synthetic fixture', verifiedAt: null};
const university = {id: '10000000-0000-4000-8000-000000000001', slug: 'synthetic-demo', name: 'Synthetic Demo', city: 'Synthetic City', country: 'ZZ', provenance};
describe('university public contracts', () => {
  it('validates explicit synthetic provenance and rejects private fields', () => {
    expect(UniversitySchema.parse(university)).toEqual(university);
    for (const patch of [{ownerId: 'private'}, {provenance: {...provenance, evidenceFile: 'private'}}, {provenance: {...provenance, dataKind: 'VERIFIED'}}, {country: 'Sri Lanka'}]) expect(UniversitySchema.safeParse({...university, ...patch}).success).toBe(false);
  });
  it('requires canonical lower-case bounded slugs', () => {
    for (const slug of ['UPPER', '-edge', 'a--b', 'a/b', 'a'.repeat(101), '']) expect(UniversitySlugSchema.safeParse(slug).success).toBe(false);
    expect(UniversitySlugSchema.parse('synthetic-university-2')).toBe('synthetic-university-2');
  });
  it('rejects out-of-range/nonfinite coordinates without normalization', () => {
    for (const value of [{lat: 91, lng: 0}, {lat: 0, lng: 181}, {lat: NaN, lng: 0}, {lat: Infinity, lng: 0}, {lat: 0, lng: -Infinity}]) expect(PublicCoordinateSchema.safeParse(value).success).toBe(false);
    expect(PublicCoordinateSchema.parse({lat: -90, lng: 180})).toEqual({lat: -90, lng: 180});
  });
  it('accepts only entrance identifiers, public campus coordinates and provenance', () => {
    const gate = {id: university.id, campusId: university.id, name: 'Synthetic Gate', location: {lat: 0, lng: 0}, isPrimary: true, provenance};
    expect(CampusEntranceSchema.safeParse(gate).success).toBe(true);
    expect(CampusEntranceSchema.safeParse({...gate, privateAddress: 'private'}).success).toBe(false);
  });
  it('bounds pagination and rejects repeated/unknown spatial or identity filters', () => {
    expect(UniversityListQuerySchema.parse({pageSize: '100', slug: 'synthetic-demo'})).toEqual({pageSize: '100', slug: 'synthetic-demo'});
    for (const value of [{pageSize: '101'}, {page: '0'}, {page: ['1', '2']}, {sort: 'distance'}, {ownerId: university.id}, {q: 'anything'}]) expect(UniversityListQuerySchema.safeParse(value).success).toBe(false);
    expect(EntranceListQuerySchema.safeParse({campusId: 'invalid'}).success).toBe(false);
  });
});
