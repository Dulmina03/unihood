'use client';
import {useEffect,useRef,useState} from 'react';
import {OwnerPriceHistoryPageSchema,formatLkrMinor,type OwnerInventory} from '@unihood/contracts';
import {Button} from '@unihood/ui';
type Unit=OwnerInventory['units'][number];
export function FeeHistory({endpoint,unit}:{endpoint:string;unit:Unit}){
 const [page,setPage]=useState(1),[attempt,setAttempt]=useState(0);
 const [result,setResult]=useState<{key:string;data?:ReturnType<typeof OwnerPriceHistoryPageSchema.parse>;failed?:boolean}>({key:'1:0',data:{items:unit.priceHistory,page:{page:1,pageSize:20,hasNextPage:unit.hasMoreHistory}}});
 const title=useRef<HTMLHeadingElement>(null),focus=useRef(false),key=`${page}:${attempt}`;
 useEffect(()=>{if(page===1&&attempt===0)return;let live=true;const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),7000);
  fetch(`${endpoint}?page=${page}&pageSize=20`,{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal}).then(async response=>{if(!response.ok)throw new Error();const data=OwnerPriceHistoryPageSchema.parse(await response.json());if(data.page.page!==page||data.page.pageSize!==20)throw new Error();if(live)setResult({key,data});}).catch(()=>{if(live)setResult({key,failed:true});}).finally(()=>clearTimeout(timer));
  return()=>{live=false;clearTimeout(timer);controller.abort();};
 },[endpoint,page,attempt,key]);
 const current=result.key===key?result:undefined;
 useEffect(()=>{if(current&&focus.current){title.current?.focus();focus.current=false;}},[current]);
 function navigate(next:number){focus.current=true;setPage(next);setAttempt(v=>v+1);}
 return <section className="owner-panel"><h2 ref={title} tabIndex={-1}>Fee revision history</h2>{!current?<p role="status">Loading fee history…</p>:current.failed?<><p role="alert">History is unavailable or permission was denied. No old page is shown as current.</p><Button onClick={()=>{focus.current=true;setAttempt(v=>v+1);}}>Retry fee history</Button></>:!current.data?.items.length?<p>No price revision on this page.</p>:<ol className="owner-price-history">{current.data.items.map(r=><li key={r.revision}><strong>{formatLkrMinor(r.rentMinor)} / {r.basis.toLowerCase()} / month</strong><span>Revision {r.revision} · {r.reason.toLowerCase().replaceAll('_',' ')}</span><time dateTime={r.effectiveAt}>Effective {new Intl.DateTimeFormat('en-GB',{dateStyle:'medium',timeZone:'Asia/Colombo'}).format(new Date(r.effectiveAt))} · Asia/Colombo</time><span>Deposit {r.depositMinor===null?'not shared':formatLkrMinor(r.depositMinor)} · utilities {r.utilityTerms.toLowerCase().replaceAll('_',' ')} · meals {r.mealTerms.toLowerCase().replaceAll('_',' ')}</span></li>)}</ol>}<nav className="owner-controls" aria-label="Fee history pages"><Button variant="secondary" disabled={page===1||!current} onClick={()=>navigate(page-1)}>Previous revisions</Button><span>Page {page}</span><Button variant="secondary" disabled={!current?.data?.page.hasNextPage} onClick={()=>navigate(page+1)}>Older revisions</Button></nav></section>;
}
