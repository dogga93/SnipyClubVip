'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, TrendingUp } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { supabase, Match } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { formatOdds, calculateEdge } from '@/lib/betting-utils';

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatches();
  }, []);

  async function loadMatches() {
    try {
      const { data } = await supabase
        .from('matches')
        .select(`
          *,
          league:leagues(*),
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*)
        `)
        .order('match_date', { ascending: true })
        .limit(20);

      if (data) setMatches(data as any);
    } catch (error) {
      console.error('Error loading matches:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredMatches = matches.filter((match) =>
    searchQuery
      ? match.home_team?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.away_team?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        match.league?.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true
  );

  return (
    <div className="min-h-screen py-12">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Match Analyzer</h1>
          <p className="text-gray-400">
            Get AI-powered insights on upcoming and live matches
          </p>
        </div>

        <div className="mb-8 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search teams or leagues..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>
          <button className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 transition-colors">
            <Filter className="w-4 h-4" />
            Filters
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-48 rounded-2xl bg-white/5 animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {filteredMatches.map((match, index) => {
              const edge = calculateEdge(match.away_prob, match.away_odds);
              const hasEdge = edge > 2;

              return (
                <motion.div
                  key={match.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <GlassCard
                    onClick={() => router.push(`/match/${match.slug}`)}
                    className="p-6 cursor-pointer"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{match.league?.icon}</span>
                        <span className="text-sm text-gray-400">{match.league?.name}</span>
                      </div>
                      {hasEdge && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20">
                          <TrendingUp className="w-3 h-3 mr-1" />
                          Value
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{match.home_team?.logo || '🏠'}</span>
                          <div>
                            <p className="font-semibold text-white">{match.home_team?.name}</p>
                            <p className="text-xs text-gray-500">Home</p>
                          </div>
                        </div>
                        <div className="text-center px-3 py-1 rounded bg-white/5">
                          <p className="text-xs text-gray-400">Odds</p>
                          <p className="text-sm font-bold text-white">{formatOdds(match.home_odds)}</p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{match.away_team?.logo || '⚽'}</span>
                          <div>
                            <p className="font-semibold text-white">{match.away_team?.name}</p>
                            <p className="text-xs text-gray-500">Away</p>
                          </div>
                        </div>
                        <div className="text-center px-3 py-1 rounded bg-white/5">
                          <p className="text-xs text-gray-400">Odds</p>
                          <p className="text-sm font-bold text-white">{formatOdds(match.away_odds)}</p>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
                      <div className="flex gap-2">
                        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
                          {match.confidence}% Confidence
                        </Badge>
                        <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                          {match.status}
                        </Badge>
                      </div>
                      <span className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                        View Insights →
                      </span>
                    </div>
                  </GlassCard>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
