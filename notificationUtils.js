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

module.exports = { didGoalCountIncrease, normalizeInternationalTeamName };
