import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import MetricCard from './MetricCard';

describe('MetricCard', () => {
  it('renders the label text', () => {
    render(<MetricCard label="Solar Units" value="1,240" detail="kWh generated" />);
    expect(screen.getByText('Solar Units')).toBeInTheDocument();
  });

  it('renders the value', () => {
    render(<MetricCard label="Solar Units" value="1,240" detail="kWh generated" />);
    expect(screen.getByText('1,240')).toBeInTheDocument();
  });

  it('renders the detail text', () => {
    render(<MetricCard label="Solar Units" value="1,240" detail="kWh generated" />);
    expect(screen.getByText('kWh generated')).toBeInTheDocument();
  });

  it('applies the default tone class "sun" when no tone is provided', () => {
    const { container } = render(<MetricCard label="L" value="V" detail="D" />);
    expect(container.querySelector('article')).toHaveClass('metric-card--sun');
  });

  it('applies a custom tone class when tone prop is provided', () => {
    const { container } = render(<MetricCard label="L" value="V" detail="D" tone="teal" />);
    expect(container.querySelector('article')).toHaveClass('metric-card--teal');
  });

  it('renders inside an <article> element', () => {
    const { container } = render(<MetricCard label="L" value="V" detail="D" />);
    expect(container.querySelector('article')).toBeInTheDocument();
  });

  it('renders an eyebrow <p> for the label', () => {
    const { container } = render(<MetricCard label="My Label" value="V" detail="D" />);
    const eyebrow = container.querySelector('p.eyebrow');
    expect(eyebrow).toHaveTextContent('My Label');
  });
});
