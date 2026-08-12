import {
  getFantasyAvailabilityChance,
  hasActionableFantasyAvailabilityRisk,
} from "./availability";

export const FANTASY_SUGGESTED_TEAM_VERSION = "suggested-team-v1";

export const FANTASY_SUGGESTED_TEAM_CONFIG = {
  budget: 100,
  maxPlayersPerClub: 3,
  candidateLimitByPosition: {
    GK: 18,
    DEF: 34,
    MID: 42,
    FWD: 28,
  },
  positions: {
    GK: 2,
    DEF: 5,
    MID: 5,
    FWD: 3,
  },
  starterFormations: [
    { label: "3-4-3", counts: { GK: 1, DEF: 3, MID: 4, FWD: 3 } },
    { label: "3-5-2", counts: { GK: 1, DEF: 3, MID: 5, FWD: 2 } },
    { label: "4-3-3", counts: { GK: 1, DEF: 4, MID: 3, FWD: 3 } },
    { label: "4-4-2", counts: { GK: 1, DEF: 4, MID: 4, FWD: 2 } },
    { label: "4-5-1", counts: { GK: 1, DEF: 4, MID: 5, FWD: 1 } },
    { label: "5-3-2", counts: { GK: 1, DEF: 5, MID: 3, FWD: 2 } },
    { label: "5-4-1", counts: { GK: 1, DEF: 5, MID: 4, FWD: 1 } },
  ],
  valueBiases: [0, 0.25, 0.5, 0.85, 1.2, 1.6],
  premiumBiases: [0, 0.2, 0.45, 0.7],
  preferredMinimumSpend: 97,
  idealSpend: 99,
  minimumSquadLikelihood: 28,
  minimumStartingXiLikelihood: 62,
  minimumReliableStarts: 4,
  minimumReliableMinutes: 540,
  minimumReliableSelectedByPercent: 2,
  minimumReliablePointsPerGame: 2.5,
  minimumStarterMinutes: 650,
  minimumStarterStarts: 6,
  minimumRecentStarterStarts: 3,
  consecutiveStartThreshold: 5,
  consecutiveNonStartThreshold: 5,
  noRecentDataStarterMinutes: 1800,
  noRecentDataStarterStarts: 20,
  premiumAttackerPrice: 8,
  mustStartAttackerPrice: 7,
  mustStartAttackerFixtureScore: 68,
  premiumForwardPrice: 8.5,
  softPlayersPerClub: 2,
  thirdClubPlayerRequiredEdge: 18,
  thirdClubPlayerPenalty: 7,
  minimumRecommendedScore: 85,
  styles: {
    balanced: {
      label: "Balanced",
      positionBias: { GK: 0, DEF: 0, MID: 0, FWD: 0 },
      premiumBias: { GK: 0.95, DEF: 1, MID: 1, FWD: 1 },
      fixtureBias: { attack: 1, defence: 1 },
      selectionOrder: ["MID", "FWD", "DEF", "GK", "MID", "DEF", "FWD", "GK"],
      formations: ["4-4-2", "3-5-2", "4-3-3", "3-4-3", "4-5-1", "5-3-2", "5-4-1"],
      goalkeeperStrategy: "rotate",
      benchPricePenalty: { GK: 0.15, DEF: 0.35, MID: 0.35, FWD: 0.45 },
      starterSpendBonus: { GK: 0.2, DEF: 0.45, MID: 0.55, FWD: 0.55 },
      starterMinimumMinutes: 650,
      starterMinimumStarts: 6,
      premiumAttackerMustStart: true,
      maxStartingDefensivePlayersPerClub: 1,
    },
    attacking: {
      label: "Attacking",
      positionBias: { GK: -4, DEF: -2, MID: 5, FWD: 8 },
      premiumBias: { GK: 0.75, DEF: 0.85, MID: 1.2, FWD: 1.28 },
      fixtureBias: { attack: 1.12, defence: 0.92 },
      selectionOrder: ["FWD", "MID", "MID", "FWD", "DEF", "GK", "MID", "DEF", "GK"],
      formations: ["3-4-3", "3-5-2", "4-3-3", "4-4-2", "4-5-1", "5-3-2", "5-4-1"],
      goalkeeperStrategy: "single",
      backupGoalkeeperMaxPrice: 4.5,
      benchPricePenalty: { GK: 2.4, DEF: 1.5, MID: 1.8, FWD: 2.1 },
      starterSpendBonus: { GK: 0.1, DEF: 0.25, MID: 1.15, FWD: 1.35 },
      starterMinimumMinutes: 700,
      starterMinimumStarts: 7,
      premiumAttackerMustStart: true,
      allowBenchEnabler: true,
      maxBenchEnablers: 1,
      benchEnablerMaxPrice: { DEF: 4.5, MID: 4.5, FWD: 4.5 },
    },
    defensive: {
      label: "Defensive",
      positionBias: { GK: 8, DEF: 7, MID: 2, FWD: -7 },
      premiumBias: { GK: 1.3, DEF: 1.25, MID: 1.05, FWD: 0.68 },
      fixtureBias: { attack: 0.92, defence: 1.12 },
      selectionOrder: ["DEF", "GK", "DEF", "MID", "DEF", "MID", "GK", "DEF", "FWD"],
      formations: ["5-4-1", "5-3-2", "4-5-1", "4-4-2", "3-5-2", "4-3-3", "3-4-3"],
      goalkeeperStrategy: "rotate",
      benchPricePenalty: { GK: 0.15, DEF: 0.25, MID: 0.45, FWD: 3.4 },
      starterSpendBonus: { GK: 1.1, DEF: 1.2, MID: 0.75, FWD: -0.35 },
      starterMinimumMinutes: 650,
      starterMinimumStarts: 6,
      singleForwardRequiresPremium: true,
      singleForwardMinimumFixtureScore: 62,
      premiumAttackerMustStart: true,
      expensiveAttackerMustStart: true,
      maxStartingDefensivePlayersPerClub: 2,
    },
  },
};

function numberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function round(value, digits = 1) {
  const number = numberOrNull(value);
  if (number == null) return null;
  const factor = 10 ** digits;
  return Math.round(number * factor) / factor;
}

function getPlayerPrice(player = {}) {
  const price = numberOrNull(player.price);
  if (price != null && price > 0) return price;
  const priceTenths = numberOrNull(player.priceTenths ?? player.externalMetadata?.nowCost);
  return priceTenths != null && priceTenths > 0 ? priceTenths / 10 : null;
}

function scale(value, min, max, fallback = 50) {
  const number = numberOrNull(value);
  if (number == null) return fallback;
  return clamp(((number - min) / (max - min)) * 100, 0, 100);
}

function getFormScore(player = {}) {
  const meta = player.externalMetadata || {};
  const form = scale(meta.form, 0, 10, null);
  const pointsPerGame = scale(meta.pointsPerGame, 0, 8, null);
  const minutes = scale(meta.minutes, 0, 900, null);
  const starts = scale(meta.starts, 0, 10, null);
  const selected = scale(meta.selectedByPercent, 0, 35, null);
  const scores = [
    { value: form, weight: 0.35 },
    { value: pointsPerGame, weight: 0.25 },
    { value: minutes, weight: 0.18 },
    { value: starts, weight: 0.12 },
    { value: selected, weight: 0.1 },
  ].filter((item) => item.value != null);
  const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
  if (!scores.length || totalWeight <= 0) return 50;
  return scores.reduce((sum, item) => sum + item.value * (item.weight / totalWeight), 0);
}

function getStarterLikelihoodScore(player = {}) {
  const meta = player.externalMetadata || {};
  const minutes = scale(meta.minutes, 0, 900, null);
  const starts = scale(meta.starts, 0, 10, null);
  const pointsPerGame = scale(meta.pointsPerGame, 0, 8, null);
  const selected = scale(meta.selectedByPercent, 0, 35, null);
  const scores = [
    { value: minutes, weight: 0.42 },
    { value: starts, weight: 0.34 },
    { value: pointsPerGame, weight: 0.14 },
    { value: selected, weight: 0.1 },
  ].filter((item) => item.value != null);
  const totalWeight = scores.reduce((sum, item) => sum + item.weight, 0);
  if (!scores.length || totalWeight <= 0) return 58;
  return scores.reduce((sum, item) => sum + item.value * (item.weight / totalWeight), 0);
}

function hasWeakStartingEvidence(player = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  const meta = player.externalMetadata || {};
  const starts = numberOrNull(meta.starts);
  const minutes = numberOrNull(meta.minutes);
  const selectedByPercent = numberOrNull(meta.selectedByPercent);
  const pointsPerGame = numberOrNull(meta.pointsPerGame);
  const form = numberOrNull(meta.form);
  const knownSignals = [starts, minutes, selectedByPercent, pointsPerGame, form].filter((value) => value != null).length;
  if (knownSignals < 3) return false;
  const lowStarts = starts != null && starts < config.minimumReliableStarts;
  const lowMinutes = minutes != null && minutes < config.minimumReliableMinutes;
  const ignoredByManagers = selectedByPercent != null && selectedByPercent < config.minimumReliableSelectedByPercent;
  const lowOutput = pointsPerGame != null && pointsPerGame < config.minimumReliablePointsPerGame;
  const noForm = form != null && form <= 0.1;
  return [lowStarts, lowMinutes, ignoredByManagers, lowOutput, noForm].filter(Boolean).length >= 3;
}

function getRecentStartSignals(player = {}) {
  const meta = player.externalMetadata || {};
  const startsLast5 = numberOrNull(meta.startsLast5 ?? meta.lastFiveStarts);
  const startsLast6 = numberOrNull(meta.startsLast6 ?? meta.lastSixStarts);
  const recentStarts = numberOrNull(
    meta.recentStarts ??
    startsLast5 ??
    startsLast6
  );
  return {
    startsLast5,
    startsLast6,
    recentStarts,
    consecutiveStarts: numberOrNull(
      meta.consecutiveStarts ??
      meta.currentConsecutiveStarts ??
      meta.recentConsecutiveStarts
    ),
    consecutiveNonStarts: numberOrNull(
      meta.consecutiveNonStarts ??
      meta.currentConsecutiveNonStarts ??
      meta.recentConsecutiveNonStarts
    ),
  };
}

function hasStrongRecentStarterEvidence(player = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  const threshold = Number(config.consecutiveStartThreshold || 5);
  const { consecutiveStarts, startsLast5 } = getRecentStartSignals(player);
  return (
    (consecutiveStarts != null && consecutiveStarts >= threshold) ||
    (startsLast5 != null && startsLast5 >= threshold)
  );
}

function hasClearRecentNonStarterEvidence(player = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  const threshold = Number(config.consecutiveNonStartThreshold || 5);
  const { consecutiveNonStarts, startsLast5 } = getRecentStartSignals(player);
  return (
    (consecutiveNonStarts != null && consecutiveNonStarts >= threshold) ||
    (startsLast5 != null && startsLast5 <= 0)
  );
}

function hasRecentStartData(player = {}) {
  const { startsLast5, startsLast6, recentStarts, consecutiveStarts, consecutiveNonStarts } = getRecentStartSignals(player);
  return [startsLast5, startsLast6, recentStarts, consecutiveStarts, consecutiveNonStarts].some((value) => value != null);
}

function hasStrongSeasonStarterBaseline(player = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  const meta = player.externalMetadata || {};
  const minutes = numberOrNull(meta.minutes);
  const starts = numberOrNull(meta.starts);
  const minimumMinutes = Number(config.noRecentDataStarterMinutes || 1800);
  const minimumStarts = Number(config.noRecentDataStarterStarts || 20);
  if (minutes == null || starts == null) return false;
  return minutes >= minimumMinutes && starts >= minimumStarts;
}

function hasStarterRoleDoubt(player = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  if (hasStrongRecentStarterEvidence(player, config)) return false;
  if (hasClearRecentNonStarterEvidence(player, config)) return true;
  const meta = player.externalMetadata || {};
  const starts = numberOrNull(meta.starts);
  const minutes = numberOrNull(meta.minutes);
  const pointsPerGame = numberOrNull(meta.pointsPerGame);
  const selectedByPercent = numberOrNull(meta.selectedByPercent);
  const { recentStarts } = getRecentStartSignals(player);
  const minimumStarts = Number(config.minimumStarterStarts || 6);
  const minimumMinutes = Number(config.minimumStarterMinutes || 650);
  const minimumRecentStarts = Number(config.minimumRecentStarterStarts || 3);
  const knownRoleSignals = [starts, minutes].filter((value) => value != null).length;
  if (recentStarts != null && recentStarts < minimumRecentStarts) return true;
  if (!hasRecentStartData(player) && !hasStrongSeasonStarterBaseline(player, config)) return true;
  if (!knownRoleSignals) return false;
  if (starts != null && starts < minimumStarts) return true;
  if (minutes != null && minutes < minimumMinutes) return true;
  const lowOutput = pointsPerGame != null && pointsPerGame < config.minimumReliablePointsPerGame;
  const ignoredByManagers = selectedByPercent != null && selectedByPercent < config.minimumReliableSelectedByPercent;
  return lowOutput && ignoredByManagers;
}

function isAttackingBenchEnablerCandidate(player = {}, styleConfig = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  if (!styleConfig.allowBenchEnabler) return false;
  const position = String(player.position || "").toUpperCase();
  if (!["DEF", "MID", "FWD"].includes(position)) return false;
  if (hasActionableFantasyAvailabilityRisk(player)) return false;
  if (!hasWeakStartingEvidence(player, config)) return false;
  const maxPrice = numberOrNull(styleConfig.benchEnablerMaxPrice?.[position]) ?? 4.5;
  const price = getPlayerPrice(player);
  return price != null && price <= maxPrice;
}

function getPredictionScore(position, predictionOutlook = {}) {
  if (!predictionOutlook || predictionOutlook.overallScore == null) return null;
  if (["GK", "DEF"].includes(position)) return predictionOutlook.defenceScore ?? predictionOutlook.overallScore;
  return predictionOutlook.attackScore ?? predictionOutlook.overallScore;
}

function getStyleConfig(style, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  return config.styles?.[style] || config.styles?.balanced || {};
}

function getFixtureScore(position, clubOutlook = {}, styleConfig = {}) {
  if (!clubOutlook || clubOutlook.overallScore == null) return null;
  const attackScore = (clubOutlook.attackScore ?? clubOutlook.overallScore) * (styleConfig.fixtureBias?.attack ?? 1);
  const defenceScore = (clubOutlook.defenceScore ?? clubOutlook.overallScore) * (styleConfig.fixtureBias?.defence ?? 1);
  const overallScore = clubOutlook.overallScore ?? 50;
  if (position === "GK") return defenceScore * 0.9 + overallScore * 0.1;
  if (position === "DEF") return defenceScore * 0.75 + attackScore * 0.1 + overallScore * 0.15;
  if (position === "MID") return attackScore * 0.72 + overallScore * 0.28;
  if (position === "FWD") return attackScore * 0.82 + overallScore * 0.18;
  return clubOutlook.overallScore;
}

function scoreCandidate(player, clubOutlook, predictionOutlook, styleConfig = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  const position = String(player.position || "").toUpperCase();
  const price = getPlayerPrice(player);
  const fixtureScore = getFixtureScore(position, clubOutlook, styleConfig);
  if (fixtureScore == null || price == null) return null;
  const formScore = getFormScore(player);
  const starterLikelihoodScore = getStarterLikelihoodScore(player);
  const predictionScore = getPredictionScore(position, predictionOutlook);
  const valueScore = clamp((fixtureScore * 0.7 + formScore * 0.3) / Math.max(4, price) * 8.8, 0, 100);
  const premiumScore = scale(price, 4, position === "GK" ? 7 : position === "DEF" ? 8 : 14, 40) * (styleConfig.premiumBias?.[position] || 1);
  const availabilityChance = getFantasyAvailabilityChance(player);
  const risk = hasActionableFantasyAvailabilityRisk(player);
  const weakStartingEvidence = hasWeakStartingEvidence(player, config);
  const starterRoleDoubt = hasStarterRoleDoubt(player, config);
  const availabilityPenalty = risk ? 100 - (availabilityChance ?? 35) : 0;
  const rotationPenalty = weakStartingEvidence ? 28 : 0;
  const roleDoubtPenalty = starterRoleDoubt ? 18 : 0;
  const score =
    fixtureScore * 0.43 +
    starterLikelihoodScore * 0.2 +
    premiumScore * 0.16 +
    formScore * 0.12 +
    (predictionScore ?? fixtureScore) * 0.06 +
    valueScore * 0.03 -
    availabilityPenalty * 0.8 -
    rotationPenalty -
    roleDoubtPenalty +
    (styleConfig.positionBias?.[position] || 0);
  return {
    ...player,
    price,
    position,
    fixtureScore: round(fixtureScore),
    formScore: round(formScore),
    starterLikelihoodScore: round(starterLikelihoodScore),
    premiumScore: round(premiumScore),
    valueScore: round(valueScore),
    predictionScore: round(predictionScore),
    suggestedScore: round(clamp(score, 0, 100), 2),
    availabilityRisk: risk,
    weakStartingEvidence,
    starterRoleDoubt,
    benchEnablerEligible: isAttackingBenchEnablerCandidate(player, styleConfig, config),
    clubOutlook,
    predictionOutlook,
  };
}

function getMinRemainingCost(candidatesByPosition, remainingCounts, excludedIds = new Set()) {
  return Object.entries(remainingCounts).reduce((sum, [position, count]) => {
    if (count <= 0) return sum;
    const prices = (candidatesByPosition[position] || [])
      .filter((player) => !excludedIds.has(player.id))
      .map((player) => player.price)
      .filter((price) => price != null)
      .sort((a, b) => a - b)
      .slice(0, count);
    if (prices.length < count) return Infinity;
    return sum + prices.reduce((inner, price) => inner + price, 0);
  }, 0);
}

function countByClub(players = []) {
  return players.reduce((out, player) => {
    out[player.teamCode] = (out[player.teamCode] || 0) + 1;
    return out;
  }, {});
}

function countBenchEnablers(players = []) {
  return players.filter((player) => player.benchEnablerEligible).length;
}

function getSelectionScore(player, valueBias = 0, premiumBias = 0, clubCounts = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  const stackPenalty = (clubCounts[player.teamCode] || 0) >= config.softPlayersPerClub ? config.thirdClubPlayerPenalty : 0;
  return player.suggestedScore + player.valueScore * valueBias + player.premiumScore * premiumBias - stackPenalty;
}

function getPreferredFormationCounts(styleConfig = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  const preferredLabel = styleConfig.formations?.[0];
  return config.starterFormations.find((formation) => formation.label === preferredLabel)?.counts || config.starterFormations[0]?.counts || {};
}

function getPositionSelectedCount(players = [], position = "") {
  return players.filter((player) => player.position === position).length;
}

function getStyleAwareSelectionScore({
  player,
  selected = [],
  valueBias = 0,
  premiumBias = 0,
  clubCounts = {},
  styleConfig = {},
  config = FANTASY_SUGGESTED_TEAM_CONFIG,
} = {}) {
  const base = getSelectionScore(player, valueBias, premiumBias, clubCounts, config);
  const preferredCounts = getPreferredFormationCounts(styleConfig, config);
  const alreadySelectedAtPosition = getPositionSelectedCount(selected, player.position);
  const likelyBenchAtPosition = alreadySelectedAtPosition >= Number(preferredCounts[player.position] || 0);
  const starterSpendBonus = Number(styleConfig.starterSpendBonus?.[player.position] ?? 0);
  if (!likelyBenchAtPosition) return base + Math.max(0, player.price - 4.5) * starterSpendBonus;
  if (player.position === "GK" && styleConfig.goalkeeperStrategy === "single" && Number(styleConfig.backupGoalkeeperMaxPrice)) {
    const cap = Number(styleConfig.backupGoalkeeperMaxPrice);
    return base - Math.max(0, player.price - cap) * 100 - player.price * 3;
  }
  const benchPenalty = Number(styleConfig.benchPricePenalty?.[player.position] ?? 1);
  const cheapBenchBonus = Math.max(0, 5 - player.price) * 1.2;
  return base - Math.max(0, player.price - 4.5) * benchPenalty + cheapBenchBonus;
}

function getBudgetUsed(players = []) {
  return players.reduce((sum, player) => sum + Number(player.price || 0), 0);
}

function isPremiumAttacker(player = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  return ["MID", "FWD"].includes(player.position) && Number(player.price || 0) >= Number(config.premiumAttackerPrice || 8);
}

function isMustStartAttacker(player = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  return ["MID", "FWD"].includes(player.position) &&
    Number(player.price || 0) >= Number(config.mustStartAttackerPrice || 7) &&
    Number(player.fixtureScore || 0) >= Number(config.mustStartAttackerFixtureScore || 68);
}

function isPremiumForward(player = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  return player.position === "FWD" && Number(player.price || 0) >= Number(config.premiumForwardPrice || 8.5);
}

function hasStyleStarterEvidence(player = {}, styleConfig = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  if (player.benchEnablerEligible) return false;
  if (Number(player.starterLikelihoodScore || 0) < Number(config.minimumStartingXiLikelihood || 0)) return false;
  if (player.starterRoleDoubt || hasStarterRoleDoubt(player, config)) return false;
  if (hasStrongRecentStarterEvidence(player, config)) return true;
  const minutes = numberOrNull(player.externalMetadata?.minutes);
  const starts = numberOrNull(player.externalMetadata?.starts);
  const minimumMinutes = numberOrNull(styleConfig.starterMinimumMinutes) ?? numberOrNull(config.minimumStarterMinutes);
  const minimumStarts = numberOrNull(styleConfig.starterMinimumStarts) ?? numberOrNull(config.minimumStarterStarts);
  if (minimumMinutes != null && minutes != null && minutes < minimumMinutes) return false;
  if (minimumStarts != null && starts != null && starts < minimumStarts) return false;
  return true;
}

function getDefensiveStarterStackPenalty(starters = [], styleConfig = {}) {
  const maxPerClub = numberOrNull(styleConfig.maxStartingDefensivePlayersPerClub);
  if (!maxPerClub) return 0;
  const counts = starters
    .filter((player) => ["GK", "DEF"].includes(player.position))
    .reduce((out, player) => {
      out[player.teamCode] = (out[player.teamCode] || 0) + 1;
      return out;
    }, {});
  return Object.values(counts).reduce((sum, count) => sum + Math.max(0, count - maxPerClub) * 70, 0);
}

function getBenchPremiumWaste(squad = {}, styleConfig = {}) {
  return (squad.players || [])
    .filter((player) => player.squadRole === "bench")
    .reduce((sum, player) => {
      const threshold =
        player.position === "GK" ? (styleConfig.goalkeeperStrategy === "single" ? Number(styleConfig.backupGoalkeeperMaxPrice || 4.8) : 6.2) :
        player.position === "DEF" ? 5.5 :
        player.position === "MID" ? 7 :
        7;
      const penalty = Number(styleConfig.benchPricePenalty?.[player.position] ?? 1);
      const premiumAttackerPenalty = styleConfig.premiumAttackerMustStart && ["MID", "FWD"].includes(player.position)
        ? Math.max(0, Number(player.price || 0) - 8) * 2.5
        : 0;
      return sum + Math.max(0, Number(player.price || 0) - threshold) * penalty + premiumAttackerPenalty;
    }, 0);
}

function getBenchedPremiumStarterAttackers(squad = {}, styleConfig = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  if (!styleConfig.premiumAttackerMustStart) return [];
  const startingAttackers = (squad.players || []).filter((player) =>
    player.squadRole === "starter" &&
    ["MID", "FWD"].includes(player.position)
  );
  const cheapestStartingAttackerPrice = Math.min(
    ...startingAttackers.map((player) => Number(player.price || 0)).filter((price) => price > 0)
  );
  return (squad.players || []).filter((player) =>
    player.squadRole === "bench" &&
    (
      isPremiumAttacker(player, config) ||
      isMustStartAttacker(player, config) ||
      (
        styleConfig.expensiveAttackerMustStart &&
        ["MID", "FWD"].includes(player.position) &&
        Number.isFinite(cheapestStartingAttackerPrice) &&
        Number(player.price || 0) > cheapestStartingAttackerPrice + 0.05
      )
    ) &&
    hasStyleStarterEvidence(player, styleConfig, config)
  );
}

function uniquePlayersById(players = []) {
  const seen = new Set();
  return players.filter((player) => {
    if (!player?.id || seen.has(player.id)) return false;
    seen.add(player.id);
    return true;
  });
}

function hasThirdClubPlayerEdge({
  candidate,
  pool = [],
  selectedIds = new Set(),
  clubCounts = {},
  budgetUsed = 0,
  remainingAfterPosition = {},
  candidatesByPosition = {},
  config = FANTASY_SUGGESTED_TEAM_CONFIG,
  valueBias = 0,
  premiumBias = 0,
} = {}) {
  if ((clubCounts[candidate.teamCode] || 0) < config.softPlayersPerClub) return true;
  const candidateScore = getSelectionScore(candidate, valueBias, premiumBias, clubCounts, config);
  const bestAlternative = pool
    .filter((player) => player.id !== candidate.id)
    .filter((player) => !selectedIds.has(player.id))
    .filter((player) => (clubCounts[player.teamCode] || 0) < config.softPlayersPerClub)
    .filter((player) => {
      const nextBudget = budgetUsed + player.price;
      const minRemaining = getMinRemainingCost(
        candidatesByPosition,
        remainingAfterPosition,
        new Set([...selectedIds, player.id])
      );
      return nextBudget + minRemaining <= config.budget + 0.001;
    })
    .sort((a, b) => getSelectionScore(b, valueBias, premiumBias, clubCounts, config) - getSelectionScore(a, valueBias, premiumBias, clubCounts, config))[0];
  if (!bestAlternative) return true;
  return candidateScore >= getSelectionScore(bestAlternative, valueBias, premiumBias, clubCounts, config) + config.thirdClubPlayerRequiredEdge;
}

function upgradeSquad(selected, candidatesByPosition, config, valueBias = 0, premiumBias = 0, styleConfig = {}) {
  let current = [...selected];
  const maxUpgrades = 24;
  for (let upgradeCount = 0; upgradeCount < maxUpgrades; upgradeCount += 1) {
    const budgetUsed = getBudgetUsed(current);
    const selectedIds = new Set(current.map((player) => player.id));
    const clubCounts = countByClub(current);
    const upgrades = current
      .flatMap((outgoing, index) =>
        (candidatesByPosition[outgoing.position] || [])
          .filter((incoming) => !selectedIds.has(incoming.id))
          .map((incoming) => {
            if (styleConfig.allowBenchEnabler && outgoing.benchEnablerEligible) return null;
            const nextClubCounts = { ...clubCounts };
            nextClubCounts[outgoing.teamCode] = Math.max(0, (nextClubCounts[outgoing.teamCode] || 0) - 1);
            if ((nextClubCounts[incoming.teamCode] || 0) >= config.maxPlayersPerClub) return null;
            const nextBudget = budgetUsed - outgoing.price + incoming.price;
            if (nextBudget > config.budget + 0.001) return null;
            if (styleConfig.allowBenchEnabler) {
              const nextBenchEnablers = countBenchEnablers(current) - (outgoing.benchEnablerEligible ? 1 : 0) + (incoming.benchEnablerEligible ? 1 : 0);
              if (nextBenchEnablers > (styleConfig.maxBenchEnablers ?? 1)) return null;
            } else if (incoming.benchEnablerEligible) {
              return null;
            }
            const outgoingClubCounts = { ...clubCounts, [outgoing.teamCode]: Math.max(0, (clubCounts[outgoing.teamCode] || 0) - 1) };
            if (!hasThirdClubPlayerEdge({
              candidate: incoming,
              pool: candidatesByPosition[outgoing.position] || [],
              selectedIds,
              clubCounts: outgoingClubCounts,
              budgetUsed: budgetUsed - outgoing.price,
              remainingAfterPosition: {},
              candidatesByPosition,
              config,
              valueBias,
              premiumBias,
            })) return null;
            const scoreGain = getSelectionScore(incoming, valueBias, premiumBias, outgoingClubCounts, config) - getSelectionScore(outgoing, valueBias, premiumBias, clubCounts, config);
            const spendGain = incoming.price - outgoing.price;
            if (scoreGain <= 0.05 && spendGain <= 0) return null;
            const underSpendBonus = budgetUsed < config.preferredMinimumSpend && spendGain > 0 ? spendGain * 0.45 : 0;
            return { index, incoming, gain: scoreGain + underSpendBonus, scoreGain, spendGain, nextBudget };
          })
          .filter(Boolean)
      )
      .sort((a, b) => b.gain - a.gain || b.nextBudget - a.nextBudget);
    const best = upgrades[0];
    if (!best || best.gain <= 0.05) break;
    current = current.map((player, index) => (index === best.index ? best.incoming : player));
  }
  return current;
}

function diversifyClubStacks(selected, candidatesByPosition, config, valueBias = 0, premiumBias = 0, styleConfig = {}) {
  let current = [...selected];
  let changed = true;
  while (changed) {
    changed = false;
    const clubCounts = countByClub(current);
    const stackedClub = Object.entries(clubCounts).find(([, count]) => count > config.softPlayersPerClub)?.[0];
    if (!stackedClub) break;
    const selectedIds = new Set(current.map((player) => player.id));
    const budgetUsed = getBudgetUsed(current);
    const stackPlayers = current
      .map((player, index) => ({ player, index }))
      .filter((item) => item.player.teamCode === stackedClub)
      .filter((item) => !(styleConfig.allowBenchEnabler && item.player.benchEnablerEligible))
      .sort((a, b) => getSelectionScore(a.player, valueBias, premiumBias, clubCounts, config) - getSelectionScore(b.player, valueBias, premiumBias, clubCounts, config));
    const replacement = stackPlayers
      .flatMap(({ player: outgoing, index }) =>
        (candidatesByPosition[outgoing.position] || [])
          .filter((incoming) => !selectedIds.has(incoming.id))
          .filter((incoming) => (clubCounts[incoming.teamCode] || 0) < config.softPlayersPerClub)
          .filter((incoming) => budgetUsed - outgoing.price + incoming.price <= config.budget + 0.001)
          .filter((incoming) => {
            if (styleConfig.allowBenchEnabler) {
              const nextBenchEnablers = countBenchEnablers(current) - (outgoing.benchEnablerEligible ? 1 : 0) + (incoming.benchEnablerEligible ? 1 : 0);
              return nextBenchEnablers <= (styleConfig.maxBenchEnablers ?? 1);
            }
            return !incoming.benchEnablerEligible;
          })
          .map((incoming) => {
            const outgoingScore = getSelectionScore(outgoing, valueBias, premiumBias, clubCounts, config);
            const incomingScore = getSelectionScore(incoming, valueBias, premiumBias, clubCounts, config);
            return { index, incoming, scoreDrop: outgoingScore - incomingScore };
          })
      )
      .sort((a, b) => a.scoreDrop - b.scoreDrop)[0];
    if (replacement && replacement.scoreDrop <= config.thirdClubPlayerRequiredEdge) {
      current = current.map((player, index) => (index === replacement.index ? replacement.incoming : player));
      changed = true;
    }
  }
  return current;
}

function optimiseBackupGoalkeeper(selected = [], candidatesByPosition = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG, styleConfig = {}) {
  if (styleConfig.goalkeeperStrategy !== "single") return selected;
  const cap = Number(styleConfig.backupGoalkeeperMaxPrice || 0);
  if (!cap) return selected;
  const goalkeepers = selected.filter((player) => player.position === "GK");
  if (goalkeepers.length !== 2 || goalkeepers.some((player) => player.price <= cap)) return selected;
  const starter = goalkeepers.slice().sort((a, b) => b.suggestedScore - a.suggestedScore || b.price - a.price)[0];
  const outgoing = goalkeepers.find((player) => player.id !== starter.id);
  const selectedIds = new Set(selected.map((player) => player.id));
  const clubCountsAfterOutgoing = countByClub(selected);
  clubCountsAfterOutgoing[outgoing.teamCode] = Math.max(0, (clubCountsAfterOutgoing[outgoing.teamCode] || 0) - 1);
  const replacement = (candidatesByPosition.GK || [])
    .filter((player) => player.price <= cap)
    .filter((player) => !selectedIds.has(player.id))
    .filter((player) => (clubCountsAfterOutgoing[player.teamCode] || 0) < config.maxPlayersPerClub)
    .sort((a, b) => {
      const aSoftStacked = (clubCountsAfterOutgoing[a.teamCode] || 0) >= config.softPlayersPerClub ? 1 : 0;
      const bSoftStacked = (clubCountsAfterOutgoing[b.teamCode] || 0) >= config.softPlayersPerClub ? 1 : 0;
      return aSoftStacked - bSoftStacked || a.price - b.price || b.suggestedScore - a.suggestedScore;
    })[0];
  if (!replacement) return selected;
  return selected.map((player) => (player.id === outgoing.id ? replacement : player));
}

function buildGreedySquad(candidatesByPosition, config, valueBias = 0, premiumBias = 0, styleConfig = {}) {
  const selected = [];
  const selectedIds = new Set();
  const clubCounts = {};
  const remaining = { ...config.positions };
  let budgetUsed = 0;
  const order = styleConfig.selectionOrder || ["FWD", "MID", "DEF", "GK", "MID", "DEF", "FWD", "GK"];

  if (styleConfig.allowBenchEnabler) {
    const benchEnabler = Object.values(candidatesByPosition)
      .flat()
      .filter((player) => player.benchEnablerEligible)
      .sort((a, b) => a.price - b.price || b.suggestedScore - a.suggestedScore)[0];
    if (benchEnabler) {
      selected.push(benchEnabler);
      selectedIds.add(benchEnabler.id);
      clubCounts[benchEnabler.teamCode] = (clubCounts[benchEnabler.teamCode] || 0) + 1;
      remaining[benchEnabler.position] -= 1;
      budgetUsed += benchEnabler.price;
    }
  }

  while (selected.length < 15) {
    const position = order.find((item) => remaining[item] > 0) || Object.keys(remaining).find((item) => remaining[item] > 0);
    if (!position) break;
    const pool = [...(candidatesByPosition[position] || [])].sort(
      (a, b) =>
        getStyleAwareSelectionScore({ player: b, selected, valueBias, premiumBias, clubCounts, styleConfig, config }) -
        getStyleAwareSelectionScore({ player: a, selected, valueBias, premiumBias, clubCounts, styleConfig, config })
    );
    const remainingAfterPosition = { ...remaining, [position]: remaining[position] - 1 };
    const currentBudgetUsed = budgetUsed;
    const chosen = pool.find((player) => {
      if (selectedIds.has(player.id)) return false;
      if (player.benchEnablerEligible && countBenchEnablers(selected) >= (styleConfig.maxBenchEnablers ?? 0)) return false;
      if ((clubCounts[player.teamCode] || 0) >= config.maxPlayersPerClub) return false;
      if (position === "GK" && selected.some((selectedPlayer) => selectedPlayer.position === "GK" && selectedPlayer.teamCode === player.teamCode)) return false;
      if (
        position === "GK" &&
        styleConfig.goalkeeperStrategy === "single" &&
        getPositionSelectedCount(selected, "GK") >= 1 &&
        Number(styleConfig.backupGoalkeeperMaxPrice) &&
        player.price > Number(styleConfig.backupGoalkeeperMaxPrice)
      ) {
        const hasAffordableBackup = (candidatesByPosition.GK || []).some((candidate) =>
          !selectedIds.has(candidate.id) &&
          candidate.id !== player.id &&
          candidate.price <= Number(styleConfig.backupGoalkeeperMaxPrice) &&
          (clubCounts[candidate.teamCode] || 0) < config.maxPlayersPerClub
        );
        if (hasAffordableBackup) return false;
      }
      const nextBudget = currentBudgetUsed + player.price;
      const minRemaining = getMinRemainingCost(
        candidatesByPosition,
        remainingAfterPosition,
        new Set([...selectedIds, player.id])
      );
      return nextBudget + minRemaining <= config.budget + 0.001 && hasThirdClubPlayerEdge({
        candidate: player,
        pool,
        selectedIds,
        clubCounts,
        budgetUsed: currentBudgetUsed,
        remainingAfterPosition,
        candidatesByPosition,
        config,
        valueBias,
        premiumBias,
      });
    });
    if (!chosen) return null;
    selected.push(chosen);
    selectedIds.add(chosen.id);
    clubCounts[chosen.teamCode] = (clubCounts[chosen.teamCode] || 0) + 1;
    remaining[position] -= 1;
    budgetUsed += chosen.price;
  }

  if (selected.length !== 15) return null;
  const diversified = diversifyClubStacks(
    upgradeSquad(selected, candidatesByPosition, config, valueBias, premiumBias, styleConfig),
    candidatesByPosition,
    config,
    valueBias,
    premiumBias,
    styleConfig
  );
  return optimiseBackupGoalkeeper(diversified, candidatesByPosition, config, styleConfig);
}

function chooseStarters(players = [], config = FANTASY_SUGGESTED_TEAM_CONFIG, styleConfig = {}) {
  const preferredGoalkeeper = players
    .filter((player) => player.position === "GK")
    .filter((player) => hasStyleStarterEvidence(player, styleConfig, config))
    .sort((a, b) => b.suggestedScore - a.suggestedScore || b.price - a.price)[0] || null;
  const byPosition = Object.fromEntries(["GK", "DEF", "MID", "FWD"].map((position) => [
    position,
    players
      .filter((player) => player.position === position)
      .filter((player) => position !== "GK" || player.id === preferredGoalkeeper?.id)
      .filter((player) => hasStyleStarterEvidence(player, styleConfig, config))
      .sort((a, b) => Number(isMustStartAttacker(b, config)) - Number(isMustStartAttacker(a, config)) || b.suggestedScore - a.suggestedScore),
  ]));
  const formationRank = new Map((styleConfig.formations || []).map((label, index) => [label, index]));
  const validFormations = config.starterFormations
    .map((formation) => {
      const starterIds = new Set();
      const starters = Object.entries(formation.counts).flatMap(([position, count]) => {
        if (position === "FWD" && count === 1 && styleConfig.singleForwardRequiresPremium) {
          const minimumFixtureScore = numberOrNull(styleConfig.singleForwardMinimumFixtureScore);
          const premiumForwards = byPosition.FWD.filter((player) => isPremiumForward(player, config));
          const fixtureQualified = minimumFixtureScore == null
            ? premiumForwards
            : premiumForwards.filter((player) => Number(player.fixtureScore || 0) >= minimumFixtureScore);
          const forward = (fixtureQualified[0] || premiumForwards[0]);
          if (!forward) return [];
          starterIds.add(forward.id);
          return [forward];
        }
        const selected = byPosition[position].filter((player) => !starterIds.has(player.id)).slice(0, count);
        selected.forEach((player) => starterIds.add(player.id));
        return selected;
      });
      if (starters.length !== 11) return null;
      const styleFormationBonus = Math.max(0, 80 - (formationRank.get(formation.label) ?? 99) * 14);
      const starterIdSet = new Set(starters.map((player) => player.id));
      const startingAttackers = starters.filter((player) => ["MID", "FWD"].includes(player.position));
      const cheapestStartingAttackerPrice = Math.min(
        ...startingAttackers.map((player) => Number(player.price || 0)).filter((price) => price > 0)
      );
      const benchedPremiumAttackers = players.filter((player) =>
        !starterIdSet.has(player.id) &&
        (
          isPremiumAttacker(player, config) ||
          isMustStartAttacker(player, config) ||
          (
            styleConfig.expensiveAttackerMustStart &&
            ["MID", "FWD"].includes(player.position) &&
            Number.isFinite(cheapestStartingAttackerPrice) &&
            Number(player.price || 0) > cheapestStartingAttackerPrice + 0.05
          )
        ) &&
        hasStyleStarterEvidence(player, styleConfig, config)
      );
      const premiumBenchPenalty = styleConfig.premiumAttackerMustStart
        ? benchedPremiumAttackers.reduce((sum, player) => sum + Math.max(1, Number(player.price || 0) - Number(config.premiumAttackerPrice || 8) + 1) * 55, 0)
        : 0;
      const defensiveStackPenalty = getDefensiveStarterStackPenalty(starters, styleConfig);
      return {
        ...formation,
        starters,
        score: starters.reduce((sum, player) => sum + player.suggestedScore, 0) + styleFormationBonus - premiumBenchPenalty - defensiveStackPenalty,
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score || (formationRank.get(a.label) ?? 99) - (formationRank.get(b.label) ?? 99));
  return validFormations[0] || null;
}

function toSquad(players, formation) {
  const starterIds = new Set((formation?.starters || []).map((player) => player.id));
  const ordered = ["GK", "DEF", "MID", "FWD"].flatMap((position) =>
    players
      .filter((player) => player.position === position)
      .sort((a, b) => b.suggestedScore - a.suggestedScore)
  );
  const starters = ordered.filter((player) => starterIds.has(player.id));
  const captainCandidates = starters
    .filter((player) => ["MID", "FWD"].includes(player.position))
    .sort((a, b) => b.suggestedScore - a.suggestedScore);
  const captain = captainCandidates[0] || starters[0] || null;
  const viceCaptain = captainCandidates.find((player) => player.id !== captain?.id) || starters.find((player) => player.id !== captain?.id) || null;
  return {
    source: "suggested-team",
    confirmed: true,
    formation: formation?.label || null,
    captainPlayerId: captain?.id || null,
    viceCaptainPlayerId: viceCaptain?.id || null,
    players: ordered.map((player) => ({
      id: player.id,
      sourceId: player.sourceId ?? null,
      name: player.displayName || player.name || player.webName || "",
      displayName: player.displayName || player.name || player.webName || "",
      webName: player.webName || "",
      normalisedName: player.normalisedName || "",
      teamId: player.teamId || null,
      teamCode: player.teamCode,
      teamName: player.teamName || "",
      position: player.position,
      positionId: player.positionId ?? null,
      price: player.price,
      priceTenths: player.priceTenths ?? Math.round(player.price * 10),
      squadRole: starterIds.has(player.id) ? "starter" : "bench",
      isCaptain: player.id === captain?.id,
      isViceCaptain: player.id === viceCaptain?.id,
      confidence: 1,
      manuallyConfirmed: true,
      active: player.active !== false,
      availabilityStatus: player.availabilityStatus || "unknown",
      externalMetadata: player.externalMetadata || {},
      dataSource: player.dataSource || null,
      dataUpdatedAt: player.dataUpdatedAt || null,
      canonicalPlayerId: player.canonicalPlayerId || player.id,
      reconciliationStatus: player.reconciliationStatus || "matched",
      reconciliationConfidence: player.reconciliationConfidence ?? 1,
      suggestedTeamScore: player.suggestedScore,
      suggestedFixtureScore: player.fixtureScore,
      suggestedFormScore: player.formScore,
      suggestedValueScore: player.valueScore,
      suggestedStarterLikelihoodScore: player.starterLikelihoodScore,
      suggestedPremiumScore: player.premiumScore,
      suggestedBenchEnablerEligible: !!player.benchEnablerEligible,
    })),
  };
}

export function createFantasySuggestedTeam({
  players = [],
  clubOutlooks = {},
  predictionOutlooks = {},
  validateSquad,
  scoreReport,
  playerDataStatus = null,
  config = FANTASY_SUGGESTED_TEAM_CONFIG,
  style = "balanced",
  fixtureHorizon = 3,
} = {}) {
  const styleConfig = getStyleConfig(style, config);
  const eligible = (players || [])
    .filter((player) => player?.active !== false)
    .filter((player) => !player?.temporary)
    .filter((player) => config.positions[String(player?.position || "").toUpperCase()])
    .filter((player) => !hasActionableFantasyAvailabilityRisk(player))
    .filter((player) => !hasStarterRoleDoubt(player, config) || isAttackingBenchEnablerCandidate(player, styleConfig, config))
    .filter((player) => !hasClearRecentNonStarterEvidence(player, config) || isAttackingBenchEnablerCandidate(player, styleConfig, config))
    .filter((player) => !hasWeakStartingEvidence(player, config) || isAttackingBenchEnablerCandidate(player, styleConfig, config))
    .map((player) => scoreCandidate(
      player,
      clubOutlooks[String(player.teamCode || "").toUpperCase()],
      predictionOutlooks[String(player.teamCode || "").toUpperCase()],
      styleConfig,
      config
    ))
    .filter(Boolean)
    .filter((player) => player.benchEnablerEligible || player.starterLikelihoodScore >= config.minimumSquadLikelihood);

  const candidatesByPosition = Object.fromEntries(Object.keys(config.positions).map((position) => [
    position,
    uniquePlayersById([
      ...eligible
      .filter((player) => player.position === position)
        .filter((player) => !player.benchEnablerEligible)
      .sort((a, b) => b.suggestedScore - a.suggestedScore)
      .slice(0, config.candidateLimitByPosition[position] || 24),
      ...(position === "GK"
        && styleConfig.goalkeeperStrategy === "single"
        ? eligible
            .filter((player) => player.position === "GK")
            .filter((player) => player.price <= Number(styleConfig.backupGoalkeeperMaxPrice || 4.8))
            .sort((a, b) => a.price - b.price || b.suggestedScore - a.suggestedScore)
            .slice(0, 6)
        : []),
      ...eligible
        .filter((player) => player.position === position)
        .filter((player) => player.benchEnablerEligible)
        .sort((a, b) => a.price - b.price || b.suggestedScore - a.suggestedScore)
        .slice(0, styleConfig.maxBenchEnablers ?? 0),
    ]),
  ]));
  const missingPositions = Object.entries(config.positions)
    .filter(([position, count]) => (candidatesByPosition[position] || []).length < count)
    .map(([position]) => position);
  if (missingPositions.length) {
    return {
      status: "locked",
      version: FANTASY_SUGGESTED_TEAM_VERSION,
      warnings: [`Suggested team needs more eligible priced players for: ${missingPositions.join(", ")}.`],
      players: [],
    };
  }

  const attemptConfigs = config.valueBiases.flatMap((valueBias) =>
    config.premiumBiases.map((premiumBias) => ({ valueBias, premiumBias }))
  );
  const attempts = attemptConfigs
    .map(({ valueBias, premiumBias }) => {
      const selected = buildGreedySquad(candidatesByPosition, config, valueBias, premiumBias, styleConfig);
      if (!selected) return null;
      const formation = chooseStarters(selected, config, styleConfig);
      if (!formation) return null;
      const squad = toSquad(selected, formation);
      if (getBenchedPremiumStarterAttackers(squad, styleConfig, config).length) return null;
      const validation = typeof validateSquad === "function" ? validateSquad(squad) : { isValid: true };
      if (!validation?.isValid) return null;
      const report = typeof scoreReport === "function"
        ? scoreReport({ squad, validation, clubOutlooks, predictionOutlooks, playerDataStatus })
        : null;
      return {
        valueBias,
        premiumBias,
        squad,
        validation,
        report,
        formation: formation.label,
        totalCost: round(selected.reduce((sum, player) => sum + player.price, 0)),
        remainingBudget: round(config.budget - selected.reduce((sum, player) => sum + player.price, 0)),
        clubCounts: countByClub(selected),
        benchPremiumWaste: round(getBenchPremiumWaste(squad, styleConfig), 2),
        score: report?.overallScore ?? selected.reduce((sum, player) => sum + player.suggestedScore, 0) / selected.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const idealSpend = Number(config.idealSpend || config.preferredMinimumSpend || 98);
      const getAttemptRankScore = (attempt) => {
        const spendRatio = clamp(attempt.totalCost / Math.max(1, config.budget), 0, 1);
        const underspendPenalty = Math.max(0, idealSpend - attempt.totalCost) * 0.65;
        return attempt.score + spendRatio * 4 - Number(attempt.benchPremiumWaste || 0) * 2.2 - underspendPenalty;
      };
      return getAttemptRankScore(b) - getAttemptRankScore(a) || b.totalCost - a.totalCost;
    });
  const best = attempts[0];
  if (!best) {
    return {
      status: "locked",
      version: FANTASY_SUGGESTED_TEAM_VERSION,
      warnings: ["Suggested team could not build a 15 player squad under budget with the current player data."],
      players: [],
    };
  }

  const excludedRiskCount = (players || []).filter(hasActionableFantasyAvailabilityRisk).length;
  const starters = best.squad.players.filter((player) => player.squadRole === "starter");
  const bench = best.squad.players.filter((player) => player.squadRole === "bench");
  const benchEnablers = bench.filter((player) => player.suggestedBenchEnablerEligible);
  const captain = best.squad.players.find((player) => player.id === best.squad.captainPlayerId) || null;
  const viceCaptain = best.squad.players.find((player) => player.id === best.squad.viceCaptainPlayerId) || null;
  const overallScore = best.report?.overallScore ?? round(best.score);
  const recommendationReady = overallScore >= config.minimumRecommendedScore;
  const horizonLabel = `${Math.max(1, Math.round(Number(fixtureHorizon) || 3))} gameweeks`;
  return {
    status: recommendationReady ? "ready" : "review",
    version: FANTASY_SUGGESTED_TEAM_VERSION,
    style,
    styleLabel: styleConfig.label || "Balanced",
    squad: best.squad,
    validation: best.validation,
    report: best.report,
    overallScore,
    formation: best.formation,
    totalCost: best.totalCost,
    remainingBudget: best.remainingBudget,
    clubCounts: best.clubCounts,
    captain,
    viceCaptain,
    starters,
    bench,
    players: best.squad.players,
    warnings: [
      excludedRiskCount ? `${excludedRiskCount} players with player availability risk were excluded.` : "",
      best.totalCost < config.preferredMinimumSpend ? `Only ${round(best.totalCost)}m was used because the model could not find higher-priced upgrades that improved the squad within constraints.` : "",
      playerDataStatus?.cacheStatus === "fallback" ? "Live FPL player data is unavailable, so suggested team is locked to fallback quality." : "",
    ].filter(Boolean),
    reasons: [
      `Optimised for the next ${horizonLabel} using fixture outlook, starter likelihood, premium upside, price value and available FPL form fields.`,
      `Legal squad: ${best.formation}, ${round(best.totalCost)}m used, max ${config.maxPlayersPerClub} players per club with a soft preference for ${config.softPlayersPerClub}.`,
      benchEnablers.length ? `Attacking bench tactic: ${benchEnablers[0].displayName || benchEnablers[0].name} is a cheap outfield bench enabler so more budget can go into premium attackers.` : "",
      captain ? `${captain.displayName || captain.name} is captain because he has the strongest attacking starter profile.` : "",
    ].filter(Boolean),
  };
}
