import { renderHook } from "@testing-library/react";
import useLiveStudioFeedOrder, { orderLiveStudioUpdates } from "./liveStudioFeedOrder";
const { getMatchEventMomentMs, mergeMatchPhaseState } = require("./liveMatchEvents");
const { useLiveStudioCommentaryHistory } = require("./App");
const at = time => Date.parse(`2026-10-17T${time}:00Z`);
const villa = { id: 560607, kickoff: "2026-10-17T16:30:00Z" };
const chelsea = { id: 560603, kickoff: "2026-10-17T11:30:00Z" };
const fulham = { id: 560602, kickoff: "2026-10-17T14:00:00Z" };
const fixtureEntry = (id, fixture, event, state = {}) => ({
  id, fixtureId: fixture.id, fixture, title: id, lines: [id],
  fullTime: event.statusLabel === "FT", sortMinute: event.minute,
  momentMs: getMatchEventMomentMs(fixture, event, state),
});

beforeEach(() => { jest.useFakeTimers({ now: at("17:46") }); sessionStorage.clear(); });
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
  const expected = ["booking", "restart", half.id, "goal", "kickoff", "lineup", "old-final", oldDesk.id, "chelsea-final"];
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
  expect(result.current.map(e => e.id)).toEqual(["goal", "old-final", half.id]);
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
