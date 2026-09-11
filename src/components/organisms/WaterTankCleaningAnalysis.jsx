import { useState } from 'react';
import { WATER_TANK_CLEANING_BILLS } from '../../data/waterTankData.js';
import { 
  AlertCircle, 
  CheckCircle2, 
  Printer, 
  Download, 
  Calculator, 
  Building2,
  Scale
} from 'lucide-react';

export default function WaterTankCleaningAnalysis() {
  const [selectedWingTab, setSelectedWingTab] = useState('all'); // 'all' | 'a_building' | 'b_building' | 'c_building'
  const [simulatedRatePer1kL, setSimulatedRatePer1kL] = useState(60); // ₹ per 1,000 L

  const { summary, totals, details, rateDisparityAudit } = WATER_TANK_CLEANING_BILLS;

  // Simulation calculation
  const simulatedTotalCost = Math.round((totals.totalCapacityL / 1000) * simulatedRatePer1kL);
  const costDifference = simulatedTotalCost - totals.totalCleaningBill;

  // Print PDF handler for cleaning audit
  const handlePrintAudit = () => {
    const printWin = window.open('', '_blank');
    if (!printWin) return;

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Majestique Euriska - Water Tank Cleaning Bill Analysis</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; margin: 36px; color: #0f172a; line-height: 1.5; font-size: 12px; }
          .header { border-bottom: 2px solid #0284c7; padding-bottom: 12px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: flex-start; }
          .title { font-size: 20px; font-weight: 800; color: #0369a1; margin: 0; }
          .subtitle { font-size: 12px; color: #64748b; margin-top: 4px; }
          .badge { background: #e0f2fe; color: #0284c7; padding: 4px 10px; border-radius: 4px; font-weight: 700; font-size: 11px; }
          .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 10px; margin-bottom: 20px; }
          .metric-card { border: 1px solid #cbd5e1; padding: 10px; border-radius: 6px; background: #f8fafc; }
          .metric-val { font-size: 16px; font-weight: 800; color: #0f172a; }
          .metric-lbl { font-size: 10px; color: #64748b; margin-bottom: 2px; }
          table { width: 100%; border-collapse: collapse; margin: 12px 0 20px; font-size: 11px; }
          th, td { border: 1px solid #cbd5e1; padding: 6px 10px; text-align: left; }
          th { background: #f1f5f9; font-weight: 700; }
          .section-title { font-size: 14px; font-weight: 700; color: #1e293b; margin: 20px 0 8px; border-bottom: 1px solid #e2e8f0; padding-bottom: 4px; }
          .alert-box { background: #fef3c7; border: 1px solid #f59e0b; padding: 10px 14px; border-radius: 6px; color: #92400e; margin-bottom: 16px; font-size: 11px; }
          .footer { margin-top: 30px; padding-top: 12px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; font-size: 10px; color: #64748b; }
          @media print { body { margin: 16px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">MAJESTIQUE EURISKA CO-OP HOUSING SOCIETY</h1>
            <div class="subtitle">Detailed Water Tank Capacity & Cleaning Bill Analysis • A, B and C Buildings</div>
          </div>
          <div class="badge">Official Invoiced Rate Audit</div>
        </div>

        <div class="alert-box">
          <strong>Important Note:</strong> The invoices are for water tank cleaning services, not tank purchase. The ₹5,100, ₹5,200 and ₹3,200 amounts are the invoiced cleaning totals. The analysis shows exactly how each total is formed and where the quoted rate differs between tanks.
        </div>

        <div class="summary-grid">
          <div class="metric-card">
            <div class="metric-lbl">Total Cleaning Bill</div>
            <div class="metric-val">₹13,500</div>
          </div>
          <div class="metric-card">
            <div class="metric-lbl">Total Capacity Cleaned</div>
            <div class="metric-val">2,14,400 Litres</div>
          </div>
          <div class="metric-card">
            <div class="metric-lbl">Total Tanks Cleaned</div>
            <div class="metric-val">16 Units</div>
          </div>
          <div class="metric-card">
            <div class="metric-lbl">Overall Bill / 1,000 L</div>
            <div class="metric-val">₹62.97</div>
          </div>
        </div>

        <div class="section-title">1. Building-Wise Invoice Summary (Total 231 Flats)</div>
        <table>
          <thead>
            <tr>
              <th>Building</th>
              <th>Flats</th>
              <th>Capacity (L)</th>
              <th>Cleaning Bill (₹)</th>
              <th>Tanks / Units</th>
              <th>Bill / 1,000 L (₹)</th>
              <th>Cost / Flat (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${summary.map(s => {
              const flatCount = s.flats || (s.building === 'A Building' ? 87 : s.building === 'B Building' ? 96 : 48);
              const perFlat = (s.cleaningBill / flatCount).toFixed(2);
              return `
              <tr>
                <td><strong>${s.building}</strong></td>
                <td>${flatCount} Flats</td>
                <td>${s.capacityL.toLocaleString('en-IN')} L</td>
                <td><strong>₹${s.cleaningBill.toLocaleString('en-IN')}</strong></td>
                <td>${s.tanksCount}</td>
                <td><strong>₹${s.billPer1kL.toFixed(2)}</strong></td>
                <td><strong>₹${perFlat}</strong></td>
              </tr>
              `;
            }).join('')}
            <tr style="background: #f8fafc; font-weight: 800;">
              <td>TOTAL</td>
              <td>231 Flats</td>
              <td>${totals.totalCapacityL.toLocaleString('en-IN')} L</td>
              <td style="color: #0284c7;">₹${totals.totalCleaningBill.toLocaleString('en-IN')}</td>
              <td>${totals.totalTanks}</td>
              <td style="color: #0284c7;">₹${totals.overallBillPer1kL.toFixed(2)}</td>
              <td style="color: #0284c7;">₹${(totals.totalCleaningBill / 231).toFixed(2)}</td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">2. A Building Detailed Calculation (75,800 L — ₹5,100)</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Capacity (L)</th>
              <th>Qty</th>
              <th>Invoice Note</th>
              <th>Quoted Cleaning (₹)</th>
              <th>Effective ₹/1,000 L</th>
              <th>Line Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${details.a_building.items.map(item => `
              <tr>
                <td>${item.id}</td>
                <td>${item.capacityL.toLocaleString('en-IN')}</td>
                <td>${item.qty}</td>
                <td>${item.note}</td>
                <td>₹${item.quotedCleaning}</td>
                <td>₹${item.effectivePer1kL.toFixed(2)}</td>
                <td><strong>₹${item.lineTotal}</strong></td>
              </tr>
            `).join('')}
            <tr style="background: #f1f5f9; font-weight: 700;">
              <td colspan="4">TOTAL</td>
              <td>₹${details.a_building.totalBill}</td>
              <td>₹${details.a_building.billPer1kL.toFixed(2)}</td>
              <td><strong>₹${details.a_building.totalBill}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">3. B Building Detailed Calculation (88,600 L — ₹5,200)</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Capacity (L)</th>
              <th>Qty</th>
              <th>Invoice Note</th>
              <th>Quoted Cleaning (₹)</th>
              <th>Effective ₹/1,000 L</th>
              <th>Line Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${details.b_building.items.map(item => `
              <tr>
                <td>${item.id}</td>
                <td>${item.capacityL.toLocaleString('en-IN')}</td>
                <td>${item.qty}</td>
                <td>${item.note}</td>
                <td>₹${item.quotedCleaning}</td>
                <td>₹${item.effectivePer1kL.toFixed(2)}</td>
                <td><strong>₹${item.lineTotal}</strong></td>
              </tr>
            `).join('')}
            <tr style="background: #f1f5f9; font-weight: 700;">
              <td colspan="4">TOTAL</td>
              <td>₹${details.b_building.totalBill}</td>
              <td>₹${details.b_building.billPer1kL.toFixed(2)}</td>
              <td><strong>₹${details.b_building.totalBill}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">4. C Building Detailed Calculation (50,000 L — ₹3,200)</div>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Capacity (L)</th>
              <th>Qty</th>
              <th>Invoice Note</th>
              <th>Quoted Cleaning (₹)</th>
              <th>Effective ₹/1,000 L</th>
              <th>Line Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${details.c_building.items.map(item => `
              <tr>
                <td>${item.id}</td>
                <td>${item.capacityL.toLocaleString('en-IN')}</td>
                <td>${item.qty}</td>
                <td>${item.note}</td>
                <td>₹${item.quotedCleaning}</td>
                <td>₹${item.effectivePer1kL.toFixed(2)}</td>
                <td><strong>₹${item.lineTotal}</strong></td>
              </tr>
            `).join('')}
            <tr style="background: #f1f5f9; font-weight: 700;">
              <td colspan="4">TOTAL</td>
              <td>₹${details.c_building.totalBill}</td>
              <td>₹${details.c_building.billPer1kL.toFixed(2)}</td>
              <td><strong>₹${details.c_building.totalBill}</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">5. Direct Rate Observations & Disparity Analysis</div>
        <ul>
          ${rateDisparityAudit.directObservations.map(o => `
            <li style="margin-bottom: 6px;"><strong>${o.point}:</strong> ${o.observation}</li>
          `).join('')}
        </ul>

        <div style="background: #f8fafc; border: 1px solid #cbd5e1; padding: 12px; border-radius: 6px; margin-top: 16px;">
          <strong>Auditor Conclusion:</strong> ${rateDisparityAudit.conclusion}
        </div>

        <div class="footer">
          <div>Report Generated: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
          <div>Society Office: Majestique Euriska CHS</div>
          <div>Treasurer / Chairman: __________________________</div>
        </div>
      </body>
      </html>
    `;

    printWin.document.open();
    printWin.document.write(html);
    printWin.document.close();
    printWin.focus();
    setTimeout(() => {
      printWin.print();
    }, 400);
  };

  // Export CSV
  const handleExportCSV = () => {
    let csv = 'Building,Unit Number,Capacity (L),Qty,Invoice Note,Quoted Cleaning (INR),Effective Rate per 1000L (INR),Line Total (INR)\n';

    ['a_building', 'b_building', 'c_building'].forEach(wingKey => {
      const wing = details[wingKey];
      wing.items.forEach(item => {
        csv += `"${wing.building}",${item.id},${item.capacityL},${item.qty},"${item.note}",${item.quotedCleaning},${item.effectivePer1kL},${item.lineTotal}\n`;
      });
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Majestique_Euriska_Water_Tank_Cleaning_Bill_Analysis.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      
      {/* Important Context Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)',
        border: '1px solid #fde68a',
        borderRadius: '16px',
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '16px',
        boxShadow: '0 4px 15px rgba(245, 158, 11, 0.08)'
      }}>
        <div style={{
          width: '40px',
          height: '40px',
          borderRadius: '10px',
          background: '#f59e0b',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <AlertCircle size={22} />
        </div>
        <div style={{ flex: 1 }}>
          <h3 style={{ margin: '0 0 4px', fontSize: '1rem', fontWeight: 800, color: '#92400e' }}>
            Invoiced Water Tank Cleaning Bill & Capacity Rate Audit
          </h3>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#78350f', lineHeight: 1.5 }}>
            <strong>Important Clarification:</strong> The invoices analyzed below are for <strong>water tank sanitization & cleaning services</strong>, not tank purchase. The <strong>₹5,100</strong> (A), <strong>₹5,200</strong> (B), and <strong>₹3,200</strong> (C) amounts are the actual invoiced cleaning totals. The analysis uncovers line-by-line pricing, effective ₹/1,000 L, and identifies where rates differ between wings.
          </p>
        </div>
        
        <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
          <button
            onClick={handlePrintAudit}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #d97706',
              background: '#ffffff',
              color: '#b45309',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Printer size={15} /> Print Audit PDF
          </button>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '8px 14px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              background: '#ffffff',
              color: '#334155',
              fontWeight: 700,
              fontSize: '0.8rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '16px'
      }}>
        {/* Card 1: Total Cleaning Bill */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
            Total Invoiced Cleaning Bill
          </span>
          <strong style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0284c7' }}>
            ₹{totals.totalCleaningBill.toLocaleString('en-IN')}
          </strong>
          <span style={{ fontSize: '0.72rem', color: '#059669', display: 'block', marginTop: '4px', fontWeight: 600 }}>
            ₹58.44 / flat across 231 flats (A: 87 · B: 96 · C: 48)
          </span>
        </div>

        {/* Card 2: Total Storage Cleaned */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
            Total Overhead Storage Cleaned
          </span>
          <strong style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
            {totals.totalCapacityL.toLocaleString('en-IN')} L
          </strong>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
            16 Listed Tanks / Units across 3 Wings
          </span>
        </div>

        {/* Card 3: Overall Bill per 1,000 L */}
        <div style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '18px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginBottom: '4px' }}>
            Society Effective Rate
          </span>
          <strong style={{ fontSize: '1.6rem', fontWeight: 900, color: '#0f172a' }}>
            ₹{totals.overallBillPer1kL.toFixed(2)}
          </strong>
          <span style={{ fontSize: '0.72rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
            Per 1,000 Litres Cleaned
          </span>
        </div>

        {/* Card 4: Most Cost-Efficient Wing */}
        <div style={{
          background: '#f0fdf4',
          borderRadius: '14px',
          padding: '18px',
          border: '1px solid #bbf7d0',
          boxShadow: '0 2px 10px rgba(0,0,0,0.03)'
        }}>
          <span style={{ fontSize: '0.75rem', color: '#166534', display: 'block', marginBottom: '4px' }}>
            Lowest Rate per 1,000 L
          </span>
          <strong style={{ fontSize: '1.6rem', fontWeight: 900, color: '#15803d' }}>
            B Building (₹58.69)
          </strong>
          <span style={{ fontSize: '0.72rem', color: '#16a34a', display: 'block', marginTop: '4px', fontWeight: 600 }}>
            Lowest unit cost despite largest capacity
          </span>
        </div>
      </div>

      {/* Building Summary Table */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
      }}>
        <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Building2 size={18} color="#0284c7" /> Building Capacity & Invoiced Cleaning Bill Comparison
        </h3>

        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontWeight: 700 }}>Building</th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>Flats</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>Capacity (L)</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>Cleaning Bill (₹)</th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>Tanks</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>Bill / 1,000 L</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>Cost / Flat</th>
                <th style={{ padding: '12px', textAlign: 'right', color: '#475569', fontWeight: 700 }}>Storage / Flat</th>
                <th style={{ padding: '12px', textAlign: 'center', color: '#475569', fontWeight: 700 }}>Efficiency Rank</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, idx) => {
                const flatCount = row.flats || (row.building === 'A Building' ? 87 : row.building === 'B Building' ? 96 : 48);
                const costPerFlat = (row.cleaningBill / flatCount).toFixed(2);
                const storagePerFlat = Math.round(row.capacityL / flatCount);
                return (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: 700, color: row.color, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: row.color }} />
                      {row.building}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 700, color: '#0f172a' }}>
                      <span style={{ background: '#f1f5f9', padding: '3px 8px', borderRadius: '6px', fontSize: '0.78rem' }}>
                        {flatCount} Flats
                      </span>
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600 }}>{row.capacityL.toLocaleString('en-IN')} L</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>₹{row.cleaningBill.toLocaleString('en-IN')}</td>
                    <td style={{ padding: '12px', textAlign: 'center', fontWeight: 600 }}>{row.tanksCount}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: row.billPer1kL < 60 ? '#15803d' : '#0f172a' }}>
                      ₹{row.billPer1kL.toFixed(2)}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 800, color: '#0284c7' }}>
                      ₹{costPerFlat}
                    </td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>
                      {storagePerFlat} L
                    </td>
                    <td style={{ padding: '12px', textAlign: 'center' }}>
                      {row.building === 'B Building' ? (
                        <span style={{ background: '#dcfce7', color: '#15803d', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                          ★ Lowest (Rank 1)
                        </span>
                      ) : row.building === 'C Building' ? (
                        <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                          Rank 2
                        </span>
                      ) : (
                        <span style={{ background: '#fef3c7', color: '#b45309', padding: '3px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                          Rank 3 (₹67.28)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr style={{ background: '#f8fafc', borderTop: '2px solid #cbd5e1', fontWeight: 800 }}>
                <td style={{ padding: '12px', color: '#0f172a' }}>TOTAL</td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#0284c7' }}>231 Flats</td>
                <td style={{ padding: '12px', textAlign: 'right' }}>{totals.totalCapacityL.toLocaleString('en-IN')} L</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#0284c7', fontSize: '1rem' }}>₹{totals.totalCleaningBill.toLocaleString('en-IN')}</td>
                <td style={{ padding: '12px', textAlign: 'center' }}>{totals.totalTanks}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#0284c7', fontSize: '1rem' }}>₹{totals.overallBillPer1kL.toFixed(2)}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#0284c7', fontSize: '0.95rem' }}>₹{(totals.totalCleaningBill / 231).toFixed(2)}</td>
                <td style={{ padding: '12px', textAlign: 'right', color: '#475569' }}>{Math.round(totals.totalCapacityL / 231)} L</td>
                <td style={{ padding: '12px', textAlign: 'center', color: '#64748b' }}>Average</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Building-Wise Detailed Calculations */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800, color: '#0f172a' }}>
              Building-Wise Line-by-Line Tank Cleaning Details
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Shows exactly how each building total is formed and where quoted rates differ
            </span>
          </div>

          {/* Wing Switcher */}
          <div style={{ display: 'flex', gap: '6px', background: '#f1f5f9', padding: '4px', borderRadius: '10px' }}>
            <button
              onClick={() => setSelectedWingTab('all')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: selectedWingTab === 'all' ? '#0284c7' : 'transparent',
                color: selectedWingTab === 'all' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              All Wings
            </button>
            <button
              onClick={() => setSelectedWingTab('a_building')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: selectedWingTab === 'a_building' ? '#2563eb' : 'transparent',
                color: selectedWingTab === 'a_building' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              A Building (₹5,100)
            </button>
            <button
              onClick={() => setSelectedWingTab('b_building')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: selectedWingTab === 'b_building' ? '#0284c7' : 'transparent',
                color: selectedWingTab === 'b_building' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              B Building (₹5,200)
            </button>
            <button
              onClick={() => setSelectedWingTab('c_building')}
              style={{
                padding: '6px 12px',
                borderRadius: '6px',
                border: 'none',
                background: selectedWingTab === 'c_building' ? '#059669' : 'transparent',
                color: selectedWingTab === 'c_building' ? '#ffffff' : '#64748b',
                fontWeight: 700,
                fontSize: '0.78rem',
                cursor: 'pointer'
              }}
            >
              C Building (₹3,200)
            </button>
          </div>
        </div>

        {/* Wing Cards Grid */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* A Building Detail */}
          {(selectedWingTab === 'all' || selectedWingTab === 'a_building') && (
            <div style={{
              borderRadius: '14px',
              border: '1px solid #bfdbfe',
              background: '#f8fafc',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#eff6ff',
                padding: '14px 20px',
                borderBottom: '1px solid #bfdbfe',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#2563eb', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem' }}>
                    Wing A
                  </span>
                  <strong style={{ fontSize: '1rem', color: '#1e3a8a' }}>A Building — Detailed Calculation</strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(Capacity: 75,800 L • 6 Units)</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#2563eb' }}>₹5,100</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Effective ₹67.28 / 1,000 L</span>
                </div>
              </div>

              <div style={{ padding: '16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>#</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Capacity (L)</th>
                      <th style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>Qty</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#64748b' }}>Invoice Note</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Quoted Cleaning (₹)</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Effective ₹/1,000 L</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Invoice Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.a_building.items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{item.id}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{item.capacityL.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ padding: '8px', color: item.note === '2 in 1' ? '#2563eb' : '#64748b', fontWeight: item.note === '2 in 1' ? 700 : 400 }}>
                          {item.note}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>₹{item.quotedCleaning.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: item.effectivePer1kL > 100 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                          ₹{item.effectivePer1kL.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          ₹{item.lineTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#eff6ff', fontWeight: 800, borderTop: '2px solid #bfdbfe' }}>
                      <td colSpan={4} style={{ padding: '10px', color: '#1e3a8a' }}>TOTAL A BUILDING</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#1e3a8a' }}>₹{details.a_building.totalBill}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#1e3a8a' }}>₹{details.a_building.billPer1kL.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#2563eb', fontSize: '0.95rem' }}>₹{details.a_building.totalBill}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b' }}>
                  <strong>Bill Calculation:</strong> {details.a_building.calculationFormula}
                </div>
              </div>
            </div>
          )}

          {/* B Building Detail */}
          {(selectedWingTab === 'all' || selectedWingTab === 'b_building') && (
            <div style={{
              borderRadius: '14px',
              border: '1px solid #bae6fd',
              background: '#f8fafc',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#f0f9ff',
                padding: '14px 20px',
                borderBottom: '1px solid #bae6fd',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#0284c7', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem' }}>
                    Wing B
                  </span>
                  <strong style={{ fontSize: '1rem', color: '#0369a1' }}>B Building — Detailed Calculation</strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(Capacity: 88,600 L • 6 Units)</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#0284c7' }}>₹5,200</strong>
                  <span style={{ fontSize: '0.75rem', color: '#15803d', display: 'block', fontWeight: 700 }}>Effective ₹58.69 / 1,000 L (Best Rate)</span>
                </div>
              </div>

              <div style={{ padding: '16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>#</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Capacity (L)</th>
                      <th style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>Qty</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#64748b' }}>Invoice Note</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Quoted Cleaning (₹)</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Effective ₹/1,000 L</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Invoice Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.b_building.items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{item.id}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{item.capacityL.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ padding: '8px', color: item.note === '2 in 1' ? '#0284c7' : '#64748b', fontWeight: item.note === '2 in 1' ? 700 : 400 }}>
                          {item.note}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>₹{item.quotedCleaning.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: item.effectivePer1kL > 100 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                          ₹{item.effectivePer1kL.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          ₹{item.lineTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f0f9ff', fontWeight: 800, borderTop: '2px solid #bae6fd' }}>
                      <td colSpan={4} style={{ padding: '10px', color: '#0369a1' }}>TOTAL B BUILDING</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#0369a1' }}>₹{details.b_building.totalBill}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#0369a1' }}>₹{details.b_building.billPer1kL.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#0284c7', fontSize: '0.95rem' }}>₹{details.b_building.totalBill}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b' }}>
                  <strong>Bill Calculation:</strong> {details.b_building.calculationFormula}
                </div>
              </div>
            </div>
          )}

          {/* C Building Detail */}
          {(selectedWingTab === 'all' || selectedWingTab === 'c_building') && (
            <div style={{
              borderRadius: '14px',
              border: '1px solid #a7f3d0',
              background: '#f8fafc',
              overflow: 'hidden'
            }}>
              <div style={{
                background: '#f0fdf4',
                padding: '14px 20px',
                borderBottom: '1px solid #a7f3d0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ background: '#059669', color: '#fff', padding: '4px 10px', borderRadius: '6px', fontWeight: 800, fontSize: '0.8rem' }}>
                    Wing C
                  </span>
                  <strong style={{ fontSize: '1rem', color: '#065f46' }}>C Building — Detailed Calculation</strong>
                  <span style={{ fontSize: '0.8rem', color: '#64748b' }}>(Capacity: 50,000 L • 4 Units)</span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong style={{ fontSize: '1.1rem', color: '#059669' }}>₹3,200</strong>
                  <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block' }}>Effective ₹64.00 / 1,000 L</span>
                </div>
              </div>

              <div style={{ padding: '16px', overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                  <thead>
                    <tr style={{ background: '#ffffff', borderBottom: '1px solid #e2e8f0' }}>
                      <th style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>#</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Capacity (L)</th>
                      <th style={{ padding: '8px', textAlign: 'center', color: '#64748b' }}>Qty</th>
                      <th style={{ padding: '8px', textAlign: 'left', color: '#64748b' }}>Invoice Note</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Quoted Cleaning (₹)</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Effective ₹/1,000 L</th>
                      <th style={{ padding: '8px', textAlign: 'right', color: '#64748b' }}>Invoice Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.c_building.items.map(item => (
                      <tr key={item.id} style={{ borderBottom: '1px solid #f1f5f9', background: '#fff' }}>
                        <td style={{ padding: '8px', textAlign: 'center', fontWeight: 700 }}>{item.id}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>{item.capacityL.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px', textAlign: 'center' }}>{item.qty}</td>
                        <td style={{ padding: '8px', color: '#64748b' }}>{item.note}</td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 700 }}>₹{item.quotedCleaning.toLocaleString('en-IN')}</td>
                        <td style={{ padding: '8px', textAlign: 'right', color: item.effectivePer1kL > 100 ? '#dc2626' : '#059669', fontWeight: 700 }}>
                          ₹{item.effectivePer1kL.toFixed(2)}
                        </td>
                        <td style={{ padding: '8px', textAlign: 'right', fontWeight: 800, color: '#0f172a' }}>
                          ₹{item.lineTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    <tr style={{ background: '#f0fdf4', fontWeight: 800, borderTop: '2px solid #a7f3d0' }}>
                      <td colSpan={4} style={{ padding: '10px', color: '#065f46' }}>TOTAL C BUILDING</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#065f46' }}>₹{details.c_building.totalBill}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#065f46' }}>₹{details.c_building.billPer1kL.toFixed(2)}</td>
                      <td style={{ padding: '10px', textAlign: 'right', color: '#059669', fontSize: '0.95rem' }}>₹{details.c_building.totalBill}</td>
                    </tr>
                  </tbody>
                </table>
                <div style={{ marginTop: '10px', fontSize: '0.75rem', color: '#64748b' }}>
                  <strong>Bill Calculation:</strong> {details.c_building.calculationFormula}
                </div>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RATE DISPARITY AUDIT: WHERE CHARGE IS HIGHER OR LOWER         */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#fef2f2',
            color: '#dc2626',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Scale size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Where the Cleaning Charge Is Higher or Lower (Audit Analysis)
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Compares identical capacities appearing in more than one building
            </span>
          </div>
        </div>

        {/* Identical Capacity Table */}
        <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Capacity (L)</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>A Charge</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>B Charge</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>C Charge</th>
                <th style={{ padding: '10px', textAlign: 'right', color: '#475569' }}>Lowest Seen</th>
                <th style={{ padding: '10px', textAlign: 'left', color: '#475569' }}>Difference vs Lowest</th>
                <th style={{ padding: '10px', textAlign: 'center', color: '#475569' }}>Audit Finding</th>
              </tr>
            </thead>
            <tbody>
              {rateDisparityAudit.identicalComparisons.map((item, i) => (
                <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                  <td style={{ padding: '10px', fontWeight: 800, color: '#0f172a' }}>{item.capacityL.toLocaleString('en-IN')} L</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{item.aCharge !== '—' ? `₹${item.aCharge}` : '—'}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600, color: item.status === 'Discrepancy' ? '#dc2626' : '#0f172a' }}>
                    {item.bCharge !== '—' ? `₹${item.bCharge}` : '—'}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 600 }}>{item.cCharge !== '—' ? `₹${item.cCharge}` : '—'}</td>
                  <td style={{ padding: '10px', textAlign: 'right', fontWeight: 800, color: '#16a34a' }}>₹{item.lowestSeen}</td>
                  <td style={{ padding: '10px', fontWeight: 600, color: item.status === 'Discrepancy' ? '#dc2626' : '#15803d' }}>
                    {item.differenceVsLowest}
                  </td>
                  <td style={{ padding: '10px', textAlign: 'center' }}>
                    {item.status === 'Discrepancy' ? (
                      <span style={{ background: '#fee2e2', color: '#b91c1c', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                        ⚠ +₹100 Rate Variance
                      </span>
                    ) : (
                      <span style={{ background: '#dcfce7', color: '#15803d', padding: '4px 8px', borderRadius: '6px', fontSize: '0.72rem', fontWeight: 700 }}>
                        ✓ Uniform Quoted Price
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Direct Observations List */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '12px',
          marginBottom: '20px'
        }}>
          {rateDisparityAudit.directObservations.map((obs, i) => (
            <div key={i} style={{
              background: '#f8fafc',
              padding: '12px 14px',
              borderRadius: '10px',
              border: '1px solid #e2e8f0',
              fontSize: '0.8rem'
            }}>
              <div style={{ fontWeight: 800, color: '#1e293b', marginBottom: '4px' }}>
                • {obs.point}
              </div>
              <div style={{ color: '#475569', lineHeight: 1.4 }}>
                {obs.observation}
              </div>
            </div>
          ))}
        </div>

        {/* Auditor Conclusion Callout */}
        <div style={{
          background: '#f0fdf4',
          border: '1px solid #86efac',
          borderRadius: '12px',
          padding: '16px 20px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '12px'
        }}>
          <CheckCircle2 size={20} color="#16a34a" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div style={{ fontSize: '0.82rem', color: '#166534', lineHeight: 1.5 }}>
            <strong style={{ fontSize: '0.9rem', display: 'block', marginBottom: '4px', color: '#14532d' }}>
              Society Audit Conclusion & Next Steps:
            </strong>
            {rateDisparityAudit.conclusion}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RATE CARD STANDARDIZATION SIMULATOR                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          marginBottom: '16px',
          paddingBottom: '12px',
          borderBottom: '1px solid #f1f5f9'
        }}>
          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: '#f5f3ff',
            color: '#7c3aed',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Calculator size={18} />
          </div>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>
              Standard Contractual Rate Card Simulator
            </h3>
            <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
              Simulate vendor contract negotiations with a standardized rate per 1,000 Litres
            </span>
          </div>
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '24px',
          alignItems: 'center'
        }}>
          {/* Controls */}
          <div>
            <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: '#334155', marginBottom: '8px' }}>
              Proposed Standardized Rate: <strong style={{ color: '#0284c7', fontSize: '1rem' }}>₹{simulatedRatePer1kL} / 1,000 L</strong>
            </label>
            <input
              type="range"
              min="40"
              max="80"
              step="1"
              value={simulatedRatePer1kL}
              onChange={(e) => setSimulatedRatePer1kL(Number(e.target.value))}
              style={{ width: '100%', accentColor: '#0284c7', cursor: 'pointer' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', color: '#94a3b8', marginTop: '4px' }}>
              <span>₹40/1kL (Aggressive)</span>
              <span>₹58.69/1kL (B-Wing Rate)</span>
              <span>₹62.97/1kL (Current Avg)</span>
              <span>₹80/1kL</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '14px' }}>
              {[50, 55, 58.69, 60, 62.97].map((r) => (
                <button
                  key={r}
                  onClick={() => setSimulatedRatePer1kL(r)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '6px',
                    border: simulatedRatePer1kL === r ? '2px solid #0284c7' : '1px solid #cbd5e1',
                    background: simulatedRatePer1kL === r ? '#f0f9ff' : '#ffffff',
                    color: simulatedRatePer1kL === r ? '#0284c7' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                >
                  ₹{r}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome Card */}
          <div style={{
            background: costDifference <= 0 ? 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)' : 'linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)',
            borderRadius: '14px',
            padding: '20px',
            border: costDifference <= 0 ? '1px solid #86efac' : '1px solid #fca5a5'
          }}>
            <div style={{ fontSize: '0.8rem', color: costDifference <= 0 ? '#15803d' : '#b91c1c', fontWeight: 700, marginBottom: '4px' }}>
              {costDifference <= 0 ? 'Projected Society Savings' : 'Projected Cost Increase'}
            </div>
            
            <div style={{ fontSize: '1.8rem', fontWeight: 900, color: costDifference <= 0 ? '#15803d' : '#b91c1c' }}>
              {costDifference <= 0 ? `Savings: ₹${Math.abs(costDifference).toLocaleString('en-IN')}` : `Extra: ₹${costDifference.toLocaleString('en-IN')}`}
            </div>

            <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '8px', lineHeight: 1.5 }}>
              • Current Actual Invoice Total: <strong>₹{totals.totalCleaningBill.toLocaleString('en-IN')}</strong> (@ ₹62.97/1kL)<br />
              • Simulated Contract Total: <strong>₹{simulatedTotalCost.toLocaleString('en-IN')}</strong> (@ ₹{simulatedRatePer1kL}/1kL across 2,14,400 L)
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
