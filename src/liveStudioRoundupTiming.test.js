import { act, renderHook } from "@testing-library/react";
import { orderLiveStudioUpdates } from "./liveStudioFeedOrder";
import { buildLiveStudioDeskEntries, mergeLiveStudioDeskHistory, useLiveStudioCommentaryHistory } from "./App";
const { getMatchEventMomentMs } = require("./liveMatchEvents");
const kickoff = Date.parse("2026-10-18T13:00:00Z");
const game = (id, minute) => ({ fixture: { id, homeTeam: "Arsenal", awayTeam: "Chelsea", kickoff: new Date(kickoff).toISOString() },
  minute, live: true, paused: false, finished: false, lastNewsAt: kickoff,
  score: { homeGoals: 0, awayGoals: 0 }, picks: [],
});
beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(kickoff + 20 * 60000); sessionStorage.clear(); });
afterEach(() => jest.useRealTimers());

test.each([6, 7, 10, 20, 24, 35, 40, 65, 69, 70, 80, 84])("no unscheduled around-the-grounds post at %s match minutes, even when the wall clock is ahead", minute => {
  expect(buildLiveStudioDeskEntries({ matches: [game(1, minute), game(2, minute)], nowMs: kickoff + 80 * 60000 })).toEqual([]);
});

test("staggered kickoffs do not let an older game trigger a roundup in the opening minutes", () => {
  const early = { ...game(1, 65), fixture: { ...game(1, 65).fixture, kickoff: new Date(kickoff - 75 * 60000).toISOString() } };
  expect(buildLiveStudioDeskEntries({ matches: [early, game(2, 7)], nowMs: kickoff + 7 * 60000 })).toEqual([]);
});

test("cached early roundups are removed on load and goals and bookings stay newest first across refresh", () => {
  const scope = "roundup-timing";
  const old = { id: "studio:roundup:early", title: "Around the grounds", momentMs: kickoff + 20 * 60000, lines: ["Old filler"] };
  sessionStorage.setItem(`live-studio-commentary:v1:${scope}`, JSON.stringify([old]));
  const fixture = game(1, 7).fixture;
  const event = (id, minute) => ({ id, momentMs: getMatchEventMomentMs(fixture, { minute }), lines: [id] });
  const goal1 = event("goal1", 8), goal2 = event("goal2", 10), booking = event("booking", 12);
  const { result, rerender, unmount } = renderHook(({ feed }) => useLiveStudioCommentaryHistory(feed, scope), { initialProps: { feed: [goal1] } });
  expect(result.current).toEqual([goal1]);
  act(() => rerender({ feed: [goal1, goal2, old] }));
  expect(result.current).toEqual([goal2, goal1]);
  act(() => rerender({ feed: [goal1, booking, goal2] }));
  expect(result.current).toEqual([booking, goal2, goal1]);
  unmount();
  const restored = renderHook(() => useLiveStudioCommentaryHistory([goal2, goal1, booking], scope));
  expect(restored.result.current).toEqual([booking, goal2, goal1]);
  expect(JSON.parse(sessionStorage.getItem(`live-studio-commentary:v1:${scope}`))).toEqual([]);
});

test("later goals rise above a scheduled studio check-in and stay there as it is enriched", () => {
  const [desk] = buildLiveStudioDeskEntries({ matches: [game(1, 25)], nowMs: kickoff + 25 * 60000 });
  const goal = { id: "goal-after-check-in", momentMs: getMatchEventMomentMs(game(1, 26).fixture, { minute: 26 }), lines: ["Goal!"] };
  const { result, rerender } = renderHook(({ feed }) => useLiveStudioCommentaryHistory(feed, "scheduled"), { initialProps: { feed: [desk] } });
  act(() => rerender({ feed: [desk, goal] }));
  expect(result.current.map(entry => entry.id)).toEqual([goal.id, desk.id]);
  const [refreshed] = buildLiveStudioDeskEntries({ matches: [game(1, 29)], nowMs: kickoff + 29 * 60000 });
  act(() => rerender({ feed: [refreshed, goal] }));
  expect(result.current.map(entry => entry.id)).toEqual([goal.id, desk.id]);
  expect(result.current[1].momentMs).toBe(desk.momentMs);
});


test("goals and cards take precedence when provider minute precision ties them with a studio post", () => {
  const [desk] = buildLiveStudioDeskEntries({ matches: [game(1, 25)], nowMs: kickoff + 25 * 60000 });
  const goal = { id: "goal", momentMs: desk.momentMs, sortMinute: 25 };
  const card = { id: "booking", momentMs: desk.momentMs, sortMinute: 25 };
  for (const entries of [[desk, goal, card], [card, goal, desk]]) {
    const sorted = orderLiveStudioUpdates(entries).entries;
    expect(sorted.slice(0, 2).map(entry => entry.id).sort()).toEqual(["booking", "goal"]);
    expect(sorted[2]).toBe(desk);
  }
});


test("the match-clock schedule creates separate visits once each, without simultaneous cards or repeats", () => {
  let history = [];
  const expected = [[15, "Around the grounds"], [25, "25-minute studio check-in"], [60, "Around the grounds"], [75, "75-minute studio check-in"], [85, "Watching the clock"]];
  for (const [minute, title] of expected) {
    const nowMs = kickoff + (minute > 45 ? minute + 15 : minute) * 60000;
    const entries = buildLiveStudioDeskEntries({ matches: [game(1, minute), game(2, minute)], nowMs });
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe(title);
    expect(entries[0].id).toBe(`studio:checkpoint:2026-10-18T13:00:00.000Z:${minute}`);
    history = mergeLiveStudioDeskHistory(history, entries);
    const later = buildLiveStudioDeskEntries({ matches: [game(1, minute + 2)], nowMs: nowMs + 120000 });
    expect(mergeLiveStudioDeskHistory(history, later)).toEqual(history);
  }
  expect(history).toHaveLength(5);
  expect(new Set(history.map(entry => entry.id)).size).toBe(5);
});

test("retired 70-minute cards do not return beside the new 75-minute visit", () => {
  const [entry] = buildLiveStudioDeskEntries({ matches: [game(1, 75)], nowMs: kickoff + 90 * 60000 });
  const old = { ...entry, id: "studio:checkpoint:2026-10-18T13:00:00.000Z:70", title: "Watching the clock" };
  expect(mergeLiveStudioDeskHistory([old], [entry])).toEqual([entry]);
});


test.each([[15, 25], [60, 75]])("different provider clocks (%s and %s) in one kickoff group cannot publish both visits together", (stale, current) => {
  const entries = buildLiveStudioDeskEntries({ matches: [game(1, stale), game(2, current)], nowMs: kickoff + 100 * 60000 });
  expect(entries).toHaveLength(1);
  expect(entries[0].title).toBe(`${current}-minute studio check-in`);
});
