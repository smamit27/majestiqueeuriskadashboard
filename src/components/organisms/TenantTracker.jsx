import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Legend, CartesianGrid } from 'recharts';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import { initialTenantData } from '../../data/tenantSeedData.js';
import MetricCard from '../molecules/MetricCard.jsx';
import StatusPill from '../atoms/StatusPill.jsx';

const TENANT_TRACKING_COLLECTION = 'tenantTracking';
const TENANT_TRACKING_DOC_ID = 'a_wing_flats_v2'; // Bump version since schema changed to prevent caching issues

// ── Icons ──────────────────────────────────────────────────────────
function UsersIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function PencilIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function TrashIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 15H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function PlusIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}

export default function TenantTracker({ isAdmin = false }) {
  const [flats, setFlats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error' | 'local'
  const [saveMessage, setSaveMessage] = useState('');
  
  // Search & Filter state
  const [searchText, setSearchText] = useState('');
  const [occupantFilter, setOccupantFilter] = useState('All');
  const [intercomFilter, setIntercomFilter] = useState('All');
  const [quarantineFilter, setQuarantineFilter] = useState('All');
  const [sortBy, setSortBy] = useState('flatAsc');

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [formFlatNo, setFormFlatNo] = useState('');
  const [formFlatType, setFormFlatType] = useState('Residential');
  const [formOccupantType, setFormOccupantType] = useState('Owner');
  const [formStatus, setFormStatus] = useState('Active');
  const [formQuarantineStatus, setFormQuarantineStatus] = useState('None');
  const [formPrimaryIntercom, setFormPrimaryIntercom] = useState(false);
  const [formSecondaryIntercom, setFormSecondaryIntercom] = useState(false);
  const [formActiveUsers, setFormActiveUsers] = useState('1');
  const [formInactiveUsers, setFormInactiveUsers] = useState('0');
  const [formKidsCount, setFormKidsCount] = useState('0');
  const [formStartDate, setFormStartDate] = useState('');
  const [formEndDate, setFormEndDate] = useState('');

  // Load flats data
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) {
        // Fallback to local storage or seed data
        const local = localStorage.getItem('me_tenant_data_v2');
        if (local) {
          setFlats(JSON.parse(local));
        } else {
          setFlats(initialTenantData);
        }
        setSaveStatus('local');
        setSaveMessage('Local mode');
        setIsLoading(false);
        return;
      }

      setSaveStatus('loading');
      setSaveMessage('Loading flats directory...');

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, TENANT_TRACKING_COLLECTION, TENANT_TRACKING_DOC_ID));
        if (cancelled) return;

        if (snap.exists() && Array.isArray(snap.data().flats)) {
          setFlats(snap.data().flats);
          setSaveStatus('idle');
          setSaveMessage('Synced with cloud');
        } else {
          // Initialize Firestore with default seed data
          await setDoc(doc(db, TENANT_TRACKING_COLLECTION, TENANT_TRACKING_DOC_ID), {
            flats: initialTenantData,
            lastUpdated: new Date().toISOString()
          });
          if (!cancelled) {
            setFlats(initialTenantData);
            setSaveStatus('idle');
            setSaveMessage('Synced with cloud (initialized)');
          }
        }
      } catch (err) {
        console.error('Tenant Tracker load error:', err);
        if (!cancelled) {
          setSaveStatus('error');
          setSaveMessage('Failed to connect to cloud');
          // Load local backup
          const local = localStorage.getItem('me_tenant_data_v2');
          setFlats(local ? JSON.parse(local) : initialTenantData);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // Save flats data
  const saveFlatsData = useCallback(async (updatedList) => {
    setFlats(updatedList);
    localStorage.setItem('me_tenant_data_v2', JSON.stringify(updatedList));

    if (!isFirebaseConfigured || !db) {
      setSaveStatus('local');
      setSaveMessage('Local changes saved');
      return;
    }

    setSaveStatus('saving');
    setSaveMessage('Syncing with cloud...');
    try {
      await ensureFirebaseSession();
      await setDoc(doc(db, TENANT_TRACKING_COLLECTION, TENANT_TRACKING_DOC_ID), {
        flats: updatedList,
        lastUpdated: new Date().toISOString()
      });
      setSaveStatus('saved');
      setSaveMessage('All changes synced');
    } catch (err) {
      console.error('Tenant Tracker sync error:', err);
      setSaveStatus('error');
      setSaveMessage('Sync failed. Retrying in background...');
    }
  }, []);

  // Reset database back to seed data
  const handleResetToDefaults = async () => {
    if (!window.confirm('Are you sure you want to reset all flats data back to the default Wing A CSV records? All custom additions and edits will be lost.')) {
      return;
    }
    await saveFlatsData(initialTenantData);
  };

  // Date formatter helper
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '--';
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return dateStr;
      return new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  // Metrics calculations
  const metrics = useMemo(() => {
    const total = flats.length;
    const tenants = flats.filter(f => f.occupantType === 'Tenant' || f.occupantType === 'Multitenant').length;
    const owners = flats.filter(f => f.occupantType === 'Owner').length;
    const refuges = flats.filter(f => f.occupantType === 'Refuge Area').length;
    const tenantPercent = total ? ((tenants / total) * 100).toFixed(1) : 0;
    
    const activeUsersTotal = flats.reduce((acc, curr) => acc + (Number(curr.activeUsers) || 0), 0);
    const inactiveUsersTotal = flats.reduce((acc, curr) => acc + (Number(curr.inactiveUsers) || 0), 0);
    const kidsTotal = flats.reduce((acc, curr) => acc + (Number(curr.kidsCount) || 0), 0);
    const totalResidents = activeUsersTotal + inactiveUsersTotal + kidsTotal;

    const withIntercom = flats.filter(f => f.primaryIntercom || f.secondaryIntercom).length;
    const intercomPercent = total ? ((withIntercom / total) * 100).toFixed(1) : 0;

    return {
      total,
      tenants,
      owners,
      refuges,
      tenantPercent,
      activeUsersTotal,
      inactiveUsersTotal,
      kidsTotal,
      totalResidents,
      withIntercom,
      intercomPercent
    };
  }, [flats]);

  // Chart data calculations
  const occupantChartData = useMemo(() => {
    return [
      { name: 'Owner Occupied', value: metrics.owners, color: '#196c6c' },
      { name: 'Tenant/Other Occupied', value: metrics.tenants, color: '#315271' },
      ...(metrics.refuges > 0 ? [{ name: 'Refuge Areas', value: metrics.refuges, color: '#64748b' }] : [])
    ];
  }, [metrics]);

  const residentChartData = useMemo(() => {
    return [
      { name: 'Active Users', count: metrics.activeUsersTotal, fill: '#10b981' },
      { name: 'Inactive Users', count: metrics.inactiveUsersTotal, fill: '#94a3b8' },
      { name: 'Kids', count: metrics.kidsTotal, fill: '#f59e0b' }
    ];
  }, [metrics]);

  // Handle open modal for new flat
  const handleOpenAddModal = () => {
    setEditingFlat(null);
    setFormFlatNo('');
    setFormFlatType('Residential');
    setFormOccupantType('Owner');
    setFormStatus('Active');
    setFormQuarantineStatus('None');
    setFormPrimaryIntercom(false);
    setFormSecondaryIntercom(false);
    setFormActiveUsers('1');
    setFormInactiveUsers('0');
    setFormKidsCount('0');
    setFormStartDate('');
    setFormEndDate('');
    setIsModalOpen(true);
  };

  // Handle open modal for editing flat
  const handleOpenEditModal = (flat) => {
    setEditingFlat(flat);
    setFormFlatNo(flat.flat);
    setFormFlatType(flat.flatType || 'Residential');
    setFormOccupantType(flat.occupantType);
    setFormStatus(flat.status || 'Active');
    setFormQuarantineStatus(flat.quarantineStatus || 'None');
    setFormPrimaryIntercom(Boolean(flat.primaryIntercom));
    setFormSecondaryIntercom(Boolean(flat.secondaryIntercom));
    setFormActiveUsers(String(flat.activeUsers ?? 0));
    setFormInactiveUsers(String(flat.inactiveUsers ?? 0));
    setFormKidsCount(String(flat.kidsCount ?? 0));
    setFormStartDate(flat.startDate || '');
    setFormEndDate(flat.endDate || '');
    setIsModalOpen(true);
  };

  // Handle delete flat
  const handleDeleteFlat = async (flatNo) => {
    if (!window.confirm(`Are you sure you want to delete flat ${flatNo} from the tracking system?`)) {
      return;
    }
    const updated = flats.filter(f => f.flat !== flatNo);
    await saveFlatsData(updated);
  };

  // Handle save flat form
  const handleSaveFlat = async (e) => {
    e.preventDefault();
    if (!formFlatNo.trim()) {
      alert('Flat number is required');
      return;
    }

    const flatNo = formFlatNo.trim().toUpperCase();

    // Check duplicate flat number if we are adding a new flat
    if (!editingFlat && flats.some(f => f.flat.toUpperCase() === flatNo)) {
      alert(`Flat ${flatNo} already exists in the tracking directory.`);
      return;
    }

    const flatObj = {
      flat: flatNo,
      flatType: formFlatType,
      occupantType: formOccupantType,
      status: formStatus,
      quarantineStatus: formQuarantineStatus,
      primaryIntercom: formPrimaryIntercom,
      secondaryIntercom: formSecondaryIntercom,
      activeUsers: parseInt(formActiveUsers) || 0,
      inactiveUsers: parseInt(formInactiveUsers) || 0,
      kidsCount: parseInt(formKidsCount) || 0,
      startDate: formStartDate,
      endDate: formEndDate,
      created: editingFlat?.created || new Date().toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
      }).replace(/ /g, '-')
    };

    let updatedList;
    if (editingFlat) {
      updatedList = flats.map(f => f.flat === editingFlat.flat ? flatObj : f);
    } else {
      updatedList = [flatObj, ...flats];
    }

    await saveFlatsData(updatedList);
    setIsModalOpen(false);
  };

  // Export flat directory as CSV file
  const handleExportCSV = () => {
    const headers = 'Flat,Flat Type,Occupant Type,Status,Quarantine Status,Primary e-Intercom,Secondary e-Intercom,Number of Active users,Number of Inactive users,Number of Kids,Start Date,End Date,Created\n';
    const rows = flats.map(f => {
      return `"${f.flat}","${f.flatType || 'Residential'}","${f.occupantType}","${f.status}","${f.quarantineStatus || 'None'}","${f.primaryIntercom ? 'Y' : ''}","${f.secondaryIntercom ? 'Y' : ''}",${f.activeUsers},${f.inactiveUsers},${f.kidsCount},"${f.startDate || ''}","${f.endDate || ''}","${f.created}"`;
    }).join('\n');

    const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'Majestique_Euriska_Wing_A_Tenants.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export flat directory as dedicated Print PDF document
  const handleExportPDF = () => {
    const listToPrint = processedFlats.length > 0 ? processedFlats : flats;
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const ownerCount = listToPrint.filter(f => f.occupantType === 'Owner').length;
    const tenantCount = listToPrint.filter(f => f.occupantType === 'Tenant' || f.occupantType === 'Multitenant').length;
    const refugeCount = listToPrint.filter(f => f.occupantType === 'Refuge Area').length;

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - Wing A Flat Occupancy Registry</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 20px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .summary-bar {
            display: flex;
            gap: 16px;
            margin-bottom: 16px;
            padding: 10px 14px;
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            font-size: 12px;
          }
          .summary-item { font-weight: 600; color: #334155; }
          .summary-item strong { color: #0f172a; }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: left; padding: 8px 10px; border: 1px solid #94a3b8; text-transform: uppercase; font-size: 10px; letter-spacing: 0.05em; }
          td { padding: 7px 10px; border: 1px solid #cbd5e1; color: #0f172a; }
          tr:nth-child(even) { background: #f8fafc; }
          
          .pill {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 10px;
            font-size: 10px;
            font-weight: 700;
          }
          .pill-owner { background: #ecfdf5; color: #065f46; border: 1px solid #a7f3d0; }
          .pill-tenant { background: #eff6ff; color: #1e40af; border: 1px solid #bfdbfe; }
          .pill-multitenant { background: #f0fdfa; color: #115e59; border: 1px solid #99f6e4; }
          .pill-refuge { background: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; }
          
          .footer {
            margin-top: 24px;
            border-top: 1px solid #cbd5e1;
            padding-top: 10px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1.2cm; size: A4 portrait; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🏢 Majestique Euriska - Wing A Registry</h1>
            <div class="subtitle">Flat Occupancy & Tenancy Management System</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${generatedDate}</div>
            <div><strong>Scope:</strong> ${occupantFilter === 'All' ? 'All Units' : occupantFilter} (${listToPrint.length} Flats)</div>
          </div>
        </div>

        <div class="summary-bar">
          <div class="summary-item">Total Listed: <strong>${listToPrint.length} Units</strong></div>
          <div>•</div>
          <div class="summary-item">Owners: <strong>${ownerCount}</strong></div>
          <div>•</div>
          <div class="summary-item">Tenants: <strong>${tenantCount}</strong></div>
          <div>•</div>
          <div class="summary-item">Refuge Areas: <strong>${refugeCount}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 40px; text-align: center;">#</th>
              <th style="width: 100px;">Flat No</th>
              <th style="width: 130px;">Occupancy</th>
              <th style="width: 100px;">Flat Type</th>
              <th style="width: 80px; text-align: center;">Status</th>
              <th style="width: 110px;">Start Date</th>
              <th style="width: 110px;">End Date</th>
            </tr>
          </thead>
          <tbody>
            ${listToPrint.map((flat, index) => {
              const pillClass = flat.occupantType === 'Owner'
                ? 'pill-owner'
                : flat.occupantType === 'Tenant'
                ? 'pill-tenant'
                : flat.occupantType === 'Multitenant'
                ? 'pill-multitenant'
                : 'pill-refuge';
              return `
                <tr>
                  <td style="text-align: center; color: #64748b; font-weight: 600;">${index + 1}</td>
                  <td style="font-weight: 700; color: #0f172a;">${flat.flat || ''}</td>
                  <td><span class="pill ${pillClass}">${flat.occupantType || ''}</span></td>
                  <td>${flat.flatType || 'Residential'}</td>
                  <td style="text-align: center; font-weight: 600;">${flat.status || 'Active'}</td>
                  <td>${flat.startDate ? flat.startDate : '—'}</td>
                  <td>${flat.endDate ? flat.endDate : '—'}</td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society • Wing A Occupancy Data</div>
          <div>Confidential Document</div>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 250);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.open();
      printWindow.document.write(printDoc);
      printWindow.document.close();
    } else {
      window.print();
    }
  };

  // Helper sorting function
  const parseFlatNumber = (flatStr) => {
    // extracts number, e.g., "A 1108" -> 1108
    const num = parseInt(flatStr.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(num) ? num : 0;
  };

  // Filtered & Sorted flats list
  const processedFlats = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    let result = flats.filter((item) => {
      // 1. Search Query filter
      if (q) {
        const matchFlat = item.flat.toLowerCase().includes(q);
        const matchOccupant = item.occupantType.toLowerCase().includes(q);
        const matchStatus = (item.status || '').toLowerCase().includes(q);
        const matchQuarantine = (item.quarantineStatus || '').toLowerCase().includes(q);
        if (!matchFlat && !matchOccupant && !matchStatus && !matchQuarantine) {
          return false;
        }
      }

      // 2. Occupant filter
      if (occupantFilter !== 'All') {
        if (occupantFilter === 'Owner' && item.occupantType !== 'Owner') return false;
        if (occupantFilter === 'Tenant' && (item.occupantType !== 'Tenant' && item.occupantType !== 'Multitenant')) return false;
        if (occupantFilter === 'Refuge Area' && item.occupantType !== 'Refuge Area') return false;
      }

      // 3. Intercom filter
      if (intercomFilter !== 'All') {
        const hasPrimary = Boolean(item.primaryIntercom);
        const hasSecondary = Boolean(item.secondaryIntercom);
        if (intercomFilter === 'Primary' && !hasPrimary) return false;
        if (intercomFilter === 'Secondary' && !hasSecondary) return false;
        if (intercomFilter === 'Both' && (!hasPrimary || !hasSecondary)) return false;
        if (intercomFilter === 'None' && (hasPrimary || hasSecondary)) return false;
      }

      // 4. Quarantine Filter
      if (quarantineFilter !== 'All') {
        const status = item.quarantineStatus || 'None';
        if (quarantineFilter === 'Quarantined' && status === 'None') return false;
        if (quarantineFilter === 'Completed' && status !== 'Completed') return false;
        if (quarantineFilter === 'None' && status !== 'None') return false;
      }

      return true;
    });

    // 5. Sorting logic
    result.sort((a, b) => {
      if (sortBy === 'flatAsc') {
        return parseFlatNumber(a.flat) - parseFlatNumber(b.flat);
      }
      if (sortBy === 'flatDesc') {
        return parseFlatNumber(b.flat) - parseFlatNumber(a.flat);
      }
      if (sortBy === 'activeDesc') {
        return (b.activeUsers || 0) - (a.activeUsers || 0);
      }
      if (sortBy === 'activeAsc') {
        return (a.activeUsers || 0) - (b.activeUsers || 0);
      }
      if (sortBy === 'kidsDesc') {
        return (b.kidsCount || 0) - (a.kidsCount || 0);
      }
      if (sortBy === 'createdDesc') {
        return new Date(b.created) - new Date(a.created);
      }
      return 0;
    });

    return result;
  }, [flats, searchText, occupantFilter, intercomFilter, quarantineFilter, sortBy]);

  return (
    <section className="section-card" id="tenant-tracking-system">
      {/* ── Standard Section Header ── */}
      <div className="section-card__header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16, marginBottom: 20 }}>
        <div>
          <p className="eyebrow" style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '0 0 4px 0' }}>
            <span>🏢 WING A DIRECTORY</span>
            <span
              style={{
                fontSize: '0.72rem',
                padding: '2px 8px',
                borderRadius: '6px',
                background: saveStatus === 'saved' || saveStatus === 'idle' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(245, 158, 11, 0.12)',
                color: saveStatus === 'saved' || saveStatus === 'idle' ? '#10b981' : '#f59e0b',
                fontWeight: 600
              }}
            >
              ● {saveMessage}
            </span>
          </p>
          <h2 style={{ margin: 0 }}>Tenant & Occupant Tracking</h2>
        </div>

        {/* ── Horizontal Action Toolbar ── */}
        <div className="section-toolbar" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <button className="button-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={handleExportCSV}>
            📥 Export CSV
          </button>
          <button className="button-secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={handleExportPDF}>
            📄 Print PDF
          </button>
          {isAdmin && (
            <>
              <button className="button-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={handleOpenAddModal}>
                <PlusIcon size={16} /> Add Flat
              </button>
              <button
                className="button-secondary"
                style={{ border: '1px solid rgba(220,38,38,0.2)', color: '#dc2626', background: 'rgba(220,38,38,0.04)' }}
                onClick={handleResetToDefaults}
                title="Reset local changes and sync default CSV data"
              >
                Reset Database
              </button>
            </>
          )}
        </div>
      </div>

      <div className="section-card__body">
        {/* ── Standard Horizontal Metrics Grid ── */}
        <div className="metrics-grid" style={{ marginBottom: 20 }}>
          <MetricCard
            label="Total Flats Tracked"
            value={isLoading ? '...' : metrics.total}
            detail="A-Wing Residents"
            tone="emerald"
          />
          <MetricCard
            label="Tenant/Other Occupied"
            value={isLoading ? '...' : `${metrics.tenants} Flats`}
            detail={`${metrics.tenantPercent}% occupancy ratio`}
            tone="ocean"
          />
          <MetricCard
            label="e-Intercom Enabled"
            value={isLoading ? '...' : `${metrics.withIntercom} Flats`}
            detail={`${metrics.intercomPercent}% coverage`}
            tone="teal"
          />
          <MetricCard
            label="Refuge & Safety"
            value={isLoading ? '...' : `${metrics.refuges} Flats`}
            detail="Emergency floors"
            tone="slate"
          />
        </div>

        {/* ── Add / Edit Inline Card ── */}
        {isModalOpen && (
          <div className="inline-form-card" style={{
            background: 'linear-gradient(135deg, rgba(25, 108, 108, 0.03) 0%, rgba(49, 82, 113, 0.05) 100%)',
            border: '1.5px dashed rgba(25, 108, 108, 0.25)',
            borderRadius: 16,
            padding: '24px 28px',
            marginBottom: 20,
            boxShadow: 'inset 0 1px 2px rgba(255,255,255,0.8), 0 4px 20px rgba(0,0,0,0.03)',
            animation: 'fadeIn 0.2s ease-out'
          }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.05rem', fontWeight: 700, color: '#1e293b' }}>
              {editingFlat ? `Edit Flat A ${editingFlat.flat}` : 'Add Wing A Flat'}
            </h3>
            
            <form onSubmit={handleSaveFlat}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: 16,
                marginBottom: 20
              }}>
                {/* Flat number */}
                <div className="ann-form-field">
                  <label htmlFor="flatNoInput">Flat Number</label>
                  <input
                    id="flatNoInput"
                    type="text"
                    disabled={Boolean(editingFlat)}
                    placeholder="e.g. A 1109"
                    value={formFlatNo}
                    onChange={(e) => setFormFlatNo(e.target.value)}
                    style={{
                      background: editingFlat ? 'rgba(0,0,0,0.03)' : '#fff',
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.1)',
                      padding: '0 12px',
                      fontSize: '0.88rem'
                    }}
                    required
                  />
                </div>

                {/* Flat type */}
                <div className="ann-form-field">
                  <label htmlFor="flatTypeInput">Flat Type</label>
                  <select
                    id="flatTypeInput"
                    value={formFlatType}
                    onChange={(e) => setFormFlatType(e.target.value)}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.1)',
                      padding: '0 12px',
                      fontSize: '0.88rem',
                      background: '#fff'
                    }}
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Utility">Utility</option>
                  </select>
                </div>

                {/* Occupant Type */}
                <div className="ann-form-field">
                  <label htmlFor="occupantTypeInput">Occupant Type</label>
                  <select
                    id="occupantTypeInput"
                    value={formOccupantType}
                    onChange={(e) => {
                      const newType = e.target.value;
                      setFormOccupantType(newType);
                      if (newType === 'Refuge Area') {
                        setFormFlatType('Utility');
                        setFormStatus('Inactive');
                      } else if (formFlatType === 'Utility') {
                        setFormFlatType('Residential');
                        setFormStatus('Active');
                      }
                    }}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.1)',
                      padding: '0 12px',
                      fontSize: '0.88rem',
                      background: '#fff'
                    }}
                  >
                    <option value="Owner">Owner</option>
                    <option value="Tenant">Tenant</option>
                    <option value="Multitenant">Multitenant</option>
                    <option value="Refuge Area">Refuge Area</option>
                  </select>
                </div>

                {/* Status */}
                <div className="ann-form-field">
                  <label htmlFor="statusInput">Status</label>
                  <select
                    id="statusInput"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.1)',
                      padding: '0 12px',
                      fontSize: '0.88rem',
                      background: '#fff'
                    }}
                  >
                    <option value="Active">Active</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>

                {/* Start Date */}
                <div className="ann-form-field">
                  <label htmlFor="startDateInput">Start Date</label>
                  <input
                    id="startDateInput"
                    type="date"
                    value={formStartDate}
                    onChange={(e) => setFormStartDate(e.target.value)}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.1)',
                      padding: '0 12px',
                      fontSize: '0.88rem',
                      background: '#fff'
                    }}
                  />
                </div>

                {/* End Date */}
                <div className="ann-form-field">
                  <label htmlFor="endDateInput">End Date</label>
                  <input
                    id="endDateInput"
                    type="date"
                    value={formEndDate}
                    onChange={(e) => setFormEndDate(e.target.value)}
                    style={{
                      height: 40,
                      borderRadius: 10,
                      border: '1px solid rgba(0,0,0,0.1)',
                      padding: '0 12px',
                      fontSize: '0.88rem',
                      background: '#fff'
                    }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                <button
                  type="button"
                  className="button-secondary"
                  style={{ minHeight: 'auto', padding: '8px 16px', borderRadius: 8, fontSize: '0.85rem' }}
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary"
                  style={{ minHeight: 'auto', padding: '8px 18px', borderRadius: 8, fontSize: '0.85rem' }}
                >
                  {editingFlat ? 'Save Changes' : 'Add Flat'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Single Horizontal Search & Filter Row ── */}
        <div className="search-card" style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 20,
          padding: '14px 18px'
        }}>
          {/* Left: Search input */}
          <div style={{ flex: '1 1 240px', position: 'relative' }}>
            <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '0.9rem' }}>
              🔍
            </span>
            <input
              type="text"
              placeholder="Search Flat No (e.g. A 1006) or Occupant Type..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: 40,
                height: 40,
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.1)',
                background: '#fff',
                fontSize: '0.86rem'
              }}
            />
          </div>

          {/* Center: Horizontal Occupant Filter Pills */}
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            {[
              { id: 'All', label: 'All', count: metrics.total },
              { id: 'Owner', label: 'Owners', count: metrics.owners },
              { id: 'Tenant', label: 'Tenants', count: metrics.tenants },
              { id: 'Refuge Area', label: 'Refuge', count: metrics.refuges }
            ].map(tab => {
              const isSelected = occupantFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOccupantFilter(tab.id)}
                  style={{
                    height: 40,
                    padding: '0 12px',
                    borderRadius: 10,
                    fontSize: '0.84rem',
                    fontWeight: isSelected ? 700 : 500,
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 6,
                    border: isSelected ? '1px solid #196c6c' : '1px solid rgba(0,0,0,0.1)',
                    background: isSelected ? '#196c6c' : '#ffffff',
                    color: isSelected ? '#ffffff' : '#475569',
                    transition: 'all 0.15s ease'
                  }}
                >
                  <span>{tab.label}</span>
                  <span style={{
                    fontSize: '0.72rem',
                    padding: '1px 6px',
                    borderRadius: 8,
                    background: isSelected ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.06)',
                    color: isSelected ? '#ffffff' : '#64748b'
                  }}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Hidden/Synced Select for testing & accessibility + Sort selector */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <select
              aria-label="Occupant Type Filter"
              value={occupantFilter}
              onChange={(e) => setOccupantFilter(e.target.value)}
              style={{
                height: 40,
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.1)',
                padding: '0 10px',
                background: '#fff',
                fontSize: '0.84rem',
                color: '#334155'
              }}
            >
              <option value="All">All Types</option>
              <option value="Owner">Owners</option>
              <option value="Tenant">Tenants</option>
              <option value="Refuge Area">Refuge Areas</option>
            </select>

            <select
              aria-label="Sorting Selector"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                height: 40,
                borderRadius: 10,
                border: '1px solid rgba(0,0,0,0.1)',
                padding: '0 10px',
                background: '#fff',
                fontSize: '0.84rem',
                color: '#334155'
              }}
            >
              <option value="flatAsc">Flat No (Asc)</option>
              <option value="flatDesc">Flat No (Desc)</option>
              <option value="createdDesc">Newest First</option>
            </select>
          </div>
        </div>

        {/* ── Inventory List Table ── */}
        <div className="table-card" style={{ overflowX: 'auto', borderRadius: 16, border: '1px solid rgba(0,0,0,0.06)', background: '#ffffff', boxShadow: '0 2px 12px rgba(0,0,0,0.02)' }}>
          {isLoading ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              <span className="spinner" style={{ display: 'inline-block', width: 24, height: 24, border: '3px solid rgba(0,0,0,0.1)', borderTopColor: '#196c6c', borderRadius: '50%', animation: 'spin 1s linear infinite', marginRight: 10 }} />
              Loading flat occupancy data...
            </div>
          ) : processedFlats.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: '#64748b' }}>
              No flats match your filter criteria. Try resetting the filters.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
              <thead>
                <tr>
                  <th style={{ padding: '14px 18px', background: '#f8fafc', fontWeight: 700, color: '#334155', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Flat No</th>
                  <th style={{ padding: '14px 18px', background: '#f8fafc', fontWeight: 700, color: '#334155', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Occupancy</th>
                  <th style={{ padding: '14px 18px', background: '#f8fafc', fontWeight: 700, color: '#334155', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>Start Date</th>
                  <th style={{ padding: '14px 18px', background: '#f8fafc', fontWeight: 700, color: '#334155', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>End Date</th>
                  {isAdmin && <th className="no-print" style={{ padding: '14px 18px', background: '#f8fafc', fontWeight: 700, color: '#334155', borderBottom: '1px solid rgba(0,0,0,0.06)', textAlign: 'center' }}>Actions</th>}
                </tr>
              </thead>
              <tbody>
                {processedFlats.map((flat, idx) => (
                  <tr key={flat.flat} style={{ background: idx % 2 === 0 ? '#fff' : '#fcfcfa', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                    <td style={{ padding: '14px 18px', fontWeight: 700, color: '#1e293b' }}>{flat.flat}</td>
                    <td style={{ padding: '14px 18px' }}>
                      <StatusPill value={flat.occupantType} />
                    </td>
                    <td style={{ padding: '14px 18px', color: '#334155', fontSize: '0.82rem', fontWeight: 500 }}>{formatDateLabel(flat.startDate)}</td>
                    <td style={{ padding: '14px 18px', color: '#334155', fontSize: '0.82rem', fontWeight: 500 }}>{formatDateLabel(flat.endDate)}</td>
                    {isAdmin && (
                      <td className="no-print" style={{ padding: '14px 18px', textAlign: 'center' }}>
                        <div style={{ display: 'inline-flex', gap: 6 }}>
                          <button
                            className="button-secondary"
                            style={{ padding: 6, minHeight: 'auto', display: 'flex', alignItems: 'center', borderRadius: 8, border: '1px solid rgba(0,0,0,0.06)', color: '#475569' }}
                            onClick={() => handleOpenEditModal(flat)}
                            title="Edit flat details"
                          >
                            <PencilIcon size={14} />
                          </button>
                          <button
                            className="button-secondary"
                            style={{ padding: 6, minHeight: 'auto', display: 'flex', alignItems: 'center', borderRadius: 8, border: '1px solid rgba(220,38,38,0.1)', color: '#dc2626', background: 'rgba(220,38,38,0.02)' }}
                            onClick={() => handleDeleteFlat(flat.flat)}
                            title="Delete flat"
                          >
                            <TrashIcon size={14} />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}

