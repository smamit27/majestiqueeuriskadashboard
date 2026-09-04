import { useCallback, useMemo, useState, useEffect } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import { initialShopData } from '../../data/shopSeedData.js';
const SHOP_MAINTENANCE_COLLECTION = 'shopMaintenance';
const SHOP_MAINTENANCE_DOC_ID = 'shop_maintenance_ledger';
const MONTH_ORDER = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function parseLedgerMonth(month) {
  const [rawMonth, rawYear] = String(month || '').split('-');
  const monthIndex = MONTH_ORDER.indexOf(rawMonth);
  const year = Number(rawYear);

  if (monthIndex < 0 || !Number.isFinite(year)) {
    return Number.MAX_SAFE_INTEGER;
  }

  return (2000 + year) * 12 + monthIndex;
}

function toOptionalNumber(value) {
  if (value === '' || value === null || value === undefined) return '';
  const numericValue = Number(value);
  return Number.isFinite(numericValue) ? numericValue : '';
}

function recalculateLedger(ledger) {
  let runningBalance = 0;

  return [...ledger]
    .sort((left, right) => parseLedgerMonth(left.month) - parseLedgerMonth(right.month))
    .map((entry) => {
      const regularMain = Number(entry.regularMain) || 0;
      const receipts = toOptionalNumber(entry.receipts);

      runningBalance += regularMain - (Number(receipts) || 0);

      return {
        ...entry,
        regularMain,
        receipts,
        netAmount: runningBalance,
      };
    });
}

function normalizeShopData(shops) {
  if (!Array.isArray(shops) || shops.length === 0) {
    return initialShopData;
  }

  return shops.map((shop, index) => ({
    id: shop.id ?? index + 1,
    shopNo: shop.shopNo ?? `Shop ${index + 1}`,
    name: shop.name ?? '',
    contactNo: shop.contactNo ?? '',
    maintenance: shop.maintenance ?? '',
    ledger: recalculateLedger(Array.isArray(shop.ledger) ? shop.ledger : []),
  }));
}

function StorefrontIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M4 10h16l-1.2-5.2A2.3 2.3 0 0 0 16.6 3H7.4a2.3 2.3 0 0 0-2.2 1.8L4 10Z" />
      <path d="M4 10v1a3 3 0 0 0 6 0v-1" />
      <path d="M10 10v1a3 3 0 0 0 6 0v-1" />
      <path d="M16 10v1a3 3 0 0 0 4 2.8" />
      <path d="M5 14v7h14v-7" />
      <path d="M9 21v-4h6v4" />
    </svg>
  );
}

function ReceiptIcon({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d="M6 2h12v20l-3-2-3 2-3-2-3 2V2Z" />
      <path d="M9 7h6" />
      <path d="M9 11h6" />
      <path d="M9 15h4" />
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



function formatValue(value) {
  if (value === '' || value === null || value === undefined) return '--';
  if (typeof value === 'number') {
    return value.toLocaleString('en-IN');
  }
  return value;
}

function BalanceBadge({ value }) {
  const numericValue = Number(value || 0);
  const isOutstanding = numericValue < 0;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 10px',
        borderRadius: 999,
        background: isOutstanding ? 'rgba(180, 35, 24, 0.1)' : 'rgba(196, 155, 79, 0.14)',
        color: isOutstanding ? '#b42318' : '#8a6b2e',
        border: `1px solid ${isOutstanding ? 'rgba(180, 35, 24, 0.18)' : 'rgba(196, 155, 79, 0.24)'}`,
        fontSize: '0.78rem',
        fontWeight: 700,
        whiteSpace: 'nowrap',
      }}
    >
      {isOutstanding ? '⚠️ Outstanding' : '🕒 Pending Balance'}
    </span>
  );
}

function buildYearGroups(ledger) {
  const groups = {};

  ledger.forEach((entry) => {
    const rawMonth = entry.month?.split('-')?.[0] ?? '';
    const yearPart = entry.month?.split('-')?.[1] ?? '';
    if (!rawMonth || !yearPart) return;

    const year = Number(yearPart);
    const monthIndex = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'].indexOf(rawMonth);
    const fyStartYear = monthIndex >= 9 ? year : monthIndex <= 2 ? year - 1 : year;
    const fyLabel = `Apr ${String(fyStartYear).slice(-2)} to Mar ${String(fyStartYear + 1).slice(-2)}`;

    if (!groups[fyLabel]) {
      groups[fyLabel] = [];
    }
    groups[fyLabel].push(entry);
  });

  return Object.entries(groups).map(([year, entries]) => ({
    year,
    entries,
    regularMainTotal: entries.reduce((sum, entry) => sum + (entry.regularMain || 0), 0),
    receiptsTotal: entries.reduce((sum, entry) => sum + (Number(entry.receipts) || 0), 0),
    netTotal: entries.reduce((sum, entry) => sum + (entry.netAmount || 0), 0),
  })).reverse();
}

export default function ShopMaintenanceTracker({ isAdmin = false }) {
  const [shops, setShops] = useState(initialShopData);
  const [activeShopId, setActiveShopId] = useState(1);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedShops, setSelectedShops] = useState([]);
  const [insertMonth, setInsertMonth] = useState('Aug-26');
  const [insertRegularAmount, setInsertRegularAmount] = useState('1500');
  const [insertAmount, setInsertAmount] = useState('');
  const [expandedYears, setExpandedYears] = useState({});
  const [saveStatus, setSaveStatus] = useState(isFirebaseConfigured ? 'idle' : 'local');
  const [saveMessage, setSaveMessage] = useState(isFirebaseConfigured ? 'Ready to sync' : 'Local mode');

  useEffect(() => {
    let cancelled = false;

    async function loadLedger() {
      if (!isFirebaseConfigured || !db) {
        setSaveMessage('Local mode');
        return;
      }

      setSaveStatus('loading');
      setSaveMessage('Loading ledger...');

      try {
        await ensureFirebaseSession();
        const snap = await getDoc(doc(db, SHOP_MAINTENANCE_COLLECTION, SHOP_MAINTENANCE_DOC_ID));
        if (cancelled) return;

        if (snap.exists()) {
          const remoteShops = normalizeShopData(snap.data()?.shops);
          setShops(remoteShops);
          setSaveMessage('Synced from Firebase');
        } else {
          setSaveMessage('Using built-in ledger');
        }
        setSaveStatus('saved');
      } catch (error) {
        if (!cancelled) {
          console.error('Shop maintenance load error:', error);
          setSaveStatus('error');
          setSaveMessage('Firebase load failed');
        }
      }
    }

    loadLedger();

    return () => {
      cancelled = true;
    };
  }, []);

  const saveShopsToFirebase = useCallback(async (nextShops, successMessage = 'Saved') => {
    setSaveStatus('saving');
    setSaveMessage('Saving...');

    if (!isFirebaseConfigured || !db) {
      setSaveStatus('saved');
      setSaveMessage('Saved locally');
      return true;
    }

    try {
      await ensureFirebaseSession();
      await setDoc(
        doc(db, SHOP_MAINTENANCE_COLLECTION, SHOP_MAINTENANCE_DOC_ID),
        {
          shops: normalizeShopData(nextShops),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
      setSaveStatus('saved');
      setSaveMessage(successMessage);
      return true;
    } catch (error) {
      console.error('Shop maintenance save error:', error);
      setSaveStatus('error');
      setSaveMessage('Save failed');
      return false;
    }
  }, []);

  const commitShops = useCallback(async (nextShops, successMessage) => {
    setShops(nextShops);
    return saveShopsToFirebase(nextShops, successMessage);
  }, [saveShopsToFirebase]);

  const overallPending = useMemo(() => {
    return shops.reduce((acc, shop) => {
      const shopTotalReg = shop.ledger.reduce((sum, entry) => sum + (entry.regularMain || 0), 0);
      const shopTotalRec = shop.ledger.reduce((sum, entry) => sum + (Number(entry.receipts) || 0), 0);
      return acc + (shopTotalReg - shopTotalRec);
    }, 0);
  }, [shops]);

  const activeShop = useMemo(() => shops.find((shop) => shop.id === activeShopId) || shops[0], [activeShopId, shops]);
  const latestBalance = activeShop.ledger[activeShop.ledger.length - 1]?.netAmount ?? '';
  const totalRegularMain = activeShop.ledger.reduce((sum, entry) => sum + (entry.regularMain || 0), 0);
  const totalReceipts = activeShop.ledger.reduce((sum, entry) => sum + (Number(entry.receipts) || 0), 0);
  const yearGroups = useMemo(() => buildYearGroups(activeShop.ledger), [activeShop.ledger]);

  useEffect(() => {
    if (yearGroups.length > 0) {
      const latestYear = yearGroups[0].year;
      setExpandedYears(prev => {
        if (prev[latestYear] && Object.keys(prev).length === 1) return prev;
        return { [latestYear]: true };
      });
    }
  }, [activeShopId, yearGroups]);

  const handleInsertSubmit = async (e) => {
    e.preventDefault();
    if (!isAdmin || !insertMonth || selectedShops.length === 0) return;
    
    const parsedRegularAmount = insertRegularAmount === '' ? undefined : Number(insertRegularAmount);
    const parsedReceiptAmount = insertAmount === '' ? undefined : Number(insertAmount);
    const regAmt = Number.isFinite(parsedRegularAmount) ? parsedRegularAmount : undefined;
    const recAmt = Number.isFinite(parsedReceiptAmount) ? parsedReceiptAmount : undefined;

    if (regAmt === undefined && recAmt === undefined) return;

    const nextShops = shops.map(shop => {
        if (!selectedShops.includes(shop.id)) return shop;
        
        const newLedger = [...shop.ledger];
        const monthIndex = newLedger.findIndex(entry => entry.month === insertMonth);
        
        if (monthIndex >= 0) {
          newLedger[monthIndex] = {
            ...newLedger[monthIndex],
            ...(regAmt !== undefined ? { regularMain: regAmt } : {}),
            ...(recAmt !== undefined ? { receipts: recAmt } : {}),
          };
        } else {
          newLedger.push({ 
            month: insertMonth, 
            regularMain: regAmt !== undefined ? regAmt : 1500, 
            receipts: recAmt !== undefined ? recAmt : '', 
            netAmount: 0 
          });
        }
        
        return { ...shop, ledger: recalculateLedger(newLedger) };
    });

    await commitShops(nextShops, 'Receipt saved');
    
    setIsInsertModalOpen(false);
    setSelectedShops([]);
    setInsertAmount('');
  };

  const startEditingEntry = (shopId, entry) => {
    if (!isAdmin) return;

    setEditingEntry({
      shopId,
      originalMonth: entry.month,
      month: entry.month,
      regularMain: String(entry.regularMain ?? ''),
      receipts: entry.receipts === '' || entry.receipts === undefined ? '' : String(entry.receipts),
    });
  };

  const handleEditFieldChange = (field, value) => {
    setEditingEntry((current) => current ? { ...current, [field]: value } : current);
  };

  const handleEditSubmit = async (event) => {
    event.preventDefault();
    if (!isAdmin || !editingEntry) return;

    const regularMain = Number(editingEntry.regularMain);
    const receipts = toOptionalNumber(editingEntry.receipts);

    if (!editingEntry.month || !Number.isFinite(regularMain)) {
      window.alert('Month and monthly maintenance amount are required.');
      return;
    }

    const targetShop = shops.find((shop) => shop.id === editingEntry.shopId);
    const isDuplicateMonth = targetShop?.ledger.some((entry) =>
      entry.month === editingEntry.month && entry.month !== editingEntry.originalMonth
    );

    if (isDuplicateMonth) {
      window.alert(`${editingEntry.month} already exists for this shop.`);
      return;
    }

    const nextShops = shops.map((shop) => {
      if (shop.id !== editingEntry.shopId) return shop;

      const nextLedger = shop.ledger.map((entry) =>
        entry.month === editingEntry.originalMonth
          ? {
              ...entry,
              month: editingEntry.month,
              regularMain,
              receipts,
            }
          : entry
      );

      return { ...shop, ledger: recalculateLedger(nextLedger) };
    });

    await commitShops(nextShops, 'Ledger row saved');
    setEditingEntry(null);
  };

  const handleDeleteEntry = async (shopId, month) => {
    if (!isAdmin) return;

    if (!window.confirm(`Delete ${month} from this shop ledger?`)) {
      return;
    }

    const nextShops = shops.map((shop) => {
      if (shop.id !== shopId) return shop;
      return {
        ...shop,
        ledger: recalculateLedger(shop.ledger.filter((entry) => entry.month !== month)),
      };
    });

    await commitShops(nextShops, 'Ledger row deleted');
  };

  const handlePrintShopPDF = useCallback(() => {
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const pendingAmount = totalRegularMain - totalReceipts;

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Shop Maintenance Statement - ${activeShop.shopNo} - Majestique Euriska</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 19px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .shop-banner {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 10px;
            padding: 12px 16px;
            margin-bottom: 16px;
            display: flex;
            justify-content: space-between;
            align-items: center;
          }
          .shop-title { font-size: 16px; font-weight: 800; color: #0f172a; }
          .shop-owner { font-size: 13px; color: #334155; margin-top: 2px; }

          .kpi-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 10px;
            margin-bottom: 16px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 14px;
            text-align: center;
          }
          .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }

          .rate-slabs {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 10px;
            color: #92400e;
            margin-bottom: 14px;
          }

          .fy-heading {
            font-size: 12px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #1e293b;
            margin: 14px 0 6px 0;
            display: flex;
            justify-content: space-between;
          }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: right; padding: 6px 8px; border: 1px solid #94a3b8; font-size: 10px; }
          th:first-child { text-align: left; }
          td { padding: 6px 8px; border: 1px solid #cbd5e1; color: #0f172a; text-align: right; }
          td:first-child { text-align: left; }
          tr:nth-child(even) { background: #f8fafc; }
          .subtotal-row { background: #e2e8f0 !important; font-weight: 700; }

          .signatures { margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding-top: 14px; border-top: 1px dashed #cbd5e1; }
          .sig-box { text-align: center; font-size: 11px; color: #475569; }
          .sig-line { margin-top: 36px; border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 600; }

          .footer {
            margin-top: 20px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A4 portrait; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🏪 MAJESTIQUE EURISKA CO-OP HOUSING SOCIETY</h1>
            <div class="subtitle">Commercial Wing • Shop Maintenance Account Ledger Statement</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${generatedDate}</div>
            <div><strong>Shop:</strong> ${activeShop.shopNo} • ${activeShop.name}</div>
          </div>
        </div>

        <div class="shop-banner">
          <div>
            <div class="shop-title">${activeShop.shopNo} — ${activeShop.name}</div>
            <div class="shop-owner">Contact Number: <strong>${activeShop.contactNo || 'N/A'}</strong></div>
          </div>
          <div style="text-align: right;">
            <span style="display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 11px; font-weight: 700; background: ${pendingAmount > 0 ? '#fee2e2' : '#d1fae5'}; color: ${pendingAmount > 0 ? '#991b1b' : '#065f46'}; border: 1px solid ${pendingAmount > 0 ? '#fca5a5' : '#86efac'};">
              ${pendingAmount > 0 ? `⚠️ Outstanding: ₹${formatValue(pendingAmount)}` : '✓ All Paid / Nil Balance'}
            </span>
          </div>
        </div>

        <div class="rate-slabs">
          <strong>Official Society Rate Slabs:</strong> Oct 2021 – Jun 2024: <strong>₹1,100 / month</strong> (33 months) • Jul 2024 – Current: <strong>₹1,500 / month</strong>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Total Maintenance Billed</div>
            <div class="kpi-value" style="color: #0369a1;">₹${formatValue(totalRegularMain)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Receipts Received</div>
            <div class="kpi-value" style="color: #15803d;">₹${formatValue(totalReceipts)}</div>
          </div>
          <div class="kpi-card" style="background: ${pendingAmount > 0 ? '#fef2f2' : '#f0fdf4'}; border-color: ${pendingAmount > 0 ? '#fca5a5' : '#86efac'};">
            <div class="kpi-label" style="color: ${pendingAmount > 0 ? '#991b1b' : '#15803d'};">Pending Balance</div>
            <div class="kpi-value" style="color: ${pendingAmount > 0 ? '#991b1b' : '#15803d'};">₹${formatValue(pendingAmount)}</div>
          </div>
        </div>

        ${yearGroups.map(yg => `
          <div class="fy-heading">
            <span>Financial Year: ${yg.year}</span>
            <span style="font-size: 10px; font-weight: normal; color: #64748b;">Subtotal Due: ₹${formatValue(yg.regularMainTotal)} | Received: ₹${formatValue(yg.receiptsTotal)}</span>
          </div>
          <table>
            <thead>
              <tr>
                <th style="width: 140px;">Month</th>
                <th>Regular Maintenance (₹)</th>
                <th>Receipt Amount (₹)</th>
                <th>Net Balance (₹)</th>
              </tr>
            </thead>
            <tbody>
              ${yg.entries.map(e => `
                <tr>
                  <td style="font-weight: 600;">${e.month}</td>
                  <td>₹${formatValue(e.regularMain)}</td>
                  <td style="${Number(e.receipts) > 0 ? 'font-weight: 700; color: #15803d;' : 'color: #94a3b8;'}">
                    ${Number(e.receipts) > 0 ? `₹${formatValue(e.receipts)}` : '—'}
                  </td>
                  <td style="font-weight: 700; color: ${e.netAmount > 0 ? '#991b1b' : '#15803d'};">
                    ₹${formatValue(e.netAmount)}
                  </td>
                </tr>
              `).join('')}
              <tr class="subtotal-row">
                <td>FY Subtotal</td>
                <td>₹${formatValue(yg.regularMainTotal)}</td>
                <td style="color: #15803d;">₹${formatValue(yg.receiptsTotal)}</td>
                <td>—</td>
              </tr>
            </tbody>
          </table>
        `).join('')}

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Shop Owner / Representative</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Commercial Wing Coordinator</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Treasurer / Chairman</div>
          </div>
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society Ltd. • Shop Maintenance Ledger</div>
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
      printWindow.document.write(printDoc);
      printWindow.document.close();
    }
  }, [activeShop, totalRegularMain, totalReceipts, yearGroups]);

  const handlePrintAllShopsPDF = useCallback(() => {
    const generatedDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    const totalBilledAll = shops.reduce((acc, s) => acc + s.ledger.reduce((sum, e) => sum + (e.regularMain || 0), 0), 0);
    const totalPaidAll = shops.reduce((acc, s) => acc + s.ledger.reduce((sum, e) => sum + (Number(e.receipts) || 0), 0), 0);
    const totalPendingAll = totalBilledAll - totalPaidAll;

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Shop Maintenance Portfolio Summary - Majestique Euriska</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 24px; color: #0f172a; background: #ffffff; }
          .header { border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end; }
          .title { font-size: 19px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { font-size: 13px; color: #475569; margin-top: 4px; }
          .meta { font-size: 11px; color: #475569; text-align: right; }
          
          .kpi-row {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 12px;
            margin-bottom: 16px;
          }
          .kpi-card {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 14px;
            text-align: center;
          }
          .kpi-label { font-size: 10px; text-transform: uppercase; color: #64748b; font-weight: 700; }
          .kpi-value { font-size: 16px; font-weight: 800; color: #0f172a; margin-top: 2px; }

          .rate-slabs {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 6px;
            padding: 8px 12px;
            font-size: 10px;
            color: #92400e;
            margin-bottom: 14px;
          }
          
          table { width: 100%; border-collapse: collapse; font-size: 11px; margin-bottom: 14px; }
          th { background: #f1f5f9; color: #1e293b; font-weight: 700; text-align: right; padding: 7px 10px; border: 1px solid #94a3b8; font-size: 10px; }
          th:first-child, th:nth-child(2), th:nth-child(3) { text-align: left; }
          td { padding: 7px 10px; border: 1px solid #cbd5e1; color: #0f172a; text-align: right; }
          td:first-child, td:nth-child(2), td:nth-child(3) { text-align: left; }
          tr:nth-child(even) { background: #f8fafc; }
          .total-row { background: #e2e8f0 !important; font-weight: 800; }

          .signatures { margin-top: 30px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; padding-top: 14px; border-top: 1px dashed #cbd5e1; }
          .sig-box { text-align: center; font-size: 11px; color: #475569; }
          .sig-line { margin-top: 36px; border-top: 1px solid #94a3b8; padding-top: 4px; font-weight: 600; }

          .footer {
            margin-top: 20px;
            border-top: 1px solid #cbd5e1;
            padding-top: 8px;
            font-size: 10px;
            color: #64748b;
            display: flex;
            justify-content: space-between;
          }
          
          @media print {
            body { padding: 0; }
            @page { margin: 1cm; size: A4 portrait; }
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1 class="title">🏪 MAJESTIQUE EURISKA CO-OP HOUSING SOCIETY</h1>
            <div class="subtitle">Commercial Wing • All Shops Maintenance Portfolio Summary (Shop 1–8)</div>
          </div>
          <div class="meta">
            <div><strong>Report Date:</strong> ${generatedDate}</div>
            <div><strong>Total Commercial Units:</strong> 8 Shops</div>
          </div>
        </div>

        <div class="kpi-row">
          <div class="kpi-card">
            <div class="kpi-label">Total Society Billed</div>
            <div class="kpi-value" style="color: #0369a1;">₹${formatValue(totalBilledAll)}</div>
          </div>
          <div class="kpi-card">
            <div class="kpi-label">Total Collections Received</div>
            <div class="kpi-value" style="color: #15803d;">₹${formatValue(totalPaidAll)}</div>
          </div>
          <div class="kpi-card" style="background: ${totalPendingAll > 0 ? '#fef2f2' : '#f0fdf4'}; border-color: ${totalPendingAll > 0 ? '#fca5a5' : '#86efac'};">
            <div class="kpi-label" style="color: ${totalPendingAll > 0 ? '#991b1b' : '#15803d'};">Overall Pending Balance</div>
            <div class="kpi-value" style="color: ${totalPendingAll > 0 ? '#991b1b' : '#15803d'};">₹${formatValue(totalPendingAll)}</div>
          </div>
        </div>

        <div class="rate-slabs">
          <strong>Commercial Rate Structure:</strong> Oct 2021 – Jun 2024: <strong>₹1,100 / mo</strong> • Jul 2024 – Current: <strong>₹1,500 / mo</strong>
        </div>

        <table>
          <thead>
            <tr>
              <th style="width: 70px;">Shop #</th>
              <th>Owner / Business Name</th>
              <th>Contact No</th>
              <th>Total Billed (₹)</th>
              <th>Total Paid (₹)</th>
              <th>Pending Balance (₹)</th>
              <th style="text-align: center; width: 100px;">Status</th>
            </tr>
          </thead>
          <tbody>
            ${shops.map(s => {
              const shopBilled = s.ledger.reduce((sum, e) => sum + (e.regularMain || 0), 0);
              const shopPaid = s.ledger.reduce((sum, e) => sum + (Number(e.receipts) || 0), 0);
              const shopPending = shopBilled - shopPaid;
              const isCleared = shopPending <= 0;

              return `
                <tr>
                  <td style="font-weight: 700;">${s.shopNo}</td>
                  <td>${s.name || '—'}</td>
                  <td>${s.contactNo || '—'}</td>
                  <td>₹${formatValue(shopBilled)}</td>
                  <td style="color: #15803d; font-weight: 600;">₹${formatValue(shopPaid)}</td>
                  <td style="font-weight: 700; color: ${shopPending > 0 ? '#991b1b' : '#15803d'};">₹${formatValue(shopPending)}</td>
                  <td style="text-align: center;">
                    <span style="display: inline-block; padding: 2px 7px; border-radius: 999px; font-size: 9px; font-weight: 700; background: ${isCleared ? '#d1fae5' : '#fee2e2'}; color: ${isCleared ? '#065f46' : '#991b1b'};">
                      ${isCleared ? '✓ Cleared' : '⚠️ Pending'}
                    </span>
                  </td>
                </tr>
              `;
            }).join('')}
            <tr class="total-row">
              <td colspan="3" style="text-align: left;">Grand Total (All 8 Shops)</td>
              <td>₹${formatValue(totalBilledAll)}</td>
              <td style="color: #15803d;">₹${formatValue(totalPaidAll)}</td>
              <td style="color: #991b1b; font-size: 12px;">₹${formatValue(totalPendingAll)}</td>
              <td style="text-align: center;">—</td>
            </tr>
          </tbody>
        </table>

        <div class="signatures">
          <div class="sig-box">
            <div class="sig-line">Prepared By (Manager)</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Commercial Wing Coordinator</div>
          </div>
          <div class="sig-box">
            <div class="sig-line">Society Treasurer / Chairman</div>
          </div>
        </div>

        <div class="footer">
          <div>Majestique Euriska Co-Op Housing Society Ltd. • Master Commercial Ledger</div>
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
      printWindow.document.write(printDoc);
      printWindow.document.close();
    }
  }, [shops]);

  const toggleShopSelection = (shopId) => {
    setSelectedShops(prev => 
      prev.includes(shopId) ? prev.filter(id => id !== shopId) : [...prev, shopId]
    );
  };

  const saveTone =
    saveStatus === 'error'
      ? '#fee4e2'
      : saveStatus === 'saving' || saveStatus === 'loading'
        ? '#fef0c7'
        : 'rgba(209, 250, 229, 0.18)';

  const saveTextTone =
    saveStatus === 'error'
      ? '#b42318'
      : saveStatus === 'saving' || saveStatus === 'loading'
        ? '#92400e'
        : '#d1fadf';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: 'Inter, system-ui, sans-serif' }}>
      <div style={{
        background: 'linear-gradient(135deg, #0b2b26 0%, #196c6c 100%)',
        borderRadius: 20,
        padding: '20px 24px',
        color: '#fff',
        boxShadow: '0 6px 28px rgba(11,43,38,0.22)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16
      }}>
        <div>
          <p style={{ margin: 0, fontSize: '0.68rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', color: '#c49b4f' }}>🏬 Shop Maintenance</p>
          <h2 style={{ margin: '6px 0 8px', fontSize: '1.35rem', fontWeight: 800 }}>🏪 Shop Maintenance Ledger</h2>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.72)', fontSize: '0.9rem' }}>Monthly maintenance details, receipts, and balance movement for each shop.</p>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 12 }}>
          <div style={{ padding: '6px 10px', borderRadius: 999, background: saveTone, color: saveTextTone, fontSize: '0.74rem', fontWeight: 800, border: '1px solid rgba(255,255,255,0.24)' }}>
            {saveMessage}
          </div>

          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.1)', padding: '10px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.2)', textAlign: 'right' }}>
              <div style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'rgba(255,255,255,0.8)', fontWeight: 600 }}>Overall Pending (Shop 1-8)</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, marginTop: 2, color: overallPending > 0 ? '#fec84b' : '#34d399' }}>{formatValue(overallPending)}</div>
            </div>

            <button
              onClick={handlePrintAllShopsPDF}
              style={{
                padding: '9px 16px',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.15)',
                color: '#fff',
                border: '1px solid rgba(255,255,255,0.3)',
                fontWeight: 700,
                cursor: 'pointer',
                fontSize: '0.85rem',
                backdropFilter: 'blur(6px)',
                transition: 'all 0.2s ease'
              }}
            >
              🖨️ Print Summary (All Shops)
            </button>
          </div>

          {isAdmin ? (
            <button
              onClick={() => setIsInsertModalOpen(true)}
              style={{ padding: '8px 16px', borderRadius: 8, background: '#c49b4f', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(196,155,79,0.3)' }}
            >
              + Add Shop Maintenance
            </button>
          ) : (
            <span style={{ padding: '8px 12px', borderRadius: 8, background: 'rgba(255,255,255,0.12)', color: 'rgba(255,255,255,0.82)', border: '1px solid rgba(255,255,255,0.2)', fontWeight: 700, fontSize: '0.78rem' }}>
              Read-only view
            </span>
          )}
        </div>
      </div>

      <div style={{ padding: '12px 18px', borderRadius: '12px', background: 'rgba(196, 155, 79, 0.07)', border: '1px solid rgba(196, 155, 79, 0.2)', display: 'flex', flexWrap: 'wrap', gap: '12px', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontSize: '0.76rem', fontWeight: 800, color: 'rgb(120, 64, 14)' }}>📋 Rate Slabs:</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'rgb(95, 102, 95)' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: 'rgb(196, 155, 79)' }}></span>
          <b>Oct 2021 – Jun 2024</b>: ₹1,100 / month (33 months)
        </span>
        <span style={{ color: 'rgba(61, 63, 52, 0.25)' }}>|</span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.76rem', color: 'rgb(95, 102, 95)' }}>
          <span style={{ display: 'inline-block', width: '10px', height: '10px', borderRadius: '3px', background: 'rgb(147, 197, 253)' }}></span>
          <b>Jul 2024 – till Now </b>: ₹1,500 / month (25 months)
        </span>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {shops.map((shop) => (
          <button
            key={shop.id}
            type="button"
            onClick={() => setActiveShopId(shop.id)}
            style={{
              border: activeShopId === shop.id ? '1px solid #0b2b26' : '1px solid #d0d5dd',
              borderRadius: 999,
              padding: '10px 14px',
              background: activeShopId === shop.id ? '#0b2b26' : '#f8fafc',
              color: activeShopId === shop.id ? '#fff' : '#344054',
              fontWeight: 700,
              cursor: 'pointer',
              boxShadow: activeShopId === shop.id ? '0 6px 16px rgba(11,43,38,0.16)' : 'none',
              transition: 'all 0.2s ease',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <span>{activeShopId === shop.id ? '🏪' : '🧾'}</span>
            <span>{shop.shopNo}</span>
          </button>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 18, padding: 20, border: '1px solid rgba(61,63,52,0.08)', boxShadow: '0 8px 24px rgba(16,24,40,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12, marginBottom: 16, padding: '14px 16px', borderRadius: 14, background: 'linear-gradient(135deg, rgba(244,239,231,0.95), rgba(255,250,242,0.95))', border: '1px solid rgba(61,63,52,0.08)' }}>
          <div>
            <p style={{ margin: 0, fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#667085' }}>Active Shop</p>
            <h3 style={{ margin: '4px 0 0', fontSize: '1.15rem', fontWeight: 800 }}>{activeShop.shopNo}</h3>
            <p style={{ margin: '4px 0 0', color: '#667085', fontSize: '0.9rem' }}>{activeShop.name}</p>
          </div>
          <button
            onClick={handlePrintShopPDF}
            style={{
              padding: '8px 16px',
              borderRadius: 8,
              background: '#0b2b26',
              color: '#fff',
              border: 'none',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              fontSize: '0.85rem',
              boxShadow: '0 4px 12px rgba(11,43,38,0.18)'
            }}
          >
            🖨️ Print {activeShop.shopNo} Statement (PDF)
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 16 }}>
          {[
            { label: '📞 Contact No', value: formatValue(activeShop.contactNo), sub: 'Owner Contact', accent: '#0b2b26' },
            { label: '🧾 Monthly Maintenance Total', value: formatValue(totalRegularMain), sub: 'Total Due', accent: '#196c6c' },
            { label: '📥 Receipts Total', value: formatValue(totalReceipts), sub: 'Till July 2026', accent: '#065f46' },
            { label: 'Remaining Balance', value: formatValue(totalRegularMain - totalReceipts), sub: 'Overall Pending', accent: '#991b1b' },
          ].map(c => (
            <div key={c.label} style={{
              background: 'rgba(255,250,242,0.97)', border: '1px solid rgba(61,63,52,0.1)',
              borderRadius: 14, padding: '16px 18px',
              boxShadow: '0 2px 10px rgba(11,43,38,0.06)',
            }}>
              <div style={{ fontSize: '0.64rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#5f665f', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontSize: '1.3rem', fontWeight: 800, color: c.accent, lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: '0.7rem', color: '#8a9080', marginTop: 5 }}>{c.sub}</div>
              {c.label === '📥 Receipts Total' && activeShop.ledger.some((entry) => Number(entry.receipts) > 0) && (
                <div style={{ marginTop: 6, fontSize: '0.75rem', color: '#8a4b0f', fontWeight: 600, lineHeight: 1.5 }}>
                  {activeShop.ledger
                    .filter((entry) => Number(entry.receipts) > 0)
                    .map((entry) => `${entry.month}: ${formatValue(entry.receipts)}`)
                    .join(' • ')}
                </div>
              )}
            </div>
          ))}
        </div>

        <div style={{ marginTop: 4, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ padding: '12px 14px', background: '#f8fafc', border: '1px solid rgba(61,63,52,0.08)', borderRadius: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ fontSize: '0.78rem', fontWeight: 800, color: '#344054', textTransform: 'uppercase', letterSpacing: '0.06em' }}>📋 Monthly Ledger</div>
            <span style={{ fontSize: '0.74rem', color: '#667085', fontWeight: 700 }}>Year-wise view • grouped by financial year</span>
          </div>

          {yearGroups.map((group) => {
            const isExpanded = expandedYears[group.year];
            return (
              <div key={group.year} style={{ borderRadius: 14, border: '1px solid rgba(61,63,52,0.1)', overflow: 'hidden', background: '#fff' }}>
                <div 
                  onClick={() => setExpandedYears(prev => ({ ...prev, [group.year]: !prev[group.year] }))}
                  style={{ cursor: 'pointer', padding: '12px 14px', background: 'rgba(244,239,231,0.3)', borderBottom: isExpanded ? '1px solid rgba(61,63,52,0.08)' : 'none', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}
                >
                  <div>
                    <div style={{ fontSize: '0.72rem', fontWeight: 800, color: '#8a6b2e', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Financial year</div>
                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#101828' }}>{group.year}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '6px 10px', borderRadius: 999, background: '#f2f4f7', color: '#344054', fontSize: '0.74rem', fontWeight: 700 }}>Yearly Maintenance: {formatValue(group.regularMainTotal)}</span>
                    {group.receiptsTotal > 0 && (
                      <span style={{ padding: '6px 10px', borderRadius: 999, background: 'rgba(16, 185, 129, 0.1)', color: '#047857', fontSize: '0.74rem', fontWeight: 700 }}>Receipts: {formatValue(group.receiptsTotal)}</span>
                    )}
                    <span style={{ fontSize: '1.2rem', color: '#8a6b2e', marginLeft: 4, transform: isExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
                  </div>
                </div>
                
                {isExpanded && (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr>
                          <th style={{ padding: '11px 16px', borderBottom: '2px solid rgba(61,63,52,0.1)', color: '#5f665f', fontWeight: 700, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', background: 'rgba(244,239,231,0.7)', textAlign: 'left' }}>Month</th>
                          <th style={{ padding: '11px 16px', borderBottom: '2px solid rgba(61,63,52,0.1)', color: '#5f665f', fontWeight: 700, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', background: 'rgba(244,239,231,0.7)', textAlign: 'left' }}>Monthly Maintenance</th>
                          <th style={{ padding: '11px 16px', borderBottom: '2px solid rgba(61,63,52,0.1)', color: '#5f665f', fontWeight: 700, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', background: 'rgba(244,239,231,0.7)', textAlign: 'left' }}>Receipts</th>
                          {isAdmin && (
                            <th style={{ padding: '11px 16px', borderBottom: '2px solid rgba(61,63,52,0.1)', color: '#5f665f', fontWeight: 700, fontSize: '0.66rem', textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', background: 'rgba(244,239,231,0.7)', textAlign: 'right' }}>Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {group.entries.map((entry) => (
                          <tr key={entry.month} style={{ background: 'rgba(209, 250, 229, 0.1)' }}>
                            <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid rgba(61,63,52,0.05)' }}>{entry.month}</td>
                            <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid rgba(61,63,52,0.05)' }}>{formatValue(entry.regularMain)}</td>
                            <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid rgba(61,63,52,0.05)' }}>
                              <span style={{
                                padding: entry.receipts ? '4px 8px' : '0',
                                borderRadius: '4px',
                                background: entry.receipts ? '#ecfdf3' : 'transparent',
                                color: entry.receipts ? '#027a48' : 'inherit',
                                fontWeight: entry.receipts ? 600 : 'normal',
                                display: 'inline-block'
                              }}>
                                {formatValue(entry.receipts)}
                              </span>
                            </td>
                            {isAdmin && (
                              <td style={{ padding: '13px 16px', verticalAlign: 'middle', borderBottom: '1px solid rgba(61,63,52,0.05)', textAlign: 'right' }}>
                                <div style={{ display: 'inline-flex', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
                                  <button
                                    type="button"
                                    onClick={() => startEditingEntry(activeShop.id, entry)}
                                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #0b2b26', background: '#fff', color: '#0b2b26', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(activeShop.id, entry.month)}
                                    style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #fecdca', background: '#fff5f4', color: '#b42318', fontWeight: 800, cursor: 'pointer', fontSize: '0.75rem' }}
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {isAdmin && isInsertModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#101828' }}>Add Shop Maintenance</h3>
            <form onSubmit={handleInsertSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 8 }}>Select Shops</label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {shops.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleShopSelection(s.id)}
                      style={{
                        padding: '4px 10px', borderRadius: 20, fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
                        border: selectedShops.includes(s.id) ? '1px solid #0b2b26' : '1px solid #d0d5dd',
                        background: selectedShops.includes(s.id) ? '#0b2b26' : '#fff',
                        color: selectedShops.includes(s.id) ? '#fff' : '#344054',
                      }}
                    >
                      {s.shopNo}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Month</label>
                <input 
                  type="text" 
                  value={insertMonth} 
                  onChange={(e) => setInsertMonth(e.target.value)} 
                  placeholder="e.g. Aug-26"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Monthly Maintenance Amount</label>
                <input 
                  type="number" 
                  value={insertRegularAmount} 
                  onChange={(e) => setInsertRegularAmount(e.target.value)} 
                  placeholder="e.g. 1500"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Receipt Amount (Optional)</label>
                <input 
                  type="number" 
                  value={insertAmount} 
                  onChange={(e) => setInsertAmount(e.target.value)} 
                  placeholder="e.g. 1500"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button 
                  type="button" 
                  onClick={() => setIsInsertModalOpen(false)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#fff', border: '1px solid #d0d5dd', color: '#344054', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0b2b26', border: 'none', color: '#fff', fontWeight: 600, cursor: saveStatus === 'saving' ? 'wait' : 'pointer', opacity: saveStatus === 'saving' ? 0.72 : 1 }}
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Receipts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && editingEntry && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 9999, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', paddingTop: '10vh' }}>
          <div style={{ background: '#fff', borderRadius: 12, padding: 24, width: '100%', maxWidth: 400, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: '1.2rem', color: '#101828' }}>Edit Shop Maintenance</h3>
            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Month</label>
                <input
                  type="text"
                  value={editingEntry.month}
                  onChange={(event) => handleEditFieldChange('month', event.target.value)}
                  placeholder="e.g. Aug-26"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Monthly Maintenance Amount</label>
                <input
                  type="number"
                  value={editingEntry.regularMain}
                  onChange={(event) => handleEditFieldChange('regularMain', event.target.value)}
                  placeholder="e.g. 1500"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#344054', marginBottom: 4 }}>Receipt Amount</label>
                <input
                  type="number"
                  value={editingEntry.receipts}
                  onChange={(event) => handleEditFieldChange('receipts', event.target.value)}
                  placeholder="e.g. 1500"
                  style={{ width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid #d0d5dd', fontSize: '0.9rem' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#fff', border: '1px solid #d0d5dd', color: '#344054', fontWeight: 600, cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  style={{ flex: 1, padding: '10px', borderRadius: 8, background: '#0b2b26', border: 'none', color: '#fff', fontWeight: 600, cursor: saveStatus === 'saving' ? 'wait' : 'pointer', opacity: saveStatus === 'saving' ? 0.72 : 1 }}
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
