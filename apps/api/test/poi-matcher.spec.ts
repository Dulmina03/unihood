import { PoiMatcherService } from '../src/duplicates/poi-matcher.service';
const id='50000000-0000-4000-8000-000000000001';
const input={kind:'POI' as const,name:'Synthetic pharmacy',category:'pharmacy',location:{lat:0,lng:0}};
const row={id,name:'Synthetic pharmacy',category:'pharmacy',withinRadius:true,sameBuilding:false,sourceMatch:false,aliases:[]};
function setup(rows:unknown[]=[row],scores:unknown[]=[{id,similarity:1}]) {
 const calls:Array<[string,unknown[]]>=[];
 const query=async(sql:string,values:unknown[])=>{calls.push([sql,values]);return calls.length===1?rows:scores;};
 // This adapter has exactly the service's repository dependency; no real pool is created.
 const repository={includeSynthetic:false,query};
 return {service:new PoiMatcherService(repository),calls};
}
describe('read-only public POI candidate engine',()=>{
 it('binds SQL values, uses geography metres and pg_trgm without mutable session thresholds',async()=>{
  const {service,calls}=setup();const result=await service.match(input);expect(result.candidates[0]).toMatchObject({id,score:95,requiresReview:true});
  expect(calls[0][0]).toContain('ST_DWithin');expect(calls[0][0]).toContain('::geography');expect(calls[0][1]).toEqual([false,0,0,50,null,null,null,21,201]);expect(calls[1][0]).toContain('similarity(');
  expect(calls.map(c=>c[0]).join(' ')).not.toMatch(/\b(?:INSERT|UPDATE|DELETE|MERGE|SET)\b|set_limit|private_boarding/i);
 });
 it('keeps shared-building and conflicting-category candidates advisory even for an exact source',async()=>{
  const shared=setup([{...row,sameBuilding:true}]);expect((await shared.service.match(input)).candidates[0]).toMatchObject({score:79,classification:'REVIEW_REQUIRED'});
  const conflict=setup([{...row,category:'clinic',sourceMatch:true}]);expect((await conflict.service.match(input)).candidates[0]).toMatchObject({score:49,classification:'REVIEW_REQUIRED'});
 });
 it('deduplicates and orders deterministically, reports page/scan/alias incompleteness',async()=>{
  const other='50000000-0000-4000-8000-000000000002';
  const both=setup([{...row,id:other},row],[{id:other,similarity:1},{id,similarity:1}]);const result=await both.service.match({...input,limit:1});expect(result.candidates.map(x=>x.id)).toEqual([id]);expect(result.hasMore).toBe(true);
  const scan=setup(Array.from({length:201},()=>row));expect((await scan.service.match(input)).incomplete).toBe(true);
  const aliases=setup([{...row,aliases:Array(21).fill('Synthetic alias')}]);expect((await aliases.service.match(input)).incomplete).toBe(true);
  const missing=setup([row],[]);expect(await missing.service.match(input)).toMatchObject({candidates:[],incomplete:true,requiresReview:true});
 });
 it('never queries invalid inputs or treats an empty public scan as authority to create/merge',async()=>{
  const {service,calls}=setup([]);await expect(service.match({...input,kind:'BOARDING'})).rejects.toThrow();expect(calls).toHaveLength(0);
  expect(await service.match(input)).toMatchObject({candidates:[],requiresReview:true,incomplete:false});expect(calls).toHaveLength(1);
 });
 it('normalizes raw legacy names and aliases rather than rewriting stored originals',async()=>{
  const {service,calls}=setup([{...row,name:'Synthetic CAFÉ',aliases:['Synthetic cafe\u0301']}],[{id,similarity:.5}]);
  expect((await service.match({...input,name:'Synthetic cafe\u0301'})).candidates[0].signals.normalizedNameExact).toBe(true);
  expect(JSON.parse(String(calls[1][1][0]))).toEqual([{id,name:'synthetic café'},{id,name:'synthetic café'}]);
 });
});
