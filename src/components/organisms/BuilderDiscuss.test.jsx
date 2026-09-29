import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import BuilderDiscuss from './BuilderDiscuss.jsx';

describe('BuilderDiscuss Component - Design & Features', () => {
  it('renders the header with Eisha Asset Developers branding, metrics, and CA Claim Dues', () => {
    render(<BuilderDiscuss isAdmin={true} />);

    expect(screen.getByText(/Builder Discuss Ledger/i)).toBeInTheDocument();
    expect(screen.getByText(/BUILDER ENGAGEMENT & WORKS/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Eisha Asset Developers/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/CA Claim Dues/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹12,07,058/i).length).toBeGreaterThan(0);
  });

  it('renders extracted Developer Maintenance Reco data accurately', () => {
    render(<BuilderDiscuss isAdmin={false} />);

    // Total Receipts
    expect(screen.getAllByText(/₹1,25,89,569/i).length).toBeGreaterThan(0);
    // Net Expenses
    expect(screen.getAllByText(/₹1,19,77,053.50/i).length).toBeGreaterThan(0);
    // Working Net Balance
    expect(screen.getAllByText(/₹6,12,515.50/i).length).toBeGreaterThan(0);
    // Closing Tally Balance (31.03.2026)
    expect(screen.getAllByText(/₹1,10,199.23/i).length).toBeGreaterThan(0);

    // Cost shift items
    expect(screen.getByText(/Cost Shift B to A — Electricity/i)).toBeInTheDocument();
    expect(screen.getByText(/Cost Shift B to A — Gardening/i)).toBeInTheDocument();
    expect(screen.getByText(/Cost Shift B to A — Swimming pool/i)).toBeInTheDocument();

    // Audit variance and post 2023 transactions
    expect(screen.getByText(/STVAT-A-805-Prasad Yadavilli/i)).toBeInTheDocument();
    expect(screen.getByText(/B Bldg F & F Maintenance Trf/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹6,954.90/i).length).toBeGreaterThan(0);
  });

  it('opens scanned audit document modal when inspect button is clicked', async () => {
    const user = userEvent.setup();
    render(<BuilderDiscuss isAdmin={false} />);

    const inspectBtn = screen.getByRole('button', { name: /Inspect Scanned Audit Sheet/i });
    await user.click(inspectBtn);

    expect(screen.getByText(/OFFICIAL AUDIT DOCUMENTATION/i)).toBeInTheDocument();
    expect(screen.getByRole('img', { name: /Eisha Asset Developers Phase II Maintenance Reco/i })).toBeInTheDocument();
  });

  it('switches to Wing A Certified Audit tab and renders complete audited statement', async () => {
    const user = userEvent.setup();
    render(<BuilderDiscuss isAdmin={false} />);

    const wingATab = screen.getByRole('button', { name: /Wing A Certified Audit/i });
    await user.click(wingATab);

    expect(screen.getByText(/Majestique Eureska A Building Co-Op. Housing Society Ltd./i)).toBeInTheDocument();
    expect(screen.getByText(/Rohit Dhage & Associates/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹61,76,531/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹22,19,896/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹39,56,635/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Security Charges/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹7,53,615/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Pool Maint. Charges/i)).toBeInTheDocument();
  });

  it('switches to BOM Passbook Ledger tab and renders verified transactions and highlights', async () => {
    const user = userEvent.setup();
    render(<BuilderDiscuss isAdmin={false} />);

    const ledgerTab = screen.getByRole('button', { name: /BOM Passbook Ledger/i });
    await user.click(ledgerTab);

    expect(screen.getByText(/BANK OF MAHARASHTRA • A\/C 60305942224/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹56,24,072.90/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹50,04,602.50/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹6,19,470.40/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹24,00,000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹6,20,000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Opening Balance/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/BPCL-E CMS/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Marshal Force Security Services/i).length).toBeGreaterThan(0);
  });

  it('switches to CA Hardik Mehta Report tab and renders recoverable dues and audit data', async () => {
    const user = userEvent.setup();
    render(<BuilderDiscuss isAdmin={false} />);

    const caReportTab = screen.getByRole('button', { name: /CA Hardik Mehta Report/i });
    await user.click(caReportTab);

    // Auditor & Title details
    expect(screen.getByText(/CA Hardik S. Mehta/i)).toBeInTheDocument();
    expect(screen.getAllByText(/26162502TFCJWK8860/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/REPORT ON THE AMOUNT RECOVERABLE BY MAJESTIQUE EURISKA BUILDING A FROM THE BUILDER/i)).toBeInTheDocument();

    // Key financial figures
    expect(screen.getAllByText(/₹12,07,058/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹63,50,867/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹30,50,077/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹24,00,000/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹9,00,790/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹3,06,268/i).length).toBeGreaterThan(0);

    // Annexure 1 Section 3 statement table
    expect(screen.getByText(/Maintenance \(excluding GST\) on residential flats/i)).toBeInTheDocument();
    expect(screen.getByText(/Maintenance on Commercial shops/i)).toBeInTheDocument();
  });

  it('allows navigating to Annexure 3 Invoices and Annexure 4 Missing Invoices in CA Report', async () => {
    const user = userEvent.setup();
    render(<BuilderDiscuss isAdmin={false} defaultTab="caReport" />);

    // Switch to 176 Invoices Register
    const invoicesSubTab = screen.getByRole('button', { name: /176 Invoices Register/i });
    await user.click(invoicesSubTab);

    expect(screen.getByText(/Complete register of 176 vouched transactions verified by CA Hardik Mehta/i)).toBeInTheDocument();
    expect(screen.getAllByText(/Rohit Dhage & Associates/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Clean Up Services/i).length).toBeGreaterThan(0);

    // Switch to Missing Invoices (Annexure 4)
    const missingSubTab = screen.getByRole('button', { name: /Missing Invoices/i });
    await user.click(missingSubTab);

    expect(screen.getByText(/Annexure 4 — List of Missing Invoices Considered on Estimated Basis/i)).toBeInTheDocument();
    expect(screen.getByText(/Schindler India Pvt. Ltd./i)).toBeInTheDocument();
    expect(screen.getByText(/₹1,73,458/i)).toBeInTheDocument();
    expect(screen.getByText(/₹2,35,753/i)).toBeInTheDocument();
  });

  it('switches to BOM vs CA Missing Bills analytics tab and renders forensic analysis', async () => {
    const user = userEvent.setup();
    render(<BuilderDiscuss isAdmin={false} />);

    const bomAnalyticsTab = screen.getByRole('button', { name: /BOM vs CA Missing Bills/i });
    await user.click(bomAnalyticsTab);

    expect(screen.getByText(/BOM Passbook Ledger vs CA Missing Invoices Analytics/i)).toBeInTheDocument();
    expect(screen.getByText(/FORENSIC CROSS-AUDIT & RECONCILIATION/i)).toBeInTheDocument();
    expect(screen.getAllByText(/₹4,09,211/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/₹15,31,050.50/i).length).toBeGreaterThan(0);
  });
});
