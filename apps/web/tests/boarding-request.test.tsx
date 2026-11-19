import {afterEach,describe,expect,it,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,waitFor,within} from '@testing-library/react';
import {BoardingRequestActions} from '../src/components/boardings/boarding-request-actions';

const boardingId='00000000-0000-4000-8000-000000000001',requestId='46000000-0000-4000-8000-000000000001',endpoint='http://127.0.0.1:3001/api/v1/boarding-requests';
const receipt={requestId,boardingId,kind:'CONTACT_OWNER',status:'MOCK_PENDING',policyVersion:'boarding-request-mock-v1',synthetic:true,ownerNotified:false,locationDisclosed:false,duplicate:false,dataKind:'SYNTHETIC',createdAt:'2026-11-19T00:00:00Z'};
const status={...receipt};delete (status as {duplicate?:boolean}).duplicate;
afterEach(()=>{cleanup();vi.restoreAllMocks();});

describe('UNI-046 contact and location request UI',()=>{
 it('retries the unchanged contact request, shows a mock receipt and checks pending status without storage',async()=>{
  let attempt=0;const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{
   const url=String(input);
   if(url===endpoint)return ++attempt===1?Response.json({},{status:503}):Response.json(receipt);
   if(url===endpoint+'/'+requestId)return Response.json(status);
   return Response.json({},{status:500});
  });
  const storage=vi.spyOn(Storage.prototype,'setItem');
  render(<BoardingRequestActions endpoint={endpoint} boardingId={boardingId} contactAvailable locationRequestAvailable />);
  fireEvent.click(screen.getByRole('button',{name:/Contact owner/}));
  const dialog=screen.getByRole('dialog');
  expect(within(dialog).getByText(/local simulation. No message is delivered/i)).toBeVisible();
  expect(within(dialog).getByRole('button',{name:'Send mock contact request'})).toBeDisabled();
  fireEvent.click(within(dialog).getByLabelText(/I acknowledge this is a simulated request/));
  fireEvent.click(within(dialog).getByRole('button',{name:'Send mock contact request'}));
  expect(await within(dialog).findByRole('alert')).toHaveTextContent('Nothing was sent');
  fireEvent.click(within(dialog).getByRole('button',{name:'Retry mock request'}));
  const heading=await within(dialog).findByRole('heading',{name:'Mock contact request pending.'});
  await waitFor(()=>expect(heading).toHaveFocus());
  expect(within(dialog).getByText(requestId)).toBeVisible();
  expect(within(dialog).getAllByText('No')).toHaveLength(2);
  expect(within(dialog).getByText(/not delivered/i)).toBeTruthy();
  expect(fetch.mock.calls[0][1]?.body).toEqual(fetch.mock.calls[1][1]?.body);
  expect(String(fetch.mock.calls[0][1]?.body)).not.toMatch(/phone|email|latitude|longitude|visibility/);
  fireEvent.click(within(dialog).getByRole('button',{name:'Check mock status'}));
  expect(await within(dialog).findByText(/Latest mock status/)).toHaveTextContent('MOCK_PENDING');
  expect(storage).not.toHaveBeenCalled();
  expect(dialog.textContent).not.toMatch(/\+12025550100|555-0100|latitude|longitude/);
 });
 it('submits a separate location request without coordinates or disclosure claims',async()=>{
  const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({...receipt,kind:'REQUEST_LOCATION'}));
  render(<BoardingRequestActions endpoint={endpoint} boardingId={boardingId} contactAvailable locationRequestAvailable />);
  fireEvent.click(screen.getByRole('button',{name:/Request location/}));
  const dialog=screen.getByRole('dialog');
  expect(within(dialog).getByText(/does not notify the owner, disclose coordinates/i)).toBeVisible();
  fireEvent.click(within(dialog).getByLabelText(/I acknowledge this is a simulated request/));
  fireEvent.click(within(dialog).getByRole('button',{name:'Send mock location request'}));
  expect(await within(dialog).findByRole('heading',{name:'Mock location request pending.'})).toBeVisible();
  expect(within(dialog).getByText(/Location disclosed/)).toBeVisible();
  expect(await fetch.mock.results.at(-1)?.value).toBeDefined();
 });
 it('explains duplicate prevention and keeps an unavailable simulator out of the form',async()=>{
  vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({...receipt,duplicate:true}));
  render(<BoardingRequestActions endpoint={endpoint} boardingId={boardingId} contactAvailable locationRequestAvailable={false} />);
  expect(screen.queryByRole('button',{name:/Request location/})).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/Contact owner/}));
  const dialog=screen.getByRole('dialog');
  fireEvent.click(within(dialog).getByLabelText(/I acknowledge this is a simulated request/));
  fireEvent.click(within(dialog).getByRole('button',{name:'Send mock contact request'}));
  expect(await within(dialog).findByText(/already pending. No duplicate/)).toBeVisible();
  cleanup();
  render(<BoardingRequestActions endpoint={null} boardingId={boardingId} contactAvailable locationRequestAvailable />);
  expect(screen.getByText('Request simulator unavailable')).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:/Contact owner/}));
  expect(screen.getByRole('dialog')).toBeVisible();
  expect(screen.queryByRole('button',{name:'Send mock contact request'})?.hasAttribute('disabled')).toBe(true);
 });
 it('renders no owner actions for ineligible advertisements',()=>{
  const {container}=render(<BoardingRequestActions endpoint={endpoint} boardingId={boardingId} contactAvailable={false} locationRequestAvailable={false} />);
  expect(container.innerHTML).toBe('');
 });
});
