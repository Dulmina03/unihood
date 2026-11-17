import { BoardingAdvertisementQuerySchema,BoardingAdvertisementPageSchema,PublicIdSchema,parseBoardingAdvertisement,ErrorResponseSchema,type BoardingAdvertisementQuery,type PublicBoardingAdvertisement } from '@unihood/contracts';
import { boardingQuery,advertisementsHref } from './query';
export type AdvertisementPage=ReturnType<typeof BoardingAdvertisementPageSchema.parse>;
export type BoardingResult<T>={status:'found';data:T}|{status:'unavailable'|'missing'};
export async function boardingData(id:string|undefined,query:BoardingAdvertisementQuery={},options:{baseUrl?:string;fetcher?:typeof fetch}={}):Promise<BoardingResult<AdvertisementPage|PublicBoardingAdvertisement>>{
 if(id&&!PublicIdSchema.safeParse(id).success)return {status:'missing'};
 if(id)id=id.toLowerCase();
 try{
  const valid=BoardingAdvertisementQuerySchema.parse(query);
  const base=new URL(options.baseUrl??process.env.API_BASE_URL??process.env.NEXT_PUBLIC_API_URL??'http://127.0.0.1:3001/api/v1');
  if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash)throw new Error();
  const url=new URL(base.pathname.replace(/\/$/,'')+'/boardings'+(id?'/'+id:''),base.origin);
  if(!id)url.search=advertisementsHref(valid).split('?')[1]??'';
  const r=await (options.fetcher??fetch)(url,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(3500),headers:{Accept:'application/json'}});
  if(id&&r.status===404)return {status:'missing'};if(!r.ok)throw new Error();
  const raw=await r.json();
  if(id){const data=parseBoardingAdvertisement(raw);if(data.listing.id!==id)throw new Error();return {status:'found',data};}
  const data=BoardingAdvertisementPageSchema.parse(raw);
  if(data.page.page!==Number(valid.page??1)||data.page.pageSize!==Number(valid.pageSize??12))throw new Error();
  data.items=data.items.map(x=>parseBoardingAdvertisement(x));
  if(data.items.some(x=>(valid.publisherKind&&x.listing.publisherKind!==valid.publisherKind)||(valid.visibility&&x.listing.visibility!==valid.visibility)))throw new Error();
  return {status:'found',data};
 }catch{return {status:'unavailable'};}
}
export async function proxyBoardings(request:Request,id?:string){
 const requestId=crypto.randomUUID(),headers={'Cache-Control':'no-store','X-Request-Id':requestId};let query:BoardingAdvertisementQuery;
 try{const params=new URL(request.url).searchParams;if(id&&(!PublicIdSchema.safeParse(id).success||params.size))throw new Error();query=boardingQuery(params);}
 catch{return Response.json(ErrorResponseSchema.parse({error:{code:'VALIDATION_FAILED',message:'The advertisement request is invalid.',details:[],requestId}}),{status:400,headers});}
 const result=await boardingData(id,query);
 if(result.status==='found')return Response.json(result.data,{headers});
 const missing=result.status==='missing';
 return Response.json(ErrorResponseSchema.parse({error:{code:missing?'NOT_FOUND':'SERVICE_UNAVAILABLE',message:missing?'This advertisement is unavailable.':'Advertisements are temporarily unavailable.',details:[],requestId}}),{status:missing?404:503,headers});
}
