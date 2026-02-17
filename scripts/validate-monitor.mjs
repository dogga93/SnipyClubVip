import path from 'node:path';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';

const root = process.cwd();
const excelPath = path.join(root, 'public', 'monitors', 'current', 'soccer-monitor.xlsx');
const manifestPath = path.join(root, 'public', 'monitors', 'current', 'input-manifest.json');

const clean = (v) => String(v ?? '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

const parseManifestDate = async () => {
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const data = JSON.parse(raw);
    return clean(data?.date);
  } catch {
    return '';
  }
};

const parseGame = (value) => {
  const txt = clean(value);
  const parts = txt.split(/\s+vs\.?\s+/i);
  if (parts.length !== 2) return null;
  const homeTeam = clean(parts[0]);
  const awayTeam = clean(parts[1]);
  if (!homeTeam || !awayTeam) return null;
  return { homeTeam, awayTeam };
};

const main = async () => {
  const manifestDate = await parseManifestDate();
  const excelBuffer = await readFile(excelPath);
  const wb = XLSX.read(excelBuffer, { type: 'buffer', cellDates: false });
  const sheet = wb.Sheets['Game list'] ?? wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('Sheet "Game list" not found');

  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '', raw: false });
  const issues = [];
  const leagues = new Map();
  let validMatches = 0;

  rows.forEach((row, index) => {
    const league = clean(row['League']);
    const sport = clean(row['Sport']) || 'SOCCER';
    const game = parseGame(row['Game']);
    if (!league && !game) return;

    if (!league) issues.push(`Row ${index + 2}: missing League`);
    if (!game) {
      issues.push(`Row ${index + 2}: invalid Game`);
      return;
    }
    if (!manifestDate) issues.push(`Manifest date missing`);

    validMatches += 1;
    leagues.set(league, (leagues.get(league) ?? 0) + 1);

    if (!sport) issues.push(`Row ${index + 2}: missing Sport`);
  });

  const summary = {
    manifestDate: manifestDate || '(missing)',
    validMatches,
    totalLeagues: leagues.size,
    topLeagues: [...leagues.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10),
    issuesCount: issues.length
  };

  console.log(JSON.stringify(summary, null, 2));
  if (issues.length > 0) {
    console.log('\nIssues:');
    issues.slice(0, 50).forEach((issue) => console.log(`- ${issue}`));
    if (issues.length > 50) console.log(`- ...and ${issues.length - 50} more`);
    process.exit(1);
  }
};

main().catch((error) => {
  console.error('[validate-monitor] failed:', error instanceof Error ? error.message : String(error));
  process.exit(1);
});
