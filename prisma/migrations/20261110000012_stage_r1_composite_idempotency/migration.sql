-- DropIndex
DROP INDEX IF EXISTS "import_batches_contentHash_key";

-- CreateIndex
CREATE UNIQUE INDEX "import_batches_contentHash_entityType_key" ON "import_batches"("contentHash", "entityType");
