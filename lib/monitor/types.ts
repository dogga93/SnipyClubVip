export type MonitorMatch = {
  id: string;
  slug?: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  date: string; // YYYY-MM-DD
  sport?: string;
  status?: string;
  confidence?: number | null;
  kickOffEt?: string;
  ml1?: string;
  mlDraw?: string;
  ml2?: string;
  probability1?: string;
  probabilityDraw?: string;
  probability2?: string;
  predictedScore1?: string;
  predictedScore2?: string;
  publicMl1?: string;
  publicMlDraw?: string;
  publicMl2?: string;
  allPublicPct1?: string;
  allPublicPctDraw?: string;
  allPublicPct2?: string;
  allCashPct1?: string;
  allCashPctDraw?: string;
  allCashPct2?: string;
  allCashTeam1?: string;
  allCashDraw?: string;
  allCashTeam2?: string;
  cashRatio1?: string;
  cashRatio2?: string;
  stars?: string;
  signals?: string;
  otherPredictions?: string;
  realScore?: string;
};

export type MonitorLeague = {
  id: string;
  name: string;
  country: string;
  icon: string;
  matches_count: number;
};

export type MonitorStats = {
  totalMatches: number;
  totalLeagues: number;
  minDate: string | null;
  maxDate: string | null;
};

export type MonitorPayload = {
  source: 'excel' | 'json';
  date: string;
  leagues: MonitorLeague[];
  matches: MonitorMatch[];
  stats: MonitorStats;
};

export type MergedSportStat = {
  sport: string;
  count: number;
};
