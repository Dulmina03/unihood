import * as gl from 'maplibre-gl';
import { allowedMapResource, styleUrl, type MapProvider } from './provider';
import type { PublicMapPoint } from './points';
export type MapState = 'loading' | 'ready' | 'network' | 'webgl' | 'context';
export type MapHandle = {update: (points: PublicMapPoint[], selected: string, expanded: boolean) => void; fit: () => void; destroy: () => void};
export function mountMap(container: HTMLElement, provider: Extract<MapProvider, {kind: 'openfreemap'}>, onState: (state: MapState, demonstration?: boolean) => void, onSelect: (id: string) => void): MapHandle {
  gl.setWorkerUrl(new URL('maplibre-gl/dist/maplibre-gl-worker.mjs', import.meta.url).toString());
  gl.setWorkerCount(2);
  let disposed = false;
  let map: gl.Map;
  let points: PublicMapPoint[] = [], selected = '', expanded = true, signature = '';
  let markers: {marker: gl.Marker; button: HTMLButtonElement; click: () => void; id: string}[] = [];
  let observer: ResizeObserver | undefined;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const destroy = () => {
    if (disposed) return;
    disposed = true; clearTimeout(timer); observer?.disconnect();
    for (const item of markers) {item.button.removeEventListener('click', item.click); item.marker.remove();}
    markers = [];
    if (map) {map.off('load', loaded); map.off('error', failed); map.off('webglcontextlost', lost); map.off('render', syncMarkerVisibility); map.remove();}
  };
  // Do not leave a partially covered pin as a tiny click target or invisible tab stop.
  // Visibility preserves layout, so subsequent pan/resize renders can expose it again.
  const syncMarkerVisibility = () => {
    if (disposed || !map) return;
    const viewport = container.getBoundingClientRect();
    const workspace = container.closest('.explore-workspace');
    const covers = Array.from(workspace?.querySelectorAll<HTMLElement>('.explore-floating, .campus-map-attribution, .campus-map-legend, .explore-rail, .explore-preview, .explore-rail-toggle, .maplibregl-ctrl') ?? [])
      .filter((element) => element.getClientRects().length > 0).map((element) => element.getBoundingClientRect());
    for (const {button} of markers) {
      const box = button.getBoundingClientRect();
      const obscured = box.width === 0 || box.height === 0 || box.left < viewport.left || box.top < viewport.top || box.right > viewport.right || box.bottom > viewport.bottom || covers.some((cover) => box.left < cover.right && box.right > cover.left && box.top < cover.bottom && box.bottom > cover.top);
      button.style.visibility = obscured ? 'hidden' : '';
      button.tabIndex = obscured ? -1 : 0;
      if (obscured && document.activeElement === button) map.getCanvas().focus();
    }
  };
  const fail = (state: MapState) => {if (!disposed) {destroy(); onState(state);}};
  const loaded = () => {if (!disposed) {clearTimeout(timer); if ((map.getStyle().metadata as Record<string, unknown> | undefined)?.['unihood:demo'] === true) onState('ready', true); else onState('ready');}};
  const failed = () => fail('network');
  const lost = (event: gl.MapContextEvent) => {event.originalEvent.preventDefault(); fail('context');};
  const fit = () => {
    if (disposed || !map) return;
    map.resize();
    const mobile = window.innerWidth <= 700;
    const padding = {top: mobile ? 190 : 135, bottom: mobile ? (expanded ? Math.round(container.clientHeight * .55) + 12 : 80) : 80, left: window.innerWidth > 1100 && selected ? 360 : 30, right: 65};
    // Tiny/zoomed viewports still receive valid positive camera space.
    padding.bottom = Math.min(padding.bottom, Math.max(20, container.clientHeight - padding.top - 80));
    padding.left = Math.min(padding.left, Math.max(20, container.clientWidth - padding.right - 100));
    map.setPadding(padding);
    const active = points.find((point) => point.id === selected);
    if (active) map.jumpTo({center: [active.location.lng, active.location.lat], zoom: 16});
    else if (points.length) {
      const bounds = new gl.LngLatBounds(); points.forEach((point) => bounds.extend([point.location.lng, point.location.lat]));
      map.fitBounds(bounds, {maxZoom: 16, duration: 0});
    } else map.jumpTo({center: [0, 0], zoom: 1}); // Neutral world view, never a guessed campus.
  };
  onState('loading');
  try {
    map = new gl.Map({container, style: styleUrl(provider), center: [0, 0], zoom: 1, maxZoom: 18, minZoom: 1,
      attributionControl: false, renderWorldCopies: false, trackResize: false, refreshExpiredTiles: true,
      transformRequest: (url) => {if (!allowedMapResource(url)) throw new Error('Map resource is not allowed'); return {url, credentials: 'same-origin', referrerPolicy: 'no-referrer'};}});
    map.addControl(new gl.NavigationControl({showCompass: false}), 'top-right');
    map.getCanvas().setAttribute('aria-label', 'Campus map. Arrow keys pan; plus and minus zoom. Use the public places list for equivalent selection.');
    map.on('load', loaded); map.on('error', failed); map.on('webglcontextlost', lost); map.on('render', syncMarkerVisibility);
    observer = new ResizeObserver(fit); observer.observe(container);
    timer = setTimeout(() => fail('network'), 12000);
  } catch {destroy(); onState('webgl');}
  return {fit, destroy, update(next, id, sheetExpanded) {
    if (disposed) return;
    const nextSignature = JSON.stringify([next, id, sheetExpanded]);
    if (nextSignature === signature) return;
    signature = nextSignature; points = next; selected = id; expanded = sheetExpanded;
    // Reconcile stable DOM marker buttons so Back/Forward/filter updates do not leak listeners.
    for (const item of markers) {item.button.removeEventListener('click', item.click); item.marker.remove();}
    markers = points.map((point) => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'campus-map-marker'; if ('kind' in point) button.dataset.category = point.category.code;
      button.setAttribute('aria-label', `Select ${point.name} on map${point.provenance.dataKind === 'SYNTHETIC' ? ' · Synthetic example' : ''}`);
      button.setAttribute('aria-pressed', String(point.id === selected));
      const symbol = document.createElement('span'); symbol.setAttribute('aria-hidden', 'true'); symbol.textContent = 'kind' in point ? (({pharmacy:'+',clinic:'✚',restaurant:'♨',hardware:'⚒'} as Record<string,string>)[point.category.code] ?? '•') : '↗'; button.append(symbol);
      const click = () => onSelect(point.id); button.addEventListener('click', click);
      const marker = new gl.Marker({element: button, anchor: 'bottom'}).setLngLat([point.location.lng, point.location.lat]).addTo(map);
      return {marker, button, click, id: point.id};
    });
    fit();
  }};
}
