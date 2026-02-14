
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const webpush = require("web-push");

const BUILD_ID = "2025-11-22-a";
console.log("SERVER BUILD:", BUILD_ID);

const PORT = process.env.PORT || 5001;

const app = express();

// GET /api/coins/user/:userId?gameweek=GW
// Returns coins state for any user (read-only, no auth restrictions)
app.get("/api/coins/user/:userId", (req, res) => {
  const { userId } = req.params;
  const gw = req.query.gameweek;
  if (!userId || !gw) {
    return res.status(400).json({ error: "Missing userId or gameweek" });
  }
  const coins = loadCoins();
  const userCoins = coins[userId] || {};
  const bets = userCoins[gw] || {};
  let used = 0;
  if (bets && typeof bets === "object") {
    Object.values(bets).forEach((bet) => {
      if (bet && bet.stake) used += Number(bet.stake) || 0;
    });
  }
  res.json({
    gameweek: gw,
    used,
    remaining: 10 - used,
    bets,
    loading: false,
    error: "",
  });
});

// ...existing code...
// === TOKENS ===
// Keep real in deployed code (do NOT share publicly).
const FOOTBALL_DATA_TOKEN =
  process.env.FOOTBALL_DATA_TOKEN || "18351cddefba4334a5edb3a60ea84ba3";
const ODDS_API_KEY =
  process.env.ODDS_API_KEY || "6659ed614cb33000eca5166d4bfc9bd3";

// ---------------------------------------------------------------------------
// CORS (allow Netlify + localhost + custom domain + Render backend)
// ---------------------------------------------------------------------------

const ALLOWED_ORIGINS = new Set([
  "http://localhost:3000",
  "http://localhost:3001", // Added for local frontend dev

  // Netlify live + branch deploys (old URLs, fine to keep)
  "https://scintillating-macaron-cfbf04.netlify.app",
  "https://main--scintillating-macaron-cfbf04.netlify.app",
  "https://deploy-preview--scintillating-macaron-cfbf04.netlify.app",

  // Current Netlify site
  "https://predictionaddiction.netlify.app",

  // New custom domain (frontend)
  "https://predictionaddiction.net",
  "https://www.predictionaddiction.net",

  // Render backend (not strictly needed as origins, but harmless)
  "https://prem-predictions-1.onrender.com",
  "https://prem-predictions-p9fy.onrender.com",
  "https://predictionaddiction-backend.onrender.com",
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
// AVATAR ENDPOINTS
// ---------------------------------------------------------------------------

// Get current user's avatar
app.get("/api/avatar/me", authMiddleware, (req, res) => {
  const userId = req.user.id;
  const avatars = loadAvatars();
  const avatar = avatars[userId] || {};
  res.json(avatar);
});

// Set current user's avatar
app.post("/api/avatar/me", authMiddleware, (req, res) => {
  const userId = req.user.id;
  const { seed, style } = req.body || {};
  if (!seed || !style) {
    return res.status(400).json({ error: "Missing seed or style" });
  }
  const avatars = loadAvatars();
  avatars[userId] = { seed, style };
  saveAvatars(avatars);
  res.json({ ok: true });
});

// Get all users' avatars
app.get("/api/avatar/all", authMiddleware, (req, res) => {
  const avatars = loadAvatars();
  res.json(avatars);
});
// ---------------------------------------------------------------------------
const DATA_DIR = path.join(__dirname, "data");
const AVATARS_FILE = path.join(DATA_DIR, "avatars.json");
const FIXTURES_SRC_FILE = path.join(__dirname, "src", "fixtures.js");

// Avatars (userId -> { seed, style })
const loadAvatars = () => loadJson(AVATARS_FILE, {});
const saveAvatars = (avatars) => saveJson(AVATARS_FILE, avatars);

function loadFixturesFromSrc() {
  try {
    const raw = fs.readFileSync(FIXTURES_SRC_FILE, "utf8");
    const start = raw.indexOf("[");
    const end = raw.lastIndexOf("]");
    if (start === -1 || end === -1) return [];
    const json = raw.slice(start, end + 1);
    return JSON.parse(json);
  } catch {
    return [];
  }
}
const USERS_FILE = path.join(DATA_DIR, "users.json");
const LEAGUES_FILE = path.join(DATA_DIR, "leagues.json");
const PREDICTIONS_FILE = path.join(DATA_DIR, "predictions.json");
const TOTALS_FILE = path.join(DATA_DIR, "totals.json");
const LEGACY_MAP_FILE = path.join(DATA_DIR, "legacyMap.json");
const COINS_FILE = path.join(DATA_DIR, "coins.json");
const RESULTS_FILE = path.join(DATA_DIR, "results.json");
const PUSH_SUBSCRIPTIONS_FILE = path.join(DATA_DIR, "pushSubscriptions.json");
const PASSWORD_RESET_TOKENS_FILE = path.join(DATA_DIR, "passwordResetTokens.json");

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
// WEB PUSH SETUP (VAPID keys - generate with: npx web-push generate-vapid-keys)
// ---------------------------------------------------------------------------
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || "BIowbyO7WYuga5mbOyaSvr4OMiYjDCgciHLG-X4FzbWm-vurV_c0jnhQRR8PwDnv0NWToJnRCeIT48XTU6FOcVk";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "fbebmrHlN1imtHPv2cpsmQ2HRI6bMZ5hdvgNi0ZInX4";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:admin@predictionaddiction.net";

webpush.setVapidDetails(
  VAPID_SUBJECT,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY
);

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

function normalizeEmail(email) {
  return (email || "").trim().toLowerCase();
}

function isValidEmail(email) {
  const e = normalizeEmail(email);
  if (!e) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function hashResetToken(token) {
  return crypto.createHash("sha256").update(String(token || "")).digest("hex");
}

function createResetToken() {
  return crypto.randomBytes(32).toString("hex");
}

function getResetBaseUrl() {
  return (
    process.env.PASSWORD_RESET_BASE_URL ||
    process.env.FRONTEND_URL ||
    "http://localhost:3000"
  );
}

async function sendPasswordResetEmail({ toEmail, username, resetLink }) {
  const apiKey = process.env.RESEND_API_KEY;
  const fromEmail = process.env.RESET_FROM_EMAIL;
  if (!apiKey || !fromEmail) return false;

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        subject: "Reset your Prediction Addiction password",
        html: `<p>Hi ${username || ""},</p><p>Click the link below to reset your password. It expires in 30 minutes.</p><p><a href="${resetLink}">${resetLink}</a></p><p>If you did not request this, you can ignore this email.</p>`,
      }),
    });
    return res.ok;
  } catch (err) {
    console.error("send reset email error", err);
    return false;
  }
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
const loadUsers = () => {
  const users = loadJson(USERS_FILE, []);
  return users;
};
const saveUsers = (users) => saveJson(USERS_FILE, users);
const loadPasswordResetTokens = () => loadJson(PASSWORD_RESET_TOKENS_FILE, []);
const savePasswordResetTokens = (tokens) =>
  saveJson(PASSWORD_RESET_TOKENS_FILE, Array.isArray(tokens) ? tokens : []);

// Predictions (userId -> { fixtureId -> prediction })
const loadPredictions = () => loadJson(PREDICTIONS_FILE, {});
const savePredictions = (preds) => saveJson(PREDICTIONS_FILE, preds);

// Totals/history (leagueId -> { weeklyTotals, leagueTotals, updatedAt })
const loadTotals = () => loadJson(TOTALS_FILE, {});
const saveTotals = (t) => saveJson(TOTALS_FILE, t);

// Legacy map (legacyName -> userId)
const loadLegacyMap = () => loadJson(LEGACY_MAP_FILE, {});
const saveLegacyMap = (m) => saveJson(LEGACY_MAP_FILE, m);

// Coins game (userId -> { [gameweek]: { ...bets }, totals: {...} })
const loadCoins = () => loadJson(COINS_FILE, {});
const saveCoins = (coins) => saveJson(COINS_FILE, coins);
// Results (for coins leaderboard)
const loadResults = () => loadJson(RESULTS_FILE, {});
const saveResults = (results) => saveJson(RESULTS_FILE, results || {});

let resultsCache = null;
let resultsCacheAt = 0;
const RESULTS_CACHE_TTL_MS = 5 * 60 * 1000;

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

// --- TEAM NAME NORMALISATION (match frontend logic) ---
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

  return s;
}

// --- BASIC RESULT HELPER (match frontend logic) ---
function getResult(home, away) {
  if (home > away) return "H";
  if (home < away) return "A";
  return "D";
}

function getPredictionPoints(prediction, result) {
  if (!prediction || !result) return 0;

  const ph = Number(prediction.homeGoals);
  const pa = Number(prediction.awayGoals);
  const rh = Number(result.homeGoals);
  const ra = Number(result.awayGoals);

  if ([ph, pa, rh, ra].some((n) => !Number.isFinite(n))) return 0;

  let points = 0;
  if (ph === rh && pa === ra) {
    points = 7;
  } else {
    const predRes = getResult(ph, pa);
    const realRes = getResult(rh, ra);
    if (predRes === realRes && ph - pa === rh - ra) points = 4;
    else if (predRes === realRes) points = 2;
  }

  if (prediction.isTriple) points *= 3;
  else if (prediction.isDouble) points *= 2;

  return points;
}

// --- COINS: compute season totals for ONE user ---
// coinsForUser: { [gameweekKey]: { [fixtureId]: bet } }
// resultsByFixtureId: { [fixtureId]: { homeGoals, awayGoals } }
function computeSeasonCoinsForUser(coinsForUser, resultsByFixtureId) {
  const gwObj = coinsForUser || {};
  const results = resultsByFixtureId || {};

  let totalStake = 0;
  let totalReturn = 0;

  Object.values(gwObj).forEach((fixObj) => {
    if (!fixObj || typeof fixObj !== "object") return;

    Object.values(fixObj).forEach((bet) => {
      if (!bet) return;

      const { fixtureId, stake, side, oddsSnapshot } = bet || {};
      if (!Number.isFinite(stake) || stake <= 0) return;

      // Always count stake as "coins used"
      totalStake += stake;

      // Only try to compute winnings if we have a result
      const res = results[fixtureId];
      if (!res) return;

      const hg = Number(res.homeGoals);
      const ag = Number(res.awayGoals);
      if (!Number.isFinite(hg) || !Number.isFinite(ag)) return;

      const resultSide = getResult(hg, ag); // "H", "D", or "A"

      if (side === resultSide && oddsSnapshot) {
        const price =
          resultSide === "H"
            ? oddsSnapshot.home
            : resultSide === "D"
            ? oddsSnapshot.draw
            : oddsSnapshot.away;

        if (typeof price === "number") {
          totalReturn += stake * price;
        }
      }
    });
  });

  const profit = totalReturn - totalStake;

  return {
    totalStake,
    totalReturn,
    profit,
  };
}

function authOptional(req, res, next) {
  const authHeader = req.headers.authorization || "";
  const token = authHeader.replace("Bearer ", "").trim();

  if (!token) {
    req.user = null;
    return next();
  }

  const data = verifyToken(token);
  if (!data) {
    req.user = null;
    return next();
  }

  const users = loadUsers();
  const user = users.find((u) => u.id === data.id);
  if (!user) {
    req.user = null;
    return next();
  }

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
    const { username, password, email, favoriteTeam } = req.body || {};
    const name = (username || "").trim();
    const pwd = (password || "").trim();
    const normalizedEmail = normalizeEmail(email);
    const favTeam = (favoriteTeam || "").trim();

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
    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: "A valid email address is required." });
    }
    if (users.some((u) => normalizeEmail(u.email) === normalizedEmail)) {
      return res.status(400).json({ error: "That email is already in use." });
    }
    if (!favTeam) {
      return res.status(400).json({ error: "Please select your favourite team." });
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
      id: crypto.randomUUID(),
      username: name,
      passwordHash: hashPassword(pwd),
      email: normalizedEmail,
      favoriteTeam: favTeam,
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
// ...existing code...
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

    // Temporary overrides: allow some plain-text dev passwords locally
    const isSteveOverride =
      user.username.toLowerCase() === "steve" && pwd === "Steve1234";

    const isPhilOverride =
      user.username.toLowerCase() === "phil" && pwd === "phil";

    // Local dev override: when NOT running on Render, allow any user
    // to log in with password "dev" so you can test locally
    const isLocalDevOverride = !process.env.RENDER && pwd === "dev";

    if (
      !isLocalDevOverride &&
      !isSteveOverride &&
      !isPhilOverride &&
      !verifyPassword(pwd, user.passwordHash)
    ) {
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

app.get("/api/account/me", authMiddleware, (req, res) => {
  try {
    const users = loadUsers();
    const user = users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });
    return res.json({
      userId: user.id,
      username: user.username,
      email: user.email || "",
      favoriteTeam: user.favoriteTeam || "",
    });
  } catch (err) {
    console.error("account/me error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/account/email", authMiddleware, (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!isValidEmail(email)) {
      return res.status(400).json({ error: "Valid email is required." });
    }

    const users = loadUsers();
    const user = users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    const taken = users.some(
      (u) => u.id !== user.id && normalizeEmail(u.email) === email
    );
    if (taken) {
      return res.status(400).json({ error: "That email is already in use." });
    }

    user.email = email;
    saveUsers(users);
    return res.json({ ok: true, email });
  } catch (err) {
    console.error("account/email error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/account/favorite-team", authMiddleware, (req, res) => {
  try {
    const favoriteTeam = (req.body?.favoriteTeam || "").trim();
    if (!favoriteTeam) {
      return res.status(400).json({ error: "Favourite team is required." });
    }

    const users = loadUsers();
    const user = users.find((u) => u.id === req.user.id);
    if (!user) return res.status(404).json({ error: "User not found." });

    user.favoriteTeam = favoriteTeam;
    saveUsers(users);
    return res.json({ ok: true, favoriteTeam });
  } catch (err) {
    console.error("account/favorite-team error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/account/favorite-team/all", authMiddleware, (req, res) => {
  try {
    const users = loadUsers() || [];
    const favoriteTeams = {};
    users.forEach((u) => {
      if (!u || !u.id) return;
      favoriteTeams[String(u.id)] = (u.favoriteTeam || "").trim();
    });
    return res.json({ favoriteTeams });
  } catch (err) {
    console.error("account/favorite-team/all error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/password/forgot", async (req, res) => {
  try {
    const username = (req.body?.username || "").trim();
    const email = normalizeEmail(req.body?.email);
    const genericResponse = {
      ok: true,
      message:
        "If your username and email match an account, a reset link has been sent.",
    };

    if (!username || !email) return res.json(genericResponse);
    if (!isValidEmail(email)) return res.json(genericResponse);

    const users = loadUsers();
    const user = users.find(
      (u) =>
        (u.username || "").toLowerCase() === username.toLowerCase() &&
        normalizeEmail(u.email) === email &&
        typeof u.passwordHash === "string" &&
        u.passwordHash.length > 0
    );
    if (!user) return res.json(genericResponse);

    const now = Date.now();
    const ttlMs = 30 * 60 * 1000;
    const token = createResetToken();
    const tokenHash = hashResetToken(token);
    const expiresAt = new Date(now + ttlMs).toISOString();

    const existing = loadPasswordResetTokens().filter((t) => {
      if (!t || !t.expiresAt) return false;
      return Date.parse(t.expiresAt) > now && !t.usedAt;
    });
    existing.push({
      tokenHash,
      userId: user.id,
      createdAt: new Date(now).toISOString(),
      expiresAt,
      usedAt: null,
    });
    savePasswordResetTokens(existing);

    const resetLink = `${getResetBaseUrl().replace(/\/$/, "")}/reset-password?resetToken=${encodeURIComponent(token)}`;
    const emailSent = await sendPasswordResetEmail({
      toEmail: email,
      username: user.username,
      resetLink,
    });

    if (!emailSent) {
      console.log("[password/forgot] reset link (email not configured or failed):", {
        username: user.username,
        email,
        resetLink,
      });
    }

    if (!process.env.RENDER) {
      return res.json({
        ...genericResponse,
        resetLink,
        emailSent,
      });
    }

    return res.json(genericResponse);
  } catch (err) {
    console.error("password/forgot error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/password/reset", (req, res) => {
  try {
    const token = (req.body?.token || "").trim();
    const newPassword = (req.body?.newPassword || "").trim();
    if (!token || !newPassword) {
      return res.status(400).json({ error: "Token and newPassword are required." });
    }
    if (newPassword.length < 4) {
      return res.status(400).json({ error: "Password must be at least 4 characters." });
    }

    const now = Date.now();
    const tokenHash = hashResetToken(token);
    const tokens = loadPasswordResetTokens().filter((t) => {
      if (!t || !t.expiresAt) return false;
      return Date.parse(t.expiresAt) > now;
    });

    const tokenRow = tokens.find((t) => t.tokenHash === tokenHash && !t.usedAt);
    if (!tokenRow) {
      return res.status(400).json({ error: "Invalid or expired reset token." });
    }

    const users = loadUsers();
    const user = users.find((u) => u.id === tokenRow.userId);
    if (!user) {
      return res.status(400).json({ error: "Invalid reset request." });
    }

    user.passwordHash = hashPassword(newPassword);
    user.passwordResetAt = new Date().toISOString();
    saveUsers(users);

    tokens.forEach((t) => {
      if (t.userId === user.id || t.tokenHash === tokenHash) {
        t.usedAt = new Date().toISOString();
      }
    });
    savePasswordResetTokens(tokens);

    return res.json({ ok: true });
  } catch (err) {
    console.error("password/reset error", err);
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

app.get("/api/leagues/leaderboard", authMiddleware, (req, res) => {
  try {
    const leagues = loadLeagues();
    const predictionsByUserId = loadPredictions();
    const resultsByFixtureId = loadResults();
    const fixtures = loadFixturesFromSrc();

    const completedFixtureIds = fixtures
      .map((fx) => fx.id)
      .filter((fixtureId) => {
        const r = resultsByFixtureId[fixtureId] || resultsByFixtureId[String(fixtureId)];
        const hg = Number(r?.homeGoals);
        const ag = Number(r?.awayGoals);
        return Number.isFinite(hg) && Number.isFinite(ag);
      });

    const leaderboard = leagues.map((league) => {
      const members = Array.isArray(league.members)
        ? league.members
        : Array.isArray(league.memberUserIds)
        ? league.memberUserIds
        : [];

      let totalPoints = 0;
      members.forEach((userId) => {
        const userPreds = predictionsByUserId[userId] || {};
        let userPoints = 0;

        completedFixtureIds.forEach((fixtureId) => {
          const pred =
            userPreds[String(fixtureId)] !== undefined
              ? userPreds[String(fixtureId)]
              : userPreds[fixtureId];
          if (!pred) return;

          const res =
            resultsByFixtureId[String(fixtureId)] !== undefined
              ? resultsByFixtureId[String(fixtureId)]
              : resultsByFixtureId[fixtureId];
          userPoints += getPredictionPoints(pred, res);
        });

        totalPoints += userPoints;
      });

      const memberCount = members.length;
      const averagePoints = memberCount > 0 ? totalPoints / memberCount : 0;
      const joinCode = (league.joinCode || league.inviteCode || "").toUpperCase();

      return {
        leagueId: league.id,
        leagueName: league.name || joinCode || "Mini-league",
        joinCode,
        memberCount,
        totalPoints,
        averagePoints,
      };
    });

    leaderboard.sort((a, b) => {
      if (b.averagePoints !== a.averagePoints) return b.averagePoints - a.averagePoints;
      if (b.totalPoints !== a.totalPoints) return b.totalPoints - a.totalPoints;
      return a.leagueName.localeCompare(b.leagueName);
    });

    return res.json({ leaderboard });
  } catch (err) {
    console.error("leagues/leaderboard error", err);
    return res.status(500).json({ error: "Failed to compute mini-league leaderboard." });
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
    console.log("MY PREDICTIONS:", {
  userId,
  predictions: allPreds[userId] || {}
});
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

    const now = Date.now();

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
      updatedAt: now,
    };

    console.log("SAVE incoming:", {
  userId,
  fixtureId,
  clean
});

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
// PREDICTIONS: ALL USERS (GLOBAL LEAGUE)
// ---------------------------------------------------------------------------
app.get("/api/predictions/all", authMiddleware, (req, res) => {
  try {
    const users = loadUsers();
    const allPreds = loadPredictions();

    const usersOut = users.map((u) => ({
      userId: u.id,
      username: u.username,
    }));

    const predictionsByUserId = {};
    usersOut.forEach((u) => {
      predictionsByUserId[u.userId] = allPreds[u.userId] || {};
    });

    return res.json({ users: usersOut, predictionsByUserId });
  } catch (err) {
    console.error("predictions/all error", err);
    return res.status(500).json({ error: "Failed to load global predictions" });
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

// -------------------- COINS DEBUG: SEASON TOTALS FOR ONE USER --------------------
// Example (local): GET http://localhost:5001/api/coins/debug/season/1763789072925
app.get("/api/coins/debug/season/:userId", (req, res) => {
  try {
    const rawId = req.params.userId;
    const coins = loadCoins() || {};
    const results = loadResults() || {};

    // coins.json might use string or numeric keys, so check both
    const idNum = Number(rawId);
    const coinsForUser =
      coins[rawId] ||
      (Number.isFinite(idNum) ? coins[idNum] : {}) ||
      {};

    const summary = computeSeasonCoinsForUser(coinsForUser, results);

    return res.json({
      userId: rawId,
      ...summary,
    });
  } catch (err) {
    console.error("coins debug season error", err);
    return res
      .status(500)
      .json({ error: "Failed to compute season coins debug summary" });
  }
});

// -------------------- COINS DEBUG: SEASON TOTALS FOR ALL USERS --------------------
// Example (local): GET http://localhost:5001/api/coins/debug/season-all
app.get("/api/coins/debug/season-all", (req, res) => {
  try {
    const coins = loadCoins() || {};
    const results = loadResults() || {};
    const users = loadUsers() || [];

    // Map userId -> username (support numeric and string keys)
    const userMap = {};
    users.forEach((u) => {
      userMap[u.id] = u.username;
      userMap[String(u.id)] = u.username;
    });

    const leaderboard = [];

    Object.entries(coins).forEach(([userIdKey, coinsForUser]) => {
      const summary = computeSeasonCoinsForUser(coinsForUser, results);

      leaderboard.push({
        userId: String(userIdKey),
        player: userMap[userIdKey] || userMap[String(userIdKey)] || "Unknown",
        totalStake: summary.totalStake,
        totalReturn: summary.totalReturn,
        profit: summary.profit,
      });
    });

    // Sort by profit descending, just like a real leaderboard would
    leaderboard.sort((a, b) => b.profit - a.profit);

    return res.json({ leaderboard });
  } catch (err) {
    console.error("coins debug season-all error", err);
    return res
      .status(500)
      .json({ error: "Failed to compute season coins debug leaderboard" });
  }
});

// ---------------------------------------------------------------------------
// COINS GAME (read-only summary for one user + gameweek)
// ---------------------------------------------------------------------------
app.get("/api/coins/my", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const rawGw = (req.query.gameweek || "").toString().trim();

    if (!rawGw) {
      return res
        .status(400)
        .json({ error: "gameweek query parameter is required." });
    }

    const gameweekKey = String(rawGw);
    const MAX_COINS_PER_GAMEWEEK = 10;

    const allCoins = loadCoins();
    const userCoins = allCoins[userId] || {};
    const betsForGw = userCoins[gameweekKey] || {};

    // Sum all stakes for this gameweek
    let used = 0;
    Object.values(betsForGw).forEach((bet) => {
      if (!bet || typeof bet.stake !== "number") return;
      used += bet.stake;
    });

    const remaining = Math.max(0, MAX_COINS_PER_GAMEWEEK - used);

    return res.json({
      gameweek: gameweekKey,
      used,
      remaining,
      bets: betsForGw,
    });
  } catch (err) {
    console.error("coins/my error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Place or update a bet for one fixture in one gameweek
app.post("/api/coins/place", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const {
      gameweek,
      fixtureId,
      side, // "H" | "D" | "A"
      stake, // number of coins
      odds, // optional snapshot: { home, draw, away }
    } = req.body || {};

    const MAX_COINS_PER_GAMEWEEK = 10;

    // Basic validation
    const gwKey = (gameweek !== undefined && gameweek !== null
      ? String(gameweek)
      : ""
    ).trim();
    const fxId = (fixtureId || "").toString().trim();
    const sideKey = (side || "").toUpperCase();
    const stakeNum = Number.isFinite(stake) ? Number(stake) : parseInt(stake, 10);

    if (!gwKey) {
      return res.status(400).json({ error: "gameweek is required." });
    }
    if (!fxId) {
      return res.status(400).json({ error: "fixtureId is required." });
    }
    if (!Number.isFinite(stakeNum) || stakeNum < 0) {
      return res.status(400).json({ error: "stake must be a non-negative number." });
    }
    if (stakeNum > 0 && !["H", "D", "A"].includes(sideKey)) {
      return res
        .status(400)
        .json({ error: "side must be 'H', 'D', or 'A' when stake > 0." });
    }

    // Load existing coins
    const allCoins = loadCoins();
    const userCoins = allCoins[userId] || {};
    const betsForGw = userCoins[gwKey] || {};

    // Calculate total coins used in this GW *excluding* this fixture
    let usedOther = 0;
    Object.entries(betsForGw).forEach(([id, bet]) => {
      if (!bet || typeof bet.stake !== "number") return;
      if (id === fxId) return; // skip current fixture
      usedOther += bet.stake;
    });

    const newTotal = usedOther + stakeNum;
    if (newTotal > MAX_COINS_PER_GAMEWEEK) {
      const remainingBefore = Math.max(0, MAX_COINS_PER_GAMEWEEK - usedOther);
      return res.status(400).json({
        error: `Not enough coins remaining for this gameweek. You can only add up to ${remainingBefore} more.`,
        used: usedOther,
        remaining: remainingBefore,
      });
    }

    // If stake is 0, treat it as "remove bet" for this fixture
    if (stakeNum === 0) {
      delete betsForGw[fxId];
    } else {
      // Normalise odds snapshot if provided
      let oddsSnapshot = null;
      if (odds && typeof odds === "object") {
        oddsSnapshot = {
          home:
            odds.home !== undefined && odds.home !== null
              ? Number(odds.home)
              : null,
          draw:
            odds.draw !== undefined && odds.draw !== null
              ? Number(odds.draw)
              : null,
          away:
            odds.away !== undefined && odds.away !== null
              ? Number(odds.away)
              : null,
        };
      }

      betsForGw[fxId] = {
        fixtureId: fxId,
        gameweek: gwKey,
        side: sideKey,
        stake: stakeNum,
        oddsSnapshot,
        updatedAt: new Date().toISOString(),
      };
    }

    // Attach back and save
    userCoins[gwKey] = betsForGw;
    allCoins[userId] = userCoins;

    saveCoins(allCoins);
    console.log(`[COINS] Saved coins for user ${userId}, gameweek ${gwKey}, fixture ${fxId}, stake ${stakeNum}`);
    // Log current bets for this user/gameweek
    console.log(`[COINS] Current bets for user ${userId}, gameweek ${gwKey}:`, JSON.stringify(betsForGw, null, 2));
    // Debug: print coins file path and contents after save
    const coinsFilePath = require('path').resolve(COINS_FILE);
    const coinsFileContents = require('fs').readFileSync(coinsFilePath, 'utf8');
    console.log(`[COINS DEBUG] coins.json path: ${coinsFilePath}`);
    console.log(`[COINS DEBUG] coins.json contents after save:`);
    console.log(coinsFileContents);

    // Recalculate used + remaining for this GW
    let used = 0;
    Object.values(betsForGw).forEach((bet) => {
      if (!bet || typeof bet.stake !== "number") return;
      used += bet.stake;
    });
    const remaining = Math.max(0, MAX_COINS_PER_GAMEWEEK - used);

    return res.json({
      gameweek: gwKey,
      used,
      remaining,
      bets: betsForGw,
      currentBet: betsForGw[fxId] || null,
    });
  } catch (err) {
    console.error("coins/place error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- SAVE RESULTS SNAPSHOT (from frontend) --------------------
// Expects body like: { resultsByFixtureId: { "111": { homeGoals: 3, awayGoals: 1 }, ... } }
app.post("/api/results/snapshot", authOptional, (req, res) => {
  try {
    console.log("[SNAPSHOT] /api/results/snapshot called");
    const { resultsByFixtureId } = req.body || {};
    if (!resultsByFixtureId || typeof resultsByFixtureId !== "object") {
      console.log("[SNAPSHOT] Invalid results payload", req.body);
      return res.status(400).json({ error: "Invalid results payload" });
    }

    const current = loadResults() || {};
    console.log("[SNAPSHOT] Merging keys:", Object.keys(resultsByFixtureId));

    // Merge new snapshot into existing results (new data overwrites old)
    const merged = { ...current, ...resultsByFixtureId };

    saveResults(merged);
    console.log("[SNAPSHOT] Results saved successfully");

    // --- Push notifications for newly completed fixtures ---
    try {
      const newlyCompleted = [];
      Object.entries(resultsByFixtureId).forEach(([fixtureId, r]) => {
        const nh = Number(r?.homeGoals);
        const na = Number(r?.awayGoals);
        if (!Number.isFinite(nh) || !Number.isFinite(na)) return;
        const prev = current[fixtureId];
        const ph = Number(prev?.homeGoals);
        const pa = Number(prev?.awayGoals);
        if (!Number.isFinite(ph) || !Number.isFinite(pa)) {
          newlyCompleted.push({ fixtureId: String(fixtureId), homeGoals: nh, awayGoals: na });
        }
      });

      if (newlyCompleted.length) {
        const predictions = loadPredictions() || {};
        const coins = loadCoins() || {};
        const users = loadUsers() || [];
        const fixtures = loadFixturesFromSrc() || [];
        const fixtureById = {};
        fixtures.forEach((fx) => {
          if (!fx || fx.id === undefined || fx.id === null) return;
          fixtureById[String(fx.id)] = fx;
        });

        newlyCompleted.forEach((fx) => {
          const resultSide = getResult(fx.homeGoals, fx.awayGoals);
          const fixture = fixtureById[String(fx.fixtureId)] || null;
          const homeNorm = normalizeTeamName(fixture?.homeTeam || "");
          const awayNorm = normalizeTeamName(fixture?.awayTeam || "");

          // Bingpot notifications
          Object.entries(predictions).forEach(([userId, preds]) => {
            const pred = preds[fx.fixtureId] || preds[Number(fx.fixtureId)];
            if (!pred) return;
            if (
              Number(pred.homeGoals) === fx.homeGoals &&
              Number(pred.awayGoals) === fx.awayGoals
            ) {
              sendPushNotification(userId, "bingpot", {
                title: "Bingpot! 🎯",
                body: `Exact score ${fx.homeGoals}-${fx.awayGoals} (fixture #${fx.fixtureId})`,
                url: "/",
              });
            }
          });

          // Bet win notifications
          Object.entries(coins).forEach(([userId, gwObj]) => {
            if (!gwObj || typeof gwObj !== "object") return;
            Object.values(gwObj).forEach((fixObj) => {
              if (!fixObj || typeof fixObj !== "object") return;
              const bet = fixObj[fx.fixtureId] || fixObj[Number(fx.fixtureId)];
              if (!bet || !Number.isFinite(bet.stake) || bet.stake <= 0) return;
              if (bet.side !== resultSide) return;

              let payout = "";
              if (bet.oddsSnapshot) {
                const price =
                  resultSide === "H"
                    ? bet.oddsSnapshot.home
                    : resultSide === "D"
                    ? bet.oddsSnapshot.draw
                    : bet.oddsSnapshot.away;
                if (typeof price === "number") {
                  payout = ` +${(bet.stake * price).toFixed(2)} coins`;
                }
              }

              sendPushNotification(userId, "betWin", {
                title: "Bet won! 💰",
                body: `You won your bet on fixture #${fx.fixtureId}.${payout}`,
                url: "/",
              });
            });
          });

          // Favourite team result notifications
          if (fixture && (homeNorm || awayNorm)) {
            users.forEach((user) => {
              if (!user || !user.id) return;
              const favTeam = (user.favoriteTeam || "").trim();
              if (!favTeam) return;
              const favNorm = normalizeTeamName(favTeam);
              if (!favNorm) return;
              const isFavFixture = favNorm === homeNorm || favNorm === awayNorm;
              if (!isFavFixture) return;

              sendPushNotification(user.id, "favoriteTeamResult", {
                title: "Favourite team result",
                body: `${fixture.homeTeam} ${fx.homeGoals}-${fx.awayGoals} ${fixture.awayTeam}`,
                url: "/",
              });
            });
          }
        });
      }
    } catch (err) {
      console.error("[SNAPSHOT] push notification error", err);
    }

    return res.json({ ok: true, updatedCount: Object.keys(resultsByFixtureId).length });
  } catch (err) {
    console.error("[SNAPSHOT] save results snapshot error", err);
    return res.status(500).json({ error: "Failed to save results snapshot" });
  }
});

// ---------------------------------------------------------------------------
// RESULTS (football-data.org) – proxy
// ---------------------------------------------------------------------------
app.get("/api/results", async (req, res) => {
  try {
    const now = Date.now();
    if (resultsCache && now - resultsCacheAt < RESULTS_CACHE_TTL_MS) {
      res.setHeader("X-Results-Updated", String(resultsCacheAt));
      return res.json(resultsCache);
    }
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
    const matches = Array.isArray(data.matches) ? data.matches : [];
    resultsCache = matches;
    resultsCacheAt = Date.now();
    res.setHeader("X-Results-Updated", String(resultsCacheAt));
    res.json(matches);
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
    // API-FOOTBALL odds endpoint: league 39 = Premier League, season 2023 (free plan)
    const url =
      "https://v3.football.api-sports.io/odds?league=39&season=2023&bookmaker=8";

    const apiRes = await fetch(url, {
      headers: {
        "x-apisports-key": ODDS_API_KEY,
      },
    });

    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => "");
      console.error("API-FOOTBALL odds error:", apiRes.status, errorText);
      return res.status(apiRes.status).json({
        error: "API-FOOTBALL error",
        status: apiRes.status,
        details: errorText,
      });
    }

    const data = await apiRes.json();

    // TEMP: log raw data so we can see the real structure
    console.log("API-FOOTBALL RAW ODDS:", JSON.stringify(data, null, 2));

    // TEMP: return raw data so you can see it in the browser
    res.json(data);
  } catch (err) {
    console.error("odds error", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// ---------------------------------------------------------------------------
// START SERVER
// ---------------------------------------------------------------------------

// -------------------- COINS LEADERBOARD (SEASON, ALL USERS) --------------------
app.get("/api/coins/leaderboard", authOptional, (req, res) => {
  try {
    const coins = loadCoins() || {};
    const results = loadResults() || {};
    const users = loadUsers() || [];

    // Map userId -> username (handle numeric/string)
    const userMap = {};
    users.forEach((u) => {
      userMap[u.id] = u.username;
      userMap[String(u.id)] = u.username;
    });

    const leaderboard = [];


    Object.entries(coins).forEach(([userIdKey, coinsForUser]) => {
      const summary = computeSeasonCoinsForUser(coinsForUser, results);
      leaderboard.push({
        userId: String(userIdKey),
        player: userMap[userIdKey] || userMap[String(userIdKey)] || "Unknown",
        totalStake: summary.totalStake,
        totalReturn: summary.totalReturn,
        profit: summary.profit,
      });
      // Log each user's summary for debugging
      console.log(`[LEADERBOARD] User ${userIdKey}: stake=${summary.totalStake}, return=${summary.totalReturn}, profit=${summary.profit}`);
    });

    // Sort by profit descending (typical leaderboard)
    leaderboard.sort((a, b) => b.profit - a.profit);

    return res.json({ leaderboard });
  } catch (err) {
    console.error("coins leaderboard error", err);
    return res
      .status(500)
      .json({ error: "Failed to build coins leaderboard" });
  }
});

// ---------------------------------------------------------------------------
// PUSH NOTIFICATIONS
// Helper: Send push notification to a user, respecting their preferences
function sendPushNotification(userId, type, payload) {
  const subscriptions = loadJson(PUSH_SUBSCRIPTIONS_FILE, {});
  const sub = subscriptions[userId];
  if (!sub || !sub.subscription) return false;
  const prefs = sub.notifPrefs || null;
  if (prefs && prefs[type] === false) return false;
  try {
    webpush.sendNotification(sub.subscription, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.error(`Push notification error for user ${userId}:`, err);
    return false;
  }
}
// ---------------------------------------------------------------------------

// Subscribe to push notifications
app.post("/api/push/subscribe", authMiddleware, (req, res) => {
  try {
    const body = req.body || {};
    const subscription = body.subscription || body;
    const notifPrefs = body.prefs || body.notifPrefs || null;
    const userId = req.user.id;

    let subscriptions = loadJson(PUSH_SUBSCRIPTIONS_FILE, {});
    subscriptions[userId] = {
      subscription,
      notifPrefs: notifPrefs || (subscriptions[userId] && subscriptions[userId].notifPrefs) || null,
    };
    saveJson(PUSH_SUBSCRIPTIONS_FILE, subscriptions);

    console.log(`Push subscription saved for user ${userId}`);
    return res.json({ success: true });
  } catch (err) {
    console.error("Push subscribe error:", err);
    return res.status(500).json({ error: "Failed to subscribe" });
  }
});

// Unsubscribe from push notifications
app.post("/api/push/unsubscribe", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;

    let subscriptions = loadJson(PUSH_SUBSCRIPTIONS_FILE, {});
    delete subscriptions[userId];
    saveJson(PUSH_SUBSCRIPTIONS_FILE, subscriptions);

    console.log(`Push subscription removed for user ${userId}`);
    return res.json({ success: true });
  } catch (err) {
    console.error("Push unsubscribe error:", err);
    return res.status(500).json({ error: "Failed to unsubscribe" });
  }
});

// Update notification preferences
app.post("/api/push/prefs", authMiddleware, (req, res) => {
  try {
    const prefs = req.body || {};
    const userId = req.user.id;

    let subscriptions = loadJson(PUSH_SUBSCRIPTIONS_FILE, {});
    const existing = subscriptions[userId] || {};
    subscriptions[userId] = {
      subscription: existing.subscription || null,
      notifPrefs: prefs,
    };
    saveJson(PUSH_SUBSCRIPTIONS_FILE, subscriptions);

    return res.json({ ok: true });
  } catch (err) {
    console.error("push prefs error", err);
    return res.status(500).json({ error: "Failed to save preferences" });
  }
});

// Get notification preferences
app.get("/api/push/prefs", authMiddleware, (req, res) => {
  try {
    const userId = req.user.id;
    const subscriptions = loadJson(PUSH_SUBSCRIPTIONS_FILE, {});
    const prefs = (subscriptions[userId] && subscriptions[userId].notifPrefs) || {};
    return res.json({ prefs });
  } catch (err) {
    console.error("push prefs get error", err);
    return res.status(500).json({ error: "Failed to load preferences" });
  }
});

// ---------------------------------------------------------------------------
// DEADLINE NOTIFICATIONS (1h + 24h before kickoff)
// ---------------------------------------------------------------------------
function runDeadlineNotifier() {
  const fixtures = loadFixturesFromSrc();
  if (!fixtures || fixtures.length === 0) return;

  const now = Date.now();
  const windowMs = 2 * 60 * 1000; // 2-minute window to avoid repeats

  const subscriptions = loadJson(PUSH_SUBSCRIPTIONS_FILE, {});
  let changed = false;

  const notifyForType = (type, msBefore) => {
    fixtures.forEach((fx) => {
      const kickoff = Date.parse(fx.kickoff);
      if (!Number.isFinite(kickoff)) return;
      const deadline = kickoff - msBefore;
      if (now < deadline || now > deadline + windowMs) return;

      Object.entries(subscriptions).forEach(([userId, sub]) => {
        if (!sub || !sub.subscription) return;
        const prefs = sub.notifPrefs || {};
        if (prefs && prefs[type] === false) return;

        const log = sub.notifLog || {};
        const typeLog = log[type] || {};
        if (typeLog[fx.id]) return;

        const title =
          type === "deadline1h" ? "1 hour to deadline ⏰" : "24 hours to deadline ⏰";
        const body = `${fx.homeTeam} vs ${fx.awayTeam} (GW${fx.gameweek})`;

        const sent = sendPushNotification(userId, type, {
          title,
          body,
          url: "/",
        });

        if (sent) {
          typeLog[fx.id] = Date.now();
          log[type] = typeLog;
          sub.notifLog = log;
          subscriptions[userId] = sub;
          changed = true;
        }
      });
    });
  };

  notifyForType("deadline24h", 24 * 60 * 60 * 1000);
  notifyForType("deadline1h", 1 * 60 * 60 * 1000);

  if (changed) saveJson(PUSH_SUBSCRIPTIONS_FILE, subscriptions);
}

setInterval(runDeadlineNotifier, 60 * 1000);
setTimeout(runDeadlineNotifier, 5 * 1000);

// Get VAPID public key
app.get("/api/push/vapid-public-key", (req, res) => {
  return res.json({ publicKey: VAPID_PUBLIC_KEY });
});



app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
