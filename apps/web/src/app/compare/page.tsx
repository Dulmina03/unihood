import { BoardingCompare } from '../../components/boardings/boarding-compare';
import { PublicIdSchema } from '@unihood/contracts';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Compare accommodations | UniHood',
  robots: { index: false, follow: false },
};

export default async function ComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string | string[] }>;
}) {
  const query = await searchParams;
  const rawIds = typeof query.ids === 'string' ? query.ids.split(',') : Array.isArray(query.ids) ? query.ids : [];
  const validIds = Array.from(
    new Set(
      rawIds
        .map((s) => s.trim().toLowerCase())
        .filter((s) => PublicIdSchema.safeParse(s).success),
    ),
  ).slice(0, 4);

  return <BoardingCompare initialIds={validIds} />;
}
