import {RISK_RULE_VERSION,evaluateRisk} from '@unihood/contracts';
import {PUBLIC_WRITES_ENABLED,OBSERVATION_FRESH_DAYS,baseSignals,contentSignals,observedRecently} from '../src/risk/risk-signals';
import {recordRisk} from '../src/risk/risk-evaluation';

const content=contentSignals('Synthetic fictional context only.');
const signals={...baseSignals('POI_PROPOSAL','POI',content),publicationKindEligible:true};

describe('UNI-045 server-derived risk signals',()=>{
 it('keeps routine publication closed until final identity/public-write gates',()=>{
  expect(PUBLIC_WRITES_ENABLED).toBe(false);expect(signals.publicWritesEnabled).toBe(false);
  expect(evaluateRisk(signals).decision).toBe('HOLD');
 });
 it('detects conservative private, contact, residential and ownership signals',()=>{
  expect(contentSignals('Synthetic address near a house number')).toMatchObject({sensitivePrivateText:true});
  expect(contentSignals('Synthetic phone 555-0100')).toMatchObject({contactOrLink:true});
  expect(contentSignals('Synthetic residential bedroom context')).toMatchObject({residentialClaim:true});
  expect(contentSignals('Synthetic I own my property context')).toMatchObject({ownershipClaim:true});
  expect(content).toEqual({sensitivePrivateText:false,contactOrLink:false,residentialClaim:false,ownershipClaim:false});
 });
 it('bounds observation freshness deterministically against the documented window',()=>{
  expect(OBSERVATION_FRESH_DAYS).toBe(30);
  const recent=new Date(Date.now()-86_400_000).toISOString().slice(0,10);
  const stale=new Date(Date.now()-(OBSERVATION_FRESH_DAYS+1)*86_400_000).toISOString().slice(0,10);
  expect(observedRecently(recent)).toBe(true);expect(observedRecently(stale)).toBe(false);expect(observedRecently(null)).toBeNull();
 });
 it('persists only rule ids and fixed explanations inside the caller transaction',async()=>{
  const calls:{sql:string;args:unknown[]}[]=[];
  const value=await recordRisk(async(sql,args)=>{calls.push({sql,args});return sql.includes('to_regclass')?[{name:'unihood_private.risk_evaluations'}]:[];},'POI_PROPOSAL','40000000-0000-4000-8000-000000000001',signals);
  expect(value.ruleVersion).toBe(RISK_RULE_VERSION);expect(value.decision).toBe('HOLD');
  const insert=calls.find(call=>call.sql.includes('INSERT INTO unihood_private.risk_evaluations'))!;expect(insert).toBeDefined();
  expect(insert.args[1]).toBe('POI_PROPOSAL');expect(insert.args[3]).toBe('risk-rules-v1');expect(insert.args[4]).toBe('HOLD');
  expect(JSON.stringify(insert.args)).not.toMatch(/synthetic fictional context|555-0100|address/i);
 });
 it('fails closed when the evaluation cannot be recorded',async()=>{
  await expect(recordRisk(async()=>{throw new Error('database unavailable');},'REVIEW','40000000-0000-4000-8000-000000000001',signals)).rejects.toThrow('database unavailable');
 });
 it('skips persistence without aborting intake when the ordered schema lacks the table',async()=>{
  const calls:string[]=[];const value=await recordRisk(async sql=>{calls.push(sql);return[];},'POI_PROPOSAL','40000000-0000-4000-8000-000000000001',signals);
  expect(value.decision).toBe('HOLD');expect(calls.filter(sql=>sql.includes('INSERT'))).toEqual([]);
 });
});
