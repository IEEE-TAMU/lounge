import { NextResponse } from 'next/server';
import {
  buildAuthorizationUrl,
  calculatePKCECodeChallenge,
  randomNonce,
  randomPKCECodeVerifier,
  randomState,
} from 'openid-client';

import { setOidcCookies } from '@/lib/auth';
import { serverConfig } from '@/lib/config';
import { getOidcConfig } from '@/lib/oidc';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const config = await getOidcConfig();

    const verifier = randomPKCECodeVerifier();
    const challenge = await calculatePKCECodeChallenge(verifier);
    const state = randomState();
    const nonce = randomNonce();

    await setOidcCookies({ state, verifier, nonce });

    const url = buildAuthorizationUrl(config, {
      redirect_uri: serverConfig.redirectUri,
      scope: 'openid profile email role',
      code_challenge: challenge,
      code_challenge_method: 'S256',
      state,
      nonce,
    });

    return NextResponse.redirect(url);
  } catch (error) {
    console.error('Could not start portal login:', error);
    return NextResponse.redirect(
      new URL('/login?error=unavailable', serverConfig.appBaseUrl),
    );
  }
}
