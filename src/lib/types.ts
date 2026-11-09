// Central types for ZemiFix CMMS Frontend

export type WorkOrderPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type WorkOrderStatus = 'Draft' | 'PendingApproval' | 'Open' | 'Assigned' | 'InProgress' | 'OnHold' | 'Completed' | 'Verified' | 'Closed' | 'Cancelled';
export type AssetStatus = 'Operational' | 'Degraded' | 'Down' | 'UnderMaintenance' | 'Standby' | 'Retired';
export type AssetCriticality = 'Low' | 'Medium' | 'High' | 'Critical';
export type RequestStatus = 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Converted' | 'Cancelled';

export interface WorkOrderSummary {
  id: string;
  number: string;
  title: string;
  assetName: string;
  assetTag: string;
  location: string;
  branchName: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedToName: string;
  dueDate: string;
  estimatedHours: number;
  estimatedCost: number;
  actualCost: number;
  slaBreached: boolean;
}

export interface ActivityItem {
  id: string;
  at: string;
  userName: string;
  userRole: string;
  action: string;
  entityType: string;
  entityNumber: string;
  summary: string;
  statusTag?: string;
}

export interface UpcomingPMItem {
  id: string;
  planName: string;
  assetName: string;
  assetTag: string;
  dueDate: string;
  interval: string;
  assignedTeam: string;
  estimatedHours: number;
  isOverdue: boolean;
}

export interface DashboardMetrics {
  totalAssets: number;
  activeWorkOrders: number;
  pendingRequests: number;
  overduePM: number;
  equipmentDowntimeHours: number;
  monthlyExpenditure: number;
  currency: string;
  openOrdersCount: number;
  inProgressOrdersCount: number;
  onHoldOrdersCount: number;
  completedThisMonth: number;
  slaCompliancePercent: number;
}


// ---------------------------------------------------------------------------
// MODULE 2 — WORK ORDER MANAGEMENT
// ---------------------------------------------------------------------------
export type WorkOrderType = 'Corrective' | 'Preventive' | 'Inspection' | 'Project' | 'Calibration';
export type WorkOrderApprovalState = 'NotRequired' | 'Pending' | 'Approved' | 'Rejected';

export interface WorkOrderTask {
  id: string;
  description: string;
  completed: boolean;
  mandatory: boolean;
}

export interface WorkOrderLaborEntry {
  id: string;
  technicianName: string;
  role: string;
  hours: number;
  rate: number;
  cost: number;
}

export interface WorkOrderPartEntry {
  id: string;
  itemCode: string;
  description: string;
  quantity: number;
  unitCost: number;
  cost: number;
}

export interface WorkOrderHistoryEntry {
  id: string;
  at: string;
  by: string;
  action: string;
  note: string;
}

export interface WorkOrderDetail extends WorkOrderSummary {
  type: WorkOrderType;
  description: string;
  createdBy: string;
  createdAt: string;
  scheduledStart?: string;
  scheduledEnd?: string;
  completedAt?: string;
  verifiedBy?: string;
  verifiedAt?: string;
  assetId?: string;
  locationId?: string;
  failureCode?: string;
  correctiveAction?: string;
  downtimeHours?: number;
  approvalState: WorkOrderApprovalState;
  approver?: string;
  slaTargetHours: number;
  slaElapsedHours: number;
  tasks: WorkOrderTask[];
  labor: WorkOrderLaborEntry[];
  parts: WorkOrderPartEntry[];
  attachments: { id: string; name: string; type: string; size: string }[];
  history: WorkOrderHistoryEntry[];
}

// ---------------------------------------------------------------------------
// MODULE 3 — MAINTENANCE REQUESTS
// ---------------------------------------------------------------------------
export type RequestCategory =
  | 'Breakdown'
  | 'Facility'
  | 'Electrical'
  | 'Plumbing'
  | 'HVAC'
  | 'Safety'
  | 'Janitorial'
  | 'Other';

export interface MaintenanceRequest {
  id: string;
  number: string;
  title: string;
  description: string;
  requesterName: string;
  requesterContact: string;
  requesterDepartment: string;
  branchName: string;
  location: string;
  assetName?: string;
  assetTag?: string;
  category: string;
  priority: WorkOrderPriority;
  status: RequestStatus;
  submittedAt: string;
  reviewedBy?: string;
  reviewedAt?: string;
  reviewNote?: string;
  convertedWorkOrderNumber?: string;
  attachments: { id: string; name: string; type: string }[];
  history: { id: string; at: string; by: string; action: string; note: string }[];
}

// ---------------------------------------------------------------------------
// MODULE 4 — ASSETS & EQUIPMENT
// ---------------------------------------------------------------------------
export type AssetCategory =
  | 'HVAC'
  | 'Electrical'
  | 'Mechanical'
  | 'Plumbing'
  | 'Fire & Safety'
  | 'Transport'
  | 'Medical Equipment'
  | 'IT & Communications'
  | 'Building Fabric'
  | 'Production';

export interface AssetMeterReading {
  id: string;
  date: string;
  meter: string;
  reading: number;
  unit: string;
  recordedBy: string;
}

export interface AssetDowntimeEntry {
  id: string;
  from: string;
  to: string;
  hours: number;
  reason: string;
  workOrderNumber: string;
}

export interface AssetWarranty {
  vendor: string;
  startDate: string;
  endDate: string;
  isExpired: boolean;
  terms: string;
}

export interface AssetDocument {
  id: string;
  name: string;
  type: string;
  category: string;
  uploadedAt: string;
}

export interface AssetDetail {
  id: string;
  tag: string;
  name: string;
  category: AssetCategory;
  status: AssetStatus;
  criticality: AssetCriticality;
  manufacturer: string;
  model: string;
  serialNumber: string;
  branchName: string;
  location: string;
  department: string;
  custodian: string;
  parentId?: string;
  parentName?: string;
  childCount: number;
  commissioningDate: string;
  purchaseDate: string;
  purchaseCost: number;
  currentValue: number;
  warranty: AssetWarranty;
  condition: string;
  lastServiceDate: string;
  nextServiceDate: string;
  totalRuntimeHours: number;
  meterReadings: AssetMeterReading[];
  downtime: AssetDowntimeEntry[];
  documents: AssetDocument[];
  maintenanceHistory: { id: string; number: string; date: string; type: string; cost: number }[];
}

// ---------------------------------------------------------------------------
// MODULE 5 — PREVENTIVE MAINTENANCE
// ---------------------------------------------------------------------------
export type PMTriggerType = 'Time' | 'Meter' | 'Condition' | 'Seasonal';
export type PMPlanStatus = 'Active' | 'Paused' | 'Draft' | 'Archived';

export interface PMChecklistItem {
  id: string;
  description: string;
  passCriteria: string;
  mandatory: boolean;
}

export interface PMPlan {
  id: string;
  code: string;
  name: string;
  assetName: string;
  assetTag: string;
  branchName: string;
  triggerType: PMTriggerType;
  frequency: string;
  status: PMPlanStatus;
  assignedTeam: string;
  estimatedHours: number;
  lastCompleted?: string;
  nextDue: string;
  isOverdue: boolean;
  compliancePercent: number;
  checklist: PMChecklistItem[];
  requiredParts: { code: string; name: string; quantity: number }[];
  requiredLabor: { role: string; hours: number }[];
  history: { id: string; number: string; date: string; completedBy: string; status: string }[];
}

// ---------------------------------------------------------------------------
// MODULE 6 — INVENTORY & STOCK
// ---------------------------------------------------------------------------
export type StockMovementType = 'Receipt' | 'Issue' | 'Transfer' | 'Adjustment' | 'Reservation' | 'Return';

export interface Warehouse {
  id: string;
  code: string;
  name: string;
  branchName: string;
  location: string;
  binCount: number;
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: string;
  uom: string;
  warehouse: string;
  bin: string;
  onHand: number;
  available: number;
  reserved: number;
  minimum: number;
  maximum: number;
  reorderPoint: number;
  unitCost: number;
  averageCost: number;
  totalValue: number;
  supplier: string;
  stockStatus: 'In Stock' | 'Low Stock' | 'Out of Stock' | 'Overstock';
}

export interface StockMovement {
  id: string;
  number: string;
  date: string;
  type: StockMovementType;
  itemSku: string;
  itemName: string;
  warehouse: string;
  quantity: number;
  unitCost: number;
  value: number;
  reference: string;
  by: string;
}

// ---------------------------------------------------------------------------
// MODULE 7 — PROCUREMENT
// ---------------------------------------------------------------------------
export type PRStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Rejected' | 'Converted';
export type POStatus = 'Draft' | 'PendingApproval' | 'Approved' | 'Issued' | 'PartiallyReceived' | 'Received' | 'Closed' | 'Cancelled';

export interface Supplier {
  id: string;
  code: string;
  name: string;
  category: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  paymentTerms: string;
  rating: number;
  onTimeDelivery: number;
  activeOrders: number;
  totalSpend: number;
}

export interface PurchaseRequisition {
  id: string;
  number: string;
  date: string;
  requester: string;
  branchName: string;
  department: string;
  status: PRStatus;
  approvalState: 'NotRequired' | 'Pending' | 'Approved' | 'Rejected';
  approver?: string;
  lines: { sku: string; name: string; quantity: number; uom: string; estUnitCost: number; estCost: number }[];
  totalEstimate: number;
  convertedPONumber?: string;
}

export interface PurchaseOrder {
  id: string;
  number: string;
  date: string;
  supplier: string;
  branchName: string;
  status: POStatus;
  approvalState: 'NotRequired' | 'Pending' | 'Approved' | 'Rejected';
  approver?: string;
  lines: { sku: string; name: string; ordered: number; received: number; uom: string; unitCost: number; cost: number }[];
  total: number;
  receivedTotal: number;
  expectedDelivery: string;
}

export interface GoodsReceipt {
  id: string;
  number: string;
  date: string;
  poNumber: string;
  supplier: string;
  receivedBy: string;
  lines: { sku: string; name: string; ordered: number; received: number; accepted: number; rejected: number }[];
  matched: boolean;
}

export interface SupplierInvoice {
  id: string;
  number: string;
  supplier: string;
  poNumber: string;
  grnNumber: string;
  invoiceDate: string;
  dueDate: string;
  amount: number;
  status: 'Pending' | 'Matched' | 'Varianced' | 'Paid';
  threeWayMatch: 'Matched' | 'Price Variance' | 'Quantity Variance' | 'Unmatched';
}

// ---------------------------------------------------------------------------
// MODULE 8 — FINANCE & BILLING
// ---------------------------------------------------------------------------
export type InvoiceStatus = 'Draft' | 'Issued' | 'PartiallyPaid' | 'Paid' | 'Overdue' | 'Cancelled';

export interface Customer {
  id: string;
  code: string;
  name: string;
  contactName: string;
  phone: string;
  email: string;
  contractRef: string;
  outstandingBalance: number;
  activeWorkOrders: number;
}

export interface Invoice {
  id: string;
  number: string;
  customer: string;
  workOrderNumber: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  tax: number;
  total: number;
  paid: number;
  status: InvoiceStatus;
}

export interface Budget {
  id: string;
  branchName: string;
  department: string;
  period: string;
  category: string;
  budgeted: number;
  spent: number;
  utilization: number;
}

export interface ExpenseRecord {
  id: string;
  number: string;
  date: string;
  category: string;
  description: string;
  workOrderNumber?: string;
  amount: number;
  branchName: string;
  status: 'Pending' | 'Approved' | 'Rejected';
}

export interface Payment {
  id: string;
  number: string;
  invoiceNumber: string;
  customer: string;
  date: string;
  method: 'Cash' | 'Bank Transfer' | 'Mobile Money' | 'Cheque';
  amount: number;
  status: 'Pending' | 'Cleared' | 'Bounced';
}

export interface TaxBreakdownLine {
  label: string;
  rate: number;
  base: number;
  amount: number;
}

// ---------------------------------------------------------------------------
// MODULE 9 — REPORTS & ANALYTICS
// ---------------------------------------------------------------------------
export interface ReportCategory {
  id: string;
  name: string;
  description: string;
  reports: ReportDefinition[];
}

export interface ReportDefinition {
  id: string;
  name: string;
  description: string;
  category: string;
  metric: string;
  chart: 'bar' | 'line' | 'donut' | 'table' | 'gauge';
}

// ---------------------------------------------------------------------------
// MODULE 11 — USERS & ACCESS (extensions for enrichment)
// ---------------------------------------------------------------------------
export type AccessScope = 'Own' | 'Department' | 'Branch' | 'BranchAndBelow' | 'Company';

export interface RoleDefinition {
  id: string;
  name: string;
  description: string;
  userCount: number;
  permissions: { module: string; level: 'View' | 'Create' | 'Edit' | 'Approve' | 'Full' }[];
}

export interface AuditLogEntry {
  id: string;
  at: string;
  userName: string;
  action: string;
  entityType: string;
  entityId: string;
  ip: string;
  status: 'Success' | 'Denied' | 'Failed';
}

export interface UserSessionInfo {
  id: string;
  userName: string;
  device: string;
  ip: string;
  lastActive: string;
  otpVerified: boolean;
  active: boolean;
}
