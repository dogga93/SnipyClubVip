'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidebarProps {
  leagues: Array<{
    id: string;
    name: string;
    country: string;
    icon: string;
    matches_count: number;
  }>;
  selectedLeagueId?: string;
  onSelectLeague: (leagueId: string) => void;
}

export function Sidebar({ leagues, selectedLeagueId, onSelectLeague }: SidebarProps) {
  return (
    <div className="w-64 h-screen border-r border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Leagues
        </h2>
      </div>
      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-2 space-y-1">
          {leagues.map((league, index) => (
            <motion.button
              key={league.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              onClick={() => onSelectLeague(league.id)}
              className={cn(
                'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left',
                'transition-all duration-200',
                'hover:bg-white/5 hover:border-cyan-500/30',
                selectedLeagueId === league.id
                  ? 'bg-cyan-500/10 border border-cyan-500/50 text-cyan-400'
                  : 'border border-transparent text-gray-300'
              )}
            >
              <span className="text-xl">{league.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{league.name}</p>
                <p className="text-xs text-gray-500">{league.country}</p>
              </div>
              <span className="text-xs font-semibold text-gray-400">
                {league.matches_count}
              </span>
            </motion.button>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
