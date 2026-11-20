import { NextRequest, NextResponse } from 'next/server';

import { callBambuAgent } from '@/lib/agent';
import { assertSameOrigin, errorResponse, requireOfficer } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireOfficer();

    const result = await callBambuAgent<{ ok: boolean }>('/stop', {
      method: 'POST',
    });

    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
