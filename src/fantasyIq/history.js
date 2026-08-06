/* global globalThis */

export const FANTASY_IQ_HISTORY_VERSION = "fantasy-iq-history-v1";
export const FANTASY_IQ_HISTORY_SCHEMA_VERSION = 1;
export const FANTASY_IQ_HISTORY_STORAGE_PREFIX = "predictionAddiction:fantasyIqHistory:v1";
export const FANTASY_IQ_MODEL_VERSION = "fantasy-iq-v1";
export const FANTASY_IQ_SCORE_CONFIG_VERSION = "fantasy-iq-score-config-v2";
export const FANTASY_IQ_HISTORY_LIMITS = {
  maxSnapshotsPerSeason: 50,
  maxSnapshotsTotal: 100,
};

export const FANTASY_IQ_HISTORY_CATEGORY_KEYS = [
  "fixtureOutlook",
  "attackOutlook",
  "defenceOutlook",
  "captaincyOutlook",
  "squadBalance",
  "predictionAlignment",
  "benchStrength",
];

export const FANTASY_IQ_HISTORY_CATEGORY_LABELS = {
  fixtureOutlook: "Fixture Outlook",
  attackOutlook: "Attack Outlook",
  defenceOutlook: "Defence Outlook",
  captaincyOutlook: "Captaincy Outlook",
  squadBalance: "Squad Balance",
  predictionAlignment: "Prediction Alignment",
  benchStrength: "Bench Strength",
};

export const FANTASY_IQ_HISTORY_VERDICT_THRESHOLDS = {
  majorImprovement: 8,
  goodImprovement: 4,
  smallImprovement: 1,
  smallReduction: -1,
  notableReduction: -4,
  majorReduction: -8,
  opposingMajorCategoryDelta: 8,
};

const BLOCKED_FIELD_RE = /(screenshot|objecturl|object_url|ocr|rawtext|base64|password|token|auth|diagnostic)/i;
const BLOCKED_VALUE_RE = /data:image|base64|ocr text|password|token/i;

function toNumberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeString(value) {
  return String(value ?? "").trim();
}

function safeIso(value, fallback = new Date().toISOString()) {
  const date = Date.parse(value || "");
  return Number.isFinite(date) ? new Date(date).toISOString() : fallback;
}

function clampScore(value) {
  const number = toNumberOrNull(value);
  if (number == null) return null;
  return Math.round(Math.max(0, Math.min(100, number)));
}

function playerKey(player = {}) {
  return safeString(player.canonicalPlayerId || player.id || player.sourceId || `${player.name}-${player.teamCode}-${player.position}`).toLowerCase();
}

function playerLabel(player = {}) {
  return [player.displayName || player.name || "Unknown player", player.teamCode, player.position].filter(Boolean).join(" ");
}

function sanitiseValue(value, depth = 0) {
  if (depth > 8) return null;
  if (typeof value === "string") return BLOCKED_VALUE_RE.test(value) ? null : value;
  if (value == null || typeof value === "number" || typeof value === "boolean") return value;
  if (Array.isArray(value)) return value.map((item) => sanitiseValue(item, depth + 1)).filter((item) => item !== null);
  if (typeof value !== "object") return null;
  return Object.entries(value).reduce((out, [key, item]) => {
    if (BLOCKED_FIELD_RE.test(key)) return out;
    const sanitised = sanitiseValue(item, depth + 1);
    if (sanitised !== null) out[key] = sanitised;
    return out;
  }, {});
}

function normaliseSeason(value) {
  const text = safeString(value);
  return text || "2026/27";
}

function normaliseEvent(raw = {}) {
  const id = toNumberOrNull(raw.id ?? raw.event ?? raw.gameweek);
  const gameweek = toNumberOrNull(raw.gameweek ?? raw.id ?? raw.event);
  if (!gameweek) return null;
  return {
    id: id || gameweek,
    gameweek,
    name: safeString(raw.name) || `GW ${gameweek}`,
    deadline: raw.deadline_time || raw.deadlineTime || raw.deadline || null,
    finished: !!(raw.finished || raw.data_checked || raw.is_finished),
    isCurrent: !!(raw.is_current || raw.isCurrent || raw.current),
    isNext: !!(raw.is_next || raw.isNext || raw.next),
    season: normaliseSeason(raw.season),
  };
}

export function getFantasyIqHistoryStorageKey(userIdentifier) {
  const identifier = safeString(userIdentifier) || "anonymous";
  return `${FANTASY_IQ_HISTORY_STORAGE_PREFIX}:${identifier}`;
}

export function formatFantasyIqSnapshotGameweek(snapshot = {}) {
  if (snapshot.gameweek == null) return snapshot.gameweekLabel || "Unassigned";
  if (Number(snapshot.gameweek) <= 0) return snapshot.gameweekLabel || "Pre-season";
  return snapshot.gameweekLabel || `GW ${snapshot.gameweek}`;
}

export function resolveFantasyIqSnapshotGameweek({
  events = [],
  fixtures = [],
  selectedGameweek = null,
  season = "2026/27",
  currentDate = new Date(),
} = {}) {
  const normalisedEvents = (Array.isArray(events) ? events : []).map(normaliseEvent).filter(Boolean);
  const current = normalisedEvents.find((event) => event.isCurrent);
  if (current) {
    return { gameweek: current.gameweek, label: `GW ${current.gameweek}`, season: current.season || normaliseSeason(season), deadline: current.deadline, source: "event-current" };
  }

  const now = Date.parse(currentDate);
  const upcomingEvents = normalisedEvents
    .filter((event) => !event.finished)
    .map((event) => ({ ...event, deadlineTime: Date.parse(event.deadline || "") }))
    .sort((a, b) => {
      const aAfter = Number.isFinite(a.deadlineTime) && Number.isFinite(now) ? a.deadlineTime >= now : false;
      const bAfter = Number.isFinite(b.deadlineTime) && Number.isFinite(now) ? b.deadlineTime >= now : false;
      if (aAfter !== bAfter) return aAfter ? -1 : 1;
      if (a.isNext !== b.isNext) return a.isNext ? -1 : 1;
      return (a.deadlineTime || Infinity) - (b.deadlineTime || Infinity) || a.gameweek - b.gameweek;
    });
  if (upcomingEvents.length) {
    const event = upcomingEvents[0];
    return { gameweek: event.gameweek, label: `GW ${event.gameweek}`, season: event.season || normaliseSeason(season), deadline: event.deadline, source: event.isNext ? "event-next" : "event-upcoming" };
  }

  const fixtureGameweek = toNumberOrNull(selectedGameweek) ||
    [...new Set((Array.isArray(fixtures) ? fixtures : []).map((fixture) => toNumberOrNull(fixture?.gameweek)).filter(Boolean))].sort((a, b) => a - b)[0];
  if (fixtureGameweek) {
    return { gameweek: fixtureGameweek, label: `GW ${fixtureGameweek}`, season: normaliseSeason(season), deadline: null, source: "fixture-gameweek" };
  }

  return { gameweek: null, label: "Unassigned", season: normaliseSeason(season), deadline: null, source: "unassigned" };
}

function sanitiseSnapshotPlayer(player = {}) {
  return sanitiseValue({
    id: player.id || null,
    canonicalPlayerId: player.canonicalPlayerId || (safeString(player.id).startsWith("fpl:") ? player.id : null),
    sourceId: player.sourceId ?? null,
    name: player.displayName || player.name || "",
    displayName: player.displayName || player.name || "",
    teamCode: player.teamCode || "",
    teamName: player.teamName || "",
    position: player.position || "",
    squadRole: player.squadRole || "bench",
    isCaptain: !!player.isCaptain,
    isViceCaptain: !!player.isViceCaptain,
  });
}

function sanitiseSnapshotSquad(squad = {}) {
  const players = (Array.isArray(squad.players) ? squad.players : []).map(sanitiseSnapshotPlayer).filter((player) => player.id || player.name);
  return {
    formation: squad.formation || null,
    players,
    captainPlayerId: squad.captainPlayerId || players.find((player) => player.isCaptain)?.id || null,
    viceCaptainPlayerId: squad.viceCaptainPlayerId || players.find((player) => player.isViceCaptain)?.id || null,
    source: squad.source || null,
  };
}

function sanitiseSnapshotReport(report = {}) {
  const categories = FANTASY_IQ_HISTORY_CATEGORY_KEYS.reduce((out, key) => {
    out[key] = clampScore(report.categories?.[key]);
    return out;
  }, {});
  return sanitiseValue({
    overallScore: clampScore(report.overallScore),
    confidence: report.confidence || null,
    confidenceScore: clampScore(report.confidenceScore),
    categories,
    transferPriority: report.transferPriority || null,
    strengths: (report.strengths || []).slice(0, 6),
    concerns: (report.concerns || []).slice(0, 6),
    predictionConflicts: (report.predictionConflicts || []).slice(0, 6).map((item) => ({
      playerId: item.playerId || null,
      fixtureId: item.fixtureId || null,
      label: item.label || "",
      detail: item.detail || "",
    })),
  });
}

export function createFantasyIqSnapshot({
  squad = {},
  report = {},
  gameweekContext = {},
  metadata = {},
  existingSnapshot = null,
  timestamp = new Date().toISOString(),
  idFactory = () => `fantasy-iq-snapshot-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
} = {}) {
  const createdAt = existingSnapshot?.createdAt || timestamp;
  const context = gameweekContext || {};
  return sanitiseValue({
    id: existingSnapshot?.id || idFactory(),
    gameweek: context.gameweek == null ? null : Number(context.gameweek),
    gameweekLabel: context.label || (context.gameweek == null ? "Unassigned" : `GW ${context.gameweek}`),
    season: normaliseSeason(context.season),
    createdAt: safeIso(createdAt, timestamp),
    updatedAt: safeIso(timestamp),
    squad: sanitiseSnapshotSquad(squad),
    report: sanitiseSnapshotReport(report),
    metadata: {
      fantasyIqHistoryVersion: FANTASY_IQ_HISTORY_VERSION,
      fantasyIqModelVersion: metadata.fantasyIqModelVersion || FANTASY_IQ_MODEL_VERSION,
      lineupIqModelVersion: metadata.lineupIqModelVersion || null,
      transferIqModelVersion: metadata.transferIqModelVersion || null,
      fixtureModelVersion: metadata.fixtureModelVersion || null,
      scoreConfigVersion: metadata.scoreConfigVersion || FANTASY_IQ_SCORE_CONFIG_VERSION,
      playerDataSource: metadata.playerDataSource || null,
      playerDataUpdatedAt: metadata.playerDataUpdatedAt || null,
      gameweekSource: context.source || null,
    },
  });
}

export function validateFantasyIqSnapshot(snapshot = {}) {
  if (!snapshot || typeof snapshot !== "object") return false;
  if (!safeString(snapshot.id)) return false;
  if (!safeString(snapshot.season)) return false;
  if (!Number.isFinite(Date.parse(snapshot.createdAt || ""))) return false;
  if (!Number.isFinite(Date.parse(snapshot.updatedAt || ""))) return false;
  if (snapshot.gameweek != null && !Number.isFinite(Number(snapshot.gameweek))) return false;
  if (!snapshot.squad || !Array.isArray(snapshot.squad.players)) return false;
  if (!snapshot.report || typeof snapshot.report !== "object") return false;
  if (snapshot.report.overallScore != null && !Number.isFinite(Number(snapshot.report.overallScore))) return false;
  return FANTASY_IQ_HISTORY_CATEGORY_KEYS.every((key) => snapshot.report.categories?.[key] == null || Number.isFinite(Number(snapshot.report.categories[key])));
}

function duplicateKey(snapshot = {}) {
  return `${normaliseSeason(snapshot.season)}::${snapshot.gameweek == null ? "unassigned" : Number(snapshot.gameweek)}`;
}

export function orderFantasyIqSnapshots(snapshots = []) {
  return [...(snapshots || [])].sort((a, b) => {
    const season = normaliseSeason(a.season).localeCompare(normaliseSeason(b.season));
    if (season) return season;
    const aGw = a.gameweek == null ? Number.POSITIVE_INFINITY : Number(a.gameweek);
    const bGw = b.gameweek == null ? Number.POSITIVE_INFINITY : Number(b.gameweek);
    if (aGw !== bGw) return aGw - bGw;
    return Date.parse(a.createdAt || "") - Date.parse(b.createdAt || "");
  });
}

export function normaliseFantasyIqHistory(input = {}) {
  const parsed = input && typeof input === "object" ? input : {};
  const diagnostics = { validSnapshotCount: 0, rejectedSnapshotCount: 0, duplicateSnapshotCount: 0, retentionRemovedCount: 0 };
  const byGameweek = new Map();

  (Array.isArray(parsed.snapshots) ? parsed.snapshots : []).forEach((snapshot) => {
    const candidate = createFantasyIqSnapshot({
      squad: snapshot?.squad || {},
      report: snapshot?.report || {},
      gameweekContext: { gameweek: snapshot?.gameweek ?? null, label: snapshot?.gameweekLabel, season: snapshot?.season },
      metadata: snapshot?.metadata || {},
      existingSnapshot: snapshot,
      timestamp: snapshot?.updatedAt || new Date().toISOString(),
      idFactory: () => snapshot?.id || "",
    });
    if (!validateFantasyIqSnapshot(candidate)) {
      diagnostics.rejectedSnapshotCount += 1;
      return;
    }
    const key = duplicateKey(candidate);
    const previous = byGameweek.get(key);
    if (!previous || Date.parse(candidate.updatedAt) >= Date.parse(previous.updatedAt)) {
      if (previous) diagnostics.duplicateSnapshotCount += 1;
      byGameweek.set(key, candidate);
    } else {
      diagnostics.duplicateSnapshotCount += 1;
    }
  });

  let snapshots = orderFantasyIqSnapshots(Array.from(byGameweek.values()));
  const bySeason = snapshots.reduce((out, snapshot) => {
    const season = normaliseSeason(snapshot.season);
    out[season] = out[season] || [];
    out[season].push(snapshot);
    return out;
  }, {});
  snapshots = Object.values(bySeason).flatMap((seasonSnapshots) => seasonSnapshots.slice(-FANTASY_IQ_HISTORY_LIMITS.maxSnapshotsPerSeason));
  snapshots = orderFantasyIqSnapshots(snapshots).slice(-FANTASY_IQ_HISTORY_LIMITS.maxSnapshotsTotal);
  diagnostics.validSnapshotCount = snapshots.length;
  diagnostics.retentionRemovedCount = Math.max(0, Array.from(byGameweek.values()).length - snapshots.length);

  return {
    schemaVersion: FANTASY_IQ_HISTORY_SCHEMA_VERSION,
    updatedAt: safeIso(parsed.updatedAt, new Date().toISOString()),
    snapshots,
    diagnostics,
  };
}

export function loadFantasyIqHistory(userIdentifier, storage = globalThis.localStorage) {
  try {
    const raw = storage?.getItem?.(getFantasyIqHistoryStorageKey(userIdentifier));
    if (!raw) return normaliseFantasyIqHistory({ snapshots: [] });
    return normaliseFantasyIqHistory(JSON.parse(raw));
  } catch {
    const history = normaliseFantasyIqHistory({ snapshots: [] });
    history.diagnostics.rejectedSnapshotCount += 1;
    return history;
  }
}

export function saveFantasyIqHistory(userIdentifier, history, storage = globalThis.localStorage) {
  const normalised = normaliseFantasyIqHistory({
    ...history,
    updatedAt: new Date().toISOString(),
  });
  const persisted = {
    schemaVersion: FANTASY_IQ_HISTORY_SCHEMA_VERSION,
    updatedAt: normalised.updatedAt,
    snapshots: normalised.snapshots,
  };
  storage?.setItem?.(getFantasyIqHistoryStorageKey(userIdentifier), JSON.stringify(persisted));
  return { ...persisted, diagnostics: normalised.diagnostics };
}

export function findFantasyIqDuplicateSnapshot(history = {}, snapshot = {}) {
  const key = duplicateKey(snapshot);
  return (history.snapshots || []).find((item) => duplicateKey(item) === key) || null;
}

export function upsertFantasyIqSnapshot(history = {}, snapshot = {}, { mode = "insert" } = {}) {
  const base = normaliseFantasyIqHistory(history);
  if (!validateFantasyIqSnapshot(snapshot)) return { history: base, snapshot: null, duplicate: null, status: "invalid" };
  const duplicate = findFantasyIqDuplicateSnapshot(base, snapshot);
  if (duplicate && mode === "keep-existing") return { history: base, snapshot: duplicate, duplicate, status: "kept-existing" };
  if (duplicate && mode !== "update") return { history: base, snapshot: null, duplicate, status: "duplicate" };
  const nextSnapshot = duplicate ? { ...snapshot, id: duplicate.id, createdAt: duplicate.createdAt, updatedAt: snapshot.updatedAt } : snapshot;
  const snapshots = duplicate
    ? base.snapshots.map((item) => (item.id === duplicate.id ? nextSnapshot : item))
    : [...base.snapshots, nextSnapshot];
  const updated = normaliseFantasyIqHistory({ updatedAt: new Date().toISOString(), snapshots });
  return { history: updated, snapshot: nextSnapshot, duplicate, status: duplicate ? "updated" : "inserted" };
}

export function deleteFantasyIqSnapshot(history = {}, snapshotId) {
  const base = normaliseFantasyIqHistory(history);
  return normaliseFantasyIqHistory({
    updatedAt: new Date().toISOString(),
    snapshots: base.snapshots.filter((snapshot) => snapshot.id !== snapshotId),
  });
}

export function clearFantasyIqHistory() {
  return normaliseFantasyIqHistory({ updatedAt: new Date().toISOString(), snapshots: [] });
}

export function getLatestFantasyIqSnapshot(snapshots = []) {
  return orderFantasyIqSnapshots(snapshots).slice(-1)[0] || null;
}

export function getPreviousFantasyIqSnapshot(snapshots = [], currentSnapshot = getLatestFantasyIqSnapshot(snapshots)) {
  if (!currentSnapshot) return null;
  const ordered = orderFantasyIqSnapshots(snapshots).filter((snapshot) => snapshot.id !== currentSnapshot.id);
  return ordered.filter((snapshot) => Date.parse(snapshot.createdAt || "") <= Date.parse(currentSnapshot.createdAt || "") || (snapshot.gameweek ?? -1) <= (currentSnapshot.gameweek ?? Infinity)).slice(-1)[0] || null;
}

function arrayDelta(previous = [], current = [], key = (item) => item) {
  const previousMap = new Map((previous || []).map((item) => [key(item), item]));
  const currentMap = new Map((current || []).map((item) => [key(item), item]));
  return {
    added: Array.from(currentMap.entries()).filter(([id]) => !previousMap.has(id)).map(([, item]) => item),
    removed: Array.from(previousMap.entries()).filter(([id]) => !currentMap.has(id)).map(([, item]) => item),
  };
}

function getRolePlayer(snapshot = {}, playerId, role = "captain") {
  const flag = role === "vice" ? "isViceCaptain" : "isCaptain";
  return (snapshot.squad?.players || []).find((player) => player.id === playerId || player.canonicalPlayerId === playerId || player[flag]) || null;
}

function clubExposure(snapshot = {}) {
  return (snapshot.squad?.players || []).reduce((out, player) => {
    const code = safeString(player.teamCode).toUpperCase();
    if (code) out[code] = (out[code] || 0) + 1;
    return out;
  }, {});
}

function scoreDelta(previous, current) {
  if (previous == null || current == null) return { previous: previous ?? null, current: current ?? null, delta: null, label: previous == null && current != null ? "Newly available" : previous != null && current == null ? "Unavailable" : "Unavailable" };
  const delta = Number(current) - Number(previous);
  return { previous, current, delta, label: delta > 0 ? `+${delta}` : String(delta) };
}

export function getFantasyIqHistoryVerdict(overallDelta, categoryDeltas = {}) {
  const majorPositive = Object.values(categoryDeltas).some((row) => Number(row.delta) >= FANTASY_IQ_HISTORY_VERDICT_THRESHOLDS.opposingMajorCategoryDelta);
  const majorNegative = Object.values(categoryDeltas).some((row) => Number(row.delta) <= -FANTASY_IQ_HISTORY_VERDICT_THRESHOLDS.opposingMajorCategoryDelta);
  if (majorPositive && majorNegative) return "Mixed change";
  if (overallDelta == null) return "Comparison unavailable";
  if (overallDelta >= FANTASY_IQ_HISTORY_VERDICT_THRESHOLDS.majorImprovement) return "Major improvement";
  if (overallDelta >= FANTASY_IQ_HISTORY_VERDICT_THRESHOLDS.goodImprovement) return "Good improvement";
  if (overallDelta >= FANTASY_IQ_HISTORY_VERDICT_THRESHOLDS.smallImprovement) return "Small improvement";
  if (overallDelta === 0) return "No meaningful change";
  if (overallDelta >= FANTASY_IQ_HISTORY_VERDICT_THRESHOLDS.notableReduction + 1) return "Small reduction";
  if (overallDelta >= FANTASY_IQ_HISTORY_VERDICT_THRESHOLDS.majorReduction + 1) return "Notable reduction";
  return "Major reduction";
}

export function compareFantasyIqSnapshots(previousSnapshot, currentSnapshot) {
  if (!previousSnapshot || !currentSnapshot) return null;
  const categoryDeltas = FANTASY_IQ_HISTORY_CATEGORY_KEYS.reduce((out, key) => {
    out[key] = scoreDelta(previousSnapshot.report?.categories?.[key], currentSnapshot.report?.categories?.[key]);
    return out;
  }, {});
  const previousStarters = (previousSnapshot.squad?.players || []).filter((player) => player.squadRole === "starter");
  const currentStarters = (currentSnapshot.squad?.players || []).filter((player) => player.squadRole === "starter");
  const previousBench = (previousSnapshot.squad?.players || []).filter((player) => player.squadRole === "bench");
  const currentBench = (currentSnapshot.squad?.players || []).filter((player) => player.squadRole === "bench");
  const squadChange = arrayDelta(previousSnapshot.squad?.players, currentSnapshot.squad?.players, playerKey);
  const starterChange = arrayDelta(previousStarters, currentStarters, playerKey);
  const benchChange = arrayDelta(previousBench, currentBench, playerKey);
  const previousCaptain = getRolePlayer(previousSnapshot, previousSnapshot.squad?.captainPlayerId, "captain");
  const currentCaptain = getRolePlayer(currentSnapshot, currentSnapshot.squad?.captainPlayerId, "captain");
  const previousVice = getRolePlayer(previousSnapshot, previousSnapshot.squad?.viceCaptainPlayerId, "vice");
  const currentVice = getRolePlayer(currentSnapshot, currentSnapshot.squad?.viceCaptainPlayerId, "vice");
  const previousExposure = clubExposure(previousSnapshot);
  const currentExposure = clubExposure(currentSnapshot);
  const clubExposureChanges = Array.from(new Set([...Object.keys(previousExposure), ...Object.keys(currentExposure)])).sort().map((teamCode) => ({
    teamCode,
    previous: previousExposure[teamCode] || 0,
    current: currentExposure[teamCode] || 0,
    delta: (currentExposure[teamCode] || 0) - (previousExposure[teamCode] || 0),
  })).filter((row) => row.delta !== 0);
  const overall = scoreDelta(previousSnapshot.report?.overallScore, currentSnapshot.report?.overallScore);
  const explanations = [];
  FANTASY_IQ_HISTORY_CATEGORY_KEYS.forEach((key) => {
    const row = categoryDeltas[key];
    if (!row || row.delta == null || row.delta === 0) return;
    explanations.push(`${FANTASY_IQ_HISTORY_CATEGORY_LABELS[key]} ${row.delta > 0 ? "improved" : "declined"} by ${Math.abs(row.delta)} points.`);
  });
  if ((previousSnapshot.squad?.formation || null) !== (currentSnapshot.squad?.formation || null)) {
    explanations.push(`Your formation changed from ${previousSnapshot.squad?.formation || "unset"} to ${currentSnapshot.squad?.formation || "unset"}.`);
  }
  if (previousCaptain && currentCaptain && playerKey(previousCaptain) !== playerKey(currentCaptain)) {
    explanations.push(`Captain changed from ${playerLabel(previousCaptain)} to ${playerLabel(currentCaptain)}.`);
  }
  const starterChangeCount = starterChange.added.length + starterChange.removed.length;
  if (starterChangeCount) explanations.push(`${starterChangeCount} starter change${starterChangeCount === 1 ? "" : "s"} since the previous snapshot.`);

  return {
    previousSnapshotId: previousSnapshot.id,
    currentSnapshotId: currentSnapshot.id,
    overallDelta: overall.delta,
    overall,
    categoryDeltas,
    confidenceChange: {
      previous: previousSnapshot.report?.confidence || null,
      current: currentSnapshot.report?.confidence || null,
      changed: (previousSnapshot.report?.confidence || null) !== (currentSnapshot.report?.confidence || null),
    },
    formationChange: { previous: previousSnapshot.squad?.formation || null, current: currentSnapshot.squad?.formation || null, changed: (previousSnapshot.squad?.formation || null) !== (currentSnapshot.squad?.formation || null) },
    captainChange: { previous: previousCaptain, current: currentCaptain, changed: playerKey(previousCaptain) !== playerKey(currentCaptain) },
    viceCaptainChange: { previous: previousVice, current: currentVice, changed: playerKey(previousVice) !== playerKey(currentVice) },
    squadAdded: squadChange.added,
    squadRemoved: squadChange.removed,
    startersAdded: starterChange.added,
    startersRemoved: starterChange.removed,
    benchAdded: benchChange.added,
    benchRemoved: benchChange.removed,
    clubExposureChanges,
    strengthsAdded: arrayDelta(previousSnapshot.report?.strengths, currentSnapshot.report?.strengths).added,
    concernsAdded: arrayDelta(previousSnapshot.report?.concerns, currentSnapshot.report?.concerns).added,
    concernsResolved: arrayDelta(previousSnapshot.report?.concerns, currentSnapshot.report?.concerns).removed,
    verdict: getFantasyIqHistoryVerdict(overall.delta, categoryDeltas),
    explanations,
    modelVersionChanged: previousSnapshot.metadata?.fantasyIqModelVersion !== currentSnapshot.metadata?.fantasyIqModelVersion,
  };
}

export function buildFantasyIqTrendData(snapshots = []) {
  return orderFantasyIqSnapshots(snapshots).map((snapshot) => ({
    id: snapshot.id,
    gameweek: snapshot.gameweek,
    label: formatFantasyIqSnapshotGameweek(snapshot),
    season: snapshot.season,
    timestamp: snapshot.createdAt,
    overallScore: snapshot.report?.overallScore ?? null,
    ...FANTASY_IQ_HISTORY_CATEGORY_KEYS.reduce((out, key) => {
      out[key] = snapshot.report?.categories?.[key] ?? null;
      return out;
    }, {}),
  }));
}

export function buildFantasyIqTrendSummary(snapshots = []) {
  const trend = buildFantasyIqTrendData(snapshots).filter((row) => row.overallScore != null);
  if (!trend.length) return { snapshotCount: 0 };
  const scores = trend.map((row) => Number(row.overallScore));
  const latest = trend[trend.length - 1];
  const categories = FANTASY_IQ_HISTORY_CATEGORY_KEYS
    .map((key) => ({ key, label: FANTASY_IQ_HISTORY_CATEGORY_LABELS[key], value: latest[key] }))
    .filter((row) => row.value != null)
    .sort((a, b) => b.value - a.value);
  return {
    snapshotCount: trend.length,
    currentScore: latest.overallScore,
    highestScore: Math.max(...scores),
    lowestScore: Math.min(...scores),
    averageScore: Math.round(scores.reduce((sum, score) => sum + score, 0) / scores.length),
    changeFromFirst: latest.overallScore - trend[0].overallScore,
    strongestCategory: categories[0] || null,
    weakestCategory: categories.slice(-1)[0] || null,
  };
}

export function exportFantasyIqHistory(history = {}) {
  const normalised = normaliseFantasyIqHistory(history);
  return JSON.stringify({
    schemaVersion: FANTASY_IQ_HISTORY_SCHEMA_VERSION,
    exportedAt: new Date().toISOString(),
    historyVersion: FANTASY_IQ_HISTORY_VERSION,
    snapshots: normalised.snapshots,
  }, null, 2);
}
