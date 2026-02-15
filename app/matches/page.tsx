import Link from 'next/link';
import { listMatchesWithTopAnalysis } from '@/lib/db/queries';
import { VerdictBadge } from '@/app/components/VerdictBadge';

const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(d);

export const dynamic = 'force-dynamic';

export default async function MatchesPage() {
  try {
    const matches = await listMatchesWithTopAnalysis({ limit: 150 });

    return (
      <section className="space-y-4">
        <div className="panel">
          <h2 className="text-xl font-bold">Match Card Analytique</h2>
          <p className="text-sm text-slate-400">
            Donnees depuis Game Monitor + calculs SharpScore / TrapRisk en base.
          </p>
        </div>

        <div className="panel overflow-x-auto p-0">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-900">
              <tr className="text-left text-slate-300">
                <th className="px-3 py-2">Kickoff</th>
                <th className="px-3 py-2">League</th>
                <th className="px-3 py-2">Match</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Verdict</th>
                <th className="px-3 py-2">Sharp</th>
                <th className="px-3 py-2">Trap</th>
              </tr>
            </thead>
            <tbody>
              {matches.map((row) => (
                <tr key={row.id} className="border-t border-slate-800 hover:bg-slate-800/40">
                  <td className="px-3 py-2">{fmtDate(row.startTime)}</td>
                  <td className="px-3 py-2">{row.league}</td>
                  <td className="px-3 py-2 font-semibold text-white">
                    <Link className="hover:text-cyan-300" href={`/match/${row.id}`}>
                      {row.homeTeam} vs {row.awayTeam}
                    </Link>
                  </td>
                  <td className="px-3 py-2">{row.status}</td>
                  <td className="px-3 py-2">
                    {row.latestAnalysis ? <VerdictBadge verdict={row.latestAnalysis.verdict} /> : <span className="text-slate-500">N/A</span>}
                  </td>
                  <td className="px-3 py-2">{row.latestAnalysis?.sharpScore ?? '-'}</td>
                  <td className="px-3 py-2">{row.latestAnalysis?.trapRisk ?? '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {matches.length === 0 ? (
            <div className="p-5 text-sm text-slate-400">Aucun match en base. Lance l'import Game Monitor.</div>
          ) : null}
        </div>
      </section>
    );
  } catch (error) {
    return (
      <section className="space-y-4">
        <div className="panel">
          <h2 className="text-xl font-bold">Match Card Analytique</h2>
          <p className="text-sm text-rose-300">
            Impossible de charger les matchs: {error instanceof Error ? error.message : 'Unknown error'}
          </p>
        </div>
      </section>
    );
  }
}
