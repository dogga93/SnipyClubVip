import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Zap, Flame, Target } from "lucide-react";
import TeamNameWithLogo from "../../components/TeamNameWithLogo";
import LeagueNameWithLogo from "../../components/LeagueNameWithLogo";
import PowerRankingBadge from "../../components/PowerRankingBadge";
import PublicMoneyGraph from "../../components/PublicMoneyGraph";
import LayoutShell from "../../components/layout/LayoutShell";
import LeftMiniRail from "../../components/layout/LeftMiniRail";
import MatchMonitorCenter from "../../components/layout/MatchMonitorCenter";
import { useZCode } from "../../store/zcodeStore";
import { flipMatchSides } from "../../utils/matchSide";
import {
  fetchLiveScoreDetailMap,
  resolveLiveScoreDetail,
  upsertScoreDetailMap,
  type LiveScoreDetailMap,
} from "../../utils/liveScoreApi";

const clampPct = (value: number) => Math.max(0, Math.min(100, value));
const pct = (value: number) => `${clampPct(value).toFixed(1)}%`;
const money = (value: number) => value.toLocaleString("en-US");
const oddMove = (opening: number, current: number) => {
  const delta = current - opening;
  if (Math.abs(delta) < 0.001) return "0.00";
  return `${delta > 0 ? "+" : ""}${delta.toFixed(2)}`;
};
const cleanRepeatedDateTime = (value: string) => {
  const seen = new Set<string>();
  return value
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .filter((segment) => {
      const lowered = segment.toLowerCase();
      if (lowered.startsWith("date:") || lowered.startsWith("time:") || lowered.startsWith("kickoff:")) {
        return false;
      }
      if (segment.includes("ET") || segment.includes("CET")) {
        return false;
      }
      if (seen.has(lowered)) return false;
      seen.add(lowered);
      return true;
    })
    .join(" | ");
};
const parsePickEntries = (value: string) =>
  cleanRepeatedDateTime(value)
    .split("|")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .map((segment) => {
      const separatorIndex = segment.indexOf(":");
      if (separatorIndex === -1) {
        return { key: "Detail", value: segment };
      }
      const key = segment.slice(0, separatorIndex).trim();
      const entryValue = segment.slice(separatorIndex + 1).trim();
      return { key: key || "Detail", value: entryValue || "-" };
    });
const normalizeLabel = (value: string) =>
  String(value || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const LIVE_BOT_STORAGE_KEY = "snipy:live-bot-signals";
const MANUAL_SIGNAL_SCORE_FALLBACK: Array<{ match: string; score: string }> = [
  { match: "C-Osaka - Avispa Fukuoka", score: "2-0" },
];

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

export default function MatchDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { matches, leagues, getTeamPowerRanking } = useZCode();
  const [liveScoreMap, setLiveScoreMap] = useState<LiveScoreDetailMap>({});
  const [liveSignalScoreMap, setLiveSignalScoreMap] = useState<LiveScoreDetailMap>({});

  const match = useMemo(
    () => matches.find((entry) => String(entry.id) === String(id)),
    [id, matches]
  );

  const league = useMemo(
    () => (match ? leagues.find((entry) => entry.id === match.leagueId) : null),
    [match, leagues]
  );
  const sportMeta = useMemo(() => {
    const sportId = league?.sportId ?? "soccer";
    if (sportId === "basketball") return { icon: "🏀", label: "Basketball" };
    if (sportId === "hockey") return { icon: "🏒", label: "Hockey" };
    if (sportId === "tennis") return { icon: "🎾", label: "Tennis" };
    if (sportId === "baseball") return { icon: "⚾", label: "Baseball" };
    if (sportId === "football") return { icon: "🏈", label: "Football" };
    return { icon: "⚽", label: "Soccer" };
  }, [league?.sportId]);

  useEffect(() => {
    let cancelled = false;

    const loadLiveScores = async () => {
      try {
        const matchDate = (match?.kickoff || "").slice(0, 10);
        const todayDate = new Date().toISOString().slice(0, 10);
        const mapByMatchDate = await fetchLiveScoreDetailMap("soccer", matchDate);
        const mapByToday = matchDate === todayDate ? {} : await fetchLiveScoreDetailMap("soccer", todayDate);
        const merged: LiveScoreDetailMap = { ...mapByMatchDate };
        Object.entries(mapByToday).forEach(([key, value]) => {
          const prev = merged[key];
          if (!prev || (value.phase === "live" && prev.phase !== "live")) {
            merged[key] = value;
          }
        });
        if (!cancelled) setLiveScoreMap(merged);
      } catch {
        if (!cancelled) setLiveScoreMap((prev) => prev);
      }
    };

    loadLiveScores();
    const timer = window.setInterval(loadLiveScores, 20_000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [match?.kickoff]);

  useEffect(() => {
    const buildFromSignals = () => {
      const next: LiveScoreDetailMap = {};
      try {
        const raw = localStorage.getItem(LIVE_BOT_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : [];
        const rows = Array.isArray(parsed) ? parsed : [];
        rows.forEach((entry) => {
          const teams = parseTeamsFromMatchLabel(String(entry?.match || ""));
          if (!teams) return;
          const score = extractScoreFromText(String(entry?.note || "")) || extractScoreFromText(String(entry?.score || ""));
          if (!score) return;
          upsertScoreDetailMap(next, teams.home, teams.away, {
            score,
            phase: "live",
            status: "LIVE",
          });
        });
      } catch {
        // keep fallback map only
      }

      MANUAL_SIGNAL_SCORE_FALLBACK.forEach((entry) => {
        const teams = parseTeamsFromMatchLabel(entry.match);
        if (!teams) return;
        upsertScoreDetailMap(next, teams.home, teams.away, {
          score: entry.score,
          phase: "live",
          status: "LIVE",
        });
      });

      setLiveSignalScoreMap(next);
    };

    buildFromSignals();
    window.addEventListener("storage", buildFromSignals);
    const timer = window.setInterval(buildFromSignals, 5000);
    return () => {
      window.removeEventListener("storage", buildFromSignals);
      window.clearInterval(timer);
    };
  }, []);

  if (!match || !league) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center">
          <p className="text-gray-300 mb-4">Match not found</p>
          <button
            onClick={() => navigate("/browse")}
            className="px-6 py-2 bg-gradient-to-r from-green-500 to-cyan-500 text-white rounded-lg"
          >
            Back to Browse
          </button>
        </div>
      </div>
    );
  }

  const viewMatch = flipMatchSides(match);
  const homeRanking = getTeamPowerRanking(viewMatch.homeTeam);
  const awayRanking = getTeamPowerRanking(viewMatch.awayTeam);

  const homeProb = clampPct(viewMatch.prediction.home);
  const drawProb = clampPct(viewMatch.prediction.draw);
  const awayProb = clampPct(viewMatch.prediction.away);
  const publicML = viewMatch.market?.publicML ?? {
    home: homeProb,
    draw: drawProb,
    away: awayProb,
  };
  const cashAll = viewMatch.market?.cashAll ?? { home: 0, draw: 0, away: 0 };
  const publicAll = viewMatch.market?.publicAll ?? publicML;
  const contrarianOutcome =
    viewMatch.trust <= 60
      ? publicML.home >= 100
        ? `Home (${viewMatch.homeTeam})`
        : publicML.away >= 100
        ? `Away (${viewMatch.awayTeam})`
        : publicML.draw >= 100
        ? "Draw"
        : null
      : null;
  const public100Outcome =
    publicML.home >= 100
      ? `Home (${viewMatch.homeTeam})`
      : publicML.away >= 100
      ? `Away (${viewMatch.awayTeam})`
      : publicML.draw >= 100
      ? "Draw"
      : null;
  const cash100Outcome =
    cashAll.home >= 100
      ? `Home (${viewMatch.homeTeam})`
      : cashAll.away >= 100
      ? `Away (${viewMatch.awayTeam})`
      : cashAll.draw >= 100
      ? "Draw"
      : null;
  const cashAmount = viewMatch.market?.cashAmount ?? { home: 0, draw: 0, away: 0 };
  const ratio = viewMatch.market?.ratio;
  const oddsMovement = viewMatch.market?.oddsMovement;
  const liveDetail =
    resolveLiveScoreDetail(liveScoreMap, viewMatch.homeTeam, viewMatch.awayTeam) ??
    resolveLiveScoreDetail(liveSignalScoreMap, viewMatch.homeTeam, viewMatch.awayTeam);
  const liveScore = liveDetail?.score ?? viewMatch.liveScore ?? "-";
  const isLiveScoreActive = liveDetail?.phase === "live";
  const isFinalScore = liveDetail?.phase === "final";
  const monitorDetails = (viewMatch.monitorDetails ?? []).filter(
    (detail) =>
      detail.label.toLowerCase() !== "source file" &&
      detail.label.toLowerCase() !== "date" &&
      detail.label.toLowerCase() !== "time" &&
      detail.label.toLowerCase() !== "kickoff"
  );
  const predictionTableLabels = new Set([
    "main game list",
    "spread value bets",
    "totals value bets",
    "snipy value bets",
    "sharp value bets",
    "kelly value bets",
  ]);
  const detailMap = new Map<string, string>();
  monitorDetails.forEach((detail) => {
    const key = normalizeLabel(detail.label);
    if (!detailMap.has(key)) detailMap.set(key, detail.value);
  });
  const lookupDetail = (...keys: string[]) => {
    for (const key of keys) {
      const value = detailMap.get(normalizeLabel(key));
      if (value && value.trim()) return value.trim();
    }
    return null;
  };
  const compactMonitorDetails = monitorDetails.filter((detail) => {
    const key = normalizeLabel(detail.label);
    if (predictionTableLabels.has(key)) return false;
    if (key === "final score" || key === "live score") return false;
    return true;
  });
  const predictionTableOrder = [
    "Main game list",
    "Spread Value Bets",
    "Totals Value Bets",
    "SNIPY Value Bets",
    "Sharp Value Bets",
    "Kelly Value Bets",
  ] as const;
  const predictionTables = predictionTableOrder
    .map((label) => monitorDetails.find((detail) => detail.label === label))
    .filter((detail): detail is { label: string; value: string } => Boolean(detail));
  const valueBetSource =
    predictionTables.find((table) => table.label === "Totals Value Bets") ??
    predictionTables.find((table) => table.label === "Spread Value Bets") ??
    predictionTables.find((table) => table.label === "SNIPY Value Bets") ??
    predictionTables.find((table) => table.label === "Sharp Value Bets") ??
    predictionTables.find((table) => table.label === "Kelly Value Bets");
  const valueBetFinalScore =
    valueBetSource?.value.match(/Final Score:\s*([^|]+)/i)?.[1]?.trim() ?? null;
  const valueBetPredictScore =
    valueBetSource?.value.match(/Score Prediction:\s*([^|]+)/i)?.[1]?.trim() ??
    `${viewMatch.expectedScore.home}:${viewMatch.expectedScore.away}`;
  const valueBetPick =
    valueBetSource?.value.match(/Value Bet:\s*([^|]+)/i)?.[1]?.trim() ??
    valueBetSource?.value.match(/Bet On:\s*([^|]+)/i)?.[1]?.trim() ??
    null;
  const spreadTable = predictionTables.find((table) => table.label === "Spread Value Bets");
  const spreadOddMatches = spreadTable ? Array.from(spreadTable.value.matchAll(/Odd:\s*([^|]+)/gi)) : [];
  const spreadOddOne = spreadOddMatches[0]?.[1]?.trim() ?? null;
  const spreadOddTwo = spreadOddMatches[1]?.[1]?.trim() ?? null;
  const spreadValueBet =
    spreadTable?.value.match(/Value Bet:\s*([^|]+)/i)?.[1]?.trim() ??
    spreadTable?.value.match(/Bet On:\s*([^|]+)/i)?.[1]?.trim() ??
    null;
  const outcomeOdds: Array<{ key: "home" | "draw" | "away"; odd: number }> = [
    { key: "home", odd: viewMatch.odds.home },
    { key: "draw", odd: viewMatch.odds.draw },
    { key: "away", odd: viewMatch.odds.away },
  ];
  const validOutcomeOdds = outcomeOdds.filter((entry) => Number.isFinite(entry.odd) && entry.odd > 0);
  const bestOutcome = (validOutcomeOdds.length > 0
    ? validOutcomeOdds.reduce((best, current) => (current.odd < best.odd ? current : best)).key
    : "away") as "home" | "draw" | "away";

  const recommendedPick =
    bestOutcome === "home"
      ? `${viewMatch.homeTeam} ML`
      : bestOutcome === "away"
      ? `${viewMatch.awayTeam} ML`
      : "Draw";
  const strategyLabel = "Monitor best odd";
  const starsLabel = "⭐⭐⭐⭐⭐";
  const statusLabel = isLiveScoreActive ? "InPlay" : isFinalScore ? "Final" : "Scheduled match";
  const drawPercent = lookupDetail("Draw %") ?? `${drawProb.toFixed(1)}%`;
  const over15Percent = lookupDetail("Over 1.5", "Over 1.5 goals %");
  const over25Percent = lookupDetail("Over 2.5", "Over 2.5 goals %") ?? `${viewMatch.overUnder.over.toFixed(1)}%`;
  const bttsPercent = lookupDetail("BTTS", "BTTS %") ?? `${viewMatch.btts.toFixed(1)}%`;
  const firstHalfPred = lookupDetail("1H Prediction", "1st Half Score Prediction");
  const finalPred = lookupDetail("FT Prediction", "Score Prediction Final Score") ??
    `${viewMatch.expectedScore.home}:${viewMatch.expectedScore.away}`;
  const confidenceText = lookupDetail("Confidence") ?? `${viewMatch.confidence.toFixed(1)}%`;
  const mainGameTable = predictionTables.find((table) => table.label === "Main game list");
  const mainGameSummary = mainGameTable
    ? parsePickEntries(mainGameTable.value)
        .filter((entry) =>
          ["1h prediction", "ft prediction", "confidence", "probabilities", "1h result", "final score"].includes(
            entry.key.toLowerCase()
          )
        )
        .map((entry) => `${entry.key}: ${entry.value}`)
        .join(" | ")
    : null;

  return (
    <div className="min-h-screen py-8 2xl:py-10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <LayoutShell leftMini={<LeftMiniRail />} contentClassName="min-w-0">
          <MatchMonitorCenter className="min-w-0">
            <button
              onClick={() => navigate("/browse")}
              className="flex items-center gap-2 text-gray-300 hover:text-white mb-5 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
              <span>Back to Browse</span>
            </button>

            <div className="rounded-2xl border border-[#223257] bg-gradient-to-br from-[#101a32] to-[#1a2644] overflow-hidden">
          <div className="hidden xl:grid grid-cols-12 text-xs 2xl:text-sm tracking-wide uppercase font-bold text-gray-300 bg-[#0e1830] border-b border-[#223257]">
            <div className="col-span-3 px-5 py-3">Match & Teams</div>
            <div className="col-span-2 px-5 py-3">Result</div>
            <div className="col-span-3 px-5 py-3">Prediction</div>
            <div className="col-span-3 px-5 py-3">Probabilities</div>
            <div className="col-span-1 px-5 py-3 flex items-center gap-1">
              <Zap className="w-3 h-3 text-orange-400" /> Momentum
            </div>
          </div>

          <div className="grid grid-cols-12 gap-3.5 sm:gap-4 p-4 sm:p-5">
            <div className="col-span-12 xl:col-span-3 space-y-3.5 match-reveal safe-wrap" style={{ animationDelay: "60ms" }}>
              <div className="rounded-xl border border-[#28406d] bg-[#142342] p-3.5">
                <div className="text-[11px] uppercase tracking-wide text-cyan-200 mb-1">
                  {sportMeta.icon} {sportMeta.label}
                </div>
                <div className="text-sm text-gray-300 mb-1">
                  <LeagueNameWithLogo
                    leagueName={league.name}
                    country={league.country}
                    flag={league.flag}
                  />
                </div>
                <div className="text-xs text-amber-300 mb-1">{statusLabel}</div>
                <div className="text-[11px] text-amber-200 mb-2">{starsLabel}</div>
                <div className="text-xl sm:text-[1.65rem] font-black text-white">
                  <TeamNameWithLogo
                    teamName={viewMatch.homeTeam}
                    textClassName="text-white"
                    logoSizeClassName="w-7 h-7"
                  />
                </div>
                <div className="mt-1">
                  <PowerRankingBadge ranking={homeRanking} />
                </div>
                <div className="text-sm text-cyan-300 mb-2">Home</div>
                <div className="text-xl sm:text-[1.65rem] font-black text-white">
                  <TeamNameWithLogo
                    teamName={viewMatch.awayTeam}
                    textClassName="text-white"
                    logoSizeClassName="w-7 h-7"
                  />
                </div>
                <div className="mt-1">
                  <PowerRankingBadge ranking={awayRanking} />
                </div>
                <div className="text-sm text-pink-300">Away</div>
              </div>

              <div className="rounded-xl border border-cyan-400/35 bg-[#10243f]/85 p-3.5 web3-glow">
                <div className="text-cyan-200 font-black mb-2 vivid-text">MONITOR DATA</div>
                <div className="space-y-2 text-sm">
                  <div className="rounded bg-cyan-500/10 border border-cyan-400/30 px-2 py-1.5 font-bold text-cyan-100">
                    Score: {viewMatch.expectedScore.home}:{viewMatch.expectedScore.away}
                  </div>
                  <div className="rounded bg-indigo-500/10 border border-indigo-400/30 px-2 py-1.5 font-bold text-indigo-100">
                    Probabilities: H {viewMatch.prediction.home.toFixed(1)}% | D {viewMatch.prediction.draw.toFixed(1)}% |
                    A {viewMatch.prediction.away.toFixed(1)}%
                  </div>
                  <div className="rounded bg-emerald-500/10 border border-emerald-400/30 px-2 py-1.5 font-bold text-emerald-100">
                    Public ML: H {publicML.home.toFixed(1)}% | D {publicML.draw.toFixed(1)}% | A {publicML.away.toFixed(1)}%
                  </div>
                  {mainGameSummary && (
                    <div className="rounded bg-sky-500/10 border border-sky-400/30 px-2 py-1.5 font-semibold text-sky-100 text-xs">
                      Main game: {mainGameSummary}
                    </div>
                  )}
                  <div className="rounded bg-indigo-500/10 border border-indigo-400/30 px-2 py-1.5 font-semibold text-indigo-100 text-xs">
                    Confidence: {confidenceText}
                  </div>
                  <div className="rounded bg-violet-500/10 border border-violet-400/30 px-2 py-1.5 font-semibold text-violet-100 text-xs">
                    O/U {over25Percent} | BTTS {bttsPercent} | Strange incident -10.5
                  </div>
                </div>
                {compactMonitorDetails.length > 0 && (
                  <div className="mt-2 grid gap-1">
                    {compactMonitorDetails.slice(0, 8).map((detail) => (
                      <div
                        key={detail.label}
                        className="rounded bg-cyan-500/10 border border-cyan-400/25 px-2 py-1 text-xs font-semibold text-cyan-100"
                      >
                        {detail.label}: {detail.value}
                      </div>
                    ))}
                  </div>
                )}
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

              <div className="rounded-xl border border-[#1a8c80] bg-[#11303a] p-3.5">
                <div className="text-cyan-300 font-bold mb-2">AI BRAIN</div>
                <p className="text-sm text-gray-200 leading-relaxed">
                  Following model consensus and imported monitor data, confidence and score projection were
                  generated from current probabilities and signals.
                </p>
              </div>

              <div className="rounded-xl border border-[#2d3f6f] bg-[#152245] p-3.5">
                <div className="text-cyan-300 font-bold mb-2">Basis for prediction</div>
                <ul className="space-y-2">
                  <li className="text-sm text-gray-200">• 1st Half Score {firstHalfPred ?? "-"}</li>
                  <li className="text-sm text-gray-200">• DRAW {drawPercent}</li>
                  <li className="text-sm text-gray-200">• BTTS {bttsPercent}</li>
                  <li className="text-sm text-gray-200">• TOTAL &gt; 1.5 Goals {over15Percent ?? "-"}</li>
                  <li className="text-sm text-gray-200">• TOTAL &gt; 2.5 Goals {over25Percent}</li>
                  {viewMatch.predictionBasis.slice(0, 2).map((line, index) => (
                    <li key={`${line}-${index}`} className="text-sm text-gray-200">
                      • {line}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="col-span-12 xl:col-span-2 space-y-3.5 match-reveal safe-wrap" style={{ animationDelay: "120ms" }}>
              <div className="rounded-xl border border-[#2f416f] bg-[#162540] p-3.5 text-center">
                <div className="text-xs text-cyan-300 mb-2 font-semibold inline-flex items-center gap-2">
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
                  className={`text-2xl sm:text-3xl font-black ${
                    isLiveScoreActive ? "text-rose-300 live-score-text" : "text-cyan-300 vivid-text"
                  }`}
                >
                  {liveScore}
                </div>
              </div>

              <div className="rounded-xl border border-[#2f416f] bg-[#162540] p-3.5 text-center">
                <div className="text-xs text-gray-400 mb-2">Expected score</div>
                <div className="text-2xl sm:text-3xl font-black text-white">
                  {viewMatch.expectedScore.home} : {viewMatch.expectedScore.away}
                </div>
                <div className="mt-2 text-xs text-cyan-200">1H: {firstHalfPred ?? "-"}</div>
                <div className="text-xs text-cyan-200">FT: {finalPred}</div>
              </div>

              <div className="rounded-xl border border-[#2f416f] bg-[#162540] p-3.5 space-y-2 text-sm">
                <div className="flex justify-between text-gray-200">
                  <span>O/U</span>
                  <span>{pct(viewMatch.overUnder.over)}</span>
                </div>
                <div className="flex justify-between text-gray-200">
                  <span>BTTS</span>
                  <span>{pct(viewMatch.btts)}</span>
                </div>
                <div className="flex justify-between text-amber-300">
                  <span>Strange incident</span>
                  <span>-10.5</span>
                </div>
                <div className="flex justify-between text-emerald-300 border border-emerald-700/40 rounded p-2">
                  <span>Trust</span>
                  <span>{pct(viewMatch.trust)}</span>
                </div>
              </div>

              <div className="rounded-xl border border-[#2f416f] bg-[#162540] p-3.5 text-sm space-y-2">
                <div className="text-cyan-300 font-bold">Cash & Ratios</div>
                <div className="flex justify-between text-gray-200">
                  <span>Cash Home</span>
                  <span>{money(cashAmount.home)}</span>
                </div>
                <div className="flex justify-between text-gray-200">
                  <span>Cash Draw</span>
                  <span>{money(cashAmount.draw)}</span>
                </div>
                <div className="flex justify-between text-gray-200">
                  <span>Cash Away</span>
                  <span>{money(cashAmount.away)}</span>
                </div>
                {ratio && (
                  <>
                    <div className="border-t border-[#2b3d67] pt-2 flex justify-between text-gray-300">
                      <span>Public ratio H/A</span>
                      <span>{ratio.publicHome?.toFixed(2)} / {ratio.publicAway?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-gray-300">
                      <span>Cash ratio H/A</span>
                      <span>{ratio.cashHome?.toFixed(2)} / {ratio.cashAway?.toFixed(2)}</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="col-span-12 xl:col-span-3 space-y-3.5 match-reveal safe-wrap" style={{ animationDelay: "140ms" }}>
              <div className="rounded-xl border border-[#324a7f] bg-[#1b2a4f] p-3.5">
                <div className="text-lg font-black text-white mb-3 vivid-text">Recommended {recommendedPick}</div>
                <div className="space-y-2 text-sm">
                  <div className="rounded-lg bg-[#22345f] border border-[#3a5a9e] p-2 text-gray-200">
                    Strategy: {strategyLabel}
                  </div>
                  <div className="rounded-lg bg-[#432a1f] border border-[#8c4e2a] p-2 text-orange-200">
                    About {viewMatch.overUnder.line} ({pct(viewMatch.overUnder.over)})
                  </div>
                  {valueBetPick && (
                    <div className="rounded-lg bg-emerald-500/10 border border-emerald-400/30 p-2 text-emerald-200">
                      Value Bet: {valueBetPick}
                    </div>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-[#5a57d2] bg-[#25245a] p-3.5">
                <div className="text-indigo-200 font-bold mb-2">Handicap pattern</div>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm text-gray-200 mb-1">
                      <span>Home handicap</span>
                      <span>{pct(viewMatch.handicap.home)}</span>
                    </div>
                    <div className="h-2 rounded bg-[#1a2039] overflow-hidden graph-animated">
                      <div className="h-full bg-amber-400" style={{ width: `${viewMatch.handicap.home}%` }} />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm text-gray-200 mb-1">
                      <span>Away handicap</span>
                      <span>{pct(viewMatch.handicap.away)}</span>
                    </div>
                    <div className="h-2 rounded bg-[#1a2039] overflow-hidden graph-animated">
                      <div className="h-full bg-violet-400" style={{ width: `${viewMatch.handicap.away}%` }} />
                    </div>
                  </div>
                </div>
              </div>

              {(valueBetFinalScore || valueBetPick) && (
                <div className="rounded-xl border border-emerald-500/50 bg-emerald-500/10 p-3.5 text-center safe-wrap">
                  <div className="text-lg font-bold text-emerald-300 safe-wrap">
                    {valueBetPick ? `Value Bet: ${valueBetPick}` : "Value Bet: -"}
                  </div>
                  <div className="text-base font-semibold text-emerald-200 mt-1 safe-wrap">
                    Predict Score: {valueBetPredictScore}
                  </div>
                  <div className="mt-3 rounded border border-red-500/50 bg-red-500/15 px-3 py-2 text-2xl font-black text-red-300 safe-wrap">
                    {valueBetFinalScore ? `Final Score: ${valueBetFinalScore}` : "Final Score: -"}
                  </div>
                </div>
              )}
              {(spreadOddOne || spreadOddTwo || spreadValueBet) && (
                <div className="rounded-xl border border-cyan-500/50 bg-cyan-500/10 p-3.5 safe-wrap">
                  <div className="text-cyan-200 font-bold mb-2">Spread Value Bets</div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-cyan-100 mb-3">
                    <div className="rounded bg-white/5 border border-cyan-500/20 px-2 py-1.5 safe-wrap">
                      Odd 1: {spreadOddOne ?? "-"}
                    </div>
                    <div className="rounded bg-white/5 border border-cyan-500/20 px-2 py-1.5 safe-wrap">
                      Odd 2: {spreadOddTwo ?? "-"}
                    </div>
                  </div>
                  <div className="rounded bg-cyan-900/30 border border-cyan-500/40 px-3 py-2 text-base font-bold text-cyan-200 text-center safe-wrap">
                    Bet Value: {spreadValueBet ?? "-"}
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-[#4f325d] bg-[#2c2140] p-3.5 text-center">
                <div className="text-pink-200 font-bold">
                  Very close ({Math.max(homeProb, awayProb).toFixed(0)}%)
                </div>
              </div>
            </div>

            <div className="col-span-12 xl:col-span-4 space-y-3.5 match-reveal safe-wrap" style={{ animationDelay: "220ms" }}>
              <div className="rounded-xl border border-[#324a7f] bg-[#18284a] p-3.5">
                <div className="grid grid-cols-3 text-sm mb-2">
                  <div className="text-gray-300">H {pct(homeProb)}</div>
                  <div className="text-gray-300 text-center">D {pct(drawProb)}</div>
                  <div className="text-gray-300 text-right">A {pct(awayProb)}</div>
                </div>
                <div className="h-3 rounded overflow-hidden flex graph-animated">
                  <div className="bg-blue-500" style={{ width: `${homeProb}%` }} />
                  <div className="bg-gray-400" style={{ width: `${drawProb}%` }} />
                  <div className="bg-pink-500" style={{ width: `${awayProb}%` }} />
                </div>
              </div>

              <div className="rounded-xl border border-[#2f416f] bg-[#162540] p-3.5">
                <div className="text-sm text-cyan-300 font-bold mb-3">PUBLIC VS CASH (SANS DOUBLONS)</div>
                <div className="space-y-3">
                  <div>
                    <div className="text-xs text-gray-300 mb-1">Public ML</div>
                    <div className="h-2 rounded overflow-hidden flex graph-animated">
                      <div className="bg-blue-500" style={{ width: `${clampPct(publicML.home)}%` }} />
                      <div className="bg-gray-400" style={{ width: `${clampPct(publicML.draw)}%` }} />
                      <div className="bg-pink-500" style={{ width: `${clampPct(publicML.away)}%` }} />
                    </div>
                    <div className="grid grid-cols-3 text-[11px] text-gray-300 mt-1">
                      <span>H {pct(publicML.home)}</span>
                      <span className="text-center">D {pct(publicML.draw)}</span>
                      <span className="text-right">A {pct(publicML.away)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-300 mb-1">All Public</div>
                    <div className="h-2 rounded overflow-hidden flex graph-animated">
                      <div className="bg-indigo-500" style={{ width: `${clampPct(publicAll.home)}%` }} />
                      <div className="bg-slate-400" style={{ width: `${clampPct(publicAll.draw)}%` }} />
                      <div className="bg-fuchsia-500" style={{ width: `${clampPct(publicAll.away)}%` }} />
                    </div>
                    <div className="grid grid-cols-3 text-[11px] text-gray-300 mt-1">
                      <span>H {pct(publicAll.home)}</span>
                      <span className="text-center">D {pct(publicAll.draw)}</span>
                      <span className="text-right">A {pct(publicAll.away)}</span>
                    </div>
                  </div>

                  <div>
                    <div className="text-xs text-gray-300 mb-1">All Cash</div>
                    <div className="h-2 rounded overflow-hidden flex graph-animated">
                      <div className="bg-emerald-500" style={{ width: `${clampPct(cashAll.home)}%` }} />
                      <div className="bg-yellow-400" style={{ width: `${clampPct(cashAll.draw)}%` }} />
                      <div className="bg-rose-500" style={{ width: `${clampPct(cashAll.away)}%` }} />
                    </div>
                    <div className="grid grid-cols-3 text-[11px] text-gray-300 mt-1">
                      <span>H {pct(cashAll.home)}</span>
                      <span className="text-center">D {pct(cashAll.draw)}</span>
                      <span className="text-right">A {pct(cashAll.away)}</span>
                    </div>
                  </div>
                </div>
              </div>

              <PublicMoneyGraph
                homeTeam={viewMatch.homeTeam}
                awayTeam={viewMatch.awayTeam}
                publicML={publicML}
                cashAll={cashAll}
                cashAmount={cashAmount}
              />

              {oddsMovement && (
                <div className="rounded-xl border border-[#2f416f] bg-[#162540] p-3.5">
                  <div className="text-sm text-cyan-300 font-bold mb-3">Odds movement (Opening {"->"} Current)</div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-gray-200">
                      <span>Home</span>
                      <span className="safe-wrap text-right">
                        {oddsMovement.opening.home.toFixed(2)} {"->"} {oddsMovement.current.home.toFixed(2)} (
                        {oddMove(oddsMovement.opening.home, oddsMovement.current.home)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-200">
                      <span>Draw</span>
                      <span className="safe-wrap text-right">
                        {oddsMovement.opening.draw.toFixed(2)} {"->"} {oddsMovement.current.draw.toFixed(2)} (
                        {oddMove(oddsMovement.opening.draw, oddsMovement.current.draw)})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-200">
                      <span>Away</span>
                      <span className="safe-wrap text-right">
                        {oddsMovement.opening.away.toFixed(2)} {"->"} {oddsMovement.current.away.toFixed(2)} (
                        {oddMove(oddsMovement.opening.away, oddsMovement.current.away)})
                      </span>
                    </div>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-[#2f416f] bg-[#162540] p-3.5">
                <div className="text-xs text-gray-300 mb-2">Market odds (1X2)</div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div
                    className={`rounded-lg p-3 ${
                      bestOutcome === "home"
                        ? "border border-teal-500 bg-[#10223a]"
                        : "border border-[#2e3e68] bg-[#121d35]"
                    }`}
                  >
                    <div className={`text-xs ${bestOutcome === "home" ? "text-teal-300" : "text-gray-400"}`}>
                      Home
                    </div>
                    <div className={`text-xl font-bold ${bestOutcome === "home" ? "text-teal-300" : "text-white"}`}>
                      {viewMatch.odds.home.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className={`rounded-lg p-3 ${
                      bestOutcome === "draw"
                        ? "border border-teal-500 bg-[#10223a]"
                        : "border border-[#2e3e68] bg-[#121d35]"
                    }`}
                  >
                    <div className={`text-xs ${bestOutcome === "draw" ? "text-teal-300" : "text-gray-400"}`}>
                      Draw
                    </div>
                    <div className={`text-xl font-bold ${bestOutcome === "draw" ? "text-teal-300" : "text-white"}`}>
                      {viewMatch.odds.draw.toFixed(2)}
                    </div>
                  </div>
                  <div
                    className={`rounded-lg p-3 ${
                      bestOutcome === "away"
                        ? "border border-teal-500 bg-[#10223a]"
                        : "border border-[#2e3e68] bg-[#121d35]"
                    }`}
                  >
                    <div className={`text-xs ${bestOutcome === "away" ? "text-teal-300" : "text-gray-400"}`}>
                      Away
                    </div>
                    <div className={`text-xl font-bold ${bestOutcome === "away" ? "text-teal-300" : "text-white"}`}>
                      {viewMatch.odds.away.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-[#324a7f] bg-[#162540] p-3.5">
                <div className="text-sm text-gray-200 mb-3">
                  {sportMeta.label === "Soccer"
                    ? "Asian Handicap / Match Goals / Draw risk"
                    : "Handicap / Totals / Draw risk"}
                </div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="rounded border border-[#2d3f6f] p-2 text-gray-200">
                    Over {viewMatch.overUnder.line}: <span className="font-bold">{pct(viewMatch.overUnder.over)}</span>
                  </div>
                  <div className="rounded border border-[#2d3f6f] p-2 text-gray-200">
                    Under {viewMatch.overUnder.line}: <span className="font-bold">{pct(viewMatch.overUnder.under)}</span>
                  </div>
                  <div className="rounded border border-[#2d3f6f] p-2 text-gray-200">
                    BTTS: <span className="font-bold">{pct(viewMatch.btts)}</span>
                  </div>
                  <div className="rounded border border-[#2d3f6f] p-2 text-gray-200">
                    Trust: <span className="font-bold">{pct(viewMatch.trust)}</span>
                  </div>
                </div>
              </div>
            </div>

          </div>

          <div className="border-t border-[#223257] p-4 sm:p-5 bg-[#101a32]">
            {predictionTables.length > 0 && (
              <div className="mb-3 text-cyan-200 font-black tracking-wide uppercase text-xs">Picks windows</div>
            )}
            {predictionTables.length > 0 && (
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 mb-4">
                {predictionTables.map((table) => (
                  <div key={table.label} className="rounded-xl border border-cyan-500/35 bg-[#162540] p-4 web3-glow">
                    <div className="text-emerald-300 font-black mb-3">
                      {table.label === "Kelly Value Bets" ? "SNIPY Value Bets" : table.label}
                    </div>
                    <div className="space-y-2">
                      {parsePickEntries(table.value).slice(0, 9).map((entry, index) => (
                        <div
                          key={`${table.label}-${entry.key}-${index}`}
                          className={`rounded border px-2 py-1.5 text-xs font-semibold break-words ${
                            entry.key.toLowerCase().includes("final score")
                              ? "border-red-500/40 bg-red-500/10 text-red-200"
                              : entry.key.toLowerCase().includes("value bet") || entry.key.toLowerCase().includes("bet on")
                              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                              : "border-cyan-500/25 bg-cyan-500/10 text-cyan-100"
                          }`}
                        >
                          <span className="font-black">{entry.key}:</span> {entry.value}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            <div className="grid md:grid-cols-3 gap-4">
              <div className="rounded-xl border border-[#2f416f] bg-[#162540] p-4">
                <div className="flex items-center gap-2 text-cyan-200 font-black mb-2 vivid-text">
                  <Flame className="w-4 h-4" /> Hot trends
                </div>
                <ul className="text-sm font-semibold text-cyan-100 space-y-1">
                  {viewMatch.signals.slice(0, 3).map((signal, index) => (
                    <li key={`${signal}-${index}`}>• {signal}</li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-[#2f416f] bg-[#162540] p-4">
                <div className="flex items-center gap-2 text-emerald-200 font-black mb-2 vivid-text">
                  <Target className="w-4 h-4" /> Recommendation & odds
                </div>
                <div className="text-sm font-bold text-emerald-100">Primary pick: {recommendedPick}</div>
                <div className="text-sm font-semibold text-emerald-100">Home {viewMatch.odds.home.toFixed(2)} | Draw {viewMatch.odds.draw.toFixed(2)} | Away {viewMatch.odds.away.toFixed(2)}</div>
              </div>

              <div className="rounded-xl border border-[#2f416f] bg-[#162540] p-4">
                <div className="text-cyan-200 mb-2 font-black vivid-text">Active signals</div>
                <ul className="text-sm font-semibold text-cyan-100 space-y-1">
                  {viewMatch.predictionBasis.slice(0, 3).map((basis, index) => (
                    <li key={`${basis}-${index}`}>• {basis}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
            </div>
          </MatchMonitorCenter>
        </LayoutShell>
      </div>
    </div>
  );
}
