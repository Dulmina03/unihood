import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Button, Field, Photo, SearchField, FeaturedListingCard, MapPropertyPreview, listingPresentation, vacancyState, type ListingView } from '@unihood/ui';
import { demoNow, sampleListings } from '../src/components/design-system/fixtures';

afterEach(cleanup);
describe('Campus Teal components', () => {
  it('links validation and help text to a labeled field', () => {
    render(<Field label="Room title" hint="Synthetic only" error="Too short" required />);
    const input = screen.getByRole('textbox', {name: /Room title\s*\(required\)/});
    expect(input).toHaveAccessibleDescription('Synthetic only Too short');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(input).toBeRequired();
  });
  it('submits search through a native form and reports input', () => {
    const change = vi.fn(), search = vi.fn();
    render(<SearchField label="Find examples" value="" onChange={change} onSearch={search} />);
    fireEvent.change(screen.getByRole('searchbox'), {target: {value: 'courtyard'}});
    expect(change).toHaveBeenCalledWith('courtyard');
    fireEvent.submit(screen.getByRole('search'));
    expect(search).toHaveBeenCalledOnce();
  });
  it('prevents busy actions and gives an explicit image failure state', () => {
    const action = vi.fn();
    render(<><Button busy onClick={action}>Saving</Button><Photo photo={{src: '/bad.webp', alt: 'Synthetic room'}} /></>);
    fireEvent.click(screen.getByRole('button', {name: 'Saving'}));
    expect(action).not.toHaveBeenCalled();
    expect(screen.getByRole('button')).toHaveAttribute('aria-busy', 'true');
    fireEvent.error(screen.getByAltText('Synthetic room'));
    expect(screen.getByRole('img', {name: 'Photograph unavailable'})).toBeVisible();
  });
  it('exposes source, privacy and vacancy independently; save has pressed state', () => {
    const save = vi.fn();
    render(<FeaturedListingCard listing={sampleListings[0]} now={demoNow} saved onSave={save} onPreview={vi.fn()} />);
    expect(screen.getByText('Owner-verified')).toBeVisible();
    expect(screen.getByText('Owner map listing')).toBeVisible();
    expect(screen.getByText('Confirmed available')).toBeVisible();
    const button = screen.getByRole('button', {name: 'Save Synthetic courtyard room'});
    expect(button).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(button); expect(save).toHaveBeenCalledOnce();
  });
});
describe('boarding presentation policy (sanitized public DTO input required)', () => {
  it('rejects hidden, area-only, unverified and unconsented map previews', () => {
    for (const listing of [sampleListings[1], sampleListings[2], {...sampleListings[0], visibility: 'AREA_ONLY'}, {...sampleListings[0], publicMapConsent: false}, {...sampleListings[0], ownerVerified: false}] as ListingView[]) {
      const view = render(<MapPropertyPreview listing={listing} now={demoNow} onPreview={vi.fn()} />);
      expect(view.container).toBeEmptyDOMElement(); view.unmount();
    }
  });
  it('ignores forged community owner claims, price, vacancy and precise fields', () => {
    const forged = {...sampleListings[2], visibility: 'PUBLIC_MAP', ownerVerified: true, publicMapConsent: true, priceLkr: 987654, vacancy: {status: 'AVAILABLE', confirmedAt: '2026-11-15', expiresAt: '2026-11-29'}, generalLocality: 'PRIVATE_CANARY', latitude: 6.123456, longitude: 80.123456, contact: 'CONTACT_CANARY'} as unknown as ListingView;
    const policy = listingPresentation(forged, demoNow);
    expect(policy).toMatchObject({source: 'community', mapEligible: false, visibility: 'HIDDEN', locality: null, price: null, vacancy: 'UNKNOWN'});
    const view = render(<FeaturedListingCard listing={forged} saved={false} now={demoNow} onSave={vi.fn()} onPreview={vi.fn()} />);
    for (const secret of ['PRIVATE_CANARY', 'CONTACT_CANARY', '987654', '6.123456', '80.123456']) expect(view.container.innerHTML).not.toContain(secret);
    expect(screen.queryByText('Confirmed available')).not.toBeInTheDocument();
    expect(screen.queryByRole('link')).not.toBeInTheDocument();
  });
  it('withholds hidden locality and invalid official fees', () => {
    expect(listingPresentation({...sampleListings[1], generalLocality: 'SECRET'}, demoNow).locality).toBeNull();
    for (const priceLkr of [-1, NaN, Infinity]) expect(listingPresentation({...sampleListings[0], priceLkr} as ListingView, demoNow).price).toBeNull();
  });
  it('requires confirmation and a future expiry for vacancy', () => {
    for (const vacancy of [undefined, {status: 'AVAILABLE' as const}, {status: 'FULL' as const, confirmedAt: '2026-11-15', expiresAt: '2026-11-15'}, {status: 'AVAILABLE' as const, confirmedAt: '2026-11-17', expiresAt: '2026-11-29'}]) expect(vacancyState(vacancy, demoNow)).toBe('UNKNOWN');
    expect(vacancyState({status: 'FULL', confirmedAt: '2026-11-15', expiresAt: '2026-11-29'}, demoNow)).toBe('FULL');
  });
});
