export type LoungeRole = 'member' | 'officer' | 'admin';

export type SessionUser = {
  sub: string;
  email: string;
  name: string;
  role: LoungeRole;
  emailVerified: boolean;
};

export type QueueEntry = {
  id?: number | null;
  title?: string | null;
  current?: boolean;
};

export type PlayerStatus = {
  ok: boolean;
  idle?: boolean;
  paused?: boolean;
  playing?: boolean;
  title?: string | null;
  volume?: number | null;
  mute?: boolean;
  position?: number | null;
  duration?: number | null;
  queuePosition?: number | null;
  queueCount?: number;
  queue?: QueueEntry[];
  queued?: string;
  skipped?: number;
  removedTitle?: string | null;
  removedCount?: number;
  movedTitle?: string | null;
};
