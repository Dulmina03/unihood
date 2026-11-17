import { PoiSubmissionService } from '../src/duplicates/poi-submission.service';
import { SyntheticActors } from '../src/identity/synthetic-actors';
import type { ActorContext } from '@unihood/contracts';
const guest:ActorContext={actorId:null,authStatus:'GUEST',memberships:[]};
const fixture:ActorContext={actorId:'synthetic:contributor',authStatus:'LOCAL_TEST_ACTOR',memberships:[]};
const input={key:'00000000-0000-4000-8000-000000000001',draft:{kind:'POI',name:'Synthetic Pharmacy',category:'pharmacy',location:{lat:0,lng:0}},resolution:{action:'continue_as_distinct_with_reason',reason:'Separate synthetic public business'}};
const request={socket:{remoteAddress:'127.0.0.1',localAddress:'127.0.0.1'},headers:{host:'127.0.0.1:3001'}};
describe('pending intent authorization before transaction access',()=>{
 it('denies guests, forged actor copies and disabled/deployed simulation',async()=>{
  const actors=new SyntheticActors({enabled:true,fixture:'contributor'});let calls=0;
  const repository={includeSynthetic:true,transaction:async<T>():Promise<T>=>{calls++;throw new Error();}};
  const service=new PoiSubmissionService(repository,actors);
  await expect(service.prepare(guest,input)).rejects.toThrow();await expect(service.prepare(fixture,input)).rejects.toThrow();
  const actor=await actors.resolveRequestActor(request);await expect(service.prepare({...actor},input)).rejects.toThrow();
  await expect(new PoiSubmissionService({...repository,includeSynthetic:false},actors).prepare(actor,input)).rejects.toThrow();
  actor.actorId='synthetic:owner-a';await expect(service.prepare(actor,input)).rejects.toThrow();expect(await actors.canSuggestPlace(actor)).toBe(false);expect(calls).toBe(0);
 });
 it('captures the issued namespace and denies identity mutation during permission resolution',async()=>{
  const actor:ActorContext={...fixture};let calls=0;
  const repository={includeSynthetic:true,transaction:async<T>():Promise<T>=>{calls++;throw new Error();}};
  const permissions={canSuggestPlace:async()=>{actor.actorId='synthetic:another-actor';return true;}};
  await expect(new PoiSubmissionService(repository,permissions).prepare(actor,input)).rejects.toThrow();expect(calls).toBe(0);
 });
 it('rejects unsupported input before acquiring a client and rechecks permission on replay',async()=>{
  const actors=new SyntheticActors({enabled:true,fixture:'contributor'});const actor=await actors.resolveRequestActor(request);let calls=0;
  const repository={includeSynthetic:true,transaction:async<T>():Promise<T>=>{calls++;throw new Error();}};
  await expect(new PoiSubmissionService(repository,actors).prepare(actor,{...input,private:'PRIVATE_CANARY'})).rejects.toThrow();expect(calls).toBe(0);
 });
});
