import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface League {
  id: string;
  name: string;
  country: string;
  icon: string;
  sport: string;
  is_active: boolean;
  matches_count: number;
  created_at: string;
  updated_at: string;
}

export interface Team {
  id: string;
  name: string;
  short_name?: string;
  logo: string;
  league_id: string;
  country?: string;
  average_rating: number;
  form?: string;
  created_at: string;
  updated_at: string;
}

export interface Bookmaker {
  id: string;
  name: string;
  display_name: string;
  logo: string;
  website?: string;
  is_active: boolean;
  commission_rate: number;
  created_at: string;
}

export interface Odds {
  id: string;
  match_id: string;
  bookmaker_id: string;
  home_odds: number;
  draw_odds?: number;
  away_odds: number;
  over_under_line?: number;
  over_odds?: number;
  under_odds?: number;
  btts_yes_odds?: number;
  btts_no_odds?: number;
  updated_at: string;
  created_at: string;
  bookmaker?: Bookmaker;
}

export interface TeamStats {
  id: string;
  team_id: string;
  season: string;
  matches_played: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  clean_sheets: number;
  home_wins: number;
  home_draws: number;
  home_losses: number;
  away_wins: number;
  away_draws: number;
  away_losses: number;
  updated_at: string;
}

export interface MatchAnalytics {
  id: string;
  match_id: string;
  total_views: number;
  unique_visitors: number;
  avg_confidence_score: number;
  bookmaker_count: number;
  odds_range_home?: string;
  odds_range_away?: string;
  value_detected: boolean;
  risk_level: string;
  sharp_money_percentage: number;
  public_money_percentage: number;
  line_movement?: string;
  created_at: string;
  updated_at: string;
}

export interface Alert {
  id: string;
  match_id?: string;
  alert_type: string;
  severity: string;
  title: string;
  message: string;
  is_active: boolean;
  metadata?: any;
  created_at: string;
  expires_at: string;
  match?: Match;
}

export interface Match {
  id: string;
  slug: string;
  league_id: string;
  home_team_id: string;
  away_team_id: string;
  match_date: string;
  status: string;
  sport: string;
  home_odds: number;
  draw_odds: number;
  away_odds: number;
  home_prob: number;
  draw_prob: number;
  away_prob: number;
  confidence: number;
  expected_score_home: number;
  expected_score_away: number;
  actual_score_home?: number;
  actual_score_away?: number;
  public_home: number;
  public_draw: number;
  public_away: number;
  cash_home: number;
  cash_draw: number;
  cash_away: number;
  created_at: string;
  updated_at: string;
  home_team?: Team;
  away_team?: Team;
  league?: League;
  prediction?: Prediction | Prediction[];
  odds?: Odds[];
  analytics?: MatchAnalytics;
}

export interface Prediction {
  id: string;
  match_id: string;
  recommended_bet: string;
  strategy: string;
  handicap_pattern: string;
  home_handicap_prob: number;
  away_handicap_prob: number;
  trust_level: number;
  btts_prob: number;
  ou_threshold: number;
  strange_incident: string;
  edge_percentage: number;
  ai_summary: string;
  basis_for_prediction: string;
  created_at: string;
}

export interface Pick {
  id: string;
  match_id: string;
  user_name: string;
  pick: string;
  odds: number;
  status: string;
  is_vip: boolean;
  progress: number;
  created_at: string;
  match?: Match;
}
