import { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';

const COMMON_EXPENSE_DOC_ID = 'dashboard';

const LEDGER_MONTHS = [
  {
    id: '2026-04',
    label: 'April 2026',
    collectionDate: '2026-04-02',
    collectionAmount: 10000,
    openingDate: '2026-04-02',
    openingBalance: 9027,
    freshCollection: 10000,
    carryForward: -973,
    note: 'Collection of Rs 10,000 on 02 Apr 2026. Ledger opening balance available: Rs 9,027.',
    expenses: [
      {
        id: 'apr-utt-1',
        date: '2026-04-04',
        vendor: 'Uttareswar',
        remark: 'Waterman salary',
        amount: 5650,
        balanceAfter: 3377,
        category: 'Salary'
      },
      {
        id: 'apr-sid-1',
        date: '2026-04-05',
        vendor: 'Siddu lende',
        remark: 'Common Expenses month of Mar 26',
        amount: 2131,
        balanceAfter: 1246,
        category: 'Common Expenses'
      },
      {
        id: 'apr-rana-1',
        date: '2026-04-29',
        vendor: 'Rana Biswas',
        remark: 'Bathroom out side Plumbing Work',
        amount: 430,
        balanceAfter: 816,
        category: 'Plumbing'
      },
      {
        id: 'apr-skhw-1',
        date: '2026-04-29',
        vendor: 'Shree krushna H/W',
        remark: '10w LED purchase',
        amount: 1200,
        balanceAfter: -384,
        category: 'Purchase'
      }
    ]
  },
  {
    id: '2026-05',
    label: 'May 2026',
    collectionDate: '2026-05-02',
    collectionAmount: 10000,
    openingDate: '2026-05-02',
    openingBalance: 9616,
    freshCollection: 10000,
    carryForward: -384,
    note: 'Collection of Rs 10,000 on 02 May 2026. Opening balance shown in ledger: Rs 9,616.',
    expenses: [
      {
        id: 'may-utt-1',
        date: '2026-05-05',
        vendor: 'Uttareswar',
        remark: 'Waterman salary',
        amount: 5650,
        balanceAfter: 3966,
        category: 'Salary'
      },
      {
        id: 'may-igs-1',
        date: '2026-05-05',
        vendor: 'IGS Enterprises',
        remark: 'Solar Pipe Insstalation',
        amount: 800,
        balanceAfter: 3166,
        category: 'Solar'
      },
      {
        id: 'may-sid-1',
        date: '2026-05-30',
        vendor: 'Siddu lende',
        remark: 'Common Expenses',
        amount: 4370,
        balanceAfter: -1204,
        category: 'Common Expenses'
      }
    ]
  },
  {
    id: '2026-06',
    label: 'June 2026',
    collectionDate: '2026-06-02',
    collectionAmount: 10000,
    openingDate: '2026-06-02',
    openingBalance: 8796,
    freshCollection: 10000,
    carryForward: -1204,
    note: 'Collection of Rs 10,000 on 02 Jun 2026. Opening balance shown in ledger: Rs 8,796.',
    expenses: [
      {
        id: 'jun-utt-1',
        date: '2026-06-03',
        vendor: 'Uttareswar',
        remark: 'Waterman salary',
        amount: 5650,
        balanceAfter: 3146,
        category: 'Salary'
      },
      {
        id: 'jun-igs-1',
        date: '2026-06-03',
        vendor: 'IGS Enterprises',
        remark: 'Solar Lekage work',
        amount: 600,
        balanceAfter: 2546,
        category: 'Solar'
      }
    ]
  }
];

const CATEGORY_COLORS = {
  Salary: { solid: '#0B6E4F', soft: '#E5F5EF' },
  'Common Expenses': { solid: '#C49B4F', soft: '#F8EED8' },
  Plumbing: { solid: '#1E3A8A', soft: '#E3EBFF' },
  Purchase: { solid: '#C2644A', soft: '#FDE8DF' },
  Solar: { solid: '#8B5CF6', soft: '#EFE8FF' }
};

const moneyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2
});

function formatCurrency(value) {
  return moneyFormatter.format(value || 0);
}

function formatSignedCurrency(value) {
  if (value === null || value === undefined) {
    return '--';
  }

  return `${value >= 0 ? '+' : '-'}${formatCurrency(Math.abs(value))}`;
}

function formatDate(dateString) {
  const [year, month, day] = dateString.split('-').map(Number);
  const monthLabel = new Intl.DateTimeFormat('en-IN', {
    month: 'short',
    timeZone: 'UTC'
  }).format(new Date(Date.UTC(year, month - 1, day)));

  return `${String(day).padStart(2, '0')} ${monthLabel} ${year}`;
}

function getBalanceTone(value) {
  if (value < 0) {
    return { color: '#B42318', background: '#FEE4E2' };
  }

  return { color: '#0B6E4F', background: '#E5F5EF' };
}

function getCategoryPalette(category) {
  return CATEGORY_COLORS[category] || { solid: '#475467', soft: '#F2F4F7' };
}

function buildCategoryBreakdown(months) {
  const totals = new Map();

  months.forEach((month) => {
    month.expenses.forEach((expense) => {
      totals.set(expense.category, (totals.get(expense.category) || 0) + expense.amount);
    });
  });

  const grandTotal = Array.from(totals.values()).reduce((sum, value) => sum + value, 0);

  return Array.from(totals.entries())
    .map(([category, amount]) => ({
      category,
      amount,
      percent: grandTotal ? (amount / grandTotal) * 100 : 0,
      ...getCategoryPalette(category)
    }))
    .sort((left, right) => right.amount - left.amount);
}

function buildDonutGradient(items) {
  let current = 0;

  return `conic-gradient(${items
    .map((item) => {
      const start = current;
      current += item.percent;
      return `${item.solid} ${start}% ${current}%`;
    })
    .join(', ')})`;
}

function SummaryCard({ label, value, accent, caption }) {
  return (
    <div
      className="accounting-summary-card"
      style={{
        padding: '22px',
        borderRadius: '20px',
        background: '#fff',
        border: '1px solid rgba(61, 63, 52, 0.08)'
      }}
    >
      <div
        style={{
          width: '48px',
          height: '48px',
          borderRadius: '14px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: accent.soft,
          color: accent.solid,
          fontWeight: 800,
          fontSize: '0.88rem',
          marginBottom: '14px'
        }}
      >
        {label.slice(0, 2).toUpperCase()}
      </div>
      <p className="eyebrow" style={{ margin: '0 0 6px 0' }}>
        {label}
      </p>
      <p style={{ margin: 0, fontSize: '1.8rem', fontWeight: 800, color: '#101828' }}>{value}</p>
      <p style={{ margin: '10px 0 0 0', fontSize: '0.9rem', color: '#667085' }}>{caption}</p>
    </div>
  );
}

export default function CommonExpenseTracker({ isAdmin = false }) {
  const [activeMonthId, setActiveMonthId] = useState(LEDGER_MONTHS[LEDGER_MONTHS.length - 1].id);
  const [months, setMonths] = useState(LEDGER_MONTHS);
  const [addingFor, setAddingFor] = useState(null);
  const [newExpense, setNewExpense] = useState({ date: '', vendor: '', remark: '', category: 'Common Expenses', amount: '' });

  useEffect(() => {
    let mounted = true;

    async function loadRemote() {
      if (!isFirebaseConfigured || !db) return;

      try {
        await ensureFirebaseSession();
        const ref = doc(db, 'commonExpenses', COMMON_EXPENSE_DOC_ID);
        const snap = await getDoc(ref);
        if (snap.exists() && mounted) {
          const data = snap.data();
          if (data.months && Array.isArray(data.months)) setMonths(data.months);
        }
      } catch (err) {
        // silently fail to keep local data functioning
      }
    }

    loadRemote();
    return () => {
      mounted = false;
    };
  }, []);

  const monthlySummaries = useMemo(
    () =>
      months.map((month) => {
        const totalExpense = month.expenses.reduce((sum, expense) => sum + expense.amount, 0);
        const closingBalance = month.expenses[month.expenses.length - 1]?.balanceAfter ?? month.openingBalance;

        return {
          ...month,
          totalExpense,
          closingBalance
        };
      }),
    [months]
  );

  const activeMonth = monthlySummaries.find((month) => month.id === activeMonthId) || monthlySummaries[0];
  const categoryBreakdown = useMemo(() => buildCategoryBreakdown(monthlySummaries), [monthlySummaries]);

  const overallSummary = useMemo(() => {
    const totalCollection = monthlySummaries.reduce(
      (sum, month) => sum + (month.collectionAmount ?? month.freshCollection ?? 0),
      0
    );
    const totalExpense = monthlySummaries.reduce((sum, month) => sum + month.totalExpense, 0);
    const closingBalance = monthlySummaries[monthlySummaries.length - 1]?.closingBalance || 0;
    const totalTransactions = monthlySummaries.reduce((sum, month) => sum + month.expenses.length, 0);
    const highestMonth = [...monthlySummaries].sort((left, right) => right.totalExpense - left.totalExpense)[0];
    const salarySpend =
      categoryBreakdown.find((category) => category.category === 'Salary')?.amount || 0;
    const openingAdjustment = totalCollection - totalExpense - closingBalance;

    return {
      totalCollection,
      totalExpense,
      closingBalance,
      openingAdjustment,
      averageMonthlyExpense: monthlySummaries.length ? totalExpense / monthlySummaries.length : 0,
      totalTransactions,
      highestMonth,
      salarySpend
    };
  }, [categoryBreakdown, monthlySummaries]);

  const handleExport = () => {
    const workbook = XLSX.utils.book_new();

    const summaryRows = [
      { Metric: 'Total collection', Amount: overallSummary.totalCollection },
      { Metric: 'Total expense', Amount: overallSummary.totalExpense },
      { Metric: 'Closing balance', Amount: overallSummary.closingBalance },
      { Metric: 'Opening adjustment', Amount: overallSummary.openingAdjustment },
      { Metric: 'Average monthly expense', Amount: overallSummary.averageMonthlyExpense }
    ];

    const monthRows = monthlySummaries.map((month) => ({
      Month: month.label,
      'Collection Date': formatDate(month.collectionDate || month.openingDate),
      'Collection Received': month.collectionAmount ?? month.freshCollection ?? 0,
      'Available Opening Balance': month.openingBalance,
      'Carry Forward': month.carryForward ?? '',
      'Total Expense': month.totalExpense,
      'Closing Balance': month.closingBalance
    }));

    const transactionRows = monthlySummaries.flatMap((month) =>
      month.expenses.map((expense) => ({
        Month: month.label,
        Date: formatDate(expense.date),
        Vendor: expense.vendor,
        Remark: expense.remark,
        Category: expense.category,
        Amount: expense.amount,
        'Balance After': expense.balanceAfter
      }))
    );

    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(summaryRows), 'Summary');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(monthRows), 'Monthly Ledger');
    XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(transactionRows), 'Transactions');
    XLSX.writeFile(workbook, 'Common_Expense_Tracker_Apr_Jun_2026.xlsx');
  };

  async function persistMonths(updatedMonths) {
    if (!isFirebaseConfigured || !db) return;

    try {
      await ensureFirebaseSession();
      const ref = doc(db, 'commonExpenses', COMMON_EXPENSE_DOC_ID);
      await setDoc(ref, { months: updatedMonths }, { merge: true });
    } catch (err) {
      // ignore - fallback to local state
    }
  }

  const handleAddExpense = async (monthId) => {
    const amountNum = Number(newExpense.amount || 0);
    if (!newExpense.date || !newExpense.vendor || !amountNum) return;

    const updated = months.map((m) => {
      if (m.id !== monthId) return m;

      const lastBalance = m.expenses[m.expenses.length - 1]?.balanceAfter ?? m.openingBalance;
      const balanceAfter = Number((lastBalance - amountNum).toFixed(2));
      const expense = {
        id: `${monthId}-${Date.now()}`,
        date: newExpense.date,
        vendor: newExpense.vendor,
        remark: newExpense.remark,
        amount: amountNum,
        balanceAfter,
        category: newExpense.category
      };

      return {
        ...m,
        expenses: [...m.expenses, expense]
      };
    });

    setMonths(updated);
    setAddingFor(null);
    setNewExpense({ date: '', vendor: '', remark: '', category: 'Common Expenses', amount: '' });
    persistMonths(updated);
  };

  const donutGradient = buildDonutGradient(categoryBreakdown);
  const maxMonthlyExpense = Math.max(...monthlySummaries.map((month) => month.totalExpense));
  const activeBalanceTone = getBalanceTone(activeMonth.closingBalance);
  const closingBalanceTone = getBalanceTone(overallSummary.closingBalance);

  return (
    <div className="accounting-shell">
      <div
        className="dashboard-hero-card"
        style={{
          alignItems: 'flex-start',
          background: 'linear-gradient(135deg, #0B2B26 0%, #196C6C 58%, #C49B4F 100%)'
        }}
      >
        <div style={{ flex: '1 1 480px' }}>
          <p className="eyebrow" style={{ color: 'rgba(255,255,255,0.76)', marginBottom: '8px' }}>
            Shared Society Ledger
          </p>
          <h2 style={{ margin: 0, color: '#fff', fontSize: '1.9rem', lineHeight: 1.1 }}>
            Common Expense Tracker
          </h2>
          <p style={{ margin: '14px 0 0 0', color: 'rgba(255,255,255,0.82)', maxWidth: '760px', lineHeight: 1.6 }}>
            April to June 2026 common-expense view with monthly collections, running balances, and
            shared vendor payments. The ledger opening balances are preserved so every closing figure
            matches the source entries.
          </p>
        </div>

        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '12px',
            alignItems: 'center',
            justifyContent: 'flex-end'
          }}
        >
          <div
            style={{
              padding: '10px 14px',
              borderRadius: '999px',
              background: 'rgba(255,255,255,0.16)',
              color: '#fff',
              fontSize: '0.88rem',
              fontWeight: 700
            }}
          >
            {isAdmin ? 'Admin view' : 'Read only'}
          </div>

          <label
            htmlFor="expense-focus-month"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              padding: '10px 14px',
              borderRadius: '14px',
              background: 'rgba(255,255,255,0.12)',
              color: '#fff'
            }}
          >
            <span style={{ fontSize: '0.85rem', fontWeight: 700 }}>Focus month</span>
            <select
              id="expense-focus-month"
              value={activeMonthId}
              onChange={(event) => setActiveMonthId(event.target.value)}
              style={{
                background: 'transparent',
                color: '#fff',
                border: 'none',
                outline: 'none',
                fontWeight: 700,
                cursor: 'pointer'
              }}
            >
              {monthlySummaries.map((month) => (
                <option key={month.id} value={month.id} style={{ color: '#101828' }}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleExport}
            style={{
              border: 'none',
              background: '#fff',
              color: '#0B2B26',
              padding: '12px 18px',
              borderRadius: '14px',
              fontWeight: 800,
              cursor: 'pointer'
            }}
          >
            Export Excel
          </button>
        </div>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(210px, 1fr))',
          gap: '18px'
        }}
      >
        <SummaryCard
          label="Total Collection"
          value={formatCurrency(overallSummary.totalCollection)}
          accent={{ solid: '#196C6C', soft: '#DFF5F1' }}
          caption="3 months"
        />
        <SummaryCard
          label="Total Expense"
          value={formatCurrency(overallSummary.totalExpense)}
          accent={{ solid: '#B42318', soft: '#FEE4E2' }}
          caption={`${overallSummary.totalTransactions} transactions`}
        />
        <SummaryCard
          label="Balance"
          value={formatCurrency(overallSummary.closingBalance)}
          accent={{ solid: closingBalanceTone.color, soft: closingBalanceTone.background }}
          caption="As on 03 Jun 2026"
        />
        <SummaryCard
          label="Avg Monthly Expense"
          value={formatCurrency(overallSummary.averageMonthlyExpense)}
          accent={{ solid: '#C49B4F', soft: '#F8EED8' }}
          caption="Last 3 months"
        />
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'minmax(0, 1.8fr) minmax(300px, 1fr)',
          gap: '22px',
          alignItems: 'start'
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          {monthlySummaries.map((month) => {
            const monthBalanceTone = getBalanceTone(month.closingBalance);

            return (
              <div
                key={month.id}
                className="table-card"
                style={{
                  background: '#fff',
                  borderRadius: '22px',
                  border:
                    month.id === activeMonthId
                      ? '2px solid rgba(25, 108, 108, 0.25)'
                      : '1px solid rgba(61, 63, 52, 0.08)',
                  boxShadow:
                    month.id === activeMonthId
                      ? '0 16px 38px rgba(25, 108, 108, 0.12)'
                      : '0 12px 28px rgba(16, 24, 40, 0.06)'
                }}
              >
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: '18px',
                    flexWrap: 'wrap',
                    padding: '22px 24px 18px',
                    borderBottom: '1px solid rgba(61, 63, 52, 0.08)'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                      <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#101828' }}>{month.label}</h3>
                      <button
                        type="button"
                        onClick={() => setActiveMonthId(month.id)}
                        style={{
                          border: 'none',
                          background: month.id === activeMonthId ? '#0B2B26' : '#F2F4F7',
                          color: month.id === activeMonthId ? '#fff' : '#344054',
                          padding: '6px 12px',
                          borderRadius: '999px',
                          cursor: 'pointer',
                          fontWeight: 700,
                          fontSize: '0.8rem'
                        }}
                      >
                        {month.id === activeMonthId ? 'Focused' : 'Focus'}
                      </button>
                    </div>
                    <p style={{ margin: '10px 0 0 0', fontSize: '0.92rem', color: '#667085' }}>{month.note}</p>
                  </div>

                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                      gap: '12px',
                      flex: '1 1 360px'
                    }}
                  >
                    <div
                      style={{
                        background: '#F9FAFB',
                        borderRadius: '16px',
                        padding: '14px 16px'
                      }}
                    >
                      <p className="eyebrow" style={{ margin: 0 }}>
                        Collection received
                      </p>
                      <p style={{ margin: '8px 0 0 0', fontWeight: 800, fontSize: '1.1rem' }}>
                        {formatCurrency(month.collectionAmount ?? month.freshCollection ?? 0)}
                      </p>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#667085' }}>
                        {formatDate(month.collectionDate || month.openingDate)}
                      </p>
                    </div>
                    <div
                      style={{
                        background: '#F9FAFB',
                        borderRadius: '16px',
                        padding: '14px 16px'
                      }}
                    >
                      <p className="eyebrow" style={{ margin: 0 }}>
                        Opening balance
                      </p>
                      <p style={{ margin: '8px 0 0 0', fontWeight: 800, fontSize: '1.1rem' }}>
                        {formatCurrency(month.openingBalance)}
                      </p>
                      <p style={{ margin: '6px 0 0 0', fontSize: '0.82rem', color: '#667085' }}>
                        Available after carry forward
                      </p>
                    </div>
                    <div
                      style={{
                        background: '#F9FAFB',
                        borderRadius: '16px',
                        padding: '14px 16px'
                      }}
                    >
                      <p className="eyebrow" style={{ margin: 0 }}>
                        Total spent
                      </p>
                      <p style={{ margin: '8px 0 0 0', fontWeight: 800, fontSize: '1.1rem', color: '#B42318' }}>
                        {formatCurrency(month.totalExpense)}
                      </p>
                    </div>
                    <div
                      style={{
                        background: monthBalanceTone.background,
                        borderRadius: '16px',
                        padding: '14px 16px'
                      }}
                    >
                      <p className="eyebrow" style={{ margin: 0 }}>
                        Closing balance
                      </p>
                      <p
                        style={{
                          margin: '8px 0 0 0',
                          fontWeight: 800,
                          fontSize: '1.1rem',
                          color: monthBalanceTone.color
                        }}
                      >
                        {formatCurrency(month.closingBalance)}
                      </p>
                    </div>
                  </div>
                </div>

                <div style={{ padding: '16px 24px', borderBottom: '1px solid rgba(61, 63, 52, 0.04)' }}>
                  {isAdmin && (
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setAddingFor(month.id === addingFor ? null : month.id)}
                        style={{
                          border: 'none',
                          background: '#0B2B26',
                          color: '#fff',
                          padding: '8px 12px',
                          borderRadius: '12px',
                          cursor: 'pointer',
                          fontWeight: 700
                        }}
                      >
                        {addingFor === month.id ? 'Cancel' : 'Add Expense'}
                      </button>
                    </div>
                  )}
                  {addingFor === month.id && (
                    <div style={{ marginTop: '12px', display: 'grid', gap: '8px' }}>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense((s) => ({ ...s, date: e.target.value }))}
                          style={{ padding: '8px', borderRadius: '8px', border: '1px solid #E6E9EE', flex: 1 }}
                        />
                        <input
                          placeholder="Vendor"
                          value={newExpense.vendor}
                          onChange={(e) => setNewExpense((s) => ({ ...s, vendor: e.target.value }))}
                          style={{ padding: '8px', borderRadius: '8px', border: '1px solid #E6E9EE', flex: 1 }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <input
                          placeholder="Remark"
                          value={newExpense.remark}
                          onChange={(e) => setNewExpense((s) => ({ ...s, remark: e.target.value }))}
                          style={{ padding: '8px', borderRadius: '8px', border: '1px solid #E6E9EE', flex: 2 }}
                        />
                        <input
                          placeholder="Category"
                          value={newExpense.category}
                          onChange={(e) => setNewExpense((s) => ({ ...s, category: e.target.value }))}
                          style={{ padding: '8px', borderRadius: '8px', border: '1px solid #E6E9EE', flex: 1 }}
                        />
                        <input
                          placeholder="Amount"
                          type="number"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense((s) => ({ ...s, amount: e.target.value }))}
                          style={{ padding: '8px', borderRadius: '8px', border: '1px solid #E6E9EE', width: '140px' }}
                        />
                      </div>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                        <button
                          type="button"
                          onClick={() => setAddingFor(null)}
                          style={{ padding: '8px 12px', borderRadius: '10px', border: '1px solid #E6E9EE', background: '#fff' }}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddExpense(month.id)}
                          style={{ padding: '8px 12px', borderRadius: '10px', background: '#0B6E4F', color: '#fff', border: 'none' }}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Vendor</th>
                        <th>Remark</th>
                        <th>Category</th>
                        <th style={{ textAlign: 'right' }}>Expense</th>
                        <th style={{ textAlign: 'right' }}>Balance After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {month.expenses.map((expense) => {
                        const chip = getCategoryPalette(expense.category);
                        const balanceTone = getBalanceTone(expense.balanceAfter);

                        return (
                          <tr key={expense.id}>
                            <td>{formatDate(expense.date)}</td>
                            <td>
                              <strong>{expense.vendor}</strong>
                            </td>
                            <td>{expense.remark}</td>
                            <td>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  alignItems: 'center',
                                  padding: '6px 10px',
                                  borderRadius: '999px',
                                  background: chip.soft,
                                  color: chip.solid,
                                  fontWeight: 700,
                                  marginTop: 0
                                }}
                              >
                                {expense.category}
                              </span>
                            </td>
                            <td style={{ textAlign: 'right', fontWeight: 700, color: '#101828' }}>
                              {formatCurrency(expense.amount)}
                            </td>
                            <td style={{ textAlign: 'right' }}>
                              <span
                                style={{
                                  display: 'inline-flex',
                                  justifyContent: 'center',
                                  minWidth: '110px',
                                  padding: '6px 10px',
                                  borderRadius: '999px',
                                  background: balanceTone.background,
                                  color: balanceTone.color,
                                  fontWeight: 800,
                                  marginTop: 0
                                }}
                              >
                                {formatCurrency(expense.balanceAfter)}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="accounting-table-footer">
                      <tr>
                        <td colSpan={4}>Monthly total</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(month.totalExpense)}</td>
                        <td style={{ textAlign: 'right' }}>{formatCurrency(month.closingBalance)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div
            className="accounting-summary-card"
            style={{ borderRadius: '22px', padding: '24px', background: '#fff' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: '16px', alignItems: 'flex-start' }}>
              <div>
                <p className="eyebrow" style={{ margin: 0 }}>
                  Overall Summary (3 Months)
                </p>
                <h3 style={{ margin: '6px 0 0 0', fontSize: '1.35rem', color: '#101828' }}>
                  Focus: {activeMonth.label}
                </h3>
              </div>
              <div
                style={{
                  padding: '8px 12px',
                  borderRadius: '999px',
                  background: activeBalanceTone.background,
                  color: activeBalanceTone.color,
                  fontWeight: 800
                }}
              >
                {formatCurrency(activeMonth.closingBalance)}
              </div>
            </div>

            <div style={{ display: 'grid', gap: '14px', marginTop: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475467' }}>
                <span>Total collection</span>
                <strong style={{ color: '#101828' }}>{formatCurrency(overallSummary.totalCollection)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475467' }}>
                <span>Total expense</span>
                <strong style={{ color: '#101828' }}>{formatCurrency(overallSummary.totalExpense)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: '#475467' }}>
                <span>Ledger balance</span>
                <strong style={{ color: activeBalanceTone.color }}>{formatCurrency(overallSummary.closingBalance)}</strong>
              </div>
            </div>

            <div
              style={{
                marginTop: '18px',
                padding: '14px 16px',
                borderRadius: '16px',
                background: '#F9FAFB',
                color: '#475467',
                fontSize: '0.92rem',
                lineHeight: 1.5
              }}
            >
              Carry-forward before April already reflected in the ledger opening balance:
              {' '}
              <strong style={{ color: '#101828' }}>{formatSignedCurrency(-overallSummary.openingAdjustment)}</strong>
            </div>
          </div>

          <div
            className="accounting-summary-card"
            style={{ borderRadius: '22px', padding: '24px', background: '#fff' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: '12px' }}>
              <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#101828' }}>Monthly Expense Overview</h3>
              <span style={{ fontSize: '0.86rem', color: '#667085' }}>Tap a bar to focus</span>
            </div>

            <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', minHeight: '220px', marginTop: '18px' }}>
              {monthlySummaries.map((month) => {
                const height = maxMonthlyExpense ? (month.totalExpense / maxMonthlyExpense) * 150 : 0;
                const isActive = month.id === activeMonthId;

                return (
                  <button
                    key={month.id}
                    type="button"
                    onClick={() => setActiveMonthId(month.id)}
                    aria-label={`Focus ${month.label}`}
                    style={{
                      flex: 1,
                      border: 'none',
                      background: 'transparent',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '10px',
                      padding: 0
                    }}
                  >
                    <span style={{ fontWeight: 800, color: '#101828', fontSize: '0.9rem' }}>
                      {formatCurrency(month.totalExpense)}
                    </span>
                    <div
                      style={{
                        width: '100%',
                        maxWidth: '78px',
                        height: `${Math.max(height, 28)}px`,
                        borderRadius: '18px 18px 6px 6px',
                        background: isActive
                          ? 'linear-gradient(180deg, #196C6C 0%, #0B2B26 100%)'
                          : 'linear-gradient(180deg, #CFE3E0 0%, #7AA8A1 100%)',
                        boxShadow: isActive ? '0 18px 26px rgba(11, 43, 38, 0.18)' : 'none'
                      }}
                    />
                    <span style={{ fontWeight: 700, color: isActive ? '#0B2B26' : '#667085' }}>
                      {month.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="accounting-summary-card"
            style={{ borderRadius: '22px', padding: '24px', background: '#fff' }}
          >
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#101828' }}>Expense by Category</h3>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '150px minmax(0, 1fr)',
                gap: '18px',
                alignItems: 'center',
                marginTop: '20px'
              }}
            >
              <div
                style={{
                  width: '150px',
                  height: '150px',
                  borderRadius: '50%',
                  background: donutGradient,
                  display: 'grid',
                  placeItems: 'center',
                  margin: '0 auto'
                }}
              >
                <div
                  style={{
                    width: '88px',
                    height: '88px',
                    borderRadius: '50%',
                    background: '#fff',
                    display: 'grid',
                    placeItems: 'center',
                    textAlign: 'center',
                    boxShadow: 'inset 0 0 0 1px rgba(61, 63, 52, 0.08)'
                  }}
                >
                  <div>
                    <p className="eyebrow" style={{ margin: 0 }}>
                      Total
                    </p>
                    <strong style={{ color: '#101828', fontSize: '0.96rem' }}>
                      {formatCurrency(overallSummary.totalExpense)}
                    </strong>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {categoryBreakdown.map((item) => (
                  <div
                    key={item.category}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'auto 1fr auto',
                      gap: '12px',
                      alignItems: 'center'
                    }}
                  >
                    <span
                      style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '999px',
                        background: item.solid
                      }}
                    />
                    <div>
                      <strong style={{ display: 'block', color: '#101828' }}>{item.category}</strong>
                      <span style={{ marginTop: '2px', color: '#667085' }}>
                        {item.percent.toFixed(1)}% of total spend
                      </span>
                    </div>
                    <strong style={{ color: '#101828' }}>{formatCurrency(item.amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="accounting-summary-card"
            style={{ borderRadius: '22px', padding: '24px', background: '#fff' }}
          >
            <h3 style={{ margin: 0, fontSize: '1.15rem', color: '#101828' }}>Tracker Notes</h3>
            <div style={{ display: 'grid', gap: '14px', marginTop: '18px' }}>
              <div style={{ padding: '16px', borderRadius: '16px', background: '#F9FAFB' }}>
                <p className="eyebrow" style={{ margin: 0 }}>
                  Highest spend month
                </p>
                <strong style={{ display: 'block', marginTop: '6px', color: '#101828' }}>
                  {overallSummary.highestMonth.label} at {formatCurrency(overallSummary.highestMonth.totalExpense)}
                </strong>
              </div>
              <div style={{ padding: '16px', borderRadius: '16px', background: '#F9FAFB' }}>
                <p className="eyebrow" style={{ margin: 0 }}>
                  Largest cost head
                </p>
                <strong style={{ display: 'block', marginTop: '6px', color: '#101828' }}>
                  Waterman salary totals {formatCurrency(overallSummary.salarySpend)}
                </strong>
              </div>
              <div style={{ padding: '16px', borderRadius: '16px', background: '#F9FAFB' }}>
                <p className="eyebrow" style={{ margin: 0 }}>
                  Average monthly spend
                </p>
                <strong style={{ display: 'block', marginTop: '6px', color: '#101828' }}>
                  {formatCurrency(overallSummary.averageMonthlyExpense)} across 3 months
                </strong>
              </div>
              <div style={{ padding: '16px', borderRadius: '16px', background: '#F9FAFB' }}>
                <p className="eyebrow" style={{ margin: 0 }}>
                  Balance logic
                </p>
                <strong style={{ display: 'block', marginTop: '6px', color: '#101828' }}>
                  Each month shows the Rs 10,000 collection date and the exact opening balance written in the ledger.
                </strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
