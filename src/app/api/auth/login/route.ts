import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserForAuthentication } from '@/src/lib/services/userService';
import { getCompany } from '@/src/lib/services/organizationService';
import { createOtpChallenge } from '@/src/lib/services/otpService';
import { dispatchOtp, maskDestination } from '@/src/lib/services/deliveryService';
import {
  checkPasswordRateLimit,
  recordPasswordFailure,
  clearAccountFailures,
} from '@/src/lib/services/loginAttemptService';
import {
  verifyPassword,
  createPreAuthToken,
  DUMMY_HASH,
  normalizeGhanaPhone,
  PREAUTH_COOKIE_NAME,
} from '@/src/lib/auth';
import { handleApiError, DatabaseUnavailableError } from '@/src/lib/db-errors';

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

function getClientIp(req: NextRequest): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  return '127.0.0.1';
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);
    const ipAddress = getClientIp(req);

    // 1. Enforce password rate limits
    const limitCheck = checkPasswordRateLimit(email, ipAddress);
    if (!limitCheck.allowed) {
      return NextResponse.json(
        {
          error: 'Rate Limit Exceeded',
          message: limitCheck.reason ?? 'Too many failed login attempts.',
          retryAfterSeconds: limitCheck.retryAfterSeconds ?? 900,
        },
        { status: 429 }
      );
    }

    // 2. getUserForAuthentication() requires PostgreSQL — throws DatabaseUnavailableError
    // when the database is configured but unreachable.
    const user = await getUserForAuthentication(email);

    // User not found (or deleted) — run dummy verifyPassword for timing protection,
    // record failure, and return generic 401 response.
    if (!user || user.deletedAt !== null) {
      await verifyPassword(password, DUMMY_HASH);
      recordPasswordFailure(email, ipAddress);
      return NextResponse.json(
        { error: 'Invalid credentials', message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Deactivated accounts produce a specific, actionable 403 message.
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: 'Account Deactivated',
          message:
            'Your staff account has been deactivated. Please contact your system administrator.',
        },
        { status: 403 }
      );
    }

    // Verify password hash
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      recordPasswordFailure(email, ipAddress);
      return NextResponse.json(
        { error: 'Invalid credentials', message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Password verification passed — clear account password failure counter
    clearAccountFailures(email);

    // 3. Determine OTP delivery channel and destination
    let channel: 'EMAIL' | 'SMS' = 'EMAIL';
    let destination = user.email;

    try {
      const companyRes = await getCompany();
      const rawChannel = (companyRes?.data as { otpChannel?: string })?.otpChannel;
      if (rawChannel && String(rawChannel).toUpperCase() === 'SMS') {
        const normPhone = normalizeGhanaPhone(user.phone);
        if (normPhone) {
          channel = 'SMS';
          destination = normPhone;
        } else {
          // If SMS requested but user lacks valid Ghana mobile number, fallback to EMAIL
          channel = 'EMAIL';
          destination = user.email;
        }
      }
    } catch {
      channel = 'EMAIL';
      destination = user.email;
    }

    // 4. Create OTP challenge
    const challengeResult = await createOtpChallenge({
      userId: user.id,
      destination,
      channel,
      purpose: 'LOGIN_MFA',
      ipAddress,
    });

    // 5. Deliver OTP
    const deliveryResult = await dispatchOtp(
      destination,
      channel,
      challengeResult.plainCode
    );

    if (!deliveryResult.ok) {
      return NextResponse.json(
        {
          error: 'Delivery Failed',
          message:
            'Failed to deliver authentication code. Please try again or contact support.',
        },
        { status: 502 }
      );
    }

    // 6. Issue pre-authentication cookie ONLY after successful delivery
    const masked = maskDestination(destination, channel);
    const preAuthToken = await createPreAuthToken({
      userId: user.id,
      otpRecordId: challengeResult.otpRecordId,
      channel,
      destination: masked,
    });

    const response = NextResponse.json({
      success: true,
      otpRequired: true,
      channel,
      destination: masked,
      message: 'Authentication code sent.',
    });

    response.cookies.set({
      name: PREAUTH_COOKIE_NAME,
      value: preAuthToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Validation Error', message: error.issues[0]?.message },
        { status: 400 }
      );
    }
    if (error instanceof DatabaseUnavailableError) {
      const { status, body } = handleApiError(error);
      return NextResponse.json(body, { status });
    }
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
