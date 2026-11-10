import type { PlayerStatus, QueueEntry } from '@/lib/types';

export const QUEUE_PAGE_SIZE = 10;

export function formatTime(seconds?: number | null): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds)) return '0:00';
  const total = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(total / 60);
  const remainder = total % 60;
  return `${minutes}:${remainder.toString().padStart(2, '0')}`;
}

export function getCurrentEntry(status: PlayerStatus): QueueEntry | undefined {
  const position = status.queuePosition;
  if (typeof position !== 'number' || position < 0) return undefined;
  return status.queue?.[position];
}

export function getUpcomingQueue(status: PlayerStatus): QueueEntry[] {
  const queue = status.queue ?? [];
  const position = status.queuePosition;

  if (typeof position !== 'number' || position < 0) {
    return [];
  }

  return queue.slice(position + 1);
}

export function getQueueEntry(
  status: PlayerStatus,
  position: number,
): QueueEntry | undefined {
  return getUpcomingQueue(status)[position - 1];
}

export function upcomingCount(status: PlayerStatus): number {
  return getUpcomingQueue(status).length;
}

export function progressPercent(status: PlayerStatus): number {
  if (
    typeof status.position !== 'number' ||
    typeof status.duration !== 'number' ||
    status.duration <= 0
  ) {
    return 0;
  }

  return Math.min(100, Math.max(0, (status.position / status.duration) * 100));
}

export function isIdle(status?: PlayerStatus | null): boolean {
  return !status || status.idle === true || (!status.playing && !status.paused);
}
