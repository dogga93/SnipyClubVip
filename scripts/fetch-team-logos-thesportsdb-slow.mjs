import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const ROOT = "/Users/hammamimac/Downloads/snipy";
const MONITORS_DIR = path.join(ROOT, "public", "monitors");
const OUTPUT_FILE = path.join(ROOT, "public", "team-logos.json");
const V1_KEY = process.env.THESPORTSDB_V1_KEY || "511123";
const V2_KEY = process.env.THESPORTSDB_V2_KEY || process.env.THESPORTSDB_V1_KEY || "511123";
const API_BASE = `https://www.thesportsdb.com/api/v1/json/${V1_KEY}/searchteams.php?t=`;

const DELAY_MS = Number(process.env.DELAY_MS || 1500); // 1 req / 1.5s par defaut
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS || 15000);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 4);
const LIMIT = Number(process.env.LIMIT || 0); // 0 = toutes les equipes
const START_INDEX = Number(process.env.START_INDEX || 0);

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normHeader = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const looksLikeTeam = (value) => {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^\d+(?:\.\d+)?$/.test(text)) return false;
  return /[a-z]/i.test(text);
};

const parseGame = (value) => {
  const text = String(value || "").trim();
  if (!text) return null;
  const separators = [" vs ", " v ", " - ", " x "];
  for (const sep of separators) {
    const idx = text.toLowerCase().indexOf(sep);
    if (idx > 0) {
      const a = text.slice(0, idx).trim();
      const b = text.slice(idx + sep.length).trim();
      if (looksLikeTeam(a) && looksLikeTeam(b)) return [a, b];
    }
  }
  return null;
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
  const key = normalize(teamName);
  if (TEAM_ALIASES[key]) return TEAM_ALIASES[key];
  return String(teamName)
    .replace(/\bUtd\b/gi, "United")
    .replace(/\bSt\.\b/gi, "Saint")
    .replace(/\s+/g, " ")
    .trim();
};

const pickLogo = (entry) => {
  const candidates = [entry?.strBadge, entry?.strTeamBadge, entry?.strLogo];
  const found = candidates.find((item) => typeof item === "string" && item.trim());
  return found ? found.trim() : null;
};

const scoreCandidate = (candidate, requested) => {
  const c = normalize(candidate);
  if (!c) return 0;
  if (c === requested) return 100;
  if (c.includes(requested) || requested.includes(c)) return 70;
  return 0;
};

const extractTeams = () => {
  const teams = new Set();
  const files = fs
    .readdirSync(MONITORS_DIR)
    .filter((file) => file.toLowerCase().endsWith(".xlsx"))
    .map((file) => path.join(MONITORS_DIR, file));

  for (const file of files) {
    try {
      const workbook = XLSX.readFile(file, { cellDates: false });
      const first = workbook.SheetNames[0];
      if (!first) continue;
      const sheet = workbook.Sheets[first];
      const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
      if (!Array.isArray(rows) || rows.length === 0) continue;

      const header = rows[0] || [];
      const headers = header.map((h) => normHeader(h));
      const col = (aliases) => headers.findIndex((h) => aliases.some((a) => h === a));

      const homeCol = col(["home", "hometeam", "team1", "participant1"]);
      const awayCol = col(["away", "awayteam", "team2", "participant2"]);
      const gameCol = col(["game", "match", "fixture", "event"]);

      for (let i = 1; i < rows.length; i += 1) {
        const row = rows[i] || [];
        if (homeCol >= 0 && awayCol >= 0) {
          const home = String(row[homeCol] || "").trim();
          const away = String(row[awayCol] || "").trim();
          if (looksLikeTeam(home)) teams.add(home);
          if (looksLikeTeam(away)) teams.add(away);
          continue;
        }

        if (gameCol >= 0) {
          const parsed = parseGame(row[gameCol]);
          if (parsed) {
            teams.add(parsed[0]);
            teams.add(parsed[1]);
          }
        }
      }
    } catch {
      // ignore file read errors
    }
  }

  return Array.from(teams);
};

const fetchTeamLogoSlow = async (teamName) => {
  const query = aliasName(teamName);
  const requested = normalize(query);

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(`${API_BASE}${encodeURIComponent(query)}`);

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) return null;
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    if (!response.ok) return null;

    const payload = await response.json().catch(() => ({}));
    const rows = Array.isArray(payload?.teams) ? payload.teams : [];
    if (rows.length === 0) return null;

    const best = rows
      .map((entry) => {
        const name = entry?.strTeam || "";
        const shortName = entry?.strTeamShort || "";
        const logo = pickLogo(entry);
        const score = Math.max(scoreCandidate(name, requested), scoreCandidate(shortName, requested));
        return { name, logo, score };
      })
      .sort((a, b) => b.score - a.score)[0];

    if (best?.logo) return best.logo;
    break;
  }

  // v2 premium fallback
  try {
    const v2Response = await fetch("https://www.thesportsdb.com/api/v2/json/livescore/soccer", {
      headers: {
        "X-API-KEY": V2_KEY,
      },
    });
    if (!v2Response.ok) return null;
    const payload = await v2Response.json();
    const livescore = Array.isArray(payload?.livescore) ? payload.livescore : [];
    const candidates = [];

    livescore.forEach((event) => {
      const home = event?.strHomeTeam || "";
      const away = event?.strAwayTeam || "";
      const hs = scoreCandidate(home, requested);
      const as = scoreCandidate(away, requested);
      if (hs > 0) {
        candidates.push({
          score: hs,
          logo: typeof event?.strHomeTeamBadge === "string" ? event.strHomeTeamBadge.trim() : null,
        });
      }
      if (as > 0) {
        candidates.push({
          score: as,
          logo: typeof event?.strAwayTeamBadge === "string" ? event.strAwayTeamBadge.trim() : null,
        });
      }
    });

    candidates.sort((a, b) => b.score - a.score);
    return candidates[0]?.logo || null;
  } catch {
    return null;
  }
};

const main = async () => {
  const allTeams = extractTeams();
  const subset = allTeams.slice(START_INDEX, LIMIT > 0 ? START_INDEX + LIMIT : undefined);

  let existing = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
      if (prev && typeof prev === "object") existing = prev;
    } catch {
      // ignore parse errors
    }
  }

  console.log(`Teams total: ${allTeams.length}`);
  console.log(`Processing: ${subset.length} (start=${START_INDEX}, limit=${LIMIT || "all"})`);
  console.log(`Rate: 1 request / ${DELAY_MS}ms`);

  let ok = 0;
  let miss = 0;

  for (let i = 0; i < subset.length; i += 1) {
    const team = subset[i];
    const key = normalize(team);

    if (existing[key]) {
      continue;
    }

    const logo = await fetchTeamLogoSlow(team);
    if (logo) {
      existing[key] = logo;
      ok += 1;
    } else {
      miss += 1;
    }

    if ((i + 1) % 25 === 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existing, null, 2));
      console.log(`Progress ${i + 1}/${subset.length} | found=${ok} missing=${miss}`);
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existing, null, 2));
  console.log(`Done. found=${ok} missing=${miss} | cache keys=${Object.keys(existing).length}`);
};

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
