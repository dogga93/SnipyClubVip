export interface Sport {
  id: string;
  name: string;
  icon: string;
  matchCount: number;
}

export interface League {
  id: string;
  name: string;
  country: string;
  flag: string;
  matchCount: number;
  sportId: string;
}

export interface Match {
  id: string;
  leagueId: string;
  homeTeam: string;
  awayTeam: string;
  kickoff: string;
  liveScore?: string;
  confidence: number;
  odds: {
    home: number;
    draw: number;
    away: number;
  };
  prediction: {
    home: number;
    draw: number;
    away: number;
  };
  expectedScore: {
    home: number;
    away: number;
  };
  handicap: {
    home: number;
    away: number;
  };
  overUnder: {
    line: number;
    over: number;
    under: number;
  };
  btts: number;
  trust: number;
  signals: string[];
  predictionBasis: string[];
  topScores: Array<{
    home: number;
    away: number;
    probability: number;
  }>;
  market?: {
    publicML?: {
      home: number;
      draw: number;
      away: number;
    };
    publicAll?: {
      home: number;
      draw: number;
      away: number;
    };
    cashAll?: {
      home: number;
      draw: number;
      away: number;
    };
    cashAmount?: {
      home: number;
      draw: number;
      away: number;
    };
    ratio?: {
      publicHome?: number;
      publicAway?: number;
      cashHome?: number;
      cashAway?: number;
    };
    oddsMovement?: {
      opening: {
        home: number;
        draw: number;
        away: number;
      };
      current: {
        home: number;
        draw: number;
        away: number;
      };
    };
  };
  monitorDetails?: Array<{
    label: string;
    value: string;
  }>;
}

export const sports: Sport[] = [
  { id: 'soccer', name: 'Soccer', icon: '⚽', matchCount: 156 },
  { id: 'basketball', name: 'Basketball', icon: '🏀', matchCount: 43 },
  { id: 'tennis', name: 'Tennis', icon: '🎾', matchCount: 0 },
  { id: 'football', name: 'American Football', icon: '🏈', matchCount: 28 },
  { id: 'hockey', name: 'Hockey', icon: '🏒', matchCount: 35 },
  { id: 'baseball', name: 'Baseball', icon: '⚾', matchCount: 0 },
];

export const leagues: League[] = [
  { id: 'epl', name: 'Premier League', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', matchCount: 20, sportId: 'soccer' },
  { id: 'laliga', name: 'La Liga', country: 'Spain', flag: '🇪🇸', matchCount: 18, sportId: 'soccer' },
  { id: 'seriea', name: 'Serie A', country: 'Italy', flag: '🇮🇹', matchCount: 22, sportId: 'soccer' },
  { id: 'bundesliga', name: 'Bundesliga', country: 'Germany', flag: '🇩🇪', matchCount: 16, sportId: 'soccer' },
  { id: 'ligue1', name: 'Ligue 1', country: 'France', flag: '🇫🇷', matchCount: 19, sportId: 'soccer' },
  { id: 'eredivisie', name: 'Eredivisie', country: 'Netherlands', flag: '🇳🇱', matchCount: 15, sportId: 'soccer' },
  { id: 'championship', name: 'Championship', country: 'England', flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', matchCount: 24, sportId: 'soccer' },
  { id: 'ucl', name: 'Champions League', country: 'Europe', flag: '🇪🇺', matchCount: 12, sportId: 'soccer' },
];

export const matches: Match[] = [
  {
    id: '1',
    leagueId: 'epl',
    homeTeam: 'Manchester City',
    awayTeam: 'Liverpool',
    kickoff: '2026-02-15T15:00:00Z',
    confidence: 87,
    odds: { home: 2.10, draw: 3.40, away: 3.60 },
    prediction: { home: 45, draw: 28, away: 27 },
    expectedScore: { home: 2, away: 1 },
    handicap: { home: 62, away: 38 },
    overUnder: { line: 2.5, over: 58, under: 42 },
    btts: 65,
    trust: 89,
    signals: ['Strong home form', 'Key player available', 'Head-to-head advantage'],
    predictionBasis: [
      'Manchester City has won 7 of their last 10 home matches',
      'Liverpool averages 1.8 goals per game this season',
      'Historical H2H shows 60% home win rate at Etihad',
      'Both teams have strong attacking records',
      'Weather conditions favor home side',
      'Recent defensive vulnerabilities in Liverpool lineup',
      'Manchester City unbeaten in last 5 league games',
      'Key midfield battles expected to favor home side'
    ],
    topScores: [
      { home: 2, away: 1, probability: 18 },
      { home: 1, away: 1, probability: 16 },
      { home: 2, away: 0, probability: 14 },
      { home: 3, away: 1, probability: 12 },
      { home: 1, away: 0, probability: 10 },
      { home: 2, away: 2, probability: 9 },
      { home: 3, away: 2, probability: 7 },
      { home: 0, away: 1, probability: 6 },
      { home: 1, away: 2, probability: 5 },
      { home: 0, away: 0, probability: 3 },
    ]
  },
  {
    id: '2',
    leagueId: 'epl',
    homeTeam: 'Arsenal',
    awayTeam: 'Chelsea',
    kickoff: '2026-02-15T17:30:00Z',
    confidence: 75,
    odds: { home: 1.95, draw: 3.50, away: 4.00 },
    prediction: { home: 48, draw: 26, away: 26 },
    expectedScore: { home: 2, away: 1 },
    handicap: { home: 58, away: 42 },
    overUnder: { line: 2.5, over: 52, under: 48 },
    btts: 58,
    trust: 82,
    signals: ['Home advantage', 'Recent form favors home'],
    predictionBasis: [
      'Arsenal has superior home record this season',
      'Chelsea struggling with away form',
      'Key injuries in Chelsea defense',
      'Arsenal scoring consistently at Emirates',
      'Historical advantage for home side'
    ],
    topScores: [
      { home: 2, away: 1, probability: 19 },
      { home: 1, away: 1, probability: 17 },
      { home: 2, away: 0, probability: 15 },
      { home: 1, away: 0, probability: 13 },
      { home: 3, away: 1, probability: 11 },
      { home: 2, away: 2, probability: 8 },
      { home: 0, away: 1, probability: 7 },
      { home: 3, away: 0, probability: 5 },
      { home: 1, away: 2, probability: 3 },
      { home: 0, away: 0, probability: 2 },
    ]
  },
  {
    id: '3',
    leagueId: 'laliga',
    homeTeam: 'Real Madrid',
    awayTeam: 'Barcelona',
    kickoff: '2026-02-16T20:00:00Z',
    confidence: 92,
    odds: { home: 2.20, draw: 3.30, away: 3.40 },
    prediction: { home: 44, draw: 29, away: 27 },
    expectedScore: { home: 2, away: 2 },
    handicap: { home: 51, away: 49 },
    overUnder: { line: 3.5, over: 61, under: 39 },
    btts: 78,
    trust: 94,
    signals: ['El Clásico', 'High scoring expected', 'Both teams in form'],
    predictionBasis: [
      'Classic rivalry with historically high-scoring matches',
      'Both teams averaging 2+ goals per game',
      'Strong attacking lineups on both sides',
      'Recent El Clásico matches averaged 3.5 goals',
      'Defensive vulnerabilities in both teams',
      'Key attacking players all available',
      'High-pressure match expected to be open'
    ],
    topScores: [
      { home: 2, away: 2, probability: 20 },
      { home: 2, away: 1, probability: 18 },
      { home: 1, away: 1, probability: 15 },
      { home: 3, away: 2, probability: 12 },
      { home: 2, away: 0, probability: 10 },
      { home: 1, away: 2, probability: 9 },
      { home: 3, away: 1, probability: 7 },
      { home: 1, away: 0, probability: 5 },
      { home: 0, away: 1, probability: 3 },
      { home: 3, away: 3, probability: 1 },
    ]
  },
  {
    id: '4',
    leagueId: 'seriea',
    homeTeam: 'Inter Milan',
    awayTeam: 'AC Milan',
    kickoff: '2026-02-16T19:45:00Z',
    confidence: 81,
    odds: { home: 2.00, draw: 3.20, away: 4.20 },
    prediction: { home: 47, draw: 30, away: 23 },
    expectedScore: { home: 1, away: 1 },
    handicap: { home: 55, away: 45 },
    overUnder: { line: 2.5, over: 45, under: 55 },
    btts: 62,
    trust: 85,
    signals: ['Derby della Madonnina', 'Tight match expected'],
    predictionBasis: [
      'Inter Milan slight home advantage in recent derbies',
      'AC Milan improved defensive record',
      'Historical trend shows tight matches',
      'Both teams cautious in derby matches',
      'Recent meetings averaged under 2.5 goals'
    ],
    topScores: [
      { home: 1, away: 1, probability: 22 },
      { home: 1, away: 0, probability: 19 },
      { home: 2, away: 1, probability: 16 },
      { home: 0, away: 0, probability: 13 },
      { home: 2, away: 0, probability: 11 },
      { home: 0, away: 1, probability: 8 },
      { home: 2, away: 2, probability: 6 },
      { home: 1, away: 2, probability: 3 },
      { home: 3, away: 1, probability: 1 },
      { home: 3, away: 0, probability: 1 },
    ]
  },
  {
    id: '5',
    leagueId: 'bundesliga',
    homeTeam: 'Bayern Munich',
    awayTeam: 'Borussia Dortmund',
    kickoff: '2026-02-15T18:30:00Z',
    confidence: 88,
    odds: { home: 1.75, draw: 3.80, away: 4.50 },
    prediction: { home: 55, draw: 24, away: 21 },
    expectedScore: { home: 3, away: 1 },
    handicap: { home: 68, away: 32 },
    overUnder: { line: 3.5, over: 64, under: 36 },
    btts: 71,
    trust: 91,
    signals: ['Der Klassiker', 'Bayern dominant at home', 'High scoring likely'],
    predictionBasis: [
      'Bayern Munich unbeaten at home this season',
      'Averaging 3.2 goals per home game',
      'Dortmund vulnerable away from home',
      'Historical dominance for Bayern in Munich',
      'Key attacking players in excellent form',
      'Dortmund defensive injuries',
      'Recent H2H shows Bayern advantage'
    ],
    topScores: [
      { home: 3, away: 1, probability: 21 },
      { home: 2, away: 1, probability: 18 },
      { home: 3, away: 0, probability: 15 },
      { home: 2, away: 0, probability: 13 },
      { home: 3, away: 2, probability: 11 },
      { home: 4, away: 1, probability: 9 },
      { home: 1, away: 1, probability: 6 },
      { home: 2, away: 2, probability: 4 },
      { home: 1, away: 0, probability: 2 },
      { home: 4, away: 2, probability: 1 },
    ]
  },
  {
    id: '6',
    leagueId: 'ligue1',
    homeTeam: 'PSG',
    awayTeam: 'Marseille',
    kickoff: '2026-02-16T20:45:00Z',
    confidence: 79,
    odds: { home: 1.60, draw: 4.00, away: 5.50 },
    prediction: { home: 62, draw: 22, away: 16 },
    expectedScore: { home: 2, away: 0 },
    handicap: { home: 74, away: 26 },
    overUnder: { line: 2.5, over: 56, under: 44 },
    btts: 48,
    trust: 86,
    signals: ['Le Classique', 'PSG heavy favorites', 'Strong home record'],
    predictionBasis: [
      'PSG dominant at Parc des Princes',
      'Marseille poor away record this season',
      'Quality difference in squad depth',
      'PSG won last 4 meetings',
      'Home crowd advantage significant',
      'Marseille key players injured'
    ],
    topScores: [
      { home: 2, away: 0, probability: 23 },
      { home: 3, away: 0, probability: 19 },
      { home: 2, away: 1, probability: 16 },
      { home: 1, away: 0, probability: 14 },
      { home: 3, away: 1, probability: 11 },
      { home: 4, away: 0, probability: 7 },
      { home: 1, away: 1, probability: 5 },
      { home: 2, away: 2, probability: 3 },
      { home: 0, away: 0, probability: 1 },
      { home: 0, away: 1, probability: 1 },
    ]
  }
];
