import 'dotenv/config';
import { PrismaClient, BranchType, AccessScope } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting Idempotent Seed for ZemiFix CMMS ---');

  // Validate required initial admin credentials from environment - no fallback defaults permitted
  const rawAdminEmail = process.env.INITIAL_ADMIN_EMAIL;
  const rawAdminPass = process.env.INITIAL_ADMIN_PASSWORD;

  const adminEmail = rawAdminEmail?.trim();
  const initialAdminPass = rawAdminPass;

  if (!adminEmail || !initialAdminPass || initialAdminPass.length < 12) {
    console.error(
      '\n[Security Enforcement] Both INITIAL_ADMIN_EMAIL and a strong INITIAL_ADMIN_PASSWORD (minimum 12 characters) must be explicitly configured in your environment.'
    );
    console.error('Hardcoded fallback or predictable default administrator passwords are strictly prohibited.\n');
    process.exit(1);
  }

  // 1. Company (Single company row - Section 4.2)
  const existingCompany = await prisma.company.findFirst();
  let company = existingCompany;

  if (!company) {
    company = await prisma.company.create({
      data: {
        name: 'ZemiFix Facilities & Contracting',
        legalName: 'ZemiFix Engineering Solutions Ltd.',
        logo: null,
        baseCurrency: 'GHS',
        timezone: 'Africa/Accra',
        locale: 'en-GH',
        dateFormat: 'DD/MM/YYYY',
        taxScheme: 'VAT_STANDARD_15',
        fiscalYearStart: 1,
        modes: {
          facility: true,
          contractor: true,
        },
        numberPrefixes: {
          workOrder: 'WO-',
          invoice: 'INV-',
          quote: 'QT-',
          asset: 'AST-',
          request: 'REQ-',
          purchaseOrder: 'PO-',
        },
        otpChannel: 'Email',
        sessionPolicy: {
          maxLifetimeHours: 8,
          idleTimeoutMinutes: 120,
        },
      },
    });
    console.log(`[Seed] Created Company: ${company.name} (${company.legalName})`);
  } else {
    console.log(`[Seed] Company already exists: ${company.name}`);
  }

  // 2. Roles (System defaults - Section 9.2)
  const systemRoles = [
    { name: 'Admin', description: 'System administrator with full system-level access and configuration rights' },
    { name: 'Manager', description: 'Operations or branch manager overseeing requests, work orders, and budgets' },
    { name: 'Supervisor', description: 'Technical supervisor assigning jobs, reviewing reports, and verifying work' },
    { name: 'Planner', description: 'Dispatcher planning schedules, triaging requests, and assigning teams' },
    { name: 'Technician', description: 'Field or facility technician executing assigned work orders and logging parts' },
    { name: 'Storekeeper', description: 'Inventory manager handling parts, issues, receipts, and stock counts' },
    { name: 'Finance', description: 'Finance manager managing customer invoices, costs, and payment approvals' },
    { name: 'Cashier', description: 'Cashier recording customer payments (maker only, cannot approve)' },
    { name: 'Auditor', description: 'Read-only auditor examining activity logs, tamper-evident audit trails, and reports' },
  ];

  const roleMap: Record<string, string> = {};

  for (const r of systemRoles) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, isSystem: true },
      create: { name: r.name, isSystem: true, description: r.description },
    });
    roleMap[r.name] = role.id;
  }
  console.log(`[Seed] Upserted ${systemRoles.length} system roles`);

  // 3. Permissions (Maker vs Checker distinct actions - Section 4.2 & Section 5.6)
  const permissionsList = [
    // Work Orders
    { resource: 'work_order', action: 'create', description: 'Create work orders (Maker)' },
    { resource: 'work_order', action: 'read', description: 'View work orders' },
    { resource: 'work_order', action: 'update', description: 'Update work order details and tasks' },
    { resource: 'work_order', action: 'approve', description: 'Approve work orders and cost overruns (Checker)' },
    { resource: 'work_order', action: 'verify', description: 'Verify completed work orders' },
    { resource: 'work_order', action: 'close', description: 'Close and freeze work order costs' },
    // Invoices & Billing
    { resource: 'invoice', action: 'create', description: 'Draft customer invoices (Maker)' },
    { resource: 'invoice', action: 'read', description: 'View customer invoices' },
    { resource: 'invoice', action: 'approve', description: 'Approve and issue gapless invoices (Checker)' },
    // Inventory
    { resource: 'stock', action: 'issue', description: 'Issue parts to work orders (Maker)' },
    { resource: 'stock', action: 'approve_issue', description: 'Approve stock issues exceeding limits (Checker)' },
    // System Settings & Users
    { resource: 'settings', action: 'manage', description: 'Manage branch tree, departments, and roles' },
    { resource: 'audit', action: 'read', description: 'Read tamper-evident audit trails' },
  ];

  for (const p of permissionsList) {
    const perm = await prisma.permission.upsert({
      where: {
        resource_action: {
          resource: p.resource,
          action: p.action,
        },
      },
      update: { description: p.description },
      create: {
        resource: p.resource,
        action: p.action,
        description: p.description,
      },
    });

    // Link all to Admin role
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: roleMap['Admin'],
          permissionId: perm.id,
        },
      },
      update: {},
      create: {
        roleId: roleMap['Admin'],
        permissionId: perm.id,
      },
    });
  }
  console.log(`[Seed] Upserted ${permissionsList.length} permissions & linked to Admin`);

  // 4. Branch Tree (Materialized paths - Section 4.2)
  // Head Office (Root)
  const headOffice = await prisma.branch.upsert({
    where: { code: 'HQ-ACC' },
    update: {
      name: 'Head Office (Accra)',
      type: BranchType.HeadOffice,
      path: '/HQ-ACC/',
    },
    create: {
      name: 'Head Office (Accra)',
      code: 'HQ-ACC',
      type: BranchType.HeadOffice,
      path: '/HQ-ACC/',
      address: 'Plot 14 Independence Ave, Ridge, Accra',
      phone: '+233 30 200 0001',
      invoicePrefix: 'HQ',
    },
  });

  // Regional Branch (Child of Head Office)
  const temaRegion = await prisma.branch.upsert({
    where: { code: 'REG-TEMA' },
    update: {
      name: 'Tema Industrial Region',
      type: BranchType.Region,
      parentId: headOffice.id,
      path: `${headOffice.path}REG-TEMA/`,
    },
    create: {
      name: 'Tema Industrial Region',
      code: 'REG-TEMA',
      type: BranchType.Region,
      parentId: headOffice.id,
      path: `${headOffice.path}REG-TEMA/`,
      address: 'Heavy Industrial Area, Harbour Road, Tema',
      phone: '+233 30 300 0002',
      invoicePrefix: 'TEM',
    },
  });

  // Outlet / Facility Workshop (Child of Tema Region)
  await prisma.branch.upsert({
    where: { code: 'OUT-TEM-01' },
    update: {
      name: 'Tema Port Maintenance Workshop',
      type: BranchType.Outlet,
      parentId: temaRegion.id,
      path: `${temaRegion.path}OUT-TEM-01/`,
    },
    create: {
      name: 'Tema Port Maintenance Workshop',
      code: 'OUT-TEM-01',
      type: BranchType.Outlet,
      parentId: temaRegion.id,
      path: `${temaRegion.path}OUT-TEM-01/`,
      address: 'Berth 2 Engineering Bay, Tema Port',
      invoicePrefix: 'TP1',
    },
  });
  console.log('[Seed] Upserted Branch hierarchy with materialized paths');

  // 5. Department Tree (Company-wide - Section 4.2)
  const engineering = await prisma.department.upsert({
    where: { code: 'DEPT-ENG' },
    update: { name: 'Engineering & Maintenance', path: '/DEPT-ENG/' },
    create: {
      name: 'Engineering & Maintenance',
      code: 'DEPT-ENG',
      path: '/DEPT-ENG/',
    },
  });

  await prisma.department.upsert({
    where: { code: 'DEPT-OPS' },
    update: { name: 'Operations', path: '/DEPT-OPS/' },
    create: {
      name: 'Operations',
      code: 'DEPT-OPS',
      path: '/DEPT-OPS/',
    },
  });

  await prisma.department.upsert({
    where: { code: 'DEPT-FIN' },
    update: { name: 'Finance & Billing', path: '/DEPT-FIN/' },
    create: {
      name: 'Finance & Billing',
      code: 'DEPT-FIN',
      path: '/DEPT-FIN/',
    },
  });
  console.log('[Seed] Upserted Department tree');

  // 6. Initial Admin User (Idempotent: does NOT overwrite existing password on re-runs)
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let adminUser;
  if (!existingAdmin) {
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(initialAdminPass, salt);

    adminUser = await prisma.user.create({
      data: {
        name: 'System Administrator',
        email: adminEmail,
        phone: '+233 24 000 0000',
        passwordHash: passwordHash,
        roleId: roleMap['Admin'],
        branchId: headOffice.id,
        departmentId: engineering.id,
        accessScope: AccessScope.Company,
        locale: 'en-GH',
        isActive: true,
      },
    });
    console.log(`[Seed] Initial Admin user created: ${adminUser.email}`);
  } else {
    // Preserve existing administrator completely without modifying password, role, branch, department, or access scope
    adminUser = existingAdmin;
    console.log(
      `[Seed] Existing Admin user preserved (password, role, branch, department, scope untouched): ${adminUser.email}`
    );
  }

  console.log('----------------------------------------------------');
  console.log(`[Seed SUCCESS] Admin User Ready: ${adminUser.email}`);
  console.log(`[Seed] Access Scope: Company | Branch: ${headOffice.name}`);
  console.log('----------------------------------------------------');
}

main()
  .catch((e) => {
    console.error('[Seed Error]:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
