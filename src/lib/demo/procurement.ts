import type { Supplier, PurchaseRequisition, PurchaseOrder, GoodsReceipt, SupplierInvoice } from '../types';

export const demoSuppliers: Supplier[] = [
  { id: 'sup-1', code: 'SUP-001', name: 'Trane West Africa Ltd', category: 'HVAC Equipment', contactName: 'Michael Asante', phone: '+233 30 277 0100', email: 'm.asante@trane-wa.com', address: 'Independence Ave, Accra', paymentTerms: 'Net 30', rating: 4.6, onTimeDelivery: 91, activeOrders: 2, totalSpend: 842000 },
  { id: 'sup-2', code: 'SUP-002', name: 'Cummins Ghana Ltd', category: 'Generators & Engines', contactName: 'Kweku Boateng', phone: '+233 30 221 0440', email: 'k.boateng@cummins-gh.com', address: 'Industrial Area, Tema', paymentTerms: 'Net 30', rating: 4.8, onTimeDelivery: 96, activeOrders: 1, totalSpend: 1240000 },
  { id: 'sup-3', code: 'SUP-003', name: 'Grundfos Ghana Distributor', category: 'Pumps & Valves', contactName: 'Sarah Antwi', phone: '+233 24 855 0220', email: 's.antwi@grundfos-gh.com', address: 'Ring Road East, Accra', paymentTerms: 'Net 14', rating: 4.3, onTimeDelivery: 87, activeOrders: 1, totalSpend: 310000 },
  { id: 'sup-4', code: 'SUP-004', name: 'AirFilter West Africa Ltd', category: 'Filters & Consumables', contactName: 'James Oppong', phone: '+233 55 700 0012', email: 'j.oppong@airfilter-wa.com', address: 'Spintex Road, Accra', paymentTerms: 'Cash on Delivery', rating: 3.9, onTimeDelivery: 78, activeOrders: 0, totalSpend: 84000 },
  { id: 'sup-5', code: 'SUP-005', name: 'SKF West Africa', category: 'Bearings & Transmission', contactName: 'Patricia Mensah', phone: '+233 30 225 8900', email: 'p.mensah@skf-wa.com', address: 'Liberation Road, Accra', paymentTerms: 'Net 30', rating: 4.7, onTimeDelivery: 94, activeOrders: 0, totalSpend: 125000 },
  { id: 'sup-6', code: 'SUP-006', name: 'Otis Elevator Ghana', category: 'Lifts & Escalators', contactName: 'David Ofori', phone: '+233 30 266 0050', email: 'd.ofori@otis-gh.com', address: 'Airport City, Accra', paymentTerms: 'Net 45', rating: 4.9, onTimeDelivery: 98, activeOrders: 0, totalSpend: 680000 },
];

export const demoPurchaseRequisitions: PurchaseRequisition[] = [
  {
    id: 'pr-1', number: 'PR-00118', date: '2026-11-05', requester: 'Kwesi Mensah', branchName: 'Tema Industrial Region', department: 'Engineering & Maintenance',
    status: 'Approved', approvalState: 'Approved', approver: 'Kofi Owusu',
    lines: [
      { sku: 'VFD-DAN-001', name: 'Danfoss VFD FC-302 11kW', quantity: 2, uom: 'EA', estUnitCost: 12000, estCost: 24000 },
    ],
    totalEstimate: 24000, convertedPONumber: 'PO-00087',
  },
  {
    id: 'pr-2', number: 'PR-00117', date: '2026-11-04', requester: 'Samuel Osei', branchName: 'Accra Head Office', department: 'Engineering & Maintenance',
    status: 'PendingApproval', approvalState: 'Pending',
    lines: [
      { sku: 'OIL-GEN-15W40', name: 'Engine Oil 15W40 20L', quantity: 8, uom: 'EA', estUnitCost: 650, estCost: 5200 },
      { sku: 'FLT-GEN-004', name: 'Generator Oil Filter Set', quantity: 8, uom: 'EA', estUnitCost: 180, estCost: 1440 },
      { sku: 'FLT-GEN-AIR', name: 'Generator Air Filter', quantity: 4, uom: 'EA', estUnitCost: 240, estCost: 960 },
    ],
    totalEstimate: 7600,
  },
  {
    id: 'pr-3', number: 'PR-00116', date: '2026-11-02', requester: 'Emmanuel Ansah', branchName: 'Tema Port Maintenance Workshop', department: 'Engineering & Maintenance',
    status: 'Converted', approvalState: 'Approved', approver: 'Kofi Owusu',
    lines: [
      { sku: 'KIT-PMP-008', name: 'Pump Mechanical Seal Kit', quantity: 2, uom: 'KIT', estUnitCost: 1200, estCost: 2400 },
    ],
    totalEstimate: 2400, convertedPONumber: 'PO-00086',
  },
  {
    id: 'pr-4', number: 'PR-00115', date: '2026-10-30', requester: 'Akosua Boateng', branchName: 'Accra Head Office', department: 'Facilities Management',
    status: 'Rejected', approvalState: 'Rejected', approver: 'Kofi Owusu',
    lines: [
      { sku: 'PIPE-CPVC-22', name: 'CPVC Pipe 22mm 3m', quantity: 20, uom: 'EA', estUnitCost: 35, estCost: 700 },
    ],
    totalEstimate: 700,
  },
];

export const demoPurchaseOrders: PurchaseOrder[] = [
  {
    id: 'po-1', number: 'PO-00087', date: '2026-11-06', supplier: 'Trane West Africa Ltd', branchName: 'Tema Industrial Region',
    status: 'PartiallyReceived', approvalState: 'Approved', approver: 'Kofi Owusu',
    lines: [
      { sku: 'VFD-DAN-001', name: 'Danfoss VFD FC-302 11kW', ordered: 2, received: 1, uom: 'EA', unitCost: 12000, cost: 24000 },
    ],
    total: 24000, receivedTotal: 12000, expectedDelivery: '2026-11-15',
  },
  {
    id: 'po-2', number: 'PO-00086', date: '2026-11-03', supplier: 'Grundfos Ghana Distributor', branchName: 'Tema Port Maintenance Workshop',
    status: 'Issued', approvalState: 'Approved', approver: 'Kofi Owusu',
    lines: [
      { sku: 'KIT-PMP-008', name: 'Pump Mechanical Seal Kit', ordered: 2, received: 0, uom: 'KIT', unitCost: 1200, cost: 2400 },
    ],
    total: 2400, receivedTotal: 0, expectedDelivery: '2026-11-10',
  },
  {
    id: 'po-3', number: 'PO-00085', date: '2026-10-25', supplier: 'Cummins Ghana Ltd', branchName: 'Accra Head Office',
    status: 'Received', approvalState: 'Approved', approver: 'Kofi Owusu',
    lines: [
      { sku: 'OIL-GEN-15W40', name: 'Engine Oil 15W40 20L', ordered: 4, received: 4, uom: 'EA', unitCost: 650, cost: 2600 },
      { sku: 'FLT-GEN-004', name: 'Generator Oil Filter Set', ordered: 4, received: 4, uom: 'EA', unitCost: 180, cost: 720 },
    ],
    total: 3320, receivedTotal: 3320, expectedDelivery: '2026-11-01',
  },
];

export const demoGoodsReceipts: GoodsReceipt[] = [
  {
    id: 'grn-1', number: 'GRN-00089', date: '2026-11-05', poNumber: 'PO-00087', supplier: 'Trane West Africa Ltd', receivedBy: 'Kofi Adjei',
    lines: [{ sku: 'VFD-DAN-001', name: 'Danfoss VFD FC-302 11kW', ordered: 2, received: 1, accepted: 1, rejected: 0 }],
    matched: false,
  },
  {
    id: 'grn-2', number: 'GRN-00088', date: '2026-11-01', poNumber: 'PO-00085', supplier: 'Cummins Ghana Ltd', receivedBy: 'Kofi Adjei',
    lines: [
      { sku: 'OIL-GEN-15W40', name: 'Engine Oil 15W40 20L', ordered: 4, received: 4, accepted: 4, rejected: 0 },
      { sku: 'FLT-GEN-004', name: 'Generator Oil Filter Set', ordered: 4, received: 4, accepted: 4, rejected: 0 },
    ],
    matched: true,
  },
];

export const demoSupplierInvoices: SupplierInvoice[] = [
  { id: 'si-1', number: 'SINV-TRN-0841', supplier: 'Trane West Africa Ltd', poNumber: 'PO-00087', grnNumber: 'GRN-00089', invoiceDate: '2026-11-07', dueDate: '2026-12-07', amount: 12000, status: 'Pending', threeWayMatch: 'Matched' },
  { id: 'si-2', number: 'SINV-CUM-1124', supplier: 'Cummins Ghana Ltd', poNumber: 'PO-00085', grnNumber: 'GRN-00088', invoiceDate: '2026-11-03', dueDate: '2026-12-03', amount: 3320, status: 'Paid', threeWayMatch: 'Matched' },
  { id: 'si-3', number: 'SINV-GRU-0559', supplier: 'Grundfos Ghana Distributor', poNumber: 'PO-00086', grnNumber: '—', invoiceDate: '2026-11-08', dueDate: '2026-11-22', amount: 2400, status: 'Pending', threeWayMatch: 'Unmatched' },
];
