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
  addLine(improves, "fixtureOutlook", (delta) => `Fixture Outlook improves by ${delta} points over the next three gameweeks.`);
  addLine(weakens, "fixtureOutlook", (delta) => `Fixture Outlook reduces by ${Math.abs(delta)} points over the next three gameweeks.`);
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

export function requiresFantasyTransferAvailabilityAcknowledgement(player) {
  const status = String(player?.availabilityStatus || "unknown").toLowerCase();
  return !!status && !["available", "unknown"].includes(status);
}
