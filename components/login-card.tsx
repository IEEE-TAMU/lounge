import { ArrowRight, Music2, ShieldCheck } from 'lucide-react';

import { Card } from '@/components/ui';

const ERROR_MESSAGES: Record<string, string> = {
  expired: 'Your login session expired. Please try again.',
  unconfirmed:
    'Please confirm your IEEE TAMU portal email address before using the lounge.',
  failed: 'Login failed. Please try again.',
  unavailable: 'The portal is temporarily unavailable. Please try again shortly.',
  access_denied: 'Portal login was cancelled.',
};

export function LoginCard({ error }: { error?: string }) {
  const message = error ? (ERROR_MESSAGES[error] ?? ERROR_MESSAGES.failed) : null;

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl items-center px-4 py-10 sm:px-6 lg:px-8">
      <div className="grid w-full gap-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="max-w-xl">
          <div className="flex items-center gap-3">
            <div className="grid size-11 place-items-center rounded-xl bg-emerald-400 text-emerald-950 shadow-lg shadow-emerald-400/20">
              <Music2 className="size-5" />
            </div>
            <div>
              <p className="text-xs font-medium tracking-[0.2em] text-emerald-300/80 uppercase">
                IEEE TAMU
              </p>
              <h1 className="text-xl font-semibold tracking-tight text-white">
                Officer Lounge
              </h1>
            </div>
          </div>

          <h2 className="mt-10 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            Control the lounge speakers from anywhere.
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-zinc-400">
            Queue music, skip tracks, and check what is playing. Sign in with your IEEE
            TAMU portal account to continue.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <a
              href="/api/auth/login"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-400 px-6 text-sm font-semibold text-emerald-950 shadow-lg shadow-emerald-400/20 transition hover:bg-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300"
            >
              Login with Portal
              <ArrowRight className="size-4" />
            </a>
            <a
              href="https://portal.ieeetamu.org"
              className="inline-flex h-12 items-center justify-center rounded-xl border border-white/10 bg-white/5 px-6 text-sm font-semibold text-zinc-200 transition hover:bg-white/10"
            >
              Open the portal
            </a>
          </div>

          <p className="mt-4 flex items-center gap-2 text-xs text-zinc-500">
            <ShieldCheck className="size-4 text-emerald-300/80" />
            Any confirmed portal member can view the lounge. Only officers and admins can
            control playback.
          </p>
        </div>

        <Card className="relative overflow-hidden p-6 sm:p-8">
          <div className="absolute -top-24 -right-20 size-56 rounded-full bg-emerald-400/10 blur-3xl" />
          <div className="relative">
            <p className="text-xs font-medium tracking-[0.2em] text-zinc-500 uppercase">
              Lounge access
            </p>
            <div className="mt-6 space-y-4">
              <Feature
                title="Queue anything"
                body="Paste a YouTube, SoundCloud, or Bandcamp link, or search by text."
              />
              <Feature
                title="Keep the vibe going"
                body="Pause, resume, skip, reorder, and clear the upcoming queue."
              />
              <Feature
                title="See what is playing"
                body="Live now-playing, progress, volume, and the full upcoming queue."
              />
            </div>

            {message ? (
              <div className="mt-6 rounded-xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-100">
                {message}
              </div>
            ) : null}

            <p className="mt-8 border-t border-white/10 pt-5 text-xs leading-5 text-zinc-500">
              Access is managed by the IEEE TAMU portal. If you are an officer but do not
              see playback controls, ask an admin to check your portal role.
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-black/20 p-4">
      <p className="text-sm font-medium text-white">{title}</p>
      <p className="mt-1 text-sm leading-6 text-zinc-400">{body}</p>
    </div>
  );
}
