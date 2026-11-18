import {afterEach,describe,it,expect,vi} from 'vitest';
import {cleanup,render,screen} from '@testing-library/react';
import {ContributionHistory} from '../src/components/contribute/contribution-history';
const endpoint='http://127.0.0.1:3001/api/v1/contributions';
const item={id:'40000000-0000-4000-8000-000000000001',kind:'POI_PROPOSAL',state:'HELD',createdAt:'2026-11-18T00:00:00Z',placeId:null,dataKind:'SYNTHETIC',riskDecision:'HOLD',riskLevel:'ELEVATED',riskRuleVersion:'risk-rules-v1',riskReasons:['RR-018-PUBLICATION-GATE-CLOSED'],riskExplanation:'Routine publication stays disabled until final identity and public-write gates pass.'};
const page={items:[item],page:{page:1,pageSize:20,hasNextPage:false}};
afterEach(()=>{cleanup();vi.restoreAllMocks();});
describe('UNI-045 explainable risk history UI',()=>{
 it('shows the safe versioned decision and explanation without a score or private signal',async()=>{
  vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json(page));
  const {container}=render(<ContributionHistory endpoint={endpoint}/>);
  expect(await screen.findByText('Held by risk rules')).toBeVisible();
  expect(screen.getByText(/publication stays disabled/i)).toBeVisible();
  expect(screen.getByText(/risk-rules-v1/)).toBeVisible();
  expect(container.textContent).not.toMatch(/score|reporter|fingerprint|PRIVATE_CANARY/i);
 });
 it('rejects unknown rule identifiers instead of rendering untrusted history',async()=>{
  vi.spyOn(globalThis,'fetch').mockImplementation(async()=>Response.json({...page,items:[{...item,riskReasons:['RR-999-UNKNOWN']}]}));
  render(<ContributionHistory endpoint={endpoint}/>);
  expect(await screen.findByRole('alert')).toHaveTextContent(/Retry/i);
 });
});
