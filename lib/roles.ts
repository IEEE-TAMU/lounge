import type { LoungeRole, SessionUser } from '@/lib/types';

export function normalizeRole(value: unknown): LoungeRole {
  return value === 'officer' || value === 'admin' ? value : 'member';
}

export function isOfficer(user: SessionUser | null | undefined): boolean {
  return user?.role === 'officer' || user?.role === 'admin';
}

export function roleLabel(role: LoungeRole): string {
  if (role === 'admin') return 'Admin';
  if (role === 'officer') return 'Officer';
  return 'Member';
}
