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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* ── Top Liquid Glass Hero Banner ── */}
      <LiquidGlassCard
        variant="operations"
        style={{
          background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.94) 0%, rgba(3, 105, 161, 0.90) 50%, rgba(15, 23, 42, 0.95) 100%)',
          borderRadius: 24,
          padding: '28px 32px',
          color: '#ffffff',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 16px 40px rgba(2, 132, 199, 0.28), 0 0 0 1px rgba(255, 255, 255, 0.15) inset'
        }}
      >
        {/* Background ambient water glow */}
        <div style={{
          position: 'absolute',
          top: '-50px',
          right: '-50px',
          width: '280px',
          height: '280px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(56, 189, 248, 0.25) 0%, rgba(2, 132, 199, 0.05) 70%, transparent 100%)',
          pointerEvents: 'none',
          filter: 'blur(20px)'
        }} />

        <div style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          position: 'relative',
          zIndex: 1
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
              <span style={{
                background: 'rgba(56, 189, 248, 0.25)',
                border: '1px solid rgba(56, 189, 248, 0.5)',
                color: '#e0f2fe',
                padding: '5px 12px',
                borderRadius: '20px',
                fontWeight: 800,
                fontSize: '0.72rem',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                backdropFilter: 'blur(8px)'
              }}>
                Society Water Infrastructure
              </span>
              <span style={{ color: '#bae6fd', fontSize: '0.82rem', fontWeight: 700 }}>
                Official Layout & Invoices
              </span>
            </div>

            <h1 style={{
              margin: '0 0 8px',
              fontSize: '2rem',
              fontWeight: 900,
              letterSpacing: '-0.5px',
              textShadow: '0 2px 10px rgba(0,0,0,0.3)'
            }}>
              💧 Water Tank Management
            </h1>
            <p style={{ margin: 0, color: '#e0f2fe', fontSize: '0.92rem', maxWidth: '660px', lineHeight: 1.55 }}>
              Central monitoring, 2D flow blueprint, 3D architectural spatial model, and automated supply scheduling across all 4 society water storage systems.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrintReport}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: '1.5px solid rgba(255,255,255,0.85)',
                background: 'rgba(255, 255, 255, 0.95)',
                color: '#0369a1',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.15)',
                backdropFilter: 'blur(8px)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Printer size={16} /> Print Technical Spec PDF
            </button>
            <button
              onClick={handleExportJSON}
              style={{
                padding: '10px 20px',
                borderRadius: '12px',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                background: 'rgba(255, 255, 255, 0.15)',
                color: '#ffffff',
                fontWeight: 800,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backdropFilter: 'blur(8px)',
                transition: 'transform 0.15s ease'
              }}
              onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
            >
              <Download size={16} /> Export JSON Spec
            </button>
          </div>
        </div>

        {/* 4 Frosted Summary Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '14px',
          marginTop: '26px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Card 1: Total Storage */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '16px 18px',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
          }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#bae6fd', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Total Storage Capacity
            </span>
            <strong style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: '#ffffff' }}>5,39,400 L</strong>
            <span style={{ fontSize: '0.72rem', color: '#e0f2fe', display: 'block', marginTop: '3px' }}>
              From Invoices (All Tanks)
            </span>
          </div>

          {/* Card 2: Underground Common */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '16px 18px',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
          }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#bae6fd', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Underground Sump
            </span>
            <strong style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: '#ffffff' }}>3,25,000 L</strong>
            <span style={{ fontSize: '0.72rem', color: '#e0f2fe', display: 'block', marginTop: '3px' }}>
              4 Chambers • 100K L Fire Sump
            </span>
          </div>

          {/* Card 3: Overhead Storage Total */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '16px 18px',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
          }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#bae6fd', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Overhead Tanks (A, B, C)
            </span>
            <strong style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: '#ffffff' }}>2,14,400 L</strong>
            <span style={{ fontSize: '0.72rem', color: '#e0f2fe', display: 'block', marginTop: '3px' }}>
              A: 75.8K • B: 88.6K • C: 50K
            </span>
          </div>

          {/* Card 4: Daily Consumption */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.12)',
            backdropFilter: 'blur(16px)',
            borderRadius: '16px',
            padding: '16px 18px',
            border: '1px solid rgba(255, 255, 255, 0.22)',
            boxShadow: '0 4px 16px rgba(0, 0, 0, 0.12)'
          }}>
            <span style={{ fontSize: '0.74rem', fontWeight: 700, color: '#bae6fd', display: 'block', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
              Avg Daily Consumption
            </span>
            <strong style={{ fontSize: '1.5rem', fontWeight: 900, fontFamily: 'monospace', color: '#ffffff' }}>~82,000 L / day</strong>
            <span style={{ fontSize: '0.72rem', color: '#a7f3d0', display: 'block', marginTop: '3px', fontWeight: 700 }}>
              ~5.2 Days Autonomy at 100%
            </span>
          </div>
        </div>
      </LiquidGlassCard>

      {/* ── Frosted Navigation Sub-Tabs ── */}
      <LiquidGlassCard
        variant="default"
        style={{
          display: 'flex',
          gap: '8px',
          overflowX: 'auto',
          background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.88) 0%, rgba(248, 250, 252, 0.78) 100%)',
          padding: '8px 12px',
          borderRadius: '18px',
          border: '1px solid rgba(226, 232, 240, 0.85)',
          backdropFilter: 'blur(18px) saturate(180%)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.03)'
        }}
      >
        <button
          onClick={() => setActiveTab('3d')}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === '3d' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
            color: activeTab === '3d' ? '#ffffff' : '#64748b',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === '3d' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Box size={16} /> 3D Diagram & Spatial Model
        </button>

        <button
          onClick={() => setActiveTab('2d')}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === '2d' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
            color: activeTab === '2d' ? '#ffffff' : '#64748b',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === '2d' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Layers size={16} /> 2D Blueprint & Pipeline Flow
        </button>

        <button
          onClick={() => setActiveTab('monitor')}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'monitor' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
            color: activeTab === 'monitor' ? '#ffffff' : '#64748b',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'monitor' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Activity size={16} /> Live Tank Gauges & Monitoring
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'schedule' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
            color: activeTab === 'schedule' ? '#ffffff' : '#64748b',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'schedule' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <Clock size={16} /> Supply & Booster Pump Schedule
        </button>

        <button
          onClick={() => setActiveTab('hygiene')}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'hygiene' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
            color: activeTab === 'hygiene' ? '#ffffff' : '#64748b',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'hygiene' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap'
          }}
        >
          <ShieldCheck size={16} /> Hygiene, Cleaning & Water Quality
        </button>

        <button
          onClick={() => setActiveTab('cleaning_audit')}
          style={{
            padding: '10px 18px',
            borderRadius: '12px',
            border: 'none',
            background: activeTab === 'cleaning_audit' ? 'linear-gradient(135deg, #0284c7 0%, #0369a1 100%)' : 'transparent',
            color: activeTab === 'cleaning_audit' ? '#ffffff' : '#64748b',
            fontWeight: 800,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            boxShadow: activeTab === 'cleaning_audit' ? '0 4px 14px rgba(2, 132, 199, 0.35)' : 'none',
            transition: 'all 0.18s ease',
            whiteSpace: 'nowrap'
          }}
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
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {/* Supply Windows Card */}
          <LiquidGlassCard
            variant="default"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(248, 250, 252, 0.82) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: '20px',
              padding: '26px',
              border: '1px solid rgba(226, 232, 240, 0.85)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 900, color: '#0f2952', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#0284c7" /> Building Water Supply Timings
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {WATER_SUPPLY_SCHEDULES.map((s, idx) => (
                <div key={idx} style={{
                  padding: '14px 16px',
                  borderRadius: '14px',
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  backdropFilter: 'blur(8px)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: '#0f2952', fontSize: '0.92rem' }}>{s.session}</strong>
                    <span style={{
                      background: 'rgba(2, 132, 199, 0.12)',
                      color: '#0284c7',
                      border: '1px solid rgba(2, 132, 199, 0.25)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.78rem',
                      fontWeight: 800
                    }}>
                      {s.time}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                    <strong>Wings:</strong> {s.wing}<br />
                    <strong>Target Line:</strong> {s.target}<br />
                    <span style={{ color: '#0369a1' }}><strong>Booster Trigger:</strong> {s.boosterPumpSchedule}</span>
                  </div>
                </div>
              ))}
            </div>
          </LiquidGlassCard>

          {/* Booster Pump Telemetry Card */}
          <LiquidGlassCard
            variant="default"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(248, 250, 252, 0.82) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: '20px',
              padding: '26px',
              border: '1px solid rgba(226, 232, 240, 0.85)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 900, color: '#0f2952', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#d97706" /> Booster Transfer Pumps (Underground Sump)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {WATER_TANKS_DATA.common_underground.pumps.map((p, idx) => (
                <div key={idx} style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: p.status === 'Running' ? 'rgba(240, 253, 244, 0.8)' : 'rgba(248, 250, 252, 0.8)',
                  border: p.status === 'Running' ? '1px solid #86efac' : '1px solid rgba(226, 232, 240, 0.8)',
                  backdropFilter: 'blur(8px)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: '#0f2952', fontSize: '0.94rem' }}>{p.name}</strong>
                    <span style={{
                      background: p.status === 'Running' ? '#16a34a' : '#64748b',
                      color: '#ffffff',
                      padding: '3px 9px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800,
                      boxShadow: p.status === 'Running' ? '0 2px 6px rgba(22, 163, 74, 0.3)' : 'none'
                    }}>
                      ● {p.status}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                    • Rated Flow: <strong>{p.flowRateM3Hr} m³/hr (~24,000 Litres/Hour)</strong><br />
                    • Current Draw: <strong>{p.currentAmps} Amps (3-Phase 415V)</strong><br />
                    • Last Preventative Service: <strong>{p.lastService}</strong>
                  </div>
                </div>
              ))}
            </div>

            {/* Auto Float Logic Note */}
            <div style={{
              marginTop: '16px',
              padding: '14px',
              borderRadius: '12px',
              background: 'rgba(239, 246, 255, 0.8)',
              border: '1px solid rgba(191, 219, 254, 0.8)',
              fontSize: '0.78rem',
              color: '#1e40af',
              lineHeight: 1.5,
              backdropFilter: 'blur(8px)'
            }}>
              <strong>Automation Logic:</strong> Pumps auto-start when any building overhead tank drops below 55% capacity and auto-cut-off at 95% full to prevent overflowing. Duty cycles alternate weekly between Pump 1 and Pump 2.
            </div>
          </LiquidGlassCard>
        </div>
      )}

      {activeTab === 'hygiene' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {/* Water Quality Lab Test Results */}
          <LiquidGlassCard
            variant="default"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(248, 250, 252, 0.82) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: '20px',
              padding: '26px',
              border: '1px solid rgba(226, 232, 240, 0.85)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 900, color: '#0f2952', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#16a34a" /> Potable Water Quality Lab Certification
              </h3>
              <span style={{
                background: 'rgba(220, 252, 231, 0.8)',
                color: '#15803d',
                border: '1px solid rgba(134, 239, 172, 0.8)',
                padding: '4px 10px',
                borderRadius: '8px',
                fontSize: '0.75rem',
                fontWeight: 800
              }}>
                100% Certified Safe
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {WATER_QUALITY_TEST_RESULTS.map((r, idx) => (
                <div key={idx} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 14px',
                  borderRadius: '12px',
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  fontSize: '0.8rem',
                  backdropFilter: 'blur(8px)'
                }}>
                  <div>
                    <strong style={{ color: '#0f2952' }}>{r.parameter}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Limit: {r.acceptableLimit}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.92rem', fontFamily: 'monospace' }}>{r.value}</span>
                    <div style={{ color: '#16a34a', fontSize: '0.72rem', fontWeight: 800 }}>✓ {r.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </LiquidGlassCard>

          {/* Tank Cleaning History & Schedule */}
          <LiquidGlassCard
            variant="default"
            style={{
              background: 'linear-gradient(135deg, rgba(255, 255, 255, 0.90) 0%, rgba(248, 250, 252, 0.82) 100%)',
              backdropFilter: 'blur(20px) saturate(180%)',
              borderRadius: '20px',
              padding: '26px',
              border: '1px solid rgba(226, 232, 240, 0.85)',
              boxShadow: '0 10px 30px rgba(0,0,0,0.04)'
            }}
          >
            <h3 style={{ margin: '0 0 16px', fontSize: '1.15rem', fontWeight: 900, color: '#0f2952', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#2563eb" /> Tank Cleaning & Sanitization Log
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {TANK_CLEANING_HISTORY.map((c, idx) => (
                <div key={idx} style={{
                  padding: '16px',
                  borderRadius: '14px',
                  background: 'rgba(248, 250, 252, 0.8)',
                  border: '1px solid rgba(226, 232, 240, 0.8)',
                  backdropFilter: 'blur(8px)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <strong style={{ color: '#0f2952', fontSize: '0.94rem' }}>{c.tanks}</strong>
                    <span style={{
                      background: 'rgba(254, 243, 199, 0.9)',
                      color: '#b45309',
                      border: '1px solid rgba(252, 211, 77, 0.8)',
                      padding: '4px 10px',
                      borderRadius: '8px',
                      fontSize: '0.72rem',
                      fontWeight: 800
                    }}>
                      Next: {c.nextDue}
                    </span>
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#475569', lineHeight: 1.5 }}>
                    • Cleaned: <strong>{c.date}</strong><br />
                    • Agency: <strong>{c.vendor}</strong><br />
                    • Process: {c.method}<br />
                    • Certificate ID: <strong style={{ color: '#2563eb' }}>{c.certificateNo}</strong> • Invoice: ₹{c.invoiceAmount.toLocaleString('en-IN')}
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
