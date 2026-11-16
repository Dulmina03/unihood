import { afterEach,describe,it,expect,vi } from 'vitest';
import { cleanup,render,screen,fireEvent,waitFor } from '@testing-library/react';
const query=vi.hoisted(()=>({value:'university=synthetic-demo&campus=20000000-0000-4000-8000-000000000001&entrance=30000000-0000-4000-8000-000000000001&category=essentials&view=list'}));
vi.mock('next/navigation',()=>({useSearchParams:()=>new URLSearchParams(query.value)}));
import { Explore } from '../src/components/explore/explore';
const provenance={dataKind:'SYNTHETIC',sourceLabel:'Synthetic test fixture',verifiedAt:null};
const uid='10000000-0000-4000-8000-000000000001',cid='20000000-0000-4000-8000-000000000001';
const row={id:'40000000-0000-4000-8000-000000000001',kind:'POI',name:'Synthetic Pharmacy',category:{code:'pharmacy',label:'Pharmacy'},location:{lat:0,lng:0},provenance,lastConfirmedAt:null};
function setup(fail=false){return vi.fn(async(input:RequestInfo|URL)=>{const path=String(input);let items:unknown[]=[];let size=100;
 if(path.startsWith('/api/place-categories'))items=[row.category];
 else if(path.startsWith('/api/places?')){if(fail)return Response.json({private:'PRIVATE_CANARY'},{status:503});items=[row];size=20;}
 else if(path.includes('/campuses'))items=[{id:cid,universityId:uid,name:'Synthetic Campus',publicArea:null,provenance}];
 else if(path.includes('/entrances'))items=[{id:'30000000-0000-4000-8000-000000000001',campusId:cid,name:'Synthetic Gate',location:{lat:0,lng:0},isPrimary:true,provenance}];
 else items=[{id:uid,slug:'synthetic-demo',name:'Synthetic University',city:'Synthetic city',country:'ZZ',provenance}];
 return Response.json({items,page:{page:1,pageSize:size,hasNextPage:false}});
});}
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
describe('public Essentials layer',()=>{
 it('shows labeled public POIs, functional categories/sorting and bounded API reads',async()=>{
  const fetcher=setup();vi.stubGlobal('fetch',fetcher);const push=vi.spyOn(window.history,'pushState');render(<Explore/>);
  expect(await screen.findByRole('heading',{name:'Synthetic Pharmacy'})).toBeVisible();expect(screen.getByText('Synthetic public place')).toBeVisible();
  expect(fetcher.mock.calls.some(([url])=>String(url).includes('bbox=-0.01%2C-0.01%2C0.01%2C0.01'))).toBe(true);
  fireEvent.change(screen.getByRole('combobox',{name:'Service category'}),{target:{value:'pharmacy'}});expect(push.mock.calls.at(-1)?.[2]).toContain('poiCategory=pharmacy');
  fireEvent.change(screen.getByRole('combobox',{name:'Sort public places'}),{target:{value:'newest'}});expect(push.mock.calls.at(-1)?.[2]).toContain('poiSort=newest');
  expect(screen.getByRole('button',{name:'Next places'})).toBeDisabled();expect(screen.getByRole('button',{name:'Previous places'})).toBeDisabled();
 });
 it('redacts failure and preserves a functional retry',async()=>{
  vi.stubGlobal('fetch',setup(true));render(<Explore/>);expect(await screen.findByText('We couldn’t load public places')).toBeVisible();expect(document.body.textContent).not.toContain('PRIVATE_CANARY');
  vi.stubGlobal('fetch',setup());fireEvent.click(screen.getByRole('button',{name:'Retry public places'}));await waitFor(()=>expect(screen.getByRole('heading',{name:'Synthetic Pharmacy'})).toBeVisible());
 });
});
