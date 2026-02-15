'use client';

import * as React from 'react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { TrendingDown, TrendingUp } from 'lucide-react';
import { Odds, Bookmaker } from '@/lib/supabase';
import { formatOdds } from '@/lib/betting-utils';

interface OddsComparisonProps {
  odds: (Odds & { bookmaker?: Bookmaker })[];
  matchType?: '1x2' | 'over_under' | 'btts';
}

export function OddsComparison({ odds, matchType = '1x2' }: OddsComparisonProps) {
  if (!odds || odds.length === 0) {
    return (
      <GlassCard className="p-6" hover={false}>
        <p className="text-sm text-gray-400 text-center">
          No odds available from bookmakers
        </p>
      </GlassCard>
    );
  }

  const getBestOdds = (type: 'home' | 'draw' | 'away') => {
    const values = odds.map((o) => {
      if (type === 'home') return o.home_odds;
      if (type === 'draw') return o.draw_odds || 0;
      return o.away_odds;
    });
    return Math.max(...values);
  };

  const bestHome = getBestOdds('home');
  const bestDraw = getBestOdds('draw');
  const bestAway = getBestOdds('away');

  const renderMarketOdds = () => {
    if (matchType === 'over_under') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Bookmaker</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Over 2.5</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">Under 2.5</th>
              </tr>
            </thead>
            <tbody>
              {odds.map((odd) => (
                <tr key={odd.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{odd.bookmaker?.logo}</span>
                      <span className="text-white font-medium">{odd.bookmaker?.display_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-white font-bold">{formatOdds(odd.over_odds || 0)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-white font-bold">{formatOdds(odd.under_odds || 0)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    if (matchType === 'btts') {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left py-3 px-4 text-gray-400 font-medium">Bookmaker</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">BTTS Yes</th>
                <th className="text-center py-3 px-4 text-gray-400 font-medium">BTTS No</th>
              </tr>
            </thead>
            <tbody>
              {odds.map((odd) => (
                <tr key={odd.id} className="border-b border-white/10 hover:bg-white/5">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{odd.bookmaker?.logo}</span>
                      <span className="text-white font-medium">{odd.bookmaker?.display_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-white font-bold">{formatOdds(odd.btts_yes_odds || 0)}</span>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="text-white font-bold">{formatOdds(odd.btts_no_odds || 0)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }

    return (
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-white/10">
              <th className="text-left py-3 px-4 text-gray-400 font-medium">Bookmaker</th>
              <th className="text-center py-3 px-4 text-gray-400 font-medium">Home</th>
              <th className="text-center py-3 px-4 text-gray-400 font-medium">Draw</th>
              <th className="text-center py-3 px-4 text-gray-400 font-medium">Away</th>
            </tr>
          </thead>
          <tbody>
            {odds.map((odd) => {
              const isHomeBest = odd.home_odds === bestHome;
              const isDrawBest = odd.draw_odds === bestDraw;
              const isAwayBest = odd.away_odds === bestAway;

              return (
                <tr key={odd.id} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                  <td className="py-3 px-4">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{odd.bookmaker?.logo}</span>
                      <span className="text-white font-medium">{odd.bookmaker?.display_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      <span className={`font-bold ${isHomeBest ? 'text-emerald-400' : 'text-white'}`}>
                        {formatOdds(odd.home_odds)}
                      </span>
                      {isHomeBest && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      <span className={`font-bold ${isDrawBest ? 'text-emerald-400' : 'text-white'}`}>
                        {formatOdds(odd.draw_odds || 0)}
                      </span>
                      {isDrawBest && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    </div>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <div className="inline-flex items-center gap-2">
                      <span className={`font-bold ${isAwayBest ? 'text-emerald-400' : 'text-white'}`}>
                        {formatOdds(odd.away_odds)}
                      </span>
                      {isAwayBest && <TrendingUp className="w-4 h-4 text-emerald-400" />}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <GlassCard className="p-6" hover={false}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-bold text-white">Odds Comparison</h3>
        <Badge className="bg-purple-500/10 text-purple-400 border-purple-500/20">
          {odds.length} Bookmakers
        </Badge>
      </div>
      {renderMarketOdds()}
      <div className="mt-4 text-xs text-gray-500">
        <TrendingUp className="w-3 h-3 inline mr-1 text-emerald-400" />
        Best odds highlighted in green
      </div>
    </GlassCard>
  );
}
