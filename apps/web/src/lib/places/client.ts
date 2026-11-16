'use client';
import { useEffect,useState } from 'react';
import { PoiPageSchema,PoiCategoryPageSchema, type RuntimeSchema } from '@unihood/contracts';
import type { ExploreState } from '../explore/query';
export function publicAreaBounds(location:{lat:number;lng:number}){
  const rounded=(x:number)=>Number(x.toFixed(6));
  return [Math.max(-180,rounded(location.lng-.01)),Math.max(-90,rounded(location.lat-.01)),Math.min(180,rounded(location.lng+.01)),Math.min(90,rounded(location.lat+.01))].join(',');
}
function usePage<T>(url:string|null,schema:RuntimeSchema<T>){
 const [attempt,setAttempt]=useState(0),key=`${url}:${attempt}`;
 const [result,setResult]=useState<{key:string;data?:T;failed?:boolean}>({key:''});
 useEffect(()=>{if(!url)return;const controller=new AbortController();let active=true;const timer=setTimeout(()=>controller.abort(),7000);
 fetch(url,{signal:controller.signal,cache:'no-store',credentials:'omit'}).then(async r=>{if(!r.ok)throw new Error();return schema.parse(await r.json());}).then(data=>{if(active)setResult({key,data});}).catch(()=>{if(active)setResult({key,failed:true});}).finally(()=>clearTimeout(timer));
 return()=>{active=false;clearTimeout(timer);controller.abort();};},[url,key,schema]);
 return {data:result.key===key?result.data:undefined,failed:result.key===key&&result.failed,loading:Boolean(url)&&(result.key!==key||(!result.data&&!result.failed)),retry:()=>setAttempt(x=>x+1)};
}
export function usePublicPois(state:ExploreState,location?:{lat:number;lng:number}){
 const bbox=location?publicAreaBounds(location):null,active=state.category==='essentials'&&bbox!==null;
 const query=new URLSearchParams({bbox:bbox??'',page:state.poiPage,pageSize:'20',sort:state.poiSort});
 if(state.q)query.set('q',state.q);if(state.poiCategory)query.set('category',state.poiCategory);
 const places=usePage(active?`/api/places?${query}`:null,PoiPageSchema);
 const categories=usePage(active?`/api/place-categories?${new URLSearchParams({bbox:bbox??''})}`:null,PoiCategoryPageSchema);
 return {places,categories};
}
