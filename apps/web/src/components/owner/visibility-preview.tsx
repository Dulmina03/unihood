'use client';
import { useEffect,useRef,useState } from 'react';
import { OwnerVisibilityPreviewSchema,OwnerVisibilityPreviewInputSchema,type OwnerVisibilityPreview,type OwnerWizardDraft } from '@unihood/contracts';
import { Badge,Button,Notice,Skeleton } from '@unihood/ui';
import { ownerProperty } from '../../lib/owner/draft';
export function OwnerVisibilityPreview({endpoint,draft}:{endpoint:string;draft:Pick<OwnerWizardDraft,'requestedVisibility'|'locality'>}){
 const [consent,setConsent]=useState(false),[copies,setCopies]=useState(false),[entrance,setEntrance]=useState(''),[result,setResult]=useState<OwnerVisibilityPreview|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const pending=useRef<AbortController|null>(null),heading=useRef<HTMLHeadingElement>(null);
 useEffect(()=>()=>{pending.current?.abort();pending.current=null;},[]);
 useEffect(()=>{if(result)heading.current?.focus();},[result]);
 function clear(){pending.current?.abort();pending.current=null;setResult(null);setError('');setBusy(false);}
 async function preview(){clear();const input=OwnerVisibilityPreviewInputSchema.safeParse(draft.requestedVisibility==='HIDDEN'?{visibility:'HIDDEN'}:draft.requestedVisibility==='AREA_ONLY'?{visibility:'AREA_ONLY',locality:draft.locality}:{visibility:'PUBLIC_MAP',entranceFixture:entrance,publicMapConsent:consent,externalCopiesAcknowledged:copies});
  if(!input.success){setError('Select the fictional entrance and explicitly acknowledge both public-map implications before previewing.');return;}
  const controller=new AbortController();pending.current=controller;setBusy(true);const timer=setTimeout(()=>controller.abort(),7000);
  try{const response=await fetch(endpoint.replace(/draft-check$/,'visibility-preview'),{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(input.data),cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal});if(!response.ok)throw new Error();const data=OwnerVisibilityPreviewSchema.parse(await response.json());
   if(data.preview.id!==ownerProperty||data.preview.visibility!==draft.requestedVisibility||data.preview.publisherKind!=='OWNER_OFFICIAL'||(input.data.visibility==='AREA_ONLY'&&data.preview.locationLabel!==input.data.locality))throw new Error();
   if(pending.current===controller)setResult(data);
  }catch{if(pending.current===controller)setError('Preview unavailable. Check the local owner configuration and retry. No publication or saved location changed.');}finally{clearTimeout(timer);if(pending.current===controller)setBusy(false);}
 }
 return <section className="owner-visibility-preview" aria-label="Server visibility preview"><h3>See what this mode would share</h3><p>This uses a curated fictional template. Your unsent title, description and media are not approved or published by a preview.</p>
 {draft.requestedVisibility==='PUBLIC_MAP'&&<fieldset><legend>Explicit public-map preview consent</legend><label className="owner-label">Fictional entrance<select value={entrance} onChange={e=>{clear();setEntrance(e.target.value);setConsent(false);setCopies(false);}}><option value="">Choose an entrance</option><option value="synthetic-courtyard-entrance">Synthetic courtyard entrance · fictional fixture</option></select></label><label><input type="checkbox" checked={consent} onChange={e=>{clear();setConsent(e.target.checked);}}/>I explicitly choose to show this fictional entrance in the public-map preview.</label><label><input type="checkbox" checked={copies} onChange={e=>{clear();setCopies(e.target.checked);}}/>I understand that future public locations may be copied externally and those copies may not be retractable.</label></fieldset>}
 <div className="owner-controls"><Button variant="secondary" busy={busy} onClick={()=>void preview()}>Preview selected visibility</Button><Button variant="quiet" onClick={clear}>Clear visibility preview</Button></div>
 {busy&&<Skeleton label="Loading server visibility preview…"/>}{error&&<p role="alert">{error}</p>}
 {result&&<div className="owner-preview-result"><h3 ref={heading} tabIndex={-1}>Student-facing preview · synthetic template</h3><Badge tone="warning">Owner flow · synthetic authority only</Badge><h4>{result.preview.title}</h4><p>{result.preview.visibility==='HIDDEN'?'Location hidden. No locality, address, map pin, precise distance or route is shared.':result.preview.visibility==='AREA_ONLY'?`Area only: ${result.preview.locationLabel}. No exact point, distance or route is shared.`:`Public-map preview: fictional entrance latitude ${result.preview.entrance!.lat}, longitude ${result.preview.entrance!.lng}. This is not a real destination.`}</p><p>Price not provided by owner. Availability unknown.</p><Notice title="Preview only · nothing published">No listing, map pin, route, contact, image or ownership verification is created. Publication and revocation follow their separate controls.</Notice></div>}
 </section>;
}
