import { act, renderHook } from "@testing-library/react";
import useLiveResultsPolling from "./useLiveResultsPolling";
const { getResultsCacheTtl, getResultsRefreshInterval } = require("./liveResultsRefresh");

const now = Date.parse("2026-10-17T15:00:00Z");

test("live scores and pre-match lineups cannot sit in a five-minute cache", () => {
  for (const status of ["IN_PLAY", "PAUSED"]) expect(getResultsCacheTtl([{ status }], now)).toBe(30000);
  expect(getResultsCacheTtl([{ status: "TIMED", utcDate: "2026-10-17T16:00:00Z" }], now)).toBe(30000);
  expect(getResultsCacheTtl([{ status: "SCHEDULED", utcDate: "2026-10-17T14:00:00Z" }], now)).toBe(30000);
  expect(getResultsCacheTtl([{ status: "FINISHED" }], now)).toBe(300000);
  expect(getResultsCacheTtl([{ status: "TIMED", utcDate: "2026-10-18T14:00:00Z" }], now)).toBe(300000);
});

test("the studio, live scores and predictions refresh promptly, including when games start", () => {
  for (const view of ["liveStudio", "results", "predictions"]) expect(getResultsRefreshInterval(view)).toBe(30000);
  expect(getResultsRefreshInterval("league", { 57: { status: "IN_PLAY" } })).toBe(30000);
  expect(getResultsRefreshInterval("league")).toBe(120000);
});

describe("the actual polling hook", () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  test("each refresh uses the latest match state, rather than the state from page load", async () => {
    const oldRefresh = jest.fn(async () => {});
    const latestRefresh = jest.fn(async () => {});
    const { rerender, unmount } = renderHook(({ refresh }) => useLiveResultsPolling(refresh, "premier", 30000), { initialProps: { refresh: oldRefresh } });
    await act(async () => {});
    expect(oldRefresh).toHaveBeenCalledTimes(1);
    rerender({ refresh: latestRefresh });
    await act(async () => { jest.advanceTimersByTime(30000); });
    expect(latestRefresh).toHaveBeenCalledTimes(1);
    expect(oldRefresh).toHaveBeenCalledTimes(1);
    unmount();
    await act(async () => { jest.advanceTimersByTime(30000); });
    expect(latestRefresh).toHaveBeenCalledTimes(1);
  });

  test("slow provider responses cannot create overlapping polls", async () => {
    let resolve;
    const refresh = jest.fn(() => new Promise(done => { resolve = done; }));
    const { unmount } = renderHook(() => useLiveResultsPolling(refresh, "premier", 30000));
    await act(async () => { jest.advanceTimersByTime(120000); });
    expect(refresh).toHaveBeenCalledTimes(1);
    await act(async () => { resolve(); });
    await act(async () => { jest.advanceTimersByTime(30000); });
    expect(refresh).toHaveBeenCalledTimes(2);
    unmount();
    await act(async () => { resolve(); });
    await act(async () => { jest.advanceTimersByTime(120000); });
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});

describe("results fallback when the backend is slow", () => {
  const originalFetch = global.fetch;
  afterEach(() => { global.fetch = originalFetch; });
  test.each([Object.assign(new Error("Timed out"), { name: "AbortError" }), new Error("Network error")])("still retrieves the goal feed after %s", async error => {
    const { fetchCompetitionResults, buildFixtureSyncPayload, getLiveStudioEvents } = require("./App");
    const fixture = { id: 560611, homeTeam: "Brentford FC", awayTeam: "Liverpool FC", kickoff: "2026-10-17T14:00:00Z" };
    const matches = [{ id: fixture.id, homeTeam: { name: fixture.homeTeam }, awayTeam: { name: fixture.awayTeam }, utcDate: fixture.kickoff, status: "IN_PLAY", minute: 79,
      score: { fullTime: { home: 1, away: 2 } }, goals: [
        { type: "REGULAR", minute: 62, scorer: { name: "Víctor Muñoz" }, team: { name: "Liverpool FC" }, score: { home: 1, away: 1 } },
        { type: "REGULAR", minute: 70, scorer: { name: "Alexander Isak" }, team: { name: "Liverpool FC" }, score: { home: 1, away: 2 } },
      ] }];
    global.fetch = jest.fn().mockRejectedValueOnce(error).mockResolvedValueOnce({ ok: true, json: async () => matches });
    const response = await fetchCompetitionResults();
    expect(response.timedOut).toBe(false);
    const state = buildFixtureSyncPayload(response.matches, [fixture]).matchStateUpdates[fixture.id];
    expect(getLiveStudioEvents(state).map(event => event.scorerName)).toEqual(["Alexander Isak", "Víctor Muñoz"]);
    expect(global.fetch.mock.calls[1][0]).toContain("/.netlify/functions/results");
  });
});

test("server-recorded push events are usable even when the provider results request fails", () => {
  const { getRecordedMatchStateUpdates, getLiveStudioEvents } = require("./App");
  const states = { 560610: { status: "IN_PLAY", homeGoals: 3, awayGoals: 1, matchEvents: [
    { type: "GOAL", minute: 85, scorerName: "Erling Haaland", homeGoals: 4, awayGoals: 1 },
    { type: "GOAL_DISALLOWED", minute: 87, previousHomeGoals: 4, previousAwayGoals: 1, homeGoals: 3, awayGoals: 1 },
  ] }, 999: { status: "IN_PLAY", matchEvents: [] } };
  const updates = getRecordedMatchStateUpdates(states, [{ id: 560610 }]);
  expect(Object.keys(updates)).toEqual(["560610"]);
  expect(getLiveStudioEvents(updates[560610]).map(event => event.type)).toEqual(["GOAL_DISALLOWED", "GOAL"]);
});
