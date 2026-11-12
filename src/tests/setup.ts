/**
 * Vitest global setup file.
 *
 * Loaded before every test file via vitest.config.ts `setupFiles`.
 * - Extends expect() with @testing-library/jest-dom matchers.
 * - Provides environment variable stubs so services that call getJwtSecret(),
 *   getOtpSecret(), or getApprovalSecret() do not throw at import time.
 */

import '@testing-library/jest-dom';

// Provide minimal required secrets for unit tests that import auth.ts or
// service modules. Tests that exercise the actual secret-validation logic
// must override these in their own beforeEach / vi.stubEnv blocks.
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET ?? 'test-session-secret-minimum-32-bytes-xx';
process.env.OTP_SECRET =
  process.env.OTP_SECRET ?? 'test-otp-secret-minimum-32-bytes-xxxxxxxx';
process.env.APPROVAL_SECRET =
  process.env.APPROVAL_SECRET ?? 'test-approval-secret-minimum-32-bytes-xx';
