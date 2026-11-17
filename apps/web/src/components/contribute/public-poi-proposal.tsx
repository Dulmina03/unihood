'use client';
import Link from 'next/link';
import { useEffect,useRef,useState,type FormEvent } from 'react';
import { DuplicateCheckInputSchema,DuplicateCheckResultSchema,PublicCoordinateSchema,PublicPoiProposalInputSchema,PublicPoiProposalResultSchema,type DuplicateCheckResult,type PublicPoiProposalResult } from '@unihood/contracts';
import { Badge,Button,Field,Notice,SiteHeader } from '@unihood/ui';
import type { MapProvider } from '../../lib/maps/provider';
import { DraftPoiMap } from './draft-poi-map';
const categories=[['pharmacy','Pharmacy'],['clinic','Clinic'],['restaurant','Restaurant'],['grocery','Grocery'],['hardware','Hardware'],['laundry','Laundry'],['printing','Printing'],['repair','Repair'],['transport','Transport'],['atm','ATM'],['other','Other public service']];
export function PublicPoiProposal({endpoint,provider}:{endpoint:string|null;provider:MapProvider}){
 const [name,setName]=useState(''),[category,setCategory]=useState('pharmacy'),[lat,setLat]=useState(''),[lng,setLng]=useState(''),[source,setSource]=useState(''),[confirmed,setConfirmed]=useState(false);
 const [matches,setMatches]=useState<DuplicateCheckResult|null>(null),[choice,setChoice]=useState(''),[reason,setReason]=useState(''),[busy,setBusy]=useState(''),[error,setError]=useState(''),[receipt,setReceipt]=useState<PublicPoiProposalResult|null>(null);
 const pending=useRef<AbortController|null>(null),identity=useRef<{body:string;key:string}|null>(null),reviewHeading=useRef<HTMLHeadingElement>(null),statusHeading=useRef<HTMLHeadingElement>(null),form=useRef<HTMLFormElement>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 // Focus only after React commits the corresponding result heading to the DOM.
 useEffect(()=>{if(matches)reviewHeading.current?.focus();},[matches]);
 useEffect(()=>{if(receipt)statusHeading.current?.focus();},[receipt]);
 const point=PublicCoordinateSchema.safeParse({lat:lat.trim()?Number(lat):NaN,lng:lng.trim()?Number(lng):NaN});
 const draft=()=>DuplicateCheckInputSchema.safeParse({kind:'POI',name,category,location:{lat:Number(lat),lng:Number(lng)}});
 function invalidate(){pending.current?.abort();pending.current=null;setBusy('');setError('');setReceipt(null);identity.current=null;setMatches(null);setChoice('');setReason('');}
 function resolutionChanged(){pending.current?.abort();pending.current=null;setBusy('');setReceipt(null);setError('');}
 function move(value:{lat:number;lng:number}){invalidate();setLat(String(value.lat));setLng(String(value.lng));}
 async function request(url:string,body:unknown,kind:'check'|'submit'){
  pending.current?.abort();const controller=new AbortController();pending.current=controller;setBusy(kind);setError('');const timer=setTimeout(()=>controller.abort(),8000);
  try{
   const response=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});
   if(pending.current!==controller)return;
   if(!response.ok){setError(response.status===401||response.status===403?'Authorization unavailable. Enable only the explicit local/test contributor simulator.':response.status===429?'Too many requests. Wait one minute and retry.':response.status===409?'The draft conflicts with an earlier key or a changed selection/category. Check matches again before submitting.':'The request is unavailable. Your draft is kept. Retry the same unchanged submission to avoid a double tap.');return;}
   const json=await response.json();if(pending.current!==controller)return;
   if(kind==='check'){setMatches(DuplicateCheckResultSchema.parse(json));}
   else{setReceipt(PublicPoiProposalResultSchema.parse(json));}
  }catch{if(pending.current===controller)setError('The request is unavailable. Your draft is kept. Retry the same unchanged submission to avoid a double tap.');}
  finally{clearTimeout(timer);if(pending.current===controller)setBusy('');}
 }
 function check(event:FormEvent){event.preventDefault();invalidate();const parsed=draft();if(!parsed.success||!point.success||!confirmed||!name.trim().startsWith('Synthetic')||source.trim().length<8){setError('Use a Synthetic-prefixed public business name, valid entrance coordinates, source note and public-business confirmation. Never enter a residence.');return;}if(endpoint)void request(endpoint,parsed.data,'check');}
 function submit(event:FormEvent){event.preventDefault();const parsed=draft();if(!parsed.success||!matches||!endpoint)return;
  const resolution=choice.startsWith('update:')?{action:'suggest_update',placeId:choice.slice(7)}:{action:'continue_as_distinct_with_reason',reason};
  if(choice.startsWith('update:')&&!matches.candidates.some(item=>item.id===choice.slice(7))){setError('Choose a current public candidate.');return;}
  const payload={draft:parsed.data,resolution,sourceNote:source,publicBusinessConfirmed:confirmed};const serialized=JSON.stringify(payload);
  if(identity.current?.body!==serialized)identity.current={body:serialized,key:crypto.randomUUID()};
  const input=PublicPoiProposalInputSchema.safeParse({key:identity.current.key,...payload});if(!input.success){setError('Choose a review action and provide a 15–500 character business distinction without private details.');return;}
  void request(endpoint.replace(/\/duplicates\/check$/,'/places/proposals'),input.data,'submit');
 }
 return <div className="poi-detail-page"><a className="skip-link" href="#proposal-main">Skip to content</a><SiteHeader edition="PUBLIC PLACE CONTRIBUTIONS" status="Synthetic local preview" items={[{label:'Explore Map',href:'/explore'},{label:'Saved favourites',href:'/saved'}]} />
 <main id="proposal-main" tabIndex={-1} className="poi-detail-main"><Link className="poi-return" href="/explore">← Back to public exploration</Link><header className="poi-detail-heading"><p className="explore-kicker">A USEFUL PLACE · A CLEAR SOURCE</p><h1>Add a public place.</h1><p>A small contribution, with space for uncertainty.</p></header>
 <Notice title="Public services only · synthetic development" kind="warning">This is a local/test proposal flow, not live publication. Use fictional Synthetic-prefixed business names and explicitly synthetic coordinates. Students cannot create boarding pins. Do not enter residences, private contacts, owner claims or real availability. Nothing here establishes ownership or verification.</Notice>
 {!endpoint?<Notice title="Proposals are unavailable">Public browsing remains open. Contributions require an explicitly configured loopback local/test actor until final authentication.</Notice>:<div className="poi-detail-grid duplicate-grid proposal-grid">
 <form ref={form} onSubmit={check} className="duplicate-form" aria-label="Public place draft"><h2>1. Describe the public entrance</h2><Button variant="secondary" onClick={()=>{invalidate();setName('Synthetic Community Pharmacy');setCategory('pharmacy');setLat('0');setLng('0');setSource('Original fictional demonstration; no real business or location');setConfirmed(false);}}>Use synthetic draft example</Button>
 <Field label="Public business name" value={name} required maxLength={200} autoComplete="off" onChange={e=>{invalidate();setName(e.target.value);}} hint="Start with Synthetic. This development flow cannot publish real inventory." />
 <label className="duplicate-label">Public service category<select value={category} onChange={e=>{invalidate();setCategory(e.target.value);}}>{categories.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
 <Field label="Public entrance latitude" required inputMode="decimal" value={lat} onChange={e=>{invalidate();setLat(e.target.value);}} hint="−90 to 90; a fictional public-business entrance only." />
 <Field label="Public entrance longitude" required inputMode="decimal" value={lng} onChange={e=>{invalidate();setLng(e.target.value);}} hint="−180 to 180. No GPS is collected." />
 <Field label="Source and observation note" required minLength={8} maxLength={240} value={source} onChange={e=>{invalidate();setSource(e.target.value);}} hint="8–240 characters. Describe the synthetic source; no private addresses, phones or links." />
 <label className="proposal-confirmation"><input type="checkbox" checked={confirmed} required onChange={e=>{invalidate();setConfirmed(e.target.checked);}} /> This draft describes a synthetic public business entrance, never a boarding or private home.</label>
 {confirmed&&point.success&&<DraftPoiMap point={point.data} onMove={move} provider={provider} />}
 <Button type="submit" busy={busy==='check'} disabled={Boolean(busy)}>Check possible matches</Button><Button variant="quiet" onClick={()=>{invalidate();setName('');setLat('');setLng('');setSource('');setConfirmed(false);form.current?.querySelector('input')?.focus();}}>Clear unsent draft</Button>
 </form>
 <section className="duplicate-results" aria-label="Proposal review and status"><h2 ref={reviewHeading} tabIndex={-1}>2. Review possible matches</h2>
 {!matches?<p>Start with a public business and a source. Matching suggestions are clues, never verified identity or publication approval.</p>:<form onSubmit={submit}><p>{matches.candidates.length?'Review the public candidates before continuing.':'No public candidates were returned. Pending submissions are rechecked on the server; this is not clearance to create.'}</p>
 {(matches.incomplete||matches.hasMore)&&<Notice kind="warning" title="More review is needed">This check is incomplete. Submission cannot bypass the final server recheck.</Notice>}
 <fieldset><legend>Choose a public-place review action</legend>{matches.candidates.map(item=><article className="duplicate-candidate" key={item.id}><Badge tone="warning">Possible public match · requires review</Badge><h3>{item.name}</h3><p>{item.category} · heuristic {item.score}/100, not probability</p><label><input type="radio" name="proposal-resolution" checked={choice===`update:${item.id}`} onChange={()=>{resolutionChanged();setChoice(`update:${item.id}`);}} /> Use existing {item.name}</label><Link className="poi-return" href={`/places/${item.id}`}>Inspect existing public record</Link></article>)}
 <label className="duplicate-distinct"><input type="radio" name="proposal-resolution" checked={choice==='distinct'} onChange={()=>{resolutionChanged();setChoice('distinct');}} /> Propose a distinct public business with a reason</label>
 {choice==='distinct'&&<div className="duplicate-label"><label htmlFor="proposal-distinction">Public business distinction</label><textarea id="proposal-distinction" aria-describedby="proposal-distinction-hint" value={reason} required minLength={15} maxLength={500} onChange={e=>{resolutionChanged();setReason(e.target.value);}} /><small id="proposal-distinction-hint">15–500 characters, one paragraph. This reason is sent only when you submit the held proposal; never include private details.</small></div>}
 <Button type="submit" busy={busy==='submit'} disabled={!choice||Boolean(busy)||Boolean(receipt)}>Submit for review</Button></fieldset></form>}
 {busy&&<p role="status">{busy==='check'?'Checking public candidates…':'Submitting held proposal…'}</p>}{error&&<p role="alert">{error}</p>}
 {receipt&&<section className="proposal-receipt" aria-label="Proposal outcome"><h2 ref={statusHeading} tabIndex={-1}>3. {receipt.outcome==='PENDING_REVIEW'?(receipt.reviewState==='NEEDS_EVIDENCE'?'Needs evidence':'Pending review'):receipt.outcome==='EXISTING_PUBLIC_PLACE'?'Use the existing public record':'Further review required'}</h2>
 {receipt.outcome==='PENDING_REVIEW'?<><Badge tone="warning">Synthetic · not published</Badge><p>Your synthetic proposal was received and held. No map listing, owner claim or canonical duplicate was created.</p><p>Private receipt: <code>{receipt.proposalId}</code>. This is not a public place link.</p>{receipt.reviewState==='NEEDS_EVIDENCE'&&<p>The server flagged text for additional evidence or privacy review. No automatic approval or routine admin workflow is implied.</p>}</>:receipt.outcome==='EXISTING_PUBLIC_PLACE'?<><p>The server found a current canonical public record. No new place or correction was published.</p><Link className="poi-return" href={`/places/${receipt.placeId}`}>View existing public place</Link></>:<p>A pending/source collision or incomplete check needs further review. Your unsent draft stays here; another contributor’s private proposal is not shown. Nothing new was published.</p>}
 <Link className="poi-return" href="/explore">Return to exploration</Link></section>}
 </section></div>}
 <p className="poi-detail-footer">Unsent drafts stay in memory and clear on reload. Clearing or editing local fields never cancels a request already received by the server. Submitted synthetic proposals persist privately for review. No draft, source, location or reason is put in localStorage or share URLs. Evidence follow-up, correction submissions and publication remain later workflows.</p></main></div>;
}
