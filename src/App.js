import React, { useState, useMemo, useEffect } from "react";
import "./App.css";
import FIXTURES from "./fixtures";
const BUILD_ID = "2025-11-26-a";
const CoinIcon = () => (
  <img
    src="/coin.png"
    alt="coin"
    style={{
      width: 18,
      height: 18,
      verticalAlign: "middle",
      marginRight: 4,
    }}
  />
);

const MIGRATION_FLAG = "phil_legacy_migrated_v1";
const legacyMap = {
  Tom: "1763791297309",
  Ian: "1763801801288",
  Dave: "1763801999658",
  Anthony: "1763802020494",
  Steve: "1763812904100",
  Emma: "1763813732635",
  Phil: "1763873593264",
};

// --- TEAM ABBREVIATIONS FOR PROBABILITIES ---
const TEAM_ABBREVIATIONS = {
  Arsenal: "ARS",
  "Aston Villa": "AVL",
  Bournemouth: "BOU",
  Brentford: "BRE",
  Brighton: "BHA",
  Burnley: "BUR",
  Chelsea: "CHE",
  "Crystal Palace": "CRY",
  Everton: "EVE",
  Fulham: "FUL",
  Liverpool: "LIV",
  Luton: "LUT",

  // ↓↓↓ MANCHESTER TEAMS ↓↓↓
  "Man City": "MCI",
  "Man United": "MUN",
  "Manchester United": "MUN",
  "Man Utd": "MUN",

  Newcastle: "NEW",
  Nottingham: "NOT",
  Southampton: "SOU",
  Tottenham: "TOT",
  "West Ham": "WHU",
  Wolves: "WOL",
  "Sunderland": "SUN",

  // ↓↓↓ FOREST + LEEDS ↓↓↓
  "Nott'm Forest": "NFO",
  "Nottingham Forest": "NFO",
  Leeds: "LEE",
  "Leeds United": "LEE",

  Spurs: "TOT",
  "Tottenham Hotspur": "TOT",
};

/**
 * PREMIER LEAGUE PREDICTION GAME — Rebuilt cloud-synced + redesigned UI
 * Requirements covered:
 * 1) Always use Render backend for predictions (unless DEV_USE_LOCAL true)
 * 2) Auth persistence in localStorage key "pl_prediction_auth_v1"
 * 3) Load cloud predictions on login/restore and merge instantly
 * 4) Legacy player mapping handled by backend (frontend just treats names normally)
 * 5) Admin reset handled by backend
 * 6) CORS handled by backend
 * 7) Results + odds endpoints preserved
 */

// ---- CONFIG ----
const DEV_USE_LOCAL = false; // set true ONLY for offline/dev localStorage testing

const BACKEND_BASE = "http://localhost:5001";

const STORAGE_KEY = "pl_prediction_game_v2";
const AUTH_STORAGE_KEY = "pl_prediction_auth_v1";

// Legacy/original players for history/league views
const PLAYERS = ["Tom", "Emma", "Phil", "Steve", "Dave", "Ian", "Anthony"];

// Optional team badges – flat icons stored in /public/badges
// (We'll add the actual image files in the next step.)
const TEAM_BADGES = {
  Arsenal: "/badges/arsenal.png",
  "Aston Villa": "/badges/aston_ville.png",
  Bournemouth: "/badges/bournemouth.png",
  Brentford: "/badges/brentford.png",
  Brighton: "/badges/brighton.png",
  Burnley: "/badges/burnley.png",
  Chelsea: "/badges/chelsea.png",
  "Crystal Palace": "/badges/crystal_palace.png",
  Everton: "/badges/everton.png",
  Fulham: "/badges/fulham.png",
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


// Spreadsheet weekly totals (historic seed)
const SPREADSHEET_WEEKLY_TOTALS = {
  Tom: [8, 14, 33, 8, 42, 11, 34, 16, 14, 8, 26],
  Emma: [26, 15, 4, 14, 19, 11, 20, 25, 12, 32, 19],
  Phil: [8, 15, 11, 18, 27, 6, 16, 17, 28, 29, 18],
  Steve: [14, 16, 20, 23, 2, 11, 28, 17, 27, 30, 15],
  Dave: [24, 11, 7, 26, 14, 23, 31, 11, 15, 28, 8],
  Ian: [23, 10, 7, 20, 20, 24, 24, 22, 12, 4, 21],
  Anthony: [12, 25, 15, 28, 25, 11, 23, 13, 17, 17, 0],
};

const GAMEWEEKS = Array.from(new Set(FIXTURES.map((f) => f.gameweek))).sort(
  (a, b) => a - b
);

// --- TEAM NAME NORMALISATION (kept from your version) ---
function normalizeTeamName(name) {
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
    hovealbion: "brightonandhovealbion",
    fulham: "fulham",
    brentford: "brentford",
    southampton: "southampton",
    burnley: "burnley",
    everton: "everton",
    leicester: "leicester",
    leicestercity: "leicestercity",
  };

  if (aliasMap[s]) s = aliasMap[s];
  return s;
}

// --- API HELPERS ---
async function apiSignup(username, password) {
  const res = await fetch(`${BACKEND_BASE}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
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

async function apiFetchMyLeagues(token) {
  const res = await fetch(`${BACKEND_BASE}/api/leagues/my`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to load leagues.");
  return data.leagues || [];
}

async function apiCreateLeague(token, name) {
  const res = await fetch(`${BACKEND_BASE}/api/league/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ name }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to create league.");
  return data.league || data;
}

async function apiJoinLeague(token, code) {
  const res = await fetch(`${BACKEND_BASE}/api/league/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Failed to join league.");
  return data.league || data;
}

// Results & Odds (unchanged)
// eslint-disable-next-line no-unused-vars
async function fetchPremierLeagueResults() {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/results`);
    if (!res.ok) return { matches: [], error: `HTTP ${res.status}` };
    const matches = await res.json();
    return { matches, error: null };
  } catch (err) {
    return { matches: [], error: err.message };
  }
}

// --- COINS GAME API HELPERS ---
async function apiGetMyCoins(token, gameweek) {
  const gw = gameweek != null ? String(gameweek) : "";
  const url = `${BACKEND_BASE}/api/coins/my?gameweek=${encodeURIComponent(gw)}`;

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
    body: JSON.stringify(payload || {}),
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
  const deadline = kickoff - 60 * 60 * 1000;
  return Date.now() > deadline;
}

function isGameweekLocked(gameweek) {
  const fixtures = FIXTURES.filter((f) => f.gameweek === gameweek);
  if (fixtures.length === 0) return false;
  const earliestDeadline = Math.min(
    ...fixtures.map(
      (f) => new Date(f.kickoff).getTime() - 60 * 60 * 1000
    )
  );
  return Date.now() > earliestDeadline;
}

// --- TEAM RATINGS FOR MODELLED ODDS ---
// Based on the 2025/26 table + current form snapshot you sent
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
  "West Ham": 75,
  Burnley: 73,
  Wolves: 70,
};

function getTeamRating(name) {
  const rating = TEAM_RATINGS[name];
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
  "Man City": 96,

  Arsenal: 92,
  Liverpool: 90,
  Spurs: 88,

  "Aston Villa": 85,
  Chelsea: 84,
  Newcastle: 83,
  "Man Utd": 82,

  Brighton: 80,
  "West Ham": 78,
  Brentford: 76,
  Wolves: 75,
  "Crystal Palace": 74,
  Fulham: 73,
  Bournemouth: 72,
  Everton: 71,

  "Nott'm Forest": 69,
  Leeds: 68,
  Burnley: 67,
  Sunderland: 65,
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
  const day = String(d.getUTCDate()).padStart(2, "0");
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = monthNames[d.getUTCMonth()];
  const hours = String(d.getUTCHours()).padStart(2, "0");
  const mins = String(d.getUTCMinutes()).padStart(2, "0");
  return `${day} ${month} ${hours}:${mins}`;
}
// eslint-disable-next-line no-unused-vars
function formatOdds(value) {
  if (value === undefined || value === null || value === "") return "-";
  const n = Number(value);
  if (Number.isNaN(n)) return "-";
  return n.toFixed(2);
}


function getTeamCode(name) {
  if (!name) return "";

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
    { match: ["crystal palace", "palace"], code: "CRY" },
    { match: ["everton"], code: "EVE" },
    { match: ["fulham"], code: "FUL" },
    { match: ["ipswich", "ipswich town"], code: "IPS" },
    { match: ["leicester", "leicester city"], code: "LEI" },
    { match: ["liverpool"], code: "LIV" },
    { match: ["manchester city", "man city", "manchester c"], code: "MCI" },
    { match: ["manchester united", "man united", "man utd", "united"], code: "MUN" },
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

// ---------------------------------------------------------------------------
const TAGLINES = [
  "Where Every Score Matters",
  "Think You Know Football? Prove It."
];

const randomTagline = TAGLINES[Math.floor(Math.random() * TAGLINES.length)];
export default function App() {
  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMode, setLoginMode] = useState("login");
  // Change password modal state
const [showPasswordModal, setShowPasswordModal] = useState(false);
const [oldPasswordInput, setOldPasswordInput] = useState("");
const [newPasswordInput, setNewPasswordInput] = useState("");
const [passwordError, setPasswordError] = useState("");
const [passwordSuccess, setPasswordSuccess] = useState("");
  const [authError, setAuthError] = useState("");

  // App state
  const [predictions, setPredictions] = useState({});
  const [results, setResults] = useState({});
  const [odds, setOdds] = useState({});
  const [selectedGameweek, setSelectedGameweek] = useState(GAMEWEEKS[0]);
  // eslint-disable-next-line no-unused-vars
  const [apiStatus, setApiStatus] = useState("Auto results: loading…");
  const [activeView, setActiveView] = useState("predictions");
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [computedWeeklyTotals, setComputedWeeklyTotals] = useState(null);
const [computedLeagueTotals, setComputedLeagueTotals] = useState(null);

  // If we don't have any odds yet, generate free built-in odds for all fixtures
  useEffect(() => {
    if (odds && Object.keys(odds).length > 0) return;

    const generated = {};
    FIXTURES.forEach((f) => {
      generated[f.id] = generatePseudoOddsForFixture(f);
    });
    setOdds(generated);
  }, [odds]);

// Coins League data from backend
const [coinsLeagueRows, setCoinsLeagueRows] = useState([]);

// Coins game state
const [coinsState, setCoinsState] = useState({
  gameweek: null,
  used: 0,
  remaining: 10,
  bets: {},
  loading: false,
  error: "",
});

  // --- COINS: derive outcome (stake, return, profit) for current GW ---
  const coinsOutcome = useMemo(() => {
    if (!selectedGameweek) {
      return null;
    }

    const bets = coinsState.bets || {};
    const fixturesThisGw = FIXTURES.filter(
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
      if (res && res.homeGoals !== "" && res.awayGoals !== "") {
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
  }, [selectedGameweek, coinsState.bets, results]);

  // Mini-league
  const [myLeagues, setMyLeagues] = useState([]);
  const [leagueNameInput, setLeagueNameInput] = useState("");
  const [leagueJoinCode, setLeagueJoinCode] = useState("");
  const [leagueError, setLeagueError] = useState("");
  const [leagueSuccess, setLeagueSuccess] = useState("");
  const [leaguesLoading, setLeaguesLoading] = useState(false);
  const gwLocked = isGameweekLocked(selectedGameweek);
  const isOriginalPlayer = PLAYERS.includes(currentPlayer);

  // Prediction key for storage
  const currentPredictionKey = useMemo(() => {
    if (PLAYERS.includes(currentPlayer)) return currentPlayer;
    if (currentUserId) return currentUserId;
    return currentPlayer;
  }, [currentPlayer, currentUserId]);

  // ---------- INIT ----------
useEffect(() => {
  async function init() {
    // 1) restore app cache (pred/results/odds)
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPredictions(parsed.predictions || {});
        setResults(parsed.results || {});
        setOdds(parsed.odds || {});
        if (parsed.selectedGameweek)
          setSelectedGameweek(parsed.selectedGameweek);
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
        }
      }
    } catch {}

    // 3) auto results
    const { matches, error } = await fetchPremierLeagueResults();
        if (error) {
      setApiStatus(`Auto results: failed (${error})`);
    } else {
      setApiStatus("Auto results: loaded");
    }
    if (!error && matches?.length) {
      let matchedCount = 0;
      const updatedResults = {};

      matches.forEach((match) => {
        if (!match.homeTeam || !match.awayTeam) return;
        if (!match.score?.fullTime) return;
        if (
          match.score.fullTime.home === null ||
          match.score.fullTime.away === null
        )
          return;

        const apiHome = normalizeTeamName(match.homeTeam.name);
        const apiAway = normalizeTeamName(match.awayTeam.name);

        const fixture = FIXTURES.find((f) => {
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

        if (fixture) {
          matchedCount += 1;
          updatedResults[fixture.id] = {
            homeGoals: match.score.fullTime.home,
            awayGoals: match.score.fullTime.away,
          };
        }
      });

      if (matchedCount) {
        setResults((prev) => ({ ...prev, ...updatedResults }));
      }
    }

        // 4) odds (initial load) — use in-app model instead of backend
    const generatedOdds = {};
    FIXTURES.forEach((f) => {
      generatedOdds[f.id] = generateModelOddsForFixture(f);
    });

    // Model odds are defaults; any stored/manual odds still override them
    setOdds((prev) => ({
  ...prev,
  ...generatedOdds,
}));
  }

  init();
}, []);

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

  apiGetMyCoins(authToken, selectedGameweek)
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
      setCoinsState((prev) => ({
        ...prev,
        gameweek: selectedGameweek,
        loading: false,
        error: err?.message || "Failed to load coins",
        used: 0,
        remaining: 10,
        bets: {},
      }));
    });

  return () => {
    cancelled = true;
  };
}, [authToken, selectedGameweek]);

// Fetch multi-player coins leaderboard from backend
useEffect(() => {
  if (activeView !== "coinsLeague") return;
  if (!authToken) return;

  const fetchCoinsLeaderboard = async () => {
    try {
      const res = await fetch(`${BACKEND_BASE}/api/coins/leaderboard`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      });

      if (!res.ok) {
        console.error("coins leaderboard failed", res.status);
        return;
      }

      const data = await res.json();
      if (data && Array.isArray(data.leaderboard)) {
        setCoinsLeagueRows(data.leaderboard);
      }
    } catch (err) {
      console.error("coins leaderboard error", err);
    }
  };

  fetchCoinsLeaderboard();
}, [activeView, authToken]);

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
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ predictions, results, odds, selectedGameweek })
    );
  }, [predictions, results, odds, selectedGameweek]);

  // Persist auth
  useEffect(() => {
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
  }, [isLoggedIn, authToken, currentUserId, currentPlayer]);

  // Ensure at most one captain (isDouble) per gameweek for a single user
function normalizeCaptainsByGameweek(predsForUser) {
  if (!predsForUser || typeof predsForUser !== "object") return predsForUser;

  // Group captain fixtures by gameweek, including their updatedAt timestamp
  const byGw = {};
  for (const [fixtureId, pred] of Object.entries(predsForUser)) {
    if (!pred || !pred.isDouble) continue;

    const fx = FIXTURES.find((f) => f.id === Number(fixtureId));
    if (!fx) continue;

    const gw = fx.gameweek;
    const ts =
      pred && typeof pred.updatedAt === "number" ? pred.updatedAt : 0;

    if (!byGw[gw]) byGw[gw] = [];
    byGw[gw].push({ fixtureId, ts });
  }

  const cloned = { ...predsForUser };

  // For any gameweek with multiple captains, keep the latest one
  Object.values(byGw).forEach((arr) => {
    if (arr.length <= 1) return;

    // Sort by timestamp and keep the one with the highest updatedAt
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

  // Load cloud predictions after login/restore
useEffect(() => {
  async function loadCloud() {
    if (DEV_USE_LOCAL) return;
    if (!isLoggedIn || !authToken || !currentUserId) return;

    try {
      const remote = await apiGetMyPredictions(authToken);
      if (!remote || typeof remote !== "object") return;

      const key = PLAYERS.includes(currentPlayer)
        ? currentPlayer
        : currentUserId;

      // Normalize: keep only ONE captain per gameweek (latest updatedAt wins)
      const normalized = normalizeCaptainsByGameweek(remote);

      // Replace this player's predictions with the normalized cloud data
      setPredictions((prev) => ({
        ...prev,
        [key]: { ...normalized },
      }));
    } catch (err) {
      console.error("Cloud predictions failed:", err);
    }
  }

  loadCloud();
}, [isLoggedIn, authToken, currentUserId, currentPlayer]);
  
 
  // One-time migration: move Phil_legacy local preds into Phil cloud account
useEffect(() => {
  async function migratePhilLegacy() {
    if (DEV_USE_LOCAL) return;
    if (!isLoggedIn || !authToken || !currentUserId) return;
    if (currentPlayer !== "Phil") return;

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

      // migratePhilLegacy(); // disabled to stop legacy data overriding current predictions
  }, [isLoggedIn, authToken, currentUserId, currentPlayer, predictions]);
  // Auto-load my leagues after login/restore
useEffect(() => {
  async function loadLeaguesAuto() {
    if (DEV_USE_LOCAL) return;
    if (!isLoggedIn || !authToken) return;

    try {
      const leagues = await apiFetchMyLeagues(authToken);
      setMyLeagues(leagues);
    } catch (err) {
      console.error("Auto load leagues failed:", err);
    }
  }

  loadLeaguesAuto();
}, [isLoggedIn, authToken]);
  
useEffect(() => {
  if (DEV_USE_LOCAL) return;
  if (!isLoggedIn || !authToken) return;
  if (!myLeagues || myLeagues.length === 0) return;

  const leagueId = myLeagues[0].id;
  if (!leagueId) return;

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
    return u.userId;
  };

  async function recalcFromLeague() {
    try {
      // 1) Fetch all league predictions from backend
      const data = await apiGetLeaguePredictions(authToken, leagueId);
      const users = data.users || [];
      const predictionsByUserId = data.predictionsByUserId || {};

      // 2) Filter to ONLY actual members of this league (if list exists)
      const leagueObj = myLeagues[0] || {};
      const memberIds = Array.isArray(leagueObj.members)
        ? leagueObj.members
        : Array.isArray(leagueObj.memberUserIds)
        ? leagueObj.memberUserIds
        : [];
      const memberIdSet = new Set(memberIds);

      const leagueUsers =
        memberIdSet.size === 0
          ? users
          : users.filter((u) => memberIdSet.has(u.userId));

      // 3) Keys = legacy PLAYERS + league members (mapped)
      const memberKeys = leagueUsers.map(toLegacyKey);
      const keys = Array.from(new Set([...PLAYERS, ...memberKeys]));

      // 4) Build predictions for calculation:
      //    start with any local preds for these keys, then overlay remote
      // 3) Merge predictions so that USER-ID data always wins
const predsForCalc = {};

keys.forEach((k) => {
  const legacyData = predictions[k] || {};
  const userId = legacyMap[k];
  const cloudData = userId ? (predictionsByUserId[userId] || {}) : {};

  predsForCalc[k] = {
    ...legacyData,   // spreadsheet/historic
    ...cloudData     // ACTUAL CLOUD PREDICTIONS WIN
  };
});

      // 5) Weekly totals
      const weeklyTotals = {};
      GAMEWEEKS.forEach((gw) => {
        weeklyTotals[gw] = {};
        keys.forEach((k) => {
          let score = SPREADSHEET_WEEKLY_TOTALS[k]?.[gw - 1] || 0;

          FIXTURES.forEach((fx) => {
            if (fx.gameweek !== gw) return;
            const r = results[fx.id];
            if (!r || r.homeGoals === "" || r.awayGoals === "") return;
            score += getTotalPoints(predsForCalc[k]?.[fx.id], r);
          });

          weeklyTotals[gw][k] = score;
        });
      });

      // 6) League totals (sum of weekly)
      const leagueTotals = {};
      keys.forEach((k) => {
        leagueTotals[k] = GAMEWEEKS.reduce(
          (sum, gw) => sum + (weeklyTotals[gw][k] || 0),
          0
        );
      });

      if (cancelled) return;

      setComputedWeeklyTotals(weeklyTotals);
      setComputedLeagueTotals(leagueTotals);

      // 7) Sync totals back to backend
      // apiSaveLeagueTotals(authToken, leagueId, {
//   weeklyTotals,
//   leagueTotals,
// }).catch((e) => console.error("Failed to sync totals:", e));
    } catch (err) {
      console.error("Recalc from league failed:", err);
    }
  }

  recalcFromLeague();

  return () => {
    cancelled = true;
  };
}, [results, predictions, isLoggedIn, authToken, myLeagues]);
  // ---------- AUTH ----------
  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    setAuthError("");
    const name = loginName.trim();
    const pwd = loginPassword.trim();
    if (!name || !pwd) return setAuthError("Enter username + password.");

    try {
      const result =
        loginMode === "signup"
          ? await apiSignup(name, pwd)
          : await apiLogin(name, pwd);

      setIsLoggedIn(true);
      setAuthToken(result.token);
      setCurrentUserId(result.userId);
      setCurrentPlayer(result.username);
      setLoginPassword("");
      setMyLeagues([]);
      setLeagueError("");
      setLeagueSuccess("");

      if (!DEV_USE_LOCAL && result.token) {
  const cloudPreds = await apiGetMyPredictions(result.token);
  const key = PLAYERS.includes(result.username)
    ? result.username
    : result.userId;

  setPredictions((prev) => ({
    ...prev,
    [key]: {
      ...(prev[key] || {}),
      ...normalizeCaptainsByGameweek(cloudPreds),
    },
  }));
}
    } catch (err) {
      setAuthError(err.message || "Auth failed.");
    }
  };
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

  const handleLogout = () => {
    setIsLoggedIn(false);
    setAuthToken("");
    setCurrentPlayer("");
    setCurrentUserId("");
    setLoginPassword("");
    setAuthError("");
    setMyLeagues([]);
  };

  // ---------- MINI-LEAGUES ----------
  const handleLoadLeagues = async () => {
    if (!authToken) return setLeagueError("Please log in again.");
    setLeaguesLoading(true);
    setLeagueError("");
    setLeagueSuccess("");
    try {
      const leagues = await apiFetchMyLeagues(authToken);
      setMyLeagues(leagues);
      if (!leagues.length) setLeagueSuccess("No mini‑leagues yet.");
    } catch (err) {
      setLeagueError(err.message || "Failed to load mini‑leagues.");
    } finally {
      setLeaguesLoading(false);
    }
  };

  const handleCreateLeague = async (e) => {
    e.preventDefault();
    if (!authToken) return setLeagueError("Please log in again.");
    const name = leagueNameInput.trim();
    if (!name) return setLeagueError("Enter a league name.");
    setLeagueError("");
    setLeagueSuccess("");
    try {
      const league = await apiCreateLeague(authToken, name);
      setLeagueSuccess(`Created "${league.name || name}".`);
      setLeagueNameInput("");
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
      const league = await apiJoinLeague(authToken, code);
      setLeagueSuccess(`Joined "${league.name || "league"}".`);
      setLeagueJoinCode("");
      await handleLoadLeagues();
    } catch (err) {
      setLeagueError(err.message || "Failed to join league.");
    }
  };

    function playerAlreadyUsedTriple(allPredictionsForPlayer) {
    return Object.values(allPredictionsForPlayer || {}).some(
      (p) => p && p.isTriple
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
        const metaFixture = FIXTURES.find((f) => f.id === fixtureIdNum);

        if (metaFixture) {
          const gw = metaFixture.gameweek;

          const lockedCaptainElsewhere = Object.entries(prevPlayerPreds).some(
            ([id, pred]) => {
              if (!pred || !pred.isDouble) return false;

              const idNum = Number(id);
              if (idNum === fixtureIdNum) return false; // ignore this fixture

              const f = FIXTURES.find((fx) => fx.id === idNum);
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

      // ----- TRIPLE LOGIC: once per season -----
      if ("isTriple" in newFields) {
        const wantTriple = !!newFields.isTriple;

        if (wantTriple) {
          const hasUsedTripleBefore = playerAlreadyUsedTriple(prevPlayerPreds);
          const hasTripleElsewhere = Object.entries(prevPlayerPreds).some(
            ([id, pred]) => pred.isTriple && Number(id) !== fixtureIdNum
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

          const tripleFixture = FIXTURES.find((f) => f.id === fixtureIdNum);
          if (tripleFixture) {
            updatedPlayerPreds = Object.fromEntries(
              Object.entries(updatedPlayerPreds).map(([id, pred]) => {
                const f = FIXTURES.find((fx) => fx.id === Number(id));
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
      const doubleFixture = FIXTURES.find((f) => f.id === fixtureIdNum);

      if (doubleFixture) {
        const gw = doubleFixture.gameweek;

        if (wantDouble) {
          // If there is already a locked captain in this gameweek
          // on a different fixture, or the whole gameweek is locked,
          // and this fixture was not already captain, block moving/adding captain.
          const gwLocked = isGameweekLocked(gw);

          const lockedCaptainElsewhere = Object.entries(prevPlayerPreds).some(
            ([id, pred]) => {
              if (!pred || !pred.isDouble) return false;

              const f = FIXTURES.find((fx) => fx.id === Number(id));
              if (!f || f.gameweek !== gw) return false;

              const isThis = Number(id) === fixtureIdNum;
              const locked = isPredictionLocked(f);

              // "Elsewhere" = same GW, locked, and not this fixture
              return locked && !isThis;
            }
          );

          if (!prevFixturePred.isDouble && (gwLocked || lockedCaptainElsewhere)) {
            console.log(
              "Captain change blocked: already used on locked fixture or locked gameweek"
            );
            return prev;
          }

          // Set this as the only captain in that gameweek
          updatedPlayerPreds = Object.fromEntries(
            Object.entries(updatedPlayerPreds).map(([id, pred]) => {
              const f = FIXTURES.find((fx) => fx.id === Number(id));
              const sameGW = f && f.gameweek === doubleFixture.gameweek;
              const isThis = Number(id) === fixtureIdNum;

              return [
                id,
                {
                  ...pred,
                  isDouble: sameGW && isThis,
                  // can't be triple in same GW as captain
                  isTriple: sameGW ? false : pred.isTriple,
                },
              ];
            })
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
  const visibleFixtures = FIXTURES.filter(
    (f) => f.gameweek === selectedGameweek
  );

const leaderboard = useMemo(() => {
  // Use backend-computed totals if available
    if (computedLeagueTotals) {
    // Collapse any legacy-userId keys into their legacy name
    const LEGACY_MAP = {
      Tom: "1763791297309",
      Ian: "1763801801288",
      Dave: "1763801999658",
      Anthony: "1763802020494",
      Steve: "1763812904100",
      Emma: "1763813732635",
      Phil: "1763873593264",
    };

    const idToLegacyName = (id) => {
      const found = Object.entries(LEGACY_MAP).find(([, v]) => v === id);
      return found ? found[0] : null;
    };

    const collapsed = {};
    Object.entries(computedLeagueTotals).forEach(([key, points]) => {
      const legacyName = idToLegacyName(key);
      const finalKey = legacyName || key;
      collapsed[finalKey] = (collapsed[finalKey] || 0) + (points || 0);
    });

    return Object.entries(collapsed)
      .map(([player, points]) => ({ player, points }))
      .sort((a, b) => b.points - a.points);
  }

  // fallback (old local logic)
  const totals = {};
  PLAYERS.forEach((p) => {
    totals[p] =
      SPREADSHEET_WEEKLY_TOTALS[p]?.reduce((a, b) => a + b, 0) || 0;
  });

  FIXTURES.forEach((fixture) => {
    const res = results[fixture.id];
    if (!res || res.homeGoals === "" || res.awayGoals === "") return;
    PLAYERS.forEach((p) => {
      totals[p] += getTotalPoints(predictions[p]?.[fixture.id], res);
    });
  });

  return Object.entries(totals)
    .map(([player, points]) => ({ player, points }))
    .sort((a, b) => b.points - a.points);
}, [computedLeagueTotals, predictions, results]);

  const coinsLeaderboard = useMemo(() => {
    if (!coinsOutcome || !currentPlayer) return [];

    const profit =
      typeof coinsOutcome.profit === "number"
        ? coinsOutcome.profit
        : 0;

    return [
      {
        player: currentPlayer,
        points: profit,
      },
    ];
  }, [coinsOutcome, currentPlayer]);

 const historicalScores = useMemo(() => {
  if (computedWeeklyTotals) {
    return GAMEWEEKS.map((gw) => {
      const row = { gameweek: gw };
      const gwTotals = computedWeeklyTotals[gw] || {};
      Object.keys(gwTotals).forEach((k) => {
        row[k] = gwTotals[k];
      });
      return row;
    });
  }

  // fallback to old logic if computed totals not ready yet
  return GAMEWEEKS.map((gw) => {
    const row = { gameweek: gw };
    PLAYERS.forEach((player) => {
      let score = SPREADSHEET_WEEKLY_TOTALS[player]?.[gw - 1] || 0;
      FIXTURES.forEach((fixture) => {
        if (fixture.gameweek !== gw) return;
        const res = results[fixture.id];
        if (!res || res.homeGoals === "" || res.awayGoals === "") return;
        score += getTotalPoints(predictions[player]?.[fixture.id], res);
      });
      row[player] = score;
    });
    return row;
  });
}, [computedWeeklyTotals, predictions, results]);

  // ---------- UI STYLES (redesigned, high contrast, mobile‑first) ----------
 const theme = {
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

  // aliases used by your Change Password UI
  card: "#111827",              // same as panel
  border: "rgba(255,255,255,0.08)", // same as line
  background: "#0f172a",        // same as bg
  button: "#38bdf8",            // same as accent
};

    const pageStyle = {
    minHeight: "100vh",
    background: theme.bg,
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
    padding: 14,
    border: `1px solid ${theme.line}`,
    boxShadow: "0 8px 20px rgba(0,0,0,0.25)",
  };

  const pillBtn = (active) => ({
    padding: "8px 12px",
    borderRadius: 999,
    border: `1px solid ${active ? theme.accent : theme.line}`,
    background: active ? "rgba(56,189,248,0.15)" : theme.panelHi,
    color: active ? theme.text : theme.muted,
    cursor: "pointer",
    fontSize: 13,
    whiteSpace: "nowrap",
  });

  const smallInput = {
    width: 36,
    padding: "6px 8px",
    background: theme.panelHi,
    color: theme.text,
    border: `1px solid ${theme.line}`,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 14,
  };

        const handleCoinsChange = async (fixtureId, stake, side, oddsSnapshot) => {
    if (!authToken || !selectedGameweek) {
      return;
    }

    const MAX_COINS = 10;

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
      };
    } else if (finalStake === 0) {
      if (existingBet && existingBet.stake > 0) {
        payload = {
          gameweek: selectedGameweek,
          fixtureId,
          stake: 0,
          side: existingBet.side || null,
          odds,
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

      setCoinsState((prev) => ({
        ...prev,
        loading: false,
        error: msg,
      }));

      alert(msg);
    }
  };

  // ---------- LOGIN PAGE ----------
if (!isLoggedIn) {
  return (
    <div style={{ 
      ...pageStyle,
      maxWidth: 980,
      margin: "0 auto"
    }}>
      <div style={{ 
        display: "grid",
        gap: 12 
      }}>
        <header
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            marginBottom: 10,
          }}
        >
  <div
    style={{
      width: 44,
      height: 44,
      borderRadius: 12,
      overflow: "hidden",
    }}
  >
    <img
      src="/icon_64.png"
      alt="Prediction Addiction logo"
      style={{ width: "100%", height: "100%" }}
    />
  </div>

  <h1
    style={{
      margin: 0,
          fontSize: isMobile ? 20 : 22,
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
    maxWidth: 480,
    margin: "0 auto",
  }}
>
  <section style={cardStyle}>
    <h2 style={{ marginTop: 0, fontSize: 18 }}>Log in / Create account</h2>

              <form onSubmit={handleAuthSubmit} style={{ display: "grid", gap: 10 }}>
                <label style={{ fontSize: 13, color: theme.muted }}>
                  Username
                  <input
  style={{
    width: "92%",
    marginTop: 6,
    marginLeft: "auto",
    marginRight: "auto",
    padding: "10px 12px",
    borderRadius: 10,
    background: theme.panelHi,
    color: theme.text,
    border: `1px solid ${theme.line}`,
    fontSize: 15,
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
    width: "92%",
    marginTop: 6,
    marginLeft: "auto",
    marginRight: "auto",
    padding: "10px 12px",
    borderRadius: 10,
    background: theme.panelHi,
    color: theme.text,
    border: `1px solid ${theme.line}`,
    fontSize: 15,
  }}
  type="password"
  value={loginPassword}
  onChange={(e) => setLoginPassword(e.target.value)}
  placeholder="••••"
  autoComplete={
    loginMode === "signup" ? "new-password" : "current-password"
  }
/>
                </label>

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={() => setLoginMode("login")}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: `1px solid ${
                        loginMode === "login" ? theme.accent : theme.line
                      }`,
                      background:
                        loginMode === "login"
                          ? "rgba(56,189,248,0.15)"
                          : theme.panelHi,
                      color: theme.text,
                      cursor: "pointer",
                    }}
                  >
                    Log in
                  </button>
                  <button
                    type="button"
                    onClick={() => setLoginMode("signup")}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: `1px solid ${
                        loginMode === "signup" ? theme.accent2 : theme.line
                      }`,
                      background:
                        loginMode === "signup"
                          ? "rgba(34,197,94,0.15)"
                          : theme.panelHi,
                      color: theme.text,
                      cursor: "pointer",
                    }}
                  >
                    Create account
                  </button>
                </div>

                {authError && (
                  <div
                    style={{
                      background: "rgba(239,68,68,0.12)",
                      border: `1px solid rgba(239,68,68,0.5)`,
                      color: theme.text,
                      padding: "8px 10px",
                      borderRadius: 8,
                      fontSize: 13,
                    }}
                  >
                    {authError}
                  </div>
                )}

                <button
                  type="submit"
                  style={{
                    padding: "10px 12px",
                    borderRadius: 10,
                    border: "none",
                    background: theme.accent,
                    color: "#001018",
                    fontWeight: 800,
                    cursor: "pointer",
                    fontSize: 15,
                  }}
                >
                  {loginMode === "login" ? "Log in" : "Create account"}
                </button>
              </form>

              <div style={{ marginTop: 10, fontSize: 12, color: theme.muted }}>
                Legacy players (Tom, Emma, Phil, Steve, Dave, Ian, Anthony) are
                reserved and already in the system.
              </div>
            </section>

            <section style={cardStyle}>
              <h3 style={{ marginTop: 0 }}>How it works</h3>
              <ul style={{ margin: 0, paddingLeft: 18, color: theme.muted }}>
                <li>Predictions lock 1 hour before kickoff.</li>
                <li>Exact score = 7 points. Goal‑diff = 4. Result = 2.</li>
                <li>Pick exactly one Captain (double points) each GW.</li>
                <li>Pick one Triple per season.</li>
                <li>Everything syncs via cloud instantly.</li>
              </ul>
            </section>
          </div>
        </div>
      </div>
    );
  }

  // ---------- MAIN APP ----------
  return (
    <div style={pageStyle}>
      <div style={{ maxWidth: "100%", margin: "0 auto", display: "grid", gap: 12 }}>
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
          }}
        >
          {/* Title + API status (centered) */}
          <div style={{ textAlign: "center" }}>
                            <h1
  style={{
    marginTop: "0.8rem",
    marginBottom: "1.5rem",
    fontSize: isMobile ? "1.4rem" : "2rem",
    fontWeight: 700,
    letterSpacing: "0.5px",
    whiteSpace: "nowrap",     // keep it on one line
    maxWidth: "100%",         // never wider than the viewport
    overflow: "hidden",       // clip instead of pushing layout wider
    textOverflow: "clip",
  }}
>

  Predicti
  <span
  className="football-icon"
  role="img"
  aria-label="football"
  style={{
    fontSize: isMobile ? "1.2rem" : "1.9rem",
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
    fontSize: isMobile ? "1.2rem" : "1.9rem",
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
            <div
              style={{
                fontSize: 12,
                color: theme.muted,
                marginTop: 4,
              }}
            >
              {apiStatus}
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
      gap: isMobile ? 6 : 8,
      width: "100%",
      flexWrap: "nowrap", // stay on one line
    }}
  >
    <button
      onClick={() => setShowPasswordModal(true)}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        background: theme.panelHi,
        color: theme.text,
        border: `1px solid ${theme.line}`,
        cursor: "pointer",
        fontSize: 12,
        height: 32,
        minWidth: isMobile ? 96 : 118,
        textAlign: "center",
      }}
    >
      {isMobile ? "Password" : "Change Password"}
    </button>

    <button
      onClick={handleLogout}
      style={{
        padding: "6px 10px",
        borderRadius: 8,
        border: `1px solid ${theme.line}`,
        background: theme.panelHi,
        color: theme.text,
        cursor: "pointer",
        fontSize: 12,
        height: 32,
        minWidth: isMobile ? 96 : 118,
        textAlign: "center",
      }}
    >
      Log out
    </button>

    {isMobile && (
      <button
        type="button"
        onClick={() => setShowMobileMenu((v) => !v)}
        style={{
          padding: "6px 10px",
          borderRadius: 8,
          border: `1px solid ${theme.line}`,
          background: theme.panelHi,
          color: theme.text,
          cursor: "pointer",
          fontSize: 12,
          height: 32,
          minWidth: isMobile ? 96 : 118,
          textAlign: "center",
      }}
      >
        Menu
      </button>
    )}
  </div>
)}
        </header>
        
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
  { id: "predictions", label: "Predictions" },
  { id: "results", label: "Results" },
  { id: "league", label: "League Table" },
  { id: "coinsLeague", label: "Coins League" }, // NEW
  { id: "history", label: "History" },
  { id: "winprob", label: "Win Probabilities" },
  { id: "leagues", label: "Mini-Leagues" },
];

  // ---- MOBILE: floating dropdown triggered by the header "Menu" button ----
  if (isMobile) {
    if (!showMobileMenu) return null;

    return (
      <div
        style={{
          position: "fixed",
          top: 88,          // tweak up/down if needed
          right: 16,        // keeps it near the Menu button
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
                <section
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: "auto auto",
            gap: 12,
            alignItems: "center",
            justifyContent: "center",
            justifyItems: "center",
            textAlign: "left",
          }}
        >
                    <div
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ fontSize: 13, color: theme.muted }}>Player</div>
            {gwLocked && isOriginalPlayer ? (
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

          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <div style={{ fontSize: 13, color: theme.muted }}>Gameweek</div>
            <select
              value={selectedGameweek}
              onChange={(e) => setSelectedGameweek(Number(e.target.value))}
                style={{
    padding: "6px 14px",
    borderRadius: 8,
    background: theme.panelHi,
    color: theme.text,
    border: `1px solid ${theme.line}`,
    fontSize: 14,
    minWidth: 82,          // keeps “GW13” fully visible with arrow
    textAlignLast: "center",
  }}
            >
              {GAMEWEEKS.map((gw) => (
                <option key={gw} value={gw}>
                  GW{gw}
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
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 18 }}>
        GW{selectedGameweek} Predictions
      </h2>

      {/* Coins game summary */}
      {authToken && (
  <div
    style={{
      fontSize: 12,
      color: theme.muted,
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
    }}
  >
    {/* USED */}
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <CoinIcon />
      <strong>{coinsState.used}</strong>
      <span style={{ color: theme.muted }}>used</span>
    </span>

    {/* REMAINING */}
    <span
      style={{
        display: "flex",
        alignItems: "center",
        gap: 4,
      }}
    >
      <CoinIcon />
      <strong>{coinsState.remaining}</strong>
      <span style={{ color: theme.muted }}>remaining</span>
    </span>
  </div>
)}
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
        console.log("TEAM:", fixture.homeTeam, fixture.awayTeam);

        const pred =
          predictions[currentPredictionKey]?.[fixture.id] || {};
        const locked = isPredictionLocked(fixture);
        const o = odds[fixture.id] || {};
        // eslint-disable-next-line no-unused-vars
        const probs = computeProbabilities(o);

        const r = results[fixture.id];
        const hasResult =
          r && r.homeGoals !== "" && r.awayGoals !== "";
        const pointsForThisFixture = hasResult
          ? getTotalPoints(pred, r)
          : null;

        const coinsBet =
          (coinsState.bets && coinsState.bets[fixture.id]) || {};
        const coinsStake = coinsBet.stake ?? 0;
        const coinsSide = coinsBet.side || "D";

        // Possible win/return for this fixture (based on current stake + side)
let coinsPossibleReturn = "";
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
    coinsPossibleReturn = (coinsStake * price).toFixed(2);
  }
}

        return (
          <div
            key={fixture.id}
            style={{
              background: theme.panelHi,
              borderRadius: 12,
              border: `1px solid ${theme.line}`,
              padding: 8,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 8,
              alignItems: "flex-start",
            }}
          >
            {/* Left content column */}
            <div style={{ display: "grid", gap: 6, minHeight: 92 }}>
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
                {formatKickoffShort(fixture.kickoff)} GMT
              </div>

              {/* Main score + POINTS row */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                {/* HOME */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      minWidth: 32,
                    }}
                  >
                    {(TEAM_BADGES[fixture.homeTeam] ||
                      getTeamCode(fixture.homeTeam) === "NFO") && (
                      <img
                        src={
                          getTeamCode(fixture.homeTeam) === "NFO"
                            ? "/badges/nottingham_forest.png"
                            : TEAM_BADGES[fixture.homeTeam]
                        }
                        alt={fixture.homeTeam}
                        style={{
                          width: 20,
                          height: 20,
                          objectFit: "contain",
                          marginRight: 4,
                        }}
                      />
                    )}
                    <span
                      style={{ fontSize: 12, color: theme.muted }}
                    >
                      {getTeamCode(fixture.homeTeam)}
                    </span>
                  </div>

                  <input
                    type="number"
                    min="0"
                    style={smallInput}
                    value={pred.homeGoals || ""}
                    disabled={locked}
                    onChange={(e) =>
                      updatePrediction(currentPredictionKey, fixture.id, {
                        homeGoals: e.target.value,
                      })
                    }
                  />
                </div>

                {/* VS */}
                <span
                  style={{
                    color: theme.muted,
                    fontWeight: 700,
                    alignSelf: "center",
                    lineHeight: "32px",
                    marginTop: 11,
                  }}
                >
                  VS
                </span>

                {/* AWAY */}
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                  }}
                >
                  <input
                    type="number"
                    min="0"
                    style={smallInput}
                    value={pred.awayGoals || ""}
                    disabled={locked}
                    onChange={(e) =>
                      updatePrediction(
                        currentPredictionKey,
                        fixture.id,
                        { awayGoals: e.target.value }
                      )
                    }
                  />

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      minWidth: 32,
                    }}
                  >
                    <span
                      style={{ fontSize: 12, color: theme.muted }}
                    >
                      {getTeamCode(fixture.awayTeam)}
                    </span>

                    {(TEAM_BADGES[fixture.awayTeam] ||
                      getTeamCode(fixture.awayTeam) === "NFO") && (
                      <img
                        src={
                          getTeamCode(fixture.awayTeam) === "NFO"
                            ? "/badges/nottingham_forest.png"
                            : TEAM_BADGES[fixture.awayTeam]
                        }
                        alt={fixture.awayTeam}
                        style={{
                          width: 20,
                          height: 20,
                          objectFit: "contain",
                          marginLeft: 4,
                        }}
                      />
                    )}
                  </div>
                </div>

                {/* POINTS + LOCK */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginLeft: 8,
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
                    <input
                      type="number"
                      readOnly
                      value={
                        pointsForThisFixture == null
                          ? ""
                          : pointsForThisFixture
                      }
                      style={{
                        ...smallInput,
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
                    />
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
                </div>
              </div>

              {/* Captain / Triple + Coins */}
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  width: "100%",
                  marginTop: 10,
                  gap: 6,
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
                    Triple
                    {(() => {
  const playerPreds = predictions[currentPredictionKey] || {};

  // Find if a triple exists anywhere
  const tripleFixtureId = Object.entries(playerPreds).find(
    ([id, p]) => p?.isTriple
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
                  }}
                >
                  {/* MINI WRAPPER to reduce spacing between coin and input */}
<div style={{ display: "flex", alignItems: "center", gap: 4 }}>
  <CoinIcon />

  <input
    type="number"
    min="0"
    max="10"
    value={coinsStake}
    disabled={gwLocked || locked}
    onChange={(e) =>
      handleCoinsChange(
        fixture.id,
        e.target.value,
        coinsSide,
        o
      )
    }
    style={{
      width: 45,
      textAlign: "center",
      padding: "2px 4px",
      borderRadius: 4,
      border: `1px solid ${theme.border}`,
      background: theme.input,
      color: "#000",
    }}
  />
</div>

<div style={{ display: "flex", gap: 4 }}>
  {["H", "D", "A"].map((s) => (
    <button
      key={s}
      type="button"
      disabled={gwLocked || locked}
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
        cursor: gwLocked || locked ? "default" : "pointer",
      }}
    >
      {s}
    </button>
  ))}
</div>

<div
  style={{
    display: "flex",
    alignItems: "center",
    gap: 4,
    fontSize: 11,
    width: 60,          // ← reserve space so it never shifts
    justifyContent: "flex-end",
  }}
>
  {coinsPossibleReturn && (
    <>
      = {coinsPossibleReturn}
      <CoinIcon />
    </>
  )}
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
      GW{selectedGameweek} Results
    </h2>

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
  <span>GW{selectedGameweek}</span>
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

        const homeCode = getTeamCode(fixture.homeTeam);
        const awayCode = getTeamCode(fixture.awayTeam);

        // Badge sources, using your current TEAM_BADGES + NFO fallback
        const homeBadgeSrc =
          homeCode === "NFO"
            ? "/badges/nottingham_forest.png"
            : TEAM_BADGES[fixture.homeTeam];

        const awayBadgeSrc =
          awayCode === "NFO"
            ? "/badges/nottingham_forest.png"
            : TEAM_BADGES[fixture.awayTeam];

        return (
          <div
            key={fixture.id}
            style={{
              background: theme.panelHi,
              borderRadius: 12,
              border: `1px solid ${theme.line}`,
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
                }}
              >
                {homeBadgeSrc && (
                  <img
                    src={homeBadgeSrc}
                    alt={fixture.homeTeam}
                    style={{
                      width: 20,
                      height: 20,
                      objectFit: "contain",
                    }}
                  />
                )}
                <span style={{ fontWeight: 700 }}>{homeCode}</span>
              </div>

              {/* Score inputs */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "center",
                }}
              >
                <span style={{ minWidth: 14, textAlign: "right" }}>
                  {res.homeGoals ?? "-"}
                </span>
                <span>-</span>
                <span style={{ minWidth: 14 }}>
                  {res.awayGoals ?? "-"}
                </span>
              </div>

              {/* Away badge + code */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ fontWeight: 700 }}>{awayCode}</span>
                {awayBadgeSrc && (
                  <img
                    src={awayBadgeSrc}
                    alt={fixture.awayTeam}
                    style={{
                      width: 20,
                      height: 20,
                      objectFit: "contain",
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </section>
)}
        {/* League Table */}
        {activeView === "league" && (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>League Table</h2>
            <div style={{ display: "grid", gap: 6 }}>
              {leaderboard.map((row, i) => (
                <div
                  key={row.player}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "40px 1fr 80px",
                    gap: 8,
                    alignItems: "center",
                    background: theme.panelHi,
                    border: `1px solid ${theme.line}`,
                    padding: "8px 10px",
                    borderRadius: 10,
                  }}
                >
                  <div style={{ color: theme.muted }}>{i + 1}</div>
                  <div style={{ fontWeight: 700 }}>{row.player}</div>
                  <div style={{ textAlign: "right", fontWeight: 800 }}>
                    {row.points}
                  </div>
                </div>
              ))}
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
                style={{ width: 20, height: 20 }}
              />
              <span>League Table</span>
            </h2>

            <div style={{ display: "grid", gap: 6 }}>
              {/* Show "no data" only if BOTH server + local are empty */}
              {(!coinsLeagueRows || coinsLeagueRows.length === 0) &&
                (!coinsLeaderboard || coinsLeaderboard.length === 0) && (
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

              {/* Prefer server leaderboard; fall back to local single-player leaderboard */}
              {(coinsLeagueRows && coinsLeagueRows.length > 0
                ? coinsLeagueRows
                : coinsLeaderboard || []
              ).map((row, i) => {
                const value =
                  typeof row.profit === "number"
                    ? row.profit
                    : typeof row.points === "number"
                    ? row.points
                    : 0;

                return (
                  <div
                    key={row.userId || row.player}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "40px 1fr 80px",
                      gap: 8,
                      alignItems: "center",
                      background: theme.panelHi,
                      border: `1px solid ${theme.line}`,
                      padding: "8px 10px",
                      borderRadius: 10,
                    }}
                  >
                    <div style={{ color: theme.muted }}>{i + 1}</div>
                    <div style={{ fontWeight: 700 }}>{row.player}</div>
                    <div style={{ textAlign: "right", fontWeight: 800 }}>
                      {value.toFixed ? value.toFixed(2) : value}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
        {/* History */}
        {activeView === "history" && (
          <section
  style={{
    ...cardStyle,
    overflowX: "hidden",
    maxWidth: "100%",
  }}
>
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Weekly Scores</h2>

            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "max-content",
minWidth: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    <th
  style={{
    textAlign: "left",
    padding: 6,
    position: "sticky",
    left: 0,
    zIndex: 3,
    background: theme.panelHi,
  }}
>
  GW
</th>
                    {PLAYERS.map((p) => (
                      <th key={p} style={{ textAlign: "left", padding: 6 }}>
                        {p}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {historicalScores.map((row) => {
                    const vals = PLAYERS.map((p) => row[p]);
                    const max = Math.max(...vals);
                    const min = Math.min(...vals);
                    const range = max - min || 1;

                    return (
                      <tr key={row.gameweek}>
                        <td
  style={{
    padding: 6,
    color: theme.muted,
    position: "sticky",
    left: 0,
    zIndex: 2,
    background: theme.panelHi,
  }}
>
  {row.gameweek}
</td>
                        {PLAYERS.map((p) => {
                          const v = row[p];
                          const shade = (v - min) / range;
                          return (
                            <td
                              key={p}
                              style={{
                                padding: 6,
                                background: `rgba(34,197,94,${
                                  0.08 + 0.22 * shade
                                })`,
                                fontWeight: v === max ? 800 : 400,
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
          </section>
        )}

{/* Win Probabilities */}
{activeView === "winprob" && (
  <section style={cardStyle}>
    <h2 style={{ marginTop: 0, fontSize: 18 }}>
      Win probabilities — GW{selectedGameweek}
    </h2>

    <div style={{ display: "grid", gap: 8 }}>
      {visibleFixtures.map((fixture) => {
        const o = odds[fixture.id] || {};
        const probs = computeProbabilities(o);

        return (
          <div
            key={fixture.id}
            style={{
              background: theme.panelHi,
              borderRadius: 12,
              border: `1px solid ${theme.line}`,
              padding: 10,
            }}
          >
            <div className="prob-row">
              {/* Fixture (left column) */}
              <div className="prob-fixture">
                {TEAM_ABBREVIATIONS[fixture.homeTeam] || fixture.homeTeam}
                {" "}vs{" "}
                {TEAM_ABBREVIATIONS[fixture.awayTeam] || fixture.awayTeam}
              </div>

              {/* Odds + % (right column) */}
              <div className="prob-odds">
                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  style={smallInput}
                  value={o.home ?? ""}
                  onChange={(e) =>
                    updateOdds(fixture.id, { home: e.target.value })
                  }
                />

                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  style={smallInput}
                  value={o.draw ?? ""}
                  onChange={(e) =>
                    updateOdds(fixture.id, { draw: e.target.value })
                  }
                />

                <input
                  type="number"
                  step="0.01"
                  min="1.01"
                  style={smallInput}
                  value={o.away ?? ""}
                  onChange={(e) =>
                    updateOdds(fixture.id, { away: e.target.value })
                  }
                />

                <div style={{ fontSize: 12, color: theme.muted }}>
                  {probs
                    ? `${probs.home.toFixed(1)}% / ${probs.draw.toFixed(
                        1
                      )}% / ${probs.away.toFixed(1)}%`
                    : "-"}
                </div>
              </div>
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
            <h2 style={{ marginTop: 0, fontSize: 18 }}>Mini‑leagues</h2>

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
                style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
              >
                <input
                  value={leagueNameInput}
                  onChange={(e) => setLeagueNameInput(e.target.value)}
                  placeholder="New league name"
                  style={{
                    flex: "1 1 220px",
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
                  }}
                >
                  Create
                </button>
              </form>

              <form
                onSubmit={handleJoinLeague}
                style={{ display: "flex", gap: 8, flexWrap: "wrap" }}
              >
                <input
                  value={leagueJoinCode}
                  onChange={(e) => setLeagueJoinCode(e.target.value)}
                  placeholder="Join code"
                  style={{
                    flex: "1 1 180px",
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
                  }}
                >
                  Join
                </button>
              </form>

              <div style={{ display: "grid", gap: 6 }}>
                {myLeagues.map((l) => (
                  <div
                    key={l.id}
                    style={{
                      background: theme.panelHi,
                      borderRadius: 10,
                      border: `1px solid ${theme.line}`,
                      padding: 10,
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 800 }}>{l.name}</div>
                      <div style={{ fontSize: 12, color: theme.muted }}>
                        Code: {l.joinCode} • Members: {l.memberCount}
                      </div>
                    </div>
                  </div>
                ))}
                {!myLeagues.length && (
                  <div style={{ fontSize: 13, color: theme.muted }}>
                    No leagues yet — create or join one above.
                  </div>
                )}
              </div>
            </div>
          </section>
        )}

        <div style={{ textAlign: "center", fontSize: 12, color: theme.muted, marginTop: 10 }}>
  Build: {BUILD_ID}
</div>

        <footer
          style={{
            textAlign: "center",
            fontSize: 12,
            color: theme.muted,
            padding: 6,
          }}
        >
          v1 cloud‑sync rebuild • Render backend • Netlify frontend
        </footer>
      </div>
      
    </div>
  );
}
