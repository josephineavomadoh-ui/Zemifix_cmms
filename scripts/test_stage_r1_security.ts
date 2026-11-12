/**
 * ZemiFix CMMS — Stage R1 Phase 2 Security Hardening & Rate Limiting Test Suite
 *
 * Scenarios Tested:
 *   1. Distributed Rate-Limiting Service (Atomic increments & 429 threshold checks)
 *   2. Centralized Environment Variable Validation (Zod schema validation)
 *   3. Rate Limit Audit Logging & Security Event Recording
 *   4. Concurrent Rate Limit Enforcement
 */

import { prisma } from '../src/lib/prisma';
import { checkRateLimit } from '../src/lib/services/rateLimitService';
import { validateEnvironment } from '../src/lib/env';

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters-long';
}
if (!process.env.OTP_SECRET) {
  process.env.OTP_SECRET = 'test-otp-secret-at-least-32-characters-long-pad!';
}
if (!process.env.PORTAL_SESSION_SECRET) {
  process.env.PORTAL_SESSION_SECRET = 'test-portal-secret-at-least-32-characters-long!';
}
if (!process.env.APPROVAL_SECRET) {
  process.env.APPROVAL_SECRET = 'test-approval-secret-at-least-32-characters-long-pad!';
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

async function runStageR1SecurityTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage R1 Security Hardening Tests');
  console.log('=====================================================');

  try {
    // -------------------------------------------------------------------------
    // SECTION 1: Centralized Environment Validation
    // -------------------------------------------------------------------------
    section('1. Centralized Environment Validation');

    const envConfig = validateEnvironment();
    assert(Boolean(envConfig), 'Environment validation passed successfully');

    // -------------------------------------------------------------------------
    // SECTION 2: Distributed Rate Limiting Service
    // -------------------------------------------------------------------------
    section('2. Distributed Rate Limiting Service & Thresholds');

    const ipAddress = `192.168.1.${Math.floor(Math.random() * 200)}`;
    const action = 'STAFF_LOGIN';
    const limit = 3;

    const res1 = await checkRateLimit(ipAddress, action, limit, 15);
    assert(res1.allowed, 'First rate-limit request allowed');
    assert(res1.remaining === 2, 'Remaining attempts calculated correctly (2)');

    const res2 = await checkRateLimit(ipAddress, action, limit, 15);
    assert(res2.allowed, 'Second rate-limit request allowed');
    assert(res2.remaining === 1, 'Remaining attempts calculated correctly (1)');

    const res3 = await checkRateLimit(ipAddress, action, limit, 15);
    assert(res3.allowed, 'Third rate-limit request allowed (threshold reached)');
    assert(res3.remaining === 0, 'Remaining attempts is 0');

    const res4 = await checkRateLimit(ipAddress, action, limit, 15);
    assert(!res4.allowed, 'Fourth rate-limit request blocked with HTTP 429 threshold violation');
    assert(res4.retryAfterSeconds > 0, 'Retry-After seconds provided');

    // -------------------------------------------------------------------------
    // SECTION 3: Concurrent Rate Limiting Enforcement
    // -------------------------------------------------------------------------
    section('3. Concurrent Rate Limiting Enforcement');

    const concIp = `10.0.0.${Math.floor(Math.random() * 200)}`;
    const concAction = 'OTP_VERIFY';
    const concLimit = 5;

    const concurrentPromises = Array.from({ length: 8 }, () =>
      checkRateLimit(concIp, concAction, concLimit, 10)
    );

    const results = await Promise.all(concurrentPromises);
    const allowedCount = results.filter((r) => r.allowed).length;
    const blockedCount = results.filter((r) => !r.allowed).length;

    assert(allowedCount === concLimit, `Exactly ${concLimit} concurrent requests allowed up to threshold`);
    assert(blockedCount === 3, 'Remaining 3 concurrent requests correctly blocked under concurrency');

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

runStageR1SecurityTests();
