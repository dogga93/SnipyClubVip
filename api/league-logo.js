const V1_KEY = process.env.THESPORTSDB_V1_KEY || "511123";

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const simplifyLeague = (value) =>
  normalize(value)
    .replace(/\b(league|division|cup|tournament|competition|soccer|football)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const scoreLeagueCandidate = (candidate, requested) => {
  const name = normalize(candidate);
  const simpleName = simplifyLeague(candidate);
  if (!name) return 0;
  if (name === requested || simpleName === requested) return 100;
  if (name.includes(requested) || requested.includes(name)) return 80;
  if (simpleName && (simpleName.includes(requested) || requested.includes(simpleName))) return 70;
  return 0;
};

const logoFromLeague = (entry) => {
  const candidates = [entry?.strBadge, entry?.strLogo, entry?.strFanart1, entry?.strPoster, entry?.strBanner];
  const found = candidates.find((item) => typeof item === "string" && item.trim());
  return found ? found.trim() : null;
};

const fetchLeaguesByCountry = async (country, sport) => {
  const url = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(
    V1_KEY
  )}/search_all_leagues.php?c=${encodeURIComponent(country)}&s=${encodeURIComponent(sport)}`;
  const response = await fetch(url);
  if (!response.ok) return [];
  const payload = await response.json();
  return Array.isArray(payload?.countries) ? payload.countries : [];
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawLeague = String(req.query.league || "").trim();
  const rawCountry = String(req.query.country || "").trim();
  const sport = String(req.query.sport || "Soccer").trim() || "Soccer";

  if (!rawLeague) {
    res.status(400).json({ error: "Missing league query parameter" });
    return;
  }

  try {
    const requested = simplifyLeague(rawLeague) || normalize(rawLeague);

    const countryCandidates = Array.from(
      new Set([
        rawCountry,
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
      ])
    ).filter(Boolean);

    let best = null;

    for (const country of countryCandidates) {
      const leagues = await fetchLeaguesByCountry(country, sport);
      for (const entry of leagues) {
        const name = entry?.strLeague || "";
        const alternate = entry?.strLeagueAlternate || "";
        const score = Math.max(scoreLeagueCandidate(name, requested), scoreLeagueCandidate(alternate, requested));
        const logo = logoFromLeague(entry);
        if (!logo || score <= 0) continue;
        if (!best || score > best.score) {
          best = { logo, score, name: name || rawLeague, country: entry?.strCountry || country };
        }
      }
      if (best?.score >= 100) break;
    }

    res.status(200).json({
      logo: best?.logo || null,
      league: best?.name || rawLeague,
      country: best?.country || rawCountry || null,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch league logo from TheSportsDB" });
  }
}
