// Shared by the results UI and the backend. Missing historical match states may
// fall back to a recorded score, but an explicit live/postponed state never does.
function canShowMatchHighlights(fixture = {}, score = {}, state = {}, nowMs = Date.now()) {
  const status = String(state.status || "").toUpperCase();
  if (status) return status === "FINISHED" || status === "AWARDED";
  const validScore = [score.homeGoals, score.awayGoals].every(value =>
    value !== null && value !== undefined && String(value).trim() !== "" && Number.isFinite(Number(value))
  );
  const kickoffMs = Date.parse(state.utcDate || fixture.kickoff);
  return validScore && Number.isFinite(kickoffMs) && nowMs >= kickoffMs + 3 * 60 * 60 * 1000;
}

module.exports = { canShowMatchHighlights };
