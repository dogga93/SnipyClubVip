import type { TeamPowerRanking } from "../utils/powerRankings";
import { getPowerStatusMeta } from "../utils/powerRankings";

type Props = {
  ranking: TeamPowerRanking | null;
  compact?: boolean;
};

export default function PowerRankingBadge({ ranking, compact = false }: Props) {
  if (!ranking) return null;

  const meta = getPowerStatusMeta(ranking.status);

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 font-semibold ${meta.toneClass} ${
        compact ? "text-[10px]" : "text-xs"
      }`}
      title={`#${ranking.rank} ${ranking.team} - ${meta.label}${ranking.streak ? ` (${ranking.streak})` : ""}`}
    >
      <span>{meta.emoji}</span>
      <span>#{ranking.rank}</span>
      {!compact && <span>{meta.label}</span>}
      {!!ranking.streak && <span>· {ranking.streak}</span>}
    </span>
  );
}
