import {
  getFantasyAvailabilityChance,
  hasActionableFantasyAvailabilityRisk,
} from "./availability";

export const FANTASY_LINEUP_IQ_VERSION = "lineup-iq-v1";

export const FANTASY_LINEUP_IQ_CONFIG = {
  immediateWeight: 0.75,
  threeWeekWeight: 0.25,
  predictionAdjustmentCap: 8,
  closeDecisionThreshold: 3,
  alternativeScoreDistance: 3,
  preserveCaptainThreshold: 3,
  availabilityMultipliers: {
    available: 1,
    doubtful: 0.65,
    unavailable: 0.08,
    unknown: 1,
  },
  availabilityFloor: 5,
  verdictBands: {
    strongImprovement: 8,
    goodImprovement: 4,
    smallImprovement: 1,
  },
};

export const FANTASY_LINEUP_IQ_SUPPORTED_FORMATIONS = [
  "3-4-3",
  "3-5-2",
  "4-3-3",
  "4-4-2",
  "4-5-1",
  "5-2-3",
  "5-3-2",
  "5-4-1",
];

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `lineup-iq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function numberOrNull(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function clamp(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function weightedAverage(items = []) {
  const valid = items
    .map((item) => ({
      value: numberOrNull(item.value),
      weight: Math.max(0, Number(item.weight) || 0),
    }))
    .filter((item) => item.value != null && item.weight > 0);
  const totalWeight = valid.reduce((sum, item) => sum + item.weight, 0);
  if (!valid.length || totalWeight <= 0) return null;
  return valid.reduce((sum, item) => sum + item.value * (item.weight / totalWeight), 0);
}

function roundScore(value) {
  const number = numberOrNull(value);
  return number == null ? null : Math.round(number * 10) / 10;
}

function getAvailabilityMultiplier(player = {}, config = FANTASY_LINEUP_IQ_CONFIG) {
  if (!hasActionableFantasyAvailabilityRisk(player)) return config.availabilityMultipliers?.unknown ?? 1;
  const status = String(player?.availabilityStatus || "unknown").toLowerCase();
  const statusMultiplier = config.availabilityMultipliers?.[status] ?? config.availabilityMultipliers?.unknown ?? 1;
  const chance = getFantasyAvailabilityChance(player);
  if (chance == null) return statusMultiplier;
  return Math.min(statusMultiplier, clamp(chance / 100, 0.05, 1));
}

function hasAvailabilityRisk(player = {}) {
  return hasActionableFantasyAvailabilityRisk(player);
}

function applyAvailabilityToScore(score, player = {}, config = FANTASY_LINEUP_IQ_CONFIG) {
  const number = numberOrNull(score);
  if (number == null) return null;
  const multiplier = getAvailabilityMultiplier(player, config);
  const floor = Number(config.availabilityFloor) || 0;
  return floor + (number - floor) * multiplier;
}

function defaultNormaliseSquad(squad) {
  return clone(squad) || { players: [] };
}

function defaultValidateSquad() {
  return { isValid: true, valid: true, errors: [], messages: [], warnings: [], summary: {} };
}

export function getFantasyLineupFormation(starters = []) {
  const counts = { DEF: 0, MID: 0, FWD: 0 };
  starters.forEach((player) => {
    if (counts[player?.position] != null) counts[player.position] += 1;
  });
  return `${counts.DEF}-${counts.MID}-${counts.FWD}`;
}

function positionOutlookScore(position, outlook = {}) {
  const overall = outlook.overallScore ?? outlook.score ?? null;
  const attack = outlook.attackScore ?? outlook.score ?? overall;
  const defence = outlook.defenceScore ?? outlook.score ?? overall;
  if (position === "GK") {
    return weightedAverage([
      { value: defence, weight: 0.85 },
      { value: overall, weight: 0.15 },
    ]);
  }
  if (position === "DEF") {
    return weightedAverage([
      { value: defence, weight: 0.75 },
      { value: overall, weight: 0.15 },
      { value: attack, weight: 0.1 },
    ]);
  }
  if (position === "MID") {
    return weightedAverage([
      { value: attack, weight: 0.75 },
      { value: overall, weight: 0.25 },
    ]);
  }
  if (position === "FWD") {
    return weightedAverage([
      { value: attack, weight: 0.8 },
      { value: overall, weight: 0.2 },
    ]);
  }
  return overall;
}

export function getFantasyLineupPredictionAdjustment(player = {}, predictionOutlook = {}, config = FANTASY_LINEUP_IQ_CONFIG) {
  const fixture = Array.isArray(predictionOutlook.fixtures) ? predictionOutlook.fixtures[0] : null;
  if (!fixture) return 0;
  let adjustment = 0;
  if (["GK", "DEF"].includes(player.position)) {
    const conceded = Number(fixture.predictedAgainst);
    if (!Number.isFinite(conceded)) return 0;
    adjustment = conceded === 0 ? config.predictionAdjustmentCap : conceded === 1 ? 0 : -config.predictionAdjustmentCap;
  } else {
    const scored = Number(fixture.predictedFor);
    if (!Number.isFinite(scored)) return 0;
    adjustment =
      scored >= 3
        ? config.predictionAdjustmentCap
        : scored === 2
        ? config.predictionAdjustmentCap / 2
        : scored === 0
        ? -config.predictionAdjustmentCap
        : 0;
  }
  return clamp(adjustment, -config.predictionAdjustmentCap, config.predictionAdjustmentCap);
}

export function scoreFantasyLineupPlayer({
  player,
  clubOutlook = {},
  predictionOutlook = {},
  config = FANTASY_LINEUP_IQ_CONFIG,
} = {}) {
  const immediateFixture = Array.isArray(clubOutlook.fixtures) ? clubOutlook.fixtures[0] : null;
  const immediateOutlook = immediateFixture || {};
  const immediatePositionOutlook = positionOutlookScore(player?.position, immediateOutlook);
  const threeWeekPositionOutlook = positionOutlookScore(player?.position, clubOutlook);
  const objectiveScore = weightedAverage([
    { value: immediatePositionOutlook, weight: config.immediateWeight },
    { value: threeWeekPositionOutlook, weight: config.threeWeekWeight },
  ]);
  const predictionAdjustment = getFantasyLineupPredictionAdjustment(player, predictionOutlook, config);
  const availabilityAdjustedScore = applyAvailabilityToScore(objectiveScore, player, config);
  const lineupScore = availabilityAdjustedScore == null ? null : clamp(availabilityAdjustedScore + predictionAdjustment, 0, 100);
  const confidence =
    !player?.teamCode || !immediateFixture
      ? "low"
      : hasAvailabilityRisk(player)
      ? "low"
      : ["ambiguous", "unmatched", "legacy"].includes(player.reconciliationStatus)
      ? "low"
      : Number(immediateFixture.confidenceScore ?? clubOutlook.confidenceScore ?? 0) >= 70
      ? "high"
      : Number(immediateFixture.confidenceScore ?? clubOutlook.confidenceScore ?? 0) >= 45
      ? "medium"
      : "low";
  return {
    playerId: player?.id || null,
    immediateScore: roundScore(immediatePositionOutlook),
    threeWeekScore: roundScore(threeWeekPositionOutlook),
    predictionAdjustment: roundScore(predictionAdjustment),
    availabilityMultiplier: roundScore(getAvailabilityMultiplier(player, config)),
    availabilityRisk: hasAvailabilityRisk(player),
    lineupScore: roundScore(lineupScore),
    immediateAttackScore: roundScore(immediateOutlook.attackScore),
    immediateDefenceScore: roundScore(immediateOutlook.defenceScore),
    immediateOverallScore: roundScore(immediateOutlook.overallScore),
    confidence,
    missingImmediateFixture: !immediateFixture,
  };
}

export function scoreFantasyLineupCaptain({
  player,
  playerScore = {},
  clubOutlook = {},
  predictionOutlook = {},
  config = FANTASY_LINEUP_IQ_CONFIG,
} = {}) {
  const immediateFixture = Array.isArray(clubOutlook.fixtures) ? clubOutlook.fixtures[0] : null;
  const predictionAdjustment = getFantasyLineupPredictionAdjustment(player, predictionOutlook, config);
  const isDefensive = ["GK", "DEF"].includes(player?.position);
  const score = weightedAverage([
    { value: isDefensive ? immediateFixture?.defenceScore : immediateFixture?.attackScore, weight: 0.55 },
    { value: immediateFixture?.overallScore, weight: 0.2 },
    { value: playerScore.threeWeekScore, weight: 0.15 },
    { value: 50 + predictionAdjustment, weight: 0.1 },
  ]);
  const adjustedScore = applyAvailabilityToScore(score, player, config);
  const reasons = [];
  if (hasAvailabilityRisk(player)) {
    reasons.push(`${player?.displayName || player?.name || "This player"} has an availability risk in the player data.`);
  }
  if (isDefensive) reasons.push(`${player?.teamCode || "This club"} has the strongest defensive captain profile among the compared starters.`);
  else reasons.push(`${player?.teamCode || "This club"} has the strongest immediate attacking outlook among the compared starters.`);
  if (predictionAdjustment > 0) reasons.push("Your prediction also supports this club's immediate fixture.");
  if (predictionAdjustment < 0) reasons.push("Your prediction is more cautious for this club.");
  return {
    playerId: player?.id || null,
    score: roundScore(adjustedScore),
    label: player?.displayName || player?.name || "Unknown player",
    reasons,
  };
}

function combinations(items, count) {
  if (count < 0 || count > items.length) return [];
  if (count === 0) return [[]];
  if (count === items.length) return [items];
  const result = [];
  const walk = (start, chosen) => {
    if (chosen.length === count) {
      result.push(chosen);
      return;
    }
    for (let index = start; index <= items.length - (count - chosen.length); index += 1) {
      walk(index + 1, [...chosen, items[index]]);
    }
  };
  walk(0, []);
  return result;
}

export function buildFantasyLineupSquadFromStarterIds({
  squad,
  starterIds = [],
  captainPlayerId,
  viceCaptainPlayerId,
  normaliseSquad = defaultNormaliseSquad,
  validateSquad = defaultValidateSquad,
  source = "lineup-iq",
  timestamp = nowIso(),
} = {}) {
  const starterSet = new Set(starterIds);
  const current = normaliseSquad(clone(squad));
  const next = normaliseSquad({
    ...current,
    source,
    players: (current.players || []).map((player) => ({
      ...player,
      squadRole: starterSet.has(player.id) ? "starter" : "bench",
      isCaptain: player.id === captainPlayerId,
      isViceCaptain: player.id === viceCaptainPlayerId,
    })),
    captainPlayerId: captainPlayerId || null,
    viceCaptainPlayerId: viceCaptainPlayerId || null,
    confirmed: true,
    updatedAt: timestamp,
    lineupIqVersion: FANTASY_LINEUP_IQ_VERSION,
  });
  return {
    squad: next,
    validation: validateSquad(next),
  };
}

function evaluateLineup({ starterIds, squad, playerScoresById, captainScoresById, currentStarterIds, normaliseSquad, validateSquad }) {
  const players = squad.players || [];
  const starterSet = new Set(starterIds);
  const starters = players.filter((player) => starterSet.has(player.id));
  const formation = getFantasyLineupFormation(starters);
  const lineupScore = weightedAverage(starters.map((player) => ({ value: playerScoresById[player.id]?.lineupScore, weight: 1 })));
  const captainScore = Math.max(...starters.map((player) => Number(captainScoresById[player.id]?.score ?? -1)));
  const immediateAttackScore = weightedAverage(starters.map((player) => ({ value: playerScoresById[player.id]?.immediateAttackScore, weight: 1 })));
  const immediateDefenceScore = weightedAverage(starters.map((player) => ({ value: playerScoresById[player.id]?.immediateDefenceScore, weight: 1 })));
  const lowConfidenceStarters = starters.filter((player) => playerScoresById[player.id]?.confidence === "low").length;
  const preservedStarters = starters.filter((player) => currentStarterIds.has(player.id)).length;
  const idOrder = starterIds.slice().sort().join("|");
  const built = buildFantasyLineupSquadFromStarterIds({
    squad,
    starterIds,
    captainPlayerId: starters[0]?.id,
    viceCaptainPlayerId: starters[1]?.id,
    normaliseSquad,
    validateSquad,
  });
  if (!built.validation?.isValid) return null;
  return {
    starterIds: starterIds.slice().sort(),
    starters,
    benchPlayers: players.filter((player) => !starterSet.has(player.id)),
    formation,
    lineupScore: roundScore(lineupScore),
    captainCandidateScore: roundScore(captainScore),
    immediateAttackScore: roundScore(immediateAttackScore),
    immediateDefenceScore: roundScore(immediateDefenceScore),
    lowConfidenceStarters,
    preservedStarters,
    idOrder,
    validation: built.validation,
  };
}

function compareLineups(a, b) {
  const fields = [
    ["lineupScore", 1],
    ["captainCandidateScore", 1],
    ["immediateAttackScore", 1],
    ["immediateDefenceScore", 1],
    ["lowConfidenceStarters", -1],
    ["preservedStarters", 1],
  ];
  for (const [field, direction] of fields) {
    const diff = (Number(a[field]) || 0) - (Number(b[field]) || 0);
    if (Math.abs(diff) > 0.000001) return diff * direction;
  }
  return b.idOrder.localeCompare(a.idOrder);
}

export function generateFantasyLineupCandidates({
  squad,
  playerScoresById = {},
  captainScoresById = {},
  normaliseSquad = defaultNormaliseSquad,
  validateSquad = defaultValidateSquad,
} = {}) {
  const current = normaliseSquad(clone(squad));
  const players = current.players || [];
  const currentStarterIds = new Set(players.filter((player) => player.squadRole === "starter").map((player) => player.id));
  const groups = {
    GK: players.filter((player) => player.position === "GK"),
    DEF: players.filter((player) => player.position === "DEF"),
    MID: players.filter((player) => player.position === "MID"),
    FWD: players.filter((player) => player.position === "FWD"),
  };
  const candidates = [];
  combinations(groups.GK, 1).forEach((gks) => {
    for (let defCount = 3; defCount <= Math.min(5, groups.DEF.length); defCount += 1) {
      for (let midCount = 2; midCount <= Math.min(5, groups.MID.length); midCount += 1) {
        const fwdCount = 11 - 1 - defCount - midCount;
        if (fwdCount < 1 || fwdCount > Math.min(3, groups.FWD.length)) continue;
        combinations(groups.DEF, defCount).forEach((defs) => {
          combinations(groups.MID, midCount).forEach((mids) => {
            combinations(groups.FWD, fwdCount).forEach((fwds) => {
              const starterIds = [...gks, ...defs, ...mids, ...fwds].map((player) => player.id);
              const candidate = evaluateLineup({
                starterIds,
                squad: current,
                playerScoresById,
                captainScoresById,
                currentStarterIds,
                normaliseSquad,
                validateSquad,
              });
              if (candidate && FANTASY_LINEUP_IQ_SUPPORTED_FORMATIONS.includes(candidate.formation)) {
                candidates.push(candidate);
              }
            });
          });
        });
      }
    }
  });
  return candidates.sort((a, b) => compareLineups(b, a));
}

function selectCaptainPair(lineup, currentSquad, captainScoresById, config) {
  const starters = lineup.starters || [];
  const ranked = starters
    .map((player) => ({ player, ...(captainScoresById[player.id] || { score: null }) }))
    .sort((a, b) => (Number(b.score) || 0) - (Number(a.score) || 0) || String(a.player.id).localeCompare(String(b.player.id)));
  const best = ranked[0] || null;
  const currentCaptain = ranked.find((item) => item.player.id === currentSquad.captainPlayerId);
  const captain =
    currentCaptain && best && Number(best.score || 0) - Number(currentCaptain.score || 0) < config.preserveCaptainThreshold
      ? currentCaptain
      : best;
  const vicePool = ranked.filter((item) => item.player.id !== captain?.player?.id);
  const bestVice = vicePool[0] || null;
  const currentVice = vicePool.find((item) => item.player.id === currentSquad.viceCaptainPlayerId);
  const viceCaptain =
    currentVice && bestVice && Number(bestVice.score || 0) - Number(currentVice.score || 0) < config.preserveCaptainThreshold
      ? currentVice
      : bestVice;
  return {
    captain: captain ? { playerId: captain.player.id, score: captain.score, label: captain.label, reasons: captain.reasons || [] } : null,
    viceCaptain: viceCaptain ? { playerId: viceCaptain.player.id, score: viceCaptain.score, label: viceCaptain.label, reasons: viceCaptain.reasons || [] } : null,
    ranked: ranked.map((item) => ({ playerId: item.player.id, score: item.score, label: item.label, reasons: item.reasons || [] })),
  };
}

function buildBenchOrder(benchPlayers = [], playerScoresById = {}) {
  const benchGoalkeeper = benchPlayers.find((player) => player.position === "GK") || null;
  const outfieldBench = benchPlayers
    .filter((player) => player.position !== "GK")
    .sort((a, b) => (Number(playerScoresById[b.id]?.lineupScore) || 0) - (Number(playerScoresById[a.id]?.lineupScore) || 0) || String(a.id).localeCompare(String(b.id)));
  return {
    goalkeeper: benchGoalkeeper,
    outfield: outfieldBench,
  };
}

function getLineupVerdict(improvement, swapCount, config) {
  if (improvement >= config.verdictBands.strongImprovement) return "Strong improvement";
  if (improvement >= config.verdictBands.goodImprovement) return "Good improvement";
  if (improvement >= config.verdictBands.smallImprovement) {
    return swapCount > 2 && improvement < config.closeDecisionThreshold
      ? "Your current lineup is already close to the model's strongest option."
      : "Small improvement";
  }
  if (improvement === 0) return "Already well set";
  return "Current lineup scores better";
}

function buildPlayerDecisions({ squad, suggestedLineup, playerScoresById }) {
  const suggestedStarterIds = new Set(suggestedLineup.starterIds);
  return (squad.players || []).map((player) => {
    const currentRole = player.squadRole === "starter" ? "starter" : "bench";
    const suggestedRole = suggestedStarterIds.has(player.id) ? "starter" : "bench";
    const score = playerScoresById[player.id] || {};
    const changed = currentRole !== suggestedRole;
    const reason = !changed
      ? score.availabilityRisk
        ? "Availability risk is accounted for in the lineup score."
        : "No role change suggested."
      : suggestedRole === "starter"
      ? score.availabilityRisk
        ? "Availability risk remains, but this is still the strongest legal lineup from the current squad."
        : `${player.teamCode} has the stronger immediate ${["GK", "DEF"].includes(player.position) ? "defensive" : "attacking"} fixture outlook.`
      : score.availabilityRisk
      ? "Availability risk makes this player a weaker lineup option."
      : `${player.teamCode} is the higher-risk option in this model comparison.`;
    return {
      playerId: player.id,
      player,
      currentRole,
      suggestedRole,
      immediateScore: score.immediateScore,
      threeWeekScore: score.threeWeekScore,
      lineupScore: score.lineupScore,
      reason,
      confidence: score.confidence,
      closeCall: false,
    };
  });
}

function buildAlternatives(candidates, best, config) {
  const bestStarterSet = new Set(best?.starterIds || []);
  return candidates
    .filter((candidate) => candidate !== best)
    .filter((candidate) => Number(best.lineupScore || 0) - Number(candidate.lineupScore || 0) <= config.alternativeScoreDistance)
    .filter((candidate) => {
      const differentStarters = candidate.starterIds.filter((id) => !bestStarterSet.has(id)).length;
      return candidate.formation !== best.formation || differentStarters >= 2;
    })
    .slice(0, 2)
    .map((candidate) => ({
      ...candidate,
      label:
        candidate.formation !== best.formation && Number(candidate.immediateDefenceScore || 0) > Number(best.immediateDefenceScore || 0)
          ? "Strong defensive alternative"
          : candidate.formation !== best.formation && Number(candidate.immediateAttackScore || 0) > Number(best.immediateAttackScore || 0)
          ? "Strong attacking alternative"
          : "Minimal-change option",
    }));
}

function buildCloseDecisions(decisions, config) {
  const starters = decisions.filter((decision) => decision.suggestedRole === "starter");
  const bench = decisions.filter((decision) => decision.suggestedRole === "bench" && decision.player.position !== "GK");
  const close = [];
  starters.forEach((starter) => {
    bench
      .filter((candidate) => candidate.player.position === starter.player.position)
      .forEach((candidate) => {
        const diff = Math.abs(Number(starter.lineupScore || 0) - Number(candidate.lineupScore || 0));
        if (diff > 0 && diff < config.closeDecisionThreshold) {
          close.push({
            playerIds: [starter.playerId, candidate.playerId],
            scoreGap: roundScore(diff),
            label: "Close call",
            reason: `${starter.player.displayName || starter.player.name} and ${candidate.player.displayName || candidate.player.name} are separated by only ${roundScore(diff)} lineup points. Either choice is reasonable.`,
          });
        }
      });
  });
  return close.slice(0, 3);
}

function calculateLineupConfidence({ squad, playerScoresById, clubOutlooks = {}, predictionOutlooks = {}, playerDataStatus = {} }) {
  const players = squad.players || [];
  const scores = players.map((player) => playerScoresById[player.id]).filter(Boolean);
  const lowCount = scores.filter((score) => score.confidence === "low").length;
  const missingImmediate = scores.filter((score) => score.missingImmediateFixture).length;
  const unresolved = players.filter((player) => ["ambiguous", "unmatched", "legacy"].includes(player.reconciliationStatus)).length;
  const unknownClubCount = players.filter((player) => !clubOutlooks[player.teamCode]).length;
  const availabilityRiskCount = players.filter(hasAvailabilityRisk).length;
  const predictedClubs = new Set(Object.values(predictionOutlooks).filter((row) => row?.predictionCount).map((row) => row.teamCode));
  const representedClubs = new Set(players.map((player) => player.teamCode).filter(Boolean));
  const predictionCoverage = representedClubs.size ? predictedClubs.size / representedClubs.size : 0;
  const modelConfidenceAverage = weightedAverage(
    Array.from(representedClubs).map((teamCode) => ({ value: clubOutlooks[teamCode]?.fixtures?.[0]?.confidenceScore ?? clubOutlooks[teamCode]?.confidenceScore, weight: 1 }))
  );
  let confidenceScore = clamp((modelConfidenceAverage ?? 45) - lowCount * 4 - missingImmediate * 6 - unresolved * 6 - unknownClubCount * 18 - availabilityRiskCount * 5 + predictionCoverage * 10, 0, 100);
  if (playerDataStatus?.cacheStatus === "fallback") confidenceScore = Math.min(confidenceScore, 45);
  const confidence = confidenceScore >= 72 ? "high" : confidenceScore >= 48 ? "medium" : "low";
  const reasons = [];
  if (missingImmediate) reasons.push(`${missingImmediate} players have limited immediate fixture evidence.`);
  if (unknownClubCount) reasons.push(`${unknownClubCount} players have unknown club fixture data.`);
  if (availabilityRiskCount) reasons.push(`${availabilityRiskCount} players have availability risks in the player data.`);
  if (unresolved) reasons.push(`${unresolved} players need player-data confirmation.`);
  if (!predictedClubs.size) reasons.push("No immediate predictions found; objective fixture model still drives the analysis.");
  if (playerDataStatus?.cacheStatus === "fallback") reasons.push("Player data is using a fallback cache.");
  return {
    confidence,
    confidenceScore: roundScore(confidenceScore),
    reasons,
  };
}

export function createFantasyLineupIqAnalysis({
  squad,
  clubOutlooks = {},
  predictionOutlooks = {},
  normaliseSquad = defaultNormaliseSquad,
  validateSquad = defaultValidateSquad,
  playerDataStatus = {},
  config = FANTASY_LINEUP_IQ_CONFIG,
  idFactory = makeId,
  timestamp = nowIso(),
} = {}) {
  const currentSquad = normaliseSquad(clone(squad));
  const base = {
    id: idFactory(),
    createdAt: timestamp,
    currentSquad,
    suggestedSquad: null,
    editableSquad: null,
    currentLineupScore: null,
    suggestedLineupScore: null,
    improvement: null,
    currentFormation: currentSquad.formation || getFantasyLineupFormation((currentSquad.players || []).filter((player) => player.squadRole === "starter")),
    suggestedFormation: null,
    currentCaptainId: currentSquad.captainPlayerId || null,
    suggestedCaptainId: null,
    currentViceCaptainId: currentSquad.viceCaptainPlayerId || null,
    suggestedViceCaptainId: null,
    playerDecisions: [],
    alternatives: [],
    minimalChange: null,
    benchOrder: null,
    warnings: [],
    confidence: null,
    diagnostics: null,
    version: FANTASY_LINEUP_IQ_VERSION,
    status: "idle",
  };
  if (!currentSquad.confirmed) {
    return {
      ...base,
      warnings: ["Confirm your fantasy squad before analysing your lineup."],
      status: "idle",
    };
  }
  const validation = validateSquad(currentSquad);
  if (!validation?.isValid) {
    return {
      ...base,
      warnings: validation?.errors || validation?.messages || ["Your saved squad is not valid."],
      status: "idle",
    };
  }
  const playerScoresById = {};
  const captainScoresById = {};
  (currentSquad.players || []).forEach((player) => {
    playerScoresById[player.id] = scoreFantasyLineupPlayer({
      player,
      clubOutlook: clubOutlooks[player.teamCode] || {},
      predictionOutlook: predictionOutlooks[player.teamCode] || {},
      config,
    });
    captainScoresById[player.id] = scoreFantasyLineupCaptain({
      player,
      playerScore: playerScoresById[player.id],
      clubOutlook: clubOutlooks[player.teamCode] || {},
      predictionOutlook: predictionOutlooks[player.teamCode] || {},
      config,
    });
  });
  const candidates = generateFantasyLineupCandidates({
    squad: currentSquad,
    playerScoresById,
    captainScoresById,
    normaliseSquad,
    validateSquad,
  });
  const currentStarterIds = (currentSquad.players || []).filter((player) => player.squadRole === "starter").map((player) => player.id).sort();
  const currentLineup = candidates.find((candidate) => candidate.starterIds.join("|") === currentStarterIds.join("|")) ||
    evaluateLineup({ starterIds: currentStarterIds, squad: currentSquad, playerScoresById, captainScoresById, currentStarterIds: new Set(currentStarterIds), normaliseSquad, validateSquad });
  const best = candidates[0] || currentLineup;
  if (!best || !currentLineup) {
    return {
      ...base,
      warnings: ["No legal lineup could be generated from this squad."],
      status: "idle",
    };
  }
  const captainPair = selectCaptainPair(best, currentSquad, captainScoresById, config);
  const suggestedBuilt = buildFantasyLineupSquadFromStarterIds({
    squad: currentSquad,
    starterIds: best.starterIds,
    captainPlayerId: captainPair.captain?.playerId,
    viceCaptainPlayerId: captainPair.viceCaptain?.playerId,
    normaliseSquad,
    validateSquad,
  });
  const playerDecisions = buildPlayerDecisions({ squad: currentSquad, suggestedLineup: best, playerScoresById });
  const swapCount = playerDecisions.filter((decision) => decision.currentRole !== decision.suggestedRole).length / 2;
  const improvement = roundScore(Number(best.lineupScore || 0) - Number(currentLineup.lineupScore || 0));
  const alternatives = buildAlternatives(candidates, best, config);
  const betterCandidates = candidates.filter((candidate) => Number(candidate.lineupScore || 0) > Number(currentLineup.lineupScore || 0));
  const minimalCandidate = (betterCandidates.length ? betterCandidates : candidates)
    .slice()
    .sort((a, b) => {
      const aSwaps = (currentSquad.players || []).filter((player) => (player.squadRole === "starter") !== a.starterIds.includes(player.id)).length / 2;
      const bSwaps = (currentSquad.players || []).filter((player) => (player.squadRole === "starter") !== b.starterIds.includes(player.id)).length / 2;
      return aSwaps - bSwaps || Number(b.lineupScore || 0) - Number(a.lineupScore || 0) || String(a.idOrder).localeCompare(String(b.idOrder));
    })[0] || best;
  const minimalCaptainPair = selectCaptainPair(minimalCandidate, currentSquad, captainScoresById, config);
  const minimalBuilt = buildFantasyLineupSquadFromStarterIds({
    squad: currentSquad,
    starterIds: minimalCandidate.starterIds,
    captainPlayerId: minimalCaptainPair.captain?.playerId,
    viceCaptainPlayerId: minimalCaptainPair.viceCaptain?.playerId,
    normaliseSquad,
    validateSquad,
  });
  const closeDecisions = buildCloseDecisions(playerDecisions, config);
  const availabilityRiskPlayers = (currentSquad.players || []).filter(hasAvailabilityRisk);
  return {
    ...base,
    suggestedSquad: suggestedBuilt.squad,
    editableSquad: suggestedBuilt.squad,
    currentLineupScore: roundScore(currentLineup.lineupScore),
    suggestedLineupScore: roundScore(best.lineupScore),
    improvement,
    currentFormation: currentLineup.formation,
    suggestedFormation: best.formation,
    suggestedCaptainId: captainPair.captain?.playerId || null,
    suggestedViceCaptainId: captainPair.viceCaptain?.playerId || null,
    captain: captainPair.captain,
    viceCaptain: captainPair.viceCaptain,
    captainRankings: captainPair.ranked,
    playerDecisions: playerDecisions.map((decision) => ({
      ...decision,
      closeCall: closeDecisions.some((item) => item.playerIds.includes(decision.playerId)),
    })),
    alternatives,
    minimalChange: {
      ...minimalCandidate,
      squad: minimalBuilt.squad,
      captain: minimalCaptainPair.captain,
      viceCaptain: minimalCaptainPair.viceCaptain,
      improvement: roundScore(Number(minimalCandidate.lineupScore || 0) - Number(currentLineup.lineupScore || 0)),
      swaps: (currentSquad.players || []).filter((player) => (player.squadRole === "starter") !== minimalCandidate.starterIds.includes(player.id)).length / 2,
      label: "Minimal-change option",
    },
    benchOrder: buildBenchOrder(suggestedBuilt.squad.players.filter((player) => player.squadRole === "bench"), playerScoresById),
    warnings: [
      "Lineup IQ only updates your squad inside Prediction Addiction.",
      ...availabilityRiskPlayers.slice(0, 3).map((player) => `${player.displayName || player.name} has an availability risk and is penalised in Lineup IQ.`),
      ...closeDecisions.map((item) => item.reason),
    ],
    confidence: calculateLineupConfidence({ squad: currentSquad, playerScoresById, clubOutlooks, predictionOutlooks, playerDataStatus }),
    verdict: getLineupVerdict(improvement, swapCount, config),
    diagnostics: {
      evaluatedLegalLineupCount: candidates.length,
      bestLineupScore: roundScore(best.lineupScore),
      currentLineupScore: roundScore(currentLineup.lineupScore),
      minimalChangeScore: roundScore(minimalCandidate.lineupScore),
      tieBreakOrder: ["lineupScore", "captainCandidateScore", "immediateAttackScore", "immediateDefenceScore", "lowConfidenceStarters", "preservedStarters", "idOrder"],
      captainScores: captainPair.ranked,
      playerScores: playerScoresById,
      closeDecisionThreshold: config.closeDecisionThreshold,
      confidenceReasons: calculateLineupConfidence({ squad: currentSquad, playerScoresById, clubOutlooks, predictionOutlooks, playerDataStatus }).reasons,
      modelVersion: FANTASY_LINEUP_IQ_VERSION,
    },
    status: "ready",
  };
}

export function createFantasyLineupManualAdjustment({
  analysis,
  starterIds,
  captainPlayerId,
  viceCaptainPlayerId,
  normaliseSquad = defaultNormaliseSquad,
  validateSquad = defaultValidateSquad,
} = {}) {
  if (!analysis?.currentSquad) return null;
  const built = buildFantasyLineupSquadFromStarterIds({
    squad: analysis.currentSquad,
    starterIds,
    captainPlayerId,
    viceCaptainPlayerId,
    normaliseSquad,
    validateSquad,
  });
  return {
    ...analysis,
    editableSquad: built.squad,
    editableValidation: built.validation,
    status: built.validation?.isValid ? "ready" : "analysing",
  };
}

export function containsFantasyLineupGuaranteeLanguage(value) {
  return /guarantee|must start|will score more points|guaranteed clean sheet/i.test(JSON.stringify(value || ""));
}
