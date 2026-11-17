import { BoardingAdvertisementQuerySchema,type BoardingAdvertisementQuery } from '@unihood/contracts';
export function boardingQuery(params:URLSearchParams,form=false):BoardingAdvertisementQuery {
 const values:Record<string,string>=Object.create(null);
 for(const [key,value] of params){if(params.getAll(key).length!==1)throw new Error('Invalid filters');values[key]=value;}
 if(form)for(const key of ['q','publisherKind','visibility','sort'])if(values[key]==='')delete values[key];
 return BoardingAdvertisementQuerySchema.parse(values);
}
export function advertisementsHref(query:BoardingAdvertisementQuery={}){
 const valid=BoardingAdvertisementQuerySchema.parse(query),params=new URLSearchParams();
 for(const key of ['q','publisherKind','visibility','sort','page','pageSize'] as const)if(valid[key])params.set(key,valid[key]);
 return '/advertisements'+(params.size?'?'+params.toString():'');
}
