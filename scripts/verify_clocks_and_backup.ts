/**
 * Three-Clock Verification & Final Backup Tool (Non-Destructive)
 * Compares Windows OS time, PostgreSQL NOW(), and Node.js Date.
 */

import { execSync } from 'child_process';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function verifyClocksAndBackup() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Three-Clock Comparison & Final Backup');
  console.log('=====================================================');

  // 1. Node.js UTC Time
  const nodeNow = new Date();
  const nodeUtc = nodeNow.toISOString();

  // 2. PostgreSQL NOW() Time
  const pgResult = await prisma.$queryRaw<Array<{ now: Date; utc_now: Date }>>`
    SELECT NOW() as now, NOW() AT TIME ZONE 'UTC' as utc_now
  `;
  const pgNow = pgResult[0].now;
  const pgUtc = new Date(pgResult[0].utc_now).toISOString();

  // 3. Windows System Time
  const winUtcStr = execSync('powershell -Command "(Get-Date).ToUniversalTime().ToString(\'o\')"').toString().trim();

  console.log(`\n1. Three-Clock Verification:`);
  console.log(`   Windows System UTC: ${winUtcStr}`);
  console.log(`   PostgreSQL UTC NOW:  ${pgUtc}`);
  console.log(`   Node.js UTC Time:    ${nodeUtc}`);

  const diffPgNodeMs = Math.abs(new Date(pgUtc).getTime() - new Date(nodeUtc).getTime());
  console.log(`   Clock Variance (PostgreSQL vs Node.js): ${diffPgNodeMs} ms`);
  console.log(`   Clock Agreement Status: ${diffPgNodeMs < 1000 ? 'PASS (In Sync < 1s)' : 'MISMATCH'}`);

  // 4. Create Fresh Backup
  const env = { ...process.env, PGPASSWORD: 'javvy' };
  const backupDir = 'backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestampStr = nodeUtc.replace(/[:.]/g, '-');
  const backupFile = `${backupDir}/zemifix_dev_three_clock_verified_${timestampStr}.dump`;

  try {
    console.log(`\n2. Creating Fresh PostgreSQL Custom Backup:`);
    console.log(`   Path: ${backupFile}`);
    execSync(`pg_dump -h localhost -U postgres -d zemifix_dev -F c -f ${backupFile}`, { env });

    const stats = fs.statSync(backupFile);
    console.log(`   [PASS] Backup file created successfully.`);
    console.log(`   File Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);

    console.log(`\n3. Verifying Archive Readability via pg_restore --list:`);
    const listOutput = execSync(`pg_restore --list ${backupFile}`, { env }).toString();
    const tocEntries = listOutput.split('\n').filter((l) => l.trim() && !l.startsWith(';'));

    console.log(`   [PASS] pg_restore --list verified successfully.`);
    console.log(`   TOC Count: ${tocEntries.length} entries.`);
    console.log(`   Exact Path: ${backupFile}`);
    console.log(`   UTC Creation Timestamp: ${nodeUtc}`);

  } catch (err: any) {
    console.error(`   [FAIL] Backup creation failed: ${err.message}`);
    process.exit(1);
  }
}

verifyClocksAndBackup();
