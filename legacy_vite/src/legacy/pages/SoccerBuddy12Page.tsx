import { useEffect, useMemo, useState } from "react";
import * as XLSX from "xlsx";
import TeamNameWithLogo from "../../components/TeamNameWithLogo";
import LeagueNameWithLogo from "../../components/LeagueNameWithLogo";
import PowerRankingBadge from "../../components/PowerRankingBadge";
import { useZCode } from "../../store/zcodeStore";

type SheetTable = {
  name: string;
  headers: string[];
  rows: string[][];
};

type RowRecord = Record<string, string>;

const FILE_URL = "/monitors/soccerbuddy_SOCCER-13.xlsx";

const toText = (value: unknown) => String(value ?? "").replace(/\u00a0/g, " ").trim();
const toPct = (value: string) => {
  const numeric = Number(String(value || "").replace("%", "").replace(",", ".").trim());
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
};
const splitGame = (game: string) => {
  for (const sep of [" vs ", " v ", " - ", " @ ", " — ", " – "]) {
    if (game.includes(sep)) {
      const [home, away] = game.split(sep).map((part) => part.trim());
      if (home && away) return { home, away };
    }
  }
  return null;
};

export default function SoccerBuddy12Page() {
  const { getTeamPowerRanking } = useZCode();
  const [tables, setTables] = useState<SheetTable[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const loadWorkbook = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(FILE_URL);
        if (!response.ok) throw new Error("Unable to load soccerbuddy_SOCCER-12.xlsx");

        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

        const parsed: SheetTable[] = workbook.SheetNames.map((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
          const headers = (matrix[0] ?? []).map((cell) => toText(cell));
          const rows = matrix
            .slice(1)
            .map((row) => row.map((cell) => toText(cell)))
            .filter((row) => row.some((cell) => cell));
          return { name: sheetName, headers, rows };
        });

        if (!cancelled) {
          setTables(parsed);
          setActiveSheet(parsed[0]?.name ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load workbook.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadWorkbook();
    return () => {
      cancelled = true;
    };
  }, []);

  const activeTable = useMemo(
    () => tables.find((table) => table.name === activeSheet) ?? tables[0],
    [tables, activeSheet]
  );

  const rowsAsObjects = useMemo(() => {
    if (!activeTable) return [] as RowRecord[];
    return activeTable.rows.map((row) => {
      const record: RowRecord = {};
      activeTable.headers.forEach((header, index) => {
        record[header || `Column ${index + 1}`] = row[index] || "";
      });
      return record;
    });
  }, [activeTable]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rowsAsObjects;
    return rowsAsObjects.filter((row) =>
      Object.values(row)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [rowsAsObjects, search]);

  const isMain = (activeTable?.name || "").toLowerCase().includes("main game list");

  const totalRows = useMemo(() => tables.reduce((sum, table) => sum + table.rows.length, 0), [tables]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
        <div className="rounded-2xl web3-panel p-6 mb-6 web3-float">
          <div className="text-sm text-cyan-200 mb-1">SoccerBuddy Center</div>
          <h1 className="text-3xl lg:text-4xl font-black mb-2 vivid-title">soccerbuddy_SOCCER-13 Window</h1>
          <p className="text-gray-300">Modern organized display for all tables and signals from SoccerBuddy 13.</p>
        </div>

        {!loading && !error && tables.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl web3-card p-4 match-reveal">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Tables</div>
              <div className="text-2xl font-black text-cyan-200">{tables.length}</div>
            </div>
            <div className="rounded-xl web3-card p-4 match-reveal" style={{ animationDelay: "50ms" }}>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Total Rows</div>
              <div className="text-2xl font-black text-white">{totalRows}</div>
            </div>
            <div className="rounded-xl web3-card p-4 match-reveal" style={{ animationDelay: "100ms" }}>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Current Table</div>
              <div className="text-base font-black text-indigo-200">{activeTable?.name || "-"}</div>
            </div>
            <div className="rounded-xl web3-card p-4 match-reveal" style={{ animationDelay: "150ms" }}>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Visible Rows</div>
              <div className="text-2xl font-black text-emerald-300">{filtered.length}</div>
            </div>
          </div>
        )}

        {loading && <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-200">Loading workbook...</div>}
        {error && !loading && <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-6 text-rose-200">{error}</div>}

        {!loading && !error && tables.length > 0 && (
          <>
            <div className="rounded-2xl web3-card p-4 mb-4">
              <div className="flex flex-wrap gap-2 mb-3">
                {tables.map((table) => (
                  <button
                    key={table.name}
                    type="button"
                    onClick={() => setActiveSheet(table.name)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                      activeTable?.name === table.name
                        ? "bg-cyan-500/25 border border-cyan-300/45 text-white"
                        : "bg-white/5 border border-white/10 text-gray-300 hover:text-white"
                    }`}
                  >
                    {table.name}
                  </button>
                ))}
              </div>

              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search league, game, score, trend..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            {isMain ? (
              <div className="grid gap-4">
                {filtered.map((row, idx) => {
                  const date = row["Date"] || "-";
                  const league = row["League"] || "League";
                  const game = row["Game"] || "-";
                  const lines = row["Lines"] || "-";
                  const hotTrends = row["Hot Trends"] || "-";
                  const drawPct = toPct(row["Draw %"] || "0");
                  const over15 = toPct(row["Over 1.5 goals %"] || "0");
                  const over25 = toPct(row["Over 2.5 goals %"] || "0");
                  const btts = toPct(row["BTTS %"] || "0");
                  const totalPred = row["Total Score Prediction"] || "-";
                  const firstHalfPred = row["1st Half Score Prediction"] || "-";
                  const firstHalfScore = row["1st Half Score"] || "-";
                  const totalScore = row["Total Score"] || "-";
                  const teams = splitGame(game);

                  return (
                    <div
                      key={`${game}-${idx}`}
                      className="rounded-2xl web3-card p-4 sm:p-5 border border-cyan-500/25 match-reveal"
                      style={{ animationDelay: `${Math.min(idx * 30, 300)}ms` }}
                    >
                      <div className="flex flex-wrap justify-between gap-2 mb-3">
                        <div className="text-xs text-cyan-200 font-bold">{date}</div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-cyan-100">
                          <LeagueNameWithLogo leagueName={league} logoSizeClassName="w-6 h-6" />
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
                        <div>
                          {teams ? (
                            <>
                              <div className="team-letters text-lg sm:text-xl font-black text-white">
                                <TeamNameWithLogo teamName={teams.home} textClassName="text-white" logoSizeClassName="w-6 h-6" />
                              </div>
                              <div className="mt-1">
                                <PowerRankingBadge ranking={getTeamPowerRanking(teams.home)} compact />
                              </div>
                              <div className="mt-1 team-letters text-lg sm:text-xl font-black text-white">
                                <TeamNameWithLogo teamName={teams.away} textClassName="text-white" logoSizeClassName="w-6 h-6" />
                              </div>
                              <div className="mt-1">
                                <PowerRankingBadge ranking={getTeamPowerRanking(teams.away)} compact />
                              </div>
                            </>
                          ) : (
                            <div className="team-letters text-lg sm:text-xl font-black text-white">{game}</div>
                          )}

                          <div className="mt-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-indigo-200 mb-1">Scores</div>
                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="rounded border border-cyan-500/25 bg-cyan-500/10 px-2 py-1.5 text-cyan-100">
                                Predicted: <span className="font-black">{totalPred}</span>
                              </div>
                              <div className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-emerald-100">
                                Final: <span className="font-black">{totalScore || "Pending"}</span>
                              </div>
                              <div className="rounded border border-violet-500/25 bg-violet-500/10 px-2 py-1.5 text-violet-100 col-span-2">
                                1H Pred: <span className="font-black">{firstHalfPred}</span> | 1H Score: <span className="font-black">{firstHalfScore || "-"}</span>
                              </div>
                            </div>
                          </div>

                          <div className="mt-3 text-xs text-gray-300">Lines: <span className="text-cyan-200">{lines}</span></div>
                          {hotTrends && hotTrends !== "-" && (
                            <div className="mt-2 rounded border border-amber-500/30 bg-amber-500/10 px-2 py-1.5 text-xs text-amber-200">
                              🔥 {hotTrends}
                            </div>
                          )}
                        </div>

                        <div className="rounded-xl border border-white/15 bg-[#102446] p-3">
                          <div className="text-xs uppercase tracking-wide text-gray-300 mb-2">Percentages</div>

                          <div className="space-y-2 text-xs">
                            <div>
                              <div className="flex justify-between"><span className="text-gray-300">Draw %</span><span className="text-cyan-200 font-bold">{drawPct.toFixed(1)}%</span></div>
                              <div className="h-2 rounded bg-[#1a2f55] overflow-hidden graph-animated"><div className="h-full bg-cyan-400" style={{ width: `${drawPct}%` }} /></div>
                            </div>
                            <div>
                              <div className="flex justify-between"><span className="text-gray-300">Over 1.5</span><span className="text-emerald-200 font-bold">{over15.toFixed(1)}%</span></div>
                              <div className="h-2 rounded bg-[#1a2f55] overflow-hidden graph-animated"><div className="h-full bg-emerald-400" style={{ width: `${over15}%` }} /></div>
                            </div>
                            <div>
                              <div className="flex justify-between"><span className="text-gray-300">Over 2.5</span><span className="text-amber-200 font-bold">{over25.toFixed(1)}%</span></div>
                              <div className="h-2 rounded bg-[#1a2f55] overflow-hidden graph-animated"><div className="h-full bg-amber-400" style={{ width: `${over25}%` }} /></div>
                            </div>
                            <div>
                              <div className="flex justify-between"><span className="text-gray-300">BTTS</span><span className="text-indigo-200 font-bold">{btts.toFixed(1)}%</span></div>
                              <div className="h-2 rounded bg-[#1a2f55] overflow-hidden graph-animated"><div className="h-full bg-indigo-400" style={{ width: `${btts}%` }} /></div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-4">
                {filtered.map((row, idx) => {
                  const date = row["Date"] || "-";
                  const league = row["League"] || "League";
                  const game = row["Game"] || "-";
                  const fields = Object.entries(row).filter(([, value]) => value && value !== "-");
                  return (
                    <div
                      key={`${game}-${idx}`}
                      className="rounded-2xl web3-card p-4 border border-cyan-500/20 match-reveal"
                      style={{ animationDelay: `${Math.min(idx * 25, 220)}ms` }}
                    >
                      <div className="flex flex-wrap justify-between gap-2 mb-3">
                        <div className="text-xs text-cyan-200 font-bold">{date}</div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-cyan-100">
                          <LeagueNameWithLogo leagueName={league} logoSizeClassName="w-6 h-6" />
                        </div>
                      </div>

                      <div className="team-letters text-lg font-black text-white mb-3">{game}</div>

                      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
                        {fields.map(([key, value]) => (
                          <div key={`${key}-${value}`} className="rounded border border-white/10 bg-white/5 px-2 py-1.5 text-xs text-gray-200">
                            <span className="text-cyan-200 font-bold">{key}: </span>
                            <span className="whitespace-pre-line">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
