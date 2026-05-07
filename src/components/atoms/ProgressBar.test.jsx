import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ProgressBar from './ProgressBar';

describe('ProgressBar', () => {
  it('renders the label', () => {
    render(<ProgressBar label="Collection" value={60} total={100} />);
    expect(screen.getByText('Collection')).toBeInTheDocument();
  });

  it('shows the correct percentage text', () => {
    render(<ProgressBar label="Collection" value={75} total={100} />);
    expect(screen.getByText('75%')).toBeInTheDocument();
  });

  it('rounds the percentage to the nearest integer', () => {
    render(<ProgressBar label="Collection" value={1} total={3} />);
    // 1/3 = 33.33… → rounds to 33
    expect(screen.getByText('33%')).toBeInTheDocument();
  });

  it('caps percentage at 100% when value exceeds total', () => {
    render(<ProgressBar label="Collection" value={150} total={100} />);
    expect(screen.getByText('100%')).toBeInTheDocument();
  });

  it('shows 0% when total is 0 (avoids division by zero)', () => {
    render(<ProgressBar label="Collection" value={50} total={0} />);
    expect(screen.getByText('0%')).toBeInTheDocument();
  });

  it('sets the fill bar width to the correct percentage', () => {
    const { container } = render(<ProgressBar label="Collection" value={40} total={100} />);
    const fill = container.querySelector('.progress-fill');
    expect(fill).toHaveStyle({ width: '40%' });
  });

  it('applies the default tone class "teal"', () => {
    const { container } = render(<ProgressBar label="L" value={50} total={100} />);
    expect(container.querySelector('.progress-fill')).toHaveClass('progress-fill--teal');
  });

  it('applies a custom tone class when provided', () => {
    const { container } = render(<ProgressBar label="L" value={50} total={100} tone="sun" />);
    expect(container.querySelector('.progress-fill')).toHaveClass('progress-fill--sun');
  });
});
