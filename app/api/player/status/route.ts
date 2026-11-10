import { NextResponse } from 'next/server';

import { callAgent } from '@/lib/agent';
import { errorResponse, requireUser } from '@/lib/api';
import type { PlayerStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireUser();
    const status = await callAgent<PlayerStatus>('/status');

    return NextResponse.json(status, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
