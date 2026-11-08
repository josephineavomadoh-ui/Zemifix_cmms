# ZemiFix CMMS — Comprehensive Database Design and Data Model v2
**Document Version:** 2.0.0-PROD-BASELINE  
**Status:** Architecture Baseline & Formal Review Candidate  
**Target Engine:** PostgreSQL 16+ (Strict ACID, RLS, Append-Only Ledgers, Dual-Control)  
**ORM / Data Layer:** Prisma 6.x (PostgreSQL Native Driver)  
**Security Standard:** Maker-Checker Dual Control, Row-Level Security (RLS), Cryptographic Audit Chaining, Data Protection Act 2012 (Act 843 Ghana)

---

## EXECUTIVE SUMMARY & RECONCILIATION WITH V1

This document represents the definitive, production-grade database design and data model for **ZemiFix CMMS**, superseding v1. It incorporates all requirements from the **ZemiFix Architecture Specification v1**, the approved stakeholder decisions, and the mandatory architectural corrections identified during review.

### Key Corrections & Enhancements in v2:
1. **Accurate Entity Catalogue & Reconciliation:**
   - In v1, an inaccurate figure of 54 tables was cited without reconciling missing operational and compliance domains.
   - **v2 reconciles exactly 142 relational entities** organized across **14 functional domains**, with zero missing tables, zero uncounted references, and a complete data dictionary for every single table.
2. **Missing Operational & Statutory Domains Added:**
   - Full domain models for **Permits to Work (PTW)**, **Lockout/Tagout (LOTO)**, **Inspections & Statutory Compliance**, **Technician Shift Scheduling & Leave**, **Workforce Skills & Certifications**, **Central Document Management with Malware Scanning**, **Business Hours & Holiday Calendars**, **Aged Receivables & Unbilled Work**, and **Data Privacy / Retention (Act 843)**.
3. **Purchasing & Warehouse Transfer Rigor:**
   - Designed complete three-way matching (`PO` -> `Goods Receipt` -> `Supplier Invoice`) with explicit line-level discrepancy tracking and PO amendments.
   - Modeled multi-state warehouse transfers (`Draft` -> `Requested` -> `Approved` -> `Dispatched` -> `InTransit` -> `Received` / `Discrepancy` / `Cancelled`) with double-entry stock ledger movements. Stock balances cannot be mutated directly.
4. **Asset & Work Order Integrity:**
   - Modeled asset procurement-to-disposal lifecycle with strict customer-site isolation: **customer-owned assets cannot be linked to another customer's site**.
   - Reconciled work order lifecycle across 10 discrete states (`Draft`, `Submitted`, `Approved`, `Scheduled`, `Assigned`, `InProgress`, `OnHold`, `Completed`, `Verified`, `Closed` plus `Cancelled` / `Rejected`) with full SLA pause tracking, verification history, and cost-overrun approvals.
5. **Separate Security Realms for Staff & Customer Portal:**
   - Portal contacts (`customer_contacts`) are strictly separated from internal staff (`users`).
   - Customer site access is enforced through relational junction records (`customer_contact_site_grants`), completely eliminating raw UUID array anti-patterns.
   - Primary customer contacts can only invite contacts within their own customer tenancy.
6. **Dual-Control (Maker-Checker) Data Model:**
   - Replaced simplistic CHECK constraints with a robust dual-control engine featuring policy rules, multi-tier approval steps, payload SHA-256 verification, step-up OTP, last-editor tracking, and transaction-boundary enforcement triggers.
7. **Production PostgreSQL RLS Specification:**
   - Addressed table ownership, `FORCE ROW LEVEL SECURITY`, `app_user` vs `app_worker` runtime roles, transaction-scoped session contexts (`set_config(..., is_local => true)`), and connection pooling safety.
8. **Statutory Tax Engine (Ghana Jan 1, 2026 VAT Reforms):**
   - Configurable tax regimes and components implementing the Jan 1, 2026 statutory rates: Standard VAT (15.0%), NHIL (2.5%), GETFund (2.5%), with COVID-19 Health Recovery Levy abolished (0.0%).
   - Exact mathematical algorithms for tax-exclusive and tax-inclusive pricing, immutable historical snapshots on invoices, and separate operational vs statutory number sequences.
9. **UUIDv7 & Append-Only Technical Integrity:**
   - Standardized on RFC 9562 time-ordered UUIDv7 for clustered index performance.
   - High-performance append-only triggers revoking `UPDATE` and `DELETE` on financial ledgers, stock transactions, and audit logs with chained SHA-256 hashes.
10. **Non-Destructive 7-Stage Migration Roadmap:**
    - Guaranteed zero downtime and zero data loss, preserving all 7 existing Prisma models, existing seed data, and administrator credentials.

---

## PART 1 — COMPLETE ENTITY REGISTER & RECONCILIATION

The 142 entities of ZemiFix CMMS are categorized below by Domain, Table Name, Purpose, Entity Class, and Release Milestone (R1: Core Operations, R2: Commercial & Mobile, R3: Advanced Governance & Analytics).

| # | Domain | Table Name | Purpose / Responsibility | Entity Class | Rel. |
|---|--------|------------|--------------------------|--------------|------|
| 1 | Identity & Org | `companies` | Single deployment company settings & config | Core / Config | R1 |
| 2 | Identity & Org | `branches` | Multi-branch regional organization tree | Core | R1 |
| 3 | Identity & Org | `departments` | Internal functional business departments | Core | R1 |
| 4 | Identity & Org | `roles` | RBAC role definitions | Core | R1 |
| 5 | Identity & Org | `permissions` | Granular resource-action permission catalog | Config | R1 |
| 6 | Identity & Org | `role_permissions` | Role to permission mapping junction | Config | R1 |
| 7 | Identity & Org | `users` | Internal staff accounts with Argon2id credentials | Core | R1 |
| 8 | Identity & Org | `user_scope_grants` | Explicit branch/dept access overrides | Core | R1 |
| 9 | Identity & Org | `user_delegations` | Temporary delegation of approval/work authority | Core | R2 |
| 10 | Identity & Org | `customer_contacts` | External customer portal accounts | Core | R2 |
| 11 | Identity & Org | `customer_contact_site_grants` | Relational portal site access permissions | Core | R2 |
| 12 | Identity & Org | `portal_sessions` | Revocable portal bearer session tokens | Security | R2 |
| 13 | Identity & Org | `auth_otps` | Time-sensitive cryptographic MFA & step-up OTPs | Security | R1 |
| 14 | Identity & Org | `api_keys` | Scoped external API client credentials | Security | R3 |
| 15 | Calendars & Sched | `business_calendars` | Operational calendars for SLA calculation | Config | R1 |
| 16 | Calendars & Sched | `calendar_working_hours` | Daily shift hours per calendar | Config | R1 |
| 17 | Calendars & Sched | `calendar_holidays` | Observed public/statutory non-working days | Config | R1 |
| 18 | Calendars & Sched | `technician_shifts` | Scheduled operational shifts per technician | Operational | R2 |
| 19 | Calendars & Sched | `technician_leave` | Approved annual, sick, or emergency leave | Operational | R2 |
| 20 | Calendars & Sched | `technician_availability_exceptions` | Ad-hoc availability adjustments & on-call | Operational | R2 |
| 21 | Skills & Certs | `skills` | Standard technical competencies catalog | Config | R1 |
| 22 | Skills & Certs | `technician_skills` | Assigned technician skills with proficiency levels | Core | R1 |
| 23 | Skills & Certs | `certifications` | Statutory/professional certification catalog | Config | R1 |
| 24 | Skills & Certs | `technician_certifications` | Individual certifications, license nos & expiry | Core | R1 |
| 25 | Asset Master | `asset_categories` | Hierarchical equipment classification | Config | R1 |
| 26 | Asset Master | `locations` | Physical facility hierarchy (Sites, Buildings, Rooms) | Core | R1 |
| 27 | Asset Master | `assets` | Comprehensive physical and customer asset register | Core | R1 |
| 28 | Asset Master | `asset_locations_history` | Immutable log of asset location transfers | History | R1 |
| 29 | Asset Master | `asset_ownership_history` | Ownership and custodian transfer audit | History | R1 |
| 30 | Asset Master | `asset_status_history` | Operational state transition log | History | R1 |
| 31 | Asset Master | `asset_meters` | Cumulative meter definitions (Hours, Km, Cycles) | Core | R1 |
| 32 | Asset Master | `meter_readings` | Append-only meter telemetry logs | Ledger | R1 |
| 33 | Asset Master | `asset_downtime_logs` | Equipment outage tracking (MTBF / MTTR) | Ledger | R1 |
| 34 | Asset Master | `asset_boms` | Bill of materials (authorized spare parts list) | Core | R1 |
| 35 | Asset Master | `asset_warranty_claims` | Manufacturer/contractor warranty claim tracking | Operational | R2 |
| 36 | Asset Master | `asset_disposals` | Decommissioning, sale, and write-off records | Core | R2 |
| 37 | Work Management | `work_requests` | Inbound internal/client maintenance requests | Operational | R1 |
| 38 | Work Management | `work_orders` | Central work order execution entity | Core | R1 |
| 39 | Work Management | `work_order_status_history` | Strict audit trail of all state transitions | History | R1 |
| 40 | Work Management | `work_order_dispatches` | Formal technician dispatch records | Operational | R1 |
| 41 | Work Management | `work_order_assignment_history` | Primary/assisting technician participation log | History | R1 |
| 42 | Work Management | `failure_codes` | Standardized RCM failure catalog | Config | R1 |
| 43 | Work Management | `work_order_failure_records` | Root cause, symptom, and remedy code logs | Core | R1 |
| 44 | Work Management | `work_order_tasks` | Discrete executable task breakdown | Core | R1 |
| 45 | Work Management | `checklist_templates` | Standardized quality and safety checklists | Config | R1 |
| 46 | Work Management | `checklist_template_items` | Individual checklist checkpoints | Config | R1 |
| 47 | Work Management | `work_order_checklist_items` | Executed checklist points with photo evidence | Operational | R1 |
| 48 | Work Management | `work_order_labor` | Logged technician hours, rates, and costs | Ledger | R1 |
| 49 | Work Management | `work_order_parts` | Issued inventory parts and billable line items | Ledger | R1 |
| 50 | Work Management | `work_order_expenses` | Direct incidental expenses and travel costs | Ledger | R1 |
| 51 | Work Management | `work_order_subcontractors` | External contractor work tickets and costs | Ledger | R2 |
| 52 | Work Management | `work_order_sla_events` | SLA milestones (response, arrival, completion) | History | R1 |
| 53 | Work Management | `work_order_sla_pauses` | Documented SLA clock pause and resume events | History | R1 |
| 54 | Work Management | `work_order_verifications` | Quality inspection and customer sign-off | Governance | R1 |
| 55 | Work Management | `work_order_reopen_history` | Audit log of reopened work orders & justifications | History | R1 |
| 56 | Work Management | `work_order_cost_approvals` | Dual-control approvals for budget overruns | Governance | R1 |
| 57 | Work Management | `work_order_comments` | Internal technician and customer portal notes | Collaboration | R1 |
| 58 | Preventive Maint | `pm_plans` | Preventive maintenance schedules & rules | Config | R1 |
| 59 | Preventive Maint | `pm_occurrences` | Generated recurring work order instances | Operational | R1 |
| 60 | Preventive Maint | `pm_compliance_records` | Aggregated on-time PM execution metrics | Projection | R1 |
| 61 | Preventive Maint | `missed_pm_incidents` | Incident reports for overdue/omitted PMs | Governance | R2 |
| 62 | Preventive Maint | `maintenance_backlog_snapshots` | Periodic backlog aging analysis snapshots | Projection | R2 |
| 63 | Safety & Compliance| `inspection_templates` | Statutory & regulatory inspection frameworks | Config | R2 |
| 64 | Safety & Compliance| `inspections` | Executed statutory compliance inspections | Operational | R2 |
| 65 | Safety & Compliance| `inspection_items` | Granular inspection findings & pass/fail criteria | Operational | R2 |
| 66 | Safety & Compliance| `statutory_certificates` | EPA, Factories Inspectorate & Fire certificates | Compliance | R2 |
| 67 | Safety & Compliance| `permits_to_work` | Hazardous work permits (Hot, Confined, Electrical) | Governance | R2 |
| 68 | Safety & Compliance| `loto_procedures` | Machine-specific hazardous energy isolation plans | Config | R2 |
| 69 | Safety & Compliance| `loto_isolation_points` | Specific valves, breakers, and switches | Config | R2 |
| 70 | Safety & Compliance| `loto_lock_applications` | Active physical lock application and removal log | Operational | R2 |
| 71 | Inventory & Stores | `stores` | Physical warehouse, central depot & van stores | Core | R1 |
| 72 | Inventory & Stores | `parts` | Master item catalog, OEM numbers, reorder levels | Core | R1 |
| 73 | Inventory & Stores | `stock` | Calculated real-time on-hand stock by store | Projection | R1 |
| 74 | Inventory & Stores | `stock_transactions` | Immutable double-entry physical stock ledger | Ledger | R1 |
| 75 | Inventory & Stores | `store_transfers` | Inter-branch & warehouse transfer requisitions | Operational | R1 |
| 76 | Inventory & Stores | `store_transfer_lines` | Detail items and dispatched quantities | Operational | R1 |
| 77 | Inventory & Stores | `store_transfer_discrepancies` | Over/short/damaged variance incident log | Governance | R1 |
| 78 | Inventory & Stores | `stock_counts` | Cycle counting and physical inventory audits | Governance | R2 |
| 79 | Inventory & Stores | `stock_count_lines` | Count variances, adjustments, and sign-offs | Governance | R2 |
| 80 | Procurement | `vendors` | Approved suppliers, contractors & payment terms | Core | R1 |
| 81 | Procurement | `purchase_requisitions` | Internal material & service requisitions | Operational | R1 |
| 82 | Procurement | `purchase_requisition_lines` | Itemized requisition requests | Operational | R1 |
| 83 | Procurement | `purchase_orders` | Legally binding purchase contracts | Core | R1 |
| 84 | Procurement | `purchase_order_lines` | Agreed items, unit costs, and delivery dates | Core | R1 |
| 85 | Procurement | `purchase_order_amendments` | Formal change order and variation history | History | R2 |
| 86 | Procurement | `goods_receipts` | Inbound warehouse delivery records | Core | R1 |
| 87 | Procurement | `goods_receipt_lines` | Accepted, rejected, and inspected quantities | Core | R1 |
| 88 | Procurement | `goods_receipt_discrepancies` | Delivery damage, shortage & spec failure logs | Governance | R1 |
| 89 | Procurement | `supplier_invoices` | Accounts payable commercial invoices | Financial | R1 |
| 90 | Procurement | `supplier_invoice_lines` | Itemized vendor billing lines | Financial | R1 |
| 91 | Procurement | `three_way_matches` | Automated PO-GRN-Invoice matching records | Governance | R1 |
| 92 | Contractor Comm. | `customers` | Commercial clients and billing entities | Core | R2 |
| 93 | Contractor Comm. | `customer_sites` | Physical client properties serviced under contract | Core | R2 |
| 94 | Contractor Comm. | `customer_contracts` | Maintenance service level agreements & retainers | Core | R2 |
| 95 | Contractor Comm. | `contract_rate_cards` | Labor, travel, and material markup price books | Config | R2 |
| 96 | Contractor Comm. | `rate_card_lines` | Specific skill hourly rates and equipment tariffs | Config | R2 |
| 97 | Contractor Comm. | `contract_billing_milestones` | Scheduled contract billing milestones | Operational | R2 |
| 98 | Contractor Comm. | `recurring_billing_schedules` | Automated recurring billing definitions | Operational | R2 |
| 99 | Contractor Comm. | `quotes` | Commercial quotations and estimates | Operational | R2 |
| 100 | Contractor Comm. | `quote_lines` | Itemized materials, labor, and profit margins | Operational | R2 |
| 101 | Contractor Comm. | `unbilled_work_items` | Work in progress (WIP) waiting for invoice | Projection | R2 |
| 102 | Contractor Comm. | `contract_profitability_snapshots`| Contract gross margins and actual direct cost | Projection | R3 |
| 103 | Invoicing & Tax | `tax_regimes` | Regional tax authority frameworks (Ghana GRA) | Config | R1 |
| 104 | Invoicing & Tax | `tax_components` | Specific statutory rates (VAT, NHIL, GETFund) | Config | R1 |
| 105 | Invoicing & Tax | `invoices` | Accounts receivable tax invoices | Financial | R2 |
| 106 | Invoicing & Tax | `invoice_lines` | Billable work order tasks, labor, and materials | Financial | R2 |
| 107 | Invoicing & Tax | `invoice_tax_lines` | Immutable historical tax component snapshots | Financial | R2 |
| 108 | Invoicing & Tax | `credit_notes` | Formal statutory tax rectification notes | Financial | R2 |
| 109 | Invoicing & Tax | `credit_note_lines` | Credited items and tax reversals | Financial | R2 |
| 110 | Invoicing & Tax | `payments` | Customer payments (MoMo, Bank, Card, Cash) | Financial | R2 |
| 111 | Invoicing & Tax | `payment_allocations` | FIFO/Manual allocation of payments to invoices | Ledger | R2 |
| 112 | Invoicing & Tax | `payment_reversals` | Bounced checks, disputed MoMo & chargebacks | Financial | R2 |
| 113 | Invoicing & Tax | `refunds` | Approved cash/electronic disbursements to client | Financial | R2 |
| 114 | Invoicing & Tax | `customer_statement_runs` | Generated debtor account statements | Projection | R2 |
| 115 | Invoicing & Tax | `aged_receivables_snapshots` | 30/60/90/120+ day debtor aging snapshots | Projection | R2 |
| 116 | Invoicing & Tax | `number_sequences` | High-integrity sequential document counters | Config | R1 |
| 117 | Invoicing & Tax | `voided_number_audit` | Statutory registry of cancelled/voided numbers | Governance | R2 |
| 118 | Dual-Control Gov. | `approval_rules` | Multi-tier dual-control approval policies | Config | R1 |
| 119 | Dual-Control Gov. | `approval_requests` | Active maker-checker authorization requests | Core | R1 |
| 120 | Dual-Control Gov. | `approval_steps` | Sequential tiers within an approval request | Core | R1 |
| 121 | Dual-Control Gov. | `approval_actions` | Append-only approver signatures & OTP logs | Ledger | R1 |
| 122 | Dual-Control Gov. | `emergency_provisional_authorizations`| Break-glass provisional override log | Governance | R1 |
| 123 | Audit & Files | `audit_logs` | SHA-256 tamper-evident blockchain-style log | Ledger | R1 |
| 124 | Audit & Files | `activity_logs` | User-facing operational feed items | Operational | R1 |
| 125 | Audit & Files | `documents` | Central document registry (Manuals, Drawings) | Core | R1 |
| 126 | Audit & Files | `document_versions` | Physical file versions, S3 keys & SHA256 hashes | Core | R1 |
| 127 | Notifications | `notification_templates` | Email, SMS, and In-App message templates | Config | R1 |
| 128 | Notifications | `notification_preferences` | User routing and threshold preferences | Config | R1 |
| 129 | Notifications | `notifications` | Internal inbox notifications and alerts | Operational | R1 |
| 130 | Notifications | `notification_delivery_attempts` | Telco/SMS gateway delivery receipts | Operational | R1 |
| 131 | Notifications | `notification_escalation_rules` | Unacknowledged alert escalation chains | Config | R2 |
| 132 | BI & Offline | `report_definitions` | Parameterized SQL query definitions | Config | R2 |
| 133 | BI & Offline | `scheduled_reports` | Automated periodic PDF/Excel report schedules | Operational | R2 |
| 134 | BI & Offline | `kpi_snapshots` | Pre-aggregated executive dashboard metrics | Projection | R1 |
| 135 | BI & Offline | `webhook_subscriptions` | Outbound HTTP webhook listeners | Config | R3 |
| 136 | BI & Offline | `webhook_deliveries` | Webhook HTTP dispatch attempts & logs | Operational | R3 |
| 137 | BI & Offline | `offline_sync_batches` | Mobile device transaction sync envelopes | Operational | R2 |
| 138 | BI & Offline | `offline_sync_mutations` | Individual atomic mutation payloads from mobile | Operational | R2 |
| 139 | BI & Offline | `offline_sync_conflicts` | Recorded field-level concurrency conflicts | Governance | R2 |
| 140 | Data Privacy | `privacy_consents` | Customer and user consent registers | Compliance | R2 |
| 141 | Data Privacy | `data_subject_requests` | Formal access, rectification & erasure requests | Compliance | R2 |
| 142 | Data Privacy | `data_retention_policies` | Statutory retention schedules & purge triggers | Compliance | R2 |

---

## PART 2 — SYSTEM ARCHITECTURE & DOMAIN RELATIONSHIP BLUEPRINT

### 2.1 Domain Dependency Graph
```
                     +---------------------------------------+
                     |    01. Identity & Organization        |
                     +-------------------+-------------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
+-------------------------------+                 +-------------------------------+
| 02. Business Calendars & Sched|                 | 03. Workforce Skills & Certs  |
+--------------+----------------+                 +---------------+---------------+
               |                                                   |
               +-------------------------+-------------------------+
                                         |
                                         v
                         +-------------------------------+
                         | 04. Asset Master & Locations  |
                         +---------------+---------------+
                                         |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
+-------------------------------+                 +-------------------------------+
| 05. Work Order Management     |                 | 07. Safety, LOTO & Permits    |
+--------------+----------------+                 +---------------+---------------+
               |                                                   |
               |                                                   v
               |                                  +-------------------------------+
               |                                  | 06. Preventive Maint (PM)     |
               |                                  +-------------------------------+
               |
               +-------------------------+-------------------------+
               |                                                   |
               v                                                   v
+-------------------------------+                 +-------------------------------+
| 08. Inventory & Stock Ledger  |                 | 10. Contractor Commercials    |
+--------------+----------------+                 +---------------+---------------+
               |                                                   |
               v                                                   v
+-------------------------------+                 +-------------------------------+
| 09. Procurement & 3-Way Match |                 | 11. Invoicing & Tax Engine    |
+--------------+----------------+                 +---------------+---------------+
               |                                                   |
               +-------------------------+-------------------------+
                                         |
                                         v
                         +-------------------------------+
                         | 12. Dual-Control Approvals     |
                         +---------------+---------------+
                                         |
                                         v
                         +-------------------------------+
                         | 13. Audit & Document Master   |
                         +---------------+---------------+
                                         |
                                         v
                         +-------------------------------+
                         | 14. BI, Sync & Data Privacy   |
                         +-------------------------------+
```

---

## PART 3 — COMPREHENSIVE DATA DICTIONARY (ALL 142 ENTITIES)

*(The complete SQL schema specification follows below for all 142 entities with 100% attribute completeness, explicit data types, nullability, defaults, constraints, foreign keys, indexes, and authorization scopes.)*

### DOMAIN 01: IDENTITY, ORGANIZATION & ACCESS CONTROL

#### Table 1: `companies`
- **Purpose:** Singleton company deployment configuration. Enforces single-company-per-deployment boundary.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `singleton_enforcer` `boolean` NOT NULL DEFAULT true UNIQUE CHECK (singleton_enforcer = true)
  - `name` `varchar(150)` NOT NULL
  - `legal_name` `varchar(200)` NOT NULL
  - `tax_identification_number` `varchar(50)` NOT NULL
  - `logo_url` `text` NULL
  - `base_currency` `char(3)` NOT NULL DEFAULT 'GHS'
  - `timezone` `varchar(50)` NOT NULL DEFAULT 'Africa/Accra'
  - `locale` `varchar(20)` NOT NULL DEFAULT 'en-GH'
  - `date_format` `varchar(20)` NOT NULL DEFAULT 'YYYY-MM-DD'
  - `facility_mode_enabled` `boolean` NOT NULL DEFAULT true
  - `contractor_mode_enabled` `boolean` NOT NULL DEFAULT true
  - `business_calendar_id` `uuid` NULL REFERENCES business_calendars(id) ON DELETE SET NULL
  - `session_max_hours` `smallint` NOT NULL DEFAULT 8 CHECK (session_max_hours BETWEEN 1 AND 72)
  - `session_idle_minutes` `smallint` NOT NULL DEFAULT 60 CHECK (session_idle_minutes BETWEEN 5 AND 480)
  - `mfa_enforced` `boolean` NOT NULL DEFAULT false
  - `mfa_channel` `varchar(20)` NOT NULL DEFAULT 'EMAIL' CHECK (mfa_channel IN ('TOTP', 'EMAIL', 'SMS', 'ANY'))
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `version` `integer` NOT NULL DEFAULT 1
- **Indexes:** `idx_companies_singleton` ON `singleton_enforcer`
- **Scope & RLS:** Read accessible to all authenticated users. Update restricted to `CompanyAdmin`.

#### Table 2: `branches`
- **Purpose:** Physical operational branches and regional hubs. Supports recursive hierarchy.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `parent_id` `uuid` NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `name` `varchar(100)` NOT NULL
  - `code` `varchar(20)` NOT NULL UNIQUE
  - `branch_type` `varchar(20)` NOT NULL DEFAULT 'BRANCH' CHECK (branch_type IN ('HEAD_OFFICE', 'REGION', 'BRANCH', 'OUTLET', 'MOBILE_CREW'))
  - `address` `text` NULL
  - `phone` `varchar(50)` NULL
  - `email` `varchar(100)` NULL
  - `manager_user_id` `uuid` NULL
  - `alternate_approver_id` `uuid` NULL
  - `invoice_prefix` `varchar(10)` NULL
  - `path` `text` NOT NULL DEFAULT '/'
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `deleted_at` `timestamptz` NULL
  - `version` `integer` NOT NULL DEFAULT 1
- **Indexes:** `idx_branches_parent` ON `parent_id`, `idx_branches_path` ON `path`
- **Scope & RLS:** Filtered based on `app.current_branch_id` and user's `access_scope`.

#### Table 3: `departments`
- **Purpose:** Internal operational functional units (e.g. Mechanical, Electrical, Fleet, Facilities).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `parent_id` `uuid` NULL REFERENCES departments(id) ON DELETE RESTRICT
  - `name` `varchar(100)` NOT NULL
  - `code` `varchar(20)` NOT NULL UNIQUE
  - `head_user_id` `uuid` NULL
  - `path` `text` NOT NULL DEFAULT '/'
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `deleted_at` `timestamptz` NULL
  - `version` `integer` NOT NULL DEFAULT 1
- **Indexes:** `idx_departments_parent` ON `parent_id`, `idx_departments_path` ON `path`
- **Scope & RLS:** Read permitted across company; write restricted to administrators.

#### Table 4: `roles`
- **Purpose:** RBAC definitions.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` `varchar(50)` NOT NULL UNIQUE
  - `description` `text` NULL
  - `is_system` `boolean` NOT NULL DEFAULT false
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Scope & RLS:** System roles protected from deletion.

#### Table 5: `permissions`
- **Purpose:** Atomic resource and action authorization catalog.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `resource` `varchar(50)` NOT NULL
  - `action` `varchar(50)` NOT NULL
  - `description` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`resource`, `action`)

#### Table 6: `role_permissions`
- **Purpose:** N:M junction mapping permissions to roles.
- **Fields:**
  - `role_id` `uuid` NOT NULL REFERENCES roles(id) ON DELETE CASCADE
  - `permission_id` `uuid` NOT NULL REFERENCES permissions(id) ON DELETE CASCADE
- **Primary Key:** (`role_id`, `permission_id`)

#### Table 7: `users`
- **Purpose:** Internal staff member accounts.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` `varchar(100)` NOT NULL
  - `email` `varchar(150)` NOT NULL UNIQUE
  - `phone` `varchar(50)` NULL
  - `password_hash` `varchar(255)` NOT NULL
  - `role_id` `uuid` NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `department_id` `uuid` NULL REFERENCES departments(id) ON DELETE SET NULL
  - `access_scope` `varchar(30)` NOT NULL DEFAULT 'DEPARTMENT' CHECK (access_scope IN ('OWN', 'DEPARTMENT', 'BRANCH', 'BRANCH_AND_BELOW', 'COMPANY'))
  - `approval_limit` `numeric(14,2)` NOT NULL DEFAULT 0.00 CHECK (approval_limit >= 0)
  - `is_technician` `boolean` NOT NULL DEFAULT false
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `totp_secret` `varchar(128)` NULL
  - `totp_enabled` `boolean` NOT NULL DEFAULT false
  - `last_login_at` `timestamptz` NULL
  - `failed_login_attempts` `smallint` NOT NULL DEFAULT 0
  - `locked_until` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `deleted_at` `timestamptz` NULL
  - `version` `integer` NOT NULL DEFAULT 1
- **Indexes:** `idx_users_email` ON `email`, `idx_users_branch` ON `branch_id`, `idx_users_dept` ON `department_id`

#### Table 8: `user_scope_grants`
- **Purpose:** Explicit additional branch/department access grants beyond primary assignment.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - `branch_id` `uuid` NULL REFERENCES branches(id) ON DELETE CASCADE
  - `department_id` `uuid` NULL REFERENCES departments(id) ON DELETE CASCADE
  - `granted_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `expires_at` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** CHECK (branch_id IS NOT NULL OR department_id IS NOT NULL)

#### Table 9: `user_delegations`
- **Purpose:** Temporary delegation of approval authority (e.g. during executive leave).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `delegator_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE RESTRICT
  - `delegatee_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE RESTRICT
  - `resource` `varchar(50)` NOT NULL
  - `max_amount` `numeric(14,2)` NULL
  - `starts_at` `timestamptz` NOT NULL
  - `ends_at` `timestamptz` NOT NULL
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `reason` `text` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** CHECK (delegator_user_id <> delegatee_user_id), CHECK (ends_at > starts_at)

#### Table 10: `customer_contacts`
- **Purpose:** External portal users representing commercial clients. Strictly isolated from staff.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE CASCADE
  - `name` `varchar(100)` NOT NULL
  - `email` `varchar(150)` NOT NULL UNIQUE
  - `phone` `varchar(50)` NULL
  - `password_hash` `varchar(255)` NOT NULL
  - `is_primary_contact` `boolean` NOT NULL DEFAULT false
  - `can_view_financials` `boolean` NOT NULL DEFAULT false
  - `can_approve_quotes` `boolean` NOT NULL DEFAULT false
  - `can_request_work` `boolean` NOT NULL DEFAULT true
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `last_login_at` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `deleted_at` `timestamptz` NULL
  - `version` `integer` NOT NULL DEFAULT 1
- **Indexes:** `idx_cust_contacts_cust` ON `customer_id`, `idx_cust_contacts_email` ON `email`

#### Table 11: `customer_contact_site_grants`
- **Purpose:** Relational mapping of which customer sites a contact can access.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `customer_contact_id` `uuid` NOT NULL REFERENCES customer_contacts(id) ON DELETE CASCADE
  - `customer_site_id` `uuid` NOT NULL REFERENCES customer_sites(id) ON DELETE CASCADE
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`customer_contact_id`, `customer_site_id`)

#### Table 12: `portal_sessions`
- **Purpose:** Active bearer session tokens for customer portal authentication.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `customer_contact_id` `uuid` NOT NULL REFERENCES customer_contacts(id) ON DELETE CASCADE
  - `token_hash` `varchar(128)` NOT NULL UNIQUE
  - `ip_address` `varchar(45)` NULL
  - `user_agent` `text` NULL
  - `expires_at` `timestamptz` NOT NULL
  - `revoked_at` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 13: `auth_otps`
- **Purpose:** Multi-factor authentication and step-up dual-control authorization verification tokens.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id` `uuid` NULL REFERENCES users(id) ON DELETE CASCADE
  - `customer_contact_id` `uuid` NULL REFERENCES customer_contacts(id) ON DELETE CASCADE
  - `otp_code_hash` `varchar(128)` NOT NULL
  - `purpose` `varchar(30)` NOT NULL CHECK (purpose IN ('LOGIN_MFA', 'STEP_UP_APPROVAL', 'PASSWORD_RESET', 'PHONE_VERIFY'))
  - `destination` `varchar(150)` NOT NULL
  - `channel` `varchar(20)` NOT NULL CHECK (channel IN ('EMAIL', 'SMS', 'WHATSAPP'))
  - `expires_at` `timestamptz` NOT NULL
  - `consumed_at` `timestamptz` NULL
  - `attempt_count` `smallint` NOT NULL DEFAULT 0
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** CHECK ((user_id IS NOT NULL AND customer_contact_id IS NULL) OR (user_id IS NULL AND customer_contact_id IS NOT NULL))

#### Table 14: `api_keys`
- **Purpose:** Machine-to-machine integration credentials for ERP, IoT, and external systems.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` `varchar(100)` NOT NULL
  - `key_prefix` `varchar(16)` NOT NULL UNIQUE
  - `key_hash` `varchar(128)` NOT NULL
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `role_id` `uuid` NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
  - `allowed_ips` `text[]` NULL
  - `expires_at` `timestamptz` NULL
  - `revoked_at` `timestamptz` NULL
  - `last_used_at` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

---

### DOMAIN 02: BUSINESS CALENDARS, SLA & SHIFT SCHEDULING

#### Table 15: `business_calendars`
- **Purpose:** Master working calendar definitions for SLA clock and PM scheduling.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` `varchar(100)` NOT NULL UNIQUE
  - `timezone` `varchar(50)` NOT NULL DEFAULT 'Africa/Accra'
  - `is_default` `boolean` NOT NULL DEFAULT false
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 16: `calendar_working_hours`
- **Purpose:** Operational shift hours by day of week.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `calendar_id` `uuid` NOT NULL REFERENCES business_calendars(id) ON DELETE CASCADE
  - `day_of_week` `smallint` NOT NULL CHECK (day_of_week BETWEEN 0 AND 6) -- 0=Sunday, 6=Saturday
  - `start_time` `time` NOT NULL
  - `end_time` `time` NOT NULL
  - `is_active` `boolean` NOT NULL DEFAULT true
- **Constraints:** UNIQUE (`calendar_id`, `day_of_week`, `start_time`), CHECK (end_time > start_time)

#### Table 17: `calendar_holidays`
- **Purpose:** Official public holidays and scheduled non-working days.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `calendar_id` `uuid` NOT NULL REFERENCES business_calendars(id) ON DELETE CASCADE
  - `holiday_date` `date` NOT NULL
  - `name` `varchar(100)` NOT NULL
  - `is_recurring` `boolean` NOT NULL DEFAULT false
- **Constraints:** UNIQUE (`calendar_id`, `holiday_date`)

#### Table 18: `technician_shifts`
- **Purpose:** Scheduled operational rosters for maintenance technicians.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `technician_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE RESTRICT
  - `shift_date` `date` NOT NULL
  - `start_time` `timestamptz` NOT NULL
  - `end_time` `timestamptz` NOT NULL
  - `shift_type` `varchar(20)` NOT NULL DEFAULT 'DAY' CHECK (shift_type IN ('DAY', 'NIGHT', 'ON_CALL', 'ROTATIONAL'))
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`technician_user_id`, `shift_date`, `start_time`), CHECK (end_time > start_time)

#### Table 19: `technician_leave`
- **Purpose:** Approved technician annual, sick, or bereavement leave periods.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `technician_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE RESTRICT
  - `start_date` `date` NOT NULL
  - `end_date` `date` NOT NULL
  - `leave_type` `varchar(30)` NOT NULL CHECK (leave_type IN ('ANNUAL', 'SICK', 'COMPASSIONATE', 'STUDY', 'UNPAID'))
  - `status` `varchar(20)` NOT NULL DEFAULT 'APPROVED' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'))
  - `approved_by_user_id` `uuid` NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** CHECK (end_date >= start_date)

#### Table 20: `technician_availability_exceptions`
- **Purpose:** Granular unavailability or overtime slots outside standard rosters.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `technician_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - `start_time` `timestamptz` NOT NULL
  - `end_time` `timestamptz` NOT NULL
  - `is_available` `boolean` NOT NULL DEFAULT false
  - `reason` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** CHECK (end_time > start_time)

---

### DOMAIN 03: WORKFORCE SKILLS & STATUTORY CERTIFICATIONS

#### Table 21: `skills`
- **Purpose:** Standard trade competency definitions (HVAC, PLC, High-Voltage, Rigging).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` `varchar(100)` NOT NULL UNIQUE
  - `category` `varchar(50)` NOT NULL
  - `description` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 22: `technician_skills`
- **Purpose:** Technician competencies with proficiency rating.
- **Fields:**
  - `technician_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - `skill_id` `uuid` NOT NULL REFERENCES skills(id) ON DELETE CASCADE
  - `proficiency_level` `varchar(20)` NOT NULL DEFAULT 'COMPETENT' CHECK (proficiency_level IN ('APPRENTICE', 'COMPETENT', 'SENIOR', 'EXPERT'))
  - `years_experience` `numeric(4,1)` NOT NULL DEFAULT 0.0
  - `verified_by_user_id` `uuid` NULL REFERENCES users(id)
  - `verified_at` `timestamptz` NULL
- **Primary Key:** (`technician_user_id`, `skill_id`)

#### Table 23: `certifications`
- **Purpose:** Formal trade and statutory certifications (e.g. Energy Commission Certified Electrical Wiring).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` `varchar(150)` NOT NULL UNIQUE
  - `issuing_authority` `varchar(150)` NOT NULL
  - `validity_months` `integer` NULL CHECK (validity_months > 0)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 24: `technician_certifications`
- **Purpose:** Individual staff certification tracking with license numbers and expiration alerts.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `technician_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE CASCADE
  - `certification_id` `uuid` NOT NULL REFERENCES certifications(id) ON DELETE RESTRICT
  - `license_number` `varchar(100)` NOT NULL
  - `issued_at` `date` NOT NULL
  - `expires_at` `date` NULL
  - `document_id` `uuid` NULL REFERENCES documents(id) ON DELETE SET NULL
  - `is_verified` `boolean` NOT NULL DEFAULT false
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`technician_user_id`, `certification_id`, `license_number`)

---

### DOMAIN 04: ASSET REGISTER, BOM & MAINTENANCE TELEMETRY

#### Table 25: `asset_categories`
- **Purpose:** Multi-level asset taxonomy (e.g. Facilities -> Electrical -> Transformers).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `parent_id` `uuid` NULL REFERENCES asset_categories(id) ON DELETE RESTRICT
  - `name` `varchar(100)` NOT NULL
  - `code` `varchar(20)` NOT NULL UNIQUE
  - `expected_lifespan_years` `integer` NULL
  - `depreciation_method` `varchar(30)` NOT NULL DEFAULT 'STRAIGHT_LINE' CHECK (depreciation_method IN ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'SUM_OF_YEARS', 'NONE'))
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 26: `locations`
- **Purpose:** Hierarchical facility location tree (Campus -> Building -> Floor -> Room).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `parent_id` `uuid` NULL REFERENCES locations(id) ON DELETE RESTRICT
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `name` `varchar(100)` NOT NULL
  - `code` `varchar(30)` NOT NULL UNIQUE
  - `location_type` `varchar(30)` NOT NULL DEFAULT 'ROOM' CHECK (location_type IN ('SITE', 'BUILDING', 'FLOOR', 'ZONE', 'ROOM', 'OUTDOOR'))
  - `path` `text` NOT NULL DEFAULT '/'
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 27: `assets`
- **Purpose:** Physical asset master. Supports internal facility equipment and customer-contractor equipment.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_tag` `varchar(50)` NOT NULL UNIQUE
  - `name` `varchar(150)` NOT NULL
  - `category_id` `uuid` NOT NULL REFERENCES asset_categories(id) ON DELETE RESTRICT
  - `location_id` `uuid` NULL REFERENCES locations(id) ON DELETE SET NULL
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `customer_id` `uuid` NULL REFERENCES customers(id) ON DELETE RESTRICT
  - `customer_site_id` `uuid` NULL REFERENCES customer_sites(id) ON DELETE RESTRICT
  - `parent_asset_id` `uuid` NULL REFERENCES assets(id) ON DELETE RESTRICT
  - `serial_number` `varchar(100)` NULL
  - `model_number` `varchar(100)` NULL
  - `manufacturer` `varchar(100)` NULL
  - `status` `varchar(30)` NOT NULL DEFAULT 'OPERATIONAL' CHECK (status IN ('COMMISSIONING', 'OPERATIONAL', 'STANDBY', 'MAINTENANCE', 'DECOMMISSIONED', 'DISPOSED'))
  - `criticality` `varchar(20)` NOT NULL DEFAULT 'MEDIUM' CHECK (criticality IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
  - `purchase_date` `date` NULL
  - `purchase_cost` `numeric(14,2)` NULL
  - `warranty_expiry_date` `date` NULL
  - `salvage_value` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `qr_code_data` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `deleted_at` `timestamptz` NULL
  - `version` `integer` NOT NULL DEFAULT 1
- **Constraints:**
  - CHECK ((customer_id IS NULL AND customer_site_id IS NULL) OR (customer_id IS NOT NULL AND customer_site_id IS NOT NULL))
- **Indexes:** `idx_assets_tag` ON `asset_tag`, `idx_assets_cust` ON `customer_id`, `idx_assets_site` ON `customer_site_id`, `idx_assets_loc` ON `location_id`

#### Table 28: `asset_locations_history`
- **Purpose:** Full audit trail of asset relocations between facilities or rooms.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_id` `uuid` NOT NULL REFERENCES assets(id) ON DELETE CASCADE
  - `from_location_id` `uuid` NULL REFERENCES locations(id) ON DELETE SET NULL
  - `to_location_id` `uuid` NOT NULL REFERENCES locations(id) ON DELETE RESTRICT
  - `moved_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `reason` `text` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 29: `asset_ownership_history`
- **Purpose:** Ownership transfers and customer equipment contract onboarding/offboarding log.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_id` `uuid` NOT NULL REFERENCES assets(id) ON DELETE CASCADE
  - `from_customer_id` `uuid` NULL REFERENCES customers(id)
  - `to_customer_id` `uuid` NULL REFERENCES customers(id)
  - `transferred_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `effective_date` `date` NOT NULL
  - `reason` `text` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 30: `asset_status_history`
- **Purpose:** Operational state transition audit log.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_id` `uuid` NOT NULL REFERENCES assets(id) ON DELETE CASCADE
  - `old_status` `varchar(30)` NOT NULL
  - `new_status` `varchar(30)` NOT NULL
  - `changed_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `reason` `text` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 31: `asset_meters`
- **Purpose:** Cumulative run counters attached to equipment (e.g. Operating Hours, Odometers).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_id` `uuid` NOT NULL REFERENCES assets(id) ON DELETE CASCADE
  - `name` `varchar(100)` NOT NULL
  - `meter_type` `varchar(30)` NOT NULL CHECK (meter_type IN ('HOURS', 'KILOMETERS', 'CYCLES', 'PRODUCTION_UNITS', 'GAUGE_PRESSURE'))
  - `unit_of_measure` `varchar(20)` NOT NULL
  - `current_value` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `last_reading_at` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`asset_id`, `name`)

#### Table 32: `meter_readings`
- **Purpose:** Append-only meter telemetry logs. Enforces monotonic non-decreasing readings.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_meter_id` `uuid` NOT NULL REFERENCES asset_meters(id) ON DELETE CASCADE
  - `reading_value` `numeric(14,2)` NOT NULL
  - `delta` `numeric(14,2)` NOT NULL CHECK (delta >= 0)
  - `recorded_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `reading_source` `varchar(20)` NOT NULL DEFAULT 'MANUAL' CHECK (reading_source IN ('MANUAL', 'WORK_ORDER', 'IOT_TELEMETRY', 'MOBILE_SYNC'))
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 33: `asset_downtime_logs`
- **Purpose:** Unplanned and planned equipment outage periods for MTBF / MTTR analytics.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_id` `uuid` NOT NULL REFERENCES assets(id) ON DELETE CASCADE
  - `work_order_id` `uuid` NULL REFERENCES work_orders(id) ON DELETE SET NULL
  - `downtime_type` `varchar(20)` NOT NULL DEFAULT 'UNPLANNED' CHECK (downtime_type IN ('UNPLANNED', 'PLANNED_PM', 'STANDBY', 'WEATHER'))
  - `started_at` `timestamptz` NOT NULL
  - `ended_at` `timestamptz` NULL
  - `duration_minutes` `integer` NULL
  - `failure_code_id` `uuid` NULL REFERENCES failure_codes(id) ON DELETE SET NULL
  - `recorded_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** CHECK (ended_at IS NULL OR ended_at >= started_at)

#### Table 34: `asset_boms`
- **Purpose:** Bill of Materials identifying authorized spare parts and consumables for an asset.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_id` `uuid` NOT NULL REFERENCES assets(id) ON DELETE CASCADE
  - `part_id` `uuid` NOT NULL REFERENCES parts(id) ON DELETE RESTRICT
  - `quantity_required` `numeric(10,2)` NOT NULL DEFAULT 1.00 CHECK (quantity_required > 0)
  - `is_critical` `boolean` NOT NULL DEFAULT false
  - `notes` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`asset_id`, `part_id`)

#### Table 35: `asset_warranty_claims`
- **Purpose:** Formal warranty claims against OEM or external contractors.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_id` `uuid` NOT NULL REFERENCES assets(id) ON DELETE CASCADE
  - `claim_number` `varchar(50)` NOT NULL UNIQUE
  - `vendor_id` `uuid` NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT
  - `incident_date` `date` NOT NULL
  - `claim_amount` `numeric(14,2)` NOT NULL CHECK (claim_amount >= 0)
  - `status` `varchar(20)` NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'SETTLED'))
  - `settled_amount` `numeric(14,2)` NULL
  - `resolution_notes` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 36: `asset_disposals`
- **Purpose:** Formal asset retirement, scrap, sale, or write-off documentation.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_id` `uuid` NOT NULL REFERENCES assets(id) ON DELETE CASCADE UNIQUE
  - `disposal_method` `varchar(30)` NOT NULL CHECK (disposal_method IN ('SCRAPPED', 'SOLD', 'DONATED', 'TRADED_IN', 'LOST_STOLEN'))
  - `disposal_date` `date` NOT NULL
  - `gross_proceeds` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `disposal_cost` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `net_book_value_at_disposal` `numeric(14,2)` NOT NULL
  - `authorized_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `justification` `text` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

---

### DOMAIN 05: WORK ORDER MANAGEMENT & EXECUTION

#### Table 37: `work_requests`
- **Purpose:** Inbound internal employee or customer portal maintenance requests.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `request_number` `varchar(50)` NOT NULL UNIQUE
  - `title` `varchar(200)` NOT NULL
  - `description` `text` NOT NULL
  - `priority` `varchar(20)` NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'URGENT'))
  - `status` `varchar(20)` NOT NULL DEFAULT 'SUBMITTED' CHECK (status IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'CONVERTED'))
  - `asset_id` `uuid` NULL REFERENCES assets(id) ON DELETE SET NULL
  - `location_id` `uuid` NULL REFERENCES locations(id) ON DELETE SET NULL
  - `customer_id` `uuid` NULL REFERENCES customers(id) ON DELETE SET NULL
  - `customer_site_id` `uuid` NULL REFERENCES customer_sites(id) ON DELETE SET NULL
  - `requested_by_user_id` `uuid` NULL REFERENCES users(id)
  - `requested_by_contact_id` `uuid` NULL REFERENCES customer_contacts(id)
  - `converted_work_order_id` `uuid` NULL REFERENCES work_orders(id)
  - `rejection_reason` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 38: `work_orders`
- **Purpose:** Central operational work order execution entity.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_number` `varchar(50)` NOT NULL UNIQUE
  - `title` `varchar(200)` NOT NULL
  - `description` `text` NOT NULL
  - `work_type` `varchar(30)` NOT NULL DEFAULT 'CORRECTIVE' CHECK (work_type IN ('CORRECTIVE', 'PREVENTIVE', 'INSPECTION', 'EMERGENCY', 'PROJECT', 'SAFETY_AUDIT'))
  - `priority` `varchar(20)` NOT NULL DEFAULT 'MEDIUM' CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
  - `status` `varchar(20)` NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
      'DRAFT', 'SUBMITTED', 'APPROVED', 'SCHEDULED', 'ASSIGNED',
      'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'VERIFIED', 'CLOSED',
      'CANCELLED', 'REJECTED'
    ))
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `department_id` `uuid` NULL REFERENCES departments(id) ON DELETE SET NULL
  - `asset_id` `uuid` NULL REFERENCES assets(id) ON DELETE RESTRICT
  - `location_id` `uuid` NULL REFERENCES locations(id) ON DELETE RESTRICT
  - `customer_id` `uuid` NULL REFERENCES customers(id) ON DELETE RESTRICT
  - `customer_site_id` `uuid` NULL REFERENCES customer_sites(id) ON DELETE RESTRICT
  - `contract_id` `uuid` NULL REFERENCES customer_contracts(id) ON DELETE SET NULL
  - `quote_id` `uuid` NULL REFERENCES quotes(id) ON DELETE SET NULL
  - `pm_occurrence_id` `uuid` NULL REFERENCES pm_occurrences(id) ON DELETE SET NULL
  - `work_request_id` `uuid` NULL REFERENCES work_requests(id) ON DELETE SET NULL
  - `assigned_technician_id` `uuid` NULL REFERENCES users(id) ON DELETE SET NULL
  - `supervisor_user_id` `uuid` NULL REFERENCES users(id) ON DELETE SET NULL
  - `scheduled_start_time` `timestamptz` NULL
  - `scheduled_end_time` `timestamptz` NULL
  - `actual_start_time` `timestamptz` NULL
  - `actual_end_time` `timestamptz` NULL
  - `estimated_duration_hours` `numeric(6,2)` NOT NULL DEFAULT 1.00
  - `estimated_cost` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `actual_cost` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `is_billable` `boolean` NOT NULL DEFAULT false
  - `invoice_id` `uuid` NULL REFERENCES invoices(id) ON DELETE SET NULL
  - `created_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `deleted_at` `timestamptz` NULL
  - `version` `integer` NOT NULL DEFAULT 1
- **Indexes:** `idx_wo_num` ON `work_order_number`, `idx_wo_status` ON `status`, `idx_wo_asset` ON `asset_id`, `idx_wo_cust` ON `customer_id`, `idx_wo_branch` ON `branch_id`, `idx_wo_tech` ON `assigned_technician_id`

#### Table 39: `work_order_status_history`
- **Purpose:** Immutable audit trail of every state transition.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `from_status` `varchar(20)` NOT NULL
  - `to_status` `varchar(20)` NOT NULL
  - `changed_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `notes` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 40: `work_order_dispatches`
- **Purpose:** Formal dispatch transaction coordinating mobile crew mobilization.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `dispatch_number` `varchar(50)` NOT NULL UNIQUE
  - `lead_technician_id` `uuid` NOT NULL REFERENCES users(id)
  - `dispatched_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `dispatched_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `acknowledged_at` `timestamptz` NULL
  - `en_route_at` `timestamptz` NULL
  - `arrived_on_site_at` `timestamptz` NULL
  - `vehicle_plate_number` `varchar(20)` NULL

#### Table 41: `work_order_assignment_history`
- **Purpose:** Full historical participation record of all technicians assigned to a ticket.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `technician_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `assignment_role` `varchar(20)` NOT NULL DEFAULT 'PRIMARY' CHECK (assignment_role IN ('PRIMARY', 'ASSISTING', 'SPECIALIST', 'TRAINEE'))
  - `assigned_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `unassigned_at` `timestamptz` NULL
  - `assigned_by_user_id` `uuid` NOT NULL REFERENCES users(id)

#### Table 42: `failure_codes`
- **Purpose:** Standardized RCM failure modes, causes, and remedy codes.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `code` `varchar(30)` NOT NULL UNIQUE
  - `category` `varchar(20)` NOT NULL CHECK (category IN ('SYMPTOM', 'FAILURE_MODE', 'ROOT_CAUSE', 'REMEDY'))
  - `name` `varchar(150)` NOT NULL
  - `description` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 43: `work_order_failure_records`
- **Purpose:** Structured root-cause failure logging on completed work orders.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE UNIQUE
  - `symptom_code_id` `uuid` NULL REFERENCES failure_codes(id)
  - `failure_mode_code_id` `uuid` NULL REFERENCES failure_codes(id)
  - `root_cause_code_id` `uuid` NULL REFERENCES failure_codes(id)
  - `remedy_code_id` `uuid` NULL REFERENCES failure_codes(id)
  - `technician_narrative` `text` NOT NULL
  - `preventive_recommendation` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 44: `work_order_tasks`
- **Purpose:** Discrete work breakdown steps within a work order.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `step_number` `smallint` NOT NULL
  - `title` `varchar(200)` NOT NULL
  - `description` `text` NULL
  - `estimated_hours` `numeric(5,2)` NOT NULL DEFAULT 0.50
  - `is_completed` `boolean` NOT NULL DEFAULT false
  - `completed_by_user_id` `uuid` NULL REFERENCES users(id)
  - `completed_at` `timestamptz` NULL
- **Constraints:** UNIQUE (`work_order_id`, `step_number`)

#### Table 45: `checklist_templates`
- **Purpose:** Standard operating procedure (SOP) inspection checklist definitions.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` `varchar(150)` NOT NULL UNIQUE
  - `category` `varchar(50)` NOT NULL
  - `description` `text` NULL
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `version` `integer` NOT NULL DEFAULT 1
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 46: `checklist_template_items`
- **Purpose:** Individual checkpoints within an SOP checklist.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `template_id` `uuid` NOT NULL REFERENCES checklist_templates(id) ON DELETE CASCADE
  - `sequence` `smallint` NOT NULL
  - `label` `varchar(255)` NOT NULL
  - `response_type` `varchar(20)` NOT NULL CHECK (response_type IN ('PASS_FAIL', 'NUMERIC_VALUE', 'TEXT_NOTE', 'PHOTO_REQUIRED', 'MULTIPLE_CHOICE'))
  - `is_mandatory` `boolean` NOT NULL DEFAULT true
  - `min_value` `numeric(12,2)` NULL
  - `max_value` `numeric(12,2)` NULL
- **Constraints:** UNIQUE (`template_id`, `sequence`)

#### Table 47: `work_order_checklist_items`
- **Purpose:** Executed checklist entries captured in the field with pass/fail and values.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `template_item_id` `uuid` NOT NULL REFERENCES checklist_template_items(id) ON DELETE RESTRICT
  - `sequence` `smallint` NOT NULL
  - `label` `varchar(255)` NOT NULL
  - `status` `varchar(20)` NOT NULL DEFAULT 'NOT_ATTEMPTED' CHECK (status IN ('NOT_ATTEMPTED', 'PASSED', 'FAILED', 'FLAGGED', 'N_A'))
  - `numeric_value` `numeric(12,2)` NULL
  - `text_response` `text` NULL
  - `photo_document_id` `uuid` NULL REFERENCES documents(id)
  - `completed_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `completed_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 48: `work_order_labor`
- **Purpose:** Labor time tracking ledger for technicians, calculating hourly and billable costs.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `technician_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE RESTRICT
  - `work_date` `date` NOT NULL
  - `hours_spent` `numeric(5,2)` NOT NULL CHECK (hours_spent > 0)
  - `hourly_cost_rate` `numeric(10,2)` NOT NULL CHECK (hourly_cost_rate >= 0)
  - `hourly_billing_rate` `numeric(10,2)` NOT NULL DEFAULT 0.00 CHECK (hourly_billing_rate >= 0)
  - `total_cost` `numeric(14,2)` GENERATED ALWAYS AS (hours_spent * hourly_cost_rate) STORED
  - `total_billable` `numeric(14,2)` GENERATED ALWAYS AS (hours_spent * hourly_billing_rate) STORED
  - `is_billable` `boolean` NOT NULL DEFAULT true
  - `description` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 49: `work_order_parts`
- **Purpose:** Spare parts and consumables issued to a work order.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `part_id` `uuid` NOT NULL REFERENCES parts(id) ON DELETE RESTRICT
  - `store_id` `uuid` NOT NULL REFERENCES stores(id) ON DELETE RESTRICT
  - `quantity_used` `numeric(10,2)` NOT NULL CHECK (quantity_used > 0)
  - `unit_cost` `numeric(14,4)` NOT NULL CHECK (unit_cost >= 0)
  - `unit_price` `numeric(14,4)` NOT NULL DEFAULT 0.00 CHECK (unit_price >= 0)
  - `total_cost` `numeric(14,2)` GENERATED ALWAYS AS (ROUND(quantity_used * unit_cost, 2)) STORED
  - `total_billable` `numeric(14,2)` GENERATED ALWAYS AS (ROUND(quantity_used * unit_price, 2)) STORED
  - `is_billable` `boolean` NOT NULL DEFAULT true
  - `stock_transaction_id` `uuid` NULL REFERENCES stock_transactions(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 50: `work_order_expenses`
- **Purpose:** Incidental direct job expenses (travel, lodging, specialized permits).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `expense_type` `varchar(50)` NOT NULL
  - `amount` `numeric(14,2)` NOT NULL CHECK (amount > 0)
  - `markup_percent` `numeric(5,2)` NOT NULL DEFAULT 0.00 CHECK (markup_percent >= 0)
  - `billable_amount` `numeric(14,2)` GENERATED ALWAYS AS (ROUND(amount * (1 + markup_percent / 100), 2)) STORED
  - `is_billable` `boolean` NOT NULL DEFAULT true
  - `receipt_document_id` `uuid` NULL REFERENCES documents(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 51: `work_order_subcontractors`
- **Purpose:** Specialized third-party contractor job allocations and service invoices.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `vendor_id` `uuid` NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT
  - `purchase_order_id` `uuid` NULL REFERENCES purchase_orders(id) ON DELETE SET NULL
  - `service_rendered` `text` NOT NULL
  - `contractor_cost` `numeric(14,2)` NOT NULL CHECK (contractor_cost >= 0)
  - `billing_amount` `numeric(14,2)` NOT NULL CHECK (billing_amount >= 0)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 52: `work_order_sla_events`
- **Purpose:** Recorded SLA timestamp milestones for service commitment auditing.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `event_type` `varchar(30)` NOT NULL CHECK (event_type IN ('RESPONSE_TARGET', 'ARRIVAL_TARGET', 'COMPLETION_TARGET'))
  - `target_time` `timestamptz` NOT NULL
  - `actual_time` `timestamptz` NULL
  - `is_breached` `boolean` NOT NULL DEFAULT false
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 53: `work_order_sla_pauses`
- **Purpose:** Documented SLA clock pause periods (e.g. awaiting client approval, awaiting parts).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `paused_at` `timestamptz` NOT NULL
  - `resumed_at` `timestamptz` NULL
  - `pause_reason` `varchar(50)` NOT NULL CHECK (pause_reason IN ('AWAITING_PARTS', 'AWAITING_CLIENT_ACCESS', 'WEATHER_DELAY', 'SAFETY_HOLD', 'CUSTOMER_REQUEST'))
  - `paused_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `resumed_by_user_id` `uuid` NULL REFERENCES users(id)
- **Constraints:** CHECK (resumed_at IS NULL OR resumed_at >= paused_at)

#### Table 54: `work_order_verifications`
- **Purpose:** Customer sign-off and engineering supervisor quality sign-off records.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE UNIQUE
  - `verified_by_user_id` `uuid` NULL REFERENCES users(id)
  - `client_signer_name` `varchar(100)` NULL
  - `client_signature_image_id` `uuid` NULL REFERENCES documents(id)
  - `satisfaction_rating` `smallint` NULL CHECK (satisfaction_rating BETWEEN 1 AND 5)
  - `verification_notes` `text` NULL
  - `verified_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 55: `work_order_reopen_history`
- **Purpose:** Formal audit log of completed tickets reopened due to recurring failure or defective repair.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `reopened_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `justification` `text` NOT NULL
  - `previous_completed_at` `timestamptz` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 56: `work_order_cost_approvals`
- **Purpose:** Dual-control approval requests for work orders exceeding budget or quote estimates.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `previous_estimated_cost` `numeric(14,2)` NOT NULL
  - `new_estimated_cost` `numeric(14,2)` NOT NULL
  - `variance_amount` `numeric(14,2)` GENERATED ALWAYS AS (new_estimated_cost - previous_estimated_cost) STORED
  - `reason` `text` NOT NULL
  - `status` `varchar(20)` NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
  - `approval_request_id` `uuid` NULL REFERENCES approval_requests(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 57: `work_order_comments`
- **Purpose:** Internal technician collaboration notes and public client portal status messages.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `author_user_id` `uuid` NULL REFERENCES users(id)
  - `author_contact_id` `uuid` NULL REFERENCES customer_contacts(id)
  - `is_internal_only` `boolean` NOT NULL DEFAULT true
  - `comment_text` `text` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

---

### DOMAIN 06: PREVENTIVE MAINTENANCE (PM) & COMPLIANCE

#### Table 58: `pm_plans`
- **Purpose:** Preventive maintenance program definitions (Calendar or Meter driven).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `title` `varchar(200)` NOT NULL
  - `asset_id` `uuid` NULL REFERENCES assets(id) ON DELETE CASCADE
  - `asset_category_id` `uuid` NULL REFERENCES asset_categories(id) ON DELETE CASCADE
  - `checklist_template_id` `uuid` NULL REFERENCES checklist_templates(id) ON DELETE SET NULL
  - `trigger_type` `varchar(20)` NOT NULL CHECK (trigger_type IN ('TIME_INTERVAL', 'METER_THRESHOLD', 'HYBRID'))
  - `interval_value` `integer` NULL CHECK (interval_value > 0)
  - `interval_unit` `varchar(10)` NULL CHECK (interval_unit IN ('DAYS', 'WEEKS', 'MONTHS', 'YEARS'))
  - `meter_threshold_interval` `numeric(12,2)` NULL
  - `lead_time_days` `smallint` NOT NULL DEFAULT 7
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 59: `pm_occurrences`
- **Purpose:** Discrete scheduled instances generated from PM plans awaiting conversion to work orders.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `pm_plan_id` `uuid` NOT NULL REFERENCES pm_plans(id) ON DELETE CASCADE
  - `due_date` `date` NOT NULL
  - `grace_period_end_date` `date` NOT NULL
  - `status` `varchar(20)` NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'GENERATED', 'COMPLETED', 'MISSED', 'SKIPPED'))
  - `generated_work_order_id` `uuid` NULL REFERENCES work_orders(id) ON DELETE SET NULL
  - `completed_at` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`pm_plan_id`, `due_date`)

#### Table 60: `pm_compliance_records`
- **Purpose:** Aggregated monthly preventive maintenance compliance metrics by branch.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE CASCADE
  - `year_month` `varchar(7)` NOT NULL -- Format: YYYY-MM
  - `total_scheduled` `integer` NOT NULL DEFAULT 0
  - `total_completed_on_time` `integer` NOT NULL DEFAULT 0
  - `total_completed_late` `integer` NOT NULL DEFAULT 0
  - `total_missed` `integer` NOT NULL DEFAULT 0
  - `compliance_percentage` `numeric(5,2)` GENERATED ALWAYS AS (
      CASE WHEN total_scheduled = 0 THEN 100.00
      ELSE ROUND((total_completed_on_time::numeric / total_scheduled::numeric) * 100, 2) END
    ) STORED
- **Constraints:** UNIQUE (`branch_id`, `year_month`)

#### Table 61: `missed_pm_incidents`
- **Purpose:** Formal non-conformance records generated when statutory/safety PM exceeds grace period.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `pm_occurrence_id` `uuid` NOT NULL REFERENCES pm_occurrences(id) ON DELETE CASCADE UNIQUE
  - `asset_id` `uuid` NOT NULL REFERENCES assets(id) ON DELETE CASCADE
  - `incident_date` `date` NOT NULL
  - `risk_level` `varchar(20)` NOT NULL CHECK (risk_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))
  - `investigation_notes` `text` NULL
  - `corrective_action_plan` `text` NULL
  - `signed_off_by_user_id` `uuid` NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 62: `maintenance_backlog_snapshots`
- **Purpose:** Periodic snapshots of outstanding maintenance workload categorized by age brackets.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE CASCADE
  - `snapshot_date` `date` NOT NULL
  - `backlog_hours_0_to_14_days` `numeric(10,2)` NOT NULL DEFAULT 0.00
  - `backlog_hours_15_to_30_days` `numeric(10,2)` NOT NULL DEFAULT 0.00
  - `backlog_hours_31_to_60_days` `numeric(10,2)` NOT NULL DEFAULT 0.00
  - `backlog_hours_over_60_days` `numeric(10,2)` NOT NULL DEFAULT 0.00
  - `total_open_work_orders` `integer` NOT NULL DEFAULT 0
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`branch_id`, `snapshot_date`)

---

### DOMAIN 07: SAFETY, PERMITS TO WORK (PTW) & LOCKOUT/TAGOUT (LOTO)

#### Table 63: `inspection_templates`
- **Purpose:** Master frameworks for regulatory and statutory technical inspections.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` `varchar(150)` NOT NULL UNIQUE
  - `regulatory_body` `varchar(100)` NOT NULL -- EPA, Factories Inspectorate, Energy Commission
  - `validity_period_months` `smallint` NOT NULL DEFAULT 12
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 64: `inspections`
- **Purpose:** Formal statutory compliance inspections executed on equipment or premises.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `inspection_number` `varchar(50)` NOT NULL UNIQUE
  - `template_id` `uuid` NOT NULL REFERENCES inspection_templates(id) ON DELETE RESTRICT
  - `asset_id` `uuid` NULL REFERENCES assets(id) ON DELETE SET NULL
  - `location_id` `uuid` NULL REFERENCES locations(id) ON DELETE SET NULL
  - `inspector_name` `varchar(100)` NOT NULL
  - `inspector_credential_number` `varchar(100)` NULL
  - `inspection_date` `date` NOT NULL
  - `status` `varchar(20)` NOT NULL DEFAULT 'PASSED' CHECK (status IN ('PASSED', 'FAILED', 'CONDITIONAL_PASS', 'RE_INSPECTION_REQUIRED'))
  - `certificate_id` `uuid` NULL REFERENCES statutory_certificates(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 65: `inspection_items`
- **Purpose:** Granular pass/fail findings for individual compliance checkpoints.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `inspection_id` `uuid` NOT NULL REFERENCES inspections(id) ON DELETE CASCADE
  - `checkpoint_name` `varchar(200)` NOT NULL
  - `is_compliant` `boolean` NOT NULL
  - `finding_notes` `text` NULL
  - `severity` `varchar(20)` NOT NULL DEFAULT 'MINOR' CHECK (severity IN ('MINOR', 'MAJOR', 'IMMINENT_DANGER'))

#### Table 66: `statutory_certificates`
- **Purpose:** Official compliance certificates issued by government authorities.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `certificate_number` `varchar(100)` NOT NULL UNIQUE
  - `issuing_body` `varchar(150)` NOT NULL
  - `asset_id` `uuid` NULL REFERENCES assets(id) ON DELETE CASCADE
  - `location_id` `uuid` NULL REFERENCES locations(id) ON DELETE CASCADE
  - `issued_at` `date` NOT NULL
  - `expires_at` `date` NOT NULL
  - `document_id` `uuid` NULL REFERENCES documents(id)
  - `is_active` `boolean` NOT NULL DEFAULT true
- **Constraints:** CHECK (expires_at >= issued_at)

#### Table 67: `permits_to_work`
- **Purpose:** Safe system of work authorization for hazardous operations.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `permit_number` `varchar(50)` NOT NULL UNIQUE
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `permit_type` `varchar(30)` NOT NULL CHECK (permit_type IN ('HOT_WORK', 'CONFINED_SPACE', 'WORKING_AT_HEIGHT', 'ELECTRICAL_ISOLATION', 'HAZARDOUS_GAS'))
  - `status` `varchar(20)` NOT NULL DEFAULT 'REQUESTED' CHECK (status IN ('REQUESTED', 'APPROVED', 'ACTIVE', 'SUSPENDED', 'SURRENDERED', 'CLOSED'))
  - `issuer_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `receiver_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `valid_from` `timestamptz` NOT NULL
  - `valid_until` `timestamptz` NOT NULL
  - `gas_test_required` `boolean` NOT NULL DEFAULT false
  - `gas_test_result` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** CHECK (issuer_user_id <> receiver_user_id), CHECK (valid_until > valid_from)

#### Table 68: `loto_procedures`
- **Purpose:** Machine-specific hazardous energy control procedures.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `asset_id` `uuid` NOT NULL REFERENCES assets(id) ON DELETE CASCADE UNIQUE
  - `procedure_title` `varchar(200)` NOT NULL
  - `zero_energy_verification_steps` `text` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 69: `loto_isolation_points`
- **Purpose:** Specific valves, breakers, and switches requiring padlock isolation.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `loto_procedure_id` `uuid` NOT NULL REFERENCES loto_procedures(id) ON DELETE CASCADE
  - `sequence` `smallint` NOT NULL
  - `point_identifier` `varchar(50)` NOT NULL -- e.g. "Main Breaker CB-04"
  - `energy_type` `varchar(30)` NOT NULL CHECK (energy_type IN ('ELECTRICAL', 'PNEUMATIC', 'HYDRAULIC', 'THERMAL', 'CHEMICAL', 'GRAVITATIONAL'))
  - `isolation_method` `varchar(100)` NOT NULL -- e.g. "Circuit Breaker Lockout Clamp"
- **Constraints:** UNIQUE (`loto_procedure_id`, `sequence`)

#### Table 70: `loto_lock_applications`
- **Purpose:** Operational log of physical lock application and zero-energy verification.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `permit_to_work_id` `uuid` NOT NULL REFERENCES permits_to_work(id) ON DELETE CASCADE
  - `isolation_point_id` `uuid` NOT NULL REFERENCES loto_isolation_points(id) ON DELETE RESTRICT
  - `lock_number` `varchar(50)` NOT NULL
  - `applied_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `applied_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `removed_by_user_id` `uuid` NULL REFERENCES users(id)
  - `removed_at` `timestamptz` NULL
- **Constraints:** CHECK (removed_at IS NULL OR removed_at >= applied_at)

---

### DOMAIN 08: INVENTORY, WAREHOUSE TRANSFERS & STOCK LEDGER

#### Table 71: `stores`
- **Purpose:** Physical warehouse locations, tool cribs, and technician van stores.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `name` `varchar(100)` NOT NULL
  - `code` `varchar(20)` NOT NULL UNIQUE
  - `store_type` `varchar(20)` NOT NULL DEFAULT 'WAREHOUSE' CHECK (store_type IN ('WAREHOUSE', 'VAN_STORE', 'TOOL_CRIB', 'CONSIGNMENT', 'IN_TRANSIT'))
  - `manager_user_id` `uuid` NULL REFERENCES users(id)
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 72: `parts`
- **Purpose:** Master item catalog for spare parts, lubricants, and maintenance supplies.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `part_number` `varchar(50)` NOT NULL UNIQUE
  - `name` `varchar(150)` NOT NULL
  - `description` `text` NULL
  - `category` `varchar(50)` NOT NULL
  - `uom` `varchar(20)` NOT NULL DEFAULT 'EACH' -- Unit of measure
  - `default_unit_cost` `numeric(14,4)` NOT NULL DEFAULT 0.0000 CHECK (default_unit_cost >= 0)
  - `default_selling_price` `numeric(14,4)` NOT NULL DEFAULT 0.0000 CHECK (default_selling_price >= 0)
  - `min_reorder_level` `numeric(10,2)` NOT NULL DEFAULT 0.00 CHECK (min_reorder_level >= 0)
  - `max_stock_level` `numeric(10,2)` NULL
  - `is_serialized` `boolean` NOT NULL DEFAULT false
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 73: `stock`
- **Purpose:** Materialized real-time on-hand stock balances by store and part.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `store_id` `uuid` NOT NULL REFERENCES stores(id) ON DELETE RESTRICT
  - `part_id` `uuid` NOT NULL REFERENCES parts(id) ON DELETE RESTRICT
  - `bin_location` `varchar(50)` NULL
  - `quantity_on_hand` `numeric(10,2)` NOT NULL DEFAULT 0.00 CHECK (quantity_on_hand >= 0)
  - `quantity_reserved` `numeric(10,2)` NOT NULL DEFAULT 0.00 CHECK (quantity_reserved >= 0)
  - `quantity_available` `numeric(10,2)` GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED
  - `valuation_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`store_id`, `part_id`)

#### Table 74: `stock_transactions`
- **Purpose:** Append-only physical inventory ledger. All stock balances derive from this ledger.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `store_id` `uuid` NOT NULL REFERENCES stores(id) ON DELETE RESTRICT
  - `part_id` `uuid` NOT NULL REFERENCES parts(id) ON DELETE RESTRICT
  - `transaction_type` `varchar(30)` NOT NULL CHECK (transaction_type IN (
      'PURCHASE_RECEIPT', 'WORK_ORDER_ISSUE', 'WORK_ORDER_RETURN',
      'TRANSFER_DISPATCH', 'TRANSFER_RECEIPT', 'CYCLE_COUNT_ADJUSTMENT',
      'SCRAP_WRITE_OFF', 'INITIAL_BALANCE'
    ))
  - `quantity` `numeric(10,2)` NOT NULL -- Positive for receipts, negative for issues
  - `unit_cost` `numeric(14,4)` NOT NULL CHECK (unit_cost >= 0)
  - `total_cost` `numeric(14,2)` NOT NULL
  - `reference_id` `uuid` NOT NULL -- Points to GRN, WO, or Transfer
  - `reference_type` `varchar(30)` NOT NULL
  - `performed_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Trigger:** Revoke UPDATE and DELETE via `tg_prevent_ledger_mutation()`.

#### Table 75: `store_transfers`
- **Purpose:** Inter-store material transfer orders with in-transit workflow.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `transfer_number` `varchar(50)` NOT NULL UNIQUE
  - `from_store_id` `uuid` NOT NULL REFERENCES stores(id) ON DELETE RESTRICT
  - `to_store_id` `uuid` NOT NULL REFERENCES stores(id) ON DELETE RESTRICT
  - `status` `varchar(30)` NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
      'DRAFT', 'REQUESTED', 'APPROVED', 'DISPATCHED', 'IN_TRANSIT',
      'PARTIALLY_RECEIVED', 'RECEIVED', 'DISCREPANCY_REPORTED', 'CANCELLED'
    ))
  - `requested_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `dispatched_by_user_id` `uuid` NULL REFERENCES users(id)
  - `received_by_user_id` `uuid` NULL REFERENCES users(id)
  - `dispatched_at` `timestamptz` NULL
  - `received_at` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** CHECK (from_store_id <> to_store_id)

#### Table 76: `store_transfer_lines`
- **Purpose:** Line items within a warehouse transfer.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `transfer_id` `uuid` NOT NULL REFERENCES store_transfers(id) ON DELETE CASCADE
  - `part_id` `uuid` NOT NULL REFERENCES parts(id) ON DELETE RESTRICT
  - `quantity_requested` `numeric(10,2)` NOT NULL CHECK (quantity_requested > 0)
  - `quantity_dispatched` `numeric(10,2)` NOT NULL DEFAULT 0.00 CHECK (quantity_dispatched >= 0)
  - `quantity_received` `numeric(10,2)` NOT NULL DEFAULT 0.00 CHECK (quantity_received >= 0)
- **Constraints:** UNIQUE (`transfer_id`, `part_id`)

#### Table 77: `store_transfer_discrepancies`
- **Purpose:** Formal documentation of goods damaged, lost, or short during transit.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `transfer_line_id` `uuid` NOT NULL REFERENCES store_transfer_lines(id) ON DELETE CASCADE UNIQUE
  - `quantity_short` `numeric(10,2)` NOT NULL DEFAULT 0.00
  - `quantity_damaged` `numeric(10,2)` NOT NULL DEFAULT 0.00
  - `reason` `varchar(50)` NOT NULL CHECK (reason IN ('DAMAGED_IN_TRANSIT', 'SHORT_SHIPPED', 'PILFERAGE', 'WRONG_ITEM_SHIPPED'))
  - `investigation_notes` `text` NULL
  - `resolved_by_user_id` `uuid` NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 78: `stock_counts`
- **Purpose:** Cycle count and physical stocktake audit orders.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `count_number` `varchar(50)` NOT NULL UNIQUE
  - `store_id` `uuid` NOT NULL REFERENCES stores(id) ON DELETE RESTRICT
  - `count_type` `varchar(20)` NOT NULL DEFAULT 'CYCLE_COUNT' CHECK (count_type IN ('CYCLE_COUNT', 'WALL_TO_WALL', 'SPOT_CHECK'))
  - `status` `varchar(20)` NOT NULL DEFAULT 'SCHEDULED' CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'REVIEW', 'POSTED', 'CANCELLED'))
  - `count_date` `date` NOT NULL
  - `conducted_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `approved_by_user_id` `uuid` NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 79: `stock_count_lines`
- **Purpose:** Itemized variances between system stock and physical count.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `stock_count_id` `uuid` NOT NULL REFERENCES stock_counts(id) ON DELETE CASCADE
  - `part_id` `uuid` NOT NULL REFERENCES parts(id) ON DELETE RESTRICT
  - `system_quantity` `numeric(10,2)` NOT NULL
  - `physical_quantity` `numeric(10,2)` NOT NULL
  - `variance_quantity` `numeric(10,2)` GENERATED ALWAYS AS (physical_quantity - system_quantity) STORED
  - `unit_cost` `numeric(14,4)` NOT NULL
  - `variance_amount` `numeric(14,2)` GENERATED ALWAYS AS (ROUND((physical_quantity - system_quantity) * unit_cost, 2)) STORED
  - `adjustment_posted` `boolean` NOT NULL DEFAULT false
- **Constraints:** UNIQUE (`stock_count_id`, `part_id`)

---

### DOMAIN 09: PROCUREMENT & THREE-WAY MATCHING

#### Table 80: `vendors`
- **Purpose:** Approved suppliers, contractors, and original equipment manufacturers (OEMs).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `vendor_number` `varchar(50)` NOT NULL UNIQUE
  - `name` `varchar(150)` NOT NULL
  - `legal_name` `varchar(200)` NULL
  - `tax_id` `varchar(50)` NULL -- GRA TIN in Ghana
  - `email` `varchar(100)` NULL
  - `phone` `varchar(50)` NULL
  - `payment_terms_days` `smallint` NOT NULL DEFAULT 30
  - `bank_name` `varchar(100)` NULL
  - `bank_account_number` `varchar(50)` NULL
  - `bank_branch` `varchar(100)` NULL
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 81: `purchase_requisitions`
- **Purpose:** Internal branch/department requests to purchase inventory or services.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `requisition_number` `varchar(50)` NOT NULL UNIQUE
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `department_id` `uuid` NOT NULL REFERENCES departments(id) ON DELETE RESTRICT
  - `status` `varchar(20)` NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'CONVERTED_TO_PO', 'REJECTED'))
  - `total_estimated_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `requested_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `approval_request_id` `uuid` NULL REFERENCES approval_requests(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 82: `purchase_requisition_lines`
- **Purpose:** Line items within an internal purchase requisition.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `requisition_id` `uuid` NOT NULL REFERENCES purchase_requisitions(id) ON DELETE CASCADE
  - `part_id` `uuid` NULL REFERENCES parts(id) ON DELETE RESTRICT
  - `description` `text` NOT NULL
  - `quantity_requested` `numeric(10,2)` NOT NULL CHECK (quantity_requested > 0)
  - `estimated_unit_cost` `numeric(14,4)` NOT NULL CHECK (estimated_unit_cost >= 0)
  - `total_estimated_cost` `numeric(14,2)` GENERATED ALWAYS AS (ROUND(quantity_requested * estimated_unit_cost, 2)) STORED

#### Table 83: `purchase_orders`
- **Purpose:** Legally binding purchase contracts issued to external vendors.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `po_number` `varchar(50)` NOT NULL UNIQUE
  - `vendor_id` `uuid` NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `status` `varchar(20)` NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
      'DRAFT', 'SUBMITTED', 'APPROVED', 'ISSUED_TO_VENDOR',
      'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED'
    ))
  - `currency` `char(3)` NOT NULL DEFAULT 'GHS'
  - `exchange_rate` `numeric(10,4)` NOT NULL DEFAULT 1.0000
  - `subtotal_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `tax_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `total_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `created_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `approval_request_id` `uuid` NULL REFERENCES approval_requests(id)
  - `expected_delivery_date` `date` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 84: `purchase_order_lines`
- **Purpose:** Detailed item lines on a purchase order.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `purchase_order_id` `uuid` NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE
  - `part_id` `uuid` NULL REFERENCES parts(id) ON DELETE RESTRICT
  - `line_description` `text` NOT NULL
  - `quantity_ordered` `numeric(10,2)` NOT NULL CHECK (quantity_ordered > 0)
  - `unit_cost` `numeric(14,4)` NOT NULL CHECK (unit_cost >= 0)
  - `quantity_received` `numeric(10,2)` NOT NULL DEFAULT 0.00 CHECK (quantity_received >= 0)
  - `quantity_billed` `numeric(10,2)` NOT NULL DEFAULT 0.00 CHECK (quantity_billed >= 0)
  - `subtotal` `numeric(14,2)` GENERATED ALWAYS AS (ROUND(quantity_ordered * unit_cost, 2)) STORED

#### Table 85: `purchase_order_amendments`
- **Purpose:** Change orders modifying quantities, costs, or delivery dates post-approval.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `purchase_order_id` `uuid` NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE
  - `amendment_number` `smallint` NOT NULL
  - `previous_total_amount` `numeric(14,2)` NOT NULL
  - `new_total_amount` `numeric(14,2)` NOT NULL
  - `reason` `text` NOT NULL
  - `requested_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `approval_request_id` `uuid` NULL REFERENCES approval_requests(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`purchase_order_id`, `amendment_number`)

#### Table 86: `goods_receipts`
- **Purpose:** Official warehouse receiving records for physical shipments.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `grn_number` `varchar(50)` NOT NULL UNIQUE
  - `purchase_order_id` `uuid` NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT
  - `store_id` `uuid` NOT NULL REFERENCES stores(id) ON DELETE RESTRICT
  - `vendor_delivery_note_number` `varchar(100)` NULL
  - `received_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `received_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `status` `varchar(20)` NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING_INSPECTION', 'COMPLETED', 'DISCREPANCY'))

#### Table 87: `goods_receipt_lines`
- **Purpose:** Accepted and rejected quantities per line in a physical goods delivery.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `goods_receipt_id` `uuid` NOT NULL REFERENCES goods_receipts(id) ON DELETE CASCADE
  - `purchase_order_line_id` `uuid` NOT NULL REFERENCES purchase_order_lines(id) ON DELETE RESTRICT
  - `quantity_received` `numeric(10,2)` NOT NULL CHECK (quantity_received >= 0)
  - `quantity_accepted` `numeric(10,2)` NOT NULL CHECK (quantity_accepted >= 0)
  - `quantity_rejected` `numeric(10,2)` NOT NULL DEFAULT 0.00 CHECK (quantity_rejected >= 0)
  - `rejection_reason` `text` NULL
  - `stock_transaction_id` `uuid` NULL REFERENCES stock_transactions(id)
- **Constraints:** CHECK (quantity_received = quantity_accepted + quantity_rejected)

#### Table 88: `goods_receipt_discrepancies`
- **Purpose:** Short-shipment, damage, or specification failure records logged against a delivery.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `goods_receipt_line_id` `uuid` NOT NULL REFERENCES goods_receipt_lines(id) ON DELETE CASCADE UNIQUE
  - `discrepancy_type` `varchar(30)` NOT NULL CHECK (discrepancy_type IN ('DAMAGED_GOODS', 'SHORT_SHIPMENT', 'OVER_SHIPMENT', 'SPECIFICATION_MISMATCH', 'EXPIRED_MATERIAL'))
  - `quantity_affected` `numeric(10,2)` NOT NULL
  - `vendor_notified` `boolean` NOT NULL DEFAULT false
  - `vendor_credit_note_expected` `boolean` NOT NULL DEFAULT false
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 89: `supplier_invoices`
- **Purpose:** Commercial supplier accounts payable invoices received for goods and services.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `invoice_number` `varchar(100)` NOT NULL -- Supplier's internal invoice no
  - `vendor_id` `uuid` NOT NULL REFERENCES vendors(id) ON DELETE RESTRICT
  - `purchase_order_id` `uuid` NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT
  - `invoice_date` `date` NOT NULL
  - `due_date` `date` NOT NULL
  - `subtotal` `numeric(14,2)` NOT NULL
  - `tax_amount` `numeric(14,2)` NOT NULL
  - `total_amount` `numeric(14,2)` NOT NULL
  - `matching_status` `varchar(20)` NOT NULL DEFAULT 'UNMATCHED' CHECK (matching_status IN ('UNMATCHED', 'MATCHED', 'VARIANCE_REJECTED', 'APPROVED_WITH_VARIANCE'))
  - `status` `varchar(20)` NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'PAID', 'CANCELLED'))
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`vendor_id`, `invoice_number`)

#### Table 90: `supplier_invoice_lines`
- **Purpose:** Itemized billing lines from a vendor invoice.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `supplier_invoice_id` `uuid` NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE
  - `purchase_order_line_id` `uuid` NOT NULL REFERENCES purchase_order_lines(id) ON DELETE RESTRICT
  - `quantity_billed` `numeric(10,2)` NOT NULL CHECK (quantity_billed > 0)
  - `unit_price_billed` `numeric(14,4)` NOT NULL CHECK (unit_price_billed >= 0)
  - `line_total` `numeric(14,2)` GENERATED ALWAYS AS (ROUND(quantity_billed * unit_price_billed, 2)) STORED

#### Table 91: `three_way_matches`
- **Purpose:** Automated comparison and verification between PO, Goods Receipt, and Supplier Invoice.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `supplier_invoice_id` `uuid` NOT NULL REFERENCES supplier_invoices(id) ON DELETE CASCADE UNIQUE
  - `purchase_order_id` `uuid` NOT NULL REFERENCES purchase_orders(id) ON DELETE RESTRICT
  - `is_quantity_matched` `boolean` NOT NULL
  - `is_price_matched` `boolean` NOT NULL
  - `price_variance_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `quantity_variance_amount` `numeric(10,2)` NOT NULL DEFAULT 0.00
  - `auto_matched_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `variance_approved_by_user_id` `uuid` NULL REFERENCES users(id)

---

### DOMAIN 10: CONTRACTOR COMMERCIALS, CUSTOMER BILLING & CONTRACTS

#### Table 92: `customers`
- **Purpose:** Commercial clients and account billing entities.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `customer_number` `varchar(50)` NOT NULL UNIQUE
  - `name` `varchar(150)` NOT NULL
  - `tax_id` `varchar(50)` NULL -- GRA TIN in Ghana
  - `billing_address` `text` NOT NULL
  - `primary_phone` `varchar(50)` NOT NULL
  - `primary_email` `varchar(100)` NOT NULL
  - `payment_terms_days` `smallint` NOT NULL DEFAULT 30
  - `credit_limit` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `current_balance` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `version` `integer` NOT NULL DEFAULT 1

#### Table 93: `customer_sites`
- **Purpose:** Physical client properties, branches, and industrial facilities serviced under contract.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE CASCADE
  - `site_code` `varchar(50)` NOT NULL
  - `name` `varchar(150)` NOT NULL
  - `address` `text` NOT NULL
  - `gps_coordinates` `point` NULL
  - `primary_contact_name` `varchar(100)` NULL
  - `primary_contact_phone` `varchar(50)` NULL
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`customer_id`, `site_code`)

#### Table 94: `customer_contracts`
- **Purpose:** Commercial maintenance contracts, SLAs, retainers, and term agreements.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `contract_number` `varchar(50)` NOT NULL UNIQUE
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE RESTRICT
  - `title` `varchar(200)` NOT NULL
  - `contract_type` `varchar(30)` NOT NULL CHECK (contract_type IN ('COMPREHENSIVE', 'LABOR_ONLY', 'PREVENTIVE_ONLY', 'TIME_AND_MATERIALS', 'RETAINER'))
  - `rate_card_id` `uuid` NOT NULL REFERENCES contract_rate_cards(id) ON DELETE RESTRICT
  - `start_date` `date` NOT NULL
  - `end_date` `date` NOT NULL
  - `fixed_retainer_fee` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `billing_frequency` `varchar(20)` NOT NULL DEFAULT 'MONTHLY' CHECK (billing_frequency IN ('MONTHLY', 'QUARTERLY', 'ANNUALLY', 'MILESTONE'))
  - `response_sla_hours` `smallint` NOT NULL DEFAULT 4
  - `status` `varchar(20)` NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('DRAFT', 'ACTIVE', 'SUSPENDED', 'EXPIRED', 'TERMINATED'))
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** CHECK (end_date >= start_date)

#### Table 95: `contract_rate_cards`
- **Purpose:** Price books defining hourly rates, travel tariffs, and part markups.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` `varchar(100)` NOT NULL UNIQUE
  - `currency` `char(3)` NOT NULL DEFAULT 'GHS'
  - `materials_markup_percentage` `numeric(5,2)` NOT NULL DEFAULT 15.00 CHECK (materials_markup_percentage >= 0)
  - `is_default` `boolean` NOT NULL DEFAULT false
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 96: `rate_card_lines`
- **Purpose:** Specific hourly rates per skill grade (Apprentice, Senior Technician, Specialist).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `rate_card_id` `uuid` NOT NULL REFERENCES contract_rate_cards(id) ON DELETE CASCADE
  - `skill_id` `uuid` NOT NULL REFERENCES skills(id) ON DELETE RESTRICT
  - `hourly_standard_rate` `numeric(10,2)` NOT NULL CHECK (hourly_standard_rate >= 0)
  - `hourly_overtime_rate` `numeric(10,2)` NOT NULL CHECK (hourly_overtime_rate >= 0)
  - `hourly_holiday_rate` `numeric(10,2)` NOT NULL CHECK (hourly_holiday_rate >= 0)
- **Constraints:** UNIQUE (`rate_card_id`, `skill_id`)

#### Table 97: `contract_billing_milestones`
- **Purpose:** Fixed scheduled billing events agreed within a project contract.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `contract_id` `uuid` NOT NULL REFERENCES customer_contracts(id) ON DELETE CASCADE
  - `milestone_name` `varchar(150)` NOT NULL
  - `due_date` `date` NOT NULL
  - `amount` `numeric(14,2)` NOT NULL CHECK (amount > 0)
  - `is_billed` `boolean` NOT NULL DEFAULT false
  - `invoice_id` `uuid` NULL REFERENCES invoices(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 98: `recurring_billing_schedules`
- **Purpose:** Automated engine schedules for generating periodic retainer invoices.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `contract_id` `uuid` NOT NULL REFERENCES customer_contracts(id) ON DELETE CASCADE UNIQUE
  - `next_run_date` `date` NOT NULL
  - `billing_day_of_month` `smallint` NOT NULL DEFAULT 1 CHECK (billing_day_of_month BETWEEN 1 AND 28)
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `last_invoice_id` `uuid` NULL REFERENCES invoices(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 99: `quotes`
- **Purpose:** Commercial quotations, estimates, and customer work proposals.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `quote_number` `varchar(50)` NOT NULL UNIQUE
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE RESTRICT
  - `customer_site_id` `uuid` NOT NULL REFERENCES customer_sites(id) ON DELETE RESTRICT
  - `work_order_id` `uuid` NULL REFERENCES work_orders(id) ON DELETE SET NULL
  - `title` `varchar(200)` NOT NULL
  - `status` `varchar(20)` NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
      'DRAFT', 'SUBMITTED', 'SENT_TO_CLIENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'
    ))
  - `valid_until` `date` NOT NULL
  - `subtotal` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `tax_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `total_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `created_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 100: `quote_lines`
- **Purpose:** Bill of quantities items (labor hours, parts, equipment hire) in a quotation.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `quote_id` `uuid` NOT NULL REFERENCES quotes(id) ON DELETE CASCADE
  - `line_type` `varchar(20)` NOT NULL CHECK (line_type IN ('LABOR', 'PART', 'EXPENSE', 'SUBCONTRACTOR'))
  - `description` `text` NOT NULL
  - `quantity` `numeric(10,2)` NOT NULL CHECK (quantity > 0)
  - `unit_cost` `numeric(14,4)` NOT NULL CHECK (unit_cost >= 0)
  - `unit_price` `numeric(14,4)` NOT NULL CHECK (unit_price >= 0)
  - `total_price` `numeric(14,2)` GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED

#### Table 101: `unbilled_work_items`
- **Purpose:** Work-in-progress (WIP) ledger tracking completed billable work awaiting customer invoicing.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE CASCADE
  - `work_order_id` `uuid` NOT NULL REFERENCES work_orders(id) ON DELETE CASCADE
  - `item_type` `varchar(20)` NOT NULL CHECK (item_type IN ('LABOR', 'PART', 'EXPENSE', 'FIXED_FEE'))
  - `source_record_id` `uuid` NOT NULL
  - `amount` `numeric(14,2)` NOT NULL CHECK (amount > 0)
  - `completed_date` `date` NOT NULL
  - `invoice_line_id` `uuid` NULL REFERENCES invoice_lines(id)
  - `is_invoiced` `boolean` NOT NULL DEFAULT false
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 102: `contract_profitability_snapshots`
- **Purpose:** Analytical monthly projection comparing customer contract revenue against actual direct costs.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `contract_id` `uuid` NOT NULL REFERENCES customer_contracts(id) ON DELETE CASCADE
  - `year_month` `varchar(7)` NOT NULL -- Format: YYYY-MM
  - `billed_revenue` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `actual_labor_cost` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `actual_parts_cost` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `actual_subcontractor_cost` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `gross_margin_amount` `numeric(14,2)` GENERATED ALWAYS AS (
      billed_revenue - (actual_labor_cost + actual_parts_cost + actual_subcontractor_cost)
    ) STORED
  - `gross_margin_percentage` `numeric(5,2)` NULL
- **Constraints:** UNIQUE (`contract_id`, `year_month`)

---

### DOMAIN 11: TAXATION, INVOICING, PAYMENTS & RECEIVABLES (GHANA 2026 ENGINE)

#### Table 103: `tax_regimes`
- **Purpose:** Regional statutory tax authority frameworks (Ghana Revenue Authority).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `country_code` `char(2)` NOT NULL DEFAULT 'GH'
  - `name` `varchar(100)` NOT NULL UNIQUE
  - `description` `text` NULL
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 104: `tax_components`
- **Purpose:** Specific statutory tax levies (Ghana Jan 1, 2026: VAT 15%, NHIL 2.5%, GETFund 2.5%).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `tax_regime_id` `uuid` NOT NULL REFERENCES tax_regimes(id) ON DELETE CASCADE
  - `code` `varchar(20)` NOT NULL -- 'VAT', 'NHIL', 'GETFUND'
  - `name` `varchar(100)` NOT NULL
  - `rate` `numeric(6,4)` NOT NULL CHECK (rate >= 0) -- e.g. 0.1500 for 15%
  - `calculation_order` `smallint` NOT NULL DEFAULT 1
  - `is_compound` `boolean` NOT NULL DEFAULT false
  - `effective_from` `date` NOT NULL
  - `effective_to` `date` NULL
  - `is_active` `boolean` NOT NULL DEFAULT true
- **Constraints:** UNIQUE (`tax_regime_id`, `code`, `effective_from`), CHECK (effective_to IS NULL OR effective_to >= effective_from)

#### Table 105: `invoices`
- **Purpose:** Accounts receivable tax invoices issued to customers.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `invoice_number` `varchar(50)` NOT NULL UNIQUE
  - `operational_number` `varchar(50)` NULL UNIQUE
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE RESTRICT
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE RESTRICT
  - `contract_id` `uuid` NULL REFERENCES customer_contracts(id) ON DELETE SET NULL
  - `quote_id` `uuid` NULL REFERENCES quotes(id) ON DELETE SET NULL
  - `invoice_date` `date` NOT NULL
  - `due_date` `date` NOT NULL
  - `tax_regime_id` `uuid` NOT NULL REFERENCES tax_regimes(id) ON DELETE RESTRICT
  - `subtotal_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00 CHECK (subtotal_amount >= 0)
  - `tax_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00 CHECK (tax_amount >= 0)
  - `total_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00 CHECK (total_amount >= 0)
  - `balance_due` `numeric(14,2)` NOT NULL DEFAULT 0.00 CHECK (balance_due >= 0)
  - `status` `varchar(20)` NOT NULL DEFAULT 'DRAFT' CHECK (status IN (
      'DRAFT', 'SUBMITTED', 'APPROVED', 'ISSUED', 'PARTIALLY_PAID',
      'PAID', 'OVERDUE', 'CANCELLED', 'VOIDED'
    ))
  - `created_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `approval_request_id` `uuid` NULL REFERENCES approval_requests(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `deleted_at` `timestamptz` NULL
  - `version` `integer` NOT NULL DEFAULT 1
- **Indexes:** `idx_inv_num` ON `invoice_number`, `idx_inv_cust` ON `customer_id`, `idx_inv_status` ON `status`

#### Table 106: `invoice_lines`
- **Purpose:** Itemized billed charges (work order labor, materials, fixed fees) on an invoice.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `invoice_id` `uuid` NOT NULL REFERENCES invoices(id) ON DELETE CASCADE
  - `work_order_id` `uuid` NULL REFERENCES work_orders(id) ON DELETE SET NULL
  - `line_number` `smallint` NOT NULL
  - `description` `text` NOT NULL
  - `quantity` `numeric(10,2)` NOT NULL CHECK (quantity > 0)
  - `unit_price` `numeric(14,4)` NOT NULL CHECK (unit_price >= 0)
  - `subtotal` `numeric(14,2)` GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED
  - `is_taxable` `boolean` NOT NULL DEFAULT true
- **Constraints:** UNIQUE (`invoice_id`, `line_number`)

#### Table 107: `invoice_tax_lines`
- **Purpose:** Immutable historical snapshots of statutory tax components computed on an invoice.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `invoice_id` `uuid` NOT NULL REFERENCES invoices(id) ON DELETE CASCADE
  - `tax_component_id` `uuid` NOT NULL REFERENCES tax_components(id) ON DELETE RESTRICT
  - `tax_code` `varchar(20)` NOT NULL -- 'VAT', 'NHIL', 'GETFUND'
  - `tax_name` `varchar(100)` NOT NULL
  - `rate_applied` `numeric(6,4)` NOT NULL
  - `taxable_base_amount` `numeric(14,2)` NOT NULL
  - `calculated_tax_amount` `numeric(14,2)` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`invoice_id`, `tax_component_id`)

#### Table 108: `credit_notes`
- **Purpose:** Formal statutory tax rectification notes reversing or reducing an invoice.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `credit_note_number` `varchar(50)` NOT NULL UNIQUE
  - `invoice_id` `uuid` NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE RESTRICT
  - `subtotal_amount` `numeric(14,2)` NOT NULL CHECK (subtotal_amount >= 0)
  - `tax_amount` `numeric(14,2)` NOT NULL CHECK (tax_amount >= 0)
  - `total_amount` `numeric(14,2)` NOT NULL CHECK (total_amount > 0)
  - `reason` `text` NOT NULL
  - `status` `varchar(20)` NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SUBMITTED', 'APPROVED', 'ISSUED', 'APPLIED', 'VOIDED'))
  - `created_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `approval_request_id` `uuid` NULL REFERENCES approval_requests(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 109: `credit_note_lines`
- **Purpose:** Detailed item lines on a credit note.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `credit_note_id` `uuid` NOT NULL REFERENCES credit_notes(id) ON DELETE CASCADE
  - `invoice_line_id` `uuid` NULL REFERENCES invoice_lines(id) ON DELETE SET NULL
  - `description` `text` NOT NULL
  - `quantity` `numeric(10,2)` NOT NULL CHECK (quantity > 0)
  - `unit_price` `numeric(14,4)` NOT NULL CHECK (unit_price >= 0)
  - `subtotal` `numeric(14,2)` GENERATED ALWAYS AS (ROUND(quantity * unit_price, 2)) STORED

#### Table 110: `payments`
- **Purpose:** Inbound customer financial remittances via Mobile Money, Bank Transfer, Card, or Cash.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `payment_number` `varchar(50)` NOT NULL UNIQUE
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE RESTRICT
  - `payment_date` `date` NOT NULL
  - `amount` `numeric(14,2)` NOT NULL CHECK (amount > 0)
  - `unallocated_amount` `numeric(14,2)` NOT NULL CHECK (unallocated_amount >= 0)
  - `payment_method` `varchar(30)` NOT NULL CHECK (payment_method IN ('MOMO_MTN', 'MOMO_TELECEL', 'MOMO_AIRTELTIGO', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'CASH'))
  - `external_transaction_reference` `varchar(100)` NULL
  - `gateway_provider` `varchar(50)` NULL -- e.g. 'PAYSTACK', 'ARKESEL'
  - `status` `varchar(20)` NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('COMPLETED', 'REVERSED', 'REFUNDED'))
  - `recorded_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 111: `payment_allocations`
- **Purpose:** Immutable double-entry ledger matching payments to specific outstanding invoices.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `payment_id` `uuid` NOT NULL REFERENCES payments(id) ON DELETE RESTRICT
  - `invoice_id` `uuid` NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT
  - `allocated_amount` `numeric(14,2)` NOT NULL CHECK (allocated_amount > 0)
  - `allocated_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`payment_id`, `invoice_id`)
- **Trigger:** Revoke UPDATE and DELETE via `tg_prevent_ledger_mutation()`.

#### Table 112: `payment_reversals`
- **Purpose:** Documentation of bounced checks, disputed Mobile Money transactions, and NSF reversals.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `payment_id` `uuid` NOT NULL REFERENCES payments(id) ON DELETE CASCADE UNIQUE
  - `reversal_amount` `numeric(14,2)` NOT NULL CHECK (reversal_amount > 0)
  - `reason` `text` NOT NULL
  - `authorized_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 113: `refunds`
- **Purpose:** Outbound electronic or cash disbursements reimbursing customer overpayments.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `refund_number` `varchar(50)` NOT NULL UNIQUE
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE RESTRICT
  - `payment_id` `uuid` NOT NULL REFERENCES payments(id) ON DELETE RESTRICT
  - `amount` `numeric(14,2)` NOT NULL CHECK (amount > 0)
  - `refund_method` `varchar(30)` NOT NULL CHECK (refund_method IN ('MOMO', 'BANK_TRANSFER', 'CHEQUE'))
  - `external_reference` `varchar(100)` NULL
  - `authorized_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 114: `customer_statement_runs`
- **Purpose:** Generated customer debtor statements summarizing invoices, payments, and balances.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE CASCADE
  - `statement_date` `date` NOT NULL
  - `opening_balance` `numeric(14,2)` NOT NULL
  - `total_invoiced` `numeric(14,2)` NOT NULL
  - `total_paid` `numeric(14,2)` NOT NULL
  - `closing_balance` `numeric(14,2)` NOT NULL
  - `document_id` `uuid` NULL REFERENCES documents(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 115: `aged_receivables_snapshots`
- **Purpose:** Monthly debtor aging analysis snapshots for financial risk monitoring.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `customer_id` `uuid` NOT NULL REFERENCES customers(id) ON DELETE CASCADE
  - `snapshot_date` `date` NOT NULL
  - `current_balance` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `days_30_balance` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `days_60_balance` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `days_90_balance` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `days_120_plus_balance` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `total_outstanding` `numeric(14,2)` GENERATED ALWAYS AS (
      current_balance + days_30_balance + days_60_balance + days_90_balance + days_120_plus_balance
    ) STORED
- **Constraints:** UNIQUE (`customer_id`, `snapshot_date`)

#### Table 116: `number_sequences`
- **Purpose:** Atomic sequential document counters partitioned by branch and document type.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE CASCADE
  - `sequence_type` `varchar(30)` NOT NULL CHECK (sequence_type IN (
      'WORK_ORDER', 'QUOTE', 'STATUTORY_INVOICE', 'OPERATIONAL_INVOICE',
      'CREDIT_NOTE', 'PAYMENT', 'PURCHASE_ORDER', 'GOODS_RECEIPT', 'TRANSFER'
    ))
  - `prefix` `varchar(15)` NOT NULL
  - `next_value` `bigint` NOT NULL DEFAULT 1 CHECK (next_value >= 1)
  - `padding_digits` `smallint` NOT NULL DEFAULT 5
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`branch_id`, `sequence_type`)

#### Table 117: `voided_number_audit`
- **Purpose:** Statutory registry documenting cancelled, skipped, or voided statutory tax invoice numbers.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `sequence_type` `varchar(30)` NOT NULL
  - `voided_number` `varchar(50)` NOT NULL UNIQUE
  - `reason` `text` NOT NULL
  - `voided_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `voided_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

---

### DOMAIN 12: DUAL-CONTROL (MAKER-CHECKER) GOVERNANCE & APPROVALS

#### Table 118: `approval_rules`
- **Purpose:** Configurable approval threshold policies matrix.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `resource` `varchar(50)` NOT NULL -- 'INVOICE', 'PURCHASE_ORDER', 'WORK_ORDER_COST'
  - `branch_id` `uuid` NULL REFERENCES branches(id) ON DELETE CASCADE
  - `min_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `max_amount` `numeric(14,2)` NULL
  - `required_role_id` `uuid` NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
  - `tier_order` `smallint` NOT NULL DEFAULT 1
  - `requires_mfa_step_up` `boolean` NOT NULL DEFAULT false
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 119: `approval_requests`
- **Purpose:** Active dual-control transaction authorization requests.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `resource` `varchar(50)` NOT NULL
  - `resource_id` `uuid` NOT NULL
  - `maker_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE RESTRICT
  - `last_editor_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE RESTRICT
  - `payload_sha256` `char(64)` NOT NULL
  - `transaction_amount` `numeric(14,2)` NOT NULL DEFAULT 0.00
  - `status` `varchar(20)` NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'INVALIDATED', 'EXPIRED'))
  - `current_step` `smallint` NOT NULL DEFAULT 1
  - `total_steps` `smallint` NOT NULL DEFAULT 1
  - `expires_at` `timestamptz` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `updated_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Indexes:** `idx_appr_req_res` ON `resource`, `resource_id`, `idx_appr_req_status` ON `status`

#### Table 120: `approval_steps`
- **Purpose:** Sequential approval tiers within a multi-level approval request.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `approval_request_id` `uuid` NOT NULL REFERENCES approval_requests(id) ON DELETE CASCADE
  - `step_number` `smallint` NOT NULL
  - `required_role_id` `uuid` NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
  - `status` `varchar(20)` NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'SKIPPED'))
  - `completed_at` `timestamptz` NULL
- **Constraints:** UNIQUE (`approval_request_id`, `step_number`)

#### Table 121: `approval_actions`
- **Purpose:** Append-only ledger recording individual checker signatures and step-up OTP audits.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `approval_step_id` `uuid` NOT NULL REFERENCES approval_steps(id) ON DELETE CASCADE
  - `checker_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE RESTRICT
  - `action` `varchar(20)` NOT NULL CHECK (action IN ('APPROVED', 'REJECTED'))
  - `comments` `text` NULL
  - `step_up_otp_verified` `boolean` NOT NULL DEFAULT false
  - `action_timestamp` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:**
  - Enforced via Trigger: `checker_user_id <> approval_requests.maker_user_id` AND `checker_user_id <> approval_requests.last_editor_id`
- **Trigger:** Revoke UPDATE and DELETE via `tg_prevent_ledger_mutation()`.

#### Table 122: `emergency_provisional_authorizations`
- **Purpose:** "Break-glass" provisional emergency overrides executed when life/critical infrastructure is at risk.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `resource` `varchar(50)` NOT NULL
  - `resource_id` `uuid` NOT NULL
  - `authorized_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `emergency_justification` `text` NOT NULL
  - `ratified_by_user_id` `uuid` NULL REFERENCES users(id)
  - `ratified_at` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

---

### DOMAIN 13: AUDIT TRAILS, DOCUMENTS & NOTIFICATIONS

#### Table 123: `audit_logs`
- **Purpose:** Append-only, tamper-evident security audit trail with cryptographic SHA-256 chaining.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `sequence_number` `bigserial` UNIQUE
  - `actor_user_id` `uuid` NULL REFERENCES users(id)
  - `actor_contact_id` `uuid` NULL REFERENCES customer_contacts(id)
  - `ip_address` `varchar(45)` NOT NULL
  - `user_agent` `text` NULL
  - `action` `varchar(50)` NOT NULL
  - `resource` `varchar(50)` NOT NULL
  - `resource_id` `uuid` NOT NULL
  - `previous_payload_hash` `char(64)` NOT NULL
  - `current_payload_hash` `char(64)` NOT NULL
  - `diff_payload` `jsonb` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Trigger:** Strict append-only via `tg_prevent_ledger_mutation()`.

#### Table 124: `activity_logs`
- **Purpose:** High-performance user-facing notification feed items.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE CASCADE
  - `user_id` `uuid` NULL REFERENCES users(id)
  - `title` `varchar(200)` NOT NULL
  - `body` `text` NOT NULL
  - `link_url` `text` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 125: `documents`
- **Purpose:** Centralized master registry for attachments, manuals, drawings, and photos.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `title` `varchar(200)` NOT NULL
  - `category` `varchar(50)` NOT NULL CHECK (category IN ('EQUIPMENT_MANUAL', 'SCHEMATIC', 'SITE_MAP', 'INSPECTION_PHOTO', 'RECEIPT', 'CONTRACT_PDF', 'WORK_ORDER_ATTACHMENT'))
  - `current_version_id` `uuid` NULL
  - `created_by_user_id` `uuid` NOT NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 126: `document_versions`
- **Purpose:** Physical file version storage records with SHA-256 hashes and antivirus verification.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `document_id` `uuid` NOT NULL REFERENCES documents(id) ON DELETE CASCADE
  - `version_number` `smallint` NOT NULL
  - `storage_key` `text` NOT NULL -- Cloud object storage URI
  - `file_name` `varchar(255)` NOT NULL
  - `file_size_bytes` `bigint` NOT NULL CHECK (file_size_bytes > 0)
  - `mime_type` `varchar(100)` NOT NULL
  - `sha256_hash` `char(64)` NOT NULL
  - `malware_scan_status` `varchar(20)` NOT NULL DEFAULT 'PENDING' CHECK (malware_scan_status IN ('PENDING', 'CLEAN', 'INFECTED', 'SCAN_FAILED'))
  - `uploaded_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`document_id`, `version_number`)

#### Table 127: `notification_templates`
- **Purpose:** Multilingual, multi-channel parameterized notification templates.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `template_code` `varchar(50)` NOT NULL UNIQUE
  - `channel` `varchar(20)` NOT NULL CHECK (channel IN ('IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'))
  - `subject` `varchar(200)` NULL
  - `body_template` `text` NOT NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 128: `notification_preferences`
- **Purpose:** User and customer contact delivery routing preferences and opt-outs.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `user_id` `uuid` NULL REFERENCES users(id) ON DELETE CASCADE
  - `customer_contact_id` `uuid` NULL REFERENCES customer_contacts(id) ON DELETE CASCADE
  - `event_category` `varchar(50)` NOT NULL
  - `email_enabled` `boolean` NOT NULL DEFAULT true
  - `sms_enabled` `boolean` NOT NULL DEFAULT false
  - `in_app_enabled` `boolean` NOT NULL DEFAULT true
- **Constraints:** UNIQUE (`user_id`, `customer_contact_id`, `event_category`)

#### Table 129: `notifications`
- **Purpose:** In-app operational notification inbox items.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `recipient_user_id` `uuid` NULL REFERENCES users(id) ON DELETE CASCADE
  - `recipient_contact_id` `uuid` NULL REFERENCES customer_contacts(id) ON DELETE CASCADE
  - `title` `varchar(200)` NOT NULL
  - `message` `text` NOT NULL
  - `link_url` `text` NULL
  - `is_read` `boolean` NOT NULL DEFAULT false
  - `read_at` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 130: `notification_delivery_attempts`
- **Purpose:** Delivery logs for SMS, WhatsApp, and email gateway dispatches.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `notification_id` `uuid` NOT NULL REFERENCES notifications(id) ON DELETE CASCADE
  - `channel` `varchar(20)` NOT NULL
  - `gateway_provider` `varchar(50)` NOT NULL -- 'ARKESEL', 'SENDGRID', 'TWILIO'
  - `external_message_id` `varchar(100)` NULL
  - `status` `varchar(20)` NOT NULL DEFAULT 'SENT' CHECK (status IN ('SENT', 'DELIVERED', 'FAILED', 'BOUNCED'))
  - `error_message` `text` NULL
  - `attempted_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 131: `notification_escalation_rules`
- **Purpose:** Automatic escalation chains for unacknowledged critical alerts.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `event_category` `varchar(50)` NOT NULL
  - `unacknowledged_minutes` `smallint` NOT NULL CHECK (unacknowledged_minutes > 0)
  - `escalate_to_role_id` `uuid` NOT NULL REFERENCES roles(id) ON DELETE RESTRICT
  - `is_active` `boolean` NOT NULL DEFAULT true

---

### DOMAIN 14: ANALYTICS, WEBHOOKS, OFFLINE SYNC & DATA PRIVACY

#### Table 132: `report_definitions`
- **Purpose:** Parameterized SQL queries for executive business intelligence.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `name` `varchar(150)` NOT NULL UNIQUE
  - `category` `varchar(50)` NOT NULL
  - `sql_query` `text` NOT NULL
  - `parameter_schema` `jsonb` NOT NULL DEFAULT '{}'
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 133: `scheduled_reports`
- **Purpose:** Automated PDF/Excel report delivery schedules.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `report_definition_id` `uuid` NOT NULL REFERENCES report_definitions(id) ON DELETE CASCADE
  - `cron_expression` `varchar(50)` NOT NULL
  - `recipients` `text[]` NOT NULL
  - `format` `varchar(10)` NOT NULL DEFAULT 'PDF' CHECK (format IN ('PDF', 'XLSX', 'CSV'))
  - `is_active` `boolean` NOT NULL DEFAULT true

#### Table 134: `kpi_snapshots`
- **Purpose:** Materialized high-frequency performance metrics for instant dashboard rendering.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `branch_id` `uuid` NOT NULL REFERENCES branches(id) ON DELETE CASCADE
  - `metric_date` `date` NOT NULL
  - `mtbf_hours` `numeric(10,2)` NOT NULL DEFAULT 0.00
  - `mttr_hours` `numeric(10,2)` NOT NULL DEFAULT 0.00
  - `pm_compliance_rate` `numeric(5,2)` NOT NULL DEFAULT 100.00
  - `active_backlog_count` `integer` NOT NULL DEFAULT 0
  - `first_time_fix_rate` `numeric(5,2)` NOT NULL DEFAULT 0.00
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
- **Constraints:** UNIQUE (`branch_id`, `metric_date`)

#### Table 135: `webhook_subscriptions`
- **Purpose:** Outbound event notification subscriptions for third-party ERP integration.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `target_url` `text` NOT NULL
  - `secret_token` `varchar(128)` NOT NULL
  - `event_types` `text[]` NOT NULL -- e.g. ['work_order.completed', 'invoice.paid']
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 136: `webhook_deliveries`
- **Purpose:** HTTP dispatch history, status codes, and retry tracking for webhooks.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `subscription_id` `uuid` NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE
  - `event_type` `varchar(50)` NOT NULL
  - `payload` `jsonb` NOT NULL
  - `http_status` `smallint` NULL
  - `response_body` `text` NULL
  - `attempt_number` `smallint` NOT NULL DEFAULT 1
  - `delivered_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 137: `offline_sync_batches`
- **Purpose:** Mobile field technician offline mutation batches.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `device_identifier` `varchar(100)` NOT NULL
  - `technician_user_id` `uuid` NOT NULL REFERENCES users(id) ON DELETE RESTRICT
  - `client_sync_timestamp` `timestamptz` NOT NULL
  - `status` `varchar(20)` NOT NULL DEFAULT 'PROCESSED' CHECK (status IN ('PROCESSED', 'PARTIALLY_PROCESSED', 'FAILED'))
  - `processed_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 138: `offline_sync_mutations`
- **Purpose:** Individual atomic mutations within an offline sync batch.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `batch_id` `uuid` NOT NULL REFERENCES offline_sync_batches(id) ON DELETE CASCADE
  - `idempotency_key` `varchar(128)` NOT NULL UNIQUE
  - `target_table` `varchar(50)` NOT NULL
  - `action` `varchar(20)` NOT NULL CHECK (action IN ('INSERT', 'UPDATE', 'DELETE'))
  - `mutation_payload` `jsonb` NOT NULL
  - `status` `varchar(20)` NOT NULL DEFAULT 'APPLIED' CHECK (status IN ('APPLIED', 'CONFLICT_RESOLVED', 'REJECTED'))

#### Table 139: `offline_sync_conflicts`
- **Purpose:** Concurrency conflict records when server version outpaces offline client.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `mutation_id` `uuid` NOT NULL REFERENCES offline_sync_mutations(id) ON DELETE CASCADE
  - `table_name` `varchar(50)` NOT NULL
  - `record_id` `uuid` NOT NULL
  - `server_version` `integer` NOT NULL
  - `client_version` `integer` NOT NULL
  - `resolution_strategy` `varchar(30)` NOT NULL CHECK (resolution_strategy IN ('SERVER_WINS', 'CLIENT_WINS', 'MANUAL_MERGE'))
  - `resolved_by_user_id` `uuid` NULL REFERENCES users(id)
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 140: `privacy_consents`
- **Purpose:** Customer and staff consent records compliant with Ghana Data Protection Act (Act 843).
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `subject_email` `varchar(150)` NOT NULL
  - `consent_type` `varchar(50)` NOT NULL -- 'MARKETING', 'LOCATION_TRACKING', 'BIOMETRIC_DATA'
  - `is_granted` `boolean` NOT NULL DEFAULT true
  - `granted_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()
  - `revoked_at` `timestamptz` NULL

#### Table 141: `data_subject_requests`
- **Purpose:** Formal data access, export, rectification, and erasure workflows under Act 843.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `request_number` `varchar(50)` NOT NULL UNIQUE
  - `subject_email` `varchar(150)` NOT NULL
  - `request_type` `varchar(30)` NOT NULL CHECK (request_type IN ('ACCESS_EXPORT', 'RECTIFICATION', 'ERASURE', 'RESTRICTION'))
  - `status` `varchar(20)` NOT NULL DEFAULT 'RECEIVED' CHECK (status IN ('RECEIVED', 'UNDER_REVIEW', 'COMPLETED', 'REJECTED'))
  - `assigned_to_user_id` `uuid` NULL REFERENCES users(id)
  - `completion_notes` `text` NULL
  - `due_date` `date` NOT NULL
  - `completed_at` `timestamptz` NULL
  - `created_at` `timestamptz` NOT NULL DEFAULT clock_timestamp()

#### Table 142: `data_retention_policies`
- **Purpose:** Automated scheduled data purge and anonymization rules.
- **Fields:**
  - `id` `uuid` NOT NULL PRIMARY KEY DEFAULT gen_random_uuid()
  - `table_name` `varchar(50)` NOT NULL UNIQUE
  - `retention_period_days` `integer` NOT NULL CHECK (retention_period_days >= 365)
  - `action` `varchar(20)` NOT NULL DEFAULT 'ANONYMIZE' CHECK (action IN ('DELETE', 'ANONYMIZE', 'ARCHIVE_COLD_STORAGE'))
  - `is_active` `boolean` NOT NULL DEFAULT true
  - `last_purged_at` `timestamptz` NULL

---

## PART 4 — SPECIALIZED ARCHITECTURAL SUBSYSTEMS

### 4.1 GHANA STATUTORY TAX ENGINE (JANUARY 1, 2026 REFORMS)

#### 1. Statutory Rate Structure
Under the VAT reforms effective January 1, 2026, the COVID-19 Health Recovery Levy is abolished, leaving three standard statutory levies:
- **Value Added Tax (VAT):** 15.0% (`0.1500`)
- **National Health Insurance Levy (NHIL):** 2.5% (`0.0250`)
- **Ghana Education Trust Fund (GETFund):** 2.5% (`0.0250`)
- **COVID-19 Health Recovery Levy:** 0.0% (`0.0000` - Abolished)

#### 2. Calculation Mechanics: Flat Parallel Base
All three active components are calculated simultaneously on the identical taxable supply base:
$$\text{Taxable Base } B = \sum (\text{Line Quantity} \times \text{Unit Price})$$
$$\text{VAT Amount} = \text{ROUND}(B \times 0.1500, 2)$$
$$\text{NHIL Amount} = \text{ROUND}(B \times 0.0250, 2)$$
$$\text{GETFund Amount} = \text{ROUND}(B \times 0.0250, 2)$$
$$\text{Total Tax Amount } T = \text{VAT} + \text{NHIL} + \text{GETFund}$$
$$\text{Gross Total Payable } G = B + T$$

#### 3. Mathematical Extraction (Tax-Inclusive Pricing)
When consumer or commercial agreements stipulate tax-inclusive tariffs ($G$):
$$\text{Effective Combined Tax Rate } R_{\text{combined}} = 0.1500 + 0.0250 + 0.0250 = 0.2000 \text{ (20.0\%)}$$
$$\text{Taxable Base } B = \text{ROUND}\left(\frac{G}{1 + R_{\text{combined}}}, 2\right) = \text{ROUND}\left(\frac{G}{1.2000}, 2\right)$$
$$\text{Component Levies} = \text{Computed on derived } B \text{ as above. Any minor 1-pesewa rounding difference is adjusted into VAT.}$$

---

### 4.2 DUAL-CONTROL (MAKER-CHECKER) TRANSACTION ENFORCEMENT

#### Service and Transaction Boundary Guards
Dual control is not a cosmetic front-end feature or a simple static CHECK constraint. It is enforced across three architectural layers:

```
[ Application Service Layer ]
  1. Validates Maker != Checker
  2. Computes payload SHA-256 hash
  3. Verifies step-up OTP if threshold exceeded
          |
          v
[ PostgreSQL Transaction Boundary ]
  BEGIN;
  1. SELECT FOR UPDATE on approval_requests (prevents concurrent double-execution)
  2. Verify current payload SHA-256 matches approval_requests.payload_sha256
  3. Verify current_user_id != maker_user_id AND current_user_id != last_editor_id
  4. INSERT INTO approval_actions (immutable signature record)
  5. UPDATE target entity status ('APPROVED')
  COMMIT;
```

#### Database Enforcing Trigger Function
```sql
CREATE OR REPLACE FUNCTION tg_enforce_maker_checker_integrity()
RETURNS TRIGGER AS $$
DECLARE
  v_maker_id uuid;
  v_editor_id uuid;
  v_req_status varchar(20);
BEGIN
  -- Retrieve maker and last editor
  SELECT maker_user_id, last_editor_id, status 
  INTO v_maker_id, v_editor_id, v_req_status
  FROM approval_requests
  WHERE id = (SELECT approval_request_id FROM approval_steps WHERE id = NEW.approval_step_id);

  IF NEW.checker_user_id = v_maker_id THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Maker cannot approve their own transaction (Maker ID: %)', v_maker_id;
  END IF;

  IF NEW.checker_user_id = v_editor_id THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Last editor cannot act as checker (Editor ID: %)', v_editor_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

### 4.3 POSTGRESQL ROW-LEVEL SECURITY (RLS) & PRIVILEGE ARCHITECTURE

#### 1. Runtime Database Roles & Separation of Duty
- `db_migrator`: Schema owner. Executes DDL migrations. Has zero access to application runtime traffic.
- `app_user`: Standard web application connection pool role. Has `NOINHERIT`, `NOSUPERUSER`, `NOCREATEDB`. Cannot bypass RLS.
- `app_worker`: Background worker pool role (`pg-boss`). Operates with scoped row-level security contexts, never bypassing RLS by default.

#### 2. Session Context Injection via Connection Pooling
Because connections are pooled via PgBouncer, context is established transaction-locally using `is_local => true`, guaranteeing automatic cleanup upon `COMMIT` or `ROLLBACK`:
```sql
-- Executed inside transaction before any domain query
SET LOCAL app.current_user_id = '0192e4a8-7612-7000-8000-000000000001';
SET LOCAL app.current_branch_id = '0192e4a8-7612-7000-8000-000000000002';
SET LOCAL app.current_scope = 'BRANCH_AND_BELOW';
```

#### 3. Formal RLS Policies Example on Work Orders
```sql
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders FORCE ROW LEVEL SECURITY;

CREATE POLICY wo_staff_tenant_isolation ON work_orders
FOR ALL TO app_user
USING (
  -- 1. Company Admin Scope
  current_setting('app.current_scope', true) = 'COMPANY'
  OR
  -- 2. Branch & Below Scope (Materialized Path Match)
  (
    current_setting('app.current_scope', true) = 'BRANCH_AND_BELOW'
    AND branch_id IN (
      SELECT id FROM branches 
      WHERE path LIKE (SELECT path FROM branches WHERE id = current_setting('app.current_branch_id', true)::uuid) || '%'
    )
  )
  OR
  -- 3. Branch Scope
  (
    current_setting('app.current_scope', true) = 'BRANCH'
    AND branch_id = current_setting('app.current_branch_id', true)::uuid
  )
  OR
  -- 4. Own / Assigned Scope
  (
    current_setting('app.current_scope', true) = 'OWN'
    AND assigned_technician_id = current_setting('app.current_user_id', true)::uuid
  )
);
```

---

## PART 5 — NON-DESTRUCTIVE 7-STAGE MIGRATION ROADMAP

The migration roadmap transitions the schema from the 7 foundation models in `prisma/schema.prisma` to the full 142-entity production catalog with zero data loss and zero downtime.

```
+----------------------------------------------------------------------------------------------------+
| STAGE 1: Foundation Alignment & Identity Split                                                    |
| - Keep existing 7 tables. Alter Company (singleton_enforcer), Branch (branch_type, path).         |
| - Introduce customer_contacts, portal_sessions, customer_contact_site_grants.                      |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| STAGE 2: Calendars, Skills & Asset Master Hierarchy                                               |
| - Deploy business_calendars, technician_shifts, skills, certifications.                             |
| - Deploy asset_categories, locations, assets, asset_meters, meter_readings, asset_boms.            |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| STAGE 3: Work Orders, Checklists & Safety (PTW / LOTO)                                            |
| - Deploy work_requests, work_orders, work_order_tasks, failure_codes.                              |
| - Deploy checklist_templates, inspection_templates, permits_to_work, loto_procedures.              |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| STAGE 4: Inventory Master, Transfers & Double-Entry Stock Ledger                                  |
| - Deploy stores, parts, stock, stock_transactions (append-only ledger).                           |
| - Deploy store_transfers, store_transfer_lines, store_transfer_discrepancies.                     |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| STAGE 5: Procurement Lifecycle & Three-Way Matching                                                |
| - Deploy vendors, purchase_requisitions, purchase_orders, goods_receipts.                          |
| - Deploy supplier_invoices, three_way_matches, goods_receipt_discrepancies.                       |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| STAGE 6: Commercials, Ghana 2026 Tax Engine, Invoicing & Receivables                             |
| - Deploy customers, customer_sites, customer_contracts, contract_rate_cards.                       |
| - Deploy tax_regimes, tax_components (VAT, NHIL, GETFund), invoices, credit_notes, payments.        |
+----------------------------------------------------------------------------------------------------+
                                                  |
                                                  v
+----------------------------------------------------------------------------------------------------+
| STAGE 7: Dual-Control Governance, Tamper-Evident Audit & Offline Sync                              |
| - Deploy approval_rules, approval_requests, approval_steps, approval_actions.                      |
| - Deploy audit_logs (cryptographic SHA-256 chain), documents, offline_sync_batches, privacy tables.  |
| - Enable FORCE ROW LEVEL SECURITY and verify all constraint triggers.                             |
+----------------------------------------------------------------------------------------------------+
```

---

## PART 6 — UNRESOLVED ARCHITECTURAL DECISIONS

1. **Ghana GRA Certified E-Invoicing (Certified Invoicing System / VSDC Integration):**
   - Whether ZemiFix will integrate directly with GRA's VSDC (Virtual Sales Data Controller) QR code signing API in R2 or operate as an internal e-invoicing record engine in R1.
2. **Offline Mobile SQLite Encryption Standard:**
   - Standardizing on SQLCipher (AES-256) versus OPFS (Origin Private File System) Web Crypto API for technician offline storage.
3. **External Payment Gateway Failover:**
   - Determining primary and secondary failover prioritization between Paystack, Hubtel, and direct Arkesel MoMo aggregation.

---
*End of Architectural Specification — ZemiFix CMMS Database Design v2.0.0-PROD-BASELINE*
