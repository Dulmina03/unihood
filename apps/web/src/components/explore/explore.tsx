'use client';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { CampusEntrancePageSchema, CampusPageSchema, UniversityPageSchema } from '@unihood/contracts';
import { Badge, Button, Chip, EmptyState, Field, Icon, Modal, Notice, SiteHeader, Skeleton } from '@unihood/ui';
import { defaultExploreState, exploreHref, parseExploreQuery, type ExploreState } from '../../lib/explore/query';
import { en } from '../../lib/i18n/en';
import { useDirectory } from '../../lib/explore/directory';
const categories = [{id: 'entrances', label: en.explore.entrances, icon: 'pin'}, {id: 'boardings', label: en.explore.boardings, icon: 'bed'}, {id: 'essentials', label: en.explore.essentials, icon: 'coffee'}] as const;
export function Explore() {
  const params = useSearchParams();
  const parsed = parseExploreQuery(new URLSearchParams(params.toString()));
  const state = parsed.valid ? parsed.state : defaultExploreState;
  const update = (patch: Partial<ExploreState>) => window.history.pushState(null, '', exploreHref({...state, ...patch}));
  const universities = useDirectory(parsed.valid ? '/api/universities' : null, UniversityPageSchema);
  const university = universities.items?.find((item) => item.slug === state.university);
  const campuses = useDirectory(university ? `/api/universities/${university.id}/campuses` : null, CampusPageSchema);
  const campus = campuses.items?.find((item) => item.id === state.campus && item.universityId === university?.id);
  const entrances = useDirectory(university && campus ? `/api/universities/${university.id}/entrances?campusId=${campus.id}` : null, CampusEntrancePageSchema);
  const eligible = entrances.items?.filter((item) => item.campusId === campus?.id) ?? [];
  const entrance = eligible.find((item) => item.id === state.entrance);
  const invalid = !parsed.valid || Boolean(universities.items && state.university && !university) || Boolean(campuses.items && state.campus && !campus) || Boolean(entrances.items && state.entrance && !entrance);
  const visible = state.category === 'entrances' ? eligible.filter((item) => item.name.toLocaleLowerCase().includes(state.q.toLocaleLowerCase())) : [];
  const [expanded, setExpanded] = useState(true);
  const [railVisible, setRailVisible] = useState(true);
  const [dialog, setDialog] = useState<'filters' | 'share' | 'privacy' | null>(null);
  const [copyState, setCopyState] = useState('');
  const preview = useRef<HTMLElement>(null);
  const shouldFocus = useRef(false);
  const dragStart = useRef<number | null>(null);
  const resultFocus = useRef<HTMLHeadingElement>(null);
  const dragged = useRef(false);
  // Keyed search input below restores its draft from URL on Back/Forward.
  const selectedVisible = Boolean(entrance && state.category === 'entrances' && !invalid);
  useEffect(() => {if (shouldFocus.current && selectedVisible) {preview.current?.focus(); shouldFocus.current = false;}}, [state.entrance, selectedVisible]);
  const selectEntrance = (id: string) => {shouldFocus.current = Boolean(id); setExpanded(true); update({entrance: id}); if (id && id === state.entrance) requestAnimationFrame(() => {preview.current?.focus(); shouldFocus.current = false;});};
  const showList = () => {setRailVisible(true); setExpanded(true); update({view: 'list'});};
  const loading = universities.loading || campuses.loading || entrances.loading;
  const failed = universities.failed || campuses.failed || entrances.failed;
  const retry = () => {if (universities.failed) universities.retry(); if (campuses.failed) campuses.retry(); if (entrances.failed) entrances.retry();};
  const locationControls = <div className="explore-selection">
    <div><label htmlFor="explore-university">{en.explore.university}</label><select id="explore-university" value={university?.slug ?? ''} disabled={universities.loading || universities.failed} onChange={(event) => update({university: event.target.value, campus: '', entrance: '', q: ''})}><option value="">{universities.loading ? 'Loading universities…' : 'Choose a university'}</option>{universities.items?.map((item) => <option key={item.id} value={item.slug}>{item.name}{item.provenance.dataKind === 'SYNTHETIC' ? ' · Demo' : ''}</option>)}</select></div>
    <div><label htmlFor="explore-campus">{en.explore.campus}</label><select id="explore-campus" value={campus?.id ?? ''} disabled={!university || campuses.loading || campuses.failed} onChange={(event) => update({campus: event.target.value, entrance: '', q: ''})}><option value="">{campuses.loading ? 'Loading campuses…' : 'Choose a campus'}</option>{campuses.items?.filter((item) => item.universityId === university?.id).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
    <div><label htmlFor="explore-entrance">{en.explore.entrance}</label><select id="explore-entrance" value={entrance?.id ?? ''} disabled={!campus || entrances.loading || entrances.failed} onChange={(event) => selectEntrance(event.target.value)}><option value="">{entrances.loading ? 'Loading entrances…' : 'Choose an entrance'}</option>{eligible.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></div>
    {university && <p className="explore-source">{university.provenance.dataKind === 'SYNTHETIC' ? 'Synthetic demonstration university. Not a real campus.' : 'University selection does not imply endorsement.'} <Link href={`/u/${university.slug}`}>University page <Icon name="arrow" /></Link></p>}
  </div>;
  return <div className="urban-explore" data-view={state.view} data-expanded={expanded} data-rail={railVisible} data-selected={selectedVisible}>
    <a className="skip-link" href="#explore-main">Skip to content</a>
    <SiteHeader edition="NEIGHBORHOOD EXPLORER" status="Browse as a guest" current="/explore" items={[{label: 'Explore Map', href: '/explore'}, {label: 'Choose university', href: '/#campus-start'}, {label: 'About privacy', href: '/#privacy'}]} />
    <main id="explore-main" tabIndex={-1} className="explore-workspace">
      <div className="explore-floating"><div className="explore-context"><Icon name="compass" /><span>{university?.name ?? 'Your next neighborhood'}<small>{campus?.name ?? 'Start with your university'} · {en.explore.mapStatus}</small></span></div><Button variant="secondary" onClick={() => setDialog('filters')}><Icon name="filter" /> {en.explore.filters}</Button><div className="explore-view" role="group" aria-label="Exploration view"><Chip selected={state.view === 'map'} onClick={() => update({view: 'map'})}>{en.explore.map}</Chip><Chip selected={state.view === 'list'} onClick={showList}>{en.explore.list}</Chip></div><Button variant="secondary" onClick={() => {setCopyState(''); setDialog('share');}}><Icon name="arrow" /> {en.explore.share}</Button></div>
      <section className="explore-map" aria-label="Map unavailable" hidden={state.view === 'list'}>
        <div className="explore-map-grid" aria-hidden="true" />
        <div className="explore-map-message"><span className="explore-compass"><Icon name="compass" /></span><p className="explore-kicker">A LITTLE CLOSER TO CAMPUS</p><h2>{en.explore.mapTitleLead}<br /><em>{en.explore.mapTitleEnd}</em></h2><p>{en.explore.mapUnavailable}</p><Button onClick={showList}>{en.explore.exploreList} <Icon name="arrow" /></Button><span className="explore-provider-note">No map tiles, pins or routes are being displayed.</span></div>
        <div className="explore-map-foot"><span><Icon name="layers" /> Map unavailable · provider deferred to UNI-013</span><button type="button" onClick={() => setDialog('privacy')}><Icon name="shield" /> Location privacy</button></div>
      </section>
      <Button variant="secondary" className="explore-rail-toggle" aria-expanded={railVisible} aria-controls="explore-results" onClick={() => setRailVisible(!railVisible)}>{railVisible ? 'Hide results' : 'Show results'} <Icon name="layers" /></Button>
      <section id="explore-results" aria-label="Public exploration results" className="explore-rail">
        <button type="button" className="explore-sheet-handle" aria-expanded={expanded} aria-controls="explore-rail-content" onClick={() => {if (!dragged.current) setExpanded(!expanded); dragged.current = false;}} onPointerDown={(event) => {dragged.current = false; dragStart.current = event.clientY; event.currentTarget.setPointerCapture(event.pointerId);}} onPointerUp={(event) => {const delta = event.clientY - (dragStart.current ?? event.clientY); if (Math.abs(delta) > 40) {dragged.current = true; setExpanded(delta < 0);} dragStart.current = null;}} onPointerCancel={() => {dragStart.current = null;}}><span aria-hidden="true" /><span>{expanded ? 'Collapse results' : 'Expand results'}</span></button>
        <div id="explore-rail-content" className="explore-rail-content">
          <div className="explore-intro"><p className="explore-kicker">FIND YOUR STARTING POINT</p><h1>{en.explore.titleLead}<br /><em>{en.explore.titleEnd}</em></h1><p>A public gate. A familiar campus. Start with the places that bring you here.</p></div>
          {locationControls}
          <form key={state.q} role="search" className="explore-search" onSubmit={(event) => {event.preventDefault(); const form = new FormData(event.currentTarget); update({q: String(form.get('q') ?? '').trim()});}}><label htmlFor="explore-query">{en.explore.search}</label><div><input id="explore-query" name="q" type="search" maxLength={100} defaultValue={state.q} placeholder="Search entrance names" /><Button type="submit" aria-label="Search entrances"><Icon name="search" /></Button></div></form>
          <div className="explore-categories" role="group" aria-label="Result category">{categories.map((item) => <Chip key={item.id} selected={state.category === item.id} onClick={() => update({category: item.id})}><Icon name={item.icon} />{item.label}</Chip>)}</div>
          <div className="explore-privacy-note" id="explore-privacy" tabIndex={-1}><Icon name="shield" /><p>Public gates, private homes.<br /><span>Exact boarding pins need an authorized owner’s explicit consent.</span></p><button type="button" aria-label="Learn about location privacy" onClick={() => setDialog('privacy')}><Icon name="info" /></button></div>
          <div className="explore-result-heading"><h2 ref={resultFocus} tabIndex={-1}>{en.explore.publicPlaces}</h2><span aria-live="polite">{loading ? 'Loading…' : `${visible.length} ${visible.length === 1 ? 'result' : 'results'}`}</span></div>
          {invalid ? <Notice kind="error" title={en.explore.invalidSelection}><p>The link contains an unsupported selection, or a university, campus or entrance that is not available in this directory.</p><Button variant="secondary" onClick={() => {window.history.pushState(null, '', '/explore');}}>Reset selections</Button></Notice>
            : failed ? <Notice kind="error" title={en.explore.loadError}><p>Please check your connection and try again. Your selections are kept.</p><Button variant="secondary" onClick={retry}>{en.explore.retry}</Button></Notice>
            : loading ? <Skeleton label="Loading public places…" />
            : !universities.items?.length ? <EmptyState title="No universities available">The public directory is empty. No demonstration fallback has been substituted.</EmptyState>
            : !university ? <EmptyState title="A university is your starting point">Choose a university above to explore its campuses and public entrances.</EmptyState>
            : !campuses.items?.length ? <EmptyState title="No campuses available">This university has no public campuses yet. You can choose another university.</EmptyState>
            : !campus ? <EmptyState title="Choose your campus">Select a campus to see its public entrance list.</EmptyState>
            : state.category !== 'entrances' ? <EmptyState title={state.category === 'boardings' ? 'No boarding feed connected' : 'No essentials feed connected'} action={<Button variant="secondary" onClick={() => update({category: 'entrances'})}>Show campus gates</Button>}>This shell does not offer live listings or public services yet. No availability, prices or distances are invented.</EmptyState>
            : !visible.length ? <EmptyState title={state.q ? 'No entrances match' : 'No public entrances yet'} action={state.q ? <Button variant="secondary" onClick={() => update({q: ''})}>Clear search</Button> : undefined}>{state.q ? 'Try another entrance name or clear the search.' : 'Choose another campus or check back when entrances are published.'}</EmptyState>
            : <ul className="explore-result-list">{visible.map((item, index) => <li key={item.id}><button type="button" aria-pressed={entrance?.id === item.id} onClick={() => selectEntrance(item.id)}><span className="explore-gate-symbol"><Icon name="pin" /></span><span className="explore-result-text"><small>PUBLIC CAMPUS ENTRANCE · {String(index + 1).padStart(2, '0')}</small><strong>{item.name}</strong><span>{campus.name}</span><Badge tone={item.provenance.dataKind === 'SYNTHETIC' ? 'warning' : 'mint'}>{item.provenance.dataKind === 'SYNTHETIC' ? 'Synthetic example' : 'Public source'}</Badge></span><Icon name="arrow" /></button></li>)}</ul>}
          {selectedVisible && entrance && <article className="explore-preview" ref={preview} tabIndex={-1} aria-labelledby="explore-preview-title"><div className="explore-preview-top"><Badge tone={entrance.provenance.dataKind === 'SYNTHETIC' ? 'warning' : 'teal'}>{entrance.provenance.dataKind === 'SYNTHETIC' ? 'Synthetic entrance' : 'Public campus entrance'}</Badge><Button variant="quiet" aria-label="Close entrance preview" onClick={() => {update({entrance: ''}); resultFocus.current?.focus();}}><Icon name="close" /></Button></div><span className="explore-preview-icon"><Icon name="pin" /></span><p className="explore-kicker">YOUR SELECTED STARTING POINT</p><h2 id="explore-preview-title">{entrance.name}</h2><p>{campus?.name} · {university?.name}</p><p className="explore-preview-source">{entrance.provenance.sourceLabel}{entrance.provenance.dataKind === 'SYNTHETIC' ? ' · Fictional demonstration, not a real gate.' : ''}</p><p className="explore-route-note"><Icon name="compass" /> Map and walking routes unavailable. No distance is estimated.</p><Button variant="secondary" onClick={() => {setCopyState(''); setDialog('share');}}>Share this selection <Icon name="arrow" /></Button></article>}
          <p className="explore-rail-footer">OPEN TO EXPLORE. BUILT AROUND PRIVACY.</p>
        </div>
      </section>
    </main>
    <Modal open={dialog === 'filters'} onClose={() => setDialog(null)} title="Refine your view"><p>Search and category filters apply to the public entrance list. Boarding price, vacancy and distance filters will be available with their verified data sources.</p><div className="explore-filter-categories">{categories.map((item) => <Chip key={item.id} selected={state.category === item.id} onClick={() => update({category: item.id})}>{item.label}</Chip>)}</div><form key={state.q} onSubmit={(event) => {event.preventDefault(); const data = new FormData(event.currentTarget); update({q: String(data.get('q') ?? '').trim()}); setDialog(null);}}><Field name="q" label="Entrance name filter" maxLength={100} defaultValue={state.q} /><div className="uh-button-row"><Button type="submit">Apply filters</Button><Button variant="secondary" onClick={() => {update({q: '', category: 'entrances'}); setDialog(null);}}>Clear filters</Button></div></form></Modal>
    <Modal open={dialog === 'share'} onClose={() => setDialog(null)} title="Share your starting point"><p>This link keeps the university, campus, entrance, view and filters. It carries no boarding coordinates or account identity.</p><Field label="Shareable exploration link" readOnly value={typeof window === 'undefined' ? '' : `${window.location.origin}${exploreHref(state)}`} onFocus={(event) => event.target.select()} /><Button onClick={async () => {try {await navigator.clipboard.writeText(`${window.location.origin}${exploreHref(state)}`); setCopyState('Link copied.');} catch {setCopyState('Copy is unavailable. Select the link above and copy it manually.');}}}>Copy link</Button><p role="status">{copyState}</p></Modal>
    <Modal open={dialog === 'privacy'} onClose={() => setDialog(null)} title="A useful map respects privacy"><p>Only verified, property-authorized owners who explicitly consent can publish exact boarding pins. Area-only and hidden advertisements never provide a pin, route or precise distance. Community boarding recommendations belong only in advertisements.</p><p>Public campus gates are separate from residential locations. Synthetic examples are labeled and are not real places. This shell shows no boarding inventory or geographic map.</p></Modal>
  </div>;
}
