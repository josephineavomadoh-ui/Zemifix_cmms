/**
 * ZemiFix CMMS — Stage D.1 Automated Verification Suite
 *
 * Tests:
 *   1. Unauthenticated GET /api/dashboard/stats returns HTTP 401
 *   2. Company scope returns company-wide metrics
 *   3. Branch scope isolates data to assigned branch only
 *   4. BranchAndBelow scope respects materialized branch hierarchy
 *   5. Department scope isolates data to assigned department
 *   6. Own scope restricts staff metrics to caller's own user record
 *   7. UserScopeGrant active grants expand access appropriately
 */

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from '../src/lib/auth';
import { GET as dashboardStatsHandler } from '../src/app/api/dashboard/stats/route';

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters-long';
}
if (!process.env.OTP_SECRET) {
  process.env.OTP_SECRET = 'test-otp-secret-at-least-32-characters-long-pad!';
}

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  [PASS] ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) pass(label);
  else fail(label, detail);
}

function section(name: string) {
  console.log(`\n=== ${name} ===`);
}

function makeReq(url: string, cookies?: Record<string, string>): NextRequest {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (cookies) {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    headers.set('Cookie', cookieHeader);
  }

  return new NextRequest(url, {
    method: 'GET',
    headers,
  });
}

async function runStageD1Tests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage D.1 Verification Test Suite');
  console.log('=====================================================');

  let companyUser: any = null;
  let branchUser: any = null;
  let branchBelowUser: any = null;
  let deptUser: any = null;
  let ownUser: any = null;
  let grantUser: any = null;
  let activeGrant: any = null;

  try {
    const role = await prisma.role.findFirst();
    if (!role) throw new Error('Missing seed role');

    // Fetch branches: HQ-ACC, REG-TEMA, OUT-TEM-01
    const hqBranch = await prisma.branch.findUnique({ where: { code: 'HQ-ACC' } });
    const temaBranch = await prisma.branch.findUnique({ where: { code: 'REG-TEMA' } });
    const outletBranch = await prisma.branch.findUnique({ where: { code: 'OUT-TEM-01' } });

    if (!hqBranch || !temaBranch || !outletBranch) {
      throw new Error('Missing seed branches');
    }

    // Fetch departments
    const engDept = await prisma.department.findUnique({ where: { code: 'DEPT-ENG' } });
    const opsDept = await prisma.department.findUnique({ where: { code: 'DEPT-OPS' } });

    if (!engDept || !opsDept) {
      throw new Error('Missing seed departments');
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);
    const ts = Date.now();

    // 1. Company Scope User
    companyUser = await prisma.user.create({
      data: {
        name: 'Company Scope User',
        email: `company.${ts}@zemifix.local`,
        phone: '0244100001',
        passwordHash,
        roleId: role.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    // 2. Branch Scope User (Assigned to REG-TEMA)
    branchUser = await prisma.user.create({
      data: {
        name: 'Branch Scope User',
        email: `branch.${ts}@zemifix.local`,
        phone: '0244100002',
        passwordHash,
        roleId: role.id,
        branchId: temaBranch.id,
        departmentId: engDept.id,
        accessScope: 'Branch',
        isActive: true,
      },
    });

    // 3. BranchAndBelow Scope User (Assigned to REG-TEMA, hierarchy contains OUT-TEM-01)
    branchBelowUser = await prisma.user.create({
      data: {
        name: 'BranchAndBelow Scope User',
        email: `branchbelow.${ts}@zemifix.local`,
        phone: '0244100003',
        passwordHash,
        roleId: role.id,
        branchId: temaBranch.id,
        departmentId: engDept.id,
        accessScope: 'BranchAndBelow',
        isActive: true,
      },
    });

    // 4. Department Scope User (Assigned to DEPT-ENG)
    deptUser = await prisma.user.create({
      data: {
        name: 'Department Scope User',
        email: `dept.${ts}@zemifix.local`,
        phone: '0244100004',
        passwordHash,
        roleId: role.id,
        branchId: temaBranch.id,
        departmentId: engDept.id,
        accessScope: 'Department',
        isActive: true,
      },
    });

    // 5. Own Scope User
    ownUser = await prisma.user.create({
      data: {
        name: 'Own Scope User',
        email: `own.${ts}@zemifix.local`,
        phone: '0244100005',
        passwordHash,
        roleId: role.id,
        branchId: temaBranch.id,
        departmentId: engDept.id,
        accessScope: 'Own',
        isActive: true,
      },
    });

    // 6. UserScopeGrant User (Branch scope at REG-TEMA, granted OUT-TEM-01 explicitly)
    grantUser = await prisma.user.create({
      data: {
        name: 'Grant Scope User',
        email: `grant.${ts}@zemifix.local`,
        phone: '0244100006',
        passwordHash,
        roleId: role.id,
        branchId: temaBranch.id,
        departmentId: engDept.id,
        accessScope: 'Branch',
        isActive: true,
      },
    });

    // Create UserScopeGrant giving OUT-TEM-01 explicitly
    activeGrant = await prisma.userScopeGrant.create({
      data: {
        userId: grantUser.id,
        branchId: outletBranch.id,
        grantedByUserId: companyUser.id,
      },
    });

    // Helper: Build session cookie
    const makeSessionCookie = async (u: any) => {
      const token = await createSessionToken({
        userId: u.id,
        email: u.email,
        role: role.name,
        branchId: u.branchId,
        departmentId: u.departmentId,
        accessScope: u.accessScope,
      });
      return { [SESSION_COOKIE_NAME]: token };
    };

    // -------------------------------------------------------------------------
    // Test 1: Unauthenticated Request Guard
    // -------------------------------------------------------------------------
    section('1. Unauthenticated Access Protection');
    {
      const req = makeReq('http://localhost:3000/api/dashboard/stats');
      const res = await dashboardStatsHandler(req);
      assert(res.status === 401, 'Unauthenticated request returns HTTP 401');
      const data = await res.json();
      assert(data.error === 'Unauthorized', 'Error title is Unauthorized');
    }

    // -------------------------------------------------------------------------
    // Test 2: Company Scope User
    // -------------------------------------------------------------------------
    section('2. Company Scope Enforcement');
    {
      const cookie = await makeSessionCookie(companyUser);
      const req = makeReq('http://localhost:3000/api/dashboard/stats', cookie);
      const res = await dashboardStatsHandler(req);
      assert(res.status === 200, 'Company scope request returns HTTP 200');
      const data = await res.json();
      assert(data.source === 'database', 'Source is live database');
      assert(data.organization.totalBranches >= 3, 'Company scope sees all active branches');
      assert(data.organization.branchesList.some((b: any) => b.code === 'HQ-ACC'), 'Contains HQ-ACC branch');
      assert(data.organization.branchesList.some((b: any) => b.code === 'REG-TEMA'), 'Contains REG-TEMA branch');
      assert(data.organization.branchesList.some((b: any) => b.code === 'OUT-TEM-01'), 'Contains OUT-TEM-01 branch');
    }

    // -------------------------------------------------------------------------
    // Test 3: Branch Scope User
    // -------------------------------------------------------------------------
    section('3. Branch Scope Enforcement');
    {
      const cookie = await makeSessionCookie(branchUser);
      const req = makeReq('http://localhost:3000/api/dashboard/stats', cookie);
      const res = await dashboardStatsHandler(req);
      assert(res.status === 200, 'Branch scope request returns HTTP 200');
      const data = await res.json();
      assert(data.organization.totalBranches === 1, 'Branch scope sees exactly 1 assigned branch');
      assert(data.organization.branchesList[0].code === 'REG-TEMA', 'Assigned branch is REG-TEMA');
      assert(!data.organization.branchesList.some((b: any) => b.code === 'HQ-ACC'), 'HQ-ACC hidden from REG-TEMA branch scope');
    }

    // -------------------------------------------------------------------------
    // Test 4: BranchAndBelow Scope User
    // -------------------------------------------------------------------------
    section('4. BranchAndBelow Scope Enforcement');
    {
      const cookie = await makeSessionCookie(branchBelowUser);
      const req = makeReq('http://localhost:3000/api/dashboard/stats', cookie);
      const res = await dashboardStatsHandler(req);
      assert(res.status === 200, 'BranchAndBelow scope request returns HTTP 200');
      const data = await res.json();
      assert(data.organization.totalBranches >= 2, 'BranchAndBelow scope sees assigned branch plus sub-branches');
      assert(data.organization.branchesList.some((b: any) => b.code === 'REG-TEMA'), 'Contains REG-TEMA branch');
      assert(data.organization.branchesList.some((b: any) => b.code === 'OUT-TEM-01'), 'Contains child OUT-TEM-01 branch');
      assert(!data.organization.branchesList.some((b: any) => b.code === 'HQ-ACC'), 'Parent HQ-ACC hidden from REG-TEMA sub-tree scope');
    }

    // -------------------------------------------------------------------------
    // Test 5: Department Scope User
    // -------------------------------------------------------------------------
    section('5. Department Scope Enforcement');
    {
      const cookie = await makeSessionCookie(deptUser);
      const req = makeReq('http://localhost:3000/api/dashboard/stats', cookie);
      const res = await dashboardStatsHandler(req);
      assert(res.status === 200, 'Department scope request returns HTTP 200');
      const data = await res.json();
      assert(data.organization.totalDepartments >= 1, 'Department scope retrieves assigned department');
      assert(data.organization.departmentsList.some((d: any) => d.code === 'DEPT-ENG'), 'Contains DEPT-ENG department');
    }

    // -------------------------------------------------------------------------
    // Test 6: Own Scope User
    // -------------------------------------------------------------------------
    section('6. Own Scope Enforcement');
    {
      const cookie = await makeSessionCookie(ownUser);
      const req = makeReq('http://localhost:3000/api/dashboard/stats', cookie);
      const res = await dashboardStatsHandler(req);
      assert(res.status === 200, 'Own scope request returns HTTP 200');
      const data = await res.json();
      assert(data.organization.totalStaff === 1, 'Own scope totalStaff is exactly 1 (caller only)');
    }

    // -------------------------------------------------------------------------
    // Test 7: UserScopeGrant Active Grants Override
    // -------------------------------------------------------------------------
    section('7. UserScopeGrant Override Integration');
    {
      const cookie = await makeSessionCookie(grantUser);
      const req = makeReq('http://localhost:3000/api/dashboard/stats', cookie);
      const res = await dashboardStatsHandler(req);
      assert(res.status === 200, 'UserScopeGrant user request returns HTTP 200');
      const data = await res.json();
      assert(data.organization.totalBranches === 2, 'Branch user with 1 active grant sees 2 branches (REG-TEMA + granted OUT-TEM-01)');
      assert(data.organization.branchesList.some((b: any) => b.code === 'OUT-TEM-01'), 'Granted OUT-TEM-01 branch included via UserScopeGrant');
    }

  } finally {
    // Cleanup temporary test records
    if (activeGrant) await prisma.userScopeGrant.delete({ where: { id: activeGrant.id } }).catch(() => {});
    if (companyUser) await prisma.user.delete({ where: { id: companyUser.id } }).catch(() => {});
    if (branchUser) await prisma.user.delete({ where: { id: branchUser.id } }).catch(() => {});
    if (branchBelowUser) await prisma.user.delete({ where: { id: branchBelowUser.id } }).catch(() => {});
    if (deptUser) await prisma.user.delete({ where: { id: deptUser.id } }).catch(() => {});
    if (ownUser) await prisma.user.delete({ where: { id: ownUser.id } }).catch(() => {});
    if (grantUser) await prisma.user.delete({ where: { id: grantUser.id } }).catch(() => {});
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runStageD1Tests().catch((err) => {
  console.error('Stage D.1 Test Execution Failed:', err);
  process.exit(1);
});
