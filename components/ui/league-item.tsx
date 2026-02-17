'use client';

import { MiniBadge } from '@/components/ui/mini-badge';
import { cn } from '@/lib/utils';

type LeagueItemProps = {
  logo?: string;
  name: string;
  count: number;
  active?: boolean;
  onClick?: () => void;
};

export function LeagueItem({ logo, name, count, active = false, onClick }: LeagueItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition',
        active
          ? 'border-cyan-400/50 bg-cyan-500/10'
          : 'border-white/10 bg-white/5 hover:border-cyan-400/35 hover:bg-cyan-500/10'
      )}
    >
      <span className="h-6 w-6 overflow-hidden rounded-full border border-cyan-500/40 bg-slate-900/70">
        {logo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logo} alt={name} className="h-full w-full object-cover" />
        ) : (
          <span className="grid h-full w-full place-items-center text-[10px]">⚽</span>
        )}
      </span>
      <span className="min-w-0 flex-1 truncate text-sm text-slate-100">{name}</span>
      <MiniBadge tone="cyan">{count}</MiniBadge>
    </button>
  );
}

