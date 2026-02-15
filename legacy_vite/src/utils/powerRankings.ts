export type TeamPowerRanking = {
  rank: number;
  team: string;
  status: string;
  streak: string;
};

export type PowerRankingParseResult = {
  entries: TeamPowerRanking[];
  imported: number;
  skipped: number;
};

export type TeamPowerRankingMap = Record<string, TeamPowerRanking>;

type StatusMeta = {
  emoji: string;
  label: string;
  toneClass: string;
};

const STATUS_NORMALIZERS: Array<{ match: RegExp; value: string }> = [
  { match: /^burning\s*hot\s*down$/i, value: "Burning Hot Down" },
  { match: /^burning\s*hot$/i, value: "Burning Hot" },
  { match: /^average\s*up$/i, value: "Average Up" },
  { match: /^average\s*down$/i, value: "Average Down" },
  { match: /^average$/i, value: "Average" },
  { match: /^ice\s*cold\s*up$/i, value: "Ice Cold Up" },
  { match: /^ice\s*cold\s*down$/i, value: "Ice Cold Down" },
  { match: /^ice\s*cold$/i, value: "Ice Cold" },
  { match: /^dead\s*up$/i, value: "Dead Up" },
  { match: /^dead\s*down$/i, value: "Dead Down" },
  { match: /^dead$/i, value: "Dead" },
];

const HEADER_TOKENS = [
  "welcome back",
  "teams power",
  "rankings",
  "powered by",
  "bookie",
  "free tools",
  "what are power rankings",
  "select sport",
  "please select league",
  "all leagues",
  "current rank",
  "team",
  "status",
  "last 6 games",
  "sports ratings",
];

const normalizeText = (value: string) =>
  value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const compactText = (value: string) => normalizeText(value).replace(/\s+/g, "");

const stripNoiseWords = (value: string) =>
  value
    .replace(/\b(fc|cf|sc|afc|club|the)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeTeamForVariant = (value: string) =>
  value
    .replace(/\([^)]*\)/g, " ")
    .replace(/\bUtd\b/gi, "United")
    .replace(/\bSt\.?\b/gi, "Saint")
    .replace(/\s+/g, " ")
    .trim();

const makeTeamVariants = (team: string): string[] => {
  const variants = new Set<string>();
  const raw = team.trim();
  if (!raw) return [];

  const addVariant = (value: string) => {
    const normalized = normalizeText(value);
    if (normalized) variants.add(normalized);
    const compact = compactText(value);
    if (compact) variants.add(compact);
  };

  addVariant(raw);
  addVariant(normalizeTeamForVariant(raw));
  addVariant(stripNoiseWords(raw));
  addVariant(stripNoiseWords(normalizeTeamForVariant(raw)));

  return Array.from(variants);
};

const normalizeStatus = (value: string): string | null => {
  const cleaned = value.replace(/\s+/g, " ").trim();
  if (!cleaned) return null;
  const matched = STATUS_NORMALIZERS.find((entry) => entry.match.test(cleaned));
  return matched?.value ?? null;
};

const isStreakLine = (value: string) => /^[WLD]{1,10}$/i.test(value.trim());

const isHeaderOrNoise = (value: string) => {
  const line = value.trim();
  if (!line) return true;
  const normalized = normalizeText(line);
  if (!normalized) return true;

  if (HEADER_TOKENS.some((token) => normalized.includes(token))) return true;
  if (/^(free|get|professional|one of|of course|the value)/i.test(line)) return true;
  if (line.endsWith(":")) return true;

  return false;
};

export const parsePowerRankingText = (raw: string): PowerRankingParseResult => {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.replace(/\t+/g, " ").trim())
    .filter((line) => line.length > 0);

  const entries: TeamPowerRanking[] = [];
  let imported = 0;
  let skipped = 0;

  for (let index = 0; index < lines.length; index += 1) {
    const current = lines[index];

    const rankOnlyMatch = current.match(/^(\d+)$/);
    const rankInlineMatch = current.match(/^(\d+)\s+(.+)$/);

    if (!rankOnlyMatch && !rankInlineMatch) continue;

    const rank = Number((rankOnlyMatch ?? rankInlineMatch)?.[1]);
    if (!Number.isFinite(rank)) {
      skipped += 1;
      continue;
    }

    let cursor = index + 1;
    let team = rankInlineMatch?.[2]?.trim() ?? "";

    while (!team && cursor < lines.length && isHeaderOrNoise(lines[cursor])) {
      cursor += 1;
    }

    if (!team && cursor < lines.length) {
      const maybeTeam = lines[cursor];
      if (!/^\d+$/.test(maybeTeam) && !isHeaderOrNoise(maybeTeam)) {
        team = maybeTeam;
        cursor += 1;
      }
    }

    while (cursor < lines.length && isHeaderOrNoise(lines[cursor])) {
      cursor += 1;
    }

    const statusCandidate = cursor < lines.length ? lines[cursor] : "";
    const status = normalizeStatus(statusCandidate);
    if (status) {
      cursor += 1;
    }

    while (cursor < lines.length && isHeaderOrNoise(lines[cursor])) {
      cursor += 1;
    }

    let streak = "";
    if (cursor < lines.length && isStreakLine(lines[cursor])) {
      streak = lines[cursor].toUpperCase();
      cursor += 1;
    }

    if (!team || !status) {
      skipped += 1;
      continue;
    }

    entries.push({ rank, team, status, streak });
    imported += 1;
    index = cursor - 1;
  }

  return { entries, imported, skipped };
};

export const buildPowerRankingMap = (entries: TeamPowerRanking[]): TeamPowerRankingMap => {
  const map: TeamPowerRankingMap = {};

  entries.forEach((entry) => {
    makeTeamVariants(entry.team).forEach((variant) => {
      const previous = map[variant];
      if (!previous || entry.rank < previous.rank) {
        map[variant] = entry;
      }
    });
  });

  return map;
};

export const findTeamPowerRanking = (
  map: TeamPowerRankingMap,
  teamName: string
): TeamPowerRanking | null => {
  if (!teamName) return null;

  const variants = makeTeamVariants(teamName);
  for (const variant of variants) {
    if (map[variant]) return map[variant];
  }

  const compactNeedle = compactText(teamName);
  if (!compactNeedle) return null;

  let fallback: TeamPowerRanking | null = null;

  Object.entries(map).forEach(([key, value]) => {
    if (key === compactNeedle || key.includes(compactNeedle) || compactNeedle.includes(key)) {
      if (!fallback || value.rank < fallback.rank) {
        fallback = value;
      }
    }
  });

  return fallback;
};

export const getPowerStatusMeta = (status: string): StatusMeta => {
  const normalized = normalizeStatus(status) ?? status;

  if (normalized === "Burning Hot") {
    return { emoji: "🔥", label: normalized, toneClass: "bg-orange-500/15 border-orange-400/40 text-orange-200" };
  }
  if (normalized === "Burning Hot Down") {
    return { emoji: "🔥⬇️", label: normalized, toneClass: "bg-amber-500/15 border-amber-400/40 text-amber-200" };
  }
  if (normalized === "Average Up") {
    return { emoji: "📈", label: normalized, toneClass: "bg-emerald-500/15 border-emerald-400/40 text-emerald-200" };
  }
  if (normalized === "Average Down") {
    return { emoji: "📉", label: normalized, toneClass: "bg-yellow-500/15 border-yellow-400/40 text-yellow-200" };
  }
  if (normalized === "Average") {
    return { emoji: "⚖️", label: normalized, toneClass: "bg-slate-500/15 border-slate-400/40 text-slate-200" };
  }
  if (normalized === "Ice Cold" || normalized === "Ice Cold Up" || normalized === "Ice Cold Down") {
    const emoji = normalized === "Ice Cold Up" ? "🧊📈" : normalized === "Ice Cold Down" ? "🧊📉" : "🧊";
    return { emoji, label: normalized, toneClass: "bg-cyan-500/15 border-cyan-400/40 text-cyan-200" };
  }
  if (normalized === "Dead" || normalized === "Dead Up" || normalized === "Dead Down") {
    const emoji = normalized === "Dead Up" ? "☠️📈" : normalized === "Dead Down" ? "☠️📉" : "☠️";
    return { emoji, label: normalized, toneClass: "bg-rose-500/15 border-rose-400/40 text-rose-200" };
  }

  return { emoji: "🏁", label: normalized, toneClass: "bg-slate-500/15 border-slate-400/40 text-slate-200" };
};
