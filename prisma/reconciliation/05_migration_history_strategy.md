# ZemiFix CMMS — Prisma Migration History Strategy & Deployment Sequence

**Baseline Migration in `zemifix_dev`:** `20261105111818_init`  
**Target Migration to Register:** `20261107000001_stage1_foundation_extension`  
**Prisma Tracking Table:** `_prisma_migrations`  

---

## 1. HOW PRISMA MIGRATION TRACKING WORKS

Prisma tracks applied migrations in the PostgreSQL internal table `_prisma_migrations`.
Each record contains:
- `id`: Unique migration execution identifier (UUID string).
- `checksum`: SHA-256 hash of the `migration.sql` file content.
- `finished_at`: Timestamp when the migration finished.
- `migration_name`: Folder name (e.g. `20261105111818_init`).
- `logs`: Execution output log.
- `rolled_back_at`: Null if successful.
- `started_at`: Timestamp when migration began.
- `applied_steps_count`: Integer count of migration steps applied (1).

```
+-----------------------------------------------------------------------------------------+
|                                    CRITICAL PRINCIPLE                                   |
| Never run `prisma migrate resolve --applied` as a substitute for executing the actual   |
| DDL statements! Doing so marks the migration as complete in the metadata table while    |
| leaving the actual database tables with incompatible TEXT and TIMESTAMP types.          |
+-----------------------------------------------------------------------------------------+
```

---

## 2. DEPLOYMENT SEQUENCE OPTIONS

There are two safe, verified deployment pathways to execute and record the Stage 1 reconciliation:

### PATHWAY A: Prisma Migrate Native Pipeline (`npx prisma migrate deploy` — RECOMMENDED)
Because `prisma/migrations/20261107000001_stage1_foundation_extension/migration.sql` now contains the complete, verified in-place reconciliation SQL without any psql-specific meta-commands:

1. Prisma reads `_prisma_migrations` and sees that `20261105111818_init` is already applied.
2. Prisma detects `20261107000001_stage1_foundation_extension` as pending.
3. Running:
   ```bash
   npx prisma migrate deploy
   ```
   executes the reconciliation SQL inside an atomic transaction, computes the exact SHA-256 hash automatically, and records the entry in `_prisma_migrations`.
4. Run `03_post_migration_verification.sql` to independently verify database state.
5. Run `npx prisma migrate status` $\rightarrow$ Reports: `"Database schema is up to date!"`.

---

### PATHWAY B: Manual SQL Execution Followed by `prisma migrate resolve`
If organizational policy requires running the migration SQL directly through pgAdmin or `psql` before Prisma is invoked:

1. Execute `01_pre_migration_validation.sql` $\rightarrow$ Confirm 0 errors.
2. Execute `02_reconciliation_migration.sql` (or `migration.sql`) directly via pgAdmin/psql $\rightarrow$ Alters foundation in-place, creates 8 tables.
3. Execute `03_post_migration_verification.sql` $\rightarrow$ Confirm 100% PASS on all 10 checks.
4. Tell Prisma that the verified migration has been applied (do NOT manually `INSERT` into `_prisma_migrations`):
   ```bash
   npx prisma migrate resolve --applied 20261107000001_stage1_foundation_extension
   ```
5. Run `npx prisma migrate status` $\rightarrow$ Confirms: `"Database schema is up to date!"` with zero schema drift.

---

## 3. PRESERVING THE EXISTING BASELINE RECORD

Under both pathways:
- The existing record for `20261105111818_init` is **never modified, deleted, or re-run**.
- `_prisma_migrations` will contain exactly two historical entries:
  1. `20261105111818_init` (Preserved foundation origin)
  2. `20261107000001_stage1_foundation_extension` (Reconciled Stage 1)
- Future stages (Stage 2 through Stage 7) will sequence cleanly on top of this verified foundation.
