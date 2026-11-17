import { notFound } from 'next/navigation';
import { PublicIdSchema } from '@unihood/contracts';
import { OwnerInventoryTools } from '../../../../../components/owner/inventory';
import { ownerDraftEndpoint,ownerProperty } from '../../../../../lib/owner/draft';
export const dynamic='force-dynamic';
export const metadata={title:'Synthetic owner availability | UniHood',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!PublicIdSchema.safeParse(id).success)notFound();return <OwnerInventoryTools mode="availability" endpoint={id.toLowerCase()===ownerProperty?ownerDraftEndpoint(process.env)?.replace(/draft-check$/,'inventory')??null:null}/>;}
