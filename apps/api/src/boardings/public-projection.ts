import { PublicBoardingResponseSchema,type PublicBoardingResponse } from '@unihood/contracts';
// Server-only projection input. Titles/localities come from curated public text,
// never raw property descriptions. Eligibility/current-record SQL and protected
// owner-preview guards remain separate requirements, not facts supplied by users.
export type BoardingProjectionFacts={id:string;title:string;publisherKind:string;visibility:string;dataKind:string;
 authorizationStatus:string;localityConsent:boolean;locality:string|null;publicMapConsent:boolean;
 publicEntrance?:{boardingId:string;purpose:'OWNER_SELECTED_PUBLIC_ENTRANCE';lat:number;lng:number}|null};
export function projectBoardingPublic(facts:BoardingProjectionFacts):PublicBoardingResponse|null{
 if(facts.dataKind!=='SYNTHETIC')return null; // No real-data/production publication authority yet.
 const owner=facts.publisherKind==='OWNER_OFFICIAL';
 if(!owner&&facts.publisherKind!=='COMMUNITY_RECOMMENDATION')return null;
 if(owner&&facts.authorizationStatus!=='LOCAL_TEST_AUTHORIZED')return null;
 const base={id:facts.id,title:facts.title,publisherKind:facts.publisherKind,price:null,vacancy:{status:'UNKNOWN',confirmedAt:null,expiresAt:null},
  ...(owner?{ownerVerified:true}:{disclaimer:'Community-submitted, not owner-verified'})};
 let candidate:unknown;
 if(facts.visibility==='HIDDEN')candidate={...base,visibility:'HIDDEN',locationLabel:null,entrance:null,distanceMeters:null,route:null};
 else if(facts.visibility==='AREA_ONLY'){
  if(facts.localityConsent!==true||!facts.locality)return null;
  candidate={...base,visibility:'AREA_ONLY',locationLabel:facts.locality,entrance:null,distanceMeters:null,route:null};
 }else if(facts.visibility==='PUBLIC_MAP'){
  // Never inspect a public/private point for either private mode, nor substitute
  // a verification location when the explicitly selected public entrance is absent.
  if(!owner||facts.publicMapConsent!==true)return null;
  const entrance=facts.publicEntrance;if(entrance?.purpose!=='OWNER_SELECTED_PUBLIC_ENTRANCE'||entrance.boardingId!==facts.id)return null;
  candidate={...base,visibility:'PUBLIC_MAP',publicMapConsent:true,entrance:{lat:entrance.lat,lng:entrance.lng},locationLabel:facts.localityConsent===true?facts.locality:null};
 }else return null;
 const parsed=PublicBoardingResponseSchema.safeParse(candidate);return parsed.success?parsed.data:null;
}
