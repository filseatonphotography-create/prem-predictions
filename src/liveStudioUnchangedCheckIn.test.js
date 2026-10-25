import { act, renderHook } from "@testing-library/react";
import { getLiveStudioPlayerUpdates, getVisibleLiveStudioEntries, useLiveStudioCommentaryHistory } from "./App";

const fixture = { id: 560614, homeTeam: "Aston Villa FC", awayTeam: "Manchester City FC" };
const picks = ["Phil", "Dave", "Emma"].map(username => ({ username, prediction: { homeGoals: 0, awayGoals: 2 } }));
const visit = (minute, score = { homeGoals: 1, awayGoals: 0 }, overrides = {}) => ({
  id: `studio:checkpoint:2026-10-24T11:30:00Z:${minute}`, momentMs: minute * 60000,
  title: `${minute}-minute studio check-in`, lines: ["Back in the studio."] ,
  playerRoundup: ["Phil's detailed rundown", "Dave's detailed rundown", "Emma's detailed rundown"],
  roundupMatches: [{ fixture, score, picks }], ...overrides,
});
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

test("unchanged check-ins become a short collective update, without individual player repeats", () => {
  const [latest, first] = getVisibleLiveStudioEntries([visit(20), visit(15)]);
  expect(latest.compactCheckIn).toBe(true);
  expect(latest.lines).toHaveLength(2);
  expect(latest.lines.join(" ")).toMatch(/No change|same scores|haven't moved/);
  expect(latest.lines.join(" ")).toContain("all 3 submitted predictions are still backing Manchester City to win");
  for (const name of ["Phil", "Dave", "Emma"]) expect(latest.lines.join(" ")).not.toContain(name);
  expect(getLiveStudioPlayerUpdates(latest)).toEqual([]);
  expect(first.compactCheckIn).toBeUndefined();
  expect(getLiveStudioPlayerUpdates(first)).toHaveLength(3);
});

test("score changes restore the detailed rundown; another unchanged visit becomes concise again", () => {
  const visible = getVisibleLiveStudioEntries([visit(85, { homeGoals: 1, awayGoals: 1 }), visit(75, { homeGoals: 1, awayGoals: 1 }), visit(60)]);
  expect(visible[0].compactCheckIn).toBe(true);
  expect(visible[1].compactCheckIn).toBeUndefined();
  expect(getLiveStudioPlayerUpdates(visible[1])).toHaveLength(3);
});

test("a new fixture or an intervening goal and cancellation prevents a false unchanged summary", () => {
  const newGame = visit(20, undefined, { roundupMatches: [{ fixture: { ...fixture, id: 2 }, score: { homeGoals: 1, awayGoals: 0 }, picks }] });
  expect(getVisibleLiveStudioEntries([newGame, visit(15)])[0].compactCheckIn).toBeUndefined();
  const goal = { id: "goal", fixtureId: fixture.id, updateKey: `${fixture.id}:goal:2-0`, momentMs: 16 * 60000 };
  expect(getVisibleLiveStudioEntries([visit(20), goal, visit(15)])[0].compactCheckIn).toBeUndefined();
});

test("a divided league is described accurately and half/full-time posts retain their detailed snapshots", () => {
  const mixed = visit(20, undefined, { roundupMatches: [{ fixture, score: { homeGoals: 1, awayGoals: 0 }, picks: [...picks, { username: "Ian", prediction: { homeGoals: 1, awayGoals: 1 } }] }] });
  const [summary] = getVisibleLiveStudioEntries([mixed, visit(15)]);
  expect(summary.lines.join(" ")).toContain("3 picks back Manchester City to win");
  expect(summary.lines.join(" ")).toContain("1 pick backs a draw");
  expect(summary.lines.join(" ")).not.toContain("all 4");
  for (const id of ["studio:half-time:test", "studio:closing"]) {
    const [phase] = getVisibleLiveStudioEntries([visit(45, undefined, { id }), visit(20)]);
    expect(phase.compactCheckIn).toBeUndefined();
  }
});

test("reopening keeps the concise presentation and retains the original data for future changed-score visits", () => {
  const { result, rerender, unmount } = renderHook(({ feed }) => useLiveStudioCommentaryHistory(feed, "unchanged-test"), { initialProps: { feed: [visit(15)] } });
  act(() => rerender({ feed: [visit(20)] }));
  expect(result.current[0].compactCheckIn).toBe(true);
  const saved = JSON.parse(localStorage.getItem("live-studio-commentary:v1:unchanged-test"));
  expect(saved[0].compactCheckIn).toBeUndefined();
  expect(saved[0].roundupMatches[0].picks).toHaveLength(3);
  unmount();
  const reopened = renderHook(() => useLiveStudioCommentaryHistory([], "unchanged-test"));
  expect(reopened.result.current[0].compactCheckIn).toBe(true);
  expect(reopened.result.current[0].lines).toEqual(result.current[0].lines);
});
