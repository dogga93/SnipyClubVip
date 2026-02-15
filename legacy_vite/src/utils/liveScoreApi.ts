type LiveScoreItem = {
  homeTeam: string;
  awayTeam: string;
  liveScore: string;
  status?: string;
  phase?: "live" | "final" | "unknown";
  league?: string;
  kickoff?: string;
};

type LiveScoreResponse = {
  updatedAt?: string;
  date?: string;
  matches?: LiveScoreItem[];
};

export type LiveScoreDetail = {
  score: string;
  status?: string;
  phase?: "live" | "final" | "unknown";
};

export type LiveScoreDetailMap = Record<string, LiveScoreDetail>;

const TEAM_ALIASES: Record<string, string> = {
  "c osaka": "cerezo osaka",
  "cerezo osaka": "cerezo osaka",
  "g osaka": "gamba osaka",
  "gamba osaka": "gamba osaka",
  nagoya: "nagoya grampus",
  "nagoya grampus": "nagoya grampus",
  "man utd": "manchester united",
  "man united": "manchester united",
  "man city": "manchester city",
  "inter milan": "inter",
  "inter de milan": "inter",
  "ac milan": "milan",
  "psg paris": "paris saint germain",
  psg: "paris saint germain",
  "paris sg": "paris saint germain",
  "sporting lisbon": "sporting cp",
  "sporting lisbonne": "sporting cp",
  "atletico madrid": "atl madrid",
  "athletico madrid": "atl madrid",
  "ath bilbao": "athletic bilbao",
  "athletic club": "athletic bilbao",
  "athletic de bilbao": "athletic bilbao",
  "athletic club bilbao": "athletic bilbao",
  "r oviedo": "real oviedo",
  "real oviedo cf": "real oviedo",
  "real madrid cf": "real madrid",
  "fc barcelona": "barcelona",
  "fc bayern munchen": "bayern munich",
  "bayern munchen": "bayern munich",
  juventus: "juventus",
  "manchester utd": "manchester united",
  leeds: "leeds united",
  "leeds utd": "leeds united",
  "leeds united": "leeds united",
  "newcastle utd": "newcastle united",
  "newcastle": "newcastle united",
  "nottingham": "nottingham forest",
  "notts forest": "nottingham forest",
  "qpr": "queens park rangers",
  "spurs": "tottenham",
  "west brom": "west bromwich albion",
  "wolves": "wolverhampton wanderers",
};

const baseNormalize = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const normalizeTeam = (value: string) => {
  let normalized = baseNormalize(value);
  normalized = normalized
    .replace(/\b(w|women|femmes?|ladies)\b/g, " ")
    .replace(/\bu ?\d{2}\b/g, " ")
    .replace(/\bl['’]\s*/g, "")
    .replace(/\bde\b/g, " ")
    .replace(/\bdu\b/g, " ")
    .replace(/\bdes\b/g, " ")
    .replace(/\bet\b/g, " ")
    .replace(/\batl\b/g, "atletico")
    .replace(/\butd\b/g, "united")
    .replace(/\bst\b/g, "saint")
    .replace(/\bste\b/g, "saint")
    .replace(/^r\s+/, "real ")
    .replace(/^ath\s+/, "athletic ")
    .replace(/\bsv\b/g, " ")
    .replace(/\bcalcio\b/g, " ")
    .replace(/\bfootball\b/g, " ")
    .replace(/\bfoot\b/g, " ")
    .replace(/\bii\b/g, "2")
    .replace(/\s+/g, " ")
    .trim();
  return TEAM_ALIASES[normalized] ?? normalized;
};

const keyForTeams = (homeTeam: string, awayTeam: string) =>
  `${normalizeTeam(homeTeam)}|${normalizeTeam(awayTeam)}`;

const compactTeam = (value: string) => normalizeTeam(value).replace(/\s+/g, "");

const stripNoiseWords = (value: string) =>
  normalizeTeam(value)
    .replace(/\b(fc|cf|sc|afc|club|deportivo|atletico|team|club de football|football club|sociedad|associazione)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const tokenSet = (value: string) =>
  new Set(
    stripNoiseWords(value)
      .split(" ")
      .map((t) => t.trim())
      .filter((t) => t.length > 1)
  );

const tokenSimilarity = (left: string, right: string) => {
  const a = tokenSet(left);
  const b = tokenSet(right);
  if (a.size === 0 || b.size === 0) return 0;
  let inter = 0;
  a.forEach((item) => {
    if (b.has(item)) inter += 1;
  });
  const union = a.size + b.size - inter;
  return union === 0 ? 0 : inter / union;
};

const fuzzyBestScoreMatch = (
  entries: Array<[string, string]>,
  homeTeam: string,
  awayTeam: string
) => {
  let best: { score: string; rank: number } | null = null;
  const homeNorm = normalizeTeam(homeTeam);
  const awayNorm = normalizeTeam(awayTeam);

  for (const [key, score] of entries) {
    const [h, a] = key.split("|");
    if (!h || !a) continue;
    const homeSim = Math.max(tokenSimilarity(h, homeNorm), tokenSimilarity(homeNorm, h));
    const awaySim = Math.max(tokenSimilarity(a, awayNorm), tokenSimilarity(awayNorm, a));
    const rank = homeSim * 0.55 + awaySim * 0.45;
    const strongOneSide = (homeSim >= 0.78 && awaySim >= 0.18) || (awaySim >= 0.78 && homeSim >= 0.18);
    if ((homeSim >= 0.34 && awaySim >= 0.34) || strongOneSide) {
      if (!best || rank > best.rank) best = { score, rank };
    }
  }

  if (best && best.rank >= 0.3) return best.score;
  return null;
};

const fuzzyBestDetailMatch = (
  entries: Array<[string, LiveScoreDetail]>,
  homeTeam: string,
  awayTeam: string
) => {
  let best: { detail: LiveScoreDetail; rank: number } | null = null;
  const homeNorm = normalizeTeam(homeTeam);
  const awayNorm = normalizeTeam(awayTeam);

  for (const [key, detail] of entries) {
    const [h, a] = key.split("|");
    if (!h || !a) continue;
    const homeSim = Math.max(tokenSimilarity(h, homeNorm), tokenSimilarity(homeNorm, h));
    const awaySim = Math.max(tokenSimilarity(a, awayNorm), tokenSimilarity(awayNorm, a));
    const rank = homeSim * 0.55 + awaySim * 0.45;
    const strongOneSide = (homeSim >= 0.78 && awaySim >= 0.18) || (awaySim >= 0.78 && homeSim >= 0.18);
    if ((homeSim >= 0.34 && awaySim >= 0.34) || strongOneSide) {
      if (!best || rank > best.rank) best = { detail, rank };
    }
  }

  if (best && best.rank >= 0.3) return best.detail;
  return null;
};

const teamVariants = (value: string) => {
  const normalized = normalizeTeam(value);
  const compact = compactTeam(value);
  const stripped = stripNoiseWords(value);
  return Array.from(new Set([normalized, stripped, compact].filter(Boolean)));
};

const matchKeys = (homeTeam: string, awayTeam: string) => {
  const keys = new Set<string>();
  const homeVariants = teamVariants(homeTeam);
  const awayVariants = teamVariants(awayTeam);
  homeVariants.forEach((h) => {
    awayVariants.forEach((a) => {
      keys.add(`${h}|${a}`);
    });
  });
  return Array.from(keys);
};

const swapScore = (score: string) => {
  const match = String(score || "").trim().match(/^(\d+)\s*[-:]\s*(\d+)$/);
  if (!match) return score;
  return `${match[2]}-${match[1]}`;
};

export const upsertScoreMap = (
  target: Record<string, string>,
  homeTeam: string,
  awayTeam: string,
  score: string
) => {
  const reversed = swapScore(score);
  matchKeys(homeTeam, awayTeam).forEach((key) => {
    target[key] = score;
  });
  matchKeys(awayTeam, homeTeam).forEach((key) => {
    target[key] = reversed;
  });
};

export const upsertScoreDetailMap = (
  target: LiveScoreDetailMap,
  homeTeam: string,
  awayTeam: string,
  detail: LiveScoreDetail
) => {
  const reversed = swapScore(detail.score);
  const reverseStatus = detail.phase === "live" ? "LIVE" : detail.phase === "final" ? "FT" : detail.status;
  matchKeys(homeTeam, awayTeam).forEach((key) => {
    target[key] = detail;
  });
  matchKeys(awayTeam, homeTeam).forEach((key) => {
    target[key] = { ...detail, score: reversed, status: reverseStatus };
  });
};

export const buildLiveScoreMap = (rows: LiveScoreItem[]): Record<string, string> => {
  const out: Record<string, string> = {};
  rows.forEach((row) => {
    upsertScoreMap(out, row.homeTeam, row.awayTeam, row.liveScore);
  });
  return out;
};

export const buildLiveScoreDetailMap = (rows: LiveScoreItem[]): LiveScoreDetailMap => {
  const out: LiveScoreDetailMap = {};
  rows.forEach((row) => {
    upsertScoreDetailMap(out, row.homeTeam, row.awayTeam, {
      score: row.liveScore,
      status: row.status,
      phase: row.phase,
    });
  });
  return out;
};

export const getLiveScoreKey = (homeTeam: string, awayTeam: string) => keyForTeams(homeTeam, awayTeam);

export const resolveLiveScore = (
  map: Record<string, string>,
  homeTeam: string,
  awayTeam: string
) => {
  const exact = map[getLiveScoreKey(homeTeam, awayTeam)];
  if (exact) return exact;

  const candidateKeys = matchKeys(homeTeam, awayTeam);
  for (const key of candidateKeys) {
    if (map[key]) return map[key];
  }

  const homeNorm = normalizeTeam(homeTeam);
  const awayNorm = normalizeTeam(awayTeam);
  const entries = Object.entries(map);
  for (const [key, score] of entries) {
    const [h, a] = key.split("|");
    if (!h || !a) continue;
    const homeOk =
      h === homeNorm || h.includes(homeNorm) || homeNorm.includes(h) || compactTeam(h) === compactTeam(homeNorm);
    const awayOk =
      a === awayNorm || a.includes(awayNorm) || awayNorm.includes(a) || compactTeam(a) === compactTeam(awayNorm);
    if (homeOk && awayOk) return score;
  }

  return fuzzyBestScoreMatch(entries, homeTeam, awayTeam);
};

export const resolveLiveScoreDetail = (
  map: LiveScoreDetailMap,
  homeTeam: string,
  awayTeam: string
) => {
  const exact = map[getLiveScoreKey(homeTeam, awayTeam)];
  if (exact) return exact;

  const candidateKeys = matchKeys(homeTeam, awayTeam);
  for (const key of candidateKeys) {
    if (map[key]) return map[key];
  }

  const homeNorm = normalizeTeam(homeTeam);
  const awayNorm = normalizeTeam(awayTeam);
  const entries = Object.entries(map);
  for (const [key, detail] of entries) {
    const [h, a] = key.split("|");
    if (!h || !a) continue;
    const homeOk =
      h === homeNorm || h.includes(homeNorm) || homeNorm.includes(h) || compactTeam(h) === compactTeam(homeNorm);
    const awayOk =
      a === awayNorm || a.includes(awayNorm) || awayNorm.includes(a) || compactTeam(a) === compactTeam(awayNorm);
    if (homeOk && awayOk) return detail;
  }
  return fuzzyBestDetailMatch(entries, homeTeam, awayTeam);
};

const toNumber = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const parsed = Number(String(value ?? "").replace(",", ".").trim());
  return Number.isFinite(parsed) ? parsed : null;
};

const parseScore = (event: Record<string, unknown>) => {
  const homeCandidates = [event.intHomeScore, event.homeScore, event.home_score, event.strHomeScore];
  const awayCandidates = [event.intAwayScore, event.awayScore, event.away_score, event.strAwayScore];
  let home: number | null = null;
  let away: number | null = null;
  for (const item of homeCandidates) {
    const n = toNumber(item);
    if (n != null) {
      home = n;
      break;
    }
  }
  for (const item of awayCandidates) {
    const n = toNumber(item);
    if (n != null) {
      away = n;
      break;
    }
  }
  if (home == null || away == null) return null;
  return `${home}-${away}`;
};

const parsePhase = (statusRaw: string): "live" | "final" | "unknown" => {
  const lowered = String(statusRaw || "").toLowerCase();
  if (!lowered) return "unknown";
  if (
    lowered.includes("ft") ||
    lowered.includes("full time") ||
    lowered.includes("finished") ||
    lowered.includes("ended") ||
    lowered.includes("aet") ||
    lowered.includes("pen")
  ) {
    return "final";
  }
  if (
    lowered.includes("live") ||
    lowered.includes("in play") ||
    lowered.includes("1h") ||
    lowered.includes("2h") ||
    lowered.includes("ht") ||
    lowered.includes("half")
  ) {
    return "live";
  }
  return "unknown";
};

const parseLiveRows = (rows: Array<Record<string, unknown>>): LiveScoreItem[] =>
  rows
    .map((event) => {
      const homeTeam = String(event.strHomeTeam || "").trim();
      const awayTeam = String(event.strAwayTeam || "").trim();
      const liveScore = parseScore(event);
      const status = String(event.strStatus || event.strProgress || event.strEventStatus || "");
      if (!homeTeam || !awayTeam || !liveScore) return null;
      return {
        homeTeam,
        awayTeam,
        liveScore,
        status,
        phase: parsePhase(status),
        league: String(event.strLeague || event.strLeagueName || ""),
        kickoff: String(event.strTimestamp || event.dateEvent || ""),
      } satisfies LiveScoreItem;
    })
    .filter((entry): entry is LiveScoreItem => Boolean(entry));

export async function fetchLiveScoreDetailMap(
  sport = "soccer",
  date?: string
): Promise<LiveScoreDetailMap> {
  try {
    const params = new URLSearchParams({ sport });
    if (date) params.set("date", date);
    const response = await fetch(`/api/live-scores?${params.toString()}`);
    if (response.ok) {
      const body = (await response.json()) as LiveScoreResponse;
      const matches = Array.isArray(body.matches) ? body.matches : [];
      const map = buildLiveScoreDetailMap(matches);
      if (Object.keys(map).length > 0) return map;
    }
  } catch {
    // fallback below
  }

  try {
    const v2 = await fetch(`https://www.thesportsdb.com/api/v2/json/livescore/${encodeURIComponent(sport)}`, {
      headers: { "X-API-KEY": "511123" },
    });
    if (v2.ok) {
      const payload = (await v2.json()) as { livescore?: Array<Record<string, unknown>> };
      const rows = Array.isArray(payload?.livescore) ? payload.livescore : [];
      const map = buildLiveScoreDetailMap(parseLiveRows(rows));
      if (Object.keys(map).length > 0) return map;
    }
  } catch {
    // fallback below
  }

  return {};
}

export async function fetchLiveScoreMap(sport = "soccer", date?: string): Promise<Record<string, string>> {
  const detailMap = await fetchLiveScoreDetailMap(sport, date);
  const out: Record<string, string> = {};
  Object.entries(detailMap).forEach(([key, value]) => {
    out[key] = value.score;
  });
  return out;
}
