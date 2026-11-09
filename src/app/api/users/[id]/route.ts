import { NextRequest, NextResponse } from 'next/server';
import { updateUser } from '@/src/lib/services/userService';
import { requireAuth } from '@/src/lib/auth';
import { handleApiError } from '@/src/lib/db-errors';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await requireAuth({ roles: ['Admin'] });
    const { id } = await params;
    const body = await req.json();

    // Prevent non-superadmins from modifying their own roles or scopes
    if (currentUser.id === id && body.roleId && body.roleId !== currentUser.roleId) {
      return NextResponse.json(
        { error: 'Forbidden', message: 'You cannot alter your own role permissions.' },
        { status: 403 }
      );
    }

    const result = await updateUser(id, body);
    return NextResponse.json(result);
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
