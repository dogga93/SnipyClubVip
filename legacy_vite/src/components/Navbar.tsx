import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Globe, LogIn, Menu, X } from "lucide-react";

export default function Navbar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leagueLogos, setLeagueLogos] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch("/league-logos.json")
      .then(async (response) => {
        if (!response.ok) return {};
        return (await response.json()) as Record<string, string>;
      })
      .then((data) => {
        if (cancelled) return;
        const logos = Array.from(
          new Set(
            Object.values(data)
              .map((url) => String(url || "").trim())
              .filter(Boolean)
          )
        ).slice(0, 40);
        setLeagueLogos(logos);
      })
      .catch(() => {
        if (!cancelled) setLeagueLogos([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const scrollingLogos = useMemo(
    () => (leagueLogos.length > 0 ? [...leagueLogos, ...leagueLogos] : []),
    [leagueLogos]
  );

  return (
    <nav className="border-b border-white/10 bg-gradient-to-b from-[#0b1220]/80 to-transparent backdrop-blur-xl sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[66px] sm:h-[72px]">
          <div className="flex items-center gap-4 sm:gap-8">
            <Link to="/browse" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-green-400 to-cyan-500 flex items-center justify-center font-extrabold text-[#050a10] shadow-lg shadow-green-500/30">
                SP
              </div>
              <span className="text-lg sm:text-2xl font-black bg-gradient-to-r from-green-400 to-cyan-400 bg-clip-text text-transparent">
                SnipyClubVip
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-6">
              <Link
                to="/browse"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Home
              </Link>
              <Link
                to="/picks"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Picks
              </Link>
              <Link
                to="/analyze"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                SNIPY Live Bot
              </Link>
              <Link
                to="/predictions-11"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Predictions 11
              </Link>
              <Link
                to="/soccerbuddy-12"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                SoccerBuddy 13
              </Link>
              <Link
                to="/browse"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                AI Desk
              </Link>
              <Link
                to="/browse"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Alerts
              </Link>
              <Link
                to="/browse"
                className="text-sm font-medium text-gray-300 hover:text-white transition-colors"
              >
                Pricing
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1 sm:gap-4">
            <button className="p-2 text-gray-400 hover:text-white transition-colors">
              <Globe className="w-5 h-5" />
            </button>
            <button className="hidden sm:flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors">
              <LogIn className="w-4 h-4" />
              <span>Sign in</span>
            </button>
            <button className="hidden sm:inline-block px-5 py-2.5 bg-gradient-to-r from-green-500 to-cyan-500 text-white text-sm font-bold rounded-lg hover:shadow-lg hover:shadow-green-500/30 transition-all">
              Get Started
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="md:hidden p-2 text-gray-300 hover:text-white"
              aria-label="Toggle menu"
            >
              {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <div className="md:hidden mb-2 rounded-xl border border-white/10 bg-[#0d1b35]/85 p-3">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <Link to="/browse" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 bg-white/5 text-gray-200">
                Home
              </Link>
              <Link to="/picks" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 bg-white/5 text-gray-200">
                Picks
              </Link>
              <Link to="/analyze" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 bg-white/5 text-gray-200">
                Live Bot
              </Link>
              <Link to="/predictions-11" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 bg-white/5 text-gray-200">
                Predictions 11
              </Link>
              <Link to="/soccerbuddy-12" onClick={() => setMobileOpen(false)} className="rounded-lg px-3 py-2 bg-white/5 text-gray-200">
                SoccerBuddy 13
              </Link>
              <button className="rounded-lg px-3 py-2 bg-gradient-to-r from-green-500 to-cyan-500 text-white font-semibold">
                Get Started
              </button>
            </div>
          </div>
        )}
        <div className="invest-strip mb-2">
          <div className="invest-strip-track">
            {scrollingLogos.length > 0 ? (
              scrollingLogos.map((logo, index) => (
                <span key={`${logo}-${index}`} className="invest-chip">
                  <img
                    src={logo}
                    alt="League logo"
                    className="w-8 h-8 rounded-full object-cover border border-cyan-300/30 bg-[#0a1d3a]"
                    loading="lazy"
                  />
                </span>
              ))
            ) : (
              <>
                <span className="invest-chip">⚽</span>
                <span className="invest-chip">🏆</span>
                <span className="invest-chip">⚽</span>
                <span className="invest-chip">🏆</span>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
