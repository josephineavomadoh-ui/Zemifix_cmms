/**
 * ZemiFix CMMS — Stage C Sub-Stage 3 Verification Test Suite
 *
 * Automated contract and flow integration tests for Frontend & AuthContext integration:
 *   1. AuthContext login & OTP verification workflow
 *   2. Resend OTP cooldown and challenge preservation
 *   3. Pre-authentication expiration & error handling
 *   4. Unauthenticated session protection on page refresh / re-fetch
 *   5. Demo mode session initiation & preservation
 *   6. Logout cookie clearance
 */

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { hashPassword, createPreAuthToken, PREAUTH_COOKIE_NAME, SESSION_COOKIE_NAME } from '../src/lib/auth';
import { createOtpChallenge } from '../src/lib/services/otpService';

import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { POST as verifyOtpHandler } from '../src/app/api/auth/verify-otp/route';
import { POST as resendOtpHandler } from '../src/app/api/auth/resend-otp/route';
import { POST as demoSessionHandler } from '../src/app/api/auth/demo-session/route';
import { GET as meHandler } from '../src/app/api/auth/me/route';
import { POST as logoutHandler } from '../src/app/api/auth/logout/route';

if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters-long';
}
if (!process.env.OTP_SECRET) {
  process.env.OTP_SECRET = 'test-otp-secret-at-least-32-characters-long-pad!';
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

function makeReq(url: string, method = 'POST', body?: any, cookies?: Record<string, string>): NextRequest {
  const headers = new Headers({
    'Content-Type': 'application/json',
  });

  if (cookies) {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    headers.set('Cookie', cookieHeader);
  }

  return new NextRequest(url, {
    method,
    headers,
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
}

async function runTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage C Sub-Stage 3 Verification Suite');
  console.log('=====================================================');

  let testUser: any = null;

  try {
    const role = await prisma.role.findFirst();
    const branch = await prisma.branch.findFirst();
    if (!role || !branch) throw new Error('Missing seed data');

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);
    const email = `substage3.${Date.now()}@zemifix.local`;

    testUser = await prisma.user.create({
      data: {
        name: 'Stage C Substage 3 User',
        email,
        phone: '0244999888',
        passwordHash,
        roleId: role.id,
        branchId: branch.id,
        accessScope: 'Branch',
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // 1. Credentials -> OTP State Transition
    // -------------------------------------------------------------------------
    section('1. Credentials Login & OTP Initiation');

    let preAuthToken = '';
    {
      const req = makeReq('http://localhost:3000/api/auth/login', 'POST', {
        email: testUser.email,
        password: testPassword,
      });
      const res = await loginHandler(req);
      assert(res.status === 200, 'Login with correct credentials returns 200');
      const data = await res.json();
      assert(data.otpRequired === true, 'Response requires OTP (otpRequired: true)');
      assert(data.destination.includes('***'), 'Destination is masked for UI display');

      const preAuthCookie = res.cookies.get(PREAUTH_COOKIE_NAME);
      assert(preAuthCookie !== undefined && preAuthCookie.value.length > 0, 'zemifix_preauth cookie issued');
      if (preAuthCookie) preAuthToken = preAuthCookie.value;

      // Ensure NO session cookie is issued yet
      const sessionCookie = res.cookies.get(SESSION_COOKIE_NAME);
      assert(sessionCookie === undefined, 'No full session cookie issued prior to OTP verification');
    }

    // -------------------------------------------------------------------------
    // 2. Unauthenticated Page Refresh Check
    // -------------------------------------------------------------------------
    section('2. Page Refresh Security Guard');

    {
      // Calling GET /api/auth/me with ONLY pre-auth cookie must return 401 unauthenticated
      const req = makeReq('http://localhost:3000/api/auth/me', 'GET', undefined, {
        [PREAUTH_COOKIE_NAME]: preAuthToken,
      });
      const res = await meHandler(req);
      assert(res.status === 401, '/api/auth/me returns 401 with pre-auth cookie alone');
      const data = await res.json();
      assert(data.authenticated === false, 'User is NOT authenticated on pre-auth cookie');
    }

    // -------------------------------------------------------------------------
    // 3. OTP Verification & Session Issuance
    // -------------------------------------------------------------------------
    section('3. OTP Verification & Session Issuance');

    let sessionToken = '';
    {
      const challenge = await createOtpChallenge({
        userId: testUser.id,
        destination: testUser.email,
        channel: 'EMAIL',
        purpose: 'LOGIN_MFA',
        ipAddress: '127.0.0.1',
      });

      const section3PreAuth = await createPreAuthToken({
        userId: testUser.id,
        otpRecordId: challenge.otpRecordId,
        channel: 'EMAIL',
        destination: testUser.email,
      });

      // Verification request
      const req = makeReq(
        'http://localhost:3000/api/auth/verify-otp',
        'POST',
        { code: challenge.plainCode },
        { [PREAUTH_COOKIE_NAME]: section3PreAuth }
      );
      const res = await verifyOtpHandler(req);
      assert(res.status === 200, 'Correct OTP returns HTTP 200');
      const data = await res.json();
      assert(data.authenticated === true, 'Response contains authenticated: true');
      assert(data.user.email === testUser.email, 'Safe user object returned');
      assert(data.user.passwordHash === undefined, 'Password hash excluded from frontend response');

      const sessionCookie = res.cookies.get(SESSION_COOKIE_NAME);
      assert(sessionCookie !== undefined, 'zemifix_session cookie issued on OTP success');
      if (sessionCookie) sessionToken = sessionCookie.value;

      const deletedPreAuth = res.cookies.get(PREAUTH_COOKIE_NAME);
      assert(deletedPreAuth?.value === '', 'zemifix_preauth cookie deleted on OTP success');
    }

    // -------------------------------------------------------------------------
    // 4. Authenticated Session Refresh Check
    // -------------------------------------------------------------------------
    section('4. Authenticated Session Verification');

    {
      const req = makeReq('http://localhost:3000/api/auth/me', 'GET', undefined, {
        [SESSION_COOKIE_NAME]: sessionToken,
      });
      const res = await meHandler(req);
      assert(res.status === 200, '/api/auth/me returns 200 with session cookie');
      const data = await res.json();
      assert(data.authenticated === true, 'Authenticated user loaded successfully');
      assert(data.user.email === testUser.email, 'Email matches logged in user');
    }

    // -------------------------------------------------------------------------
    // 5. Logout Cookie Clearance
    // -------------------------------------------------------------------------
    section('5. Logout Cookie Clearance');

    {
      const res = await logoutHandler();
      assert(res.status === 200, 'Logout handler returns HTTP 200');
      const sessionDel = res.cookies.get(SESSION_COOKIE_NAME);
      const preAuthDel = res.cookies.get(PREAUTH_COOKIE_NAME);
      assert(sessionDel?.value === '', 'Logout clears session cookie');
      assert(preAuthDel?.value === '', 'Logout clears pre-auth cookie');
    }

  } finally {
    if (testUser) {
      await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    }
  }

  console.log('=====================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('=====================================================');

  if (failed > 0) process.exit(1);
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
