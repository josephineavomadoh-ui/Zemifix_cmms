# ZemiFix CMMS — Disposable Database Testing & Verification Procedure

**Target Environment:** Local Windows Workstation  
**Production / Staging Database to Preserve:** `zemifix_dev`  
**Disposable Sandbox Database:** `zemifix_reconcile_test`  
**Database Engine:** PostgreSQL 18  

---

## 1. PURPOSE & SAFETY PROTOCOL

This procedure allows full dry-run testing of the Stage 1 In-Place Reconciliation Migration against an exact replica of `zemifix_dev` without touching the real database.

```
+-----------------------------------------------------------------------------------------+
|                                 ABSOLUTE SAFETY RULE                                    |
| Never execute untried migration scripts directly on `zemifix_dev`.                      |
| Always execute this test run on `zemifix_reconcile_test` first.                         |
| Only proceed to `zemifix_dev` once all automated verification checks return 100% PASS.  |
+-----------------------------------------------------------------------------------------+
```

---

## 2. STEP-BY-STEP DISPOSABLE DATABASE RESTORATION & TESTING

### Step 1: Create Backup of Existing `zemifix_dev`
Open Windows Command Prompt or PowerShell (as Administrator or your standard PostgreSQL user):

```cmd
:: Export binary dump of existing zemifix_dev database
pg_dump -h localhost -p 5432 -U postgres -d zemifix_dev -F c -b -v -f zemifix_dev_backup.dump
```

*Note: Replace `postgres` with your PostgreSQL superuser username if different.*

---

### Step 2: Create a Fresh Disposable Database
In pgAdmin Query Tool or psql:

```sql
-- Drop any previous test database if it exists
DROP DATABASE IF EXISTS zemifix_reconcile_test;

-- Create fresh disposable database
CREATE DATABASE zemifix_reconcile_test;
```

---

### Step 3: Restore the Backup into the Disposable Database

```cmd
:: Restore into the disposable test database
pg_restore -h localhost -p 5432 -U postgres -d zemifix_reconcile_test -v zemifix_dev_backup.dump
```

Verify that the restored database contains your original 7 foundation tables and records.

---

### Step 4: Execute Pre-Migration Validation on Disposable Database
In pgAdmin (connected to `zemifix_reconcile_test`) or psql:

```cmd
psql -h localhost -p 5432 -U postgres -d zemifix_reconcile_test -f prisma/reconciliation/01_pre_migration_validation.sql
```

**Verification criteria:**
- Row counts match expectations.
- Invalid PK count = 0.
- Invalid FK count = 0.
- Orphan count = 0.
- Admin user record is returned with bcrypt password hash intact.

---

### Step 5: Execute Migration via Prisma Migrate Deploy on Disposable Database

Point your `.env` to the disposable test database:
```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zemifix_reconcile_test?schema=public"
```

Execute the migration using Prisma's official deployment engine:
```cmd
:: Deploys 20261107000001_stage1_foundation_extension atomically
npx prisma migrate deploy

:: Confirm Prisma status reports zero drift
npx prisma migrate status
```

*(Alternatively, if executing raw SQL through psql/pgAdmin: `psql -h localhost -p 5432 -U postgres -d zemifix_reconcile_test -f prisma/reconciliation/02_reconciliation_migration.sql` followed by `npx prisma migrate resolve --applied 20261107000001_stage1_foundation_extension`)*

---

### Step 6: Execute Post-Migration Verification Script on Disposable Database

```cmd
psql -h localhost -p 5432 -U postgres -d zemifix_reconcile_test -f prisma/reconciliation/03_post_migration_verification.sql
```

**Verification criteria:**
- All 15 tables return `PRESENT`.
- All `id` columns return `PASSED (UUID)`.
- All timestamps return `PASSED (TIMESTAMPTZ)`.
- Orphan count = 0.
- Admin user record is preserved with identical password hash.
- UUIDv7 generator returns `PASSED RFC 9562 UUIDv7`.
- Trigger `tg_enforce_customer_site_grant_isolation` is active.

---

### Step 7: Test Prisma Application Connectivity Against Disposable Database
Temporarily update your local `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/zemifix_reconcile_test?schema=public"
```

Run validation and seed checks:

```cmd
:: Verify Prisma recognizes the database schema without error
npx prisma validate

:: Run functional milestone test suite
npx tsx scripts/test_milestone1.ts
```

---

### Step 8: Clean Up Disposable Database
Once tests pass 100%:

```sql
DROP DATABASE IF EXISTS zemifix_reconcile_test;
```

You are now certified ready to execute the migration on `zemifix_dev` using the exact same steps.
