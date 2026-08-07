function toFiniteChance(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 && number <= 100 ? number : null;
}

function getAvailabilityChance(player = {}) {
  return [
    player?.externalMetadata?.chanceOfPlayingNextRound,
    player?.externalMetadata?.chanceOfPlayingThisRound,
  ]
    .map(toFiniteChance)
    .find((value) => value != null);
}

function getRawAvailabilityStatus(player = {}) {
  return String(
    player?.externalMetadata?.rawStatus ??
      player?.externalMetadata?.status ??
      player?.rawStatus ??
      ""
  )
    .trim()
    .toLowerCase();
}

function hasAvailabilityNews(player = {}) {
  return String(player?.externalMetadata?.news || "").trim().length > 0;
}

export function hasActionableFantasyAvailabilityRisk(player = {}) {
  const status = String(player?.availabilityStatus || "unknown").toLowerCase();
  const rawStatus = getRawAvailabilityStatus(player);
  const chance = getAvailabilityChance(player);

  if (chance != null && chance < 100) return true;
  if (status === "doubtful" || rawStatus === "d") return true;
  if (["i", "s"].includes(rawStatus)) return true;
  if (status === "unavailable") return hasAvailabilityNews(player);
  return false;
}

export function getFantasyAvailabilityChance(player = {}) {
  return getAvailabilityChance(player);
}

export function getFantasyAvailabilityLabel(player = {}) {
  const status = String(player?.availabilityStatus || "unknown").toLowerCase();
  const rawStatus = getRawAvailabilityStatus(player);
  if (status && status !== "unknown") return status;
  if (rawStatus) return rawStatus;
  return "availability risk";
}
