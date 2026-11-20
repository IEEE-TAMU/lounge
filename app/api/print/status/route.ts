import { NextResponse } from 'next/server';

import { callPrintAgent } from '@/lib/agent';
import { errorResponse, requireOfficer } from '@/lib/api';
import { serverConfig } from '@/lib/config';
import { PRINT_MAX_COPIES } from '@/lib/print';
import type { PrintStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await requireOfficer();
    const status = await callPrintAgent<PrintStatus>('/status');

    return NextResponse.json(
      {
        ...status,
        limits: {
          maxFileBytes: serverConfig.printMaxFileBytes,
          maxCopies: PRINT_MAX_COPIES,
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
