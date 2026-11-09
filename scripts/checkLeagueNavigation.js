// Exercise the shipped bundle: a failed optional storage write in a React
// effect used to unmount the entire app when entering a completed league.
const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');
const { parseFixtureArraySource } = require('../notificationUtils');

module.exports = async function checkLeagueNavigation(buildPath) {
  const manifest = JSON.parse(fs.readFileSync(path.join(buildPath, 'asset-manifest.json'), 'utf8'));
  const bundlePath = manifest.files['main.js'].replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
  const bundle = fs.readFileSync(path.join(buildPath, bundlePath), 'utf8');
  const fixtures = parseFixtureArraySource(fs.readFileSync(path.join(__dirname, '../src/fixtures.js'), 'utf8'), 'FIXTURES');
  const firstRound = fixtures.filter(fixture => fixture.gameweek === 1);
  assert(firstRound.length > 0, 'The navigation check needs a completed round');
  const users = [
    { userId: '1000000000001', username: 'Test Player' },
    { userId: '1000000000002', username: 'First Rival' },
    { userId: '1000000000003', username: 'Second Rival' },
  ];
  const leagues = [
    { id: 'first-league', name: 'First test league', memberUserIds: users.slice(0, 2).map(user => user.userId) },
    { id: 'second-league', name: 'Second test league', memberUserIds: [users[0].userId, users[2].userId] },
  ];
  const results = Object.fromEntries(firstRound.map(fixture => [fixture.id, { homeGoals: 1, awayGoals: 0 }]));
  const predictionsByUserId = Object.fromEntries(users.map(user => [user.userId, results]));

  async function check(action, failure = 'none') {
    const fullStorage = failure === 'quota';
    const errors = [];
    const virtualConsole = new VirtualConsole();
    virtualConsole.on('jsdomError', error => {
      if (error.type === 'unhandled exception') errors.push(error.detail || error);
    });
    const dom = new JSDOM('<div id="root"></div>', {
      url: 'http://localhost/?mode=premier', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole,
    });
    const win = dom.window;
    win.innerWidth = 390;
    win.scrollTo = () => {};
    let winnerAudioAttempts = 0;
    win.HTMLMediaElement.prototype.play = function play() {
      if (this.src.endsWith('/winner.mp3')) winnerAudioAttempts += 1;
      if (failure === 'audio-throws') throw new win.DOMException('Playback blocked', 'NotAllowedError');
      if (failure === 'audio-no-promise') return undefined;
      return Promise.resolve();
    };
    // The round must be complete regardless of the date the build runs.
    win.Date.now = () => Math.max(...firstRound.map(fixture => Date.parse(fixture.kickoff))) + 24 * 60 * 60 * 1000;
    win.addEventListener('error', event => errors.push(event.error || new Error(event.message)));
    win.fetch = async raw => {
      const url = new URL(String(raw), 'http://localhost');
      let data = {};
      if (url.pathname === '/api/leagues/my') data = { leagues };
      if (url.pathname === '/api/results/snapshot') data = results;
      if (url.pathname === '/api/predictions/all') data = { users, predictionsByUserId };
      if (url.pathname.startsWith('/api/predictions/league/')) {
        const league = leagues.find(item => item.id === url.pathname.split('/').pop());
        data = { users: users.filter(user => league.memberUserIds.includes(user.userId)), predictionsByUserId };
      }
      return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
    };
    win.localStorage.setItem('pl_prediction_auth_v1', JSON.stringify({ token: 'test-only', userId: users[0].userId, username: users[0].username }));
    win.localStorage.setItem('pl_prediction_game_v2', JSON.stringify({ selectedGameweek: 1 }));
    win.localStorage.setItem('activeView', action === 'global' ? 'predictions' : 'league');
    win.localStorage.setItem(`winner_popup_seen_premier_leaguefirst-league_gw1_${users[0].userId}`, 'true');
    const root = win.document.getElementById('root');
    const waitFor = async predicate => {
      const deadline = Date.now() + 10000;
      while (!predicate()) {
        if (errors.length) throw errors[0];
        if (Date.now() > deadline) throw new Error(`Timed out waiting for ${action} league navigation`);
        await new Promise(resolve => setTimeout(resolve, 25));
      }
      if (errors.length) throw errors[0];
    };
    const buttons = () => [...root.querySelectorAll('button')];
    const seenKey = `winner_popup_seen_premier_${action === 'global' ? 'global' : 'leaguesecond-league'}_gw1_${users[0].userId}`;
    let rejectedWinnerWrite = false;
    try {
      win.eval(bundle);
      await waitFor(() => root.querySelector('select option[value="second-league"]') || (action === 'global' && buttons().some(button => button.textContent.includes('Leagues'))));
      if (fullStorage) {
        const originalSetItem = win.Storage.prototype.setItem;
        win.Storage.prototype.setItem = function setItem(key, value) {
          if (this === win.localStorage && this.getItem(key) !== String(value)) {
            if (key === seenKey) rejectedWinnerWrite = true;
            throw new win.DOMException('Storage quota exceeded', 'QuotaExceededError');
          }
          return originalSetItem.call(this, key, value);
        };
      }
      if (action === 'global') {
        buttons().find(button => button.textContent.includes('Leagues')).click();
        await waitFor(() => buttons().some(button => button.textContent.trim() === 'Global League Table'));
        buttons().find(button => button.textContent.trim() === 'Global League Table').click();
      } else {
        const selector = root.querySelector('option[value="second-league"]').parentElement;
        selector.value = 'second-league';
        selector.dispatchEvent(new win.Event('change', { bubbles: true }));
      }
      await waitFor(() => root.querySelector('[title="Second Rival"]') && (fullStorage ? rejectedWinnerWrite : win.localStorage.getItem(seenKey)));
      // Flush the debounced app-cache write and any effects triggered by the popup.
      await new Promise(resolve => setTimeout(resolve, 300));
      if (errors.length) throw errors[0];
      assert(root.querySelector('header'), 'League navigation must retain the app header');
      assert(root.querySelector('[title="Test Player"]'), 'The selected table must include its members');
      assert(winnerAudioAttempts > 0, 'The completed league must exercise the winner celebration');
      if (action === 'mini') assert(!root.querySelector('[title="First Rival"]'), 'Switching leagues must replace the old members');
      if (fullStorage) assert.strictEqual(win.sessionStorage.getItem(seenKey), 'true', 'The winner flag must fall back to session storage');
      console.log(`League navigation passed: ${action}, ${failure}`);
    } finally {
      win.close();
    }
  }

  for (const failure of ['none', 'quota', 'audio-throws', 'audio-no-promise']) {
    await check('global', failure);
    await check('mini', failure);
  }
};
