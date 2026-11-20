import type { PrintStatus, PrinterInfo } from '@/lib/types';

export const PRINT_MAX_COPIES = 20;
export const PRINT_MAX_FILE_MB = 10;

export const PRINT_SUPPORTED_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'text/plain',
]);

const PAGE_RANGE_PATTERN = /^\d+(?:-\d+)?(?:,\d+(?:-\d+)?)*$/;
const SUPPORTED_EXTENSION_PATTERN = /\.(?:pdf|png|jpe?g|txt)$/i;

export function isValidPageRange(value: string): boolean {
  return PAGE_RANGE_PATTERN.test(value);
}

export function isSupportedPrintFile(file: { name: string; type?: string }): boolean {
  const type = file.type?.split(';', 1)[0]?.trim().toLowerCase();
  if (type && PRINT_SUPPORTED_TYPES.has(type)) return true;
  return SUPPORTED_EXTENSION_PATTERN.test(file.name);
}

export function formatBytes(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.ceil(bytes / 1024))} KB`;
}

export function printerInfo(status?: PrintStatus | null): PrinterInfo | undefined {
  return typeof status?.printer === 'object' ? status.printer : undefined;
}

export function printerName(status?: PrintStatus | null): string {
  if (typeof status?.printer === 'string') return status.printer;
  return status?.printer?.name ?? 'the lounge printer';
}

export function printerState(status?: PrintStatus | null): string {
  return printerInfo(status)?.state ?? 'unknown';
}
