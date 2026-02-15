import * as XLSX from "xlsx";
import type { League, Match, Sport } from "../data/mockData";

export type SupportedSportId =
  | "soccer"
  | "basketball"
  | "tennis"
  | "hockey"
  | "baseball"
  | "football";

const SPORT_META: Record<SupportedSportId, Pick<Sport, "name" | "icon">> = {
  soccer: { name: "Soccer", icon: "⚽" },
  basketball: { name: "Basketball", icon: "🏀" },
  tennis: { name: "Tennis", icon: "🎾" },
  hockey: { name: "Hockey", icon: "🏒" },
  baseball: { name: "Baseball", icon: "⚾" },
  football: { name: "American Football", icon: "🏈" },
};

const SPORT_ALIAS: Array<{ token: string; id: SupportedSportId }> = [
  { token: "american football", id: "football" },
  { token: "football", id: "football" },
  { token: "soccer", id: "soccer" },
  { token: "basketball", id: "basketball" },
  { token: "tennis", id: "tennis" },
  { token: "hockey", id: "hockey" },
  { token: "baseball", id: "baseball" },
];

const HEADER_ALIASES = {
  sport: ["sport"],
  league: ["league", "competition", "tournament", "championship"],
  game: ["game", "match", "fixture", "event"],
  home: ["home", "home team", "team 1", "team1", "participant1"],
  away: ["away", "away team", "team 2", "team2", "participant2"],
  kickoff: ["kickoff", "date", "match date", "datetime", "time"],
  mlHome: ["moneyline 1", "odds home", "home odds"],
  mlAway: ["moneyline 2", "odds away", "away odds"],
  mlDraw: ["moneyline draw", "odds draw", "draw odds"],
  openingHome: ["opening home", "opening odds home", "opening 1"],
  openingDraw: ["opening draw", "opening odds draw", "opening x"],
  openingAway: ["opening away", "opening odds away", "opening 2"],
  currentHome: ["current home", "current odds home", "current 1"],
  currentDraw: ["current draw", "current odds draw", "current x"],
  currentAway: ["current away", "current odds away", "current 2"],
  openingTriplet: ["opening 1x2", "opening odds", "opening lines", "opening"],
  currentTriplet: ["current 1x2", "current odds", "current lines", "current"],
  probabilityHome: ["probability 1", "home probability", "home %"],
  probabilityAway: ["probability 2", "away probability", "away %"],
  probabilityDraw: ["probability draw", "draw probability", "draw %"],
  predScoreHome: ["predicted score 1", "home score", "xg home"],
  predScoreAway: ["predicted score 2", "away score", "xg away"],
  confidence: ["confidence", "model confidence"],
  stars: ["stars", "rating", "trust"],
  signals: ["signals", "signal", "tags", "notes"],
  hotTrend: ["hot trend", "hot trends", "hottrend", "hottrends", "trend", "trends"],
  otherPredictions: ["other predictions", "prediction basis", "rationale", "analysis"],
  realScore: ["real score", "final score", "live score"],
  finalScore: ["final score"],
  firstHalfResult: ["first half result"],
  publicMlHome: ["public % ml team 1"],
  publicMlAway: ["public % ml team 2"],
  publicMlDraw: ["public % ml draw"],
  publicAllHome: ["all public % team 1"],
  publicAllAway: ["all public % team 2"],
  publicAllDraw: ["all public % draw"],
  cashAllHome: ["all cash % team 1"],
  cashAllAway: ["all cash % team 2"],
  cashAllDraw: ["all cash % draw"],
  cashAmountHome: ["all cash team 1"],
  cashAmountAway: ["all cash team 2"],
  cashAmountDraw: ["all cash draw"],
  publicRatioHome: ["public ratio team 1"],
  publicRatioAway: ["public ratio team 2"],
  cashRatioHome: ["cash ratio team 1"],
  cashRatioAway: ["cash ratio team 2"],
} as const;

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const normalizeKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const toText = (value: unknown) => (value == null ? "" : String(value).trim());

const isNullLike = (value: unknown) => {
  const text = toText(value).toLowerCase();
  return text === "" || text === "n/a" || text === "na" || text === "undefined" || text === "null";
};

const toNumber = (value: unknown, fallback = 0) => {
  if (isNullLike(value)) return fallback;
  const cleaned = toText(value).replace(/,/g, ".");
  const num = Number(cleaned);
  return Number.isFinite(num) ? num : fallback;
};

const toPercentDecimal = (value: unknown, fallback = 0) => {
  if (isNullLike(value)) return fallback;
  const raw = toText(value);
  const numeric = Number(raw.replace("%", "").replace(/,/g, "."));
  if (!Number.isFinite(numeric)) return fallback;
  if (raw.includes("%")) return numeric / 100;
  if (numeric > 1) return numeric / 100;
  return numeric;
};

const decimalToPercentPoints = (value: number) => {
  const points = value * 100;
  return Math.max(0, Math.min(100, Math.round(points * 100) / 100));
};

const toPercentPoints = (value: unknown, fallback = 0) => {
  if (isNullLike(value)) return fallback;
  const raw = toText(value);
  if (raw.includes("%")) return decimalToPercentPoints(toPercentDecimal(raw, fallback / 100));
  const numeric = toNumber(raw, fallback);
  if (numeric > 0 && numeric <= 1) return decimalToPercentPoints(numeric);
  return Math.max(0, Math.min(100, numeric));
};

const toIsoKickoff = (value: unknown) => {
  if (isNullLike(value)) return new Date().toISOString();

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString();
  }

  if (typeof value === "number") {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      const date = new Date(
        Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H ?? 0, parsed.M ?? 0, parsed.S ?? 0)
      );
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
  }

  if (typeof value === "string") {
    const cleaned = value
      .replace(/\u00a0/g, " ")
      .replace(/\n/g, " ")
      .replace(/(\d{1,2})(st|nd|rd|th)/gi, "$1")
      .replace(/\([^)]*\)/g, "")
      .replace(/\bET\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();
    const normalized = cleaned.replace(/\./g, "-").replace(/\//g, "-");
    const date = new Date(normalized);
    if (!Number.isNaN(date.getTime())) return date.toISOString();
  }

  return new Date().toISOString();
};

const parseScorePair = (value: unknown, fallbackHome = 1, fallbackAway = 1) => {
  const text = toText(value);
  const match = text.match(/(\d+)\s*[:\-]\s*(\d+)/);
  if (!match) return { home: fallbackHome, away: fallbackAway };
  return { home: Number(match[1]), away: Number(match[2]) };
};

const parseOddsTriplet = (value: unknown) => {
  const text = toText(value);
  const numbers = text
    .split(/[-|/]/)
    .map((entry) => Number(entry.trim().replace(",", ".")))
    .filter((entry) => Number.isFinite(entry) && entry > 0);
  if (numbers.length < 3) return null;
  return {
    home: numbers[0],
    draw: numbers[1],
    away: numbers[2],
  };
};

const extractLiveScore = (value: unknown): string | undefined => {
  const text = toText(value);
  const match = text.match(/(\d+)\s*[:\-]\s*(\d+)/);
  if (!match) return undefined;
  return `${match[1]}:${match[2]}`;
};

const normalizeTeamKey = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");

const detectSportFromText = (value: string): SupportedSportId | null => {
  const normalized = value.toLowerCase();
  const found = SPORT_ALIAS.find(({ token }) => normalized.includes(token));
  return found ? found.id : null;
};

const detectSport = (
  rowSportValue: unknown,
  worksheetName: string,
  fileName: string,
  fallbackSportId: SupportedSportId
) => {
  const fromRow = detectSportFromText(toText(rowSportValue));
  if (fromRow) return fromRow;
  const fromSheet = detectSportFromText(worksheetName);
  if (fromSheet) return fromSheet;
  const fromFile = detectSportFromText(fileName);
  if (fromFile) return fromFile;
  return fallbackSportId;
};

const findHeaderRowIndex = (matrix: unknown[][]) => {
  for (let index = 0; index < Math.min(matrix.length, 25); index += 1) {
    const normalized = (matrix[index] ?? []).map((cell) => normalizeKey(toText(cell)));
    const hasGame = normalized.includes(normalizeKey("Game"));
    const hasLeague = normalized.includes(normalizeKey("League"));
    if (hasGame && hasLeague) return index;
  }
  return 0;
};

const buildHeaderMap = (headerRow: unknown[]) => {
  const map = new Map<string, number>();
  headerRow.forEach((header, index) => {
    const key = normalizeKey(toText(header));
    if (key) map.set(key, index);
  });
  return map;
};

const readByAlias = (
  row: unknown[],
  headerMap: Map<string, number>,
  aliases: readonly string[]
) => {
  for (const alias of aliases) {
    const idx = headerMap.get(normalizeKey(alias));
    if (idx === undefined) continue;
    const value = row[idx];
    if (!isNullLike(value)) return value;
  }
  return null;
};

const readByHeaderContains = (
  row: unknown[],
  headerMap: Map<string, number>,
  patterns: readonly string[]
) => {
  const normalizedPatterns = patterns.map((pattern) => normalizeKey(pattern));
  for (const [headerKey, index] of headerMap.entries()) {
    if (!normalizedPatterns.some((pattern) => headerKey.includes(pattern))) continue;
    const value = row[index];
    if (!isNullLike(value)) return value;
  }
  return null;
};

const splitTeams = (raw: string) => {
  const separators = [" vs ", " v ", " - ", " — ", " – ", " @ "];
  for (const separator of separators) {
    if (!raw.includes(separator)) continue;
    const [home, away] = raw.split(separator).map((part) => part.trim());
    if (home && away) return { home, away };
  }

  return null;
};

const makeTopScores = (home: number, away: number): Match["topScores"] => {
  const options: Match["topScores"] = [
    { home, away, probability: 21 },
    { home: Math.max(0, home - 1), away, probability: 16 },
    { home, away: Math.max(0, away - 1), probability: 14 },
    { home: home + 1, away, probability: 12 },
    { home, away: away + 1, probability: 10 },
    { home: Math.max(0, home - 1), away: Math.max(0, away - 1), probability: 9 },
    { home: home + 1, away: away + 1, probability: 7 },
    { home: Math.max(0, home - 2), away, probability: 5 },
    { home, away: Math.max(0, away - 2), probability: 4 },
    { home: home + 2, away: away + 1, probability: 2 },
  ];

  return options;
};

const parseOtherPredictions = (text: string) => {
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);

  const draw = lines.find((line) => /^draw\s+/i.test(line));
  const btts = lines.find((line) => /^btts\s+/i.test(line));
  const total25 = lines.find((line) => /total\s*>\s*2\.5/i.test(line));

  return {
    basis: lines,
    drawDecimal: draw ? toPercentDecimal(draw.match(/(\d+(?:[.,]\d+)?)%?/)?.[1] ?? null, 0) : null,
    bttsDecimal: btts ? toPercentDecimal(btts.match(/(\d+(?:[.,]\d+)?)%?/)?.[1] ?? null, 0.5) : null,
    over25Decimal: total25
      ? toPercentDecimal(total25.match(/(\d+(?:[.,]\d+)?)%?/)?.[1] ?? null, 0.5)
      : null,
  };
};

const buildPredictionsMatchKey = (team1: string, team2: string) =>
  `${normalizeTeamKey(team1)}|${normalizeTeamKey(team2)}`;

const remapTotalsTeamHeader = (header: string) => {
  const normalized = header.replace(/\s+/g, " ").trim();
  if (/^total\s*team\s*1$/i.test(normalized)) return "TOTAL Away team";
  if (/^total\s*team\s*2$/i.test(normalized)) return "TOTAL Home team";
  return header;
};

const buildPredictionsSheetMap = (
  workbook: XLSX.WorkBook,
  sheetName: string,
  label: string
): Map<string, { label: string; value: string }> => {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) return new Map();
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  if (!matrix.length) return new Map();

  const headerRow = matrix[0] ?? [];
  const headers = headerRow.map((cell) => toText(cell));
  const normalized = headers.map((header) => normalizeKey(header.replace(/\u00a0/g, " ")));
  const col = (key: string) => normalized.findIndex((header) => header === normalizeKey(key));

  const team1Col = col("team1");
  const team2Col = col("team2");
  if (team1Col < 0 || team2Col < 0) return new Map();

  const map = new Map<string, { label: string; value: string }>();

  matrix.slice(1).forEach((row) => {
    const team1 = toText(row[team1Col]);
    const team2 = toText(row[team2Col]);
    if (!team1 || !team2) return;

    const details = headers
      .map((header, index) => ({ header, value: toText(row[index]) }))
      .filter(
        (entry, index) =>
          entry.value &&
          index !== team1Col &&
          index !== team2Col
      )
      .map((entry) => `${remapTotalsTeamHeader(entry.header)}: ${entry.value}`);

    if (details.length === 0) return;
    map.set(buildPredictionsMatchKey(team1, team2), { label, value: details.join(" | ") });
  });

  return map;
};

export type ParsedSportImport = {
  sport: Sport;
  leagues: League[];
  matches: Match[];
};

export type MonitorFormat = "monitor" | "predictions9" | "soccerbuddy10";

export type BundledMonitor = {
  url: string;
  sportId: SupportedSportId;
  format?: MonitorFormat;
};

export type ParsedSiteImport = {
  sports: Sport[];
  leagues: League[];
  matches: Match[];
};

export type LiveBotSignalImport = {
  id: string;
  createdAt: string;
  sport: string;
  title: string;
  note: string;
  active: boolean;
  league: string;
  match: string;
  bet: string;
  odd: string;
  unit: string;
  result: string;
  score: string;
};

export type ParsedLiveBotImport = {
  signals: LiveBotSignalImport[];
  importedCount: number;
  skippedCount: number;
};

export async function parseSportWorkbook(
  file: File,
  sportId: SupportedSportId
): Promise<ParsedSportImport> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Workbook does not contain any sheets.");
  }
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${sheetName}" cannot be read.`);
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  if (!matrix.length) {
    throw new Error("Workbook sheet is empty.");
  }

  const headerIndex = findHeaderRowIndex(matrix);
  const headerRow = matrix[headerIndex] ?? [];
  const headerMap = buildHeaderMap(headerRow);
  const dataRows = matrix.slice(headerIndex + 1);
  const leagueNameById = new Map<string, string>();

  let importedCount = 0;
  let skippedCount = 0;
  let detectedSportId: SupportedSportId = sportId;

  const matches = dataRows
    .map<Match | null>((row, index) => {
      if (!Array.isArray(row) || row.every((cell) => isNullLike(cell))) {
        skippedCount += 1;
        return null;
      }

      const rowSport = readByAlias(row, headerMap, HEADER_ALIASES.sport);
      detectedSportId = detectSport(rowSport, sheetName, file.name, detectedSportId);

      const home = readByAlias(row, headerMap, HEADER_ALIASES.home);
      const away = readByAlias(row, headerMap, HEADER_ALIASES.away);
      const game = readByAlias(row, headerMap, HEADER_ALIASES.game);

      let homeTeam = toText(home);
      let awayTeam = toText(away);
      if ((!homeTeam || !awayTeam) && game) {
        const parsed = splitTeams(toText(game));
        if (parsed) {
          homeTeam = parsed.home.trim();
          awayTeam = parsed.away.trim();
        }
      }

      if (!homeTeam || !awayTeam) {
        skippedCount += 1;
        return null;
      }

      const rawLeague = readByAlias(row, headerMap, HEADER_ALIASES.league);
      const leagueName = toText(rawLeague) || "Unknown League";
      const leagueId = `${detectedSportId}-${slugify(leagueName) || "unknown"}`;
      leagueNameById.set(leagueId, leagueName);

      const homeProbDec = toPercentDecimal(
        readByAlias(row, headerMap, HEADER_ALIASES.probabilityHome),
        0.4
      );
      const awayProbDec = toPercentDecimal(
        readByAlias(row, headerMap, HEADER_ALIASES.probabilityAway),
        0.3
      );
      let drawProbDec = toPercentDecimal(
        readByAlias(row, headerMap, HEADER_ALIASES.probabilityDraw),
        -1
      );

      const otherPredictionsText = toText(
        readByAlias(row, headerMap, HEADER_ALIASES.otherPredictions)
      );
      const otherPredictions = parseOtherPredictions(otherPredictionsText);
      if (drawProbDec < 0) {
        drawProbDec = otherPredictions.drawDecimal ?? Math.max(0, 1 - (homeProbDec + awayProbDec));
      }

      const confidenceDec = toPercentDecimal(
        readByAlias(row, headerMap, HEADER_ALIASES.confidence),
        0.7
      );
      const stars = toNumber(readByAlias(row, headerMap, HEADER_ALIASES.stars), 0);
      const trustPoints = stars > 0 ? Math.min(99, Math.max(50, stars * 20)) : decimalToPercentPoints(confidenceDec);

      const homeScore = toNumber(readByAlias(row, headerMap, HEADER_ALIASES.predScoreHome), 1);
      const awayScore = toNumber(readByAlias(row, headerMap, HEADER_ALIASES.predScoreAway), 1);

      const rawSignals = readByAlias(row, headerMap, HEADER_ALIASES.signals);
      const signalTokens =
        typeof rawSignals === "string"
          ? rawSignals
              .split(/[,;|]/)
              .map((entry) => entry.trim())
              .filter(Boolean)
          : [];
      const signals =
        signalTokens.length > 0 ? signalTokens : rawSignals != null ? [`Signals: ${toText(rawSignals)}`] : [];
      const hotTrendText = toText(
        readByAlias(row, headerMap, HEADER_ALIASES.hotTrend) ??
          readByHeaderContains(row, headerMap, ["hottrend", "trend"])
      );
      if (
        hotTrendText &&
        !signals.some((signal) => signal.toLowerCase().includes(hotTrendText.toLowerCase()))
      ) {
        signals.unshift(`Hot Trend: ${hotTrendText}`);
      }

      const predictionBasis =
        otherPredictions.basis.length > 0 ? otherPredictions.basis : ["Imported from monitor data"];

      const kickoffValue = readByAlias(row, headerMap, HEADER_ALIASES.kickoff);
      const mlHome = toNumber(readByAlias(row, headerMap, HEADER_ALIASES.mlHome), 2);
      const mlAway = toNumber(readByAlias(row, headerMap, HEADER_ALIASES.mlAway), 3);
      const mlDraw = toNumber(readByAlias(row, headerMap, HEADER_ALIASES.mlDraw), 3);
      const openingTriplet = parseOddsTriplet(readByAlias(row, headerMap, HEADER_ALIASES.openingTriplet));
      const currentTriplet = parseOddsTriplet(readByAlias(row, headerMap, HEADER_ALIASES.currentTriplet));
      const openingHomeRaw = readByAlias(row, headerMap, HEADER_ALIASES.openingHome);
      const openingDrawRaw = readByAlias(row, headerMap, HEADER_ALIASES.openingDraw);
      const openingAwayRaw = readByAlias(row, headerMap, HEADER_ALIASES.openingAway);
      const currentHomeRaw = readByAlias(row, headerMap, HEADER_ALIASES.currentHome);
      const currentDrawRaw = readByAlias(row, headerMap, HEADER_ALIASES.currentDraw);
      const currentAwayRaw = readByAlias(row, headerMap, HEADER_ALIASES.currentAway);
      const openingOdds = {
        home: toNumber(openingHomeRaw, openingTriplet?.home ?? mlHome),
        draw: toNumber(openingDrawRaw, openingTriplet?.draw ?? mlDraw),
        away: toNumber(openingAwayRaw, openingTriplet?.away ?? mlAway),
      };
      const currentOdds = {
        home: toNumber(currentHomeRaw, currentTriplet?.home ?? mlHome),
        draw: toNumber(currentDrawRaw, currentTriplet?.draw ?? mlDraw),
        away: toNumber(currentAwayRaw, currentTriplet?.away ?? mlAway),
      };
      const hasOddsMovement =
        openingTriplet != null ||
        currentTriplet != null ||
        !isNullLike(openingHomeRaw) ||
        !isNullLike(openingDrawRaw) ||
        !isNullLike(openingAwayRaw) ||
        !isNullLike(currentHomeRaw) ||
        !isNullLike(currentDrawRaw) ||
        !isNullLike(currentAwayRaw);
      const liveScore =
        extractLiveScore(readByAlias(row, headerMap, HEADER_ALIASES.realScore)) ??
        extractLiveScore(readByAlias(row, headerMap, HEADER_ALIASES.finalScore)) ??
        extractLiveScore(readByAlias(row, headerMap, HEADER_ALIASES.firstHalfResult));

      const publicMLHome = toPercentPoints(
        readByAlias(row, headerMap, HEADER_ALIASES.publicMlHome),
        decimalToPercentPoints(homeProbDec)
      );
      const publicMLAway = toPercentPoints(
        readByAlias(row, headerMap, HEADER_ALIASES.publicMlAway),
        decimalToPercentPoints(awayProbDec)
      );
      const publicMLDraw = toPercentPoints(
        readByAlias(row, headerMap, HEADER_ALIASES.publicMlDraw),
        decimalToPercentPoints(drawProbDec)
      );

      const publicAllHome = toPercentPoints(
        readByAlias(row, headerMap, HEADER_ALIASES.publicAllHome),
        publicMLHome
      );
      const publicAllAway = toPercentPoints(
        readByAlias(row, headerMap, HEADER_ALIASES.publicAllAway),
        publicMLAway
      );
      const publicAllDraw = toPercentPoints(
        readByAlias(row, headerMap, HEADER_ALIASES.publicAllDraw),
        publicMLDraw
      );

      const cashAllHome = toPercentPoints(readByAlias(row, headerMap, HEADER_ALIASES.cashAllHome), 0);
      const cashAllAway = toPercentPoints(readByAlias(row, headerMap, HEADER_ALIASES.cashAllAway), 0);
      const cashAllDraw = toPercentPoints(readByAlias(row, headerMap, HEADER_ALIASES.cashAllDraw), 0);

      const matchId = `${detectedSportId}-${leagueId}-${slugify(homeTeam)}-${slugify(awayTeam)}-${index}`;
      importedCount += 1;

      const overPoints =
        otherPredictions.over25Decimal == null ? 50 : decimalToPercentPoints(otherPredictions.over25Decimal);

      return {
        id: matchId,
        leagueId,
        homeTeam: homeTeam.trim(),
        awayTeam: awayTeam.trim(),
        kickoff: toIsoKickoff(kickoffValue),
        liveScore,
        confidence: decimalToPercentPoints(confidenceDec),
        odds: {
          home: mlHome,
          draw: mlDraw,
          away: mlAway,
        },
        prediction: {
          home: decimalToPercentPoints(homeProbDec),
          draw: decimalToPercentPoints(drawProbDec),
          away: decimalToPercentPoints(awayProbDec),
        },
        expectedScore: {
          home: homeScore,
          away: awayScore,
        },
        handicap: {
          home: decimalToPercentPoints(homeProbDec),
          away: decimalToPercentPoints(awayProbDec),
        },
        overUnder: {
          line: 2.5,
          over: overPoints,
          under: 100 - overPoints,
        },
        btts:
          otherPredictions.bttsDecimal == null
            ? 50
            : decimalToPercentPoints(otherPredictions.bttsDecimal),
        trust: trustPoints,
        signals,
        predictionBasis,
        monitorDetails: hotTrendText ? [{ label: "Hot Trend", value: hotTrendText }] : undefined,
        topScores: makeTopScores(homeScore, awayScore),
        market: {
          publicML: {
            home: publicMLHome,
            draw: publicMLDraw,
            away: publicMLAway,
          },
          publicAll: {
            home: publicAllHome,
            draw: publicAllDraw,
            away: publicAllAway,
          },
          cashAll: {
            home: cashAllHome,
            draw: cashAllDraw,
            away: cashAllAway,
          },
          cashAmount: {
            home: toNumber(readByAlias(row, headerMap, HEADER_ALIASES.cashAmountHome), 0),
            draw: toNumber(readByAlias(row, headerMap, HEADER_ALIASES.cashAmountDraw), 0),
            away: toNumber(readByAlias(row, headerMap, HEADER_ALIASES.cashAmountAway), 0),
          },
          ratio: {
            publicHome: toNumber(readByAlias(row, headerMap, HEADER_ALIASES.publicRatioHome), 0),
            publicAway: toNumber(readByAlias(row, headerMap, HEADER_ALIASES.publicRatioAway), 0),
            cashHome: toNumber(readByAlias(row, headerMap, HEADER_ALIASES.cashRatioHome), 0),
            cashAway: toNumber(readByAlias(row, headerMap, HEADER_ALIASES.cashRatioAway), 0),
          },
          oddsMovement: hasOddsMovement
            ? {
                opening: openingOdds,
                current: currentOdds,
              }
            : undefined,
        },
      };
    })
    .filter((match): match is Match => match !== null);

  if (matches.length === 0) {
    console.info(`[excelImport] Imported rows: ${importedCount}, skipped rows: ${skippedCount}`);
    throw new Error("No valid matches found in workbook.");
  }

  const leagues: League[] = Array.from(leagueNameById.entries()).map(([id, name]) => ({
    id,
    name,
    country: "",
    flag: "🏁",
    matchCount: matches.filter((match) => match.leagueId === id).length,
    sportId: detectedSportId,
  }));

  const sport: Sport = {
    id: detectedSportId,
    name: SPORT_META[detectedSportId].name,
    icon: SPORT_META[detectedSportId].icon,
    matchCount: matches.length,
  };

  console.info(`[excelImport] Imported rows: ${importedCount}, skipped rows: ${skippedCount}`);
  return { sport, leagues, matches };
}

export async function parseLiveBotWorkbook(file: File): Promise<ParsedLiveBotImport> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const firstSheet = workbook.SheetNames[0];
  if (!firstSheet) {
    throw new Error("Workbook does not contain any sheets.");
  }

  const sheet = workbook.Sheets[firstSheet];
  if (!sheet) {
    throw new Error(`Sheet "${firstSheet}" cannot be read.`);
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  if (!matrix.length) {
    throw new Error("Workbook sheet is empty.");
  }

  const headerRow = matrix[0] ?? [];
  const headerMap = buildHeaderMap(headerRow);
  const col = (aliases: string[]) =>
    aliases
      .map((alias) => headerMap.get(normalizeKey(alias)))
      .find((index): index is number => index !== undefined);

  const gameStartCol = col(["game start", "gamestart", "kickoff", "date"]);
  const leagueCol = col(["league", "competition"]);
  const gameCol = col(["game", "match", "fixture"]);
  const team1Col = col(["team1", "home", "home team"]);
  const team2Col = col(["team2", "away", "away team"]);
  const scoreCol = col(["score", "final score", "real score"]);
  const signalDateCol = col(["signal date", "signaldate"]);
  const betCol = col(["bet", "pick", "selection"]);
  const unitCol = col(["unit", "units", "stake"]);
  const oddCol = col(["odd", "odds"]);
  const resultCol = col(["result", "status"]);

  if (leagueCol == null || gameCol == null || betCol == null) {
    throw new Error("Unsupported livebets workbook format.");
  }

  let importedCount = 0;
  let skippedCount = 0;

  const signals = matrix
    .slice(1)
    .map<LiveBotSignalImport | null>((row, index) => {
      if (!Array.isArray(row) || row.every((cell) => isNullLike(cell))) {
        skippedCount += 1;
        return null;
      }

      const league = toText(leagueCol != null ? row[leagueCol] : "");
      const match = toText(gameCol != null ? row[gameCol] : "");
      const bet = toText(betCol != null ? row[betCol] : "");
      const oddRaw = toText(oddCol != null ? row[oddCol] : "");
      const unit = toText(unitCol != null ? row[unitCol] : "");
      const result = toText(resultCol != null ? row[resultCol] : "");
      const score = toText(scoreCol != null ? row[scoreCol] : "");
      const signalDate = toText(signalDateCol != null ? row[signalDateCol] : "");
      const gameStart = toText(gameStartCol != null ? row[gameStartCol] : "");
      const team1 = toText(team1Col != null ? row[team1Col] : "");
      const team2 = toText(team2Col != null ? row[team2Col] : "");

      if (!league || !match || !bet) {
        skippedCount += 1;
        return null;
      }

      const normalizedResult = result.toLowerCase();
      const isActive =
        normalizedResult === "" ||
        normalizedResult.includes("pending") ||
        normalizedResult.includes("live") ||
        normalizedResult.includes("open");

      importedCount += 1;
      const sportId = detectSport(null, firstSheet, file.name, "soccer");
      const sportName = SPORT_META[sportId].name;
      const odd = oddRaw ? toNumber(oddRaw, 0).toFixed(3).replace(/\.000$/, "") : "";
      const noteParts = [
        `League: ${league}`,
        `Match: ${match}`,
        team1 && team2 ? `Teams: ${team1} vs ${team2}` : "",
        `Bet: ${bet}`,
        odd ? `Odd: ${odd}` : "",
        unit ? `Unit: ${unit}` : "",
        score ? `Score: ${score}` : "",
        result ? `Result: ${result}` : "Result: Pending",
        signalDate ? `Signal Date: ${signalDate.replace(/\s+/g, " ").trim()}` : "",
        gameStart ? `Game Start: ${gameStart.replace(/\s+/g, " ").trim()}` : "",
      ].filter(Boolean);

      return {
        id: `live-${slugify(file.name)}-${index}`,
        createdAt: toIsoKickoff(signalDate || gameStart || new Date().toISOString()),
        sport: sportName,
        title: "Signal live active",
        note: noteParts.join(" | "),
        active: isActive,
        league,
        match,
        bet,
        odd,
        unit,
        result: result || "Pending",
        score,
      };
    })
    .filter((entry): entry is LiveBotSignalImport => entry !== null);

  console.info(`[liveBotImport] Imported rows: ${importedCount}, skipped rows: ${skippedCount}`);
  if (signals.length === 0) {
    throw new Error("No valid live signals found in workbook.");
  }

  return { signals, importedCount, skippedCount };
}

async function parsePredictions9Workbook(
  file: File,
  sportId: SupportedSportId
): Promise<ParsedSportImport> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes("main")) ?? workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook does not contain any sheets.");
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" cannot be read.`);

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  if (!matrix.length) throw new Error("Workbook sheet is empty.");

  const headerIndex = matrix.findIndex((row) => {
    const normalized = row.map((cell) => normalizeKey(toText(cell).replace(/\u00a0/g, " ")));
    return normalized.includes("date") && normalized.includes("team1") && normalized.includes("team2");
  });
  if (headerIndex < 0) throw new Error("Unsupported predictions workbook format.");

  const headerRow = matrix[headerIndex] ?? [];
  const normalizedHeaders = headerRow.map((cell) => normalizeKey(toText(cell).replace(/\u00a0/g, " ")));
  const col = (key: string) => normalizedHeaders.findIndex((header) => header === key);

  const dateCol = col("date");
  const team1Col = col("team1");
  const team2Col = col("team2");
  const confidenceCol = col("confidence");
  const firstHalfPredCol = col("scorepredictionfirsthalf");
  const finalPredCol = col("scorepredictionfinalscore");
  const finalResultCol = col("finalscore");
  const firstHalfResultCol = col("firsthalfresult");
  const team1WinCol = col("bettingpredictionsteam1win");
  const drawCol = col("bettingpredictionsdraw");
  const team2WinCol = col("bettingpredictionsteam2win");

  if (team1Col < 0 || team2Col < 0) throw new Error("Predictions workbook missing team columns.");

  const oddHomeCol = team1Col + 1;
  const oddAwayCol = team2Col + 1;
  const leagueNameById = new Map<string, string>();
  const spreadValueMap = buildPredictionsSheetMap(workbook, "Spread Value Bets", "Spread Value Bets");
  const totalsValueMap = buildPredictionsSheetMap(workbook, "Totals Value Bets", "Totals Value Bets");
  const sharpValueMap = buildPredictionsSheetMap(workbook, "Kelly Value Bets", "SNIPY Value Bets");

  let currentLeague = "Unknown League";
  let importedCount = 0;
  let skippedCount = 0;

  const matches = matrix
    .slice(headerIndex + 1)
    .map<Match | null>((row, index) => {
      const team1 = toText(row[team1Col]);
      const team2 = toText(row[team2Col]);
      const rowLabel = toText(row[0]);

      if (!team1 && !team2 && rowLabel) {
        currentLeague = rowLabel;
        return null;
      }

      if (!team1 || !team2) {
        skippedCount += 1;
        return null;
      }

      const leagueId = `${sportId}-${slugify(currentLeague) || "unknown"}`;
      leagueNameById.set(leagueId, currentLeague);

      const conf = toPercentPoints(confidenceCol >= 0 ? row[confidenceCol] : null, 55);
      const homeProb = toPercentPoints(team1WinCol >= 0 ? row[team1WinCol] : null, 34);
      const drawProb = toPercentPoints(drawCol >= 0 ? row[drawCol] : null, 33);
      const awayProb = toPercentPoints(team2WinCol >= 0 ? row[team2WinCol] : null, 33);

      const finalPred = parseScorePair(finalPredCol >= 0 ? row[finalPredCol] : null, 1, 1);
      const firstHalfPred = parseScorePair(firstHalfPredCol >= 0 ? row[firstHalfPredCol] : null, 0, 0);

      const finalResult = toText(finalResultCol >= 0 ? row[finalResultCol] : "");
      const firstHalfResult = toText(firstHalfResultCol >= 0 ? row[firstHalfResultCol] : "");
      const signals = [finalResult ? `Final score: ${finalResult}` : "", firstHalfResult ? `1H result: ${firstHalfResult}` : ""]
        .filter(Boolean);
      const matchKey = buildPredictionsMatchKey(team1, team2);
      const reverseMatchKey = buildPredictionsMatchKey(team2, team1);
      const spreadValue = spreadValueMap.get(matchKey) ?? spreadValueMap.get(reverseMatchKey);
      const totalsValue = totalsValueMap.get(matchKey) ?? totalsValueMap.get(reverseMatchKey);
      const sharpValue = sharpValueMap.get(matchKey) ?? sharpValueMap.get(reverseMatchKey);

      importedCount += 1;

      return {
        id: `${sportId}-${leagueId}-${slugify(team1)}-${slugify(team2)}-p9-${index}`,
        leagueId,
        homeTeam: team1,
        awayTeam: team2,
        kickoff: toIsoKickoff(dateCol >= 0 ? row[dateCol] : null),
        liveScore: extractLiveScore(finalResult) ?? extractLiveScore(firstHalfResult),
        confidence: conf,
        odds: {
          home: toNumber(row[oddHomeCol], 2),
          draw: 3.2,
          away: toNumber(row[oddAwayCol], 2),
        },
        prediction: {
          home: homeProb,
          draw: drawProb,
          away: awayProb,
        },
        expectedScore: {
          home: finalPred.home,
          away: finalPred.away,
        },
        handicap: {
          home: homeProb,
          away: awayProb,
        },
        overUnder: {
          line: 2.5,
          over: finalPred.home + finalPred.away > 2 ? 58 : 45,
          under: finalPred.home + finalPred.away > 2 ? 42 : 55,
        },
        btts: finalPred.home > 0 && finalPred.away > 0 ? 60 : 42,
        trust: conf,
        signals,
        predictionBasis: [
          `1H prediction: ${firstHalfPred.home}:${firstHalfPred.away}`,
          `FT prediction: ${finalPred.home}:${finalPred.away}`,
        ],
        monitorDetails: [
          {
            label: "Main game list",
            value: [
              `Date: ${toText(dateCol >= 0 ? row[dateCol] : "") || "-"}`,
              `1H Prediction: ${firstHalfPred.home}:${firstHalfPred.away}`,
              `FT Prediction: ${finalPred.home}:${finalPred.away}`,
              `Confidence: ${conf.toFixed(1)}%`,
              `Probabilities: H ${homeProb.toFixed(1)}% | D ${drawProb.toFixed(1)}% | A ${awayProb.toFixed(1)}%`,
              `1H Result: ${firstHalfResult || "-"}`,
              `Final Score: ${finalResult || "-"}`,
            ].join(" | "),
          },
          ...(spreadValue ? [spreadValue] : []),
          ...(totalsValue ? [totalsValue] : []),
          ...(sharpValue ? [sharpValue] : []),
          { label: "1H Prediction", value: `${firstHalfPred.home}:${firstHalfPred.away}` },
          { label: "FT Prediction", value: `${finalPred.home}:${finalPred.away}` },
          { label: "Confidence", value: `${conf.toFixed(1)}%` },
        ],
        topScores: makeTopScores(finalPred.home, finalPred.away),
        market: {
          publicML: {
            home: homeProb,
            draw: drawProb,
            away: awayProb,
          },
          oddsMovement: {
            opening: {
              home: toNumber(row[oddHomeCol], 2),
              draw: 3.2,
              away: toNumber(row[oddAwayCol], 2),
            },
            current: {
              home: toNumber(row[oddHomeCol], 2),
              draw: 3.2,
              away: toNumber(row[oddAwayCol], 2),
            },
          },
        },
      };
    })
    .filter((entry): entry is Match => entry !== null);

  if (matches.length === 0) {
    console.info(`[excelImport] Imported rows: ${importedCount}, skipped rows: ${skippedCount}`);
    throw new Error("No valid matches found in predictions workbook.");
  }

  const leagues: League[] = Array.from(leagueNameById.entries()).map(([id, name]) => ({
    id,
    name,
    country: "",
    flag: "🏁",
    matchCount: matches.filter((match) => match.leagueId === id).length,
    sportId,
  }));

  console.info(`[excelImport] Imported rows: ${importedCount}, skipped rows: ${skippedCount}`);
  return {
    sport: {
      id: sportId,
      name: SPORT_META[sportId].name,
      icon: SPORT_META[sportId].icon,
      matchCount: matches.length,
    },
    leagues,
    matches,
  };
}

const parseOddsLine = (value: unknown) => {
  const text = toText(value);
  const nums = text
    .split(/[-|/]/)
    .map((part) => Number(part.trim()))
    .filter((num) => Number.isFinite(num) && num > 0);
  if (nums.length < 3) return null;
  return { home: nums[0], draw: nums[1], away: nums[2] };
};

const impliedFromOdds = (odds: { home: number; draw: number; away: number }) => {
  const invHome = odds.home > 0 ? 1 / odds.home : 0;
  const invDraw = odds.draw > 0 ? 1 / odds.draw : 0;
  const invAway = odds.away > 0 ? 1 / odds.away : 0;
  const sum = invHome + invDraw + invAway;
  if (sum <= 0) return null;
  return {
    home: (invHome / sum) * 100,
    draw: (invDraw / sum) * 100,
    away: (invAway / sum) * 100,
  };
};

async function parseSoccerBuddyWorkbook(
  file: File,
  sportId: SupportedSportId
): Promise<ParsedSportImport> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });
  const sheetName = workbook.SheetNames.find((name) => name.toLowerCase().includes("main")) ?? workbook.SheetNames[0];
  if (!sheetName) throw new Error("Workbook does not contain any sheets.");
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) throw new Error(`Sheet "${sheetName}" cannot be read.`);

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  if (!matrix.length) throw new Error("Workbook sheet is empty.");

  const headerIndex = matrix.findIndex((row) => {
    const normalized = row.map((cell) => normalizeKey(toText(cell)));
    return normalized.includes("league") && normalized.includes("game") && normalized.includes("totalscoreprediction");
  });
  if (headerIndex < 0) throw new Error("Unsupported soccerbuddy workbook format.");

  const header = matrix[headerIndex] ?? [];
  const headers = header.map((cell) => normalizeKey(toText(cell)));
  const col = (key: string) => headers.findIndex((h) => h === key);

  const dateCol = col("date");
  const leagueCol = col("league");
  const gameCol = col("game");
  const linesCol = col("lines");
  const hotTrendsCol = col("hottrends");
  const hotTrendCol = hotTrendsCol >= 0 ? hotTrendsCol : col("hottrend");
  const drawCol = col("draw");
  const totalPredCol = col("totalscoreprediction");
  const over15Col = col("over15goals");
  const over25Col = col("over25goals");
  const bttsCol = col("btts");
  const firstHalfPredCol = col("1sthalfscoreprediction");
  const firstHalfScoreCol = col("1sthalfscore");
  const totalScoreCol = col("totalscore");

  if (leagueCol < 0 || gameCol < 0) throw new Error("Soccerbuddy workbook missing league/game columns.");

  const leagueNameById = new Map<string, string>();
  let importedCount = 0;
  let skippedCount = 0;

  const matches = matrix
    .slice(headerIndex + 1)
    .map<Match | null>((row, index) => {
      const leagueName = toText(row[leagueCol]);
      const game = toText(row[gameCol]);
      if (!leagueName || !game) {
        skippedCount += 1;
        return null;
      }

      const teams = splitTeams(game);
      if (!teams) {
        skippedCount += 1;
        return null;
      }

      const leagueId = `${sportId}-${slugify(leagueName) || "unknown"}`;
      leagueNameById.set(leagueId, leagueName);

      const oddsFromLine = parseOddsLine(linesCol >= 0 ? row[linesCol] : null);
      const implied = oddsFromLine ? impliedFromOdds(oddsFromLine) : null;
      const drawPct = toPercentPoints(drawCol >= 0 ? row[drawCol] : null, implied?.draw ?? 33);
      const homePct = implied?.home ?? Math.max(0, (100 - drawPct) / 2);
      const awayPct = implied?.away ?? Math.max(0, 100 - drawPct - homePct);

      const totalPred = parseScorePair(totalPredCol >= 0 ? row[totalPredCol] : null, 1, 1);
      const firstHalfPred = parseScorePair(firstHalfPredCol >= 0 ? row[firstHalfPredCol] : null, 0, 0);

      const liveScore =
        extractLiveScore(totalScoreCol >= 0 ? row[totalScoreCol] : null) ??
        extractLiveScore(firstHalfScoreCol >= 0 ? row[firstHalfScoreCol] : null);

      const over15 = toPercentPoints(over15Col >= 0 ? row[over15Col] : null, 55);
      const over25 = toPercentPoints(over25Col >= 0 ? row[over25Col] : 45, 45);
      const btts = toPercentPoints(bttsCol >= 0 ? row[bttsCol] : null, 50);
      const firstHalfOver05 = toPercentPoints(col("1sthalfover05goals") >= 0 ? row[col("1sthalfover05goals")] : null, 40);
      const firstHalfOver15 = toPercentPoints(col("1sthalfover15goals") >= 0 ? row[col("1sthalfover15goals")] : null, 20);
      const secondHalfOver05 = toPercentPoints(col("2ndhalfover05goals") >= 0 ? row[col("2ndhalfover05goals")] : null, 45);
      const secondHalfOver15 = toPercentPoints(col("2ndhalfover15goals") >= 0 ? row[col("2ndhalfover15goals")] : null, 25);
      const confidence = Math.max(25, Math.min(95, Math.max(homePct, drawPct, awayPct)));
      const trendText = toText(hotTrendCol >= 0 ? row[hotTrendCol] : "");
      const signals = trendText ? [trendText] : [];

      importedCount += 1;

      return {
        id: `${sportId}-${leagueId}-${slugify(teams.home)}-${slugify(teams.away)}-sb-${index}`,
        leagueId,
        homeTeam: teams.home,
        awayTeam: teams.away,
        kickoff: toIsoKickoff(dateCol >= 0 ? row[dateCol] : null),
        liveScore,
        confidence,
        odds: oddsFromLine ?? { home: 2.2, draw: 3.2, away: 3.1 },
        prediction: {
          home: homePct,
          draw: drawPct,
          away: awayPct,
        },
        expectedScore: {
          home: totalPred.home,
          away: totalPred.away,
        },
        handicap: {
          home: homePct,
          away: awayPct,
        },
        overUnder: {
          line: 2.5,
          over: over25,
          under: 100 - over25,
        },
        btts,
        trust: confidence,
        signals,
        predictionBasis: [
          `1st Half Score ${firstHalfPred.home}:${firstHalfPred.away}`,
          `Total score prediction ${totalPred.home}:${totalPred.away}`,
          `Over 1.5 goals ${over15}%`,
          `Over 2.5 goals ${over25}%`,
        ],
        monitorDetails: [
          { label: "Hot Trend", value: trendText || "-" },
          { label: "Draw %", value: `${drawPct.toFixed(1)}%` },
          { label: "Over 1.5", value: `${over15.toFixed(1)}%` },
          { label: "Over 2.5", value: `${over25.toFixed(1)}%` },
          { label: "BTTS", value: `${btts.toFixed(1)}%` },
          { label: "1H Prediction", value: `${firstHalfPred.home}:${firstHalfPred.away}` },
          { label: "1H Over 0.5", value: `${firstHalfOver05.toFixed(1)}%` },
          { label: "1H Over 1.5", value: `${firstHalfOver15.toFixed(1)}%` },
          { label: "2H Over 0.5", value: `${secondHalfOver05.toFixed(1)}%` },
          { label: "2H Over 1.5", value: `${secondHalfOver15.toFixed(1)}%` },
        ],
        topScores: makeTopScores(totalPred.home, totalPred.away),
        market: {
          publicML: {
            home: homePct,
            draw: drawPct,
            away: awayPct,
          },
          oddsMovement: oddsFromLine
            ? {
                opening: oddsFromLine,
                current: oddsFromLine,
              }
            : undefined,
        },
      };
    })
    .filter((entry): entry is Match => entry !== null);

  if (matches.length === 0) {
    console.info(`[excelImport] Imported rows: ${importedCount}, skipped rows: ${skippedCount}`);
    throw new Error("No valid matches found in soccerbuddy workbook.");
  }

  const leagues: League[] = Array.from(leagueNameById.entries()).map(([id, name]) => ({
    id,
    name,
    country: "",
    flag: "🏁",
    matchCount: matches.filter((match) => match.leagueId === id).length,
    sportId,
  }));

  console.info(`[excelImport] Imported rows: ${importedCount}, skipped rows: ${skippedCount}`);
  return {
    sport: {
      id: sportId,
      name: SPORT_META[sportId].name,
      icon: SPORT_META[sportId].icon,
      matchCount: matches.length,
    },
    leagues,
    matches,
  };
}

export async function parseSportWorkbookFromUrl(
  url: string,
  sportId: SupportedSportId,
  format: MonitorFormat = "monitor"
): Promise<ParsedSportImport> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load workbook from ${url}`);
  }

  const blob = await response.blob();
  const fileName = url.split("/").pop() || `${sportId}.xlsx`;
  const file = new File([blob], fileName, { type: blob.type });
  if (format === "predictions9") {
    return parsePredictions9Workbook(file, sportId);
  }
  if (format === "soccerbuddy10") {
    return parseSoccerBuddyWorkbook(file, sportId);
  }
  return parseSportWorkbook(file, sportId);
}

const mergeMarket = (base?: Match["market"], incoming?: Match["market"]): Match["market"] => {
  if (!base) return incoming;
  if (!incoming) return base;
  return {
    ...base,
    ...incoming,
    publicML: incoming.publicML ?? base.publicML,
    publicAll: incoming.publicAll ?? base.publicAll,
    cashAll: incoming.cashAll ?? base.cashAll,
    cashAmount: incoming.cashAmount ?? base.cashAmount,
    ratio: incoming.ratio ?? base.ratio,
    oddsMovement: incoming.oddsMovement ?? base.oddsMovement,
  };
};

const mergeMatchRows = (base: Match, incoming: Match): Match => ({
  ...base,
  kickoff: incoming.kickoff || base.kickoff,
  odds: incoming.odds.home > 0 || incoming.odds.away > 0 ? incoming.odds : base.odds,
  prediction: incoming.prediction,
  expectedScore: incoming.expectedScore,
  handicap: incoming.handicap,
  overUnder: incoming.overUnder,
  btts: incoming.btts || base.btts,
  trust: incoming.trust || base.trust,
  confidence: incoming.confidence || base.confidence,
  signals: Array.from(new Set([...base.signals, ...incoming.signals])),
  predictionBasis: Array.from(new Set([...base.predictionBasis, ...incoming.predictionBasis])),
  monitorDetails: Array.from(
    new Map(
      [...(base.monitorDetails ?? []), ...(incoming.monitorDetails ?? [])].map((detail) => [
        `${detail.label.toLowerCase()}|${detail.value.toLowerCase()}`,
        detail,
      ])
    ).values()
  ),
  topScores: incoming.topScores.length > 0 ? incoming.topScores : base.topScores,
  market: mergeMarket(base.market, incoming.market),
});

const matchMergeKey = (match: Match) =>
  `${match.leagueId}|${normalizeTeamKey(match.homeTeam)}|${normalizeTeamKey(match.awayTeam)}`;

export async function loadBundledMonitors(monitors: BundledMonitor[]): Promise<ParsedSiteImport> {
  const bySport = new Map<SupportedSportId, ParsedSportImport>();

  for (const monitor of monitors) {
    try {
      const parsed = await parseSportWorkbookFromUrl(
        monitor.url,
        monitor.sportId,
        monitor.format ?? "monitor"
      );
      console.info(
        `[excelImport] loaded ${monitor.url} -> sport=${parsed.sport.id}, leagues=${parsed.leagues.length}, matches=${parsed.matches.length}`
      );
      const sportKey = parsed.sport.id as SupportedSportId;
      const current = bySport.get(sportKey);

      if (!current) {
        bySport.set(sportKey, parsed);
        continue;
      }

      const leagueMap = new Map<string, League>();
      const matchMap = new Map<string, Match>();
      const keyToId = new Map<string, string>();
      [...current.leagues, ...parsed.leagues].forEach((league) => {
        leagueMap.set(league.id, league);
      });

      current.matches.forEach((match) => {
        matchMap.set(match.id, match);
        keyToId.set(matchMergeKey(match), match.id);
      });

      parsed.matches.forEach((match) => {
        const key = matchMergeKey(match);
        const reverseKey = `${match.leagueId}|${normalizeTeamKey(match.awayTeam)}|${normalizeTeamKey(
          match.homeTeam
        )}`;
        const existingId = keyToId.get(key) ?? keyToId.get(reverseKey);

        if (!existingId) {
          matchMap.set(match.id, match);
          keyToId.set(key, match.id);
          return;
        }

        const existing = matchMap.get(existingId);
        if (existing) {
          matchMap.set(existingId, mergeMatchRows(existing, match));
        }
      });

      bySport.set(sportKey, {
        sport: {
          ...current.sport,
          matchCount: matchMap.size,
        },
        leagues: Array.from(leagueMap.values()),
        matches: Array.from(matchMap.values()),
      });
    } catch (error) {
      console.warn(`[excelImport] Could not load bundled monitor ${monitor.url}`, error);
    }
  }

  const sports: Sport[] = [];
  const leagues: League[] = [];
  const matches: Match[] = [];

  bySport.forEach((parsed) => {
    sports.push({ ...parsed.sport, matchCount: parsed.matches.length });
    leagues.push(...parsed.leagues);
    matches.push(...parsed.matches);
  });
  console.info(
    `[excelImport] merged result -> sports=${sports.length}, leagues=${leagues.length}, matches=${matches.length}`
  );

  return { sports, leagues, matches };
}
