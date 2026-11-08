import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getUserByEmail } from '@/src/lib/services/userService';
import { verifyPassword, createSessionToken, SESSION_COOKIE_NAME } from '@/src/lib/auth';
import { handleApiError } from '@/src/lib/db-errors';

const loginSchema = z.object({
  email: z.string().email('Invalid email address format'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { email, password } = loginSchema.parse(body);

    const userRes = await getUserByEmail(email);
    const user = userRes.data;

    // Verify user exists
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials', message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Verify user is not deactivated
    if (!user.isActive) {
      return NextResponse.json(
        {
          error: 'Account Deactivated',
          message: 'Your staff account has been deactivated. Please contact your system administrator.',
        },
        { status: 403 }
      );
    }

    // Check account lockout if lockedUntil is set
    if (user.lockedUntil && new Date(user.lockedUntil) > new Date()) {
      return NextResponse.json(
        {
          error: 'Account Locked',
          message: 'Account is temporarily locked due to excessive failed attempts. Please retry later.',
        },
        { status: 423 }
      );
    }

    // Verify password hash
    const isValid = await verifyPassword(password, user.passwordHash);
    if (!isValid) {
      return NextResponse.json(
        { error: 'Invalid credentials', message: 'Invalid email or password.' },
        { status: 401 }
      );
    }

    // Generate signed JWT session token (8 hours)
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      role: user.role?.name || 'Staff',
      branchId: user.branchId,
      departmentId: user.departmentId,
      accessScope: user.accessScope,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Authentication successful.',
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        branch: user.branch,
        department: user.department,
        accessScope: user.accessScope,
      },
    });

    // Set secure HTTP-only cookie
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 8 * 3600, // 8 hours
    });

    return response;
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation Error', message: error.issues[0]?.message }, { status: 400 });
    }
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
