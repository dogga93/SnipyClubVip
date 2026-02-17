'use client';

import * as React from 'react';
import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Calendar, Search } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { PicksFeed } from '@/components/browse/picks-feed';
import { GlassPanel } from '@/components/ui/glass-panel';
import { SectionHeader } from '@/components/ui/section-header';
import { LeagueItem } from '@/components/ui/league-item';
import { SignalCard } from '@/components/ui/signal-card';
import { MiniBadge } from '@/components/ui/mini-badge';
import { MonitorMatchCard } from '@/components/ui/monitor-match-card';
import { Input } from '@/components/ui/input';
import { supabase, League, Pick } from '@/lib/supabase';
import type { MonitorLeague, MonitorMatch, MonitorPayload } from '@/lib/monitor/types';
import {
  computeSportsStats,
  enrichMonitorMatches,
  mergeMonitorAndSupabaseLeagues,
  parsePercent
} from '@/lib/monitor/merge';

const SPORTS_ORDER = ['SOCCER', 'BASKETBALL', 'HOCKEY', 'TENNIS'] as const;

type LeagueLogos = Record<string, string>;

const formatTodayParis = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Paris',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

export default function BrowsePage() {
  const router = useRouter();

  const [supabaseLeagues, setSupabaseLeagues] = useState<League[]>([]);
  const [mergedLeagues, setMergedLeagues] = useState<League[]>([]);
  const [picks, setPicks] = useState<Pick[]>([]);
  const [monitorMatches, setMonitorMatches] = useState<MonitorMatch[]>([]);
  const [monitorPayload, setMonitorPayload] = useState<MonitorPayload | null>(null);

  const [selectedLeagueId, setSelectedLeagueId] = useState<string>();
  const [searchQuery, setSearchQuery] = useState('');
  const [todayOnly, setTodayOnly] = useState(true);

  const [loadingMonitor, setLoadingMonitor] = useState(true);
  const [loadingSupabase, setLoadingSupabase] = useState(true);
  const [monitorError, setMonitorError] = useState<string | null>(null);

  const [leagueLogos, setLeagueLogos] = useState<LeagueLogos>({});

  const todayParis = useMemo(formatTodayParis, []);

  React.useEffect(() => {
    void loadLogos();
    void loadMonitor();
    void loadSupabase();
  }, []);

  async function loadLogos() {
    try {
      const res = await fetch('/league-logos.json', { cache: 'force-cache' });
      if (!res.ok) return;
      const data = (await res.json()) as LeagueLogos;
      setLeagueLogos(data);
    } catch {
      setLeagueLogos({});
    }
  }

  async function loadMonitor() {
    try {
      setLoadingMonitor(true);
      setMonitorError(null);
      const monitorRes = await fetch('/api/monitor/current', { cache: 'no-store' });
      if (!monitorRes.ok) {
        const text = await monitorRes.text();
        throw new Error(`HTTP ${monitorRes.status}: ${text}`);
      }

      const monitor = (await monitorRes.json()) as MonitorPayload;
      const matches = enrichMonitorMatches(Array.isArray(monitor.matches) ? monitor.matches : []);

      setMonitorPayload(monitor);
      setMonitorMatches(matches);

      setMergedLeagues((prev) => mergeMonitorAndSupabaseLeagues(monitor.leagues ?? [], prev));
    } catch (error) {
      console.error('[browse] monitor load failed', error);
      setMonitorError(error instanceof Error ? error.message : 'Failed to load monitor data');
    } finally {
      setLoadingMonitor(false);
    }
  }

  async function loadSupabase() {
    try {
      setLoadingSupabase(true);

      const [leaguesRes, picksRes] = await Promise.all([
        supabase.from('leagues').select('*').order('matches_count', { ascending: false }),
        supabase
          .from('picks')
          .select(
            `
            *,
            match:matches(
              *,
              league:leagues(*),
              home_team:teams!matches_home_team_id_fkey(*),
              away_team:teams!matches_away_team_id_fkey(*)
            )
          `
          )
          .order('created_at', { ascending: false })
          .limit(10)
      ]);

      const supaLeagues = (leaguesRes.data as League[] | null) ?? [];
      const supaPicks = (picksRes.data as Pick[] | null) ?? [];

      setSupabaseLeagues(supaLeagues);
      setPicks(supaPicks);
      setMergedLeagues((prev) => mergeMonitorAndSupabaseLeagues((monitorPayload?.leagues ?? []) as MonitorLeague[], [...supaLeagues, ...prev]));
    } catch (error) {
      console.error('[browse] supabase load failed', error);
    } finally {
      setLoadingSupabase(false);
    }
  }

  const selectedLeagueName = useMemo(() => {
    if (!selectedLeagueId) return '';
    const selected = mergedLeagues.find((l) => l.id === selectedLeagueId);
    return (selected?.name ?? '').toLowerCase();
  }, [selectedLeagueId, mergedLeagues]);

  const filteredLeagues = useMemo(() => {
    return mergedLeagues
      .filter((league) => (league.matches_count ?? 0) > 0)
      .filter((league) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return league.name.toLowerCase().includes(q) || (league.country || '').toLowerCase().includes(q);
      });
  }, [mergedLeagues, searchQuery]);

  const filteredMonitorMatches = useMemo(() => {
    return monitorMatches
      .filter((match) => Boolean(match.league && match.homeTeam && match.awayTeam))
      .filter((match) => (todayOnly ? match.date === todayParis : true))
      .filter((match) => (selectedLeagueName ? match.league.toLowerCase() === selectedLeagueName : true))
      .filter((match) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();
        return (
          match.league.toLowerCase().includes(q) ||
          match.homeTeam.toLowerCase().includes(q) ||
          match.awayTeam.toLowerCase().includes(q)
        );
      });
  }, [monitorMatches, todayOnly, todayParis, selectedLeagueName, searchQuery]);

  const sportsStats = useMemo(() => {
    const raw = computeSportsStats(filteredMonitorMatches);
    const map = new Map(raw.map((s) => [s.sport, s.count]));
    return SPORTS_ORDER.map((sport) => ({ sport, count: map.get(sport) ?? 0 }));
  }, [filteredMonitorMatches]);

  const trendingLeagues = useMemo(() => filteredLeagues.slice(0, 8), [filteredLeagues]);

  const matchOfDay = filteredMonitorMatches[0] ?? monitorMatches[0] ?? null;

  const pageLoading = loadingMonitor && loadingSupabase;

  return (
    <div className="flex h-[calc(100vh-124px)] overflow-hidden bg-[radial-gradient(circle_at_30%_0%,rgba(16,60,120,0.28),transparent_48%),radial-gradient(circle_at_90%_100%,rgba(8,45,90,0.22),transparent_44%),#040915]">
      <Sidebar
        leagues={filteredLeagues}
        selectedLeagueId={selectedLeagueId}
        onSelectLeague={(id) => setSelectedLeagueId((prev) => (prev === id ? undefined : id))}
      />

      <main className="flex-1 overflow-y-auto px-4 py-4 lg:px-5">
        <div className="mx-auto grid max-w-[1320px] grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
              <GlassPanel className="space-y-3">
                <SectionHeader title="Sports Desk" />
                {sportsStats.map((s) => (
                  <button
                    key={s.sport}
                    className="flex w-full items-center justify-between rounded-xl border border-cyan-500/25 bg-cyan-500/8 px-3 py-2 text-left hover:border-cyan-400/50"
                  >
                    <span className="text-lg font-semibold text-white">
                      {s.sport === 'SOCCER' ? '⚽ Soccer' : s.sport === 'BASKETBALL' ? '🏀 Basketball' : s.sport === 'HOCKEY' ? '🏒 Hockey' : '🎾 Tennis'}
                    </span>
                    <MiniBadge tone="cyan">{s.count}</MiniBadge>
                  </button>
                ))}

                <div className="mt-2 border-t border-cyan-500/20 pt-2">
                  <SectionHeader title="Leagues" right={`${filteredLeagues.length}`} className="mb-2" />
                  <div className="max-h-[360px] space-y-2 overflow-y-auto pr-1">
                    {filteredLeagues.slice(0, 16).map((league) => (
                      <LeagueItem
                        key={league.id}
                        name={league.name}
                        count={league.matches_count}
                        active={selectedLeagueId === league.id}
                        logo={leagueLogos[league.name.toLowerCase()]}
                        onClick={() => setSelectedLeagueId((prev) => (prev === league.id ? undefined : league.id))}
                      />
                    ))}
                  </div>
                </div>
              </GlassPanel>

              <div className="space-y-4">
                <GlassPanel className="space-y-3">
                  <SectionHeader title="Match Du Jour" right={matchOfDay ? '1/2' : '0/2'} />
                  {matchOfDay ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2 text-3xl font-bold text-white">
                        <span>{matchOfDay.homeTeam}</span>
                        <span className="text-cyan-300">vs</span>
                        <span>{matchOfDay.awayTeam}</span>
                        <span className="text-sm font-medium text-slate-300">{matchOfDay.kickOffEt || '06:30 ET'}</span>
                      </div>
                      <p className="text-2xl font-semibold text-emerald-300">PICK: {matchOfDay.homeTeam} ML ✅</p>
                      <p className="text-sm leading-6 text-slate-200">
                        MATCH DU JOUR: {matchOfDay.homeTeam} vs {matchOfDay.awayTeam} ({matchOfDay.league}).
                        Le monitor combine probabilités, signal public/cash et momentum pour proposer un pick prioritaire.
                      </p>
                    </>
                  ) : (
                    <p className="text-sm text-slate-300">Aucun match du jour disponible.</p>
                  )}
                </GlassPanel>

                <GlassPanel className="space-y-3">
                  <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    {sportsStats.map((s) => (
                      <div key={s.sport} className="rounded-2xl border border-cyan-500/30 bg-[linear-gradient(160deg,rgba(20,60,95,0.55),rgba(12,30,58,0.8))] p-3">
                        <p className="text-3xl font-semibold text-white">
                          {s.sport === 'SOCCER' ? 'Soccer' : s.sport === 'BASKETBALL' ? 'Basketball' : s.sport === 'HOCKEY' ? 'Hockey' : 'Tennis'}
                        </p>
                        <p className="mt-2 text-lg text-cyan-200">{s.count} matches</p>
                      </div>
                    ))}
                  </div>

                  <SectionHeader title="Trending Now" />
                  <div className="flex flex-wrap gap-2">
                    {trendingLeagues.map((league) => (
                      <button
                        key={league.id}
                        onClick={() => setSelectedLeagueId((prev) => (prev === league.id ? undefined : league.id))}
                        className="flex items-center gap-2 rounded-full border border-cyan-500/30 bg-slate-900/60 px-3 py-1.5 text-sm text-slate-100 hover:border-cyan-400"
                      >
                        <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-cyan-500/30 bg-slate-950/80">
                          {leagueLogos[league.name.toLowerCase()] ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={leagueLogos[league.name.toLowerCase()]} alt={league.name} className="h-full w-full object-cover" />
                          ) : (
                            '⚽'
                          )}
                        </span>
                        <span>{league.name}</span>
                        <MiniBadge tone="green">{league.matches_count}</MiniBadge>
                      </button>
                    ))}
                  </div>

                  <SectionHeader title="Soccer Leagues" right={`${filteredLeagues.length} leagues`} />
                  <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                    {filteredLeagues.slice(0, 12).map((league) => (
                      <button
                        key={`grid-${league.id}`}
                        onClick={() => setSelectedLeagueId((prev) => (prev === league.id ? undefined : league.id))}
                        className="rounded-xl border border-cyan-500/30 bg-[linear-gradient(145deg,rgba(8,28,58,0.85),rgba(8,22,45,0.9))] p-3 text-left hover:border-cyan-400/50"
                      >
                        <p className="truncate text-lg font-semibold text-white">{league.name}</p>
                        <p className="text-base text-emerald-300">{league.matches_count} matches</p>
                      </button>
                    ))}
                  </div>
                </GlassPanel>
              </div>
            </div>

            <GlassPanel className="space-y-3">
              <div className="grid gap-3 md:grid-cols-3">
                <div className="rounded-xl border border-cyan-500/25 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Active Sport Matches</p>
                  <p className="mt-1 text-4xl font-bold text-cyan-300">{filteredMonitorMatches.length}</p>
                </div>
                <div className="rounded-xl border border-cyan-500/25 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Selected League</p>
                  <p className="mt-1 truncate text-3xl font-semibold text-white">
                    {selectedLeagueName || 'All leagues'}
                  </p>
                </div>
                <div className="rounded-xl border border-cyan-500/25 bg-slate-900/40 p-3">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Upcoming Matches</p>
                  <p className="mt-1 text-4xl font-bold text-emerald-300">{filteredMonitorMatches.length}</p>
                </div>
              </div>

              <SectionHeader title="Filters" />
              <div className="grid gap-2 md:grid-cols-[220px_minmax(0,1fr)_220px]">
                <button
                  onClick={() => setTodayOnly((v) => !v)}
                  className="flex items-center gap-2 rounded-xl border border-cyan-500/30 bg-slate-900/60 px-3 py-2 text-sm text-slate-100"
                >
                  <Calendar className="h-4 w-4 text-cyan-300" />
                  {todayOnly ? todayParis : monitorPayload?.date || todayParis}
                </button>
                <div className="rounded-xl border border-cyan-500/30 bg-slate-900/60 px-3 py-2 text-sm text-cyan-200">
                  {selectedLeagueName || 'All leagues'}
                </div>
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search team or league"
                    className="h-10 border-cyan-500/30 bg-slate-900/70 pl-9 text-sm"
                  />
                </div>
              </div>
            </GlassPanel>

            <div className="space-y-3">
              <SectionHeader title={`${filteredMonitorMatches.length} upcoming matches`} />

              {monitorError ? (
                <GlassPanel>
                  <p className="text-sm text-rose-300">Monitor error: {monitorError}</p>
                </GlassPanel>
              ) : null}

              {pageLoading ? (
                <GlassPanel>
                  <p className="text-sm text-slate-300">Loading matches...</p>
                </GlassPanel>
              ) : (
                <div className="grid gap-3 lg:grid-cols-2">
                  {filteredMonitorMatches.slice(0, 16).map((match) => {
                    const confidence = parsePercent(match.confidence);
                    return (
                      <MonitorMatchCard
                        key={match.id}
                        match={match}
                        confidence={confidence}
                        onClick={() => router.push(`/match/${match.slug ?? match.id}`)}
                      />
                    );
                  })}
                </div>
              )}

              {!pageLoading && filteredMonitorMatches.length === 0 ? (
                <GlassPanel>
                  <p className="text-sm text-slate-300">No imported matches for selected filters.</p>
                </GlassPanel>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <GlassPanel className="space-y-3">
              <SectionHeader title="SNIPY Live Bot" right="LIVE" />
              <SignalCard
                title="SNIPY Live Bot • Soccer"
                tag="GX"
                lines={[
                  'Total Over 0.5 Goals @ 1.350',
                  matchOfDay ? `${matchOfDay.homeTeam} vs ${matchOfDay.awayTeam}` : 'No current signal',
                  'Current score synced from monitor',
                  'Signal pushed in realtime'
                ]}
              />
              <SignalCard
                title="SNIPY Live Bot • Portugal Primeira Liga"
                lines={['Total Over 1.5 Goals @ 1.370', 'Rio Ave vs Braga']}
              />
              <SignalCard
                title="SNIPY Live Bot • Spain Primera Division"
                lines={['Total Over 1.5 Goals @ 1.350', 'Betis vs Atl. Madrid']}
              />
            </GlassPanel>

            <GlassPanel className="space-y-3">
              <SectionHeader title="VIP Picks" right="HOT" />
              {picks.length === 0 ? (
                <p className="text-sm text-slate-300">Aucun pick VIP disponible.</p>
              ) : (
                picks.slice(0, 4).map((pick) => (
                  <SignalCard
                    key={pick.id}
                    title={`${pick.user_name} (${pick.is_vip ? 'VIP' : 'Pick'})`}
                    lines={[pick.pick, pick.match?.league?.name || 'Match', pick.status]}
                  />
                ))
              )}
            </GlassPanel>
          </div>
        </div>
      </main>

      <PicksFeed picks={picks} />
    </div>
  );
}
