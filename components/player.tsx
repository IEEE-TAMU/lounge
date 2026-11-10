'use client';

import {
  AlertCircle,
  ArrowDown,
  ArrowUp,
  ListX,
  LogOut,
  Music2,
  Pause,
  Play,
  RefreshCw,
  SkipForward,
  Square,
  Trash2,
  VolumeX,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import useSWR from 'swr';

import { roleLabel } from '@/lib/roles';
import {
  formatTime,
  getCurrentEntry,
  getUpcomingQueue,
  isIdle,
  progressPercent,
  upcomingCount,
} from '@/lib/player';
import type { PlayerStatus, QueueEntry, SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';

import { Badge, Button, Card, Input, Spinner } from '@/components/ui';

type Toast = {
  tone: 'success' | 'error';
  message: string;
};

type PlayerAction = (action: string, body?: Record<string, unknown>) => Promise<boolean>;

const SUCCESS_MESSAGES: Record<string, string> = {
  play: 'Queued on the lounge speakers.',
  skip: 'Skipped ahead.',
  stop: 'Stopped playback and cleared the queue.',
  remove: 'Removed from the queue.',
  move: 'Queue order updated.',
  clear: 'Cleared the upcoming queue.',
};

async function fetcher(url: string): Promise<PlayerStatus> {
  const response = await fetch(url, { cache: 'no-store' });
  const payload = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(payload.error || 'Could not load the player.');
  }

  return payload as PlayerStatus;
}

export function Player({ user, canControl }: { user: SessionUser; canControl: boolean }) {
  const {
    data: status,
    error,
    isLoading,
    isValidating,
    mutate,
  } = useSWR<PlayerStatus>('/api/player/status', fetcher, {
    refreshInterval: 3_000,
    refreshWhenHidden: false,
    revalidateOnFocus: true,
  });

  const [pending, setPending] = useState<string | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [playInput, setPlayInput] = useState('');
  const [skipCount, setSkipCount] = useState(1);
  const [volumeDraft, setVolumeDraft] = useState<number | null>(null);

  const act = useCallback<PlayerAction>(
    async (action, body) => {
      setPending(action);
      setToast(null);

      try {
        const response = await fetch(`/api/player/${action}`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body ?? {}),
        });
        const payload = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(payload.error || 'Request failed.');
        }

        await mutate(payload as PlayerStatus, { revalidate: true });

        const message = SUCCESS_MESSAGES[action];
        if (message) setToast({ tone: 'success', message });

        return true;
      } catch (requestError) {
        setToast({
          tone: 'error',
          message:
            requestError instanceof Error ? requestError.message : 'Request failed.',
        });
        return false;
      } finally {
        setPending(null);
      }
    },
    [mutate],
  );

  useEffect(() => {
    if (!toast) return;
    const timeout = setTimeout(() => setToast(null), 5_000);
    return () => clearTimeout(timeout);
  }, [toast]);

  useEffect(() => {
    if (volumeDraft === null) return;

    const requested = volumeDraft;
    const timeout = setTimeout(async () => {
      const ok = await act('volume', { volume: requested });
      if (ok) {
        setVolumeDraft((current) => (current === requested ? null : current));
      }
    }, 300);

    return () => clearTimeout(timeout);
  }, [act, volumeDraft]);

  async function submitPlay(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const input = playInput.trim();
    if (!input) return;

    const ok = await act('play', { input });
    if (ok) setPlayInput('');
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
      <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-400/20">
            <Music2 className="size-5" />
          </div>
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-emerald-300/80 uppercase">
              IEEE TAMU
            </p>
            <h1 className="text-lg font-semibold tracking-tight">Officer Lounge</h1>
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 sm:justify-end">
          <div className="text-right">
            <p className="text-sm font-medium text-white">{user.name || user.email}</p>
            <p className="text-xs text-zinc-400">{roleLabel(user.role)}</p>
          </div>
          <form action="/api/auth/logout" method="post">
            <Button type="submit" variant="secondary" size="sm">
              <LogOut className="size-3.5" />
              Log out
            </Button>
          </form>
        </div>
      </header>

      {error ? (
        <Card className="flex items-start gap-3 border-red-400/20 bg-red-400/10 p-4 text-sm text-red-100">
          <AlertCircle className="mt-0.5 size-4 flex-none" />
          <div className="flex-1">
            <p className="font-medium">Could not load the lounge player.</p>
            <p className="mt-1 text-red-200/80">{error.message}</p>
          </div>
          <Button variant="secondary" size="sm" onClick={() => void mutate()}>
            Retry
          </Button>
        </Card>
      ) : null}

      <main className="grid gap-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
        <section className="flex flex-col gap-6">
          <NowPlayingCard
            status={status}
            isLoading={isLoading || isValidating}
            onRefresh={() => void mutate()}
          />
          <ControlsCard
            status={status}
            canControl={canControl}
            pending={pending}
            playInput={playInput}
            setPlayInput={setPlayInput}
            skipCount={skipCount}
            setSkipCount={setSkipCount}
            volumeDraft={volumeDraft}
            setVolumeDraft={setVolumeDraft}
            act={act}
            submitPlay={submitPlay}
          />
        </section>

        <QueueCard status={status} canControl={canControl} pending={pending} act={act} />
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

function NowPlayingCard({
  status,
  isLoading,
  onRefresh,
}: {
  status?: PlayerStatus;
  isLoading: boolean;
  onRefresh: () => void;
}) {
  const idle = isIdle(status);
  const progress = progressPercent(status ?? { ok: true });
  const title = idle ? 'Nothing playing' : status?.title?.trim() || 'Unknown track';

  return (
    <Card className="overflow-hidden p-5 sm:p-6">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
            Now playing
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            {title}
          </h2>
        </div>
        <div className="flex flex-none items-center gap-2">
          <Badge tone={idle ? 'neutral' : status?.paused ? 'amber' : 'green'}>
            {idle ? 'Idle' : status?.paused ? 'Paused' : 'Playing'}
          </Badge>
          <Button
            variant="ghost"
            size="icon"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh player status"
          >
            <RefreshCw className={cn('size-4', isLoading && 'animate-spin')} />
          </Button>
        </div>
      </div>

      <div className="mt-6">
        <div className="h-2 overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full rounded-full bg-emerald-400 transition-[width] duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="mt-2 flex justify-between text-xs text-zinc-400">
          <span>{formatTime(status?.position)}</span>
          <span>{formatTime(status?.duration)}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Queue" value={idle ? '—' : String(status?.queueCount ?? 0)} />
        <Stat
          label="Upcoming"
          value={idle ? '—' : String(upcomingCount(status ?? { ok: true }))}
        />
        <Stat
          label="Volume"
          value={typeof status?.volume === 'number' ? `${status.volume}%` : '—'}
        />
        <Stat label="Muted" value={status?.mute ? 'Yes' : 'No'} />
      </div>
    </Card>
  );
}

function ControlsCard({
  status,
  canControl,
  pending,
  playInput,
  setPlayInput,
  skipCount,
  setSkipCount,
  volumeDraft,
  setVolumeDraft,
  act,
  submitPlay,
}: {
  status?: PlayerStatus;
  canControl: boolean;
  pending: string | null;
  playInput: string;
  setPlayInput: (value: string) => void;
  skipCount: number;
  setSkipCount: (value: number) => void;
  volumeDraft: number | null;
  setVolumeDraft: (value: number | null) => void;
  act: PlayerAction;
  submitPlay: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!canControl) {
    return (
      <Card className="flex items-start gap-3 p-5 text-sm text-zinc-300 sm:p-6">
        <AlertCircle className="mt-0.5 size-4 flex-none text-amber-300" />
        <div>
          <p className="font-medium text-white">View-only access</p>
          <p className="mt-1 text-zinc-400">
            Only portal officers and admins can control lounge playback. You can still
            follow what is playing and see the queue.
          </p>
        </div>
      </Card>
    );
  }

  const idle = isIdle(status);
  const paused = status?.paused === true;
  const disabled = pending !== null;
  const volumeValue = volumeDraft ?? status?.volume ?? 0;

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold tracking-[0.2em] text-zinc-400 uppercase">
          Controls
        </h2>
        {pending ? (
          <Badge tone="blue">
            <Spinner className="size-3" />
            {pending}
          </Badge>
        ) : null}
      </div>

      <form onSubmit={submitPlay} className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Input
          value={playInput}
          onChange={(event) => setPlayInput(event.target.value)}
          placeholder="YouTube, SoundCloud, Bandcamp link, or search text"
          disabled={disabled}
          aria-label="Queue a track"
        />
        <Button type="submit" disabled={disabled || !playInput.trim()}>
          <Play className="size-4" />
          Play
        </Button>
      </form>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          variant="secondary"
          onClick={() => void act('pause')}
          disabled={disabled || idle || paused}
        >
          <Pause className="size-4" />
          Pause
        </Button>
        <Button
          variant="secondary"
          onClick={() => void act('resume')}
          disabled={disabled || !paused}
        >
          <Play className="size-4" />
          Resume
        </Button>

        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-white/5 p-1">
          <select
            value={skipCount}
            onChange={(event) => setSkipCount(Number(event.target.value))}
            className="h-8 rounded-lg bg-transparent px-2 text-xs text-zinc-200 outline-none"
            aria-label="Number of tracks to skip"
            disabled={disabled}
          >
            {[1, 2, 3, 5].map((count) => (
              <option key={count} value={count} className="bg-zinc-900">
                Skip {count}
              </option>
            ))}
          </select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => void act('skip', { count: skipCount })}
            disabled={disabled || idle}
          >
            <SkipForward className="size-3.5" />
            Go
          </Button>
        </div>

        <Button
          variant="secondary"
          onClick={() => void act('stop')}
          disabled={disabled || idle}
        >
          <Square className="size-3.5" />
          Stop
        </Button>
        <Button
          variant="secondary"
          onClick={() => void act('clear')}
          disabled={disabled || idle || upcomingCount(status ?? { ok: true }) === 0}
        >
          <ListX className="size-4" />
          Clear queue
        </Button>
        <Button variant="secondary" onClick={() => void act('mute')} disabled={disabled}>
          <VolumeX className="size-4" />
          {status?.mute ? 'Unmute' : 'Mute'}
        </Button>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
            Volume
          </span>
          <span className="text-sm text-zinc-300">{volumeValue}%</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          value={volumeValue}
          onChange={(event) => setVolumeDraft(Number(event.target.value))}
          disabled={disabled}
          className="mt-3 h-2 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
          aria-label="Player volume"
        />
      </div>
    </Card>
  );
}

function QueueCard({
  status,
  canControl,
  pending,
  act,
}: {
  status?: PlayerStatus;
  canControl: boolean;
  pending: string | null;
  act: PlayerAction;
}) {
  const upcoming = getUpcomingQueue(status ?? { ok: true });
  const current = getCurrentEntry(status ?? { ok: true });

  return (
    <Card className="flex min-h-[320px] flex-col p-5 sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-[0.2em] text-zinc-400 uppercase">
            Queue
          </h2>
          <p className="mt-1 text-xs text-zinc-500">
            {upcoming.length} upcoming {upcoming.length === 1 ? 'track' : 'tracks'}
          </p>
        </div>
        <Badge tone="neutral">{status?.queueCount ?? 0} total</Badge>
      </div>

      <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
        {current ? (
          <div className="rounded-xl border border-emerald-400/20 bg-emerald-400/10 p-3">
            <p className="text-[11px] font-medium tracking-wide text-emerald-300 uppercase">
              Now playing
            </p>
            <p className="mt-1 line-clamp-2 text-sm font-medium text-white">
              {current.title || 'Unknown track'}
            </p>
          </div>
        ) : null}

        {upcoming.length === 0 ? (
          <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
            Nothing else queued.
          </div>
        ) : (
          upcoming.map((entry, index) => (
            <QueueRow
              key={`${entry.id ?? 'entry'}-${index}`}
              entry={entry}
              index={index}
              total={upcoming.length}
              canControl={canControl}
              pending={pending}
              act={act}
            />
          ))
        )}
      </div>
    </Card>
  );
}

function QueueRow({
  entry,
  index,
  total,
  canControl,
  pending,
  act,
}: {
  entry: QueueEntry;
  index: number;
  total: number;
  canControl: boolean;
  pending: string | null;
  act: PlayerAction;
}) {
  const hasId = typeof entry.id === 'number';
  const disabled = pending !== null || !hasId;

  return (
    <div className="group flex items-center gap-3 rounded-xl border border-white/10 bg-black/20 p-3">
      <span className="grid size-7 flex-none place-items-center rounded-lg bg-white/5 text-xs font-semibold text-zinc-400">
        {index + 1}
      </span>
      <p className="min-w-0 flex-1 truncate text-sm text-zinc-100">
        {entry.title?.trim() || 'Unknown track'}
      </p>

      {canControl ? (
        <div className="flex flex-none items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            aria-label="Move track up"
            disabled={disabled || index === 0}
            onClick={() => void act('move', { id: entry.id, position: index })}
          >
            <ArrowUp className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Move track down"
            disabled={disabled || index === total - 1}
            onClick={() => void act('move', { id: entry.id, position: index + 2 })}
          >
            <ArrowDown className="size-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            aria-label="Remove track"
            disabled={disabled}
            onClick={() => void act('remove', { id: entry.id })}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 px-3 py-2">
      <p className="text-[11px] tracking-wide text-zinc-500 uppercase">{label}</p>
      <p className="mt-1 text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}
