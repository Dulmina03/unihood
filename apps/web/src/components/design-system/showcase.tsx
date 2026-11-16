'use client';

import { useState } from 'react';
import {
  AdvertisementGrid, Button, Chip, EmptyState, FeaturedListingCard, Field, Icon,
  ListingResultsRail, MapCanvas, MapLayerControls, MapPropertyPreview, Modal, Notice, Photo,
  PrivacyBadge, SearchField, SiteHeader, Skeleton, SourceBadge, VacancyBadge, listingPresentation,
  type ListingView, type Visibility,
} from '@unihood/ui';
import { demoNow, demoPhoto, sampleListings } from './fixtures';
import { en } from '../../lib/i18n/en';

const nav = [{label: 'Foundations', href: '#foundations'}, {label: 'Listing cards', href: '#collection'}, {label: 'Map components', href: '#map-components'}, {label: 'Controls & states', href: '#controls'}];
const layers = [{id: 'boardings', label: 'Owner boardings', icon: 'bed' as const}, {id: 'health', label: 'Pharmacies', icon: 'clinic' as const}, {id: 'food', label: 'Food', icon: 'coffee' as const}, {id: 'transport', label: 'Transport', icon: 'bus' as const}];

function SectionHeading({number, title, children}: {number: string; title: string; children: React.ReactNode}) {
  return <div className="ds-section-heading"><div><p className="uh-overline">{number} / Campus Teal</p><h2>{title}</h2></div><p>{children}</p></div>;
}
export default function Showcase() {
  const [saved, setSaved] = useState<string[]>([]);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [source, setSource] = useState('all');
  const [collectionState, setCollectionState] = useState('ready');
  const [active, setActive] = useState<ListingView | null>(null);
  const [privacyOpen, setPrivacyOpen] = useState(false);
  const [visibility, setVisibility] = useState<Visibility>('HIDDEN');
  const [mapView, setMapView] = useState('map');
  const [selectedLayers, setSelectedLayers] = useState(['boardings']);
  const [selectedPublic, setSelectedPublic] = useState(true);
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');
  const shown = sampleListings.filter((listing) => (source === 'all' || (source === 'owner' ? listing.publisherKind === 'OWNER_OFFICIAL' : listing.publisherKind === 'COMMUNITY_RECOMMENDATION')) && listing.title.toLowerCase().includes(search.toLowerCase().trim()));
  const activePolicy = active ? listingPresentation(active, demoNow) : null;
  const toggleSave = (id: string) => setSaved((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id]);
  const reset = () => {setSource('all'); setQuery(''); setSearch(''); setCollectionState('ready');};
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <SiteHeader items={nav} />
    <main id="main" tabIndex={-1}>
      <div className="ds-preview-note"><span className="uh-overline">Component library · UNI-003</span><span>All listings, fees and availability below are synthetic demonstrations.</span></div>
      <section className="ds-hero ds-container" aria-labelledby="hero-title">
        <div className="ds-hero-copy"><p className="uh-overline">Editorial Explorer + Urban Map</p><h1 id="hero-title">Familiar places.<br /><em>Thoughtful details.</em></h1>
          <p className="ds-hero-intro">A quieter way to discover your next neighborhood. Built around clear choices, familiar interactions and the freedom to keep a location private.</p>
          <div className="uh-button-row"><a className="uh-button uh-button--primary" href="#collection">Explore the components<Icon name="arrow" /></a><a className="ds-text-link" href="#foundations">Meet Campus Teal<Icon name="arrow" /></a></div>
          <div className="ds-hero-foot"><Icon name="shield" /><span>Open to explore. Careful about what we share.</span></div>
        </div><div className="ds-hero-media"><Photo photo={demoPhoto} priority /><div className="ds-photo-note"><span className="uh-overline">A sense of belonging</span><span>Photography sets the scene. Clear labels tell the truth.</span></div></div>
      </section>

      <section id="foundations" className="ds-container ds-section" tabIndex={-1} aria-labelledby="foundations-title">
        <SectionHeading number="01" title="A familiar visual language.">Editorial headings, generous breathing room, and a palette rooted in Campus Teal. Color supports meaning; it never carries it alone.</SectionHeading>
        <h3 id="foundations-title" className="uh-sr-only">Foundations: color and typography</h3>
        <div className="ds-foundations"><div className="ds-colors" role="group" aria-label="Approved palette">
          {[['Navy', '#0D2940', 'navy'], ['Campus Teal', '#087E79', 'teal'], ['Mint', '#DDF4EA', 'mint'], ['Canvas', '#F7F9F6', 'canvas'], ['Amber', '#E9AA40', 'amber'], ['Coral', '#F16A50', 'coral']].map(([name, hex, style]) => <div className="ds-color" key={name}><span className={`ds-color-swatch ds-color-swatch--${style}`} /><strong>{name}</strong><span>{hex}</span></div>)}
        </div><div className="ds-type"><span className="uh-overline">Fraunces + Manrope</span><p>A little character.<br /><em>A lot of clarity.</em></p><span>Display serif meets a practical, readable interface. Locally hosted fonts; no browser calls to a font provider.</span></div></div>
      </section>

      <section id="collection" className="ds-container ds-section" tabIndex={-1} aria-labelledby="collection-title">
        <SectionHeading number="02" title="Every listing tells its own story.">Same card family. Different source and privacy states. Official prices and confirmed vacancies belong to authorized owners only.</SectionHeading>
        <h3 id="collection-title" className="uh-sr-only">Synthetic listing card collection</h3>
        <div className="ds-collection-tools"><SearchField label="Search the synthetic collection" value={query} onChange={setQuery} onSearch={() => setSearch(query)} /><label className="ds-select">Collection state<select value={collectionState} onChange={(event) => setCollectionState(event.target.value)}><option value="ready">Ready</option><option value="loading">Loading</option><option value="empty">Empty</option><option value="error">Network error</option></select></label></div>
        <div className="ds-collection-bar"><div className="uh-button-row" role="group" aria-label="Listing source">{[['all', 'All examples'], ['owner', 'Owner posted'], ['community', 'Community recommendations']].map(([id, label]) => <Chip key={id} selected={source === id} onClick={() => setSource(id)}>{label}</Chip>)}</div><p className="ds-saved" role="status">Saved in this demo: {saved.length}</p></div>
        <div className="ds-inline-note"><Icon name="info" /><p>Illustrative interiors, synthetic listings. Demo clock: 16 November 2026, 09:00 Asia/Colombo. No live inventory.</p></div>
        {collectionState === 'loading' ? <AdvertisementGrid><Skeleton /><Skeleton /><Skeleton /></AdvertisementGrid> : collectionState === 'error' ? <Notice kind="error" title="We couldn’t load the examples"><p>This is a simulated network failure. Your filter choices are retained.</p><Button variant="secondary" onClick={() => setCollectionState('ready')}>Retry examples</Button></Notice> : collectionState === 'empty' || !shown.length ? <EmptyState title="A little more room to explore." action={<Button variant="secondary" onClick={reset}>Reset sample filters</Button>}>No synthetic examples match these choices. Try another search or clear the filters.</EmptyState> : <AdvertisementGrid>{shown.map((listing) => <FeaturedListingCard key={listing.id} listing={listing} now={demoNow} saved={saved.includes(listing.id)} onSave={() => toggleSave(listing.id)} onPreview={() => setActive(listing)} />)}</AdvertisementGrid>}
      </section>

      <section className="ds-privacy-band"><div className="ds-container ds-privacy-inner"><div><p className="uh-overline">Privacy is part of the design</p><h2>A listing can be useful<br /><em>without a pin.</em></h2></div><div><p>{en.privacy.community}</p><Button variant="secondary" onClick={() => setPrivacyOpen(true)}>Explore visibility choices<Icon name="arrow" /></Button></div></div></section>

      <section id="map-components" className="ds-section" tabIndex={-1} aria-labelledby="map-title"><div className="ds-container"><SectionHeading number="03" title="More space for the neighborhood.">A results rail, layered controls and a grounded preview. The map is a provider slot—not decorative geography.</SectionHeading><h3 id="map-title" className="uh-sr-only">Map control and results components</h3>
        <div className="ds-map-toolbar"><div className="uh-button-row" role="group" aria-label="Map demonstration view"><Chip selected={mapView === 'map'} onClick={() => setMapView('map')}><Icon name="layers" />Map layout</Chip><Chip selected={mapView === 'list'} onClick={() => setMapView('list')}><Icon name="menu" />List fallback</Chip></div><span className="ds-caption">No tiles · no pins · no invented routes</span></div></div>
        <div className={`ds-map-layout ${mapView === 'list' ? 'ds-map-layout--list' : ''}`}>
          <ListingResultsRail title="Permission comes first."><Notice title="Exact boarding pins are owner-only">Only verified, explicitly consented owner-public listings belong in the map layer.</Notice><button className="ds-rail-result" type="button" aria-pressed={selectedPublic} onClick={() => setSelectedPublic(!selectedPublic)}><span><Icon name="home" />Synthetic courtyard room</span><span className="uh-muted">{selectedPublic ? 'Selected · click to clear' : 'Select preview'}<Icon name="arrow" /></span></button><p className="uh-muted">Private and community advertisements stay in the advertisement collection. They are never inferred map targets.</p><a className="ds-text-link" href="#collection">View all advertisement examples<Icon name="arrow" /></a></ListingResultsRail>
          {mapView === 'map' ? <MapCanvas onShowList={() => setMapView('list')}><MapLayerControls options={layers} selected={selectedLayers} onChange={(id) => setSelectedLayers((previous) => previous.includes(id) ? previous.filter((item) => item !== id) : [...previous, id])} />{selectedPublic && selectedLayers.includes('boardings') && <MapPropertyPreview listing={sampleListings[0]} now={demoNow} onPreview={() => setActive(sampleListings[0])} />}<p className="ds-map-layer-summary" role="status">Selected layers: {layers.filter((item) => selectedLayers.includes(item.id)).map((item) => item.label).join(', ') || 'none'}</p></MapCanvas> : <div className="ds-map-list"><FeaturedListingCard listing={sampleListings[0]} now={demoNow} saved={saved.includes(sampleListings[0].id)} onSave={() => toggleSave(sampleListings[0].id)} onPreview={() => setActive(sampleListings[0])} /><p className="uh-muted">The same owner-public example remains accessible without a map. No provider or location data is requested.</p></div>}
        </div>
      </section>

      <section id="controls" className="ds-container ds-section" tabIndex={-1} aria-labelledby="controls-title"><SectionHeading number="04" title="Small details. Clear next steps.">Quiet controls, explicit feedback and accessible defaults. Every action in this preview changes a demonstration state.</SectionHeading><h3 id="controls-title" className="uh-sr-only">Controls and feedback states</h3>
        <div className="ds-controls-grid"><div className="ds-control-panel"><p className="uh-overline">Inputs / validation</p><h3>A little help, at the right time.</h3><form onSubmit={(event) => {event.preventDefault(); if (title.trim().length < 3) {setError('Enter a title with at least 3 characters.'); setFeedback(''); document.getElementById('sample-title')?.focus();} else {setError(''); setFeedback('Demo title accepted. Nothing was published.');}}} noValidate><Field id="sample-title" label="Advertisement title" value={title} required onChange={(event) => setTitle(event.target.value)} hint="Use a synthetic title. This form does not publish anything." error={error} placeholder="e.g. Synthetic garden room" /><div className="uh-button-row"><Button type="submit">Validate example<Icon name="check" /></Button><Button variant="quiet" onClick={() => {setTitle(''); setError(''); setFeedback('Form cleared.');}}>Clear</Button></div><p role="status" className="ds-form-feedback">{feedback || error}</p></form><Field label="Publishing" value="Unavailable until authorization is implemented" disabled hint="Registration and owner proof are deliberately deferred." /></div>
          <div className="ds-control-panel"><p className="uh-overline">Actions / states</p><h3>Confidence without the noise.</h3><div className="uh-button-row"><Button onClick={() => setFeedback('Primary action demonstrated. Nothing was published.')}>Primary action<Icon name="arrow" /></Button><Button variant="secondary" onClick={() => setPrivacyOpen(true)}>Open dialog</Button><Button busy>Loading</Button><Button disabled>Publish unavailable</Button></div><p className="uh-muted">Disabled and busy controls are explicit. Production publishing stays unavailable.</p><div className="ds-status-stack"><VacancyBadge status="AVAILABLE" /><VacancyBadge status="FULL" /><VacancyBadge status="UNKNOWN" /><SourceBadge source="community" /><PrivacyBadge visibility="AREA_ONLY" /></div><Notice kind="warning" title="Needs confirmation">Freshness and source are separate signals. A community observation is never an owner-confirmed vacancy.</Notice></div>
        </div>
      </section>
      <section className="ds-closing ds-container"><span className="uh-overline">Consistent by design</span><h2>One visual language.<br /><em>Room for every neighborhood.</em></h2><p>This foundation prepares future discovery screens. It contains no live listings, prices, vacancies or map locations.</p><a className="ds-text-link" href="#main">Back to the top<Icon name="arrow" /></a></section>
    </main>
    <footer className="ds-footer"><div className="ds-container"><strong>UniHood</strong><p>Campus Teal component library · development demonstration</p><a href="https://unsplash.com/license">Illustrative photo: Unsplash license</a></div></footer>
    <Modal open={privacyOpen} onClose={() => setPrivacyOpen(false)} title="Choose what you share." description="Visibility component demonstration only. No property is created or published."><fieldset className="ds-visibility"><legend>Location visibility demonstration</legend>{([['PUBLIC_MAP', 'Owner map listing', 'Verified owner and explicit map consent required.'], ['AREA_ONLY', 'General area only', 'A broad locality label, without an exact pin or precise route.'], ['HIDDEN', 'Location hidden', 'An advertisement with no geographic hints.']] as const).map(([id, label, detail]) => <label key={id}><input type="radio" name="demo-visibility" value={id} checked={visibility === id} onChange={() => setVisibility(id)} /><span><strong>{label}</strong><span>{detail}</span></span></label>)}</fieldset><div className="ds-dialog-result"><PrivacyBadge visibility={visibility} /><p className="uh-muted">{visibility === 'PUBLIC_MAP' ? 'Real publication will require server-side property authorization. This choice only updates the demo.' : en.privacy.hidden}</p></div><Button onClick={() => setPrivacyOpen(false)}>Done<Icon name="check" /></Button></Modal>
    <Modal open={Boolean(active)} onClose={() => setActive(null)} title={active?.title ?? 'Advertisement example'} description="Synthetic advertisement preview. Photograph, source, fees and availability are illustrative.">{activePolicy && <><div className="uh-badge-row"><SourceBadge source={activePolicy.source} /><PrivacyBadge visibility={activePolicy.visibility} /></div><p className="uh-muted">{activePolicy.mapEligible ? 'Owner map consent is represented in this example. No actual location, map or route is connected.' : en.privacy.hidden}</p><Notice title={activePolicy.source === 'community' ? 'Community recommendation only' : 'A choice that stays with the owner'}>{activePolicy.source === 'community' ? en.privacy.community : 'Only an authorized owner may publish official fees, vacancies or an exact public map entrance.'}</Notice></>}</Modal>
  </>;
}
