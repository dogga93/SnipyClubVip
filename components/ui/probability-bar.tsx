'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface ProbabilityBarProps {
  segments: {
    label: string;
    value: number;
    color: string;
  }[];
  height?: string;
  showLabels?: boolean;
}

export function ProbabilityBar({
  segments,
  height = 'h-8',
  showLabels = true
}: ProbabilityBarProps) {
  const total = segments.reduce((sum, seg) => sum + seg.value, 0);

  return (
    <div className="space-y-2">
      <div className={cn('relative flex overflow-hidden rounded-lg', height)}>
        {segments.map((segment, index) => {
          const percentage = (segment.value / total) * 100;
          return (
            <motion.div
              key={index}
              initial={{ width: 0 }}
              animate={{ width: `${percentage}%` }}
              transition={{ duration: 0.8, delay: index * 0.1, ease: 'easeOut' }}
              className={cn(
                'relative flex items-center justify-center',
                segment.color,
                index !== segments.length - 1 && 'border-r border-black/20'
              )}
            >
              {showLabels && percentage > 10 && (
                <span className="text-xs font-semibold text-white/90">
                  {segment.value.toFixed(1)}%
                </span>
              )}
            </motion.div>
          );
        })}
      </div>
      {showLabels && (
        <div className="flex justify-between text-xs text-gray-400">
          {segments.map((segment, index) => (
            <div key={index} className="flex items-center gap-1">
              <div className={cn('w-2 h-2 rounded-full', segment.color)} />
              <span>{segment.label}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
