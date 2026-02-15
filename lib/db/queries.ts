import type {
  AnalysisSnapshot,
  MarketSnapshot,
  Match,
  MarketSide,
  MarketType,
  PublicCashSnapshot,
  Verdict
} from '@prisma/client';
import { prisma } from '@/lib/db/prisma';

export type MatchWithLatest = Match & {
  latestAnalysis: AnalysisSnapshot | null;
};

const verdictPriority: Record<Verdict, number> = {
  NO_BET: 0,
  LEAN: 1,
  VALUE: 2,
  STRONG_VALUE: 3,
  TRAP_WARNING: 4
};

const pickTopAnalysis = (rows: AnalysisSnapshot[]): AnalysisSnapshot | null => {
  if (rows.length === 0) return null;
  return [...rows].sort((a, b) => {
    const verdictDelta = verdictPriority[b.verdict] - verdictPriority[a.verdict];
    if (verdictDelta !== 0) return verdictDelta;
    if (b.sharpScore !== a.sharpScore) return b.sharpScore - a.sharpScore;
    return b.ts.getTime() - a.ts.getTime();
  })[0];
};

export const listMatchesWithTopAnalysis = async (input: {
  league?: string;
  date?: string;
  limit?: number;
}) => {
  const where: Record<string, unknown> = {};

  if (input.league) where.league = input.league;
  if (input.date) {
    const start = new Date(`${input.date}T00:00:00.000Z`);
    const end = new Date(`${input.date}T23:59:59.999Z`);
    where.startTime = {
      gte: start,
      lte: end
    };
  }

  const matches = await prisma.match.findMany({
    where,
    orderBy: [{ startTime: 'asc' }, { createdAt: 'desc' }],
    take: input.limit ?? 100,
    include: {
      analysisSnapshots: {
        orderBy: { ts: 'desc' },
        take: 60
      }
    }
  });

  const output: MatchWithLatest[] = matches.map((match) => ({
    ...match,
    latestAnalysis: pickTopAnalysis(match.analysisSnapshots)
  }));

  return output;
};

const takeLatestByKey = <T extends { marketType: MarketType; side: MarketSide; ts: Date }>(rows: T[]) => {
  const map = new Map<string, T>();
  for (const row of rows) {
    const key = `${row.marketType}-${row.side}`;
    const prev = map.get(key);
    if (!prev || row.ts > prev.ts) map.set(key, row);
  }
  return [...map.values()];
};

export const getMatchLatestDetails = async (id: string) => {
  const match = await prisma.match.findUnique({
    where: { id },
    include: {
      marketSnapshots: {
        orderBy: { ts: 'desc' },
        take: 300
      },
      publicCashSnapshots: {
        orderBy: { ts: 'desc' },
        take: 300
      },
      analysisSnapshots: {
        orderBy: { ts: 'desc' },
        take: 300
      }
    }
  });

  if (!match) return null;

  const latestMarket = takeLatestByKey<MarketSnapshot>(match.marketSnapshots);
  const latestPublicCash = takeLatestByKey<PublicCashSnapshot>(match.publicCashSnapshots);
  const latestAnalysis = takeLatestByKey<AnalysisSnapshot>(match.analysisSnapshots);

  return {
    match: {
      id: match.id,
      externalRef: match.externalRef,
      sport: match.sport,
      league: match.league,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startTime: match.startTime,
      status: match.status,
      createdAt: match.createdAt,
      updatedAt: match.updatedAt
    },
    marketSnapshots: latestMarket,
    publicCashSnapshots: latestPublicCash,
    analysisSnapshots: latestAnalysis,
    topRecommendation: pickTopAnalysis(latestAnalysis)
  };
};
