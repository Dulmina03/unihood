import { act,cleanup,renderHook,waitFor } from '@testing-library/react';
import { afterEach,describe,expect,it,vi } from 'vitest';
import { publicBoardings } from '../src/lib/maps/points';
import { useBoardingMap } from '../src/lib/boardings/use-map';
import { parseExploreQuery,exploreHref } from '../src/lib/explore/query';
const id='00000000-0000-4000-8000-000000000001';
const pin={id,kind:'BOARDING',title:'Synthetic Owner Courtyard',visibility:'PUBLIC_MAP',publisherKind:'OWNER_OFFICIAL',ownerVerified:true,publicMapConsent:true,entrance:{lat:0,lng:0},locationLabel:null,price:null,vacancy:{status:'UNKNOWN',confirmedAt:null,expiresAt:null},provenance:{dataKind:'SYNTHETIC',sourceLabel:'Fictional fixture',verifiedAt:null}};
const page=(items:unknown[])=>({items,page:{page:1,pageSize:20,hasNextPage:false}});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('live consented map client',()=>{
 it('validates map points and URL selection without accepting private modes, geometry parameters or duplicate identities',()=>{expect(publicBoardings([pin,pin,{...pin,visibility:'HIDDEN'},{...pin,publicMapConsent:false}])).toHaveLength(1);const href=exploreHref({university:'synthetic-demo',campus:'20000000-0000-4000-8000-000000000001',category:'boardings',boarding:id});expect(parseExploreQuery(new URLSearchParams(href.split('?')[1])).valid).toBe(true);for(const query of ['boarding='+id,'category=essentials&boarding='+id,'lat=42&boarding='+id])expect(parseExploreQuery(new URLSearchParams(query)).valid).toBe(false);});
 it('clears old points while focus revalidates and after revocation or network failure, ignoring late responses',async()=>{
  let resolve!: (r:Response)=>void;const fetcher=vi.fn<typeof fetch>().mockResolvedValueOnce(Response.json(page([pin]))).mockImplementationOnce(()=>new Promise(r=>{resolve=r;})).mockResolvedValueOnce(Response.json(page([]))).mockRejectedValueOnce(new Error('PRIVATE_CANARY'));vi.stubGlobal('fetch',fetcher);
  const view=renderHook(()=>useBoardingMap(true,'','1'));await waitFor(()=>expect(view.result.current.data?.items).toHaveLength(1));act(()=>window.dispatchEvent(new Event('focus')));await waitFor(()=>expect(resolve).toBeDefined());expect(view.result.current.data).toBeUndefined();
  act(()=>view.result.current.retry());await waitFor(()=>expect(view.result.current.data?.items).toHaveLength(0));await act(async()=>resolve(Response.json(page([pin]))));expect(view.result.current.data?.items).toHaveLength(0);
  act(()=>window.dispatchEvent(new Event('offline')));await waitFor(()=>expect(view.result.current.failed).toBe(true));expect(view.result.current.data).toBeUndefined();expect(fetcher.mock.calls.every(([,init])=>init?.cache==='no-store'&&init.credentials==='omit')).toBe(true);
 });
});
