import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Clock } from "lucide-react";
import SportFileUpload from "../../components/SportFileUpload";
import TeamNameWithLogo from "../../components/TeamNameWithLogo";
import LeagueNameWithLogo from "../../components/LeagueNameWithLogo";
import PowerRankingBadge from "../../components/PowerRankingBadge";
import PublicMoneyGraph from "../../components/PublicMoneyGraph";
import LayoutShell from "../../components/layout/LayoutShell";
import LeftMiniRail from "../../components/layout/LeftMiniRail";
import LeagueListSidebar from "../../components/layout/LeagueListSidebar";
import BrowseCenter from "../../components/layout/BrowseCenter";
import { useZCode } from "../../store/zcodeStore";
import {
  parseLiveBotWorkbook,
  parseSportWorkbook,
  type LiveBotSignalImport,
  type SupportedSportId,
} from "../../utils/excelImport";
import { flipMatchSides } from "../../utils/matchSide";
import {
  fetchLiveScoreDetailMap,
  resolveLiveScoreDetail,
  upsertScoreDetailMap,
  type LiveScoreDetailMap,
} from "../../utils/liveScoreApi";

const SUPPORTED_SPORT_IDS: SupportedSportId[] = [
  "soccer",
  "basketball",
  "tennis",
  "hockey",
  "baseball",
  "football",
];

type HomePick = {
  id: string;
  date: string;
  league: string;
  match: string;
  pick: string;
  odd: string;
  note: string;
};

const PICKS_STORAGE_KEY = "snipy:manual-picks";
const LIVE_BOT_STORAGE_KEY = "snipy:live-bot-signals";
const LIVEBETS_BUNDLED_URL = "/monitors/livebetsSOCCER-2026-2-15.xlsx";

type LiveSignal = {
  id: string;
  createdAt: string;
  league: string;
  match: string;
  bet: string;
  odd: string;
  note: string;
  active: boolean;
};

type LiveApiMatch = {
  id: string;
  homeTeam: string;
  awayTeam: string;
  liveScore: string;
  status?: string;
  phase?: "live" | "final" | "unknown";
  league?: string;
  kickoff?: string;
};

const MANUAL_LIVE_BOT_SIGNALS: LiveSignal[] = [
  {
    id: "manual-live-2026-02-15-0810-cet",
    createdAt: "2026-02-15T08:10:00+01:00",
    league: "Soccer. Japan J-League",
    match: "C-Osaka - Avispa Fukuoka",
    bet: "Regular time Total Over 2.5",
    odd: "1.35",
    note: "Current Score: 2-0 | Bet 100 USD | Payout 135 USD",
    active: true,
  },
  {
    id: "manual-live-2026-02-15-0805-cet-win",
    createdAt: "2026-02-15T08:05:00+01:00",
    league: "Table Tennis Pro League",
    match: "Aleksei Mikhailov - Mikhail Chernyavskiy",
    bet: "Regular time 1x2. Bet on Mikhail Chernyavskiy",
    odd: "1.545",
    note: "BOOM! Cashed! Bet won | Payout 155 USD ✅✅✅",
    active: true,
  },
  {
    id: "manual-live-2026-02-15-0742-cet",
    createdAt: "2026-02-15T07:42:00+01:00",
    league: "Table Tennis Pro League",
    match: "Aleksei Mikhailov - Mikhail Chernyavskiy",
    bet: "Regular time 1x2. Bet on Mikhail Chernyavskiy",
    odd: "1.545",
    note: "Current Score: 13-17 | Bet 100 USD | Payout 155 USD",
    active: true,
  },
  {
    id: "manual-live-2026-02-15-0617-cet",
    createdAt: "2026-02-15T06:17:00+01:00",
    league: "Soccer. Japan J-League",
    match: "Kawasaki Frontale - Chiba",
    bet: "Regular time Total Over 0.5",
    odd: "1.362",
    note: "Current Score: 0-0 | Bet 100 USD | Payout 136 USD",
    active: true,
  },
];

const readHomePicks = (): HomePick[] => {
  try {
    const raw = localStorage.getItem(PICKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => ({
        id: String(entry.id ?? ""),
        date: String(entry.date ?? ""),
        league: String(entry.league ?? ""),
        match: String(entry.match ?? ""),
        pick: String(entry.pick ?? ""),
        odd: String(entry.odd ?? ""),
        note: String(entry.note ?? ""),
      }))
      .filter((entry) => entry.id && entry.pick);
  } catch {
    return [];
  }
};

const readLiveSignals = (): LiveSignal[] => {
  try {
    const raw = localStorage.getItem(LIVE_BOT_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((entry) => ({
        id: String(entry.id ?? ""),
        createdAt: String(entry.createdAt ?? ""),
        league: String(entry.league ?? ""),
        match: String(entry.match ?? ""),
        bet: String(entry.bet ?? ""),
        odd: String(entry.odd ?? ""),
        note: String(entry.note ?? ""),
        active: Boolean(entry.active),
      }))
      .filter((entry) => entry.id && (entry.bet || entry.note || entry.match));
  } catch {
    return [];
  }
};

const toEpoch = (value: string) => {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
};

const pickRecency = (entry: HomePick) => {
  const dateMs = toEpoch(entry.date);
  const idMsMatch = entry.id.match(/^(\d{10,13})/);
  const idMs = idMsMatch ? Number(idMsMatch[1]) : 0;
  return Math.max(dateMs, Number.isFinite(idMs) ? idMs : 0);
};

const isSupportedSportId = (sportId: string): sportId is SupportedSportId =>
  SUPPORTED_SPORT_IDS.includes(sportId as SupportedSportId);

const getTodayDateKey = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const remapTotalsTeamText = (value: string) =>
  value
    .replace(/TOTAL\s*Team\s*1/gi, "TOTAL Away team")
    .replace(/TOTAL\s*Team\s*2/gi, "TOTAL Home team");

const COMMENT_LABEL_REGEX = /(comment|trend|insight|signal|analysis)/i;
const COMMENT_VALUE_REGEX =
  /(we are|last\s+\d+|predicting|total over|total under|over\s*\d+(\.\d+)?|under\s*\d+(\.\d+)?)/i;

const extractMatchComments = (
  monitorDetails?: Array<{ label: string; value: string }>,
  signals?: string[]
) => {
  const fromSignals = (signals ?? []).map((entry) => String(entry ?? ""));
  const fromDetails = (monitorDetails ?? [])
    .filter(
      (detail) =>
        COMMENT_LABEL_REGEX.test(detail.label || "") || COMMENT_VALUE_REGEX.test(detail.value || "")
    )
    .map((detail) => String(detail.value ?? ""));

  const merged = [...fromSignals, ...fromDetails]
    .map((entry) => remapTotalsTeamText(entry).replace(/\s+/g, " ").trim())
    .filter((entry) => entry.length > 0)
    .filter((entry) => COMMENT_VALUE_REGEX.test(entry) || entry.length >= 28);

  return Array.from(new Set(merged));
};

const extractScoreFromText = (value: string) => {
  const match = String(value || "").match(/(\d+)\s*[-:]\s*(\d+)/);
  return match ? `${match[1]}-${match[2]}` : null;
};

const parseTeamsFromMatchLabel = (match: string) => {
  const text = String(match || "").trim();
  if (!text) return null;
  const parts = text.split(/\s+vs\s+|\s+-\s+/i).map((entry) => entry.trim()).filter(Boolean);
  if (parts.length < 2) return null;
  return { home: parts[0], away: parts[1] };
};

const normalizeLeagueName = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const leaguePriority = (name: string, country?: string) => {
  const n = normalizeLeagueName(name);
  const c = normalizeLeagueName(country || "");

  // Requested order:
  // Requested order:
  // 1) England Premier League
  // 2) France Ligue 1
  // 3) Italy Serie A
  // 4) Spain La Liga
  // 5) Germany Bundesliga
  // 6) Portugal Primeira Liga (Liga Betclic)
  // 7) Belgium Pro League
  // 8) Turkey Super Lig
  // 9) Greece Super League
  const has = (value: string) => n.includes(value) || c.includes(value);

  if (n.includes("premier league") && (has("england") || has("english"))) return 0;
  if (n.includes("ligue 1") && has("france")) return 1;
  if (n.includes("serie a") && has("italy")) return 2;
  if ((n.includes("la liga") || n.includes("primera division")) && has("spain")) return 3;
  if (n.includes("bundesliga") && has("germany")) return 4;
  if ((n.includes("primeira liga") || n.includes("liga betclic")) && has("portugal")) return 5;
  if ((n.includes("pro league") || n.includes("jupiler")) && has("belgium")) return 6;
  if (n.includes("super lig") && (has("turkey") || has("turkiye"))) return 7;
  if (n.includes("super league") && has("greece")) return 8;

  // Then other popular leagues.
  if (n.includes("champions league")) return 9;
  if (n.includes("europa league")) return 10;
  if (n.includes("championship") && c.includes("england")) return 11;

  return 99;
};

export default function BrowsePage() {
  const {
    sports,
    leagues,
    matches,
    replaceSportData,
    getTeamPowerRanking,
    importPowerRankings,
    importPublicBetsText,
    clearPowerRankings,
    powerRankingCount,
  } = useZCode();
  const showImport = import.meta.env.VITE_ADMIN_IMPORT === "true";
  const [selectedSport, setSelectedSport] = useState<string>("soccer");
  const [selectedLeague, setSelectedLeague] = useState<string>("epl");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>(getTodayDateKey);
  const [powerRankingText, setPowerRankingText] = useState<string>("");
  const [powerRankingStatus, setPowerRankingStatus] = useState<string>("");
  const [publicBetsText, setPublicBetsText] = useState<string>("");
  const [publicBetsStatus, setPublicBetsStatus] = useState<string>("");
  const [homePicks, setHomePicks] = useState<HomePick[]>([]);
  const [liveSignals, setLiveSignals] = useState<LiveSignal[]>([]);
  const [liveScoreMap, setLiveScoreMap] = useState<LiveScoreDetailMap>({});
  const [liveApiMatches, setLiveApiMatches] = useState<LiveApiMatch[]>([]);
  const navigate = useNavigate();

  const toDateKey = (value: string) => {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    const year = date.getFullYear();
    const month = `${date.getMonth() + 1}`.padStart(2, "0");
    const day = `${date.getDate()}`.padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const handleUpload = useCallback(
    async (sportId: SupportedSportId, file: File) => {
      const parsed = await parseSportWorkbook(file, sportId);
      replaceSportData(parsed);
      setSelectedSport(sportId);
      if (parsed.leagues.length > 0) {
        setSelectedLeague(parsed.leagues[0].id);
      }
    },
    [replaceSportData]
  );

  useEffect(() => {
    if (!sports.some((sport) => sport.id === selectedSport) && sports[0]) {
      setSelectedSport(sports[0].id);
    }
  }, [selectedSport, sports]);

  useEffect(() => {
    const leagueExists = leagues.some(
      (league) => league.id === selectedLeague && league.sportId === selectedSport
    );

    if (!leagueExists) {
      const firstLeague = leagues.find((league) => league.sportId === selectedSport);
      if (firstLeague) setSelectedLeague(firstLeague.id);
    }
  }, [selectedSport, selectedLeague, leagues]);

  useEffect(() => {
    const syncPicks = () => {
      setHomePicks(readHomePicks());
      setLiveSignals(readLiveSignals());
    };
    syncPicks();
    window.addEventListener("storage", syncPicks);
    const interval = window.setInterval(syncPicks, 2000);
    return () => {
      window.removeEventListener("storage", syncPicks);
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const bootstrapLiveSignals = async () => {
      try {
        const current = readLiveSignals();
        if (current.length > 0) return;

        const response = await fetch(LIVEBETS_BUNDLED_URL);
        if (!response.ok) return;
        const blob = await response.blob();
        const file = new File([blob], "livebetsSOCCER-2026-2-15.xlsx", { type: blob.type });
        const parsed = await parseLiveBotWorkbook(file);
        if (cancelled || parsed.signals.length === 0) return;

        const nextSignals = parsed.signals.map((entry: LiveBotSignalImport) => ({ ...entry }));
        localStorage.setItem(LIVE_BOT_STORAGE_KEY, JSON.stringify(nextSignals));
        setLiveSignals(nextSignals);
      } catch {
        // keep silent; widget has fallback message
      }
    };

    bootstrapLiveSignals();
    return () => {
      cancelled = true;
    };
  }, []);

  const mergeDetailMaps = (base: LiveScoreDetailMap, incoming: LiveScoreDetailMap) => {
    const out: LiveScoreDetailMap = { ...base };
    Object.entries(incoming).forEach(([key, value]) => {
      const prev = out[key];
      if (!prev) {
        out[key] = value;
        return;
      }
      if (value.phase === "live" && prev.phase !== "live") {
        out[key] = value;
      }
    });
    return out;
  };

  useEffect(() => {
    let cancelled = false;

    const loadLiveScores = async () => {
      const activeDate = selectedDate || getTodayDateKey();
      const todayDate = getTodayDateKey();
      try {
        const baseMap = await fetchLiveScoreDetailMap("soccer", activeDate);
        const todayMap = activeDate === todayDate ? {} : await fetchLiveScoreDetailMap("soccer", todayDate);
        const mergedMap = mergeDetailMaps(baseMap, todayMap);
        if (!cancelled) setLiveScoreMap(mergedMap);
      } catch {
        if (!cancelled) setLiveScoreMap((prev) => prev);
      }

      try {
        const paramsActive = new URLSearchParams({
          sport: "soccer",
          date: activeDate,
        });
        const responseActive = await fetch(`/api/live-scores?${paramsActive.toString()}`);
        const paramsToday = new URLSearchParams({ sport: "soccer", date: todayDate });
        const responseToday = activeDate === todayDate ? null : await fetch(`/api/live-scores?${paramsToday.toString()}`);
        if (!responseActive.ok) return;
        const payloadActive = await responseActive.json();
        const rowsActive = Array.isArray(payloadActive?.matches) ? payloadActive.matches : [];
        let rowsToday: LiveApiMatch[] = [];
        if (responseToday?.ok) {
          const payloadToday = await responseToday.json();
          rowsToday = Array.isArray(payloadToday?.matches) ? payloadToday.matches : [];
        }
        const allRows = [...rowsActive, ...rowsToday];
        const seen = new Set<string>();
        const mergedRows = allRows.filter((row: LiveApiMatch) => {
          const key = `${String(row.homeTeam || "").toLowerCase()}|${String(row.awayTeam || "").toLowerCase()}|${String(row.liveScore || "")}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
        if (!cancelled) {
          setLiveApiMatches(
            mergedRows
              .map((row: LiveApiMatch) => ({
                id: String(row.id || `${row.homeTeam}-${row.awayTeam}`),
                homeTeam: String(row.homeTeam || "").trim(),
                awayTeam: String(row.awayTeam || "").trim(),
                liveScore: String(row.liveScore || "").trim(),
                status: String(row.status || "").trim(),
                phase: row.phase,
                league: String(row.league || "").trim(),
                kickoff: String(row.kickoff || "").trim(),
              }))
              .filter((row: LiveApiMatch) => row.homeTeam && row.awayTeam && row.liveScore)
          );
        }
      } catch {
        if (!cancelled) setLiveApiMatches((prev) => prev);
      }
    };

    loadLiveScores();
    const timer = window.setInterval(loadLiveScores, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [selectedDate]);

  const liveBotSignals = useMemo(() => {
    const mergedSignals = [...liveSignals, ...MANUAL_LIVE_BOT_SIGNALS];

    if (mergedSignals.length > 0) {
      return mergedSignals
        .sort((a, b) => toEpoch(b.createdAt) - toEpoch(a.createdAt))
        .slice(0, 5)
        .map((entry) => ({
          id: entry.id,
          createdAt: entry.createdAt,
          league: entry.league || "SNIPY Live Bot",
          pick: entry.bet || "Live signal",
          odd: entry.odd || "-",
          match: entry.match || "-",
          note: entry.note || "Active",
        }));
    }

    const fallback = homePicks
      .filter((entry) => /live/i.test(entry.league) || /live/i.test(entry.note))
      .sort((a, b) => (a.date < b.date ? 1 : -1))
      .slice(0, 5)
      .map((entry) => ({
        id: entry.id,
        createdAt: entry.date,
        league: entry.league || "LIVE SNIPY",
        pick: entry.pick,
        odd: entry.odd || "-",
        match: entry.match || "-",
        note: entry.note || "LIVE",
      }));

    return fallback;
  }, [homePicks, liveSignals]);

  const latestLiveBotSignal = useMemo(
    () => (liveBotSignals.length > 0 ? liveBotSignals[0] : null),
    [liveBotSignals]
  );
  const recentLiveBotSignals = useMemo(() => liveBotSignals.slice(1, 5), [liveBotSignals]);
  const liveSignalScoreMap = useMemo(() => {
    const map: LiveScoreDetailMap = {};
    const merged = [...liveSignals, ...MANUAL_LIVE_BOT_SIGNALS];
    merged.forEach((entry) => {
      const teams = parseTeamsFromMatchLabel(entry.match);
      if (!teams) return;
      const score = extractScoreFromText(entry.note);
      if (!score) return;
      upsertScoreDetailMap(map, teams.home, teams.away, {
        score,
        phase: "live",
        status: "LIVE",
      });
    });
    return map;
  }, [liveSignals]);
  const liveOnlyApiMatches = useMemo(
    () =>
      liveApiMatches
        .filter((match) => {
          const phase = String(match.phase || "").toLowerCase();
          const status = String(match.status || "").toLowerCase();
          return phase === "live" || status.includes("live") || status.includes("1h") || status.includes("2h") || status.includes("ht");
        })
        .slice(0, 24),
    [liveApiMatches]
  );

  const vipLatestPicks = useMemo(() => {
    const source = homePicks.length > 0 ? homePicks : [];
    return source
      .filter((entry) => !(/live/i.test(entry.league) || /live/i.test(entry.note)))
      .sort((a, b) => pickRecency(b) - pickRecency(a))
      .slice(0, 5);
  }, [homePicks]);

  const filteredLeagues = useMemo(
    () =>
      leagues
        .filter((league) => league.sportId === selectedSport)
        .sort((a, b) => {
          const pa = leaguePriority(a.name, a.country);
          const pb = leaguePriority(b.name, b.country);
          if (pa !== pb) return pa - pb;
          if (b.matchCount !== a.matchCount) return b.matchCount - a.matchCount;
          return a.name.localeCompare(b.name);
        }),
    [leagues, selectedSport]
  );

  const filteredMatches = useMemo(() => {
    const leagueMatches = matches.filter((match) => match.leagueId === selectedLeague);
    const q = searchQuery.trim().toLowerCase();
    const activeDate = selectedDate || getTodayDateKey();
    const dateFilteredLeagueMatches = leagueMatches.filter((match) => toDateKey(match.kickoff) === activeDate);
    if (!q) return dateFilteredLeagueMatches;

    const sportLeagueIds = new Set(
      leagues.filter((league) => league.sportId === selectedSport).map((league) => league.id)
    );
    const sportMatches = matches.filter((match) => sportLeagueIds.has(match.leagueId));

    const dateFilteredSportMatches = sportMatches.filter((match) => toDateKey(match.kickoff) === activeDate);

    return dateFilteredSportMatches.filter((match) => {
      const leagueName = leagues.find((league) => league.id === match.leagueId)?.name ?? "";
      return (
        match.homeTeam.toLowerCase().includes(q) ||
        match.awayTeam.toLowerCase().includes(q) ||
        leagueName.toLowerCase().includes(q)
      );
    });
  }, [matches, selectedLeague, searchQuery, leagues, selectedSport, selectedDate]);

  const selectedLeagueData = useMemo(
    () => leagues.find((league) => league.id === selectedLeague),
    [leagues, selectedLeague]
  );
  const activeSport = useMemo(
    () => sports.find((sport) => sport.id === selectedSport) ?? sports[0],
    [sports, selectedSport]
  );
  const selectedSportMatchCount = useMemo(() => {
    const sportLeagueIds = new Set(
      leagues.filter((league) => league.sportId === selectedSport).map((league) => league.id)
    );
    return matches.filter((match) => sportLeagueIds.has(match.leagueId)).length;
  }, [leagues, matches, selectedSport]);
  const leagueShowcase = useMemo(
    () => [...filteredLeagues].sort((a, b) => b.matchCount - a.matchCount).slice(0, 12),
    [filteredLeagues]
  );

  const formatKickoff = (kickoff: string) => {
    const date = new Date(kickoff);
    const now = new Date();
    const diff = date.getTime() - now.getTime();

    if (diff <= 0) return "Started / Ended";

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    if (hours < 24) return `${hours}h ${minutes}m`;

    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const handlePowerRankingImport = () => {
    if (!powerRankingText.trim()) return;
    const result = importPowerRankings(powerRankingText);
    setPowerRankingStatus(`Power rankings imported: ${result.imported}, skipped: ${result.skipped}.`);
  };

  const handlePowerRankingClear = () => {
    clearPowerRankings();
    setPowerRankingText("");
    setPowerRankingStatus("Power rankings cleared.");
  };

  const handlePublicBetsImport = () => {
    if (!publicBetsText.trim()) return;
    const result = importPublicBetsText(publicBetsText);
    setPublicBetsStatus(
      `Public bets imported: fixtures ${result.importedFixtures}, updated matches ${result.updatedMatches}, skipped ${result.skippedFixtures}.`
    );
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
        <LayoutShell
          leftMini={<LeftMiniRail />}
          contentClassName="grid items-start gap-4 lg:gap-5 xl:grid-cols-[240px_minmax(0,1fr)_320px]"
        >
          <LeagueListSidebar className="rounded-2xl web3-panel p-4 h-fit xl:sticky xl:top-24 web3-glow max-h-[calc(100vh-7rem)] overflow-y-auto">
            <div className="text-xs uppercase tracking-wide text-cyan-300/80 mb-3">Sports</div>
            <div className="space-y-2">
              {sports.map((sport) => (
                <button
                  type="button"
                  key={sport.id}
                  onClick={() => setSelectedSport(sport.id)}
                  className={`w-full rounded-xl border px-3 py-2 text-left transition-all ${
                    selectedSport === sport.id
                      ? "border-cyan-400/60 bg-cyan-500/20 text-white"
                      : "border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold">
                      {sport.icon} {sport.name}
                    </span>
                    <span className="text-xs text-gray-400">{sport.matchCount}</span>
                  </div>
                  {showImport && isSupportedSportId(sport.id) && selectedSport === sport.id && (
                    <div className="mt-2" onClick={(event) => event.stopPropagation()}>
                      <SportFileUpload sport={sport} onUpload={handleUpload} />
                    </div>
                  )}
                </button>
              ))}
            </div>

            <div className="mt-5 border-t border-white/10 pt-4">
              <div className="mb-2 text-xs uppercase tracking-wide text-cyan-300/80">Leagues</div>
              <div className="max-h-[55vh] space-y-1.5 overflow-y-auto pr-1">
                {filteredLeagues.map((league) => (
                  <button
                    key={league.id}
                    onClick={() => setSelectedLeague(league.id)}
                    className={`w-full rounded-lg px-3 py-1.5 text-left transition-all ${
                      selectedLeague === league.id
                        ? "bg-gradient-to-r from-cyan-500/25 to-blue-500/25 text-white"
                        : "text-gray-300 hover:bg-white/10"
                    }`}
                  >
                    <LeagueNameWithLogo
                      leagueName={league.name}
                      country={league.country}
                      flag={league.flag}
                      logoSizeClassName="w-6 h-6"
                    />
                  </button>
                ))}
              </div>
            </div>

            {showImport && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="mb-2 text-xs uppercase tracking-wide text-cyan-300/80">Power Rankings</div>
                <div className="mb-2 text-[11px] text-gray-400">Mapped teams: {powerRankingCount}</div>
                <textarea
                  value={powerRankingText}
                  onChange={(event) => setPowerRankingText(event.target.value)}
                  placeholder="Paste Power Rankings text here..."
                  rows={6}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder:text-gray-500"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handlePowerRankingImport}
                    className="flex-1 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-2 py-1.5 text-xs font-semibold text-cyan-200"
                  >
                    Import
                  </button>
                  <button
                    type="button"
                    onClick={handlePowerRankingClear}
                    className="flex-1 rounded-lg border border-rose-400/40 bg-rose-500/10 px-2 py-1.5 text-xs font-semibold text-rose-200"
                  >
                    Clear
                  </button>
                </div>
                {powerRankingStatus && <div className="mt-2 text-[11px] text-emerald-300">{powerRankingStatus}</div>}
              </div>
            )}

            {showImport && (
              <div className="mt-5 border-t border-white/10 pt-4">
                <div className="mb-2 text-xs uppercase tracking-wide text-cyan-300/80">Public Bets</div>
                <textarea
                  value={publicBetsText}
                  onChange={(event) => setPublicBetsText(event.target.value)}
                  placeholder="Paste public bets text here..."
                  rows={6}
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-2.5 py-2 text-xs text-white placeholder:text-gray-500"
                />
                <div className="mt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={handlePublicBetsImport}
                    className="flex-1 rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-2 py-1.5 text-xs font-semibold text-emerald-200"
                  >
                    Import Public
                  </button>
                </div>
                {publicBetsStatus && <div className="mt-2 text-[11px] text-emerald-300">{publicBetsStatus}</div>}
              </div>
            )}
          </LeagueListSidebar>

          <BrowseCenter className="min-w-0">
            <div className="mb-4 rounded-2xl web3-panel p-4">
              <div className="mb-3 text-xs uppercase tracking-wide text-cyan-300/80">Sports & Leagues</div>
              <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
                {sports.map((sport) => (
                  <button
                    type="button"
                    key={`hero-sport-${sport.id}`}
                    onClick={() => setSelectedSport(sport.id)}
                    className={`rounded-xl border p-3 text-left transition-all ${
                      selectedSport === sport.id
                        ? "border-emerald-400/60 bg-emerald-500/15"
                        : "border-white/10 bg-white/5 hover:border-cyan-400/45"
                    }`}
                  >
                    <div className="text-base font-black text-white">{sport.icon} {sport.name}</div>
                    <div className="text-sm font-bold text-emerald-300">{sport.matchCount} matches</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 rounded-2xl web3-panel p-4">
              <div className="mb-3 flex items-center justify-between">
                <div className="text-xs uppercase tracking-wide text-cyan-300/80">Leagues</div>
                <div className="text-sm text-gray-400">{filteredLeagues.length} leagues</div>
              </div>
              <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
                {leagueShowcase.map((league) => (
                  <button
                    type="button"
                    key={`grid-${league.id}`}
                    onClick={() => setSelectedLeague(league.id)}
                    className={`flex h-[94px] flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                      selectedLeague === league.id
                        ? "border-emerald-400/55 bg-emerald-500/10"
                        : "border-white/15 bg-white/5 hover:border-cyan-300/40"
                    }`}
                  >
                    <LeagueNameWithLogo
                      leagueName={league.name}
                      country={league.country}
                      flag={league.flag}
                      textClassName="truncate text-base font-black text-white"
                      logoSizeClassName="w-8 h-8"
                    />
                    <div className="text-base font-bold text-emerald-300">{league.matchCount} matches</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-3">
              <div className="rounded-xl web3-card p-4">
                <div className="text-sm text-gray-400">Active Sport Matches</div>
                <div className="text-3xl font-black text-white vivid-text">{selectedSportMatchCount}</div>
              </div>
              <div className="rounded-xl web3-card p-4">
                <div className="text-sm text-gray-400">Selected League</div>
                <div className="text-2xl font-black text-cyan-200">
                  <LeagueNameWithLogo
                    leagueName={selectedLeagueData?.name ?? "League"}
                    country={selectedLeagueData?.country}
                    flag={selectedLeagueData?.flag}
                    logoSizeClassName="w-6 h-6"
                  />
                </div>
              </div>
              <div className="rounded-xl web3-card p-4">
                <div className="text-sm text-gray-400">Upcoming Matches</div>
                <div className="text-3xl font-black text-white vivid-text">{filteredMatches.length}</div>
              </div>
            </div>

            <div className="mb-4 grid gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-emerald-200">Latest Live Signal</div>
                {latestLiveBotSignal ? (
                  <div className="mt-1 text-sm font-semibold text-white">
                    {latestLiveBotSignal.league} • {latestLiveBotSignal.match} • {latestLiveBotSignal.pick}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-gray-300">No live signal.</div>
                )}
              </div>
              <div className="rounded-xl border border-fuchsia-500/35 bg-fuchsia-500/10 p-3">
                <div className="text-[11px] uppercase tracking-wide text-fuchsia-200">Latest VIP Pick</div>
                {vipLatestPicks[0] ? (
                  <div className="mt-1 text-sm font-semibold text-white">
                    {vipLatestPicks[0].league} • {vipLatestPicks[0].match} • {vipLatestPicks[0].pick}
                  </div>
                ) : (
                  <div className="mt-1 text-sm text-gray-300">No vip pick.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl web3-card p-3 border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-blue-500/5 mb-4">
            <div className="text-[11px] uppercase tracking-wide text-cyan-200 mb-2">Filters</div>
            <div className="grid md:grid-cols-3 gap-2">
              <input
                type="date"
                value={selectedDate}
                onChange={(event) => setSelectedDate(event.target.value)}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
              <div className="rounded-xl border border-cyan-400/35 bg-cyan-500/10 px-3 py-2.5 text-sm font-bold text-cyan-100">
                <LeagueNameWithLogo
                  leagueName={selectedLeagueData?.name ?? "League"}
                  country={selectedLeagueData?.country}
                  flag={selectedLeagueData?.flag}
                  logoSizeClassName="w-6 h-6"
                />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Rechercher une equipe..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(getTodayDateKey())}
                className="mt-2 w-full rounded-xl border border-white/15 bg-white/5 px-3 py-2.5 text-xs font-semibold text-gray-200 hover:bg-white/10"
              >
                Reset date
              </button>
            )}
          </div>
            {selectedSport === "soccer" && liveOnlyApiMatches.length > 0 && (
            <div className="rounded-2xl border border-rose-500/30 bg-rose-500/10 p-4 mb-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="text-xs uppercase tracking-wide text-rose-200">Tous les matchs live</div>
                <div className="inline-flex items-center rounded-full border border-rose-400/45 bg-rose-500/15 px-2 py-0.5 text-[11px] font-bold text-rose-200">
                  {liveOnlyApiMatches.length} LIVE
                </div>
              </div>
              <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-2">
                {liveOnlyApiMatches.map((liveMatch) => (
                  <div key={liveMatch.id} className="rounded-lg border border-white/15 bg-[#142548] p-2.5">
                    <div className="text-[11px] text-cyan-200 mb-1">{liveMatch.league || "Soccer"}</div>
                    <div className="text-xs text-white font-semibold">
                      <TeamNameWithLogo teamName={liveMatch.homeTeam} textClassName="text-white" logoSizeClassName="w-4 h-4" />
                    </div>
                    <div className="text-xs text-white font-semibold mt-1">
                      <TeamNameWithLogo teamName={liveMatch.awayTeam} textClassName="text-white" logoSizeClassName="w-4 h-4" />
                    </div>
                    <div className="mt-1.5 inline-flex items-center gap-2">
                      <span className="live-pill">
                        <span className="live-pill-dot" />
                        LIVE
                      </span>
                      <span className="text-sm font-black text-rose-300">{liveMatch.liveScore}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
            <div className="text-sm text-gray-400 mb-4">{filteredMatches.length} upcoming matches</div>

            <div className="grid gap-3">
            {filteredMatches.map((match, cardIndex) => (
              (() => {
                const viewMatch = flipMatchSides(match);
                const liveDetail =
                  resolveLiveScoreDetail(liveScoreMap, viewMatch.homeTeam, viewMatch.awayTeam) ??
                  resolveLiveScoreDetail(liveSignalScoreMap, viewMatch.homeTeam, viewMatch.awayTeam);
                const realtimeScore = liveDetail?.score ?? viewMatch.liveScore;
                const isLiveScoreActive = liveDetail?.phase === "live";
                const isFinalScore = liveDetail?.phase === "final";
                const publicPct = viewMatch.market?.publicML ?? viewMatch.prediction;
                const cashPct = viewMatch.market?.cashAll ?? { home: 0, draw: 0, away: 0 };
                const cashAmount = viewMatch.market?.cashAmount;
                const hotTrend = viewMatch.monitorDetails?.find(
                  (detail) => {
                    const label = detail.label.toLowerCase().replace(/\s+/g, "");
                    return label.includes("hottrend");
                  }
                )?.value;
                const matchComments = extractMatchComments(viewMatch.monitorDetails, viewMatch.signals);
                const quickDetails = (viewMatch.monitorDetails ?? [])
                  .filter((detail) => {
                    const label = detail.label.toLowerCase().replace(/\s+/g, "");
                    return !label.includes("hottrend") && label !== "sourcefile";
                  })
                  .map((detail) => ({
                    ...detail,
                    label: remapTotalsTeamText(detail.label),
                    value: remapTotalsTeamText(detail.value),
                  }))
                  .slice(0, 3);
                const contrarianOutcome =
                  viewMatch.trust <= 60
                    ? publicPct.home >= 100
                      ? `Home (${viewMatch.homeTeam})`
                      : publicPct.away >= 100
                      ? `Away (${viewMatch.awayTeam})`
                      : publicPct.draw >= 100
                      ? "Draw"
                      : null
                    : null;
                const public100Outcome =
                  publicPct.home >= 100
                    ? `Home (${viewMatch.homeTeam})`
                    : publicPct.away >= 100
                    ? `Away (${viewMatch.awayTeam})`
                    : publicPct.draw >= 100
                    ? "Draw"
                    : null;
                const cash100Outcome =
                  cashPct.home >= 100
                    ? `Home (${viewMatch.homeTeam})`
                    : cashPct.away >= 100
                    ? `Away (${viewMatch.awayTeam})`
                    : cashPct.draw >= 100
                    ? "Draw"
                    : null;
                const matchLeague = leagues.find((league) => league.id === viewMatch.leagueId);
                const selectedSportEntry = sports.find((sport) => sport.id === selectedSport);
                const selectedSportName = selectedSportEntry?.name ?? "Sport";
                const selectedSportIcon = selectedSportEntry?.icon ?? "🏟️";
                const homeRanking = getTeamPowerRanking(viewMatch.homeTeam);
                const awayRanking = getTeamPowerRanking(viewMatch.awayTeam);
                return (
                  <button
                    key={match.id}
                    onClick={() => navigate(`/match/${match.id}`)}
                    className="p-4 rounded-xl web3-card text-left group match-reveal"
                    style={{ animationDelay: `${Math.min(cardIndex * 45, 360)}ms` }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 text-sm text-gray-300">
                        <Clock className="w-4 h-4" />
                        <span>{formatKickoff(viewMatch.kickoff)}</span>
                      </div>
                      <div
                        className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${
                          viewMatch.confidence >= 85
                            ? "bg-green-500/20 text-green-300"
                            : viewMatch.confidence >= 70
                            ? "bg-cyan-500/20 text-cyan-300"
                            : "bg-amber-500/20 text-amber-300"
                        }`}
                      >
                        Confidence {viewMatch.confidence}%
                      </div>
                    </div>

                    <div className="grid gap-3 lg:grid-cols-12">
                      <div className="lg:col-span-5 safe-wrap">
                        <div className="text-[11px] uppercase tracking-wide text-gray-400">
                          {selectedSportIcon} {selectedSportName}
                        </div>
                        <div className="text-base font-bold text-cyan-300">
                          <LeagueNameWithLogo
                            leagueName={matchLeague?.name ?? "League"}
                            country={matchLeague?.country}
                            flag={matchLeague?.flag}
                          />
                        </div>
                        <div className="text-xl font-black text-white mt-1.5 leading-tight safe-wrap">
                          <TeamNameWithLogo
                            teamName={viewMatch.homeTeam}
                            textClassName="text-white"
                            logoSizeClassName="w-7 h-7"
                          />
                        </div>
                        <div className="mt-1">
                          <PowerRankingBadge ranking={homeRanking} compact />
                        </div>
                        <div className="text-xl font-black text-white/90 safe-wrap inline-flex items-center gap-2 leading-tight">
                          <TeamNameWithLogo
                            teamName={viewMatch.awayTeam}
                            textClassName="text-white/90"
                            logoSizeClassName="w-7 h-7"
                          />
                        </div>
                        <div className="mt-1">
                          <PowerRankingBadge ranking={awayRanking} compact />
                        </div>
                        <div className="mt-1.5 text-xs font-semibold text-cyan-100">
                          {viewMatch.odds.home.toFixed(3)} - {viewMatch.odds.draw.toFixed(3)} -{" "}
                          {viewMatch.odds.away.toFixed(3)}
                        </div>
                        <div className="mt-1 text-xs text-emerald-300">InPlay</div>
                        {hotTrend && (
                          <div className="mt-1 text-xs text-cyan-200">Hot trend: {remapTotalsTeamText(hotTrend)}</div>
                        )}
                        {quickDetails.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {quickDetails.map((detail, detailIndex) => (
                              <div key={`${detail.label}-${detailIndex}`} className="text-xs font-semibold text-cyan-100">
                                {detail.label}: {detail.value}
                              </div>
                            ))}
                          </div>
                        )}
                        {matchComments.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {matchComments.slice(0, 2).map((comment, commentIndex) => (
                              <div
                                key={`${viewMatch.id}-comment-${commentIndex}`}
                                className="text-xs text-amber-100/95 rounded-md border border-amber-300/30 bg-amber-500/10 px-2 py-1"
                              >
                                🔥 {comment}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="lg:col-span-4 safe-wrap">
                        <div className="rounded-lg border border-white/15 bg-[#12284f] p-3">
                          <div className="grid grid-cols-3 text-sm font-bold mb-2">
                            <span className="text-orange-300">{viewMatch.prediction.home.toFixed(0)}%</span>
                            <span className="text-gray-300 text-center">{viewMatch.prediction.draw.toFixed(0)}%</span>
                            <span className="text-green-300 text-right">{viewMatch.prediction.away.toFixed(0)}%</span>
                          </div>
                          <div className="h-4 overflow-hidden rounded-md flex graph-animated">
                            <div
                              className="bg-orange-400/90"
                              style={{ width: `${Math.max(0, Math.min(100, viewMatch.prediction.home))}%` }}
                            />
                            <div
                              className="bg-slate-300/80"
                              style={{ width: `${Math.max(0, Math.min(100, viewMatch.prediction.draw))}%` }}
                            />
                            <div
                              className="bg-lime-500/90"
                              style={{ width: `${Math.max(0, Math.min(100, viewMatch.prediction.away))}%` }}
                            />
                          </div>
                        </div>

                        <div className="mt-3 rounded-lg border border-cyan-500/25 bg-cyan-500/10 p-3 text-xs text-cyan-100">
                          Public ML: H {publicPct.home.toFixed(1)}% | D {publicPct.draw.toFixed(1)}% | A{" "}
                          {publicPct.away.toFixed(1)}%
                        </div>
                        <div className="mt-2 rounded-lg border border-emerald-500/25 bg-emerald-500/10 p-3 text-xs text-emerald-100">
                          Cash: H {cashPct.home.toFixed(1)}% | D {cashPct.draw.toFixed(1)}% | A{" "}
                          {cashPct.away.toFixed(1)}%
                        </div>
                        <div className="mt-3">
                          <PublicMoneyGraph
                            homeTeam={viewMatch.homeTeam}
                            awayTeam={viewMatch.awayTeam}
                            publicML={publicPct}
                            cashAll={cashPct}
                            cashAmount={cashAmount}
                            compact
                          />
                        </div>
                      </div>

                      <div className="lg:col-span-3 safe-wrap">
                        <div className="rounded-lg border border-white/15 bg-[#142548] p-3">
                          <div className="text-gray-300 text-sm">Prediction</div>
                          <div className="text-3xl font-black text-white leading-none mt-1">
                            {viewMatch.expectedScore.home} : {viewMatch.expectedScore.away}
                          </div>
                          <div className="text-cyan-300 text-sm mt-1">Half score</div>
                        </div>
                        <div className="rounded-lg border border-white/15 bg-[#142548] p-3 mt-3">
                          <div className="text-gray-300 text-sm inline-flex items-center gap-2">
                            {isLiveScoreActive && (
                              <span className="live-pill">
                                <span className="live-pill-dot" />
                                LIVE
                              </span>
                            )}
                            {isFinalScore && (
                              <span className="inline-flex items-center rounded-full border border-emerald-400/45 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-200">
                                FT
                              </span>
                            )}
                          </div>
                          <div
                            className={`text-3xl font-black leading-none mt-1 safe-wrap ${
                              isLiveScoreActive ? "text-rose-300 live-score-text" : "text-white"
                            }`}
                          >
                            {realtimeScore ?? "-"}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 p-3 rounded-lg bg-[#0f1f3a]/75 border border-cyan-400/35 web3-glow">
                      <div className="text-xs uppercase tracking-wide font-black text-cyan-200 mb-2 vivid-text">
                        Monitor Data
                      </div>
                      <div className="grid md:grid-cols-3 gap-2 text-sm">
                        <div className="rounded bg-cyan-500/10 border border-cyan-400/30 px-2 py-1.5 font-bold text-cyan-100">
                          Score: {viewMatch.expectedScore.home}:{viewMatch.expectedScore.away}
                        </div>
                        <div className="rounded bg-indigo-500/10 border border-indigo-400/30 px-2 py-1.5 font-bold text-indigo-100">
                          Prob: H {viewMatch.prediction.home.toFixed(1)}% | D {viewMatch.prediction.draw.toFixed(1)}% |
                          A {viewMatch.prediction.away.toFixed(1)}%
                        </div>
                        <div className="rounded bg-emerald-500/10 border border-emerald-400/30 px-2 py-1.5 font-bold text-emerald-100">
                          Public: H {publicPct.home.toFixed(1)}% | D {publicPct.draw.toFixed(1)}% | A{" "}
                          {publicPct.away.toFixed(1)}%
                        </div>
                        <div className="rounded bg-fuchsia-500/10 border border-fuchsia-400/30 px-2 py-1.5 font-bold text-fuchsia-100">
                          Cash: H {cashPct.home.toFixed(1)}% | D {cashPct.draw.toFixed(1)}% | A{" "}
                          {cashPct.away.toFixed(1)}%
                        </div>
                      </div>
                      {public100Outcome && (
                        <div className="mt-2 rounded border border-red-500/40 bg-red-500/10 px-2 py-1.5 text-xs text-red-300">
                          attention possible pieges (public 100% sur {public100Outcome}).
                        </div>
                      )}
                      {cash100Outcome && (
                        <div className="mt-2 rounded border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-300">
                          alerte trap vegas (cash 100% sur {cash100Outcome}).
                        </div>
                      )}
                      {contrarianOutcome && (
                        <div className="mt-2 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-300">
                          Jouer contre public: {contrarianOutcome} (trust {viewMatch.trust.toFixed(1)}%, public 100%).
                        </div>
                      )}
                    </div>
                  </button>
                );
              })()
            ))}

            {filteredMatches.length === 0 && (
              <div className="p-6 rounded-xl border border-white/10 bg-white/5 text-gray-300">
                No matches found for "{searchQuery}".
              </div>
            )}
          </div>
          
          </BrowseCenter>

          <aside className="space-y-4 xl:sticky xl:top-24 h-fit">
            <div className="rounded-2xl web3-card p-4 border border-cyan-500/30 bg-gradient-to-b from-cyan-500/10 to-emerald-500/5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-black text-cyan-200 inline-flex items-center gap-1.5">
                  🤖 SNIPY Live Bot
                  <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-200 animate-pulse">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-300" />
                    LIVE
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/analyze")}
                  className="text-[11px] px-2 py-1 rounded border border-cyan-400/40 bg-cyan-500/10 text-cyan-100"
                >
                  Voir tout
                </button>
              </div>
              <div className="space-y-2">
                {latestLiveBotSignal ? (
                  <>
                    <div className="rounded-lg border border-emerald-500/35 bg-gradient-to-r from-emerald-500/20 to-cyan-500/10 p-3 web3-glow">
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-emerald-200 font-black truncate">
                          🏆 SNIPY Live Bot • {latestLiveBotSignal.league || "LIVE SNIPY"}
                        </div>
                        <div className="inline-flex items-center gap-1 text-[10px] text-amber-200">
                          <span className="relative flex h-2.5 w-2.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-300 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-amber-200" />
                          </span>
                          GX
                        </div>
                      </div>
                      <div className="text-sm text-white font-black truncate mt-1">
                        🎯 {latestLiveBotSignal.pick} @ {latestLiveBotSignal.odd || "-"}
                      </div>
                      <div className="text-xs text-gray-100 truncate mt-1">
                        ⚽ {latestLiveBotSignal.match || "-"}
                      </div>
                      <div className="text-[11px] text-rose-200 mt-1 inline-flex items-center gap-1">
                        🔥 {latestLiveBotSignal.note || "LIVE"}
                      </div>
                      <div className="mt-2 flex gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-300 animate-pulse" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse [animation-delay:120ms]" />
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-300 animate-pulse [animation-delay:240ms]" />
                      </div>
                    </div>

                    {recentLiveBotSignals.map((signal) => (
                      <div
                        key={`recent-live-${signal.id}`}
                        className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 p-2.5"
                      >
                        <div className="text-[10px] text-cyan-100 font-bold truncate">
                          SNIPY Live Bot • {signal.league}
                        </div>
                        <div className="text-xs text-white truncate mt-1">
                          🎯 {signal.pick} @ {signal.odd || "-"}
                        </div>
                        <div className="text-[11px] text-gray-200 truncate mt-1">⚽ {signal.match || "-"}</div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-xs text-gray-400">Aucun signal live pour le moment.</div>
                )}
              </div>
            </div>

            <div className="rounded-2xl web3-card p-4 border border-fuchsia-500/30 bg-gradient-to-b from-fuchsia-500/10 to-indigo-500/5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-sm font-black text-fuchsia-200 inline-flex items-center gap-1.5">
                  💎 VIP PICKS
                  <span className="inline-flex items-center gap-1 rounded-full border border-fuchsia-300/40 bg-fuchsia-500/15 px-2 py-0.5 text-[10px] text-fuchsia-100 animate-pulse">
                    👑 HOT
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/picks")}
                  className="text-[11px] px-2 py-1 rounded border border-fuchsia-400/40 bg-fuchsia-500/10 text-fuchsia-100"
                >
                  Voir tout
                </button>
              </div>
              <div className="space-y-2">
                {vipLatestPicks.length > 0 ? (
                  vipLatestPicks.map((entry) => (
                    <div
                      key={`vip-${entry.id}`}
                      className="rounded-lg border border-fuchsia-400/25 bg-gradient-to-r from-fuchsia-500/15 to-cyan-500/10 p-3 web3-glow hover:border-fuchsia-300/50 transition-all"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="text-[11px] text-cyan-100 font-black truncate">🏆 {entry.league || "VIP"}</div>
                        <span className="text-[10px] px-1.5 py-0.5 rounded border border-cyan-300/40 bg-cyan-500/10 text-cyan-100">
                          VIP
                        </span>
                      </div>
                      <div className="text-sm text-white font-black truncate mt-1">
                        🎯 {entry.pick} @ {entry.odd || "-"}
                      </div>
                      <div className="text-[11px] text-gray-100 truncate mt-1">⚽ {entry.match || "-"}</div>
                      <div className="mt-1 inline-flex items-center gap-1 text-[10px] text-emerald-200">
                        ✨ {entry.note || "Pending"}
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <div className="h-full w-2/3 bg-gradient-to-r from-fuchsia-400 to-cyan-300 animate-pulse" />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-xs text-gray-400">Aucun pick VIP disponible.</div>
                )}
              </div>
            </div>
          </aside>
        </LayoutShell>
      </div>
    </div>
  );
}
