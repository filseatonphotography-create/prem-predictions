import React, { useState, useMemo, useEffect } from "react";
import "./App.css";
import FIXTURES from "./fixtures";
const BUILD_ID = "2025-11-26-a";

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

const BACKEND_BASE =
  window.location.hostname === "localhost"
    ? "https://predictionaddiction.onrender.com"
    : "https://predictionaddiction.onrender.com";

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

async function fetchPremierLeagueOdds() {
  try {
    const res = await fetch(`${BACKEND_BASE}/api/odds`);
    if (!res.ok) return { markets: [], error: `HTTP ${res.status}` };
    const markets = await res.json();
    return { markets, error: null };
  } catch (err) {
    return { markets: [], error: err.message };
  }
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

    // 4) odds (initial load)
    const { markets, error: oddsError } = await fetchPremierLeagueOdds();
    if (!oddsError && markets?.length) {
      const newOdds = {};
      markets.forEach((m) => {
        const apiHome = normalizeTeamName(
  typeof m.homeTeam === "string"
    ? m.homeTeam
    : (m.homeTeam?.name || m.homeTeam?.tla || "")
);
const apiAway = normalizeTeamName(
  typeof m.awayTeam === "string"
    ? m.awayTeam
    : (m.awayTeam?.name || m.awayTeam?.tla || "")
);

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
          newOdds[fixture.id] = {
            home: m.homeOdds,
            draw: m.drawOdds,
            away: m.awayOdds,
          };
        }
      });

      if (Object.keys(newOdds).length) {
        setOdds((prev) => ({ ...prev, ...newOdds }));
      }
    }
  }

  init();
}, []);
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

  // Load cloud predictions after login/restore
  useEffect(() => {
    async function loadCloud() {
      if (DEV_USE_LOCAL) return;
      if (!isLoggedIn || !authToken || !currentUserId) return;
      try {
        const remote = await apiGetMyPredictions(authToken);
        const key = PLAYERS.includes(currentPlayer)
          ? currentPlayer
          : currentUserId;
        setPredictions((prev) => ({
          ...prev,
          [key]: { ...(prev[key] || {}), ...remote },
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
          [key]: { ...(prev[key] || {}), ...cloudPreds },
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

  // ---------- PREDICTIONS ----------
  const updatePrediction = (playerKey, fixtureId, newFields) => {
    setPredictions((prev) => {
      const prevPlayerPreds = prev[playerKey] || {};
      const prevFixturePred =
        prevPlayerPreds[fixtureId] || {
          homeGoals: "",
          awayGoals: "",
          isDouble: false,
          isTriple: false,
        };

      let updated = {
        ...prev,
        [playerKey]: {
          ...prevPlayerPreds,
          [fixtureId]: {
            ...prevFixturePred,
            ...newFields,
          },
        },
      };

      let playerPreds = updated[playerKey];

      if ("isTriple" in newFields) {
        const wantTriple = newFields.isTriple;
        const tripleFixture = FIXTURES.find((f) => f.id === fixtureId);

        if (wantTriple && tripleFixture) {
          updated[playerKey] = Object.fromEntries(
            Object.entries(playerPreds).map(([id, pred]) => {
              const f = FIXTURES.find((fx) => fx.id === Number(id));
              const sameGW = f && f.gameweek === tripleFixture.gameweek;
              const isThis = Number(id) === fixtureId;
              return [
                id,
                {
                  ...pred,
                  isTriple: isThis,
                  isDouble: sameGW ? false : pred.isDouble,
                },
              ];
            })
          );
        } else {
          updated[playerKey][fixtureId] = {
            ...(updated[playerKey][fixtureId] || {}),
            isTriple: false,
          };
        }
        playerPreds = updated[playerKey];
      }

      if ("isDouble" in newFields) {
        const wantDouble = newFields.isDouble;
        const doubleFixture = FIXTURES.find((f) => f.id === fixtureId);

        if (wantDouble && doubleFixture) {
          updated[playerKey] = Object.fromEntries(
            Object.entries(playerPreds).map(([id, pred]) => {
              const f = FIXTURES.find((fx) => fx.id === Number(id));
              const sameGW = f && f.gameweek === doubleFixture.gameweek;
              const isThis = Number(id) === fixtureId;
              return [
                id,
                {
                  ...pred,
                  isDouble: sameGW && isThis,
                  isTriple: sameGW ? false : pred.isTriple,
                },
              ];
            })
          );
        } else {
          updated[playerKey][fixtureId] = {
            ...(updated[playerKey][fixtureId] || {}),
            isDouble: false,
          };
        }
      }

      return updated;
    });

    if (DEV_USE_LOCAL) return;
    if (!authToken || !currentUserId) return;

    const currentForFixture =
      (predictions[playerKey] && predictions[playerKey][fixtureId]) || {
        homeGoals: "",
        awayGoals: "",
        isDouble: false,
        isTriple: false,
      };

    const merged = { ...currentForFixture, ...newFields };
    const cleanPrediction = {
      homeGoals:
        merged.homeGoals === "" || merged.homeGoals === null
          ? ""
          : String(merged.homeGoals),
      awayGoals:
        merged.awayGoals === "" || merged.awayGoals === null
          ? ""
          : String(merged.awayGoals),
      isDouble: !!merged.isDouble,
      isTriple: !!merged.isTriple,
    };

    apiSavePrediction(authToken, fixtureId, cleanPrediction).catch((err) =>
      console.error("Failed to sync prediction:", err)
    );
  };

  const updateResult = (fixtureId, newFields) => {
    setResults((prev) => ({
      ...prev,
      [fixtureId]: { ...prev[fixtureId], ...newFields },
    }));
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
    padding: "16px",
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

  // ---------- LOGIN PAGE ----------
  if (!isLoggedIn) {
    return (
      <div style={pageStyle}>
        <div style={{ maxWidth: 980, margin: "0 auto", display: "grid", gap: 12 }}>
          <header style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: "linear-gradient(135deg,#1d4ed8,#22c55e)",
                display: "grid",
                placeItems: "center",
                fontWeight: 800,
              }}
            >
              PL
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, letterSpacing: 0.4 }}>
                Phil’s Score Prediction Challenge
              </h1>
             
            </div>
          </header>

          <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 12 }}>
            <section style={{ ...cardStyle, maxWidth: 520 }}>
              <h2 style={{ marginTop: 0, fontSize: 18 }}>Log in / Create account</h2>

              <form onSubmit={handleAuthSubmit} style={{ display: "grid", gap: 10 }}>
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
            <h1 style={{ margin: 0, fontSize: 20 }}>
              PHIL’S MAGICAL FUNTASTICAL SCORE PREDICTION CHALLENGE!
            </h1>
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
    <nav style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
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
            <h2 style={{ marginTop: 0, fontSize: 18 }}>
              GW{selectedGameweek} Predictions
            </h2>
            

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

                // eslint-disable-next-line no-unused-vars
/*
let predictedPercent = "-";
let predictedOdds = "-";

if (pred.homeGoals !== "" && pred.awayGoals !== "") {
  // ... existing probability logic ...
}
*/

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
                          flexWrap: "nowrap",
                          justifyContent: "center",
                        }}
                      >
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
        width:
          fixture.homeTeam === "Arsenal"
            ? 20
            : fixture.homeTeam === "West Ham"
            ? 20
            : 20,
        height:
          fixture.homeTeam === "Arsenal"
            ? 20
            : fixture.homeTeam === "West Ham"
            ? 20
            : 20,
        objectFit: "contain",
        marginRight: 4,
      }}
    />
  )}
  <span style={{ fontSize: 12, color: theme.muted }}>
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
                                {
                                  awayGoals: e.target.value,
                                }
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
        width:
          fixture.awayTeam === "Arsenal"
            ? 20
            : fixture.awayTeam === "West Ham"
            ? 20
            : 20,
        height:
          fixture.awayTeam === "Arsenal"
            ? 20
            : fixture.awayTeam === "West Ham"
            ? 20
            : 20,
        objectFit: "contain",
        marginLeft: 4,
      }}
    />
  )}
</div>
                        </div>

                                                {/* Right-side row: POINTS + lock key */}
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
                          {/* POINTS box */}
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
                              min="0"
                              readOnly
                              value={
                                pointsForThisFixture == null
                                  ? ""
                                  : pointsForThisFixture
                              }
                              style={{
                                ...smallInput,
                                width: smallInput.width,
                                height: smallInput.height,
                                padding: smallInput.padding,
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

                          {/* Lock status key */}
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

                       {/* Controls row: captain/triple */}
<div
  style={{
    display: "flex",
    flexDirection: "column",
    width: "100%",
    marginTop: 10,
    gap: 4,
  }}
>
  {/* Centre group: Captain + Triple */}
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
        checked={pred.isDouble || false}
        disabled={locked || pred.isTriple}
        onChange={(e) =>
          updatePrediction(currentPredictionKey, fixture.id, {
            isDouble: e.target.checked,
          })
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
      <input
        type="checkbox"
        checked={pred.isTriple || false}
        disabled={locked || pred.isDouble}
        onChange={(e) =>
          updatePrediction(currentPredictionKey, fixture.id, {
            isTriple: e.target.checked,
          })
        }
      />
    </label>
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
                gap: 10,
                flexWrap: "wrap",
                justifyContent: "center",
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
                <input
                  type="number"
                  min="0"
                  style={smallInput}
                  value={res.homeGoals === 0 ? 0 : res.homeGoals ?? ""}
                  onChange={(e) =>
                    updateResult(fixture.id, {
                      homeGoals: Number(e.target.value),
                    })
                  }
                />
                <span style={{ color: theme.muted }}>–</span>
                <input
                  type="number"
                  min="0"
                  style={smallInput}
                  value={res.awayGoals === 0 ? 0 : res.awayGoals ?? ""}
                  onChange={(e) =>
                    updateResult(fixture.id, {
                      awayGoals: Number(e.target.value),
                    })
                  }
                />
              </div>

              {/* Away code + badge */}
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
