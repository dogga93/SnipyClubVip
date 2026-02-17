'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

type GlassPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  dense?: boolean;
};

export function GlassPanel({ className, dense = false, ...props }: GlassPanelProps) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-cyan-500/25 bg-[linear-gradient(180deg,rgba(10,26,51,0.82),rgba(6,15,31,0.88))] shadow-[0_0_0_1px_rgba(22,65,110,0.35),0_8px_32px_rgba(2,8,20,0.55)] backdrop-blur-md',
        dense ? 'p-3' : 'p-4',
        className
      )}
      {...props}
    />
  );
}

