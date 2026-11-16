import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Explore } from '../src/components/explore/explore';
const query = vi.hoisted(() => ({value: ''}));
vi.mock('next/navigation', () => ({useSearchParams: () => new URLSearchParams(query.value)}));
const uid = '10000000-0000-4000-8000-000000000001', cid = '20000000-0000-4000-8000-000000000001', eid = '30000000-0000-4000-8000-000000000001';
const provenance = {dataKind: 'SYNTHETIC', sourceLabel: 'Synthetic test fixture', verifiedAt: null};
const university = {id: uid, slug: 'synthetic-demo', name: 'Synthetic Demo University', city: 'Synthetic City', country: 'ZZ', provenance};
const campus = {id: cid, universityId: uid, name: 'Synthetic Campus', publicArea: null, provenance};
const entrance = {id: eid, campusId: cid, name: 'Synthetic Gate', location: {lat: 0, lng: 0}, isPrimary: true, provenance};
const page = (items: unknown[]) => ({items, page: {page: 1, pageSize: 100, hasNextPage: false}});
function mockFetch() {return vi.fn(async (url: string) => Response.json(page(url.includes('/entrances') ? [entrance] : url.includes('/campuses') ? [campus] : [university])));}
afterEach(() => {cleanup(); vi.unstubAllGlobals(); vi.restoreAllMocks(); query.value = '';});
describe('Urban Map public shell', () => {
  it('restores a valid hierarchy and preview without fabricating map or route facts', async () => {
    query.value = `university=synthetic-demo&campus=${cid}&entrance=${eid}`;
    vi.stubGlobal('fetch', mockFetch()); render(<Explore />);
    expect(await screen.findByRole('heading', {name: 'Synthetic Gate'})).toBeVisible();
    expect(screen.getByLabelText('University')).toHaveValue('synthetic-demo');
    expect(screen.getByLabelText('Campus')).toHaveValue(cid);
    expect(screen.getByLabelText('Public entrance')).toHaveValue(eid);
    expect(screen.getByText(/No distance is estimated/)).toBeVisible();
    expect(screen.queryByText(/0\.000|Owner.verified/)).not.toBeInTheDocument();
    expect(screen.getByText(/Fictional demonstration, not a real gate/)).toBeVisible();
  });
  it('rejects malformed URL state without sending a directory request or echoing input', () => {
    query.value = 'lat=PRIVATE_CANARY'; const fetcher = mockFetch(); vi.stubGlobal('fetch', fetcher);
    render(<Explore />);
    expect(screen.getByText('This selection is invalid')).toBeVisible();
    expect(screen.queryByText('PRIVATE_CANARY')).not.toBeInTheDocument(); expect(fetcher).not.toHaveBeenCalled();
    const push = vi.spyOn(window.history, 'pushState');
    fireEvent.click(screen.getByRole('button', {name: 'Reset selections'})); expect(push).toHaveBeenCalledWith(null, '', '/explore');
  });
  it('does not fetch gates for a campus outside the university', async () => {
    query.value = `university=synthetic-demo&campus=20000000-0000-4000-8000-000000000099`;
    const fetcher = mockFetch(); vi.stubGlobal('fetch', fetcher); render(<Explore />);
    expect(await screen.findByText('This selection is invalid')).toBeVisible();
    expect(fetcher.mock.calls.some(([url]) => url.includes('/entrances'))).toBe(false);
  });
  it('distinguishes unavailable directories from empty results and recovers on retry', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('PRIVATE_CANARY')).mockResolvedValue(Response.json(page([])));
    vi.stubGlobal('fetch', fetcher); render(<Explore />);
    expect(await screen.findByText('We couldn’t load public places')).toBeVisible();
    expect(screen.queryByText('PRIVATE_CANARY')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Retry public places'}));
    expect(await screen.findByText('No universities available')).toBeVisible();
  });
  it('ignores stale responses when the selected university changes', async () => {
    query.value = 'university=synthetic-demo';
    let resolveCampus!: (value: Response) => void;
    vi.stubGlobal('fetch', vi.fn((url: string) => url.includes('/campuses') ? new Promise<Response>((resolve) => {resolveCampus = resolve;}) : Promise.resolve(Response.json(page([university])))));
    const view = render(<Explore />);
    await waitFor(() => expect(resolveCampus).toBeDefined());
    query.value = ''; view.rerender(<Explore />);
    await act(async () => resolveCampus(Response.json(page([campus]))));
    expect(screen.queryByRole('option', {name: 'Synthetic Campus'})).not.toBeInTheDocument();
    expect(screen.getByText('A university is your starting point')).toBeVisible();
  });
  it('keeps dependent selections out of the URL after switching university', async () => {
    query.value = `university=synthetic-demo&campus=${cid}&entrance=${eid}&q=Gate&view=list`;
    vi.stubGlobal('fetch', mockFetch()); render(<Explore />);
    await screen.findByRole('heading', {name: 'Synthetic Gate'});
    const push = vi.spyOn(window.history, 'pushState');
    fireEvent.change(screen.getByLabelText('University'), {target: {value: ''}});
    expect(push).toHaveBeenLastCalledWith(null, '', '/explore?view=list');
  });
  it('provides a keyboard-operable sheet and a truthful future feed empty state', async () => {
    query.value = `university=synthetic-demo&campus=${cid}&category=boardings`;
    vi.stubGlobal('fetch', mockFetch()); render(<Explore />);
    expect(await screen.findByText('No boarding feed connected')).toBeVisible();
    const handle = screen.getByRole('button', {name: 'Collapse results'});
    fireEvent.click(handle); expect(handle).toHaveAttribute('aria-expanded', 'false');
    fireEvent.click(handle); expect(handle).toHaveAttribute('aria-expanded', 'true');
    const push = vi.spyOn(window.history, 'pushState');
    fireEvent.click(screen.getByRole('button', {name: 'Show campus gates'}));
    expect(push).toHaveBeenLastCalledWith(null, '', `/explore?university=synthetic-demo&campus=${cid}`);
  });
});
