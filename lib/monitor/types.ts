export type MonitorMatch = {
  id: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  date: string; // YYYY-MM-DD
  sport?: string;
  status?: string;
  confidence?: number | null;
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

