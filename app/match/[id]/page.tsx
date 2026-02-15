import { notFound } from 'next/navigation';
import { DashboardCard } from '@/app/components/DashboardCard';
import { VerdictBadge } from '@/app/components/VerdictBadge';
import { getMatchLatestDetails } from '@/lib/db/queries';

export const dynamic = 'force-dynamic';

const pct = (v: number | null | undefined) => (v == null ? '-' : `${v.toFixed(1)}%`);
const dec = (v: number | null | undefined, digits = 2) => (v == null ? '-' : v.toFixed(digits));

const bar = (value: number | null | undefined, color: string) => {
  const v = Math.max(0, Math.min(100, value ?? 0));
  return (
    <div className="h-2 w-full rounded bg-slate-800">
      <div className={`h-2 rounded ${color}`} style={{ width: `${v}%` }} />
    </div>
  );
};

export default async function MatchPage({ params }: { params: { id: string } }) {
  const data = await getMatchLatestDetails(params.id);
  if (!data) notFound();

  const top = data.topRecommendation;
  const home = data.analysisSnapshots.find((x) => x.marketType === 'ML' && x.side === 'HOME') ?? null;
  const draw = data.analysisSnapshots.find((x) => x.marketType === 'ML' && x.side === 'DRAW') ?? null;
  const away = data.analysisSnapshots.find((x) => x.marketType === 'ML' && x.side === 'AWAY') ?? null;

  const oddsHome = data.marketSnapshots.find((x) => x.marketType === 'ML' && x.side === 'HOME');
  const oddsDraw = data.marketSnapshots.find((x) => x.marketType === 'ML' && x.side === 'DRAW');
  const oddsAway = data.marketSnapshots.find((x) => x.marketType === 'ML' && x.side === 'AWAY');

  const pcHome = data.publicCashSnapshots.find((x) => x.marketType === 'ML' && x.side === 'HOME');
  const pcDraw = data.publicCashSnapshots.find((x) => x.marketType === 'ML' && x.side === 'DRAW');
  const pcAway = data.publicCashSnapshots.find((x) => x.marketType === 'ML' && x.side === 'AWAY');

  const reasons = (top?.reasons as string[] | undefined) ?? [];

  return (
    <section className="space-y-4">
      <div className="panel">
        <p className="text-xs uppercase tracking-wide text-cyan-300">{data.match.league}</p>
        <h2 className="text-2xl font-black text-white">
          {data.match.homeTeam} vs {data.match.awayTeam}
        </h2>
        <p className="text-sm text-slate-400">Status: {data.match.status}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-4">
          <DashboardCard title="MATCH & TEAMS">
            <div className="space-y-2 text-sm">
              <div className="font-bold text-lg text-white">{data.match.homeTeam}</div>
              <div className="text-slate-400">Home</div>
              <div className="font-bold text-lg text-white">{data.match.awayTeam}</div>
              <div className="text-slate-400">Away</div>
            </div>
          </DashboardCard>

          <DashboardCard title="MONITOR DATA">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded border border-cyan-500/30 p-2">Score model: {reasons.find((r) => r.toLowerCase().includes('predicted score')) ?? '-'}</div>
              <div className="rounded border border-indigo-500/30 p-2">Status: {data.match.status}</div>
              <div className="col-span-2 rounded border border-rose-500/30 p-2">Signal: {reasons.find((r) => r.toLowerCase().includes('signal')) ?? '-'}</div>
            </div>
          </DashboardCard>

          <DashboardCard title="AI Brain">
            <p className="text-sm text-slate-300">
              Following model consensus and imported monitor data, confidence and score projection were generated from probabilities and market signals.
            </p>
          </DashboardCard>

          <DashboardCard title="Basis for prediction">
            <ul className="list-disc pl-4 text-sm text-slate-200 space-y-1">
              {reasons.length ? reasons.map((r, i) => <li key={i}>{r}</li>) : <li>No reasons yet.</li>}
            </ul>
          </DashboardCard>
        </div>

        <div className="space-y-4">
          <DashboardCard title="RESULT">
            <div className="text-4xl font-black text-cyan-200">{top ? `${Math.round(top.modelProb * 100)}%` : '-'}</div>
            <div className="mt-2">{top ? <VerdictBadge verdict={top.verdict} /> : <span className="text-slate-400">NO DATA</span>}</div>
          </DashboardCard>

          <DashboardCard title="Expected Score">
            <div className="text-3xl font-black text-white">
              {reasons.find((r) => r.toLowerCase().includes('predicted score'))?.replace('Predicted score: ', '') ?? '-'}
            </div>
          </DashboardCard>

          <DashboardCard title="O/U, BTTS, Trust">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="rounded border border-cyan-500/30 p-2">O/U: N/A</div>
              <div className="rounded border border-cyan-500/30 p-2">BTTS: N/A</div>
              <div className="col-span-2 rounded border border-emerald-500/30 p-2">Trust: {top ? `${Math.round(top.modelProb * 100)}%` : '-'}</div>
            </div>
          </DashboardCard>

          <DashboardCard title="Cash & Ratios">
            <div className="space-y-1 text-sm">
              <div>Cash Home: {pct(pcHome?.cashPercent)}</div>
              <div>Cash Draw: {pct(pcDraw?.cashPercent)}</div>
              <div>Cash Away: {pct(pcAway?.cashPercent)}</div>
              <div className="text-slate-400">Public H/D/A: {pct(pcHome?.publicPercent)} / {pct(pcDraw?.publicPercent)} / {pct(pcAway?.publicPercent)}</div>
            </div>
          </DashboardCard>
        </div>

        <div className="space-y-4">
          <DashboardCard title="PREDICTION">
            <div className="text-2xl font-black text-white">Recommended {top?.side ?? '-'}</div>
            <div className="mt-2">{top ? <VerdictBadge verdict={top.verdict} /> : null}</div>
            <div className="mt-3 text-sm text-slate-300">Fair odds: {dec(top?.fairOdds, 3)} | Edge: {top ? `${(top.edge * 100).toFixed(2)}%` : '-'}</div>
          </DashboardCard>

          <DashboardCard title="Handicap Pattern">
            <div className="space-y-2 text-sm">
              <div>Home handicap: {pct(home ? home.modelProb * 100 : null)}</div>
              {bar(home ? home.modelProb * 100 : null, 'bg-yellow-400')}
              <div>Away handicap: {pct(away ? away.modelProb * 100 : null)}</div>
              {bar(away ? away.modelProb * 100 : null, 'bg-fuchsia-400')}
            </div>
          </DashboardCard>

          <DashboardCard title="Probabilities">
            <div className="space-y-2 text-sm">
              <div>H {pct(home ? home.modelProb * 100 : null)} / D {pct(draw ? draw.modelProb * 100 : null)} / A {pct(away ? away.modelProb * 100 : null)}</div>
              {bar(home ? home.modelProb * 100 : null, 'bg-sky-400')}
              {bar(draw ? draw.modelProb * 100 : null, 'bg-slate-300')}
              {bar(away ? away.modelProb * 100 : null, 'bg-pink-400')}
            </div>
          </DashboardCard>

          <DashboardCard title="Public vs Cash">
            <div className="space-y-1 text-sm">
              <div>Public ML: H {pct(pcHome?.publicPercent)} / D {pct(pcDraw?.publicPercent)} / A {pct(pcAway?.publicPercent)}</div>
              {bar(pcHome?.publicPercent, 'bg-blue-400')}
              <div>All Cash: H {pct(pcHome?.cashPercent)} / D {pct(pcDraw?.cashPercent)} / A {pct(pcAway?.cashPercent)}</div>
              {bar(pcAway?.cashPercent, 'bg-emerald-400')}
            </div>
          </DashboardCard>

          <DashboardCard title="Public % + Money">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded border border-cyan-500/30 p-2 text-center">{data.match.homeTeam}<br />{pct(pcHome?.publicPercent)}</div>
              <div className="rounded border border-cyan-500/30 p-2 text-center">Draw<br />{pct(pcDraw?.publicPercent)}</div>
              <div className="rounded border border-cyan-500/30 p-2 text-center">{data.match.awayTeam}<br />{pct(pcAway?.publicPercent)}</div>
            </div>
          </DashboardCard>

          <DashboardCard title="Odds markets (1X2)">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="rounded border border-emerald-500/30 p-2 text-center">Home<br />{dec(oddsHome?.currentOdds)}</div>
              <div className="rounded border border-slate-400/30 p-2 text-center">Draw<br />{dec(oddsDraw?.currentOdds)}</div>
              <div className="rounded border border-cyan-500/30 p-2 text-center">Away<br />{dec(oddsAway?.currentOdds)}</div>
            </div>
          </DashboardCard>
        </div>
      </div>
    </section>
  );
}
