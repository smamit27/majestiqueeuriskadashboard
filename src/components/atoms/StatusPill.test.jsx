import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusPill from './StatusPill';

describe('StatusPill', () => {
  it('renders the value text', () => {
    render(<StatusPill value="Paid" />);
    expect(screen.getByText('Paid')).toBeInTheDocument();
  });

  it('applies the correct CSS class for single-word values', () => {
    const { container } = render(<StatusPill value="Paid" />);
    expect(container.querySelector('span')).toHaveClass('status-pill--paid');
  });

  it('converts spaces to hyphens in the class name', () => {
    const { container } = render(<StatusPill value="In Progress" />);
    expect(container.querySelector('span')).toHaveClass('status-pill--in-progress');
  });

  it('lowercases the class name', () => {
    const { container } = render(<StatusPill value="BOUNCED" />);
    expect(container.querySelector('span')).toHaveClass('status-pill--bounced');
  });

  it('always applies the base status-pill class', () => {
    const { container } = render(<StatusPill value="Pending" />);
    expect(container.querySelector('span')).toHaveClass('status-pill');
  });

  it('renders inside a <span> element', () => {
    const { container } = render(<StatusPill value="Cleared" />);
    expect(container.querySelector('span')).toBeInTheDocument();
  });
});
