-- =============================================================================
-- ZemiFix CMMS — Migration: Stage D.4 Procurement & Vendor Management
-- Engine Target: PostgreSQL 16, 17 & 18
-- Sequence Number: 20261110000004_stage_d4_procurement_and_vendors
-- =============================================================================

-- 1. Create Enums
CREATE TYPE "VendorStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'SUSPENDED');
CREATE TYPE "RequisitionStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'PENDING_APPROVAL', 'APPROVED', 'REJECTED', 'CONVERTED_TO_PO', 'CANCELLED');
CREATE TYPE "RfqStatus" AS ENUM ('DRAFT', 'SENT', 'CLOSED', 'EVALUATED', 'CANCELLED');
CREATE TYPE "PurchaseOrderStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ISSUED', 'PARTIALLY_RECEIVED', 'RECEIVED', 'CLOSED', 'CANCELLED');
CREATE TYPE "GrnStatus" AS ENUM ('RECEIVED', 'INSPECTED', 'ACCEPTED', 'REJECTED', 'PARTIAL');
CREATE TYPE "SupplierReturnStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'ACKNOWLEDGED', 'COMPLETED', 'CANCELLED');

-- 2. Create Tables
CREATE TABLE "vendors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(30) NOT NULL,
  "registeredName" VARCHAR(150) NOT NULL,
  "tradingName" VARCHAR(150),
  "vendorType" VARCHAR(50) NOT NULL DEFAULT 'SUPPLIER',
  "contactPerson" VARCHAR(100),
  "email" VARCHAR(150) NOT NULL,
  "phone" VARCHAR(50) NOT NULL,
  "address" TEXT NOT NULL,
  "ghanaPostGps" VARCHAR(30),
  "country" VARCHAR(50) NOT NULL DEFAULT 'Ghana',
  "taxId" VARCHAR(50),
  "vatRegistered" BOOLEAN NOT NULL DEFAULT true,
  "paymentTermsDays" SMALLINT NOT NULL DEFAULT 30,
  "bankDetails" JSONB DEFAULT '{}',
  "preferredVendor" BOOLEAN NOT NULL DEFAULT false,
  "rating" DECIMAL(3,2) NOT NULL DEFAULT 5.00,
  "status" "VendorStatus" NOT NULL DEFAULT 'ACTIVE',
  "branchId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "vendors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vendors_code_key" UNIQUE ("code"),
  CONSTRAINT "vendors_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL
);

CREATE TABLE "purchase_requisitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requisitionNumber" VARCHAR(50) NOT NULL,
  "branchId" UUID NOT NULL,
  "departmentId" UUID,
  "requesterUserId" UUID NOT NULL,
  "requestDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "requiredDate" DATE,
  "priority" "WorkOrderPriority" NOT NULL DEFAULT 'MEDIUM',
  "justification" TEXT NOT NULL,
  "estimatedTotal" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "status" "RequisitionStatus" NOT NULL DEFAULT 'DRAFT',
  "approvalRequestId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "purchase_requisitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_requisitions_requisitionNumber_key" UNIQUE ("requisitionNumber"),
  CONSTRAINT "purchase_requisitions_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "purchase_requisitions_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL,
  CONSTRAINT "purchase_requisitions_requesterUserId_fkey" FOREIGN KEY ("requesterUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "purchase_requisitions_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE SET NULL
);

CREATE TABLE "purchase_requisition_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requisitionId" UUID NOT NULL,
  "partId" UUID,
  "description" VARCHAR(200) NOT NULL,
  "quantity" DECIMAL(14,2) NOT NULL,
  "estimatedUnitPrice" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "estimatedTotal" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT "purchase_requisition_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_requisition_items_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "purchase_requisitions"("id") ON DELETE RESTRICT,
  CONSTRAINT "purchase_requisition_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL
);

CREATE TABLE "rfqs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rfqNumber" VARCHAR(50) NOT NULL,
  "requisitionId" UUID,
  "title" VARCHAR(150) NOT NULL,
  "status" "RfqStatus" NOT NULL DEFAULT 'DRAFT',
  "closingDate" DATE,
  "notes" TEXT,
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "rfqs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rfqs_rfqNumber_key" UNIQUE ("rfqNumber"),
  CONSTRAINT "rfqs_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "purchase_requisitions"("id") ON DELETE SET NULL,
  CONSTRAINT "rfqs_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "rfq_vendors" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rfqId" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "quotedUnitPrice" DECIMAL(14,2),
  "quotedTotalPrice" DECIMAL(14,2),
  "deliveryDays" SMALLINT,
  "paymentTerms" VARCHAR(100),
  "validityDate" DATE,
  "isSelected" BOOLEAN NOT NULL DEFAULT false,
  "selectionJustification" TEXT,
  "quotedAt" TIMESTAMPTZ,
  CONSTRAINT "rfq_vendors_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "rfq_vendors_rfqId_vendorId_key" UNIQUE ("rfqId", "vendorId"),
  CONSTRAINT "rfq_vendors_rfqId_fkey" FOREIGN KEY ("rfqId") REFERENCES "rfqs"("id") ON DELETE RESTRICT,
  CONSTRAINT "rfq_vendors_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT
);

CREATE TABLE "purchase_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "poNumber" VARCHAR(50) NOT NULL,
  "vendorId" UUID NOT NULL,
  "requisitionId" UUID,
  "branchId" UUID NOT NULL,
  "departmentId" UUID,
  "orderDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "expectedDeliveryDate" DATE,
  "currency" CHAR(3) NOT NULL DEFAULT 'GHS',
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "vatAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "nhilAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "getFundAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "paymentTermsDays" SMALLINT NOT NULL DEFAULT 30,
  "deliveryAddress" TEXT NOT NULL,
  "status" "PurchaseOrderStatus" NOT NULL DEFAULT 'DRAFT',
  "issuedAt" TIMESTAMPTZ,
  "approvedByUserId" UUID,
  "approvalRequestId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_orders_poNumber_key" UNIQUE ("poNumber"),
  CONSTRAINT "purchase_orders_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT,
  CONSTRAINT "purchase_orders_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "purchase_requisitions"("id") ON DELETE SET NULL,
  CONSTRAINT "purchase_orders_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "purchase_orders_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL,
  CONSTRAINT "purchase_orders_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "purchase_orders_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE SET NULL
);

CREATE TABLE "purchase_order_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "poId" UUID NOT NULL,
  "partId" UUID,
  "description" VARCHAR(200) NOT NULL,
  "quantityOrdered" DECIMAL(14,2) NOT NULL,
  "quantityReceived" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "quantityReturned" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "unitPrice" DECIMAL(14,2) NOT NULL,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "lineTotal" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "purchase_order_items_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "purchase_order_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL
);

CREATE TABLE "goods_received_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "grnNumber" VARCHAR(50) NOT NULL,
  "poId" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "deliveryDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "invoiceReference" VARCHAR(100),
  "notes" TEXT,
  "status" "GrnStatus" NOT NULL DEFAULT 'ACCEPTED',
  "receivedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "goods_received_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "goods_received_notes_grnNumber_key" UNIQUE ("grnNumber"),
  CONSTRAINT "goods_received_notes_poId_fkey" FOREIGN KEY ("poId") REFERENCES "purchase_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "goods_received_notes_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT,
  CONSTRAINT "goods_received_notes_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT,
  CONSTRAINT "goods_received_notes_receivedByUserId_fkey" FOREIGN KEY ("receivedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "goods_received_note_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "grnId" UUID NOT NULL,
  "poItemId" UUID NOT NULL,
  "partId" UUID,
  "quantityReceived" DECIMAL(14,2) NOT NULL,
  "quantityAccepted" DECIMAL(14,2) NOT NULL,
  "quantityRejected" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "unitCost" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "goods_received_note_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "goods_received_note_items_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "goods_received_notes"("id") ON DELETE RESTRICT,
  CONSTRAINT "goods_received_note_items_poItemId_fkey" FOREIGN KEY ("poItemId") REFERENCES "purchase_order_items"("id") ON DELETE RESTRICT,
  CONSTRAINT "goods_received_note_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL
);

CREATE TABLE "supplier_returns" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "returnNumber" VARCHAR(50) NOT NULL,
  "grnId" UUID NOT NULL,
  "vendorId" UUID NOT NULL,
  "storeId" UUID NOT NULL,
  "returnDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "reason" TEXT NOT NULL,
  "status" "SupplierReturnStatus" NOT NULL DEFAULT 'COMPLETED',
  "createdByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "supplier_returns_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_returns_returnNumber_key" UNIQUE ("returnNumber"),
  CONSTRAINT "supplier_returns_grnId_fkey" FOREIGN KEY ("grnId") REFERENCES "goods_received_notes"("id") ON DELETE RESTRICT,
  CONSTRAINT "supplier_returns_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE RESTRICT,
  CONSTRAINT "supplier_returns_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "stores"("id") ON DELETE RESTRICT,
  CONSTRAINT "supplier_returns_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "supplier_return_items" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "returnId" UUID NOT NULL,
  "partId" UUID,
  "quantityReturned" DECIMAL(14,2) NOT NULL,
  "unitCost" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "supplier_return_items_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "supplier_return_items_returnId_fkey" FOREIGN KEY ("returnId") REFERENCES "supplier_returns"("id") ON DELETE RESTRICT,
  CONSTRAINT "supplier_return_items_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL
);

-- 3. Check Constraints & Indexes
ALTER TABLE "vendors" ADD CONSTRAINT "chk_vendors_rating_range" CHECK ("rating" BETWEEN 0 AND 5);
ALTER TABLE "purchase_requisition_items" ADD CONSTRAINT "chk_req_item_qty_positive" CHECK ("quantity" > 0);
ALTER TABLE "purchase_order_items" ADD CONSTRAINT "chk_po_item_qty_positive" CHECK ("quantityOrdered" > 0);
ALTER TABLE "goods_received_note_items" ADD CONSTRAINT "chk_grn_accepted_non_negative" CHECK ("quantityAccepted" >= 0);

CREATE INDEX IF NOT EXISTS "vendors_code_idx" ON "vendors" ("code");
CREATE INDEX IF NOT EXISTS "vendors_status_idx" ON "vendors" ("status");

CREATE INDEX IF NOT EXISTS "purchase_requisitions_branchId_idx" ON "purchase_requisitions" ("branchId");
CREATE INDEX IF NOT EXISTS "purchase_requisitions_status_idx" ON "purchase_requisitions" ("status");

CREATE INDEX IF NOT EXISTS "rfqs_status_idx" ON "rfqs" ("status");

CREATE INDEX IF NOT EXISTS "purchase_orders_vendorId_idx" ON "purchase_orders" ("vendorId");
CREATE INDEX IF NOT EXISTS "purchase_orders_branchId_idx" ON "purchase_orders" ("branchId");
CREATE INDEX IF NOT EXISTS "purchase_orders_status_idx" ON "purchase_orders" ("status");

CREATE INDEX IF NOT EXISTS "goods_received_notes_poId_idx" ON "goods_received_notes" ("poId");
CREATE INDEX IF NOT EXISTS "goods_received_notes_vendorId_idx" ON "goods_received_notes" ("vendorId");
CREATE INDEX IF NOT EXISTS "goods_received_notes_storeId_idx" ON "goods_received_notes" ("storeId");

CREATE INDEX IF NOT EXISTS "supplier_returns_grnId_idx" ON "supplier_returns" ("grnId");
CREATE INDEX IF NOT EXISTS "supplier_returns_vendorId_idx" ON "supplier_returns" ("vendorId");
