import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import Home from '../src/app/page';
const {push} = vi.hoisted(() => ({push: vi.fn()}));
vi.mock('next/navigation', () => ({useRouter: () => ({push, refresh: vi.fn()})}));
afterEach(() => {cleanup(); vi.unstubAllGlobals();});
describe('Editorial Explorer landing', () => {
  it('presents the hero, truthful examples, credits and privacy without false inventory', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))); render(<Home />);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Find your place.');
    expect(screen.getByText(/No live listings, prices, vacancies or owner claims/)).toBeVisible();
    expect(screen.getByText(/without exact map pins or official owner prices/)).toBeVisible();
    expect(screen.getByRole('link', {name: 'Skip to content'})).toHaveAttribute('href', '#main');
    expect(screen.getByRole('link', {name: 'Photo sources & usage'})).toHaveAttribute('href', '/photo-credits');
    expect(screen.getAllByText('Synthetic example')).toHaveLength(3);
    expect(screen.queryByRole('button', {name: /save|book now|publish/i})).not.toBeInTheDocument();
  });
  it('opens exploration and gives meaningful advertisement availability information', () => {
    vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {}))); render(<Home />);
    fireEvent.click(screen.getByRole('button', {name: 'Explore Map'}));
    expect(push).toHaveBeenCalledWith('/explore');
    fireEvent.click(screen.getByRole('button', {name: 'Browse Advertisements'}));
    expect(screen.getByText(/There are no live boarding advertisements here yet/)).toBeInTheDocument();
  });
});
