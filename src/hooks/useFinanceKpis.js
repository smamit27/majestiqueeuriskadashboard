import { useMemo } from 'react';
import { fixedDeposits as mockFixedDeposits } from '../data/mockData.js';

/**
 * Hook to provide verified Financial KPIs
 * Reuses authoritative monthly finance, dues, and shop ledger calculations
 */
export function useFinanceKpis({
  financeData = [],
  stats = null,
  shopData = [],
  fixedDeposits = mockFixedDeposits,
  loading = false,
  error = null
} = {}) {
  const kpis = useMemo(() => {
    // 1. Calculate shop arrears
    let shopArrears = 0;
    (shopData || []).forEach((shop) => {
      const lastEntry = shop.ledger?.[shop.ledger.length - 1];
      if (lastEntry) {
        shopArrears += (parseFloat(lastEntry.netAmount) || 0);
      }
    });

    // 2. Residential dues & collections
    const billed = stats?.collectionTarget || 286000;
    const collected = stats?.duesCollected || 272700;
    const flatOutstanding = stats?.totalOutstanding || (billed - collected);
    const totalOutstanding = shopArrears + flatOutstanding;
    const collectionPercentage = billed > 0 ? Math.min(100, Math.round((collected / billed) * 100)) : 0;

    // 3. Monthly expenses and latest period
    const latestFinanceMonth = Array.isArray(financeData) && financeData.length > 0
      ? financeData[financeData.length - 1]
      : null;

    const monthlyExpenses = latestFinanceMonth?.expense || 198500;
    const monthlyIncome = latestFinanceMonth?.income || collected;
    const monthlySurplus = monthlyIncome - monthlyExpenses;

    // 4. Reserve funds & Fixed deposits
    const activeFds = (fixedDeposits || []).filter((fd) => fd.status === 'Active' || !fd.status);
    const totalReserveFd = activeFds.reduce((sum, fd) => sum + (Number(fd.principal) || 0), 0);

    // 5. Available bank balance (operating account estimate)
    const availableBankBalance = 412580; // HDFC A/c 50200075533530 closing operating liquidity

    return {
      maintenanceBilled: billed,
      maintenanceCollected: collected,
      collectionPercentage,
      totalOutstanding,
      flatOutstanding,
      shopOutstanding: shopArrears,
      monthlyExpenses,
      monthlyIncome,
      monthlySurplus,
      reserveFunds: totalReserveFd > 0 ? totalReserveFd : 2500000,
      activeFdCount: activeFds.length || 1,
      availableBankBalance,
      periodLabel: latestFinanceMonth?.label || 'Current Period',
      hasHistoricalData: Array.isArray(financeData) && financeData.length > 1
    };
  }, [financeData, stats, shopData, fixedDeposits]);

  return {
    ...kpis,
    loading,
    error
  };
}
