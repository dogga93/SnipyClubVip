type SideTriplet = {
  home: number;
  draw: number;
  away: number;
};

type Props = {
  homeTeam: string;
  awayTeam: string;
  publicML: SideTriplet;
  cashAll?: SideTriplet;
  cashAmount?: SideTriplet;
  compact?: boolean;
};

const clamp = (value: number) => Math.max(0, Math.min(100, Number.isFinite(value) ? value : 0));
const pct = (value: number) => `${clamp(value).toFixed(1)}%`;
const formatMoney = (value: number) => `$${Math.max(0, value).toLocaleString("en-US", { maximumFractionDigits: 0 })}`;

const estimatedFromPct = (value: number, bankroll = 10000) => Math.round((clamp(value) / 100) * bankroll);

const Bar = ({ values, colors }: { values: SideTriplet; colors: [string, string, string] }) => (
  <div className="h-2.5 rounded overflow-hidden flex graph-animated">
    <div className={colors[0]} style={{ width: `${clamp(values.home)}%` }} />
    <div className={colors[1]} style={{ width: `${clamp(values.draw)}%` }} />
    <div className={colors[2]} style={{ width: `${clamp(values.away)}%` }} />
  </div>
);

export default function PublicMoneyGraph({
  homeTeam,
  awayTeam,
  publicML,
  cashAll,
  cashAmount,
  compact = false,
}: Props) {
  const amounts = {
    home: cashAmount?.home && cashAmount.home > 0 ? cashAmount.home : estimatedFromPct(cashAll?.home ?? publicML.home),
    draw: cashAmount?.draw && cashAmount.draw > 0 ? cashAmount.draw : estimatedFromPct(cashAll?.draw ?? publicML.draw),
    away: cashAmount?.away && cashAmount.away > 0 ? cashAmount.away : estimatedFromPct(cashAll?.away ?? publicML.away),
  };

  return (
    <div className={`rounded-xl border border-cyan-500/25 bg-[#102446] ${compact ? "p-3" : "p-4"}`}>
      <div className="text-xs uppercase tracking-wide text-cyan-200 font-bold mb-2">Public % + Money</div>

      <div className="text-[11px] text-gray-300 mb-1">Public ML</div>
      <Bar values={publicML} colors={["bg-blue-500", "bg-slate-400", "bg-pink-500"]} />
      <div className="grid grid-cols-3 text-[11px] text-gray-300 mt-1">
        <span>H {pct(publicML.home)}</span>
        <span className="text-center">D {pct(publicML.draw)}</span>
        <span className="text-right">A {pct(publicML.away)}</span>
      </div>

      {cashAll && (
        <>
          <div className="text-[11px] text-gray-300 mt-2 mb-1">All Cash</div>
          <Bar values={cashAll} colors={["bg-emerald-500", "bg-yellow-400", "bg-rose-500"]} />
          <div className="grid grid-cols-3 text-[11px] text-gray-300 mt-1">
            <span>H {pct(cashAll.home)}</span>
            <span className="text-center">D {pct(cashAll.draw)}</span>
            <span className="text-right">A {pct(cashAll.away)}</span>
          </div>
        </>
      )}

      <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
        <div className="rounded border border-cyan-500/25 bg-cyan-500/10 px-2 py-1.5 text-cyan-100">
          <div className="font-semibold truncate">{homeTeam}</div>
          <div className="font-black">{formatMoney(amounts.home)}</div>
        </div>
        <div className="rounded border border-slate-500/25 bg-slate-500/10 px-2 py-1.5 text-slate-100 text-center">
          <div className="font-semibold">Draw</div>
          <div className="font-black">{formatMoney(amounts.draw)}</div>
        </div>
        <div className="rounded border border-pink-500/25 bg-pink-500/10 px-2 py-1.5 text-pink-100 text-right sm:text-left">
          <div className="font-semibold truncate">{awayTeam}</div>
          <div className="font-black">{formatMoney(amounts.away)}</div>
        </div>
      </div>
    </div>
  );
}
