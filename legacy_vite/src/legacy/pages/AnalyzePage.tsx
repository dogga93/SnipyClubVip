import { useEffect, useMemo, useRef, useState } from "react";
import { Activity, Bot, Plus, Radio, Trash2, Upload } from "lucide-react";
import LeagueNameWithLogo from "../../components/LeagueNameWithLogo";
import { parseLiveBotWorkbook, type LiveBotSignalImport } from "../../utils/excelImport";

type LiveSignal = {
  id: string;
  createdAt: string;
  sport: string;
  title: string;
  note: string;
  active: boolean;
  league: string;
  match: string;
  bet: string;
  odd: string;
  unit: string;
  result: string;
  score: string;
};

const STORAGE_KEY = "snipy:live-bot-signals";
const LIVEBETS_BUNDLED_URL = "/monitors/livebetsSOCCER-2026-2-15.xlsx";

const toEpoch = (value: string) => {
  const ms = Date.parse(value);
  return Number.isFinite(ms) ? ms : 0;
};

const formatParisTime = (value: string) => {
  const ms = Date.parse(value);
  if (!Number.isFinite(ms)) return value;
  return new Intl.DateTimeFormat("fr-FR", {
    timeZone: "Europe/Paris",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
};

const nowText = () =>
  new Date().toLocaleString("en-US", {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

const defaultSignals: LiveSignal[] = [
  {
    id: "live-1",
    createdAt: nowText(),
    sport: "Soccer",
    title: "Signal live active",
    note: "Public pressure rising on away side. Wait and observe next 5 minutes.",
    active: true,
    league: "League",
    match: "Home vs Away",
    bet: "Monitor signal",
    odd: "",
    unit: "",
    result: "Pending",
    score: "",
  },
];

const MANUAL_TOP_SIGNALS: LiveSignal[] = [
  {
    id: "manual-live-2026-02-15-0810-cet",
    createdAt: "2026-02-15T08:10:00+01:00",
    sport: "Soccer",
    title: "Live bet 🔥",
    note: "Current Score: 2-0 | Bet 100 USD | Payout 135 USD",
    active: true,
    league: "Soccer. Japan J-League",
    match: "C-Osaka - Avispa Fukuoka",
    bet: "Regular time Total Over 2.5",
    odd: "1.35",
    unit: "1",
    result: "Pending",
    score: "2-0",
  },
  {
    id: "manual-live-2026-02-15-0805-cet-win",
    createdAt: "2026-02-15T08:05:00+01:00",
    sport: "Table Tennis",
    title: "BOOM! Cashed! The bet won!",
    note: "Payout 155 USD ✅✅✅",
    active: true,
    league: "Table Tennis Pro League",
    match: "Aleksei Mikhailov - Mikhail Chernyavskiy",
    bet: "Regular time 1x2. Bet on Mikhail Chernyavskiy",
    odd: "1.545",
    unit: "1",
    result: "Won",
    score: "13-17",
  },
];

const readSignals = (): LiveSignal[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultSignals;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : defaultSignals;
  } catch {
    return defaultSignals;
  }
};

const saveSignals = (signals: LiveSignal[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(signals));
  } catch {
    // Keep UI working even if storage fails.
  }
};

const sportEmoji = (sport: string) => {
  const key = sport.toLowerCase();
  if (key.includes("soccer") || key.includes("football")) return "⚽";
  if (key.includes("basket")) return "🏀";
  if (key.includes("tennis")) return "🎾";
  if (key.includes("hockey")) return "🏒";
  if (key.includes("baseball")) return "⚾";
  return "🏟️";
};

const resultBadge = (result: string) => {
  const key = result.toLowerCase();
  if (key.includes("win")) return { emoji: "✅", text: "Won", cls: "text-emerald-300 border-emerald-400/35 bg-emerald-500/10" };
  if (key.includes("loss") || key.includes("lose")) {
    return { emoji: "❌", text: "Lost", cls: "text-rose-300 border-rose-400/35 bg-rose-500/10" };
  }
  if (key.includes("pending") || key.includes("open") || key.includes("live")) {
    return { emoji: "🟡", text: "Pending", cls: "text-amber-300 border-amber-400/35 bg-amber-500/10" };
  }
  return { emoji: "ℹ️", text: result || "Info", cls: "text-cyan-200 border-cyan-400/35 bg-cyan-500/10" };
};

export default function AnalyzePage() {
  const showAdminEditor = import.meta.env.VITE_ADMIN_IMPORT === "true";
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [signals, setSignals] = useState<LiveSignal[]>(() => readSignals());
  const [importStatus, setImportStatus] = useState<string>("");
  const [form, setForm] = useState({
    sport: "Soccer",
    title: "Signal live active",
    note: "",
    active: true,
  });

  const orderedSignals = useMemo(
    () =>
      [...signals, ...MANUAL_TOP_SIGNALS]
        .filter((entry, index, all) => all.findIndex((x) => x.id === entry.id) === index)
        .sort((a, b) => toEpoch(b.createdAt) - toEpoch(a.createdAt)),
    [signals]
  );
  const latestSignal = orderedSignals[0] ?? null;

  useEffect(() => {
    let cancelled = false;
    const bootstrap = async () => {
      try {
        const hasStored = !!localStorage.getItem(STORAGE_KEY);
        if (hasStored) return;
        const response = await fetch(LIVEBETS_BUNDLED_URL);
        if (!response.ok) return;
        const blob = await response.blob();
        const file = new File([blob], "livebetsSOCCER-2026-2-14.xlsx", { type: blob.type });
        const parsed = await parseLiveBotWorkbook(file);
        if (cancelled || parsed.signals.length === 0) return;
        const nextSignals: LiveSignal[] = parsed.signals.map((entry) => ({ ...entry }));
        setSignals(nextSignals);
        saveSignals(nextSignals);
        setImportStatus(
          `Auto-loaded ${parsed.importedCount} live signals, skipped ${parsed.skippedCount} rows.`
        );
      } catch {
        // Silent fail: manual import remains available.
      }
    };

    bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  const addSignal = () => {
    if (!form.note.trim()) return;
    const next: LiveSignal = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: nowText(),
      sport: form.sport.trim() || "Soccer",
      title: form.title.trim() || "Signal live active",
      note: form.note.trim(),
      active: form.active,
      league: "Manual",
      match: "Manual note",
      bet: "Admin signal",
      odd: "",
      unit: "",
      result: form.active ? "Active" : "Paused",
      score: "",
    };
    const updated = [next, ...signals];
    setSignals(updated);
    saveSignals(updated);
    setForm((prev) => ({ ...prev, note: "" }));
  };

  const removeSignal = (id: string) => {
    const updated = signals.filter((entry) => entry.id !== id);
    setSignals(updated);
    saveSignals(updated);
  };

  const toggleActive = (id: string) => {
    const updated = signals.map((entry) =>
      entry.id === id ? { ...entry, active: !entry.active } : entry
    );
    setSignals(updated);
    saveSignals(updated);
  };

  const handleImportPick = () => fileInputRef.current?.click();

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.currentTarget.value = "";
    if (!file) return;

    try {
      const parsed = await parseLiveBotWorkbook(file);
      const nextSignals: LiveSignal[] = parsed.signals.map((entry: LiveBotSignalImport) => ({
        ...entry,
      }));
      setSignals(nextSignals);
      saveSignals(nextSignals);
      setImportStatus(
        `Imported ${parsed.importedCount} live signals, skipped ${parsed.skippedCount} rows.`
      );
    } catch (error) {
      const message = error instanceof Error ? error.message : "Import failed.";
      setImportStatus(message);
    }
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
        <div className="rounded-2xl web3-panel p-6 mb-6">
          <div className="grid gap-5 lg:grid-cols-[1fr_240px] items-center">
            <div>
              <div className="text-sm text-cyan-200 mb-1">SNIPY Live Bot Window</div>
              <h1 className="text-3xl lg:text-4xl font-black mb-2 vivid-title">SNIPY Live Bot</h1>
              <p className="text-gray-300">Our live bot leverages real-time GX data feeds and advanced signal detection algorithms to identify high-probability betting opportunities instantly.</p>
            </div>

            <div className="rounded-2xl border border-cyan-400/40 bg-cyan-500/10 p-4 web3-glow livebot-core">
              <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-cyan-400/40 to-emerald-400/30 border border-cyan-300/50 flex items-center justify-center livebot-robot-shell">
                <div className="livebot-scan" />
                <Bot className="w-12 h-12 text-cyan-200 relative z-10" />
              </div>
              <div className="mt-3 text-center font-black text-cyan-200">Robot Sportif</div>
              <div className="mt-1 text-center text-xs text-emerald-300 inline-flex items-center justify-center gap-1 w-full">
                <Radio className="w-3.5 h-3.5 livebot-radio" /> ACTIVE
              </div>
              <div className="mt-2 flex items-center justify-center gap-1.5">
                <span className="livebot-dot" />
                <span className="livebot-dot" />
                <span className="livebot-dot" />
              </div>
            </div>
          </div>
        </div>

        {latestSignal && (
          <div className="rounded-2xl border border-emerald-500/35 bg-gradient-to-r from-emerald-500/15 to-cyan-500/10 p-4 mb-6 web3-glow">
            <div className="text-xs uppercase tracking-wide text-emerald-200">Latest Live Bet</div>
            <div className="mt-1 text-lg font-black text-white">
              {sportEmoji(latestSignal.sport)} {latestSignal.league}
            </div>
            <div className="text-sm text-cyan-100 mt-1">🏆 {latestSignal.match}</div>
            <div className="text-sm font-bold text-emerald-300 mt-1">
              ✅ {latestSignal.bet} {latestSignal.odd ? `@ ${latestSignal.odd}` : ""}
            </div>
            <div className="text-xs text-gray-200 mt-1">{latestSignal.note}</div>
          </div>
        )}

        {showAdminEditor && (
          <div className="rounded-2xl web3-card p-5 mb-6">
            <div className="text-cyan-200 font-black mb-4">Admin input - live signal</div>
            <div className="mb-4 flex flex-wrap gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleImportFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={handleImportPick}
                className="inline-flex items-center gap-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-200"
              >
                <Upload className="w-4 h-4" /> Import livebets Excel
              </button>
              {importStatus && <div className="text-xs text-emerald-300 self-center">{importStatus}</div>}
            </div>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              <input
                type="text"
                value={form.sport}
                onChange={(event) => setForm((prev) => ({ ...prev, sport: event.target.value }))}
                placeholder="Sport"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                value={form.title}
                onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
                placeholder="Signal title"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <label className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
                />
                Signal live active
              </label>
              <button
                type="button"
                onClick={addSignal}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-bold text-white"
              >
                <Plus className="w-4 h-4" /> Add signal
              </button>
            </div>
            <textarea
              value={form.note}
              onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
              placeholder="Admin note..."
              rows={3}
              className="mt-3 w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
            />
          </div>
        )}

        <div className="grid gap-4">
          {orderedSignals.map((signal) => (
            <div key={signal.id} className="rounded-xl web3-card p-4 border border-cyan-500/25">
              <div className="grid lg:grid-cols-[auto_1fr_auto] gap-4 items-start">
                <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-400/35 flex items-center justify-center">
                  <Bot className="w-7 h-7 text-cyan-200" />
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="text-xs uppercase tracking-wide text-gray-400">{formatParisTime(signal.createdAt)}</span>
                    <span className="text-xs px-2 py-0.5 rounded border border-cyan-400/35 bg-cyan-500/10 text-cyan-200">
                      {sportEmoji(signal.sport)} {signal.sport}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded border ${
                        signal.active
                          ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-300"
                          : "border-rose-400/35 bg-rose-500/10 text-rose-300"
                      }`}
                    >
                      {signal.active ? "Signal live active" : "Signal paused"}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded border ${resultBadge(signal.result).cls}`}>
                      {resultBadge(signal.result).emoji} {resultBadge(signal.result).text}
                    </span>
                  </div>
                  <div className="text-lg font-black text-cyan-100">{signal.title}</div>
                  <div className="mt-2 grid sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                    <div className="rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-2 py-1.5 text-cyan-100">
                      <LeagueNameWithLogo leagueName={signal.league} logoSizeClassName="w-6 h-6" />
                    </div>
                    <div className="rounded-lg border border-indigo-500/30 bg-indigo-500/10 px-2 py-1.5 text-indigo-100 sm:col-span-2 lg:col-span-2">
                      🤝 {signal.match}
                    </div>
                  </div>
                  <div className="mt-2 rounded-lg border border-emerald-400/35 bg-emerald-500/10 px-3 py-2">
                    <div className="text-xs uppercase tracking-wide text-emerald-200 mb-1">🎯 Pick Signal</div>
                    <div className="text-sm font-black text-emerald-300">
                      {signal.bet}
                      {signal.odd ? ` @ ${signal.odd}` : ""}
                      {signal.unit ? ` (${signal.unit}u)` : ""}
                    </div>
                  </div>
                  {signal.score && <div className="text-xs text-gray-300">Score: {signal.score}</div>}
                  <div className="text-xs text-gray-300">📊 Score: {signal.score || "-"}</div>
                  <div className="mt-1 text-sm text-gray-200">{signal.note}</div>
                </div>

                {showAdminEditor && (
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => toggleActive(signal.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-amber-400/30 bg-amber-500/10 px-2.5 py-1.5 text-xs text-amber-200"
                    >
                      <Activity className="w-3.5 h-3.5" /> Toggle
                    </button>
                    <button
                      type="button"
                      onClick={() => removeSignal(signal.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-rose-400/30 bg-rose-500/10 px-2.5 py-1.5 text-xs text-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {orderedSignals.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
              No live signals for now.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
