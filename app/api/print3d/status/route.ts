import { NextResponse } from 'next/server';

import { callBambuAgent } from '@/lib/agent';
import { errorResponse, requireOfficer } from '@/lib/api';
import { serverConfig } from '@/lib/config';
import type { Print3dStatus } from '@/lib/print3d';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireOfficer();
    const status = await callBambuAgent<Print3dStatus>('/status');

    return NextResponse.json(
      {
        ...status,
        limits: {
          maxFileBytes: serverConfig.bambuMaxFileBytes,
          maxFileMb: Math.round(serverConfig.bambuMaxFileBytes / (1024 * 1024)),
        },
      },
      {
        headers: { 'cache-control': 'no-store' },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
