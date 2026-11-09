// Central types for ZemiFix CMMS Frontend

export type WorkOrderPriority = 'Low' | 'Medium' | 'High' | 'Urgent';
export type WorkOrderStatus = 'Draft' | 'PendingApproval' | 'Open' | 'Assigned' | 'InProgress' | 'OnHold' | 'Completed' | 'Verified' | 'Closed' | 'Cancelled';
export type AssetStatus = 'Operational' | 'Degraded' | 'Down' | 'UnderMaintenance' | 'Standby' | 'Retired';
export type AssetCriticality = 'Low' | 'Medium' | 'High' | 'Critical';
export type RequestStatus = 'Submitted' | 'UnderReview' | 'Approved' | 'Rejected' | 'Converted' | 'Cancelled';
export type RequestUrgency = 'Normal' | 'Urgent' | 'Emergency';

export interface TaskChecklistItem {
  id: string;
  title: string;
  completed: boolean;
  completedBy?: string;
  completedAt?: string;
}

export interface WorkOrderSummary {
  id: string;
  number: string;
  title: string;
  description?: string;
  assetName: string;
  assetTag: string;
  category?: string;
  location: string;
  branchName: string;
  priority: WorkOrderPriority;
  status: WorkOrderStatus;
  assignedToName: string;
  dueDate: string;
  estimatedHours: number;
  actualHours?: number;
  estimatedCost: number;
  actualCost: number;
  slaBreached: boolean;
  slaDueHours?: number;
  checklists?: TaskChecklistItem[];
  partsUsed?: { sku: string; name: string; qty: number; unitCost: number }[];
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

export interface MaintenanceRequestItem {
  id: string;
  number: string;
  title: string;
  description: string;
  requesterName: string;
  requesterPhone: string;
  department: string;
  location: string;
  branchName: string;
  urgency: RequestUrgency;
  status: RequestStatus;
  submittedAt: string;
  convertedWorkOrderId?: string;
  photoUrl?: string;
}

export interface AssetRecord {
  id: string;
  tag: string;
  name: string;
  category: 'HVAC' | 'Electrical' | 'Mechanical' | 'Plumbing' | 'Fleet & Heavy' | 'Fire & Safety' | 'IT & Telecom';
  criticality: AssetCriticality;
  status: AssetStatus;
  branchName: string;
  location: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  installationDate: string;
  warrantyExpiry: string;
  purchaseCost: number;
  runtimeHours: number;
  lastServiceDate: string;
  nextServiceDue: string;
}

export interface PreventivePlan {
  id: string;
  code: string;
  title: string;
  assetTag: string;
  assetName: string;
  category: string;
  frequency: 'Weekly' | 'Bi-Weekly' | 'Monthly' | 'Quarterly' | 'Semi-Annual' | 'Annual' | 'Meter-Based';
  triggerCriteria: string;
  assignedTeam: string;
  estimatedHours: number;
  lastDone: string;
  nextDue: string;
  isOverdue: boolean;
  status: 'Active' | 'Paused' | 'Draft';
  taskCount: number;
  checklistItems: string[];
}

export interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  category: 'Electrical' | 'Mechanical' | 'Lubricants & Fluids' | 'HVAC & Refrigeration' | 'Safety & PPE' | 'Filters & Seals';
  warehouse: string;
  binLocation: string;
  unit: string;
  quantityOnHand: number;
  minLevel: number;
  maxLevel: number;
  unitCost: number;
  supplier: string;
  lastRestocked: string;
}

export interface PurchaseOrderItem {
  id: string;
  number: string;
  vendorName: string;
  vendorEmail: string;
  requestedBy: string;
  branchName: string;
  dateCreated: string;
  deliveryDueDate: string;
  totalAmount: number;
  currency: string;
  requiresDualApproval: boolean;
  status: 'Draft' | 'PendingApproval' | 'Approved' | 'Ordered' | 'Received' | 'Cancelled';
  workOrderRef?: string;
  lines: { description: string; qty: number; unitPrice: number; total: number }[];
  approvedBy?: string;
}

export interface InvoiceRecord {
  id: string;
  number: string;
  clientName: string;
  clientTin: string;
  workOrderRef: string;
  branchName: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  vatAmount: number;     // 15% Standard VAT
  nhilAmount: number;    // 2.5% NHIL
  getFundAmount: number; // 2.5% GETFund
  covidAmount: number;   // 1.0% COVID Levy
  totalTax: number;
  grandTotal: number;
  currency: string;
  status: 'Draft' | 'Issued' | 'Paid' | 'Overdue';
  paymentTerms: string;
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

