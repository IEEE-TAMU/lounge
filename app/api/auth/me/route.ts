import { NextResponse } from 'next/server';

import { errorResponse, requireOfficer } from '@/lib/api';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await requireOfficer();
    return NextResponse.json({ user });
  } catch (error) {
    return errorResponse(error);
  }
}
