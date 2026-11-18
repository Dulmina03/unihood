import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,fireEvent,render,screen,within} from '@testing-library/react';
import {StructuredReport} from '../src/components/contribute/structured-report';
import {reportEndpoint} from '../src/lib/places/report-endpoint';
const id='40000000-0000-4000-8000-000000000001',endpoint='http://127.0.0.1:3001/api/v1/reports',reportId='44000000-0000-4000-8000-000000000001';
const target={type:'BOARDING' as const,id,title:'Synthetic Boarding Annex'};
const receipt={reportId,outcome:'HELD_REPORT',severity:'P1',status:'HELD',published:false,reporterIdentity:'PROTECTED',appealable:true,dataKind:'SYNTHETIC'};
const status={reportId,reportType:'WRONG_FEE',targetType:'BOARDING',targetId:id,severity:'P1',status:'HELD',publicEffect:'NONE',createdAt:'2026-11-16T00:00:00Z',appeal:null,reporterIdentity:'PROTECTED',dataKind:'SYNTHETIC'};
const appeal={appealId:'45000000-0000-4000-8000-000000000001',reportId,status:'OPEN',outcome:null,published:false,dataKind:'SYNTHETIC'};
afterEach(()=>{cleanup();vi.restoreAllMocks();});
function prepare(){fireEvent.change(screen.getByRole('combobox',{name:'Report type'}),{target:{value:'WRONG_FEE'}});fireEvent.change(screen.getByRole('textbox',{name:'What happened'}),{target:{value:'Synthetic fictional fee mismatch context only.'}});fireEvent.click(screen.getByLabelText(/I acknowledge this is synthetic held input; I am not submitting real private data/));fireEvent.submit(screen.getByRole('form',{name:'Structured report draft'}));}
describe('UNI-044 confidential report UI',()=>{
 it('previews, retries the same key, shows a protected receipt, status and appeal without browser storage',async()=>{
  let attempt=0;const fetch=vi.spyOn(globalThis,'fetch').mockImplementation(async input=>{const url=String(input);if(url.endsWith('/appeal'))return Response.json(appeal);if(url===endpoint+'/'+reportId)return Response.json(status);if(url===endpoint)return ++attempt===1?Response.json({},{status:503}):Response.json(receipt);return Response.json({});});
  const storage=vi.spyOn(Storage.prototype,'setItem');render(<StructuredReport endpoint={endpoint} initialTarget={target}/>);prepare();
  expect(screen.getByRole('heading',{name:'Review before sending.'})).toHaveFocus();expect(within(screen.getByRole('region',{name:'Report preview and outcome'})).getByText(/Synthetic fictional fee mismatch context only/)).toBeVisible();expect(screen.getByText(/canonical severity/i)).toBeVisible();
  fireEvent.click(screen.getByRole('button',{name:'Submit held report'}));expect(await screen.findByRole('alert')).toHaveTextContent('Retry the unchanged');
  fireEvent.click(screen.getByRole('button',{name:'Submit held report'}));expect(await screen.findByRole('heading',{name:'Report received.'})).toHaveFocus();expect(fetch.mock.calls[0][1]?.body).toEqual(fetch.mock.calls[1][1]?.body);
  fireEvent.click(screen.getByRole('button',{name:'Check status'}));expect(await screen.findByText(/public effect: NONE/)).toBeVisible();
  fireEvent.change(screen.getByRole('textbox',{name:'Appeal reason'}),{target:{value:'Synthetic fictional appeal reason only.'}});fireEvent.click(screen.getByLabelText(/I acknowledge this is synthetic held input and not a final legal/));fireEvent.submit(screen.getByRole('form',{name:'Appeal or dispute draft'}));
  expect(await screen.findByText(/Appeal recorded/)).toBeVisible();expect(storage).not.toHaveBeenCalled();
 });
 it('keeps an unavailable simulator or missing target out of the write form',()=>{
  render(<StructuredReport endpoint={null} initialTarget={target}/>);expect(screen.getByText('Reports unavailable here')).toBeVisible();expect(screen.queryByRole('button',{name:'Review report'})).toBeNull();cleanup();
  render(<StructuredReport endpoint={endpoint} initialTarget={null}/>);expect(screen.getByRole('heading',{name:'Choose a public target first.'})).toBeVisible();expect(screen.queryByRole('textbox',{name:'What happened'})).toBeNull();
 });
 it('requires bounded evidence and acknowledgement before enabling review',()=>{render(<StructuredReport endpoint={endpoint} initialTarget={target}/>);expect(screen.getByRole('button',{name:'Review report'})).toBeDisabled();fireEvent.change(screen.getByRole('textbox',{name:'What happened'}),{target:{value:'too short'}});fireEvent.click(screen.getByLabelText(/I acknowledge this is synthetic held input; I am not submitting real private data/));expect(screen.getByRole('button',{name:'Review report'})).toBeDisabled();fireEvent.change(screen.getByRole('textbox',{name:'What happened'}),{target:{value:'Synthetic fictional fee mismatch context only.'}});expect(screen.getByRole('button',{name:'Review report'})).toBeEnabled();});
 it('shows urgent privacy relay guidance without an anonymous API mutation',()=>{render(<StructuredReport endpoint={endpoint} initialTarget={target}/>);expect(screen.getByText('privacy-support@unihood.example')).toBeVisible();expect(screen.getByText(/never accepts anonymous urgent mutations/)).toBeVisible();});
 it('exposes report endpoint only for exact loopback local/test APIs',()=>{expect(reportEndpoint({APP_ENV:'local',API_BASE_URL:'http://127.0.0.1:3001/api/v1'})).toBe(endpoint);for(const env of [{APP_ENV:'production'},{APP_ENV:'staging'},{APP_ENV:'local',API_BASE_URL:'https://example.invalid/api/v1'}])expect(reportEndpoint(env)).toBeNull();});
});
