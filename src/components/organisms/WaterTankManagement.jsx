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
            <h1 class="title">MAJESTIQUE EURISKA CO-OP HOUSING SOCIETY</h1>
            <div class="subtitle">Official Water Tank Capacity, Pipeline Architecture & Compliance Log</div>
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
          <div>Society Office: Majestique Euriska CHS, Pune</div>
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
      
      {/* Top Hero Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0284c7 0%, #0369a1 50%, #0f172a 100%)',
        borderRadius: '24px',
        padding: '28px',
        color: '#ffffff',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 12px 36px rgba(2, 132, 199, 0.2)'
      }}>
        {/* Background decorative water drop curves */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          background: 'rgba(255, 255, 255, 0.05)',
          pointerEvents: 'none'
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <span style={{
                background: '#38bdf8',
                color: '#0f172a',
                padding: '4px 10px',
                borderRadius: '20px',
                fontWeight: 800,
                fontSize: '0.72rem',
                letterSpacing: '0.5px',
                textTransform: 'uppercase'
              }}>
                Society Water Infrastructure
              </span>
              <span style={{ color: '#bae6fd', fontSize: '0.8rem', fontWeight: 600 }}>
                Official Layout & Invoices
              </span>
            </div>

            <h1 style={{ margin: '0 0 6px', fontSize: '1.9rem', fontWeight: 900, letterSpacing: '-0.5px' }}>
              💧 Water Tank Management
            </h1>
            <p style={{ margin: 0, color: '#e0f2fe', fontSize: '0.92rem', maxWidth: '640px', lineHeight: 1.5 }}>
              Central monitoring, 2D flow blueprint, 3D architectural spatial model, and automated supply scheduling across all 4 society water storage systems.
            </p>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <button
              onClick={handlePrintReport}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: 'none',
                background: '#ffffff',
                color: '#0369a1',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                transition: 'transform 0.15s'
              }}
            >
              <Printer size={16} /> Print Technical Spec PDF
            </button>
            <button
              onClick={handleExportJSON}
              style={{
                padding: '10px 18px',
                borderRadius: '10px',
                border: '1px solid rgba(255,255,255,0.3)',
                background: 'rgba(255,255,255,0.12)',
                color: '#ffffff',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Download size={16} /> Export JSON Spec
            </button>
          </div>
        </div>

        {/* 4 Summary Stat Cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '14px',
          marginTop: '24px',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Card 1: Total Storage */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            padding: '14px 16px',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#bae6fd', display: 'block', marginBottom: '2px' }}>
              Total Storage Capacity
            </span>
            <strong style={{ fontSize: '1.4rem', fontWeight: 900 }}>5,39,400 L</strong>
            <span style={{ fontSize: '0.7rem', color: '#e0f2fe', display: 'block', marginTop: '2px' }}>
              From Invoices (All Tanks)
            </span>
          </div>

          {/* Card 2: Underground Common */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            padding: '14px 16px',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#bae6fd', display: 'block', marginBottom: '2px' }}>
              Underground Sump
            </span>
            <strong style={{ fontSize: '1.4rem', fontWeight: 900 }}>3,25,000 L</strong>
            <span style={{ fontSize: '0.7rem', color: '#e0f2fe', display: 'block', marginTop: '2px' }}>
              4 Chambers • 100K L Fire Sump
            </span>
          </div>

          {/* Card 3: Overhead Storage Total */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            padding: '14px 16px',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#bae6fd', display: 'block', marginBottom: '2px' }}>
              Overhead Tanks (A, B, C)
            </span>
            <strong style={{ fontSize: '1.4rem', fontWeight: 900 }}>2,14,400 L</strong>
            <span style={{ fontSize: '0.7rem', color: '#e0f2fe', display: 'block', marginTop: '2px' }}>
              A: 75.8K • B: 88.6K • C: 50K
            </span>
          </div>

          {/* Card 4: Daily Consumption */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.1)',
            backdropFilter: 'blur(10px)',
            borderRadius: '14px',
            padding: '14px 16px',
            border: '1px solid rgba(255, 255, 255, 0.15)'
          }}>
            <span style={{ fontSize: '0.75rem', color: '#bae6fd', display: 'block', marginBottom: '2px' }}>
              Avg Daily Consumption
            </span>
            <strong style={{ fontSize: '1.4rem', fontWeight: 900 }}>~82,000 L / day</strong>
            <span style={{ fontSize: '0.7rem', color: '#a7f3d0', display: 'block', marginTop: '2px' }}>
              ~5.2 Days Autonomy at 100%
            </span>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{
        display: 'flex',
        gap: '8px',
        overflowX: 'auto',
        background: '#ffffff',
        padding: '8px',
        borderRadius: '16px',
        border: '1px solid #e2e8f0',
        boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
      }}>
        <button
          onClick={() => setActiveTab('3d')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === '3d' ? '#0284c7' : 'transparent',
            color: activeTab === '3d' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Box size={16} /> 3D Diagram & Spatial Model
        </button>

        <button
          onClick={() => setActiveTab('2d')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === '2d' ? '#0284c7' : 'transparent',
            color: activeTab === '2d' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Layers size={16} /> 2D Blueprint & Pipeline Flow
        </button>

        <button
          onClick={() => setActiveTab('monitor')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'monitor' ? '#0284c7' : 'transparent',
            color: activeTab === 'monitor' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Activity size={16} /> Live Tank Gauges & Monitoring
        </button>

        <button
          onClick={() => setActiveTab('schedule')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'schedule' ? '#0284c7' : 'transparent',
            color: activeTab === 'schedule' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <Clock size={16} /> Supply & Booster Pump Schedule
        </button>

        <button
          onClick={() => setActiveTab('hygiene')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'hygiene' ? '#0284c7' : 'transparent',
            color: activeTab === 'hygiene' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <ShieldCheck size={16} /> Hygiene, Cleaning & Water Quality
        </button>

        <button
          onClick={() => setActiveTab('cleaning_audit')}
          style={{
            padding: '10px 18px',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'cleaning_audit' ? '#0284c7' : 'transparent',
            color: activeTab === 'cleaning_audit' ? '#ffffff' : '#64748b',
            fontWeight: 700,
            fontSize: '0.88rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            transition: 'all 0.2s',
            whiteSpace: 'nowrap'
          }}
        >
          <DollarSign size={16} /> Cleaning Bills & Rate Analysis
        </button>
      </div>

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
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Clock size={18} color="#0284c7" /> Building Water Supply Timings
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {WATER_SUPPLY_SCHEDULES.map((s, idx) => (
                <div key={idx} style={{
                  padding: '14px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.9rem' }}>{s.session}</strong>
                    <span style={{
                      background: '#e0f2fe',
                      color: '#0284c7',
                      padding: '4px 10px',
                      borderRadius: '6px',
                      fontSize: '0.78rem',
                      fontWeight: 700
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
          </div>

          {/* Booster Pump Telemetry Card */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={18} color="#d97706" /> Booster Transfer Pumps (Underground Sump)
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {WATER_TANKS_DATA.common_underground.pumps.map((p, idx) => (
                <div key={idx} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: p.status === 'Running' ? '#f0fdf4' : '#f8fafc',
                  border: p.status === 'Running' ? '1px solid #86efac' : '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{p.name}</strong>
                    <span style={{
                      background: p.status === 'Running' ? '#16a34a' : '#64748b',
                      color: '#ffffff',
                      padding: '3px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700
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
              padding: '12px',
              borderRadius: '10px',
              background: '#eff6ff',
              border: '1px solid #bfdbfe',
              fontSize: '0.78rem',
              color: '#1e40af',
              lineHeight: 1.5
            }}>
              <strong>Automation Logic:</strong> Pumps auto-start when any building overhead tank drops below 55% capacity and auto-cut-off at 95% full to prevent overflowing. Duty cycles alternate weekly between Pump 1 and Pump 2.
            </div>
          </div>
        </div>
      )}

      {activeTab === 'hygiene' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
          gap: '20px'
        }}>
          {/* Water Quality Lab Test Results */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={18} color="#16a34a" /> Potable Water Quality Lab Certification
              </h3>
              <span style={{
                background: '#dcfce7',
                color: '#15803d',
                padding: '4px 10px',
                borderRadius: '6px',
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
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: '#f8fafc',
                  border: '1px solid #f1f5f9',
                  fontSize: '0.8rem'
                }}>
                  <div>
                    <strong style={{ color: '#0f172a' }}>{r.parameter}</strong>
                    <div style={{ color: '#64748b', fontSize: '0.72rem' }}>Limit: {r.acceptableLimit}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontWeight: 800, color: '#0284c7', fontSize: '0.9rem' }}>{r.value}</span>
                    <div style={{ color: '#16a34a', fontSize: '0.72rem', fontWeight: 700 }}>✓ {r.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Tank Cleaning History & Schedule */}
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '24px',
            border: '1px solid #e2e8f0',
            boxShadow: '0 2px 12px rgba(0,0,0,0.03)'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Calendar size={18} color="#2563eb" /> Tank Cleaning & Sanitization Log
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {TANK_CLEANING_HISTORY.map((c, idx) => (
                <div key={idx} style={{
                  padding: '16px',
                  borderRadius: '12px',
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '6px' }}>
                    <strong style={{ color: '#0f172a', fontSize: '0.92rem' }}>{c.tanks}</strong>
                    <span style={{
                      background: '#fef3c7',
                      color: '#b45309',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      fontSize: '0.72rem',
                      fontWeight: 700
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
          </div>
        </div>
      )}

      {activeTab === 'cleaning_audit' && (
        <WaterTankCleaningAnalysis />
      )}

    </div>
  );
}
