-- ==============================================================================
-- ZEMIFIX CMMS — PRE-MIGRATION VALIDATION SCRIPT (READ-ONLY)
-- Database: zemifix_dev (PostgreSQL 18)
-- Purpose: Exhaustively inspect and validate existing foundation data before
--          executing in-place TEXT -> UUID and TIMESTAMP -> TIMESTAMPTZ conversion.
--
-- STRICT READ-ONLY: NO INSERTS, NO UPDATES, NO DELETES, NO DDL ALTERATIONS.
-- ==============================================================================

\set ON_ERROR_STOP on

BEGIN TRANSACTION READ ONLY;

-- ------------------------------------------------------------------------------
-- 1. DATABASE & ENVIRONMENT CONTEXT INSPECTION
-- ------------------------------------------------------------------------------
SELECT 
    current_database() AS database_name,
    current_user AS database_user,
    version() AS postgres_version,
    current_setting('server_version_num') AS pg_version_num,
    current_setting('TimeZone') AS server_timezone,
    current_setting('client_encoding') AS client_encoding;

-- ------------------------------------------------------------------------------
-- 2. EXISTING TABLE ROW COUNTS
-- Captures baseline counts to guarantee zero record loss post-migration.
-- ------------------------------------------------------------------------------
SELECT 'companies' AS table_name, count(*) AS total_rows FROM "companies"
UNION ALL
SELECT 'branches', count(*) FROM "branches"
UNION ALL
SELECT 'departments', count(*) FROM "departments"
UNION ALL
SELECT 'roles', count(*) FROM "roles"
UNION ALL
SELECT 'permissions', count(*) FROM "permissions"
UNION ALL
SELECT 'role_permissions', count(*) FROM "role_permissions"
UNION ALL
SELECT 'users', count(*) FROM "users"
ORDER BY table_name;

-- ------------------------------------------------------------------------------
-- 3. PRIMARY KEY UUID FORMAT VALIDATION
-- Verifies that EVERY existing primary key is a syntactically valid 36-character UUID.
-- Target: RFC 4122 / RFC 9562 standard hexadecimal format with hyphens (8-4-4-4-12).
-- Expected Result: 0 invalid rows for all tables.
-- ------------------------------------------------------------------------------
WITH invalid_pks AS (
    SELECT 'companies' AS table_name, "id" AS invalid_id FROM "companies" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'branches', "id" FROM "branches" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'departments', "id" FROM "departments" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'roles', "id" FROM "roles" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'permissions', "id" FROM "permissions" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'users', "id" FROM "users" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
)
SELECT 
    table_name,
    count(*) AS invalid_pk_count
FROM invalid_pks
GROUP BY table_name;

-- If invalid_pks has rows, output the specific offender keys:
SELECT 'FAILED_PK' AS check_type, table_name, invalid_id 
FROM (
    SELECT 'companies' AS table_name, "id" AS invalid_id FROM "companies" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'branches', "id" FROM "branches" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'departments', "id" FROM "departments" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'roles', "id" FROM "roles" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'permissions', "id" FROM "permissions" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'users', "id" FROM "users" 
        WHERE "id" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
) bad;

-- ------------------------------------------------------------------------------
-- 4. FOREIGN KEY UUID FORMAT VALIDATION
-- Verifies that EVERY non-null foreign key value is a valid UUID format.
-- Expected Result: 0 invalid rows for all foreign keys.
-- ------------------------------------------------------------------------------
WITH invalid_fks AS (
    SELECT 'branches.parentId' AS fk_column, "parentId" AS invalid_value 
    FROM "branches" WHERE "parentId" IS NOT NULL 
      AND "parentId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'departments.parentId', "parentId" 
    FROM "departments" WHERE "parentId" IS NOT NULL 
      AND "parentId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'users.roleId', "roleId" 
    FROM "users" WHERE "roleId" IS NOT NULL 
      AND "roleId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'users.branchId', "branchId" 
    FROM "users" WHERE "branchId" IS NOT NULL 
      AND "branchId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'users.departmentId', "departmentId" 
    FROM "users" WHERE "departmentId" IS NOT NULL 
      AND "departmentId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'role_permissions.roleId', "roleId" 
    FROM "role_permissions" WHERE "roleId" IS NOT NULL 
      AND "roleId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'role_permissions.permissionId', "permissionId" 
    FROM "role_permissions" WHERE "permissionId" IS NOT NULL 
      AND "permissionId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    UNION ALL
    SELECT 'companies.businessHoursCalendarId', "businessHoursCalendarId" 
    FROM "companies" WHERE "businessHoursCalendarId" IS NOT NULL 
      AND "businessHoursCalendarId" !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
)
SELECT 
    fk_column,
    count(*) AS invalid_fk_count
FROM invalid_fks
GROUP BY fk_column;

-- ------------------------------------------------------------------------------
-- 5. ORPHANED RELATIONSHIP INTEGRITY AUDIT
-- Detects if any foreign key points to a non-existent parent primary key.
-- Expected Result: 0 orphans across all relationships.
-- ------------------------------------------------------------------------------
SELECT 'branches.parentId -> branches.id' AS relation, count(*) AS orphan_count
FROM "branches" b
LEFT JOIN "branches" p ON b."parentId" = p."id"
WHERE b."parentId" IS NOT NULL AND p."id" IS NULL
UNION ALL
SELECT 'departments.parentId -> departments.id', count(*)
FROM "departments" d
LEFT JOIN "departments" p ON d."parentId" = p."id"
WHERE d."parentId" IS NOT NULL AND p."id" IS NULL
UNION ALL
SELECT 'users.roleId -> roles.id', count(*)
FROM "users" u
LEFT JOIN "roles" r ON u."roleId" = r."id"
WHERE u."roleId" IS NOT NULL AND r."id" IS NULL
UNION ALL
SELECT 'users.branchId -> branches.id', count(*)
FROM "users" u
LEFT JOIN "branches" b ON u."branchId" = b."id"
WHERE u."branchId" IS NOT NULL AND b."id" IS NULL
UNION ALL
SELECT 'users.departmentId -> departments.id', count(*)
FROM "users" u
LEFT JOIN "departments" d ON u."departmentId" = d."id"
WHERE u."departmentId" IS NOT NULL AND d."id" IS NULL
UNION ALL
SELECT 'role_permissions.roleId -> roles.id', count(*)
FROM "role_permissions" rp
LEFT JOIN "roles" r ON rp."roleId" = r."id"
WHERE r."id" IS NULL
UNION ALL
SELECT 'role_permissions.permissionId -> permissions.id', count(*)
FROM "role_permissions" rp
LEFT JOIN "permissions" p ON rp."permissionId" = p."id"
WHERE p."id" IS NULL;

-- ------------------------------------------------------------------------------
-- 6. DUPLICATE IDENTIFIER & NATURAL KEY INTEGRITY CHECK
-- ------------------------------------------------------------------------------
-- Branch codes
SELECT "code", count(*) AS count FROM "branches" GROUP BY "code" HAVING count(*) > 1;

-- Department codes
SELECT "code", count(*) AS count FROM "departments" GROUP BY "code" HAVING count(*) > 1;

-- User emails
SELECT "email", count(*) AS count FROM "users" GROUP BY "email" HAVING count(*) > 1;

-- Role names
SELECT "name", count(*) AS count FROM "roles" GROUP BY "name" HAVING count(*) > 1;

-- Permissions resource + action pairs
SELECT "resource", "action", count(*) AS count FROM "permissions" GROUP BY "resource", "action" HAVING count(*) > 1;

-- Role permissions compound pairs
SELECT "roleId", "permissionId", count(*) AS count FROM "role_permissions" GROUP BY "roleId", "permissionId" HAVING count(*) > 1;

-- ------------------------------------------------------------------------------
-- 7. ROOT ADMINISTRATOR ACCOUNT INTEGRITY AUDIT
-- Asserts that the existing root administrator account exists and records
-- its exact credentials for post-migration comparison.
-- ------------------------------------------------------------------------------
SELECT 
    u."id" AS admin_user_id,
    u."email" AS admin_email,
    u."name" AS admin_name,
    u."accessScope" AS admin_access_scope,
    r."name" AS role_name,
    b."name" AS branch_name,
    d."name" AS department_name,
    substr(u."passwordHash", 1, 15) || '...' AS password_hash_prefix,
    length(u."passwordHash") AS password_hash_length,
    u."isActive" AS is_active,
    u."createdAt" AS created_at
FROM "users" u
JOIN "roles" r ON u."roleId" = r."id"
JOIN "branches" b ON u."branchId" = b."id"
LEFT JOIN "departments" d ON u."departmentId" = d."id"
WHERE r."name" = 'Admin' OR u."email" = 'admin@zemifix.local';

-- ------------------------------------------------------------------------------
-- 8. ENUM DEFINITIONS & USAGE AUDIT
-- Verifies existing PostgreSQL enum types in zemifix_dev match Prisma definitions.
-- ------------------------------------------------------------------------------
SELECT 
    t.typname AS enum_name,
    e.enumlabel AS enum_value,
    e.enumsortorder AS sort_order
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public' AND t.typname IN ('BranchType', 'AccessScope')
ORDER BY t.typname, e.enumsortorder;

-- Check for any rows with invalid enum values (should be 0 rows)
SELECT 'branches with unmapped type' AS check_name, count(*) FROM "branches" 
WHERE "type"::text NOT IN ('HeadOffice', 'Region', 'Branch', 'Outlet');

SELECT 'users with unmapped accessScope' AS check_name, count(*) FROM "users" 
WHERE "accessScope"::text NOT IN ('Own', 'Department', 'Branch', 'BranchAndBelow', 'Company');

-- ------------------------------------------------------------------------------
-- 9. TIMESTAMP DISTRIBUTION & TIMEZONE ASSUMPTION AUDIT
-- Displays min, max, sample timestamps and demonstrates conversion consequences.
-- ------------------------------------------------------------------------------
SELECT 
    'companies' AS table_name,
    min("createdAt") AS min_created,
    max("createdAt") AS max_created,
    min("updatedAt") AS min_updated,
    max("updatedAt") AS max_updated
FROM "companies"
UNION ALL
SELECT 'branches', min("createdAt"), max("createdAt"), min("updatedAt"), max("updatedAt") FROM "branches"
UNION ALL
SELECT 'departments', min("createdAt"), max("createdAt"), min("updatedAt"), max("updatedAt") FROM "departments"
UNION ALL
SELECT 'users', min("createdAt"), max("createdAt"), min("updatedAt"), max("updatedAt") FROM "users"
UNION ALL
SELECT 'roles', min("createdAt"), max("createdAt"), min("updatedAt"), max("updatedAt") FROM "roles"
UNION ALL
SELECT 'permissions', min("createdAt"), max("createdAt"), NULL, NULL FROM "permissions";

-- Sample inspection comparing raw timestamp vs assumed UTC vs assumed local timezone:
SELECT 
    "email",
    "createdAt" AS raw_timestamp_without_tz,
    "createdAt" AT TIME ZONE 'UTC' AS interpreted_as_utc,
    "createdAt" AT TIME ZONE current_setting('TimeZone') AS interpreted_as_server_tz
FROM "users"
LIMIT 5;

-- ------------------------------------------------------------------------------
-- 10. EXISTING PRISMA MIGRATIONS TABLE AUDIT
-- Confirms existing migration history records.
-- ------------------------------------------------------------------------------
SELECT 
    "id",
    "migration_name",
    "checksum",
    "finished_at",
    "applied_steps_count"
FROM "_prisma_migrations"
ORDER BY "started_at" ASC;

COMMIT;

-- ==============================================================================
-- END OF PRE-MIGRATION VALIDATION SCRIPT
-- If all checks above report 0 invalid PKs, 0 invalid FKs, 0 orphans, and the
-- Admin account is returned, the database is confirmed safe for in-place reconciliation.
-- ==============================================================================
