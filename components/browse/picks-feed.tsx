'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Crown, Clock } from 'lucide-react';
import { Pick } from '@/lib/supabase';

interface PicksFeedProps {
  picks: (Pick & { match?: any })[];
}

export function PicksFeed({ picks }: PicksFeedProps) {
  return (
    <div className="w-80 h-screen border-l border-white/10 bg-black/20 backdrop-blur-sm">
      <div className="p-4 border-b border-white/10">
        <h2 className="text-lg font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent">
          Live Picks
        </h2>
      </div>
      <ScrollArea className="h-[calc(100vh-80px)]">
        <div className="p-4 space-y-4">
          {picks.map((pick, index) => (
            <motion.div
              key={pick.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <GlassCard className="p-4 space-y-3">
                {pick.is_vip && (
                  <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/30">
                    <Crown className="w-3 h-3 mr-1" />
                    VIP
                  </Badge>
                )}
                <div>
                  <p className="text-sm font-semibold text-white">{pick.user_name}</p>
                  <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {pick.match?.league?.name || 'Match'}
                  </p>
                </div>
                <div className="py-2 px-3 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-sm font-medium text-cyan-400">{pick.pick}</p>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold ${
                    pick.status === 'Won' ? 'text-emerald-400' :
                    pick.status === 'Lost' ? 'text-rose-400' :
                    'text-gray-400'
                  }`}>
                    {pick.status}
                  </span>
                  {pick.progress > 0 && (
                    <div className="flex-1 mx-3">
                      <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pick.progress}%` }}
                          transition={{ duration: 1, delay: index * 0.05 }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-purple-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
