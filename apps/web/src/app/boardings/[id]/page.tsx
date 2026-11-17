import { notFound } from 'next/navigation';
import { PublicIdSchema } from '@unihood/contracts';
import { boardingData } from '../../../lib/boardings/api';
import { BoardingDetail } from '../../../components/boardings/boarding-detail';
export const dynamic='force-dynamic';
export const metadata={title:'Boarding advertisement | UniHood',robots:{index:false,follow:false}};
export default async function Page({params}:{params:Promise<{id:string}>}){
 const id=(await params).id.toLowerCase();if(!PublicIdSchema.safeParse(id).success)notFound();
 const initial=await boardingData(id);if(initial.status==='missing')notFound();
 return <BoardingDetail key={id} id={id} initial={initial} />;
}
