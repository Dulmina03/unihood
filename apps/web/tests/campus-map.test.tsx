import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
const fake = vi.hoisted(() => ({mount: vi.fn(), handle: {destroy: vi.fn(), update: vi.fn(), fit: vi.fn()}}));
vi.mock('../src/lib/maps/runtime', () => ({mountMap: fake.mount}));
import { CampusMap } from '../src/components/explore/campus-map';
const provider = {kind: 'openfreemap', style: 'liberty'} as const;
const props = {provider, points: [], selected: '', expanded: true, onSelect: vi.fn(), onShowList: vi.fn(), onStatus: vi.fn()};
afterEach(() => {cleanup(); vi.clearAllMocks();});
describe('client-only map mount and fallback', () => {
  it('never imports/constructs a map for missing or invalid configuration and offers the list', () => {
    const view = render(<CampusMap {...props} provider={{kind: 'missing'}} />);
    expect(screen.getByText(/No map provider is configured/)).toBeVisible();
    fireEvent.click(screen.getByRole('button', {name: 'Explore the list'})); expect(props.onShowList).toHaveBeenCalledOnce();
    view.rerender(<CampusMap {...props} provider={{kind: 'invalid'}} />);
    expect(screen.getByText(/Map configuration is unavailable/)).toBeVisible(); expect(fake.mount).not.toHaveBeenCalled();
  });
  it('cancels a late module result on immediate unmount', async () => {
    fake.mount.mockReturnValue(fake.handle); const view = render(<CampusMap {...props} />); view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 0)); expect(fake.mount).not.toHaveBeenCalled();
  });
  it('retries a failed instance and disconnects the previous handle', async () => {
    fake.mount.mockImplementation((_node, _config, publish) => {publish('network'); return fake.handle;});
    const view = render(<CampusMap {...props} />);
    await screen.findByText(/The map could not load/); expect(fake.mount).toHaveBeenCalledTimes(1);
    fireEvent.click(screen.getByRole('button', {name: 'Retry map'}));
    await waitFor(() => expect(fake.mount).toHaveBeenCalledTimes(2)); expect(fake.handle.destroy).toHaveBeenCalledOnce();
    view.unmount(); expect(fake.handle.destroy).toHaveBeenCalledTimes(2);
  });
});
