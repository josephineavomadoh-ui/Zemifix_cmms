-- =============================================================================
-- ZemiFix CMMS — Migration: Stage D.3 Inventory Management & Stock Ledger
-- Engine Target: PostgreSQL 16, 17 & 18
-- Sequence Number: 20261110000003_stage_d3_inventory_management
-- =============================================================================

-- 1. Create Enums
CREATE TYPE "InventoryTransactionType" AS ENUM ('OPENING_BALANCE', 'RECEIPT', 'ISSUE', 'TRANSFER_OUT', 'TRANSFER_IN', 'ADJUSTMENT_IN', 'ADJUSTMENT_OUT', 'RETURN_IN', 'RETURN_OUT', 'REVERSAL');
CREATE TYPE "TransferStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'DISPATCHED', 'RECEIVED', 'CANCELLED');
CREATE TYPE "StockAdjustmentStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'CANCELLED');

-- 2. Create Tables
CREATE TABLE "parts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "partNumber" VARCHAR(50) NOT NULL,
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "category" VARCHAR(50) NOT NULL DEFAULT 'SPARE_PARTS',
  "subcategory" VARCHAR(50),
  "uom" VARCHAR(20) NOT NULL DEFAULT 'PCS',
  "barcode" VARCHAR(100),
  "manufacturer" VARCHAR(100),
  "brand" VARCHAR(100),
  "modelNumber" VARCHAR(100),
  "preferredVendor" VARCHAR(150),
  "minStockLevel" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "maxStockLevel" DECIMAL(14,2),
  "reorderLevel" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "reorderQuantity" DECIMAL(14,2) NOT NULL DEFAULT 1.00,
  "standardCost" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "averageCost" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "parts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "parts_partNumber_key" UNIQUE ("partNumber"),
  CONSTRAINT "parts_barcode_key" UNIQUE ("barcode")
);

CREATE TABLE "stores" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(30) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "type" VARCHAR(30) NOT NULL DEFAULT 'MAIN',
  "branchId" UUID NOT NULL,
  "departmentId" UUID,
  "isMain" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "managerUserId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "stores_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stores_code_key" UNIQUE ("code"),
  CONSTRAINT "stores_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "stores_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL,
  CONSTRAINT "stores_managerUserId_fkey" FOREIGN KEY ("managerUserId") REFERENCES "users"("id") ON DELETE SET NULL
);

CREATE TABLE "stock" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "storeId" UUID NOT NULL,
  "partId" UUID NOT NULL,
  "quantityOnHand" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "quantityReserved" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "quantityAvailable" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "quantityOnOrder" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "averageUnitCost" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "totalValue" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "binLocation" VARCHAR(50),
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_storeId_partId_key" UNIQUE ("storeId", "partId"),
  CONSTRAINT "stock_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT,
  CONSTRAINT "stock_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT
);

CREATE TABLE "stock_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transactionRef" VARCHAR(50) NOT NULL,
  "transactionType" "InventoryTransactionType" NOT NULL,
  "storeId" UUID NOT NULL,
  "partId" UUID NOT NULL,
  "quantity" DECIMAL(14,2) NOT NULL,
  "unitCost" DECIMAL(14,2) NOT NULL,
  "totalCost" DECIMAL(14,2) NOT NULL,
  "balanceAfter" DECIMAL(14,2) NOT NULL,
  "wacAfter" DECIMAL(14,2) NOT NULL,
  "referenceDoc" VARCHAR(100),
  "workOrderId" UUID,
  "transactionGroupId" UUID,
  "actingUserId" UUID NOT NULL,
  "approvalRequestId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_transactions_transactionRef_key" UNIQUE ("transactionRef"),
  CONSTRAINT "stock_transactions_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT,
  CONSTRAINT "stock_transactions_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT,
  CONSTRAINT "stock_transactions_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL,
  CONSTRAINT "stock_transactions_actingUserId_fkey" FOREIGN KEY ("actingUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "stock_transactions_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE SET NULL
);

CREATE TABLE "store_transfers" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transferNumber" VARCHAR(50) NOT NULL,
  "sourceStoreId" UUID NOT NULL,
  "destinationStoreId" UUID NOT NULL,
  "status" "TransferStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
  "requestedByUserId" UUID NOT NULL,
  "approvedByUserId" UUID,
  "approvalRequestId" UUID,
  "dispatchedAt" TIMESTAMPTZ,
  "receivedAt" TIMESTAMPTZ,
  "notes" TEXT,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "store_transfers_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_transfers_transferNumber_key" UNIQUE ("transferNumber"),
  CONSTRAINT "store_transfers_sourceStoreId_fkey" FOREIGN KEY ("sourceStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT,
  CONSTRAINT "store_transfers_destinationStoreId_fkey" FOREIGN KEY ("destinationStoreId") REFERENCES "stores"("id") ON DELETE RESTRICT,
  CONSTRAINT "store_transfers_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "store_transfers_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "store_transfers_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE SET NULL
);

CREATE TABLE "store_transfer_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "transferId" UUID NOT NULL,
  "partId" UUID NOT NULL,
  "quantityRequested" DECIMAL(14,2) NOT NULL,
  "quantityDispatched" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "quantityReceived" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT "store_transfer_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "store_transfer_lines_transferId_partId_key" UNIQUE ("transferId", "partId"),
  CONSTRAINT "store_transfer_lines_transferId_fkey" FOREIGN KEY ("transferId") REFERENCES "store_transfers"("id") ON DELETE RESTRICT,
  CONSTRAINT "store_transfer_lines_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT
);

CREATE TABLE "stock_adjustments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adjustmentNumber" VARCHAR(50) NOT NULL,
  "storeId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "StockAdjustmentStatus" NOT NULL DEFAULT 'DRAFT',
  "countDate" DATE NOT NULL,
  "countedByUserId" UUID NOT NULL,
  "reviewedByUserId" UUID,
  "approvalRequestId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "stock_adjustments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_adjustments_adjustmentNumber_key" UNIQUE ("adjustmentNumber"),
  CONSTRAINT "stock_adjustments_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT,
  CONSTRAINT "stock_adjustments_countedByUserId_fkey" FOREIGN KEY ("countedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "stock_adjustments_reviewedByUserId_fkey" FOREIGN KEY ("reviewedByUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "stock_adjustments_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE SET NULL
);

CREATE TABLE "stock_adjustment_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "adjustmentId" UUID NOT NULL,
  "partId" UUID NOT NULL,
  "systemQuantity" DECIMAL(14,2) NOT NULL,
  "countedQuantity" DECIMAL(14,2) NOT NULL,
  "variance" DECIMAL(14,2) NOT NULL,
  "unitCost" DECIMAL(14,2) NOT NULL,
  "adjustmentType" "InventoryTransactionType" NOT NULL,
  CONSTRAINT "stock_adjustment_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "stock_adjustment_lines_adjustmentId_partId_key" UNIQUE ("adjustmentId", "partId"),
  CONSTRAINT "stock_adjustment_lines_adjustmentId_fkey" FOREIGN KEY ("adjustmentId") REFERENCES "stock_adjustments"("id") ON DELETE RESTRICT,
  CONSTRAINT "stock_adjustment_lines_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE RESTRICT
);

-- Foreign keys on asset_boms and work_order_parts linking to parts
ALTER TABLE "asset_boms"
  ADD CONSTRAINT "asset_boms_partId_fkey"
  FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL;

ALTER TABLE "work_order_parts"
  ADD CONSTRAINT "work_order_parts_partId_fkey"
  FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL;

-- 3. Check Constraints & Indexes
ALTER TABLE "parts" ADD CONSTRAINT "chk_parts_min_non_negative" CHECK ("minStockLevel" >= 0);
ALTER TABLE "parts" ADD CONSTRAINT "chk_parts_reorder_positive" CHECK ("reorderQuantity" > 0);
ALTER TABLE "stock" ADD CONSTRAINT "chk_stock_on_hand_non_negative" CHECK ("quantityOnHand" >= 0);
ALTER TABLE "stock" ADD CONSTRAINT "chk_stock_reserved_non_negative" CHECK ("quantityReserved" >= 0);
ALTER TABLE "store_transfer_lines" ADD CONSTRAINT "chk_transfer_requested_positive" CHECK ("quantityRequested" > 0);

CREATE INDEX IF NOT EXISTS "parts_partNumber_idx" ON "parts" ("partNumber");
CREATE INDEX IF NOT EXISTS "parts_category_idx" ON "parts" ("category");
CREATE INDEX IF NOT EXISTS "parts_isActive_idx" ON "parts" ("isActive");

CREATE INDEX IF NOT EXISTS "stores_branchId_idx" ON "stores" ("branchId");
CREATE INDEX IF NOT EXISTS "stores_departmentId_idx" ON "stores" ("departmentId");

CREATE INDEX IF NOT EXISTS "stock_storeId_idx" ON "stock" ("storeId");
CREATE INDEX IF NOT EXISTS "stock_partId_idx" ON "stock" ("partId");

CREATE INDEX IF NOT EXISTS "stock_transactions_storeId_partId_idx" ON "stock_transactions" ("storeId", "partId");
CREATE INDEX IF NOT EXISTS "stock_transactions_transactionType_idx" ON "stock_transactions" ("transactionType");
CREATE INDEX IF NOT EXISTS "stock_transactions_workOrderId_idx" ON "stock_transactions" ("workOrderId");
CREATE INDEX IF NOT EXISTS "stock_transactions_transactionGroupId_idx" ON "stock_transactions" ("transactionGroupId");
CREATE INDEX IF NOT EXISTS "stock_transactions_createdAt_idx" ON "stock_transactions" ("createdAt");

CREATE INDEX IF NOT EXISTS "store_transfers_sourceStoreId_idx" ON "store_transfers" ("sourceStoreId");
CREATE INDEX IF NOT EXISTS "store_transfers_destinationStoreId_idx" ON "store_transfers" ("destinationStoreId");
CREATE INDEX IF NOT EXISTS "store_transfers_status_idx" ON "store_transfers" ("status");

CREATE INDEX IF NOT EXISTS "stock_adjustments_storeId_idx" ON "stock_adjustments" ("storeId");
CREATE INDEX IF NOT EXISTS "stock_adjustments_status_idx" ON "stock_adjustments" ("status");

-- 4. Immutability Triggers & Revocations
DROP TRIGGER IF EXISTS trg_stock_transactions_immutable ON "stock_transactions";
CREATE TRIGGER trg_stock_transactions_immutable
  BEFORE UPDATE OR DELETE ON "stock_transactions"
  FOR EACH ROW EXECUTE FUNCTION prevent_history_tampering();

REVOKE TRUNCATE ON "stock_transactions" FROM PUBLIC;
