import { useCallback, useMemo, useState, useEffect } from 'react';
import { doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase.js';
import {
  initialShopData,
  normalizeShopData,
  recalculateLedger,
  autoPopulateLedgerToCurrentMonth,
  parseLedgerMonth,
  toOptionalNumber,
  MONTH_ORDER
} from '../../data/shopSeedData.js';
import './ShopMaintenanceTracker.css';


const SHOP_MAINTENANCE_COLLECTION = 'shopMaintenance';
const SHOP_MAINTENANCE_DOC_ID = 'shop_maintenance_ledger';

export function getCurrentMonthStr(d = new Date()) {
  const monthName = MONTH_ORDER[d.getMonth()];
  const yearStr = String(d.getFullYear()).slice(-2);
  return `${monthName}-${yearStr}`;
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
      className={`shop-maintenance-tracker-s1 ${(isOutstanding ? 'shop-maintenance-tracker-cond-1-true' : 'shop-maintenance-tracker-cond-2-false')}`} style={{ border: `1px solid ${isOutstanding ? 'rgba(180, 35, 24, 0.18)' : 'rgba(196, 155, 79, 0.24)'}` }}
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

function getTodayISODate() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function getFutureISODate(days = 7) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function formatDisplayDate(isoDate) {
  if (!isoDate) return '';
  const [y, m, d] = isoDate.split('-').map(Number);
  if (!y || !m || !d) return isoDate;
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function ShopMaintenanceTracker({ isAdmin = false }) {
  const [shops, setShops] = useState(initialShopData);
  const [activeShopId, setActiveShopId] = useState(1);
  const [isInsertModalOpen, setIsInsertModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [selectedShops, setSelectedShops] = useState([]);
  const [insertMonth, setInsertMonth] = useState(() => getCurrentMonthStr());
  const [insertRegularAmount, setInsertRegularAmount] = useState('1500');
  const [insertAmount, setInsertAmount] = useState('');
  const [expandedYears, setExpandedYears] = useState({});
  const [saveStatus, setSaveStatus] = useState(isFirebaseConfigured ? 'idle' : 'local');
  const [saveMessage, setSaveMessage] = useState(isFirebaseConfigured ? 'Ready to sync' : 'Local mode');

  // Notice & Invoice Generator States
  const [isNoticeModalOpen, setIsNoticeModalOpen] = useState(false);
  const [noticeDocType, setNoticeDocType] = useState('invoice'); // 'invoice' | 'notice'
  const [noticeTarget, setNoticeTarget] = useState('single'); // 'single' | 'all_pending' | 'all'
  const [noticeShopId, setNoticeShopId] = useState(1);
  const [noticeDate, setNoticeDate] = useState(getTodayISODate);
  const [noticeDueDate, setNoticeDueDate] = useState(() => getFutureISODate(7));
  const [noticeRefPrefix, setNoticeRefPrefix] = useState('INV-ME/COMM/2026-27/');
  const [noticeCustomNote, setNoticeCustomNote] = useState(
    'As per Society Bye-laws and Resolution passed in AGM dated 06.09.2026, all shop owners are requested to clear their monthly maintenance dues. Payments beyond the due date attract interest as per applicable society rules.'
  );
  const [noticeToast, setNoticeToast] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function loadLedger() {
      if (!isFirebaseConfigured || !db) {
        setSaveMessage('Local mode (Auto-billed to ' + getCurrentMonthStr() + ')');
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
          
          const rawCount = snap.data()?.shops?.[0]?.ledger?.length || 0;
          const updatedCount = remoteShops[0]?.ledger?.length || 0;
          if (isAdmin && updatedCount > rawCount) {
            await setDoc(
              doc(db, SHOP_MAINTENANCE_COLLECTION, SHOP_MAINTENANCE_DOC_ID),
              { shops: remoteShops, updatedAt: serverTimestamp() },
              { merge: true }
            );
            setSaveMessage(`Auto-billed & saved to server up to ${getCurrentMonthStr()}`);
          } else {
            setSaveMessage(`Synced & auto-billed to ${getCurrentMonthStr()}`);
          }
        } else {
          const freshShops = normalizeShopData(initialShopData);
          setShops(freshShops);
          if (isAdmin) {
            await setDoc(
              doc(db, SHOP_MAINTENANCE_COLLECTION, SHOP_MAINTENANCE_DOC_ID),
              { shops: freshShops, updatedAt: serverTimestamp() },
              { merge: true }
            );
            setSaveMessage(`Initialized & saved on server (${getCurrentMonthStr()})`);
          } else {
            setSaveMessage(`Auto-billed up to ${getCurrentMonthStr()}`);
          }
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

  const handleAutoSyncDueMonths = useCallback(async () => {
    const updatedShops = normalizeShopData(shops);
    await commitShops(updatedShops, `All shop maintenance auto-billed up to ${getCurrentMonthStr()}`);
  }, [shops, commitShops]);

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
            <h1 class="title">🏪 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Commercial Wing • Shop Maintenance Account Ledger Statement</div>
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
            <h1 class="title">🏪 MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</h1>
            <div class="subtitle">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div style="font-size: 11px; color: #64748b; margin-top: 2px;">Commercial Wing • All Shops Maintenance Portfolio Summary (Shop 1–8)</div>
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

  const getShopNoticeData = useCallback((shop) => {
    const shopBilled = shop.ledger.reduce((sum, e) => sum + (e.regularMain || 0), 0);
    const shopPaid = shop.ledger.reduce((sum, e) => sum + (Number(e.receipts) || 0), 0);
    const shopPending = shopBilled - shopPaid;
    return {
      id: shop.id,
      shopNo: shop.shopNo,
      name: shop.name || 'Owner / Occupant',
      contactNo: shop.contactNo || '',
      billed: shopBilled,
      paid: shopPaid,
      pending: shopPending,
      isCleared: shopPending <= 0
    };
  }, []);

  const shopsForNotice = useMemo(() => {
    if (noticeTarget === 'single') {
      const s = shops.find(item => item.id === noticeShopId) || shops[0];
      return [s];
    }
    if (noticeTarget === 'all_pending') {
      return shops.filter(s => {
        const data = getShopNoticeData(s);
        return data.pending > 0;
      });
    }
    return shops;
  }, [noticeTarget, noticeShopId, shops, getShopNoticeData]);

  const handlePrintNotices = useCallback(() => {
    const targetShops = shopsForNotice;
    if (targetShops.length === 0) {
      window.alert('No shops selected for document generation.');
      return;
    }

    const isInvoice = noticeDocType === 'invoice';
    const formattedNoticeDate = formatDisplayDate(noticeDate);
    const formattedDueDate = formatDisplayDate(noticeDueDate);

    const pagesHtml = targetShops.map((s, idx) => {
      const data = getShopNoticeData(s);
      const refNo = `${noticeRefPrefix}${String(s.id).padStart(2, '0')}`;
      const docBadgeTitle = isInvoice
        ? 'COMMERCIAL WING • MAINTENANCE BILL / TAX INVOICE'
        : 'COMMERCIAL WING • FORMAL DEMAND NOTICE';
      const subjectText = isInvoice
        ? 'COMMERCIAL SHOP MAINTENANCE BILL & CHARGES STATEMENT'
        : 'FORMAL NOTICE FOR PAYMENT OF OUTSTANDING COMMERCIAL MAINTENANCE DUES';

      return `
        <div class="notice-page">
          <div class="header">
            <div class="society-title">MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.</div>
            <div class="society-reg">Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • S. No. 2, Plot No C-1, Village Mohammed Wadi, Taluka Haveli, Pune - 411060</div>
            <div class="doc-badge">${docBadgeTitle}</div>
          </div>

          <div class="ref-row">
            <div><strong>${isInvoice ? 'Invoice / Bill No' : 'Ref No'}:</strong> ${refNo}</div>
            <div><strong>${isInvoice ? 'Invoice Date' : 'Notice Date'}:</strong> ${formattedNoticeDate}</div>
          </div>

          <div class="recipient-box">
            <div style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; margin-bottom: 2px;">${isInvoice ? 'Billed To (Unit Owner / Occupant):' : 'To,'}</div>
            <div style="font-size: 14px; font-weight: 800; color: #0f172a;">${data.name}</div>
            <div style="font-size: 13px; font-weight: 700; color: #0b2b26;">Unit / Shop: ${data.shopNo}</div>
            <div style="font-size: 12px; color: #475569;">Majestique Euriska Commercial Complex, Mohammed Wadi, Pune - 411060</div>
            <div style="font-size: 12px; color: #475569;">Contact No: <strong>${data.contactNo || 'N/A'}</strong></div>
          </div>

          <div class="subject-line">
            <strong>SUBJECT:</strong> ${subjectText}
          </div>

          <div class="body-text">
            <p>Dear ${data.name || 'Member'},</p>
            <p>
              ${isInvoice
                ? `Please find below the official maintenance invoice for commercial unit <strong>${data.shopNo}</strong> in Majestique Euriska 'A' Building Co-operative Housing Society Ltd.`
                : `This is to formally bring to your attention the outstanding monthly maintenance charges due towards your commercial unit <strong>${data.shopNo}</strong> in Majestique Euriska 'A' Building Co-operative Housing Society Ltd.`}
            </p>
            <p>
              As per the society's official accounting records and rate schedule (Oct 2021 – Jun 2024 @ ₹1,100/mo and Jul 2024 – Current @ ₹1,500/mo), the summary of maintenance charges billed and payments received against your unit is as follows:
            </p>
          </div>

          <table class="dues-table">
            <thead>
              <tr>
                <th>Description / Particulars</th>
                <th style="text-align: right; width: 140px;">Amount (₹)</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Total Maintenance Demand Billed (Oct 2021 to Current)</td>
                <td style="text-align: right; font-weight: 600;">₹${formatValue(data.billed)}</td>
              </tr>
              <tr>
                <td>Total Receipts / Payments Credited</td>
                <td style="text-align: right; color: #166534; font-weight: 600;">(-) ₹${formatValue(data.paid)}</td>
              </tr>
              <tr class="highlight-row">
                <td style="font-size: 13px;"><strong>${isInvoice ? 'TOTAL NET INVOICE AMOUNT PAYABLE' : 'NET OUTSTANDING MAINTENANCE DUES PAYABLE'}</strong></td>
                <td style="text-align: right; font-size: 15px; font-weight: 800; color: ${data.pending > 0 ? '#991b1b' : '#166534'};">
                  ₹${formatValue(data.pending)}
                </td>
              </tr>
            </tbody>
          </table>

          <div class="due-banner">
            <div>
              <span style="font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 700; color: #92400e;">Payment Due Date:</span>
              <div style="font-size: 14px; font-weight: 800; color: #78350f;">Please clear on or before: ${formattedDueDate}</div>
            </div>
            <div style="text-align: right; font-size: 12px; font-weight: 700; color: #92400e;">
              ${data.pending > 0 ? '⚠️ Payment Awaited' : '✓ Nil Dues / Fully Cleared'}
            </div>
          </div>

          <div class="bank-box">
            <div style="font-weight: 700; color: #0b2b26; margin-bottom: 6px; font-size: 12px;">🏦 SOCIETY BANK ACCOUNT DETAILS FOR REMITTANCE:</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 6px; font-size: 11.5px;">
              <div><strong>Account Name:</strong> MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR</div>
              <div><strong>Bank Name:</strong> HDFC Bank</div>
              <div><strong>Account Number:</strong> 50200075533530</div>
              <div><strong>Account Type:</strong> CA-INSTITUTION (Current Account)</div>
              <div><strong>IFSC Code:</strong> HDFC0002454</div>
              <div><strong>Branch:</strong> Budhrani Boulevard, Undri NIBM Rd, Pune - 411060</div>
            </div>
            <div style="margin-top: 6px; font-size: 10.5px; color: #64748b;">* Note: Kindly mention <strong>${data.shopNo}</strong> in the transaction narration and share the UTR / transfer screenshot with the society office for prompt receipt issuance.</div>
          </div>

          <div class="legal-note">
            <strong>Important Society Terms:</strong><br/>
            ${noticeCustomNote}
          </div>

          <div class="signatures">
            <div class="sig-col">
              <div class="sig-line">Commercial Wing Coordinator</div>
            </div>
            <div class="sig-col">
              <div class="sig-line">Hon. Secretary</div>
            </div>
            <div class="sig-col">
              <div class="sig-line">Hon. Treasurer / Chairman</div>
            </div>
          </div>

          <div class="footer">
            <div>Majestique Euriska 'A' Building Co-Operative Housing Society Ltd. • Official Document</div>
            <div>Page ${idx + 1} of ${targetShops.length}</div>
          </div>
        </div>
      `;
    }).join('');

    const printDoc = `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="utf-8">
        <title>Shop Maintenance Demand Notice - Majestique Euriska</title>
        <style>
          * { box-sizing: border-box; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
          body { margin: 0; padding: 0; color: #0f172a; background: #fff; }
          
          .notice-page {
            padding: 32px 36px;
            max-width: 820px;
            margin: 0 auto;
            background: #fff;
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
          }

          .header {
            text-align: center;
            border-bottom: 2px solid #0b2b26;
            padding-bottom: 12px;
            margin-bottom: 16px;
          }
          .society-title { font-size: 17px; font-weight: 900; color: #0b2b26; letter-spacing: 0.02em; }
          .society-reg { font-size: 11px; color: #475569; margin-top: 4px; line-height: 1.4; }
          .doc-badge {
            display: inline-block;
            margin-top: 8px;
            padding: 3px 12px;
            border-radius: 999px;
            background: #f1f5f9;
            color: #0b2b26;
            border: 1px solid #cbd5e1;
            font-size: 10px;
            font-weight: 800;
            letter-spacing: 0.08em;
          }

          .ref-row {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #334155;
            margin-bottom: 14px;
            padding-bottom: 8px;
            border-bottom: 1px dashed #cbd5e1;
          }

          .recipient-box {
            background: #f8fafc;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 14px;
          }

          .subject-line {
            font-size: 12.5px;
            color: #0f172a;
            padding: 8px 12px;
            background: #f1f5f9;
            border-left: 4px solid #0b2b26;
            margin-bottom: 14px;
          }

          .body-text {
            font-size: 12px;
            line-height: 1.55;
            color: #1e293b;
            margin-bottom: 12px;
          }
          .body-text p { margin: 0 0 6px 0; }

          .dues-table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 14px;
          }
          .dues-table th {
            background: #0b2b26;
            color: #fff;
            font-weight: 700;
            padding: 8px 10px;
            text-align: left;
            font-size: 11px;
          }
          .dues-table td {
            padding: 8px 10px;
            border: 1px solid #cbd5e1;
          }
          .highlight-row {
            background: #fffbeb;
            font-weight: 700;
          }

          .due-banner {
            background: #fffbeb;
            border: 1px solid #fde68a;
            border-radius: 8px;
            padding: 10px 14px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 14px;
          }

          .bank-box {
            background: #f0fdf4;
            border: 1px solid #bbf7d0;
            border-radius: 8px;
            padding: 10px 14px;
            margin-bottom: 14px;
          }

          .legal-note {
            background: #fafafa;
            border-left: 3px solid #94a3b8;
            padding: 8px 12px;
            font-size: 10.5px;
            color: #475569;
            line-height: 1.45;
            margin-bottom: 24px;
          }

          .signatures {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 20px;
            margin-top: auto;
            padding-top: 18px;
            border-top: 1px solid #cbd5e1;
          }
          .sig-col { text-align: center; }
          .sig-line {
            margin-top: 40px;
            border-top: 1px solid #94a3b8;
            padding-top: 4px;
            font-size: 11px;
            font-weight: 700;
            color: #334155;
          }

          .footer {
            margin-top: 16px;
            padding-top: 8px;
            border-top: 1px solid #e2e8f0;
            font-size: 10px;
            color: #94a3b8;
            display: flex;
            justify-content: space-between;
          }

          @media print {
            body { padding: 0; background: #fff; }
            @page { margin: 0.8cm; size: A4 portrait; }
            .notice-page {
              page-break-after: always;
              min-height: 98vh;
              padding: 15px 20px;
            }
            .notice-page:last-child {
              page-break-after: auto;
            }
          }
        </style>
      </head>
      <body>
        ${pagesHtml}
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
  }, [shopsForNotice, noticeDocType, noticeDate, noticeDueDate, noticeRefPrefix, noticeCustomNote, getShopNoticeData]);

  const generateWhatsAppMessage = useCallback((shop) => {
    const data = getShopNoticeData(shop);
    const formattedDueDate = formatDisplayDate(noticeDueDate);
    const isInvoice = noticeDocType === 'invoice';

    if (isInvoice) {
      return `*MAJESTIQUE EURISKA 'A' BLDG CO-OP HSG SOC LTD*
*COMMERCIAL SHOP MAINTENANCE INVOICE / BILL*
━━━━━━━━━━━━━━━━━━━━━━
Invoice No: ${noticeRefPrefix}${String(data.id).padStart(2, '0')}
Date: ${formatDisplayDate(noticeDate)}

Billed To: *${data.name}*
Unit: *${data.shopNo}*

Subject: *Maintenance Bill & Dues Statement*

Dear Member,
Please find below the official maintenance bill details for your commercial unit *${data.shopNo}*:

• Total Billed: ₹${formatValue(data.billed)}
• Total Paid: ₹${formatValue(data.paid)}
• *TOTAL AMOUNT PAYABLE: ₹${formatValue(data.pending)}*
• *Payment Due Date: ${formattedDueDate}*

*Remittance Bank Account Details:*
• Bank: HDFC Bank
• A/C Name: MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR
• A/C No: 50200075533530
• IFSC: HDFC0002454
• Branch: Budhrani Boulevard, Undri NIBM Rd, Pune - 411060

Kindly complete the payment on or before the due date and share the transaction reference / UTR for receipt issuance.

Thank you for your cooperation!

Regards,
*Managing Committee*
Majestique Euriska 'A' Building CHS Ltd.`;
    }

    return `*MAJESTIQUE EURISKA 'A' BLDG CO-OP HSG SOC LTD*
*COMMERCIAL SHOP MAINTENANCE NOTICE*
━━━━━━━━━━━━━━━━━━━━━━
Ref: ${noticeRefPrefix}${String(data.id).padStart(2, '0')}
Date: ${formatDisplayDate(noticeDate)}

To: *${data.name}*
Unit: *${data.shopNo}*

Subject: *Outstanding Maintenance Dues Reminder*

Dear Member,
This is a gentle reminder regarding the maintenance charges for your commercial unit *${data.shopNo}*:

• Total Billed: ₹${formatValue(data.billed)}
• Payments Received: ₹${formatValue(data.paid)}
• *NET OUTSTANDING DUE: ₹${formatValue(data.pending)}*
• *Payment Due Date: ${formattedDueDate}*

*Bank Details for NEFT/IMPS/UPI:*
• Bank: HDFC Bank
• A/C Name: MAJESTIQUE EURISKA A BLDG SA GRU SAN MAR
• A/C No: 50200075533530
• IFSC: HDFC0002454
• Branch: Budhrani Boulevard, Undri NIBM Rd, Pune - 411060

Kindly transfer the pending amount before the due date and reply with the payment screenshot / transaction reference for receipt generation.

Thank you for your cooperation!

Regards,
*Managing Committee*
Majestique Euriska 'A' Building CHS Ltd.`;
  }, [getShopNoticeData, noticeDocType, noticeDueDate, noticeDate, noticeRefPrefix]);

  const handleShareWhatsApp = useCallback((shop) => {
    const data = getShopNoticeData(shop);
    const msg = generateWhatsAppMessage(shop);
    const cleanPhone = (data.contactNo || '').replace(/\D/g, '');
    const phoneParam = cleanPhone ? `91${cleanPhone.slice(-10)}` : '';
    const url = phoneParam
      ? `https://wa.me/${phoneParam}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`;

    window.open(url, '_blank');
  }, [getShopNoticeData, generateWhatsAppMessage]);

  const handleCopyNoticeText = useCallback((shop) => {
    const msg = generateWhatsAppMessage(shop);
    if (navigator.clipboard) {
      navigator.clipboard.writeText(msg).then(() => {
        setNoticeToast(`✓ Notice text copied for ${shop.shopNo}!`);
        setTimeout(() => setNoticeToast(''), 3000);
      }).catch(() => {
        setNoticeToast('Failed to copy');
        setTimeout(() => setNoticeToast(''), 3000);
      });
    }
  }, [generateWhatsAppMessage]);

  const activeNoticeShop = useMemo(() => {
    return shops.find(s => s.id === noticeShopId) || shops[0];
  }, [shops, noticeShopId]);

  const activeNoticeData = useMemo(() => {
    return getShopNoticeData(activeNoticeShop);
  }, [getShopNoticeData, activeNoticeShop]);

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
    <div className="shop-maintenance-tracker-s2">
      <div className="shop-maintenance-tracker-s3">
        {/* Top Row: Title on Left, Summary KPI & Sync status on Right */}
        <div className="shop-maintenance-tracker-s4">
          <div className="shop-maintenance-tracker-s5">
            <div className="shop-maintenance-tracker-s6">
              <span className="shop-maintenance-tracker-s7">🏬 Commercial Wing • 8 Shops</span>
            </div>
            <h2 className="shop-maintenance-tracker-s8">
              🏪 Shop Maintenance Ledger
            </h2>
            <p className="shop-maintenance-tracker-s9">
              Monthly maintenance billing, payment receipts, and balance movement for all shops.
            </p>
          </div>

          <div className="shop-maintenance-tracker-s10">
            {/* KPI Card */}
            <div className="shop-maintenance-tracker-s11">
              <div className="shop-maintenance-tracker-s12">
                <span className="shop-maintenance-tracker-s13">Overall Pending (1-8)</span>
                <span className="shop-maintenance-tracker-s14">💰</span>
              </div>
              <div className={`shop-maintenance-tracker-s15 ${(overallPending > 0 ? 'shop-maintenance-tracker-cond-3-true' : 'shop-maintenance-tracker-cond-4-false')}`}>
                ₹{formatValue(overallPending)}
              </div>
            </div>

            {/* Cloud Sync Status Pill */}
            <div className="shop-maintenance-tracker-s16" style={{ background: saveTone, color: saveTextTone }}>
              <span>{saveStatus === 'saving' || saveStatus === 'loading' ? '⏳' : saveStatus === 'error' ? '⚠️' : '☁️'}</span>
              <span>{saveMessage}</span>
            </div>
          </div>
        </div>

        {/* Bottom Row: Auto-billing Tag on Left, Action Toolbar on Right */}
        <div className="shop-maintenance-tracker-s17">
          <div className="shop-maintenance-tracker-s18">
            <span className="shop-maintenance-tracker-s19">
              ⚡ Auto-Billed on 1st of every month (₹1,500/mo) • Up to {getCurrentMonthStr()}
            </span>
          </div>

          <div className="shop-maintenance-tracker-s20">
            <button
              type="button"
              onClick={() => {
                setNoticeDocType('invoice');
                setNoticeRefPrefix('INV-ME/COMM/2026-27/');
                setNoticeTarget('all_pending');
                setIsNoticeModalOpen(true);
              }}
              className="shop-maintenance-tracker-s21"
            >
              🧾 Generate Shop Invoices
            </button>

            <button
              type="button"
              onClick={() => {
                setNoticeDocType('notice');
                setNoticeRefPrefix('ME-A/COMM/2026-27/NOT-');
                setNoticeTarget('all_pending');
                setIsNoticeModalOpen(true);
              }}
              className="shop-maintenance-tracker-s22"
            >
              📜 Generate Shop Notices
            </button>

            <button
              type="button"
              onClick={handlePrintAllShopsPDF}
              className="shop-maintenance-tracker-s23"
            >
              🖨️ Print Summary (All)
            </button>

            {isAdmin ? (
              <>
                <button
                  type="button"
                  onClick={handleAutoSyncDueMonths}
                  disabled={saveStatus === 'saving'}
                  title="Checks and saves all new month maintenance to Firebase server"
                  className={`shop-maintenance-tracker-s24 ${(saveStatus === 'saving' ? 'shop-maintenance-tracker-cond-5-true' : 'shop-maintenance-tracker-cond-6-false')}`}
                >
                  ⚡ Sync Dues ({getCurrentMonthStr()})
                </button>

                <button
                  type="button"
                  onClick={() => setIsInsertModalOpen(true)}
                  className="shop-maintenance-tracker-s25"
                >
                  + Add Maintenance / Receipt
                </button>
              </>
            ) : (
              <span className="shop-maintenance-tracker-s26">
                🔒 Read-only view
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Rate Slabs Strip */}
      <div className="shop-maintenance-tracker-s27">
        <span className="shop-maintenance-tracker-s28">📋 Approved Rate Slabs:</span>
        <span className="shop-maintenance-tracker-s29">
          <span className="shop-maintenance-tracker-s30"></span>
          <b>Oct 2021 – Jun 2024</b>: ₹1,100 / month (33 months)
        </span>
        <span className="shop-maintenance-tracker-s31">•</span>
        <span className="shop-maintenance-tracker-s29">
          <span className="shop-maintenance-tracker-s32"></span>
          <b>Jul 2024 – Present ({getCurrentMonthStr()})</b>: ₹1,500 / month (Billed on 1st)
        </span>
      </div>



      <div className="shop-maintenance-tracker-s33">
        {shops.map((shop) => (
          <button
            key={shop.id}
            type="button"
            onClick={() => setActiveShopId(shop.id)}
            className={`shop-maintenance-tracker-s34 ${(activeShopId === shop.id ? 'shop-maintenance-tracker-cond-7-true' : 'shop-maintenance-tracker-cond-8-false')}`}
          >
            <span>{activeShopId === shop.id ? '🏪' : '🧾'}</span>
            <span>{shop.shopNo}</span>
          </button>
        ))}
      </div>

      <div className="shop-maintenance-tracker-s35">
        <div className="shop-maintenance-tracker-s36">
          <div>
            <p className="shop-maintenance-tracker-s37">Active Shop</p>
            <h3 className="shop-maintenance-tracker-s38">{activeShop.shopNo}</h3>
            <p className="shop-maintenance-tracker-s39">{activeShop.name}</p>
          </div>
          <div className="shop-maintenance-tracker-s40">
            <button
              type="button"
              onClick={() => {
                setNoticeDocType('invoice');
                setNoticeRefPrefix('INV-ME/COMM/2026-27/');
                setNoticeTarget('single');
                setNoticeShopId(activeShop.id);
                setIsNoticeModalOpen(true);
              }}
              className="shop-maintenance-tracker-s41"
            >
              🧾 Generate Invoice ({activeShop.shopNo})
            </button>
            <button
              type="button"
              onClick={() => {
                setNoticeDocType('notice');
                setNoticeRefPrefix('ME-A/COMM/2026-27/NOT-');
                setNoticeTarget('single');
                setNoticeShopId(activeShop.id);
                setIsNoticeModalOpen(true);
              }}
              className="shop-maintenance-tracker-s42"
            >
              📜 Notice ({activeShop.shopNo})
            </button>
            <button
              onClick={handlePrintShopPDF}
              className="shop-maintenance-tracker-s43"
            >
              🖨️ Print {activeShop.shopNo} Statement (PDF)
            </button>
          </div>
        </div>

        <div className="shop-maintenance-tracker-s44">
          {[
            { label: '📞 Contact No', value: formatValue(activeShop.contactNo), sub: 'Owner Contact', accent: '#0b2b26' },
            { label: '🧾 Monthly Maintenance Total', value: formatValue(totalRegularMain), sub: 'Total Due', accent: '#196c6c' },
            { label: '📥 Receipts Total', value: formatValue(totalReceipts), sub: 'Till July 2026', accent: '#065f46' },
            { label: 'Remaining Balance', value: formatValue(totalRegularMain - totalReceipts), sub: 'Overall Pending', accent: '#991b1b' },
          ].map(c => (
            <div key={c.label} className="shop-maintenance-tracker-s45">
              <div className="shop-maintenance-tracker-s46">{c.label}</div>
              <div className="shop-maintenance-tracker-s47" style={{ color: c.accent }}>{c.value}</div>
              <div className="shop-maintenance-tracker-s48">{c.sub}</div>
              {c.label === '📥 Receipts Total' && activeShop.ledger.some((entry) => Number(entry.receipts) > 0) && (
                <div className="shop-maintenance-tracker-s49">
                  {activeShop.ledger
                    .filter((entry) => Number(entry.receipts) > 0)
                    .map((entry) => `${entry.month}: ${formatValue(entry.receipts)}`)
                    .join(' • ')}
                </div>
              )}
            </div>
          ))}
        </div>

        <div className="shop-maintenance-tracker-s50">
          <div className="shop-maintenance-tracker-s51">
            <div className="shop-maintenance-tracker-s52">📋 Monthly Ledger</div>
            <span className="shop-maintenance-tracker-s53">Year-wise view • grouped by financial year</span>
          </div>

          {yearGroups.map((group) => {
            const isExpanded = expandedYears[group.year];
            return (
              <div key={group.year} className="shop-maintenance-tracker-s54">
                <div 
                  onClick={() => setExpandedYears(prev => ({ ...prev, [group.year]: !prev[group.year] }))}
                  className={`shop-maintenance-tracker-s55 ${(isExpanded ? 'shop-maintenance-tracker-cond-9-true' : 'shop-maintenance-tracker-cond-10-false')}`}
                >
                  <div>
                    <div className="shop-maintenance-tracker-s56">Financial year</div>
                    <div className="shop-maintenance-tracker-s57">{group.year}</div>
                  </div>
                  <div className="shop-maintenance-tracker-s58">
                    <span className="shop-maintenance-tracker-s59">Yearly Maintenance: {formatValue(group.regularMainTotal)}</span>
                    {group.receiptsTotal > 0 && (
                      <span className="shop-maintenance-tracker-s60">Receipts: {formatValue(group.receiptsTotal)}</span>
                    )}
                    <span className={`shop-maintenance-tracker-s61 ${(isExpanded ? 'shop-maintenance-tracker-cond-11-true' : 'shop-maintenance-tracker-cond-12-false')}`}>▼</span>
                  </div>
                </div>
                
                {isExpanded && (
                  <div className="shop-maintenance-tracker-s62">
                    <table className="shop-maintenance-tracker-s63">
                      <thead>
                        <tr>
                          <th className="shop-maintenance-tracker-s64">Month</th>
                          <th className="shop-maintenance-tracker-s64">Monthly Maintenance</th>
                          <th className="shop-maintenance-tracker-s64">Receipts</th>
                          {isAdmin && (
                            <th className="shop-maintenance-tracker-s65">Actions</th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {group.entries.map((entry) => (
                          <tr key={entry.month} className="shop-maintenance-tracker-s66">
                            <td className="shop-maintenance-tracker-s67">{entry.month}</td>
                            <td className="shop-maintenance-tracker-s67">{formatValue(entry.regularMain)}</td>
                            <td className="shop-maintenance-tracker-s67">
                              <span className={`shop-maintenance-tracker-s68 ${(entry.receipts ? 'shop-maintenance-tracker-cond-13-true' : 'shop-maintenance-tracker-cond-14-false')}`}>
                                {formatValue(entry.receipts)}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="shop-maintenance-tracker-s69">
                                <div className="shop-maintenance-tracker-s70">
                                  <button
                                    type="button"
                                    onClick={() => startEditingEntry(activeShop.id, entry)}
                                    className="shop-maintenance-tracker-s71"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteEntry(activeShop.id, entry.month)}
                                    className="shop-maintenance-tracker-s72"
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

      {/* Notice Generator Modal */}
      {isNoticeModalOpen && (
        <div className="shop-maintenance-tracker-s73">
          <div className="shop-maintenance-tracker-s74">
            
            {/* Modal Header */}
            <div className="shop-maintenance-tracker-s75">
              <div>
                <span className="shop-maintenance-tracker-s76">Society Commercial Wing</span>
                <h3 className="shop-maintenance-tracker-s77">
                  {noticeDocType === 'invoice' ? '🧾 Commercial Shop Maintenance Invoice Generator' : '📜 Commercial Shop Maintenance Demand Notice Generator'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsNoticeModalOpen(false)}
                className="shop-maintenance-tracker-s78"
              >
                ✕
              </button>
            </div>

            {/* Modal Body: Split view (Configuration on left, Live Preview on right) */}
            <div className="shop-maintenance-tracker-s79">
              
              {/* Left Column: Form & Selection */}
              <div className="shop-maintenance-tracker-s80">
                
                {/* Document Type Switcher */}
                <div>
                  <label className="shop-maintenance-tracker-s81">
                    1. Document Type
                  </label>
                  <div className="shop-maintenance-tracker-s82">
                    <button
                      type="button"
                      onClick={() => {
                        setNoticeDocType('invoice');
                        if (noticeRefPrefix.includes('NOT-')) {
                          setNoticeRefPrefix('INV-ME/COMM/2026-27/');
                        }
                      }}
                      className={`shop-maintenance-tracker-s83 ${(noticeDocType === 'invoice' ? 'shop-maintenance-tracker-cond-15-true' : 'shop-maintenance-tracker-cond-16-false')}`}
                    >
                      🧾 Maintenance Invoice
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setNoticeDocType('notice');
                        if (noticeRefPrefix.includes('INV-')) {
                          setNoticeRefPrefix('ME-A/COMM/2026-27/NOT-');
                        }
                      }}
                      className={`shop-maintenance-tracker-s83 ${(noticeDocType === 'notice' ? 'shop-maintenance-tracker-cond-17-true' : 'shop-maintenance-tracker-cond-18-false')}`}
                    >
                      📜 Demand Notice
                    </button>
                  </div>
                </div>

                {/* Target Scope Selection */}
                <div>
                  <label className="shop-maintenance-tracker-s81">
                    2. Select Target Shops
                  </label>
                  <div className="shop-maintenance-tracker-s84">
                    <button
                      type="button"
                      onClick={() => setNoticeTarget('single')}
                      className={`shop-maintenance-tracker-s83 ${(noticeTarget === 'single' ? 'shop-maintenance-tracker-cond-19-true' : 'shop-maintenance-tracker-cond-20-false')}`}
                    >
                      Single Shop
                    </button>
                    <button
                      type="button"
                      onClick={() => setNoticeTarget('all_pending')}
                      className={`shop-maintenance-tracker-s83 ${(noticeTarget === 'all_pending' ? 'shop-maintenance-tracker-cond-21-true' : 'shop-maintenance-tracker-cond-22-false')}`}
                    >
                      All Pending Dues ({shops.filter(s => getShopNoticeData(s).pending > 0).length})
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setNoticeTarget('all')}
                    className={`shop-maintenance-tracker-s85 ${(noticeTarget === 'all' ? 'shop-maintenance-tracker-cond-23-true' : 'shop-maintenance-tracker-cond-24-false')}`}
                  >
                    All 8 Commercial Shops (Batch)
                  </button>
                </div>

                {/* Single Shop Selector Pills */}
                {noticeTarget === 'single' && (
                  <div>
                    <label className="shop-maintenance-tracker-s86">
                      Choose Specific Shop:
                    </label>
                    <div className="shop-maintenance-tracker-s87">
                      {shops.map(s => {
                        const sData = getShopNoticeData(s);
                        const isSelected = noticeShopId === s.id;
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => setNoticeShopId(s.id)}
                            className={`shop-maintenance-tracker-s88 ${(isSelected ? 'shop-maintenance-tracker-cond-25-true' : 'shop-maintenance-tracker-cond-26-false')}`}
                          >
                            <span>{s.shopNo}</span>
                            <span className={`shop-maintenance-tracker-s89 ${(isSelected ? 'shop-maintenance-tracker-cond-27-true' : 'shop-maintenance-tracker-cond-28-false')}`}>
                              (₹{formatValue(sData.pending)})
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Dates & Reference Configuration */}
                <div className="shop-maintenance-tracker-s90">
                  <div>
                    <label className="shop-maintenance-tracker-s91">
                      {noticeDocType === 'invoice' ? 'Invoice Date' : 'Notice Date'}
                    </label>
                    <input
                      type="date"
                      value={noticeDate}
                      onChange={(e) => setNoticeDate(e.target.value)}
                      className="shop-maintenance-tracker-s92"
                    />
                  </div>
                  <div>
                    <label className="shop-maintenance-tracker-s93">
                      Payment Due Date
                    </label>
                    <input
                      type="date"
                      value={noticeDueDate}
                      onChange={(e) => setNoticeDueDate(e.target.value)}
                      className="shop-maintenance-tracker-s94"
                    />
                  </div>
                </div>

                <div>
                  <label className="shop-maintenance-tracker-s91">
                    {noticeDocType === 'invoice' ? 'Invoice Number Prefix' : 'Reference Number Prefix'}
                  </label>
                  <input
                    type="text"
                    value={noticeRefPrefix}
                    onChange={(e) => setNoticeRefPrefix(e.target.value)}
                    className="shop-maintenance-tracker-s92"
                  />
                </div>

                {/* Custom Resolution / Note */}
                <div>
                  <label className="shop-maintenance-tracker-s91">
                    Important Note / Terms (Editable)
                  </label>
                  <textarea
                    rows={4}
                    value={noticeCustomNote}
                    onChange={(e) => setNoticeCustomNote(e.target.value)}
                    className="shop-maintenance-tracker-s95"
                  />
                </div>

                {/* Society Bank Details Quick Preview */}
                <div className="shop-maintenance-tracker-s96">
                  <div className="shop-maintenance-tracker-s97">
                    <span>🏦 Remittance Account Info</span>
                  </div>
                  <div><strong>Bank:</strong> HDFC Bank • CA-INSTITUTION</div>
                  <div><strong>A/C:</strong> 50200075533530</div>
                  <div><strong>IFSC:</strong> HDFC0002454 (Undri / NIBM Road)</div>
                </div>
              </div>

              {/* Right Column: Live Letterhead Preview */}
              <div className="shop-maintenance-tracker-s98">
                
                {/* Simulated Paper Document */}
                <div className="shop-maintenance-tracker-s99">
                  {/* Letterhead */}
                  <div className="shop-maintenance-tracker-s100">
                    <div className="shop-maintenance-tracker-s101">
                      MAJESTIQUE EURISKA 'A' BUILDING CO-OP HOUSING SOCIETY LTD.
                    </div>
                    <div className="shop-maintenance-tracker-s102">
                      Reg. No: PNA/PNA (4)/HSG/(TC)/21207/2019-20 • Mohammed Wadi, Pune - 411060
                    </div>
                    <span className="shop-maintenance-tracker-s103">
                      {noticeDocType === 'invoice' ? 'COMMERCIAL WING • MAINTENANCE BILL / TAX INVOICE' : 'COMMERCIAL WING • FORMAL DEMAND NOTICE'}
                    </span>
                  </div>

                  {/* Ref & Date */}
                  <div className="shop-maintenance-tracker-s104">
                    <div><strong>{noticeDocType === 'invoice' ? 'Invoice / Bill No:' : 'Ref No:'}</strong> {noticeRefPrefix}{String(activeNoticeData.id).padStart(2, '0')}</div>
                    <div><strong>{noticeDocType === 'invoice' ? 'Invoice Date:' : 'Notice Date:'}</strong> {formatDisplayDate(noticeDate)}</div>
                  </div>

                  {/* Recipient */}
                  <div className="shop-maintenance-tracker-s105">
                    <div className="shop-maintenance-tracker-s106">{noticeDocType === 'invoice' ? 'BILLED TO:' : 'TO:'}</div>
                    <div className="shop-maintenance-tracker-s107">{activeNoticeData.name}</div>
                    <div className="shop-maintenance-tracker-s108">Unit: {activeNoticeData.shopNo} • Contact: {activeNoticeData.contactNo || 'N/A'}</div>
                  </div>

                  {/* Subject */}
                  <div className="shop-maintenance-tracker-s109">
                    {noticeDocType === 'invoice' ? 'Subject: Commercial Shop Maintenance Charges Bill' : 'Subject: Demand Notice for Outstanding Commercial Maintenance Dues'}
                  </div>

                  {/* Financial Table */}
                  <table className="shop-maintenance-tracker-s110">
                    <tbody>
                      <tr className="shop-maintenance-tracker-s111">
                        <td className="shop-maintenance-tracker-s112">Total Maintenance Demand Billed</td>
                        <td className="shop-maintenance-tracker-s113">₹{formatValue(activeNoticeData.billed)}</td>
                      </tr>
                      <tr className="shop-maintenance-tracker-s111">
                        <td className="shop-maintenance-tracker-s112">Total Receipts Credited</td>
                        <td className="shop-maintenance-tracker-s114">(-) ₹{formatValue(activeNoticeData.paid)}</td>
                      </tr>
                      <tr className="shop-maintenance-tracker-s115">
                        <td className="shop-maintenance-tracker-s116">
                          {noticeDocType === 'invoice' ? 'TOTAL NET INVOICE AMOUNT DUE' : 'NET OUTSTANDING DUES PAYABLE'}
                        </td>
                        <td className={`shop-maintenance-tracker-s117 ${(activeNoticeData.pending > 0 ? 'shop-maintenance-tracker-cond-29-true' : 'shop-maintenance-tracker-cond-30-false')}`}>
                          ₹{formatValue(activeNoticeData.pending)}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  {/* Due banner */}
                  <div className="shop-maintenance-tracker-s118">
                    <div>
                      <span className="shop-maintenance-tracker-s119">Payment Due Date: </span>
                      <strong className="shop-maintenance-tracker-s120">{formatDisplayDate(noticeDueDate)}</strong>
                    </div>
                    <span className="shop-maintenance-tracker-s119">HDFC A/C: 50200075533530</span>
                  </div>

                  {/* Signatures */}
                  <div className="shop-maintenance-tracker-s121">
                    <div><div className="shop-maintenance-tracker-s122">Coordinator</div></div>
                    <div><div className="shop-maintenance-tracker-s122">Secretary</div></div>
                    <div><div className="shop-maintenance-tracker-s122">Treasurer / Chairman</div></div>
                  </div>
                </div>

                {noticeToast && (
                  <div className="shop-maintenance-tracker-s123">
                    {noticeToast}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer Toolbar */}
            <div className="shop-maintenance-tracker-s124">
              <div className="shop-maintenance-tracker-s125">
                Selected Target: <strong>{noticeTarget === 'single' ? activeNoticeShop.shopNo : noticeTarget === 'all_pending' ? `All ${shopsForNotice.length} Pending Shops` : 'All 8 Shops'}</strong>
              </div>

              <div className="shop-maintenance-tracker-s126">
                {noticeTarget === 'single' && (
                  <>
                    <button
                      type="button"
                      onClick={() => handleCopyNoticeText(activeNoticeShop)}
                      className="shop-maintenance-tracker-s127"
                    >
                      📋 Copy Text
                    </button>
                    <button
                      type="button"
                      onClick={() => handleShareWhatsApp(activeNoticeShop)}
                      className="shop-maintenance-tracker-s128"
                    >
                      📱 Send WhatsApp
                    </button>
                  </>
                )}

                <button
                  type="button"
                  onClick={handlePrintNotices}
                  className="shop-maintenance-tracker-s129"
                >
                  🖨️ Print / Download PDF ({shopsForNotice.length} Notice{shopsForNotice.length > 1 ? 's' : ''})
                </button>

                <button
                  type="button"
                  onClick={() => setIsNoticeModalOpen(false)}
                  className="shop-maintenance-tracker-s130"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {isAdmin && isInsertModalOpen && (
        <div className="shop-maintenance-tracker-s131">
          <div className="shop-maintenance-tracker-s132">
            <h3 className="shop-maintenance-tracker-s133">Add Shop Maintenance</h3>
            <form onSubmit={handleInsertSubmit} className="shop-maintenance-tracker-s134">
              <div>
                <label className="shop-maintenance-tracker-s135">Select Shops</label>
                <div className="shop-maintenance-tracker-s87">
                  {shops.map(s => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => toggleShopSelection(s.id)}
                      className={`shop-maintenance-tracker-s136 ${(selectedShops.includes(s.id) ? 'shop-maintenance-tracker-cond-31-true' : 'shop-maintenance-tracker-cond-32-false')}`}
                    >
                      {s.shopNo}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="shop-maintenance-tracker-s137">Month</label>
                <input 
                  type="text" 
                  value={insertMonth} 
                  onChange={(e) => setInsertMonth(e.target.value)} 
                  placeholder="e.g. Aug-26"
                  className="shop-maintenance-tracker-s138"
                />
              </div>

              <div>
                <label className="shop-maintenance-tracker-s137">Monthly Maintenance Amount</label>
                <input 
                  type="number" 
                  value={insertRegularAmount} 
                  onChange={(e) => setInsertRegularAmount(e.target.value)} 
                  placeholder="e.g. 1500"
                  className="shop-maintenance-tracker-s138"
                />
              </div>

              <div>
                <label className="shop-maintenance-tracker-s137">Receipt Amount (Optional)</label>
                <input 
                  type="number" 
                  value={insertAmount} 
                  onChange={(e) => setInsertAmount(e.target.value)} 
                  placeholder="e.g. 1500"
                  className="shop-maintenance-tracker-s138"
                />
              </div>
              <div className="shop-maintenance-tracker-s139">
                <button 
                  type="button" 
                  onClick={() => setIsInsertModalOpen(false)}
                  className="shop-maintenance-tracker-s140"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  className={`shop-maintenance-tracker-s141 ${(saveStatus === 'saving' ? 'shop-maintenance-tracker-cond-33-true' : 'shop-maintenance-tracker-cond-34-false')}`}
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Receipts'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isAdmin && editingEntry && (
        <div className="shop-maintenance-tracker-s131">
          <div className="shop-maintenance-tracker-s132">
            <h3 className="shop-maintenance-tracker-s133">Edit Shop Maintenance</h3>
            <form onSubmit={handleEditSubmit} className="shop-maintenance-tracker-s134">
              <div>
                <label className="shop-maintenance-tracker-s137">Month</label>
                <input
                  type="text"
                  value={editingEntry.month}
                  onChange={(event) => handleEditFieldChange('month', event.target.value)}
                  placeholder="e.g. Aug-26"
                  className="shop-maintenance-tracker-s138"
                />
              </div>
              <div>
                <label className="shop-maintenance-tracker-s137">Monthly Maintenance Amount</label>
                <input
                  type="number"
                  value={editingEntry.regularMain}
                  onChange={(event) => handleEditFieldChange('regularMain', event.target.value)}
                  placeholder="e.g. 1500"
                  className="shop-maintenance-tracker-s138"
                />
              </div>
              <div>
                <label className="shop-maintenance-tracker-s137">Receipt Amount</label>
                <input
                  type="number"
                  value={editingEntry.receipts}
                  onChange={(event) => handleEditFieldChange('receipts', event.target.value)}
                  placeholder="e.g. 1500"
                  className="shop-maintenance-tracker-s138"
                />
              </div>
              <div className="shop-maintenance-tracker-s139">
                <button
                  type="button"
                  onClick={() => setEditingEntry(null)}
                  className="shop-maintenance-tracker-s140"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveStatus === 'saving'}
                  className={`shop-maintenance-tracker-s141 ${(saveStatus === 'saving' ? 'shop-maintenance-tracker-cond-35-true' : 'shop-maintenance-tracker-cond-36-false')}`}
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
