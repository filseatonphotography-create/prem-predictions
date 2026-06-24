function getMatchScoreForPrediction(match) {
  const score = match?.score || {};
  const status = String(match?.status || "").toUpperCase();
  const duration = String(score?.duration || "").toUpperCase();
  const fullTime = score.fullTime || {};
  const regularTime = score.regularTime || {};
  const halfTime = score.halfTime || {};

  const hasScore = (value) =>
    Number.isFinite(Number(value?.home)) && Number.isFinite(Number(value?.away));

  if (status === "FINISHED" && duration === "EXTRA_TIME" && hasScore(fullTime)) {
    return {
      homeGoals: Number(fullTime.home),
      awayGoals: Number(fullTime.away),
      source: "fullTime",
    };
  }
  if (hasScore(regularTime)) {
    return {
      homeGoals: Number(regularTime.home),
      awayGoals: Number(regularTime.away),
      source: "regularTime",
    };
  }
  if (hasScore(fullTime)) {
    return {
      homeGoals: Number(fullTime.home),
      awayGoals: Number(fullTime.away),
      source: "fullTime",
    };
  }
  if (hasScore(halfTime)) {
    return {
      homeGoals: Number(halfTime.home),
      awayGoals: Number(halfTime.away),
      source: "halfTime",
    };
  }
  return { homeGoals: null, awayGoals: null, source: null };
}

module.exports = {
  getMatchScoreForPrediction,
};
