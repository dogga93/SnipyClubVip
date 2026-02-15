import type { MarketSide, MarketType } from '@prisma/client';
import type {
  InternalModel,
  InternalModelResult,
  MatchesPage,
  ProviderMatch,
  ProviderOdds,
  ProviderOddsSnapshot,
  ProviderPublicCash,
  ProviderPublicCashSnapshot
} from '@/lib/providers/types';

const FD_TOKEN = process.env.FOOTBALL_DATA_TOKEN || process.env.FOOTBALL_DATA_API_TOKEN || '';

const marketSides: Array<{ marketType: MarketType; side: MarketSide }> = [
  { marketType: 'X1X2', side: 'HOME' },
  { marketType: 'X1X2', side: 'DRAW' },
  { marketType: 'X1X2', side: 'AWAY' },
  { marketType: 'ML', side: 'HOME' },
  { marketType: 'ML', side: 'AWAY' },
  { marketType: 'TOTAL', side: 'OVER' },
  { marketType: 'TOTAL', side: 'UNDER' }
];

const hash = (seed: string) => {
  let h = 0;
  for (let i = 0; i < seed.length; i += 1) {
    h = (h * 31 + seed.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
};

const rand = (seed: string, min: number, max: number) => {
  const h = hash(seed) % 10000;
  const ratio = h / 10000;
  return min + (max - min) * ratio;
};

const round3 = (value: number) => Math.round(value * 1000) / 1000;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const makeMockMatches = (from: Date, limit: number): ProviderMatch[] => {
  const leagues = ['England Premier League', 'Spain La Liga', 'Italy Serie A', 'Germany Bundesliga', 'France Ligue 1'];
  const teams = [
    ['Arsenal', 'Chelsea'],
    ['Leeds United', 'West Bromwich Albion'],
    ['Real Oviedo', 'Athletic Bilbao'],
    ['Udinese', 'Sassuolo'],
    ['Paris Saint-Germain', 'Monaco'],
    ['Bayern Munich', 'Dortmund'],
    ['Inter', 'Juventus']
  ];

  return Array.from({ length: limit }, (_, idx) => {
    const pair = teams[idx % teams.length];
    const league = leagues[idx % leagues.length];
    const start = new Date(from.getTime() + idx * 30 * 60 * 1000);
    return {
      externalRef: `mock-${start.toISOString()}-${idx}`,
      sport: 'SOCCER',
      league,
      homeTeam: pair[0],
      awayTeam: pair[1],
      startTime: start,
      status: idx % 3 === 0 ? 'SCHEDULED' : idx % 3 === 1 ? 'LIVE' : 'FINISHED'
    };
  });
};

const mapFdStatus = (value: string) => {
  const status = String(value || '').toUpperCase();
  if (status === 'IN_PLAY' || status === 'PAUSED') return 'LIVE';
  if (status === 'FINISHED' || status === 'AET' || status === 'PENALTY_SHOOTOUT') return 'FINISHED';
  return 'SCHEDULED';
};

const fetchFootballDataMatches = async (from: Date, to: Date, limit: number): Promise<ProviderMatch[]> => {
  if (!FD_TOKEN) return [];

  const fmt = (d: Date) => d.toISOString().slice(0, 10);
  const url = `https://api.football-data.org/v4/matches?dateFrom=${fmt(from)}&dateTo=${fmt(to)}`;

  const response = await fetch(url, {
    headers: {
      'X-Auth-Token': FD_TOKEN
    }
  });

  if (!response.ok) {
    console.info('[providers] football-data unavailable', response.status);
    return [];
  }

  const payload = await response.json();
  const rows = Array.isArray(payload?.matches) ? payload.matches : [];

  return rows.slice(0, limit).map((row: any) => ({
    externalRef: String(row.id),
    sport: 'SOCCER',
    league: String(row.competition?.name || 'Unknown League'),
    homeTeam: String(row.homeTeam?.name || 'Home'),
    awayTeam: String(row.awayTeam?.name || 'Away'),
    startTime: new Date(String(row.utcDate || new Date().toISOString())),
    status: mapFdStatus(String(row.status || ''))
  }));
};

export class CompositeOddsProvider implements ProviderOdds {
  async getMatchesWindow(input: { from: Date; to: Date; cursor?: string; limit: number }): Promise<MatchesPage> {
    const offset = Number.parseInt(input.cursor ?? '0', 10) || 0;
    const source = await fetchFootballDataMatches(input.from, input.to, Math.max(input.limit * 2, 60));
    const full = source.length > 0 ? source : makeMockMatches(input.from, 120);
    const slice = full.slice(offset, offset + input.limit);
    const nextCursor = offset + input.limit < full.length ? String(offset + input.limit) : null;
    return { matches: slice, nextCursor };
  }

  async getOddsForMatch(match: ProviderMatch): Promise<ProviderOddsSnapshot[]> {
    const books = ['Pinnacle', 'Bet365'];

    return marketSides.flatMap((entry, idx) =>
      books.map((book, bIdx) => {
        const seed = `${match.externalRef}-${entry.marketType}-${entry.side}-${book}`;
        const currentOdds = round3(clamp(rand(seed, 1.3, 3.8), 1.01, 25));
        const openRaw = currentOdds * (1 + rand(`${seed}-open`, -0.08, 0.08));
        const openOdds = round3(clamp(openRaw, 1.01, 25));

        return {
          marketType: entry.marketType,
          side: entry.side,
          book,
          openOdds: idx % 5 === 0 && bIdx === 1 ? null : openOdds,
          currentOdds
        };
      })
    );
  }
}

export class MockPublicCashProvider implements ProviderPublicCash {
  async getPublicCashForMatch(match: ProviderMatch): Promise<ProviderPublicCashSnapshot[]> {
    return marketSides.map((entry) => {
      const seed = `${match.externalRef}-${entry.marketType}-${entry.side}-public-cash`;
      const publicPercent = Math.round(rand(`${seed}-public`, 35, 82) * 10) / 10;
      const cashPercent = Math.round(rand(`${seed}-cash`, 28, 84) * 10) / 10;

      const missing = hash(seed) % 7 === 0;
      return {
        marketType: entry.marketType,
        side: entry.side,
        publicPercent: missing ? null : publicPercent,
        cashPercent: missing ? null : cashPercent
      };
    });
  }
}

export class MockInternalModelProvider implements InternalModel {
  async run(
    match: ProviderMatch,
    odds: ProviderOddsSnapshot[],
    _publicCash: ProviderPublicCashSnapshot[]
  ): Promise<InternalModelResult> {
    const confidence = clamp(rand(`${match.externalRef}-confidence`, 0.45, 0.9), 0, 1);
    const expectedHome = Math.round(rand(`${match.externalRef}-xh`, 0.5, 2.8) * 100) / 100;
    const expectedAway = Math.round(rand(`${match.externalRef}-xa`, 0.4, 2.5) * 100) / 100;

    const projections = odds.map((entry) => {
      const base = 1 / entry.currentOdds;
      const adjustment = rand(`${match.externalRef}-${entry.marketType}-${entry.side}-adj`, -0.04, 0.06);
      return {
        marketType: entry.marketType,
        side: entry.side,
        modelProb: clamp(base + adjustment, 0.02, 0.92)
      };
    });

    return {
      confidence,
      expectedScore: {
        home: expectedHome,
        away: expectedAway
      },
      projections
    };
  }
}
