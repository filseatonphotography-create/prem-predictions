// server.js — Rebuilt backend with legacy mapping, admin reset, CORS, cloud predictions.
// Uses Node built‑in crypto for password hashing and sessions.

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const app = express();
const PORT = process.env.PORT || 5001;

// === TOKENS ===
// Keep real in deployed code (do NOT share publicly).
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN || "18351cddefba4334a5edb3a60ea84ba3";
const ODDS_API_KEY = process.env.ODDS_API_KEY || "72209b9a1ab8337b046a7a1a3996f1bc";

// ---------------------------------------------------------------------------
// CORS (required origins + credentials + authorization allowed)
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://scintillating-macaron-cfbf04.netlify.app",
  "https://prem-predictions-1.onrender.com",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true); // allow curl / server-to-server
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS"));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-admin-key"],
  })
);

app.use(express.json());

// ---------------------------------------------------------------------------
// DATA FILES
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, "data");
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LEAGUES_FILE = path.join(DATA_DIR, "leagues.json");
const PREDICTIONS_FILE = path.join(DATA_DIR, "predictions.json");
const LEGACY_MAP_FILE = path.join(DATA_DIR, "legacyMap.json");

const RESERVED_LEGACY_NAMES = ["Tom", "Emma", "Phil", "Steve", "Dave", "Ian", "Anthony"];

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

// ---------------------------------------------------------------------------
// HELPERS: PASSWORD HASHING
// ---------------------------------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, stored) {
  if (!stored || typeof stored !== "string" || !stored.includes(":")) return false;
  const [salt, hash] = stored.split(":");
  const hashCheck = crypto
    .pbkdf2Sync(password, salt, 10000, 64, "sha512")
    .toString("hex");
  return hashCheck === hash;
}

// ---------------------------------------------------------------------------
// HELPERS: LOAD/SAVE JSON
// ---------------------------------------------------------------------------
function loadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    return parsed ?? fallback;
  } catch (err) {
    console.error("Failed to load", file, err);
    return fallback;
  }
}

function saveJson(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Failed to save", file, err);
  }
}

// Users
const loadUsers = () => loadJson(USERS_FILE, []);
const saveUsers = (users) => saveJson(USERS_FILE, users);

// Leagues (backwards compatible default)
function createDefaultLeagues() {
  return [
    {
      id: "league_" + Date.now().toString(),
      name: "The Originals",
      joinCode: "ORIGINALS",
      inviteCode: "ORIGINALS",
      ownerId: null,
      members: [],
      createdAt: new Date().toISOString(),
    },
  ];
}
function loadLeagues() {
  if (!fs.existsSync(LEAGUES_FILE)) {
    const init = createDefaultLeagues();
    saveJson(LEAGUES_FILE, init);
    return init;
  }
  const leagues = loadJson(LEAGUES_FILE, null);
  if (!Array.isArray(leagues)) {
    const init = createDefaultLeagues();
    saveJson(LEAGUES_FILE, init);
    return init;
  }
  return leagues;
}
const saveLeagues = (leagues) => saveJson(LEAGUES_FILE, leagues);

// Predictions (userId -> { fixtureId -> prediction })
const loadPredictions = () => loadJson(PREDICTIONS_FILE, {});
const savePredictions = (preds) => saveJson(PREDICTIONS_FILE, preds);

// Legacy map (legacyName -> userId)
const loadLegacyMap = () => loadJson(LEGACY_MAP_FILE, {});
const saveLegacyMap = (m) => saveJson(LEGACY_MAP_FILE, m);

// ---------------------------------------------------------------------------
// SESSIONS (token -> { id, username })
// ---------------------------------------------------------------------------
const sessions = new Map();

function createSession(user) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { id: user.id, username: user.username });
  return token;
}

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
// HEALTH
// ---------------------------------------------------------------------------
app.get("/", (req, res) => res.send("Backend is running"));

// ---------------------------------------------------------------------------
// AUTH
// ---------------------------------------------------------------------------
app.post("/api/signup", (req, res) => {
  try {
    const { username, password } = req.body || {};
    const name = (username || "").trim();
    const pwd = (password || "").trim();

    if (!name || !pwd) {
      return res.status(400).json({ error: "Username and password are required." });
    }
    if (pwd.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }

    // ---- Legacy name auto-claim support ----
    const LEGACY_NAMES = ["Tom", "Emma", "Phil", "Steve", "Dave", "Ian", "Anthony"];
    const legacyMapPath = path.join(__dirname, "data", "legacyMap.json");

    let legacyMap = {};
    if (fs.existsSync(legacyMapPath)) {
      legacyMap = JSON.parse(fs.readFileSync(legacyMapPath, "utf8") || "{}");
    }

    const isLegacyName = LEGACY_NAMES.some(
      (n) => n.toLowerCase() === name.toLowerCase()
    );

    // If they are trying to register a legacy name, allow ONLY if unclaimed.
    if (isLegacyName) {
      const alreadyClaimed = Object.keys(legacyMap).some(
        (k) => k.toLowerCase() === name.toLowerCase()
      );
      if (alreadyClaimed) {
        return res.status(400).json({
          error: "That legacy name has already been claimed. Please choose another username.",
        });
      }
    }
    // ---- End legacy name check ----

    const users = loadUsers();
    if (users.find((u) => u.username.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: "That username is already taken." });
    }

    const newUser = {
      id: Date.now().toString(),
      username: name,
      passwordHash: hashPassword(pwd),
      createdAt: new Date().toISOString(),
    };
    users.push(newUser);
    saveUsers(users);

    // Auto-claim legacy name ON SIGNUP if applicable
    if (isLegacyName) {
      // store using the canonical legacy spelling (from LEGACY_NAMES)
      const canonical = LEGACY_NAMES.find(
        (n) => n.toLowerCase() === name.toLowerCase()
      );
      legacyMap[canonical] = newUser.id;
      fs.writeFileSync(legacyMapPath, JSON.stringify(legacyMap, null, 2));
      console.log(`Auto legacy-claimed on signup ${canonical} -> ${newUser.id}`);
    }

    const token = createSession(newUser);
    return res.json({ userId: newUser.id, username: newUser.username, token });
  } catch (err) {
    console.error("signup error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body || {};
    const name = (username || "").trim();
    const pwd = (password || "").trim();
    if (!name || !pwd) {
      return res.status(400).json({ error: "Username and password are required." });
    }

    const users = loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === name.toLowerCase());
    if (!user) return res.status(401).json({ error: "Incorrect username or password." });

    if (!verifyPassword(pwd, user.passwordHash)) {
      return res.status(401).json({ error: "Incorrect username or password." });
    }

    // ---- AUTO legacy-map on first successful login ----
    const LEGACY_NAMES = ["Tom", "Emma", "Phil", "Steve", "Dave", "Ian", "Anthony"];
    const legacyMapPath = path.join(__dirname, "data", "legacyMap.json");

    let legacyMap = {};
    if (fs.existsSync(legacyMapPath)) {
      legacyMap = JSON.parse(fs.readFileSync(legacyMapPath, "utf8") || "{}");
    }

    // If they log in with an exact legacy username and it's not mapped yet, map it now.
    if (LEGACY_NAMES.includes(user.username) && !legacyMap[user.username]) {
      legacyMap[user.username] = user.id;
      fs.writeFileSync(legacyMapPath, JSON.stringify(legacyMap, null, 2));
      console.log(`Auto legacy-mapped ${user.username} -> ${user.id}`);
    }
    // ---- END AUTO legacy-map ----

    const token = createSession(user);
    return res.json({ userId: user.id, username: user.username, token });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/change-password", (req, res) => {
  try {
    const authHeader = req.headers["authorization"] || "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return res.status(401).json({ error: "Missing token" });

    // ✅ Safe lookup without ReferenceError
    const session =
      (global.SESSIONS && global.SESSIONS[token]) ||
      (typeof SESSIONS !== "undefined" && SESSIONS[token]) ||
      null;

    if (!session || !session.userId) {
      return res.status(401).json({ error: "Invalid token" });
    }

    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: "Missing oldPassword or newPassword." });
    }
    if (newPassword.trim().length < 4) {
      return res
        .status(400)
        .json({ error: "New password must be at least 4 characters." });
    }

    const users = loadUsers();
    const user = users.find((u) => u.id === session.userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!verifyPassword(oldPassword, user.passwordHash)) {
      return res.status(401).json({ error: "Incorrect current password" });
    }

    user.passwordHash = hashPassword(newPassword.trim());
    saveUsers(users);

    return res.json({ ok: true });
  } catch (err) {
    console.error("change-password error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// LEGACY MAP ENDPOINT
// POST /api/users/legacy-map { legacyName, userId }
// Creates/updates mapping in data/legacyMap.json
// ---------------------------------------------------------------------------
app.post("/api/users/legacy-map", (req, res) => {
  try {
    const { legacyName, userId } = req.body || {};
    const name = (legacyName || "").trim();
    const uid = (userId || "").trim();

    if (!name || !uid) {
      return res.status(400).json({ error: "legacyName and userId are required." });
    }

    const isReserved = RESERVED_LEGACY_NAMES.some(
      (n) => n.toLowerCase() === name.toLowerCase()
    );
    if (!isReserved) {
      return res.status(400).json({ error: "legacyName must be one of reserved legacy players." });
    }

    const users = loadUsers();
    const user = users.find((u) => u.id === uid);
    if (!user) return res.status(404).json({ error: "userId not found." });

    const legacyMap = loadLegacyMap();
    legacyMap[name] = uid;
    saveLegacyMap(legacyMap);

    return res.json({ ok: true, legacyMap });
  } catch (err) {
    console.error("legacy-map error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// ADMIN RESET PASSWORD
// POST /api/admin/reset-password
// headers: x-admin-key: prem-admin-reset
// body: { username, newPassword }
// ---------------------------------------------------------------------------
app.post("/api/admin/reset-password", (req, res) => {
  try {
    const adminKey = req.headers["x-admin-key"];
    if (adminKey !== "prem-admin-reset") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { username, newPassword } = req.body || {};
    const name = (username || "").trim();
    const pwd = (newPassword || "").trim();
    if (!name || !pwd) {
      return res.status(400).json({ error: "username and newPassword are required." });
    }
    if (pwd.length < 4) {
      return res.status(400).json({ error: "newPassword must be at least 4 characters." });
    }

    const users = loadUsers();
    const idx = users.findIndex((u) => u.username.toLowerCase() === name.toLowerCase());
    if (idx === -1) return res.status(404).json({ error: "User not found." });

    users[idx].passwordHash = hashPassword(pwd);
    users[idx].passwordResetAt = new Date().toISOString();
    saveUsers(users);

    return res.json({ ok: true });
  } catch (err) {
    console.error("admin reset error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// MINI‑LEAGUES (unchanged, backwards‑compatible)
// ---------------------------------------------------------------------------
function generateJoinCode(existingLeagues) {
  const existingCodes = new Set(
    existingLeagues.map((l) => (l.joinCode || l.inviteCode || "").toUpperCase())
  );
  while (true) {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    if (!existingCodes.has(code)) return code;
  }
}

app.get("/api/leagues/my", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const leagues = loadLeagues();

    const myLeagues = leagues
      .map((league) => {
        const members = Array.isArray(league.members)
          ? league.members
          : Array.isArray(league.memberUserIds)
          ? league.memberUserIds
          : [];
        const joinCode = (league.joinCode || league.inviteCode || "").toUpperCase();
        return { raw: league, members, joinCode };
      })
      .filter((w) => w.members.includes(userId))
      .map((w) => ({
        id: w.raw.id,
        name: w.raw.name,
        joinCode: w.joinCode,
        memberCount: w.members.length,
      }));

    return res.json({ leagues: myLeagues });
  } catch (err) {
    console.error("leagues/my error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/league/create", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const name = ((req.body && req.body.name) || "").trim();
    if (!name) return res.status(400).json({ error: "League name is required." });

    const leagues = loadLeagues();
    const joinCode = generateJoinCode(leagues);

    const newLeague = {
      id: "league_" + Date.now().toString(),
      name,
      joinCode,
      inviteCode: joinCode,
      ownerId: userId,
      members: [userId],
      memberUserIds: [userId],
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
    console.error("league/create error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/league/join", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const code = (((req.body && req.body.code) || "")).trim().toUpperCase();
    if (!code) return res.status(400).json({ error: "Invite/join code is required." });

    const leagues = loadLeagues();
    const league = leagues.find((l) => {
      const stored = (l.joinCode || l.inviteCode || "").toUpperCase();
      return stored === code;
    });
    if (!league) return res.status(404).json({ error: "Mini‑league not found." });

    if (!Array.isArray(league.members)) {
      league.members = Array.isArray(league.memberUserIds)
        ? league.memberUserIds.slice()
        : [];
    }
    if (!league.members.includes(userId)) {
      league.members.push(userId);
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
    console.error("league/join error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// PREDICTIONS (cloud sync for all users)
// ---------------------------------------------------------------------------
app.get("/api/predictions/my", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const allPreds = loadPredictions();
    return res.json({ predictions: allPreds[userId] || {} });
  } catch (err) {
    console.error("predictions/my error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/predictions/save", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const { fixtureId, prediction } = req.body || {};
    if (fixtureId === undefined || fixtureId === null) {
      return res.status(400).json({ error: "fixtureId is required." });
    }
    if (!prediction || typeof prediction !== "object") {
      return res.status(400).json({ error: "prediction object is required." });
    }

    const allPreds = loadPredictions();
    if (!allPreds[userId]) allPreds[userId] = {};

    const clean = {
      homeGoals:
        prediction.homeGoals === "" || prediction.homeGoals === null
          ? ""
          : String(prediction.homeGoals),
      awayGoals:
        prediction.awayGoals === "" || prediction.awayGoals === null
          ? ""
          : String(prediction.awayGoals),
      isDouble: !!prediction.isDouble,
      isTriple: !!prediction.isTriple,
    };

    allPreds[userId][fixtureId] = clean;
    savePredictions(allPreds);

    return res.json({ ok: true });
  } catch (err) {
    console.error("predictions/save error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// RESULTS (football-data.org) – proxy
// ---------------------------------------------------------------------------
app.get("/api/results", async (req, res) => {
  try {
    const apiRes = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches",
      {
        headers: { "X-Auth-Token": FOOTBALL_DATA_TOKEN },
      }
    );

    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => "");
      console.error("Football-Data API error:", apiRes.status, errorText);
      return res
        .status(apiRes.status)
        .json({ error: "Football-Data API error", status: apiRes.status });
    }

    const data = await apiRes.json();
    res.json(Array.isArray(data.matches) ? data.matches : []);
  } catch (err) {
    console.error("results error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// ODDS (The Odds API) – proxy
// ---------------------------------------------------------------------------
app.get("/api/odds", async (req, res) => {
  try {
    const url = new URL(
      "https://api.the-odds-api.com/v4/sports/soccer_epl/odds"
    );
    url.searchParams.set("apiKey", ODDS_API_KEY);
    url.searchParams.set("regions", "uk");
    url.searchParams.set("markets", "h2h");
    url.searchParams.set("oddsFormat", "decimal");

    const apiRes = await fetch(url.toString());
    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => "");
      console.error("Odds API error:", apiRes.status, errorText);
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
        if (!homeTeam || !awayTeam || !Array.isArray(event.bookmakers)) return;

        const firstBookmaker = event.bookmakers[0];
        const h2hMarket = firstBookmaker?.markets?.find((m) => m.key === "h2h");
        if (!h2hMarket?.outcomes) return;

        let homeOdds = null, awayOdds = null, drawOdds = null;
        h2hMarket.outcomes.forEach((o) => {
          if (!o?.name) return;
          if (o.name === homeTeam) homeOdds = o.price;
          else if (o.name === awayTeam) awayOdds = o.price;
          else if (String(o.name).toLowerCase() === "draw") drawOdds = o.price;
        });

        if (
          typeof homeOdds === "number" &&
          typeof awayOdds === "number" &&
          typeof drawOdds === "number"
        ) {
          markets.push({ homeTeam, awayTeam, homeOdds, drawOdds, awayOdds });
        }
      });
    }

    res.json(markets);
  } catch (err) {
    console.error("odds error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
