const V1_KEY = process.env.THESPORTSDB_V1_KEY || "511123";
const V2_KEY = process.env.THESPORTSDB_V2_KEY || process.env.THESPORTSDB_V1_KEY || "511123";

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const scoreCandidate = (candidate, requested) => {
  const name = normalize(candidate);
  if (!name) return 0;
  if (name === requested) return 100;
  if (name.includes(requested) || requested.includes(name)) return 75;
  return 0;
};

const TEAM_ALIASES = {
  "man utd": "Manchester United",
  "man united": "Manchester United",
  "man city": "Manchester City",
  psg: "Paris Saint-Germain",
  "paris sg": "Paris Saint-Germain",
  inter: "Inter Milan",
  "ac milan": "AC Milan",
  "atletico madrid": "Atl Madrid",
  "newcastle utd": "Newcastle United",
  "h. beer sheva": "Hapoel Beer Sheva",
  "sp. lisbon": "Sporting CP",
};

const aliasName = (teamName) => {
  const compact = normalize(teamName);
  if (TEAM_ALIASES[compact]) return TEAM_ALIASES[compact];
  return String(teamName)
    .replace(/\bUtd\b/gi, "United")
    .replace(/\bSt\.\b/gi, "Saint")
    .replace(/\s+/g, " ")
    .trim();
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const rawTeam = String(req.query.team || "").trim();
  if (!rawTeam) {
    res.status(400).json({ error: "Missing team query parameter" });
    return;
  }
  const team = aliasName(rawTeam);

  try {
    const requested = normalize(team);
    const v1Url = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(V1_KEY)}/searchteams.php?t=${encodeURIComponent(team)}`;
    const v1Response = await fetch(v1Url);
    if (v1Response.ok) {
      const v1Payload = await v1Response.json();
      const teams = Array.isArray(v1Payload?.teams) ? v1Payload.teams : [];
      if (teams.length > 0) {
        const pickLogo = (entry) => {
          const candidates = [entry?.strBadge, entry?.strTeamBadge, entry?.strLogo];
          const found = candidates.find((item) => typeof item === "string" && item.trim());
          return found ? found.trim() : null;
        };

        const best = teams
          .map((entry) => {
            const name = entry?.strTeam || "";
            const shortName = entry?.strTeamShort || "";
            const score = Math.max(scoreCandidate(name, requested), scoreCandidate(shortName, requested));
            return { name, logo: pickLogo(entry), score };
          })
          .sort((a, b) => b.score - a.score)[0];

        if (best?.logo) {
          res.status(200).json({ logo: best.logo, team: best.name || rawTeam });
          return;
        }
      }
    }

    // Premium V2 fallback for missing teams/logos.
    const v2Response = await fetch("https://www.thesportsdb.com/api/v2/json/livescore/soccer", {
      headers: {
        "X-API-KEY": V2_KEY,
      },
    });
    if (!v2Response.ok) {
      res.status(200).json({ logo: null, team: rawTeam });
      return;
    }

    const v2Payload = await v2Response.json();
    const livescore = Array.isArray(v2Payload?.livescore) ? v2Payload.livescore : [];
    const candidates = [];

    livescore.forEach((event) => {
      const homeName = event?.strHomeTeam || "";
      const awayName = event?.strAwayTeam || "";
      const homeScore = scoreCandidate(homeName, requested);
      const awayScore = scoreCandidate(awayName, requested);

      if (homeScore > 0) {
        candidates.push({
          name: homeName,
          logo: typeof event?.strHomeTeamBadge === "string" ? event.strHomeTeamBadge.trim() : null,
          score: homeScore,
        });
      }
      if (awayScore > 0) {
        candidates.push({
          name: awayName,
          logo: typeof event?.strAwayTeamBadge === "string" ? event.strAwayTeamBadge.trim() : null,
          score: awayScore,
        });
      }
    });

    if (candidates.length === 0) {
      res.status(200).json({ logo: null, team: rawTeam });
      return;
    }

    candidates.sort((a, b) => b.score - a.score);
    const best = candidates[0];
    res.status(200).json({ logo: best?.logo || null, team: best?.name || rawTeam });
  } catch {
    res.status(500).json({ error: "Failed to fetch team logo from TheSportsDB" });
  }
}
