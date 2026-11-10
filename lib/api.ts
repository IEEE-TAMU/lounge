import 'server-only';

import { NextResponse } from 'next/server';

import { AgentError } from '@/lib/agent';
import { getSession } from '@/lib/auth';
import { serverConfig } from '@/lib/config';
import { isOfficer } from '@/lib/roles';
import type { SessionUser } from '@/lib/types';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) {
    throw new HttpError(401, 'You must log in with the portal first.');
  }
  return user;
}

export async function requireOfficer(): Promise<SessionUser> {
  const user = await requireUser();
  if (!isOfficer(user)) {
    throw new HttpError(403, 'Only portal officers and admins can control the lounge.');
  }
  return user;
}

export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get('origin');
  if (!origin) return;

  const expected = new URL(serverConfig.appBaseUrl).origin;
  if (origin !== expected) {
    throw new HttpError(403, 'Invalid request origin.');
  }
}

export function errorResponse(error: unknown): NextResponse {
  if (error instanceof HttpError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  if (error instanceof AgentError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }

  console.error('Unhandled API error:', error);
  return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
}
