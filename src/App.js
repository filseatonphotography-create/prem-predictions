import React, { useState, useMemo, useEffect } from "react";
import "./App.css";
import FIXTURES from "./fixtures";
const BUILD_ID = "2025-11-26-a";
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

// Player Avatar Component
const PlayerAvatar = ({ name, size = 32, seed = '', style = 'avataaars' }) => {
  // Use custom seed if provided, otherwise use name
  const avatarSeed = seed || name || 'user';
  
  // Use DiceBear Avatars API - better CORS support
  const avatarUrl = `https://api.dicebear.com/7.x/${style}/svg?seed=${encodeURIComponent(avatarSeed)}`;
  
  return (
    <img
      src={avatarUrl}
      alt={name}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        flexShrink: 0,
        border: "2px solid rgba(255,255,255,0.2)",
        boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
        background: "#fff"
      }}
    />
  );
};

const MIGRATION_FLAG = "phil_legacy_migrated_v1";

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
const DEV_USE_LOCAL = false; // always use cloud backend

const BACKEND_BASE = "https://prem-predictions-1.onrender.com";

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
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
    
    const res = await fetch(`${BACKEND_BASE}/api/results`, {
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    if (!res.ok) return { matches: [], error: `HTTP ${res.status}` };
    const matches = await res.json();
    return { matches, error: null };
  } catch (err) {
    if (err.name === 'AbortError') {
      return { matches: [], error: 'Request timeout' };
    }
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
  const day = String(d.getDate()).padStart(2, "0");
  const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const month = monthNames[d.getMonth()];
  const hours = String(d.getHours()).padStart(2, "0");
  const mins = String(d.getMinutes()).padStart(2, "0");
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
  // Sound effects for coins
  const playCoinSound = (isAdding) => {
    try {
      const audio = new Audio(isAdding ? '/coin.mp3' : '/negative coin.mp3');
      audio.volume = 0.3;
      audio.play().catch(err => console.log('Audio play failed:', err));
    } catch (err) {
      console.log('Audio error:', err);
    }
  };

  // Auth state
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authToken, setAuthToken] = useState("");
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [currentUserId, setCurrentUserId] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  
  // Avatar customization
  const [avatarSeed, setAvatarSeed] = useState(
    localStorage.getItem('avatar_seed') || ''
  );
  const [avatarStyle, setAvatarStyle] = useState(
    localStorage.getItem('avatar_style') || 'avataaars'
  );
  
  // Change password modal state
const [showPasswordModal, setShowPasswordModal] = useState(false);
const [oldPasswordInput, setOldPasswordInput] = useState("");
const [newPasswordInput, setNewPasswordInput] = useState("");
const [passwordError, setPasswordError] = useState("");
const [passwordSuccess, setPasswordSuccess] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // App state
  const [predictions, setPredictions] = useState({});
  const [results, setResults] = useState({});
  const [odds, setOdds] = useState({});
  const [selectedGameweek, setSelectedGameweek] = useState(GAMEWEEKS[0]);
  
  // Push notification state
  const [pushEnabled, setPushEnabled] = useState(false);
  const [pushSupported, setPushSupported] = useState(false);
  
  // eslint-disable-next-line no-unused-vars
  const [apiStatus, setApiStatus] = useState("Auto results: loading…");
  const [activeView, setActiveView] = useState(() => {
    const saved = localStorage.getItem('activeView');
    return saved || "predictions";
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600);
const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [computedWeeklyTotals, setComputedWeeklyTotals] = useState(null);
const [computedLeagueTotals, setComputedLeagueTotals] = useState(null);
  const [countdown, setCountdown] = useState({ timeStr: "", progress: 0, totalTime: 0, remaining: 0 });

  // Save activeView to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('activeView', activeView);
  }, [activeView]);

  // Countdown timer to next deadline
  useEffect(() => {
    const updateCountdown = () => {
      const now = Date.now();
      
      // Find the next upcoming fixture across ALL gameweeks
      const allUpcomingFixtures = FIXTURES
        .filter(f => new Date(f.kickoff).getTime() - 60 * 60 * 1000 > now)
        .sort((a, b) => new Date(a.kickoff) - new Date(b.kickoff));
      
      if (allUpcomingFixtures.length === 0) {
        setCountdown({ timeStr: "", progress: 0, totalTime: 0, remaining: 0, days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }
      
      // Get the first upcoming fixture
      const nextFixture = allUpcomingFixtures[0];
      const deadline = new Date(nextFixture.kickoff).getTime() - 60 * 60 * 1000; // 1 hour before kickoff
      const diff = deadline - now;
      
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
  }, []);

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

// Check if push notifications are supported
useEffect(() => {
  if ('Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window) {
    setPushSupported(true);
    // Check if already subscribed
    navigator.serviceWorker.getRegistration().then(registration => {
      if (registration) {
        registration.pushManager.getSubscription().then(subscription => {
          setPushEnabled(!!subscription);
        });
      }
    });
  }
}, []);

// Fetch multi-player coins leaderboard from backend
useEffect(() => {
  if (activeView !== "coinsLeague" && activeView !== "summary") return;
  if (!authToken) return; // Don't fetch if not authenticated yet

  const fetchCoinsLeaderboard = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const res = await fetch(`${BACKEND_BASE}/api/coins/leaderboard`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!res.ok) {
        console.error("coins leaderboard failed", res.status);
        return;
      }

      const data = await res.json();
      if (data && Array.isArray(data.leaderboard)) {
        setCoinsLeagueRows(data.leaderboard);
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        console.error("coins leaderboard timeout");
      } else {
        console.error("coins leaderboard error", err);
      }
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
      const userIdByKey = {};
      leagueUsers.forEach((u) => {
        const key = toLegacyKey(u);
        if (!userIdByKey[key]) userIdByKey[key] = u.userId;
      });

      const predsForCalc = {};

      keys.forEach((k) => {
        const legacyData = predictions[k] || {};
        const userId = userIdByKey[k];
        const cloudData = userId ? (predictionsByUserId[userId] || {}) : {};

        // Normalise all fixture IDs to STRING keys to avoid captain shifting
        const legacyDataStr = Object.fromEntries(
          Object.entries(legacyData).map(([id, val]) => [String(id), val])
        );
        const cloudDataStr = Object.fromEntries(
          Object.entries(cloudData).map(([id, val]) => [String(id), val])
        );

        // Merge local + cloud, with cloud winning
        predsForCalc[k] = {
          ...legacyDataStr, // spreadsheet/historic
          ...cloudDataStr,  // ACTUAL CLOUD PREDICTIONS WIN
        };
      });

      // 5) Compute weekly totals (spreadsheet base + recalculated points)
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

      // Store all players' predictions so they can be viewed
      setPredictions((prev) => ({ ...prev, ...predsForCalc }));

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
  const handleAuthSubmit = async (e, mode) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
    const name = loginName.trim();
    const pwd = loginPassword.trim();
    if (!name || !pwd) {
      setAuthLoading(false);
      return setAuthError("Enter username + password.");
    }

    try {
      const result =
        mode === "signup"
          ? await apiSignup(name, pwd)
          : await apiLogin(name, pwd);

      setIsLoggedIn(true);
      setAuthToken(result.token);
      setCurrentUserId(result.userId);
      setCurrentPlayer(result.username);
      setLoginPassword("");
      setAuthLoading(false);
    } catch (err) {
      setAuthLoading(false);
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
    setShowMobileMenu(false);
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
          // on a different fixture, block moving/adding captain.
          // Players can change captain until their chosen captain's fixture locks.

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

          if (!prevFixturePred.isDouble && lockedCaptainElsewhere) {
            console.log(
              "Captain change blocked: already used on locked fixture in this gameweek"
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

  // Coins league rows
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
    border: `1.5px solid #ffffff`,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 14,
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
      maxWidth: 1200,
      margin: "0 auto",
      padding: isMobile ? "8px" : "16px"
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
    maxWidth: window.innerWidth <= 600 ? 480 : 900,
    width: "100%",
    margin: "0 auto",
  }}
>
  <section style={cardStyle}>
    <h2 style={{ marginTop: 0, fontSize: 18 }}>Log in / Create account</h2>

              <form onSubmit={(e) => e.preventDefault()} style={{ display: "grid", gap: 10 }}>
                <label style={{ fontSize: 13, color: theme.muted }}>
                  Username
                  <input
  style={{
    width: "100%",
    marginTop: 6,
    padding: "10px 12px",
    borderRadius: 10,
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
    padding: "10px 12px",
    borderRadius: 10,
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

                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    type="button"
                    onClick={(e) => handleAuthSubmit(e, "login")}
                    disabled={authLoading}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: `1px solid ${theme.accent}`,
                      background: "rgba(56,189,248,0.15)",
                      color: theme.text,
                      cursor: authLoading ? "wait" : "pointer",
                      opacity: authLoading ? 0.6 : 1,
                    }}
                  >
                    {authLoading ? "Logging in..." : "Log in"}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => handleAuthSubmit(e, "signup")}
                    disabled={authLoading}
                    style={{
                      flex: 1,
                      padding: "8px 10px",
                      borderRadius: 10,
                      border: `1px solid ${theme.accent2}`,
                      background: "rgba(34,197,94,0.15)",
                      color: theme.text,
                      cursor: authLoading ? "wait" : "pointer",
                      opacity: authLoading ? 0.6 : 1,
                    }}
                  >
                    {authLoading ? "Creating..." : "Create account"}
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
              </form>
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
  { id: "summary", label: "Summary" },
  { id: "coinsLeague", label: "Coins League" },
  { id: "history", label: "History" },
  { id: "winprob", label: "Win Probabilities" },
  { id: "leagues", label: "Mini-Leagues" },
  { id: "settings", label: "Settings" },
  { id: "rules", label: "Rules" },
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
                <section
          style={{
            ...cardStyle,
            display: "grid",
            gridTemplateColumns: activeView === "predictions" ? "auto auto" : "auto",
            gap: 12,
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
            {gwLocked ? (
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
                    )}

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
        textAlign: "center",
      }}
    >
      <h2 style={{ marginTop: 0, marginBottom: 4, fontSize: 18 }}>
        GW{selectedGameweek} Predictions
      </h2>

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
        {countdown.timeStr && (
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
                gap: isMobile ? 4 : 8,
                alignItems: "center",
              }}
            >
              {/* Days */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: isMobile ? 20 : 28,
                    fontWeight: 700,
                    color: countdown.remaining < 3600000 ? theme.warn : theme.text,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: isMobile ? 35 : 50,
                  }}
                >
                  {String(countdown.days).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>days</div>
              </div>
              
              <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: theme.muted }}>:</div>
              
              {/* Hours */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: isMobile ? 20 : 28,
                    fontWeight: 700,
                    color: countdown.remaining < 3600000 ? theme.warn : theme.text,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: isMobile ? 35 : 50,
                  }}
                >
                  {String(countdown.hours).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>hours</div>
              </div>
              
              <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: theme.muted }}>:</div>
              
              {/* Minutes */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: isMobile ? 20 : 28,
                    fontWeight: 700,
                    color: countdown.remaining < 3600000 ? theme.warn : theme.text,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: isMobile ? 35 : 50,
                  }}
                >
                  {String(countdown.minutes).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>minutes</div>
              </div>
              
              <div style={{ fontSize: isMobile ? 18 : 24, fontWeight: 700, color: theme.muted }}>:</div>
              
              {/* Seconds */}
              <div style={{ textAlign: "center" }}>
                <div
                  style={{
                    fontSize: isMobile ? 20 : 28,
                    fontWeight: 700,
                    color: countdown.remaining < 3600000 ? theme.warn : theme.text,
                    fontVariantNumeric: "tabular-nums",
                    minWidth: isMobile ? 35 : 50,
                  }}
                >
                  {String(countdown.seconds).padStart(2, '0')}
                </div>
                <div style={{ fontSize: 10, color: theme.muted, marginTop: 2 }}>seconds</div>
              </div>
            </div>
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
              border: `1px solid rgba(255, 255, 255, 0.3)`,
              padding: 8,
              display: "grid",
              gridTemplateColumns: "minmax(0, 1fr)",
              gap: 8,
              alignItems: "flex-start",
              maxWidth: "100%",
              overflow: "hidden",
            }}
          >
            {/* Left content column */}
            <div style={{ display: "grid", gap: 6, minHeight: 92, maxWidth: "100%", overflow: "hidden" }}>
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
                {formatKickoffShort(fixture.kickoff)}
              </div>

              {/* Main score + POINTS row */}
              <div
                style={{
                  display: "flex",
                  gap: 6,
                  alignItems: "flex-end",
                  flexWrap: "wrap",
                  justifyContent: "center",
                  maxWidth: "100%",
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
                      style={{ fontSize: 12, color: "#ffffff", fontWeight: 600 }}
                    >
                      {getTeamCode(fixture.homeTeam)}
                    </span>
                  </div>

                  {/* Home score with +/- buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      disabled={locked || (pred.homeGoals || 0) <= 0}
                      onClick={() => {
                        const current = Number(pred.homeGoals || 0);
                        updatePrediction(currentPredictionKey, fixture.id, {
                          homeGoals: Math.max(0, current - 1).toString(),
                        });
                      }}
                      style={{
                        width: 24,
                        height: 24,
                        padding: 0,
                        border: `1px solid ${theme.line}`,
                        borderRadius: 6,
                        background: (pred.homeGoals || 0) <= 0 ? theme.panelHi : theme.accent,
                        color: (pred.homeGoals || 0) <= 0 ? theme.text : "#ffffff",
                        cursor: locked || (pred.homeGoals || 0) <= 0 ? "not-allowed" : "pointer",
                        fontSize: 16,
                        fontWeight: 700,
                        opacity: locked || (pred.homeGoals || 0) <= 0 ? 0.3 : 1,
                      }}
                    >
                      −
                    </button>
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
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        const current = Number(pred.homeGoals || 0);
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
                  {/* Away score with +/- buttons */}
                  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <button
                      type="button"
                      disabled={locked || (pred.awayGoals || 0) <= 0}
                      onClick={() => {
                        const current = Number(pred.awayGoals || 0);
                        updatePrediction(currentPredictionKey, fixture.id, {
                          awayGoals: Math.max(0, current - 1).toString(),
                        });
                      }}
                      style={{
                        width: 24,
                        height: 24,
                        padding: 0,
                        border: `1px solid ${theme.line}`,
                        borderRadius: 6,
                        background: (pred.awayGoals || 0) <= 0 ? theme.panelHi : theme.accent,
                        color: (pred.awayGoals || 0) <= 0 ? theme.text : "#ffffff",
                        cursor: locked || (pred.awayGoals || 0) <= 0 ? "not-allowed" : "pointer",
                        fontSize: 16,
                        fontWeight: 700,
                        opacity: locked || (pred.awayGoals || 0) <= 0 ? 0.3 : 1,
                      }}
                    >
                      −
                    </button>
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
                    <button
                      type="button"
                      disabled={locked}
                      onClick={() => {
                        const current = Number(pred.awayGoals || 0);
                        updatePrediction(currentPredictionKey, fixture.id, {
                          awayGoals: (current + 1).toString(),
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

                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      minWidth: 32,
                    }}
                  >
                    <span
                      style={{ fontSize: 12, color: "#ffffff", fontWeight: 600 }}
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
                    justifyContent: "space-between",
                    gap: 10,
                    fontSize: 12,
                    color: theme.muted,
                    width: "100%",
                  }}
                >
                  {/* Left spacer to balance the right side */}
                  <div style={{ width: 60, flexShrink: 0 }}></div>

                  {/* Center content */}
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {/* MINI WRAPPER with +/- buttons */}
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <CoinIcon />

  <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
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
        width: 24,
        height: 24,
        padding: 0,
        borderRadius: 6,
        border: `1px solid ${theme.line}`,
        background: (locked || coinsStake <= 0) ? theme.panelHi : theme.accent,
        color: (locked || coinsStake <= 0) ? theme.muted : "#fff",
        fontSize: 16,
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
        width: 32,
        textAlign: "center",
        padding: "2px 4px",
        borderRadius: 6,
        border: `1px solid ${theme.line}`,
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
        width: 24,
        height: 24,
        padding: 0,
        borderRadius: 6,
        border: `1px solid ${theme.line}`,
        background: (locked || coinsState.remaining <= 0) ? theme.panelHi : theme.accent2,
        color: (locked || coinsState.remaining <= 0) ? theme.muted : "#fff",
        fontSize: 16,
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

                  {/* Right side - possible return with fixed width */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      fontSize: 11,
                      width: 60,
                      flexShrink: 0,
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
              border: `1px solid rgba(255, 255, 255, 0.3)`,
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
              </div>

              {/* Score inputs */}
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  alignItems: "center",
                  justifyContent: "center",
                  minWidth: 60,
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
                <span style={{ fontWeight: 700 }}>{awayCode}</span>
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
            <h2 style={{ marginTop: 0, fontSize: 18, textAlign: "center" }}>🏆 League Table</h2>
            <div style={{ display: "grid", gap: 8 }}>
              {leaderboard.map((row, i) => {
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

                return (
                  <div
                    key={row.player}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "50px auto 1fr 90px",
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
                      seed={row.player === currentPlayer ? (avatarSeed || currentPlayer) : row.player}
                      style={row.player === currentPlayer ? avatarStyle : 'avataaars'}
                    />
                    <div style={{ 
                      fontWeight: 700,
                      fontSize: 15,
                      color: i === 0 ? "#FFD700" : theme.text
                    }}>
                      {row.player}
                    </div>
                    <div style={{ 
                      textAlign: "right", 
                      fontWeight: 800,
                      fontSize: 18,
                      color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : theme.accent
                    }}>
                      {row.points}
                    </div>
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
              <span>Coins League</span>
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

  return (
    <div
      key={row.userId || row.player}
      style={{
        display: "grid",
        gridTemplateColumns: "50px auto 1fr 90px",
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
        seed={row.player === currentPlayer ? (avatarSeed || currentPlayer) : row.player}
        style={row.player === currentPlayer ? avatarStyle : 'avataaars'}
      />
      <div style={{ 
        fontWeight: 700,
        fontSize: 15,
        color: i === 0 ? "#FFD700" : theme.text
      }}>
        {row.player}
      </div>
      <div style={{ 
        textAlign: "right", 
        fontWeight: 800,
        fontSize: 18,
        color: i === 0 ? "#FFD700" : i === 1 ? "#C0C0C0" : i === 2 ? "#CD7F32" : theme.accent
      }}>
        {value.toFixed ? value.toFixed(2) : value}
      </div>
    </div>
  );
})}
            </div>
          </section>
        )}
        {/* Summary */}
        {activeView === "summary" && (() => {
          // Use existing leaderboard data for top scorer
          const topScorer = leaderboard && leaderboard.length > 0 
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
            Phil: "1763873593264",
          };

          // Calculate summary statistics
          const stats = {
            topScorer: { name: topScorer.player, points: topScorer.points },
            mostBingpots: { name: "", count: 0 },
            mostForgetful: { name: "", missed: 0 },
            bestGambler: { name: "", coins: 0 },
            bestGameweek: { name: "", points: 0, gameweek: 0 }
          };

          // Get all completed fixtures
          const completedFixtures = FIXTURES.filter(f => results[f.id]);

          // Calculate bingpots and missed weeks for each player
          PLAYERS.forEach(player => {
            let bingpots = 0;
            let missedWeeks = 0;

            // Try both player name and userId as keys
            const userId = LEGACY_MAP[player];
            
            // Count bingpots from fixture predictions
            completedFixtures.forEach(fixture => {
              const pred = predictions[player]?.[fixture.id] || predictions[userId]?.[fixture.id];
              const result = results[fixture.id];

              if (pred && pred.homeGoals !== undefined && pred.awayGoals !== undefined) {
                // Check for exact score (bingpot)
                const homeCorrect = Number(pred.homeGoals) === Number(result.homeGoals);
                const awayCorrect = Number(pred.awayGoals) === Number(result.awayGoals);

                if (homeCorrect && awayCorrect) {
                  bingpots++;
                }
              }
            });

            // Count missed weeks from history: any week with 0 points
            historicalScores.forEach(row => {
              const score = row[player] || 0;
              if (score === 0) {
                missedWeeks++;
              }
            });

            // Update most bingpots
            if (bingpots > stats.mostBingpots.count) {
              stats.mostBingpots = { name: player, count: bingpots };
            }

            // Update most forgetful
            if (missedWeeks > stats.mostForgetful.missed) {
              stats.mostForgetful = { name: player, missed: missedWeeks };
            }
          });

          // Get best gambler from coins league
          if (coinsLeagueRows && coinsLeagueRows.length > 0) {
            const topGambler = coinsLeagueRows[0];
            const coins = topGambler.profit !== undefined ? topGambler.profit : (topGambler.points || 0);
            stats.bestGambler = { name: topGambler.player, coins: coins };
          }

          // Find best gameweek score
          historicalScores.forEach(row => {
            PLAYERS.forEach(player => {
              const score = row[player] || 0;
              if (score > stats.bestGameweek.points) {
                stats.bestGameweek = { name: player, points: score, gameweek: row.gameweek };
              }
            });
          });

          const categories = [
            {
              title: "🏆 Top Scorer",
              player: stats.topScorer.name,
              value: `${stats.topScorer.points} points`,
              color: "#FFD700"
            },
            {
              title: "🎯 Most Bingpots",
              player: stats.mostBingpots.name,
              value: `${stats.mostBingpots.count} bingpots`,
              color: "#FF6B9D"
            },
            {
              title: "😴 Most Forgetful",
              player: stats.mostForgetful.name,
              value: `${stats.mostForgetful.missed} missed`,
              color: "#9CA3AF"
            },
            {
              title: "💰 Best Gambler",
              player: stats.bestGambler.name || "—",
              value: stats.bestGambler.name ? `${stats.bestGambler.coins >= 0 ? '+' : ''}${typeof stats.bestGambler.coins === 'number' ? stats.bestGambler.coins.toFixed(2) : stats.bestGambler.coins} coins` : "—",
              color: "#22C55E"
            },
            {
              title: "⚡ Best Gameweek",
              player: stats.bestGameweek.name || "—",
              value: stats.bestGameweek.name ? `${stats.bestGameweek.points} pts (GW${stats.bestGameweek.gameweek})` : "—",
              color: "#F59E0B"
            }
          ];

          return (
            <section style={cardStyle}>
              <h2 style={{ marginTop: 0, marginBottom: 16, fontSize: 18, textAlign: "center" }}>
                Season Summary
              </h2>

              <div style={{ display: "grid", gap: 12 }}>
                {categories.map((cat, idx) => (
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
                      }}
                    >
                      <div
                        style={{
                          fontSize: 20,
                          fontWeight: 800,
                          color: theme.text,
                        }}
                      >
                        {cat.player || "—"}
                      </div>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: theme.muted,
                        }}
                      >
                        {cat.value}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          );
        })()}

        {/* History */}
        {activeView === "history" && (
          <section
  style={{
    ...cardStyle,
    padding: 0,
    overflow: "hidden",
  }}
>
            <h2 style={{ margin: 0, fontSize: 18, padding: "16px 16px 12px" }}>Weekly Scores</h2>

            <div style={{ 
              overflowX: "auto", 
              overflowY: "auto",
              maxHeight: "70vh",
              position: "relative"
            }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "separate",
                  borderSpacing: 0,
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr style={{ 
                    position: "sticky", 
                    top: 0, 
                    zIndex: 4,
                    background: theme.panel
                  }}>
                    <th
  style={{
    textAlign: "center",
    padding: "10px 12px",
    position: "sticky",
    left: 0,
    zIndex: 5,
    background: theme.panel,
    borderRight: `2px solid ${theme.line}`,
    borderBottom: `2px solid ${theme.line}`,
    fontWeight: 700,
    color: theme.accent,
    width: "60px",
    minWidth: "60px",
  }}
>
  GW
</th>
                    {PLAYERS.map((p) => (
                      <th key={p} style={{ 
                        textAlign: "center", 
                        padding: "10px 6px",
                        borderBottom: `2px solid ${theme.line}`,
                        fontWeight: 700,
                        color: theme.accent,
                        background: theme.panel,
                        minWidth: "50px",
                        maxWidth: "70px",
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
                    const vals = PLAYERS.map((p) => row[p]);
                    const max = Math.max(...vals);
                    const min = Math.min(...vals);
                    const range = max - min || 1;

                    return (
                      <tr key={row.gameweek}>
                        <td
  style={{
    padding: "10px 12px",
    color: theme.accent,
    position: "sticky",
    left: 0,
    zIndex: 3,
    background: theme.panel,
    borderRight: `2px solid ${theme.line}`,
    fontWeight: 700,
    textAlign: "center",
  }}
>
  {row.gameweek}
</td>
                        {PLAYERS.map((p) => {
                          const v = row[p];
                          const shade = (v - min) / range;
                          const isWinner = v === max && max > 0;
                          return (
                            <td
                              key={p}
                              style={{
                                padding: "10px 12px",
                                textAlign: "center",
                                background: isWinner 
                                  ? `rgba(34,197,94,${0.25 + 0.35 * shade})`
                                  : theme.panelHi,
                                fontWeight: isWinner ? 800 : 400,
                                color: isWinner ? "#fff" : theme.text,
                                borderBottom: idx < historicalScores.length - 1 ? `1px solid ${theme.line}` : "none",
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
                    width: 24,
                    height: 24,
                    objectFit: "contain",
                  }}
                />
              )}
              
              <span>{getTeamCode(fixture.homeTeam)}</span>
              <span style={{ color: theme.muted }}>vs</span>
              <span>{getTeamCode(fixture.awayTeam)}</span>
              
              {/* Away team badge */}
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

        {/* Rules Page */}
        {activeView === "rules" && (
          <section style={cardStyle}>
            <h2 style={{ marginTop: 0, marginBottom: 20, fontSize: 22, textAlign: "center", fontWeight: 800 }}>
              📋 Rules & Scoring
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
                    Pick <strong>one Captain per gameweek</strong>. Their points are <strong>doubled</strong>.
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
                    Use <strong>once per season</strong>. That match's points are <strong>tripled</strong>. Choose wisely!
                  </div>
                </div>
              </div>
            </div>

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
                      <strong>Starting Balance:</strong> You get <strong>10 coins per gameweek</strong>.
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
                      <strong>Winnings:</strong> Win = coins × odds. Lose = lose your bet. Your <strong>profit/loss rolls over</strong> across the season.
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
              ⚙️ Settings
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
                  style={avatarStyle}
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
                  setAvatarSeed('');
                  localStorage.setItem('avatar_seed', '');
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

                  <button
                    onClick={async () => {
                      if (!pushEnabled) {
                        // Request permission
                        try {
                          const permission = await Notification.requestPermission();
                          if (permission === 'granted') {
                            // Get VAPID public key from backend
                            const vapidRes = await fetch(`${BACKEND_BASE}/api/push/vapid-public-key`);
                            const { publicKey } = await vapidRes.json();
                            
                            // Register service worker and subscribe
                            const registration = await navigator.serviceWorker.register('/service-worker.js');
                            await navigator.serviceWorker.ready;
                            
                            const subscription = await registration.pushManager.subscribe({
                              userVisibleOnly: true,
                              applicationServerKey: publicKey
                            });
                            
                            // Send subscription to backend
                            const subRes = await fetch(`${BACKEND_BASE}/api/push/subscribe`, {
                              method: 'POST',
                              headers: {
                                'Content-Type': 'application/json',
                                Authorization: `Bearer ${authToken}`
                              },
                              body: JSON.stringify(subscription)
                            });
                            
                            if (subRes.ok) {
                              setPushEnabled(true);
                              alert('✅ Push notifications enabled!');
                            } else {
                              throw new Error('Failed to save subscription');
                            }
                          } else {
                            alert('❌ Permission denied for notifications');
                          }
                        } catch (err) {
                          console.error('Push subscription failed:', err);
                          alert('Failed to enable push notifications: ' + err.message);
                        }
                      } else {
                        // Unsubscribe
                        try {
                          const registration = await navigator.serviceWorker.getRegistration();
                          const subscription = await registration.pushManager.getSubscription();
                          if (subscription) {
                            await subscription.unsubscribe();
                          }
                          
                          // Tell backend to remove subscription
                          await fetch(`${BACKEND_BASE}/api/push/unsubscribe`, {
                            method: 'POST',
                            headers: {
                              'Content-Type': 'application/json',
                              Authorization: `Bearer ${authToken}`
                            }
                          });
                          
                          setPushEnabled(false);
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
