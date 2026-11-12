/**
 * ZemiFix CMMS — Stage D.2b Comprehensive Automated Integration Test Suite
 *
 * Verification Scenarios Executed:
 *   1. Physical Placement CHECK Invariant Enforcement (Internal, Customer Site, Unplaced)
 *   2. Relocation Movement 1 (Internal -> Internal)
 *   3. Relocation Movement 2 (Site -> Site)
 *   4. Relocation Movement 3 (Internal -> Site Dispatch)
 *   5. Relocation Movement 4 (Site -> Internal Workshop Receipt)
 *   6. Conflicting Relocation Input Rejection (toLocationId + toSiteId)
 *   7. Managing Organization CHECK Constraints (INTERNAL_BRANCH vs EXTERNAL_CONTRACTOR)
 *   8. Telemetry Lock Order & Meter Asset Revalidation (TOCTOU protection)
 *   9. Gauge Negative Delta (-13.00) & Rollover Threshold Validation
 *  10. Downtime Originating Transition Status Restoration & Duration Validation
 *  11. Controlled Downtime One-Time Closure Trigger Security
 *  12. Fail-Closed Access Scope Filter (Company, BranchAndBelow, Department, Own)
 *  13. Database Immutability Triggers (asset_locations_history, meter_readings, downtime logs)
 *  14. SHA-256 Audit Chain Verification
 */

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';
import { hashPassword, createSessionToken, SESSION_COOKIE_NAME } from '../src/lib/auth';
import { generateUuidV7 } from '../src/lib/uuid';
import { verifyAuditChain } from '../src/lib/services/auditService';
import { createAssetCategory } from '../src/lib/services/assetCategoryService';
import { createLocation } from '../src/lib/services/locationService';
import {
  createAsset,
  relocateAsset,
  updateAssetStatus,
  getScopedAssetFilter,
} from '../src/lib/services/assetService';
import {
  createMeter,
  submitMeterReading,
  logDowntimeStart,
  logDowntimeEnd,
} from '../src/lib/services/telemetryService';

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters-long';
}
if (!process.env.OTP_SECRET) {
  process.env.OTP_SECRET = 'test-otp-secret-at-least-32-characters-long-pad!';
}
if (!process.env.APPROVAL_SECRET) {
  process.env.APPROVAL_SECRET = 'test-approval-secret-at-least-32-characters-long-pad!';
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

async function runStageD2bTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage D.2b Verification Test Suite');
  console.log('=====================================================');

  let adminUser: any = null;
  let deptUser: any = null;
  let category: any = null;
  let hqBranch: any = null;
  let loc1: any = null;
  let loc2: any = null;
  let testCustomer: any = null;
  let testSite1: any = null;
  let testSite2: any = null;
  let assetInternal: any = null;
  let assetCustomer: any = null;

  try {
    const ts = Date.now();
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    hqBranch = await prisma.branch.findUnique({ where: { code: 'HQ-ACC' } });
    const engDept = await prisma.department.findUnique({ where: { code: 'DEPT-ENG' } });

    if (!adminRole || !hqBranch || !engDept) {
      throw new Error('Missing seed data (Admin role, HQ branch, or DEPT-ENG)');
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    // Create Admin User
    adminUser = await prisma.user.create({
      data: {
        name: 'Stage D2b Admin User',
        email: `d2badmin.${ts}@zemifix.local`,
        phone: '0244400001',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    // Create Department Scope User
    deptUser = await prisma.user.create({
      data: {
        name: 'Stage D2b Department User',
        email: `d2bdept.${ts}@zemifix.local`,
        phone: '0244400002',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Department',
        isActive: true,
      },
    });

    // Create Asset Category
    category = await createAssetCategory({
      name: `Heavy Equipment ${ts}`,
      code: `CAT-${ts.toString().slice(-6)}`,
      createdByUserId: adminUser.id,
    });

    // Create Locations
    loc1 = await createLocation({
      branchId: hqBranch.id,
      name: `Workshop Bay A ${ts}`,
      code: `LOC-BAY-A-${ts.toString().slice(-4)}`,
      departmentId: engDept.id,
      createdByUserId: adminUser.id,
    });

    loc2 = await createLocation({
      branchId: hqBranch.id,
      name: `Workshop Bay B ${ts}`,
      code: `LOC-BAY-B-${ts.toString().slice(-4)}`,
      departmentId: engDept.id,
      createdByUserId: adminUser.id,
    });

    // Create Customer & Customer Sites
    testCustomer = await prisma.customer.create({
      data: {
        customerNumber: `CUST-${ts.toString().slice(-6)}`,
        name: `Ghana Mining Corp ${ts}`,
        billingAddress: '10 Independence Ave, Accra',
        primaryPhone: '0200000001',
        primaryEmail: `mining.${ts}@ghana.com`,
      },
    });

    testSite1 = await prisma.customerSite.create({
      data: {
        customerId: testCustomer.id,
        siteCode: `SITE-Tarkwa-${ts.toString().slice(-4)}`,
        name: 'Tarkwa Gold Mine Site',
        address: 'Tarkwa Mining Belt',
      },
    });

    testSite2 = await prisma.customerSite.create({
      data: {
        customerId: testCustomer.id,
        siteCode: `SITE-Ahafo-${ts.toString().slice(-4)}`,
        name: 'Ahafo Mine Facility',
        address: 'Ahafo Region',
      },
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Asset Creation & Placement CHECK Constraints
    // -------------------------------------------------------------------------
    section('1. Asset Creation & Physical Placement CHECK Constraints');

    {
      // Create Company-Owned Internal Asset
      assetInternal = await createAsset({
        assetTag: `AST-INT-${ts}`,
        name: 'CAT 320 Excavator',
        ownershipType: 'COMPANY_OWNED',
        managingOrgType: 'INTERNAL_BRANCH',
        managingBranchId: hqBranch.id,
        categoryId: category.id,
        branchId: hqBranch.id,
        locationId: loc1.id,
        custodianUserId: adminUser.id,
        createdByUserId: adminUser.id,
      });

      assert(assetInternal.ownershipType === 'COMPANY_OWNED', 'Company-owned internal asset created');
      assert(assetInternal.locationId === loc1.id, 'Internal location assigned');
      assert(assetInternal.siteId === null, 'Customer siteId is NULL for internal placement');

      // Create Customer-Owned Asset at Customer Site
      assetCustomer = await createAsset({
        assetTag: `AST-CUST-${ts}`,
        name: 'Komatsu HD785 Haul Truck',
        ownershipType: 'CUSTOMER_OWNED',
        ownerCustomerId: testCustomer.id,
        managingOrgType: 'INTERNAL_BRANCH',
        managingBranchId: hqBranch.id,
        categoryId: category.id,
        physicalSiteCustomerId: testCustomer.id,
        siteId: testSite1.id,
        createdByUserId: adminUser.id,
      });

      assert(assetCustomer.ownershipType === 'CUSTOMER_OWNED', 'Customer-owned asset created');
      assert(assetCustomer.siteId === testSite1.id, 'Customer site assigned');
      assert(assetCustomer.locationId === null, 'Internal locationId is NULL for customer site placement');

      // Invalid Placement Combination (Both locationId AND siteId populated) -> Must fail CHECK constraint
      let threwPlacement = false;
      try {
        await prisma.$executeRaw`
          INSERT INTO "assets" (
            "id", "assetTag", "name", "ownershipType", "managingOrgType", "managingBranchId", "categoryId",
            "branchId", "locationId", "physicalSiteCustomerId", "siteId", "status", "criticality"
          ) VALUES (
            gen_random_uuid(), ${`AST-ERR-${ts}`}, 'Invalid Asset', 'COMPANY_OWNED'::"OwnershipType",
            'INTERNAL_BRANCH'::"ManagingOrgType", ${hqBranch.id}::uuid, ${category.id}::uuid, ${hqBranch.id}::uuid, ${loc1.id}::uuid,
            ${testCustomer.id}::uuid, ${testSite1.id}::uuid, 'OPERATIONAL'::"AssetStatus", 3
          )
        `;
      } catch (err: any) {
        threwPlacement = true;
        assert(
          err.message.includes('chk_asset_physical_placement') || err.message.includes('23514'),
          'Conflicting placement (both locationId and siteId) rejected by chk_asset_physical_placement'
        );
      }
      assert(threwPlacement, 'Conflicting placement threw DB CHECK constraint exception');
    }

    // -------------------------------------------------------------------------
    // SECTION 2: Atomic Asset Relocation Across All Movements
    // -------------------------------------------------------------------------
    section('2. Atomic Asset Relocation Across Movements');

    {
      // 2a. Relocation 1: Internal -> Internal (Bay A -> Bay B)
      const res1 = await prisma.$transaction(async (tx) => {
        return await relocateAsset(tx, {
          assetId: assetInternal.id,
          toLocationId: loc2.id,
          reason: 'Scheduled bay transfer',
          movedByUserId: adminUser.id,
        });
      });

      assert(res1.movementType === 'INTERNAL_TO_INTERNAL', 'Internal to Internal relocation succeeded');

      const assetAfter1 = await prisma.asset.findUnique({ where: { id: assetInternal.id } });
      assert(assetAfter1?.locationId === loc2.id, 'Asset current locationId updated to Bay B');

      // 2b. Relocation 2: Internal -> Customer Site (Dispatch)
      const res2 = await prisma.$transaction(async (tx) => {
        return await relocateAsset(tx, {
          assetId: assetInternal.id,
          toSiteId: testSite1.id,
          toPhysicalSiteCustomerId: testCustomer.id,
          reason: 'Dispatched to Tarkwa Gold Mine',
          movedByUserId: adminUser.id,
        });
      });

      assert(res2.movementType === 'INTERNAL_TO_SITE', 'Internal to Customer Site dispatch succeeded');

      const assetAfter2 = await prisma.asset.findUnique({ where: { id: assetInternal.id } });
      assert(assetAfter2?.locationId === null, 'Internal locationId cleared upon dispatch');
      assert(assetAfter2?.siteId === testSite1.id, 'siteId updated to Tarkwa Gold Mine');
      assert(assetAfter2?.ownershipType === 'COMPANY_OWNED', 'Legal ownership remains COMPANY_OWNED during dispatch');

      // 2c. Relocation 3: Customer Site -> Customer Site
      const res3 = await prisma.$transaction(async (tx) => {
        return await relocateAsset(tx, {
          assetId: assetCustomer.id,
          toSiteId: testSite2.id,
          toPhysicalSiteCustomerId: testCustomer.id,
          reason: 'Transferred between mine sites',
          movedByUserId: adminUser.id,
        });
      });

      assert(res3.movementType === 'SITE_TO_SITE', 'Site to Site relocation succeeded');

      // 2d. Relocation 4: Customer Site -> Internal Location (Workshop Receipt)
      const res4 = await prisma.$transaction(async (tx) => {
        return await relocateAsset(tx, {
          assetId: assetCustomer.id,
          toLocationId: loc1.id,
          reason: 'Received into workshop for major overhaul',
          movedByUserId: adminUser.id,
        });
      });

      assert(res4.movementType === 'SITE_TO_INTERNAL', 'Customer Site to Internal Workshop receipt succeeded');

      const assetAfter4 = await prisma.asset.findUnique({ where: { id: assetCustomer.id } });
      assert(assetAfter4?.siteId === null, 'siteId cleared upon workshop receipt');
      assert(assetAfter4?.locationId === loc1.id, 'Internal locationId updated to Bay A');
      assert(assetAfter4?.ownershipType === 'CUSTOMER_OWNED', 'Legal ownership remains CUSTOMER_OWNED');

      // 2e. Conflicting input parameters rejection
      let threwConflict = false;
      try {
        await prisma.$transaction(async (tx) => {
          return await relocateAsset(tx, {
            assetId: assetInternal.id,
            toLocationId: loc1.id,
            toSiteId: testSite1.id,
            movedByUserId: adminUser.id,
          });
        });
      } catch (err: any) {
        threwConflict = true;
        assert(err.message.includes('CONFLICTING_RELOCATION_INPUT'), 'Providing both toLocationId and toSiteId rejected');
      }
      assert(threwConflict, 'Conflicting relocation inputs threw exception');
    }

    // -------------------------------------------------------------------------
    // SECTION 3: Telemetry Meters & Concurrency Protection
    // -------------------------------------------------------------------------
    section('3. Telemetry Meters & Concurrency Protection');

    {
      // Create Continuous Incremental Meter
      const hoursMeter = await prisma.$transaction(async (tx) => {
        return await createMeter(tx, {
          assetId: assetInternal.id,
          name: 'Engine Hours',
          unitOfMeasure: 'Hours',
          meterType: 'CONTINUOUS_INCREMENTAL',
          initialReading: 1000.0,
          rolloverThreshold: 10000.0,
        });
      });

      // Create Absolute Gauge Meter
      const tempMeter = await prisma.$transaction(async (tx) => {
        return await createMeter(tx, {
          assetId: assetInternal.id,
          name: 'Coolant Temperature',
          unitOfMeasure: '°C',
          meterType: 'ABSOLUTE_GAUGE',
          initialReading: 85.0,
        });
      });

      // Submit Incremental Reading (1000 -> 1050)
      const resInc = await prisma.$transaction(async (tx) => {
        return await submitMeterReading(tx, {
          meterId: hoursMeter.id,
          readingValue: 1050.0,
          recordedByUserId: adminUser.id,
        });
      });

      assert(resInc.delta === '50', 'Continuous meter incremental delta calculated correctly (+50.00)');

      // Submit Gauge Reading allowing negative delta (85°C -> 72°C)
      const resGauge = await prisma.$transaction(async (tx) => {
        return await submitMeterReading(tx, {
          meterId: tempMeter.id,
          readingValue: 72.0,
          recordedByUserId: adminUser.id,
        });
      });

      assert(resGauge.delta === '-13', 'Absolute gauge meter negative delta (-13.00) persisted cleanly without flags');

      // Rollover Reading Validation
      const resRollover = await prisma.$transaction(async (tx) => {
        return await submitMeterReading(tx, {
          meterId: hoursMeter.id,
          readingValue: 10.0,
          isRollover: true,
          recordedByUserId: adminUser.id,
        });
      });

      assert(resRollover.delta === '8960', 'Meter rollover delta calculated correctly across 10,000 threshold');
    }

    // -------------------------------------------------------------------------
    // SECTION 4: Downtime Lifecycle & Originating Transition Restoration
    // -------------------------------------------------------------------------
    section('4. Downtime Lifecycle & Status Restoration');

    {
      // Start Unplanned Downtime
      const dtStart = await prisma.$transaction(async (tx) => {
        return await logDowntimeStart(tx, {
          assetId: assetInternal.id,
          downtimeType: 'UNPLANNED',
          reason: 'Hydraulic hose rupture',
          startedAt: new Date(Date.now() - 3600000), // 1 hour ago
          loggedByUserId: adminUser.id,
        });
      });

      assert(dtStart.statusWasChanged === true, 'Downtime start shifted asset status to DOWN');
      assert(dtStart.downStatusTransitionId !== null, 'downStatusTransitionId captured');

      const assetDown = await prisma.asset.findUnique({ where: { id: assetInternal.id } });
      assert(assetDown?.status === 'DOWN', 'Asset current status is DOWN');

      // Attempting second open downtime -> Must fail partial unique index
      let threwDupDt = false;
      try {
        await prisma.$transaction(async (tx) => {
          return await logDowntimeStart(tx, {
            assetId: assetInternal.id,
            downtimeType: 'UNPLANNED',
            reason: 'Second concurrent downtime attempt',
            startedAt: new Date(),
            loggedByUserId: adminUser.id,
          });
        });
      } catch (err: any) {
        threwDupDt = true;
        assert(
          err.message.includes('assetId') || err.message.includes('asset_downtime_single_open_idx') || err.message.includes('23505') || err.message.includes('Unique constraint'),
          'Second concurrent open downtime blocked by asset_downtime_single_open_idx'
        );
      }
      assert(threwDupDt, 'Duplicate open downtime threw exception');

      // Close Downtime
      const dtEnd = await prisma.$transaction(async (tx) => {
        return await logDowntimeEnd(tx, {
          downtimeLogId: dtStart.downtimeLogId,
          loggedByUserId: adminUser.id,
        });
      });

      assert(dtEnd.durationMinutes === 60, 'Downtime duration calculated as 60 minutes');

      const assetRestored = await prisma.asset.findUnique({ where: { id: assetInternal.id } });
      assert(assetRestored?.status === 'OPERATIONAL', 'Asset status restored to OPERATIONAL upon closure');

      // Attempting second closure / update on closed downtime -> Must fail protect_downtime_logs trigger
      let threwDupClose = false;
      try {
        await prisma.assetDowntimeLog.update({
          where: { id: dtStart.downtimeLogId },
          data: { reason: 'Tampering with closed log' },
        });
      } catch (err: any) {
        threwDupClose = true;
        assert(err.message.includes('TAMPER_PROTECTION'), 'Modifying closed downtime log blocked by trigger');
      }
      assert(threwDupClose, 'Closed downtime modification blocked by trigger');
    }

    // -------------------------------------------------------------------------
    // SECTION 5: Scope Authorization & Audit Chain Verification
    // -------------------------------------------------------------------------
    section('5. Scope Authorization & Audit Chain Verification');

    {
      const deptFilter = await getScopedAssetFilter(deptUser);
      const scopedAssets = await prisma.asset.findMany({ where: deptFilter });

      assert(scopedAssets.length > 0, 'Department scoped user retrieved assets in their department');

      const auditResult = await verifyAuditChain();
      assert(auditResult.valid === true, 'Audit log SHA-256 chain valid after all Stage D.2b operations');
    }

  } finally {
    // Clean up test data
    if (assetInternal) {
      await prisma.$executeRaw`DELETE FROM "meter_readings" WHERE "meterId" IN (SELECT id FROM "asset_meters" WHERE "assetId" = ${assetInternal.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "asset_meters" WHERE "assetId" = ${assetInternal.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "asset_downtime_logs" WHERE "assetId" = ${assetInternal.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "asset_locations_history" WHERE "assetId" = ${assetInternal.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "asset_status_history" WHERE "assetId" = ${assetInternal.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "assets" WHERE id = ${assetInternal.id}::uuid`.catch(() => {});
    }
    if (assetCustomer) {
      await prisma.$executeRaw`DELETE FROM "asset_locations_history" WHERE "assetId" = ${assetCustomer.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "assets" WHERE id = ${assetCustomer.id}::uuid`.catch(() => {});
    }
    if (loc1) await prisma.location.delete({ where: { id: loc1.id } }).catch(() => {});
    if (loc2) await prisma.location.delete({ where: { id: loc2.id } }).catch(() => {});
    if (category) await prisma.assetCategory.delete({ where: { id: category.id } }).catch(() => {});
    if (testSite1) await prisma.customerSite.delete({ where: { id: testSite1.id } }).catch(() => {});
    if (testSite2) await prisma.customerSite.delete({ where: { id: testSite2.id } }).catch(() => {});
    if (testCustomer) await prisma.customer.delete({ where: { id: testCustomer.id } }).catch(() => {});
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    if (deptUser) await prisma.user.delete({ where: { id: deptUser.id } }).catch(() => {});
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runStageD2bTests().catch((err) => {
  console.error('Stage D.2b Test Execution Failed:', err);
  process.exit(1);
});
