-- CreateIndex
CREATE INDEX "audit_logs_resource_resourceId_createdAt_idx" ON "audit_logs"("resource", "resourceId", "createdAt");

-- CreateIndex
CREATE INDEX "audit_logs_actorUserId_createdAt_idx" ON "audit_logs"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "assets_branchId_status_categoryId_idx" ON "assets"("branchId", "status", "categoryId");

-- CreateIndex
CREATE INDEX "assets_managingBranchId_status_idx" ON "assets"("managingBranchId", "status");

-- CreateIndex
CREATE INDEX "assets_deletedAt_status_idx" ON "assets"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "work_orders_branchId_status_createdAt_idx" ON "work_orders"("branchId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "work_orders_assignedUserId_status_plannedStart_idx" ON "work_orders"("assignedUserId", "status", "plannedStart");

-- CreateIndex
CREATE INDEX "work_orders_customerId_status_createdAt_idx" ON "work_orders"("customerId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "work_orders_deletedAt_status_idx" ON "work_orders"("deletedAt", "status");

-- CreateIndex
CREATE INDEX "stock_transactions_storeId_partId_createdAt_idx" ON "stock_transactions"("storeId", "partId", "createdAt");

-- CreateIndex
CREATE INDEX "background_jobs_status_jobType_expiresAt_createdAt_idx" ON "background_jobs"("status", "jobType", "expiresAt", "createdAt");
