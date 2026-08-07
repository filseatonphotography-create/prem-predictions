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
  preferredMinimumSpend: 92,
  minimumSquadLikelihood: 28,
  minimumStartingXiLikelihood: 62,
  minimumReliableStarts: 4,
  minimumReliableMinutes: 540,
  minimumReliableSelectedByPercent: 2,
  minimumReliablePointsPerGame: 2.5,
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
      formations: ["4-4-2", "3-5-2", "4-3-3", "3-4-3", "4-5-1", "5-3-2", "5-4-1"],
    },
    attacking: {
      label: "Attacking",
      positionBias: { GK: -4, DEF: -2, MID: 5, FWD: 8 },
      premiumBias: { GK: 0.75, DEF: 0.85, MID: 1.2, FWD: 1.28 },
      fixtureBias: { attack: 1.12, defence: 0.92 },
      formations: ["3-4-3", "3-5-2", "4-3-3", "4-4-2", "4-5-1", "5-3-2", "5-4-1"],
    },
    defensive: {
      label: "Defensive",
      positionBias: { GK: 7, DEF: 6, MID: 0, FWD: -4 },
      premiumBias: { GK: 1.25, DEF: 1.2, MID: 0.92, FWD: 0.8 },
      fixtureBias: { attack: 0.92, defence: 1.12 },
      formations: ["5-4-1", "5-3-2", "4-5-1", "4-4-2", "3-5-2", "4-3-3", "3-4-3"],
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

function scoreCandidate(player, clubOutlook, predictionOutlook, styleConfig = {}) {
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
  const weakStartingEvidence = hasWeakStartingEvidence(player);
  const availabilityPenalty = risk ? 100 - (availabilityChance ?? 35) : 0;
  const rotationPenalty = weakStartingEvidence ? 28 : 0;
  const score =
    fixtureScore * 0.43 +
    starterLikelihoodScore * 0.2 +
    premiumScore * 0.16 +
    formScore * 0.12 +
    (predictionScore ?? fixtureScore) * 0.06 +
    valueScore * 0.03 -
    availabilityPenalty * 0.8 -
    rotationPenalty +
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
    clubOutlook,
    predictionOutlook,
  };
}

function getMinRemainingCost(candidatesByPosition, remainingCounts) {
  return Object.entries(remainingCounts).reduce((sum, [position, count]) => {
    if (count <= 0) return sum;
    const prices = (candidatesByPosition[position] || [])
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

function getSelectionScore(player, valueBias = 0, premiumBias = 0, clubCounts = {}, config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  const stackPenalty = (clubCounts[player.teamCode] || 0) >= config.softPlayersPerClub ? config.thirdClubPlayerPenalty : 0;
  return player.suggestedScore + player.valueScore * valueBias + player.premiumScore * premiumBias - stackPenalty;
}

function getBudgetUsed(players = []) {
  return players.reduce((sum, player) => sum + Number(player.price || 0), 0);
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
      const minRemaining = getMinRemainingCost(candidatesByPosition, remainingAfterPosition);
      return nextBudget + minRemaining <= config.budget + 0.001;
    })
    .sort((a, b) => getSelectionScore(b, valueBias, premiumBias, clubCounts, config) - getSelectionScore(a, valueBias, premiumBias, clubCounts, config))[0];
  if (!bestAlternative) return true;
  return candidateScore >= getSelectionScore(bestAlternative, valueBias, premiumBias, clubCounts, config) + config.thirdClubPlayerRequiredEdge;
}

function upgradeSquad(selected, candidatesByPosition, config, valueBias = 0, premiumBias = 0) {
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
            const nextClubCounts = { ...clubCounts };
            nextClubCounts[outgoing.teamCode] = Math.max(0, (nextClubCounts[outgoing.teamCode] || 0) - 1);
            if ((nextClubCounts[incoming.teamCode] || 0) >= config.maxPlayersPerClub) return null;
            const nextBudget = budgetUsed - outgoing.price + incoming.price;
            if (nextBudget > config.budget + 0.001) return null;
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

function diversifyClubStacks(selected, candidatesByPosition, config, valueBias = 0, premiumBias = 0) {
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
      .sort((a, b) => getSelectionScore(a.player, valueBias, premiumBias, clubCounts, config) - getSelectionScore(b.player, valueBias, premiumBias, clubCounts, config));
    const replacement = stackPlayers
      .flatMap(({ player: outgoing, index }) =>
        (candidatesByPosition[outgoing.position] || [])
          .filter((incoming) => !selectedIds.has(incoming.id))
          .filter((incoming) => (clubCounts[incoming.teamCode] || 0) < config.softPlayersPerClub)
          .filter((incoming) => budgetUsed - outgoing.price + incoming.price <= config.budget + 0.001)
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

function buildGreedySquad(candidatesByPosition, config, valueBias = 0, premiumBias = 0) {
  const selected = [];
  const selectedIds = new Set();
  const clubCounts = {};
  const remaining = { ...config.positions };
  let budgetUsed = 0;
  const order = ["FWD", "MID", "DEF", "GK", "MID", "DEF", "FWD", "GK"];

  while (selected.length < 15) {
    const position = order.find((item) => remaining[item] > 0) || Object.keys(remaining).find((item) => remaining[item] > 0);
    if (!position) break;
    const pool = [...(candidatesByPosition[position] || [])].sort(
      (a, b) => getSelectionScore(b, valueBias, premiumBias, clubCounts, config) - getSelectionScore(a, valueBias, premiumBias, clubCounts, config)
    );
    const remainingAfterPosition = { ...remaining, [position]: remaining[position] - 1 };
    const currentBudgetUsed = budgetUsed;
    const chosen = pool.find((player) => {
      if (selectedIds.has(player.id)) return false;
      if ((clubCounts[player.teamCode] || 0) >= config.maxPlayersPerClub) return false;
      const nextBudget = currentBudgetUsed + player.price;
      const minRemaining = getMinRemainingCost(candidatesByPosition, remainingAfterPosition);
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
  return diversifyClubStacks(
    upgradeSquad(selected, candidatesByPosition, config, valueBias, premiumBias),
    candidatesByPosition,
    config,
    valueBias,
    premiumBias
  );
}

function chooseStarters(players = [], config = FANTASY_SUGGESTED_TEAM_CONFIG, styleConfig = {}) {
  const byPosition = Object.fromEntries(["GK", "DEF", "MID", "FWD"].map((position) => [
    position,
    players
      .filter((player) => player.position === position)
      .filter((player) => player.starterLikelihoodScore >= config.minimumStartingXiLikelihood)
      .sort((a, b) => b.suggestedScore - a.suggestedScore),
  ]));
  const formationRank = new Map((styleConfig.formations || []).map((label, index) => [label, index]));
  const validFormations = config.starterFormations
    .map((formation) => {
      const starters = Object.entries(formation.counts).flatMap(([position, count]) => byPosition[position].slice(0, count));
      if (starters.length !== 11) return null;
      const styleFormationBonus = Math.max(0, 80 - (formationRank.get(formation.label) ?? 99) * 14);
      return {
        ...formation,
        starters,
        score: starters.reduce((sum, player) => sum + player.suggestedScore, 0) + styleFormationBonus,
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
} = {}) {
  const styleConfig = getStyleConfig(style, config);
  const eligible = (players || [])
    .filter((player) => player?.active !== false)
    .filter((player) => !player?.temporary)
    .filter((player) => config.positions[String(player?.position || "").toUpperCase()])
    .filter((player) => !hasActionableFantasyAvailabilityRisk(player))
    .filter((player) => !hasWeakStartingEvidence(player, config))
    .map((player) => scoreCandidate(
      player,
      clubOutlooks[String(player.teamCode || "").toUpperCase()],
      predictionOutlooks[String(player.teamCode || "").toUpperCase()],
      styleConfig
    ))
    .filter(Boolean)
    .filter((player) => player.starterLikelihoodScore >= config.minimumSquadLikelihood);

  const candidatesByPosition = Object.fromEntries(Object.keys(config.positions).map((position) => [
    position,
    eligible
      .filter((player) => player.position === position)
      .sort((a, b) => b.suggestedScore - a.suggestedScore)
      .slice(0, config.candidateLimitByPosition[position] || 24),
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
      const selected = buildGreedySquad(candidatesByPosition, config, valueBias, premiumBias);
      if (!selected) return null;
      const formation = chooseStarters(selected, config, styleConfig);
      if (!formation) return null;
      const squad = toSquad(selected, formation);
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
        score: report?.overallScore ?? selected.reduce((sum, player) => sum + player.suggestedScore, 0) / selected.length,
      };
    })
    .filter(Boolean)
    .sort((a, b) => {
      const aSpendBonus = a.totalCost >= config.preferredMinimumSpend ? 2 : (a.totalCost / config.preferredMinimumSpend) * 2;
      const bSpendBonus = b.totalCost >= config.preferredMinimumSpend ? 2 : (b.totalCost / config.preferredMinimumSpend) * 2;
      return (b.score + bSpendBonus) - (a.score + aSpendBonus) || b.totalCost - a.totalCost;
    });
  const best = attempts[0];
  if (!best) {
    return {
      status: "locked",
      version: FANTASY_SUGGESTED_TEAM_VERSION,
      warnings: ["Suggested team could not build a legal squad under budget with the current player data."],
      players: [],
    };
  }

  const excludedRiskCount = (players || []).filter(hasActionableFantasyAvailabilityRisk).length;
  const starters = best.squad.players.filter((player) => player.squadRole === "starter");
  const bench = best.squad.players.filter((player) => player.squadRole === "bench");
  const captain = best.squad.players.find((player) => player.id === best.squad.captainPlayerId) || null;
  const viceCaptain = best.squad.players.find((player) => player.id === best.squad.viceCaptainPlayerId) || null;
  const overallScore = best.report?.overallScore ?? round(best.score);
  const recommendationReady = overallScore >= config.minimumRecommendedScore;
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
      !recommendationReady ? `No strong ${config.minimumRecommendedScore}+ Suggested Team is available from the current model run.` : "",
      excludedRiskCount ? `${excludedRiskCount} players with actionable availability risk were excluded.` : "",
      best.totalCost < config.preferredMinimumSpend ? `Only ${round(best.totalCost)}m was used because the model could not find higher-priced upgrades that improved the squad within constraints.` : "",
      playerDataStatus?.cacheStatus === "fallback" ? "Live FPL player data is unavailable, so suggested team is locked to fallback quality." : "",
    ].filter(Boolean),
    reasons: [
      `Optimised for the next three gameweeks using fixture outlook, starter likelihood, premium upside, price value and available FPL form fields.`,
      `Legal squad: ${best.formation}, ${round(best.totalCost)}m used, max ${config.maxPlayersPerClub} players per club with a soft preference for ${config.softPlayersPerClub}.`,
      captain ? `${captain.displayName || captain.name} is captain because he has the strongest attacking starter profile.` : "",
    ].filter(Boolean),
  };
}
