-- AlterTable
ALTER TABLE "users" ADD COLUMN "activationTokenHash" VARCHAR(64);
ALTER TABLE "users" ADD COLUMN "activationExpiresAt" TIMESTAMPTZ;

-- CreateIndex
CREATE UNIQUE INDEX "users_activationTokenHash_key" ON "users"("activationTokenHash");

-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN "mappingHash" VARCHAR(64);
ALTER TABLE "import_batches" ADD COLUMN "workerId" VARCHAR(100);
ALTER TABLE "import_batches" ADD COLUMN "startedAt" TIMESTAMPTZ;
ALTER TABLE "import_batches" ADD COLUMN "expiresAt" TIMESTAMPTZ;

-- DropIndex
DROP INDEX IF EXISTS "import_batches_contentHash_entityType_key";

-- CreateIndex
CREATE UNIQUE INDEX "import_batches_contentHash_entityType_mappingHash_key" ON "import_batches"("contentHash", "entityType", "mappingHash");
