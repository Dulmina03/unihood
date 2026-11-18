import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BoardingRecommendation } from '../src/components/contribute/boarding-recommendation';
import { recommendationEndpoint } from '../src/lib/boardings/recommendation-endpoint';
const endpoint = 'http://127.0.0.1:3001/api/v1/contributions/boarding';
const receipt = { contributionId: '40000000-0000-4000-8000-000000000040', outcome: 'HELD_RECOMMENDATION', reviewState: 'PENDING', publisherKind: 'COMMUNITY_RECOMMENDATION', dataKind: 'SYNTHETIC', published: false };
afterEach(() => { cleanup(); vi.restoreAllMocks(); });
async function review() {
  fireEvent.click(screen.getByRole('button', { name: 'Use synthetic example' }));
  fireEvent.click(screen.getByLabelText(/I have permission/)); fireEvent.click(screen.getByLabelText(/I understand the separate photo/));
  fireEvent.click(screen.getByRole('button', { name: 'Review recommendation' }));
  await waitFor(() => expect(screen.getByRole('heading', { name: '3. Review before sending.' })).toHaveFocus());
}
describe('UNI-040 recommendation UI', () => {
  it('fails closed outside configured loopback development without exposing input controls', () => {
    expect(recommendationEndpoint({ APP_ENV: 'production' })).toBeNull();
    for (const API_BASE_URL of ['https://remote.example/api/v1', 'http://user:secret@127.0.0.1:3001/api/v1', 'http://127.0.0.1:3001/wrong']) expect(recommendationEndpoint({ APP_ENV: 'local', API_BASE_URL })).toBeNull();
    expect(recommendationEndpoint({ APP_ENV: 'local' })).toBe(endpoint);
    render(<BoardingRecommendation endpoint={null} />);
    expect(screen.getByRole('heading', { name: 'Recommendations are unavailable here.' })).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).toBeNull();
  });
  it('requires consent and previews only community context, without owner or exact-pin fields', async () => {
    const { container } = render(<BoardingRecommendation endpoint={endpoint} />);
    fireEvent.click(screen.getByRole('button', { name: 'Use synthetic example' }));
    fireEvent.click(screen.getByRole('button', { name: 'Review recommendation' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('both privacy acknowledgements');
    await review();
    expect(screen.getByText('Community-submitted · not owner-verified')).toBeInTheDocument();
    expect(container.querySelector('input[type="file"]')).toBeNull();
    for (const name of [/latitude/i, /longitude/i, /price/i, /vacancy/i, /phone/i]) expect(screen.queryByRole('textbox', { name })).toBeNull();
    expect(screen.queryByRole('button', { name: /publish|place pin/i })).toBeNull();
  });
  it('retries identical key and body without storage and focuses the held receipt', async () => {
    const fetch = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false, status: 503 } as Response).mockResolvedValueOnce({ ok: true, json: async () => receipt } as Response);
    const storage = vi.spyOn(Storage.prototype, 'setItem');
    render(<BoardingRecommendation endpoint={endpoint} />); await review();
    fireEvent.click(screen.getByRole('button', { name: 'Submit held recommendation' }));
    await screen.findByRole('alert'); fireEvent.click(screen.getByRole('button', { name: 'Submit held recommendation' }));
    await waitFor(() => expect(screen.getByRole('heading', { name: 'Held for review.' })).toHaveFocus());
    expect(fetch.mock.calls[0][1]?.body).toBe(fetch.mock.calls[1][1]?.body);
    expect(JSON.parse(String(fetch.mock.calls[0][1]?.body)).draft).not.toHaveProperty('entrance');
    expect(storage).not.toHaveBeenCalled();
  });
  it('renders public search empty/error/retry without treating it as duplicate clearance', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({ ok: false } as Response).mockResolvedValueOnce({ ok: true, json: async () => ({ items: [], page: { page: 1, pageSize: 5, hasNextPage: false } }) } as Response);
    render(<BoardingRecommendation endpoint={endpoint} />);
    fireEvent.change(screen.getByLabelText('Search public advertisement titles'), { target: { value: 'Synthetic study' } });
    fireEvent.click(screen.getByRole('button', { name: 'Search advertisements' })); await screen.findByRole('alert');
    fireEvent.click(screen.getByRole('button', { name: 'Search advertisements' }));
    expect(await screen.findByText(/No public title matches/)).toHaveTextContent('will not create a public listing');
  });
});
