import { act, renderHook } from "@testing-library/react";
import { buildLiveStudioHalfTimeTable, mergeLiveStudioDeskHistory, useLiveStudioCommentaryHistory, getSavedLiveStudioFullTimeFixtures } from "./App";

const roundup = { id: "studio:checkpoint:test:25", momentMs: 100, lines: ["Phil would quite like the whistle now."] };
const goal = { id: "goal:1", momentMs: 200, lines: ["Goal for Arsenal!"] };

beforeEach(() => { sessionStorage.clear(); localStorage.clear(); });

test("round-ups remain after a goal, half-time and full-time, without duplicates", () => {
  let history = mergeLiveStudioDeskHistory([], [roundup]);
  history = mergeLiveStudioDeskHistory(history, [goal]);
  history = mergeLiveStudioDeskHistory(history, [{ id: "half-time" }]);
  history = mergeLiveStudioDeskHistory(history, [roundup, { id: "full-time" }]);
  expect(history).toEqual([goal, roundup, { id: "half-time" }, { id: "full-time" }]);
});

test("the actual commentary hook keeps read text when conditions change and after refresh", () => {
  const { result, rerender, unmount } = renderHook(({ feed, scope }) => useLiveStudioCommentaryHistory(feed, scope), {
    initialProps: { feed: [roundup], scope: "league-1" },
  });
  expect(result.current).toEqual([roundup]);
  act(() => rerender({ feed: [goal], scope: "league-1" }));
  expect(result.current).toEqual([goal, roundup]);
  act(() => rerender({ feed: [{ ...roundup, lines: ["Different text"] }], scope: "league-1" }));
  expect(result.current).toEqual([goal, roundup]);
  unmount();
  const restored = renderHook(() => useLiveStudioCommentaryHistory([goal], "league-1"));
  expect(restored.result.current).toEqual([goal, roundup]);
});

test("commentary does not leak between leagues, gameweeks or accounts", () => {
  const { result, rerender } = renderHook(({ scope }) => useLiveStudioCommentaryHistory([], scope), { initialProps: { scope: "league-2" } });
  sessionStorage.setItem("live-studio-commentary:v1:league-1", JSON.stringify([roundup]));
  expect(result.current).toEqual([]);
  act(() => rerender({ scope: "league-1" }));
  expect(result.current).toEqual([roundup]);
  act(() => rerender({ scope: "league-2" }));
  expect(result.current).toEqual([]);
});

test("visiting another page does not record unseen round-ups", () => {
  renderHook(() => useLiveStudioCommentaryHistory([roundup], "disabled", false));
  expect(sessionStorage.getItem("live-studio-commentary:v1:disabled")).toBeNull();
});

test("half-time always carries a table and accurately describes unchanged positions", () => {
  const previousRows = [{ username: "Phil", position: 1, points: 20 }, { username: "Dave", position: 2, points: 18 }];
  const currentRows = previousRows.map(row => ({ ...row, points: row.points + 2 }));
  const checkpoint = buildLiveStudioHalfTimeTable({ previousRows, currentRows, seed: "break" });
  expect(checkpoint.tableSnapshot).toEqual({ previousRows, currentRows });
  expect(checkpoint.tableLabel).toBe("Mini-league at half time");
  expect(checkpoint.line).toMatch(/unchanged|holds their place|no change/);
  const changed = buildLiveStudioHalfTimeTable({ previousRows, currentRows: [...currentRows].reverse().map((row, i) => ({ ...row, position: i + 1 })), seed: "break" });
  expect(changed.line).toMatch(/changed hands|moved|reshuffle/);
});

test("a completed session roundup stays in history during the next live game", () => {
  const closing = { id: "studio:closing", momentMs: 50, lines: ["That's a wrap"] };
  expect(mergeLiveStudioDeskHistory([closing, roundup], [goal])).toEqual([goal, roundup, closing]);
  expect(mergeLiveStudioDeskHistory([roundup], [closing])).toEqual([roundup, closing]);
});

test("individual full-time data survives internally without reappearing as a card", () => {
  const final = { id: "57:full-time", fixtureId: 57, fullTime: true, tone: "finished", momentMs: 300,
    title: "Full time! Arsenal 2-1 Chelsea", lines: ["Bingpot for Phil! 7 prediction points."] };
  const { result, rerender, unmount } = renderHook(({ feed }) => useLiveStudioCommentaryHistory(feed, "final-result"), { initialProps: { feed: [final] } });
  // A thin refresh temporarily reports an in-play fixture, with no full-time card.
  act(() => rerender({ feed: [goal] }));
  expect(result.current).toEqual([goal]);
  expect([...getSavedLiveStudioFullTimeFixtures("final-result")]).toEqual(["57"]);
  // The fixture leaves the active coverage window; its result still stays in history.
  act(() => rerender({ feed: [] }));
  expect(result.current).toEqual([goal]);
  expect(JSON.parse(sessionStorage.getItem("live-studio-commentary:v1:final-result"))).toContainEqual(final);
  unmount();
  const restored = renderHook(() => useLiveStudioCommentaryHistory([], "final-result"));
  expect(restored.result.current).toEqual([goal]);
  expect([...getSavedLiveStudioFullTimeFixtures("final-result")]).toEqual(["57"]);
});

test("official corrections update the retained full-time card without duplicates", () => {
  const final = { id: "57:full-time", fixtureId: 57, fullTime: true, momentMs: 300, title: "Full time! Arsenal 2-1 Chelsea" };
  const corrected = { ...final, title: "Full time! Arsenal 1-1 Chelsea" };
  expect(mergeLiveStudioDeskHistory([final], [corrected])).toEqual([corrected]);
});


test("a scorer correction retains one match post despite a changed event index", () => {
  const first = { id: "goal:index:1", updateKey: "match:goal:1-0", momentMs: 150, title: "Goal" };
  const enriched = { ...first, id: "goal:index:2", momentMs: 190, title: "Saka scores" };
  expect(mergeLiveStudioDeskHistory([roundup, first], [enriched])).toEqual([{ ...enriched, momentMs: 150 }, roundup]);
});
