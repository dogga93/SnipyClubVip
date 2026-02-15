'use client';

import * as React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface StatChipProps {
  label: string;
  value: string | number;
  icon?: LucideIcon;
  color?: 'default' | 'emerald' | 'cyan' | 'purple' | 'rose';
  className?: string;
}

export function StatChip({
  label,
  value,
  icon: Icon,
  color = 'default',
  className
}: StatChipProps) {
  const colorClasses = {
    default: 'bg-white/5 text-gray-300',
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    purple: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    rose: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
  };

  return (
    <div
      className={cn(
        'inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-white/10',
        colorClasses[color],
        className
      )}
    >
      {Icon && <Icon className="w-4 h-4" />}
      <div className="flex flex-col">
        <span className="text-xs text-gray-400">{label}</span>
        <span className="text-sm font-semibold">{value}</span>
      </div>
    </div>
  );
}
