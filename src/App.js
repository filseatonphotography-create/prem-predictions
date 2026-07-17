import React, { useState, useMemo, useEffect, useRef } from "react";
import "./App.css";
import FIXTURES from "./fixtures";
import WORLD_CUP_FIXTURES from "./worldCupFixtures";
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
const WELCOME_PENDING_STORAGE_KEY = "prediction_welcome_pending_user_v1";
const WELCOME_SEEN_STORAGE_KEY = "prediction_welcome_seen_users_v1";
const PREMIER_SEASON_RESET_STORAGE_KEY = "premier_season_reset_2026_27_v3";
const MIGRATION_FLAG = "phil_legacy_migrated_v1";
const GAME_MODE_STORAGE_KEY = "prediction_game_mode_v1";
const GAMEWEEK_BY_MODE_STORAGE_KEY = "prediction_gameweeks_by_mode_v1";
const SELECTED_MINI_LEAGUE_STORAGE_KEY = "prediction_selected_mini_league_v1";
const SEASON_WINNERS_STORAGE_KEY = "prediction_season_winners_v1";
const WORLD_CUP_CENTRAL_OPEN_STORAGE_KEY = "world_cup_central_open_v1";
const FIXTURE_PUSH_STORAGE_KEY = "fixture_push_prefs_v1";
const PREMIER_MODE = "premierLeague";
const WORLD_CUP_MODE = "worldCup";
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
const PLAYERS = ["Tom", "Emma", "Phil", "Steve", "Dave", "Ian", "Anthony"];
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
  Arsenal: 98,
  "Man City": 96,
  "Aston Villa": 92,
  Chelsea: 90,
  "Crystal Palace": 86,
  Sunderland: 86,
  Brighton: 85,
  "Man Utd": 84,
  Liverpool: 84,
  Everton: 83,
  Spurs: 82,
  Newcastle: 82,
  Brentford: 81,
  Bournemouth: 81,
  Fulham: 79,
  "Nott'm Forest": 78,
  Leeds: 77,
  Coventry: 75,
  Ipswich: 74,
  Hull: 72,
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
    return {
      homeProb: 0.36,
      drawProb: 0.28,
      awayProb: 0.36,
      homeDifficultyScore: 3,
      awayDifficultyScore: 3,
    };
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

  const toDifficultyScore = (expectedPoints) => {
    if (expectedPoints >= 2.15) return 1;
    if (expectedPoints >= 1.7) return 2;
    if (expectedPoints >= 1.25) return 3;
    if (expectedPoints >= 0.9) return 4;
    return 5;
  };

  return {
    homeProb,
    drawProb,
    awayProb,
    homeDifficultyScore: toDifficultyScore(homeExpectedPoints),
    awayDifficultyScore: toDifficultyScore(awayExpectedPoints),
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

/**
 * Generate realistic-ish decimal odds for a fixture
 * using team ratings, home advantage and a draw baseline.
 * This feeds both the Win Probabilities view and the coins game.
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

function getDifficultyMeta(score) {
  if (score <= 1) return { label: "Easy", color: "#22c55e" };
  if (score <= 2) return { label: "Favourable", color: "#84cc16" };
  if (score <= 3) return { label: "Balanced", color: "#eab308" };
  if (score <= 4) return { label: "Hard", color: "#f97316" };
  return { label: "Very hard", color: "#ef4444" };
}

function buildLeaguePerformanceContext(results) {
  const byTeam = {};
  PREMIER_LEAGUE_TEAMS.forEach((team) => {
    byTeam[normalizeTeamName(team)] = {
      team,
      played: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      goalDifference: 0,
      lastFive: [],
      formPoints: 0,
      position: 10,
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
  });

  Object.values(byTeam).forEach((team) => {
    team.formPoints = team.lastFive.reduce((sum, outcome) => {
      if (outcome === "W") return sum + 3;
      if (outcome === "D") return sum + 1;
      return sum;
    }, 0);
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

function buildFixtureModel(fixture, context = {}) {
  if (!fixture) {
    return {
      homeProb: 0.38,
      drawProb: 0.24,
      awayProb: 0.38,
      homeDifficultyScore: 3,
      awayDifficultyScore: 3,
    };
  }

  if (isWorldCupFixtureModel(fixture)) {
    return buildWorldCupFixtureModel(fixture);
  }

  const performanceByTeam = context.performanceByTeam || {};
  const homeKey = normalizeTeamName(fixture.homeTeam);
  const awayKey = normalizeTeamName(fixture.awayTeam);
  const homePerf = performanceByTeam[homeKey] || {};
  const awayPerf = performanceByTeam[awayKey] || {};

  const homePosition = Number(homePerf.position) || 10;
  const awayPosition = Number(awayPerf.position) || 10;
  const homeFormPoints = Number(homePerf.formPoints) || 0;
  const awayFormPoints = Number(awayPerf.formPoints) || 0;
  const homeGdPerGame =
    Number(homePerf.played) > 0 ? Number(homePerf.goalDifference || 0) / Number(homePerf.played) : 0;
  const awayGdPerGame =
    Number(awayPerf.played) > 0 ? Number(awayPerf.goalDifference || 0) / Number(awayPerf.played) : 0;

  const ratingGap = getTeamRating(fixture.homeTeam) - getTeamRating(fixture.awayTeam);
  const positionGap = awayPosition - homePosition;
  const formGap = homeFormPoints - awayFormPoints;
  const gdGap = homeGdPerGame - awayGdPerGame;

  // Keep the prior as the anchor, then blend in live context more gently.
  const priorEdge = ratingGap * 0.07;
  const tableEdge = positionGap * 0.14;
  const formEdge = formGap * 0.08;
  const gdEdge = gdGap * 0.22;
  const homeAdvantage = 0.42;

  const rawEdge = priorEdge + tableEdge + formEdge + gdEdge + homeAdvantage;
  const cappedEdge = Math.max(-2.25, Math.min(2.25, rawEdge));
  const homeRaw = 1 / (1 + Math.exp(-cappedEdge / 2.45));
  let drawProb = 0.285 - Math.min(Math.abs(cappedEdge) * 0.016, 0.07);
  drawProb = Math.max(0.20, Math.min(0.31, drawProb));
  const nonDrawProb = 1 - drawProb;
  const homeProb = homeRaw * nonDrawProb;
  const awayProb = (1 - homeRaw) * nonDrawProb;

  const homeExpectedPoints = homeProb * 3 + drawProb;
  const awayExpectedPoints = awayProb * 3 + drawProb;

  const toDifficultyScore = (expectedPoints) => {
    if (expectedPoints >= 2.15) return 1;
    if (expectedPoints >= 1.7) return 2;
    if (expectedPoints >= 1.25) return 3;
    if (expectedPoints >= 0.9) return 4;
    return 5;
  };

  return {
    homeProb,
    drawProb,
    awayProb,
    homeDifficultyScore: toDifficultyScore(homeExpectedPoints),
    awayDifficultyScore: toDifficultyScore(awayExpectedPoints),
  };
}

export function buildGeneratedModelOdds(fixtures = [], context = {}) {
  const out = {};

  (fixtures || []).forEach((fixture) => {
    const model = buildFixtureModel(fixture, context);
    const overround = 0.94;
    out[fixture.id] = {
      home: Number((overround / model.homeProb).toFixed(2)),
      draw: Number((overround / model.drawProb).toFixed(2)),
      away: Number((overround / model.awayProb).toFixed(2)),
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

      return {
        fixtureId: fixture.id,
        opponent,
        opponentCode: getTeamCode(opponent),
        venue: isHome ? "H" : "A",
        kickoff: fixture.kickoff,
        difficultyScore,
        ...getDifficultyMeta(difficultyScore),
      };
    });

  return {
    form,
    upcoming,
    formPoints: Number(performanceByTeam[normalizedTeam]?.formPoints) || 0,
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
  const scoreAudioCtxRef = useRef(null);

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
    if (!soundEffectsEnabled) return;
    try {
      const audio = new Audio(isAdding ? '/coin.mp3' : '/negative coin.mp3');
      audio.volume = 0.3;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (err) {
      console.log('Audio error:', err);
    }
  };

  // Generic click sounds for score +/- (no files)
  const playScoreSound = (isAdding) => {
    if (!soundEffectsEnabled) return;
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!scoreAudioCtxRef.current) scoreAudioCtxRef.current = new AudioCtx();
      const ctx = scoreAudioCtxRef.current;
      if (ctx.state === "suspended") ctx.resume();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = isAdding ? 880 : 440;
      gain.gain.value = 0.18;
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      const now = ctx.currentTime;
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      osc.stop(now + 0.13);
    } catch (err) {
      console.log("Score sound error:", err);
    }
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
      if (saved) return JSON.parse(saved);
    } catch {}
    return {
      deadline1h: true,
      deadline24h: true,
      bingpot: true,
      betWin: true,
      favoriteTeamResult: false,
    };
  });
  
  const [, setApiStatus] = useState("Auto results: loading…");
  const [resultsRefreshing, setResultsRefreshing] = useState(false);
  const [premierLeagueTableRows, setPremierLeagueTableRows] = useState([]);
  const [premierLeagueTableLoading, setPremierLeagueTableLoading] = useState(false);
  const [premierLeagueTableError, setPremierLeagueTableError] = useState("");
  const [lastStandingsUpdated, setLastStandingsUpdated] = useState(null);
  const [expandedPremierTeam, setExpandedPremierTeam] = useState("");
  const [activeView, setActiveView] = useState(() => {
    const saved = localStorage.getItem('activeView');
    return saved || "predictions";
  });
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

  // Save activeView to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeView', activeView);
  }, [activeView]);

  useEffect(() => {
    localStorage.setItem(SEASON_WINNERS_STORAGE_KEY, JSON.stringify(seasonWinnerHistory));
  }, [seasonWinnerHistory]);

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
  const [showPredictionIqModal, setShowPredictionIqModal] = useState(false);
  const [predictionIqPendingAfterWinner, setPredictionIqPendingAfterWinner] = useState(false);
  const [predictionIqPreview, setPredictionIqPreview] = useState(false);
  const winnerAudioRef = useRef(null);

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

const premierLeagueInsights = useMemo(() => {
  const out = {};
  (premierLeagueTableRows || []).forEach((row) => {
    const teamName = row?.team?.name || row?.team?.shortName || row?.team?.tla || "";
    if (!teamName) return;
    out[normalizeTeamName(teamName)] = buildPremierTeamInsights(
      teamName,
      results,
      leaguePerformanceContext
    );
  });
  return out;
}, [premierLeagueTableRows, results, leaguePerformanceContext]);

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
        setPredictions(
          premierSeasonResetApplied
            ? keepOnlyWorldCupPredictions(parsed.predictions || {})
            : {}
        );
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
          const next = { ...prev, ...prefs };
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

      const localPushPrefs = JSON.parse(localStorage.getItem("push_prefs_v1") || "{}");
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
  if (activeView !== "coinsLeague" && activeView !== "summary") return;
  if (!authToken) return; // Don't fetch if not authenticated yet

  let cancelled = false;
  let activeController = null;

  const fetchCoinsLeaderboard = async () => {
    try {
      if (activeController) activeController.abort();
      const controller = new AbortController();
      activeController = controller;
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const leagueId = selectedMiniLeague?.id || "";
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
}, [activeView]);

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
    const cachePredictions = keepOnlyWorldCupPredictions(predictions);
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
          keepOnlyWorldCupPredictions({ [key]: normalized })[key] || {};

        // Replace only the logged-in user's predictions with the cloud data
        setPredictions((prev) => {
          const resetSafePrev = keepOnlyWorldCupPredictions(prev);
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
            WORLD_CUP_FIXTURES
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
        ({ userId, username }) => ({ userId, username })
      );

            // 3) Keys = legacy PLAYERS + league members (mapped)
      const memberKeys = leagueUsers.map(toLegacyKey);
      const keys = isWorldCupMode
        ? Array.from(new Set(memberKeys))
        : Array.from(new Set([...PLAYERS, ...memberKeys]));

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
          ? cloudDataRaw
          : (keepOnlyWorldCupPredictions({ [k]: cloudDataRaw })[k] || {});
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
    boostEfficiency: "No boosts used",
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
  let boostedPicks = 0;
  let successfulBoosts = 0;
  let boostPointsDelta = 0;
  let awayGoalUnderestimates = 0;
  let awayResultUnderestimates = 0;
  let missedOpportunity = null;
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

    if (predHome === realHome && predAway === realAway) exactScores += 1;
    else if (Math.abs(predHome - realHome) + Math.abs(predAway - realAway) === 1) closeMisses += 1;
    if (isCorrectResult) {
      correctResults += 1;
    }
    if (actualResult === "D") {
      actualDraws += 1;
      if (predictedResult === "D") correctDraws += 1;
    }
    if (pred.isDouble || pred.isTriple) {
      boostedPicks += 1;
      if (basePoints > 0) successfulBoosts += 1;
      boostPointsDelta += points - basePoints;
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
    if (points === 0 && (!missedOpportunity || missedScore > missedOpportunity.missedScore)) {
      missedOpportunity = {
        label: `${fixture.homeTeam} vs ${fixture.awayTeam}`,
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
  const currentScore =
    Number(gwTotals[currentPredictionKey]) ||
    Number(gwTotals[currentUserId]) ||
    Number(gwTotals[currentPlayer]) ||
    currentGwPoints;
  const previousTotals = {};
  if (computedWeeklyTotals) {
    activeGameweeks
      .filter((gw) => gw < selectedGameweek)
      .forEach((gw) => {
        Object.entries(computedWeeklyTotals[gw] || {}).forEach(([key, value]) => {
          previousTotals[key] = (previousTotals[key] || 0) + (Number(value) || 0);
        });
      });
  }
  const rankEntries = Object.entries(gwTotals).filter(([, score]) => Number(score) > 0);
  const previousRankEntries = rankEntries.map(([key]) => [key, previousTotals[key] || 0]);
  const rankOf = (entries, key, fallbackScore = 0) => {
    const sorted = [...entries];
    if (!sorted.some(([entryKey]) => String(entryKey) === String(key))) {
      sorted.push([key, fallbackScore]);
    }
    sorted.sort((a, b) => Number(b[1] || 0) - Number(a[1] || 0));
    const index = sorted.findIndex(([entryKey]) => String(entryKey) === String(key));
    return index === -1 ? 0 : index + 1;
  };
  const userRankKey = gwTotals[currentPredictionKey] !== undefined ? currentPredictionKey : currentUserId;
  const previousRank = rankOf(previousRankEntries, userRankKey, 0);
  const currentRank = rankOf(
    rankEntries.map(([key, score]) => [key, (previousTotals[key] || 0) + (Number(score) || 0)]),
    userRankKey,
    currentScore
  );
  const rankChange = previousRank && currentRank ? previousRank - currentRank : 0;
  const completedGameweeks = activeGameweeks
    .filter((gw) => gw <= selectedGameweek)
    .filter((gw) => {
      const fixtures = activeFixtures.filter((fixture) => fixture.gameweek === gw);
      return fixtures.length > 0 && fixtures.every((fixture) => isFixtureCompleted(fixture, results));
    });
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
    boostEfficiency: boostedPicks
      ? `${successfulBoosts}/${boostedPicks} boosts scored (${boostPointsDelta >= 0 ? "+" : ""}${boostPointsDelta} pts)`
      : "No boosts used",
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
  gameMode,
  isWorldCupMode,
  predictions,
  results,
  selectedGameweek,
]);

const predictionIqSampleReport = useMemo(
  () => ({
    rating: 82,
    exactScores: 7,
    correctResults: 18,
    currentWinningStreak: 4,
    longestWinningStreak: 6,
    closeMisses: 5,
    rankChange: 42,
    strongestTeam: "Liverpool",
    weakestTeam: "Chelsea",
    drawAccuracy: "3/5 draws",
    boostEfficiency: "2/3 boosts scored (+11 pts)",
    missedOpportunity: "Villa vs Spurs",
    suggestion: "You consistently underestimate away teams.",
    completedPredictions: 10,
    gameweek: selectedGameweek || 1,
    isPreview: true,
  }),
  [selectedGameweek]
);

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
    setPredictionIqPreview(false);
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

  const renderPredictionIqReport = (options = {}) => {
    const compact = !!options.compact;
    const report = options.report || predictionIqReport;
    const isPreview = !!options.preview || !!report.isPreview;
    const rankText =
      report.rankChange > 0
        ? `+${report.rankChange} ranking places`
        : report.rankChange < 0
        ? `${report.rankChange} ranking places`
        : "No ranking change";
    const ratingColor =
      report.rating >= 80 ? theme.accent2 : report.rating >= 55 ? theme.accent : theme.danger;
    const statItems = [
      { icon: "✅", label: `${report.exactScores} exact scores` },
      { icon: "🏆", label: `${report.correctResults} correct results` },
      { icon: "🔥", label: `Current weekly-win streak: ${report.currentWinningStreak || 0}` },
      { icon: "⭐", label: `Longest weekly-win streak: ${report.longestWinningStreak || 0}` },
      { icon: "📈", label: rankText },
    ];
    const detailItems = [
      { label: "Your strongest team", value: report.strongestTeam },
      { label: "Your weakest", value: report.weakestTeam },
      { label: "Draw accuracy", value: report.drawAccuracy },
      { label: "Boost efficiency", value: report.boostEfficiency },
      { label: "Near misses", value: `${report.closeMisses || 0} one-goal misses` },
      { label: "Biggest missed opportunity", value: report.missedOpportunity },
    ];

    return (
      <div style={{ display: "grid", gap: compact ? 12 : 14 }}>
        {isPreview && (
          <div
            style={{
              background: "rgba(245,158,11,0.12)",
              border: `1px solid ${theme.warn}`,
              borderRadius: 10,
              padding: "8px 10px",
              color: theme.text,
              fontSize: 12,
              fontWeight: 750,
              textAlign: "center",
            }}
          >
            Preview sample - not real player data
          </div>
        )}
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
            <div style={{ display: "grid", gap: 8 }}>
              {statItems.map((item) => (
                <div
                  key={item.label}
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    fontSize: 15,
                    fontWeight: 750,
                  }}
                >
                  <span aria-hidden="true">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: isMobile || compact ? "1fr" : "repeat(2, minmax(0, 1fr))",
            gap: 8,
          }}
        >
          {detailItems.map((item) => (
            <div
              key={item.label}
              style={{
                background: theme.panelHi,
                border: `1px solid ${theme.line}`,
                borderRadius: 10,
                padding: "10px 12px",
                minWidth: 0,
              }}
            >
              <div style={{ fontSize: 11, color: theme.muted, fontWeight: 800 }}>
                {item.label}
              </div>
              <div
                style={{
                  marginTop: 3,
                  fontSize: 15,
                  fontWeight: 800,
                  color: theme.text,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
                title={item.value}
              >
                {item.value}
              </div>
            </div>
          ))}
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
                  {shouldShowWelcome ? "Account created" : "Welcome Page"}
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
                You are ready to start predicting.
              </h2>
              <p style={{ margin: 0, color: theme.muted, lineHeight: 1.55, fontSize: 15 }}>
                Prediction Addiction has two main competitions: the league table for score predictions
                and the coins game for backing match outcomes. Make your picks before the deadline,
                then track the tables as results come in. Use the Leagues menu to create or join
                mini-leagues with friends.
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "repeat(2, minmax(0, 1fr))",
                gap: 12,
              }}
            >
              {[
                ["League", "Predict exact scores each gameweek. Correct outcomes and exact scores add points to your league table."],
                ["Coins", "Spend your weekly coins on home, draw, or away outcomes. Winning bets return coins based on the price."],
              ].map(([title, copy]) => (
                <div
                  key={title}
                  style={{
                    padding: 14,
                    borderRadius: 12,
                    border: `1px solid ${theme.line}`,
                    background: theme.panelHi,
                  }}
                >
                  <div style={{ color: "#ffffff", fontSize: 18, fontWeight: 800 }}>{title}</div>
                  <div style={{ marginTop: 6, color: theme.muted, fontSize: 13, lineHeight: 1.45 }}>
                    {copy}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: isMobile ? "1fr" : "140px minmax(0, 1fr)",
                gap: 16,
                alignItems: "center",
                padding: 14,
                borderRadius: 12,
                border: `1px solid ${theme.line}`,
                background: "rgba(56,189,248,0.08)",
              }}
            >
              <div
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: 24,
                  overflow: "hidden",
                  margin: isMobile ? "0 auto" : 0,
                  boxShadow: "0 18px 38px rgba(0,0,0,0.32)",
                }}
              >
                <img
                  src="/icon_180.png"
                  alt="Prediction Addiction home screen icon"
                  style={{ width: "100%", height: "100%", display: "block" }}
                />
              </div>
              <div style={{ display: "grid", gap: 6 }}>
                <div style={{ color: "#ffffff", fontSize: 18, fontWeight: 800 }}>
                  Save it to your home screen
                </div>
                <div style={{ color: theme.muted, fontSize: 13, lineHeight: 1.5 }}>
                  Add this page to your phone home screen so it opens like an app. This is the
                  icon you will see when it is saved.
                </div>
              </div>
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
                Settings has account, avatar, favourite team, notifications, and password options.
                Rules has the scoring details for predictions and coins.
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                <button
                  type="button"
                  onClick={() => completeWelcome("settings")}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 999,
                    border: `1px solid ${theme.line}`,
                    background: theme.panelHi,
                    color: theme.text,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Settings
                </button>
                <button
                  type="button"
                  onClick={() => completeWelcome("rules")}
                  style={{
                    padding: "9px 12px",
                    borderRadius: 999,
                    border: `1px solid ${theme.line}`,
                    background: theme.panelHi,
                    color: theme.text,
                    cursor: "pointer",
                    fontWeight: 700,
                  }}
                >
                  Rules
                </button>
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

  // ---------- MAIN APP ----------
  return (
    <div style={pageStyle}>
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
            {renderPredictionIqReport({
              compact: true,
              report: predictionIqPreview ? predictionIqSampleReport : predictionIqReport,
              preview: predictionIqPreview,
            })}
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
            <div style={{ marginTop: 8, display: "flex", justifyContent: "center" }}>
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
                  minWidth: 0,
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
  { id: "history", label: isWorldCupMode ? "WC History" : "History" },
  { id: "winprob", label: isWorldCupMode ? "WC Win Probability" : "Win Probabilities" },
  { id: "settings", label: isWorldCupMode ? "WC Settings" : "Settings" },
  { id: "rules", label: "Rules" },
  { id: "welcome", label: "Welcome Page" },
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
    onChange={(e) =>
      updatePrediction(
        currentPredictionKey,
        fixture.id,
        { isDouble: e.target.checked }
      )
    }
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
  onChange={(e) =>
    updatePrediction(
      currentPredictionKey,
      fixture.id,
      e.target.checked
        ? { isTriple: true, isDouble: false } // triple ON → captain OFF
        : { isTriple: false }                 // triple OFF → leave captain alone
    )
  }
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
        onClick={() =>
          handleCoinsChange(
            fixture.id,
            coinsStake,
            s,
            o
          )
        }
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
              {leaderboard.map((row, i) => {
                const displayPlayerName = formatUsernameForDisplay(row.player);
                // Color scheme based on position
                let borderColor = theme.line;
                let emoji = "";
                
                if (i === 0) {
                  borderColor = "#FFD700"; // Gold for 1st
                  emoji = "🥇";
                } else if (i === 1) {
                  borderColor = "#C0C0C0"; // Silver for 2nd
                  emoji = "🥈";
                } else if (i === 2) {
                  borderColor = "#CD7F32"; // Bronze for 3rd
                  emoji = "🥉";
                } else if (i === leaderboard.length - 1) {
                  emoji = "💩"; // Poo for last place
                }
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
                      transition: "transform 0.2s",
                    }}
                  >
                    <div style={{ 
                      color: i < 3 ? borderColor : theme.muted,
                      fontWeight: 700,
                      fontSize: 16,
                      display: "flex",
                      alignItems: "center",
                      gap: 4
                    }}>
                      {emoji && <span style={{ fontSize: 18 }}>{emoji}</span>}
                      {!emoji && <span>{i + 1}</span>}
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
                      color: i === 0 ? "#FFD700" : theme.text,
                      minWidth: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}>
                      <span title={row.player}>{displayPlayerName}</span>
                    </div>
                    <div style={{ 
                      textAlign: "right", 
                      fontWeight: 800,
                      fontSize: 18,
                      color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : theme.accent
                    }}>
                      <AnimatedNumber
                        value={row.points}
                        duration={450}
                        format={(v) => Math.round(v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </section>
        )}

        {/* Global League Table */}
        {activeView === "globalLeague" && (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18, textAlign: "center" }}>{isWorldCupMode ? "🌍 WC Global League" : "🌍 Global League Table"}</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {globalLeaderboard.map((row, i) => {
                const displayPlayerName = formatUsernameForDisplay(row.player);
                let borderColor = theme.line;
                let emoji = "";

                if (i === 0) {
                  borderColor = "#FFD700";
                  emoji = "🥇";
                } else if (i === 1) {
                  borderColor = "#C0C0C0";
                  emoji = "🥈";
                } else if (i === 2) {
                  borderColor = "#CD7F32";
                  emoji = "🥉";
                } else if (i === globalLeaderboard.length - 1) {
                  emoji = "💩";
                }
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
                      transition: "transform 0.2s",
                    }}
                  >
                    <div
                      style={{
                        color: i < 3 ? borderColor : theme.muted,
                        fontWeight: 700,
                        fontSize: 16,
                        display: "flex",
                        alignItems: "center",
                        gap: 4,
                      }}
                    >
                      {emoji && <span style={{ fontSize: 18 }}>{emoji}</span>}
                      {!emoji && <span>{i + 1}</span>}
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
                    <div
                      style={{
                        fontWeight: 700,
                        fontSize: 15,
                        color: i === 0 ? "#FFD700" : theme.text,
                        minWidth: 0,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span title={row.player}>{displayPlayerName}</span>
                    </div>
                    <div
                      style={{
                        textAlign: "right",
                        fontWeight: 800,
                        fontSize: 18,
                        color:
                          i === 0
                            ? "#FFD700"
                            : i === 1
                            ? "#C0C0C0"
                            : i === 2
                            ? "#CD7F32"
                            : theme.accent,
                      }}
                    >
                      <AnimatedNumber
                        value={row.points}
                        duration={450}
                        format={(v) => Math.round(v)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {activeView === "predictionIq" && !isWorldCupMode && (
          <section style={cardStyle}>
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
                <h2 style={{ margin: 0, fontSize: 18 }}>
                  Prediction IQ Report
                </h2>
                <div style={{ marginTop: 3, fontSize: 12, color: theme.muted }}>
                  Weekly insight for {currentPlayer || "your account"}
                </div>
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", justifyContent: "flex-end" }}>
                <button
                  type="button"
                  onClick={() => setPredictionIqPreview((value) => !value)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: `1px solid ${predictionIqPreview ? theme.warn : theme.line}`,
                    background: predictionIqPreview ? "rgba(245,158,11,0.14)" : theme.panelHi,
                    color: predictionIqPreview ? theme.warn : theme.accent,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  {predictionIqPreview ? "Real data" : "Preview sample"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowPredictionIqModal(true)}
                  style={{
                    padding: "7px 10px",
                    borderRadius: 8,
                    border: `1px solid ${theme.line}`,
                    background: theme.panelHi,
                    color: theme.accent,
                    fontSize: 12,
                    fontWeight: 800,
                    cursor: "pointer",
                    whiteSpace: "nowrap",
                  }}
                >
                  Pop out
                </button>
              </div>
            </div>
            {renderPredictionIqReport({
              report: predictionIqPreview ? predictionIqSampleReport : predictionIqReport,
              preview: predictionIqPreview,
            })}
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
            {lastStandingsUpdated && (
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
              {premierLeagueTableLoading && (
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
                  Loading standings...
                </div>
              )}

              {!premierLeagueTableLoading && premierLeagueTableError && (
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

              {!premierLeagueTableLoading &&
                !premierLeagueTableError &&
                premierLeagueTableRows.map((row, i) => {
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
                  if (i === 0) borderColor = "#FFD700";
                  else if (i < 4) borderColor = "#22C55E";
                  else if (i >= premierLeagueTableRows.length - 3) borderColor = "#EF4444";

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

  // Color scheme based on position
  let borderColor = theme.line;
  let emoji = "";
  
  if (i === 0) {
    borderColor = "#FFD700"; // Gold for 1st
    emoji = "🥇";
  } else if (i === 1) {
    borderColor = "#C0C0C0"; // Silver for 2nd
    emoji = "🥈";
  } else if (i === 2) {
    borderColor = "#CD7F32"; // Bronze for 3rd
    emoji = "🥉";
  } else if (i === coinsLeagueRows.length - 1) {
    emoji = "💩"; // Poo for last place
  }
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
        color: i < 3 ? borderColor : theme.muted,
        fontWeight: 700,
        fontSize: 16,
        display: "flex",
        alignItems: "center",
        gap: 4
      }}>
        {emoji && <span style={{ fontSize: 18 }}>{emoji}</span>}
        {!emoji && <span>{i + 1}</span>}
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
        color: i === 0 ? "#FFD700" : theme.text,
        minWidth: 0,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        <span title={row.player}>{displayPlayerName}</span>
      </div>
      <div style={{ 
        textAlign: "right", 
        fontWeight: 800,
        fontSize: 18,
        color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : theme.accent
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
        const o = generatedModelOddsByFixture[fixture.id] || odds[fixture.id] || {};
        const probs = computeProbabilities(o);

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
                      <strong>Starting Balance:</strong> You get <strong>10 coins per {isWorldCupMode ? "matchday" : "gameweek"}</strong>.
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
