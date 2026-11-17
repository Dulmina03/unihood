'use client';
import { useEffect, useRef, useState } from 'react';
import { Button, Icon } from '@unihood/ui';
import { en } from '../../lib/i18n/en';
import { mapAttribution, type MapProvider } from '../../lib/maps/provider';
import type { PublicMapPoint } from '../../lib/maps/points';
import type { MapHandle, MapState } from '../../lib/maps/runtime';
export type MapStatus = MapState | 'missing' | 'invalid';
const messages: Record<Exclude<MapStatus, 'ready'>, string> = {
  missing: 'No map provider is configured. Public campus entrances remain available in the list.',
  invalid: 'Map configuration is unavailable. Public campus entrances remain available in the list.',
  loading: 'Loading the map… You can continue browsing public entrances in the list.',
  network: 'The map could not load. Check your connection or try again; your selections are kept.',
  webgl: 'Interactive maps are unavailable in this browser. Try again or use the accessible list.',
  context: 'The map graphics connection was lost. Restart the map or continue in the list.',
};
export function CampusMap({provider, points, selected, expanded, onSelect, onShowList, onStatus}: {provider: MapProvider; points: PublicMapPoint[]; selected: string; expanded: boolean; onSelect: (id: string) => void; onShowList: () => void; onStatus: (status: MapStatus) => void}) {
  const [demonstration, setDemonstration] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [status, setStatus] = useState<MapStatus>(provider.kind === 'openfreemap' ? 'loading' : provider.kind);
  const container = useRef<HTMLDivElement>(null);
  const engine = useRef<MapHandle | null>(null);
  const latest = useRef({points, selected, expanded, onSelect, onStatus});
  useEffect(() => {latest.current = {points, selected, expanded, onSelect, onStatus};}, [points, selected, expanded, onSelect, onStatus]);
  useEffect(() => {
    let active = true, timedOut = false;
    const publish = (next: MapStatus, demo = false) => {if (active) {setDemonstration(demo); setStatus(next); latest.current.onStatus(next);}};
    if (provider.kind !== 'openfreemap') {publish(provider.kind); return;}
    publish('loading');
    const importTimer = setTimeout(() => {timedOut = true; publish('network');}, 10000);
    import('../../lib/maps/runtime').then(({mountMap}) => {
      clearTimeout(importTimer);
      if (!active || timedOut || !container.current) return;
      engine.current = mountMap(container.current, provider, publish, (id) => latest.current.onSelect(id));
      engine.current.update(latest.current.points, latest.current.selected, latest.current.expanded);
    }).catch(() => {clearTimeout(importTimer); publish('network');});
    return () => {active = false; clearTimeout(importTimer); engine.current?.destroy(); engine.current = null;};
  }, [provider, attempt]);
  useEffect(() => {engine.current?.update(points, selected, expanded);}, [points, selected, expanded]);
  // Fit after the ready legend mounts, so pin visibility accounts for its overlay.
  useEffect(() => {if (status === 'ready') engine.current?.fit();}, [status]);
  return <>
    <div className="campus-map-canvas" ref={container} hidden={status !== 'ready' && status !== 'loading'} />
    {status !== 'ready' && <div className="explore-map-message"><span className="explore-compass"><Icon name="compass" /></span><p className="explore-kicker">A LITTLE CLOSER TO CAMPUS</p><h2>{en.explore.mapTitleLead}<br /><em>{en.explore.mapTitleEnd}</em></h2><p role="status">{messages[status]}</p><div className="campus-map-actions">{['network', 'webgl', 'context'].includes(status) && <Button variant="secondary" onClick={() => setAttempt((value) => value + 1)}>Retry map</Button>}<Button onClick={onShowList}>{en.explore.exploreList} <Icon name="arrow" /></Button></div><span className="explore-provider-note">Walking routes are unavailable. The list remains usable.</span></div>}
    {provider.kind === 'openfreemap' && <>
      <div className="campus-map-attribution" aria-label="Map attribution">{mapAttribution.map((item) => <a key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">{item.label}<span className="uh-sr-only"> (opens a new tab)</span></a>)}</div>
      {status === 'ready' && <div className="campus-map-legend"><span><i aria-hidden="true" /> {points.some(point => 'kind' in point) ? 'Consented public places' : 'Public campus entrance'}</span>{demonstration && <strong className="campus-map-demo">Mock map resources · synthetic geometry</strong>}<span>{points.some((point) => point.provenance.dataKind === 'SYNTHETIC') ? points.some(point => 'kind' in point) ? 'Synthetic public places · not real locations' : 'Synthetic gates · not real locations' : 'Eligible public places only'}</span><Button variant="secondary" disabled={!points.length} onClick={() => engine.current?.fit()}>{points.some(point=>'kind' in point)?'Recenter public places':'Recenter gates'} <Icon name="compass" /></Button></div>}
    </>}
  </>;
}
