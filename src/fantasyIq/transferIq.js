import { hasActionableFantasyAvailabilityRisk } from "./availability";

export const FANTASY_TRANSFER_IQ_VERSION = "transfer-iq-v1";

export const FANTASY_TRANSFER_IQ_CATEGORY_LABELS = {
  fixtureOutlook: "Fixture Outlook",
  attackOutlook: "Attack Outlook",
  defenceOutlook: "Defence Outlook",
  captaincyOutlook: "Captaincy Outlook",
  squadBalance: "Squad Balance",
  predictionAlignment: "Prediction Alignment",
  benchStrength: "Bench Strength",
};

export const FANTASY_TRANSFER_IQ_CATEGORY_KEYS = Object.keys(FANTASY_TRANSFER_IQ_CATEGORY_LABELS);

export const FANTASY_TRANSFER_IQ_VERDICT_THRESHOLDS = {
  strongImprovement: 8,
  goodImprovement: 4,
  smallImprovement: 1,
  slightReduction: -1,
  significantReduction: -4,
  mixedOverallBand: 3,
  mixedCategoryMove: 10,
};

export const FANTASY_TRANSFER_RECOMMENDATION_COUNTS = ["1", "2", "3", "4", "5", "ALL"];

function clone(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function nowIso() {
  return new Date().toISOString();
}

function makeId() {
  return `transfer-iq-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isFiniteNumber(value) {
  return Number.isFinite(Number(value));
}

function roundScore(value) {
  return isFiniteNumber(value) ? Math.round(Number(value)) : null;
}

function normaliseConfidence(confidence) {
  return String(confidence || "").trim().toLowerCase() || null;
}

function confidenceRank(confidence) {
  const rank = { locked: 0, low: 1, medium: 2, high: 3 };
  return rank[normaliseConfidence(confidence)] ?? null;
}

function defaultNormaliseSquad(squad) {
  return clone(squad) || { players: [] };
}

function defaultValidateSquad(squad) {
  return { isValid: true, valid: true, errors: [], messages: [], warnings: [], summary: {} };
}

function getPlayerName(player = {}) {
  return player.displayName || player.name || player.webName || "Unknown player";
}

function toSquadPlayer(player = {}, outgoingPlayer = {}) {
  return {
    id: player.id,
    sourceId: player.sourceId ?? null,
    name: player.displayName || player.name || player.webName || "",
    displayName: player.displayName || player.name || player.webName || "",
    webName: player.webName || "",
    normalisedName: player.normalisedName || "",
    teamId: player.teamId || null,
    teamCode: String(player.teamCode || "").toUpperCase(),
    teamName: player.teamName || "",
    position: String(player.position || "").toUpperCase(),
    positionId: player.positionId ?? null,
    price: player.price ?? null,
    priceTenths: player.priceTenths ?? player.externalMetadata?.nowCost ?? null,
    squadRole: outgoingPlayer.squadRole || "bench",
    isCaptain: false,
    isViceCaptain: false,
    confidence: 1,
    manuallyConfirmed: true,
    active: player.active !== false,
    availabilityStatus: player.availabilityStatus || "unknown",
    externalMetadata: player.externalMetadata || {},
    dataSource: player.dataSource || null,
    dataUpdatedAt: player.dataUpdatedAt || null,
    canonicalPlayerId: player.canonicalPlayerId || player.id || null,
    reconciliationStatus: player.id ? "matched" : null,
    reconciliationConfidence: player.id ? 1 : null,
    temporary: !!player.temporary,
  };
}

function getPlayerPrice(player = {}) {
  const tenths = [
    player.priceTenths,
    player.externalMetadata?.nowCost,
    player.externalMetadata?.now_cost,
  ].find((value) => Number.isFinite(Number(value)) && Number(value) > 0);
  if (tenths != null) return Number(tenths) / 10;
  const price = Number(player.price ?? player.cost ?? player.externalMetadata?.price);
  return Number.isFinite(price) && price > 0 ? price : null;
}

function scoreRecommendationPlayer(player = {}, clubOutlook = {}) {
  const position = String(player.position || "").toUpperCase();
  const fixtureScore = ["GK", "DEF"].includes(position)
    ? clubOutlook.defenceScore ?? clubOutlook.overallScore
    : clubOutlook.attackScore ?? clubOutlook.overallScore;
  const form = Number(player.externalMetadata?.form ?? player.form);
  const pointsPerGame = Number(player.externalMetadata?.pointsPerGame ?? player.externalMetadata?.points_per_game ?? player.pointsPerGame);
  const selectedBy = Number(player.externalMetadata?.selectedByPercent ?? player.externalMetadata?.selected_by_percent ?? player.selectedByPercent);
  const starts = Number(player.externalMetadata?.starts ?? player.starts);
  const minutes = Number(player.externalMetadata?.minutes ?? player.minutes);
  const price = getPlayerPrice(player);
  const availabilityPenalty = hasActionableFantasyAvailabilityRisk(player) ? 18 : 0;
  const starterScore =
    (Number.isFinite(starts) ? Math.min(18, starts * 1.8) : 8) +
    (Number.isFinite(minutes) ? Math.min(16, minutes / 120) : 6);
  const dataScore =
    (Number(fixtureScore) || 50) * 0.5 +
    (Number.isFinite(form) ? Math.min(18, form * 2.4) : 8) +
    (Number.isFinite(pointsPerGame) ? Math.min(18, pointsPerGame * 3) : 8) +
    (Number.isFinite(selectedBy) ? Math.min(8, selectedBy / 5) : 3) +
    starterScore;
  const valueScore = price ? Math.max(-8, Math.min(8, (8 - price) * 1.5)) : 0;
  return dataScore + valueScore - availabilityPenalty;
}

function transferSetKey(transfers = []) {
  return transfers
    .map((transfer) => `${transfer.outgoingPlayerId}->${transfer.incomingPlayerId}`)
    .sort()
    .join("|");
}

function applyTransferSet({
  currentSquad,
  transfers = [],
  normaliseSquad = defaultNormaliseSquad,
  validateSquad = defaultValidateSquad,
  timestamp = nowIso(),
} = {}) {
  const current = normaliseSquad(clone(currentSquad));
  const byOutgoingId = new Map(transfers.map((transfer) => [transfer.outgoingPlayerId, transfer]));
  const proposedPlayers = (current.players || []).map((player) => {
    const transfer = byOutgoingId.get(player.id);
    if (!transfer) return { ...player };
    return toSquadPlayer(transfer.incomingPlayer, player);
  });
  const proposedSquad = normaliseSquad({
    ...current,
    source: "transfer-iq",
    players: proposedPlayers,
    confirmed: true,
    updatedAt: timestamp,
    transferIqVersion: FANTASY_TRANSFER_IQ_VERSION,
  });
  const validation = validateSquad(proposedSquad);
  return {
    currentSquad: current,
    proposedSquad,
    validation,
    status: validation?.isValid ? "ready" : "invalid",
  };
}

export function getFantasyTransferLegalBlocker({
  currentSquad,
  outgoingPlayerId,
  incomingPlayer,
  maxPlayersPerClub = 3,
} = {}) {
  const players = Array.isArray(currentSquad?.players) ? currentSquad.players : [];
  const outgoingPlayer = players.find((player) => player.id === outgoingPlayerId);
  if (!outgoingPlayer) return "Choose a player from your confirmed squad first.";
  if (!incomingPlayer?.id) return "Choose a replacement from the player list.";
  if (incomingPlayer.active === false) return "This player is not active in the current player list.";
  if (players.some((player) => player.id === incomingPlayer.id)) return "This player is already in your squad.";
  if (String(incomingPlayer.position || "").toUpperCase() !== String(outgoingPlayer.position || "").toUpperCase()) {
    const positionLabel = outgoingPlayer.position === "GK" ? "goalkeeper" : outgoingPlayer.position === "DEF" ? "defender" : outgoingPlayer.position === "MID" ? "midfielder" : "forward";
    return `The replacement must be a ${positionLabel}.`;
  }
  const nextClubCount = players
    .filter((player) => player.id !== outgoingPlayerId)
    .filter((player) => String(player.teamCode || "").toUpperCase() === String(incomingPlayer.teamCode || "").toUpperCase()).length + 1;
  if (nextClubCount > maxPlayersPerClub) {
    return `You already own three ${incomingPlayer.teamCode} players.`;
  }
  return "";
}

export function buildFantasyIqTransferSquad({
  currentSquad,
  outgoingPlayerId,
  incomingPlayer,
  captainPlayerId,
  viceCaptainPlayerId,
  normaliseSquad = defaultNormaliseSquad,
  validateSquad = defaultValidateSquad,
  maxPlayersPerClub = 3,
  timestamp = nowIso(),
} = {}) {
  const current = normaliseSquad(clone(currentSquad));
  const players = Array.isArray(current?.players) ? current.players : [];
  const outgoingPlayer = players.find((player) => player.id === outgoingPlayerId);
  const blocker = getFantasyTransferLegalBlocker({ currentSquad: current, outgoingPlayerId, incomingPlayer, maxPlayersPerClub });
  const errors = blocker ? [blocker] : [];
  const outgoingCaptainId = current.captainPlayerId || players.find((player) => player.isCaptain)?.id || null;
  const outgoingViceCaptainId = current.viceCaptainPlayerId || players.find((player) => player.isViceCaptain)?.id || null;
  const replacementCaptainId = outgoingPlayerId === outgoingCaptainId ? captainPlayerId : outgoingCaptainId;
  const replacementViceCaptainId = outgoingPlayerId === outgoingViceCaptainId ? viceCaptainPlayerId : outgoingViceCaptainId;

  if (outgoingPlayerId === outgoingCaptainId && !captainPlayerId) {
    errors.push("Choose a hypothetical replacement captain before comparing.");
  }
  if (outgoingPlayerId === outgoingViceCaptainId && !viceCaptainPlayerId) {
    errors.push("Choose a hypothetical replacement vice-captain before comparing.");
  }
  if (replacementCaptainId && replacementViceCaptainId && replacementCaptainId === replacementViceCaptainId) {
    errors.push("Captain and vice-captain must be different.");
  }

  const proposedPlayers = players.map((player) => {
    const nextPlayer = player.id === outgoingPlayerId && incomingPlayer && outgoingPlayer
      ? toSquadPlayer(incomingPlayer, player)
      : { ...player };
    return {
      ...nextPlayer,
      isCaptain: nextPlayer.id === replacementCaptainId,
      isViceCaptain: nextPlayer.id === replacementViceCaptainId,
    };
  });

  const proposedSquad = normaliseSquad({
    ...current,
    source: "transfer-iq",
    players: proposedPlayers,
    captainPlayerId: replacementCaptainId || null,
    viceCaptainPlayerId: replacementViceCaptainId || null,
    confirmed: true,
    updatedAt: timestamp,
    transferIqVersion: FANTASY_TRANSFER_IQ_VERSION,
  });
  const validation = validateSquad(proposedSquad);
  const captain = proposedSquad.players?.find((player) => player.id === proposedSquad.captainPlayerId);
  const viceCaptain = proposedSquad.players?.find((player) => player.id === proposedSquad.viceCaptainPlayerId);

  if (captain && captain.squadRole !== "starter") errors.push("Replacement captain must be a starter.");
  if (viceCaptain && viceCaptain.squadRole !== "starter") errors.push("Replacement vice-captain must be a starter.");

  const allErrors = [...errors, ...(validation?.errors || validation?.messages || [])];
  return {
    currentSquad: current,
    proposedSquad,
    outgoingPlayer: outgoingPlayer || null,
    incomingPlayer: incomingPlayer || null,
    validation: {
      ...(validation || {}),
      isValid: !allErrors.length && !!validation?.isValid,
      valid: !allErrors.length && !!(validation?.valid ?? validation?.isValid),
      errors: allErrors,
      messages: allErrors,
    },
    status: allErrors.length ? "invalid" : "ready",
  };
}

function compareScore(currentValue, proposedValue) {
  if (currentValue == null && proposedValue == null) return { current: null, proposed: null, delta: null, status: "unavailable" };
  if (currentValue == null) return { current: null, proposed: roundScore(proposedValue), delta: null, status: "newly-available" };
  if (proposedValue == null) return { current: roundScore(currentValue), proposed: null, delta: null, status: "unavailable-after" };
  const current = roundScore(currentValue);
  const proposed = roundScore(proposedValue);
  if (current == null && proposed == null) return { current, proposed, delta: null, status: "unavailable" };
  if (current == null) return { current, proposed, delta: null, status: "newly-available" };
  if (proposed == null) return { current, proposed, delta: null, status: "unavailable-after" };
  return { current, proposed, delta: proposed - current, status: "available" };
}

function getFantasyTransferVerdict(overallDelta, categoryDeltas = {}) {
  const numericDeltas = Object.values(categoryDeltas)
    .map((item) => item?.delta)
    .filter((delta) => Number.isFinite(delta));
  const hasLargeGain = numericDeltas.some((delta) => delta >= FANTASY_TRANSFER_IQ_VERDICT_THRESHOLDS.mixedCategoryMove);
  const hasLargeLoss = numericDeltas.some((delta) => delta <= -FANTASY_TRANSFER_IQ_VERDICT_THRESHOLDS.mixedCategoryMove);
  if (hasLargeGain && hasLargeLoss && Math.abs(Number(overallDelta || 0)) <= FANTASY_TRANSFER_IQ_VERDICT_THRESHOLDS.mixedOverallBand) {
    return "Mixed trade-off";
  }
  if (overallDelta >= FANTASY_TRANSFER_IQ_VERDICT_THRESHOLDS.strongImprovement) return "Strong improvement";
  if (overallDelta >= FANTASY_TRANSFER_IQ_VERDICT_THRESHOLDS.goodImprovement) return "Good improvement";
  if (overallDelta >= FANTASY_TRANSFER_IQ_VERDICT_THRESHOLDS.smallImprovement) return "Small improvement";
  if (overallDelta === 0) return "Broadly neutral";
  if (hasLargeGain && hasLargeLoss) return "Mixed trade-off";
  if (overallDelta <= FANTASY_TRANSFER_IQ_VERDICT_THRESHOLDS.significantReduction) return "Significant reduction";
  return "Slight reduction";
}

function getCategoryImpactGroups(categoryDeltas = {}) {
  const rows = Object.entries(categoryDeltas)
    .map(([key, item]) => ({
      key,
      label: FANTASY_TRANSFER_IQ_CATEGORY_LABELS[key] || key,
      ...item,
    }))
    .sort((a, b) => Math.abs(Number(b.delta || 0)) - Math.abs(Number(a.delta || 0)) || a.label.localeCompare(b.label));
  return {
    sorted: rows,
    improves: rows.filter((row) => Number(row.delta) > 0),
    weakens: rows.filter((row) => Number(row.delta) < 0),
    unchanged: rows.filter((row) => row.delta === 0 || row.delta == null),
  };
}

function describePositionFocus(position) {
  if (["GK", "DEF"].includes(position)) return "defence";
  if (["MID", "FWD"].includes(position)) return "attack";
  return "fixture";
}

function buildTransferExplanations({ outgoingPlayer, incomingPlayer, categoryDeltas, confidenceDelta }) {
  const improves = [];
  const weakens = [];
  const summary = [];
  const incomingName = incomingPlayer?.displayName || incomingPlayer?.name || "the incoming player";
  const incomingClub = incomingPlayer?.teamCode || "the incoming club";
  const position = String(incomingPlayer?.position || outgoingPlayer?.position || "").toUpperCase();
  const focus = describePositionFocus(position);
  const addLine = (target, key, text) => {
    const row = categoryDeltas[key];
    if (row?.delta == null || row.delta === 0) return;
    target.push(text(row.delta, row));
  };

  if (focus === "defence") {
    addLine(improves, "defenceOutlook", (delta) => `Defence Outlook improves by ${delta} points from the incoming club's clean-sheet schedule.`);
    addLine(weakens, "defenceOutlook", (delta) => `Defence Outlook reduces by ${Math.abs(delta)} points from weaker defensive fixture evidence.`);
  } else {
    addLine(improves, "attackOutlook", (delta) => `Attack Outlook improves by ${delta} points from stronger modelled scoring fixtures for ${incomingClub}.`);
    addLine(weakens, "attackOutlook", (delta) => `Attack Outlook reduces by ${Math.abs(delta)} points from weaker modelled scoring fixtures for ${incomingClub}.`);
  }
  addLine(improves, "fixtureOutlook", (delta) => `Fixture Outlook improves by ${delta} points over the next five gameweeks.`);
  addLine(weakens, "fixtureOutlook", (delta) => `Fixture Outlook reduces by ${Math.abs(delta)} points over the next five gameweeks.`);
  addLine(improves, "captaincyOutlook", (delta) => `Captaincy Outlook improves by ${delta} points after the hypothetical captain and vice-captain setup.`);
  addLine(weakens, "captaincyOutlook", (delta) => `Captaincy Outlook reduces by ${Math.abs(delta)} points after the hypothetical captain and vice-captain setup.`);
  addLine(improves, "squadBalance", (delta) => `Squad Balance improves by ${delta} points through club and role distribution.`);
  addLine(weakens, "squadBalance", (delta) => `Squad Balance reduces by ${Math.abs(delta)} points through increased concentration or weaker role coverage.`);
  addLine(improves, "benchStrength", (delta) => `Bench Strength improves by ${delta} points because the inherited bench role has stronger club outlook.`);
  addLine(weakens, "benchStrength", (delta) => `Bench Strength reduces by ${Math.abs(delta)} points because the inherited bench role has weaker club outlook.`);

  const alignment = categoryDeltas.predictionAlignment;
  if (alignment?.status === "newly-available") {
    improves.push("Prediction Alignment becomes available for this comparison.");
  } else if (alignment?.status === "unavailable" || alignment?.status === "unavailable-after") {
    summary.push("Submitting upcoming predictions will unlock Prediction Alignment in this transfer comparison.");
  } else if (alignment?.delta > 0) {
    improves.push(`Prediction Alignment improves by ${alignment.delta} points, so the squad better reflects your submitted score predictions.`);
  } else if (alignment?.delta < 0) {
    weakens.push(`Prediction Alignment reduces by ${Math.abs(alignment.delta)} points, so the squad is less aligned with your submitted score predictions.`);
  }

  if (confidenceDelta?.changed) {
    const target = confidenceDelta.direction === "up" ? improves : weakens;
    target.push(`Model confidence moves from ${confidenceDelta.current} to ${confidenceDelta.proposed}.`);
  }
  if (incomingPlayer?.availabilityStatus && !["available", "unknown"].includes(incomingPlayer.availabilityStatus)) {
    weakens.push(`${incomingName} has an availability marker in the player data. Check official team news before confirming any transfer.`);
  }

  return {
    strengthsAdded: improves,
    concernsAdded: weakens,
    recommendationSummary: summary.length ? summary : [
      improves[0] || weakens[0] || "The comparison is broadly neutral across the main Fantasy IQ categories.",
    ],
  };
}

export function compareFantasyIqReports(currentReport = {}, proposedReport = {}, context = {}) {
  const overall = compareScore(currentReport.overallScore, proposedReport.overallScore);
  const categoryDeltas = FANTASY_TRANSFER_IQ_CATEGORY_KEYS.reduce((out, key) => {
    out[key] = compareScore(currentReport.categories?.[key], proposedReport.categories?.[key]);
    return out;
  }, {});
  const currentConfidenceRank = confidenceRank(currentReport.confidence);
  const proposedConfidenceRank = confidenceRank(proposedReport.confidence);
  const confidenceDelta = {
    current: currentReport.confidence || null,
    proposed: proposedReport.confidence || null,
    changed: currentReport.confidence !== proposedReport.confidence,
    direction:
      currentConfidenceRank == null || proposedConfidenceRank == null || currentConfidenceRank === proposedConfidenceRank
        ? "same"
        : proposedConfidenceRank > currentConfidenceRank
        ? "up"
        : "down",
  };
  const grouped = getCategoryImpactGroups(categoryDeltas);
  const verdict = getFantasyTransferVerdict(overall.delta || 0, categoryDeltas);
  const explanations = buildTransferExplanations({
    outgoingPlayer: context.outgoingPlayer,
    incomingPlayer: context.incomingPlayer,
    categoryDeltas,
    confidenceDelta,
  });
  return {
    overallDelta: overall.delta,
    overall,
    categoryDeltas,
    confidenceDelta,
    transferPriority: {
      current: currentReport.transferPriority || null,
      proposed: proposedReport.transferPriority || null,
      changed: currentReport.transferPriority !== proposedReport.transferPriority,
    },
    strengthsAdded: explanations.strengthsAdded,
    strengthsRemoved: [],
    concernsAdded: explanations.concernsAdded,
    concernsRemoved: [],
    recommendationSummary: explanations.recommendationSummary,
    verdict,
    sortedCategoryImpacts: grouped.sorted,
    improves: grouped.improves,
    weakens: grouped.weakens,
    unchanged: grouped.unchanged,
    predictionConflicts: {
      current: currentReport.predictionConflicts || [],
      proposed: proposedReport.predictionConflicts || [],
    },
  };
}

export function createFantasyTransferIqComparison({
  currentSquad,
  outgoingPlayerId,
  incomingPlayer,
  captainPlayerId,
  viceCaptainPlayerId,
  normaliseSquad = defaultNormaliseSquad,
  validateSquad = defaultValidateSquad,
  scoreReport,
  scoreContext = {},
  idFactory = makeId,
  timestamp = nowIso(),
} = {}) {
  const built = buildFantasyIqTransferSquad({
    currentSquad,
    outgoingPlayerId,
    incomingPlayer,
    captainPlayerId,
    viceCaptainPlayerId,
    normaliseSquad,
    validateSquad,
    timestamp,
  });
  const base = {
    id: idFactory(),
    createdAt: timestamp,
    outgoingPlayerId: outgoingPlayerId || null,
    incomingPlayerId: incomingPlayer?.id || null,
    outgoingPlayer: built.outgoingPlayer,
    incomingPlayer: incomingPlayer || null,
    currentSquad: built.currentSquad,
    proposedSquad: built.proposedSquad,
    currentReport: null,
    proposedReport: null,
    impact: null,
    validation: built.validation,
    availabilityAcknowledged: false,
    version: FANTASY_TRANSFER_IQ_VERSION,
    status: built.status,
  };
  if (built.status !== "ready" || typeof scoreReport !== "function") return base;
  const currentValidation = validateSquad(built.currentSquad);
  const currentReport = scoreReport({
    squad: built.currentSquad,
    validation: currentValidation,
    ...scoreContext,
  });
  const proposedReport = scoreReport({
    squad: built.proposedSquad,
    validation: built.validation,
    ...scoreContext,
  });
  return {
    ...base,
    currentReport,
    proposedReport,
    impact: compareFantasyIqReports(currentReport, proposedReport, {
      outgoingPlayer: built.outgoingPlayer,
      incomingPlayer,
    }),
    status: "compared",
  };
}

export function createFantasyTransferIqRecommendations({
  currentSquad,
  availablePlayers = [],
  transferCount = "1",
  normaliseSquad = defaultNormaliseSquad,
  validateSquad = defaultValidateSquad,
  scoreReport,
  scoreContext = {},
  maxPlayersPerClub = 3,
  maxResults = 5,
  candidateLimitPerPosition = 12,
  beamWidth = 24,
  timestamp = nowIso(),
} = {}) {
  const current = normaliseSquad(clone(currentSquad));
  const currentValidation = validateSquad(current);
  const currentPlayers = Array.isArray(current.players) ? current.players : [];
  const countLabel = String(transferCount || "1").toUpperCase();
  const requestedCount = countLabel === "ALL"
    ? Math.max(1, Math.min(15, currentPlayers.length))
    : Math.max(1, Math.min(5, Math.round(Number(countLabel) || 1)));
  const currentReport = typeof scoreReport === "function"
    ? scoreReport({ squad: current, validation: currentValidation, ...scoreContext })
    : null;

  if (!currentPlayers.length || !currentValidation?.isValid || typeof scoreReport !== "function") {
    return {
      status: "locked",
      transferCount: countLabel,
      requestedCount,
      currentSquad: current,
      currentReport,
      recommendations: [],
      warnings: ["Confirm a valid Fantasy IQ squad before generating transfer suggestions."],
      version: FANTASY_TRANSFER_IQ_VERSION,
    };
  }

  const ownedIds = new Set(currentPlayers.map((player) => player.id));
  const captainIds = new Set([
    current.captainPlayerId,
    current.viceCaptainPlayerId,
    ...currentPlayers.filter((player) => player.isCaptain || player.isViceCaptain).map((player) => player.id),
  ].filter(Boolean));
  const clubOutlooks = scoreContext.clubOutlooks || {};
  const outgoingCandidates = currentPlayers
    .filter((player) => !captainIds.has(player.id))
    .map((player) => ({
      player,
      score: scoreRecommendationPlayer(player, clubOutlooks[player.teamCode] || {}),
    }))
    .sort((a, b) => a.score - b.score)
    .slice(0, countLabel === "ALL" ? 15 : Math.max(6, requestedCount * 4))
    .map((item) => item.player);
  const incomingByPosition = {};
  ["GK", "DEF", "MID", "FWD"].forEach((position) => {
    incomingByPosition[position] = (availablePlayers || [])
      .filter((player) => player?.id && player.active !== false)
      .filter((player) => String(player.position || "").toUpperCase() === position)
      .filter((player) => !ownedIds.has(player.id))
      .map((player) => ({
        player,
        score: scoreRecommendationPlayer(player, clubOutlooks[player.teamCode] || {}),
      }))
      .sort((a, b) => b.score - a.score)
      .slice(0, candidateLimitPerPosition)
      .map((item) => item.player);
  });

  let beams = [{ transfers: [], squad: current, score: Number(currentReport?.overallScore) || 0 }];
  const finished = [];
  const seen = new Set();

  for (let depth = 0; depth < requestedCount; depth += 1) {
    const nextBeams = [];
    beams.forEach((beam) => {
      const usedOutgoingIds = new Set(beam.transfers.map((transfer) => transfer.outgoingPlayerId));
      const usedIncomingIds = new Set(beam.transfers.map((transfer) => transfer.incomingPlayerId));
      outgoingCandidates
        .filter((outgoingPlayer) => !usedOutgoingIds.has(outgoingPlayer.id))
        .forEach((outgoingPlayer) => {
          const position = String(outgoingPlayer.position || "").toUpperCase();
          (incomingByPosition[position] || [])
            .filter((incomingPlayer) => !usedIncomingIds.has(incomingPlayer.id))
            .forEach((incomingPlayer) => {
              const blocker = getFantasyTransferLegalBlocker({
                currentSquad: beam.squad,
                outgoingPlayerId: outgoingPlayer.id,
                incomingPlayer,
                maxPlayersPerClub,
              });
              if (blocker) return;
              const transfers = [
                ...beam.transfers,
                {
                  outgoingPlayerId: outgoingPlayer.id,
                  incomingPlayerId: incomingPlayer.id,
                  outgoingPlayer,
                  incomingPlayer,
                },
              ];
              const key = transferSetKey(transfers);
              if (seen.has(key)) return;
              seen.add(key);
              const built = applyTransferSet({
                currentSquad: current,
                transfers,
                normaliseSquad,
                validateSquad,
                timestamp,
              });
              if (!built.validation?.isValid) return;
              const proposedReport = scoreReport({
                squad: built.proposedSquad,
                validation: built.validation,
                ...scoreContext,
              });
              const impact = compareFantasyIqReports(currentReport, proposedReport, {
                outgoingPlayer,
                incomingPlayer,
              });
              nextBeams.push({
                transfers,
                squad: built.proposedSquad,
                validation: built.validation,
                proposedReport,
                impact,
                score: Number(proposedReport?.overallScore) || 0,
              });
            });
        });
    });
    nextBeams.sort((a, b) =>
      (Number(b.impact?.overallDelta) || 0) - (Number(a.impact?.overallDelta) || 0) ||
      b.score - a.score
    );
    beams = nextBeams.slice(0, beamWidth);
    finished.push(...beams.filter((beam) => beam.transfers.length === requestedCount));
    if (!beams.length) break;
  }

  const recommendations = (countLabel === "ALL" ? beams : finished)
    .filter((beam) => beam.transfers.length > 0)
    .sort((a, b) =>
      (Number(b.impact?.overallDelta) || 0) - (Number(a.impact?.overallDelta) || 0) ||
      b.score - a.score
    )
    .slice(0, maxResults)
    .map((beam, index) => ({
      id: `transfer-rec-${index + 1}-${transferSetKey(beam.transfers).replace(/[^a-zA-Z0-9]+/g, "-")}`,
      createdAt: timestamp,
      transferCount: countLabel,
      requestedCount,
      actualCount: beam.transfers.length,
      transfers: beam.transfers.map((transfer) => ({
        outgoingPlayerId: transfer.outgoingPlayerId,
        incomingPlayerId: transfer.incomingPlayerId,
        outgoingPlayer: transfer.outgoingPlayer,
        incomingPlayer: transfer.incomingPlayer,
        summary: `${getPlayerName(transfer.outgoingPlayer)} to ${getPlayerName(transfer.incomingPlayer)}`,
      })),
      currentSquad: current,
      proposedSquad: beam.squad,
      currentReport,
      proposedReport: beam.proposedReport,
      validation: beam.validation,
      impact: beam.impact,
      version: FANTASY_TRANSFER_IQ_VERSION,
      status: "recommended",
    }));

  return {
    status: recommendations.length ? "ready" : "empty",
    transferCount: countLabel,
    requestedCount,
    currentSquad: current,
    currentReport,
    recommendations,
    warnings: recommendations.length
      ? []
      : ["No legal transfer suggestions matched the selected transfer count, budget and team limits."],
    version: FANTASY_TRANSFER_IQ_VERSION,
  };
}

export function requiresFantasyTransferAvailabilityAcknowledgement(player) {
  return hasActionableFantasyAvailabilityRisk(player);
}
