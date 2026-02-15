'use client';

import * as React from 'react';
import { useState, useEffect } from 'react';
import { use } from 'react';
import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trophy, Clock } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { GlowButton } from '@/components/ui/glow-button';
import { ProbabilityBar } from '@/components/ui/probability-bar';
import { EdgeBadge } from '@/components/ui/edge-badge';
import { LoadingMessage } from '@/components/ui/skeleton-block';
import { Badge } from '@/components/ui/badge';
import { OddsComparison } from '@/components/match/odds-comparison';
import { AlertsPanel } from '@/components/match/alerts-panel';
import { supabase, Match, Odds, Alert } from '@/lib/supabase';
import { getStatusColor, formatOdds, calculateEdge, formatPercentage } from '@/lib/betting-utils';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export default function MatchPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const router = useRouter();
  const [match, setMatch] = useState<Match | null>(null);
  const [odds, setOdds] = useState<Odds[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMatch();
  }, [resolvedParams.slug]);

  async function loadMatch() {
    setLoading(true);
    await new Promise(resolve => setTimeout(resolve, 800));

    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          league:leagues(*),
          home_team:teams!matches_home_team_id_fkey(*),
          away_team:teams!matches_away_team_id_fkey(*),
          prediction:predictions(*)
        `)
        .eq('slug', resolvedParams.slug)
        .maybeSingle();

      if (data) {
        setMatch(data as any);

        const [oddsRes, alertsRes] = await Promise.all([
          supabase
            .from('odds')
            .select('*, bookmaker:bookmakers(*)')
            .eq('match_id', data.id),
          supabase
            .from('alerts')
            .select('*')
            .eq('match_id', data.id)
            .eq('is_active', true)
        ]);

        if (oddsRes.data) setOdds(oddsRes.data as any);
        if (alertsRes.data) setAlerts(alertsRes.data as any);
      }
    } catch (error) {
      console.error('Error loading match:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingMessage message="Analyzing match data..." />
      </div>
    );
  }

  if (!match) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <GlassCard className="p-8 text-center">
          <p className="text-gray-400">Match not found</p>
          <GlowButton onClick={() => router.push('/browse')} className="mt-4">
            Back to Browse
          </GlowButton>
        </GlassCard>
      </div>
    );
  }

  const prediction = Array.isArray(match.prediction) ? match.prediction[0] : match.prediction;
  const edge = calculateEdge(match.away_prob, match.away_odds);

  return (
    <div className="min-h-screen p-8">
      <div className="container max-w-7xl mx-auto space-y-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-4"
        >
          <GlowButton variant="ghost" onClick={() => router.push('/browse')}>
            <ArrowLeft className="w-4 h-4" />
          </GlowButton>
          <div>
            <div className="flex items-center gap-3">
              <span className="text-2xl">{match.league?.icon}</span>
              <h1 className="text-2xl font-bold text-white">{match.league?.name}</h1>
              <Badge className={getStatusColor(match.status)}>{match.status}</Badge>
            </div>
            <p className="text-sm text-gray-400 mt-1">
              {match.sport} • Match Analysis
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-12 gap-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="col-span-4"
          >
            <GlassCard className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-white border-b border-white/10 pb-3">
                MATCH & TEAMS
              </h2>
              <div>
                <div className="flex items-center justify-between py-3 border-b border-white/10">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{match.home_team?.logo || '🏠'}</span>
                    <div>
                      <p className="font-semibold text-white">{match.home_team?.name}</p>
                      <p className="text-xs text-gray-400">
                        ≤ {match.home_team?.average_rating} Average
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">Home</span>
                </div>
                <div className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-2">
                    <span className="text-2xl">{match.away_team?.logo || '⭐'}</span>
                    <div>
                      <p className="font-semibold text-white">{match.away_team?.name}</p>
                      <p className="text-xs text-gray-400">
                        ≤ {match.away_team?.average_rating} Average
                      </p>
                    </div>
                  </div>
                  <span className="text-sm text-gray-400">Away</span>
                </div>
              </div>
              <div className="pt-3 border-t border-white/10">
                <p className="text-xs text-gray-400 mb-2">Odds</p>
                <div className="grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="py-2 px-3 rounded bg-white/5">
                    <p className="text-xs text-gray-400 mb-1">1</p>
                    <p className="font-bold text-white">{formatOdds(match.home_odds)}</p>
                  </div>
                  <div className="py-2 px-3 rounded bg-white/5">
                    <p className="text-xs text-gray-400 mb-1">X</p>
                    <p className="font-bold text-white">{formatOdds(match.draw_odds)}</p>
                  </div>
                  <div className="py-2 px-3 rounded bg-white/5">
                    <p className="text-xs text-gray-400 mb-1">2</p>
                    <p className="font-bold text-white">{formatOdds(match.away_odds)}</p>
                  </div>
                </div>
              </div>
            </GlassCard>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="col-span-8 space-y-6"
          >
            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">RESULT</h2>
                <Badge className="bg-gradient-to-r from-yellow-500/20 to-orange-500/20 text-yellow-400 border-yellow-500/30">
                  Confidence {match.confidence}%
                </Badge>
              </div>
              <div className="text-center py-6">
                <p className="text-sm text-gray-400 mb-2">Expected score</p>
                <p className="text-5xl font-bold text-white">
                  {match.expected_score_home} : {match.expected_score_away}
                </p>
                <p className="text-xs text-gray-400 mt-2">Half score</p>
              </div>
            </GlassCard>

            <GlassCard className="p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">PREDICTION</h2>
                {edge > 2 && <EdgeBadge value={edge} />}
              </div>
              {prediction && (
                <div className="space-y-3">
                  <div className="p-4 rounded-lg bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30">
                    <p className="text-sm text-gray-400 mb-1">Recommended</p>
                    <p className="text-xl font-bold text-cyan-400">{prediction.recommended_bet}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400 mb-1">Strategy</p>
                      <p className="text-sm text-white">{prediction.strategy}</p>
                    </div>
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-xs text-gray-400 mb-1">Trust</p>
                      <p className="text-sm text-emerald-400">{prediction.trust_level}%</p>
                    </div>
                  </div>
                  <div className="p-4 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <p className="text-sm font-semibold text-purple-400 mb-2">Handicap pattern</p>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-gray-400">Home handicap</p>
                        <p className="text-white">{formatPercentage(prediction.home_handicap_prob)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-400">Away handicap</p>
                        <p className="text-white">{formatPercentage(prediction.away_handicap_prob)}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </GlassCard>

            <GlassCard className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">PROBABILITIES</h2>
              <ProbabilityBar
                segments={[
                  { label: 'Home', value: match.home_prob, color: 'bg-gradient-to-r from-blue-500 to-blue-600' },
                  { label: 'Draw', value: match.draw_prob, color: 'bg-gradient-to-r from-gray-500 to-gray-600' },
                  { label: 'Away', value: match.away_prob, color: 'bg-gradient-to-r from-rose-500 to-rose-600' }
                ]}
              />
            </GlassCard>

            <GlassCard className="p-6 space-y-4">
              <h2 className="text-lg font-bold text-white">PUBLIC vs CASH</h2>
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-400 mb-2">Public ML</p>
                  <ProbabilityBar
                    segments={[
                      { label: 'H', value: match.public_home, color: 'bg-gradient-to-r from-pink-500 to-rose-500' },
                      { label: 'D', value: match.public_draw, color: 'bg-gradient-to-r from-gray-500 to-gray-600' },
                      { label: 'A', value: match.public_away, color: 'bg-gradient-to-r from-purple-500 to-pink-500' }
                    ]}
                    showLabels={false}
                  />
                </div>
                <div>
                  <p className="text-sm text-gray-400 mb-2">All Cash</p>
                  <ProbabilityBar
                    segments={[
                      { label: 'H', value: match.cash_home, color: 'bg-gradient-to-r from-yellow-500 to-orange-500' },
                      { label: 'D', value: match.cash_draw, color: 'bg-gradient-to-r from-orange-500 to-red-500' },
                      { label: 'A', value: match.cash_away, color: 'bg-gradient-to-r from-red-500 to-rose-500' }
                    ]}
                    showLabels={false}
                  />
                </div>
              </div>
            </GlassCard>

            {odds.length > 0 && (
              <OddsComparison odds={odds} matchType="1x2" />
            )}

            {alerts.length > 0 && (
              <AlertsPanel alerts={alerts} />
            )}

            {prediction && (
              <GlassCard className="p-6 space-y-4">
                <h2 className="text-lg font-bold text-emerald-400">AI BRAIN</h2>
                <p className="text-sm text-gray-300 leading-relaxed">
                  {prediction.ai_summary || 'Following model consensus and imported monitor data, confidence and score projection were generated from current probabilities and signals.'}
                </p>
                {prediction.strange_incident && (
                  <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30">
                    <p className="text-xs text-rose-400">⚠️ {prediction.strange_incident}</p>
                  </div>
                )}
              </GlassCard>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
