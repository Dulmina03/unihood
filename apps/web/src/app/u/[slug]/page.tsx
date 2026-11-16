import { notFound } from 'next/navigation';
import { UniversitySchema, UniversitySlugSchema } from '@unihood/contracts';
import { universityData } from '../../../lib/universities/api';
import { Landing } from '../../../components/landing/landing';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Your university | UniHood', robots: {index: false, follow: false}};
export default async function UniversityPage({params}: {params: Promise<{slug: string}>}) {
  const {slug} = await params;
  if (!UniversitySlugSchema.safeParse(slug).success) notFound();
  // Keep notFound outside catch so an unknown university is never mislabeled a network failure.
  let university;
  try {
    const result = await universityData('universities', undefined, new URLSearchParams({slug}));
    university = !result.missing && result.data.items[0] ? UniversitySchema.parse(result.data.items[0]) : null;
  } catch {return <Landing unavailableSlug={slug} />;}
  if (!university) notFound();
  return <Landing university={university} />;
}
