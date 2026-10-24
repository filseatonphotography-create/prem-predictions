const fs = require("fs");
const vm = require("vm");
const utils = require("../notificationUtils");
const events = require("./liveMatchEvents");
const { getMatchScoreForPrediction, hasStartedMatchStatus } = require("./matchScoreUtils");

const source = fs.readFileSync("server.js", "utf8");
function evaluate(context, start, end, name) {
  vm.runInNewContext(`${source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)))}; this.subject = ${name};`, context);
  return context.subject;
}
const copy = value => JSON.parse(JSON.stringify(value));

test("a completed deadline send preserves concurrent device removals, preferences and live event logs", async () => {
  const kickoff = Date.now() + 2 * 60 * 60000 - 30000;
  const device = { endpoint: "https://push.example/device" };
  let data = { user: { subscriptions: [device], notifPrefs: {}, notifLog: {} } };
  let complete;
  const context = {
    Date, loadMatchStates: () => ({}),
    applyMatchStateKickoffOverrides: fixtures => fixtures,
    loadFixturesFromSrc: () => [{ id: 1, gameweek: 9, kickoff: new Date(kickoff).toISOString(), homeTeam: "Arsenal", awayTeam: "Chelsea" }],
    loadWorldCupFixturesFromSrc: () => [],
    loadJson: () => copy(data), saveJson: (_file, value) => { data = copy(value); },
    PUSH_SUBSCRIPTIONS_FILE: "unused", hasDeviceSubscription: record => utils.getDeviceSubscriptions(record).length > 0,
    sendPushNotification: jest.fn(() => new Promise(resolve => { complete = resolve; })),
  };
  const run = evaluate(context, "function runDeadlineNotifier()", "\nasync function fetchLiveMatches(", "runDeadlineNotifier");
  run();
  expect(context.sendPushNotification).toHaveBeenCalledTimes(1);
  data = {
    user: { subscriptions: [], notifPrefs: { liveUpdates: false }, lastDelivery: { failedCount: 1 },
      notifLog: { fixtureUpdates: { "1:goal:1-0": { state: "accepted" } } } },
    anotherUser: { subscriptions: [device] },
  };
  complete(true);
  await Promise.resolve();
  expect(data.user.subscriptions).toEqual([]);
  expect(data.user.notifPrefs).toEqual({ liveUpdates: false });
  expect(data.user.lastDelivery).toEqual({ failedCount: 1 });
  expect(data.user.notifLog.fixtureUpdates["1:goal:1-0"].state).toBe("accepted");
  expect(data.user.notifLog.deadline1h["premier-gw-9"]).toEqual(expect.any(Number));
  expect(data.anotherUser.subscriptions).toEqual([device]);
});

test.each(["liveUpdates", "deadline1h", "deadline24h"])("%s requests immediate delivery with a bounded expiry", async type => {
  const device = { endpoint: "https://push.example/device" };
  let data = { user: { subscriptions: [device] } };
  const context = {
    ...utils, loadJson: () => copy(data), saveJson: (_file, value) => { data = value; },
    PUSH_SUBSCRIPTIONS_FILE: "unused", webpush: { sendNotification: jest.fn(async () => {}) }, console,
  };
  const send = evaluate(context, "async function sendPushNotification(", "\n// ---------------------------------------------------------------------------", "sendPushNotification");
  expect(await send("user", type, { title: "Update", body: "Test" })).toBe(true);
  expect(context.webpush.sendNotification).toHaveBeenCalledWith(device, expect.any(String), {
    timeout: 10000, urgency: "high", TTL: type === "liveUpdates" ? 300 : 900,
  });
});

test("background polls send goal, half-time and full-time without any browser requests", async () => {
  const fixture = { id: 1, homeTeam: "Arsenal", awayTeam: "Chelsea", kickoff: new Date(Date.now() - 115 * 60000).toISOString() };
  let states = { 1: { status: "IN_PLAY", homeGoals: 0, awayGoals: 0 } };
  let results = { 1: { homeGoals: 0, awayGoals: 0 } };
  let match;
  const context = {
    ...utils, ...events, console, Date,
    liveNotifierStatus: { fetchedMatches: 380, lastFinishedAt: "previous poll", competitionErrors: { worldcup: "previous provider error" } },
    normalizeLeagueMode: mode => mode, loadFixturesFromSrc: () => [fixture], loadWorldCupFixturesFromSrc: () => [],
    fetchLiveMatches: async () => [match], getResultsFetchConfig: () => ({ cacheKey: "premier" }),
    resultsCacheByKey: {}, resultsCacheAtByKey: {},
    loadResults: () => copy(results), loadMatchStates: () => copy(states), loadPredictions: () => ({}),
    saveResults: next => { results = copy(next); }, saveMatchStates: next => { states = copy(next); },
    findLocalFixtureForApiMatch: () => fixture, getMatchScoreForPrediction, hasStartedMatchStatus,
    isFinalMatchStatus: status => status === "FINISHED",
    mergeMatchStatePreservingEvents: events.mergeMatchPhaseState,
    enrichMatchStateWithSyntheticGoal: ({ matchState }) => matchState,
    getLiveStudioNotificationUserIds: () => ["user"],
    getLivePushEventKind: event => String(event.type).toLowerCase(),
    getLivePushEventKeyPart: event => String(event.minute),
    buildLivePushHeader: ({ eventKind }) => eventKind,
    formatLivePushMinute: () => "26'",
    sendFixtureUpdateNotification: jest.fn(async () => true),
  };
  const run = evaluate(context, "async function runLiveFixtureNotifier(", "\nsetInterval(runDeadlineNotifier", "runLiveFixtureNotifier");
  for (const status of ["IN_PLAY", "PAUSED", "FINISHED"]) {
    match = { id: 1, homeTeam: { name: "Arsenal" }, awayTeam: { name: "Chelsea" }, status,
      utcDate: fixture.kickoff, lastUpdated: new Date().toISOString(),
      score: { fullTime: { home: 1, away: 0 } } };
    const previousStatus = copy(context.liveNotifierStatus);
    const pending = run("timer", "premier");
    // While the provider is pending, the popup must retain useful completed
    // counts and errors instead of resetting everything to a misleading zero.
    expect(context.liveNotifierStatus.fetchedMatches).toBe(previousStatus.fetchedMatches);
    expect(context.liveNotifierStatus.lastFinishedAt).toBe(previousStatus.lastFinishedAt);
    expect(context.liveNotifierStatus.competitionErrors).toEqual(previousStatus.competitionErrors);
    const summary = await pending;
    expect(summary.lastError).toBeNull();
    expect(summary.acceptedNotifications).toBe(1);
  }
  expect(context.sendFixtureUpdateNotification.mock.calls.map(call => call[2])).toEqual(["goal", "half-time", "full-time"]);
});

function testRoute(devices = [{ endpoint: "https://push.example/device" }]) {
  let handler;
  const schedule = jest.fn();
  const send = jest.fn(async () => true);
  const context = {
    app: { post: (_path, _auth, callback) => { handler = callback; } },
    authMiddleware: () => {}, setTimeout: schedule, sendPushNotification: send,
    loadJson: () => ({ user: { subscriptions: devices } }),
    getDeviceSubscriptions: utils.getDeviceSubscriptions, PUSH_SUBSCRIPTIONS_FILE: "unused", console,
  };
  const start = source.indexOf('app.post("/api/push/test",');
  const end = source.indexOf('\napp.post("/api/push/fixture-test",', start);
  vm.runInNewContext(source.slice(start, end), context);
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn() };
  return { handler, schedule, send, res };
}

test("background test is scheduled on the server and sends only after the delay", async () => {
  const { handler, schedule, send, res } = testRoute();
  await handler({ user: { id: "user" }, body: { delaySeconds: 15 } }, res);
  expect(res.json).toHaveBeenCalledWith({ ok: true, scheduled: true, delaySeconds: 15, deviceCount: 1 });
  expect(send).not.toHaveBeenCalled();
  expect(schedule).toHaveBeenCalledWith(expect.any(Function), 15000);
  schedule.mock.calls[0][0]();
  expect(send).toHaveBeenCalledWith("user", "test", expect.objectContaining({ title: "Background notification test" }));
});

test.each(["15", -1, 60])("rejects an unsupported test delay (%s)", async delaySeconds => {
  const { handler, schedule, res } = testRoute();
  await handler({ user: { id: "user" }, body: { delaySeconds } }, res);
  expect(res.status).toHaveBeenCalledWith(400);
  expect(schedule).not.toHaveBeenCalled();
});

test("does not claim to schedule a test without a registered device", async () => {
  const { handler, schedule, res } = testRoute([]);
  await handler({ user: { id: "user" }, body: { delaySeconds: 15 } }, res);
  expect(res.status).toHaveBeenCalledWith(410);
  expect(schedule).not.toHaveBeenCalled();
});

test("the immediate test remains compatible with clients that send no body", async () => {
  const { handler, schedule, send, res } = testRoute();
  await handler({ user: { id: "user" } }, res);
  expect(send).toHaveBeenCalledTimes(1);
  expect(schedule).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith({ ok: true, deviceCount: 1 });
});
