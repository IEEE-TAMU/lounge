import type {
  ButtonHTMLAttributes,
  HTMLAttributes,
  InputHTMLAttributes,
  ReactNode,
} from 'react';

import { cn } from '@/lib/utils';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'icon';

const buttonVariants: Record<ButtonVariant, string> = {
  primary:
    'bg-emerald-400 text-emerald-950 hover:bg-emerald-300 focus-visible:outline-emerald-300',
  secondary:
    'border border-white/10 bg-white/5 text-zinc-100 hover:bg-white/10 focus-visible:outline-white/40',
  ghost: 'text-zinc-300 hover:bg-white/5 hover:text-white focus-visible:outline-white/40',
  danger:
    'border border-red-400/20 bg-red-400/10 text-red-200 hover:bg-red-400/20 focus-visible:outline-red-300',
};

const buttonSizes: Record<ButtonSize, string> = {
  sm: 'h-9 px-3 text-xs',
  md: 'h-11 px-4 text-sm',
  icon: 'size-10',
};

export function Button({
  variant = 'primary',
  size = 'md',
  type = 'button',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
}) {
  return (
    <button
      type={type}
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-40',
        buttonVariants[variant],
        buttonSizes[size],
        className,
      )}
      {...props}
    />
  );
}

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-white/10 bg-white/[0.04] shadow-2xl shadow-black/20 backdrop-blur',
        className,
      )}
      {...props}
    />
  );
}

type BadgeTone = 'neutral' | 'green' | 'amber' | 'red' | 'blue';

const badgeTones: Record<BadgeTone, string> = {
  neutral: 'border-white/10 bg-white/5 text-zinc-300',
  green: 'border-emerald-400/20 bg-emerald-400/10 text-emerald-200',
  amber: 'border-amber-400/20 bg-amber-400/10 text-amber-200',
  red: 'border-red-400/20 bg-red-400/10 text-red-200',
  blue: 'border-sky-400/20 bg-sky-400/10 text-sky-200',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: BadgeTone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium',
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        'h-11 w-full rounded-xl border border-white/10 bg-black/30 px-4 text-sm text-white transition outline-none placeholder:text-zinc-500 focus:border-emerald-400/60 focus:ring-2 focus:ring-emerald-400/20',
        className,
      )}
      {...props}
    />
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        'inline-block size-4 animate-spin rounded-full border-2 border-white/30 border-t-white',
        className,
      )}
    />
  );
}
