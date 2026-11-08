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
