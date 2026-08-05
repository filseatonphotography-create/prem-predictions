import {
  FANTASY_PLAYER_MATCH_CONFIG,
  buildFantasyPlayerSearchIndex,
  matchFantasyPlayerCandidate,
  normaliseFantasyPlayerName,
  normalisePremierLeagueTeamCode,
  tokeniseFantasyPlayerName,
} from "./playerMatching";

export {
  FANTASY_PLAYER_MATCH_CONFIG,
  buildFantasyPlayerSearchIndex,
  matchFantasyPlayerCandidate,
  normaliseFantasyPlayerName,
  normalisePremierLeagueTeamCode,
  tokeniseFantasyPlayerName,
};

/* global globalThis */

export const FANTASY_PLAYER_DATA_SCHEMA_VERSION = 1;
export const FANTASY_PLAYER_DATA_CACHE_KEY = "predictionAddiction:fplPlayerData:v1";
export const FANTASY_PLAYER_DATA_SOURCE = "official-fpl-bootstrap";
export const FANTASY_PLAYER_DATA_ENDPOINT = "/.netlify/functions/fpl-bootstrap";
export const FANTASY_PLAYER_DATA_DIRECT_ENDPOINT = "https://fantasy.premierleague.com/api/bootstrap-static/";
export const FANTASY_PLAYER_DATA_CACHE_TTL_MS = 12 * 60 * 60 * 1000;
export const FANTASY_PLAYER_DATA_FETCH_TIMEOUT_MS = 12000;
export const FANTASY_IQ_TEMP_PLAYER_DATA_NOTICE =
  "Temporary development player list in use. It is incomplete and not official FPL data.";
export const FANTASY_PLAYER_SCREENSHOT_IMPORT_PRIVACY_NOTE =
  "Screenshot import should resolve players locally where practical, avoid persistent screenshot storage, and require user confirmation before squad replacement.";

const POSITION_ID_TO_CODE = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

function nowIso(now = Date.now()) {
  return new Date(now).toISOString();
}

function toNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function safeString(value) {
  return String(value || "").trim();
}

function getAvailabilityStatus(record = {}) {
  const status = safeString(record.status).toLowerCase();
  if (status === "a") return "available";
  if (status === "d") return "doubtful";
  if (["i", "s", "u", "n"].includes(status)) return "unavailable";
  return "unknown";
}

function makeDiagnostics() {
  return {
    validPlayerCount: 0,
    rejectedPlayerCount: 0,
    unknownTeamCount: 0,
    unknownPositionCount: 0,
    duplicateIdCount: 0,
    warnings: [],
  };
}

export function buildFallbackFantasyPlayerDataset(teams = []) {
  const teamList = (teams || []).filter(Boolean);
  const canonicalTeams = teamList.map((team, index) => {
    const teamCode = normalisePremierLeagueTeamCode(team.code || team.shortName || team.name) || safeString(team.code || team.shortName || team.name).slice(0, 3).toUpperCase();
    return {
      id: teamCode,
      sourceId: team.sourceId || team.id || index + 1,
      name: safeString(team.name || team.teamName || teamCode),
      shortName: safeString(team.shortName || teamCode),
      code: teamCode,
      normalisedCode: teamCode,
      aliases: [teamCode, safeString(team.name || ""), safeString(team.shortName || "")].filter(Boolean),
    };
  });
  const positions = [
    { id: 1, sourceId: 1, singularName: "Goalkeeper", pluralName: "Goalkeepers", code: "GK" },
    { id: 2, sourceId: 2, singularName: "Defender", pluralName: "Defenders", code: "DEF" },
    { id: 3, sourceId: 3, singularName: "Midfielder", pluralName: "Midfielders", code: "MID" },
    { id: 4, sourceId: 4, singularName: "Forward", pluralName: "Forwards", code: "FWD" },
  ];
  const fetchedAt = nowIso();
  const players = canonicalTeams.flatMap((team) =>
    positions.map((position) => {
      const baseName = team.name.replace(/\s*(FC|AFC)$/i, "").trim();
      const displayName = `${baseName} ${position.code}`;
      return {
        id: `tmp-${team.code.toLowerCase()}-${position.code.toLowerCase()}`,
        sourceId: null,
        firstName: baseName,
        lastName: position.code,
        displayName,
        name: displayName,
        webName: position.code,
        normalisedName: normaliseFantasyPlayerName(displayName),
        teamId: team.id,
        teamCode: team.code,
        teamName: team.name,
        position: position.code,
        positionId: position.id,
        active: true,
        availabilityStatus: "unknown",
        externalMetadata: { temporary: true },
        dataSource: "temporary-development-fallback",
        dataUpdatedAt: fetchedAt,
        temporary: true,
      };
    })
  );
  return {
    schemaVersion: FANTASY_PLAYER_DATA_SCHEMA_VERSION,
    source: "temporary-development-fallback",
    fetchedAt,
    expiresAt: new Date(Date.now() + FANTASY_PLAYER_DATA_CACHE_TTL_MS).toISOString(),
    players,
    teams: canonicalTeams,
    positions,
    diagnostics: {
      ...makeDiagnostics(),
      validPlayerCount: players.length,
      warnings: [FANTASY_IQ_TEMP_PLAYER_DATA_NOTICE],
    },
    cacheStatus: "fallback",
  };
}

function buildTeamMappings(rawTeams = []) {
  const diagnostics = makeDiagnostics();
  const byId = {};
  const teams = [];
  const seenCodes = new Set();

  (rawTeams || []).forEach((team) => {
    const sourceId = toNumber(team?.id);
    const name = safeString(team?.name);
    const shortName = safeString(team?.short_name || team?.shortName);
    const code = normalisePremierLeagueTeamCode(team?.short_name) || normalisePremierLeagueTeamCode(team?.name);
    if (!sourceId || !name || !code) {
      diagnostics.unknownTeamCount += 1;
      return;
    }
    if (seenCodes.has(code)) {
      diagnostics.warnings.push(`Duplicate team code ${code} ignored.`);
      return;
    }
    const canonicalTeam = {
      id: `fpl-team:${sourceId}`,
      sourceId,
      name,
      shortName,
      code,
      normalisedCode: code,
      aliases: [code, shortName, name].filter(Boolean),
    };
    seenCodes.add(code);
    byId[sourceId] = canonicalTeam;
    teams.push(canonicalTeam);
  });

  return { byId, teams, diagnostics };
}

function buildPositionMappings(rawPositions = []) {
  const byId = {};
  const positions = [];
  (rawPositions || []).forEach((position) => {
    const sourceId = toNumber(position?.id);
    const code = POSITION_ID_TO_CODE[sourceId] || String(position?.singular_name_short || "").toUpperCase();
    if (!sourceId || !["GK", "DEF", "MID", "FWD"].includes(code)) return;
    const canonicalPosition = {
      id: sourceId,
      sourceId,
      singularName: safeString(position?.singular_name),
      pluralName: safeString(position?.plural_name),
      code,
    };
    byId[sourceId] = canonicalPosition;
    positions.push(canonicalPosition);
  });
  return { byId, positions };
}

function adaptFantasyBootstrapEvents(rawEvents = []) {
  return (Array.isArray(rawEvents) ? rawEvents : [])
    .map((event) => {
      const id = toNumber(event?.id);
      if (!id) return null;
      return {
        id,
        gameweek: id,
        name: safeString(event?.name) || `GW ${id}`,
        deadline: event?.deadline_time || null,
        finished: !!event?.finished,
        isCurrent: !!event?.is_current,
        isNext: !!event?.is_next,
        dataChecked: !!event?.data_checked,
      };
    })
    .filter(Boolean);
}

export function adaptFantasyBootstrapPayload(payload = {}, options = {}) {
  const fetchedAt = options.fetchedAt || nowIso();
  const diagnostics = makeDiagnostics();
  if (!Array.isArray(payload?.elements) || !Array.isArray(payload?.teams) || !Array.isArray(payload?.element_types)) {
    return {
      valid: false,
      dataset: null,
      diagnostics: {
        ...diagnostics,
        warnings: ["Bootstrap payload did not contain players, teams and positions arrays."],
      },
    };
  }

  const teamMappings = buildTeamMappings(payload.teams);
  const positionMappings = buildPositionMappings(payload.element_types);
  diagnostics.unknownTeamCount += teamMappings.diagnostics.unknownTeamCount;
  diagnostics.warnings.push(...teamMappings.diagnostics.warnings);
  const seenIds = new Set();
  const players = [];

  payload.elements.forEach((record) => {
    const sourceId = toNumber(record?.id);
    const team = teamMappings.byId[toNumber(record?.team)];
    const position = positionMappings.byId[toNumber(record?.element_type)];
    const firstName = safeString(record?.first_name);
    const lastName = safeString(record?.second_name);
    const webName = safeString(record?.web_name);
    const displayName = safeString(`${firstName} ${lastName}`) || webName;

    if (!sourceId || !displayName || !webName) {
      diagnostics.rejectedPlayerCount += 1;
      return;
    }
    const id = `fpl:${sourceId}`;
    if (seenIds.has(id)) {
      diagnostics.duplicateIdCount += 1;
      diagnostics.rejectedPlayerCount += 1;
      return;
    }
    if (!team) {
      diagnostics.unknownTeamCount += 1;
      diagnostics.rejectedPlayerCount += 1;
      return;
    }
    if (!position) {
      diagnostics.unknownPositionCount += 1;
      diagnostics.rejectedPlayerCount += 1;
      return;
    }

    seenIds.add(id);
    players.push({
      id,
      sourceId,
      firstName,
      lastName,
      displayName,
      name: displayName,
      webName,
      normalisedName: normaliseFantasyPlayerName(displayName),
      teamId: team.id,
      teamCode: team.code,
      teamName: team.name,
      position: position.code,
      positionId: position.id,
      active: !record.removed,
      availabilityStatus: getAvailabilityStatus(record),
      externalMetadata: {
        news: safeString(record.news),
        newsAdded: record.news_added || null,
        chanceOfPlayingNextRound: record.chance_of_playing_next_round ?? null,
        chanceOfPlayingThisRound: record.chance_of_playing_this_round ?? null,
      },
      dataSource: FANTASY_PLAYER_DATA_SOURCE,
      dataUpdatedAt: fetchedAt,
    });
  });

  diagnostics.validPlayerCount = players.length;
  const valid = players.length > 0 && teamMappings.teams.length > 0 && positionMappings.positions.length >= 4;
  return {
    valid,
    dataset: valid
      ? {
          schemaVersion: FANTASY_PLAYER_DATA_SCHEMA_VERSION,
          source: FANTASY_PLAYER_DATA_SOURCE,
          fetchedAt,
          expiresAt: new Date(Date.parse(fetchedAt) + FANTASY_PLAYER_DATA_CACHE_TTL_MS).toISOString(),
          players,
          teams: teamMappings.teams,
          positions: positionMappings.positions,
          events: adaptFantasyBootstrapEvents(payload.events),
          diagnostics,
          cacheStatus: "live",
        }
      : null,
    diagnostics,
  };
}

export function validateFantasyPlayerDataset(dataset = {}) {
  if (!dataset || typeof dataset !== "object") return false;
  if (Number(dataset.schemaVersion) !== FANTASY_PLAYER_DATA_SCHEMA_VERSION) return false;
  if (!Array.isArray(dataset.players) || !Array.isArray(dataset.teams) || !Array.isArray(dataset.positions)) return false;
  if (!dataset.players.length || !dataset.teams.length) return false;
  const ids = new Set();
  return dataset.players.every((player) => {
    if (!player?.id || ids.has(player.id)) return false;
    ids.add(player.id);
    return !!player.displayName && !!player.normalisedName && !!player.teamCode && !!player.teamName && ["GK", "DEF", "MID", "FWD"].includes(player.position);
  });
}

export function readFantasyPlayerDataCache(storage = globalThis.localStorage, now = Date.now()) {
  try {
    const raw = storage?.getItem?.(FANTASY_PLAYER_DATA_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!validateFantasyPlayerDataset(parsed)) return null;
    return {
      ...parsed,
      cacheStatus: Date.parse(parsed.expiresAt || "") > now ? "fresh-cache" : "stale-cache",
    };
  } catch {
    return null;
  }
}

export function writeFantasyPlayerDataCache(dataset, storage = globalThis.localStorage) {
  if (!validateFantasyPlayerDataset(dataset)) return false;
  try {
    storage?.setItem?.(FANTASY_PLAYER_DATA_CACHE_KEY, JSON.stringify(dataset));
    return true;
  } catch {
    return false;
  }
}

async function fetchJsonWithTimeout(url, { fetchImpl = globalThis.fetch, timeoutMs = FANTASY_PLAYER_DATA_FETCH_TIMEOUT_MS, signal } = {}) {
  if (typeof fetchImpl !== "function") throw new Error("Fetch unavailable");
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  if (signal) {
    if (signal.aborted) controller.abort();
    signal.addEventListener("abort", () => controller.abort(), { once: true });
  }
  try {
    const response = await fetchImpl(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });
    if (!response?.ok) throw new Error(`Player data request failed with status ${response?.status || "unknown"}`);
    const text = await response.text();
    if (text.length > 3_000_000) throw new Error("Player data response exceeded size limit");
    return JSON.parse(text);
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function loadFantasyPlayerData({
  storage = globalThis.localStorage,
  fetchImpl = globalThis.fetch,
  endpoint = FANTASY_PLAYER_DATA_ENDPOINT,
  directEndpoint = FANTASY_PLAYER_DATA_DIRECT_ENDPOINT,
  fallbackDataset,
  now = Date.now(),
  forceRefresh = false,
  signal,
} = {}) {
  const cached = readFantasyPlayerDataCache(storage, now);
  if (cached && cached.cacheStatus === "fresh-cache" && !forceRefresh) {
    return {
      ...cached,
      status: "ready",
      fallbackReason: null,
      error: null,
    };
  }

  const urls = endpoint === directEndpoint ? [endpoint] : [endpoint, directEndpoint].filter(Boolean);
  let lastError = null;
  for (const url of urls) {
    try {
      const payload = await fetchJsonWithTimeout(url, { fetchImpl, signal });
      const adapted = adaptFantasyBootstrapPayload(payload, { fetchedAt: nowIso(now) });
      if (!adapted.valid) throw new Error(adapted.diagnostics.warnings[0] || "Invalid player data response");
      writeFantasyPlayerDataCache(adapted.dataset, storage);
      return {
        ...adapted.dataset,
        status: "ready",
        cacheStatus: "live",
        fallbackReason: "Official player data was successfully updated.",
        error: null,
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (cached) {
    return {
      ...cached,
      status: "fallback",
      fallbackReason: cached.cacheStatus === "stale-cache" ? "Using cached player data." : "Live player list could not be refreshed.",
      error: lastError?.message || "Player data refresh failed.",
    };
  }

  const fallback = fallbackDataset || buildFallbackFantasyPlayerDataset();
  return {
    ...fallback,
    status: "fallback",
    cacheStatus: "fallback",
    fallbackReason: "Live player list could not be refreshed.",
    error: lastError?.message || "Player data refresh failed.",
  };
}

export function reconcileFantasyIqSquadWithPlayerData(squad = {}, playerDataset = {}) {
  const players = Array.isArray(squad.players) ? squad.players : [];
  const canonicalPlayers = Array.isArray(playerDataset.players) ? playerDataset.players : [];
  let needsReview = false;
  const reconciledPlayers = players.map((player) => {
    const sourceMatch = player.sourceId
      ? canonicalPlayers.find((candidate) => String(candidate.sourceId) === String(player.sourceId))
      : canonicalPlayers.find((candidate) => candidate.id === player.canonicalPlayerId || candidate.id === player.id);
    if (sourceMatch) {
      const teamChanged = player.teamCode && normalisePremierLeagueTeamCode(player.teamCode) !== sourceMatch.teamCode;
      return {
        ...player,
        id: sourceMatch.id,
        sourceId: sourceMatch.sourceId,
        name: sourceMatch.displayName,
        displayName: sourceMatch.displayName,
        webName: sourceMatch.webName,
        normalisedName: sourceMatch.normalisedName,
        teamCode: sourceMatch.teamCode,
        teamName: sourceMatch.teamName,
        position: sourceMatch.position,
        availabilityStatus: sourceMatch.availabilityStatus,
        externalMetadata: sourceMatch.externalMetadata,
        dataSource: sourceMatch.dataSource,
        dataUpdatedAt: sourceMatch.dataUpdatedAt,
        canonicalPlayerId: sourceMatch.id,
        reconciliationStatus: "matched",
        reconciliationConfidence: 1,
        migrationNote: teamChanged ? "Player club changed in refreshed player data." : player.migrationNote || null,
      };
    }

    const match = matchFantasyPlayerCandidate({
      rawName: player.displayName || player.name,
      rawTeamCode: player.teamCode,
      rawPosition: player.position,
      players: canonicalPlayers,
    });
    if (match.status === "exact" || (match.status === "high-confidence" && match.confidence >= FANTASY_PLAYER_MATCH_CONFIG.autoConfirmThreshold)) {
      return {
        ...player,
        id: match.player.id,
        sourceId: match.player.sourceId,
        name: match.player.displayName,
        displayName: match.player.displayName,
        webName: match.player.webName,
        normalisedName: match.player.normalisedName,
        teamCode: match.player.teamCode,
        teamName: match.player.teamName,
        position: match.player.position,
        availabilityStatus: match.player.availabilityStatus,
        externalMetadata: match.player.externalMetadata,
        dataSource: match.player.dataSource,
        dataUpdatedAt: match.player.dataUpdatedAt,
        canonicalPlayerId: match.player.id,
        reconciliationStatus: "matched",
        reconciliationConfidence: match.confidence,
        migrationNote: null,
      };
    }

    needsReview = true;
    return {
      ...player,
      canonicalPlayerId: null,
      reconciliationStatus: match.status === "ambiguous" ? "ambiguous" : player.temporary ? "legacy" : "unmatched",
      reconciliationConfidence: match.confidence,
      reconciliationCandidates: match.candidates.map((candidate) => candidate.id),
    };
  });

  return {
    ...squad,
    confirmed: squad.confirmed && !needsReview,
    players: reconciledPlayers,
    needsPlayerDataReview: needsReview,
  };
}

export function createPreparedFantasyScreenshotImport(extractedSlots = []) {
  const slots = (extractedSlots || []).map((slot, index) => ({
    extracted: {
      rawName: safeString(slot.rawName),
      rawTeamCode: safeString(slot.rawTeamCode),
      rawPosition: safeString(slot.rawPosition),
      rawSquadRole: safeString(slot.rawSquadRole),
      rawCaptainMarker: safeString(slot.rawCaptainMarker),
      rawViceCaptainMarker: safeString(slot.rawViceCaptainMarker),
      sourceRegion: slot.sourceRegion || null,
      extractionConfidence: Number.isFinite(Number(slot.extractionConfidence)) ? Number(slot.extractionConfidence) : null,
    },
    matchResult: slot.matchResult || null,
    selectedPlayerId: slot.selectedPlayerId || null,
    confirmedByUser: !!slot.confirmedByUser,
    issues: Array.isArray(slot.issues) ? slot.issues : [],
  }));
  const unresolvedCount = slots.filter((slot) => !slot.selectedPlayerId && slot.matchResult?.status !== "ambiguous").length;
  const ambiguousCount = slots.filter((slot) => slot.matchResult?.status === "ambiguous").length;
  const confirmedCount = slots.filter((slot) => slot.confirmedByUser).length;
  return {
    id: `fantasy-screenshot-import:${Date.now()}`,
    source: "screenshot",
    createdAt: nowIso(),
    imageMetadata: null,
    extractedSlots: slots,
    unresolvedCount,
    ambiguousCount,
    confirmedCount,
    status: unresolvedCount || ambiguousCount ? "needs-review" : slots.length ? "ready" : "pending",
  };
}
