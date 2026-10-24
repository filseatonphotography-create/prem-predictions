const fs = require("fs");
const vm = require("vm");
const { deliverWebPush, pushFailureDetails } = require("../pushTransport");
const { mergeMatchPhaseState } = require("./liveMatchEvents");
const { hasStartedMatchStatus, getMatchScoreForPrediction } = require("./matchScoreUtils");

test("the actual notifier publishes confirmed half-time before waiting for push delivery", async () => {
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("async function runLiveFixtureNotifier(");
  const end = source.indexOf("\nsetInterval(runDeadlineNotifier", start);
  const fixture = { id: 1, homeTeam: "Arsenal", awayTeam: "Chelsea", kickoff: "2026-10-18T13:00:00Z" };
  const match = { id: 1, homeTeam: { name: "Arsenal" }, awayTeam: { name: "Chelsea" }, status: "PAUSED", minute: 45, utcDate: fixture.kickoff, score: { fullTime: { home: 0, away: 0 } } };
  let deliver;
  const saveStates = jest.fn(), saveResults = jest.fn();
  const context = {
    liveNotifierStatus: {}, normalizeLeagueMode: m => m, loadFixturesFromSrc: () => [fixture], loadWorldCupFixturesFromSrc: () => [],
    fetchLiveMatches: async () => [match], getResultsFetchConfig: () => ({ cacheKey: "test" }), resultsCacheByKey: {}, resultsCacheAtByKey: {},
    normalizeGoalEvents: () => [], normalizeMatchEvents: () => [], normalizeLineups: () => null,
    loadResults: () => ({ 1: { homeGoals: 0, awayGoals: 0 } }), loadMatchStates: () => ({ 1: { status: "IN_PLAY" } }), loadPredictions: () => ({}),
    findLocalFixtureForApiMatch: () => fixture, getMatchScoreForPrediction, numeric: value => value == null ? null : Number(value),
    isFinalMatchStatus: () => false, getPreviousLiveScore: () => ({ hadScoreBefore: true, prevHome: 0, prevAway: 0 }),
    mergeMatchStatePreservingEvents: mergeMatchPhaseState, enrichMatchStateWithSyntheticGoal: ({ matchState }) => matchState,
    hasStartedMatchStatus, getLiveStudioNotificationUserIds: () => ["user"],
    buildLivePushHeader: () => "Half-time!", sendFixtureUpdateNotification: jest.fn(() => new Promise(resolve => { deliver = resolve; })),
    saveMatchStates: saveStates, saveResults, console: { error: jest.fn() },
  };
  vm.runInNewContext(`${source.slice(start, end)}; this.run = runLiveFixtureNotifier;`, context);
  let finished = false;
  const running = context.run("test", "premier").then(result => { finished = true; return result; });
  for (let i = 0; i < 20; i++) await Promise.resolve();
  expect(finished).toBe(false);
  expect(saveStates).toHaveBeenCalledWith({ 1: expect.objectContaining({ status: "PAUSED", halfTimeAt: expect.any(String) }) });
  expect(context.liveNotifierStatus.lastPublishedAt).toEqual(expect.any(String));
  deliver(true);
  expect((await running).acceptedNotifications).toBe(1);
});

test("device delivery has a timeout so an unresponsive push service cannot block polling indefinitely", async () => {
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("async function sendPushNotification(");
  const end = source.indexOf("\n// ---------------------------------------------------------------------------", start);
  const device = { endpoint: "https://push.example.test/device" };
  const record = { user: { subscriptions: [device] } };
  const send = jest.fn(async () => {});
  const context = {
    deliverWebPush, pushFailureDetails, loadJson: () => record, saveJson: jest.fn(), PUSH_SUBSCRIPTIONS_FILE: "unused", getDeviceSubscriptions: sub => sub?.subscriptions || [],
    isPushTypeEnabled: () => true, webpush: { sendNotification: send }, console: { error: jest.fn() },
  };
  vm.runInNewContext(`${source.slice(start, end)}; this.send = sendPushNotification;`, context);
  expect(await context.send("user", "liveUpdates", { title: "Half-time" })).toBe(true);
  expect(send).toHaveBeenCalledWith(device, JSON.stringify({ title: "Half-time" }), {
    timeout: 10000, urgency: "high", TTL: 300, agent: expect.anything(),
  });
});

test("the notifier clears a retained clock when the provider stops supplying a minute", async () => {
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("async function runLiveFixtureNotifier(");
  const end = source.indexOf("\nsetInterval(runDeadlineNotifier", start);
  const fixture = { id: 560606, homeTeam: "Tottenham", awayTeam: "Coventry", kickoff: "2026-10-19T19:00:00Z" };
  const match = { id: fixture.id, homeTeam: { name: fixture.homeTeam }, awayTeam: { name: fixture.awayTeam }, status: "IN_PLAY", minute: null, utcDate: fixture.kickoff, score: { fullTime: { home: 1, away: 0 } } };
  const saveStates = jest.fn();
  const context = {
    liveNotifierStatus: {}, normalizeLeagueMode: m => m, loadFixturesFromSrc: () => [fixture], loadWorldCupFixturesFromSrc: () => [],
    fetchLiveMatches: async () => [match], getResultsFetchConfig: () => ({ cacheKey: "test" }), resultsCacheByKey: {}, resultsCacheAtByKey: {},
    normalizeGoalEvents: () => [], normalizeMatchEvents: () => [], normalizeLineups: () => null,
    loadResults: () => ({ [fixture.id]: { homeGoals: 1, awayGoals: 0 } }), loadMatchStates: () => ({ [fixture.id]: { status: "IN_PLAY", minute: 0 } }), loadPredictions: () => ({}),
    findLocalFixtureForApiMatch: () => fixture, getMatchScoreForPrediction, numeric: value => value == null ? null : Number(value),
    isFinalMatchStatus: () => false, getPreviousLiveScore: () => ({ hadScoreBefore: true, prevHome: 1, prevAway: 0 }),
    mergeMatchStatePreservingEvents: mergeMatchPhaseState, enrichMatchStateWithSyntheticGoal: ({ matchState }) => matchState,
    hasStartedMatchStatus, getLiveStudioNotificationUserIds: () => [], saveMatchStates: saveStates, saveResults: jest.fn(), console: { error: jest.fn() },
  };
  vm.runInNewContext(`${source.slice(start, end)}; this.run = runLiveFixtureNotifier;`, context);
  await context.run("test", "premier");
  expect(saveStates).toHaveBeenCalledWith({ [fixture.id]: expect.objectContaining({ status: "IN_PLAY", minute: null }) });
});
