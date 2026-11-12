-- =============================================================================
-- ZemiFix CMMS — Migration: Stage R1 Customer Portal, Quotes & Public Intake
-- Engine Target: PostgreSQL 16, 17 & 18
-- Sequence Number: 20261110000007_stage_r1_portal_and_quotes
-- =============================================================================

-- 1. Create Enums
CREATE TYPE "QuoteStatus" AS ENUM ('DRAFT', 'PENDING_MAKER_CHECKER', 'APPROVED_INTERNAL', 'SENT_TO_CUSTOMER', 'CUSTOMER_ACCEPTED', 'CUSTOMER_DECLINED', 'REVISED', 'EXPIRED', 'CANCELLED');
CREATE TYPE "QuoteDecision" AS ENUM ('ACCEPTED', 'DECLINED');

-- 2. Create Tables
CREATE TABLE "quotes" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteNumber" VARCHAR(50) NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "customerId" UUID NOT NULL,
  "siteId" UUID,
  "workRequestId" UUID,
  "workOrderId" UUID,
  "title" VARCHAR(150) NOT NULL,
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
  "status" "QuoteStatus" NOT NULL DEFAULT 'DRAFT',
  "validUntil" DATE,
  "createdByUserId" UUID NOT NULL,
  "approvedByUserId" UUID,
  "approvalRequestId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "quotes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quotes_quoteNumber_version_key" UNIQUE ("quoteNumber", "version"),
  CONSTRAINT "quotes_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "quotes_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "customer_sites"("id") ON DELETE RESTRICT,
  CONSTRAINT "quotes_workRequestId_fkey" FOREIGN KEY ("workRequestId") REFERENCES "work_requests"("id") ON DELETE SET NULL,
  CONSTRAINT "quotes_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE SET NULL,
  CONSTRAINT "quotes_createdByUserId_fkey" FOREIGN KEY ("createdByUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "quotes_approvedByUserId_fkey" FOREIGN KEY ("approvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "quotes_approvalRequestId_fkey" FOREIGN KEY ("approvalRequestId") REFERENCES "approval_requests"("id") ON DELETE SET NULL
);

CREATE TABLE "quote_lines" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "partId" UUID,
  "description" VARCHAR(200) NOT NULL,
  "quantity" DECIMAL(14,2) NOT NULL,
  "unitPrice" DECIMAL(14,2) NOT NULL,
  "discountAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "lineTotal" DECIMAL(14,2) NOT NULL,
  CONSTRAINT "quote_lines_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quote_lines_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE,
  CONSTRAINT "quote_lines_partId_fkey" FOREIGN KEY ("partId") REFERENCES "parts"("id") ON DELETE SET NULL
);

CREATE TABLE "quote_version_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "subtotal" DECIMAL(14,2) NOT NULL,
  "totalAmount" DECIMAL(14,2) NOT NULL,
  "snapshotData" JSONB NOT NULL,
  "revisedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_version_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quote_version_history_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE CASCADE,
  CONSTRAINT "quote_version_history_revisedByUserId_fkey" FOREIGN KEY ("revisedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "quote_decision_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "quoteId" UUID NOT NULL,
  "version" INTEGER NOT NULL,
  "customerContactId" UUID NOT NULL,
  "decision" "QuoteDecision" NOT NULL,
  "decisionNotes" TEXT,
  "ipAddress" VARCHAR(45) NOT NULL,
  "decidedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quote_decision_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "quote_decision_logs_quoteId_version_key" UNIQUE ("quoteId", "version"),
  CONSTRAINT "quote_decision_logs_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "quotes"("id") ON DELETE RESTRICT,
  CONSTRAINT "quote_decision_logs_customerContactId_fkey" FOREIGN KEY ("customerContactId") REFERENCES "customer_contacts"("id") ON DELETE RESTRICT
);

CREATE TABLE "work_order_comments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderId" UUID NOT NULL,
  "authorUserId" UUID,
  "authorContactId" UUID,
  "commentText" TEXT NOT NULL,
  "isCustomerVisible" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_comments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_comments_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_comments_authorUserId_fkey" FOREIGN KEY ("authorUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_comments_authorContactId_fkey" FOREIGN KEY ("authorContactId") REFERENCES "customer_contacts"("id") ON DELETE RESTRICT
);

CREATE TABLE "work_order_attachments" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderId" UUID NOT NULL,
  "uploaderUserId" UUID,
  "uploaderContactId" UUID,
  "fileName" VARCHAR(200) NOT NULL,
  "fileUrl" TEXT NOT NULL,
  "fileSize" INTEGER NOT NULL,
  "mimeType" VARCHAR(100) NOT NULL,
  "isCustomerVisible" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "work_order_attachments_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "work_order_attachments_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_attachments_uploaderUserId_fkey" FOREIGN KEY ("uploaderUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "work_order_attachments_uploaderContactId_fkey" FOREIGN KEY ("uploaderContactId") REFERENCES "customer_contacts"("id") ON DELETE RESTRICT
);

CREATE TABLE "public_request_intake" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "siteId" UUID NOT NULL,
  "assetId" UUID,
  "idempotencyKey" VARCHAR(100),
  "requesterName" VARCHAR(100) NOT NULL,
  "requesterEmail" VARCHAR(150) NOT NULL,
  "requesterPhone" VARCHAR(50) NOT NULL,
  "description" TEXT NOT NULL,
  "photoUrl" TEXT,
  "status" VARCHAR(30) NOT NULL DEFAULT 'RECEIVED',
  "processedRequestId" UUID,
  "clientIp" VARCHAR(45) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "public_request_intake_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "public_request_intake_idempotencyKey_key" UNIQUE ("idempotencyKey"),
  CONSTRAINT "public_request_intake_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "customer_sites"("id") ON DELETE RESTRICT,
  CONSTRAINT "public_request_intake_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE SET NULL
);

-- 3. CHECK Constraints
ALTER TABLE "quote_lines" ADD CONSTRAINT "chk_quote_line_qty_positive" CHECK ("quantity" > 0);
ALTER TABLE "quote_lines" ADD CONSTRAINT "chk_quote_line_price_non_negative" CHECK ("unitPrice" >= 0);
ALTER TABLE "quote_lines" ADD CONSTRAINT "chk_quote_line_discount_non_negative" CHECK ("discountAmount" >= 0);

ALTER TABLE "work_order_comments" ADD CONSTRAINT "chk_comment_author_single_type"
  CHECK (
    ("authorUserId" IS NOT NULL AND "authorContactId" IS NULL) OR
    ("authorUserId" IS NULL AND "authorContactId" IS NOT NULL)
  );

ALTER TABLE "work_order_comments" ADD CONSTRAINT "chk_customer_comment_must_be_visible"
  CHECK (
    ("authorContactId" IS NOT NULL AND "isCustomerVisible" = true) OR
    ("authorContactId" IS NULL)
  );

-- 4. Indexes
CREATE INDEX IF NOT EXISTS "quotes_customerId_idx" ON "quotes" ("customerId");
CREATE INDEX IF NOT EXISTS "quotes_workOrderId_idx" ON "quotes" ("workOrderId");
CREATE INDEX IF NOT EXISTS "quotes_status_idx" ON "quotes" ("status");

CREATE INDEX IF NOT EXISTS "quote_lines_quoteId_idx" ON "quote_lines" ("quoteId");
CREATE INDEX IF NOT EXISTS "quote_version_history_quoteId_idx" ON "quote_version_history" ("quoteId");
CREATE INDEX IF NOT EXISTS "quote_decision_logs_quoteId_idx" ON "quote_decision_logs" ("quoteId");
CREATE INDEX IF NOT EXISTS "quote_decision_logs_customerContactId_idx" ON "quote_decision_logs" ("customerContactId");

CREATE INDEX IF NOT EXISTS "work_order_comments_workOrderId_idx" ON "work_order_comments" ("workOrderId");
CREATE INDEX IF NOT EXISTS "work_order_comments_isCustomerVisible_idx" ON "work_order_comments" ("isCustomerVisible");

CREATE INDEX IF NOT EXISTS "work_order_attachments_workOrderId_idx" ON "work_order_attachments" ("workOrderId");
CREATE INDEX IF NOT EXISTS "work_order_attachments_isCustomerVisible_idx" ON "work_order_attachments" ("isCustomerVisible");

CREATE INDEX IF NOT EXISTS "public_request_intake_siteId_idx" ON "public_request_intake" ("siteId");
CREATE INDEX IF NOT EXISTS "public_request_intake_status_idx" ON "public_request_intake" ("status");
