import { NextRequest, NextResponse } from 'next/server';
import { getUsers, createUser, getRoles } from '@/src/lib/services/userService';
import { requireAuth } from '@/src/lib/auth';
import { handleApiError } from '@/src/lib/db-errors';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Reading staff directory requires active staff session
    const currentUser = await requireAuth();

    const { searchParams } = new URL(req.url);
    if (searchParams.get('includeRoles') === 'true') {
      const [usersRes, rolesRes] = await Promise.all([getUsers(currentUser), getRoles()]);
      return NextResponse.json({
        users: usersRes.data,
        roles: rolesRes.data,
        isDemoData: usersRes.isDemoData || rolesRes.isDemoData,
        source: usersRes.source,
      });
    }
    const users = await getUsers(currentUser);
    return NextResponse.json(users);
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}

export async function POST(req: NextRequest) {
  try {
    // Only Admin can provision new staff accounts
    await requireAuth({ roles: ['Admin'] });

    const body = await req.json();
    const result = await createUser(body);
    return NextResponse.json(result, { status: 201 });
  } catch (error: any) {
    const { status, body } = handleApiError(error);
    return NextResponse.json(body, { status });
  }
}
