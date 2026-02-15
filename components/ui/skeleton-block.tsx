'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface SkeletonBlockProps {
  className?: string;
  count?: number;
}

export function SkeletonBlock({ className, count = 1 }: SkeletonBlockProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className={cn(
            'animate-pulse rounded-lg bg-white/5',
            'before:absolute before:inset-0',
            'before:translate-x-[-100%] before:animate-shimmer',
            'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
            'relative overflow-hidden',
            className
          )}
        />
      ))}
    </>
  );
}

export function LoadingMessage({ message = 'Analyzing match data...' }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12">
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 180, 360]
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="w-12 h-12 rounded-full bg-gradient-to-r from-cyan-500 to-purple-500 opacity-50"
      />
      <p className="text-sm text-gray-400 animate-pulse">{message}</p>
    </div>
  );
}
