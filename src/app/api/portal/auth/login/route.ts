import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/src/lib/prisma';
import { verifyPassword } from '@/src/lib/auth';
import { signPortalToken } from '@/src/lib/portalAuth';
import { checkRateLimit } from '@/src/lib/services/rateLimitService';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json({ error: 'Email and password are required' }, { status: 400 });
    }

    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = await checkRateLimit(email, 'PORTAL_LOGIN', 5, 15);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate Limit Exceeded', retryAfterSeconds: rateCheck.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    const contact = await prisma.customerContact.findUnique({
      where: { email },
    });

    if (!contact || !contact.isActive || contact.deletedAt !== null) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const valid = await verifyPassword(password, contact.passwordHash);
    if (!valid) {
      return NextResponse.json({ error: 'Invalid email or password' }, { status: 401 });
    }

    const token = await signPortalToken(contact);

    const response = NextResponse.json({
      success: true,
      contact: {
        id: contact.id,
        name: contact.name,
        email: contact.email,
        customerId: contact.customerId,
      },
    });

    response.cookies.set('zemifix_portal_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 24 * 60 * 60,
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Login failed' }, { status: 500 });
  }
}
