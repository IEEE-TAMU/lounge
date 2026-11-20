import { NextResponse } from 'next/server';

import { callAgent } from '@/lib/agent';
import { errorResponse, requireOfficer } from '@/lib/api';
import type { PlayerStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireOfficer();
    const status = await callAgent<PlayerStatus>('/status');

    return NextResponse.json(status, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
