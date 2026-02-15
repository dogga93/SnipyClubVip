import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const ROOT = "/Users/hammamimac/Downloads/snipy";
const MONITORS_DIR = path.join(ROOT, "public", "monitors");
const LOGOS_FILE = path.join(ROOT, "public", "league-logos.json");
const TOKEN = process.env.FOOTBALL_DATA_TOKEN || "c4a48c977d764f1da90c17393f48f69d";

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

const normalizeHeader = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const clean = (value) =>
  normalize(value)
    .replace(/\b(league|ligue|liga|division|cup|serie|professional|premier|first|second|national|group|world|football|soccer)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isLeagueLike = (value) => {
  const t = String(value || "").trim();
  if (!t) return false;
  if (/\b\d{1,2}:\d{2}\b/.test(t)) return false;
  if (/\b(et|cet|gmt|utc)\b/i.test(t)) return false;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(t)) return false;
  return /[a-z]/i.test(t);
};

const extractLeagues = () => {
  const leagues = new Set();
  const files = fs
    .readdirSync(MONITORS_DIR)
    .filter((f) => /soccer/i.test(f) && f.toLowerCase().endsWith(".xlsx"))
    .map((f) => path.join(MONITORS_DIR, f));

  for (const file of files) {
    try {
      const wb = XLSX.readFile(file, { cellDates: false });
      for (const sheetName of wb.SheetNames) {
        const sheet = wb.Sheets[sheetName];
        const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
        if (!Array.isArray(rows) || rows.length === 0) continue;
        const header = Array.isArray(rows[0]) ? rows[0] : [];
        const nh = header.map((h) => normalizeHeader(h));
        const leagueIdx = nh.findIndex((h) => ["league", "competition", "tournament", "championship"].some((k) => h.includes(k)));
        if (leagueIdx < 0) continue;
        for (let i = 1; i < rows.length; i += 1) {
          const row = Array.isArray(rows[i]) ? rows[i] : [];
          const league = String(row[leagueIdx] || "").replace(/^\s*[\p{Extended_Pictographic}\u2600-\u27BF]+\s*/gu, "").trim();
          if (isLeagueLike(league)) leagues.add(league);
        }
      }
    } catch {
      // ignore
    }
  }
  return Array.from(leagues);
};

const alias = (name) => {
  const n = normalize(name);
  const map = {
    "england premier league": "premier league",
    "france ligue 1": "ligue 1",
    "france ligue 2": "ligue 2",
    "germany bundesliga": "bundesliga",
    "italy serie a": "serie a",
    "italy serie b": "serie b",
    "spain primera division": "laliga",
    "spain segunda division": "segunda division",
    "netherlands eredivisie": "eredivisie",
    "portugal primeira liga": "primeira liga",
    "saudi arabia professional league": "saudi pro league",
  };
  return map[n] || n;
};

const tokenScore = (a, b) => {
  const ta = new Set(clean(a).split(" ").filter(Boolean));
  const tb = new Set(clean(b).split(" ").filter(Boolean));
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  ta.forEach((t) => {
    if (tb.has(t)) inter += 1;
  });
  return inter / Math.max(ta.size, tb.size);
};

const pickCompetition = (leagueName, competitions) => {
  const target = alias(leagueName);
  let best = null;
  for (const c of competitions) {
    const name = String(c?.name || "");
    const code = String(c?.code || "");
    const area = String(c?.area?.name || "");
    const emblem = String(c?.emblem || "").trim();
    if (!emblem) continue;

    const candidates = [name, `${area} ${name}`, code];
    let score = 0;
    for (const x of candidates) {
      const nx = alias(x);
      if (nx === target) score = Math.max(score, 1);
      score = Math.max(score, tokenScore(nx, target));
      if (normalize(nx).includes(normalize(target)) || normalize(target).includes(normalize(nx))) score = Math.max(score, 0.9);
    }

    if (!best || score > best.score) best = { score, emblem, name };
  }

  return best && best.score >= 0.55 ? best : null;
};

const main = async () => {
  const leagues = extractLeagues();
  const existing = fs.existsSync(LOGOS_FILE) ? JSON.parse(fs.readFileSync(LOGOS_FILE, "utf8")) : {};

  const response = await fetch("https://api.football-data.org/v4/competitions", {
    headers: { "X-Auth-Token": TOKEN },
  });

  if (!response.ok) {
    throw new Error(`football-data request failed: ${response.status}`);
  }

  const payload = await response.json();
  const competitions = Array.isArray(payload?.competitions) ? payload.competitions : [];

  let added = 0;
  for (const league of leagues) {
    const key = normalize(league);
    if (existing[key]) continue;
    const best = pickCompetition(league, competitions);
    if (best?.emblem) {
      existing[key] = best.emblem;
      added += 1;
      console.log(`ADD ${league} -> ${best.name}`);
    }
  }

  fs.writeFileSync(LOGOS_FILE, JSON.stringify(existing, null, 2));
  console.log(`Done. added=${added} total=${Object.keys(existing).length}`);
};

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
