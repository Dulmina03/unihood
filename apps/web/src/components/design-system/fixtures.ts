import type { ListingView } from '@unihood/ui';

export const demoNow = Date.parse('2026-11-16T09:00:00+05:30');
export const demoPhoto = {
  src: '/design-system/illustrative-interior.webp',
  alt: 'Illustrative bright apartment interior with a sofa, dining table and windows; not a UniHood property',
};
// Entirely synthetic display DTOs. Never put private coordinates in client fixtures/props.
export const sampleListings: ListingView[] = [
  {id: 'synthetic-public', title: 'Synthetic courtyard room', publisherKind: 'OWNER_OFFICIAL', ownerVerified: true,
    visibility: 'PUBLIC_MAP', publicMapConsent: true, generalLocality: 'Sample campus neighborhood', priceLkr: 18000,
    vacancy: {status: 'AVAILABLE', confirmedAt: '2026-11-15T09:00:00+05:30', expiresAt: '2026-11-29T09:00:00+05:30'},
    amenities: ['Study space', 'Shared kitchen'], photo: demoPhoto},
  {id: 'synthetic-private', title: 'Synthetic quiet corner', publisherKind: 'OWNER_OFFICIAL', ownerVerified: true,
    visibility: 'HIDDEN', publicMapConsent: false, priceLkr: 16000, vacancy: {status: 'UNKNOWN'},
    amenities: ['Single room', 'Reading nook'], photo: demoPhoto},
  {id: 'synthetic-community', title: 'Synthetic community find', publisherKind: 'COMMUNITY_RECOMMENDATION',
    visibility: 'AREA_ONLY', generalLocality: 'Sample broad locality',
    amenities: ['Community recommendation', 'Needs confirmation'], photo: demoPhoto},
];
