'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { ArrowRight } from 'lucide-react';

interface LeagueCardProps {
  name: string;
  country: string;
  icon: string;
  matchesCount: number;
  onClick?: () => void;
}

export function LeagueCard({ name, country, icon, matchesCount, onClick }: LeagueCardProps) {
  return (
    <GlassCard
      hover
      glow
      onClick={onClick}
      className="p-6 cursor-pointer group"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{icon}</div>
          <div>
            <h3 className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
              {name}
            </h3>
            <p className="text-xs text-gray-400">{country}</p>
          </div>
        </div>
        <motion.div
          whileHover={{ x: 5 }}
          className="text-gray-400 group-hover:text-cyan-400"
        >
          <ArrowRight className="w-5 h-5" />
        </motion.div>
      </div>
      <div className="flex items-center justify-between">
        <Badge variant="secondary" className="bg-white/5 text-gray-300">
          {matchesCount} matches
        </Badge>
      </div>
    </GlassCard>
  );
}
