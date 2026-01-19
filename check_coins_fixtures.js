// Updated script: scan all of coins.json and results.json for fixture ID mismatches
// Usage: node check_coins_fixtures.js

const fs = require('fs');
const coins = require('./data/coins.json');
const results = require('./data/results.json');

const allResultIds = new Set(Object.keys(results));
const missing = [];

Object.entries(coins).forEach(([userId, weeks]) => {
  Object.entries(weeks).forEach(([gw, bets]) => {
    Object.entries(bets).forEach(([fixtureId, bet]) => {
      if (!allResultIds.has(fixtureId)) {
        missing.push({ userId, gameweek: gw, fixtureId, bet });
      }
    });
  });
});

if (missing.length === 0) {
  console.log('All coins bets reference valid fixture IDs.');
} else {
  console.log('Bets with fixture IDs not in results.json:');
  missing.forEach(m => {
    console.log(`User: ${m.userId}, GW: ${m.gameweek}, Fixture: ${m.fixtureId}, Bet:`, m.bet);
  });
}
