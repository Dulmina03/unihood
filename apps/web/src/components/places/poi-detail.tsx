'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { PublicPoiDetailSchema } from '@unihood/contracts';
import { Badge, Button, EmptyState, Field, Icon, Modal, Notice, SiteHeader, Skeleton } from '@unihood/ui';
import type { PoiDetailResult } from '../../lib/places/detail';
import { PlaceTimestamp, SourceFreshness } from './source-freshness';
export function PoiDetail({id, initial, returnHref}: {id: string; initial: PoiDetailResult; returnHref: string}) {
  const [result, setResult] = useState(initial), [loading, setLoading] = useState(false);
  const [share, setShare] = useState(false), [copy, setCopy] = useState('');
  const pending = useRef<AbortController | null>(null), heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => () => {pending.current?.abort(); pending.current = null;}, []);
  const retry = async () => {
    pending.current?.abort(); const controller = new AbortController(); pending.current = controller; setLoading(true);
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch(`/api/places/${id}`, {signal: controller.signal, cache: 'no-store', credentials: 'omit'});
      if (pending.current !== controller) return;
      if (response.status === 404) setResult({status: 'missing'});
      else {
        if (!response.ok) throw new Error();
        const item = PublicPoiDetailSchema.parse(await response.json()); if (item.id !== id) throw new Error();
        if (pending.current !== controller) return;
        setResult({status: 'found', item});
      }
    } catch {if (pending.current === controller) setResult({status: 'unavailable'});}
    finally {clearTimeout(timer); if (pending.current === controller) {setLoading(false); requestAnimationFrame(() => heading.current?.focus());}}
  };
  const item = result.status === 'found' ? result.item : null;
  const shareUrl = typeof window === 'undefined' ? '' : `${window.location.origin}/places/${id}`;
  return <div className="poi-detail-page">
    <a className="skip-link" href="#poi-main">Skip to content</a>
    <SiteHeader edition="PUBLIC NEIGHBORHOOD GUIDE" status="Browse as a guest" items={[{label: 'Explore Map', href: '/explore'}, {label: 'Saved favourites', href: '/saved'}, {label: 'Choose university', href: '/#campus-start'}, {label: 'About privacy', href: '/#privacy'}]} />
    <main id="poi-main" tabIndex={-1} className="poi-detail-main">
      <Link href={returnHref} className="poi-return">← Back to public exploration</Link>
      <header className="poi-detail-heading"><p className="explore-kicker">PUBLIC ESSENTIALS · A PLACE IN YOUR DAY</p>
        <h1 ref={heading} tabIndex={-1}>{item?.name ?? 'Public place details'}</h1>
        <p>Useful information, with its source and uncertainty in view.</p>
      </header>
      {loading ? <Skeleton label="Loading public place details…" /> : !item ? result.status === 'missing' ? <EmptyState title="Public place not available">This place may no longer be publicly listed. No replacement or private location is inferred. Return to exploration to choose a current public result.</EmptyState> : <Notice kind="error" title="We couldn’t load this public place"><p>Check your connection and try again. No stale or invented details are substituted.</p><Button onClick={retry}>Retry public place details</Button></Notice> : <div className="poi-detail-grid">
        <section className="poi-detail-content" aria-label="Public place information">
          <div className="poi-detail-badges"><Badge tone={item.provenance.dataKind === 'SYNTHETIC' ? 'warning' : 'teal'}>{item.provenance.dataKind === 'SYNTHETIC' ? 'Synthetic public place' : 'Public point of interest'}</Badge><Badge tone="mint">{item.category.label}</Badge></div>
          <h2>A source you can inspect.</h2><SourceFreshness item={item} />
          <dl className="poi-detail-facts"><div><dt>Record last updated</dt><dd><PlaceTimestamp value={item.updatedAt} /><small>A record edit is not a new location confirmation.</small></dd></div><div><dt>Opening hours</dt><dd>Not validated · check before visiting</dd></div><div><dt>Contact details</dt><dd>No validated public contact provided</dd></div></dl>
          <details className="poi-correction"><summary>Information looks wrong?</summary><p>Check the source label and confirmation date above. Suggest a dated correction through the guarded synthetic public-service flow. It stays held and cannot rewrite public facts or private residential details.</p><Link className="poi-return" href={`/contribute/correction?place=${id}`}>Suggest a public place correction</Link></details>
        </section>
        <aside className="poi-detail-location" aria-labelledby="poi-location-title"><span className="poi-detail-mark"><Icon name="pin" /></span><p className="explore-kicker">PUBLIC POINT · NOT A PRIVATE HOME</p><h2 id="poi-location-title">Know what’s known.</h2>
          <p>{item.provenance.dataKind === 'SYNTHETIC' ? 'Fictional coordinates for demonstration only. This is not a destination to visit.' : 'A published public-service point. Its location confirmation is recorded separately from source verification.'}</p>
          <dl><dt>Public coordinates</dt><dd>{item.location.lat}, {item.location.lng}</dd></dl>
          <p>Walking directions and travel distances are unavailable. No route, nearest-place ranking or travel time is estimated.</p>
          <div className="poi-detail-actions"><Link href={returnHref} className="uh-button uh-button--primary">Return to map / list <Icon name="arrow" /></Link><Button variant="secondary" onClick={() => {setCopy(''); setShare(true);}}>Share public place <Icon name="arrow" /></Button></div>
        </aside>
      </div>}
      <p className="poi-detail-footer">Public POIs are separate from boarding advertisements. No private residential coordinates, owner claims or live availability are provided.</p>
    </main>
    <Modal open={share} onClose={() => setShare(false)} title="Share this public place"><p>A canonical public place link. Your entrance selection, filters, favourites and account identity are not included.</p><Field label="Shareable public place link" readOnly value={shareUrl} onFocus={event => event.target.select()} /><Button onClick={async () => {try {await navigator.clipboard.writeText(shareUrl); setCopy('Link copied.');} catch {setCopy('Copy is unavailable. Select the link above and copy it manually.');}}}>Copy public place link</Button><p role="status">{copy}</p></Modal>
  </div>;
}
