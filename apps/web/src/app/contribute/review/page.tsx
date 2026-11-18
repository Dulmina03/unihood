import {PublicIdSchema} from '@unihood/contracts';
import {StructuredReview} from '../../../components/contribute/structured-review';
import {contributionEndpoint} from '../../../lib/places/correction-endpoint';
export const dynamic='force-dynamic';
export const metadata={title:'Share a structured observation | UniHood',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams;const type=query.type;const id=query.id;
 const keys=Object.keys(query);
 const target=keys.length===2&&typeof type==='string'&&typeof id==='string'&&(type==='BOARDING'||type==='POI')&&PublicIdSchema.safeParse(id).success?{kind:type as 'BOARDING'|'POI',id:id.toLowerCase(),title:'Public target',visibility:'PUBLIC_MAP' as const}:null;
 return <StructuredReview endpoint={contributionEndpoint(process.env)} initialTarget={target}/>;
}
