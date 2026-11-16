import { describe, it, expect } from 'vitest';
import { PoiListQuerySchema, PublicPoiSchema, poiBounds } from './place';
const bbox = '-0.01,-0.01,0.01,0.01';
describe('bounded public POI contracts', () => {
  it('accepts narrow decimal bounds/category/text/sort/page without computing distances', () => {
    expect(PoiListQuerySchema.parse({bbox,q:' Synthetic ',category:'pharmacy',page:'2',pageSize:'1',sort:'name'}).q).toBe('Synthetic');
    expect(poiBounds(bbox)).toEqual([-0.01,-0.01,0.01,0.01]);
  });
  it.each(['', '-181,0,0,1','0,0,2,1','0,0,1,91','1,0,0,1','0,0,0,1','0,0,NaN,1','0,0,Infinity,1','0,0,1','0,,1,1','0,0,1e0,1'])('rejects invalid or unbounded bbox %s', (value) => {
    expect(PoiListQuerySchema.safeParse({bbox:value}).success).toBe(false);
  });
  it('rejects missing/repeated/unknown/identity/proximity and unbounded paging inputs', () => {
    for (const query of [{}, {bbox:[bbox,bbox]}, {bbox,lat:'0'}, {bbox,role:'owner'}, {bbox,pageSize:'101'}, {bbox,page:'10001'}, {bbox,sort:'distance'}, {bbox,q:'\u0000'}]) expect(PoiListQuerySchema.safeParse(query).success).toBe(false);
  });
  it('public points are strictly POI-only; unknown private snapshots fail validation', () => {
    const row={id:'40000000-0000-4000-8000-000000000001',kind:'POI',name:'Synthetic example',category:{code:'clinic',label:'Clinic'},location:{lat:0,lng:0},provenance:{dataKind:'SYNTHETIC',sourceLabel:'Synthetic fixture',verifiedAt:null},lastConfirmedAt:null};
    expect(PublicPoiSchema.safeParse(row).success).toBe(true);
    for(const changed of [{...row,kind:'BOARDING'},{...row,privateAddress:'PRIVATE_CANARY'},{...row,distanceMeters:2},{...row,location:{lat:91,lng:0}}]) expect(PublicPoiSchema.safeParse(changed).success).toBe(false);
  });
});
