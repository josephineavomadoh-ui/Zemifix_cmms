-- =============================================================================
-- ZemiFix CMMS — Migration: Stage D.2a Step Uniqueness & Multi-Step Enhancement
-- Engine Target: PostgreSQL 16, 17 & 18
-- =============================================================================

-- 1. Drop old compound unique constraint [stepId, checkerUserId]
ALTER TABLE "approval_actions" DROP CONSTRAINT IF EXISTS "approval_actions_stepId_checkerUserId_key";

-- 2. Add strict single decision total per step unique constraint [stepId]
ALTER TABLE "approval_actions" ADD CONSTRAINT "approval_actions_stepId_key" UNIQUE ("stepId");
