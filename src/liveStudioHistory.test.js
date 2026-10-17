import { act, renderHook } from "@testing-library/react";
import { buildLiveStudioHalfTimeTable, mergeLiveStudioDeskHistory, useLiveStudioCommentaryHistory } from "./App";

const roundup = { id: "studio:roundup:1", momentMs: 100, lines: ["Phil would quite like the whistle now."] };
const goal = { id: "goal:1", momentMs: 200, lines: ["Goal for Arsenal!"] };

beforeEach(() => sessionStorage.clear());

test("round-ups remain after a goal, half-time and full-time, without duplicates", () => {
  let history = mergeLiveStudioDeskHistory([], [roundup]);
  history = mergeLiveStudioDeskHistory(history, [goal]);
  history = mergeLiveStudioDeskHistory(history, [{ id: "half-time" }]);
  history = mergeLiveStudioDeskHistory(history, [roundup, { id: "full-time" }]);
  expect(history).toEqual([roundup]);
});

test("the actual commentary hook keeps read text when conditions change and after refresh", () => {
  const { result, rerender, unmount } = renderHook(({ feed, scope }) => useLiveStudioCommentaryHistory(feed, scope), {
    initialProps: { feed: [roundup], scope: "league-1" },
  });
  expect(result.current).toEqual([roundup]);
  act(() => rerender({ feed: [goal], scope: "league-1" }));
  expect(result.current).toEqual([goal, roundup]);
  act(() => rerender({ feed: [{ ...roundup, lines: ["Different text"] }], scope: "league-1" }));
  expect(result.current).toEqual([roundup]);
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
