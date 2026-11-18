'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { BoardingAdvertisementPageSchema, BoardingRecommendationDraftSchema, BoardingDuplicateResultSchema, BoardingResolutionInputSchema, BoardingResolutionReceiptSchema, type BoardingRecommendationDraft, type BoardingDuplicateResult, type BoardingResolutionReceipt, type PublicBoardingAdvertisement } from '@unihood/contracts';
import { BoardingDuplicateChoices } from './boarding-duplicate-choices';
import { Badge, Button, Field, Notice, SiteHeader } from '@unihood/ui';

export const contributionNavigation = [{ label: 'Explore Map', href: '/explore' }, { label: 'Advertisements', href: '/advertisements' }, { label: 'Saved favourites', href: '/saved' }, { label: 'Contribute', href: '/contribute' }];
const facilities = ['Study space', 'Shared kitchen', 'Laundry area', 'Wi-Fi'] as const;
export function BoardingRecommendation({ endpoint }: { endpoint: string | null }) {
  const [query, setQuery] = useState(''), [matches, setMatches] = useState<PublicBoardingAdvertisement[] | null>(null), [searchError, setSearchError] = useState('');
  const [title, setTitle] = useState(''), [description, setDescription] = useState(''), [locality, setLocality] = useState('');
  const [selected, setSelected] = useState<string[]>([]), [privacy, setPrivacy] = useState(false), [media, setMedia] = useState(false);
  const [review, setReview] = useState<BoardingRecommendationDraft | null>(null), [receipt, setReceipt] = useState<BoardingResolutionReceipt | null>(null);
  const [duplicates, setDuplicates] = useState<BoardingDuplicateResult | null>(null), [choice, setChoice] = useState(''), [reason, setReason] = useState('');
  const [error, setError] = useState(''), [busy, setBusy] = useState('');
  const search = useRef<AbortController | null>(null), request = useRef<AbortController | null>(null), intent = useRef<{ key: string; body: string } | null>(null);
  const reviewHeading = useRef<HTMLHeadingElement>(null), receiptHeading = useRef<HTMLHeadingElement>(null), errorRegion = useRef<HTMLParagraphElement>(null);
  useEffect(() => () => { search.current?.abort(); search.current = null; request.current?.abort(); request.current = null; }, []);
  useEffect(() => { if (review) reviewHeading.current?.focus(); }, [review]);
  useEffect(() => { if (receipt) receiptHeading.current?.focus(); }, [receipt]);
  useEffect(() => { if (error) errorRegion.current?.focus(); }, [error]);
  function invalidate() { request.current?.abort(); request.current = null; intent.current = null; setReview(null); setReceipt(null); setDuplicates(null); setChoice(''); setReason(''); setError(''); setBusy(''); }
  function clear() { invalidate(); setTitle(''); setDescription(''); setLocality(''); setSelected([]); setPrivacy(false); setMedia(false); }
  function selectionChanged() { request.current?.abort(); request.current = null; intent.current = null; setReceipt(null); setError(''); setBusy(''); }
  async function checkMatches(value: BoardingRecommendationDraft) {
    if (!endpoint) return;
    request.current?.abort(); const controller = new AbortController(); request.current = controller;
    intent.current = null; setDuplicates(null); setChoice(''); setReason(''); setReceipt(null); setError(''); setBusy('duplicates');
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(endpoint + '/duplicates', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title: value.title, locality: value.locality }), cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal });
      if (!response.ok) throw new Error(); const result = BoardingDuplicateResultSchema.parse(await response.json());
      if (request.current === controller) setDuplicates(result);
    } catch { if (request.current === controller) setError('We couldn’t check public matches. Retry matching; no suggestion was submitted.'); }
    finally { clearTimeout(timer); if (request.current === controller) setBusy(''); }
  }
  async function find(event: FormEvent) {
    event.preventDefault(); search.current?.abort(); setMatches(null); setSearchError('');
    if (!query.trim() || query.length > 80 || /@|https?:|\d{5,}/i.test(query)) { setSearchError('Search public advertisement titles only; omit private contact or address information.'); return; }
    const controller = new AbortController(); search.current = controller; setBusy('search'); const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(`/api/boardings?q=${encodeURIComponent(query.trim())}&sort=title&pageSize=5`, { cache: 'no-store', credentials: 'omit', signal: controller.signal });
      if (!response.ok) throw new Error(); const result = BoardingAdvertisementPageSchema.parse(await response.json());
      if (search.current === controller) setMatches(result.items);
    } catch { if (search.current === controller) setSearchError('Public advertisement search is unavailable. Retry the search; no new property has been created.'); }
    finally { clearTimeout(timer); if (search.current === controller) setBusy(''); }
  }
  function prepare(event: FormEvent) {
    event.preventDefault(); setError('');
    const result = BoardingRecommendationDraftSchema.safeParse({ title, description, locality: locality || null, facilities: selected, privacyAcknowledged: privacy, mediaGuidanceAcknowledged: media });
    if (!result.success) { setError('Use a Synthetic-prefixed title, a 15–400 character description, permitted facilities and both privacy acknowledgements.'); return; }
    setReview(result.data); setReceipt(null); void checkMatches(result.data);
  }
  async function submit() {
    if (!review || !endpoint || busy || !duplicates) return;
    const resolution = choice === 'distinct' ? { kind: 'DISTINCT', reason } : { kind: 'EXISTING', boardingId: choice };
    const body = JSON.stringify({ draft: review, resolution });
    if (!intent.current || intent.current.body !== body) intent.current = { key: crypto.randomUUID(), body };
    const parsed = BoardingResolutionInputSchema.safeParse({ key: intent.current.key, draft: review, resolution });
    if (!parsed.success) { setError('Choose a current public match or provide a 15–240 character reason to keep this suggestion separate.'); return; }
    request.current?.abort(); const controller = new AbortController(); request.current = controller; setBusy('submit'); setError('');
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(endpoint + '/resolve', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed.data), cache: 'no-store', credentials: 'omit', redirect: 'error', signal: controller.signal });
      if (!response.ok) throw new Error(response.status === 401 || response.status === 403 ? 'Authorization is unavailable. Use only the explicit loopback local/test contributor simulator.' : response.status === 409 ? 'This selection or intent changed. Check public matches again; no owner facts were changed.' : response.status === 429 ? 'Too many requests. Wait one minute, then retry the unchanged recommendation.' : 'The intake is unavailable. Retry the unchanged recommendation with the same key.');
      const result = BoardingResolutionReceiptSchema.parse(await response.json());
      if (result.canonicalBoardingId !== null && result.canonicalBoardingId !== choice) throw new Error();
      if (request.current === controller) setReceipt(result);
    } catch (failure) { if (request.current === controller) setError(failure instanceof Error && /^(Authorization|This selection|Too many|The intake)/.test(failure.message) ? failure.message : 'The intake is unavailable. Retry the unchanged recommendation with the same key.'); }
    finally { clearTimeout(timer); if (request.current === controller) setBusy(''); }
  }
  return <div className="recommendation-page"><a className="skip-link" href="#recommendation-main">Skip to recommendation</a>
    <SiteHeader edition="COMMUNITY CONTRIBUTIONS" status="Browse as a guest" current="/contribute" items={contributionNavigation} />
    <main className="poi-detail-main" id="recommendation-main" tabIndex={-1}>
      <Link className="poi-return" href="/contribute">← Contribution hub</Link>
      <header className="poi-detail-heading"><p className="landing-kicker">SHARE CONTEXT. RESPECT THE DOORSTEP.</p><Badge tone="warning">Synthetic local/test flow</Badge><h1>Recommend a boarding.</h1><p>A community recommendation is an advertisement suggestion, never an exact map pin or official owner statement.</p></header>
      <Notice kind="warning" title="Private by design">Do not enter a private address, phone number, entrance hint or owner claim. Official rent and confirmed vacancy belong to authorized property managers. This simulation accepts fictional Synthetic-prefixed drafts only; every submission is held, never published.</Notice>
      {!endpoint ? <section className="recommendation-unavailable"><h2>Recommendations are unavailable here.</h2><p>Public browsing stays open. This demonstration has not enabled submissions here; you can keep browsing without signing in.</p><Link className="poi-return" href="/advertisements">Browse public advertisements</Link></section> : <div className="recommendation-columns">
        <div><section className="recommendation-search" aria-labelledby="existing-title"><h2 id="existing-title">1. Look before adding.</h2><p>Inspect existing public advertisements first. A title match can help you find an existing suggestion, but this search cannot confirm that a boarding is new. Private property details are never searched.</p>
          <form onSubmit={find}><Field label="Search public advertisement titles" value={query} maxLength={80} onChange={event => { search.current?.abort(); search.current = null; setBusy(''); setMatches(null); setSearchError(''); setQuery(event.target.value); }} /><Button type="submit" busy={busy === 'search'} disabled={Boolean(busy)}>Search advertisements</Button></form>
          {searchError && <p role="alert">{searchError}</p>}{matches && <div role="status">{matches.length ? <ul>{matches.map(item => <li key={item.listing.id}><Link className="poi-return" href={`/boardings/${item.listing.id}`}>{item.listing.title}</Link><p>Existing public advertisement · location remains {item.listing.visibility === 'HIDDEN' ? 'hidden' : 'broad-area only'}.</p></li>)}</ul> : <p>No public title matches. Another suggestion may already be waiting privately. This example will be held; it will not create a public listing.</p>}</div>}
        </section>
        <form onSubmit={prepare} className="recommendation-form" aria-label="Boarding recommendation draft"><h2>2. Describe a fictional example.</h2>
          <Button variant="secondary" onClick={() => { invalidate(); setTitle('Synthetic Student Study Annex'); setDescription('A fictional shared study setting for testing community recommendations. No real accommodation or availability is represented.'); setLocality(''); setSelected(['Study space']); setPrivacy(false); setMedia(false); }}>Use synthetic example</Button>
          <Field label="Recommendation title" required minLength={10} maxLength={120} autoComplete="off" value={title} onChange={event => { invalidate(); setTitle(event.target.value); }} hint="Start with Synthetic. No address, owner claim or contact." />
          <label className="duplicate-label" htmlFor="recommendation-description">Permitted description<textarea id="recommendation-description" required minLength={15} maxLength={400} value={description} onChange={event => { invalidate(); setDescription(event.target.value); }} aria-describedby="recommendation-description-hint" /></label><small id="recommendation-description-hint">15–400 characters. Describe context without private contacts, addresses, links, prices or vacancy claims.</small>
          <label className="duplicate-label">General locality (optional)<select value={locality} onChange={event => { invalidate(); setLocality(event.target.value); }}><option value="">Do not share a locality</option><option>Synthetic North Quarter</option><option>Synthetic Garden District</option></select></label>
          <fieldset><legend>Reported facilities · unverified</legend>{facilities.map(value => <label className="proposal-confirmation" key={value}><input type="checkbox" checked={selected.includes(value)} onChange={event => { invalidate(); setSelected(items => event.target.checked ? [...items, value] : items.filter(item => item !== value)); }} />{value}</label>)}</fieldset>
          <Notice title="Photos need their own consent">This form does not upload photos. Permission to recommend a boarding does not give permission to share photos of the home. Never copy private interior photos or share photo location metadata.</Notice>
          <label className="proposal-confirmation"><input type="checkbox" checked={privacy} onChange={event => { invalidate(); setPrivacy(event.target.checked); }} />I have permission to share this fictional text and have omitted private addresses, contacts and official owner claims.</label>
          <label className="proposal-confirmation"><input type="checkbox" checked={media} onChange={event => { invalidate(); setMedia(event.target.checked); }} />I understand the separate photo-consent and GPS-metadata rules; no media is submitted here.</label>
          <div className="recommendation-actions"><Button type="submit" disabled={Boolean(busy)}>Review recommendation</Button><Button variant="quiet" onClick={clear}>Clear unsent draft</Button></div>
        </form></div>
        <section className="recommendation-review" aria-label="Recommendation preview and outcome"><h2 ref={reviewHeading} tabIndex={-1}>3. Review before sending.</h2>
          {!review ? <p>Your preview appears here after validation. Nothing is saved to browser storage or share links.</p> : <><Badge tone="warning">Community-submitted · not owner-verified</Badge><h3>{review.title}</h3><p>{review.description}</p><p>{review.locality ?? 'No locality shared'}</p><p>Reported facilities: {review.facilities.join(', ') || 'None supplied'} · unverified</p><p>No map pin, official fee, confirmed vacancy or verified contact. This preview is not a published advertisement.</p>
            {!receipt && <><BoardingDuplicateChoices result={duplicates} busy={Boolean(busy)} choice={choice} reason={reason} onChoice={value => { selectionChanged(); setChoice(value); }} onReason={value => { selectionChanged(); setReason(value); }} /><Button variant="secondary" onClick={() => void checkMatches(review)} disabled={Boolean(busy)}>Retry public matches</Button><Button onClick={() => void submit()} busy={busy === 'submit'} disabled={Boolean(busy) || !duplicates || !choice}>Submit held recommendation</Button></>}<Button variant="quiet" onClick={() => { invalidate(); document.getElementById('recommendation-description')?.focus(); }}>Edit draft</Button></>}
          {busy === 'submit' && <p role="status">Submitting a private held recommendation…</p>}{error && <p ref={errorRegion} tabIndex={-1} role="alert">{error}</p>}
          {receipt && <section className="proposal-receipt" aria-label="Held recommendation receipt"><h2 ref={receiptHeading} tabIndex={-1}>{receipt.reviewState === 'NEEDS_EVIDENCE' ? 'Needs evidence.' : 'Held for review.'}</h2><Badge tone="warning">Synthetic · not published</Badge><p>Your suggestion stays held and unverified. No new public listing, map pin, official information or owner permission was created.</p><p>Private intake receipt: <code>{receipt.contributionId}</code></p>{receipt.canonicalBoardingId && <p>Suggested existing boarding: <Link className="poi-return" href={`/boardings/${receipt.canonicalBoardingId}`}>View the current public advertisement</Link>. This link grants no management permission.</p>}<p>Editing or clearing the form does not cancel a request already received by the server.</p><Link className="poi-return" href="/contributions">View your contributions</Link><br/><Link className="poi-return" href="/advertisements">Return to advertisements</Link></section>}
        </section>
      </div>}
      <p className="poi-detail-footer">Unsent text stays in memory and clears on reload. No recommendation payload is put in localStorage, sessionStorage or a share URL. Submitted synthetic intake is retained privately; this is not an enrolled-student or ownership verification system.</p>
    </main></div>;
}
