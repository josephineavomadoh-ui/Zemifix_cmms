-- =============================================================================
-- ZemiFix CMMS — Migration: Stage R1 Technician PWA & Offline Synchronization
-- Engine Target: PostgreSQL 16, 17 & 18
-- Sequence Number: 20261110000005_stage_r1_pwa_offline_sync
-- =============================================================================

-- 1. Create Enums
CREATE TYPE "SyncBatchStatus" AS ENUM ('PROCESSING', 'COMPLETED', 'PARTIALLY_COMPLETED', 'FAILED');
CREATE TYPE "SyncMutationStatus" AS ENUM ('QUEUED', 'PROCESSING', 'SYNCED', 'CONFLICT', 'FAILED');
CREATE TYPE "SyncConflictType" AS ENUM ('WO_CANCELLED', 'WO_REASSIGNED', 'WO_STATUS_MISMATCH', 'WO_NOT_ACCESSIBLE', 'CHECKLIST_ALREADY_COMPLETED', 'STOCK_UNAVAILABLE', 'STALE_VERSION');

-- 2. Create Tables
CREATE TABLE "offline_sync_batches" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batchRef" VARCHAR(50) NOT NULL,
  "userId" UUID NOT NULL,
  "status" "SyncBatchStatus" NOT NULL DEFAULT 'PROCESSING',
  "mutationCount" INTEGER NOT NULL DEFAULT 0,
  "syncedCount" INTEGER NOT NULL DEFAULT 0,
  "conflictCount" INTEGER NOT NULL DEFAULT 0,
  "failedCount" INTEGER NOT NULL DEFAULT 0,
  "processedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offline_sync_batches_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "offline_sync_batches_batchRef_key" UNIQUE ("batchRef"),
  CONSTRAINT "offline_sync_batches_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "offline_sync_mutations" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "batchId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "idempotencyKey" VARCHAR(100) NOT NULL,
  "actionType" VARCHAR(50) NOT NULL,
  "entityType" VARCHAR(50) NOT NULL,
  "entityId" UUID NOT NULL,
  "payload" JSONB NOT NULL,
  "status" "SyncMutationStatus" NOT NULL DEFAULT 'QUEUED',
  "processingLeaseExpiresAt" TIMESTAMPTZ,
  "errorMessage" TEXT,
  "conflictReason" TEXT,
  "processedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offline_sync_mutations_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "offline_sync_mutations_userId_idempotencyKey_key" UNIQUE ("userId", "idempotencyKey"),
  CONSTRAINT "offline_sync_mutations_batchId_fkey" FOREIGN KEY ("batchId") REFERENCES "offline_sync_batches"("id") ON DELETE CASCADE,
  CONSTRAINT "offline_sync_mutations_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT
);

CREATE TABLE "offline_sync_conflicts" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "mutationId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "conflictType" "SyncConflictType" NOT NULL,
  "clientState" JSONB NOT NULL,
  "serverState" JSONB NOT NULL,
  "resolutionStrategy" VARCHAR(50) NOT NULL DEFAULT 'SERVER_WINS',
  "resolvedByUserId" UUID,
  "resolvedAt" TIMESTAMPTZ,
  "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "offline_sync_conflicts_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "offline_sync_conflicts_mutationId_fkey" FOREIGN KEY ("mutationId") REFERENCES "offline_sync_mutations"("id") ON DELETE RESTRICT,
  CONSTRAINT "offline_sync_conflicts_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT,
  CONSTRAINT "offline_sync_conflicts_resolvedByUserId_fkey" FOREIGN KEY ("resolvedByUserId") REFERENCES "users"("id") ON DELETE SET NULL
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS "offline_sync_batches_userId_idx" ON "offline_sync_batches" ("userId");
CREATE INDEX IF NOT EXISTS "offline_sync_batches_status_idx" ON "offline_sync_batches" ("status");

CREATE INDEX IF NOT EXISTS "offline_sync_mutations_batchId_idx" ON "offline_sync_mutations" ("batchId");
CREATE INDEX IF NOT EXISTS "offline_sync_mutations_status_idx" ON "offline_sync_mutations" ("status");

CREATE INDEX IF NOT EXISTS "offline_sync_conflicts_mutationId_idx" ON "offline_sync_conflicts" ("mutationId");
CREATE INDEX IF NOT EXISTS "offline_sync_conflicts_userId_idx" ON "offline_sync_conflicts" ("userId");
