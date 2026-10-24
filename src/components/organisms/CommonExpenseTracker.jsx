import { useMemo, useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { db, ensureFirebaseSession, isFirebaseConfigured } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import './CommonExpenseTracker.css';


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
      className="accounting-summary-card common-expense-tracker-s1"
    >
      <div
        className="common-expense-tracker-s2" style={{ background: accent.soft, color: accent.solid }}
      >
        {label.slice(0, 2).toUpperCase()}
      </div>
      <p className="eyebrow common-expense-tracker-s3">
        {label}
      </p>
      <p className="common-expense-tracker-s4">{value}</p>
      <p className="common-expense-tracker-s5">{caption}</p>
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
        className="dashboard-hero-card common-expense-tracker-s6"
      >
        <div className="common-expense-tracker-s7">
          <p className="eyebrow common-expense-tracker-s8">
            Shared Society Ledger
          </p>
          <h2 className="common-expense-tracker-s9">
            Common Expense Tracker
          </h2>
          <p className="common-expense-tracker-s10">
            April to June 2026 common-expense view with monthly collections, running balances, and
            shared vendor payments. The ledger opening balances are preserved so every closing figure
            matches the source entries.
          </p>
        </div>

        <div
          className="common-expense-tracker-s11"
        >
          <div
            className="common-expense-tracker-s12"
          >
            {isAdmin ? 'Admin view' : 'Read only'}
          </div>

          <label
            htmlFor="expense-focus-month"
            className="common-expense-tracker-s13"
          >
            <span className="common-expense-tracker-s14">Focus month</span>
            <select
              id="expense-focus-month"
              value={activeMonthId}
              onChange={(event) => setActiveMonthId(event.target.value)}
              className="common-expense-tracker-s15"
            >
              {monthlySummaries.map((month) => (
                <option key={month.id} value={month.id} className="common-expense-tracker-s16">
                  {month.label}
                </option>
              ))}
            </select>
          </label>

          <button
            type="button"
            onClick={handleExport}
            className="common-expense-tracker-s17"
          >
            Export Excel
          </button>
        </div>
      </div>

      <div
        className="common-expense-tracker-s18"
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
        className="common-expense-tracker-s19"
      >
        <div className="common-expense-tracker-s20">
          {monthlySummaries.map((month) => {
            const monthBalanceTone = getBalanceTone(month.closingBalance);

            return (
              <div
                key={month.id}
                className={`table-card common-expense-tracker-s21 ${(month.id === activeMonthId ? 'common-expense-tracker-cond-1-true' : 'common-expense-tracker-cond-2-false')}`}
              >
                <div
                  className="common-expense-tracker-s22"
                >
                  <div>
                    <div className="common-expense-tracker-s23">
                      <h3 className="common-expense-tracker-s24">{month.label}</h3>
                      <button
                        type="button"
                        onClick={() => setActiveMonthId(month.id)}
                        className={`common-expense-tracker-s25 ${(month.id === activeMonthId ? 'common-expense-tracker-cond-3-true' : 'common-expense-tracker-cond-4-false')}`}
                      >
                        {month.id === activeMonthId ? 'Focused' : 'Focus'}
                      </button>
                    </div>
                    <p className="common-expense-tracker-s26">{month.note}</p>
                  </div>

                  <div
                    className="common-expense-tracker-s27"
                  >
                    <div
                      className="common-expense-tracker-s28"
                    >
                      <p className="eyebrow common-expense-tracker-s29">
                        Collection received
                      </p>
                      <p className="common-expense-tracker-s30">
                        {formatCurrency(month.collectionAmount ?? month.freshCollection ?? 0)}
                      </p>
                      <p className="common-expense-tracker-s31">
                        {formatDate(month.collectionDate || month.openingDate)}
                      </p>
                    </div>
                    <div
                      className="common-expense-tracker-s28"
                    >
                      <p className="eyebrow common-expense-tracker-s29">
                        Opening balance
                      </p>
                      <p className="common-expense-tracker-s30">
                        {formatCurrency(month.openingBalance)}
                      </p>
                      <p className="common-expense-tracker-s31">
                        Available after carry forward
                      </p>
                    </div>
                    <div
                      className="common-expense-tracker-s28"
                    >
                      <p className="eyebrow common-expense-tracker-s29">
                        Total spent
                      </p>
                      <p className="common-expense-tracker-s32">
                        {formatCurrency(month.totalExpense)}
                      </p>
                    </div>
                    <div
                      className="common-expense-tracker-s33" style={{ background: monthBalanceTone.background }}
                    >
                      <p className="eyebrow common-expense-tracker-s29">
                        Closing balance
                      </p>
                      <p
                        className="common-expense-tracker-s30" style={{ color: monthBalanceTone.color }}
                      >
                        {formatCurrency(month.closingBalance)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="common-expense-tracker-s34">
                  {isAdmin && (
                    <div className="common-expense-tracker-s35">
                      <button
                        type="button"
                        onClick={() => setAddingFor(month.id === addingFor ? null : month.id)}
                        className="common-expense-tracker-s36"
                      >
                        {addingFor === month.id ? 'Cancel' : 'Add Expense'}
                      </button>
                    </div>
                  )}
                  {addingFor === month.id && (
                    <div className="common-expense-tracker-s37">
                      <div className="common-expense-tracker-s38">
                        <input
                          type="date"
                          value={newExpense.date}
                          onChange={(e) => setNewExpense((s) => ({ ...s, date: e.target.value }))}
                          className="common-expense-tracker-s39"
                        />
                        <input
                          placeholder="Vendor"
                          value={newExpense.vendor}
                          onChange={(e) => setNewExpense((s) => ({ ...s, vendor: e.target.value }))}
                          className="common-expense-tracker-s39"
                        />
                      </div>
                      <div className="common-expense-tracker-s38">
                        <input
                          placeholder="Remark"
                          value={newExpense.remark}
                          onChange={(e) => setNewExpense((s) => ({ ...s, remark: e.target.value }))}
                          className="common-expense-tracker-s40"
                        />
                        <input
                          placeholder="Category"
                          value={newExpense.category}
                          onChange={(e) => setNewExpense((s) => ({ ...s, category: e.target.value }))}
                          className="common-expense-tracker-s39"
                        />
                        <input
                          placeholder="Amount"
                          type="number"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense((s) => ({ ...s, amount: e.target.value }))}
                          className="common-expense-tracker-s41"
                        />
                      </div>
                      <div className="common-expense-tracker-s42">
                        <button
                          type="button"
                          onClick={() => setAddingFor(null)}
                          className="common-expense-tracker-s43"
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          onClick={() => handleAddExpense(month.id)}
                          className="common-expense-tracker-s44"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div className="common-expense-tracker-s45">
                  <table>
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Vendor</th>
                        <th>Remark</th>
                        <th>Category</th>
                        <th className="common-expense-tracker-s46">Expense</th>
                        <th className="common-expense-tracker-s46">Balance After</th>
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
                                className="common-expense-tracker-s47" style={{ background: chip.soft, color: chip.solid }}
                              >
                                {expense.category}
                              </span>
                            </td>
                            <td className="common-expense-tracker-s48">
                              {formatCurrency(expense.amount)}
                            </td>
                            <td className="common-expense-tracker-s46">
                              <span
                                className="common-expense-tracker-s49" style={{ background: balanceTone.background, color: balanceTone.color }}
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
                        <td className="common-expense-tracker-s46">{formatCurrency(month.totalExpense)}</td>
                        <td className="common-expense-tracker-s46">{formatCurrency(month.closingBalance)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            );
          })}
        </div>

        <div className="common-expense-tracker-s20">
          <div
            className="accounting-summary-card common-expense-tracker-s50"
          >
            <div className="common-expense-tracker-s51">
              <div>
                <p className="eyebrow common-expense-tracker-s29">
                  Overall Summary (3 Months)
                </p>
                <h3 className="common-expense-tracker-s52">
                  Focus: {activeMonth.label}
                </h3>
              </div>
              <div
                className="common-expense-tracker-s53" style={{ background: activeBalanceTone.background, color: activeBalanceTone.color }}
              >
                {formatCurrency(activeMonth.closingBalance)}
              </div>
            </div>

            <div className="common-expense-tracker-s54">
              <div className="common-expense-tracker-s55">
                <span>Total collection</span>
                <strong className="common-expense-tracker-s16">{formatCurrency(overallSummary.totalCollection)}</strong>
              </div>
              <div className="common-expense-tracker-s55">
                <span>Total expense</span>
                <strong className="common-expense-tracker-s16">{formatCurrency(overallSummary.totalExpense)}</strong>
              </div>
              <div className="common-expense-tracker-s55">
                <span>Ledger balance</span>
                <strong style={{ color: activeBalanceTone.color }}>{formatCurrency(overallSummary.closingBalance)}</strong>
              </div>
            </div>

            <div
              className="common-expense-tracker-s56"
            >
              Carry-forward before April already reflected in the ledger opening balance:
              {' '}
              <strong className="common-expense-tracker-s16">{formatSignedCurrency(-overallSummary.openingAdjustment)}</strong>
            </div>
          </div>

          <div
            className="accounting-summary-card common-expense-tracker-s50"
          >
            <div className="common-expense-tracker-s57">
              <h3 className="common-expense-tracker-s58">Monthly Expense Overview</h3>
              <span className="common-expense-tracker-s59">Tap a bar to focus</span>
            </div>

            <div className="common-expense-tracker-s60">
              {monthlySummaries.map((month) => {
                const height = maxMonthlyExpense ? (month.totalExpense / maxMonthlyExpense) * 150 : 0;
                const isActive = month.id === activeMonthId;

                return (
                  <button
                    key={month.id}
                    type="button"
                    onClick={() => setActiveMonthId(month.id)}
                    aria-label={`Focus ${month.label}`}
                    className="common-expense-tracker-s61"
                  >
                    <span className="common-expense-tracker-s62">
                      {formatCurrency(month.totalExpense)}
                    </span>
                    <div
                      className={`common-expense-tracker-s63 ${(isActive ? 'common-expense-tracker-cond-5-true' : 'common-expense-tracker-cond-6-false')}`} style={{ height: `${Math.max(height, 28)}px` }}
                    />
                    <span className={`common-expense-tracker-s64 ${(isActive ? 'common-expense-tracker-cond-7-true' : 'common-expense-tracker-cond-8-false')}`}>
                      {month.label.split(' ')[0]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          <div
            className="accounting-summary-card common-expense-tracker-s50"
          >
            <h3 className="common-expense-tracker-s58">Expense by Category</h3>
            <div
              className="common-expense-tracker-s65"
            >
              <div
                className="common-expense-tracker-s66" style={{ background: donutGradient }}
              >
                <div
                  className="common-expense-tracker-s67"
                >
                  <div>
                    <p className="eyebrow common-expense-tracker-s29">
                      Total
                    </p>
                    <strong className="common-expense-tracker-s68">
                      {formatCurrency(overallSummary.totalExpense)}
                    </strong>
                  </div>
                </div>
              </div>

              <div className="common-expense-tracker-s69">
                {categoryBreakdown.map((item) => (
                  <div
                    key={item.category}
                    className="common-expense-tracker-s70"
                  >
                    <span
                      className="common-expense-tracker-s71" style={{ background: item.solid }}
                    />
                    <div>
                      <strong className="common-expense-tracker-s72">{item.category}</strong>
                      <span className="common-expense-tracker-s73">
                        {item.percent.toFixed(1)}% of total spend
                      </span>
                    </div>
                    <strong className="common-expense-tracker-s16">{formatCurrency(item.amount)}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div
            className="accounting-summary-card common-expense-tracker-s50"
          >
            <h3 className="common-expense-tracker-s58">Tracker Notes</h3>
            <div className="common-expense-tracker-s74">
              <div className="common-expense-tracker-s75">
                <p className="eyebrow common-expense-tracker-s29">
                  Highest spend month
                </p>
                <strong className="common-expense-tracker-s76">
                  {overallSummary.highestMonth.label} at {formatCurrency(overallSummary.highestMonth.totalExpense)}
                </strong>
              </div>
              <div className="common-expense-tracker-s75">
                <p className="eyebrow common-expense-tracker-s29">
                  Largest cost head
                </p>
                <strong className="common-expense-tracker-s76">
                  Waterman salary totals {formatCurrency(overallSummary.salarySpend)}
                </strong>
              </div>
              <div className="common-expense-tracker-s75">
                <p className="eyebrow common-expense-tracker-s29">
                  Average monthly spend
                </p>
                <strong className="common-expense-tracker-s76">
                  {formatCurrency(overallSummary.averageMonthlyExpense)} across 3 months
                </strong>
              </div>
              <div className="common-expense-tracker-s75">
                <p className="eyebrow common-expense-tracker-s29">
                  Balance logic
                </p>
                <strong className="common-expense-tracker-s76">
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
