'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { getEdgeColor } from '@/lib/betting-utils';

export interface EdgeBadgeProps {
  value: number;
  className?: string;
}

export function EdgeBadge({ value, className }: EdgeBadgeProps) {
  const isPositive = value > 0;
  const isHighEdge = Math.abs(value) > 4;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn(
        'inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold',
        'bg-white/5 backdrop-blur-sm border',
        isPositive
          ? 'border-emerald-500/30 bg-emerald-500/10'
          : 'border-rose-500/30 bg-rose-500/10',
        isHighEdge && 'animate-pulse',
        className
      )}
    >
      {isPositive ? (
        <TrendingUp className="w-3 h-3" />
      ) : (
        <TrendingDown className="w-3 h-3" />
      )}
      <span className={getEdgeColor(value)}>
        {value > 0 ? '+' : ''}
        {value.toFixed(1)}% Edge
      </span>
    </motion.div>
  );
}
