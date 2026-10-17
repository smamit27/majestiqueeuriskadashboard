import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import ModuleLoadingFallback from './ModuleLoadingFallback.jsx';

describe('ModuleLoadingFallback', () => {
  it('renders default loading message', () => {
    render(<ModuleLoadingFallback />);
    expect(screen.getByText('Loading Module...')).toBeInTheDocument();
    expect(screen.getByText('Loading optimized module chunk on demand')).toBeInTheDocument();
    expect(screen.getByRole('status')).toBeInTheDocument();
  });

  it('renders custom label when provided', () => {
    render(<ModuleLoadingFallback label="Loading Parking Allotment" />);
    expect(screen.getByText('Loading Parking Allotment...')).toBeInTheDocument();
  });
});
