import { act, renderHook } from "@testing-library/react";
import useLiveStudioFeedOrder, { orderLiveStudioUpdates } from "./liveStudioFeedOrder";
const { getMatchEventMomentMs, mergeMatchPhaseState } = require("./liveMatchEvents");
const { useLiveStudioCommentaryHistory, getLiveStudioGoalArrivalKey } = require("./App");
const at = time => Date.parse(`2026-10-17T${time}:00Z`);
const villa = { id: 560607, kickoff: "2026-10-17T16:30:00Z" };
const chelsea = { id: 560603, kickoff: "2026-10-17T11:30:00Z" };
const fulham = { id: 560602, kickoff: "2026-10-17T14:00:00Z" };
const fixtureEntry = (id, fixture, event, state = {}) => ({
  id, fixtureId: fixture.id, fixture, title: id, lines: [id],
  fullTime: event.statusLabel === "FT", sortMinute: event.minute,
  momentMs: getMatchEventMomentMs(fixture, event, state),
});

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(at("17:46")); sessionStorage.clear(); localStorage.clear(); });
afterEach(() => jest.useRealTimers());

test("a mixed matchday is chronological on first load, even when history arrives last", () => {
  const lineup = fixtureEntry("lineup", villa, { type: "LINEUPS" });
  const kickoff = fixtureEntry("kickoff", villa, { statusLabel: "KO", minute: 0 });
  const goal = fixtureEntry("goal", villa, { minute: 36 });
  const restart = fixtureEntry("restart", villa, { statusLabel: "SH", minute: 45 }, { secondHalfAt: "2026-10-17T17:34:10Z" });
  const booking = fixtureEntry("booking", villa, { minute: 55 }, { secondHalfAt: "2026-10-17T17:34:10Z" });
  const oldFinal = fixtureEntry("old-final", fulham, { statusLabel: "FT", minute: 90 }, { finishedAt: "2026-10-17T17:55:57Z", observedAt: "2026-10-17T17:44:56Z" });
  const earlyFinal = fixtureEntry("chelsea-final", chelsea, { statusLabel: "FT", minute: 90 }, { finishedAt: "2026-10-17T15:35:41Z" });
  const half = { id: `studio:half-time:${villa.kickoff}`, momentMs: at("17:18") };
  const oldDesk = { id: "studio:roundup:old", momentMs: at("15:30") };
  const feed = [oldFinal, earlyFinal, kickoff, goal, restart, half, lineup, oldDesk, booking];
  const expected = ["booking", "restart", half.id, "goal", "kickoff", "old-final", "lineup", oldDesk.id, "chelsea-final"];
  expect(orderLiveStudioUpdates(feed).entries.map(e => e.id)).toEqual(expected);
  const enriched = feed.map(e => e.fullTime || e.id === "kickoff" ? { ...e, lines: ["Phil has a new points total"], tableSnapshot: { currentRows: [] } } : e);
  expect(orderLiveStudioUpdates(enriched.reverse()).entries.map(e => e.id)).toEqual(expected);
});

test("saved bad arrival sequences cannot override chronology after a reload", () => {
  sessionStorage.setItem("live-studio-order:v1:test", JSON.stringify({ counter: 100, updates: { final: { sequence: 100 } } }));
  const final = { id: "final", momentMs: at("16:00") };
  const goal = { id: "goal", momentMs: at("17:06") };
  const first = renderHook(() => useLiveStudioFeedOrder([final, goal], "test", true));
  expect(first.result.current).toEqual([goal, final]);
  first.unmount();
  expect(renderHook(() => useLiveStudioFeedOrder([final, goal], "test", true)).result.current).toEqual([goal, final]);
});

test("cached invalid final times and studio break times are repaired on upgrade", () => {
  const final = { id: "old-final", fixture: fulham, fixtureId: fulham.id, fullTime: true, momentMs: at("19:00"), sortMinute: 90 };
  const half = { id: "studio:half-time:2026-10-17T14:00:00Z", momentMs: at("17:30") };
  const goal = fixtureEntry("goal", villa, { minute: 36 });
  sessionStorage.setItem("live-studio-commentary:v1:upgrade", JSON.stringify([final, half]));
  const { result } = renderHook(() => useLiveStudioCommentaryHistory([goal], "upgrade"));
  expect(result.current.map(e => e.id)).toEqual(["goal", half.id]);
});

test("a real later final whistle goes above the goal", () => {
  const goal = fixtureEntry("goal", villa, { minute: 36 });
  jest.setSystemTime(at("18:25"));
  const final = fixtureEntry("final", villa, { statusLabel: "FT", minute: 90 }, { finishedAt: "2026-10-17T18:24:00Z" });
  expect(orderLiveStudioUpdates([goal, final]).entries[0]).toBe(final);
});

test("restart is at the break's end even when joining after the second half started", () => {
  const state = mergeMatchPhaseState({}, { status: "IN_PLAY", minute: 57 }, "2026-10-17T17:44:00Z");
  const restart = getMatchEventMomentMs(villa, { statusLabel: "SH", minute: 45 }, state);
  expect(restart).toBe(at("17:32"));
  const later = mergeMatchPhaseState(state, { status: "IN_PLAY", minute: 62 }, "2026-10-17T17:49:00Z");
  expect(getMatchEventMomentMs(villa, { statusLabel: "SH", minute: 45 }, later)).toBe(restart);
  expect(getMatchEventMomentMs(villa, { minute: 55 }, state)).toBe(at("17:42"));
  expect(getMatchEventMomentMs(villa, { statusLabel: "SH", minute: 45 })).toBe(at("17:30"));
});

test("the whistles stay above stoppage-time action when phase timestamps are missing", () => {
  jest.setSystemTime(at("18:40"));
  const firstHalfGoal = { type: "GOAL", minute: 45, injuryTime: 8 };
  const finalGoal = { type: "GOAL", minute: 90, injuryTime: 12 };
  const state = { matchEvents: [firstHalfGoal, finalGoal], finishedAt: "2026-10-17T20:30:00Z" };
  expect(getMatchEventMomentMs(villa, { statusLabel: "HT", minute: 45 }, state))
    .toBeGreaterThan(getMatchEventMomentMs(villa, firstHalfGoal, state));
  expect(getMatchEventMomentMs(villa, { statusLabel: "FT", minute: 90 }, state))
    .toBeGreaterThan(getMatchEventMomentMs(villa, finalGoal, state));
});


test("updates arriving after the next game's lineups go above them and never move on refresh or reload", () => {
  const lineup = { id: "next:lineups", updateKey: "next:lineup", momentMs: at("18:29"), title: "Next game lineups" };
  const earlier = { id: "earlier", momentMs: at("17:00") };
  const initial = [lineup, earlier];
  const { result, rerender, unmount } = renderHook(({ feed }) => useLiveStudioFeedOrder(feed, "arrival", true), { initialProps: { feed: initial } });
  expect(result.current.map(entry => entry.id)).toEqual([lineup.id, earlier.id]);
  const kinds = ["goal", "yellow-card", "substitution", "studio:checkpoint:20", "second-half", "full-time"];
  const received = [];
  for (const kind of kinds) {
    const entry = { id: kind, updateKey: `live:${kind}`, momentMs: at("17:05"), title: kind };
    received.unshift(entry);
    act(() => rerender({ feed: [lineup, earlier, ...received].reverse() }));
    expect(result.current.map(post => post.id)).toEqual([...received.map(post => post.id), lineup.id, earlier.id]);
  }
  const expected = result.current.map(post => post.updateKey || post.id);
  const enriched = [...received, lineup, earlier].reverse().map((post, index) => ({ ...post, momentMs: at("19:00") + index * 60000, title: "Updated details", lines: ["New scorer or player points"] }));
  act(() => rerender({ feed: enriched }));
  expect(result.current.map(post => post.updateKey || post.id)).toEqual(expected);
  unmount();
  // A thin first response after reload must not re-seed a different order.
  const restored = renderHook(({ feed }) => useLiveStudioFeedOrder(feed, "arrival", true), { initialProps: { feed: [lineup] } });
  act(() => restored.rerender({ feed: enriched.reverse() }));
  expect(restored.result.current.map(post => post.updateKey || post.id)).toEqual(expected);
});

test("a provisional goal gaining a scorer and corrected minute stays in its original position", () => {
  const goal = { id: "synthetic", updateKey: "match:goal:1-0", momentMs: at("17:01") };
  const lineup = { id: "lineup", updateKey: "next:lineup", momentMs: at("18:29") };
  const { result, rerender } = renderHook(({ feed }) => useLiveStudioFeedOrder(feed, "enrichment"), { initialProps: { feed: [goal] } });
  act(() => rerender({ feed: [goal, lineup] }));
  const enriched = { ...goal, id: "provider-goal", momentMs: at("19:00"), title: "Scorer confirmed" };
  act(() => rerender({ feed: [enriched, lineup] }));
  expect(result.current).toEqual([lineup, enriched]);
});

test("a later final roundup is a new arrival, while corrections to the same results stay put", () => {
  const final = ids => ({ id: "studio:closing", momentMs: at("16:00"), roundupMatches: ids.map(id => ({ fixture: { id } })) });
  const first = final([1]);
  const goal = { id: "goal", momentMs: at("17:01") };
  const seeded = orderLiveStudioUpdates([first]);
  const live = orderLiveStudioUpdates([goal], seeded.state);
  const finish = orderLiveStudioUpdates([goal, final([1, 2])], live.state);
  expect(finish.entries[0].id).toBe("studio:closing");
  const next = orderLiveStudioUpdates([goal, { ...final([2, 1]), title: "Corrected points" }], finish.state);
  expect(next.state.counter).toBe(finish.state.counter);
});


test("a new goal restoring the same score after VAR gets its own arrival above intervening updates", () => {
  const fixture = { id: 1, homeTeam: "Arsenal", awayTeam: "Chelsea" };
  const first = { type: "GOAL", minute: 6, homeGoals: 0, awayGoals: 1 };
  const reversed = { type: "GOAL_DISALLOWED", minute: 8, homeGoals: 0, awayGoals: 0, previousHomeGoals: 0, previousAwayGoals: 1 };
  const later = { ...first, minute: 10 };
  const events = [first, reversed, later], updateKey = "1:goal:0-1", score = { homeGoals: 0, awayGoals: 1 };
  const old = { id: "first", arrivalKey: getLiveStudioGoalArrivalKey(fixture, first, events, updateKey, score) };
  const next = { id: "later", arrivalKey: getLiveStudioGoalArrivalKey(fixture, later, events, updateKey, score) };
  expect(next.arrivalKey).not.toBe(old.arrivalKey);
  const seeded = orderLiveStudioUpdates([old, { id: "booking" }]);
  expect(orderLiveStudioUpdates([old, { id: "booking" }, next], seeded.state).entries[0]).toBe(next);
});


test("legacy future-dated lineups and late reconstructed second-half posts are repaired once without moving other updates", () => {
  const goal = { id: "goal", momentMs: at("16:50") };
  const lineup = { id: "lineup", lineups: {}, momentMs: at("17:30") };
  const booking = { id: "booking", momentMs: at("17:45") };
  const restart = { id: "restart", backfilled: true, momentMs: at("17:05") };
  const previous = { counter: 9, updates: { goal: 1, lineup: 8, booking: 3, restart: 9 } };
  const fixed = orderLiveStudioUpdates([lineup, restart, goal, booking], previous);
  expect(fixed.entries).toEqual([booking, lineup, restart, goal]);
  expect(orderLiveStudioUpdates([goal, booking, restart, lineup], fixed.state).entries).toEqual(fixed.entries);
  const lateGoal = { id: "lateGoal", momentMs: at("17:10") };
  expect(orderLiveStudioUpdates([...fixed.entries, lateGoal], fixed.state).entries).toEqual([lateGoal, ...fixed.entries]);
});

test("a restart actually published at the start of the half keeps its position when the game later reaches 84 minutes", () => {
  const lineup = { id: "lineup", momentMs: at("17:30"), lineups: {} };
  const restart = { id: "restart", momentMs: at("17:35") };
  const first = orderLiveStudioUpdates([lineup, restart]);
  const later = orderLiveStudioUpdates([lineup, { ...restart, backfilled: true }], first.state);
  expect(later.entries.map(entry => entry.id)).toEqual(["restart", "lineup"]);
});

test("loading a league does not reset the shared arrival order", () => {
  const lineup = { id: "lineup", momentMs: at("18:29") };
  const goal = { id: "goal", momentMs: at("17:40") };
  const { result, rerender } = renderHook(({ feed, scope }) => useLiveStudioCommentaryHistory(feed, scope, true, "shared-matchday"), { initialProps: { feed: [lineup], scope: "loading-league" } });
  act(() => rerender({ feed: [lineup, goal], scope: "loading-league" }));
  expect(result.current).toEqual([goal, lineup]);
  act(() => rerender({ feed: [lineup, goal], scope: "originals-league" }));
  expect(result.current).toEqual([goal, lineup]);
});


test("a corrupt studio-only ledger is rebuilt after hydration, with match updates between every check-in", () => {
  const scope = "repair-matchday";
  const post = (id, time) => ({ id, momentMs: at(time), lines: [id] });
  const posts = [post("studio:checkpoint:20", "14:25"), post("goal-30", "14:30"),
    post("studio:half-time:2026-10-17T14:00:00Z", "14:47"), post("booking-50", "15:05"),
    post("studio:checkpoint:60", "15:15"), post("goal-65", "15:20"),
    post("studio:checkpoint:75", "15:30"), post("sub-80", "15:35"),
    post("studio:checkpoint:85", "15:40"), post("goal-90", "15:45"),
    post("studio:closing", "15:50"), post("later-kickoff", "16:30")];
  const oldStudio = posts.filter(post => post.id.startsWith("studio:"));
  sessionStorage.setItem(`live-studio-commentary:v1:${scope}`, JSON.stringify(oldStudio));
  sessionStorage.setItem(`live-studio-order:v2:${scope}`, JSON.stringify({ counter: 99, updates: Object.fromEntries([...oldStudio].reverse().map((post, index) => [post.id, 90 + index])) }));
  const { result, rerender, unmount } = renderHook(({ feed, ready }) => useLiveStudioCommentaryHistory(feed, scope, true, scope, ready), { initialProps: { feed: [], ready: false } });
  expect(sessionStorage.getItem(`live-studio-order:v3:${scope}`)).toBeNull();
  act(() => rerender({ feed: posts.filter(post => !post.id.startsWith("studio:")), ready: true }));
  const expected = [...posts].reverse().map(post => post.id);
  expect(result.current.map(post => post.id)).toEqual(expected);
  const fresh = post("fresh-goal", "16:32");
  act(() => rerender({ feed: [fresh], ready: true }));
  expect(result.current.map(post => post.id)).toEqual([fresh.id, ...expected]);
  unmount();
  const restored = renderHook(({ ready }) => useLiveStudioCommentaryHistory([], scope, true, scope, ready), { initialProps: { ready: false } });
  act(() => restored.rerender({ ready: true }));
  expect(restored.result.current.map(post => post.id)).toEqual([fresh.id, ...expected]);
});

test("a page restart preserves arrival order even when its tab session is recreated", () => {
  const lineup = { id: "lineup", momentMs: at("18:29") };
  const goal = { id: "goal", momentMs: at("17:40") };
  const { result, rerender, unmount } = renderHook(({ feed }) => useLiveStudioFeedOrder(feed, "restart"), { initialProps: { feed: [lineup] } });
  act(() => rerender({ feed: [lineup, goal] }));
  expect(result.current).toEqual([goal, lineup]);
  unmount(); sessionStorage.clear();
  const restarted = renderHook(() => useLiveStudioFeedOrder([lineup, goal], "restart"));
  expect(restarted.result.current).toEqual([goal, lineup]);
});

test("late Arsenal and Coventry kick-offs are inserted below subsequent action and repair saved arrival positions", () => {
  const arsenal = { id: "arsenal:KICK_OFF:0:0", updateKey: "arsenal:kick-off:0-0", kickoff: true, momentMs: at("14:00") };
  const coventry = { id: "coventry:KICK_OFF:0:0", updateKey: "coventry:kick-off:0-0", kickoff: true, momentMs: at("14:00") };
  const goal = { id: "arsenal:goal", momentMs: at("14:07") };
  const earlier = { id: "earlier-result", momentMs: at("13:25") };
  const first = orderLiveStudioUpdates([earlier, goal]);
  const late = orderLiveStudioUpdates([arsenal, coventry, earlier, goal], first.state);
  expect(late.entries[0]).toBe(goal);
  expect(late.entries.at(-1)).toBe(earlier);
  const corrupted = { counter: 9, updates: { 'arsenal:kick-off:0-0': 8, 'coventry:kick-off:0-0': 9, [goal.id]: 2, [earlier.id]: 1 },
    meta: { 'arsenal:kick-off:0-0': { backfilled: false }, 'coventry:kick-off:0-0': { backfilled: false } } };
  const repaired = orderLiveStudioUpdates([arsenal, coventry, earlier, goal], corrupted);
  expect(repaired.entries[0]).toBe(goal);
  expect(repaired.entries.at(-1)).toBe(earlier);
  expect(orderLiveStudioUpdates([goal, earlier, coventry, arsenal], repaired.state).entries).toEqual(repaired.entries);
});

test("a genuine new kick-off starts at the top and subsequent live updates arrive above it", () => {
  const oldGoal = { id: "old-goal", momentMs: at("13:00") };
  const kickoff = { id: "kickoff", kickoff: true, momentMs: at("14:00") };
  const first = orderLiveStudioUpdates([oldGoal]);
  const started = orderLiveStudioUpdates([oldGoal, kickoff], first.state);
  expect(started.entries).toEqual([kickoff, oldGoal]);
  const goal = { id: "new-goal", momentMs: at("14:07") };
  const scored = orderLiveStudioUpdates([oldGoal, kickoff, goal], started.state);
  expect(scored.entries).toEqual([goal, kickoff, oldGoal]);
  expect(orderLiveStudioUpdates([oldGoal, kickoff, goal], scored.state).entries).toEqual(scored.entries);
});

test("a corrected kickoff timestamp is repaired without resetting other cards' arrival order", () => {
  const kickoff = { id: "kickoff", kickoff: true, momentMs: at("16:30") };
  const goal = { id: "goal", momentMs: at("14:07") };
  const first = orderLiveStudioUpdates([kickoff, goal]);
  expect(first.entries[0]).toBe(kickoff);
  const corrected = { ...kickoff, momentMs: at("14:00") };
  const repaired = orderLiveStudioUpdates([goal, corrected], first.state);
  expect(repaired.entries).toEqual([goal, corrected]);
});
