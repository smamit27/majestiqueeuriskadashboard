import React, { useState, useMemo } from 'react';
import { initialTenantData } from '../../data/tenantSeedData.js';
import { initialParkingData } from '../../data/parkingAllotmentData.js';
import { emergencyServices } from '../../data/emergencyData.js';

const DEFAULT_ANNOUNCEMENTS = [
  { title: 'Biannual Lift Servicing Schedule - Wing A & B', date: '04 Oct 2026' },
  { title: 'Water Tank Deep Cleaning Drive & Domestic Supply Notice', date: '02 Oct 2026' }
];

export default function ResidentPortal({ onNavigate, announcements = DEFAULT_ANNOUNCEMENTS }) {
  // Demo active flat for resident simulation
  const [activeFlat, setActiveFlat] = useState('A-302');
  const [activeSection, setActiveSection] = useState('overview');
  const [complaintText, setComplaintText] = useState('');
  const [complaintCategory, setComplaintCategory] = useState('Plumbing / Water');
  const [complaintsList, setComplaintsList] = useState([
    { id: 'c-101', title: 'Low water pressure in master bath', category: 'Plumbing', status: 'In Progress', date: '2026-10-02' },
    { id: 'c-102', title: 'Visitor parking verification query', category: 'Security', status: 'Resolved', date: '2026-09-24' }
  ]);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  // Find tenant record for active flat
  const flatRecord = useMemo(() => {
    return initialTenantData.find(t => t.flat === activeFlat) || {
      flat: activeFlat,
      tenantName: 'Resident Member',
      occupantType: 'Owner',
      activeUsers: 3,
      primaryIntercom: true,
      status: 'Active'
    };
  }, [activeFlat]);

  // Find parking slot
  const parkingRecord = useMemo(() => {
    const found = initialParkingData.find(p => p.flat === activeFlat);
    if (found) {
      return {
        slot: `${found.parkingNo || 'Open/Covered'} (${found.parkingType || 'Allotted'})`,
        vehicleType: found.vehicleType || '4 Wheeler + 2 Wheeler',
        rfidTag: found.tagId || 'FASTAG-ME-8841'
      };
    }
    return {
      slot: 'P-34 (Basement 1)',
      vehicleType: '4 Wheeler (Car) + 2 Wheeler',
      rfidTag: 'FASTAG-ME-8841'
    };
  }, [activeFlat]);

  const handleLodgeComplaint = (e) => {
    e.preventDefault();
    if (!complaintText.trim()) return;

    const newC = {
      id: `c-${Date.now()}`,
      title: complaintText.trim(),
      category: complaintCategory,
      status: 'Open / Pending Review',
      date: new Date().toISOString().split('T')[0]
    };
    setComplaintsList([newC, ...complaintsList]);
    setComplaintText('');
    setFeedbackMsg('Your service request has been registered and assigned to the Estate Manager.');
    setTimeout(() => setFeedbackMsg(''), 4000);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Resident Welcome Header */}
      <div className="section-card" style={{ padding: '24px', background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)', color: 'white', borderRadius: '16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <div style={{ display: 'inline-block', background: 'rgba(196,155,79,0.25)', border: '1px solid #C49B4F', color: '#fde047', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700, marginBottom: '8px' }}>
              RESIDENT SELF-SERVICE PORTAL
            </div>
            <h2 style={{ margin: 0, fontSize: '1.6rem', fontWeight: 800 }}>Welcome, Flat {flatRecord.flat}</h2>
            <p style={{ margin: '4px 0 0', opacity: 0.85, fontSize: '0.9rem' }}>
              Occupant: <b>{flatRecord.tenantName || 'Owner Resident'}</b> ({flatRecord.occupantType}) • Wing A
            </p>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', opacity: 0.8 }}>Switch Demo Unit:</span>
            <select
              value={activeFlat}
              onChange={(e) => setActiveFlat(e.target.value)}
              className="attendance-register-input"
              style={{ background: 'white', color: '#0b2b26', fontWeight: 700, padding: '6px 12px' }}
            >
              <option value="A-302">Flat A-302</option>
              <option value="A-904">Flat A-904</option>
              <option value="A-1002">Flat A-1002</option>
              <option value="A-101">Flat A-101</option>
            </select>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '4px' }}>
        {[
          { id: 'overview', label: '🏠 My Flat & Overview' },
          { id: 'maintenance', label: '💰 My Maintenance & Dues' },
          { id: 'parking', label: '🚗 My Parking & RFID' },
          { id: 'complaints', label: '🛠️ Service Requests' },
          { id: 'rules', label: '📜 Society Rules' },
          { id: 'emergency', label: '🚨 Emergency Contacts' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveSection(tab.id)}
            style={{
              padding: '10px 18px',
              borderRadius: '10px',
              border: 'none',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '0.85rem',
              background: activeSection === tab.id ? '#0b2b26' : '#e2e8f0',
              color: activeSection === tab.id ? '#C49B4F' : '#334155',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s'
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeSection === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
          {/* Flat Status Card */}
          <div className="section-card" style={{ padding: '20px', background: 'white', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 14px', color: '#0b2b26' }}>Unit Profile: {flatRecord.flat}</h4>
            <div style={{ display: 'grid', gap: '10px', fontSize: '0.88rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Occupancy Status:</span>
                <span style={{ fontWeight: 700, color: '#16a34a' }}>✓ {flatRecord.status || 'Active'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Occupant Category:</span>
                <span style={{ fontWeight: 700 }}>{flatRecord.occupantType}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Intercom Link:</span>
                <span style={{ fontWeight: 700 }}>{flatRecord.primaryIntercom ? 'Active' : 'Unconfigured'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748b' }}>Registered Family/Users:</span>
                <span style={{ fontWeight: 700 }}>{flatRecord.activeUsers || 2} persons</span>
              </div>
            </div>
          </div>

          {/* Maintenance Snapshot */}
          <div className="section-card" style={{ padding: '20px', background: 'white', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 14px', color: '#0b2b26' }}>Maintenance Status</h4>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '14px', marginBottom: '12px' }}>
              <div style={{ fontSize: '0.75rem', color: '#166534', fontWeight: 700 }}>CURRENT BILL (JULY – SEPT 2026)</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d', marginTop: '4px' }}>₹9,000 / Quarter</div>
              <div style={{ fontSize: '0.78rem', color: '#166534', marginTop: '4px' }}>Status: Paid in full (UTR: HDFCN520251121)</div>
            </div>
            <button
              onClick={() => setActiveSection('maintenance')}
              className="button-secondary"
              style={{ width: '100%', padding: '8px' }}
            >
              View Payment Receipts
            </button>
          </div>

          {/* Recent Society Notice */}
          <div className="section-card" style={{ padding: '20px', background: 'white', borderRadius: '12px' }}>
            <h4 style={{ margin: '0 0 14px', color: '#0b2b26' }}>Latest Society Announcements</h4>
            <div style={{ display: 'grid', gap: '8px', fontSize: '0.85rem' }}>
              {announcements.slice(0, 2).map((a, i) => (
                <div key={i} style={{ borderLeft: '3px solid #C49B4F', paddingLeft: '8px' }}>
                  <div style={{ fontWeight: 700, color: '#0f172a' }}>{a.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{a.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Maintenance */}
      {activeSection === 'maintenance' && (
        <div className="section-card" style={{ padding: '24px', background: 'white', borderRadius: '14px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#0b2b26' }}>Maintenance & Payment Ledger ({activeFlat})</h3>
          <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '16px' }}>
            Official ledger records for Wing A. Approved rate: ₹3,000 / month (₹9,000 / quarter).
          </p>

          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                <th style={{ padding: '10px 12px' }}>Period</th>
                <th style={{ padding: '10px 12px' }}>Invoice No</th>
                <th style={{ padding: '10px 12px' }}>Amount</th>
                <th style={{ padding: '10px 12px' }}>Payment Date</th>
                <th style={{ padding: '10px 12px' }}>UTR / Cheque Ref</th>
                <th style={{ padding: '10px 12px' }}>Status</th>
              </tr>
            </thead>
            <tbody>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px' }}>April to June 2026</td>
                <td style={{ padding: '12px' }}>ME/A/18/APR-26</td>
                <td style={{ padding: '12px', fontWeight: 700 }}>₹9,000</td>
                <td style={{ padding: '12px' }}>15-05-2026</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>HDFCN261358921</td>
                <td style={{ padding: '12px' }}><span style={{ color: '#15803d', fontWeight: 700 }}>✓ Paid</span></td>
              </tr>
              <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '12px' }}>Oct 25 to Mar 26</td>
                <td style={{ padding: '12px' }}>ME/A/15/OCT-25</td>
                <td style={{ padding: '12px', fontWeight: 700 }}>₹18,000</td>
                <td style={{ padding: '12px' }}>21-11-2025</td>
                <td style={{ padding: '12px', fontFamily: 'monospace' }}>HDFCN52025112110</td>
                <td style={{ padding: '12px' }}><span style={{ color: '#15803d', fontWeight: 700 }}>✓ Paid</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: Parking */}
      {activeSection === 'parking' && (
        <div className="section-card" style={{ padding: '24px', background: 'white', borderRadius: '14px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#0b2b26' }}>Allotted Parking Space</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
            <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Assigned Slot</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#0b2b26', marginTop: '4px' }}>{parkingRecord.slot}</div>
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '4px' }}>✓ Covered Stilt / Basement</div>
            </div>
            <div style={{ padding: '16px', border: '1px solid #e2e8f0', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Park+ Boom Barrier RFID Tag</div>
              <div style={{ fontSize: '1.2rem', fontWeight: 700, fontFamily: 'monospace', color: '#334155', marginTop: '4px' }}>{parkingRecord.rfidTag}</div>
              <div style={{ fontSize: '0.8rem', color: '#64748b', marginTop: '4px' }}>Automated Fastag Society Access</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Complaints */}
      {activeSection === 'complaints' && (
        <div className="section-card" style={{ padding: '24px', background: 'white', borderRadius: '14px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#0b2b26' }}>Raise a Complaint / Service Request</h3>

          {feedbackMsg && (
            <div style={{ background: '#dcfce7', color: '#15803d', padding: '12px', borderRadius: '8px', marginBottom: '16px', fontWeight: 600 }}>
              {feedbackMsg}
            </div>
          )}

          <form onSubmit={handleLodgeComplaint} style={{ display: 'grid', gap: '12px', marginBottom: '24px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '12px' }}>
              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Category</label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="attendance-register-input"
                  style={{ width: '100%' }}
                >
                  <option value="Plumbing / Water">Plumbing / Water</option>
                  <option value="Electrical / Power">Electrical / Power</option>
                  <option value="Elevator / Lift">Elevator / Lift</option>
                  <option value="Security / Visitor">Security / Visitor</option>
                  <option value="Housekeeping">Housekeeping</option>
                  <option value="Noise / Disturbance">Noise / Disturbance</option>
                </select>
              </div>

              <div>
                <label className="eyebrow" style={{ display: 'block', marginBottom: '6px' }}>Issue Description *</label>
                <input
                  type="text"
                  required
                  placeholder="Describe the maintenance issue or request..."
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  className="attendance-register-input"
                  style={{ width: '100%', textAlign: 'left' }}
                />
              </div>
            </div>

            <button type="submit" className="button-primary" style={{ justifySelf: 'start', padding: '10px 20px' }}>
              Submit Request
            </button>
          </form>

          <h4 style={{ margin: '0 0 12px' }}>Your Past Requests ({complaintsList.length})</h4>
          <div style={{ display: 'grid', gap: '8px' }}>
            {complaintsList.map(c => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: '#f8fafc', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                <div>
                  <div style={{ fontWeight: 600, color: '#0f172a' }}>{c.title}</div>
                  <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{c.category} • Logged on {c.date}</div>
                </div>
                <span style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                  background: c.status === 'Resolved' ? '#dcfce7' : '#fef3c7',
                  color: c.status === 'Resolved' ? '#15803d' : '#b45309'
                }}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Society Rules */}
      {activeSection === 'rules' && (
        <div className="section-card" style={{ padding: '24px', background: 'white', borderRadius: '14px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#0b2b26' }}>Society Rules & Guidelines</h3>
          <div style={{ display: 'grid', gap: '14px', fontSize: '0.88rem' }}>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
              <strong style={{ color: '#0b2b26' }}>🔨 Drilling & Renovation Hours:</strong>
              <p style={{ margin: '4px 0 0', color: '#475569' }}>
                Strictly permitted between <b>10:00 AM – 1:00 PM</b> and <b>3:00 PM – 6:00 PM</b>, Monday to Saturday only. No drilling or heavy construction work is allowed on Sundays or public holidays.
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
              <strong style={{ color: '#0b2b26' }}>🚗 Parking Protocols:</strong>
              <p style={{ margin: '4px 0 0', color: '#475569' }}>
                Park only within designated white lines in your allotted slot. Visitor vehicles must register at the main gate and are restricted to visitor bays for maximum 12 hours.
              </p>
            </div>
            <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px' }}>
              <strong style={{ color: '#0b2b26' }}>🗑️ Waste Segregation:</strong>
              <p style={{ margin: '4px 0 0', color: '#475569' }}>
                Dry and wet waste segregation is mandatory. Collection occurs daily at 9:30 AM outside apartment doors.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Emergency Contacts */}
      {activeSection === 'emergency' && (
        <div className="section-card" style={{ padding: '24px', background: 'white', borderRadius: '14px' }}>
          <h3 style={{ margin: '0 0 16px', color: '#0b2b26' }}>Society Emergency Contacts</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            {emergencyServices.slice(0, 6).map((item, idx) => (
              <div key={idx} style={{ background: '#fef2f2', border: '1px solid #fecaca', padding: '14px', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.8rem', color: '#991b1b', fontWeight: 700 }}>{item.badge || 'Emergency'}</div>
                <div style={{ fontWeight: 800, fontSize: '1rem', color: '#1e293b', marginTop: '2px' }}>{item.icon} {item.name}</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626', marginTop: '4px' }}>
                  <a href={`tel:${item.primaryNumber}`} style={{ textDecoration: 'none', color: '#dc2626' }}>📞 {item.primaryNumber}</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
