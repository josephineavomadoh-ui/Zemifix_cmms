import { NextRequest, NextResponse } from 'next/server';
import { submitPublicQrRequest } from '@/src/lib/services/portalService';
import { checkRateLimit } from '@/src/lib/services/rateLimitService';

export async function POST(req: NextRequest) {
  try {
    const clientIp = req.headers.get('x-forwarded-for') || '127.0.0.1';
    const rateCheck = await checkRateLimit(clientIp, 'PUBLIC_REQUEST', 10, 60);
    if (!rateCheck.allowed) {
      return NextResponse.json(
        { error: 'Rate Limit Exceeded', retryAfterSeconds: rateCheck.retryAfterSeconds },
        { status: 429, headers: { 'Retry-After': String(rateCheck.retryAfterSeconds) } }
      );
    }

    const body = await req.json();

    const intake = await submitPublicQrRequest({
      siteCode: body.siteCode,
      assetTag: body.assetTag,
      requesterName: body.requesterName,
      requesterEmail: body.requesterEmail,
      requesterPhone: body.requesterPhone,
      description: body.description,
      photoUrl: body.photoUrl,
      clientIp,
      idempotencyKey: body.idempotencyKey,
    });

    return NextResponse.json({ success: true, intake }, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message ?? 'Public QR request submission failed' }, { status: 400 });
  }
}
