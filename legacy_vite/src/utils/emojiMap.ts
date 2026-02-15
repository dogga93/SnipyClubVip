const COUNTRY_FLAG_TOKENS: Array<{ tokens: string[]; flag: string }> = [
  { tokens: ["england", "premier league", "championship"], flag: "🏴" },
  { tokens: ["spain", "la liga"], flag: "🇪🇸" },
  { tokens: ["italy", "serie a"], flag: "🇮🇹" },
  { tokens: ["germany", "bundesliga"], flag: "🇩🇪" },
  { tokens: ["france", "ligue 1"], flag: "🇫🇷" },
  { tokens: ["netherlands", "eredi"], flag: "🇳🇱" },
  { tokens: ["portugal"], flag: "🇵🇹" },
  { tokens: ["belgium"], flag: "🇧🇪" },
  { tokens: ["switzerland"], flag: "🇨🇭" },
  { tokens: ["austria"], flag: "🇦🇹" },
  { tokens: ["turkey"], flag: "🇹🇷" },
  { tokens: ["saudi", "arabia"], flag: "🇸🇦" },
  { tokens: ["israel"], flag: "🇮🇱" },
  { tokens: ["hungary"], flag: "🇭🇺" },
  { tokens: ["greece"], flag: "🇬🇷" },
  { tokens: ["croatia"], flag: "🇭🇷" },
  { tokens: ["serbia"], flag: "🇷🇸" },
  { tokens: ["poland"], flag: "🇵🇱" },
  { tokens: ["denmark"], flag: "🇩🇰" },
  { tokens: ["sweden"], flag: "🇸🇪" },
  { tokens: ["norway"], flag: "🇳🇴" },
  { tokens: ["finland"], flag: "🇫🇮" },
  { tokens: ["usa", "united states", "mls", "nfl", "nba", "nhl", "mlb", "ncaab"], flag: "🇺🇸" },
  { tokens: ["mexico"], flag: "🇲🇽" },
  { tokens: ["argentina"], flag: "🇦🇷" },
  { tokens: ["brazil"], flag: "🇧🇷" },
  { tokens: ["japan"], flag: "🇯🇵" },
  { tokens: ["korea"], flag: "🇰🇷" },
  { tokens: ["china"], flag: "🇨🇳" },
  { tokens: ["india"], flag: "🇮🇳" },
  { tokens: ["australia"], flag: "🇦🇺" },
  { tokens: ["europe", "uefa", "champions league", "europa"], flag: "🇪🇺" },
];

const TEAM_KEYWORD_EMOJI: Array<{ tokens: string[]; emoji: string }> = [
  { tokens: ["united", "fc", "sc", "club", "sporting"], emoji: "🛡️" },
  { tokens: ["city", "town", "athletic", "atletico"], emoji: "🏙️" },
  { tokens: ["real", "royal"], emoji: "👑" },
  { tokens: ["saint", "st "], emoji: "⭐" },
  { tokens: ["dynamo", "dinamo"], emoji: "⚡" },
  { tokens: ["racing"], emoji: "🏁" },
  { tokens: ["river"], emoji: "🌊" },
  { tokens: ["eagles", "hawk", "falcon"], emoji: "🦅" },
  { tokens: ["lion", "tiger", "panther", "wolf", "fox", "bear"], emoji: "🐾" },
];

const TEAM_FALLBACKS = ["🛡️", "🔥", "⚡", "⭐", "🎯", "🦁", "🦅", "🐺", "🚀", "💎"];

const normalize = (value: string) => value.toLowerCase().trim();

const hash = (value: string) => {
  let result = 0;
  for (let index = 0; index < value.length; index += 1) {
    result = (result * 31 + value.charCodeAt(index)) | 0;
  }
  return Math.abs(result);
};

export const getLeagueFlag = (flag: string | undefined, country: string | undefined, leagueName: string): string => {
  if (flag && flag !== "🏁") return flag;
  const source = normalize(`${country ?? ""} ${leagueName}`);
  const match = COUNTRY_FLAG_TOKENS.find((entry) => entry.tokens.some((token) => source.includes(token)));
  return match?.flag ?? "🏳️";
};

export const getLeagueEmoji = (leagueName: string): string => {
  const text = normalize(leagueName);
  if (text.includes("cup")) return "🏆";
  if (text.includes("champions")) return "👑";
  if (text.includes("division")) return "🥇";
  if (text.includes("liga") || text.includes("league")) return "🏟️";
  if (text.includes("playoff")) return "🔥";
  return "🏅";
};

export const getTeamEmoji = (teamName: string): string => {
  const text = normalize(teamName);
  const keywordMatch = TEAM_KEYWORD_EMOJI.find((entry) => entry.tokens.some((token) => text.includes(token)));
  if (keywordMatch) return keywordMatch.emoji;
  return TEAM_FALLBACKS[hash(teamName) % TEAM_FALLBACKS.length];
};
