'use client';

import { GlassPanel } from '@/components/ui/glass-panel';
import { MiniBadge } from '@/components/ui/mini-badge';
import { parsePercent } from '@/lib/monitor/merge';
import type { MonitorMatch } from '@/lib/monitor/types';

type MonitorMatchCardProps = {
  match: MonitorMatch;
  confidence?: number;
  onClick?: () => void;
};

const barWidth = (value: number) => `${Math.max(0, Math.min(100, value))}%`;

export function MonitorMatchCard({ match, confidence = 0, onClick }: MonitorMatchCardProps) {
  const h = parsePercent(match.probability1);
  const d = parsePercent(match.probabilityDraw);
  const a = parsePercent(match.probability2);

  return (
    <GlassPanel dense className="space-y-2 border-cyan-500/35" onClick={onClick}>
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-xs text-cyan-200">{match.league}</p>
        <MiniBadge tone="amber">Confidence {Math.round(confidence)}%</MiniBadge>
      </div>
      <div className="text-sm font-semibold text-white">
        {match.homeTeam} <span className="text-slate-400">vs</span> {match.awayTeam}
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-300">
        <span>{match.date}</span>
        <span className="text-cyan-300">{match.status || 'Scheduled'}</span>
      </div>
      <div className="space-y-1">
        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-800">
          <div className="h-full bg-gradient-to-r from-sky-400 to-fuchsia-500" style={{ width: barWidth(h + d + a || 0) }} />
        </div>
        <div className="flex items-center justify-between text-[11px] text-slate-300">
          <span>H {h || 0}%</span>
          <span>D {d || 0}%</span>
          <span>A {a || 0}%</span>
        </div>
      </div>
    </GlassPanel>
  );
}

