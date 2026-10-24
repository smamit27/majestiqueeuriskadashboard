import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import MultiSelectDropdown from './MultiSelectDropdown.jsx';
import { COMMITTEE_MEMBERS } from '../../data/committeeMembersData.js';

describe('MultiSelectDropdown Component', () => {
  it('renders default placeholder and label when no members are selected', () => {
    render(
      <MultiSelectDropdown
        options={COMMITTEE_MEMBERS}
        selectedValues={[]}
        onChange={vi.fn()}
        label="Key Attendees & Committee Members Present"
      />
    );

    expect(screen.getByText(/Key Attendees & Committee Members Present/i)).toBeInTheDocument();
    expect(screen.getByText(/Select Committee Members Present.../i)).toBeInTheDocument();
  });

  it('opens dropdown menu on trigger click and shows wing tabs with 26 members', () => {
    render(
      <MultiSelectDropdown
        options={COMMITTEE_MEMBERS}
        selectedValues={[]}
        onChange={vi.fn()}
      />
    );

    // Open dropdown
    const trigger = screen.getByText(/Select Committee Members Present.../i);
    fireEvent.click(trigger);

    // Check tabs
    expect(screen.getByText(/All \(26\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Wing A \(10\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Wing B \(8\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Wing C \(8\)/i)).toBeInTheDocument();

    // Check sample members from Wing A, B, C
    expect(screen.getByText('A-204')).toBeInTheDocument();
    expect(screen.getByText('Neha')).toBeInTheDocument();
    expect(screen.getByText('B-204')).toBeInTheDocument();
    expect(screen.getByText('Sudhir')).toBeInTheDocument();
    expect(screen.getByText('C-306')).toBeInTheDocument();
    expect(screen.getByText('Rohan')).toBeInTheDocument();
  });

  it('calls onChange with updated array when a committee member is toggled', () => {
    const handleChange = vi.fn();
    render(
      <MultiSelectDropdown
        options={COMMITTEE_MEMBERS}
        selectedValues={['A-204']}
        onChange={handleChange}
      />
    );

    // Open dropdown
    const trigger = screen.getByTestId('multiselect-trigger');
    fireEvent.click(trigger);

    // Click on A-301 (Sandeep) to select
    const sandeepItem = screen.getByText('Sandeep');
    fireEvent.click(sandeepItem);

    expect(handleChange).toHaveBeenCalledWith(['A-204', 'A-301']);
  });

  it('filters member options when typing in the search box', () => {
    render(
      <MultiSelectDropdown
        options={COMMITTEE_MEMBERS}
        selectedValues={[]}
        onChange={vi.fn()}
      />
    );

    const trigger = screen.getByText(/Select Committee Members Present.../i);
    fireEvent.click(trigger);

    const searchInput = screen.getByPlaceholderText(/Search flat no/i);
    fireEvent.change(searchInput, { target: { value: 'Sachin' } });

    // Sachin (A-704) should be visible
    expect(screen.getByText('Sachin')).toBeInTheDocument();
    expect(screen.getByText('A-704')).toBeInTheDocument();

    // Other members like Sandeep shouldn't be in the list
    expect(screen.queryByText('Sandeep')).not.toBeInTheDocument();
  });

  it('filters options by Wing when clicking a Wing tab', () => {
    render(
      <MultiSelectDropdown
        options={COMMITTEE_MEMBERS}
        selectedValues={[]}
        onChange={vi.fn()}
      />
    );

    const trigger = screen.getByText(/Select Committee Members Present.../i);
    fireEvent.click(trigger);

    // Click Wing B tab
    const wingBTab = screen.getByText(/Wing B \(8\)/i);
    fireEvent.click(wingBTab);

    // Wing B members visible
    expect(screen.getByText('B-204')).toBeInTheDocument();
    expect(screen.getByText('Sudhir')).toBeInTheDocument();

    // Wing A members not visible
    expect(screen.queryByText('A-204')).not.toBeInTheDocument();
  });

  it('allows batch select visible and deselect visible', () => {
    const handleChange = vi.fn();
    render(
      <MultiSelectDropdown
        options={COMMITTEE_MEMBERS}
        selectedValues={[]}
        onChange={handleChange}
        activeScope="A_BUILDING"
      />
    );

    const trigger = screen.getByText(/Select Committee Members Present.../i);
    fireEvent.click(trigger);

    // Click "+ Select Visible" for Wing A (10 members)
    const selectVisibleBtn = screen.getByText(/\+ Select Visible/i);
    fireEvent.click(selectVisibleBtn);

    expect(handleChange).toHaveBeenCalled();
    const calledWith = handleChange.mock.calls[0][0];
    expect(calledWith.length).toBe(10);
    expect(calledWith).toContain('A-204');
    expect(calledWith).toContain('A-1007');
  });

  it('allows adding a custom attendee like Estate Manager or Auditor', () => {
    const handleChange = vi.fn();
    render(
      <MultiSelectDropdown
        options={COMMITTEE_MEMBERS}
        selectedValues={['A-204']}
        onChange={handleChange}
        allowCustom={true}
      />
    );

    const trigger = screen.getByTestId('multiselect-trigger');
    fireEvent.click(trigger);

    const customInput = screen.getByPlaceholderText(/Add other attendee/i);
    fireEvent.change(customInput, { target: { value: 'Estate Manager (Mr. Patil)' } });

    const addBtn = screen.getByRole('button', { name: /Add/i });
    fireEvent.click(addBtn);

    expect(handleChange).toHaveBeenCalledWith(['A-204', 'Estate Manager (Mr. Patil)']);
  });

  it('allows removing an attendee chip tag', () => {
    const handleChange = vi.fn();
    render(
      <MultiSelectDropdown
        options={COMMITTEE_MEMBERS}
        selectedValues={['A-204', 'B-204']}
        onChange={handleChange}
      />
    );

    // Find the chip for A-204 and click its remove button
    const removeButtons = screen.getAllByRole('button');
    // First remove button inside the chips
    fireEvent.click(removeButtons[0]);

    expect(handleChange).toHaveBeenCalledWith(['B-204']);
  });
});
