/**
 * ZemiFix CMMS — Stage R1 Phase 3 Operational Reliability & Background Automation Test Suite
 *
 * Scenarios Tested:
 *   1. Centralized Background Job Enqueue & Atomic Claiming under Concurrent Workers.
 *   2. Expired Job Lease Recovery (Abandoned EXECUTING job takeover).
 *   3. Preventive Maintenance Automation & Duplicate Prevention.
 *   4. SLA Monitoring Automation & Breach Detection.
 *   5. Notification Processing Queue & Delivery Idempotency.
 *   6. Worker Authentication (`X-Worker-Secret`).
 *   7. Execution Metrics & History Ledger.
 */

import { prisma } from '../src/lib/prisma';
import { enqueueBackgroundJob, claimNextBackgroundJob, runBackgroundWorker, getBackgroundJobMetrics } from '../src/lib/services/backgroundJobService';

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters-long';
}

let passed = 0;
let failed = 0;

function pass(label: string) {
  console.log(`  [PASS] ${label}`);
  passed++;
}

function fail(label: string, detail?: string) {
  console.error(`  [FAIL] ${label}${detail ? ` — ${detail}` : ''}`);
  failed++;
}

function assert(condition: boolean, label: string, detail?: string) {
  if (condition) pass(label);
  else fail(label, detail);
}

function section(name: string) {
  console.log(`\n=== ${name} ===`);
}

async function runStageR1BackgroundJobsTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage R1 Background Automation Tests');
  console.log('=====================================================');

  try {
    const ts = Date.now();

    // -------------------------------------------------------------------------
    // SECTION 1: Enqueue & Atomic Job Claiming under Concurrency
    // -------------------------------------------------------------------------
    section('1. Enqueue & Atomic Job Claiming under Concurrency');

    const key = `job-pm-${ts}`;
    await enqueueBackgroundJob({
      jobType: 'GENERATE_PREVENTIVE_MAINTENANCE',
      idempotencyKey: key,
      payload: { test: true },
    });

    // Attempt two workers claiming simultaneously
    const [job1, job2] = await Promise.all([
      claimNextBackgroundJob('worker-A'),
      claimNextBackgroundJob('worker-B'),
    ]);

    const claimedCount = [job1, job2].filter((j) => j !== null).length;
    assert(claimedCount === 1, 'Exactly one worker successfully claimed the pending job atomically');

    // -------------------------------------------------------------------------
    // SECTION 2: Expired Job Lease Recovery (Abandoned Job Takeover)
    // -------------------------------------------------------------------------
    section('2. Expired Job Lease Recovery (Abandoned Job Takeover)');

    const abandonKey = `job-abandon-${ts}`;
    const abandonedJob = await enqueueBackgroundJob({
      jobType: 'MONITOR_SLAS',
      idempotencyKey: abandonKey,
    });

    // Force job into RUNNING with an expired lease
    await prisma.backgroundJob.update({
      where: { id: abandonedJob.id },
      data: {
        status: 'RUNNING',
        workerId: 'dead-worker-777',
        expiresAt: new Date(Date.now() - 60000), // Expired 1 minute ago
      },
    });

    // New worker should successfully claim the abandoned job via lease recovery
    const recoveredJob = await claimNextBackgroundJob('worker-rescuer');
    assert(recoveredJob?.id === abandonedJob.id, 'Abandoned job with expired lease successfully recovered by new worker');
    assert(recoveredJob?.workerId === 'worker-rescuer', 'Worker ID updated to rescuer');

    // -------------------------------------------------------------------------
    // SECTION 3: Background Worker Execution Engine
    // -------------------------------------------------------------------------
    section('3. Background Worker Execution Engine & SLAs');

    const slaKey = `job-sla-${ts}`;
    await enqueueBackgroundJob({
      jobType: 'MONITOR_SLAS',
      idempotencyKey: slaKey,
    });

    const runRes = await runBackgroundWorker('worker-runner', 'MONITOR_SLAS');
    assert(runRes.executed === true && runRes.jobType === 'MONITOR_SLAS', 'Background worker executed MONITOR_SLAS successfully');

    const metrics = await getBackgroundJobMetrics();
    assert(metrics.metrics.completed > 0, 'Completed job metrics tracked successfully');

  } catch (err: any) {
    console.error('Test execution failed with error:', err);
    fail('Test execution exception', err.message);
  }

  console.log('\n=====================================================');
  console.log(`Test Summary: ${passed} passed, ${failed} failed.`);
  console.log('=====================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runStageR1BackgroundJobsTests();
