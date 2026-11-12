/**
 * System Clock & Backup Verification Tool (Non-Destructive)
 */

import { execSync } from 'child_process';
import fs from 'fs';

function verifySystemClockAndBackup() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — System Clock & Fresh Backup Verification');
  console.log('=====================================================');

  const systemNow = new Date();
  const systemUtcIso = systemNow.toISOString();
  const systemLocal = systemNow.toString();

  console.log(`\n1. Machine System Clock Inspection:`);
  console.log(`   System Local Time: ${systemLocal}`);
  console.log(`   System UTC Time:   ${systemUtcIso}`);

  const env = { ...process.env, PGPASSWORD: 'javvy' };
  const backupDir = 'backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const timestampStr = systemUtcIso.replace(/[:.]/g, '-');
  const backupFile = `${backupDir}/zemifix_dev_utc_fresh_${timestampStr}.dump`;

  try {
    console.log(`\n2. Creating Fresh Backup with Exact Current System Clock Timestamp:`);
    console.log(`   Backup Path: ${backupFile}`);
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
    console.log(`   Creation Timestamp: ${systemUtcIso}`);

  } catch (err: any) {
    console.error(`   [FAIL] Backup creation failed: ${err.message}`);
    process.exit(1);
  }
}

verifySystemClockAndBackup();
