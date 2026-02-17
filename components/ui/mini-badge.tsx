'use client';

import { cn } from '@/lib/utils';

type MiniBadgeProps = {
  children: React.ReactNode;
  tone?: 'cyan' | 'green' | 'amber' | 'violet' | 'slate';
  className?: string;
};

const toneClass: Record<NonNullable<MiniBadgeProps['tone']>, string> = {
  cyan: 'border-cyan-400/40 bg-cyan-500/10 text-cyan-200',
  green: 'border-emerald-400/40 bg-emerald-500/10 text-emerald-200',
  amber: 'border-amber-400/40 bg-amber-500/10 text-amber-100',
  violet: 'border-violet-400/40 bg-violet-500/10 text-violet-100',
  slate: 'border-slate-500/40 bg-slate-500/10 text-slate-200'
};

export function MiniBadge({ children, tone = 'slate', className }: MiniBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        toneClass[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

