export type LoungeRole = 'member' | 'officer' | 'admin';

export type SessionUser = {
  sub: string;
  email: string;
  name: string;
  role: LoungeRole;
  emailVerified: boolean;
};

export type PrintJob = {
  id?: string | null;
  owner?: string | null;
  size?: string | null;
};

export type PrinterInfo = {
  name?: string;
  state?: string;
  message?: string;
};

export type PrintLimits = {
  maxFileBytes: number;
  maxCopies: number;
};

export type PrintStatus = {
  ok: boolean;
  printer?: string | PrinterInfo;
  jobs?: PrintJob[];
  jobId?: string | null;
  filename?: string;
  copies?: number;
  pages?: string | null;
  error?: string;
  limits?: PrintLimits;
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
