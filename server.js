const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const BUILD_ID = "2025-11-22-a";
console.log("SERVER BUILD:", BUILD_ID);

const PORT = process.env.PORT || 5001;

const app = express();
// === TOKENS ===
// Keep real in deployed code (do NOT share publicly).
const FOOTBALL_DATA_TOKEN =
  process.env.FOOTBALL_DATA_TOKEN || "18351cddefba4334a5edb3a60ea84ba3";
const ODDS_API_KEY =
  process.env.ODDS_API_KEY || "72209b9a1ab8337b046a7a1a3996f1bc";

// ---------------------------------------------------------------------------
// CORS (allow Netlify + localhost + Render backend)
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",

  // Your Netlify live site
  "https://scintillating-macaron-cfbf04.netlify.app",

  // Netlify branch deploys
  "https://main--scintillating-macaron-cfbf04.netlify.app",
  "https://deploy-preview--scintillating-macaron-cfbf04.netlify.app",

  // Render backend
  "https://prem-predictions-1.onrender.com",
  "https://prem-predictions-p9fy.onrender.com",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
      console.log("CORS request from:", origin);
      if (ALLOWED_ORIGINS.has(origin)) return cb(null, true);
      return cb(new Error("Not allowed by CORS: " + origin));
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
const TOTALS_FILE = path.join(DATA_DIR, "totals.json");
const LEGACY_MAP_FILE = path.join(DATA_DIR, "legacyMap.json");

const RESERVED_LEGACY_NAMES = [
  "Tom",
  "Emma",
  "Phil",
  "Steve",
  "Dave",
  "Ian",
  "Anthony",
];

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

// ---------------------------------------------------------------------------
// HELPERS: PASSWORD HASHING (pbkdf2)
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
  if (!salt || !hash) return false;

  // --- Legacy SHA256 format (hash length 64 hex chars) ---
  if (hash.length === 64) {
    const legacyCheck = crypto
      .createHash("sha256")
      .update(salt + password)
      .digest("hex");
    return legacyCheck === hash;
  }

  // --- Current PBKDF2 format ---
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

// Predictions (userId -> { fixtureId -> prediction })
const loadPredictions = () => loadJson(PREDICTIONS_FILE, {});
const savePredictions = (preds) => saveJson(PREDICTIONS_FILE, preds);
// Totals/history (leagueId -> { weeklyTotals, leagueTotals, updatedAt })
const loadTotals = () => loadJson(TOTALS_FILE, {});
const saveTotals = (t) => saveJson(TOTALS_FILE, t);
// Legacy map (legacyName -> userId)
const loadLegacyMap = () => loadJson(LEGACY_MAP_FILE, {});
const saveLegacyMap = (m) => saveJson(LEGACY_MAP_FILE, m);

// Leagues (backwards compatible)
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

// ---------------------------------------------------------------------------
// TOKENS (stateless, survive restarts)
// token format: userId.nonce.signature
// ---------------------------------------------------------------------------
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-secret-change-me";

function createToken(userId) {
  const nonce = crypto.randomBytes(16).toString("hex");
  const sig = crypto
    .createHash("sha256")
    .update(`${userId}:${nonce}:${SESSION_SECRET}`)
    .digest("hex");
  return `${userId}.${nonce}.${sig}`;
}

function verifyToken(token) {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [userId, nonce, sig] = parts;

  const expected = crypto
    .createHash("sha256")
    .update(`${userId}:${nonce}:${SESSION_SECRET}`)
    .digest("hex");

  if (expected !== sig) return null;
  return { id: userId };
}

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  const data = verifyToken(token);
  if (!data) return res.status(401).json({ error: "Unauthorized" });

  const users = loadUsers();
  const user = users.find((u) => u.id === data.id);
  if (!user) return res.status(401).json({ error: "Unauthorized" });

  req.user = { id: user.id, username: user.username };
  next();
}

// ---------------------------------------------------------------------------
// HEALTH
// ---------------------------------------------------------------------------
app.get("/", (req, res) => res.send("Backend is running"));

// ---------------------------------------------------------------------------
// AUTH: SIGNUP
// - allows reserved legacy names ONLY if unclaimed
// ---------------------------------------------------------------------------
app.post("/api/signup", (req, res) => {
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
        .json({ error: "Password must be at least 4 characters." });
    }

    const users = loadUsers();
    if (users.find((u) => u.username.toLowerCase() === name.toLowerCase())) {
      return res.status(400).json({ error: "That username is already taken." });
    }

    const legacyMap = loadLegacyMap();
    const isLegacy = RESERVED_LEGACY_NAMES.some(
      (n) => n.toLowerCase() === name.toLowerCase()
    );

    // If trying to register a legacy name, allow ONLY if unclaimed.
    if (isLegacy) {
      const canonical = RESERVED_LEGACY_NAMES.find(
        (n) => n.toLowerCase() === name.toLowerCase()
      );
      if (legacyMap[canonical]) {
        return res.status(400).json({
          error:
            "That legacy name is reserved and already claimed. Please choose another username.",
        });
      }
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
    if (isLegacy) {
      const canonical = RESERVED_LEGACY_NAMES.find(
        (n) => n.toLowerCase() === name.toLowerCase()
      );
      legacyMap[canonical] = newUser.id;
      saveLegacyMap(legacyMap);
      console.log(`Auto legacy-claimed on signup ${canonical} -> ${newUser.id}`);
    }

    const token = createToken(newUser.id);
    return res.json({ userId: newUser.id, username: newUser.username, token });
  } catch (err) {
    console.error("signup error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// AUTH: LOGIN
// - auto legacy-map on first successful legacy login
// ---------------------------------------------------------------------------
app.post("/api/login", (req, res) => {
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

    if (!verifyPassword(pwd, user.passwordHash)) {
      return res.status(401).json({ error: "Incorrect username or password." });
    }

    // Auto legacy-map if they log in with exact legacy username
    const legacyMap = loadLegacyMap();
    if (
      RESERVED_LEGACY_NAMES.includes(user.username) &&
      !legacyMap[user.username]
    ) {
      legacyMap[user.username] = user.id;
      saveLegacyMap(legacyMap);
      console.log(`Auto legacy-mapped ${user.username} -> ${user.id}`);
    }

    const token = createToken(user.id);
return res.json({ userId: user.id, username: user.username, token });
  } catch (err) {
    console.error("login error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// CHANGE PASSWORD (must be logged in)
// POST /api/change-password { oldPassword, newPassword }
// ---------------------------------------------------------------------------
app.post("/api/change-password", authMiddleware, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body || {};
    if (!oldPassword || !newPassword) {
      return res
        .status(400)
        .json({ error: "Missing oldPassword or newPassword." });
    }
    if (newPassword.trim().length < 4) {
      return res
        .status(400)
        .json({ error: "New password must be at least 4 characters." });
    }

    const users = loadUsers();
    const user = users.find((u) => u.id === req.user.id);
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
// LEGACY MAP ENDPOINT (manual override if needed)
// POST /api/users/legacy-map { legacyName, userId }
// ---------------------------------------------------------------------------
app.post("/api/users/legacy-map", authMiddleware, (req, res) => {
  try {
    const { legacyName, userId } = req.body || {};
    const name = (legacyName || "").trim();
    const uid = (userId || "").trim();

    if (!name || !uid) {
      return res
        .status(400)
        .json({ error: "legacyName and userId are required." });
    }

    const isReserved = RESERVED_LEGACY_NAMES.some(
      (n) => n.toLowerCase() === name.toLowerCase()
    );
    if (!isReserved) {
      return res.status(400).json({
        error: "legacyName must be one of reserved legacy players.",
      });
    }

    const users = loadUsers();
    if (!users.find((u) => u.id === uid)) {
      return res.status(404).json({ error: "userId not found." });
    }

    const legacyMap = loadLegacyMap();
    const canonical = RESERVED_LEGACY_NAMES.find(
      (n) => n.toLowerCase() === name.toLowerCase()
    );
    legacyMap[canonical] = uid;
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
      return res
        .status(400)
        .json({ error: "username and newPassword are required." });
    }
    if (pwd.length < 4) {
      return res
        .status(400)
        .json({ error: "newPassword must be at least 4 characters." });
    }

    const users = loadUsers();
    const idx = users.findIndex(
      (u) => u.username.toLowerCase() === name.toLowerCase()
    );
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
// MINI-LEAGUES
// ---------------------------------------------------------------------------
function generateJoinCode(existingLeagues) {
  const existingCodes = new Set(
    existingLeagues.map((l) =>
      (l.joinCode || l.inviteCode || "").toUpperCase()
    )
  );
  while (true) {
    const code = Math.random()
      .toString(36)
      .substring(2, 8)
      .toUpperCase();
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
    if (!code)
      return res.status(400).json({ error: "Invite/join code is required." });

    const leagues = loadLeagues();
    const league = leagues.find((l) => {
      const stored = (l.joinCode || l.inviteCode || "").toUpperCase();
      return stored === code;
    });

    if (!league) return res.status(404).json({ error: "Mini-league not found." });

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
// PREDICTIONS (cloud sync)
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
// PREDICTIONS (league-wide fetch for automated scoring)
// GET /api/predictions/league/:leagueId
// Returns predictions for every member in that league
// ---------------------------------------------------------------------------
app.get("/api/predictions/league/:leagueId", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const leagueId = (req.params.leagueId || "").trim();

    const leagues = loadLeagues();
    const league = leagues.find((l) => l.id === leagueId);

    if (!league) {
      return res.status(404).json({ error: "Mini-league not found." });
    }

    const members = Array.isArray(league.members)
      ? league.members
      : Array.isArray(league.memberUserIds)
      ? league.memberUserIds
      : [];

    // only members can fetch league predictions
    if (!members.includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const allPreds = loadPredictions();
    const users = loadUsers();

    const usersInLeague = members
      .map((id) => users.find((u) => u.id === id))
      .filter(Boolean)
      .map((u) => ({ userId: u.id, username: u.username }));

    const predictionsByUserId = {};
    members.forEach((mid) => {
      predictionsByUserId[mid] = allPreds[mid] || {};
    });

    return res.json({
      leagueId,
      users: usersInLeague,
      predictionsByUserId,
    });
  } catch (err) {
    console.error("predictions/league error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// TOTALS (computed weekly totals + league totals, synced from frontend)
// ---------------------------------------------------------------------------
app.get("/api/totals/league/:leagueId", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const leagueId = (req.params.leagueId || "").trim();

    const leagues = loadLeagues();
    const league = leagues.find((l) => l.id === leagueId);
    if (!league) return res.status(404).json({ error: "Mini-league not found." });

    const members = Array.isArray(league.members)
      ? league.members
      : Array.isArray(league.memberUserIds)
      ? league.memberUserIds
      : [];

    if (!members.includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const totals = loadTotals();
    return res.json(totals[leagueId] || null);
  } catch (err) {
    console.error("totals/league get error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/totals/league/:leagueId", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const leagueId = (req.params.leagueId || "").trim();
    const { weeklyTotals, leagueTotals } = req.body || {};

    const leagues = loadLeagues();
    const league = leagues.find((l) => l.id === leagueId);
    if (!league) return res.status(404).json({ error: "Mini-league not found." });

    const members = Array.isArray(league.members)
      ? league.members
      : Array.isArray(league.memberUserIds)
      ? league.memberUserIds
      : [];

    if (!members.includes(userId)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const totals = loadTotals();
    totals[leagueId] = {
      weeklyTotals: weeklyTotals || {},
      leagueTotals: leagueTotals || {},
      updatedAt: new Date().toISOString(),
    };
    saveTotals(totals);

    return res.json({ ok: true });
  } catch (err) {
    console.error("totals/league save error", err);
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
      { headers: { "X-Auth-Token": FOOTBALL_DATA_TOKEN } }
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
    const url =
      "https://api.the-odds-api.com/v4/sports/soccer_epl/odds" +
      `?apiKey=${ODDS_API_KEY}&regions=uk&markets=h2h&oddsFormat=decimal`;

    const apiRes = await fetch(url);
    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => "");
      console.error("Odds API error:", apiRes.status, errorText);
      return res
        .status(apiRes.status)
        .json({ error: "The Odds API error", status: apiRes.status });
    }

    const data = await apiRes.json();
    if (!Array.isArray(data)) return res.json([]);

    const markets = [];
    for (const event of data) {
      const homeTeam = event.home_team;
      const awayTeam = event.away_team;
      if (!homeTeam || !awayTeam) continue;

      const bm = event.bookmakers?.[0];
      const h2h = bm?.markets?.find((m) => m.key === "h2h");
      const outcomes = h2h?.outcomes;
      if (!outcomes) continue;

      const home = outcomes.find((o) => o.name === homeTeam)?.price;
      const away = outcomes.find((o) => o.name === awayTeam)?.price;
      const draw = outcomes.find(
        (o) => String(o.name).toLowerCase() === "draw"
      )?.price;

      if (home && away && draw) {
        markets.push({
          homeTeam,
          awayTeam,
          homeOdds: home,
          drawOdds: draw,
          awayOdds: away,
        });
      }
    }

    res.json(markets);
  } catch (err) {
    console.error("odds error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});