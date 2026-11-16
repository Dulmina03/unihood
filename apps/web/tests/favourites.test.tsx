import { renderToString } from 'react-dom/server';
import { act, cleanup, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FAVOURITES_KEY, MAX_FAVOURITES, readFavourites, writeFavourites } from '../src/lib/favourites/storage';
import { useFavourites } from '../src/lib/favourites/use-favourites';
import { SavedFavourites } from '../src/components/favourites/saved';
import { SaveEntrance } from '../src/components/favourites/controls';
const identity = {universityId: '10000000-0000-4000-8000-000000000001', campusId: '20000000-0000-4000-8000-000000000001', entranceId: '30000000-0000-4000-8000-000000000001'};
const provenance = {dataKind: 'SYNTHETIC', sourceLabel: 'Synthetic test fixture', verifiedAt: null};
const university = {id: identity.universityId, slug: 'synthetic-demo', name: 'Synthetic Demo University', city: 'Demo', country: 'ZZ', provenance};
const campus = {id: identity.campusId, universityId: identity.universityId, name: 'Synthetic Campus', publicArea: null, provenance};
const gate = {id: identity.entranceId, campusId: identity.campusId, name: 'Synthetic Gate', location: {lat: 0, lng: 0}, isPrimary: true, provenance};
const page = (items: unknown[]) => ({items, page: {page: 1, pageSize: 100, hasNextPage: false}});
function directory() {return vi.fn(async (url: string) => Response.json(page(url.includes('/entrances') ? [gate] : url.includes('/campuses') ? [campus] : [university])));}
function raw(value: unknown) {window.localStorage.setItem(FAVOURITES_KEY, typeof value === 'string' ? value : JSON.stringify(value));}
afterEach(() => {cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); window.localStorage.removeItem(FAVOURITES_KEY);});
describe('minimal guest favourites storage', () => {
  it('writes only canonical public IDs, deduplicates by canonical entrance, and never mutates unrelated keys', () => {
    window.localStorage.setItem('unrelated', 'keep');
    writeFavourites(window.localStorage, [identity, {...identity, campusId: '20000000-0000-4000-8000-000000000002'}]);
    const stored = JSON.parse(window.localStorage.getItem(FAVOURITES_KEY)!);
    expect(Object.keys(stored)).toEqual(['version', 'entrances']); expect(stored.entrances).toHaveLength(1);
    expect(Object.keys(stored.entrances[0])).toEqual(['universityId', 'campusId', 'entranceId']);
    expect(window.localStorage.getItem('unrelated')).toBe('keep'); window.localStorage.removeItem('unrelated');
  });
  it.each(['{', 'null', '[]', '{"version":2,"entrances":[]}', '{"version":1,"entrances":{},"secret":"PRIVATE_CANARY"}', JSON.stringify({version: 1, entrances: [{...identity, location: {lat: 4, lng: 5}}]}), JSON.stringify({version: 1, entrances: [{...identity, entranceId: '../private'}]}), JSON.stringify({version: 1, entrances: Array(MAX_FAVOURITES + 1).fill(identity)}), ' '.repeat(15001)])('rejects corrupt, oversized or non-public payloads: %#', (value) => {
    raw(value); expect(readFavourites(window.localStorage)).toEqual({status: 'corrupt', entries: []});
  });
  it('returns unavailable without raw access errors; invalid writes never call storage', () => {
    expect(readFavourites({getItem: () => {throw new Error('PRIVATE_CANARY');}})).toEqual({status: 'unavailable', entries: []});
    const setItem = vi.fn(); expect(() => writeFavourites({setItem}, [{...identity, entranceId: 'bad'}])).toThrow('Invalid public identity'); expect(setItem).not.toHaveBeenCalled();
  });
  it('reads duplicate IDs once and treats absent storage as empty', () => {
    expect(readFavourites(window.localStorage)).toEqual({status: 'ready', entries: []});
    raw({version: 1, entrances: [identity, identity]}); expect(readFavourites(window.localStorage).entries).toEqual([identity]);
  });
});
describe('client storage lifecycle and controls', () => {
  it('saves/removes, synchronizes mounted consumers, and reads current persisted values before edits', () => {
    const first = renderHook(useFavourites), second = renderHook(useFavourites);
    act(() => {first.result.current.toggle(identity);}); expect(second.result.current.has(identity)).toBe(true);
    const other = {...identity, entranceId: '30000000-0000-4000-8000-000000000002'};
    writeFavourites(window.localStorage, [identity, other]);
    act(() => {first.result.current.remove(identity);}); expect(second.result.current.entries).toEqual([other]);
    act(() => {first.result.current.clear();}); expect(second.result.current.entries).toEqual([]);
  });
  it('updates on cross-tab clear/update events and unsubscribes on unmount', () => {
    const listener = vi.spyOn(window, 'removeEventListener'); const hook = renderHook(useFavourites);
    writeFavourites(window.localStorage, [identity]); act(() => window.dispatchEvent(new StorageEvent('storage', {key: FAVOURITES_KEY})));
    expect(hook.result.current.has(identity)).toBe(true);
    window.localStorage.removeItem(FAVOURITES_KEY); act(() => window.dispatchEvent(new StorageEvent('storage', {key: null})));
    expect(hook.result.current.entries).toEqual([]); hook.unmount(); expect(listener).toHaveBeenCalledWith('storage', expect.any(Function));
  });
  it('fails closed on quota errors, keeps persisted IDs and recovers on retry', () => {
    writeFavourites(window.localStorage, [identity]); const hook = renderHook(useFavourites);
    const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {throw new Error('PRIVATE_CANARY');});
    act(() => {expect(hook.result.current.remove(identity)).toBe(false);}); expect(hook.result.current.status).toBe('unavailable');
    expect(hook.result.current.message).not.toContain('PRIVATE_CANARY'); spy.mockRestore();
    act(() => hook.result.current.retry()); expect(hook.result.current.has(identity)).toBe(true);
  });
  it('handles denied localStorage access and corrupt reset without automatic overwrite', () => {
    raw('{'); const hook = renderHook(useFavourites); expect(hook.result.current.status).toBe('corrupt');
    act(() => {expect(hook.result.current.toggle(identity)).toBe(false);}); expect(window.localStorage.getItem(FAVOURITES_KEY)).toBe('{');
    act(() => hook.result.current.reset()); expect(hook.result.current.status).toBe('ready');
    vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {throw new Error('PRIVATE_CANARY');});
    act(() => hook.result.current.retry()); expect(hook.result.current.status).toBe('unavailable');
  });
  it('enforces a bounded collection without overwriting existing favourites', () => {
    const entries = Array.from({length: MAX_FAVOURITES}, (_, index) => ({...identity, entranceId: `30000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`}));
    writeFavourites(window.localStorage, entries); const hook = renderHook(useFavourites);
    act(() => {expect(hook.result.current.toggle({...identity, entranceId: '30000000-0000-4000-8000-000000000099'})).toBe(false);});
    expect(hook.result.current.message).toContain('up to 50'); expect(readFavourites(window.localStorage).entries).toHaveLength(50);
  });
  it('announces a stable toggle label and pressed state', () => {
    function Control() {const favourites = useFavourites(); return <SaveEntrance favourites={favourites} identity={identity} name="Synthetic Gate" />;}
    render(<Control />); const button = screen.getByRole('button', {name: 'Save Synthetic Gate'});
    expect(button).toHaveAttribute('aria-pressed', 'false'); fireEvent.click(button); expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button); expect(button).toHaveAttribute('aria-pressed', 'false');
  });
});
describe('saved public directory resolution', () => {
  it('renders a meaningful server loading state without reading browser storage', () => {
    const access = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {throw new Error('PRIVATE_CANARY');});
    const html = renderToString(<SavedFavourites />);
    expect(html).toContain('Loading saved public places'); expect(html).not.toContain('PRIVATE_CANARY'); expect(access).not.toHaveBeenCalled();
  });
  it('does not fetch directories for an empty notebook', async () => {
    const fetcher = directory(); vi.stubGlobal('fetch', fetcher); render(<SavedFavourites />);
    expect(await screen.findByText('Room for your next starting point')).toBeVisible(); expect(fetcher).not.toHaveBeenCalled();
  });
  it('re-resolves IDs from strict public APIs and shares a canonical link without storage snapshots', async () => {
    writeFavourites(window.localStorage, [identity]); vi.stubGlobal('fetch', directory()); render(<SavedFavourites />);
    expect(await screen.findByRole('heading', {name: 'Synthetic Gate'})).toBeVisible();
    expect(screen.getByRole('link', {name: 'Explore this gate'})).toHaveAttribute('href', `/explore?university=synthetic-demo&campus=${identity.campusId}&entrance=${identity.entranceId}`);
    fireEvent.click(screen.getByRole('button', {name: 'Share Synthetic Gate'}));
    expect((screen.getByLabelText('Shareable gate link') as HTMLInputElement).value).toContain(`entrance=${identity.entranceId}`);
    expect(JSON.stringify(readFavourites(window.localStorage))).not.toMatch(/lat|lng|name|slug|PRIVATE/);
  });
  it('keeps IDs through an upstream failure, recovers, and handles removed entrances without stale metadata', async () => {
    writeFavourites(window.localStorage, [identity]); const fetcher = directory(); fetcher.mockRejectedValueOnce(new Error('PRIVATE_CANARY')); vi.stubGlobal('fetch', fetcher);
    render(<SavedFavourites />); expect(await screen.findByText('We couldn’t check your saved places')).toBeVisible();
    expect(screen.queryByText('PRIVATE_CANARY')).not.toBeInTheDocument(); fireEvent.click(screen.getByRole('button', {name: 'Retry public directory'}));
    expect(await screen.findByRole('heading', {name: 'Synthetic Gate'})).toBeVisible(); cleanup();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(page(url.includes('/entrances') ? [] : url.includes('/campuses') ? [campus] : [university]))));
    render(<SavedFavourites />); expect(await screen.findByText('Saved entrance unavailable')).toBeVisible(); expect(screen.queryByText('Synthetic Gate')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Remove unavailable saved entrance 1'})); expect(await screen.findByText('Room for your next starting point')).toBeVisible();
    await waitFor(() => expect(screen.getByRole('heading', {name: 'Saved places'})).toHaveFocus());
  });
  it('rejects wrong-parent public data without offering a share/map link', async () => {
    writeFavourites(window.localStorage, [identity]); vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(page(url.includes('/entrances') ? [{...gate, campusId: '20000000-0000-4000-8000-000000000099'}] : url.includes('/campuses') ? [campus] : [university]))));
    render(<SavedFavourites />); await screen.findByText('Saved entrance unavailable'); expect(screen.queryByRole('link', {name: 'Explore this gate'})).not.toBeInTheDocument();
  });
  it('redacts malformed stored payloads and resets only the favourites key', async () => {
    raw({version: 1, entrances: [{...identity, name: 'PRIVATE_CANARY', location: {lat: 3, lng: 4}}]});
    window.localStorage.setItem('unrelated', 'keep'); vi.stubGlobal('fetch', directory()); render(<SavedFavourites />);
    expect(await screen.findByText(/Saved data could not be read/)).toBeVisible(); expect(screen.queryByText('PRIVATE_CANARY')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Reset saved data'})); expect(await screen.findByText('Room for your next starting point')).toBeVisible();
    expect(window.localStorage.getItem('unrelated')).toBe('keep'); window.localStorage.removeItem('unrelated');
  });
  it('provides per-group retry without falsely describing missing data as empty', async () => {
    writeFavourites(window.localStorage, [identity]); let fail = true;
    vi.stubGlobal('fetch', vi.fn(async (url: string) => {if (url.includes('/campuses') && fail) throw new Error('PRIVATE_CANARY'); return Response.json(page(url.includes('/entrances') ? [gate] : url.includes('/campuses') ? [campus] : [university]));}));
    render(<SavedFavourites />); await screen.findByText('Some saved places could not load');
    expect(screen.getByText('Temporarily unavailable')).toBeVisible(); fail = false;
    fireEvent.click(screen.getByRole('button', {name: 'Retry saved places'})); expect(await screen.findByRole('heading', {name: 'Synthetic Gate'})).toBeVisible();
    const card = screen.getByRole('heading', {name: 'Synthetic Gate'}).closest('article')!;
    fireEvent.click(within(card).getByRole('button', {name: 'Remove Synthetic Gate from favourites'}));
    expect(readFavourites(window.localStorage).entries).toEqual([]);
  });
});
