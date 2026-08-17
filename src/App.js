import React, { useState, useMemo, useEffect, useRef } from "react";
import "./App.css";
import FIXTURES from "./fixtures";
import WORLD_CUP_FIXTURES from "./worldCupFixtures";
import {
  FANTASY_PLAYER_DATA_CACHE_KEY,
  FANTASY_PLAYER_DATA_SCHEMA_VERSION,
  FANTASY_IQ_TEMP_PLAYER_DATA_NOTICE,
  buildFallbackFantasyPlayerDataset,
  loadFantasyPlayerData,
  normaliseFantasyPlayerName,
  normalisePremierLeagueTeamCode,
  reconcileFantasyIqSquadWithPlayerData,
} from "./fantasyIq/playerData";
import {
  FANTASY_SCREENSHOT_IMPORT_CONFIG,
  addFantasyScreenshotReviewPlayer,
  buildFantasyScreenshotReviewDisplaySlots,
  createFantasyScreenshotFeedbackSummary,
  createFantasyScreenshotImportSummary,
  convertFantasyScreenshotReviewToSquad,
  decodeFantasyScreenshotImage,
  getFantasyScreenshotFormationReviewLayout,
  inferFantasyScreenshotFormationFromReviewSlots,
  isFantasyScreenshotFormationLabel,
  removeFantasyScreenshotReviewSlot,
  runFantasyScreenshotOcrWithFallback,
  updateFantasyScreenshotReviewSlot,
  validateFantasyScreenshotDimensions,
  validateFantasyScreenshotFile,
} from "./fantasyIq/screenshotImport";
import {
  FANTASY_TRANSFER_IQ_CATEGORY_LABELS,
  FANTASY_TRANSFER_RECOMMENDATION_COUNTS,
  FANTASY_TRANSFER_IQ_VERSION,
  buildFantasyIqTransferSquad,
  createFantasyTransferIqComparison,
  createFantasyTransferIqRecommendations,
  getFantasyTransferLegalBlocker,
  requiresFantasyTransferAvailabilityAcknowledgement,
} from "./fantasyIq/transferIq";
import {
  FANTASY_LINEUP_IQ_VERSION,
  buildFantasyLineupSquadFromStarterIds,
  createFantasyLineupIqAnalysis,
} from "./fantasyIq/lineupIq";
import {
  FANTASY_SUGGESTED_TEAM_VERSION,
  createFantasySuggestedTeam,
} from "./fantasyIq/suggestedTeam";
import {
  getFantasyAvailabilityChance,
  getFantasyAvailabilityLabel,
  hasActionableFantasyAvailabilityRisk,
} from "./fantasyIq/availability";
import {
  FANTASY_IQ_HISTORY_CATEGORY_KEYS,
  FANTASY_IQ_HISTORY_CATEGORY_LABELS,
  FANTASY_IQ_HISTORY_SCHEMA_VERSION,
  FANTASY_IQ_HISTORY_VERSION,
  FANTASY_IQ_MODEL_VERSION,
  FANTASY_IQ_SCORE_CONFIG_VERSION,
  buildFantasyIqTrendData,
  buildFantasyIqTrendSummary,
  clearFantasyIqHistory,
  compareFantasyIqSnapshots,
  createFantasyIqSnapshot,
  deleteFantasyIqSnapshot,
  exportFantasyIqHistory,
  findFantasyIqDuplicateSnapshot,
  formatFantasyIqSnapshotGameweek,
  getFantasyIqHistoryStorageKey,
  getLatestFantasyIqSnapshot,
  getPreviousFantasyIqSnapshot,
  loadFantasyIqHistory,
  normaliseFantasyIqHistory,
  orderFantasyIqSnapshots,
  resolveFantasyIqSnapshotGameweek,
  saveFantasyIqHistory,
  upsertFantasyIqSnapshot,
} from "./fantasyIq/history";
const {
  getMatchScoreForPrediction,
  hasStartedMatchStatus,
  hasNumericScoreValue,
} = require("./matchScoreUtils");

// ---- CONFIG ----
// Fetch all users' avatars from backend
async function apiGetAllAvatars(token) {
  try {
    const res = await fetch(
      `${BACKEND_BASE}/api/avatar/all`,
      {
        headers: { Authorization: `Bearer ${token}` },
      }
    );
    if (!res.ok) throw new Error("Avatar fetch failed");
    return await res.json(); // { userId: { seed, style }, ... }
  } catch {
    return {};
  }
}

async function apiGetAllFavoriteTeams(token) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/account/favorite-team/all`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Favourite teams fetch failed");
    const data = await res.json().catch(() => ({}));
    return {
      favoriteTeams: data.favoriteTeams || {},
      favoriteCountries: data.favoriteCountries || {},
    };
  } catch {
    return { favoriteTeams: {}, favoriteCountries: {} };
  }
}

// Set current user's avatar
async function apiSetAvatar(token, payload) {
  const res = await fetch(
    `${BACKEND_BASE}/api/avatar/me`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Avatar save failed");
  return data;
}

// Dummy for legacy code: always returns empty (since reverted)
async function apiGetUserCoins() { return {}; }
const DEV_USE_LOCAL = false; // always use cloud backend
const BACKEND_BASE =
  process.env.REACT_APP_BACKEND_BASE ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5001"
    : "https://prem-predictions-1.onrender.com");
const STORAGE_KEY = "pl_prediction_game_v2";
const AUTH_STORAGE_KEY = "pl_prediction_auth_v1";
const FANTASY_SCREENSHOT_FEEDBACK_STORAGE_KEY = "predictionAddiction:fantasyIqScreenshotFeedback:v1";
const WELCOME_PENDING_STORAGE_KEY = "prediction_welcome_pending_user_v1";
const WELCOME_SEEN_STORAGE_KEY = "prediction_welcome_seen_users_v1";
const WELCOME_VIDEO_SRC = "/welcome-video.mp4";
const PREMIER_SEASON_RESET_STORAGE_KEY = "premier_season_reset_2026_27_v3";
const MIGRATION_FLAG = "phil_legacy_migrated_v1";
const GAME_MODE_STORAGE_KEY = "prediction_game_mode_v1";
const GAMEWEEK_BY_MODE_STORAGE_KEY = "prediction_gameweeks_by_mode_v1";
const SELECTED_MINI_LEAGUE_STORAGE_KEY = "prediction_selected_mini_league_v1";
const SEASON_WINNERS_STORAGE_KEY = "prediction_season_winners_v1";
const BADGE_HISTORY_STORAGE_KEY = "prediction_badge_history_v1";
const BADGE_SEEN_STORAGE_KEY = "prediction_seen_badges_v1";
const WORLD_CUP_CENTRAL_OPEN_STORAGE_KEY = "world_cup_central_open_v1";
const FIXTURE_PUSH_STORAGE_KEY = "fixture_push_prefs_v1";
const DEFAULT_PUSH_PREFS = {
  deadline1h: true,
  deadline24h: true,
  bingpot: true,
  betWin: true,
  badgeEarned: true,
  favoriteTeamResult: false,
};
const PREMIER_MODE = "premierLeague";
const WORLD_CUP_MODE = "worldCup";
const FANTASY_IQ_VIEW_ID = "fantasyHelp";
const PREMIER_TABLE_CURRENT_VIEW = "current-2026-27";
const PREMIER_TABLE_HISTORY_VIEW = "history-2025-26";
const MAX_USERNAME_LENGTH = 11;
const USERNAME_DISPLAY_LENGTH = 11;
const PREMIER_SEASON_WINNER_RECORD = {
  id: "premier-2025/26",
  mode: PREMIER_MODE,
  modeLabel: "Premier League",
  seasonLabel: "2025/26",
  finalGameweek: 38,
  winners: [{ player: "Phil", userId: "1763874000000", points: 643 }],
  points: 643,
  completedAt: "2026-05-24T15:00:00.000Z",
};
const ORIGINALS_SEASON_POSITION_RECORDS = [
  { player: "Phil", seasonLabel: "2025/26", points: 643 },
  { player: "Dave", seasonLabel: "2025/26", points: 594 },
  { player: "Emma", seasonLabel: "2025/26", points: 586 },
  { player: "Ian", seasonLabel: "2025/26", points: 583 },
  { player: "Steve", seasonLabel: "2025/26", points: 458 },
  { player: "Anthony", seasonLabel: "2025/26", points: 327 },
  { player: "Tom", seasonLabel: "2025/26", points: 233 },
].map((record, index) => ({ ...record, position: index + 1 }));
const PLAYERS = ["Tom", "Emma", "Phil", "Steve", "Dave", "Ian", "Anthony"];
const ORIGINALS_LEAGUE_PLAYERS = new Set(PLAYERS);
const ORIGINALS_LEAGUE_USER_IDS = new Set([
  "1763801801299",
  "1763801801288",
  "1763801999658",
  "1763802020494",
  "1763812904100",
  "1763813732635",
  "1763874000000",
]);
const emptyGlobalMedals = () => ({ gold: 0, silver: 0, bronze: 0 });
const PERFORMANCE_BADGE_IDS = new Set([
  "streaker",
  "superStreaker",
  "sharpShooter",
  "sniper",
  "superSniper",
  "captainClever",
  "captainKing",
]);
const positiveBadgeCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
};
const isOriginalsFounder = (name = "", userId = "") =>
  ORIGINALS_LEAGUE_PLAYERS.has(String(name || "").trim()) ||
  ORIGINALS_LEAGUE_USER_IDS.has(String(userId || "").trim());
const isOriginalsMiniLeague = (league = {}) => {
  const name = String(league?.name || "").trim().toLowerCase();
  const code = String(league?.joinCode || league?.inviteCode || "").trim().toUpperCase();
  const id = String(league?.id || "").trim();
  return name === "the originals" || code === "ORIGINALS" || id === "lg_mi35amos";
};
const BADGE_DEFINITIONS = [
  {
    id: "founder",
    label: "Founder",
    icon: "✪",
    requirement: "First ever mini-league member.",
  },
  {
    id: "addict",
    label: "Addict",
    icon: "⚽",
    requirement: "Play more than 2 Premier League seasons.",
  },
  {
    id: "veteran",
    label: "Veteran",
    icon: "🛡️",
    requirement: "Play more than 5 Premier League seasons.",
  },
  {
    id: "globalGold",
    label: "Global League Gold",
    icon: "●",
    medalType: "gold",
    requirement: "Finish 1st in the Global League.",
  },
  {
    id: "globalSilver",
    label: "Global League Silver",
    icon: "●",
    medalType: "silver",
    requirement: "Finish 2nd in the Global League.",
  },
  {
    id: "globalBronze",
    label: "Global League Bronze",
    icon: "●",
    medalType: "bronze",
    requirement: "Finish 3rd in the Global League.",
  },
  {
    id: "gambler",
    label: "The Gambler Badge",
    icon: "",
    image: "/coin.png",
    requirement: "Win 1 or more Coins League seasons.",
  },
  {
    id: "streaker",
    label: "Streaker",
    icon: "🔥",
    requirement: "Get the best weekly score in your mini-league for 3 gameweeks in a row.",
  },
  {
    id: "superStreaker",
    label: "Super Streaker",
    icon: "⚡",
    requirement: "Get the best weekly score in your mini-league for 5 or more gameweeks in a row.",
  },
  {
    id: "sharpShooter",
    label: "Sharp Shooter",
    icon: "🎯",
    requirement: "Land 5 exact scores in one Premier League season.",
  },
  {
    id: "sniper",
    label: "Sniper",
    icon: "⌖",
    requirement: "Land 10 exact scores in one Premier League season.",
  },
  {
    id: "superSniper",
    label: "Super Sniper",
    icon: "⌖",
    requirement: "Land 20 or more exact scores in one Premier League season.",
  },
  {
    id: "captainClever",
    label: "Captain Clever",
    icon: "©",
    requirement: "Make 10 correct captain selections in one Premier League season.",
  },
  {
    id: "captainKing",
    label: "Captain King",
    icon: "👑",
    requirement: "Make 20 correct captain selections in one Premier League season.",
  },
];

function isMaxBadgeDemoHistoryRecord(record = {}) {
  const updatedAt = Date.parse(record.updatedAt || "");
  const earnedIds = new Set(
    (Array.isArray(record.earnedBadgeIds) ? record.earnedBadgeIds : [])
      .map((badgeId) => String(badgeId || "").trim())
      .filter(Boolean)
  );
  return (
    String(record.player || "").trim() === "Phil" &&
    Number.isFinite(updatedAt) &&
    updatedAt < Date.parse("2026-07-28T00:00:00.000Z") &&
    BADGE_DEFINITIONS.every((badge) => earnedIds.has(badge.id)) &&
    (Number(record.exactScores) || 0) >= 20 &&
    (Number(record.correctCaptains) || 0) >= 20 &&
    (Number(record.longestWeeklyWinStreak) || 0) >= 5
  );
}

function stripMaxBadgeDemoHistory(record = {}) {
  if (!isMaxBadgeDemoHistoryRecord(record)) return record;
  return {
    ...record,
    globalWinnerCount: 0,
    globalMedals: emptyGlobalMedals(),
    coinLeagueWins: 0,
    currentWeeklyWinStreak: 0,
    longestWeeklyWinStreak: 0,
    exactScores: 0,
    correctCaptains: 0,
    earnedBadgeIds: [],
  };
}

const TEAM_BADGES = {
  Arsenal: "/badges/Arsenal.png",
  "Aston Villa": "/badges/aston_ville.png",
  Bournemouth: "/badges/bournemouth.png",
  Brentford: "/badges/brentford.png",
  Brighton: "/badges/brighton.png",
  Burnley: "/badges/burnley.png",
  Chelsea: "/badges/chelsea.png",
  Coventry: "/badges/coventry.png",
  "Coventry City": "/badges/coventry.png",
  "Crystal Palace": "/badges/crystal_palace.png",
  Everton: "/badges/everton.png",
  Fulham: "/badges/fulham.png",
  Hull: "/badges/hull.png",
  "Hull City": "/badges/hull.png",
  Ipswich: "/badges/ipswich.png",
  "Ipswich Town": "/badges/ipswich.png",
  Leicester: "/badges/leicester.png",
  Liverpool: "/badges/liverpool.png",
  "Manchester City": "/badges/man_city.png",
  "Man City": "/badges/man_city.png",
  "Manchester United": "/badges/man_united.png",
  "Man Utd": "/badges/man_united.png",
  "Manchester Utd": "/badges/man_united.png",
  Newcastle: "/badges/newcastle.png",
  "Nottingham Forest": "/badges/nottingham_forest.png",
  Forest: "/badges/nottingham_forest.png",
  Nottingham: "/badges/nottingham_forest.png",
  "Nott'm Forest": "/badges/nottingham_forest.png",
  Sunderland: "/badges/sunderland.png",
  Spurs: "/badges/spurs.png",
  "West Ham": "/badges/west_ham.png",
  Leeds: "/badges/leeds.png",
  "Leeds United": "/badges/leeds.png",
  Wolves: "/badges/wolves.png",
};

const WORLD_CUP_FLAGS = {
  Algeria: "🇩🇿",
  Argentina: "🇦🇷",
  Australia: "🇦🇺",
  Austria: "🇦🇹",
  Belgium: "🇧🇪",
  "Bosnia and Herzegovina": "🇧🇦",
  Brazil: "🇧🇷",
  Canada: "🇨🇦",
  "Cabo Verde": "🇨🇻",
  Denmark: "🇩🇰",
  Colombia: "🇨🇴",
  "Congo DR": "🇨🇩",
  Croatia: "🇭🇷",
  Curacao: "🇨🇼",
  Czechia: "🇨🇿",
  "Cote d'Ivoire": "🇨🇮",
  Ecuador: "🇪🇨",
  Egypt: "🇪🇬",
  England: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0065}\u{E006E}\u{E0067}\u{E007F}",
  France: "🇫🇷",
  Germany: "🇩🇪",
  Ghana: "🇬🇭",
  Haiti: "🇭🇹",
  Iraq: "🇮🇶",
  "IR Iran": "🇮🇷",
  Japan: "🇯🇵",
  Jordan: "🇯🇴",
  Mexico: "🇲🇽",
  Morocco: "🇲🇦",
  Netherlands: "🇳🇱",
  Norway: "🇳🇴",
  Panama: "🇵🇦",
  Paraguay: "🇵🇾",
  Poland: "🇵🇱",
  Portugal: "🇵🇹",
  Qatar: "🇶🇦",
  "Saudi Arabia": "🇸🇦",
  Scotland: "\u{1F3F4}\u{E0067}\u{E0062}\u{E0073}\u{E0063}\u{E0074}\u{E007F}",
  Senegal: "🇸🇳",
  "South Africa": "🇿🇦",
  Serbia: "🇷🇸",
  "South Korea": "🇰🇷",
  Spain: "🇪🇸",
  Sweden: "🇸🇪",
  Switzerland: "🇨🇭",
  Tunisia: "🇹🇳",
  Türkiye: "🇹🇷",
  "United States": "🇺🇸",
  Uruguay: "🇺🇾",
  Uzbekistan: "🇺🇿",
  "New Zealand": "🇳🇿",
};
const WORLD_CUP_COUNTRIES = Object.keys(WORLD_CUP_FLAGS).sort((a, b) => a.localeCompare(b));

function formatUsernameForDisplay(username, maxLength = USERNAME_DISPLAY_LENGTH) {
  const name = String(username || "").trim();
  if (name.length <= maxLength) return name;
  return `${name.slice(0, Math.max(1, maxLength - 3))}...`;
}

function formatCompactFantasyPitchName(name, maxLength = 9) {
  const label = String(name || "").trim();
  if (label.length <= maxLength) return label;
  return `${label.slice(0, Math.max(1, maxLength - 3))}...`;
}

function formatProfileDate(value) {
  const time = Date.parse(value);
  if (!Number.isFinite(time)) return "Unknown";
  return new Date(time).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getFixturesForMode(mode) {
  return mode === WORLD_CUP_MODE ? WORLD_CUP_FIXTURES : FIXTURES;
}

function getModeKey(mode) {
  return mode === WORLD_CUP_MODE ? "worldcup" : "premier";
}

function getModeLabel(mode) {
  return mode === WORLD_CUP_MODE ? "World Cup" : "Premier League";
}

function getSeasonLabelFromFixtures(fixtures = []) {
  const years = fixtures
    .map((fixture) => new Date(fixture.kickoff).getUTCFullYear())
    .filter((year) => Number.isFinite(year));
  if (!years.length) return "";

  const startYear = Math.min(...years);
  const endYear = Math.max(...years);
  if (startYear === endYear) return String(startYear);
  return `${startYear}/${String(endYear).slice(-2)}`;
}

export function isValidSeasonWinnerRecord(record) {
  if (!record || typeof record !== "object") return false;
  if (getModeKey(record.mode) !== "premier") return true;

  const match = String(record.seasonLabel || "").match(/^(\d{4})\/(\d{2}|\d{4})$/);
  if (!match) return false;
  const startYear = Number(match[1]);
  const endYear = match[2].length === 2
    ? Math.floor(startYear / 100) * 100 + Number(match[2])
    : Number(match[2]);
  return endYear === startYear + 1;
}

function mergeSeasonWinnerRecords(localRecords = [], remoteRecords = []) {
  const byId = new Map();
  [...remoteRecords, ...localRecords].forEach((record) => {
    if (!record?.id || !isValidSeasonWinnerRecord(record)) return;
    const existing = byId.get(record.id);
    byId.set(record.id, {
      ...(existing || {}),
      ...record,
      completedAt: existing?.completedAt || record.completedAt,
    });
  });
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = Date.parse(a.completedAt);
    const bTime = Date.parse(b.completedAt);
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
    return String(b.seasonLabel || "").localeCompare(String(a.seasonLabel || ""));
  });
}

function mergeBadgeHistoryRecords(localRecords = [], remoteRecords = []) {
  const byId = new Map();
  [...remoteRecords, ...localRecords].forEach((record) => {
    if (!record?.id) return;
    const cleanRecord = stripMaxBadgeDemoHistory(record);
    const id = String(record.id);
    const existing = byId.get(id) || {};
    byId.set(id, {
      ...existing,
      ...cleanRecord,
      playedSeason: !!existing.playedSeason || !!cleanRecord.playedSeason,
      founder: !!existing.founder || !!cleanRecord.founder,
      updatedAt: cleanRecord.updatedAt || existing.updatedAt,
    });
  });
  return Array.from(byId.values()).sort((a, b) => {
    const aTime = Date.parse(a.updatedAt);
    const bTime = Date.parse(b.updatedAt);
    if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
    return String(b.seasonLabel || "").localeCompare(String(a.seasonLabel || ""));
  });
}

export function sortFixturesByOrderOfPlay(fixtures = []) {
  return [...fixtures]
    .map((fixture, index) => ({ fixture, index }))
    .sort((a, b) => {
      const aTime = Date.parse(a.fixture?.kickoff);
      const bTime = Date.parse(b.fixture?.kickoff);
      const aHasTime = Number.isFinite(aTime);
      const bHasTime = Number.isFinite(bTime);

      if (aHasTime && bHasTime && aTime !== bTime) return aTime - bTime;
      if (aHasTime !== bHasTime) return aHasTime ? -1 : 1;
      return a.index - b.index;
    })
    .map(({ fixture }) => fixture);
}

function getModeGameweekLabel(mode, gameweek) {
  return mode === WORLD_CUP_MODE ? `Matchday ${gameweek}` : `GW${gameweek}`;
}

export function getWorldCupStageLabel(fixture) {
  if (fixture?.group) return "Group Stage";
  return fixture?.knockoutStage || "Knockout Stage";
}

export function getWorldCupStageForGameweek(fixtures = [], gameweek) {
  const fixture = (fixtures || []).find(
    (candidate) => Number(candidate?.gameweek) === Number(gameweek)
  );
  return fixture ? getWorldCupStageLabel(fixture) : "";
}

function getWorldCupFixtureLabel(fixture) {
  if (fixture?.group) return `Group ${fixture.group}`;
  return getWorldCupStageLabel(fixture);
}

function getWorldCupFlag(teamName) {
  return WORLD_CUP_FLAGS[(teamName || "").trim()] || "";
}

function isPlaceholderTeamName(teamName) {
  return !teamName || String(teamName).trim().toUpperCase() === "TBA";
}

function resolveWorldCupCountryName(teamName) {
  const normalized = normalizeTeamName(teamName);
  if (!normalized) return "";
  return WORLD_CUP_COUNTRIES.find(
    (country) => normalizeTeamName(country) === normalized
  ) || teamName || "";
}

const WORLD_CUP_FIXTURE_ID_SET = new Set(
  WORLD_CUP_FIXTURES.map((fixture) => String(fixture.id))
);
const PREMIER_FIXTURE_ID_SET = new Set(FIXTURES.map((fixture) => String(fixture.id)));
const ALL_SUPPORTED_FIXTURES = [...FIXTURES, ...WORLD_CUP_FIXTURES];

function looksLikeUserId(value) {
  const text = String(value || "").trim();
  return /^\d{10,}$/.test(text) || /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(text);
}

function keepOnlyWorldCupPredictions(allPredictions = {}) {
  const cleaned = {};
  Object.entries(allPredictions || {}).forEach(([playerKey, playerPredictions]) => {
    const kept = {};
    Object.entries(playerPredictions || {}).forEach(([fixtureId, prediction]) => {
      if (WORLD_CUP_FIXTURE_ID_SET.has(String(fixtureId))) {
        kept[fixtureId] = prediction;
      }
    });
    if (Object.keys(kept).length) cleaned[playerKey] = kept;
  });
  return cleaned;
}

function keepSupportedFixturePredictions(allPredictions = {}) {
  const cleaned = {};
  Object.entries(allPredictions || {}).forEach(([playerKey, playerPredictions]) => {
    const kept = {};
    Object.entries(playerPredictions || {}).forEach(([fixtureId, prediction]) => {
      const id = String(fixtureId);
      if (PREMIER_FIXTURE_ID_SET.has(id) || WORLD_CUP_FIXTURE_ID_SET.has(id)) {
        kept[fixtureId] = prediction;
      }
    });
    if (Object.keys(kept).length) cleaned[playerKey] = kept;
  });
  return cleaned;
}

// Ensure at most one captain (isDouble) per round within one fixture set.
// Call separately per mode so Premier League GW10 and World Cup Matchday 10
// are never treated as the same round.
export function normalizeCaptainsByGameweek(predsForUser, fixturesSource = FIXTURES) {
  if (!predsForUser || typeof predsForUser !== "object") return predsForUser;

  const fixtureById = new Map(
    (fixturesSource || []).map((fixture) => [String(fixture.id), fixture])
  );
  const byGw = {};

  Object.entries(predsForUser).forEach(([fixtureId, pred]) => {
    if (!pred || !pred.isDouble) return;

    const fx = fixtureById.get(String(fixtureId));
    if (!fx) return;

    const gw = fx.gameweek;
    const ts = typeof pred.updatedAt === "number" ? pred.updatedAt : 0;

    if (!byGw[gw]) byGw[gw] = [];
    byGw[gw].push({ fixtureId, ts });
  });

  const cloned = { ...predsForUser };

  Object.values(byGw).forEach((arr) => {
    if (arr.length <= 1) return;

    arr.sort((a, b) => a.ts - b.ts);
    const keepId = arr[arr.length - 1].fixtureId;

    arr.forEach(({ fixtureId }) => {
      if (fixtureId === keepId) return;
      const prev = cloned[fixtureId];
      if (!prev) return;
      cloned[fixtureId] = { ...prev, isDouble: false };
    });
  });

  return cloned;
}

export function mergeCloudPredictionsPreservingLocalBoosts(
  cloudPreds = {},
  localPreds = {},
  fixturesSource = FIXTURES
) {
  const merged = { ...(cloudPreds || {}) };

  (fixturesSource || []).forEach((fixture) => {
    if (!fixture?.id) return;

    const fixtureId = String(fixture.id);
    const localPred = localPreds?.[fixtureId] || localPreds?.[fixture.id];
    if (!localPred) return;

    const cloudPred = merged[fixtureId] || merged[fixture.id];
    if (!cloudPred) {
      merged[fixtureId] = { ...localPred };
      return;
    }

    const shouldPreserveDouble = !!localPred.isDouble && !cloudPred.isDouble;
    const shouldPreserveTriple = !!localPred.isTriple && !cloudPred.isTriple;
    if (!shouldPreserveDouble && !shouldPreserveTriple) return;

    merged[fixtureId] = {
      ...cloudPred,
      isDouble: !!cloudPred.isDouble || !!localPred.isDouble,
      isTriple: !!cloudPred.isTriple || !!localPred.isTriple,
    };
  });

  return merged;
}

export function setOnlyCaptainForFixtureRound(predsForUser, fixtureId, fixturesSource = FIXTURES) {
  if (!predsForUser || typeof predsForUser !== "object") return predsForUser;

  const fixtureById = new Map(
    (fixturesSource || []).map((fixture) => [String(fixture.id), fixture])
  );
  const targetFixture = fixtureById.get(String(fixtureId));
  if (!targetFixture) return predsForUser;

  return Object.fromEntries(
    Object.entries(predsForUser).map(([id, pred]) => {
      const fixture = fixtureById.get(String(id));
      const sameRound = fixture && fixture.gameweek === targetFixture.gameweek;
      const isTarget = String(id) === String(fixtureId);

      return [
        id,
        {
          ...pred,
          isDouble: sameRound ? isTarget : pred.isDouble,
          isTriple: sameRound ? false : pred.isTriple,
        },
      ];
    })
  );
}

// Simple avatar renderer using DiceBear styles
function resolveTeamBadge(teamName) {
  const raw = (teamName || "").trim();
  if (!raw) return "";
  if (TEAM_BADGES[raw]) return TEAM_BADGES[raw];

  const normalized = normalizeTeamName(raw);
  if (!normalized) return "";
  const match = Object.entries(TEAM_BADGES).find(
    ([name]) => normalizeTeamName(name) === normalized
  );
  return match ? match[1] : "";
}

function PlayerAvatar({
  seed,
  avatarStyle = "avataaars",
  size = 48,
  title = "",
  favoriteTeam = "",
  favoriteMode = PREMIER_MODE,
}) {
  const safeSeed = encodeURIComponent(seed || "user");
  const safeStyle = encodeURIComponent(avatarStyle || "avataaars");
  const src = `https://api.dicebear.com/7.x/${safeStyle}/svg?seed=${safeSeed}`;
  const badgeSrc = resolveTeamBadge(favoriteTeam);
  const flagBg = favoriteMode === WORLD_CUP_MODE ? getWorldCupFlag(favoriteTeam) : "";
  const avatarInset = flagBg ? Math.max(2, Math.round(size * 0.05)) : 0;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: 999,
        position: "relative",
        overflow: "hidden",
      }}
      title={title || "avatar"}
    >
      {flagBg && (
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: Math.round(size * 0.92),
            lineHeight: 1,
            opacity: 0.78,
            transform: "scale(1)",
          }}
        >
          {flagBg}
        </div>
      )}
      {!flagBg && badgeSrc && (
        <img
          src={badgeSrc}
          alt=""
          aria-hidden="true"
          width={size}
          height={size}
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
            objectFit: "cover",
            opacity: 0.46,
            filter: "brightness(1.12) saturate(1.15)",
            transform: "scale(1.08)",
          }}
        />
      )}
      <img
        src={src}
        alt={title || "avatar"}
        width={size - avatarInset * 2}
        height={size - avatarInset * 2}
        style={{
          borderRadius: 999,
          display: "block",
          position: "absolute",
          inset: avatarInset,
          zIndex: 1,
        }}
      />
    </div>
  );
}

function AnimatedNumber({ value, duration = 400, format = (v) => v }) {
  const [display, setDisplay] = React.useState(value || 0);
  const rafRef = React.useRef(null);
  const startRef = React.useRef(null);
  const fromRef = React.useRef(value || 0);

  React.useEffect(() => {
    const from = Number(fromRef.current) || 0;
    const to = Number(value) || 0;
    if (from === to) return;

    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const t = Math.min(1, elapsed / duration);
      const next = from + (to - from) * t;
      setDisplay(next);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        fromRef.current = to;
        startRef.current = null;
      }
    };

    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(step);

    return () => cancelAnimationFrame(rafRef.current);
  }, [value, duration]);

  return format(display);
}

// Fetch current user's avatar from backend
async function apiGetAvatar(token) {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/avatar/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error("Avatar fetch failed");
    return await res.json(); // { seed, style }
  } catch {
    return null;
  }
}

const CoinIcon = () => (
  <img
    src="/coin.png"
    alt="coin"
    style={{
      width: 22,
      height: 22,
      verticalAlign: "middle",
      marginRight: 4,
    }}
  />
);


// Historic weekly seed scores are intentionally cleared between seasons.
const SPREADSHEET_WEEKLY_TOTALS = {};

const GAMEWEEKS = Array.from(new Set(FIXTURES.map((f) => f.gameweek))).sort(
  (a, b) => a - b
);
const WORLD_CUP_GAMEWEEKS = Array.from(
  new Set(WORLD_CUP_FIXTURES.map((f) => f.gameweek))
).sort((a, b) => a - b);
const PREMIER_LEAGUE_TEAMS = Array.from(
  new Set(
    FIXTURES.flatMap((f) => [f.homeTeam, f.awayTeam]).filter(
      (t) => typeof t === "string" && t.trim().length > 0
    )
  )
).sort((a, b) => a.localeCompare(b));

const FANTASY_IQ_SCORE_CONFIG = {
  fixtureOutlook: 0.25,
  attackOutlook: 0.2,
  defenceOutlook: 0.2,
  captaincyOutlook: 0.1,
  squadBalance: 0.1,
  predictionAlignment: 0.1,
  benchStrength: 0.05,
  expectedGoalsRange: { min: 0.4, max: 2.6 },
  sensitivity: {
    curveExponent: 0.8,
    fixtureCategorySpread: 1.2,
    structuralCategorySpread: 0.85,
    overallSpread: 1.18,
    overallDisplayFloor: 24,
    overallDisplayCeiling: 76,
  },
  availabilityMultipliers: {
    available: 1,
    doubtful: 0.72,
    unavailable: 0.18,
    unknown: 1,
  },
  availabilityChanceFloor: 0.15,
  minimumScoredPlayersForOverall: 8,
  clubFixtureWeights: {
    overallExpectedPoints: 0.6,
    overallDifficulty: 0.4,
    attackExpectedGoals: 0.5,
    attackScoreTwoPlus: 0.3,
    attackDifficulty: 0.2,
    defenceCleanSheet: 0.6,
    defenceDifficulty: 0.4,
  },
  positionOutlookWeights: {
    GK: { defence: 0.85, overall: 0.15 },
    DEF: { defence: 0.75, attack: 0.1, overall: 0.15 },
    MID: { attack: 0.75, overall: 0.25 },
    FWD: { attack: 0.85, overall: 0.15 },
  },
  squadContributionWeights: {
    starter: 1,
    benchOutfield: 0.25,
    benchGoalkeeper: 0.2,
  },
  fixtureOutlookWeights: {
    playerAverage: 0.75,
    uniqueClubAverage: 0.25,
  },
  captaincyWeights: {
    captain: 0.85,
    viceCaptain: 0.15,
  },
  squadBalanceWeights: {
    formation: 0.25,
    clubDiversification: 0.2,
    starterCoverage: 0.2,
    benchCover: 0.15,
    valueEfficiency: 0.2,
  },
  predictionAlignmentWeights: {
    starters: 0.5,
    captains: 0.3,
    squad: 0.2,
  },
  benchStrengthWeights: {
    benchOutlook: 0.75,
    benchCoverage: 0.25,
  },
  userPredictionMappings: {
    predictedGoals: [0, 40, 70, 88, 100],
    predictedConceded: [100, 55, 25, 0],
    win: 92,
    draw: 58,
    loss: 22,
  },
};

const FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION = {
  maxSquadSize: 15,
  starters: 11,
  bench: 4,
  budget: 100,
  maxPlayersPerClub: 3,
  positions: {
    GK: 2,
    DEF: 5,
    MID: 5,
    FWD: 3,
  },
};

const FANTASY_IQ_POSITIONS = Object.keys(FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.positions);
const FANTASY_IQ_SQUAD_ROLES = ["starter", "bench"];
const FANTASY_IQ_STORAGE_SCHEMA_VERSION = 1;
const FANTASY_IQ_FALLBACK_PLAYER_DATASET = buildFallbackFantasyPlayerDataset(
  PREMIER_LEAGUE_TEAMS.map((team) => ({
    name: team,
    shortName: getTeamCode(team),
    code: getTeamCode(team),
  }))
);
const FANTASY_IQ_TEMP_PLAYERS = FANTASY_IQ_FALLBACK_PLAYER_DATASET.players;

function validateFantasyIqScoreConfig(config = FANTASY_IQ_SCORE_CONFIG) {
  const categoryKeys = Object.keys(createEmptyFantasyIqReport().categories);
  const totalWeight = categoryKeys.reduce((sum, key) => sum + Number(config[key] || 0), 0);
  return Math.abs(totalWeight - 1) < 0.000001;
}

function createEmptyFantasyIqSquad() {
  return {
    source: null,
    formation: null,
    gameweek: null,
    players: [],
    captainPlayerId: null,
    viceCaptainPlayerId: null,
    importedAt: null,
    confirmed: false,
  };
}

function createEmptyFantasyIqReport() {
  return {
    overallScore: null,
    confidence: null,
    categories: {
      fixtureOutlook: null,
      attackOutlook: null,
      defenceOutlook: null,
      captaincyOutlook: null,
      squadBalance: null,
      predictionAlignment: null,
      benchStrength: null,
    },
    strengths: [],
    concerns: [],
    recommendations: [],
    predictionConflicts: [],
    budget: null,
    transferPriority: null,
    confidenceReasons: [],
    playerDataStatus: null,
  };
}

function countFantasyIqPlayersByPosition(players = []) {
  return FANTASY_IQ_POSITIONS.reduce((out, position) => {
    out[position] = players.filter((player) => String(player?.position || "").toUpperCase() === position).length;
    return out;
  }, {});
}

function countFantasyIqPlayersByClub(players = []) {
  return players.reduce((out, player) => {
    const code = String(player?.teamCode || "").trim().toUpperCase();
    if (!code) return out;
    out[code] = (out[code] || 0) + 1;
    return out;
  }, {});
}

function deriveFantasyIqFormation(squad = createEmptyFantasyIqSquad()) {
  const starters = (Array.isArray(squad.players) ? squad.players : []).filter(
    (player) => String(player?.squadRole || "").toLowerCase() === "starter"
  );
  const counts = countFantasyIqPlayersByPosition(starters);
  if (!starters.length) return null;
  return {
    label: `${counts.DEF || 0}-${counts.MID || 0}-${counts.FWD || 0}`,
    counts,
  };
}

function isRecognisedPremierLeagueTeamCode(teamCode) {
  const normalisedCode = String(teamCode || "").trim().toUpperCase();
  if (!normalisedCode) return false;
  return PREMIER_LEAGUE_TEAMS.some((team) => getTeamCode(team) === normalisedCode);
}

function isRecognisedFantasyIqPosition(position) {
  return FANTASY_IQ_POSITIONS.includes(String(position || "").trim().toUpperCase());
}

function isRecognisedFantasyIqSquadRole(role) {
  return FANTASY_IQ_SQUAD_ROLES.includes(String(role || "").trim().toLowerCase());
}

function findDuplicateFantasyIqPlayers(players = []) {
  const seen = new Set();
  const duplicates = new Set();
  players.forEach((player) => {
    const key = String(player?.id || player?.name || "").trim().toLowerCase();
    if (!key) return;
    if (seen.has(key)) duplicates.add(key);
    seen.add(key);
  });
  return Array.from(duplicates);
}

function normaliseFantasyIqSquad(rawSquad = createEmptyFantasyIqSquad()) {
  const input = rawSquad && typeof rawSquad === "object" ? rawSquad : {};
  const players = Array.isArray(input.players) ? input.players : [];
  const normalisedPlayers = players
    .map((player, index) => {
      const displayName = String(player?.displayName || player?.name || "").trim();
      const name = displayName;
      const teamCode =
        normalisePremierLeagueTeamCode(player?.teamCode || player?.teamName) ||
        String(player?.teamCode || "").trim().toUpperCase();
      const position = String(player?.position || "").trim().toUpperCase();
      const squadRole = String(player?.squadRole || "bench").trim().toLowerCase();
      const id = String(player?.id || `manual-${index}-${name || position || "player"}`).trim();
      if (!name && !teamCode && !position) return null;
      return {
        id,
        sourceId: player?.sourceId ?? null,
        name,
        displayName,
        webName: String(player?.webName || "").trim(),
        normalisedName: player?.normalisedName || normaliseFantasyPlayerName(displayName),
        teamId: player?.teamId || null,
        teamCode,
        teamName: String(player?.teamName || getFantasyIqTeamByCode(teamCode) || "").trim(),
        position,
        positionId: player?.positionId ?? null,
        price: getFantasyIqPlayerPrice(player),
        priceTenths: getFantasyIqPlayerPriceTenths(player),
        squadRole: isRecognisedFantasyIqSquadRole(squadRole) ? squadRole : "bench",
        isCaptain: !!player?.isCaptain,
        isViceCaptain: !!player?.isViceCaptain,
        confidence: clampNumber(player?.confidence ?? 1, 0, 1),
        manuallyConfirmed: !!player?.manuallyConfirmed,
        active: player?.active !== false,
        availabilityStatus: player?.availabilityStatus || "unknown",
        externalMetadata: player?.externalMetadata || {},
        dataSource: player?.dataSource || (player?.temporary ? "temporary-development-fallback" : null),
        dataUpdatedAt: player?.dataUpdatedAt || null,
        canonicalPlayerId: player?.canonicalPlayerId || (String(id).startsWith("fpl:") ? id : null),
        reconciliationStatus: player?.reconciliationStatus || (player?.temporary ? "legacy" : null),
        reconciliationConfidence: player?.reconciliationConfidence ?? null,
        migrationNote: player?.migrationNote || null,
        temporary: !!player?.temporary,
      };
    })
    .filter(Boolean)
    .slice(0, FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.maxSquadSize);
  const captainPlayer = normalisedPlayers.find((player) => player.isCaptain);
  const viceCaptainPlayer = normalisedPlayers.find((player) => player.isViceCaptain);
  const captainPlayerId = input.captainPlayerId || captainPlayer?.id || null;
  const viceCaptainPlayerId = input.viceCaptainPlayerId || viceCaptainPlayer?.id || null;
  const squad = {
    source: ["screenshot", "manual", "transfer-iq", "lineup-iq", "suggested-team"].includes(input.source) ? input.source : null,
    formation: null,
    gameweek: Number.isFinite(Number(input.gameweek)) ? Number(input.gameweek) : null,
    players: normalisedPlayers.map((player) => ({
      ...player,
      isCaptain: captainPlayerId ? player.id === captainPlayerId : !!player.isCaptain,
      isViceCaptain: viceCaptainPlayerId ? player.id === viceCaptainPlayerId : !!player.isViceCaptain,
    })),
    captainPlayerId,
    viceCaptainPlayerId,
    importedAt: input.importedAt || null,
    updatedAt: input.updatedAt || null,
    confirmed: !!input.confirmed,
    schemaVersion: Number(input.schemaVersion) || FANTASY_IQ_STORAGE_SCHEMA_VERSION,
  };
  const formation = deriveFantasyIqFormation(squad);
  return {
    ...squad,
    formation: formation?.label || null,
  };
}

function validateFantasyIqSquad(squad = createEmptyFantasyIqSquad()) {
  const normalisedSquad = normaliseFantasyIqSquad(squad);
  const players = normalisedSquad.players;
  const errors = [];
  const warnings = [];
  const starters = players.filter((player) => player.squadRole === "starter");
  const bench = players.filter((player) => player.squadRole === "bench");
  const positionCounts = countFantasyIqPlayersByPosition(players);
  const starterPositionCounts = countFantasyIqPlayersByPosition(starters);
  const clubCounts = countFantasyIqPlayersByClub(players);
  const formation = deriveFantasyIqFormation(normalisedSquad);
  const budgetSummary = getFantasyIqSquadBudgetSummary(players);

  if (players.length !== FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.maxSquadSize) {
    errors.push("Squad must contain 15 players.");
  }

  const duplicatePlayers = findDuplicateFantasyIqPlayers(players);
  if (duplicatePlayers.length) errors.push("Duplicate player selected.");

  if (starters.length !== FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.starters) {
    errors.push("Starting XI must contain 11 players.");
  }
  if (bench.length !== FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.bench) {
    errors.push("Bench must contain 4 players.");
  }

  FANTASY_IQ_POSITIONS.forEach((position) => {
    const expected = FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.positions[position];
    const actual = positionCounts[position] || 0;
    if (actual !== expected) {
      const label = position === "GK" ? "goalkeepers" : position === "DEF" ? "defenders" : position === "MID" ? "midfielders" : "forwards";
      errors.push(`Squad must contain ${expected} ${label}.`);
    }
  });

  Object.entries(clubCounts).forEach(([clubCode, count]) => {
    if (count > FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.maxPlayersPerClub) {
      errors.push(`No more than 3 players from one club (${clubCode}).`);
    }
  });

  if (budgetSummary.complete && Number(budgetSummary.totalCost || 0) > FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.budget + 0.001) {
    errors.push(`Squad exceeds the £${FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.budget.toFixed(1)}m budget.`);
  } else if (players.length && !budgetSummary.complete) {
    warnings.push(`Budget check incomplete because ${players.length - budgetSummary.pricedPlayerCount} players do not have prices yet.`);
  }

  players.forEach((player) => {
    if (!player.name || !player.teamCode || !player.position) {
      warnings.push("Incomplete player metadata.");
    }
    if (player.teamCode && !isRecognisedPremierLeagueTeamCode(player.teamCode)) {
      errors.push(`${player.name || "A player"} has an unrecognised team code.`);
    }
    if (player.position && !isRecognisedFantasyIqPosition(player.position)) {
      errors.push(`${player.name || "A player"} has an unrecognised position.`);
    }
    if (player.squadRole && !isRecognisedFantasyIqSquadRole(player.squadRole)) {
      errors.push(`${player.name || "A player"} has an unrecognised squad role.`);
    }
  });

  if (starters.length === FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.starters) {
    if ((starterPositionCounts.GK || 0) !== 1) errors.push("Starting XI must contain exactly 1 goalkeeper.");
    if ((starterPositionCounts.DEF || 0) < 3) errors.push("Starting XI must contain at least 3 defenders.");
    if ((starterPositionCounts.MID || 0) < 2) errors.push("Starting XI must contain at least 2 midfielders.");
    if ((starterPositionCounts.FWD || 0) < 1) errors.push("Starting XI must contain at least 1 forward.");
  }

  const captain = players.find((player) => player.id === normalisedSquad.captainPlayerId || player.isCaptain);
  const viceCaptain = players.find((player) => player.id === normalisedSquad.viceCaptainPlayerId || player.isViceCaptain);
  const captainIds = new Set(players.filter((player) => player.isCaptain).map((player) => player.id).filter(Boolean));
  const viceCaptainIds = new Set(players.filter((player) => player.isViceCaptain).map((player) => player.id).filter(Boolean));
  if (normalisedSquad.captainPlayerId) captainIds.add(normalisedSquad.captainPlayerId);
  if (normalisedSquad.viceCaptainPlayerId) viceCaptainIds.add(normalisedSquad.viceCaptainPlayerId);
  if (captainIds.size > 1) errors.push("Squad has more than one captain.");
  if (viceCaptainIds.size > 1) errors.push("Squad has more than one vice captain.");
  if (!captain) errors.push("Captain missing.");
  if (!viceCaptain) errors.push("Vice-captain missing.");
  if (captain && viceCaptain && captain.id === viceCaptain.id) {
    errors.push("Captain and vice-captain cannot be the same player.");
  }
  if (captain && captain.squadRole !== "starter") {
    errors.push("Captain must be a starter.");
  }
  if (viceCaptain && viceCaptain.squadRole !== "starter") {
    errors.push("Vice-captain must be a starter.");
  }
  if (players.length < FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.maxSquadSize) warnings.push("Incomplete squad while editing.");
  if (players.some((player) => player.temporary || player.dataSource === "temporary-development-fallback")) {
    warnings.push("Temporary player dataset in use.");
  }
  if (normalisedSquad.needsPlayerDataReview || players.some((player) => ["ambiguous", "unmatched", "legacy"].includes(player.reconciliationStatus))) {
    warnings.push("Your saved squad needs a quick player-data review.");
  }

  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    messages: errors,
    warnings,
    summary: {
      totalPlayers: players.length,
      starters: starters.length,
      bench: bench.length,
      formation: formation?.label || null,
      clubCounts,
      budget: budgetSummary,
      positionCounts,
      starterPositionCounts,
      hasCaptain: !!captain,
      hasViceCaptain: !!viceCaptain,
    },
  };
}

function addFantasyIqSquadPlayer(squad, player) {
  const current = normaliseFantasyIqSquad(squad);
  if (!player || current.players.some((item) => item.id === player.id)) return current;
  if (current.players.length >= FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.maxSquadSize) return current;
  const positionCount = current.players.filter((item) => item.position === player.position).length;
  const expectedPositionCount = FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.positions[player.position] || 0;
  const squadRole = positionCount < Math.max(1, expectedPositionCount - 1) ? "starter" : "bench";
  const next = {
    ...current,
    source: current.source || "manual",
    confirmed: false,
    players: [
      ...current.players,
      {
        id: player.id,
        sourceId: player.sourceId ?? null,
        name: player.displayName || player.name,
        displayName: player.displayName || player.name,
        webName: player.webName || "",
        normalisedName: player.normalisedName || normaliseFantasyPlayerName(player.displayName || player.name),
        teamId: player.teamId || null,
        teamCode: player.teamCode,
        teamName: player.teamName || getFantasyIqTeamByCode(player.teamCode),
        position: player.position,
        positionId: player.positionId ?? null,
        price: getFantasyIqPlayerPrice(player),
        priceTenths: getFantasyIqPlayerPriceTenths(player),
        squadRole,
        isCaptain: false,
        isViceCaptain: false,
        confidence: 1,
        manuallyConfirmed: true,
        active: player.active !== false,
        availabilityStatus: player.availabilityStatus || "unknown",
        externalMetadata: player.externalMetadata || {},
        dataSource: player.dataSource || null,
        dataUpdatedAt: player.dataUpdatedAt || null,
        canonicalPlayerId: player.id,
        reconciliationStatus: player.id?.startsWith("fpl:") ? "matched" : "legacy",
        reconciliationConfidence: player.id?.startsWith("fpl:") ? 1 : null,
        temporary: !!player.temporary,
      },
    ],
  };
  return normaliseFantasyIqSquad(next);
}

function removeFantasyIqSquadPlayer(squad, playerId) {
  const current = normaliseFantasyIqSquad(squad);
  const nextPlayers = current.players.filter((player) => player.id !== playerId);
  return normaliseFantasyIqSquad({
    ...current,
    players: nextPlayers,
    captainPlayerId: current.captainPlayerId === playerId ? null : current.captainPlayerId,
    viceCaptainPlayerId: current.viceCaptainPlayerId === playerId ? null : current.viceCaptainPlayerId,
    confirmed: false,
  });
}

function updateFantasyIqSquadPlayerRole(squad, playerId, squadRole) {
  const current = normaliseFantasyIqSquad(squad);
  return normaliseFantasyIqSquad({
    ...current,
    players: current.players.map((player) =>
      player.id === playerId ? { ...player, squadRole, isCaptain: player.isCaptain, isViceCaptain: player.isViceCaptain } : player
    ),
    confirmed: false,
  });
}

function setFantasyIqCaptain(squad, playerId) {
  const current = normaliseFantasyIqSquad(squad);
  return normaliseFantasyIqSquad({
    ...current,
    captainPlayerId: playerId,
    viceCaptainPlayerId: current.viceCaptainPlayerId === playerId ? null : current.viceCaptainPlayerId,
    players: current.players.map((player) => ({
      ...player,
      isCaptain: player.id === playerId,
      isViceCaptain: player.id === playerId ? false : player.isViceCaptain,
    })),
    confirmed: false,
  });
}

function setFantasyIqViceCaptain(squad, playerId) {
  const current = normaliseFantasyIqSquad(squad);
  return normaliseFantasyIqSquad({
    ...current,
    captainPlayerId: current.captainPlayerId === playerId ? null : current.captainPlayerId,
    viceCaptainPlayerId: playerId,
    players: current.players.map((player) => ({
      ...player,
      isCaptain: player.id === playerId ? false : player.isCaptain,
      isViceCaptain: player.id === playerId,
    })),
    confirmed: false,
  });
}

function getFantasyIqSquadStorageKey(userIdentifier) {
  const identifier = String(userIdentifier || "anonymous").trim() || "anonymous";
  return `predictionAddiction:fantasyIqSquad:v1:${identifier}`;
}

function loadFantasyIqSquad(userIdentifier) {
  try {
    const saved = localStorage.getItem(getFantasyIqSquadStorageKey(userIdentifier));
    if (!saved) return createEmptyFantasyIqSquad();
    return normaliseFantasyIqSquad(JSON.parse(saved));
  } catch {
    return createEmptyFantasyIqSquad();
  }
}

function saveFantasyIqSquad(userIdentifier, squad) {
  const normalised = normaliseFantasyIqSquad(squad);
  localStorage.setItem(
    getFantasyIqSquadStorageKey(userIdentifier),
    JSON.stringify({
      schemaVersion: FANTASY_IQ_STORAGE_SCHEMA_VERSION,
      ...normalised,
    })
  );
  return normalised;
}

function loadFantasyScreenshotFeedbackSummary() {
  try {
    const saved = localStorage.getItem(FANTASY_SCREENSHOT_FEEDBACK_STORAGE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null;
  }
}

function saveFantasyScreenshotFeedbackSummary(summary) {
  if (!summary) return null;
  const safeSummary = createFantasyScreenshotFeedbackSummary({ importSummary: summary });
  localStorage.setItem(FANTASY_SCREENSHOT_FEEDBACK_STORAGE_KEY, JSON.stringify(safeSummary.importSummary));
  return safeSummary.importSummary;
}

function clampFantasyIqScore(value) {
  return Math.round(clampNumber(value, 0, 100));
}

function formatFantasyIqScore(value) {
  return value == null ? null : `${clampFantasyIqScore(value)}/100`;
}

function fantasyIqDifficultyToScore(difficultyScore) {
  const difficulty = clampNumber(difficultyScore, 1, 5);
  return applyFantasyIqSensitivityCurve(((5 - difficulty) / 4) * 100);
}

function fantasyIqExpectedPointsToScore(expectedPoints) {
  return applyFantasyIqSensitivityCurve((clampNumber(expectedPoints, 0, 3) / 3) * 100);
}

function fantasyIqExpectedGoalsToScore(expectedGoals) {
  const range = FANTASY_IQ_SCORE_CONFIG.expectedGoalsRange;
  return applyFantasyIqSensitivityCurve(
    ((clampNumber(expectedGoals, range.min, range.max) - range.min) / (range.max - range.min)) * 100
  );
}

function fantasyIqProbabilityToScore(probability) {
  return applyFantasyIqSensitivityCurve(clampNumber(probability, 0, 1) * 100);
}

function applyFantasyIqSensitivityCurve(score, exponent = FANTASY_IQ_SCORE_CONFIG.sensitivity.curveExponent) {
  const ratio = clampNumber(score, 0, 100) / 100;
  if (ratio === 0.5) return 50;
  const distance = Math.abs(ratio - 0.5) * 2;
  const curvedDistance = Math.pow(distance, Math.max(0.25, Number(exponent) || 1));
  return clampNumber(50 + Math.sign(ratio - 0.5) * curvedDistance * 50, 0, 100);
}

function spreadFantasyIqScore(score, factor = 1) {
  if (score == null) return null;
  return clampFantasyIqScore(50 + (Number(score) - 50) * factor);
}

function calibrateFantasyIqOverallScore(score) {
  if (score == null) return null;
  const floor = FANTASY_IQ_SCORE_CONFIG.sensitivity.overallDisplayFloor;
  const ceiling = FANTASY_IQ_SCORE_CONFIG.sensitivity.overallDisplayCeiling;
  return clampFantasyIqScore(((Number(score) - floor) / (ceiling - floor)) * 100);
}

function getFantasyIqAvailabilityMultiplier(player = {}) {
  if (!hasActionableFantasyAvailabilityRisk(player)) return FANTASY_IQ_SCORE_CONFIG.availabilityMultipliers.unknown;
  const status = String(player.availabilityStatus || "unknown").toLowerCase();
  const statusMultiplier =
    FANTASY_IQ_SCORE_CONFIG.availabilityMultipliers[status] ??
    FANTASY_IQ_SCORE_CONFIG.availabilityMultipliers.unknown;
  const chance = getFantasyAvailabilityChance(player);
  if (chance == null) return statusMultiplier;
  return Math.min(statusMultiplier, clampNumber(chance / 100, FANTASY_IQ_SCORE_CONFIG.availabilityChanceFloor, 1));
}

function applyFantasyIqPlayerAvailability(player = {}, score) {
  if (score == null) return null;
  const multiplier = getFantasyIqAvailabilityMultiplier(player);
  const replacementFloor = player.squadRole === "starter" ? 8 : 18;
  return clampNumber(replacementFloor + (Number(score) - replacementFloor) * multiplier, 0, 100);
}

function fantasyIqNumberOrNull(value) {
  if (value == null || value === "") return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function scaleFantasyIqPlayerMetric(value, min, max, fallback = null) {
  const number = fantasyIqNumberOrNull(value);
  if (number == null) return fallback;
  return clampNumber(((number - min) / (max - min)) * 100, 0, 100);
}

function getFantasyIqPlayerFormScore(player = {}) {
  const meta = player.externalMetadata || {};
  return getFantasyIqWeightedAverage(
    [
      { value: scaleFantasyIqPlayerMetric(meta.form, 0, 10), weight: 0.35 },
      { value: scaleFantasyIqPlayerMetric(meta.pointsPerGame, 0, 8), weight: 0.28 },
      { value: scaleFantasyIqPlayerMetric(meta.totalPoints, 0, 160), weight: 0.12 },
      { value: scaleFantasyIqPlayerMetric(meta.selectedByPercent, 0, 35), weight: 0.1 },
      { value: scaleFantasyIqPlayerMetric(meta.minutes, 0, 900), weight: 0.15 },
    ],
    (item) => item.value,
    (item) => item.weight
  );
}

function getFantasyIqPlayerStarterLikelihoodScore(player = {}) {
  const meta = player.externalMetadata || {};
  return getFantasyIqWeightedAverage(
    [
      { value: scaleFantasyIqPlayerMetric(meta.minutes, 0, 900), weight: 0.45 },
      { value: scaleFantasyIqPlayerMetric(meta.starts, 0, 10), weight: 0.35 },
      { value: scaleFantasyIqPlayerMetric(meta.pointsPerGame, 0, 8), weight: 0.12 },
      { value: scaleFantasyIqPlayerMetric(meta.selectedByPercent, 0, 35), weight: 0.08 },
    ],
    (item) => item.value,
    (item) => item.weight
  );
}

function getFantasyIqPlayerPremiumScore(player = {}) {
  const price = getFantasyIqPlayerPrice(player);
  if (price == null) return null;
  const position = String(player.position || "").toUpperCase();
  const ceiling = position === "GK" ? 7 : position === "DEF" ? 8 : 14;
  return scaleFantasyIqPlayerMetric(price, 4, ceiling, 40);
}

function blendFantasyIqPlayerLevelScores(baseScore, player = {}, { usePremium = true } = {}) {
  if (baseScore == null) return null;
  const playerSignals = [
    { value: baseScore, weight: 0.56 },
    { value: getFantasyIqPlayerStarterLikelihoodScore(player), weight: 0.18 },
    { value: getFantasyIqPlayerFormScore(player), weight: 0.16 },
    { value: usePremium ? getFantasyIqPlayerPremiumScore(player) : null, weight: 0.1 },
  ];
  return getFantasyIqWeightedAverage(playerSignals, (item) => item.value, (item) => item.weight) ?? baseScore;
}

function getFantasyIqWeightedAverage(items = [], selector = (item) => item, weightSelector = () => 1) {
  const validItems = (items || [])
    .map((item, index) => {
      const rawValue = selector(item, index);
      return {
        value: rawValue == null || rawValue === "" ? null : Number(rawValue),
        weight: Math.max(0, Number(weightSelector(item, index)) || 0),
      };
    })
    .filter((item) => Number.isFinite(item.value) && item.weight > 0);
  const totalWeight = validItems.reduce((sum, item) => sum + item.weight, 0);
  if (!validItems.length || totalWeight <= 0) return null;
  return validItems.reduce((sum, item) => sum + item.value * (item.weight / totalWeight), 0);
}

function getFantasyIqTeamByCode(teamCode) {
  const code = String(teamCode || "").trim().toUpperCase();
  return PREMIER_LEAGUE_TEAMS.find((team) => getTeamCode(team) === code) || "";
}

function getFantasyIqPlayerContributionWeight(player) {
  if (player?.squadRole === "starter") return FANTASY_IQ_SCORE_CONFIG.squadContributionWeights.starter;
  if (player?.position === "GK") return FANTASY_IQ_SCORE_CONFIG.squadContributionWeights.benchGoalkeeper;
  return FANTASY_IQ_SCORE_CONFIG.squadContributionWeights.benchOutfield;
}

function getFantasyIqPlayerPriceTenths(player = {}) {
  const candidates = [
    player.priceTenths,
    player.nowCost,
    player.externalMetadata?.nowCost,
    player.externalMetadata?.now_cost,
  ];
  for (const value of candidates) {
    const number = Number(value);
    if (Number.isFinite(number) && number > 0) return Math.round(number);
  }
  const price = Number(player.price ?? player.cost ?? player.externalMetadata?.price);
  return Number.isFinite(price) && price > 0 ? Math.round(price * 10) : null;
}

function getFantasyIqPlayerPrice(player = {}) {
  const tenths = getFantasyIqPlayerPriceTenths(player);
  return tenths == null ? null : tenths / 10;
}

function getFantasyIqSquadBudgetSummary(players = []) {
  const pricedPlayers = (players || [])
    .map((player) => getFantasyIqPlayerPriceTenths(player))
    .filter((priceTenths) => priceTenths != null);
  const totalTenths = pricedPlayers.reduce((sum, priceTenths) => sum + priceTenths, 0);
  const budgetLimit = FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.budget;
  return {
    budgetLimit,
    pricedPlayerCount: pricedPlayers.length,
    totalPlayers: (players || []).length,
    totalCost: pricedPlayers.length ? totalTenths / 10 : null,
    remaining: pricedPlayers.length === (players || []).length ? budgetLimit - totalTenths / 10 : null,
    complete: pricedPlayers.length === (players || []).length,
  };
}

function formatFantasyIqBudget(value) {
  return Number.isFinite(Number(value)) ? `£${Number(value).toFixed(1)}m` : "NA";
}

const FANTASY_KIT_STYLES_BY_TEAM = {
  ARS: { primary: "#D71920", secondary: "#F8FAFC", text: "#FFFFFF", pattern: "sleeves" },
  AVL: { primary: "#7A003C", secondary: "#95BFE5", text: "#FFFFFF", pattern: "sleeves" },
  BOU: { primary: "#D71920", secondary: "#111827", text: "#FFFFFF", pattern: "stripes" },
  BRE: { primary: "#E30613", secondary: "#FFFFFF", text: "#111827", pattern: "stripes" },
  BHA: { primary: "#0057B8", secondary: "#FFFFFF", text: "#FFFFFF", pattern: "stripes" },
  BUR: { primary: "#6C1D45", secondary: "#99D6EA", text: "#FFFFFF", pattern: "sleeves" },
  CHE: { primary: "#034694", secondary: "#1D4ED8", text: "#FFFFFF", pattern: "solid" },
  CRY: { primary: "#1B458F", secondary: "#C4122E", text: "#FFFFFF", pattern: "stripes" },
  EVE: { primary: "#003399", secondary: "#FFFFFF", text: "#FFFFFF", pattern: "solid" },
  FUL: { primary: "#F8FAFC", secondary: "#111827", text: "#111827", pattern: "sleeves" },
  IPS: { primary: "#1D4ED8", secondary: "#F8FAFC", text: "#FFFFFF", pattern: "solid" },
  LEE: { primary: "#F8FAFC", secondary: "#1D4ED8", text: "#1D4ED8", pattern: "solid" },
  LEI: { primary: "#0053A0", secondary: "#FDBE11", text: "#FFFFFF", pattern: "solid" },
  LIV: { primary: "#C8102E", secondary: "#B91C1C", text: "#FFFFFF", pattern: "solid" },
  MCI: { primary: "#6CABDD", secondary: "#FFFFFF", text: "#1F2937", pattern: "sash" },
  MUN: { primary: "#DA291C", secondary: "#111827", text: "#FFFFFF", pattern: "solid" },
  NEW: { primary: "#111827", secondary: "#FFFFFF", text: "#FFFFFF", pattern: "stripes" },
  NFO: { primary: "#DD0000", secondary: "#F8FAFC", text: "#FFFFFF", pattern: "solid" },
  SUN: { primary: "#E30613", secondary: "#FFFFFF", text: "#111827", pattern: "stripes" },
  TOT: { primary: "#F8FAFC", secondary: "#132257", text: "#132257", pattern: "solid" },
  WHU: { primary: "#7A263A", secondary: "#1BB1E7", text: "#FFFFFF", pattern: "sleeves" },
  WOL: { primary: "#FDB913", secondary: "#111827", text: "#111827", pattern: "solid" },
  HUL: { primary: "#F59E0B", secondary: "#111827", text: "#111827", pattern: "stripes" },
  COV: { primary: "#75C9E8", secondary: "#FFFFFF", text: "#1F2937", pattern: "stripes" },
  XI: { primary: "#64748B", secondary: "#94A3B8", text: "#FFFFFF", pattern: "solid" },
  BEN: { primary: "#475569", secondary: "#94A3B8", text: "#FFFFFF", pattern: "solid" },
};

function getFantasyKitStyle(player = {}) {
  const teamCode = String(player.teamCode || "").trim().toUpperCase();
  return {
    teamCode: teamCode || "TBC",
    ...(FANTASY_KIT_STYLES_BY_TEAM[teamCode] || {
      primary: "#64748B",
      secondary: "#94A3B8",
      text: "#FFFFFF",
      pattern: "solid",
    }),
  };
}

function getFantasyIqPlayerValueScore(player = {}) {
  const playerScore = Number(player.fantasyIqScore);
  const price = getFantasyIqPlayerPrice(player);
  if (!Number.isFinite(playerScore) || !Number.isFinite(price)) return null;
  const positionBands = {
    GK: { budget: 4.0, premium: 5.8 },
    DEF: { budget: 4.0, premium: 7.2 },
    MID: { budget: 4.5, premium: 13.5 },
    FWD: { budget: 4.5, premium: 14.0 },
  };
  const band = positionBands[player.position] || { budget: 4.5, premium: 12.0 };
  const priceRatio = clampNumber((price - band.budget) / Math.max(0.1, band.premium - band.budget), 0, 1);
  const expectedScoreForPrice = 45 + priceRatio * 35;
  return clampFantasyIqScore(65 + (playerScore - expectedScoreForPrice) * 1.25);
}

function getFantasyIqPredictionGoalScore(goals, attacking = true) {
  const mapping = attacking
    ? FANTASY_IQ_SCORE_CONFIG.userPredictionMappings.predictedGoals
    : FANTASY_IQ_SCORE_CONFIG.userPredictionMappings.predictedConceded;
  const index = Math.min(mapping.length - 1, Math.max(0, Math.floor(Number(goals) || 0)));
  return mapping[index];
}

export function buildFantasyIqClubOutlooks(fixtures = [], results = {}, context = {}, options = {}) {
  const horizon = Math.max(1, Math.round(Number(options.horizon) || 3));
  const fixtureWeights = options.weights || getPremierLeagueFixtureWeights(horizon);
  return PREMIER_LEAGUE_TEAMS.reduce((out, team) => {
    const teamCode = getTeamCode(team);
    const normalizedTeam = normalizeTeamName(team);
    const upcoming = (fixtures || [])
      .filter((fixture) => {
        const isTeamFixture =
          normalizeTeamName(fixture.homeTeam) === normalizedTeam ||
          normalizeTeamName(fixture.awayTeam) === normalizedTeam;
        return isTeamFixture && !isFixtureCompleted(fixture, results);
      })
      .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
      .slice(0, horizon)
      .map((fixture) => {
        const isHome = normalizeTeamName(fixture.homeTeam) === normalizedTeam;
        const opponent = isHome ? fixture.awayTeam : fixture.homeTeam;
        const model = buildFixtureModel(fixture, context);
        const expectedPoints = isHome ? model.homeExpectedPoints : model.awayExpectedPoints;
        const winProbability = isHome ? model.homeProb : model.awayProb;
        const lossProbability = isHome ? model.awayProb : model.homeProb;
        const expectedGoals = isHome ? model.homeExpectedGoals : model.awayExpectedGoals;
        const cleanSheetProbability = isHome ? model.homeCleanSheetProb : model.awayCleanSheetProb;
        const scoreTwoPlusProbability = isHome ? model.homeScoreTwoPlusProb : model.awayScoreTwoPlusProb;
        const difficultyScore = isHome ? model.homeDifficultyScore : model.awayDifficultyScore;
        const attackDifficultyScore = isHome ? model.homeAttackDifficultyScore : model.awayAttackDifficultyScore;
        const defenceDifficultyScore = isHome ? model.homeDefenceDifficultyScore : model.awayDefenceDifficultyScore;

        return {
          fixtureId: fixture.id,
          gameweek: fixture.gameweek,
          venue: isHome ? "H" : "A",
          opponent,
          opponentCode: getTeamCode(opponent),
          expectedPoints,
          winProbability,
          drawProbability: model.drawProb,
          lossProbability,
          expectedGoals,
          cleanSheetProbability,
          scoreTwoPlusProbability,
          difficultyScore,
          attackDifficultyScore,
          defenceDifficultyScore,
          confidence: model.confidence,
          confidenceScore: model.confidenceScore,
          overallScore:
            fantasyIqExpectedPointsToScore(expectedPoints) * FANTASY_IQ_SCORE_CONFIG.clubFixtureWeights.overallExpectedPoints +
            fantasyIqDifficultyToScore(difficultyScore) * FANTASY_IQ_SCORE_CONFIG.clubFixtureWeights.overallDifficulty,
          attackScore:
            fantasyIqExpectedGoalsToScore(expectedGoals) * FANTASY_IQ_SCORE_CONFIG.clubFixtureWeights.attackExpectedGoals +
            fantasyIqProbabilityToScore(scoreTwoPlusProbability) * FANTASY_IQ_SCORE_CONFIG.clubFixtureWeights.attackScoreTwoPlus +
            fantasyIqDifficultyToScore(attackDifficultyScore) * FANTASY_IQ_SCORE_CONFIG.clubFixtureWeights.attackDifficulty,
          defenceScore:
            fantasyIqProbabilityToScore(cleanSheetProbability) * FANTASY_IQ_SCORE_CONFIG.clubFixtureWeights.defenceCleanSheet +
            fantasyIqDifficultyToScore(defenceDifficultyScore) * FANTASY_IQ_SCORE_CONFIG.clubFixtureWeights.defenceDifficulty,
        };
      });
    const weights = fixtureWeights.slice(0, upcoming.length);
    const fixtureWeight = (_, index) => weights[index] || 0;

    out[teamCode] = {
      team,
      teamCode,
      fixtures: upcoming,
      fixtureCount: upcoming.length,
      overallScore: getFantasyIqWeightedAverage(upcoming, (fixture) => fixture.overallScore, fixtureWeight),
      attackScore: getFantasyIqWeightedAverage(upcoming, (fixture) => fixture.attackScore, fixtureWeight),
      defenceScore: getFantasyIqWeightedAverage(upcoming, (fixture) => fixture.defenceScore, fixtureWeight),
      expectedGoals: getFantasyIqWeightedAverage(upcoming, (fixture) => fixture.expectedGoals, fixtureWeight),
      cleanSheetProbability: getFantasyIqWeightedAverage(upcoming, (fixture) => fixture.cleanSheetProbability, fixtureWeight),
      scoreTwoPlusProbability: getFantasyIqWeightedAverage(upcoming, (fixture) => fixture.scoreTwoPlusProbability, fixtureWeight),
      winProbability: getFantasyIqWeightedAverage(upcoming, (fixture) => fixture.winProbability, fixtureWeight),
      confidenceScore: getFantasyIqWeightedAverage(upcoming, (fixture) => fixture.confidenceScore, fixtureWeight),
    };
    return out;
  }, {});
}

function buildOfficialFplFixtureOutlooks(playerDataset = {}, options = {}) {
  const horizon = Math.max(1, Math.round(Number(options.horizon) || 5));
  const officialFixtures = Array.isArray(playerDataset?.officialFixtures) ? playerDataset.officialFixtures : [];
  const rows = {};
  officialFixtures
    .filter((fixture) => !fixture.finished && !fixture.started)
    .sort((a, b) => {
      const aTime = Date.parse(a.kickoff || "");
      const bTime = Date.parse(b.kickoff || "");
      if (Number.isFinite(aTime) && Number.isFinite(bTime)) return aTime - bTime;
      if (Number.isFinite(aTime)) return -1;
      if (Number.isFinite(bTime)) return 1;
      return Number(a.gameweek || 0) - Number(b.gameweek || 0);
    })
    .forEach((fixture) => {
      [
        {
          teamCode: fixture.homeTeamCode,
          opponentCode: fixture.awayTeamCode,
          opponent: fixture.awayTeamName,
          venue: "H",
          difficultyScore: fixture.homeDifficulty,
        },
        {
          teamCode: fixture.awayTeamCode,
          opponentCode: fixture.homeTeamCode,
          opponent: fixture.homeTeamName,
          venue: "A",
          difficultyScore: fixture.awayDifficulty,
        },
      ].forEach((side) => {
        const teamCode = String(side.teamCode || "").toUpperCase();
        if (!teamCode) return;
        if (!rows[teamCode]) rows[teamCode] = { teamCode, fixtures: [] };
        if (rows[teamCode].fixtures.length >= horizon) return;
        rows[teamCode].fixtures.push({
          fixtureId: fixture.id,
          gameweek: fixture.gameweek,
          kickoff: fixture.kickoff,
          venue: side.venue,
          opponent: side.opponent,
          opponentCode: side.opponentCode,
          difficultyScore: side.difficultyScore,
          officialDifficultyScore: side.difficultyScore,
          difficultySource: "official-fpl-fdr",
          provisionalStartTime: fixture.provisionalStartTime,
        });
      });
    });
  return rows;
}

function mergeFantasyIqOfficialFixtureOutlooks(modelOutlooks = {}, officialOutlooks = {}) {
  const merged = { ...(modelOutlooks || {}) };
  Object.entries(officialOutlooks || {}).forEach(([teamCode, officialOutlook]) => {
    const modelOutlook = merged[teamCode] || { teamCode };
    const modelFixtures = Array.isArray(modelOutlook.fixtures) ? modelOutlook.fixtures : [];
    const officialFixtures = Array.isArray(officialOutlook.fixtures) ? officialOutlook.fixtures : [];
    merged[teamCode] = {
      ...modelOutlook,
      fixtures: modelFixtures.length
        ? modelFixtures.map((fixture, index) => ({
            ...fixture,
            fixtureId: officialFixtures[index]?.fixtureId ?? fixture.fixtureId,
            gameweek: officialFixtures[index]?.gameweek ?? fixture.gameweek,
            kickoff: officialFixtures[index]?.kickoff ?? fixture.kickoff,
            venue: officialFixtures[index]?.venue ?? fixture.venue,
            opponent: officialFixtures[index]?.opponent ?? fixture.opponent,
            opponentCode: officialFixtures[index]?.opponentCode ?? fixture.opponentCode,
            officialDifficultyScore: officialFixtures[index]?.officialDifficultyScore ?? null,
            difficultySource: officialFixtures[index]?.difficultySource || fixture.difficultySource || null,
          }))
        : officialFixtures,
      officialFixtures,
    };
  });
  return merged;
}

function buildFantasyIqPredictionOutlooks(fixtures = [], predictions = {}, selectedGameweek = null) {
  const getPred = (fixtureId) =>
    predictions[String(fixtureId)] !== undefined ? predictions[String(fixtureId)] : predictions[fixtureId];
  const teamRows = {};
  PREMIER_LEAGUE_TEAMS.forEach((team) => {
    teamRows[getTeamCode(team)] = {
      team,
      teamCode: getTeamCode(team),
      fixtures: [],
      predictionCount: 0,
      attackScore: null,
      defenceScore: null,
      resultScore: null,
      overallScore: null,
    };
  });

  const upcomingFixtures = (fixtures || [])
    .filter((fixture) => !selectedGameweek || fixture.gameweek >= selectedGameweek)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));

  upcomingFixtures.forEach((fixture) => {
    const pred = getPred(fixture.id);
    if (!pred) return;
    const homeGoals = Number(pred.homeGoals);
    const awayGoals = Number(pred.awayGoals);
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return;

    [
      { team: fixture.homeTeam, forGoals: homeGoals, againstGoals: awayGoals },
      { team: fixture.awayTeam, forGoals: awayGoals, againstGoals: homeGoals },
    ].forEach((row) => {
      const teamCode = getTeamCode(row.team);
      const target = teamRows[teamCode];
      if (!target || target.fixtures.length >= 3) return;
      const resultScore =
        row.forGoals > row.againstGoals
          ? FANTASY_IQ_SCORE_CONFIG.userPredictionMappings.win
          : row.forGoals === row.againstGoals
          ? FANTASY_IQ_SCORE_CONFIG.userPredictionMappings.draw
          : FANTASY_IQ_SCORE_CONFIG.userPredictionMappings.loss;
      target.fixtures.push({
        fixtureId: fixture.id,
        gameweek: fixture.gameweek,
        predictedFor: row.forGoals,
        predictedAgainst: row.againstGoals,
        attackScore: getFantasyIqPredictionGoalScore(row.forGoals, true),
        defenceScore: getFantasyIqPredictionGoalScore(row.againstGoals, false),
        resultScore,
      });
    });
  });

  Object.values(teamRows).forEach((row) => {
    const weights = PREMIER_LEAGUE_MODEL_CONFIG.nextThreeFixtureWeights.slice(0, row.fixtures.length);
    const fixtureWeight = (_, index) => weights[index] || 0;
    row.predictionCount = row.fixtures.length;
    row.attackScore = getFantasyIqWeightedAverage(row.fixtures, (fixture) => fixture.attackScore, fixtureWeight);
    row.defenceScore = getFantasyIqWeightedAverage(row.fixtures, (fixture) => fixture.defenceScore, fixtureWeight);
    row.resultScore = getFantasyIqWeightedAverage(row.fixtures, (fixture) => fixture.resultScore, fixtureWeight);
    row.overallScore = getFantasyIqWeightedAverage(
      [row.attackScore, row.defenceScore, row.resultScore].filter((value) => value != null),
      (value) => value
    );
  });

  return teamRows;
}

function getFantasyIqPlayerOutlook(player, clubOutlook) {
  const weights = FANTASY_IQ_SCORE_CONFIG.positionOutlookWeights[player?.position] || { overall: 1 };
  const weightedScores = Object.entries(weights).map(([key, weight]) => ({
    weight,
    value:
      key === "attack"
        ? clubOutlook?.attackScore
        : key === "defence"
        ? clubOutlook?.defenceScore
        : clubOutlook?.overallScore,
  }));
  const score = getFantasyIqWeightedAverage(weightedScores, (item) => item.value, (item) => item.weight);
  const playerAdjustedScore = blendFantasyIqPlayerLevelScores(score, player);
  const playerAdjustedOverall = blendFantasyIqPlayerLevelScores(clubOutlook?.overallScore, player);
  const playerAdjustedAttack = blendFantasyIqPlayerLevelScores(clubOutlook?.attackScore, player);
  const playerAdjustedDefence = blendFantasyIqPlayerLevelScores(clubOutlook?.defenceScore, player, { usePremium: !["GK", "DEF"].includes(player?.position) });
  const availabilityAdjustedScore = applyFantasyIqPlayerAvailability(player, playerAdjustedScore);
  const availabilityAdjustedOverall = applyFantasyIqPlayerAvailability(player, playerAdjustedOverall);
  const availabilityAdjustedAttack = applyFantasyIqPlayerAvailability(player, playerAdjustedAttack);
  const availabilityAdjustedDefence = applyFantasyIqPlayerAvailability(player, playerAdjustedDefence);
  return {
    score: availabilityAdjustedScore,
    rawScore: score,
    overallScore: availabilityAdjustedOverall,
    attackScore: availabilityAdjustedAttack,
    defenceScore: availabilityAdjustedDefence,
    rawOverallScore: clubOutlook?.overallScore ?? null,
    rawAttackScore: clubOutlook?.attackScore ?? null,
    rawDefenceScore: clubOutlook?.defenceScore ?? null,
    availabilityMultiplier: getFantasyIqAvailabilityMultiplier(player),
    formScore: getFantasyIqPlayerFormScore(player),
    starterLikelihoodScore: getFantasyIqPlayerStarterLikelihoodScore(player),
    premiumScore: getFantasyIqPlayerPremiumScore(player),
    nextFixture: clubOutlook?.fixtures?.[0] || null,
  };
}

export function buildFantasyIqScoredReport({
  squad = createEmptyFantasyIqSquad(),
  validation = validateFantasyIqSquad(squad),
  clubOutlooks = {},
  predictionOutlooks = {},
  playerDataStatus = null,
} = {}) {
  const report = createEmptyFantasyIqReport();
  report.playerDataStatus = playerDataStatus;
  const normalisedSquad = normaliseFantasyIqSquad(squad);
  const players = normalisedSquad.players || [];

  if (!normalisedSquad.confirmed) {
    report.confidence = "locked";
    report.recommendations.push("Confirm a valid 15-player squad to unlock model-based Fantasy IQ scoring.");
    return report;
  }
  if (!validation?.isValid) {
    report.confidence = "locked";
    report.concerns = validation?.errors || [];
    report.recommendations.push("Fix the squad validation issues before using Fantasy IQ scoring.");
    return report;
  }

  const enrichedPlayers = players.map((player) => {
    const clubOutlook = clubOutlooks[player.teamCode] || {};
    const predictionOutlook = predictionOutlooks[player.teamCode] || {};
    const playerOutlook = getFantasyIqPlayerOutlook(player, clubOutlook);
    return {
      ...player,
      clubOutlook,
      predictionOutlook,
      fantasyIqScore: playerOutlook.score,
      fantasyIqRawScore: playerOutlook.rawScore,
      fantasyIqOverallScore: playerOutlook.overallScore,
      fantasyIqAttackScore: playerOutlook.attackScore,
      fantasyIqDefenceScore: playerOutlook.defenceScore,
      fantasyIqAvailabilityMultiplier: playerOutlook.availabilityMultiplier,
      fantasyIqFormScore: playerOutlook.formScore,
      fantasyIqStarterLikelihoodScore: playerOutlook.starterLikelihoodScore,
      fantasyIqPremiumScore: playerOutlook.premiumScore,
      nextFixture: playerOutlook.nextFixture,
      contributionWeight: getFantasyIqPlayerContributionWeight(player),
    };
  });
  const starters = enrichedPlayers.filter((player) => player.squadRole === "starter");
  const bench = enrichedPlayers.filter((player) => player.squadRole === "bench");
  const modelScoredPlayers = enrichedPlayers.filter((player) => player.fantasyIqScore != null);
  const attackers = starters.filter((player) => ["MID", "FWD"].includes(player.position));
  const defenders = starters.filter((player) => ["GK", "DEF"].includes(player.position));
  const captain = enrichedPlayers.find((player) => player.id === normalisedSquad.captainPlayerId || player.isCaptain);
  const viceCaptain = enrichedPlayers.find((player) => player.id === normalisedSquad.viceCaptainPlayerId || player.isViceCaptain);
  const selectedClubCodes = Array.from(new Set(enrichedPlayers.map((player) => player.teamCode).filter(Boolean)));
  const uniqueClubOutlooks = selectedClubCodes.map((teamCode) => clubOutlooks[teamCode]).filter(Boolean);
  const unmatchedFixtureClubCodes = selectedClubCodes.filter((teamCode) => {
    const outlook = clubOutlooks[teamCode];
    return !outlook || !outlook.fixtureCount;
  });

  const playerFixtureAverage = getFantasyIqWeightedAverage(
    enrichedPlayers,
    (player) => player.fantasyIqScore,
    (player) => player.contributionWeight
  );
  const uniqueClubFixtureAverage = getFantasyIqWeightedAverage(uniqueClubOutlooks, (outlook) => outlook.overallScore);
  report.categories.fixtureOutlook = spreadFantasyIqScore(
    getFantasyIqWeightedAverage(
      [
        { value: playerFixtureAverage, weight: FANTASY_IQ_SCORE_CONFIG.fixtureOutlookWeights.playerAverage },
        { value: uniqueClubFixtureAverage, weight: FANTASY_IQ_SCORE_CONFIG.fixtureOutlookWeights.uniqueClubAverage },
      ],
      (item) => item.value,
      (item) => item.weight
    ),
    FANTASY_IQ_SCORE_CONFIG.sensitivity.fixtureCategorySpread
  );

  report.categories.attackOutlook = spreadFantasyIqScore(
    getFantasyIqWeightedAverage(
      attackers,
      (player) => {
        const positionBoost = player.position === "FWD" ? 1.05 : 1;
        const score = player.fantasyIqAttackScore ?? player.fantasyIqScore;
        return score == null ? null : score * positionBoost;
      },
      (player) => player.contributionWeight
    ),
    FANTASY_IQ_SCORE_CONFIG.sensitivity.fixtureCategorySpread
  );

  report.categories.defenceOutlook = spreadFantasyIqScore(
    getFantasyIqWeightedAverage(
      defenders,
      (player) => player.fantasyIqDefenceScore ?? player.fantasyIqScore,
      (player) => player.contributionWeight
    ),
    FANTASY_IQ_SCORE_CONFIG.sensitivity.fixtureCategorySpread
  );

  const captainScore = captain
    ? getFantasyIqWeightedAverage(
        [
          { value: captain.fantasyIqScore, weight: 0.65 },
          { value: captain.fantasyIqAttackScore, weight: ["MID", "FWD"].includes(captain.position) ? 0.25 : 0.1 },
          { value: captain.predictionOutlook?.overallScore, weight: 0.1 },
        ],
        (item) => item.value,
        (item) => item.weight
      )
    : null;
  const viceCaptainScore = viceCaptain
    ? getFantasyIqWeightedAverage(
        [
          { value: viceCaptain.fantasyIqScore, weight: 0.75 },
          { value: viceCaptain.predictionOutlook?.overallScore, weight: 0.25 },
        ],
        (item) => item.value,
        (item) => item.weight
      )
    : null;
  report.categories.captaincyOutlook = spreadFantasyIqScore(
    getFantasyIqWeightedAverage(
      [
        { value: captainScore, weight: FANTASY_IQ_SCORE_CONFIG.captaincyWeights.captain },
        { value: viceCaptainScore, weight: FANTASY_IQ_SCORE_CONFIG.captaincyWeights.viceCaptain },
      ],
      (item) => item.value,
      (item) => item.weight
    ),
    FANTASY_IQ_SCORE_CONFIG.sensitivity.fixtureCategorySpread
  );

  const starterPositionCounts = validation.summary?.starterPositionCounts || {};
  const formationScore =
    (starterPositionCounts.GK || 0) === 1 &&
    (starterPositionCounts.DEF || 0) >= 3 &&
    (starterPositionCounts.MID || 0) >= 2 &&
    (starterPositionCounts.FWD || 0) >= 1
      ? 100
      : 45;
  const clubCounts = validation.summary?.clubCounts || {};
  const overStackPenalty = Object.values(clubCounts).reduce(
    (sum, count) => sum + Math.max(0, Number(count || 0) - 2) * 10,
    0
  );
  const starterClubCount = new Set(starters.map((player) => player.teamCode).filter(Boolean)).size;
  const clubDiversificationScore = clampFantasyIqScore(70 + starterClubCount * 3 - overStackPenalty);
  const starterCoverageScore = clampFantasyIqScore((starters.length / FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.starters) * 100);
  const benchCoverScore = clampFantasyIqScore(
    (new Set(bench.map((player) => player.position).filter(Boolean)).size / Math.min(4, FANTASY_IQ_POSITIONS.length)) * 100
  );
  const budgetSummary = validation.summary?.budget || getFantasyIqSquadBudgetSummary(enrichedPlayers);
  const playerValueAverage = getFantasyIqWeightedAverage(
    enrichedPlayers,
    (player) => getFantasyIqPlayerValueScore(player),
    (player) => player.contributionWeight
  );
  const budgetLegalityScore =
    budgetSummary.complete && Number(budgetSummary.totalCost || 0) > FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.budget
      ? 0
      : budgetSummary.complete
      ? 100
      : 70;
  const valueEfficiencyScore = clampFantasyIqScore(
    getFantasyIqWeightedAverage(
      [
        { value: playerValueAverage, weight: 0.8 },
        { value: budgetLegalityScore, weight: 0.2 },
      ],
      (item) => item.value,
      (item) => item.weight
    ) ?? budgetLegalityScore
  );
  report.budget = {
    ...budgetSummary,
    valueEfficiencyScore,
  };
  report.categories.squadBalance = spreadFantasyIqScore(
    formationScore * FANTASY_IQ_SCORE_CONFIG.squadBalanceWeights.formation +
      clubDiversificationScore * FANTASY_IQ_SCORE_CONFIG.squadBalanceWeights.clubDiversification +
      starterCoverageScore * FANTASY_IQ_SCORE_CONFIG.squadBalanceWeights.starterCoverage +
      benchCoverScore * FANTASY_IQ_SCORE_CONFIG.squadBalanceWeights.benchCover +
      valueEfficiencyScore * FANTASY_IQ_SCORE_CONFIG.squadBalanceWeights.valueEfficiency,
    FANTASY_IQ_SCORE_CONFIG.sensitivity.structuralCategorySpread
  );

  const predictedPlayers = enrichedPlayers.filter((player) => player.predictionOutlook?.predictionCount);
  if (predictedPlayers.length) {
    const starterPredictionScore = getFantasyIqWeightedAverage(
      starters.filter((player) => player.predictionOutlook?.predictionCount),
      (player) => {
        if (["GK", "DEF"].includes(player.position)) return player.predictionOutlook.defenceScore;
        return player.predictionOutlook.attackScore;
      },
      (player) => player.contributionWeight
    );
    const captainPredictionScore = getFantasyIqWeightedAverage(
      [captain, viceCaptain].filter((player) => player?.predictionOutlook?.predictionCount),
      (player) => player.predictionOutlook.overallScore,
      (player) => (player?.id === captain?.id ? 0.75 : 0.25)
    );
    const squadPredictionScore = getFantasyIqWeightedAverage(
      predictedPlayers,
      (player) => player.predictionOutlook.overallScore,
      (player) => player.contributionWeight
    );
    report.categories.predictionAlignment = spreadFantasyIqScore(
      getFantasyIqWeightedAverage(
        [
          { value: starterPredictionScore, weight: FANTASY_IQ_SCORE_CONFIG.predictionAlignmentWeights.starters },
          { value: captainPredictionScore, weight: FANTASY_IQ_SCORE_CONFIG.predictionAlignmentWeights.captains },
          { value: squadPredictionScore, weight: FANTASY_IQ_SCORE_CONFIG.predictionAlignmentWeights.squad },
        ],
        (item) => item.value,
        (item) => item.weight
      ),
      FANTASY_IQ_SCORE_CONFIG.sensitivity.fixtureCategorySpread
    );
  }

  const benchOutlookScore = getFantasyIqWeightedAverage(
    bench,
    (player) => player.fantasyIqScore,
    (player) => (player.position === "GK" ? 0.75 : 1)
  );
  report.categories.benchStrength = spreadFantasyIqScore(
    getFantasyIqWeightedAverage(
      [
        { value: benchOutlookScore, weight: FANTASY_IQ_SCORE_CONFIG.benchStrengthWeights.benchOutlook },
        { value: benchCoverScore, weight: FANTASY_IQ_SCORE_CONFIG.benchStrengthWeights.benchCoverage },
      ],
      (item) => item.value,
      (item) => item.weight
    ),
    FANTASY_IQ_SCORE_CONFIG.sensitivity.structuralCategorySpread
  );

  const availableCategoryEntries = Object.entries(report.categories).filter(([, value]) => value != null);
  const availableWeightTotal = availableCategoryEntries.reduce(
    (sum, [key]) => sum + Number(FANTASY_IQ_SCORE_CONFIG[key] || 0),
    0
  );
  const hasEnoughFixtureEvidence = modelScoredPlayers.length >= FANTASY_IQ_SCORE_CONFIG.minimumScoredPlayersForOverall;
  report.overallScore = hasEnoughFixtureEvidence
    ? calibrateFantasyIqOverallScore(
        spreadFantasyIqScore(
          availableCategoryEntries.reduce(
            (sum, [key, value]) => sum + Number(value) * (Number(FANTASY_IQ_SCORE_CONFIG[key] || 0) / availableWeightTotal),
            0
          ),
          FANTASY_IQ_SCORE_CONFIG.sensitivity.overallSpread
        )
      )
    : null;

  const modelConfidenceAverage = getFantasyIqWeightedAverage(uniqueClubOutlooks, (outlook) => outlook.confidenceScore);
  const unresolvedCount = enrichedPlayers.filter((player) =>
    ["ambiguous", "unmatched", "legacy"].includes(player.reconciliationStatus)
  ).length;
  const usingFallbackData =
    playerDataStatus?.status === "fallback" ||
    playerDataStatus?.cacheStatus === "fallback" ||
    enrichedPlayers.some((player) => player.temporary || player.dataSource === "temporary-development-fallback");
  report.confidence =
    unresolvedCount || usingFallbackData
      ? "low"
      : (modelConfidenceAverage || 0) >= 70 && report.categories.predictionAlignment != null
      ? "high"
      : (modelConfidenceAverage || 0) >= 45
      ? "medium"
      : "low";
  if (playerDataStatus?.fallbackReason) report.confidenceReasons.push(playerDataStatus.fallbackReason);
  if (unresolvedCount) report.confidenceReasons.push(`${unresolvedCount} squad players require confirmation.`);
  if (!hasEnoughFixtureEvidence) {
    report.confidenceReasons.push(
      `Fixture model only matched ${modelScoredPlayers.length} of ${enrichedPlayers.length} squad players.`
    );
  }
  if (!usingFallbackData && !unresolvedCount && playerDataStatus?.status === "ready") {
    report.confidenceReasons.push("Official player data was successfully updated.");
  }

  const bestStarters = [...starters]
    .filter((player) => player.fantasyIqScore != null)
    .sort((a, b) => b.fantasyIqScore - a.fantasyIqScore)
    .slice(0, 2);
  const weakestStarters = [...starters]
    .filter((player) => player.fantasyIqScore != null)
    .sort((a, b) => a.fantasyIqScore - b.fantasyIqScore)
    .slice(0, 2);
  const benchUpside = bench.filter((player) => Number(player.fantasyIqScore || 0) >= 70);
  const flaggedAvailability = enrichedPlayers
    .filter(hasActionableFantasyAvailabilityRisk)
    .sort((a, b) => getFantasyIqPlayerContributionWeight(b) - getFantasyIqPlayerContributionWeight(a));

  if (bestStarters.length) {
    report.strengths.push(
      `Strongest starter outlook: ${bestStarters
        .map((player) => `${player.name} (${player.teamCode}, ${clampFantasyIqScore(player.fantasyIqScore)})`)
        .join(", ")}.`
    );
  }
  if (captain && captainScore != null) {
    report.strengths.push(
      `Captaincy model score: ${captain.name} ${clampFantasyIqScore(captainScore)}/100; vice ${viceCaptain?.name || "not set"} ${
        viceCaptainScore == null ? "NA" : `${clampFantasyIqScore(viceCaptainScore)}/100`
      }.`
    );
  }
  if (budgetSummary.totalCost != null) {
    const remaining = budgetSummary.remaining;
    report.strengths.push(
      `Budget-aware score: ${formatFantasyIqBudget(budgetSummary.totalCost)} used${
        remaining == null ? "" : `, ${formatFantasyIqBudget(remaining)} remaining`
      }; value efficiency ${valueEfficiencyScore}/100.`
    );
  }
  const strongestValues = [...enrichedPlayers]
    .map((player) => ({
      player,
      valueScore: getFantasyIqPlayerValueScore(player),
      price: getFantasyIqPlayerPrice(player),
    }))
    .filter((item) => item.valueScore != null && item.price != null)
    .sort((a, b) => b.valueScore - a.valueScore)
    .slice(0, 2);
  if (strongestValues.length) {
    report.recommendations.push(
      `Best value holds: ${strongestValues
        .map((item) => `${item.player.name} (${formatFantasyIqBudget(item.price)}, ${item.valueScore}/100 value)`)
        .join(", ")}.`
    );
  }
  if (weakestStarters.length) {
    report.concerns.push(
      `Lower starter outlook: ${weakestStarters
        .map((player) => `${player.name} (${player.teamCode}, ${clampFantasyIqScore(player.fantasyIqScore)})`)
        .join(", ")}.`
    );
  }
  if (!hasEnoughFixtureEvidence) {
    report.concerns.push("Fantasy IQ is locked until enough squad players can be matched to Premier League fixture outlooks.");
  }
  if (unmatchedFixtureClubCodes.length) {
    report.concerns.push(`Fixture outlook missing for: ${unmatchedFixtureClubCodes.slice(0, 6).join(", ")}.`);
  }
  if (flaggedAvailability.length) {
    report.concerns.push(
      `Availability risk: ${flaggedAvailability
        .slice(0, 3)
        .map((player) => {
          const chance = getFantasyAvailabilityChance(player);
          const chanceText = chance != null ? `, ${chance}% chance` : "";
          return `${player.name} (${getFantasyAvailabilityLabel(player)}${chanceText})`;
        })
        .join(", ")}.`
    );
  }
  if (report.categories.predictionAlignment == null) {
    report.concerns.push("Prediction alignment is locked until upcoming score predictions exist for your squad's clubs.");
  }
  if (benchUpside.length) {
    report.recommendations.push(
      `Review bench order: ${benchUpside
        .slice(0, 2)
        .map((player) => `${player.name} (${player.teamCode})`)
        .join(", ")} have favourable club/position outlooks.`
    );
  }
  if (weakestStarters.length) {
    report.recommendations.push("Use the lower starter outlook list as your first manual review queue before making transfers.");
  }

  report.transferPriority =
    report.overallScore == null
      ? "Locked"
      : report.overallScore >= 75
      ? "Low priority"
      : report.overallScore >= 60
      ? "Medium priority"
      : "High priority";
  report.predictionConflicts = enrichedPlayers
    .filter((player) => player.predictionOutlook?.predictionCount && player.fantasyIqScore != null)
    .filter((player) => Math.abs(Number(player.predictionOutlook.overallScore || 0) - Number(player.fantasyIqScore || 0)) >= 28)
    .slice(0, 3)
    .map((player) => ({
      playerId: player.id,
      label: `${player.name} (${player.teamCode})`,
      detail: "Your predicted scorelines and the model fixture outlook are pointing in different directions.",
    }));
  report.players = enrichedPlayers;
  report.diagnostics = {
    selectedClubs: selectedClubCodes.length,
    scoredPlayers: modelScoredPlayers.length,
    predictionPlayers: predictedPlayers.length,
    modelConfidenceAverage: modelConfidenceAverage == null ? null : clampFantasyIqScore(modelConfidenceAverage),
    unresolvedPlayerCount: unresolvedCount,
    playerDataSource: playerDataStatus?.source || null,
    availabilityRisks: flaggedAvailability.length,
    minimumScoredPlayersForOverall: FANTASY_IQ_SCORE_CONFIG.minimumScoredPlayersForOverall,
    unmatchedFixtureClubCodes,
  };

  return report;
}

// --- TEAM NAME NORMALISATION (kept from your version) ---
export function normalizeTeamName(name) {
  if (!name) return "";
  let s = name.toLowerCase().trim();

  if (s === "spurs" || s === "tottenham") s = "tottenham hotspur";
  if (s === "wolves" || s === "wolverhampton") s = "wolverhampton wanderers";
  if (s === "nott'm forest" || s === "nottm forest" || s === "nottingham")
    s = "nottingham forest";
  if (
    s === "man utd" ||
    s === "man u" ||
    s === "manchester utd" ||
    s === "manchester u" ||
    s === "mufc"
  )
    s = "manchester united";
  if (s === "leeds") s = "leeds united";
  if (s === "coventry") s = "coventry city";
  if (s === "hull") s = "hull city";
  if (s === "ipswich") s = "ipswich town";
  if (s === "west ham" || s === "whu" || s === "hammers")
    s = "west ham united";
  if (s === "aston villa" || s === "villa") s = "aston villa";
  if (s === "chelsea" || s === "cfc") s = "chelsea";
  if (s === "man city" || s === "mcfc") s = "manchester city";
  if (s === "bournemouth") s = "bournemouth";
  if (s === "brighton") s = "brighton & hove albion";
  if (s === "crystal palace" || s === "cpfc") s = "crystal palace";
  if (s === "newcastle" || s === "nufc") s = "newcastle united";
  if (s === "southampton") s = "southampton";
  if (s === "burnley" || s === "clarets") s = "burnley";
  if (s === "everton" || s === "efc") s = "everton";
  if (s === "fulham" || s === "ffc") s = "fulham";
  if (s === "brentford") s = "brentford";
  if (s === "leicester city" || s === "lcfc") s = "leicester city";

  s = s.replace(/football club/g, "");
  s = s.replace(/\bfc\b/g, "");
  s = s.replace(/\bafc\b/g, "");
  s = s.replace(/\butd\b/g, "united");
  s = s.replace(/[^a-z]/g, "");

  const aliasMap = {
    spurs: "tottenhamhotspur",
    tottenham: "tottenhamhotspur",
    tottenhamhotspur: "tottenhamhotspur",
    wolves: "wolverhamptonwanderers",
    wolverhampton: "wolverhamptonwanderers",
    wolverhamptonwanderers: "wolverhamptonwanderers",
    nottmforest: "nottinghamforest",
    nottinghamforest: "nottinghamforest",
    manutd: "manchesterunited",
    manunited: "manchesterunited",
    manchesterunited: "manchesterunited",
    leeds: "leedsunited",
    leedsunited: "leedsunited",
    coventry: "coventrycity",
    coventrycity: "coventrycity",
    hull: "hullcity",
    hullcity: "hullcity",
    ipswich: "ipswichtown",
    ipswichtown: "ipswichtown",
    westham: "westhamunited",
    whu: "westhamunited",
    hammers: "westhamunited",
    astonvilla: "astonvilla",
    villa: "astonvilla",
    chelsea: "chelsea",
    cfc: "chelsea",
    mancity: "manchestercity",
    mcfc: "manchestercity",
    bournemouth: "bournemouth",
    brighton: "brightonandhovealbion",
    brightonhove: "brightonandhovealbion",
    brightonhovealbion: "brightonandhovealbion",
    brightonandhove: "brightonandhovealbion",
    brightonandhovealbion: "brightonandhovealbion",
    hovealbion: "brightonandhovealbion",
    fulham: "fulham",
    brentford: "brentford",
    southampton: "southampton",
    burnley: "burnley",
    everton: "everton",
    leicester: "leicester",
    leicestercity: "leicestercity",
    bosniaherzegovina: "bosniaandherzegovina",
    bosniaandherzegovina: "bosniaandherzegovina",
    bosniah: "bosniaandherzegovina",
    bosniaherz: "bosniaandherzegovina",
    korearepublic: "southkorea",
    southkorea: "southkorea",
    usa: "unitedstates",
    unitedstates: "unitedstates",
    turkey: "turkiye",
    trkiye: "turkiye",
    turkiye: "turkiye",
    cotedivoire: "cotedivoire",
    coteivoire: "cotedivoire",
    ivorycoast: "cotedivoire",
    drcongo: "congodr",
    congodr: "congodr",
    capeverde: "caboverde",
    caboverde: "caboverde",
    capeverdeislands: "caboverde",
    iran: "iriran",
    iriran: "iriran",
    curacao: "curacao",
    curaao: "curacao",
  };

  if (aliasMap[s]) s = aliasMap[s];
  return s;
}

export function findFixtureForApiMatch(match, fixtures) {
  if (!match?.homeTeam || !match?.awayTeam || !Array.isArray(fixtures)) return null;

  let fixture = null;
  if (match.id != null) {
    fixture = fixtures.find((f) => Number(f.id) === Number(match.id)) || null;
  }

  if (fixture) return fixture;

  const apiHome = normalizeTeamName(match.homeTeam.name);
  const apiAway = normalizeTeamName(match.awayTeam.name);

  const candidates = fixtures.filter((f) => {
    const localHome = normalizeTeamName(
      typeof f.homeTeam === "string"
        ? f.homeTeam
        : (f.homeTeam?.name || f.homeTeam?.tla || "")
    );
    const localAway = normalizeTeamName(
      typeof f.awayTeam === "string"
        ? f.awayTeam
        : (f.awayTeam?.name || f.awayTeam?.tla || "")
    );
    return localHome === apiHome && localAway === apiAway;
  });

  if (!candidates.length) return null;

  const matchday = typeof match.matchday === "number" ? match.matchday : null;
  if (matchday != null) {
    fixture = candidates.find((f) => f.gameweek === matchday) || null;
  }

  if (!fixture && match.utcDate) {
    const matchTime = Date.parse(match.utcDate);
    if (Number.isFinite(matchTime)) {
      fixture = candidates.reduce((best, f) => {
        const t = Date.parse(f.kickoff);
        if (!Number.isFinite(t)) return best || f;
        const d = Math.abs(t - matchTime);
        if (!best) return f;
        const bd = Math.abs(Date.parse(best.kickoff) - matchTime);
        return d < bd ? f : best;
      }, null);
    }
  }

  return fixture || candidates[0] || null;
}

export function buildFixtureSyncPayload(matches, fixtures) {
  const updatedResults = {};
  const matchStateUpdates = {};
  const fixtureOverrides = {};
  let matchedCount = 0;

  (matches || []).forEach((match) => {
    if (!match?.homeTeam || !match?.awayTeam) return;

    const score = match.score || {};
    const selectedScore = getMatchScoreForPrediction(match);
    const ht = score.halfTime || {};
    const homeGoals = selectedScore.homeGoals;
    const awayGoals = selectedScore.awayGoals;

    const fixture = findFixtureForApiMatch(match, fixtures);
    if (!fixture) return;

    const confirmedHomeTeam = match.homeTeam?.name
      ? resolveWorldCupCountryName(match.homeTeam.name)
      : "";
    const confirmedAwayTeam = match.awayTeam?.name
      ? resolveWorldCupCountryName(match.awayTeam.name)
      : "";
    const shouldOverrideHomeTeam = Boolean(
      confirmedHomeTeam &&
        (fixture.knockoutStage || isPlaceholderTeamName(fixture.homeTeam))
    );
    const shouldOverrideAwayTeam = Boolean(
      confirmedAwayTeam &&
        (fixture.knockoutStage || isPlaceholderTeamName(fixture.awayTeam))
    );

    if (match.utcDate || shouldOverrideHomeTeam || shouldOverrideAwayTeam) {
      fixtureOverrides[fixture.id] = {
        ...(fixtureOverrides[fixture.id] || {}),
        ...(match.utcDate
          ? { kickoff: match.utcDate, kickoffTimeConfirmed: true }
          : {}),
        ...(shouldOverrideHomeTeam
          ? { homeTeam: confirmedHomeTeam }
          : {}),
        ...(shouldOverrideAwayTeam
          ? { awayTeam: confirmedAwayTeam }
          : {}),
      };
    }

    matchStateUpdates[fixture.id] = {
      status: String(match.status || ""),
      homeGoals,
      awayGoals,
      halfTimeHomeGoals: Number.isFinite(ht.home) ? ht.home : null,
      halfTimeAwayGoals: Number.isFinite(ht.away) ? ht.away : null,
      utcDate: match.utcDate || "",
      homeTeam: confirmedHomeTeam,
      awayTeam: confirmedAwayTeam,
    };

    if (homeGoals !== null && awayGoals !== null) {
      matchedCount += 1;
      updatedResults[fixture.id] = { homeGoals, awayGoals };
    }
  });

  return {
    updatedResults,
    matchStateUpdates,
    fixtureOverrides,
    matchedCount,
  };
}

export function mergeFixtureOverrides(currentOverrides = {}, incomingOverrides = {}) {
  const merged = { ...(currentOverrides || {}) };
  Object.entries(incomingOverrides || {}).forEach(([fixtureId, incoming]) => {
    merged[fixtureId] = {
      ...(merged[fixtureId] || {}),
      ...(incoming || {}),
    };
  });
  return merged;
}

function hasValidResultScore(result) {
  return hasNumericScoreValue(result?.homeGoals) && hasNumericScoreValue(result?.awayGoals);
}

function stripUnstartedResults(resultsByFixtureId = {}, matchStatesByFixtureId = {}) {
  const cleaned = {};
  Object.entries(resultsByFixtureId || {}).forEach(([fixtureId, result]) => {
    if (!hasValidResultScore(result)) return;
    const matchState = matchStatesByFixtureId?.[fixtureId] || matchStatesByFixtureId?.[Number(fixtureId)];
    if (matchState?.status && !hasStartedMatchStatus(matchState)) return;
    cleaned[fixtureId] = result;
  });
  return cleaned;
}

// --- API HELPERS ---
async function apiSignup(username, password, email = "", favoriteTeam = "") {
  const res = await fetch(`${BACKEND_BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password, email, favoriteTeam }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Signup failed.");
  return data;
}

async function apiLogin(username, password) {
  const res = await fetch(`${BACKEND_BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Login failed.");
  return data;
}

// Load latest results snapshot from backend (global source of truth)
async function apiGetResultsSnapshot() {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/results/snapshot`);
    if (!res.ok) return {};
    const data = await res.json().catch(() => ({}));
    return data && typeof data === "object" ? data : {};
  } catch {
    return {};
  }
}

async function apiGetMatchStatesSnapshot() {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/match-states/snapshot`);
    if (!res.ok) throw new Error("Match states fetch failed");
    return await res.json();
  } catch {
    return {};
  }
}

async function apiGetSeasonWinners() {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/history/season-winners`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return mergeSeasonWinnerRecords(
      [PREMIER_SEASON_WINNER_RECORD],
      Array.isArray(data) ? data : []
    );
  } catch {
    return [PREMIER_SEASON_WINNER_RECORD];
  }
}

async function apiSaveSeasonWinner(record, token = "") {
  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BACKEND_BASE}/api/history/season-winners`, {
      method: "POST",
      headers,
      body: JSON.stringify({ record }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

async function apiGetBadgeHistory() {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/history/badges`);
    if (!res.ok) return [];
    const data = await res.json().catch(() => []);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

async function apiSaveBadgeHistoryRecord(record, token = "") {
  try {
    const headers = { "Content-Type": "application/json" };
    if (token) headers.Authorization = `Bearer ${token}`;
    const res = await fetch(`${BACKEND_BASE}/api/history/badges`, {
      method: "POST",
      headers,
      body: JSON.stringify({ record }),
    });
    if (!res.ok) return null;
    const data = await res.json().catch(() => null);
    return Array.isArray(data) ? data : null;
  } catch {
    return null;
  }
}

// Save latest results snapshot to backend for coins leaderboard
async function apiSaveResultsSnapshot(resultsByFixtureId, matchStateByFixtureId = {}) {
  try {
    await fetch(`${BACKEND_BASE}/api/results/snapshot`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ resultsByFixtureId, matchStateByFixtureId }),
    });
  } catch {}
}
async function apiChangePassword(token, oldPassword, newPassword) {
  const res = await fetch(`${BACKEND_BASE}/api/change-password`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ oldPassword, newPassword }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || "Failed to change password.");
  }
  return data;
}

async function apiForgotPassword(username, email) {
  const res = await fetch(`${BACKEND_BASE}/api/password/forgot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to request password reset.");
  return data;
}

async function apiResetPassword(token, newPassword) {
  const res = await fetch(`${BACKEND_BASE}/api/password/reset`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, newPassword }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to reset password.");
  return data;
}

async function apiGetAccountMe(token) {
  const res = await fetch(`${BACKEND_BASE}/api/account/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load account.");
  return data;
}

async function apiSetAccountEmail(token, email) {
  const res = await fetch(`${BACKEND_BASE}/api/account/email`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to save email.");
  return data;
}

async function apiSetFavoriteTeam(token, favoriteTeam, mode = PREMIER_MODE) {
  const res = await fetch(`${BACKEND_BASE}/api/account/favorite-team`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ favoriteTeam, mode: getModeKey(mode) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to save favourite team.");
  return data;
}

async function apiGetPushPrefs(token) {
  const res = await fetch(`${BACKEND_BASE}/api/push/prefs`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load prefs.");
  return data.prefs || {};
}

async function apiSetPushPrefs(token, prefs) {
  const res = await fetch(`${BACKEND_BASE}/api/push/prefs`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(prefs || {}),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to save prefs.");
  return data;
}

async function apiGetFixturePushPrefs(token) {
  const res = await fetch(`${BACKEND_BASE}/api/push/fixtures`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load fixture notification prefs.");
  return data.fixturePrefs || {};
}

async function apiSetFixturePushPref(token, fixtureId, enabled) {
  const res = await fetch(`${BACKEND_BASE}/api/push/fixtures`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fixtureId, enabled }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to save fixture notification preference.");
  return data.fixturePrefs || {};
}

async function apiSendTestPush(token) {
  const res = await fetch(`${BACKEND_BASE}/api/push/test`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Test notification failed.");
  return data;
}

async function apiSendFixtureTestPush(token, fixtureId) {
  const res = await fetch(`${BACKEND_BASE}/api/push/fixture-test`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fixtureId }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Fixture notification test failed.");
  return data;
}

async function apiGetLivePushStatus(token) {
  const res = await fetch(`${BACKEND_BASE}/api/push/live-status`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load live notification status.");
  return data;
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function apiGetMyPredictions(token) {
  const res = await fetch(`${BACKEND_BASE}/api/predictions/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data.predictions || {};
}
async function apiGetLeaguePredictions(token, leagueId) {
  const res = await fetch(
    `${BACKEND_BASE}/api/predictions/league/${leagueId}`,
    {
      headers: { Authorization: `Bearer ${token}` },
    }
  );
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data; // { leagueId, users, predictionsByUserId }
}

async function apiGetAllPredictions(token) {
  const res = await fetch(`${BACKEND_BASE}/api/predictions/all`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to fetch global predictions.");
  return data; // { users, predictionsByUserId }
}
// eslint-disable-next-line no-unused-vars
async function apiSaveLeagueTotals(token, leagueId, payload) {
  const res = await fetch(`${BACKEND_BASE}/api/totals/league/${leagueId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return data;
}

async function apiSavePrediction(token, fixtureId, prediction) {
  const res = await fetch(`${BACKEND_BASE}/api/predictions/save`, {
    method: "POST",
    keepalive: true,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ fixtureId, prediction }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
  return true;
}

async function apiFetchMyLeagues(token, mode = PREMIER_MODE) {
  const res = await fetch(`${BACKEND_BASE}/api/leagues/my?mode=${encodeURIComponent(getModeKey(mode))}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load leagues.");
  return data.leagues || [];
}

async function apiGetMiniLeagueLeaderboard(token, mode = PREMIER_MODE) {
  const res = await fetch(`${BACKEND_BASE}/api/leagues/leaderboard?mode=${encodeURIComponent(getModeKey(mode))}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load mini-league leaderboard.");
  return data.leaderboard || [];
}

async function apiCreateLeague(token, name, mode = PREMIER_MODE) {
  const res = await fetch(`${BACKEND_BASE}/api/league/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name, mode: getModeKey(mode) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to create league.");
  return data.league || data;
}

async function apiJoinLeague(token, code, mode = PREMIER_MODE) {
  const res = await fetch(`${BACKEND_BASE}/api/league/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code, mode: getModeKey(mode) }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to join league.");
  return data.league || data;
}

// Results & Odds (unchanged)
// eslint-disable-next-line no-unused-vars
async function fetchCompetitionResults(mode = PREMIER_MODE) {
  let timeoutId = null;
  try {
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 30000);
    
    let res = await fetch(`${BACKEND_BASE}/api/results?mode=${encodeURIComponent(getModeKey(mode))}`, {
      signal: controller.signal
    });
    
    if (res.ok) {
      const updatedHeader = res.headers.get("x-results-updated");
      const matches = await res.json();
      const updatedAt = updatedHeader ? Number(updatedHeader) : null;
      if (Array.isArray(matches) && matches.length > 0) {
        return { matches, error: null, updatedAt, rateLimited: false, timedOut: false };
      }
      // If backend returns empty in Premier League mode, fall back to Netlify source
    }

    if (res.status === 429) {
      return { matches: [], error: null, updatedAt: null, rateLimited: true, timedOut: false };
    }

    if (mode === PREMIER_MODE) {
      // Fallback: hit Netlify function directly if backend can't fetch live results
      res = await fetch("https://predictionaddiction.net/.netlify/functions/results");
      if (!res.ok) return { matches: [], error: `HTTP ${res.status}`, rateLimited: false, timedOut: false };
      const matches = await res.json();
      return { matches, error: null, updatedAt: Date.now(), rateLimited: false, timedOut: false };
    }

    return { matches: [], error: `HTTP ${res.status}`, updatedAt: null, rateLimited: false, timedOut: false };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { matches: [], error: null, updatedAt: null, rateLimited: false, timedOut: true };
    }
    return { matches: [], error: err.message, updatedAt: null, rateLimited: false, timedOut: false };
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function fetchPremierLeagueStandings() {
  const attemptFetch = async (timeoutMs) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const res = await fetch(`${BACKEND_BASE}/api/standings`, {
        signal: controller.signal,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        return {
          table: [],
          error: data.error || `HTTP ${res.status}`,
          updatedAt: null,
          timedOut: false,
        };
      }

      const updatedHeader = res.headers.get("x-standings-updated");
      const standings = Array.isArray(data.standings) ? data.standings : [];
      const totalTable =
        standings.find((entry) => entry?.type === "TOTAL")?.table ||
        standings[0]?.table ||
        [];

      return {
        table: Array.isArray(totalTable) ? totalTable : [],
        error: null,
        updatedAt: updatedHeader ? Number(updatedHeader) : null,
        timedOut: false,
      };
    } catch (err) {
      if (err.name === "AbortError") {
        return {
          table: [],
          error: "Request timeout",
          updatedAt: null,
          timedOut: true,
        };
      }
      return {
        table: [],
        error: err.message,
        updatedAt: null,
        timedOut: false,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const first = await attemptFetch(20000);
  if (!first.timedOut) {
    return {
      table: first.table,
      error: first.error,
      updatedAt: first.updatedAt,
    };
  }

  const second = await attemptFetch(20000);
  return {
    table: second.table,
    error: second.error,
    updatedAt: second.updatedAt,
  };
}

// --- COINS GAME API HELPERS ---
async function apiGetMyCoins(token, gameweek, mode = PREMIER_MODE) {
  const gw = gameweek != null ? String(gameweek) : "";
  const url = `${BACKEND_BASE}/api/coins/my?gameweek=${encodeURIComponent(gw)}&mode=${encodeURIComponent(getModeKey(mode))}`;

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `HTTP ${res.status}`);
  }
  return {
    gameweek: data.gameweek,
    used: data.used ?? 0,
    remaining: data.remaining ?? 10,
    bets: data.bets || {},
  };
}

async function apiPlaceCoinsBet(token, payload) {
  // payload: { gameweek, fixtureId, side, stake, odds }
  const res = await fetch(`${BACKEND_BASE}/api/coins/place`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      ...(payload || {}),
      mode: getModeKey(payload?.mode || PREMIER_MODE),
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || data.message || `HTTP ${res.status}`);
  }

  return {
    gameweek: data.gameweek,
    used: data.used ?? 0,
    remaining: data.remaining ?? 10,
    bets: data.bets || {},
    currentBet: data.currentBet || null,
  };
}

// --- SCORING ---
function getResult(home, away) {
  if (home > away) return "H";
  if (home < away) return "A";
  return "D";
}

function getBasePoints(predHome, predAway, realHome, realAway) {
  if (
    predHome === null ||
    predAway === null ||
    realHome === null ||
    realAway === null
  )
    return 0;

  const ph = Number(predHome);
  const pa = Number(predAway);
  const rh = Number(realHome);
  const ra = Number(realAway);
  if ([ph, pa, rh, ra].some((n) => Number.isNaN(n))) return 0;

  if (ph === rh && pa === ra) return 7;
  const predRes = getResult(ph, pa);
  const realRes = getResult(rh, ra);
  if (predRes === realRes && ph - pa === rh - ra) return 4;
  if (predRes === realRes) return 2;
  return 0;
}

function getTotalPoints(pred, result) {
  if (!pred || !result) return 0;
  let total = getBasePoints(
    pred.homeGoals,
    pred.awayGoals,
    result.homeGoals,
    result.awayGoals
  );
  if (pred.isDouble) total *= 2;
  if (pred.isTriple) total *= 3;
  return total;
}

// --- DEADLINES ---
function isPredictionLocked(fixture) {
  const kickoff = new Date(fixture.kickoff).getTime();
  const deadline = fixture?.kickoffTimeConfirmed === false
    ? kickoff
    : kickoff - 60 * 60 * 1000;
  return Date.now() > deadline;
}

function isGameweekLocked(gameweek, fixturesSource = FIXTURES) {
  const fixtures = fixturesSource.filter((f) => f.gameweek === gameweek);
  if (fixtures.length === 0) return false;
  const earliestDeadline = Math.min(
    ...fixtures.map(
      (f) => f?.kickoffTimeConfirmed === false
        ? new Date(f.kickoff).getTime()
        : new Date(f.kickoff).getTime() - 60 * 60 * 1000
    )
  );
  return Date.now() > earliestDeadline;
}

function getPredictionLandingGameweek(fixturesSource = FIXTURES, gameweeks = GAMEWEEKS) {
  const now = Date.now();
  const sortedGameweeks = [...gameweeks].sort((a, b) => a - b);
  const currentOrUpcoming = sortedGameweeks.find((gw) => {
    const fixtures = fixturesSource.filter((fixture) => fixture.gameweek === gw);
    if (!fixtures.length) return false;
    const latestKickoff = Math.max(
      ...fixtures.map((fixture) => Date.parse(fixture.kickoff)).filter(Number.isFinite)
    );
    return Number.isFinite(latestKickoff) && latestKickoff >= now;
  });

  if (currentOrUpcoming) return currentOrUpcoming;

  const firstUpcomingFixture = [...fixturesSource]
    .filter((fixture) => Date.parse(fixture.kickoff) > now)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))[0];

  return firstUpcomingFixture?.gameweek || sortedGameweeks[0] || 1;
}

// --- TEAM RATINGS FOR MODELLED ODDS ---
// Seed ratings for the 2026/27 Premier League clubs.
const TEAM_RATINGS = {
  Arsenal: 100,
  "Man City": 100,
  "Man Utd": 94,
  "Aston Villa": 91,
  Liverpool: 90,
  Bournemouth: 84,
  Sunderland: 84,
  Brighton: 84,
  Brentford: 83,
  Chelsea: 86,
  Fulham: 84,
  Newcastle: 83,
  Everton: 83,
  Leeds: 81,
  "Crystal Palace": 80,
  "Nott'm Forest": 79,
  Spurs: 78,
  Coventry: 76,
  Ipswich: 74,
  Hull: 72,
};

const PROMOTED_TEAM_PRIOR_FORM_POINTS = {
  championshipWinner: 5.9,
  promoted: 5.25,
  playoffWinner: 4.7,
};

const PREMIER_LEAGUE_MODEL_CONFIG = {
  version: "premier-fixture-model-v2.0.0",
  fallbackTeamRating: 82,
  fallbackPosition: 10,
  fallbackFormPointsPerMatch: 1.25,
  fallbackGoalDifferencePerGame: 0,
  neutralProbabilities: { home: 0.38, draw: 0.24, away: 0.38 },
  currentSeasonBlendMatches: 10,
  recentFormWeightsNewestFirst: [5, 4, 3, 2, 1],
  recentGoalDifferenceCap: 4,
  ratingWeight: 0.135,
  positionWeight: 0.18,
  formWeight: 0.42,
  goalDifferenceWeight: 0.36,
  streakWeight: 0.06,
  maxStreakEdge: 0.18,
  homeAdvantage: 0.27,
  resultEdgeScale: 1.8,
  maxResultEdge: 4.1,
  drawBase: 0.255,
  drawEdgeWeight: 0.024,
  drawEdgeMaxReduction: 0.105,
  minDrawProbability: 0.15,
  maxDrawProbability: 0.285,
  oddsOverround: 0.94,
  leagueGoalsPerTeam: 1.38,
  expectedGoalsMin: 0.15,
  expectedGoalsMax: 4.5,
  scoreMatrixMaxGoals: 7,
  scorelineProbabilityBlend: 0.25,
  attackExpectedGoalsWeight: 0.65,
  attackScoreTwoPlusWeight: 1.2,
  defenceCleanSheetWeight: 2.2,
  defenceOpponentGoalsWeight: 0.75,
  nextThreeFixtureWeights: [0.5, 0.3, 0.2],
  nextFiveFixtureWeights: [0.34, 0.24, 0.18, 0.14, 0.1],
};

const FANTASY_SUGGESTED_TEAM_FIXTURE_HORIZON = 5;

function getPremierLeagueFixtureWeights(horizon = 3) {
  const numericHorizon = Math.max(1, Math.round(Number(horizon) || 3));
  if (numericHorizon === 5) return PREMIER_LEAGUE_MODEL_CONFIG.nextFiveFixtureWeights;
  if (numericHorizon <= 3) return PREMIER_LEAGUE_MODEL_CONFIG.nextThreeFixtureWeights.slice(0, numericHorizon);
  const decay = 0.72;
  const weights = Array.from({ length: numericHorizon }, (_, index) => decay ** index);
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  return weights.map((weight) => weight / total);
}

const OVERALL_DIFFICULTY_BANDS = [
  { minExpectedPoints: 2.15, score: 1, label: "Easy", color: "#22c55e" },
  { minExpectedPoints: 1.7, score: 2, label: "Favourable", color: "#84cc16" },
  { minExpectedPoints: 1.25, score: 3, label: "Balanced", color: "#eab308" },
  { minExpectedPoints: 0.9, score: 4, label: "Hard", color: "#f97316" },
  { minExpectedPoints: -Infinity, score: 5, label: "Very hard", color: "#ef4444" },
];

const ATTACK_DIFFICULTY_BANDS = [
  { minRating: 2.05, score: 1, label: "Excellent", color: "#22c55e" },
  { minRating: 1.55, score: 2, label: "Good", color: "#84cc16" },
  { minRating: 1.15, score: 3, label: "Mixed", color: "#eab308" },
  { minRating: 0.8, score: 4, label: "Difficult", color: "#f97316" },
  { minRating: -Infinity, score: 5, label: "Very difficult", color: "#ef4444" },
];

const DEFENCE_DIFFICULTY_BANDS = [
  { minRating: 1.65, score: 1, label: "Excellent clean-sheet opportunity", color: "#22c55e" },
  { minRating: 1.2, score: 2, label: "Good", color: "#84cc16" },
  { minRating: 0.82, score: 3, label: "Mixed", color: "#eab308" },
  { minRating: 0.5, score: 4, label: "Risky", color: "#f97316" },
  { minRating: -Infinity, score: 5, label: "Very risky", color: "#ef4444" },
];

const PREMIER_PREVIOUS_SEASON_PROFILES = {
  Arsenal: { position: 1, played: 38, points: 85, goalDifference: 44 },
  "Man City": { position: 2, played: 38, points: 78, goalDifference: 42 },
  "Man Utd": { position: 3, played: 38, points: 71, goalDifference: 19 },
  "Aston Villa": { position: 4, played: 38, points: 65, goalDifference: 7 },
  Liverpool: { position: 5, played: 38, points: 60, goalDifference: 10 },
  Bournemouth: { position: 6, played: 38, points: 57, goalDifference: 4 },
  Sunderland: { position: 7, played: 38, points: 54, goalDifference: -6 },
  Brighton: { position: 8, played: 38, points: 53, goalDifference: 6 },
  Brentford: { position: 9, played: 38, points: 53, goalDifference: 3 },
  Chelsea: { position: 10, played: 38, points: 52, goalDifference: 6 },
  Fulham: { position: 11, played: 38, points: 52, goalDifference: 4 },
  Newcastle: { position: 12, played: 38, points: 49, goalDifference: -2 },
  Everton: { position: 13, played: 38, points: 49, goalDifference: -3 },
  Leeds: { position: 14, played: 38, points: 47, goalDifference: -7 },
  "Crystal Palace": { position: 15, played: 38, points: 45, goalDifference: -10 },
  "Nott'm Forest": { position: 16, played: 38, points: 44, goalDifference: -3 },
  Spurs: { position: 17, played: 38, points: 41, goalDifference: -9 },
  Coventry: {
    position: 18,
    promoted: true,
    promotionProfile: "championshipWinner",
    adjustedGoalDifferencePerGame: -0.38,
  },
  Ipswich: {
    position: 19,
    promoted: true,
    promotionProfile: "promoted",
    adjustedGoalDifferencePerGame: -0.52,
  },
  Hull: {
    position: 20,
    promoted: true,
    promotionProfile: "playoffWinner",
    adjustedGoalDifferencePerGame: -0.68,
  },
};

const WORLD_CUP_OUTRIGHT_ODDS = {
  spain: 6.0,
  france: 6.0,
  england: 7.5,
  brazil: 9.0,
  argentina: 9.5,
  portugal: 12.0,
  germany: 15.0,
  netherlands: 21.0,
  norway: 31.0,
  belgium: 36.0,
  colombia: 41.0,
  morocco: 51.0,
  japan: 51.0,
  unitedstates: 61.0,
  uruguay: 66.0,
  mexico: 76.0,
  switzerland: 81.0,
  croatia: 81.0,
  ecuador: 91.0,
  sweden: 101.0,
  turkiye: 101.0,
  senegal: 111.0,
  austria: 151.0,
  paraguay: 151.0,
  canada: 201.0,
  scotland: 201.0,
  bosniaandherzegovina: 251.0,
  czechia: 251.0,
  cotedivoire: 251.0,
  egypt: 301.0,
  ghana: 301.0,
  algeria: 351.0,
  southkorea: 451.0,
  australia: 501.0,
  tunisia: 501.0,
  iriran: 501.0,
  congodr: 701.0,
  southafrica: 801.0,
  saudiarabia: 1001.0,
  panama: 1001.0,
  qatar: 1001.0,
  uzbekistan: 1001.0,
  newzealand: 1001.0,
  iraq: 1001.0,
  caboverde: 1001.0,
  jordan: 2001.0,
  curacao: 2001.0,
  haiti: 2501.0,
};

const WORLD_CUP_HOSTS = new Set([
  "canada",
  "mexico",
  "unitedstates",
]);

function getWorldCupOutrightOdds(name) {
  return WORLD_CUP_OUTRIGHT_ODDS[normalizeTeamName(name)] || null;
}

function isWorldCupFixtureModel(fixture) {
  return Boolean(
    fixture
    && getWorldCupOutrightOdds(fixture.homeTeam)
    && getWorldCupOutrightOdds(fixture.awayTeam)
  );
}

function buildWorldCupFixtureModel(fixture) {
  const homeOdds = getWorldCupOutrightOdds(fixture?.homeTeam);
  const awayOdds = getWorldCupOutrightOdds(fixture?.awayTeam);

  if (!homeOdds || !awayOdds) {
    return buildFallbackFixtureModel("missing_world_cup_outright_odds");
  }

  const homeKey = normalizeTeamName(fixture.homeTeam);
  const awayKey = normalizeTeamName(fixture.awayTeam);

  const outrightEdge = Math.log(awayOdds / homeOdds);
  const hostEdge =
    (WORLD_CUP_HOSTS.has(homeKey) ? 0.16 : 0)
    - (WORLD_CUP_HOSTS.has(awayKey) ? 0.16 : 0);
  const cappedEdge = Math.max(-4.5, Math.min(4.5, outrightEdge + hostEdge));

  const homeRaw = 1 / (1 + Math.exp(-cappedEdge / 1.35));
  let drawProb = 0.27 - Math.min(Math.abs(cappedEdge) * 0.028, 0.11);
  drawProb = Math.max(0.16, Math.min(0.30, drawProb));

  const nonDrawProb = 1 - drawProb;
  const homeProb = homeRaw * nonDrawProb;
  const awayProb = (1 - homeRaw) * nonDrawProb;

  const homeExpectedPoints = homeProb * 3 + drawProb;
  const awayExpectedPoints = awayProb * 3 + drawProb;
  const homeDifficultyScore = getOverallDifficultyScore(homeExpectedPoints);
  const awayDifficultyScore = getOverallDifficultyScore(awayExpectedPoints);

  return {
    homeProb,
    drawProb,
    awayProb,
    homeExpectedPoints,
    awayExpectedPoints,
    homeDifficultyScore,
    awayDifficultyScore,
    homeDifficultyMeta: getDifficultyMeta(homeDifficultyScore),
    awayDifficultyMeta: getDifficultyMeta(awayDifficultyScore),
    modelVersion: "world-cup-outright-model-v1",
  };
}

function getTeamRating(name) {
  const raw = (name || "").trim();
  if (typeof TEAM_RATINGS[raw] === "number") return TEAM_RATINGS[raw];

  const normalized = normalizeTeamName(raw);
  const match = Object.entries(TEAM_RATINGS).find(
    ([teamName]) => normalizeTeamName(teamName) === normalized
  );
  const rating = match ? match[1] : undefined;
  if (typeof rating === "number") return rating;
  // Fallback: mid-table-ish team
  return 82;
}

function getPreviousSeasonProfile(name) {
  const raw = (name || "").trim();
  if (PREMIER_PREVIOUS_SEASON_PROFILES[raw]) {
    return PREMIER_PREVIOUS_SEASON_PROFILES[raw];
  }

  const normalized = normalizeTeamName(raw);
  const match = Object.entries(PREMIER_PREVIOUS_SEASON_PROFILES).find(
    ([teamName]) => normalizeTeamName(teamName) === normalized
  );
  return match ? match[1] : null;
}

function buildPreviousSeasonPrior(name) {
  const profile = getPreviousSeasonProfile(name);
  if (!profile) {
    return {
      position: 10,
      formPoints: 6.2,
      goalDifferencePerGame: 0,
      promoted: false,
    };
  }

  if (profile.promoted) {
    return {
      position: profile.position,
      formPoints:
        PROMOTED_TEAM_PRIOR_FORM_POINTS[profile.promotionProfile] ||
        PROMOTED_TEAM_PRIOR_FORM_POINTS.promoted,
      goalDifferencePerGame: Number(profile.adjustedGoalDifferencePerGame) || -0.55,
      promoted: true,
    };
  }

  const played = Number(profile.played) || 38;
  const points = Number(profile.points) || 0;
  const goalDifference = Number(profile.goalDifference) || 0;

  return {
    position: Number(profile.position) || 10,
    formPoints: (points / played) * 5,
    goalDifferencePerGame: goalDifference / played,
    promoted: false,
  };
}

function getOutcomePoints(outcome) {
  if (outcome === "W") return 3;
  if (outcome === "D") return 1;
  return 0;
}

function getConsecutiveCount(items, predicate) {
  let count = 0;
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (!predicate(items[index])) break;
    count += 1;
  }
  return count;
}

function getWeightedRecentForm(matches) {
  const weights = PREMIER_LEAGUE_MODEL_CONFIG.recentFormWeightsNewestFirst;
  const newestFirst = [...(matches || [])].slice(-weights.length).reverse();
  const totalWeight = newestFirst.reduce(
    (sum, _match, index) => sum + (weights[index] || 0),
    0
  );
  if (!newestFirst.length || totalWeight <= 0) return 0;

  // Points per match, weighted 5-4-3-2-1 from newest to oldest.
  const weightedPoints = newestFirst.reduce(
    (sum, match, index) => sum + getOutcomePoints(match.outcome) * (weights[index] || 0),
    0
  );
  return weightedPoints / totalWeight;
}

function getRecentCappedAverage(matches, selector, cap) {
  const recent = [...(matches || [])].slice(-5);
  if (!recent.length) return 0;
  const total = recent.reduce((sum, match) => {
    const value = clampNumber(selector(match), -cap, cap);
    return sum + value;
  }, 0);
  return total / recent.length;
}

function getTeamStreaks(matches) {
  const allMatches = matches || [];
  return {
    consecutiveWins: getConsecutiveCount(allMatches, (match) => match.outcome === "W"),
    consecutiveUnbeaten: getConsecutiveCount(allMatches, (match) => match.outcome !== "L"),
    consecutiveDefeats: getConsecutiveCount(allMatches, (match) => match.outcome === "L"),
    consecutiveCleanSheets: getConsecutiveCount(allMatches, (match) => Number(match.goalsAgainst) === 0),
    consecutiveMatchesScoring: getConsecutiveCount(allMatches, (match) => Number(match.goalsFor) > 0),
    consecutiveScoreless: getConsecutiveCount(allMatches, (match) => Number(match.goalsFor) === 0),
  };
}

/**
 * Generate realistic-ish decimal odds for a fixture
 * using team ratings, home advantage and a draw baseline.
 * This feeds both the Win Probabilities view and the coins game.
 * @deprecated The active Premier League pipeline uses buildFixtureModel() and
 * buildGeneratedModelOdds(); this legacy helper has no current references.
 */
function generateModelOddsForFixture(fixture) {
  if (!fixture) {
    // Safe fallback, roughly 33/33/33
    return { home: 2.6, draw: 3.2, away: 2.6 };
  }

  const homeName = fixture.homeTeam;
  const awayName = fixture.awayTeam;

  const BASE_DRAW = 0.28;   // typical PL draw rate
  const MIN_DRAW = 0.20;    // never let draw get too tiny
  const HOME_ADV = 3;       // rating points for home advantage
  const SCALE = 10;         // how fast the model reacts to strength gaps
  const OVERROUND = 0.94;   // bookie margin – lower = bigger prices

  const homeRating = getTeamRating(homeName);
  const awayRating = getTeamRating(awayName);

  // Positive diff = home stronger, negative = away stronger
  const diff = (homeRating + HOME_ADV) - awayRating;

  // Logistic curve for win chance (before draw is considered)
  const homeRaw = 1 / (1 + Math.exp(-diff / SCALE));
  const awayRaw = 1 - homeRaw;

  // Draw is highest when teams are similar, lower when the gap is big
  const gap = Math.min(Math.abs(diff), 20);
  let drawProb = BASE_DRAW - gap * 0.004; // 0.28 → ~0.20 as gap grows
  if (drawProb < MIN_DRAW) drawProb = MIN_DRAW;

  const nonDraw = 1 - drawProb;
  let homeProb = homeRaw * nonDraw;
  let awayProb = awayRaw * nonDraw;

  // Normalise so home + draw + away = 1
  const sum = homeProb + drawProb + awayProb;
  if (sum > 0) {
    homeProb /= sum;
    drawProb /= sum;
    awayProb /= sum;
  }

  // Convert probabilities to decimal odds with a small overround
  const homeOdds = Number((OVERROUND / homeProb).toFixed(2));
  const drawOdds = Number((OVERROUND / drawProb).toFixed(2));
  const awayOdds = Number((OVERROUND / awayProb).toFixed(2));

  return {
    home: homeOdds,
    draw: drawOdds,
    away: awayOdds,
  };
}

// --- ODDS → PROBABILITIES ---
function computeProbabilities(odds) {
  if (!odds || !odds.home || !odds.draw || !odds.away) return null;

  const home = Number(odds.home);
  const draw = Number(odds.draw);
  const away = Number(odds.away);
  if (!home || !draw || !away) return null;

  const invHome = 1 / home;
  const invDraw = 1 / draw;
  const invAway = 1 / away;
  const total = invHome + invDraw + invAway;
  if (!isFinite(total) || total <= 0) return null;

  return {
    home: (invHome / total) * 100,
    draw: (invDraw / total) * 100,
    away: (invAway / total) * 100,
  };
}

const TEAM_STRENGTH = {
  "Manchester City FC": 96,
  "Arsenal FC": 92,
  "Liverpool FC": 90,
  "Tottenham Hotspur FC": 88,
  "Aston Villa FC": 85,
  "Chelsea FC": 84,
  "Newcastle United FC": 83,
  "Manchester United FC": 82,
  "Brighton & Hove Albion FC": 80,
  "Brentford FC": 76,
  "Crystal Palace FC": 74,
  "Fulham FC": 73,
  "AFC Bournemouth": 72,
  "Everton FC": 71,
  "Nottingham Forest FC": 69,
  "Leeds United FC": 68,
  "Sunderland AFC": 67,
  "Coventry City FC": 66,
  "Ipswich Town FC": 65,
  "Hull City AFC": 64,
};

// Generate free built-in odds so we don't depend on external APIs
function generatePseudoOddsForFixture(fixture) {
  const homeTeam = fixture.homeTeam;
  const awayTeam = fixture.awayTeam;

  const homeStrength = TEAM_STRENGTH[homeTeam] ?? 75;
  const awayStrength = TEAM_STRENGTH[awayTeam] ?? 75;

  // Home advantage
  const homeAdvantage = 6;

  // Expected power values
  const homePower = homeStrength + homeAdvantage;
  const awayPower = awayStrength;

  // Raw win probabilities (no draw yet)
  let homeProb = homePower / (homePower + awayPower);
  let awayProb = awayPower / (homePower + awayPower);

  // Draw stays fairly stable
  let drawProb = 0.23;

  // Normalize probabilities
  const total = homeProb + drawProb + awayProb;
  homeProb /= total;
  drawProb /= total;
  awayProb /= total;

  // Convert to decimal odds with slight bookmaker margin
  const margin = 1.05;
  return {
    home: Number((margin / homeProb).toFixed(2)),
    draw: Number((margin / drawProb).toFixed(2)),
    away: Number((margin / awayProb).toFixed(2)),
  };
}

// Helpers
function formatKickoffShort(kickoff) {
  if (!kickoff) return "";
  const d = new Date(kickoff);
  if (Number.isNaN(d.getTime())) return "";
  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = monthNames[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
  return `${day} ${month} ${hours}:${mins}`;
}

function formatFixtureKickoff(fixture, mode = PREMIER_MODE) {
  if (!fixture?.kickoff) return "";
  const stadiumSuffix = fixture.stadium ? ` • ${fixture.stadium}` : "";
  if (mode === WORLD_CUP_MODE && fixture.kickoffTimeConfirmed === false) {
    const d = new Date(fixture.kickoff);
    if (Number.isNaN(d.getTime())) return "";
    const day = String(d.getDate()).padStart(2, "0");
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    return `${day} ${monthNames[d.getMonth()]}${stadiumSuffix || " • Venue TBC"}`;
  }
  if (mode === WORLD_CUP_MODE) {
    return `${formatKickoffShort(fixture.kickoff)}${stadiumSuffix}`;
  }
  return formatKickoffShort(fixture.kickoff);
}

function buildFixtureOverridesFromMatchStates(matchStatesByFixtureId = {}, fixtures = []) {
  const overrides = {};
  const fixtureById = new Map(
    (fixtures || []).map((fixture) => [String(fixture.id), fixture])
  );
  Object.entries(matchStatesByFixtureId || {}).forEach(([fixtureId, matchState]) => {
    const fixture = fixtureById.get(String(fixtureId));
    if (!fixture) return;
    if (!matchState || typeof matchState !== "object") return;
    const utcDate = String(matchState.utcDate || "").trim();
    const homeTeam = resolveWorldCupCountryName(
      String(matchState.homeTeam || "").trim()
    );
    const awayTeam = resolveWorldCupCountryName(
      String(matchState.awayTeam || "").trim()
    );
    overrides[fixtureId] = {
      ...(utcDate ? { kickoff: utcDate, kickoffTimeConfirmed: true } : {}),
      ...(isPlaceholderTeamName(fixture.homeTeam) && homeTeam ? { homeTeam } : {}),
      ...(isPlaceholderTeamName(fixture.awayTeam) && awayTeam ? { awayTeam } : {}),
    };
  });
  return overrides;
}
// eslint-disable-next-line no-unused-vars
function formatOdds(value) {
  if (value === undefined || value === null || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  return n.toFixed(2);
}


export function getTeamCode(name, mode = PREMIER_MODE) {
  if (!name) return "";

  if (mode === WORLD_CUP_MODE) {
    const wcCodes = {
      Algeria: "ALG",
      Argentina: "ARG",
      Australia: "AUS",
      Austria: "AUT",
      Belgium: "BEL",
      "Bosnia and Herzegovina": "BIH",
      Brazil: "BRA",
      "Cabo Verde": "CPV",
      Colombia: "COL",
      "Congo DR": "COD",
      Croatia: "CRO",
      Curacao: "CUW",
      Czechia: "CZE",
      Denmark: "DEN",
      "Cote d'Ivoire": "CIV",
      Ecuador: "ECU",
      Egypt: "EGY",
      England: "ENG",
      France: "FRA",
      Germany: "GER",
      Ghana: "GHA",
      Haiti: "HAI",
      Iraq: "IRQ",
      "IR Iran": "IRN",
      Japan: "JPN",
      Jordan: "JOR",
      Mexico: "MEX",
      Morocco: "MAR",
      Netherlands: "NED",
      "New Zealand": "NZL",
      Norway: "NOR",
      Panama: "PAN",
      Paraguay: "PAR",
      Poland: "POL",
      Portugal: "POR",
      Qatar: "QAT",
      Scotland: "SCO",
      Senegal: "SEN",
      Serbia: "SRB",
      "South Africa": "RSA",
      "South Korea": "KOR",
      Spain: "ESP",
      Sweden: "SWE",
      Switzerland: "SUI",
      Tunisia: "TUN",
      Türkiye: "TUR",
      "United States": "USA",
      Uruguay: "URU",
      Uzbekistan: "UZB",
    };
    return wcCodes[name] || name.slice(0, 3).toUpperCase();
  }

  const clean = name
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

  // MASTER NORMALIZATION MAP — flexible matching
  const map = [
    { match: ["arsenal"], code: "ARS" },
    { match: ["aston villa", "villa"], code: "AVL" },
    { match: ["bournemouth", "afc bournemouth"], code: "BOU" },
    { match: ["brentford"], code: "BRE" },
    { match: ["brighton", "brighton and hove", "brighton hove albion", "brighton hove"], code: "BHA" },
    { match: ["chelsea"], code: "CHE" },
    { match: ["coventry", "coventry city"], code: "COV" },
    { match: ["crystal palace", "palace"], code: "CRY" },
    { match: ["everton"], code: "EVE" },
    { match: ["fulham"], code: "FUL" },
    { match: ["hull", "hull city"], code: "HUL" },
    { match: ["ipswich", "ipswich town"], code: "IPS" },
    { match: ["leicester", "leicester city"], code: "LEI" },
    { match: ["liverpool"], code: "LIV" },
    { match: ["manchester city", "man city", "manchester c"], code: "MCI" },
    { match: ["manchester united", "man united", "man utd"], code: "MUN" },
    { match: ["leeds", "leeds united"], code: "LEE" },
    { match: ["newcastle", "newcastle united"], code: "NEW" },
    { match: ["nottingham forest", "nottingham", "forest", "nottm forest"], code: "NFO" },
    { match: ["southampton"], code: "SOU" },
    { match: ["tottenham", "tottenham hotspur", "spurs"], code: "TOT" },
    { match: ["west ham", "west ham united"], code: "WHU" },
    { match: ["wolves", "wolverhampton", "wolverhampton wanderers"], code: "WOL" },
  ];

  // Flexible fuzzy matcher
  for (const t of map) {
    for (const key of t.match) {
      if (clean.includes(key)) return t.code;
    }
  }

  // Fallback = first 3 letters
  return clean.substring(0, 3).toUpperCase();
}

function resolveCanonicalPremierLeagueTeam(name) {
  const normalized = normalizeTeamName(name);
  if (!normalized) return name || "";
  const match = PREMIER_LEAGUE_TEAMS.find((team) => normalizeTeamName(team) === normalized);
  return match || name || "";
}

function isFixtureCompleted(fixture, results) {
  const res = results?.[fixture?.id];
  return hasValidResultScore(res);
}

function getLeaderboardDisplayRank(rows = [], index = 0, getValue = () => 0) {
  const currentValue = Number(getValue(rows[index])) || 0;
  const firstMatchingIndex = rows.findIndex(
    (row) => (Number(getValue(row)) || 0) === currentValue
  );
  return firstMatchingIndex >= 0 ? firstMatchingIndex + 1 : index + 1;
}

function hasLeaderboardValueSpread(rows = [], getValue = () => 0) {
  const values = rows.map((row) => Number(getValue(row)) || 0);
  return new Set(values).size > 1;
}

function getLeaderboardDecoration(rows = [], index = 0, getValue = () => 0, enabled = true) {
  const rank = getLeaderboardDisplayRank(rows, index, getValue);
  if (!enabled || !hasLeaderboardValueSpread(rows, getValue)) {
    return { rank, borderColor: null, emoji: "", highlight: false };
  }

  if (rank === 1) return { rank, borderColor: "#FFD700", emoji: "🥇", highlight: true };
  if (rank === 2) return { rank, borderColor: "#C0C0C0", emoji: "🥈", highlight: false };
  if (rank === 3) return { rank, borderColor: "#CD7F32", emoji: "🥉", highlight: false };
  if (index === rows.length - 1) return { rank, borderColor: null, emoji: "💩", highlight: false };
  return { rank, borderColor: null, emoji: "", highlight: false };
}

function getScoreLabel(matchState) {
  const status = String(matchState?.status || "").toUpperCase();
  if (["IN_PLAY", "PAUSED", "LIVE"].includes(status)) return "LIVE SCORE";
  if (["FINISHED", "AWARDED"].includes(status)) return "FINAL SCORE";
  return "SCORE";
}

export function isFixtureLive(matchState) {
  return ["IN_PLAY", "PAUSED", "LIVE"].includes(
    String(matchState?.status || "").toUpperCase()
  );
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (!Number.isFinite(number)) return min;
  return Math.max(min, Math.min(max, number));
}

function normalizeProbabilitySet(values, fallback = PREMIER_LEAGUE_MODEL_CONFIG.neutralProbabilities) {
  const home = clampNumber(values?.home ?? values?.homeProb, 0, 1);
  const draw = clampNumber(values?.draw ?? values?.drawProb, 0, 1);
  const away = clampNumber(values?.away ?? values?.awayProb, 0, 1);
  const total = home + draw + away;

  if (!Number.isFinite(total) || total <= 0) {
    return {
      homeProb: fallback.home,
      drawProb: fallback.draw,
      awayProb: fallback.away,
    };
  }

  return {
    homeProb: home / total,
    drawProb: draw / total,
    awayProb: away / total,
  };
}

function getBandMeta(score, bands) {
  return bands.find((band) => Number(score) <= band.score) || bands[bands.length - 1];
}

function scoreFromDescendingBands(value, bands, key) {
  const numericValue = Number(value);
  const match = bands.find((band) => numericValue >= band[key]);
  return match ? match.score : bands[bands.length - 1].score;
}

function getDifficultyMeta(score) {
  const band = getBandMeta(score, OVERALL_DIFFICULTY_BANDS);
  return { label: band.label, color: band.color };
}

function getAttackDifficultyMeta(score) {
  const band = getBandMeta(score, ATTACK_DIFFICULTY_BANDS);
  return { label: band.label, color: band.color };
}

function getDefenceDifficultyMeta(score) {
  const band = getBandMeta(score, DEFENCE_DIFFICULTY_BANDS);
  return { label: band.label, color: band.color };
}

function getOverallDifficultyScore(expectedPoints) {
  return scoreFromDescendingBands(
    expectedPoints,
    OVERALL_DIFFICULTY_BANDS,
    "minExpectedPoints"
  );
}

function getAttackDifficultyScore(rating) {
  return scoreFromDescendingBands(rating, ATTACK_DIFFICULTY_BANDS, "minRating");
}

function getDefenceDifficultyScore(rating) {
  return scoreFromDescendingBands(rating, DEFENCE_DIFFICULTY_BANDS, "minRating");
}

function buildLeaguePerformanceContext(results) {
  const byTeam = {};
  PREMIER_LEAGUE_TEAMS.forEach((team) => {
    const prior = buildPreviousSeasonPrior(team);
    byTeam[normalizeTeamName(team)] = {
      team,
      played: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      lastFive: [],
      recentMatches: [],
      formPoints: 0,
      weightedFormPointsPerMatch: 0,
      recentGoalsForPerMatch: 0,
      recentGoalsAgainstPerMatch: 0,
      recentCappedGoalDifferencePerGame: 0,
      streaks: getTeamStreaks([]),
      position: 10,
      priorPosition: prior.position,
      priorFormPoints: prior.formPoints,
      priorGoalDifferencePerGame: prior.goalDifferencePerGame,
      promoted: prior.promoted,
    };
  });

  const completedFixtures = FIXTURES.filter((fixture) => isFixtureCompleted(fixture, results)).sort(
    (a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff)
  );

  completedFixtures.forEach((fixture) => {
    const res = results[fixture.id];
    const homeKey = normalizeTeamName(fixture.homeTeam);
    const awayKey = normalizeTeamName(fixture.awayTeam);
    const home = byTeam[homeKey];
    const away = byTeam[awayKey];
    if (!home || !away) return;

    const homeGoals = Number(res.homeGoals);
    const awayGoals = Number(res.awayGoals);
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return;

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    let homeOutcome = "D";
    let awayOutcome = "D";
    if (homeGoals > awayGoals) {
      home.points += 3;
      homeOutcome = "W";
      awayOutcome = "L";
    } else if (homeGoals < awayGoals) {
      away.points += 3;
      homeOutcome = "L";
      awayOutcome = "W";
    } else {
      home.points += 1;
      away.points += 1;
    }

    home.lastFive.push(homeOutcome);
    away.lastFive.push(awayOutcome);
    if (home.lastFive.length > 5) home.lastFive.shift();
    if (away.lastFive.length > 5) away.lastFive.shift();
    home.recentMatches.push({
      outcome: homeOutcome,
      goalsFor: homeGoals,
      goalsAgainst: awayGoals,
      goalDifference: homeGoals - awayGoals,
    });
    away.recentMatches.push({
      outcome: awayOutcome,
      goalsFor: awayGoals,
      goalsAgainst: homeGoals,
      goalDifference: awayGoals - homeGoals,
    });
  });

  Object.values(byTeam).forEach((team) => {
    team.formPoints = team.lastFive.reduce((sum, outcome) => sum + getOutcomePoints(outcome), 0);
    team.weightedFormPointsPerMatch = getWeightedRecentForm(team.recentMatches);
    team.recentGoalsForPerMatch = getRecentCappedAverage(
      team.recentMatches,
      (match) => Number(match.goalsFor),
      PREMIER_LEAGUE_MODEL_CONFIG.recentGoalDifferenceCap
    );
    team.recentGoalsAgainstPerMatch = getRecentCappedAverage(
      team.recentMatches,
      (match) => Number(match.goalsAgainst),
      PREMIER_LEAGUE_MODEL_CONFIG.recentGoalDifferenceCap
    );
    team.recentCappedGoalDifferencePerGame = getRecentCappedAverage(
      team.recentMatches,
      (match) => Number(match.goalDifference),
      PREMIER_LEAGUE_MODEL_CONFIG.recentGoalDifferenceCap
    );
    team.streaks = getTeamStreaks(team.recentMatches);
  });

  const ordered = Object.values(byTeam).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return a.team.localeCompare(b.team);
  });

  ordered.forEach((team, index) => {
    team.position = index + 1;
  });

  return byTeam;
}

export function buildPremierLeagueTableRows(fixtures = FIXTURES, results = {}) {
  const byTeam = {};

  (fixtures || []).forEach((fixture) => {
    [fixture.homeTeam, fixture.awayTeam].forEach((teamName) => {
      if (!teamName) return;
      const teamKey = normalizeTeamName(teamName);
      if (byTeam[teamKey]) return;
      byTeam[teamKey] = {
        team: {
          id: teamKey,
          name: teamName,
          shortName: teamName.replace(/\s*(FC|AFC)$/i, "").trim(),
          tla: getTeamCode(teamName),
        },
        playedGames: 0,
        won: 0,
        draw: 0,
        lost: 0,
        points: 0,
        goalsFor: 0,
        goalsAgainst: 0,
        goalDifference: 0,
        position: 0,
      };
    });

    if (!isFixtureCompleted(fixture, results)) return;

    const res = results[fixture.id];
    const homeGoals = Number(res.homeGoals);
    const awayGoals = Number(res.awayGoals);
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return;

    const home = byTeam[normalizeTeamName(fixture.homeTeam)];
    const away = byTeam[normalizeTeamName(fixture.awayTeam)];
    if (!home || !away) return;

    home.playedGames += 1;
    away.playedGames += 1;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (homeGoals > awayGoals) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (homeGoals < awayGoals) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.draw += 1;
      away.draw += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  const rows = Object.values(byTeam);
  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
    if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
    return (a.team?.name || "").localeCompare(b.team?.name || "");
  });
  rows.forEach((row, index) => {
    row.position = index + 1;
  });

  return rows;
}

function getTeamRatingInfo(name) {
  const raw = (name || "").trim();
  if (typeof TEAM_RATINGS[raw] === "number") return { rating: TEAM_RATINGS[raw], fallback: null };

  const normalized = normalizeTeamName(raw);
  const match = Object.entries(TEAM_RATINGS).find(
    ([teamName]) => normalizeTeamName(teamName) === normalized
  );
  if (match && typeof match[1] === "number") return { rating: match[1], fallback: null };

  return {
    rating: PREMIER_LEAGUE_MODEL_CONFIG.fallbackTeamRating,
    fallback: "missing_team_rating",
  };
}

function getPreviousSeasonPriorInfo(name) {
  const profile = getPreviousSeasonProfile(name);
  return {
    prior: buildPreviousSeasonPrior(name),
    fallback: profile ? null : "missing_previous_profile",
  };
}

function buildTeamModelProfile(teamName, performanceByTeam, side) {
  const key = normalizeTeamName(teamName);
  const perf = performanceByTeam[key] || null;
  const ratingInfo = getTeamRatingInfo(teamName);
  const priorInfo = getPreviousSeasonPriorInfo(teamName);
  const prior = priorInfo.prior;
  const played = Number(perf?.played) || 0;
  const seasonWeight = clampNumber(
    played / PREMIER_LEAGUE_MODEL_CONFIG.currentSeasonBlendMatches,
    0,
    1
  );
  const fallbackPrefix = side === "home" ? "missing_home" : "missing_away";
  const fallbacksUsed = [];
  if (!perf) fallbacksUsed.push(`${fallbackPrefix}_performance`);
  if (ratingInfo.fallback) fallbacksUsed.push(`${fallbackPrefix}_team_rating`);
  if (priorInfo.fallback) fallbacksUsed.push(`${fallbackPrefix}_previous_profile`);

  const currentPosition = Number(perf?.position) || PREMIER_LEAGUE_MODEL_CONFIG.fallbackPosition;
  const currentFormPpm = Number.isFinite(Number(perf?.weightedFormPointsPerMatch))
    ? Number(perf.weightedFormPointsPerMatch)
    : 0;
  const currentGdPerGame = played > 0
    ? Number(perf?.goalDifference || 0) / played
    : PREMIER_LEAGUE_MODEL_CONFIG.fallbackGoalDifferencePerGame;
  const recentCappedGdPerGame = Number.isFinite(Number(perf?.recentCappedGoalDifferencePerGame))
    ? Number(perf.recentCappedGoalDifferencePerGame)
    : currentGdPerGame;
  // Capped recent GD tempers one-off blowouts without discarding season evidence.
  const robustCurrentGdPerGame = played > 0
    ? currentGdPerGame * 0.65 + recentCappedGdPerGame * 0.35
    : PREMIER_LEAGUE_MODEL_CONFIG.fallbackGoalDifferencePerGame;
  const priorFormPpm = clampNumber(Number(prior.formPoints) / 5, 0, 3);
  const blendedPosition = prior.position * (1 - seasonWeight) + currentPosition * seasonWeight;
  const blendedFormPpm = priorFormPpm * (1 - seasonWeight) + currentFormPpm * seasonWeight;
  const blendedGdPerGame =
    prior.goalDifferencePerGame * (1 - seasonWeight) + robustCurrentGdPerGame * seasonWeight;
  const goalsForPerGame = played > 0
    ? Number(perf?.goalsFor || 0) / played
    : PREMIER_LEAGUE_MODEL_CONFIG.leagueGoalsPerTeam + prior.goalDifferencePerGame / 2;
  const goalsAgainstPerGame = played > 0
    ? Number(perf?.goalsAgainst || 0) / played
    : PREMIER_LEAGUE_MODEL_CONFIG.leagueGoalsPerTeam - prior.goalDifferencePerGame / 2;
  const recentGoalsForPerMatch = Number.isFinite(Number(perf?.recentGoalsForPerMatch))
    ? Number(perf.recentGoalsForPerMatch)
    : goalsForPerGame;
  const recentGoalsAgainstPerMatch = Number.isFinite(Number(perf?.recentGoalsAgainstPerMatch))
    ? Number(perf.recentGoalsAgainstPerMatch)
    : goalsAgainstPerGame;

  return {
    teamName,
    key,
    rating: ratingInfo.rating,
    played,
    seasonWeight,
    position: blendedPosition,
    formPointsPerMatch: blendedFormPpm,
    goalDifferencePerGame: blendedGdPerGame,
    goalsForPerGame: goalsForPerGame * 0.7 + recentGoalsForPerMatch * 0.3,
    goalsAgainstPerGame: goalsAgainstPerGame * 0.7 + recentGoalsAgainstPerMatch * 0.3,
    streaks: perf?.streaks || getTeamStreaks([]),
    promoted: prior.promoted,
    fallbacksUsed,
  };
}

function getStreakEdge(profile) {
  const streaks = profile?.streaks || {};
  const raw =
    Math.min(3, Number(streaks.consecutiveWins) || 0) * 0.04 +
    Math.min(4, Number(streaks.consecutiveUnbeaten) || 0) * 0.015 -
    Math.min(3, Number(streaks.consecutiveDefeats) || 0) * 0.045;
  // Keep this small because weighted form already captures most momentum.
  return clampNumber(
    raw * PREMIER_LEAGUE_MODEL_CONFIG.streakWeight,
    -PREMIER_LEAGUE_MODEL_CONFIG.maxStreakEdge,
    PREMIER_LEAGUE_MODEL_CONFIG.maxStreakEdge
  );
}

function buildResultStrengthProbabilities(homeProfile, awayProfile) {
  const config = PREMIER_LEAGUE_MODEL_CONFIG;
  const ratingGap = homeProfile.rating - awayProfile.rating;
  const positionGap = awayProfile.position - homeProfile.position;
  const formGap = homeProfile.formPointsPerMatch - awayProfile.formPointsPerMatch;
  const gdGap = homeProfile.goalDifferencePerGame - awayProfile.goalDifferencePerGame;
  const rawEdge =
    ratingGap * config.ratingWeight +
    positionGap * config.positionWeight +
    formGap * config.formWeight +
    gdGap * config.goalDifferenceWeight +
    getStreakEdge(homeProfile) -
    getStreakEdge(awayProfile) +
    config.homeAdvantage;
  const cappedEdge = clampNumber(rawEdge, -config.maxResultEdge, config.maxResultEdge);
  const homeRaw = 1 / (1 + Math.exp(-cappedEdge / config.resultEdgeScale));
  const drawProb = clampNumber(
    config.drawBase - Math.min(Math.abs(cappedEdge) * config.drawEdgeWeight, config.drawEdgeMaxReduction),
    config.minDrawProbability,
    config.maxDrawProbability
  );
  const nonDrawProb = 1 - drawProb;
  return {
    ...normalizeProbabilitySet({
      home: homeRaw * nonDrawProb,
      draw: drawProb,
      away: (1 - homeRaw) * nonDrawProb,
    }),
    rawEdge,
    cappedEdge,
  };
}

function calculateExpectedGoals(homeProfile, awayProfile) {
  const config = PREMIER_LEAGUE_MODEL_CONFIG;
  const ratingGoalEdge = (homeProfile.rating - awayProfile.rating) / 55;
  const homeAttack =
    homeProfile.goalsForPerGame * 0.55 +
    (config.leagueGoalsPerTeam + homeProfile.goalDifferencePerGame / 2) * 0.3 +
    config.leagueGoalsPerTeam * 0.15;
  const awayDefensiveWeakness =
    awayProfile.goalsAgainstPerGame * 0.55 +
    (config.leagueGoalsPerTeam - awayProfile.goalDifferencePerGame / 2) * 0.3 +
    config.leagueGoalsPerTeam * 0.15;
  const awayAttack =
    awayProfile.goalsForPerGame * 0.55 +
    (config.leagueGoalsPerTeam + awayProfile.goalDifferencePerGame / 2) * 0.3 +
    config.leagueGoalsPerTeam * 0.15;
  const homeDefensiveWeakness =
    homeProfile.goalsAgainstPerGame * 0.55 +
    (config.leagueGoalsPerTeam - homeProfile.goalDifferencePerGame / 2) * 0.3 +
    config.leagueGoalsPerTeam * 0.15;

  // Estimated goals use app-owned inputs only; this is not official expected-goals data.
  return {
    homeExpectedGoals: clampNumber(
      (homeAttack + awayDefensiveWeakness) / 2 + 0.18 + ratingGoalEdge * 0.28,
      config.expectedGoalsMin,
      config.expectedGoalsMax
    ),
    awayExpectedGoals: clampNumber(
      (awayAttack + homeDefensiveWeakness) / 2 - ratingGoalEdge * 0.22,
      config.expectedGoalsMin,
      config.expectedGoalsMax
    ),
  };
}

function poissonProbability(lambda, goals) {
  if (goals < 0) return 0;
  let factorial = 1;
  for (let value = 2; value <= goals; value += 1) factorial *= value;
  return (Math.exp(-lambda) * Math.pow(lambda, goals)) / factorial;
}

function buildScorelineMatrix(homeExpectedGoals, awayExpectedGoals) {
  const maxGoals = PREMIER_LEAGUE_MODEL_CONFIG.scoreMatrixMaxGoals;
  const matrix = [];
  let total = 0;
  for (let homeGoals = 0; homeGoals <= maxGoals; homeGoals += 1) {
    for (let awayGoals = 0; awayGoals <= maxGoals; awayGoals += 1) {
      const probability =
        poissonProbability(homeExpectedGoals, homeGoals) *
        poissonProbability(awayExpectedGoals, awayGoals);
      matrix.push({ homeGoals, awayGoals, probability });
      total += probability;
    }
  }
  // The 0-7 grid excludes tiny extreme tails, so the retained grid is normalised.
  return {
    matrix: matrix.map((row) => ({ ...row, probability: total > 0 ? row.probability / total : 0 })),
    rawTotal: total,
  };
}

function getScorelineOutcomeProbabilities(scorelineMatrix) {
  const totals = scorelineMatrix.reduce(
    (sum, row) => {
      if (row.homeGoals > row.awayGoals) sum.home += row.probability;
      else if (row.homeGoals === row.awayGoals) sum.draw += row.probability;
      else sum.away += row.probability;
      return sum;
    },
    { home: 0, draw: 0, away: 0 }
  );
  return normalizeProbabilitySet(totals);
}

function getScoreAtLeastProbability(lambda, threshold) {
  let below = 0;
  for (let goals = 0; goals < threshold; goals += 1) {
    below += poissonProbability(lambda, goals);
  }
  return clampNumber(1 - below, 0, 1);
}

function blendProbabilitySets(primary, secondary, secondaryWeight) {
  const weight = clampNumber(secondaryWeight, 0, 1);
  return normalizeProbabilitySet({
    home: primary.homeProb * (1 - weight) + secondary.homeProb * weight,
    draw: primary.drawProb * (1 - weight) + secondary.drawProb * weight,
    away: primary.awayProb * (1 - weight) + secondary.awayProb * weight,
  });
}

function getFantasyDifficultyScores({
  homeExpectedGoals,
  awayExpectedGoals,
  homeCleanSheetProb,
  awayCleanSheetProb,
  homeScoreTwoPlusProb,
  awayScoreTwoPlusProb,
}) {
  const config = PREMIER_LEAGUE_MODEL_CONFIG;
  const homeAttackRating =
    homeExpectedGoals * config.attackExpectedGoalsWeight +
    homeScoreTwoPlusProb * config.attackScoreTwoPlusWeight;
  const awayAttackRating =
    awayExpectedGoals * config.attackExpectedGoalsWeight +
    awayScoreTwoPlusProb * config.attackScoreTwoPlusWeight;
  const homeDefenceRating =
    homeCleanSheetProb * config.defenceCleanSheetWeight -
    awayExpectedGoals * config.defenceOpponentGoalsWeight +
    1.35;
  const awayDefenceRating =
    awayCleanSheetProb * config.defenceCleanSheetWeight -
    homeExpectedGoals * config.defenceOpponentGoalsWeight +
    1.35;
  return {
    homeAttackDifficultyScore: getAttackDifficultyScore(homeAttackRating),
    awayAttackDifficultyScore: getAttackDifficultyScore(awayAttackRating),
    homeDefenceDifficultyScore: getDefenceDifficultyScore(homeDefenceRating),
    awayDefenceDifficultyScore: getDefenceDifficultyScore(awayDefenceRating),
    homeAttackRating,
    awayAttackRating,
    homeDefenceRating,
    awayDefenceRating,
  };
}

function getModelConfidence(homeProfile, awayProfile, fallbacksUsed) {
  const playedScore = clampNumber(
    ((homeProfile.played + awayProfile.played) / 2 / PREMIER_LEAGUE_MODEL_CONFIG.currentSeasonBlendMatches) * 45,
    0,
    45
  );
  const priorScore = 20 - fallbacksUsed.filter((item) => item.includes("previous_profile")).length * 8;
  const ratingScore = 15 - fallbacksUsed.filter((item) => item.includes("team_rating")).length * 7;
  const formScore = (homeProfile.played > 0 ? 10 : 0) + (awayProfile.played > 0 ? 10 : 0);
  const confidenceScore = Math.round(clampNumber(playedScore + priorScore + ratingScore + formScore, 0, 100));
  return {
    confidence: confidenceScore >= 72 ? "high" : confidenceScore >= 42 ? "medium" : "low",
    confidenceScore,
  };
}

function buildFallbackFixtureModel(reason = "missing_fixture") {
  const probs = normalizeProbabilitySet(PREMIER_LEAGUE_MODEL_CONFIG.neutralProbabilities);
  const homeExpectedPoints = probs.homeProb * 3 + probs.drawProb;
  const awayExpectedPoints = probs.awayProb * 3 + probs.drawProb;
  const neutralGoals = PREMIER_LEAGUE_MODEL_CONFIG.leagueGoalsPerTeam;
  const homeDifficultyScore = getOverallDifficultyScore(homeExpectedPoints);
  const awayDifficultyScore = getOverallDifficultyScore(awayExpectedPoints);
  return {
    ...probs,
    homeExpectedPoints,
    awayExpectedPoints,
    homeDifficultyScore,
    awayDifficultyScore,
    homeDifficultyMeta: getDifficultyMeta(homeDifficultyScore),
    awayDifficultyMeta: getDifficultyMeta(awayDifficultyScore),
    homeExpectedGoals: neutralGoals,
    awayExpectedGoals: neutralGoals,
    homeCleanSheetProb: poissonProbability(neutralGoals, 0),
    awayCleanSheetProb: poissonProbability(neutralGoals, 0),
    homeScoreTwoPlusProb: getScoreAtLeastProbability(neutralGoals, 2),
    awayScoreTwoPlusProb: getScoreAtLeastProbability(neutralGoals, 2),
    homeAttackDifficultyScore: 3,
    awayAttackDifficultyScore: 3,
    homeDefenceDifficultyScore: 3,
    awayDefenceDifficultyScore: 3,
    homeAttackDifficultyMeta: getAttackDifficultyMeta(3),
    awayAttackDifficultyMeta: getAttackDifficultyMeta(3),
    homeDefenceDifficultyMeta: getDefenceDifficultyMeta(3),
    awayDefenceDifficultyMeta: getDefenceDifficultyMeta(3),
    scorelineMatrixTotal: 1,
    scorelineMatrixRawTotal: 1,
    confidence: "low",
    confidenceScore: 0,
    fallbacksUsed: [reason],
    modelInputs: { reason },
    modelVersion: PREMIER_LEAGUE_MODEL_CONFIG.version,
  };
}

export function buildFixtureModel(fixture, context = {}) {
  if (!fixture) {
    return buildFallbackFixtureModel();
  }

  if (isWorldCupFixtureModel(fixture)) {
    return buildWorldCupFixtureModel(fixture);
  }

  const performanceByTeam = context.performanceByTeam || {};
  const homeProfile = buildTeamModelProfile(fixture.homeTeam, performanceByTeam, "home");
  const awayProfile = buildTeamModelProfile(fixture.awayTeam, performanceByTeam, "away");
  const strengthProbabilities = buildResultStrengthProbabilities(homeProfile, awayProfile);
  const { homeExpectedGoals, awayExpectedGoals } = calculateExpectedGoals(homeProfile, awayProfile);
  const scoreline = buildScorelineMatrix(homeExpectedGoals, awayExpectedGoals);
  const scorelineProbabilities = getScorelineOutcomeProbabilities(scoreline.matrix);
  const { homeProb, drawProb, awayProb } = blendProbabilitySets(
    strengthProbabilities,
    scorelineProbabilities,
    PREMIER_LEAGUE_MODEL_CONFIG.scorelineProbabilityBlend
  );

  const homeExpectedPoints = homeProb * 3 + drawProb;
  const awayExpectedPoints = awayProb * 3 + drawProb;
  const homeDifficultyScore = getOverallDifficultyScore(homeExpectedPoints);
  const awayDifficultyScore = getOverallDifficultyScore(awayExpectedPoints);
  const homeCleanSheetProb = poissonProbability(awayExpectedGoals, 0);
  const awayCleanSheetProb = poissonProbability(homeExpectedGoals, 0);
  const homeScoreTwoPlusProb = getScoreAtLeastProbability(homeExpectedGoals, 2);
  const awayScoreTwoPlusProb = getScoreAtLeastProbability(awayExpectedGoals, 2);
  const fantasyDifficulty = getFantasyDifficultyScores({
    homeExpectedGoals,
    awayExpectedGoals,
    homeCleanSheetProb,
    awayCleanSheetProb,
    homeScoreTwoPlusProb,
    awayScoreTwoPlusProb,
  });
  const fallbacksUsed = [...homeProfile.fallbacksUsed, ...awayProfile.fallbacksUsed];
  const confidence = getModelConfidence(homeProfile, awayProfile, fallbacksUsed);

  return {
    homeProb,
    drawProb,
    awayProb,
    homeExpectedPoints,
    awayExpectedPoints,
    homeDifficultyScore,
    awayDifficultyScore,
    homeDifficultyMeta: getDifficultyMeta(homeDifficultyScore),
    awayDifficultyMeta: getDifficultyMeta(awayDifficultyScore),
    homeExpectedGoals,
    awayExpectedGoals,
    homeCleanSheetProb,
    awayCleanSheetProb,
    homeScoreTwoPlusProb,
    awayScoreTwoPlusProb,
    homeAttackDifficultyScore: fantasyDifficulty.homeAttackDifficultyScore,
    awayAttackDifficultyScore: fantasyDifficulty.awayAttackDifficultyScore,
    homeDefenceDifficultyScore: fantasyDifficulty.homeDefenceDifficultyScore,
    awayDefenceDifficultyScore: fantasyDifficulty.awayDefenceDifficultyScore,
    homeAttackDifficultyMeta: getAttackDifficultyMeta(fantasyDifficulty.homeAttackDifficultyScore),
    awayAttackDifficultyMeta: getAttackDifficultyMeta(fantasyDifficulty.awayAttackDifficultyScore),
    homeDefenceDifficultyMeta: getDefenceDifficultyMeta(fantasyDifficulty.homeDefenceDifficultyScore),
    awayDefenceDifficultyMeta: getDefenceDifficultyMeta(fantasyDifficulty.awayDefenceDifficultyScore),
    scorelineMatrixTotal: scoreline.matrix.reduce((sum, row) => sum + row.probability, 0),
    scorelineMatrixRawTotal: scoreline.rawTotal,
    confidence: confidence.confidence,
    confidenceScore: confidence.confidenceScore,
    fallbacksUsed,
    modelInputs: {
      homeProfile,
      awayProfile,
      strengthProbabilities,
      scorelineProbabilities,
      config: PREMIER_LEAGUE_MODEL_CONFIG,
    },
    modelVersion: PREMIER_LEAGUE_MODEL_CONFIG.version,
  };
}

export function buildFixtureModelsByFixture(fixtures = [], context = {}) {
  const out = {};
  (fixtures || []).forEach((fixture) => {
    if (!fixture?.id) return;
    out[fixture.id] = buildFixtureModel(fixture, context);
  });
  return out;
}

export function buildGeneratedModelOdds(fixtures = [], context = {}) {
  const out = {};

  (fixtures || []).forEach((fixture) => {
    const model = buildFixtureModel(fixture, context);
    const overround = PREMIER_LEAGUE_MODEL_CONFIG.oddsOverround;
    out[fixture.id] = {
      home: Number((overround / model.homeProb).toFixed(2)),
      draw: Number((overround / model.drawProb).toFixed(2)),
      away: Number((overround / model.awayProb).toFixed(2)),
      modelProbabilities: {
        home: model.homeProb * 100,
        draw: model.drawProb * 100,
        away: model.awayProb * 100,
      },
      modelVersion: model.modelVersion,
    };
  });

  return out;
}

function buildPremierTeamInsights(teamName, results, context = {}) {
  const canonicalTeamName = resolveCanonicalPremierLeagueTeam(teamName);
  const normalizedTeam = normalizeTeamName(canonicalTeamName);
  const performanceByTeam = context.performanceByTeam || {};

  const form = FIXTURES.filter((fixture) => {
    const isTeamFixture =
      normalizeTeamName(fixture.homeTeam) === normalizedTeam ||
      normalizeTeamName(fixture.awayTeam) === normalizedTeam;
    return isTeamFixture && isFixtureCompleted(fixture, results);
  })
    .sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff))
    .slice(0, 5)
    .map((fixture) => {
      const res = results[fixture.id];
      const isHome = normalizeTeamName(fixture.homeTeam) === normalizedTeam;
      const goalsFor = isHome ? Number(res.homeGoals) : Number(res.awayGoals);
      const goalsAgainst = isHome ? Number(res.awayGoals) : Number(res.homeGoals);
      const opponent = isHome ? fixture.awayTeam : fixture.homeTeam;

      return {
        fixtureId: fixture.id,
        outcome: goalsFor > goalsAgainst ? "W" : goalsFor < goalsAgainst ? "L" : "D",
        opponent,
        opponentCode: getTeamCode(opponent),
        venue: isHome ? "H" : "A",
        scoreText: `${goalsFor}-${goalsAgainst}`,
      };
    });

  const upcoming = FIXTURES.filter((fixture) => {
    const isTeamFixture =
      normalizeTeamName(fixture.homeTeam) === normalizedTeam ||
      normalizeTeamName(fixture.awayTeam) === normalizedTeam;
    return isTeamFixture && !isFixtureCompleted(fixture, results);
  })
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff))
    .slice(0, 5)
    .map((fixture) => {
      const isHome = normalizeTeamName(fixture.homeTeam) === normalizedTeam;
      const opponent = isHome ? fixture.awayTeam : fixture.homeTeam;
      const model = buildFixtureModel(fixture, context);
      const difficultyScore = isHome
        ? model.homeDifficultyScore
        : model.awayDifficultyScore;
      const attackDifficultyScore = isHome
        ? model.homeAttackDifficultyScore
        : model.awayAttackDifficultyScore;
      const defenceDifficultyScore = isHome
        ? model.homeDefenceDifficultyScore
        : model.awayDefenceDifficultyScore;
      const winProbability = isHome ? model.homeProb : model.awayProb;
      const cleanSheetProbability = isHome
        ? model.homeCleanSheetProb
        : model.awayCleanSheetProb;
      const expectedGoals = isHome
        ? model.homeExpectedGoals
        : model.awayExpectedGoals;
      const scoreTwoPlusProbability = isHome
        ? model.homeScoreTwoPlusProb
        : model.awayScoreTwoPlusProb;

      return {
        fixtureId: fixture.id,
        opponent,
        opponentCode: getTeamCode(opponent),
        venue: isHome ? "H" : "A",
        kickoff: fixture.kickoff,
        difficultyScore,
        attackDifficultyScore,
        defenceDifficultyScore,
        winProbability,
        cleanSheetProbability,
        expectedGoals,
        scoreTwoPlusProbability,
        confidence: model.confidence,
        confidenceScore: model.confidenceScore,
        ...getDifficultyMeta(difficultyScore),
      };
    });

  return {
    form,
    upcoming,
    formPoints: Number(performanceByTeam[normalizedTeam]?.formPoints) || 0,
  };
}

export function buildWeightedNextFixtureOutlook(upcomingFixtures = [], horizon = 3) {
  const numericHorizon = Math.max(1, Math.round(Number(horizon) || 3));
  const validFixtures = (upcomingFixtures || [])
    .slice(0, numericHorizon)
    .filter((fixture) =>
      Number.isFinite(Number(fixture?.difficultyScore)) &&
      Number.isFinite(Number(fixture?.attackDifficultyScore)) &&
      Number.isFinite(Number(fixture?.defenceDifficultyScore))
    );
  const weights = getPremierLeagueFixtureWeights(numericHorizon).slice(0, validFixtures.length);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  if (!validFixtures.length || totalWeight <= 0) {
    return {
      fixtureCount: 0,
      confidence: "low",
      validFixtures: [],
      missingFixtureCount: Math.max(0, Math.min(numericHorizon, (upcomingFixtures || []).length) - validFixtures.length),
    };
  }

  const weightedAverage = (selector) =>
    validFixtures.reduce(
      (sum, fixture, index) => sum + Number(selector(fixture) || 0) * (weights[index] / totalWeight),
      0
    );

  return {
    fixtureCount: validFixtures.length,
    confidence: validFixtures.length < numericHorizon ? "medium" : "high",
    validFixtures,
    missingFixtureCount: Math.max(0, Math.min(numericHorizon, (upcomingFixtures || []).length) - validFixtures.length),
    overallDifficulty: weightedAverage((fixture) => fixture.difficultyScore),
    attackDifficulty: weightedAverage((fixture) => fixture.attackDifficultyScore),
    defenceDifficulty: weightedAverage((fixture) => fixture.defenceDifficultyScore),
    winProbability: weightedAverage((fixture) => fixture.winProbability),
    cleanSheetProbability: weightedAverage((fixture) => fixture.cleanSheetProbability),
    expectedGoals: weightedAverage((fixture) => fixture.expectedGoals),
    scoreTwoPlusProbability: weightedAverage((fixture) => fixture.scoreTwoPlusProbability),
  };
}

// ---------------------------------------------------------------------------
const TAGLINES = [
  "Where Every Score Matters",
  "Think You Know Football? Prove It."
];

const randomTagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
export default function App() {
  // Auth state (must be first for use in effects)
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [showSignupPanel, setShowSignupPanel] = useState(false);
  const [soundEffectsEnabled, setSoundEffectsEnabled] = useState(() => {
    try {
      const saved = localStorage.getItem("sound_effects_enabled_v1");
      if (saved === null) return true;
      return saved === "true";
    } catch {}
    return true;
  });
  const playSoundFile = (src, volume = 0.3) => {
    if (!soundEffectsEnabled) return;
    try {
      const audio = new Audio(src);
      audio.volume = volume;
      audio.play().catch((err) => console.log("Audio play failed:", err));
    } catch (err) {
      console.log("Audio error:", err);
    }
  };

  // All users' avatars
  const [avatarsByUserId, setAvatarsByUserId] = useState({});
  const [favoriteTeamsByUserId, setFavoriteTeamsByUserId] = useState({});
  const [favoriteCountriesByUserId, setFavoriteCountriesByUserId] = useState({});
  const [favoriteLookupLoaded, setFavoriteLookupLoaded] = useState(false);

  // On login, fetch all avatars + favourite teams for leaderboard/avatar badge
  useEffect(() => {
    async function loadAllAvatarData() {
      if (!isLoggedIn || !authToken) {
        setAvatarsByUserId({});
        setFavoriteTeamsByUserId({});
        setFavoriteCountriesByUserId({});
        setFavoriteLookupLoaded(false);
        return;
      }

      setFavoriteLookupLoaded(false);
      try {
        const [allAvatars, allFavorites] = await Promise.all([
          apiGetAllAvatars(authToken),
          apiGetAllFavoriteTeams(authToken),
        ]);
        if (allAvatars && typeof allAvatars === "object") {
          setAvatarsByUserId(allAvatars);
        }
        setFavoriteTeamsByUserId(allFavorites?.favoriteTeams || {});
        setFavoriteCountriesByUserId(allFavorites?.favoriteCountries || {});
      } finally {
        setFavoriteLookupLoaded(true);
      }
    }
    loadAllAvatarData();
  }, [isLoggedIn, authToken]);

  // Sound effects for coins
  const playCoinSound = (isAdding) => {
    playSoundFile(isAdding ? "/coin.mp3" : "/negative-sound.MP3", 0.3);
  };

  const playScoreSound = (isAdding) => {
    playSoundFile(isAdding ? "/score-up.MP3" : "/negative-sound.MP3", 0.3);
  };

  const playBadgeWinSound = () => {
    playSoundFile("/badge-win.MP3", 0.45);
  };

  const playSwipeSound = () => {
    playSoundFile("/page-swipe.MP3", 0.24);
  };

  const playFixtureBellSound = (enabled) => {
    playSoundFile(enabled ? "/notification-bell.MP3" : "/negative-sound.MP3", 0.35);
  };

  const updateSoundEffectsEnabled = (enabled) => {
    setSoundEffectsEnabled(enabled);
    localStorage.setItem("sound_effects_enabled_v1", String(enabled));
    if (!enabled && winnerAudioRef.current) {
      winnerAudioRef.current.pause();
      winnerAudioRef.current.currentTime = 0;
    }
  };

  const [currentPlayer, setCurrentPlayer] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupFavoriteTeam, setSignupFavoriteTeam] = useState("");
  const [forgotUsername, setForgotUsername] = useState("");
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotError, setForgotError] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState("");
  const [resetTokenInput, setResetTokenInput] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get("resetToken") || "";
    } catch {
      return "";
    }
  });
  const [resetPasswordInput, setResetPasswordInput] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSuccess, setResetSuccess] = useState("");
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return !!params.get("resetToken");
    } catch {
      return false;
    }
  });
  const [accountEmail, setAccountEmail] = useState("");
  const [accountEmailInput, setAccountEmailInput] = useState("");
  const [accountEmailStatus, setAccountEmailStatus] = useState("");
  const [accountEmailError, setAccountEmailError] = useState("");
  const [accountFavoriteTeam, setAccountFavoriteTeam] = useState("");
  const [accountFavoriteTeamInput, setAccountFavoriteTeamInput] = useState("");
  const [accountFavoriteCountry, setAccountFavoriteCountry] = useState("");
  const [accountFavoriteCountryInput, setAccountFavoriteCountryInput] = useState("");
  const [accountFavoriteTeamStatus, setAccountFavoriteTeamStatus] = useState("");
  const [accountFavoriteTeamError, setAccountFavoriteTeamError] = useState("");
  const [accountMeLoaded, setAccountMeLoaded] = useState(false);
  const [showWorldCupFavoritePrompt, setShowWorldCupFavoritePrompt] = useState(false);

  // Avatar customization
  const [avatarSeed, setAvatarSeed] = useState(localStorage.getItem('avatar_seed') || '');
  const [avatarStyle, setAvatarStyle] = useState(localStorage.getItem('avatar_style') || 'avataaars');
  const [avatarSaveStatus, setAvatarSaveStatus] = useState("");

  // On login, try to load avatar from backend, fallback to localStorage
  useEffect(() => {
    async function loadAvatar() {
      if (isLoggedIn && authToken) {
        const remote = await apiGetAvatar(authToken);
        if (remote && remote.seed) {
          setAvatarSeed(remote.seed);
          localStorage.setItem('avatar_seed', remote.seed);
        }
        if (remote && remote.style) {
          setAvatarStyle(remote.style);
          localStorage.setItem('avatar_style', remote.style);
        }
      }
    }
    loadAvatar();
  }, [isLoggedIn, authToken]);

  // Save avatar to localStorage and backend (if logged in)
  async function handleAvatarChange(newSeed, newStyle) {
    const savedSeed = newSeed || currentPlayer;
    const savedStyle = newStyle || "avataaars";
    setAvatarSeed(savedSeed);
    setAvatarStyle(savedStyle);
    localStorage.setItem('avatar_seed', savedSeed);
    localStorage.setItem('avatar_style', savedStyle);

    if (!isLoggedIn || !authToken) return;

    setAvatarSaveStatus("Saving avatar...");
    try {
      await apiSetAvatar(authToken, { seed: savedSeed, style: savedStyle });
      if (currentUserId) {
        setAvatarsByUserId((prev) => ({
          ...prev,
          [String(currentUserId)]: { seed: savedSeed, style: savedStyle },
        }));
      }
      setAvatarSaveStatus("Avatar saved. Other players will see this one.");
    } catch (err) {
      setAvatarSaveStatus(err?.message || "Avatar save failed. Other players may still see your old avatar.");
    }
  }
  
  // Change password modal state
const [showPasswordModal, setShowPasswordModal] = useState(false);
const [oldPasswordInput, setOldPasswordInput] = useState("");
const [newPasswordInput, setNewPasswordInput] = useState("");
const [passwordError, setPasswordError] = useState("");
const [passwordSuccess, setPasswordSuccess] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authHydrated, setAuthHydrated] = useState(false);
  const [welcomePendingUserId, setWelcomePendingUserId] = useState(() => {
    try {
      return localStorage.getItem(WELCOME_PENDING_STORAGE_KEY) || "";
    } catch {
      return "";
    }
  });

  // App state
  const [predictions, setPredictions] = useState({});
  const [results, setResults] = useState({});
  const [matchStatesByFixtureId, setMatchStatesByFixtureId] = useState({});
  const [odds, setOdds] = useState({});
  const [fixtureOverridesByMode, setFixtureOverridesByMode] = useState(() => ({
    [PREMIER_MODE]: {},
    [WORLD_CUP_MODE]: {},
  }));
  const [gameMode, setGameMode] = useState(() => {
    try {
      return localStorage.getItem(GAME_MODE_STORAGE_KEY) || PREMIER_MODE;
    } catch {
      return PREMIER_MODE;
    }
  });
  const [selectedGameweek, setSelectedGameweek] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        const gw = Number(parsed?.selectedGameweek);
        if (Number.isFinite(gw) && gw > 0) return gw;
      }
    } catch {}
    return GAMEWEEKS[0];
  });
  const [selectedGameweekByMode, setSelectedGameweekByMode] = useState(() => {
    try {
      const saved = localStorage.getItem(GAMEWEEK_BY_MODE_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === "object") {
          return {
            [PREMIER_MODE]: Number(parsed[PREMIER_MODE]) || GAMEWEEKS[0],
            [WORLD_CUP_MODE]: Number(parsed[WORLD_CUP_MODE]) || WORLD_CUP_GAMEWEEKS[0],
          };
        }
      }
      const legacySaved = localStorage.getItem(STORAGE_KEY);
      if (legacySaved) {
        const parsedLegacy = JSON.parse(legacySaved);
        const legacySelected = Number(parsedLegacy?.selectedGameweek);
        if (Number.isFinite(legacySelected) && legacySelected > 0) {
          return {
            [PREMIER_MODE]: legacySelected,
            [WORLD_CUP_MODE]: WORLD_CUP_GAMEWEEKS[0],
          };
        }
      }
    } catch {}
    return {
      [PREMIER_MODE]: GAMEWEEKS[0],
      [WORLD_CUP_MODE]: WORLD_CUP_GAMEWEEKS[0],
    };
  });
  const [fixtureAdvanceWarningDismissedKey, setFixtureAdvanceWarningDismissedKey] = useState("");
  const modeSwitchSyncRef = useRef(false);
  const isWorldCupMode = gameMode === WORLD_CUP_MODE;
  const activeFixtures = useMemo(() => {
    const baseFixtures = getFixturesForMode(gameMode);
    const overrides = fixtureOverridesByMode[gameMode] || {};
    const mergedFixtures = baseFixtures.map((fixture) => {
      const override = overrides[fixture.id];
      return override ? { ...fixture, ...override } : fixture;
    });
    return sortFixturesByOrderOfPlay(mergedFixtures);
  }, [gameMode, fixtureOverridesByMode]);
  const activeGameweeks = useMemo(
    () => (isWorldCupMode ? WORLD_CUP_GAMEWEEKS : GAMEWEEKS),
    [isWorldCupMode]
  );
  const livePredictionGameweek = useMemo(
    () => (
      isWorldCupMode
        ? null
        : getPredictionLandingGameweek(activeFixtures, activeGameweeks)
    ),
    [isWorldCupMode, activeFixtures, activeGameweeks]
  );
  const fixtureAdvanceWarningKey =
    !isWorldCupMode && livePredictionGameweek && selectedGameweek
      ? `${livePredictionGameweek}:${selectedGameweek}`
      : "";
  
  // Push notification state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  const [fixturePushPrefs, setFixturePushPrefs] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(FIXTURE_PUSH_STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  });
  const [pushPrefs, setPushPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem("push_prefs_v1");
      if (saved) return { ...DEFAULT_PUSH_PREFS, ...JSON.parse(saved) };
    } catch {}
    return DEFAULT_PUSH_PREFS;
  });
  
  const [, setApiStatus] = useState("Auto results: loading…");
  const [resultsRefreshing, setResultsRefreshing] = useState(false);
  const [premierLeagueTableView, setPremierLeagueTableView] = useState(PREMIER_TABLE_CURRENT_VIEW);
  const [premierLeagueTableRows, setPremierLeagueTableRows] = useState([]);
  const [premierLeagueTableLoading, setPremierLeagueTableLoading] = useState(false);
  const [premierLeagueTableError, setPremierLeagueTableError] = useState("");
  const [lastStandingsUpdated, setLastStandingsUpdated] = useState(null);
  const [expandedPremierTeam, setExpandedPremierTeam] = useState("");
  const [activeView, setActiveView] = useState(() => {
    const saved = localStorage.getItem('activeView');
    return saved || "predictions";
  });
  const shouldShowFixtureAdvanceWarning = useMemo(() => {
    if (!fixtureAdvanceWarningKey || activeView !== "predictions") return false;
    const liveIndex = activeGameweeks.indexOf(livePredictionGameweek);
    const selectedIndex = activeGameweeks.indexOf(selectedGameweek);
    return (
      liveIndex >= 0 &&
      selectedIndex >= 0 &&
      selectedIndex - liveIndex === 2 &&
      fixtureAdvanceWarningDismissedKey !== fixtureAdvanceWarningKey
    );
  }, [
    activeView,
    activeGameweeks,
    fixtureAdvanceWarningDismissedKey,
    fixtureAdvanceWarningKey,
    livePredictionGameweek,
    selectedGameweek,
  ]);
  const [historySectionsOpen, setHistorySectionsOpen] = useState({
    seasonWinners: true,
    weeklyScores: false,
  });
  const [seasonWinnerHistory, setSeasonWinnerHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(SEASON_WINNERS_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return mergeSeasonWinnerRecords(
        [PREMIER_SEASON_WINNER_RECORD],
        Array.isArray(parsed) ? parsed : []
      );
    } catch {
      return [PREMIER_SEASON_WINNER_RECORD];
    }
  });
  const [badgeHistory, setBadgeHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(BADGE_HISTORY_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : [];
      return mergeBadgeHistoryRecords(Array.isArray(parsed) ? parsed : [], []);
    } catch {
      return [];
    }
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showLeaguesMenu, setShowLeaguesMenu] = useState(false);
  const [worldCupCentralOpen, setWorldCupCentralOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(WORLD_CUP_CENTRAL_OPEN_STORAGE_KEY);
      return saved == null ? true : saved === "true";
    } catch {
      return true;
    }
  });
  const [computedWeeklyTotals, setComputedWeeklyTotals] = useState(null);
  const [computedLeagueTotals, setComputedLeagueTotals] = useState(null);
  const [computedTotalsLeagueId, setComputedTotalsLeagueId] = useState("");
  const [leagueUsernamesByUserId, setLeagueUsernamesByUserId] = useState({});
  const [leagueHistoryUsers, setLeagueHistoryUsers] = useState([]);
  const [leaguePredictionsByUserId, setLeaguePredictionsByUserId] = useState({});
  const [expandedPlayerRowKey, setExpandedPlayerRowKey] = useState("");
  const [countdown, setCountdown] = useState({ timeStr: "", progress: 0, totalTime: 0, remaining: 0 });
  const isResetPasswordRoute = useMemo(() => {
    try {
      const clean = (window.location.pathname || "").replace(/\/+$/, "") || "/";
      return clean === "/reset-password";
    } catch {
      return false;
    }
  }, []);

  const leaguePerformanceContext = useMemo(
    () => ({ performanceByTeam: buildLeaguePerformanceContext(results) }),
    [results]
  );

  const generatedModelOddsByFixture = useMemo(() => {
    const fixturesWithResolvedTeams = [
      ...FIXTURES.map((fixture) => ({
        ...fixture,
        ...(fixtureOverridesByMode[PREMIER_MODE]?.[fixture.id] || {}),
      })),
      ...WORLD_CUP_FIXTURES.map((fixture) => ({
        ...fixture,
        ...(fixtureOverridesByMode[WORLD_CUP_MODE]?.[fixture.id] || {}),
      })),
    ];

    return buildGeneratedModelOdds(fixturesWithResolvedTeams, leaguePerformanceContext);
  }, [fixtureOverridesByMode, leaguePerformanceContext]);

  const generatedFixtureModelsByFixture = useMemo(() => {
    const fixturesWithResolvedTeams = [
      ...FIXTURES.map((fixture) => ({
        ...fixture,
        ...(fixtureOverridesByMode[PREMIER_MODE]?.[fixture.id] || {}),
      })),
      ...WORLD_CUP_FIXTURES.map((fixture) => ({
        ...fixture,
        ...(fixtureOverridesByMode[WORLD_CUP_MODE]?.[fixture.id] || {}),
      })),
    ];

    return buildFixtureModelsByFixture(fixturesWithResolvedTeams, leaguePerformanceContext);
  }, [fixtureOverridesByMode, leaguePerformanceContext]);

  // Save activeView to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeView', activeView);
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem(SEASON_WINNERS_STORAGE_KEY, JSON.stringify(seasonWinnerHistory));
  }, [seasonWinnerHistory]);

  useEffect(() => {
    localStorage.setItem(BADGE_HISTORY_STORAGE_KEY, JSON.stringify(badgeHistory));
  }, [badgeHistory]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remoteRecords = await apiGetBadgeHistory();
      if (cancelled || !remoteRecords.length) return;
      setBadgeHistory((prev) => mergeBadgeHistoryRecords(prev, remoteRecords));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remoteRecords = await apiGetSeasonWinners();
      if (cancelled || !remoteRecords.length) return;
      setSeasonWinnerHistory((prev) => mergeSeasonWinnerRecords(prev, remoteRecords));
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(GAME_MODE_STORAGE_KEY, gameMode);
  }, [gameMode]);

  useEffect(() => {
    localStorage.setItem(WORLD_CUP_CENTRAL_OPEN_STORAGE_KEY, String(worldCupCentralOpen));
  }, [worldCupCentralOpen]);

  useEffect(() => {
    try {
      if (welcomePendingUserId) {
        localStorage.setItem(WELCOME_PENDING_STORAGE_KEY, welcomePendingUserId);
      } else {
        localStorage.removeItem(WELCOME_PENDING_STORAGE_KEY);
      }
    } catch {}
  }, [welcomePendingUserId]);

  useEffect(() => {
    const remembered = selectedGameweekByMode[gameMode];
    if (remembered && activeGameweeks.includes(remembered) && remembered !== selectedGameweek) {
      modeSwitchSyncRef.current = true;
      setSelectedGameweek(remembered);
      return;
    }
    if (activeGameweeks.includes(selectedGameweek)) return;
    modeSwitchSyncRef.current = true;
    setSelectedGameweek(activeGameweeks[0] || 1);
  }, [activeGameweeks, selectedGameweekByMode, gameMode]);

  useEffect(() => {
    if (!selectedGameweek || !activeGameweeks.includes(selectedGameweek)) return;
    if (modeSwitchSyncRef.current) {
      modeSwitchSyncRef.current = false;
      return;
    }
    setSelectedGameweekByMode((prev) => {
      if (prev[gameMode] === selectedGameweek) return prev;
      return {
        ...prev,
        [gameMode]: selectedGameweek,
      };
    });
  }, [selectedGameweek, gameMode, activeGameweeks]);

  useEffect(() => {
    localStorage.setItem(
      GAMEWEEK_BY_MODE_STORAGE_KEY,
      JSON.stringify(selectedGameweekByMode)
    );
  }, [selectedGameweekByMode]);

  useEffect(() => {
    if (!isWorldCupMode) return;
    if (["premierLeagueTable", "predictionIq"].includes(activeView)) {
      setActiveView("predictions");
    }
  }, [isWorldCupMode, activeView]);

  useEffect(() => {
    setShowLeaguesMenu(false);
  }, [activeView]);

  // Countdown timer to next deadline
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      
      // Find the next upcoming fixture across ALL gameweeks
      const allUpcomingFixtures = activeFixtures
        .filter((f) => {
          const kickoff = new Date(f.kickoff).getTime();
          const targetTime = isWorldCupMode ? kickoff : kickoff - 60 * 60 * 1000;
          return targetTime > now;
        })
        .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
      
      if (allUpcomingFixtures.length === 0) {
        setCountdown({ timeStr: "", progress: 0, totalTime: 0, remaining: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      // Get the first upcoming fixture
      const nextFixture = allUpcomingFixtures[0];
      const targetTime = isWorldCupMode
        ? new Date(nextFixture.kickoff).getTime()
        : new Date(nextFixture.kickoff).getTime() - 60 * 60 * 1000;
      const diff = targetTime - now;
      
      if (diff <= 0) {
        setCountdown({ timeStr: "", progress: 0, totalTime: 0, remaining: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      // Calculate progress - assume 7 days between gameweeks
      const sevenDays = 7 * 24 * 60 * 60 * 1000;
      const totalTime = sevenDays;
      const elapsed = Math.max(0, sevenDays - diff);
      const progress = Math.min(100, Math.max(0, (elapsed / totalTime) * 100));
      
      // Format as DD:HH:MM:SS
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      
      const timeStr = `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      
      setCountdown({ timeStr, progress, totalTime, remaining: diff, days, hours, minutes, seconds });
    };
    
    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [activeFixtures, isWorldCupMode]);

  // If we don't have any odds yet, generate free built-in odds for all fixtures
  useEffect(() => {
    if (odds && Object.keys(odds).length > 0) return;
    setOdds(generatedModelOddsByFixture);
  }, [odds, generatedModelOddsByFixture]);

// Coins League data from backend
  const [coinsLeagueRows, setCoinsLeagueRows] = useState([]);
  const [globalUsers, setGlobalUsers] = useState([]);
  const [globalPredictionsByUserId, setGlobalPredictionsByUserId] = useState({});
  const [showWinnerModal, setShowWinnerModal] = useState(false);
  const [winnerList, setWinnerList] = useState([]);
  const [winnerIndex, setWinnerIndex] = useState(0);
  const [winnerModalType, setWinnerModalType] = useState("gw");
  const [winnerPopupCheckCount, setWinnerPopupCheckCount] = useState(0);
  const [fantasyIqAnalysisPanel, setFantasyIqAnalysisPanel] = useState("home");
  const [fantasySuggestedTeamStyle, setFantasySuggestedTeamStyle] = useState("balanced");
  const [fantasyInsightsScope, setFantasyInsightsScope] = useState("gameweek");
  const fantasyIqUserIdentifier = useMemo(
    () => currentUserId || currentPlayer || loginName || "guest",
    [currentUserId, currentPlayer, loginName]
  );
  const [fantasyIqSquad, setFantasyIqSquad] = useState(() =>
    loadFantasyIqSquad("guest")
  );
  const [fantasyIqEditingSquad, setFantasyIqEditingSquad] = useState(() =>
    createEmptyFantasyIqSquad()
  );
  const [fantasyIqBuilderOpen, setFantasyIqBuilderOpen] = useState(false);
  const [fantasyIqUnsavedChanges, setFantasyIqUnsavedChanges] = useState(false);
  const [fantasyIqConfirmAttempted, setFantasyIqConfirmAttempted] = useState(false);
  const [fantasyIqSquadStatus, setFantasyIqSquadStatus] = useState("");
  const [fantasyIqPlayerSearch, setFantasyIqPlayerSearch] = useState("");
  const [fantasyIqPositionFilter, setFantasyIqPositionFilter] = useState("ALL");
  const [fantasyIqTeamFilter, setFantasyIqTeamFilter] = useState("ALL");
  const [fantasyScreenshotImportOpen, setFantasyScreenshotImportOpen] = useState(false);
  const [fantasyScreenshotImportState, setFantasyScreenshotImportState] = useState("idle");
  const [fantasyScreenshotFile, setFantasyScreenshotFile] = useState(null);
  const [fantasyScreenshotPreviewUrl, setFantasyScreenshotPreviewUrl] = useState("");
  const [fantasyScreenshotImageMetadata, setFantasyScreenshotImageMetadata] = useState(null);
  const [fantasyScreenshotReview, setFantasyScreenshotReview] = useState(null);
  const [fantasyScreenshotError, setFantasyScreenshotError] = useState("");
  const [fantasyScreenshotStatusText, setFantasyScreenshotStatusText] = useState("");
  const [fantasyScreenshotProgress, setFantasyScreenshotProgress] = useState(0);
  const [fantasyScreenshotReplacePending, setFantasyScreenshotReplacePending] = useState(false);
  const [fantasyScreenshotSlotSearch, setFantasyScreenshotSlotSearch] = useState({});
  const [fantasyScreenshotImportSummary, setFantasyScreenshotImportSummary] = useState(null);
  const [fantasyScreenshotFeedbackRating, setFantasyScreenshotFeedbackRating] = useState("");
  const [fantasyScreenshotFeedbackNote, setFantasyScreenshotFeedbackNote] = useState("");
  const [fantasyScreenshotPostImportSummary, setFantasyScreenshotPostImportSummary] = useState(() => loadFantasyScreenshotFeedbackSummary());
  const [fantasyScreenshotPreviewCollapsed, setFantasyScreenshotPreviewCollapsed] = useState(false);

  const [fantasyTransferIqState, setFantasyTransferIqState] = useState(null);
  const [fantasyTransferOutFilter, setFantasyTransferOutFilter] = useState("ALL");
  const [fantasyTransferRoleFilter, setFantasyTransferRoleFilter] = useState("ALL");
  const [fantasyTransferClubFilter, setFantasyTransferClubFilter] = useState("ALL");
  const [fantasyTransferInSearch, setFantasyTransferInSearch] = useState("");
  const [fantasyTransferInTeamFilter, setFantasyTransferInTeamFilter] = useState("ALL");
  const [fantasyTransferShowAllCategories, setFantasyTransferShowAllCategories] = useState(false);
  const [fantasyTransferApplyPending, setFantasyTransferApplyPending] = useState(false);
  const [fantasyTransferRecommendationCount, setFantasyTransferRecommendationCount] = useState("1");
  const [fantasyTransferRecommendations, setFantasyTransferRecommendations] = useState(null);
  const [fantasyTransferRecommendationApplyId, setFantasyTransferRecommendationApplyId] = useState("");
  const [fantasyLineupIqState, setFantasyLineupIqState] = useState(null);
  const [fantasyLineupApplyMode, setFantasyLineupApplyMode] = useState(null);
  const [fantasyLineupManualMode, setFantasyLineupManualMode] = useState(false);
  const [fantasyIqHistory, setFantasyIqHistory] = useState(() =>
    loadFantasyIqHistory("guest")
  );
  const [fantasyIqHistoryDuplicate, setFantasyIqHistoryDuplicate] = useState(null);
  const [fantasyIqHistoryExpandedId, setFantasyIqHistoryExpandedId] = useState(null);
  const [fantasyIqHistoryTrendMetric, setFantasyIqHistoryTrendMetric] = useState("overallScore");
  const [fantasyIqHistoryPrompt, setFantasyIqHistoryPrompt] = useState(null);
  const [fantasyIqHistoryStatus, setFantasyIqHistoryStatus] = useState("");
  const fantasyScreenshotObjectUrlRef = useRef("");
  const fantasyScreenshotAbortRef = useRef(null);
  const fantasyScreenshotImportRunIdRef = useRef(0);
  const fantasyScreenshotManualCorrectionCountRef = useRef(0);
  const fantasyIqHeaderRef = useRef(null);
  const fantasyIqOverviewRef = useRef(null);
  const fantasyIqPendingHeaderScrollRef = useRef(false);
  const [fantasyPlayerData, setFantasyPlayerData] = useState(() => ({
    ...FANTASY_IQ_FALLBACK_PLAYER_DATASET,
    status: "loading",
    cacheStatus: "fallback",
    fallbackReason: "Loading player list.",
    error: null,
  }));
  const [fantasyPlayerDataRefreshing, setFantasyPlayerDataRefreshing] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const debugEnabled =
      process.env.NODE_ENV === "development" ||
      new URLSearchParams(window.location.search || "").get("fantasyIqDebug") === "1" ||
      window.localStorage?.getItem?.("predictionAddiction:fantasyIqDebug") === "1";
    if (!debugEnabled) return undefined;
    window.__predictionAddictionFantasyScreenshotReview = fantasyScreenshotReview;
    window.__predictionAddictionFantasyScreenshotImportState = fantasyScreenshotImportState;
    window.__predictionAddictionFantasyScreenshotImportSummary = fantasyScreenshotImportSummary;
    window.__predictionAddictionFantasyPlayerData = {
      status: fantasyPlayerData.status,
      cacheStatus: fantasyPlayerData.cacheStatus,
      source: fantasyPlayerData.source,
      fetchedAt: fantasyPlayerData.fetchedAt,
      playerCount: fantasyPlayerData.players?.length || 0,
      teamCount: fantasyPlayerData.teams?.length || 0,
      schemaVersion: FANTASY_PLAYER_DATA_SCHEMA_VERSION,
      cacheKey: FANTASY_PLAYER_DATA_CACHE_KEY,
      error: fantasyPlayerData.error || null,
    };
    return () => {
      delete window.__predictionAddictionFantasyScreenshotReview;
      delete window.__predictionAddictionFantasyScreenshotImportState;
      delete window.__predictionAddictionFantasyScreenshotImportSummary;
      delete window.__predictionAddictionFantasyPlayerData;
    };
  }, [fantasyPlayerData, fantasyScreenshotImportState, fantasyScreenshotImportSummary, fantasyScreenshotReview]);
  const fantasyIqSquadValidation = useMemo(
    () => validateFantasyIqSquad(fantasyIqSquad),
    [fantasyIqSquad]
  );
  const fantasyIqEditingValidation = useMemo(
    () => validateFantasyIqSquad(fantasyIqEditingSquad),
    [fantasyIqEditingSquad]
  );
  const refreshFantasyPlayerData = async ({ forceRefresh = false, signal } = {}) => {
    setFantasyPlayerDataRefreshing(true);
    try {
      const dataset = await loadFantasyPlayerData({
        fallbackDataset: FANTASY_IQ_FALLBACK_PLAYER_DATASET,
        forceRefresh,
        signal,
      });
      setFantasyPlayerData(dataset);
      setFantasyIqSquad((currentSquad) => {
        const reconciled = normaliseFantasyIqSquad(
          reconcileFantasyIqSquadWithPlayerData(currentSquad, dataset)
        );
        if (JSON.stringify(reconciled) !== JSON.stringify(currentSquad)) {
          try {
            saveFantasyIqSquad(fantasyIqUserIdentifier, reconciled);
          } catch {}
        }
        return reconciled;
      });
      setFantasyIqEditingSquad((currentSquad) => {
        if (fantasyIqBuilderOpen) {
          return normaliseFantasyIqSquad(
            reconcileFantasyIqSquadWithPlayerData(currentSquad, dataset)
          );
        }
        return currentSquad;
      });
      return dataset;
    } finally {
      setFantasyPlayerDataRefreshing(false);
    }
  };
  const [showPredictionIqModal, setShowPredictionIqModal] = useState(false);
  const [predictionIqPendingAfterWinner, setPredictionIqPendingAfterWinner] = useState(false);
  const [predictionIqDemo, setPredictionIqDemo] = useState(false);
  const [badgeAwardBadges, setBadgeAwardBadges] = useState([]);
  const badgeHistorySaveSignatureRef = useRef("");
  const swipeStartRef = useRef(null);
  const winnerAudioRef = useRef(null);

  useEffect(() => {
    const savedSquad = loadFantasyIqSquad(fantasyIqUserIdentifier);
    const reconciledSquad =
      fantasyPlayerData.status === "loading"
        ? savedSquad
        : normaliseFantasyIqSquad(reconcileFantasyIqSquadWithPlayerData(savedSquad, fantasyPlayerData));
    setFantasyIqSquad(reconciledSquad);
    if (!fantasyIqBuilderOpen) {
      setFantasyIqEditingSquad(reconciledSquad);
      setFantasyIqUnsavedChanges(false);
      setFantasyIqConfirmAttempted(false);
    }
  }, [fantasyIqUserIdentifier, fantasyIqBuilderOpen, fantasyPlayerData]);

  useEffect(() => {
    const loadedHistory = loadFantasyIqHistory(fantasyIqUserIdentifier);
    setFantasyIqHistory(loadedHistory);
    setFantasyIqHistoryDuplicate(null);
    setFantasyIqHistoryExpandedId(null);
    setFantasyIqHistoryPrompt(null);
    setFantasyIqHistoryStatus("");
  }, [fantasyIqUserIdentifier]);

  useEffect(() => {
    const controller = new AbortController();
    refreshFantasyPlayerData({ signal: controller.signal }).catch((error) => {
      if (error?.name !== "AbortError") {
        setFantasyPlayerData((current) => ({
          ...current,
          status: "fallback",
          error: error?.message || "Player data refresh failed.",
        }));
      }
    });
    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    return () => {
      if (fantasyScreenshotObjectUrlRef.current) {
        URL.revokeObjectURL(fantasyScreenshotObjectUrlRef.current);
        fantasyScreenshotObjectUrlRef.current = "";
      }
      fantasyScreenshotAbortRef.current?.abort?.();
    };
  }, []);

  const resetFantasyScreenshotImport = (state = "idle") => {
    fantasyScreenshotImportRunIdRef.current += 1;
    fantasyScreenshotAbortRef.current?.abort?.();
    fantasyScreenshotAbortRef.current = null;
    if (fantasyScreenshotObjectUrlRef.current) {
      URL.revokeObjectURL(fantasyScreenshotObjectUrlRef.current);
      fantasyScreenshotObjectUrlRef.current = "";
    }
    setFantasyScreenshotFile(null);
    setFantasyScreenshotPreviewUrl("");
    setFantasyScreenshotImageMetadata(null);
    setFantasyScreenshotReview(null);
    setFantasyScreenshotError("");
    setFantasyScreenshotStatusText("");
    setFantasyScreenshotProgress(0);
    setFantasyScreenshotReplacePending(false);
    setFantasyScreenshotSlotSearch({});
    setFantasyScreenshotImportSummary(null);
    setFantasyScreenshotFeedbackRating("");
    setFantasyScreenshotFeedbackNote("");
    setFantasyScreenshotPreviewCollapsed(false);
    fantasyScreenshotManualCorrectionCountRef.current = 0;
    setFantasyScreenshotImportState(state);
  };

  const openFantasyScreenshotImport = () => {
    resetFantasyScreenshotImport("idle");
    setFantasyIqBuilderOpen(false);
    setFantasyIqAnalysisPanel("team");
    setFantasyScreenshotImportOpen(true);
  };

  const closeFantasyScreenshotImport = () => {
    resetFantasyScreenshotImport("cancelled");
    setFantasyScreenshotImportOpen(false);
  };

  const handleFantasyScreenshotFile = async (file) => {
    resetFantasyScreenshotImport("validating");
    setFantasyScreenshotImportOpen(true);
    const fileValidation = validateFantasyScreenshotFile(file);
    if (!fileValidation.valid) {
      setFantasyScreenshotError(fileValidation.errors.join(" "));
      setFantasyScreenshotImportState("failed");
      return;
    }
    let objectUrl = "";
    try {
      objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.decoding = "async";
      await new Promise((resolve, reject) => {
        image.onload = resolve;
        image.onerror = () => reject(new Error("The screenshot could not be decoded."));
        image.src = objectUrl;
      });
      const metadata = {
        name: file.name,
        type: file.type,
        size: file.size,
        width: image.naturalWidth,
        height: image.naturalHeight,
      };
      const dimensionValidation = validateFantasyScreenshotDimensions(metadata);
      if (!dimensionValidation.valid) {
        URL.revokeObjectURL(objectUrl);
        setFantasyScreenshotError(dimensionValidation.errors.join(" "));
        setFantasyScreenshotImportState("failed");
        return;
      }
      fantasyScreenshotObjectUrlRef.current = objectUrl;
      setFantasyScreenshotFile(file);
      setFantasyScreenshotPreviewUrl(objectUrl);
      setFantasyScreenshotImageMetadata(metadata);
      setFantasyScreenshotImportState("image selected");
      setFantasyScreenshotStatusText("Ready to analyse");
      setFantasyScreenshotProgress(0);
    } catch (error) {
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
      setFantasyScreenshotError(error?.message || "The screenshot could not be decoded.");
      setFantasyScreenshotImportState("failed");
    }
  };

  const analyseFantasyScreenshot = async () => {
    if (!fantasyScreenshotFile) {
      setFantasyScreenshotError("Select a screenshot before analysis.");
      return;
    }
    fantasyScreenshotAbortRef.current?.abort?.();
    const runId = fantasyScreenshotImportRunIdRef.current + 1;
    fantasyScreenshotImportRunIdRef.current = runId;
    const controller = new AbortController();
    fantasyScreenshotAbortRef.current = controller;
    const startedAt = performance.now();
    let decoded = null;
    let progressTimer = null;
    try {
      setFantasyScreenshotError("");
      setFantasyScreenshotReview(null);
      setFantasyScreenshotImportSummary(null);
      setFantasyScreenshotImportState("preprocessing");
      setFantasyScreenshotStatusText("");
      setFantasyScreenshotProgress(12);
      let screenshotPlayerData = fantasyPlayerData;
      if (
        fantasyPlayerData.status === "loading" ||
        fantasyPlayerData.cacheStatus === "fallback" ||
        !(fantasyPlayerData.players || []).length
      ) {
        setFantasyScreenshotStatusText("Updating player list");
        screenshotPlayerData = await refreshFantasyPlayerData({
          forceRefresh: fantasyPlayerData.cacheStatus === "fallback" || !(fantasyPlayerData.players || []).length,
          signal: controller.signal,
        });
        if (runId !== fantasyScreenshotImportRunIdRef.current) throw new DOMException("OCR cancelled", "AbortError");
      }
      if (
        screenshotPlayerData.cacheStatus === "fallback" ||
        screenshotPlayerData.source === "temporary-development-fallback"
      ) {
        throw new Error("Live FPL player data could not be loaded. Refresh the player list and try the screenshot again.");
      }
      decoded = await decodeFantasyScreenshotImage(fantasyScreenshotFile);
      if (runId !== fantasyScreenshotImportRunIdRef.current) throw new DOMException("OCR cancelled", "AbortError");
      setFantasyScreenshotImportState("extracting text");
      setFantasyScreenshotProgress(32);
      progressTimer = window.setInterval(() => {
        if (runId !== fantasyScreenshotImportRunIdRef.current) return;
        setFantasyScreenshotProgress((progress) => Math.min(92, Math.max(32, Number(progress) || 32) + 2));
      }, 900);
      const ocrAttempt = await runFantasyScreenshotOcrWithFallback({
        ...decoded,
        url: fantasyScreenshotPreviewUrl,
      }, {
        players: screenshotPlayerData.players || [],
        teams: screenshotPlayerData.teams || [],
        imageMetadata: fantasyScreenshotImageMetadata,
        signal: controller.signal,
        onStatus: () => {
          setFantasyScreenshotProgress((progress) => Math.min(92, Math.max(32, Number(progress) || 32) + 1));
        },
      });
      if (runId !== fantasyScreenshotImportRunIdRef.current) throw new DOMException("OCR cancelled", "AbortError");
      if (progressTimer) {
        window.clearInterval(progressTimer);
        progressTimer = null;
      }
      setFantasyScreenshotImportState("matching players");
      setFantasyScreenshotProgress(82);
      const review = {
        ...ocrAttempt.review,
        imageMetadata: {
          ...ocrAttempt.review.imageMetadata,
          ocrDurationMs: Math.round(performance.now() - startedAt),
          fallbackAttempted: ocrAttempt.variant !== FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.primaryVariant,
          quality: ocrAttempt.quality,
        },
      };
      const importSummary = createFantasyScreenshotImportSummary({
        imageMetadata: fantasyScreenshotImageMetadata,
        processingDurationMs: performance.now() - startedAt,
        review,
        manuallyCorrectedCount: fantasyScreenshotManualCorrectionCountRef.current,
        finalValidSquad: false,
        errorCode: review.extractedSlots.length ? null : "NO_CANDIDATES",
      });
      if (!review.extractedSlots.length) {
        setFantasyScreenshotError("We could not read enough player information from this screenshot.");
      } else if (review.extractedSlots.length < 5) {
        setFantasyScreenshotError("Only a few players were detected. You can continue to review partial results or replace the screenshot.");
      }
      setFantasyScreenshotReview(review);
      setFantasyScreenshotImportSummary(importSummary);
      setFantasyScreenshotImportState(review.extractedSlots.length ? "needs review" : "failed");
      setFantasyScreenshotProgress(100);
      setFantasyScreenshotStatusText(
        review.extractedSlots.length
          ? "Ready for review"
          : "Try a sharper full-squad screenshot or use manual entry."
      );
    } catch (error) {
      if (runId !== fantasyScreenshotImportRunIdRef.current) return;
      const errorCode = error?.name === "AbortError" ? "CANCELLED" : "OCR_FAILED";
      setFantasyScreenshotImportSummary(createFantasyScreenshotImportSummary({
        imageMetadata: fantasyScreenshotImageMetadata,
        processingDurationMs: performance.now() - startedAt,
        errorCode,
      }));
      if (error?.name === "AbortError") {
        setFantasyScreenshotImportState("cancelled");
        setFantasyScreenshotProgress(0);
        setFantasyScreenshotStatusText("Analysis cancelled. Replace the screenshot or retry.");
      } else {
        setFantasyScreenshotImportState("failed");
        setFantasyScreenshotProgress(0);
        setFantasyScreenshotError(error?.message || "Screenshot analysis failed.");
        setFantasyScreenshotStatusText("Try again or use manual entry.");
      }
    } finally {
      if (progressTimer) window.clearInterval(progressTimer);
      decoded?.revoke?.();
      if (runId === fantasyScreenshotImportRunIdRef.current) {
        fantasyScreenshotAbortRef.current = null;
      }
    }
  };

  const updateFantasyScreenshotReview = (updater) => {
    setFantasyScreenshotReview((current) => {
      if (!current) return current;
      const next = typeof updater === "function" ? updater(current) : updater;
      setFantasyScreenshotImportSummary((summary) =>
        summary
          ? createFantasyScreenshotImportSummary({
              ...summary,
              imageMetadata: next.imageMetadata || fantasyScreenshotImageMetadata,
              processingDurationMs: summary.processingDurationMs,
              review: next,
              manuallyCorrectedCount: fantasyScreenshotManualCorrectionCountRef.current,
              finalValidSquad: validateFantasyIqSquad(getFantasyScreenshotReviewSquad(next)).isValid,
              errorCode: null,
            })
          : summary
      );
      return next;
    });
    setFantasyScreenshotImportState("needs review");
  };

  const markFantasyScreenshotManualCorrection = () => {
    fantasyScreenshotManualCorrectionCountRef.current += 1;
  };

  const setFantasyScreenshotReviewCaptain = (slotId, marker) => {
    markFantasyScreenshotManualCorrection();
    updateFantasyScreenshotReview((review) => ({
      ...review,
      extractedSlots: review.extractedSlots.map((slot) => ({
        ...slot,
        isCaptain: marker === "captain" ? slot.id === slotId : marker === "none" && slot.id === slotId ? false : slot.isCaptain && slot.id !== slotId,
        isViceCaptain: marker === "vice" ? slot.id === slotId : marker === "none" && slot.id === slotId ? false : slot.isViceCaptain && slot.id !== slotId,
      })),
    }));
  };

  const getFantasyScreenshotReviewSquad = (review = fantasyScreenshotReview) => {
    const squad = normaliseFantasyIqSquad(convertFantasyScreenshotReviewToSquad(review || {}));
    return {
      ...squad,
      gameweek: selectedGameweek,
    };
  };

  const scrollToFantasyIqOverview = () => {
    const scroll = () => {
      const element = fantasyIqOverviewRef.current || fantasyIqHeaderRef.current;
      if (!element) return false;
      const top = element.getBoundingClientRect().top + window.scrollY - 6;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      return true;
    };
    window.requestAnimationFrame(() => {
      if (!scroll()) {
        window.setTimeout(scroll, 80);
      }
    });
  };

  const queueFantasyIqOverviewScroll = () => {
    fantasyIqPendingHeaderScrollRef.current = true;
    scrollToFantasyIqOverview();
  };

  useEffect(() => {
    if (activeView !== FANTASY_IQ_VIEW_ID || !fantasyIqPendingHeaderScrollRef.current) return;
    fantasyIqPendingHeaderScrollRef.current = false;
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(scrollToFantasyIqOverview);
    });
  }, [activeView, fantasyIqAnalysisPanel, fantasyIqBuilderOpen, fantasyScreenshotImportOpen]);

  const handleConfirmFantasyScreenshotImport = () => {
    if (!fantasyScreenshotReview) return;
    const squad = getFantasyScreenshotReviewSquad(fantasyScreenshotReview);
    const validation = validateFantasyIqSquad(squad);
    const unresolvedCanonicalPlayers = squad.players.filter((player) => !player.canonicalPlayerId && !String(player.id || "").startsWith("fpl:"));
    if (!validation.isValid) {
      setFantasyScreenshotError(validation.errors.slice(0, 3).join(" "));
      setFantasyScreenshotImportState("needs review");
      setFantasyScreenshotImportSummary((summary) =>
        summary
          ? { ...summary, finalValidSquad: false, errorCode: "VALIDATION_FAILED" }
          : summary
      );
      return;
    }
    if (unresolvedCanonicalPlayers.length) {
      setFantasyScreenshotError("Every imported player must be matched to the player list before confirming.");
      setFantasyScreenshotImportState("needs review");
      setFantasyScreenshotImportSummary((summary) =>
        summary
          ? { ...summary, finalValidSquad: false, errorCode: "UNMATCHED_PLAYERS" }
          : summary
      );
      return;
    }
    if (fantasyIqSquad?.confirmed && !fantasyScreenshotReplacePending) {
      setFantasyScreenshotReplacePending(true);
      setFantasyScreenshotError("This will replace your existing confirmed squad. Confirm again to import.");
      return;
    }
    setFantasyScreenshotImportState("importing");
    const finalImportSummary = createFantasyScreenshotImportSummary({
      ...(fantasyScreenshotImportSummary || {}),
      imageMetadata: fantasyScreenshotReview.imageMetadata || fantasyScreenshotImageMetadata,
      processingDurationMs: fantasyScreenshotImportSummary?.processingDurationMs || 0,
      review: fantasyScreenshotReview,
      manuallyCorrectedCount: fantasyScreenshotManualCorrectionCountRef.current,
      finalValidSquad: true,
      errorCode: null,
    });
    const saved = saveFantasyIqSquad(fantasyIqUserIdentifier, {
      ...squad,
      confirmed: true,
      source: "screenshot",
      importedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setFantasyIqSquad(saved);
    setFantasyIqEditingSquad(saved);
    setFantasyIqBuilderOpen(false);
    setFantasyIqSquadStatus("Screenshot squad imported and ready for Fantasy IQ analysis.");
    setFantasyScreenshotPostImportSummary(saveFantasyScreenshotFeedbackSummary(finalImportSummary));
    queueFantasyIqHistoryPrompt("Your screenshot import changed your Fantasy IQ squad.");
    resetFantasyScreenshotImport("completed");
    setFantasyScreenshotImportOpen(false);
    setActiveView(FANTASY_IQ_VIEW_ID);
    setFantasyIqAnalysisPanel("team");
    queueFantasyIqOverviewScroll();
  };

  const openFantasyIqBuilder = (squad = fantasyIqSquad) => {
    if (fantasyTransferIqState && !window.confirm("Discard unsaved transfer comparison?")) return;
    if (fantasyLineupIqState?.status === "ready" && !window.confirm("Discard unsaved lineup analysis?")) return;
    resetFantasyTransferIq();
    resetFantasyLineupIq();
    if (fantasyScreenshotImportOpen) {
      resetFantasyScreenshotImport("cancelled");
      setFantasyScreenshotImportOpen(false);
    }
    setFantasyIqAnalysisPanel("team");
    setFantasyIqEditingSquad(normaliseFantasyIqSquad(squad));
    setFantasyIqBuilderOpen(true);
    setFantasyIqUnsavedChanges(false);
    setFantasyIqConfirmAttempted(false);
    setFantasyIqSquadStatus("");
  };

  const closeFantasyIqBuilder = () => {
    if (fantasyIqUnsavedChanges && !window.confirm("Discard unsaved squad changes?")) return;
    setFantasyIqBuilderOpen(false);
    setFantasyIqEditingSquad(fantasyIqSquad);
    setFantasyIqUnsavedChanges(false);
    setFantasyIqConfirmAttempted(false);
  };

  const updateFantasyIqEditingSquad = (updater) => {
    setFantasyIqEditingSquad((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      return normaliseFantasyIqSquad(next);
    });
    setFantasyIqUnsavedChanges(true);
    setFantasyIqSquadStatus("");
  };

  const handleSaveFantasyIqDraft = () => {
    const draft = normaliseFantasyIqSquad({
      ...fantasyIqEditingSquad,
      confirmed: false,
      updatedAt: new Date().toISOString(),
      gameweek: selectedGameweek,
    });
    const saved = saveFantasyIqSquad(fantasyIqUserIdentifier, draft);
    setFantasyIqSquad(saved);
    setFantasyIqEditingSquad(saved);
    setFantasyIqUnsavedChanges(false);
    setFantasyIqConfirmAttempted(false);
    setFantasyIqSquadStatus("Draft saved.");
  };

  const handleConfirmFantasyIqSquad = () => {
    const validation = validateFantasyIqSquad(fantasyIqEditingSquad);
    setFantasyIqConfirmAttempted(true);
    if (!validation.isValid) {
      setFantasyIqSquadStatus("Fix the highlighted squad issues before confirming.");
      return;
    }
    const confirmed = normaliseFantasyIqSquad({
      ...fantasyIqEditingSquad,
      confirmed: true,
      source: fantasyIqEditingSquad.source || "manual",
      updatedAt: new Date().toISOString(),
      importedAt: fantasyIqEditingSquad.importedAt || new Date().toISOString(),
      gameweek: selectedGameweek,
    });
    const saved = saveFantasyIqSquad(fantasyIqUserIdentifier, confirmed);
    setFantasyIqSquad(saved);
    setFantasyIqEditingSquad(saved);
    setFantasyIqBuilderOpen(false);
    setFantasyIqUnsavedChanges(false);
    setFantasyIqSquadStatus("Your squad is ready for Fantasy IQ analysis.");
    queueFantasyIqHistoryPrompt("Your manual squad edit changed your Fantasy IQ squad.");
    setActiveView(FANTASY_IQ_VIEW_ID);
    setFantasyIqAnalysisPanel("team");
    queueFantasyIqOverviewScroll();
  };

  const handleClearFantasyIqSquad = () => {
    if (!window.confirm("Clear your saved Fantasy IQ squad?")) return;
    const emptySquad = createEmptyFantasyIqSquad();
    try {
      localStorage.removeItem(getFantasyIqSquadStorageKey(fantasyIqUserIdentifier));
    } catch {}
    setFantasyIqSquad(emptySquad);
    setFantasyIqEditingSquad(emptySquad);
    setFantasyIqBuilderOpen(false);
    setFantasyIqUnsavedChanges(false);
    setFantasyIqConfirmAttempted(false);
    setFantasyIqSquadStatus("Squad cleared.");
  };

  const persistFantasyIqHistory = (history) => {
    const saved = saveFantasyIqHistory(fantasyIqUserIdentifier, history);
    setFantasyIqHistory(saved);
    return saved;
  };

  const queueFantasyIqHistoryPrompt = (operationLabel = "Your Fantasy IQ squad has changed.") => {
    const gameweekLabel = fantasyIqSnapshotGameweekContext?.label || "Unassigned";
    setFantasyIqHistoryPrompt({
      id: `history-prompt-${Date.now()}`,
      message: fantasyIqCurrentDuplicate
        ? `${operationLabel} Update your ${gameweekLabel} snapshot?`
        : `${operationLabel} Save this as your ${gameweekLabel} Fantasy IQ snapshot?`,
      duplicateSnapshotId: fantasyIqCurrentDuplicate?.id || null,
    });
  };

  const handleSaveFantasyIqSnapshot = ({ mode = "insert" } = {}) => {
    if (!currentFantasyIqSnapshotCandidate || currentFantasyIqSnapshotCandidate.report?.overallScore == null) {
      setFantasyIqHistoryStatus("Confirm a scored Fantasy IQ squad before saving a snapshot.");
      return;
    }
    const result = upsertFantasyIqSnapshot(fantasyIqHistory, currentFantasyIqSnapshotCandidate, { mode });
    if (result.status === "duplicate") {
      setFantasyIqHistoryDuplicate(result.duplicate);
      setFantasyIqHistoryStatus(`A Fantasy IQ snapshot already exists for ${formatFantasyIqSnapshotGameweek(result.duplicate)}.`);
      return;
    }
    if (result.status === "invalid") {
      setFantasyIqHistoryStatus("This Fantasy IQ snapshot could not be saved.");
      return;
    }
    persistFantasyIqHistory(result.history);
    setFantasyIqHistoryDuplicate(null);
    setFantasyIqHistoryPrompt(null);
    setFantasyIqHistoryExpandedId(result.snapshot?.id || null);
    setFantasyIqHistoryStatus(
      result.status === "updated"
        ? `${formatFantasyIqSnapshotGameweek(result.snapshot)} snapshot updated.`
        : `${formatFantasyIqSnapshotGameweek(result.snapshot)} snapshot saved.`
    );
  };

  const handleDeleteFantasyIqSnapshot = (snapshot) => {
    if (!snapshot) return;
    if (!window.confirm(`Delete the Fantasy IQ snapshot for ${formatFantasyIqSnapshotGameweek(snapshot)}?`)) return;
    const nextHistory = deleteFantasyIqSnapshot(fantasyIqHistory, snapshot.id);
    persistFantasyIqHistory(nextHistory);
    if (fantasyIqHistoryExpandedId === snapshot.id) setFantasyIqHistoryExpandedId(null);
    setFantasyIqHistoryDuplicate(null);
    setFantasyIqHistoryStatus(`${formatFantasyIqSnapshotGameweek(snapshot)} snapshot deleted.`);
  };

  const handleClearFantasyIqHistory = () => {
    if (!window.confirm("This will permanently remove all locally saved Fantasy IQ snapshots for this account on this device.")) return;
    persistFantasyIqHistory(clearFantasyIqHistory());
    setFantasyIqHistoryDuplicate(null);
    setFantasyIqHistoryExpandedId(null);
    setFantasyIqHistoryPrompt(null);
    setFantasyIqHistoryStatus("Fantasy IQ history cleared.");
  };

  const handleExportFantasyIqHistory = () => {
    const text = exportFantasyIqHistory(fantasyIqHistory);
    const blob = new Blob([text], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `prediction-addiction-fantasy-iq-history-${new Date().getFullYear()}.json`;
    link.click();
    URL.revokeObjectURL(url);
    setFantasyIqHistoryStatus("Privacy-safe Fantasy IQ history export prepared.");
  };

  const resetFantasyTransferIq = () => {
    setFantasyTransferIqState(null);
    setFantasyTransferOutFilter("ALL");
    setFantasyTransferRoleFilter("ALL");
    setFantasyTransferClubFilter("ALL");
    setFantasyTransferInSearch("");
    setFantasyTransferInTeamFilter("ALL");
    setFantasyTransferShowAllCategories(false);
    setFantasyTransferApplyPending(false);
    setFantasyTransferRecommendations(null);
    setFantasyTransferRecommendationApplyId("");
  };

  const getFantasyTransferScoreContext = () => {
    const currentPredictions = predictions[currentPredictionKey] || {};
    return {
      clubOutlooks: buildFantasyIqClubOutlooks(activeFixtures, results, leaguePerformanceContext, { horizon: 5 }),
      predictionOutlooks: buildFantasyIqPredictionOutlooks(activeFixtures, currentPredictions, selectedGameweek),
      playerDataStatus: fantasyPlayerData,
    };
  };

  const buildFantasyTransferComparisonState = ({
    outgoingPlayerId,
    incomingPlayer,
    captainPlayerId,
    viceCaptainPlayerId,
    availabilityAcknowledged = false,
  }) => {
    const comparison = createFantasyTransferIqComparison({
      currentSquad: fantasyIqSquad,
      outgoingPlayerId,
      incomingPlayer,
      captainPlayerId,
      viceCaptainPlayerId,
      normaliseSquad: normaliseFantasyIqSquad,
      validateSquad: validateFantasyIqSquad,
      scoreReport: buildFantasyIqScoredReport,
      scoreContext: getFantasyTransferScoreContext(),
    });
    return {
      ...comparison,
      availabilityAcknowledged,
    };
  };

  const openFantasyTransferIq = () => {
    if (!fantasyIqSquad?.confirmed) {
      setFantasyIqSquadStatus("Confirm your fantasy squad before comparing transfers.");
      return;
    }
    setFantasyTransferIqState({
      id: `transfer-iq-${Date.now()}`,
      createdAt: new Date().toISOString(),
      outgoingPlayerId: null,
      incomingPlayerId: null,
      outgoingPlayer: null,
      incomingPlayer: null,
      currentSquad: normaliseFantasyIqSquad(fantasyIqSquad),
      proposedSquad: null,
      currentReport: null,
      proposedReport: null,
      impact: null,
      validation: null,
      availabilityAcknowledged: false,
      version: FANTASY_TRANSFER_IQ_VERSION,
      status: "selecting-out",
    });
    setFantasyTransferShowAllCategories(false);
    setFantasyTransferApplyPending(false);
    setFantasyTransferRecommendations(null);
    setFantasyTransferRecommendationApplyId("");
    setFantasyIqSquadStatus("");
  };

  const selectFantasyTransferOutgoingPlayer = (playerId) => {
    setFantasyTransferIqState((current) => ({
      ...(current || {}),
      outgoingPlayerId: playerId,
      incomingPlayerId: null,
      outgoingPlayer: fantasyIqSquad.players.find((player) => player.id === playerId) || null,
      incomingPlayer: null,
      proposedSquad: null,
      currentReport: null,
      proposedReport: null,
      impact: null,
      validation: null,
      availabilityAcknowledged: false,
      version: FANTASY_TRANSFER_IQ_VERSION,
      status: "selecting-in",
    }));
    setFantasyTransferInSearch("");
    setFantasyTransferInTeamFilter("ALL");
    setFantasyTransferShowAllCategories(false);
    setFantasyTransferApplyPending(false);
    setFantasyTransferRecommendationApplyId("");
  };

  const generateFantasyTransferRecommendations = () => {
    if (!fantasyIqSquad?.confirmed) {
      setFantasyIqSquadStatus("Confirm your fantasy squad before generating transfer suggestions.");
      return;
    }
    const recommendations = createFantasyTransferIqRecommendations({
      currentSquad: fantasyIqSquad,
      availablePlayers: fantasyPlayerData.players || [],
      transferCount: fantasyTransferRecommendationCount,
      normaliseSquad: normaliseFantasyIqSquad,
      validateSquad: validateFantasyIqSquad,
      scoreReport: buildFantasyIqScoredReport,
      scoreContext: getFantasyTransferScoreContext(),
      maxResults: 5,
    });
    setFantasyTransferRecommendations(recommendations);
    setFantasyTransferRecommendationApplyId("");
    setFantasyIqSquadStatus(
      recommendations.recommendations?.length
        ? `Transfer IQ found ${recommendations.recommendations.length} legal suggestion${recommendations.recommendations.length === 1 ? "" : "s"}.`
        : recommendations.warnings?.[0] || "No legal transfer suggestions found."
    );
  };

  const handleApplyFantasyTransferRecommendation = (recommendation) => {
    if (!recommendation?.proposedSquad || recommendation.status !== "recommended") return;
    const riskyIncoming = (recommendation.transfers || [])
      .map((transfer) => transfer.incomingPlayer)
      .find(requiresFantasyTransferAvailabilityAcknowledgement);
    if (riskyIncoming) {
      setFantasyIqSquadStatus("This recommendation includes an availability concern. Check team news before applying it to your Fantasy IQ squad.");
      return;
    }
    if (fantasyTransferRecommendationApplyId !== recommendation.id) {
      setFantasyTransferRecommendationApplyId(recommendation.id);
      setFantasyIqSquadStatus("Apply this recommendation to your saved Fantasy IQ squad? This only updates your squad inside Prediction Addiction.");
      return;
    }
    const saved = saveFantasyIqSquad(fantasyIqUserIdentifier, {
      ...recommendation.proposedSquad,
      confirmed: true,
      source: "transfer-iq-recommendation",
      updatedAt: new Date().toISOString(),
    });
    setFantasyIqSquad(saved);
    setFantasyIqEditingSquad(saved);
    resetFantasyTransferIq();
    setFantasyIqSquadStatus("Transfer IQ recommendation applied to your Fantasy IQ squad.");
    queueFantasyIqHistoryPrompt("Your Transfer IQ recommendation changed your Fantasy IQ squad.");
  };

  const selectFantasyTransferIncomingPlayer = (player) => {
    setFantasyTransferIqState((current) => {
      const outgoingPlayerId = current?.outgoingPlayerId;
      if (!outgoingPlayerId || !player) return current;
      const outgoingPlayer = fantasyIqSquad.players.find((item) => item.id === outgoingPlayerId);
      const needsCaptain = outgoingPlayerId === fantasyIqSquad.captainPlayerId || outgoingPlayer?.isCaptain;
      const needsVice = outgoingPlayerId === fantasyIqSquad.viceCaptainPlayerId || outgoingPlayer?.isViceCaptain;
      if (needsCaptain || needsVice) {
        const built = buildFantasyIqTransferSquad({
          currentSquad: fantasyIqSquad,
          outgoingPlayerId,
          incomingPlayer: player,
          normaliseSquad: normaliseFantasyIqSquad,
          validateSquad: validateFantasyIqSquad,
        });
        return {
          ...(current || {}),
          outgoingPlayerId,
          incomingPlayerId: player.id,
          outgoingPlayer: built.outgoingPlayer || outgoingPlayer || null,
          incomingPlayer: player,
          currentSquad: built.currentSquad,
          proposedSquad: built.proposedSquad,
          validation: built.validation,
          currentReport: null,
          proposedReport: null,
          impact: null,
          availabilityAcknowledged: false,
          version: FANTASY_TRANSFER_IQ_VERSION,
          status: "ready",
        };
      }
      return buildFantasyTransferComparisonState({
        outgoingPlayerId,
        incomingPlayer: player,
        availabilityAcknowledged: false,
      });
    });
    setFantasyTransferShowAllCategories(false);
    setFantasyTransferApplyPending(false);
    setFantasyTransferRecommendationApplyId("");
  };

  const setFantasyTransferReplacementCaptain = (type, playerId) => {
    setFantasyTransferIqState((current) => {
      if (!current?.outgoingPlayerId || !current?.incomingPlayer) return current;
      const nextCaptainId = type === "captain" ? playerId : current.proposedSquad?.captainPlayerId || fantasyIqSquad.captainPlayerId;
      const nextViceCaptainId = type === "vice" ? playerId : current.proposedSquad?.viceCaptainPlayerId || fantasyIqSquad.viceCaptainPlayerId;
      return buildFantasyTransferComparisonState({
        outgoingPlayerId: current.outgoingPlayerId,
        incomingPlayer: current.incomingPlayer,
        captainPlayerId: nextCaptainId,
        viceCaptainPlayerId: nextViceCaptainId,
        availabilityAcknowledged: current.availabilityAcknowledged,
      });
    });
    setFantasyTransferApplyPending(false);
  };

  const acknowledgeFantasyTransferAvailability = (acknowledged) => {
    setFantasyTransferIqState((current) => current ? { ...current, availabilityAcknowledged: acknowledged } : current);
  };

  const handleApplyFantasyTransfer = () => {
    if (!fantasyTransferIqState?.proposedSquad || fantasyTransferIqState.status !== "compared") return;
    if (
      requiresFantasyTransferAvailabilityAcknowledgement(fantasyTransferIqState.incomingPlayer) &&
      !fantasyTransferIqState.availabilityAcknowledged
    ) {
      setFantasyIqSquadStatus("Acknowledge the player-data availability warning before applying this comparison.");
      return;
    }
    if (!fantasyTransferApplyPending) {
      setFantasyTransferApplyPending(true);
      setFantasyIqSquadStatus("Apply this change to your saved Fantasy IQ squad? This only updates your squad inside Prediction Addiction.");
      return;
    }
    const saved = saveFantasyIqSquad(fantasyIqUserIdentifier, {
      ...fantasyTransferIqState.proposedSquad,
      confirmed: true,
      source: "transfer-iq",
      updatedAt: new Date().toISOString(),
    });
    setFantasyIqSquad(saved);
    setFantasyIqEditingSquad(saved);
    resetFantasyTransferIq();
    setFantasyIqSquadStatus("Transfer applied to your Fantasy IQ squad.");
    queueFantasyIqHistoryPrompt("Your Transfer IQ apply changed your Fantasy IQ squad.");
  };

  const resetFantasyLineupIq = () => {
    setFantasyLineupIqState(null);
    setFantasyLineupApplyMode(null);
    setFantasyLineupManualMode(false);
  };

  const analyseFantasyLineupIq = () => {
    if (!fantasyIqSquad?.confirmed) {
      setFantasyIqSquadStatus("Confirm your fantasy squad before analysing your lineup.");
      return;
    }
    const currentPredictions = predictions[currentPredictionKey] || {};
    const analysis = createFantasyLineupIqAnalysis({
      squad: fantasyIqSquad,
      clubOutlooks: buildFantasyIqClubOutlooks(activeFixtures, results, leaguePerformanceContext),
      predictionOutlooks: buildFantasyIqPredictionOutlooks(activeFixtures, currentPredictions, selectedGameweek),
      normaliseSquad: normaliseFantasyIqSquad,
      validateSquad: validateFantasyIqSquad,
      playerDataStatus: fantasyPlayerData,
    });
    setFantasyLineupIqState(analysis);
    setFantasyLineupApplyMode(null);
    setFantasyLineupManualMode(false);
    setFantasyIqSquadStatus("");
  };

  const updateFantasyLineupEditableSquad = ({ starterIds, captainPlayerId, viceCaptainPlayerId }) => {
    setFantasyLineupIqState((current) => {
      if (!current?.currentSquad) return current;
      const editable = current.editableSquad || current.suggestedSquad || current.currentSquad;
      const built = buildFantasyLineupSquadFromStarterIds({
        squad: current.currentSquad,
        starterIds: starterIds || (editable.players || []).filter((player) => player.squadRole === "starter").map((player) => player.id),
        captainPlayerId: captainPlayerId || editable.captainPlayerId,
        viceCaptainPlayerId: viceCaptainPlayerId || editable.viceCaptainPlayerId,
        normaliseSquad: normaliseFantasyIqSquad,
        validateSquad: validateFantasyIqSquad,
      });
      return {
        ...current,
        editableSquad: built.squad,
        editableValidation: built.validation,
        status: "ready",
      };
    });
    setFantasyLineupApplyMode(null);
  };

  const setFantasyLineupPlayerRole = (playerId, squadRole) => {
    const editable = fantasyLineupIqState?.editableSquad || fantasyLineupIqState?.suggestedSquad;
    if (!editable) return;
    const starterIds = (editable.players || [])
      .filter((player) => (player.id === playerId ? squadRole === "starter" : player.squadRole === "starter"))
      .map((player) => player.id);
    updateFantasyLineupEditableSquad({ starterIds });
  };

  const setFantasyLineupCaptain = (type, playerId) => {
    const editable = fantasyLineupIqState?.editableSquad || fantasyLineupIqState?.suggestedSquad;
    if (!editable) return;
    updateFantasyLineupEditableSquad({
      captainPlayerId: type === "captain" ? playerId : editable.captainPlayerId,
      viceCaptainPlayerId: type === "vice" ? playerId : editable.viceCaptainPlayerId,
    });
  };

  const handleApplyFantasyLineup = (mode) => {
    if (!fantasyLineupIqState?.suggestedSquad) return;
    const target =
      mode === "minimal"
        ? fantasyLineupIqState.minimalChange?.squad
        : mode === "manual"
        ? fantasyLineupIqState.editableSquad
        : fantasyLineupIqState.suggestedSquad;
    const validation = validateFantasyIqSquad(target);
    if (!validation.isValid) {
      setFantasyIqSquadStatus(`Fix the lineup validation issues before applying. ${validation.errors.slice(0, 2).join(" ")}`);
      return;
    }
    if (fantasyLineupApplyMode !== mode) {
      setFantasyLineupApplyMode(mode);
      setFantasyIqSquadStatus("Apply this starting XI, captain and vice-captain to your saved Fantasy IQ squad? This only updates your squad inside Prediction Addiction.");
      return;
    }
    const saved = saveFantasyIqSquad(fantasyIqUserIdentifier, {
      ...target,
      confirmed: true,
      source: "lineup-iq",
      updatedAt: new Date().toISOString(),
    });
    setFantasyIqSquad(saved);
    setFantasyIqEditingSquad(saved);
    setFantasyLineupIqState((current) => current ? { ...current, status: "applied" } : current);
    setFantasyLineupApplyMode(null);
    setFantasyLineupManualMode(false);
    setFantasyIqSquadStatus("Lineup applied to your Fantasy IQ squad.");
    queueFantasyIqHistoryPrompt("Your Lineup IQ apply changed your Fantasy IQ squad.");
  };

// Coins game state
const [coinsState, setCoinsState] = useState({
  gameweek: null,
  used: 0,
  remaining: 10,
  bets: {},
  loading: false,
  error: "",
});

const favoriteTeamByUsername = useMemo(() => {
  const out = {};
  (globalUsers || []).forEach((u) => {
    if (!u || !u.userId || !u.username) return;
    const team = favoriteTeamsByUserId[String(u.userId)] || "";
    if (team) out[u.username] = team;
  });
  if (currentPlayer && accountFavoriteTeam) out[currentPlayer] = accountFavoriteTeam;
  return out;
}, [globalUsers, favoriteTeamsByUserId, currentPlayer, accountFavoriteTeam]);

const favoriteCountryByUsername = useMemo(() => {
  const out = {};
  (globalUsers || []).forEach((u) => {
    if (!u || !u.userId || !u.username) return;
    const country = favoriteCountriesByUserId[String(u.userId)] || "";
    if (country) out[u.username] = country;
  });
  if (currentPlayer && accountFavoriteCountry) out[currentPlayer] = accountFavoriteCountry;
  return out;
}, [globalUsers, favoriteCountriesByUserId, currentPlayer, accountFavoriteCountry]);

const activeFavoriteByUserId = isWorldCupMode ? favoriteCountriesByUserId : favoriteTeamsByUserId;
const activeFavoriteByUsername = isWorldCupMode ? favoriteCountryByUsername : favoriteTeamByUsername;
const getAvatarForRow = (row = {}) => {
  const rowUserId = row.userId ? String(row.userId) : "";
  const savedAvatar = rowUserId ? avatarsByUserId[rowUserId] : null;
  if (savedAvatar?.seed || savedAvatar?.style) {
    return {
      seed: savedAvatar.seed || row.player || currentPlayer,
      style: savedAvatar.style || "avataaars",
    };
  }

  const isCurrentUser =
    (rowUserId && currentUserId && rowUserId === String(currentUserId)) ||
    row.player === currentPlayer;
  if (isCurrentUser) {
    return {
      seed: avatarSeed || currentPlayer,
      style: avatarStyle || "avataaars",
    };
  }

  return {
    seed: row.player,
    style: "avataaars",
  };
};
const resolvedAccountFavoriteTeam =
  accountFavoriteTeam || (currentUserId ? favoriteTeamsByUserId[String(currentUserId)] || "" : "");
const resolvedAccountFavoriteCountry =
  accountFavoriteCountry || (currentUserId ? favoriteCountriesByUserId[String(currentUserId)] || "" : "");
const worldCupOverview = useMemo(() => {
  if (!isWorldCupMode) return null;

  const now = Date.now();
  const upcomingFixtures = activeFixtures
    .filter((fixture) => Date.parse(fixture.kickoff) > now)
    .sort((a, b) => Date.parse(a.kickoff) - Date.parse(b.kickoff));
  const nextFixture = upcomingFixtures[0] || null;

  const todayKey = new Date().toISOString().slice(0, 10);
  const todayCount = activeFixtures.filter(
    (fixture) => fixture.kickoff && fixture.kickoff.slice(0, 10) === todayKey
  ).length;

  const favoriteCountry = resolvedAccountFavoriteCountry;
  const favoriteFixture =
    favoriteCountry
      ? upcomingFixtures.find(
          (fixture) =>
            fixture.homeTeam === favoriteCountry || fixture.awayTeam === favoriteCountry
        ) || null
      : null;

  return {
    stage:
      getWorldCupStageForGameweek(activeFixtures, selectedGameweek) ||
      "Tournament Complete",
    nextFixture,
    todayCount,
    favoriteCountry,
    favoriteFixture,
  };
}, [isWorldCupMode, activeFixtures, selectedGameweek, resolvedAccountFavoriteCountry]);

function formatCountdownFixtureMeta(fixture, mode) {
  if (!fixture) return "";
  return mode === WORLD_CUP_MODE
    ? `Kick-off: ${formatFixtureKickoff(fixture, mode)}`
    : `Deadline: ${formatFixtureKickoff(fixture, mode)}`;
}

  // --- COINS: derive outcome (stake, return, profit) for current GW ---
  const coinsOutcome = useMemo(() => {
    if (!selectedGameweek) {
      return null;
    }

    const bets = coinsState.bets || {};
    const fixturesThisGw = activeFixtures.filter(
      (f) => f.gameweek === selectedGameweek
    );

    if (!bets || Object.keys(bets).length === 0) {
      return {
        totalStake: 0,
        totalReturn: 0,
        profit: 0,
        byFixture: [],
      };
    }

    let totalStake = 0;
    let totalReturn = 0;
    const byFixture = [];

    fixturesThisGw.forEach((fixture) => {
      const bet = bets[fixture.id];
      if (!bet || !bet.stake || bet.stake <= 0) return;

      const stake = Number(bet.stake) || 0;
      totalStake += stake;

      const res = results[fixture.id];
      let resultSide = null;
      let payout = 0;

      // Do we have a final score?
      if (hasValidResultScore(res)) {
        const rh = Number(res.homeGoals);
        const ra = Number(res.awayGoals);

        if (!Number.isNaN(rh) && !Number.isNaN(ra)) {
          resultSide = getResult(rh, ra); // "H" | "D" | "A"

          // Only pay out if side matches result AND we have odds
          if (bet.side && bet.side === resultSide) {
            const oddsSnap = bet.oddsSnapshot || {};
            let price = null;

            if (resultSide === "H") price = oddsSnap.home ?? null;
            else if (resultSide === "D") price = oddsSnap.draw ?? null;
            else if (resultSide === "A") price = oddsSnap.away ?? null;

            if (price != null && Number(price) > 0) {
              payout = stake * Number(price);
            } else {
              // If odds missing, treat as 0 payout for now (no free coins)
              payout = 0;
            }
          }
        }
      }

      totalReturn += payout;

      byFixture.push({
        fixtureId: fixture.id,
        label: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
        stake,
        side: bet.side || null,
        resultSide,
        payout,
      });
    });

    return {
      totalStake,
      totalReturn,
      profit: totalReturn - totalStake,
      byFixture,
    };
  }, [selectedGameweek, coinsState.bets, results, activeFixtures]);

  // Mini-league
  const [myLeagues, setMyLeagues] = useState([]);
  const [selectedLeagueId, setSelectedLeagueId] = useState("");
  const [leagueNameInput, setLeagueNameInput] = useState("");
  const [leagueJoinCode, setLeagueJoinCode] = useState("");
  const [leagueError, setLeagueError] = useState("");
  const [leagueSuccess, setLeagueSuccess] = useState("");
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const [copiedLeagueCodeId, setCopiedLeagueCodeId] = useState("");
  const [miniLeagueLeaderboardRows, setMiniLeagueLeaderboardRows] = useState([]);
  const [miniLeagueLeaderboardLoading, setMiniLeagueLeaderboardLoading] = useState(false);
  const [miniLeagueLeaderboardError, setMiniLeagueLeaderboardError] = useState("");
  const gwLocked = isGameweekLocked(selectedGameweek, activeFixtures);
  const selectedMiniLeague = useMemo(() => {
    if (!Array.isArray(myLeagues) || myLeagues.length === 0) return null;
    return myLeagues.find((league) => String(league.id) === String(selectedLeagueId)) || myLeagues[0];
  }, [myLeagues, selectedLeagueId]);

  function getSelectedMiniLeagueStorageMap() {
    try {
      const saved = localStorage.getItem(SELECTED_MINI_LEAGUE_STORAGE_KEY);
      const parsed = saved ? JSON.parse(saved) : {};
      return parsed && typeof parsed === "object" ? parsed : {};
    } catch {
      return {};
    }
  }

  function rememberSelectedLeagueId(leagueId) {
    const nextLeagueId = String(leagueId || "");
    setSelectedLeagueId(nextLeagueId);
    if (!currentUserId) return;

    try {
      const storageKey = `${currentUserId}:${getModeKey(gameMode)}`;
      const saved = getSelectedMiniLeagueStorageMap();
      if (nextLeagueId) {
        saved[storageKey] = nextLeagueId;
      } else {
        delete saved[storageKey];
      }
      localStorage.setItem(SELECTED_MINI_LEAGUE_STORAGE_KEY, JSON.stringify(saved));
    } catch {}
  }
  // const isOriginalPlayer = PLAYERS.includes(currentPlayer);

  // Prediction key for storage
  // Always use the logged-in user's real userId for their own predictions.
  // Only fall back to the synthetic Phil merge when viewing legacy Phil data.
  const currentPredictionKey = useMemo(() => {
    if (
      isLoggedIn &&
      currentUserId &&
      (currentPlayer === loginName || currentPlayer === currentUserId)
    ) {
      return currentUserId;
    }
    if (currentPlayer === "Phil") {
      return "Phil_merged";
    }
    return currentPlayer;
  }, [currentPlayer, currentUserId, isLoggedIn, loginName]);

// Merge Phil's predictions from both IDs into a synthetic key
useEffect(() => {
  if (typeof window !== 'undefined') {
    if (currentPlayer === "Phil") {
      const oldPhil = predictions[currentUserId || "1763874000000"] || {};
      const newPhil = predictions["1763789072925"] || {};
      // Merge, newPhil wins if duplicate fixture
      const merged = { ...oldPhil, ...newPhil };
      setPredictions((prev) => ({
        ...prev,
        Phil_merged: merged,
      }));
    }
  }
  // eslint-disable-next-line
}, [predictions[currentUserId || "1763874000000"], predictions["1763789072925"], currentPlayer, currentUserId]);

// ...existing code...



// ...existing code...

// (Place this after visibleFixtures is defined)

// ---------- DERIVED ----------
const visibleFixtures = activeFixtures.filter((f) => f.gameweek === selectedGameweek);
const selectedWorldCupStage = isWorldCupMode
  ? getWorldCupStageForGameweek(activeFixtures, selectedGameweek)
  : "";
const worldCupKickoffTimesSynced = !isWorldCupMode
  || visibleFixtures.every((fixture) => fixture.kickoffTimeConfirmed !== false);
const worldCupGroupTables = useMemo(() => {
  if (!isWorldCupMode) return [];

  const groups = new Map();

  activeFixtures.filter((fixture) => fixture.group).forEach((fixture) => {
    const group = fixture.group;
    if (!groups.has(group)) {
      groups.set(group, new Map());
    }
    const table = groups.get(group);

    [fixture.homeTeam, fixture.awayTeam].forEach((teamName) => {
      if (!table.has(teamName)) {
        table.set(teamName, {
          team: teamName,
          played: 0,
          won: 0,
          draw: 0,
          lost: 0,
          goalsFor: 0,
          goalsAgainst: 0,
          goalDifference: 0,
          points: 0,
          position: 0,
        });
      }
    });

    if (!isFixtureCompleted(fixture, results)) return;

    const home = table.get(fixture.homeTeam);
    const away = table.get(fixture.awayTeam);
    const res = results[fixture.id];
    const homeGoals = Number(res.homeGoals);
    const awayGoals = Number(res.awayGoals);
    if (!Number.isFinite(homeGoals) || !Number.isFinite(awayGoals)) return;

    home.played += 1;
    away.played += 1;
    home.goalsFor += homeGoals;
    home.goalsAgainst += awayGoals;
    away.goalsFor += awayGoals;
    away.goalsAgainst += homeGoals;
    home.goalDifference = home.goalsFor - home.goalsAgainst;
    away.goalDifference = away.goalsFor - away.goalsAgainst;

    if (homeGoals > awayGoals) {
      home.won += 1;
      away.lost += 1;
      home.points += 3;
    } else if (homeGoals < awayGoals) {
      away.won += 1;
      home.lost += 1;
      away.points += 3;
    } else {
      home.draw += 1;
      away.draw += 1;
      home.points += 1;
      away.points += 1;
    }
  });

  return Array.from(groups.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, table]) => {
      const rows = Array.from(table.values()).sort((a, b) => {
        if (b.points !== a.points) return b.points - a.points;
        if (b.goalDifference !== a.goalDifference) return b.goalDifference - a.goalDifference;
        if (b.goalsFor !== a.goalsFor) return b.goalsFor - a.goalsFor;
        return a.team.localeCompare(b.team);
      });
      rows.forEach((row, index) => {
        row.position = index + 1;
      });
      return { group, rows };
    });
}, [isWorldCupMode, activeFixtures, results]);

const leaderboardDecorationsEnabled = useMemo(
  () => activeFixtures.some((fixture) => isFixtureCompleted(fixture, results)),
  [activeFixtures, results]
);

const currentPremierLeagueTableRows = useMemo(
  () => buildPremierLeagueTableRows(FIXTURES, results),
  [results]
);
const displayedPremierLeagueTableRows =
  premierLeagueTableView === PREMIER_TABLE_HISTORY_VIEW
    ? premierLeagueTableRows
    : currentPremierLeagueTableRows;
const displayedPremierLeagueTableStarted = displayedPremierLeagueTableRows.some(
  (row) => Number(row?.playedGames) > 0
);
const isHistoricalPremierLeagueTable = premierLeagueTableView === PREMIER_TABLE_HISTORY_VIEW;

const premierLeagueInsights = useMemo(() => {
  const out = {};
  (displayedPremierLeagueTableRows || []).forEach((row) => {
    const teamName = row?.team?.name || row?.team?.shortName || row?.team?.tla || "";
    if (!teamName) return;
    out[normalizeTeamName(teamName)] = buildPremierTeamInsights(
      teamName,
      results,
      leaguePerformanceContext
    );
  });
  return out;
}, [displayedPremierLeagueTableRows, results, leaguePerformanceContext]);

// (debug logs removed)

  const refreshAutoResults = async (mode = gameMode, fixtures = activeFixtures) => {
    setResultsRefreshing(true);
    setApiStatus(
      mode === WORLD_CUP_MODE
        ? "Refreshing World Cup results…"
        : "Refreshing Premier League results…"
    );
    const { matches, error, rateLimited, timedOut } = await fetchCompetitionResults(mode);
    if (rateLimited) {
      setApiStatus("Auto results: rate limited, using cached data");
      setResultsRefreshing(false);
      return;
    }
    if (timedOut) {
      setApiStatus(mode === WORLD_CUP_MODE
        ? "WC live sync slow, using scheduled kick-off times"
        : "Auto results: upstream slow, using existing data");
      setResultsRefreshing(false);
      return;
    }
    if (error) {
      setApiStatus(mode === WORLD_CUP_MODE
        ? "WC live sync unavailable, using scheduled kick-off times"
        : `Auto results: failed (${error})`);
      setResultsRefreshing(false);
      return;
    }
    setApiStatus("Auto results: loaded");
    if (matches?.length) {
      const {
        updatedResults,
        matchStateUpdates,
        fixtureOverrides,
        matchedCount,
      } = buildFixtureSyncPayload(matches, fixtures);

      if (Object.keys(fixtureOverrides).length) {
        setFixtureOverridesByMode((prev) => ({
          ...prev,
          [mode]: mergeFixtureOverrides(prev[mode], fixtureOverrides),
        }));
      }

      if (Object.keys(matchStateUpdates).length) {
        setMatchStatesByFixtureId((prev) => ({ ...prev, ...matchStateUpdates }));
      }
      if (matchedCount || Object.keys(matchStateUpdates).length) {
        setResults((prev) =>
          stripUnstartedResults(
            { ...prev, ...updatedResults },
            { ...matchStatesByFixtureId, ...matchStateUpdates }
          )
        );
      }
      if (matchedCount || Object.keys(matchStateUpdates).length) {
        apiSaveResultsSnapshot(updatedResults, matchStateUpdates);
      }
    }
    if (mode === WORLD_CUP_MODE) {
      setApiStatus(matches?.length ? "WC fixtures/results synced" : "WC sync ready");
    }
    setResultsRefreshing(false);
  };

  // ---------- INIT ----------
useEffect(() => {
  async function init() {
      // 1) restore app cache (pred/results/odds)
      try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const premierSeasonResetApplied =
        localStorage.getItem(PREMIER_SEASON_RESET_STORAGE_KEY) === "true";
      if (saved) {
        const parsed = JSON.parse(saved);
        setPredictions(keepSupportedFixturePredictions(parsed.predictions || {}));
        setResults(parsed.results || {});
        setOdds(parsed.odds || {});
        if (parsed.selectedGameweek)
          setSelectedGameweek(parsed.selectedGameweek);
      }
      if (!premierSeasonResetApplied) {
        localStorage.setItem(PREMIER_SEASON_RESET_STORAGE_KEY, "true");
      }
    } catch {}

    // 2) restore auth
    try {
      const savedAuth = localStorage.getItem(AUTH_STORAGE_KEY);
      if (savedAuth) {
        const parsedAuth = JSON.parse(savedAuth);
        if (parsedAuth?.token && parsedAuth?.userId && parsedAuth?.username) {
          setIsLoggedIn(true);
          setAuthToken(parsedAuth.token);
          setCurrentUserId(parsedAuth.userId);
          setCurrentPlayer(parsedAuth.username);
          setLoginName(parsedAuth.username);
        }
      }
    } catch {}
    setAuthHydrated(true);

    // 2b) Load backend results snapshot + saved match-state kickoffs
    try {
      const [snapshot, matchStatesSnapshot] = await Promise.all([
        apiGetResultsSnapshot(),
        apiGetMatchStatesSnapshot(),
      ]);
      if (snapshot && Object.keys(snapshot).length > 0) {
        setResults((prev) =>
          stripUnstartedResults({ ...prev, ...snapshot }, matchStatesSnapshot || {})
        );
      }
      if (matchStatesSnapshot && Object.keys(matchStatesSnapshot).length > 0) {
        setMatchStatesByFixtureId((prev) => ({ ...prev, ...matchStatesSnapshot }));
        setResults((prev) => stripUnstartedResults(prev, matchStatesSnapshot));
        setFixtureOverridesByMode((prev) => ({
          ...prev,
          [WORLD_CUP_MODE]: {
            ...(prev[WORLD_CUP_MODE] || {}),
            ...buildFixtureOverridesFromMatchStates(
              matchStatesSnapshot,
              getFixturesForMode(WORLD_CUP_MODE)
            ),
          },
        }));
      }
    } catch {}

        // 3) odds (initial load) — use shared in-app context model
    setOdds((prev) => ({
  ...prev,
  ...generatedModelOddsByFixture,
}));
  }

  init();
  return undefined;
}, []);

useEffect(() => {
  let cancelled = false;
  let intervalId = null;

  const runRefresh = async () => {
    if (cancelled) return;
    await refreshAutoResults(gameMode, activeFixtures);
  };

  runRefresh();
  intervalId = setInterval(runRefresh, 2 * 60 * 1000);

  return () => {
    cancelled = true;
    if (intervalId) clearInterval(intervalId);
  };
}, [gameMode]);

// ---------- COINS: LOAD WHEN USER OR GAMEWEEK CHANGES ----------
useEffect(() => {
  // If not logged in, just reset coins state for this gameweek
  if (!authToken || !selectedGameweek) {
    setCoinsState((prev) => ({
      ...prev,
      gameweek: selectedGameweek || null,
      used: 0,
      remaining: 10,
      bets: {},
      loading: false,
      error: "",
    }));
    return;
  }

  let cancelled = false;

  setCoinsState((prev) => ({
    ...prev,
    gameweek: selectedGameweek,
    loading: true,
    error: "",
  }));

  // Only allow editing for logged-in user; view-only for others
  const isViewingOwn = currentPlayer === loginName || currentPlayer === currentUserId;
  // const userIdToFetch = isViewingOwn ? null : currentPlayer;
  const fetchCoins = isViewingOwn
    ? apiGetMyCoins(authToken, selectedGameweek, gameMode)
    : apiGetUserCoins(currentPlayer, selectedGameweek);


  Promise.resolve(fetchCoins)
    .then((data) => {
      if (cancelled) return;
      setCoinsState({
        gameweek: data.gameweek,
        used: data.used ?? 0,
        remaining: data.remaining ?? 10,
        bets: data.bets || {},
        loading: false,
        error: "",
      });
    })
    .catch((err) => {
      if (cancelled) return;
      if (err?.message === "Unauthorized") {
        setAuthError("Session expired. Please log in again.");
        handleLogout();
        return;
      }
      // Only reset to empty if viewing your own coins
      const isViewingOwn = currentPlayer === loginName || currentPlayer === currentUserId;
      if (isViewingOwn) {
        setCoinsState((prev) => ({
          ...prev,
          gameweek: selectedGameweek,
          loading: false,
          error: err?.message || "Failed to load coins",
          used: 0,
          remaining: 10,
          bets: {},
        }));
      } else {
        setCoinsState((prev) => ({
          ...prev,
          loading: false,
          error: err?.message || "Failed to load coins",
        }));
      }
    });

  return () => {
    cancelled = true;
  };
}, [authToken, selectedGameweek, currentPlayer, loginName, currentUserId, gameMode]);

// Check if push notifications are supported
useEffect(() => {
  if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
    setPushSupported(true);
    navigator.serviceWorker.getRegistration()
      .then((registration) => (
        registration ? registration.pushManager.getSubscription() : null
      ))
      .then((subscription) => setPushEnabled(!!subscription))
      .catch((err) => {
        console.error("Push support check failed:", err);
        setPushEnabled(false);
      });
  }
}, []);

// Load push preferences after login
useEffect(() => {
  if (!isLoggedIn || !authToken) return;
  (async () => {
    try {
      const prefs = await apiGetPushPrefs(authToken);
      if (prefs && typeof prefs === "object") {
        setPushPrefs((prev) => {
          const next = { ...DEFAULT_PUSH_PREFS, ...prev, ...prefs };
          localStorage.setItem("push_prefs_v1", JSON.stringify(next));
          return next;
        });
      }
    } catch {}
  })();
}, [isLoggedIn, authToken, gameMode]);

useEffect(() => {
  if (!isLoggedIn || !authToken) {
    setFixturePushPrefs({});
    return;
  }

  (async () => {
    try {
      const remotePrefs = await apiGetFixturePushPrefs(authToken);
      setFixturePushPrefs((localPrefs) => {
        const fixturePrefs = { ...localPrefs, ...(remotePrefs || {}) };
        localStorage.setItem(FIXTURE_PUSH_STORAGE_KEY, JSON.stringify(fixturePrefs));
        return fixturePrefs;
      });
    } catch {}
  })();
}, [isLoggedIn, authToken]);

// Render's filesystem can be replaced during a deploy. Re-register an existing
// browser subscription after login and restore locally cached bell choices.
useEffect(() => {
  if (!isLoggedIn || !authToken || !pushSupported) return;

  (async () => {
    try {
      const registration = await navigator.serviceWorker.getRegistration();
      const subscription = registration
        ? await registration.pushManager.getSubscription()
        : null;
      if (!subscription) {
        setPushEnabled(false);
        return;
      }

      const localPushPrefs = {
        ...DEFAULT_PUSH_PREFS,
        ...JSON.parse(localStorage.getItem("push_prefs_v1") || "{}"),
      };
      const localFixturePrefs = JSON.parse(
        localStorage.getItem(FIXTURE_PUSH_STORAGE_KEY) || "{}"
      );
      const res = await fetch(`${BACKEND_BASE}/api/push/subscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          subscription,
          prefs: localPushPrefs,
          fixturePrefs: localFixturePrefs,
        }),
      });
      if (!res.ok) throw new Error("Backend subscription sync failed");
      setPushEnabled(true);
    } catch (err) {
      console.error("Push subscription sync failed:", err);
      setPushEnabled(false);
    }
  })();
}, [isLoggedIn, authToken, pushSupported]);

// Fetch multi-player coins leaderboard from backend
useEffect(() => {
  if (
    activeView !== "coinsLeague" &&
    activeView !== "summary" &&
    activeView !== "badges" &&
    activeView !== "league" &&
    activeView !== "globalLeague"
  ) return;
  if (!authToken) return; // Don't fetch if not authenticated yet

  let cancelled = false;
  let activeController = null;

  const fetchCoinsLeaderboard = async () => {
    try {
      if (activeController) activeController.abort();
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const leagueId = activeView === "globalLeague" ? "" : selectedMiniLeague?.id || "";
      const url = leagueId
        ? `${BACKEND_BASE}/api/coins/leaderboard?leagueId=${encodeURIComponent(leagueId)}&mode=${encodeURIComponent(getModeKey(gameMode))}`
        : `${BACKEND_BASE}/api/coins/leaderboard?mode=${encodeURIComponent(getModeKey(gameMode))}`;
      const res = await fetch(url, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (cancelled) return;

      if (!res.ok) {
        console.error("coins leaderboard failed", res.status);
        return;
      }

      const data = await res.json();
      if (data && Array.isArray(data.leaderboard)) {
        setCoinsLeagueRows(data.leaderboard);
      }
    } catch (err) {
      if (cancelled) return;
      if (err.name === 'AbortError') {
        console.error("coins leaderboard timeout");
      } else {
        console.error("coins leaderboard error", err);
      }
    }
  };

  fetchCoinsLeaderboard();
  const intervalId = setInterval(fetchCoinsLeaderboard, 60 * 1000);
  const refreshWhenVisible = () => {
    if (document.visibilityState === "visible") fetchCoinsLeaderboard();
  };
  document.addEventListener("visibilitychange", refreshWhenVisible);

  return () => {
    cancelled = true;
    clearInterval(intervalId);
    document.removeEventListener("visibilitychange", refreshWhenVisible);
    if (activeController) activeController.abort();
  };
}, [activeView, authToken, selectedMiniLeague, gameMode]);

// Fetch global predictions (all users) when Global League or World Cup History is opened
useEffect(() => {
  if (activeView !== "globalLeague" && !(activeView === "history" && isWorldCupMode)) return;
  if (!isLoggedIn || !authToken) return;

  let cancelled = false;

  async function loadGlobal() {
    try {
      const data = await apiGetAllPredictions(authToken);
      if (cancelled) return;
      setGlobalUsers(data.users || []);
      setGlobalPredictionsByUserId(data.predictionsByUserId || {});
    } catch (err) {
      console.error("Global predictions failed:", err);
    }
  }

  loadGlobal();
  return () => {
    cancelled = true;
  };
}, [activeView, isLoggedIn, authToken, isWorldCupMode]);

useEffect(() => {
  if (activeView !== "premierLeagueTable") return;
  if (premierLeagueTableView !== PREMIER_TABLE_HISTORY_VIEW) {
    setPremierLeagueTableLoading(false);
    setPremierLeagueTableError("");
    return;
  }
  if (premierLeagueTableRows.length > 0) return;

  let cancelled = false;

  async function loadStandings() {
    setPremierLeagueTableLoading(true);
    setPremierLeagueTableError("");

    const { table, error, updatedAt } = await fetchPremierLeagueStandings();
    if (cancelled) return;

    if (error) {
      setPremierLeagueTableError(error);
      setPremierLeagueTableLoading(false);
      return;
    }

    setPremierLeagueTableRows(table);
    if (updatedAt) setLastStandingsUpdated(updatedAt);
    setPremierLeagueTableLoading(false);
  }

  loadStandings();
  return () => {
    cancelled = true;
  };
}, [activeView, premierLeagueTableView, premierLeagueTableRows.length]);

  // If odds didn’t load on first mount (some mobile browsers do this),
// refetch them when user opens Win Probabilities.
/*
useEffect(() => {
  const noOddsYet = !odds || Object.keys(odds).length === 0;
  if (!noOddsYet) return;

  (async () => {
    const { markets, error } = await fetchPremierLeagueOdds();
    if (error || !markets?.length) return;

    const newOdds = {};
    markets.forEach((m) => {
      // ... mapping logic ...
    });

    if (Object.keys(newOdds).length) {
      setOdds((prev) => ({ ...prev, ...newOdds }));
    }
  })();
}, []);
*/

  // Auto select next gameweek
useEffect(() => {
  // Only auto-advance on first load if the user hasn't stored a GW yet
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed?.selectedGameweek || parsed?.selectedGameweekByMode?.[PREMIER_MODE]) return;
    }
  } catch {}

  const now = new Date();
  const next = FIXTURES.find((f) => new Date(f.kickoff) > now);
  if (next) setSelectedGameweek(next.gameweek);
}, []);

  // Detect mobile + close menu if switching to desktop
useEffect(() => {
  const onResize = () => {
    const mobile = window.innerWidth <= 600;
    setIsMobile(mobile);
    if (!mobile) setShowMobileMenu(false);
  };
  window.addEventListener("resize", onResize);
  return () => window.removeEventListener("resize", onResize);
}, []);

  // Persist app cache
  useEffect(() => {
    const cachePredictions = keepSupportedFixturePredictions(predictions);
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ predictions: cachePredictions, results, odds, selectedGameweek, selectedGameweekByMode })
    );
  }, [predictions, results, odds, selectedGameweek, selectedGameweekByMode]);

  // Persist auth
  useEffect(() => {
    if (!authHydrated) return;
    if (isLoggedIn && authToken && currentUserId && currentPlayer) {
      localStorage.setItem(
        AUTH_STORAGE_KEY,
        JSON.stringify({
          token: authToken,
          userId: currentUserId,
          username: currentPlayer,
        })
      );
    } else {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    }
  }, [authHydrated, isLoggedIn, authToken, currentUserId, currentPlayer]);

  // Load cloud predictions after login/restore (ONLY for logged-in user)
  useEffect(() => {
    async function loadCloud() {
      if (DEV_USE_LOCAL) return;
      if (!isLoggedIn || !authToken || !currentUserId) return;

      try {
        const remote = await apiGetMyPredictions(authToken);
        if (!remote || typeof remote !== "object") return;

        // Always use the logged-in user's key
        const key = currentUserId;

        // Normalize per mode so existing Premier League scores and World Cup
        // matchday captains cannot clear each other.
        const normalized = normalizeCaptainsByGameweek(
          normalizeCaptainsByGameweek(remote, FIXTURES),
          WORLD_CUP_FIXTURES
        );
        const resetSafeRemote =
          keepSupportedFixturePredictions({ [key]: normalized })[key] || {};

        // Replace only the logged-in user's predictions with the cloud data
        setPredictions((prev) => {
          const resetSafePrev = keepSupportedFixturePredictions(prev);
          const localPredsForUser =
            currentPlayer === "Phil"
              ? {
                  ...(resetSafePrev[key] || {}),
                  ...(resetSafePrev.Phil_merged || {}),
                }
              : resetSafePrev[key] || {};
          const merged = mergeCloudPredictionsPreservingLocalBoosts(
            resetSafeRemote,
            localPredsForUser,
            ALL_SUPPORTED_FIXTURES
          );

          return {
            ...resetSafePrev,
            [key]: { ...merged },
          };
        });
      } catch (err) {
        console.error("Cloud predictions failed:", err);
      }
    }

    loadCloud();
  }, [isLoggedIn, authToken, currentUserId, currentPlayer]);
  
 
    //  // One-time migration: move Phil_legacy local preds into Phil cloud account
  useEffect(() => {
    async function migratePhilLegacy() {
      if (DEV_USE_LOCAL) return;
      if (!isLoggedIn || !authToken || !currentUserId) return;
      if (currentPlayer !== "Phil") return;

      // Already migrated once? Do nothing.
      if (localStorage.getItem(MIGRATION_FLAG) === "true") return;

      const legacy = predictions["Phil_legacy"];
      if (!legacy || Object.keys(legacy).length === 0) return;

      try {
        // push each legacy prediction to backend under Phil's real userId
        const fixtureIds = Object.keys(legacy);
        for (const fixtureId of fixtureIds) {
          const pred = legacy[fixtureId];
          if (!pred) continue;

          await apiSavePrediction(authToken, fixtureId, pred);
        }

        // merge locally too (so UI shows them under Phil)
        setPredictions((prev) => ({
          ...prev,
          Phil: {
            ...(prev.Phil || {}),
            ...legacy,
          },
        }));

        // mark migrated so it never repeats
        localStorage.setItem(MIGRATION_FLAG, "true");
        console.log("✅ Phil legacy predictions migrated:", fixtureIds.length);
      } catch (e) {
        console.error("❌ Phil legacy migration failed:", e);
      }
    }

    // actually run the migration once the right user is logged in
    migratePhilLegacy();
  }, [isLoggedIn, authToken, currentUserId, currentPlayer, predictions]);
  // Auto-load my leagues after login/restore
useEffect(() => {
  async function loadLeaguesAuto() {
    if (DEV_USE_LOCAL) return;
    if (!isLoggedIn || !authToken) {
      setMyLeagues([]);
      return;
    }

    try {
      const leagues = await apiFetchMyLeagues(authToken, gameMode);
      setMyLeagues(leagues);
    } catch (err) {
      console.error("Auto load leagues failed:", err);
      setMyLeagues([]);
    }
  }

  loadLeaguesAuto();
}, [isLoggedIn, authToken, gameMode]);

useEffect(() => {
  if (!isLoggedIn || !currentUserId) {
    setSelectedLeagueId("");
    return;
  }

  const storageKey = `${currentUserId}:${getModeKey(gameMode)}`;
  const savedLeagueId = getSelectedMiniLeagueStorageMap()[storageKey];
  setSelectedLeagueId(savedLeagueId ? String(savedLeagueId) : "");
}, [isLoggedIn, currentUserId, gameMode]);

useEffect(() => {
  if (!Array.isArray(myLeagues) || myLeagues.length === 0) {
    setSelectedLeagueId("");
    return;
  }

  setSelectedLeagueId((currentId) => {
    const stillExists = myLeagues.some((league) => String(league.id) === String(currentId));
    const storageKey = currentUserId ? `${currentUserId}:${getModeKey(gameMode)}` : "";
    const savedLeagueId = storageKey ? getSelectedMiniLeagueStorageMap()[storageKey] : "";
    const savedStillExists =
      savedLeagueId &&
      myLeagues.some((league) => String(league.id) === String(savedLeagueId));
    const nextId = stillExists ? currentId : savedStillExists ? String(savedLeagueId) : myLeagues[0].id;
    if (currentUserId && nextId) {
      try {
        const saved = getSelectedMiniLeagueStorageMap();
        saved[storageKey] = String(nextId);
        localStorage.setItem(SELECTED_MINI_LEAGUE_STORAGE_KEY, JSON.stringify(saved));
      } catch {}
    }
    return nextId;
  });
}, [myLeagues, currentUserId, gameMode]);
  
useEffect(() => {
  if (DEV_USE_LOCAL) return;
  if (!isLoggedIn || !authToken) {
    setComputedWeeklyTotals(null);
    setComputedLeagueTotals(null);
    setComputedTotalsLeagueId("");
    setLeagueUsernamesByUserId({});
    return;
  }
  if (!myLeagues || myLeagues.length === 0) {
    setComputedWeeklyTotals(null);
    setComputedLeagueTotals(null);
    setComputedTotalsLeagueId("");
    setLeagueUsernamesByUserId({});
    return;
  }

  const leagueId = selectedMiniLeague?.id;
  if (!leagueId) {
    setComputedWeeklyTotals(null);
    setComputedLeagueTotals(null);
    setComputedTotalsLeagueId("");
    setLeagueUsernamesByUserId({});
    setLeagueHistoryUsers([]);
    setLeaguePredictionsByUserId({});
    return;
  }

  setComputedWeeklyTotals(null);
  setComputedLeagueTotals(null);
  setComputedTotalsLeagueId("");
  setLeagueHistoryUsers([]);
  setLeaguePredictionsByUserId({});

  let cancelled = false;

  const toLegacyKey = (u) => {
    const uname = (u.username || "").trim();

    // Exact legacy names stay as-is
    if (PLAYERS.includes(uname)) return uname;

    // Anything like "Phil_legacy" -> "Phil"
    if (/_legacy$/i.test(uname)) {
      const base = uname.replace(/_legacy$/i, "");
      if (PLAYERS.includes(base)) return base;
      return base; // if not a known legacy player, still use base string
    }

    // Otherwise use their userId (modern user)
    return String(u.userId || "");
  };

  async function recalcFromLeague() {
    try {
      // 1) Fetch all league predictions from backend
      const data = await apiGetLeaguePredictions(authToken, leagueId);
      const users = data.users || [];
      const predictionsByUserId = data.predictionsByUserId || {};
      const usernamesByUserId = {};
      users.forEach((u) => {
        if (u?.userId && u?.username) {
          usernamesByUserId[String(u.userId)] = u.username;
        }
      });

      // 2) Filter to ONLY actual members of this league (if list exists)
      const leagueObj = selectedMiniLeague || {};
      const memberIds = Array.isArray(leagueObj.members)
        ? leagueObj.members
        : Array.isArray(leagueObj.memberUserIds)
        ? leagueObj.memberUserIds
        : [];
      const memberIdSet = new Set(memberIds.map((memberId) => String(memberId)));

      const leagueUsers =
        memberIdSet.size === 0
          ? users
          : users.filter((u) => memberIdSet.has(String(u.userId)));
      const historyUsersByName = {};
      leagueUsers.forEach((u) => {
        const name = (u?.username || "").trim();
        const userId = String(u?.userId || "");
        if (!name || !userId) return;
        const predictionCount = Object.keys(predictionsByUserId[userId] || {}).length;
        const existing = historyUsersByName[name];
        if (!existing || predictionCount > existing.predictionCount) {
          historyUsersByName[name] = { userId, username: name, predictionCount };
        }
      });
      const nextLeagueHistoryUsers = Object.values(historyUsersByName).map(
        ({ userId, username }) => {
          const source = leagueUsers.find((u) => String(u?.userId || "") === String(userId)) || {};
          return {
            userId,
            username,
            createdAt: source.createdAt || "",
            favoriteTeam: source.favoriteTeam || "",
            favoriteCountry: source.favoriteCountry || "",
          };
        }
      );

      // 3) Keys = league members (mapped). The legacy Originals league keeps
      // its historical player rows, but new private leagues must not inherit them.
      const memberKeys = leagueUsers.map(toLegacyKey);
      const keys = !isWorldCupMode && isOriginalsMiniLeague(leagueObj)
        ? Array.from(new Set([...PLAYERS, ...memberKeys]))
        : Array.from(new Set(memberKeys));

      // 4) Build predictions for calculation:
      //    start with any local preds for these keys, then overlay remote
      const userIdByKey = {};
      const rankedLeagueUsers = [...leagueUsers].sort((a, b) => {
        const aName = (a?.username || "").trim();
        const bName = (b?.username || "").trim();
        const aIsCurrent = String(a?.userId || "") === String(currentUserId || "");
        const bIsCurrent = String(b?.userId || "") === String(currentUserId || "");
        if (aIsCurrent !== bIsCurrent) return aIsCurrent ? -1 : 1;

        const aIsLegacyAlias = /_legacy$/i.test(aName);
        const bIsLegacyAlias = /_legacy$/i.test(bName);
        if (aIsLegacyAlias !== bIsLegacyAlias) return aIsLegacyAlias ? 1 : -1;

        const aIsExactLegacy = PLAYERS.includes(aName);
        const bIsExactLegacy = PLAYERS.includes(bName);
        if (aIsExactLegacy !== bIsExactLegacy) return aIsExactLegacy ? -1 : 1;

        return 0;
      });

      rankedLeagueUsers.forEach((u) => {
        const key = toLegacyKey(u);
        if (!userIdByKey[key]) userIdByKey[key] = String(u.userId || "");
      });

      if (!isWorldCupMode && currentUserId && currentPlayer && PLAYERS.includes(currentPlayer)) {
        userIdByKey[currentPlayer] = currentUserId;
      }

      const predsForCalc = {};

      keys.forEach((k) => {
        // Only use this user's predictions, do not fallback to any other user
        const legacyData = predictions[k] || {};
        const userId = userIdByKey[k];
        const cloudDataRaw = userId ? (predictionsByUserId[userId] || {}) : {};
        const cloudData = isWorldCupMode
          ? (keepOnlyWorldCupPredictions({ [k]: cloudDataRaw })[k] || {})
          : (keepSupportedFixturePredictions({ [k]: cloudDataRaw })[k] || {});
        const philMergedData = k === "Phil" ? (predictions["Phil_merged"] || {}) : {};

        // Normalise all fixture IDs to STRING keys
        const legacyDataStr = Object.fromEntries(
          Object.entries(legacyData).map(([id, val]) => [String(id), val])
        );
        const cloudDataStr = Object.fromEntries(
          Object.entries(cloudData).map(([id, val]) => [String(id), val])
        );
        const philMergedDataStr = Object.fromEntries(
          Object.entries(philMergedData).map(([id, val]) => [String(id), val])
        );

        // Prefer cloud data when available; only fall back to the local Phil merge
        // for legacy migration cases where the backend has no current record yet.
        if (Object.keys(cloudDataStr).length > 0) {
          predsForCalc[k] = { ...cloudDataStr };
        } else if (k === "Phil" && Object.keys(philMergedDataStr).length > 0) {
          predsForCalc[k] = isWorldCupMode ? { ...philMergedDataStr } : {};
        } else {
          predsForCalc[k] = isWorldCupMode ? { ...legacyDataStr } : {};
        }
      });

      if (currentPredictionKey && predsForCalc[currentPredictionKey] && predictions[currentPredictionKey]) {
        predsForCalc[currentPredictionKey] = { ...predictions[currentPredictionKey] };
      }

      // 5) Compute weekly totals (spreadsheet base + recalculated points)
      const weeklyTotals = {};
      activeGameweeks.forEach((gw) => {
        weeklyTotals[gw] = {};
        keys.forEach((k) => {
          let score = isWorldCupMode ? 0 : (SPREADSHEET_WEEKLY_TOTALS[k]?.[gw - 1] || 0);

          activeFixtures.forEach((fx) => {
            if (fx.gameweek !== gw) return;
            const r = results[fx.id];
            if (!hasValidResultScore(r)) return;
            score += getTotalPoints(predsForCalc[k]?.[fx.id], r);
          });

          weeklyTotals[gw][k] = score;
        });
      });

      // 6) League totals (sum of weekly)
      const leagueTotals = {};
      keys.forEach((k) => {
        leagueTotals[k] = activeGameweeks.reduce(
          (sum, gw) => sum + (weeklyTotals[gw][k] || 0),
          0
        );
      });

      if (cancelled) return;

      // Store all players' predictions so they can be viewed, but avoid
      // retriggering this recalculation when the fetched data is unchanged.
      setPredictions((prev) => {
        const next = { ...prev };
        let changed = false;
        Object.entries(predsForCalc).forEach(([key, value]) => {
          if (String(key) === String(currentPredictionKey || "")) return;
          if (JSON.stringify(prev[key] || {}) !== JSON.stringify(value || {})) {
            next[key] = value;
            changed = true;
          }
        });
        return changed ? next : prev;
      });

      setComputedWeeklyTotals(weeklyTotals);
      setComputedLeagueTotals(leagueTotals);
      setComputedTotalsLeagueId(String(leagueId));
      setLeagueUsernamesByUserId(usernamesByUserId);
      setLeagueHistoryUsers(nextLeagueHistoryUsers);
      setLeaguePredictionsByUserId(predictionsByUserId);

      // 7) Sync totals back to backend
      // apiSaveLeagueTotals(authToken, leagueId, {
//   weeklyTotals,
//   leagueTotals,
// }).catch((e) => console.error("Failed to sync totals:", e));
    } catch (err) {
      console.error("Recalc from league failed:", err);
      if (!cancelled) {
        setLeagueUsernamesByUserId({});
        setLeagueHistoryUsers([]);
        setLeaguePredictionsByUserId({});
      }
    }
  }

  recalcFromLeague();

  return () => {
    cancelled = true;
  };
}, [results, predictions, isLoggedIn, authToken, myLeagues, selectedMiniLeague, activeFixtures, activeGameweeks, isWorldCupMode, currentUserId, currentPlayer, currentPredictionKey]);

useEffect(() => {
  if (DEV_USE_LOCAL) return;
  if (activeView !== "leagues") return;
  if (!isLoggedIn || !authToken) {
    setMiniLeagueLeaderboardRows([]);
    setMiniLeagueLeaderboardError("");
    return;
  }

  let cancelled = false;

  async function loadMiniLeagueLeaderboard() {
    setMiniLeagueLeaderboardLoading(true);
    setMiniLeagueLeaderboardError("");

    try {
      const sortedRows = await apiGetMiniLeagueLeaderboard(authToken, gameMode);
      if (cancelled) return;
      setMiniLeagueLeaderboardRows(sortedRows);
    } catch (err) {
      if (cancelled) return;
      setMiniLeagueLeaderboardError(
        err?.message || "Failed to load mini-league leaderboard."
      );
      setMiniLeagueLeaderboardRows([]);
    } finally {
      if (!cancelled) setMiniLeagueLeaderboardLoading(false);
    }
  }

  loadMiniLeagueLeaderboard();

  return () => {
    cancelled = true;
  };
}, [activeView, isLoggedIn, authToken, results, gameMode]);
  // ---------- AUTH ----------
  const handleAuthSubmit = async (e, mode) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const name = (mode === "signup" ? signupName : loginName).trim();
    const pwd = (mode === "signup" ? signupPassword : loginPassword).trim();
    const email = signupEmail.trim();
    const favoriteTeam = signupFavoriteTeam.trim();

    if (mode === "signup") {
      if (!name || !pwd || !email || !favoriteTeam) {
        setAuthLoading(false);
        return setAuthError("Signup requires username, password, email, and favourite team.");
      }
      if (name.length > MAX_USERNAME_LENGTH) {
        setAuthLoading(false);
        return setAuthError(`Username must be ${MAX_USERNAME_LENGTH} characters or fewer.`);
      }
    } else if (!name || !pwd) {
      setAuthLoading(false);
      return setAuthError("Enter username + password.");
    }

    try {
      const result =
        mode === "signup"
          ? await apiSignup(name, pwd, email, favoriteTeam)
          : await apiLogin(name, pwd);
      const landingGameweek = getPredictionLandingGameweek(activeFixtures, activeGameweeks);

      setIsLoggedIn(true);
      setAuthToken(result.token);
      setCurrentUserId(result.userId);
      setCurrentPlayer(result.username);
      setActiveView("predictions");
      setSelectedGameweek(landingGameweek);
      setSelectedGameweekByMode((prev) => ({
        ...prev,
        [gameMode]: landingGameweek,
      }));
      setLoginPassword("");
      setSignupPassword("");
      setSignupEmail("");
      setSignupFavoriteTeam("");
      setShowForgotPassword(false);
      setShowResetPassword(false);
      setForgotError("");
      setForgotSuccess("");
      setResetError("");
      setResetSuccess("");
      if (mode === "signup" && result.userId) {
        setWelcomePendingUserId(String(result.userId));
      }
      window.requestAnimationFrame(() => {
        window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      });
      setAuthLoading(false);
    } catch (err) {
      setAuthLoading(false);
      setAuthError(err.message || "Auth failed.");
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setForgotError("");
    setForgotSuccess("");
    try {
      const data = await apiForgotPassword(forgotUsername, forgotEmail);
      let msg =
        data?.message ||
        "If your username and email match an account, a reset link has been sent.";
      if (data?.resetLink) {
        msg += ` (Dev link: ${data.resetLink})`;
      }
      setForgotSuccess(msg);
    } catch (err) {
      setForgotError(err.message || "Failed to request reset.");
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError("");
    setResetSuccess("");
    try {
      await apiResetPassword(resetTokenInput, resetPasswordInput);
      setResetSuccess("Password updated. You can now log in.");
      setResetPasswordInput("");
      setShowResetPassword(false);
      setShowForgotPassword(false);
      try {
        const url = new URL(window.location.href);
        url.searchParams.delete("resetToken");
        window.history.replaceState({}, "", url.toString());
      } catch {}
    } catch (err) {
      setResetError(err.message || "Failed to reset password.");
    }
  };

  const shouldShowWelcome = Boolean(
    isLoggedIn &&
      currentUserId &&
      welcomePendingUserId &&
      String(welcomePendingUserId) === String(currentUserId)
  );
  const showWelcomePage = shouldShowWelcome || activeView === "welcome";

  useEffect(() => {
    if (!showWelcomePage) return;
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [showWelcomePage]);

  const completeWelcome = (nextView = "predictions") => {
    try {
      const saved = localStorage.getItem(WELCOME_SEEN_STORAGE_KEY);
      const seen = saved ? JSON.parse(saved) : {};
      localStorage.setItem(
        WELCOME_SEEN_STORAGE_KEY,
        JSON.stringify({ ...(seen || {}), [String(currentUserId)]: true })
      );
    } catch {}
    setWelcomePendingUserId("");
    setActiveView(nextView);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    });
  };

  useEffect(() => {
    if (!isLoggedIn || !authToken) return;
    let cancelled = false;
    setAccountMeLoaded(false);
    (async () => {
      try {
        const me = await apiGetAccountMe(authToken);
        if (cancelled) return;
        setAccountEmail(me?.email || "");
        setAccountEmailInput(me?.email || "");
        setAccountFavoriteTeam(me?.favoriteTeam || "");
        setAccountFavoriteTeamInput(me?.favoriteTeam || "");
        setAccountFavoriteCountry(me?.favoriteCountry || "");
        setAccountFavoriteCountryInput(me?.favoriteCountry || "");
      } catch {}
      if (!cancelled) setAccountMeLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, authToken]);

  useEffect(() => {
    if (!currentUserId) return;
    const savedCountry = favoriteCountriesByUserId[String(currentUserId)] || "";
    if (savedCountry && !accountFavoriteCountry) {
      setAccountFavoriteCountry(savedCountry);
      setAccountFavoriteCountryInput((prev) => prev || savedCountry);
    }
  }, [currentUserId, favoriteCountriesByUserId, accountFavoriteCountry]);

  useEffect(() => {
    if (!currentUserId) return;
    const savedTeam = favoriteTeamsByUserId[String(currentUserId)] || "";
    if (savedTeam && !accountFavoriteTeam) {
      setAccountFavoriteTeam(savedTeam);
      setAccountFavoriteTeamInput((prev) => prev || savedTeam);
    }
  }, [currentUserId, favoriteTeamsByUserId, accountFavoriteTeam]);

  const handleSaveRecoveryEmail = async () => {
    setAccountEmailError("");
    setAccountEmailStatus("");
    try {
      const data = await apiSetAccountEmail(authToken, accountEmailInput);
      setAccountEmail(data?.email || accountEmailInput);
      setAccountEmailStatus("Recovery email saved.");
    } catch (err) {
      setAccountEmailError(err.message || "Failed to save recovery email.");
    }
  };

  const handleSaveFavoriteTeam = async () => {
    setAccountFavoriteTeamError("");
    setAccountFavoriteTeamStatus("");
    try {
      const targetValue = isWorldCupMode ? accountFavoriteCountryInput : accountFavoriteTeamInput;
      const data = await apiSetFavoriteTeam(authToken, targetValue, gameMode);
      const team = data?.favoriteTeam || targetValue;
      if (isWorldCupMode) {
        setAccountFavoriteCountry(team);
        setAccountFavoriteCountryInput(team);
        if (currentUserId) {
          setFavoriteCountriesByUserId((prev) => ({
            ...(prev || {}),
            [String(currentUserId)]: team,
          }));
        }
        setAccountFavoriteTeamStatus("Favourite country saved.");
        setShowWorldCupFavoritePrompt(false);
        localStorage.setItem(`wc_favorite_prompt_seen_${currentUserId}`, "true");
      } else {
        setAccountFavoriteTeam(team);
        setAccountFavoriteTeamInput(team);
        if (currentUserId) {
          setFavoriteTeamsByUserId((prev) => ({
            ...(prev || {}),
            [String(currentUserId)]: team,
          }));
        }
        setAccountFavoriteTeamStatus("Favourite team saved.");
      }
    } catch (err) {
      setAccountFavoriteTeamError(
        err.message || (isWorldCupMode ? "Failed to save favourite country." : "Failed to save favourite team.")
      );
    }
  };

  useEffect(() => {
    if (!isWorldCupMode || !isLoggedIn || !currentUserId || !accountMeLoaded) return;
    if (resolvedAccountFavoriteCountry) return;
    const promptKey = `wc_favorite_prompt_seen_${currentUserId}`;
    if (localStorage.getItem(promptKey) !== "true") {
      localStorage.setItem(promptKey, "true");
    }
    setShowWorldCupFavoritePrompt(false);
  }, [isWorldCupMode, isLoggedIn, currentUserId, accountMeLoaded, resolvedAccountFavoriteCountry]);

  useEffect(() => {
    if (resolvedAccountFavoriteCountry) {
      setShowWorldCupFavoritePrompt(false);
    }
  }, [resolvedAccountFavoriteCountry]);
  // ---------- CHANGE PASSWORD ----------
const handlePasswordChange = async () => {
  setPasswordError("");
  setPasswordSuccess("");

  try {
    await apiChangePassword(authToken, oldPasswordInput, newPasswordInput);

setPasswordSuccess("Password updated successfully!");
setOldPasswordInput("");
setNewPasswordInput("");
  } catch (err) {
    setPasswordError(err.message || "Failed to update password.");
  }
};

  function handleLogout() {
    setIsLoggedIn(false);
    setAuthToken("");
    setCurrentPlayer("");
    setCurrentUserId("");
    setLoginPassword("");
    setAuthError("");
    setMyLeagues([]);
    setAvatarsByUserId({});
    setFavoriteTeamsByUserId({});
    setShowMobileMenu(false);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }

  const updatePushPref = async (key, value) => {
    const next = { ...pushPrefs, [key]: value };
    setPushPrefs(next);
    localStorage.setItem("push_prefs_v1", JSON.stringify(next));
    if (pushEnabled && authToken) {
      try {
        await apiSetPushPrefs(authToken, next);
      } catch {}
    }
  };

  const ensurePushRegistration = async () => {
    const existing = await navigator.serviceWorker.getRegistration();
    if (existing) return existing;
    const registration = await navigator.serviceWorker.register('/service-worker.js');
    await navigator.serviceWorker.ready;
    return registration;
  };

  const getExistingPushSubscription = async () => {
    const registration = await ensurePushRegistration();
    const subscription = await registration.pushManager.getSubscription();
    return { registration, subscription };
  };

  const removePushSubscription = async (subscription) => {
    const endpoint = subscription?.endpoint || null;
    if (!subscription) return;

    await subscription.unsubscribe().catch(() => {});
    if (authToken) {
      await fetch(`${BACKEND_BASE}/api/push/unsubscribe`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({ endpoint }),
      }).catch(() => {});
    }
  };

  const enablePushNotifications = async ({ refreshExisting = true } = {}) => {
    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      setPushEnabled(false);
      throw new Error("Permission denied for notifications");
    }

    const vapidRes = await fetch(`${BACKEND_BASE}/api/push/vapid-public-key`);
    if (!vapidRes.ok) {
      throw new Error(`Failed to get VAPID key: ${vapidRes.status}`);
    }

    const { publicKey } = await vapidRes.json();
    const { registration, subscription: existingSubscription } =
      await getExistingPushSubscription();
    if (refreshExisting && existingSubscription) {
      await removePushSubscription(existingSubscription);
    }
    const subscription =
      (!refreshExisting && existingSubscription) ||
      (await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      }));

    const subRes = await fetch(`${BACKEND_BASE}/api/push/subscribe`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({ subscription, prefs: pushPrefs, fixturePrefs: fixturePushPrefs }),
    });

    if (!subRes.ok) {
      const subData = await subRes.json().catch(() => ({}));
      throw new Error(subData.error || "Failed to save subscription");
    }

    setPushEnabled(true);
    return true;
  };

  const disablePushNotifications = async () => {
    const registration = await navigator.serviceWorker.getRegistration();
    const subscription = registration
      ? await registration.pushManager.getSubscription()
      : null;
    await removePushSubscription(subscription);

    setPushEnabled(false);
    return true;
  };

  const toggleFixturePush = async (fixtureId) => {
    if (!authToken) {
      alert("Please log in again.");
      return;
    }
    if (!pushSupported) {
      alert("Push notifications are not supported in this browser.");
      return;
    }

    const fixtureKey = String(fixtureId);
    const previousEnabled = !!fixturePushPrefs[fixtureKey];
    const nextEnabled = !previousEnabled;

    try {
      if (nextEnabled && !pushEnabled) {
        await enablePushNotifications();
      }

      setFixturePushPrefs((prev) => ({
        ...prev,
        [fixtureKey]: nextEnabled,
      }));

      const savedPrefs = await apiSetFixturePushPref(authToken, fixtureKey, nextEnabled);
      setFixturePushPrefs(savedPrefs || {});
      localStorage.setItem(FIXTURE_PUSH_STORAGE_KEY, JSON.stringify(savedPrefs || {}));
      playFixtureBellSound(nextEnabled);
    } catch (err) {
      setFixturePushPrefs((prev) => ({ ...prev, [fixtureKey]: previousEnabled }));
      alert(`Failed to update fixture notifications: ${err.message}`);
    }
  };

  // ---------- MINI-LEAGUES ----------
  const handleLoadLeagues = async () => {
    if (!authToken) return setLeagueError("Please log in again.");
    setLeaguesLoading(true);
    setLeagueError("");
    setLeagueSuccess("");
    try {
      const leagues = await apiFetchMyLeagues(authToken, gameMode);
      setMyLeagues(leagues);
      if (!leagues.length) setLeagueSuccess("No mini‑leagues yet.");
    } catch (err) {
      setLeagueError(err.message || "Failed to load mini‑leagues.");
    } finally {
      setLeaguesLoading(false);
    }
  };

  const coinsLeagueTitle = isWorldCupMode ? "WC Coins League" : "Coins League";

  const handleCreateLeague = async (e) => {
    e.preventDefault();
    if (!authToken) return setLeagueError("Please log in again.");
    const name = leagueNameInput.trim();
    if (!name) return setLeagueError("Enter a league name.");
    setLeagueError("");
    setLeagueSuccess("");
    try {
      const league = await apiCreateLeague(authToken, name, gameMode);
      setLeagueSuccess(`Created "${league.name || name}".`);
      setLeagueNameInput("");
      if (league.id) rememberSelectedLeagueId(league.id);
      await handleLoadLeagues();
    } catch (err) {
      setLeagueError(err.message || "Failed to create league.");
    }
  };

  const handleJoinLeague = async (e) => {
    e.preventDefault();
    if (!authToken) return setLeagueError("Please log in again.");
    const code = leagueJoinCode.trim();
    if (!code) return setLeagueError("Enter a join code.");
    setLeagueError("");
    setLeagueSuccess("");
    try {
      const league = await apiJoinLeague(authToken, code, gameMode);
      setLeagueSuccess(`Joined "${league.name || "league"}".`);
      setLeagueJoinCode("");
      if (league.id) rememberSelectedLeagueId(league.id);
      await handleLoadLeagues();
    } catch (err) {
      setLeagueError(err.message || "Failed to join league.");
    }
  };

  const copyLeagueCode = async (league) => {
    const code = String(league?.joinCode || "").trim();
    if (!code) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.setAttribute("readonly", "");
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedLeagueCodeId(league.id);
      setLeagueError("");
      setLeagueSuccess(`Copied code ${code}.`);
      window.setTimeout(() => {
        setCopiedLeagueCodeId((currentId) => (currentId === league.id ? "" : currentId));
      }, 1800);
    } catch (err) {
      setLeagueSuccess("");
      setLeagueError("Could not copy the code. Press and hold the code to copy it.");
    }
  };

    function playerAlreadyUsedTriple(allPredictionsForPlayer, fixturesForMode) {
    const fixtureIdsForMode = new Set(
      (fixturesForMode || []).map((fixture) => String(fixture.id))
    );
    return Object.entries(allPredictionsForPlayer || {}).some(
      ([fixtureId, p]) => fixtureIdsForMode.has(String(fixtureId)) && p && p.isTriple
    );
  }

  // ---------- PREDICTIONS ----------
  const updatePrediction = (playerKey, fixtureId, newFields) => {
    console.log("updatePrediction called", { playerKey, fixtureId, newFields });
    if (!playerKey || fixtureId == null) return;

    const fixtureIdNum = Number(fixtureId);
    const changesToPersist = [];

    setPredictions((prev) => {
      const prevPlayerPreds = prev[playerKey] || {};
      const fixturesForMode = activeFixtures;
      const findModeFixture = (id) =>
        fixturesForMode.find((f) => Number(f.id) === Number(id)) || null;
      const prevFixturePred =
        prevPlayerPreds[fixtureIdNum] || {
          homeGoals: "",
          awayGoals: "",
          isDouble: false,
          isTriple: false,
        };

      // ----- LOCKED CAPTAIN RULE -----
      // If trying to set a new captain (isDouble = true),
      // and a different locked fixture in this GW is already captain,
      // block the change.
      if ("isDouble" in newFields && !!newFields.isDouble) {
        const metaFixture = findModeFixture(fixtureIdNum);

        if (metaFixture) {
          const gw = metaFixture.gameweek;

          const lockedCaptainElsewhere = Object.entries(prevPlayerPreds).some(
            ([id, pred]) => {
              if (!pred || !pred.isDouble) return false;

              const idNum = Number(id);
              if (idNum === fixtureIdNum) return false; // ignore this fixture

              const f = findModeFixture(idNum);
              if (!f || f.gameweek !== gw) return false;

              return isPredictionLocked(f);
            }
          );

          if (lockedCaptainElsewhere && !prevFixturePred.isDouble) {
            console.log(
              "Captain change blocked: already used on locked fixture in this gameweek"
            );
            return prev;
          }
        }
      }

      // 1) Apply the raw field changes to this fixture
      let updatedPlayerPreds = {
        ...prevPlayerPreds,
        [fixtureIdNum]: {
          ...prevFixturePred,
          ...newFields,
        },
      };

      // Auto-set opposing score to 0 if it's blank
      const currentPred = updatedPlayerPreds[fixtureIdNum];
      if ('homeGoals' in newFields && newFields.homeGoals !== '' && !currentPred.awayGoals) {
        updatedPlayerPreds[fixtureIdNum].awayGoals = '0';
      }
      if ('awayGoals' in newFields && newFields.awayGoals !== '' && !currentPred.homeGoals) {
        updatedPlayerPreds[fixtureIdNum].homeGoals = '0';
      }

      // ----- TRIPLE LOGIC: once per season -----
      if ("isTriple" in newFields) {
        const wantTriple = !!newFields.isTriple;

        if (wantTriple) {
          const hasUsedTripleBefore = playerAlreadyUsedTriple(
            prevPlayerPreds,
            fixturesForMode
          );
          const hasTripleElsewhere = Object.entries(prevPlayerPreds).some(
            ([id, pred]) =>
              pred.isTriple &&
              Number(id) !== fixtureIdNum &&
              !!findModeFixture(id)
          );

          // If player already used triple ANYWHERE historically and this fixture
          // wasn't already triple, block selecting a new one
          if (hasUsedTripleBefore && !prevFixturePred.isTriple) {
            return prev;
          }

          // If triple already used elsewhere in current state, block this change
          if (hasTripleElsewhere) {
            return prev;
          }

          const tripleFixture = findModeFixture(fixtureIdNum);
          if (tripleFixture) {
            updatedPlayerPreds = Object.fromEntries(
              Object.entries(updatedPlayerPreds).map(([id, pred]) => {
                const f = findModeFixture(id);
                const sameGW = f && f.gameweek === tripleFixture.gameweek;
                const isThis = Number(id) === fixtureIdNum;

                return [
                  id,
                  {
                    ...pred,
                    isTriple: isThis, // only this fixture can be triple
                    // Can't also be captain in same GW as triple
                    isDouble: sameGW ? false : pred.isDouble,
                  },
                ];
              })
            );
          }
        } else {
          // Unticking triple on this fixture (allowed before lock)
          updatedPlayerPreds = {
            ...updatedPlayerPreds,
            [fixtureIdNum]: {
              ...(updatedPlayerPreds[fixtureIdNum] || {}),
              isTriple: false,
            },
          };
        }
      }

          // ----- DOUBLE LOGIC: one per gameweek, never with triple -----
    if ("isDouble" in newFields) {
      const wantDouble = !!newFields.isDouble;
      const doubleFixture = findModeFixture(fixtureIdNum);

      if (doubleFixture) {
        const gw = doubleFixture.gameweek;

        if (wantDouble) {
          // If there is already a locked captain in this gameweek
          // on a different fixture, block moving/adding captain.
          // Players can change captain until their chosen captain's fixture locks.

          const lockedCaptainElsewhere = Object.entries(prevPlayerPreds).some(
            ([id, pred]) => {
              if (!pred || !pred.isDouble) return false;

              const f = findModeFixture(id);
              if (!f || f.gameweek !== gw) return false;

              const isThis = Number(id) === fixtureIdNum;
              const locked = isPredictionLocked(f);

              // "Elsewhere" = same GW, locked, and not this fixture
              return locked && !isThis;
            }
          );

          if (!prevFixturePred.isDouble && lockedCaptainElsewhere) {
            console.log(
              "Captain change blocked: already used on locked fixture in this gameweek"
            );
            return prev;
          }

          // Set this as the only captain in that gameweek
          updatedPlayerPreds = setOnlyCaptainForFixtureRound(
            updatedPlayerPreds,
            fixtureIdNum,
            fixturesForMode
          );
        } else {
          // Unticking captain on this fixture only
          updatedPlayerPreds = {
            ...updatedPlayerPreds,
            [fixtureIdNum]: {
              ...(updatedPlayerPreds[fixtureIdNum] || {}),
              isDouble: false,
            },
          };
        }
      }
    }

      // 2) Work out which fixtures actually changed for this player
      Object.entries(updatedPlayerPreds).forEach(([id, pred]) => {
        const before =
          prevPlayerPreds[id] || {
            homeGoals: "",
            awayGoals: "",
            isDouble: false,
            isTriple: false,
          };

        if (Number(id) === fixtureIdNum) {
          console.log("DIFF CHECK", {
            id,
            before,
            after: pred,
          });
        }

        const changed =
          String(before.homeGoals ?? "") !== String(pred.homeGoals ?? "") ||
          String(before.awayGoals ?? "") !== String(pred.awayGoals ?? "") ||
          !!before.isDouble !== !!pred.isDouble ||
          !!before.isTriple !== !!pred.isTriple;

        if (changed) {
          changesToPersist.push({
            fixtureId: Number(id),
            prediction: { ...pred },
          });
        }
      });

      console.log("PERSIST INNER", {
        DEV_USE_LOCAL,
        authToken,
        changesToPersistLength: Array.isArray(changesToPersist)
          ? changesToPersist.length
          : "not array",
      });

      if (
        !DEV_USE_LOCAL &&
        authToken &&
        Array.isArray(changesToPersist) &&
        changesToPersist.length > 0
      ) {
        const toSave = [...changesToPersist];

        setTimeout(() => {
          try {
            // Save the current fixture last (helps captain ordering later)
            toSave.sort((a, b) => {
              if (a.fixtureId === fixtureIdNum && b.fixtureId !== fixtureIdNum) return 1;
              if (b.fixtureId === fixtureIdNum && a.fixtureId !== fixtureIdNum) return -1;
              return 0;
            });

            toSave.forEach(({ fixtureId: id, prediction }) => {
              apiSavePrediction(authToken, id, prediction).catch((err) => {
                console.error("apiSavePrediction error", { fixtureId: id, err });
              });
            });
          } catch (err) {
            console.error("PERSIST INNER error", err);
          }
        }, 0);
      }

      return {
        ...prev,
        [playerKey]: updatedPlayerPreds,
      };
    });
  };

  const updateOdds = (fixtureId, newFields) => {
    setOdds((prev) => ({
      ...prev,
      [fixtureId]: {
        ...(prev[fixtureId] || { home: "", draw: "", away: "" }),
        ...newFields,
      },
    }));
  };

  // ---------- DERIVED ----------
  // ...existing code...

const dedupedGlobalUsers = useMemo(() => {
  if (!globalUsers || globalUsers.length === 0) return [];
  const byName = {};
  globalUsers.forEach((u) => {
    const name = u.username || "";
    if (!name) return;
    const preds = globalPredictionsByUserId?.[u.userId] || {};
    const count = Object.keys(preds || {}).length;
    const existing = byName[name];
    if (!existing || count > existing.count) {
      byName[name] = { userId: u.userId, username: name, count };
    }
  });
  return Object.values(byName).map(({ userId, username }) => ({ userId, username }));
}, [globalUsers, globalPredictionsByUserId]);

const hasSelectedLeagueHistory =
  isWorldCupMode &&
  !!selectedMiniLeague?.id &&
  String(computedTotalsLeagueId || "") === String(selectedMiniLeague.id);
const worldCupHistoryUsers = useMemo(() => {
  if (!isWorldCupMode) return [];
  if (selectedMiniLeague?.id) {
    return hasSelectedLeagueHistory ? leagueHistoryUsers : [];
  }
  return dedupedGlobalUsers;
}, [
  isWorldCupMode,
  selectedMiniLeague,
  hasSelectedLeagueHistory,
  leagueHistoryUsers,
  dedupedGlobalUsers,
]);
const worldCupHistoryPredictionsByUserId =
  isWorldCupMode && selectedMiniLeague?.id
    ? leaguePredictionsByUserId
    : globalPredictionsByUserId;

const leaderboard = useMemo(() => {
  const LEGACY_MAP = {
    Tom: "1763801801299",
    Ian: "1763801801288",
    Dave: "1763801999658",
    Anthony: "1763802020494",
    Steve: "1763812904100",
    Emma: "1763813732635",
    Phil: "1763874000000",
  };

  // Use backend-computed totals if available
    if (computedLeagueTotals) {
    // Collapse any legacy-userId keys into their legacy name

    const idToLegacyName = (id) => {
      const found = Object.entries(LEGACY_MAP).find(([, v]) => v === id);
      return found ? found[0] : null;
    };

    const collapsed = {};
    Object.entries(computedLeagueTotals).forEach(([key, points]) => {
      const legacyName = idToLegacyName(key);
      const modernUsername = leagueUsernamesByUserId[String(key)];
      const displayName = legacyName || modernUsername || (looksLikeUserId(key) ? "Unknown player" : key);
      const collapsedKey = !legacyName && !modernUsername && looksLikeUserId(key)
        ? `unknown:${key}`
        : displayName;
      const resolvedUserId = legacyName
        ? key
        : looksLikeUserId(key)
        ? key
        : LEGACY_MAP[displayName] || (PLAYERS.includes(displayName) ? null : key);
      if (!collapsed[collapsedKey]) {
        collapsed[collapsedKey] = {
          player: displayName,
          points: 0,
          userId: resolvedUserId || null,
        };
      }
      collapsed[collapsedKey].points += points || 0;
      if (!collapsed[collapsedKey].userId && resolvedUserId) {
        collapsed[collapsedKey].userId = resolvedUserId;
      }
    });

    return Object.values(collapsed)
      .map((meta) => ({
        player: meta.player,
        points: meta.points || 0,
        userId: meta.userId || LEGACY_MAP[meta.player] || null,
      }))
      .sort((a, b) => b.points - a.points);
  }

  // fallback (old local logic)
  const totals = {};
  const scorePlayers = isWorldCupMode
    ? dedupedGlobalUsers.map((u) => u.username)
    : PLAYERS;
  scorePlayers.forEach((p) => {
    totals[p] = isWorldCupMode
      ? 0
      : (SPREADSHEET_WEEKLY_TOTALS[p]?.reduce((a, b) => a + b, 0) || 0);
  });

  activeFixtures.forEach((fixture) => {
    const res = results[fixture.id];
    if (!hasValidResultScore(res)) return;
    scorePlayers.forEach((p) => {
      totals[p] += getTotalPoints(predictions[p]?.[fixture.id], res);
    });
  });

  return Object.entries(totals)
    .map(([player, points]) => ({
      player,
      points,
      userId: LEGACY_MAP[player] || null,
    }))
    .sort((a, b) => b.points - a.points);
}, [computedLeagueTotals, leagueUsernamesByUserId, predictions, results, activeFixtures, isWorldCupMode, dedupedGlobalUsers]);

const hasMiniLeague = Array.isArray(myLeagues) && myLeagues.length > 0;
const showMiniLeagueEmptyState =
  activeView === "league" &&
  !DEV_USE_LOCAL &&
  isLoggedIn &&
  !hasMiniLeague;

const currentGwPoints = useMemo(() => {
  if (!selectedGameweek) return 0;
  let total = 0;
  activeFixtures.forEach((fixture) => {
    if (fixture.gameweek !== selectedGameweek) return;
    const res = results[fixture.id];
    if (!hasValidResultScore(res)) return;
    const pred = predictions[currentPredictionKey]?.[fixture.id];
    if (!pred) return;
    total += getTotalPoints(pred, res);
  });
  return total;
}, [selectedGameweek, results, predictions, currentPredictionKey, activeFixtures]);

const currentGwTopScore = useMemo(() => {
  const gw = selectedGameweek;
  if (!gw) return 0;
  if (computedWeeklyTotals && computedWeeklyTotals[gw]) {
    const vals = Object.values(computedWeeklyTotals[gw]).map((v) => Number(v) || 0);
    return vals.length ? Math.max(...vals) : 0;
  }
  return currentGwPoints;
}, [selectedGameweek, computedWeeklyTotals, currentGwPoints]);

const globalWeeklyScores = useMemo(() => {
  const gw = selectedGameweek;
  if (!gw || !dedupedGlobalUsers || dedupedGlobalUsers.length === 0) return {};
  const scores = {};
  dedupedGlobalUsers.forEach((u) => {
    const base = isWorldCupMode ? 0 : (SPREADSHEET_WEEKLY_TOTALS[u.username]?.[gw - 1] || 0);
    scores[u.userId] = base;
  });
  if (!isWorldCupMode) {
    return scores;
  }
  activeFixtures.forEach((fixture) => {
    if (fixture.gameweek !== gw) return;
    const res = results[fixture.id];
    if (!hasValidResultScore(res)) return;
    dedupedGlobalUsers.forEach((u) => {
      const preds = globalPredictionsByUserId[u.userId] || {};
      const pred =
        preds[String(fixture.id)] !== undefined
          ? preds[String(fixture.id)]
          : preds[fixture.id];
      if (!pred) return;
      scores[u.userId] += getTotalPoints(pred, res);
    });
  });
  return scores;
}, [selectedGameweek, dedupedGlobalUsers, globalPredictionsByUserId, results, activeFixtures, isWorldCupMode]);

const globalLeaderboard = useMemo(() => {
  if (!dedupedGlobalUsers || dedupedGlobalUsers.length === 0) return [];

  const totalsByUserId = {};

  dedupedGlobalUsers.forEach((u) => {
    const base = isWorldCupMode
      ? 0
      : (SPREADSHEET_WEEKLY_TOTALS[u.username]?.reduce((a, b) => a + b, 0) || 0);
    totalsByUserId[u.userId] = {
      userId: u.userId,
      player: u.username,
      points: base,
    };
  });

  if (!isWorldCupMode) {
    return Object.values(totalsByUserId).sort((a, b) => b.points - a.points);
  }

  activeFixtures.forEach((fixture) => {
    const res = results[fixture.id];
    if (!hasValidResultScore(res)) return;

    dedupedGlobalUsers.forEach((u) => {
      const preds = globalPredictionsByUserId[u.userId] || {};
      const pred =
        preds[String(fixture.id)] !== undefined
          ? preds[String(fixture.id)]
          : preds[fixture.id];
      if (!pred) return;
      totalsByUserId[u.userId].points += getTotalPoints(pred, res);
    });
  });

  return Object.values(totalsByUserId).sort((a, b) => b.points - a.points);
}, [dedupedGlobalUsers, globalPredictionsByUserId, results, activeFixtures, isWorldCupMode]);

const predictionIqReport = useMemo(() => {
  const emptyReport = {
    rating: 0,
    exactScores: 0,
    correctResults: 0,
    currentWinningStreak: 0,
    longestWinningStreak: 0,
    closeMisses: 0,
    rankChange: 0,
    strongestTeam: "Not enough data",
    weakestTeam: "Not enough data",
    drawAccuracy: "No draws yet",
    resultAccuracyBreakdown: "No results yet",
    biasDetector: "Not enough data",
    bestPrediction: "Not enough data",
    captainAccuracy: "No captains yet",
    captainPoints: "0 points",
    mostCaptainedTeam: "Not enough data",
    biggestCaptainMiss: "Not enough data",
    missedOpportunity: "Not enough data",
    suggestion: "Make a few more predictions to unlock a sharper suggestion.",
    completedPredictions: 0,
    gameweek: selectedGameweek,
  };

  if (isWorldCupMode || !selectedGameweek) return emptyReport;

  const currentPredictions = predictions[currentPredictionKey] || {};
  const completedFixtures = activeFixtures.filter(
    (fixture) => fixture.gameweek === selectedGameweek && hasValidResultScore(results[fixture.id])
  );
  if (!completedFixtures.length) return emptyReport;

  const getPred = (fixtureId) =>
    currentPredictions[String(fixtureId)] !== undefined
      ? currentPredictions[String(fixtureId)]
      : currentPredictions[fixtureId];
  const hasPredictionScore = (pred) => {
    if (!pred) return false;
    const home = Number(pred.homeGoals);
    const away = Number(pred.awayGoals);
    return Number.isFinite(home) && Number.isFinite(away);
  };

  let exactScores = 0;
  let correctResults = 0;
  let closeMisses = 0;
  let possiblePredictions = 0;
  let totalPoints = 0;
  let actualDraws = 0;
  let correctDraws = 0;
  const actualSideStats = {
    H: { total: 0, correct: 0 },
    D: { total: 0, correct: 0 },
    A: { total: 0, correct: 0 },
  };
  const predictedSideCounts = { H: 0, D: 0, A: 0 };
  let awayGoalUnderestimates = 0;
  let awayResultUnderestimates = 0;
  let missedOpportunity = null;
  let bestPrediction = null;
  const teamStats = {};

  completedFixtures.forEach((fixture) => {
    const pred = getPred(fixture.id);
    if (!hasPredictionScore(pred)) return;

    possiblePredictions += 1;
    const result = results[fixture.id];
    const predHome = Number(pred.homeGoals);
    const predAway = Number(pred.awayGoals);
    const realHome = Number(result.homeGoals);
    const realAway = Number(result.awayGoals);
    const basePoints = getBasePoints(predHome, predAway, realHome, realAway);
    const points = getTotalPoints(pred, result);
    totalPoints += points;

    const predictedResult = getResult(predHome, predAway);
    const actualResult = getResult(realHome, realAway);
    const isCorrectResult = predictedResult === actualResult;

    predictedSideCounts[predictedResult] = (predictedSideCounts[predictedResult] || 0) + 1;
    actualSideStats[actualResult].total += 1;
    if (isCorrectResult) actualSideStats[actualResult].correct += 1;

    if (predHome === realHome && predAway === realAway) exactScores += 1;
    else if (Math.abs(predHome - realHome) + Math.abs(predAway - realAway) === 1) closeMisses += 1;
    if (isCorrectResult) {
      correctResults += 1;
    }
    if (actualResult === "D") {
      actualDraws += 1;
      if (predictedResult === "D") correctDraws += 1;
    }
    if (predAway < realAway) awayGoalUnderestimates += 1;
    if (predictedResult !== "A" && actualResult === "A") {
      awayResultUnderestimates += 1;
    }

    [fixture.homeTeam, fixture.awayTeam].forEach((team) => {
      if (!teamStats[team]) teamStats[team] = { points: 0, played: 0 };
      teamStats[team].points += points;
      teamStats[team].played += 1;
    });

    const multiplier = pred.isTriple ? 3 : pred.isDouble ? 2 : 1;
    const missedScore = (7 * multiplier) - points;
    if (points > 0 && (!bestPrediction || points > bestPrediction.points)) {
      bestPrediction = {
        label: `${fixture.homeTeam} ${predHome}-${predAway} ${fixture.awayTeam} (${points} pts)`,
        points,
      };
    }
    if (points === 0 && (!missedOpportunity || missedScore > missedOpportunity.missedScore)) {
      missedOpportunity = {
        label: `${fixture.homeTeam} ${realHome}-${realAway} ${fixture.awayTeam}, predicted ${predHome}-${predAway}`,
        missedScore,
      };
    }
  });

  const teamRows = Object.entries(teamStats)
    .filter(([, stat]) => stat.played > 0)
    .map(([team, stat]) => ({
      team,
      average: stat.points / stat.played,
      played: stat.played,
    }))
    .sort((a, b) => b.average - a.average || b.played - a.played);

  const gwTotals = computedWeeklyTotals?.[selectedGameweek] || {};
  const getUserScoreFromTotals = (totals = {}, gw = selectedGameweek) => {
    const candidates = [currentPredictionKey, currentUserId, currentPlayer].filter(Boolean);
    for (const key of candidates) {
      if (totals[key] !== undefined) return Number(totals[key]) || 0;
    }
    return gw === selectedGameweek ? currentGwPoints : 0;
  };
  const completedGameweeks = activeGameweeks
    .filter((gw) => gw <= selectedGameweek)
    .filter((gw) => {
      const fixtures = activeFixtures.filter((fixture) => fixture.gameweek === gw);
      return fixtures.length > 0 && fixtures.every((fixture) => isFixtureCompleted(fixture, results));
    });
  const rankOf = (entries, key, fallbackScore = 0) => {
    const sorted = [...entries];
    if (!sorted.some(([entryKey]) => String(entryKey) === String(key))) {
      sorted.push([key, fallbackScore]);
    }
    sorted.sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
    const index = sorted.findIndex(([entryKey]) => String(entryKey) === String(key));
    return index === -1 ? 0 : index + 1;
  };
  const globalUsersForRank = (dedupedGlobalUsers || []).length
    ? dedupedGlobalUsers
    : (globalLeaderboard || []).map((row) => ({
        userId: row.userId || row.player,
        username: row.player,
      }));
  const scoreGlobalUserToGameweek = (user, maxGameweek) => {
    const userId = String(user?.userId || "");
    const username = user?.username || user?.player || "";
    const preds =
      String(userId) === String(currentUserId || "") || username === currentPlayer
        ? currentPredictions
        : (globalPredictionsByUserId[userId] || predictions[userId] || predictions[username] || {});
    let score = 0;
    activeFixtures.forEach((fixture) => {
      if (fixture.gameweek > maxGameweek) return;
      const res = results[fixture.id];
      if (!hasValidResultScore(res)) return;
      const pred =
        preds[String(fixture.id)] !== undefined
          ? preds[String(fixture.id)]
          : preds[fixture.id];
      if (!hasPredictionScore(pred)) return;
      score += getTotalPoints(pred, res);
    });
    return score;
  };
  const globalCurrentEntries = globalUsersForRank
    .map((user) => [user.userId || user.username, scoreGlobalUserToGameweek(user, selectedGameweek)])
    .filter(([, score]) => Number(score) > 0);
  const globalPreviousEntries = globalUsersForRank
    .map((user) => [user.userId || user.username, scoreGlobalUserToGameweek(user, selectedGameweek - 1)])
    .filter(([, score]) => Number(score) > 0);
  const globalUser = globalUsersForRank.find(
    (user) =>
      String(user?.userId || "") === String(currentUserId || "") ||
      String(user?.username || user?.player || "") === String(currentPlayer || "")
  );
  const globalUserKey = globalUser?.userId || currentUserId || currentPlayer;
  const globalCurrentScore = globalUser
    ? scoreGlobalUserToGameweek(globalUser, selectedGameweek)
    : currentGwPoints;
  const globalPreviousScore = globalUser
    ? scoreGlobalUserToGameweek(globalUser, selectedGameweek - 1)
    : 0;
  const previousRank = globalUserKey
    ? rankOf(globalPreviousEntries, globalUserKey, globalPreviousScore)
    : 0;
  const currentRank = globalUserKey
    ? rankOf(globalCurrentEntries, globalUserKey, globalCurrentScore)
    : 0;
  const rankChange = previousRank && currentRank ? previousRank - currentRank : 0;

  let captainSelections = 0;
  let correctCaptains = 0;
  let captainPointsTotal = 0;
  let biggestCaptainMiss = null;
  const captainedTeamCounts = {};
  const failedCaptainedTeamCounts = {};
  completedGameweeks.forEach((gw) => {
    const captainFixture = activeFixtures.find((fixture) => {
      if (fixture.gameweek !== gw) return false;
      const pred = getPred(fixture.id);
      return hasPredictionScore(pred) && !!pred.isDouble && hasValidResultScore(results[fixture.id]);
    });
    if (!captainFixture) return;
    const pred = getPred(captainFixture.id);
    const result = results[captainFixture.id];
    const predHome = Number(pred.homeGoals);
    const predAway = Number(pred.awayGoals);
    const realHome = Number(result.homeGoals);
    const realAway = Number(result.awayGoals);
    const predictedResult = getResult(predHome, predAway);
    const actualResult = getResult(realHome, realAway);
    const basePoints = getBasePoints(predHome, predAway, realHome, realAway);
    const captainPoints = getTotalPoints(pred, result);
    const backedTeam =
      predictedResult === "H"
        ? captainFixture.homeTeam
        : predictedResult === "A"
        ? captainFixture.awayTeam
        : "Draw";

    captainSelections += 1;
    captainPointsTotal += captainPoints;
    captainedTeamCounts[backedTeam] = (captainedTeamCounts[backedTeam] || 0) + 1;
    if (predictedResult === actualResult) correctCaptains += 1;
    if (basePoints === 0) {
      failedCaptainedTeamCounts[backedTeam] = (failedCaptainedTeamCounts[backedTeam] || 0) + 1;
    }

    const missedCaptainPoints = 14 - captainPoints;
    if (
      basePoints === 0 &&
      (!biggestCaptainMiss || missedCaptainPoints > biggestCaptainMiss.missedCaptainPoints)
    ) {
      biggestCaptainMiss = {
        label: `${captainFixture.homeTeam} ${realHome}-${realAway} ${captainFixture.awayTeam}, predicted ${predHome}-${predAway}`,
        missedCaptainPoints,
      };
    }
  });
  const mostCaptainedTeam = Object.entries(captainedTeamCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const biggestLosingTeam = Object.entries(failedCaptainedTeamCounts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0];
  const weeklyWinnerFlags = completedGameweeks.map((gw) => {
    const totals = computedWeeklyTotals?.[gw] || {};
    const scores = Object.values(totals).map((score) => Number(score) || 0);
    const topScore = scores.length ? Math.max(...scores) : 0;
    const userScore = getUserScoreFromTotals(totals, gw);
    return topScore > 0 && userScore === topScore;
  });
  let currentWinningStreak = 0;
  for (let i = weeklyWinnerFlags.length - 1; i >= 0; i -= 1) {
    if (!weeklyWinnerFlags[i]) break;
    currentWinningStreak += 1;
  }
  let longestWinningStreak = 0;
  let streakRun = 0;
  weeklyWinnerFlags.forEach((wonWeek) => {
    if (wonWeek) {
      streakRun += 1;
      longestWinningStreak = Math.max(longestWinningStreak, streakRun);
    } else {
      streakRun = 0;
    }
  });

  const accuracy = possiblePredictions ? correctResults / possiblePredictions : 0;
  const exactBonus = possiblePredictions ? exactScores / possiblePredictions : 0;
  const averagePoints = possiblePredictions ? totalPoints / possiblePredictions : 0;
  const rating = Math.max(
    0,
    Math.min(100, Math.round(accuracy * 58 + exactBonus * 27 + Math.min(15, averagePoints * 2)))
  );

  let suggestion = "Your result reads are balanced this week. Keep watching team news and fixture context.";
  let biasDetector = "Balanced prediction mix";
  if (possiblePredictions >= 3) {
    const homeShare = predictedSideCounts.H / possiblePredictions;
    const drawShare = predictedSideCounts.D / possiblePredictions;
    const awayShare = predictedSideCounts.A / possiblePredictions;
    if (homeShare >= 0.6) {
      biasDetector = "You lean heavily towards home wins.";
    } else if (awayShare >= 0.5) {
      biasDetector = "You are unusually willing to back away teams.";
    } else if (drawShare <= 0.1 && actualDraws > 0) {
      biasDetector = "You are avoiding draws.";
    } else if (awayGoalUnderestimates >= Math.ceil(possiblePredictions / 2)) {
      biasDetector = "You tend to underrate away goals.";
    }
  }
  const resultAccuracyBreakdown = ["H", "D", "A"]
    .map((side) => {
      const label = side === "H" ? "Home" : side === "D" ? "Draw" : "Away";
      const stat = actualSideStats[side];
      return `${label} ${stat.correct}/${stat.total}`;
    })
    .join(" • ");

  if (awayResultUnderestimates >= 2 || awayGoalUnderestimates >= Math.ceil(possiblePredictions / 2)) {
    suggestion = "You consistently underestimate away teams.";
  } else if (exactScores === 0 && correctResults > 0) {
    suggestion = "Your outcomes are working; tighten the scorelines by one goal either way.";
  } else if (correctResults < Math.max(1, Math.floor(possiblePredictions / 3))) {
    suggestion = "Lean less on favourites this week and give draws more room in tight fixtures.";
  }

  return {
    rating,
    exactScores,
    correctResults,
    currentWinningStreak,
    longestWinningStreak,
    closeMisses,
    rankChange,
    strongestTeam: teamRows[0]?.team || "Not enough data",
    weakestTeam: teamRows[teamRows.length - 1]?.team || "Not enough data",
    drawAccuracy: actualDraws ? `${correctDraws}/${actualDraws} draws` : "No draws yet",
    resultAccuracyBreakdown,
    biasDetector,
    bestPrediction: bestPrediction?.label || "No scoring prediction yet",
    captainAccuracy: captainSelections
      ? `${correctCaptains}/${captainSelections} selections`
      : "No captains yet",
    captainPoints: captainSelections
      ? `${captainPointsTotal}/${captainSelections * 14} points`
      : "0/0 points",
    mostCaptainedTeam: mostCaptainedTeam
      ? `${mostCaptainedTeam[0]} (${mostCaptainedTeam[1]})`
      : "Not enough data",
    biggestCaptainMiss: biggestLosingTeam
      ? `${biggestLosingTeam[0]} - (${biggestLosingTeam[1]})`
      : biggestCaptainMiss?.label || "No major miss",
    missedOpportunity: missedOpportunity?.label || "No major miss",
    suggestion,
    completedPredictions: possiblePredictions,
    gameweek: selectedGameweek,
  };
}, [
  activeFixtures,
  activeGameweeks,
  computedWeeklyTotals,
  currentGwPoints,
  currentPredictionKey,
  currentPlayer,
  currentUserId,
  dedupedGlobalUsers,
  gameMode,
  globalLeaderboard,
  globalPredictionsByUserId,
  isWorldCupMode,
  predictions,
  results,
  selectedGameweek,
]);

const predictionIqDemoReport = useMemo(
  () => ({
    rating: 84,
    exactScores: 3,
    correctResults: 7,
    currentWinningStreak: 2,
    longestWinningStreak: 3,
    closeMisses: 4,
    rankChange: 12,
    strongestTeam: "Liverpool",
    weakestTeam: "Chelsea",
    drawAccuracy: "1/2 draws",
    resultAccuracyBreakdown: "Home 4/5 • Draw 1/2 • Away 2/3",
    biasDetector: "You lean slightly towards home wins.",
    bestPrediction: "Newcastle 2-1 Spurs (7 pts)",
    captainAccuracy: "3/5 selections",
    captainPoints: "34/70 points",
    mostCaptainedTeam: "Liverpool (2)",
    biggestCaptainMiss: "Chelsea - (2)",
    missedOpportunity: "Villa 2-1 Spurs, predicted 1-3",
    suggestion: "Your captain picks are strong, but you leave points behind by underrating away goals.",
    completedPredictions: 10,
    gameweek: selectedGameweek || 5,
  }),
  [selectedGameweek]
);

const fantasyIqReport = useMemo(() => {
  const emptyReport = {
    gameweek: selectedGameweek,
    predictedGoals: 0,
    averagePredictedGoals: "0.0",
    predictedCleanSheets: 0,
    predictedDraws: 0,
    mostBacked: "NA",
    topAttackTeam: "NA",
    topDefenceTeam: "NA",
    formAttackTeam: "NA",
    formDefenceTeam: "NA",
    avoidTeam: "NA",
    dataRiskTeam: "NA",
    captainTeam: "NA",
    differentialTeam: "NA",
    fixtureSwing: "NA",
    cleanSheetTrend: "No clean-sheet streak yet",
    formFormation: "NA",
    predictionFormation: "NA",
    insightScope: fantasyInsightsScope,
    attackRows: [],
    defenceRows: [],
    formDefenceRows: [],
    predictionDefenceRows: [],
    avoidRows: [],
    fixtureRows: [],
    fixtureHardRows: [],
    formAttackRows: [],
    dataRiskRows: [],
    adviceRows: [],
    overallFixtureRows: [],
    attackFixtureRows: [],
    defenceFixtureRows: [],
    predictionSignalRows: [],
    predictionConflicts: [],
    preparedFantasyIqReport: createEmptyFantasyIqReport(),
    fantasyIqClubOutlooks: {},
    fantasyIqPredictionOutlooks: {},
    squad: fantasyIqSquad,
    squadValidation: fantasyIqSquadValidation,
    playerDataStatus: fantasyPlayerData,
    scoringConfigValid: validateFantasyIqScoreConfig(),
    completedResults: 0,
    submittedPredictions: 0,
    missingPredictions: 0,
  };

  if (isWorldCupMode || !selectedGameweek) return emptyReport;

  const currentPredictions = predictions[currentPredictionKey] || {};
  const hasPredictionScore = (pred) => {
    if (!pred) return false;
    const home = Number(pred.homeGoals);
    const away = Number(pred.awayGoals);
    return Number.isFinite(home) && Number.isFinite(away);
  };
  const getPred = (fixtureId) =>
    currentPredictions[String(fixtureId)] !== undefined
      ? currentPredictions[String(fixtureId)]
      : currentPredictions[fixtureId];

  const allTeams = Array.from(
    new Set(activeFixtures.flatMap((fixture) => [fixture.homeTeam, fixture.awayTeam]))
  );
  const teamStats = Object.fromEntries(
    allTeams.map((team) => [
      team,
      {
        team,
        predictedFor: 0,
        predictedAgainst: 0,
        predictedCleanSheets: 0,
        predictedWins: 0,
        predictedFixtures: 0,
        actualFor: 0,
        actualAgainst: 0,
        actualCleanSheets: 0,
        actualWins: 0,
        actualPlayed: 0,
        cleanSheetStreak: 0,
        nextFixtureCount: 0,
        nextDifficulty: 0,
        nextGoalPotential: 0,
        nextCleanSheetPotential: 0,
        nextHomeFixtures: 0,
        nextAwayFixtures: 0,
      },
    ])
  );

  activeFixtures.forEach((fixture) => {
    const result = results[fixture.id];
    if (!hasValidResultScore(result) || fixture.gameweek > selectedGameweek) return;

    const homeGoals = Number(result.homeGoals);
    const awayGoals = Number(result.awayGoals);
    const home = teamStats[fixture.homeTeam];
    const away = teamStats[fixture.awayTeam];
    if (!home || !away) return;

    home.actualPlayed += 1;
    away.actualPlayed += 1;
    home.actualFor += homeGoals;
    home.actualAgainst += awayGoals;
    away.actualFor += awayGoals;
    away.actualAgainst += homeGoals;
    if (awayGoals === 0) home.actualCleanSheets += 1;
    if (homeGoals === 0) away.actualCleanSheets += 1;
    if (homeGoals > awayGoals) home.actualWins += 1;
    if (awayGoals > homeGoals) away.actualWins += 1;
  });

  allTeams.forEach((team) => {
    const completed = activeFixtures
      .filter(
        (fixture) =>
          fixture.gameweek <= selectedGameweek &&
          (fixture.homeTeam === team || fixture.awayTeam === team) &&
          hasValidResultScore(results[fixture.id])
      )
      .sort((a, b) => b.gameweek - a.gameweek || String(b.kickoff).localeCompare(String(a.kickoff)));

    let streak = 0;
    for (const fixture of completed) {
      const result = results[fixture.id];
      const conceded =
        fixture.homeTeam === team ? Number(result.awayGoals) : Number(result.homeGoals);
      if (conceded !== 0) break;
      streak += 1;
    }
    teamStats[team].cleanSheetStreak = streak;
  });

  const selectedFixtures = activeFixtures.filter((fixture) => fixture.gameweek === selectedGameweek);
  let predictedGoals = 0;
  let predictedDraws = 0;
  let submittedPredictions = 0;
  selectedFixtures.forEach((fixture) => {
    const pred = getPred(fixture.id);
    if (!hasPredictionScore(pred)) return;

    submittedPredictions += 1;
    const homeGoals = Number(pred.homeGoals);
    const awayGoals = Number(pred.awayGoals);
    const home = teamStats[fixture.homeTeam];
    const away = teamStats[fixture.awayTeam];
    if (!home || !away) return;

    predictedGoals += homeGoals + awayGoals;
    if (homeGoals === awayGoals) predictedDraws += 1;
    home.predictedFixtures += 1;
    away.predictedFixtures += 1;
    home.predictedFor += homeGoals;
    home.predictedAgainst += awayGoals;
    away.predictedFor += awayGoals;
    away.predictedAgainst += homeGoals;
    if (awayGoals === 0) home.predictedCleanSheets += 1;
    if (homeGoals === 0) away.predictedCleanSheets += 1;
    if (homeGoals > awayGoals) home.predictedWins += 1;
    if (awayGoals > homeGoals) away.predictedWins += 1;
  });
  const predictedCleanSheetsTotal = Object.values(teamStats).reduce(
    (sum, row) => sum + row.predictedCleanSheets,
    0
  );
  const insightFixtures =
    fantasyInsightsScope === "season"
      ? activeFixtures.filter((fixture) => fixture.gameweek <= selectedGameweek)
      : selectedFixtures;
  let insightPredictedGoals = 0;
  let insightPredictedDraws = 0;
  let insightSubmittedPredictions = 0;
  let insightPredictedCleanSheets = 0;
  insightFixtures.forEach((fixture) => {
    const pred = getPred(fixture.id);
    if (!hasPredictionScore(pred)) return;
    const homeGoals = Number(pred.homeGoals);
    const awayGoals = Number(pred.awayGoals);
    insightSubmittedPredictions += 1;
    insightPredictedGoals += homeGoals + awayGoals;
    if (homeGoals === awayGoals) insightPredictedDraws += 1;
    if (awayGoals === 0) insightPredictedCleanSheets += 1;
    if (homeGoals === 0) insightPredictedCleanSheets += 1;
  });
  const averagePredictedGoals = insightSubmittedPredictions
    ? (insightPredictedGoals / insightSubmittedPredictions).toFixed(1)
    : "0.0";
  const backedStakeByTeam = {};
  Object.values(coinsState?.bets || {}).forEach((bet) => {
    const stake = Number(bet?.stake || 0);
    if (!stake) return;
    const fixture = activeFixtures.find((f) => String(f.id) === String(bet.fixtureId));
    if (!fixture) return;
    const isIncluded =
      fantasyInsightsScope === "season"
        ? fixture.gameweek <= selectedGameweek
        : fixture.gameweek === selectedGameweek;
    if (!isIncluded) return;
    const target =
      bet.side === "H"
        ? fixture.homeTeam
        : bet.side === "A"
        ? fixture.awayTeam
        : bet.side === "D"
        ? "Draw"
        : "";
    if (!target) return;
    backedStakeByTeam[target] = (backedStakeByTeam[target] || 0) + stake;
  });
  const mostBackedEntry = Object.entries(backedStakeByTeam).sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  )[0];

  const windowGameweeks = activeGameweeks.filter(
    (gw) => gw >= selectedGameweek && gw < selectedGameweek + 3
  );
  const windowFixtures = activeFixtures.filter((fixture) =>
    windowGameweeks.includes(fixture.gameweek)
  );
  windowFixtures.forEach((fixture) => {
    const home = teamStats[fixture.homeTeam];
    const away = teamStats[fixture.awayTeam];
    if (!home || !away) return;

    const homeAttack = home.actualPlayed ? home.actualFor / home.actualPlayed : 1.2;
    const awayAttack = away.actualPlayed ? away.actualFor / away.actualPlayed : 1.2;
    const homeDefence = home.actualPlayed ? home.actualAgainst / home.actualPlayed : 1.2;
    const awayDefence = away.actualPlayed ? away.actualAgainst / away.actualPlayed : 1.2;
    const homeExpected = Math.max(0.2, homeAttack + awayDefence + 0.25);
    const awayExpected = Math.max(0.2, awayAttack + homeDefence - 0.05);

    home.nextFixtureCount += 1;
    away.nextFixtureCount += 1;
    home.nextHomeFixtures += 1;
    away.nextAwayFixtures += 1;
    home.nextGoalPotential += homeExpected;
    away.nextGoalPotential += awayExpected;
    home.nextCleanSheetPotential += Math.max(0, 2.6 - awayExpected);
    away.nextCleanSheetPotential += Math.max(0, 2.6 - homeExpected);
    home.nextDifficulty += awayExpected + Math.max(0, awayAttack - homeDefence);
    away.nextDifficulty += homeExpected + Math.max(0, homeAttack - awayDefence);
  });

  const teamRows = Object.values(teamStats).map((stat) => {
    const fixtureCount = Math.max(1, stat.nextFixtureCount);
    const attackScore =
      stat.predictedFor * 2.4 +
      stat.predictedWins * 1.2 +
      stat.nextGoalPotential +
      (stat.actualPlayed ? (stat.actualFor / stat.actualPlayed) * 1.5 : 0);
    const defenceScore =
      stat.predictedCleanSheets * 3 +
      stat.cleanSheetStreak * 1.6 +
      stat.nextCleanSheetPotential +
      (stat.actualPlayed ? Math.max(0, 2 - stat.actualAgainst / stat.actualPlayed) : 0);
    const fixtureScore =
      stat.nextFixtureCount
        ? Math.max(0, 10 - stat.nextDifficulty / fixtureCount) + stat.nextGoalPotential / fixtureCount
        : 0;
    const avoidScore =
      stat.predictedAgainst * 2.2 +
      stat.nextDifficulty / fixtureCount +
      (stat.actualPlayed ? (stat.actualAgainst / stat.actualPlayed) * 1.4 : 0) -
      stat.predictedFor;

    return {
      ...stat,
      attackScore,
      defenceScore,
      fixtureScore,
      avoidScore,
      fixtureLabel: stat.nextFixtureCount
        ? `${stat.nextFixtureCount} fixtures (${stat.nextHomeFixtures}H/${stat.nextAwayFixtures}A), ${fixtureScore >= 9 ? "green" : fixtureScore >= 7 ? "mixed" : "hard"} run`
        : "No fixtures",
    };
  });

  const attackRows = [...teamRows]
    .filter((row) => row.predictedFixtures)
    .sort((a, b) => b.attackScore - a.attackScore)
    .slice(0, 3);
  const defenceRows = [...teamRows]
    .filter((row) => row.predictedFixtures || row.cleanSheetStreak)
    .sort((a, b) => b.defenceScore - a.defenceScore)
    .slice(0, 3);
  const predictionDefenceRows = [...teamRows]
    .filter((row) => row.predictedFixtures)
    .sort((a, b) => b.predictedCleanSheets - a.predictedCleanSheets || b.defenceScore - a.defenceScore)
    .slice(0, 3);
  const formDefenceRows = [...teamRows]
    .filter((row) => row.actualPlayed || row.cleanSheetStreak)
    .sort(
      (a, b) =>
        b.cleanSheetStreak - a.cleanSheetStreak ||
        b.actualCleanSheets - a.actualCleanSheets ||
        b.defenceScore - a.defenceScore
    )
    .slice(0, 3);
  const formAttackRows = [...teamRows]
    .filter((row) => row.actualPlayed)
    .sort(
      (a, b) =>
        (b.actualFor / Math.max(1, b.actualPlayed)) -
          (a.actualFor / Math.max(1, a.actualPlayed)) ||
        b.actualWins - a.actualWins
    )
    .slice(0, 3);
  const avoidRows = [...teamRows]
    .filter((row) => row.predictedFixtures)
    .sort((a, b) => b.avoidScore - a.avoidScore)
    .slice(0, 3);
  const fixtureDifficultyRows = allTeams
    .map((team) => {
      const insights = buildPremierTeamInsights(team, results, leaguePerformanceContext);
      const upcoming = (insights.upcoming || []).slice(0, 3);
      const outlook = buildWeightedNextFixtureOutlook(upcoming);
      const fixtureCount = outlook.fixtureCount;
      const averageDifficulty = fixtureCount ? outlook.overallDifficulty : 0;
      const hardCount = upcoming.filter((item) => Number(item.difficultyScore || 3) >= 4).length;
      const easyCount = upcoming.filter((item) => Number(item.difficultyScore || 3) <= 2).length;
      const homeCount = upcoming.filter((item) => item.venue === "H").length;
      const awayCount = upcoming.filter((item) => item.venue === "A").length;
      return {
        team,
        upcoming,
        outlook,
        fixtureScore: fixtureCount ? 6 - averageDifficulty : 0,
        averageDifficulty,
        attackDifficulty: fixtureCount ? outlook.attackDifficulty : 0,
        defenceDifficulty: fixtureCount ? outlook.defenceDifficulty : 0,
        expectedGoals: fixtureCount ? outlook.expectedGoals : 0,
        cleanSheetProbability: fixtureCount ? outlook.cleanSheetProbability : 0,
        scoreTwoPlusProbability: fixtureCount ? outlook.scoreTwoPlusProbability : 0,
        easyCount,
        hardCount,
        homeCount,
        awayCount,
        fixtureLabel: fixtureCount
          ? `${fixtureCount} fixtures (${homeCount}H/${awayCount}A)`
          : "No upcoming fixtures",
      };
    })
    .filter((row) => row.upcoming.length);
  const fixtureRows = [...fixtureDifficultyRows]
    .sort(
      (a, b) =>
        a.attackDifficulty - b.attackDifficulty ||
        b.expectedGoals - a.expectedGoals ||
        b.scoreTwoPlusProbability - a.scoreTwoPlusProbability
    )
    .slice(0, 3);
  const fixtureHardRows = [...fixtureDifficultyRows]
    .sort(
      (a, b) =>
        b.defenceDifficulty - a.defenceDifficulty ||
        a.cleanSheetProbability - b.cleanSheetProbability
    )
    .slice(0, 3);
  const overallFixtureRows = [...fixtureDifficultyRows]
    .sort((a, b) => a.averageDifficulty - b.averageDifficulty || b.easyCount - a.easyCount)
    .slice(0, 3);
  const defenceFixtureRows = [...fixtureDifficultyRows]
    .sort(
      (a, b) =>
        a.defenceDifficulty - b.defenceDifficulty ||
        b.cleanSheetProbability - a.cleanSheetProbability
    )
    .slice(0, 3);
  const dataRiskRows = fixtureHardRows;
  const bestCleanSheetRun = [...teamRows].sort(
    (a, b) => b.cleanSheetStreak - a.cleanSheetStreak || b.defenceScore - a.defenceScore
  )[0];

  const topAttackTeam = attackRows[0]?.team || emptyReport.topAttackTeam;
  const topDefenceTeam = predictionDefenceRows[0]?.team || emptyReport.topDefenceTeam;
  const formAttackTeam = formAttackRows[0]?.team || emptyReport.formAttackTeam;
  const formDefenceAdviceTeam = bestCleanSheetRun?.team || formDefenceRows[0]?.team || "";
  const formDefenceTeam =
    bestCleanSheetRun?.cleanSheetStreak >= 3
      ? `${bestCleanSheetRun.team} (${bestCleanSheetRun.cleanSheetStreak} straight)`
      : formDefenceRows[0]?.team || emptyReport.formDefenceTeam;
  const avoidTeam = avoidRows[0]?.team || emptyReport.avoidTeam;
  const dataRiskTeam = dataRiskRows[0]?.team || emptyReport.dataRiskTeam;
  const fixtureTeam = fixtureRows[0]?.team || emptyReport.fixtureSwing;
  const topAttackTeams = attackRows.slice(0, 2).map((row) => row.team);
  const topDefenceTeams = predictionDefenceRows.slice(0, 2).map((row) => row.team);
  const formAttackTeams = formAttackRows.slice(0, 2).map((row) => row.team);
  const formDefenceTeams = formDefenceRows.slice(0, 2).map((row) => row.team);
  const fixtureTeams = fixtureRows.slice(0, 2).map((row) => row.team);
  const dataRiskTeams = dataRiskRows.slice(0, 2).map((row) => row.team);
  const predictionHardTeams = [...teamRows]
    .filter((row) => row.predictedFixtures)
    .sort((a, b) => b.predictedAgainst - a.predictedAgainst || a.predictedFor - b.predictedFor)
    .slice(0, 2)
    .map((row) => row.team);
  const predictionHardTeam =
    predictionHardTeams[0] || emptyReport.avoidTeam;
  const predictionSignalRows = [
    {
      label: "Expected goals",
      value: topAttackTeams.length ? topAttackTeams.map((team) => getTeamCode(team, gameMode)).join(", ") : "No standout yet",
      detail: topAttackTeams.length ? "Teams your predictions favour for attacking interest." : "Submit predictions to surface attacking signals.",
      color: "#22C55E",
    },
    {
      label: "Clean sheets",
      value: topDefenceTeams.length ? topDefenceTeams.map((team) => getTeamCode(team, gameMode)).join(", ") : "No standout yet",
      detail: topDefenceTeams.length ? "Teams you have backed for defensive returns." : "Clean-sheet signals appear after predicted scorelines.",
      color: "#38BDF8",
    },
    {
      label: "Struggle risk",
      value: predictionHardTeams.length ? predictionHardTeams.map((team) => getTeamCode(team, gameMode)).join(", ") : "No standout yet",
      detail: predictionHardTeams.length ? "Teams your predictions treat as higher risk." : "No cautious prediction signal yet.",
      color: "#EF4444",
    },
  ];
  const predictionConflicts = selectedFixtures
    .map((fixture) => {
      const pred = getPred(fixture.id);
      if (!hasPredictionScore(pred)) return null;
      const model = buildFixtureModel(fixture, leaguePerformanceContext);
      const homeGoals = Number(pred.homeGoals);
      const awayGoals = Number(pred.awayGoals);
      const userSide = homeGoals > awayGoals ? "home" : homeGoals < awayGoals ? "away" : "draw";
      const modelSide =
        model.homeProb >= model.awayProb && model.homeProb >= model.drawProb
          ? "home"
          : model.awayProb >= model.homeProb && model.awayProb >= model.drawProb
          ? "away"
          : "draw";
      const goalGap = Math.abs((homeGoals - awayGoals) - (model.homeExpectedGoals - model.awayExpectedGoals));
      if (userSide === modelSide && goalGap < 2.25) return null;
      return {
        fixtureId: fixture.id,
        label: `${getTeamCode(fixture.homeTeam, gameMode)} ${homeGoals}-${awayGoals} ${getTeamCode(fixture.awayTeam, gameMode)}`,
        detail:
          userSide !== modelSide
            ? "Your predicted outcome differs from the model view."
            : "Your scoreline is more assertive than the model goal estimate.",
      };
    })
    .filter(Boolean)
    .slice(0, 3);
  const fantasyIqClubOutlooks = buildFantasyIqClubOutlooks(
    activeFixtures,
    results,
    leaguePerformanceContext
  );
  const officialFplFixtureOutlooks = buildOfficialFplFixtureOutlooks(
    fantasyPlayerData,
    { horizon: FANTASY_SUGGESTED_TEAM_FIXTURE_HORIZON }
  );
  const fantasySuggestedTeamClubOutlooks = mergeFantasyIqOfficialFixtureOutlooks(
    buildFantasyIqClubOutlooks(
      activeFixtures,
      results,
      leaguePerformanceContext,
      { horizon: FANTASY_SUGGESTED_TEAM_FIXTURE_HORIZON }
    ),
    officialFplFixtureOutlooks
  );
  const fantasyIqPredictionOutlooks = buildFantasyIqPredictionOutlooks(
    activeFixtures,
    currentPredictions,
    selectedGameweek
  );
  const preparedFantasyIqReport = buildFantasyIqScoredReport({
    squad: fantasyIqSquad,
    validation: fantasyIqSquadValidation,
    clubOutlooks: fantasyIqClubOutlooks,
    predictionOutlooks: fantasyIqPredictionOutlooks,
    playerDataStatus: fantasyPlayerData,
  });
  const fantasySuggestedTeam = createFantasySuggestedTeam({
    players: fantasyPlayerData.players || [],
    clubOutlooks: fantasySuggestedTeamClubOutlooks,
    predictionOutlooks: fantasyIqPredictionOutlooks,
    validateSquad: validateFantasyIqSquad,
    scoreReport: buildFantasyIqScoredReport,
    playerDataStatus: fantasyPlayerData,
    style: fantasySuggestedTeamStyle,
    fixtureHorizon: FANTASY_SUGGESTED_TEAM_FIXTURE_HORIZON,
  });
  const completedResults = teamRows.reduce((sum, row) => sum + row.actualPlayed, 0) / 2;
  const actualGoals = teamRows.reduce((sum, row) => sum + row.actualFor, 0) / 2;
  const actualCleanSheets = teamRows.reduce((sum, row) => sum + row.actualCleanSheets, 0);
  const goalsPerPrediction = submittedPredictions ? predictedGoals / submittedPredictions : 0;
  const cleanSheetsPerPrediction = submittedPredictions
    ? predictedCleanSheetsTotal / submittedPredictions
    : 0;
  const goalsPerResult = completedResults ? actualGoals / completedResults : 0;
  const cleanSheetsPerResult = completedResults ? actualCleanSheets / completedResults : 0;

  const predictionFormation =
    !submittedPredictions
      ? "NA"
      : cleanSheetsPerPrediction >= 0.55 && goalsPerPrediction < 2.6
      ? "Consider 4-4-2 or 5-3-2"
      : goalsPerPrediction >= 3.2
      ? "Consider 3-4-3 or 3-5-2"
      : predictedDraws >= Math.ceil(submittedPredictions / 3)
      ? "Consider a balanced 3-5-2"
      : "Consider a balanced 3-4-3";
  const formFormation =
    !completedResults
      ? "NA"
      : cleanSheetsPerResult >= 0.55 && goalsPerResult < 2.6
      ? "Consider a defensive 4-4-2"
      : goalsPerResult >= 3
      ? "Consider an attacking 3-4-3"
      : "Consider a balanced 3-5-2";
  const adviceRows = [
    {
      label: "Formation",
      prediction: predictionFormation,
      data: formFormation,
      color: "#F59E0B",
    },
    {
      label: "Transfer in",
      prediction: "Consider transferring in",
      data: "Consider transferring in",
      predictionTeam: topAttackTeam,
      dataTeam: formAttackTeam,
      predictionTeams: topAttackTeams,
      dataTeams: formAttackTeams,
      predictionRole: "Attackers",
      dataRole: "Attackers",
      color: "#22C55E",
    },
    {
      label: "Defence/GK",
      prediction: "Consider transferring in",
      data: "Consider transferring in",
      predictionTeam: topDefenceTeam,
      dataTeam: formDefenceAdviceTeam || formDefenceTeam,
      predictionTeams: topDefenceTeams,
      dataTeams: formDefenceTeams,
      predictionRole: "Defenders/GKs",
      dataRole: "Defenders/GKs",
      color: "#38BDF8",
    },
    {
      label: "Bench",
      prediction: "Consider benching",
      data: "Consider benching",
      predictionTeam: predictionHardTeam,
      dataTeam: dataRiskTeam,
      predictionTeams: predictionHardTeams,
      dataTeams: dataRiskTeams,
      predictionRole: "Defenders",
      dataRole: "Defenders",
      color: "#EF4444",
    },
    {
      label: "Transfer out",
      prediction: "Consider transferring out",
      data: "Consider transferring out",
      predictionTeam: predictionHardTeam,
      dataTeam: dataRiskTeam,
      predictionTeams: predictionHardTeams,
      dataTeams: dataRiskTeams,
      predictionRole: "Defenders",
      dataRole: "Defenders",
      color: "#EF4444",
    },
    {
      label: "Fixture difficulty",
      prediction: "Consider targeting",
      data: "Consider targeting",
      predictionTeam: topAttackTeam,
      dataTeam: fixtureTeam,
      predictionTeams: topAttackTeams,
      dataTeams: fixtureTeams,
      predictionRole: "Attackers",
      dataRole: "Assets",
      color: "#A78BFA",
    },
    {
      label: "Fixture difficulty",
      prediction: "Consider avoiding",
      data: "Consider avoiding",
      predictionTeam: predictionHardTeam,
      dataTeam: dataRiskTeam,
      predictionTeams: predictionHardTeams,
      dataTeams: dataRiskTeams,
      predictionRole: "Defenders",
      dataRole: "Defenders",
      color: "#EF4444",
    },
  ];

  return {
    gameweek: selectedGameweek,
    predictedGoals: insightPredictedGoals,
    averagePredictedGoals,
    predictedDraws: insightPredictedDraws,
    predictedCleanSheets: insightPredictedCleanSheets,
    mostBacked: mostBackedEntry
      ? `${mostBackedEntry[0]} (${mostBackedEntry[1]})`
      : emptyReport.mostBacked,
    topAttackTeam,
    topDefenceTeam,
    formAttackTeam,
    formDefenceTeam,
    avoidTeam,
    dataRiskTeam,
    captainTeam: topAttackTeam,
    differentialTeam: fixtureRows.find((row) => row.team !== topAttackTeam && row.team !== topDefenceTeam)?.team || "No standout",
    fixtureSwing: fixtureTeam,
    cleanSheetTrend:
      bestCleanSheetRun?.cleanSheetStreak > 0
        ? `${bestCleanSheetRun.team}: ${bestCleanSheetRun.cleanSheetStreak} clean sheets in a row`
        : "No clean-sheet streak yet",
    formFormation,
    predictionFormation,
    attackRows,
    defenceRows,
    formDefenceRows,
    predictionDefenceRows,
    avoidRows,
    fixtureRows,
    overallFixtureRows,
    attackFixtureRows: fixtureRows,
    defenceFixtureRows,
    fixtureHardRows,
    formAttackRows,
    dataRiskRows,
    adviceRows,
    predictionSignalRows,
    predictionConflicts: [...predictionConflicts, ...(preparedFantasyIqReport.predictionConflicts || [])].slice(0, 6),
    preparedFantasyIqReport,
    fantasySuggestedTeam,
    fantasyIqClubOutlooks,
    fantasyIqPredictionOutlooks,
    squad: fantasyIqSquad,
    squadValidation: fantasyIqSquadValidation,
    scoringConfigValid: validateFantasyIqScoreConfig(),
    completedResults,
    submittedPredictions: insightSubmittedPredictions,
    missingPredictions: Math.max(0, insightFixtures.length - insightSubmittedPredictions),
    insightScope: fantasyInsightsScope,
  };
}, [
  activeFixtures,
  activeGameweeks,
  coinsState,
  currentPredictionKey,
  fantasyInsightsScope,
  fantasyIqSquad,
  fantasyIqSquadValidation,
  fantasySuggestedTeamStyle,
  fantasyPlayerData,
  gameMode,
  isWorldCupMode,
  leaguePerformanceContext,
  predictions,
  results,
  selectedGameweek,
]);

const fantasyIqSnapshotGameweekContext = useMemo(
  () =>
    resolveFantasyIqSnapshotGameweek({
      events: fantasyPlayerData.events || [],
      fixtures: activeFixtures,
      selectedGameweek,
      season: "2026/27",
      currentDate: new Date(),
    }),
  [activeFixtures, fantasyPlayerData.events, selectedGameweek]
);

const currentFantasyIqSnapshotCandidate = useMemo(() => {
  const report = fantasyIqReport.preparedFantasyIqReport;
  if (!fantasyIqSquad?.confirmed || !report || report.overallScore == null) return null;
  return createFantasyIqSnapshot({
    squad: fantasyIqSquad,
    report,
    gameweekContext: fantasyIqSnapshotGameweekContext,
    metadata: {
      fantasyIqModelVersion: FANTASY_IQ_MODEL_VERSION,
      lineupIqModelVersion: FANTASY_LINEUP_IQ_VERSION,
      transferIqModelVersion: FANTASY_TRANSFER_IQ_VERSION,
      suggestedTeamModelVersion: FANTASY_SUGGESTED_TEAM_VERSION,
      fixtureModelVersion: PREMIER_LEAGUE_MODEL_CONFIG.version || "premier-fixture-model-v1",
      scoreConfigVersion: FANTASY_IQ_SCORE_CONFIG_VERSION,
      playerDataSource: fantasyPlayerData.source || fantasyPlayerData.cacheStatus || null,
      playerDataUpdatedAt: fantasyPlayerData.fetchedAt || null,
    },
  });
}, [fantasyIqReport.preparedFantasyIqReport, fantasyIqSnapshotGameweekContext, fantasyIqSquad, fantasyPlayerData.cacheStatus, fantasyPlayerData.fetchedAt, fantasyPlayerData.source]);

const fantasyIqOrderedSnapshots = useMemo(
  () => orderFantasyIqSnapshots(fantasyIqHistory.snapshots || []),
  [fantasyIqHistory]
);
const fantasyIqLatestSnapshot = useMemo(
  () => getLatestFantasyIqSnapshot(fantasyIqOrderedSnapshots),
  [fantasyIqOrderedSnapshots]
);
const fantasyIqPreviousSnapshot = useMemo(
  () => getPreviousFantasyIqSnapshot(fantasyIqOrderedSnapshots, fantasyIqLatestSnapshot),
  [fantasyIqLatestSnapshot, fantasyIqOrderedSnapshots]
);
const fantasyIqLatestComparison = useMemo(
  () => compareFantasyIqSnapshots(fantasyIqPreviousSnapshot, fantasyIqLatestSnapshot),
  [fantasyIqPreviousSnapshot, fantasyIqLatestSnapshot]
);
const fantasyIqTrendData = useMemo(
  () => buildFantasyIqTrendData(fantasyIqOrderedSnapshots),
  [fantasyIqOrderedSnapshots]
);
const fantasyIqTrendSummary = useMemo(
  () => buildFantasyIqTrendSummary(fantasyIqOrderedSnapshots),
  [fantasyIqOrderedSnapshots]
);
const fantasyIqCurrentDuplicate = useMemo(
  () => currentFantasyIqSnapshotCandidate ? findFantasyIqDuplicateSnapshot(fantasyIqHistory, currentFantasyIqSnapshotCandidate) : null,
  [currentFantasyIqSnapshotCandidate, fantasyIqHistory]
);
const fantasyIqHistoryDiagnostics = useMemo(() => {
  const normalised = normaliseFantasyIqHistory(fantasyIqHistory);
  return {
    ...normalised.diagnostics,
    storageKey: getFantasyIqHistoryStorageKey(fantasyIqUserIdentifier),
    schemaVersion: FANTASY_IQ_HISTORY_SCHEMA_VERSION,
    historyVersion: FANTASY_IQ_HISTORY_VERSION,
    snapshotCount: fantasyIqHistory.snapshots?.length || 0,
    currentSeason: fantasyIqSnapshotGameweekContext.season,
    modelVersionMismatches: (fantasyIqHistory.snapshots || []).filter(
      (snapshot) => snapshot.metadata?.fantasyIqModelVersion && snapshot.metadata.fantasyIqModelVersion !== FANTASY_IQ_MODEL_VERSION
    ).length,
    byteSize: JSON.stringify({ snapshots: fantasyIqHistory.snapshots || [] }).length,
  };
}, [fantasyIqHistory, fantasyIqSnapshotGameweekContext.season, fantasyIqUserIdentifier]);

const currentSeasonPredictionStats = useMemo(() => {
  if (isWorldCupMode) return { exactScores: 0, correctCaptains: 0 };
  const currentPredictions = predictions[currentPredictionKey] || {};
  let exactScores = 0;
  let correctCaptains = 0;
  const captainGameweeks = new Set();

  activeFixtures.forEach((fixture) => {
    const result = results[fixture.id];
    if (!hasValidResultScore(result)) return;
    const pred =
      currentPredictions[String(fixture.id)] !== undefined
        ? currentPredictions[String(fixture.id)]
        : currentPredictions[fixture.id];
    if (!pred) return;
    const predHome = Number(pred.homeGoals);
    const predAway = Number(pred.awayGoals);
    const realHome = Number(result.homeGoals);
    const realAway = Number(result.awayGoals);
    if (![predHome, predAway, realHome, realAway].every(Number.isFinite)) return;
    if (predHome === realHome && predAway === realAway) exactScores += 1;

    if (pred.isDouble && !captainGameweeks.has(fixture.gameweek)) {
      captainGameweeks.add(fixture.gameweek);
      if (getResult(predHome, predAway) === getResult(realHome, realAway)) {
        correctCaptains += 1;
      }
    }
  });

  return { exactScores, correctCaptains };
}, [activeFixtures, currentPredictionKey, isWorldCupMode, predictions, results]);

// Winner popup for league tables (once per user per gameweek/matchday)
useEffect(() => {
  if (!isLoggedIn || !currentUserId) return;
  if (activeView !== "league" && activeView !== "globalLeague") return;
  if (!selectedGameweek) return;

  const gwFixtures = activeFixtures.filter((f) => f.gameweek === selectedGameweek);
  if (!gwFixtures.length) return;
  const completedGwFixtures = gwFixtures.filter((fixture) =>
    isFixtureCompleted(fixture, results)
  );
  if (completedGwFixtures.length !== gwFixtures.length) return;
  const lastKickoff = Math.max(
    ...gwFixtures.map((f) => Date.parse(f.kickoff)).filter((t) => Number.isFinite(t))
  );
  if (!Number.isFinite(lastKickoff)) return;
  const winnerPopupDelayMs = isWorldCupMode ? 2 * 60 * 60 * 1000 : 3 * 60 * 60 * 1000;
  const gwEndTime = lastKickoff + winnerPopupDelayMs;
  const msUntilPopup = gwEndTime - Date.now();
  if (msUntilPopup > 0) {
    const timeout = setTimeout(() => {
      setWinnerPopupCheckCount((count) => count + 1);
    }, Math.min(msUntilPopup + 1000, 60 * 60 * 1000));
    return () => clearTimeout(timeout);
  }

  const modeKey = getModeKey(gameMode);
  const leagueScope =
    activeView === "league" ? `league${selectedMiniLeague?.id || ""}` : "global";
  if (activeView === "league") {
    if (!selectedMiniLeague?.id) return;
    if (String(computedTotalsLeagueId || "") !== String(selectedMiniLeague.id)) return;
  }
  const seenKey = `winner_popup_seen_${modeKey}_${leagueScope}_gw${selectedGameweek}_${currentUserId}`;
  if (localStorage.getItem(seenKey)) return;

  let winners = [];
  if (activeView === "league") {
    const gwTotals = computedWeeklyTotals?.[selectedGameweek];
    if (!gwTotals) return;
    const max = Math.max(...Object.values(gwTotals).map((v) => Number(v) || 0));
    if (!Number.isFinite(max) || max <= 0) return;
    const getLeagueWinnerName = (playerKey) => {
      const key = String(playerKey || "");
      if (!key) return "Unknown player";
      return leagueUsernamesByUserId[key] || (looksLikeUserId(key) ? "Unknown player" : key);
    };
    winners = Object.entries(gwTotals)
      .filter(([, v]) => (Number(v) || 0) === max)
      .map(([player, points]) => ({
        player: getLeagueWinnerName(player),
        userId: looksLikeUserId(player) ? String(player) : null,
        points,
      }));
  } else {
    const scores = globalWeeklyScores;
    const entries = Object.entries(scores);
    if (!entries.length) return;
    const max = Math.max(...entries.map(([, v]) => Number(v) || 0));
    if (!Number.isFinite(max) || max <= 0) return;
    winners = entries
      .filter(([, v]) => (Number(v) || 0) === max)
      .map(([userId, points]) => {
        const u = globalUsers.find((x) => x.userId === userId);
        return { player: u?.username || "Unknown", userId, points };
      });
  }

  if (!winners.length) return;
  setWinnerList(winners);
  setWinnerIndex(0);
  setWinnerModalType("gw");
  setShowWinnerModal(true);
  if (!isWorldCupMode) {
    setPredictionIqPendingAfterWinner(true);
  }
  localStorage.setItem(seenKey, "true");
}, [
  activeView,
  selectedGameweek,
  computedWeeklyTotals,
  computedTotalsLeagueId,
  leagueUsernamesByUserId,
  globalWeeklyScores,
  globalUsers,
  selectedMiniLeague,
  activeFixtures,
  results,
  isLoggedIn,
  currentUserId,
  gameMode,
  isWorldCupMode,
  winnerPopupCheckCount,
]);

// Season winner popup (once per user/view, only after season fully completes)
useEffect(() => {
  if (!isLoggedIn || !currentUserId) return;
  if (activeView !== "league" && activeView !== "globalLeague") return;
  if (!activeGameweeks.length) return;

  const finalGw = Math.max(...activeGameweeks);
  const finalGwFixtures = activeFixtures.filter((f) => f.gameweek === finalGw);
  if (!finalGwFixtures.length) return;

  const lastKickoff = Math.max(
    ...finalGwFixtures.map((f) => Date.parse(f.kickoff)).filter((t) => Number.isFinite(t))
  );
  if (!Number.isFinite(lastKickoff)) return;
  const seasonEndTime = lastKickoff + 3 * 60 * 60 * 1000;
  if (Date.now() < seasonEndTime) return;

  const allFixturesCompleted = activeFixtures.every((fixture) => {
    const res = results[fixture.id];
    return !!hasValidResultScore(res);
  });
  if (!allFixturesCompleted) return;

  const modeKey = getModeKey(gameMode);
  const seenKey = `season_winner_popup_seen_${modeKey}_${activeView}_s${finalGw}_${currentUserId}`;
  if (localStorage.getItem(seenKey)) return;

  let winners = [];
  if (activeView === "league") {
    if (!leaderboard || leaderboard.length === 0) return;
    const max = Math.max(...leaderboard.map((r) => Number(r.points) || 0));
    if (!Number.isFinite(max) || max <= 0) return;
    winners = leaderboard
      .filter((r) => (Number(r.points) || 0) === max)
      .map((r) => ({
        player: r.player,
        userId: r.userId || null,
        points: Number(r.points) || 0,
      }));
  } else {
    if (!globalLeaderboard || globalLeaderboard.length === 0) return;
    const max = Math.max(...globalLeaderboard.map((r) => Number(r.points) || 0));
    if (!Number.isFinite(max) || max <= 0) return;
    winners = globalLeaderboard
      .filter((r) => (Number(r.points) || 0) === max)
      .map((r) => ({
        player: r.player,
        userId: r.userId || null,
        points: Number(r.points) || 0,
      }));
  }

  if (!winners.length) return;
  setWinnerList(winners);
  setWinnerIndex(0);
  setWinnerModalType("season");
  setShowWinnerModal(true);
  localStorage.setItem(seenKey, "true");
}, [
  activeView,
  leaderboard,
  globalLeaderboard,
  results,
  isLoggedIn,
  currentUserId,
  activeFixtures,
  activeGameweeks,
  gameMode,
]);

useEffect(() => {
  if (!showWinnerModal || winnerList.length <= 1) return;
  const interval = setInterval(() => {
    setWinnerIndex((i) => (i + 1) % winnerList.length);
  }, 2200);
  return () => clearInterval(interval);
}, [showWinnerModal, winnerList]);

useEffect(() => {
  if (!showWinnerModal) return;
  const timeout = setTimeout(() => setShowWinnerModal(false), 6500);
  return () => clearTimeout(timeout);
}, [showWinnerModal]);

useEffect(() => {
  if (showWinnerModal || !predictionIqPendingAfterWinner) return;
  setPredictionIqPendingAfterWinner(false);
  setShowPredictionIqModal(true);
}, [showWinnerModal, predictionIqPendingAfterWinner]);

useEffect(() => {
  if (!showWinnerModal || !soundEffectsEnabled) return;
  if (!winnerAudioRef.current) {
    winnerAudioRef.current = new Audio("/winner.mp3");
  }
  winnerAudioRef.current.currentTime = 0;
  winnerAudioRef.current.volume = 0.5;
  winnerAudioRef.current.play().catch(() => {
    // Fallback for setups where winner.mp3 hasn't been added yet.
    if (winnerAudioRef.current?.src?.includes("/winner.mp3")) {
      winnerAudioRef.current.src = "/coin.mp3";
      winnerAudioRef.current.play().catch(() => {});
    }
  });
}, [showWinnerModal, soundEffectsEnabled]);

const winnerConfetti = useMemo(() => {
  if (!showWinnerModal) return [];
  return Array.from({ length: 24 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.6,
    duration: 1.6 + Math.random() * 0.8,
    size: 6 + Math.random() * 6,
    rotate: Math.random() * 360,
    hue: Math.floor(Math.random() * 360),
  }));
  }, [showWinnerModal]);

  // Coins league rows
const historicalScores = useMemo(() => {
  if (isWorldCupMode) {
    if (!worldCupHistoryUsers.length) return [];
    const completedWorldCupGameweeks = activeGameweeks.filter((gw) =>
      activeFixtures.some(
        (fixture) => fixture.gameweek === gw && isFixtureCompleted(fixture, results)
      )
    );
    if (selectedMiniLeague?.id && computedWeeklyTotals) {
      return completedWorldCupGameweeks.map((gw) => {
        const row = { gameweek: gw };
        const gwTotals = computedWeeklyTotals[gw] || {};
        worldCupHistoryUsers.forEach((user) => {
          const userId = String(user.userId || "");
          const username = user.username || "";
          const score =
            Number(gwTotals[userId]) ||
            Number(gwTotals[username]) ||
            0;
          row[username] = score;
        });
        return row;
      });
    }
    return completedWorldCupGameweeks.map((gw) => {
      const row = { gameweek: gw };
      worldCupHistoryUsers.forEach((user) => {
        let score = 0;
        activeFixtures.forEach((fixture) => {
          if (fixture.gameweek !== gw) return;
          const res = results[fixture.id];
          if (!hasValidResultScore(res)) return;
          const preds = worldCupHistoryPredictionsByUserId[user.userId] || {};
          const pred =
            preds[String(fixture.id)] !== undefined
              ? preds[String(fixture.id)]
              : preds[fixture.id];
          if (!pred) return;
          score += getTotalPoints(pred, res);
        });
        row[user.username] = score;
      });
      return row;
    });
  }

  if (computedWeeklyTotals) {
    return activeGameweeks.map((gw) => {
      const row = { gameweek: gw };
      const gwTotals = computedWeeklyTotals[gw] || {};
      Object.keys(gwTotals).forEach((k) => {
        const score = Number(gwTotals[k]) || 0;
        row[k] = score;

        const displayName = leagueUsernamesByUserId[String(k)];
        if (displayName && displayName !== k) {
          row[displayName] = (Number(row[displayName]) || 0) + score;
        }
      });
      return row;
    });
  }

  // fallback to old logic if computed totals not ready yet
  return activeGameweeks.map((gw) => {
    const row = { gameweek: gw };
    const scorePlayers = isWorldCupMode
      ? dedupedGlobalUsers.map((u) => u.username)
      : PLAYERS;
    scorePlayers.forEach((player) => {
      let score = isWorldCupMode ? 0 : (SPREADSHEET_WEEKLY_TOTALS[player]?.[gw - 1] || 0);
      activeFixtures.forEach((fixture) => {
        if (fixture.gameweek !== gw) return;
        const res = results[fixture.id];
        if (!hasValidResultScore(res)) return;
        // Only add points if this player has a prediction for this fixture
        if (predictions[player] && predictions[player][fixture.id]) {
          score += getTotalPoints(predictions[player][fixture.id], res);
        }
        // If no prediction, do not add any points (remains at previous value)
      });
      row[player] = score;
    });
    return row;
  });
}, [
  computedWeeklyTotals,
  leagueUsernamesByUserId,
  predictions,
  results,
  activeGameweeks,
  activeFixtures,
  isWorldCupMode,
  dedupedGlobalUsers,
  globalPredictionsByUserId,
  worldCupHistoryUsers,
  worldCupHistoryPredictionsByUserId,
  selectedMiniLeague,
]);

const profileUsersByUserId = useMemo(() => {
  const out = {};
  [...(globalUsers || []), ...(leagueHistoryUsers || [])].forEach((user) => {
    const userId = String(user?.userId || "");
    if (!userId) return;
    out[userId] = { ...(out[userId] || {}), ...user };
  });
  return out;
}, [globalUsers, leagueHistoryUsers]);

const profileUsersByUsername = useMemo(() => {
  const out = {};
  [...(globalUsers || []), ...(leagueHistoryUsers || [])].forEach((user) => {
    const username = String(user?.username || "").trim();
    if (!username) return;
    out[username] = { ...(out[username] || {}), ...user };
  });
  return out;
}, [globalUsers, leagueHistoryUsers]);

const coinsRowsByUserId = useMemo(() => {
  const out = {};
  (coinsLeagueRows || []).forEach((row) => {
    const userId = String(row?.userId || "");
    if (userId) out[userId] = row;
  });
  return out;
}, [coinsLeagueRows]);

const coinsRowsByPlayer = useMemo(() => {
  const out = {};
  (coinsLeagueRows || []).forEach((row) => {
    const player = String(row?.player || "").trim();
    if (player) out[player] = row;
  });
  return out;
}, [coinsLeagueRows]);

function getLeaderboardProfile(row, tableRows, rankIndex, scope = "league") {
  const userId = String(row?.userId || "");
  const player = String(row?.player || "").trim();
  const profile = (userId && profileUsersByUserId[userId]) || profileUsersByUsername[player] || {};
  const favorite =
    activeFavoriteByUserId[userId] ||
    activeFavoriteByUsername[player] ||
    (isWorldCupMode ? profile.favoriteCountry : profile.favoriteTeam) ||
    "";
  const coinsRow = (userId && coinsRowsByUserId[userId]) || coinsRowsByPlayer[player] || {};
  const bestCoins = coinsRow.bestGameweekCoinsWin || null;
  const rowScore = Number(row?.points) || 0;
  const currentScoreRank =
    (tableRows || []).filter((candidate) => (Number(candidate?.points) || 0) > rowScore).length + 1;

  const getScoreForGameweek = (gw, targetRow) => {
    const targetUserId = String(targetRow?.userId || "");
    const targetPlayer = String(targetRow?.player || "").trim();
    const totals = scope === "global" ? null : computedWeeklyTotals?.[gw];
    if (totals) {
      const candidates = [targetUserId, targetPlayer].filter(Boolean);
      for (const key of candidates) {
        if (totals[key] !== undefined) return Number(totals[key]) || 0;
      }
    }
    if (!isWorldCupMode) {
      return Number(SPREADSHEET_WEEKLY_TOTALS[targetPlayer]?.[gw - 1]) || 0;
    }
    const preds = globalPredictionsByUserId[targetUserId] || leaguePredictionsByUserId[targetUserId] || {};
    let score = 0;
    activeFixtures.forEach((fixture) => {
      if (fixture.gameweek !== gw) return;
      const res = results[fixture.id];
      if (!hasValidResultScore(res)) return;
      const pred =
        preds[String(fixture.id)] !== undefined
          ? preds[String(fixture.id)]
          : preds[fixture.id];
      if (pred) score += getTotalPoints(pred, res);
    });
    return score;
  };

  let bestGameweekScore = null;
  activeGameweeks.forEach((gw) => {
    const weeklyScore = getScoreForGameweek(gw, row);
    if (!bestGameweekScore || weeklyScore > bestGameweekScore.score) {
      bestGameweekScore = { gameweek: gw, score: weeklyScore };
    }
  });

  const finishedSeasonRecords = ORIGINALS_SEASON_POSITION_RECORDS.filter(
    (record) => record.player === player
  );
  const currentSeasonComplete =
    activeFixtures.length > 0 &&
    activeFixtures.every((fixture) => isFixtureCompleted(fixture, results));
  if (currentSeasonComplete) {
    const seasonLabel = getSeasonLabelFromFixtures(activeFixtures) || "Current season";
    finishedSeasonRecords.push({
      player,
      seasonLabel,
      position: currentScoreRank,
      points: rowScore,
    });
  }
  const bestSeasonRecord = finishedSeasonRecords
    .filter((record) => Number.isFinite(Number(record.position)))
    .sort((a, b) => Number(a.position) - Number(b.position) || Number(b.points || 0) - Number(a.points || 0))[0];
  const bestSeasonPosition = bestSeasonRecord
    ? `#${bestSeasonRecord.position} (${Math.round(Number(bestSeasonRecord.points) || 0)} pts, ${bestSeasonRecord.seasonLabel})`
    : "No finished season yet";
  const preds =
    (userId && (globalPredictionsByUserId[userId] || leaguePredictionsByUserId[userId])) ||
    predictions[player] ||
    {};
  let bingpots = 0;
  let captainSelections = 0;
  let captainWins = 0;
  activeFixtures.forEach((fixture) => {
    const pred =
      preds[String(fixture.id)] !== undefined ? preds[String(fixture.id)] : preds[fixture.id];
    const res = results[fixture.id];
    if (!pred || !hasValidResultScore(res)) return;
    const predHome = Number(pred.homeGoals);
    const predAway = Number(pred.awayGoals);
    const realHome = Number(res.homeGoals);
    const realAway = Number(res.awayGoals);
    if (predHome === realHome && predAway === realAway) {
      bingpots += 1;
    }
    if (pred.isDouble || pred.isTriple) {
      captainSelections += 1;
      if (getResult(predHome, predAway) === getResult(realHome, realAway)) {
        captainWins += 1;
      }
    }
  });
  const captainAccuracy = captainSelections
    ? `${Math.round((captainWins / captainSelections) * 100)}% (${captainWins}/${captainSelections})`
    : "No captains yet";

  return {
    memberSince: formatProfileDate(profile.createdAt),
    favorite: favorite || "Not set",
    currentPosition: currentScoreRank,
    bestSeasonPosition,
    bestGameweekScore,
    bestCoins,
    bingpots,
    captainAccuracy,
    coinsProfit: typeof coinsRow.profit === "number" ? coinsRow.profit : null,
  };
}

function renderExpandableLeaderboardRow({ row, rows, index, value, valueFormatter, scope }) {
  const displayPlayerName = formatUsernameForDisplay(row.player);
  const decoration = getLeaderboardDecoration(
    rows,
    index,
    (item) => (scope === "coins" ? (typeof item?.profit === "number" ? item.profit : item?.points) : item?.points),
    leaderboardDecorationsEnabled
  );
  const borderColor = decoration.borderColor || theme.line;
  const rowAvatar = getAvatarForRow(row);
  const rowKey = `${scope}:${row.userId || row.player}`;
  const isExpanded = expandedPlayerRowKey === rowKey;
  const profile = getLeaderboardProfile(row, rows, index, scope);
  const scoreLabel = profile.bestGameweekScore
    ? `${Math.round(profile.bestGameweekScore.score)} pts (${getModeGameweekLabel(gameMode, profile.bestGameweekScore.gameweek)})`
    : "No completed scores";
  const coinsLabel = profile.bestCoins
    ? `${Number(profile.bestCoins.profit || 0).toFixed(2)} (${getModeGameweekLabel(gameMode, profile.bestCoins.gameweek)})`
    : profile.coinsProfit !== null
    ? `${Number(profile.coinsProfit || 0).toFixed(2)} season profit`
    : "No coins data";
  const fullPlayerName = row.player || displayPlayerName;

  return (
    <div
      key={row.userId || row.player}
      style={{
        background: theme.panelHi,
        border: `2px solid ${borderColor}`,
        borderRadius: 12,
        overflow: "hidden",
        transition: "transform 0.2s",
      }}
    >
      <div
        role="button"
        tabIndex={0}
        aria-expanded={isExpanded}
        onClick={() => setExpandedPlayerRowKey((prev) => (prev === rowKey ? "" : rowKey))}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpandedPlayerRowKey((prev) => (prev === rowKey ? "" : rowKey));
          }
        }}
        style={{
          display: "grid",
          gridTemplateColumns: "50px auto minmax(0, 1fr) 90px 18px",
          gap: 10,
          alignItems: "center",
          padding: "12px 14px",
          cursor: "pointer",
        }}
      >
        <div style={{ color: decoration.borderColor || theme.muted, fontWeight: 700, fontSize: 16, display: "flex", alignItems: "center", gap: 4 }}>
          {decoration.emoji && <span style={{ fontSize: 18 }}>{decoration.emoji}</span>}
          {!decoration.emoji && <span>{decoration.rank}</span>}
        </div>
        <PlayerAvatar
          name={row.player}
          size={36}
          seed={rowAvatar.seed}
          avatarStyle={rowAvatar.style}
          favoriteMode={gameMode}
          favoriteTeam={activeFavoriteByUserId[String(row.userId || "")] || activeFavoriteByUsername[row.player] || ""}
        />
        <div style={{ fontWeight: 700, fontSize: 15, color: decoration.highlight ? "#FFD700" : theme.text, minWidth: 0, display: "flex", flexDirection: "column", alignItems: "flex-start", overflow: "visible" }}>
          <span title={row.player} style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", minWidth: 0, maxWidth: "100%" }}>
            {displayPlayerName}
          </span>
          {renderBadgeStrip(row, { compact: true, limit: BADGE_DEFINITIONS.length, wrap: true, columns: 7 })}
        </div>
        <div style={{ textAlign: "right", fontWeight: 800, fontSize: 18, color: decoration.borderColor || theme.accent }}>
          <AnimatedNumber value={Number(value) || 0} duration={450} format={valueFormatter} />
        </div>
        <div aria-hidden="true" style={{ color: theme.muted, fontSize: 16, fontWeight: 900 }}>
          {isExpanded ? "▲" : "▼"}
        </div>
      </div>

      {isExpanded && (
        <div
          style={{
            borderTop: `1px solid ${theme.line}`,
            padding: "10px 14px 14px",
            background: "rgba(255,255,255,0.02)",
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          <div style={{ gridColumn: "1 / -1", textAlign: "center", color: theme.text, fontSize: 16, fontWeight: 950, overflowWrap: "anywhere" }}>
            {fullPlayerName}
          </div>
          {[
            { label: "Member since", value: profile.memberSince },
            { label: isWorldCupMode ? "Favourite country" : "Favourite team", value: profile.favorite },
            { label: "Best season position", value: profile.bestSeasonPosition },
            { label: "Current position", value: `#${profile.currentPosition}` },
            { label: "Best week score", value: scoreLabel },
            { label: "Best coins week", value: coinsLabel },
            { label: "Bingpots", value: profile.bingpots },
            { label: "Captain accuracy", value: profile.captainAccuracy },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                background: theme.panel,
                border: `1px solid ${theme.line}`,
                borderRadius: 8,
                padding: "8px 9px",
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 10, color: theme.muted, textTransform: "uppercase", fontWeight: 800, letterSpacing: 0.5 }}>
                {item.label}
              </div>
              <div style={{ marginTop: 3, fontSize: 13, color: theme.text, fontWeight: 800, overflowWrap: "anywhere" }}>
                {item.value}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const currentSeasonWinnerRecord = useMemo(() => {
  if (!activeFixtures.length || !activeGameweeks.length || !leaderboard?.length) {
    return null;
  }

  const finalGameweek = Math.max(...activeGameweeks);
  const seasonComplete = activeFixtures.every((fixture) =>
    isFixtureCompleted(fixture, results)
  );
  if (!seasonComplete) return null;

  const seasonEndTime = Math.max(
    ...activeFixtures.map((fixture) => Date.parse(fixture.kickoff)).filter(Number.isFinite)
  );
  if (!Number.isFinite(seasonEndTime) || seasonEndTime > Date.now()) return null;

  const maxPoints = Math.max(
    ...leaderboard.map((row) => Number(row.points) || 0)
  );
  if (!Number.isFinite(maxPoints) || maxPoints <= 0) return null;

  const winners = leaderboard
    .filter((row) => (Number(row.points) || 0) === maxPoints)
    .map((row) => ({
      player: row.player,
      userId: row.userId || null,
      points: Number(row.points) || 0,
    }));

  if (!winners.length) return null;

  const seasonLabel = getSeasonLabelFromFixtures(activeFixtures);
  const modeKey = getModeKey(gameMode);

  return {
    id: `${modeKey}-${seasonLabel || finalGameweek}`,
    mode: gameMode,
    modeLabel: getModeLabel(gameMode),
    seasonLabel,
    finalGameweek,
    winners,
    points: maxPoints,
    completedAt: new Date().toISOString(),
  };
}, [activeFixtures, activeGameweeks, leaderboard, results, gameMode]);

useEffect(() => {
  if (!currentSeasonWinnerRecord) return;

  setSeasonWinnerHistory((prev) => {
    const current = Array.isArray(prev) ? prev : [];
    const existingIndex = current.findIndex(
      (record) => record.id === currentSeasonWinnerRecord.id
    );
    if (existingIndex === -1) {
      return [currentSeasonWinnerRecord, ...current];
    }

    const next = [...current];
    next[existingIndex] = {
      ...current[existingIndex],
      ...currentSeasonWinnerRecord,
      completedAt: current[existingIndex].completedAt || currentSeasonWinnerRecord.completedAt,
    };
    return next;
  });

  let cancelled = false;
  (async () => {
    const remoteRecords = await apiSaveSeasonWinner(currentSeasonWinnerRecord, authToken);
    if (cancelled || !remoteRecords) return;
    setSeasonWinnerHistory((prev) => mergeSeasonWinnerRecords(prev, remoteRecords));
  })();

  return () => {
    cancelled = true;
  };
}, [currentSeasonWinnerRecord, authToken]);

const visibleSeasonWinnerHistory = useMemo(
  () =>
    (seasonWinnerHistory || [])
      .filter(isValidSeasonWinnerRecord)
      .filter((record) => record.mode === gameMode)
      .filter((record) => Number(record.points) > 0)
      .filter((record) =>
        (record.winners || []).some((winner) => Number(winner?.points) > 0)
      )
      .sort((a, b) => {
        const aTime = Date.parse(a.completedAt);
        const bTime = Date.parse(b.completedAt);
        if (Number.isFinite(aTime) && Number.isFinite(bTime)) return bTime - aTime;
        return String(b.seasonLabel || "").localeCompare(String(a.seasonLabel || ""));
      }),
  [seasonWinnerHistory, gameMode]
);

const badgeStatsByKey = useMemo(() => {
  const currentPremierSeasonLabel = isWorldCupMode ? "" : getSeasonLabelFromFixtures(activeFixtures);
  const completedPremierBadgeGameweeks = new Set(
    isWorldCupMode
      ? []
      : activeGameweeks.filter((gw) => {
          const fixtures = activeFixtures.filter((fixture) => fixture.gameweek === gw);
          return fixtures.length > 0 && fixtures.every((fixture) => isFixtureCompleted(fixture, results));
        })
  );
  const currentSeasonHasCompletedPremierGameweek = completedPremierBadgeGameweeks.size > 0;
  const stats = {};
  const ensureStats = (key, player = "", userId = "") => {
    const cleanKey = String(key || "").trim();
    if (!cleanKey) return null;
    if (!stats[cleanKey]) {
      stats[cleanKey] = {
        player,
        userId,
        founder: false,
        seasonsPlayed: 0,
        globalWinnerCount: 0,
        globalMedals: emptyGlobalMedals(),
        coinLeagueWins: 0,
        currentWeeklyWinStreak: 0,
        longestWeeklyWinStreak: 0,
        exactScores: 0,
        correctCaptains: 0,
        earnedBadgeIds: [],
      };
    }
    if (player && !stats[cleanKey].player) stats[cleanKey].player = player;
    if (userId && !stats[cleanKey].userId) stats[cleanKey].userId = userId;
    return stats[cleanKey];
  };
  const mergeStats = (targetKey, sourceKey) => {
    const target = ensureStats(targetKey);
    const source = stats[String(sourceKey || "").trim()];
    if (!target || !source) return;
    target.founder = target.founder || source.founder;
    target.seasonsPlayed = Math.max(target.seasonsPlayed, source.seasonsPlayed);
    target.globalWinnerCount = Math.max(target.globalWinnerCount, source.globalWinnerCount);
    target.globalMedals = {
      gold: Math.max(
        target.globalMedals?.gold || target.globalWinnerCount || 0,
        source.globalMedals?.gold || source.globalWinnerCount || 0
      ),
      silver: Math.max(target.globalMedals?.silver || 0, source.globalMedals?.silver || 0),
      bronze: Math.max(target.globalMedals?.bronze || 0, source.globalMedals?.bronze || 0),
    };
    target.coinLeagueWins = Math.max(target.coinLeagueWins || 0, source.coinLeagueWins || 0);
    target.currentWeeklyWinStreak = Math.max(target.currentWeeklyWinStreak, source.currentWeeklyWinStreak);
    target.longestWeeklyWinStreak = Math.max(target.longestWeeklyWinStreak, source.longestWeeklyWinStreak);
    target.exactScores = Math.max(target.exactScores, source.exactScores);
    target.correctCaptains = Math.max(target.correctCaptains, source.correctCaptains);
    target.earnedBadgeIds = Array.from(
      new Set([...(target.earnedBadgeIds || []), ...(source.earnedBadgeIds || [])])
    );
  };

  const knownPlayers = [
    ...PLAYERS.map((player) => ({ player, userId: "" })),
    ...leaderboard.map((row) => ({ player: row.player, userId: row.userId || "" })),
    ...globalLeaderboard.map((row) => ({ player: row.player, userId: row.userId || "" })),
    ...leagueHistoryUsers.map((user) => ({ player: user.username, userId: user.userId || "" })),
    ...dedupedGlobalUsers.map((user) => ({ player: user.username, userId: user.userId || "" })),
  ];

  knownPlayers.forEach(({ player, userId }) => {
    const name = String(player || "").trim();
    const id = String(userId || "").trim();
    const nameStats = ensureStats(name, name, id);
    if (nameStats && isOriginalsFounder(name, id)) {
      nameStats.founder = true;
    }
    if (id) {
      const idStats = ensureStats(id, name, id);
      idStats.founder = idStats.founder || isOriginalsFounder(name, id);
      mergeStats(id, name);
      mergeStats(name, id);
    }
  });

  (seasonWinnerHistory || [])
    .filter(isValidSeasonWinnerRecord)
    .filter((record) => getModeKey(record.mode) === "premier")
    .forEach((record) => {
      (record.winners || []).forEach((winner) => {
        const name = String(winner?.player || "").trim();
        const id = String(winner?.userId || "").trim();
        const keys = [id, name].filter(Boolean);
        keys.forEach((key) => {
          const row = ensureStats(key, name, id);
          if (row) {
            row.globalWinnerCount += 1;
            row.globalMedals.gold += 1;
          }
        });
      });
    });

  const badgeSeasonComplete =
    !isWorldCupMode &&
    activeFixtures.length > 0 &&
    activeFixtures.every((fixture) => isFixtureCompleted(fixture, results));

  if (badgeSeasonComplete && globalLeaderboard.length >= 3) {
    globalLeaderboard.slice(0, 3).forEach((row, index) => {
      const medalType = index === 0 ? "gold" : index === 1 ? "silver" : "bronze";
      const name = String(row.player || "").trim();
      const id = String(row.userId || "").trim();
      [id, name].filter(Boolean).forEach((key) => {
        const stat = ensureStats(key, name, id);
        if (!stat) return;
        stat.globalMedals[medalType] = Math.max(stat.globalMedals[medalType] || 0, 1);
        if (medalType === "gold") {
          stat.globalWinnerCount = Math.max(stat.globalWinnerCount || 0, 1);
        }
      });
    });
  }

  if (badgeSeasonComplete && coinsLeagueRows.length > 0) {
    const topProfit = Math.max(...coinsLeagueRows.map((row) => Number(row.profit) || 0));
    if (Number.isFinite(topProfit)) {
      coinsLeagueRows
        .filter((row) => (Number(row.profit) || 0) === topProfit)
        .forEach((row) => {
          const name = String(row.player || "").trim();
          const id = String(row.userId || "").trim();
          [id, name].filter(Boolean).forEach((key) => {
            const stat = ensureStats(key, name, id);
            if (stat) stat.coinLeagueWins = Math.max(stat.coinLeagueWins || 0, 1);
          });
        });
    }
  }

  const playedSeasonsByKey = {};
  const getSafeEarnedBadgeIdsForRecord = (record = {}) => {
    const earnedIds = Array.isArray(record.earnedBadgeIds) ? record.earnedBadgeIds.filter(Boolean) : [];
    const isCurrentUnstartedPremierSeason =
      !isWorldCupMode &&
      currentPremierSeasonLabel &&
      String(record.seasonLabel || "") === currentPremierSeasonLabel &&
      !currentSeasonHasCompletedPremierGameweek;
    return isCurrentUnstartedPremierSeason
      ? earnedIds.filter((badgeId) => !PERFORMANCE_BADGE_IDS.has(String(badgeId)))
      : earnedIds;
  };
  const addPlayedSeason = (key, seasonLabel) => {
    const cleanKey = String(key || "").trim();
    const cleanSeason = String(seasonLabel || "").trim();
    if (!cleanKey || !cleanSeason) return;
    if (!playedSeasonsByKey[cleanKey]) playedSeasonsByKey[cleanKey] = new Set();
    playedSeasonsByKey[cleanKey].add(cleanSeason);
  };
  (badgeHistory || [])
    .filter((record) => record && getModeKey(record.mode) === "premier")
    .map(stripMaxBadgeDemoHistory)
    .forEach((record) => {
      const name = String(record.player || "").trim();
      const id = String(record.userId || "").trim();
      const keys = [id, name].filter(Boolean);
      keys.forEach((key) => {
        const row = ensureStats(key, name, id);
        if (!row) return;
        row.founder = row.founder || !!record.founder;
        row.globalWinnerCount = Math.max(row.globalWinnerCount, Number(record.globalWinnerCount) || 0);
        row.globalMedals = {
          gold: Math.max(
            row.globalMedals?.gold || row.globalWinnerCount || 0,
            Number(record.globalMedals?.gold) || Number(record.globalWinnerCount) || 0
          ),
          silver: Math.max(row.globalMedals?.silver || 0, Number(record.globalMedals?.silver) || 0),
          bronze: Math.max(row.globalMedals?.bronze || 0, Number(record.globalMedals?.bronze) || 0),
        };
        row.coinLeagueWins = (row.coinLeagueWins || 0) + (Number(record.coinLeagueWins) || 0);
        if (String(record.seasonLabel || "") !== currentPremierSeasonLabel) {
          row.currentWeeklyWinStreak = Math.max(
            row.currentWeeklyWinStreak,
            Number(record.currentWeeklyWinStreak) || 0
          );
          row.longestWeeklyWinStreak = Math.max(
            row.longestWeeklyWinStreak,
            Number(record.longestWeeklyWinStreak) || 0
          );
          row.exactScores = Math.max(row.exactScores, Number(record.exactScores) || 0);
          row.correctCaptains = Math.max(row.correctCaptains, Number(record.correctCaptains) || 0);
        }
        row.earnedBadgeIds = Array.from(
          new Set([...(row.earnedBadgeIds || []), ...getSafeEarnedBadgeIdsForRecord(record)])
        );
        if (record.playedSeason) addPlayedSeason(key, record.seasonLabel);
      });
    });

  const streaks = {};
  [...historicalScores]
    .filter((row) => completedPremierBadgeGameweeks.has(Number(row.gameweek)))
    .sort((a, b) => (Number(a.gameweek) || 0) - (Number(b.gameweek) || 0))
    .forEach((row) => {
      const entries = Object.entries(row)
        .filter(([key]) => key !== "gameweek")
        .map(([key, value]) => [key, Number(value) || 0])
        .filter(([, value]) => value > 0);
      if (!entries.length) return;
      const topScore = Math.max(...entries.map(([, value]) => value));
      const winners = new Set(entries.filter(([, value]) => value === topScore).map(([key]) => key));
      Object.keys(streaks).forEach((key) => {
        if (!winners.has(key)) streaks[key].current = 0;
      });
      winners.forEach((key) => {
        if (!streaks[key]) streaks[key] = { current: 0, longest: 0 };
        streaks[key].current += 1;
        streaks[key].longest = Math.max(streaks[key].longest, streaks[key].current);
      });
    });

  Object.entries(streaks).forEach(([key, streak]) => {
    const row = ensureStats(key);
    if (!row) return;
    row.currentWeeklyWinStreak = streak.current;
    row.longestWeeklyWinStreak = streak.longest;
  });

  const currentStatsKeys = [currentUserId, currentPlayer].filter(Boolean);
  currentStatsKeys.forEach((key) => {
    const row = ensureStats(key, currentPlayer, currentUserId);
    if (!row) return;
    row.seasonsPlayed = currentSeasonHasCompletedPremierGameweek && predictionIqReport.completedPredictions > 0 ? 1 : 0;
    row.exactScores = currentSeasonHasCompletedPremierGameweek ? currentSeasonPredictionStats.exactScores || 0 : 0;
    row.correctCaptains = currentSeasonHasCompletedPremierGameweek ? currentSeasonPredictionStats.correctCaptains || 0 : 0;
    row.currentWeeklyWinStreak = currentSeasonHasCompletedPremierGameweek
      ? Math.max(row.currentWeeklyWinStreak, predictionIqReport.currentWinningStreak || 0)
      : 0;
    row.longestWeeklyWinStreak = currentSeasonHasCompletedPremierGameweek
      ? Math.max(row.longestWeeklyWinStreak, predictionIqReport.longestWinningStreak || 0)
      : 0;
  });
  if (currentUserId && currentPlayer) {
    mergeStats(currentUserId, currentPlayer);
    mergeStats(currentPlayer, currentUserId);
  }

  Object.entries(stats).forEach(([key, row]) => {
    row.founder = !!row.founder || isOriginalsFounder(row.player, row.userId || key);
    row.globalWinnerCount = positiveBadgeCount(row.globalWinnerCount);
    row.globalMedals = {
      gold: positiveBadgeCount(row.globalMedals?.gold) || positiveBadgeCount(row.globalWinnerCount),
      silver: positiveBadgeCount(row.globalMedals?.silver),
      bronze: positiveBadgeCount(row.globalMedals?.bronze),
    };
    if (!row.globalMedals.gold && !row.globalWinnerCount) {
      row.globalWinnerCount = 0;
    }
    row.coinLeagueWins = positiveBadgeCount(row.coinLeagueWins);
    row.currentWeeklyWinStreak = positiveBadgeCount(row.currentWeeklyWinStreak);
    row.longestWeeklyWinStreak = positiveBadgeCount(row.longestWeeklyWinStreak);
    row.exactScores = positiveBadgeCount(row.exactScores);
    row.correctCaptains = positiveBadgeCount(row.correctCaptains);
    row.seasonsPlayed = Math.max(
      row.seasonsPlayed || 0,
      playedSeasonsByKey[key]?.size || 0
    );
    if (!row.seasonsPlayed && (row.founder || row.globalWinnerCount > 0 || row.coinLeagueWins > 0 || Object.values(row.globalMedals || {}).some((count) => count > 0))) {
      row.seasonsPlayed = 1;
    }
    stats[key] = row;
  });

  return stats;
}, [
  seasonWinnerHistory,
  activeFixtures,
  activeGameweeks,
  historicalScores,
  leaderboard,
  globalLeaderboard,
  coinsLeagueRows,
  leagueHistoryUsers,
  dedupedGlobalUsers,
  currentUserId,
  currentPlayer,
  predictionIqReport,
  currentSeasonPredictionStats,
  badgeHistory,
  isWorldCupMode,
  results,
]);

const getPlayerBadgeStats = (row = {}) => {
  const id = String(row.userId || "").trim();
  const name = String(row.player || row.username || "").trim();
  return (
    badgeStatsByKey[id] ||
    badgeStatsByKey[name] || {
      player: name,
      userId: id,
      founder: isOriginalsFounder(name, id),
      seasonsPlayed: 0,
      globalWinnerCount: 0,
      globalMedals: emptyGlobalMedals(),
      coinLeagueWins: 0,
      currentWeeklyWinStreak: 0,
      longestWeeklyWinStreak: 0,
      exactScores: 0,
      correctCaptains: 0,
      earnedBadgeIds: [],
    }
  );
};

const getEarnedBadges = (badgeStats = {}) =>
  BADGE_DEFINITIONS.filter((badge) => {
    if ((badgeStats.earnedBadgeIds || []).includes(badge.id)) return true;
    if (badge.id === "founder") return !!badgeStats.founder;
    if (badge.id === "addict") return (badgeStats.seasonsPlayed || 0) > 2;
    if (badge.id === "veteran") return (badgeStats.seasonsPlayed || 0) > 5;
    if (badge.id === "globalGold") return (positiveBadgeCount(badgeStats.globalMedals?.gold) || positiveBadgeCount(badgeStats.globalWinnerCount)) > 0;
    if (badge.id === "globalSilver") return positiveBadgeCount(badgeStats.globalMedals?.silver) > 0;
    if (badge.id === "globalBronze") return positiveBadgeCount(badgeStats.globalMedals?.bronze) > 0;
    if (badge.id === "gambler") return positiveBadgeCount(badgeStats.coinLeagueWins) > 0;
    if (badge.id === "streaker") return (badgeStats.longestWeeklyWinStreak || 0) >= 3;
    if (badge.id === "superStreaker") return (badgeStats.longestWeeklyWinStreak || 0) >= 5;
    if (badge.id === "sharpShooter") return (badgeStats.exactScores || 0) >= 5;
    if (badge.id === "sniper") return (badgeStats.exactScores || 0) >= 10;
    if (badge.id === "superSniper") return (badgeStats.exactScores || 0) >= 20;
    if (badge.id === "captainClever") return (badgeStats.correctCaptains || 0) >= 10;
    if (badge.id === "captainKing") return (badgeStats.correctCaptains || 0) >= 20;
    return false;
  });

const currentBadgeStats = useMemo(
  () => getPlayerBadgeStats({ player: currentPlayer, userId: currentUserId }),
  [badgeStatsByKey, currentPlayer, currentUserId]
);
const currentEarnedBadges = useMemo(
  () => getEarnedBadges(currentBadgeStats),
  [currentBadgeStats]
);

useEffect(() => {
  if (activeView !== "badges" || !currentUserId || !currentEarnedBadges.length) return;

  const storageKey = String(currentUserId || currentPlayer || "").trim();
  if (!storageKey) return;

  try {
    const saved = JSON.parse(localStorage.getItem(BADGE_SEEN_STORAGE_KEY) || "{}");
    const seenIds = new Set(Array.isArray(saved[storageKey]) ? saved[storageKey] : []);
    const newlyEarned = currentEarnedBadges.filter((badge) => !seenIds.has(badge.id));
    if (!newlyEarned.length) return;

    setBadgeAwardBadges(newlyEarned);
    playBadgeWinSound();
    localStorage.setItem(
      BADGE_SEEN_STORAGE_KEY,
      JSON.stringify({
        ...(saved || {}),
        [storageKey]: Array.from(
          new Set([...seenIds, ...currentEarnedBadges.map((badge) => badge.id)])
        ),
      })
    );
  } catch {
    localStorage.setItem(
      BADGE_SEEN_STORAGE_KEY,
      JSON.stringify({ [storageKey]: currentEarnedBadges.map((badge) => badge.id) })
    );
  }
}, [activeView, currentUserId, currentPlayer, currentEarnedBadges]);

useEffect(() => {
  if (!badgeAwardBadges.length) return;
  const timeoutId = setTimeout(() => setBadgeAwardBadges([]), 3600);
  return () => clearTimeout(timeoutId);
}, [badgeAwardBadges]);

useEffect(() => {
  if (isWorldCupMode || (!currentUserId && !currentPlayer)) return;

  const liveStats = getPlayerBadgeStats({
    player: currentPlayer,
    userId: currentUserId,
  });
  if (!liveStats) return;

  const earnedBadgeIds = getEarnedBadges(liveStats).map((badge) => badge.id);
  const hasCompletedPremierGameweek = activeGameweeks.some((gw) => {
    const fixtures = activeFixtures.filter((fixture) => fixture.gameweek === gw);
    return fixtures.length > 0 && fixtures.every((fixture) => isFixtureCompleted(fixture, results));
  });
  const playedSeason =
    hasCompletedPremierGameweek &&
    ((predictionIqReport.completedPredictions || 0) > 0 || (currentGwPoints || 0) > 0);
  if (!playedSeason) return;

  const seasonLabel = getSeasonLabelFromFixtures(activeFixtures) || "Current season";
  const userKey = String(currentUserId || currentPlayer || "").trim();
  if (!userKey) return;

  const nextRecord = {
    id: `premier-${userKey}-${seasonLabel}`,
    mode: PREMIER_MODE,
    modeLabel: "Premier League",
    seasonLabel,
    player: currentPlayer || liveStats.player || "",
    userId: currentUserId || liveStats.userId || "",
    playedSeason,
    founder: !!liveStats.founder,
    globalWinnerCount: liveStats.globalMedals?.gold || liveStats.globalWinnerCount || 0,
    globalMedals: liveStats.globalMedals || emptyGlobalMedals(),
    coinLeagueWins: liveStats.coinLeagueWins || 0,
    currentWeeklyWinStreak: liveStats.currentWeeklyWinStreak || 0,
    longestWeeklyWinStreak: liveStats.longestWeeklyWinStreak || 0,
    exactScores: liveStats.exactScores || 0,
    correctCaptains: liveStats.correctCaptains || 0,
    earnedBadgeIds,
    updatedAt: new Date().toISOString(),
  };
  const saveSignature = JSON.stringify({
    ...nextRecord,
    updatedAt: "",
    earnedBadgeIds: [...earnedBadgeIds].sort(),
  });
  if (badgeHistorySaveSignatureRef.current === saveSignature) return;
  badgeHistorySaveSignatureRef.current = saveSignature;

  setBadgeHistory((prev) => {
    const current = Array.isArray(prev) ? prev : [];
    const existingIndex = current.findIndex((record) => record?.id === nextRecord.id);
    if (existingIndex === -1) return [nextRecord, ...current];

    const existing = current[existingIndex] || {};
    const merged = {
      ...existing,
      ...nextRecord,
      playedSeason: !!existing.playedSeason || !!nextRecord.playedSeason,
      founder: !!existing.founder || !!nextRecord.founder,
      updatedAt: nextRecord.updatedAt,
    };

    const existingBadgeIds = [...(existing.earnedBadgeIds || [])].sort().join("|");
    const mergedBadgeIds = [...(merged.earnedBadgeIds || [])].sort().join("|");
    const unchanged =
      String(existing.player || "") === String(merged.player || "") &&
      String(existing.userId || "") === String(merged.userId || "") &&
      !!existing.playedSeason === !!merged.playedSeason &&
      !!existing.founder === !!merged.founder &&
      (Number(existing.globalWinnerCount) || 0) === (Number(merged.globalWinnerCount) || 0) &&
      (Number(existing.globalMedals?.gold) || 0) === (Number(merged.globalMedals?.gold) || 0) &&
      (Number(existing.globalMedals?.silver) || 0) === (Number(merged.globalMedals?.silver) || 0) &&
      (Number(existing.globalMedals?.bronze) || 0) === (Number(merged.globalMedals?.bronze) || 0) &&
      (Number(existing.coinLeagueWins) || 0) === (Number(merged.coinLeagueWins) || 0) &&
      (Number(existing.currentWeeklyWinStreak) || 0) ===
        (Number(merged.currentWeeklyWinStreak) || 0) &&
      (Number(existing.longestWeeklyWinStreak) || 0) ===
        (Number(merged.longestWeeklyWinStreak) || 0) &&
      (Number(existing.exactScores) || 0) === (Number(merged.exactScores) || 0) &&
      (Number(existing.correctCaptains) || 0) === (Number(merged.correctCaptains) || 0) &&
      existingBadgeIds === mergedBadgeIds;

    if (unchanged) {
      return current;
    }

    const next = [...current];
    next[existingIndex] = merged;
    return next;
  });

  let cancelled = false;
  (async () => {
    const remoteRecords = await apiSaveBadgeHistoryRecord(nextRecord, authToken);
    if (cancelled || !remoteRecords) return;
    setBadgeHistory((prev) => mergeBadgeHistoryRecords(prev, remoteRecords));
  })();

  return () => {
    cancelled = true;
  };
}, [
  isWorldCupMode,
  currentUserId,
  currentPlayer,
  authToken,
  activeFixtures,
  activeGameweeks,
  results,
  badgeStatsByKey,
  predictionIqReport,
  currentGwPoints,
]);

  // ---------- UI STYLES (redesigned, high contrast, mobile‑first) ----------
 const theme = isWorldCupMode
  ? {
      bg: "#07141f",
      panel: "#0d2231",
      panelHi: "#123247",
      text: "#f8fafc",
      muted: "#b6c6d1",
      accent: "#f59e0b",
      accent2: "#34d399",
      warn: "#f97316",
      danger: "#f87171",
      line: "rgba(255,255,255,0.12)",
      card: "#0d2231",
      border: "rgba(255,255,255,0.12)",
      background: "#07141f",
      button: "#f59e0b",
    }
  : {
      bg: "#0f172a",
      panel: "#111827",
      panelHi: "#0b1220",
      text: "#e5e7eb",
      muted: "#9ca3af",
      accent: "#38bdf8",
      accent2: "#22c55e",
      warn: "#f59e0b",
      danger: "#ef4444",
      line: "rgba(255,255,255,0.08)",
      card: "#111827",
      border: "rgba(255,255,255,0.08)",
      background: "#0f172a",
      button: "#38bdf8",
    };

    const pageStyle = {
    minHeight: "100vh",
    background: isWorldCupMode
      ? "radial-gradient(circle at top, rgba(245,158,11,0.16), transparent 28%), linear-gradient(180deg, #07141f 0%, #081722 40%, #0d2231 100%)"
      : theme.bg,
    color: theme.text,
    fontFamily:
      "system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif",
    padding: "16px 0",        // no left/right gap
    boxSizing: "border-box",
    overflowX: "hidden",      // stop any horizontal scroll / offset
  };

  const cardStyle = {
    background: theme.panel,
    borderRadius: 16,
    padding: isMobile ? 8 : 14,
    border: `1px solid ${theme.line}`,
    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
  };

  const wcMenuTextColor = "#f59e0b";
  const premierModeTextColor = "#38bdf8";

  const pillBtn = (active) => ({
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? theme.accent : theme.line}`,
    background: active
      ? isWorldCupMode
        ? "rgba(212,175,55,0.18)"
        : "rgba(56,189,248,0.15)"
      : theme.panelHi,
    color: isWorldCupMode ? wcMenuTextColor : active ? theme.text : theme.muted,
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
  });

  const getBadgeDisplayValue = (badge, badgeStats = {}) => {
    if (badge.medalType) {
      if (badge.medalType === "gold") {
        return positiveBadgeCount(badgeStats.globalMedals?.gold) || positiveBadgeCount(badgeStats.globalWinnerCount);
      }
      return positiveBadgeCount(badgeStats.globalMedals?.[badge.medalType]);
    }
    if (badge.id === "gambler") {
      return positiveBadgeCount(badgeStats.coinLeagueWins);
    }
    return badge.icon;
  };

  const getBadgeVisual = (badge, earned = false) => {
    if (badge.medalType === "gold") {
      return { border: "#facc15", background: "linear-gradient(180deg, #facc15, #b45309)", color: "#111827" };
    }
    if (badge.medalType === "silver") {
      return { border: "#d1d5db", background: "linear-gradient(180deg, #f8fafc, #9ca3af)", color: "#111827" };
    }
    if (badge.medalType === "bronze") {
      return { border: "#cd7f32", background: "linear-gradient(180deg, #f59e0b, #92400e)", color: "#111827" };
    }
    if (badge.id === "founder") {
      return { border: "#f59e0b", background: earned ? "linear-gradient(180deg, #fbbf24, #b45309)" : theme.panel, color: "#111827" };
    }
    if (badge.id === "sniper") {
      return { border: "#f8fafc", background: earned ? "linear-gradient(180deg, #111827, #64748b)" : theme.panel, color: "#f8fafc" };
    }
    if (badge.id === "superSniper") {
      return { border: "#facc15", background: earned ? "linear-gradient(180deg, #111827, #b45309)" : theme.panel, color: "#facc15" };
    }
    if (badge.id === "captainClever") {
      return { border: "#facc15", background: earned ? "rgba(250,204,21,0.16)" : theme.panel, color: "#facc15" };
    }
    if (badge.id === "gambler") {
      return { border: "#facc15", background: earned ? "rgba(250,204,21,0.16)" : theme.panel, color: "#111827" };
    }
    return {
      border: earned ? theme.accent2 : theme.line,
      background: earned ? "rgba(34,197,94,0.16)" : theme.panel,
      color: theme.text,
    };
  };

  const getBadgeFontSize = (badge, baseSize) => {
    if (badge.id === "founder") return Math.round(baseSize * 1.75);
    if (badge.id === "addict") return Math.round(baseSize * 1.85);
    if (badge.id === "veteran") return Math.round(baseSize * 1.55);
    if (badge.id === "streaker") return Math.round(baseSize * 1.9);
    if (badge.id === "superStreaker") return Math.round(baseSize * 1.9);
    if (badge.id === "sharpShooter") return Math.round(baseSize * 1.9);
    if (badge.id === "sniper" || badge.id === "superSniper") return Math.round(baseSize * 1.9);
    if (badge.id === "captainClever") return Math.round(baseSize * 1.2);
    return baseSize;
  };

  const shouldFillBadgeIcon = (badge) =>
    [
      "founder",
      "addict",
      "veteran",
      "streaker",
      "superStreaker",
      "sharpShooter",
      "sniper",
      "superSniper",
    ].includes(badge.id);

  const renderBadgeIconContent = (badge, badgeStats = {}, size = 24) => {
    if (shouldFillBadgeIcon(badge)) {
      return (
        <span
          aria-hidden="true"
          style={{
            width: size,
            height: size,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: getBadgeFontSize(badge, Math.round(size * 0.64)),
            lineHeight: 1,
            transform: badge.id === "founder" ? "translateY(-1px)" : "none",
          }}
        >
          {badge.icon}
        </span>
      );
    }
    if (badge.image) {
      const count = getBadgeDisplayValue(badge, badgeStats);
      return (
        <span
          style={{
            position: "relative",
            width: size,
            height: size,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <img
            src={badge.image}
            alt=""
            aria-hidden="true"
            style={{ width: "150%", height: "150%", objectFit: "cover" }}
          />
          <span
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#111827",
              fontSize: Math.max(9, Math.round(size * 0.42)),
              fontWeight: 1000,
              lineHeight: 1,
              textShadow: "0 1px 1px rgba(255,255,255,0.45)",
            }}
          >
            {count}
          </span>
        </span>
      );
    }
    return getBadgeDisplayValue(badge, badgeStats);
  };

  const renderBadgeStrip = (row, options = {}) => {
    const compact = !!options.compact;
    const limit = options.limit == null ? 4 : options.limit;
    const wrap = !!options.wrap;
    const columns = options.columns || 0;
    const badgeStats = getPlayerBadgeStats(row);
    const badges = getEarnedBadges(badgeStats).slice(0, limit);
    if (!badges.length) return null;

    return (
      <span
        style={{
          display: columns ? "inline-grid" : "inline-flex",
          alignItems: "center",
          gridTemplateColumns: columns ? `repeat(${columns}, max-content)` : undefined,
          flexWrap: wrap ? "wrap" : "nowrap",
          gap: 4,
          marginLeft: wrap ? 0 : compact ? 4 : 6,
          marginTop: wrap ? 4 : 0,
          verticalAlign: "middle",
          flexShrink: 0,
        }}
      >
        {badges.map((badge) => {
          const visual = getBadgeVisual(badge, true);
          return (
            <span
              key={badge.id}
              title={`${badge.label}: ${badge.requirement}`}
              aria-label={badge.label}
              style={{
                minWidth: compact ? 18 : 20,
                height: compact ? 18 : 20,
                padding: badge.medalType ? "0 4px" : 0,
                borderRadius: 999,
                border: `1px solid ${visual.border}`,
                background: visual.background,
                color: visual.color,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden",
                fontSize: getBadgeFontSize(badge, compact ? 10 : 11),
                fontWeight: 900,
                lineHeight: 1,
                boxShadow:
                  badge.medalType || badge.id === "founder" || badge.id === "sniper" || badge.id === "superSniper"
                    ? "0 0 0 1px rgba(250,204,21,0.2)"
                    : "none",
              }}
            >
              {renderBadgeIconContent(badge, badgeStats, compact ? 15 : 17)}
            </span>
          );
        })}
      </span>
    );
  };

  const renderPredictionIqReport = (options = {}) => {
    const compact = !!options.compact;
    const report = options.report || predictionIqReport;
    const rankText =
      report.rankChange > 0
        ? `+${report.rankChange} ranking places`
        : report.rankChange < 0
        ? `${report.rankChange} ranking places`
        : "No ranking change";
    const ratingColor =
      report.rating >= 80 ? theme.accent2 : report.rating >= 55 ? theme.accent : theme.danger;
    const statItems = [
      { icon: "✅", label: "Exact scores", value: report.exactScores },
      { icon: "🏆", label: "Correct results", value: report.correctResults },
      { icon: "🔥", label: "Win Streak", value: report.currentWinningStreak || 0 },
      { icon: "⭐", label: "Longest Win Streak", value: report.longestWinningStreak || 0 },
      { icon: "📈", label: "Global ranking movement", value: rankText },
    ];
    const detailItems = [
      { label: "Your strongest team", value: report.strongestTeam, color: "#22C55E", teamValue: report.strongestTeam },
      { label: "Your weakest", value: report.weakestTeam, color: "#EF4444", teamValue: report.weakestTeam },
      { label: "Draw accuracy", value: report.drawAccuracy, color: "#38BDF8" },
      { label: "Near misses", value: `${report.closeMisses || 0} one-goal misses`, color: "#F59E0B" },
      { label: "Biggest missed opportunity", value: report.missedOpportunity, color: "#A78BFA" },
    ];
    const captainItems = [
      { label: "Correct captain selection", value: report.captainAccuracy, color: "#22C55E" },
      { label: "Captain points", value: report.captainPoints, color: "#F59E0B" },
      { label: "Most captained team", value: report.mostCaptainedTeam, color: "#38BDF8", teamValue: report.mostCaptainedTeam },
      { label: "Biggest losing team", value: report.biggestCaptainMiss, color: "#EF4444", teamValue: report.biggestCaptainMiss },
    ];
    const styleItems = [
      { label: "Bias detector", value: report.biasDetector, color: "#A78BFA" },
      { label: "Best prediction", value: report.bestPrediction, color: "#22C55E" },
      { label: "Home/Draw/Away accuracy", value: report.resultAccuracyBreakdown, color: "#38BDF8" },
    ];
    const getIqTeamBadge = (value = "") => {
      const text = String(value || "");
      const teams = Array.from(
        new Set(activeFixtures.flatMap((fixture) => [fixture.homeTeam, fixture.awayTeam]))
      ).sort((a, b) => b.length - a.length);
      const team = teams.find((teamName) =>
        text.toLowerCase().includes(String(teamName).toLowerCase())
      );
      return team ? resolveTeamBadge(team) : resolveTeamBadge(text.replace(/\s*[-(].*$/, "").trim());
    };
    const renderIqImpactCard = (item) => {
      const badgeSrc = item.teamValue ? getIqTeamBadge(item.teamValue) : "";
      return (
        <div
          key={item.label}
          style={{
            background: theme.panelHi,
            border: `2px solid ${item.color || theme.line}`,
            borderRadius: 12,
            padding: isMobile || compact ? "14px 12px" : "16px 14px",
            minWidth: 0,
            textAlign: "center",
            display: "grid",
            justifyItems: "center",
            gap: 8,
            boxShadow: "0 8px 18px rgba(0,0,0,0.18)",
          }}
        >
          {badgeSrc && (
            <img
              src={badgeSrc}
              alt=""
              aria-hidden="true"
              style={{
                width: isMobile || compact ? 34 : 42,
                height: isMobile || compact ? 34 : 42,
                objectFit: "contain",
              }}
            />
          )}
          <div
            style={{
              width: 46,
              height: 3,
              borderRadius: 999,
              background: item.color || theme.accent,
            }}
          />
          <div style={{ fontSize: 12, color: item.color || theme.muted, fontWeight: 900 }}>
            {item.label}
          </div>
          <div
            title={item.value}
            style={{
              fontSize: isMobile || compact ? 17 : 20,
              fontWeight: 950,
              color: theme.text,
              lineHeight: 1.18,
              overflowWrap: "anywhere",
            }}
          >
            {item.value}
          </div>
        </div>
      );
    };

    return (
      <div style={{ display: "grid", gap: compact ? 12 : 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile || compact ? "1fr" : "150px minmax(0, 1fr)",
            gap: 12,
            alignItems: "stretch",
          }}
        >
          <div
            style={{
              background: theme.panelHi,
              border: `1px solid ${theme.line}`,
              borderRadius: 12,
              padding: 14,
              textAlign: "center",
              display: "grid",
              alignContent: "center",
              gap: 4,
            }}
          >
            <div style={{ fontSize: 12, color: theme.muted, fontWeight: 800 }}>
              Overall Rating
            </div>
            <div style={{ fontSize: 38, lineHeight: 1, fontWeight: 900, color: ratingColor }}>
              {report.rating}
              <span style={{ fontSize: 18, color: theme.muted }}>/100</span>
            </div>
            <div style={{ fontSize: 11, color: theme.muted }}>
              {getModeGameweekLabel(gameMode, report.gameweek)}
            </div>
          </div>

          <div
            style={{
              background: theme.panelHi,
              border: `1px solid ${theme.line}`,
              borderRadius: 12,
              padding: 14,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ fontSize: 13, color: theme.muted, fontWeight: 800 }}>
              You predicted
            </div>
            <div
              style={{
                display: "grid",
                border: `1px solid ${theme.line}`,
                borderRadius: 10,
                overflow: "hidden",
              }}
            >
              {statItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) auto",
                    gap: 10,
                    alignItems: "center",
                    padding: "8px 10px",
                    borderTop: item === statItems[0] ? "none" : `1px solid ${theme.line}`,
                    fontSize: 13,
                  }}
                >
                  <div
                    style={{
                      minWidth: 0,
                      display: "flex",
                      gap: 7,
                      alignItems: "center",
                      color: theme.muted,
                      fontWeight: 750,
                    }}
                  >
                    <span aria-hidden="true">{item.icon}</span>
                    <span
                      style={{
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.label}
                    </span>
                  </div>
                  <div
                    style={{
                      color: theme.text,
                      fontWeight: 900,
                      textAlign: "right",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.value}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 10,
          }}
        >
          {detailItems.map(renderIqImpactCard)}
        </div>

        <div
          style={{
            background: "linear-gradient(180deg, rgba(245,158,11,0.08), rgba(11,18,32,0.94))",
            border: `2px solid ${theme.warn}`,
            borderRadius: 12,
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 16, color: theme.warn, fontWeight: 900, textAlign: "center" }}>
            Captain analysis
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {captainItems.map(renderIqImpactCard)}
          </div>
        </div>

        <div
          style={{
            background: "linear-gradient(180deg, rgba(56,189,248,0.08), rgba(11,18,32,0.94))",
            border: `2px solid ${theme.accent}`,
            borderRadius: 12,
            padding: 14,
            display: "grid",
            gap: 12,
          }}
        >
          <div style={{ fontSize: 16, color: theme.accent, fontWeight: 900, textAlign: "center" }}>
            Prediction style
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {styleItems.map(renderIqImpactCard)}
          </div>
        </div>

        <div
          style={{
            background: "rgba(56,189,248,0.1)",
            border: `1px solid ${theme.accent}`,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 11, color: theme.muted, fontWeight: 800 }}>
            AI Suggestion
          </div>
          <div style={{ marginTop: 4, fontSize: 14, lineHeight: 1.35, fontWeight: 700 }}>
            {report.suggestion}
          </div>
        </div>

        {!report.completedPredictions && (
          <div style={{ fontSize: 12, color: theme.muted, textAlign: "center" }}>
            This report updates once your completed gameweek predictions have results.
          </div>
        )}
      </div>
    );
  };

  const renderFantasyIqReport = (options = {}) => {
    const compact = !!options.compact;
    const report = options.report || fantasyIqReport;
    const predictionDenominator = Math.max(
      report.submittedPredictions + report.missingPredictions,
      report.submittedPredictions,
      0
    );
    const insightItems = [
      { label: "Average goals", value: `${report.averagePredictedGoals}/game`, color: "#22C55E" },
      { label: "Clean sheets", value: `${report.predictedCleanSheets}/${predictionDenominator || 0}`, color: "#38BDF8" },
      { label: "Draws", value: `${report.predictedDraws}/${predictionDenominator || 0}`, color: "#F59E0B" },
      { label: "Most backed", value: report.mostBacked, color: "#A78BFA", teamValue: report.mostBacked },
    ];
    const getFantasyTeamBadge = (value = "") => {
      const text = String(value || "");
      const teams = Array.from(
        new Set(activeFixtures.flatMap((fixture) => [fixture.homeTeam, fixture.awayTeam]))
      ).sort((a, b) => b.length - a.length);
      const team = teams.find((teamName) =>
        text.toLowerCase().includes(String(teamName).toLowerCase())
      );
      return team ? resolveTeamBadge(team) : resolveTeamBadge(text.replace(/\s*[-(].*$/, "").trim());
    };
    const renderInsightCard = (item) => {
      const badgeSrc = item.teamValue ? getFantasyTeamBadge(item.teamValue) : "";
      return (
        <div
          key={item.label}
          style={{
            background: theme.panelHi,
            border: `2px solid ${item.color || theme.line}`,
            borderRadius: 12,
            padding: isMobile || compact ? "12px 10px" : "14px 12px",
            minWidth: 0,
            display: "grid",
            gap: 8,
            alignContent: "center",
            justifyItems: "center",
            textAlign: "center",
          }}
        >
          {badgeSrc && (
            <img
              src={badgeSrc}
              alt=""
              aria-hidden="true"
              style={{ width: 32, height: 32, objectFit: "contain" }}
            />
          )}
          <div style={{ fontSize: 12, color: item.color || theme.muted, fontWeight: 900 }}>
            {item.label}
          </div>
          <div
            title={item.value}
            style={{
              fontSize: isMobile || compact ? 18 : 22,
              fontWeight: 950,
              color: theme.text,
              lineHeight: 1.1,
              overflowWrap: "anywhere",
            }}
          >
            {item.value}
          </div>
        </div>
      );
    };
    const renderFixtureDifficultyRow = (row) => {
      const badgeSrc = resolveTeamBadge(row.team);
      const teamCode = getTeamCode(row.team, gameMode);
      return (
        <div
          key={row.team}
          style={{
            display: "grid",
            gridTemplateColumns: "34px 44px minmax(0, 1fr)",
            gap: 10,
            alignItems: "center",
            padding: "8px 10px",
            borderTop: `1px solid ${theme.line}`,
          }}
        >
          {badgeSrc ? (
            <img src={badgeSrc} alt="" aria-hidden="true" style={{ width: 28, height: 28, objectFit: "contain" }} />
          ) : (
            <span />
          )}
          <div style={{ color: theme.text, fontWeight: 950, fontSize: 13 }}>
            {teamCode}
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 6,
              minWidth: 0,
            }}
          >
            {(row.upcoming || []).slice(0, 3).map((fixture, index) => {
              const meta = getDifficultyMeta(Number(fixture.difficultyScore || 3));
              const titleParts = [
                `${fixture.venue} v ${fixture.opponentCode || fixture.opponent}`,
                `Win ${Math.round((fixture.winProbability || 0) * 100)}%`,
                `Est goals ${Number(fixture.expectedGoals || 0).toFixed(1)}`,
                `CS ${Math.round((fixture.cleanSheetProbability || 0) * 100)}%`,
                `Atk ${fixture.attackDifficultyScore || "-"}`,
                `Def ${fixture.defenceDifficultyScore || "-"}`,
              ];
              return (
                <div
                  key={`${row.team}-${fixture.fixtureId || index}`}
                  title={titleParts.join(" | ")}
                  style={{
                    background: meta.color,
                    color: Number(fixture.difficultyScore || 3) <= 2 ? "#0b1220" : "#ffffff",
                    borderRadius: 8,
                    padding: "6px 4px",
                    minWidth: 0,
                    textAlign: "center",
                    fontSize: 11,
                    fontWeight: 950,
                    lineHeight: 1.05,
                  }}
                >
                  {fixture.venue} {fixture.opponentCode || getTeamCode(fixture.opponent, gameMode)}
                </div>
              );
            })}
          </div>
        </div>
      );
    };
    const renderFixtureDifficultyPanel = (title, rows, color, emptyText) => (
      <div
        style={{
          background: theme.panelHi,
          border: `2px solid ${color}`,
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div style={{ padding: "10px 12px", color, fontSize: 14, fontWeight: 950 }}>
          {title}
        </div>
        {(rows || []).length ? (
          rows.map(renderFixtureDifficultyRow)
        ) : (
          <div style={{ borderTop: `1px solid ${theme.line}`, padding: 12, color: theme.muted, fontSize: 13 }}>
            {emptyText}
          </div>
        )}
      </div>
    );
    const renderAdviceComparisonRow = (item) => {
      const renderAdviceCell = (modeLabel, value, teams, role, color, borderColor) => {
        const suggestedTeams = (teams || []).filter(Boolean).slice(0, 2);
        return (
          <div
            style={{
              background: color,
              border: `1px solid ${borderColor}`,
              borderRadius: 10,
              padding: "8px 9px",
              minWidth: 0,
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ fontSize: 10, color: theme.muted, fontWeight: 900 }}>{modeLabel}</div>
            <div style={{ fontSize: suggestedTeams.length ? 13 : 15, color: theme.text, fontWeight: 900, overflowWrap: "anywhere" }}>
              {value || "NA"}
            </div>
            {suggestedTeams.length ? (
              <div style={{ display: "grid", gap: 6 }}>
                {suggestedTeams.map((team) => {
                  const badgeSrc = getFantasyTeamBadge(team);
                  const teamCode = getTeamCode(team, gameMode);
                  return (
                    <div
                      key={`${modeLabel}-${value}-${team}`}
                      style={{
                        display: "grid",
                        gridTemplateColumns: badgeSrc ? "24px minmax(0, 1fr)" : "1fr",
                        gap: 8,
                        alignItems: "center",
                        minWidth: 0,
                      }}
                    >
                      {badgeSrc && <img src={badgeSrc} alt="" aria-hidden="true" style={{ width: 24, height: 24, objectFit: "contain" }} />}
                      <div style={{ display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap", minWidth: 0 }}>
                        <span style={{ color: theme.text, fontWeight: 950, fontSize: 15 }}>{teamCode}</span>
                        {role && (
                          <span
                            style={{
                              background: "rgba(255,255,255,0.09)",
                              border: `1px solid ${theme.line}`,
                              borderRadius: 8,
                              padding: "3px 6px",
                              color: theme.muted,
                              fontSize: 10,
                              fontWeight: 950,
                              textTransform: "uppercase",
                            }}
                          >
                            {role}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              role && (
                <div style={{ color: theme.muted, fontSize: 10, fontWeight: 950, textTransform: "uppercase" }}>
                  {role}
                </div>
              )
            )}
          </div>
        );
      };
      return (
        <div
          key={`${item.label}-${item.predictionTeam || item.prediction}-${item.dataTeam || item.data}`}
          style={{
            display: "grid",
            gridTemplateColumns: isMobile || compact ? "1fr" : "120px minmax(0, 1fr) minmax(0, 1fr)",
            gap: 8,
            alignItems: "stretch",
            borderTop: `1px solid ${theme.line}`,
            padding: "9px 10px",
          }}
        >
          <div style={{ color: item.color || theme.muted, fontWeight: 950, fontSize: 13 }}>
            {item.label}
          </div>
          {renderAdviceCell(
            "Based on your predictions",
            item.prediction,
            item.predictionTeams || (item.predictionTeam ? [item.predictionTeam] : []),
            item.predictionRole,
            "rgba(245,158,11,0.08)",
            theme.warn
          )}
          {renderAdviceCell(
            "Based on data",
            item.data,
            item.dataTeams || (item.dataTeam ? [item.dataTeam] : []),
            item.dataRole,
            "rgba(56,189,248,0.08)",
            theme.accent
          )}
        </div>
      );
    };
    const renderFantasyIqSection = (title, subtitle, children, borderColor = theme.line, ref = null) => (
      <div
        ref={ref}
        style={{
          background: theme.panelHi,
          border: `1px solid ${borderColor}`,
          borderRadius: 12,
          padding: 14,
          display: "grid",
          gap: 12,
        }}
      >
        {(title || subtitle) && (
          <div>
            {title && (
              <div style={{ fontSize: 17, color: borderColor, fontWeight: 950 }}>
                {title}
              </div>
            )}
            {subtitle && (
              <div style={{ marginTop: 3, fontSize: 12, color: theme.muted, lineHeight: 1.35 }}>
                {subtitle}
              </div>
            )}
          </div>
        )}
        {children}
      </div>
    );
    const renderFantasyIqMetric = (label, value, color = theme.accent) => (
      <div
        key={label}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${theme.line}`,
          borderRadius: 10,
          padding: "10px 9px",
          display: "grid",
          gap: 5,
          minWidth: 0,
        }}
      >
        <div style={{ fontSize: 11, color, fontWeight: 950 }}>{label}</div>
        <div style={{ fontSize: 15, color: value == null ? theme.muted : theme.text, fontWeight: 900, overflowWrap: "anywhere" }}>
          {value == null ? "Locked" : value}
        </div>
      </div>
    );
    const renderPredictionSignalRow = (item) => (
      <div
        key={item.label}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${theme.line}`,
          borderRadius: 10,
          padding: "9px 10px",
          display: "grid",
          gap: 4,
        }}
      >
        <div style={{ color: item.color || theme.accent, fontSize: 12, fontWeight: 950 }}>
          {item.label}
        </div>
        <div style={{ color: theme.text, fontSize: 15, fontWeight: 950 }}>
          {item.value}
        </div>
        <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
          {item.detail}
        </div>
      </div>
    );
    const renderFantasyIqCategoryDetail = (item) => (
      <div
        key={item.label}
        style={{
          background: "rgba(255,255,255,0.04)",
          border: `1px solid ${theme.line}`,
          borderRadius: 10,
          padding: "9px 10px",
          display: "grid",
          gap: 5,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", gap: 8, alignItems: "center" }}>
          <div style={{ color: item.color || theme.accent, fontSize: 12, fontWeight: 950 }}>
            {item.label}
          </div>
          <div style={{ color: item.value == null ? theme.muted : theme.text, fontSize: 13, fontWeight: 950 }}>
            {formatFantasyIqScore(item.value) || "Locked"}
          </div>
        </div>
        <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
          {item.detail}
        </div>
      </div>
    );
    const renderFantasyIqNotes = (title, rows, color) =>
      (rows || []).length ? (
        <div style={{ display: "grid", gap: 6 }}>
          <div style={{ color, fontSize: 12, fontWeight: 950 }}>{title}</div>
          {(rows || []).slice(0, 3).map((row) => (
            <div
              key={row}
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${theme.line}`,
                borderRadius: 8,
                padding: "8px 9px",
                color: theme.text,
                fontSize: 12,
                lineHeight: 1.35,
              }}
            >
              {row}
            </div>
          ))}
        </div>
      ) : null;
    const preparedReport = report.preparedFantasyIqReport || createEmptyFantasyIqReport();
    const overviewMetrics = [
      { label: "Overall Fantasy IQ", value: formatFantasyIqScore(preparedReport.overallScore) },
      { label: "Fixture Outlook", value: formatFantasyIqScore(preparedReport.categories?.fixtureOutlook) },
      { label: "Attack Outlook", value: formatFantasyIqScore(preparedReport.categories?.attackOutlook) },
      { label: "Defence Outlook", value: formatFantasyIqScore(preparedReport.categories?.defenceOutlook) },
      {
        label: "Budget Used",
        value: preparedReport.budget?.totalCost == null
          ? "Price data pending"
          : `${formatFantasyIqBudget(preparedReport.budget.totalCost)} / ${formatFantasyIqBudget(preparedReport.budget.budgetLimit)}`,
      },
      { label: "Value Efficiency", value: formatFantasyIqScore(preparedReport.budget?.valueEfficiencyScore) },
      { label: "Prediction Alignment", value: formatFantasyIqScore(preparedReport.categories?.predictionAlignment) },
      { label: "Transfer Priority", value: preparedReport.transferPriority },
    ];
    const categoryDetailRows = [
      {
        label: "Fixture Outlook",
        value: preparedReport.categories?.fixtureOutlook,
        detail: "Weighted club and role outlook across the next three Premier League fixtures.",
        color: "#22C55E",
      },
      {
        label: "Attack Outlook",
        value: preparedReport.categories?.attackOutlook,
        detail: "Midfielder and forward suitability from expected goals, two-plus-goal probability and attacking difficulty.",
        color: "#A78BFA",
      },
      {
        label: "Defence Outlook",
        value: preparedReport.categories?.defenceOutlook,
        detail: "Goalkeeper and defender suitability from clean-sheet probability and defensive fixture difficulty.",
        color: "#38BDF8",
      },
      {
        label: "Captaincy Outlook",
        value: preparedReport.categories?.captaincyOutlook,
        detail: "Captain and vice-captain club/position outlook, with submitted predictions included when available.",
        color: "#F59E0B",
      },
      {
        label: "Squad Balance",
        value: preparedReport.categories?.squadBalance,
        detail: "Formation validity, club spread, starter coverage, bench coverage and price-relative squad value.",
        color: "#14B8A6",
      },
      {
        label: "Prediction Alignment",
        value: preparedReport.categories?.predictionAlignment,
        detail: "How your submitted scorelines support or contradict the squad's club and position exposure.",
        color: "#F97316",
      },
      {
        label: "Bench Strength",
        value: preparedReport.categories?.benchStrength,
        detail: "Bench club/position outlook and coverage for rotation decisions.",
        color: "#94A3B8",
      },
    ];
    const squadPlayerCount = Array.isArray(report.squad?.players) ? report.squad.players.length : 0;
    const squadMessages = [
      ...(report.squadValidation?.messages || []),
      ...(report.squadValidation?.warnings || []),
    ];
    const unresolvedSavedPlayerCount = (report.squad?.players || []).filter((player) =>
      ["ambiguous", "unmatched", "legacy"].includes(player.reconciliationStatus)
    ).length;
    const editingSquad = fantasyIqEditingSquad;
    const editingValidation = fantasyIqEditingValidation;
    const editingPlayers = Array.isArray(editingSquad.players) ? editingSquad.players : [];
    const selectedPlayerIds = new Set(editingPlayers.map((player) => player.id));
    const editingPositionCounts = countFantasyIqPlayersByPosition(editingPlayers);
    const editingClubCounts = countFantasyIqPlayersByClub(editingPlayers);
    const fantasyIqAvailablePlayers = Array.isArray(fantasyPlayerData.players) && fantasyPlayerData.players.length
      ? fantasyPlayerData.players
      : FANTASY_IQ_TEMP_PLAYERS;
    const fantasyPlayerDataStatusText =
      fantasyPlayerData.status === "loading"
        ? "Loading player list."
        : fantasyPlayerData.cacheStatus === "live"
        ? `Player list updated ${new Date(fantasyPlayerData.fetchedAt).toLocaleDateString()}.`
        : fantasyPlayerData.cacheStatus === "fresh-cache"
        ? "Using cached player list."
        : fantasyPlayerData.cacheStatus === "stale-cache"
        ? "Using cached player list. Refresh when available."
        : "Current player data could not be refreshed. You can continue using the available cached list.";
    const filteredFantasyIqPlayers = fantasyIqAvailablePlayers
      .filter((player) => !selectedPlayerIds.has(player.id))
      .filter((player) => fantasyIqPositionFilter === "ALL" || player.position === fantasyIqPositionFilter)
      .filter((player) => fantasyIqTeamFilter === "ALL" || player.teamCode === fantasyIqTeamFilter)
      .filter((player) => {
        const search = fantasyIqPlayerSearch.trim().toLowerCase();
        if (!search) return true;
        const normalisedSearch = normaliseFantasyPlayerName(search);
        return (
          normaliseFantasyPlayerName(player.displayName || player.name).includes(normalisedSearch) ||
          normaliseFantasyPlayerName(player.webName).includes(normalisedSearch) ||
          String(player.teamCode || "").toLowerCase().includes(search)
        );
      })
      .slice(0, 18);
    const fantasyIqPlayerSearchActive = !!fantasyIqPlayerSearch.trim();
    const fantasyIqTeamFilterOptions = Array.from(
      new Set(fantasyIqAvailablePlayers.map((player) => player.teamCode))
    ).sort();
    const getFantasyIqPlayerAddBlocker = (player) => {
      if (selectedPlayerIds.has(player.id)) return "Already selected";
      if (editingPlayers.length >= FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.maxSquadSize) return "Squad already has 15 players";
      if ((editingPositionCounts[player.position] || 0) >= FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.positions[player.position]) {
        return `Too many ${player.position}`;
      }
      if ((editingClubCounts[player.teamCode] || 0) >= FANTASY_IQ_EXPECTED_SQUAD_COMPOSITION.maxPlayersPerClub) {
        return "Maximum 3 from this club";
      }
      return "";
    };
    const renderSquadPlayerCard = (player) => {
      const isStarter = player.squadRole === "starter";
      const isCaptain = player.id === editingSquad.captainPlayerId || player.isCaptain;
      const isViceCaptain = player.id === editingSquad.viceCaptainPlayerId || player.isViceCaptain;
      return (
        <div
          key={player.id}
          style={{
            background: "rgba(255,255,255,0.06)",
            border: `1px solid ${isCaptain ? theme.warn : isViceCaptain ? theme.accent : theme.line}`,
            borderRadius: 9,
            padding: "8px 8px",
            display: "grid",
            gap: 6,
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", gap: 6, alignItems: "center", minWidth: 0 }}>
            <span style={{ color: theme.text, fontSize: 12, fontWeight: 950, overflowWrap: "anywhere" }}>
              {player.displayName || player.name || "Unnamed player"}
            </span>
            {isCaptain && <span aria-label="Captain" style={{ color: theme.warn, fontWeight: 950 }}>C</span>}
            {isViceCaptain && <span aria-label="Vice captain" style={{ color: theme.accent, fontWeight: 950 }}>V</span>}
          </div>
          <div style={{ color: theme.muted, fontSize: 10, fontWeight: 850 }}>
            {player.teamCode || "TBC"} · {player.position || "POS"} · {isStarter ? "Starter" : "Bench"}
            {player.availabilityStatus && player.availabilityStatus !== "available" ? ` · ${player.availabilityStatus}` : ""}
            {player.reconciliationStatus && player.reconciliationStatus !== "matched" ? ` · ${player.reconciliationStatus}` : ""}
          </div>
          <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
            <button
              type="button"
              onClick={() => updateFantasyIqEditingSquad((squad) =>
                updateFantasyIqSquadPlayerRole(squad, player.id, isStarter ? "bench" : "starter")
              )}
              style={{ ...pillBtn(false), padding: "4px 7px", fontSize: 10 }}
            >
              {isStarter ? "Bench" : "Start"}
            </button>
            <button
              type="button"
              aria-label={`Make ${player.displayName || player.name} captain`}
              onClick={() => updateFantasyIqEditingSquad((squad) => setFantasyIqCaptain(squad, player.id))}
              style={{ ...pillBtn(isCaptain), padding: "4px 7px", fontSize: 10 }}
            >
              C
            </button>
            <button
              type="button"
              aria-label={`Make ${player.displayName || player.name} vice captain`}
              onClick={() => updateFantasyIqEditingSquad((squad) => setFantasyIqViceCaptain(squad, player.id))}
              style={{ ...pillBtn(isViceCaptain), padding: "4px 7px", fontSize: 10 }}
            >
              V
            </button>
            <button
              type="button"
              onClick={() => updateFantasyIqEditingSquad((squad) => removeFantasyIqSquadPlayer(squad, player.id))}
              style={{ ...pillBtn(false), padding: "4px 7px", fontSize: 10, color: theme.danger }}
            >
              Remove
            </button>
          </div>
        </div>
      );
    };
    const renderSquadPositionRow = (title, position, players) => (
      <div key={title} style={{ display: "grid", gap: 6 }}>
        <div style={{ color: theme.muted, fontSize: 11, fontWeight: 950 }}>{title}</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile || compact ? "1fr" : `repeat(${Math.max(1, Math.min(5, players.length || 1))}, minmax(0, 1fr))`,
            gap: 8,
          }}
        >
          {players.length ? (
            players.map(renderSquadPlayerCard)
          ) : (
            <div style={{ color: theme.muted, fontSize: 12, border: `1px dashed ${theme.line}`, borderRadius: 9, padding: 9 }}>
              Add {position} players
            </div>
          )}
        </div>
      </div>
    );
    const renderFantasyIqSquadBuilder = () => {
      const starters = editingPlayers.filter((player) => player.squadRole === "starter");
      const benchPlayers = editingPlayers.filter((player) => player.squadRole === "bench");
      const starterGroups = FANTASY_IQ_POSITIONS.map((position) => ({
        position,
        title: position === "GK" ? "Goalkeeper" : position === "DEF" ? "Defenders" : position === "MID" ? "Midfielders" : "Forwards",
        players: starters.filter((player) => player.position === position),
      }));
      const summary = editingValidation.summary || {};
      const primaryBlockingErrors = fantasyIqConfirmAttempted ? editingValidation.errors : editingValidation.errors.slice(0, 3);
      const confirmBlockingErrors = editingValidation.errors || [];

      return (
        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              background: "rgba(34,197,94,0.08)",
              border: `1px solid ${theme.accent2}`,
              borderRadius: 10,
              padding: 10,
              display: "grid",
              gap: 6,
            }}
          >
            <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>
              Squad progress: {summary.totalPlayers || 0}/15 · Starters {summary.starters || 0}/11 · Bench {summary.bench || 0}/4
            </div>
            <div style={{ color: theme.muted, fontSize: 11 }}>
              Formation: {summary.formation || "Incomplete"} · GK {summary.positionCounts?.GK || 0}/2 · DEF {summary.positionCounts?.DEF || 0}/5 · MID {summary.positionCounts?.MID || 0}/5 · FWD {summary.positionCounts?.FWD || 0}/3
            </div>
            <div style={{ color: editingValidation.isValid ? theme.accent2 : theme.warn, fontSize: 11, fontWeight: 850 }}>
              {editingValidation.isValid ? "Squad is valid and ready to confirm." : "Draft can be saved while incomplete."}
            </div>
          </div>

          {!!primaryBlockingErrors.length && (
            <div style={{ display: "grid", gap: 4 }} role="alert">
              {primaryBlockingErrors.map((error) => (
                <div key={error} style={{ color: theme.warn, fontSize: 12 }}>
                  {error}
                </div>
              ))}
            </div>
          )}

          <div
            style={{
              background: "linear-gradient(180deg, rgba(34,197,94,0.12), rgba(15,23,42,0.88))",
              border: `1px solid ${theme.line}`,
              borderRadius: 12,
              padding: 12,
              display: "grid",
              gap: 12,
            }}
          >
            {starterGroups.map((group) => renderSquadPositionRow(group.title, group.position, group.players))}
            {renderSquadPositionRow("Bench", "bench", benchPlayers)}
          </div>

          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.line}`,
              borderRadius: 12,
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            <label style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>
              Search player list
              <input
                value={fantasyIqPlayerSearch}
                onChange={(event) => setFantasyIqPlayerSearch(event.target.value)}
                placeholder="Search name or team code"
                style={{ ...probInput, marginTop: 6, textAlign: "left" }}
              />
            </label>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${theme.line}`,
                borderRadius: 9,
                padding: 9,
                display: "grid",
                gridTemplateColumns: isMobile || compact ? "1fr" : "minmax(0, 1fr) auto",
                gap: 8,
                alignItems: "center",
              }}
            >
              <div style={{ color: fantasyPlayerData.cacheStatus === "fallback" ? theme.warn : theme.muted, fontSize: 11, lineHeight: 1.35 }}>
                {fantasyPlayerData.cacheStatus === "fallback"
                  ? fantasyPlayerDataStatusText
                  : `${fantasyPlayerDataStatusText} Player list supplied from current Fantasy Premier League data.`}
              </div>
              <button
                type="button"
                disabled={fantasyPlayerDataRefreshing}
                onClick={() => refreshFantasyPlayerData({ forceRefresh: true })}
                style={{ ...pillBtn(false), padding: "6px 8px", fontSize: 11, cursor: fantasyPlayerDataRefreshing ? "wait" : "pointer" }}
              >
                {fantasyPlayerDataRefreshing ? "Refreshing" : "Refresh"}
              </button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "1fr 1fr", gap: 8 }}>
              <select
                aria-label="Filter by position"
                value={fantasyIqPositionFilter}
                onChange={(event) => setFantasyIqPositionFilter(event.target.value)}
                style={{ ...probInput, padding: "8px 10px", fontSize: 13 }}
              >
                <option value="ALL">All positions</option>
                {FANTASY_IQ_POSITIONS.map((position) => (
                  <option key={position} value={position}>{position}</option>
                ))}
              </select>
              <select
                aria-label="Filter by team"
                value={fantasyIqTeamFilter}
                onChange={(event) => setFantasyIqTeamFilter(event.target.value)}
                style={{ ...probInput, padding: "8px 10px", fontSize: 13 }}
              >
                <option value="ALL">All teams</option>
                {fantasyIqTeamFilterOptions.map((teamCode) => (
                  <option key={teamCode} value={teamCode}>{teamCode}</option>
                ))}
              </select>
            </div>
            {fantasyPlayerData.cacheStatus === "fallback" && (
              <div style={{ color: theme.warn, fontSize: 11, lineHeight: 1.35 }}>
                {FANTASY_IQ_TEMP_PLAYER_DATA_NOTICE}
              </div>
            )}
            <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
              Availability information may change. Check official team news before the deadline.
            </div>
            {fantasyIqPlayerSearchActive ? (
              <div style={{ display: "grid", gap: 6, maxHeight: 310, overflowY: "auto" }}>
                {filteredFantasyIqPlayers.length ? (
                filteredFantasyIqPlayers.map((player) => {
                  const blocker = getFantasyIqPlayerAddBlocker(player);
                  return (
                    <button
                      key={player.id}
                      type="button"
                      disabled={!!blocker}
                      title={blocker || `Add ${player.displayName || player.name}`}
                      onClick={() => updateFantasyIqEditingSquad((squad) => addFantasyIqSquadPlayer(squad, player))}
                      style={{
                        display: "grid",
                        gridTemplateColumns: "minmax(0, 1fr) auto",
                        gap: 8,
                        alignItems: "center",
                        textAlign: "left",
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${blocker ? theme.line : theme.accent}`,
                        background: blocker ? "rgba(255,255,255,0.03)" : "rgba(56,189,248,0.08)",
                        color: blocker ? theme.muted : theme.text,
                        cursor: blocker ? "not-allowed" : "pointer",
                      }}
                    >
                      <span style={{ fontSize: 13, fontWeight: 900, overflowWrap: "anywhere" }}>
                        {player.displayName || player.name}
                      </span>
                      <span style={{ fontSize: 11, fontWeight: 950 }}>
                        {player.teamCode} · {player.position}
                        {player.availabilityStatus && player.availabilityStatus !== "available" ? ` · ${player.availabilityStatus}` : ""}
                        {blocker ? ` · ${blocker}` : ""}
                      </span>
                    </button>
                  );
                })
              ) : (
                  <div style={{ color: theme.muted, fontSize: 12 }}>No players match that search.</div>
                )}
              </div>
            ) : (
              <div style={{ color: theme.muted, fontSize: 12, border: `1px dashed ${theme.line}`, borderRadius: 9, padding: 9 }}>
                Search by player name or team code to add players.
              </div>
            )}
          </div>

          <div
            style={{
              background: editingValidation.isValid ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
              border: `1px solid ${editingValidation.isValid ? theme.accent2 : theme.warn}`,
              borderRadius: 10,
              padding: 10,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ color: editingValidation.isValid ? theme.accent2 : theme.warn, fontSize: 12, fontWeight: 950 }}>
              {editingValidation.isValid ? "Ready to confirm." : "Before confirming:"}
            </div>
            {!editingValidation.isValid && (
              <div style={{ display: "grid", gap: 4 }} role="alert">
                {confirmBlockingErrors.map((error) => (
                  <div key={error} style={{ color: theme.text, fontSize: 12, lineHeight: 1.35 }}>
                    {error}
                  </div>
                ))}
              </div>
            )}
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={handleSaveFantasyIqDraft} style={{ ...pillBtn(false), padding: "8px 10px" }}>
                Save Draft
              </button>
              <button type="button" onClick={handleConfirmFantasyIqSquad} style={{ ...pillBtn(editingValidation.isValid), padding: "8px 10px" }}>
                Confirm Squad
              </button>
              <button type="button" onClick={closeFantasyIqBuilder} style={{ ...pillBtn(false), padding: "8px 10px" }}>
                Close Builder
              </button>
            </div>
          </div>
        </div>
      );
    };
    const fantasyScreenshotReviewSquad = fantasyScreenshotReview
      ? getFantasyScreenshotReviewSquad(fantasyScreenshotReview)
      : createEmptyFantasyIqSquad();
    const fantasyScreenshotReviewValidation = validateFantasyIqSquad(fantasyScreenshotReviewSquad);
    const fantasyScreenshotReviewSummary = fantasyScreenshotReviewValidation.summary || {};
    const fantasyScreenshotConfirmBlockingErrors = fantasyScreenshotReviewValidation.errors || [];
    const fantasyScreenshotConfirmMessages = fantasyScreenshotConfirmBlockingErrors.map((error) => {
      if (/^Captain missing\.$/i.test(error)) return "Please confirm Captain.";
      if (/^Vice-captain missing\.$/i.test(error)) return "Please confirm Vice-Captain.";
      return error;
    });
    const fantasyScreenshotReadySummaryText = fantasyScreenshotReviewValidation.isValid
      ? `15 players confirmed. Formation: ${fantasyScreenshotReviewSummary.formation || "Valid"}. Captain selected. Vice-captain selected. Ready to import.`
      : "";
    const fantasyScreenshotSelectedCount = fantasyScreenshotReview
      ? (fantasyScreenshotReview.extractedSlots || []).filter((slot) => slot.selectedPlayerId).length
      : 0;
    const fantasyScreenshotReviewSlots = fantasyScreenshotReview?.extractedSlots || [];
    const fantasyScreenshotSelectedPlayerIds = new Set(fantasyScreenshotReviewSlots
      .map((slot) => slot.selectedPlayerId)
      .filter(Boolean));
    const fantasyScreenshotValidationFormation = fantasyScreenshotReviewSummary.formation;
    const fantasyScreenshotMetadataFormation = fantasyScreenshotReview?.imageMetadata?.inferredFormation;
    const fantasyScreenshotInferredFormation = inferFantasyScreenshotFormationFromReviewSlots(fantasyScreenshotReviewSlots);
    const fantasyScreenshotReviewDisplayFormation =
      (isFantasyScreenshotFormationLabel(fantasyScreenshotInferredFormation) && fantasyScreenshotInferredFormation) ||
      (isFantasyScreenshotFormationLabel(fantasyScreenshotMetadataFormation) && fantasyScreenshotMetadataFormation) ||
      (isFantasyScreenshotFormationLabel(fantasyScreenshotValidationFormation) && fantasyScreenshotValidationFormation);
    const fantasyScreenshotDisplayReviewLayout = fantasyScreenshotReviewDisplayFormation
      ? getFantasyScreenshotFormationReviewLayout(fantasyScreenshotReviewDisplayFormation)
      : fantasyScreenshotReview?.imageMetadata?.reviewSlotLayout || undefined;
    const fantasyScreenshotReviewDisplaySlots = buildFantasyScreenshotReviewDisplaySlots(
      fantasyScreenshotReviewSlots,
      fantasyScreenshotDisplayReviewLayout
    );
    const fantasyScreenshotAvailabilityRisks = fantasyScreenshotReviewSlots
      .map((slot) => slot.selectedPlayer || fantasyIqAvailablePlayers.find((player) => player.id === slot.selectedPlayerId))
      .filter(hasActionableFantasyAvailabilityRisk);
    const fantasyScreenshotPartialSummaryText = fantasyScreenshotReview && fantasyScreenshotSelectedCount >= 11 && fantasyScreenshotSelectedCount < 15
      ? `Starting XI detected. Add ${15 - fantasyScreenshotSelectedCount} bench players before importing a full Fantasy IQ squad.`
      : "";
    const fantasyIqTeamWorkflowActive = fantasyIqBuilderOpen || fantasyScreenshotImportOpen;
    const fantasyScreenshotReviewIssueCount = fantasyScreenshotReview
      ? fantasyScreenshotReview.unresolvedCount || 0
      : 0;
    const getFantasyTransferPlayerOutlook = (player) => getFantasyIqPlayerOutlook(
      player,
      report.preparedFantasyIqReport?.players?.find((item) => item.id === player?.id)?.clubOutlook ||
        report.fantasyIqClubOutlooks?.[player?.teamCode] ||
        report.preparedFantasyIqReport?.players?.find((item) => item.teamCode === player?.teamCode)?.clubOutlook ||
        {}
    );
    const formatFantasyTransferDelta = (delta) =>
      delta == null ? "NA" : delta > 0 ? `+${delta} Improved` : delta < 0 ? `-${Math.abs(delta)} Reduced` : "0 No change";
    const fantasyTransferCurrentPlayers = Array.isArray(report.squad?.players) ? report.squad.players : [];
    const fantasyTransferOutgoing = fantasyTransferIqState?.outgoingPlayerId
      ? fantasyTransferCurrentPlayers.find((player) => player.id === fantasyTransferIqState.outgoingPlayerId)
      : null;
    const fantasyTransferIncoming = fantasyTransferIqState?.incomingPlayer || null;
    const fantasyTransferOwnedIds = new Set(fantasyTransferCurrentPlayers.map((player) => player.id));
    const fantasyTransferOutClubs = Array.from(new Set(fantasyTransferCurrentPlayers.map((player) => player.teamCode).filter(Boolean))).sort();
    const fantasyTransferInTeams = Array.from(new Set(fantasyIqAvailablePlayers.map((player) => player.teamCode).filter(Boolean))).sort();
    const filteredFantasyTransferOutPlayers = fantasyTransferCurrentPlayers
      .filter((player) => fantasyTransferOutFilter === "ALL" || player.position === fantasyTransferOutFilter)
      .filter((player) => fantasyTransferRoleFilter === "ALL" || player.squadRole === fantasyTransferRoleFilter)
      .filter((player) => fantasyTransferClubFilter === "ALL" || player.teamCode === fantasyTransferClubFilter)
      .sort((a, b) => (a.squadRole === b.squadRole ? 0 : a.squadRole === "starter" ? -1 : 1) || a.position.localeCompare(b.position));
    const filteredFantasyTransferInPlayers = fantasyTransferOutgoing
      ? fantasyIqAvailablePlayers
          .filter((player) => player.active !== false)
          .filter((player) => player.position === fantasyTransferOutgoing.position)
          .filter((player) => !fantasyTransferOwnedIds.has(player.id))
          .filter((player) => fantasyTransferInTeamFilter === "ALL" || player.teamCode === fantasyTransferInTeamFilter)
          .filter((player) => {
            const blocker = getFantasyTransferLegalBlocker({
              currentSquad: report.squad,
              outgoingPlayerId: fantasyTransferOutgoing.id,
              incomingPlayer: player,
            });
            return !blocker;
          })
          .filter((player) => {
            const search = fantasyTransferInSearch.trim().toLowerCase();
            if (!search) return true;
            const normalisedSearch = normaliseFantasyPlayerName(search);
            return (
              normaliseFantasyPlayerName(player.displayName || player.name).includes(normalisedSearch) ||
              normaliseFantasyPlayerName(player.webName).includes(normalisedSearch) ||
              String(player.teamCode || "").toLowerCase().includes(search)
            );
          })
          .slice(0, 20)
      : [];
    const fantasyTransferNeedsCaptain =
      fantasyTransferOutgoing &&
      (fantasyTransferOutgoing.id === report.squad?.captainPlayerId || fantasyTransferOutgoing.isCaptain);
    const fantasyTransferNeedsVice =
      fantasyTransferOutgoing &&
      (fantasyTransferOutgoing.id === report.squad?.viceCaptainPlayerId || fantasyTransferOutgoing.isViceCaptain);
    const fantasyTransferProposedStarters = (fantasyTransferIqState?.proposedSquad?.players || []).filter(
      (player) => player.squadRole === "starter"
    );
    const renderFantasyTransferPlayerCard = (player, label, proposed = false) => {
      const outlook = proposed && fantasyTransferIqState?.proposedReport?.players
        ? fantasyTransferIqState.proposedReport.players.find((item) => item.id === player?.id)
        : report.preparedFantasyIqReport?.players?.find((item) => item.id === player?.id);
      const relevantScore = ["GK", "DEF"].includes(player?.position)
        ? outlook?.fantasyIqDefenceScore
        : outlook?.fantasyIqAttackScore;
      return (
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${theme.line}`,
            borderRadius: 10,
            padding: 10,
            display: "grid",
            gap: 6,
          }}
        >
          <div style={{ color: theme.muted, fontSize: 11, fontWeight: 950 }}>{label}</div>
          <div style={{ color: theme.text, fontSize: 15, fontWeight: 950, overflowWrap: "anywhere" }}>
            {player?.displayName || player?.name || "No player selected"}
          </div>
          {player && (
            <>
              <div style={{ color: theme.muted, fontSize: 11, fontWeight: 850 }}>
                {player.teamCode} · {player.position} · {player.squadRole === "starter" || proposed ? (proposed ? `${fantasyTransferOutgoing?.squadRole === "starter" ? "Starter" : "Bench"} role inherited` : "Starter") : "Bench"}
                {(player.id === report.squad?.captainPlayerId || player.isCaptain) ? " · C" : ""}
                {(player.id === report.squad?.viceCaptainPlayerId || player.isViceCaptain) ? " · V" : ""}
                {player.availabilityStatus && player.availabilityStatus !== "available" ? ` · ${player.availabilityStatus}` : ""}
              </div>
              <div style={{ color: theme.muted, fontSize: 11 }}>
                Five-gameweek outlook {formatFantasyIqScore(outlook?.fantasyIqScore) || "Locked"} · {["GK", "DEF"].includes(player.position) ? "Defence" : "Attack"} {formatFantasyIqScore(relevantScore) || "Locked"}
              </div>
            </>
          )}
        </div>
      );
    };
    const renderFantasyTransferDeltaRow = (row) => (
      <div
        key={row.key}
        style={{
          display: "grid",
          gridTemplateColumns: isMobile || compact ? "1fr" : "minmax(0, 1fr) auto",
          gap: 8,
          alignItems: "center",
          borderTop: `1px solid ${theme.line}`,
          padding: "8px 0",
        }}
      >
        <div style={{ color: theme.text, fontSize: 13, fontWeight: 900 }}>{row.label}</div>
        <div style={{ color: row.delta > 0 ? theme.accent2 : row.delta < 0 ? theme.warn : theme.muted, fontSize: 13, fontWeight: 950 }}>
          {row.current ?? "NA"} → {row.proposed ?? "NA"} · {formatFantasyTransferDelta(row.delta)}
        </div>
      </div>
    );
    const renderFantasyTransferImpactGroup = (title, rows, color) => (
      <div style={{ display: "grid", gap: 6 }}>
        <div style={{ color, fontSize: 12, fontWeight: 950 }}>{title}</div>
        {(rows || []).length ? rows.slice(0, 4).map((row) => (
          <div key={`${title}-${row.key}`} style={{ color: theme.text, fontSize: 12, lineHeight: 1.35 }}>
            {row.label} {row.delta > 0 ? `+${row.delta}` : row.delta < 0 ? `-${Math.abs(row.delta)}` : "0"}
          </div>
        )) : (
          <div style={{ color: theme.muted, fontSize: 12 }}>No meaningful change.</div>
        )}
      </div>
    );
    const renderFantasyTransferRecommendation = (recommendation, index) => {
      const impact = recommendation.impact || {};
      const budget = recommendation.validation?.summary?.budget;
      const riskyIncoming = (recommendation.transfers || [])
        .map((transfer) => transfer.incomingPlayer)
        .find(requiresFantasyTransferAvailabilityAcknowledgement);
      const isApplyPending = fantasyTransferRecommendationApplyId === recommendation.id;
      return (
        <div
          key={recommendation.id}
          style={{
            border: `1px solid ${index === 0 ? theme.accent2 : theme.line}`,
            borderRadius: 10,
            background: index === 0 ? "rgba(34,197,94,0.1)" : "rgba(255,255,255,0.04)",
            padding: 10,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "minmax(0, 1fr) auto", gap: 8, alignItems: "center" }}>
            <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>
              Option {index + 1}: {recommendation.actualCount} transfer{recommendation.actualCount === 1 ? "" : "s"}
            </div>
            <div style={{ color: Number(impact.overallDelta) > 0 ? theme.accent2 : Number(impact.overallDelta) < 0 ? theme.warn : theme.muted, fontSize: 13, fontWeight: 950 }}>
              Fantasy IQ {impact.overall?.current ?? "NA"} → {impact.overall?.proposed ?? "NA"} · {formatFantasyTransferDelta(impact.overallDelta)}
            </div>
          </div>
          <div style={{ display: "grid", gap: 5 }}>
            {(recommendation.transfers || []).map((transfer) => (
              <div key={`${recommendation.id}-${transfer.outgoingPlayerId}-${transfer.incomingPlayerId}`} style={{ color: theme.text, fontSize: 12, lineHeight: 1.35 }}>
                {(transfer.outgoingPlayer?.displayName || transfer.outgoingPlayer?.name || "Player out")} to {(transfer.incomingPlayer?.displayName || transfer.incomingPlayer?.name || "Player in")}
                <span style={{ color: theme.muted }}> · {transfer.incomingPlayer?.teamCode || "TBC"} · {transfer.incomingPlayer?.position || "POS"} · {formatFantasyIqBudget(transfer.incomingPlayer?.price)}</span>
                {transfer.incomingPlayer?.availabilityStatus && transfer.incomingPlayer.availabilityStatus !== "available" ? <span style={{ color: theme.warn }}> · {transfer.incomingPlayer.availabilityStatus}</span> : null}
              </div>
            ))}
          </div>
          <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
            {impact.verdict || "Compared"} · Budget {budget?.totalCost == null ? "NA" : `${formatFantasyIqBudget(budget.totalCost)} used`} · {(impact.recommendationSummary || []).slice(0, 1).join(" ")}
          </div>
          {riskyIncoming && (
            <div style={{ color: theme.warn, fontSize: 11 }}>
              Availability concern: {riskyIncoming.displayName || riskyIncoming.name}. Check official team news before acting.
            </div>
          )}
          <div>
            <button
              type="button"
              disabled={!!riskyIncoming}
              onClick={() => handleApplyFantasyTransferRecommendation(recommendation)}
              style={{ ...pillBtn(!riskyIncoming), padding: "7px 9px", fontSize: 11 }}
            >
              {isApplyPending ? "Confirm Apply Recommendation" : "Apply Recommendation"}
            </button>
          </div>
        </div>
      );
    };
    const formatFantasyLineupScore = (value) => value == null ? "NA" : `${Math.round(Number(value))}`;
    const formatFantasyLineupDelta = (value) =>
      value == null ? "NA" : Number(value) > 0 ? `+${Math.round(Number(value))}` : `${Math.round(Number(value))}`;
    const getFantasyLineupPlayer = (playerId, squad = fantasyLineupIqState?.suggestedSquad) =>
      (squad?.players || []).find((player) => player.id === playerId) || null;
    const renderFantasyLineupPlayerCard = (player, options = {}) => {
      const decision = (fantasyLineupIqState?.playerDecisions || []).find((item) => item.playerId === player?.id);
      const isCaptain = player?.id === options.squad?.captainPlayerId || player?.isCaptain;
      const isVice = player?.id === options.squad?.viceCaptainPlayerId || player?.isViceCaptain;
      const changed = decision && decision.currentRole !== decision.suggestedRole;
      return (
        <div
          key={`${options.prefix || "lineup"}-${player?.id}`}
          style={{
            background: changed ? "rgba(245,158,11,0.1)" : "rgba(255,255,255,0.04)",
            border: `1px solid ${isCaptain ? theme.warn : isVice ? theme.accent : changed ? "#F59E0B" : theme.line}`,
            borderRadius: 8,
            padding: "7px 8px",
            display: "grid",
            gap: 4,
            minWidth: 0,
          }}
        >
          <div style={{ color: theme.text, fontSize: 12, fontWeight: 950, overflowWrap: "anywhere" }}>
            {player?.displayName || player?.name || "Unknown"}
            {isCaptain ? " C" : ""}
            {isVice ? " V" : ""}
          </div>
          <div style={{ color: theme.muted, fontSize: 10, fontWeight: 850 }}>
            {player?.teamCode || "TBC"} · {player?.position || "POS"} · Lineup {formatFantasyLineupScore(decision?.lineupScore)}
          </div>
          <div style={{ color: changed ? theme.warn : theme.muted, fontSize: 10 }}>
            {changed ? (decision.suggestedRole === "starter" ? "Consider starting" : "Consider benching") : "Unchanged"}
            {decision?.closeCall ? " · Close call" : ""}
          </div>
        </div>
      );
    };
    const renderFantasyLineupSquadLayout = (squad, title) => {
      const starters = (squad?.players || []).filter((player) => player.squadRole === "starter");
      const groups = FANTASY_IQ_POSITIONS.map((position) => ({
        position,
        players: starters.filter((player) => player.position === position),
      }));
      return (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>{title}</div>
          <div
            style={{
              background: "linear-gradient(180deg, rgba(20,184,166,0.12), rgba(15,23,42,0.88))",
              border: `1px solid ${theme.line}`,
              borderRadius: 10,
              padding: 10,
              display: "grid",
              gap: 8,
            }}
          >
            {groups.map((group) => (
              <div key={`lineup-row-${group.position}`} style={{ display: "grid", gap: 5 }}>
                <div style={{ color: theme.muted, fontSize: 10, fontWeight: 950 }}>{group.position}</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : `repeat(${Math.max(1, group.players.length)}, minmax(0, 1fr))`, gap: 6 }}>
                  {group.players.map((player) => renderFantasyLineupPlayerCard(player, { squad, prefix: title }))}
                </div>
              </div>
            ))}
          </div>
        </div>
      );
    };
    const renderFantasyPitchPlayerCard = (player, options = {}) => {
      const kit = getFantasyKitStyle(player);
      const compactTile = options.compactTile || isMobile || compact;
      const boxedFixtureCard = !!options.boxedFixtureCard;
      const shirtPatternId = `kit-${kit.teamCode}-${player?.id || player?.displayName || "slot"}`.replace(/[^a-zA-Z0-9_-]/g, "-");
      const kitCode = String(kit.teamCode || "TBC").slice(0, 3).toUpperCase();
      const fullPlayerLabel = player?.webName || player?.displayName || player?.name || "Player";
      const pitchPlayerLabel = boxedFixtureCard ? fullPlayerLabel : formatCompactFantasyPitchName(fullPlayerLabel, compactTile ? 9 : 12);
      const fixturePreview = Array.isArray(player?.suggestedFixtures) ? player.suggestedFixtures : [];
      const nextFixture = player?.suggestedNextFixture || fixturePreview[0] || null;
      const fixtureChips = nextFixture && fixturePreview.length > 1 ? fixturePreview.slice(1, 5) : fixturePreview.slice(0, 4);
      const formatFixtureLabel = (fixture) =>
        fixture?.opponentCode
          ? `${fixture.opponentCode} (${fixture.venue || "-"})`
          : fixture?.opponent
          ? `${getTeamCode(fixture.opponent, gameMode)} (${fixture.venue || "-"})`
          : "";
      const getFplDifficultyMeta = (fixture) => {
        const difficulty = Number(fixture?.officialDifficultyScore ?? fixture?.difficultyScore);
        const source = fixture?.officialDifficultyScore != null ? "Official FPL FDR" : "Model difficulty";
        if (difficulty <= 1) return { difficulty, source, background: "#00FF87", color: "#0B1220" };
        if (difficulty <= 2) return { difficulty, source, background: "#01FC7A", color: "#0B1220" };
        if (difficulty <= 3) return { difficulty, source, background: "#E7E7E7", color: "#111827" };
        if (difficulty <= 4) return { difficulty, source, background: "#FF1751", color: "#FFFFFF" };
        return { difficulty: Number.isFinite(difficulty) ? difficulty : null, source, background: "#861D46", color: "#FFFFFF" };
      };
      return (
        <div
          key={options.key || `fantasy-pitch-player-${player?.id || player?.displayName || player?.name}`}
          style={{
            width: boxedFixtureCard ? "100%" : "auto",
            minWidth: 0,
            maxWidth: "none",
            display: "grid",
            gridTemplateRows: boxedFixtureCard
              ? compactTile
                ? "72px repeat(3, 14px)"
                : "92px repeat(3, 16px)"
              : "none",
            justifyItems: "center",
            gap: boxedFixtureCard ? 0 : 4,
            background: boxedFixtureCard ? "rgba(255,255,255,0.92)" : "transparent",
            border: boxedFixtureCard ? "1px solid rgba(255,255,255,0.78)" : "none",
            borderRadius: boxedFixtureCard ? 8 : 0,
            overflow: boxedFixtureCard ? "hidden" : "visible",
            boxShadow: boxedFixtureCard ? "0 8px 18px rgba(0,0,0,0.26)" : "none",
          }}
        >
          <div
            style={{
              width: boxedFixtureCard ? "100%" : compactTile ? 56 : 70,
              height: boxedFixtureCard ? (compactTile ? 72 : 92) : compactTile ? 66 : 82,
              borderRadius: boxedFixtureCard ? 0 : 10,
              border: boxedFixtureCard ? "none" : `1px solid ${player?.isCaptain ? theme.warn : player?.isViceCaptain ? theme.accent : "rgba(255,255,255,0.35)"}`,
              background: `linear-gradient(180deg, rgba(255,255,255,0.18), ${theme.panelHi})`,
              overflow: "hidden",
              display: "grid",
              placeItems: "center",
              position: "relative",
              minHeight: 0,
              boxShadow: "0 8px 18px rgba(0,0,0,0.22)",
            }}
          >
            <svg
              aria-hidden="true"
              viewBox={boxedFixtureCard ? "4 10 92 100" : "0 0 100 120"}
              style={{ width: "100%", height: "100%", display: "block" }}
            >
              <defs>
                <filter id={`${shirtPatternId}-lift`} x="-20%" y="-18%" width="140%" height="140%">
                  <feDropShadow dx="0" dy="5" stdDeviation="4" floodColor="rgba(0,0,0,0.42)" />
                </filter>
                <linearGradient id={`${shirtPatternId}-shade`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.38)" />
                  <stop offset="24%" stopColor="rgba(255,255,255,0.12)" />
                  <stop offset="70%" stopColor="rgba(0,0,0,0.04)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.3)" />
                </linearGradient>
                <radialGradient id={`${shirtPatternId}-chest`} cx="50%" cy="36%" r="58%">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.24)" />
                  <stop offset="58%" stopColor="rgba(255,255,255,0.04)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.2)" />
                </radialGradient>
                <linearGradient id={`${shirtPatternId}-sideShade`} x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="rgba(0,0,0,0.22)" />
                  <stop offset="18%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="50%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="82%" stopColor="rgba(255,255,255,0.06)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.24)" />
                </linearGradient>
                <linearGradient id={`${shirtPatternId}-bodyDepth`} x1="0" y1="0" x2="1" y2="1">
                  <stop offset="0%" stopColor="rgba(255,255,255,0.22)" />
                  <stop offset="42%" stopColor="rgba(255,255,255,0)" />
                  <stop offset="100%" stopColor="rgba(0,0,0,0.24)" />
                </linearGradient>
                <clipPath id={`${shirtPatternId}-clip`}>
                  <path d="M27 15 C36 21 64 21 73 15 L91 27 L82 52 L73 47 L76 106 L24 106 L27 47 L18 52 L9 27 Z" />
                </clipPath>
              </defs>
              <ellipse cx="50" cy="111" rx="35" ry="6" fill="rgba(0,0,0,0.28)" />
              <g clipPath={`url(#${shirtPatternId}-clip)`} filter={`url(#${shirtPatternId}-lift)`}>
                <rect x="0" y="0" width="100" height="120" fill={kit.primary} />
                {kit.pattern === "stripes" && (
                  <>
                    <rect x="16" y="0" width="14" height="120" fill={kit.secondary} opacity="0.95" />
                    <rect x="44" y="0" width="14" height="120" fill={kit.secondary} opacity="0.95" />
                    <rect x="72" y="0" width="14" height="120" fill={kit.secondary} opacity="0.95" />
                  </>
                )}
                {kit.pattern === "sleeves" && (
                  <>
                    <path d="M9 27 L27 15 L27 47 L18 52 Z" fill={kit.secondary} />
                    <path d="M73 15 L91 27 L82 52 L73 47 Z" fill={kit.secondary} />
                  </>
                )}
                {kit.pattern === "sash" && (
                  <path d="M16 106 L4 92 L84 12 L96 26 Z" fill={kit.secondary} opacity="0.9" />
                )}
                <path d="M26 20 C37 29 63 29 74 20 L72 39 C63 35 37 35 28 39 Z" fill="rgba(255,255,255,0.12)" />
                <path d="M25 43 C31 56 33 79 30 106 L24 106 L27 47 Z" fill="rgba(0,0,0,0.16)" />
                <path d="M75 43 C69 56 67 79 70 106 L76 106 L73 47 Z" fill="rgba(0,0,0,0.18)" />
                <rect x="0" y="0" width="100" height="120" fill={`url(#${shirtPatternId}-chest)`} />
                <rect x="0" y="0" width="100" height="120" fill={`url(#${shirtPatternId}-sideShade)`} />
                <path d="M28 22 C36 29 64 29 72 22 C76 49 76 78 72 104 L28 104 C24 78 24 49 28 22 Z" fill={`url(#${shirtPatternId}-bodyDepth)`} />
                <rect x="0" y="0" width="100" height="120" fill={`url(#${shirtPatternId}-shade)`} />
                <path d="M35 18 C41 27 59 27 65 18 L61 32 C55 29 45 29 39 32 Z" fill="rgba(0,0,0,0.22)" />
                <path d="M37 17 C43 24 57 24 63 17" fill="none" stroke="rgba(255,255,255,0.38)" strokeWidth="3" strokeLinecap="round" />
                <path d="M29 21 C36 30 64 30 71 21" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2" />
                <path d="M28 47 C31 64 31 86 29 105" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" />
                <path d="M72 47 C69 64 69 86 71 105" fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
                <path d="M37 42 C42 50 58 50 63 42" fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="1.5" />
                <path d="M12 30 L18 52 L27 47" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="2" />
                <path d="M88 30 L82 52 L73 47" fill="none" stroke="rgba(255,255,255,0.24)" strokeWidth="2" />
              </g>
              <path d="M27 15 C36 21 64 21 73 15 L91 27 L82 52 L73 47 L76 106 L24 106 L27 47 L18 52 L9 27 Z" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
              <path d="M32 16 C39 28 61 28 68 16" fill="none" stroke="rgba(0,0,0,0.26)" strokeWidth="7" strokeLinecap="round" />
              <path d="M32 16 C39 25 61 25 68 16" fill="none" stroke="rgba(255,255,255,0.34)" strokeWidth="3" strokeLinecap="round" />
              <ellipse cx="50" cy="18" rx="14" ry="8" fill="rgba(15,23,42,0.56)" stroke="rgba(255,255,255,0.34)" strokeWidth="2" />
              <text
                x="50"
                y="66"
                textAnchor="middle"
                dominantBaseline="middle"
                fill={kit.text}
                fontSize={kitCode.length >= 3 ? "20" : "22"}
                fontWeight="900"
                letterSpacing="0"
                textLength="48"
                lengthAdjust="spacingAndGlyphs"
                style={{ paintOrder: "stroke", stroke: "rgba(0,0,0,0.28)", strokeWidth: 2 }}
              >
                {kitCode}
              </text>
            </svg>
          </div>
          <div
            title={player?.displayName || player?.name || fullPlayerLabel}
            style={{
              width: boxedFixtureCard ? "100%" : "auto",
              maxWidth: boxedFixtureCard ? "100%" : compactTile ? 74 : 96,
              boxSizing: "border-box",
              padding: boxedFixtureCard ? "0 4px" : "3px 5px",
              borderRadius: boxedFixtureCard ? 0 : 6,
              background: boxedFixtureCard ? "#3B0441" : "rgba(8,13,28,0.76)",
              color: theme.text,
              fontSize: compactTile ? 9 : 11,
              fontWeight: 950,
              lineHeight: 1,
              textAlign: "center",
              display: boxedFixtureCard ? "grid" : "block",
              placeItems: boxedFixtureCard ? "center" : undefined,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "clip",
            }}
          >
            {pitchPlayerLabel}
            {player?.isCaptain ? " C" : player?.isViceCaptain ? " V" : ""}
          </div>
          {nextFixture && (
            <div
              title={formatFixtureLabel(nextFixture)}
              style={{
                width: boxedFixtureCard ? "100%" : "auto",
                maxWidth: boxedFixtureCard ? "100%" : compactTile ? 82 : 104,
                boxSizing: "border-box",
                color: "#0B1220",
                background: "rgba(255,255,255,0.9)",
                borderRadius: boxedFixtureCard ? 0 : 5,
                padding: boxedFixtureCard ? "0 4px" : "2px 5px",
                fontSize: compactTile ? 9 : 12,
                fontWeight: 950,
                lineHeight: 1,
                textAlign: "center",
                display: boxedFixtureCard ? "grid" : "block",
                placeItems: boxedFixtureCard ? "center" : undefined,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {formatFixtureLabel(nextFixture)}
            </div>
          )}
          {!!fixtureChips.length && (
            <div
              aria-label="Upcoming fixtures"
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${Math.min(4, fixtureChips.length)}, minmax(0, 1fr))`,
                gap: boxedFixtureCard ? 0 : 1,
                width: boxedFixtureCard ? "100%" : compactTile ? 112 : 124,
                boxSizing: "border-box",
                padding: 0,
                background: boxedFixtureCard ? "rgba(255,255,255,0.9)" : "transparent",
              }}
            >
              {fixtureChips.map((fixture, index) => {
                const meta = getFplDifficultyMeta(fixture);
                const label = fixture?.opponentCode || getTeamCode(fixture?.opponent, gameMode) || "TBC";
                return (
                  <div
                    key={`${player?.id || player?.displayName || "player"}-fixture-${fixture.fixtureId || index}`}
                    title={`${label} (${fixture?.venue || "-"}) · ${meta.source}${meta.difficulty == null ? "" : ` ${meta.difficulty}`}`}
                    style={{
                      minWidth: 0,
                      background: meta.background,
                      color: meta.color,
                      borderRadius: boxedFixtureCard ? 1 : 4,
                      padding: 0,
                      fontSize: compactTile ? 6 : 8,
                      fontWeight: 950,
                      lineHeight: 1,
                      textAlign: "center",
                      display: "grid",
                      placeItems: "center",
                      overflow: "hidden",
                      textOverflow: "clip",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {label}
                  </div>
                );
              })}
            </div>
          )}
          {!options.hideMeta && (
            <div style={{ color: theme.muted, fontSize: 9, fontWeight: 850, textAlign: "center" }}>
              {player?.teamCode || "TBC"} · {player?.position || "POS"} · {formatFantasyIqBudget(player?.price)}
            </div>
          )}
        </div>
      );
    };
    const renderFantasyPitchLayout = ({ starters = [], bench = [], title = "Squad", renderPlayer = renderFantasyPitchPlayerCard, fixedCardSlots = 0 }) => {
      const starterGroups = FANTASY_IQ_POSITIONS.map((position) => ({
        position,
        players: (starters || []).filter((player) => player.position === position),
      })).filter((group) => group.players.length);
      const fixedGap = isMobile || compact ? 4 : 8;
      const fixedCardStyle = fixedCardSlots > 0
        ? {
            flex: `0 1 calc((100% - ${fixedGap * (fixedCardSlots - 1)}px) / ${fixedCardSlots})`,
            minWidth: 0,
            maxWidth: `calc((100% - ${fixedGap * (fixedCardSlots - 1)}px) / ${fixedCardSlots})`,
          }
        : null;
      return (
        <div style={{ display: "grid", gap: 10 }}>
          <div style={{ color: theme.text, fontSize: 13, fontWeight: 950, textAlign: "center" }}>{title}</div>
          <div
            style={{
              background: "linear-gradient(180deg, rgba(34,197,94,0.22), rgba(20,83,45,0.38) 45%, rgba(15,23,42,0.92))",
              border: `1px solid ${theme.line}`,
              borderRadius: 10,
              padding: isMobile || compact ? "12px 8px" : "16px 14px",
              display: "grid",
              gap: isMobile || compact ? 12 : 16,
              position: "relative",
              overflow: "hidden",
            }}
          >
            <div aria-hidden="true" style={{ position: "absolute", inset: "8px 10px", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, pointerEvents: "none" }} />
            {starterGroups.map((group) => (
              <div key={`pitch-row-${title}-${group.position}`} style={{ display: "grid", gap: 6, position: "relative" }}>
                <div style={{ color: "rgba(255,255,255,0.68)", fontSize: 10, fontWeight: 950, textAlign: "center" }}>{group.position}</div>
                <div
                  style={{
                    display: fixedCardSlots > 0 ? "flex" : "grid",
                    gridTemplateColumns: fixedCardSlots > 0 ? undefined : `repeat(${Math.max(1, group.players.length)}, minmax(0, 1fr))`,
                    gap: fixedCardSlots > 0 ? fixedGap : isMobile || compact ? 6 : 10,
                    alignItems: "start",
                    justifyContent: fixedCardSlots > 0 ? "space-evenly" : "stretch",
                  }}
                >
                  {group.players.map((player) => (
                    <div key={`pitch-slot-${title}-${group.position}-${player?.id || player?.displayName || player?.name}`} style={fixedCardStyle || undefined}>
                      {renderPlayer(player)}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
          {!!bench.length && (
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ color: theme.text, fontSize: 12, fontWeight: 950 }}>Bench</div>
              <div
                style={{
                  display: fixedCardSlots > 0 ? "flex" : "grid",
                  gridTemplateColumns: fixedCardSlots > 0
                    ? undefined
                    : isMobile || compact
                    ? "repeat(2, minmax(0, 1fr))"
                    : `repeat(${bench.length}, minmax(0, 1fr))`,
                  gap: fixedCardSlots > 0 ? fixedGap : 8,
                  justifyContent: fixedCardSlots > 0 ? "space-evenly" : "stretch",
                }}
              >
                {bench.map((player) => (
                  <div key={`pitch-slot-${title}-bench-${player?.id || player?.displayName || player?.name}`} style={fixedCardStyle || undefined}>
                    {renderPlayer(player, { compactTile: true })}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      );
    };
    const renderFantasySuggestedTeam = () => {
      const suggestion = report.fantasySuggestedTeam;
      const styleControls = (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>Pick your squad style</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {fantasySuggestedTeamStyles.map(([id, label, detail]) => {
              const selected = fantasySuggestedTeamStyle === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFantasySuggestedTeamStyle(id)}
                  style={{
                    border: `1px solid ${selected ? theme.accent2 : theme.line}`,
                    borderRadius: 8,
                    padding: "10px 11px",
                    background: selected ? "rgba(34,197,94,0.14)" : "rgba(255,255,255,0.04)",
                    color: theme.text,
                    cursor: "pointer",
                    textAlign: "left",
                    display: "grid",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 13, fontWeight: 950 }}>{label}</span>
                  <span style={{ color: theme.muted, fontSize: 11, lineHeight: 1.3 }}>{detail}</span>
                </button>
              );
            })}
          </div>
        </div>
      );
      if (!suggestion || suggestion.status === "locked") {
        return (
          <div style={{ display: "grid", gap: 8 }}>
            {styleControls}
            <div style={{ color: theme.warn, fontSize: 13, fontWeight: 850 }}>
              Suggested team is locked until current priced FPL player data and fixture outlooks are available.
            </div>
            {(suggestion?.warnings || []).map((warning) => (
              <div key={warning} style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>{warning}</div>
            ))}
          </div>
        );
      }
      return (
        <div style={{ display: "grid", gap: 12 }}>
          {styleControls}
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 10 }}>
            {renderFantasyIqMetric("Suggested Fantasy IQ", formatFantasyIqScore(suggestion.overallScore), theme.accent2)}
            {renderFantasyIqMetric("Budget Used", `${formatFantasyIqBudget(suggestion.totalCost)} / £100.0m`, theme.accent)}
            {renderFantasyIqMetric("Style / Formation", `${suggestion.styleLabel || "Balanced"} · ${suggestion.formation || "NA"}`, theme.muted)}
            {renderFantasyIqMetric("Captain", suggestion.captain?.displayName || suggestion.captain?.name || "NA", theme.warn)}
          </div>
          {renderFantasyPitchLayout({
            starters: suggestion.starters,
            bench: suggestion.bench,
            title: "Suggested Team",
            fixedCardSlots: 5,
            renderPlayer: (player, options = {}) => (
              <div key={`suggested-team-${player.id}`} style={{ display: "grid", gap: 5, width: "100%", minWidth: 0 }}>
                {renderFantasyPitchPlayerCard(player, { ...options, hideMeta: true, boxedFixtureCard: true })}
              </div>
            ),
          })}
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {renderFantasyIqNotes("Why These Picks", suggestion.reasons, theme.accent2)}
            {renderFantasyIqNotes("Availability / Data", suggestion.warnings, theme.warn)}
            {renderFantasyIqNotes(
              "Club Counts",
              Object.entries(suggestion.clubCounts || {}).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([club, count]) => `${club}: ${count}`),
              theme.accent
            )}
          </div>
          <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
            Suggested Team uses model fixtures, current FPL prices, available FPL form fields and player availability flags. It does not submit transfers or alter your saved squad.
          </div>
        </div>
      );
    };
    const renderFantasyLineupManualControls = () => {
      const editable = fantasyLineupIqState?.editableSquad || fantasyLineupIqState?.suggestedSquad;
      const validation = fantasyLineupIqState?.editableValidation || validateFantasyIqSquad(editable);
      if (!editable) return null;
      const starters = editable.players.filter((player) => player.squadRole === "starter");
      return (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ color: validation.isValid ? theme.accent2 : theme.warn, fontSize: 12, fontWeight: 850 }}>
            {validation.isValid ? `Manual lineup is valid. Formation ${validation.summary?.formation || editable.formation || "valid"}.` : validation.errors.slice(0, 2).join(" ")}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {(editable.players || []).map((player) => {
              const isStarter = player.squadRole === "starter";
              return (
                <div key={`manual-lineup-${player.id}`} style={{ border: `1px solid ${theme.line}`, borderRadius: 8, padding: 8, display: "grid", gap: 6 }}>
                  <div style={{ color: theme.text, fontSize: 12, fontWeight: 950, overflowWrap: "anywhere" }}>
                    {player.displayName || player.name}
                  </div>
                  <div style={{ color: theme.muted, fontSize: 10 }}>{player.teamCode} · {player.position}</div>
                  <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                    <button type="button" onClick={() => setFantasyLineupPlayerRole(player.id, isStarter ? "bench" : "starter")} style={{ ...pillBtn(isStarter), padding: "4px 7px", fontSize: 10 }}>
                      {isStarter ? "Starter" : "Bench"}
                    </button>
                    <button type="button" disabled={!isStarter} onClick={() => setFantasyLineupCaptain("captain", player.id)} style={{ ...pillBtn(player.id === editable.captainPlayerId), padding: "4px 7px", fontSize: 10 }}>
                      C
                    </button>
                    <button type="button" disabled={!isStarter} onClick={() => setFantasyLineupCaptain("vice", player.id)} style={{ ...pillBtn(player.id === editable.viceCaptainPlayerId), padding: "4px 7px", fontSize: 10 }}>
                      V
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div style={{ color: theme.muted, fontSize: 11 }}>
            Starters {starters.length}/11. Manual changes are validated before saving.
          </div>
        </div>
      );
    };
    const renderFantasyLineupIq = () => {
      const analysis = fantasyLineupIqState;
      const currentCaptain = getFantasyLineupPlayer(analysis?.currentCaptainId, analysis?.currentSquad);
      const suggestedCaptain = getFantasyLineupPlayer(analysis?.suggestedCaptainId, analysis?.suggestedSquad);
      const currentVice = getFantasyLineupPlayer(analysis?.currentViceCaptainId, analysis?.currentSquad);
      const suggestedVice = getFantasyLineupPlayer(analysis?.suggestedViceCaptainId, analysis?.suggestedSquad);
      const movedToStart = (analysis?.playerDecisions || []).filter((decision) => decision.currentRole === "bench" && decision.suggestedRole === "starter");
      const movedToBench = (analysis?.playerDecisions || []).filter((decision) => decision.currentRole === "starter" && decision.suggestedRole === "bench");
      return (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
            Lineup IQ compares your current starting XI with fixture-based lineups from your existing squad. It does not make changes to your official Fantasy Premier League team.
          </div>
          {!report.squad?.confirmed ? (
            <div style={{ color: theme.warn, fontSize: 13, fontWeight: 850 }}>
              Confirm your fantasy squad before analysing your lineup.
            </div>
          ) : !analysis || analysis.status === "applied" ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
                Compare your current starting XI with the strongest fixture-based lineup from your existing squad.
              </div>
              <button type="button" onClick={analyseFantasyLineupIq} style={{ ...pillBtn(true), padding: "8px 10px", fontSize: 12 }}>
                Analyse My Lineup
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ background: "rgba(20,184,166,0.1)", border: `1px solid #14B8A6`, borderRadius: 10, padding: 12, display: "grid", gap: 6, textAlign: "center" }}>
                <div style={{ color: theme.muted, fontSize: 11, fontWeight: 950 }}>Lineup IQ</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  <div><div style={{ color: theme.muted, fontSize: 11 }}>Current</div><div style={{ color: theme.text, fontSize: 22, fontWeight: 950 }}>{formatFantasyLineupScore(analysis.currentLineupScore)}</div></div>
                  <div><div style={{ color: theme.muted, fontSize: 11 }}>Suggested</div><div style={{ color: theme.text, fontSize: 22, fontWeight: 950 }}>{formatFantasyLineupScore(analysis.suggestedLineupScore)}</div></div>
                  <div><div style={{ color: theme.muted, fontSize: 11 }}>Potential improvement</div><div style={{ color: Number(analysis.improvement) > 0 ? theme.accent2 : theme.muted, fontSize: 22, fontWeight: 950 }}>{formatFantasyLineupDelta(analysis.improvement)}</div></div>
                </div>
                <div style={{ color: theme.text, fontSize: 14, fontWeight: 950 }}>{analysis.verdict}</div>
                <div style={{ color: theme.muted, fontSize: 12 }}>Model confidence: {analysis.confidence?.confidence || "NA"} ({formatFantasyLineupScore(analysis.confidence?.confidenceScore)})</div>
              </div>

              <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>
                Formation: {analysis.currentFormation || "NA"} → {analysis.suggestedFormation || "NA"}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ color: theme.accent2, fontSize: 12, fontWeight: 950 }}>Consider Starting</div>
                  {movedToStart.length ? movedToStart.map((decision) => <div key={`start-${decision.playerId}`} style={{ color: theme.text, fontSize: 12 }}>{decision.player.displayName || decision.player.name}: {decision.reason}</div>) : <div style={{ color: theme.muted, fontSize: 12 }}>No starter changes suggested.</div>}
                </div>
                <div style={{ display: "grid", gap: 6 }}>
                  <div style={{ color: theme.warn, fontSize: 12, fontWeight: 950 }}>Consider Benching</div>
                  {movedToBench.length ? movedToBench.map((decision) => <div key={`bench-${decision.playerId}`} style={{ color: theme.text, fontSize: 12 }}>{decision.player.displayName || decision.player.name}: {decision.reason}</div>) : <div style={{ color: theme.muted, fontSize: 12 }}>No bench changes suggested.</div>}
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <div style={{ color: theme.text, fontSize: 12 }}>
                  Captain: {currentCaptain?.displayName || currentCaptain?.name || "NA"} → {suggestedCaptain?.displayName || suggestedCaptain?.name || "NA"}
                  <div style={{ color: theme.muted, marginTop: 4 }}>{analysis.captain?.reasons?.[0] || "Captain and vice-captain suggestions are fixture-based, not guarantees."}</div>
                </div>
                <div style={{ color: theme.text, fontSize: 12 }}>
                  Vice-captain: {currentVice?.displayName || currentVice?.name || "NA"} → {suggestedVice?.displayName || suggestedVice?.name || "NA"}
                  <div style={{ color: theme.muted, marginTop: 4 }}>Vice-captain must be a different starter.</div>
                </div>
              </div>

              {renderFantasyLineupSquadLayout(analysis.suggestedSquad, "Suggested XI")}

              <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                <div style={{ display: "grid", gap: 5 }}>
                  <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>Bench Order</div>
                  {(analysis.benchOrder?.outfield || []).map((player, index) => (
                    <div key={`bench-order-${player.id}`} style={{ color: theme.text, fontSize: 12 }}>{index + 1}. {player.displayName || player.name} ({player.teamCode})</div>
                  ))}
                  <div style={{ color: theme.muted, fontSize: 12 }}>Goalkeeper bench: {analysis.benchOrder?.goalkeeper?.displayName || analysis.benchOrder?.goalkeeper?.name || "NA"}</div>
                  <div style={{ color: theme.muted, fontSize: 11 }}>Substitutes cannot create an invalid formation: at least 3 DEF, 2 MID and 1 FWD must remain.</div>
                </div>
                <div style={{ display: "grid", gap: 5 }}>
                  <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>Alternative Lineups</div>
                  {(analysis.alternatives || []).length ? analysis.alternatives.map((item) => (
                    <div key={`lineup-alt-${item.formation}-${item.idOrder}`} style={{ color: theme.text, fontSize: 12 }}>
                      {item.label}: {item.formation} — {formatFantasyLineupScore(item.lineupScore)}
                    </div>
                  )) : <div style={{ color: theme.muted, fontSize: 12 }}>No close alternative lineups found.</div>}
                  {analysis.minimalChange && (
                    <div style={{ color: theme.muted, fontSize: 12 }}>
                      Minimal-change option: {analysis.minimalChange.swaps} swap{analysis.minimalChange.swaps === 1 ? "" : "s"} for {formatFantasyLineupDelta(analysis.minimalChange.improvement)} Lineup IQ.
                    </div>
                  )}
                </div>
              </div>

              {!!analysis.warnings?.length && (
                <div style={{ display: "grid", gap: 4 }}>
                  {analysis.warnings.slice(0, 4).map((warning) => <div key={warning} style={{ color: warning.includes("Close call") ? theme.warn : theme.muted, fontSize: 11 }}>{warning}</div>)}
                </div>
              )}

              {fantasyLineupManualMode && renderFantasyLineupManualControls()}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" onClick={() => handleApplyFantasyLineup("suggested")} style={{ ...pillBtn(true), padding: "8px 10px", fontSize: 12 }}>
                  {fantasyLineupApplyMode === "suggested" ? "Confirm Apply Suggested Lineup" : "Apply Suggested Lineup"}
                </button>
                <button type="button" onClick={() => handleApplyFantasyLineup("minimal")} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
                  {fantasyLineupApplyMode === "minimal" ? "Confirm Apply Minimal-Change Lineup" : "Apply Minimal-Change Lineup"}
                </button>
                <button type="button" onClick={() => { setFantasyLineupIqState(null); setFantasyLineupApplyMode(null); setFantasyIqSquadStatus("Current lineup kept."); }} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
                  Keep Current Lineup
                </button>
                <button type="button" onClick={() => setFantasyLineupManualMode((value) => !value)} style={{ ...pillBtn(fantasyLineupManualMode), padding: "8px 10px", fontSize: 12 }}>
                  Edit Suggested Lineup
                </button>
                {fantasyLineupManualMode && (
                  <button type="button" onClick={() => handleApplyFantasyLineup("manual")} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
                    {fantasyLineupApplyMode === "manual" ? "Confirm Apply Manual Lineup" : "Apply Manual Lineup"}
                  </button>
                )}
              </div>

              {process.env.NODE_ENV === "development" && (
                <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
                  Debug: legal {analysis.diagnostics?.evaluatedLegalLineupCount || 0} · current {analysis.diagnostics?.currentLineupScore ?? "NA"} · best {analysis.diagnostics?.bestLineupScore ?? "NA"} · minimal {analysis.diagnostics?.minimalChangeScore ?? "NA"} · threshold {analysis.diagnostics?.closeDecisionThreshold} · version {FANTASY_LINEUP_IQ_VERSION}
                </div>
              )}
            </div>
          )}
        </div>
      );
    };
    const renderFantasyTransferIq = () => {
      const comparison = fantasyTransferIqState;
      const impact = comparison?.impact;
      const availabilityWarning = requiresFantasyTransferAvailabilityAcknowledgement(fantasyTransferIncoming);
      const canApply = comparison?.status === "compared" && comparison.validation?.isValid && (!availabilityWarning || comparison.availabilityAcknowledged);
      return (
        <div style={{ display: "grid", gap: 12 }}>
          <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
            Transfer IQ compares your squad inside Prediction Addiction. It does not make changes to your official Fantasy Premier League team.
          </div>
          {!report.squad?.confirmed ? (
            <div style={{ color: theme.warn, fontSize: 13, fontWeight: 850 }}>
              Confirm your fantasy squad before comparing transfers.
            </div>
          ) : !comparison ? (
            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
                Generate legal transfer suggestions for the next five gameweeks, or compare one specific transfer yourself.
              </div>
              <div
                style={{
                  border: `1px solid ${theme.line}`,
                  borderRadius: 10,
                  background: "rgba(255,255,255,0.04)",
                  padding: 10,
                  display: "grid",
                  gap: 10,
                }}
              >
                <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>Transfer suggestions</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "minmax(0, 1fr) auto", gap: 8 }}>
                  <select
                    aria-label="Number of transfer suggestions"
                    value={fantasyTransferRecommendationCount}
                    onChange={(event) => {
                      setFantasyTransferRecommendationCount(event.target.value);
                      setFantasyTransferRecommendations(null);
                      setFantasyTransferRecommendationApplyId("");
                    }}
                    style={{ ...probInput, padding: "8px 10px", fontSize: 12 }}
                  >
                    {FANTASY_TRANSFER_RECOMMENDATION_COUNTS.map((count) => (
                      <option key={`transfer-count-${count}`} value={count}>
                        {count === "ALL" ? "All (Wildcard / Free Hit)" : `${count} transfer${count === "1" ? "" : "s"}`}
                      </option>
                    ))}
                  </select>
                  <button type="button" onClick={generateFantasyTransferRecommendations} style={{ ...pillBtn(true), padding: "8px 10px", fontSize: 12 }}>
                    Suggest Transfers
                  </button>
                </div>
                <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
                  Suggestions respect budget, position structure and the three-players-per-club limit, using fixtures, form, availability and playing-time data.
                </div>
                {fantasyTransferRecommendations?.warnings?.length ? (
                  <div style={{ color: theme.warn, fontSize: 12 }}>
                    {fantasyTransferRecommendations.warnings[0]}
                  </div>
                ) : null}
                {fantasyTransferRecommendations?.recommendations?.length ? (
                  <div style={{ display: "grid", gap: 8 }}>
                    {fantasyTransferRecommendations.recommendations.map(renderFantasyTransferRecommendation)}
                  </div>
                ) : null}
              </div>
              <button type="button" onClick={openFantasyTransferIq} style={{ ...pillBtn(true), padding: "8px 10px", fontSize: 12 }}>
                Compare a Transfer
              </button>
            </div>
          ) : (
            <div style={{ display: "grid", gap: 12 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["selecting-out", "selecting-in", "ready", "compared"].map((step, index) => (
                  <span key={step} style={{ ...pillBtn(comparison.status === step || (comparison.status === "compared" && step === "compared")), padding: "5px 7px", fontSize: 10 }}>
                    {index + 1}. {step === "selecting-out" ? "Player out" : step === "selecting-in" ? "Player in" : step === "ready" ? "Captaincy" : "Impact"}
                  </span>
                ))}
              </div>

              <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                <select aria-label="Transfer out position filter" value={fantasyTransferOutFilter} onChange={(event) => setFantasyTransferOutFilter(event.target.value)} style={{ ...probInput, padding: "8px 10px", fontSize: 12 }}>
                  <option value="ALL">All positions</option>
                  {FANTASY_IQ_POSITIONS.map((position) => <option key={`out-${position}`} value={position}>{position}</option>)}
                </select>
                <select aria-label="Transfer out starter filter" value={fantasyTransferRoleFilter} onChange={(event) => setFantasyTransferRoleFilter(event.target.value)} style={{ ...probInput, padding: "8px 10px", fontSize: 12 }}>
                  <option value="ALL">Starter and bench</option>
                  <option value="starter">Starters</option>
                  <option value="bench">Bench</option>
                </select>
                <select aria-label="Transfer out club filter" value={fantasyTransferClubFilter} onChange={(event) => setFantasyTransferClubFilter(event.target.value)} style={{ ...probInput, padding: "8px 10px", fontSize: 12 }}>
                  <option value="ALL">All clubs</option>
                  {fantasyTransferOutClubs.map((teamCode) => <option key={`out-club-${teamCode}`} value={teamCode}>{teamCode}</option>)}
                </select>
              </div>

              <div style={{ display: "grid", gap: 8 }}>
                <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>Choose a player to compare.</div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  {filteredFantasyTransferOutPlayers.map((player) => {
                    const outlook = getFantasyTransferPlayerOutlook(player);
                    const selected = comparison.outgoingPlayerId === player.id;
                    return (
                      <button
                        key={`transfer-out-${player.id}`}
                        type="button"
                        onClick={() => selectFantasyTransferOutgoingPlayer(player.id)}
                        style={{
                          textAlign: "left",
                          border: `1px solid ${selected ? theme.accent2 : theme.line}`,
                          borderRadius: 8,
                          background: selected ? "rgba(34,197,94,0.12)" : "rgba(255,255,255,0.04)",
                          color: theme.text,
                          padding: "8px 9px",
                          display: "grid",
                          gap: 4,
                          cursor: "pointer",
                        }}
                      >
                        <span style={{ fontSize: 13, fontWeight: 950, overflowWrap: "anywhere" }}>{player.displayName || player.name}</span>
                        <span style={{ fontSize: 10, color: theme.muted, fontWeight: 850 }}>
                          {player.teamCode} · {player.position} · {player.squadRole === "starter" ? "Starter" : "Bench"}
                          {(player.id === report.squad?.captainPlayerId || player.isCaptain) ? " · C" : ""}
                          {(player.id === report.squad?.viceCaptainPlayerId || player.isViceCaptain) ? " · V" : ""}
                        </span>
                        <span style={{ fontSize: 10, color: theme.muted }}>
                          Outlook {formatFantasyIqScore(outlook.score) || "Locked"}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {fantasyTransferOutgoing && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>
                    Choose a {fantasyTransferOutgoing.position} replacement.
                  </div>
                  <div style={{ color: theme.muted, fontSize: 11 }}>
                    Check official team news before confirming any transfer.
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "minmax(0, 1fr) 160px", gap: 8 }}>
                    <input value={fantasyTransferInSearch} onChange={(event) => setFantasyTransferInSearch(event.target.value)} placeholder="Search name or club" style={{ ...probInput, textAlign: "left", padding: "8px 10px", fontSize: 12 }} />
                    <select aria-label="Transfer in team filter" value={fantasyTransferInTeamFilter} onChange={(event) => setFantasyTransferInTeamFilter(event.target.value)} style={{ ...probInput, padding: "8px 10px", fontSize: 12 }}>
                      <option value="ALL">All teams</option>
                      {fantasyTransferInTeams.map((teamCode) => <option key={`transfer-in-team-${teamCode}`} value={teamCode}>{teamCode}</option>)}
                    </select>
                  </div>
                  <div style={{ display: "grid", gap: 6, maxHeight: 260, overflowY: "auto" }}>
                    {filteredFantasyTransferInPlayers.length ? filteredFantasyTransferInPlayers.map((player) => {
                      const selected = fantasyTransferIncoming?.id === player.id;
                      const outlook = getFantasyIqPlayerOutlook(player, report.fantasyIqClubOutlooks?.[player.teamCode] || {});
                      const relevant = ["GK", "DEF"].includes(player.position) ? outlook.defenceScore : outlook.attackScore;
                      return (
                        <button
                          key={`transfer-in-${player.id}`}
                          type="button"
                          onClick={() => selectFantasyTransferIncomingPlayer(player)}
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile || compact ? "1fr" : "minmax(0, 1fr) auto",
                            gap: 8,
                            alignItems: "center",
                            textAlign: "left",
                            border: `1px solid ${selected ? theme.accent2 : theme.accent}`,
                            borderRadius: 8,
                            background: selected ? "rgba(34,197,94,0.12)" : "rgba(56,189,248,0.08)",
                            color: theme.text,
                            padding: "8px 10px",
                            cursor: "pointer",
                          }}
                        >
                          <span style={{ fontSize: 13, fontWeight: 950, overflowWrap: "anywhere" }}>{player.displayName || player.name}</span>
                          <span style={{ fontSize: 11, fontWeight: 950 }}>
                            {player.teamCode} · {player.position} · Outlook {formatFantasyIqScore(outlook.score) || "Locked"} · {["GK", "DEF"].includes(player.position) ? "Def" : "Atk"} {formatFantasyIqScore(relevant) || "Locked"}
                            {player.availabilityStatus && player.availabilityStatus !== "available" ? ` · ${player.availabilityStatus}` : ""}
                          </span>
                        </button>
                      );
                    }) : (
                      <div style={{ color: theme.muted, fontSize: 12 }}>No legal replacements match those filters.</div>
                    )}
                  </div>
                </div>
              )}

              {fantasyTransferIncoming && (fantasyTransferNeedsCaptain || fantasyTransferNeedsVice) && (
                <div style={{ display: "grid", gap: 8 }}>
                  <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>Hypothetical captaincy</div>
                  <div style={{ color: theme.muted, fontSize: 11 }}>The incoming player is not assigned captaincy automatically.</div>
                  {fantasyTransferNeedsCaptain && (
                    <select aria-label="Replacement captain" value={comparison.proposedSquad?.captainPlayerId || ""} onChange={(event) => setFantasyTransferReplacementCaptain("captain", event.target.value)} style={{ ...probInput, padding: "8px 10px", fontSize: 12 }}>
                      <option value="">Choose replacement captain</option>
                      {fantasyTransferProposedStarters.map((player) => <option key={`cap-${player.id}`} value={player.id}>{player.displayName || player.name} ({player.teamCode})</option>)}
                    </select>
                  )}
                  {fantasyTransferNeedsVice && (
                    <select aria-label="Replacement vice-captain" value={comparison.proposedSquad?.viceCaptainPlayerId || ""} onChange={(event) => setFantasyTransferReplacementCaptain("vice", event.target.value)} style={{ ...probInput, padding: "8px 10px", fontSize: 12 }}>
                      <option value="">Choose replacement vice-captain</option>
                      {fantasyTransferProposedStarters.map((player) => <option key={`vice-${player.id}`} value={player.id}>{player.displayName || player.name} ({player.teamCode})</option>)}
                    </select>
                  )}
                </div>
              )}

              {!!comparison.validation?.errors?.length && (
                <div style={{ display: "grid", gap: 4 }} role="alert">
                  {comparison.validation.errors.slice(0, 3).map((error) => <div key={error} style={{ color: theme.warn, fontSize: 12 }}>{error}</div>)}
                </div>
              )}

              {impact && (
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    {renderFantasyTransferPlayerCard(fantasyTransferOutgoing, "Player Out")}
                    {renderFantasyTransferPlayerCard(fantasyTransferIncoming, "Player In", true)}
                  </div>
                  <div style={{ background: "rgba(34,197,94,0.08)", border: `1px solid ${theme.accent2}`, borderRadius: 10, padding: 12, display: "grid", gap: 6, textAlign: "center" }}>
                    <div style={{ color: theme.muted, fontSize: 11, fontWeight: 950 }}>Fantasy IQ</div>
                    <div style={{ color: theme.text, fontSize: 24, fontWeight: 950 }}>
                      {impact.overall.current ?? "NA"} → {impact.overall.proposed ?? "NA"}
                    </div>
                    <div style={{ color: impact.overallDelta > 0 ? theme.accent2 : impact.overallDelta < 0 ? theme.warn : theme.muted, fontSize: 18, fontWeight: 950 }}>
                      {formatFantasyTransferDelta(impact.overallDelta)}
                    </div>
                    <div style={{ color: theme.text, fontSize: 14, fontWeight: 950 }}>{impact.verdict}</div>
                    <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
                      {(impact.recommendationSummary || []).slice(0, 1).join(" ")}
                    </div>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
                    {renderFantasyTransferImpactGroup("What improves", impact.improves, theme.accent2)}
                    {renderFantasyTransferImpactGroup("What weakens", impact.weakens, theme.warn)}
                    {renderFantasyTransferImpactGroup("No meaningful change", impact.unchanged, theme.muted)}
                  </div>
                  <div>
                    {(fantasyTransferShowAllCategories ? impact.sortedCategoryImpacts : impact.sortedCategoryImpacts.filter((row) => row.delta !== 0).slice(0, 5)).map(renderFantasyTransferDeltaRow)}
                    <button type="button" onClick={() => setFantasyTransferShowAllCategories((value) => !value)} style={{ ...pillBtn(false), marginTop: 6, padding: "6px 8px", fontSize: 11 }}>
                      {fantasyTransferShowAllCategories ? "Hide unchanged categories" : "Show all categories"}
                    </button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                    {renderFantasyIqNotes("Positive effects", impact.strengthsAdded, theme.accent2)}
                    {renderFantasyIqNotes("Trade-offs", impact.concernsAdded, theme.warn)}
                  </div>
                  <div style={{ color: theme.muted, fontSize: 12 }}>
                    Model confidence: {impact.confidenceDelta.changed ? `${impact.confidenceDelta.current || "NA"} → ${impact.confidenceDelta.proposed || "NA"}` : `Confidence remains ${impact.confidenceDelta.current || "NA"}.`}
                  </div>
                  {availabilityWarning && (
                    <label style={{ display: "flex", gap: 8, alignItems: "flex-start", color: theme.warn, fontSize: 12, lineHeight: 1.35 }}>
                      <input type="checkbox" checked={!!comparison.availabilityAcknowledged} onChange={(event) => acknowledgeFantasyTransferAvailability(event.target.checked)} />
                      Current player-data status suggests this player may have an availability concern. Check official team news.
                    </label>
                  )}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button type="button" disabled={!canApply} onClick={handleApplyFantasyTransfer} style={{ ...pillBtn(canApply), padding: "8px 10px", fontSize: 12 }}>
                  {fantasyTransferApplyPending ? "Confirm Apply to Fantasy IQ squad" : "Apply to Fantasy IQ squad"}
                </button>
                <button type="button" onClick={() => fantasyTransferOutgoing ? selectFantasyTransferOutgoingPlayer(fantasyTransferOutgoing.id) : openFantasyTransferIq()} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
                  Change Player In
                </button>
                <button type="button" onClick={openFantasyTransferIq} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
                  Change Player Out
                </button>
                <button type="button" onClick={resetFantasyTransferIq} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
                  Discard Comparison
                </button>
              </div>

              {process.env.NODE_ENV === "development" && (
                <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
                  Debug: out {comparison.outgoingPlayerId || "NA"} · in {comparison.incomingPlayerId || "NA"} · valid {String(comparison.validation?.isValid ?? false)} · current {comparison.currentReport?.overallScore ?? "NA"} · proposed {comparison.proposedReport?.overallScore ?? "NA"} · verdict {impact?.verdict || "NA"} · version {FANTASY_TRANSFER_IQ_VERSION} · categories {JSON.stringify(Object.fromEntries(Object.entries(impact?.categoryDeltas || {}).map(([key, row]) => [FANTASY_TRANSFER_IQ_CATEGORY_LABELS[key] || key, row.delta])))}
                </div>
              )}
            </div>
          )}
        </div>
      );
    };
    const formatFantasyIqHistoryDelta = (value) => {
      if (value == null) return "Unavailable";
      return value > 0 ? `+${value}` : String(value);
    };
    const renderFantasyIqHistoryTrendChart = () => {
      const rows = (fantasyIqTrendData || []).filter((row) => row[fantasyIqHistoryTrendMetric] != null);
      const width = 560;
      const height = 160;
      const padding = 24;
      const points = rows.map((row, index) => {
        const x = rows.length === 1 ? width / 2 : padding + (index / (rows.length - 1)) * (width - padding * 2);
        const y = height - padding - (Number(row[fantasyIqHistoryTrendMetric]) / 100) * (height - padding * 2);
        return { ...row, x, y };
      });
      return (
        <div style={{ display: "grid", gap: 8 }}>
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "minmax(0, 1fr) 190px", gap: 8, alignItems: "center" }}>
            <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>Fantasy IQ score by gameweek</div>
            <select
              aria-label="Fantasy IQ history trend metric"
              value={fantasyIqHistoryTrendMetric}
              onChange={(event) => setFantasyIqHistoryTrendMetric(event.target.value)}
              style={{ ...probInput, padding: "8px 10px", fontSize: 12 }}
            >
              <option value="overallScore">Overall Fantasy IQ</option>
              <option value="attackOutlook">Attack Outlook</option>
              <option value="defenceOutlook">Defence Outlook</option>
              <option value="fixtureOutlook">Fixture Outlook</option>
              <option value="predictionAlignment">Prediction Alignment</option>
            </select>
          </div>
          {points.length ? (
            <svg role="img" aria-label="Fantasy IQ saved score trend" viewBox={`0 0 ${width} ${height}`} style={{ width: "100%", height: 180, display: "block" }}>
              <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke={theme.line} />
              <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke={theme.line} />
              <polyline
                fill="none"
                stroke={theme.accent2}
                strokeWidth="3"
                points={points.map((point) => `${point.x},${point.y}`).join(" ")}
              />
              {points.map((point) => (
                <g key={point.id}>
                  <circle cx={point.x} cy={point.y} r="5" fill={theme.accent2}>
                    <title>{`${point.label}: ${point[fantasyIqHistoryTrendMetric]}/100`}</title>
                  </circle>
                  <text x={point.x} y={height - 6} textAnchor="middle" fill={theme.muted} fontSize="10" fontWeight="800">{point.label.replace("GW ", "")}</text>
                </g>
              ))}
            </svg>
          ) : (
            <div style={{ color: theme.muted, fontSize: 12 }}>More snapshots are needed for a trend.</div>
          )}
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", color: theme.text, fontSize: 12 }}>
              <thead>
                <tr>
                  {["Gameweek", "Overall", "Fixture", "Attack", "Defence", "Prediction"].map((label) => (
                    <th key={label} style={{ textAlign: "left", padding: "6px 8px", borderBottom: `1px solid ${theme.line}`, color: theme.muted }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(fantasyIqTrendData || []).map((row) => (
                  <tr key={row.id}>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${theme.line}` }}>{row.label}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${theme.line}` }}>{row.overallScore ?? "NA"}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${theme.line}` }}>{row.fixtureOutlook ?? "NA"}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${theme.line}` }}>{row.attackOutlook ?? "NA"}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${theme.line}` }}>{row.defenceOutlook ?? "NA"}</td>
                    <td style={{ padding: "6px 8px", borderBottom: `1px solid ${theme.line}` }}>{row.predictionAlignment ?? "NA"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    };
    const renderFantasyIqSnapshotDetails = (snapshot) => {
      const starters = (snapshot.squad?.players || []).filter((player) => player.squadRole === "starter");
      const bench = (snapshot.squad?.players || []).filter((player) => player.squadRole === "bench");
      const captain = (snapshot.squad?.players || []).find((player) => player.id === snapshot.squad?.captainPlayerId || player.isCaptain);
      const vice = (snapshot.squad?.players || []).find((player) => player.id === snapshot.squad?.viceCaptainPlayerId || player.isViceCaptain);
      return (
        <div style={{ display: "grid", gap: 10, paddingTop: 8 }}>
          <div style={{ color: theme.accent2, fontSize: 12, fontWeight: 950 }}>Saved model result</div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 8 }}>
            {renderFantasyIqMetric("Score", formatFantasyIqScore(snapshot.report?.overallScore), theme.accent2)}
            {renderFantasyIqMetric("Confidence", snapshot.report?.confidence || "NA", theme.accent)}
            {renderFantasyIqMetric("Formation", snapshot.squad?.formation || "NA", theme.accent)}
            {renderFantasyIqMetric("Priority", snapshot.report?.transferPriority || "NA", theme.warn)}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ color: theme.text, fontSize: 12, fontWeight: 950 }}>Starting XI</div>
              {starters.map((player) => <div key={`starter-${snapshot.id}-${player.id}`} style={{ color: theme.muted, fontSize: 12 }}>{player.name} ({player.teamCode}, {player.position})</div>)}
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              <div style={{ color: theme.text, fontSize: 12, fontWeight: 950 }}>Bench</div>
              {bench.map((player) => <div key={`bench-${snapshot.id}-${player.id}`} style={{ color: theme.muted, fontSize: 12 }}>{player.name} ({player.teamCode}, {player.position})</div>)}
            </div>
          </div>
          <div style={{ color: theme.muted, fontSize: 12 }}>
            Captain: {captain?.name || "NA"} · Vice-captain: {vice?.name || "NA"} · Source: {snapshot.squad?.source || "NA"}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
            {FANTASY_IQ_HISTORY_CATEGORY_KEYS.map((key) =>
              renderFantasyIqMetric(FANTASY_IQ_HISTORY_CATEGORY_LABELS[key], formatFantasyIqScore(snapshot.report?.categories?.[key]), theme.muted)
            )}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
            {renderFantasyIqNotes("Stored strengths", snapshot.report?.strengths, theme.accent2)}
            {renderFantasyIqNotes("Stored concerns", snapshot.report?.concerns, theme.warn)}
            {renderFantasyIqNotes("Stored conflicts", (snapshot.report?.predictionConflicts || []).map((item) => `${item.label}: ${item.detail}`), theme.accent)}
          </div>
          <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
            Model {snapshot.metadata?.fantasyIqModelVersion || "unknown"} · Lineup {snapshot.metadata?.lineupIqModelVersion || "NA"} · Transfer {snapshot.metadata?.transferIqModelVersion || "NA"} · Fixture {snapshot.metadata?.fixtureModelVersion || "NA"} · Score config {snapshot.metadata?.scoreConfigVersion || "NA"} · Updated {new Date(snapshot.updatedAt).toLocaleString()}
          </div>
        </div>
      );
    };
    const renderFantasyIqHistory = () => (
      <div style={{ display: "grid", gap: 12 }}>
        <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
          Fantasy IQ history is currently saved on this device.
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <button
            type="button"
            disabled={!currentFantasyIqSnapshotCandidate}
            onClick={() => handleSaveFantasyIqSnapshot()}
            style={{ ...pillBtn(!!currentFantasyIqSnapshotCandidate), padding: "8px 10px", fontSize: 12 }}
          >
            Save Gameweek Snapshot
          </button>
          {!!fantasyIqCurrentDuplicate && (
            <button type="button" onClick={() => handleSaveFantasyIqSnapshot({ mode: "update" })} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
              Update Current Snapshot
            </button>
          )}
          {!!fantasyIqOrderedSnapshots.length && (
            <button type="button" onClick={handleExportFantasyIqHistory} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
              Export Fantasy IQ History
            </button>
          )}
          {!!fantasyIqOrderedSnapshots.length && (
            <button type="button" onClick={handleClearFantasyIqHistory} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12, color: theme.danger }}>
              Clear Fantasy IQ History
            </button>
          )}
        </div>
        {(fantasyIqHistoryDuplicate || fantasyIqHistoryPrompt) && (
          <div role="status" aria-live="polite" style={{ background: "rgba(245,158,11,0.08)", border: `1px solid ${theme.warn}`, borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
            <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>
              {fantasyIqHistoryDuplicate
                ? `A Fantasy IQ snapshot already exists for ${formatFantasyIqSnapshotGameweek(fantasyIqHistoryDuplicate)}.`
                : fantasyIqHistoryPrompt.message}
            </div>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <button type="button" onClick={() => handleSaveFantasyIqSnapshot({ mode: "update" })} style={{ ...pillBtn(true), padding: "7px 9px", fontSize: 12 }}>
                Update Snapshot
              </button>
              <button type="button" onClick={() => handleSaveFantasyIqSnapshot({ mode: "keep-existing" })} style={{ ...pillBtn(false), padding: "7px 9px", fontSize: 12 }}>
                Keep Existing
              </button>
              <button type="button" onClick={() => { setFantasyIqHistoryDuplicate(null); setFantasyIqHistoryPrompt(null); }} style={{ ...pillBtn(false), padding: "7px 9px", fontSize: 12 }}>
                Cancel
              </button>
            </div>
          </div>
        )}
        {fantasyIqHistoryStatus && (
          <div style={{ color: fantasyIqHistoryStatus.includes("could not") ? theme.warn : theme.accent2, fontSize: 12, fontWeight: 850 }}>
            {fantasyIqHistoryStatus}
          </div>
        )}
        {!fantasyIqOrderedSnapshots.length ? (
          <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
            No Fantasy IQ snapshots saved yet. Save a snapshot each gameweek to track your progress.
          </div>
        ) : (
          <div style={{ display: "grid", gap: 12 }}>
            {fantasyIqLatestSnapshot && (
              <div style={{ display: "grid", gap: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.line}`, borderRadius: 10, padding: 10 }}>
                <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                  {renderFantasyIqMetric(formatFantasyIqSnapshotGameweek(fantasyIqLatestSnapshot), formatFantasyIqScore(fantasyIqLatestSnapshot.report?.overallScore), theme.accent2)}
                  {renderFantasyIqMetric("Confidence", fantasyIqLatestSnapshot.report?.confidence || "NA", theme.accent)}
                  {renderFantasyIqMetric("Formation", fantasyIqLatestSnapshot.squad?.formation || "NA", theme.accent)}
                  {renderFantasyIqMetric("Captain", (fantasyIqLatestSnapshot.squad?.players || []).find((player) => player.id === fantasyIqLatestSnapshot.squad?.captainPlayerId || player.isCaptain)?.name || "NA", theme.warn)}
                </div>
                <div style={{ color: theme.muted, fontSize: 12 }}>
                  Saved {new Date(fantasyIqLatestSnapshot.createdAt).toLocaleDateString()} · {fantasyIqTrendSummary.snapshotCount === 1 ? "More snapshots are needed for a trend." : `Highest ${fantasyIqTrendSummary.highestScore}/100 · Lowest ${fantasyIqTrendSummary.lowestScore}/100 · Average ${fantasyIqTrendSummary.averageScore}/100 · From first ${formatFantasyIqHistoryDelta(fantasyIqTrendSummary.changeFromFirst)}`}
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  <button type="button" onClick={() => setFantasyIqHistoryExpandedId((id) => id === fantasyIqLatestSnapshot.id ? null : fantasyIqLatestSnapshot.id)} style={{ ...pillBtn(false), padding: "7px 9px", fontSize: 12 }}>
                    View Details
                  </button>
                  <button type="button" onClick={() => handleSaveFantasyIqSnapshot({ mode: "update" })} style={{ ...pillBtn(false), padding: "7px 9px", fontSize: 12 }}>
                    Update
                  </button>
                  <button type="button" onClick={() => handleDeleteFantasyIqSnapshot(fantasyIqLatestSnapshot)} style={{ ...pillBtn(false), padding: "7px 9px", fontSize: 12, color: theme.danger }}>
                    Delete
                  </button>
                </div>
                {fantasyIqHistoryExpandedId === fantasyIqLatestSnapshot.id && renderFantasyIqSnapshotDetails(fantasyIqLatestSnapshot)}
              </div>
            )}
            {fantasyIqLatestComparison && (
              <div style={{ display: "grid", gap: 10, background: "rgba(34,197,94,0.08)", border: `1px solid ${theme.accent2}`, borderRadius: 10, padding: 10 }}>
                <div style={{ color: theme.text, fontSize: 14, fontWeight: 950 }}>
                  {fantasyIqLatestComparison.verdict}
                </div>
                <div style={{ color: theme.muted, fontSize: 12 }}>
                  Your modelled three-gameweek squad outlook {fantasyIqLatestComparison.overallDelta >= 0 ? "improved" : "changed"} by {formatFantasyIqHistoryDelta(fantasyIqLatestComparison.overallDelta)} points.
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 8 }}>
                  {renderFantasyIqMetric(formatFantasyIqSnapshotGameweek(fantasyIqPreviousSnapshot), fantasyIqPreviousSnapshot.report?.overallScore ?? "NA", theme.muted)}
                  {renderFantasyIqMetric(formatFantasyIqSnapshotGameweek(fantasyIqLatestSnapshot), fantasyIqLatestSnapshot.report?.overallScore ?? "NA", theme.accent2)}
                  {renderFantasyIqMetric("Change", formatFantasyIqHistoryDelta(fantasyIqLatestComparison.overallDelta), fantasyIqLatestComparison.overallDelta >= 0 ? theme.accent2 : theme.warn)}
                  {renderFantasyIqMetric("Confidence", fantasyIqLatestComparison.confidenceChange.changed ? `${fantasyIqLatestComparison.confidenceChange.previous || "NA"} to ${fantasyIqLatestComparison.confidenceChange.current || "NA"}` : fantasyIqLatestComparison.confidenceChange.current || "NA", theme.accent)}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 8 }}>
                  {FANTASY_IQ_HISTORY_CATEGORY_KEYS.map((key) => (
                    <div key={`delta-${key}`} style={{ color: theme.muted, fontSize: 12 }}>
                      <strong style={{ color: theme.text }}>{FANTASY_IQ_HISTORY_CATEGORY_LABELS[key]}:</strong> {formatFantasyIqHistoryDelta(fantasyIqLatestComparison.categoryDeltas[key]?.delta)}
                    </div>
                  ))}
                </div>
                {(fantasyIqLatestComparison.explanations || []).slice(0, 4).map((line) => (
                  <div key={line} style={{ color: theme.muted, fontSize: 12 }}>{line}</div>
                ))}
                {!!fantasyIqLatestComparison.clubExposureChanges.length && (
                  <div style={{ color: theme.muted, fontSize: 12 }}>
                    Club exposure changes: {fantasyIqLatestComparison.clubExposureChanges.map((row) => `${row.teamCode} ${row.previous} to ${row.current}`).join(", ")}
                  </div>
                )}
              </div>
            )}
            {renderFantasyIqHistoryTrendChart()}
            <div style={{ display: "grid", gap: 8 }}>
              <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>Snapshot list</div>
              {fantasyIqOrderedSnapshots.slice().reverse().map((snapshot) => (
                <div key={snapshot.id} style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.line}`, borderRadius: 10, padding: 10, display: "grid", gap: 8 }}>
                  <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "minmax(0, 1fr) auto", gap: 8, alignItems: "center" }}>
                    <div>
                      <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>{formatFantasyIqSnapshotGameweek(snapshot)} · {formatFantasyIqScore(snapshot.report?.overallScore) || "NA"}</div>
                      <div style={{ color: theme.muted, fontSize: 11 }}>Saved {new Date(snapshot.createdAt).toLocaleString()} · {snapshot.squad?.formation || "NA"} · {snapshot.report?.confidence || "NA"} confidence</div>
                    </div>
                    <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                      <button type="button" onClick={() => setFantasyIqHistoryExpandedId((id) => id === snapshot.id ? null : snapshot.id)} style={{ ...pillBtn(false), padding: "6px 8px", fontSize: 11 }}>
                        {fantasyIqHistoryExpandedId === snapshot.id ? "Hide Details" : "View Details"}
                      </button>
                      <button type="button" onClick={() => handleDeleteFantasyIqSnapshot(snapshot)} style={{ ...pillBtn(false), padding: "6px 8px", fontSize: 11, color: theme.danger }}>
                        Delete
                      </button>
                    </div>
                  </div>
                  {fantasyIqHistoryExpandedId === snapshot.id && renderFantasyIqSnapshotDetails(snapshot)}
                </div>
              ))}
            </div>
          </div>
        )}
        {process.env.NODE_ENV === "development" && (
          <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
            Debug: key {fantasyIqHistoryDiagnostics.storageKey} · schema {fantasyIqHistoryDiagnostics.schemaVersion} · version {fantasyIqHistoryDiagnostics.historyVersion} · snapshots {fantasyIqHistoryDiagnostics.snapshotCount} · valid {fantasyIqHistoryDiagnostics.validSnapshotCount} · rejected {fantasyIqHistoryDiagnostics.rejectedSnapshotCount} · duplicates repaired {fantasyIqHistoryDiagnostics.duplicateSnapshotCount} · season {fantasyIqHistoryDiagnostics.currentSeason} · model mismatches {fantasyIqHistoryDiagnostics.modelVersionMismatches} · bytes {fantasyIqHistoryDiagnostics.byteSize}
          </div>
        )}
      </div>
    );
    const renderFantasyScreenshotReviewSlot = (slot) => {
      const selectedPlayer = slot.selectedPlayer || fantasyIqAvailablePlayers.find((player) => player.id === slot.selectedPlayerId);
      const badgeSrc = selectedPlayer ? resolveTeamBadge(selectedPlayer.teamName || selectedPlayer.teamCode) : "";
      const playerLabel = selectedPlayer?.displayName || selectedPlayer?.name || slot.extracted.rawName || "Choose a player";
      const roleValue = slot.isCaptain ? "captain" : slot.isViceCaptain ? "vice" : slot.role === "starter" ? "starter" : "bench";
      const slotSearch = fantasyScreenshotSlotSearch[slot.id] || "";
      const normalisedSlotSearch = normaliseFantasyPlayerName(slotSearch);
      const shouldShowCandidateChoices = !selectedPlayer || ["ambiguous", "unmatched"].includes(slot.status);
      const candidateChoices = shouldShowCandidateChoices ? (slot.matchResult?.candidates || [])
        .filter((candidate) => candidate.id !== selectedPlayer?.id)
        .slice(0, 3) : [];
      const searchedPlayers = normalisedSlotSearch
        ? fantasyIqAvailablePlayers
            .filter((player) => player.id !== selectedPlayer?.id)
            .filter((player) =>
              normaliseFantasyPlayerName(player.displayName || player.name).includes(normalisedSlotSearch) ||
              normaliseFantasyPlayerName(player.webName).includes(normalisedSlotSearch) ||
              String(player.teamCode || "").toLowerCase().includes(slotSearch.toLowerCase())
            )
            .slice(0, 6)
        : [];
      const setReviewSlotRoleControl = (value) => {
        if (value === "captain") {
          setFantasyScreenshotReviewCaptain(slot.id, "captain");
          updateFantasyScreenshotReview((review) =>
            updateFantasyScreenshotReviewSlot(review, slot.id, { role: "starter" }, fantasyIqAvailablePlayers)
          );
          return;
        }
        if (value === "vice") {
          setFantasyScreenshotReviewCaptain(slot.id, "vice");
          updateFantasyScreenshotReview((review) =>
            updateFantasyScreenshotReviewSlot(review, slot.id, { role: "starter" }, fantasyIqAvailablePlayers)
          );
          return;
        }
        markFantasyScreenshotManualCorrection();
        updateFantasyScreenshotReview((review) =>
          updateFantasyScreenshotReviewSlot(review, slot.id, {
            role: value,
            isCaptain: false,
            isViceCaptain: false,
          }, fantasyIqAvailablePlayers)
        );
      };
      return (
        <div
          key={slot.id}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: `1px solid ${slot.status === "matched" ? theme.accent2 : slot.status === "likely" ? theme.accent : theme.warn}`,
            borderRadius: 10,
            padding: 10,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "minmax(0, 1fr)" : "minmax(0, 1fr) 112px auto", gap: 8, alignItems: "center" }}>
            <div style={{ display: "grid", gridTemplateColumns: "30px minmax(0, 1fr)", gap: 8, alignItems: "center", minWidth: 0 }}>
              {badgeSrc ? (
                <img src={badgeSrc} alt="" aria-hidden="true" style={{ width: 26, height: 26, objectFit: "contain" }} />
              ) : (
                <div style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${theme.line}`, background: "rgba(255,255,255,0.04)" }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ color: selectedPlayer ? theme.text : theme.warn, fontSize: 13, fontWeight: 950, overflowWrap: "anywhere" }}>
                  {playerLabel}
                </div>
                <div style={{ color: theme.muted, fontSize: 11, fontWeight: 850 }}>
                  {selectedPlayer?.position || slot.extracted.rawPosition || "Position TBC"}
                  {selectedPlayer?.availabilityStatus && selectedPlayer.availabilityStatus !== "available" ? ` · ${selectedPlayer.availabilityStatus}` : ""}
                </div>
              </div>
            </div>
            <select
              aria-label={`Set role for ${playerLabel}`}
              value={roleValue}
              onChange={(event) => setReviewSlotRoleControl(event.target.value)}
              style={{ ...probInput, padding: "6px 8px", fontSize: 11 }}
            >
              <option value="starter">Starter</option>
              <option value="bench">Bench</option>
              <option value="captain">Captain</option>
              <option value="vice">Vice</option>
            </select>
            <button
              type="button"
              onClick={() => {
                markFantasyScreenshotManualCorrection();
                updateFantasyScreenshotReview((review) => removeFantasyScreenshotReviewSlot(review, slot.id));
              }}
              style={{ ...pillBtn(false), padding: "6px 8px", fontSize: 11, color: theme.danger }}
            >
              Remove
            </button>
          </div>
          {!!candidateChoices.length && (
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {candidateChoices.map((candidate) => (
                <button
                  key={`${slot.id}-${candidate.id}`}
                  type="button"
                  onClick={() => {
                    markFantasyScreenshotManualCorrection();
                    updateFantasyScreenshotReview((review) =>
                      updateFantasyScreenshotReviewSlot(review, slot.id, { selectedPlayerId: candidate.id }, fantasyIqAvailablePlayers)
                    );
                  }}
                  style={{ ...pillBtn(false), padding: "5px 7px", fontSize: 11 }}
                >
                  {candidate.webName || candidate.displayName}
                </button>
              ))}
            </div>
          )}
          <div style={{ display: "grid", gap: 6 }}>
            <input
              value={slotSearch}
              onChange={(event) => setFantasyScreenshotSlotSearch((current) => ({
                ...current,
                [slot.id]: event.target.value,
              }))}
              placeholder={selectedPlayer ? "Search to replace player" : "Search player"}
              style={{ ...probInput, textAlign: "left", padding: "7px 9px", fontSize: 12 }}
            />
            {!!normalisedSlotSearch && (
              <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 6 }}>
                {searchedPlayers.length ? searchedPlayers.map((player) => (
                  <button
                    key={`${slot.id}-search-${player.id}`}
                    type="button"
                    onClick={() => {
                      markFantasyScreenshotManualCorrection();
                      updateFantasyScreenshotReview((review) =>
                        updateFantasyScreenshotReviewSlot(review, slot.id, { selectedPlayerId: player.id }, fantasyIqAvailablePlayers)
                      );
                      setFantasyScreenshotSlotSearch((current) => ({ ...current, [slot.id]: "" }));
                    }}
                    style={{ ...pillBtn(false), padding: "6px 8px", fontSize: 11, textAlign: "left" }}
                  >
                    {player.displayName || player.name} · {player.teamCode} · {player.position}
                  </button>
                )) : (
                  <div style={{ color: theme.muted, fontSize: 11 }}>No players match that search.</div>
                )}
              </div>
            )}
          </div>
        </div>
      );
    };
    const renderFantasyScreenshotMissingPlayerSlot = (item) => {
      const slotId = item.id;
      const role = item.role || "bench";
      const positionSlot = {
        position: item.position,
        number: item.positionNumber,
      };
      const positionLabel =
        positionSlot.position === "GK"
          ? "Goalkeeper"
          : positionSlot.position === "DEF"
          ? "Defender"
          : positionSlot.position === "MID"
          ? "Midfielder"
          : positionSlot.position === "FWD"
          ? "Forward"
          : "Player";
      const slotSearch = fantasyScreenshotSlotSearch[slotId] || "";
      const normalisedSlotSearch = normaliseFantasyPlayerName(slotSearch);
      const searchedPlayers = normalisedSlotSearch
        ? fantasyIqAvailablePlayers
            .filter((player) => !fantasyScreenshotSelectedPlayerIds.has(player.id))
            .filter((player) => !positionSlot.position || player.position === positionSlot.position)
            .filter((player) =>
              normaliseFantasyPlayerName(player.displayName || player.name).includes(normalisedSlotSearch) ||
              normaliseFantasyPlayerName(player.webName).includes(normalisedSlotSearch) ||
              String(player.teamCode || "").toLowerCase().includes(slotSearch.toLowerCase())
            )
            .slice(0, 6)
        : [];
      return (
        <div
          key={slotId}
          style={{
            background: "rgba(255,255,255,0.035)",
            border: `1px dashed ${theme.warn}`,
            borderRadius: 10,
            padding: 10,
            display: "grid",
            gap: 8,
          }}
        >
          <div style={{ display: "grid", gridTemplateColumns: "30px minmax(0, 1fr)", gap: 8, alignItems: "center" }}>
            <div style={{ width: 26, height: 26, borderRadius: 8, border: `1px solid ${theme.line}`, background: "rgba(255,255,255,0.04)" }} />
            <div style={{ minWidth: 0 }}>
              <div style={{ color: theme.warn, fontSize: 13, fontWeight: 950 }}>
                {positionLabel} {positionSlot.number || ""}
              </div>
              <div style={{ color: theme.muted, fontSize: 11, fontWeight: 850 }}>
                {role === "starter" ? "Starter" : "Bench"} · Search to add manually
              </div>
            </div>
          </div>
          <input
            value={slotSearch}
            onChange={(event) => setFantasyScreenshotSlotSearch((current) => ({
              ...current,
              [slotId]: event.target.value,
            }))}
            placeholder="Search player"
            style={{ ...probInput, textAlign: "left", padding: "7px 9px", fontSize: 12 }}
          />
          {!!normalisedSlotSearch && (
            <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 6 }}>
              {searchedPlayers.length ? searchedPlayers.map((player) => (
                <button
                  key={`${slotId}-search-${player.id}`}
                  type="button"
                  onClick={() => {
                    markFantasyScreenshotManualCorrection();
                    updateFantasyScreenshotReview((review) => addFantasyScreenshotReviewPlayer(review, player, role));
                    setFantasyScreenshotSlotSearch((current) => ({ ...current, [slotId]: "" }));
                  }}
                  style={{ ...pillBtn(false), padding: "6px 8px", fontSize: 11, textAlign: "left" }}
                >
                  {player.displayName || player.name} · {player.teamCode} · {player.position}
                </button>
              )) : (
                <div style={{ color: theme.muted, fontSize: 11 }}>No players match that search.</div>
              )}
            </div>
          )}
        </div>
      );
    };
    const renderFantasyScreenshotPitchItem = (item, options = {}) => {
      if (item.type === "missing") {
        const slotId = item.id;
        const role = item.role || "bench";
        const slotSearch = fantasyScreenshotSlotSearch[slotId] || "";
        const normalisedSlotSearch = normaliseFantasyPlayerName(slotSearch);
        const searchedPlayers = normalisedSlotSearch
          ? fantasyIqAvailablePlayers
              .filter((player) => !fantasyScreenshotSelectedPlayerIds.has(player.id))
              .filter((player) => !item.position || player.position === item.position)
              .filter((player) =>
                normaliseFantasyPlayerName(player.displayName || player.name).includes(normalisedSlotSearch) ||
                normaliseFantasyPlayerName(player.webName).includes(normalisedSlotSearch) ||
                String(player.teamCode || "").toLowerCase().includes(slotSearch.toLowerCase())
              )
              .slice(0, 4)
          : [];
        return (
          <div key={slotId} style={{ display: "grid", gap: 5, minWidth: 0 }}>
            {renderFantasyPitchPlayerCard({
              id: slotId,
              displayName: `${item.position || "Player"} ${item.positionNumber || ""}`,
              webName: item.position || "Add",
              position: item.position,
              teamCode: role === "starter" ? "XI" : "BEN",
            }, { ...options, hideMeta: true })}
            <input
              value={slotSearch}
              onChange={(event) => setFantasyScreenshotSlotSearch((current) => ({ ...current, [slotId]: event.target.value }))}
              placeholder="Search"
              style={{ ...probInput, textAlign: "left", padding: "5px 6px", fontSize: 10 }}
            />
            {!!normalisedSlotSearch && (
              <div style={{ display: "grid", gap: 4 }}>
                {searchedPlayers.length ? searchedPlayers.map((player) => (
                  <button
                    key={`${slotId}-pitch-search-${player.id}`}
                    type="button"
                    onClick={() => {
                      markFantasyScreenshotManualCorrection();
                      updateFantasyScreenshotReview((review) => addFantasyScreenshotReviewPlayer(review, player, role));
                      setFantasyScreenshotSlotSearch((current) => ({ ...current, [slotId]: "" }));
                    }}
                    style={{ ...pillBtn(false), padding: "4px 5px", fontSize: 9, textAlign: "center" }}
                  >
                    {player.webName || player.displayName}
                  </button>
                )) : (
                  <div style={{ color: theme.muted, fontSize: 9, textAlign: "center" }}>No match</div>
                )}
              </div>
            )}
          </div>
        );
      }

      const slot = item.slot;
      const selectedPlayer = slot.selectedPlayer || fantasyIqAvailablePlayers.find((player) => player.id === slot.selectedPlayerId);
      const roleValue = slot.isCaptain ? "captain" : slot.isViceCaptain ? "vice" : slot.role === "starter" ? "starter" : "bench";
      const playerLabel = selectedPlayer?.displayName || selectedPlayer?.name || slot.extracted.rawName || "Choose player";
      const slotSearch = fantasyScreenshotSlotSearch[slot.id] || "";
      const normalisedSlotSearch = normaliseFantasyPlayerName(slotSearch);
      const searchedPlayers = normalisedSlotSearch
        ? fantasyIqAvailablePlayers
            .filter((player) => player.id !== selectedPlayer?.id)
            .filter((player) =>
              normaliseFantasyPlayerName(player.displayName || player.name).includes(normalisedSlotSearch) ||
              normaliseFantasyPlayerName(player.webName).includes(normalisedSlotSearch) ||
              String(player.teamCode || "").toLowerCase().includes(slotSearch.toLowerCase())
            )
            .slice(0, 4)
        : [];
      const setRole = (value) => {
        if (value === "captain") {
          setFantasyScreenshotReviewCaptain(slot.id, "captain");
          updateFantasyScreenshotReview((review) =>
            updateFantasyScreenshotReviewSlot(review, slot.id, { role: "starter" }, fantasyIqAvailablePlayers)
          );
          return;
        }
        if (value === "vice") {
          setFantasyScreenshotReviewCaptain(slot.id, "vice");
          updateFantasyScreenshotReview((review) =>
            updateFantasyScreenshotReviewSlot(review, slot.id, { role: "starter" }, fantasyIqAvailablePlayers)
          );
          return;
        }
        markFantasyScreenshotManualCorrection();
        updateFantasyScreenshotReview((review) =>
          updateFantasyScreenshotReviewSlot(review, slot.id, {
            role: value,
            isCaptain: false,
            isViceCaptain: false,
          }, fantasyIqAvailablePlayers)
        );
      };

      return (
        <div key={slot.id} style={{ display: "grid", gap: 5, minWidth: 0 }}>
          {renderFantasyPitchPlayerCard({
            ...(selectedPlayer || {}),
            id: selectedPlayer?.id || slot.id,
            displayName: playerLabel,
            webName: selectedPlayer?.webName || playerLabel,
            position: selectedPlayer?.position || item.position || slot.extracted.rawPosition,
            teamCode: selectedPlayer?.teamCode || "TBC",
            isCaptain: slot.isCaptain,
            isViceCaptain: slot.isViceCaptain,
          }, { ...options, hideMeta: true })}
          <select
            aria-label={`Set role for ${playerLabel}`}
            value={roleValue}
            onChange={(event) => setRole(event.target.value)}
            style={{ ...probInput, padding: "5px 6px", fontSize: 10 }}
          >
            <option value="starter">Starter</option>
            <option value="bench">Bench</option>
            <option value="captain">Captain</option>
            <option value="vice">Vice</option>
          </select>
          <input
            value={slotSearch}
            onChange={(event) => setFantasyScreenshotSlotSearch((current) => ({ ...current, [slot.id]: event.target.value }))}
            placeholder="Replace"
            style={{ ...probInput, textAlign: "left", padding: "5px 6px", fontSize: 10 }}
          />
          {!!normalisedSlotSearch && (
            <div style={{ display: "grid", gap: 4 }}>
              {searchedPlayers.length ? searchedPlayers.map((player) => (
                <button
                  key={`${slot.id}-pitch-search-${player.id}`}
                  type="button"
                  onClick={() => {
                    markFantasyScreenshotManualCorrection();
                    updateFantasyScreenshotReview((review) =>
                      updateFantasyScreenshotReviewSlot(review, slot.id, { selectedPlayerId: player.id }, fantasyIqAvailablePlayers)
                    );
                    setFantasyScreenshotSlotSearch((current) => ({ ...current, [slot.id]: "" }));
                  }}
                  style={{ ...pillBtn(false), padding: "4px 5px", fontSize: 9, textAlign: "center" }}
                >
                  {player.webName || player.displayName}
                </button>
              )) : (
                <div style={{ color: theme.muted, fontSize: 9, textAlign: "center" }}>No match</div>
              )}
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              markFantasyScreenshotManualCorrection();
              updateFantasyScreenshotReview((review) => removeFantasyScreenshotReviewSlot(review, slot.id));
            }}
            style={{ ...pillBtn(false), padding: "4px 5px", fontSize: 9, color: theme.danger }}
          >
            Remove
          </button>
        </div>
      );
    };
    const renderFantasyScreenshotReviewPitch = () => {
      const starters = fantasyScreenshotReviewDisplaySlots
        .filter((item) => item.role === "starter")
        .map((item) => ({ ...item, id: item.id, position: item.position || item.slot?.selectedPlayer?.position || item.slot?.extracted?.rawPosition || "" }));
      const bench = fantasyScreenshotReviewDisplaySlots
        .filter((item) => item.role !== "starter")
        .map((item) => ({ ...item, id: item.id, position: item.position || item.slot?.selectedPlayer?.position || item.slot?.extracted?.rawPosition || "" }));
      return renderFantasyPitchLayout({
        starters,
        bench,
        title: "Screenshot Review",
        renderPlayer: renderFantasyScreenshotPitchItem,
      });
    };
    const renderFantasyScreenshotImport = () => (
      <div
        style={{
          background: theme.panel,
          border: `1px solid ${theme.line}`,
          borderRadius: 12,
          padding: 12,
          display: "grid",
          gap: 12,
        }}
      >
        <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
          Upload a screenshot showing your starting XI and bench. Keep player names and three-letter team codes visible.
        </div>
        <label
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            const file = event.dataTransfer.files?.[0];
            if (file) handleFantasyScreenshotFile(file);
          }}
          tabIndex={0}
          style={{
            border: `1px dashed ${theme.accent}`,
            borderRadius: 10,
            padding: 14,
            display: "grid",
            gap: 8,
            cursor: "pointer",
            background: "rgba(56,189,248,0.08)",
          }}
        >
          <span style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>
            Select or drop a squad screenshot
          </span>
          <span style={{ color: theme.muted, fontSize: 11 }}>
            PNG, JPEG or WebP · max {Math.round(FANTASY_SCREENSHOT_IMPORT_CONFIG.maxFileSizeBytes / 1024 / 1024)} MB
          </span>
          <input
            type="file"
            accept={FANTASY_SCREENSHOT_IMPORT_CONFIG.acceptedMimeTypes.join(",")}
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) handleFantasyScreenshotFile(file);
              event.target.value = "";
            }}
            style={{ position: "absolute", opacity: 0, pointerEvents: "none" }}
          />
        </label>
        {fantasyScreenshotPreviewUrl && (
          <div style={{ display: "grid", gap: 8 }}>
            <button
              type="button"
              onClick={() => setFantasyScreenshotPreviewCollapsed((value) => !value)}
              style={{ ...pillBtn(false), padding: "6px 8px", fontSize: 11, justifySelf: "start" }}
            >
              {fantasyScreenshotPreviewCollapsed ? "Show Preview" : "Hide Preview"}
            </button>
            {!fantasyScreenshotPreviewCollapsed && (
              <img
                src={fantasyScreenshotPreviewUrl}
                alt="Selected fantasy squad screenshot preview"
                style={{ width: "100%", maxHeight: isMobile || compact ? 220 : 360, objectFit: "contain", borderRadius: 10, border: `1px solid ${theme.line}` }}
              />
            )}
            <div style={{ color: theme.muted, fontSize: 11 }}>
              {fantasyScreenshotImageMetadata?.width}x{fantasyScreenshotImageMetadata?.height} · {Math.round((fantasyScreenshotImageMetadata?.size || 0) / 1024)} KB
            </div>
          </div>
        )}
        {["preprocessing", "extracting text", "matching players"].includes(fantasyScreenshotImportState) && (
          <div aria-live="polite" style={{ display: "grid", gap: 7 }}>
            <div style={{ height: 9, borderRadius: 999, background: "rgba(255,255,255,0.08)", border: `1px solid ${theme.line}`, overflow: "hidden" }}>
              <div
                className="fantasy-screenshot-progress-fill"
                style={{
                  width: "100%",
                  height: "100%",
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${theme.accent}, ${theme.accent2})`,
                }}
              />
            </div>
            <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
              Analysing screenshot
            </div>
          </div>
        )}
        {!["preprocessing", "extracting text", "matching players"].includes(fantasyScreenshotImportState) && (
          <div aria-live="polite" style={{ color: fantasyScreenshotError ? theme.warn : theme.muted, fontSize: 12, lineHeight: 1.35 }}>
            {fantasyScreenshotError || fantasyScreenshotStatusText || `State: ${fantasyScreenshotImportState}`}
          </div>
        )}
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            disabled={!fantasyScreenshotFile || ["preprocessing", "extracting text", "matching players"].includes(fantasyScreenshotImportState)}
            onClick={analyseFantasyScreenshot}
            style={{ ...pillBtn(!!fantasyScreenshotFile), padding: "8px 10px", fontSize: 12 }}
          >
            Analyse Screenshot
          </button>
          <button type="button" onClick={() => resetFantasyScreenshotImport("idle")} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
            Remove Image
          </button>
          <button type="button" onClick={closeFantasyScreenshotImport} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
            Cancel
          </button>
        </div>
        {fantasyScreenshotReview && (
          <div style={{ display: "grid", gap: 10 }}>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${theme.line}`,
                borderRadius: 10,
                padding: 10,
                display: "grid",
                gap: 5,
              }}
            >
              <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>
                {fantasyScreenshotSelectedCount} of 15 players selected.
                {fantasyScreenshotReviewIssueCount > 0
                  ? ` ${fantasyScreenshotReviewIssueCount} ${fantasyScreenshotReviewIssueCount === 1 ? "player needs" : "players need"} review.`
                  : " Check the squad before importing."}
              </div>
              <div style={{ color: theme.muted, fontSize: 11 }}>
                Starters {fantasyScreenshotReviewSummary.starters || 0}/11 · Bench {fantasyScreenshotReviewSummary.bench || 0}/4 · Formation {fantasyScreenshotReviewDisplayFormation || fantasyScreenshotReviewSummary.formation || "Incomplete"} · Import confidence {fantasyScreenshotReview.confidence?.label || "low"}
              </div>
              {!!fantasyScreenshotReviewValidation.errors.length && (
                <div style={{ color: theme.warn, fontSize: 11, lineHeight: 1.35 }}>
                  {fantasyScreenshotReviewValidation.errors.slice(0, 3).join(" ")}
                </div>
              )}
              <div style={{ color: theme.warn, fontSize: 11, fontWeight: 850, lineHeight: 1.35 }}>
                Please check every player, captain, vice-captain and bench order before importing. Use the search box on any row to replace an incorrect player.
              </div>
              {fantasyScreenshotReadySummaryText && (
                <div style={{ color: theme.accent2, fontSize: 11, fontWeight: 850, lineHeight: 1.35 }}>
                  {fantasyScreenshotReadySummaryText}
                </div>
              )}
              {fantasyScreenshotPartialSummaryText && (
                <div style={{ color: theme.warn, fontSize: 11, fontWeight: 850, lineHeight: 1.35 }}>
                  {fantasyScreenshotPartialSummaryText}
                </div>
              )}
              {!!fantasyScreenshotAvailabilityRisks.length && (
                <div style={{ color: theme.warn, fontSize: 11, fontWeight: 850, lineHeight: 1.35 }}>
                  Availability risk detected: {fantasyScreenshotAvailabilityRisks
                    .slice(0, 4)
                    .map((player) => {
                      const chance = getFantasyAvailabilityChance(player);
                      const chanceText = chance != null ? `, ${chance}% chance` : "";
                      return `${player.displayName || player.name} (${getFantasyAvailabilityLabel(player)}${chanceText})`;
                    })
                    .join(", ")}.
                </div>
              )}
            </div>
            {renderFantasyScreenshotReviewPitch()}
            <div
              style={{
                background: fantasyScreenshotReviewValidation.isValid ? "rgba(34,197,94,0.08)" : "rgba(245,158,11,0.08)",
                border: `1px solid ${fantasyScreenshotReviewValidation.isValid ? theme.accent2 : theme.warn}`,
                borderRadius: 10,
                padding: 10,
                display: "grid",
                gap: 8,
              }}
            >
              <div style={{ color: fantasyScreenshotReviewValidation.isValid ? theme.accent2 : theme.warn, fontSize: 12, fontWeight: 950 }}>
                {fantasyScreenshotReviewValidation.isValid ? "Ready to confirm." : "Please confirm:"}
              </div>
              {!fantasyScreenshotReviewValidation.isValid && (
                <div style={{ display: "grid", gap: 4 }} role="alert">
                  {fantasyScreenshotConfirmMessages.map((message) => (
                    <div key={message} style={{ color: theme.text, fontSize: 12, lineHeight: 1.35 }}>
                      {message}
                    </div>
                  ))}
                </div>
              )}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  disabled={!fantasyScreenshotReviewValidation.isValid}
                  onClick={handleConfirmFantasyScreenshotImport}
                  style={{ ...pillBtn(fantasyScreenshotReviewValidation.isValid), padding: "8px 10px", fontSize: 12 }}
                >
                  {fantasyScreenshotReplacePending ? "Confirm Replace Squad" : "Confirm Import"}
                </button>
                <button type="button" onClick={() => openFantasyIqBuilder(fantasyIqSquad)} style={{ ...pillBtn(false), padding: "8px 10px", fontSize: 12 }}>
                  Use Manual Entry
                </button>
              </div>
            </div>
          </div>
        )}
        {process.env.NODE_ENV === "development" && fantasyScreenshotReview?.diagnostics && (
          <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
            Debug: {fantasyScreenshotImageMetadata?.width || "NA"}x{fantasyScreenshotImageMetadata?.height || "NA"} · OCR blocks {fantasyScreenshotReview.diagnostics.ocrTextBlockCount} · Teams {fantasyScreenshotReview.diagnostics.recognisedTeamCodes.join(", ") || "none"} · Duplicates {fantasyScreenshotReview.diagnostics.duplicateCandidateCount} · Duration {fantasyScreenshotReview.imageMetadata?.ocrDurationMs || fantasyScreenshotImageMetadata?.ocrDurationMs || "NA"}ms
          </div>
        )}
      </div>
    );

    const fantasySuggestedTeamStyles = [
      ["balanced", "Balanced", "A rounded squad across attack, defence, fixtures and form."],
      ["attacking", "Attacking", "Prioritises forwards, attacking midfielders and high goal outlook."],
      ["defensive", "Defensive", "Prioritises defenders, goalkeepers and clean-sheet outlook."],
    ];
    const renderFantasyIqBackBar = () => (
      <button
        type="button"
        onClick={() => setFantasyIqAnalysisPanel("home")}
        style={{ ...pillBtn(false), padding: "7px 9px", fontSize: 12, justifySelf: "start" }}
      >
        Back to Fantasy IQ
      </button>
    );
    const renderFantasyIqHomeChoice = (id, title, detail, color) => (
      <button
        type="button"
        onClick={() => setFantasyIqAnalysisPanel(id)}
        style={{
          border: `1px solid ${color}`,
          borderRadius: 10,
          padding: isMobile || compact ? 14 : 18,
          background: `linear-gradient(135deg, ${color}2A, rgba(255,255,255,0.05))`,
          color: theme.text,
          cursor: "pointer",
          textAlign: "left",
          display: "grid",
          gap: 8,
          minHeight: isMobile || compact ? 132 : 150,
          alignContent: "center",
          boxShadow: `0 0 0 1px rgba(255,255,255,0.04), 0 12px 30px ${color}18`,
        }}
      >
        <span style={{ color, fontSize: 12, fontWeight: 950, textTransform: "uppercase" }}>Fantasy IQ</span>
        <span style={{ color: theme.text, fontSize: isMobile || compact ? 22 : 28, fontWeight: 1000, lineHeight: 1.05 }}>
          {title}
        </span>
        <span style={{ color: theme.muted, fontSize: 13, fontWeight: 750, lineHeight: 1.35 }}>
          {detail}
        </span>
      </button>
    );
    const renderFantasyIqHome = () => (
      <div style={{ display: "grid", gap: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 12 }}>
          {renderFantasyIqHomeChoice(
            "suggested",
            "Prediction Addiction Suggested Team",
            "Choose attacking, defensive or balanced and get a 15 player squad for the next five gameweeks.",
            "#22C55E"
          )}
          {renderFantasyIqHomeChoice(
            "team",
            "Analyse Your Fantasy Team",
            "Upload a screenshot or enter your squad to score it, review Lineup IQ and compare transfers.",
            "#38BDF8"
          )}
        </div>
      </div>
    );

    const renderFantasyIqSquadEntrySection = () => renderFantasyIqSection(
      "Analyse Your Fantasy Squad",
      fantasyIqTeamWorkflowActive
        ? ""
        : "Upload a screenshot or enter your squad manually to receive a personalised three-gameweek Fantasy IQ score.",
      <div style={{ display: "grid", gap: 10 }}>
        {!fantasyIqTeamWorkflowActive && (
          <>
            <div
              style={{
                background: "rgba(255,255,255,0.04)",
                border: `1px solid ${theme.line}`,
                borderRadius: 10,
                padding: 10,
                display: "grid",
                gap: 6,
              }}
            >
              <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>
                {report.squad?.confirmed
                  ? "Status: Ready for analysis"
                  : squadPlayerCount
                  ? "Status: Draft squad"
                  : "Status: No squad entered yet"}
              </div>
              {!report.squad?.confirmed && (
                <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
                  {squadPlayerCount
                    ? `${squadPlayerCount}/15 players selected · Formation ${report.squadValidation?.summary?.formation || "Incomplete"}`
                    : "Add your fantasy squad to unlock your complete Fantasy IQ score."}
                </div>
              )}
              {report.squad?.needsPlayerDataReview && (
                <div style={{ color: theme.warn, fontSize: 12, fontWeight: 850 }}>
                  Your saved squad needs a quick player-data review.
                </div>
              )}
              {report.squad?.confirmed && (
                <div style={{ color: theme.accent2, fontSize: 12, fontWeight: 850 }}>
                  Your squad is ready for Fantasy IQ analysis.
                </div>
              )}
              {report.squad?.updatedAt && (
                <div style={{ color: theme.muted, fontSize: 11 }}>
                  Last updated {new Date(report.squad.updatedAt).toLocaleString()}
                </div>
              )}
              {!!squadPlayerCount && !!squadMessages.length && !report.squad?.confirmed && (
                <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
                  {squadMessages.slice(0, 2).join(" ")}
                </div>
              )}
            </div>

            {fantasyIqSquadStatus && (
              <div style={{ color: fantasyIqSquadStatus.includes("Fix") ? theme.warn : theme.accent2, fontSize: 12, fontWeight: 850 }}>
                {fantasyIqSquadStatus}
              </div>
            )}

            <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, auto))", gap: 8, alignItems: "center", justifyContent: "start" }}>
              <button
                type="button"
                onClick={openFantasyScreenshotImport}
                title="Import Squad Screenshot"
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${theme.accent}`,
                  background: "rgba(56,189,248,0.1)",
                  color: theme.text,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 850,
                }}
              >
                Import Squad Screenshot
              </button>
              <button
                type="button"
                onClick={() => openFantasyIqBuilder(report.squad)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  border: `1px solid ${theme.accent}`,
                  background: "rgba(56,189,248,0.1)",
                  color: theme.text,
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 850,
                }}
              >
                {squadPlayerCount && !report.squad?.confirmed
                  ? "Continue Building Squad"
                  : squadPlayerCount
                  ? "View/Edit Squad"
                  : "Enter Squad Manually"}
              </button>
              {!!squadPlayerCount && (
                <button
                  type="button"
                  onClick={handleClearFantasyIqSquad}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${theme.danger}`,
                    background: "rgba(255,255,255,0.04)",
                    color: theme.danger,
                    cursor: "pointer",
                    fontSize: 12,
                    fontWeight: 850,
                  }}
                >
                  Clear Squad
                </button>
              )}
            </div>
          </>
        )}

        {fantasyScreenshotPostImportSummary && !fantasyIqTeamWorkflowActive && (
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${theme.line}`,
              borderRadius: 10,
              padding: 10,
              display: "grid",
              gap: 8,
            }}
          >
            <div style={{ color: theme.text, fontSize: 13, fontWeight: 950 }}>
              How accurate was the screenshot import?
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {["Everything was correct", "I corrected 1-2 players", "I corrected several players", "It did not work"].map((rating) => (
                <button
                  key={rating}
                  type="button"
                  onClick={() => setFantasyScreenshotFeedbackRating(rating)}
                  style={{ ...pillBtn(fantasyScreenshotFeedbackRating === rating), padding: "6px 8px", fontSize: 11 }}
                >
                  {rating}
                </button>
              ))}
            </div>
            <input
              value={fantasyScreenshotFeedbackNote}
              onChange={(event) => setFantasyScreenshotFeedbackNote(event.target.value)}
              placeholder="What went wrong?"
              style={{ ...probInput, textAlign: "left", padding: "8px 10px", fontSize: 12 }}
            />
          </div>
        )}

        {fantasyIqBuilderOpen && renderFantasyIqSquadBuilder()}
        {fantasyScreenshotImportOpen && renderFantasyScreenshotImport()}
      </div>,
      "#A78BFA"
    );

    return (
      <div style={{ display: "grid", gap: compact ? 12 : 14 }}>
        {fantasyIqAnalysisPanel === "home" && renderFantasyIqHome()}

        {fantasyIqAnalysisPanel === "prediction" && renderFantasyIqSection(
          "Your Prediction Signals",
          fantasyInsightsScope === "season" ? "Season-level signals from your submitted predictions." : "Gameweek signals from your submitted predictions.",
          <div
            style={{
              display: "grid",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile || compact ? "1fr" : "minmax(0, 1fr) auto",
                gap: 10,
                alignItems: "center",
              }}
            >
              <select
                value={fantasyInsightsScope}
                onChange={(event) => setFantasyInsightsScope(event.target.value)}
                style={{
                  ...probInput,
                  width: isMobile || compact ? "100%" : 190,
                  padding: "8px 10px",
                  fontSize: 13,
                  fontWeight: 850,
                }}
              >
                <option value="gameweek">Gameweek Insights</option>
                <option value="season">Season Insights</option>
              </select>
              <div style={{ color: theme.muted, fontSize: 12, textAlign: isMobile || compact ? "left" : "right" }}>
                {report.submittedPredictions} predictions entered, {report.missingPredictions} still missing.
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(4, minmax(0, 1fr))", gap: 10 }}>
              {insightItems.map(renderInsightCard)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {(report.predictionSignalRows || []).map(renderPredictionSignalRow)}
            </div>
            {(report.predictionConflicts || []).length > 0 && (
              <div style={{ display: "grid", gap: 6 }}>
                {(report.predictionConflicts || []).map((conflict) => (
                  <div key={conflict.fixtureId} style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35 }}>
                    <strong style={{ color: theme.warn }}>{conflict.label}:</strong> {conflict.detail}
                  </div>
                ))}
              </div>
            )}
          </div>,
          theme.accent2
        )}

        {fantasyIqAnalysisPanel === "prediction" && renderFantasyIqSection(
          "Model Fixture Outlook",
          "Fantasy IQ analyses attacking potential, clean-sheet outlook and fixture difficulty over the next three gameweeks.",
          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }}
          >
            {renderFixtureDifficultyPanel(
              "Overall fixture outlook",
              report.overallFixtureRows,
              "#22C55E",
              "NA"
            )}
            {renderFixtureDifficultyPanel(
              "Attacking outlook",
              report.attackFixtureRows || report.fixtureRows,
              "#A78BFA",
              "NA"
            )}
            {renderFixtureDifficultyPanel(
              "Defensive outlook",
              report.defenceFixtureRows,
              "#38BDF8",
              "NA"
            )}
            {renderFixtureDifficultyPanel(
              "Higher-risk schedules",
              report.fixtureHardRows,
              "#EF4444",
              "NA"
            )}
          </div>,
          theme.accent
        )}

        {fantasyIqAnalysisPanel === "prediction" && renderFantasyIqSection(
          "Teams to Consider",
          "Team-level fantasy interest only. Individual player recommendations will come after squad data exists.",
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.line}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {(report.adviceRows || [])
              .filter((item) =>
                ["Transfer in", "Defence/GK", "Formation"].includes(item.label) ||
                (item.label === "Fixture difficulty" && item.data !== "Consider avoiding")
              )
              .slice(0, 5)
              .map(renderAdviceComparisonRow)}
          </div>,
          "#22C55E"
        )}

        {fantasyIqAnalysisPanel === "prediction" && renderFantasyIqSection(
          "Teams to Approach with Caution",
          "Uses difficult attacking fixtures, low clean-sheet outlook, poor recent form and adverse three-gameweek schedules.",
          <div
            style={{
              background: theme.panel,
              border: `1px solid ${theme.line}`,
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            {(report.adviceRows || [])
              .filter((item) => ["Bench", "Transfer out"].includes(item.label) || (item.label === "Fixture difficulty" && item.data === "Consider avoiding"))
              .map(renderAdviceComparisonRow)}
          </div>,
          "#EF4444"
        )}

        {fantasyIqAnalysisPanel === "suggested" && renderFantasyIqBackBar()}

        {fantasyIqAnalysisPanel === "suggested" && renderFantasyIqSection(
          null,
          null,
          renderFantasySuggestedTeam(),
          "#22C55E"
        )}

        {fantasyIqAnalysisPanel === "team" && renderFantasyIqBackBar()}

        {fantasyIqAnalysisPanel === "team" && renderFantasyIqSquadEntrySection()}

        {fantasyIqAnalysisPanel === "team" && !fantasyIqTeamWorkflowActive && report.squad?.confirmed && renderFantasyIqSection(
          "Fantasy IQ Overview",
          "Your confirmed squad is ready for complete Fantasy IQ scoring.",
          <div
            style={{
              background: "rgba(255,255,255,0.04)",
              border: `1px solid ${theme.line}`,
              borderRadius: 12,
              padding: 14,
              display: "grid",
              gap: 10,
            }}
          >
            <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {overviewMetrics.map((item) => renderFantasyIqMetric(item.label, item.value, theme.accent2))}
            </div>
            <div style={{ color: theme.muted, fontSize: 12, lineHeight: 1.35, textAlign: "center" }}>
              Model-based squad analysis only. This is not predicted FPL points. It uses current FPL prices, availability flags and injury-related player availability where available, but does not include transfer hits.
            </div>
          </div>,
          theme.accent2,
          fantasyIqOverviewRef
        )}

        {fantasyIqAnalysisPanel === "team" && !fantasyIqTeamWorkflowActive && report.squad?.confirmed && renderFantasyIqSection(
          "Squad Score Breakdown",
          "Scores are based on confirmed squad roles, club fixture outlook, player position and your submitted predictions where available.",
          <div style={{ display: "grid", gap: 10 }}>
            <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {categoryDetailRows.map(renderFantasyIqCategoryDetail)}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(3, minmax(0, 1fr))", gap: 10 }}>
              {renderFantasyIqNotes("Strengths", preparedReport.strengths, theme.accent2)}
              {renderFantasyIqNotes("Concerns", preparedReport.concerns, theme.warn)}
              {renderFantasyIqNotes("Review Queue", preparedReport.recommendations, theme.accent)}
            </div>
            <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
              Players from the same club and position receive the same model treatment until official player-level data is added.
            </div>
            {!!(preparedReport.confidenceReasons || []).length && (
              <div style={{ color: theme.muted, fontSize: 11, lineHeight: 1.35 }}>
                Confidence: {(preparedReport.confidenceReasons || []).join(" ")}
              </div>
            )}
          </div>,
          "#14B8A6"
        )}

        {fantasyIqAnalysisPanel === "team" && !fantasyIqTeamWorkflowActive && report.squad?.confirmed && renderFantasyIqSection(
          "Lineup IQ",
          report.squad?.confirmed
            ? "Compare your current starting XI with the strongest fixture-based lineup from your existing squad."
            : "Confirm your fantasy squad before analysing your lineup.",
          renderFantasyLineupIq(),
          "#14B8A6"
        )}

        {fantasyIqAnalysisPanel === "team" && !fantasyIqTeamWorkflowActive && report.squad?.confirmed && renderFantasyIqSection(
          "Transfer IQ",
          report.squad?.confirmed
            ? "See how one player change could affect your Fantasy IQ over the next three gameweeks."
            : "Confirm your fantasy squad before comparing transfers.",
          renderFantasyTransferIq(),
          "#F59E0B"
        )}

        {fantasyIqAnalysisPanel === "team" && !fantasyIqTeamWorkflowActive && report.squad?.confirmed && renderFantasyIqSection(
          "Fantasy IQ History",
          "Track how your squad outlook changes throughout the season.",
          renderFantasyIqHistory(),
          theme.accent2
        )}

        {process.env.NODE_ENV === "development" && renderFantasyIqSection(
          "Player Data Diagnostics",
          "Development-only player-data adapter and matching diagnostics.",
          <div style={{ display: "grid", gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))", gap: 8 }}>
            {[
              ["Source", fantasyPlayerData.source || "NA"],
              ["Fetched", fantasyPlayerData.fetchedAt || "NA"],
              ["Cache", fantasyPlayerData.cacheStatus || "NA"],
              ["Players", fantasyPlayerData.players?.length || 0],
              ["Rejected", fantasyPlayerData.diagnostics?.rejectedPlayerCount || 0],
              ["Teams", fantasyPlayerData.teams?.length || 0],
              ["Match index", fantasyPlayerData.players?.length || 0],
              ["Unresolved saved", unresolvedSavedPlayerCount],
              ["Schema", `${FANTASY_PLAYER_DATA_SCHEMA_VERSION} (${FANTASY_PLAYER_DATA_CACHE_KEY})`],
            ].map(([label, value]) => renderFantasyIqMetric(label, value, theme.muted))}
          </div>,
          theme.muted
        )}

        <div
          style={{
            background: "rgba(255,255,255,0.05)",
            border: `1px solid ${theme.line}`,
            borderRadius: 12,
            padding: 12,
          }}
        >
          <div style={{ fontSize: 11, color: theme.muted, fontWeight: 800 }}>
            Data note
          </div>
          <div style={{ marginTop: 4, fontSize: 11, color: theme.muted, lineHeight: 1.35 }}>
            Guidance only. This uses your predictions, app results, fixture home/away context, current FPL prices and player availability where available. It does not use confirmed team sheets.
          </div>
        </div>
      </div>
    );
  };

  const smallInput = {
    width: isMobile ? 34 : 36,
    padding: isMobile ? "6px 7px" : "6px 8px",
    background: theme.panelHi,
    color: theme.text,
    border: `1.5px solid #ffffff`,
    borderRadius: 8,
    textAlign: "center",
    fontSize: isMobile ? 14 : 14,
  };

  const probInput = {
    width: "100%",
    padding: "10px 8px",
    background: theme.panelHi,
    color: theme.text,
    border: `1.5px solid #ffffff`,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 15,
    boxSizing: "border-box",
  };

  const handleCoinsChange = async (fixtureId, stake, side, oddsSnapshot) => {
    if (!authToken || !selectedGameweek) {
      return;
    }

    const MAX_COINS = 10;
    const prevSnapshot = {
      ...coinsState,
      bets: { ...(coinsState?.bets || {}) },
    };

    // Normalise stake
    const rawStake =
      typeof stake === "number" ? stake : parseInt(stake, 10);
    let finalStake = Number.isFinite(rawStake) ? rawStake : 0;
    if (finalStake < 0) finalStake = 0;
    if (finalStake > MAX_COINS) finalStake = MAX_COINS;

    // 1. Clone bets
    const currentBets = { ...(coinsState?.bets || {}) };
    const existingBet = currentBets[fixtureId] || {};

    // ---- NEW LOGIC: default "D" when adding coins ----
    let resolvedSide = side || existingBet.side || null;

    const wasZeroBefore = !existingBet.stake || existingBet.stake <= 0;
    const nowPositive = finalStake > 0;

    if (wasZeroBefore && nowPositive && !resolvedSide) {
      // Stake introduced AND there was no side yet → default to "D"
      resolvedSide = "D";
    }
    // ----------------------------------------------------

    // 2. Update ONLY this fixtureId
    if (finalStake <= 0) {
      // Remove fixture entirely -> clears side automatically
      delete currentBets[fixtureId];
    } else {
      currentBets[fixtureId] = {
        ...existingBet,
        fixtureId,
        gameweek: selectedGameweek,
        stake: finalStake,
        side: resolvedSide,
        oddsSnapshot: oddsSnapshot || existingBet.oddsSnapshot || null,
      };
    }

    // 3. Recompute totalUsed
    let totalUsed = 0;
    Object.values(currentBets).forEach((bet) => {
      const v = Number(bet.stake);
      if (Number.isFinite(v) && v > 0) totalUsed += v;
    });

    // 4. Reject silently if > 10
    if (totalUsed > MAX_COINS) {
      return;
    }

    // Prepare odds
    let odds = null;
    if (oddsSnapshot && typeof oddsSnapshot === "object") {
      odds = {
        home:
          oddsSnapshot.home !== undefined && oddsSnapshot.home !== null
            ? Number(oddsSnapshot.home)
            : null,
        draw:
          oddsSnapshot.draw !== undefined && oddsSnapshot.draw !== null
            ? Number(oddsSnapshot.draw)
            : null,
        away:
          oddsSnapshot.away !== undefined && oddsSnapshot.away !== null
            ? Number(oddsSnapshot.away)
            : null,
      };
    }

    // Always sync local state FIRST
    setCoinsState((prev) => ({
      ...prev,
      gameweek: selectedGameweek,
      used: totalUsed,
      remaining: MAX_COINS - totalUsed,
      bets: currentBets,
    }));

    // Decide whether to call backend
    const validSide = resolvedSide === "H" || resolvedSide === "D" || resolvedSide === "A";

    let payload = null;

    if (finalStake > 0 && validSide) {
      payload = {
        gameweek: selectedGameweek,
        fixtureId,
        stake: finalStake,
        side: resolvedSide,
        odds,
        mode: gameMode,
      };
    } else if (finalStake === 0) {
      if (existingBet && existingBet.stake > 0) {
        payload = {
          gameweek: selectedGameweek,
          fixtureId,
          stake: 0,
          side: existingBet.side || null,
          odds,
          mode: gameMode,
        };
      }
    }

    if (!payload) {
      return;
    }

    try {
      setCoinsState((prev) => ({
        ...prev,
        loading: true,
        error: "",
      }));

      await apiPlaceCoinsBet(authToken, payload);

      setCoinsState((prev) => ({
        ...prev,
        loading: false,
        error: "",
      }));
    } catch (err) {
      console.error("handleCoinsChange error", err);
      const msg = err?.message || "Failed to place coins bet";

      if (err?.message === "Unauthorized") {
        setAuthError("Session expired. Please log in again.");
        handleLogout();
        return;
      }

      setCoinsState((prev) => ({
        ...prevSnapshot,
        loading: false,
        error: msg,
      }));

      alert(msg);
    }
  };

  // ---------- LOGIN PAGE ----------
if (!isLoggedIn) {
  if (isResetPasswordRoute) {
    return (
      <div style={{
        ...pageStyle,
        maxWidth: 1200,
        margin: "0 auto",
        padding: isMobile ? "8px" : "16px"
      }}>
        <div style={{ display: "grid", gap: 12 }}>
          <header
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              marginBottom: 10,
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 12, overflow: "hidden" }}>
              <img
                src="/icon_64.png"
                alt="Prediction Addiction logo"
                style={{ width: "100%", height: "100%" }}
              />
            </div>
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? 24 : 32,
                letterSpacing: 0.4,
                textTransform: "uppercase",
                color: theme.accent,
                textAlign: "center",
                whiteSpace: "nowrap",
              }}
            >
              PREDICTION ADDICTION
            </h1>
          </header>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: 12,
              maxWidth: window.innerWidth <= 600 ? 480 : 560,
              width: "100%",
              margin: "0 auto",
            }}
          >
            <section style={cardStyle}>
              <h2 style={{ marginTop: 0, fontSize: 18 }}>Reset password</h2>
              <form onSubmit={handleResetPassword} style={{ display: "grid", gap: 8 }}>
                <div style={{ fontSize: 13, color: theme.muted }}>
                  Paste your reset token and choose a new password.
                </div>
                <input
                  type="text"
                  value={resetTokenInput}
                  onChange={(e) => setResetTokenInput(e.target.value)}
                  placeholder="Reset token"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: theme.panelHi,
                    color: theme.text,
                    border: `1px solid ${theme.line}`,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
                <input
                  type="password"
                  value={resetPasswordInput}
                  onChange={(e) => setResetPasswordInput(e.target.value)}
                  placeholder="New password"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 10,
                    background: theme.panelHi,
                    color: theme.text,
                    border: `1px solid ${theme.line}`,
                    fontSize: 14,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="submit"
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 10,
                    border: `1px solid ${theme.accent2}`,
                    background: "rgba(34,197,94,0.15)",
                    color: theme.text,
                    cursor: "pointer",
                  }}
                >
                  Reset password
                </button>
                {resetError && (
                  <div style={{ fontSize: 13, color: theme.danger }}>{resetError}</div>
                )}
                {resetSuccess && (
                  <div style={{ fontSize: 13, color: theme.accent2 }}>{resetSuccess}</div>
                )}
              </form>
              <button
                type="button"
                onClick={() => {
                  window.location.href = "/";
                }}
                style={{
                  marginTop: 12,
                  border: "none",
                  background: "transparent",
                  color: theme.accent,
                  cursor: "pointer",
                  fontSize: 13,
                  padding: 0,
                }}
              >
                Back to login
              </button>
            </section>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div style={{ ...pageStyle, maxWidth: 1320, margin: "0 auto", padding: isMobile ? "10px" : "20px" }}>
      <div style={{ display: "grid", gap: 18 }}>
        <header
          style={{
            display: "grid",
            alignItems: "center",
            justifyContent: "center",
            justifyItems: "center",
            gap: 8,
            marginBottom: 6,
            textAlign: "center",
          }}
        >
          <div
            style={{
              width: isMobile ? 62 : 78,
              height: isMobile ? 62 : 78,
              borderRadius: 20,
              overflow: "hidden",
              boxShadow: "0 14px 28px rgba(0,0,0,0.28)",
            }}
          >
            <img
              src="/icon_64.png"
              alt="Prediction Addiction logo"
              style={{ width: "100%", height: "100%" }}
            />
          </div>
          <div style={{ textAlign: "center", display: "grid", gap: 3 }}>
            <h1
              style={{
                margin: 0,
                fontSize: isMobile ? 27 : 38,
                letterSpacing: 0.6,
                textTransform: "uppercase",
                color: theme.accent,
                whiteSpace: "nowrap",
              }}
            >
              Prediction Addiction
            </h1>
            <div style={{ fontSize: 12, color: theme.muted, letterSpacing: 1.2, textTransform: "uppercase" }}>
              Predictions, leagues, coins, bragging rights
            </div>
          </div>
        </header>

        <section
          style={{
            ...cardStyle,
            padding: isMobile ? 14 : 20,
            background: "linear-gradient(180deg, rgba(11,18,32,0.98), rgba(17,24,39,0.98))",
            border: `1px solid ${theme.line}`,
            boxShadow: "0 18px 42px rgba(0,0,0,0.28)",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr",
              gap: isMobile ? 16 : 18,
              alignItems: "center",
            }}
          >
            <div style={{ display: "grid", gap: 16, justifyItems: "center", textAlign: "center" }}>
              <div style={{ display: "grid", gap: 12, justifyItems: "center" }}>
                <div
                  style={{
                    display: "inline-flex",
                    width: "fit-content",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    padding: "6px 12px",
                    borderRadius: 999,
                    background: "rgba(56,189,248,0.12)",
                    border: "1px solid rgba(56,189,248,0.24)",
                    color: theme.accent,
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: 0.8,
                    textTransform: "uppercase",
                  }}
                >
                  Prediction hub
                </div>
                <div style={{ display: "grid", gap: 8, justifyItems: "center" }}>
                  <h2
                    style={{
                      margin: 0,
                      fontSize: isMobile ? 30 : 42,
                      lineHeight: 1.04,
                      color: "#ffffff",
                      letterSpacing: -0.8,
                      textAlign: "center",
                    }}
                  >
                    Predict every score.
                    <br />
                    Chase every point.
                  </h2>
                  <p
                    style={{
                      margin: 0,
                      maxWidth: 520,
                      color: theme.muted,
                      fontSize: isMobile ? 15 : 17,
                      lineHeight: 1.5,
                      textAlign: "center",
                    }}
                  >
                    Make weekly predictions, back your calls with coins, track live probabilities,
                    build mini-leagues, and run your own tournament inside one app.
                  </p>
                </div>
              </div>

              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
                <button
                  type="button"
                  onClick={() => {
                    document.getElementById("auth-panel")?.scrollIntoView({ behavior: "smooth", block: "center" });
                  }}
                  style={{
                    minWidth: isMobile ? "100%" : 180,
                    padding: "12px 18px",
                    borderRadius: 999,
                    border: `1px solid ${theme.accent}`,
                    background: "transparent",
                    color: theme.text,
                    fontSize: 16,
                    fontWeight: 700,
                    cursor: "pointer",
                  }}
                >
                  Log in
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignupPanel(true);
                    window.requestAnimationFrame(() => {
                      window.requestAnimationFrame(() => {
                        document.getElementById("signup-panel")?.scrollIntoView({
                          behavior: "smooth",
                          block: "start",
                        });
                      });
                    });
                  }}
                  style={{
                    minWidth: isMobile ? "100%" : 180,
                    padding: "12px 18px",
                    borderRadius: 999,
                    border: "1px solid rgba(56,189,248,0.18)",
                    background: theme.accent,
                    color: "#08111f",
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: "pointer",
                    boxShadow: "0 10px 24px rgba(0,0,0,0.18)",
                  }}
                >
                  Register now
                </button>
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 10,
                  width: "100%",
                  maxWidth: 760,
                }}
              >
                {[
                  ["Predictions", "Lock in every score before deadline"],
                  ["Mini-leagues", "Create private tables and cups"],
                  ["Coins Game", "Back outcomes and chase returns"],
                ].map(([label, text]) => (
                  <div
                    key={label}
                    style={{
                      padding: "12px 14px",
                      borderRadius: 16,
                      background: theme.panelHi,
                      border: `1px solid ${theme.line}`,
                    }}
                  >
                    <div style={{ color: "#ffffff", fontWeight: 800, fontSize: 15 }}>{label}</div>
                    <div style={{ marginTop: 4, color: theme.muted, fontSize: 12, lineHeight: 1.4 }}>{text}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile ? "1fr" : "minmax(320px, 420px) minmax(0, 1fr)",
            gap: 18,
            alignItems: "start",
          }}
        >
          <section
            id="auth-panel"
            style={{
              ...cardStyle,
              padding: isMobile ? 16 : 18,
              position: "sticky",
              top: 14,
            }}
          >
            <div style={{ display: "grid", gap: 14 }}>
              <div>
                <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1, color: theme.muted }}>Account access</div>
                <h2 style={{ margin: "6px 0 0", fontSize: 28, color: "#fff" }}>Log in</h2>
              </div>

              <form onSubmit={(e) => e.preventDefault()} style={{ display: "grid", gap: 10 }}>
                <label style={{ fontSize: 13, color: theme.muted }}>
                  Username
                  <input
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: theme.panelHi,
                      color: theme.text,
                      border: `1px solid ${theme.line}`,
                      fontSize: 15,
                      boxSizing: "border-box",
                    }}
                    type="text"
                    value={loginName}
                    onChange={(e) => setLoginName(e.target.value)}
                    placeholder="e.g. Phil"
                    autoComplete="username"
                  />
                </label>

                <label style={{ fontSize: 13, color: theme.muted }}>
                  Password
                  <input
                    style={{
                      width: "100%",
                      marginTop: 6,
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: theme.panelHi,
                      color: theme.text,
                      border: `1px solid ${theme.line}`,
                      fontSize: 15,
                      boxSizing: "border-box",
                    }}
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••"
                    autoComplete="current-password"
                  />
                </label>

                <button
                  type="button"
                  onClick={(e) => handleAuthSubmit(e, "login")}
                  disabled={authLoading}
                  style={{
                    width: "100%",
                    padding: "12px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: "linear-gradient(90deg, #0ea5e9, #38bdf8)",
                    color: "#08111f",
                    fontSize: 16,
                    fontWeight: 800,
                    cursor: authLoading ? "wait" : "pointer",
                    opacity: authLoading ? 0.6 : 1,
                  }}
                >
                  {authLoading ? "Logging in..." : "Log in"}
                </button>
              </form>

              <div style={{ height: 1, background: theme.line }} />

              <button
                id="signup-panel"
                type="button"
                onClick={() => setShowSignupPanel((v) => !v)}
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "14px 16px",
                  borderRadius: 16,
                  border: `1px solid ${theme.line}`,
                  background: theme.panelHi,
                  color: theme.text,
                  cursor: "pointer",
                  textAlign: "left",
                }}
              >
                <span>
                  <span style={{ display: "block", fontSize: 18, fontWeight: 700 }}>Create account</span>
                  <span style={{ display: "block", marginTop: 2, fontSize: 12, color: theme.muted }}>
                    New here? Build your profile and start competing.
                  </span>
                </span>
                <span style={{ fontSize: 22, color: theme.accent2, lineHeight: 1 }}>{showSignupPanel ? "−" : "+"}</span>
              </button>

              {showSignupPanel && (
                <form onSubmit={(e) => e.preventDefault()} style={{ display: "grid", gap: 10 }}>
                  <label style={{ fontSize: 13, color: theme.muted }}>
                    Username
                    <input
                      style={{
                        width: "100%",
                        marginTop: 6,
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: theme.panelHi,
                        color: theme.text,
                        border: `1px solid ${theme.line}`,
                        fontSize: 15,
                        boxSizing: "border-box",
                      }}
                      type="text"
                      value={signupName}
                      onChange={(e) => setSignupName(e.target.value.slice(0, MAX_USERNAME_LENGTH))}
                      placeholder={`Choose a username (${MAX_USERNAME_LENGTH} max)`}
                      maxLength={MAX_USERNAME_LENGTH}
                      autoComplete="username"
                    />
                  </label>

                  <label style={{ fontSize: 13, color: theme.muted }}>
                    Password
                    <input
                      style={{
                        width: "100%",
                        marginTop: 6,
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: theme.panelHi,
                        color: theme.text,
                        border: `1px solid ${theme.line}`,
                        fontSize: 15,
                        boxSizing: "border-box",
                      }}
                      type="password"
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      placeholder="Create a password"
                      autoComplete="new-password"
                    />
                  </label>

                  <label style={{ fontSize: 13, color: theme.muted }}>
                    Email
                    <input
                      style={{
                        width: "100%",
                        marginTop: 6,
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: theme.panelHi,
                        color: theme.text,
                        border: `1px solid ${theme.line}`,
                        fontSize: 15,
                        boxSizing: "border-box",
                      }}
                      type="email"
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      placeholder="you@example.com"
                      autoComplete="email"
                    />
                  </label>

                  <label style={{ fontSize: 13, color: theme.muted }}>
                    Favourite Premier League team
                    <select
                      value={signupFavoriteTeam}
                      onChange={(e) => setSignupFavoriteTeam(e.target.value)}
                      style={{
                        width: "100%",
                        marginTop: 6,
                        padding: "12px 14px",
                        borderRadius: 14,
                        background: theme.panelHi,
                        color: theme.text,
                        border: `1px solid ${theme.line}`,
                        fontSize: 15,
                        boxSizing: "border-box",
                      }}
                    >
                      <option value="">Select team...</option>
                      {PREMIER_LEAGUE_TEAMS.map((team) => (
                        <option key={team} value={team}>
                          {team}
                        </option>
                      ))}
                    </select>
                  </label>

                  <button
                    type="button"
                    onClick={(e) => handleAuthSubmit(e, "signup")}
                    disabled={authLoading}
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 999,
                      border: "1px solid rgba(255,255,255,0.16)",
                      background: "linear-gradient(90deg, #22c55e, #86efac)",
                      color: "#06240f",
                      fontSize: 16,
                      fontWeight: 800,
                      cursor: authLoading ? "wait" : "pointer",
                      opacity: authLoading ? 0.6 : 1,
                    }}
                  >
                    {authLoading ? "Creating..." : "Create account"}
                  </button>
                </form>
              )}

              {authError && (
                <div
                  style={{
                    background: "rgba(239,68,68,0.12)",
                    border: "1px solid rgba(239,68,68,0.5)",
                    color: theme.text,
                    padding: "10px 12px",
                    borderRadius: 12,
                    fontSize: 13,
                  }}
                >
                  {authError}
                </div>
              )}

              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => {
                    setShowForgotPassword((v) => !v);
                    setForgotError("");
                    setForgotSuccess("");
                  }}
                  style={{
                    border: "none",
                    background: "transparent",
                    color: theme.accent,
                    cursor: "pointer",
                    fontSize: 13,
                    padding: 0,
                  }}
                >
                  {showForgotPassword ? "Hide forgot password" : "Forgot password?"}
                </button>
              </div>

              {showForgotPassword && (
                <form onSubmit={handleForgotPassword} style={{ display: "grid", gap: 8 }}>
                  <div style={{ fontSize: 13, color: theme.muted }}>
                    Enter your username and recovery email.
                  </div>
                  <input
                    type="text"
                    value={forgotUsername}
                    onChange={(e) => setForgotUsername(e.target.value)}
                    placeholder="Username"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: theme.panelHi,
                      color: theme.text,
                      border: `1px solid ${theme.line}`,
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Recovery email"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 14,
                      background: theme.panelHi,
                      color: theme.text,
                      border: `1px solid ${theme.line}`,
                      fontSize: 14,
                      boxSizing: "border-box",
                    }}
                  />
                  <button
                    type="submit"
                    style={{
                      width: "100%",
                      padding: "12px 14px",
                      borderRadius: 999,
                      border: `1px solid ${theme.accent}`,
                      background: "rgba(56,189,248,0.15)",
                      color: theme.text,
                      cursor: "pointer",
                      fontWeight: 700,
                    }}
                  >
                    Send reset link
                  </button>
                  {forgotError && (
                    <div style={{ fontSize: 13, color: theme.danger }}>{forgotError}</div>
                  )}
                  {forgotSuccess && (
                    <div style={{ fontSize: 13, color: theme.accent2 }}>{forgotSuccess}</div>
                  )}
                </form>
              )}
            </div>
          </section>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
              gap: 14,
            }}
          >
            {[
              ["/auth-showcase/table.jpg", "Table insight", "Form and difficulty in one place."],
              ["/auth-showcase/results.jpg", "Results and returns", "Track points, coins, and settled matches."],
              ["/auth-showcase/leagues.jpg", "Mini-leagues", "Create private rooms and compete with mates."],
            ].map(([src, title, copy]) => (
              <section
                key={title}
                style={{
                  ...cardStyle,
                  overflow: "hidden",
                  padding: 0,
                  display: "grid",
                }}
              >
                <div style={{ height: isMobile ? 180 : 190, overflow: "hidden", background: theme.panelHi }}>
                  <img
                    src={src}
                    alt={title}
                    style={{
                      width: "100%",
                      height: "100%",
                      objectFit: "cover",
                      objectPosition: "center top",
                    }}
                  />
                </div>
                <div style={{ padding: "14px 14px 16px" }}>
                  <div style={{ color: "#ffffff", fontSize: 20, fontWeight: 800, lineHeight: 1.06 }}>{title}</div>
                  <div style={{ marginTop: 8, color: theme.muted, fontSize: 13, lineHeight: 1.45 }}>{copy}</div>
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
  }

  if (showWelcomePage) {
    return (
      <div style={{ ...pageStyle, maxWidth: 980, margin: "0 auto", padding: isMobile ? "12px" : "24px" }}>
        <div style={{ display: "grid", gap: 16 }}>
          <header
            style={{
              display: "grid",
              gridTemplateColumns: isMobile ? "1fr" : "140px minmax(0, 1fr) 140px",
              alignItems: "center",
              gap: 16,
            }}
          >
            <div style={{ display: isMobile ? "none" : "block" }} />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 12,
                textAlign: "center",
                flexWrap: isMobile ? "wrap" : "nowrap",
              }}
            >
              <div
                style={{
                  width: 54,
                  height: 54,
                  borderRadius: 16,
                  overflow: "hidden",
                  boxShadow: "0 14px 28px rgba(0,0,0,0.28)",
                  flex: "0 0 auto",
                }}
              >
                <img
                  src="/icon_64.png"
                  alt="Prediction Addiction app icon"
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
              </div>
              <div>
                <div style={{ fontSize: 12, color: theme.muted, textTransform: "uppercase", letterSpacing: 1 }}>
                  {shouldShowWelcome ? "Account created" : "Welcome Video"}
                </div>
                <h1 style={{ margin: "3px 0 0", fontSize: isMobile ? 26 : 34, color: "#ffffff" }}>
                  Welcome, {currentPlayer}
                </h1>
              </div>
            </div>
            <button
              type="button"
              onClick={() => completeWelcome("predictions")}
              style={{
                justifySelf: "center",
                padding: "10px 16px",
                borderRadius: 999,
                border: "1px solid rgba(255,255,255,0.16)",
                background: theme.accent,
                color: "#08111f",
                cursor: "pointer",
                fontWeight: 800,
                fontSize: 14,
              }}
            >
              Continue
            </button>
          </header>

          <section
            style={{
              ...cardStyle,
              padding: isMobile ? 16 : 22,
              display: "grid",
              gap: 18,
              background: "linear-gradient(180deg, rgba(11,18,32,0.98), rgba(17,24,39,0.98))",
            }}
          >
            <div style={{ display: "grid", gap: 8 }}>
              <h2 style={{ margin: 0, color: "#ffffff", fontSize: isMobile ? 24 : 30 }}>
                Welcome to Prediction Addiction.
              </h2>
              <p style={{ margin: 0, color: theme.muted, lineHeight: 1.55, fontSize: 15 }}>
                Watch this quick introduction, then continue to make your predictions.
              </p>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  paddingTop: 4,
                  color: theme.muted,
                  lineHeight: 1.5,
                  fontSize: 14,
                }}
              >
                <div style={{ flex: 1 }}>
                  Be sure to add this webpage to your homescreen on your mobile/cell phone.
                  The website will then work like an app, the icon for the game will look like this.
                </div>
                <img
                  src="/icon_180.png"
                  alt="Prediction Addiction home screen icon"
                  style={{
                    width: isMobile ? 54 : 64,
                    height: isMobile ? 54 : 64,
                    borderRadius: 16,
                    boxShadow: "0 10px 22px rgba(0,0,0,0.28)",
                    flex: "0 0 auto",
                  }}
                />
              </div>
            </div>

            <div
              style={{
                borderRadius: 12,
                overflow: "hidden",
                border: `1px solid ${theme.line}`,
                background: "#020617",
                boxShadow: "0 18px 40px rgba(0,0,0,0.28)",
              }}
            >
              <video
                src={WELCOME_VIDEO_SRC}
                controls
                playsInline
                preload="metadata"
                style={{
                  width: "100%",
                  display: "block",
                  aspectRatio: "16 / 9",
                  background: "#020617",
                }}
              >
                Your browser does not support the welcome video.
              </video>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.45, maxWidth: 520 }}>
                You can replay this any time from the Welcome Video option in the main menu.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => completeWelcome("predictions")}
                  style={{
                    padding: "9px 14px",
                    borderRadius: 999,
                    border: "1px solid rgba(255,255,255,0.16)",
                    background: theme.accent2,
                    color: "#06240f",
                    cursor: "pointer",
                    fontWeight: 800,
                  }}
                >
                  Continue
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  const swipeMenuItems = [
    { id: "predictions", enabled: true },
    { id: "results", enabled: true },
    { id: "summary", enabled: true },
    { id: "predictionIq", enabled: !isWorldCupMode },
    { id: "badges", enabled: true },
    { id: "history", enabled: true },
    { id: "winprob", enabled: true },
    { id: "settings", enabled: true },
    { id: "rules", enabled: true },
    { id: "welcome", enabled: true },
  ].filter((item) => item.enabled);
  const swipeLeagueMenuItems = (isWorldCupMode
    ? [
        { id: "league" },
        { id: "worldCupGroupTables" },
        { id: "coinsLeague" },
        { id: "globalLeague" },
        { id: "leagues" },
      ]
    : [
        { id: "league" },
        { id: "globalLeague" },
        { id: "premierLeagueTable" },
        { id: "coinsLeague" },
        { id: "leagues" },
      ]);
  const getSwipeNavigationItems = () => {
    const activeInLeagueMenu = swipeLeagueMenuItems.some((item) => item.id === activeView);
    return activeInLeagueMenu ? swipeLeagueMenuItems : swipeMenuItems;
  };

  const canStartSwipeNavigation = (target) => {
    if (!isMobile || !isLoggedIn || showMobileMenu || showLeaguesMenu) return false;
    if (!target || typeof target.closest !== "function") return true;
    return !target.closest(
      [
        "header",
        "button",
        "a",
        "input",
        "textarea",
        "select",
        "video",
        "[role='button']",
        "[data-swipe-ignore='true']",
      ].join(",")
    );
  };

  const handleSwipeTouchStart = (event) => {
    if (!canStartSwipeNavigation(event.target)) {
      swipeStartRef.current = null;
      return;
    }
    const touch = event.touches?.[0];
    if (!touch) return;
    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      at: Date.now(),
    };
  };

  const handleSwipeTouchEnd = (event) => {
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (!start || !isMobile || !isLoggedIn || showMobileMenu || showLeaguesMenu) return;

    const touch = event.changedTouches?.[0];
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const absX = Math.abs(dx);
    const absY = Math.abs(dy);
    if (absX < 70 || absX < absY * 1.35 || Date.now() - start.at > 800) return;

    const swipeItems = getSwipeNavigationItems();
    const currentIndex = swipeItems.findIndex((item) => item.id === activeView);
    if (currentIndex === -1) return;

    const nextIndex = dx < 0
      ? Math.min(currentIndex + 1, swipeItems.length - 1)
      : Math.max(currentIndex - 1, 0);
    const nextView = swipeItems[nextIndex]?.id;
    if (!nextView || nextView === activeView) return;

    setActiveView(nextView);
    playSwipeSound();
    setShowMobileMenu(false);
    setShowLeaguesMenu(false);
    window.requestAnimationFrame(() => {
      window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    });
  };

  // ---------- MAIN APP ----------
  return (
    <div
      style={pageStyle}
      onTouchStart={handleSwipeTouchStart}
      onTouchEnd={handleSwipeTouchEnd}
      onTouchCancel={() => {
        swipeStartRef.current = null;
      }}
    >
      {showWorldCupFavoritePrompt && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: theme.panel,
              border: `1px solid ${theme.line}`,
              borderRadius: 16,
              padding: 20,
              display: "grid",
              gap: 12,
            }}
          >
            <h3 style={{ margin: 0, fontSize: 20, color: theme.text }}>Pick Your World Cup Country</h3>
            <div style={{ fontSize: 14, color: theme.muted }}>
              Choose your favourite country for World Cup mode. Its flag will show behind your avatar and favourite-team notifications will follow that country.
            </div>
            <select
              value={accountFavoriteCountryInput}
              onChange={(e) => setAccountFavoriteCountryInput(e.target.value)}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: 10,
                border: `1px solid ${theme.line}`,
                background: theme.panelHi,
                color: theme.text,
                fontSize: 14,
              }}
            >
              <option value="">Select country...</option>
              {WORLD_CUP_COUNTRIES.map((country) => (
                <option key={country} value={country}>
                  {getWorldCupFlag(country)} {country}
                </option>
              ))}
            </select>
            <div style={{ display: "flex", gap: 10 }}>
              <button
                type="button"
                onClick={handleSaveFavoriteTeam}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${theme.accent}`,
                  background: theme.accent,
                  color: "#111827",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Save Country
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowWorldCupFavoritePrompt(false);
                  if (currentUserId) {
                    localStorage.setItem(`wc_favorite_prompt_seen_${currentUserId}`, "true");
                  }
                }}
                style={{
                  flex: 1,
                  padding: "10px 12px",
                  borderRadius: 10,
                  border: `1px solid ${theme.line}`,
                  background: theme.panelHi,
                  color: theme.text,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Later
              </button>
            </div>
            {accountFavoriteTeamError && (
              <div style={{ fontSize: 12, color: theme.danger }}>{accountFavoriteTeamError}</div>
            )}
          </div>
        </div>
      )}
      {shouldShowFixtureAdvanceWarning && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="fixture-advance-warning-title"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.62)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9997,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 430,
              background: "linear-gradient(135deg, #0f172a, #111827)",
              border: "1px solid rgba(255,255,255,0.14)",
              borderRadius: 16,
              padding: isMobile ? 16 : 20,
              boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
              display: "grid",
              gap: 12,
              textAlign: "left",
            }}
          >
            <div>
              <div
                id="fixture-advance-warning-title"
                style={{ fontSize: 18, fontWeight: 900, color: theme.text }}
              >
                Fixture times can change
              </div>
              <div style={{ marginTop: 8, color: theme.muted, fontSize: 14, lineHeight: 1.45 }}>
                As fixtures and kick-off times are subject to change, we don't recommend entering predictions too far in advance.
              </div>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "flex-end",
                flexWrap: "wrap",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setSelectedGameweek(livePredictionGameweek);
                  setActiveView("predictions");
                }}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.line}`,
                  background: theme.panelHi,
                  color: theme.text,
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => setFixtureAdvanceWarningDismissedKey(fixtureAdvanceWarningKey)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: theme.accent,
                  color: "#0b1220",
                  fontWeight: 900,
                  cursor: "pointer",
                }}
              >
                Predict anyway
              </button>
            </div>
          </div>
        </div>
      )}
      {showWinnerModal && winnerList.length > 0 && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9999,
            padding: 16,
          }}
        >
          <div className="winner-confetti">
            {winnerConfetti.map((c) => (
              <span
                key={c.id}
                className="confetti-piece"
                style={{
                  left: `${c.left}%`,
                  animationDelay: `${c.delay}s`,
                  animationDuration: `${c.duration}s`,
                  width: c.size,
                  height: c.size * 0.6,
                  backgroundColor: `hsl(${c.hue} 90% 60%)`,
                  transform: `rotate(${c.rotate}deg)`,
                }}
              />
            ))}
          </div>
          <div
            style={{
              width: "100%",
              maxWidth: 420,
              background: "linear-gradient(135deg, #0f172a, #111827)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: 20,
              boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
              textAlign: "center",
              position: "relative",
            }}
          >
            <div style={{ fontSize: 28, marginBottom: 6 }}>🏆🎉</div>
            <div style={{ fontWeight: 800, fontSize: 18, marginBottom: 6 }}>
              {winnerModalType === "season"
                ? (isWorldCupMode ? "World Cup Winner" : "Season Winner")
                : (isWorldCupMode ? "Matchday Winner" : "Gameweek Winner")}
            </div>
            <div style={{ fontSize: 12, color: theme.muted, marginBottom: 12 }}>
              {winnerModalType === "season"
                ? (isWorldCupMode ? "End of World Cup" : "End of Season")
                : getModeGameweekLabel(gameMode, selectedGameweek)}
            </div>
            <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
            <PlayerAvatar
              size={64}
              seed={getAvatarForRow(winnerList[winnerIndex]).seed}
              avatarStyle={getAvatarForRow(winnerList[winnerIndex]).style}
              title={winnerList[winnerIndex]?.player}
              favoriteMode={gameMode}
              favoriteTeam={(() => {
                const winner = winnerList[winnerIndex];
                if (!winner) return "";
                const byId = winner.userId
                  ? activeFavoriteByUserId[String(winner.userId)] || ""
                  : "";
                return byId || activeFavoriteByUsername[winner.player] || "";
              })()}
            />
            </div>
            <div
              style={{
                fontSize: 18,
                fontWeight: 700,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={winnerList[winnerIndex]?.player}
            >
              {formatUsernameForDisplay(winnerList[winnerIndex]?.player)}
            </div>
            <div style={{ marginTop: 6, fontSize: 14, color: theme.muted }}>
              {winnerList[winnerIndex]?.points} points
            </div>
            {winnerList.length > 1 && (
              <div style={{ marginTop: 8, fontSize: 12, color: theme.muted }}>
                Tied winners • showing {winnerIndex + 1}/{winnerList.length}
              </div>
            )}
            <button
              onClick={() => setShowWinnerModal(false)}
              style={{
                marginTop: 16,
                padding: "8px 12px",
                borderRadius: 8,
                border: "none",
                background: theme.accent,
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Close
            </button>
            <div style={{ marginTop: 8, fontSize: 11, color: theme.muted }}>
              Auto‑closes in a few seconds
            </div>
          </div>
        </div>
      )}
      {showPredictionIqModal && !showWinnerModal && !isWorldCupMode && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.62)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 9998,
            padding: 16,
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: 520,
              background: "linear-gradient(135deg, #0f172a, #111827)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 16,
              padding: isMobile ? 14 : 18,
              boxShadow: "0 20px 50px rgba(0,0,0,0.45)",
              position: "relative",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: 10,
                marginBottom: 12,
              }}
            >
              <div>
                <div style={{ fontWeight: 900, fontSize: 18 }}>
                  Prediction IQ Report
                </div>
                <div style={{ fontSize: 12, color: theme.muted, marginTop: 2 }}>
                  {currentPlayer || "Your"} weekly readout
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPredictionIqModal(false)}
                aria-label="Close Prediction IQ report"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${theme.line}`,
                  background: theme.panelHi,
                  color: theme.text,
                  cursor: "pointer",
                  fontSize: 18,
                  lineHeight: 1,
                }}
              >
                ×
              </button>
            </div>
            {renderPredictionIqReport({ compact: true })}
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <button
                type="button"
                onClick={() => {
                  setShowPredictionIqModal(false);
                  setActiveView("predictionIq");
                }}
                style={{
                  flex: 1,
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: theme.accent,
                  color: "#0b1220",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Open report
              </button>
              <button
                type="button"
                onClick={() => setShowPredictionIqModal(false)}
                style={{
                  padding: "9px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.line}`,
                  background: theme.panelHi,
                  color: theme.text,
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      <div style={{ 
        maxWidth: "100%", 
        margin: "0 auto", 
        display: "grid", 
        gap: 12, 
        padding: isMobile ? "0 4px" : "0 16px",
        boxSizing: "border-box",
        overflowX: "visible",
      }}>
        {/* Header */}
                {/* Header */}
        <header
          style={{
            ...cardStyle,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 10,
            position: "sticky",
            top: 8,
            zIndex: 5,
            backdropFilter: "blur(6px)",
            overflow: "visible",
          }}
        >
          {/* Title + API status (centered) */}
          <div style={{ textAlign: "center" }}>
                            <h1
  style={{
    marginTop: "0.8rem",
    marginBottom: "0.5rem",
    fontSize: isMobile ? "1.5rem" : "3rem",
    fontWeight: 700,
    letterSpacing: "0.5px",
    maxWidth: "100%",
    overflow: "visible",
  }}
>

  Predicti
  <span
  className="football-icon"
  role="img"
  aria-label="football"
  style={{
    fontSize: isMobile ? "1.5rem" : "3rem",
    position: "relative",
    top: "-1px",
  }}
>
    ⚽
  </span>
  n Addicti
  <span
  className="football-icon"
  role="img"
  aria-label="football"
  style={{
    fontSize: isMobile ? "1.5rem" : "3rem",
    position: "relative",
    top: "-1px",
  }}
>
    ⚽
  </span>
  n
</h1>
<p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.9 }}>
  {randomTagline}
</p>
<div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: theme.accent }}>
  {getModeLabel(gameMode)} Mode
</div>
            <div
              style={{
                marginTop: 8,
                display: "grid",
                gridTemplateColumns: isMobile ? "58px auto 58px" : "74px auto 74px",
                justifyContent: "center",
                alignItems: "center",
                gap: isMobile ? 6 : 8,
                width: "100%",
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setActiveView(activeView === "predictionIq" ? FANTASY_IQ_VIEW_ID : "predictionIq");
                  setShowMobileMenu(false);
                  setShowLeaguesMenu(false);
                }}
                disabled={isWorldCupMode}
                style={{
                  width: "100%",
                  minHeight: isMobile ? 28 : 31,
                  padding: isMobile ? "5px 4px" : "6px 8px",
                  borderRadius: 999,
                  border: `1px solid ${theme.accent}`,
                  background: activeView === "predictionIq" || activeView === FANTASY_IQ_VIEW_ID ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0.08)",
                  color: activeView === "predictionIq" || activeView === FANTASY_IQ_VIEW_ID ? theme.text : theme.accent,
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 900,
                  cursor: isWorldCupMode ? "default" : "pointer",
                  opacity: isWorldCupMode ? 0 : 1,
                  pointerEvents: isWorldCupMode ? "none" : "auto",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.16)",
                }}
              >
                {activeView === "predictionIq" ? "Fantasy IQ" : "IQ Report"}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (activeView === "predictions") {
                    refreshAutoResults(gameMode, activeFixtures);
                    return;
                  }
                  setActiveView("predictions");
                  setShowMobileMenu(false);
                  setShowLeaguesMenu(false);
                  window.requestAnimationFrame(() => {
                    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
                  });
                }}
                disabled={activeView === "predictions" && resultsRefreshing}
                style={{
                  width: "auto",
                  minWidth: isMobile ? 148 : 178,
                  padding: isMobile ? "6px 12px" : "7px 14px",
                  borderRadius: 999,
                  border: `1px solid ${theme.accent}`,
                  background: theme.accent,
                  color: "#08111f",
                  fontSize: isMobile ? 15 : 17,
                  fontWeight: 900,
                  cursor:
                    activeView === "predictions" && resultsRefreshing ? "wait" : "pointer",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.2)",
                }}
              >
                {activeView === "predictions" ? "Refresh Page" : "Make Predictions"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveView("badges");
                  setShowMobileMenu(false);
                  setShowLeaguesMenu(false);
                }}
                style={{
                  width: "100%",
                  minHeight: isMobile ? 28 : 31,
                  padding: isMobile ? "5px 4px" : "6px 8px",
                  borderRadius: 999,
                  border: `1px solid ${theme.accent}`,
                  background: activeView === "badges" ? "rgba(56,189,248,0.15)" : "rgba(56,189,248,0.08)",
                  color: activeView === "badges" ? theme.text : theme.accent,
                  fontSize: isMobile ? 11 : 12,
                  fontWeight: 900,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.16)",
                }}
              >
                Badges
              </button>
            </div>
          </div>

          {/* Change password / Logout / Menu (uniform buttons, centered) */}

          {/* Change password / Logout / Menu (uniform buttons, centered) */}
          {isLoggedIn && (
  <div
    style={{
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      gap: isMobile ? 4 : 8,
      width: "100%",
      flexWrap: "nowrap", // stay on one line
    }}
  >
    <div style={{ position: "relative", display: "inline-block" }}>
      <button
        type="button"
        onClick={() => {
          setShowMobileMenu(false);
          setShowLeaguesMenu((v) => !v);
        }}
        style={{
          padding: isMobile ? "6px 8px" : "6px 10px",
          borderRadius: 8,
          background: theme.panelHi,
          color: isWorldCupMode ? wcMenuTextColor : theme.text,
          border: `1px solid ${theme.line}`,
          cursor: "pointer",
          fontSize: isMobile ? 11 : 12,
          height: isMobile ? 30 : 32,
          minWidth: isMobile ? 78 : 108,
          textAlign: "center",
          whiteSpace: "nowrap",
        }}
      >
        {"Leagues ▾"}
      </button>
      {showLeaguesMenu && (
        <div
          style={{
            position: "absolute",
            top: "100%",
            left: 0,
            right: "auto",
            marginTop: 6,
            background: theme.panel,
            border: `1px solid ${theme.line}`,
            borderRadius: 10,
            padding: 6,
            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            minWidth: 190,
            maxWidth: "min(280px, calc(100vw - 24px))",
            boxSizing: "border-box",
            zIndex: 1000,
          }}
        >
          {(
            isWorldCupMode
              ? [
                  { action: "mode", mode: PREMIER_MODE, label: "Back to Premier League" },
                  { action: "view", id: "league", label: "WC Mini League Table" },
                  { action: "view", id: "worldCupGroupTables", label: "WC Group Tables" },
                  { action: "view", id: "coinsLeague", label: "WC Coins League" },
                  { action: "view", id: "globalLeague", label: "WC Global League" },
                  { action: "view", id: "leagues", label: "WC Mini-Leagues" },
                ]
              : [
                  { action: "mode", mode: WORLD_CUP_MODE, label: "World Cup Mode" },
                  { action: "view", id: "league", label: "Mini League Table" },
                  { action: "view", id: "globalLeague", label: "Global League Table" },
                  { action: "view", id: "premierLeagueTable", label: "Premier League Table" },
                  { action: "view", id: "coinsLeague", label: "Coins League" },
                  { action: "view", id: "leagues", label: "Mini‑Leagues" },
                ]
          ).map((item) => {
            const itemColor =
              item.action === "mode" && item.mode === PREMIER_MODE
                ? premierModeTextColor
                : item.action === "mode" && item.mode === WORLD_CUP_MODE
                ? wcMenuTextColor
                : isWorldCupMode
                ? wcMenuTextColor
                : undefined;
            return (
            <button
              key={item.id || item.label}
              type="button"
              onClick={() => {
                if (item.action === "mode") {
                  setGameMode(item.mode);
                  setActiveView("predictions");
                } else {
                  setActiveView(item.id);
                }
                setShowLeaguesMenu(false);
                setShowMobileMenu(false);
              }}
              style={{
                ...pillBtn(activeView === item.id),
                display: "block",
                textAlign: "left",
                padding: "6px 10px",
                fontSize: 14,
                whiteSpace: "nowrap",
                color: itemColor,
              }}
            >
              {item.label}
            </button>
            );
          })}
        </div>
      )}
    </div>

    <button
      type="button"
      onClick={() => {
        setActiveView("settings");
        setShowMobileMenu(false);
      }}
      title="Open settings"
      aria-label="Open settings"
      style={{
        width: isMobile ? 30 : 32,
        height: isMobile ? 30 : 32,
        borderRadius: 8,
        border: `1px solid ${theme.line}`,
        background: theme.panelHi,
        color: theme.accent,
        cursor: "pointer",
        fontSize: 16,
        display: "grid",
        placeItems: "center",
        padding: 0,
      }}
    >
      ⚙️
    </button>

    <button
      onClick={handleLogout}
      style={{
        padding: isMobile ? "6px 8px" : "6px 10px",
        borderRadius: 8,
        border: `1px solid ${theme.line}`,
        background: theme.panelHi,
        color: isWorldCupMode ? wcMenuTextColor : theme.text,
        cursor: "pointer",
        fontSize: isMobile ? 11 : 12,
        height: isMobile ? 30 : 32,
        minWidth: isMobile ? 70 : 92,
        textAlign: "center",
        whiteSpace: "nowrap",
      }}
    >
      Log out
    </button>

    <button
      type="button"
      onClick={() => updateSoundEffectsEnabled(!soundEffectsEnabled)}
      title={soundEffectsEnabled ? "Mute sound effects" : "Unmute sound effects"}
      aria-label={soundEffectsEnabled ? "Mute sound effects" : "Unmute sound effects"}
      style={{
        width: isMobile ? 30 : 32,
        height: isMobile ? 30 : 32,
        borderRadius: 8,
        border: `1px solid ${theme.line}`,
        background: theme.panelHi,
        color: soundEffectsEnabled ? theme.accent2 : theme.muted,
        cursor: "pointer",
        fontSize: 16,
        display: "grid",
        placeItems: "center",
        padding: 0,
      }}
    >
      {soundEffectsEnabled ? "🔊" : "🔇"}
    </button>

    {isMobile && (
      <button
        type="button"
        onClick={() => {
          setShowLeaguesMenu(false);
          setShowMobileMenu((v) => !v);
        }}
        style={{
          padding: isMobile ? "6px 8px" : "6px 10px",
          borderRadius: 8,
          border: `1px solid ${theme.line}`,
          background: theme.panelHi,
          color: isWorldCupMode ? wcMenuTextColor : theme.text,
          cursor: "pointer",
          fontSize: isMobile ? 11 : 12,
          height: isMobile ? 30 : 32,
          minWidth: isMobile ? 68 : 108,
          textAlign: "center",
          whiteSpace: "nowrap",
      }}
      >
        Menu ▾
      </button>
    )}
  </div>
)}
        </header>

        {isLoggedIn &&
          accountMeLoaded &&
          favoriteLookupLoaded &&
          !(isWorldCupMode ? resolvedAccountFavoriteCountry : resolvedAccountFavoriteTeam) && (
          <section
            style={{
              ...cardStyle,
              border: `1px solid ${theme.warn}`,
              background: "rgba(245,158,11,0.12)",
              display: "grid",
              gap: 6,
              padding: isMobile ? 10 : 12,
            }}
          >
            <div style={{ fontWeight: 700, fontSize: 14, lineHeight: 1.2 }}>
              {isWorldCupMode ? "Add your favourite country" : "Add your favourite team"}
            </div>
            <div style={{ fontSize: 12, color: theme.muted, lineHeight: 1.25 }}>
              This helps us send optional {isWorldCupMode ? "country" : "team"}-result notifications.
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "nowrap", alignItems: "center" }}>
              <select
                value={isWorldCupMode ? accountFavoriteCountryInput : accountFavoriteTeamInput}
                onChange={(e) => {
                  if (isWorldCupMode) setAccountFavoriteCountryInput(e.target.value);
                  else setAccountFavoriteTeamInput(e.target.value);
                }}
                style={{
                  flex: "1 1 auto",
                  minWidth: 0,
                  padding: "6px 9px",
                  borderRadius: 8,
                  border: `1px solid ${theme.line}`,
                  background: theme.panelHi,
                  color: theme.text,
                  fontSize: 13,
                }}
              >
                <option value="">{isWorldCupMode ? "Select country..." : "Select team..."}</option>
                {(isWorldCupMode ? WORLD_CUP_COUNTRIES : PREMIER_LEAGUE_TEAMS).map((team) => (
                  <option key={team} value={team}>
                    {isWorldCupMode ? `${getWorldCupFlag(team)} ${team}` : team}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={handleSaveFavoriteTeam}
                style={{
                  padding: "6px 10px",
                  borderRadius: 8,
                  border: "none",
                  background: theme.accent,
                  color: "#fff",
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {isWorldCupMode ? "Save Country" : "Save"}
              </button>
            </div>
            {accountFavoriteTeamError && (
              <div style={{ fontSize: 12, color: theme.danger }}>
                {accountFavoriteTeamError}
              </div>
            )}
            {accountFavoriteTeamStatus && (
              <div style={{ fontSize: 12, color: theme.accent2 }}>
                {accountFavoriteTeamStatus}
              </div>
            )}
          </section>
        )}
        
        {showPasswordModal && (
  <div
    style={{
      position: "fixed",
      inset: 0,
      background: "rgba(0,0,0,0.55)",
      display: "grid",
      placeItems: "center",
      zIndex: 9999,
      padding: 16,
    }}
    onClick={() => setShowPasswordModal(false)}
  >
    <div
      style={{
        width: "100%",
        maxWidth: 420,
        background: theme.card,
        color: theme.text,
        border: "1px solid " + theme.border,
        borderRadius: 12,
        padding: 16,
        boxShadow: "0 10px 30px rgba(0,0,0,0.4)",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h2 style={{ marginTop: 0 }}>Change Password</h2>

      <label style={{ fontSize: 12, color: theme.muted }}>Old password</label>
      <input
        type="password"
        value={oldPasswordInput}
        onChange={(e) => setOldPasswordInput(e.target.value)}
        style={{
          width: "100%",
          marginTop: 4,
          marginBottom: 10,
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid " + theme.border,
          background: theme.background,
          color: theme.text,
        }}
      />

      <label style={{ fontSize: 12, color: theme.muted }}>New password</label>
      <input
        type="password"
        value={newPasswordInput}
        onChange={(e) => setNewPasswordInput(e.target.value)}
        style={{
          width: "100%",
          marginTop: 4,
          marginBottom: 10,
          padding: "8px 10px",
          borderRadius: 8,
          border: "1px solid " + theme.border,
          background: theme.background,
          color: theme.text,
        }}
      />

      {passwordError && (
        <div style={{ color: "#ff6b6b", fontSize: 13, marginBottom: 8 }}>
          {passwordError}
        </div>
      )}
      {passwordSuccess && (
        <div style={{ color: "#22c55e", fontSize: 13, marginBottom: 8 }}>
          {passwordSuccess}
        </div>
      )}

      <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
        <button
          onClick={() => setShowPasswordModal(false)}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: "transparent",
            color: theme.text,
            border: "1px solid " + theme.border,
            cursor: "pointer",
          }}
        >
          Cancel
        </button>
        <button
          onClick={handlePasswordChange}
          style={{
            padding: "6px 10px",
            borderRadius: 8,
            background: theme.button,
            color: theme.text,
            border: "1px solid " + theme.border,
            cursor: "pointer",
            fontWeight: 700,
          }}
        >
          Update
        </button>
      </div>
    </div>
  </div>
)}
 {/* Tabs */}
{(() => {
const TABS = [
  { id: "predictions", label: isWorldCupMode ? "WC Predictions" : "Predictions" },
  { id: "results", label: isWorldCupMode ? "WC Results" : "Results" },
  { id: "summary", label: isWorldCupMode ? "WC Summary" : "Summary" },
  ...(!isWorldCupMode ? [{ id: "predictionIq", label: "Prediction IQ" }] : []),
  ...(!isWorldCupMode ? [{ id: FANTASY_IQ_VIEW_ID, label: "Fantasy IQ" }] : []),
  { id: "badges", label: "Badges" },
  { id: "history", label: isWorldCupMode ? "WC History" : "History" },
  { id: "winprob", label: isWorldCupMode ? "WC Win Probability" : "Win Probabilities" },
  { id: "settings", label: isWorldCupMode ? "WC Settings" : "Settings" },
  { id: "rules", label: "Rules" },
  { id: "welcome", label: "Welcome Video" },
];

  // ---- MOBILE: floating dropdown triggered by the header "Menu" button ----
  if (isMobile) {
    if (!showMobileMenu) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 190,          // positioned below the header/menu button
          right: 16,         // aligned with right side
          zIndex: 1000,
        }}
      >
        <div
          style={{
            background: theme.panel,
            border: `1px solid ${theme.line}`,
            borderRadius: 10,
            padding: 6,
            boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
            minWidth: 180,
          }}
        >
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setActiveView(t.id);
                setShowMobileMenu(false);
              }}
              style={{
                ...pillBtn(activeView === t.id),
                display: "block",
                textAlign: "left",
                padding: "6px 10px",
                fontSize: 14,
                whiteSpace: "nowrap", // menu width = longest label
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ---- DESKTOP: keep your pill buttons exactly as before ----
  return (
    <nav
  style={{
    display: "flex",
    gap: 6,
    flexWrap: "wrap",
    justifyContent: "center",  // <--- add this
  }}
>
      {TABS.map((t) => (
        <button
          key={t.id}
          style={pillBtn(activeView === t.id)}
          onClick={() => setActiveView(t.id)}
          type="button"
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
})()}
        {/* Controls */}
        {isWorldCupMode && worldCupOverview && (
          <section
            style={{
              ...cardStyle,
              display: "grid",
              gap: worldCupCentralOpen ? 10 : 0,
              background:
                "linear-gradient(135deg, rgba(245,158,11,0.12), rgba(13,34,49,0.96) 45%, rgba(52,211,153,0.08))",
              border: `1px solid rgba(245,158,11,0.35)`,
            }}
          >
            <button
              type="button"
              onClick={() => setWorldCupCentralOpen((open) => !open)}
              aria-expanded={worldCupCentralOpen}
              style={{
                width: "100%",
                border: "none",
                background: "transparent",
                color: theme.text,
                padding: 0,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 12,
                alignItems: "center",
                cursor: "pointer",
                textAlign: "center",
                font: "inherit",
              }}
            >
              <div>
                <div style={{ fontSize: 11, letterSpacing: 1.2, textTransform: "uppercase", color: theme.accent, fontWeight: 800 }}>
                  World Cup Central
                </div>
                <div style={{ marginTop: 4, fontSize: isMobile ? 18 : 22, fontWeight: 800 }}>
                  {worldCupOverview.stage}
                </div>
              </div>
              <span
                aria-hidden="true"
                style={{
                  color: theme.accent,
                  fontSize: 20,
                  fontWeight: 900,
                  transform: worldCupCentralOpen ? "rotate(90deg)" : "rotate(0deg)",
                  transition: "transform 120ms ease",
                }}
              >
                ›
              </span>
            </button>

            {worldCupCentralOpen && (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(3, minmax(0, 1fr))",
                  gap: 8,
                }}
              >
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px", border: `1px solid ${theme.line}` }}>
                  <div style={{ fontSize: 11, color: theme.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Next Kick-Off</div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>
                    {worldCupOverview.nextFixture
                      ? `${getTeamCode(worldCupOverview.nextFixture.homeTeam, gameMode)} v ${getTeamCode(worldCupOverview.nextFixture.awayTeam, gameMode)}`
                      : "No upcoming match"}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 12, color: theme.muted }}>
                    {worldCupOverview.nextFixture
                      ? `${getWorldCupFixtureLabel(worldCupOverview.nextFixture)} • ${formatFixtureKickoff(worldCupOverview.nextFixture, gameMode)}`
                      : "Schedule complete"}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px", border: `1px solid ${theme.line}` }}>
                  <div style={{ fontSize: 11, color: theme.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Today At The World Cup</div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>
                    {worldCupOverview.todayCount} {worldCupOverview.todayCount === 1 ? "match" : "matches"}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 12, color: theme.muted }}>
                    {getModeGameweekLabel(gameMode, selectedGameweek)}
                  </div>
                </div>
                <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 12, padding: "10px 12px", border: `1px solid ${theme.line}` }}>
                  <div style={{ fontSize: 11, color: theme.muted, textTransform: "uppercase", letterSpacing: 0.8 }}>Favourite Country Watch</div>
                  <div style={{ marginTop: 4, fontWeight: 700 }}>
                    {worldCupOverview.favoriteCountry
                      ? `${getWorldCupFlag(worldCupOverview.favoriteCountry)} ${worldCupOverview.favoriteCountry}`
                      : "No country selected"}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 12, color: theme.muted }}>
                    {worldCupOverview.favoriteFixture
                      ? `Next: ${getTeamCode(worldCupOverview.favoriteFixture.homeTeam, gameMode)} v ${getTeamCode(worldCupOverview.favoriteFixture.awayTeam, gameMode)}`
                      : worldCupOverview.favoriteCountry
                      ? "No upcoming fixture found"
                      : "Pick one in WC Settings"}
                  </div>
                  <div style={{ marginTop: 3, fontSize: 12, color: theme.muted }}>
                    {worldCupOverview.favoriteFixture
                      ? formatCountdownFixtureMeta(worldCupOverview.favoriteFixture, gameMode)
                      : worldCupOverview.favoriteCountry
                      ? "Waiting for next fixture"
                      : ""}
                  </div>
                </div>
              </div>
            )}
          </section>
        )}
        <section
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: activeView === "predictions" ? "auto auto" : "auto",
            gap: isMobile ? 8 : 12,
            alignItems: "center",
            justifyContent: "center",
            justifyItems: "center",
            textAlign: "left",
          }}
        >
                    {activeView === "predictions" && (
                    <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 13, color: theme.muted }}>Player</div>
            {gwLocked && !isWorldCupMode ? (
              <select
                value={currentPlayer}
                onChange={(e) => setCurrentPlayer(e.target.value)}
                style={{
                  padding: "8px 10px",
                  borderRadius: 8,
                  background: theme.panelHi,
                  color: theme.text,
                  border: `1px solid ${theme.line}`,
                  fontSize: 14,
                  width: isMobile ? "9ch" : "11ch",
                  minWidth: isMobile ? 72 : 92,
                  maxWidth: isMobile ? 90 : 120,
                }}
              >
                {PLAYERS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            ) : (
              <div style={{ fontWeight: 700 }}>{currentPlayer}</div>
            )}
          </div>
                    )}

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 13, color: theme.muted }}>
              {isWorldCupMode ? "Matchday" : "Gameweek"}
            </div>
            <select
              value={selectedGameweek}
              onChange={(e) => setSelectedGameweek(Number(e.target.value))}
                style={{
    padding: "6px 10px",
    borderRadius: 8,
    background: theme.panelHi,
    color: theme.text,
    border: `1px solid ${theme.line}`,
    fontSize: 14,
    minWidth: isMobile ? 68 : 74,          // keep GW label visible while freeing space for player select
    textAlignLast: "center",
  }}
            >
              {activeGameweeks.map((gw) => (
                <option key={gw} value={gw}>
                  {getModeGameweekLabel(gameMode, gw)}
                </option>
              ))}
            </select>
            {gwLocked && (
              <div style={{ fontSize: 12, color: theme.warn }}>
                Locked
              </div>
            )}
          </div>
        </section>

                        {/* Predictions View */}
{activeView === "predictions" && (
  <section style={cardStyle}>
    {/* GW title + coins summary (normal header for now) */}
    <div
      style={{
        padding: 10,
        marginBottom: 8,
        background: theme.panel,
        boxShadow: "0 4px 10px rgba(0, 0, 0, 0.4)",
        borderRadius: 12,
        textAlign: "center",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 18 }}>
        {getModeGameweekLabel(gameMode, selectedGameweek)} {isWorldCupMode ? "WC Predictions" : "Predictions"}
      </h2>
      {isWorldCupMode && (
        <div style={{ marginBottom: 8, fontSize: 12, fontWeight: 700, color: theme.accent }}>
          {selectedWorldCupStage}
        </div>
      )}

      {/* Countdown and Coins Summary Row */}
      <div style={{ 
        display: "flex", 
        justifyContent: "space-between", 
        alignItems: "center",
        gap: 0,
        marginBottom: 8,
        flexWrap: "nowrap"
      }}>
        
        {/* COINS USED - Left */}
        {authToken && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              flex: "0 0 60px",
            }}
          >
            <img
              src="/coin_PA_32.png"
              alt="Coin"
              style={{ width: isMobile ? 20 : 24, height: isMobile ? 20 : 24 }}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <strong style={{ fontSize: isMobile ? 16 : 20 }}>{coinsState.used}</strong>
              <span style={{ color: theme.muted, fontSize: 10 }}>used</span>
            </div>
          </div>
        )}
        
        {/* Countdown to next deadline - Center */}
        {!isWorldCupMode && countdown.timeStr && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: isMobile ? 4 : 8,
              flex: "1 1 auto",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 12, color: theme.muted }}>Next Deadline</div>
            
            {/* Time units display */}
            <div
              style={{
                display: "flex",
                gap: isMobile ? 2 : 6,
                alignItems: "center",
              }}
            >
              {/* Days */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: isMobile ? 18 : 28,
                    fontWeight: 700,
                    color: countdown.remaining < 3600000 ? theme.warn : theme.text,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: isMobile ? 30 : 50,
                  }}
                >
                  {String(countdown.days).padStart(2, '0')}
                </div>
                <div style={{ fontSize: isMobile ? 9 : 10, color: theme.muted, marginTop: 1 }}>days</div>
              </div>
              
              <div style={{ fontSize: isMobile ? 16 : 24, fontWeight: 700, color: theme.muted }}>:</div>
              
              {/* Hours */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: isMobile ? 18 : 28,
                    fontWeight: 700,
                    color: countdown.remaining < 3600000 ? theme.warn : theme.text,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: isMobile ? 30 : 50,
                  }}
                >
                  {String(countdown.hours).padStart(2, '0')}
                </div>
                <div style={{ fontSize: isMobile ? 9 : 10, color: theme.muted, marginTop: 1 }}>hours</div>
              </div>
              
              <div style={{ fontSize: isMobile ? 16 : 24, fontWeight: 700, color: theme.muted }}>:</div>
              
              {/* Minutes */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: isMobile ? 18 : 28,
                    fontWeight: 700,
                    color: countdown.remaining < 3600000 ? theme.warn : theme.text,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: isMobile ? 30 : 50,
                  }}
                >
                  {String(countdown.minutes).padStart(2, '0')}
                </div>
                <div style={{ fontSize: isMobile ? 9 : 10, color: theme.muted, marginTop: 1 }}>mins</div>
              </div>
              
              <div style={{ fontSize: isMobile ? 16 : 24, fontWeight: 700, color: theme.muted }}>:</div>
              
              {/* Seconds */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: isMobile ? 18 : 28,
                    fontWeight: 700,
                    color: countdown.remaining < 3600000 ? theme.warn : theme.text,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: isMobile ? 30 : 50,
                  }}
                >
                  {String(countdown.seconds).padStart(2, '0')}
                </div>
                <div style={{ fontSize: isMobile ? 9 : 10, color: theme.muted, marginTop: 1 }}>secs</div>
              </div>
            </div>
          </div>
        )}
        {isWorldCupMode && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 4,
              flex: "1 1 auto",
              justifyContent: "center",
            }}
          >
            {countdown.timeStr && worldCupOverview?.nextFixture ? (
              <>
                <div style={{ fontSize: 12, color: theme.muted }}>Next Kick-Off</div>
                <div
                  style={{
                    display: "flex",
                    gap: isMobile ? 2 : 6,
                    alignItems: "center",
                  }}
                >
                  {[
                    [countdown.days, "days"],
                    [countdown.hours, "hours"],
                    [countdown.minutes, "mins"],
                    [countdown.seconds, "secs"],
                  ].map(([value, label], index) => (
                    <React.Fragment key={label}>
                      <div style={{ textAlign: "center" }}>
                        <div
                          style={{
                            fontSize: isMobile ? 18 : 28,
                            fontWeight: 700,
                            color: countdown.remaining < 3600000 ? theme.warn : theme.text,
                            fontVariantNumeric: "tabular-nums",
                            minWidth: isMobile ? 30 : 50,
                          }}
                        >
                          {String(value).padStart(2, "0")}
                        </div>
                        <div style={{ fontSize: isMobile ? 9 : 10, color: theme.muted, marginTop: 1 }}>{label}</div>
                      </div>
                      {index < 3 && (
                        <div style={{ fontSize: isMobile ? 16 : 24, fontWeight: 700, color: theme.muted }}>:</div>
                      )}
                    </React.Fragment>
                  ))}
                </div>
                <div style={{ fontSize: isMobile ? 11 : 12, color: theme.muted }}>
                  {formatCountdownFixtureMeta(worldCupOverview.nextFixture, gameMode)}
                </div>
              </>
            ) : (
              <>
                <div style={{ fontSize: 12, color: theme.muted }}>Official fixtures loaded</div>
                <div style={{ fontSize: isMobile ? 12 : 13, color: theme.text, fontWeight: 700 }}>
                  {worldCupKickoffTimesSynced
                    ? "Exact kick-off times synced live"
                    : "Scheduled kick-off times loaded"}
                </div>
              </>
            )}
          </div>
        )}

        {/* COINS REMAINING - Right */}
        {authToken && (
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 2,
              flex: "0 0 60px",
            }}
          >
            <img
              src="/coin_PA_32.png"
              alt="Coin"
              style={{ width: isMobile ? 20 : 24, height: isMobile ? 20 : 24 }}
            />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <strong style={{ fontSize: isMobile ? 16 : 20 }}>{coinsState.remaining}</strong>
              <span style={{ color: theme.muted, fontSize: 10 }}>remain</span>
            </div>
          </div>
        )}
      </div>

      {/* Gameweek points so far */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: isMobile ? "8px 12px" : "9px 14px",
            borderRadius: 999,
            border: "2px solid rgba(255, 255, 255, 0.5)",
            background: theme.panelHi,
            fontSize: isMobile ? 12 : 13,
            color: theme.muted,
          }}
        >
          <span>{isWorldCupMode ? "Matchday points so far" : "GW points so far"}</span>
          <span
            style={{
              minWidth: isMobile ? 38 : 44,
              textAlign: "center",
              padding: isMobile ? "3px 9px" : "4px 10px",
              borderRadius: 999,
              fontWeight: 800,
              color:
                currentGwPoints === 0
                  ? "#fff"
                  : currentGwPoints === currentGwTopScore && currentGwPoints > 0
                  ? "#111827"
                  : "#0b1f12",
              background:
                currentGwPoints === 0
                  ? "#ef4444"
                  : currentGwPoints === currentGwTopScore && currentGwPoints > 0
                  ? "#f59e0b"
                  : "#22c55e",
              border:
                currentGwPoints === currentGwTopScore && currentGwPoints > 0
                  ? "2px solid rgba(255,255,255,0.55)"
                  : "2px solid rgba(255,255,255,0.45)",
            }}
          >
            <AnimatedNumber
              value={currentGwPoints}
              duration={450}
              format={(v) => Math.round(v)}
            />
          </span>
        </div>
      </div>
    </div>

    {/* Predictions card with fixtures list */}
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr",
        gap: 8,
      }}
    >
      {visibleFixtures.map((fixture) => {
        const pred =
          predictions[currentPredictionKey]?.[fixture.id] || {};
        const locked = isPredictionLocked(fixture);
        const o = generatedModelOddsByFixture[fixture.id] || odds[fixture.id] || {};
        // eslint-disable-next-line no-unused-vars
        const probs = computeProbabilities(o);

        const r = results[fixture.id];
        const hasResult =
          hasValidResultScore(r);
        const scoreLabel = getScoreLabel(matchStatesByFixtureId[fixture.id]);
        const fixtureLive = isFixtureLive(matchStatesByFixtureId[fixture.id]);
        const pointsForThisFixture = hasResult
          ? getTotalPoints(pred, r)
          : null;
        const fixturePushEnabled = !!fixturePushPrefs[String(fixture.id)];

        const coinsBet =
          (coinsState.bets && coinsState.bets[fixture.id]) || {};
        const coinsStake = coinsBet.stake ?? 0;
        const coinsSide = coinsBet.side || "D";

        // Possible win/return for this fixture (based on current stake + side)
        let coinsPossibleReturn = 0;
        const oddsSnap = coinsBet.oddsSnapshot || null;

        if (coinsStake > 0 && coinsSide && oddsSnap) {
          let price = null;

          if (coinsSide === "H") {
            price =
              oddsSnap.home !== undefined && oddsSnap.home !== null
                ? Number(oddsSnap.home)
                : null;
          } else if (coinsSide === "D") {
            price =
              oddsSnap.draw !== undefined && oddsSnap.draw !== null
                ? Number(oddsSnap.draw)
                : null;
          } else if (coinsSide === "A") {
            price =
              oddsSnap.away !== undefined && oddsSnap.away !== null
                ? Number(oddsSnap.away)
                : null;
          }

          if (price != null && Number.isFinite(price) && price > 0) {
            coinsPossibleReturn = coinsStake * price;
          }
        }

        const coinsWin =
          hasResult && coinsStake > 0 && coinsSide === getResult(r.homeGoals, r.awayGoals);
        const coinsPossibleReturnColor =
          coinsStake <= 0
            ? theme.muted
            : !hasResult
            ? "#ffffff"
            : coinsWin
            ? "#22c55e"
            : "#ef4444";

        return (
          <div
            key={fixture.id}
            style={{
              background: theme.panelHi,
              borderRadius: 12,
              border: fixtureLive
                ? "2px solid #22c55e"
                : "1px solid rgba(255, 255, 255, 0.3)",
              padding: 8,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 8,
              alignItems: "flex-start",
              maxWidth: "100%",
              overflow: "hidden",
              boxSizing: "border-box",
            }}
          >
            {/* Left content column */}
            <div style={{ display: "grid", gap: 6, minHeight: 92, maxWidth: "100%", overflow: "hidden", justifyItems: "center" }}>
              {/* Kickoff time */}
              <div
                style={{
                  width: "100%",
                  textAlign: "center",
                  fontSize: 12,
                  color: theme.muted,
                  marginBottom: 6,
                }}
              >
                {isWorldCupMode && (
                  <div style={{ marginBottom: 6 }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                        padding: "4px 10px",
                        borderRadius: 999,
                        background: "rgba(245,158,11,0.14)",
                        border: "1px solid rgba(245,158,11,0.3)",
                        color: theme.accent,
                        fontSize: 11,
                        fontWeight: 800,
                        letterSpacing: 0.3,
                      }}
                    >
                      {getWorldCupFixtureLabel(fixture)}
                    </span>
                  </div>
                )}
                {formatFixtureKickoff(fixture, gameMode)}
              </div>

              {/* Main score row */}
              <div
                style={{
                  display: "flex",
                  gap: isMobile ? 4 : 4,
                  alignItems: "flex-end",
                  flexWrap: "nowrap",
                  justifyContent: "center",
                  maxWidth: "100%",
                  boxSizing: "border-box",
                  overflow: "hidden",
                }}
              >
                {/* HOME */}
                <div
                  style={{
                    display: "flex",
                    gap: isMobile ? 4 : 4,
                    alignItems: "center",
                    flex: "0 1 auto",
                    minWidth: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flex: "0 1 auto",
                    }}
                  >
                    {isWorldCupMode ? (
                      <span style={{ marginRight: isMobile ? 3 : 4, fontSize: isMobile ? 16 : 18 }}>
                        {getWorldCupFlag(fixture.homeTeam)}
                      </span>
                    ) : resolveTeamBadge(fixture.homeTeam) ? (
                      <img
                        src={resolveTeamBadge(fixture.homeTeam)}
                        alt={fixture.homeTeam}
                        style={{
                          width: isMobile ? 18 : 20,
                          height: isMobile ? 18 : 20,
                          objectFit: "contain",
                          marginRight: isMobile ? 3 : 4,
                        }}
                      />
                    ) : null}
                    <span
                      style={{ fontSize: isMobile ? 12 : 12, color: "#ffffff", fontWeight: 600 }}
                    >
                      {getTeamCode(fixture.homeTeam, gameMode)}
                    </span>
                  </div>

                  {/* Home score with +/- buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 2 : 4, flex: "0 0 auto" }}>
                    <button
                      type="button"
                      disabled={locked || (pred.homeGoals || 0) <= 0}
                      onClick={() => {
                        const current = Number(pred.homeGoals || 0);
                        if (current > 0) playScoreSound(false);
                        updatePrediction(currentPredictionKey, fixture.id, {
                          homeGoals: Math.max(0, current - 1).toString(),
                        });
                      }}
                      style={{
                        width: isMobile ? 24 : 24,
                        height: isMobile ? 24 : 24,
                        padding: 0,
                        border: (pred.homeGoals || 0) <= 0 ? `2px solid rgba(255, 255, 255, 0.5)` : `1px solid ${theme.line}`,
                        borderRadius: 6,
                        background: (pred.homeGoals || 0) <= 0 ? theme.panelHi : theme.accent,
                        color: (pred.homeGoals || 0) <= 0 ? theme.text : "#ffffff",
                        cursor: locked || (pred.homeGoals || 0) <= 0 ? "not-allowed" : "pointer",
                        fontSize: isMobile ? 15 : 16,
                        fontWeight: 700,
                        opacity: locked || (pred.homeGoals || 0) <= 0 ? 0.3 : 1,
                      }}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      style={smallInput}
                      value={pred.homeGoals || ""}
                      disabled={locked}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        updatePrediction(currentPredictionKey, fixture.id, {
                          homeGoals: val,
                        });
                      }}
                    />
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        const current = Number(pred.homeGoals || 0);
                        playScoreSound(true);
                        updatePrediction(currentPredictionKey, fixture.id, {
                          homeGoals: (current + 1).toString(),
                        });
                      }}
                      style={{
                        width: 24,
                        height: 24,
                        padding: 0,
                        border: `1px solid ${theme.line}`,
                        borderRadius: 6,
                        background: locked ? theme.panelHi : theme.accent2,
                        color: locked ? theme.text : "#ffffff",
                        cursor: locked ? "not-allowed" : "pointer",
                        fontSize: 16,
                        fontWeight: 700,
                        opacity: locked ? 0.3 : 1,
                      }}
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* VS */}
                <span
                  style={{
                    color: theme.muted,
                    fontWeight: 700,
                    alignSelf: "center",
                    fontSize: isMobile ? 16 : 18,
                    margin: isMobile ? "0 6px" : "0 12px",
                  }}
                >
                  VS
                </span>

                {/* AWAY */}
                <div
                  style={{
                    display: "flex",
                    gap: 4,
                    alignItems: "center",
                    flex: "0 1 auto",
                    minWidth: 0,
                  }}
                >
                  {/* Away score with +/- buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 2 : 4, flex: "0 0 auto" }}>
                    <button
                      type="button"
                      disabled={locked || (pred.awayGoals || 0) <= 0}
                      onClick={() => {
                        const current = Number(pred.awayGoals || 0);
                        if (current > 0) playScoreSound(false);
                        updatePrediction(currentPredictionKey, fixture.id, {
                          awayGoals: Math.max(0, current - 1).toString(),
                        });
                      }}
                      style={{
                        width: isMobile ? 24 : 24,
                        height: isMobile ? 24 : 24,
                        padding: 0,
                        border: (pred.awayGoals || 0) <= 0 ? `2px solid rgba(255, 255, 255, 0.5)` : `1px solid ${theme.line}`,
                        borderRadius: 6,
                        background: (pred.awayGoals || 0) <= 0 ? theme.panelHi : theme.accent,
                        color: (pred.awayGoals || 0) <= 0 ? theme.text : "#ffffff",
                        cursor: locked || (pred.awayGoals || 0) <= 0 ? "not-allowed" : "pointer",
                        fontSize: isMobile ? 15 : 16,
                        fontWeight: 700,
                        opacity: locked || (pred.awayGoals || 0) <= 0 ? 0.3 : 1,
                      }}
                    >
                      −
                    </button>
                    <input
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]*"
                      min="0"
                      style={smallInput}
                      value={pred.awayGoals || ""}
                      disabled={locked}
                      onChange={(e) => {
                        const val = e.target.value.replace(/[^0-9]/g, '');
                        updatePrediction(
                          currentPredictionKey,
                          fixture.id,
                          { awayGoals: val }
                        );
                      }}
                    />
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        const current = Number(pred.awayGoals || 0);
                        playScoreSound(true);
                        updatePrediction(currentPredictionKey, fixture.id, {
                          awayGoals: (current + 1).toString(),
                        });
                      }}
                      style={{
                        width: isMobile ? 24 : 24,
                        height: isMobile ? 24 : 24,
                        padding: 0,
                        border: `1px solid ${theme.line}`,
                        borderRadius: 6,
                        background: locked ? theme.panelHi : theme.accent2,
                        color: locked ? theme.text : "#ffffff",
                        cursor: locked ? "not-allowed" : "pointer",
                        fontSize: isMobile ? 15 : 16,
                        fontWeight: 700,
                        opacity: locked ? 0.3 : 1,
                      }}
                    >
                      +
                    </button>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      flex: "0 0 auto",
                    }}
                  >
                    <span
                      style={{ fontSize: isMobile ? 12 : 12, color: "#ffffff", fontWeight: 600 }}
                    >
                      {getTeamCode(fixture.awayTeam, gameMode)}
                    </span>

                    {isWorldCupMode ? (
                      <span style={{ marginLeft: isMobile ? 3 : 4, fontSize: isMobile ? 16 : 18, flexShrink: 0 }}>
                        {getWorldCupFlag(fixture.awayTeam)}
                      </span>
                    ) : resolveTeamBadge(fixture.awayTeam) ? (
                      <img
                        src={resolveTeamBadge(fixture.awayTeam)}
                        alt={fixture.awayTeam}
                        style={{
                          width: isMobile ? 18 : 20,
                          height: isMobile ? 18 : 20,
                          objectFit: "contain",
                          marginLeft: isMobile ? 3 : 4,
                          flexShrink: 0,
                        }}
                      />
                    ) : null}
                  </div>
                </div>
              </div>

              {hasResult && (
                <div
                  aria-label={`${fixture.homeTeam} vs ${fixture.awayTeam} score ${r.homeGoals}-${r.awayGoals}`}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr",
                    justifyItems: "center",
                    gap: 5,
                    maxWidth: "100%",
                    color: theme.muted,
                    fontSize: 11,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  <span
                    style={{
                      color: fixtureLive ? "#22c55e" : theme.muted,
                      fontSize: 11,
                      fontWeight: 800,
                      textAlign: "center",
                    }}
                  >
                    {scoreLabel}
                  </span>
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "minmax(56px, 1fr) auto minmax(56px, 1fr)",
                      alignItems: "center",
                      justifyItems: "center",
                      gap: isMobile ? 8 : 10,
                      width: "100%",
                      maxWidth: isMobile ? 276 : 320,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-end",
                        justifySelf: "stretch",
                        gap: 5,
                        minWidth: 0,
                      }}
                    >
                      {isWorldCupMode ? (
                        <span style={{ fontSize: isMobile ? 14 : 16, flexShrink: 0 }}>
                          {getWorldCupFlag(fixture.homeTeam)}
                        </span>
                      ) : resolveTeamBadge(fixture.homeTeam) ? (
                        <img
                          src={resolveTeamBadge(fixture.homeTeam)}
                          alt={fixture.homeTeam}
                          style={{
                            width: isMobile ? 14 : 16,
                            height: isMobile ? 14 : 16,
                            objectFit: "contain",
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                      <span style={{ color: theme.text, fontSize: 11, fontWeight: 700 }}>
                        {getTeamCode(fixture.homeTeam, gameMode)}
                      </span>
                    </div>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: `${isMobile ? 28 : 30}px 10px ${isMobile ? 28 : 30}px`,
                        alignItems: "center",
                        justifyItems: "center",
                        gap: 4,
                      }}
                    >
                    <span
                      style={{
                        ...smallInput,
                        width: isMobile ? 28 : 30,
                        minHeight: isMobile ? 28 : 30,
                        padding: "4px 6px",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        background: theme.panel,
                      }}
                    >
                      {r.homeGoals}
                    </span>
                    <span style={{ color: theme.muted, fontWeight: 800 }}>-</span>
                    <span
                      style={{
                        ...smallInput,
                        width: isMobile ? 28 : 30,
                        minHeight: isMobile ? 28 : 30,
                        padding: "4px 6px",
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        background: theme.panel,
                      }}
                    >
                      {r.awayGoals}
                    </span>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "flex-start",
                        justifySelf: "stretch",
                        gap: 5,
                        minWidth: 0,
                      }}
                    >
                      <span style={{ color: theme.text, fontSize: 11, fontWeight: 700 }}>
                        {getTeamCode(fixture.awayTeam, gameMode)}
                      </span>
                      {isWorldCupMode ? (
                        <span style={{ fontSize: isMobile ? 14 : 16, flexShrink: 0 }}>
                          {getWorldCupFlag(fixture.awayTeam)}
                        </span>
                      ) : resolveTeamBadge(fixture.awayTeam) ? (
                        <img
                          src={resolveTeamBadge(fixture.awayTeam)}
                          alt={fixture.awayTeam}
                          style={{
                            width: isMobile ? 14 : 16,
                            height: isMobile ? 14 : 16,
                            objectFit: "contain",
                            flexShrink: 0,
                          }}
                        />
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {/* POINTS + LOCK row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  marginTop: 6,
                }}
              >
                {/* POINTS + LOCK + FIXTURE BELL */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    alignSelf: "center",
                    flexShrink: 0,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 10,
                        textAlign: "center",
                        color: theme.muted,
                        marginBottom: 2,
                        lineHeight: "10px",
                      }}
                    >
                      POINTS
                    </div>
                    <div
                      aria-label={
                        pointsForThisFixture == null
                          ? "Points not available yet"
                          : `${pointsForThisFixture} points`
                      }
                      style={{
                        ...smallInput,
                        minHeight: isMobile ? 32 : 34,
                        boxSizing: "border-box",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 800,
                        background:
                          pointsForThisFixture == null
                            ? theme.panel
                            : pred?.isTriple
                            ? "#ffd700"
                            : pred?.isDouble
                            ? "#C0C0C0"
                            : pointsForThisFixture === 0
                            ? "#e74c3c"
                            : "#2ecc71",
                        color:
                          pointsForThisFixture == null
                            ? theme.text
                            : pred?.isTriple || pred?.isDouble
                            ? "#000"
                            : "#fff",
                      }}
                    >
                      {pointsForThisFixture == null ? "—" : pointsForThisFixture}
                    </div>
                  </div>

                  <div
                    style={{
                      width: 22,
                      height: 22,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: "50%",
                      background: locked ? "#ff4d4d" : "#2ecc71",
                      color: "#fff",
                      fontSize: 14,
                      lineHeight: 1,
                      flexShrink: 0,
                      marginTop: 12,
                    }}
                  >
                    {locked ? "🔒" : "🔑"}
                  </div>

                  <button
                    type="button"
                    onClick={() => toggleFixturePush(fixture.id)}
                    title={
                      fixturePushEnabled
                        ? "Fixture notifications enabled"
                        : "Fixture notifications disabled"
                    }
                    aria-label={
                      fixturePushEnabled
                        ? `Disable notifications for ${fixture.homeTeam} vs ${fixture.awayTeam}`
                        : `Enable notifications for ${fixture.homeTeam} vs ${fixture.awayTeam}`
                    }
                    style={{
                      width: 28,
                      height: 28,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      borderRadius: "50%",
                      border: `1px solid ${fixturePushEnabled ? "#22c55e" : "#ef4444"}`,
                      background: fixturePushEnabled ? "rgba(34,197,94,0.18)" : "rgba(239,68,68,0.18)",
                      color: fixturePushEnabled ? "#22c55e" : "#ef4444",
                      fontSize: 15,
                      lineHeight: 1,
                      flexShrink: 0,
                      marginTop: 12,
                      cursor: "pointer",
                    }}
                  >
                    🔔
                  </button>
                </div>
              </div>

              {/* Captain / Triple + Coins */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  marginTop: 10,
                  gap: 12,
                }}
              >
                {/* Captain + Triple */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 24,
                  }}
                >
                  <label
  style={{
    display: "flex",
    alignItems: "center",
    gap: 6,
    fontSize: 12,
    color: theme.muted,
  }}
>
  <span style={{ fontSize: 16 }}>👑</span>
  Captain
  <input
    type="checkbox"
    checked={!!pred.isDouble}
    disabled={locked}
    style={{
      opacity: locked ? 0.4 : 1,
      cursor: locked ? "not-allowed" : "pointer",
    }}
    onChange={(e) => {
      playScoreSound(e.target.checked);
      updatePrediction(
        currentPredictionKey,
        fixture.id,
        { isDouble: e.target.checked }
      );
    }}
  />
</label>

                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontSize: 12,
                      color: theme.muted,
                    }}
                  >
                    <span style={{ fontSize: 16 }}>⚡</span>
                    Triple
                    {(() => {
  const playerPreds = predictions[currentPredictionKey] || {};
  const modeFixtureIds = new Set(activeFixtures.map((f) => String(f.id)));

  // Find if a triple exists anywhere
  const tripleFixtureId = Object.entries(playerPreds).find(
    ([id, p]) => modeFixtureIds.has(String(id)) && p?.isTriple
  )?.[0];

  // Is this the fixture holding the triple?
  const isCurrentTriple =
    String(tripleFixtureId) === String(fixture.id);

  const lockedTriple = locked;

  const tripleUsedElsewhere =
    tripleFixtureId && !isCurrentTriple;

  const disableTripleBox =
    lockedTriple || tripleUsedElsewhere || pred.isDouble;

  return (
    <input
  type="checkbox"
  disabled={disableTripleBox}
  style={{
    opacity: disableTripleBox ? 0.4 : 1,
    cursor: disableTripleBox ? "not-allowed" : "pointer",
  }}
  checked={!!pred.isTriple}
  onChange={(e) => {
    playScoreSound(e.target.checked);
    updatePrediction(
      currentPredictionKey,
      fixture.id,
      e.target.checked
        ? { isTriple: true, isDouble: false } // triple ON → captain OFF
        : { isTriple: false }                 // triple OFF → leave captain alone
    );
  }}
/>
  );
})()}
                  </label>
                </div>

                {/* Coins */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 10,
                    fontSize: 12,
                    color: theme.muted,
                    width: "100%",
                  }}
                >
                  {/* Center content */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* MINI WRAPPER with +/- buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                      <CoinIcon />

  <div style={{ display: "flex", alignItems: "center", gap: 2 }}>
    <button
      type="button"
      disabled={locked || coinsStake <= 0}
      onClick={() => {
        const newValue = Math.max(0, coinsStake - 1);
        if (newValue !== coinsStake) {
          playCoinSound(false);
          handleCoinsChange(fixture.id, newValue, coinsSide, o);
        }
      }}
      style={{
        width: 18,
        height: 18,
        padding: 0,
        borderRadius: 5,
        border: (locked || coinsStake <= 0) ? `2px solid rgba(255, 255, 255, 0.5)` : `1px solid ${theme.line}`,
        background: (locked || coinsStake <= 0) ? theme.panelHi : theme.accent,
        color: (locked || coinsStake <= 0) ? theme.muted : "#fff",
        fontSize: 13,
        fontWeight: 700,
        cursor: (locked || coinsStake <= 0) ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: (locked || coinsStake <= 0) ? 0.4 : 1,
      }}
    >
      −
    </button>

    <div
      style={{
        width: isMobile ? 34 : 36,
        textAlign: "center",
        padding: isMobile ? "6px 7px" : "6px 8px",
        borderRadius: 8,
        border: "1.5px solid #ffffff",
        background: theme.panelHi,
        color: theme.text,
        fontWeight: 700,
        fontSize: 14,
      }}
    >
      {coinsStake}
    </div>

    <button
      type="button"
      disabled={locked || coinsState.remaining <= 0}
      onClick={() => {
        if (coinsState.remaining > 0) {
          const newValue = Math.min(10, coinsStake + 1);
          playCoinSound(true);
          handleCoinsChange(fixture.id, newValue, coinsSide, o);
        } else {
          playCoinSound(false);
        }
      }}
      style={{
        width: 18,
        height: 18,
        padding: 0,
        borderRadius: 5,
        border: `1px solid ${theme.line}`,
        background: (locked || coinsState.remaining <= 0) ? theme.panelHi : theme.accent2,
        color: (locked || coinsState.remaining <= 0) ? theme.muted : "#fff",
        fontSize: 13,
        fontWeight: 700,
        cursor: (locked || coinsState.remaining <= 0) ? "not-allowed" : "pointer",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity: (locked || coinsState.remaining <= 0) ? 0.4 : 1,
      }}
    >
      +
    </button>
  </div>
</div>

<div style={{ display: "flex", gap: 4 }}>
  {["H", "D", "A"].map((s) => {
    const sideLabel = s === "H" ? "HOME" : s === "D" ? "DRAW" : "AWAY";
    return (
      <button
        key={s}
        type="button"
        disabled={locked}
        title={sideLabel}
        onClick={() => {
          playScoreSound(true);
          handleCoinsChange(
            fixture.id,
            coinsStake,
            s,
            o
          );
        }}
        style={{
          padding: "2px 6px",
          borderRadius: 999,
          border: `1px solid ${theme.line}`,
          backgroundColor:
            coinsSide === s ? theme.accent : "transparent",
          color: coinsSide === s ? theme.buttonText : theme.text,
          fontSize: 11,
          cursor: locked ? "default" : "pointer",
        }}
      >
        {s}
      </button>
    );
  })}
</div>
                  </div>

                  {/* Right side - possible return (fixed width to avoid reflow) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      minWidth: 90,
                      justifyContent: "flex-end",
                      color: coinsPossibleReturnColor,
                      fontWeight: 700,
                    }}
                  >
                    = {Number(coinsPossibleReturn).toFixed(2)}
                    <CoinIcon />
                  </div>
                  </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </section>
)}

        {/* Results View */}
{activeView === "results" && (
  <section style={cardStyle}>
    <h2 style={{ marginTop: 0, fontSize: 18 }}>
      {getModeGameweekLabel(gameMode, selectedGameweek)} {isWorldCupMode ? "WC Results" : "Results"}
    </h2>
    {isWorldCupMode && (
      <div style={{ marginTop: -4, marginBottom: 10, fontSize: 12, fontWeight: 700, color: theme.accent }}>
        {selectedWorldCupStage}
      </div>
    )}

    {/* Coins outcome summary for this gameweek */}
    {authToken && coinsOutcome && (
      <div
        style={{
          marginTop: 8,
          paddingBottom: 8,
          borderBottom: `1px solid ${theme.line}`,
          fontSize: 12,
          color: theme.muted,
        }}
      >
        <div style={{ marginBottom: 4 }}>
          <strong style={{ display: "flex", alignItems: "center", gap: 6 }}>
  <img
    src="/coin_PA_32.png"
    alt="Coins"
    style={{ width: 18, height: 18 }}
  />
  <span>{getModeGameweekLabel(gameMode, selectedGameweek)}</span>
</strong>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            flexWrap: "wrap",
            gap: 6,
          }}
        >
          <span>
            Staked: <strong>{coinsOutcome.totalStake}</strong>
          </span>
          <span>
            Returned:{" "}
            <strong>{coinsOutcome.totalReturn.toFixed(2)}</strong>
          </span>
          <span>
            Profit:{" "}
            <strong
              style={{
                color:
                  coinsOutcome.profit > 0
                    ? theme.accent2
                    : coinsOutcome.profit < 0
                    ? theme.danger
                    : theme.muted,
              }}
            >
              {coinsOutcome.profit.toFixed(2)}
            </strong>
          </span>
        </div>
      </div>
    )}

    <div style={{ display: "grid", gap: 8 }}>
      {visibleFixtures.map((fixture) => {
        const res = results[fixture.id] || {};
        const fixtureLive = isFixtureLive(matchStatesByFixtureId[fixture.id]);

        const homeCode = getTeamCode(fixture.homeTeam, gameMode);
        const awayCode = getTeamCode(fixture.awayTeam, gameMode);

        // Badge sources (normalized)
        const homeBadgeSrc = resolveTeamBadge(fixture.homeTeam);
        const awayBadgeSrc = resolveTeamBadge(fixture.awayTeam);

        return (
          <div
            key={fixture.id}
            style={{
              background: theme.panelHi,
              borderRadius: 12,
              border: fixtureLive
                ? "2px solid #22c55e"
                : "1px solid rgba(255, 255, 255, 0.3)",
              padding: 10,
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
            }}
          >
            {/* Inner row, centered */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                width: "100%",
                maxWidth: 520,
              }}
            >
              {/* Home badge + code */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flex: 1,
                  justifyContent: "flex-end",
                }}
              >
                <span style={{ fontWeight: 700 }}>{homeCode}</span>
                {isWorldCupMode ? (
                  <span style={{ fontSize: 18 }}>{getWorldCupFlag(fixture.homeTeam)}</span>
                ) : homeBadgeSrc ? (
                  <img
                    src={homeBadgeSrc}
                    alt={fixture.homeTeam}
                    style={{
                      width: 20,
                      height: 20,
                      objectFit: "contain",
                    }}
                  />
                ) : null}
              </div>

              {/* Score inputs */}
              <div
                style={{
                  display: "grid",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 92,
                  justifyItems: "center",
                }}
              >
                {fixtureLive && (
                  <span
                    style={{
                      color: "#22c55e",
                      fontSize: 10,
                      fontWeight: 900,
                      letterSpacing: 0.4,
                    }}
                  >
                    LIVE SCORE
                  </span>
                )}
                {isWorldCupMode && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "3px 8px",
                      borderRadius: 999,
                      background: "rgba(245,158,11,0.14)",
                      border: "1px solid rgba(245,158,11,0.3)",
                      color: theme.accent,
                      fontSize: 10,
                      fontWeight: 800,
                      letterSpacing: 0.3,
                    }}
                  >
                    {getWorldCupFixtureLabel(fixture)}
                  </span>
                )}
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                <span style={{ minWidth: 20, textAlign: "right", fontWeight: 700, fontSize: 16 }}>
                  {res.homeGoals ?? "-"}
                </span>
                <span style={{ color: theme.muted }}>-</span>
                <span style={{ minWidth: 20, textAlign: "left", fontWeight: 700, fontSize: 16 }}>
                  {res.awayGoals ?? "-"}
                </span>
                </div>
              </div>

              {/* Away badge + code */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  flex: 1,
                  justifyContent: "flex-start",
                }}
              >
                {isWorldCupMode ? (
                  <span style={{ fontSize: 18 }}>{getWorldCupFlag(fixture.awayTeam)}</span>
                ) : awayBadgeSrc ? (
                  <img
                    src={awayBadgeSrc}
                    alt={fixture.awayTeam}
                    style={{
                      width: 20,
                      height: 20,
                      objectFit: "contain",
                    }}
                  />
                ) : null}
                <span style={{ fontWeight: 700 }}>{awayCode}</span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </section>
)}
        {/* Mini League Table */}
        {activeView === "league" && (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18, textAlign: "center" }}>{isWorldCupMode ? "🏆 WC Mini League Table" : "🏆 Mini League Table"}</h2>
            {hasMiniLeague && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 10,
                  flexWrap: "wrap",
                }}
              >
                <div style={{ fontSize: 13, color: theme.muted }}>
                  Viewing: <strong style={{ color: theme.text }}>{selectedMiniLeague?.name || "Mini-league"}</strong>
                </div>
                {myLeagues.length > 1 && (
                  <select
                    value={selectedMiniLeague?.id || ""}
                    onChange={(e) => rememberSelectedLeagueId(e.target.value)}
                    style={{
                      minWidth: isMobile ? "100%" : 220,
                      padding: "8px 10px",
                      borderRadius: 8,
                      background: theme.panelHi,
                      color: theme.text,
                      border: `1px solid ${theme.line}`,
                    }}
                  >
                    {myLeagues.map((league) => (
                      <option key={league.id} value={league.id}>
                        {league.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            {showMiniLeagueEmptyState ? (
              <div
                style={{
                  padding: "18px 16px",
                  textAlign: "center",
                  color: theme.muted,
                  background: theme.panelHi,
                  border: `1px solid ${theme.line}`,
                  borderRadius: 12,
                }}
              >
                {isWorldCupMode
                  ? "No World Cup mini-league yet. Create or join one in WC Mini-Leagues."
                  : "No mini-league yet. Create or join one in Mini-Leagues."}
              </div>
            ) : (
            <div style={{ display: "grid", gap: 8 }}>
              {leaderboard.map((row, i) =>
                renderExpandableLeaderboardRow({
                  row,
                  rows: leaderboard,
                  index: i,
                  value: row.points,
                  valueFormatter: (v) => Math.round(v),
                  scope: "league",
                })
              )}
            </div>
            )}
          </section>
        )}

        {/* Global League Table */}
        {activeView === "globalLeague" && (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18, textAlign: "center" }}>{isWorldCupMode ? "🌍 WC Global League" : "🌍 Global League Table"}</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {globalLeaderboard.map((row, i) =>
                renderExpandableLeaderboardRow({
                  row,
                  rows: globalLeaderboard,
                  index: i,
                  value: row.points,
                  valueFormatter: (v) => Math.round(v),
                  scope: "global",
                })
              )}
            </div>
          </section>
        )}

        {activeView === "predictionIq" && !isWorldCupMode && (
          <section style={cardStyle}>
            <div
              style={{
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>
                Prediction IQ Report
              </h2>
              <div style={{ marginTop: 3, fontSize: 12, color: theme.muted }}>
                Weekly insight for {currentPlayer || "your account"}
              </div>
              <button
                type="button"
                onClick={() => setPredictionIqDemo((value) => !value)}
                style={{
                  marginTop: 10,
                  padding: "7px 10px",
                  borderRadius: 8,
                  border: `1px solid ${predictionIqDemo ? theme.warn : theme.line}`,
                  background: predictionIqDemo ? "rgba(245,158,11,0.14)" : theme.panelHi,
                  color: predictionIqDemo ? theme.warn : theme.accent,
                  fontSize: 12,
                  fontWeight: 800,
                  cursor: "pointer",
                  whiteSpace: "nowrap",
                }}
              >
                {predictionIqDemo ? "Show real data" : "Show demo data"}
              </button>
            </div>
            {renderPredictionIqReport({
              report: predictionIqDemo ? predictionIqDemoReport : predictionIqReport,
            })}
          </section>
        )}

        {activeView === FANTASY_IQ_VIEW_ID && !isWorldCupMode && (
          <section ref={fantasyIqHeaderRef} style={cardStyle}>
            <div
              style={{
                textAlign: "center",
                marginBottom: 12,
              }}
            >
              <h2 style={{ margin: 0, fontSize: 18 }}>
                Fantasy IQ
              </h2>
              <div style={{ marginTop: 3, fontSize: 12, color: theme.muted }}>
                Turn your predictions, team form and upcoming fixtures into personalised Fantasy Premier League insights.
              </div>
            </div>
            {renderFantasyIqReport()}
          </section>
        )}

        {activeView === "badges" && (
          <section style={cardStyle}>
            {(() => {
              const earnedBadges = currentEarnedBadges;
              const getBadgeProgress = (badge) => {
                if (badge.id === "founder") {
                  return currentBadgeStats.founder ? "Originals league member" : "Locked";
                }
                if (badge.id === "addict") {
                  return `${currentBadgeStats.seasonsPlayed || 0}/3 seasons`;
                }
                if (badge.id === "veteran") {
                  return `${currentBadgeStats.seasonsPlayed || 0}/6 seasons`;
                }
                if (badge.id === "globalGold") {
                  return `${currentBadgeStats.globalMedals?.gold || currentBadgeStats.globalWinnerCount || 0} gold medals`;
                }
                if (badge.id === "globalSilver") {
                  return `${currentBadgeStats.globalMedals?.silver || 0} silver medals`;
                }
                if (badge.id === "globalBronze") {
                  return `${currentBadgeStats.globalMedals?.bronze || 0} bronze medals`;
                }
                if (badge.id === "gambler") {
                  return `${currentBadgeStats.coinLeagueWins || 0} Coins League wins`;
                }
                if (badge.id === "streaker") {
                  return `${currentBadgeStats.longestWeeklyWinStreak || 0}/3 best-score streak`;
                }
                if (badge.id === "superStreaker") {
                  return `${currentBadgeStats.longestWeeklyWinStreak || 0}/5 best-score streak`;
                }
                if (badge.id === "sharpShooter") {
                  return `${currentBadgeStats.exactScores || 0}/5 season exact scores`;
                }
                if (badge.id === "sniper") {
                  return `${currentBadgeStats.exactScores || 0}/10 season exact scores`;
                }
                if (badge.id === "superSniper") {
                  return `${currentBadgeStats.exactScores || 0}/20 season exact scores`;
                }
                if (badge.id === "captainClever") {
                  return `${currentBadgeStats.correctCaptains || 0}/10 season correct captains`;
                }
                if (badge.id === "captainKing") {
                  return `${currentBadgeStats.correctCaptains || 0}/20 season correct captains`;
                }
                return "Locked";
              };

              return (
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ textAlign: "center" }}>
                    <h2 style={{ margin: 0, fontSize: 18 }}>Badges</h2>
                    <div style={{ marginTop: 3, fontSize: 12, color: theme.muted }}>
                      Earned badges appear next to player names in league tables.
                    </div>
                  </div>

                  {badgeAwardBadges.length > 0 && (
                    <div
                      className="badge-award-panel"
                      style={{
                        background: "linear-gradient(135deg, rgba(34,197,94,0.22), rgba(56,189,248,0.16))",
                        border: `1px solid ${theme.accent2}`,
                        borderRadius: 12,
                        padding: isMobile ? 12 : 14,
                        display: "grid",
                        gap: 10,
                        justifyItems: "center",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ color: theme.accent2, fontSize: 12, fontWeight: 1000, textTransform: "uppercase" }}>
                        New badge earned
                      </div>
                      <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                        {badgeAwardBadges.map((badge) => {
                          const visual = getBadgeVisual(badge, true);
                          return (
                            <div
                              key={badge.id}
                              className="badge-award-icon"
                              title={`${badge.label}: ${badge.requirement}`}
                              aria-label={badge.label}
                              style={{
                                width: isMobile ? 58 : 68,
                                height: isMobile ? 58 : 68,
                                borderRadius: "50%",
                                border: `1px solid ${visual.border}`,
                                background: visual.background,
                                color: visual.color,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                boxShadow: "0 16px 34px rgba(0,0,0,0.28)",
                              }}
                            >
                              {renderBadgeIconContent(badge, currentBadgeStats, isMobile ? 42 : 50)}
                            </div>
                          );
                        })}
                      </div>
                      <div style={{ color: theme.text, fontSize: 15, fontWeight: 900 }}>
                        {badgeAwardBadges.map((badge) => badge.label).join(", ")}
                      </div>
                    </div>
                  )}

                  <div
                    style={{
                      background: theme.panelHi,
                      border: `1px solid ${theme.line}`,
                      borderRadius: 12,
                      padding: 14,
                      display: "grid",
                      gap: 8,
                    }}
                  >
                    <div style={{ fontSize: 13, color: theme.muted, fontWeight: 800 }}>
                      Your badges
                    </div>
                    {earnedBadges.length ? (
                      <div
                        style={{
                          display: "flex",
                          gap: isMobile ? 10 : 14,
                          flexWrap: "wrap",
                          alignItems: "center",
                          justifyContent: "center",
                          padding: isMobile ? "6px 0 2px" : "10px 0 4px",
                        }}
                      >
                        {earnedBadges.map((badge) => {
                          const visual = getBadgeVisual(badge, true);
                          return (
                            <div
                              key={badge.id}
                              title={`${badge.label}: ${badge.requirement}`}
                              aria-label={badge.label}
                              style={{
                                width: isMobile ? 54 : 66,
                                height: isMobile ? 54 : 66,
                                borderRadius: "50%",
                                border: `1px solid ${visual.border}`,
                                background: visual.background,
                                color: visual.color,
                                fontSize: getBadgeFontSize(badge, isMobile ? 24 : 30),
                                fontWeight: 900,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                overflow: "hidden",
                                boxShadow: badge.medalType
                                  ? "0 8px 22px rgba(250,204,21,0.18)"
                                  : "0 8px 22px rgba(0,0,0,0.22)",
                              }}
                            >
                              {renderBadgeIconContent(badge, currentBadgeStats, isMobile ? 36 : 44)}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <div style={{ color: theme.muted, fontSize: 13 }}>
                        No badges earned yet. Keep playing to unlock your first one.
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                      gap: 10,
                    }}
                  >
                    {BADGE_DEFINITIONS.map((badge) => {
                      const earned = earnedBadges.some((earnedBadge) => earnedBadge.id === badge.id);
                      const visual = getBadgeVisual(badge, earned);
                      return (
                        <div
                          key={badge.id}
                          style={{
                            background: theme.panelHi,
                            border: `1px solid ${earned ? theme.accent2 : theme.line}`,
                            borderRadius: 12,
                            padding: 12,
                            display: "grid",
                            gridTemplateColumns: "38px minmax(0, 1fr)",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <div
                            style={{
                              width: 38,
                              height: 38,
                              borderRadius: 999,
                              border: `1px solid ${visual.border}`,
                              background: visual.background,
                              color: visual.color,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              overflow: "hidden",
                              fontSize: getBadgeFontSize(badge, 18),
                              fontWeight: 900,
                            }}
                          >
                            {earned
                              ? renderBadgeIconContent(badge, currentBadgeStats, 26)
                              : renderBadgeIconContent(badge, {}, 24)}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                                gap: 8,
                              }}
                            >
                              <div style={{ fontSize: 15, fontWeight: 900, color: theme.text }}>
                                {badge.label}
                              </div>
                              <div
                                style={{
                                  fontSize: 11,
                                  fontWeight: 900,
                                  color: earned ? theme.accent2 : theme.muted,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {earned ? "Earned" : "Locked"}
                              </div>
                            </div>
                            <div style={{ marginTop: 4, fontSize: 12, color: theme.muted, lineHeight: 1.35 }}>
                              {badge.requirement}
                            </div>
                            <div style={{ marginTop: 6, fontSize: 12, color: theme.accent, fontWeight: 800 }}>
                              {getBadgeProgress(badge)}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </section>
        )}

        {activeView === "premierLeagueTable" && (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18, textAlign: "center" }}>
              Premier League Table
            </h2>
            <div
              style={{
                marginTop: -2,
                marginBottom: 10,
                textAlign: "center",
                fontSize: 12,
                color: theme.muted,
              }}
            >
              Click team for form and fixture rating.
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                marginBottom: 10,
              }}
            >
              <select
                value={premierLeagueTableView}
                onChange={(e) => {
                  setPremierLeagueTableView(e.target.value);
                  setExpandedPremierTeam("");
                }}
                style={{
                  width: isMobile ? "100%" : 260,
                  padding: "9px 10px",
                  borderRadius: 8,
                  border: `1.5px solid #ffffff`,
                  background: theme.panelHi,
                  color: theme.text,
                  fontWeight: 700,
                  fontSize: 13,
                }}
              >
                <option value={PREMIER_TABLE_CURRENT_VIEW}>2026/27 Season</option>
                <option value={PREMIER_TABLE_HISTORY_VIEW}>2025/26 Historical standings</option>
              </select>
            </div>
            {!isHistoricalPremierLeagueTable && !displayedPremierLeagueTableStarted && (
              <div
                style={{
                  marginTop: -2,
                  marginBottom: 12,
                  textAlign: "center",
                  fontSize: 12,
                  color: theme.muted,
                }}
              >
                Fixtures released. All teams start on zero until results come in.
              </div>
            )}
            {isHistoricalPremierLeagueTable && lastStandingsUpdated && (
              <div
                style={{
                  marginTop: -6,
                  marginBottom: 12,
                  textAlign: "center",
                  fontSize: 12,
                  color: theme.muted,
                }}
              >
                Updated {new Date(lastStandingsUpdated).toLocaleString()}
              </div>
            )}

            <div style={{ display: "grid", gap: 8 }}>
              {isHistoricalPremierLeagueTable && premierLeagueTableLoading && (
                <div
                  style={{
                    background: theme.panelHi,
                    border: `1px solid ${theme.line}`,
                    padding: "10px 12px",
                    borderRadius: 12,
                    color: theme.muted,
                    textAlign: "center",
                  }}
                >
                  Loading historical standings...
                </div>
              )}

              {isHistoricalPremierLeagueTable && !premierLeagueTableLoading && premierLeagueTableError && (
                <div
                  style={{
                    background: theme.panelHi,
                    border: `1px solid ${theme.danger}`,
                    padding: "10px 12px",
                    borderRadius: 12,
                    color: theme.text,
                    textAlign: "center",
                  }}
                >
                  Failed to load standings: {premierLeagueTableError}
                </div>
              )}

              {(!isHistoricalPremierLeagueTable || !premierLeagueTableLoading) &&
                (!isHistoricalPremierLeagueTable || !premierLeagueTableError) &&
                displayedPremierLeagueTableRows.map((row, i) => {
                  const teamName =
                    row?.team?.name ||
                    row?.team?.shortName ||
                    row?.team?.tla ||
                    "Unknown";
                  const teamKey = normalizeTeamName(teamName);
                  const insights = premierLeagueInsights[teamKey] || { form: [], upcoming: [] };
                  const isExpanded = expandedPremierTeam === teamKey;
                  const badgeSrc =
                    resolveTeamBadge(teamName) ||
                    resolveTeamBadge(row?.team?.name) ||
                    row?.team?.crest ||
                    "";

                  let borderColor = theme.line;
                  if (displayedPremierLeagueTableStarted || isHistoricalPremierLeagueTable) {
                    if (i === 0) borderColor = "#FFD700";
                    else if (i < 4) borderColor = "#22C55E";
                    else if (i >= displayedPremierLeagueTableRows.length - 3) borderColor = "#EF4444";
                  }

                  return (
                    <div
                      key={row?.team?.id || `${teamName}-${i}`}
                      style={{
                        background: theme.panelHi,
                        border: `2px solid ${borderColor}`,
                        borderRadius: 12,
                        overflow: "hidden",
                      }}
                    >
                      <div
                        role="button"
                        tabIndex={0}
                        onClick={() =>
                          setExpandedPremierTeam((prev) => (prev === teamKey ? "" : teamKey))
                        }
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            setExpandedPremierTeam((prev) => (prev === teamKey ? "" : teamKey));
                          }
                        }}
                        style={{
                          display: "grid",
                          gridTemplateColumns: isMobile ? "36px auto 78px" : "42px auto 158px",
                          gap: 10,
                          alignItems: "center",
                          padding: isMobile ? "10px 12px" : "12px 14px",
                          cursor: "pointer",
                        }}
                      >
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              color: i === 0 ? "#FFD700" : theme.muted,
                              fontWeight: 800,
                              fontSize: 16,
                              textAlign: "center",
                            }}
                          >
                            {row.position || i + 1}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 10,
                            minWidth: 0,
                          }}
                        >
                          {badgeSrc && (
                            <img
                              src={badgeSrc}
                              alt={teamName}
                              style={{
                                width: isMobile ? 28 : 32,
                                height: isMobile ? 28 : 32,
                                objectFit: "contain",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <div style={{ minWidth: 0 }}>
                            <div
                              style={{
                                fontWeight: 700,
                                fontSize: isMobile ? 14 : 15,
                                color: theme.text,
                                whiteSpace: "nowrap",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                              }}
                              title={row?.team?.name || teamName}
                            >
                              {teamName}
                            </div>
                            <div
                              style={{
                                fontSize: 12,
                                color: theme.muted,
                                marginTop: 2,
                              }}
                            >
                              P {row.playedGames ?? 0}  GD {row.goalDifference ?? 0}
                            </div>
                          </div>
                          <div
                            style={{
                              marginLeft: "auto",
                              color: theme.muted,
                              fontSize: 14,
                              fontWeight: 700,
                            }}
                          >
                            {isExpanded ? "▲" : "▼"}
                          </div>
                        </div>

                        <div
                          style={{
                            display: "grid",
                            gridTemplateColumns: isMobile ? "repeat(2, minmax(0, 1fr))" : "repeat(4, minmax(0, 1fr))",
                            gap: 6,
                            textAlign: "center",
                          }}
                        >
                          {[
                            { label: "W", value: row.won ?? 0 },
                            { label: "D", value: row.draw ?? 0 },
                            { label: "L", value: row.lost ?? 0 },
                            { label: "PTS", value: row.points ?? 0, accent: true },
                          ].map((stat) => (
                            <div key={stat.label}>
                              <div
                                style={{
                                  fontSize: 10,
                                  color: theme.muted,
                                  letterSpacing: 0.3,
                                }}
                              >
                                {stat.label}
                              </div>
                              <div
                                style={{
                                  fontWeight: 800,
                                  fontSize: stat.accent ? 16 : 14,
                                  color: stat.accent ? theme.accent : theme.text,
                                }}
                              >
                                {stat.value}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {isExpanded && (
                        <div
                          style={{
                            borderTop: `1px solid ${theme.line}`,
                            padding: isMobile ? "10px 12px 12px" : "12px 14px 14px",
                            display: "grid",
                            gap: 8,
                            background: "rgba(255,255,255,0.02)",
                          }}
                        >
                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: isMobile ? "58px minmax(0, 1fr)" : "68px minmax(0, 1fr)",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: theme.muted,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              Form
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: isMobile ? "repeat(5, minmax(0, 1fr))" : "repeat(5, minmax(54px, 1fr))",
                                gap: isMobile ? 4 : 6,
                                minWidth: 0,
                              }}
                            >
                              {insights.form.length > 0 ? (
                                insights.form.map((item) => {
                                  const outcomeColor =
                                    item.outcome === "W"
                                      ? "#22c55e"
                                      : item.outcome === "D"
                                      ? "#eab308"
                                      : "#ef4444";
                                  return (
                                    <div
                                      key={`form-${item.fixtureId}`}
                                      style={{
                                        minWidth: 0,
                                        width: "100%",
                                        padding: isMobile ? "5px 3px" : "6px 8px",
                                        borderRadius: 10,
                                        background: outcomeColor,
                                        color: outcomeColor === "#eab308" ? "#111827" : "#ffffff",
                                        display: "flex",
                                        flexDirection: "column",
                                        gap: 1,
                                        alignItems: "center",
                                        justifyContent: "center",
                                        minHeight: isMobile ? 36 : 48,
                                        boxSizing: "border-box",
                                      }}
                                    >
                                      <div style={{ fontWeight: 800, fontSize: isMobile ? 11 : 12, lineHeight: 1, textAlign: "center" }}>
                                        {item.outcome}
                                      </div>
                                      <div style={{ fontSize: isMobile ? 9 : 11, fontWeight: 700, lineHeight: 1.05, textAlign: "center" }}>
                                        {item.opponentCode}
                                        <br />
                                        {item.venue}
                                      </div>
                                    </div>
                                  );
                                })
                              ) : (
                                <div style={{ fontSize: 12, color: theme.muted }}>
                                  No completed fixtures yet.
                                </div>
                              )}
                            </div>
                          </div>

                          <div
                            style={{
                              display: "grid",
                              gridTemplateColumns: isMobile ? "58px minmax(0, 1fr)" : "68px minmax(0, 1fr)",
                              gap: 8,
                              alignItems: "center",
                            }}
                          >
                            <div
                              style={{
                                fontSize: 11,
                                fontWeight: 800,
                                color: theme.muted,
                                textTransform: "uppercase",
                                letterSpacing: 0.5,
                              }}
                            >
                              Difficulty
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: isMobile ? "repeat(5, minmax(0, 1fr))" : "repeat(5, minmax(54px, 1fr))",
                                gap: isMobile ? 4 : 6,
                                minWidth: 0,
                              }}
                            >
                              {insights.upcoming.length > 0 ? (
                                insights.upcoming.map((item) => (
                                  <div
                                    key={`upcoming-${item.fixtureId}`}
                                    style={{
                                      minWidth: 0,
                                      width: "100%",
                                      padding: isMobile ? "5px 3px" : "6px 8px",
                                      borderRadius: 10,
                                      background: item.color,
                                      color: item.difficultyScore <= 2 ? "#0b1220" : "#ffffff",
                                      display: "flex",
                                      flexDirection: "column",
                                      gap: 1,
                                      alignItems: "center",
                                      justifyContent: "center",
                                      minHeight: isMobile ? 36 : 48,
                                      boxSizing: "border-box",
                                    }}
                                  >
                                    <div style={{ fontWeight: 800, fontSize: isMobile ? 9 : 12, lineHeight: 1.05, textAlign: "center" }}>
                                      {item.opponentCode}
                                      <br />
                                      {item.venue}
                                    </div>
                                  </div>
                                ))
                              ) : (
                                <div style={{ fontSize: 12, color: theme.muted }}>
                                  No upcoming fixtures found.
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
            </div>
          </section>
        )}

                        {activeView === "coinsLeague" && (
          <section style={cardStyle}>
            <h2
              style={{
                marginTop: 0,
                fontSize: 18,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <img
                src="/coin_PA_32.png"
                alt="Coins"
                style={{ width: 28, height: 28 }}
              />
              <span>{coinsLeagueTitle}</span>
            </h2>

            <div style={{ display: "grid", gap: 8 }}>
              {/* Show "no data" only if server data is empty */}
              {(!coinsLeagueRows || coinsLeagueRows.length === 0) && (
                  <div
                    style={{
                      background: theme.panelHi,
                      border: `1px solid ${theme.line}`,
                      padding: "8px 10px",
                      borderRadius: 10,
                      fontSize: 13,
                      color: theme.muted,
                    }}
                  >
                    No coins data yet.
                  </div>
                )}

              {/* Server coins leaderboard with all users */}
{(coinsLeagueRows || []).map((row, i) => {
  const value =
    typeof row.profit === "number"
      ? row.profit
      : typeof row.points === "number"
      ? row.points
      : 0;
  const displayPlayerName = formatUsernameForDisplay(row.player);

  const decoration = getLeaderboardDecoration(
    coinsLeagueRows,
    i,
    (item) =>
      typeof item?.profit === "number"
        ? item.profit
        : typeof item?.points === "number"
        ? item.points
        : 0,
    leaderboardDecorationsEnabled
  );
  const borderColor = decoration.borderColor || theme.line;
  const rowAvatar = getAvatarForRow(row);

  return (
    <div
      key={row.userId || row.player}
      style={{
        display: "grid",
        gridTemplateColumns: "50px auto minmax(0, 1fr) 90px",
        gap: 10,
        alignItems: "center",
        background: theme.panelHi,
        border: `2px solid ${borderColor}`,
        padding: "12px 14px",
        borderRadius: 12,
      }}
    >
      <div style={{ 
        color: decoration.borderColor || theme.muted,
        fontWeight: 700,
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        gap: 4
      }}>
        {decoration.emoji && <span style={{ fontSize: 18 }}>{decoration.emoji}</span>}
        {!decoration.emoji && <span>{decoration.rank}</span>}
      </div>
      <PlayerAvatar 
        name={row.player} 
        size={36} 
        seed={rowAvatar.seed}
        avatarStyle={rowAvatar.style}
        favoriteMode={gameMode}
        favoriteTeam={
          activeFavoriteByUserId[String(row.userId || "")] ||
          activeFavoriteByUsername[row.player] ||
          ""
        }
      />
      <div style={{ 
        fontWeight: 700,
        fontSize: 15,
        color: decoration.highlight ? "#FFD700" : theme.text,
        minWidth: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        overflow: "visible",
      }}>
        <span
          title={row.player}
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
            maxWidth: "100%",
          }}
        >
          {displayPlayerName}
        </span>
        {renderBadgeStrip(row, { compact: true, limit: BADGE_DEFINITIONS.length, wrap: true, columns: 7 })}
      </div>
      <div style={{ 
        textAlign: "right", 
        fontWeight: 800,
        fontSize: 18,
        color: decoration.borderColor || theme.accent
      }}>
        <AnimatedNumber
          value={Number(value) || 0}
          duration={450}
          format={(v) => (Number.isFinite(v) ? v.toFixed(2) : "0.00")}
        />
      </div>
    </div>
  );
})}
            </div>
          </section>
        )}

        {activeView === "worldCupGroupTables" && isWorldCupMode && (
          <section style={cardStyle}>
            <div style={{ textAlign: "center", marginBottom: 12 }}>
              <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 18 }}>World Cup Group Tables</h2>
              <div style={{ fontSize: 12, color: theme.muted }}>
                Top two in each group highlighted as qualification places.
              </div>
            </div>

            {worldCupGroupTables.length === 0 ? (
              <div
                style={{
                  background: theme.panelHi,
                  border: `1px solid ${theme.line}`,
                  padding: "12px 14px",
                  borderRadius: 12,
                  color: theme.muted,
                  textAlign: "center",
                }}
              >
                Group tables will appear once World Cup groups are available.
              </div>
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                  gap: 10,
                }}
              >
                {worldCupGroupTables.map(({ group, rows }) => (
                  <div
                    key={group}
                    style={{
                      background: theme.panelHi,
                      borderRadius: 14,
                      border: `1px solid ${theme.line}`,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        padding: "10px 12px",
                        display: "grid",
                        gridTemplateColumns: isMobile ? "26px minmax(0, 1fr) 120px" : "30px minmax(0, 1fr) 156px",
                        gap: 8,
                        alignItems: "center",
                        background: "rgba(245,158,11,0.14)",
                        borderBottom: `1px solid rgba(245,158,11,0.2)`,
                      }}
                    >
                      <div />
                      <div style={{ fontWeight: 800, color: theme.accent }}>Group {group}</div>
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                          gap: 4,
                          textAlign: "center",
                          fontSize: 10,
                          fontWeight: 800,
                          color: theme.muted,
                          letterSpacing: 0.3,
                        }}
                      >
                        {["P", "W", "D", "L", "GD", "PTS"].map((label) => (
                          <div key={`${group}-${label}`}>{label}</div>
                        ))}
                      </div>
                    </div>
                    <div style={{ display: "grid" }}>
                      {rows.map((row, index) => {
                        const qualified = index < 2;
                        return (
                          <div
                            key={row.team}
                            style={{
                              display: "grid",
                              gridTemplateColumns: isMobile ? "26px minmax(0, 1fr) 120px" : "30px minmax(0, 1fr) 156px",
                              gap: 8,
                              alignItems: "center",
                              padding: isMobile ? "9px 10px" : "10px 12px",
                              background: qualified ? "rgba(34,197,94,0.08)" : "transparent",
                              borderLeft: qualified ? "4px solid #22c55e" : "4px solid transparent",
                              borderTop: index > 0 ? `1px solid ${theme.line}` : "none",
                            }}
                          >
                            <div style={{ textAlign: "center", fontWeight: 800, color: qualified ? "#22c55e" : theme.muted }}>
                              {row.position}
                            </div>
                            <div style={{ minWidth: 0, display: "flex", alignItems: "center", gap: 8 }}>
                              <span style={{ fontSize: 18, flexShrink: 0 }}>{getWorldCupFlag(row.team)}</span>
                              <div
                                style={{
                                  fontWeight: 700,
                                  color: theme.text,
                                  whiteSpace: "nowrap",
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                }}
                                title={row.team}
                              >
                                {row.team}
                              </div>
                            </div>
                            <div
                              style={{
                                display: "grid",
                                gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
                                gap: 4,
                                textAlign: "center",
                                fontSize: isMobile ? 11 : 12,
                              }}
                            >
                              {[
                                row.played,
                                row.won,
                                row.draw,
                                row.lost,
                                row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference,
                                row.points,
                              ].map((value, statIndex) => (
                                <div
                                  key={`${row.team}-${statIndex}`}
                                  style={{
                                    fontWeight: statIndex === 5 ? 800 : 700,
                                    color: statIndex === 5 ? theme.accent : theme.text,
                                  }}
                                >
                                  {value}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
        {/* Summary */}
        {activeView === "summary" && (() => {
          const summaryEntries = isWorldCupMode
            ? leaderboard.map((row) => ({ player: row.player, userId: row.userId || null }))
            : PLAYERS.map((player) => ({ player, userId: null }));
          const summaryPlayers = summaryEntries.map((entry) => entry.player);
          // Use existing leaderboard data for top scorer
          const topScorer = leaderboard && leaderboard.length > 0 && Number(leaderboard[0]?.points || 0) > 0
            ? leaderboard[0] 
            : { player: "", points: 0 };

          // Legacy player name to userId mapping
          const LEGACY_MAP = {
            Tom: "1763791297309",
            Ian: "1763801801288",
            Dave: "1763801999658",
            Anthony: "1763802020494",
            Steve: "1763812904100",
            Emma: "1763813732635",
            Phil: "1763874000000",
          };

          // Calculate summary statistics
          const stats = {
            topScorer: { name: topScorer.player, points: topScorer.points },
            mostBingpots: { names: [], count: 0 },
            mostForgetful: { names: [], missed: 0 },
            bestGameweek: { names: [], points: 0, gameweek: 0 },
            bestGambler: { name: "", coins: 0 },
            mostBackedCountry: { name: "", count: 0 }
          };

          const backedCountryCounts = {};

          // Get all completed fixtures
          const completedFixtures = activeFixtures.filter((fixture) =>
            isFixtureCompleted(fixture, results)
          );
          const hasAnyPoints = historicalScores.some((row) =>
            summaryPlayers.some((player) => Number(row[player] || 0) > 0)
          );

          const getPredictionForPlayer = (player, userId, fixtureId) => {
            const legacyUserId = LEGACY_MAP[player];
            return (
              predictions[player]?.[fixtureId] ||
              (userId ? predictions[userId]?.[fixtureId] : null) ||
              (legacyUserId ? predictions[legacyUserId]?.[fixtureId] : null) ||
              (userId ? globalPredictionsByUserId?.[userId]?.[fixtureId] : null) ||
              (legacyUserId ? globalPredictionsByUserId?.[legacyUserId]?.[fixtureId] : null) ||
              null
            );
          };

          const hasValidScorePrediction = (pred) => {
            if (!pred) return false;
            if (pred.homeGoals === "" || pred.homeGoals == null) return false;
            if (pred.awayGoals === "" || pred.awayGoals == null) return false;
            const homeGoals = Number(pred.homeGoals);
            const awayGoals = Number(pred.awayGoals);
            return Number.isFinite(homeGoals) && Number.isFinite(awayGoals);
          };

          const updateTiedStat = (stat, name, value, valueKey) => {
            if (value <= 0) return stat;
            if (value > stat[valueKey]) {
              return { ...stat, names: [name], [valueKey]: value };
            }
            if (value === stat[valueKey]) {
              return { ...stat, names: [...stat.names, name] };
            }
            return stat;
          };

          const formatNames = (names = []) => names.length ? names.join(", ") : "";

          // Calculate bingpots and missed weeks for each player
          summaryEntries.forEach(({ player, userId }) => {
            let bingpots = 0;
            let missedWeeks = 0;
            
            // Count bingpots from fixture predictions
            completedFixtures.forEach(fixture => {
              const pred = getPredictionForPlayer(player, userId, fixture.id);
              const result = results[fixture.id];

              if (hasValidScorePrediction(pred)) {
                // Check for exact score (bingpot)
                const homeCorrect = Number(pred.homeGoals) === Number(result.homeGoals);
                const awayCorrect = Number(pred.awayGoals) === Number(result.awayGoals);

                if (homeCorrect && awayCorrect) {
                  bingpots++;
                }
              }
            });

            if (isWorldCupMode) {
              activeFixtures.forEach((fixture) => {
                const pred = getPredictionForPlayer(player, userId, fixture.id);
                if (!hasValidScorePrediction(pred)) return;

                const homeGoals = Number(pred.homeGoals);
                const awayGoals = Number(pred.awayGoals);

                if (homeGoals > awayGoals) {
                  backedCountryCounts[fixture.homeTeam] = (backedCountryCounts[fixture.homeTeam] || 0) + 1;
                } else if (awayGoals > homeGoals) {
                  backedCountryCounts[fixture.awayTeam] = (backedCountryCounts[fixture.awayTeam] || 0) + 1;
                }
              });
            }

            if (isWorldCupMode) {
              // Count missed completed fixtures, not future matchday rows.
              completedFixtures.forEach((fixture) => {
                const pred = getPredictionForPlayer(player, userId, fixture.id);
                if (!hasValidScorePrediction(pred)) {
                  missedWeeks++;
                }
              });
            } else {
              // Count missed weeks from history: any week with 0 points
              historicalScores.forEach(row => {
                const score = row[player] || 0;
                if (score === 0) {
                  missedWeeks++;
                }
              });
            }

            stats.mostBingpots = updateTiedStat(stats.mostBingpots, player, bingpots, "count");
            stats.mostForgetful = updateTiedStat(stats.mostForgetful, player, missedWeeks, "missed");
          });

          // Get best gambler from coins league
          if (isWorldCupMode && coinsLeagueRows && coinsLeagueRows.length > 0) {
            const topGambler = coinsLeagueRows[0];
            const coins = topGambler.profit !== undefined ? topGambler.profit : (topGambler.points || 0);
            stats.bestGambler = { name: topGambler.player, coins: coins };
          }

          // Find best gameweek score
          historicalScores.forEach(row => {
            summaryPlayers.forEach(player => {
              const score = row[player] || 0;
              if (score <= 0) return;
              if (score > stats.bestGameweek.points) {
                stats.bestGameweek = { names: [player], points: score, gameweek: row.gameweek };
              } else if (score === stats.bestGameweek.points && row.gameweek === stats.bestGameweek.gameweek) {
                stats.bestGameweek.names.push(player);
              }
            });
          });

          if (isWorldCupMode) {
            Object.entries(backedCountryCounts).forEach(([country, count]) => {
              if (count > stats.mostBackedCountry.count) {
                stats.mostBackedCountry = { name: country, count };
              }
            });
          }

          if (!hasAnyPoints || (isWorldCupMode && completedFixtures.length === 0)) {
            stats.topScorer = { name: "", points: 0 };
            stats.mostBingpots = { names: [], count: 0 };
            stats.mostForgetful = { names: [], missed: 0 };
            stats.bestGameweek = { names: [], points: 0, gameweek: 0 };
          }

          const categories = [
            {
              title: "🏆 Top Scorer",
              player: stats.topScorer.name,
              value: `${stats.topScorer.points} points`,
              color: "#FFD700"
            },
            {
              title: "🎯 Most Bingpots",
              player: formatNames(stats.mostBingpots.names),
              players: stats.mostBingpots.names,
              value: `${stats.mostBingpots.count} bingpots`,
              color: "#FF6B9D"
            },
            {
              title: "😴 Most Forgetful",
              player: formatNames(stats.mostForgetful.names),
              players: stats.mostForgetful.names,
              value: `${stats.mostForgetful.missed} missed`,
              color: "#9CA3AF"
            },
            ...(isWorldCupMode
              ? [{
                  title: "🌍 Most Backed Country",
                  player: stats.mostBackedCountry.name
                    ? `${getWorldCupFlag(stats.mostBackedCountry.name)} ${stats.mostBackedCountry.name}`
                    : "—",
                  value: stats.mostBackedCountry.name
                    ? `${stats.mostBackedCountry.count} winning picks`
                    : "—",
                  color: "#F59E0B"
                }]
              : [{
                  title: "⚡ Best Gameweek",
                  player: formatNames(stats.bestGameweek.names) || "—",
                  players: stats.bestGameweek.names,
                  value: stats.bestGameweek.names.length ? `${stats.bestGameweek.points} pts (${getModeGameweekLabel(gameMode, stats.bestGameweek.gameweek)})` : "—",
                  color: "#F59E0B"
                }])
          ];
          categories.splice(3, 0, {
            title: "💰 Best Gambler",
            player: stats.bestGambler?.name || "—",
            value: stats.bestGambler?.name ? `${stats.bestGambler.coins >= 0 ? '+' : ''}${typeof stats.bestGambler.coins === 'number' ? stats.bestGambler.coins.toFixed(2) : stats.bestGambler.coins} coins` : "0.00 coins",
            color: "#22C55E"
          });

          return (
            <section style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, textAlign: "center" }}>
                {isWorldCupMode ? "World Cup Summary" : "Season Summary"}
              </h2>

              <div style={{ display: "grid", gap: 12 }}>
                {categories.map((cat, idx) => {
                  const tiedPlayers = Array.isArray(cat.players) ? cat.players : [];
                  const playerText = tiedPlayers.length
                    ? tiedPlayers.map((name) => formatUsernameForDisplay(name)).join(", ")
                    : formatUsernameForDisplay(cat.player || "—");

                  return (
                    <div
                      key={idx}
                      style={{
                        background: theme.panelHi,
                        border: `2px solid ${cat.color}`,
                        borderRadius: 12,
                        padding: 16,
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 700,
                          color: cat.color,
                        }}
                      >
                        {cat.title}
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 12,
                        }}
                      >
                        <div
                          style={{
                            fontSize: 20,
                            fontWeight: 800,
                            color: theme.text,
                            minWidth: 0,
                            overflowWrap: "anywhere",
                          }}
                          title={cat.player || "—"}
                        >
                          {playerText}
                        </div>
                        <div
                          style={{
                            fontSize: 14,
                            fontWeight: 600,
                            color: theme.muted,
                            flexShrink: 0,
                          }}
                        >
                          {cat.value}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })()}

        {/* History */}
        {activeView === "history" && (
          (() => {
            const historyPlayers = isWorldCupMode
              ? worldCupHistoryUsers.map((user) => user.username)
              : PLAYERS;
            const toggleHistorySection = (section) => {
              setHistorySectionsOpen((prev) => ({
                ...prev,
                [section]: !prev[section],
              }));
            };
            const historySectionHeader = (section, label, meta) => {
              const open = !!historySectionsOpen[section];
              return (
                <button
                  type="button"
                  onClick={() => toggleHistorySection(section)}
                  aria-expanded={open}
                  style={{
                    width: "100%",
                    border: "none",
                    borderBottom: open ? `1px solid ${theme.line}` : "none",
                    background: theme.panelHi,
                    color: theme.text,
                    padding: isMobile ? "12px 12px" : "14px 16px",
                    display: "grid",
                    gridTemplateColumns: "1fr auto",
                    gap: 12,
                    alignItems: "center",
                    textAlign: "left",
                    cursor: "pointer",
                    font: "inherit",
                  }}
                >
                  <span style={{ display: "grid", gap: 2 }}>
                    <span style={{ fontSize: 15, fontWeight: 800 }}>{label}</span>
                    {meta && (
                      <span style={{ fontSize: 12, color: theme.muted, fontWeight: 600 }}>
                        {meta}
                      </span>
                    )}
                  </span>
                  <span
                    aria-hidden="true"
                    style={{
                      color: theme.accent,
                      fontSize: 18,
                      fontWeight: 900,
                      transform: open ? "rotate(90deg)" : "rotate(0deg)",
                      transition: "transform 120ms ease",
                    }}
                  >
                    ›
                  </span>
                </button>
              );
            };

            return (
              <section
                style={{
                  ...cardStyle,
                  padding: 0,
                  overflow: "hidden",
                }}
              >
                <h2 style={{ margin: 0, fontSize: 18, padding: "16px 16px 12px" }}>
                  {isWorldCupMode ? "World Cup History" : "History"}
                </h2>

                <div style={{ display: "grid", gap: 10, padding: "0 10px 10px" }}>
                  <div
                    style={{
                      border: `1px solid ${theme.line}`,
                      borderRadius: 12,
                      overflow: "hidden",
                      background: theme.panel,
                    }}
                  >
                    {historySectionHeader(
                      "seasonWinners",
                      "Season Winners",
                      visibleSeasonWinnerHistory.length
                        ? `${visibleSeasonWinnerHistory.length} season${visibleSeasonWinnerHistory.length === 1 ? "" : "s"} recorded`
                        : "Appears once the final gameweek is complete"
                    )}

                    {historySectionsOpen.seasonWinners && (
                      <div style={{ display: "grid", gap: 8, padding: 10 }}>
                        {visibleSeasonWinnerHistory.length === 0 ? (
                          <div
                            style={{
                              color: theme.muted,
                              fontSize: 13,
                              padding: "8px 6px",
                            }}
                          >
                            No season winners recorded yet.
                          </div>
                        ) : (
                          visibleSeasonWinnerHistory.map((record) => (
                            <div
                              key={record.id}
                              style={{
                                display: "grid",
                                gridTemplateColumns: "auto minmax(0, 1fr) auto",
                                gap: isMobile ? 10 : 12,
                                alignItems: "center",
                                padding: "10px 12px",
                                borderRadius: 10,
                                background: theme.panelHi,
                                border: `1px solid ${theme.line}`,
                              }}
                            >
                              <div
                                style={{
                                  fontWeight: 800,
                                  color: theme.accent,
                                  fontSize: 14,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {record.seasonLabel || record.modeLabel}
                              </div>
                              <div
                                style={{
                                  minWidth: 0,
                                  fontSize: 16,
                                  fontWeight: 900,
                                  color: theme.text,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                }}
                                title={(record.winners || []).map((winner) => winner.player).join(", ")}
                              >
                                {(record.winners || [])
                                  .map((winner) => formatUsernameForDisplay(winner.player))
                                  .join(", ")}
                              </div>
                              <div
                                style={{
                                  justifySelf: "end",
                                  color: theme.accent2,
                                  fontWeight: 900,
                                  fontSize: 16,
                                  whiteSpace: "nowrap",
                                }}
                              >
                                {Number(record.points) || 0} pts
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  <div
                    style={{
                      border: `1px solid ${theme.line}`,
                      borderRadius: 12,
                      overflow: "hidden",
                      background: theme.panel,
                    }}
                  >
                    {historySectionHeader(
                      "weeklyScores",
                      "Weekly scores",
                      `${historicalScores.length} ${isWorldCupMode ? "matchday" : "gameweek"}${historicalScores.length === 1 ? "" : "s"}`
                    )}

                    {historySectionsOpen.weeklyScores && (
                      <div
                        style={{
                          overflowX: "auto",
                          overflowY: "auto",
                          maxHeight: "70vh",
                          position: "relative",
                          padding: "0 0 10px",
                          background: theme.panel,
                        }}
                      >
                        <table
                          style={{
                            width: "100%",
                            borderCollapse: "separate",
                            borderSpacing: 0,
                            fontSize: isMobile ? 12 : 13,
                          }}
                        >
                          <thead>
                            <tr
                              style={{
                                position: "sticky",
                                top: 0,
                                zIndex: 4,
                                background: theme.panel,
                              }}
                            >
                              <th
                                style={{
                                  textAlign: "center",
                                  padding: isMobile ? "8px 10px" : "10px 12px",
                                  position: "sticky",
                                  left: 0,
                                  zIndex: 5,
                                  background: theme.panel,
                                  borderRight: `1px solid ${theme.line}`,
                                  borderBottom: `1px solid ${theme.line}`,
                                  fontWeight: 800,
                                  color: theme.accent,
                                  width: isMobile ? "54px" : "64px",
                                  minWidth: isMobile ? "54px" : "64px",
                                }}
                              >
                                {isWorldCupMode ? "MD" : "GW"}
                              </th>
                              {historyPlayers.map((p) => (
                                <th
                                  key={p}
                                  style={{
                                    textAlign: "center",
                                    padding: isMobile ? "8px 6px" : "10px 8px",
                                    borderBottom: `1px solid ${theme.line}`,
                                    fontWeight: 700,
                                    color: theme.accent,
                                    background: theme.panel,
                                    minWidth: isMobile ? "50px" : "58px",
                                  }}
                                  title={p}
                                >
                                  {p.slice(0, 4)}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {historicalScores.map((row, idx) => {
                              const vals = historyPlayers.map((p) => Number(row[p]) || 0);
                              const max = Math.max(...vals);
                              const min = Math.min(...vals);
                              const range = max - min || 1;
                              const rowBg = theme.panelHi;

                              return (
                                <tr key={row.gameweek}>
                                  <td
                                    style={{
                                      padding: isMobile ? "8px 10px" : "10px 12px",
                                      color: theme.accent,
                                      position: "sticky",
                                      left: 0,
                                      zIndex: 3,
                                      background: theme.panel,
                                      borderRight: `1px solid ${theme.line}`,
                                      fontWeight: 800,
                                      textAlign: "center",
                                      borderBottom:
                                        idx < historicalScores.length - 1
                                          ? `1px solid ${theme.line}`
                                          : "none",
                                    }}
                                  >
                                    {isWorldCupMode ? row.gameweek : getModeGameweekLabel(gameMode, row.gameweek).replace(/^[A-Z]+/, "")}
                                  </td>
                                  {historyPlayers.map((p) => {
                                    const v = Number(row[p]) || 0;
                                    const shade = (v - min) / range;
                                    const isWinner = v === max && max > 0;
                                    return (
                                      <td
                                        key={p}
                                        style={{
                                          padding: isMobile ? "8px 6px" : "10px 8px",
                                          textAlign: "center",
                                          background: isWinner
                                            ? `rgba(34,197,94,${0.28 + 0.37 * shade})`
                                            : rowBg,
                                          fontWeight: isWinner ? 800 : 500,
                                          color: isWinner ? "#ffffff" : theme.text,
                                          borderBottom:
                                            idx < historicalScores.length - 1
                                              ? `1px solid ${theme.line}`
                                              : "none",
                                        }}
                                      >
                                        {v}
                                      </td>
                                    );
                                  })}
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                </div>
              </section>
            );
          })()
        )}

{/* Win Probabilities */}
{activeView === "winprob" && (
  <section style={cardStyle}>
    <h2 style={{ marginTop: 0, fontSize: 18 }}>
      {isWorldCupMode ? "World Cup Win Probability" : "Win probabilities"} — {getModeGameweekLabel(gameMode, selectedGameweek)}
    </h2>

    <div style={{ display: "grid", gap: 8 }}>
      {visibleFixtures.map((fixture) => {
        const model = generatedFixtureModelsByFixture[fixture.id] || null;
        const o = generatedModelOddsByFixture[fixture.id] || odds[fixture.id] || {};
        const probs = model
          ? {
              home: model.homeProb * 100,
              draw: model.drawProb * 100,
              away: model.awayProb * 100,
            }
          : computeProbabilities(o);
        const hasPremierModelDetails = model
          && Number.isFinite(Number(model.homeExpectedGoals))
          && Number.isFinite(Number(model.awayExpectedGoals));
        const homeModelDetails = hasPremierModelDetails
          ? {
              xg: Number(model.homeExpectedGoals).toFixed(1),
              cleanSheet: Math.round(Number(model.homeCleanSheetProb || 0) * 100),
              difficulty: model.homeDifficultyScore,
              attack: model.homeAttackDifficultyScore,
              defence: model.homeDefenceDifficultyScore,
            }
          : null;
        const awayModelDetails = hasPremierModelDetails
          ? {
              xg: Number(model.awayExpectedGoals).toFixed(1),
              cleanSheet: Math.round(Number(model.awayCleanSheetProb || 0) * 100),
              difficulty: model.awayDifficultyScore,
              attack: model.awayAttackDifficultyScore,
              defence: model.awayDefenceDifficultyScore,
            }
          : null;

        return (
          <div
            key={fixture.id}
            style={{
              background: theme.panelHi,
              borderRadius: 12,
              border: `1px solid rgba(255, 255, 255, 0.3)`,
              padding: 12,
              display: "grid",
              gap: 10,
            }}
          >
            {/* Fixture name with badges */}
            <div style={{ 
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              fontWeight: 700, 
              fontSize: 14,
              lineHeight: 1.3
            }}>
              {/* Home team badge */}
              {isWorldCupMode ? (
                <span style={{ fontSize: 22 }}>{getWorldCupFlag(fixture.homeTeam)}</span>
              ) : resolveTeamBadge(fixture.homeTeam) && (
                <img
                  src={resolveTeamBadge(fixture.homeTeam)}
                  alt={fixture.homeTeam}
                  style={{
                    width: 24,
                    height: 24,
                    objectFit: "contain",
                  }}
                />
              )}
              
              <span>{getTeamCode(fixture.homeTeam)}</span>
              <span style={{ color: theme.muted }}>vs</span>
              <span>{getTeamCode(fixture.awayTeam, gameMode)}</span>
              
              {/* Away team badge */}
              {isWorldCupMode ? (
                <span style={{ fontSize: 22 }}>{getWorldCupFlag(fixture.awayTeam)}</span>
              ) : resolveTeamBadge(fixture.awayTeam) && (
                <img
                  src={resolveTeamBadge(fixture.awayTeam)}
                  alt={fixture.awayTeam}
                  style={{
                    width: 24,
                    height: 24,
                    objectFit: "contain",
                  }}
                />
              )}
            </div>

            {/* Labels row */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              fontSize: 11,
              color: theme.muted,
              fontWeight: 600,
              textAlign: "center",
              marginBottom: -6
            }}>
              <div>HOME</div>
              <div>DRAW</div>
              <div>AWAY</div>
            </div>

            {/* Odds inputs row */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6
            }}>
              <input
                type="number"
                step="0.01"
                min="1.01"
                style={probInput}
                value={o.home ?? ""}
                onChange={(e) =>
                  updateOdds(fixture.id, { home: e.target.value })
                }
              />

              <input
                type="number"
                step="0.01"
                min="1.01"
                style={probInput}
                value={o.draw ?? ""}
                onChange={(e) =>
                  updateOdds(fixture.id, { draw: e.target.value })
                }
              />

              <input
                type="number"
                step="0.01"
                min="1.01"
                style={probInput}
                value={o.away ?? ""}
                onChange={(e) =>
                  updateOdds(fixture.id, { away: e.target.value })
                }
              />
            </div>

            {/* Probabilities row */}
            <div style={{ 
              display: "grid", 
              gridTemplateColumns: "1fr 1fr 1fr",
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              textAlign: "center"
            }}>
              {probs ? (
                <>
                  <div style={{ color: theme.accent }}>{probs.home.toFixed(1)}%</div>
                  <div style={{ color: theme.muted }}>{probs.draw.toFixed(1)}%</div>
                  <div style={{ color: theme.accent }}>{probs.away.toFixed(1)}%</div>
                </>
              ) : (
                <div style={{ gridColumn: "1 / -1", color: theme.muted }}>-</div>
              )}
            </div>

            {hasPremierModelDetails && (
              <div
                style={{
                  borderTop: `1px solid ${theme.line}`,
                  paddingTop: 8,
                  display: "grid",
                  gridTemplateColumns: "1fr auto 1fr",
                  gap: 8,
                  alignItems: "stretch",
                }}
              >
                {[homeModelDetails, awayModelDetails].map((details, index) => (
                  <div
                    key={index === 0 ? "home-model-details" : "away-model-details"}
                    style={{
                      minWidth: 0,
                      border: `1px solid ${theme.line}`,
                      borderRadius: 8,
                      padding: "7px 8px",
                      display: "grid",
                      gap: 4,
                      fontSize: 11,
                      color: theme.muted,
                    }}
                  >
                    <div style={{ color: theme.text, fontWeight: 900 }}>
                      {index === 0 ? getTeamCode(fixture.homeTeam, gameMode) : getTeamCode(fixture.awayTeam, gameMode)}
                    </div>
                    <div>Est goals {details.xg}</div>
                    <div>Clean sheet {details.cleanSheet}%</div>
                    <div>
                      Diff {details.difficulty} · Atk {details.attack} · Def {details.defence}
                    </div>
                  </div>
                )).reduce((items, item, index) => {
                  if (index === 1) {
                    items.push(
                      <div
                        key="model-confidence"
                        title={`Model confidence ${model.confidenceScore || 0}/100`}
                        style={{
                          alignSelf: "center",
                          color: theme.muted,
                          fontSize: 10,
                          fontWeight: 800,
                          textAlign: "center",
                          textTransform: "uppercase",
                        }}
                      >
                        {model.confidence || "low"}
                      </div>
                    );
                  }
                  items.push(item);
                  return items;
                }, [])}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </section>
)}

        {/* Mini-leagues */}
        {activeView === "leagues" && (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>{isWorldCupMode ? "WC Mini‑Leagues" : "Mini‑leagues"}</h2>

            <div style={{ display: "grid", gap: 10 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  onClick={handleLoadLeagues}
                  disabled={leaguesLoading}
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: `1px solid ${theme.line}`,
                    background: theme.panelHi,
                    color: theme.text,
                    cursor: "pointer",
                    fontSize: 13,
                  }}
                >
                  {leaguesLoading ? "Loading…" : "Refresh my leagues"}
                </button>
                {leagueSuccess && (
                  <div style={{ fontSize: 13, color: theme.accent2 }}>
                    {leagueSuccess}
                  </div>
                )}
                {leagueError && (
                  <div style={{ fontSize: 13, color: theme.danger }}>
                    {leagueError}
                  </div>
                )}
              </div>

              <form
                onSubmit={handleCreateLeague}
                style={{ display: "flex", gap: 8, flexWrap: "nowrap" }}
              >
                <input
                  value={leagueNameInput}
                  onChange={(e) => setLeagueNameInput(e.target.value)}
                  placeholder={isWorldCupMode ? "New WC league name" : "New league name"}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: theme.panelHi,
                    color: theme.text,
                    border: `1px solid ${theme.line}`,
                  }}
                />
                <button
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: theme.accent,
                    cursor: "pointer",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    flex: "0 0 auto",
                    width: isMobile ? 74 : 84,
                  }}
                >
                  Create
                </button>
              </form>

              <form
                onSubmit={handleJoinLeague}
                style={{ display: "flex", gap: 8, flexWrap: "nowrap" }}
              >
                <input
                  value={leagueJoinCode}
                  onChange={(e) => setLeagueJoinCode(e.target.value)}
                  placeholder={isWorldCupMode ? "WC join code" : "Join code"}
                  style={{
                    flex: 1,
                    minWidth: 0,
                    padding: "8px 10px",
                    borderRadius: 8,
                    background: theme.panelHi,
                    color: theme.text,
                    border: `1px solid ${theme.line}`,
                  }}
                />
                <button
                  style={{
                    padding: "8px 10px",
                    borderRadius: 8,
                    border: "none",
                    background: theme.accent2,
                    cursor: "pointer",
                    fontWeight: 800,
                    whiteSpace: "nowrap",
                    flex: "0 0 auto",
                    width: isMobile ? 74 : 84,
                  }}
                >
                  Join
                </button>
              </form>

              <div style={{ display: "grid", gap: 6 }}>
                <h2 style={{ margin: "4px 0 2px", fontSize: 18, fontWeight: 800 }}>
                  {isWorldCupMode ? "My WC Leagues" : "My-Leagues"}
                </h2>
                {myLeagues.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      background: theme.panelHi,
                      borderRadius: 10,
                      border: `1px solid ${
                        String(selectedMiniLeague?.id || "") === String(l.id)
                          ? theme.accent
                          : theme.line
                      }`,
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{l.name}</div>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 8,
                          flexWrap: "wrap",
                          marginTop: 4,
                          fontSize: 12,
                          color: theme.muted,
                        }}
                      >
                        <button
                          type="button"
                          onClick={() => copyLeagueCode(l)}
                          title="Copy join code"
                          style={{
                            padding: "4px 7px",
                            borderRadius: 7,
                            border: `1px solid ${theme.line}`,
                            background: theme.panel,
                            color: theme.text,
                            cursor: "pointer",
                            fontSize: 12,
                            fontWeight: 800,
                            letterSpacing: 0.4,
                          }}
                        >
                          Code: {l.joinCode}
                        </button>
                        <span>Members: {l.memberCount}</span>
                      </div>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", justifyContent: "flex-end" }}>
                    <button
                      type="button"
                      onClick={() => copyLeagueCode(l)}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${theme.line}`,
                        background:
                          String(copiedLeagueCodeId || "") === String(l.id)
                            ? theme.accent2
                            : theme.panel,
                        color:
                          String(copiedLeagueCodeId || "") === String(l.id)
                            ? "#06240f"
                            : theme.text,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      {String(copiedLeagueCodeId || "") === String(l.id) ? "Copied" : "Copy code"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        rememberSelectedLeagueId(l.id);
                        setActiveView("league");
                      }}
                      style={{
                        padding: "8px 10px",
                        borderRadius: 8,
                        border: `1px solid ${theme.line}`,
                        background:
                          String(selectedMiniLeague?.id || "") === String(l.id)
                            ? theme.accent
                            : theme.panel,
                        color:
                          String(selectedMiniLeague?.id || "") === String(l.id)
                            ? "#07120f"
                            : theme.text,
                        cursor: "pointer",
                        fontSize: 13,
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                      }}
                    >
                      View table
                    </button>
                    </div>
                  </div>
                ))}
                {!myLeagues.length && (
                  <div style={{ fontSize: 13, color: theme.muted }}>
                    {isWorldCupMode ? "No WC leagues yet — create or join one above." : "No leagues yet — create or join one above."}
                  </div>
                )}
              </div>

              <div
                style={{
                  background: theme.panelHi,
                  borderRadius: 10,
                  border: `1px solid ${theme.line}`,
                  padding: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: 8,
                    marginBottom: 8,
                    flexWrap: "wrap",
                  }}
                >
                  <h2 style={{ margin: 0, fontSize: 18, textAlign: "center", flex: 1 }}>
                    {isWorldCupMode ? "WC Mini-League Leaderboard" : "Mini-League Leaderboard"}
                  </h2>
                  <div style={{ fontSize: 12, color: theme.muted, textAlign: "center", width: "100%" }}>
                    Ranked by average points per member
                  </div>
                </div>

                {miniLeagueLeaderboardLoading && (
                  <div style={{ fontSize: 13, color: theme.muted }}>
                    Calculating mini-league rankings...
                  </div>
                )}

                {miniLeagueLeaderboardError && (
                  <div style={{ fontSize: 13, color: theme.danger }}>
                    {miniLeagueLeaderboardError}
                  </div>
                )}

                {!miniLeagueLeaderboardLoading &&
                  !miniLeagueLeaderboardError &&
                  miniLeagueLeaderboardRows.length > 0 && (
                    <div style={{ display: "grid", gap: 6 }}>
                      {miniLeagueLeaderboardRows.map((row, i) => (
                        <div
                          key={row.leagueId}
                          style={{
                            background: theme.panel,
                            borderRadius: 8,
                            border: `1px solid ${theme.line}`,
                            padding: "8px 10px",
                            display: "grid",
                            gridTemplateColumns: isMobile ? "36px 1fr auto" : "44px 1fr auto",
                            alignItems: "center",
                            gap: 8,
                          }}
                        >
                          <div
                            style={{
                              fontWeight: 800,
                              color:
                                i === 0
                                  ? "#FFD700"
                                  : i === 1
                                  ? "#C0C0C0"
                                  : i === 2
                                  ? "#CD7F32"
                                  : theme.muted,
                            }}
                          >
                            {i + 1}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700 }}>{row.leagueName}</div>
                            <div style={{ fontSize: 12, color: theme.muted }}>
                              Members: {row.memberCount} • Total: {Math.round(row.totalPoints)}
                            </div>
                          </div>
                          <div
                            style={{
                              textAlign: "right",
                              fontWeight: 800,
                              color: theme.accent2,
                              minWidth: isMobile ? 64 : 86,
                            }}
                          >
                            {row.averagePoints.toFixed(2)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                {!miniLeagueLeaderboardLoading &&
                  !miniLeagueLeaderboardError &&
                  miniLeagueLeaderboardRows.length === 0 && (
                    <div style={{ fontSize: 13, color: theme.muted }}>
                      No mini-leagues found yet.
                    </div>
                  )}
              </div>
            </div>
          </section>
        )}

        {/* Rules Page */}
        {activeView === "rules" && (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 22, textAlign: "center", fontWeight: 800 }}>
              {isWorldCupMode ? "📋 WC Rules & Scoring" : "📋 Rules & Scoring"}
            </h2>

            {/* Prediction Rules */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                marginTop: 0, 
                marginBottom: 12,
                color: theme.accent,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span>⚽</span> Prediction Rules
              </h3>
              <div style={{ 
                background: theme.panelHi, 
                padding: 16, 
                borderRadius: 10,
                border: `1px solid ${theme.line}`
              }}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, minWidth: 24 }}>⏰</span>
                    <div>
                      <strong>Deadline:</strong> Predictions lock <strong>1 hour before kickoff</strong> for each match.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, minWidth: 24 }}>🎯</span>
                    <div>
                      <strong>Bingpot!!</strong> <span style={{ color: theme.accent2, fontWeight: 700 }}>7 points</span> — Predict the exact final score.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, minWidth: 24 }}>📊</span>
                    <div>
                      <strong>Correcto!</strong> <span style={{ color: theme.accent2, fontWeight: 700 }}>4 points</span> — Correct goal difference but not exact score.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, minWidth: 24 }}>✅</span>
                    <div>
                      <strong>Resulto!</strong> <span style={{ color: theme.accent2, fontWeight: 700 }}>2 points</span> — Home win, draw, or away win.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Multipliers */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                marginTop: 0, 
                marginBottom: 12,
                color: theme.accent,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span>🚀</span> Multipliers
              </h3>
              <div style={{ display: "grid", gap: 12 }}>
                <div style={{ 
                  background: theme.panelHi, 
                  padding: 16, 
                  borderRadius: 10,
                  border: `2px solid ${theme.accent}`
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>👑</span>
                    <strong style={{ fontSize: 16 }}>Captain (2x)</strong>
                  </div>
                  <div style={{ color: theme.muted, fontSize: 14 }}>
                    Pick <strong>one Captain per {isWorldCupMode ? "matchday" : "gameweek"}</strong>. Their points are <strong>doubled</strong>.
                  </div>
                </div>
                
                <div style={{ 
                  background: theme.panelHi, 
                  padding: 16, 
                  borderRadius: 10,
                  border: `2px solid #F59E0B`
                }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 24 }}>⚡</span>
                    <strong style={{ fontSize: 16 }}>Triple Captain (3x)</strong>
                  </div>
                  <div style={{ color: theme.muted, fontSize: 14 }}>
                    Use <strong>once per {isWorldCupMode ? "tournament" : "season"}</strong>. That match's points are <strong>tripled</strong>. Choose wisely!
                  </div>
                </div>
              </div>
            </div>

            <>
            {/* Divider */}
            <div style={{
              height: 2,
              background: theme.accent,
              marginTop: 32,
              marginBottom: 32,
              opacity: 0.5
            }} />

            {/* Coins Game */}
            <div>
              <h3 style={{ 
                fontSize: 18, 
                fontWeight: 700, 
                marginTop: 0, 
                marginBottom: 12,
                color: theme.accent,
                display: "flex",
                alignItems: "center",
                gap: 8
              }}>
                <span>💰</span> Coins Game
              </h3>
              <div style={{ 
                background: theme.panelHi, 
                padding: 16, 
                borderRadius: 10,
                border: `1px solid ${theme.line}`
              }}>
                <div style={{ display: "grid", gap: 12 }}>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, minWidth: 24 }}>🪙</span>
                    <div>
                      <strong>Starting Balance:</strong> You get <strong>10 coins per {isWorldCupMode ? "matchday" : "gameweek"}</strong>. These 10 coins do <strong>not carry over</strong>, so use them or lose them!
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, minWidth: 24 }}>🎲</span>
                    <div>
                      <strong>Place Bets:</strong> Bet coins on match outcomes (Home/Draw/Away) based on odds.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, minWidth: 24 }}>📈</span>
                    <div>
                      <strong>Winnings:</strong> Win = coins × odds. Lose = lose your bet. Your <strong>profit/loss rolls over</strong> across the {isWorldCupMode ? "tournament" : "season"}.
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 20, minWidth: 24 }}>🏆</span>
                    <div>
                      <strong>Leaderboard:</strong> Compete for the best total profit on the <strong>Coins League</strong> tab!
                    </div>
                  </div>
                </div>
              </div>
            </div>
            </>

            {/* Footer Note */}
            <div style={{ 
              marginTop: 24, 
              padding: 16, 
              background: theme.panelHi, 
              borderRadius: 10,
              border: `1px solid ${theme.line}`,
              textAlign: "center",
              fontSize: 14,
              color: theme.muted
            }}>
              <strong>💡 Pro Tip:</strong> Everything syncs instantly via the cloud. Make your picks before the deadline!
            </div>
          </section>
        )}

        {/* Settings */}
        {activeView === "settings" && (
          <section style={{ maxWidth: 600, margin: "0 auto" }}>
            <h2 style={{ 
              fontSize: 28,
              fontWeight: 800,
              color: theme.text,
              marginBottom: 20,
              textAlign: "center"
            }}>
              {isWorldCupMode ? "⚙️ WC Settings" : "⚙️ Settings"}
            </h2>

            {/* Avatar Customization */}
            <div style={{
              background: theme.panelHi,
              borderRadius: 12,
              border: `1px solid ${theme.line}`,
              padding: 20,
              marginBottom: 16
            }}>
              <h3 style={{ 
                fontSize: 18,
                fontWeight: 700,
                color: theme.text,
                marginBottom: 16
              }}>
                🎨 Customize Avatar
              </h3>

              <div style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 24,
                padding: 20,
                background: theme.panel,
                borderRadius: 12
              }}>
                <PlayerAvatar 
                  name={currentPlayer} 
                  size={120} 
                  seed={avatarSeed || currentPlayer}
                  avatarStyle={avatarStyle}
                  favoriteMode={gameMode}
                  favoriteTeam={
                    isWorldCupMode
                      ? (accountFavoriteCountryInput || accountFavoriteCountry)
                      : (accountFavoriteTeamInput || accountFavoriteTeam)
                  }
                />
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 8
                }}>
                  Avatar Style
                </label>
                <select
                  value={avatarStyle}
                  onChange={(e) => {
                    setAvatarStyle(e.target.value);
                    localStorage.setItem('avatar_style', e.target.value);
                    setAvatarSaveStatus("Avatar preview changed. Save it so other players see it.");
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${theme.line}`,
                    background: theme.panel,
                    color: theme.text,
                    fontSize: 14,
                    marginBottom: 16
                  }}
                >
                  <option value="avataaars">Avataaars</option>
                  <option value="bottts">Bottts (Robots)</option>
                  <option value="lorelei">Lorelei</option>
                  <option value="notionists">Notionists</option>
                  <option value="personas">Personas</option>
                  <option value="pixel-art">Pixel Art</option>
                  <option value="adventurer">Adventurer</option>
                  <option value="big-smile">Big Smile</option>
                  <option value="fun-emoji">Fun Emoji</option>
                </select>
              </div>

              <div style={{ marginBottom: 16 }}>
                <label style={{
                  display: "block",
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.text,
                  marginBottom: 8
                }}>
                  Character Name
                </label>
                <input
                  type="text"
                  value={avatarSeed}
                  onChange={(e) => {
                    setAvatarSeed(e.target.value);
                    localStorage.setItem('avatar_seed', e.target.value);
                    setAvatarSaveStatus("Avatar preview changed. Save it so other players see it.");
                  }}
                  placeholder={`Leave blank to use "${currentPlayer}"`}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${theme.line}`,
                    background: theme.panel,
                    color: theme.text,
                    fontSize: 14
                  }}
                />
                <div style={{
                  fontSize: 12,
                  color: theme.muted,
                  marginTop: 6,
                  lineHeight: 1.5
                }}>
                  💡 Each unique name creates a completely different character! Try words, names, or phrases.
                </div>
              </div>


              <button
                onClick={() => {
                  // Generate a random seed for fun
                  const randomSeed = Math.random().toString(36).substring(2, 10);
                  setAvatarSeed(randomSeed);
                  localStorage.setItem('avatar_seed', randomSeed);
                  setAvatarSaveStatus("Avatar preview changed. Save it so other players see it.");
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.accent}`,
                  background: 'rgba(56,189,248,0.1)',
                  color: theme.accent,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 8
                }}
              >
                🎲 Random Character
              </button>

              <button
                onClick={() => {
                  handleAvatarChange(avatarSeed || currentPlayer, avatarStyle);
                }}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.accent2}`,
                  background: 'rgba(34,197,94,0.12)',
                  color: theme.accent2,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 8
                }}
              >
                💾 Save Avatar
              </button>

              <button
                onClick={() => {
                  handleAvatarChange(currentPlayer, avatarStyle);
                }}
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: `1px solid ${theme.line}`,
                  background: theme.panel,
                  color: theme.text,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                Reset to Default
              </button>
              {avatarSaveStatus && (
                <div style={{
                  fontSize: 12,
                  color: avatarSaveStatus.toLowerCase().includes("failed") ? "#ef4444" : theme.muted,
                  marginTop: 8,
                  lineHeight: 1.4,
                  textAlign: "center"
                }}>
                  {avatarSaveStatus}
                </div>
              )}
            </div>

            {/* Sound Effects */}
            <div style={{
              background: theme.panelHi,
              borderRadius: 12,
              border: `1px solid ${theme.line}`,
              padding: 20,
              marginBottom: 16
            }}>
              <h3 style={{
                fontSize: 18,
                fontWeight: 700,
                color: theme.text,
                marginBottom: 12
              }}>
                🔊 Sound Effects
              </h3>

              <p style={{
                fontSize: 14,
                color: theme.muted,
                marginBottom: 14,
                lineHeight: 1.6
              }}>
                Toggle in-app sounds for coins add/remove actions and gameweek winner celebrations.
              </p>

              <label
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  fontSize: 14,
                  color: theme.text,
                }}
              >
                <input
                  type="checkbox"
                  checked={!!soundEffectsEnabled}
                  onChange={(e) => updateSoundEffectsEnabled(e.target.checked)}
                />
                <span>Enable sound effects</span>
              </label>
            </div>

            {/* Push Notifications */}
            <div style={{
              background: theme.panelHi,
              borderRadius: 12,
              border: `1px solid ${theme.line}`,
              padding: 20,
              marginBottom: 16
            }}>
              <h3 style={{ 
                fontSize: 18,
                fontWeight: 700,
                color: theme.text,
                marginBottom: 16
              }}>
                🔔 Push Notifications
              </h3>

              {!pushSupported && (
                <div style={{
                  padding: 12,
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.3)",
                  borderRadius: 8,
                  color: "#ef4444",
                  fontSize: 14,
                  marginBottom: 12
                }}>
                  ⚠️ Push notifications are not supported in your browser
                </div>
              )}

              {pushSupported && (
                <>
                  <p style={{ 
                    fontSize: 14, 
                    color: theme.muted, 
                    marginBottom: 16,
                    lineHeight: 1.6
                  }}>
                    Get notified when gameweeks start, deadlines approach, and results are in!
                  </p>

                  <div style={{ display: "grid", gap: 10, marginBottom: 14 }}>
                    {[
                      { key: "deadline1h", label: "Notify 1 hour before deadline" },
                      { key: "deadline24h", label: "Notify 24 hours before deadline" },
                      { key: "bingpot", label: "Bingpot notification" },
                      { key: "betWin", label: "Bet win notification" },
                      { key: "badgeEarned", label: "New badge earned notification" },
                      { key: "favoriteTeamResult", label: "Favourite team result notification" },
                    ].map((opt) => (
                      <label
                        key={opt.key}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          fontSize: 14,
                          color: theme.text,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={!!pushPrefs[opt.key]}
                          onChange={(e) => updatePushPref(opt.key, e.target.checked)}
                        />
                        <span>{opt.label}</span>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={async () => {
                      if (!pushEnabled) {
                        try {
                          await enablePushNotifications();
                          alert('✅ Push notifications enabled!');
                        } catch (err) {
                          console.error('Push subscription failed:', err);
                          alert('Failed to enable push notifications: ' + err.message);
                        }
                      } else {
                        // Unsubscribe
                        try {
                          await disablePushNotifications();
                          alert('❌ Push notifications disabled');
                        } catch (err) {
                          console.error('Push unsubscribe failed:', err);
                          alert('Failed to disable notifications: ' + err.message);
                        }
                      }
                    }}
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      borderRadius: 8,
                      border: "none",
                      background: pushEnabled ? "#ef4444" : theme.accent,
                      color: "#fff",
                      fontSize: 16,
                      fontWeight: 700,
                      cursor: "pointer",
                      transition: "opacity 0.2s"
                    }}
                  >
                    {pushEnabled ? "🔕 Disable Notifications" : "🔔 Enable Notifications"}
                  </button>
                  {pushEnabled && (
                    <>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            await enablePushNotifications();
                            const result = await apiSendTestPush(authToken);
                            const deviceLabel = result.deviceCount === 1 ? "device" : "devices";
                            alert(
                              `Test notification sent to ${result.deviceCount} registered ${deviceLabel}.`
                            );
                          } catch (err) {
                            alert(`Test notification failed: ${err.message}`);
                          }
                        }}
                        style={{
                          width: "100%",
                          marginTop: 10,
                          padding: "10px 16px",
                          borderRadius: 8,
                          border: `1px solid ${theme.line}`,
                          background: theme.panel,
                          color: theme.text,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Send test notification
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const enabledFixture = activeFixtures.find(
                              (fixture) => fixturePushPrefs[String(fixture.id)] === true
                            );
                            if (!enabledFixture) {
                              alert("Turn on a fixture bell first.");
                              return;
                            }
                            await enablePushNotifications({ refreshExisting: false });
                            const result = await apiSendFixtureTestPush(
                              authToken,
                              enabledFixture.id
                            );
                            const deviceLabel = result.deviceCount === 1 ? "device" : "devices";
                            alert(
                              `Fixture alert test sent to ${result.deviceCount} registered ${deviceLabel}.`
                            );
                          } catch (err) {
                            alert(`Fixture alert test failed: ${err.message}`);
                          }
                        }}
                        style={{
                          width: "100%",
                          marginTop: 10,
                          padding: "10px 16px",
                          borderRadius: 8,
                          border: `1px solid ${theme.line}`,
                          background: theme.panel,
                          color: theme.text,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Send fixture alert test
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                          try {
                            const status = await apiGetLivePushStatus(authToken);
                            alert(
                              [
                                `Live worker: ${status.running ? "running" : "idle"}`,
                                `Last run: ${status.lastFinishedAt || status.lastStartedAt || "never"}`,
                                `Reason: ${status.lastReason || "n/a"}`,
                                `Mode: ${status.mode || "all"}`,
                                `Fetched matches: ${status.fetchedMatches || 0}`,
                                `Matched fixtures: ${status.matchedFixtures || 0}`,
                                `Subscribed fixtures: ${status.subscribedFixtures || 0}`,
                                `Attempted sends: ${status.attemptedNotifications || 0}`,
                                `Accepted sends: ${status.acceptedNotifications || 0}`,
                                ...Object.entries(status.byMode || {}).map(
                                  ([mode, modeStatus]) =>
                                    `${mode}: fetched ${modeStatus.fetchedMatches || 0}, matched ${modeStatus.matchedFixtures || 0}, subscribed ${modeStatus.subscribedFixtures || 0}`
                                ),
                                ...Object.entries(status.competitionErrors || {}).map(
                                  ([mode, error]) => `${mode} error: ${error}`
                                ),
                                status.lastError ? `Error: ${status.lastError}` : "",
                              ]
                                .filter(Boolean)
                                .join("\n")
                            );
                          } catch (err) {
                            alert(`Live notification status failed: ${err.message}`);
                          }
                        }}
                        style={{
                          width: "100%",
                          marginTop: 10,
                          padding: "10px 16px",
                          borderRadius: 8,
                          border: `1px solid ${theme.line}`,
                          background: theme.panel,
                          color: theme.text,
                          fontSize: 14,
                          fontWeight: 700,
                          cursor: "pointer",
                        }}
                      >
                        Check live notification status
                      </button>
                    </>
                  )}
                </>
              )}
            </div>

            <div style={{
              background: theme.panelHi,
              borderRadius: 12,
              border: `1px solid ${theme.line}`,
              padding: 20
            }}>
              <h3 style={{ 
                fontSize: 18,
                fontWeight: 700,
                color: theme.text,
                marginBottom: 16
              }}>
                👤 Account
              </h3>

              <div style={{ 
                fontSize: 14, 
                color: theme.muted,
                marginBottom: 12
              }}>
                <strong>Logged in as:</strong> {currentPlayer}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: theme.muted, marginBottom: 6 }}>
                  Recovery email
                </label>
                <input
                  type="email"
                  value={accountEmailInput}
                  onChange={(e) => setAccountEmailInput(e.target.value)}
                  placeholder="you@example.com"
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${theme.line}`,
                    background: theme.panel,
                    color: theme.text,
                    fontSize: 14,
                    marginBottom: 8,
                    boxSizing: "border-box",
                  }}
                />
                <button
                  type="button"
                  onClick={handleSaveRecoveryEmail}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: `1px solid ${theme.line}`,
                    background: theme.panel,
                    color: theme.text,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Save recovery email
                </button>
                {accountEmailError && (
                  <div style={{ marginTop: 6, fontSize: 12, color: theme.danger }}>
                    {accountEmailError}
                  </div>
                )}
                {accountEmailStatus && (
                  <div style={{ marginTop: 6, fontSize: 12, color: theme.accent2 }}>
                    {accountEmailStatus}
                  </div>
                )}
                {accountEmail && (
                  <div style={{ marginTop: 6, fontSize: 12, color: theme.muted }}>
                    Current: {accountEmail}
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 12 }}>
                <label style={{ display: "block", fontSize: 12, color: theme.muted, marginBottom: 6 }}>
                  {isWorldCupMode ? "Favourite World Cup country" : "Favourite Premier League team"}
                </label>
                <select
                  value={isWorldCupMode ? accountFavoriteCountryInput : accountFavoriteTeamInput}
                  onChange={(e) => {
                    if (isWorldCupMode) setAccountFavoriteCountryInput(e.target.value);
                    else setAccountFavoriteTeamInput(e.target.value);
                  }}
                  style={{
                    width: "100%",
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: `1px solid ${theme.line}`,
                    background: theme.panel,
                    color: theme.text,
                    fontSize: 14,
                    marginBottom: 8,
                    boxSizing: "border-box",
                  }}
                >
                  <option value="">{isWorldCupMode ? "Select country..." : "Select team..."}</option>
                  {(isWorldCupMode ? WORLD_CUP_COUNTRIES : PREMIER_LEAGUE_TEAMS).map((team) => (
                    <option key={team} value={team}>
                      {isWorldCupMode ? `${getWorldCupFlag(team)} ${team}` : team}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={handleSaveFavoriteTeam}
                  style={{
                    width: "100%",
                    padding: "9px 12px",
                    borderRadius: 8,
                    border: `1px solid ${theme.line}`,
                    background: theme.panel,
                    color: theme.text,
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  {isWorldCupMode ? "Save favourite country" : "Save favourite team"}
                </button>
                {accountFavoriteTeamError && (
                  <div style={{ marginTop: 6, fontSize: 12, color: theme.danger }}>
                    {accountFavoriteTeamError}
                  </div>
                )}
                {accountFavoriteTeamStatus && (
                  <div style={{ marginTop: 6, fontSize: 12, color: theme.accent2 }}>
                    {accountFavoriteTeamStatus}
                  </div>
                )}
                {(isWorldCupMode ? accountFavoriteCountry : accountFavoriteTeam) && (
                  <div style={{ marginTop: 6, fontSize: 12, color: theme.muted }}>
                    Current: {isWorldCupMode ? resolvedAccountFavoriteCountry : resolvedAccountFavoriteTeam}
                  </div>
                )}
              </div>

              <button
                onClick={() => setShowPasswordModal(true)}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: `1px solid ${theme.line}`,
                  background: theme.panel,
                  color: theme.text,
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer",
                  marginBottom: 12
                }}
              >
                🔑 Change Password
              </button>

              <button
                onClick={() => {
                  if (window.confirm("Are you sure you want to log out?")) {
                    setIsLoggedIn(false);
                    setAuthToken("");
                    setCurrentPlayer("");
                    setCurrentUserId("");
                    localStorage.removeItem(AUTH_STORAGE_KEY);
                    setActiveView("predictions");
                  }
                }}
                style={{
                  width: "100%",
                  padding: "10px 16px",
                  borderRadius: 8,
                  border: "1px solid rgba(239,68,68,0.3)",
                  background: "rgba(239,68,68,0.1)",
                  color: "#ef4444",
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: "pointer"
                }}
              >
                🚪 Log Out
              </button>
            </div>
          </section>
        )}

      </div>
      
    </div>
  );
}
