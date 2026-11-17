import { afterEach,expect,it,vi } from 'vitest';
import { cleanup,fireEvent,render,screen,waitFor } from '@testing-library/react';
import { DuplicateReview } from '../src/components/places/duplicate-review';
import { duplicateEndpoint } from '../src/lib/places/duplicate-endpoint';
const id='40000000-0000-4000-8000-000000000001';
const result={policyVersion:'public-poi-v1',scope:'PUBLIC_POI_ONLY',candidates:[{id,name:'Synthetic Pharmacy',category:'pharmacy',score:79,classification:'REVIEW_REQUIRED',signals:{nameSimilarity:1,normalizedNameExact:true,categoryMatch:true,withinRadius:true,sameBuilding:true,sourceMatch:false},requiresReview:true}],hasMore:false,incomplete:false,requiresReview:true,checkOnly:true};
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
function fill(){fireEvent.change(screen.getByLabelText(/Public business name/),{target:{value:'Synthetic Pharmacy'}});fireEvent.change(screen.getByLabelText(/Public entrance latitude/),{target:{value:'0'}});fireEvent.change(screen.getByLabelText(/Public entrance longitude/),{target:{value:'0'}});}
it('validates local endpoint without credentials or production access',()=>{
 expect(duplicateEndpoint({APP_ENV:'local'})).toBe('http://127.0.0.1:3001/api/v1/duplicates/check');
 for(const base of ['https://evil.example/api','http://user:secret@127.0.0.1:3001/api','http://127.0.0.1:3001/api?secret=x'])expect(duplicateEndpoint({APP_ENV:'local',API_BASE_URL:base})).toBeNull();
 expect(duplicateEndpoint({APP_ENV:'production'})).toBeNull();
});
it('prepares distinct/update choices without sending or storing them and clears stale input',async()=>{
 const fetcher=vi.fn<typeof fetch>(async()=>Response.json(result));vi.stubGlobal('fetch',fetcher);const storage=vi.spyOn(Storage.prototype,'setItem');
 render(<DuplicateReview endpoint="http://127.0.0.1:3001/api/v1/duplicates/check"/>);fill();fireEvent.click(screen.getByRole('button',{name:'Check possible matches'}));
 expect(await screen.findByRole('heading',{name:'Review possible matches'})).toBeVisible();await waitFor(()=>expect(screen.getByRole('heading',{name:'Review possible matches'})).toHaveFocus());
 fireEvent.click(screen.getByRole('radio',{name:/Suggest update/}));fireEvent.click(screen.getByRole('button',{name:'Prepare review choice'}));expect(screen.getByText(/No correction has been sent/)).toBeVisible();
 fireEvent.click(screen.getByRole('radio',{name:/Continue as a distinct/}));fireEvent.change(screen.getByRole('textbox',{name:/Why is this/}),{target:{value:'Different public pharmacy unit'}});fireEvent.click(screen.getByRole('button',{name:'Prepare review choice'}));expect(screen.getByText(/Nothing has been created or published/)).toBeVisible();
 expect(fetcher).toHaveBeenCalledTimes(1);expect(storage).not.toHaveBeenCalled();expect(fetcher.mock.calls[0]).toHaveLength(2);
 fireEvent.change(screen.getByLabelText(/Public business name/),{target:{value:'Changed'}});expect(screen.queryByRole('heading',{name:'Review possible matches'})).not.toBeInTheDocument();
});
it.each([401,429,503])('gives sanitized retry guidance on HTTP %s',async status=>{vi.stubGlobal('fetch',vi.fn(async()=>Response.json({private:'PRIVATE_CANARY'},{status})));render(<DuplicateReview endpoint="http://127.0.0.1:3001/api/v1/duplicates/check"/>);fill();fireEvent.click(screen.getByRole('button',{name:'Check possible matches'}));expect(await screen.findByRole('alert')).not.toHaveTextContent('PRIVATE_CANARY');expect(screen.getByRole('alert')).toHaveTextContent(/retry/);});
it('keeps empty and truncated results honest and cancel restores focus',async()=>{
 vi.stubGlobal('fetch',vi.fn(async()=>Response.json({...result,candidates:[],incomplete:true,hasMore:true})));render(<DuplicateReview endpoint="http://127.0.0.1:3001/api/v1/duplicates/check"/>);fill();fireEvent.click(screen.getByRole('button',{name:'Check possible matches'}));expect(await screen.findByText(/not proof that the place is new/)).toBeVisible();expect(screen.getByText('This check is incomplete')).toBeVisible();fireEvent.click(screen.getByRole('button',{name:'Cancel review'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Check possible matches'})).toHaveFocus());
});
it('preserves guest browsing when contribution checks are unavailable',()=>{render(<DuplicateReview endpoint={null}/>);expect(screen.getByText('Contributor checks are unavailable')).toBeVisible();expect(screen.getByRole('link',{name:/Back to public exploration/})).toHaveAttribute('href','/explore');expect(screen.queryByRole('button',{name:'Check possible matches'})).not.toBeInTheDocument();});
