import type { Invoice, Budget, ExpenseRecord, Payment, Customer, TaxBreakdownLine } from '../types';

export const demoCustomers: Customer[] = [
  { id: 'cus-1', code: 'CST-001', name: 'Ghana Ports & Harbours Authority', contactName: 'Ama Sarpong', phone: '+233 30 271 2345', email: 'a.sarpong@gpha.com.gh', contractRef: 'SVC-CON-0041', outstandingBalance: 84500, activeWorkOrders: 4 },
  { id: 'cus-2', code: 'CST-002', name: 'Accra Brewery Limited', contactName: 'Ben Kofi', phone: '+233 30 224 8800', email: 'b.kofi@abl.com.gh', contractRef: 'SVC-CON-0038', outstandingBalance: 41200, activeWorkOrders: 2 },
  { id: 'cus-3', code: 'CST-003', name: 'Volta River Authority', contactName: 'Efua Mensah', phone: '+233 30 266 4000', email: 'e.mensah@vra.com.gh', contractRef: 'SVC-CON-0029', outstandingBalance: 0, activeWorkOrders: 1 },
];

export const demoInvoices: Invoice[] = [
  { id: 'inv-1', number: 'INV-00284', customer: 'Ghana Ports & Harbours Authority', workOrderNumber: 'WO-00284', issueDate: '2026-11-08', dueDate: '2026-11-22', subtotal: 68000, tax: 12240, total: 80240, paid: 0, status: 'Issued' },
  { id: 'inv-2', number: 'INV-00279', customer: 'Ghana Ports & Harbours Authority', workOrderNumber: 'WO-00279', issueDate: '2026-11-04', dueDate: '2026-11-18', subtotal: 3500, tax: 630, total: 4130, paid: 4130, status: 'Paid' },
  { id: 'inv-3', number: 'INV-00270', customer: 'Accra Brewery Limited', workOrderNumber: 'WO-00270', issueDate: '2026-10-25', dueDate: '2026-11-08', subtotal: 35000, tax: 6300, total: 41300, paid: 0, status: 'Overdue' },
  { id: 'inv-4', number: 'INV-00265', customer: 'Volta River Authority', workOrderNumber: 'WO-00265', issueDate: '2026-10-20', dueDate: '2026-11-03', subtotal: 18500, tax: 3330, total: 21830, paid: 21830, status: 'Paid' },
  { id: 'inv-5', number: 'INV-00258', customer: 'Accra Brewery Limited', workOrderNumber: 'WO-00258', issueDate: '2026-10-10', dueDate: '2026-10-24', subtotal: 22000, tax: 3960, total: 25960, paid: 12000, status: 'PartiallyPaid' },
];

export const demoBudgets: Budget[] = [
  { id: 'bg-1', branchName: 'Accra Head Office', department: 'Engineering & Maintenance', period: 'Nov 2026', category: 'Corrective Maintenance', budgeted: 80000, spent: 52800, utilization: 66 },
  { id: 'bg-2', branchName: 'Accra Head Office', department: 'Engineering & Maintenance', period: 'Nov 2026', category: 'Preventive Maintenance', budgeted: 60000, spent: 28400, utilization: 47 },
  { id: 'bg-3', branchName: 'Tema Industrial Region', department: 'Engineering & Maintenance', period: 'Nov 2026', category: 'Corrective Maintenance', budgeted: 45000, spent: 44200, utilization: 98 },
  { id: 'bg-4', branchName: 'Tema Industrial Region', department: 'Engineering & Maintenance', period: 'Nov 2026', category: 'Spare Parts & Materials', budgeted: 30000, spent: 19800, utilization: 66 },
  { id: 'bg-5', branchName: 'Kumasi Regional Hub', department: 'Facilities Management', period: 'Nov 2026', category: 'Facilities Maintenance', budgeted: 25000, spent: 14100, utilization: 56 },
  { id: 'bg-6', branchName: 'Accra Head Office', department: 'Facilities Management', period: 'Nov 2026', category: 'Contractor Services', budgeted: 50000, spent: 51200, utilization: 102 },
];

export const demoExpenses: ExpenseRecord[] = [
  { id: 'ex-1', number: 'EXP-00341', date: '2026-11-08', category: 'Spare Parts', description: 'Compressor gasket set & refrigerant for WO-00284', workOrderNumber: 'WO-00284', amount: 9440, branchName: 'Tema Industrial Region', status: 'Approved' },
  { id: 'ex-2', number: 'EXP-00340', date: '2026-11-08', category: 'Labour', description: 'Technician hours WO-00284 — Kwesi Mensah & assistant', workOrderNumber: 'WO-00284', amount: 387, branchName: 'Tema Industrial Region', status: 'Approved' },
  { id: 'ex-3', number: 'EXP-00339', date: '2026-11-07', category: 'Contractor', description: 'Otis annual lift inspection WO-00279', workOrderNumber: 'WO-00279', amount: 3500, branchName: 'Accra Head Office', status: 'Approved' },
  { id: 'ex-4', number: 'EXP-00338', date: '2026-11-05', category: 'Spare Parts', description: 'Generator oil and filters for PM service', amount: 5200, branchName: 'Accra Head Office', status: 'Pending' },
  { id: 'ex-5', number: 'EXP-00337', date: '2026-11-04', category: 'Transport', description: 'Vehicle fuel for field maintenance team', amount: 850, branchName: 'Tema Industrial Region', status: 'Approved' },
];

export const demoPayments: Payment[] = [
  { id: 'pay-1', number: 'PAY-00071', invoiceNumber: 'INV-00279', customer: 'Ghana Ports & Harbours Authority', date: '2026-11-06', method: 'Bank Transfer', amount: 4130, status: 'Cleared' },
  { id: 'pay-2', number: 'PAY-00070', invoiceNumber: 'INV-00265', customer: 'Volta River Authority', date: '2026-11-02', method: 'Bank Transfer', amount: 21830, status: 'Cleared' },
  { id: 'pay-3', number: 'PAY-00069', invoiceNumber: 'INV-00258', customer: 'Accra Brewery Limited', date: '2026-10-18', method: 'Mobile Money', amount: 12000, status: 'Cleared' },
];

// Ghana tax breakdown — rates are fetched from configuration in production, not hardcoded.
export const ghTaxBreakdown = (subtotal: number): TaxBreakdownLine[] => [
  { label: 'VAT (15%)', rate: 15, base: subtotal, amount: subtotal * 0.15 },
  { label: 'NHIL (2.5%)', rate: 2.5, base: subtotal, amount: subtotal * 0.025 },
  { label: 'GETFund Levy (2.5%)', rate: 2.5, base: subtotal, amount: subtotal * 0.025 },
  { label: 'COVID-19 Levy (1%)', rate: 1, base: subtotal, amount: subtotal * 0.01 },
];

export const expenditureTrend = [
  { month: 'Jun', labour: 42000, parts: 55000, contractor: 38000 },
  { month: 'Jul', labour: 44000, parts: 62000, contractor: 36000 },
  { month: 'Aug', labour: 40000, parts: 48000, contractor: 40000 },
  { month: 'Sep', labour: 47000, parts: 58000, contractor: 46000 },
  { month: 'Oct', labour: 51000, parts: 72000, contractor: 46000 },
  { month: 'Nov', labour: 53000, parts: 84500, contractor: 47000 },
];
