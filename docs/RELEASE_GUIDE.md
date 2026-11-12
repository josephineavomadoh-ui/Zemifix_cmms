# ZemiFix CMMS — Release & Deployment Guide (Stage R1 Phase 5)

## 1. System Overview & Technology Stack
ZemiFix CMMS is a commercial-grade modular monolith built for maintenance operations:
- **Framework:** Next.js 15 App Router (React 19)
- **Database:** PostgreSQL 16+ with Prisma ORM 6.19.3
- **Primary Timezone:** Africa/Accra
- **Architecture:** Single-company deployment supporting Facility Mode, Contractor Mode, and Customer Portal

---

## 2. Environment Configuration

Copy `.env.example` to `.env` and populate all required production secrets (minimum 32 characters for encryption keys):

```env
NODE_ENV=production
DATABASE_URL=postgresql://user:password@localhost:5432/zemifix_prod?schema=public
SESSION_SECRET=min-32-char-production-session-secret-key-replace!
OTP_SECRET=min-32-char-production-otp-secret-key-replace!
PORTAL_SESSION_SECRET=min-32-char-production-portal-secret-key-replace!
APPROVAL_SECRET=min-32-char-production-approval-secret-key-replace!
WORKER_SECRET=min-32-char-production-worker-secret-key-replace!
NEXT_PUBLIC_APP_URL=https://cmms.zemifix.com
RESEND_API_KEY=re_your_resend_api_key_here
OTP_FROM_EMAIL=no-reply@zemifix.com
TZ=Africa/Accra
```

> **Security Note:** Never commit `.env` files or hardcode production credentials. All secrets are validated at application startup by `validateEnvironment()`.

---

## 3. Database Migration, Backup & Restoration Procedures

### Applying Migrations
Apply all 24 additive Prisma migrations to the production PostgreSQL database:
```bash
npx prisma migrate deploy
```

### Checking Migration Status
Verify database schema state:
```bash
npx prisma migrate status
```

### 3.1 Backup Creation

#### Linux / macOS (Bash)
```bash
pg_dump -d "$DATABASE_URL" -F c -f "zemifix_backup_$(date +%Y%m%d_%H%M%S).dump"
```

#### Windows (PowerShell)
```powershell
$timestamp = Get-Date -Format "yyyyMMdd_HHmmss"
pg_dump -d $env:DATABASE_URL -F c -f "zemifix_backup_$timestamp.dump"
```

### 3.2 Backup Integrity Checking
Verify the archive Table of Contents (TOC) without modifying any database:
```bash
pg_restore --list "zemifix_backup_20261111_085400.dump"
```

### 3.3 Safe Temporary-Database Restoration Testing

> [!CAUTION]
> **CRITICAL RESTORATION WARNING:**  
> Never point `pg_restore` at a live production or working development database (`zemifix_dev`).  
> Never use `--clean` or `--cascade` against active database environments. Restoration testing MUST always be conducted in a separate temporary database.

#### Linux / macOS (Bash)
```bash
# 1. Create temporary test database
createdb -h localhost -U postgres zemifix_restore_test_temp

# 2. Restore dump into temporary test database
pg_restore -h localhost -U postgres -d zemifix_restore_test_temp "zemifix_backup_20261111.dump"

# 3. Verify record counts
psql -h localhost -U postgres -d zemifix_restore_test_temp -c "SELECT count(*) FROM work_orders; SELECT count(*) FROM assets;"

# 4. Clean up temporary test database
dropdb -h localhost -U postgres zemifix_restore_test_temp
```

#### Windows (PowerShell)
```powershell
# 1. Create temporary test database
createdb -h localhost -U postgres zemifix_restore_test_temp

# 2. Restore dump into temporary test database
pg_restore -h localhost -U postgres -d zemifix_restore_test_temp "zemifix_backup_20261111.dump"

# 3. Verify record counts
psql -h localhost -U postgres -d zemifix_restore_test_temp -c "SELECT count(*) FROM work_orders; SELECT count(*) FROM assets;"

# 4. Clean up temporary test database
dropdb -h localhost -U postgres zemifix_restore_test_temp
```

---

## 4. Background Worker & Scheduler Integration

### External Scheduler Configuration
Configure system cron or cloud scheduler (e.g., AWS EventBridge) to trigger the worker loop every 1–5 minutes:
```bash
curl -X POST https://cmms.zemifix.com/api/internal/workers/run \
  -H "x-worker-secret: $WORKER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{"workerId": "cron-daemon-01"}'
```

### Worker Capability Summary
- **Job Types:** `GENERATE_PREVENTIVE_MAINTENANCE`, `MONITOR_SLAS`, `PROCESS_NOTIFICATIONS`
- **Concurrency Protection:** PostgreSQL `FOR UPDATE SKIP LOCKED`
- **Lease Duration:** 5 minutes (abandoned/crashed jobs automatically reclaimed upon lease expiry)
- **Exponential Backoff:** `2^n` seconds delay between retries
- **Monitoring:** Admin dashboard at `/workers` and metrics API at `/api/internal/workers/metrics`

---

## 5. Security & Access-Control Release Checklist

- [x] **Realm Isolation:** Staff login (`/login`) and Customer Portal login (`/portal/login`) use isolated session cookies and authentication realms.
- [x] **Mandatory OTP Verification:** OTP step-up verification enforced for critical authentication flows.
- [x] **Data Access Scopes:** Company, Branch, and Department level data access scopes strictly enforced across all query services.
- [x] **Maker-Checker Controls:** Approval workflows and step controls enforced on sensitive operational and financial actions.
- [x] **Audit & Ledger Integrity:** Historical `audit_logs` table protected by immutable database triggers. Stock transactions enforced as append-only.
- [x] **Security Headers & CSRF:** Strict Transport Security (HSTS), Content Security Policy (CSP), X-Content-Type-Options, X-Frame-Options, and Request-Origin CSRF validation enforced in middleware.

---

## 6. Operational Watchlist & Performance Limitations

> [!IMPORTANT]
> Phase 4 performance verification was conducted on a development dataset (104 work orders, 79 assets).
> Work Order Dashboard aggregation (~567 ms) is placed on the **Operational Performance Watchlist** for production-scale monitoring as record volumes grow.

---

## 7. Release Verification Checklist

1. [x] Run TypeScript Typecheck: `npm run lint` (`tsc --noEmit`)
2. [x] Run PostgreSQL Integration Test Suite: `npx tsx scripts/test_stage_r1_phase3.ts`
3. [x] Run Performance Verification Suite: `npx tsx scripts/test_stage_r1_phase4_performance.ts`
4. [x] Run Backup & Restore Verification: `npx tsx scripts/test_backup_restore.ts`
5. [x] Run Next.js Production Build: `npx next build`
6. [x] Verify Prisma Migration Status: `npx prisma migrate status`
