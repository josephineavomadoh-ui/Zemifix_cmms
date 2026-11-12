-- AlterTable
ALTER TABLE "import_batches" ADD COLUMN "contentHash" VARCHAR(64);
ALTER TABLE "import_batches" ADD COLUMN "mappingJson" JSONB;

-- CreateIndex
CREATE UNIQUE INDEX "import_batches_contentHash_key" ON "import_batches"("contentHash");
