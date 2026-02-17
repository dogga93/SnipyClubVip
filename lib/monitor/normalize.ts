import path from 'node:path';
import { readFile } from 'node:fs/promises';
import * as XLSX from 'xlsx';
import type { MonitorLeague, MonitorMatch, MonitorPayload, MonitorStats } from '@/lib/monitor/types';

type NormalizeOptions = {
  excelPath: string;
  jsonPath?: string;
  manifestPath: string;
  prefer?: 'excel' | 'json';
};

type ManifestShape = {
  date?: string;
  soccerDate?: string;
  updatedAt?: string;
};

const clean = (v: unknown) =>
  String(v ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const slug = (value: string) =>
  clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');

const normalizeDate = (v: unknown) => {
  const txt = clean(v);
  if (!txt) return '';
  const date = new Date(txt);
  if (Number.isNaN(date.getTime())) return '';
  return date.toISOString().slice(0, 10);
};

const parseDateFromFilename = (filePath: string) => {
  const name = path.basename(filePath);
  const m = name.match(/(20\d{2})[-_ ](\d{2})[-_ ](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : '';
};

const parseGame = (value: unknown) => {
  const txt = clean(value);
  const parts = txt.split(/\s+vs\.?\s+/i);
  if (parts.length !== 2) return null;
  const home = clean(parts[0]);
  const away = clean(parts[1]);
  if (!home || !away) return null;
  return { home, away };
};

const toNumber = (value: unknown) => {
  const txt = clean(value).replace('%', '').replace(',', '.');
  if (!txt) return null;
  const n = Number(txt);
  return Number.isFinite(n) ? n : null;
};

const todayIso = () => new Date().toISOString().slice(0, 10);

const parseManifest = async (manifestPath: string): Promise<ManifestShape> => {
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const data = JSON.parse(raw) as ManifestShape;
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
};

const pickMonitorDate = (
  manifest: ManifestShape,
  sourcePath: string,
  generatedAt?: string
) =>
  normalizeDate(manifest.date) ||
  normalizeDate(manifest.soccerDate) ||
  parseDateFromFilename(sourcePath) ||
  normalizeDate(generatedAt) ||
  todayIso();

const buildLeagues = (matches: MonitorMatch[]): MonitorLeague[] => {
  const counter = new Map<string, number>();
  matches.forEach((m) => {
    counter.set(m.league, (counter.get(m.league) ?? 0) + 1);
  });

  return Array.from(counter.entries())
    .map(([name, matches_count], idx) => ({
      id: `monitor-${idx}-${slug(name) || 'unknown'}`,
      name,
      country: '',
      icon: '⚽',
      matches_count
    }))
    .sort((a, b) => b.matches_count - a.matches_count);
};

const computeStats = (matches: MonitorMatch[]): MonitorStats => {
  const dates = matches.map((m) => m.date).filter(Boolean).sort();
  return {
    totalMatches: matches.length,
    totalLeagues: new Set(matches.map((m) => m.league)).size,
    minDate: dates.length ? dates[0] : null,
    maxDate: dates.length ? dates[dates.length - 1] : null
  };
};

const normalizeExcel = async (excelPath: string, manifestPath: string): Promise<MonitorPayload> => {
  const buf = await readFile(excelPath);
  const wb = XLSX.read(buf, { type: 'buffer', cellDates: true });
  const sheet = wb.Sheets['Game list'] ?? wb.Sheets[wb.SheetNames[0]];
  if (!sheet) throw new Error('Excel sheet not found');

  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
    defval: null,
    raw: false
  });
  const manifest = await parseManifest(manifestPath);
  const monitorDate = pickMonitorDate(manifest, excelPath);

  let currentLeague = '';
  const matches: MonitorMatch[] = [];

  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    const leagueCell = clean(row['League']);
    if (leagueCell) currentLeague = leagueCell;

    const game = parseGame(row['Game']);
    if (!game) continue;

    const league = currentLeague || 'Unknown League';
    const rowDate =
      normalizeDate(row['Date']) ||
      normalizeDate(row['Game Start']) ||
      normalizeDate(row['Kickoff']) ||
      monitorDate;

    matches.push({
      id: `excel-${i}-${slug(league)}-${slug(game.home)}-${slug(game.away)}`,
      league,
      homeTeam: game.home,
      awayTeam: game.away,
      date: rowDate || monitorDate,
      sport: clean(row['Sport']) || 'SOCCER',
      status: clean(row['Status']) || undefined,
      confidence: toNumber(row['Confidence'])
    });
  }

  if (matches.length === 0) throw new Error('Excel parsed 0 matches');

  const leagues = buildLeagues(matches);
  const stats = computeStats(matches);

  return {
    source: 'excel',
    date: monitorDate,
    leagues,
    matches: matches.map((m) => ({ ...m, date: m.date || monitorDate })),
    stats
  };
};

const normalizeJson = async (jsonPath: string, manifestPath: string): Promise<MonitorPayload> => {
  const raw = await readFile(jsonPath, 'utf8');
  const payload = JSON.parse(raw) as Record<string, unknown>;
  const rows = Array.isArray(payload.matches) ? payload.matches : null;
  if (!rows) throw new Error('JSON missing matches[]');

  const manifest = await parseManifest(manifestPath);
  const monitorDate = pickMonitorDate(manifest, jsonPath, clean(payload.generatedAt));

  let currentLeague = '';
  const matches = rows
    .map((entry, idx): MonitorMatch | null => {
      const row = (entry ?? {}) as Record<string, unknown>;
      const leagueCell = clean(row.league);
      if (leagueCell) currentLeague = leagueCell;

      const teams =
        (clean(row.homeTeam) && clean(row.awayTeam)
          ? { home: clean(row.homeTeam), away: clean(row.awayTeam) }
          : parseGame(row.game)) ?? null;
      if (!teams) return null;

      const league = leagueCell || currentLeague || 'Unknown League';
      const rowDate =
        normalizeDate(row.date) ||
        normalizeDate(row.matchDate) ||
        normalizeDate(row.kickoff) ||
        monitorDate;

      return {
        id: `json-${idx}-${slug(league)}-${slug(teams.home)}-${slug(teams.away)}`,
        league,
        homeTeam: teams.home,
        awayTeam: teams.away,
        date: rowDate || monitorDate,
        sport: clean(row.sport) || 'SOCCER',
        status: clean(row.status) || undefined,
        confidence: toNumber(row.confidence)
      };
    })
    .filter((m): m is MonitorMatch => Boolean(m));

  if (matches.length === 0) throw new Error('JSON parsed 0 matches');

  const leagues = buildLeagues(matches);
  const stats = computeStats(matches);

  return {
    source: 'json',
    date: monitorDate,
    leagues,
    matches: matches.map((m) => ({ ...m, date: m.date || monitorDate })),
    stats
  };
};

export const normalizeCurrentMonitor = async (options: NormalizeOptions): Promise<MonitorPayload> => {
  const prefer = options.prefer ?? 'excel';
  const attempts =
    prefer === 'excel'
      ? [
          { source: 'excel', fn: () => normalizeExcel(options.excelPath, options.manifestPath) },
          ...(options.jsonPath
            ? [{ source: 'json', fn: () => normalizeJson(options.jsonPath as string, options.manifestPath) }]
            : [])
        ]
      : [
          ...(options.jsonPath
            ? [{ source: 'json', fn: () => normalizeJson(options.jsonPath as string, options.manifestPath) }]
            : []),
          { source: 'excel', fn: () => normalizeExcel(options.excelPath, options.manifestPath) }
        ];

  const errors: string[] = [];
  for (const attempt of attempts) {
    try {
      return await attempt.fn();
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      errors.push(`${attempt.source}: ${detail}`);
    }
  }

  throw new Error(`Monitor normalization failed. ${errors.join(' | ')}`);
};

