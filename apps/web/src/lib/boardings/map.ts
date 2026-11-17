import { BoardingMapPageSchema,BoardingMapQuerySchema,ErrorResponseSchema } from '@unihood/contracts';
export async function proxyBoardingMap(request:Request){
 const requestId=crypto.randomUUID(),headers={'Cache-Control':'no-store','X-Request-Id':requestId};
 const params=new URL(request.url).searchParams;
 const input=BoardingMapQuerySchema.safeParse(Object.fromEntries(params));
 if(!input.success||Array.from(params.keys()).some(k=>params.getAll(k).length>1))return Response.json(ErrorResponseSchema.parse({error:{code:'VALIDATION_FAILED',message:'The public map request is invalid.',details:[],requestId}}),{status:400,headers});
 try{
  const base=new URL(process.env.API_BASE_URL??process.env.NEXT_PUBLIC_API_URL??'http://127.0.0.1:3001/api/v1');
  if(!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash)throw new Error();
  const url=new URL(base.pathname.replace(/\/$/,'')+'/boardings/map',base.origin);url.search=new URLSearchParams(input.data).toString();
  const response=await fetch(url,{cache:'no-store',credentials:'omit',redirect:'error',signal:AbortSignal.timeout(3500)});if(!response.ok)throw new Error();
  const page=BoardingMapPageSchema.parse(await response.json());if(page.page.page!==Number(input.data.page??1)||page.page.pageSize!==Number(input.data.pageSize??20))throw new Error();
  return Response.json(page,{headers});
 }catch{return Response.json(ErrorResponseSchema.parse({error:{code:'SERVICE_UNAVAILABLE',message:'Public boarding map data is temporarily unavailable.',details:[],requestId}}),{status:503,headers});}
}
