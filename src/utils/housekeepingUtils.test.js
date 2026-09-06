import { describe, it, expect } from 'vitest';
import { daysInMonth, calcBill } from './housekeepingUtils';

describe('housekeepingUtils', () => {
  it('correctly calculates days in month', () => {
    expect(daysInMonth('2026-02')).toBe(28);
    expect(daysInMonth('2026-01')).toBe(31);
    expect(daysInMonth('2026-04')).toBe(30);
  });

  it('calculates bill correctly for equal building units', () => {
    const form = {
      unitsA: 100,
      unitsB: 100,
      unitsC: 100,
      aWage: 3000,
      bWage: 3000,
      cWage: 3000,
      supervisorSalary: 6000,
      commonSalary: 3000,
      garbageTotal: 900,
      tractorTrips: 2,
      tractorRate: 500,
      stpSalary: 1200,
      aDays: '',
      bDays: '',
      cDays: '',
      supervisorDays: '',
      commonAbsent: '',
    };

    const res = calcBill(form, '2026-04');
    expect(res).not.toBeNull();
    expect(res.grandTotal).toBeGreaterThan(0);
    expect(res.rows).toHaveLength(3);
    expect(res.tractTotal).toBe(1000);
  });

  it('returns null if total units is 0', () => {
    const form = { unitsA: 0, unitsB: 0, unitsC: 0 };
    expect(calcBill(form, '2026-04')).toBeNull();
  });
});
