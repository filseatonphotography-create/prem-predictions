const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 5001;

const app = express();

// === TOKENS ===
const FOOTBALL_DATA_TOKEN =
  process.env.FOOTBALL_DATA_TOKEN || "18351cddefba4334a5edb3a60ea84ba3";
const ODDS_API_KEY =
  process.env.ODDS_API_KEY || "72209b9a1ab8337b046a7a1a3996f1bc";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://scintillating-macaron-cfbf04.netlify.app",
  "https://prem-predictions-1.onrender.com",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
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
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const PORT = process.env.PORT || 5001;

const app = express();

// === TOKENS ===
const FOOTBALL_DATA_TOKEN =
  process.env.FOOTBALL_DATA_TOKEN || "18351cddefba4334a5edb3a60ea84ba3";
const ODDS_API_KEY =
  process.env.ODDS_API_KEY || "72209b9a1ab8337b046a7a1a3996f1bc";

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "https://scintillating-macaron-cfbf04.netlify.app",
  "https://prem-predictions-1.onrender.com",
]);

app.use(
  cors({
    origin: (origin, cb) => {
      if (!origin) return cb(null, true);
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
const PREDICTIONS_FILE = path.join(DATA_DIR, "predictions.json");
const LEGACY_MAP_FILE = path.join(DATA_DIR, "legacyMap.json");

const RESERVED_LEGACY_NAMES = ["Tom", "Emma", "Phil", "Steve", "Dave", "Ian", "Anthony"];

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

function loadJson(file, fallback) {
  try {
    if (!fs.existsSync(file)) return fallback;
    const raw = fs.readFileSync(file, "utf8");
    return raw ? JSON.parse(raw) : fallback;
  } catch (e) {
    return fallback;
  }
}
function saveJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

const loadUsers = () => loadJson(USERS_FILE, []);
const saveUsers = (u) => saveJson(USERS_FILE, u);

const loadPredictionsAll = () => loadJson(PREDICTIONS_FILE, {});
const savePredictionsAll = (p) => saveJson(PREDICTIONS_FILE, p);

const loadLegacyMap = () => loadJson(LEGACY_MAP_FILE, {});
const saveLegacyMap = (m) => saveJson(LEGACY_MAP_FILE, m);

// ---------------------------------------------------------------------------
// PASSWORD HASHING (sha256 with salt)
// ---------------------------------------------------------------------------
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const hash = crypto.createHash("sha256").update(salt + password).digest("hex");
  return `${salt}:${hash}`;
}
function verifyPassword(password, passwordHash) {
  const [salt, hash] = String(passwordHash || "").split(":");
  if (!salt || !hash) return false;
  const check = crypto.createHash("sha256").update(salt + password).digest("hex");
  return check === hash;
}

// ---------------------------------------------------------------------------
// SESSIONS (token → user)
// ---------------------------------------------------------------------------
const sessions = new Map();

function createSession(user) {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { id: user.id, username: user.username });
  return token;
}

function authMiddleware(req, res, next) {
  const auth = req.headers.authorization || "";
  const token = auth.replace("Bearer ", "").trim();

  const session = sessions.get(token);
  if (!session) return res.status(401).json({ error: "Not authorized" });

  req.user = session;
  next();
}

// ---------------------------------------------------------------------------
// SIGNUP
// ---------------------------------------------------------------------------
app.post("/api/signup", (req, res) => {
  try {
    const { username, password } = req.body;
    const name = (username || "").trim();
    const pwd = (password || "").trim();

    if (!name || !pwd) return res.status(400).json({ error: "Missing fields" });
    if (pwd.length < 4) return res.status(400).json({ error: "Password too short" });

    const users = loadUsers();
    const existing = users.find((u) => u.username.toLowerCase() === name.toLowerCase());
    if (existing) return res.status(400).json({ error: "Username taken" });

    const legacyMap = loadLegacyMap();

    const isLegacy = RESERVED_LEGACY_NAMES.some(
      (n) => n.toLowerCase() === name.toLowerCase()
    );

    if (isLegacy) {
      const alreadyClaimed = Object.keys(legacyMap).some(
        (n) => n.toLowerCase() === name.toLowerCase()
      );
      if (alreadyClaimed)
        return res.status(400).json({ error: "Legacy name already claimed" });
    }

    const newUser = {
      id: Date.now().toString(),
      username: name,
      passwordHash: hashPassword(pwd),
    };

    users.push(newUser);
    saveUsers(users);

    if (isLegacy) {
      const canonical = RESERVED_LEGACY_NAMES.find(
        (n) => n.toLowerCase() === name.toLowerCase()
      );
      legacyMap[canonical] = newUser.id;
      saveLegacyMap(legacyMap);
    }

    const token = createSession(newUser);
    return res.json({ userId: newUser.id, username: newUser.username, token });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// LOGIN
// ---------------------------------------------------------------------------
app.post("/api/login", (req, res) => {
  try {
    const { username, password } = req.body;
    const name = (username || "").trim();
    const pwd = (password || "").trim();

    const users = loadUsers();
    const user = users.find((u) => u.username.toLowerCase() === name.toLowerCase());
    if (!user) return res.status(401).json({ error: "Incorrect login" });
    if (!verifyPassword(pwd, user.passwordHash))
      return res.status(401).json({ error: "Incorrect login" });

    const legacyMap = loadLegacyMap();

    if (RESERVED_LEGACY_NAMES.includes(user.username) && !legacyMap[user.username]) {
      legacyMap[user.username] = user.id;
      saveLegacyMap(legacyMap);
    }

    const token = createSession(user);
    return res.json({ userId: user.id, username: user.username, token });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// CHANGE PASSWORD
// ---------------------------------------------------------------------------
app.post("/api/change-password", authMiddleware, (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ error: "Missing fields" });

    const users = loadUsers();
    const user = users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found" });

    if (!verifyPassword(oldPassword, user.passwordHash))
      return res.status(401).json({ error: "Incorrect old password" });

    user.passwordHash = hashPassword(newPassword);
    saveUsers(users);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// PREDICTIONS
// ---------------------------------------------------------------------------
app.get("/api/predictions/my", authMiddleware, (req, res) => {
  try {
    const all = loadPredictionsAll();
    res.json(all[req.user.id] || {});
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

app.post("/api/predictions/save", authMiddleware, (req, res) => {
  try {
    const { fixtureId, prediction } = req.body;

    const all = loadPredictionsAll();
    if (!all[req.user.id]) all[req.user.id] = {};
    all[req.user.id][fixtureId] = prediction;
    savePredictionsAll(all);

    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// ADMIN RESET
// ---------------------------------------------------------------------------
app.post("/api/admin/reset-password", (req, res) => {
  if (req.headers["x-admin-key"] !== "prem-admin-reset")
    return res.status(403).json({ error: "Invalid admin key" });

  const { username, newPassword } = req.body;
  if (!username || !newPassword)
    return res.status(400).json({ error: "Missing fields" });

  const users = loadUsers();
  const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
  if (!user) return res.status(404).json({ error: "User not found" });

  user.passwordHash = hashPassword(newPassword);
  saveUsers(users);

  res.json({ ok: true });
});

// ---------------------------------------------------------------------------
// FOOTBALL DATA RESULTS
// ---------------------------------------------------------------------------
app.get("/api/results", async (req, res) => {
  try {
    const url = "https://api.football-data.org/v4/competitions/PL/matches";
    const apiRes = await fetch(url, {
      headers: { "X-Auth-Token": FOOTBALL_DATA_TOKEN },
    });

    const data = await apiRes.json();
    res.json(Array.isArray(data.matches) ? data.matches : []);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// ODDS
// ---------------------------------------------------------------------------
app.get("/api/odds", async (req, res) => {
  try {
    const url =
      "https://api.the-odds-api.com/v4/sports/soccer_epl/odds" +
      `?apiKey=${ODDS_API_KEY}&regions=uk&markets=h2h&oddsFormat=decimal`;

    const apiRes = await fetch(url);
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
      const draw = outcomes.find((o) => String(o.name).toLowerCase() === "draw")?.price;

      if (home && away && draw)
        markets.push({ homeTeam, awayTeam, homeOdds: home, drawOdds: draw, awayOdds: away });
    }

    res.json(markets);
  } catch (e) {
    res.status(500).json({ error: "Server error" });
  }
});

// ---------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});