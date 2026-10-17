import { useMemo } from 'react';
import { initialTenantData } from '../data/tenantSeedData.js';
import { complaints as mockComplaints } from '../data/mockData.js';

export const SOCIETY_FLATS_CONFIG = {
  total: 229,
  buildingA: 87,
  buildingB: 96,
  buildingC: 46,
  shops: 14
};

/**
 * Hook to provide verified Society-level KPIs
 * Reuses live tenantData and complaints telemetry
 */
export function useSocietyKpis({ tenantData = initialTenantData, complaintsData = mockComplaints, loading = false, error = null } = {}) {
  const kpis = useMemo(() => {
    const residentialFlats = (tenantData || []).filter((t) => t.flatType === 'Residential' || !t.flatType);
    const ownersCount = residentialFlats.filter((t) => t.occupantType === 'Owner').length;
    const tenantsCount = residentialFlats.filter((t) => t.occupantType === 'Tenant').length;
    const occupiedFlatsWingA = ownersCount + tenantsCount;
    const vacantFlatsWingA = Math.max(0, SOCIETY_FLATS_CONFIG.buildingA - occupiedFlatsWingA);

    const activeResidents = residentialFlats.reduce((sum, t) => sum + (Number(t.activeUsers) || 1), 0);
    const openComplaintsCount = (complaintsData || []).filter((c) => c.status !== 'Resolved').length;

    return {
      totalFlats: SOCIETY_FLATS_CONFIG.total,
      breakdownByBuilding: {
        buildingA: SOCIETY_FLATS_CONFIG.buildingA,
        buildingB: SOCIETY_FLATS_CONFIG.buildingB,
        buildingC: SOCIETY_FLATS_CONFIG.buildingC,
      },
      occupiedFlats: occupiedFlatsWingA,
      vacantFlats: vacantFlatsWingA,
      occupancyRate: Math.round((occupiedFlatsWingA / SOCIETY_FLATS_CONFIG.buildingA) * 100),
      registeredResidents: activeResidents,
      activeTenants: tenantsCount,
      activeOwners: ownersCount,
      openComplaints: openComplaintsCount,
      totalShops: SOCIETY_FLATS_CONFIG.shops
    };
  }, [tenantData, complaintsData]);

  return {
    ...kpis,
    loading,
    error
  };
}
