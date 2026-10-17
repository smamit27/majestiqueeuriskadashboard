import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSocietyKpis } from './useSocietyKpis.js';
import { useFinanceKpis } from './useFinanceKpis.js';
import { useMaintenanceKpis } from './useMaintenanceKpis.js';
import { useOperationsKpis } from './useOperationsKpis.js';

describe('Liquid Glass KPI Hooks Suite', () => {
  it('useSocietyKpis verifies 229 total flats and wing breakdown', () => {
    const { result } = renderHook(() => useSocietyKpis());

    expect(result.current.totalFlats).toBe(229);
    expect(result.current.breakdownByBuilding.buildingA).toBe(87);
    expect(result.current.breakdownByBuilding.buildingB).toBe(96);
    expect(result.current.breakdownByBuilding.buildingC).toBe(46);
    expect(result.current.totalShops).toBe(14);
    expect(result.current.occupiedFlats).toBeGreaterThan(0);
    expect(result.current.registeredResidents).toBeGreaterThan(0);
  });

  it('useFinanceKpis calculates billed, collected, and collection percentage accurately', () => {
    const { result } = renderHook(() =>
      useFinanceKpis({
        stats: { collectionTarget: 300000, duesCollected: 270000 },
        shopData: [
          { ledger: [{ netAmount: 15000 }] }
        ]
      })
    );

    expect(result.current.maintenanceBilled).toBe(300000);
    expect(result.current.maintenanceCollected).toBe(270000);
    expect(result.current.collectionPercentage).toBe(90);
    expect(result.current.shopOutstanding).toBe(15000);
    expect(result.current.totalOutstanding).toBe(45000); // 15000 shop + 30000 flat
    expect(result.current.reserveFunds).toBeGreaterThanOrEqual(2500000);
  });

  it('useMaintenanceKpis aggregates open, in-progress, and resolved requests', () => {
    const { result } = renderHook(() =>
      useMaintenanceKpis({
        complaintsData: [
          { id: 1, status: 'Open', category: 'Plumbing' },
          { id: 2, status: 'In Progress', category: 'Electrical' },
          { id: 3, status: 'Resolved', category: 'Security' }
        ],
        tasks: [
          { id: 10, deadline: '2020-01-01', status: 'Pending', assignedTo: 'Vendor A' }
        ]
      })
    );

    expect(result.current.totalOpenRequests).toBe(2);
    expect(result.current.awaitingAssignment).toBe(1);
    expect(result.current.inProgress).toBe(1);
    expect(result.current.resolvedRequests).toBe(1);
    expect(result.current.overdueTasks).toBe(1);
    expect(result.current.vendorWorkOrders).toBe(1);
  });

  it('useOperationsKpis returns security, housekeeping, and AMC counts', () => {
    const { result } = renderHook(() =>
      useOperationsKpis({
        amcAlerts: [{ id: 1, name: 'Lift AMC', days: 15 }]
      })
    );

    expect(result.current.securityStaffCount).toBeGreaterThanOrEqual(4);
    expect(result.current.housekeepingStaffCount).toBeGreaterThanOrEqual(4);
    expect(result.current.activeAmcContracts).toBe(8);
    expect(result.current.upcomingAmcRenewals).toBe(1);
    expect(result.current.parkingTotal).toBe(142);
  });
});
