import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Home from '../src/app/page';
describe('bootstrap landing', () => {
  it('communicates preview status and privacy without advertising fake inventory', () => {
    render(<Home />);
    expect(screen.getByRole('heading', {level: 1})).toHaveTextContent('Find your place.');
    expect(screen.getByText(/contains no live listings/)).toBeVisible();
    expect(screen.getByText(/without exact map pins or official owner prices/)).toBeVisible();
    expect(screen.getByRole('link', {name: 'Skip to content'})).toHaveAttribute('href', '#main');
    expect(screen.getByRole('link', {name: 'Component library'})).toHaveAttribute('href', '/design-system');
    expect(screen.queryByRole('button', {name: /publish/i})).not.toBeInTheDocument();
  });
});
