const fs = require("fs");
const vm = require("vm");
const events = require("./liveMatchEvents");
const { getLiveStudioEvents, getVisibleLiveStudioEntries, mergeLiveStudioDeskHistory } = require("./App");
const fixture = { id: 560614, homeTeam: "Aston Villa FC", awayTeam: "Manchester City FC", kickoff: "2026-10-24T11:30:00Z" };
const alleged = { type: "GOAL_DISALLOWED", synthetic: true, estimatedMinute: true, reason: "VAR goal ruled out", teamName: fixture.homeTeam,
  previousHomeGoals: 1, previousAwayGoals: 0, homeGoals: 0, awayGoals: 0, minute: 13 };

test.each([[0, 0], [null, null], [1, 0]])("a reported score of %s-%s never manufactures a VAR event on either sender path", (homeGoals, awayGoals) => {
  const state = { status: "IN_PLAY", homeGoals, awayGoals, minute: 20, goalEvents: [], matchEvents: [] };
  const server = fs.readFileSync("server.js", "utf8");
  const context = { ...events, getMatchStateGoalEventCount: () => 0 };
  vm.createContext(context);
  vm.runInContext(server.slice(server.indexOf("function buildSyntheticGoalEvents("), server.indexOf("function mergeMatchStateEventLists(")), context);
  const result = context.enrichMatchStateWithSyntheticGoal({ matchState: state, fixture, prevHome: 1, prevAway: 0 });
  expect(events.normalizeMatchEvents(result).filter(event => event.type === "GOAL_DISALLOWED")).toEqual([]);

  const app = fs.readFileSync("src/App.js", "utf8");
  const browser = { ...events, getLiveMatchStateGoalEventCount: () => 0 };
  vm.createContext(browser);
  vm.runInContext(app.slice(app.indexOf("function buildSyntheticLiveGoalEvents("), app.indexOf("export function mergeFixtureOverrides(")), browser);
  const merged = browser.enrichMatchStateUpdatesWithSyntheticGoals({ 560614: state }, { 560614: { status: "IN_PLAY", homeGoals: 1, awayGoals: 0 } }, {}, [fixture]);
  expect(getLiveStudioEvents(merged[560614]).filter(event => event.type === "GOAL_DISALLOWED")).toEqual([]);
});

test("legacy inferred cancellations are filtered while explicit provider cancellations remain", () => {
  const confirmed = { ...alleged, synthetic: false, estimatedMinute: false, minute: 17 };
  const normalized = events.normalizeMatchEvents({ matchEvents: [alleged, confirmed] });
  expect(normalized).toHaveLength(1);
  expect(normalized[0]).toMatchObject({ synthetic: false, type: "GOAL_DISALLOWED", minute: 17 });
});

test("the actual push payload builder blocks inferred cancellations and does not invent VAR involvement", () => {
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("function buildLiveMatchEventPayload(");
  const context = {
    getLivePushEventKind: () => "goal-disallowed", formatLivePushMinute: () => "17'",
    buildLivePushHeader: () => "Goal ruled out", formatLivePushScore: () => "AVL 0-0 MCI",
  };
  vm.createContext(context);
  vm.runInContext(source.slice(start, source.indexOf("async function sendFixtureUpdateNotification(", start)), context);
  expect(context.buildLiveMatchEventPayload(fixture, alleged)).toBeNull();
  const payload = context.buildLiveMatchEventPayload(fixture, { ...alleged, synthetic: false });
  expect(payload.body).toContain("A goal has been disallowed");
  expect(payload.body).not.toContain("VAR");
});

test("old unverified VAR posts cannot survive in the saved Studio feed", () => {
  const cached = { id: "560614:GOAL_DISALLOWED:13:0", updateKey: "560614:goal-disallowed:0-0", title: "Goal ruled out" };
  expect(getVisibleLiveStudioEntries([cached])).toEqual([]);
  expect(mergeLiveStudioDeskHistory([cached], [])).toEqual([]);
  const confirmed = { ...cached, providerConfirmed: true };
  expect(getVisibleLiveStudioEntries([confirmed])).toEqual([confirmed]);
  expect(mergeLiveStudioDeskHistory([confirmed], [])).toEqual([confirmed]);
});
