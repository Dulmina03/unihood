import * as gl from 'maplibre-gl';
import { allowedMapResource,styleUrl,type MapProvider } from './provider';
import { PublicCoordinateSchema } from '@unihood/contracts';
type Point={lat:number;lng:number};
export function mountDraftMap(container:HTMLElement,provider:Extract<MapProvider,{kind:'openfreemap'}>,point:Point,onMove:(point:Point)=>void,onState:(state:string,demo?:boolean)=>void){
 gl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs',import.meta.url).toString());gl.setWorkerCount(2);
 let current={...point};
 let map:gl.Map|undefined,marker:gl.Marker|undefined,observer:ResizeObserver|undefined,timer:ReturnType<typeof setTimeout>|undefined,disposed=false;
 const destroy=()=>{if(disposed)return;disposed=true;clearTimeout(timer);observer?.disconnect();marker?.off('dragend',moved);marker?.remove();if(map){map.off('load',loaded);map.off('error',failed);map.off('webglcontextlost',lost);map.remove();}};
 const fail=(message:string)=>{if(!disposed){destroy();onState(message);}};
 const moved=()=>{if(!disposed&&marker){const value=marker.getLngLat();const parsed=PublicCoordinateSchema.safeParse({lat:Number(value.lat.toFixed(6)),lng:Number(value.lng.toFixed(6))});if(parsed.success)onMove(parsed.data);else marker.setLngLat([current.lng,current.lat]);}};
 const loaded=()=>{if(!disposed){clearTimeout(timer);onState('ready',(map?.getStyle().metadata as Record<string,unknown>|undefined)?.['unihood:demo']===true);}};
 const failed=()=>fail('network'),lost=(event:gl.MapContextEvent)=>{event.originalEvent.preventDefault();fail('context');};
 try{
  map=new gl.Map({container,style:styleUrl(provider),center:[point.lng,point.lat],zoom:16,maxZoom:18,minZoom:1,renderWorldCopies:false,attributionControl:false,trackResize:false,
   transformRequest:url=>{if(!allowedMapResource(url))throw new Error('Disallowed map resource');return {url,credentials:'same-origin',referrerPolicy:'no-referrer'};}});
  map.addControl(new gl.NavigationControl({showCompass:false}),'top-right');map.getCanvas().setAttribute('aria-label','Draft public business map. Arrow keys pan; plus and minus zoom. Use coordinate fields or entrance adjustment buttons for keyboard placement.');
  const element=document.createElement('div');element.className='proposal-draft-pin';element.textContent='+';element.setAttribute('aria-hidden','true');
  marker=new gl.Marker({element,draggable:true}).setLngLat([point.lng,point.lat]).addTo(map);marker.on('dragend',moved);
  map.on('load',loaded);map.on('error',failed);map.on('webglcontextlost',lost);observer=new ResizeObserver(()=>map?.resize());observer.observe(container);timer=setTimeout(()=>fail('network'),12000);
 }catch{fail('webgl');}
 return {destroy,update(next:Point){if(!disposed&&map&&marker&&(next.lat!==current.lat||next.lng!==current.lng)){current={...next};marker.setLngLat([next.lng,next.lat]);map.jumpTo({center:[next.lng,next.lat]});}}};
}
