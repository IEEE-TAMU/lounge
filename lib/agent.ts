import 'server-only';

import { serverConfig } from '@/lib/config';

type AgentErrorPayload = {
  ok?: boolean;
  error?: string;
};

type AgentTarget = {
  baseUrl: string;
  token?: string;
  label: string;
  timeoutMs: number;
};

export class AgentError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'AgentError';
    this.status = status;
  }
}

async function callService<T>(
  target: AgentTarget,
  path: string,
  init?: RequestInit,
): Promise<T> {
  const headers: Record<string, string> = {
    accept: 'application/json',
  };

  if (target.token) {
    headers.authorization = `Bearer ${target.token}`;
  }

  // Raw bodies (for example print uploads) supply their own content type.
  if (init?.body === undefined || typeof init.body === 'string') {
    headers['content-type'] = 'application/json';
  }

  let response: Response;

  try {
    response = await fetch(`${target.baseUrl}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string> | undefined),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(target.timeoutMs),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? `The ${target.label} took too long to respond.`
        : `Could not reach the ${target.label}.`;
    throw new AgentError(message, 503);
  }

  const payload = (await response.json().catch(() => ({}))) as T & AgentErrorPayload;

  if (!response.ok) {
    throw new AgentError(
      payload.error || `The ${target.label} returned HTTP ${response.status}`,
      response.status,
    );
  }

  return payload;
}

export function callAgent<T>(path: string, init?: RequestInit): Promise<T> {
  return callService<T>(
    {
      baseUrl: serverConfig.musicAgentUrl,
      token: serverConfig.musicAgentToken,
      label: 'lounge player',
      timeoutMs: 25_000,
    },
    path,
    init,
  );
}

export function callPrintAgent<T>(path: string, init?: RequestInit): Promise<T> {
  return callService<T>(
    {
      baseUrl: serverConfig.printAgentUrl,
      token: serverConfig.printAgentToken,
      label: 'lounge printer',
      timeoutMs: 60_000,
    },
    path,
    init,
  );
}
