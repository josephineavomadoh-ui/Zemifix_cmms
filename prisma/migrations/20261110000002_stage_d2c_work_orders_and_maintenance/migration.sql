-- =============================================================================
-- ZemiFix CMMS — Migration: Stage D.2c Work Orders & Maintenance
-- Engine Target: PostgreSQL 16, 17 & 18
-- Sequence Number: 20261110000002_stage_d2c_work_orders_and_maintenance
-- =============================================================================

-- 1. Create Enums
CREATE TYPE "WorkOrderType" AS ENUM ('CORRECTIVE', 'PREVENTIVE', 'EMERGENCY', 'INSPECTION', 'GENERAL');
CREATE TYPE "WorkOrderPriority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'URGENT', 'EMERGENCY');
CREATE TYPE "WorkOrderStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'OPEN', 'ASSIGNED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');
CREATE TYPE "WorkRequestStatus" AS ENUM ('SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'CONVERTED');

-- 2. Create Tables
CREATE TABLE "work_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestNumber" VARCHAR(50) NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "description" TEXT NOT NULL,
  "assetId" UUID,
  "locationId" UUID,
  "branchId" UUID NOT NULL,
  "departmentId" UUID,
  "requesterUserId" UUID NOT NULL,
  "priority" "WorkOrderPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "WorkRequestStatus" NOT NULL DEFAULT 'SUBMITTED',
  "rejectionReason" TEXT,
  "convertedWorkOrderId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_requests_requestNumber_key" UNIQUE ("requestNumber"),
  CONSTRAINT "work_requests_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_requests_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_requests_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_requests_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL,
  CONSTRAINT "work_requests_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "work_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderNumber" VARCHAR(50) NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "description" TEXT NOT NULL,
  "type" "WorkOrderType" NOT NULL DEFAULT 'CORRECTIVE',
  "priority" "WorkOrderPriority" NOT NULL DEFAULT 'MEDIUM',
  "status" "WorkOrderStatus" NOT NULL DEFAULT 'OPEN',
  "assetId" UUID,
  "locationId" UUID,
  "branchId" UUID NOT NULL,
  "departmentId" UUID,
  "supervisorUserId" UUID,
  "assignedUserId" UUID,
  "plannedStart" TIMESTAMPTZ,
  "plannedEnd" TIMESTAMPTZ,
  "actualStart" TIMESTAMPTZ,
  "actualEnd" TIMESTAMPTZ,
  "estimatedHours" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "actualHours" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "estimatedCost" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "cancellationReason" TEXT,
  "approvalRequestId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "work_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_orders_workOrderNumber_key" UNIQUE ("workOrderNumber"),
  CONSTRAINT "work_orders_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_orders_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "locations"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_orders_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL,
  CONSTRAINT "work_orders_supervisorUserId_fkey" FOREIGN KEY ("supervisorUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "work_orders_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "work_orders_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE SET NULL
);

-- Circular FK link from work_requests to convertedWorkOrder
ALTER TABLE "work_requests"
  ADD CONSTRAINT "work_requests_convertedWorkOrderId_fkey"
  FOREIGN KEY ("convertedWorkOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL;

CREATE TABLE "work_order_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderId" UUID NOT NULL,
  "fromStatus" "WorkOrderStatus" NOT NULL,
  "toStatus" "WorkOrderStatus" NOT NULL,
  "changedByUserId" UUID NOT NULL,
  "reason" TEXT,
  "changedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_status_history_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "work_order_assignment_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderId" UUID NOT NULL,
  "assignedUserId" UUID NOT NULL,
  "assignedByUserId" UUID NOT NULL,
  "assignedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_assignment_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_assignment_history_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_assignment_history_assignedUserId_fkey" FOREIGN KEY ("assignedUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_assignment_history_assignedByUserId_fkey" FOREIGN KEY ("assignedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "work_order_tasks" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderId" UUID NOT NULL,
  "taskOrder" SMALLINT NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "isCompleted" BOOLEAN NOT NULL DEFAULT false,
  "completedAt" TIMESTAMPTZ,
  "completedByUserId" UUID,
  CONSTRAINT "work_order_tasks_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_tasks_workOrderId_taskOrder_key" UNIQUE ("workOrderId", "taskOrder"),
  CONSTRAINT "work_order_tasks_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_tasks_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE "work_order_checklist_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderId" UUID NOT NULL,
  "itemOrder" SMALLINT NOT NULL,
  "description" VARCHAR(200) NOT NULL,
  "isMandatory" BOOLEAN NOT NULL DEFAULT true,
  "passFail" BOOLEAN,
  "remarks" TEXT,
  "completedAt" TIMESTAMPTZ,
  "completedByUserId" UUID,
  CONSTRAINT "work_order_checklist_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_checklist_items_workOrderId_itemOrder_key" UNIQUE ("workOrderId", "itemOrder"),
  CONSTRAINT "work_order_checklist_items_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_checklist_items_completedByUserId_fkey" FOREIGN KEY ("completedByUserId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE "work_order_labor" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderId" UUID NOT NULL,
  "technicianUserId" UUID NOT NULL,
  "workDate" DATE NOT NULL,
  "startTime" TIMESTAMPTZ,
  "endTime" TIMESTAMPTZ,
  "hoursWorked" DECIMAL(10,2) NOT NULL,
  "hourlyRate" DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  "totalCost" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "description" TEXT,
  "recordedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_labor_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_labor_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_labor_technicianUserId_fkey" FOREIGN KEY ("technicianUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_labor_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "work_order_parts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderId" UUID NOT NULL,
  "partId" UUID,
  "partNumber" VARCHAR(50) NOT NULL,
  "partName" VARCHAR(150) NOT NULL,
  "quantityPlanned" DECIMAL(14,2) NOT NULL DEFAULT 1.00,
  "quantityConsumed" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "quantityReturned" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "unitCost" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "uom" VARCHAR(20) NOT NULL DEFAULT 'PCS',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_parts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_parts_workOrderId_partNumber_key" UNIQUE ("workOrderId", "partNumber"),
  CONSTRAINT "work_order_parts_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT
);

CREATE TABLE "failure_codes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(30) NOT NULL,
  "category" VARCHAR(50) NOT NULL,
  "description" VARCHAR(150) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "failure_codes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "failure_codes_code_key" UNIQUE ("code")
);

CREATE TABLE "work_order_failure_records" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderId" UUID NOT NULL,
  "failureCodeId" UUID NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_failure_records_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_failure_records_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_failure_records_failureCodeId_fkey" FOREIGN KEY ("failureCodeId") REFERENCES "failure_codes"("id") ON DELETE RESTRICT
);

-- 3. Check Constraints & Indexes
ALTER TABLE "work_order_labor" ADD CONSTRAINT "chk_labor_hours_positive" CHECK ("hoursWorked" > 0);
ALTER TABLE "work_order_parts" ADD CONSTRAINT "chk_parts_planned_non_negative" CHECK ("quantityPlanned" >= 0);
ALTER TABLE "work_orders" ADD CONSTRAINT "chk_wo_dates_valid" CHECK ("actualEnd" IS NULL OR "actualStart" IS NULL OR "actualEnd" >= "actualStart");

CREATE INDEX IF NOT EXISTS "work_requests_branchId_idx" ON "work_requests" ("branchId");
CREATE INDEX IF NOT EXISTS "work_requests_assetId_idx" ON "work_requests" ("assetId");
CREATE INDEX IF NOT EXISTS "work_requests_requesterUserId_idx" ON "work_requests" ("requesterUserId");
CREATE INDEX IF NOT EXISTS "work_requests_status_idx" ON "work_requests" ("status");

CREATE INDEX IF NOT EXISTS "work_orders_branchId_idx" ON "work_orders" ("branchId");
CREATE INDEX IF NOT EXISTS "work_orders_assetId_idx" ON "work_orders" ("assetId");
CREATE INDEX IF NOT EXISTS "work_orders_locationId_idx" ON "work_orders" ("locationId");
CREATE INDEX IF NOT EXISTS "work_orders_status_idx" ON "work_orders" ("status");
CREATE INDEX IF NOT EXISTS "work_orders_type_idx" ON "work_orders" ("type");
CREATE INDEX IF NOT EXISTS "work_orders_assignedUserId_idx" ON "work_orders" ("assignedUserId");
CREATE INDEX IF NOT EXISTS "work_orders_supervisorUserId_idx" ON "work_orders" ("supervisorUserId");

-- 4. History Immutability Triggers & Revocations
DROP TRIGGER IF EXISTS trg_work_order_status_history_immutable ON "work_order_status_history";
CREATE TRIGGER trg_work_order_status_history_immutable
  BEFORE UPDATE OR DELETE ON "work_order_status_history"
  FOR EACH ROW EXECUTE FUNCTION prevent_history_tampering();

DROP TRIGGER IF EXISTS trg_work_order_assignment_history_immutable ON "work_order_assignment_history";
CREATE TRIGGER trg_work_order_assignment_history_immutable
  BEFORE UPDATE OR DELETE ON "work_order_assignment_history"
  FOR EACH ROW EXECUTE FUNCTION prevent_history_tampering();

REVOKE TRUNCATE ON "work_order_status_history" FROM PUBLIC;
REVOKE TRUNCATE ON "work_order_assignment_history" FROM PUBLIC;
