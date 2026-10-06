import { describe, it, expect } from 'vitest';
import {
  calculateDaysRemaining,
  getUrgencyLevel,
  filterExpiringAMCs,
  filterExpiringDocuments,
  filterMaturingFDs,
} from './reminderService';

describe('reminderService', () => {
  const refDate = new Date('2026-10-06T00:00:00Z');

  describe('calculateDaysRemaining', () => {
    it('returns positive days for future date', () => {
      const days = calculateDaysRemaining('2026-10-16T00:00:00Z', refDate);
      expect(days).toBe(10);
    });

    it('returns negative days for past date', () => {
      const days = calculateDaysRemaining('2026-10-01T00:00:00Z', refDate);
      expect(days).toBe(-5);
    });

    it('returns Infinity for invalid or null dates', () => {
      expect(calculateDaysRemaining(null, refDate)).toBe(Infinity);
      expect(calculateDaysRemaining('invalid-date', refDate)).toBe(Infinity);
    });
  });

  describe('getUrgencyLevel', () => {
    it('categorizes correctly according to thresholds', () => {
      expect(getUrgencyLevel(-1)).toBe('EXPIRED');
      expect(getUrgencyLevel(3)).toBe('CRITICAL');
      expect(getUrgencyLevel(7)).toBe('CRITICAL');
      expect(getUrgencyLevel(15)).toBe('WARNING');
      expect(getUrgencyLevel(30)).toBe('WARNING');
      expect(getUrgencyLevel(45)).toBe('NORMAL');
    });
  });

  describe('filterExpiringAMCs', () => {
    it('filters and sorts contracts within threshold', () => {
      const amcs = [
        { id: '1', vendorName: 'Elevator Co', endDate: '2026-10-10' }, // 4 days -> CRITICAL
        { id: '2', vendorName: 'Gym Maintenance', endDate: '2026-11-01' }, // 26 days -> WARNING
        { id: '3', vendorName: 'Garden Care', endDate: '2027-05-01' }, // 207 days -> excluded
        { id: '4', vendorName: 'Pest Control', endDate: '2026-09-01' }, // expired -> excluded
      ];

      const result = filterExpiringAMCs(amcs, 60, refDate);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('1');
      expect(result[0].urgency).toBe('CRITICAL');
      expect(result[1].id).toBe('2');
      expect(result[1].urgency).toBe('WARNING');
    });
  });

  describe('filterExpiringDocuments and filterMaturingFDs', () => {
    it('correctly filters documents and FDs', () => {
      const docs = [
        { id: 'd1', title: 'Fire NOC', expiryDate: '2026-10-20' }, // 14 days
        { id: 'd2', title: 'Bylaws', expiryDate: '2028-01-01' },
      ];
      const docResults = filterExpiringDocuments(docs, 45, refDate);
      expect(docResults).toHaveLength(1);
      expect(docResults[0].id).toBe('d1');

      const fds = [
        { id: 'f1', bankName: 'SBI', maturityDate: '2026-10-16' }, // 10 days
        { id: 'f2', bankName: 'HDFC', maturityDate: '2027-01-01' },
      ];
      const fdResults = filterMaturingFDs(fds, 30, refDate);
      expect(fdResults).toHaveLength(1);
      expect(fdResults[0].id).toBe('f1');
    });
  });
});
