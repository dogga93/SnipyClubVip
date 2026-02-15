'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Crown, TrendingUp, CheckCircle, XCircle, Clock } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { supabase, Pick } from '@/lib/supabase';

export default function PicksPage() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'vip' | 'active'>('all');

  useEffect(() => {
    loadPicks();
  }, []);

  async function loadPicks() {
    try {
      const { data } = await supabase
        .from('picks')
        .select(`
          *,
          match:matches(
            *,
            league:leagues(*),
            home_team:teams!matches_home_team_id_fkey(*),
            away_team:teams!matches_away_team_id_fkey(*)
          )
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (data) setPicks(data as any);
    } catch (error) {
      console.error('Error loading picks:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredPicks = picks.filter((pick) => {
    if (filter === 'vip') return pick.is_vip;
    if (filter === 'active') return pick.status === 'Pending';
    return true;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Won':
        return <CheckCircle className="w-5 h-5 text-emerald-400" />;
      case 'Lost':
        return <XCircle className="w-5 h-5 text-rose-400" />;
      default:
        return <Clock className="w-5 h-5 text-orange-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Won':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
      case 'Lost':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/20';
      default:
        return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
    }
  };

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Daily AI Picks</h1>
          <p className="text-gray-400">
            Expert predictions and value bets identified by our AI
          </p>
        </div>

        <div className="mb-8 flex gap-3">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === 'all'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            All Picks
          </button>
          <button
            onClick={() => setFilter('vip')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all inline-flex items-center gap-2 ${
              filter === 'vip'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            <Crown className="w-4 h-4" />
            VIP Only
          </button>
          <button
            onClick={() => setFilter('active')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-all ${
              filter === 'active'
                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                : 'bg-white/5 text-gray-400 hover:bg-white/10'
            }`}
          >
            Active
          </button>
        </div>

        {loading ? (
          <div className="space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-40 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {filteredPicks.map((pick, index) => (
              <motion.div
                key={pick.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
              >
                <GlassCard className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      {getStatusIcon(pick.status)}
                      <div>
                        <p className="font-semibold text-white">{pick.user_name}</p>
                        <p className="text-xs text-gray-500">
                          {new Date(pick.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {pick.is_vip && (
                        <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/30">
                          <Crown className="w-3 h-3 mr-1" />
                          VIP
                        </Badge>
                      )}
                      <Badge className={getStatusColor(pick.status)}>
                        {pick.status}
                      </Badge>
                    </div>
                  </div>

                  {pick.match && (
                    <div className="mb-4 p-4 rounded-lg bg-white/5 border border-white/10">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-lg">{pick.match.league?.icon}</span>
                        <span className="text-sm text-gray-400">{pick.match.league?.name}</span>
                      </div>
                      <p className="text-white font-medium">
                        {pick.match.home_team?.name} vs {pick.match.away_team?.name}
                      </p>
                    </div>
                  )}

                  <div className="p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-orange-500/10 border border-purple-500/20 mb-4">
                    <p className="text-sm text-gray-400 mb-1">Pick</p>
                    <p className="text-lg font-bold text-purple-400">{pick.pick}</p>
                    <p className="text-sm text-gray-400 mt-1">Odds: {pick.odds.toFixed(2)}</p>
                  </div>

                  {pick.progress > 0 && pick.status === 'Pending' && (
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-2">
                        <span>Progress</span>
                        <span>{pick.progress}%</span>
                      </div>
                      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pick.progress}%` }}
                          transition={{ duration: 1 }}
                          className="h-full bg-gradient-to-r from-purple-500 to-orange-500"
                        />
                      </div>
                    </div>
                  )}
                </GlassCard>
              </motion.div>
            ))}
          </div>
        )}

        {filteredPicks.length === 0 && !loading && (
          <GlassCard className="p-12 text-center">
            <TrendingUp className="w-12 h-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No picks found for this filter</p>
          </GlassCard>
        )}
      </div>
    </div>
  );
}
