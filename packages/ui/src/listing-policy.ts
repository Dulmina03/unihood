export type Visibility = 'PUBLIC_MAP' | 'AREA_ONLY' | 'HIDDEN';
export type Vacancy = {status: 'AVAILABLE' | 'FULL' | 'UNKNOWN'; confirmedAt?: string; expiresAt?: string};
export type ListingPhoto = {src: string; srcSet?: string; alt: string};
type Base = {id: string; title: string; generalLocality?: string; photo?: ListingPhoto; amenities: string[]};
// Display-only public DTOs, not an authorization mechanism. No coordinates/contact fields.
export type ListingView = Base & (
  | {publisherKind: 'OWNER_OFFICIAL'; ownerVerified: boolean; visibility: Visibility; publicMapConsent: boolean; priceLkr?: number; vacancy?: Vacancy}
  | {publisherKind: 'COMMUNITY_RECOMMENDATION'; visibility: 'AREA_ONLY' | 'HIDDEN'; ownerVerified?: never; publicMapConsent?: never; priceLkr?: never; vacancy?: never}
);
export function vacancyState(vacancy: Vacancy | undefined, now = Date.now()): Vacancy['status'] {
  const confirmed = Date.parse(vacancy?.confirmedAt ?? '');
  const expires = Date.parse(vacancy?.expiresAt ?? '');
  return vacancy && Number.isFinite(confirmed) && confirmed <= now && expires > now
    ? vacancy.status : 'UNKNOWN';
}
export function listingPresentation(listing: ListingView, now = Date.now()) {
  const community = listing.publisherKind !== 'OWNER_OFFICIAL';
  const verified = !community && listing.ownerVerified === true;
  const mapEligible = verified && listing.visibility === 'PUBLIC_MAP' && listing.publicMapConsent === true;
  const visibility: Visibility = listing.visibility === 'AREA_ONLY' ? 'AREA_ONLY' : mapEligible ? 'PUBLIC_MAP' : 'HIDDEN';
  return {
    source: community ? 'community' as const : verified ? 'owner' as const : 'unverified' as const,
    visibility,
    mapEligible,
    locality: visibility === 'HIDDEN' ? null : listing.generalLocality ?? null,
    price: verified && typeof listing.priceLkr === 'number' && Number.isFinite(listing.priceLkr) && listing.priceLkr >= 0
      ? `LKR ${new Intl.NumberFormat('en-LK', {maximumFractionDigits: 0}).format(listing.priceLkr)}` : null,
    vacancy: verified ? vacancyState(listing.vacancy, now) : 'UNKNOWN' as const,
    confirmedAt: verified && vacancyState(listing.vacancy, now) !== 'UNKNOWN' ? listing.vacancy?.confirmedAt : undefined,
  };
}
