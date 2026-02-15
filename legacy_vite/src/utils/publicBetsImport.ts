import type { Match } from "../data/mockData";

type TeamPublicBlock = {
  name: string;
  mlPublic?: number;
  spreadPublic?: number;
  odd?: number;
};

export type ParsedPublicFixture = {
  league?: string;
  dateLabel?: string;
  team1: TeamPublicBlock;
  team2: TeamPublicBlock;
  publicOver?: number;
  publicUnder?: number;
};

export type PublicImportResult = {
  fixtures: ParsedPublicFixture[];
  updatedMatches: number;
  skippedFixtures: number;
};

const DATE_LINE_REGEX = /^\d{1,2}(st|nd|rd|th)\s+[A-Za-z]{3,}\s+\d{4},\s+\d{2}:\d{2}\s+ET$/i;
const TIME_PARAN_REGEX = /^\([^)]*CET\)$/i;
const ODD_REGEX = /^[-+]?\d+(\.\d+)?$/;

const CONTROL_PREFIXES = [
  "logout",
  "get your account here",
  "what is",
  "money line",
  "spread line",
  "all tools",
  "select date",
  "select league",
  "sort by",
  "filter",
  "date",
  "public bets",
  "show tickets",
  "period",
  "the odds for this game",
];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeTeam = (value: string) =>
  normalizeText(value)
    .replace(/\butd\b/g, "united")
    .replace(/\bst\b/g, "saint")
    .replace(/\b(fc|cf|sc|afc)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isControlLine = (line: string) => {
  const lowered = normalizeText(line);
  if (!lowered) return true;
  return CONTROL_PREFIXES.some((prefix) => lowered.startsWith(prefix));
};

const isLikelyTeamLine = (line: string) => {
  if (!line) return false;
  if (DATE_LINE_REGEX.test(line)) return false;
  if (TIME_PARAN_REGEX.test(line)) return false;
  if (ODD_REGEX.test(line)) return false;
  if (/^ml\s+public:/i.test(line)) return false;
  if (/^spread\s+public:/i.test(line)) return false;
  if (/^public\s+over:/i.test(line)) return false;
  if (/^odds\s+from\s+api/i.test(line)) return false;
  if (isControlLine(line)) return false;
  return true;
};

const parsePercent = (line: string): number | undefined => {
  const match = line.match(/([0-9]+(?:\.[0-9]+)?)\s*%/);
  if (!match) return undefined;
  const value = Number(match[1]);
  if (!Number.isFinite(value)) return undefined;
  return Math.max(0, Math.min(100, value));
};

const parseOverUnder = (line: string): { over?: number; under?: number } => {
  const over = line.match(/Public\s+Over:\s*([0-9]+(?:\.[0-9]+)?)\s*%/i);
  const under = line.match(/Under:\s*([0-9]+(?:\.[0-9]+)?)\s*%/i);
  return {
    over: over ? Math.max(0, Math.min(100, Number(over[1]))) : undefined,
    under: under ? Math.max(0, Math.min(100, Number(under[1]))) : undefined,
  };
};

export const parsePublicBetsText = (raw: string): ParsedPublicFixture[] => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const fixtures: ParsedPublicFixture[] = [];
  let currentLeague = "";

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    const next = i + 1 < lines.length ? lines[i + 1] : "";
    if (!DATE_LINE_REGEX.test(line) && DATE_LINE_REGEX.test(next) && !isControlLine(line)) {
      currentLeague = line;
      i += 1;
      continue;
    }

    if (!DATE_LINE_REGEX.test(line)) {
      i += 1;
      continue;
    }

    const dateLabel = line;
    let cursor = i + 1;

    if (cursor < lines.length && TIME_PARAN_REGEX.test(lines[cursor])) {
      cursor += 1;
    }

    while (cursor < lines.length && !isLikelyTeamLine(lines[cursor]) && !DATE_LINE_REGEX.test(lines[cursor])) {
      cursor += 1;
    }
    if (cursor >= lines.length || DATE_LINE_REGEX.test(lines[cursor])) {
      i += 1;
      continue;
    }

    const team1: TeamPublicBlock = { name: lines[cursor] };
    cursor += 1;

    while (cursor < lines.length && !DATE_LINE_REGEX.test(lines[cursor]) && !isLikelyTeamLine(lines[cursor])) {
      const blockLine = lines[cursor];
      if (/^ml\s+public:/i.test(blockLine)) team1.mlPublic = parsePercent(blockLine);
      if (/^spread\s+public:/i.test(blockLine)) team1.spreadPublic = parsePercent(blockLine);
      if (ODD_REGEX.test(blockLine)) team1.odd = Number(blockLine);
      cursor += 1;
    }

    if (cursor >= lines.length || DATE_LINE_REGEX.test(lines[cursor]) || !isLikelyTeamLine(lines[cursor])) {
      i = cursor;
      continue;
    }

    const team2: TeamPublicBlock = { name: lines[cursor] };
    cursor += 1;

    let publicOver: number | undefined;
    let publicUnder: number | undefined;

    while (cursor < lines.length && !DATE_LINE_REGEX.test(lines[cursor])) {
      const blockLine = lines[cursor];
      if (isLikelyTeamLine(blockLine)) break;
      if (/^ml\s+public:/i.test(blockLine)) team2.mlPublic = parsePercent(blockLine);
      if (/^spread\s+public:/i.test(blockLine)) team2.spreadPublic = parsePercent(blockLine);
      if (/^public\s+over:/i.test(blockLine)) {
        const parsed = parseOverUnder(blockLine);
        publicOver = parsed.over;
        publicUnder = parsed.under;
      }
      if (ODD_REGEX.test(blockLine)) team2.odd = Number(blockLine);
      cursor += 1;
    }

    fixtures.push({
      league: currentLeague || undefined,
      dateLabel,
      team1,
      team2,
      publicOver,
      publicUnder,
    });

    i = cursor;
  }

  return fixtures;
};

const round1 = (value: number) => Math.round(value * 10) / 10;

const findMatchIndexForFixture = (matches: Match[], fixture: ParsedPublicFixture): { index: number; reversed: boolean } | null => {
  const team1 = normalizeTeam(fixture.team1.name);
  const team2 = normalizeTeam(fixture.team2.name);
  if (!team1 || !team2) return null;

  const exactIndex = matches.findIndex((match) => {
    const h = normalizeTeam(match.homeTeam);
    const a = normalizeTeam(match.awayTeam);
    return (h === team1 && a === team2) || (h === team2 && a === team1);
  });

  if (exactIndex >= 0) {
    const match = matches[exactIndex];
    const reversed = normalizeTeam(match.homeTeam) !== team1;
    return { index: exactIndex, reversed };
  }

  const fuzzyIndex = matches.findIndex((match) => {
    const h = normalizeTeam(match.homeTeam);
    const a = normalizeTeam(match.awayTeam);
    const pairOne = (h.includes(team1) || team1.includes(h)) && (a.includes(team2) || team2.includes(a));
    const pairTwo = (h.includes(team2) || team2.includes(h)) && (a.includes(team1) || team1.includes(a));
    return pairOne || pairTwo;
  });

  if (fuzzyIndex >= 0) {
    const match = matches[fuzzyIndex];
    const reversed = !(normalizeTeam(match.homeTeam).includes(team1) || team1.includes(normalizeTeam(match.homeTeam)));
    return { index: fuzzyIndex, reversed };
  }

  return null;
};

export const applyPublicBetsToMatches = (matches: Match[], rawText: string): PublicImportResult & { matches: Match[] } => {
  const fixtures = parsePublicBetsText(rawText);
  const nextMatches = [...matches];
  let updatedMatches = 0;
  let skippedFixtures = 0;

  fixtures.forEach((fixture) => {
    const resolved = findMatchIndexForFixture(nextMatches, fixture);
    if (!resolved) {
      skippedFixtures += 1;
      return;
    }

    const current = nextMatches[resolved.index];
    const homeBlock = resolved.reversed ? fixture.team2 : fixture.team1;
    const awayBlock = resolved.reversed ? fixture.team1 : fixture.team2;

    const existingPublic = current.market?.publicML ?? current.prediction;

    const homeML = homeBlock.mlPublic ?? existingPublic.home;
    const awayML = awayBlock.mlPublic ?? existingPublic.away;
    const drawCandidate = 100 - homeML - awayML;
    const drawML = drawCandidate >= 0 && drawCandidate <= 100 ? drawCandidate : existingPublic.draw;

    const market = {
      ...(current.market ?? {}),
      publicML: {
        home: round1(homeML),
        draw: round1(drawML),
        away: round1(awayML),
      },
      publicAll: {
        home: round1(homeML),
        draw: round1(drawML),
        away: round1(awayML),
      },
    };

    const monitorDetails = [...(current.monitorDetails ?? [])];
    if (typeof fixture.publicOver === "number" || typeof fixture.publicUnder === "number") {
      monitorDetails.push({
        label: "Public Totals",
        value: `Over ${round1(fixture.publicOver ?? current.overUnder.over)}% | Under ${round1(
          fixture.publicUnder ?? current.overUnder.under
        )}%`,
      });
    }

    if (typeof homeBlock.spreadPublic === "number" || typeof awayBlock.spreadPublic === "number") {
      monitorDetails.push({
        label: "Spread Public",
        value: `Home ${round1(homeBlock.spreadPublic ?? 0)}% | Away ${round1(awayBlock.spreadPublic ?? 0)}%`,
      });
    }

    nextMatches[resolved.index] = {
      ...current,
      odds: {
        home: Number.isFinite(homeBlock.odd) ? (homeBlock.odd as number) : current.odds.home,
        draw: current.odds.draw,
        away: Number.isFinite(awayBlock.odd) ? (awayBlock.odd as number) : current.odds.away,
      },
      overUnder: {
        ...current.overUnder,
        over: typeof fixture.publicOver === "number" ? round1(fixture.publicOver) : current.overUnder.over,
        under: typeof fixture.publicUnder === "number" ? round1(fixture.publicUnder) : current.overUnder.under,
      },
      market,
      monitorDetails,
    };

    updatedMatches += 1;
  });

  return {
    matches: nextMatches,
    fixtures,
    updatedMatches,
    skippedFixtures,
  };
};
