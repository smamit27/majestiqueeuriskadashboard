import React, { useState, useMemo } from 'react';
import { initialTenantData } from '../../data/tenantSeedData.js';
import { initialParkingData } from '../../data/parkingAllotmentData.js';
import { emergencyServices } from '../../data/emergencyData.js';
import './ResidentPortal.css';


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
    <div className="resident-portal-s1">
      {/* Resident Welcome Header */}
      <div className="section-card resident-portal-s2">
        <div className="resident-portal-s3">
          <div>
            <div className="resident-portal-s4">
              RESIDENT SELF-SERVICE PORTAL
            </div>
            <h2 className="resident-portal-s5">Welcome, Flat {flatRecord.flat}</h2>
            <p className="resident-portal-s6">
              Occupant: <b>{flatRecord.tenantName || 'Owner Resident'}</b> ({flatRecord.occupantType}) • Wing A
            </p>
          </div>

          <div className="resident-portal-s7">
            <span className="resident-portal-s8">Switch Demo Unit:</span>
            <select
              value={activeFlat}
              onChange={(e) => setActiveFlat(e.target.value)}
              className="attendance-register-input resident-portal-s9"
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
      <div className="resident-portal-s10">
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
            className={`resident-portal-s11 ${(activeSection === tab.id ? 'resident-portal-cond-1-true' : 'resident-portal-cond-2-false')}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT: Overview */}
      {activeSection === 'overview' && (
        <div className="resident-portal-s12">
          {/* Flat Status Card */}
          <div className="section-card resident-portal-s13">
            <h4 className="resident-portal-s14">Unit Profile: {flatRecord.flat}</h4>
            <div className="resident-portal-s15">
              <div className="resident-portal-s16">
                <span className="resident-portal-s17">Occupancy Status:</span>
                <span className="resident-portal-s18">✓ {flatRecord.status || 'Active'}</span>
              </div>
              <div className="resident-portal-s16">
                <span className="resident-portal-s17">Occupant Category:</span>
                <span className="resident-portal-s19">{flatRecord.occupantType}</span>
              </div>
              <div className="resident-portal-s16">
                <span className="resident-portal-s17">Intercom Link:</span>
                <span className="resident-portal-s19">{flatRecord.primaryIntercom ? 'Active' : 'Unconfigured'}</span>
              </div>
              <div className="resident-portal-s16">
                <span className="resident-portal-s17">Registered Family/Users:</span>
                <span className="resident-portal-s19">{flatRecord.activeUsers || 2} persons</span>
              </div>
            </div>
          </div>

          {/* Maintenance Snapshot */}
          <div className="section-card resident-portal-s13">
            <h4 className="resident-portal-s14">Maintenance Status</h4>
            <div className="resident-portal-s20">
              <div className="resident-portal-s21">CURRENT BILL (OCT 2026 – MAR 2027)</div>
              <div className="resident-portal-s22">₹18,000 / 6 Months</div>
              <div className="resident-portal-s23">Status: Paid in full today (23-Oct-2026) • Inv: ME/A/18/Oct26</div>
            </div>
            <button
              onClick={() => setActiveSection('maintenance')}
              className="button-secondary resident-portal-s24"
            >
              View Payment Receipts
            </button>
          </div>

          {/* Recent Society Notice */}
          <div className="section-card resident-portal-s13">
            <h4 className="resident-portal-s14">Latest Society Announcements</h4>
            <div className="resident-portal-s25">
              {announcements.slice(0, 2).map((a, i) => (
                <div key={i} className="resident-portal-s26">
                  <div className="resident-portal-s27">{a.title}</div>
                  <div className="resident-portal-s28">{a.date}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Maintenance */}
      {activeSection === 'maintenance' && (
        <div className="section-card resident-portal-s29">
          <h3 className="resident-portal-s30">Maintenance & Payment Ledger ({activeFlat})</h3>
          <p className="resident-portal-s31">
            Official ledger records for Wing A. Approved rate: ₹3,000 / month (₹9,000 / quarter).
          </p>

          <table className="resident-portal-s32">
            <thead>
              <tr className="resident-portal-s33">
                <th className="resident-portal-s34">Period</th>
                <th className="resident-portal-s34">Invoice No</th>
                <th className="resident-portal-s34">Amount</th>
                <th className="resident-portal-s34">Payment Date</th>
                <th className="resident-portal-s34">UTR / Cheque Ref</th>
                <th className="resident-portal-s34">Status</th>
              </tr>
            </thead>
            <tbody>
              <tr className="resident-portal-s35">
                <td className="resident-portal-s36">Oct 2026 to Mar 2027</td>
                <td className="resident-portal-s37">ME/A/18/Oct26</td>
                <td className="resident-portal-s38">₹18,000</td>
                <td className="resident-portal-s39">23-10-2026</td>
                <td className="resident-portal-s40">HDFCN261023904</td>
                <td className="resident-portal-s39"><span className="resident-portal-s41">✓ Paid Today</span></td>
              </tr>
              <tr className="resident-portal-s42">
                <td className="resident-portal-s39">April to June 2026</td>
                <td className="resident-portal-s39">ME/A/18/APR-26</td>
                <td className="resident-portal-s36">₹9,000</td>
                <td className="resident-portal-s39">15-05-2026</td>
                <td className="resident-portal-s40">HDFCN261358921</td>
                <td className="resident-portal-s39"><span className="resident-portal-s43">✓ Paid</span></td>
              </tr>
              <tr className="resident-portal-s42">
                <td className="resident-portal-s39">Oct 25 to Mar 26</td>
                <td className="resident-portal-s39">ME/A/15/OCT-25</td>
                <td className="resident-portal-s36">₹18,000</td>
                <td className="resident-portal-s39">21-11-2025</td>
                <td className="resident-portal-s40">HDFCN52025112110</td>
                <td className="resident-portal-s39"><span className="resident-portal-s43">✓ Paid</span></td>
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {/* TAB CONTENT: Parking */}
      {activeSection === 'parking' && (
        <div className="section-card resident-portal-s29">
          <h3 className="resident-portal-s30">Allotted Parking Space</h3>
          <div className="resident-portal-s44">
            <div className="resident-portal-s45">
              <div className="resident-portal-s28">Assigned Slot</div>
              <div className="resident-portal-s46">{parkingRecord.slot}</div>
              <div className="resident-portal-s47">✓ Covered Stilt / Basement</div>
            </div>
            <div className="resident-portal-s45">
              <div className="resident-portal-s28">Park+ Boom Barrier RFID Tag</div>
              <div className="resident-portal-s48">{parkingRecord.rfidTag}</div>
              <div className="resident-portal-s49">Automated Fastag Society Access</div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Complaints */}
      {activeSection === 'complaints' && (
        <div className="section-card resident-portal-s29">
          <h3 className="resident-portal-s30">Raise a Complaint / Service Request</h3>

          {feedbackMsg && (
            <div className="resident-portal-s50">
              {feedbackMsg}
            </div>
          )}

          <form onSubmit={handleLodgeComplaint} className="resident-portal-s51">
            <div className="resident-portal-s52">
              <div>
                <label className="eyebrow resident-portal-s53">Category</label>
                <select
                  value={complaintCategory}
                  onChange={(e) => setComplaintCategory(e.target.value)}
                  className="attendance-register-input resident-portal-s54"
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
                <label className="eyebrow resident-portal-s53">Issue Description *</label>
                <input
                  type="text"
                  required
                  placeholder="Describe the maintenance issue or request..."
                  value={complaintText}
                  onChange={(e) => setComplaintText(e.target.value)}
                  className="attendance-register-input resident-portal-s55"
                />
              </div>
            </div>

            <button type="submit" className="button-primary resident-portal-s56">
              Submit Request
            </button>
          </form>

          <h4 className="resident-portal-s57">Your Past Requests ({complaintsList.length})</h4>
          <div className="resident-portal-s58">
            {complaintsList.map(c => (
              <div key={c.id} className="resident-portal-s59">
                <div>
                  <div className="resident-portal-s60">{c.title}</div>
                  <div className="resident-portal-s28">{c.category} • Logged on {c.date}</div>
                </div>
                <span className={`resident-portal-s61 ${(c.status === 'Resolved' ? 'resident-portal-cond-3-true' : 'resident-portal-cond-4-false')}`}>
                  {c.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Society Rules */}
      {activeSection === 'rules' && (
        <div className="section-card resident-portal-s29">
          <h3 className="resident-portal-s30">Society Rules & Guidelines</h3>
          <div className="resident-portal-s62">
            <div className="resident-portal-s63">
              <strong className="resident-portal-s64">🔨 Drilling & Renovation Hours:</strong>
              <p className="resident-portal-s65">
                Strictly permitted between <b>10:00 AM – 1:00 PM</b> and <b>3:00 PM – 6:00 PM</b>, Monday to Saturday only. No drilling or heavy construction work is allowed on Sundays or public holidays.
              </p>
            </div>
            <div className="resident-portal-s63">
              <strong className="resident-portal-s64">🚗 Parking Protocols:</strong>
              <p className="resident-portal-s65">
                Park only within designated white lines in your allotted slot. Visitor vehicles must register at the main gate and are restricted to visitor bays for maximum 12 hours.
              </p>
            </div>
            <div className="resident-portal-s63">
              <strong className="resident-portal-s64">🗑️ Waste Segregation:</strong>
              <p className="resident-portal-s65">
                Dry and wet waste segregation is mandatory. Collection occurs daily at 9:30 AM outside apartment doors.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Emergency Contacts */}
      {activeSection === 'emergency' && (
        <div className="section-card resident-portal-s29">
          <h3 className="resident-portal-s30">Society Emergency Contacts</h3>
          <div className="resident-portal-s66">
            {emergencyServices.slice(0, 6).map((item, idx) => (
              <div key={idx} className="resident-portal-s67">
                <div className="resident-portal-s68">{item.badge || 'Emergency'}</div>
                <div className="resident-portal-s69">{item.icon} {item.name}</div>
                <div className="resident-portal-s70">
                  <a href={`tel:${item.primaryNumber}`} className="resident-portal-s71">📞 {item.primaryNumber}</a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
