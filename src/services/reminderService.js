/**
 * Reminder and Compliance Service for Majestique Euriska ERP
 * Provides client-side helpers to calculate and filter upcoming expiries,
 * compliance renewals, and automated alert statuses.
 */

/**
 * Calculates days remaining until a target date string.
 * @param {string|Date} dateVal - Target ISO or YYYY-MM-DD date string
 * @param {Date} [referenceDate=new Date()]
 * @returns {number} Days remaining (positive if future, negative if past)
 */
export function calculateDaysRemaining(dateVal, referenceDate = new Date()) {
  if (!dateVal) return Infinity;
  const target = new Date(dateVal);
  if (isNaN(target.getTime())) return Infinity;
  
  const diffTime = target.getTime() - referenceDate.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Evaluates urgency level based on days remaining.
 * @param {number} days
 * @returns {'CRITICAL'|'WARNING'|'NORMAL'|'EXPIRED'}
 */
export function getUrgencyLevel(days) {
  if (days < 0) return 'EXPIRED';
  if (days <= 7) return 'CRITICAL';
  if (days <= 30) return 'WARNING';
  return 'NORMAL';
}

/**
 * Scans list of AMC contracts for renewals within threshold.
 * @param {Array} amcList
 * @param {number} [thresholdDays=60]
 * @param {Date} [referenceDate=new Date()]
 * @returns {Array} Filtered list with urgency level and daysRemaining
 */
export function filterExpiringAMCs(amcList = [], thresholdDays = 60, referenceDate = new Date()) {
  return amcList
    .map(amc => {
      const days = calculateDaysRemaining(amc.endDate, referenceDate);
      return {
        ...amc,
        daysRemaining: days,
        urgency: getUrgencyLevel(days)
      };
    })
    .filter(amc => amc.daysRemaining >= 0 && amc.daysRemaining <= thresholdDays)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Scans list of documents for renewals.
 * @param {Array} docList
 * @param {number} [thresholdDays=45]
 * @param {Date} [referenceDate=new Date()]
 * @returns {Array}
 */
export function filterExpiringDocuments(docList = [], thresholdDays = 45, referenceDate = new Date()) {
  return docList
    .map(doc => {
      const days = calculateDaysRemaining(doc.expiryDate, referenceDate);
      return {
        ...doc,
        daysRemaining: days,
        urgency: getUrgencyLevel(days)
      };
    })
    .filter(doc => doc.daysRemaining >= 0 && doc.daysRemaining <= thresholdDays)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}

/**
 * Scans Fixed Deposits for maturities.
 * @param {Array} fdList
 * @param {number} [thresholdDays=30]
 * @param {Date} [referenceDate=new Date()]
 * @returns {Array}
 */
export function filterMaturingFDs(fdList = [], thresholdDays = 30, referenceDate = new Date()) {
  return fdList
    .map(fd => {
      const days = calculateDaysRemaining(fd.maturityDate, referenceDate);
      return {
        ...fd,
        daysRemaining: days,
        urgency: getUrgencyLevel(days)
      };
    })
    .filter(fd => fd.daysRemaining >= 0 && fd.daysRemaining <= thresholdDays)
    .sort((a, b) => a.daysRemaining - b.daysRemaining);
}
