import { NextResponse } from 'next/server';

import { clearSessionCookie } from '@/lib/auth';
import { serverConfig } from '@/lib/config';

export const dynamic = 'force-dynamic';

export async function POST() {
  await clearSessionCookie();
  return NextResponse.redirect(new URL('/login', serverConfig.appBaseUrl), 303);
}
