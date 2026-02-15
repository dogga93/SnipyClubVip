import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Match, League, Sport } from "../data/mockData";
import { matches as mockMatches, leagues as mockLeagues, sports as mockSports } from "../data/mockData";
import { loadBundledMonitors, type BundledMonitor } from "../utils/excelImport";
import { applyPublicBetsToMatches } from "../utils/publicBetsImport";
import { preloadTeamLogos } from "../utils/teamLogoApi";
import {
  buildPowerRankingMap,
  findTeamPowerRanking,
  parsePowerRankingText,
  type TeamPowerRanking,
  type TeamPowerRankingMap,
} from "../utils/powerRankings";

type ZCtx = {
  sports: Sport[];
  leagues: League[];
  matches: Match[];
  powerRankingCount: number;
  getTeamPowerRanking: (teamName: string) => TeamPowerRanking | null;
  importPowerRankings: (rawText: string) => { imported: number; skipped: number };
  importPublicBetsText: (rawText: string) => { importedFixtures: number; updatedMatches: number; skippedFixtures: number };
  clearPowerRankings: () => void;
  setAll: (p: { sports: Sport[]; leagues: League[]; matches: Match[] }) => void;
  replaceSportData: (p: { sport: Sport; leagues: League[]; matches: Match[] }) => void;
  reset: () => void;
};

const Ctx = createContext<ZCtx | null>(null);
const STORAGE_KEY = "snipy:zcode-data:v2";
const POWER_RANKINGS_STORAGE_KEY = "snipy:power-rankings-map:v2";
const BUNDLED_POWER_RANKINGS_URL = "/monitors/power-rankings.txt";
const DEFAULT_TEAM_STATUS: TeamPowerRanking = {
  rank: 999999,
  team: "",
  status: "Burning Hot",
  streak: "",
};
const BUNDLED_MONITORS: BundledMonitor[] = [
  { sportId: "soccer", url: "/monitors/Game Monitor SOCCER 2026-02-15 page 1.xlsx" },
  { sportId: "soccer", url: "/monitors/Game Monitor SOCCER 2026-02-15 page 2.xlsx" },
  { sportId: "soccer", url: "/monitors/Game Monitor SOCCER 2026-02-15 page 3.xlsx" },
  { sportId: "soccer", url: "/monitors/predictions_SOCCER-9.xlsx", format: "predictions9" },
  { sportId: "soccer", url: "/monitors/soccerbuddy_SOCCER-10.xlsx", format: "soccerbuddy10" },
  { sportId: "soccer", url: "/monitors/soccerbuddy_SOCCER-11.xlsx", format: "soccerbuddy10" },
  { sportId: "basketball", url: "/monitors/Game Monitor BASKETBALL 2026-02-14 page 1.xlsx" },
  { sportId: "hockey", url: "/monitors/Game Monitor HOCKEY 2026-02-14 page 1.xlsx" },
  { sportId: "basketball", url: "/monitors/Game Monitor NCAAB 2026-02-14 page 1.xlsx" },
  { sportId: "tennis", url: "/monitors/Game Monitor TENNIS 2026-02-14 page 1.xlsx" },
];

const readPersistedData = (): { sports: Sport[]; leagues: League[]; matches: Match[] } | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<{
      sports: Sport[];
      leagues: League[];
      matches: Match[];
    }>;
    if (!Array.isArray(parsed.sports) || !Array.isArray(parsed.leagues) || !Array.isArray(parsed.matches)) {
      return null;
    }
    return {
      sports: parsed.sports,
      leagues: parsed.leagues,
      matches: parsed.matches,
    };
  } catch {
    return null;
  }
};

const normalizeData = (data: { sports: Sport[]; leagues: League[]; matches: Match[] }) => {
  const leagueIdsWithMatches = new Set(data.matches.map((match) => match.leagueId));
  const leagues = data.leagues
    .filter((league) => leagueIdsWithMatches.has(league.id))
    .map((league) => ({
      ...league,
      matchCount: data.matches.filter((match) => match.leagueId === league.id).length,
    }));

  const sportIdsWithLeagues = new Set(leagues.map((league) => league.sportId));
  const sports = data.sports
    .filter((sport) => sportIdsWithLeagues.has(sport.id))
    .map((sport) => ({
      ...sport,
      matchCount: data.matches.filter((match) =>
        leagues.some((league) => league.id === match.leagueId && league.sportId === sport.id)
      ).length,
    }));

  return { sports, leagues, matches: data.matches };
};

const persistData = (data: { sports: Sport[]; leagues: League[]; matches: Match[] }) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors to keep UI functional
  }
};

const readPersistedPowerRankings = (): TeamPowerRankingMap => {
  try {
    const raw = localStorage.getItem(POWER_RANKINGS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as TeamPowerRankingMap;
    if (!parsed || typeof parsed !== "object") return {};
    return parsed;
  } catch {
    return {};
  }
};

const persistPowerRankings = (map: TeamPowerRankingMap) => {
  try {
    localStorage.setItem(POWER_RANKINGS_STORAGE_KEY, JSON.stringify(map));
  } catch {
    // Ignore storage errors to keep UI functional
  }
};

const buildFallbackPowerRankings = (allMatches: Match[]): TeamPowerRankingMap => {
  const byTeam = new Map<
    string,
    {
      confidenceTotal: number;
      trustTotal: number;
      count: number;
    }
  >();

  allMatches.forEach((match) => {
    [match.homeTeam, match.awayTeam].forEach((team) => {
      const current = byTeam.get(team) ?? { confidenceTotal: 0, trustTotal: 0, count: 0 };
      current.confidenceTotal += match.confidence;
      current.trustTotal += match.trust;
      current.count += 1;
      byTeam.set(team, current);
    });
  });

  const ranked = Array.from(byTeam.entries())
    .map(([team, metrics]) => {
      const confidence = metrics.count > 0 ? metrics.confidenceTotal / metrics.count : 0;
      const trust = metrics.count > 0 ? metrics.trustTotal / metrics.count : 0;
      const score = confidence * 0.7 + trust * 0.3;
      return { team, score };
    })
    .sort((a, b) => b.score - a.score);

  const entries: TeamPowerRanking[] = ranked.map((entry, index) => {
    let status = "Average";
    if (entry.score >= 85) status = "Burning Hot";
    else if (entry.score >= 72) status = "Average Up";
    else if (entry.score >= 58) status = "Average";
    else if (entry.score >= 45) status = "Average Down";
    else if (entry.score >= 30) status = "Ice Cold";
    else status = "Dead";

    return {
      rank: index + 1,
      team: entry.team,
      status,
      streak: "",
    };
  });

  return buildPowerRankingMap(entries);
};

export function ZCodeProvider({ children }: { children: React.ReactNode }) {
  const persisted = readPersistedData();
  const [sports, setSports] = useState<Sport[]>(persisted?.sports ?? mockSports);
  const [leagues, setLeagues] = useState<League[]>(persisted?.leagues ?? mockLeagues);
  const [matches, setMatches] = useState<Match[]>(persisted?.matches ?? mockMatches);
  const [powerRankingMap, setPowerRankingMap] = useState<TeamPowerRankingMap>(readPersistedPowerRankings);
  const fallbackPowerRankingMap = useMemo(() => buildFallbackPowerRankings(matches), [matches]);

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      const loaded = await loadBundledMonitors(BUNDLED_MONITORS);
      if (cancelled || loaded.matches.length === 0) return;
      // Hard replace: always use the newest bundled monitors and discard stale cached match data.
      const normalized = normalizeData({
        sports: loaded.sports,
        leagues: loaded.leagues,
        matches: loaded.matches,
      });
      setAll(normalized);
    };

    bootstrap().catch((error) => {
      console.warn("[store] bundled monitor preload failed", error);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const bootstrapPowerRankings = async () => {
      if (Object.keys(powerRankingMap).length > 0) return;
      try {
        const response = await fetch(BUNDLED_POWER_RANKINGS_URL);
        if (!response.ok) return;
        const text = await response.text();
        if (!text.trim()) return;
        const parsed = parsePowerRankingText(text);
        if (cancelled || parsed.imported === 0) return;
        const map = buildPowerRankingMap(parsed.entries);
        setPowerRankingMap(map);
        persistPowerRankings(map);
      } catch {
        // Fallback map will still be used.
      }
    };
    bootstrapPowerRankings();
    return () => {
      cancelled = true;
    };
  }, [powerRankingMap]);

  useEffect(() => {
    const teams = Array.from(
      new Set(
        matches
          .reduce<string[]>((acc, match) => {
            if (match.homeTeam) acc.push(match.homeTeam);
            if (match.awayTeam) acc.push(match.awayTeam);
            return acc;
          }, [])
      )
    );
    preloadTeamLogos(teams).catch(() => {
      // Ignore logo preload failures to keep UI responsive.
    });
  }, [matches]);

  const setAll: ZCtx["setAll"] = (p) => {
    const normalized = normalizeData(p);
    setSports(normalized.sports);
    setLeagues(normalized.leagues);
    setMatches(normalized.matches);
    persistData(normalized);
  };

  const replaceSportData: ZCtx["replaceSportData"] = ({ sport, leagues: nextLeagues, matches: nextMatches }) => {
    const leagueIdsForSport = new Set(
      leagues.filter((league) => league.sportId === sport.id).map((league) => league.id)
    );

    const mergedSports = [...sports.filter((entry) => entry.id !== sport.id), sport];
    const mergedLeagues = [...leagues.filter((entry) => entry.sportId !== sport.id), ...nextLeagues];
    const mergedMatches = [
      ...matches.filter((entry) => !leagueIdsForSport.has(entry.leagueId)),
      ...nextMatches,
    ];

    setAll({ sports: mergedSports, leagues: mergedLeagues, matches: mergedMatches });
  };

  const reset = () => {
    setAll({ sports: mockSports, leagues: mockLeagues, matches: mockMatches });
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Ignore storage errors to keep UI functional
    }
  };

  const importPowerRankings: ZCtx["importPowerRankings"] = (rawText) => {
    const parsed = parsePowerRankingText(rawText);
    const map = buildPowerRankingMap(parsed.entries);
    setPowerRankingMap(map);
    persistPowerRankings(map);
    return { imported: parsed.imported, skipped: parsed.skipped };
  };

  const clearPowerRankings: ZCtx["clearPowerRankings"] = () => {
    setPowerRankingMap({});
    try {
      localStorage.removeItem(POWER_RANKINGS_STORAGE_KEY);
    } catch {
      // Ignore storage errors to keep UI functional
    }
  };

  const getTeamPowerRanking: ZCtx["getTeamPowerRanking"] = (teamName) => {
    const found =
      findTeamPowerRanking(powerRankingMap, teamName) ??
      findTeamPowerRanking(fallbackPowerRankingMap, teamName);

    if (found) return found;

    if (!teamName?.trim()) return null;

    return {
      ...DEFAULT_TEAM_STATUS,
      team: teamName,
    };
  };

  const importPublicBetsText: ZCtx["importPublicBetsText"] = (rawText) => {
    const result = applyPublicBetsToMatches(matches, rawText);
    setAll({ sports, leagues, matches: result.matches });
    try {
      localStorage.setItem("snipy:public-bets-raw", rawText);
      localStorage.setItem("snipy:monitor-raw-text", rawText);
    } catch {
      // Ignore storage errors to keep UI functional
    }
    return {
      importedFixtures: result.fixtures.length,
      updatedMatches: result.updatedMatches,
      skippedFixtures: result.skippedFixtures,
    };
  };

  const value = useMemo(
    () => ({
      sports,
      leagues,
      matches,
      powerRankingCount: Object.keys(powerRankingMap).length || Object.keys(fallbackPowerRankingMap).length,
      getTeamPowerRanking,
      importPowerRankings,
      importPublicBetsText,
      clearPowerRankings,
      setAll,
      replaceSportData,
      reset,
    }),
    [sports, leagues, matches, powerRankingMap, fallbackPowerRankingMap]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useZCode() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useZCode must be used inside ZCodeProvider");
  return ctx;
}
