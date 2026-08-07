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

function getPredictionScore(position, predictionOutlook = {}) {
  if (!predictionOutlook || predictionOutlook.overallScore == null) return null;
  if (["GK", "DEF"].includes(position)) return predictionOutlook.defenceScore ?? predictionOutlook.overallScore;
  return predictionOutlook.attackScore ?? predictionOutlook.overallScore;
}

function getFixtureScore(position, clubOutlook = {}) {
  if (!clubOutlook || clubOutlook.overallScore == null) return null;
  if (position === "GK") return (clubOutlook.defenceScore ?? clubOutlook.overallScore) * 0.9 + (clubOutlook.overallScore ?? 50) * 0.1;
  if (position === "DEF") return (clubOutlook.defenceScore ?? clubOutlook.overallScore) * 0.75 + (clubOutlook.attackScore ?? clubOutlook.overallScore) * 0.1 + (clubOutlook.overallScore ?? 50) * 0.15;
  if (position === "MID") return (clubOutlook.attackScore ?? clubOutlook.overallScore) * 0.72 + (clubOutlook.overallScore ?? 50) * 0.28;
  if (position === "FWD") return (clubOutlook.attackScore ?? clubOutlook.overallScore) * 0.82 + (clubOutlook.overallScore ?? 50) * 0.18;
  return clubOutlook.overallScore;
}

function scoreCandidate(player, clubOutlook, predictionOutlook) {
  const position = String(player.position || "").toUpperCase();
  const price = getPlayerPrice(player);
  const fixtureScore = getFixtureScore(position, clubOutlook);
  if (fixtureScore == null || price == null) return null;
  const formScore = getFormScore(player);
  const predictionScore = getPredictionScore(position, predictionOutlook);
  const valueScore = clamp((fixtureScore * 0.7 + formScore * 0.3) / Math.max(4, price) * 8.8, 0, 100);
  const availabilityChance = getFantasyAvailabilityChance(player);
  const risk = hasActionableFantasyAvailabilityRisk(player);
  const availabilityPenalty = risk ? 100 - (availabilityChance ?? 35) : 0;
  const score =
    fixtureScore * 0.56 +
    formScore * 0.18 +
    valueScore * 0.16 +
    (predictionScore ?? fixtureScore) * 0.1 -
    availabilityPenalty * 0.8;
  return {
    ...player,
    price,
    position,
    fixtureScore: round(fixtureScore),
    formScore: round(formScore),
    valueScore: round(valueScore),
    predictionScore: round(predictionScore),
    suggestedScore: round(clamp(score, 0, 100), 2),
    availabilityRisk: risk,
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

function buildGreedySquad(candidatesByPosition, config, valueBias = 0) {
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
      (a, b) => (b.suggestedScore + b.valueScore * valueBias) - (a.suggestedScore + a.valueScore * valueBias)
    );
    const remainingAfterPosition = { ...remaining, [position]: remaining[position] - 1 };
    const currentBudgetUsed = budgetUsed;
    const chosen = pool.find((player) => {
      if (selectedIds.has(player.id)) return false;
      if ((clubCounts[player.teamCode] || 0) >= config.maxPlayersPerClub) return false;
      const nextBudget = currentBudgetUsed + player.price;
      const minRemaining = getMinRemainingCost(candidatesByPosition, remainingAfterPosition);
      return nextBudget + minRemaining <= config.budget + 0.001;
    });
    if (!chosen) return null;
    selected.push(chosen);
    selectedIds.add(chosen.id);
    clubCounts[chosen.teamCode] = (clubCounts[chosen.teamCode] || 0) + 1;
    remaining[position] -= 1;
    budgetUsed += chosen.price;
  }

  return selected.length === 15 ? selected : null;
}

function chooseStarters(players = [], config = FANTASY_SUGGESTED_TEAM_CONFIG) {
  const byPosition = Object.fromEntries(["GK", "DEF", "MID", "FWD"].map((position) => [
    position,
    players.filter((player) => player.position === position).sort((a, b) => b.suggestedScore - a.suggestedScore),
  ]));
  const validFormations = config.starterFormations
    .map((formation) => {
      const starters = Object.entries(formation.counts).flatMap(([position, count]) => byPosition[position].slice(0, count));
      if (starters.length !== 11) return null;
      return {
        ...formation,
        starters,
        score: starters.reduce((sum, player) => sum + player.suggestedScore, 0),
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
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
} = {}) {
  const eligible = (players || [])
    .filter((player) => player?.active !== false)
    .filter((player) => !player?.temporary)
    .filter((player) => config.positions[String(player?.position || "").toUpperCase()])
    .filter((player) => !hasActionableFantasyAvailabilityRisk(player))
    .map((player) => scoreCandidate(
      player,
      clubOutlooks[String(player.teamCode || "").toUpperCase()],
      predictionOutlooks[String(player.teamCode || "").toUpperCase()]
    ))
    .filter(Boolean);

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

  const attempts = config.valueBiases
    .map((bias) => {
      const selected = buildGreedySquad(candidatesByPosition, config, bias);
      if (!selected) return null;
      const formation = chooseStarters(selected, config);
      if (!formation) return null;
      const squad = toSquad(selected, formation);
      const validation = typeof validateSquad === "function" ? validateSquad(squad) : { isValid: true };
      if (!validation?.isValid) return null;
      const report = typeof scoreReport === "function"
        ? scoreReport({ squad, validation, clubOutlooks, predictionOutlooks, playerDataStatus })
        : null;
      return {
        valueBias: bias,
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
    .sort((a, b) => b.score - a.score || a.totalCost - b.totalCost);
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
  return {
    status: "ready",
    version: FANTASY_SUGGESTED_TEAM_VERSION,
    squad: best.squad,
    validation: best.validation,
    report: best.report,
    overallScore: best.report?.overallScore ?? round(best.score),
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
      excludedRiskCount ? `${excludedRiskCount} players with actionable availability risk were excluded.` : "",
      playerDataStatus?.cacheStatus === "fallback" ? "Live FPL player data is unavailable, so suggested team is locked to fallback quality." : "",
    ].filter(Boolean),
    reasons: [
      `Optimised for the next three gameweeks using fixture outlook, role weighting, price value and available FPL form fields.`,
      `Legal squad: ${best.formation}, ${round(best.totalCost)}m used, max ${config.maxPlayersPerClub} players per club.`,
      captain ? `${captain.displayName || captain.name} is captain because he has the strongest attacking starter profile.` : "",
    ].filter(Boolean),
  };
}
