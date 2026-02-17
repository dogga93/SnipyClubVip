'use client';

import * as React from 'react';
import { useState, useEffect, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Sidebar } from '@/components/layout/sidebar';
import { LeagueCard } from '@/components/browse/league-card';
import { PicksFeed } from '@/components/browse/picks-feed';
import { GlassCard } from '@/components/ui/glass-card';
import { Input } from '@/components/ui/input';
import { GlowButton } from '@/components/ui/glow-button';
import { Search, Calendar } from 'lucide-react';
import { supabase, League, Pick } from '@/lib/supabase';
import type { MonitorMatch, MonitorLeague, MonitorPayload } from '@/lib/monitor/types';

export default function BrowsePage() {
  const [leagues, setLeagues] = useState<League[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [monitorMatches, setMonitorMatches] = useState<MonitorMatch[]>([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState<string>();
  const [searchQuery, setSearchQuery] = useState('');
  const [todayOnly, setTodayOnly] = useState(false);
  const [monitorError, setMonitorError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadMonitor();
    void loadSupabase();
  }, []);

  const todayParis = useMemo(
    () =>
      new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Paris',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      }).format(new Date()),
    []
  );

  async function loadMonitor() {
    try {
      setMonitorError(null);
      const monitorRes = await fetch('/api/monitor/current', { cache: 'no-store' });
      if (!monitorRes.ok) throw new Error(`monitor/current HTTP ${monitorRes.status}`);
      const monitor = (await monitorRes.json()) as MonitorPayload;

      const incomingMatches = Array.isArray(monitor.matches) ? monitor.matches : [];
      const incomingLeagues = Array.isArray(monitor.leagues) ? monitor.leagues : [];
      setMonitorMatches(incomingMatches);

      if (incomingLeagues.length > 0) {
        setLeagues((prev) => {
          const existing = new Set(prev.map((l) => l.name.toLowerCase()));
          const mappedMonitor: League[] = incomingLeagues
            .filter((l: MonitorLeague) => !existing.has(String(l.name || '').toLowerCase()))
            .map((l: MonitorLeague) => ({
              id: String(l.id),
              name: String(l.name),
              country: '',
              icon: String(l.icon || '⚽'),
              sport: 'SOCCER',
              is_active: true,
              matches_count: Number(l.matches_count || 0),
              created_at: new Date().toISOString(),
              updated_at: new Date().toISOString()
            }));

          return mappedMonitor.length ? [...prev, ...mappedMonitor] : prev;
        });
      }
    } catch (error) {
      setMonitorError(error instanceof Error ? error.message : 'monitor failed');
      console.error('[browse] monitor load failed', error);
    }
  }

  async function loadSupabase() {
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

      if (leaguesRes.data) {
        setLeagues((prev) => {
          const existing = new Set(prev.map((l) => l.name.toLowerCase()));
          const supa = (leaguesRes.data as League[]).filter((l) => !existing.has(l.name.toLowerCase()));
          return [...supa, ...prev];
        });
      }
      if (picksRes.data) setPicks(picksRes.data as Pick[]);
    } catch (error) {
      console.error('[browse] supabase load failed', error);
    } finally {
      setLoading(false);
    }
  }

  const selectedLeagueName = useMemo(() => {
    if (!selectedLeagueId) return null;
    const selected = leagues.find((l) => l.id === selectedLeagueId);
    return selected?.name?.toLowerCase() ?? null;
  }, [selectedLeagueId, leagues]);

  const filteredLeagues = leagues.filter((league) =>
    searchQuery
      ? league.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        league.country.toLowerCase().includes(searchQuery.toLowerCase())
      : selectedLeagueId
      ? league.id === selectedLeagueId
      : true
  );

  const filteredMonitorMatches = monitorMatches
    .filter((m) => (todayOnly ? m.date === todayParis : true))
    .filter((m) => (selectedLeagueName ? m.league.toLowerCase() === selectedLeagueName : true))
    .filter((m) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        m.league.toLowerCase().includes(q) ||
        m.homeTeam.toLowerCase().includes(q) ||
        m.awayTeam.toLowerCase().includes(q)
      );
    })
    .slice(0, 24);

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
            <p className="text-gray-400">AI-powered predictions and real-time betting intelligence</p>
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
              <GlowButton
                variant="secondary"
                className="gap-2"
                onClick={() => setTodayOnly((v) => !v)}
              >
                <Calendar className="w-4 h-4" />
                {todayOnly ? `Today ✓ (${todayParis})` : `Today (${todayParis})`}
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
                  <div key={i} className="h-32 rounded-2xl bg-white/5 animate-pulse" />
                ))}
              </div>
            ) : (
              <motion.div
                initial="hidden"
                animate="visible"
                variants={{ visible: { transition: { staggerChildren: 0.05 } } }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {filteredLeagues.map((league) => (
                  <motion.div
                    key={league.id}
                    variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
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

          <GlassCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white">Imported Matches</h3>
              <span className="text-xs text-cyan-300">{filteredMonitorMatches.length} shown</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {monitorError && (
                <div className="text-sm text-rose-300 border border-rose-500/30 rounded-lg p-3">
                  Monitor error: {monitorError}
                </div>
              )}
              {filteredMonitorMatches.map((m) => (
                <div key={m.id} className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div className="text-xs text-cyan-300 mb-1">{m.league}</div>
                  <div className="text-sm text-white font-semibold">
                    {m.homeTeam} vs {m.awayTeam}
                  </div>
                  <div className="text-[11px] text-gray-400 mt-1">{m.date}</div>
                </div>
              ))}
              {filteredMonitorMatches.length === 0 && (
                <div className="text-sm text-gray-400">
                  No imported matches found for this search.
                </div>
              )}
            </div>
          </GlassCard>
        </div>
      </div>

      <PicksFeed picks={picks} />
    </div>
  );
}

