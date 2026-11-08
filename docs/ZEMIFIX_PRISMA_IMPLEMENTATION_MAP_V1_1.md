# ZemiFix CMMS — Prisma Implementation & Dependency Reconciliation Report v1.1
**Document Version:** 1.1.0-RECONCILED-FINAL-BASELINE  
**Status:** Implementation Blueprint for Formal Review  
**Target Engine:** PostgreSQL 16+ (Strict ACID, RLS, Append-Only Ledgers, Maker-Checker Dual Control)  
**ORM / Data Layer:** Prisma 6.19.3 (PostgreSQL Native Driver)  
**Authoritative References:**  
1. ZemiFix Architecture Specification v1  
2. Approved Stakeholder Decisions  
3. `ZEMIFIX_DATABASE_DESIGN_V2_2.md`

---

## 1. EXECUTIVE OVERVIEW & TARGETED CORRECTIONS SUMMARY

This report establishes the verified, dependency-safe implementation blueprint for transitioning ZemiFix CMMS from its prototype state (7 foundation models) to the complete **142-entity production database across 14 functional domains**.

### Summary of Architectural Refinements in v1.1:
1. **Early RLS Infrastructure Sequencing:** Foundational Row-Level Security (RLS) is moved directly into **Stage 2** alongside Governance and Audit. RLS is never postponed to the end; every table created in subsequent stages receives its RLS policies within the exact migration script that creates it.
2. **Customer & Portal Dependency Resolution:** Resolved the Stage 1 dependency deadlock where `CustomerContact` required `Customer` and `CustomerSite`. A minimal Customer Identity foundation (`Customer` and `CustomerSite`) is introduced early in Stage 1, while the full commercial module (contracts, rate cards, quotes, recurring billing) remains in Stage 7.
3. **Paired Append-Only Physical Stock Movement Ledger:** Corrected terminology and behavioral rules. Physical movements are managed via correlated pairs in `stock_transactions`. Discrepancies are held under formal investigation in `store_transfer_discrepancies` and **never automatically written off** without authorized resolution.
4. **Application-Level UUIDv7 Standardization:** Standardized on vetted application-level UUIDv7 generation in TypeScript for all model primary keys, eliminating PostgreSQL 16 engine extension incompatibilities while guaranteeing monotonically increasing time-ordered keys.
5. **Clear Strategy for Generated Columns:** Established explicit separation between database-stored generated columns (`GENERATED ALWAYS AS (...) STORED` in migration SQL) and application-level business calculations to prevent calculation drift.

---

## 2. COMPLETE 142-ENTITY RECONCILIATION & DEPENDENCY MATRIX

Every one of the 142 approved entities appears **exactly once** in the master implementation matrix below:

| # | Database Table | Proposed Prisma Model | Required Dependencies (Foreign Keys) | Topological Level | Migration Stage | RLS Enforced? | PostgreSQL-Specific SQL Requirement | Status |
|---|---|---|---|:---:|:---:|:---:|---|:---:|
| 1 | `companies` | `Company` | None (Singleton) | Level 0 | Stage 1 | Yes | Unique singleton check constraint | Existing |
| 2 | `branches` | `Branch` | `branches` (self-ref) | Level 1 | Stage 1 | Yes | Materialized path index (`path text_pattern_ops`) | Existing |
| 3 | `departments` | `Department` | `departments` (self-ref) | Level 1 | Stage 1 | Yes | Materialized path index | Existing |
| 4 | `roles` | `Role` | None | Level 0 | Stage 1 | No | System role deletion protection trigger | Existing |
| 5 | `permissions` | `Permission` | None | Level 0 | Stage 1 | No | Composite unique constraint (`resource`, `action`) | Existing |
| 6 | `role_permissions` | `RolePermission` | `roles`, `permissions` | Level 1 | Stage 1 | No | Compound primary key (`role_id`, `permission_id`) | Existing |
| 7 | `users` | `User` | `roles`, `branches`, `departments` | Level 2 | Stage 1 | Yes | RLS branch & department scope policy | Existing |
| 8 | `user_scope_grants` | `UserScopeGrant` | `users`, `branches`, `departments` | Level 3 | Stage 1 | Yes | Scope override policy | New |
| 9 | `customers` *(Minimal)* | `Customer` | None (Root Account) | Level 0 | Stage 1 | Yes | Customer isolation RLS policy | New (Early) |
| 10 | `customer_sites` *(Min)* | `CustomerSite` | `customers` | Level 1 | Stage 1 | Yes | Site isolation RLS policy | New (Early) |
| 11 | `customer_contacts` | `CustomerContact` | `customers` | Level 1 | Stage 1 | Yes | Portal contact isolation policy | New |
| 12 | `customer_contact_site_grants` | `CustomerContactSiteGrant` | `customer_contacts`, `customer_sites` | Level 2 | Stage 1 | Yes | Compound unique constraint | New |
| 13 | `portal_sessions` | `PortalSession` | `customer_contacts` | Level 2 | Stage 1 | Yes | Session token index & expiry check | New |
| 14 | `auth_otps` | `AuthOtp` | `users`, `customer_contacts` | Level 3 | Stage 1 | Yes | Exclusive-OR check constraint (`user XOR contact`) | New |
| 15 | `api_keys` | `ApiKey` | `branches`, `roles` | Level 2 | Stage 1 | Yes | Hash prefix index & IP subnet check | New |
| 16 | `business_calendars` | `BusinessCalendar` | None | Level 0 | Stage 2 | No | Master timezone verification | New |
| 17 | `calendar_working_hours` | `CalendarWorkingHours` | `business_calendars` | Level 1 | Stage 2 | No | Time span check (`end_time > start_time`) | New |
| 18 | `calendar_holidays` | `CalendarHoliday` | `business_calendars` | Level 1 | Stage 2 | No | Unique date constraint per calendar | New |
| 19 | `technician_shifts` | `TechnicianShift` | `users`, `branches` | Level 3 | Stage 2 | Yes | Shift overlap check trigger | New |
| 20 | `technician_leave` | `TechnicianLeave` | `users` | Level 3 | Stage 2 | Yes | Date range check (`end_date >= start_date`) | New |
| 21 | `technician_availability_exceptions` | `TechnicianAvailabilityException` | `users` | Level 3 | Stage 2 | Yes | Ad-hoc availability time index | New |
| 22 | `user_delegations` | `UserDelegation` | `users` (delegator & delegatee) | Level 3 | Stage 2 | Yes | Check constraint (`delegator <> delegatee`) | New |
| 23 | `approval_rules` | `ApprovalRule` | `branches`, `roles` | Level 2 | Stage 2 | Yes | Threshold policy check constraints | New |
| 24 | `approval_requests` | `ApprovalRequest` | `users` (maker & last editor) | Level 3 | Stage 2 | Yes | Payload SHA-256 hash invalidation trigger | New |
| 25 | `approval_steps` | `ApprovalStep` | `approval_requests`, `roles` | Level 4 | Stage 2 | Yes | Sequential step tier constraint | New |
| 26 | `approval_actions` | `ApprovalAction` | `approval_steps`, `users` (checker) | Level 5 | Stage 2 | Yes | Append-only trigger (`UPDATE/DELETE` revoked) | New |
| 27 | `emergency_provisional_authorizations` | `EmergencyProvisionalAuthorization` | `users` (authorizer & ratifier) | Level 3 | Stage 2 | Yes | Break-glass ratification audit check | New |
| 28 | `audit_logs` | `AuditLog` | `users`, `customer_contacts` | Level 3 | Stage 2 | Yes | Append-only trigger + SHA256 chained hash | New |
| 29 | `activity_logs` | `ActivityLog` | `branches`, `users` | Level 3 | Stage 2 | Yes | Branch user feed index | New |
| 30 | `documents` | `Document` | `users` | Level 3 | Stage 2 | Yes | Document metadata category check | New |
| 31 | `document_versions` | `DocumentVersion` | `documents` | Level 4 | Stage 2 | Yes | SHA256 integrity hash & unique version no | New |
| 32 | `notification_templates` | `NotificationTemplate` | None | Level 0 | Stage 2 | No | Unique template code constraint | New |
| 33 | `notification_preferences` | `NotificationPreference` | `users`, `customer_contacts` | Level 3 | Stage 2 | Yes | Compound unique constraint | New |
| 34 | `notifications` | `Notification` | `users`, `customer_contacts` | Level 3 | Stage 2 | Yes | In-app notification unread index | New |
| 35 | `notification_delivery_attempts` | `NotificationDeliveryAttempt` | `notifications` | Level 4 | Stage 2 | Yes | Telco gateway delivery receipt log | New |
| 36 | `skills` | `Skill` | None | Level 0 | Stage 3 | No | Unique competency name constraint | New |
| 37 | `technician_skills` | `TechnicianSkill` | `users`, `skills` | Level 3 | Stage 3 | Yes | Compound PK (`technician_user_id`, `skill_id`) | New |
| 38 | `certifications` | `Certification` | None | Level 0 | Stage 3 | No | Statutory validity period check | New |
| 39 | `technician_certifications` | `TechnicianCertification` | `users`, `certifications`, `documents` | Level 4 | Stage 3 | Yes | Expiry alert date index | New |
| 40 | `asset_categories` | `AssetCategory` | `asset_categories` (self-ref) | Level 1 | Stage 3 | No | Recursive category path index | New |
| 41 | `locations` | `Location` | `locations` (self-ref), `branches` | Level 2 | Stage 3 | Yes | Physical location materialized path | New |
| 42 | `assets` | `Asset` | `asset_categories`, `locations`, `branches`, `customers`, `customer_sites`, `assets` (parent) | Level 3 | Stage 3 | Yes | Customer asset isolation check constraint | New |
| 43 | `asset_locations_history` | `AssetLocationHistory` | `assets`, `locations`, `users` | Level 4 | Stage 3 | Yes | Append-only relocation audit log | New |
| 44 | `asset_ownership_history` | `AssetOwnershipHistory` | `assets`, `customers`, `users` | Level 4 | Stage 3 | Yes | Append-only ownership transfer audit | New |
| 45 | `asset_status_history` | `AssetStatusHistory` | `assets`, `users` | Level 4 | Stage 3 | Yes | State transition log trigger | New |
| 46 | `asset_meters` | `AssetMeter` | `assets` | Level 4 | Stage 3 | Yes | Unique meter name per asset constraint | New |
| 47 | `meter_readings` | `MeterReading` | `asset_meters`, `users` | Level 5 | Stage 3 | Yes | Monotonic non-decreasing delta check (`delta >= 0`) | New |
| 48 | `asset_downtime_logs` | `AssetDowntimeLog` | `assets`, `users` | Level 4 | Stage 3 | Yes | Downtime duration computation | New |
| 49 | `asset_boms` | `AssetBom` | `assets` | Level 4 | Stage 3 | Yes | Compound unique constraint (`asset_id`, `part_id`) | New |
| 50 | `asset_warranty_claims` | `AssetWarrantyClaim` | `assets` | Level 4 | Stage 3 | Yes | Warranty claim status check constraint | New |
| 51 | `asset_disposals` | `AssetDisposal` | `assets`, `users` | Level 4 | Stage 3 | Yes | Unique asset disposal constraint | New |
| 52 | `failure_codes` | `FailureCode` | None | Level 0 | Stage 4 | No | Standard RCM category check constraint | New |
| 53 | `work_order_failure_records` | `WorkOrderFailureRecord` | `failure_codes` | Level 1 | Stage 4 | Yes | Root cause analysis foreign keys | New |
| 54 | `checklist_templates` | `ChecklistTemplate` | None | Level 0 | Stage 4 | No | SOP template version constraint | New |
| 55 | `checklist_template_items` | `ChecklistTemplateItem` | `checklist_templates` | Level 1 | Stage 4 | No | Sequence ordering unique constraint | New |
| 56 | `inspection_templates` | `InspectionTemplate` | None | Level 0 | Stage 4 | No | Regulatory inspection framework index | New |
| 57 | `inspections` | `Inspection` | `inspection_templates`, `assets`, `locations` | Level 4 | Stage 4 | Yes | Formal inspection status check | New |
| 58 | `inspection_items` | `InspectionItem` | `inspections` | Level 5 | Stage 4 | Yes | Pass/fail compliance check constraint | New |
| 59 | `statutory_certificates` | `StatutoryCertificate` | `assets`, `locations`, `documents` | Level 4 | Stage 4 | Yes | Expiry date check (`expires_at >= issued_at`) | New |
| 60 | `permits_to_work` | `PermitToWork` | `users` (issuer & receiver) | Level 3 | Stage 4 | Yes | Issuer <> Receiver check constraint | New |
| 61 | `loto_procedures` | `LotoProcedure` | `assets` | Level 4 | Stage 4 | Yes | Unique procedure per asset constraint | New |
| 62 | `loto_isolation_points` | `LotoIsolationPoint` | `loto_procedures` | Level 5 | Stage 4 | Yes | Sequence ordering constraint | New |
| 63 | `loto_lock_applications` | `LotoLockApplication` | `permits_to_work`, `loto_isolation_points`, `users` | Level 6 | Stage 4 | Yes | Lock application & removal audit check | New |
| 64 | `work_requests` | `WorkRequest` | `assets`, `locations`, `customers`, `customer_sites`, `users`, `customer_contacts` | Level 4 | Stage 4 | Yes | Request status lifecycle check | New |
| 65 | `work_orders` | `WorkOrder` | `branches`, `departments`, `assets`, `locations`, `customers`, `customer_sites`, `users` | Level 4 | Stage 4 | Yes | 10-state lifecycle check constraint & RLS | New |
| 66 | `work_order_status_history` | `WorkOrderStatusHistory` | `work_orders`, `users` | Level 5 | Stage 4 | Yes | Append-only status transition log | New |
| 67 | `work_order_dispatches` | `WorkOrderDispatch` | `work_orders`, `users` | Level 5 | Stage 4 | Yes | Mobilization and arrival timestamp index | New |
| 68 | `work_order_assignment_history` | `WorkOrderAssignmentHistory` | `work_orders`, `users` | Level 5 | Stage 4 | Yes | Technician participation log index | New |
| 69 | `work_order_tasks` | `WorkOrderTask` | `work_orders`, `users` | Level 5 | Stage 4 | Yes | Step sequence unique constraint | New |
| 70 | `work_order_checklist_items` | `WorkOrderChecklistItem` | `work_orders`, `checklist_template_items`, `documents`, `users` | Level 5 | Stage 4 | Yes | Checkpoint response type validation | New |
| 71 | `work_order_verifications` | `WorkOrderVerification` | `work_orders`, `users`, `documents` | Level 5 | Stage 4 | Yes | Client sign-off unique constraint | New |
| 72 | `work_order_reopen_history` | `WorkOrderReopenHistory` | `work_orders`, `users` | Level 5 | Stage 4 | Yes | Justification audit logging | New |
| 73 | `work_order_cost_approvals` | `WorkOrderCostApproval` | `work_orders`, `approval_requests` | Level 5 | Stage 4 | Yes | Budget overrun approval link | New |
| 74 | `work_order_comments` | `WorkOrderComment` | `work_orders`, `users`, `customer_contacts` | Level 5 | Stage 4 | Yes | Internal vs public comment visibility filter | New |
| 75 | `stores` | `Store` | `branches`, `users` | Level 2 | Stage 5 | Yes | Store code unique constraint | New |
| 76 | `parts` | `Part` | None (Master Catalog) | Level 0 | Stage 5 | No | Part number unique & UOM check | New |
| 77 | `stock` | `Stock` | `stores`, `parts` | Level 2 | Stage 5 | Yes | `CHECK (quantity_on_hand >= 0)` constraint | New |
| 78 | `stock_transactions` | `StockTransaction` | `stores`, `parts`, `users`, `stock_transactions` (self-ref) | Level 3 | Stage 5 | Yes | Append-only trigger (`UPDATE/DELETE` revoked) | New |
| 79 | `store_transfers` | `StoreTransfer` | `stores` (from & to), `users` | Level 3 | Stage 5 | Yes | Check constraint (`from_store <> to_store`) | New |
| 80 | `store_transfer_lines` | `StoreTransferLine` | `store_transfers`, `parts` | Level 4 | Stage 5 | Yes | Compound unique constraint (`transfer_id`, `part_id`) | New |
| 81 | `store_transfer_discrepancies` | `StoreTransferDiscrepancy` | `store_transfer_lines`, `users` | Level 5 | Stage 5 | Yes | Discrepancy investigation status check | New |
| 82 | `stock_counts` | `StockCount` | `stores`, `users` | Level 3 | Stage 5 | Yes | Cycle count audit status check | New |
| 83 | `stock_count_lines` | `StockCountLine` | `stock_counts`, `parts` | Level 4 | Stage 5 | Yes | Physical variance calculation | New |
| 84 | `work_order_labor` | `WorkOrderLabor` | `work_orders`, `users` | Level 5 | Stage 5 | Yes | Stored generated column (`total_cost`) | New |
| 85 | `work_order_parts` | `WorkOrderPart` | `work_orders`, `parts`, `stores`, `stock_transactions` | Level 5 | Stage 5 | Yes | Stored generated column (`total_billable`) | New |
| 86 | `work_order_expenses` | `WorkOrderExpense` | `work_orders`, `documents` | Level 5 | Stage 5 | Yes | Markup percentage calculation check | New |
| 87 | `work_order_subcontractors` | `WorkOrderSubcontractor` | `work_orders` | Level 5 | Stage 5 | Yes | Third-party billing cost check | New |
| 88 | `work_order_sla_events` | `WorkOrderSlaEvent` | `work_orders` | Level 5 | Stage 5 | Yes | Target milestone date index | New |
| 89 | `work_order_sla_pauses` | `WorkOrderSlaPause` | `work_orders`, `users` | Level 5 | Stage 5 | Yes | Pause check (`resumed_at >= paused_at`) | New |
| 90 | `pm_plans` | `PmPlan` | `assets`, `asset_categories`, `checklist_templates` | Level 4 | Stage 6 | Yes | Trigger type check (`TIME`, `METER`, `HYBRID`) | New |
| 91 | `pm_occurrences` | `PmOccurrence` | `pm_plans`, `work_orders` | Level 5 | Stage 6 | Yes | Unique constraint (`pm_plan_id`, `due_date`) | New |
| 92 | `pm_compliance_records` | `PmComplianceRecord` | `branches` | Level 2 | Stage 6 | Yes | Stored generated column (`compliance_percentage`) | New |
| 93 | `missed_pm_incidents` | `MissedPmIncident` | `pm_occurrences`, `assets`, `users` | Level 6 | Stage 6 | Yes | Statutory non-conformance log | New |
| 94 | `maintenance_backlog_snapshots` | `MaintenanceBacklogSnapshot` | `branches` | Level 2 | Stage 6 | Yes | Compound unique constraint (`branch_id`, `snapshot_date`) | New |
| 95 | `vendors` | `Vendor` | None (Supplier Master) | Level 0 | Stage 6 | No | Tax ID TIN format check | New |
| 96 | `purchase_requisitions` | `PurchaseRequisition` | `branches`, `departments`, `users`, `approval_requests` | Level 3 | Stage 6 | Yes | Requisition approval workflow link | New |
| 97 | `purchase_requisition_lines` | `PurchaseRequisitionLine` | `purchase_requisitions`, `parts` | Level 4 | Stage 6 | Yes | Estimated subtotal calculation | New |
| 98 | `purchase_orders` | `PurchaseOrder` | `vendors`, `branches`, `users`, `approval_requests` | Level 3 | Stage 6 | Yes | Legally binding contract status check | New |
| 99 | `purchase_order_lines` | `PurchaseOrderLine` | `purchase_orders`, `parts` | Level 4 | Stage 6 | Yes | Ordered vs received quantity check | New |
| 100| `purchase_order_amendments` | `PurchaseOrderAmendment` | `purchase_orders`, `users`, `approval_requests` | Level 4 | Stage 6 | Yes | Sequential amendment number constraint | New |
| 101| `goods_receipts` | `GoodsReceipt` | `purchase_orders`, `stores`, `users` | Level 4 | Stage 6 | Yes | Warehouse delivery note index | New |
| 102| `goods_receipt_lines` | `GoodsReceiptLine` | `goods_receipts`, `purchase_order_lines`, `stock_transactions` | Level 5 | Stage 6 | Yes | Check (`received = accepted + rejected`) | New |
| 103| `goods_receipt_discrepancies` | `GoodsReceiptDiscrepancy` | `goods_receipt_lines` | Level 6 | Stage 6 | Yes | Discrepancy type check constraint | New |
| 104| `supplier_invoices` | `SupplierInvoice` | `vendors`, `purchase_orders` | Level 4 | Stage 6 | Yes | Unique constraint (`vendor_id`, `invoice_number`) | New |
| 105| `supplier_invoice_lines` | `SupplierInvoiceLine` | `supplier_invoices`, `purchase_order_lines` | Level 5 | Stage 6 | Yes | Line total calculation check | New |
| 106| `three_way_matches` | `ThreeWayMatch` | `supplier_invoices`, `purchase_orders`, `users` | Level 5 | Stage 6 | Yes | Automated 3-way matching tolerance audit | New |
| 107| `customer_contracts` | `CustomerContract` | `customers` | Level 1 | Stage 7 | Yes | Contract date range check | New |
| 108| `contract_rate_cards` | `ContractRateCard` | None | Level 0 | Stage 7 | No | Price book currency check | New |
| 109| `rate_card_lines` | `RateCardLine` | `contract_rate_cards`, `skills` | Level 1 | Stage 7 | No | Compound unique constraint (`rate_card_id`, `skill_id`) | New |
| 110| `contract_billing_milestones` | `ContractBillingMilestone` | `customer_contracts` | Level 2 | Stage 7 | Yes | Milestone due date index | New |
| 111| `recurring_billing_schedules` | `RecurringBillingSchedule` | `customer_contracts` | Level 2 | Stage 7 | Yes | Day of month check (`between 1 and 28`) | New |
| 112| `quotes` | `Quote` | `customers`, `customer_sites`, `work_orders`, `users` | Level 5 | Stage 7 | Yes | Commercial quote status lifecycle | New |
| 113| `quote_lines` | `QuoteLine` | `quotes` | Level 6 | Stage 7 | Yes | Bill of quantities line calculation | New |
| 114| `unbilled_work_items` | `UnbilledWorkItem` | `customers`, `work_orders` | Level 5 | Stage 7 | Yes | Work-in-progress (WIP) accrual index | New |
| 115| `contract_profitability_snapshots`| `ContractProfitabilitySnapshot` | `customer_contracts` | Level 2 | Stage 7 | Yes | Gross margin calculation | New |
| 116| `tax_regimes` | `TaxRegime` | None (Jurisdictional Master) | Level 0 | Stage 7 | No | Regional tax regime unique code | New |
| 117| `tax_components` | `TaxComponent` | `tax_regimes` | Level 1 | Stage 7 | No | Effective-date range check | New |
| 118| `invoices` | `Invoice` | `customers`, `branches`, `customer_contracts`, `quotes`, `tax_regimes`, `users`, `approval_requests` | Level 5 | Stage 7 | Yes | Controlled invoice lifecycle check & RLS | New |
| 119| `invoice_lines` | `InvoiceLine` | `invoices`, `work_orders` | Level 6 | Stage 7 | Yes | Sequence line number unique constraint | New |
| 120| `invoice_tax_lines` | `InvoiceTaxLine` | `invoices`, `tax_components` | Level 6 | Stage 7 | Yes | Immutable historical tax snapshot check | New |
| 121| `credit_notes` | `CreditNote` | `invoices`, `customers`, `users`, `approval_requests` | Level 6 | Stage 7 | Yes | Statutory rectification status check | New |
| 122| `credit_note_lines` | `CreditNoteLine` | `credit_notes`, `invoice_lines` | Level 7 | Stage 7 | Yes | Credit subtotal calculation | New |
| 123| `payments` | `Payment` | `customers`, `users` | Level 1 | Stage 7 | Yes | Inbound remittance method check | New |
| 124| `payment_allocations` | `PaymentAllocation` | `payments`, `invoices`, `users` | Level 6 | Stage 7 | Yes | Append-only allocation trigger | New |
| 125| `payment_reversals` | `PaymentReversal` | `payments`, `users` | Level 2 | Stage 7 | Yes | Bounced payment reversal audit | New |
| 126| `refunds` | `Refund` | `customers`, `payments`, `users` | Level 2 | Stage 7 | Yes | Outbound customer reimbursement check | New |
| 127| `customer_statement_runs` | `CustomerStatementRun` | `customers`, `documents` | Level 4 | Stage 7 | Yes | Debtor statement closing balance check | New |
| 128| `aged_receivables_snapshots` | `AgedReceivablesSnapshot` | `customers` | Level 1 | Stage 7 | Yes | Aging bucket computation | New |
| 129| `number_sequences` | `NumberSequence` | `branches` | Level 2 | Stage 7 | Yes | Atomic sequential counter check | New |
| 130| `voided_number_audit` | `VoidedNumberAudit` | `users` | Level 3 | Stage 7 | Yes | Statutory gap cancellation audit | New |
| 131| `notification_escalation_rules` | `NotificationEscalationRule` | `roles` | Level 1 | Stage 7 | No | Unacknowledged minutes check (`> 0`) | New |
| 132| `report_definitions` | `ReportDefinition` | None | Level 0 | Stage 7 | No | Parameter JSONB schema check | New |
| 133| `scheduled_reports` | `ScheduledReport` | `report_definitions` | Level 1 | Stage 7 | No | Cron expression format check | New |
| 134| `kpi_snapshots` | `KpiSnapshot` | `branches` | Level 2 | Stage 7 | Yes | Compound unique constraint (`branch_id`, `metric_date`) | New |
| 135| `webhook_subscriptions` | `WebhookSubscription` | None | Level 0 | Stage 7 | No | Target URL protocol check | New |
| 136| `webhook_deliveries` | `WebhookDelivery` | `webhook_subscriptions` | Level 1 | Stage 7 | No | HTTP dispatch attempt retry check | New |
| 137| `offline_sync_batches` | `OfflineSyncBatch` | `users` | Level 3 | Stage 7 | Yes | Mobile sync transaction envelope | New |
| 138| `offline_sync_mutations` | `OfflineSyncMutation` | `offline_sync_batches` | Level 4 | Stage 7 | Yes | Idempotency key unique constraint | New |
| 139| `offline_sync_conflicts` | `OfflineSyncConflict` | `offline_sync_mutations`, `users` | Level 5 | Stage 7 | Yes | Concurrency conflict resolution status | New |
| 140| `privacy_consents` | `PrivacyConsent` | None | Level 0 | Stage 7 | Yes | Act 843 consent timestamp index | New |
| 141| `data_subject_requests` | `DataSubjectRequest` | `users` | Level 3 | Stage 7 | Yes | Formal DSR due date check | New |
| 142| `data_retention_policies` | `DataRetentionPolicy` | None | Level 0 | Stage 7 | No | Purge period check (`retention_period_days >= 365`) | New |

---

## 3. SEVEN-STAGE MIGRATION DEPENDENCY SEQUENCE

```
====================================================================================================
STAGE 1: FOUNDATION ALIGNMENT, IDENTITY REALMS & MINIMAL CUSTOMER ACCOUNT (15 Entities)
----------------------------------------------------------------------------------------------------
Preserves existing 7 tables:
  - companies, branches, departments, users, roles, permissions, role_permissions
Deploys minimal customer root & portal access:
  - user_scope_grants, customers (minimal root), customer_sites (minimal root),
    customer_contacts, customer_contact_site_grants, portal_sessions, auth_otps, api_keys
Dependencies: Zero external dependencies; self-contained organizational and identity boundary.
====================================================================================================
                                                  |
                                                  v
====================================================================================================
STAGE 2: FOUNDATIONAL GOVERNANCE, DUAL-CONTROL, RLS INFRASTRUCTURE & CORE AUDIT (20 Entities)
----------------------------------------------------------------------------------------------------
Establishes runtime DB roles (app_user, app_worker, db_migrator) and transaction session context.
Enables and forces RLS on Stage 1 & 2 protected tables.
Deploys dual-control engine and audit log:
  - business_calendars, calendar_working_hours, calendar_holidays, technician_shifts,
    technician_leave, technician_availability_exceptions, user_delegations,
    approval_rules, approval_requests, approval_steps, approval_actions,
    emergency_provisional_authorizations, audit_logs (SHA-256 chain), activity_logs,
    documents, document_versions, notification_templates, notification_preferences,
    notifications, notification_delivery_attempts
Dependencies: Requires Stage 1 users, roles, branches, customer_contacts.
====================================================================================================
                                                  |
                                                  v
====================================================================================================
STAGE 3: SKILLS, COMPREHENSIVE ASSET REGISTER, BOM & TELEMETRY (16 Entities)
----------------------------------------------------------------------------------------------------
Deploys workforce competencies and complete equipment register:
  - skills, technician_skills, certifications, technician_certifications,
    asset_categories, locations, assets, asset_locations_history, asset_ownership_history,
    asset_status_history, asset_meters, meter_readings, asset_downtime_logs,
    asset_boms, asset_warranty_claims, asset_disposals
Dependencies: Requires Stage 1 branches, customers, customer_sites, users; Stage 2 documents.
====================================================================================================
                                                  |
                                                  v
====================================================================================================
STAGE 4: WORK ORDER EXECUTION, SOP CHECKLISTS & SAFETY (PTW / LOTO) (23 Entities)
----------------------------------------------------------------------------------------------------
Deploys operational work order engine, field evidence checklists, and hazardous work safety:
  - failure_codes, work_order_failure_records, checklist_templates, checklist_template_items,
    inspection_templates, inspections, inspection_items, statutory_certificates,
    permits_to_work, loto_procedures, loto_isolation_points, loto_lock_applications,
    work_requests, work_orders, work_order_status_history, work_order_dispatches,
    work_order_assignment_history, work_order_tasks, work_order_checklist_items,
    work_order_verifications, work_order_reopen_history, work_order_cost_approvals,
    work_order_comments
Dependencies: Requires Stage 1 org & portal; Stage 2 approval_requests; Stage 3 assets & locations.
====================================================================================================
                                                  |
                                                  v
====================================================================================================
STAGE 5: MULTI-STORE INVENTORY, PAIRED STOCK LEDGER & WORK DIRECT COSTS (15 Entities)
----------------------------------------------------------------------------------------------------
Deploys physical stores, item master, paired stock movement ledger, and work direct costs:
  - stores, parts, stock, stock_transactions (paired append-only ledger),
    store_transfers, store_transfer_lines, store_transfer_discrepancies,
    stock_counts, stock_count_lines,
    work_order_labor, work_order_parts, work_order_expenses, work_order_subcontractors,
    work_order_sla_events, work_order_sla_pauses
Dependencies: Requires Stage 1 branches & users; Stage 4 work_orders.
====================================================================================================
                                                  |
                                                  v
====================================================================================================
STAGE 6: PREVENTIVE MAINTENANCE PROGRAMS & PROCUREMENT LIFECYCLE (17 Entities)
----------------------------------------------------------------------------------------------------
Deploys recurring PM engine and end-to-end 3-way matching procurement:
  - pm_plans, pm_occurrences, pm_compliance_records, missed_pm_incidents,
    maintenance_backlog_snapshots,
    vendors, purchase_requisitions, purchase_requisition_lines,
    purchase_orders, purchase_order_lines, purchase_order_amendments,
    goods_receipts, goods_receipt_lines, goods_receipt_discrepancies,
    supplier_invoices, supplier_invoice_lines, three_way_matches
Dependencies: Requires Stage 2 approval_requests; Stage 3 assets; Stage 4 work_orders; Stage 5 stores & parts.
====================================================================================================
                                                  |
                                                  v
====================================================================================================
STAGE 7: CONTRACTOR COMMERCIALS, GHANA 2026 TAX ENGINE, INVOICING, SYNC & PRIVACY (36 Entities)
----------------------------------------------------------------------------------------------------
Deploys full commercial billing, statutory tax engine, payments, sync envelopes, and privacy:
  - customer_contracts, contract_rate_cards, rate_card_lines, contract_billing_milestones,
    recurring_billing_schedules, quotes, quote_lines, unbilled_work_items,
    contract_profitability_snapshots,
    tax_regimes, tax_components (VAT 15%, NHIL 2.5%, GETFund 2.5%),
    invoices, invoice_lines, invoice_tax_lines, credit_notes, credit_note_lines,
    payments, payment_allocations, payment_reversals, refunds,
    customer_statement_runs, aged_receivables_snapshots, number_sequences, voided_number_audit,
    notification_escalation_rules, report_definitions, scheduled_reports, kpi_snapshots,
    webhook_subscriptions, webhook_deliveries,
    offline_sync_batches, offline_sync_mutations, offline_sync_conflicts,
    privacy_consents, data_subject_requests, data_retention_policies
Dependencies: Requires Stage 1 customers; Stage 4 work_orders; Stage 5 parts & stock_transactions.
====================================================================================================
```

---

## 4. INVENTORY LEDGER BEHAVIOR & TERMINOLOGY

### 4.1 "Paired Append-Only Physical Stock Movement Ledger"
`stock_transactions` is an operational physical inventory movement sub-ledger. In accordance with strict inventory accounting standards:
1. **Movement Pairing:** Inter-store transfers produce two correlated records: an outflow entry (`TRANSFER_DISPATCH`) from the source store and an inflow entry (`TRANSFER_IN_TRANSIT`) into a virtual transit store under a shared `transaction_group_id`.
2. **Discrepancy Investigation vs. Write-Off:** When a destination store records damaged or missing items during receipt:
   - Accepted stock is cleared from transit into the destination store (`TRANSFER_RECEIPT`).
   - Discrepancies are logged in `store_transfer_discrepancies` with physical count evidence.
   - **Critical Rule:** A discrepancy **does not automatically become a stock write-off**. The missing or damaged quantity remains in an active investigation status within the virtual transit pool until an authorized supervisor approves a formal adjustment, insurance claim, or carrier chargeback.
3. **Compensating Reversals:** Transactions are never deleted. Errors are corrected via compensating entries with inverted signs referencing `reversed_transaction_id`.

---

## 5. TECHNICAL SPECIFICATION FOR UUIDv7 & GENERATED COLUMNS

### 5.1 Application-Level UUIDv7 Strategy
- **Engine Limitation:** PostgreSQL 16 does not natively provide the `uuidv7()` function (introduced in PostgreSQL 18). Utilizing external C-extensions introduces container portability risks.
- **Adopted Standard:** ZemiFix standardizes on **vetted application-level UUIDv7 generation** in TypeScript via RFC 9562 compliant generators (e.g., Node 22 / `@epic-web/uuidv7`).
- **Schema Alignment:**
  - In `schema.prisma`: Primary keys are declared as `String @id @default(uuid())`.
  - In application services / Prisma Client Extensions: Models intercept creation to inject monotonically increasing time-ordered UUIDv7 strings.
  - In database migrations: Fallback default `DEFAULT gen_random_uuid()` is maintained for raw SQL seeds.

### 5.2 Generated Columns Specification
To prevent calculation divergence across the stack:

| Database Table | Column Name | Implementation Mechanism | Exact Mathematical Expression | Single Source of Truth |
|---|---|---|---|---|
| `stock` | `quantity_available` | PostgreSQL `STORED` | `quantity_on_hand - quantity_reserved` | Database Engine |
| `work_order_labor` | `total_cost` | PostgreSQL `STORED` | `hours_spent * hourly_cost_rate` | Database Engine |
| `work_order_labor` | `total_billable` | PostgreSQL `STORED` | `hours_spent * hourly_billing_rate` | Database Engine |
| `work_order_parts` | `total_cost` | PostgreSQL `STORED` | `ROUND(quantity_used * unit_cost, 2)` | Database Engine |
| `work_order_parts` | `total_billable` | PostgreSQL `STORED` | `ROUND(quantity_used * unit_price, 2)` | Database Engine |
| `work_order_expenses` | `billable_amount` | PostgreSQL `STORED` | `ROUND(amount * (1 + markup_percent / 100), 2)` | Database Engine |
| `pm_compliance_records`| `compliance_percentage`| PostgreSQL `STORED` | `CASE WHEN total_scheduled = 0 THEN 100.00 ELSE ROUND((total_completed_on_time::numeric / total_scheduled::numeric) * 100, 2) END` | Database Engine |
| `stock_count_lines` | `variance_quantity` | PostgreSQL `STORED` | `physical_quantity - system_quantity` | Database Engine |
| `stock_count_lines` | `variance_amount` | PostgreSQL `STORED` | `ROUND((physical_quantity - system_quantity) * unit_cost, 2)` | Database Engine |
| `quote_lines` | `total_price` | PostgreSQL `STORED` | `ROUND(quantity * unit_price, 2)` | Database Engine |
| `purchase_requisition_lines`| `total_estimated_cost`| PostgreSQL `STORED`| `ROUND(quantity_requested * estimated_unit_cost, 2)` | Database Engine |
| `purchase_order_lines`| `subtotal` | PostgreSQL `STORED` | `ROUND(quantity_ordered * unit_cost, 2)` | Database Engine |
| `invoice_lines` | `subtotal` | PostgreSQL `STORED` | `ROUND(quantity * unit_price, 2)` | Database Engine |
| `aged_receivables_snapshots`| `total_outstanding`| PostgreSQL `STORED`| `current_balance + days_30_balance + days_60_balance + days_90_balance + days_120_plus_balance` | Database Engine |

*Note:* In Prisma models, stored generated columns are read-only fields mapped via `@default(dbgenerated())`, guaranteeing that business calculations never drift between TypeScript and PostgreSQL.

---

## 6. STAGE 1 & STAGE 2 IMPLEMENTATION BOUNDARIES

### Stage 1 Implementation Scope:
- **Files Modified:** `prisma/schema.prisma` (additive only).
- **Models Implemented (15 Entities):**
  1. `Company` (existing, preserved)
  2. `Branch` (existing, preserved)
  3. `Department` (existing, preserved)
  4. `User` (existing, preserved)
  5. `Role` (existing, preserved)
  6. `Permission` (existing, preserved)
  7. `RolePermission` (existing, preserved)
  8. `UserScopeGrant` (new)
  9. `Customer` (minimal root foundation: `id`, `customerNumber`, `name`, `billingAddress`, `primaryPhone`, `primaryEmail`, `isActive`, `createdAt`, `updatedAt`, `version`)
  10. `CustomerSite` (minimal physical site: `id`, `customerId`, `siteCode`, `name`, `address`, `isActive`, `createdAt`)
  11. `CustomerContact` (new)
  12. `CustomerContactSiteGrant` (new)
  13. `PortalSession` (new)
  14. `AuthOtp` (new)
  15. `ApiKey` (new)
- **Validation Gates:** `npx prisma validate` and `npx prisma generate` must pass with 0 errors.

### Stage 2 Implementation Scope:
- **Models Implemented (20 Entities):**
  1. `BusinessCalendar`
  2. `CalendarWorkingHours`
  3. `CalendarHoliday`
  4. `TechnicianShift`
  5. `TechnicianLeave`
  6. `TechnicianAvailabilityException`
  7. `UserDelegation`
  8. `ApprovalRule`
  9. `ApprovalRequest`
  10. `ApprovalStep`
  11. `ApprovalAction`
  12. `EmergencyProvisionalAuthorization`
  13. `AuditLog`
  14. `ActivityLog`
  15. `Document`
  16. `DocumentVersion`
  17. `NotificationTemplate`
  18. `NotificationPreference`
  19. `Notification`
  20. `NotificationDeliveryAttempt`
- **PostgreSQL Migrations Deployed:**
  - Runtime database roles: `db_migrator`, `app_user`, `app_worker`.
  - Transaction-local context session functions (`set_config(..., true)`).
  - RLS activation (`ENABLE ROW LEVEL SECURITY` and `FORCE ROW LEVEL SECURITY`) on all Stage 1 & 2 protected tables.
  - Append-only triggers on `approval_actions` and `audit_logs`.
  - Maker-checker verification trigger `tg_enforce_maker_checker_integrity`.

---

## 7. REMAINING ARCHITECTURAL BLOCKERS

**Zero Architectural Blockers Identified.**
- The circular dependencies between Customer, CustomerSite, and CustomerContact have been resolved by introducing the minimal Customer identity foundation in Stage 1.
- RLS sequencing is anchored in Stage 2 with zero deferral to Stage 7.
- Every single entity of the 142 is mapped to an exact topological level and migration stage.
- Existing administrator data and foundation models remain strictly preserved.

We await your formal sign-off of this corrected implementation map to begin Stage 1 schema coding.
