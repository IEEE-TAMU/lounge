import { NextRequest, NextResponse } from 'next/server';

import { callBambuAgent } from '@/lib/agent';
import { assertSameOrigin, errorResponse, HttpError, requireOfficer } from '@/lib/api';
import { serverConfig } from '@/lib/config';
import { formatBytes, isGcode3mfFile, type Print3dUploadResult } from '@/lib/print3d';
import { checkCooldown } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_PLATE = 16;

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    const user = await requireOfficer();

    const cooldown = checkCooldown(
      `print3d:${user.sub}`,
      serverConfig.bambuCooldownSeconds,
    );
    if (cooldown > 0) {
      throw new HttpError(429, `Slow down a bit — try again in ${cooldown}s.`);
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      throw new HttpError(400, 'Choose a pre-sliced .gcode.3mf file.');
    }

    if (!isGcode3mfFile({ name: file.name })) {
      throw new HttpError(400, 'Only pre-sliced .gcode.3mf files are supported.');
    }

    if (file.size > serverConfig.bambuMaxFileBytes) {
      throw new HttpError(
        413,
        `That file is too large (${formatBytes(file.size)}); the limit is ${formatBytes(
          serverConfig.bambuMaxFileBytes,
        )}.`,
      );
    }

    const plate = parsePlate(form.get('plate'));
    const bedLeveling = parseBoolean(form.get('bed_leveling'), true);
    const flowCali = parseBoolean(form.get('flow_cali'), false);
    const vibrationCali = parseBoolean(form.get('vibration_cali'), false);
    const timelapse = parseBoolean(form.get('timelapse'), false);

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > serverConfig.bambuMaxFileBytes) {
      throw new HttpError(
        413,
        `That file is too large; the limit is ${formatBytes(serverConfig.bambuMaxFileBytes)}.`,
      );
    }

    const params = new URLSearchParams({
      filename: file.name,
      plate: String(plate),
      start: 'false',
      bed_leveling: String(bedLeveling),
      flow_cali: String(flowCali),
      vibration_cali: String(vibrationCali),
      timelapse: String(timelapse),
    });

    const result = await callBambuAgent<Print3dUploadResult>(
      `/print?${params.toString()}`,
      {
        method: 'POST',
        headers: { 'content-type': 'application/octet-stream' },
        body: bytes,
      },
      300_000,
    );

    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function parsePlate(value: FormDataEntryValue | null): number {
  if (value === null || value === '') return 1;

  const plate = Number(value);
  if (!Number.isInteger(plate) || plate < 1 || plate > MAX_PLATE) {
    throw new HttpError(400, `Plate must be a whole number between 1 and ${MAX_PLATE}.`);
  }
  return plate;
}

function parseBoolean(value: FormDataEntryValue | null, fallback: boolean): boolean {
  if (typeof value !== 'string') return fallback;
  return value === 'true' || value === '1' || value === 'on';
}
