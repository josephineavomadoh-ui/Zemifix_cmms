-- CreateTable
CREATE TABLE "background_workers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "workerId" VARCHAR(100) NOT NULL,
    "status" VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
    "currentJobId" UUID,
    "lastHeartbeatAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "background_workers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "background_workers_workerId_key" ON "background_workers"("workerId");
