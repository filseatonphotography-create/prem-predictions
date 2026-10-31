const fs = require("fs");
const vm = require("vm");
const events = require("./liveMatchEvents");
const utils = require("../notificationUtils");
const { getMatchScoreForPrediction, hasStartedMatchStatus } = require("./matchScoreUtils");
const { buildLiveStudioEventHeader, buildLiveStudioRevealLine, getLiveStudioEvents, getVisibleLiveStudioEntries } = require("./App");
const source = fs.readFileSync("server.js", "utf8");
const goal = { type: "GOAL", minute: 34, teamName: "Manchester United FC", scorerName: "Matheus Cunha", homeGoals: 0, awayGoals: 1 };
const kickoff = "2026-10-31T12:30:00Z";
const fixture = { id: 560626, kickoff, homeTeam: "Chelsea FC", awayTeam: "Manchester United FC" };
const scored = { status: "IN_PLAY", minute: 34, utcDate: kickoff, homeGoals: 0, awayGoals: 1,
  lastUpdated: "2026-10-31T13:04:00Z", goalEvents: [goal], matchEvents: [goal] };
const corrected = { status: "PAUSED", minute: 45, utcDate: kickoff, homeGoals: 0, awayGoals: 0,
  halfTimeAt: "2026-10-31T13:19:00Z", lastUpdated: "2026-10-31T13:26:00Z", observedAt: "2026-10-31T13:26:00Z", goalEvents: [], matchEvents: [] };
const copy = value => JSON.parse(JSON.stringify(value));
function evaluate(context, start, end) {
  const from = source.indexOf(start);
  vm.runInNewContext(source.slice(from, source.indexOf(end, from)), context);
}

test("a removed provider goal retains the original report and adds one honest score correction", () => {
  const state = events.reconcileReportedGoals(scored, corrected);
  expect(state.goalEvents).toHaveLength(1);
  expect(getLiveStudioEvents(state).map(event => event.type)).toEqual(["GOAL_DISALLOWED", "GOAL"]);
  const correction = state.matchEvents.find(event => event.type === "GOAL_DISALLOWED");
  expect(correction).toMatchObject({ scoreCorrection: true, homeGoals: 0, awayGoals: 0, previousAwayGoals: 1 });
  expect(events.formatGoalMinute(correction)).toBe("");
  expect(events.getMatchEventMomentMs(fixture, correction, state)).toBeLessThan(Date.parse(corrected.halfTimeAt));
  expect(buildLiveStudioEventHeader({ fixture, event: correction, score: corrected })).toMatch(/Goal removed from score for MUN/);
  expect(buildLiveStudioRevealLine(fixture, corrected, correction)).toMatch(/Matheus Cunha.*no longer included/);
  expect(buildLiveStudioRevealLine(fixture, corrected, correction)).not.toMatch(/VAR|offside/);
  expect(getVisibleLiveStudioEntries([{ id: "goal:GOAL_DISALLOWED", updateKey: "560626:goal-disallowed:0-0", scoreCorrection: true }])).toHaveLength(1);
  expect(events.reconcileReportedGoals(state, corrected).matchEvents).toHaveLength(2);
  expect(events.mergeRecordedMatchState(corrected, scored).matchEvents).toHaveLength(2);
});

test("score changes with no recorded goal, missing scores, stale feeds and scheduled games invent no decision", () => {
  for (const incoming of [Object.assign({}, corrected, { homeGoals: null }),
    Object.assign({}, corrected, { status: "TIMED" }),
    Object.assign({}, corrected, { lastUpdated: "2026-10-31T13:00:00Z" })]) {
    expect(events.reconcileReportedGoals(scored, incoming).matchEvents).toHaveLength(1);
  }
  expect(events.reconcileReportedGoals({}, corrected).matchEvents).toEqual([]);
});

test("an explicit provider decision replaces the fallback without losing the reported goal", () => {
  const state = events.reconcileReportedGoals(scored, corrected);
  const decision = { type: "GOAL_DISALLOWED", minute: 36, homeGoals: 0, awayGoals: 0, reason: "VAR offside" };
  const next = events.reconcileReportedGoals(state, Object.assign({}, corrected, { matchEvents: [decision] }));
  const cancellation = next.matchEvents.find(event => event.type === "GOAL_DISALLOWED");
  expect(next.matchEvents).toHaveLength(2);
  expect(cancellation.scoreCorrection).toBeUndefined();
  expect(cancellation.synthetic).toBeUndefined();
  expect(cancellation.reason).toBe("VAR offside");
});

test("a later genuine goal restoring 0-1 remains separate from the removed Cunha goal", () => {
  const state = events.reconcileReportedGoals(scored, corrected);
  const later = Object.assign({}, goal, { minute: 60, scorerName: "Bruno Fernandes" });
  const next = events.reconcileReportedGoals(state, Object.assign({}, scored, {
    minute: 60, lastUpdated: "2026-10-31T13:45:00Z", goalEvents: [later], matchEvents: [later],
  }));
  expect(next.goalEvents).toHaveLength(2);
  expect(next.matchEvents.map(event => event.type)).toEqual(["GOAL", "GOAL_DISALLOWED", "GOAL"]);
});

test("the background notifier saves both reports and sends the missing correction once", async () => {
  let states = { 560626: copy(scored) }, results = { 560626: { homeGoals: 0, awayGoals: 1 } };
  const context = Object.assign({}, events, utils, {
    console, Date, liveNotifierStatus: {}, normalizeLeagueMode: mode => mode,
    loadFixturesFromSrc: () => [fixture], loadWorldCupFixturesFromSrc: () => [],
    fetchLiveMatches: async () => [{ id: fixture.id, status: "PAUSED", minute: 45, utcDate: kickoff,
      lastUpdated: corrected.lastUpdated, homeTeam: { name: fixture.homeTeam }, awayTeam: { name: fixture.awayTeam },
      score: { fullTime: { home: 0, away: 0 }, halfTime: { home: 0, away: 0 } }, goals: [] }],
    getResultsFetchConfig: () => ({ cacheKey: "test" }), resultsCacheByKey: {}, resultsCacheAtByKey: {},
    loadResults: () => copy(results), loadMatchStates: () => copy(states), loadPredictions: () => ({}),
    saveResults: next => { results = copy(next); }, saveMatchStates: next => { states = copy(next); },
    findLocalFixtureForApiMatch: () => fixture, getMatchScoreForPrediction, hasStartedMatchStatus,
    isFinalMatchStatus: () => false, getLiveStudioNotificationUserIds: () => ["user"],
    enrichMatchStateWithSyntheticGoal: ({ matchState }) => matchState,
    formatLivePushScore: (_fixture, home, away) => `CHE ${home}-${away} MUN`,
    buildLivePushHeader: () => "Goal removed from score for MUN", sendFixtureUpdateNotification: jest.fn(async () => true),
  });
  evaluate(context, "function getLivePushEventKind(", "\nfunction getMatchStateGoalEventCount(");
  evaluate(context, "function mergeMatchStateEventLists(", "\nasync function sendFixtureUpdateNotification(");
  evaluate(context, "async function runLiveFixtureNotifier(", "\nsetInterval(runDeadlineNotifier");
  expect((await context.runLiveFixtureNotifier("test", "premier")).lastError).toBeNull();
  const cancellation = context.sendFixtureUpdateNotification.mock.calls.filter(call => call[2] === "goal-disallowed");
  expect(cancellation).toHaveLength(1);
  expect(cancellation[0][4]).toMatchObject({ scoreCorrection: true, body: expect.stringContaining("no longer included") });
  expect(cancellation[0][4].body).not.toContain("VAR");
  expect(states[560626].matchEvents.map(event => event.type)).toEqual(["GOAL", "GOAL_DISALLOWED"]);
  await context.runLiveFixtureNotifier("test", "premier");
  expect(context.sendFixtureUpdateNotification.mock.calls.filter(call => call[2] === "goal-disallowed")).toHaveLength(1);
});
