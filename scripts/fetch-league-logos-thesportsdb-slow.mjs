import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const ROOT = "/Users/hammamimac/Downloads/snipy";
const MONITORS_DIR = path.join(ROOT, "public", "monitors");
const OUTPUT_FILE = path.join(ROOT, "public", "league-logos.json");
const V1_KEY = process.env.THESPORTSDB_V1_KEY || "511123";

const DELAY_MS = Number(process.env.DELAY_MS || 1300);
const RETRY_DELAY_MS = Number(process.env.RETRY_DELAY_MS || 15000);
const MAX_RETRIES = Number(process.env.MAX_RETRIES || 4);
const LIMIT = Number(process.env.LIMIT || 0);
const START_INDEX = Number(process.env.START_INDEX || 0);

const COUNTRY_CANDIDATES = [
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

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const normalize = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
const COUNTRY_WORDS = new Set(COUNTRY_CANDIDATES.map((x) => normalize(x)));
const EXTRA_COUNTRIES = [
  "Azerbaijan",
  "Belgium",
  "Bulgaria",
  "Burundi",
  "Cameroon",
  "Chile",
  "Colombia",
  "Costa Rica",
  "Czech Republic",
  "El Salvador",
  "Ghana",
  "Guatemala",
  "Hungary",
  "India",
  "Indonesia",
  "Iran",
  "Iraq",
  "Ireland",
  "Israel",
  "Japan",
  "Kenya",
  "Kuwait",
  "Malaysia",
  "Mauritania",
  "Mexico",
  "Morocco",
  "Nicaragua",
  "Nigeria",
  "Panama",
  "Paraguay",
  "Peru",
  "Poland",
  "Romania",
  "Saudi Arabia",
  "Scotland",
  "Singapore",
  "Slovakia",
  "Slovenia",
  "South Africa",
  "Tanzania",
  "Thailand",
  "Tunisia",
  "Uganda",
  "United Arab Emirates",
  "Uruguay",
  "Venezuela",
  "Vietnam",
  "Wales",
  "Zambia",
];

const normalizeHeader = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/\u00a0/g, " ")
    .replace(/[^a-z0-9]+/g, "")
    .trim();

const isLikelyLeagueName = (value) => {
  const text = String(value || "").trim();
  if (!text) return false;
  if (/^\d+(?:\.\d+)?$/.test(text)) return false;
  if (text.length < 3) return false;
  if (/\b(et|cet|gmt|utc)\b/i.test(text)) return false;
  if (/\b(mon|tue|wed|thu|fri|sat|sun)\b/i.test(text)) return false;
  if (/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i.test(text)) return false;
  if (/\b\d{1,2}:\d{2}\b/.test(text)) return false;
  if (/\b\d{4}\b/.test(text)) return false;
  return /[a-z]/i.test(text);
};

const sanitizeLeague = (value) =>
  String(value || "")
    .replace(/^\s*[\p{Extended_Pictographic}\u2600-\u27BF]+\s*/gu, "")
    .replace(/^\s*🏆\s*/u, "")
    .trim();

const scoreLeagueName = (candidate, requested) => {
  const canon = (value) =>
    normalize(value)
      .replace(/\benglish\b/g, "england")
      .replace(/\bfrench\b/g, "france")
      .replace(/\bgerman\b/g, "germany")
      .replace(/\bitalian\b/g, "italy")
      .replace(/\bspanish\b/g, "spain")
      .replace(/\bdutch\b/g, "netherlands")
      .replace(/\bportuguese\b/g, "portugal")
      .replace(/\bturkish\b/g, "turkey")
      .replace(/\bscottish\b/g, "scotland")
      .replace(/\bwelsh\b/g, "wales")
      .replace(/\bargentine\b/g, "argentina")
      .replace(/\bcolombian\b/g, "colombia");

  const c = canon(candidate);
  const r = canon(requested);
  if (!c) return 0;
  if (c === r) return 100;
  if (c.includes(r) || r.includes(c)) return 85;

  const dropLeadingCountry = (value) => {
    const parts = value.split(" ").filter(Boolean);
    if (parts.length > 1 && COUNTRY_WORDS.has(parts[0])) return parts.slice(1).join(" ");
    return value;
  };

  const noNoise = dropLeadingCountry(
    c.replace(/\b(league|liga|division|cup|tournament|competition|soccer|football|first|premier|professional|pro)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
  const reqNoNoise = dropLeadingCountry(
    r
      .replace(/\b(league|liga|division|cup|tournament|competition|soccer|football|first|premier|professional|pro)\b/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );

  if (noNoise && reqNoNoise && (noNoise.includes(reqNoNoise) || reqNoNoise.includes(noNoise))) return 70;

  const stop = new Set(["league", "liga", "ligue", "division", "serie", "group", "cup", "professional", "pro", "premier", "first", "second", "national", "u23", "rfef", "fa"]);
  const t1 = c.split(" ").filter((t) => t && !stop.has(t));
  const t2 = r.split(" ").filter((t) => t && !stop.has(t));
  if (t1.length > 0 && t2.length > 0) {
    const s1 = new Set(t1);
    const s2 = new Set(t2);
    let inter = 0;
    s1.forEach((token) => {
      if (s2.has(token)) inter += 1;
    });
    const ratio = inter / Math.max(s1.size, s2.size);
    if (ratio >= 0.8) return 75;
    if (ratio >= 0.6) return 60;
  }
  return 0;
};

const pickLogo = (entry) => {
  const candidates = [entry?.strBadge, entry?.strLogo, entry?.strPoster, entry?.strBanner, entry?.strFanart1]
    .map((x) => (typeof x === "string" ? x.trim() : ""))
    .filter(Boolean);
  return candidates[0] || null;
};

const collectLeaguesFromWorkbook = (filePath) => {
  const leagues = new Set();
  const workbook = XLSX.readFile(filePath, { cellDates: false });

  for (const sheetName of workbook.SheetNames) {
    const sheet = workbook.Sheets[sheetName];
    const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: "", raw: false });
    if (!Array.isArray(rows) || rows.length === 0) continue;

    const header = Array.isArray(rows[0]) ? rows[0] : [];
    const normalizedHeaders = header.map((h) => normalizeHeader(h));
    const leagueIdx = normalizedHeaders.findIndex((h) =>
      ["league", "competition", "tournament", "championship"].some((key) => h.includes(key))
    );

    if (leagueIdx >= 0) {
      for (let i = 1; i < rows.length; i += 1) {
        const row = Array.isArray(rows[i]) ? rows[i] : [];
        const rawLeague = sanitizeLeague(row[leagueIdx]);
        if (isLikelyLeagueName(rawLeague)) leagues.add(rawLeague);
      }
      continue;
    }

    // No fallback when no explicit league column: avoids false positives from schedule/date blocks.
  }

  return leagues;
};

const extractLeagueNames = () => {
  const all = new Set();
  const files = fs
    .readdirSync(MONITORS_DIR)
    .filter((file) => /soccer/i.test(file))
    .filter((file) => file.toLowerCase().endsWith(".xlsx"))
    .map((file) => path.join(MONITORS_DIR, file));

  for (const filePath of files) {
    try {
      const found = collectLeaguesFromWorkbook(filePath);
      found.forEach((l) => all.add(l));
    } catch {
      // Ignore file-specific parse errors.
    }
  }

  return Array.from(all).sort((a, b) => a.localeCompare(b));
};

const countryCatalogCache = new Map();

const fetchCountryCatalog = async (country) => {
  if (countryCatalogCache.has(country)) return countryCatalogCache.get(country);
  const url = `https://www.thesportsdb.com/api/v1/json/${encodeURIComponent(
    V1_KEY
  )}/search_all_leagues.php?c=${encodeURIComponent(country)}&s=Soccer`;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
    const response = await fetch(url);

    if (response.status === 429) {
      if (attempt === MAX_RETRIES) {
        countryCatalogCache.set(country, []);
        return [];
      }
      await sleep(RETRY_DELAY_MS);
      continue;
    }

    if (!response.ok) {
      countryCatalogCache.set(country, []);
      return [];
    }

    const payload = await response.json().catch(() => ({}));
    const rows = Array.isArray(payload?.countries) ? payload.countries : [];
    countryCatalogCache.set(country, rows);
    return rows;
  }

  countryCatalogCache.set(country, []);
  return [];
};

const fetchLeagueLogoFromCatalog = (leagueName, rows) => {
  if (!Array.isArray(rows) || rows.length === 0) return null;
  const requested = normalize(leagueName);
  let best = null;

  for (const row of rows) {
    const name = row?.strLeague || "";
    const alt = row?.strLeagueAlternate || "";
    const score = Math.max(scoreLeagueName(name, requested), scoreLeagueName(alt, requested));
    const logo = pickLogo(row);
    if (!logo || score <= 0) continue;
    if (!best || score > best.score) best = { score, logo };
  }

  return best?.logo || null;
};

const preloadCountryCatalogs = async () => {
  for (const country of [...COUNTRY_CANDIDATES, ...EXTRA_COUNTRIES]) {
    await fetchCountryCatalog(country);
    await sleep(DELAY_MS);
  }
};

const detectCountryHints = (leagueName) => {
  const n = normalize(leagueName);
  const known = [...EXTRA_COUNTRIES, ...COUNTRY_CANDIDATES];
  const hits = [];
  for (const country of known) {
    const c = normalize(country);
    if (n.startsWith(`${c} `) || n.includes(` ${c} `) || n.endsWith(` ${c}`)) {
      hits.push(country);
    }
  }
  return Array.from(new Set(hits));
};

const fetchLeagueLogoSlow = async (leagueName) => {
  const sequence = [...detectCountryHints(leagueName), ...EXTRA_COUNTRIES, ...COUNTRY_CANDIDATES];
  for (const country of sequence) {
    const rows = await fetchCountryCatalog(country);
    const logo = fetchLeagueLogoFromCatalog(leagueName, rows);
    if (logo) return logo;
  }
  return null;
};

const main = async () => {
  const allLeagues = extractLeagueNames();
  const subset = allLeagues.slice(START_INDEX, LIMIT > 0 ? START_INDEX + LIMIT : undefined);

  let existing = {};
  if (fs.existsSync(OUTPUT_FILE)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf-8"));
      if (prev && typeof prev === "object") existing = prev;
    } catch {
      // Ignore parse errors.
    }
  }

  console.log(`Leagues total: ${allLeagues.length}`);
  console.log(`Processing: ${subset.length} (start=${START_INDEX}, limit=${LIMIT || "all"})`);
  console.log(`Preloading country catalogs...`);
  await preloadCountryCatalogs();
  console.log(`Country catalogs loaded.`);

  let found = 0;
  let miss = 0;

  for (let i = 0; i < subset.length; i += 1) {
    const league = subset[i];
    const key = normalize(league);

    if (existing[key]) continue;

    const logo = await fetchLeagueLogoSlow(league);
    if (logo) {
      existing[key] = logo;
      found += 1;
      console.log(`[${i + 1}/${subset.length}] OK   ${league}`);
    } else {
      miss += 1;
      console.log(`[${i + 1}/${subset.length}] MISS ${league}`);
    }

    if ((i + 1) % 10 === 0) {
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existing, null, 2));
      console.log(`Saved progress... keys=${Object.keys(existing).length}`);
    }

    await sleep(DELAY_MS);
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(existing, null, 2));
  console.log(`Done. found=${found} missing=${miss} total-cache=${Object.keys(existing).length}`);
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
