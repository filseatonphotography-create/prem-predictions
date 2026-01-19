// recalc-coins-gw.js
// Recalculate and patch coins for a specific gameweek (e.g., 22)

const fs = require('fs');
const path = require('path');

const COINS_PATH = path.join(__dirname, 'data', 'coins.json');
const RESULTS_PATH = path.join(__dirname, 'data', 'results.json');
const FIXTURES_PATH = path.join(__dirname, 'src', 'fixtures.js');

const GAMEWEEK = 22;

function loadFixtures() {
  const raw = fs.readFileSync(FIXTURES_PATH, 'utf8');
  const match = raw.match(/const FIXTURES = (\[.*\]);/s);
  if (!match) throw new Error('Could not parse fixtures');
  return JSON.parse(match[1]);
}

function loadResults() {
  return JSON.parse(fs.readFileSync(RESULTS_PATH, 'utf8'));
}

function loadCoins() {
  return JSON.parse(fs.readFileSync(COINS_PATH, 'utf8'));
}

function saveCoins(coins) {
  fs.writeFileSync(COINS_PATH, JSON.stringify(coins, null, 2));
}

function recalcCoinsForGameweek() {
  const fixtures = loadFixtures().filter(f => f.gameweek === GAMEWEEK);
  const results = loadResults();
  const coins = loadCoins();

  // For each user, recalc profit for this gameweek
  for (const userId in coins) {
    let profit = 0;
    for (const fixture of fixtures) {
      const bets = coins[userId].bets?.[fixture.id];
      const result = results[fixture.id];
      if (bets && result) {
        // Example: win = 2x, draw = 1.5x, lose = 0
        if (bets.prediction === result.result) {
          profit += bets.amount * (result.result === 'draw' ? 1.5 : 2);
        } else {
          profit -= bets.amount;
        }
      }
    }
    coins[userId].history = coins[userId].history || {};
    coins[userId].history[GAMEWEEK] = profit;
    coins[userId].total = (coins[userId].total || 0) + profit;
  }
  saveCoins(coins);
  console.log('Recalculated coins for gameweek', GAMEWEEK);
}

recalcCoinsForGameweek();
