-- =============================================================================
-- ZemiFix CMMS — Migration: Stage R1 Invoicing & Commercial Billing Engine
-- Engine Target: PostgreSQL 16, 17 & 18
-- Sequence Number: 20261110000008_stage_r1_invoicing_and_billing
-- =============================================================================

-- 1. Create Enums
CREATE TYPE "InvoiceType" AS ENUM ('JOB_INVOICE', 'CONSOLIDATED_INVOICE', 'CONTRACT_INVOICE', 'PROFORMA_INVOICE');
CREATE TYPE "InvoiceStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CANCELLED');
CREATE TYPE "PaymentMethod" AS ENUM ('BANK_TRANSFER', 'CHEQUE', 'MOBILE_MONEY', 'CASH', 'CREDIT_CARD');
CREATE TYPE "CreditNoteStatus" AS ENUM ('DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'ISSUED', 'APPLIED', 'CANCELLED');

-- 2. Create Tables
CREATE TABLE "number_sequences" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "prefix" VARCHAR(20) NOT NULL,
  "nextValue" INTEGER NOT NULL DEFAULT 1,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "number_sequences_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "number_sequences_prefix_key" UNIQUE ("prefix")
);

CREATE TABLE "invoices" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "draftReference" VARCHAR(50) NOT NULL,
  "invoiceNumber" VARCHAR(50),
  "version" INTEGER NOT NULL DEFAULT 1,
  "payloadHash" VARCHAR(64),
  "invoiceType" "InvoiceType" NOT NULL DEFAULT 'JOB_INVOICE',
  "customerId" UUID NOT NULL,
  "siteId" UUID,
  "contractId" UUID,
  "quoteId" UUID,
  "workOrderId" UUID,
  "issueDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "dueDate" DATE NOT NULL,
  "sentAt" TIMESTAMPTZ,
  "currency" CHAR(3) NOT NULL DEFAULT 'GHS',
  "taxScheme" VARCHAR(50) NOT NULL DEFAULT 'GHANA_STATUTORY_2026',
  "taxInclusive" BOOLEAN NOT NULL DEFAULT false,
  "subtotal" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "vatRate" DECIMAL(5,4) NOT NULL DEFAULT 0.1500,
  "vatAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "nhilRate" DECIMAL(5,4) NOT NULL DEFAULT 0.0250,
  "nhilAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "getFundRate" DECIMAL(5,4) NOT NULL DEFAULT 0.0250,
  "getFundAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "totalAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "paidAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "creditedAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "balanceDue" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "status" "InvoiceStatus" NOT NULL DEFAULT 'DRAFT',
  "createdByUserId" UUID NOT NULL,
  "approvedByUserId" UUID,
  "approvalRequestId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "invoices_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoices_draftReference_key" UNIQUE ("draftReference"),
  CONSTRAINT "invoices_invoiceNumber_key" UNIQUE ("invoiceNumber"),
  CONSTRAINT "invoices_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "invoices_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "customer_sites"("id") ON DELETE RESTRICT,
  CONSTRAINT "invoices_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "customer_contracts"("id") ON DELETE RESTRICT,
  CONSTRAINT "invoices_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE RESTRICT,
  CONSTRAINT "invoices_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "invoices_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "invoices_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "invoices_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT
);

CREATE TABLE "invoice_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "invoiceId" UUID NOT NULL,
  "workOrderId" UUID,
  "partId" UUID,
  "description" VARCHAR(200) NOT NULL,
  "quantity" DECIMAL(14,2) NOT NULL,
  "unitPrice" DECIMAL(14,2) NOT NULL,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "lineTotal" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "invoice_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "invoice_lines_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT,
  CONSTRAINT "invoice_lines_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "invoice_lines_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL
);

CREATE TABLE "payments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "paymentNumber" VARCHAR(50) NOT NULL,
  "customerId" UUID NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "unallocatedAmount" DECIMAL(14,2) NOT NULL,
  "paymentMethod" "PaymentMethod" NOT NULL DEFAULT 'BANK_TRANSFER',
  "referenceNumber" VARCHAR(100),
  "paymentDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "notes" TEXT,
  "recordedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payments_paymentNumber_key" UNIQUE ("paymentNumber"),
  CONSTRAINT "payments_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "payments_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "payment_allocations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "paymentId" UUID NOT NULL,
  "invoiceId" UUID NOT NULL,
  "amountAllocated" DECIMAL(14,2) NOT NULL,
  "allocatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_allocations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_allocations_paymentId_invoiceId_key" UNIQUE ("paymentId", "invoiceId"),
  CONSTRAINT "payment_allocations_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT,
  CONSTRAINT "payment_allocations_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT
);

CREATE TABLE "payment_reversals" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "paymentId" UUID NOT NULL,
  "amountReversed" DECIMAL(14,2) NOT NULL,
  "reason" TEXT NOT NULL,
  "reversedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "payment_reversals_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "payment_reversals_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "payments"("id") ON DELETE RESTRICT
);

CREATE TABLE "credit_notes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "creditNoteNumber" VARCHAR(50) NOT NULL,
  "invoiceId" UUID NOT NULL,
  "customerId" UUID NOT NULL,
  "reason" TEXT NOT NULL,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "vatAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "nhilAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "getFundAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "status" "CreditNoteStatus" NOT NULL DEFAULT 'DRAFT',
  "approvalRequestId" UUID,
  "issuedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "credit_notes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "credit_notes_creditNoteNumber_key" UNIQUE ("creditNoteNumber"),
  CONSTRAINT "credit_notes_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "invoices"("id") ON DELETE RESTRICT,
  CONSTRAINT "credit_notes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "credit_notes_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT,
  CONSTRAINT "credit_notes_issuedByUserId_fkey" FOREIGN KEY ("issuedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "credit_note_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "creditNoteId" UUID NOT NULL,
  "description" VARCHAR(200) NOT NULL,
  "quantity" DECIMAL(14,2) NOT NULL,
  "unitPrice" DECIMAL(14,2) NOT NULL,
  "lineTotal" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "credit_note_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "credit_note_lines_creditNoteId_fkey" FOREIGN KEY ("creditNoteId") REFERENCES "credit_notes"("id") ON DELETE CASCADE
);

CREATE TABLE "internal_recharges" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "rechargeNumber" VARCHAR(50) NOT NULL,
  "workOrderId" UUID NOT NULL,
  "fromDepartmentId" UUID NOT NULL,
  "toDepartmentId" UUID NOT NULL,
  "amount" DECIMAL(14,2) NOT NULL,
  "description" TEXT NOT NULL,
  "rechargeDate" DATE NOT NULL DEFAULT CURRENT_DATE,
  "recordedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "internal_recharges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "internal_recharges_rechargeNumber_key" UNIQUE ("rechargeNumber"),
  CONSTRAINT "internal_recharges_workOrderId_key" UNIQUE ("workOrderId"),
  CONSTRAINT "internal_recharges_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "internal_recharges_fromDepartmentId_fkey" FOREIGN KEY ("fromDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT,
  CONSTRAINT "internal_recharges_toDepartmentId_fkey" FOREIGN KEY ("toDepartmentId") REFERENCES "departments"("id") ON DELETE RESTRICT,
  CONSTRAINT "internal_recharges_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

-- 3. CHECK Constraints & Indexes
ALTER TABLE "invoice_lines" ADD CONSTRAINT "chk_inv_line_qty_positive" CHECK ("quantity" > 0);
ALTER TABLE "invoice_lines" ADD CONSTRAINT "chk_inv_line_price_non_negative" CHECK ("unitPrice" >= 0);
ALTER TABLE "invoice_lines" ADD CONSTRAINT "chk_inv_line_discount_non_negative" CHECK ("discountAmount" >= 0);

ALTER TABLE "payments" ADD CONSTRAINT "chk_payment_amount_positive" CHECK ("amount" > 0);
ALTER TABLE "payment_allocations" ADD CONSTRAINT "chk_allocation_amount_positive" CHECK ("amountAllocated" > 0);

CREATE INDEX IF NOT EXISTS "invoices_customerId_idx" ON "invoices" ("customerId");
CREATE INDEX IF NOT EXISTS "invoices_status_idx" ON "invoices" ("status");
CREATE INDEX IF NOT EXISTS "invoices_dueDate_idx" ON "invoices" ("dueDate");

CREATE INDEX IF NOT EXISTS "invoice_lines_invoiceId_idx" ON "invoice_lines" ("invoiceId");

CREATE INDEX IF NOT EXISTS "payments_customerId_idx" ON "payments" ("customerId");
CREATE INDEX IF NOT EXISTS "payments_paymentDate_idx" ON "payments" ("paymentDate");

CREATE INDEX IF NOT EXISTS "payment_allocations_invoiceId_idx" ON "payment_allocations" ("invoiceId");
CREATE INDEX IF NOT EXISTS "credit_notes_invoiceId_idx" ON "credit_notes" ("invoiceId");

CREATE INDEX IF NOT EXISTS "internal_recharges_workOrderId_idx" ON "internal_recharges" ("workOrderId");
