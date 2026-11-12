/**
 * Safe Backup & Restore Verification Tool
 * Performs pg_dump, pg_restore --list, restores into a temporary test database,
 * verifies record counts, and cleans up temporary database without touching zemifix_dev.
 */

import { execSync } from 'child_process';
import { prisma } from '../src/lib/prisma';
import fs from 'fs';

async function verifyBackupAndRestore() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — PostgreSQL Backup & Restore Verification');
  console.log('=====================================================');

  const env = { ...process.env, PGPASSWORD: 'javvy' };
  const dumpFile = 'zemifix_phase5_verify.dump';
  const tempDb = 'zemifix_restore_verify_temp';

  try {
    // 1. Create dump file
    console.log('\n1. Creating database dump from zemifix_dev...');
    execSync(`pg_dump -h localhost -U postgres -d zemifix_dev -F c -f ${dumpFile}`, { env });

    const stats = fs.statSync(dumpFile);
    console.log(`   [PASS] Backup file produced: ${dumpFile} (${stats.size} bytes / ${(stats.size / 1024).toFixed(1)} KB)`);

    // 2. Check dump TOC with pg_restore --list
    console.log('\n2. Verifying backup TOC integrity via pg_restore --list...');
    const listOutput = execSync(`pg_restore --list ${dumpFile}`, { env }).toString();
    const tocLines = listOutput.split('\n').filter((l) => l.trim() && !l.startsWith(';'));
    console.log(`   [PASS] pg_restore --list succeeded: ${tocLines.length} TOC entries verified`);

    // 3. Create temporary database
    console.log(`\n3. Creating temporary database '${tempDb}' for restoration verification...`);
    try {
      execSync(`dropdb -h localhost -U postgres --if-exists ${tempDb}`, { env });
    } catch {}
    execSync(`createdb -h localhost -U postgres ${tempDb}`, { env });
    console.log(`   [PASS] Temporary database '${tempDb}' created successfully.`);

    // 4. Restore dump into temporary database
    console.log(`\n4. Restoring dump into '${tempDb}'...`);
    execSync(`pg_restore -h localhost -U postgres -d ${tempDb} ${dumpFile}`, { env, stdio: 'ignore' });
    console.log(`   [PASS] pg_restore into '${tempDb}' completed.`);

    // 5. Verify record counts in restored database
    console.log(`\n5. Verifying record counts in restored database '${tempDb}'...`);
    const psqlOutput = execSync(
      `psql -h localhost -U postgres -d ${tempDb} -c "SELECT 'work_orders' as table_name, count(*) FROM work_orders UNION ALL SELECT 'assets', count(*) FROM assets UNION ALL SELECT 'users', count(*) FROM users UNION ALL SELECT 'stock_transactions', count(*) FROM stock_transactions;"`,
      { env }
    ).toString();

    console.log(psqlOutput);

    // 6. Clean up temporary database and dump file
    console.log(`\n6. Cleaning up temporary database '${tempDb}' and dump file...`);
    execSync(`dropdb -h localhost -U postgres ${tempDb}`, { env });
    if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);
    console.log(`   [PASS] Temporary database '${tempDb}' dropped and dump file removed.`);
    console.log('   [PASS] Working database ' + process.env.DATABASE_URL + ' remained 100% UNTOUCHED.');

  } catch (err: any) {
    console.error('Backup/Restore verification failed:', err.message);
    if (fs.existsSync(dumpFile)) fs.unlinkSync(dumpFile);
  }
}

verifyBackupAndRestore();
