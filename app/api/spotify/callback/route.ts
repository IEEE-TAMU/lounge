import { NextRequest, NextResponse } from 'next/server';

import { callAgent } from '@/lib/agent';
import { getSession } from '@/lib/auth';
import { serverConfig } from '@/lib/config';
import { isOfficer } from '@/lib/roles';

export const dynamic = 'force-dynamic';

function redirectToApp(params: Record<string, string>) {
  const url = new URL('/', serverConfig.appBaseUrl);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }
  return NextResponse.redirect(url);
}

export async function GET(request: NextRequest) {
  const user = await getSession();

  if (!user) {
    return NextResponse.redirect(new URL('/login', serverConfig.appBaseUrl));
  }

  if (!isOfficer(user)) {
    return redirectToApp({
      spotify: 'error',
      reason: 'Only portal officers and admins can connect Spotify.',
    });
  }

  const spotifyError = request.nextUrl.searchParams.get('error');
  if (spotifyError) {
    return redirectToApp({
      spotify: 'error',
      reason:
        spotifyError === 'access_denied'
          ? 'Spotify access was denied.'
          : 'Spotify sign-in failed.',
    });
  }

  const code = request.nextUrl.searchParams.get('code');
  const state = request.nextUrl.searchParams.get('state');

  if (!code || !state) {
    return redirectToApp({
      spotify: 'error',
      reason: 'Spotify did not return a sign-in code.',
    });
  }

  try {
    await callAgent('/spotify/callback', {
      method: 'POST',
      body: JSON.stringify({ code, state }),
    });
    return redirectToApp({ spotify: 'connected' });
  } catch (error) {
    return redirectToApp({
      spotify: 'error',
      reason: error instanceof Error ? error.message : 'Spotify sign-in failed.',
    });
  }
}
