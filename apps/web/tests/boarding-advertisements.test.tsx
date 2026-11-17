import { render,screen,fireEvent,waitFor,cleanup } from '@testing-library/react';
import { afterEach,describe,it,expect,vi } from 'vitest';
import { boardingQuery,advertisementsHref } from '../src/lib/boardings/query';
import { boardingData,proxyBoardings } from '../src/lib/boardings/api';
import { BoardingAdvertisements } from '../src/components/boardings/advertisements';
import { BoardingDetail } from '../src/components/boardings/boarding-detail';
const id='71000000-0000-4000-8000-000000000001';
const item={listing:{id,listingId:'72000000-0000-4000-8000-000000000001',kind:'BOARDING' as const,title:'Synthetic public preview',publisherKind:'COMMUNITY_RECOMMENDATION' as const,visibility:'HIDDEN' as const,locationLabel:null,entrance:null,distanceMeters:null,route:null,price:null,vacancy:{status:'UNKNOWN' as const,confirmedAt:null,expiresAt:null},disclaimer:'Community-submitted, not owner-verified' as const,provenance:{dataKind:'SYNTHETIC' as const,sourceLabel:'Synthetic test fixture',verifiedAt:null}},summary:'Curated fictional demonstration; no real property.',updatedAt:'2026-11-17T00:00:00Z'};
const page={items:[item],page:{page:1,pageSize:12,hasNextPage:false}};
afterEach(()=>{cleanup();vi.unstubAllGlobals();});
describe('advertisement query, adapters and UI',()=>{
 it('preserves only validated nonspatial URL state, including native form empty choices',()=>{
  const q=boardingQuery(new URLSearchParams('q=Synthetic&publisherKind=COMMUNITY_RECOMMENDATION&visibility=HIDDEN&page=2'));
  expect(boardingQuery(new URL(advertisementsHref(q),'http://local').searchParams)).toEqual(q);
  expect(boardingQuery(new URLSearchParams('q=&publisherKind=&sort=newest'),true)).toEqual({sort:'newest'});
  for(const value of ['q=a&q=b','lat=0','sort=distance','visibility=PUBLIC_MAP','ownerVerified=true','privateAddress=canary'])expect(()=>boardingQuery(new URLSearchParams(value))).toThrow();
 });
 it('uses bounded no-store credential-free upstream reads and rejects mismatch/private payloads',async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>Response.json(page));expect((await boardingData(undefined,{}, {fetcher})).status).toBe('found');
  expect(fetcher.mock.calls[0][1]).toMatchObject({cache:'no-store',credentials:'omit',redirect:'error'});
  for(const data of [{...page,privateAddress:'PRIVATE_CANARY'},{...page,page:{...page.page,page:2}},{...page,items:[{...item,privateAddress:'PRIVATE_CANARY'}]},{...page,items:[{...item,listing:{...item.listing,provenance:{dataKind:'VERIFIED',sourceLabel:'Forged source',verifiedAt:'2026-11-17T00:00:00Z'}}}]},{...page,items:[{...item,listing:{...item.listing,visibility:'PUBLIC_MAP',entrance:{lat:0,lng:0}}}]}])expect((await boardingData(undefined,{}, {fetcher:vi.fn(async()=>Response.json(data))})).status).toBe('unavailable');
  expect((await boardingData(id,{}, {fetcher:vi.fn(async()=>Response.json({...item,listing:{...item.listing,id:'71000000-0000-4000-8000-000000000002'}}))})).status).toBe('unavailable');
  const notCalled=vi.fn();expect((await boardingData('../private',{}, {fetcher:notCalled})).status).toBe('missing');expect(notCalled).not.toHaveBeenCalled();
 });
 it('sanitizes proxy errors and rejects private/repeated query fields without fetching',async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>Response.json({error:'PRIVATE_CANARY'},{status:503}));vi.stubGlobal('fetch',fetcher);
  const bad=await proxyBoardings(new Request('http://local/api/boardings?lat=0'));expect(bad.status).toBe(400);expect(fetcher).not.toHaveBeenCalled();
  const error=await proxyBoardings(new Request('http://local/api/boardings',{headers:{Authorization:'PRIVATE_CANARY'}}));expect(error.status).toBe(503);expect(await error.text()).not.toContain('PRIVATE_CANARY');expect(fetcher.mock.calls[0][1]).not.toHaveProperty('headers.Authorization');
 });
 it('shows meaningful source/privacy/unknown states and functional canonical links',()=>{
  render(<BoardingAdvertisements query={{}} initial={{status:'found',data:page}} />);
  expect(screen.getByText('Community-submitted')).toBeVisible();expect(screen.getByText('Location private',{selector:'.uh-badge'})).toBeVisible();expect(screen.getByText('Availability unknown')).toBeVisible();
  expect(screen.getByRole('link',{name:'View details for Synthetic public preview'})).toHaveAttribute('href','/boardings/'+id);
  expect(screen.queryByRole('button',{name:/Contact|Directions/})).not.toBeInTheDocument();
  expect(screen.getByRole('form',{name:'Advertisement filters'})).toHaveAttribute('method','get');
 });
 it('retries unavailable detail, focuses after commit and never substitutes stale/private data',async()=>{
  vi.stubGlobal('requestAnimationFrame',vi.fn());vi.stubGlobal('fetch',vi.fn(async()=>Response.json(item)));
  render(<BoardingDetail id={id} initial={{status:'unavailable'}} />);fireEvent.click(screen.getByRole('button',{name:'Retry advertisement'}));
  await waitFor(()=>expect(screen.getByRole('heading',{name:item.listing.title})).toHaveFocus());
  expect(screen.getByText('No locality, address or exact point is shared.',{exact:false})).toBeVisible();expect(screen.queryByText(/PRIVATE_CANARY/)).not.toBeInTheDocument();
 });
});
