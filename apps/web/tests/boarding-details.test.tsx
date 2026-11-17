import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NearbyEssentials } from '../src/components/boardings/nearby-essentials';
import { BoardingCompare } from '../src/components/boardings/boarding-compare';

const publicId = '00000000-0000-4000-8000-000000000001';
const areaId = '71000000-0000-4000-8000-000000000001';

const sampleEssentials = {
  boardingId: publicId,
  visibility: 'PUBLIC_MAP' as const,
  entrance: { lat: 6.795, lng: 79.901 },
  items: [
    {
      id: '40000000-0000-4000-8000-000000000001',
      name: 'Synthetic Demo Pharmacy',
      category: { code: 'pharmacy', label: 'Pharmacy' },
      location: { lat: 6.796, lng: 79.902 },
      distanceMeters: 140,
      provenance: {
        dataKind: 'SYNTHETIC' as const,
        sourceLabel: 'UNI-021 synthetic fixture',
        verifiedAt: null,
      },
    },
  ],
};

const sampleComparison = {
  items: [
    {
      id: publicId,
      title: 'Synthetic Owner Courtyard',
      publisherKind: 'OWNER_OFFICIAL' as const,
      visibility: 'PUBLIC_MAP' as const,
      locationLabel: null,
      hasExactEntrance: true,
      entrance: { lat: 6.795, lng: 79.901 },
      price: { currency: 'LKR' as const, rentMonthly: 20000, deposit: 40000, verifiedSource: 'OWNER' as const },
      vacancy: { status: 'AVAILABLE' as const, confirmedAt: '2026-11-17T00:00:00.000Z', expiresAt: '2026-11-20T00:00:00.000Z' },
      unitsSummary: [{
        id: '75000000-0000-4000-8000-000000000001',
        label: 'Single Room',
        template: 'STUDY_ROOM',
        capacity: 1,
        rentMinor: 2000000,
        basis: 'ROOM' as const,
        vacancyStatus: 'AVAILABLE' as const,
      }],
      nearbyEssentials: [{
        category: 'pharmacy',
        label: 'Pharmacy',
        count: 1,
        nearestDistanceMeters: 140,
      }],
      summary: 'Public preview summary.',
      updatedAt: '2026-11-17T00:00:00.000Z',
      provenance: { dataKind: 'SYNTHETIC' as const, sourceLabel: 'UNI-038 synthetic comparison fixture', verifiedAt: null },
    },
    {
      id: areaId,
      title: 'Synthetic Quiet Nook',
      publisherKind: 'OWNER_OFFICIAL' as const,
      visibility: 'AREA_ONLY' as const,
      locationLabel: 'Synthetic Broad Locality',
      hasExactEntrance: false,
      entrance: null,
      price: null,
      vacancy: { status: 'UNKNOWN' as const, confirmedAt: null, expiresAt: null },
      unitsSummary: [],
      nearbyEssentials: null,
      summary: 'Area preview summary.',
      updatedAt: '2026-11-17T00:00:00.000Z',
      provenance: { dataKind: 'SYNTHETIC' as const, sourceLabel: 'UNI-038 synthetic comparison fixture', verifiedAt: null },
    },
  ],
  requestedCount: 2,
  comparedCount: 2,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('NearbyEssentials Component', () => {
  it('displays private notice and does not fetch for AREA_ONLY or HIDDEN', () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    render(<NearbyEssentials id={areaId} visibility="AREA_ONLY" />);

    expect(screen.getByText(/Proximity is not computed for private listings/)).toBeDefined();
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('fetches and displays nearby essentials for PUBLIC_MAP', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => sampleEssentials,
    } as Response);

    render(<NearbyEssentials id={publicId} visibility="PUBLIC_MAP" />);

    await waitFor(() => {
      expect(screen.getByText('Synthetic Demo Pharmacy')).toBeDefined();
      expect(screen.getByText(/140 m/)).toBeDefined();
      expect(screen.getByText('Pharmacy')).toBeDefined();
    });
  });
});

describe('BoardingCompare Component', () => {
  it('renders empty state when no IDs are selected', () => {
    render(<BoardingCompare initialIds={[]} />);
    expect(screen.getByText('No boardings selected for comparison')).toBeDefined();
  });

  it('fetches comparison and displays matrix with public vs private distinctions', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce({
      ok: true,
      json: async () => sampleComparison,
    } as Response);

    render(<BoardingCompare initialIds={[publicId, areaId]} />);

    await waitFor(() => {
      expect(screen.getByText('Synthetic Owner Courtyard')).toBeDefined();
      expect(screen.getByText('Synthetic Quiet Nook')).toBeDefined();
    });

    // Public map details
    expect(screen.getByText('Consented public entrance')).toBeDefined();
    expect(screen.getAllByText(/20,000/).length).toBeGreaterThan(0);
    expect(screen.getByText('Available')).toBeDefined();

    // Area only details (ADR-0002/0003 enforcement in UI)
    expect(screen.getByText('Synthetic Broad Locality')).toBeDefined();
    expect(screen.getByText('Not shared (location private)')).toBeDefined();
    expect(screen.getByText('Not shared / Unpriced')).toBeDefined();

    // Remove action
    const removeButtons = screen.getAllByRole('button', { name: /Remove .* from comparison/ });
    expect(removeButtons).toHaveLength(2);
    fireEvent.click(removeButtons[1]);
  });
});

describe('UNI-039 open-page consent revocation', () => {
  it('clears comparison geometry and proximity after focus revalidation returns private mode', async () => {
    const hidden = { ...sampleComparison.items[0], visibility: 'HIDDEN', hasExactEntrance: false,
      entrance: null, nearbyEssentials: null, locationLabel: null };
    const fetch = vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...sampleComparison, items: [sampleComparison.items[0]] }) } as Response)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ ...sampleComparison, items: [hidden] }) } as Response);
    render(<BoardingCompare initialIds={[publicId]} />);
    await screen.findByText('Consented public entrance');
    fireEvent.focus(window);
    await screen.findByText('Location hidden');
    expect(screen.queryByText('Consented public entrance')).toBeNull();
    expect(screen.queryByText(/140 m/)).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(2);
    expect(fetch.mock.calls[1][1]).toMatchObject({ cache: 'no-store', credentials: 'omit' });
  });
  it('removes public essentials on visibility switches and rejects unavailable revalidation', async () => {
    vi.spyOn(globalThis, 'fetch')
      .mockResolvedValueOnce({ ok: true, json: async () => sampleEssentials } as Response)
      .mockResolvedValue({ ok: false } as Response);
    const { rerender } = render(<NearbyEssentials id={publicId} visibility="PUBLIC_MAP" />);
    await screen.findByText('Synthetic Demo Pharmacy');
    rerender(<NearbyEssentials id={publicId} visibility="HIDDEN" />);
    expect(screen.queryByText('Synthetic Demo Pharmacy')).toBeNull();
    rerender(<NearbyEssentials id={publicId} visibility="PUBLIC_MAP" />);
    await screen.findByText('Nearby essentials unavailable');
    expect(screen.queryByText('Synthetic Demo Pharmacy')).toBeNull();
  });
});
