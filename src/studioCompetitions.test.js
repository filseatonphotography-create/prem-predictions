const { championsFixture, studioAlertAllowed, footballFeed, currentChampionsMatch } = require('./studioCompetitions');
const fs = require('fs');
const vm = require('vm');
const events = require('./liveMatchEvents');
const utils = require('../notificationUtils');

const match = () => ({ id: 77, utcDate: '2026-11-04T17:45:00Z', status: 'IN_PLAY', minute: 29,
  lastUpdated: '2026-11-04T18:14:00Z', homeTeam: { id: 1, name: 'Fenerbahçe SK' }, awayTeam: { id: 2, name: 'Liverpool FC' },
  score: { fullTime: { home: 1, away: 1 } }, goals: [{ type: 'REGULAR', minute: 27, scorer: { name: 'Salah' }, team: { id: 2, name: 'Liverpool FC' }, score: { home: 1, away: 1 } }] });

test('Champions League uses separate fixture IDs and a football-only event feed', () => {
  expect(championsFixture(match())).toMatchObject({ id: 'cl:77', providerId: 77, competition: 'champions' });
  const feed = footballFeed(match());
  expect(feed.find(entry => entry.updateKey === 'cl:77:goal:1-1')).toMatchObject({ minute: "27'", lines: ['Salah · Liverpool FC', 'Fenerbahçe SK 1–1 Liverpool FC'] });
  expect(JSON.stringify(feed)).not.toMatch(/prediction|coins|betting/i);
});

test('finished knockout games retain extra-time scores and penalty shootout results', () => {
  const raw = { ...match(), status: 'FINISHED', minute: 120, score: { duration: 'PENALTY_SHOOTOUT', regularTime: { home: 1, away: 1 }, fullTime: { home: 2, away: 2 }, penalties: { home: 3, away: 4 } } };
  expect(footballFeed(raw).find(entry => entry.minute === 'FT').lines).toEqual(['Fenerbahçe SK 2–2 Liverpool FC', 'Penalties: 3–4.']);
});

test('a newer recorded score survives an older provider response', () => {
  const raw = { ...match(), recordedState: { status: 'IN_PLAY', utcDate: match().utcDate, minute: 30, homeGoals: 1, awayGoals: 2, lastUpdated: '2026-11-04T18:15:00Z' } };
  expect(currentChampionsMatch(raw).score.fullTime).toEqual({ home: 1, away: 2 });
});

test.each(['57', 'cl:77'])('alert levels and explicit mute apply to %s', fixtureId => {
  const record = { studioPrefs: { [fixtureId]: { enabled: true, level: 'goals' } } };
  for (const kind of ['goal', 'goal-disallowed', 'full-time']) expect(studioAlertAllowed(record, fixtureId, kind)).toBe(true);
  for (const kind of ['lineup', 'kick-off', 'second-half', 'half-time']) expect(studioAlertAllowed(record, fixtureId, kind)).toBe(false);
  record.studioPrefs[fixtureId] = { enabled: false, level: 'all' };
  expect(studioAlertAllowed(record, fixtureId, 'goal')).toBe(false);
});

test('Champions League alerts require opting in, while existing Premier League defaults remain', () => {
  expect(studioAlertAllowed({}, 'cl:77', 'goal')).toBe(false);
  expect(studioAlertAllowed({}, '57', 'goal')).toBe(true);
});

function routes() {
  const source = fs.readFileSync('server.js', 'utf8');
  const handlers = {};
  let records = { user: { notifPrefs: { liveUpdates: true }, studioPrefs: { 'cl:77': { enabled: true, level: 'goals' } } } };
  const context = { app: { get: (path, ...args) => { handlers[`GET ${path}`] = args.at(-1); }, post: (path, ...args) => { handlers[`POST ${path}`] = args.at(-1); } },
    authMiddleware: () => {}, loadJson: () => JSON.parse(JSON.stringify(records)), saveJson: (_path, value) => { records = value; }, PUSH_SUBSCRIPTIONS_FILE: 'unused' };
  const start = source.indexOf('app.get("/api/live-studio/prefs"');
  const end = source.indexOf('app.get("/api/push/fixtures"', start);
  vm.runInNewContext(source.slice(start, end), context);
  const request = (method, body = {}) => {
    const response = { code: 200, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    handlers[`${method} /api/live-studio/prefs`]({ user: { id: 'user' }, body }, response);
    return response;
  };
  return { request, records: () => records };
}

test('server remembers per-match levels without replacing other alerts or account settings', () => {
  const api = routes();
  expect(api.request('GET').data.prefs['cl:77'].level).toBe('goals');
  expect(api.request('POST', { fixtureId: '57', enabled: false, level: 'all' }).code).toBe(200);
  expect(api.records().user.studioPrefs['cl:77']).toEqual({ enabled: true, level: 'goals' });
  expect(api.records().user.notifPrefs.liveUpdates).toBe(true);
  expect(api.request('POST', { fixtureId: 'cl:77', enabled: true, level: 'spam' }).code).toBe(400);
});

test('actual push dispatcher applies the level before reserving an event and never bypasses a mute', async () => {
  const source = fs.readFileSync('server.js', 'utf8');
  const record = { studioPrefs: { 'cl:77': { enabled: true, level: 'goals' } } };
  const reserve = jest.fn(() => true), send = jest.fn(async () => true);
  const context = { ...events, ...utils, studioAlertAllowed, loadJson: () => ({ user: record }), PUSH_SUBSCRIPTIONS_FILE: 'unused',
    getPushNotificationPrefs: () => ({ liveUpdates: true }), hasFixtureNotificationEnabled: () => false,
    reserveFixtureNotificationEvent: reserve, finishFixtureNotificationEvent: () => {},
    maybeApplyNoSpoilerFixturePayload: (_u, _f, _k, _e, payload) => payload, buildLiveStudioUrl: () => '/?view=liveStudio&fixtureId=cl%3A77', sendPushNotification: send };
  const start = source.indexOf('async function sendFixtureUpdateNotification('), end = source.indexOf('\nfunction findFixtureById(', start);
  vm.runInNewContext(`${source.slice(start, end)}; this.send = sendFixtureUpdateNotification;`, context);
  const payload = { title: 'Update', body: 'A confirmed match event.' };
  expect(await context.send('user', 'cl:77', 'half-time', '1-1', payload)).toBe(false);
  expect(reserve).not.toHaveBeenCalled();
  expect(await context.send('user', 'cl:77', 'goal', '1-2', payload)).toBe(true);
  record.studioPrefs['cl:77'].enabled = false;
  expect(await context.send('user', 'cl:77', 'goal', '1-3', payload)).toBe(false);
  expect(send).toHaveBeenCalledTimes(1);
});

test('the background worker polls Champions League and sends football-only results under separate IDs', async () => {
  const source = fs.readFileSync('server.js', 'utf8');
  const raw = { ...match(), status: 'FINISHED', minute: 90, utcDate: new Date(Date.now() - 110 * 60000).toISOString(),
    lastUpdated: new Date().toISOString(), score: { fullTime: { home: 1, away: 2 } } };
  const fetchMatches = jest.fn(async () => [raw, { ...raw, id: 999, utcDate: new Date(Date.now() - 10 * 86400000).toISOString() }, { ...raw, id: 1000, status: 'TIMED', utcDate: new Date(Date.now() + 10 * 86400000).toISOString() }]);
  const send = jest.fn(async () => true), saveResults = jest.fn();
  const context = { ...events, ...utils, ...require('./studioCompetitions'), console, Date,
    loadJson: () => ({}), PUSH_SUBSCRIPTIONS_FILE: "unused", liveNotifierStatus: {}, normalizeLeagueMode: mode => mode === 'worldcup' ? 'worldcup' : 'premier',
    loadFixturesFromSrc: () => [], loadWorldCupFixturesFromSrc: () => [], fetchLiveMatches: fetchMatches,
    getResultsFetchConfig: () => ({ cacheKey: 'champions' }), resultsCacheByKey: {}, resultsCacheAtByKey: {},
    loadResults: () => ({ 57: { homeGoals: 3, awayGoals: 0 } }), loadMatchStates: () => ({}), loadPredictions: () => ({}),
    findLocalFixtureForApiMatch: (m, fixtures) => fixtures.find(f => f.providerId === m.id),
    getMatchScoreForPrediction: require('./matchScoreUtils').getMatchScoreForPrediction,
    hasStartedMatchStatus: require('./matchScoreUtils').hasStartedMatchStatus,
    isFinalMatchStatus: status => status === 'FINISHED',
    mergeMatchStatePreservingEvents: events.mergeMatchPhaseState, enrichMatchStateWithSyntheticGoal: ({ matchState }) => matchState,
    getLivePushEventKind: () => 'goal', getLiveStudioNotificationUserIds: () => ['user'], buildLivePushHeader: () => 'Full time',
    formatLivePushScore: (fixture, home, away) => `${fixture.homeTeam} ${home}-${away} ${fixture.awayTeam}`,
    sendFixtureUpdateNotification: send, saveResults, saveMatchStates: jest.fn() };
  const start = source.indexOf('async function runLiveFixtureNotifier('), end = source.indexOf('\nsetInterval(runDeadlineNotifier', start);
  vm.runInNewContext(`${source.slice(start, end)}; this.run = runLiveFixtureNotifier;`, context);
  const summary = await context.run('test', 'champions');
  expect(summary.lastError).toBeNull();
  expect(fetchMatches).toHaveBeenCalledWith('champions');
  expect(summary.matchedFixtures).toBe(1);
  expect(saveResults).toHaveBeenCalledWith({ 57: { homeGoals: 3, awayGoals: 0 }, 'cl:77': { homeGoals: 1, awayGoals: 2 } });
  const final = send.mock.calls.find(call => call[2] === 'full-time');
  expect(final[1]).toBe('cl:77');
  expect(final[4].body).toBe('Fenerbahçe SK 1-2 Liverpool FC');
  expect(final[4].body).not.toMatch(/prediction|coins/i);
});

test('Champions League form uses the last five earlier completed games, with team IDs and home/away results', () => {
  const { buildChampionsForm } = require('./studioCompetitions');
  const current = match();
  const previous = Array.from({ length: 6 }, (_, i) => ({ id: 100 + i, utcDate: `2026-10-${String(i + 1).padStart(2, '0')}T18:00:00Z`,
    competition: { code: 'CL' }, status: 'FINISHED', homeTeam: { id: 1, name: 'Fenerbahçe SK' }, awayTeam: { id: 3, name: 'Opponent', tla: 'OPP' }, score: { fullTime: { home: 2, away: 0 } } }));
  previous.push({ ...previous[0], id: 200, utcDate: '2026-11-01T18:00:00Z', homeTeam: { id: 3, name: 'Opponent', tla: 'OPP' }, awayTeam: current.awayTeam, score: { fullTime: { home: 0, away: 0 } } });
  const form = buildChampionsForm(current, previous);
  expect(form.home.map(item => item.fixtureId)).toEqual(['cl:105', 'cl:104', 'cl:103', 'cl:102', 'cl:101']);
  expect(form.home[0]).toMatchObject({ outcome: 'W', opponentCode: 'OPP', venue: 'H', scoreText: '2-0' });
  expect(form.away).toEqual([expect.objectContaining({ outcome: 'D', venue: 'A', scoreText: '0-0' })]);
});

test('form excludes domestic games, this fixture, later results, unfinished games and missing scores', () => {
  const { buildChampionsForm } = require('./studioCompetitions');
  const current = match();
  const prior = { ...current, id: 1, utcDate: '2026-10-01T18:00:00Z', status: 'FINISHED', competition: { code: 'CL' }, score: { fullTime: { home: 2, away: 0 } } };
  const invalid = [
    { ...prior, competition: { code: 'PL' } }, { ...prior, id: current.id },
    { ...prior, utcDate: '2026-11-05T18:00:00Z' }, { ...prior, status: 'IN_PLAY' },
    { ...prior, score: { fullTime: { home: null, away: 0 } } },
    { ...prior, finishedAt: '2026-11-04T18:00:00Z' },
  ];
  expect(buildChampionsForm(current, invalid)).toEqual({ home: [], away: [] });
  expect(buildChampionsForm({ ...current, homeTeam: { name: 'Fenerbahçe SK' } }, [prior]).home).toEqual([]);
});

test('Studio supplies a countdown to the next Champions League game even beyond the live-fixture window', async () => {
  const source = fs.readFileSync('server.js', 'utf8'); let handler;
  const now = Date.now(), live = { ...match(), utcDate: new Date(now - 30 * 60000).toISOString() };
  const next = { ...match(), id: 88, status: 'TIMED', utcDate: new Date(now + 7 * 86400000).toISOString() };
  const context = { app: { get: (_path, callback) => { handler = callback; } }, Date, console,
    getResultsFetchConfig: () => ({ cacheKey: 'champions' }), getResultsCacheTtl: () => 60000,
    resultsCacheByKey: { champions: [live, next] }, resultsCacheAtByKey: { champions: now }, loadMatchStates: () => ({}),
    buildChampionsForm: require('./studioCompetitions').buildChampionsForm, normalizeLineups: () => null, championsFixture };
  const start = source.indexOf('app.get("/api/live-studio/matches"'), end = source.indexOf('app.get("/api/results"', start);
  vm.runInNewContext(source.slice(start, end), context);
  const response = { setHeader() {}, json(value) { this.data = value; } };
  await handler({ query: { competition: 'champions' } }, response);
  expect(response.data.matches.map(item => item.id)).toEqual([live.id]);
  expect(response.data.nextFixture).toMatchObject({ id: 'cl:88', kickoff: next.utcDate });
});

test('the quick overview route returns live games without waiting for detailed requests or reading match-state files', async () => {
  const source = fs.readFileSync('server.js', 'utf8'); let handler;
  const live = { ...match(), utcDate: new Date(Date.now() - 30 * 60000).toISOString() };
  const details = jest.fn(() => new Promise(() => {})), readStates = jest.fn();
  const context = { app: { get: (_path, callback) => { handler = callback; } }, Date, console, championsFixture,
    championsOverview: { get: async () => ({ matches: [live], updatedAt: Date.now(), stale: false }) },
    fetchLiveMatches: details, loadMatchStates: readStates };
  const start = source.indexOf('app.get("/api/live-studio/matches"'), end = source.indexOf('app.get("/api/results"', start);
  vm.runInNewContext(source.slice(start, end), context);
  const response = { setHeader() {}, json(value) { this.data = value; } };
  await handler({ query: { competition: 'champions', summary: '1' } }, response);
  expect(response.data.matches[0]).toMatchObject({ id: live.id, status: 'IN_PLAY' });
  expect(details).not.toHaveBeenCalled(); expect(readStates).not.toHaveBeenCalled();
});
