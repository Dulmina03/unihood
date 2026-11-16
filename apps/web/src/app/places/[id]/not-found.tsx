import Link from 'next/link';
import { EmptyState } from '@unihood/ui';
export default function MissingPlace() {return <main className="poi-detail-main"><h1>Public place not available</h1><EmptyState title="Choose a current public result">This link is invalid or the place is not publicly available. No private information or replacement location is inferred.</EmptyState><Link className="uh-button uh-button--primary" href="/explore">Explore public places</Link></main>;}
