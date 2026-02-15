import type { Verdict } from '@prisma/client';

const styleByVerdict: Record<Verdict, string> = {
  NO_BET: 'bg-slate-700/70 text-slate-200 border border-slate-600',
  LEAN: 'bg-cyan-500/20 text-cyan-200 border border-cyan-400/50',
  VALUE: 'bg-emerald-500/20 text-emerald-200 border border-emerald-400/50',
  STRONG_VALUE: 'bg-green-500/20 text-green-200 border border-green-400/60',
  TRAP_WARNING: 'bg-rose-500/20 text-rose-200 border border-rose-400/60'
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return <span className={`badge ${styleByVerdict[verdict]}`}>{verdict.split('_').join(' ')}</span>;
}
