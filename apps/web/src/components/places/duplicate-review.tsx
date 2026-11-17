'use client';
import Link from 'next/link';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { DuplicateCheckInputSchema, DuplicateCheckResultSchema, DuplicateChoiceSchema, type DuplicateCheckResult } from '@unihood/contracts';
import { Badge, Button, Field, Notice, SiteHeader } from '@unihood/ui';
const categories=[['pharmacy','Pharmacy'],['clinic','Clinic'],['restaurant','Restaurant'],['grocery','Grocery'],['hardware','Hardware'],['laundry','Laundry'],['printing','Printing'],['repair','Repair'],['transport','Transport'],['atm','ATM'],['other','Other public service']];
export function DuplicateReview({endpoint}:{endpoint:string|null}){
 const [name,setName]=useState(''),[category,setCategory]=useState('pharmacy'),[lat,setLat]=useState(''),[lng,setLng]=useState('');
 const [result,setResult]=useState<DuplicateCheckResult|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState(''),[choice,setChoice]=useState(''),[reason,setReason]=useState(''),[message,setMessage]=useState('');
 const pending=useRef<AbortController|null>(null),summary=useRef<HTMLHeadingElement>(null),submit=useRef<HTMLFormElement>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 function reset(){pending.current?.abort();pending.current=null;setBusy(false);setResult(null);setChoice('');setReason('');setMessage('');setError('');}
 async function check(event:FormEvent){
  event.preventDefault();reset();
  const parsed=DuplicateCheckInputSchema.safeParse({kind:'POI',name,category,location:{lat:lat.trim()?Number(lat):NaN,lng:lng.trim()?Number(lng):NaN}});
  if(!parsed.success||!endpoint){setError('Enter a public business name, category and valid public entrance coordinates. Never enter a private residence.');return;}
  const controller=new AbortController();pending.current=controller;setBusy(true);const timer=setTimeout(()=>controller.abort(),7000);
  try{
   const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(parsed.data),credentials:'omit',cache:'no-store',redirect:'error',signal:controller.signal});
   if(pending.current!==controller)return;
   if(response.status===401||response.status===403)throw new Error('Authorization is required. Only explicitly configured loopback local/test contributors can check matches in this development phase.');
   if(response.status===429)throw new Error('Too many checks. Wait one minute, then try again.');
   if(!response.ok)throw new Error();
   const data=DuplicateCheckResultSchema.parse(await response.json());
   if(pending.current!==controller)return;setResult(data);requestAnimationFrame(()=>summary.current?.focus());
  }catch(cause){if(pending.current===controller)setError(cause instanceof Error&&/^(Authorization is required\.|Too many checks\.)/.test(cause.message)?cause.message:'Match checking is unavailable. Check your connection and retry. No result means no clearance to create.');}
  finally{clearTimeout(timer);if(pending.current===controller)setBusy(false);}
 }
 function decide(event:FormEvent){event.preventDefault();if(!result)return;
  const candidate=choice.startsWith('update:')?result.candidates.find(item=>choice===`update:${item.id}`):null;
  const parsed=DuplicateChoiceSchema.safeParse(candidate?{action:'suggest_update',placeId:candidate.id}:{action:'continue_as_distinct_with_reason',reason});
  if(!parsed.success){setMessage('Explain the public business distinction in 15–500 characters. Avoid private addresses, contacts and personal details.');return;}
  setMessage(candidate?`Update choice prepared for ${candidate.name}. No correction has been sent. Open the existing public record below to inspect it.`:'Distinct-place choice prepared for this review only. It remains subject to evidence review and a final server recheck. Nothing has been created or published.');
 }
 return <div className="poi-detail-page"><a className="skip-link" href="#duplicate-main">Skip to content</a><SiteHeader edition="PUBLIC PLACE REVIEW" status="Development preview" items={[{label:'Explore Map',href:'/explore'},{label:'Saved favourites',href:'/saved'}]} />
 <main id="duplicate-main" tabIndex={-1} className="poi-detail-main"><Link href="/explore" className="poi-return">← Back to public exploration</Link>
 <header className="poi-detail-heading"><p className="explore-kicker">KEEP ONE PLACE · KEEP ITS STORY</p><h1>Have we met this place?</h1><p>Check existing public services before suggesting something new.</p></header>
 <Notice title="A review, not a submission" kind="warning">This check only considers already-public POIs. It never creates or merges a place. Proposal submission is not available yet. Development fixtures are synthetic; their coordinates are not destinations to visit. Do not enter private boarding locations, phone numbers or ownership claims.</Notice>
 {!endpoint?<Notice title="Contributor checks are unavailable">Public browsing still works. Match checking is restricted to explicitly configured loopback local/test development until final authentication.</Notice>:<div className="poi-detail-grid duplicate-grid">
 <form onSubmit={check} onChange={reset} ref={submit} className="duplicate-form" aria-label="Check a public place"><h2>The public entrance</h2>
 <Field label="Public business name" value={name} maxLength={200} required onChange={e=>setName(e.target.value)} autoComplete="off" />
 <label className="duplicate-label">Public service category<select value={category} onChange={e=>setCategory(e.target.value)}>{categories.map(([code,label])=><option key={code} value={code}>{label}</option>)}</select></label>
 <Field label="Public entrance latitude" value={lat} required inputMode="decimal" onChange={e=>setLat(e.target.value)} hint="−90 to 90. Public business entrances only." />
 <Field label="Public entrance longitude" value={lng} required inputMode="decimal" onChange={e=>setLng(e.target.value)} hint="−180 to 180. No device location is collected." />
 <Button busy={busy} type="submit">Check possible matches</Button>{busy&&<p role="status">Checking public place matches…</p>}
 {error&&<p role="alert">{error} You can use Check possible matches to retry.</p>}
 </form>
 <section className="duplicate-results" aria-labelledby="duplicate-results-title"><h2 id="duplicate-results-title" ref={summary} tabIndex={-1}>{result?'Review possible matches':'Make room for the right place.'}</h2>
 {!result?<p>A name or shared entrance is a clue, never proof that two businesses are the same.</p>:<>
 <p>{result.candidates.length?'These are suggestions, not verified identities. Scores are not probabilities.':'No public matches were returned. This is not proof that the place is new.'}</p>
 {(result.hasMore||result.incomplete)&&<Notice kind="warning" title="This check is incomplete">More candidates or evidence may exist. A distinct choice never bypasses the final check or review.</Notice>}
 <form onSubmit={decide}><fieldset><legend>Choose what to review</legend>
 {result.candidates.map(item=><article key={item.id} className="duplicate-candidate"><Badge tone="warning">{item.classification==='STRONG_CANDIDATE'?'Strong candidate':item.classification==='REVIEW_REQUIRED'?'Needs contextual review':'Possible match'}</Badge><h3>{item.name}</h3><p>{item.category} · Heuristic ranking {item.score}/100, not a probability</p><p>{item.signals.sameBuilding?'A shared public building does not prove the same business. ':''}{!item.signals.categoryMatch?'Categories differ; review the business identity. ':''}No distance, private evidence or ownership authority is provided.</p>
 <label><input type="radio" name="resolution" value={`update:${item.id}`} checked={choice===`update:${item.id}`} onChange={()=>{setChoice(`update:${item.id}`);setReason('');setMessage('');}} /> Suggest update to {item.name}</label><Link className="poi-return" href={`/places/${item.id}`}>Inspect public record for {item.name}</Link></article>)}
 <label className="duplicate-distinct"><input type="radio" name="resolution" checked={choice==='distinct'} onChange={()=>{setChoice('distinct');setMessage('');}} /> Continue as a distinct public place with a reason</label>
 {choice==='distinct'&&<label className="duplicate-label">Why is this a separate public business?<textarea value={reason} maxLength={500} minLength={15} required onChange={e=>{setReason(e.target.value);setMessage('');}} aria-describedby="distinct-hint" /><small id="distinct-hint">15–500 characters. Describe a public business distinction, not a private address, contact or owner claim. This reason stays in memory and is not sent or stored.</small></label>}
 <div className="uh-button-row"><Button type="submit" disabled={!choice}>Prepare review choice</Button><Button type="button" variant="secondary" onClick={()=>{reset();requestAnimationFrame(()=>submit.current?.querySelector('button')?.focus());}}>Cancel review</Button></div>
 </fieldset></form><p role="status">{message}</p>
 </>}
 </section></div>}
 <p className="poi-detail-footer">No reason, draft, location or candidate list is saved to storage or placed in a share URL. Reloading clears this review. Existing public records remain unchanged.</p></main></div>;
}
