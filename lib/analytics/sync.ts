import type { MarketSide, MarketType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import { computeAnalysis, inferLineMovedAgainstPublic } from '@/lib/analytics/engine';
import { internalModelProvider, oddsProvider, publicCashProvider } from '@/lib/providers';
import type {
  ProviderMatch,
  ProviderOddsSnapshot,
  ProviderPublicCashSnapshot
} from '@/lib/providers/types';

type SyncResult = {
  processed: number;
  failed: number;
  matches: Array<{ externalRef: string; matchId?: string; error?: string }>;
  nextCursor: string | null;
};

const keyOf = (marketType: MarketType, side: MarketSide) => `${marketType}-${side}`;

const preferredOdds = (rows: ProviderOddsSnapshot[], marketType: MarketType, side: MarketSide) => {
  const scoped = rows.filter((r) => r.marketType === marketType && r.side === side);
  if (scoped.length === 0) return null;
  const pinnacle = scoped.find((r) => r.book.toLowerCase() === 'pinnacle');
  if (pinnacle) return pinnacle;
  return scoped[0];
};

const findPublicCash = (rows: ProviderPublicCashSnapshot[], marketType: MarketType, side: MarketSide) =>
  rows.find((r) => r.marketType === marketType && r.side === side) ?? null;

const upsertMatch = async (match: ProviderMatch) => {
  const now = new Date();
  return prisma.match.upsert({
    where: { externalRef: match.externalRef },
    update: {
      sport: match.sport,
      league: match.league,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startTime: match.startTime,
      status: match.status,
      updatedAt: now
    },
    create: {
      externalRef: match.externalRef,
      sport: match.sport,
      league: match.league,
      homeTeam: match.homeTeam,
      awayTeam: match.awayTeam,
      startTime: match.startTime,
      status: match.status
    }
  });
};

const persistSnapshots = async (matchId: string, odds: ProviderOddsSnapshot[], publicCash: ProviderPublicCashSnapshot[]) => {
  const ts = new Date();

  if (odds.length > 0) {
    await prisma.marketSnapshot.createMany({
      data: odds.map((row) => ({
        matchId,
        marketType: row.marketType,
        side: row.side,
        book: row.book,
        openOdds: row.openOdds,
        currentOdds: row.currentOdds,
        ts
      }))
    });
  }

  if (publicCash.length > 0) {
    await prisma.publicCashSnapshot.createMany({
      data: publicCash.map((row) => ({
        matchId,
        marketType: row.marketType,
        side: row.side,
        publicPercent: row.publicPercent,
        cashPercent: row.cashPercent,
        ts
      }))
    });
  }
};

const persistAnalyses = async (
  matchId: string,
  odds: ProviderOddsSnapshot[],
  publicCash: ProviderPublicCashSnapshot[],
  model: Awaited<ReturnType<typeof internalModelProvider.run>>
) => {
  const ts = new Date();
  const seen = new Set<string>();

  for (const projection of model.projections) {
    const key = keyOf(projection.marketType, projection.side);
    if (seen.has(key)) continue;
    seen.add(key);

    const odd = preferredOdds(odds, projection.marketType, projection.side);
    if (!odd) continue;

    const flow = findPublicCash(publicCash, projection.marketType, projection.side);
    const lineMovedAgainstPublic = inferLineMovedAgainstPublic(
      projection.side,
      flow?.publicPercent ?? null,
      odd.openOdds,
      odd.currentOdds
    );

    const computed = computeAnalysis({
      matchId,
      marketType: projection.marketType,
      side: projection.side,
      openOdds: odd.openOdds,
      currentOdds: odd.currentOdds,
      modelProb: projection.modelProb,
      confidence: model.confidence,
      publicPercent: flow?.publicPercent ?? null,
      cashPercent: flow?.cashPercent ?? null,
      volatility: null,
      lineMovedAgainstPublic
    });

    await prisma.analysisSnapshot.create({
      data: {
        matchId,
        marketType: projection.marketType,
        side: projection.side,
        modelProb: projection.modelProb,
        impliedProb: computed.impliedProb,
        edge: computed.edge,
        fairOdds: computed.fairOdds,
        sharpScore: computed.sharpScore,
        marketPressure: computed.marketPressure,
        trapRisk: computed.trapRisk,
        verdict: computed.verdict,
        reasons: computed.reasons,
        ts
      }
    });
  }
};

export const runSync = async (input: { cursor?: string; limit: number }): Promise<SyncResult> => {
  const from = new Date();
  const to = new Date(from.getTime() + 24 * 60 * 60 * 1000);

  const page = await oddsProvider.getMatchesWindow({
    from,
    to,
    cursor: input.cursor,
    limit: input.limit
  });

  let processed = 0;
  let failed = 0;
  const results: SyncResult['matches'] = [];

  for (const providerMatch of page.matches) {
    try {
      const persistedMatch = await upsertMatch(providerMatch);
      const odds = await oddsProvider.getOddsForMatch(providerMatch);
      const publicCash = await publicCashProvider.getPublicCashForMatch(providerMatch);
      const model = await internalModelProvider.run(providerMatch, odds, publicCash);

      await persistSnapshots(persistedMatch.id, odds, publicCash);
      await persistAnalyses(persistedMatch.id, odds, publicCash, model);

      processed += 1;
      results.push({ externalRef: providerMatch.externalRef, matchId: persistedMatch.id });
      console.info('[sync] match processed', {
        externalRef: providerMatch.externalRef,
        matchId: persistedMatch.id,
        odds: odds.length,
        publicCash: publicCash.length,
        projections: model.projections.length
      });
    } catch (error) {
      failed += 1;
      const message = error instanceof Error ? error.message : 'Unknown sync error';
      results.push({ externalRef: providerMatch.externalRef, error: message });
      console.error('[sync] match failed', {
        externalRef: providerMatch.externalRef,
        error: message
      });
    }
  }

  return {
    processed,
    failed,
    matches: results,
    nextCursor: page.nextCursor
  };
};
