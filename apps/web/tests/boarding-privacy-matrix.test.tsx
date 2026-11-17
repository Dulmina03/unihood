import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BoardingDetail } from '../src/components/boardings/boarding-detail';
import type { PublicBoardingAdvertisement } from '@unihood/contracts';

const propHiddenId = '71000000-0000-4000-8000-000000000001';
const propAreaId = '71000000-0000-4000-8000-000000000002';
const propCommunityId = '71000000-0000-4000-8000-000000000003';

const hiddenItem: PublicBoardingAdvertisement = {
  listing: {
    id: propHiddenId,
    listingId: '72000000-0000-4000-8000-000000000001',
    kind: 'BOARDING',
    title: 'Peaceful Hidden Boarding',
    publisherKind: 'OWNER_OFFICIAL',
    ownerVerified: true,
    visibility: 'HIDDEN',
    locationLabel: null,
    entrance: null,
    distanceMeters: null,
    route: null,
    price: null,
    vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
    provenance: { dataKind: 'SYNTHETIC', sourceLabel: 'Test fixture', verifiedAt: null },
  },
  summary: 'Peaceful private residential accommodation for quiet study.',
  updatedAt: '2026-11-17T00:00:00.000Z',
};

const areaItem: PublicBoardingAdvertisement = {
  listing: {
    id: propAreaId,
    listingId: '72000000-0000-4000-8000-000000000002',
    kind: 'BOARDING',
    title: 'Katubedda North Residence',
    publisherKind: 'OWNER_OFFICIAL',
    ownerVerified: true,
    visibility: 'AREA_ONLY',
    locationLabel: 'Katubedda North',
    entrance: null,
    distanceMeters: null,
    route: null,
    price: null,
    vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
    provenance: { dataKind: 'SYNTHETIC', sourceLabel: 'Test fixture', verifiedAt: null },
  },
  summary: 'Area advertisement in Katubedda North.',
  updatedAt: '2026-11-17T00:00:00.000Z',
};

const communityItem: PublicBoardingAdvertisement = {
  listing: {
    id: propCommunityId,
    listingId: '72000000-0000-4000-8000-000000000003',
    kind: 'BOARDING',
    title: 'Student Recommended Annex',
    publisherKind: 'COMMUNITY_RECOMMENDATION',
    visibility: 'AREA_ONLY',
    locationLabel: 'Near University Back Gate',
    entrance: null,
    distanceMeters: null,
    route: null,
    price: null,
    vacancy: { status: 'UNKNOWN', confirmedAt: null, expiresAt: null },
    disclaimer: 'Community-submitted, not owner-verified',
    provenance: { dataKind: 'SYNTHETIC', sourceLabel: 'Test fixture', verifiedAt: null },
  },
  summary: 'Recommended by students for convenient campus access.',
  updatedAt: '2026-11-17T00:00:00.000Z',
};

afterEach(() => {
  cleanup();
});

describe('UNI-039 Boarding Detail Web Privacy Matrix (ADR-0001–0005 & §13.2)', () => {
  it('renders HIDDEN boarding with zero location disclosure and explicit private notices', () => {
    const { container } = render(
      <BoardingDetail id={propHiddenId} initial={{ status: 'found', data: hiddenItem }} />
    );

    // Title and location label
    expect(screen.getByRole('heading', { level: 1, name: 'Peaceful Hidden Boarding' })).toBeInTheDocument();
    expect(screen.getByText('Location not shared')).toBeInTheDocument();

    // Privacy rail notices
    expect(screen.getByRole('heading', { level: 3, name: 'The location stays private.' })).toBeInTheDocument();
    expect(
      screen.getByText(/No locality, address or exact point is shared\. No proximity ordering, walking distance, route or nearby-property inference is provided\./)
    ).toBeInTheDocument();

    // Nearby essentials refusal
    expect(
      screen.getByText(/Proximity is not computed for private listings\./)
    ).toBeInTheDocument();

    // Ensure DOM has zero coordinates, lat/lng or canary strings
    const html = container.innerHTML;
    expect(html).not.toMatch(/CANARY|6\.795|79\.901|entrance_geo|latitude|longitude/);
  });

  it('renders AREA_ONLY boarding with broad locality, no destination pin, and refuses proximity', () => {
    const { container } = render(
      <BoardingDetail id={propAreaId} initial={{ status: 'found', data: areaItem }} />
    );

    // Locality is shown
    expect(screen.getByRole('heading', { level: 1, name: 'Katubedda North Residence' })).toBeInTheDocument();
    expect(screen.getByText('Katubedda North')).toBeInTheDocument();

    // Privacy notice explains broad area, not destination
    expect(screen.getByRole('heading', { level: 3, name: 'A broad area, by choice.' })).toBeInTheDocument();
    expect(
      screen.getByText(/Only the explicitly shared synthetic locality is shown\. It is not a destination\./)
    ).toBeInTheDocument();

    // Proximity refusal
    expect(
      screen.getByText(/Proximity is not computed for private listings\./)
    ).toBeInTheDocument();

    // Zero coordinates in DOM
    const html = container.innerHTML;
    expect(html).not.toMatch(/CANARY|6\.795|79\.901|entrance_geo/);
  });

  it('renders COMMUNITY_RECOMMENDATION with mandatory unverified disclaimer and no official pricing', () => {
    const { container } = render(
      <BoardingDetail id={propCommunityId} initial={{ status: 'found', data: communityItem }} />
    );

    expect(screen.getByRole('heading', { level: 1, name: 'Student Recommended Annex' })).toBeInTheDocument();

    // Community disclaimer
    expect(
      screen.getByText(/Community-submitted, not owner-verified\. Community recommendations cannot set official rent or confirmed vacancy\./)
    ).toBeInTheDocument();

    // Availability is unknown
    expect(screen.getByRole('heading', { level: 2, name: 'Availability unknown.' })).toBeInTheDocument();

    // No official room links for community submissions
    expect(screen.queryByText(/Room capacities, fees & availability/)).not.toBeInTheDocument();

    // Zero coordinates in DOM
    const html = container.innerHTML;
    expect(html).not.toMatch(/CANARY|6\.795|79\.901|entrance_geo/);
  });

  it('generates comparison and share links containing only validated canonical IDs without leaking coordinates', () => {
    render(<BoardingDetail id={propHiddenId} initial={{ status: 'found', data: hiddenItem }} />);

    // Compare link contains only public ID
    const compareLink = screen.getByRole('link', { name: /Compare this boarding/ });
    expect(compareLink).toHaveAttribute('href', `/compare?ids=${propHiddenId}`);

    // No spatial params or coordinates anywhere in links
    expect(compareLink.getAttribute('href')).not.toMatch(/lat|lng|bbox|coord/);
  });
});
