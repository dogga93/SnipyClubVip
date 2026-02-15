import type { MarketSide, MarketType } from '@prisma/client';
import { prisma } from '@/lib/db/prisma';
import type { SideAnalysisInput } from '@/lib/db/types';
import { computeAnalysis, inferLineMovedAgainstPublic } from '@/lib/analytics/engine';

const defaultConfidence = 0.55;

const getLatestMarket = async (matchId: string, marketType: MarketType, side: MarketSide) =>
  prisma.marketSnapshot.findFirst({
    where: { matchId, marketType, side },
    orderBy: { ts: 'desc' }
  });

const getLatestPublicCash = async (matchId: string, marketType: MarketType, side: MarketSide) =>
  prisma.publicCashSnapshot.findFirst({
    where: { matchId, marketType, side },
    orderBy: { ts: 'desc' }
  });

const getLatestModel = async (matchId: string, marketType: MarketType, side: MarketSide) =>
  prisma.analysisSnapshot.findFirst({
    where: { matchId, marketType, side },
    orderBy: { ts: 'desc' },
    select: { modelProb: true }
  });

export const saveAnalysis = async (input: SideAnalysisInput) => {
  const computed = computeAnalysis(input);

  const created = await prisma.analysisSnapshot.create({
    data: {
      matchId: input.matchId,
      marketType: input.marketType,
      side: input.side,
      modelProb: input.modelProb,
      impliedProb: computed.impliedProb,
      edge: computed.edge,
      fairOdds: computed.fairOdds,
      sharpScore: computed.sharpScore,
      marketPressure: computed.marketPressure,
      trapRisk: computed.trapRisk,
      verdict: computed.verdict,
      reasons: computed.reasons,
      ts: new Date()
    }
  });

  return { ...computed, id: created.id, ts: created.ts };
};

export const analyzeFromDb = async (params: {
  matchId: string;
  marketType: MarketType;
  side: MarketSide;
}) => {
  const match = await prisma.match.findUnique({ where: { id: params.matchId } });
  if (!match) {
    throw new Error(`Match not found: ${params.matchId}`);
  }

  const market = await getLatestMarket(params.matchId, params.marketType, params.side);
  if (!market) {
    throw new Error(`No market snapshot for ${params.marketType}/${params.side}`);
  }

  const publicCash = await getLatestPublicCash(params.matchId, params.marketType, params.side);
  const latestModel = await getLatestModel(params.matchId, params.marketType, params.side);

  const input: SideAnalysisInput = {
    matchId: params.matchId,
    marketType: params.marketType,
    side: params.side,
    openOdds: market.openOdds,
    currentOdds: market.currentOdds,
    modelProb: latestModel?.modelProb ?? Math.max(0.02, Math.min(0.9, 1 / market.currentOdds)),
    confidence: defaultConfidence,
    publicPercent: publicCash?.publicPercent ?? null,
    cashPercent: publicCash?.cashPercent ?? null,
    volatility: null,
    lineMovedAgainstPublic: inferLineMovedAgainstPublic(
      params.side,
      publicCash?.publicPercent ?? null,
      market.openOdds,
      market.currentOdds
    )
  };

  return saveAnalysis(input);
};
