const V2_KEY = process.env.THESPORTSDB_V2_KEY || process.env.THESPORTSDB_V1_KEY || "511123";
const V1_KEY = process.env.THESPORTSDB_V1_KEY || process.env.THESPORTSDB_V2_KEY || "511123";
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.FOOTBALL_DATA_API_TOKEN || "";

const toText = (value) => String(value ?? "").trim();

const toNumber = (value) => {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  const normalized = String(value ?? "").replace(",", ".").trim();
  if (!normalized) return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
};

const extractScore = (event, side) => {
  const candidates =
    side === "home"
      ? [
          event?.intHomeScore,
          event?.homeScore,
          event?.home_score,
          event?.strHomeScore,
          event?.HomeScore,
          event?.scoreHome,
        ]
      : [
          event?.intAwayScore,
          event?.awayScore,
          event?.away_score,
          event?.strAwayScore,
          event?.AwayScore,
          event?.scoreAway,
        ];
  for (const candidate of candidates) {
    const parsed = toNumber(candidate);
    if (parsed != null) return parsed;
  }
  return null;
};

const buildLiveScore = (event) => {
  const home = extractScore(event, "home");
  const away = extractScore(event, "away");
  if (home == null || away == null) return null;
  return `${home}-${away}`;
};

const normalizeDate = (raw) => {
  const value = String(raw || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const normalizeStatus = (value) => {
  const raw = toText(value);
  const lowered = raw.toLowerCase();
  if (!lowered) return { status: "", phase: "unknown" };
  if (
    lowered.includes("ft") ||
    lowered.includes("full time") ||
    lowered.includes("finished") ||
    lowered.includes("ended") ||
    lowered.includes("aet") ||
    lowered.includes("pen")
  ) {
    return { status: "FT", phase: "final" };
  }
  if (
    lowered.includes("live") ||
    lowered.includes("in play") ||
    lowered.includes("1h") ||
    lowered.includes("2h") ||
    lowered.includes("ht") ||
    lowered.includes("half")
  ) {
    return { status: "LIVE", phase: "live" };
  }
  return { status: raw, phase: "unknown" };
};

const mapEvent = (event, index, fallbackPhase = "unknown") => {
  const homeTeam = toText(event?.strHomeTeam);
  const awayTeam = toText(event?.strAwayTeam);
  const liveScore = buildLiveScore(event);
  if (!homeTeam || !awayTeam || !liveScore) return null;

  const rawStatus = toText(event?.strStatus || event?.strProgress || event?.strEventStatus || event?.strTime);
  const normalized = normalizeStatus(rawStatus);
  const phase = normalized.phase === "unknown" ? fallbackPhase : normalized.phase;
  const status =
    normalized.phase === "unknown"
      ? phase === "final"
        ? "FT"
        : phase === "live"
        ? "LIVE"
        : rawStatus
      : normalized.status;

  return {
    id: `${homeTeam}-${awayTeam}-${index}`,
    homeTeam,
    awayTeam,
    liveScore,
    status,
    phase,
    league: toText(event?.strLeague || event?.strLeagueName),
    kickoff: toText(event?.strTimestamp || event?.dateEvent),
    source: "thesportsdb",
  };
};

const toFootballDataPhase = (statusRaw) => {
  const status = toText(statusRaw).toUpperCase();
  if (!status) return { phase: "unknown", status: "" };
  if (["IN_PLAY", "PAUSED", "SUSPENDED", "LIVE"].includes(status)) return { phase: "live", status: "LIVE" };
  if (["FINISHED", "AET", "PENALTY_SHOOTOUT"].includes(status)) return { phase: "final", status: "FT" };
  return { phase: "unknown", status };
};

const footballDataScore = (match) => {
  const full = match?.score?.fullTime || {};
  const half = match?.score?.halfTime || {};
  const homeFull = toNumber(full.home);
  const awayFull = toNumber(full.away);
  if (homeFull != null && awayFull != null) return `${homeFull}-${awayFull}`;
  const homeHalf = toNumber(half.home);
  const awayHalf = toNumber(half.away);
  if (homeHalf != null && awayHalf != null) return `${homeHalf}-${awayHalf}`;
  return null;
};

const mapFootballDataMatch = (match, index) => {
  const homeTeam = toText(match?.homeTeam?.name);
  const awayTeam = toText(match?.awayTeam?.name);
  const score = footballDataScore(match);
  if (!homeTeam || !awayTeam || !score) return null;
  const state = toFootballDataPhase(match?.status);
  return {
    id: `${homeTeam}-${awayTeam}-fd-${index}`,
    homeTeam,
    awayTeam,
    liveScore: score,
    status: state.status,
    phase: state.phase,
    league: toText(match?.competition?.name),
    kickoff: toText(match?.utcDate),
    source: "football-data",
  };
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    res.status(405).json({ error: "Method not allowed" });
    return;
  }

  const sport = toText(req.query.sport || "soccer").toLowerCase();
  const date = normalizeDate(req.query.date);
  if (sport !== "soccer") {
    res.status(200).json({ updatedAt: new Date().toISOString(), matches: [] });
    return;
  }

  try {
    const liveResponse = await fetch(`https://www.thesportsdb.com/api/v2/json/livescore/${encodeURIComponent(sport)}`, {
      headers: { "X-API-KEY": V2_KEY },
    });

    const finalResponse = await fetch(
      `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(V1_KEY)}/eventsday.php?d=${encodeURIComponent(
        date
      )}&s=Soccer`
    );

    const byTeams = new Map();
    const putMatch = (mapped) => {
      if (!mapped) return;
      const key = `${mapped.homeTeam.toLowerCase()}|${mapped.awayTeam.toLowerCase()}`;
      const existing = byTeams.get(key);
      if (!existing) {
        byTeams.set(key, mapped);
        return;
      }
      const existingLive = existing.phase === "live";
      const nextLive = mapped.phase === "live";
      if (nextLive && !existingLive) {
        byTeams.set(key, mapped);
        return;
      }
      if (nextLive === existingLive) {
        // Prefer TheSportsDB for consistency if same phase.
        if (existing.source !== "thesportsdb" && mapped.source === "thesportsdb") {
          byTeams.set(key, mapped);
        }
      }
    };

    if (finalResponse.ok) {
      const payload = await finalResponse.json();
      const rows = Array.isArray(payload?.events) ? payload.events : [];
      rows.forEach((event, index) => {
        const mapped = mapEvent(event, index, "final");
        putMatch(mapped);
      });
    }

    if (liveResponse.ok) {
      const payload = await liveResponse.json();
      const rows = Array.isArray(payload?.livescore) ? payload.livescore : [];
      rows.forEach((event, index) => {
        const mapped = mapEvent(event, index, "live");
        putMatch(mapped);
      });
    }

    if (FOOTBALL_DATA_TOKEN) {
      try {
        const fdRes = await fetch(
          `https://api.football-data.org/v4/matches?dateFrom=${encodeURIComponent(date)}&dateTo=${encodeURIComponent(date)}`,
          {
            headers: { "X-Auth-Token": FOOTBALL_DATA_TOKEN },
          }
        );
        if (fdRes.ok) {
          const fdPayload = await fdRes.json();
          const fdRows = Array.isArray(fdPayload?.matches) ? fdPayload.matches : [];
          fdRows.forEach((match, index) => {
            putMatch(mapFootballDataMatch(match, index));
          });
        }
      } catch {
        // Ignore football-data fallback failures.
      }
    }

    const matches = Array.from(byTeams.values());

    res.status(200).json({
      updatedAt: new Date().toISOString(),
      date,
      matches,
    });
  } catch {
    res.status(500).json({ error: "Failed to fetch live scores from TheSportsDB" });
  }
}
