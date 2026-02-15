'use client';

import * as React from 'react';
import Link from 'next/link';
import { GlassCard } from '@/components/ui/glass-card';
import { Search } from 'lucide-react';

type MatchDetailFields = {
  stars?: string;
  signals?: string;
  placedBets?: string;
  otherPredictions?: string;
  realScore?: string;
  moneyline1?: string;
  moneyline2?: string;
  moneylineDraw?: string;
  predictedScore1?: string;
  probability1?: string;
  predictedScore2?: string;
  probability2?: string;
  confidence?: string;
  publicMl1?: string;
  publicMl2?: string;
  publicMlDraw?: string;
  publicSpread1?: string;
  publicSpread2?: string;
  publicTotalOver?: string;
  publicTotalUnder?: string;
  allPublicPct1?: string;
  allPublicTeam1?: string;
  publicRatio1?: string;
  allPublicPct2?: string;
  allPublicTeam2?: string;
  publicRatio2?: string;
  allPublicPctDraw?: string;
  allCashPct1?: string;
  allCashTeam1?: string;
  cashRatio1?: string;
  allCashPct2?: string;
  allCashTeam2?: string;
  cashRatio2?: string;
  allCashPctDraw?: string;
  allCashDraw?: string;
  rawFields?: Record<string, string>;
  sourceFiles?: string[];
};

type ApiMatch = MatchDetailFields & {
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
  sources: string[];
  count: number;
  matches: Array<MatchDetailFields & {
    sport: string;
    league: string;
    game?: string;
    homeTeam?: string;
    awayTeam?: string;
    startTime?: string;
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

const showValue = (value?: string) => (value && value.trim() ? value : '-');
const splitGameTeams = (game?: string) => {
  const value = (game ?? '').trim();
  if (!value) return { homeTeam: '', awayTeam: '' };
  const separators = [' vs ', ' VS ', ' v ', ' - ', ' @ '];
  for (const sep of separators) {
    if (value.includes(sep)) {
      const [home, away] = value.split(sep);
      return {
        homeTeam: (home ?? '').trim(),
        awayTeam: (away ?? '').trim()
      };
    }
  }
  return { homeTeam: value, awayTeam: '' };
};

export default function Home() {
  const [loading, setLoading] = React.useState(true);
  const [selectedSport, setSelectedSport] = React.useState('ALL');
  const [selectedLeague, setSelectedLeague] = React.useState<string | null>(null);
  const [selectedMatch, setSelectedMatch] = React.useState<ApiMatch | null>(null);
  const [matches, setMatches] = React.useState<ApiMatch[]>([]);
  const [searchQuery, setSearchQuery] = React.useState('');
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

        const fallbackResponse = await fetch('/data/game-monitor-all.json', { cache: 'no-store' });
        if (!fallbackResponse.ok) return;
        const fallback = (await fallbackResponse.json()) as FallbackData;
        const nowIso = new Date().toISOString();
        const fallbackMatches: ApiMatch[] = fallback.matches.map((m, index) => {
          const parsed = splitGameTeams(m.game);
          return {
            id: `fallback-${index}`,
            externalRef: null,
            ...m,
            sport: m.sport,
            league: m.league,
            homeTeam: (m.homeTeam || parsed.homeTeam || 'Team 1').trim(),
            awayTeam: (m.awayTeam || parsed.awayTeam || 'Team 2').trim(),
            startTime: m.startTime || nowIso,
            status: m.status || 'Scheduled'
          };
        });
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
    const sportFiltered =
      selectedSport === 'ALL'
        ? dedupedMatches
        : dedupedMatches.filter((m) => m.sport.toUpperCase() === selectedSport);

    if (!searchQuery.trim()) return sportFiltered;
    const query = searchQuery.toLowerCase();
    return sportFiltered.filter(
      (m) =>
        m.league.toLowerCase().includes(query) ||
        m.homeTeam.toLowerCase().includes(query) ||
        m.awayTeam.toLowerCase().includes(query)
    );
  }, [dedupedMatches, selectedSport, searchQuery]);

  React.useEffect(() => {
    setSelectedLeague(null);
  }, [selectedSport]);

  const leagues = React.useMemo(() => {
    const map = new Map<string, number>();
    for (const match of filteredMatches) {
      map.set(match.league, (map.get(match.league) ?? 0) + 1);
    }
    return [...map.entries()]
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ name, count }));
  }, [filteredMatches]);

  const leagueMatches = React.useMemo(() => {
    if (!selectedLeague) return filteredMatches;
    return filteredMatches.filter((m) => m.league === selectedLeague);
  }, [filteredMatches, selectedLeague]);

  const todayMatches = leagueMatches.slice(0, 40);

  const saveManual = () => {
    localStorage.setItem(MANUAL_KEY, JSON.stringify(manual));
    setSaved(true);
    setTimeout(() => setSaved(false), 1200);
  };

  return (
    <main className="flex h-screen overflow-hidden">
      <aside className="w-64 border-r border-white/10 bg-black/20 backdrop-blur-sm">
        <div className="border-b border-white/10 p-4">
          <h2 className="bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-lg font-bold text-transparent">
            Ligues
          </h2>
          <p className="mt-1 text-xs text-gray-500">{leagues.length} ligues</p>
        </div>
        <div className="h-[calc(100vh-80px)] space-y-1 overflow-y-auto p-2">
          {leagues.map((league) => (
            <button
              key={league.name}
              onClick={() => setSelectedLeague((prev) => (prev === league.name ? null : league.name))}
              className={`w-full rounded-lg border px-3 py-2 text-left transition ${
                selectedLeague === league.name
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300'
                  : 'border-transparent text-gray-300 hover:border-cyan-500/30 hover:bg-white/5'
              }`}
            >
              <p className="truncate text-sm font-medium">{league.name}</p>
              <p className="text-xs text-gray-500">{league.count} matchs</p>
            </button>
          ))}
          {leagues.length === 0 && !loading && (
            <p className="px-2 text-sm text-gray-400">Aucune ligue disponible.</p>
          )}
        </div>
      </aside>

      <section className="flex-1 overflow-y-auto">
        <div className="container mx-auto max-w-7xl space-y-6 p-8">
          <div className="space-y-2">
            <h1 className="bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-4xl font-bold text-transparent">
              Sports Analytics Terminal
            </h1>
            <p className="text-gray-400">
              Plateforme de pronostic avec filtrage par sport, ligue et details complets match.
            </p>
          </div>

          <GlassCard className="p-4" hover={false}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Rechercher ligue ou equipe..."
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-2 pl-10 pr-3 text-sm text-white placeholder:text-gray-500"
                />
              </div>
              <div className="flex flex-wrap gap-2">
                {sports.map((sport) => (
                  <button
                    key={sport}
                    onClick={() => setSelectedSport(sport)}
                    className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                      selectedSport === sport
                        ? 'border-cyan-400 bg-cyan-500/15 text-cyan-300'
                        : 'border-white/10 bg-white/5 text-gray-300 hover:bg-white/10'
                    }`}
                  >
                    {sport}
                  </button>
                ))}
              </div>
            </div>
          </GlassCard>

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-12">
            <GlassCard className="xl:col-span-8 p-5" hover={false}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">
                  {selectedLeague ? `Matchs de ${selectedLeague}` : 'Tous les matchs disponibles'}
                </h2>
                <Link href="/matches" className="text-sm text-cyan-300 hover:text-cyan-200">
                  Vue complete
                </Link>
              </div>
              {loading ? (
                <p className="text-sm text-gray-400">Chargement des matchs...</p>
              ) : (
                <div className="space-y-2">
                  {todayMatches.map((match) => (
                    <button
                      key={`${match.id}-${match.startTime}`}
                      onClick={() => setSelectedMatch(match)}
                      className="grid w-full grid-cols-12 items-center rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm hover:border-cyan-400/40 hover:bg-cyan-500/10"
                    >
                      <div className="col-span-3 truncate text-gray-300">{match.league}</div>
                      <div className="col-span-5 text-white">
                        {match.homeTeam} {match.awayTeam ? `vs ${match.awayTeam}` : ''}
                      </div>
                      <div className="col-span-2 text-xs text-gray-300">{fmtDate(match.startTime)}</div>
                      <div className="col-span-2 text-right text-cyan-300">{match.status || '-'}</div>
                    </button>
                  ))}
                  {todayMatches.length === 0 && (
                    <p className="text-sm text-gray-400">Aucun match disponible pour ce filtre.</p>
                  )}
                </div>
              )}
            </GlassCard>

            <GlassCard className="xl:col-span-4 p-5" hover={false}>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">Plaque Match Du Jour</h2>
                <button
                  onClick={saveManual}
                  className="rounded-lg bg-cyan-500/20 px-3 py-1.5 text-sm font-semibold text-cyan-300 hover:bg-cyan-500/30"
                >
                  Enregistrer
                </button>
              </div>
              <div className="grid grid-cols-1 gap-3">
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Sport" value={manual.sport} onChange={(e) => setManual((v) => ({ ...v, sport: e.target.value }))} />
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Ligue" value={manual.league} onChange={(e) => setManual((v) => ({ ...v, league: e.target.value }))} />
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Equipe domicile" value={manual.homeTeam} onChange={(e) => setManual((v) => ({ ...v, homeTeam: e.target.value }))} />
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Equipe exterieur" value={manual.awayTeam} onChange={(e) => setManual((v) => ({ ...v, awayTeam: e.target.value }))} />
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Heure (ex: 20:45)" value={manual.kickOff} onChange={(e) => setManual((v) => ({ ...v, kickOff: e.target.value }))} />
                <input className="rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm" placeholder="Pick + confiance" value={manual.pick} onChange={(e) => setManual((v) => ({ ...v, pick: e.target.value }))} />
              </div>
              <p className="mt-3 text-xs text-gray-400">
                {saved ? 'Sauvegarde locale effectuee.' : 'Formulaire manuel pour le match du jour.'}
              </p>
            </GlassCard>
          </div>
        </div>
      </section>

      {selectedMatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-2xl rounded-xl border border-white/10 bg-[#0f1115] p-5 shadow-2xl">
            <div className="mb-4 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-xl font-bold text-white">
                  {selectedMatch.homeTeam} vs {selectedMatch.awayTeam}
                </h3>
                <p className="text-sm text-gray-400">
                  {selectedMatch.sport} | {selectedMatch.league}
                </p>
              </div>
              <button
                onClick={() => setSelectedMatch(null)}
                className="rounded-md border border-white/10 px-3 py-1 text-sm text-gray-300 hover:bg-white/10"
              >
                Fermer
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Date/Heure</p>
                <p className="mt-1 text-sm text-white">{fmtDate(selectedMatch.startTime)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Statut</p>
                <p className="mt-1 text-sm text-cyan-300">{selectedMatch.status}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Stars</p>
                <p className="mt-1 text-sm text-white">{showValue(selectedMatch.stars)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Equipe Domicile</p>
                <p className="mt-1 text-sm text-white">{selectedMatch.homeTeam}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Equipe Extérieur</p>
                <p className="mt-1 text-sm text-white">{selectedMatch.awayTeam}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Moneyline 1</p>
                <p className="mt-1 text-sm text-white">{showValue(selectedMatch.moneyline1)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Moneyline Draw</p>
                <p className="mt-1 text-sm text-white">{showValue(selectedMatch.moneylineDraw)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Moneyline 2</p>
                <p className="mt-1 text-sm text-white">{showValue(selectedMatch.moneyline2)}</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Prediction Team 1</p>
                <p className="mt-1 text-sm text-white">
                  {showValue(selectedMatch.predictedScore1)} ({showValue(selectedMatch.probability1)}%)
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Prediction Team 2</p>
                <p className="mt-1 text-sm text-white">
                  {showValue(selectedMatch.predictedScore2)} ({showValue(selectedMatch.probability2)}%)
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Confidence</p>
                <p className="mt-1 text-sm text-cyan-300">{showValue(selectedMatch.confidence)}%</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Public ML</p>
                <p className="mt-1 text-sm text-white">
                  1 {showValue(selectedMatch.publicMl1)}% | X {showValue(selectedMatch.publicMlDraw)}% | 2 {showValue(selectedMatch.publicMl2)}%
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Public Spread</p>
                <p className="mt-1 text-sm text-white">
                  T1 {showValue(selectedMatch.publicSpread1)}% | T2 {showValue(selectedMatch.publicSpread2)}%
                </p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Public Total</p>
                <p className="mt-1 text-sm text-white">
                  Over {showValue(selectedMatch.publicTotalOver)}% | Under {showValue(selectedMatch.publicTotalUnder)}%
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">All Public / Ratios</p>
                <p className="mt-1 text-sm text-white">
                  T1 {showValue(selectedMatch.allPublicPct1)}% ({showValue(selectedMatch.publicRatio1)})
                </p>
                <p className="text-sm text-white">
                  T2 {showValue(selectedMatch.allPublicPct2)}% ({showValue(selectedMatch.publicRatio2)})
                </p>
                <p className="text-sm text-white">Draw {showValue(selectedMatch.allPublicPctDraw)}%</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">All Cash / Ratios</p>
                <p className="mt-1 text-sm text-white">
                  T1 {showValue(selectedMatch.allCashPct1)}% ({showValue(selectedMatch.cashRatio1)}) - {showValue(selectedMatch.allCashTeam1)}
                </p>
                <p className="text-sm text-white">
                  T2 {showValue(selectedMatch.allCashPct2)}% ({showValue(selectedMatch.cashRatio2)}) - {showValue(selectedMatch.allCashTeam2)}
                </p>
                <p className="text-sm text-white">
                  Draw {showValue(selectedMatch.allCashPctDraw)}% - {showValue(selectedMatch.allCashDraw)}
                </p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Signals</p>
                <p className="mt-1 text-sm text-white">{showValue(selectedMatch.signals)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Placed Bets</p>
                <p className="mt-1 text-sm text-white">{showValue(selectedMatch.placedBets)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Other Predictions</p>
                <p className="mt-1 text-sm text-white">{showValue(selectedMatch.otherPredictions)}</p>
              </div>
              <div className="rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="text-xs uppercase text-gray-400">Real Score</p>
                <p className="mt-1 text-sm text-white">{showValue(selectedMatch.realScore)}</p>
              </div>
            </div>

            {selectedMatch.rawFields && Object.keys(selectedMatch.rawFields).length > 0 && (
              <div className="mt-4 rounded-lg border border-white/10 bg-white/5 p-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-gray-400">
                  Toutes les colonnes Game Monitor
                </p>
                <p className="mb-2 text-xs text-gray-300">
                  Colonnes detectees: {Object.keys(selectedMatch.rawFields).length}
                </p>
                {selectedMatch.sourceFiles && selectedMatch.sourceFiles.length > 0 && (
                  <div className="mb-2 rounded border border-white/10 bg-white/5 p-2">
                    <p className="text-[11px] uppercase tracking-wide text-gray-400">
                      Sources ({selectedMatch.sourceFiles.length})
                    </p>
                    <ul className="mt-1 space-y-1 text-xs text-gray-300">
                      {selectedMatch.sourceFiles.map((file) => (
                        <li key={file} className="break-all">
                          {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <div className="max-h-64 overflow-auto rounded border border-white/10">
                  <table className="min-w-full text-xs">
                    <tbody>
                      {Object.entries(selectedMatch.rawFields)
                        .sort((a, b) => a[0].localeCompare(b[0]))
                        .map(([key, value]) => (
                          <tr key={key} className="border-b border-white/5">
                            <td className="w-1/2 px-2 py-1 text-gray-300">{key}</td>
                            <td className="px-2 py-1 text-white">{showValue(value)}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
