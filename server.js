// server.js
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // v2
const fs = require("fs");
const path = require("path");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 5001;

// === TOKENS ===
// Keep these real in your deployed code, but DO NOT share them publicly.
const FOOTBALL_DATA_TOKEN = "18351cddefba4334a5edb3a60ea84ba3"; // your football-data.org token
const ODDS_API_KEY = "72209b9a1ab8337b046a7a1a3996f1bc"; // your Odds API key

app.use(cors());
app.use(express.json()); // so we can read JSON bodies

// ---------------------------------------------------------------------------
// SIMPLE USER STORAGE + SESSIONS
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LEAGUES_FILE = path.join(DATA_DIR, "leagues.json");

// In-memory sessions: token -> { id, username }
const sessions = new Map();

// Make sure the data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}

// ---------------- USERS ----------------
function loadUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return [];
    }
    const raw = fs.readFileSync(USERS_FILE, "utf8");
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading users file:", err);
    return [];
  }
}

function saveUsers(users) {
  try {
    fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing users file:", err);
  }
}

// ---------------- LEAGUES ----------------
function createDefaultLeagues() {
  const defaultLeague = {
    id: "league_" + Date.now().toString(),
    name: "The Originals",
    // default code if we ever need to seed from scratch
    joinCode: "ORIGINALS",
    inviteCode: "ORIGINALS",
    ownerId: null, // not tied to a specific user
    members: [],
    createdAt: new Date().toISOString(),
  };
  return [defaultLeague];
}

function loadLeagues() {
  try {
    if (!fs.existsSync(LEAGUES_FILE)) {
      const initial = createDefaultLeagues();
      saveLeagues(initial);
      return initial;
    }
    const raw = fs.readFileSync(LEAGUES_FILE, "utf8");
    if (!raw) {
      const initial = createDefaultLeagues();
      saveLeagues(initial);
      return initial;
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      const initial = createDefaultLeagues();
      saveLeagues(initial);
      return initial;
    }
    return parsed;
  } catch (err) {
    console.error("Error reading leagues file:", err);
    const initial = createDefaultLeagues();
    saveLeagues(initial);
    return initial;
  }
}

function saveLeagues(leagues) {
  try {
    fs.writeFileSync(LEAGUES_FILE, JSON.stringify(leagues, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing leagues file:", err);
  }
}

// Generate a unique join code (for NEW leagues)
function generateJoinCode(existingLeagues) {
  const existingCodes = new Set(
    existingLeagues.map((l) => (l.joinCode || l.inviteCode || "").toUpperCase())
  );
  while (true) {
    const code =
      Math.random().toString(36).substring(2, 8).toUpperCase(); // 6 chars
    if (!existingCodes.has(code)) return code;
  }
}

// Create a new random session token
function createSession(user) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { id: user.id, username: user.username });
  return token;
}

// Auth middleware used for mini-leagues etc.
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const parts = authHeader.split(" ");
  if (parts.length === 2 && parts[0] === "Bearer") {
    const token = parts[1];
    const session = sessions.get(token);
    if (session) {
      req.user = session;
      return next();
    }
  }
  return res.status(401).json({ error: "Unauthorized" });
}

// ---------------------------------------------------------------------------
// HEALTH CHECK
// ---------------------------------------------------------------------------
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// ---------------------------------------------------------------------------
// AUTH ROUTES
// ---------------------------------------------------------------------------

// Create account
app.post("/api/signup", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const name = (username || "").trim();
    const pwd = (password || "").trim();

    if (!name || !pwd) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }

    if (pwd.length < 4) {
      return res
        .status(400)
        .json({ error: "Password must be at least 4 characters long." });
    }

    let users = loadUsers();

    if (users.find((u) => u.username.toLowerCase() === name.toLowerCase())) {
      return res
        .status(400)
        .json({ error: "That username is already taken. Please log in." });
    }

    const passwordHash = await bcrypt.hash(pwd, 10);
    const newUser = {
      id: Date.now().toString(),
      username: name,
      passwordHash,
    };

    users.push(newUser);
    saveUsers(users);

    const token = createSession(newUser);

    return res.json({
      userId: newUser.id,
      username: newUser.username,
      token,
    });
  } catch (err) {
    console.error("Error in /api/signup:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Log in
app.post("/api/login", async (req, res) => {
  try {
    const { username, password } = req.body || {};
    const name = (username || "").trim();
    const pwd = (password || "").trim();

    if (!name || !pwd) {
      return res
        .status(400)
        .json({ error: "Username and password are required." });
    }

    const users = loadUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === name.toLowerCase()
    );

    if (!user) {
      return res.status(401).json({ error: "Incorrect username or password." });
    }

    const ok = await bcrypt.compare(pwd, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ error: "Incorrect username or password." });
    }

    const token = createSession(user);

    return res.json({
      userId: user.id,
      username: user.username,
      token,
    });
  } catch (err) {
    console.error("Error in /api/login:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// MINI-LEAGUE ROUTES (with backwards compatibility)
// ---------------------------------------------------------------------------

// Get leagues that the current user is a member of
app.get("/api/leagues/my", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const leagues = loadLeagues();

    const myLeagues = leagues
      .map((league) => {
        // handle both new and old formats
        const members = Array.isArray(league.members)
          ? league.members
          : Array.isArray(league.memberUserIds)
          ? league.memberUserIds
          : [];

        const joinCode = (league.joinCode || league.inviteCode || "").toUpperCase();

        return {
          raw: league,
          members,
          joinCode,
        };
      })
      .filter((wrapped) => wrapped.members.includes(userId))
      .map((wrapped) => ({
        id: wrapped.raw.id,
        name: wrapped.raw.name,
        joinCode: wrapped.joinCode,
        memberCount: wrapped.members.length,
      }));

    return res.json({ leagues: myLeagues });
  } catch (err) {
    console.error("Error in /api/leagues/my:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Create a new mini-league
app.post("/api/league/create", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const rawName = (req.body && req.body.name) || "";
    const name = rawName.trim();

    if (!name) {
      return res.status(400).json({ error: "League name is required." });
    }
    if (name.length < 3) {
      return res
        .status(400)
        .json({ error: "League name must be at least 3 characters long." });
    }

    const leagues = loadLeagues();
    const joinCode = generateJoinCode(leagues);

    const newLeague = {
      id: "league_" + Date.now().toString(),
      name,
      joinCode,               // new style
      inviteCode: joinCode,   // keep a mirror for compatibility
      ownerId: userId,
      members: [userId],
      createdAt: new Date().toISOString(),
    };

    leagues.push(newLeague);
    saveLeagues(leagues);

    return res.json({
      league: {
        id: newLeague.id,
        name: newLeague.name,
        joinCode: newLeague.joinCode,
        memberCount: newLeague.members.length,
      },
    });
  } catch (err) {
    console.error("Error in /api/league/create:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Join a mini-league by invite code
app.post("/api/league/join", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const rawCode = (req.body && req.body.code) || "";
    const code = rawCode.trim().toUpperCase();

    if (!code) {
      return res.status(400).json({ error: "Invite/join code is required." });
    }

    const leagues = loadLeagues();
    const idx = leagues.findIndex((l) => {
      const storedCode = (l.joinCode || l.inviteCode || "").toUpperCase();
      return storedCode === code;
    });

    if (idx === -1) {
      return res.status(404).json({ error: "Mini-league not found." });
    }

    const league = leagues[idx];

    // normalise members for older data that used memberUserIds
    if (!Array.isArray(league.members)) {
      if (Array.isArray(league.memberUserIds)) {
        league.members = league.memberUserIds.slice();
      } else {
        league.members = [];
      }
    }

    if (!league.members.includes(userId)) {
      league.members.push(userId);
      // keep old field in sync if it exists
      league.memberUserIds = league.members.slice();
      saveLeagues(leagues);
    }

    return res.json({
      league: {
        id: league.id,
        name: league.name,
        joinCode: league.joinCode || league.inviteCode || "",
        memberCount: league.members.length,
      },
    });
  } catch (err) {
    console.error("Error in /api/league/join:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PREMIER LEAGUE RESULTS (football-data.org)
// ---------------------------------------------------------------------------
app.get("/api/results", async (req, res) => {
  try {
    console.log("Incoming /api/results request");

    const apiRes = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches",
      {
        headers: {
          "X-Auth-Token": FOOTBALL_DATA_TOKEN,
        },
      }
    );

    console.log("Football-Data status:", apiRes.status);

    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => "");
      console.error(
        "Football-Data API error:",
        apiRes.status,
        errorText || "<no body>"
      );
      return res
        .status(apiRes.status)
        .json({ error: "Football-Data API error", status: apiRes.status });
    }

    const data = await apiRes.json();
    const matches = Array.isArray(data.matches) ? data.matches : [];

    console.log("Returning", matches.length, "matches to frontend");
    res.json(matches);
  } catch (err) {
    console.error("Server error in /api/results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// EPL ODDS (The Odds API)
// ---------------------------------------------------------------------------
app.get("/api/odds", async (req, res) => {
  try {
    console.log("Incoming /api/odds request");

    const url = new URL(
      "https://api.the-odds-api.com/v4/sports/soccer_epl/odds"
    );
    url.searchParams.set("apiKey", ODDS_API_KEY);
    url.searchParams.set("regions", "uk"); // UK bookmakers
    url.searchParams.set("markets", "h2h"); // head-to-head (1X2)
    url.searchParams.set("oddsFormat", "decimal"); // decimal odds

    const apiRes = await fetch(url.toString());
    console.log("The Odds API status:", apiRes.status);

    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => "");
      console.error(
        "The Odds API error:",
        apiRes.status,
        errorText || "<no body>"
      );
      return res
        .status(apiRes.status)
        .json({ error: "The Odds API error", status: apiRes.status });
    }

    const data = await apiRes.json();

    const markets = [];

    if (Array.isArray(data)) {
      data.forEach((event) => {
        const homeTeam = event.home_team;
        const awayTeam = event.away_team;

        if (!homeTeam || !awayTeam || !Array.isArray(event.bookmakers)) {
          return;
        }

        const firstBookmaker = event.bookmakers[0];
        if (!firstBookmaker || !Array.isArray(firstBookmaker.markets)) {
          return;
        }

        const h2hMarket = firstBookmaker.markets.find(
          (m) => m.key === "h2h"
        );
        if (!h2hMarket || !Array.isArray(h2hMarket.outcomes)) {
          return;
        }

        let homeOdds = null;
        let awayOdds = null;
        let drawOdds = null;

        h2hMarket.outcomes.forEach((o) => {
          if (!o || typeof o.name !== "string") return;
          const name = o.name;
          const price = o.price;

          if (name === homeTeam) {
            homeOdds = price;
          } else if (name === awayTeam) {
            awayOdds = price;
          } else if (name.toLowerCase() === "draw") {
            drawOdds = price;
          }
        });

        if (
          typeof homeOdds === "number" &&
          typeof awayOdds === "number" &&
          typeof drawOdds === "number"
        ) {
          markets.push({
            homeTeam,
            awayTeam,
            homeOdds,
            drawOdds,
            awayOdds,
          });
        }
      });
    }

    console.log("Returning odds for", markets.length, "fixtures");
    res.json(markets);
  } catch (err) {
    console.error("Server error in /api/odds:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});