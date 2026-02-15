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

const FILE_URL = "/monitors/predictions_SOCCER-11.xlsx";

const toText = (value: unknown) => String(value ?? "").replace(/\u00a0/g, " ").trim();
const displaySheetName = (name: string) => (name === "Kelly Value Bets" ? "SNIPY Value Bets" : name);
const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
const toPct = (value: string) => {
  const numeric = Number(value.replace("%", "").replace(",", ".").trim());
  if (!Number.isFinite(numeric)) return 0;
  return Math.max(0, Math.min(100, numeric));
};

export default function Predictions11Page() {
  const { getTeamPowerRanking } = useZCode();
  const [tables, setTables] = useState<SheetTable[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadWorkbook = async () => {
      setLoading(true);
      setError("");
      try {
        const response = await fetch(FILE_URL);
        if (!response.ok) {
          throw new Error("Unable to load predictions_SOCCER-11.xlsx");
        }

        const buffer = await response.arrayBuffer();
        const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

        const parsedTables: SheetTable[] = workbook.SheetNames.map((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
            header: 1,
            defval: "",
            raw: false,
          });

          const headers = (matrix[0] ?? []).map((cell) => toText(cell));
          const rows = matrix
            .slice(1)
            .map((row) => row.map((cell) => toText(cell)))
            .filter((row) => row.some((cell) => cell !== ""));

          return {
            name: sheetName,
            headers,
            rows,
          };
        });

        if (!cancelled) {
          setTables(parsedTables);
          setActiveSheet(parsedTables[0]?.name ?? "");
        }
      } catch (err) {
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Failed to load predictions file.";
          setError(message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
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
  const totalRows = useMemo(
    () => tables.reduce((sum, table) => sum + table.rows.length, 0),
    [tables]
  );
  const filteredRows = useMemo(() => {
    if (!activeTable) return [];
    const q = search.trim().toLowerCase();
    if (!q) return activeTable.rows;
    return activeTable.rows.filter((row) => row.some((cell) => cell.toLowerCase().includes(q)));
  }, [activeTable, search]);
  const sectionCount = useMemo(
    () =>
      filteredRows.filter((row) => row[0] && row.slice(1).every((cell) => !cell)).length,
    [filteredRows]
  );
  const finalScoreCount = useMemo(() => {
    if (!activeTable) return 0;
    const idx = activeTable.headers.findIndex((h) => h.toLowerCase().includes("final score"));
    if (idx < 0) return 0;
    return filteredRows.filter((row) => (row[idx] ?? "").trim() !== "").length;
  }, [activeTable, filteredRows]);
  const isMainGameList = (activeTable?.name || "").toLowerCase().includes("main game list");
  const mainGameCards = useMemo(() => {
    if (!activeTable || !isMainGameList) return [];
    const headers = activeTable.headers.map((header) => normalizeHeader(header));
    const col = (name: string) => headers.findIndex((header) => header === normalizeHeader(name));

    const dateCol = col("Date");
    const team1Col = col("Team 1");
    const odd1Col = col("Odd");
    const team2Col = headers.findIndex((header, index) => header === normalizeHeader("Team 2") && index > team1Col);
    const odd2Col = headers.findIndex((header, index) => header === normalizeHeader("Odd") && index > team2Col);
    const firstHalfPredCol = col("Score Prediction First Half");
    const finalPredCol = col("Score Prediction Final Score");
    const confidenceCol = col("Confidence");
    const p1Col = col("Betting predictions Team 1 Win");
    const drawCol = col("Betting predictions Draw");
    const p2Col = col("Betting predictions Team 2 Win");
    const firstHalfResultCol = col("First Half Result");
    const finalScoreCol = col("Final Score");

    let currentLeague = "";
    const cards: Array<{
      league: string;
      date: string;
      team1: string;
      odd1: string;
      team2: string;
      odd2: string;
      firstHalfPred: string;
      finalPred: string;
      confidence: string;
      p1: string;
      draw: string;
      p2: string;
      firstHalfResult: string;
      finalScore: string;
    }> = [];

    for (const row of activeTable.rows) {
      const isSectionRow = row[0] && row.slice(1).every((cell) => !cell);
      if (isSectionRow) {
        currentLeague = row[0];
        continue;
      }
      const team1 = (row[team1Col] ?? "").trim();
      const team2 = (row[team2Col] ?? "").trim();
      if (!team1 || !team2) continue;

      cards.push({
        league: currentLeague || "League",
        date: row[dateCol] || "-",
        team1,
        odd1: row[odd1Col] || "-",
        team2,
        odd2: row[odd2Col] || "-",
        firstHalfPred: row[firstHalfPredCol] || "-",
        finalPred: row[finalPredCol] || "-",
        confidence: row[confidenceCol] || "-",
        p1: row[p1Col] || "0%",
        draw: row[drawCol] || "0%",
        p2: row[p2Col] || "0%",
        firstHalfResult: row[firstHalfResultCol] || "-",
        finalScore: row[finalScoreCol] || "-",
      });
    }

    const q = search.trim().toLowerCase();
    if (!q) return cards;
    return cards.filter((card) =>
      [
        card.league,
        card.team1,
        card.team2,
        card.date,
        card.finalPred,
        card.finalScore,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [activeTable, isMainGameList, search]);

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
        <div className="rounded-2xl web3-panel p-6 mb-6 web3-float">
          <div className="text-sm text-cyan-200 mb-1">Predictions Center</div>
          <h1 className="text-3xl lg:text-4xl font-black mb-2 vivid-title">predictions_SOCCER-11 Window</h1>
          <p className="text-gray-300">Modern analytics view with full workbook data across all 4 tables.</p>
        </div>

        {!loading && !error && tables.length > 0 && (
          <div className="grid md:grid-cols-4 gap-4 mb-6">
            <div className="rounded-xl web3-card p-4 match-reveal">
              <div className="text-xs text-gray-400 uppercase tracking-wide">Sheets</div>
              <div className="text-2xl font-black text-cyan-200">{tables.length}</div>
            </div>
            <div className="rounded-xl web3-card p-4 match-reveal" style={{ animationDelay: "50ms" }}>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Total Rows</div>
              <div className="text-2xl font-black text-white">{totalRows}</div>
            </div>
            <div className="rounded-xl web3-card p-4 match-reveal" style={{ animationDelay: "100ms" }}>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Visible Leagues</div>
              <div className="text-2xl font-black text-indigo-200">{sectionCount}</div>
            </div>
            <div className="rounded-xl web3-card p-4 match-reveal" style={{ animationDelay: "150ms" }}>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Final Scores</div>
              <div className="text-2xl font-black text-emerald-300">{finalScoreCount}</div>
            </div>
          </div>
        )}

        {loading && (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-200">Loading workbook...</div>
        )}

        {error && !loading && (
          <div className="rounded-xl border border-rose-500/35 bg-rose-500/10 p-6 text-rose-200">{error}</div>
        )}

        {!loading && !error && tables.length > 0 && (
          <>
            <div className="rounded-2xl web3-card p-4 mb-4">
              <div className="flex flex-wrap items-center gap-2 mb-3">
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
                    {displaySheetName(table.name)}
                  </button>
                ))}
              </div>
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search team, league, pick, score..."
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/40"
              />
            </div>

            {activeTable && isMainGameList && (
              <div className="grid gap-4">
                {mainGameCards.map((card, idx) => {
                  const p1 = toPct(card.p1);
                  const draw = toPct(card.draw);
                  const p2 = toPct(card.p2);
                  const confidence = toPct(card.confidence);
                  return (
                    <div
                      key={`${card.team1}-${card.team2}-${idx}`}
                      className="rounded-2xl web3-card p-4 sm:p-5 border border-cyan-500/30 match-reveal"
                      style={{ animationDelay: `${Math.min(idx * 35, 250)}ms` }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                        <div className="text-xs text-cyan-200 font-bold">{card.date}</div>
                        <div className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-cyan-100">
                          <LeagueNameWithLogo leagueName={card.league} logoSizeClassName="w-6 h-6" />
                        </div>
                      </div>

                      <div className="grid lg:grid-cols-[1.2fr_1fr] gap-4">
                        <div>
                          <div className="team-letters text-lg sm:text-xl font-black text-white">
                            <TeamNameWithLogo
                              teamName={card.team1}
                              textClassName="text-white"
                              logoSizeClassName="w-6 h-6"
                            />
                          </div>
                          <div className="mt-1">
                            <PowerRankingBadge ranking={getTeamPowerRanking(card.team1)} compact />
                          </div>
                          <div className="text-sm text-cyan-200">Odd {card.odd1}</div>
                          <div className="mt-2 team-letters text-lg sm:text-xl font-black text-white">
                            <TeamNameWithLogo
                              teamName={card.team2}
                              textClassName="text-white"
                              logoSizeClassName="w-6 h-6"
                            />
                          </div>
                          <div className="mt-1">
                            <PowerRankingBadge ranking={getTeamPowerRanking(card.team2)} compact />
                          </div>
                          <div className="text-sm text-cyan-200">Odd {card.odd2}</div>

                          <div className="mt-3 rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-3 py-2">
                            <div className="text-[11px] uppercase tracking-wide text-indigo-200 mb-1">Match score</div>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="rounded border border-cyan-500/25 bg-cyan-500/10 px-2 py-1.5 text-center">
                                <div className="text-[10px] text-cyan-200">Predicted Score</div>
                                <div className="text-base font-black text-cyan-100">{card.finalPred}</div>
                              </div>
                              <div className="rounded border border-emerald-500/25 bg-emerald-500/10 px-2 py-1.5 text-center">
                                <div className="text-[10px] text-emerald-200">Final Score</div>
                                <div className="text-base font-black text-emerald-100">{card.finalScore !== "-" ? card.finalScore : "Pending"}</div>
                              </div>
                            </div>
                            <div className="mt-1 text-[11px] text-indigo-200">
                              1H Pred: <span className="font-bold">{card.firstHalfPred}</span>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-xl border border-white/15 bg-[#102446] p-3">
                          <div className="text-xs uppercase tracking-wide text-gray-300 mb-2">
                            Probabilities + Confidence
                          </div>
                          <div className="grid grid-cols-3 text-[11px] font-bold mb-1">
                            <span className="text-orange-300">H {p1.toFixed(1)}%</span>
                            <span className="text-center text-gray-200">D {draw.toFixed(1)}%</span>
                            <span className="text-right text-green-300">A {p2.toFixed(1)}%</span>
                          </div>
                          <div className="h-3 rounded-md overflow-hidden flex graph-animated">
                            <div className="bg-orange-400" style={{ width: `${p1}%` }} />
                            <div className="bg-slate-300" style={{ width: `${draw}%` }} />
                            <div className="bg-lime-500" style={{ width: `${p2}%` }} />
                          </div>

                          <div className="mt-3 text-[11px] text-gray-300 mb-1">Confidence</div>
                          <div className="h-2 rounded bg-[#1a2f55] overflow-hidden graph-animated">
                            <div className="h-full bg-cyan-400" style={{ width: `${confidence}%` }} />
                          </div>
                          <div className="mt-1 text-right text-xs text-cyan-200 font-bold">{confidence.toFixed(1)}%</div>

                          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                            <div className="rounded border border-indigo-500/30 bg-indigo-500/10 px-2 py-1.5 text-indigo-100">
                              1H Result: <span className="font-bold">{card.firstHalfResult}</span>
                            </div>
                            <div className="rounded border border-emerald-500/30 bg-emerald-500/10 px-2 py-1.5 text-emerald-100">
                              Final Score: <span className="font-bold">{card.finalScore !== "-" ? card.finalScore : "Pending"}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTable && !isMainGameList && (
              <div className="rounded-2xl web3-card p-4 overflow-hidden match-reveal border border-cyan-500/25">
                <div className="text-cyan-200 font-black mb-3 flex flex-wrap items-center gap-2">
                  <span>{displaySheetName(activeTable.name)}</span>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/20 border border-cyan-400/35 text-cyan-100">
                    {filteredRows.length} rows
                  </span>
                  {isMainGameList && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/35 text-indigo-100">
                      Compact view
                    </span>
                  )}
                </div>

                <div className="overflow-x-auto max-h-[70vh]">
                  <table className={`min-w-full ${isMainGameList ? "text-xs lg:text-sm" : "text-sm"}`}>
                    <thead className="sticky top-0 z-10 bg-[#0f213f]/95 backdrop-blur-sm">
                      <tr className="border-b border-white/15">
                        {activeTable.headers.map((header, index) => (
                          <th
                            key={`${header}-${index}`}
                            className={`text-left text-cyan-200 whitespace-nowrap ${
                              isMainGameList ? "px-2 py-1.5 font-black tracking-wide" : "px-3 py-2"
                            }`}
                          >
                            {header || `Column ${index + 1}`}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredRows.map((row, rowIndex) => {
                        const isSectionRow =
                          row[0] && row.slice(1).every((cell) => !cell);

                        if (isSectionRow) {
                          return (
                            <tr key={`section-${rowIndex}`} className="border-b border-cyan-500/15 bg-cyan-500/10">
                              <td
                                className={`text-cyan-100 font-bold ${
                                  isMainGameList ? "px-2 py-1.5 text-sm" : "px-3 py-2"
                                }`}
                                colSpan={activeTable.headers.length}
                              >
                                {row[0]}
                              </td>
                            </tr>
                          );
                        }

                        return (
                          <tr
                            key={`row-${rowIndex}`}
                            className={`border-b border-white/10 align-top hover:bg-white/5 transition-colors ${
                              isMainGameList ? "hover:bg-cyan-500/5" : ""
                            }`}
                          >
                            {activeTable.headers.map((_, colIndex) => (
                              <td
                                key={`cell-${rowIndex}-${colIndex}`}
                                className={`text-gray-200 whitespace-pre-line ${
                                  isMainGameList ? "px-2 py-1.5 leading-snug" : "px-3 py-2"
                                }`}
                              >
                                {(() => {
                                  const value = row[colIndex] || "-";
                                  const colName = (activeTable.headers[colIndex] || "").toLowerCase();
                                  const isOdd =
                                    colName === "odd" ||
                                    colName.includes("money line") ||
                                    colName.includes("bookmaker total");
                                  const isValueBet = colName.includes("value bet") || colName.includes("bet on");
                                  const isScore = colName.includes("score");
                                  if (isValueBet) {
                                    return <span className="text-emerald-300 font-bold">{value}</span>;
                                  }
                                  if (isOdd) {
                                    return <span className="text-cyan-200 font-semibold">{value}</span>;
                                  }
                                  if (isScore) {
                                    return <span className="text-indigo-200 font-semibold">{value}</span>;
                                  }
                                  return value;
                                })()}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
