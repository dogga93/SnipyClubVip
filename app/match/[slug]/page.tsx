'use client';

import * as React from 'react';
import Link from 'next/link';
import { use } from 'react';
import { ArrowLeft } from 'lucide-react';
import { GlassPanel } from '@/components/ui/glass-panel';
import { SectionHeader } from '@/components/ui/section-header';
import { MiniBadge } from '@/components/ui/mini-badge';
import { parsePercent, parseScore, toMonitorSlug } from '@/lib/monitor/merge';
import type { MonitorMatch, MonitorPayload } from '@/lib/monitor/types';

type PageProps = {
  params: Promise<{ slug: string }>;
};

type MatchView = {
  slug: string;
  league: string;
  homeTeam: string;
  awayTeam: string;
  status: string;
  sport: string;
  date: string;
  confidence: number;
  homeProb: number;
  drawProb: number;
  awayProb: number;
  publicHome: number;
  publicDraw: number;
  publicAway: number;
  allPublicHome: number;
  allPublicDraw: number;
  allPublicAway: number;
  cashHomePct: number;
  cashDrawPct: number;
  cashAwayPct: number;
  cashHomeAmount: string;
  cashDrawAmount: string;
  cashAwayAmount: string;
  homeOdds: string;
  drawOdds: string;
  awayOdds: string;
  predicted1H: string;
  predictedFT: string;
  realScore: string;
  btts: number;
  over25: number;
  trust: number;
  recommendation: string;
  strategy: string;
  alert: string;
};

const clampPct = (value: number) => Math.max(0, Math.min(100, value));

const normalizeView = (match: MonitorMatch): MatchView => {
  const homeProb = parsePercent(match.probability1 || match.publicMl1);
  const drawProb = parsePercent(match.probabilityDraw || match.publicMlDraw);
  const awayProb = parsePercent(match.probability2 || match.publicMl2);

  const publicHome = parsePercent(match.publicMl1 || match.probability1);
  const publicDraw = parsePercent(match.publicMlDraw || match.probabilityDraw);
  const publicAway = parsePercent(match.publicMl2 || match.probability2);

  const allPublicHome = parsePercent(match.allPublicPct1);
  const allPublicDraw = parsePercent(match.allPublicPctDraw);
  const allPublicAway = parsePercent(match.allPublicPct2);

  const cashHomePct = parsePercent(match.allCashPct1);
  const cashDrawPct = parsePercent(match.allCashPctDraw);
  const cashAwayPct = parsePercent(match.allCashPct2);

  const confidence = clampPct(parsePercent(match.confidence));
  const over25 = Math.max(0, Math.min(100, parsePercent(match.otherPredictions?.match(/Over\s*2\.5\s*(\d+(?:\.\d+)?)/i)?.[1])));
  const btts = Math.max(0, Math.min(100, parsePercent(match.otherPredictions?.match(/BTTS\s*(\d+(?:\.\d+)?)/i)?.[1])));

  return {
    slug: match.slug || toMonitorSlug(match),
    league: match.league,
    homeTeam: match.homeTeam,
    awayTeam: match.awayTeam,
    status: match.status || 'Scheduled match',
    sport: match.sport || 'SOCCER',
    date: match.date,
    confidence,
    homeProb,
    drawProb,
    awayProb,
    publicHome,
    publicDraw,
    publicAway,
    allPublicHome,
    allPublicDraw,
    allPublicAway,
    cashHomePct,
    cashDrawPct,
    cashAwayPct,
    cashHomeAmount: match.allCashTeam1 || '-',
    cashDrawAmount: match.allCashDraw || '-',
    cashAwayAmount: match.allCashTeam2 || '-',
    homeOdds: match.ml1 || '-',
    drawOdds: match.mlDraw || '-',
    awayOdds: match.ml2 || '-',
    predicted1H: match.predictedScore1 || '0:0',
    predictedFT: `${match.predictedScore1 || '0'}:${match.predictedScore2 || '0'}`,
    realScore: match.realScore || '-',
    btts: btts || Math.max(35, awayProb),
    over25: over25 || Math.max(40, homeProb),
    trust: clampPct(homeProb || confidence),
    recommendation: `Recommended ${match.homeTeam} ML`,
    strategy: 'Strategy: Monitor best odd',
    alert: `alerte trap vegas (cash ${cashHomePct || 100}% sur Home (${match.homeTeam})).`
  };
};

const pctBar = (h: number, d: number, a: number) => {
  const total = h + d + a;
  if (total <= 0) return { h: 33.3, d: 33.3, a: 33.4 };
  return {
    h: (h / total) * 100,
    d: (d / total) * 100,
    a: (a / total) * 100
  };
};

function TripleBar({ h, d, a }: { h: number; d: number; a: number }) {
  const widths = pctBar(h, d, a);
  return (
    <div className="space-y-1.5">
      <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-800">
        <div className="flex h-full w-full">
          <div className="bg-sky-400" style={{ width: `${widths.h}%` }} />
          <div className="bg-slate-300" style={{ width: `${widths.d}%` }} />
          <div className="bg-fuchsia-500" style={{ width: `${widths.a}%` }} />
        </div>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-300">
        <span>H {h.toFixed(1)}%</span>
        <span>D {d.toFixed(1)}%</span>
        <span>A {a.toFixed(1)}%</span>
      </div>
    </div>
  );
}

export default function MatchPage({ params }: PageProps) {
  const resolved = use(params);

  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [view, setView] = React.useState<MatchView | null>(null);

  React.useEffect(() => {
    void loadMatch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolved.slug]);

  async function loadMatch() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/monitor/current', { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const payload = (await res.json()) as MonitorPayload;
      const matches = Array.isArray(payload.matches) ? payload.matches : [];

      const found =
        matches.find((m) => (m.slug || toMonitorSlug(m)).toLowerCase() === resolved.slug.toLowerCase()) ||
        matches.find((m) => m.id.toLowerCase() === resolved.slug.toLowerCase());

      if (!found) {
        throw new Error('Match not found in monitor data');
      }

      setView(normalizeView(found));
    } catch (err) {
      console.error('[match] load failed', err);
      setError(err instanceof Error ? err.message : 'failed');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="mx-auto max-w-[1320px] px-5 py-6">
        <GlassPanel>
          <p className="text-sm text-slate-300">Loading match monitor...</p>
        </GlassPanel>
      </div>
    );
  }

  if (error || !view) {
    return (
      <div className="mx-auto max-w-[1320px] px-5 py-6">
        <GlassPanel className="space-y-3">
          <p className="text-sm text-rose-300">Unable to load match: {error || 'Unknown error'}</p>
          <Link href="/browse" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
            <ArrowLeft className="h-4 w-4" /> Back to browse
          </Link>
        </GlassPanel>
      </div>
    );
  }

  const expected = parseScore(view.predictedFT);

  return (
    <div className="mx-auto max-w-[1320px] px-5 py-5">
      <div className="mb-4 flex items-center gap-3">
        <Link href="/browse" className="inline-flex items-center gap-2 text-sm text-cyan-300 hover:text-cyan-200">
          <ArrowLeft className="h-4 w-4" /> Back to Browse
        </Link>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <GlassPanel className="space-y-3">
            <SectionHeader title="Match & Teams" />
            <div>
              <p className="text-base font-semibold text-cyan-300">🏆 {view.league}</p>
              <p className="text-xs text-amber-200">{view.status}</p>
            </div>
            <div className="space-y-2">
              <div>
                <p className="text-4xl font-bold text-white">{view.homeTeam}</p>
                <p className="text-sm text-emerald-300">Home</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-white">{view.awayTeam}</p>
                <p className="text-sm text-rose-300">Away</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="Monitor Data" />
            <p className="text-sm text-slate-200">Score: {view.realScore}</p>
            <p className="text-sm text-slate-200">Probabilities: H {view.homeProb}% | D {view.drawProb}% | A {view.awayProb}%</p>
            <p className="text-sm text-slate-200">Public ML: H {view.publicHome}% | D {view.publicDraw}% | A {view.publicAway}%</p>
            <div className="rounded-lg border border-rose-500/40 bg-rose-500/10 px-2 py-1.5 text-xs text-rose-200">{view.alert}</div>
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="AI Brain" />
            <p className="text-sm leading-6 text-slate-200">
              Following model consensus and imported monitor data, confidence and score projection were generated from current probabilities and signals.
            </p>
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="Basis for Prediction" />
            <ul className="space-y-1 text-sm text-slate-200">
              <li>• 1st Half Score {view.predicted1H}</li>
              <li>• DRAW {view.drawProb.toFixed(0)}%</li>
              <li>• BTTS {view.btts.toFixed(1)}%</li>
              <li>• TOTAL {'>'} 2.5 Goals {view.over25.toFixed(1)}%</li>
            </ul>
          </GlassPanel>
        </div>

        <div className="space-y-4">
          <GlassPanel className="space-y-3">
            <SectionHeader title="Result" />
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-cyan-500/25 bg-slate-900/50 p-3 text-center">
                <p className="text-xs text-slate-400">Live score</p>
                <p className="text-3xl font-bold text-rose-300">{view.realScore}</p>
              </div>
              <div className="rounded-xl border border-cyan-500/25 bg-slate-900/50 p-3 text-center">
                <p className="text-xs text-slate-400">Expected score</p>
                <p className="text-3xl font-bold text-white">{expected ? `${expected.home}:${expected.away}` : view.predictedFT}</p>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="Expected Score" />
            <p className="text-base text-slate-200">1H: {view.predicted1H}</p>
            <p className="text-base text-slate-200">FT: {view.predictedFT}</p>
            <p className="text-base text-slate-200">Confidence: {view.confidence.toFixed(1)}%</p>
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="O/U, BTTS, Trust" />
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded-lg border border-cyan-500/25 bg-slate-900/50 p-2 text-slate-100">O/U {view.over25.toFixed(1)}%</div>
              <div className="rounded-lg border border-cyan-500/25 bg-slate-900/50 p-2 text-slate-100">BTTS {view.btts.toFixed(1)}%</div>
              <div className="rounded-lg border border-cyan-500/25 bg-slate-900/50 p-2 text-slate-100">Trust {view.trust.toFixed(1)}%</div>
              <div className="rounded-lg border border-cyan-500/25 bg-slate-900/50 p-2 text-slate-100">Strange -10.5</div>
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="Cash & Ratios" />
            <p className="text-sm text-slate-200">Cash Home: {view.cashHomeAmount}</p>
            <p className="text-sm text-slate-200">Cash Draw: {view.cashDrawAmount}</p>
            <p className="text-sm text-slate-200">Cash Away: {view.cashAwayAmount}</p>
            <p className="text-sm text-slate-300">Public ratio H/A: 0.00 / 0.00</p>
          </GlassPanel>
        </div>

        <div className="space-y-4">
          <GlassPanel className="space-y-3">
            <SectionHeader title="Prediction" />
            <div className="rounded-xl border border-cyan-500/40 bg-cyan-500/10 p-3 text-2xl font-bold text-cyan-100">{view.recommendation}</div>
            <div className="rounded-xl border border-blue-500/35 bg-blue-500/10 p-3 text-slate-100">{view.strategy}</div>
            <div className="rounded-xl border border-amber-500/35 bg-amber-500/10 p-3 text-slate-100">About 2.5 ({view.over25.toFixed(1)}%)</div>
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="Handicap Pattern" />
            <p className="text-sm text-slate-200">Home handicap {view.homeProb.toFixed(1)}%</p>
            <p className="text-sm text-slate-200">Away handicap {view.awayProb.toFixed(1)}%</p>
            <div className="rounded-xl border border-violet-500/35 bg-violet-500/10 px-3 py-2 text-center text-lg font-semibold text-violet-100">Very close ({Math.max(view.homeProb, view.awayProb).toFixed(0)}%)</div>
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="Probabilities" />
            <TripleBar h={view.homeProb} d={view.drawProb} a={view.awayProb} />
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="Public vs Cash" />
            <p className="text-xs uppercase text-slate-400">Public ML</p>
            <TripleBar h={view.publicHome} d={view.publicDraw} a={view.publicAway} />
            <p className="text-xs uppercase text-slate-400">All Public</p>
            <TripleBar h={view.allPublicHome} d={view.allPublicDraw} a={view.allPublicAway} />
            <p className="text-xs uppercase text-slate-400">All Cash</p>
            <TripleBar h={view.cashHomePct} d={view.cashDrawPct} a={view.cashAwayPct} />
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="Public % + Money" />
            <div className="grid grid-cols-3 gap-2 text-xs">
              <div className="rounded-lg border border-cyan-500/25 bg-slate-900/50 p-2 text-center text-slate-100">{view.homeTeam}<br />${view.cashHomeAmount}</div>
              <div className="rounded-lg border border-cyan-500/25 bg-slate-900/50 p-2 text-center text-slate-100">Draw<br />${view.cashDrawAmount}</div>
              <div className="rounded-lg border border-cyan-500/25 bg-slate-900/50 p-2 text-center text-slate-100">{view.awayTeam}<br />${view.cashAwayAmount}</div>
            </div>
          </GlassPanel>

          <GlassPanel className="space-y-2">
            <SectionHeader title="Odds Markets (Full time 1X2)" />
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg border border-cyan-500/30 bg-slate-900/60 p-2">
                <p className="text-xs text-slate-400">Home</p>
                <p className="text-2xl font-bold text-white">{view.homeOdds}</p>
              </div>
              <div className="rounded-lg border border-cyan-500/30 bg-slate-900/60 p-2">
                <p className="text-xs text-slate-400">Draw</p>
                <p className="text-2xl font-bold text-white">{view.drawOdds}</p>
              </div>
              <div className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-2">
                <p className="text-xs text-slate-200">Away</p>
                <p className="text-2xl font-bold text-emerald-200">{view.awayOdds}</p>
              </div>
            </div>
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
