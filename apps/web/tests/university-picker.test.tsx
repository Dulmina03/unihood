import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { UniversityPicker } from '../src/components/landing/university-picker';
const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('next/navigation', () => ({useRouter: () => ({push, refresh: vi.fn()})}));
const uid = '10000000-0000-4000-8000-000000000001';
const cid = '20000000-0000-4000-8000-000000000001';
const eid = '30000000-0000-4000-8000-000000000001';
const provenance = {dataKind: 'SYNTHETIC' as const, sourceLabel: 'Synthetic test fixture', verifiedAt: null};
const university = {id: uid, slug: 'synthetic-demo', name: 'Synthetic Demo University', city: 'Synthetic City', country: 'ZZ', provenance};
const campus = {id: cid, universityId: uid, name: 'Synthetic Campus', publicArea: null, provenance};
const entrance = {id: eid, campusId: cid, name: 'Synthetic Gate', location: {lat: 0, lng: 0}, isPrimary: true, provenance};
function page(items: unknown[], pageSize = 100) {return {items, page: {page: 1, pageSize, hasNextPage: false}};}
function liveMock() {return vi.fn(async (url: string) => Response.json(page(url.includes('/entrances') ? [entrance] : url.includes('/campuses') ? [campus] : [university])));}
afterEach(() => {cleanup(); vi.unstubAllGlobals(); push.mockReset();});
describe('guest university picker', () => {
  it('loads real-contract options, campus and gate; navigates by validated slug without auth/GPS', async () => {
    const fetcher = liveMock(); vi.stubGlobal('fetch', fetcher); render(<UniversityPicker />);
    expect(screen.getByText('Loading the public university directory…')).toBeVisible();
    await screen.findByRole('option', {name: 'Synthetic Demo University · Demo'});
    fireEvent.change(screen.getByLabelText('University'), {target: {value: uid}});
    await screen.findByRole('option', {name: 'Synthetic Campus'});
    fireEvent.change(screen.getByLabelText('Campus'), {target: {value: cid}});
    await screen.findByRole('option', {name: 'Synthetic Gate · Main entrance'});
    fireEvent.change(screen.getByLabelText('Public entrance'), {target: {value: eid}});
    expect(screen.getByText(/Demonstration only; this is not a real gate/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: 'Open university'})); expect(push).toHaveBeenCalledWith('/u/synthetic-demo');
    expect(fetcher.mock.calls.map(([url]) => url)).toContain(`/api/universities/${uid}/entrances?campusId=${cid}&page=1&pageSize=100`);
    expect(screen.queryByText(/lat|lng|0\.00/)).not.toBeInTheDocument();
  });
  it('shows empty universities and name filtering without inventing fallback records', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(Response.json(page([])))); render(<UniversityPicker />);
    expect(await screen.findByText(/No universities are available yet/)).toBeVisible();
    expect(screen.getByRole('button', {name: 'Open university'})).toBeDisabled();
  });
  it('filters visible university names and retains the active university', async () => {
    vi.stubGlobal('fetch', liveMock()); render(<UniversityPicker />);
    await screen.findByRole('option', {name: 'Synthetic Demo University · Demo'});
    fireEvent.change(screen.getByLabelText('Find a university'), {target: {value: 'no match'}});
    expect(screen.getByText(/No university names match/)).toBeVisible();
    expect(screen.queryByRole('option', {name: 'Synthetic Demo University · Demo'})).not.toBeInTheDocument();
  });
  it('recovers network errors and does not replace them with an empty list', async () => {
    const fetcher = vi.fn().mockRejectedValueOnce(new Error('PRIVATE_CANARY')).mockImplementation(liveMock()); vi.stubGlobal('fetch', fetcher);
    render(<UniversityPicker />); expect(await screen.findByText('We couldn’t load universities')).toBeVisible();
    expect(screen.queryByText(/PRIVATE_CANARY/)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', {name: 'Try universities again'}));
    expect(await screen.findByRole('option', {name: 'Synthetic Demo University · Demo'})).toBeVisible();
  });
  it('ignores a stale campus response after changing university', async () => {
    let resolveCampus!: (value: Response) => void;
    const fetcher = vi.fn((url: string) => url.includes('/campuses') ? new Promise<Response>((resolve) => {resolveCampus = resolve;}) : Promise.resolve(Response.json(page([university]))));
    vi.stubGlobal('fetch', fetcher); render(<UniversityPicker />);
    await screen.findByRole('option', {name: 'Synthetic Demo University · Demo'});
    fireEvent.change(screen.getByLabelText('University'), {target: {value: uid}});
    await waitFor(() => expect(resolveCampus).toBeDefined());
    fireEvent.change(screen.getByLabelText('University'), {target: {value: ''}});
    await act(async () => {resolveCampus(Response.json(page([campus])));});
    expect(screen.queryByLabelText('Campus')).not.toBeInTheDocument();
    expect(screen.getByRole('button', {name: 'Open university'})).toBeDisabled();
  });
  it('direct-entry preselection loads only its children and exposes empty campus state', async () => {
    vi.stubGlobal('fetch', vi.fn(async (url: string) => Response.json(page(url.includes('/campuses') ? [] : [university]))));
    render(<UniversityPicker university={university} />);
    expect(await screen.findByText('No public campuses are available yet.')).toBeVisible();
    expect(screen.getByText('Synthetic demo university')).toBeVisible();
    expect(screen.getByLabelText('Public entrance')).toBeDisabled();
  });
});
