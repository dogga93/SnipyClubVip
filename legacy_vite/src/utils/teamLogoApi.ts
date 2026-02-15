const memoryCache = new Map<string, string | null>();
const inflight = new Map<string, Promise<string | null>>();
const missingCacheTTL = 1000 * 60 * 60 * 12;
let bundledLogosPromise: Promise<Record<string, string>> | null = null;
let bundledLogoEntriesPromise: Promise<Array<[string, string]>> | null = null;

const normalizeTeam = (teamName: string) =>
  teamName
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const compactTeam = (teamName: string) => normalizeTeam(teamName).replace(/\s+/g, "");
const stripNoiseWords = (teamName: string) =>
  normalizeTeam(teamName)
    .replace(/\b(fc|cf|sc|afc|club|the)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const storageKey = (normalizedTeam: string) => `snipy:team-logo:v3:${normalizedTeam}`;
const TEAM_ALIASES: Record<string, string> = {
  "man utd": "Manchester United",
  "man united": "Manchester United",
  "man city": "Manchester City",
  psg: "Paris Saint-Germain",
  "paris sg": "Paris Saint-Germain",
  inter: "Inter Milan",
  "ac milan": "AC Milan",
  "atletico madrid": "Atl Madrid",
  "bayern munich": "Bayern Munich",
  "newcastle utd": "Newcastle United",
  "h. beer sheva": "Hapoel Beer Sheva",
  "sp. lisbon": "Sporting CP",
};

const aliasName = (teamName: string) => {
  const compact = normalizeTeam(teamName);
  const direct = TEAM_ALIASES[compact];
  if (direct) return direct;
  return teamName
    .replace(/\bUtd\b/gi, "United")
    .replace(/\bSt\.\b/gi, "Saint")
    .replace(/\s+/g, " ")
    .trim();
};

const loadBundledLogos = async (): Promise<Record<string, string>> => {
  if (!bundledLogosPromise) {
    bundledLogosPromise = fetch("/team-logos.json")
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

const findBundledLogo = async (teamName: string): Promise<string | null> => {
  const alias = aliasName(teamName);
  const variants = Array.from(
    new Set([
      normalizeTeam(teamName),
      normalizeTeam(alias),
      stripNoiseWords(teamName),
      stripNoiseWords(alias),
      compactTeam(teamName),
      compactTeam(alias),
    ])
  ).filter(Boolean);

  const bundled = await loadBundledLogos();
  for (const variant of variants) {
    const direct = bundled[variant];
    if (typeof direct === "string" && direct.trim()) return direct.trim();
  }

  const entries = await loadBundledLogoEntries();
  let best: { logo: string; score: number } | null = null;

  for (const [k, logo] of entries) {
    for (const variant of variants) {
      if (!variant) continue;
      const score =
        k === variant ? 100 :
        k.includes(variant) || variant.includes(k) ? 70 :
        0;
      if (score > 0 && (!best || score > best.score)) {
        best = { logo, score };
      }
    }
  }

  return best?.logo?.trim() || null;
};

export async function fetchTeamLogo(teamName: string): Promise<string | null> {
  const key = normalizeTeam(teamName);
  if (!key) return null;

  if (memoryCache.has(key)) return memoryCache.get(key) ?? null;

  const bundledLogo = await findBundledLogo(teamName);
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
    // Ignore storage errors and continue with network call.
  }

  if (inflight.has(key)) return inflight.get(key) ?? null;

  const request = fetch(`/api/team-logo?team=${encodeURIComponent(aliasName(teamName))}`)
    .then(async (response) => {
      if (response.ok) {
        const body = (await response.json()) as { logo?: string | null };
        const fromApi = body.logo?.trim() || null;
        if (fromApi) return fromApi;
      }
      return null;
    })
    .catch(() => null)
    .then((logo) => {
      memoryCache.set(key, logo);
      try {
        localStorage.setItem(storageKey(key), JSON.stringify({ logo, ts: Date.now() }));
      } catch {
        // Ignore storage errors.
      }
      return logo;
    })
    .finally(() => inflight.delete(key));

  inflight.set(key, request);
  return request;
}

export async function preloadTeamLogos(teamNames: string[], concurrency = 4): Promise<void> {
  const names = Array.from(
    new Set(
      teamNames
        .map((name) => name?.trim())
        .filter((name): name is string => Boolean(name))
    )
  );
  if (names.length === 0) return;

  const workerCount = Math.max(1, Math.min(concurrency, names.length));
  let cursor = 0;

  const worker = async () => {
    while (cursor < names.length) {
      const index = cursor;
      cursor += 1;
      await fetchTeamLogo(names[index]);
    }
  };

  await Promise.all(Array.from({ length: workerCount }, () => worker()));
}
