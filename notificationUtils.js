function didGoalCountIncrease(prevHome, prevAway, nextHome, nextAway) {
  if (!Number.isFinite(nextHome) || !Number.isFinite(nextAway)) return false;

  const hadPreviousScore = Number.isFinite(prevHome) && Number.isFinite(prevAway);
  const previousTotal = hadPreviousScore ? prevHome + prevAway : 0;
  return nextHome + nextAway > previousTotal;
}

function normalizeInternationalTeamName(name) {
  const normalized = String(name || "").trim();
  const aliases = {
    "bosnia herzegovina": "bosnia and herzegovina",
    "cape verde": "cabo verde",
    "czech republic": "czechia",
    "dr congo": "congo dr",
    "iran": "ir iran",
    "ivory coast": "cote divoire",
    "korea republic": "south korea",
    "turkey": "turkiye",
    "trkiye": "turkiye",
    "usa": "united states",
  };
  return aliases[normalized] || normalized;
}

function getDeviceSubscriptions(record) {
  const candidates = Array.isArray(record?.subscriptions)
    ? record.subscriptions
    : record?.subscription
    ? [record.subscription]
    : [];
  const byEndpoint = new Map();
  candidates.forEach((subscription) => {
    if (subscription?.endpoint) byEndpoint.set(subscription.endpoint, subscription);
  });
  return Array.from(byEndpoint.values());
}

function getPreviousLiveScore(prevState, prevResult) {
  const stateHome = Number(prevState?.homeGoals);
  const stateAway = Number(prevState?.awayGoals);
  if (Number.isFinite(stateHome) && Number.isFinite(stateAway)) {
    return { hadScoreBefore: true, prevHome: stateHome, prevAway: stateAway };
  }

  const resultHome = Number(prevResult?.homeGoals);
  const resultAway = Number(prevResult?.awayGoals);
  if (Number.isFinite(resultHome) && Number.isFinite(resultAway)) {
    return { hadScoreBefore: true, prevHome: resultHome, prevAway: resultAway };
  }

  return { hadScoreBefore: false, prevHome: null, prevAway: null };
}

module.exports = {
  didGoalCountIncrease,
  normalizeInternationalTeamName,
  getDeviceSubscriptions,
  getPreviousLiveScore,
};
