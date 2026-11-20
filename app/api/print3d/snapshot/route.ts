import { NextResponse } from 'next/server';

import { fetchBambuSnapshot } from '@/lib/agent';
import { errorResponse, requireOfficer } from '@/lib/api';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  try {
    await requireOfficer();
    const snapshot = await fetchBambuSnapshot();

    return new NextResponse(snapshot.body, {
      headers: {
        'content-type': snapshot.contentType,
        'cache-control': 'no-store',
      },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
