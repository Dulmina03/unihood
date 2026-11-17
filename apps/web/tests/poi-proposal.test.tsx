import { afterEach,it,expect,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { PublicPoiProposal } from '../src/components/contribute/public-poi-proposal';
const empty={checkOnly:true,policyVersion:'public-poi-v1',scope:'PUBLIC_POI_ONLY',candidates:[],requiresReview:true,incomplete:false,hasMore:false};
const receipt={outcome:'PENDING_REVIEW',proposalId:'59000000-0000-4000-8000-000000000001',requiresReview:true,reviewState:'PENDING'};
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
function example(){fireEvent.click(screen.getByRole('button',{name:'Use synthetic draft example'}));fireEvent.click(screen.getByRole('checkbox',{name:/This draft describes/}));}
async function choose(){fireEvent.click(screen.getByRole('button',{name:'Check possible matches'}));await screen.findByRole('radio',{name:/Propose a distinct/});fireEvent.click(screen.getByRole('radio',{name:/Propose a distinct/}));fireEvent.change(screen.getByRole('textbox',{name:'Public business distinction'}),{target:{value:'Separate fictional public business entrance'}});}
it('keeps drafts out of storage/URLs and focuses the committed heading without animation frames',async()=>{
 vi.stubGlobal('requestAnimationFrame',vi.fn(()=>1));
 const stored=vi.spyOn(Storage.prototype,'setItem');const fetcher=vi.fn<typeof fetch>(async url=>Response.json(String(url).endsWith('/duplicates/check')?empty:receipt));vi.stubGlobal('fetch',fetcher);
 render(<PublicPoiProposal endpoint="http://127.0.0.1:3001/api/v1/duplicates/check" provider={{kind:'missing'}}/>);example();await choose();fireEvent.click(screen.getByRole('button',{name:'Submit for review'}));const title=await screen.findByRole('heading',{name:'3. Pending review'});await waitFor(()=>expect(title).toHaveFocus());expect(screen.getByText('Synthetic · not published')).toBeVisible();expect(stored).not.toHaveBeenCalled();
 const sent=JSON.parse(fetcher.mock.calls[1][1]?.body as string);expect(sent.publicBusinessConfirmed).toBe(true);expect(sent).not.toHaveProperty('actorId');expect(sent).not.toHaveProperty('source');
});
it('retries an unchanged failed submission with the exact same key/body and redacts errors',async()=>{
 const bodies:string[]=[];let attempts=0;vi.stubGlobal('fetch',vi.fn(async(url,options)=>{if(String(url).endsWith('/duplicates/check'))return Response.json(empty);bodies.push(options.body);return ++attempts===1?Response.json({private:'PRIVATE_CANARY'},{status:503}):Response.json({...receipt,reviewState:'NEEDS_EVIDENCE'});}));
 render(<PublicPoiProposal endpoint="http://127.0.0.1:3001/api/v1/duplicates/check" provider={{kind:'missing'}}/>);example();await choose();fireEvent.click(screen.getByRole('button',{name:'Submit for review'}));expect(await screen.findByRole('alert')).not.toHaveTextContent('PRIVATE_CANARY');fireEvent.click(screen.getByRole('button',{name:'Submit for review'}));expect(await screen.findByRole('heading',{name:'3. Needs evidence'})).toBeVisible();expect(bodies).toHaveLength(2);expect(bodies[0]).toBe(bodies[1]);
});
it('offers meaningful coordinate adjustment and clearing without a provider',()=>{
 render(<PublicPoiProposal endpoint="http://127.0.0.1:3001/api/v1/duplicates/check" provider={{kind:'missing'}}/>);example();fireEvent.click(screen.getByRole('button',{name:'Move entrance north'}));expect(screen.getByLabelText(/Public entrance latitude/)).toHaveValue('0.0001');expect(screen.getByText(/Map preview unavailable/)).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Clear unsent draft'}));expect(screen.getByLabelText(/Public business name/)).toHaveValue('');
});
it('preserves browsing when guarded proposals are unavailable',()=>{render(<PublicPoiProposal endpoint={null} provider={{kind:'missing'}}/>);expect(screen.getByText('Proposals are unavailable')).toBeVisible();expect(screen.queryByRole('button',{name:'Submit for review'})).not.toBeInTheDocument();expect(screen.getByRole('link',{name:/Back to public exploration/})).toHaveAttribute('href','/explore');});
