import { NextRequest, NextResponse } from 'next/server';

import { callPrintAgent } from '@/lib/agent';
import { assertSameOrigin, errorResponse, HttpError, requireOfficer } from '@/lib/api';
import type { PrintStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';

const JOB_ID_PATTERN = /^[A-Za-z0-9_.-]+-\d+$/;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);
    await requireOfficer();

    const body = await readJson(request);
    const jobId = typeof body.jobId === 'string' ? body.jobId.trim() : '';

    if (!JOB_ID_PATTERN.test(jobId)) {
      throw new HttpError(400, 'A valid job ID is required.');
    }

    const result = await callPrintAgent<PrintStatus>('/cancel', {
      method: 'POST',
      body: JSON.stringify({ jobId }),
    });

    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
