import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import LiquidGlassCard from './LiquidGlassCard.jsx';
import LiquidGlassKpi from './LiquidGlassKpi.jsx';
import KpiGrid from './KpiGrid.jsx';
import KpiSkeleton from './KpiSkeleton.jsx';
import KpiEmptyState from './KpiEmptyState.jsx';
import KpiErrorState from './KpiErrorState.jsx';

describe('Liquid Glass Component Suite', () => {
  it('renders LiquidGlassCard with translucent surface and children', () => {
    const { container } = render(
      <LiquidGlassCard variant="society">
        <span>Test Content</span>
      </LiquidGlassCard>
    );
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('liquid-glass-card');
    expect(container.firstChild).toHaveClass('liquid-glass-kpi--society');
  });

  it('handles keyboard interaction and click for interactive LiquidGlassCard', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <LiquidGlassCard onClick={handleClick}>
        <span>Clickable Card</span>
      </LiquidGlassCard>
    );

    const card = container.firstChild;
    expect(card).toHaveAttribute('role', 'button');
    expect(card).toHaveAttribute('tabindex', '0');

    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  it('renders LiquidGlassKpi with title, value, icon, and trend', () => {
    render(
      <LiquidGlassKpi
        title="Total Flats"
        value={229}
        status="society"
        icon={<span>🏢</span>}
        description="3 Residential wings"
        trend={{ value: '+4.2%', isPositive: true }}
      />
    );

    expect(screen.getByText('Total Flats')).toBeInTheDocument();
    expect(screen.getByText('229')).toBeInTheDocument();
    expect(screen.getByText('3 Residential wings')).toBeInTheDocument();
    expect(screen.getByText(/4\.2%/)).toBeInTheDocument();
  });

  it('formats Indian currency properly when currency flag is enabled', () => {
    render(
      <LiquidGlassKpi
        title="Maintenance Billed"
        value={286000}
        currency={true}
        status="finance"
      />
    );

    expect(screen.getByText(/₹2\.86L/)).toBeInTheDocument();
  });

  it('renders building-wise breakdown tags when provided', () => {
    render(
      <LiquidGlassKpi
        title="Total Capacity"
        value="231 Flats"
        breakdown={[
          { label: 'Wing A', value: '87' },
          { label: 'Wing B', value: '96' },
          { label: 'Wing C', value: '48' }
        ]}
      />
    );

    expect(screen.getByText('Wing A:')).toBeInTheDocument();
    expect(screen.getByText('87')).toBeInTheDocument();
    expect(screen.getByText('Wing B:')).toBeInTheDocument();
    expect(screen.getByText('Wing C:')).toBeInTheDocument();
  });

  it('renders KpiSkeleton during loading state', () => {
    const { container } = render(
      <LiquidGlassKpi title="Loading Stat" value={100} loading={true} />
    );

    expect(container.querySelector('.kpi-skeleton')).toBeInTheDocument();
    expect(screen.queryByText('Loading Stat')).not.toBeInTheDocument();
  });

  it('renders KpiErrorState when error prop is present', () => {
    render(
      <LiquidGlassKpi
        title="Error Stat"
        value={100}
        error="Firestore permission denied"
      />
    );

    expect(screen.getByText('Firestore permission denied')).toBeInTheDocument();
    expect(screen.getByText('Error Stat')).toBeInTheDocument();
  });

  it('renders KpiEmptyState and KpiGrid properly', () => {
    render(
      <KpiGrid columns={4}>
        <KpiEmptyState title="Not Configured" description="Sensor offline" />
      </KpiGrid>
    );

    expect(screen.getByText('Not Configured')).toBeInTheDocument();
    expect(screen.getByText('Sensor offline')).toBeInTheDocument();
  });
});
