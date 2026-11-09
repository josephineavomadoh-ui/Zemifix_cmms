import { prisma } from '../prisma';
import { z } from 'zod';
import {
  DatabaseUnavailableError,
  isDatabaseConnectionError,
  isDemoModeEnabled,
  isDatabaseConfigured,
} from '../db-errors';

export const createBranchSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z.string().min(2, 'Code must be at least 2 characters').max(20).toUpperCase(),
  type: z.enum(['HeadOffice', 'Region', 'Branch', 'Outlet']),
  parentId: z.string().uuid().optional().nullable(),
  address: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  managerUserId: z.string().uuid().optional().nullable(),
  alternateApproverId: z.string().uuid().optional().nullable(),
  invoicePrefix: z.string().max(10).optional().nullable(),
});

export const createDepartmentSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  code: z.string().min(2, 'Code must be at least 2 characters').max(20).toUpperCase(),
  parentId: z.string().uuid().optional().nullable(),
  headUserId: z.string().uuid().optional().nullable(),
});

// Explicit demonstration baseline (active ONLY when ENABLE_DEMO_MODE=true)
const demoCompany = {
  id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a1001',
  name: 'ZemiFix Engineering Ghana Ltd [DEMO]',
  legalName: 'ZemiFix Engineering Services Ghana Limited [Demonstration Mode]',
  baseCurrency: 'GHS',
  timezone: 'Africa/Accra',
  locale: 'en-GH',
  dateFormat: 'YYYY-MM-DD',
  taxScheme: 'GRA Standard (VAT 15% + NHIL 2.5% + GETFund 2.5% + COVID 1%)',
  fiscalYearStart: 1,
  modes: { facility: true, contractor: true },
  numberPrefixes: {
    workOrder: 'WO-',
    invoice: 'INV-',
    quote: 'QT-',
    asset: 'AST-',
    request: 'REQ-',
  },
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const demoBranches: any[] = [
  {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001',
    parentId: null,
    name: 'Accra Head Office [DEMO]',
    code: 'HQ-ACC',
    type: 'HeadOffice',
    address: 'Plot 14, Independence Avenue, Ridge, Accra',
    phone: '+233 30 200 0001',
    managerUserId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a5001',
    alternateApproverId: null,
    invoicePrefix: 'ACC-',
    isActive: true,
    path: '/HQ-ACC/',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2002',
    parentId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001',
    name: 'Tema Heavy Industrial Region [DEMO]',
    code: 'REG-TEMA',
    type: 'Region',
    address: 'Industrial Area, Heavy Industrial Zone, Tema',
    phone: '+233 30 300 0002',
    managerUserId: null,
    alternateApproverId: null,
    invoicePrefix: 'TEM-',
    isActive: true,
    path: '/HQ-ACC/REG-TEMA/',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2003',
    parentId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2002',
    name: 'Takoradi Harbor Workshop [DEMO]',
    code: 'WRK-TDI',
    type: 'Branch',
    address: 'Harbor Commercial Road, Takoradi',
    phone: '+233 31 200 0003',
    managerUserId: null,
    alternateApproverId: null,
    invoicePrefix: 'TDI-',
    isActive: true,
    path: '/HQ-ACC/REG-TEMA/WRK-TDI/',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
];

const demoDepartments: any[] = [
  {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3001',
    parentId: null,
    name: 'Engineering & Maintenance [DEMO]',
    code: 'DEPT-ENG',
    headUserId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a5001',
    isActive: true,
    path: '/DEPT-ENG/',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3002',
    parentId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3001',
    name: 'Electrical & Instrumentation [DEMO]',
    code: 'DEPT-ELEC',
    headUserId: null,
    isActive: true,
    path: '/DEPT-ENG/DEPT-ELEC/',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3003',
    parentId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3001',
    name: 'Mechanical & Hydraulic [DEMO]',
    code: 'DEPT-MECH',
    headUserId: null,
    isActive: true,
    path: '/DEPT-ENG/DEPT-MECH/',
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
];

export async function getCompany() {
  if (!isDatabaseConfigured() && isDemoModeEnabled()) {
    return { data: demoCompany, source: 'demonstration_mode' as const, isDemoData: true };
  }
  try {
    const comp = await prisma.company.findFirst();
    if (comp) return { data: comp, source: 'database' as const, isDemoData: false };
    throw new Error('No company record found in database. Run seed script.');
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      if (isDemoModeEnabled()) {
        return { data: demoCompany, source: 'demonstration_mode' as const, isDemoData: true };
      }
      throw new DatabaseUnavailableError();
    }
    throw err;
  }
}

export async function getBranches(user?: any) {
  let list: any[];
  if (!isDatabaseConfigured() && isDemoModeEnabled()) {
    list = [...demoBranches];
  } else {
    try {
      list = await prisma.branch.findMany({
        orderBy: { path: 'asc' },
        include: {
          parent: { select: { id: true, name: true, code: true } },
          managerUser: { select: { id: true, name: true, email: true } },
          alternateApprover: { select: { id: true, name: true, email: true } },
          _count: { select: { users: true } },
        },
      });
    } catch (err) {
      if (isDatabaseConnectionError(err)) {
        if (isDemoModeEnabled()) {
          list = [...demoBranches];
        } else {
          throw new DatabaseUnavailableError();
        }
      } else {
        throw err;
      }
    }
  }

  // Enforce access scope filtering for non-admin users
  if (user && user.role?.name !== 'Admin' && user.accessScope && user.accessScope !== 'Company') {
    if (user.accessScope === 'AssignedBranchOnly' || user.accessScope === 'Branch') {
      list = list.filter((b) => b.id === user.branchId);
    } else if (user.accessScope === 'BranchAndBelow' && user.branch?.code) {
      const code = user.branch.code;
      list = list.filter((b) => b.path?.includes(code));
    }
  }

  const isDemo = !isDatabaseConfigured() && isDemoModeEnabled();
  return { data: list, source: isDemo ? ('demonstration_mode' as const) : ('database' as const), isDemoData: isDemo };
}

export async function getDepartments(user?: any) {
  let list: any[];
  if (!isDatabaseConfigured() && isDemoModeEnabled()) {
    list = [...demoDepartments];
  } else {
    try {
      list = await prisma.department.findMany({
        orderBy: { path: 'asc' },
        include: {
          parent: { select: { id: true, name: true, code: true } },
          headUser: { select: { id: true, name: true, email: true } },
          _count: { select: { users: true } },
        },
      });
    } catch (err) {
      if (isDatabaseConnectionError(err)) {
        if (isDemoModeEnabled()) {
          list = [...demoDepartments];
        } else {
          throw new DatabaseUnavailableError();
        }
      } else {
        throw err;
      }
    }
  }

  // Enforce department scope filtering
  if (user && user.role?.name !== 'Admin' && user.accessScope === 'Department' && user.departmentId) {
    list = list.filter((d) => d.id === user.departmentId);
  }

  const isDemo = !isDatabaseConfigured() && isDemoModeEnabled();
  return { data: list, source: isDemo ? ('demonstration_mode' as const) : ('database' as const), isDemoData: isDemo };
}

export async function createBranch(input: z.infer<typeof createBranchSchema>) {
  const validated = createBranchSchema.parse(input);

  // Compute materialized path from database parent
  let parentPath = '/';
  if (validated.parentId) {
    try {
      const parent = await prisma.branch.findUnique({ where: { id: validated.parentId } });
      if (!parent) throw new Error(`Parent branch with ID ${validated.parentId} does not exist.`);
      parentPath = parent.path;
    } catch (err) {
      if (isDatabaseConnectionError(err)) {
        if (isDemoModeEnabled()) {
          const parent = demoBranches.find((b) => b.id === validated.parentId);
          if (parent) parentPath = parent.path;
        } else {
          throw new DatabaseUnavailableError('Cannot verify parent branch hierarchy: PostgreSQL database is unreachable.');
        }
      } else {
        throw err;
      }
    }
  }
  const branchPath = `${parentPath}${validated.code}/`;

  try {
    const branch = await prisma.branch.create({
      data: {
        ...validated,
        path: branchPath,
      },
    });
    return { data: branch, source: 'database' as const, isDemoData: false };
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      if (isDemoModeEnabled()) {
        const newBranch = {
          id: `0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2${String(demoBranches.length + 1).padStart(3, '0')}`,
          name: validated.name,
          code: validated.code,
          type: validated.type,
          parentId: validated.parentId || null,
          managerUserId: validated.managerUserId || null,
          alternateApproverId: validated.alternateApproverId || null,
          invoicePrefix: validated.invoicePrefix || null,
          address: validated.address || null,
          phone: validated.phone || null,
          isActive: true,
          path: branchPath,
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: validated.parentId ? demoBranches.find((b) => b.id === validated.parentId) || null : null,
          managerUser: null,
          alternateApprover: null,
          _count: { users: 0 },
        };
        demoBranches.push(newBranch);
        return { data: newBranch, source: 'demonstration_mode' as const, isDemoData: true };
      }
      throw new DatabaseUnavailableError(
        'Failed to create branch: PostgreSQL database is unreachable. Writes cannot be saved.'
      );
    }
    throw err;
  }
}

export async function createDepartment(input: z.infer<typeof createDepartmentSchema>) {
  const validated = createDepartmentSchema.parse(input);

  let parentPath = '/';
  if (validated.parentId) {
    try {
      const parent = await prisma.department.findUnique({ where: { id: validated.parentId } });
      if (!parent) throw new Error(`Parent department with ID ${validated.parentId} does not exist.`);
      parentPath = parent.path;
    } catch (err) {
      if (isDatabaseConnectionError(err)) {
        if (isDemoModeEnabled()) {
          const parent = demoDepartments.find((d) => d.id === validated.parentId);
          if (parent) parentPath = parent.path;
        } else {
          throw new DatabaseUnavailableError('Cannot verify parent department hierarchy: PostgreSQL database is unreachable.');
        }
      } else {
        throw err;
      }
    }
  }
  const deptPath = `${parentPath}${validated.code}/`;

  try {
    const department = await prisma.department.create({
      data: {
        ...validated,
        path: deptPath,
      },
    });
    return { data: department, source: 'database' as const, isDemoData: false };
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      if (isDemoModeEnabled()) {
        const newDept = {
          id: `0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3${String(demoDepartments.length + 1).padStart(3, '0')}`,
          name: validated.name,
          code: validated.code,
          parentId: validated.parentId || null,
          headUserId: validated.headUserId || null,
          isActive: true,
          path: deptPath,
          createdAt: new Date(),
          updatedAt: new Date(),
          parent: validated.parentId ? demoDepartments.find((d) => d.id === validated.parentId) || null : null,
          headUser: null,
          _count: { users: 0 },
        };
        demoDepartments.push(newDept);
        return { data: newDept, source: 'demonstration_mode' as const, isDemoData: true };
      }
      throw new DatabaseUnavailableError(
        'Failed to create department: PostgreSQL database is unreachable. Writes cannot be saved.'
      );
    }
    throw err;
  }
}
