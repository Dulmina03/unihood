'use client';
import { useEffect,useRef,useState } from 'react';
import { Button } from '@unihood/ui';
import { mapAttribution,type MapProvider } from '../../lib/maps/provider';
type Point={lat:number;lng:number};
export function DraftPoiMap({point,onMove,provider}:{point:Point;onMove:(point:Point)=>void;provider:MapProvider}){
 const mapCompatible=Math.abs(point.lat)<=85.0511;
 const [enabled,setEnabled]=useState(false),[attempt,setAttempt]=useState(0),[status,setStatus]=useState('loading'),[demo,setDemo]=useState(false);
 const container=useRef<HTMLDivElement>(null),engine=useRef<ReturnType<typeof import('../../lib/maps/draft-runtime').mountDraftMap>|null>(null),latest=useRef({point,onMove});
 useEffect(()=>{latest.current={point,onMove};engine.current?.update(point);},[point,onMove]);
 useEffect(()=>{
  let active=true,timedOut=false;if(!enabled||provider.kind!=='openfreemap'||!mapCompatible)return;
  const timer=setTimeout(()=>{if(active){timedOut=true;setStatus('network');}},12000);
  import('../../lib/maps/draft-runtime').then(({mountDraftMap})=>{if(!active||timedOut||!container.current)return;clearTimeout(timer);setStatus('loading');engine.current=mountDraftMap(container.current,provider,latest.current.point,value=>latest.current.onMove(value),(state,mock)=>{if(active){clearTimeout(timer);setStatus(state);setDemo(Boolean(mock));}});}).catch(()=>{if(active){clearTimeout(timer);setStatus('network');}});
  return()=>{active=false;clearTimeout(timer);engine.current?.destroy();engine.current=null;};
 },[enabled,attempt,provider,mapCompatible]);
 return <section className="proposal-location" aria-label="Draft public entrance placement"><h3>Place the public entrance</h3><p>Synthetic draft point · not a published pin or a destination to visit. Coordinate fields and adjustment buttons work without a map.</p>
 <div className="proposal-nudges" aria-label="Adjust draft entrance coordinates">{[['North',0.0001,0],['South',-0.0001,0],['East',0,0.0001],['West',0,-0.0001]].map(([label,lat,lng])=><Button key={label} variant="secondary" disabled={(label==='North'&&point.lat>=90)||(label==='South'&&point.lat<=-90)||(label==='East'&&point.lng>=180)||(label==='West'&&point.lng<=-180)} onClick={()=>onMove({lat:Math.max(-90,Math.min(90,Number((point.lat+Number(lat)).toFixed(6)))),lng:Math.max(-180,Math.min(180,Number((point.lng+Number(lng)).toFixed(6))))})}>Move entrance {String(label).toLowerCase()}</Button>)}</div>
 {provider.kind!=='openfreemap'||!mapCompatible?<p role="status">Map preview unavailable. Keep using the coordinate fields; no location is guessed.</p>:!enabled?<><p>Loading the optional OpenFreeMap preview sends the viewed area around these draft coordinates to that map service, including later adjustments. No GPS is requested.</p><Button variant="secondary" onClick={()=>{setStatus('loading');setEnabled(true);}}>Load optional draft map</Button></>:<>
 <div ref={container} className="proposal-map-canvas" hidden={!['ready','loading'].includes(status)} />
 <p role="status">{status==='ready'?'Drag the draft pin, or use the coordinate fields and adjustment buttons.':status==='loading'?'Loading draft map…':'Draft map unavailable. The coordinate fields remain usable.'}</p>
 {demo&&<strong>Mock map resources · synthetic geometry</strong>}
 {!['ready','loading'].includes(status)&&<Button variant="secondary" onClick={()=>{setStatus('loading');setAttempt(value=>value+1);}}>Retry draft map</Button>}
 <Button variant="quiet" onClick={()=>setEnabled(false)}>Close draft map</Button><p className="proposal-attribution">{mapAttribution.map(item=><a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">{item.label}<span className="uh-sr-only"> (opens a new tab)</span></a>)}</p>
 </>}
 </section>;
}
