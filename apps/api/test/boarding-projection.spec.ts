import { projectBoardingPublic,type BoardingProjectionFacts } from '../src/boardings/public-projection';
const base:BoardingProjectionFacts={id:'00000000-0000-4000-8000-000000000001',title:'Synthetic curated preview',publisherKind:'OWNER_OFFICIAL',visibility:'HIDDEN',dataKind:'SYNTHETIC',authorizationStatus:'LOCAL_TEST_AUTHORIZED',localityConsent:false,locality:null,publicMapConsent:false};
describe('server visibility whitelist',()=>{
 it.each(['OWNER_OFFICIAL','COMMUNITY_RECOMMENDATION'])('never reads location getters for private %s modes',publisherKind=>{
  for(const visibility of ['HIDDEN','AREA_ONLY']){const input={...base,publisherKind,visibility,localityConsent:true,locality:'Synthetic broad quarter'};Object.defineProperty(input,'publicEntrance',{get(){throw Error('PRIVATE_COORDINATE_CANARY');}});Object.defineProperty(input,'privateLocation',{get(){throw Error('PRIVATE_LOCATION_CANARY');}});
   const out=projectBoardingPublic(input)!;expect(out.entrance).toBeNull();expect(out).toMatchObject({distanceMeters:null,route:null});expect(out.locationLabel).toBe(visibility==='HIDDEN'?null:'Synthetic broad quarter');expect(JSON.stringify(out)).not.toMatch(/CANARY|privateLocation|publicEntrance/);
  }
 });
 it('allows only current synthetic authorized owner consent and an explicitly selected valid entrance',()=>{
  const publicFacts:BoardingProjectionFacts={...base,visibility:'PUBLIC_MAP',publicMapConsent:true,publicEntrance:{boardingId:base.id,purpose:'OWNER_SELECTED_PUBLIC_ENTRANCE',lat:0,lng:0}};
  expect(projectBoardingPublic(publicFacts)).toMatchObject({visibility:'PUBLIC_MAP',publicMapConsent:true,entrance:{lat:0,lng:0}});
  for(const changes of [{publisherKind:'COMMUNITY_RECOMMENDATION'},{authorizationStatus:'UNVERIFIED'},{authorizationStatus:'DISPUTED'},{publicMapConsent:false},{publicEntrance:null},{publicEntrance:{boardingId:base.id,purpose:'PRIVATE_VERIFICATION',lat:0,lng:0}},{publicEntrance:{boardingId:base.id,purpose:'OWNER_SELECTED_PUBLIC_ENTRANCE',lat:91,lng:0}},{dataKind:'VERIFIED'},{publicEntrance:{boardingId:'00000000-0000-4000-8000-000000000002',purpose:'OWNER_SELECTED_PUBLIC_ENTRANCE',lat:0,lng:0}}])expect(projectBoardingPublic({...publicFacts,...changes} as BoardingProjectionFacts)).toBeNull();
 });
 it('requires explicit locality consent, denies unknown modes and never forwards official/private extras',()=>{
  expect(projectBoardingPublic({...base,visibility:'AREA_ONLY',locality:'Synthetic broad quarter'})).toBeNull();expect(projectBoardingPublic({...base,visibility:'invalid'})).toBeNull();
  const value=projectBoardingPublic({...base,price:{rentMonthly:999},vacancy:{status:'AVAILABLE'},privateAddress:'PRIVATE_CANARY'} as BoardingProjectionFacts)!;
  expect(value.price).toBeNull();expect(value.vacancy.status).toBe('UNKNOWN');expect(JSON.stringify(value)).not.toContain('PRIVATE_CANARY');
 });
});
