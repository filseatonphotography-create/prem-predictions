const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");
const { pathToFileURL } = require("url");

const FIXTURES_PATH = path.join(__dirname, "..", "src", "fixtures.js");
const REPORT_PATH = path.join(__dirname, "..", "data", "fixture_sync_report.json");
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN || "";
const FIXTURE_SEASON = process.env.FIXTURE_SEASON || "2025";
const API_URL = `https://api.football-data.org/v4/competitions/PL/matches?season=${encodeURIComponent(
  FIXTURE_SEASON
)}`;

function normalizeTeamName(name) {
  if (!name) return "";
  let s = String(name).toLowerCase().trim();

  if (s === "spurs" || s === "tottenham") s = "tottenham hotspur";
  if (s === "wolves" || s === "wolverhampton") s = "wolverhampton wanderers";
  if (s === "nott'm forest" || s === "nottm forest" || s === "nottingham") {
    s = "nottingham forest";
  }
  if (
    s === "man utd" ||
    s === "man u" ||
    s === "manchester utd" ||
    s === "manchester u" ||
    s === "mufc"
  ) {
    s = "manchester united";
  }
  if (s === "leeds") s = "leeds united";
  if (s === "west ham" || s === "whu" || s === "hammers") s = "west ham united";
  if (s === "aston villa" || s === "villa") s = "aston villa";
  if (s === "man city" || s === "mcfc") s = "manchester city";

  s = s.replace(/football club/g, "");
  s = s.replace(/\bfc\b/g, "");
  s = s.replace(/\bafc\b/g, "");
  s = s.replace(/\butd\b/g, "united");
  s = s.replace(/[^a-z]/g, "");

  return s;
}

function fixtureKey(gameweek, homeTeam, awayTeam) {
  return `${String(gameweek)}|${normalizeTeamName(homeTeam)}|${normalizeTeamName(awayTeam)}`;
}

async function loadFixtures() {
  const mod = await import(pathToFileURL(FIXTURES_PATH).href);
  return Array.isArray(mod.default) ? mod.default : [];
}

async function fetchApiFixtures() {
  if (!FOOTBALL_DATA_TOKEN) {
    throw new Error("Missing FOOTBALL_DATA_TOKEN env var");
  }
  const res = await fetch(API_URL, {
    headers: { "X-Auth-Token": FOOTBALL_DATA_TOKEN },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${body}`);
  }
  const data = await res.json();
  return Array.isArray(data.matches) ? data.matches : [];
}

function ensureReportDir() {
  const dir = path.dirname(REPORT_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function main() {
  const localFixtures = await loadFixtures();
  const apiMatches = await fetchApiFixtures();

  const localByKey = new Map();
  localFixtures.forEach((f) => {
    const key = fixtureKey(f.gameweek, f.homeTeam, f.awayTeam);
    localByKey.set(key, f);
  });

  const apiByKey = new Map();
  apiMatches.forEach((m) => {
    if (!m || !m.homeTeam || !m.awayTeam) return;
    const key = fixtureKey(m.matchday, m.homeTeam.name, m.awayTeam.name);
    apiByKey.set(key, m);
  });

  const missingInLocal = [];
  const kickoffChanges = [];

  apiByKey.forEach((m, key) => {
    const local = localByKey.get(key);
    if (!local) {
      missingInLocal.push({
        gameweek: m.matchday,
        homeTeam: m.homeTeam.name,
        awayTeam: m.awayTeam.name,
        kickoff: m.utcDate,
      });
      return;
    }

    if (local.kickoff !== m.utcDate) {
      kickoffChanges.push({
        id: local.id,
        gameweek: local.gameweek,
        homeTeam: local.homeTeam,
        awayTeam: local.awayTeam,
        localKickoff: local.kickoff,
        apiKickoff: m.utcDate,
      });
    }
  });

  const extraInLocal = [];
  localByKey.forEach((f, key) => {
    if (!apiByKey.has(key)) {
      extraInLocal.push({
        id: f.id,
        gameweek: f.gameweek,
        homeTeam: f.homeTeam,
        awayTeam: f.awayTeam,
        kickoff: f.kickoff,
      });
    }
  });

  const report = {
    generatedAt: new Date().toISOString(),
    season: FIXTURE_SEASON,
    counts: {
      localFixtures: localFixtures.length,
      apiFixtures: apiByKey.size,
      missingInLocal: missingInLocal.length,
      extraInLocal: extraInLocal.length,
      kickoffChanges: kickoffChanges.length,
    },
    missingInLocal,
    extraInLocal,
    kickoffChanges,
  };

  ensureReportDir();
  fs.writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2), "utf8");

  console.log("Fixture sync report written:", REPORT_PATH);
  console.log("Summary:", report.counts);

  if (missingInLocal.length || extraInLocal.length) {
    console.log("\nMissing in local:", missingInLocal.slice(0, 10));
    console.log("\nExtra in local:", extraInLocal.slice(0, 10));
    process.exit(2);
  }

  if (kickoffChanges.length) {
    console.log("\nKickoff changes detected:", kickoffChanges.slice(0, 10));
    process.exit(1);
  }

  console.log("No fixture mismatches detected.");
}

main().catch((err) => {
  console.error("Fixture check failed:", err.message || err);
  process.exit(3);
});
