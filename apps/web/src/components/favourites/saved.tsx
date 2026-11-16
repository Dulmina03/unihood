'use client';
import Link from 'next/link';
import { useRef, useState } from 'react';
import { CampusEntrancePageSchema, CampusPageSchema, UniversityPageSchema, UniversitySchema } from '@unihood/contracts';
import { Badge, Button, EmptyState, Field, Icon, Modal, Notice, SiteHeader, Skeleton } from '@unihood/ui';
import { useDirectory } from '../../lib/explore/directory';
import { exploreHref } from '../../lib/explore/query';
import { favouriteKey, type Favourite } from '../../lib/favourites/storage';
import { useFavourites, type Favourites } from '../../lib/favourites/use-favourites';
import { StorageNotice } from './controls';
type University = ReturnType<typeof UniversitySchema.parse>;
type Share = {name: string; href: string};
function SavedGroup({entries, university, favourites, onRemove, onShare, onRetryFocus}: {entries: Favourite[]; university?: University; favourites: Favourites; onRemove: (item: Favourite) => void; onShare: (value: Share) => void; onRetryFocus: () => void}) {
  const campuses = useDirectory(university ? `/api/universities/${university.id}/campuses` : null, CampusPageSchema);
  const campus = campuses.items?.find((row) => row.id === entries[0].campusId && row.universityId === university?.id);
  const gates = useDirectory(university && campus ? `/api/universities/${university.id}/entrances?campusId=${campus.id}` : null, CampusEntrancePageSchema);
  if (campuses.loading || gates.loading) return <Skeleton label="Checking saved public entrances…" />;
  const failed = campuses.failed || gates.failed;
  return <>
    {failed && <Notice kind="error" title="Some saved places could not load"><p>Your saved IDs are kept. Retry to check the current public directory.</p><Button variant="secondary" onClick={() => {if (campuses.failed) campuses.retry(); if (gates.failed) gates.retry(); onRetryFocus();}}>Retry saved places</Button></Notice>}
    {entries.map((entry, index) => {
      const gate = !failed && gates.items?.find((row) => row.id === entry.entranceId && row.campusId === campus?.id);
      if (!university || !campus || !gate) return <article className="saved-card saved-unavailable" key={favouriteKey(entry)}><span className="saved-card-mark"><Icon name="bookmark" /></span><h3>{failed ? 'Temporarily unavailable' : 'Saved entrance unavailable'}</h3><p>{failed ? 'The directory could not be checked. No stored details are substituted.' : 'This public entrance or its university/campus is no longer available. No location or old snapshot is shown.'}</p><Button variant="quiet" disabled={favourites.status !== 'ready'} onClick={() => onRemove(entry)} aria-label={`Remove unavailable saved entrance ${index + 1}`}>Remove saved entrance <Icon name="close" /></Button></article>;
      const href = exploreHref({university: university.slug, campus: campus.id, entrance: gate.id});
      return <article className="saved-card" key={favouriteKey(entry)}><div className="saved-card-top"><span className="saved-card-mark"><Icon name="pin" /></span><Badge tone={gate.provenance.dataKind === 'SYNTHETIC' ? 'warning' : 'mint'}>{gate.provenance.dataKind === 'SYNTHETIC' ? 'Synthetic example' : 'Public source'}</Badge></div><p className="explore-kicker">{gate.isPrimary ? 'PRIMARY CAMPUS GATE' : 'PUBLIC CAMPUS ENTRANCE'}</p><h3>{gate.name}</h3><p>{campus.name}<br />{university.name}</p><p className="saved-source">{gate.provenance.sourceLabel}{gate.provenance.dataKind === 'SYNTHETIC' ? ' · Not a real place.' : ''}</p><div className="saved-card-actions"><Link className="uh-button uh-button--primary" href={href}>Explore this gate <Icon name="arrow" /></Link><Button variant="secondary" aria-label={`Share ${gate.name}`} onClick={() => onShare({name: gate.name, href})}>Share <Icon name="arrow" /></Button></div><Button variant="quiet" className="saved-remove" disabled={favourites.status !== 'ready'} onClick={() => onRemove(entry)} aria-label={`Remove ${gate.name} from favourites`}><Icon name="bookmark" /> Remove from saved</Button></article>;
    })}
  </>;
}
export function SavedFavourites() {
  const favourites = useFavourites();
  const universities = useDirectory(favourites.status === 'ready' && favourites.entries.length ? '/api/universities' : null, UniversityPageSchema);
  const heading = useRef<HTMLHeadingElement>(null);
  const [share, setShare] = useState<Share | null>(null);
  const [copyState, setCopyState] = useState('');
  const groups = new Map<string, Favourite[]>();
  for (const entry of favourites.entries) {const key = `${entry.universityId}:${entry.campusId}`; groups.set(key, [...(groups.get(key) ?? []), entry]);}
  const focusHeading = () => requestAnimationFrame(() => heading.current?.focus());
  return <div className="saved-page">
    <a className="skip-link" href="#saved-main">Skip to content</a>
    <SiteHeader edition="YOUR CAMPUS NOTEBOOK" status="Browse as a guest" current="/saved" items={[{label: 'Explore Map', href: '/explore'}, {label: 'Saved favourites', href: '/saved'}, {label: 'Choose university', href: '/#campus-start'}, {label: 'About privacy', href: '/#privacy'}]} />
    <main id="saved-main" tabIndex={-1} className="saved-main"><section className="saved-hero" aria-labelledby="saved-title"><div><p className="explore-kicker">A FEW PLACES TO COME BACK TO</p><h1 id="saved-title">Your places.<br /><em>Kept close.</em></h1><p>A campus gate for the first day. A starting point for the next.<br />Keep the public places you want to find again.</p><Link href="/explore" className="saved-explore-link">Find another starting point <Icon name="arrow" /></Link></div><aside className="saved-privacy"><Icon name="bookmark" /><h2>A little notebook.<br />Only on this browser.</h2><p>No account, server sync or stored location snapshots. Clearing site data removes these favourites. Shared-device users can see this list.</p><span>Public campus entrances only</span></aside></section>
      <div className="saved-heading"><div><p className="explore-kicker">YOUR COLLECTION</p><h2 ref={heading} tabIndex={-1}>Saved places</h2></div>{favourites.status === 'ready' && <span>{favourites.entries.length} saved</span>}{favourites.status === 'ready' && favourites.entries.length > 0 && <Button variant="quiet" onClick={() => {if (favourites.clear()) focusHeading();}}>Clear all saved</Button>}</div>
      <StorageNotice favourites={favourites} />
      {favourites.status === 'loading' || universities.loading ? <Skeleton label="Loading saved public places…" /> : favourites.status !== 'ready' ? <p className="saved-help">Your public exploration remains available. Storage errors never grant access to private data.</p> : !favourites.entries.length ? <EmptyState title="Room for your next starting point" action={<Link href="/explore" className="uh-button uh-button--primary">Explore public gates <Icon name="arrow" /></Link>}>Save a public campus entrance while exploring. It will be waiting here on this browser, without signing in.</EmptyState> : universities.failed ? <Notice kind="error" title="We couldn’t check your saved places"><p>Your saved IDs are kept. No stale names or locations are shown.</p><Button variant="secondary" onClick={() => {universities.retry(); focusHeading();}}>Retry public directory</Button></Notice> : <div className="saved-grid">{[...groups].map(([key, entries]) => <SavedGroup key={key} entries={entries} university={universities.items?.find((row) => row.id === entries[0].universityId)} favourites={favourites} onRetryFocus={focusHeading} onRemove={(entry) => {if (favourites.remove(entry)) focusHeading();}} onShare={(value) => {setShare(value); setCopyState('');}} />)}</div>}
      <p className="saved-footer">Public gate data is checked again when you visit. No boarding inventory, routes, prices or availability are connected.</p>
    </main>
    <Modal open={Boolean(share)} onClose={() => setShare(null)} title="Share a public starting point"><p>{share?.name}. This shares one public gate selection, not your saved collection or browser data.</p><Field label="Shareable gate link" readOnly value={share && typeof window !== 'undefined' ? `${window.location.origin}${share.href}` : ''} onFocus={(event) => event.target.select()} /><Button onClick={async () => {if (!share) return; try {await navigator.clipboard.writeText(`${window.location.origin}${share.href}`); setCopyState('Link copied.');} catch {setCopyState('Copy is unavailable. Select the link above and copy it manually.');}}}>Copy gate link</Button><p role="status">{copyState}</p></Modal>
  </div>;
}
