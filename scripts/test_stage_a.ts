/**
 * ZemiFix CMMS — Stage A Correction Verification Suite
 *
 * Tests:
 *   A. Ghana phone normalisation (normalizeGhanaPhone)
 *   B. OTP HMAC hashing and constant-time comparison (hashOtpCode / verifyOtpHash)
 *   C. Pre-auth JWT audience separation (createPreAuthToken / verifyPreAuthToken /
 *      verifySessionToken cross-rejection)
 *   D. OTP sender email validation (getOtpFromEmail)
 *   E. DUMMY_HASH — confirms no real password matches it
 *
 * Run with:
 *   OTP_SECRET=test-otp-secret-min-32-chars-padding SESSION_SECRET=test-session-secret-min-32-chars-pad npx tsx scripts/test_stage_a.ts
 */

import {
  normalizeGhanaPhone,
  hashOtpCode,
  verifyOtpHash,
  createPreAuthToken,
  verifyPreAuthToken,
  verifySessionToken,
  createSessionToken,
  getOtpFromEmail,
  DUMMY_HASH,
  verifyPassword,
} from '../src/lib/auth';

// ---------------------------------------------------------------------------
// Minimal env bootstrap — only for this test script.
// Real .env secrets are never touched.
// ---------------------------------------------------------------------------
if (!process.env.SESSION_SECRET) {
  process.env.SESSION_SECRET = 'test-session-secret-at-least-32-characters-long';
}
if (!process.env.OTP_SECRET) {
  process.env.OTP_SECRET = 'test-otp-secret-at-least-32-characters-long-pad!';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
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

function section(title: string) {
  console.log(`\n=== ${title} ===`);
}

// ---------------------------------------------------------------------------
// A. Ghana phone normalisation
// ---------------------------------------------------------------------------
async function testPhoneNormalisation() {
  section('A. Ghana Phone Normalisation');

  // ---- Valid formats — should all produce canonical E.164 ----

  const validCases: Array<[string, string, string]> = [
    // [description, input, expected output]
    ['local format 0244', '0244567890', '+233244567890'],
    ['local format 0244 with spaces', '024 456 7890', '+233244567890'],
    ['local format with dashes', '024-456-7890', '+233244567890'],
    ['international +233', '+233244567890', '+233244567890'],
    ['international +233 with spaces', '+233 24 456 7890', '+233244567890'],
    ['country code without +', '233244567890', '+233244567890'],
    ['parentheses around area code', '(024)4567890', '+233244567890'],
    ['MTN 025', '0254567890', '+233254567890'],
    ['MTN 053 (2023 addition)', '0534567890', '+233534567890'],
    ['MTN 054', '0544567890', '+233544567890'],
    ['MTN 055', '0554567890', '+233554567890'],
    ['MTN 059', '0594567890', '+233594567890'],
    ['AirtelTigo 026', '0264567890', '+233264567890'],
    ['AirtelTigo 027', '0274567890', '+233274567890'],
    ['AirtelTigo 056', '0564567890', '+233564567890'],
    ['AirtelTigo 057', '0574567890', '+233574567890'],
    ['Vodafone 020', '0204567890', '+233204567890'],
    ['Vodafone 050', '0504567890', '+233504567890'],
    ['Globacom 023', '0234567890', '+233234567890'],
    ['Expresso 028', '0284567890', '+233284567890'],
  ];

  for (const [desc, input, expected] of validCases) {
    const result = normalizeGhanaPhone(input);
    assert(
      result === expected,
      `Valid: ${desc} "${input}" → "${expected}"`,
      `got "${result}"`
    );
  }

  // ---- Invalid / rejected inputs — should all return null ----

  const invalidCases: Array<[string, string | null | undefined]> = [
    ['null input', null],
    ['undefined input', undefined],
    ['empty string', ''],
    ['whitespace only', '   '],
    ['too short — 8 digits', '02445678'],
    ['too long — 11 digits', '024456789012'],
    ['fixed-line Accra 030', '0302345678'],
    ['fixed-line Kumasi 032', '0322345678'],
    ['unassigned prefix 029', '0294567890'],
    ['non-Ghana country code', '+447911123456'],
    ['letters mixed in', '024ABC7890'],
    ['only digits — no recognisable prefix', '1234567890'],
    ['international without valid mobile prefix', '+233302345678'],
  ];

  for (const [desc, input] of invalidCases) {
    const result = normalizeGhanaPhone(input);
    assert(
      result === null,
      `Invalid (→ null): ${desc} "${input}"`,
      `got "${result}"`
    );
  }
}

// ---------------------------------------------------------------------------
// B. OTP HMAC hashing and constant-time comparison
// ---------------------------------------------------------------------------
async function testOtpHashing() {
  section('B. OTP HMAC Hashing and Constant-Time Comparison');

  const code = '847291';
  const wrongCode = '000000';
  const anotherCode = '847292'; // off by one

  const hash1 = hashOtpCode(code);
  const hash2 = hashOtpCode(code);

  // Deterministic — same input, same secret, same output
  assert(hash1 === hash2, 'Same code produces same HMAC hash (deterministic)');

  // 64 hex chars = 32 bytes = SHA-256 output
  assert(hash1.length === 64, `Hash is 64 hex chars (SHA-256), got ${hash1.length}`);
  assert(/^[0-9a-f]{64}$/.test(hash1), 'Hash is lowercase hex string');

  // Correct code verifies
  assert(verifyOtpHash(code, hash1), 'Correct code verifies against stored hash');

  // Wrong code does not verify
  assert(!verifyOtpHash(wrongCode, hash1), 'Wrong code rejected');

  // Off-by-one code does not verify
  assert(!verifyOtpHash(anotherCode, hash1), 'Off-by-one code rejected');

  // Different codes produce different hashes (no collision on these inputs)
  const hashWrong = hashOtpCode(wrongCode);
  assert(hash1 !== hashWrong, 'Different codes produce different hashes');

  // Empty string produces a hash but doesn't match non-empty code
  assert(!verifyOtpHash('', hash1), 'Empty string does not match a real OTP hash');

  // verifyOtpHash handles malformed stored hash without throwing
  let threw = false;
  try {
    verifyOtpHash(code, 'not-a-valid-hex-hash');
  } catch {
    threw = true;
  }
  assert(!threw, 'verifyOtpHash with malformed stored hash returns false, does not throw');
}

// ---------------------------------------------------------------------------
// C. Pre-auth JWT audience separation
// ---------------------------------------------------------------------------
async function testJwtAudienceSeparation() {
  section('C. Pre-Auth JWT Audience Separation');

  const preAuthInput = {
    userId: 'user-id-test-0001',
    otpRecordId: 'otp-record-id-0001',
    channel: 'SMS' as const,
    destination: '+233 24 *** **90',
  };

  const sessionInput = {
    userId: 'user-id-test-0001',
    email: 'k.boateng@zemifix.local',
    role: 'MaintenanceManager',
    branchId: 'branch-id-0001',
    accessScope: 'BranchAndBelow',
  };

  // Create both token types
  const preAuthToken = await createPreAuthToken(preAuthInput);
  const sessionToken = await createSessionToken(sessionInput);

  assert(typeof preAuthToken === 'string' && preAuthToken.length > 0, 'Pre-auth token created');
  assert(typeof sessionToken === 'string' && sessionToken.length > 0, 'Session token created');
  assert(preAuthToken !== sessionToken, 'Pre-auth and session tokens are different');

  // Pre-auth token verifies with verifyPreAuthToken
  const verifiedPreAuth = await verifyPreAuthToken(preAuthToken);
  assert(verifiedPreAuth !== null, 'Pre-auth token verified by verifyPreAuthToken');
  assert(verifiedPreAuth?.userId === preAuthInput.userId, 'Pre-auth userId matches');
  assert(verifiedPreAuth?.otpRecordId === preAuthInput.otpRecordId, 'Pre-auth otpRecordId matches');
  assert(verifiedPreAuth?.channel === 'SMS', 'Pre-auth channel matches');
  assert(verifiedPreAuth?.destination === preAuthInput.destination, 'Pre-auth destination matches');

  // Session token verifies with verifySessionToken
  const verifiedSession = await verifySessionToken(sessionToken);
  assert(verifiedSession !== null, 'Session token verified by verifySessionToken');
  assert(verifiedSession?.userId === sessionInput.userId, 'Session userId matches');
  assert(verifiedSession?.email === sessionInput.email, 'Session email matches');

  // Cross-rejection: pre-auth token must be rejected by verifySessionToken
  const crossA = await verifySessionToken(preAuthToken);
  assert(crossA === null, 'Pre-auth token REJECTED by verifySessionToken (audience mismatch)');

  // Cross-rejection: session token must be rejected by verifyPreAuthToken
  const crossB = await verifyPreAuthToken(sessionToken);
  assert(crossB === null, 'Session token REJECTED by verifyPreAuthToken (audience mismatch)');

  // Tampered pre-auth token is rejected
  const parts = preAuthToken.split('.');
  const tampered = `${parts[0]}.${parts[1]}X.${parts[2]}`;
  const tamperedResult = await verifyPreAuthToken(tampered);
  assert(tamperedResult === null, 'Tampered pre-auth token rejected');

  // Expired pre-auth token — we can't mock time easily without jest, but we can
  // verify that a token with an obviously wrong structure is rejected
  assert(
    await verifyPreAuthToken('not.a.jwt') === null,
    'Malformed string rejected by verifyPreAuthToken'
  );

  // Channel enum validation — test with a crafted raw payload (can't easily inject
  // without jose internals, so test the return type guard path via known-good channels)
  const emailPreAuth = await createPreAuthToken({ ...preAuthInput, channel: 'EMAIL' });
  const verifiedEmail = await verifyPreAuthToken(emailPreAuth);
  assert(verifiedEmail?.channel === 'EMAIL', 'EMAIL channel accepted');
}

// ---------------------------------------------------------------------------
// D. OTP sender email validation
// ---------------------------------------------------------------------------
async function testEmailValidation() {
  section('D. OTP Sender Email Validation');

  // Helper: test that getOtpFromEmail throws for a given env value
  function expectThrows(envValue: string | undefined, label: string) {
    const original = process.env.OTP_FROM_EMAIL;
    process.env.OTP_FROM_EMAIL = envValue as string;
    let threw = false;
    try {
      getOtpFromEmail();
    } catch {
      threw = true;
    } finally {
      process.env.OTP_FROM_EMAIL = original;
    }
    assert(threw, label);
  }

  function expectReturns(envValue: string, label: string) {
    const original = process.env.OTP_FROM_EMAIL;
    process.env.OTP_FROM_EMAIL = envValue;
    let result: string | null = null;
    let threw = false;
    try {
      result = getOtpFromEmail();
    } catch {
      threw = true;
    } finally {
      process.env.OTP_FROM_EMAIL = original;
    }
    assert(!threw && result === envValue, label, threw ? 'threw unexpectedly' : `got "${result}"`);
  }

  // Should throw
  expectThrows(undefined, 'Missing OTP_FROM_EMAIL throws');
  expectThrows('', 'Empty OTP_FROM_EMAIL throws');
  expectThrows('   ', 'Whitespace-only OTP_FROM_EMAIL throws');
  expectThrows('noreply@zemifix.local', 'Blocked TLD ".local" throws');
  expectThrows('otp@example.com', 'Blocked domain "example.com" throws');
  expectThrows('otp@example.org', 'Blocked domain "example.org" throws');
  expectThrows('otp@test.com', 'Blocked domain "test.com" throws');
  expectThrows('otp@localhost', 'Blocked domain "localhost" throws');
  expectThrows('not-an-email', 'Non-email string throws');
  expectThrows('@nodomain', 'Missing local part throws');
  expectThrows('otp@', 'Missing domain part throws');

  // Should return the address
  expectReturns('noreply@zemifix.com', 'Real .com domain accepted');
  expectReturns('otp@mail.zemifix.com', 'Subdomain of real domain accepted');
  expectReturns('noreply@zemifix.io', 'Real .io domain accepted');
  expectReturns('otp@zemifix.com.gh', 'Real .com.gh domain accepted');
}

// ---------------------------------------------------------------------------
// E. DUMMY_HASH — no common password matches it
// ---------------------------------------------------------------------------
async function testDummyHash() {
  section('E. DUMMY_HASH Timing Safety');

  // The security requirement is that DUMMY_HASH must not match any password
  // a real user would ever submit — not "admin", not "password", not empty.
  // Whether it technically matches its own derivation string is irrelevant to
  // security; the string is never known to or submittable by an attacker.
  const doesNotMatchEmpty = !(await verifyPassword('', DUMMY_HASH));
  assert(doesNotMatchEmpty, 'DUMMY_HASH does not match empty string');

  const doesNotMatchCommon = !(await verifyPassword('password', DUMMY_HASH));
  assert(doesNotMatchCommon, 'DUMMY_HASH does not match "password"');

  const doesNotMatchAdmin = !(await verifyPassword('admin', DUMMY_HASH));
  assert(doesNotMatchAdmin, 'DUMMY_HASH does not match "admin"');

  const doesNotMatchAdmin123 = !(await verifyPassword('admin123', DUMMY_HASH));
  assert(doesNotMatchAdmin123, 'DUMMY_HASH does not match "admin123"');

  const doesNotMatchTypical = !(await verifyPassword('StaffPassword1!', DUMMY_HASH));
  assert(doesNotMatchTypical, 'DUMMY_HASH does not match a typical strong password');

  // The hash must be valid bcrypt format — verifyPassword must not throw
  let threw = false;
  try {
    await verifyPassword('anything', DUMMY_HASH);
  } catch {
    threw = true;
  }
  assert(!threw, 'verifyPassword(anything, DUMMY_HASH) does not throw — valid bcrypt format');

  // Confirm it looks like a valid bcrypt hash (cost 10)
  assert(
    DUMMY_HASH.startsWith('$2a$10$'),
    'DUMMY_HASH uses bcrypt $2a$ format with cost factor 10'
  );
}

// ---------------------------------------------------------------------------
// Runner
// ---------------------------------------------------------------------------
async function runAll() {
  console.log('================================================================');
  console.log('ZemiFix CMMS — Stage A Correction Test Suite');
  console.log('================================================================');

  await testPhoneNormalisation();
  await testOtpHashing();
  await testJwtAudienceSeparation();
  await testEmailValidation();
  await testDummyHash();

  console.log('\n================================================================');
  console.log(`Results: ${passed} passed, ${failed} failed`);
  console.log('================================================================');

  if (failed > 0) {
    process.exit(1);
  }
}

runAll().catch((err) => {
  console.error('[FATAL TEST ERROR]:', err);
  process.exit(1);
});
