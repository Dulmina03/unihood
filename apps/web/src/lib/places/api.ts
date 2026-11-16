import { PoiListQuerySchema, PoiCategoryQuerySchema, PoiPageSchema, PoiCategoryPageSchema, poiBounds, ErrorResponseSchema } from '@unihood/contracts';
export async function proxyPlaces(resource: 'places' | 'place-categories', request: Request, options: {baseUrl?:string;fetcher?:typeof fetch} = {}) {
  const requestId = crypto.randomUUID(), headers = {'Cache-Control':'no-store','X-Request-Id':requestId};
  let invalid = false;
  try {
    const params = new URL(request.url).searchParams, values:Record<string,string> = Object.create(null);
    for (const [key,value] of params) {if (Object.hasOwn(values,key)) {invalid=true;throw new Error();} values[key]=value;}
    const parsed = (resource==='places'?PoiListQuerySchema:PoiCategoryQuerySchema).safeParse(values);
    if (!parsed.success) {invalid=true;throw new Error();}
    const base = new URL(options.baseUrl??process.env.API_BASE_URL??process.env.NEXT_PUBLIC_API_URL??'http://127.0.0.1:3001/api/v1');
    if (!['http:','https:'].includes(base.protocol)||base.username||base.password||base.search||base.hash) throw new Error();
    const url=new URL(`${base.pathname.replace(/\/$/,'')}/${resource}`,base.origin);
    for(const [key,value] of Object.entries(parsed.data))if(value!==undefined)url.searchParams.set(key,value);
    const response=await(options.fetcher??fetch)(url,{cache:'no-store',redirect:'error',credentials:'omit',signal:AbortSignal.timeout(3500),headers:{Accept:'application/json'}});
    if(!response.ok)throw new Error();
    const data=resource==='places'?PoiPageSchema.parse(await response.json()):PoiCategoryPageSchema.parse(await response.json());
    if(resource==='places'){
      if(data.page.page!==Number(values.page??1)||data.page.pageSize!==Number(values.pageSize??20))throw new Error();
      const [west,south,east,north]=poiBounds(values.bbox)!;
      if(data.items.some(item=>!('location' in item)||item.location.lng<west||item.location.lng>east||item.location.lat<south||item.location.lat>north||Boolean(values.category&&(!('category' in item)||item.category.code!==values.category))))throw new Error();
    }else if(data.page.page!==1||data.page.pageSize!==100)throw new Error();
    return Response.json(data,{headers});
  } catch {
    return Response.json(ErrorResponseSchema.parse({error:{code:invalid?'VALIDATION_FAILED':'SERVICE_UNAVAILABLE',message:invalid?'The public place query is invalid.':'Public places are temporarily unavailable.',details:[],requestId}}),{status:invalid?400:503,headers});
  }
}
