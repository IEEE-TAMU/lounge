import { NextRequest, NextResponse } from 'next/server';

import { callBambuAgent } from '@/lib/agent';
import { assertSameOrigin, errorResponse, HttpError, requireOfficer } from '@/lib/api';
import { serverConfig } from '@/lib/config';
import type { Print3dResult } from '@/lib/print3d';
import { checkCooldown } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILAMENTS = 25;

type StartRequest = {
  uploadId?: unknown;
  filamentMap?: unknown;
  filament_map?: unknown;
};

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    const user = await requireOfficer();

    const cooldown = checkCooldown(
      `print3d-start:${user.sub}`,
      Math.min(serverConfig.bambuCooldownSeconds, 2),
    );
    if (cooldown > 0) {
      throw new HttpError(429, `Slow down a bit — try again in ${cooldown}s.`);
    }

    const body = (await request.json().catch(() => null)) as StartRequest | null;
    if (!body || typeof body !== 'object') {
      throw new HttpError(400, 'Request body must be valid JSON.');
    }

    const uploadId = body.uploadId;
    if (typeof uploadId !== 'string' || !/^[a-f0-9]{32}$/i.test(uploadId)) {
      throw new HttpError(400, 'A valid uploadId is required.');
    }

    const filamentMap = body.filamentMap ?? body.filament_map;
    if (!Array.isArray(filamentMap) || filamentMap.length === 0) {
      throw new HttpError(400, 'Choose a filament slot for every sliced filament.');
    }
    if (filamentMap.length > MAX_FILAMENTS) {
      throw new HttpError(400, `At most ${MAX_FILAMENTS} filaments are supported.`);
    }

    const normalized = filamentMap.map((value) => {
      if (
        typeof value === 'number' &&
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 255
      ) {
        return value;
      }
      if (
        typeof value === 'string' &&
        /^(ext|external|ext1|ext2|\d{1,3})$/i.test(value.trim())
      ) {
        return value.trim().toLowerCase();
      }
      throw new HttpError(400, 'Each filament mapping must be a tray id or "ext".');
    });

    const result = await callBambuAgent<Print3dResult>(
      '/start',
      {
        method: 'POST',
        body: JSON.stringify({
          uploadId,
          filament_map: normalized,
        }),
      },
      180_000,
    );

    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}
