import 'server-only';

import { serverConfig } from '@/lib/config';

type AgentErrorPayload = {
  ok?: boolean;
  error?: string;
};

export class AgentError extends Error {
  readonly status: number;

  constructor(message: string, status = 502) {
    super(message);
    this.name = 'AgentError';
    this.status = status;
  }
}

export async function callAgent<T>(path: string, init?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    accept: 'application/json',
    'content-type': 'application/json',
  };

  if (serverConfig.musicAgentToken) {
    headers.authorization = `Bearer ${serverConfig.musicAgentToken}`;
  }

  let response: Response;

  try {
    response = await fetch(`${serverConfig.musicAgentUrl}${path}`, {
      ...init,
      headers: {
        ...headers,
        ...(init?.headers as Record<string, string> | undefined),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(25_000),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'The lounge player took too long to respond.'
        : 'Could not reach the lounge player.';
    throw new AgentError(message, 503);
  }

  const payload = (await response.json().catch(() => ({}))) as T & AgentErrorPayload;

  if (!response.ok) {
    throw new AgentError(
      payload.error || `Lounge player returned HTTP ${response.status}`,
      response.status,
    );
  }

  return payload;
}
