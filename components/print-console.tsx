'use client';

import { AlertCircle, Printer, RefreshCw, Trash2, Upload, X } from 'lucide-react';
import { useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import useSWR from 'swr';

import {
  formatBytes,
  isSupportedPrintFile,
  PRINT_MAX_COPIES,
  PRINT_MAX_FILE_MB,
  printerInfo,
  printerName,
  printerState,
} from '@/lib/print';
import type { PrintStatus, SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';

import { AppHeader } from '@/components/header';
import { Badge, Button, Card, Input, Spinner } from '@/components/ui';

type Toast = {
  tone: 'success' | 'error';
  message: string;
};

const STATE_TONES: Record<string, 'neutral' | 'green' | 'amber' | 'red' | 'blue'> = {
  idle: 'green',
  printing: 'blue',
  stopped: 'red',
  unknown: 'neutral',
};

async function fetcher(url: string): Promise<PrintStatus> {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Could not load the printer.');
  }

  return payload as PrintStatus;
}

export function PrintConsole({ user }: { user: SessionUser }) {
  const {
    data: status,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<PrintStatus>('/api/print/status', fetcher, {
    refreshInterval: 10_000,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const toastTimeout = useRef<number | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [copies, setCopies] = useState('1');
  const [pages, setPages] = useState('');
  const [uploading, setUploading] = useState(false);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);

  const maxFileBytes = status?.limits?.maxFileBytes ?? PRINT_MAX_FILE_MB * 1024 * 1024;
  const maxCopies = status?.limits?.maxCopies ?? PRINT_MAX_COPIES;
  const state = printerState(status);
  const info = printerInfo(status);

  function showToast(tone: Toast['tone'], message: string) {
    if (toastTimeout.current !== null) window.clearTimeout(toastTimeout.current);
    setToast({ tone, message });
    toastTimeout.current = window.setTimeout(() => setToast(null), 5_000);
  }

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null;

    if (selected && selected.size > maxFileBytes) {
      showToast(
        'error',
        `That file is too large (${formatBytes(selected.size)}); the limit is ${formatBytes(maxFileBytes)}.`,
      );
      event.target.value = '';
      setFile(null);
      return;
    }

    if (selected && !isSupportedPrintFile(selected)) {
      showToast('error', 'Only PDF, PNG, JPEG, and plain-text files are supported.');
      event.target.value = '';
      setFile(null);
      return;
    }

    setFile(selected);
  }

  async function submitPrint(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      showToast('error', 'Choose a file to print.');
      return;
    }

    if (file.size > maxFileBytes) {
      showToast(
        'error',
        `That file is too large; the limit is ${formatBytes(maxFileBytes)}.`,
      );
      return;
    }

    const copyCount = Number(copies);
    if (!Number.isInteger(copyCount) || copyCount < 1 || copyCount > maxCopies) {
      showToast('error', `Copies must be a whole number between 1 and ${maxCopies}.`);
      return;
    }

    const trimmedPages = pages.trim();
    const form = new FormData();
    form.set('file', file);
    form.set('copies', String(copyCount));
    if (trimmedPages) form.set('pages', trimmedPages);

    setUploading(true);
    try {
      const response = await fetch('/api/print', { method: 'POST', body: form });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not queue the print job.');
      }

      const result = payload as PrintStatus;
      showToast(
        'success',
        `Queued ${result.filename ?? file.name} on ${printerName(result)}.`,
      );

      setFile(null);
      setCopies('1');
      setPages('');
      if (fileInputRef.current) fileInputRef.current.value = '';

      await mutate();
    } catch (requestError) {
      showToast(
        'error',
        requestError instanceof Error
          ? requestError.message
          : 'Could not queue the print job.',
      );
    } finally {
      setUploading(false);
    }
  }

  async function cancelJob(jobId: string) {
    setCancelling(jobId);
    try {
      const response = await fetch('/api/print/cancel', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ jobId }),
      });
      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload.error || 'Could not cancel that job.');
      }

      showToast('success', `Cancelled job ${jobId}.`);
      await mutate();
    } catch (requestError) {
      showToast(
        'error',
        requestError instanceof Error
          ? requestError.message
          : 'Could not cancel that job.',
      );
    } finally {
      setCancelling(null);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <AppHeader user={user} active="print" />

      {error ? (
        <Card className="flex items-start gap-3 border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
          <AlertCircle className="mt-0.5 size-4 flex-none" />
          <div className="flex-1">
            <p className="font-medium">Could not load the lounge printer.</p>
            <p className="mt-1 text-red-200/80">{error.message}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void mutate()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <main className="grid gap-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <Card className="p-5 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
                Send a print job
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                Print from the lounge
              </h2>
            </div>
            <div className="flex flex-none items-center gap-2">
              <Badge tone={STATE_TONES[state] ?? 'neutral'}>{state}</Badge>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => void mutate()}
                disabled={isLoading || isValidating}
                aria-label="Refresh printer status"
              >
                <RefreshCw
                  className={cn('size-4', (isLoading || isValidating) && 'animate-spin')}
                />
              </Button>
            </div>
          </div>

          <form onSubmit={submitPrint} className="mt-6 flex flex-col gap-4">
            <div>
              <label
                htmlFor="print-file"
                className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase"
              >
                File
              </label>
              <input
                ref={fileInputRef}
                id="print-file"
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.txt,application/pdf,image/png,image/jpeg,text/plain"
                onChange={handleFileChange}
                disabled={uploading}
                className="mt-2 block w-full cursor-pointer rounded-xl border border-dashed border-white/15 bg-black/30 px-4 py-6 text-sm text-zinc-300 transition file:mr-4 file:rounded-lg file:border-0 file:bg-emerald-400 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-emerald-950 hover:border-emerald-400/40 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="mt-2 text-xs text-zinc-500">
                PDF, PNG, JPEG, or plain text up to {formatBytes(maxFileBytes)}.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="print-copies"
                  className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase"
                >
                  Copies
                </label>
                <Input
                  id="print-copies"
                  type="number"
                  min={1}
                  max={maxCopies}
                  value={copies}
                  onChange={(event) => setCopies(event.target.value)}
                  disabled={uploading}
                  className="mt-2"
                />
              </div>
              <div>
                <label
                  htmlFor="print-pages"
                  className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase"
                >
                  Pages
                </label>
                <Input
                  id="print-pages"
                  value={pages}
                  onChange={(event) => setPages(event.target.value)}
                  placeholder="All pages, or 1-3,5"
                  maxLength={64}
                  disabled={uploading}
                  className="mt-2"
                />
              </div>
            </div>

            <Button type="submit" disabled={uploading || !file} className="sm:self-start">
              {uploading ? <Spinner className="size-4" /> : <Upload className="size-4" />}
              {uploading ? 'Uploading…' : 'Send to printer'}
            </Button>
          </form>

          <div className="mt-8 border-t border-white/10 pt-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
                Printer
              </p>
              <span className="font-mono text-xs text-zinc-400">
                {typeof status?.printer === 'object'
                  ? (status.printer.name ?? 'unknown queue')
                  : (status?.printer ?? 'unknown queue')}
              </span>
            </div>
            {info?.message ? (
              <pre className="mt-3 max-h-40 overflow-auto rounded-xl border border-white/10 bg-black/30 p-3 text-xs whitespace-pre-wrap text-zinc-400">
                {info.message}
              </pre>
            ) : (
              <p className="mt-3 text-sm text-zinc-500">
                {error ? 'Printer status is unavailable.' : 'No printer messages.'}
              </p>
            )}
          </div>
        </Card>

        <QueueCard
          status={status}
          canceling={cancelling}
          onCancel={(jobId) => void cancelJob(jobId)}
        />
      </main>

      {toast ? (
        <div
          className={cn(
            'fixed right-4 bottom-4 z-50 flex max-w-sm items-start gap-3 rounded-xl border px-4 py-3 text-sm shadow-2xl',
            toast.tone === 'error'
              ? 'border-red-400/30 bg-red-950/95 text-red-100'
              : 'border-emerald-400/30 bg-emerald-950/95 text-emerald-100',
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => setToast(null)}
            className="opacity-60 transition hover:opacity-100"
            aria-label="Dismiss notification"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
}

function QueueCard({
  status,
  canceling,
  onCancel,
}: {
  status?: PrintStatus;
  canceling: string | null;
  onCancel: (jobId: string) => void;
}) {
  const jobs = status?.jobs ?? [];

  return (
    <Card className="flex min-h-[320px] flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Printer className="size-4 text-emerald-300" />
          <div>
            <h2 className="text-sm font-semibold tracking-[0.2em] text-zinc-400 uppercase">
              Print queue
            </h2>
            <p className="mt-1 text-xs text-zinc-500">
              {jobs.length} queued {jobs.length === 1 ? 'job' : 'jobs'}
            </p>
          </div>
        </div>
        <Badge tone="neutral">{printerName(status)}</Badge>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {jobs.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
            Nothing in the print queue.
          </div>
        ) : (
          jobs.map((job, index) => {
            const jobId = job.id;
            const disabled = !jobId || canceling !== null;

            return (
              <div
                key={jobId ?? `job-${index}`}
                className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-mono text-sm text-zinc-100">
                    {jobId ?? 'unknown job'}
                  </p>
                  <p className="mt-1 truncate text-xs text-zinc-500">
                    {[job.owner, job.size].filter(Boolean).join(' · ') || 'Queued'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Cancel ${jobId ?? 'print job'}`}
                  disabled={disabled}
                  onClick={() => jobId && onCancel(jobId)}
                >
                  {canceling === jobId ? (
                    <Spinner className="size-4" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                </Button>
              </div>
            );
          })
        )}
      </div>
    </Card>
  );
}
