import { BoardingAdvertisements } from '../../components/boardings/advertisements';
import { boardingData } from '../../lib/boardings/api';
import { boardingQuery,advertisementsHref } from '../../lib/boardings/query';
export const dynamic='force-dynamic';
export const metadata={title:'Boarding advertisements | UniHood',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const params=new URLSearchParams();for(const [k,v] of Object.entries(await searchParams))for(const s of Array.isArray(v)?v:v===undefined?[]:[v])params.append(k,s);
 let query;try{query=boardingQuery(params,true);}catch{/* Do not reflect invalid query values. */}
 if(!query)return <BoardingAdvertisements invalid query={{}} initial={{status:'unavailable'}} />;
 return <BoardingAdvertisements key={advertisementsHref(query)} query={query} initial={await boardingData(undefined,query)} />;
}
