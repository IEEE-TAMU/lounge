import { NextRequest, NextResponse } from 'next/server';

import { callAgent } from '@/lib/agent';
import { assertSameOrigin, errorResponse, HttpError, requireOfficer } from '@/lib/api';
import { serverConfig } from '@/lib/config';
import { checkCooldown } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

type PlayerLoginResponse = {
  ok: boolean;
  url: string;
  command: string;
};

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    const user = await requireOfficer();
    const cooldown = checkCooldown(user.sub, serverConfig.cooldownSeconds);
    if (cooldown > 0) {
      throw new HttpError(429, `Slow down a bit — try again in ${cooldown}s.`);
    }

    const result = await callAgent<PlayerLoginResponse>('/spotify/player-login', {
      method: 'POST',
      body: '{}',
    });

    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
