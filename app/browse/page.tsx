'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/sidebar';
import { LeagueCard } from '@/components/browse/league-card';
import { PicksFeed } from '@/components/browse/picks-feed';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { GlowButton } from '@/components/ui/glow-button';
import { Search, Calendar } from 'lucide-react';
import { supabase, League, Pick } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function BrowsePage() {
  const router = useRouter();
  const [leagues, setLeagues] = useState<League[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>();
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      const [leaguesRes, picksRes] = await Promise.all([
        supabase.from('leagues').select('*').order('matches_count', { ascending: false }),
        supabase
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
          .limit(10)
      ]);

      if (leaguesRes.data) setLeagues(leaguesRes.data);
      if (picksRes.data) setPicks(picksRes.data as any);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  }

  const filteredLeagues = leagues.filter((league) =>
    searchQuery
      ? league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        league.country.toLowerCase().includes(searchQuery.toLowerCase())
      : selectedLeagueId
      ? league.id === selectedLeagueId
      : true
  );

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar
        leagues={leagues}
        selectedLeagueId={selectedLeagueId}
        onSelectLeague={(id) => setSelectedLeagueId(id === selectedLeagueId ? undefined : id)}
      />

      <div className="flex-1 overflow-y-auto">
        <div className="container max-w-7xl mx-auto p-8 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
              Sports Analytics Terminal
            </h1>
            <p className="text-gray-400">
              AI-powered predictions and real-time betting intelligence
            </p>
          </motion.div>

          <GlassCard className="p-6">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  placeholder="Search leagues..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 bg-white/5 border-white/10"
                />
              </div>
              <GlowButton variant="secondary" className="gap-2">
                <Calendar className="w-4 h-4" />
                Today
              </GlowButton>
            </div>
          </GlassCard>

          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-white">
                {selectedLeagueId ? 'Selected League' : 'All Leagues'}
              </h2>
              <div className="flex items-center gap-4 text-sm">
                <div className="px-4 py-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                  <span className="text-gray-400">Active Matches:</span>{' '}
                  <span className="font-bold text-cyan-400">
                    {leagues.reduce((sum, l) => sum + l.matches_count, 0)}
                  </span>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 rounded-2xl bg-white/5 animate-pulse"
                  />
                ))}
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{
                  visible: {
                    transition: {
                      staggerChildren: 0.05
                    }
                  }
                }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredLeagues.map((league) => (
                  <motion.div
                    key={league.id}
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    <LeagueCard
                      name={league.name}
                      country={league.country}
                      icon={league.icon}
                      matchesCount={league.matches_count}
                      onClick={() => setSelectedLeagueId(league.id)}
                    />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <PicksFeed picks={picks} />
    </div>
  );
}
