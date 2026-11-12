-- =============================================================================
-- ZemiFix CMMS — Migration: Stage R1 Customers, Contracts & SLA Management
-- Engine Target: PostgreSQL 16, 17 & 18
-- Sequence Number: 20261110000006_stage_r1_contracts_and_sla
-- =============================================================================

-- 1. Create Enums
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'ACTIVE', 'EXPIRED', 'TERMINATED', 'SUSPENDED');
CREATE TYPE "RateCardCategory" AS ENUM ('REGULAR', 'OVERTIME', 'EMERGENCY', 'SPECIALIST');
CREATE TYPE "SlaBreachType" AS ENUM ('RESPONSE_TIME_BREACH', 'RESOLUTION_TIME_BREACH');

-- 2. Create Tables
CREATE TABLE "sla_calendars" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "name" VARCHAR(100) NOT NULL,
  "timezone" VARCHAR(50) NOT NULL DEFAULT 'Africa/Accra',
  "mondayStart" VARCHAR(5) DEFAULT '08:00',
  "mondayEnd" VARCHAR(5) DEFAULT '17:00',
  "tuesdayStart" VARCHAR(5) DEFAULT '08:00',
  "tuesdayEnd" VARCHAR(5) DEFAULT '17:00',
  "wednesdayStart" VARCHAR(5) DEFAULT '08:00',
  "wednesdayEnd" VARCHAR(5) DEFAULT '17:00',
  "thursdayStart" VARCHAR(5) DEFAULT '08:00',
  "thursdayEnd" VARCHAR(5) DEFAULT '17:00',
  "fridayStart" VARCHAR(5) DEFAULT '08:00',
  "fridayEnd" VARCHAR(5) DEFAULT '17:00',
  "saturdayStart" VARCHAR(5),
  "saturdayEnd" VARCHAR(5),
  "sundayStart" VARCHAR(5),
  "sundayEnd" VARCHAR(5),
  "version" INTEGER NOT NULL DEFAULT 1,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sla_calendars_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "sla_calendar_holidays" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "calendarId" UUID NOT NULL,
  "holidayDate" DATE NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  CONSTRAINT "sla_calendar_holidays_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sla_calendar_holidays_calendarId_holidayDate_key" UNIQUE ("calendarId", "holidayDate"),
  CONSTRAINT "sla_calendar_holidays_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "sla_calendars"("id") ON DELETE CASCADE
);

CREATE TABLE "sla_policies" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "policyNumber" VARCHAR(50) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "calendarId" UUID NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "sla_policies_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sla_policies_policyNumber_key" UNIQUE ("policyNumber"),
  CONSTRAINT "sla_policies_calendarId_fkey" FOREIGN KEY ("calendarId") REFERENCES "sla_calendars"("id") ON DELETE RESTRICT
);

CREATE TABLE "sla_rules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "slaPolicyId" UUID NOT NULL,
  "priority" "WorkOrderPriority" NOT NULL,
  "responseTargetMinutes" INTEGER NOT NULL,
  "resolutionTargetMinutes" INTEGER NOT NULL,
  "businessHoursOnly" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "sla_rules_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sla_rules_slaPolicyId_priority_key" UNIQUE ("slaPolicyId", "priority"),
  CONSTRAINT "sla_rules_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "sla_policies"("id") ON DELETE CASCADE
);

CREATE TABLE "customer_contracts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "contractNumber" VARCHAR(50) NOT NULL,
  "customerId" UUID NOT NULL,
  "title" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "startDate" DATE NOT NULL,
  "endDate" DATE NOT NULL,
  "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
  "slaPolicyId" UUID,
  "billingFrequency" VARCHAR(30) NOT NULL DEFAULT 'MONTHLY',
  "contractValue" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "customer_contracts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "customer_contracts_contractNumber_key" UNIQUE ("contractNumber"),
  CONSTRAINT "customer_contracts_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "customer_contracts_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "sla_policies"("id") ON DELETE SET NULL
);

CREATE TABLE "customer_contract_sites" (
  "contractId" UUID NOT NULL,
  "siteId" UUID NOT NULL,
  CONSTRAINT "customer_contract_sites_pkey" PRIMARY KEY ("contractId", "siteId"),
  CONSTRAINT "customer_contract_sites_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "customer_contracts"("id") ON DELETE CASCADE,
  CONSTRAINT "customer_contract_sites_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "customer_sites"("id") ON DELETE CASCADE
);

CREATE TABLE "contract_rate_cards" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "contractId" UUID NOT NULL,
  "category" "RateCardCategory" NOT NULL DEFAULT 'REGULAR',
  "hourlyRate" DECIMAL(10,2) NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "contract_rate_cards_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "contract_rate_cards_contractId_category_key" UNIQUE ("contractId", "category"),
  CONSTRAINT "contract_rate_cards_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "customer_contracts"("id") ON DELETE CASCADE
);

CREATE TABLE "sla_breach_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "workOrderId" UUID NOT NULL,
  "slaPolicyId" UUID NOT NULL,
  "priority" "WorkOrderPriority" NOT NULL,
  "breachType" "SlaBreachType" NOT NULL,
  "slaCycle" INTEGER NOT NULL DEFAULT 1,
  "targetMinutes" INTEGER NOT NULL,
  "actualElapsedMinutes" INTEGER NOT NULL,
  "breachedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sla_breach_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sla_breach_logs_workOrderId_breachType_slaCycle_key" UNIQUE ("workOrderId", "breachType", "slaCycle"),
  CONSTRAINT "sla_breach_logs_workOrderId_fkey" FOREIGN KEY ("workOrderId") REFERENCES "work_orders"("id") ON DELETE RESTRICT
);

-- 3. Additive columns on work_orders and work_order_labor
ALTER TABLE "work_orders"
  ADD COLUMN "customerId" UUID,
  ADD COLUMN "siteId" UUID,
  ADD COLUMN "contractId" UUID,
  ADD COLUMN "slaPolicyId" UUID,
  ADD COLUMN "slaResponseTargetMinutes" INTEGER,
  ADD COLUMN "slaResolutionTargetMinutes" INTEGER,
  ADD COLUMN "slaSnapshotPolicyId" UUID,
  ADD COLUMN "slaSnapshotCalendarId" UUID,
  ADD COLUMN "slaSnapshotCalendarVersion" INTEGER,
  ADD COLUMN "slaSnapshotCalendarData" JSONB,
  ADD COLUMN "slaCycle" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "work_orders"
  ADD CONSTRAINT "work_orders_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "work_orders_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "customer_sites"("id") ON DELETE RESTRICT,
  ADD CONSTRAINT "work_orders_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "customer_contracts"("id") ON DELETE SET NULL,
  ADD CONSTRAINT "work_orders_slaPolicyId_fkey" FOREIGN KEY ("slaPolicyId") REFERENCES "sla_policies"("id") ON DELETE SET NULL;

ALTER TABLE "work_order_labor"
  ADD COLUMN "skillCategory" "RateCardCategory" NOT NULL DEFAULT 'REGULAR';

-- 4. Indexes
CREATE INDEX IF NOT EXISTS "sla_policies_policyNumber_idx" ON "sla_policies" ("policyNumber");
CREATE INDEX IF NOT EXISTS "sla_rules_slaPolicyId_idx" ON "sla_rules" ("slaPolicyId");
CREATE INDEX IF NOT EXISTS "customer_contracts_customerId_idx" ON "customer_contracts" ("customerId");
CREATE INDEX IF NOT EXISTS "customer_contracts_status_idx" ON "customer_contracts" ("status");
CREATE INDEX IF NOT EXISTS "contract_rate_cards_contractId_idx" ON "contract_rate_cards" ("contractId");
CREATE INDEX IF NOT EXISTS "sla_breach_logs_workOrderId_idx" ON "sla_breach_logs" ("workOrderId");
CREATE INDEX IF NOT EXISTS "sla_breach_logs_breachedAt_idx" ON "sla_breach_logs" ("breachedAt");
