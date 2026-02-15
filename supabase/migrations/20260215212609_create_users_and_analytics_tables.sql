/*
  # Create User and Analytics Tables

  ## New Tables
  
  ### users (extends auth.users)
  - `id` (uuid, primary key) - References auth.users
  - `email` (text)
  - `display_name` (text)
  - `avatar_url` (text)
  - `subscription_tier` (text) - free, pro, premium
  - `subscription_expires_at` (timestamptz)
  - `total_picks` (integer)
  - `successful_picks` (integer)
  - `roi` (numeric) - Return on investment percentage
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### match_analytics
  - `id` (uuid, primary key)
  - `match_id` (uuid) - Foreign key to matches
  - `total_views` (integer)
  - `unique_visitors` (integer)
  - `avg_confidence_score` (numeric)
  - `bookmaker_count` (integer)
  - `odds_range_home` (text)
  - `odds_range_away` (text)
  - `value_detected` (boolean)
  - `risk_level` (text) - low, medium, high
  - `created_at` (timestamptz)
  - `updated_at` (timestamptz)
  
  ### user_picks_history
  - `id` (uuid, primary key)
  - `user_id` (uuid) - Foreign key to users
  - `pick_id` (uuid) - Foreign key to picks
  - `stake_amount` (numeric)
  - `potential_return` (numeric)
  - `actual_return` (numeric)
  - `created_at` (timestamptz)
  
  ### alerts
  - `id` (uuid, primary key)
  - `match_id` (uuid) - Foreign key to matches
  - `alert_type` (text) - value_bet, line_movement, injury, etc.
  - `severity` (text) - low, medium, high
  - `title` (text)
  - `message` (text)
  - `is_active` (boolean)
  - `created_at` (timestamptz)
  - `expires_at` (timestamptz)
  
  ## Security
  - Enable RLS on all tables
  - Users can only view/edit their own data
  - Analytics and alerts are public read
*/

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text UNIQUE,
  display_name text,
  avatar_url text,
  subscription_tier text DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
  subscription_expires_at timestamptz,
  total_picks integer DEFAULT 0,
  successful_picks integer DEFAULT 0,
  roi numeric(5,2) DEFAULT 0,
  credits integer DEFAULT 3,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create match_analytics table
CREATE TABLE IF NOT EXISTS match_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE UNIQUE,
  total_views integer DEFAULT 0,
  unique_visitors integer DEFAULT 0,
  avg_confidence_score numeric(5,2) DEFAULT 0,
  bookmaker_count integer DEFAULT 0,
  odds_range_home text,
  odds_range_away text,
  value_detected boolean DEFAULT false,
  risk_level text DEFAULT 'medium' CHECK (risk_level IN ('low', 'medium', 'high')),
  sharp_money_percentage numeric(5,2) DEFAULT 0,
  public_money_percentage numeric(5,2) DEFAULT 0,
  line_movement text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create user_picks_history table
CREATE TABLE IF NOT EXISTS user_picks_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  pick_id uuid REFERENCES picks(id) ON DELETE SET NULL,
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  pick_description text NOT NULL,
  stake_amount numeric(10,2) DEFAULT 0,
  odds numeric(5,2) NOT NULL,
  potential_return numeric(10,2) DEFAULT 0,
  actual_return numeric(10,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'won', 'lost', 'void')),
  created_at timestamptz DEFAULT now()
);

-- Create alerts table
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid REFERENCES matches(id) ON DELETE CASCADE,
  alert_type text NOT NULL CHECK (alert_type IN ('value_bet', 'line_movement', 'injury', 'weather', 'suspension', 'odds_drop', 'sharp_action')),
  severity text DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title text NOT NULL,
  message text NOT NULL,
  is_active boolean DEFAULT true,
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '24 hours')
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_users_subscription_tier ON users(subscription_tier);
CREATE INDEX IF NOT EXISTS idx_match_analytics_match_id ON match_analytics(match_id);
CREATE INDEX IF NOT EXISTS idx_match_analytics_value_detected ON match_analytics(value_detected);
CREATE INDEX IF NOT EXISTS idx_user_picks_history_user_id ON user_picks_history(user_id);
CREATE INDEX IF NOT EXISTS idx_user_picks_history_status ON user_picks_history(status);
CREATE INDEX IF NOT EXISTS idx_alerts_match_id ON alerts(match_id);
CREATE INDEX IF NOT EXISTS idx_alerts_is_active ON alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_alerts_expires_at ON alerts(expires_at);

-- Enable RLS
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE match_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_picks_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for users
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT
  TO authenticated
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON users FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- RLS Policies for match_analytics
CREATE POLICY "Anyone can view match analytics"
  ON match_analytics FOR SELECT
  TO public
  USING (true);

-- RLS Policies for user_picks_history
CREATE POLICY "Users can view own picks history"
  ON user_picks_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own picks"
  ON user_picks_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for alerts
CREATE POLICY "Anyone can view active alerts"
  ON alerts FOR SELECT
  TO public
  USING (is_active = true AND expires_at > now());

CREATE POLICY "Authenticated users can view all alerts"
  ON alerts FOR SELECT
  TO authenticated
  USING (true);
