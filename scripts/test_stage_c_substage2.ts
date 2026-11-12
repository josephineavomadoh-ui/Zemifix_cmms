/**
 * ZemiFix CMMS — Stage C Sub-Stage 2 Verification Test Suite
 *
 * Automated integration & unit contract tests for API route integration:
 *   1. POST /api/auth/login
 *   2. POST /api/auth/verify-otp
 *   3. POST /api/auth/resend-otp
 *   4. POST /api/auth/logout
 *   5. middleware path protection
 */

import { NextRequest } from 'next/server';
import { prisma } from '../src/lib/prisma';
import { hashPassword, createPreAuthToken, PREAUTH_COOKIE_NAME, SESSION_COOKIE_NAME, verifyPreAuthToken, verifySessionToken } from '../src/lib/auth';
import { createOtpChallenge, verifyOtpChallenge } from '../src/lib/services/otpService';
import { recordPasswordFailure, checkPasswordRateLimit } from '../src/lib/services/loginAttemptService';
import { middleware } from '../src/middleware';

import { POST as loginHandler } from '../src/app/api/auth/login/route';
import { POST as verifyOtpHandler } from '../src/app/api/auth/verify-otp/route';
import { POST as resendOtpHandler } from '../src/app/api/auth/resend-otp/route';
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

function makeJsonReq(url: string, body: any, headers?: Record<string, string>, cookies?: Record<string, string>): NextRequest {
  const reqHeaders = new Headers({
    'Content-Type': 'application/json',
    ...(headers ?? {}),
  });

  if (cookies) {
    const cookieHeader = Object.entries(cookies)
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
    reqHeaders.set('Cookie', cookieHeader);
  }

  return new NextRequest(url, {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(body),
  });
}

async function runTests() {
  console.log('=====================================================');
  console.log('ZemiFix CMMS — Stage C Sub-Stage 2 Verification Suite');
  console.log('=====================================================');

  // Setup test environment data in database
  let testUser: any = null;
  let inactiveUser: any = null;
  let deletedUser: any = null;
  let smsUserNoPhone: any = null;

  try {
    const role = await prisma.role.findFirst();
    const branch = await prisma.branch.findFirst();
    const dept = await prisma.department.findFirst();

    if (!role || !branch) {
      throw new Error('Database missing seed data (role or branch)');
    }

    const testPassword = 'Password123!';
    const passwordHash = await hashPassword(testPassword);

    // Create test active staff user
    const email = `test.staff.${Date.now()}@zemifix.local`;
    testUser = await prisma.user.create({
      data: {
        name: 'Test Active Staff',
        email,
        phone: '0244123456',
        passwordHash,
        roleId: role.id,
        branchId: branch.id,
        departmentId: dept?.id ?? null,
        accessScope: 'Branch',
        isActive: true,
      },
    });

    // Create inactive user
    const inactiveEmail = `inactive.${Date.now()}@zemifix.local`;
    inactiveUser = await prisma.user.create({
      data: {
        name: 'Test Inactive Staff',
        email: inactiveEmail,
        phone: '0244123457',
        passwordHash,
        roleId: role.id,
        branchId: branch.id,
        accessScope: 'Branch',
        isActive: false,
      },
    });

    // Create deleted user
    const deletedEmail = `deleted.${Date.now()}@zemifix.local`;
    deletedUser = await prisma.user.create({
      data: {
        name: 'Test Deleted Staff',
        email: deletedEmail,
        phone: '0244123458',
        passwordHash,
        roleId: role.id,
        branchId: branch.id,
        accessScope: 'Branch',
        isActive: true,
        deletedAt: new Date(),
      },
    });

    // Create user with invalid phone
    const noPhoneEmail = `nophone.${Date.now()}@zemifix.local`;
    smsUserNoPhone = await prisma.user.create({
      data: {
        name: 'Test No Phone Staff',
        email: noPhoneEmail,
        phone: 'invalid-phone-string',
        passwordHash,
        roleId: role.id,
        branchId: branch.id,
        accessScope: 'Branch',
        isActive: true,
      },
    });

    // -------------------------------------------------------------------------
    // 1. POST /api/auth/login Tests
    // -------------------------------------------------------------------------
    section('1. POST /api/auth/login Endpoint');

    // Scenario 1a: Unknown Email
    {
      const req = makeJsonReq('http://localhost:3000/api/auth/login', {
        email: 'nonexistent.user@zemifix.local',
        password: 'Password123!',
      });
      const res = await loginHandler(req);
      assert(res.status === 401, 'Unknown email returns HTTP 401');
      const data = await res.json();
      assert(data.error === 'Invalid credentials', 'Unknown email returns generic error');
    }

    // Scenario 1b: Incorrect Password
    {
      const req = makeJsonReq('http://localhost:3000/api/auth/login', {
        email: testUser.email,
        password: 'WrongPassword!',
      });
      const res = await loginHandler(req);
      assert(res.status === 401, 'Wrong password returns HTTP 401');
      const data = await res.json();
      assert(data.error === 'Invalid credentials', 'Wrong password returns generic error');
    }

    // Scenario 1c: Inactive Account
    {
      const req = makeJsonReq('http://localhost:3000/api/auth/login', {
        email: inactiveUser.email,
        password: testPassword,
      });
      const res = await loginHandler(req);
      assert(res.status === 403, 'Inactive account returns HTTP 403');
      const data = await res.json();
      assert(data.error === 'Account Deactivated', 'Inactive account returns specific error message');
    }

    // Scenario 1d: Deleted Account
    {
      const req = makeJsonReq('http://localhost:3000/api/auth/login', {
        email: deletedUser.email,
        password: testPassword,
      });
      const res = await loginHandler(req);
      assert(res.status === 401, 'Deleted account returns HTTP 401 generic error');
    }

    // Scenario 1e: Password Rate Limiting
    {
      const rateLimitIp = `192.168.1.${Date.now() % 250}`;
      const rateLimitEmail = `ratelimit.${Date.now()}@zemifix.local`;
      for (let i = 0; i < 11; i++) {
        recordPasswordFailure(rateLimitEmail, rateLimitIp);
      }
      const req = makeJsonReq(
        'http://localhost:3000/api/auth/login',
        { email: rateLimitEmail, password: 'Password123!' },
        { 'x-forwarded-for': rateLimitIp }
      );
      const res = await loginHandler(req);
      assert(res.status === 429, 'Exceeding failure limit triggers HTTP 429 Rate Limit Exceeded');
      const data = await res.json();
      assert(data.error === 'Rate Limit Exceeded', 'Rate limit error title present');
    }

    // Scenario 1f: Successful Login & OTP Initiation
    let activeOtpRecordId = '';
    let preAuthCookieValue = '';
    {
      const req = makeJsonReq('http://localhost:3000/api/auth/login', {
        email: testUser.email,
        password: testPassword,
      });
      const res = await loginHandler(req);
      assert(res.status === 200, 'Correct credentials return HTTP 200');
      const data = await res.json();
      assert(data.success === true, 'Response contains success: true');
      assert(data.otpRequired === true, 'Response contains otpRequired: true');
      assert(data.destination.includes('***'), 'Destination is masked');

      const setCookie = res.cookies.get(PREAUTH_COOKIE_NAME);
      assert(setCookie !== undefined && setCookie.value.length > 0, 'zemifix_preauth cookie is set');

      if (setCookie) {
        preAuthCookieValue = setCookie.value;
        const payload = await verifyPreAuthToken(setCookie.value);
        assert(payload !== null, 'Pre-auth cookie contains valid signed JWT');
        if (payload) activeOtpRecordId = payload.otpRecordId;
      }
    }

    // -------------------------------------------------------------------------
    // 2. POST /api/auth/verify-otp Tests
    // -------------------------------------------------------------------------
    section('2. POST /api/auth/verify-otp Endpoint');

    // Scenario 2a: Missing or invalid pre-auth cookie
    {
      const req = makeJsonReq('http://localhost:3000/api/auth/verify-otp', { code: '123456' });
      const res = await verifyOtpHandler(req);
      assert(res.status === 401, 'Missing pre-auth cookie returns HTTP 401');
    }

    // Scenario 2b: Incorrect OTP code
    {
      const req = makeJsonReq(
        'http://localhost:3000/api/auth/verify-otp',
        { code: '000000' },
        {},
        { [PREAUTH_COOKIE_NAME]: preAuthCookieValue }
      );
      const res = await verifyOtpHandler(req);
      assert(res.status === 400, 'Wrong OTP code returns HTTP 400');
      const data = await res.json();
      assert(data.error === 'Invalid Code', 'Error title is Invalid Code');
      assert(typeof data.attemptsRemaining === 'number', 'attemptsRemaining returned');
    }

    // Scenario 2c: Successful OTP Verification
    {
      // Create a fresh known OTP challenge so we have the plaintext code
      const challenge = await createOtpChallenge({
        userId: testUser.id,
        destination: testUser.email,
        channel: 'EMAIL',
        purpose: 'LOGIN_MFA',
        ipAddress: '127.0.0.1',
      });

      const preAuthToken = await createPreAuthToken({
        userId: testUser.id,
        otpRecordId: challenge.otpRecordId,
        channel: 'EMAIL',
        destination: testUser.email,
      });

      const req = makeJsonReq(
        'http://localhost:3000/api/auth/verify-otp',
        { code: challenge.plainCode },
        {},
        { [PREAUTH_COOKIE_NAME]: preAuthToken }
      );
      const res = await verifyOtpHandler(req);
      assert(res.status === 200, 'Correct OTP code returns HTTP 200');

      const data = await res.json();
      assert(data.authenticated === true, 'Response contains authenticated: true');
      assert(data.user.id === testUser.id, 'Response contains safe user object');
      assert(data.user.passwordHash === undefined, 'Safe user object omits passwordHash');

      const sessionCookie = res.cookies.get(SESSION_COOKIE_NAME);
      assert(sessionCookie !== undefined, 'zemifix_session cookie set on successful OTP verify');

      // Verify lastLoginAt updated
      const updatedUser = await prisma.user.findUnique({ where: { id: testUser.id } });
      assert(updatedUser?.lastLoginAt !== null, 'User.lastLoginAt updated after successful OTP');
    }

    // Scenario 2d: Consumed OTP re-submission
    {
      const challenge = await createOtpChallenge({
        userId: testUser.id,
        destination: testUser.email,
        channel: 'EMAIL',
        purpose: 'LOGIN_MFA',
        ipAddress: '127.0.0.1',
      });
      const preAuthToken = await createPreAuthToken({
        userId: testUser.id,
        otpRecordId: challenge.otpRecordId,
        channel: 'EMAIL',
        destination: testUser.email,
      });

      // First verification (consumes code)
      const req1 = makeJsonReq(
        'http://localhost:3000/api/auth/verify-otp',
        { code: challenge.plainCode },
        {},
        { [PREAUTH_COOKIE_NAME]: preAuthToken }
      );
      await verifyOtpHandler(req1);

      // Second verification (re-submission)
      const req2 = makeJsonReq(
        'http://localhost:3000/api/auth/verify-otp',
        { code: challenge.plainCode },
        {},
        { [PREAUTH_COOKIE_NAME]: preAuthToken }
      );
      const res2 = await verifyOtpHandler(req2);
      assert(res2.status === 400, 'Already consumed OTP returns HTTP 400');
    }

    // Scenario 2e: Concurrent OTP Verification Race
    {
      const challenge = await createOtpChallenge({
        userId: testUser.id,
        destination: testUser.email,
        channel: 'EMAIL',
        purpose: 'LOGIN_MFA',
        ipAddress: '127.0.0.1',
      });
      const preAuthToken = await createPreAuthToken({
        userId: testUser.id,
        otpRecordId: challenge.otpRecordId,
        channel: 'EMAIL',
        destination: testUser.email,
      });

      const reqA = makeJsonReq('http://localhost:3000/api/auth/verify-otp', { code: challenge.plainCode }, {}, { [PREAUTH_COOKIE_NAME]: preAuthToken });
      const reqB = makeJsonReq('http://localhost:3000/api/auth/verify-otp', { code: challenge.plainCode }, {}, { [PREAUTH_COOKIE_NAME]: preAuthToken });

      const [resA, resB] = await Promise.all([verifyOtpHandler(reqA), verifyOtpHandler(reqB)]);
      const statuses = [resA.status, resB.status].sort();
      assert(statuses[0] === 200 && statuses[1] === 400, 'Concurrent OTP verification resolves to exactly one 200 success');
    }

    // -------------------------------------------------------------------------
    // 3. POST /api/auth/resend-otp Tests
    // -------------------------------------------------------------------------
    section('3. POST /api/auth/resend-otp Endpoint');

    // Scenario 3a: Resend Cooldown
    {
      const challenge = await createOtpChallenge({
        userId: testUser.id,
        destination: testUser.email,
        channel: 'EMAIL',
        purpose: 'LOGIN_MFA',
        ipAddress: '127.0.0.1',
      });
      const preAuthToken = await createPreAuthToken({
        userId: testUser.id,
        otpRecordId: challenge.otpRecordId,
        channel: 'EMAIL',
        destination: testUser.email,
      });

      // Immediate resend attempt (within 90s cooldown)
      const req = makeJsonReq('http://localhost:3000/api/auth/resend-otp', {}, {}, { [PREAUTH_COOKIE_NAME]: preAuthToken });
      const res = await resendOtpHandler(req);
      assert(res.status === 429, 'Resend within 90s cooldown returns HTTP 429 Cooldown Active');
      const data = await res.json();
      assert(data.error === 'Cooldown Active', 'Error title is Cooldown Active');
      assert(typeof data.retryAfterSeconds === 'number', 'retryAfterSeconds returned');
    }

    // -------------------------------------------------------------------------
    // 4. POST /api/auth/logout Tests
    // -------------------------------------------------------------------------
    section('4. POST /api/auth/logout Endpoint');

    {
      const res = await logoutHandler();
      assert(res.status === 200, 'Logout returns HTTP 200');

      const deletedSessionCookie = res.cookies.get(SESSION_COOKIE_NAME);
      const deletedPreAuthCookie = res.cookies.get(PREAUTH_COOKIE_NAME);

      assert(deletedSessionCookie?.value === '', 'Logout clears zemifix_session cookie');
      assert(deletedPreAuthCookie?.value === '', 'Logout clears zemifix_preauth cookie');
    }

    // -------------------------------------------------------------------------
    // 5. Middleware Route Protection Tests
    // -------------------------------------------------------------------------
    section('5. Middleware Route Protection');

    {
      const reqVerify = new NextRequest('http://localhost:3000/api/auth/verify-otp');
      const resVerify = middleware(reqVerify);
      assert(resVerify.status === 200, 'Middleware allows /api/auth/verify-otp through');

      const reqResend = new NextRequest('http://localhost:3000/api/auth/resend-otp');
      const resResend = middleware(reqResend);
      assert(resResend.status === 200, 'Middleware allows /api/auth/resend-otp through');

      const reqProtected = new NextRequest('http://localhost:3000/dashboard');
      const resProtected = middleware(reqProtected);
      assert(resProtected.status === 307, 'Middleware redirects unauthenticated staff page to /login');
    }

  } finally {
    // Clean up test records from database
    if (testUser) await prisma.user.delete({ where: { id: testUser.id } }).catch(() => {});
    if (inactiveUser) await prisma.user.delete({ where: { id: inactiveUser.id } }).catch(() => {});
    if (deletedUser) await prisma.user.delete({ where: { id: deletedUser.id } }).catch(() => {});
    if (smsUserNoPhone) await prisma.user.delete({ where: { id: smsUserNoPhone.id } }).catch(() => {});
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
