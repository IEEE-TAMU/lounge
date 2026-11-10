import 'server-only';

const lastActionAt = new Map<string, number>();
const MAX_ENTRIES = 2_000;

export function checkCooldown(key: string, cooldownSeconds: number): number {
  if (cooldownSeconds <= 0) return 0;

  const now = Date.now();
  const last = lastActionAt.get(key) ?? 0;
  const remaining = Math.ceil((last + cooldownSeconds * 1_000 - now) / 1_000);

  if (remaining > 0) {
    return remaining;
  }

  lastActionAt.set(key, now);

  if (lastActionAt.size > MAX_ENTRIES) {
    const cutoff = now - cooldownSeconds * 1_000;
    for (const [entryKey, timestamp] of lastActionAt) {
      if (timestamp < cutoff) lastActionAt.delete(entryKey);
    }
  }

  return 0;
}
