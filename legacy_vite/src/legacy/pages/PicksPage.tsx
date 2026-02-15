import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import PowerRankingBadge from "../../components/PowerRankingBadge";
import LeagueNameWithLogo from "../../components/LeagueNameWithLogo";
import { useZCode } from "../../store/zcodeStore";

type ManualPick = {
  id: string;
  date: string;
  sport: string;
  league: string;
  match: string;
  pick: string;
  odd: string;
  confidence: string;
  note: string;
};

const STORAGE_KEY = "snipy:manual-picks";
const SYSTEM_PICKS: ManualPick[] = [
  { id: "sys-rodney-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Rodney (World Football)", match: "🏴 Reading vs Wycombe", pick: "📌 Under 3", odd: "1.450", confidence: "", note: "Pending" },
  { id: "sys-rodney-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Rodney (World Football)", match: "🏴 Cambridge United vs Bristol Rovers", pick: "📌 Under 3", odd: "1.350", confidence: "", note: "Pending" },
  { id: "sys-rodney-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Rodney (World Football)", match: "🏴 Stirling vs Clyde", pick: "📌 Over 2", odd: "1.425", confidence: "", note: "Pending" },

  { id: "sys-dragon-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 Melbourne Victory vs Brisbane Roar", pick: "📌 Over 2.5", odd: "2.50", confidence: "", note: "🔴 LIVE" },
  { id: "sys-dragon-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇯🇵 Kashima vs Yokohama", pick: "📌 Over 1.5", odd: "3.00", confidence: "", note: "🔴 LIVE" },
  { id: "sys-dragon-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 St George City vs St George", pick: "📌 Over 1.5", odd: "1.90", confidence: "", note: "🔴 LIVE" },
  { id: "sys-dragon-4", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 Blacktown vs Manly United", pick: "📌 Over 1.5", odd: "2.15", confidence: "", note: "🔴 LIVE" },
  { id: "sys-dragon-5", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 Hills United U20 vs Dulwich Hill U20", pick: "📌 Over 1.5", odd: "1.70", confidence: "", note: "Pending" },
  { id: "sys-dragon-6", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 Sydney vs Adelaide United", pick: "📌 1st Half Over 2.5", odd: "1.70", confidence: "", note: "Pending" },
  { id: "sys-dragon-7", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 Women Perth Glory vs Canberra United", pick: "📌 BTTS Yes", odd: "1.80", confidence: "", note: "Pending" },
  { id: "sys-dragon-8", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 Women Perth Glory vs Canberra United", pick: "📌 Over 2.5", odd: "1.80", confidence: "", note: "Pending" },
  { id: "sys-dragon-9", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 Sydney University vs South Coast Flame", pick: "📌 Over 1.5", odd: "1.65", confidence: "", note: "Pending" },
  { id: "sys-dragon-10", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 St Albans Saints vs Dandenong City", pick: "📌 1H Over 0.5", odd: "2.00", confidence: "", note: "Pending" },
  { id: "sys-dragon-11", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 St Albans Saints vs Dandenong City", pick: "📌 Over 1.5", odd: "1.90", confidence: "", note: "Pending" },
  { id: "sys-dragon-12", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 Western City Rangers vs Blacktown Spartans", pick: "📌 Over 1.5", odd: "1.80", confidence: "", note: "Pending" },
  { id: "sys-dragon-13", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 Sydney vs Adelaide United", pick: "📌 Over 3.5", odd: "1.90", confidence: "", note: "Pending" },
  { id: "sys-dragon-14", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Dragon (Live)", match: "🇦🇺 Women Perth Glory vs Canberra United", pick: "📌 Over 1.5", odd: "2.30", confidence: "", note: "Pending" },

  { id: "sys-brownq-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ The Brown Queen (Picks)", match: "🏟️ Sydney University vs South Coast Flame", pick: "📌 Over 2.5", odd: "1.33", confidence: "", note: "⏱️ Early games" },
  { id: "sys-brownq-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ The Brown Queen (Picks)", match: "🏟️ Dunbar Rovers vs Parramatta", pick: "📌 Over 2.5", odd: "1.38", confidence: "", note: "⏱️ Early games" },
  { id: "sys-brownq-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ The Brown Queen (Picks)", match: "🏟️ Goulburn Valley Suns vs Whittlesea United", pick: "📌 Over 2.5", odd: "1.38", confidence: "", note: "⏱️ Early games" },
  { id: "sys-brownq-4", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ The Brown Queen (Picks)", match: "🏟️ Hills United U20 vs Dulwich Hill U20", pick: "📌 Over 2.5", odd: "1.50", confidence: "", note: "⏱️ Early games" },
  { id: "sys-brownq-5", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ The Brown Queen (Picks)", match: "🏟️ Sydney vs Adelaide United", pick: "📌 Over 2.5", odd: "1.33", confidence: "", note: "⏱️ Early games" },
  { id: "sys-brownq-6", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ The Brown Queen (Picks)", match: "🏟️ St Albans vs Dandenong City", pick: "📌 Over 2.5", odd: "1.44", confidence: "", note: "⏱️ Early games" },
  { id: "sys-brownq-7", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ The Brown Queen (Picks)", match: "🏟️ Bankstown City Lions U20 vs Hakoah Sydney City East U20", pick: "📌 Over 2.5", odd: "1.32", confidence: "", note: "⏱️ Soccer picks 2 | 👀 Monitor: 1H Over 0.5 si match lent" },
  { id: "sys-brownq-8", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ The Brown Queen (Picks)", match: "🏟️ Futera United vs Prime Bangkok", pick: "📌 Over 2.5", odd: "1.71", confidence: "", note: "⏱️ Soccer picks 2" },
  { id: "sys-brownq-9", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ The Brown Queen (Picks)", match: "🏟️ Perth Glory (W) vs Canberra United (W)", pick: "📌 Over 2.5", odd: "1.78", confidence: "", note: "⏱️ Soccer picks 2" },

  { id: "sys-ljay-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Ljay (Live)", match: "🇦🇺 Inter Lions vs Bankstown", pick: "📌 Over 2.5", odd: "1.80", confidence: "", note: "🔴 LIVE" },
  { id: "sys-ljay-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Ljay (Live)", match: "🇩🇪 Kaiserslautern vs Greuther", pick: "📌 Over 2.5", odd: "1.65", confidence: "", note: "🔴 LIVE" },
  { id: "sys-ljay-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Ljay (Live)", match: "🇩🇪 Kaiserslautern vs Greuther", pick: "📌 Over 1.5", odd: "1.50", confidence: "", note: "Pending" },
  { id: "sys-ljay-4", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Ljay (Live)", match: "🇦🇿 Imisil vs Qaraag", pick: "📌 Over 0.5", odd: "1.45", confidence: "", note: "🔴 LIVE" },
  { id: "sys-ljay-5", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Ljay (Live)", match: "🏴 West Ham vs Burton", pick: "📌 Over 0.5", odd: "2.20", confidence: "", note: "Pending" },

  { id: "sys-robinson-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Robinson", match: "🏟️ Academico de Viseu vs Oliveirense", pick: "📌 BTTS No", odd: "1.75", confidence: "", note: "Pending" },
  { id: "sys-robinson-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Robinson", match: "🏟️ Espanyol vs Celta", pick: "📌 Under 10 Corners", odd: "1.95", confidence: "", note: "Pending" },
  { id: "sys-robinson-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Robinson", match: "🏟️ Partizan vs Subotica", pick: "📌 Under 3.5", odd: "1.70", confidence: "", note: "Pending" },

  { id: "sys-wager-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Wager Wi$ely", match: "🇪🇸 Cordoba", pick: "ML", odd: "-115", confidence: "", note: "Pending" },
  { id: "sys-wager-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Wager Wi$ely", match: "🇮🇹 Palermo", pick: "ML", odd: "-170", confidence: "", note: "Pending" },
  { id: "sys-wager-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Wager Wi$ely", match: "🇨🇱 Coquimbo", pick: "ML", odd: "+120", confidence: "", note: "Pending" },
  { id: "sys-wager-4", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ Wager Wi$ely", match: "🇵🇹 Farense", pick: "ML", odd: "+100", confidence: "", note: "❌" },

  { id: "sys-luka77-1", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Luka77", match: "🇯🇵 Shiga Lakes vs Hiroshima", pick: "📌 Over 167", odd: "1.86", confidence: "", note: "✅" },
  { id: "sys-luka77-2", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Luka77", match: "🇪🇸 Valencia U22 vs Granada U22", pick: "📌 Over 155.5", odd: "1.83", confidence: "", note: "✅" },
  { id: "sys-luka77-3", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Luka77", match: "🇨🇿 Pardubice vs Ostrava", pick: "📌 Over 176.5", odd: "1.83", confidence: "", note: "✅" },
  { id: "sys-luka77-4", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Luka77", match: "🇱🇹 Rytas vs Neptunas", pick: "📌 Over 181.5", odd: "1.83", confidence: "", note: "✅" },
  { id: "sys-luka77-5", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Luka77", match: "🇯🇵 Toyama vs Levanga", pick: "📌 Over 175.5", odd: "1.83", confidence: "", note: "Pending" },

  { id: "sys-scott-1", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Xavier ML", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-2", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 NC State -5.5", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-3", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Oklahoma ML", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-4", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Kentucky +13", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-5", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Missouri ML", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-6", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Purdue ML", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-7", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Baylor +8.5", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-8", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Texas Tech +10", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-9", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Arizona -8.5", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-10", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Memphis +14", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-11", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Santa Clara +6.5", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-12", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Pacific +8.5", odd: "-", confidence: "", note: "Pending" },
  { id: "sys-scott-13", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Scott", match: "-", pick: "📌 Zags Over 157", odd: "-", confidence: "", note: "Pending" },

  { id: "sys-fresh-basket-1", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Basketball", match: "🇯🇵 Shiga Lakes vs Hiroshima", pick: "📌 Over 167", odd: "1.86", confidence: "", note: "✅" },
  { id: "sys-fresh-basket-2", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Basketball", match: "🇪🇸 Valencia U22 vs Granada U22", pick: "📌 Over 155.5", odd: "1.83", confidence: "", note: "✅" },
  { id: "sys-fresh-basket-3", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Basketball", match: "🇨🇿 Pardubice vs Ostrava", pick: "📌 Over 176.5", odd: "1.83", confidence: "", note: "✅" },
  { id: "sys-fresh-basket-4", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Basketball", match: "🇱🇹 Rytas vs Neptunas", pick: "📌 Over 181.5", odd: "1.83", confidence: "", note: "✅" },
  { id: "sys-fresh-basket-5", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 Basketball", match: "🇯🇵 Toyama vs Levanga", pick: "📌 Over 175.5", odd: "1.83", confidence: "", note: "Pending" },

  { id: "sys-fresh-soccer-1", date: "2026-02-15", sport: "⚽ Soccer", league: "🇦🇺 Australia A-League", match: "🏟️ Sydney vs Adelaide UTD", pick: "📌 Over 2.5", odd: "1.45", confidence: "", note: "✅" },
  { id: "sys-fresh-soccer-2", date: "2026-02-15", sport: "⚽ Soccer", league: "🇪🇸 Spain LaLiga", match: "🏟️ Sevilla (victoire)", pick: "📌 Sevilla", odd: "2.15", confidence: "", note: "Pending" },
  { id: "sys-fresh-soccer-3", date: "2026-02-15", sport: "⚽ Soccer", league: "🇪🇸 Spain LaLiga", match: "🏟️ Real Madrid vs Real Sociedad", pick: "📌 Over 2.5", odd: "1.45", confidence: "", note: "✅" },

  { id: "sys-snipy-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ SNIPY SYSTEM", match: "-", pick: "🔥 Over 2.5", odd: "1.59", confidence: "", note: "✅" },
  { id: "sys-snipy-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ SNIPY SYSTEM", match: "-", pick: "🎯 Borussia Dortmund ML", odd: "1.59", confidence: "", note: "✅" },
  { id: "sys-snipy-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ SNIPY SYSTEM", match: "-", pick: "🔥 Over 2.5", odd: "1.59", confidence: "", note: "✅" },
  { id: "sys-snipy-4", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ SNIPY SYSTEM", match: "-", pick: "🎯 AC Milan ML", odd: "1.56", confidence: "", note: "✅" },
  { id: "sys-snipy-5", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ SNIPY SYSTEM", match: "-", pick: "💎 Osasuna ML", odd: "2.55", confidence: "", note: "❌" },

  { id: "sys-sharp-1", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 SHARP SYSTEM", match: "-", pick: "💎 Manhattan +1.5", odd: "1.78", confidence: "", note: "✅" },
  { id: "sys-sharp-2", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 SHARP SYSTEM", match: "-", pick: "💎 Brown +8", odd: "2.03", confidence: "", note: "✅" },
  { id: "sys-sharp-3", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 SHARP SYSTEM", match: "-", pick: "⚡ Princeton +3.5", odd: "1.88", confidence: "", note: "❌" },
  { id: "sys-sharp-4", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 SHARP SYSTEM", match: "-", pick: "⚡ Michigan St ML", odd: "1.72", confidence: "", note: "❌" },

  { id: "sys-value-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ VALUE SYSTEM", match: "-", pick: "🔥 Over 2.5", odd: "1.45", confidence: "", note: "Pending" },
  { id: "sys-value-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ VALUE SYSTEM", match: "-", pick: "💎 Sevilla ML", odd: "2.15", confidence: "", note: "Pending" },
  { id: "sys-value-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ VALUE SYSTEM", match: "-", pick: "🔥 Over 2.5", odd: "1.45", confidence: "", note: "Pending" },

  { id: "sys-edge-1", date: "2026-02-15", sport: "⚽ Soccer", league: "🌍 EDGE SYSTEM", match: "-", pick: "⚽ Under 3", odd: "1.45", confidence: "", note: "Pending" },
  { id: "sys-edge-2", date: "2026-02-15", sport: "⚽ Soccer", league: "🌍 EDGE SYSTEM", match: "-", pick: "⚽ Under 3", odd: "1.35", confidence: "", note: "Pending" },
  { id: "sys-edge-3", date: "2026-02-15", sport: "⚽ Soccer", league: "🌍 EDGE SYSTEM", match: "-", pick: "🔥 Over 2", odd: "1.42", confidence: "", note: "Pending" },

  { id: "sys-pro-1", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 PRO SYSTEM", match: "-", pick: "💎 Clemson +13.5", odd: "1.95", confidence: "", note: "Pending" },
  { id: "sys-pro-2", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 PRO SYSTEM", match: "-", pick: "💎 Florida -12.5", odd: "1.87", confidence: "", note: "Pending" },
  { id: "sys-pro-3", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 PRO SYSTEM", match: "-", pick: "🎯 Oklahoma ML", odd: "1.75", confidence: "", note: "Pending" },
  { id: "sys-pro-4", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 PRO SYSTEM", match: "-", pick: "🎯 Arizona -9.5", odd: "1.91", confidence: "", note: "Pending" },
  { id: "sys-pro-5", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 PRO SYSTEM", match: "-", pick: "🎯 Virginia -3.5", odd: "1.91", confidence: "", note: "Pending" },
  { id: "sys-pro-6", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 PRO SYSTEM", match: "-", pick: "🎯 Gonzaga -4.5", odd: "1.91", confidence: "", note: "Pending" },

  { id: "sys-live-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ LIVE SNIPY", match: "-", pick: "🔥 Over 2.5", odd: "2.50", confidence: "", note: "Live" },
  { id: "sys-live-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ LIVE SNIPY", match: "-", pick: "🔥 Over 1.5", odd: "3.00", confidence: "", note: "Live" },
  { id: "sys-live-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ LIVE SNIPY", match: "-", pick: "🔥 Over 1.5", odd: "2.40", confidence: "", note: "Live" },
  { id: "sys-live-4", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ LIVE SNIPY", match: "-", pick: "🔥 Over 1.5", odd: "1.90", confidence: "", note: "Live" },
  { id: "sys-live-5", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ LIVE SNIPY", match: "-", pick: "🎯 1H Over 0.5", odd: "2.00", confidence: "", note: "Live" },
  { id: "sys-live-6", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ LIVE SNIPY", match: "-", pick: "🔥 Over 3.5", odd: "1.90", confidence: "", note: "Live" },
  { id: "sys-live-7", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ LIVE SNIPY", match: "-", pick: "🎯 BTTS", odd: "1.80", confidence: "", note: "Live" },

  { id: "sys-bpod-1", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 BPOD SYSTEM", match: "-", pick: "🔥 Over 167", odd: "1.86", confidence: "", note: "✅" },
  { id: "sys-bpod-2", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 BPOD SYSTEM", match: "-", pick: "🔥 Over 155.5", odd: "1.83", confidence: "", note: "✅" },
  { id: "sys-bpod-3", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 BPOD SYSTEM", match: "-", pick: "🔥 Over 176.5", odd: "1.83", confidence: "", note: "✅" },
  { id: "sys-bpod-4", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 BPOD SYSTEM", match: "-", pick: "🔥 Over 181.5", odd: "1.83", confidence: "", note: "✅" },

  { id: "sys-money-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ MONEY SYSTEM", match: "-", pick: "💎 Cordoba ML", odd: "-115", confidence: "", note: "✅" },
  { id: "sys-money-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ MONEY SYSTEM", match: "-", pick: "💎 Palermo ML", odd: "-170", confidence: "", note: "✅" },
  { id: "sys-money-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ MONEY SYSTEM", match: "-", pick: "💎 Coquimbo ML", odd: "+120", confidence: "", note: "✅" },
  { id: "sys-money-4", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ MONEY SYSTEM", match: "-", pick: "💎 Fenerbahce ML", odd: "+105", confidence: "", note: "✅" },
  { id: "sys-money-5", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ MONEY SYSTEM", match: "-", pick: "💎 Venezia ML", odd: "+110", confidence: "", note: "✅" },

  { id: "sys-unit-1", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 UNIT SYSTEM", match: "-", pick: "💎 Boston Univ -3.5", odd: "-188", confidence: "", note: "✅" },
  { id: "sys-unit-2", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 UNIT SYSTEM", match: "-", pick: "💎 Xavier ML", odd: "-130", confidence: "", note: "✅" },
  { id: "sys-unit-3", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 UNIT SYSTEM", match: "-", pick: "💎 Villanova -2.5", odd: "-102", confidence: "", note: "✅" },
  { id: "sys-unit-4", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 UNIT SYSTEM", match: "-", pick: "💎 UNC Wilmington -2.5", odd: "-110", confidence: "", note: "✅" },
  { id: "sys-unit-5", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 UNIT SYSTEM", match: "-", pick: "💎 Eastern Washington -2.5", odd: "-118", confidence: "", note: "✅" },
  { id: "sys-unit-6", date: "2026-02-15", sport: "🏀 Basketball", league: "🏀 UNIT SYSTEM", match: "-", pick: "💎 Lehigh +1.5", odd: "-115", confidence: "", note: "✅" },

  { id: "sys-btts-1", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ BTTS SYSTEM", match: "-", pick: "🔥 BTTS Yes", odd: "1.74", confidence: "", note: "Pending" },
  { id: "sys-btts-2", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ BTTS SYSTEM", match: "-", pick: "🔥 BTTS Yes", odd: "1.80", confidence: "", note: "Pending" },
  { id: "sys-btts-3", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ BTTS SYSTEM", match: "-", pick: "🔥 BTTS Yes", odd: "2.60", confidence: "", note: "Pending" },
  { id: "sys-btts-4", date: "2026-02-15", sport: "⚽ Soccer", league: "⚽ BTTS SYSTEM", match: "-", pick: "🔥 BTTS No", odd: "1.75", confidence: "", note: "Pending" },
];
const DEFAULT_PICKS: ManualPick[] = [
  {
    id: "seed-1",
    date: "2026-02-14",
    sport: "⚽ Soccer",
    league: "🇦🇺 Australia A League",
    match: "Western Sydney vs W. Phoenix",
    pick: "Over 2.5",
    odd: "1.59",
    confidence: "",
    note: "✅ Won",
  },
  {
    id: "seed-2",
    date: "2026-02-14",
    sport: "⚽ Soccer",
    league: "🇩🇪 Germany Bundesliga",
    match: "Borussia Dortmund vs FSV Mainz 05",
    pick: "Borussia Dortmund",
    odd: "1.59",
    confidence: "",
    note: "✅ Won",
  },
  {
    id: "seed-3",
    date: "2026-02-14",
    sport: "⚽ Soccer",
    league: "🇩🇪 Germany Bundesliga",
    match: "Borussia Dortmund vs FSV Mainz 05",
    pick: "Over 2.5",
    odd: "1.59",
    confidence: "",
    note: "✅ Won",
  },
  {
    id: "seed-4",
    date: "2026-02-14",
    sport: "⚽ Soccer",
    league: "🇮🇹 Italy Serie A",
    match: "AC Milan match",
    pick: "AC Milan",
    odd: "1.56",
    confidence: "",
    note: "✅ Won",
  },
  {
    id: "seed-5",
    date: "2026-02-14",
    sport: "⚽ Soccer",
    league: "🇪🇸 Spain La Liga",
    match: "Osasuna match",
    pick: "Osasuna",
    odd: "2.55",
    confidence: "",
    note: "❌ Lost",
  },
  {
    id: "seed-6",
    date: "2026-02-14",
    sport: "⚽ Soccer",
    league: "🇦🇺 Australia A League",
    match: "Sydney vs Adelaide UTD",
    pick: "Over 2.5",
    odd: "1.45",
    confidence: "",
    note: "🎯 New pick",
  },
  {
    id: "seed-7",
    date: "2026-02-14",
    sport: "⚽ Soccer",
    league: "🇪🇸 Spain LaLiga",
    match: "Sevilla match",
    pick: "Sevilla",
    odd: "2.15",
    confidence: "",
    note: "🎯 New pick",
  },
  {
    id: "seed-8",
    date: "2026-02-14",
    sport: "⚽ Soccer",
    league: "🇪🇸 Spain LaLiga",
    match: "Real Madrid vs Real Sociedad",
    pick: "Over 2.5",
    odd: "1.45",
    confidence: "",
    note: "🎯 New pick",
  },
  {
    id: "seed-9",
    date: "2026-02-14",
    sport: "⚽ Soccer",
    league: "🇨🇭 Switzerland Super League",
    match: "St Gallen vs Grasshopper",
    pick: "St Gallen -1",
    odd: "1.877",
    confidence: "",
    note: "🔥 2u",
  },
];

const readPicks = (): ManualPick[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [...SYSTEM_PICKS, ...DEFAULT_PICKS];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [...SYSTEM_PICKS, ...DEFAULT_PICKS];
    const byId = new Map<string, ManualPick>();
    [...SYSTEM_PICKS, ...parsed].forEach((entry) => byId.set(entry.id, entry));
    return Array.from(byId.values());
  } catch {
    return [...SYSTEM_PICKS, ...DEFAULT_PICKS];
  }
};

const savePicks = (picks: ManualPick[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(picks));
  } catch {
    // Keep UI functional if localStorage is unavailable.
  }
};

const todayKey = () => {
  const now = new Date();
  const y = now.getFullYear();
  const m = `${now.getMonth() + 1}`.padStart(2, "0");
  const d = `${now.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const splitGameTeams = (raw: string) => {
  for (const sep of [" vs ", " v ", " - ", " @ ", " — ", " – "]) {
    if (raw.includes(sep)) {
      const [home, away] = raw.split(sep).map((item) => item.trim());
      if (home && away) return { home, away };
    }
  }
  return null;
};

export default function PicksPage() {
  const { getTeamPowerRanking } = useZCode();
  const showAdminEditor = import.meta.env.VITE_ADMIN_IMPORT === "true";
  const [picks, setPicks] = useState<ManualPick[]>(() => readPicks());
  const [form, setForm] = useState<Omit<ManualPick, "id">>({
    date: todayKey(),
    sport: "Soccer",
    league: "",
    match: "",
    pick: "",
    odd: "",
    confidence: "",
    note: "",
  });

  const sortedPicks = useMemo(
    () => [...picks].sort((a, b) => (a.date < b.date ? 1 : -1)),
    [picks]
  );

  useEffect(() => {
    savePicks(picks);
  }, [picks]);

  const addPick = () => {
    if (!form.match.trim() || !form.pick.trim()) return;
    const next: ManualPick = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      ...form,
      sport: form.sport.trim() || "Soccer",
      league: form.league.trim() || "League",
      match: form.match.trim(),
      pick: form.pick.trim(),
      odd: form.odd.trim(),
      confidence: form.confidence.trim(),
      note: form.note.trim(),
    };
    const updated = [next, ...picks];
    setPicks(updated);
    savePicks(updated);
    setForm((prev) => ({ ...prev, league: "", match: "", pick: "", odd: "", confidence: "", note: "" }));
  };

  const removePick = (id: string) => {
    const updated = picks.filter((entry) => entry.id !== id);
    setPicks(updated);
    savePicks(updated);
  };

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-9">
        <div className="rounded-2xl web3-panel p-6 mb-6">
          <div className="text-sm text-cyan-200 mb-1">Manual Picks Board</div>
          <h1 className="text-3xl lg:text-4xl font-black mb-2 vivid-title">Picks Window</h1>
          <p className="text-gray-300">Picks ajoutes manuellement par l'admin, visibles pour tous les utilisateurs.</p>
        </div>

        {showAdminEditor && (
          <div className="rounded-2xl web3-card p-5 mb-6">
            <div className="text-cyan-200 font-black mb-4">Admin input</div>
            <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-3">
              <input
                type="date"
                value={form.date}
                onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                value={form.sport}
                onChange={(event) => setForm((prev) => ({ ...prev, sport: event.target.value }))}
                placeholder="Sport"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                value={form.league}
                onChange={(event) => setForm((prev) => ({ ...prev, league: event.target.value }))}
                placeholder="League"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                value={form.match}
                onChange={(event) => setForm((prev) => ({ ...prev, match: event.target.value }))}
                placeholder="Match"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                value={form.pick}
                onChange={(event) => setForm((prev) => ({ ...prev, pick: event.target.value }))}
                placeholder="Pick"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                value={form.odd}
                onChange={(event) => setForm((prev) => ({ ...prev, odd: event.target.value }))}
                placeholder="Odd"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                value={form.confidence}
                onChange={(event) => setForm((prev) => ({ ...prev, confidence: event.target.value }))}
                placeholder="Confidence %"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
              <input
                type="text"
                value={form.note}
                onChange={(event) => setForm((prev) => ({ ...prev, note: event.target.value }))}
                placeholder="Note"
                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white"
              />
            </div>
            <button
              type="button"
              onClick={addPick}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-500 to-cyan-500 px-4 py-2 text-sm font-bold text-white"
            >
              <Plus className="w-4 h-4" /> Add pick
            </button>
          </div>
        )}

        <div className="grid gap-4">
          {sortedPicks.map((entry) => (
            <div key={entry.id} className="rounded-xl web3-card p-4">
              {(() => {
                const teams = splitGameTeams(entry.match);
                const homeRanking = teams ? getTeamPowerRanking(teams.home) : null;
                const awayRanking = teams ? getTeamPowerRanking(teams.away) : null;
                return (
              <div className="grid md:grid-cols-6 gap-3 items-start">
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Date</div>
                  <div className="text-sm font-bold text-cyan-200">{entry.date || "-"}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Sport / League</div>
                  <div className="text-sm font-bold text-white">{entry.sport}</div>
                  <div className="text-sm font-bold text-white">
                    <LeagueNameWithLogo leagueName={entry.league} logoSizeClassName="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Match</div>
                  <div className="text-sm font-bold text-white">{entry.match}</div>
                  {teams && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <PowerRankingBadge ranking={homeRanking} compact />
                      <PowerRankingBadge ranking={awayRanking} compact />
                    </div>
                  )}
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Pick</div>
                  <div className="text-sm font-black text-emerald-300">{entry.pick}</div>
                </div>
                <div>
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Odd / Confidence</div>
                  <div className="text-sm font-bold text-cyan-100">
                    {entry.odd || "-"} {entry.confidence ? `| ${entry.confidence}%` : ""}
                  </div>
                </div>
                <div className="md:text-right">
                  <div className="text-[11px] uppercase tracking-wide text-gray-400">Note</div>
                  <div className="text-sm font-semibold text-gray-200">{entry.note || "-"}</div>
                  {showAdminEditor && (
                    <button
                      type="button"
                      onClick={() => removePick(entry.id)}
                      className="mt-2 inline-flex items-center gap-1 text-xs text-rose-300 hover:text-rose-200"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete
                    </button>
                  )}
                </div>
              </div>
                );
              })()}
            </div>
          ))}

          {sortedPicks.length === 0 && (
            <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-gray-300">
              Aucun pick manuel pour le moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
