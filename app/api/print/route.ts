import { NextRequest, NextResponse } from 'next/server';

import { callPrintAgent } from '@/lib/agent';
import { assertSameOrigin, errorResponse, HttpError, requireOfficer } from '@/lib/api';
import { serverConfig } from '@/lib/config';
import {
  formatBytes,
  isSupportedPrintFile,
  isValidPageRange,
  PRINT_MAX_COPIES,
} from '@/lib/print';
import { checkCooldown } from '@/lib/rate-limit';
import type { PrintStatus } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  try {
    assertSameOrigin(request);

    const user = await requireOfficer();

    const cooldown = checkCooldown(
      `print:${user.sub}`,
      serverConfig.printCooldownSeconds,
    );
    if (cooldown > 0) {
      throw new HttpError(429, `Slow down a bit — try again in ${cooldown}s.`);
    }

    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      throw new HttpError(400, 'Choose a file to print.');
    }

    if (file.size > serverConfig.printMaxFileBytes) {
      throw new HttpError(
        413,
        `That file is too large (${formatBytes(file.size)}); the limit is ${formatBytes(
          serverConfig.printMaxFileBytes,
        )}.`,
      );
    }

    if (!isSupportedPrintFile({ name: file.name, type: file.type })) {
      throw new HttpError(
        400,
        'Only PDF, PNG, JPEG, and plain-text files are supported.',
      );
    }

    const copies = parseCopies(form.get('copies'));
    const pages = parsePages(form.get('pages'));

    const bytes = new Uint8Array(await file.arrayBuffer());
    if (bytes.byteLength > serverConfig.printMaxFileBytes) {
      throw new HttpError(
        413,
        `That file is too large; the limit is ${formatBytes(serverConfig.printMaxFileBytes)}.`,
      );
    }

    const params = new URLSearchParams({
      filename: file.name,
      copies: String(copies),
    });
    if (pages) params.set('pages', pages);

    const result = await callPrintAgent<PrintStatus>(`/print?${params.toString()}`, {
      method: 'POST',
      headers: { 'content-type': file.type || 'application/octet-stream' },
      body: bytes,
    });

    return NextResponse.json(result, {
      headers: { 'cache-control': 'no-store' },
    });
  } catch (error) {
    return errorResponse(error);
  }
}

function parseCopies(value: FormDataEntryValue | null): number {
  if (value === null || value === '') return 1;

  const copies = Number(value);
  if (!Number.isInteger(copies) || copies < 1 || copies > PRINT_MAX_COPIES) {
    throw new HttpError(
      400,
      `Copies must be a whole number between 1 and ${PRINT_MAX_COPIES}.`,
    );
  }
  return copies;
}

function parsePages(value: FormDataEntryValue | null): string | undefined {
  if (typeof value !== 'string') return undefined;

  const pages = value.trim();
  if (!pages) return undefined;

  if (pages.length > 64 || !isValidPageRange(pages)) {
    throw new HttpError(400, 'Pages must look like 1-3,5.');
  }
  return pages;
}
