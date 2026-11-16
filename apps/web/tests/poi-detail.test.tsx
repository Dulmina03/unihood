import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { PoiDetail } from '../src/components/places/poi-detail';
import { confirmationRecency, absolutePlaceDate } from '../src/components/places/source-freshness';
import { publicPoiDetail, proxyPoiDetail } from '../src/lib/places/detail';
import { poiDetailHref, poiReturnHref } from '../src/lib/places/links';
import { defaultExploreState } from '../src/lib/explore/query';
const id='40000000-0000-4000-8000-000000000001';
const item={id,kind:'POI' as const,name:'Synthetic Pharmacy',category:{code:'pharmacy',label:'Pharmacy'},location:{lat:0,lng:0},provenance:{dataKind:'SYNTHETIC' as const,sourceLabel:'Synthetic fixture',verifiedAt:null},lastConfirmedAt:null,updatedAt:'2026-11-16T00:00:00Z'};
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('public POI detail adapter and navigation',()=>{
 it('validates identity and projections, never forwarding headers or private errors',async()=>{
  const fetcher=vi.fn<typeof fetch>(async()=>Response.json(item));
  expect((await publicPoiDetail(id,{fetcher})).status).toBe('found');
  expect(fetcher.mock.calls[0][1]).toMatchObject({cache:'no-store',credentials:'omit',redirect:'error',headers:{Accept:'application/json'}});
  for(const data of [{...item,id:'40000000-0000-4000-8000-000000000002'},{...item,kind:'BOARDING'},{...item,privateAddress:'PRIVATE_CANARY'},{...item,updatedAt:'bad'}])expect((await publicPoiDetail(id,{fetcher:vi.fn(async()=>Response.json(data))})).status).toBe('unavailable');
  const invalid=vi.fn();expect((await publicPoiDetail('../private',{fetcher:invalid})).status).toBe('missing');expect(invalid).not.toHaveBeenCalled();
  const req=new Request('http://local/api/places/'+id,{headers:{Authorization:'PRIVATE_CANARY'}});
  const failed=await proxyPoiDetail(id,req,{fetcher:vi.fn(async()=>Response.json({private:'PRIVATE_CANARY'},{status:503}))});expect(failed.status).toBe(503);expect(await failed.text()).not.toContain('PRIVATE_CANARY');
  expect((await proxyPoiDetail(id,req,{fetcher:vi.fn(async()=>new Response('',{status:404}))})).status).toBe(404);
  expect((await proxyPoiDetail(id,new Request(req.url+'?lat=0'),{fetcher:invalid})).status).toBe(400);expect(invalid).not.toHaveBeenCalled();
 });
 it('preserves only valid public exploration context',()=>{
  const state={...defaultExploreState,university:'synthetic-demo',campus:'20000000-0000-4000-8000-000000000001',entrance:'30000000-0000-4000-8000-000000000001',category:'essentials' as const,poiCategory:'pharmacy',q:'Synthetic',view:'list' as const};
  const link=poiDetailHref(id,state), values=Object.fromEntries(new URL(link,'http://local').searchParams);
  expect(poiReturnHref(id,values)).toContain('poiCategory=pharmacy');expect(poiReturnHref(id,values)).toContain('place='+id);
  for(const bad of [{...values,returnTo:'https://evil.invalid'},{...values,lat:'0'},{...values,place:[id,id]},{...values,place:'40000000-0000-4000-8000-000000000002'}])expect(poiReturnHref(id,bad)).toBe('/explore');
 });
 it('uses Colombo absolute dates and descriptive recency without an invented expiry policy',()=>{
  expect(absolutePlaceDate(item.updatedAt)).toBe('16 Nov 2026, 05:30');
  expect(confirmationRecency(item.updatedAt,Date.parse('2026-11-18T00:00:00Z'))).toBe('Confirmed 2 days ago');
  expect(confirmationRecency(item.updatedAt,0)).toContain('future');
 });
});
describe('accessible POI detail states',()=>{
 it('labels synthetic/unknown data and offers canonical sharing without context snapshots',async()=>{
  render(<PoiDetail id={id} initial={{status:'found',item}} returnHref="/explore?category=essentials"/>);
  expect(screen.getByRole('heading',{name:item.name})).toBeVisible();expect(screen.getByText('Location confirmation not recorded.')).toBeVisible();expect(screen.getByText(/not a destination to visit/)).toBeVisible();
  expect(screen.getByText(/Record last updated/)).toBeVisible();expect(screen.getByText('Not validated · check before visiting')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Share public place'}));
  const field=screen.getByRole('textbox',{name:'Shareable public place link'}) as HTMLInputElement;expect(field.value).toMatch(new RegExp('/places/'+id+'$'));expect(field.value).not.toContain('entrance=');
  fireEvent.click(screen.getByRole('button',{name:'Close dialog'}));await waitFor(()=>expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
 });
 it('redacts errors, retries actual detail read and restores heading focus',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>Response.json(item)));render(<PoiDetail id={id} initial={{status:'unavailable'}} returnHref="/explore"/>);
  fireEvent.click(screen.getByRole('button',{name:'Retry public place details'}));
  const title=await screen.findByRole('heading',{name:item.name});await waitFor(()=>expect(title).toHaveFocus());
 });
 it('turns a removed result into an honest unavailable state on retry',async()=>{
  vi.stubGlobal('fetch',vi.fn(async()=>new Response('',{status:404})));render(<PoiDetail id={id} initial={{status:'unavailable'}} returnHref="/explore"/>);
  fireEvent.click(screen.getByRole('button',{name:'Retry public place details'}));expect(await screen.findByText('Public place not available')).toBeVisible();
 });
});
