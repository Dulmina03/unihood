import Link from 'next/link';
import { Suspense } from 'react';
import { Explore } from '../../components/explore/explore';
export const metadata = {title: 'Explore your university neighborhood | UniHood', robots: {index: false, follow: false}};
export default function ExplorePage() {
  return <Suspense fallback={<main className="explore-loading"><h1>Explore your university neighborhood</h1><p role="status">Loading exploration controls… Public campus entrances are available in list view; the map provider is not connected.</p><Link href="/">Return to university selection</Link></main>}><Explore /></Suspense>;
}
