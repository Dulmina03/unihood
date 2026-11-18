'use client';
import Link from 'next/link';
import { Badge, Notice } from '@unihood/ui';
import type { BoardingDuplicateResult } from '@unihood/contracts';
export function BoardingDuplicateChoices({result,busy,choice,reason,onChoice,onReason}:{result:BoardingDuplicateResult|null;busy:boolean;choice:string;reason:string;onChoice:(value:string)=>void;onReason:(value:string)=>void}){
 if(!result)return busy?<p role="status">Checking public advertisement matches…</p>:null;
 return <div className="boarding-duplicate-choices">
  <p>These public-text matches are suggestions, not proof of identity. No private location, contact or distance is used.</p>
  {(result.incomplete||result.hasMore)&&<Notice kind="warning" title="More review may be needed">This bounded check is incomplete. A missing result never clears a suggestion as new.</Notice>}
  {!result.candidates.length&&<p>No public advertisement match was returned. Private pending submissions are not shown; your suggestion will remain held.</p>}
  <fieldset disabled={busy}><legend>Choose how to keep this suggestion</legend>
   {result.candidates.map(candidate=><article className="duplicate-candidate" key={candidate.boardingId}>
    <Badge tone="warning">Possible public match · requires review</Badge><h4>{candidate.title}</h4>
    <Badge tone="neutral">{candidate.publisherKind==='OWNER_OFFICIAL'?'Owner-posted · synthetic authority only':'Community-submitted · not owner-verified'}</Badge>
    <p>{candidate.visibility==='HIDDEN'?'Location not shared':`${candidate.locality} · broad locality only`}</p>
    <p>Public-name signal {candidate.nameScore}/100 · heuristic, not probability.</p>
    <label><input type="radio" name="boarding-resolution" checked={choice===candidate.boardingId} onChange={()=>onChoice(candidate.boardingId)}/> Suggest information about {candidate.title}</label>
    <Link className="poi-return" href={`/boardings/${candidate.boardingId}`}>Inspect public advertisement</Link>
   </article>)}
   <label className="proposal-confirmation"><input type="radio" name="boarding-resolution" checked={choice==='distinct'} onChange={()=>onChoice('distinct')}/> Keep separate and hold for review</label>
   {choice==='distinct'&&<div className="duplicate-label"><label htmlFor="boarding-distinction">Why should this stay separate?</label><textarea id="boarding-distinction" required minLength={15} maxLength={240} value={reason} onChange={event=>onReason(event.target.value)} aria-describedby="boarding-distinction-hint"/><small id="boarding-distinction-hint">15–240 characters. Describe a different operator or other permitted context, never a private address, contact or exact location.</small></div>}
  </fieldset>
 </div>;
}
