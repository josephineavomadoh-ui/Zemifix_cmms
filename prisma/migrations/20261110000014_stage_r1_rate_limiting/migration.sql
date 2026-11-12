-- CreateTable
CREATE TABLE "rate_limits" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "key" VARCHAR(200) NOT NULL,
    "hitCount" INTEGER NOT NULL DEFAULT 1,
    "windowExpiresAt" TIMESTAMPTZ NOT NULL,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "rate_limits_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "rate_limits_key_key" ON "rate_limits"("key");

-- CreateIndex
CREATE INDEX "rate_limits_windowExpiresAt_idx" ON "rate_limits"("windowExpiresAt");
