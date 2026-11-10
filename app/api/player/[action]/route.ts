import { NextRequest, NextResponse } from 'next/server';

import { callAgent } from '@/lib/agent';
import { assertSameOrigin, errorResponse, HttpError, requireOfficer } from '@/lib/api';
import { serverConfig } from '@/lib/config';
import { checkCooldown } from '@/lib/rate-limit';
import type { PlayerStatus, SessionUser } from '@/lib/types';

export const dynamic = 'force-dynamic';

const ALLOWED_ACTIONS = new Set([
  'play',
  'pause',
  'resume',
  'skip',
  'stop',
  'remove',
  'move',
  'clear',
  'volume',
  'mute',
]);

// Volume and mute are intentionally excluded: the volume slider sends updates
// as the user drags, and a cooldown there makes the UI feel broken.
const COOLDOWN_ACTIONS = new Set([
  'play',
  'pause',
  'resume',
  'skip',
  'stop',
  'remove',
  'move',
  'clear',
]);

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ action: string }> },
) {
  try {
    assertSameOrigin(request);

    const user = await requireOfficer();
    const { action } = await context.params;

    if (!ALLOWED_ACTIONS.has(action)) {
      throw new HttpError(404, 'Unknown player action.');
    }

    if (COOLDOWN_ACTIONS.has(action)) {
      const cooldown = checkCooldown(user.sub, serverConfig.cooldownSeconds);
      if (cooldown > 0) {
        throw new HttpError(429, `Slow down a bit — try again in ${cooldown}s.`);
      }
    }

    const body = await readJson(request);
    const result = await runAction(action, body, user);

    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

async function readJson(request: NextRequest): Promise<Record<string, unknown>> {
  try {
    const body = await request.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

async function runAction(
  action: string,
  body: Record<string, unknown>,
  user: SessionUser,
): Promise<PlayerStatus> {
  switch (action) {
    case 'play': {
      const input = requiredString(body.input, 'input');
      if (input.length > 2_048) {
        throw new HttpError(400, 'That input is too long.');
      }

      return callAgent<PlayerStatus>('/play', {
        method: 'POST',
        body: JSON.stringify({
          input,
          requestedBy: user.name || user.email,
        }),
      });
    }

    case 'pause':
      return callAgent<PlayerStatus>('/pause', { method: 'POST', body: '{}' });

    case 'resume':
      return callAgent<PlayerStatus>('/resume', { method: 'POST', body: '{}' });

    case 'skip': {
      const count = optionalInteger(body.count, 1, 'count');
      if (count < 1 || count > 25) {
        throw new HttpError(400, 'count must be between 1 and 25.');
      }

      return callAgent<PlayerStatus>('/skip', {
        method: 'POST',
        body: JSON.stringify({ count }),
      });
    }

    case 'stop':
      return callAgent<PlayerStatus>('/stop', { method: 'POST', body: '{}' });

    case 'remove': {
      const id = requiredInteger(body.id, 'id');

      return callAgent<PlayerStatus>('/remove', {
        method: 'POST',
        body: JSON.stringify({ id }),
      });
    }

    case 'move': {
      const id = requiredInteger(body.id, 'id');
      const position = requiredInteger(body.position, 'position');

      if (position < 1) {
        throw new HttpError(400, 'position must be at least 1.');
      }

      return callAgent<PlayerStatus>('/move', {
        method: 'POST',
        body: JSON.stringify({ id, position }),
      });
    }

    case 'clear':
      return callAgent<PlayerStatus>('/clear', { method: 'POST', body: '{}' });

    case 'volume': {
      const volume = requiredNumber(body.volume, 'volume');
      if (volume < 0 || volume > 100) {
        throw new HttpError(400, 'volume must be between 0 and 100.');
      }

      return callAgent<PlayerStatus>('/volume', {
        method: 'POST',
        body: JSON.stringify({ volume: Math.round(volume) }),
      });
    }

    case 'mute':
      return callAgent<PlayerStatus>('/mute', { method: 'POST', body: '{}' });

    default:
      throw new HttpError(404, 'Unknown player action.');
  }
}

function requiredString(value: unknown, name: string): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new HttpError(400, `${name} is required.`);
  }
  return value.trim();
}

function requiredInteger(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value)) {
    throw new HttpError(400, `${name} must be an integer.`);
  }
  return value;
}

function optionalInteger(value: unknown, fallback: number, name: string): number {
  if (value === undefined || value === null) return fallback;
  return requiredInteger(value, name);
}

function requiredNumber(value: unknown, name: string): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new HttpError(400, `${name} must be a number.`);
  }
  return value;
}
