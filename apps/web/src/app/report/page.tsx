import {PublicIdSchema} from '@unihood/contracts';
import {StructuredReport} from '../../components/contribute/structured-report';
import {reportEndpoint} from '../../lib/places/report-endpoint';
export const dynamic='force-dynamic';
export const metadata={title:'Report an issue | UniHood',robots:{index:false,follow:false}};
const targetTypes=['BOARDING','POI','MEDIA','ROUTE_SEGMENT'] as const;
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams,type=query.type,id=query.id,keys=Object.keys(query);
 const target=keys.length===2&&typeof type==='string'&&typeof id==='string'&&targetTypes.includes(type as typeof targetTypes[number])&&PublicIdSchema.safeParse(id).success?{type:type as typeof targetTypes[number],id:id.toLowerCase(),title:'Public target'}:null;
 return <StructuredReport endpoint={reportEndpoint(process.env)} initialTarget={target}/>;
}
