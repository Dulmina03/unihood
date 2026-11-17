import Link from 'next/link';
import { PublicIdSchema,BoardingUnitQuerySchema } from '@unihood/contracts';
import { notFound } from 'next/navigation';
import { RoomFacts } from '../../../../components/boardings/room-facts';
export const dynamic='force-dynamic';
export const metadata={title:'Public room facts | UniHood',robots:{index:false,follow:false}};
export default async function Page({params,searchParams}:{params:Promise<{id:string}>;searchParams:Promise<Record<string,string|string[]|undefined>>}){const {id}=await params;if(!PublicIdSchema.safeParse(id).success)notFound();const query=await searchParams;const parsed=BoardingUnitQuerySchema.pick({page:true}).safeParse(query);if(!parsed.success)return <main className="owner-main"><h1>Invalid room page</h1><p>This link contains an unsupported request.</p><Link href={`/boardings/${id.toLowerCase()}/rooms`}>Reset room page</Link></main>;return <RoomFacts id={id.toLowerCase()} page={Number(parsed.data.page??1)}/>;}
