// update-fixtures.js
// Script to fetch latest Premier League fixtures from football-data.org and update src/fixtures.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const { pathToFileURL } = require('url');

const FIXTURES_PATH = path.join(__dirname, 'src', 'fixtures.js');
const OVERRIDES_PATH = path.join(__dirname, 'data', 'fixture_kickoff_overrides.json');
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN || "18351cddefba4334a5edb3a60ea84ba3";
const API_URL = 'https://api.football-data.org/v4/competitions/PL/matches?season=2025';

async function fetchFixtures() {
  const res = await fetch(API_URL, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
  });
  if (!res.ok) {
    throw new Error(`API error: ${res.status}`);
  }
  const data = await res.json();
  return data.matches;
}

function toFixtureObj(match) {
  return {
    id: match.id,
    gameweek: match.matchday,
    homeTeam: match.homeTeam.name,
    awayTeam: match.awayTeam.name,
    kickoff: match.utcDate,
  };
}

function normalizeTeamName(name) {
  if (!name) return "";
  return String(name)
    .toLowerCase()
    .replace(/football club/g, "")
    .replace(/\bfc\b/g, "")
    .replace(/\bafc\b/g, "")
    .replace(/\butd\b/g, "united")
    .replace(/[^a-z]/g, "");
}

function fixtureKey(gameweek, homeTeam, awayTeam) {
  return `${String(gameweek)}|${normalizeTeamName(homeTeam)}|${normalizeTeamName(awayTeam)}`;
}

async function loadExistingFixtures() {
  const mod = await import(pathToFileURL(FIXTURES_PATH).href);
  return Array.isArray(mod.default) ? mod.default : [];
}

function loadKickoffOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) {
    return { byFixtureId: {}, byMatchKey: {} };
  }
  const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
  return {
    byFixtureId: raw && typeof raw.byFixtureId === 'object' ? raw.byFixtureId : {},
    byMatchKey: raw && typeof raw.byMatchKey === 'object' ? raw.byMatchKey : {},
  };
}

function applyKickoffOverrides(fixtures, overrides) {
  let overridden = 0;
  fixtures.forEach((f) => {
    const key = fixtureKey(f.gameweek, f.homeTeam, f.awayTeam);
    const byId = overrides.byFixtureId[String(f.id)];
    const byKey = overrides.byMatchKey[key];
    const overrideKickoff = byId || byKey;
    if (overrideKickoff && f.kickoff !== overrideKickoff) {
      f.kickoff = overrideKickoff;
      overridden++;
    }
  });
  return overridden;
}

async function updateFixturesFile() {
  const existingFixtures = await loadExistingFixtures();
  const existingByKey = new Map();
  existingFixtures.forEach((f) => {
    existingByKey.set(fixtureKey(f.gameweek, f.homeTeam, f.awayTeam), f);
  });

  const matches = await fetchFixtures();
  const fixtures = matches.map((m) => {
    const fx = toFixtureObj(m);
    const key = fixtureKey(fx.gameweek, fx.homeTeam, fx.awayTeam);
    const existing = existingByKey.get(key);
    // Preserve local IDs when a fixture still exists, so predictions/coins remain mapped.
    if (existing && existing.id !== undefined && existing.id !== null) {
      fx.id = existing.id;
    }
    return fx;
  });

  const overrides = loadKickoffOverrides();
  const overridden = applyKickoffOverrides(fixtures, overrides);

  const fileContent =
    'const FIXTURES = ' + JSON.stringify(fixtures, null, 2) + ' \n\nexport default FIXTURES;\n';
  fs.writeFileSync(FIXTURES_PATH, fileContent);
  console.log('Fixtures updated:', fixtures.length);
  console.log('Kickoff overrides applied:', overridden);
}

updateFixturesFile().catch(err => {
  console.error('Failed to update fixtures:', err);
  process.exit(1);
});
