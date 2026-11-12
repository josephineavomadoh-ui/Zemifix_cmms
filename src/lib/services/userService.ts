import { prisma } from '../prisma';
import { hashPassword } from '../auth';
import { z } from 'zod';
import {
  DatabaseUnavailableError,
  isDatabaseConnectionError,
  isDemoModeEnabled,
} from '../db-errors';

export const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().email('Invalid email address').max(150),
  phone: z.string().max(50).optional().nullable(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  roleId: z.string().uuid('Valid role ID is required'),
  branchId: z.string().uuid('Valid branch ID is required'),
  departmentId: z.string().uuid().optional().nullable(),
  accessScope: z.enum(['Own', 'Department', 'Branch', 'BranchAndBelow', 'Company']),
  approvalLimit: z.number().min(0).optional().nullable(),
  locale: z.string().default('en-GH'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  email: z.string().email().max(150).optional(),
  phone: z.string().max(50).optional().nullable(),
  password: z.string().min(8).optional(),
  roleId: z.string().uuid().optional(),
  branchId: z.string().uuid().optional(),
  departmentId: z.string().uuid().optional().nullable(),
  accessScope: z.enum(['Own', 'Department', 'Branch', 'BranchAndBelow', 'Company']).optional(),
  approvalLimit: z.number().min(0).optional().nullable(),
  isActive: z.boolean().optional(),
});

// Explicit demonstration baseline (active ONLY when ENABLE_DEMO_MODE=true)
const demoRoles = [
  { id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4001', name: 'Admin', isSystem: true, description: 'Full system control' },
  { id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4002', name: 'MaintenanceManager', isSystem: true, description: 'Approves work orders, assigns jobs, manages schedules' },
  { id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4003', name: 'Technician', isSystem: true, description: 'Executes work orders, logs labor & parts' },
  { id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4004', name: 'InventoryClerk', isSystem: true, description: 'Receives and issues stock, conducts counts' },
  { id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4005', name: 'FinanceApprover', isSystem: true, description: 'Dual-control checker for purchase orders & invoices' },
];

// Explicit type for demo user records so type inconsistencies surface at compile time
interface DemoUser {
  id: string;
  name: string;
  email: string;
  phone: string;
  roleId: string;
  role: (typeof demoRoles)[number];
  branchId: string;
  branch: { id: string; name: string; code: string; type: string };
  departmentId: string;
  department: { id: string; name: string; code: string };
  accessScope: string;
  approvalLimit: number;
  isActive: boolean;
  locale: string;
  lastLoginAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const demoUsers: DemoUser[] = [
  {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a5001',
    name: 'System Administrator [DEMO]',
    email: 'admin@zemifix.local',
    phone: '+233 24 000 0000',
    roleId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4001',
    role: demoRoles[0],
    branchId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001',
    branch: { id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2001', name: 'Accra Head Office [DEMO]', code: 'HQ-ACC', type: 'HeadOffice' },
    departmentId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3001',
    department: { id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3001', name: 'Engineering & Maintenance [DEMO]', code: 'DEPT-ENG' },
    accessScope: 'Company',
    approvalLimit: 1000000.00,
    isActive: true,
    locale: 'en-GH',
    lastLoginAt: new Date(),
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
  },
  {
    id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a5002',
    name: 'Kofi Boateng [DEMO]',
    email: 'k.boateng@zemifix.local',
    phone: '+233 24 111 2233',
    roleId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a4002',
    role: demoRoles[1],
    branchId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2002',
    branch: { id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a2002', name: 'Tema Heavy Industrial Region [DEMO]', code: 'REG-TEMA', type: 'Region' },
    departmentId: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3002',
    department: { id: '0192e2b0-8a1c-7fc0-84a2-1b1d8f8a3002', name: 'Electrical & Instrumentation [DEMO]', code: 'DEPT-ELEC' },
    accessScope: 'BranchAndBelow',
    approvalLimit: 50000.00,
    isActive: true,
    locale: 'en-GH',
    lastLoginAt: new Date(Date.now() - 3600000 * 4),
    createdAt: new Date('2026-01-02T00:00:00Z'),
    updatedAt: new Date('2026-01-02T00:00:00Z'),
  },
];

export async function getRoles() {
  try {
    const roles = await prisma.role.findMany({
      orderBy: { name: 'asc' },
      include: {
        permissions: {
          include: { permission: true },
        },
      },
    });
    return { data: roles, source: 'database' as const, isDemoData: false };
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      if (isDemoModeEnabled()) {
        return { data: demoRoles, source: 'demonstration_mode' as const, isDemoData: true };
      }
      throw new DatabaseUnavailableError();
    }
    throw err;
  }
}

export async function getUsers() {
  try {
    const users = await prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        roleId: true,
        role: { select: { id: true, name: true } },
        branchId: true,
        branch: { select: { id: true, name: true, code: true, type: true } },
        departmentId: true,
        department: { select: { id: true, name: true, code: true } },
        accessScope: true,
        approvalLimit: true,
        isActive: true,
        locale: true,
        lastLoginAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { data: users, source: 'database' as const, isDemoData: false };
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      if (isDemoModeEnabled()) {
        return { data: demoUsers, source: 'demonstration_mode' as const, isDemoData: true };
      }
      throw new DatabaseUnavailableError();
    }
    throw err;
  }
}

export async function getUserByEmail(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        branch: true,
        department: true,
      },
    });
    if (user) return { data: user, source: 'database' as const, isDemoData: false };
    return { data: null, source: 'database' as const, isDemoData: false };
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      if (isDemoModeEnabled()) {
        const demoUser = demoUsers.find((u) => u.email.toLowerCase() === email.toLowerCase());
        return {
          data: demoUser
            ? {
                ...demoUser,
                passwordHash: '$2a$10$Lng/mr6XSdEiGcXjmpU.yer8XGA5JnVOOevfHFZhQveyeGxWwY1r.',
              }
            : null,
          source: 'demonstration_mode' as const,
          isDemoData: true,
        };
      }
      throw new DatabaseUnavailableError();
    }
    throw err;
  }
}

/**
 * Dedicated authentication lookup for staff login.
 *
 * Differs from getUserByEmail() in three important ways:
 *   1. Requires a configured PostgreSQL database — never returns demo data.
 *   2. Excludes soft-deleted accounts (deletedAt IS NOT NULL).
 *   3. Returns the full User row including passwordHash so the caller can
 *      verify credentials internally. Callers MUST NOT forward passwordHash
 *      to any API response.
 *
 * Throws DatabaseUnavailableError when the database is configured but
 * unreachable. The login endpoint must surface this as 503, not 401.
 */
export async function getUserForAuthentication(email: string) {
  try {
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        role: true,
        branch: true,
        department: true,
      },
    });

    // Exclude soft-deleted accounts at the service layer
    if (user && user.deletedAt !== null) {
      return null;
    }

    return user ?? null;
  } catch (err: unknown) {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError(
        'Authentication service unavailable: cannot reach PostgreSQL.'
      );
    }
    throw err;
  }
}

export async function createUser(input: z.infer<typeof createUserSchema>) {
  const validated = createUserSchema.parse(input);

  // Verify foreign key integrity against PostgreSQL
  try {
    const [roleExists, branchExists] = await Promise.all([
      prisma.role.findUnique({ where: { id: validated.roleId } }),
      prisma.branch.findUnique({ where: { id: validated.branchId } }),
    ]);

    if (!roleExists) {
      throw new Error(`Role with ID ${validated.roleId} does not exist in database.`);
    }
    if (!branchExists) {
      throw new Error(`Branch with ID ${validated.branchId} does not exist in database.`);
    }

    if (validated.departmentId) {
      const deptExists = await prisma.department.findUnique({ where: { id: validated.departmentId } });
      if (!deptExists) {
        throw new Error(`Department with ID ${validated.departmentId} does not exist in database.`);
      }
    }
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError('Cannot validate role or branch: PostgreSQL database is unreachable.');
    }
    throw err;
  }

  const passwordHash = await hashPassword(validated.password);

  try {
    const user = await prisma.user.create({
      data: {
        name: validated.name,
        email: validated.email,
        phone: validated.phone,
        passwordHash,
        roleId: validated.roleId,
        branchId: validated.branchId,
        departmentId: validated.departmentId,
        accessScope: validated.accessScope,
        approvalLimit: validated.approvalLimit,
        locale: validated.locale,
        isActive: true,
      },
      include: {
        role: true,
        branch: true,
        department: true,
      },
    });

    // Sanitize return: never expose passwordHash
    const { passwordHash: _, ...safeUser } = user;
    return { data: safeUser, source: 'database' as const, isDemoData: false };
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError(
        'Failed to persist user: PostgreSQL database is unreachable. Writes cannot be saved.'
      );
    }
    throw err;
  }
}

export async function updateUser(id: string, input: z.infer<typeof updateUserSchema>) {
  const validated = updateUserSchema.parse(input);

  // Protect root system administrator account
  const existingUser = await prisma.user.findUnique({ where: { id } }).catch((err) => {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError('Cannot verify user for update: PostgreSQL database is unreachable.');
    }
    throw err;
  });

  if (!existingUser) {
    throw new Error(`User with ID ${id} not found.`);
  }

  const isRootAdmin = existingUser.email === 'admin@zemifix.local';

  if (isRootAdmin) {
    if (validated.isActive === false) {
      throw new Error('Root system administrator account cannot be deactivated.');
    }
    if (validated.roleId && validated.roleId !== existingUser.roleId) {
      throw new Error('Root system administrator role cannot be altered.');
    }
    if (validated.accessScope && validated.accessScope !== 'Company') {
      throw new Error('Root system administrator must maintain Company access scope.');
    }
  }

  const updateData: any = { ...validated };
  if (validated.password) {
    updateData.passwordHash = await hashPassword(validated.password);
    delete updateData.password;
  }

  try {
    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
      include: {
        role: true,
        branch: true,
        department: true,
      },
    });
    const { passwordHash: _, ...safeUser } = updated;
    return { data: safeUser, source: 'database' as const, isDemoData: false };
  } catch (err) {
    if (isDatabaseConnectionError(err)) {
      throw new DatabaseUnavailableError(
        'Failed to update user: PostgreSQL database is unreachable. Writes cannot be saved.'
      );
    }
    throw err;
  }
}
