import 'server-only';

import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';

import { serverConfig } from '@/lib/config';
import { normalizeRole } from '@/lib/roles';
import type { SessionUser } from '@/lib/types';

export const SESSION_COOKIE = 'lounge_session';
export const OIDC_STATE_COOKIE = 'lounge_oidc_state';
export const OIDC_VERIFIER_COOKIE = 'lounge_oidc_verifier';
export const OIDC_NONCE_COOKIE = 'lounge_oidc_nonce';

const OIDC_COOKIE_MAX_AGE = 10 * 60;
let sessionSecret: Uint8Array | null = null;

function getSessionSecret(): Uint8Array {
  if (!sessionSecret) {
    sessionSecret = new TextEncoder().encode(serverConfig.sessionSecret);
  }
  return sessionSecret;
}

function cookieOptions(maxAge: number) {
  return {
    httpOnly: true,
    secure: serverConfig.secureCookies,
    sameSite: 'lax' as const,
    path: '/',
    maxAge,
  };
}

export async function createSessionToken(user: SessionUser): Promise<string> {
  return new SignJWT({
    email: user.email,
    name: user.name,
    role: user.role,
    email_verified: user.emailVerified,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(user.sub)
    .setIssuedAt()
    .setExpirationTime(Math.floor(Date.now() / 1000) + serverConfig.sessionMaxAgeSeconds)
    .sign(getSessionSecret());
}

export async function verifySessionToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), {
      algorithms: ['HS256'],
    });

    if (
      typeof payload.sub !== 'string' ||
      typeof payload.email !== 'string' ||
      typeof payload.name !== 'string'
    ) {
      return null;
    }

    return {
      sub: payload.sub,
      email: payload.email,
      name: payload.name,
      role: normalizeRole(payload.role),
      emailVerified: payload.email_verified === true,
    };
  } catch {
    return null;
  }
}

export async function getSession(): Promise<SessionUser | null> {
  const store = await cookies();
  const token = store.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  return verifySessionToken(token);
}

export async function setSessionCookie(user: SessionUser): Promise<void> {
  const store = await cookies();
  const token = await createSessionToken(user);
  store.set(SESSION_COOKIE, token, cookieOptions(serverConfig.sessionMaxAgeSeconds));
}

export async function clearSessionCookie(): Promise<void> {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export type OidcCookies = {
  state: string;
  verifier: string;
  nonce: string;
};

export async function setOidcCookies(values: OidcCookies): Promise<void> {
  const store = await cookies();
  const options = cookieOptions(OIDC_COOKIE_MAX_AGE);
  store.set(OIDC_STATE_COOKIE, values.state, options);
  store.set(OIDC_VERIFIER_COOKIE, values.verifier, options);
  store.set(OIDC_NONCE_COOKIE, values.nonce, options);
}

export async function getOidcCookies(): Promise<OidcCookies | null> {
  const store = await cookies();
  const state = store.get(OIDC_STATE_COOKIE)?.value;
  const verifier = store.get(OIDC_VERIFIER_COOKIE)?.value;
  const nonce = store.get(OIDC_NONCE_COOKIE)?.value;

  if (!state || !verifier || !nonce) return null;
  return { state, verifier, nonce };
}

export async function clearOidcCookies(): Promise<void> {
  const store = await cookies();
  store.delete(OIDC_STATE_COOKIE);
  store.delete(OIDC_VERIFIER_COOKIE);
  store.delete(OIDC_NONCE_COOKIE);
}
