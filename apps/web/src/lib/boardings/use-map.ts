'use client';
import { useEffect,useState } from 'react';
import { BoardingMapPageSchema } from '@unihood/contracts';
// No persistent snapshots, SW/HTTP cache or retained geometry on refresh/error.
// Five-second polling is best effort, not an offline/external-copy revocation SLA.
export function useBoardingMap(active:boolean,q:string,page:string){
 const [attempt,setAttempt]=useState(0),key=active?`${q}:${page}:${attempt}`:'';
 const [result,setResult]=useState<{key:string;data?:ReturnType<typeof BoardingMapPageSchema.parse>;failed?:boolean}>({key:''});
 useEffect(()=>{
  if(!active)return;const controller=new AbortController();let live=true;const timer=setTimeout(()=>controller.abort(),4500);
  const params=new URLSearchParams({page,pageSize:'20'});if(q)params.set('q',q);
  fetch('/api/boardings/map?'+params,{cache:'no-store',credentials:'omit',redirect:'error',signal:controller.signal}).then(async r=>{if(!r.ok)throw new Error();return BoardingMapPageSchema.parse(await r.json());}).then(data=>{if(live)setResult({key,data});}).catch(()=>{if(live)setResult({key,failed:true});}).finally(()=>clearTimeout(timer));
  // Clear the response itself, not only its render key. Otherwise leaving this
  // layer and returning with the same URL could revive a previously public pin
  // before the new policy read completes.
  return()=>{live=false;controller.abort();clearTimeout(timer);setResult({key:''});};
 },[active,q,page,key]);
 useEffect(()=>{if(!active)return;const refresh=()=>setAttempt(v=>v+1),visibility=()=>{refresh();};const timer=setInterval(refresh,5000);window.addEventListener('focus',refresh);window.addEventListener('online',refresh);window.addEventListener('offline',refresh);window.addEventListener('pageshow',refresh);document.addEventListener('visibilitychange',visibility);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('online',refresh);window.removeEventListener('offline',refresh);window.removeEventListener('pageshow',refresh);document.removeEventListener('visibilitychange',visibility);};},[active]);
 return {data:active&&result.key===key?result.data:undefined,failed:active&&result.key===key&&result.failed,loading:active&&(result.key!==key||!result.data&&!result.failed),retry:()=>setAttempt(v=>v+1)};
}
