import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardingRecommendation } from '../src/components/contribute/boarding-recommendation';
const endpoint='http://127.0.0.1:3001/api/v1/contributions/boarding';
const id='71000000-0000-4000-8000-000000000141';
const candidate={boardingId:id,title:'Synthetic Existing Study Annex',publisherKind:'OWNER_OFFICIAL',visibility:'HIDDEN',locality:null,nameScore:90,dataKind:'SYNTHETIC'};
const matches={policyVersion:'boarding-ad-text-v1',candidates:[candidate],hasMore:false,incomplete:false,requiresReview:true};
const receipt={contributionId:'40000000-0000-4000-8000-000000000041',outcome:'HELD_RECOMMENDATION',reviewState:'PENDING',publisherKind:'COMMUNITY_RECOMMENDATION',dataKind:'SYNTHETIC',published:false,resolution:'ATTACHED_FOR_REVIEW',canonicalBoardingId:id};
afterEach(()=>{cleanup();vi.restoreAllMocks();});
function prepare(){fireEvent.click(screen.getByRole('button',{name:'Use synthetic example'}));fireEvent.click(screen.getByLabelText(/I have permission/));fireEvent.click(screen.getByLabelText(/I understand the separate photo/));fireEvent.click(screen.getByRole('button',{name:'Review recommendation'}));}
describe('UNI-041 held canonical suggestion choices',()=>{
 it('shows public source/privacy labels and attaches only the explicit selected canonical ID',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async url=>({ok:true,json:async()=>String(url).endsWith('/duplicates')?matches:receipt} as Response));const storage=vi.spyOn(Storage.prototype,'setItem');
  render(<BoardingRecommendation endpoint={endpoint}/>);prepare();
  fireEvent.click(await screen.findByRole('radio',{name:'Suggest information about Synthetic Existing Study Annex'}));
  expect(screen.getByText('Owner-posted · synthetic authority only')).toBeInTheDocument();expect(screen.getByText('Location not shared')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button',{name:'Submit held recommendation'}));
  expect(await screen.findByRole('link',{name:'View the current public advertisement'})).toHaveAttribute('href','/boardings/'+id);
  const sent=fetch.mock.calls.filter(([url])=>String(url).endsWith('/resolve'));expect(sent).toHaveLength(1);expect(JSON.parse(String(sent[0][1]?.body)).resolution).toEqual({kind:'EXISTING',boardingId:id});expect(storage).not.toHaveBeenCalled();
 });
 it('keeps invalid/private candidate payloads out of the UI and provides a real matching retry',async()=>{
  let attempt=0;vi.spyOn(globalThis,'fetch').mockImplementation(async()=>({ok:true,json:async()=>++attempt===1?{...matches,candidates:[{...candidate,locality:'PRIVATE_LOCALITY_CANARY',entrance:{lat:42.123456,lng:43.654321}}]}:matches} as Response));
  const {container}=render(<BoardingRecommendation endpoint={endpoint}/>);prepare();expect(await screen.findByRole('alert')).toHaveTextContent('Retry matching');expect(container.innerHTML).not.toMatch(/PRIVATE_LOCALITY_CANARY|42\.123456|43\.654321/);
  fireEvent.click(screen.getByRole('button',{name:'Retry public matches'}));expect(await screen.findByRole('radio',{name:'Suggest information about Synthetic Existing Study Annex'})).toBeInTheDocument();
 });
 it('handles source drift with recheck rather than silently selecting a different identity',async()=>{
  let checks=0;vi.spyOn(globalThis,'fetch').mockImplementation(async url=>String(url).endsWith('/duplicates')?({ok:true,json:async()=>++checks===1?matches:{...matches,candidates:[]}} as Response):({ok:false,status:409} as Response));
  render(<BoardingRecommendation endpoint={endpoint}/>);prepare();fireEvent.click(await screen.findByRole('radio',{name:'Suggest information about Synthetic Existing Study Annex'}));fireEvent.click(screen.getByRole('button',{name:'Submit held recommendation'}));expect(await screen.findByRole('alert')).toHaveTextContent('selection or intent changed');fireEvent.click(screen.getByRole('button',{name:'Retry public matches'}));
  expect(await screen.findByText(/No public advertisement match was returned/)).toBeInTheDocument();expect(screen.queryByRole('radio',{name:'Suggest information about Synthetic Existing Study Annex'})).toBeNull();expect(screen.getByRole('button',{name:'Submit held recommendation'})).toBeDisabled();
 });
 it('discards a late match response after the draft changes',async()=>{
  let release!:(response:Response)=>void;vi.spyOn(globalThis,'fetch').mockImplementation(()=>new Promise(resolve=>{release=resolve;}));
  render(<BoardingRecommendation endpoint={endpoint}/>);prepare();await waitFor(()=>expect(release).toBeDefined());fireEvent.change(screen.getByRole('textbox',{name:/^Recommendation title/}),{target:{value:'Synthetic Different Context'}});release({ok:true,json:async()=>matches} as Response);
  await waitFor(()=>expect(within(screen.getByRole('region',{name:'Recommendation preview and outcome'})).queryByRole('radio')).toBeNull());expect(screen.queryByText(candidate.title)).toBeNull();
 });
});
