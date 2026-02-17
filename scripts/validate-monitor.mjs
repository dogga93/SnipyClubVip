#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const root = process.cwd();
const excelPath = path.join(root, 'public', 'monitors', 'current', 'soccer-monitor.xlsx');
const manifestPath = path.join(root, 'public', 'monitors', 'current', 'input-manifest.json');

const clean = (v) => String(v ?? '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();
const parseGame = (v) => {
  const txt = clean(v);
  const parts = txt.split(/\s+vs\.?\s+/i);
  if (parts.length !== 2) return null;
  const home = clean(parts[0]);
  const away = clean(parts[1]);
  if (!home || !away) return null;
  return { home, away };
};
const normalizeDate = (v) => {
  const txt = clean(v);
  if (!txt) return '';
  const d = new Date(txt);
  return Number.isNaN(d.getTime()) ? '' : d.toISOString().slice(0, 10);
};
const parseDateFromFilename = (filePath) => {
  const name = path.basename(filePath);
  const m = name.match(/(20\d{2})[-_ ](\d{2})[-_ ](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
};
const todayIso = () => new Date().toISOString().slice(0, 10);

if (!fs.existsSync(excelPath)) {
  console.error(`[validate:monitor] Missing file: ${excelPath}`);
  process.exit(1);
}

let manifestDate = '';
if (fs.existsSync(manifestPath)) {
  try {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    manifestDate = normalizeDate(manifest?.date) || normalizeDate(manifest?.soccerDate);
  } catch {
    // keep empty
  }
}

const wb = XLSX.read(fs.readFileSync(excelPath), { type: 'buffer', cellDates: true });
const sh = wb.Sheets['Game list'] ?? wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sh, { defval: null, raw: false });

const fallbackDate = manifestDate || parseDateFromFilename(excelPath) || todayIso();
let currentLeague = '';
let matches = 0;
let missing = 0;
const leagues = new Set();

for (const row of rows) {
  const league = clean(row['League']);
  if (league) currentLeague = league;
  const game = parseGame(row['Game']);
  if (!game) continue;

  const date = normalizeDate(row['Date']) || fallbackDate;
  matches += 1;
  leagues.add(currentLeague || 'Unknown League');

  if (!(currentLeague || 'Unknown League') || !game.home || !game.away || !date) {
    missing += 1;
  }
}

console.info('[validate:monitor] excel', {
  exists: true,
  matches,
  leagues: leagues.size,
  missing,
  fallbackDate
});

if (matches === 0) {
  console.error('[validate:monitor] No matches parsed');
  process.exit(1);
}

if (missing > 0) {
  console.error('[validate:monitor] Missing required fields league/homeTeam/awayTeam/date');
  process.exit(1);
}

console.info('[validate:monitor] OK');

