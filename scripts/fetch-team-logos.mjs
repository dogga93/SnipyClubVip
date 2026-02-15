import fs from "node:fs";
import path from "node:path";

const ROOT = "/Users/hammamimac/Downloads/snipy";
const OUTPUT_FILE = path.join(ROOT, "public", "team-logos.json");
const TOKEN = process.env.FOOTBALL_DATA_API_TOKEN;

if (!TOKEN) {
  console.error("Missing FOOTBALL_DATA_API_TOKEN");
  process.exit(1);
}

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const toYmd = (date) => date.toISOString().slice(0, 10);

const from = new Date();
from.setUTCDate(from.getUTCDate() - 3);
const to = new Date();
to.setUTCDate(to.getUTCDate() + 3);

const url = `https://api.football-data.org/v4/matches?dateFrom=${encodeURIComponent(toYmd(from))}&dateTo=${encodeURIComponent(toYmd(to))}`;
const response = await fetch(url, {
  headers: {
    "X-Auth-Token": TOKEN,
  },
});

if (!response.ok) {
  const text = await response.text().catch(() => "");
  throw new Error(`Football-Data error ${response.status}: ${text.slice(0, 300)}`);
}

const payload = await response.json();
const matches = Array.isArray(payload?.matches) ? payload.matches : [];
const logos = {};

for (const match of matches) {
  for (const team of [match?.homeTeam, match?.awayTeam]) {
    if (!team) continue;
    const crest = typeof team.crest === "string" ? team.crest.trim() : "";
    if (!crest) continue;

    const candidates = [team.name, team.shortName, team.tla]
      .map((name) => normalize(name))
      .filter((name) => name.length > 0);

    for (const key of candidates) {
      if (!logos[key]) logos[key] = crest;
    }
  }
}

fs.writeFileSync(OUTPUT_FILE, JSON.stringify(logos, null, 2));
console.log(`Fetched ${matches.length} matches.`);
console.log(`Saved ${Object.keys(logos).length} team logo keys in ${OUTPUT_FILE}`);
