const fs = require("fs");
const vm = require("vm");
const utils = require("../notificationUtils");
const events = require("./liveMatchEvents");
const { getMatchScoreForPrediction, hasStartedMatchStatus } = require("./matchScoreUtils");

const starters = prefix => Array.from({ length: 11 }, (_, index) => ({ name: `${prefix} ${index + 1}` }));
const fixture = () => ({ id: 57, homeTeam: "Arsenal", awayTeam: "Chelsea", kickoff: new Date(Date.now() + 60 * 60000).toISOString() });
const state = () => ({ status: "TIMED", lineups: { home: { lineup: starters("Home") }, away: { lineup: starters("Away") } } });

test("both confirmed starting XIs produce a pre-match alert", () => {
  expect(utils.buildLineupAlert(fixture(), state())).toEqual({
    title: "Line-ups confirmed", body: "Arsenal vs Chelsea. Tap to view both starting XIs in Live Studio.",
  });
});

test.each(["IN_PLAY", "PAUSED", "FINISHED", "POSTPONED", "CANCELLED"])("never sends a lineup announcement for %s", status => {
  expect(utils.buildLineupAlert(fixture(), { ...state(), status })).toBeNull();
});

test("waits for both full starting XIs rather than an empty, partial or bench-only response", () => {
  for (const home of [{}, { lineup: starters("Home").slice(0, 10) }, { bench: starters("Bench") }, { lineup: Array(11).fill({ name: "" }) }]) {
    expect(utils.buildLineupAlert(fixture(), { ...state(), lineups: { ...state().lineups, home } })).toBeNull();
  }
});

test("does not replay stale lineups at kick-off or announce distant fixtures", () => {
  const now = Date.now();
  for (const delta of [0, -60000, 91 * 60000]) {
    expect(utils.buildLineupAlert({ ...fixture(), kickoff: new Date(now + delta).toISOString() }, state(), now)).toBeNull();
  }
  const moved = { ...state(), utcDate: new Date(now + 30 * 60000).toISOString() };
  expect(utils.buildLineupAlert({ ...fixture(), kickoff: "invalid" }, moved, now)).not.toBeNull();
});

function notifier({ fixtureBell = false } = {}) {
  const source = fs.readFileSync("server.js", "utf8");
  const fx = fixture();
  let states = {}, results = {}, subscriptions = { user: { notifPrefs: { liveUpdates: true } } };
  const copy = value => JSON.parse(JSON.stringify(value));
  const match = { id: fx.id, status: "TIMED", utcDate: fx.kickoff,
    homeTeam: { name: fx.homeTeam, lineup: starters("Home") },
    awayTeam: { name: fx.awayTeam, lineup: starters("Away") }, score: {} };
  const send = jest.fn(async () => true);
  const context = {
    ...utils, ...events, console, Date, liveNotifierStatus: {},
    normalizeLeagueMode: mode => mode, loadFixturesFromSrc: () => [fx], loadWorldCupFixturesFromSrc: () => [],
    fetchLiveMatches: async () => [match], getResultsFetchConfig: () => ({ cacheKey: "premier" }),
    resultsCacheByKey: {}, resultsCacheAtByKey: {},
    loadResults: () => copy(results), loadMatchStates: () => copy(states), loadPredictions: () => ({}),
    saveResults: value => { results = copy(value); }, saveMatchStates: value => { states = copy(value); },
    loadJson: () => copy(subscriptions), saveJson: (_file, value) => { subscriptions = copy(value); },
    PUSH_SUBSCRIPTIONS_FILE: "unused", findLocalFixtureForApiMatch: () => fx,
    getMatchScoreForPrediction, hasStartedMatchStatus, isFinalMatchStatus: status => status === "FINISHED",
    mergeMatchStatePreservingEvents: events.mergeMatchPhaseState, enrichMatchStateWithSyntheticGoal: ({ matchState }) => matchState,
    getLiveStudioNotificationUserIds: () => ["user"], getPushNotificationPrefs: () => subscriptions.user.notifPrefs,
    hasFixtureNotificationEnabled: () => fixtureBell,
    maybeApplyNoSpoilerFixturePayload: (_user, _fixture, _kind, _key, payload) => payload,
    buildLiveStudioUrl: id => `/?view=liveStudio&fixture=${id}`, sendPushNotification: send,
  };
  vm.createContext(context);
  for (const [start, end] of [
    ["function reserveFixtureNotificationEvent(", "\nfunction getPushNotificationPrefs("],
    ["async function sendFixtureUpdateNotification(", "\nfunction findFixtureById("],
    ["async function runLiveFixtureNotifier(", "\nsetInterval(runDeadlineNotifier"],
  ]) vm.runInContext(source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start))), context);
  return { run: () => context.runLiveFixtureNotifier("timer", "premier"), send, match,
    disableLive: () => { subscriptions.user.notifPrefs.liveUpdates = false; } };
}

test("the background worker sends once across repeated polls and lineup amendments", async () => {
  const { run, send, match } = notifier();
  await run();
  await run();
  match.homeTeam.lineup[0].name = "Replacement starter";
  await run();
  expect(send).toHaveBeenCalledTimes(1);
  expect(send).toHaveBeenCalledWith("user", "liveUpdates", expect.objectContaining({
    title: "Line-ups confirmed", tag: "57:lineup:confirmed", url: "/?view=liveStudio&fixture=57",
  }));
});

test("a failed lineup push retries on the next poll without requiring the app to be open", async () => {
  const { run, send } = notifier();
  send.mockResolvedValueOnce(false);
  await run();
  await run();
  await run();
  expect(send).toHaveBeenCalledTimes(2);
});

test("respects disabled Live Studio alerts when the fixture bell is also off", async () => {
  const { run, send, disableLive } = notifier();
  disableLive();
  await run();
  expect(send).not.toHaveBeenCalled();
});

test("a fixture bell still enables its lineup alert when global Live Studio alerts are off", async () => {
  const { run, send, disableLive } = notifier({ fixtureBell: true });
  disableLive();
  await run();
  expect(send).toHaveBeenCalledWith("user", "fixtureBell", expect.objectContaining({ tag: "57:lineup:confirmed" }));
});
