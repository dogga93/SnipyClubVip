import type { MarketSide, MarketType, Verdict } from '@prisma/client';

export type SideAnalysisInput = {
  matchId: string;
  marketType: MarketType;
  side: MarketSide;
  openOdds: number | null;
  currentOdds: number;
  modelProb: number;
  confidence: number;
  publicPercent: number | null;
  cashPercent: number | null;
  volatility: number | null;
  lineMovedAgainstPublic: boolean;
};

export type AnalysisComputation = {
  impliedProb: number;
  fairOdds: number;
  edge: number;
  sharpScore: number;
  marketPressure: number;
  trapRisk: number;
  verdict: Verdict;
  reasons: string[];
};
