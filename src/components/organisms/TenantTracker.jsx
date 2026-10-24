import { useCallback, useEffect, useRef, useState, useMemo } from 'react';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import { initialTenantData } from '../../data/tenantSeedData.js';
import MetricCard from '../molecules/MetricCard.jsx';
import StatusPill from '../atoms/StatusPill.jsx';
import './TenantTracker.css';


const TENANT_TRACKING_COLLECTION = 'tenantTracking';
const TENANT_TRACKING_DOC_ID = 'a_wing_flats_v3'; // Bump version for new schema: tenantName, remarks, live expiry calculation

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

// ── Lease Expiry Calculation Helper ─────────────────────────────────
export function getLeaseExpiryInfo(endDate) {
  if (!endDate || typeof endDate !== 'string' || !endDate.trim()) {
    return {
      status: 'none',
      label: 'No End Date',
      days: null,
      daysText: '—',
      badgeClass: 'lease-badge lease-badge--none',
      isExpiringSoon: false,
      isExpired: false,
      isWarning: false
    };
  }

  try {
    const end = new Date(endDate);
    if (isNaN(end.getTime())) {
      return {
        status: 'invalid',
        label: endDate,
        days: null,
        daysText: endDate,
        badgeClass: 'lease-badge lease-badge--none',
        isExpiringSoon: false,
        isExpired: false,
        isWarning: false
      };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);

    const diffTime = end.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return {
        status: 'expired',
        label: 'Expired',
        days: diffDays,
        daysText: `Expired (${Math.abs(diffDays)}d ago)`,
        badgeClass: 'lease-badge lease-badge--expired',
        isExpiringSoon: false,
        isExpired: true,
        isWarning: false
      };
    } else if (diffDays <= 30) {
      return {
        status: 'critical',
        label: 'Expiring Soon',
        days: diffDays,
        daysText: `${diffDays} days left`,
        badgeClass: 'lease-badge lease-badge--critical',
        isExpiringSoon: true,
        isExpired: false,
        isWarning: true
      };
    } else if (diffDays <= 60) {
      return {
        status: 'warning',
        label: 'Expiring (<60d)',
        days: diffDays,
        daysText: `${diffDays} days left`,
        badgeClass: 'lease-badge lease-badge--warning',
        isExpiringSoon: true,
        isExpired: false,
        isWarning: true
      };
    } else {
      return {
        status: 'active',
        label: 'Active Lease',
        days: diffDays,
        daysText: `${diffDays} days left`,
        badgeClass: 'lease-badge lease-badge--active',
        isExpiringSoon: false,
        isExpired: false,
        isWarning: false
      };
    }
  } catch {
    return {
      status: 'none',
      label: '—',
      days: null,
      daysText: '—',
      badgeClass: 'lease-badge lease-badge--none',
      isExpiringSoon: false,
      isExpired: false,
      isWarning: false
    };
  }
}

export default function TenantTracker({ isAdmin = false }) {
  const [flats, setFlats] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState('idle'); // 'idle' | 'saving' | 'saved' | 'error' | 'local'
  const [saveMessage, setSaveMessage] = useState('');
  
  // Search & Filter state
  const [searchText, setSearchText] = useState('');
  const [occupantFilter, setOccupantFilter] = useState('All');
  const [expiryFilter, setExpiryFilter] = useState('All'); // 'All' | 'ExpiringSoon' | 'Expired' | 'ActiveLease'
  const [sortBy, setSortBy] = useState('flatAsc');

  // Form Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingFlat, setEditingFlat] = useState(null);
  const [formFlatNo, setFormFlatNo] = useState('');
  const [formTenantName, setFormTenantName] = useState('');
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
  const [formRemarks, setFormRemarks] = useState('');

  // Load flats data
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      if (!isFirebaseConfigured || !db) {
        // Fallback to local storage or seed data
        const local = localStorage.getItem('me_tenant_data_v3');
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
          const local = localStorage.getItem('me_tenant_data_v3');
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
    localStorage.setItem('me_tenant_data_v3', JSON.stringify(updatedList));

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
    if (!window.confirm('Are you sure you want to reset all flats data back to the default Wing A records? All custom additions and edits will be reset to latest initial tenant dataset.')) {
      return;
    }
    await saveFlatsData(initialTenantData);
  };

  // Date formatter helper
  const formatDateLabel = (dateStr) => {
    if (!dateStr) return '—';
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
    
    let expiredCount = 0;
    let expiringSoonCount = 0;
    let activeLeaseCount = 0;

    flats.forEach(f => {
      if ((f.occupantType === 'Tenant' || f.occupantType === 'Multitenant') && f.endDate) {
        const info = getLeaseExpiryInfo(f.endDate);
        if (info.isExpired) expiredCount++;
        else if (info.isExpiringSoon) expiringSoonCount++;
        else if (info.status === 'active') activeLeaseCount++;
      }
    });

    const withIntercom = flats.filter(f => f.primaryIntercom || f.secondaryIntercom).length;
    const intercomPercent = total ? ((withIntercom / total) * 100).toFixed(1) : 0;

    return {
      total,
      tenants,
      owners,
      refuges,
      tenantPercent,
      expiredCount,
      expiringSoonCount,
      activeLeaseCount,
      withIntercom,
      intercomPercent
    };
  }, [flats]);

  // Handle open modal for new flat
  const handleOpenAddModal = () => {
    setEditingFlat(null);
    setFormFlatNo('');
    setFormTenantName('');
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
    setFormRemarks('');
    setIsModalOpen(true);
  };

  // Handle open modal for editing flat
  const handleOpenEditModal = (flat) => {
    setEditingFlat(flat);
    setFormFlatNo(flat.flat);
    setFormTenantName(flat.tenantName || '');
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
    setFormRemarks(flat.remarks || '');
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
      tenantName: formTenantName.trim(),
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
      remarks: formRemarks.trim(),
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
    const headers = 'Flat,Tenant Name,Occupant Type,Flat Type,Status,Start Date,End Date,Days Remaining,Lease Status,Remarks,Primary e-Intercom,Secondary e-Intercom\n';
    const rows = flats.map(f => {
      const expiry = getLeaseExpiryInfo(f.endDate);
      const daysRem = expiry.days !== null ? expiry.days : '';
      const leaseStat = expiry.label;
      return `"${f.flat}","${f.tenantName || ''}","${f.occupantType}","${f.flatType || 'Residential'}","${f.status}","${f.startDate || ''}","${f.endDate || ''}","${daysRem}","${leaseStat}","${(f.remarks || '').replace(/"/g, '""')}","${f.primaryIntercom ? 'Y' : ''}","${f.secondaryIntercom ? 'Y' : ''}"`;
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

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Majestique Euriska - Wing A Flat Occupancy & Tenant Registry</title>
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
          
          .badge-expired { background: #fee2e2; color: #dc2626; padding: 3px 8px; border-radius: 6px; font-weight: 700; white-space: nowrap; display: inline-block; }
          .badge-warning { background: #fef3c7; color: #b45309; padding: 3px 8px; border-radius: 6px; font-weight: 700; white-space: nowrap; display: inline-block; }
          .badge-active { background: #ecfdf5; color: #059669; padding: 3px 8px; border-radius: 6px; font-weight: 700; white-space: nowrap; display: inline-block; }
          
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
            <h1 class="title">🏢 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Tenant &amp; Flat Occupancy Management System • Wing A Registry</div>
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
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 30px; text-align: center;">#</th>
              <th style="width: 75px;">Flat No</th>
              <th style="width: 150px;">Tenant / Occupant</th>
              <th style="width: 85px;">Occupancy</th>
              <th style="width: 85px;">Start Date</th>
              <th style="width: 85px;">End Date</th>
              <th style="width: 160px; white-space: nowrap;">Days Remaining</th>
              <th>Remarks</th>
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
              
              const expiry = getLeaseExpiryInfo(flat.endDate);
              let expiryBadge = '—';
              if (flat.endDate) {
                if (expiry.isExpired) {
                  expiryBadge = `<span class="badge-expired">${expiry.daysText}</span>`;
                } else if (expiry.isExpiringSoon) {
                  expiryBadge = `<span class="badge-warning">${expiry.daysText}</span>`;
                } else {
                  expiryBadge = `<span class="badge-active">${expiry.daysText}</span>`;
                }
              }

              return `
                <tr>
                  <td style="text-align: center; color: #64748b; font-weight: 600;">${index + 1}</td>
                  <td style="font-weight: 700; color: #0f172a;">${flat.flat || ''}</td>
                  <td style="font-weight: 600;">${flat.tenantName || '—'}</td>
                  <td><span class="pill ${pillClass}">${flat.occupantType || ''}</span></td>
                  <td>${flat.startDate ? flat.startDate : '—'}</td>
                  <td>${flat.endDate ? flat.endDate : '—'}</td>
                  <td style="white-space: nowrap;">${expiryBadge}</td>
                  <td style="color: #64748b; font-style: italic;">${flat.remarks || ''}</td>
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
    const num = parseInt(flatStr.replace(/[^0-9]/g, ''), 10);
    return Number.isFinite(num) ? num : 0;
  };

  // Filtered & Sorted flats list
  const processedFlats = useMemo(() => {
    const q = searchText.trim().toLowerCase();

    let result = flats.filter((item) => {
      // 1. Search Query filter (searches Flat, Tenant Name, Remarks, Occupancy Type, Status)
      if (q) {
        const matchFlat = item.flat.toLowerCase().includes(q);
        const matchName = (item.tenantName || '').toLowerCase().includes(q);
        const matchOccupant = item.occupantType.toLowerCase().includes(q);
        const matchRemarks = (item.remarks || '').toLowerCase().includes(q);
        const matchStatus = (item.status || '').toLowerCase().includes(q);
        if (!matchFlat && !matchName && !matchOccupant && !matchRemarks && !matchStatus) {
          return false;
        }
      }

      // 2. Occupant filter
      if (occupantFilter !== 'All') {
        if (occupantFilter === 'Owner' && item.occupantType !== 'Owner') return false;
        if (occupantFilter === 'Tenant' && (item.occupantType !== 'Tenant' && item.occupantType !== 'Multitenant')) return false;
        if (occupantFilter === 'Refuge Area' && item.occupantType !== 'Refuge Area') return false;
      }

      // 3. Expiry Filter
      if (expiryFilter !== 'All') {
        const expiry = getLeaseExpiryInfo(item.endDate);
        if (expiryFilter === 'ExpiringSoon' && !expiry.isExpiringSoon) return false;
        if (expiryFilter === 'Expired' && !expiry.isExpired) return false;
        if (expiryFilter === 'ActiveLease' && expiry.status !== 'active') return false;
      }

      return true;
    });

    // 4. Sorting logic
    result.sort((a, b) => {
      if (sortBy === 'flatAsc') {
        return parseFlatNumber(a.flat) - parseFlatNumber(b.flat);
      }
      if (sortBy === 'flatDesc') {
        return parseFlatNumber(b.flat) - parseFlatNumber(a.flat);
      }
      if (sortBy === 'expiryAsc') {
        // Earliest expiring first
        if (!a.endDate) return 1;
        if (!b.endDate) return -1;
        return new Date(a.endDate) - new Date(b.endDate);
      }
      if (sortBy === 'nameAsc') {
        return (a.tenantName || '').localeCompare(b.tenantName || '');
      }
      if (sortBy === 'createdDesc') {
        return new Date(b.created) - new Date(a.created);
      }
      return 0;
    });

    return result;
  }, [flats, searchText, occupantFilter, expiryFilter, sortBy]);

  return (
    <section className="section-card" id="tenant-tracking-system">
      {/* ── Section Header ── */}
      <div className="section-card__header tenant-tracker-s1">
        <div>
          <p className="eyebrow tenant-tracker-s2">
            <span>🏢 WING A DIRECTORY</span>
            <span
              className={`tenant-tracker-s3 ${(saveStatus === 'saved' || saveStatus === 'idle' ? 'tenant-tracker-cond-1-true' : 'tenant-tracker-cond-2-false')}`}
            >
              ● {saveMessage}
            </span>
          </p>
          <h2 className="tenant-tracker-s4">Tenant & Occupant Tracking</h2>
        </div>

        {/* ── Action Toolbar ── */}
        <div className="section-toolbar tenant-tracker-s5">
          <button className="button-secondary tenant-tracker-s6" onClick={handleExportCSV}>
            📥 Export CSV
          </button>
          <button className="button-secondary tenant-tracker-s6" onClick={handleExportPDF}>
            📄 Print PDF
          </button>
          {isAdmin && (
            <>
              <button className="button-primary tenant-tracker-s6" onClick={handleOpenAddModal}>
                <PlusIcon size={16} /> Add Flat
              </button>
              <button
                className="button-secondary tenant-tracker-s7"
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
        {/* ── Metric Cards Grid ── */}
        <div className="metrics-grid tenant-tracker-s8">
          <MetricCard
            label="Total Flats Tracked"
            value={isLoading ? '...' : metrics.total}
            detail="A-Wing Units"
            tone="emerald"
          />
          <MetricCard
            label="Tenant/Other Occupied"
            value={isLoading ? '...' : `${metrics.tenants} Flats`}
            detail={`${metrics.tenantPercent}% occupancy ratio`}
            tone="ocean"
          />
          <MetricCard
            label="Expiring Soon (≤60 Days)"
            value={isLoading ? '...' : `${metrics.expiringSoonCount} Leases`}
            detail="Renewal action required"
            tone={metrics.expiringSoonCount > 0 ? 'amber' : 'slate'}
          />
          <MetricCard
            label="Expired Agreements"
            value={isLoading ? '...' : `${metrics.expiredCount} Leases`}
            detail={metrics.expiredCount > 0 ? 'Needs urgent renewal' : 'All up to date'}
            tone={metrics.expiredCount > 0 ? 'rose' : 'teal'}
          />
        </div>

        {/* ── Add / Edit Inline Card ── */}
        {isModalOpen && (
          <div className="inline-form-card tenant-tracker-s9">
            <h3 className="tenant-tracker-s10">
              {editingFlat ? `Edit Flat A ${editingFlat.flat}` : 'Add Wing A Flat'}
            </h3>
            
            <form onSubmit={handleSaveFlat}>
              <div className="tenant-tracker-s11">
                {/* Flat number */}
                <div className="ann-form-field">
                  <label htmlFor="flatNoInput">Flat Number</label>
                  <input
                    id="flatNoInput"
                    type="text"
                    disabled={Boolean(editingFlat)}
                    placeholder="e.g. A 1006"
                    value={formFlatNo}
                    onChange={(e) => setFormFlatNo(e.target.value)}
                    className={`tenant-tracker-s12 ${(editingFlat ? 'tenant-tracker-cond-3-true' : 'tenant-tracker-cond-4-false')}`}
                    required
                  />
                </div>

                {/* Tenant / Resident Name */}
                <div className="ann-form-field">
                  <label htmlFor="tenantNameInput">Tenant / Occupant Name</label>
                  <input
                    id="tenantNameInput"
                    type="text"
                    placeholder="e.g. Mrs. Pamela Chandra"
                    value={formTenantName}
                    onChange={(e) => setFormTenantName(e.target.value)}
                    className="tenant-tracker-s13"
                  />
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
                    className="tenant-tracker-s13"
                  >
                    <option value="Owner">Owner</option>
                    <option value="Tenant">Tenant</option>
                    <option value="Multitenant">Multitenant</option>
                    <option value="Refuge Area">Refuge Area</option>
                  </select>
                </div>

                {/* Flat type */}
                <div className="ann-form-field">
                  <label htmlFor="flatTypeInput">Flat Type</label>
                  <select
                    id="flatTypeInput"
                    value={formFlatType}
                    onChange={(e) => setFormFlatType(e.target.value)}
                    className="tenant-tracker-s13"
                  >
                    <option value="Residential">Residential</option>
                    <option value="Commercial">Commercial</option>
                    <option value="Utility">Utility</option>
                  </select>
                </div>

                {/* Status */}
                <div className="ann-form-field">
                  <label htmlFor="statusInput">Status</label>
                  <select
                    id="statusInput"
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="tenant-tracker-s13"
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
                    className="tenant-tracker-s13"
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
                    className="tenant-tracker-s13"
                  />
                </div>

                {/* Remarks */}
                <div className="ann-form-field">
                  <label htmlFor="remarksInput">Remarks / Notes</label>
                  <input
                    id="remarksInput"
                    type="text"
                    placeholder="e.g. Brother Flat, Vacant Saturday"
                    value={formRemarks}
                    onChange={(e) => setFormRemarks(e.target.value)}
                    className="tenant-tracker-s13"
                  />
                </div>
              </div>

              <div className="tenant-tracker-s14">
                <button
                  type="button"
                  className="button-secondary tenant-tracker-s15"
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="button-primary tenant-tracker-s16"
                >
                  {editingFlat ? 'Save Changes' : 'Add Flat'}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* ── Search & Filter Row ── */}
        <div className="search-card tenant-tracker-s17">
          {/* Search input */}
          <div className="tenant-tracker-s18">
            <span className="tenant-tracker-s19">
              🔍
            </span>
            <input
              type="text"
              placeholder="Search Flat No, Tenant Name (e.g. Pamela), or Remarks..."
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              className="tenant-tracker-s20"
            />
          </div>

          {/* Center: Occupant Filter Pills */}
          <div className="tenant-tracker-s21">
            {[
              { id: 'All', label: 'All Units', count: metrics.total },
              { id: 'Tenant', label: 'Tenants', count: metrics.tenants },
              { id: 'Owner', label: 'Owners', count: metrics.owners }
            ].map(tab => {
              const isSelected = occupantFilter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setOccupantFilter(tab.id)}
                  className={`tenant-tracker-s22 ${(isSelected ? 'tenant-tracker-cond-5-true' : 'tenant-tracker-cond-6-false')}`}
                >
                  <span>{tab.label}</span>
                  <span className={`tenant-tracker-s23 ${(isSelected ? 'tenant-tracker-cond-7-true' : 'tenant-tracker-cond-8-false')}`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Right: Expiry Filter + Sort selector */}
          <div className="tenant-tracker-s24">
            <select
              aria-label="Occupant Type Filter"
              value={occupantFilter}
              onChange={(e) => setOccupantFilter(e.target.value)}
              className="tenant-tracker-s25"
            >
              <option value="All">All Types</option>
              <option value="Tenant">Tenants Only</option>
              <option value="Owner">Owners Only</option>
              <option value="Refuge Area">Refuge Areas</option>
            </select>

            <select
              aria-label="Expiry Filter"
              value={expiryFilter}
              onChange={(e) => setExpiryFilter(e.target.value)}
              className={`tenant-tracker-s25 ${(expiryFilter !== 'All' ? 'tenant-tracker-cond-9-true' : 'tenant-tracker-cond-10-false')}`}
            >
              <option value="All">All Expiries</option>
              <option value="ExpiringSoon">⚠️ Expiring Soon (≤60d)</option>
              <option value="Expired">🚨 Expired Leases</option>
              <option value="ActiveLease">🟢 Active Leases</option>
            </select>

            <select
              aria-label="Sorting Selector"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="tenant-tracker-s25"
            >
              <option value="flatAsc">Flat No (Asc)</option>
              <option value="flatDesc">Flat No (Desc)</option>
              <option value="expiryAsc">Expiring Soonest</option>
              <option value="nameAsc">Tenant Name (A-Z)</option>
              <option value="createdDesc">Newest First</option>
            </select>
          </div>
        </div>

        {/* ── Inventory List Table ── */}
        <div className="table-card tenant-tracker-s26">
          {isLoading ? (
            <div className="tenant-tracker-s27">
              <span className="spinner tenant-tracker-s28" />
              Loading flat occupancy data...
            </div>
          ) : processedFlats.length === 0 ? (
            <div className="tenant-tracker-s27">
              No flats match your filter criteria. Try resetting the filters.
            </div>
          ) : (
            <table className="tenant-tracker-s29">
              <thead>
                <tr>
                  <th className="tenant-tracker-s30">Flat No</th>
                  <th className="tenant-tracker-s31">Tenant / Resident Name</th>
                  <th className="tenant-tracker-s32">Occupancy</th>
                  <th className="tenant-tracker-s32">Start Date</th>
                  <th className="tenant-tracker-s32">End Date</th>
                  <th className="tenant-tracker-s33">Days Remaining</th>
                  <th className="tenant-tracker-s31">Remarks</th>
                  {isAdmin && <th className="no-print tenant-tracker-s34">Actions</th>}
                </tr>
              </thead>
              <tbody>
                {processedFlats.map((flat, idx) => {
                  const expiry = getLeaseExpiryInfo(flat.endDate);
                  const isTenant = flat.occupantType === 'Tenant' || flat.occupantType === 'Multitenant';
                  
                  // Row highlight if expired or expiring soon (matching user yellow highlight sheet)
                  let rowClass = '';
                  if (isTenant && expiry.isExpired) {
                    rowClass = 'tenant-row--expired';
                  } else if (isTenant && expiry.isWarning) {
                    rowClass = 'tenant-row--warning';
                  }

                  return (
                    <tr
                      key={flat.flat}
                      className={`${rowClass} tenant-tracker-s35`}
                      style={{ background: rowClass ? undefined : (idx % 2 === 0 ? '#fff' : '#fcfcfa') }}
                    >
                      {/* Flat No */}
                      <td className="tenant-tracker-s36">
                        {flat.flat}
                      </td>

                      {/* Tenant / Resident Name */}
                      <td className={`tenant-tracker-s37 ${(flat.tenantName ? 'tenant-tracker-cond-11-true' : 'tenant-tracker-cond-12-false')}`}>
                        {flat.tenantName || (flat.occupantType === 'Owner' ? 'Owner Occupied' : '—')}
                      </td>

                      {/* Occupancy Type Badge */}
                      <td className="tenant-tracker-s37">
                        <StatusPill value={flat.occupantType} />
                      </td>

                      {/* Start Date */}
                      <td className="tenant-tracker-s38">
                        {formatDateLabel(flat.startDate)}
                      </td>

                      {/* End Date */}
                      <td className="tenant-tracker-s38">
                        {formatDateLabel(flat.endDate)}
                      </td>

                      {/* Days Remaining / Expiry Badge */}
                      <td className="tenant-tracker-s37">
                        {flat.endDate ? (
                          <span className={expiry.badgeClass} title={`Agreement ends: ${flat.endDate}`}>
                            {expiry.isExpired && '🚨 '}
                            {expiry.isExpiringSoon && '⚠️ '}
                            {expiry.status === 'active' && '🟢 '}
                            {expiry.daysText}
                          </span>
                        ) : (
                          <span className="tenant-tracker-s39">—</span>
                        )}
                      </td>

                      {/* Remarks */}
                      <td className="tenant-tracker-s40">
                        {flat.remarks ? (
                          <span className="tenant-tracker-s41">
                            {flat.remarks}
                          </span>
                        ) : '—'}
                      </td>

                      {/* Actions */}
                      {isAdmin && (
                        <td className="no-print tenant-tracker-s42">
                          <div className="tenant-tracker-s43">
                            <button
                              className="button-secondary tenant-tracker-s44"
                              onClick={() => handleOpenEditModal(flat)}
                              title="Edit flat & tenant details"
                            >
                              <PencilIcon size={14} />
                            </button>
                            <button
                              className="button-secondary tenant-tracker-s45"
                              onClick={() => handleDeleteFlat(flat.flat)}
                              title="Delete flat"
                            >
                              <TrashIcon size={14} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </section>
  );
}
