import { useMemo, useState } from "react";
import TeamNameWithLogo from "../../components/TeamNameWithLogo";
import LeagueNameWithLogo from "../../components/LeagueNameWithLogo";
import PowerRankingBadge from "../../components/PowerRankingBadge";
import PublicMoneyGraph from "../../components/PublicMoneyGraph";
import { useZCode } from "../../store/zcodeStore";
import { parsePublicBetsText } from "../../utils/publicBetsImport";

type Triplet = { home: number; draw: number; away: number };

type TeamProfile = {
  odd?: string;
  powerRank?: string;
  status?: string;
  streak?: string;
  last6?: string;
};

type VipPick = {
  id: string;
  placedAt: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  probabilities: Triplet;
  pointSpreadForecast?: string;
  totalLine?: string;
  homeTT?: string;
  awayTT?: string;
  hotTrends: string[];
  recommendations: string[];
  scorePrediction?: string;
  confidence?: number;
  summary?: string;
  publicMoneyline?: Triplet;
  publicSpread?: { home: number; away: number };
  publicTotals?: { under: number; over: number };
  homeProfile?: TeamProfile;
  awayProfile?: TeamProfile;
  liveScore?: string;
  gameResult?: string;
  vegasTrap?: boolean;
  publicTickets?: string[];
  lineMovesMoney?: string[];
  lineMovesSpread?: string[];
  matchPreview?: string;
  zcodeAiNote?: string;
};

const STORAGE_KEY = "snipy:monitor-raw-text";
const PUBLIC_BETS_STORAGE_KEY = "snipy:public-bets-raw";

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const isMeaningfulText = (value?: string, min = 80) => !!value && value.trim().length >= min;
const hasNonZeroTriplet = (t?: Triplet) => !!t && (pct(t.home) > 0 || pct(t.draw) > 0 || pct(t.away) > 0);
const isLikelySportLabel = (value: string) =>
  /\b(SOCCER|BASKETBALL|BASEBALL|HOCKEY|TENNIS|RUGBY|VOLLEYBALL|NFL|NBA|NHL|MLB)\b/i.test(value);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const parsePct = (value: string) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, n));
};

const pct = (value?: number) => Math.max(0, Math.min(100, Number(value ?? 0)));

const circleStyle = (a: number, b: number, c: number) => {
  const p1 = pct(a);
  const p2 = pct(b);
  const p3 = Math.max(0, 100 - p1 - p2);
  return {
    background: `conic-gradient(#22c55e 0 ${p1}%, #60a5fa ${p1}% ${p1 + p2}%, #ef4444 ${p1 + p2}% ${p1 + p2 + p3}%, #0b1220 ${p1 + p2 + p3}% 100%)`,
  } as const;
};

const hasAnyPercent = (...values: Array<number | undefined>) => values.some((v) => pct(v) > 0);

const parseTripletLine = (block: string, marker: string, homeTeam: string, awayTeam: string): Triplet | undefined => {
  const escapedMarker = escapeRegExp(marker);
  const escapedHome = escapeRegExp(homeTeam);
  const escapedAway = escapeRegExp(awayTeam);
  const re = new RegExp(
    `${escapedMarker}[\\s\\S]{0,180}?(\\d+(?:\\.\\d+)?)%\\s*-\\s*${escapedHome}[\\s\\S]{0,80}?(\\d+(?:\\.\\d+)?)%\\s*-\\s*${escapedAway}[\\s\\S]{0,80}?(\\d+(?:\\.\\d+)?)%\\s*-\\s*Draw`,
    "i"
  );
  const match = block.match(re);
  if (!match) return undefined;
  return {
    home: parsePct(match[1]),
    away: parsePct(match[2]),
    draw: parsePct(match[3]),
  };
};

const parseSpreadLine = (block: string, homeTeam: string, awayTeam: string): { home: number; away: number } | undefined => {
  const re = new RegExp(
    `Spread[\\s\\S]{0,180}?(\\d+(?:\\.\\d+)?)%\\s*-\\s*${escapeRegExp(homeTeam)}[\\s\\S]{0,80}?(\\d+(?:\\.\\d+)?)%\\s*-\\s*${escapeRegExp(awayTeam)}`,
    "i"
  );
  const match = block.match(re);
  if (!match) return undefined;
  return { home: parsePct(match[1]), away: parsePct(match[2]) };
};

const parseTotalsLine = (block: string): { under: number; over: number } | undefined => {
  const match = block.match(/Totals[\s\S]{0,180}?(\d+(?:\.\d+)?)%\s*-\s*Under[\s\S]{0,80}?(\d+(?:\.\d+)?)%\s*-\s*Over/i);
  if (!match) return undefined;
  return { under: parsePct(match[1]), over: parsePct(match[2]) };
};

const extractLinesBetween = (block: string, start: RegExp, end: RegExp) => {
  const startMatch = block.match(start);
  if (!startMatch || startMatch.index === undefined) return [] as string[];
  const afterStart = block.slice(startMatch.index + startMatch[0].length);
  const endMatch = afterStart.match(end);
  const chunk = endMatch ? afterStart.slice(0, endMatch.index) : afterStart;
  return chunk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !/^Power Ranks Indicator|^Head2Head|^Oscillator|^Totals Predictor|^Last 10 Games|^Volatility Oscillator|^Public Percentages|^ZCODE CONSENSUS|^SNIPY CONSENSUS|^Click the team/i.test(line));
};

const parseTeamProfile = (block: string, team: string): TeamProfile => {
  const escaped = escapeRegExp(team);
  const sectionRegex = new RegExp(`${escaped}[\\s\\S]{0,520}`, "i");
  const section = block.match(sectionRegex)?.[0] ?? "";

  const oddMatch = section.match(/ODD[\s\S]{0,80}?([\d.]+|—|-)/i);
  const rankMatch = section.match(/POWER\s*RANK[\s\S]{0,80}?([\d]+|—|-)/i);
  const statusMatch = section.match(/Status\s*([A-Za-z ]+(?:Up|Down)?)/i);
  const streakMatch = section.match(/Streak\s*([WLD\-]+)/i);
  const last6Match = section.match(/Last\s*6\s*Games\s*([^\n]+)/i);

  return {
    odd: oddMatch?.[1]?.trim(),
    powerRank: rankMatch?.[1]?.trim(),
    status: statusMatch?.[1]?.trim(),
    streak: streakMatch?.[1]?.trim(),
    last6: last6Match?.[1]?.trim(),
  };
};

const parsePublicTickets = (block: string) => {
  const lines = extractLinesBetween(block, /Public Tickets[\s\S]*?Consensus stats/i, /Possible Vegas Trap Alert|Line Moves|ODD|ZCODE CONSENSUS|SNIPY CONSENSUS/i);
  return lines.filter((line) => /:\s*\d+|Total:\s*\d+/i.test(line)).slice(0, 8);
};

const parseLineMoves = (block: string, marker: "Money Line" | "Spread Line") => {
  const escaped = marker === "Money Line" ? /Money Line/i : /Spread Line/i;
  const end = marker === "Money Line" ? /Spread Line|Spread Value|Standard Totals|ODD|ZCODE CONSENSUS|SNIPY CONSENSUS/i : /Spread Value|Standard Totals|ODD|ZCODE CONSENSUS|SNIPY CONSENSUS/i;
  const lines = extractLinesBetween(block, escaped, end);
  return lines.filter((line) => /Sharp line move detected/i.test(line)).slice(0, 8);
};

const parsePreviewParagraph = (block: string, title: RegExp) => {
  const m = block.match(title);
  if (!m || m.index === undefined) return undefined;
  const after = block.slice(m.index);
  const end = after.search(/\nZCODE CONSENSUS|\nSNIPY CONSENSUS|\nZCodeAI says|\nSNIPY AI says|\nAdd Smiley|\nReply/i);
  const chunk = end >= 0 ? after.slice(0, end) : after;
  const lines = chunk
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  return lines.join(" ");
};

const parseVipPicks = (raw: string): VipPick[] => {
  const blocks = raw
    .split(/(?=Pick\s*#\d+)/gi)
    .map((part) => part.trim())
    .filter((part) => /^Pick\s*#\d+/i.test(part));

  const picks: VipPick[] = [];

  blocks.forEach((block) => {
    const idMatch = block.match(/Pick\s*#(\d+)/i);
    const placedAtMatch = block.match(/I placed it\s*\n\s*([^\n]+)/i);
    const gameMatch =
      block.match(/\n\s*([^\n]+?)\s+at\s+([^\n]+?)\s*\(([^,\n]+),\s*([^\)\n]+)\)/i) ??
      block.match(/\n\s*([^\n]+?)\s+vs\s+([^\n]+?)\s*\(([^,\n]+),\s*([^\)\n]+)\)/i);
    const probsMatch = block.match(/(\d+(?:\.\d+)?)%\s*(\d+(?:\.\d+)?)%\s*(\d+(?:\.\d+)?)%/);
    if (!idMatch || !gameMatch) return;
    if (!isLikelySportLabel(gameMatch[3].trim())) return;

    const homeTeam = gameMatch[1].trim();
    const awayTeam = gameMatch[2].trim();

    const pointSpreadMatch = block.match(/Point Spread forecast\s*([^\n]+)/i);
    const totalMatch = block.match(/\n\s*Total\s*([^\n]+)/i);
    const homeTTMatch = block.match(new RegExp(`${escapeRegExp(homeTeam)}\\s*TT\\s*([^\\n]+)`, "i"));
    const awayTTMatch = block.match(new RegExp(`${escapeRegExp(awayTeam)}\\s*TT\\s*([^\\n]+)`, "i"));
    const scoreMatch = block.match(/Score prediction:\s*([^\n]+)/i);
    const confidenceMatch = block.match(/Confidence in prediction:\s*([\d.]+)%/i);
    const liveScoreMatch = block.match(/Live Score:\s*([^\n]+)/i);
    const gameResultMatch = block.match(/Game result:\s*([^\n]+)/i) ?? block.match(/Game ended\s*([^\n]+)/i);

    const hotTrends = extractLinesBetween(block, /Hot Trends/i, /Recommendation\s*&\s*odds|Power Ranks Indicator/i);
    const recommendations = extractLinesBetween(block, /Recommendation\s*&\s*odds/i, /Power Ranks Indicator|Head2Head/i);
    const publicTickets = parsePublicTickets(block);
    const lineMovesMoney = parseLineMoves(block, "Money Line");
    const lineMovesSpread = parseLineMoves(block, "Spread Line");
    const vegasTrap = /Possible Vegas Trap Alert/i.test(block);
    const matchPreview = parsePreviewParagraph(block, /Match Preview:\s*[^\n]+/i);
    const zcodeAiNote = parsePreviewParagraph(block, /(?:ZCodeAI says|SNIPY AI says)[^\n]*/i);

    const summaryLine = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^According to|^This game has|^According to Z Code|^According to Snipy/i.test(line));

    picks.push({
      id: idMatch[1],
      placedAt: placedAtMatch?.[1]?.trim() ?? "",
      sport: gameMatch[3].trim(),
      league: gameMatch[4].trim(),
      homeTeam,
      awayTeam,
      probabilities: {
        home: Number(probsMatch?.[1] ?? 0),
        draw: Number(probsMatch?.[2] ?? 0),
        away: Number(probsMatch?.[3] ?? 0),
      },
      pointSpreadForecast: pointSpreadMatch?.[1]?.trim(),
      totalLine: totalMatch?.[1]?.trim(),
      homeTT: homeTTMatch?.[1]?.trim(),
      awayTT: awayTTMatch?.[1]?.trim(),
      hotTrends,
      recommendations,
      scorePrediction: scoreMatch?.[1]?.trim(),
      confidence: confidenceMatch ? Number(confidenceMatch[1]) : undefined,
      summary: summaryLine,
      publicMoneyline: parseTripletLine(block, "Moneyline", homeTeam, awayTeam),
      publicSpread: parseSpreadLine(block, homeTeam, awayTeam),
      publicTotals: parseTotalsLine(block),
      homeProfile: parseTeamProfile(block, homeTeam),
      awayProfile: parseTeamProfile(block, awayTeam),
      liveScore: liveScoreMatch?.[1]?.trim(),
      gameResult: gameResultMatch?.[1]?.trim(),
      vegasTrap,
      publicTickets,
      lineMovesMoney,
      lineMovesSpread,
      matchPreview,
      zcodeAiNote,
    });
  });

  return picks;
};

const parseLoosePicks = (raw: string): VipPick[] => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const picks: VipPick[] = [];
  const gameHeaderRegex = /^(.+?)\s+(?:at|vs)\s+(.+?)\s+\(([^,]+),\s*([^)]+)\)/i;
  const gameStartIndices: number[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    if (gameHeaderRegex.test(lines[i])) gameStartIndices.push(i);
  }

  let synthetic = 1;
  gameStartIndices.forEach((startIdx, idx) => {
    const endIdx = idx + 1 < gameStartIndices.length ? gameStartIndices[idx + 1] : lines.length;
    const header = lines[startIdx];
    const gameMatch = header.match(gameHeaderRegex);
    if (!gameMatch) return;
    if (!isLikelySportLabel(gameMatch[3].trim())) return;

    const block = lines.slice(startIdx, endIdx).join("\n");
    const probsMatch = block.match(/(\d+(?:\.\d+)?)%\s*(\d+(?:\.\d+)?)%\s*(\d+(?:\.\d+)?)%/);
    const pointSpreadMatch = block.match(/Point Spread forecast\s*([^\n]+)/i);
    const totalMatch = block.match(/\n\s*Total\s*([^\n]+)/i);
    const homeTTMatch = block.match(new RegExp(`${escapeRegExp(gameMatch[1].trim())}\\s*TT\\s*([^\\n]+)`, "i"));
    const awayTTMatch = block.match(new RegExp(`${escapeRegExp(gameMatch[2].trim())}\\s*TT\\s*([^\\n]+)`, "i"));
    const scoreMatch = block.match(/Score prediction:\s*([^\n]+)/i);
    const confidenceMatch = block.match(/Confidence in prediction:\s*([\d.]+)%/i);
    const liveScoreMatch = block.match(/Live Score:\s*([^\n]+)/i);
    const gameResultMatch = block.match(/Game result:\s*([^\n]+)/i) ?? block.match(/Game ended\s*([^\n]+)/i);

    const hotTrends = extractLinesBetween(block, /Hot Trends/i, /Recommendation\s*&\s*odds|Power Ranks Indicator/i);
    const recommendations = extractLinesBetween(block, /Recommendation\s*&\s*odds/i, /Power Ranks Indicator|Head2Head/i);
    const publicTickets = parsePublicTickets(block);
    const lineMovesMoney = parseLineMoves(block, "Money Line");
    const lineMovesSpread = parseLineMoves(block, "Spread Line");
    const vegasTrap = /Possible Vegas Trap Alert/i.test(block);
    const matchPreview = parsePreviewParagraph(block, /Match Preview:\s*[^\n]+/i);
    const zcodeAiNote = parsePreviewParagraph(block, /(?:ZCodeAI says|SNIPY AI says)[^\n]*/i);
    const summaryLine = block
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => /^According to|^This game has|^According to Z Code|^According to Snipy/i.test(line));

    let placedAt = "";
    for (let j = startIdx - 1; j >= Math.max(0, startIdx - 4); j -= 1) {
      if (/\bET\b/i.test(lines[j])) {
        placedAt = lines[j];
        break;
      }
    }

    picks.push({
      id: `L${synthetic}`,
      placedAt,
      sport: gameMatch[3].trim(),
      league: gameMatch[4].trim(),
      homeTeam: gameMatch[1].trim(),
      awayTeam: gameMatch[2].trim(),
      probabilities: {
        home: Number(probsMatch?.[1] ?? 0),
        draw: Number(probsMatch?.[2] ?? 0),
        away: Number(probsMatch?.[3] ?? 0),
      },
      pointSpreadForecast: pointSpreadMatch?.[1]?.trim(),
      totalLine: totalMatch?.[1]?.trim(),
      homeTT: homeTTMatch?.[1]?.trim(),
      awayTT: awayTTMatch?.[1]?.trim(),
      hotTrends,
      recommendations,
      scorePrediction: scoreMatch?.[1]?.trim(),
      confidence: confidenceMatch ? Number(confidenceMatch[1]) : undefined,
      summary: summaryLine,
      publicMoneyline: parseTripletLine(block, "Moneyline", gameMatch[1].trim(), gameMatch[2].trim()),
      publicSpread: parseSpreadLine(block, gameMatch[1].trim(), gameMatch[2].trim()),
      publicTotals: parseTotalsLine(block),
      homeProfile: parseTeamProfile(block, gameMatch[1].trim()),
      awayProfile: parseTeamProfile(block, gameMatch[2].trim()),
      liveScore: liveScoreMatch?.[1]?.trim(),
      gameResult: gameResultMatch?.[1]?.trim(),
      vegasTrap,
      publicTickets,
      lineMovesMoney,
      lineMovesSpread,
      matchPreview,
      zcodeAiNote,
    });
    synthetic += 1;
  });

  return picks;
};

const seedRaw = `Real Sociedad at Real Madrid (SOCCER, Spain Primera Division)
24%9%67%
Point Spread forecast Bet on Moneyline for Real Madrid
Total Over 3.25 (59%)
Real Sociedad TT Over 0.50(74%)
Real Madrid TT Over 0.50(100%)
Hot Trends
83% Winning Rate Predicting Last 6 Real Madrid games
Real Madrid won 80% in favorite status in last 5 games
Recommendation & odds
Hot team Real Madrid: Good opportunity for a system play
Low confidence underdog value pick (3 Stars) on Real Sociedad
Public Percentages
Moneyline
4%-Real Sociedad
79%-Real Madrid
17%-Draw
Spread
22%-Real Sociedad
78%-Real Madrid
Totals
29%-Under
71%-Over
Public Tickets
Consensus stats
Real Sociedad ML: 21
Real Madrid ML: 399
Real Sociedad +1.25: 14
Real Madrid -1.25: 49
Over: 35
Under: 14
Total: 532
Possible Vegas Trap Alert
Line Moves
Money Line
Feb 14 07:38 AM: Sharp line move detected in favor of Real Madrid
Feb 14 07:58 AM: Sharp line move detected against Real Madrid
Spread Line
Feb 14 07:48 AM: Sharp line move detected against Real Madrid
Live Score: Real Sociedad 1 Real Madrid 4
Score prediction: Real Sociedad 1 - Real Madrid 2
Confidence in prediction: 66.5%
Match Preview: Real Sociedad vs. Real Madrid (February 14, 2026)
As the two La Liga giants prepare to clash at the Reale Arena, Real Madrid steps into the match as the clear favorite according to the Snipy model.
SNIPY AI says at 06:28 am cet
Match Preview: Real Sociedad vs. Real Madrid (February 14, 2026)

Pick #63971800
I placed it
Feb. 14th, 2026 11:15 AM ET (5:15 PM CET)
Varazdin at Rijeka (SOCCER, Croatia First Division)
47%19%34%
Point Spread forecast Bet on Moneyline for Varazdin
Total Over 2.25 (64%)
Varazdin TT Under 0.50(62%)
Rijeka TT Over 0.50(100%)
Recommendation & odds
The Over/Under line is 2.25. The projection for Over is 63.67%
Public Percentages
Moneyline
9%-Varazdin
68%-Rijeka
23%-Draw
Spread
40%-Varazdin
60%-Rijeka
Totals
0%-Under
100%-Over
Game ended Varazdin 1 Rijeka 3
Public Tickets
Consensus stats
Varazdin ML: 25
Rijeka ML: 183
Varazdin +0.75: 14
Rijeka -0.75: 21
Over: 6
Total: 249
Possible Vegas Trap Alert
Line Moves
Spread Line
Feb 14 10:30 AM: Sharp line move detected against Rijeka
Game result: Varazdin 1 Rijeka 3
Score prediction: Varazdin 1 - Rijeka 2
Confidence in prediction: 25.5%

Pick #63973920
I placed it
Feb. 14th, 2026 2:45 PM ET (8:45 PM CET)
Juventus at Inter (SOCCER, Italy Serie A)
32%16%52%
Point Spread forecast 0 (93%) on Juventus
Total Under 2.25 (54%)
Juventus TT Over 0.50(89%)
Inter TT Over 0.50(79%)
Hot Trends
83% Winning Rate Predicting Last 6 Inter games
Inter won 100% in favorite status in last 5 games
Recommendation & odds
Hot team Inter: Good opportunity for a system play
Low confidence underdog value pick (3 Stars) on Juventus
Public Percentages
Moneyline
14%-Juventus
63%-Inter
23%-Draw
Spread
20%-Juventus
80%-Inter
Totals
16%-Under
84%-Over
Public Tickets
Consensus stats
Juventus ML: 10
Inter ML: 43
Juventus +0: 7
Inter -0: 28
Over: 111
Under: 21
Total: 220
Possible Vegas Trap Alert
Line Moves
Spread Line
Feb 14 02:28 PM: Sharp line move detected in favor of Inter
Live Score: Juventus 2 Inter 3
Score prediction: Juventus 0 - Inter 1
Confidence in prediction: 75.5%
Match Preview: Juventus vs Inter (February 14, 2026)
As the rivalry between Juventus and Inter intensifies, this clash promises to be an exhilarating contest with high stakes for both teams.
SNIPY AI says at 06:27 am cet
Match Preview: Juventus vs Inter (February 14, 2026)`;

const getFrenchSpecialNarrative = (pick: VipPick) => {
  const home = normalizeText(pick.homeTeam);
  const away = normalizeText(pick.awayTeam);
  if (!(home.includes("lens") && away.includes("paris fc"))) return null;

  return [
    "Prediction du score : Lens 2 - Paris FC 1.",
    "Confiance dans la prediction : 54.6%.",
    "Selon l'analyse statistique de Snipy et les simulations de match, Lens est un solide favori avec 65% de chances de battre Paris FC.",
    "Cette prediction contient un pick underdog 5.00 etoiles sur Paris FC.",
    "Paris FC joue a domicile cette saison.",
    "Selon les bookmakers, la cote moneyline de Paris FC est a 4.120. La probabilite calculee de couvrir le spread +0.25 pour Paris FC est de 70.68%.",
    "La serie la plus recente de Paris FC est : D-L-D-D-W-W.",
    "Actuellement Lens est 8 au rating et Paris FC est non classe au rating.",
    "Prochains matchs de Paris FC : @Toulouse (), Paris SG ().",
    "Derniers matchs de Paris FC : 0-0 (Win) @Auxerre le 8 fevrier, 0-2 (Loss) @Lorient le 4 fevrier.",
    "Prochains matchs de Lens : Monaco (), @Strasbourg ().",
    "Derniers matchs de Lens : 1-3 (Win) Rennes le 7 fevrier, 4-2 (Win) @Troyes le 4 fevrier.",
  ];
};

const toFrenchPreview = (value?: string) => {
  const source = (value || "").trim();
  if (!source) return "";

  const normalized = normalizeText(source);
  if (normalized.includes("udinese") && normalized.includes("sassuolo")) {
    return [
      "⚽ SOCCER: Sassuolo a Udinese, 06:30 ET",
      "MATCH DU JOUR: Udinese vs Sassuolo en Serie A.",
      "L'attaque d'Udinese est en grande forme, tandis que la defense de Sassuolo est fragile.",
      "Les statistiques recentes et le contexte du match donnent un vrai avantage a Udinese.",
      "PICK: victoire d'Udinese.",
      "Conseil SNIPY: prendre la value tot avant variation des cotes.",
    ].join(" ");
  }

  return source
    .replace(/Hide Full Description/gi, "Masquer la description complete")
    .replace(/Welcome,\s*Zcoders!?/gi, "Bienvenue, Zcoders !")
    .replace(/Tomorrow'?s\s+GAME OF THE DAY/gi, "Le MATCH DU JOUR d'aujourd'hui")
    .replace(/GAME OF THE DAY/gi, "MATCH DU JOUR")
    .replace(/tomorrow/gi, "aujourd'hui")
    .replace(/Lock in a WIN for ([^.!\n]+)/gi, "Notre pick: victoire de $1")
    .replace(/Follow Zcode for AI picks with remarkable win rates!?/gi, "Suis Zcode pour des picks IA performants.")
    .replace(/\s+/g, " ")
    .trim();
};

const readRaw = () => {
  try {
    return localStorage.getItem(STORAGE_KEY) || localStorage.getItem(PUBLIC_BETS_STORAGE_KEY) || seedRaw;
  } catch {
    return seedRaw;
  }
};

const saveRaw = (value: string) => {
  try {
    localStorage.setItem(STORAGE_KEY, value);
  } catch {
    // ignore
  }
};

export default function MonitorPage() {
  const { getTeamPowerRanking } = useZCode();
  const isAdmin = import.meta.env.VITE_ADMIN_IMPORT === "true";
  const [activeTab, setActiveTab] = useState<"fixtures" | "picks">("fixtures");
  const [rawText, setRawText] = useState<string>(() => readRaw());
  const [status, setStatus] = useState<string>("");

  const fixtures = useMemo(() => parsePublicBetsText(rawText), [rawText]);
  const picks = useMemo(() => {
    const strict = parseVipPicks(rawText);
    const loose = parseLoosePicks(rawText);
    const byKey = new Map<string, VipPick>();
    [...strict, ...loose].forEach((pick) => {
      const key = normalizeText(`${pick.homeTeam}|${pick.awayTeam}|${pick.league}|${pick.placedAt}`);
      if (!byKey.has(key)) byKey.set(key, pick);
    });
    return Array.from(byKey.values()).filter((pick) => {
      const hasMainProb = hasAnyPercent(pick.probabilities.home, pick.probabilities.draw, pick.probabilities.away);
      const hasPublic = hasNonZeroTriplet(pick.publicMoneyline) || hasAnyPercent(pick.publicSpread?.home, pick.publicSpread?.away) || hasAnyPercent(pick.publicTotals?.under, pick.publicTotals?.over);
      const hasCoreData =
        hasMainProb ||
        hasPublic ||
        !!pick.pointSpreadForecast ||
        !!pick.totalLine ||
        !!pick.homeTT ||
        !!pick.awayTT ||
        !!pick.scorePrediction ||
        typeof pick.confidence === "number" ||
        !!pick.liveScore ||
        !!pick.gameResult ||
        (pick.hotTrends?.length ?? 0) > 0 ||
        (pick.recommendations?.length ?? 0) > 0 ||
        (pick.publicTickets?.length ?? 0) > 0 ||
        !!pick.homeProfile?.odd ||
        !!pick.awayProfile?.odd ||
        !!pick.homeProfile?.powerRank ||
        !!pick.awayProfile?.powerRank;
      return hasCoreData;
    });
  }, [rawText]);

  const fixtureCards = useMemo(() => {
    return fixtures.map((fixture, index) => ({
      id: `${fixture.league || "league"}-${fixture.team1.name}-${fixture.team2.name}-${index}`,
      league: fixture.league || "League",
      date: fixture.dateLabel || "",
      homeTeam: fixture.team1.name,
      awayTeam: fixture.team2.name,
      publicML: {
        home: fixture.team1.mlPublic ?? 0,
        draw:
          typeof fixture.team1.mlPublic === "number" && typeof fixture.team2.mlPublic === "number"
            ? Math.max(0, 100 - fixture.team1.mlPublic - fixture.team2.mlPublic)
            : 0,
        away: fixture.team2.mlPublic ?? 0,
      },
      cashAll: {
        home: fixture.team1.spreadPublic ?? 0,
        draw: 0,
        away: fixture.team2.spreadPublic ?? 0,
      },
      odds: {
        home: fixture.team1.odd,
        away: fixture.team2.odd,
      },
      totals: {
        over: fixture.publicOver,
        under: fixture.publicUnder,
      },
    }));
  }, [fixtures]);
  const formatPreview = (text?: string) => toFrenchPreview(text);

  const saveInput = () => {
    saveRaw(rawText);
    setStatus(`Monitor text saved. Fixtures: ${fixtures.length}, picks: ${picks.length}`);
  };

  const applySample = () => {
    setRawText(seedRaw);
    saveRaw(seedRaw);
    setStatus("Sample monitor data loaded.");
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
        <div className="rounded-2xl web3-panel p-6 mb-6 web3-float">
          <div className="text-sm text-cyan-200 mb-1">Monitor Window</div>
          <h1 className="text-3xl lg:text-4xl font-black mb-2 vivid-title">Monitor Inject</h1>
          <p className="text-gray-300">
            Public market monitor and VIP picks in one place, auto-organized with percentages, odds, money flow, and
            team status.
          </p>
        </div>

        {isAdmin && (
          <div className="rounded-2xl web3-card p-4 mb-6">
            <div className="text-cyan-200 font-bold mb-2">Admin Import (raw text)</div>
            <textarea
              value={rawText}
              onChange={(event) => setRawText(event.target.value)}
              rows={10}
              placeholder="Paste monitor text here..."
              className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-gray-500"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={saveInput}
                className="rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-200"
              >
                Save monitor data
              </button>
              <button
                type="button"
                onClick={applySample}
                className="rounded-lg border border-emerald-400/40 bg-emerald-500/10 px-3 py-2 text-sm font-semibold text-emerald-200"
              >
                Load sample
              </button>
            </div>
            {status && <div className="mt-2 text-xs text-emerald-300">{status}</div>}
          </div>
        )}

        <div className="rounded-2xl web3-card p-4 mb-4">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTab("fixtures")}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${
                activeTab === "fixtures"
                  ? "bg-cyan-500/25 border border-cyan-300/45 text-white"
                  : "bg-white/5 border border-white/10 text-gray-300"
              }`}
            >
              Fixtures Monitor ({fixtureCards.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("picks")}
              className={`px-4 py-2 rounded-lg text-sm font-bold ${
                activeTab === "picks"
                  ? "bg-emerald-500/25 border border-emerald-300/45 text-white"
                  : "bg-white/5 border border-white/10 text-gray-300"
              }`}
            >
              VIP Picks Monitor ({picks.length})
            </button>
          </div>
        </div>

        {activeTab === "fixtures" && (
          <div className="grid gap-4">
            {fixtureCards.map((fixture, index) => (
              <div
                key={fixture.id}
                className="rounded-2xl web3-card p-4 sm:p-5 border border-cyan-500/25 match-reveal"
                style={{ animationDelay: `${Math.min(index * 25, 220)}ms` }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                  <div className="text-xs text-cyan-200 font-bold">{fixture.date || "No date"}</div>
                  <div className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-cyan-100">
                    <LeagueNameWithLogo
                      leagueName={fixture.league}
                      logoSizeClassName="w-6 h-6"
                    />
                  </div>
                </div>

                <div className="grid lg:grid-cols-[1fr_1.4fr] gap-4">
                  <div>
                    <div className="text-lg sm:text-xl font-black text-white">
                      <TeamNameWithLogo teamName={fixture.homeTeam} textClassName="text-white" logoSizeClassName="w-6 h-6" />
                    </div>
                    <div className="mt-1">
                      <PowerRankingBadge ranking={getTeamPowerRanking(fixture.homeTeam)} compact />
                    </div>
                    <div className="text-sm text-cyan-200 mt-1">Odd {fixture.odds.home?.toFixed(3) ?? "N/A"}</div>

                    <div className="mt-2 text-lg sm:text-xl font-black text-white">
                      <TeamNameWithLogo teamName={fixture.awayTeam} textClassName="text-white" logoSizeClassName="w-6 h-6" />
                    </div>
                    <div className="mt-1">
                      <PowerRankingBadge ranking={getTeamPowerRanking(fixture.awayTeam)} compact />
                    </div>
                    <div className="text-sm text-cyan-200 mt-1">Odd {fixture.odds.away?.toFixed(3) ?? "N/A"}</div>

                    {(fixture.totals.over !== undefined || fixture.totals.under !== undefined) && (
                      <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
                        Totals public: Over {fixture.totals.over?.toFixed(1) ?? "-"}% | Under {fixture.totals.under?.toFixed(1) ?? "-"}%
                      </div>
                    )}
                  </div>

                  <PublicMoneyGraph
                    homeTeam={fixture.homeTeam}
                    awayTeam={fixture.awayTeam}
                    publicML={fixture.publicML}
                    cashAll={fixture.cashAll}
                  />
                </div>
              </div>
            ))}

            {fixtureCards.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
                No fixtures parsed yet. Paste monitor text in admin mode.
              </div>
            )}
          </div>
        )}

        {activeTab === "picks" && (
          <div className="grid gap-5">
            {picks.map((pick, index) => (
              <div
                key={pick.id}
                className="rounded-2xl web3-card p-4 sm:p-5 border border-emerald-500/25 match-reveal"
                style={{ animationDelay: `${Math.min(index * 25, 220)}ms` }}
              >
                {pick.placedAt && <div className="text-xs text-gray-300 mb-1">{pick.placedAt}</div>}
                <div className="text-lg sm:text-xl font-black text-white mb-3">
                  {pick.homeTeam} at {pick.awayTeam} ({pick.sport}, {pick.league})
                </div>

                <div className="grid xl:grid-cols-[1.2fr_1fr] gap-4">
                  <div className="space-y-3">
                    <div className="rounded-xl border border-cyan-500/30 bg-[#12284f] p-3">
                      {hasAnyPercent(pick.probabilities.home, pick.probabilities.draw, pick.probabilities.away) && (
                        <>
                          <div className="grid grid-cols-3 text-sm font-bold mb-2">
                            <span className="text-emerald-300">{pick.probabilities.home.toFixed(0)}%</span>
                            <span className="text-gray-300 text-center">{pick.probabilities.draw.toFixed(0)}%</span>
                            <span className="text-rose-300 text-right">{pick.probabilities.away.toFixed(0)}%</span>
                          </div>
                          <div className="h-4 overflow-hidden rounded-md flex graph-animated">
                            <div className="bg-emerald-400/90" style={{ width: `${pick.probabilities.home}%` }} />
                            <div className="bg-slate-300/80" style={{ width: `${pick.probabilities.draw}%` }} />
                            <div className="bg-rose-500/90" style={{ width: `${pick.probabilities.away}%` }} />
                          </div>
                        </>
                      )}

                      <div className="mt-3 text-sm text-gray-100 space-y-1">
                        {pick.pointSpreadForecast && <div>Point Spread forecast: <span className="font-bold text-cyan-200">{pick.pointSpreadForecast}</span></div>}
                        {pick.totalLine && <div>Total: <span className="font-bold text-cyan-200">{pick.totalLine}</span></div>}
                        {pick.homeTT && <div>{pick.homeTeam} TT: <span className="font-bold text-cyan-200">{pick.homeTT}</span></div>}
                        {pick.awayTT && <div>{pick.awayTeam} TT: <span className="font-bold text-cyan-200">{pick.awayTT}</span></div>}
                      </div>
                    </div>

                    {pick.hotTrends.length > 0 && (
                      <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3">
                        <div className="text-amber-200 font-bold mb-1">Hot Trends</div>
                        <ul className="text-sm text-amber-100 space-y-1">
                          {pick.hotTrends.slice(0, 4).map((line, idx) => (
                            <li key={`${pick.id}-hot-${idx}`}>• {line}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {pick.recommendations.length > 0 && (
                      <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3">
                        <div className="text-emerald-200 font-bold mb-1">Recommendation & odds</div>
                        <ul className="text-sm text-emerald-100 space-y-1">
                          {pick.recommendations.slice(0, 4).map((line, idx) => (
                            <li key={`${pick.id}-rec-${idx}`}>• {line}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(pick.liveScore || pick.gameResult) && (
                      <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-3 text-sm">
                        {pick.liveScore && <div className="text-rose-100 font-bold">Live Score: {pick.liveScore}</div>}
                        {pick.gameResult && <div className="text-rose-100 font-bold">Resultat: {pick.gameResult}</div>}
                      </div>
                    )}

                    {pick.vegasTrap && (
                      <div className="rounded-xl border border-yellow-500/35 bg-yellow-500/10 p-3 text-sm text-yellow-100">
                        Attention possible piege Vegas (public tres charge et mouvement de ligne oppose).
                      </div>
                    )}

                    {pick.publicTickets && pick.publicTickets.length > 0 && (
                      <div className="rounded-xl border border-indigo-500/35 bg-indigo-500/10 p-3">
                        <div className="text-indigo-200 font-bold mb-1">Public Tickets</div>
                        <ul className="text-sm text-indigo-100 space-y-1">
                          {pick.publicTickets.map((line, idx) => (
                            <li key={`${pick.id}-ticket-${idx}`}>• {line}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {(pick.lineMovesMoney?.length || pick.lineMovesSpread?.length) && (
                      <div className="rounded-xl border border-fuchsia-500/35 bg-fuchsia-500/10 p-3">
                        <div className="text-fuchsia-200 font-bold mb-1">Line Moves</div>
                        {pick.lineMovesMoney && pick.lineMovesMoney.length > 0 && (
                          <div className="mb-2">
                            <div className="text-xs font-bold text-fuchsia-100">Money Line</div>
                            <ul className="text-xs text-fuchsia-50 space-y-1">
                              {pick.lineMovesMoney.map((line, idx) => (
                                <li key={`${pick.id}-money-${idx}`}>• {line}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {pick.lineMovesSpread && pick.lineMovesSpread.length > 0 && (
                          <div>
                            <div className="text-xs font-bold text-fuchsia-100">Spread Line</div>
                            <ul className="text-xs text-fuchsia-50 space-y-1">
                              {pick.lineMovesSpread.map((line, idx) => (
                                <li key={`${pick.id}-spread-${idx}`}>• {line}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="rounded-xl border border-white/15 bg-[#1b2436] p-3">
                      <div className="grid sm:grid-cols-3 gap-2 text-xs">
                        {[
                          "Power Ranks Indicator",
                          "Head2Head",
                          "Oscillator",
                          "Totals Predictor",
                          "Last 10 Games",
                          "Volatility Oscillator",
                        ].map((tool) => (
                          <div key={`${pick.id}-${tool}`} className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-gray-200">
                            {tool}
                          </div>
                        ))}
                      </div>
                    </div>

                    {(hasAnyPercent((pick.publicMoneyline ?? pick.probabilities).home, (pick.publicMoneyline ?? pick.probabilities).draw, (pick.publicMoneyline ?? pick.probabilities).away) ||
                      hasAnyPercent(pick.publicSpread?.home, pick.publicSpread?.away) ||
                      hasAnyPercent(pick.publicTotals?.under, pick.publicTotals?.over)) && (
                    <div className="rounded-xl border border-lime-500/35 bg-lime-500/10 p-3">
                      <div className="text-lime-200 font-bold mb-2 text-center">SNIPY CONSENSUS</div>
                      <div className="space-y-2 text-xs text-gray-100">
                        {hasAnyPercent((pick.publicMoneyline ?? pick.probabilities).home, (pick.publicMoneyline ?? pick.probabilities).draw, (pick.publicMoneyline ?? pick.probabilities).away) && (
                        <div>
                          <div className="mb-1">Moneyline</div>
                          <div className="h-4 overflow-hidden rounded-md flex">
                            <div className="bg-emerald-500" style={{ width: `${pct((pick.publicMoneyline ?? pick.probabilities).home)}%` }} />
                            <div className="bg-gray-300" style={{ width: `${pct((pick.publicMoneyline ?? pick.probabilities).draw)}%` }} />
                            <div className="bg-blue-500" style={{ width: `${pct((pick.publicMoneyline ?? pick.probabilities).away)}%` }} />
                          </div>
                        </div>
                        )}
                        {hasAnyPercent(pick.publicSpread?.home, pick.publicSpread?.away) && (
                        <div>
                          <div className="mb-1">Spread</div>
                          <div className="h-4 overflow-hidden rounded-md flex">
                            <div className="bg-emerald-500" style={{ width: `${pct(pick.publicSpread?.home)}%` }} />
                            <div className="bg-blue-500" style={{ width: `${pct(pick.publicSpread?.away)}%` }} />
                          </div>
                        </div>
                        )}
                        {hasAnyPercent(pick.publicTotals?.under, pick.publicTotals?.over) && (
                        <div>
                          <div className="mb-1">Totals</div>
                          <div className="h-4 overflow-hidden rounded-md flex">
                            <div className="bg-rose-500" style={{ width: `${pct(pick.publicTotals?.under)}%` }} />
                            <div className="bg-sky-500" style={{ width: `${pct(pick.publicTotals?.over)}%` }} />
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                    )}

                    {(hasAnyPercent((pick.publicMoneyline ?? pick.probabilities).home, (pick.publicMoneyline ?? pick.probabilities).draw, (pick.publicMoneyline ?? pick.probabilities).away) ||
                      hasAnyPercent(pick.publicSpread?.home, pick.publicSpread?.away) ||
                      hasAnyPercent(pick.publicTotals?.under, pick.publicTotals?.over)) && (
                    <div className="rounded-xl border border-cyan-500/35 bg-cyan-500/10 p-3">
                      <div className="text-cyan-200 font-bold mb-2">Public Percentages</div>
                      <div className="grid sm:grid-cols-3 gap-3">
                        {hasAnyPercent((pick.publicMoneyline ?? pick.probabilities).home, (pick.publicMoneyline ?? pick.probabilities).draw, (pick.publicMoneyline ?? pick.probabilities).away) && (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                          <div className="text-xs text-gray-300 mb-1">Moneyline</div>
                          <div className="w-14 h-14 rounded-full mx-auto" style={circleStyle((pick.publicMoneyline ?? pick.probabilities).home, (pick.publicMoneyline ?? pick.probabilities).away, (pick.publicMoneyline ?? pick.probabilities).draw)} />
                          <div className="text-[11px] text-gray-200 mt-2">
                            <div>H {pct((pick.publicMoneyline ?? pick.probabilities).home).toFixed(0)}%</div>
                            <div>A {pct((pick.publicMoneyline ?? pick.probabilities).away).toFixed(0)}%</div>
                            <div>D {pct((pick.publicMoneyline ?? pick.probabilities).draw).toFixed(0)}%</div>
                          </div>
                        </div>
                        )}
                        {hasAnyPercent(pick.publicSpread?.home, pick.publicSpread?.away) && (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                          <div className="text-xs text-gray-300 mb-1">Spread</div>
                          <div className="w-14 h-14 rounded-full mx-auto" style={circleStyle(pct(pick.publicSpread?.home), pct(pick.publicSpread?.away), 0)} />
                          <div className="text-[11px] text-gray-200 mt-2">
                            <div>H {pct(pick.publicSpread?.home).toFixed(0)}%</div>
                            <div>A {pct(pick.publicSpread?.away).toFixed(0)}%</div>
                          </div>
                        </div>
                        )}
                        {hasAnyPercent(pick.publicTotals?.under, pick.publicTotals?.over) && (
                        <div className="rounded-lg border border-white/10 bg-white/5 p-2">
                          <div className="text-xs text-gray-300 mb-1">Totals</div>
                          <div className="w-14 h-14 rounded-full mx-auto" style={circleStyle(pct(pick.publicTotals?.under), pct(pick.publicTotals?.over), 0)} />
                          <div className="text-[11px] text-gray-200 mt-2">
                            <div>Under {pct(pick.publicTotals?.under).toFixed(0)}%</div>
                            <div>Over {pct(pick.publicTotals?.over).toFixed(0)}%</div>
                          </div>
                        </div>
                        )}
                      </div>
                    </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      {[
                        { team: pick.homeTeam, profile: pick.homeProfile },
                        { team: pick.awayTeam, profile: pick.awayProfile },
                      ].map((item) => (
                        <div key={`${pick.id}-${item.team}`} className="rounded-xl border border-white/15 bg-[#222a39] p-3">
                          <div className="text-base font-black text-white mb-1">
                            <TeamNameWithLogo teamName={item.team} textClassName="text-white" logoSizeClassName="w-6 h-6" />
                          </div>
                          <div className="text-xs text-gray-300">ODD <span className="font-bold text-cyan-200">{item.profile?.odd ?? "-"}</span></div>
                          <div className="text-xs text-gray-300">POWER RANK <span className="font-bold text-cyan-200">{item.profile?.powerRank ?? "-"}</span></div>
                          <div className="mt-2"><PowerRankingBadge ranking={getTeamPowerRanking(item.team)} compact /></div>
                          {item.profile?.status && <div className="text-xs text-gray-200 mt-1">Status: {item.profile.status}</div>}
                          {item.profile?.streak && <div className="text-xs text-gray-200">Streak: {item.profile.streak}</div>}
                          {item.profile?.last6 && <div className="text-xs text-gray-200">Last 6: {item.profile.last6}</div>}
                        </div>
                      ))}
                    </div>

                    <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/10 p-3 text-sm">
                      <div className="text-indigo-200 font-bold mb-1">Prediction summary</div>
                      <div className="text-gray-100">Score prediction: {pick.scorePrediction ?? "-"}</div>
                      <div className="text-gray-100">Confidence: {pick.confidence?.toFixed(1) ?? "-"}%</div>
                      {pick.summary && <div className="text-gray-200 mt-2">{pick.summary}</div>}
                    </div>

                    {getFrenchSpecialNarrative(pick) && (
                      <div className="rounded-xl border border-emerald-500/35 bg-emerald-500/10 p-3 text-sm">
                        <div className="text-emerald-200 font-bold mb-1">Analyse en francais</div>
                        <ul className="text-emerald-100 space-y-1">
                          {getFrenchSpecialNarrative(pick)?.map((line, idx) => (
                            <li key={`${pick.id}-fr-${idx}`}>• {line}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {isMeaningfulText(pick.matchPreview) && (
                      <div className="rounded-xl border border-sky-500/35 bg-sky-500/10 p-3 text-sm">
                        <div className="text-sky-200 font-bold mb-1">Apercu du match</div>
                        <div className="text-sky-100">{formatPreview(pick.matchPreview)}</div>
                      </div>
                    )}

                    {isMeaningfulText(pick.zcodeAiNote) &&
                      normalizeText(pick.zcodeAiNote || "") !== normalizeText(pick.matchPreview || "") && (
                      <div className="rounded-xl border border-purple-500/35 bg-purple-500/10 p-3 text-sm">
                        <div className="text-purple-200 font-bold mb-1">SNIPY AI</div>
                        <div className="text-purple-100">{formatPreview(pick.zcodeAiNote)}</div>
                      </div>
                    )}

                    <PublicMoneyGraph
                      homeTeam={pick.homeTeam}
                      awayTeam={pick.awayTeam}
                      publicML={pick.publicMoneyline ?? pick.probabilities}
                      cashAll={
                        pick.publicSpread
                          ? { home: pick.publicSpread.home, draw: 0, away: pick.publicSpread.away }
                          : undefined
                      }
                      compact
                    />

                    {pick.publicTotals && (
                      <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">
                        Totals: Under {pick.publicTotals.under.toFixed(1)}% | Over {pick.publicTotals.over.toFixed(1)}%
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {picks.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
                No VIP picks parsed yet. Paste monitor text in admin mode.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
