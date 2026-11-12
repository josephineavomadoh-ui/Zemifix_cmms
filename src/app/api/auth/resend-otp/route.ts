import { NextRequest, NextResponse } from 'next/server';
import {
  verifyPreAuthToken,
  createPreAuthToken,
  PREAUTH_COOKIE_NAME,
  normalizeGhanaPhone,
} from '@/src/lib/auth';
import {
  checkResendEligibility,
  createResendChallenge,
  confirmResendDelivery,
  abandonResendChallenge,
} from '@/src/lib/services/otpService';
import { dispatchOtp, maskDestination } from '@/src/lib/services/deliveryService';
import { prisma } from '@/src/lib/prisma';
import { handleApiError, DatabaseUnavailableError } from '@/src/lib/db-errors';

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
    // 1. Read pre-authentication cookie
    const preAuthCookie = req.cookies.get(PREAUTH_COOKIE_NAME)?.value;
    if (!preAuthCookie) {
      return NextResponse.json(
        {
          error: 'Invalid Session',
          message:
            'Pre-authentication session expired or invalid. Please log in again.',
        },
        { status: 401 }
      );
    }

    const preAuthPayload = await verifyPreAuthToken(preAuthCookie);
    if (!preAuthPayload) {
      return NextResponse.json(
        {
          error: 'Invalid Session',
          message:
            'Pre-authentication session expired or invalid. Please log in again.',
        },
        { status: 401 }
      );
    }

    const ipAddress = getClientIp(req);

    // 2. Fetch user to verify status and retrieve unmasked destination
    const user = await prisma.user.findUnique({
      where: { id: preAuthPayload.userId },
      select: {
        id: true,
        email: true,
        phone: true,
        isActive: true,
        deletedAt: true,
      },
    });

    if (!user || user.deletedAt !== null || !user.isActive) {
      return NextResponse.json(
        {
          error: 'Account Inaccessible',
          message: 'User account is inactive or no longer exists.',
        },
        { status: 403 }
      );
    }

    // 3. Determine unmasked destination and channel
    let channel: 'EMAIL' | 'SMS' = preAuthPayload.channel;
    let destination = user.email;

    if (channel === 'SMS') {
      const normPhone = normalizeGhanaPhone(user.phone);
      if (normPhone) {
        destination = normPhone;
      } else {
        channel = 'EMAIL';
        destination = user.email;
      }
    }

    // 4. Check resend eligibility (cooldown, rate limits, active challenge presence)
    const eligibility = await checkResendEligibility(user.id, 'LOGIN_MFA');

    if (!eligibility.allowed) {
      if ('reason' in eligibility && eligibility.reason === 'cooldown') {
        return NextResponse.json(
          {
            error: 'Cooldown Active',
            message: `Please wait ${eligibility.retryAfterSeconds} seconds before requesting another code.`,
            retryAfterSeconds: eligibility.retryAfterSeconds,
          },
          { status: 429 }
        );
      }
      if ('reason' in eligibility && eligibility.reason === 'rate_limited') {
        return NextResponse.json(
          {
            error: 'Rate Limit Exceeded',
            message:
              'Maximum code requests reached for this period. Please try again later.',
          },
          { status: 429 }
        );
      }
      return NextResponse.json(
        {
          error: 'No Active Challenge',
          message:
            'No active verification challenge found. Please log in again.',
        },
        { status: 400 }
      );
    }

    if (!('activeRecordId' in eligibility)) {
      return NextResponse.json(
        {
          error: 'No Active Challenge',
          message:
            'No active verification challenge found. Please log in again.',
        },
        { status: 400 }
      );
    }

    // 5. Phase 1: Create new resend challenge row without invalidating previous row
    const resendChallenge = await createResendChallenge({
      userId: user.id,
      previousRecordId: eligibility.activeRecordId,
      destination,
      channel,
      purpose: 'LOGIN_MFA',
      ipAddress,
    });

    // 6. Attempt delivery
    const deliveryResult = await dispatchOtp(
      destination,
      channel,
      resendChallenge.plainCode
    );

    if (!deliveryResult.ok) {
      // Phase 2b: Delivery failed — abandon new challenge; preserve old valid challenge & cookie
      await abandonResendChallenge(resendChallenge.otpRecordId);
      return NextResponse.json(
        {
          error: 'Delivery Failed',
          message:
            'Failed to deliver authentication code. Previous code remains valid.',
        },
        { status: 502 }
      );
    }

    // Phase 2a: Delivery succeeded — confirm resend delivery (invalidates previous challenge)
    await confirmResendDelivery(resendChallenge.previousRecordId);

    // 7. Issue updated pre-authentication JWT cookie bound to the new challenge ID
    const masked = maskDestination(destination, channel);
    const newPreAuthToken = await createPreAuthToken({
      userId: user.id,
      otpRecordId: resendChallenge.otpRecordId,
      channel,
      destination: masked,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Authentication code resent.',
      channel,
      destination: masked,
    });

    response.cookies.set({
      name: PREAUTH_COOKIE_NAME,
      value: newPreAuthToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 600, // 10 minutes
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof DatabaseUnavailableError) {
      const { status, body } = handleApiError(error);
      return NextResponse.json(body, { status });
    }
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
