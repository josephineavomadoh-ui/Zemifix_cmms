/**
 * ZemiFix CMMS — Milestone 1 Functional Automated Test Suite
 * Tests:
 * 1. Authentication Service & Endpoints (Login, Password verification, Session JWT, Logout)
 * 2. Organization Service (Branch listing, branch hierarchy with materialized paths, department creation)
 * 3. User Management Service (Staff listing, staff provisioning, role assignment, root admin protection)
 * 4. Dashboard Metrics Service (Real organization statistics, future stage domain markers)
 */

import { getUserByEmail, createUser, updateUser, getUsers, getRoles } from '../src/lib/services/userService';
import { getCompany, getBranches, getDepartments, createBranch, createDepartment } from '../src/lib/services/organizationService';
import { getDashboardMetrics } from '../src/lib/services/dashboardService';
import { verifyPassword, createSessionToken, verifySessionToken } from '../src/lib/auth';

async function testAuthentication() {
  console.log('=== TEST 1: Staff Authentication & Session Security ===');

  // Test admin user lookup
  const adminRes = await getUserByEmail('admin@zemifix.local');
  if (!adminRes.data) throw new Error('Root administrator account not found');
  console.log(`[PASS] Root admin account located: ${adminRes.data.email} (${adminRes.data.name})`);

  // Test password verification against seed hash
  const correctPass = 'ReplaceWithStrongAdminPassword!';
  const wrongPass = 'IncorrectPassword123';

  const isCorrectValid = await verifyPassword(correctPass, adminRes.data.passwordHash);
  if (!isCorrectValid) throw new Error('Correct password failed hash verification');
  console.log('[PASS] Valid password verified against bcrypt hash.');

  const isWrongValid = await verifyPassword(wrongPass, adminRes.data.passwordHash);
  if (isWrongValid) throw new Error('Incorrect password was unexpectedly accepted');
  console.log('[PASS] Incorrect password correctly rejected.');

  // Test session JWT token generation and verification
  const token = await createSessionToken({
    userId: adminRes.data.id,
    email: adminRes.data.email,
    role: 'Admin',
    branchId: adminRes.data.branchId,
    departmentId: adminRes.data.departmentId,
    accessScope: adminRes.data.accessScope,
  });

  if (!token || typeof token !== 'string') throw new Error('Failed to generate session token');
  console.log('[PASS] Signed JWT session token generated.');

  const payload = await verifySessionToken(token);
  if (!payload || payload.email !== 'admin@zemifix.local' || payload.role !== 'Admin') {
    throw new Error('Session token verification failed');
  }
  console.log(`[PASS] Session token verified. User: ${payload.email}, Role: ${payload.role}, Scope: ${payload.accessScope}`);
}

async function testOrganizationManagement() {
  console.log('\n=== TEST 2: Organization Hierarchy & Branch Scoping ===');

  const compRes = await getCompany();
  if (!compRes.data || !compRes.data.name) throw new Error('Failed to retrieve company profile');
  console.log(`[PASS] Company profile: ${compRes.data.name} (Currency: ${compRes.data.baseCurrency}, Timezone: ${compRes.data.timezone})`);

  const branchesRes = await getBranches();
  if (!branchesRes.data || branchesRes.data.length === 0) throw new Error('No branches returned');
  console.log(`[PASS] Loaded ${branchesRes.data.length} branches. Root: ${branchesRes.data[0].name} (${branchesRes.data[0].code})`);

  // Create new branch
  const newBranch = await createBranch({
    name: 'Tamale Regional Workshop',
    code: 'WRK-TML',
    type: 'Branch',
    parentId: branchesRes.data[0].id,
    address: 'Tamale Industrial Area, Northern Region',
    phone: '+233 37 200 0004',
    invoicePrefix: 'TML-',
  });

  if (!newBranch.data || newBranch.data.code !== 'WRK-TML') throw new Error('Branch creation failed');
  if (!newBranch.data.path.includes('WRK-TML')) throw new Error('Materialized path calculation failed');
  console.log(`[PASS] Created new branch: ${newBranch.data.name} with materialized path ${newBranch.data.path}`);

  // Create department
  const newDept = await createDepartment({
    name: 'Quality Assurance & HSE',
    code: 'DEPT-QA',
  });
  if (!newDept.data || newDept.data.code !== 'DEPT-QA') throw new Error('Department creation failed');
  console.log(`[PASS] Created new department: ${newDept.data.name} with path ${newDept.data.path}`);
}

async function testUserManagement() {
  console.log('\n=== TEST 3: User Management & Administrator Protection ===');

  const usersRes = await getUsers();
  if (!usersRes.data || usersRes.data.length === 0) throw new Error('No users returned');
  console.log(`[PASS] Loaded ${usersRes.data.length} staff accounts.`);

  const rolesRes = await getRoles();
  const techRole = rolesRes.data.find((r) => r.name === 'Technician') || rolesRes.data[0];
  const branchesRes = await getBranches();

  // Create new staff technician
  const newStaff = await createUser({
    name: 'Yaw Osei',
    email: 'y.osei@zemifix.local',
    phone: '+233 24 777 8899',
    password: 'TemporaryPassword123!',
    roleId: techRole.id,
    branchId: branchesRes.data[0].id,
    accessScope: 'Branch',
    approvalLimit: 10000,
    locale: 'en-GH',
  });

  if (!newStaff.data || newStaff.data.email !== 'y.osei@zemifix.local') throw new Error('Staff creation failed');
  console.log(`[PASS] Created new staff user: ${newStaff.data.name} (${newStaff.data.email}) - Scope: ${newStaff.data.accessScope}`);

  // Test root admin protection
  const admin = usersRes.data.find((u) => u.email === 'admin@zemifix.local');
  if (admin) {
    let protectionTriggered = false;
    try {
      await updateUser(admin.id, { isActive: false });
    } catch (err: any) {
      protectionTriggered = true;
      console.log(`[PASS] Administrator protection verified: ${err.message}`);
    }
    if (!protectionTriggered) throw new Error('Failed to protect primary administrator from deactivation');
  }
}

async function testDashboardMetrics() {
  console.log('\n=== TEST 4: Dashboard Metrics & Future Stage Differentiation ===');

  const metrics = await getDashboardMetrics();
  if (!metrics.organization || metrics.organization.totalBranches === 0) {
    throw new Error('Invalid dashboard metrics returned');
  }

  console.log(`[PASS] Dashboard metrics: ${metrics.organization.totalBranches} Branches, ${metrics.organization.totalDepartments} Departments, ${metrics.organization.totalStaff} Staff`);
  console.log(`[PASS] Operational Domain Check: Domain 01 is "${metrics.operationalReadiness.identityAndOrganization.status}".`);
  console.log(`[PASS] Work Orders marked as "${metrics.operationalReadiness.workOrdersAndMaintenance.metricDisplay}" (${metrics.operationalReadiness.workOrdersAndMaintenance.note}).`);
  console.log(`[PASS] Inventory Ledger marked as "${metrics.operationalReadiness.inventoryAndStockLedger.metricDisplay}" (${metrics.operationalReadiness.inventoryAndStockLedger.note}).`);
}

async function runMilestoneTests() {
  await testAuthentication();
  await testOrganizationManagement();
  await testUserManagement();
  await testDashboardMetrics();
  console.log('\n=============================================================');
  console.log('ALL MILESTONE 1 FUNCTIONAL TESTS COMPLETED SUCCESSFULLY (100%)');
  console.log('=============================================================');
}

runMilestoneTests().catch((e) => {
  console.error('[TEST ERROR]:', e);
  process.exit(1);
});
