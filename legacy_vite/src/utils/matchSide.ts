import type { Match } from "../data/mockData";

const swapScore = (score?: string) => {
  if (!score) return undefined;
  const m = score.match(/(\d+)\s*[:\-]\s*(\d+)/);
  if (!m) return score;
  return `${m[2]}:${m[1]}`;
};

const swapScoresInText = (text: string) =>
  text.replace(/(\d+)\s*[:\-]\s*(\d+)/g, (_full, left: string, right: string) => `${right}:${left}`);

export const flipMatchSides = (match: Match): Match => ({
  ...match,
  homeTeam: match.awayTeam,
  awayTeam: match.homeTeam,
  liveScore: swapScore(match.liveScore),
  odds: {
    home: match.odds.away,
    draw: match.odds.draw,
    away: match.odds.home,
  },
  prediction: {
    home: match.prediction.away,
    draw: match.prediction.draw,
    away: match.prediction.home,
  },
  expectedScore: {
    home: match.expectedScore.away,
    away: match.expectedScore.home,
  },
  handicap: {
    home: match.handicap.away,
    away: match.handicap.home,
  },
  signals: match.signals.map((line) => swapScoresInText(line)),
  predictionBasis: match.predictionBasis.map((line) => swapScoresInText(line)),
  monitorDetails: match.monitorDetails?.map((detail) => ({
    ...detail,
    value: swapScoresInText(detail.value),
  })),
  topScores: match.topScores.map((score) => ({
    ...score,
    home: score.away,
    away: score.home,
  })),
  market: match.market
    ? {
        ...match.market,
        publicML: match.market.publicML
          ? {
              home: match.market.publicML.away,
              draw: match.market.publicML.draw,
              away: match.market.publicML.home,
            }
          : undefined,
        publicAll: match.market.publicAll
          ? {
              home: match.market.publicAll.away,
              draw: match.market.publicAll.draw,
              away: match.market.publicAll.home,
            }
          : undefined,
        cashAll: match.market.cashAll
          ? {
              home: match.market.cashAll.away,
              draw: match.market.cashAll.draw,
              away: match.market.cashAll.home,
            }
          : undefined,
        cashAmount: match.market.cashAmount
          ? {
              home: match.market.cashAmount.away,
              draw: match.market.cashAmount.draw,
              away: match.market.cashAmount.home,
            }
          : undefined,
        ratio: match.market.ratio
          ? {
              publicHome: match.market.ratio.publicAway,
              publicAway: match.market.ratio.publicHome,
              cashHome: match.market.ratio.cashAway,
              cashAway: match.market.ratio.cashHome,
            }
          : undefined,
      }
    : undefined,
});
