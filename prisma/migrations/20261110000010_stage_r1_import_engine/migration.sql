-- CreateTable
CREATE TABLE "import_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entityType" VARCHAR(50) NOT NULL,
    "status" VARCHAR(30) NOT NULL,
    "fileName" VARCHAR(255) NOT NULL,
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "successRows" INTEGER NOT NULL DEFAULT 0,
    "errorRows" INTEGER NOT NULL DEFAULT 0,
    "actorUserId" UUID NOT NULL,
    "summaryJson" JSONB,
    "errorsJson" JSONB,
    "createdAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_batches_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "import_batches" ADD CONSTRAINT "import_batches_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateIndex
CREATE INDEX "import_batches_entityType_idx" ON "import_batches"("entityType");

-- CreateIndex
CREATE INDEX "import_batches_actorUserId_idx" ON "import_batches"("actorUserId");
