import fs from 'node:fs';
import path from 'node:path';
import XLSX from 'xlsx';

const args = process.argv.slice(2);
const replaceMode = args.includes('--replace');
const INPUT = args.find((arg) => !arg.startsWith('--'));

if (!INPUT) {
  console.error('Usage: node scripts/import-game-monitor-json.mjs [--replace] "/abs/path/to/file.xlsx"');
  process.exit(1);
}

const clean = (v) =>
  String(v ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const inputPath = path.resolve(INPUT);
if (!fs.existsSync(inputPath)) {
  console.error(`File not found: ${inputPath}`);
  process.exit(1);
}

const outPath = path.join(process.cwd(), 'public', 'data', 'game-monitor-all.json');
const existing = fs.existsSync(outPath)
  ? JSON.parse(fs.readFileSync(outPath, 'utf8'))
  : {
      generatedAt: new Date().toISOString(),
      sourceFiles: [],
      totalRowsMerged: 0,
      sports: [],
      leagues: [],
      matches: []
    };

const wb = XLSX.readFile(inputPath, { cellDates: false });
const sheet = wb.Sheets['Game list'] ?? wb.Sheets[wb.SheetNames[0]];
if (!sheet) {
  console.error('No sheet found in workbook');
  process.exit(1);
}

const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });

const mapped = rows
  .map((row) => {
    const sport = clean(row['Sport']) || 'SOCCER';
    const league = clean(row['League']);
    const game = clean(row['Game']);
    if (!league || !game || !/\s+vs\.?\s+/i.test(game)) return null;

    const [homeTeam, awayTeam] = game.split(/\s+vs\.?\s+/i).map((part) => clean(part));

    return {
      sport,
      league,
      game,
      homeTeam,
      awayTeam,
      date: clean(row['Date']).slice(0, 10),
      confidence: clean(row['Confidence']),
      status: clean(row['Status']) || 'Scheduled',
      stars: clean(row['Stars']),
      ml1: clean(row['Moneyline 1']),
      mlDraw: clean(row['Moneyline Draw']),
      ml2: clean(row['Moneyline 2']),
      probability1: clean(row['Probability 1']),
      probabilityDraw: clean(row['Probability Draw']),
      probability2: clean(row['Probability 2']),
      predictedScore1: clean(row['Predicted Score 1']),
      predictedScore2: clean(row['Predicted Score 2']),
      publicMl1: clean(row['Public % ML Team 1']),
      publicMlDraw: clean(row['Public % ML DRAW']),
      publicMl2: clean(row['Public % ML Team 2']),
      allPublicPct1: clean(row['ALL Public % Team 1']),
      allPublicPctDraw: clean(row['ALL Public % Draw']),
      allPublicPct2: clean(row['ALL Public % Team 2']),
      allCashPct1: clean(row['ALL Cash % Team 1']),
      allCashPctDraw: clean(row['ALL Cash % Draw']),
      allCashPct2: clean(row['ALL Cash % Team 2']),
      allCashTeam1: clean(row['ALL Cash Team 1']),
      allCashDraw: clean(row['ALL Cash Draw']),
      allCashTeam2: clean(row['ALL Cash Team 2']),
      cashRatio1: clean(row['Cash Ratio Team 1']),
      cashRatio2: clean(row['Cash Ratio Team 2']),
      signals: clean(row['Signals']),
      placedBets: clean(row['Placed Bets']),
      otherPredictions: clean(row['Other predictions']),
      realScore: clean(row['Real Score']),
      rawFields: Object.fromEntries(Object.entries(row).map(([k, v]) => [k, clean(v)])),
      sourceFiles: [inputPath]
    };
  })
  .filter(Boolean);

const keyOf = (m) => `${m.sport}|${m.league}|${m.game}`.toLowerCase();
const mergedMap = new Map();

if (!replaceMode) {
  for (const m of existing.matches ?? []) mergedMap.set(keyOf(m), m);
}
for (const m of mapped) mergedMap.set(keyOf(m), m);

const mergedMatches = [...mergedMap.values()];
const sports = [...new Set(mergedMatches.map((m) => m.sport).filter(Boolean))].sort();
const leagues = [...new Set(mergedMatches.map((m) => m.league).filter(Boolean))].sort();
const sourceFiles = replaceMode ? [inputPath] : [...new Set([...(existing.sourceFiles ?? []), inputPath])];

const output = {
  generatedAt: new Date().toISOString(),
  sourceFiles,
  totalRowsMerged: mergedMatches.length,
  sports,
  leagues,
  matches: mergedMatches
};

fs.writeFileSync(outPath, JSON.stringify(output, null, 2));
console.log(
  JSON.stringify(
    {
      mode: replaceMode ? 'replace' : 'merge',
      file: inputPath,
      rowsRead: rows.length,
      rowsImported: mapped.length,
      totalMatches: mergedMatches.length,
      totalSports: sports.length,
      totalLeagues: leagues.length,
      output: outPath
    },
    null,
    2
  )
);

