import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AtomicSearchBar, AtomicModal, AtomicConfirmModal, AtomicFilterPills } from './index.js';

describe('Atomic Design Molecules', () => {
  it('renders AtomicSearchBar and clears input on clear click', () => {
    const handleChange = vi.fn();
    const handleClear = vi.fn();
    render(
      <AtomicSearchBar
        value="Search Term"
        onChange={handleChange}
        onClear={handleClear}
        countText="5 results"
      />
    );
    expect(screen.getByDisplayValue('Search Term')).toBeInTheDocument();
    expect(screen.getByText('5 results')).toBeInTheDocument();

    const clearBtn = screen.getByLabelText(/Clear search/i);
    fireEvent.click(clearBtn);
    expect(handleClear).toHaveBeenCalledTimes(1);
  });

  it('renders AtomicModal when open and closes on close button', () => {
    const handleClose = vi.fn();
    render(
      <AtomicModal isOpen={true} title="Test Modal" onClose={handleClose}>
        <div>Modal Content Body</div>
      </AtomicModal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
    expect(screen.getByText('Modal Content Body')).toBeInTheDocument();

    const closeBtn = screen.getByLabelText(/Close dialog/i);
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('renders AtomicConfirmModal and triggers onConfirm and onCancel', () => {
    const handleConfirm = vi.fn();
    const handleCancel = vi.fn();
    render(
      <AtomicConfirmModal
        isOpen={true}
        title="Delete Document"
        message="Are you sure you want to delete this file?"
        confirmLabel="Confirm Delete"
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    );
    expect(screen.getByText('Delete Document')).toBeInTheDocument();
    expect(screen.getByText('Are you sure you want to delete this file?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));
    expect(handleCancel).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: /Confirm Delete/i }));
    expect(handleConfirm).toHaveBeenCalledTimes(1);
  });

  it('renders AtomicFilterPills and allows clicking different pills', () => {
    const handleSelect = vi.fn();
    const options = ['All Categories', 'Monthly MOM', 'AGM', 'Audit'];
    render(
      <AtomicFilterPills
        options={options}
        selected="All Categories"
        onSelect={handleSelect}
      />
    );
    expect(screen.getByText('All Categories')).toBeInTheDocument();
    expect(screen.getByText('Monthly MOM')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Monthly MOM'));
    expect(handleSelect).toHaveBeenCalledWith('Monthly MOM');
  });
});
