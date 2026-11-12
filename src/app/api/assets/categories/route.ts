import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/src/lib/auth';
import { createAssetCategory, getAssetCategoryTree } from '@/src/lib/services/assetCategoryService';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const categories = await getAssetCategoryTree();
    return NextResponse.json({ categories });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to fetch categories' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const category = await createAssetCategory({
      ...body,
      createdByUserId: user.id,
    });

    return NextResponse.json({ success: true, category }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Failed to create category' }, { status: 400 });
  }
}
