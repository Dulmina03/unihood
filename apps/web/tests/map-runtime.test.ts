import { afterEach, describe, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({maps: [] as FakeMap[], markers: [] as FakeMarker[], observers: [] as {disconnect: ReturnType<typeof vi.fn>}[], failConstruction: false}));
class FakeMap {
  events = new Map<string, (...args: never[]) => void>();
  canvas = document.createElement('canvas'); remove = vi.fn(); resize = vi.fn(); jumpTo = vi.fn(); setPadding = vi.fn(); fitBounds = vi.fn();
  constructor(readonly options: Record<string, unknown>) {if (fake.failConstruction) throw new Error('PRIVATE_CANARY'); fake.maps.push(this);}
  addControl() {} getStyle() {return {};} getCanvas() {return this.canvas;} on(name: string, fn: (...args: never[]) => void) {this.events.set(name, fn);} off(name: string) {this.events.delete(name);}
}
class FakeMarker {
  remove = vi.fn();
  constructor(readonly options: {element: HTMLButtonElement}) {fake.markers.push(this);}
  setLngLat = vi.fn(() => this); addTo = vi.fn(() => this);
}
vi.mock('maplibre-gl', () => ({get Map() {return FakeMap;}, get Marker() {return FakeMarker;}, NavigationControl: class {}, LngLatBounds: class {extend() {}}, setWorkerUrl: vi.fn(), setWorkerCount: vi.fn()}));
import { mountMap } from '../src/lib/maps/runtime';
const gate = {id: '30000000-0000-4000-8000-000000000001', campusId: '20000000-0000-4000-8000-000000000001', name: 'Synthetic gate <script>', location: {lat: 0, lng: 0}, isPrimary: true, provenance: {dataKind: 'SYNTHETIC' as const, sourceLabel: 'Synthetic test fixture', verifiedAt: null}};
function mount() {
  vi.stubGlobal('ResizeObserver', class {disconnect = vi.fn(); observe = vi.fn(); constructor() {fake.observers.push(this);}});
  const status = vi.fn(), select = vi.fn();
  const handle = mountMap(document.createElement('div'), {kind: 'openfreemap', style: 'liberty'}, status, select);
  return {handle, status, select, map: fake.maps.at(-1)!};
}
afterEach(() => {fake.maps.length = 0; fake.markers.length = 0; fake.observers.length = 0; fake.failConstruction = false; vi.unstubAllGlobals(); vi.useRealTimers();});
describe('MapLibre lifecycle and public entrance selection', () => {
  it('initializes one map, places public coordinates and forwards accessible marker selection without HTML injection', () => {
    const {handle, map, status, select} = mount(); handle.update([gate], gate.id, true);
    const request = map.options.transformRequest as (url: string) => unknown;
    expect(request('https://tiles.openfreemap.org/styles/liberty')).toEqual({url: 'https://tiles.openfreemap.org/styles/liberty', credentials: 'same-origin', referrerPolicy: 'no-referrer'});
    expect(() => request('https://private.invalid/?key=PRIVATE_CANARY')).toThrow('Map resource is not allowed');
    expect(fake.maps).toHaveLength(1); expect(fake.markers[0].setLngLat).toHaveBeenCalledWith([0, 0]);
    expect(fake.markers[0].options.element).toHaveAttribute('aria-pressed', 'true');
    fake.markers[0].options.element.click(); expect(select).toHaveBeenCalledWith(gate.id);
    expect(fake.markers[0].options.element.querySelector('script')).toBeNull();
    map.events.get('load')!(); expect(status).toHaveBeenLastCalledWith('ready');
    handle.update([gate], gate.id, true); expect(fake.maps).toHaveLength(1); expect(fake.markers).toHaveLength(1);
    handle.destroy(); handle.destroy(); expect(map.remove).toHaveBeenCalledTimes(1); expect(map.events.size).toBe(0); expect(fake.observers[0].disconnect).toHaveBeenCalledOnce();
    fake.markers[0].options.element.click(); expect(select).toHaveBeenCalledTimes(1);
  });
  it('reconciles changed selection/filter/URL points and removes old listeners', () => {
    const {handle, select, map} = mount(); handle.update([gate], gate.id, true); const old = fake.markers[0];
    handle.update([], '', false); expect(old.remove).toHaveBeenCalledOnce(); old.options.element.click(); expect(select).not.toHaveBeenCalled();
    expect(map.jumpTo).toHaveBeenLastCalledWith({center: [0, 0], zoom: 1}); handle.destroy();
  });
  it('tears down on resource error, returns a redacted failure and ignores late load events', () => {
    const {handle, status, map} = mount(); const loaded = map.events.get('load')!; map.events.get('error')!();
    loaded(); expect(status).toHaveBeenLastCalledWith('network'); expect(map.remove).toHaveBeenCalledOnce(); handle.destroy();
  });
  it('handles lost WebGL context and allows a fresh retry instance', () => {
    const {map, status} = mount(); const preventDefault = vi.fn();
    (map.events.get('webglcontextlost') as unknown as (event: unknown) => void)({originalEvent: {preventDefault}});
    expect(preventDefault).toHaveBeenCalledOnce(); expect(status).toHaveBeenLastCalledWith('context'); expect(map.remove).toHaveBeenCalledOnce();
    const retry = mount(); expect(fake.maps).toHaveLength(2); retry.handle.destroy();
  });
  it('bounds a hanging style request and cancels its timer on removal', () => {
    vi.useFakeTimers(); const {status} = mount(); vi.advanceTimersByTime(12000); expect(status).toHaveBeenLastCalledWith('network');
    const retry = mount(); retry.handle.destroy(); vi.advanceTimersByTime(12000); expect(retry.status).toHaveBeenLastCalledWith('loading');
  });
  it('reports WebGL construction failure without leaking the original exception', () => {
    fake.failConstruction = true; const {status, handle} = mount(); expect(status).toHaveBeenLastCalledWith('webgl'); expect(status).not.toHaveBeenCalledWith('PRIVATE_CANARY'); handle.destroy();
  });
});
