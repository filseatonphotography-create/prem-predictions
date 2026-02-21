// --- TEAM NAME NORMALISATION (copied from app) ---
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
// patch-fixture-times.js
// Safely update only kickoff times in fixtures.js using football-data.org API, preserving all original IDs

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const FIXTURES_PATH = path.join(__dirname, 'src', 'fixtures.js');
const OVERRIDES_PATH = path.join(__dirname, 'data', 'fixture_kickoff_overrides.json');
const FOOTBALL_DATA_TOKEN = process.env.FOOTBALL_DATA_TOKEN || "18351cddefba4334a5edb3a60ea84ba3";
const API_URL = 'https://api.football-data.org/v4/competitions/PL/matches?season=2025';

function loadFixtures() {
  // Use dynamic import to load ESM default export
  const { pathToFileURL } = require('url');
  const fileUrl = pathToFileURL(FIXTURES_PATH).href;
  return import(fileUrl).then(mod => mod.default);
}

async function fetchApiFixtures() {
  const res = await fetch(API_URL, {
    headers: { 'X-Auth-Token': FOOTBALL_DATA_TOKEN }
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  const data = await res.json();
  return data.matches;
}

function findApiMatch(fixture, apiFixtures) {
  // Match by normalized home/away team and gameweek (matchday)
  const home = normalizeTeamName(fixture.homeTeam);
  const away = normalizeTeamName(fixture.awayTeam);
  return apiFixtures.find(
    m =>
      normalizeTeamName(m.homeTeam.name) === home &&
      normalizeTeamName(m.awayTeam.name) === away &&
      m.matchday === fixture.gameweek
  );
}

function fixtureKey(gameweek, homeTeam, awayTeam) {
  return `${String(gameweek)}|${normalizeTeamName(homeTeam)}|${normalizeTeamName(awayTeam)}`;
}

function loadKickoffOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) {
    return { byFixtureId: {}, byMatchKey: {} };
  }
  const raw = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
  return {
    byFixtureId: raw && typeof raw.byFixtureId === "object" ? raw.byFixtureId : {},
    byMatchKey: raw && typeof raw.byMatchKey === "object" ? raw.byMatchKey : {},
  };
}

async function patchFixtureTimes() {
  const fixtures = await loadFixtures();
  const apiFixtures = await fetchApiFixtures();
  const overrides = loadKickoffOverrides();
  let updated = 0;
  let overridden = 0;
  let unmatched = [];
  for (const fixture of fixtures) {
    const apiMatch = findApiMatch(fixture, apiFixtures);
    if (apiMatch && fixture.kickoff !== apiMatch.utcDate) {
      fixture.kickoff = apiMatch.utcDate;
      updated++;
    } else if (!apiMatch) {
      unmatched.push({
        id: fixture.id,
        gameweek: fixture.gameweek,
        homeTeam: fixture.homeTeam,
        awayTeam: fixture.awayTeam
      });
    }

    const key = fixtureKey(fixture.gameweek, fixture.homeTeam, fixture.awayTeam);
    const overrideKickoff =
      overrides.byFixtureId[String(fixture.id)] || overrides.byMatchKey[key];
    if (overrideKickoff && fixture.kickoff !== overrideKickoff) {
      fixture.kickoff = overrideKickoff;
      overridden++;
    }
  }
  // Sort fixtures by gameweek, then by kickoff time
  fixtures.sort((a, b) => {
    if (a.gameweek !== b.gameweek) return a.gameweek - b.gameweek;
    return new Date(a.kickoff) - new Date(b.kickoff);
  });
  const fileContent =
    'const FIXTURES = ' + JSON.stringify(fixtures, null, 2) + '\n\nexport default FIXTURES;\n';
  fs.writeFileSync(FIXTURES_PATH, fileContent);
  console.log(`Patched kickoff times for ${updated} fixtures. IDs preserved and fixtures sorted.`);
  console.log(`Kickoff overrides applied: ${overridden}`);
  if (unmatched.length > 0) {
    console.log('Fixtures with no API match:', unmatched);
  }
}

patchFixtureTimes().catch(err => {
  console.error('Failed to patch fixture times:', err);
  process.exit(1);
});
