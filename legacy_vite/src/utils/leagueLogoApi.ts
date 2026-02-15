const memoryCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
const missingCacheTTL = 1000 * 60 * 60 * 12;
let bundledLogosPromise: Promise<Record<string, string>> | null = null;
let bundledLogoEntriesPromise: Promise<Array<[string, string]>> | null = null;

const normalizeLeague = (value: string) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const compactLeague = (value: string) => normalizeLeague(value).replace(/\s+/g, "");

const storageKey = (key: string) => `snipy:league-logo:v2:${key}`;

const LEAGUE_ALIASES: Record<string, string> = {
  epl: "English Premier League",
  "premier league": "English Premier League",
  "la liga": "Spanish La Liga",
  "serie a": "Italian Serie A",
  bundesliga: "German Bundesliga",
  "ligue 1": "French Ligue 1",
  "champions league": "UEFA Champions League",
  "europa league": "UEFA Europa League",
};

const aliasLeagueName = (leagueName: string) => {
  const key = normalizeLeague(leagueName);
  return LEAGUE_ALIASES[key] ?? leagueName;
};

const loadBundledLogos = async (): Promise<Record<string, string>> => {
  if (!bundledLogosPromise) {
    bundledLogosPromise = fetch("/league-logos.json")
      .then(async (response) => {
        if (!response.ok) return {};
        const body = (await response.json()) as Record<string, string>;
        return body && typeof body === "object" ? body : {};
      })
      .catch(() => ({}));
  }
  return bundledLogosPromise;
};

const loadBundledLogoEntries = async (): Promise<Array<[string, string]>> => {
  if (!bundledLogoEntriesPromise) {
    bundledLogoEntriesPromise = loadBundledLogos().then((logos) =>
      Object.entries(logos).filter(([, value]) => typeof value === "string" && value.trim().length > 0)
    );
  }
  return bundledLogoEntriesPromise;
};

const findBundledLogo = async (leagueName: string): Promise<string | null> => {
  const alias = aliasLeagueName(leagueName);
  const variants = Array.from(
    new Set([normalizeLeague(leagueName), normalizeLeague(alias), compactLeague(leagueName), compactLeague(alias)])
  ).filter(Boolean);

  const bundled = await loadBundledLogos();
  for (const variant of variants) {
    const direct = bundled[variant];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }

  const entries = await loadBundledLogoEntries();
  let best: { logo: string; score: number } | null = null;
  for (const [key, logo] of entries) {
    for (const variant of variants) {
      const score =
        key === variant
          ? 100
          : key.includes(variant) || variant.includes(key)
          ? 70
          : 0;
      if (score > 0 && (!best || score > best.score)) {
        best = { logo, score };
      }
    }
  }
  return best?.logo?.trim() || null;
};

const CANDIDATE_COUNTRIES = [
  "England",
  "Spain",
  "Italy",
  "Germany",
  "France",
  "Netherlands",
  "Portugal",
  "Turkey",
  "International",
  "Europe",
  "World",
];

const pickLeagueLogo = (
  rows: Array<Record<string, unknown>>,
  requestedLeague: string
): string | null => {
  const requestedNorm = normalizeLeague(requestedLeague);
  const requestedCompact = compactLeague(requestedLeague);
  let best: { score: number; logo: string } | null = null;

  for (const row of rows) {
    const name = String(row.strLeague || "");
    const alt = String(row.strLeagueAlternate || "");
    const logoCandidates = [row.strBadge, row.strLogo, row.strFanart1, row.strPoster, row.strBanner]
      .map((item) => String(item || "").trim())
      .filter(Boolean);
    if (logoCandidates.length === 0) continue;
    const logo = logoCandidates[0];

    const variants = [name, alt];
    let score = 0;
    for (const variant of variants) {
      const norm = normalizeLeague(variant);
      const compact = compactLeague(variant);
      if (!norm) continue;
      if (norm === requestedNorm || compact === requestedCompact) {
        score = Math.max(score, 100);
      } else if (norm.includes(requestedNorm) || requestedNorm.includes(norm)) {
        score = Math.max(score, 80);
      } else if (compact.includes(requestedCompact) || requestedCompact.includes(compact)) {
        score = Math.max(score, 70);
      }
    }
    if (score > 0 && (!best || score > best.score)) best = { score, logo };
  }

  return best?.logo ?? null;
};

const directTheSportsDbLookup = async (leagueName: string, country?: string): Promise<string | null> => {
  const countries = Array.from(new Set([country?.trim(), ...CANDIDATE_COUNTRIES])).filter(
    (entry): entry is string => Boolean(entry)
  );

  for (const c of countries) {
    const url = `https://www.thesportsdb.com/api/v1/json/511123/search_all_leagues.php?c=${encodeURIComponent(
      c
    )}&s=Soccer`;
    const response = await fetch(url);
    if (!response.ok) continue;
    const body = (await response.json()) as { countries?: Array<Record<string, unknown>> };
    const rows = Array.isArray(body.countries) ? body.countries : [];
    const logo = pickLeagueLogo(rows, leagueName);
    if (logo) return logo;
  }

  return null;
};

export async function fetchLeagueLogo(leagueName: string, country?: string): Promise<string | null> {
  const normalizedLeague = normalizeLeague(leagueName);
  const normalizedCountry = normalizeLeague(country || "");
  const key = `${normalizedCountry}|${normalizedLeague}`;

  if (!normalizedLeague) return null;
  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  const bundledLogo = await findBundledLogo(leagueName);
  if (bundledLogo) {
    memoryCache.set(key, bundledLogo);
    return bundledLogo;
  }

  try {
    const stored = localStorage.getItem(storageKey(key));
    if (stored) {
      const parsed = JSON.parse(stored) as { logo?: string | null; ts?: number };
      if (parsed?.logo) {
        memoryCache.set(key, parsed.logo);
        return parsed.logo;
      }
      if (parsed?.logo === null && typeof parsed.ts === "number" && Date.now() - parsed.ts < missingCacheTTL) {
        memoryCache.set(key, null);
        return null;
      }
    }
  } catch {
    // Ignore storage parse errors.
  }

  if (inflight.has(key)) return inflight.get(key) ?? null;

  const request = fetch(
    `/api/league-logo?league=${encodeURIComponent(aliasLeagueName(leagueName))}&country=${encodeURIComponent(
      country || ""
    )}`
  )
    .then(async (response) => {
      if (response.ok) {
        const body = (await response.json()) as { logo?: string | null };
        const logo = body.logo?.trim() || null;
        if (logo) return logo;
      }
      return directTheSportsDbLookup(aliasLeagueName(leagueName), country);
    })
    .catch(() => directTheSportsDbLookup(aliasLeagueName(leagueName), country).catch(() => null))
    .then((logo) => {
      memoryCache.set(key, logo);
      try {
        localStorage.setItem(storageKey(key), JSON.stringify({ logo, ts: Date.now() }));
      } catch {
        // Ignore storage write errors.
      }
      return logo;
    })
    .finally(() => {
      inflight.delete(key);
    });

  inflight.set(key, request);
  return request;
}

export const getLeagueKey = (leagueName: string, country?: string) => {
  const normalizedLeague = compactLeague(leagueName);
  const normalizedCountry = compactLeague(country || "");
  return `${normalizedCountry}|${normalizedLeague}`;
};
