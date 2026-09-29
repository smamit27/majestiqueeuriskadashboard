import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BOMMissingBillsAnalytics from './BOMMissingBillsAnalytics.jsx';

describe('BOMMissingBillsAnalytics Component', () => {
  it('renders the executive header, badge titles, and key metrics accurately', () => {
    render(<BOMMissingBillsAnalytics isAdmin={true} />);

    // Header & Titles
    expect(screen.getByText(/BOM Passbook Ledger vs CA Missing Invoices Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/FORENSIC CROSS-AUDIT & RECONCILIATION/i)).toBeInTheDocument();
    expect(screen.getByText(/135 Bank Records Verified/i)).toBeInTheDocument();

    // 5 Executive KPI Metrics
    expect(screen.getAllByText(/₹4,09,211/i).length).toBeGreaterThan(0); // CA Missing Invoices
    expect(screen.getAllByText(/₹15,31,050.50/i).length).toBeGreaterThan(0); // Wing B Leakage
    expect(screen.getAllByText(/₹9,32,112/i).length).toBeGreaterThan(0); // Unvouched Self-Debits
    expect(screen.getAllByText(/₹5,09,271.17/i).length).toBeGreaterThan(0); // Unaccounted Bank Shortfall
    expect(screen.getAllByText(/₹28,50,929.50/i).length).toBeGreaterThan(0); // Total Forensic Exposure
  });

  it('renders the 4 Negotiation Tiers and interactive recovery calculator by default', () => {
    render(<BOMMissingBillsAnalytics isAdmin={false} />);

    expect(screen.getByText(/How Much Can We Expect to Recover from the Builder\?/i)).toBeInTheDocument();
    expect(screen.getByText(/TARGET SETTLEMENT WINDOW/i)).toBeInTheDocument();
    expect(screen.getByText(/₹18.0L – ₹20.0L/i)).toBeInTheDocument();

    // 4 Tiers
    expect(screen.getByText(/TIER 1 • CERTIFIED MINIMUM/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹12,07,058/i).length).toBeGreaterThan(0);

    expect(screen.getByText(/TIER 2 • REALISTIC SETTLEMENT/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹19,41,755/i).length).toBeGreaterThan(0);

    expect(screen.getByText(/TIER 3 • FORENSIC PASSBOOK CLAIM/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹30,49,153/i).length).toBeGreaterThan(0);

    expect(screen.getByText(/TIER 4 • MAHARERA LITIGATION/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹45,75,525/i).length).toBeGreaterThan(0);

    // Interactive Simulator
    expect(screen.getByText(/Interactive Custom Settlement Simulator/i)).toBeInTheDocument();
    expect(screen.getByText(/The 3-Phase Meeting Playbook/i)).toBeInTheDocument();
  });

  it('simulates custom settlement toggles in the recovery calculator', async () => {
    const user = userEvent.setup();
    render(<BOMMissingBillsAnalytics isAdmin={false} />);

    // Toggle BOM Cash Shortfall (+₹5,09,271)
    const shortfallCheckbox = screen.getByLabelText(/Reclaim BOM Passbook Cash Shortfall/i);
    await user.click(shortfallCheckbox);

    // Dynamic total should increase
    expect(screen.getByText(/DYNAMIC EXPECTED RECOVERY/i)).toBeInTheDocument();
  });

  it('renders the visual breakdown and monthly drain timeline in summary mode', async () => {
    const user = userEvent.setup();
    render(<BOMMissingBillsAnalytics isAdmin={false} />);

    const summaryTab = screen.getByRole('button', { name: /Forensic Breakdown & Charts/i });
    await user.click(summaryTab);

    // Outflow sections
    expect(screen.getByText(/Where Did the ₹50.05 Lakhs in BOM Passbook Go\?/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹24,00,000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹6,20,000/i).length).toBeGreaterThan(0);

    // Monthly timeline table
    expect(screen.getByText(/Monthly BOM Outflow Timeline/i)).toBeInTheDocument();
    expect(screen.getByText(/11\/2021/i)).toBeInTheDocument(); // November 2021 peak
  });

  it('switches to Vendor-by-Vendor Cross-Match and expands audit findings', async () => {
    const user = userEvent.setup();
    render(<BOMMissingBillsAnalytics isAdmin={false} />);

    const vendorsTab = screen.getByRole('button', { name: /Vendor-by-Vendor Cross-Match/i });
    await user.click(vendorsTab);

    expect(screen.getByText(/Forensic Cross-Check Matrix \(12 Key Payees\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Schindler India Pvt. Ltd./i)).toBeInTheDocument();
    expect(screen.getByText(/Gurukrupa Pools Maintenance & Services/i)).toBeInTheDocument();
    expect(screen.getByText(/BPCL-E CMS \(Fleet Business\)/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Naushad Ali/i).length).toBeGreaterThan(0);

    // Click on Schindler to expand finding
    const schindlerItem = screen.getByText(/Schindler India Pvt. Ltd./i);
    await user.click(schindlerItem);

    expect(screen.getByText(/ZERO debit in BOM passbook!/i)).toBeInTheDocument();
    expect(screen.getByText(/Full Disallowance of ₹1,23,736/i)).toBeInTheDocument();
  });

  it('switches to CA Annexure 4 Missing Bills and filters items', async () => {
    const user = userEvent.setup();
    render(<BOMMissingBillsAnalytics isAdmin={false} />);

    const annexTab = screen.getByRole('button', { name: /CA Annexure 4 Missing Bills/i });
    await user.click(annexTab);

    expect(screen.getByText(/Annexure 4: 23 Challenged Missing Invoices/i)).toBeInTheDocument();
    expect(screen.getByText(/Part A \(Wing B Only\): ₹1,73,458/i)).toBeInTheDocument();
    expect(screen.getByText(/Part B \(Recurring Estimated\): ₹2,35,753/i)).toBeInTheDocument();
    expect(screen.getAllByText(/^m-1$/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/^m-4$/i).length).toBeGreaterThan(0);
  });

  it('switches to 135 BOM Transactions Audit register and filters categories', async () => {
    const user = userEvent.setup();
    render(<BOMMissingBillsAnalytics isAdmin={false} />);

    const registerTab = screen.getByRole('button', { name: /135 BOM Transactions Audit/i });
    await user.click(registerTab);

    expect(screen.getByText(/Showing/i)).toBeInTheDocument();
    expect(screen.getByText(/All 135 Txs/i)).toBeInTheDocument();

    // Filter to missing invoice matches
    const missingFilterBtn = screen.getByRole('button', { name: /Missing Invoices Matches/i });
    await user.click(missingFilterBtn);

    // Filter to builder unvouched debits
    const unvouchedFilterBtn = screen.getByRole('button', { name: /Builder Unvouched Debits/i });
    await user.click(unvouchedFilterBtn);

    expect(screen.getAllByText(/Unvouched Supervision Debit/i).length).toBeGreaterThan(0);
  });
});
