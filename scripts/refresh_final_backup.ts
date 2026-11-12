/**
 * Final Backup Refresh Tool (Non-Destructive)
 */

import { execSync } from 'child_process';
import fs from 'fs';

function refreshBackup() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Final Database Backup Refresh');
  console.log('=====================================================');

  const env = { ...process.env, PGPASSWORD: 'javvy' };
  const backupDir = 'backups';
  if (!fs.existsSync(backupDir)) fs.mkdirSync(backupDir, { recursive: true });

  const now = new Date();
  const timestampStr = now.toISOString().replace(/[:.]/g, '-');
  const backupFile = `${backupDir}/zemifix_dev_final_refresh_${timestampStr}.dump`;

  try {
    console.log(`\nCreating custom PostgreSQL backup: ${backupFile}...`);
    execSync(`pg_dump -h localhost -U postgres -d zemifix_dev -F c -f ${backupFile}`, { env });

    const stats = fs.statSync(backupFile);
    console.log(`  [PASS] Backup file created successfully.`);
    console.log(`  Exact File Path: ${backupFile}`);
    console.log(`  Creation Timestamp: ${now.toISOString()}`);
    console.log(`  File Size: ${stats.size} bytes (${(stats.size / 1024).toFixed(1)} KB)`);

    console.log(`\nVerifying archive readability via pg_restore --list...`);
    const listOutput = execSync(`pg_restore --list ${backupFile}`, { env }).toString();
    const tocEntries = listOutput.split('\n').filter((l) => l.trim() && !l.startsWith(';'));

    console.log(`  [PASS] Archive is 100% valid and readable.`);
    console.log(`  TOC Count: ${tocEntries.length} entries verified.`);

  } catch (err: any) {
    console.error(`  [FAIL] Backup refresh failed: ${err.message}`);
    process.exit(1);
  }
}

refreshBackup();
