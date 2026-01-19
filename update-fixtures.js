// update-fixtures.js
// Script to fetch latest Premier League fixtures from football-data.org and update src/fixtures.js

const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

const FIXTURES_PATH = path.join(__dirname, 'src', 'fixtures.js');
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

async function updateFixturesFile() {
  const matches = await fetchFixtures();
  const fixtures = matches.map(toFixtureObj);
  const fileContent =
    'const FIXTURES = ' + JSON.stringify(fixtures, null, 2) + ' \n\nexport default FIXTURES;\n';
  fs.writeFileSync(FIXTURES_PATH, fileContent);
  console.log('Fixtures updated:', fixtures.length);
}

updateFixturesFile().catch(err => {
  console.error('Failed to update fixtures:', err);
  process.exit(1);
});
