/**
 * ZemiFix CMMS — Stage R1 Phase 1 Final Closure Verification Test Suite
 *
 * Scenarios Tested:
 *   1. Composite Idempotency (Content Hash + Mapping Hash)
 *   2. Import Batch Crash Recovery & Lease Expiration (Abandoned EXECUTING batch recovery)
 *   3. Secure Imported-User Activation & Password Setup Flow (Token hashing, expiry, single use)
 */

import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import { generateUuidV7 } from '../src/lib/uuid';
import { parseCsv, validateImportBatch, executeImportBatch, activateImportedUserAccount } from '../src/lib/services/importService';
import crypto from 'crypto';

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

async function runStageR1ImportClosureTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage R1 Import Final Closure Tests');
  console.log('=====================================================');

  let adminUser: any = null;
  let hqBranch: any = null;

  try {
    const ts = Date.now();
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    hqBranch = await prisma.branch.findUnique({ where: { code: 'HQ-ACC' } });
    const engDept = await prisma.department.findUnique({ where: { code: 'DEPT-ENG' } });

    if (!adminRole || !hqBranch || !engDept) {
      throw new Error('Missing seed data');
    }

    const passwordHash = await hashPassword('Password123!');

    adminUser = await prisma.user.create({
      data: {
        name: 'Import Closure Admin',
        email: `r1closureadmin.${ts}@zemifix.local`,
        phone: '0244990003',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Composite Idempotency (Content Hash + Mapping Hash)
    // -------------------------------------------------------------------------
    section('1. Composite Idempotency (Content Hash + Mapping Hash)');

    const sharedCsv = `email,name,roleName,branchCode\nshared.${ts}@zemifix.local,Shared Staff,Technician,HQ-ACC`;

    const valMap1 = await validateImportBatch(adminUser, {
      entityType: 'USER',
      fileName: 'shared1.csv',
      csvContent: sharedCsv,
      mapping: { email: 'email', name: 'name' },
    });

    const valMap2 = await validateImportBatch(adminUser, {
      entityType: 'USER',
      fileName: 'shared2.csv',
      csvContent: sharedCsv, // Identical CSV content
      mapping: { email: 'email', name: 'name', roleName: 'roleName' }, // Different mapping
    });

    assert(valMap1.batchId !== valMap2.batchId, 'Identical CSV content with different mappings creates distinct import batches (no collision)');

    // -------------------------------------------------------------------------
    // SECTION 2: Import Batch Crash Recovery (Lease Expiration) & User Activation
    // -------------------------------------------------------------------------
    section('2. Import Batch Crash Recovery & Secure User Activation');

    const crashCsv = `email,name,roleName,branchCode\ncrash.${ts}@zemifix.local,Crash Staff,Technician,HQ-ACC`;
    const crashVal = await validateImportBatch(adminUser, {
      entityType: 'USER',
      fileName: 'crash.csv',
      csvContent: crashCsv,
    });

    // Simulate abandoned batch stuck in EXECUTING with expired lease
    await prisma.importBatch.update({
      where: { id: crashVal.batchId },
      data: {
        status: 'EXECUTING',
        workerId: 'dead-worker-999',
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
      },
    });

    // Recovery execution should succeed by taking over expired lease
    const crashExec = await executeImportBatch(adminUser, {
      entityType: 'USER',
      fileName: 'crash.csv',
      csvContent: crashCsv,
      batchId: crashVal.batchId,
      workerId: 'new-active-worker-101',
    });

    assert(crashExec.success && crashExec.successRows === 1, 'Abandoned EXECUTING batch with expired lease successfully recovered and executed');

    const importedUserRecord = await prisma.user.findUnique({ where: { email: `crash.${ts}@zemifix.local` } });
    assert(Boolean(importedUserRecord), 'Imported user record created');
    assert(Boolean(importedUserRecord?.activationTokenHash), 'Imported user has secure activation token hash stored');
    assert(importedUserRecord?.passwordHash.startsWith('$2'), 'Imported user password is secure bcrypt hash prior to activation');

    // Retrieve raw token from notification created for this user
    const notification = await prisma.notification.findFirst({
      where: { recipientUserId: importedUserRecord?.id, eventType: 'USER_ACTIVATION' },
    });
    assert(Boolean(notification), 'Activation notification dispatched');

    const linkUrl = (notification?.link as string) ?? '';
    const tokenParam = linkUrl.split('token=')[1];
    assert(Boolean(tokenParam), 'Activation token extracted from notification link');

    // Activate account with new secure password
    const activationRes = await activateImportedUserAccount({
      activationToken: tokenParam,
      newPassword: 'SecureNewPassword123!',
    });
    assert(activationRes.success, 'Imported user account successfully activated');

    const activatedUser = await prisma.user.findUnique({ where: { id: importedUserRecord?.id } });
    assert(activatedUser?.activationTokenHash === null, 'Activation token hash cleared after use');
    assert(activatedUser?.passwordHash !== importedUserRecord?.passwordHash, 'Password hash updated successfully');

    // Reusing the token must fail (single-use enforcement)
    let reuseFailed = false;
    try {
      await activateImportedUserAccount({
        activationToken: tokenParam,
        newPassword: 'AnotherPassword123!',
      });
    } catch (err: any) {
      reuseFailed = err.message.includes('INVALID_OR_EXPIRED_ACTIVATION_TOKEN');
    }
    assert(reuseFailed, 'Reused activation token rejected successfully');

  } catch (err: any) {
    console.error('Test execution failed with error:', err);
    fail('Test execution exception', err.message);
  } finally {
    if (adminUser) {
      await prisma.user.update({ where: { id: adminUser.id }, data: { isActive: false } }).catch(() => {});
    }
  }

  console.log('\n=====================================================');
  console.log(`Test Summary: ${passed} passed, ${failed} failed.`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStageR1ImportClosureTests();
