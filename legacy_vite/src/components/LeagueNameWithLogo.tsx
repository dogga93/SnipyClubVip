import { useEffect, useState } from "react";
import { getLeagueEmoji, getLeagueFlag } from "../utils/emojiMap";
import { fetchLeagueLogo } from "../utils/leagueLogoApi";

type LeagueNameWithLogoProps = {
  leagueName: string;
  country?: string;
  flag?: string;
  textClassName?: string;
  logoSizeClassName?: string;
};

export default function LeagueNameWithLogo({
  leagueName,
  country,
  flag,
  textClassName = "",
  logoSizeClassName = "w-6 h-6",
}: LeagueNameWithLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLogoError(false);
    setLogoUrl(null);

    fetchLeagueLogo(leagueName, country).then((logo) => {
      if (cancelled) return;
      if (logo) setLogoUrl(logo);
    });

    return () => {
      cancelled = true;
    };
  }, [leagueName, country]);

  const fallback = `${getLeagueFlag(flag, country, leagueName)} ${getLeagueEmoji(leagueName)}`;

  return (
    <span className="inline-flex items-center gap-2 min-w-0 max-w-full">
      {logoUrl && !logoError ? (
        <img
          src={logoUrl}
          alt={`${leagueName} logo`}
          className={`${logoSizeClassName} shrink-0 rounded-full object-contain border border-white/20 bg-[#0a1d3a]`}
          loading="lazy"
          onError={() => setLogoError(true)}
        />
      ) : (
        <span
          className={`${logoSizeClassName} shrink-0 inline-flex items-center justify-center rounded-full border border-white/20 bg-[#0a1d3a] text-sm leading-none`}
        >
          {fallback}
        </span>
      )}
      <span className={`${textClassName} min-w-0 truncate`}>{leagueName}</span>
    </span>
  );
}
