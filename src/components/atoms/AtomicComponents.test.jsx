import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AtomicButton, AtomicBadge, AtomicInput, AtomicIconButton, AtomicEmptyState } from './index.js';
import { Trash2 } from 'lucide-react';

describe('Atomic Design Atoms', () => {
  it('renders AtomicButton with correct variant and triggers onClick', () => {
    const handleClick = vi.fn();
    render(<AtomicButton variant="danger" onClick={handleClick}>Delete Flat</AtomicButton>);
    const btn = screen.getByRole('button', { name: /Delete Flat/i });
    expect(btn).toHaveClass('atomic-btn--danger');
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders AtomicBadge with status-based variant', () => {
    const { rerender } = render(<AtomicBadge status="Cleared" />);
    expect(screen.getByText('Cleared')).toHaveClass('atomic-badge--success');

    rerender(<AtomicBadge status="Overdue" />);
    expect(screen.getByText('Overdue')).toHaveClass('atomic-badge--danger');

    rerender(<AtomicBadge status="Pending" />);
    expect(screen.getByText('Pending')).toHaveClass('atomic-badge--warning');
  });

  it('renders AtomicInput and updates value', () => {
    const handleChange = vi.fn();
    render(<AtomicInput placeholder="Enter Flat Number" onChange={handleChange} />);
    const input = screen.getByPlaceholderText(/Enter Flat Number/i);
    expect(input).toHaveClass('atomic-input');
    fireEvent.change(input, { target: { value: 'A-101' } });
    expect(handleChange).toHaveBeenCalled();
  });

  it('renders AtomicIconButton with title and tooltip', () => {
    const handleClick = vi.fn();
    render(<AtomicIconButton icon={Trash2} title="Remove Item" onClick={handleClick} />);
    const btn = screen.getByTitle('Remove Item');
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('renders AtomicEmptyState with title and description', () => {
    render(<AtomicEmptyState title="No documents found" description="Upload a MOM or audit dossier" />);
    expect(screen.getByText('No documents found')).toBeInTheDocument();
    expect(screen.getByText('Upload a MOM or audit dossier')).toBeInTheDocument();
  });
});
