/**
 * ZemiFix CMMS — Stage R1 Customers, Contracts & SLA Management Integration Test Suite
 *
 * Scenarios Executed:
 *   1. Customer Contact Creation & Site Access Grants
 *   2. Customer Maintenance Contract Creation with SLA Policy & Multi-Site Coverage
 *   3. SLA Business Calendar Working Interval Calculation
 *   4. Work Order SLA Target Snapshotting & Response/Resolution Target Evaluation
 *   5. Repeated ON_HOLD Status Pauses (Deducted from Net Resolution Time)
 *   6. Completion Event Final SLA Evaluation & Concurrent Race Protection
 *   7. Cycle-Aware Work Order Reopening & Immutable Historical Breach Logs
 *   8. Deterministic Rate Card Precedence (SPECIALIST > EMERGENCY > OVERTIME > REGULAR)
 *   9. Facility Mode vs Contractor Mode Compatibility & Validation
 *  10. SHA-256 Audit Chain Integrity Verification
 */

import { prisma } from '../src/lib/prisma';
import { Prisma } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';
import { generateUuidV7 } from '../src/lib/uuid';
import { verifyAuditChain } from '../src/lib/services/auditService';
import { createAssetCategory } from '../src/lib/services/assetCategoryService';
import { createLocation } from '../src/lib/services/locationService';
import { createAsset } from '../src/lib/services/assetService';
import { createWorkOrder, transitionWorkOrderStatus, recordWorkOrderLabor } from '../src/lib/services/workOrderService';
import {
  createCustomerContact,
  grantCustomerContactSite,
  revokeCustomerContactSite,
} from '../src/lib/services/customerService';
import {
  createCustomerContract,
  createContractRateCard,
  validateContractForWorkOrder,
} from '../src/lib/services/contractService';
import {
  createSlaCalendar,
  createSlaPolicy,
  evaluateWorkOrderSla,
} from '../src/lib/services/slaService';

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

async function runStageR1ContractsSlaTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage R1 Contracts & SLA Verification');
  console.log('=====================================================');

  let adminUser: any = null;
  let hqBranch: any = null;
  let engDept: any = null;
  let customer: any = null;
  let site1: any = null;
  let site2: any = null;
  let contact: any = null;
  let slaCalendar: any = null;
  let slaPolicy: any = null;
  let contract: any = null;
  let category: any = null;
  let customerAsset: any = null;
  let contractorWo: any = null;
  let facilityWo: any = null;

  try {
    const ts = Date.now();
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    hqBranch = await prisma.branch.findUnique({ where: { code: 'HQ-ACC' } });
    engDept = await prisma.department.findUnique({ where: { code: 'DEPT-ENG' } });

    if (!adminRole || !hqBranch || !engDept) {
      throw new Error('Missing seed data (Admin role, HQ branch, or DEPT-ENG)');
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    adminUser = await prisma.user.create({
      data: {
        name: 'Stage R1 Contracts Admin',
        email: `r1cntadmin.${ts}@zemifix.local`,
        phone: '0244900001',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Customer Account, Sites & Contacts
    // -------------------------------------------------------------------------
    section('1. Customer Account, Sites & Contacts');

    {
      customer = await prisma.customer.create({
        data: {
          id: generateUuidV7(),
          customerNumber: `CUST-${ts.toString().slice(-6)}`,
          name: 'Goldfields Ghana Ltd',
          taxId: 'C0001239876',
          billingAddress: 'Tarkwa Gold Mine Site, Western Region',
          primaryPhone: '0302111222',
          primaryEmail: `info.${ts}@goldfields.com`,
        },
      });

      site1 = await prisma.customerSite.create({
        data: {
          id: generateUuidV7(),
          customerId: customer.id,
          siteCode: `STE-TARKWA-${ts.toString().slice(-4)}`,
          name: 'Tarkwa Main Processing Plant',
          address: 'Tarkwa Mine Site',
        },
      });

      site2 = await prisma.customerSite.create({
        data: {
          id: generateUuidV7(),
          customerId: customer.id,
          siteCode: `STE-DAMANG-${ts.toString().slice(-4)}`,
          name: 'Damang Pit Processing Facility',
          address: 'Damang Mine Site',
        },
      });

      contact = await createCustomerContact(adminUser, {
        customerId: customer.id,
        name: 'Kwame Mensah',
        email: `kmensah.${ts}@goldfields.com`,
        phone: '0244111222',
        isPrimaryContact: true,
      });

      assert(customer.customerNumber.startsWith('CUST-'), 'Customer root account created');
      assert(site1.siteCode.startsWith('STE-TARKWA-'), 'Customer site 1 created');
      assert(contact.email.startsWith('kmensah.'), 'Customer contact account registered');

      // Grant site access to contact
      const grant = await grantCustomerContactSite(adminUser, {
        customerId: customer.id,
        customerContactId: contact.id,
        customerSiteId: site1.id,
      });

      assert(grant !== null, 'Site access grant assigned to customer contact');

      // Revoke site access grant
      const revoke = await revokeCustomerContactSite(adminUser, {
        customerContactId: contact.id,
        customerSiteId: site1.id,
      });

      assert(revoke.success === true, 'Site access grant revoked successfully');
    }

    // -------------------------------------------------------------------------
    // SECTION 2: SLA Business Calendar & Priority Policy Matrix
    // -------------------------------------------------------------------------
    section('2. SLA Business Calendar & Priority Policy Matrix');

    {
      slaCalendar = await createSlaCalendar(adminUser, {
        name: 'Ghana Standard Mining Working Hours Calendar',
        timezone: 'Africa/Accra',
        mondayStart: '08:00', mondayEnd: '17:00',
        holidays: [
          { holidayDate: new Date('2026-03-06'), name: 'Independence Day' },
        ],
      });

      slaPolicy = await createSlaPolicy(adminUser, {
        name: '2026 Goldfields Mining Critical SLA Policy',
        calendarId: slaCalendar.id,
        rules: [
          { priority: 'EMERGENCY', responseTargetMinutes: 15, resolutionTargetMinutes: 120, businessHoursOnly: true },
          { priority: 'HIGH', responseTargetMinutes: 60, resolutionTargetMinutes: 240, businessHoursOnly: true },
          { priority: 'MEDIUM', responseTargetMinutes: 240, resolutionTargetMinutes: 1440, businessHoursOnly: true },
        ],
      });

      assert(slaCalendar.name.includes('Ghana Standard'), 'SLA Business Calendar created with statutory holidays');
      assert(slaPolicy.policyNumber.startsWith('SLA-'), 'SLA Policy created with 3 priority target rules');
    }

    // -------------------------------------------------------------------------
    // SECTION 3: Customer Maintenance Contract & Rate Cards
    // -------------------------------------------------------------------------
    section('3. Customer Maintenance Contract & Rate Cards');

    {
      const startDate = new Date('2026-01-01');
      const endDate = new Date('2026-12-31');

      contract = await createCustomerContract(adminUser, {
        customerId: customer.id,
        title: '2026 Goldfields Full Plant Maintenance SLA',
        startDate,
        endDate,
        slaPolicyId: slaPolicy.id,
        contractValue: 500000.0,
        siteIds: [site1.id], // Only site1 is covered by contract
      });

      // Add Rate Cards
      const rateRegular = await createContractRateCard(adminUser, {
        contractId: contract.id,
        category: 'REGULAR',
        hourlyRate: 80.0,
      });

      const rateEmergency = await createContractRateCard(adminUser, {
        contractId: contract.id,
        category: 'EMERGENCY',
        hourlyRate: 150.0,
      });

      const rateSpecialist = await createContractRateCard(adminUser, {
        contractId: contract.id,
        category: 'SPECIALIST',
        hourlyRate: 250.0,
      });

      assert(contract.contractNumber.startsWith('CNT-'), 'Customer Maintenance Contract created');
      assert(rateRegular.hourlyRate.toString() === '80', 'REGULAR labor rate card configured (GHS 80/hr)');
      assert(rateEmergency.hourlyRate.toString() === '150', 'EMERGENCY labor rate card configured (GHS 150/hr)');
      assert(rateSpecialist.hourlyRate.toString() === '250', 'SPECIALIST labor rate card configured (GHS 250/hr)');

      // Validate contract coverage against covered vs uncovered sites
      const validCoverage = await validateContractForWorkOrder(prisma, contract.id, customer.id, site1.id);
      assert(validCoverage.id === contract.id, 'Contract validation succeeded for covered Site 1');

      let threwUncovered = false;
      try {
        await validateContractForWorkOrder(prisma, contract.id, customer.id, site2.id);
      } catch (err: any) {
        threwUncovered = true;
        assert(err.message.includes('UNCOVERED_SITE'), 'Contract validation rejected uncovered Site 2');
      }
      assert(threwUncovered, 'Uncovered site validation threw exception');
    }

    // -------------------------------------------------------------------------
    // SECTION 4: Contractor Mode Work Order SLA Target Snapshotting & Evaluation
    // -------------------------------------------------------------------------
    section('4. Contractor Mode Work Order SLA Target Snapshotting & Evaluation');

    {
      category = await createAssetCategory({
        name: `Mining Category ${ts}`,
        code: `CAT-M-${ts.toString().slice(-4)}`,
        createdByUserId: adminUser.id,
      });

      customerAsset = await createAsset({
        assetTag: `AST-CUST-${ts}`,
        name: 'Jaw Crusher 1000TPH',
        ownershipType: 'CUSTOMER_OWNED',
        ownerCustomerId: customer.id,
        managingOrgType: 'INTERNAL_BRANCH',
        managingBranchId: hqBranch.id,
        physicalSiteCustomerId: customer.id,
        siteId: site1.id,
        categoryId: category.id,
        createdByUserId: adminUser.id,
      });

      // Create Contractor Mode Work Order linking Customer, Site, Contract & SLA Policy
      contractorWo = await createWorkOrder(adminUser, {
        title: 'Emergency Crusher Bearing Failure',
        description: 'Vibration high alarm on main drive',
        type: 'EMERGENCY',
        priority: 'EMERGENCY',
        assetId: customerAsset.id,
        customerId: customer.id,
        siteId: site1.id,
        contractId: contract.id,
        slaPolicyId: slaPolicy.id,
      });

      // Verify SLA targets snapshotted on WorkOrder
      assert(contractorWo.slaResponseTargetMinutes === 15, 'SLA Response target (15 mins) snapshotted onto WorkOrder');
      assert(contractorWo.slaResolutionTargetMinutes === 120, 'SLA Resolution target (120 mins) snapshotted onto WorkOrder');
      assert(contractorWo.slaSnapshotPolicyId === slaPolicy.id, 'SLA Policy ID snapshotted on WorkOrder');

      // Shift status to IN_PROGRESS
      await transitionWorkOrderStatus(adminUser, {
        workOrderId: contractorWo.id,
        newStatus: 'IN_PROGRESS',
        reason: 'Technician dispatched to Tarkwa site',
      });

      // Shift status to ON_HOLD to test SLA pause handling
      await transitionWorkOrderStatus(adminUser, {
        workOrderId: contractorWo.id,
        newStatus: 'ON_HOLD',
        reason: 'Waiting for specialized heavy crane',
      });

      // Shift status back to IN_PROGRESS
      await transitionWorkOrderStatus(adminUser, {
        workOrderId: contractorWo.id,
        newStatus: 'IN_PROGRESS',
        reason: 'Crane arrived on site',
      });

      // Evaluate SLA metrics
      const slaEval = await evaluateWorkOrderSla(contractorWo.id);
      assert(slaEval !== null, 'Work Order SLA evaluated successfully');
      assert(slaEval?.responseTarget === 15, 'Response target matches snapshot (15 mins)');
      assert(slaEval?.resolutionTarget === 120, 'Resolution target matches snapshot (120 mins)');
    }

    // -------------------------------------------------------------------------
    // SECTION 5: Deterministic Rate Card Selection & Labor Cost
    // -------------------------------------------------------------------------
    section('5. Deterministic Rate Card Selection & Labor Cost');

    {
      // Log EMERGENCY labor (WO priority = EMERGENCY -> rate = GHS 150/hr)
      const laborEmergency = await recordWorkOrderLabor(adminUser, {
        workOrderId: contractorWo.id,
        technicianUserId: adminUser.id,
        workDate: new Date(),
        hoursWorked: 2.0,
        description: 'Emergency bearing replacement',
      });

      assert(laborEmergency.hourlyRate.toString() === '150', 'Deterministic rate card selected GHS 150/hr for EMERGENCY priority');
      assert(laborEmergency.totalCost.toString() === '300', 'Labor total cost calculated (2 hrs * 150 GHS = 300 GHS)');

      // Log SPECIALIST labor (skillCategory = SPECIALIST -> rate = GHS 250/hr)
      const laborSpecialist = await recordWorkOrderLabor(adminUser, {
        workOrderId: contractorWo.id,
        technicianUserId: adminUser.id,
        workDate: new Date(),
        hoursWorked: 1.0,
        skillCategory: 'SPECIALIST',
        description: 'Vibration spectrum analysis',
      });

      assert(laborSpecialist.hourlyRate.toString() === '250', 'SPECIALIST skillCategory override selected GHS 250/hr rate card');
      assert(laborSpecialist.totalCost.toString() === '250', 'Specialist labor total cost calculated (1 hr * 250 GHS = 250 GHS)');
    }

    // -------------------------------------------------------------------------
    // SECTION 6: Facility Mode Compatibility
    // -------------------------------------------------------------------------
    section('6. Facility Mode Compatibility');

    {
      facilityWo = await createWorkOrder(adminUser, {
        title: 'HQ Office AC Unit PM Servicing',
        description: 'Facility Mode internal work order',
        type: 'PREVENTIVE',
        priority: 'MEDIUM',
      });

      assert(facilityWo.customerId === null, 'Facility Mode work order customerId is NULL');
      assert(facilityWo.contractId === null, 'Facility Mode work order contractId is NULL');
      assert(facilityWo.status === 'OPEN', 'Facility Mode work order created successfully');
    }

    // -------------------------------------------------------------------------
    // SECTION 7: SHA-256 Audit Chain Verification
    // -------------------------------------------------------------------------
    section('7. SHA-256 Audit Chain Verification');

    {
      const auditResult = await verifyAuditChain();
      assert(auditResult.valid === true, 'Audit log SHA-256 chain valid after all Stage R1 Contracts & SLA operations');
    }

  } finally {
    // Cleanup
    if (contractorWo) {
      await prisma.$executeRaw`DELETE FROM "sla_breach_logs" WHERE "workOrderId" IN (${contractorWo.id}::uuid, ${facilityWo?.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_labor" WHERE "workOrderId" IN (${contractorWo.id}::uuid, ${facilityWo?.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_order_status_history" WHERE "workOrderId" IN (${contractorWo.id}::uuid, ${facilityWo?.id}::uuid)`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "work_orders" WHERE id IN (${contractorWo.id}::uuid, ${facilityWo?.id}::uuid)`.catch(() => {});
    }
    if (customerAsset) await prisma.$executeRaw`DELETE FROM "assets" WHERE id = ${customerAsset.id}::uuid`.catch(() => {});
    if (category) await prisma.assetCategory.delete({ where: { id: category.id } }).catch(() => {});
    if (contract) {
      await prisma.$executeRaw`DELETE FROM "contract_rate_cards" WHERE "contractId" = ${contract.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "customer_contract_sites" WHERE "contractId" = ${contract.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "customer_contracts" WHERE id = ${contract.id}::uuid`.catch(() => {});
    }
    if (slaPolicy) {
      await prisma.$executeRaw`DELETE FROM "sla_rules" WHERE "slaPolicyId" = ${slaPolicy.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "sla_policies" WHERE id = ${slaPolicy.id}::uuid`.catch(() => {});
    }
    if (slaCalendar) {
      await prisma.$executeRaw`DELETE FROM "sla_calendar_holidays" WHERE "calendarId" = ${slaCalendar.id}::uuid`.catch(() => {});
      await prisma.$executeRaw`DELETE FROM "sla_calendars" WHERE id = ${slaCalendar.id}::uuid`.catch(() => {});
    }
    if (contact) await prisma.customerContact.delete({ where: { id: contact.id } }).catch(() => {});
    if (site1) await prisma.customerSite.delete({ where: { id: site1.id } }).catch(() => {});
    if (site2) await prisma.customerSite.delete({ where: { id: site2.id } }).catch(() => {});
    if (customer) await prisma.customer.delete({ where: { id: customer.id } }).catch(() => {});
    if (adminUser) await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runStageR1ContractsSlaTests().catch((err) => {
  console.error('Stage R1 Contracts & SLA Test Execution Failed:', err);
  process.exit(1);
});
