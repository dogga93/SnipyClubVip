/*
  # Add Missing Columns and New Tables

  ## Changes to Existing Tables
  
  ### leagues table
  - Add `sport` column
  - Add `is_active` column
  - Add `updated_at` column
  
  ### teams table
  - Add `short_name` column
  - Add `country` column
  - Add `form` column (recent results)
  - Add `updated_at` column
  
  ## New Tables
  
  ### bookmakers
  - `id` (uuid, primary key)
  - `name` (text, unique) - Internal name
  - `display_name` (text) - Display name
  - `logo` (text) - Logo URL or emoji
  - `website` (text) - Website URL
  - `is_active` (boolean)
  - `commission_rate` (numeric)
  - `created_at` (timestamptz)
  
  ### odds
  - `id` (uuid, primary key)
  - `match_id` (uuid) - Foreign key to matches
  - `bookmaker_id` (uuid) - Foreign key to bookmakers
  - `home_odds` (numeric)
  - `draw_odds` (numeric)
  - `away_odds` (numeric)
  - `updated_at` (timestamptz)
  - `created_at` (timestamptz)
  
  ### team_stats
  - `id` (uuid, primary key)
  - `team_id` (uuid) - Foreign key to teams
  - `season` (text)
  - `matches_played` (integer)
  - `wins` (integer)
  - `draws` (integer)
  - `losses` (integer)
  - `goals_for` (integer)
  - `goals_against` (integer)
  - `clean_sheets` (integer)
  - `updated_at` (timestamptz)
  
  ## Security
  - Enable RLS on all new tables
  - Add policies for public read access
*/

-- Add missing columns to leagues
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leagues' AND column_name = 'sport'
  ) THEN
    ALTER TABLE leagues ADD COLUMN sport text DEFAULT 'soccer';
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leagues' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE leagues ADD COLUMN is_active boolean DEFAULT true;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'leagues' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE leagues ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add missing columns to teams
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'short_name'
  ) THEN
    ALTER TABLE teams ADD COLUMN short_name text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'country'
  ) THEN
    ALTER TABLE teams ADD COLUMN country text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'form'
  ) THEN
    ALTER TABLE teams ADD COLUMN form text;
  END IF;
  
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'teams' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE teams ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Create bookmakers table
CREATE TABLE IF NOT EXISTS bookmakers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  logo text DEFAULT '📊',
  website text,
  is_active boolean DEFAULT true,
  commission_rate numeric(4,2) DEFAULT 5.0,
  created_at timestamptz DEFAULT now()
);

-- Create odds table for storing multiple bookmaker odds
CREATE TABLE IF NOT EXISTS odds (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  match_id uuid NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  bookmaker_id uuid NOT NULL REFERENCES bookmakers(id) ON DELETE CASCADE,
  home_odds numeric(5,2) NOT NULL DEFAULT 0,
  draw_odds numeric(5,2) DEFAULT 0,
  away_odds numeric(5,2) NOT NULL DEFAULT 0,
  over_under_line numeric(3,1),
  over_odds numeric(5,2),
  under_odds numeric(5,2),
  btts_yes_odds numeric(5,2),
  btts_no_odds numeric(5,2),
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(match_id, bookmaker_id)
);

-- Create team_stats table
CREATE TABLE IF NOT EXISTS team_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  season text DEFAULT '2024/25',
  matches_played integer DEFAULT 0,
  wins integer DEFAULT 0,
  draws integer DEFAULT 0,
  losses integer DEFAULT 0,
  goals_for integer DEFAULT 0,
  goals_against integer DEFAULT 0,
  clean_sheets integer DEFAULT 0,
  home_wins integer DEFAULT 0,
  home_draws integer DEFAULT 0,
  home_losses integer DEFAULT 0,
  away_wins integer DEFAULT 0,
  away_draws integer DEFAULT 0,
  away_losses integer DEFAULT 0,
  updated_at timestamptz DEFAULT now(),
  UNIQUE(team_id, season)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_odds_match_id ON odds(match_id);
CREATE INDEX IF NOT EXISTS idx_odds_bookmaker_id ON odds(bookmaker_id);
CREATE INDEX IF NOT EXISTS idx_team_stats_team_id ON team_stats(team_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_match_date ON matches(match_date);

-- Enable RLS
ALTER TABLE bookmakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE odds ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for bookmakers
CREATE POLICY "Anyone can view active bookmakers"
  ON bookmakers FOR SELECT
  TO public
  USING (is_active = true);

CREATE POLICY "Authenticated users can view all bookmakers"
  ON bookmakers FOR SELECT
  TO authenticated
  USING (true);

-- RLS Policies for odds
CREATE POLICY "Anyone can view odds"
  ON odds FOR SELECT
  TO public
  USING (true);

-- RLS Policies for team_stats
CREATE POLICY "Anyone can view team stats"
  ON team_stats FOR SELECT
  TO public
  USING (true);
