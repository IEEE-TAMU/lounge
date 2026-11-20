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
  readonly details: Record<string, unknown>;

  constructor(message: string, status = 502, details: Record<string, unknown> = {}) {
    super(message);
    this.name = 'AgentError';
    this.status = status;
    this.details = details;
  }
}

async function callService<T>(
  target: AgentTarget,
  path: string,
  init?: RequestInit,
  timeoutMs = target.timeoutMs,
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
      signal: AbortSignal.timeout(timeoutMs),
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
    const details: Record<string, unknown> = {};
    if (payload && typeof payload === 'object') {
      for (const [key, value] of Object.entries(payload)) {
        if (key !== 'ok' && key !== 'error') details[key] = value;
      }
    }

    throw new AgentError(
      payload.error || `The ${target.label} returned HTTP ${response.status}`,
      response.status,
      details,
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

export function callBambuAgent<T>(
  path: string,
  init?: RequestInit,
  timeoutMs = 15_000,
): Promise<T> {
  return callService<T>(
    {
      baseUrl: serverConfig.bambuAgentUrl,
      token: serverConfig.bambuAgentToken,
      label: 'lounge 3D printer',
      timeoutMs,
    },
    path,
    init,
    timeoutMs,
  );
}

export async function fetchBambuSnapshot(): Promise<{
  body: ArrayBuffer;
  contentType: string;
}> {
  const headers: Record<string, string> = { accept: 'image/jpeg' };
  if (serverConfig.bambuAgentToken) {
    headers.authorization = `Bearer ${serverConfig.bambuAgentToken}`;
  }

  let response: Response;
  try {
    response = await fetch(`${serverConfig.bambuAgentUrl}/snapshot`, {
      headers,
      cache: 'no-store',
      signal: AbortSignal.timeout(45_000),
    });
  } catch (error) {
    const message =
      error instanceof Error && error.name === 'TimeoutError'
        ? 'The lounge 3D printer took too long to send a camera image.'
        : 'Could not reach the lounge 3D printer.';
    throw new AgentError(message, 503);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as AgentErrorPayload;
    throw new AgentError(
      payload.error || `The lounge 3D printer returned HTTP ${response.status}`,
      response.status,
    );
  }

  const body = await response.arrayBuffer();
  if (body.byteLength === 0) {
    throw new AgentError('The lounge 3D printer returned an empty camera image.', 502);
  }

  return {
    body,
    contentType: response.headers.get('content-type') ?? 'image/jpeg',
  };
}
