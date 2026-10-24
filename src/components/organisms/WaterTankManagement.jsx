import { useState } from 'react';
import { 
  WATER_TANKS_DATA, 
  SOCIETY_WATER_SUMMARY, 
  WATER_SUPPLY_SCHEDULES,
  WATER_QUALITY_TEST_RESULTS,
  TANK_CLEANING_HISTORY,
  ANCILLARY_WATER_INFRASTRUCTURE,
  WATER_TANK_CLEANING_BILLS
} from '../../data/waterTankData.js';
import WaterTank2DSchematic from './WaterTank2DSchematic.jsx';
import WaterTank3DDiagram from './WaterTank3DDiagram.jsx';
import WaterTankLevelMonitor from './WaterTankLevelMonitor.jsx';
import WaterTankCleaningAnalysis from './WaterTankCleaningAnalysis.jsx';
import LiquidGlassCard from '../liquid-glass/LiquidGlassCard.jsx';
import { 
  Box, 
  Layers, 
  Activity, 
  Calendar, 
  ShieldCheck, 
  Download, 
  Printer, 
  Clock,
  Zap,
  DollarSign
} from 'lucide-react';
import './WaterTankManagement.css';


export default function WaterTankManagement({ isAdmin: _isAdmin = false }) {
  const [activeTab, setActiveTab] = useState('3d'); // '3d' | '2d' | 'monitor' | 'schedule' | 'hygiene'
  const [_selectedTankId, setSelectedTankId] = useState('common_underground');

  // Print PDF handler for complete water management technical report
  const handlePrintReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Majestique Euriska - Water Tank Infrastructure & Compliance Report</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 40px;
            color: #0f172a;
            line-height: 1.5;
          }
          .header {
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .title { font-size: 22px; font-weight: 800; color: #0369a1; margin: 0; }
          .subtitle { font-size: 13px; color: #64748b; margin-top: 4px; }
          .badge {
            background: #e0f2fe;
            color: #0284c7;
            padding: 6px 12px;
            border-radius: 6px;
            font-weight: 700;
            font-size: 12px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 12px;
            margin-bottom: 24px;
          }
          .metric-card {
            border: 1px solid #cbd5e1;
            padding: 12px;
            border-radius: 8px;
            background: #f8fafc;
          }
          .metric-val { font-size: 18px; font-weight: 800; color: #0f172a; margin-top: 4px; }
          .metric-lbl { font-size: 11px; color: #64748b; }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 16px 0 24px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #cbd5e1;
            padding: 8px 12px;
            text-align: left;
          }
          th { background: #f1f5f9; font-weight: 700; }
          .section-title {
            font-size: 15px;
            font-weight: 700;
            color: #1e293b;
            margin: 24px 0 8px;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 4px;
          }
          .footer {
            margin-top: 40px;
            padding-top: 16px;
            border-top: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            font-size: 11px;
            color: #64748b;
          }
          @media print {
            body { margin: 20px; }
            button { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Official Water Tank Capacity, Pipeline Architecture &amp; Compliance Log</div>
          </div>
          <div class="badge">Official Technical Spec</div>
        </div>

        <div class="grid">
          <div class="metric-card">
            <div class="metric-lbl">Total Storage Capacity</div>
            <div class="metric-val">5,39,400 Litres</div>
          </div>
          <div class="metric-card">
            <div class="metric-lbl">Underground Sump</div>
            <div class="metric-val">3,25,000 Litres</div>
          </div>
          <div class="metric-card">
            <div class="metric-lbl">Overhead Tanks (A, B, C)</div>
            <div class="metric-val">2,14,400 Litres</div>
          </div>
          <div class="metric-card">
            <div class="metric-lbl">Dedicated Fire Reserve</div>
            <div class="metric-val">1,00,000 Litres</div>
          </div>
        </div>

        <div class="section-title">1. Building-Wise Water Storage Capacity (From Invoices)</div>
        <table>
          <thead>
            <tr>
              <th>Building / Location</th>
              <th>Type</th>
              <th>Installed Units</th>
              <th>Invoice Capacity</th>
              <th>Primary Supply Purpose</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><strong>A Building</strong></td>
              <td>Terrace Overhead Tank</td>
              <td>5 Units</td>
              <td><strong>75,800 Litres</strong></td>
              <td>Wing A Domestic (87 Flats: A-101 to A-1108) & Flushing</td>
            </tr>
            <tr>
              <td><strong>B Building</strong></td>
              <td>Terrace Overhead Tank</td>
              <td>6 Units</td>
              <td><strong>88,600 Litres</strong></td>
              <td>Wing B Domestic (96 Flats) & Flushing</td>
            </tr>
            <tr>
              <td><strong>C Building</strong></td>
              <td>Terrace Overhead Tank</td>
              <td>5 Units</td>
              <td><strong>50,000 Litres</strong></td>
              <td>Wing C Domestic (48 Flats) & Flushing (50,600L Label)</td>
            </tr>
            <tr>
              <td><strong>Common Underground Tank</strong></td>
              <td>Central Sub-Surface Sump</td>
              <td>4 Chambers</td>
              <td><strong>3,25,000 Litres</strong></td>
              <td>Central Reservoir, Fire Fighting (100K L) & Booster Station</td>
            </tr>
            <tr style="background: #f8fafc; font-weight: 800;">
              <td colspan="3"><strong>TOTAL SOCIETY WATER STORAGE (231 Flats)</strong></td>
              <td colspan="2"><strong style="color: #0284c7; font-size: 14px;">539,400 Litres</strong></td>
            </tr>
          </tbody>
        </table>

        <div class="section-title">2. Water Quality & Lab Testing Analysis (Safe for Human Consumption)</div>
        <table>
          <thead>
            <tr>
              <th>Parameter Tested</th>
              <th>Recorded Value</th>
              <th>Acceptable Standard Limit</th>
              <th>Compliance Status</th>
            </tr>
          </thead>
          <tbody>
            ${WATER_QUALITY_TEST_RESULTS.map(r => `
              <tr>
                <td>${r.parameter}</td>
                <td><strong>${r.value}</strong></td>
                <td>${r.acceptableLimit}</td>
                <td style="color: #16a34a; font-weight: 700;">✓ ${r.status}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">3. Statutory Tank Cleaning & Hygiene Log</div>
        <table>
          <thead>
            <tr>
              <th>Tank Unit</th>
              <th>Cleaned Date</th>
              <th>Next Due Date</th>
              <th>Vendor & Sanitization Method</th>
              <th>Certificate No.</th>
            </tr>
          </thead>
          <tbody>
            ${TANK_CLEANING_HISTORY.map(c => `
              <tr>
                <td><strong>${c.tanks}</strong></td>
                <td>${c.date}</td>
                <td><strong style="color: #d97706;">${c.nextDue}</strong></td>
                <td>${c.vendor} (${c.method})</td>
                <td>${c.certificateNo}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">4. Invoiced Water Tank Cleaning Bill & Rate Analysis (₹13,500 Total)</div>
        <table>
          <thead>
            <tr>
              <th>Building</th>
              <th>Capacity Cleaned</th>
              <th>Cleaning Bill</th>
              <th>Tanks / Units</th>
              <th>Effective Bill / 1,000 L</th>
            </tr>
          </thead>
          <tbody>
            ${WATER_TANK_CLEANING_BILLS.summary.map(s => `
              <tr>
                <td><strong>${s.building}</strong></td>
                <td>${s.capacityL.toLocaleString('en-IN')} L</td>
                <td><strong>₹${s.cleaningBill.toLocaleString('en-IN')}</strong></td>
                <td>${s.tanksCount} Units</td>
                <td><strong>₹${s.billPer1kL.toFixed(2)}</strong></td>
              </tr>
            `).join('')}
            <tr style="background: #f8fafc; font-weight: 800;">
              <td>TOTAL OVERHEAD</td>
              <td>${WATER_TANK_CLEANING_BILLS.totals.totalCapacityL.toLocaleString('en-IN')} L</td>
              <td style="color: #0284c7;">₹${WATER_TANK_CLEANING_BILLS.totals.totalCleaningBill.toLocaleString('en-IN')}</td>
              <td>${WATER_TANK_CLEANING_BILLS.totals.totalTanks} Units</td>
              <td style="color: #0284c7;">₹${WATER_TANK_CLEANING_BILLS.totals.overallBillPer1kL.toFixed(2)} / 1,000 L</td>
            </tr>
          </tbody>
        </table>
        <div style="font-size: 11px; color: #475569; background: #f8fafc; padding: 8px 12px; border: 1px solid #cbd5e1; border-radius: 6px;">
          <strong>Audit Observation:</strong> 30,700 L tank line shows A = ₹1,400 vs B = ₹1,500 (+₹100 variance). Overall effective rate ranges from ₹58.69 (B) to ₹67.28 (A) per 1,000 L.
        </div>

        <div class="footer">
          <div>Generated on: ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</div>
          <div>Society Office: S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
          <div>Authorized Signatory: _________________________</div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 400);
  };

  // Export JSON specification
  const handleExportJSON = () => {
    const exportData = {
      society: 'Majestique Euriska Co-Op Housing Society',
      document: 'Water Tank Management & Infrastructure Specification',
      generatedAt: new Date().toISOString(),
      summary: SOCIETY_WATER_SUMMARY,
      tanks: WATER_TANKS_DATA,
      ancillary: ANCILLARY_WATER_INFRASTRUCTURE,
      supplySchedules: WATER_SUPPLY_SCHEDULES,
      waterQuality: WATER_QUALITY_TEST_RESULTS,
      cleaningHistory: TANK_CLEANING_HISTORY,
      cleaningBillsAudit: WATER_TANK_CLEANING_BILLS
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'Majestique_Euriska_Water_Tank_Specification.json';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="water-tank-management-s1">
      
      {/* ── Top Liquid Glass Hero Banner ── */}
      <LiquidGlassCard
        variant="operations"
        className="water-tank-management-s2"
      >
        {/* Background ambient water glow */}
        <div className="water-tank-management-s3" />

        <div className="water-tank-management-s4">
          <div>
            <div className="water-tank-management-s5">
              <span className="water-tank-management-s6">
                Society Water Infrastructure
              </span>
              <span className="water-tank-management-s7">
                Official Layout & Invoices
              </span>
            </div>

            <h1 className="water-tank-management-s8">
              💧 Water Tank Management
            </h1>
            <p className="water-tank-management-s9">
              Central monitoring, 2D flow blueprint, 3D architectural spatial model, and automated supply scheduling across all 4 society water storage systems.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="water-tank-management-s10">
            <button
              onClick={handlePrintReport}
              className="water-tank-management-s11"
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Printer size={16} /> Print Technical Spec PDF
            </button>
            <button
              onClick={handleExportJSON}
              className="water-tank-management-s12"
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Download size={16} /> Export JSON Spec
            </button>
          </div>
        </div>

        {/* 4 Frosted Summary Stat Cards */}
        <div className="water-tank-management-s13">
          {/* Card 1: Total Storage */}
          <div className="water-tank-management-s14">
            <span className="water-tank-management-s15">
              Total Storage Capacity
            </span>
            <strong className="water-tank-management-s16">5,39,400 L</strong>
            <span className="water-tank-management-s17">
              From Invoices (All Tanks)
            </span>
          </div>

          {/* Card 2: Underground Common */}
          <div className="water-tank-management-s14">
            <span className="water-tank-management-s15">
              Underground Sump
            </span>
            <strong className="water-tank-management-s16">3,25,000 L</strong>
            <span className="water-tank-management-s17">
              4 Chambers • 100K L Fire Sump
            </span>
          </div>

          {/* Card 3: Overhead Storage Total */}
          <div className="water-tank-management-s14">
            <span className="water-tank-management-s15">
              Overhead Tanks (A, B, C)
            </span>
            <strong className="water-tank-management-s16">2,14,400 L</strong>
            <span className="water-tank-management-s17">
              A: 75.8K • B: 88.6K • C: 50K
            </span>
          </div>

          {/* Card 4: Daily Consumption */}
          <div className="water-tank-management-s14">
            <span className="water-tank-management-s15">
              Avg Daily Consumption
            </span>
            <strong className="water-tank-management-s16">~82,000 L / day</strong>
            <span className="water-tank-management-s18">
              ~5.2 Days Autonomy at 100%
            </span>
          </div>
        </div>
      </LiquidGlassCard>

      {/* ── Frosted Navigation Sub-Tabs ── */}
      <LiquidGlassCard
        variant="default"
        className="water-tank-management-s19"
      >
        <button
          onClick={() => setActiveTab('3d')}
          className={`water-tank-management-s20 ${(activeTab === '3d' ? 'water-tank-management-cond-1-true' : 'water-tank-management-cond-2-false')}`}
        >
          <Box size={16} /> 3D Diagram & Spatial Model
        </button>

        <button
          onClick={() => setActiveTab('2d')}
          className={`water-tank-management-s20 ${(activeTab === '2d' ? 'water-tank-management-cond-3-true' : 'water-tank-management-cond-4-false')}`}
        >
          <Layers size={16} /> 2D Blueprint & Pipeline Flow
        </button>

        <button
          onClick={() => setActiveTab('monitor')}
          className={`water-tank-management-s20 ${(activeTab === 'monitor' ? 'water-tank-management-cond-5-true' : 'water-tank-management-cond-6-false')}`}
        >
          <Activity size={16} /> Live Tank Gauges & Monitoring
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          className={`water-tank-management-s20 ${(activeTab === 'schedule' ? 'water-tank-management-cond-7-true' : 'water-tank-management-cond-8-false')}`}
        >
          <Clock size={16} /> Supply & Booster Pump Schedule
        </button>

        <button
          onClick={() => setActiveTab('hygiene')}
          className={`water-tank-management-s20 ${(activeTab === 'hygiene' ? 'water-tank-management-cond-9-true' : 'water-tank-management-cond-10-false')}`}
        >
          <ShieldCheck size={16} /> Hygiene, Cleaning & Water Quality
        </button>

        <button
          onClick={() => setActiveTab('cleaning_audit')}
          className={`water-tank-management-s20 ${(activeTab === 'cleaning_audit' ? 'water-tank-management-cond-11-true' : 'water-tank-management-cond-12-false')}`}
        >
          <DollarSign size={16} /> Cleaning Bills & Rate Analysis
        </button>
      </LiquidGlassCard>

      {/* Sub-Tab View Rendering */}
      {activeTab === '3d' && (
        <WaterTank3DDiagram onSelectTank={setSelectedTankId} />
      )}

      {activeTab === '2d' && (
        <WaterTank2DSchematic onSelectTank={setSelectedTankId} />
      )}

      {activeTab === 'monitor' && (
        <WaterTankLevelMonitor />
      )}

      {activeTab === 'schedule' && (
        <div className="water-tank-management-s21">
          {/* Supply Windows Card */}
          <LiquidGlassCard
            variant="default"
            className="water-tank-management-s22"
          >
            <h3 className="water-tank-management-s23">
              <Clock size={18} color="#0284c7" /> Building Water Supply Timings
            </h3>

            <div className="water-tank-management-s24">
              {WATER_SUPPLY_SCHEDULES.map((s, idx) => (
                <div key={idx} className="water-tank-management-s25">
                  <div className="water-tank-management-s26">
                    <strong className="water-tank-management-s27">{s.session}</strong>
                    <span className="water-tank-management-s28">
                      {s.time}
                    </span>
                  </div>
                  <div className="water-tank-management-s29">
                    <strong>Wings:</strong> {s.wing}<br />
                    <strong>Target Line:</strong> {s.target}<br />
                    <span className="water-tank-management-s30"><strong>Booster Trigger:</strong> {s.boosterPumpSchedule}</span>
                  </div>
                </div>
              ))}
            </div>
          </LiquidGlassCard>

          {/* Booster Pump Telemetry Card */}
          <LiquidGlassCard
            variant="default"
            className="water-tank-management-s22"
          >
            <h3 className="water-tank-management-s23">
              <Zap size={18} color="#d97706" /> Booster Transfer Pumps (Underground Sump)
            </h3>

            <div className="water-tank-management-s31">
              {WATER_TANKS_DATA.common_underground.pumps.map((p, idx) => (
                <div key={idx} className={`water-tank-management-s32 ${(p.status === 'Running' ? 'water-tank-management-cond-13-true' : 'water-tank-management-cond-14-false')}`}>
                  <div className="water-tank-management-s33">
                    <strong className="water-tank-management-s34">{p.name}</strong>
                    <span className={`water-tank-management-s35 ${(p.status === 'Running' ? 'water-tank-management-cond-15-true' : 'water-tank-management-cond-16-false')}`}>
                      ● {p.status}
                    </span>
                  </div>
                  <div className="water-tank-management-s29">
                    • Rated Flow: <strong>{p.flowRateM3Hr} m³/hr (~24,000 Litres/Hour)</strong><br />
                    • Current Draw: <strong>{p.currentAmps} Amps (3-Phase 415V)</strong><br />
                    • Last Preventative Service: <strong>{p.lastService}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Auto Float Logic Note */}
            <div className="water-tank-management-s36">
              <strong>Automation Logic:</strong> Pumps auto-start when any building overhead tank drops below 55% capacity and auto-cut-off at 95% full to prevent overflowing. Duty cycles alternate weekly between Pump 1 and Pump 2.
            </div>
          </LiquidGlassCard>
        </div>
      )}

      {activeTab === 'hygiene' && (
        <div className="water-tank-management-s21">
          {/* Water Quality Lab Test Results */}
          <LiquidGlassCard
            variant="default"
            className="water-tank-management-s22"
          >
            <div className="water-tank-management-s37">
              <h3 className="water-tank-management-s38">
                <ShieldCheck size={18} color="#16a34a" /> Potable Water Quality Lab Certification
              </h3>
              <span className="water-tank-management-s39">
                100% Certified Safe
              </span>
            </div>

            <div className="water-tank-management-s40">
              {WATER_QUALITY_TEST_RESULTS.map((r, idx) => (
                <div key={idx} className="water-tank-management-s41">
                  <div>
                    <strong className="water-tank-management-s42">{r.parameter}</strong>
                    <div className="water-tank-management-s43">Limit: {r.acceptableLimit}</div>
                  </div>
                  <div className="water-tank-management-s44">
                    <span className="water-tank-management-s45">{r.value}</span>
                    <div className="water-tank-management-s46">✓ {r.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </LiquidGlassCard>

          {/* Tank Cleaning History & Schedule */}
          <LiquidGlassCard
            variant="default"
            className="water-tank-management-s22"
          >
            <h3 className="water-tank-management-s23">
              <Calendar size={18} color="#2563eb" /> Tank Cleaning & Sanitization Log
            </h3>

            <div className="water-tank-management-s31">
              {TANK_CLEANING_HISTORY.map((c, idx) => (
                <div key={idx} className="water-tank-management-s47">
                  <div className="water-tank-management-s48">
                    <strong className="water-tank-management-s34">{c.tanks}</strong>
                    <span className="water-tank-management-s49">
                      Next: {c.nextDue}
                    </span>
                  </div>

                  <div className="water-tank-management-s29">
                    • Cleaned: <strong>{c.date}</strong><br />
                    • Agency: <strong>{c.vendor}</strong><br />
                    • Process: {c.method}<br />
                    • Certificate ID: <strong className="water-tank-management-s50">{c.certificateNo}</strong> • Invoice: ₹{c.invoiceAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              ))}
            </div>
          </LiquidGlassCard>
        </div>
      )}

      {activeTab === 'cleaning_audit' && (
        <WaterTankCleaningAnalysis />
      )}

    </div>
  );
}
