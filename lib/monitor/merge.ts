import type { League } from '@/lib/supabase';
import type { MergedSportStat, MonitorLeague, MonitorMatch } from '@/lib/monitor/types';

const clean = (v: unknown) =>
  String(v ?? '')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

export const toMonitorSlug = (match: Pick<MonitorMatch, 'sport' | 'league' | 'homeTeam' | 'awayTeam'>) => {
  const normalized = `${clean(match.sport || 'soccer')}-${clean(match.league)}-${clean(match.homeTeam)}-${clean(match.awayTeam)}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return normalized || 'monitor-match';
};

export const toMatchKey = (match: Pick<MonitorMatch, 'sport' | 'league' | 'homeTeam' | 'awayTeam' | 'date'>) =>
  `${clean(match.sport || 'SOCCER').toLowerCase()}|${clean(match.league).toLowerCase()}|${clean(match.homeTeam).toLowerCase()}|${clean(match.awayTeam).toLowerCase()}|${clean(match.date)}`;

export const mergeMonitorAndSupabaseLeagues = (
  monitorLeagues: MonitorLeague[],
  supabaseLeagues: League[]
): League[] => {
  const merged = new Map<string, League>();

  for (const league of supabaseLeagues) {
    const key = clean(league.name).toLowerCase();
    if (!key) continue;
    merged.set(key, league);
  }

  for (const league of monitorLeagues) {
    const key = clean(league.name).toLowerCase();
    if (!key) continue;
    const existing = merged.get(key);
    merged.set(key, {
      id: existing?.id || league.id,
      name: league.name,
      country: existing?.country || league.country || '',
      icon: existing?.icon || league.icon || '⚽',
      sport: existing?.sport || 'SOCCER',
      is_active: true,
      matches_count: Math.max(existing?.matches_count ?? 0, league.matches_count ?? 0),
      created_at: existing?.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    });
  }

  return [...merged.values()].sort((a, b) => b.matches_count - a.matches_count || a.name.localeCompare(b.name));
};

export const enrichMonitorMatches = (matches: MonitorMatch[]): MonitorMatch[] =>
  matches.map((match) => ({
    ...match,
    slug: match.slug || toMonitorSlug(match),
    sport: clean(match.sport || 'SOCCER').toUpperCase(),
    status: clean(match.status || 'Scheduled'),
    date: clean(match.date)
  }));

export const computeSportsStats = (matches: MonitorMatch[]): MergedSportStat[] => {
  const map = new Map<string, number>();
  for (const match of matches) {
    const sport = clean(match.sport || 'SOCCER').toUpperCase();
    map.set(sport, (map.get(sport) ?? 0) + 1);
  }
  return [...map.entries()]
    .map(([sport, count]) => ({ sport, count }))
    .sort((a, b) => b.count - a.count || a.sport.localeCompare(b.sport));
};

export const parsePercent = (value?: string | number | null) => {
  if (value == null) return 0;
  const text = clean(value).replace('%', '').replace(',', '.');
  if (!text) return 0;
  const num = Number(text);
  if (!Number.isFinite(num)) return 0;
  return num;
};

export const parseScore = (value?: string) => {
  const text = clean(value);
  const m = text.match(/(\d+)\s*[:\-]\s*(\d+)/);
  if (!m) return null;
  return { home: Number(m[1]), away: Number(m[2]) };
};

