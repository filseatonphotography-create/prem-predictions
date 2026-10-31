// Shared by the browser and notifier. Live scores are never badge results.
function validScore(score) {
  return score && [score.homeGoals, score.awayGoals].every(value => value !== null && value !== undefined
    && value !== "" && Number.isSafeInteger(Number(value)) && Number(value) >= 0);
}
function isFinalBadgeFixture(fixture, results = {}, states = {}) {
  return ["FINISHED", "AWARDED"].includes(String(states[fixture.id]?.status || "").toUpperCase())
    && Boolean(validScore(results[fixture.id]));
}
function countFinalPredictionBadges(fixtures = [], predictions = {}, results = {}, states = {}) {
  let exactScores = 0, correctCaptains = 0;
  const captainGameweeks = new Set();
  fixtures.forEach(fixture => {
    const prediction = predictions[fixture.id], result = results[fixture.id];
    if (!isFinalBadgeFixture(fixture, results, states) || !validScore(prediction)) return;
    const home = Number(prediction.homeGoals), away = Number(prediction.awayGoals);
    const actualHome = Number(result.homeGoals), actualAway = Number(result.awayGoals);
    if (home === actualHome && away === actualAway) exactScores += 1;
    if (prediction.isDouble && !captainGameweeks.has(fixture.gameweek)) {
      captainGameweeks.add(fixture.gameweek);
      if (Math.sign(home - away) === Math.sign(actualHome - actualAway)) correctCaptains += 1;
    }
  });
  return { exactScores, correctCaptains };
}
function validatePredictionBadgeRecord(record, fixtures, predictions, results, states) {
  const counts = countFinalPredictionBadges(fixtures, predictions, results, states);
  const thresholds = { sharpShooter: ["exactScores", 5], sniper: ["exactScores", 10], superSniper: ["exactScores", 20],
    captainClever: ["correctCaptains", 10], captainKing: ["correctCaptains", 20] };
  return Object.assign({}, record, counts, {
    earnedBadgeIds: (record.earnedBadgeIds || []).filter(id => !thresholds[id] || counts[thresholds[id][0]] >= thresholds[id][1]),
  });
}
function buildFinalBadgeAwards({ matches = [], fixtures = [], players = [], results = {}, states = {} }) {
  const completed = matches.filter(match => match.finished && isFinalBadgeFixture(match.fixture, results, states));
  if (!completed.length) return [];
  const ids = new Set(completed.map(match => String(match.fixture.id)));
  const beforeFixtures = fixtures.filter(fixture => !ids.has(String(fixture.id)));
  const milestones = [["sharpShooter", "exactScores", 5], ["sniper", "exactScores", 10], ["superSniper", "exactScores", 20],
    ["captainClever", "correctCaptains", 10], ["captainKing", "correctCaptains", 20]];
  const seen = new Set();
  const awards = [];
  players.forEach(player => {
    const key = String(player.userId || player.username || "");
    if (!key || seen.has(key)) return;
    seen.add(key);
    const before = countFinalPredictionBadges(beforeFixtures, player.predictions || {}, results, states);
    const after = countFinalPredictionBadges(fixtures, player.predictions || {}, results, states);
    milestones.forEach(([badgeId, stat, threshold]) => {
      if (before[stat] < threshold && after[stat] >= threshold) awards.push({ badgeId, userId: player.userId || "",
        username: player.username, milestone: `${threshold} ${stat === "exactScores" ? "exact scores" : "correct captain selections"}` });
    });
  });
  return awards;
}
module.exports = { buildFinalBadgeAwards, isFinalBadgeFixture, countFinalPredictionBadges, validatePredictionBadgeRecord };
