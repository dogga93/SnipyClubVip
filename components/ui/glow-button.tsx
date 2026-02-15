'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface GlowButtonProps {
  className?: string;
  variant?: 'primary' | 'secondary' | 'ghost';
  children?: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

export function GlowButton({
  className,
  variant = 'primary',
  children,
  onClick,
  disabled,
  type = 'button'
}: GlowButtonProps) {
  const variants = {
    primary:
      'bg-gradient-to-r from-cyan-500 to-purple-500 text-white hover:shadow-lg hover:shadow-cyan-500/50',
    secondary:
      'bg-white/5 border border-white/10 text-gray-200 hover:border-cyan-500/50 hover:shadow-lg hover:shadow-cyan-500/20',
    ghost: 'text-gray-300 hover:bg-white/5 hover:text-cyan-400'
  };

  return (
    <motion.button
      type={type}
      disabled={disabled}
      onClick={onClick}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={cn(
        'px-4 py-2 rounded-lg font-medium text-sm transition-all duration-200',
        'disabled:opacity-50 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
    >
      {children}
    </motion.button>
  );
}
