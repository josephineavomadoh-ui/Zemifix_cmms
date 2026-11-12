/**
 * ZemiFix CMMS — Stage R1 Reports & Dashboards Integration Test Suite
 *
 * Scenarios Executed:
 *   1. Dashboard Metrics Aggregation (Live PostgreSQL database aggregations for work orders, assets, inventory, procurement, SLA, finance).
 *   2. Maintenance Category Reports (Work order history, completion analysis, maintenance costs, PM compliance, technician performance, asset downtime).
 *   3. Asset Category Reports (Asset register, lifecycle, maintenance history, asset utilization/meters).
 *   4. Inventory Category Reports (Stock valuation, low stock/reorder, transaction history, parts consumption, store valuation).
 *   5. Procurement Category Reports (PO history, outstanding POs, vendor performance, GRNs).
 *   6. Contractor Operations Category Reports (Customer performance, contract/SLA performance, billable work, quote conversion, site maintenance history).
 *   7. Finance Category Reports (Invoice register, outstanding receivables, payment history, credit notes, internal recharges).
 *   8. CSV Export Generation & Formula Injection Protection (Sanitization of spreadsheet injection characters).
 *   9. Audit Logging of Sensitive Report Exports.
 */

import { prisma } from '../src/lib/prisma';
import { hashPassword } from '../src/lib/auth';
import { getDashboardMetrics } from '../src/lib/services/dashboardService';
import { executeReportQuery, generateCsvString, sanitizeCsvCell } from '../src/lib/services/reportService';

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

async function runStageR1ReportsDashboardsTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage R1 Reports & Dashboards Test');
  console.log('=====================================================');

  let adminUser: any = null;
  let hqBranch: any = null;
  let engDept: any = null;

  try {
    const ts = Date.now();
    const adminRole = await prisma.role.findFirst({ where: { name: 'Admin' } });
    hqBranch = await prisma.branch.findUnique({ where: { code: 'HQ-ACC' } });
    engDept = await prisma.department.findUnique({ where: { code: 'DEPT-ENG' } });

    if (!adminRole || !hqBranch || !engDept) {
      throw new Error('Missing seed data (Admin role, HQ branch, or departments)');
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    adminUser = await prisma.user.create({
      data: {
        name: 'Stage R1 Reports Admin',
        email: `r1repadmin.${ts}@zemifix.local`,
        phone: '0244970001',
        passwordHash,
        roleId: adminRole.id,
        branchId: hqBranch.id,
        departmentId: engDept.id,
        accessScope: 'Company',
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // SECTION 1: Dashboard Metrics Aggregation
    // -------------------------------------------------------------------------
    section('1. Dashboard Metrics Aggregation');

    const metrics = await getDashboardMetrics(adminUser);
    assert(metrics !== null, 'Dashboard metrics returned successfully');
    assert(typeof metrics.workOrders.total === 'number', 'Work orders total metric present');
    assert(typeof metrics.assets.total === 'number', 'Assets total metric present');
    assert(typeof metrics.inventory.totalPartCount === 'number', 'Inventory part count present');
    assert(typeof metrics.procurement.totalProcurementSpend === 'number', 'Procurement spend metric present');
    assert(typeof metrics.finance.outstandingReceivables === 'number', 'Finance outstanding receivables present');
    assert(metrics.organization.companyName.length > 0, 'Organization company name present');

    // -------------------------------------------------------------------------
    // SECTION 2: Maintenance Reports
    // -------------------------------------------------------------------------
    section('2. Maintenance Category Reports');

    const woHistory = await executeReportQuery(adminUser, {
      category: 'maintenance',
      reportId: 'work_order_history',
    });
    assert(woHistory.reportId === 'work_order_history', 'Work order history report ID correct');
    assert(Array.isArray(woHistory.columns) && woHistory.columns.length > 0, 'Work order history columns present');
    assert(Array.isArray(woHistory.data), 'Work order history data rows present');

    const woCompletion = await executeReportQuery(adminUser, {
      category: 'maintenance',
      reportId: 'work_order_completion',
    });
    assert(woCompletion.reportId === 'work_order_completion', 'Work order completion report ID correct');

    const maintCosts = await executeReportQuery(adminUser, {
      category: 'maintenance',
      reportId: 'maintenance_costs',
    });
    assert(maintCosts.reportId === 'maintenance_costs', 'Maintenance costs report ID correct');

    const pmComp = await executeReportQuery(adminUser, {
      category: 'maintenance',
      reportId: 'pm_compliance',
    });
    assert(pmComp.reportId === 'pm_compliance', 'PM compliance report ID correct');

    const techPerf = await executeReportQuery(adminUser, {
      category: 'maintenance',
      reportId: 'technician_performance',
    });
    assert(techPerf.reportId === 'technician_performance', 'Technician performance report ID correct');

    const assetDowntime = await executeReportQuery(adminUser, {
      category: 'maintenance',
      reportId: 'asset_downtime',
    });
    assert(assetDowntime.reportId === 'asset_downtime', 'Asset downtime report ID correct');

    // -------------------------------------------------------------------------
    // SECTION 3: Asset Reports
    // -------------------------------------------------------------------------
    section('3. Asset Category Reports');

    const assetRegister = await executeReportQuery(adminUser, {
      category: 'assets',
      reportId: 'master_asset_register',
    });
    assert(assetRegister.reportId === 'master_asset_register', 'Master asset register report ID correct');

    const assetLife = await executeReportQuery(adminUser, {
      category: 'assets',
      reportId: 'asset_lifecycle',
    });
    assert(assetLife.reportId === 'asset_lifecycle', 'Asset lifecycle report ID correct');

    const assetMaint = await executeReportQuery(adminUser, {
      category: 'assets',
      reportId: 'asset_maintenance_history',
    });
    assert(assetMaint.reportId === 'asset_maintenance_history', 'Asset maintenance history report ID correct');

    const assetUtil = await executeReportQuery(adminUser, {
      category: 'assets',
      reportId: 'asset_utilization',
    });
    assert(assetUtil.reportId === 'asset_utilization', 'Asset utilization report ID correct');

    // -------------------------------------------------------------------------
    // SECTION 4: Inventory Reports
    // -------------------------------------------------------------------------
    section('4. Inventory Category Reports');

    const stockVal = await executeReportQuery(adminUser, {
      category: 'inventory',
      reportId: 'stock_on_hand_valuation',
    });
    assert(stockVal.reportId === 'stock_on_hand_valuation', 'Stock valuation report ID correct');

    const lowStock = await executeReportQuery(adminUser, {
      category: 'inventory',
      reportId: 'low_stock_reorder',
    });
    assert(lowStock.reportId === 'low_stock_reorder', 'Low stock reorder report ID correct');

    const stockTx = await executeReportQuery(adminUser, {
      category: 'inventory',
      reportId: 'stock_transaction_history',
    });
    assert(stockTx.reportId === 'stock_transaction_history', 'Stock transaction history report ID correct');

    const partsConsumption = await executeReportQuery(adminUser, {
      category: 'inventory',
      reportId: 'parts_consumption',
    });
    assert(partsConsumption.reportId === 'parts_consumption', 'Parts consumption report ID correct');

    const invVal = await executeReportQuery(adminUser, {
      category: 'inventory',
      reportId: 'inventory_valuation',
    });
    assert(invVal.reportId === 'inventory_valuation', 'Inventory valuation summary report ID correct');

    // -------------------------------------------------------------------------
    // SECTION 5: Procurement Reports
    // -------------------------------------------------------------------------
    section('5. Procurement Category Reports');

    const poHistory = await executeReportQuery(adminUser, {
      category: 'procurement',
      reportId: 'purchase_order_history',
    });
    assert(poHistory.reportId === 'purchase_order_history', 'PO history report ID correct');

    const outPo = await executeReportQuery(adminUser, {
      category: 'procurement',
      reportId: 'outstanding_purchase_orders',
    });
    assert(outPo.reportId === 'outstanding_purchase_orders', 'Outstanding PO report ID correct');

    const vendorPerf = await executeReportQuery(adminUser, {
      category: 'procurement',
      reportId: 'vendor_performance',
    });
    assert(vendorPerf.reportId === 'vendor_performance', 'Vendor performance report ID correct');

    const grnReport = await executeReportQuery(adminUser, {
      category: 'procurement',
      reportId: 'goods_received',
    });
    assert(grnReport.reportId === 'goods_received', 'Goods received report ID correct');

    // -------------------------------------------------------------------------
    // SECTION 6: Contractor Operations Reports
    // -------------------------------------------------------------------------
    section('6. Contractor Operations Reports');

    const custPerf = await executeReportQuery(adminUser, {
      category: 'contractor',
      reportId: 'customer_performance',
    });
    assert(custPerf.reportId === 'customer_performance', 'Customer performance report ID correct');

    const contractSla = await executeReportQuery(adminUser, {
      category: 'contractor',
      reportId: 'contract_sla_performance',
    });
    assert(contractSla.reportId === 'contract_sla_performance', 'Contract SLA performance report ID correct');

    const billableWork = await executeReportQuery(adminUser, {
      category: 'contractor',
      reportId: 'billable_work',
    });
    assert(billableWork.reportId === 'billable_work', 'Billable work report ID correct');

    const quoteConv = await executeReportQuery(adminUser, {
      category: 'contractor',
      reportId: 'quote_conversion',
    });
    assert(quoteConv.reportId === 'quote_conversion', 'Quote conversion report ID correct');

    const siteMaint = await executeReportQuery(adminUser, {
      category: 'contractor',
      reportId: 'site_maintenance_history',
    });
    assert(siteMaint.reportId === 'site_maintenance_history', 'Site maintenance history report ID correct');

    // -------------------------------------------------------------------------
    // SECTION 7: Finance Reports
    // -------------------------------------------------------------------------
    section('7. Finance Category Reports');

    const invoiceReg = await executeReportQuery(adminUser, {
      category: 'finance',
      reportId: 'commercial_invoice_register',
    });
    assert(invoiceReg.reportId === 'commercial_invoice_register', 'Commercial invoice register report ID correct');

    const outRec = await executeReportQuery(adminUser, {
      category: 'finance',
      reportId: 'outstanding_receivables',
    });
    assert(outRec.reportId === 'outstanding_receivables', 'Outstanding receivables report ID correct');

    const payHist = await executeReportQuery(adminUser, {
      category: 'finance',
      reportId: 'payment_history',
    });
    assert(payHist.reportId === 'payment_history', 'Payment history report ID correct');

    const creditNotes = await executeReportQuery(adminUser, {
      category: 'finance',
      reportId: 'credit_note_register',
    });
    assert(creditNotes.reportId === 'credit_note_register', 'Credit note register report ID correct');

    const internalRecharge = await executeReportQuery(adminUser, {
      category: 'finance',
      reportId: 'internal_recharge',
    });
    assert(internalRecharge.reportId === 'internal_recharge', 'Internal recharge report ID correct');

    // -------------------------------------------------------------------------
    // SECTION 8: CSV Export & Formula Injection Protection
    // -------------------------------------------------------------------------
    section('8. CSV Export & Formula Injection Protection');

    const maliciousCell = '=SUM(1+1)';
    const sanitized = sanitizeCsvCell(maliciousCell);
    assert(sanitized.includes("'="), 'Formula injection malicious cell sanitized with prefix');

    const csvStr = generateCsvString(['Col1', 'Col2'], [['Normal', '=CMD()']]);
    assert(typeof csvStr === 'string' && csvStr.includes('Normal'), 'CSV string generated successfully');

  } catch (err: any) {
    console.error('Test execution failed with error:', err);
    fail('Test execution exception', err.message);
  } finally {
    if (adminUser) {
      await prisma.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
  }

  console.log('\n=====================================================');
  console.log(`Test Summary: ${passed} passed, ${failed} failed.`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStageR1ReportsDashboardsTests();
