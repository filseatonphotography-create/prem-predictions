import { act, renderHook } from "@testing-library/react";
import { buildLiveStudioHalfTimeTable, mergeLiveStudioDeskHistory, useLiveStudioCommentaryHistory, getSavedLiveStudioFullTimeFixtures } from "./App";

const roundup = { id: "studio:checkpoint:test:20", momentMs: 100, lines: ["Phil would quite like the whistle now."] };
const goal = { id: "goal:1", momentMs: 200, lines: ["Goal for Arsenal!"] };

test("removes a cached duplicate Newcastle flash while preserving its original arrival", () => {
  const original = { id: "new:52", fixtureId: 1, sortMinute: 52, momentMs: 52000,
    updateKey: "1:goal:1-0", arrivalKey: "1:goal:1-0", lines: [] };
  const duplicate = { ...original, id: "new:58", sortMinute: 58, momentMs: 58000, arrivalKey: "1:goal:1-0:repeat:1" };
  const merged = mergeLiveStudioDeskHistory([original, duplicate], [{ ...duplicate, arrivalKey: original.arrivalKey }]);
  expect(merged).toHaveLength(1);
  expect(merged[0].id).toBe("new:58");
  expect(merged[0].momentMs).toBe(52000);
  const reversed = { id: "var", fixtureId: 1, sortMinute: 54, momentMs: 54000,
    providerConfirmed: true, updateKey: "1:goal-disallowed:0-0", lines: [] };
  expect(mergeLiveStudioDeskHistory([original, reversed, duplicate], [])).toHaveLength(3);
});

test("cached lineup posts adopt the notification link without duplicating the refreshed post", () => {
  const lineups = { home: { lineup: [{ name: "Starter" }] } };
  const cached = { id: "57:LINEUPS:na:0", fixtureId: 57, lineups, updateKey: "57:lineup:lineup:na::::::::", arrivalKey: "57:lineup:lineup:na::::::::", momentMs: 100 };
  const fresh = { ...cached, id: "57:LINEUPS:na:3", updateKey: "57:lineup:confirmed", arrivalKey: "57:lineup:confirmed" };
  expect(mergeLiveStudioDeskHistory([cached], [fresh])).toEqual([fresh]);
});

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

test("cancelled stats checks and the superseded 25-minute visit are removed from saved history", () => {
  const retired = [
    { id: "57:stats:20", title: "Stats check", momentMs: 250 },
    { id: "legacy-data", lines: ["The data desk checked in with another update."], momentMs: 250 },
    { id: "studio:checkpoint:2026-10-24T11:30:00Z:25", momentMs: 250 },
  ];
  expect(mergeLiveStudioDeskHistory([...retired, goal], [roundup])).toEqual([goal, roundup]);
});

test("legacy kick-off posts recover the flag used by the red card styling", () => {
  const old = { id: "560614:KICK_OFF:0:1", fixtureId: 560614, title: "Kick-off!", momentMs: 100 };
  expect(mergeLiveStudioDeskHistory([old], [])[0]).toMatchObject({ kickoff: true, updateKey: "560614:kick-off:0-0" });
});

test("a corrected fixture kickoff replaces a cached wrong start time instead of freezing it", () => {
  const cached = { id: "560616:KICK_OFF:0:0", fixtureId: 560616, kickoff: true, momentMs: Date.parse("2026-10-24T16:30:00Z"),
    fixture: { id: 560616, kickoff: "2026-10-24T16:30:00Z" } };
  const corrected = { ...cached, fixture: { ...cached.fixture, kickoff: "2026-10-24T14:00:00Z" } };
  const [entry] = mergeLiveStudioDeskHistory([cached], [corrected]);
  expect(entry.momentMs).toBe(Date.parse("2026-10-24T14:00:00Z"));
});
