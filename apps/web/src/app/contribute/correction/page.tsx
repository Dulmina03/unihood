import {PublicIdSchema} from '@unihood/contracts';
import {publicPoiDetail} from '../../../lib/places/detail';
import {contributionEndpoint} from '../../../lib/places/correction-endpoint';
import {PoiCorrection} from '../../../components/contribute/poi-correction';
export const dynamic='force-dynamic';
export const metadata={title:'Suggest a public place correction | UniHood',robots:{index:false,follow:false}};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams;const value=query.place;
 const id=Object.keys(query).length===1&&typeof value==='string'&&PublicIdSchema.safeParse(value).success?value.toLowerCase():null;
 return <PoiCorrection endpoint={contributionEndpoint(process.env)} id={id} initial={id?await publicPoiDetail(id):{status:'missing'}}/>;
}
