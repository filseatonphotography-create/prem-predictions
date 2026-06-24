function getMatchScoreForPrediction(match) {
  const score = match?.score || {};
  const status = String(match?.status || "").toUpperCase();
  const duration = String(score?.duration || "").toUpperCase();
  const fullTime = score.fullTime || {};
  const regularTime = score.regularTime || {};
  const halfTime = score.halfTime || {};

  if (!hasStartedMatchStatus(status)) {
    return { homeGoals: null, awayGoals: null, source: null };
  }

  const hasScore = (value) =>
    hasNumericScoreValue(value?.home) && hasNumericScoreValue(value?.away);

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

function hasNumericScoreValue(value) {
  return value !== null && value !== "" && Number.isFinite(Number(value));
}

function hasStartedMatchStatus(matchOrStatus) {
  const status = String(matchOrStatus?.status || matchOrStatus || "").toUpperCase();
  return ["IN_PLAY", "PAUSED", "LIVE", "FINISHED", "AWARDED"].includes(status);
}

module.exports = {
  getMatchScoreForPrediction,
  hasStartedMatchStatus,
  hasNumericScoreValue,
};
