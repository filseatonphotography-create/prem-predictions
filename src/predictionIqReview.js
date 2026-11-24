import { getPredictionPoints, hasPredictionScore } from "./predictionRules";

export const OUTCOMES = [
  { key: "H", label: "Home wins", pick: "a home win", result: "ended in a home win" },
  { key: "D", label: "Draws", pick: "a draw", result: "finished level" },
  { key: "A", label: "Away wins", pick: "an away win", result: "ended in an away win" },
];

export const POINT_TIERS = [
  { points: 7, label: "Exact score" },
  { points: 4, label: "Result + goal difference" },
  { points: 2, label: "Result only" },
  { points: 0, label: "Wrong result" },
];

const outcomeOf = (home, away) => home > away ? "H" : home < away ? "A" : "D";

// Missing picks count toward fixture coverage and never enter accuracy calculations.
export function buildPredictionIqReview(fixtures, predictions, results) {
  const outcomes = Object.fromEntries(OUTCOMES.map(({ key }) => [key, { correct: 0, total: 0 }]));
  const misses = new Map();
  const tierCounts = { 7: 0, 4: 0, 2: 0, 0: 0 };
  let picks = 0;
  let correctResults = 0;
  let points = 0;
  let boostPoints = 0;
  let predictedGoals = 0;
  let actualGoals = 0;
  let oneGoalAway = 0;
  const rows = fixtures.map(fixture => {
    const prediction = predictions[fixture.id];
    const result = results[fixture.id];
    if (!hasPredictionScore(prediction)) {
      return { fixture, result, prediction: null, points: 0 };
    }

    const home = Number(prediction.homeGoals);
    const away = Number(prediction.awayGoals);
    const finalHome = Number(result.homeGoals);
    const finalAway = Number(result.awayGoals);
    const actual = outcomeOf(finalHome, finalAway);
    const predicted = outcomeOf(home, away);
    const correct = predicted === actual;
    const basePoints = getPredictionPoints({ homeGoals: home, awayGoals: away }, result);
    const earned = getPredictionPoints(prediction, result);
    const boost = prediction.isTriple ? 3 : prediction.isDouble ? 2 : 1;

    picks += 1;
    outcomes[actual].total += 1;
    outcomes[actual].correct += Number(correct);
    if (!correct) {
      const pair = `${predicted}:${actual}`;
      misses.set(pair, (misses.get(pair) || 0) + 1);
    }
    correctResults += Number(correct);
    tierCounts[basePoints] += 1;
    points += earned;
    boostPoints += earned - basePoints;
    predictedGoals += home + away;
    actualGoals += finalHome + finalAway;
    if (Math.abs(home - finalHome) + Math.abs(away - finalAway) === 1) oneGoalAway += 1;

    return { fixture, result, prediction, points: earned, basePoints, boost };
  });

  const exactScores = tierCounts[7];
  const rating = picks
    ? Math.round((correctResults * 58 + exactScores * 27) / picks + Math.min(15, points * 2 / picks))
    : 0;
  const [mostMissed, nextMostMissed] = [...misses].sort((a, b) => b[1] - a[1]);
  const [miss, count] = mostMissed || ["", 0];
  const [predicted, actual] = miss.split(":");
  const recurringMiss = count >= 2 && count > (nextMostMissed?.[1] || 0)
    ? { predicted, actual, count }
    : null;
  return {
    rows, outcomes, tierCounts, picks, correctResults, exactScores, points, boostPoints,
    predictedGoals, actualGoals, oneGoalAway, recurringMiss, rating,
  };
}
