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
import './WaterTankCleaningAnalysis.css';


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
            <h1 class="title">MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Detailed Water Tank Capacity &amp; Cleaning Bill Analysis • A, B and C Buildings</div>
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
          <div>Society Office: S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
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
    <div className="water-tank-cleaning-analysis-s1">
      
      {/* Important Context Banner */}
      <div className="water-tank-cleaning-analysis-s2">
        <div className="water-tank-cleaning-analysis-s3">
          <AlertCircle size={22} />
        </div>
        <div className="water-tank-cleaning-analysis-s4">
          <h3 className="water-tank-cleaning-analysis-s5">
            Invoiced Water Tank Cleaning Bill & Capacity Rate Audit
          </h3>
          <p className="water-tank-cleaning-analysis-s6">
            <strong>Important Clarification:</strong> The invoices analyzed below are for <strong>water tank sanitization & cleaning services</strong>, not tank purchase. The <strong>₹5,100</strong> (A), <strong>₹5,200</strong> (B), and <strong>₹3,200</strong> (C) amounts are the actual invoiced cleaning totals. The analysis uncovers line-by-line pricing, effective ₹/1,000 L, and identifies where rates differ between wings.
          </p>
        </div>
        
        <div className="water-tank-cleaning-analysis-s7">
          <button
            onClick={handlePrintAudit}
            className="water-tank-cleaning-analysis-s8"
          >
            <Printer size={15} /> Print Audit PDF
          </button>
          <button
            onClick={handleExportCSV}
            className="water-tank-cleaning-analysis-s9"
          >
            <Download size={15} /> Export CSV
          </button>
        </div>
      </div>

      {/* 4 Summary Cards */}
      <div className="water-tank-cleaning-analysis-s10">
        {/* Card 1: Total Cleaning Bill */}
        <div className="water-tank-cleaning-analysis-s11">
          <span className="water-tank-cleaning-analysis-s12">
            Total Invoiced Cleaning Bill
          </span>
          <strong className="water-tank-cleaning-analysis-s13">
            ₹{totals.totalCleaningBill.toLocaleString('en-IN')}
          </strong>
          <span className="water-tank-cleaning-analysis-s14">
            ₹58.44 / flat across 231 flats (A: 87 · B: 96 · C: 48)
          </span>
        </div>

        {/* Card 2: Total Storage Cleaned */}
        <div className="water-tank-cleaning-analysis-s11">
          <span className="water-tank-cleaning-analysis-s12">
            Total Overhead Storage Cleaned
          </span>
          <strong className="water-tank-cleaning-analysis-s15">
            {totals.totalCapacityL.toLocaleString('en-IN')} L
          </strong>
          <span className="water-tank-cleaning-analysis-s16">
            16 Listed Tanks / Units across 3 Wings
          </span>
        </div>

        {/* Card 3: Overall Bill per 1,000 L */}
        <div className="water-tank-cleaning-analysis-s11">
          <span className="water-tank-cleaning-analysis-s12">
            Society Effective Rate
          </span>
          <strong className="water-tank-cleaning-analysis-s15">
            ₹{totals.overallBillPer1kL.toFixed(2)}
          </strong>
          <span className="water-tank-cleaning-analysis-s16">
            Per 1,000 Litres Cleaned
          </span>
        </div>

        {/* Card 4: Most Cost-Efficient Wing */}
        <div className="water-tank-cleaning-analysis-s17">
          <span className="water-tank-cleaning-analysis-s18">
            Lowest Rate per 1,000 L
          </span>
          <strong className="water-tank-cleaning-analysis-s19">
            B Building (₹58.69)
          </strong>
          <span className="water-tank-cleaning-analysis-s20">
            Lowest unit cost despite largest capacity
          </span>
        </div>
      </div>

      {/* Building Summary Table */}
      <div className="water-tank-cleaning-analysis-s21">
        <h3 className="water-tank-cleaning-analysis-s22">
          <Building2 size={18} color="#0284c7" /> Building Capacity & Invoiced Cleaning Bill Comparison
        </h3>

        <div className="water-tank-cleaning-analysis-s23">
          <table className="water-tank-cleaning-analysis-s24">
            <thead>
              <tr className="water-tank-cleaning-analysis-s25">
                <th className="water-tank-cleaning-analysis-s26">Building</th>
                <th className="water-tank-cleaning-analysis-s27">Flats</th>
                <th className="water-tank-cleaning-analysis-s28">Capacity (L)</th>
                <th className="water-tank-cleaning-analysis-s28">Cleaning Bill (₹)</th>
                <th className="water-tank-cleaning-analysis-s27">Tanks</th>
                <th className="water-tank-cleaning-analysis-s28">Bill / 1,000 L</th>
                <th className="water-tank-cleaning-analysis-s28">Cost / Flat</th>
                <th className="water-tank-cleaning-analysis-s28">Storage / Flat</th>
                <th className="water-tank-cleaning-analysis-s27">Efficiency Rank</th>
              </tr>
            </thead>
            <tbody>
              {summary.map((row, idx) => {
                const flatCount = row.flats || (row.building === 'A Building' ? 87 : row.building === 'B Building' ? 96 : 48);
                const costPerFlat = (row.cleaningBill / flatCount).toFixed(2);
                const storagePerFlat = Math.round(row.capacityL / flatCount);
                return (
                  <tr key={idx} className="water-tank-cleaning-analysis-s29">
                    <td className="water-tank-cleaning-analysis-s30" style={{ color: row.color }}>
                      <span className="water-tank-cleaning-analysis-s31" style={{ background: row.color }} />
                      {row.building}
                    </td>
                    <td className="water-tank-cleaning-analysis-s32">
                      <span className="water-tank-cleaning-analysis-s33">
                        {flatCount} Flats
                      </span>
                    </td>
                    <td className="water-tank-cleaning-analysis-s34">{row.capacityL.toLocaleString('en-IN')} L</td>
                    <td className="water-tank-cleaning-analysis-s35">₹{row.cleaningBill.toLocaleString('en-IN')}</td>
                    <td className="water-tank-cleaning-analysis-s36">{row.tanksCount}</td>
                    <td className={`water-tank-cleaning-analysis-s37 ${(row.billPer1kL < 60 ? 'water-tank-cleaning-analysis-cond-1-true' : 'water-tank-cleaning-analysis-cond-2-false')}`}>
                      ₹{row.billPer1kL.toFixed(2)}
                    </td>
                    <td className="water-tank-cleaning-analysis-s38">
                      ₹{costPerFlat}
                    </td>
                    <td className="water-tank-cleaning-analysis-s39">
                      {storagePerFlat} L
                    </td>
                    <td className="water-tank-cleaning-analysis-s40">
                      {row.building === 'B Building' ? (
                        <span className="water-tank-cleaning-analysis-s41">
                          ★ Lowest (Rank 1)
                        </span>
                      ) : row.building === 'C Building' ? (
                        <span className="water-tank-cleaning-analysis-s42">
                          Rank 2
                        </span>
                      ) : (
                        <span className="water-tank-cleaning-analysis-s43">
                          Rank 3 (₹67.28)
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
              <tr className="water-tank-cleaning-analysis-s44">
                <td className="water-tank-cleaning-analysis-s45">TOTAL</td>
                <td className="water-tank-cleaning-analysis-s46">231 Flats</td>
                <td className="water-tank-cleaning-analysis-s47">{totals.totalCapacityL.toLocaleString('en-IN')} L</td>
                <td className="water-tank-cleaning-analysis-s48">₹{totals.totalCleaningBill.toLocaleString('en-IN')}</td>
                <td className="water-tank-cleaning-analysis-s40">{totals.totalTanks}</td>
                <td className="water-tank-cleaning-analysis-s48">₹{totals.overallBillPer1kL.toFixed(2)}</td>
                <td className="water-tank-cleaning-analysis-s49">₹{(totals.totalCleaningBill / 231).toFixed(2)}</td>
                <td className="water-tank-cleaning-analysis-s50">{Math.round(totals.totalCapacityL / 231)} L</td>
                <td className="water-tank-cleaning-analysis-s51">Average</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Building-Wise Detailed Calculations */}
      <div className="water-tank-cleaning-analysis-s21">
        <div className="water-tank-cleaning-analysis-s52">
          <div>
            <h3 className="water-tank-cleaning-analysis-s53">
              Building-Wise Line-by-Line Tank Cleaning Details
            </h3>
            <span className="water-tank-cleaning-analysis-s54">
              Shows exactly how each building total is formed and where quoted rates differ
            </span>
          </div>

          {/* Wing Switcher */}
          <div className="water-tank-cleaning-analysis-s55">
            <button
              onClick={() => setSelectedWingTab('all')}
              className={`water-tank-cleaning-analysis-s56 ${(selectedWingTab === 'all' ? 'water-tank-cleaning-analysis-cond-3-true' : 'water-tank-cleaning-analysis-cond-4-false')}`}
            >
              All Wings
            </button>
            <button
              onClick={() => setSelectedWingTab('a_building')}
              className={`water-tank-cleaning-analysis-s56 ${(selectedWingTab === 'a_building' ? 'water-tank-cleaning-analysis-cond-5-true' : 'water-tank-cleaning-analysis-cond-6-false')}`}
            >
              A Building (₹5,100)
            </button>
            <button
              onClick={() => setSelectedWingTab('b_building')}
              className={`water-tank-cleaning-analysis-s56 ${(selectedWingTab === 'b_building' ? 'water-tank-cleaning-analysis-cond-7-true' : 'water-tank-cleaning-analysis-cond-8-false')}`}
            >
              B Building (₹5,200)
            </button>
            <button
              onClick={() => setSelectedWingTab('c_building')}
              className={`water-tank-cleaning-analysis-s56 ${(selectedWingTab === 'c_building' ? 'water-tank-cleaning-analysis-cond-9-true' : 'water-tank-cleaning-analysis-cond-10-false')}`}
            >
              C Building (₹3,200)
            </button>
          </div>
        </div>

        {/* Wing Cards Grid */}
        <div className="water-tank-cleaning-analysis-s1">
          
          {/* A Building Detail */}
          {(selectedWingTab === 'all' || selectedWingTab === 'a_building') && (
            <div className="water-tank-cleaning-analysis-s57">
              <div className="water-tank-cleaning-analysis-s58">
                <div className="water-tank-cleaning-analysis-s59">
                  <span className="water-tank-cleaning-analysis-s60">
                    Wing A
                  </span>
                  <strong className="water-tank-cleaning-analysis-s61">A Building — Detailed Calculation</strong>
                  <span className="water-tank-cleaning-analysis-s54">(Capacity: 75,800 L • 6 Units)</span>
                </div>
                <div className="water-tank-cleaning-analysis-s62">
                  <strong className="water-tank-cleaning-analysis-s63">₹5,100</strong>
                  <span className="water-tank-cleaning-analysis-s64">Effective ₹67.28 / 1,000 L</span>
                </div>
              </div>

              <div className="water-tank-cleaning-analysis-s65">
                <table className="water-tank-cleaning-analysis-s66">
                  <thead>
                    <tr className="water-tank-cleaning-analysis-s67">
                      <th className="water-tank-cleaning-analysis-s68">#</th>
                      <th className="water-tank-cleaning-analysis-s69">Capacity (L)</th>
                      <th className="water-tank-cleaning-analysis-s68">Qty</th>
                      <th className="water-tank-cleaning-analysis-s70">Invoice Note</th>
                      <th className="water-tank-cleaning-analysis-s69">Quoted Cleaning (₹)</th>
                      <th className="water-tank-cleaning-analysis-s69">Effective ₹/1,000 L</th>
                      <th className="water-tank-cleaning-analysis-s69">Invoice Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.a_building.items.map(item => (
                      <tr key={item.id} className="water-tank-cleaning-analysis-s71">
                        <td className="water-tank-cleaning-analysis-s72">{item.id}</td>
                        <td className="water-tank-cleaning-analysis-s73">{item.capacityL.toLocaleString('en-IN')}</td>
                        <td className="water-tank-cleaning-analysis-s74">{item.qty}</td>
                        <td className={`water-tank-cleaning-analysis-s75 ${(item.note === '2 in 1' ? 'water-tank-cleaning-analysis-cond-11-true' : 'water-tank-cleaning-analysis-cond-12-false')}`}>
                          {item.note}
                        </td>
                        <td className="water-tank-cleaning-analysis-s73">₹{item.quotedCleaning.toLocaleString('en-IN')}</td>
                        <td className={`water-tank-cleaning-analysis-s73 ${(item.effectivePer1kL > 100 ? 'water-tank-cleaning-analysis-cond-13-true' : 'water-tank-cleaning-analysis-cond-14-false')}`}>
                          ₹{item.effectivePer1kL.toFixed(2)}
                        </td>
                        <td className="water-tank-cleaning-analysis-s76">
                          ₹{item.lineTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    <tr className="water-tank-cleaning-analysis-s77">
                      <td colSpan={4} className="water-tank-cleaning-analysis-s78">TOTAL A BUILDING</td>
                      <td className="water-tank-cleaning-analysis-s79">₹{details.a_building.totalBill}</td>
                      <td className="water-tank-cleaning-analysis-s79">₹{details.a_building.billPer1kL.toFixed(2)}</td>
                      <td className="water-tank-cleaning-analysis-s80">₹{details.a_building.totalBill}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="water-tank-cleaning-analysis-s81">
                  <strong>Bill Calculation:</strong> {details.a_building.calculationFormula}
                </div>
              </div>
            </div>
          )}

          {/* B Building Detail */}
          {(selectedWingTab === 'all' || selectedWingTab === 'b_building') && (
            <div className="water-tank-cleaning-analysis-s82">
              <div className="water-tank-cleaning-analysis-s83">
                <div className="water-tank-cleaning-analysis-s59">
                  <span className="water-tank-cleaning-analysis-s84">
                    Wing B
                  </span>
                  <strong className="water-tank-cleaning-analysis-s85">B Building — Detailed Calculation</strong>
                  <span className="water-tank-cleaning-analysis-s54">(Capacity: 88,600 L • 6 Units)</span>
                </div>
                <div className="water-tank-cleaning-analysis-s62">
                  <strong className="water-tank-cleaning-analysis-s86">₹5,200</strong>
                  <span className="water-tank-cleaning-analysis-s87">Effective ₹58.69 / 1,000 L (Best Rate)</span>
                </div>
              </div>

              <div className="water-tank-cleaning-analysis-s65">
                <table className="water-tank-cleaning-analysis-s66">
                  <thead>
                    <tr className="water-tank-cleaning-analysis-s67">
                      <th className="water-tank-cleaning-analysis-s68">#</th>
                      <th className="water-tank-cleaning-analysis-s69">Capacity (L)</th>
                      <th className="water-tank-cleaning-analysis-s68">Qty</th>
                      <th className="water-tank-cleaning-analysis-s70">Invoice Note</th>
                      <th className="water-tank-cleaning-analysis-s69">Quoted Cleaning (₹)</th>
                      <th className="water-tank-cleaning-analysis-s69">Effective ₹/1,000 L</th>
                      <th className="water-tank-cleaning-analysis-s69">Invoice Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.b_building.items.map(item => (
                      <tr key={item.id} className="water-tank-cleaning-analysis-s71">
                        <td className="water-tank-cleaning-analysis-s72">{item.id}</td>
                        <td className="water-tank-cleaning-analysis-s73">{item.capacityL.toLocaleString('en-IN')}</td>
                        <td className="water-tank-cleaning-analysis-s74">{item.qty}</td>
                        <td className={`water-tank-cleaning-analysis-s75 ${(item.note === '2 in 1' ? 'water-tank-cleaning-analysis-cond-15-true' : 'water-tank-cleaning-analysis-cond-16-false')}`}>
                          {item.note}
                        </td>
                        <td className="water-tank-cleaning-analysis-s73">₹{item.quotedCleaning.toLocaleString('en-IN')}</td>
                        <td className={`water-tank-cleaning-analysis-s73 ${(item.effectivePer1kL > 100 ? 'water-tank-cleaning-analysis-cond-17-true' : 'water-tank-cleaning-analysis-cond-18-false')}`}>
                          ₹{item.effectivePer1kL.toFixed(2)}
                        </td>
                        <td className="water-tank-cleaning-analysis-s76">
                          ₹{item.lineTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    <tr className="water-tank-cleaning-analysis-s88">
                      <td colSpan={4} className="water-tank-cleaning-analysis-s89">TOTAL B BUILDING</td>
                      <td className="water-tank-cleaning-analysis-s90">₹{details.b_building.totalBill}</td>
                      <td className="water-tank-cleaning-analysis-s90">₹{details.b_building.billPer1kL.toFixed(2)}</td>
                      <td className="water-tank-cleaning-analysis-s91">₹{details.b_building.totalBill}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="water-tank-cleaning-analysis-s81">
                  <strong>Bill Calculation:</strong> {details.b_building.calculationFormula}
                </div>
              </div>
            </div>
          )}

          {/* C Building Detail */}
          {(selectedWingTab === 'all' || selectedWingTab === 'c_building') && (
            <div className="water-tank-cleaning-analysis-s92">
              <div className="water-tank-cleaning-analysis-s93">
                <div className="water-tank-cleaning-analysis-s59">
                  <span className="water-tank-cleaning-analysis-s94">
                    Wing C
                  </span>
                  <strong className="water-tank-cleaning-analysis-s95">C Building — Detailed Calculation</strong>
                  <span className="water-tank-cleaning-analysis-s54">(Capacity: 50,000 L • 4 Units)</span>
                </div>
                <div className="water-tank-cleaning-analysis-s62">
                  <strong className="water-tank-cleaning-analysis-s96">₹3,200</strong>
                  <span className="water-tank-cleaning-analysis-s64">Effective ₹64.00 / 1,000 L</span>
                </div>
              </div>

              <div className="water-tank-cleaning-analysis-s65">
                <table className="water-tank-cleaning-analysis-s66">
                  <thead>
                    <tr className="water-tank-cleaning-analysis-s67">
                      <th className="water-tank-cleaning-analysis-s68">#</th>
                      <th className="water-tank-cleaning-analysis-s69">Capacity (L)</th>
                      <th className="water-tank-cleaning-analysis-s68">Qty</th>
                      <th className="water-tank-cleaning-analysis-s70">Invoice Note</th>
                      <th className="water-tank-cleaning-analysis-s69">Quoted Cleaning (₹)</th>
                      <th className="water-tank-cleaning-analysis-s69">Effective ₹/1,000 L</th>
                      <th className="water-tank-cleaning-analysis-s69">Invoice Line Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {details.c_building.items.map(item => (
                      <tr key={item.id} className="water-tank-cleaning-analysis-s71">
                        <td className="water-tank-cleaning-analysis-s72">{item.id}</td>
                        <td className="water-tank-cleaning-analysis-s73">{item.capacityL.toLocaleString('en-IN')}</td>
                        <td className="water-tank-cleaning-analysis-s74">{item.qty}</td>
                        <td className="water-tank-cleaning-analysis-s97">{item.note}</td>
                        <td className="water-tank-cleaning-analysis-s73">₹{item.quotedCleaning.toLocaleString('en-IN')}</td>
                        <td className={`water-tank-cleaning-analysis-s73 ${(item.effectivePer1kL > 100 ? 'water-tank-cleaning-analysis-cond-19-true' : 'water-tank-cleaning-analysis-cond-20-false')}`}>
                          ₹{item.effectivePer1kL.toFixed(2)}
                        </td>
                        <td className="water-tank-cleaning-analysis-s76">
                          ₹{item.lineTotal.toLocaleString('en-IN')}
                        </td>
                      </tr>
                    ))}
                    <tr className="water-tank-cleaning-analysis-s98">
                      <td colSpan={4} className="water-tank-cleaning-analysis-s99">TOTAL C BUILDING</td>
                      <td className="water-tank-cleaning-analysis-s100">₹{details.c_building.totalBill}</td>
                      <td className="water-tank-cleaning-analysis-s100">₹{details.c_building.billPer1kL.toFixed(2)}</td>
                      <td className="water-tank-cleaning-analysis-s101">₹{details.c_building.totalBill}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="water-tank-cleaning-analysis-s81">
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
      <div className="water-tank-cleaning-analysis-s21">
        <div className="water-tank-cleaning-analysis-s102">
          <div className="water-tank-cleaning-analysis-s103">
            <Scale size={18} />
          </div>
          <div>
            <h3 className="water-tank-cleaning-analysis-s104">
              Where the Cleaning Charge Is Higher or Lower (Audit Analysis)
            </h3>
            <span className="water-tank-cleaning-analysis-s54">
              Compares identical capacities appearing in more than one building
            </span>
          </div>
        </div>

        {/* Identical Capacity Table */}
        <div className="water-tank-cleaning-analysis-s105">
          <table className="water-tank-cleaning-analysis-s66">
            <thead>
              <tr className="water-tank-cleaning-analysis-s25">
                <th className="water-tank-cleaning-analysis-s106">Capacity (L)</th>
                <th className="water-tank-cleaning-analysis-s107">A Charge</th>
                <th className="water-tank-cleaning-analysis-s107">B Charge</th>
                <th className="water-tank-cleaning-analysis-s107">C Charge</th>
                <th className="water-tank-cleaning-analysis-s107">Lowest Seen</th>
                <th className="water-tank-cleaning-analysis-s106">Difference vs Lowest</th>
                <th className="water-tank-cleaning-analysis-s108">Audit Finding</th>
              </tr>
            </thead>
            <tbody>
              {rateDisparityAudit.identicalComparisons.map((item, i) => (
                <tr key={i} className="water-tank-cleaning-analysis-s29">
                  <td className="water-tank-cleaning-analysis-s109">{item.capacityL.toLocaleString('en-IN')} L</td>
                  <td className="water-tank-cleaning-analysis-s110">{item.aCharge !== '—' ? `₹${item.aCharge}` : '—'}</td>
                  <td className={`water-tank-cleaning-analysis-s110 ${(item.status === 'Discrepancy' ? 'water-tank-cleaning-analysis-cond-21-true' : 'water-tank-cleaning-analysis-cond-22-false')}`}>
                    {item.bCharge !== '—' ? `₹${item.bCharge}` : '—'}
                  </td>
                  <td className="water-tank-cleaning-analysis-s110">{item.cCharge !== '—' ? `₹${item.cCharge}` : '—'}</td>
                  <td className="water-tank-cleaning-analysis-s111">₹{item.lowestSeen}</td>
                  <td className={`water-tank-cleaning-analysis-s112 ${(item.status === 'Discrepancy' ? 'water-tank-cleaning-analysis-cond-23-true' : 'water-tank-cleaning-analysis-cond-24-false')}`}>
                    {item.differenceVsLowest}
                  </td>
                  <td className="water-tank-cleaning-analysis-s113">
                    {item.status === 'Discrepancy' ? (
                      <span className="water-tank-cleaning-analysis-s114">
                        ⚠ +₹100 Rate Variance
                      </span>
                    ) : (
                      <span className="water-tank-cleaning-analysis-s115">
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
        <div className="water-tank-cleaning-analysis-s116">
          {rateDisparityAudit.directObservations.map((obs, i) => (
            <div key={i} className="water-tank-cleaning-analysis-s117">
              <div className="water-tank-cleaning-analysis-s118">
                • {obs.point}
              </div>
              <div className="water-tank-cleaning-analysis-s119">
                {obs.observation}
              </div>
            </div>
          ))}
        </div>

        {/* Auditor Conclusion Callout */}
        <div className="water-tank-cleaning-analysis-s120">
          <CheckCircle2 size={20} color="#16a34a" className="water-tank-cleaning-analysis-s121" />
          <div className="water-tank-cleaning-analysis-s122">
            <strong className="water-tank-cleaning-analysis-s123">
              Society Audit Conclusion & Next Steps:
            </strong>
            {rateDisparityAudit.conclusion}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* RATE CARD STANDARDIZATION SIMULATOR                           */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="water-tank-cleaning-analysis-s21">
        <div className="water-tank-cleaning-analysis-s102">
          <div className="water-tank-cleaning-analysis-s124">
            <Calculator size={18} />
          </div>
          <div>
            <h3 className="water-tank-cleaning-analysis-s104">
              Standard Contractual Rate Card Simulator
            </h3>
            <span className="water-tank-cleaning-analysis-s54">
              Simulate vendor contract negotiations with a standardized rate per 1,000 Litres
            </span>
          </div>
        </div>

        <div className="water-tank-cleaning-analysis-s125">
          {/* Controls */}
          <div>
            <label className="water-tank-cleaning-analysis-s126">
              Proposed Standardized Rate: <strong className="water-tank-cleaning-analysis-s127">₹{simulatedRatePer1kL} / 1,000 L</strong>
            </label>
            <input
              type="range"
              min="40"
              max="80"
              step="1"
              value={simulatedRatePer1kL}
              onChange={(e) => setSimulatedRatePer1kL(Number(e.target.value))}
              className="water-tank-cleaning-analysis-s128"
            />
            <div className="water-tank-cleaning-analysis-s129">
              <span>₹40/1kL (Aggressive)</span>
              <span>₹58.69/1kL (B-Wing Rate)</span>
              <span>₹62.97/1kL (Current Avg)</span>
              <span>₹80/1kL</span>
            </div>

            <div className="water-tank-cleaning-analysis-s130">
              {[50, 55, 58.69, 60, 62.97].map((r) => (
                <button
                  key={r}
                  onClick={() => setSimulatedRatePer1kL(r)}
                  className={`water-tank-cleaning-analysis-s131 ${(simulatedRatePer1kL === r ? 'water-tank-cleaning-analysis-cond-25-true' : 'water-tank-cleaning-analysis-cond-26-false')}`}
                >
                  ₹{r}
                </button>
              ))}
            </div>
          </div>

          {/* Outcome Card */}
          <div className={`water-tank-cleaning-analysis-s132 ${(costDifference <= 0 ? 'water-tank-cleaning-analysis-cond-27-true' : 'water-tank-cleaning-analysis-cond-28-false')}`}>
            <div className={`water-tank-cleaning-analysis-s133 ${(costDifference <= 0 ? 'water-tank-cleaning-analysis-cond-29-true' : 'water-tank-cleaning-analysis-cond-30-false')}`}>
              {costDifference <= 0 ? 'Projected Society Savings' : 'Projected Cost Increase'}
            </div>
            
            <div className={`water-tank-cleaning-analysis-s134 ${(costDifference <= 0 ? 'water-tank-cleaning-analysis-cond-31-true' : 'water-tank-cleaning-analysis-cond-32-false')}`}>
              {costDifference <= 0 ? `Savings: ₹${Math.abs(costDifference).toLocaleString('en-IN')}` : `Extra: ₹${costDifference.toLocaleString('en-IN')}`}
            </div>

            <div className="water-tank-cleaning-analysis-s135">
              • Current Actual Invoice Total: <strong>₹{totals.totalCleaningBill.toLocaleString('en-IN')}</strong> (@ ₹62.97/1kL)<br />
              • Simulated Contract Total: <strong>₹{simulatedTotalCost.toLocaleString('en-IN')}</strong> (@ ₹{simulatedRatePer1kL}/1kL across 2,14,400 L)
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
