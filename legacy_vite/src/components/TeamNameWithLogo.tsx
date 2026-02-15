import { useEffect, useState } from "react";
import { getTeamEmoji } from "../utils/emojiMap";
import { fetchTeamLogo } from "../utils/teamLogoApi";

type TeamNameWithLogoProps = {
  teamName: string;
  textClassName?: string;
  logoSizeClassName?: string;
};

export default function TeamNameWithLogo({
  teamName,
  textClassName = "",
  logoSizeClassName = "w-6 h-6",
}: TeamNameWithLogoProps) {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLogoError(false);
    fetchTeamLogo(teamName).then((logo) => {
      if (cancelled) return;
      if (logo) setLogoUrl(logo);
    });

    return () => {
      cancelled = true;
    };
  }, [teamName]);

  return (
    <span className="inline-flex items-center gap-2 safe-wrap">
      {logoUrl && !logoError ? (
        <img
          src={logoUrl}
          alt={`${teamName} logo`}
          className={`${logoSizeClassName} rounded-full object-cover border border-white/20 bg-[#0a1d3a]`}
          loading="lazy"
          onError={() => setLogoError(true)}
        />
      ) : (
        <span className="text-lg leading-none">{getTeamEmoji(teamName)}</span>
      )}
      <span className={textClassName}>{teamName}</span>
    </span>
  );
}
