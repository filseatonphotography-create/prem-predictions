import { act, renderHook } from "@testing-library/react";
import useLiveStudioFeedOrder, { orderLiveStudioUpdates } from "./liveStudioFeedOrder";
const { getMatchEventMomentMs } = require("./liveMatchEvents");

const final = { id: "old-final", updateKey: "old:full-time:2-1", title: "Full time!", lines: ["Result"], momentMs: 9000 };
const goal = { id: "new-goal", updateKey: "villa:goal:0-1", title: "Goal for AVL", lines: ["Manzambi"], momentMs: 1000 };

beforeEach(() => sessionStorage.clear());

test("newly received updates go above earlier cards, regardless of match minute or status", () => {
  const initial = orderLiveStudioUpdates([final]);
  const next = orderLiveStudioUpdates([final, goal], initial.state);
  expect(next.entries.map(entry => entry.id)).toEqual(["new-goal", "old-final"]);
  const newestFinal = { id: "another-final", title: "Another full-time result", momentMs: 500 };
  expect(orderLiveStudioUpdates([final, goal, newestFinal], next.state).entries[0]).toBe(newestFinal);
});

test("changing provider clocks or array order cannot promote an unchanged old card", () => {
  const initial = orderLiveStudioUpdates([final]);
  const next = orderLiveStudioUpdates([final, goal], initial.state);
  const refreshed = orderLiveStudioUpdates([goal, { ...final, momentMs: 50000, tone: "finished" }], next.state);
  expect(refreshed.state).toBe(next.state);
  expect(refreshed.entries[0]).toBe(goal);
});

test("an actual correction or new commentary also moves the updated card to the top", () => {
  const initial = orderLiveStudioUpdates([final]);
  const next = orderLiveStudioUpdates([final, goal], initial.state);
  const corrected = { ...final, title: "Corrected final score" };
  expect(orderLiveStudioUpdates([goal, corrected], next.state).entries[0]).toBe(corrected);
});

test("a batch is ordered chronologically and a VAR decision follows its goal", () => {
  const initial = orderLiveStudioUpdates([final]);
  const cancellation = { id: "var", title: "Goal ruled out", momentMs: 2000, sortMinute: 3 };
  const next = orderLiveStudioUpdates([final, cancellation, goal], initial.state);
  expect(next.entries.map(entry => entry.id)).toEqual(["var", "new-goal", "old-final"]);
});

test("arrival order survives a reload and stays separate for another league", () => {
  const { result, rerender, unmount } = renderHook(({ entries }) => useLiveStudioFeedOrder(entries, "league-1", true), { initialProps: { entries: [final] } });
  act(() => rerender({ entries: [final, goal] }));
  expect(result.current[0]).toBe(goal);
  unmount();
  const restored = renderHook(() => useLiveStudioFeedOrder([final, goal], "league-1", true));
  expect(restored.result.current[0]).toBe(goal);
  const separate = renderHook(() => useLiveStudioFeedOrder([final, goal], "league-2", true));
  expect(separate.result.current[0]).toBe(final);
});

test("an impossible future full-time timestamp falls back to the match timeline", () => {
  const fixture = { kickoff: "2026-10-17T14:00:00Z" };
  const moment = getMatchEventMomentMs(fixture, { statusLabel: "FT", minute: 90 }, {
    finishedAt: "2026-10-17T19:00:00Z", observedAt: "2026-10-17T16:00:00Z",
  });
  expect(moment).toBe(Date.parse("2026-10-17T15:45:00Z"));
});


test("a studio wrap-up follows fixture news received in the same batch", () => {
  const resumed = { id: "57:second-half", title: "Second half", momentMs: 1000, sortMinute: 45.995 };
  const roundup = { id: "studio:checkpoint:70", title: "70-minute check-in", momentMs: 1000 };
  expect(orderLiveStudioUpdates([roundup, resumed]).entries[0]).toBe(roundup);
});
