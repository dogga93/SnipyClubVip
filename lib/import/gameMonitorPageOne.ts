import * as XLSX from 'xlsx';
import { prisma } from '@/lib/db/prisma';
import { computeAnalysis, inferLineMovedAgainstPublic, impliedProbabilityFromDecimal } from '@/lib/analytics/engine';
import type { MarketSide } from '@prisma/client';
import path from 'node:path';
import { readFile } from 'node:fs/promises';

type ImportSummary = {
  file: string;
  rows: number;
  uniqueRows: number;
  importedMatches: number;
  insertedMarketSnapshots: number;
  insertedPublicCashSnapshots: number;
  insertedAnalysisSnapshots: number;
};

const DEFAULT_FILES = [
  '/Users/hammamimac/Downloads/Game Monitor SOCCER 2026-02-15 page 2.xlsx',
  '/Users/hammamimac/Downloads/Game Monitor SOCCER 2026-02-15 page 1.xlsx',
  '/Users/hammamimac/Downloads/Game Monitor SOCCER 2026-02-15 page 1-2.xlsx',
  '/Users/hammamimac/Downloads/Game Monitor SOCCER 2026-02-15 page 1-3.xlsx'
];

const FALLBACK_FILES = [
  path.join(process.cwd(), 'dist/monitors/Game Monitor SOCCER 2026-02-15 page 1.xlsx'),
  path.join(process.cwd(), 'dist/monitors/Game Monitor SOCCER 2026-02-15 page 1-2.xlsx'),
  path.join(process.cwd(), 'dist/monitors/Game Monitor SOCCER 2026-02-15 page 1-3.xlsx')
];

const clean = (v: unknown) => String(v ?? '').replace(/\u00A0/g, ' ').replace(/\s+/g, ' ').trim();

const parsePct = (v: unknown) => {
  const txt = clean(v).replace('%', '').replace(',', '.');
  if (!txt || /^nan$/i.test(txt)) return null;
  const n = Number(txt);
  if (!Number.isFinite(n)) return null;
  return n > 1 ? n : n * 100;
};

const parseFloatSafe = (v: unknown) => {
  const txt = clean(v).replace(',', '.');
  if (!txt || /^nan$/i.test(txt)) return null;
  const n = Number(txt);
  return Number.isFinite(n) ? n : null;
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

const pickDateFromFilename = (filePath: string) => {
  const name = path.basename(filePath);
  const m = name.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (!m) return new Date();
  return new Date(`${m[1]}-${m[2]}-${m[3]}T12:00:00.000Z`);
};

const normalizeKey = (league: string, home: string, away: string, startTime: Date) =>
  `gm:${league.toLowerCase()}|${home.toLowerCase()}|${away.toLowerCase()}|${startTime.toISOString().slice(0, 10)}`;

const toSides = () => [
  {
    side: 'HOME' as MarketSide,
    oddCol: 'Moneyline 1',
    modelCol: 'Probability 1',
    publicCol: 'Public % ML Team 1',
    cashPctCol: 'ALL Cash % Team 1',
    signalCol: 'ALL Cash Team 1'
  },
  {
    side: 'AWAY' as MarketSide,
    oddCol: 'Moneyline 2',
    modelCol: 'Probability 2',
    publicCol: 'Public % ML Team 2',
    cashPctCol: 'ALL Cash % Team 2',
    signalCol: 'ALL Cash Team 2'
  },
  {
    side: 'DRAW' as MarketSide,
    oddCol: 'Moneyline Draw',
    modelCol: null,
    publicCol: 'Public % ML DRAW',
    cashPctCol: 'ALL Cash % Draw',
    signalCol: 'ALL Cash Draw'
  }
];

const resolveFileCandidates = (input?: string[]) => {
  if (input && input.length > 0) return input;
  return [...DEFAULT_FILES, ...FALLBACK_FILES];
};

const unique = <T,>(arr: T[]) => [...new Set(arr)];

export const importGameMonitorPageOneFiles = async (input?: { files?: string[] }) => {
  const files = unique(resolveFileCandidates(input?.files));
  const summaries: ImportSummary[] = [];
  const marketKeys = new Set<string>();
  const publicCashKeys = new Set<string>();
  const analysisKeys = new Set<string>();

  for (const filePath of files) {
    let workbook: XLSX.WorkBook;

    try {
      const buf = await readFile(filePath);
      workbook = XLSX.read(buf, { type: 'buffer' });
    } catch {
      continue;
    }

    const sheet = workbook.Sheets['Game list'] ?? workbook.Sheets[workbook.SheetNames[0]];
    if (!sheet) continue;

    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: null, raw: false });
    const fileDate = pickDateFromFilename(filePath);
    const uniqueRows = new Map<string, Record<string, unknown>>();

    for (const row of rows) {
      const league = clean(row['League']);
      const game = parseGame(row['Game']);
      if (!league || !game) continue;
      const key = normalizeKey(league, game.home, game.away, fileDate);
      uniqueRows.set(key, row);
    }

    let importedMatches = 0;
    let insertedMarketSnapshots = 0;
    let insertedPublicCashSnapshots = 0;
    let insertedAnalysisSnapshots = 0;

    for (const row of uniqueRows.values()) {
      const sport = clean(row['Sport']) || 'SOCCER';
      const league = clean(row['League']);
      const game = parseGame(row['Game']);
      if (!league || !game) continue;

      const startTime = fileDate;
      const status = clean(row['Status']) || 'Scheduled';
      const externalRef = normalizeKey(league, game.home, game.away, startTime);

      const match = await prisma.match.upsert({
        where: { externalRef },
        update: {
          sport,
          league,
          homeTeam: game.home,
          awayTeam: game.away,
          startTime,
          status
        },
        create: {
          externalRef,
          sport,
          league,
          homeTeam: game.home,
          awayTeam: game.away,
          startTime,
          status
        }
      });

      importedMatches += 1;

      const confidence = Math.max(0, Math.min(1, (parsePct(row['Confidence']) ?? 50) / 100));
      const predicted1 = clean(row['Predicted Score 1']);
      const predicted2 = clean(row['Predicted Score 2']);
      const realScore = clean(row['Real Score']);
      const signalText = clean(row['Signals']);
      const ts = new Date();

      for (const side of toSides()) {
        const odd = parseFloatSafe(row[side.oddCol]);
        if (odd == null || odd <= 0) continue;

        const marketKey = `${match.id}|${side.side}|${odd.toFixed(4)}`;
        if (!marketKeys.has(marketKey)) {
          await prisma.marketSnapshot.create({
            data: {
              matchId: match.id,
              marketType: 'ML',
              side: side.side,
              book: 'game-monitor',
              openOdds: null,
              currentOdds: odd,
              ts
            }
          });
          marketKeys.add(marketKey);
          insertedMarketSnapshots += 1;
        }

        const publicPercent = parsePct(row[side.publicCol]);
        const cashPercent = parsePct(row[side.cashPctCol]);

        const publicCashKey = `${match.id}|${side.side}|${publicPercent ?? 'na'}|${cashPercent ?? 'na'}`;
        if (!publicCashKeys.has(publicCashKey)) {
          await prisma.publicCashSnapshot.create({
            data: {
              matchId: match.id,
              marketType: 'ML',
              side: side.side,
              publicPercent,
              cashPercent,
              ts
            }
          });
          publicCashKeys.add(publicCashKey);
          insertedPublicCashSnapshots += 1;
        }

        let modelProb: number;
        if (side.modelCol) {
          const modelPct = parsePct(row[side.modelCol]);
          modelProb = modelPct != null ? modelPct / 100 : impliedProbabilityFromDecimal(odd);
        } else {
          modelProb = impliedProbabilityFromDecimal(odd);
        }

        modelProb = Math.max(0.0001, Math.min(0.9999, modelProb));

        const lineMovedAgainstPublic = inferLineMovedAgainstPublic(
          side.side,
          publicPercent,
          null,
          odd
        );

        const computed = computeAnalysis({
          matchId: match.id,
          marketType: 'ML',
          side: side.side,
          openOdds: null,
          currentOdds: odd,
          modelProb,
          confidence,
          publicPercent,
          cashPercent,
          volatility: null,
          lineMovedAgainstPublic
        });

        const sideSignal = clean(row[side.signalCol]);
        const reasons = [
          ...computed.reasons,
          predicted1 || predicted2 ? `Predicted score: ${predicted1 || '-'}:${predicted2 || '-'}` : '',
          realScore ? `Real score: ${realScore}` : '',
          signalText ? `Signal: ${signalText}` : '',
          sideSignal ? `Cash amount hint: ${sideSignal}` : ''
        ].filter(Boolean).slice(0, 6);

        const analysisKey = `${match.id}|${side.side}|${computed.verdict}|${computed.edge.toFixed(6)}|${modelProb.toFixed(6)}`;
        if (!analysisKeys.has(analysisKey)) {
          await prisma.analysisSnapshot.create({
            data: {
              matchId: match.id,
              marketType: 'ML',
              side: side.side,
              modelProb,
              impliedProb: computed.impliedProb,
              edge: computed.edge,
              fairOdds: computed.fairOdds,
              sharpScore: computed.sharpScore,
              marketPressure: computed.marketPressure,
              trapRisk: computed.trapRisk,
              verdict: computed.verdict,
              reasons,
              ts
            }
          });
          analysisKeys.add(analysisKey);
          insertedAnalysisSnapshots += 1;
        }
      }
    }

    summaries.push({
      file: filePath,
      rows: rows.length,
      uniqueRows: uniqueRows.size,
      importedMatches,
      insertedMarketSnapshots,
      insertedPublicCashSnapshots,
      insertedAnalysisSnapshots
    });
  }

  return {
    filesProcessed: summaries.length,
    summaries
  };
};
