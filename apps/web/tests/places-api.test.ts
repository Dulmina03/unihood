import { describe,it,expect,vi } from 'vitest';
import { proxyPlaces } from '../src/lib/places/api';
import { publicPois } from '../src/lib/maps/points';
import { publicAreaBounds } from '../src/lib/places/client';
const row={id:'40000000-0000-4000-8000-000000000001',kind:'POI',name:'Synthetic Pharmacy',category:{code:'pharmacy',label:'Pharmacy'},location:{lat:0,lng:0},provenance:{dataKind:'SYNTHETIC',sourceLabel:'Synthetic fixture',verifiedAt:null},lastConfirmedAt:null};
const page={items:[row],page:{page:1,pageSize:20,hasNextPage:false}};
const req=(q='bbox=-.01,-.01,.01,.01')=>new Request('http://local.invalid/api/places?'+q,{headers:{Authorization:'PRIVATE_CANARY','X-Role':'owner'}});
const query='bbox=-0.01,-0.01,0.01,0.01';
describe('public place adapter and map boundary',()=>{
 it('uses fixed upstream, validates page/scope and never forwards identity',async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>Response.json(page));const response=await proxyPlaces('places',req(query),{baseUrl:'http://127.0.0.1:3001/api/v1',fetcher});expect(response.status).toBe(200);
  expect(String(fetcher.mock.calls[0][0])).toContain('http://127.0.0.1:3001/api/v1/places?');expect(JSON.stringify(fetcher.mock.calls[0])).not.toContain('PRIVATE_CANARY');expect(response.headers.get('cache-control')).toBe('no-store');
 });
 it('rejects unknown/repeated/missing fields before network I/O',async()=>{
  const fetcher=vi.fn();for(const q of ['',query+'&bbox=0,0,1,1',query+'&role=owner',query+'&sort=distance'])expect((await proxyPlaces('places',req(q),{fetcher})).status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
 });
 it('redacts malformed/upstream errors and rejects out-of-bounds/boarding payloads',async()=>{
  for(const data of [{...page,items:[{...row,kind:'BOARDING'}]},{...page,items:[{...row,location:{lat:20,lng:20}}]},{...page,items:[{...row,privateAddress:'PRIVATE_CANARY'}]},{...page,page:{...page.page,page:2}}]){
   const response=await proxyPlaces('places',req(query),{fetcher:vi.fn(async()=>Response.json(data))});expect(response.status).toBe(503);expect(await response.text()).not.toContain('PRIVATE_CANARY');
  }
 });
 it('validates category pages and filters malformed duplicate/boarding map inputs',async()=>{
  const r=await proxyPlaces('place-categories',new Request('http://local.invalid/api/place-categories?'+query),{fetcher:vi.fn(async()=>Response.json({items:[row.category],page:{page:1,pageSize:100,hasNextPage:false}}))});expect(r.status).toBe(200);
  expect(publicPois([row,row,{...row,kind:'BOARDING'},{...row,privateAddress:'x'}])).toEqual([row]);expect(publicAreaBounds({lat:0,lng:0})).toBe('-0.01,-0.01,0.01,0.01');
 });
});
