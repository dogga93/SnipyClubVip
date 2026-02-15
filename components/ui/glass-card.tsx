'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GlassCardProps {
  className?: string;
  hover?: boolean;
  glow?: boolean;
  children?: React.ReactNode;
  onClick?: () => void;
}

export function GlassCard({
  className,
  hover = true,
  glow = false,
  children,
  onClick
}: GlassCardProps) {
  return (
    <motion.div
      whileHover={hover ? { y: -4, scale: 1.01 } : undefined}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className={cn(
        'relative rounded-2xl bg-white/5 backdrop-blur-md border border-white/10',
        'shadow-lg shadow-black/20',
        hover && 'hover:border-cyan-500/30 hover:shadow-cyan-500/10',
        glow && 'after:absolute after:inset-0 after:rounded-2xl after:bg-gradient-to-br after:from-cyan-500/5 after:to-purple-500/5 after:-z-10',
        className
      )}
    >
      {children}
    </motion.div>
  );
}
