const { hasNumericScoreValue } = require("./matchScoreUtils");

function isFinalMatchStatus(matchOrStatus) {
  const status = String(matchOrStatus?.status || matchOrStatus || "").toUpperCase();
  return status === "FINISHED" || status === "AWARDED";
}

function hasUsableScore(result) {
  return Boolean(
    result &&
      hasNumericScoreValue(result.homeGoals) &&
      hasNumericScoreValue(result.awayGoals)
  );
}

function recoverFinishedResults(resultsByFixtureId = {}, matchStateByFixtureId = {}) {
  const recovered = { ...(resultsByFixtureId || {}) };
  const recoveredFixtureIds = [];

  Object.entries(matchStateByFixtureId || {}).forEach(([fixtureId, matchState]) => {
    if (!isFinalMatchStatus(matchState) || !hasUsableScore(matchState)) return;
    if (hasUsableScore(recovered[fixtureId])) return;

    recovered[fixtureId] = {
      homeGoals: Number(matchState.homeGoals),
      awayGoals: Number(matchState.awayGoals),
    };
    recoveredFixtureIds.push(String(fixtureId));
  });

  return { results: recovered, recoveredFixtureIds };
}

function buildSettledFixtureIdSet(
  fixtures = [],
  resultsByFixtureId = {},
  matchStateByFixtureId = {},
  options = {}
) {
  const nowMs = options.nowMs ?? Date.now();

  return new Set(
    (fixtures || [])
      .filter((fixture) => {
        const fixtureId = String(fixture.id);
        const result = resultsByFixtureId[fixtureId] || resultsByFixtureId[fixture.id];
        if (!hasUsableScore(result)) return false;

        const matchState =
          matchStateByFixtureId[fixtureId] || matchStateByFixtureId[fixture.id];
        if (matchState) return isFinalMatchStatus(matchState);

        // Backward-compatible fallback for historical results recorded before
        // match-state snapshots existed.
        const kickoffMs = Date.parse(fixture.kickoff);
        if (!Number.isFinite(kickoffMs)) return false;
        const bufferMs = fixture.knockoutStage
          ? 3 * 60 * 60 * 1000
          : 2 * 60 * 60 * 1000;
        return nowMs >= kickoffMs + bufferMs;
      })
      .map((fixture) => String(fixture.id))
  );
}

module.exports = {
  buildSettledFixtureIdSet,
  hasUsableScore,
  isFinalMatchStatus,
  recoverFinishedResults,
};
