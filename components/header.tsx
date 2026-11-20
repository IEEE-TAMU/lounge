import { LogOut, Music2, Printer } from 'lucide-react';
import Link from 'next/link';

import { roleLabel } from '@/lib/roles';
import type { SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';

import { Button } from '@/components/ui';

type Page = 'music' | 'print';

const LINKS: { href: string; label: string; page: Page; icon: typeof Music2 }[] = [
  { href: '/', label: 'Music', page: 'music', icon: Music2 },
  { href: '/print', label: 'Print', page: 'print', icon: Printer },
];

export function AppHeader({ user, active }: { user: SessionUser; active: Page }) {
  return (
    <header className="flex flex-col gap-4 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="grid size-10 place-items-center rounded-xl bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-400/20">
            {active === 'print' ? (
              <Printer className="size-5" />
            ) : (
              <Music2 className="size-5" />
            )}
          </div>
          <div>
            <p className="text-xs font-medium tracking-[0.2em] text-emerald-300/80 uppercase">
              IEEE TAMU
            </p>
            <h1 className="text-lg font-semibold tracking-tight">Officer Lounge</h1>
          </div>
        </div>

        <nav className="flex items-center gap-1 rounded-xl border border-white/10 bg-black/20 p-1">
          {LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = link.page === active;

            return (
              <Link
                key={link.page}
                href={link.href}
                aria-current={isActive ? 'page' : undefined}
                className={cn(
                  'inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold transition',
                  isActive
                    ? 'bg-emerald-400 text-emerald-950'
                    : 'text-zinc-300 hover:bg-white/5 hover:text-white',
                )}
              >
                <Icon className="size-3.5" />
                {link.label}
              </Link>
            );
          })}
        </nav>
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
  );
}
