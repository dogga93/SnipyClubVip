'use client';

import { GlassPanel } from '@/components/ui/glass-panel';
import { MiniBadge } from '@/components/ui/mini-badge';

type SignalCardProps = {
  title: string;
  lines: string[];
  tag?: string;
};

export function SignalCard({ title, lines, tag }: SignalCardProps) {
  return (
    <GlassPanel dense className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs font-semibold text-cyan-200">{title}</p>
        {tag ? <MiniBadge tone="violet">{tag}</MiniBadge> : null}
      </div>
      <div className="space-y-1">
        {lines.slice(0, 4).map((line, idx) => (
          <p key={`${title}-${idx}`} className="truncate text-xs text-slate-200">
            {line}
          </p>
        ))}
      </div>
    </GlassPanel>
  );
}

