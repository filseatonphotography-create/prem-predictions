// CommonJS: shared by the browser's polling hook and the Node results endpoint.
function getResultsCacheTtl(matches = [], now = Date.now()) {
  const matchday = matches.some(match => {
    const status = String(match.status || "").toUpperCase();
    if (["IN_PLAY", "PAUSED"].includes(status)) return true;
    const kickoff = Date.parse(match.utcDate || match.kickoff || "");
    return ["TIMED", "SCHEDULED"].includes(status) && Number.isFinite(kickoff)
      && kickoff - now <= 90 * 60000 && now - kickoff <= 180 * 60000;
  });
  return matchday ? 30 * 1000 : 5 * 60 * 1000;
}
function getResultsRefreshInterval(view, states = {}) {
  return ["liveStudio", "results", "predictions"].includes(view)
    || Object.values(states).some(state => ["IN_PLAY", "PAUSED"].includes(String(state?.status || "").toUpperCase()))
    ? 30 * 1000 : 2 * 60 * 1000;
}
module.exports = { getResultsCacheTtl, getResultsRefreshInterval };
