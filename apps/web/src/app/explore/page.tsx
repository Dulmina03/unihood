import Link from 'next/link';
import { Suspense } from 'react';
import { mapProvider } from '../../lib/maps/provider';
import { Explore } from '../../components/explore/explore';
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Explore your university neighborhood | UniHood', robots: {index: false, follow: false}};
export default function ExplorePage() {
  return <Suspense fallback={<main className="explore-loading"><h1>Explore your university neighborhood</h1><p role="status">Loading exploration controls… Public campus entrances are available in list view; the map loads only when a provider is configured.</p><Link href="/">Return to university selection</Link></main>}><Explore provider={mapProvider(process.env)} /></Suspense>;
}
