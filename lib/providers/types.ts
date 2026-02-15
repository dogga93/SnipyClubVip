import type { MarketSide, MarketType } from '@prisma/client';

export type ProviderMatch = {
  externalRef: string;
  sport: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  startTime: Date;
  status: string;
};

export type ProviderOddsSnapshot = {
  marketType: MarketType;
  side: MarketSide;
  book: string;
  openOdds: number | null;
  currentOdds: number;
};

export type ProviderPublicCashSnapshot = {
  marketType: MarketType;
  side: MarketSide;
  publicPercent: number | null;
  cashPercent: number | null;
};

export type InternalModelProjection = {
  marketType: MarketType;
  side: MarketSide;
  modelProb: number;
};

export type InternalModelResult = {
  confidence: number;
  expectedScore: {
    home: number;
    away: number;
  };
  projections: InternalModelProjection[];
};

export type MatchesPage = {
  matches: ProviderMatch[];
  nextCursor: string | null;
};

export interface ProviderOdds {
  getMatchesWindow(input: {
    from: Date;
    to: Date;
    cursor?: string;
    limit: number;
  }): Promise<MatchesPage>;

  getOddsForMatch(match: ProviderMatch): Promise<ProviderOddsSnapshot[]>;
}

export interface ProviderPublicCash {
  getPublicCashForMatch(match: ProviderMatch): Promise<ProviderPublicCashSnapshot[]>;
}

export interface InternalModel {
  run(match: ProviderMatch, odds: ProviderOddsSnapshot[], publicCash: ProviderPublicCashSnapshot[]): Promise<InternalModelResult>;
}
