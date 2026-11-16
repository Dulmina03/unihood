import { notFound } from 'next/navigation';
import { PublicIdSchema } from '@unihood/contracts';
import { publicPoiDetail } from '../../../lib/places/detail';
import { poiReturnHref } from '../../../lib/places/links';
import { PoiDetail } from '../../../components/places/poi-detail';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Public place | UniHood', robots: {index: false, follow: false}};
export default async function PlacePage({params, searchParams}: {params: Promise<{id: string}>; searchParams: Promise<Record<string, string | string[] | undefined>>}) {
  const {id} = await params;
  if (!PublicIdSchema.safeParse(id).success) notFound();
  const initial = await publicPoiDetail(id);
  if (initial.status === 'missing') notFound();
  return <PoiDetail key={id} id={id} initial={initial} returnHref={poiReturnHref(id, await searchParams)} />;
}
