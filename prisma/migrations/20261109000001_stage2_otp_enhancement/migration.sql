-- =============================================================================
-- ZemiFix CMMS — Migration: Stage 2 OTP Enhancement
-- Name: 20261109000001_stage2_otp_enhancement
-- Engine: PostgreSQL 18
-- Prisma: 6.19.3
--
-- Adds to auth_otps:
--   1. "ipAddress"     VARCHAR(45)  — audit: IPv4 (max 15) or IPv6 (max 45)
--   2. "invalidatedAt" TIMESTAMPTZ  — soft-invalidation on resend; row kept for audit
--
-- Also confirms the existing XOR constraint (deployed by Stage 1) is present.
--
-- Partial indexes are deployed by successor migrations:
--   20261109000002_stage2_otp_user_index
--   20261109000003_stage2_otp_contact_index
--
-- History:
--   This file previously contained CREATE INDEX CONCURRENTLY statements in a
--   second section. Those statements caused PostgreSQL error 25001 because
--   prisma migrate deploy wraps every migration file in an implicit transaction,
--   and CONCURRENTLY is prohibited inside any transaction block.
--   The CREATE INDEX CONCURRENTLY statements have been removed from this file
--   and placed in dedicated single-statement migration files, which execute
--   outside any transaction block when applied by prisma migrate deploy.
--
--   This file has never successfully completed (finished_at = NULL in
--   _prisma_migrations). Editing it is safe. The two earlier applied
--   migrations (20261105111818_init, 20261107000001_stage1_foundation_extension)
--   are not affected.
--
-- Column naming:
--   auth_otps was created by Stage 1 using camelCase quoted identifiers
--   ("userId", "customerContactId", "otpCodeHash", "consumedAt", etc.).
--   New columns follow the same convention: "ipAddress", "invalidatedAt".
--   No @map attributes are required in the Prisma schema.
--
-- Does NOT recreate:
--   - chk_auth_otp_actor_xor  (deployed in Stage 1; guard below is a no-op
--                               if already present — confirmed present via
--                               pg_constraint query before migration retry)
--   - chk_auth_otp_purpose    (deployed in Stage 1)
--   - chk_auth_otp_channel    (deployed in Stage 1)
--
-- Safety:
--   - Both ADD COLUMN statements use IF NOT EXISTS — idempotent on retry.
--   - Both columns are nullable with no default — zero effect on existing rows.
--   - No existing rows are modified, deleted, or rewritten.
--   - No existing indexes or constraints are dropped or altered.
-- =============================================================================

BEGIN;

-- 1. Add "ipAddress" column (nullable VARCHAR(45)).
--    Supports IPv4 (dotted-decimal, max 15 chars) and
--    IPv6 (full colon notation, max 39 chars; mapped IPv4, max 45 chars).
--    Named "ipAddress" in camelCase to match the existing convention in this table.
ALTER TABLE "auth_otps"
  ADD COLUMN IF NOT EXISTS "ipAddress" VARCHAR(45);

-- 2. Add "invalidatedAt" column (nullable TIMESTAMPTZ).
--    Set by the OTP service when a challenge is superseded by a resend.
--    NULL means the row has not been invalidated.
--    Kept permanently for audit; a cleanup job targets rows older than 90 days.
ALTER TABLE "auth_otps"
  ADD COLUMN IF NOT EXISTS "invalidatedAt" TIMESTAMPTZ;

-- 3. Confirm the XOR constraint is present.
--    chk_auth_otp_actor_xor was deployed in Stage 1 and confirmed present
--    in pg_constraint before this migration retry. This guard is a no-op
--    when the constraint already exists; it is retained as a safety net only.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'chk_auth_otp_actor_xor'
      AND conrelid = 'auth_otps'::regclass
  ) THEN
    ALTER TABLE "auth_otps"
      ADD CONSTRAINT "chk_auth_otp_actor_xor"
      CHECK (
        ("userId" IS NOT NULL AND "customerContactId" IS NULL)
        OR
        ("userId" IS NULL AND "customerContactId" IS NOT NULL)
      );
  END IF;
END $$;

COMMIT;
