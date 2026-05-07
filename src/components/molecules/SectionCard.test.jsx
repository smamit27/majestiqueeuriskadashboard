import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import SectionCard from './SectionCard';

describe('SectionCard', () => {
  it('renders the title', () => {
    render(<SectionCard title="Finance" badge="Module" subtitle="Overview" />);
    expect(screen.getByText('Finance')).toBeInTheDocument();
  });

  it('renders the badge text', () => {
    render(<SectionCard title="Finance" badge="MODULE" subtitle="Overview" />);
    expect(screen.getByText('MODULE')).toBeInTheDocument();
  });

  it('renders the subtitle text', () => {
    render(<SectionCard title="Finance" badge="MODULE" subtitle="Monthly overview" />);
    expect(screen.getByText('Monthly overview')).toBeInTheDocument();
  });

  it('renders children inside the body', () => {
    render(
      <SectionCard title="T" badge="B" subtitle="S">
        <p>Child content</p>
      </SectionCard>
    );
    expect(screen.getByText('Child content')).toBeInTheDocument();
  });

  it('applies the id prop to the <section> element', () => {
    const { container } = render(
      <SectionCard id="finance-section" title="T" badge="B" subtitle="S" />
    );
    expect(container.querySelector('#finance-section')).toBeInTheDocument();
  });

  it('uses a <section> as the root element with the section-card class', () => {
    const { container } = render(<SectionCard title="T" badge="B" subtitle="S" />);
    const section = container.querySelector('section.section-card');
    expect(section).toBeInTheDocument();
  });

  it('renders the title inside an <h2>', () => {
    render(<SectionCard title="My Title" badge="B" subtitle="S" />);
    expect(screen.getByRole('heading', { level: 2, name: 'My Title' })).toBeInTheDocument();
  });

  it('renders the body wrapper div', () => {
    const { container } = render(<SectionCard title="T" badge="B" subtitle="S" />);
    expect(container.querySelector('.section-card__body')).toBeInTheDocument();
  });
});
