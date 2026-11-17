import {notFound} from 'next/navigation';
import {PublicIdSchema} from '@unihood/contracts';
import {OwnerPrivacyTools} from '../../../../../components/owner/privacy-tools';
import {ownerDraftEndpoint,ownerProperty} from '../../../../../lib/owner/draft';
export const dynamic='force-dynamic';
export const metadata={title:'Private synthetic contact | UniHood',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){const {id}=await params;if(!PublicIdSchema.safeParse(id).success)notFound();return <OwnerPrivacyTools mode="contact" endpoint={id.toLowerCase()===ownerProperty?ownerDraftEndpoint(process.env)?.replace(/draft-check$/,'privacy')??null:null}/>;}
