-- CreateTable
CREATE TABLE "background_jobs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "jobType" VARCHAR(60) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    "payload" JSONB NOT NULL DEFAULT '{}',
    "result" JSONB,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "maxRetries" INTEGER NOT NULL DEFAULT 5,
    "workerId" VARCHAR(100),
    "startedAt" TIMESTAMPTZ,
    "expiresAt" TIMESTAMPTZ,
    "completedAt" TIMESTAMPTZ,
    "lastError" TEXT,
    "idempotencyKey" VARCHAR(200) NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "background_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "background_jobs_idempotencyKey_key" ON "background_jobs"("idempotencyKey");

-- CreateIndex
CREATE INDEX "background_jobs_status_jobType_idx" ON "background_jobs"("status", "jobType");

-- CreateIndex
CREATE INDEX "background_jobs_expiresAt_idx" ON "background_jobs"("expiresAt");
