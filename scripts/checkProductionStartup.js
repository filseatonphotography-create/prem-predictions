/* Execute the built bundle: source-level Jest tests cannot catch Webpack startup failures. */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const buildPath = path.resolve(process.argv[2] || process.env.BUILD_PATH || 'build');
const manifest = JSON.parse(fs.readFileSync(path.join(buildPath, 'asset-manifest.json'), 'utf8'));
const mainPath = manifest.files['main.js'].replace(/^https?:\/\/[^/]+/, '').replace(/^\//, '');
const bundle = fs.readFileSync(path.join(buildPath, mainPath), 'utf8');

async function check(name, activeView) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => { if (error.type === 'unhandled exception') errors.push(error.detail || error); });
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="root"></div></body></html>', {
    url: 'http://localhost', runScripts: 'dangerously', pretendToBeVisual: true, virtualConsole,
  });
  const win = dom.window;
  win.scrollTo = () => {};
  win.addEventListener('error', event => errors.push(event.error || new Error(event.message)));
  win.fetch = async url => {
    let data = {};
    if (String(url).includes('/api/live-studio/matches?')) data = { matches: [{ id: 77,
      utcDate: new Date(Date.now() - 30 * 60000).toISOString(), status: 'IN_PLAY', minute: 30,
      homeTeam: { id: 1, name: 'Startup Home' }, awayTeam: { id: 2, name: 'Startup Away' },
      score: { fullTime: { home: 1, away: 0 } }, form: { home: [], away: [] } }] };
    if (String(url).includes('/api/champions-league/standings')) data = { competition: { code: 'CL' },
      standings: [{ type: 'TOTAL', stage: 'LEAGUE_STAGE', table: [{ position: 1, team: { id: 1, name: 'Startup Home' }, points: 3 }] }] };
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  };
  if (activeView) {
    win.localStorage.setItem('pl_prediction_auth_v1', JSON.stringify({ token: 'startup-check', userId: 'startup-check', username: 'Startup Check' }));
    win.localStorage.setItem('activeView', activeView);
    win.localStorage.setItem('live-studio-selection:v1:startup-check', JSON.stringify({ 'cl:77': true }));
  }
  try {
    win.eval(bundle);
    await new Promise(resolve => setTimeout(resolve, 500));
    if (errors.length) throw errors[0];
    const root = win.document.getElementById('root');
    if (!root.textContent.trim()) throw new Error(`${name}: the production app rendered a blank root`);
    if (activeView === 'liveStudio' && !root.querySelector('article[data-live-studio-fixture-id="cl:77"]')) throw new Error('The production Studio did not render its selected Champions League match');
    if (activeView === 'championsLeagueTable' && !root.querySelector('table')) throw new Error('The production Champions League table did not render');
    console.log(`Production startup passed: ${name}`);
  } finally { win.close(); }
}

(async () => {
  await check('welcome page');
  await check('signed-in Live Studio', 'liveStudio');
  await check('Champions League table', 'championsLeagueTable');
})().catch(error => { console.error(error.stack || error); process.exitCode = 1; });
