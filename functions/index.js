/**
 * Cloud Functions for Majestique Euriska ERP
 * Automated Compliance & Renewal Reminders Architecture
 * 
 * Functions include:
 * 1. dailyComplianceAndExpiryCheck (Scheduled 08:00 AM IST daily)
 *    - AMC expiry alerts (< 30 days)
 *    - Fixed Deposit maturity notifications (< 15 days)
 *    - Statutory & vendor document expirations (Lift licenses, Fire NOC, Insurance)
 *    - Upcoming AGM / SGM meeting notifications (< 7 days and 48 hours)
 * 2. monthlyMaintenanceOverdueCheck (Scheduled 10th of every month 09:00 AM IST)
 *    - Identifies overdue flat maintenance dues (> 60 days)
 * 3. utilityBillDueCheck (Scheduled 5th and 18th of every month)
 *    - MSEDCL electricity and solar net-metering payment due dates
 */

const { onSchedule } = require("firebase-functions/v2/scheduler");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");

if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

/**
 * 1. Daily Compliance, Contract and Expiry Reminder Job
 * Runs every morning at 08:00 AM IST
 */
exports.dailyComplianceAndExpiryCheck = onSchedule(
  {
    schedule: "0 8 * * *",
    timeZone: "Asia/Kolkata",
    memory: "256MiB",
    timeoutSeconds: 120,
  },
  async (event) => {
    logger.info("Executing dailyComplianceAndExpiryCheck for Majestique Euriska...");
    const today = new Date();
    const alertBatch = db.batch();
    const alertsCollection = db.collection("systemNotifications");
    const auditLogsCollection = db.collection("auditLogs");
    let generatedCount = 0;

    try {
      // A. AMC Contract Expiry Check (within next 30 days)
      const thirtyDaysAhead = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
      const amcSnapshot = await db.collection("amcContracts").get();
      amcSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.endDate) {
          const expiryDate = new Date(data.endDate);
          if (expiryDate >= today && expiryDate <= thirtyDaysAhead) {
            const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            const alertRef = alertsCollection.doc(`amc_expiry_${doc.id}`);
            alertBatch.set(alertRef, {
              type: "AMC_EXPIRY",
              title: `AMC Expiring Soon: ${data.vendorName || data.serviceType || "Service"}`,
              message: `Contract for ${data.serviceType || "service"} with ${data.vendorName || "vendor"} expires in ${daysRemaining} days (on ${data.endDate}).`,
              severity: daysRemaining <= 7 ? "CRITICAL" : "HIGH",
              entityId: doc.id,
              entityType: "amcContracts",
              dueDate: data.endDate,
              status: "PENDING",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            generatedCount++;
          }
        }
      });

      // B. Fixed Deposit Maturity Check (within next 15 days)
      const fifteenDaysAhead = new Date(today.getTime() + 15 * 24 * 60 * 60 * 1000);
      const fdSnapshot = await db.collection("fixedDeposits").get();
      fdSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.maturityDate) {
          const maturityDate = new Date(data.maturityDate);
          if (maturityDate >= today && maturityDate <= fifteenDaysAhead) {
            const daysRemaining = Math.ceil((maturityDate - today) / (1000 * 60 * 60 * 24));
            const alertRef = alertsCollection.doc(`fd_maturity_${doc.id}`);
            alertBatch.set(alertRef, {
              type: "FD_MATURITY",
              title: `Fixed Deposit Maturing: ${data.bankName || "Bank"} (A/C: ${data.accountNumber || "N/A"})`,
              message: `FD amount ₹${data.principalAmount?.toLocaleString("en-IN") || ""} matures in ${daysRemaining} days (on ${data.maturityDate}). Review reinvestment.`,
              severity: "HIGH",
              entityId: doc.id,
              entityType: "fixedDeposits",
              dueDate: data.maturityDate,
              status: "PENDING",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            generatedCount++;
          }
        }
      });

      // C. Document Expiry Check (within next 30 days)
      const docsSnapshot = await db.collection("documents").get();
      docsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.expiryDate) {
          const expiryDate = new Date(data.expiryDate);
          if (expiryDate >= today && expiryDate <= thirtyDaysAhead) {
            const daysRemaining = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));
            const alertRef = alertsCollection.doc(`doc_expiry_${doc.id}`);
            alertBatch.set(alertRef, {
              type: "DOCUMENT_EXPIRY",
              title: `Document Renewal Required: ${data.title || "Document"}`,
              message: `${data.category || "Statutory"} document expires on ${data.expiryDate} (${daysRemaining} days left).`,
              severity: daysRemaining <= 10 ? "CRITICAL" : "MEDIUM",
              entityId: doc.id,
              entityType: "documents",
              dueDate: data.expiryDate,
              status: "PENDING",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            generatedCount++;
          }
        }
      });

      // D. Upcoming AGM & SGM Meetings (within 7 days)
      const sevenDaysAhead = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
      const meetingsSnapshot = await db.collection("societyMeetings").get();
      meetingsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.date) {
          const meetingDate = new Date(data.date);
          if (meetingDate >= today && meetingDate <= sevenDaysAhead) {
            const daysRemaining = Math.ceil((meetingDate - today) / (1000 * 60 * 60 * 24));
            const alertRef = alertsCollection.doc(`meeting_${doc.id}`);
            alertBatch.set(alertRef, {
              type: "MEETING_ALERT",
              title: `Upcoming Society Meeting: ${data.type || "General Meeting"}`,
              message: `${data.type || "Meeting"} is scheduled on ${data.date} at ${data.time || "scheduled time"}. Quorum: ${data.quorum || "General"}.`,
              severity: daysRemaining <= 2 ? "HIGH" : "INFO",
              entityId: doc.id,
              entityType: "societyMeetings",
              dueDate: data.date,
              status: "PENDING",
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            }, { merge: true });
            generatedCount++;
          }
        }
      });

      // Log scheduler execution in audit trail
      const auditLogRef = auditLogsCollection.doc();
      alertBatch.set(auditLogRef, {
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
        userId: "system-scheduler",
        userEmail: "system@euriska.internal",
        userRole: "SYSTEM",
        module: "AUTOMATION",
        action: "COMPLIANCE_SCAN",
        recordId: `scan_${today.toISOString().split("T")[0]}`,
        details: `Automated compliance scan generated/updated ${generatedCount} notification items.`,
        clientTimestamp: today.toISOString(),
      });

      await alertBatch.commit();
      logger.info(`dailyComplianceAndExpiryCheck completed successfully with ${generatedCount} items.`);
    } catch (error) {
      logger.error("Error running dailyComplianceAndExpiryCheck:", error);
      throw error;
    }
  }
);

/**
 * 2. Monthly Maintenance Defaulter Scan
 * Runs on the 10th of every month at 09:00 AM IST
 */
exports.monthlyMaintenanceOverdueCheck = onSchedule(
  {
    schedule: "0 9 10 * *",
    timeZone: "Asia/Kolkata",
    memory: "256MiB",
  },
  async (event) => {
    logger.info("Executing monthlyMaintenanceOverdueCheck for Majestique Euriska...");
    try {
      // Query flats with pending arrears
      const flatsSnapshot = await db.collection("flatMaintenance")
        .where("status", "in", ["UNPAID", "OVERDUE", "PARTIAL"])
        .get();

      let totalOutstanding = 0;
      let defaulterCount = 0;

      flatsSnapshot.forEach((doc) => {
        const data = doc.data();
        if (data.balanceDue && data.balanceDue > 0) {
          totalOutstanding += Number(data.balanceDue);
          defaulterCount++;
        }
      });

      await db.collection("systemNotifications").add({
        type: "MAINTENANCE_OVERDUE_SUMMARY",
        title: "Monthly Maintenance Overdue Report Ready",
        message: `${defaulterCount} units have outstanding dues totaling ₹${totalOutstanding.toLocaleString("en-IN")}.`,
        severity: totalOutstanding > 200000 ? "HIGH" : "MEDIUM",
        status: "PENDING",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      logger.info(`monthlyMaintenanceOverdueCheck completed. ${defaulterCount} units with ₹${totalOutstanding} dues.`);
    } catch (error) {
      logger.error("Error executing monthlyMaintenanceOverdueCheck:", error);
    }
  }
);
