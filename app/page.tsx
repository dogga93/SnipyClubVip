'use client';

import * as React from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/glass-card';

type ApiMatch = {
  id: string;
  externalRef: string | null;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: string;
  status: string;
};

type FallbackData = {
  source: string;
  count: number;
  matches: Array<{
    sport: string;
    league: string;
    homeTeam: string;
    awayTeam: string;
    status: string;
  }>;
};

type ManualMatch = {
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  kickOff: string;
  pick: string;
  confidence: string;
};

const MANUAL_KEY = 'snipy:match-of-day';
const PRESET_SPORTS = ['SOCCER', 'BASKETBALL', 'HOCKEY', 'TENNIS'];

const defaultManual: ManualMatch = {
  sport: 'SOCCER',
  league: '',
  homeTeam: '',
  awayTeam: '',
  kickOff: '',
  pick: '',
  confidence: ''
};

const fmtDate = (value: string) =>
  new Date(value).toLocaleString('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  });

export default function Home() {
  const [loading, setLoading] = React.useState(true);
  const [selectedSport, setSelectedSport] = React.useState('ALL');
  const [matches, setMatches] = React.useState<ApiMatch[]>([]);
  const [manual, setManual] = React.useState<ManualMatch>(defaultManual);
  const [saved, setSaved] = React.useState(false);

  React.useEffect(() => {
    const raw = localStorage.getItem(MANUAL_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as ManualMatch;
      setManual({ ...defaultManual, ...parsed });
    } catch {
      setManual(defaultManual);
    }
  }, []);

  React.useEffect(() => {
    const load = async () => {
      try {
        const response = await fetch('/api/matches?limit=500', { cache: 'no-store' });
        if (response.ok) {
          const data = (await response.json()) as { matches?: ApiMatch[] };
          if ((data.matches ?? []).length > 0) {
            setMatches(data.matches ?? []);
            return;
          }
        }

        const fallbackResponse = await fetch('/data/game-monitor-page2.json', { cache: 'no-store' });
        if (!fallbackResponse.ok) return;
        const fallback = (await fallbackResponse.json()) as FallbackData;
        const nowIso = new Date().toISOString();
        const fallbackMatches: ApiMatch[] = fallback.matches.map((m, index) => ({
          id: `fallback-${index}`,
          externalRef: null,
          sport: m.sport,
          league: m.league,
          homeTeam: m.homeTeam,
          awayTeam: m.awayTeam,
          startTime: nowIso,
          status: m.status || 'Scheduled'
        }));
        setMatches(fallbackMatches);
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const dedupedMatches = React.useMemo(() => {
    const map = new Map<string, ApiMatch>();
    for (const match of matches) {
      const key =
        match.externalRef ??
        `${match.sport}|${match.league}|${match.homeTeam}|${match.awayTeam}|${match.startTime.slice(0, 16)}`;
      if (!map.has(key)) map.set(key, match);
    }
    return [...map.values()].sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime));
  }, [matches]);

  const sports = React.useMemo(() => {
    const dbSports = dedupedMatches.map((m) => m.sport.toUpperCase());
    return ['ALL', ...new Set([...PRESET_SPORTS, ...dbSports])];
  }, [dedupedMatches]);

  const filteredMatches = React.useMemo(() => {
    if (selectedSport === 'ALL') return dedupedMatches;
    return dedupedMatches.filter((m) => m.sport.toUpperCase() === selectedSport);
  }, [dedupedMatches, selectedSport]);

  const leagues = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const match of filteredMatches) {
      map.set(match.league, (map.get(match.league) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [filteredMatches]);

  const todayMatches = filteredMatches.slice(0, 20);

  const saveManual = () => {
    localStorage.setItem(MANUAL_KEY, JSON.stringify(manual));
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <main className="min-h-screen py-8">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-wrap gap-2">
          {sports.map((sport) => (
            <button
              key={sport}
              onClick={() => setSelectedSport(sport)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                selectedSport === sport
                  ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                  : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              {sport}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <aside className="lg:col-span-3">
            <GlassCard className="p-4" hover={false}>
              <h2 className="mb-3 text-sm font-bold uppercase tracking-widest text-cyan-300">
                Ligues
              </h2>
              <div className="max-h-[560px] space-y-2 overflow-auto pr-1">
                {leagues.map((league) => (
                  <div
                    key={league.name}
                    className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2"
                  >
                    <span className="text-sm text-gray-200">{league.name}</span>
                    <span className="rounded bg-cyan-500/15 px-2 py-0.5 text-xs text-cyan-300">
                      {league.count}
                    </span>
                  </div>
                ))}
                {leagues.length === 0 && !loading && (
                  <p className="text-sm text-gray-400">Aucune ligue disponible.</p>
                )}
              </div>
            </GlassCard>
          </aside>

          <section className="space-y-6 lg:col-span-9">
            <GlassCard className="p-5" hover={false}>
              <div className="mb-4 flex items-center justify-between">
                <h1 className="text-lg font-bold text-white">Plaque Match Du Jour (manuel)</h1>
                <button
                  onClick={saveManual}
                  className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/30"
                >
                  Enregistrer
                </button>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Sport" value={manual.sport} onChange={(e) => setManual((v) => ({ ...v, sport: e.target.value }))} />
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Ligue" value={manual.league} onChange={(e) => setManual((v) => ({ ...v, league: e.target.value }))} />
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Equipe domicile" value={manual.homeTeam} onChange={(e) => setManual((v) => ({ ...v, homeTeam: e.target.value }))} />
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Equipe extérieur" value={manual.awayTeam} onChange={(e) => setManual((v) => ({ ...v, awayTeam: e.target.value }))} />
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Heure (ex: 20:45)" value={manual.kickOff} onChange={(e) => setManual((v) => ({ ...v, kickOff: e.target.value }))} />
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Pick + confiance" value={manual.pick} onChange={(e) => setManual((v) => ({ ...v, pick: e.target.value }))} />
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {saved ? 'Sauvegardé.' : 'Cette plaque est modifiable manuellement et sauvegardée localement.'}
              </p>
            </GlassCard>

            <GlassCard className="p-5" hover={false}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Matchs Ordonnés (sans doublons)</h2>
                <Link href="/matches" className="text-sm text-cyan-300 hover:text-cyan-200">
                  Vue complète
                </Link>
              </div>

              {loading ? (
                <p className="text-sm text-gray-400">Chargement des matchs...</p>
              ) : (
                <div className="space-y-2">
                  {todayMatches.map((match) => (
                    <div
                      key={`${match.id}-${match.startTime}`}
                      className="grid grid-cols-12 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm"
                    >
                      <div className="col-span-3 text-gray-300">{match.league}</div>
                      <div className="col-span-5 text-white">
                        {match.homeTeam} vs {match.awayTeam}
                      </div>
                      <div className="col-span-2 text-gray-300">{fmtDate(match.startTime)}</div>
                      <div className="col-span-2 text-right text-cyan-300">{match.status}</div>
                    </div>
                  ))}
                  {todayMatches.length === 0 && (
                    <p className="text-sm text-gray-400">Aucun match disponible pour ce sport.</p>
                  )}
                </div>
              )}
            </GlassCard>
          </section>
        </div>
      </div>
    </main>
  );
}
