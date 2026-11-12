-- =============================================================================
-- ZemiFix CMMS — Migration: Stage D.2a Governance, Dual-Control & Audit Core
-- Engine Target: PostgreSQL 16, 17 & 18
-- =============================================================================

-- 1. Create Enums
CREATE TYPE "ApprovalRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE "ApprovalActionType" AS ENUM ('APPROVED', 'REJECTED');

-- 2. Create Governance & Dual-Control Tables
CREATE TABLE "approval_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "entityType" VARCHAR(50) NOT NULL,
  "branchId" UUID,
  "minAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "maxAmount" DECIMAL(14,2),
  "priority" INTEGER NOT NULL DEFAULT 100,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "effectiveFrom" TIMESTAMPTZ,
  "effectiveTo" TIMESTAMPTZ,
  "requiredRoleId" UUID NOT NULL,
  "minimumApprovalLimit" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approval_rules_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_rules_requiredRoleId_fkey" FOREIGN KEY ("requiredRoleId") REFERENCES "roles"("id") ON DELETE RESTRICT
);

CREATE TABLE "approval_requests" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "entityType" VARCHAR(50) NOT NULL,
  "entityId" UUID NOT NULL,
  "version" INTEGER NOT NULL DEFAULT 1,
  "makerUserId" UUID NOT NULL,
  "requestAmount" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "status" "ApprovalRequestStatus" NOT NULL DEFAULT 'PENDING',
  "currentStepOrder" INTEGER NOT NULL DEFAULT 1,
  "totalSteps" INTEGER NOT NULL DEFAULT 1,
  "payloadHash" VARCHAR(64) NOT NULL,
  "previousRequestId" UUID,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_requests_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approval_requests_makerUserId_fkey" FOREIGN KEY ("makerUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_requests_previousRequestId_fkey" FOREIGN KEY ("previousRequestId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT
);

CREATE TABLE "approval_steps" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "requestId" UUID NOT NULL,
  "stepOrder" INTEGER NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "requiredRoleId" UUID NOT NULL,
  "minimumApprovalLimit" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "isSatisfied" BOOLEAN NOT NULL DEFAULT false,
  "satisfiedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_steps_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approval_steps_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "approval_requests"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_steps_requiredRoleId_fkey" FOREIGN KEY ("requiredRoleId") REFERENCES "roles"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_steps_requestId_stepOrder_key" UNIQUE ("requestId", "stepOrder")
);

CREATE TABLE "approval_actions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "stepId" UUID NOT NULL,
  "checkerUserId" UUID NOT NULL,
  "action" "ApprovalActionType" NOT NULL,
  "rejectionReason" TEXT,
  "actionTimestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "approval_actions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "approval_actions_stepId_fkey" FOREIGN KEY ("stepId") REFERENCES "approval_steps"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_actions_checkerUserId_fkey" FOREIGN KEY ("checkerUserId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "approval_actions_stepId_checkerUserId_key" UNIQUE ("stepId", "checkerUserId")
);

CREATE TABLE "audit_logs" (
  "sequenceNumber" BIGINT NOT NULL,
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "actorUserId" UUID,
  "action" VARCHAR(100) NOT NULL,
  "resource" VARCHAR(50) NOT NULL,
  "resourceId" VARCHAR(100) NOT NULL,
  "payload" JSONB NOT NULL,
  "prevHash" VARCHAR(64) NOT NULL,
  "hash" VARCHAR(64) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("sequenceNumber"),
  CONSTRAINT "audit_logs_id_key" UNIQUE ("id"),
  CONSTRAINT "audit_logs_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

-- 3. Indexes & Constraints
CREATE UNIQUE INDEX IF NOT EXISTS "approval_requests_single_pending_idx"
  ON "approval_requests" ("entityType", "entityId")
 WHERE "status" = 'PENDING';

CREATE INDEX IF NOT EXISTS "approval_rules_branchId_entityType_idx" ON "approval_rules" ("branchId", "entityType");
CREATE INDEX IF NOT EXISTS "approval_rules_entityType_isActive_idx" ON "approval_rules" ("entityType", "isActive");
CREATE INDEX IF NOT EXISTS "approval_requests_entityType_entityId_status_idx" ON "approval_requests" ("entityType", "entityId", "status");
CREATE INDEX IF NOT EXISTS "approval_requests_makerUserId_idx" ON "approval_requests" ("makerUserId");
CREATE INDEX IF NOT EXISTS "approval_steps_requestId_idx" ON "approval_steps" ("requestId");
CREATE INDEX IF NOT EXISTS "approval_actions_stepId_idx" ON "approval_actions" ("stepId");
CREATE INDEX IF NOT EXISTS "approval_actions_checkerUserId_idx" ON "approval_actions" ("checkerUserId");
CREATE INDEX IF NOT EXISTS "audit_logs_resource_resourceId_idx" ON "audit_logs" ("resource", "resourceId");
CREATE INDEX IF NOT EXISTS "audit_logs_actorUserId_idx" ON "audit_logs" ("actorUserId");

-- 4. Maker-Checker Cross-Table Distinctness Trigger
CREATE OR REPLACE FUNCTION chk_maker_checker_distinct() RETURNS trigger AS $$
DECLARE
  v_maker_id UUID;
BEGIN
  SELECT ar."makerUserId" INTO v_maker_id
    FROM "approval_requests" ar
    JOIN "approval_steps" ast ON ast."requestId" = ar.id
   WHERE ast.id = NEW."stepId";

  IF v_maker_id = NEW."checkerUserId" THEN
    RAISE EXCEPTION 'MAKER_CHECKER_VIOLATION: Checker (%) cannot be the same user as Maker (%)', NEW."checkerUserId", v_maker_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_maker_checker_distinct ON "approval_actions";
CREATE TRIGGER trg_maker_checker_distinct
  BEFORE INSERT ON "approval_actions"
  FOR EACH ROW EXECUTE FUNCTION chk_maker_checker_distinct();

-- 5. Approval Request Core Field Immutability Trigger
CREATE OR REPLACE FUNCTION protect_approval_requests() RETURNS trigger AS $$
BEGIN
  IF OLD."makerUserId" IS DISTINCT FROM NEW."makerUserId" OR
     OLD."entityType" IS DISTINCT FROM NEW."entityType" OR
     OLD."entityId" IS DISTINCT FROM NEW."entityId" OR
     OLD."version" IS DISTINCT FROM NEW."version" OR
     OLD."payloadHash" IS DISTINCT FROM NEW."payloadHash" OR
     OLD."totalSteps" IS DISTINCT FROM NEW."totalSteps" THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Core approval request identity fields are immutable.';
  END IF;

  IF OLD.status IN ('APPROVED', 'REJECTED') AND NEW.status IS DISTINCT FROM OLD.status THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Finalized approval request status (%) cannot be altered.', OLD.status;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_approval_requests_protect ON "approval_requests";
CREATE TRIGGER trg_approval_requests_protect
  BEFORE UPDATE ON "approval_requests"
  FOR EACH ROW EXECUTE FUNCTION protect_approval_requests();

-- 6. Approval Steps Configuration Immutability Trigger
CREATE OR REPLACE FUNCTION protect_approval_steps() RETURNS trigger AS $$
BEGIN
  IF OLD."requestId" IS DISTINCT FROM NEW."requestId" OR
     OLD."stepOrder" IS DISTINCT FROM NEW."stepOrder" OR
     OLD."requiredRoleId" IS DISTINCT FROM NEW."requiredRoleId" OR
     OLD."minimumApprovalLimit" IS DISTINCT FROM NEW."minimumApprovalLimit" THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Approval step configuration fields are immutable.';
  END IF;

  IF OLD."isSatisfied" = true AND NEW."isSatisfied" = false THEN
    RAISE EXCEPTION 'SECURITY_VIOLATION: Satisfied approval steps cannot be un-satisfied.';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_approval_steps_protect ON "approval_steps";
CREATE TRIGGER trg_approval_steps_protect
  BEFORE UPDATE ON "approval_steps"
  FOR EACH ROW EXECUTE FUNCTION protect_approval_steps();

-- 7. Approval Actions Immutable Trigger
CREATE OR REPLACE FUNCTION prevent_approval_action_tampering() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'TAMPER_PROTECTION: approval_actions records are immutable. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_approval_actions_immutable ON "approval_actions";
CREATE TRIGGER trg_approval_actions_immutable
  BEFORE UPDATE OR DELETE ON "approval_actions"
  FOR EACH ROW EXECUTE FUNCTION prevent_approval_action_tampering();

-- 8. Audit Log Immutable Trigger & Privilege Revocation
CREATE OR REPLACE FUNCTION prevent_audit_tampering() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'TAMPER_PROTECTION: audit_logs records are immutable. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_audit_logs_immutable ON "audit_logs";
CREATE TRIGGER trg_audit_logs_immutable
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION prevent_audit_tampering();

REVOKE TRUNCATE ON "audit_logs" FROM PUBLIC;
REVOKE TRUNCATE ON "approval_actions" FROM PUBLIC;
