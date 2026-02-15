import type { MarketSide, Verdict } from '@prisma/client';
import type { AnalysisComputation, SideAnalysisInput } from '@/lib/db/types';

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export const impliedProbabilityFromDecimal = (odds: number) => {
  if (!Number.isFinite(odds) || odds <= 0) return 0;
  return 1 / odds;
};

export const normalizeImpliedProbabilities = (probs: number[]) => {
  const sum = probs.reduce((acc, cur) => acc + cur, 0);
  if (sum <= 0) return probs.map(() => 0);
  return probs.map((p) => p / sum);
};

const verdictRank: Record<Verdict, number> = {
  NO_BET: 0,
  LEAN: 1,
  VALUE: 2,
  STRONG_VALUE: 3,
  TRAP_WARNING: 4
};

export const compareVerdicts = (a: Verdict, b: Verdict) => verdictRank[b] - verdictRank[a];

const roundPct = (value: number) => Math.round(value * 1000) / 10;

const createReasons = (input: SideAnalysisInput, computed: AnalysisComputation) => {
  const reasons: string[] = [];

  reasons.push(`Model probability ${roundPct(computed.impliedProb + computed.edge)}% vs implied ${roundPct(computed.impliedProb)}% (edge ${roundPct(computed.edge)}%).`);

  if (input.publicPercent != null && input.cashPercent != null) {
    const delta = input.cashPercent - input.publicPercent;
    reasons.push(`Public/Cash divergence on ${input.side}: public ${input.publicPercent.toFixed(1)}% vs cash ${input.cashPercent.toFixed(1)}% (delta ${delta.toFixed(1)} pts).`);
  } else {
    reasons.push('Public/Cash data missing, sharp-money contribution set to neutral fallback.');
  }

  if (input.openOdds != null) {
    reasons.push(`Line move ${input.openOdds.toFixed(3)} -> ${input.currentOdds.toFixed(3)} (${(((input.currentOdds - input.openOdds) / input.openOdds) * 100).toFixed(2)}%).`);
  } else {
    reasons.push(`Current odds ${input.currentOdds.toFixed(3)} used (no opening odds available).`);
  }

  reasons.push(`SharpScore ${computed.sharpScore}/100, MarketPressure ${computed.marketPressure}/100, TrapRisk ${computed.trapRisk}/100.`);

  if (computed.verdict === 'TRAP_WARNING') {
    reasons.push('High trap profile: public heavy and market behavior inconsistent with retail flow.');
  } else if (computed.verdict === 'STRONG_VALUE' || computed.verdict === 'VALUE') {
    reasons.push('Value threshold met with acceptable trap risk and supportive model edge.');
  }

  return reasons.slice(0, 6);
};

export const computeAnalysis = (input: SideAnalysisInput): AnalysisComputation => {
  const impliedProb = impliedProbabilityFromDecimal(input.currentOdds);
  const modelProb = clamp(input.modelProb, 0.0001, 0.9999);
  const edge = modelProb - impliedProb;
  const fairOdds = 1 / modelProb;

  const edgeStrength = clamp(edge / 0.05, 0, 1);
  const rawSharpMoney =
    input.publicPercent != null && input.cashPercent != null
      ? clamp((input.cashPercent - input.publicPercent) / 30, -1, 1)
      : 0;
  const lineMoveStrength =
    input.openOdds != null && input.openOdds > 0
      ? clamp(Math.abs(input.openOdds - input.currentOdds) / input.openOdds, 0, 1)
      : 0;

  const confidence = clamp(input.confidence, 0, 1);
  const sharpScoreRaw = edgeStrength * 40 + Math.max(rawSharpMoney, 0) * 25 + lineMoveStrength * 20 + confidence * 15;
  const sharpScore = Math.round(clamp(sharpScoreRaw, 0, 100));

  const volatilityFactor = input.volatility == null ? 0.5 : clamp(1 - input.volatility, 0, 1);
  const mpiRaw = lineMoveStrength * 45 + Math.abs(rawSharpMoney) * 35 + volatilityFactor * 20;
  const marketPressure = Math.round(clamp(mpiRaw, 0, 100));

  let trapRisk = 0;
  if ((input.publicPercent ?? 0) >= 70) trapRisk += 30;
  if ((input.cashPercent ?? 50) <= 40) trapRisk += 30;
  if (input.lineMovedAgainstPublic) trapRisk += 25;
  if (edge < 0.01) trapRisk += 15;
  trapRisk = Math.round(clamp(trapRisk, 0, 100));

  let verdict: Verdict = 'NO_BET';
  if (trapRisk >= 70 && (input.publicPercent ?? 0) >= 70) {
    verdict = 'TRAP_WARNING';
  } else if (sharpScore >= 75 && edge >= 0.03 && trapRisk <= 45) {
    verdict = 'STRONG_VALUE';
  } else if (sharpScore >= 60 && edge >= 0.02 && trapRisk <= 55) {
    verdict = 'VALUE';
  } else if (edge >= 0.01 || sharpScore >= 55) {
    verdict = 'LEAN';
  }

  const computed: AnalysisComputation = {
    impliedProb,
    fairOdds,
    edge,
    sharpScore,
    marketPressure,
    trapRisk,
    verdict,
    reasons: []
  };

  computed.reasons = createReasons(input, computed);
  return computed;
};

export const inferLineMovedAgainstPublic = (
  side: MarketSide,
  publicPercent: number | null,
  openOdds: number | null,
  currentOdds: number
) => {
  if (publicPercent == null || openOdds == null || openOdds <= 0) return false;
  if (publicPercent < 50) return false;

  // Decimal odds higher means less implied chance.
  const movedAgainst = currentOdds > openOdds;
  // For totals/spreads, same direction logic in MVP.
  return movedAgainst && ['HOME', 'AWAY', 'DRAW', 'OVER', 'UNDER'].includes(side);
};
