-- =============================================================================
-- ZemiFix CMMS — Migration: Stage D.2b Asset Taxonomy, Equipment Register & Telemetry
-- Engine Target: PostgreSQL 16, 17 & 18
-- Sequence Number: 20261110000001_stage_d2b_asset_taxonomy
-- =============================================================================

-- 1. Create Enums
CREATE TYPE "OwnershipType" AS ENUM ('COMPANY_OWNED', 'CUSTOMER_OWNED', 'LEASED');
CREATE TYPE "ManagingOrgType" AS ENUM ('INTERNAL_BRANCH', 'EXTERNAL_CONTRACTOR');
CREATE TYPE "AssetStatus" AS ENUM ('OPERATIONAL', 'DEGRADED', 'DOWN', 'IN_MAINTENANCE', 'STANDBY', 'RETIRED', 'DISPOSED');
CREATE TYPE "DowntimeType" AS ENUM ('UNPLANNED', 'PLANNED');
CREATE TYPE "MeterReadingType" AS ENUM ('CONTINUOUS_INCREMENTAL', 'ABSOLUTE_GAUGE');

-- 2. Create Tables
CREATE TABLE "asset_categories" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "parentId" UUID,
  "name" VARCHAR(100) NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "description" TEXT,
  "path" TEXT NOT NULL DEFAULT '/',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "asset_categories_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_categories_code_key" UNIQUE ("code"),
  CONSTRAINT "asset_categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "asset_categories"("id") ON DELETE RESTRICT
);

CREATE TABLE "locations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "branchId" UUID NOT NULL,
  "parentId" UUID,
  "departmentId" UUID,
  "name" VARCHAR(100) NOT NULL,
  "code" VARCHAR(30) NOT NULL,
  "building" VARCHAR(50),
  "floor" VARCHAR(30),
  "room" VARCHAR(30),
  "path" TEXT NOT NULL DEFAULT '/',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "locations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "locations_id_branchId_key" UNIQUE ("id", "branchId"),
  CONSTRAINT "locations_branchId_code_key" UNIQUE ("branchId", "code"),
  CONSTRAINT "locations_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "locations_parentId_branchId_fkey" FOREIGN KEY ("parentId", "branchId") REFERENCES "locations"("id", "branchId") ON DELETE RESTRICT,
  CONSTRAINT "locations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL
);

CREATE TABLE "assets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assetTag" VARCHAR(50) NOT NULL,
  "serialNumber" VARCHAR(100),
  "barcode" VARCHAR(100),
  "name" VARCHAR(150) NOT NULL,
  "description" TEXT,
  "ownershipType" "OwnershipType" NOT NULL DEFAULT 'COMPANY_OWNED',
  "managingOrgType" "ManagingOrgType" NOT NULL DEFAULT 'INTERNAL_BRANCH',
  "ownerCustomerId" UUID,
  "managingBranchId" UUID,
  "managingCustomerId" UUID,
  "categoryId" UUID NOT NULL,
  "branchId" UUID,
  "locationId" UUID,
  "physicalSiteCustomerId" UUID,
  "siteId" UUID,
  "responsibleUserId" UUID,
  "responsibleDepartmentId" UUID,
  "custodianUserId" UUID,
  "parentAssetId" UUID,
  "status" "AssetStatus" NOT NULL DEFAULT 'OPERATIONAL',
  "criticality" SMALLINT NOT NULL DEFAULT 3,
  "manufacturer" VARCHAR(100),
  "modelNumber" VARCHAR(100),
  "purchaseCost" DECIMAL(14,2),
  "purchaseDate" DATE,
  "installationDate" DATE,
  "warrantyExpiry" DATE,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "deletedAt" TIMESTAMPTZ,
  CONSTRAINT "assets_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "assets_assetTag_key" UNIQUE ("assetTag"),
  CONSTRAINT "assets_barcode_key" UNIQUE ("barcode"),
  CONSTRAINT "assets_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "asset_categories"("id") ON DELETE RESTRICT,
  CONSTRAINT "assets_ownerCustomerId_fkey" FOREIGN KEY ("ownerCustomerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "assets_managingBranchId_fkey" FOREIGN KEY ("managingBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "assets_managingCustomerId_fkey" FOREIGN KEY ("managingCustomerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "assets_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "assets_locationId_branchId_fkey" FOREIGN KEY ("locationId", "branchId") REFERENCES "locations"("id", "branchId") ON DELETE RESTRICT,
  CONSTRAINT "assets_siteId_physicalSiteCustomerId_fkey" FOREIGN KEY ("siteId", "physicalSiteCustomerId") REFERENCES "customer_sites"("id", "customerId") ON DELETE RESTRICT,
  CONSTRAINT "assets_responsibleUserId_fkey" FOREIGN KEY ("responsibleUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "assets_responsibleDepartmentId_fkey" FOREIGN KEY ("responsibleDepartmentId") REFERENCES "departments"("id") ON DELETE SET NULL,
  CONSTRAINT "assets_custodianUserId_fkey" FOREIGN KEY ("custodianUserId") REFERENCES "users"("id") ON DELETE SET NULL,
  CONSTRAINT "assets_parentAssetId_fkey" FOREIGN KEY ("parentAssetId") REFERENCES "assets"("id") ON DELETE RESTRICT
);

CREATE TABLE "asset_locations_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assetId" UUID NOT NULL,
  "fromLocationId" UUID,
  "toLocationId" UUID,
  "fromPhysicalSiteCustomerId" UUID,
  "fromSiteId" UUID,
  "toPhysicalSiteCustomerId" UUID,
  "toSiteId" UUID,
  "snapshotOwnershipType" "OwnershipType" NOT NULL,
  "snapshotOwnerCustomerId" UUID,
  "snapshotManagingOrg" "ManagingOrgType" NOT NULL,
  "movedByUserId" UUID NOT NULL,
  "reason" TEXT,
  "movedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_locations_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_locations_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_locations_history_fromLocationId_fkey" FOREIGN KEY ("fromLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_locations_history_toLocationId_fkey" FOREIGN KEY ("toLocationId") REFERENCES "locations"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_locations_history_fromSiteId_fromPhysicalSiteCustomerId_fkey" FOREIGN KEY ("fromSiteId", "fromPhysicalSiteCustomerId") REFERENCES "customer_sites"("id", "customerId") ON DELETE RESTRICT,
  CONSTRAINT "asset_locations_history_toSiteId_toPhysicalSiteCustomerId_fkey" FOREIGN KEY ("toSiteId", "toPhysicalSiteCustomerId") REFERENCES "customer_sites"("id", "customerId") ON DELETE RESTRICT,
  CONSTRAINT "asset_locations_history_movedByUserId_fkey" FOREIGN KEY ("movedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "asset_status_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assetId" UUID NOT NULL,
  "fromStatus" "AssetStatus" NOT NULL,
  "toStatus" "AssetStatus" NOT NULL,
  "changedByUserId" UUID NOT NULL,
  "reason" TEXT,
  "changedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_status_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_status_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_status_history_changedByUserId_fkey" FOREIGN KEY ("changedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "asset_ownership_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assetId" UUID NOT NULL,
  "fromOwnershipType" "OwnershipType" NOT NULL,
  "toOwnershipType" "OwnershipType" NOT NULL,
  "fromOwnerCustomerId" UUID,
  "toOwnerCustomerId" UUID,
  "transferredByUserId" UUID NOT NULL,
  "reason" TEXT,
  "transferredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_ownership_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_ownership_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_ownership_history_fromOwnerCustomerId_fkey" FOREIGN KEY ("fromOwnerCustomerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_ownership_history_toOwnerCustomerId_fkey" FOREIGN KEY ("toOwnerCustomerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_ownership_history_transferredByUserId_fkey" FOREIGN KEY ("transferredByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "asset_management_history" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assetId" UUID NOT NULL,
  "fromManagingOrg" "ManagingOrgType" NOT NULL,
  "toManagingOrg" "ManagingOrgType" NOT NULL,
  "fromManagingBranchId" UUID,
  "toManagingBranchId" UUID,
  "fromManagingCustomerId" UUID,
  "toManagingCustomerId" UUID,
  "transferredByUserId" UUID NOT NULL,
  "reason" TEXT,
  "transferredAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_management_history_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_management_history_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_management_history_fromManagingBranchId_fkey" FOREIGN KEY ("fromManagingBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_management_history_toManagingBranchId_fkey" FOREIGN KEY ("toManagingBranchId") REFERENCES "branches"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_management_history_fromManagingCustomerId_fkey" FOREIGN KEY ("fromManagingCustomerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_management_history_toManagingCustomerId_fkey" FOREIGN KEY ("toManagingCustomerId") REFERENCES "customers"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_management_history_transferredByUserId_fkey" FOREIGN KEY ("transferredByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "asset_meters" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assetId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "unitOfMeasure" VARCHAR(30) NOT NULL,
  "meterType" "MeterReadingType" NOT NULL DEFAULT 'CONTINUOUS_INCREMENTAL',
  "initialReading" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "currentReading" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "rolloverThreshold" DECIMAL(14,2),
  "lastReadingAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_meters_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_meters_assetId_name_key" UNIQUE ("assetId", "name"),
  CONSTRAINT "asset_meters_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT
);

CREATE TABLE "meter_readings" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "meterId" UUID NOT NULL,
  "readingValue" DECIMAL(14,2) NOT NULL,
  "delta" DECIMAL(14,2) NOT NULL DEFAULT 0.00,
  "isRollover" BOOLEAN NOT NULL DEFAULT false,
  "isReset" BOOLEAN NOT NULL DEFAULT false,
  "recordedByUserId" UUID NOT NULL,
  "readingTimestamp" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "meter_readings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "meter_readings_meterId_fkey" FOREIGN KEY ("meterId") REFERENCES "asset_meters"("id") ON DELETE RESTRICT,
  CONSTRAINT "meter_readings_recordedByUserId_fkey" FOREIGN KEY ("recordedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "asset_downtime_logs" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assetId" UUID NOT NULL,
  "downtimeType" "DowntimeType" NOT NULL DEFAULT 'UNPLANNED',
  "previousAssetStatus" "AssetStatus" NOT NULL DEFAULT 'OPERATIONAL',
  "statusWasChanged" BOOLEAN NOT NULL DEFAULT false,
  "downStatusTransitionId" UUID,
  "reason" TEXT NOT NULL,
  "startedAt" TIMESTAMPTZ NOT NULL,
  "endedAt" TIMESTAMPTZ,
  "durationMinutes" INTEGER,
  "loggedByUserId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_downtime_logs_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_downtime_logs_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT,
  CONSTRAINT "asset_downtime_logs_downStatusTransitionId_fkey" FOREIGN KEY ("downStatusTransitionId") REFERENCES "asset_status_history"("id") ON DELETE SET NULL,
  CONSTRAINT "asset_downtime_logs_loggedByUserId_fkey" FOREIGN KEY ("loggedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "asset_boms" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "assetId" UUID NOT NULL,
  "partId" UUID,
  "partNumber" VARCHAR(50) NOT NULL,
  "partName" VARCHAR(150) NOT NULL,
  "quantityRequired" DECIMAL(14,2) NOT NULL DEFAULT 1.00,
  "uom" VARCHAR(20) NOT NULL DEFAULT 'PCS',
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "asset_boms_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "asset_boms_assetId_partNumber_key" UNIQUE ("assetId", "partNumber"),
  CONSTRAINT "asset_boms_assetId_fkey" FOREIGN KEY ("assetId") REFERENCES "assets"("id") ON DELETE RESTRICT
);

-- 3. Check Constraints & Indexes
ALTER TABLE "meter_readings" ADD CONSTRAINT "chk_meter_flags_exclusive" CHECK (
  NOT ("isRollover" = true AND "isReset" = true)
);

ALTER TABLE "assets" ADD CONSTRAINT "chk_asset_physical_placement" CHECK (
  ( "locationId" IS NOT NULL AND "branchId" IS NOT NULL AND "siteId" IS NULL AND "physicalSiteCustomerId" IS NULL ) OR
  ( "siteId" IS NOT NULL AND "physicalSiteCustomerId" IS NOT NULL AND "locationId" IS NULL AND "branchId" IS NULL ) OR
  ( "locationId" IS NULL AND "branchId" IS NULL AND "siteId" IS NULL AND "physicalSiteCustomerId" IS NULL )
);

ALTER TABLE "assets" ADD CONSTRAINT "chk_asset_legal_ownership" CHECK (
  ( "ownershipType" = 'CUSTOMER_OWNED' AND "ownerCustomerId" IS NOT NULL ) OR
  ( "ownershipType" = 'COMPANY_OWNED' AND "ownerCustomerId" IS NULL ) OR
  ( "ownershipType" = 'LEASED' AND "ownerCustomerId" IS NULL )
);

ALTER TABLE "assets" ADD CONSTRAINT "chk_asset_managing_org_integrity" CHECK (
  ( "managingOrgType" = 'INTERNAL_BRANCH' AND "managingBranchId" IS NOT NULL AND "managingCustomerId" IS NULL ) OR
  ( "managingOrgType" = 'EXTERNAL_CONTRACTOR' AND "managingCustomerId" IS NOT NULL AND "managingBranchId" IS NULL )
);

ALTER TABLE "asset_management_history" ADD CONSTRAINT "chk_management_history_integrity" CHECK (
  ( "toManagingOrg" = 'INTERNAL_BRANCH' AND "toManagingBranchId" IS NOT NULL AND "toManagingCustomerId" IS NULL ) OR
  ( "toManagingOrg" = 'EXTERNAL_CONTRACTOR' AND "toManagingCustomerId" IS NOT NULL AND "toManagingBranchId" IS NULL )
);

ALTER TABLE "asset_ownership_history" ADD CONSTRAINT "chk_ownership_history_integrity" CHECK (
  ( "toOwnershipType" = 'CUSTOMER_OWNED' AND "toOwnerCustomerId" IS NOT NULL ) OR
  ( "toOwnershipType" IN ('COMPANY_OWNED', 'LEASED') AND "toOwnerCustomerId" IS NULL )
);

ALTER TABLE "asset_locations_history" ADD CONSTRAINT "chk_location_history_valid_movement" CHECK (
  ( "fromLocationId" IS NOT NULL AND "toLocationId" IS NOT NULL AND "fromSiteId" IS NULL AND "toSiteId" IS NULL ) OR
  ( "fromSiteId" IS NOT NULL AND "toSiteId" IS NOT NULL AND "fromLocationId" IS NULL AND "toLocationId" IS NULL ) OR
  ( "fromLocationId" IS NOT NULL AND "toSiteId" IS NOT NULL AND "fromSiteId" IS NULL AND "toLocationId" IS NULL ) OR
  ( "fromSiteId" IS NOT NULL AND "toLocationId" IS NOT NULL AND "fromLocationId" IS NULL AND "toSiteId" IS NULL ) OR
  ( "fromLocationId" IS NULL AND "fromSiteId" IS NULL AND "toLocationId" IS NOT NULL ) OR
  ( "fromLocationId" IS NULL AND "fromSiteId" IS NULL AND "toSiteId" IS NOT NULL ) OR
  ( "fromLocationId" IS NOT NULL AND "toLocationId" IS NULL AND "toSiteId" IS NULL ) OR
  ( "fromSiteId" IS NOT NULL AND "toLocationId" IS NULL AND "toSiteId" IS NULL )
);

ALTER TABLE "assets" ADD CONSTRAINT "chk_asset_criticality_range" CHECK ("criticality" BETWEEN 1 AND 5);
ALTER TABLE "asset_downtime_logs" ADD CONSTRAINT "chk_downtime_dates_valid" CHECK ("endedAt" IS NULL OR "endedAt" >= "startedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "asset_downtime_single_open_idx"
  ON "asset_downtime_logs" ("assetId")
 WHERE "endedAt" IS NULL;

CREATE INDEX IF NOT EXISTS "assets_branchId_idx" ON "assets" ("branchId");
CREATE INDEX IF NOT EXISTS "assets_locationId_idx" ON "assets" ("locationId");
CREATE INDEX IF NOT EXISTS "assets_physicalSiteCustomerId_siteId_idx" ON "assets" ("physicalSiteCustomerId", "siteId");
CREATE INDEX IF NOT EXISTS "assets_ownerCustomerId_idx" ON "assets" ("ownerCustomerId");
CREATE INDEX IF NOT EXISTS "assets_managingBranchId_idx" ON "assets" ("managingBranchId");
CREATE INDEX IF NOT EXISTS "assets_managingCustomerId_idx" ON "assets" ("managingCustomerId");
CREATE INDEX IF NOT EXISTS "assets_categoryId_idx" ON "assets" ("categoryId");
CREATE INDEX IF NOT EXISTS "assets_status_idx" ON "assets" ("status");
CREATE INDEX IF NOT EXISTS "assets_custodianUserId_idx" ON "assets" ("custodianUserId");
CREATE INDEX IF NOT EXISTS "assets_responsibleUserId_idx" ON "assets" ("responsibleUserId");
CREATE INDEX IF NOT EXISTS "assets_responsibleDepartmentId_idx" ON "assets" ("responsibleDepartmentId");

-- 4. Immutability Triggers & Privilege Revocations
CREATE OR REPLACE FUNCTION prevent_history_tampering() RETURNS trigger AS $$
BEGIN
  RAISE EXCEPTION 'TAMPER_PROTECTION: Historical audit records are immutable. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asset_locations_history_immutable ON "asset_locations_history";
CREATE TRIGGER trg_asset_locations_history_immutable
  BEFORE UPDATE OR DELETE ON "asset_locations_history"
  FOR EACH ROW EXECUTE FUNCTION prevent_history_tampering();

DROP TRIGGER IF EXISTS trg_asset_status_history_immutable ON "asset_status_history";
CREATE TRIGGER trg_asset_status_history_immutable
  BEFORE UPDATE OR DELETE ON "asset_status_history"
  FOR EACH ROW EXECUTE FUNCTION prevent_history_tampering();

DROP TRIGGER IF EXISTS trg_asset_ownership_history_immutable ON "asset_ownership_history";
CREATE TRIGGER trg_asset_ownership_history_immutable
  BEFORE UPDATE OR DELETE ON "asset_ownership_history"
  FOR EACH ROW EXECUTE FUNCTION prevent_history_tampering();

DROP TRIGGER IF EXISTS trg_asset_management_history_immutable ON "asset_management_history";
CREATE TRIGGER trg_asset_management_history_immutable
  BEFORE UPDATE OR DELETE ON "asset_management_history"
  FOR EACH ROW EXECUTE FUNCTION prevent_history_tampering();

DROP TRIGGER IF EXISTS trg_meter_readings_immutable ON "meter_readings";
CREATE TRIGGER trg_meter_readings_immutable
  BEFORE UPDATE OR DELETE ON "meter_readings"
  FOR EACH ROW EXECUTE FUNCTION prevent_history_tampering();

CREATE OR REPLACE FUNCTION protect_downtime_logs() RETURNS trigger AS $$
BEGIN
  IF OLD."endedAt" IS NULL AND NEW."endedAt" IS NOT NULL THEN
    IF OLD."id" IS DISTINCT FROM NEW."id" OR
       OLD."startedAt" IS DISTINCT FROM NEW."startedAt" OR
       OLD."assetId" IS DISTINCT FROM NEW."assetId" OR
       OLD."downtimeType" IS DISTINCT FROM NEW."downtimeType" OR
       OLD."previousAssetStatus" IS DISTINCT FROM NEW."previousAssetStatus" OR
       OLD."statusWasChanged" IS DISTINCT FROM NEW."statusWasChanged" OR
       OLD."downStatusTransitionId" IS DISTINCT FROM NEW."downStatusTransitionId" OR
       OLD."reason" IS DISTINCT FROM NEW."reason" OR
       OLD."createdAt" IS DISTINCT FROM NEW."createdAt" OR
       OLD."loggedByUserId" IS DISTINCT FROM NEW."loggedByUserId" THEN
      RAISE EXCEPTION 'SECURITY_VIOLATION: Original downtime log fields are immutable during closure.';
    END IF;

    IF NEW."durationMinutes" IS NULL OR NEW."durationMinutes" <> ROUND(EXTRACT(EPOCH FROM (NEW."endedAt" - OLD."startedAt")) / 60) THEN
      RAISE EXCEPTION 'INVALID_DURATION: durationMinutes must equal exact minute difference between endedAt and startedAt.';
    END IF;

    RETURN NEW;
  END IF;

  RAISE EXCEPTION 'TAMPER_PROTECTION: Closed downtime records are immutable. UPDATE and DELETE operations are prohibited.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_asset_downtime_logs_closure ON "asset_downtime_logs";
CREATE TRIGGER trg_asset_downtime_logs_closure
  BEFORE UPDATE OR DELETE ON "asset_downtime_logs"
  FOR EACH ROW EXECUTE FUNCTION protect_downtime_logs();

REVOKE TRUNCATE ON "asset_locations_history" FROM PUBLIC;
REVOKE TRUNCATE ON "asset_status_history" FROM PUBLIC;
REVOKE TRUNCATE ON "asset_ownership_history" FROM PUBLIC;
REVOKE TRUNCATE ON "asset_management_history" FROM PUBLIC;
REVOKE TRUNCATE ON "meter_readings" FROM PUBLIC;
REVOKE TRUNCATE ON "asset_downtime_logs" FROM PUBLIC;
