import { NextRequest, NextResponse } from 'next/server';

import { callAgent } from '@/lib/agent';
import { assertSameOrigin, errorResponse, requireOfficer } from '@/lib/api';
import type { PlayerStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireOfficer();

    const result = await callAgent<PlayerStatus>('/spotify/disconnect', {
      method: 'POST',
      body: '{}',
    });

    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
