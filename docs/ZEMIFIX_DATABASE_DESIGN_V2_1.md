# ZemiFix CMMS — Comprehensive Database Design and Data Model v2.1
**Document Version:** 2.1.0-FINAL-BASELINE  
**Status:** Final Architectural Baseline for Prisma Implementation Review  
**Target Engine:** PostgreSQL 16+ (Strict ACID, RLS, Append-Only Ledgers, Maker-Checker Dual Control)  
**ORM / Data Layer:** Prisma 6.x (PostgreSQL Native Driver)  
**Security Standard:** Maker-Checker Dual Control, Row-Level Security (RLS), Cryptographic Audit Chaining, Data Protection Act 2012 (Act 843 Ghana)

---

## SECTION 1: INVENTORY LEDGER INTEGRITY & TRANSACTION MODEL

### 1.1 Complete Transaction Matrix
Physical inventory within ZemiFix is managed strictly through an **append-only, double-entry stock ledger** (`stock_transactions`). The `stock` table serves exclusively as a high-performance materialized projection of on-hand and reserved balances. **Direct mutations (UPDATE/DELETE) on stock balances without a corresponding ledger entry are strictly prohibited and prevented via database triggers.**

The table below specifies the transaction model for every physical inventory lifecycle event:

| Event | `transaction_type` | Quantity Sign | Store Affected | Paired Ledger Entry? | Accounting & Valuation Impact |
|---|---|:---:|---|---|---|
| **Stock Receipt (PO/GRN)** | `PURCHASE_RECEIPT` | `+` (Debit) | Destination Store | No (Single-sided physical receipt) | Increases QOH; recalculates Store-Part Moving Weighted Average Cost (WAC). |
| **Stock Issue (Work Order)** | `WORK_ORDER_ISSUE` | `-` (Credit) | Operating Store | No | Decreases QOH and reserved stock; records line cost at current WAC. |
| **Stock Return (Work Order)**| `WORK_ORDER_RETURN` | `+` (Debit) | Operating Store | No | Increases QOH; booked at original issue unit cost. |
| **Cycle Count Adjustment (+)**| `CYCLE_COUNT_ADJUST`| `+` (Debit) | Count Store | No | Increases QOH; booked at current WAC; gains audited against variance account. |
| **Cycle Count Adjustment (-)**| `CYCLE_COUNT_ADJUST`| `-` (Credit) | Count Store | No | Decreases QOH; booked at current WAC; shrinkage audited against variance account. |
| **Warehouse Dispatch (Transfer Out)** | `TRANSFER_DISPATCH` | `-` (Credit) | Source Store | **Yes** (Paired with `TRANSFER_IN_TRANSIT` entry) | Decreases Source Store QOH; stock leaves physical custody of sending branch. |
| **In-Transit Ingress** | `TRANSFER_IN_TRANSIT`| `+` (Debit) | Virtual In-Transit Store | **Yes** (Paired with `TRANSFER_DISPATCH` entry) | Increases In-Transit Store QOH under shared `transaction_group_id`. |
| **Full Transfer Receipt** | `TRANSFER_RECEIPT` | `+` (Debit) | Destination Store | **Yes** (Paired with `TRANSFER_CLEAR_TRANSIT` entry) | Decreases In-Transit Store; increases Destination Store QOH. |
| **Partial Transfer Receipt** | `TRANSFER_RECEIPT` | `+` (Debit) | Destination Store | **Yes** (Residual remains in `IN_TRANSIT` until closed) | Received quantity credited to Destination Store; residual tracked on transfer line. |
| **Damaged / Missing in Transit** | `TRANSFER_DISCREPANCY`| `-` (Credit) | Virtual In-Transit Store | **Yes** (Paired with discrepancy investigation log) | Writes off missing/damaged stock from In-Transit; logs loss reason code. |
| **Transfer Cancellation** | `TRANSFER_CANCEL` | `+` (Debit) | Source Store | **Yes** (Reverses In-Transit stock back to Source Store) | Source Store QOH restored; In-Transit store cleared under reversal group ID. |
| **Transaction Reversal** | `TRANSACTION_REVERSAL`| Opposite sign | Originating Store | **Yes** (References `reversed_transaction_id`) | Compensating entry neutralizing previous erroneous transaction; historical row remains intact. |

---

### 1.2 Ledger Pairing, Grouping & Reversal Architecture
To ensure complete auditable correlation across multi-leg movements (transfers, returns, reversals), `stock_transactions` includes:
1. `transaction_group_id` (`uuid` NOT NULL): A unique correlation identifier linking paired debit and credit entries originating from the same physical operation.
2. `reversed_transaction_id` (`uuid` NULL REFERENCES `stock_transactions(id)`): Explicit foreign key linking compensating reversal entries to the exact historical transaction being neutralized.
3. `source_store_id` and `destination_store_id` (`uuid` NULL REFERENCES `stores(id)`): Explicit physical provenance documenting inter-warehouse logistics.
4. `reference_id` (`uuid` NOT NULL) and `reference_type` (`varchar(30)` NOT NULL): Polymorphic link connecting ledger records directly to business documents (`GOODS_RECEIPT`, `WORK_ORDER`, `STORE_TRANSFER`, `STOCK_COUNT`).

---

### 1.3 Moving Weighted Average Costing (AVCO / WAC)
Inventory valuation follows the **Moving Weighted Average Cost (WAC)** method, recomputed automatically upon every inbound stock receipt (`PURCHASE_RECEIPT`):

$$\text{New WAC} = \frac{(Q_{\text{current}} \times W_{\text{current}}) + (Q_{\text{received}} \times C_{\text{unit}})}{Q_{\text{current}} + Q_{\text{received}}}$$

Where:
- $Q_{\text{current}}$ = Current quantity on hand prior to receipt.
- $W_{\text{current}}$ = Current moving weighted average cost prior to receipt.
- $Q_{\text{received}}$ = Inbound accepted quantity from Goods Receipt Note.
- $C_{\text{unit}}$ = Net unit purchase cost from Purchase Order (exclusive of recoverable VAT).

**Mathematical Rules & Precision:**
1. Unit costs in `stock_transactions` and `parts` are stored with 4 decimal places (`numeric(14,4)`).
2. Total inventory valuations in `stock` and accounting ledgers are stored with 2 decimal places (`numeric(14,2)`).
3. Outbound stock issues (`WORK_ORDER_ISSUE`, `TRANSFER_DISPATCH`) **never change the unit WAC**; they consume inventory at the current prevailing WAC:
$$\text{Issue Total Cost} = \text{ROUND}(Q_{\text{issued}} \times W_{\text{current}}, 2)$$

---

### 1.4 Concurrency Control & Deadlock Prevention
In multi-user environments with mobile technicians issuing parts simultaneously:
1. **Pessimistic Row-Level Locking:** All inventory operations acquire an explicit row-level lock on the affected stock balance record inside the transaction boundary:
   ```sql
   SELECT quantity_on_hand, quantity_reserved, valuation_amount 
   FROM stock 
   WHERE store_id = p_store_id AND part_id = p_part_id 
   FOR UPDATE;
   ```
2. **Deterministic Locking Order:** When a transaction affects multiple parts (e.g. issuing a BOM or transferring 10 items), locks are always acquired in deterministic ascending order of `part_id` (`ORDER BY part_id ASC`), eliminating lock-order inversion deadlocks.
3. **Database Constraint Backstop:**
   ```sql
   ALTER TABLE stock ADD CONSTRAINT chk_stock_qoh_non_negative CHECK (quantity_on_hand >= 0);
   ALTER TABLE stock ADD CONSTRAINT chk_stock_reserved_valid CHECK (quantity_reserved >= 0 AND quantity_reserved <= quantity_on_hand);
   ```
   If concurrent issues attempt to overdraw inventory, the transaction rolls back cleanly with a serialized violation error.

---

## SECTION 2: MAKER-CHECKER (DUAL-CONTROL) GOVERNANCE COMPLETION

### 2.1 Complete Dual-Control State Machine

```
      +-------------------------------------------------------------+
      |                           DRAFT                             |
      +-----------------------------+-------------------------------+
                                    | Maker Submits (Payload Hashed)
                                    v
      +-------------------------------------------------------------+
+---->|                          PENDING                            |
|     +--------------+------------------------------+---------------+
|                    |                              |
| Checker Approves   | Step-up OTP (if required)    | Checker Rejects
| (Maker != Checker) | Checker Verifies OTP         | Reason Recorded
v                    v                              v
[ APPROVED / COMMITTED ]                    [ REJECTED / RESUBMIT ]
                                                    |
                                                    +-----> Maker Modifies Document
                                                            (Payload Hash Changes -> New Request)
```

---

### 2.2 Operational Enforcement Lifecycle
1. **Maker Identity:** Document creator or last editor (`maker_user_id`, `last_editor_id`).
2. **Checker Identity:** Authorizing user (`checker_user_id`). The system enforces:
   $$\text{checker\_user\_id} \ne \text{maker\_user\_id} \quad \land \quad \text{checker\_user\_id} \ne \text{last\_editor\_id}$$
3. **Permission & Scope Verification:**
   - The checker must hold the specific RBAC action permission (e.g., `invoice:approve`, `purchase_order:approve`).
   - The document's branch must fall within the checker's assigned branch scope (`BRANCH` or `BRANCH_AND_BELOW`).
4. **Configurable Threshold Limits:**
   - `users.approval_limit` defines the user's monetary ceiling.
   - `approval_rules` defines tiered threshold ranges:
     - *Tier 1 (Up to GHS 10,000):* Maintenance Supervisor.
     - *Tier 2 (GHS 10,001 – GHS 50,000):* Operations Manager.
     - *Tier 3 (Above GHS 50,000):* Managing Director / Board Representative.
5. **Multi-Level Approval Execution:**
   - Multi-tier requests create ordered `approval_steps`. Step $N+1$ unlocks only after Step $N$ is marked `APPROVED`.
6. **Delegation of Authority:**
   - Active delegations in `user_delegations` allow a designated substitute to act on behalf of an approver.
   - Constraints enforce:
     - `starts_at <= CURRENT_TIMESTAMP AND ends_at >= CURRENT_TIMESTAMP`.
     - `delegatee_user_id <> maker_user_id`.
     - Transaction amount $\le$ `max_amount` delegated.
     - Full audit logging records both delegator and delegatee.
7. **Expiration & Invalidation:**
   - Unapproved requests expire automatically at `expires_at`.
   - **Payload Invalidation Trigger:** Any update to a document in `PENDING` status recalculates `SHA256(canonical_payload)`. If the hash does not match `approval_requests.payload_sha256`, the approval request is immediately transitioned to `INVALIDATED`.
8. **Duplicate Execution Prevention:**
   - `SELECT FOR UPDATE` on `approval_requests` guarantees atomic single-execution.
9. **Step-Up Authentication:**
   - For transactions exceeding high-value thresholds or sensitive assets, `requires_mfa_step_up = true`. The checker must successfully verify a 6-digit cryptographic OTP (`auth_otps`) delivered via SMS/Email before the approval transaction commits.

---

### 2.3 Division of Architectural Responsibility

| Responsibility Layer | Application Service Layer | Database Engine (Triggers & Constraints) |
|---|---|---|
| **Payload Serialization & Hashing** | **Primary:** Canonicalizes JSON and computes SHA-256 hash. | **Audit:** Verifies hash integrity during commit. |
| **Maker $\ne$ Checker Validation** | **Pre-check:** Rejects invalid checker in UI/API. | **Hard Backstop:** Trigger `tg_enforce_maker_checker_integrity` aborts transaction if violated. |
| **Row Locking & State Transition** | **Orchestrates:** Issues `SELECT FOR UPDATE` within transaction. | **Enforces:** PostgreSQL lock manager guarantees mutual exclusion. |
| **Approval History Immutability** | **Writes:** Inserts `approval_actions` record. | **Hard Backstop:** Trigger blocks `UPDATE` or `DELETE` on `approval_actions`. |
| **MFA / Step-Up OTP Verification** | **Primary:** Validates OTP token against expiry and attempts. | **Backstop:** Validates `step_up_otp_verified = true` on action record. |

---

## SECTION 3: POSTGRESQL ROW-LEVEL SECURITY (RLS) & PRIVILEGE ARCHITECTURE

### 3.1 Principle of Least Privilege: Role Separation

```
[ db_migrator ] (DDL Owner)
  - Owns all tables, views, sequences.
  - Executes schema migrations.
  - Has NO access from web runtime or background workers.
       |
       +---> [ app_user ] (Web Connection Pool)
       |       - Granted: SELECT, INSERT, UPDATE, DELETE on domain tables.
       |       - Granted: SELECT, INSERT ONLY on ledgers and audit tables.
       |       - CANNOT bypass RLS (FORCE ROW LEVEL SECURITY active).
       |
       +---> [ app_worker ] (pg-boss Background Worker Pool)
               - Executes scheduled and asynchronous jobs.
               - CANNOT bypass RLS. Context set per job token.
```

---

### 3.2 Transaction-Local Security Context Injection (PgBouncer-Safe)
In modern containerized deployments, connection pooling (PgBouncer in `pool_mode = transaction`) is standard. **Session-level variables (`SET app.var = ...`) leak across pooled transactions and cause severe security breaches.**

ZemiFix mandates **Transaction-Scoped Configuration** via `SET LOCAL`:
```sql
-- Executed immediately after BEGIN inside the transaction block:
BEGIN;
SELECT set_config('app.current_user_id', '0192e4a8-7612-7000-8000-000000000001', true);
SELECT set_config('app.current_branch_id', '0192e4a8-7612-7000-8000-000000000002', true);
SELECT set_config('app.current_scope', 'BRANCH_AND_BELOW', true);
SELECT set_config('app.current_dept_id', '0192e4a8-7612-7000-8000-000000000003', true);

-- All domain queries executed here evaluate RLS against these variables.

COMMIT; -- Automatically clears all 'app.*' settings from the connection.
```

---

### 3.3 Complete RLS Policy Matrix

```sql
-- 1. Enable and Force RLS
ALTER TABLE work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_orders FORCE ROW LEVEL SECURITY;

-- 2. Staff Policy
CREATE POLICY wo_staff_scope_policy ON work_orders
FOR ALL TO app_user
USING (
  -- Company Wide
  current_setting('app.current_scope', true) = 'COMPANY'
  OR
  -- Branch and Sub-branches (Materialized Path Match)
  (
    current_setting('app.current_scope', true) = 'BRANCH_AND_BELOW'
    AND branch_id IN (
      SELECT id FROM branches 
      WHERE path LIKE (SELECT path FROM branches WHERE id = current_setting('app.current_branch_id', true)::uuid) || '%'
    )
  )
  OR
  -- Exact Branch Only
  (
    current_setting('app.current_scope', true) = 'BRANCH'
    AND branch_id = current_setting('app.current_branch_id', true)::uuid
  )
  OR
  -- Assigned Technician Only (Own Scope)
  (
    current_setting('app.current_scope', true) = 'OWN'
    AND (
      assigned_technician_id = current_setting('app.current_user_id', true)::uuid
      OR created_by_user_id = current_setting('app.current_user_id', true)::uuid
    )
  )
);

-- 3. Customer Portal Policy
CREATE POLICY wo_portal_customer_isolation ON work_orders
FOR SELECT TO app_user
USING (
  current_setting('app.portal_contact_id', true) IS NOT NULL
  AND customer_id = (
    SELECT customer_id FROM customer_contacts 
    WHERE id = current_setting('app.portal_contact_id', true)::uuid
  )
  AND (
    customer_site_id IS NULL OR customer_site_id IN (
      SELECT customer_site_id FROM customer_contact_site_grants
      WHERE customer_contact_id = current_setting('app.portal_contact_id', true)::uuid
    )
  )
);
```

---

### 3.4 Background Worker Authorization & Limits of RLS
1. **Worker Scope:** Background jobs executed by `pg-boss` do not run as database superusers. The worker inspects the job envelope, establishes a transaction, and executes `SET LOCAL` with the user credentials who queued the task (or a dedicated system service identity bounded by company scope).
2. **Limits of RLS as a Defensive Backstop:**
   - RLS does not defend against SQL injection if dynamic raw SQL strings are concatenated.
   - RLS does not validate complex multi-table business state transitions (e.g. valid PO line quantities during receipt).
   - RLS carries query planner overhead on recursive joins; materialized paths and branch index clusters are mandatory.
   - Therefore, RLS acts as a **mandatory defense-in-depth security backstop**, while domain services enforce business logic.

---

## SECTION 4: GHANA STATUTORY TAX ENGINE FORMULAS (JAN 1, 2026 REFORMS)

### 4.1 Statutory Levies & Rate Architecture
Under the Ghana Revenue Authority VAT reforms effective January 1, 2026:
- **Value Added Tax (VAT):** 15.0% (`0.1500`)
- **National Health Insurance Levy (NHIL):** 2.5% (`0.0250`)
- **Ghana Education Trust Fund (GETFund):** 2.5% (`0.0250`)
- **COVID-19 Health Recovery Levy:** Abolished (`0.0000`)

---

### 4.2 Explicit Mathematical Algorithms

#### 1. Tax-Exclusive Pricing (Commercial Work Orders & Invoices)
Given line items $i = 1 \dots n$ with taxable quantity $q_i$ and unit selling price $p_i$:

1. **Taxable Base Supply ($B$):**
   $$B = \sum_{i=1}^{n} \text{ROUND}(q_i \times p_i, 2) \quad \forall \ i \text{ where } \text{is\_taxable} = \text{true}$$

2. **Component Calculations (Parallel Flat Base):**
   $$\text{NHIL Amount} = \text{ROUND}(B \times 0.0250, 2)$$
   $$\text{GETFund Amount} = \text{ROUND}(B \times 0.0250, 2)$$
   $$\text{VAT Amount} = \text{ROUND}(B \times 0.1500, 2)$$

3. **Total Tax ($T$) and Total Payable ($G$):**
   $$T = \text{NHIL Amount} + \text{GETFund Amount} + \text{VAT Amount}$$
   $$G = B + T + \sum_{\text{non-taxable}} (q_j \times p_j)$$

---

#### 2. Tax-Inclusive Pricing (Retail Outlets & Fixed Consumer Quotes)
When a customer is quoted an all-inclusive price $G_{\text{gross}}$:

1. **Combined Effective Tax Rate ($R_{\text{combined}}$):**
   $$R_{\text{combined}} = 0.0250 + 0.0250 + 0.1500 = 0.2000 \quad (20.0\%)$$

2. **Derived Taxable Base ($B$):**
   $$B = \text{ROUND}\left(\frac{G_{\text{gross}}}{1 + R_{\text{combined}}}, 2\right) = \text{ROUND}\left(\frac{G_{\text{gross}}}{1.2000}, 2\right)$$

3. **Component Levies & Discrepancy Reconciliation:**
   $$\text{NHIL} = \text{ROUND}(B \times 0.0250, 2)$$
   $$\text{GETFund} = \text{ROUND}(B \times 0.0250, 2)$$
   $$\text{Tentative VAT} = \text{ROUND}(B \times 0.1500, 2)$$
   $$\Delta_{\text{rounding}} = G_{\text{gross}} - (B + \text{NHIL} + \text{GETFund} + \text{Tentative VAT})$$
   $$\text{Final VAT} = \text{Tentative VAT} + \Delta_{\text{rounding}}$$

This guarantees that $B + \text{NHIL} + \text{GETFund} + \text{Final VAT} \equiv G_{\text{gross}}$ down to the exact pesewa.

---

#### 3. Exemptions, Zero-Rating & Effective Dates
- **Exempt Supplies (`is_exempt = true`):** Levies calculated at `0.0000`. Statutory exemption clause recorded. No input tax creditable.
- **Zero-Rated Supplies (`is_zero_rated = true`):** Levies calculated at `0.0000`. Input tax creditable.
- **Effective-Date Resolution:**
  $$\text{Active Component Query: } \text{tax\_components.effective\_from} \le \text{invoice.invoice\_date} \land (\text{effective\_to IS NULL} \lor \text{effective\_to} \ge \text{invoice.invoice\_date})$$

---

## SECTION 5: TRACEABILITY MATRIX (ARCHITECTURE SPEC V1 TO DATA MODEL)

| Specification V1 Section | Business Capability | Database Entities Implementing Capability | Release | Architectural Data Flow & Verification |
|---|---|---|:---:|---|
| **Section 3.1** | Dual Operating Modes (FM & Contractor) | `companies`, `assets`, `work_orders`, `customers`, `customer_sites`, `customer_contracts` | R1/R2 | Handled within single engine; `customer_id` NULL denotes in-house FM, NOT NULL denotes billable contractor ticket. |
| **Section 3.6** | Single-Company Fleet Isolation | `companies.singleton_enforcer` | R1 | Single deployment per database; UNIQUE constraint prevents multi-company data co-mingling. |
| **Section 4.1** | Branch Regional Hierarchy | `branches` | R1 | Recursive adjacency list + `path` column for fast tree and sub-tree querying. |
| **Section 4.2** | RBAC & Permission Catalog | `roles`, `permissions`, `role_permissions`, `users`, `user_scope_grants` | R1 | Resource/action permission pairing enforced by service layer and RLS. |
| **Section 4.3** | Temporary Authority Delegation | `user_delegations` | R2 | Start/end date bounded approval authority transfer with amount capping. |
| **Section 5.1** | Physical Asset Register & Hierarchy | `asset_categories`, `locations`, `assets`, `asset_locations_history` | R1 | Multi-tier location tree; historical relocation audit logging. |
| **Section 5.2** | Equipment BOM (Bill of Materials) | `asset_boms`, `parts` | R1 | Approved spare parts list linked to asset category or discrete asset. |
| **Section 5.3** | Meter Telemetry & Condition Tracking | `asset_meters`, `meter_readings` | R1 | Cumulative runtime counters; triggers PM occurrences upon threshold breach. |
| **Section 5.4** | Asset Downtime & Reliability (MTBF/MTTR)| `asset_downtime_logs`, `failure_codes`, `kpi_snapshots` | R1 | Start/end downtime tracking; automated MTBF and MTTR analytics. |
| **Section 6.1** | Maintenance Requests & Triage | `work_requests`, `customer_contacts` | R1 | Inbound internal and client requests converted to formal work orders. |
| **Section 6.2** | Work Order Execution & 10-State Machine | `work_orders`, `work_order_status_history`, `work_order_tasks` | R1 | Formal 10-state lifecycle with strict state transition validation. |
| **Section 6.3** | Technician Dispatch & Mobile Tracking | `work_order_dispatches`, `work_order_assignment_history` | R1 | Mobilization, on-site arrival, and multi-technician team tracking. |
| **Section 6.4** | Quality Checklists & Field Evidence | `checklist_templates`, `checklist_template_items`, `work_order_checklist_items` | R1 | Mandatory field SOP checkpoints with pass/fail and photo document verification. |
| **Section 6.5** | Job Costing (Labor, Parts, Expenses) | `work_order_labor`, `work_order_parts`, `work_order_expenses`, `work_order_subcontractors` | R1 | Direct job cost accumulation driving WIP and customer billing. |
| **Section 6.6** | SLA Tracking & Clock Pauses | `work_order_sla_events`, `work_order_sla_pauses` | R1 | SLA response/resolution clocks with documented pause/resume history. |
| **Section 6.7** | Work Verification & Reopening | `work_order_verifications`, `work_order_reopen_history` | R1 | Quality sign-off, digital signatures, and recurring failure audit. |
| **Section 7.1** | PM Planning & Trigger Engine | `pm_plans`, `pm_occurrences` | R1 | Time interval and meter threshold PM generation. |
| **Section 7.2** | Maintenance Backlog & Missed PM Tracking | `pm_compliance_records`, `missed_pm_incidents`, `maintenance_backlog_snapshots` | R1/R2 | Aging analysis of unexecuted work orders; statutory missed PM incident logs. |
| **Section 8.1** | Safety Inspections & Certificates | `inspection_templates`, `inspections`, `inspection_items`, `statutory_certificates` | R2 | Regulatory compliance inspections (EPA, Factories Inspectorate). |
| **Section 8.2** | Permits to Work (PTW) & LOTO Isolation | `permits_to_work`, `loto_procedures`, `loto_isolation_points`, `loto_lock_applications` | R2 | Safe systems of work; physical lockout/tagout padlocks audit. |
| **Section 9.1** | Multi-Warehouse & Van Stores | `stores`, `parts`, `stock` | R1 | Central depot, regional warehouse, and mobile van inventory. |
| **Section 9.2** | Double-Entry Stock Ledger & Valuation | `stock_transactions` | R1 | Immutable ledger; moving weighted average costing (AVCO/WAC). |
| **Section 9.3** | Inter-Warehouse Stock Transfers | `store_transfers`, `store_transfer_lines`, `store_transfer_discrepancies` | R1 | Dispatch $\rightarrow$ In-Transit $\rightarrow$ Receipt with transit damage tracking. |
| **Section 9.4** | Stock Counting & Cycle Audits | `stock_counts`, `stock_count_lines` | R2 | Variance analysis between system balance and physical count. |
| **Section 10.1** | Supplier Procurement & Requisitions | `vendors`, `purchase_requisitions`, `purchase_orders`, `purchase_order_lines` | R1 | Requisition approval $\rightarrow$ PO contract generation $\rightarrow$ Change orders. |
| **Section 10.2** | Goods Inward & Receiving Discrepancies | `goods_receipts`, `goods_receipt_lines`, `goods_receipt_discrepancies` | R1 | Warehouse delivery acceptance, damage inspection, short-shipments. |
| **Section 10.3** | Three-Way Matching & Accounts Payable | `supplier_invoices`, `supplier_invoice_lines`, `three_way_matches` | R1 | Automated PO vs GRN vs Invoice quantity/price tolerance checks. |
| **Section 11.1** | Commercial Contracts & Price Books | `customer_contracts`, `contract_rate_cards`, `rate_card_lines` | R2 | Service agreements, hourly labor tariffs, and material markups. |
| **Section 11.2** | Quotations & Estimates | `quotes`, `quote_lines` | R2 | Commercial proposals with customer approval workflows. |
| **Section 11.3** | Unbilled Work (WIP) & Recurring Billing | `unbilled_work_items`, `recurring_billing_schedules`, `contract_billing_milestones` | R2 | Work in progress accrual; automated periodic contract retainers. |
| **Section 11.4** | Tax Invoicing & Credit Notes | `invoices`, `invoice_lines`, `credit_notes`, `credit_note_lines`, `number_sequences` | R2 | Controlled statutory numbering; credit rectification notes. |
| **Section 11.5** | Customer Payments & Receipts | `payments`, `payment_allocations`, `payment_reversals`, `refunds` | R2 | Mobile Money (MoMo), card, bank reconciliation, and FIFO allocations. |
| **Section 11.6** | Customer Statements & Aged Receivables | `customer_statement_runs`, `aged_receivables_snapshots` | R2 | 30/60/90/120+ day debtor balances; automated monthly statements. |
| **Section 12.1** | Multi-Tier Maker-Checker Governance | `approval_rules`, `approval_requests`, `approval_steps`, `approval_actions` | R1 | Dual control with cryptographic payload hash verification. |
| **Section 13.1** | Tamper-Evident Security Audit Log | `audit_logs` | R1 | SHA-256 chained transaction audit trail. |
| **Section 13.2** | Central Document Master & Malware Scan | `documents`, `document_versions` | R1 | Cloud file storage metadata, SHA-256 hashes, and antivirus audit. |
| **Section 13.3** | Multi-Channel Notifications & Escalation| `notification_templates`, `notifications`, `notification_delivery_attempts`, `notification_escalation_rules`| R1/R2 | SMS, Email, In-App alerts with Telco webhook delivery confirmation. |
| **Section 14.1** | Business Intelligence & Executive KPIs | `report_definitions`, `scheduled_reports`, `kpi_snapshots` | R1/R2 | Pre-calculated dashboard telemetry and automated report dispatch. |
| **Section 14.2** | Offline Mobile Synchronization | `offline_sync_batches`, `offline_sync_mutations`, `offline_sync_conflicts` | R2 | Mobile technician offline queue, idempotency, and conflict resolution. |
| **Section 14.3** | Data Privacy & Retention (Act 843) | `privacy_consents`, `data_subject_requests`, `data_retention_policies` | R2 | Ghana Data Protection Act 2012 compliance and automated lifecycle purge. |

---

## SECTION 6: RIGOROUS SEVEN-STAGE MIGRATION ROADMAP

### 6.1 Zero-Downtime Migration Strategy vs. Maintenance Window Reality
- **True Zero-Downtime:** Requires the Expand/Contract (Blue/Green) pattern: new columns added as nullable, application updated to dual-write both old and new structures, background backfill executed, application updated to read from new structure, old structure dropped.
- **Controlled Maintenance Window Strategy:** For the initial transition from the prototype (7 foundation tables) to v2.1, executing migrations in a controlled 15-minute maintenance window is recommended to avoid unnecessary dual-write technical debt.
- **Data Preservation Guarantee:** The 7 existing Prisma models (`Company`, `Branch`, `Department`, `User`, `Role`, `Permission`, `RolePermission`) are preserved intact. All alterations use non-destructive `ADD COLUMN` operations with sensible defaults. Existing administrator accounts (`INITIAL_ADMIN_EMAIL`) retain their role, branch, and login credentials without disruption.

---

### 6.2 Stage-by-Stage Implementation & Dependency Graph

```
[ Stage 1: Foundation Alignment & Identity Realms ]
  - Preserve 7 existing tables.
  - Add: user_scope_grants, user_delegations, customer_contacts, 
         customer_contact_site_grants, portal_sessions, auth_otps, api_keys.
       |
       v
[ Stage 2: Calendars, Skills & Asset Master Hierarchy ]
  - Add: business_calendars, calendar_working_hours, calendar_holidays, technician_shifts.
  - Add: skills, technician_skills, certifications, technician_certifications.
  - Add: asset_categories, locations, assets, asset_locations_history, asset_boms, asset_meters, meter_readings.
       |
       v
[ Stage 3: Work Orders, Checklists & Safety (PTW / LOTO) ]
  - Add: work_requests, work_orders, work_order_status_history, work_order_dispatches, work_order_tasks.
  - Add: failure_codes, checklist_templates, permits_to_work, loto_procedures.
       |
       v
[ Stage 4: Inventory Master, Transfers & Stock Ledger ]
  - Add: stores, parts, stock, stock_transactions (paired ledger),
         store_transfers, store_transfer_lines, store_transfer_discrepancies.
       |
       v
[ Stage 5: Procurement Lifecycle & Three-Way Matching ]
  - Add: vendors, purchase_requisitions, purchase_orders, goods_receipts,
         supplier_invoices, three_way_matches.
       |
       v
[ Stage 6: Commercials, Ghana 2026 Tax Engine & Receivables ]
  - Add: customers, customer_sites, customer_contracts, contract_rate_cards, quotes.
  - Add: tax_regimes, tax_components (VAT 15%, NHIL 2.5%, GETFund 2.5%),
         invoices, invoice_tax_lines, credit_notes, payments, payment_allocations.
       |
       v
[ Stage 7: Governance, Audit Chaining, Sync & Security Hardening ]
  - Add: approval_rules, approval_requests, approval_steps, approval_actions.
  - Add: audit_logs (SHA-256 chain), documents, offline_sync_batches, privacy tables.
  - Enable FORCE ROW LEVEL SECURITY and deploy database enforcing triggers.
```

---

### 6.3 Pre-Migration, Verification & Rollback Procedures

#### 1. Pre-Migration Verification
Before running each stage on the target database:
- Create an automated physical snapshot (`pg_dump -Fc`).
- Verify existing administrator account:
  ```sql
  SELECT id, email, role_id, is_active FROM users WHERE email = 'admin@zemifix.com';
  ```
- Run migration scripts against an isolated staging replica with identical row counts.

#### 2. Intermediate Verification Gate (Post-Stage Validation)
Each stage executes automated validation assertions before proceeding to the next stage:
```sql
DO $$
BEGIN
  -- Validate Stage 1
  ASSERT (SELECT count(*) FROM information_schema.tables WHERE table_name = 'customer_contacts') = 1, 'Stage 1 Failed: customer_contacts missing';
  -- Validate Admin Intact
  ASSERT (SELECT count(*) FROM users WHERE is_active = true) >= 1, 'Integrity Failure: Admin user lost';
END $$;
```

#### 3. Rollback Protocol
Every migration file is paired with an exact down-migration (`migration.down.sql`):
- All down-migrations drop newly created dependent tables in reverse topological order.
- Existing foundation tables are restored to their original column states without truncating data.
- If an assertion fails, the transaction is rolled back immediately (`ROLLBACK`), restoring the previous consistent database snapshot.

---

## SECTION 7: FINAL DATABASE DESIGN APPROVAL PACKAGE

### A. Master Entity Inventory (142 Entities Across 14 Domains)
*(Preserved exactly at 142 entities as reconciled and provisionally approved.)*
1. **Domain 01 (Identity & Access):** `companies`, `branches`, `departments`, `roles`, `permissions`, `role_permissions`, `users`, `user_scope_grants`, `user_delegations`, `customer_contacts`, `customer_contact_site_grants`, `portal_sessions`, `auth_otps`, `api_keys`. (14 entities)
2. **Domain 02 (Calendars & Scheduling):** `business_calendars`, `calendar_working_hours`, `calendar_holidays`, `technician_shifts`, `technician_leave`, `technician_availability_exceptions`. (6 entities)
3. **Domain 03 (Workforce Skills & Certs):** `skills`, `technician_skills`, `certifications`, `technician_certifications`. (4 entities)
4. **Domain 04 (Asset Master & BOM):** `asset_categories`, `locations`, `assets`, `asset_locations_history`, `asset_ownership_history`, `asset_status_history`, `asset_meters`, `meter_readings`, `asset_downtime_logs`, `asset_boms`, `asset_warranty_claims`, `asset_disposals`. (12 entities)
5. **Domain 05 (Work Order Execution):** `work_requests`, `work_orders`, `work_order_status_history`, `work_order_dispatches`, `work_order_assignment_history`, `failure_codes`, `work_order_failure_records`, `work_order_tasks`, `checklist_templates`, `checklist_template_items`, `work_order_checklist_items`, `work_order_labor`, `work_order_parts`, `work_order_expenses`, `work_order_subcontractors`, `work_order_sla_events`, `work_order_sla_pauses`, `work_order_verifications`, `work_order_reopen_history`, `work_order_cost_approvals`, `work_order_comments`. (21 entities)
6. **Domain 06 (Preventive Maintenance):** `pm_plans`, `pm_occurrences`, `pm_compliance_records`, `missed_pm_incidents`, `maintenance_backlog_snapshots`. (5 entities)
7. **Domain 07 (Safety, PTW & LOTO):** `inspection_templates`, `inspections`, `inspection_items`, `statutory_certificates`, `permits_to_work`, `loto_procedures`, `loto_isolation_points`, `loto_lock_applications`. (8 entities)
8. **Domain 08 (Inventory & Stock Ledger):** `stores`, `parts`, `stock`, `stock_transactions`, `store_transfers`, `store_transfer_lines`, `store_transfer_discrepancies`, `stock_counts`, `stock_count_lines`. (9 entities)
9. **Domain 09 (Procurement & 3-Way Match):** `vendors`, `purchase_requisitions`, `purchase_requisition_lines`, `purchase_orders`, `purchase_order_lines`, `purchase_order_amendments`, `goods_receipts`, `goods_receipt_lines`, `goods_receipt_discrepancies`, `supplier_invoices`, `supplier_invoice_lines`, `three_way_matches`. (12 entities)
10. **Domain 10 (Contractor Commercials):** `customers`, `customer_sites`, `customer_contracts`, `contract_rate_cards`, `rate_card_lines`, `contract_billing_milestones`, `recurring_billing_schedules`, `quotes`, `quote_lines`, `unbilled_work_items`, `contract_profitability_snapshots`. (11 entities)
11. **Domain 11 (Taxation & Invoicing):** `tax_regimes`, `tax_components`, `invoices`, `invoice_lines`, `invoice_tax_lines`, `credit_notes`, `credit_note_lines`, `payments`, `payment_allocations`, `payment_reversals`, `refunds`, `customer_statement_runs`, `aged_receivables_snapshots`, `number_sequences`, `voided_number_audit`. (15 entities)
12. **Domain 12 (Dual-Control Governance):** `approval_rules`, `approval_requests`, `approval_steps`, `approval_actions`, `emergency_provisional_authorizations`. (5 entities)
13. **Domain 13 (Audit, Files & Alerts):** `audit_logs`, `activity_logs`, `documents`, `document_versions`, `notification_templates`, `notification_preferences`, `notifications`, `notification_delivery_attempts`, `notification_escalation_rules`. (9 entities)
14. **Domain 14 (BI, Sync & Privacy):** `report_definitions`, `scheduled_reports`, `kpi_snapshots`, `webhook_subscriptions`, `webhook_deliveries`, `offline_sync_batches`, `offline_sync_mutations`, `offline_sync_conflicts`, `privacy_consents`, `data_subject_requests`, `data_retention_policies`. (11 entities)

---

### B. Summary of Targeted v2.1 Corrections
| Area Corrected | Entity Count Impact | Relationship & Constraint Impact | Implementation Rule Impact |
|---|:---:|---|---|
| **1. Inventory Ledger** | **Zero** (retains 9 tables) | Added `transaction_group_id`, `reversed_transaction_id`, `source_store_id`, `destination_store_id` to `stock_transactions`. Added deterministic lock order. | Mandatory double-entry ledger pairing; Moving WAC formula established; Direct balance mutations prohibited. |
| **2. Dual Control** | **Zero** (retains 5 tables) | Added `payload_sha256` invalidation trigger and step-up OTP validation to `approval_requests` and `approval_actions`. | Strict Maker $\ne$ Checker $\ne$ Last Editor enforcement at both service and DB transaction boundaries. |
| **3. PostgreSQL RLS** | **Zero** | `FORCE ROW LEVEL SECURITY` specified on all partitioned tables; Materialized path sub-branch query formalized. | Replaced session `SET` with PgBouncer-safe `SET LOCAL` scoped strictly to `BEGIN ... COMMIT`. |
| **4. Ghana Tax Engine** | **Zero** (retains 15 tables)| Added exact rounding discrepancy reconciliation algorithm between component levies and gross totals. | Initial baseline reflects Jan 1, 2026 reforms: VAT (15%), NHIL (2.5%), GETFund (2.5%), COVID levy abolished. |
| **5. Traceability Matrix**| **Zero** | Explicit mapping of all v1 specification sections to database structures and data flows. | Formal verification criteria established for every functional module. |
| **6. Migration Roadmap** | **Zero** | Structured 7-stage non-destructive migration roadmap with intermediate verification gates and rollback plans. | Zero downtime vs maintenance window trade-off documented; Existing data and admin account preserved. |

---

### C. Unresolved Issues Register for Subsequent Implementation Phases
1. **Ghana GRA Certified Invoicing (VSDC Integration):**  
   *Decision Pending:* Whether ZemiFix will integrate directly with GRA's VSDC QR-code signing API in Release 2, or operate as an internal e-invoicing record engine in Release 1.
2. **Mobile Offline SQLite Encryption Standard:**  
   *Decision Pending:* Standardizing on SQLCipher (AES-256) versus the browser-native Origin Private File System (OPFS) Web Crypto API for technician offline storage.
3. **Ghana Payment Gateway Prioritization:**  
   *Decision Pending:* Selection of primary payment gateway and failover routing between Paystack, Hubtel, and direct Arkesel MoMo aggregation.

---
*End of Architectural Specification — ZemiFix CMMS Database Design v2.1.0-FINAL-BASELINE*
