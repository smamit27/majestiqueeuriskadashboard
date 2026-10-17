import { useMemo } from 'react';
import { complaints as mockComplaints } from '../data/mockData.js';

function calcDaysLeft(deadline, status) {
  if (!deadline || status === 'Done' || status === 'Resolved') return null;
  return Math.ceil((new Date(deadline) - new Date()) / 86400000);
}

/**
 * Hook to provide verified Maintenance & Facility KPIs
 * Aggregates live complaints and manager tasks telemetry
 */
export function useMaintenanceKpis({
  complaintsData = mockComplaints,
  tasks = [],
  loading = false,
  error = null
} = {}) {
  const kpis = useMemo(() => {
    const allComplaints = complaintsData || [];
    const openComplaints = allComplaints.filter((c) => c.status !== 'Resolved');
    const resolvedComplaints = allComplaints.filter((c) => c.status === 'Resolved');

    const awaitingAssignment = openComplaints.filter((c) => c.status === 'Open' || c.status === 'Pending').length;
    const inProgress = openComplaints.filter((c) => c.status === 'In Progress').length;
    const escalated = openComplaints.filter((c) => c.status === 'Escalated').length;

    // Overdue tasks
    const overdueTasks = (tasks || []).filter((t) => {
      const d = calcDaysLeft(t.deadline, t.status);
      return d !== null && d < 0;
    }).length;

    // Vendor work orders pending (tasks assigned to external vendors or AMC)
    const vendorWorkOrders = (tasks || []).filter((t) =>
      t.status !== 'Done' && (t.assignedTo?.toLowerCase().includes('vendor') || t.taskCategory?.toLowerCase().includes('amc'))
    ).length;

    // Categorical breakdown
    const categoryCounts = allComplaints.reduce((acc, c) => {
      const cat = c.category || 'General';
      acc[cat] = (acc[cat] || 0) + 1;
      return acc;
    }, {});

    return {
      totalOpenRequests: openComplaints.length,
      awaitingAssignment,
      inProgress,
      escalated,
      resolvedRequests: resolvedComplaints.length,
      totalRequests: allComplaints.length,
      overdueTasks,
      vendorWorkOrders,
      categoryCounts
    };
  }, [complaintsData, tasks]);

  return {
    ...kpis,
    loading,
    error
  };
}
