import { NextRequest, NextResponse } from 'next/server';
import { authorizationCodeGrant, fetchUserInfo } from 'openid-client';

import { clearOidcCookies, getOidcCookies, setSessionCookie } from '@/lib/auth';
import { serverConfig } from '@/lib/config';
import { getOidcConfig } from '@/lib/oidc';
import { normalizeRole } from '@/lib/roles';

export const dynamic = 'force-dynamic';

function loginError(reason: string) {
  return NextResponse.redirect(
    new URL(`/login?error=${encodeURIComponent(reason)}`, serverConfig.appBaseUrl),
  );
}

export async function GET(request: NextRequest) {
  const oidc = await getOidcCookies();

  if (!oidc) {
    return loginError('expired');
  }

  try {
    const config = await getOidcConfig();

    // Next.js behind Traefik/Cloudflare sees the internal pod URL in
    // request.url. Build the current URL from the public redirect URI so the
    // token request sends the same redirect_uri as the authorization request.
    const currentUrl = new URL(serverConfig.redirectUri);
    currentUrl.search = request.nextUrl.search;

    const tokens = await authorizationCodeGrant(config, currentUrl, {
      pkceCodeVerifier: oidc.verifier,
      expectedState: oidc.state,
      expectedNonce: oidc.nonce,
    });

    const claims = tokens.claims();
    if (!claims?.sub) {
      throw new Error('Portal did not return an ID token subject.');
    }

    const userinfo = await fetchUserInfo(config, tokens.access_token, claims.sub);

    const user = {
      sub: String(userinfo.sub ?? claims.sub),
      email: String(userinfo.email ?? claims.email ?? ''),
      name: String(
        userinfo.name ??
          userinfo.preferred_username ??
          claims.name ??
          claims.preferred_username ??
          '',
      ),
      role: normalizeRole(userinfo.role ?? claims.role),
      emailVerified: Boolean(userinfo.email_verified ?? claims.email_verified),
    };

    if (!user.emailVerified) {
      await clearOidcCookies();
      return loginError('unconfirmed');
    }

    await setSessionCookie(user);
    await clearOidcCookies();

    return NextResponse.redirect(new URL('/', serverConfig.appBaseUrl));
  } catch (error) {
    console.error('Portal login callback failed:', error);
    await clearOidcCookies();
    return loginError('failed');
  }
}
