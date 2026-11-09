import { getCompany, getBranches, getDepartments } from './organizationService';
import { getUsers } from './userService';
import { isDemoModeEnabled } from '../db-errors';

export interface DashboardStatistics {
  organization: {
    companyName: string;
    legalName: string;
    baseCurrency: string;
    timezone: string;
    totalBranches: number;
    totalDepartments: number;
    totalStaff: number;
    branchesList: { id: string; name: string; code: string; type: string }[];
    departmentsList: { id: string; name: string; code: string }[];
  };
  operationalReadiness: {
    identityAndOrganization: { status: 'operational'; message: 'Branches, Departments, Roles & Users Live' };
    customerPortalFoundation: { status: 'operational'; message: 'Customer root accounts & isolation keys deployed' };
    workOrdersAndMaintenance: {
      status: 'pending_stage';
      stage: 'Stage 3';
      metricDisplay: 'Pending Stage 3';
      note: 'Work order and corrective maintenance tables scheduled in Stage 3';
    };
    assetsAndRegistry: {
      status: 'pending_stage';
      stage: 'Stage 3';
      metricDisplay: 'Pending Stage 3';
      note: 'Physical asset registry and meters scheduled in Stage 3';
    };
    preventiveMaintenance: {
      status: 'pending_stage';
      stage: 'Stage 3';
      metricDisplay: 'Pending Stage 3';
      note: 'PM schedules and compliance meters scheduled in Stage 3';
    };
    inventoryAndStockLedger: {
      status: 'pending_stage';
      stage: 'Stage 4';
      metricDisplay: 'Pending Stage 4';
      note: 'Multi-warehouse stock movements and weighted average costing in Stage 4';
    };
    procurementAndInvoicing: {
      status: 'pending_stage';
      stage: 'Stage 5';
      metricDisplay: 'Pending Stage 5';
      note: 'Purchase orders, 3-way matching and customer invoicing in Stage 5';
    };
  };
  source: 'database' | 'demonstration_mode';
  isDemoData: boolean;
}

export async function getDashboardMetrics(user?: any): Promise<DashboardStatistics> {
  const [compRes, branchesRes, deptsRes, usersRes] = await Promise.all([
    getCompany(),
    getBranches(user),
    getDepartments(user),
    getUsers(),
  ]);

  const branches = branchesRes.data;
  const depts = deptsRes.data;
  const users = usersRes.data;
  const comp = compRes.data;

  const isDemo = compRes.isDemoData || branchesRes.isDemoData;

  return {
    organization: {
      companyName: comp.name,
      legalName: comp.legalName,
      baseCurrency: comp.baseCurrency,
      timezone: comp.timezone,
      totalBranches: branches.length,
      totalDepartments: depts.length,
      totalStaff: users.length,
      branchesList: branches.map((b) => ({ id: b.id, name: b.name, code: b.code, type: b.type })),
      departmentsList: depts.map((d) => ({ id: d.id, name: d.name, code: d.code })),
    },
    operationalReadiness: {
      identityAndOrganization: { status: 'operational', message: 'Branches, Departments, Roles & Users Live' },
      customerPortalFoundation: { status: 'operational', message: 'Customer root accounts & isolation keys deployed' },
      workOrdersAndMaintenance: {
        status: 'pending_stage',
        stage: 'Stage 3',
        metricDisplay: 'Pending Stage 3',
        note: 'Work order and corrective maintenance tables scheduled in Stage 3',
      },
      assetsAndRegistry: {
        status: 'pending_stage',
        stage: 'Stage 3',
        metricDisplay: 'Pending Stage 3',
        note: 'Physical asset registry and meters scheduled in Stage 3',
      },
      preventiveMaintenance: {
        status: 'pending_stage',
        stage: 'Stage 3',
        metricDisplay: 'Pending Stage 3',
        note: 'PM schedules and compliance meters scheduled in Stage 3',
      },
      inventoryAndStockLedger: {
        status: 'pending_stage',
        stage: 'Stage 4',
        metricDisplay: 'Pending Stage 4',
        note: 'Multi-warehouse stock movements and weighted average costing in Stage 4',
      },
      procurementAndInvoicing: {
        status: 'pending_stage',
        stage: 'Stage 5',
        metricDisplay: 'Pending Stage 5',
        note: 'Purchase orders, 3-way matching and customer invoicing in Stage 5',
      },
    },
    source: isDemo ? 'demonstration_mode' : 'database',
    isDemoData: isDemo,
  };
}
