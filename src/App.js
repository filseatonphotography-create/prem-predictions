import React, { useState, useMemo, useEffect } from "react";
import "./App.css";
import FIXTURES from "./fixtures";

// --- PLAYERS ---
const PLAYERS = ["Tom", "Emma", "Phil", "Steve", "Dave", "Ian", "Anthony"];

// Spreadsheet weekly totals
const SPREADSHEET_WEEKLY_TOTALS = {
  Tom: [8, 14, 33, 8, 42, 11, 34, 16, 14, 8, 26],
  Emma: [26, 15, 4, 14, 19, 11, 20, 25, 12, 32, 19],
  Phil: [8, 15, 11, 18, 27, 6, 16, 17, 28, 29, 18],
  Steve: [14, 16, 20, 23, 2, 11, 28, 17, 27, 30, 15],
  Dave: [24, 11, 7, 26, 14, 23, 31, 11, 15, 28, 8],
  Ian: [23, 10, 7, 20, 20, 24, 24, 22, 12, 4, 21],
  Anthony: [12, 25, 15, 28, 25, 11, 23, 13, 17, 17, 0],
};

const STORAGE_KEY = "pl_prediction_game_v1";
const ACCOUNT_STORAGE_KEY = "pl_prediction_accounts_v1";

const GAMEWEEKS = Array.from(new Set(FIXTURES.map((f) => f.gameweek))).sort(
  (a, b) => a - b
);

// --- SCORING LOGIC ---
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

  if (ph === rh && pa === ra) return 7; // bingpot
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

// --- TEAM NAME NORMALISATION ---
function normalizeTeamName(name) {
  if (!name) return "";
  let s = name.toLowerCase().trim();

  // Handle your short/quirky names BEFORE cleanup
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
  if (s === "west ham" || s === "whu" || s === "hammers") s = "west ham united";
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

  // strip common suffixes
  s = s.replace(/football club/g, "");
  s = s.replace(/\bfc\b/g, "");
  s = s.replace(/\bafc\b/g, "");
  s = s.replace(/\butd\b/g, "united");

  // remove everything that's not a–z
  s = s.replace(/[^a-z]/g, "");

  // map short-ish forms to canonical
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

  if (aliasMap[s]) {
    s = aliasMap[s];
  }

  return s;
}

// --- SIMPLE ACCOUNT STORAGE HELPERS ---
function loadAccounts() {
  try {
    const raw = localStorage.getItem(ACCOUNT_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch (e) {
    console.error("Error reading accounts from localStorage", e);
    return {};
  }
}

function saveAccounts(accounts) {
  localStorage.setItem(ACCOUNT_STORAGE_KEY, JSON.stringify(accounts));
}

// --- API HELPERS ---
async function fetchPremierLeagueResults() {
  // Only when running locally with backend
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return { matches: [], error: "remote_host" };
  }

  try {
    const res = await fetch("http://localhost:5001/api/results");

    if (!res.ok) {
      console.error("Backend /api/results failed with status:", res.status);
      return { matches: [], error: `HTTP ${res.status}` };
    }

    const matches = await res.json();
    return { matches, error: null };
  } catch (err) {
    console.error("Error calling backend /api/results:", err);
    return { matches: [], error: err.message };
  }
}

async function fetchPremierLeagueOdds() {
  // Only when running locally with backend
  if (
    typeof window !== "undefined" &&
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    return { markets: [], error: "remote_host" };
  }

  try {
    const res = await fetch("http://localhost:5001/api/odds");
    if (!res.ok) {
      console.error("Backend /api/odds failed with status:", res.status);
      return { markets: [], error: `HTTP ${res.status}` };
    }
    const markets = await res.json();
    return { markets, error: null };
  } catch (err) {
    console.error("Error calling backend /api/odds:", err);
    return { markets: [], error: err.message };
  }
}

// --- DEADLINES ---
function isPredictionLocked(fixture) {
  const kickoff = new Date(fixture.kickoff).getTime();
  const deadline = kickoff - 60 * 60 * 1000;
  return Date.now() > deadline;
}

// Is a whole gameweek past its prediction deadline?
function isGameweekLocked(gameweek) {
  const fixtures = FIXTURES.filter((f) => f.gameweek === gameweek);
  if (fixtures.length === 0) return false;
  const earliestDeadline = Math.min(
    ...fixtures.map(
      (f) => new Date(f.kickoff).getTime() - 60 * 60 * 1000 // 1hr before earliest kickoff
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

function App() {
  // Auth / login
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentPlayer, setCurrentPlayer] = useState("");
  const [loginName, setLoginName] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginMode, setLoginMode] = useState("login"); // 'login' | 'signup'
  const [authError, setAuthError] = useState("");

  // App state
  const [predictions, setPredictions] = useState({});
  const [results, setResults] = useState({});
  const [odds, setOdds] = useState({}); // { [fixtureId]: { home, draw, away } }
  const [selectedGameweek, setSelectedGameweek] = useState(GAMEWEEKS[0]);
  const [apiStatus, setApiStatus] = useState("Auto results: not loaded yet");
  const [activeView, setActiveView] = useState("predictions"); // predictions | results | league | awards | history | winprob | all

  const gwLocked = isGameweekLocked(selectedGameweek);

  // INIT: load saved data, then fetch from backend and merge in auto results + odds
  useEffect(() => {
    async function init() {
      // 1) Load from localStorage
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        setPredictions(parsed.predictions || {});
        setResults(parsed.results || {});
        setOdds(parsed.odds || {});
        if (parsed.selectedGameweek)
          setSelectedGameweek(parsed.selectedGameweek);
      }

      // 2) Fetch results from backend
      const { matches, error } = await fetchPremierLeagueResults();
      if (error) {
        if (error === "remote_host") {
          setApiStatus(
            "Auto results: only available when Phil runs the app on his own computer."
          );
        } else {
          setApiStatus("Auto results: failed to load from API.");
        }
      } else {
        let matchedCount = 0;
        const updatedResults = {};

        matches.forEach((match) => {
          if (!match.homeTeam || !match.awayTeam) return;
          if (
            !match.score ||
            !match.score.fullTime ||
            match.score.fullTime.home === null ||
            match.score.fullTime.away === null
          ) {
            return; // only finished matches
          }

          const apiHome = normalizeTeamName(match.homeTeam.name);
          const apiAway = normalizeTeamName(match.awayTeam.name);

          const fixture = FIXTURES.find((f) => {
            const localHome = normalizeTeamName(f.homeTeam);
            const localAway = normalizeTeamName(f.awayTeam);
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

        setResults((prev) => ({
          ...prev,
          ...updatedResults,
        }));

        setApiStatus(
          `Auto results: matched ${matchedCount} fixture${
            matchedCount === 1 ? "" : "s"
          } from API`
        );
      }

      // 3) Fetch odds from backend (if available)
      const { markets, error: oddsError } = await fetchPremierLeagueOdds();
      if (!oddsError && markets && markets.length) {
        const newOdds = {};
        markets.forEach((market) => {
          const apiHome = normalizeTeamName(market.homeTeam);
          const apiAway = normalizeTeamName(market.awayTeam);

          const fixture = FIXTURES.find((f) => {
            const localHome = normalizeTeamName(f.homeTeam);
            const localAway = normalizeTeamName(f.awayTeam);
            return localHome === apiHome && localAway === apiAway;
          });

          if (fixture) {
            newOdds[fixture.id] = {
              home: market.homeOdds,
              draw: market.drawOdds,
              away: market.awayOdds,
            };
          }
        });

        if (Object.keys(newOdds).length > 0) {
          setOdds((prev) => ({
            ...prev,
            ...newOdds,
          }));
        }
      }
    }

    init();
  }, []);

  // Auto select next gameweek
  useEffect(() => {
    const now = new Date();
    const next = FIXTURES.find((f) => new Date(f.kickoff) > now);
    if (next) setSelectedGameweek(next.gameweek);
  }, []);

  // Save to localStorage (no currentPlayer so login stays per-session)
  useEffect(() => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        predictions,
        results,
        odds,
        selectedGameweek,
      })
    );
  }, [predictions, results, odds, selectedGameweek]);

  // Update prediction with captain / triple logic
  const updatePrediction = (player, fixtureId, newFields) => {
    setPredictions((prev) => {
      const prevPlayerPreds = prev[player] || {};
      const prevFixturePred =
        prevPlayerPreds[fixtureId] || {
          homeGoals: "",
          awayGoals: "",
          isDouble: false,
          isTriple: false,
        };

      // Basic merge first
      let updated = {
        ...prev,
        [player]: {
          ...prevPlayerPreds,
          [fixtureId]: {
            ...prevFixturePred,
            ...newFields,
          },
        },
      };

      let playerPreds = updated[player];

      // TRIPLE logic
      if ("isTriple" in newFields) {
        const wantTriple = newFields.isTriple;
        const tripleFixture = FIXTURES.find((f) => f.id === fixtureId);

        if (wantTriple && tripleFixture) {
          // Only this fixture is triple; clear doubles in same GW
          updated[player] = Object.fromEntries(
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
          updated[player][fixtureId] = {
            ...(updated[player][fixtureId] || {}),
            isTriple: false,
          };
        }

        playerPreds = updated[player];
      }

      // DOUBLE logic
      if ("isDouble" in newFields) {
        const wantDouble = newFields.isDouble;
        const doubleFixture = FIXTURES.find((f) => f.id === fixtureId);

        if (wantDouble && doubleFixture) {
          // Only this fixture is double in this GW; clear triple in same GW
          updated[player] = Object.fromEntries(
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
          updated[player][fixtureId] = {
            ...(updated[player][fixtureId] || {}),
            isDouble: false,
          };
        }
      }

      return updated;
    });
  };

  // Update results (manual override allowed)
  const updateResult = (fixtureId, newFields) => {
    setResults((prev) => ({
      ...prev,
      [fixtureId]: { ...prev[fixtureId], ...newFields },
    }));
  };

  // Update odds (manual override still allowed)
  const updateOdds = (fixtureId, newFields) => {
    setOdds((prev) => ({
      ...prev,
      [fixtureId]: {
        ...(prev[fixtureId] || { home: "", draw: "", away: "" }),
        ...newFields,
      },
    }));
  };

  // Visible fixtures for GW
  const visibleFixtures = FIXTURES.filter(
    (f) => f.gameweek === selectedGameweek
  );

  // Leaderboard
  const leaderboard = useMemo(() => {
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
  }, [predictions, results]);

  // Historical weekly table
  const historicalScores = GAMEWEEKS.map((gw) => {
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

  const blockScroll = (e) => e.target.blur();

  const inputStyle = {
    width: "3rem",
    textAlign: "center",
  };

  const tableWrapperStyle = {
    width: "100%",
    overflowX: "auto",
  };

  // --- AUTH HANDLERS ---
  const handleAuthSubmit = (e) => {
    e.preventDefault();
    setAuthError("");

    const name = loginName.trim();
    const pwd = loginPassword.trim();

    if (!name || !pwd) {
      setAuthError("Please enter a name and password.");
      return;
    }

    if (!PLAYERS.includes(name)) {
      setAuthError(`Name must be one of: ${PLAYERS.join(", ")}`);
      return;
    }

    const accounts = loadAccounts();

    if (loginMode === "signup") {
      if (accounts[name]) {
        setAuthError("That player already has an account. Please log in.");
        return;
      }
      accounts[name] = { password: pwd };
      saveAccounts(accounts);
      setCurrentPlayer(name);
      setIsLoggedIn(true);
      setLoginPassword("");
    } else {
      const acc = accounts[name];
      if (!acc || acc.password !== pwd) {
        setAuthError("Incorrect name or password.");
        return;
      }
      setCurrentPlayer(name);
      setIsLoggedIn(true);
      setLoginPassword("");
    }
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentPlayer("");
    setLoginPassword("");
    setAuthError("");
  };

  // --- LOGIN SCREEN (with historical data only) ---
  if (!isLoggedIn) {
    return (
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "1rem 0.75rem",
        }}
      >
        <h1
          style={{
            fontSize: "2rem",
            margin: "10px 0 8px",
            lineHeight: 1.2,
          }}
        >
          PHILS MAGICAL FUNTASTICAL SCORE PREDICTION CHALLENGE!
        </h1>

        <section
          style={{
            marginTop: "0.75rem",
            marginBottom: "1.25rem",
            maxWidth: "480px",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            Log in / Create account
          </h2>
          <p style={{ fontSize: "0.9rem", marginBottom: "0.5rem" }}>
            Only logged-in players can enter or view predictions. Historical
            weekly scores are visible to everyone.
          </p>

          <form onSubmit={handleAuthSubmit}>
            <div style={{ marginBottom: "0.5rem" }}>
              <label>
                <strong>Player name:</strong>{" "}
                <select
                  value={loginName}
                  onChange={(e) => setLoginName(e.target.value)}
                >
                  <option value="">Select your name…</option>
                  {PLAYERS.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <div style={{ marginBottom: "0.5rem" }}>
              <label>
                <strong>Password:</strong>{" "}
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                />
              </label>
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.5rem",
                alignItems: "center",
                marginBottom: "0.5rem",
                flexWrap: "wrap",
              }}
            >
              <label style={{ fontSize: "0.9rem" }}>
                <input
                  type="radio"
                  name="mode"
                  value="login"
                  checked={loginMode === "login"}
                  onChange={() => setLoginMode("login")}
                />{" "}
                Log in
              </label>
              <label style={{ fontSize: "0.9rem" }}>
                <input
                  type="radio"
                  name="mode"
                  value="signup"
                  checked={loginMode === "signup"}
                  onChange={() => setLoginMode("signup")}
                />{" "}
                Create account (first time)
              </label>
            </div>

            {authError && (
              <div
                style={{
                  color: "red",
                  fontSize: "0.85rem",
                  marginBottom: "0.5rem",
                }}
              >
                {authError}
              </div>
            )}

            <button type="submit" style={{ padding: "0.4rem 1rem" }}>
              {loginMode === "login" ? "Log in" : "Create account"}
            </button>
          </form>
        </section>

        {/* HISTORICAL SCORES VISIBLE WITHOUT LOGIN */}
        <section style={{ marginTop: "1.5rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            Historical Weekly Scores
          </h2>
          <div style={tableWrapperStyle}>
            <table>
              <thead>
                <tr>
                  <th>GW</th>
                  {PLAYERS.map((p) => (
                    <th key={p}>{p}</th>
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
                      <td>{row.gameweek}</td>
                      {PLAYERS.map((p) => {
                        const v = row[p];
                        const shade = (v - min) / range;
                        return (
                          <td
                            key={p}
                            style={{
                              backgroundColor: `rgba(0,150,0,${
                                0.2 + 0.3 * shade
                              })`,
                              fontWeight: v === max ? "bold" : "normal",
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
      </div>
    );
  }

  // --- MAIN APP (AFTER LOGIN) ---
  return (
    <div
      style={{
        maxWidth: "1000px",
        margin: "0 auto",
        padding: "0.75rem 0.75rem",
      }}
    >
      <h1
        style={{
          fontSize: "2rem",
          margin: "10px 0 5px",
          lineHeight: 1.2,
        }}
      >
        PHILS MAGICAL FUNTASTICAL SCORE PREDICTION CHALLENGE!
      </h1>
      <div
        style={{
          marginBottom: "0.4rem",
          fontSize: "0.85rem",
          opacity: 0.8,
        }}
      >
        {apiStatus}
      </div>
      <div
        style={{
          marginBottom: "0.75rem",
          fontSize: "0.85rem",
        }}
      >
        Logged in as <strong>{currentPlayer}</strong>.{" "}
        <button
          onClick={handleLogout}
          style={{ marginLeft: "0.5rem", fontSize: "0.8rem" }}
        >
          Log out
        </button>
      </div>

      {/* TOP CONTROLS: PLAYER, GAMEWEEK, VIEW */}
      <section
        style={{
          marginBottom: "0.75rem",
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <div>
          <strong>Player:</strong>{" "}
          {gwLocked ? (
            // AFTER kickoff: can view other players' predictions (read-only)
            <select
              value={currentPlayer}
              onChange={(e) => setCurrentPlayer(e.target.value)}
            >
              {PLAYERS.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          ) : (
            // BEFORE kickoff: only see yourself
            <span>{currentPlayer}</span>
          )}
        </div>
        <div>
          <strong>Gameweek:</strong>{" "}
          <select
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(Number(e.target.value))}
          >
            {GAMEWEEKS.map((gw) => (
              <option key={gw} value={gw}>
                GW{gw}
              </option>
            ))}
          </select>
        </div>
        <div>
          <strong>View:</strong>{" "}
          <select
            value={activeView}
            onChange={(e) => setActiveView(e.target.value)}
          >
            <option value="predictions">Predictions</option>
            <option value="results">Results</option>
            <option value="league">League table</option>
            <option value="awards">Special awards</option>
            <option value="history">Historical scores</option>
            <option value="winprob">Win probabilities</option>
            <option value="all">Show everything</option>
          </select>
        </div>
      </section>

      {/* 1. PREDICTIONS */}
      {(activeView === "predictions" || activeView === "all") && (
        <section style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            1. Enter Predictions (GW{selectedGameweek})
          </h2>
          <div style={tableWrapperStyle}>
            <table>
              <thead>
                <tr>
                  <th>Fixture</th>
                  <th>Kickoff</th>
                  <th>Home</th>
                  <th>Away</th>
                  <th>Captain</th>
                  <th>Triple</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {visibleFixtures.map((fixture) => {
                  const pred = predictions[currentPlayer]?.[fixture.id] || {};
                  const locked = isPredictionLocked(fixture);
                  return (
                    <tr key={fixture.id}>
                      <td>
                        {fixture.homeTeam} vs {fixture.awayTeam}
                      </td>
                      <td>{new Date(fixture.kickoff).toUTCString()}</td>

                      {/* HOME GOALS */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          onWheel={blockScroll}
                          style={inputStyle}
                          value={pred.homeGoals || ""}
                          disabled={locked}
                          onChange={(e) =>
                            updatePrediction(currentPlayer, fixture.id, {
                              homeGoals: e.target.value,
                            })
                          }
                        />
                      </td>

                      {/* AWAY GOALS */}
                      <td>
                        <input
                          type="number"
                          min="0"
                          onWheel={blockScroll}
                          style={inputStyle}
                          value={pred.awayGoals || ""}
                          disabled={locked}
                          onChange={(e) =>
                            updatePrediction(currentPlayer, fixture.id, {
                              awayGoals: e.target.value,
                            })
                          }
                        />
                      </td>

                      {/* DOUBLE */}
                      <td>
                        <input
                          type="checkbox"
                          checked={pred.isDouble || false}
                          disabled={locked || pred.isTriple}
                          onChange={(e) =>
                            updatePrediction(currentPlayer, fixture.id, {
                              isDouble: e.target.checked,
                            })
                          }
                        />
                      </td>

                      {/* TRIPLE */}
                      <td>
                        <input
                          type="checkbox"
                          checked={pred.isTriple || false}
                          disabled={locked || pred.isDouble}
                          onChange={(e) =>
                            updatePrediction(currentPlayer, fixture.id, {
                              isTriple: e.target.checked,
                            })
                          }
                        />
                      </td>

                      <td>{locked ? "Locked" : "Open"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 2. RESULTS */}
      {(activeView === "results" || activeView === "all") && (
        <section style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            2. Enter Results (GW{selectedGameweek})
          </h2>
          <div style={tableWrapperStyle}>
            <table>
              <thead>
                <tr>
                  <th>Fixture</th>
                  <th>Home</th>
                  <th>Away</th>
                </tr>
              </thead>
              <tbody>
                {visibleFixtures.map((fixture) => {
                  const res = results[fixture.id] || {};
                  return (
                    <tr key={fixture.id}>
                      <td>
                        {fixture.homeTeam} vs {fixture.awayTeam}
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          onWheel={blockScroll}
                          style={inputStyle}
                          value={
                            res.homeGoals === 0
                              ? 0
                              : res.homeGoals
                              ? res.homeGoals
                              : ""
                          }
                          onChange={(e) =>
                            updateResult(fixture.id, {
                              homeGoals: Number(e.target.value),
                            })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          min="0"
                          onWheel={blockScroll}
                          style={inputStyle}
                          value={
                            res.awayGoals === 0
                              ? 0
                              : res.awayGoals
                              ? res.awayGoals
                              : ""
                          }
                          onChange={(e) =>
                            updateResult(fixture.id, {
                              awayGoals: Number(e.target.value),
                            })
                          }
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 3. LEAGUE TABLE */}
      {(activeView === "league" || activeView === "all") && (
        <section style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            3. League Table
          </h2>
          <div style={tableWrapperStyle}>
            <table>
              <thead>
                <tr>
                  <th>Pos</th>
                  <th>Player</th>
                  <th>Points</th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((row, i) => (
                  <tr key={row.player}>
                    <td>{i + 1}</td>
                    <td>{row.player}</td>
                    <td>{row.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 4. SPECIAL AWARDS */}
      {(activeView === "awards" || activeView === "all") && (
        <section style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            4. Special Awards
          </h2>
          <div style={tableWrapperStyle}>
            <table>
              <thead>
                <tr>
                  <th>Captain Bingpots</th>
                  <th>Bingpots</th>
                  <th>Highest Weekly</th>
                  <th>Lowest Weekly</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Coming soon</td>
                  <td>Coming soon</td>
                  <td>Coming soon</td>
                  <td>Coming soon</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* 5. HISTORICAL SCORES */}
      {(activeView === "history" || activeView === "all") && (
        <section style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            5. Historical Weekly Scores
          </h2>
          <div style={tableWrapperStyle}>
            <table>
              <thead>
                <tr>
                  <th>GW</th>
                  {PLAYERS.map((p) => (
                    <th key={p}>{p}</th>
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
                      <td>{row.gameweek}</td>
                      {PLAYERS.map((p) => {
                        const v = row[p];
                        const shade = (v - min) / range;
                        return (
                          <td
                            key={p}
                            style={{
                              backgroundColor: `rgba(0,150,0,${
                                0.2 + 0.3 * shade
                              })`,
                              fontWeight: v === max ? "bold" : "normal",
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

      {/* 6. WIN PROBABILITIES */}
      {(activeView === "winprob" || activeView === "all") && (
        <section style={{ marginBottom: "1.2rem" }}>
          <h2 style={{ fontSize: "1.2rem", marginBottom: "0.5rem" }}>
            6. Win probabilities (GW{selectedGameweek})
          </h2>
          <p style={{ fontSize: "0.85rem", marginBottom: "0.5rem" }}>
            If the backend is running with an odds API key, odds will auto-fill.
            Otherwise, you can type decimal odds (e.g. 2.10, 3.40, 3.60).
            Probabilities are normalised from implied odds.
          </p>
          <div style={tableWrapperStyle}>
            <table>
              <thead>
                <tr>
                  <th>Fixture</th>
                  <th>Home odds</th>
                  <th>Draw odds</th>
                  <th>Away odds</th>
                  <th>Home %</th>
                  <th>Draw %</th>
                  <th>Away %</th>
                </tr>
              </thead>
              <tbody>
                {visibleFixtures.map((fixture) => {
                  const o = odds[fixture.id] || {};
                  const probs = computeProbabilities(o);

                  return (
                    <tr key={fixture.id}>
                      <td>
                        {fixture.homeTeam} vs {fixture.awayTeam}
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="1.01"
                          style={inputStyle}
                          value={o.home ?? ""}
                          onChange={(e) =>
                            updateOdds(fixture.id, { home: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="1.01"
                          style={inputStyle}
                          value={o.draw ?? ""}
                          onChange={(e) =>
                            updateOdds(fixture.id, { draw: e.target.value })
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          step="0.01"
                          min="1.01"
                          style={inputStyle}
                          value={o.away ?? ""}
                          onChange={(e) =>
                            updateOdds(fixture.id, { away: e.target.value })
                          }
                        />
                      </td>
                      <td>{probs ? probs.home.toFixed(1) + "%" : "-"}</td>
                      <td>{probs ? probs.draw.toFixed(1) + "%" : "-"}</td>
                      <td>{probs ? probs.away.toFixed(1) + "%" : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

export default App;