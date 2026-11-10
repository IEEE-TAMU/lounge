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
  artist?: string | null;
  album?: string | null;
  current?: boolean;
};

export type SpotifyStatus = {
  configured: boolean;
  linked: boolean;
  accountName?: string | null;
  product?: string | null;
  deviceName?: string | null;
  deviceOnline?: boolean;
  paired?: boolean;
  error?: string | null;
};

export type PlayerStatus = {
  ok: boolean;
  idle?: boolean;
  paused?: boolean;
  playing?: boolean;
  title?: string | null;
  artist?: string | null;
  album?: string | null;
  volume?: number | null;
  mute?: boolean;
  position?: number | null;
  duration?: number | null;
  queuePosition?: number | null;
  queueCount?: number;
  queue?: QueueEntry[];
  source?: 'mpv' | 'spotify';
  spotify?: SpotifyStatus;
  queued?: string;
  skipped?: number;
  removedTitle?: string | null;
  removedCount?: number;
  movedTitle?: string | null;
};
