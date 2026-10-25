import React from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import App, { buildLeaguePredictionSources, getFixturePredictionPoints, mergeCloudPredictionsPreservingLocalBoosts } from "./App";

const league = { id: "score-test", name: "Friends", members: ["phil-id", "tin-id", "phil-old"] };
const users = [{ username: "Phil", userId: "phil-id" }, { username: "Tin Tin", userId: "tin-id" }, { username: "Phil_legacy", userId: "phil-old" }];
const cloud = {
  "phil-id": { 560602: { homeGoals: 2, awayGoals: 1, isDouble: true }, 560603: { homeGoals: 0, awayGoals: 0 } },
  "tin-id": { 560602: { homeGoals: 3, awayGoals: 2, isTriple: true }, 560603: { homeGoals: 1, awayGoals: 1 } },
  "phil-old": { 560602: { homeGoals: 9, awayGoals: 0 } },
};
const results = { 560602: { homeGoals: 2, awayGoals: 1 }, 560603: { homeGoals: 0, awayGoals: 0 } };

beforeEach(() => { jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-18T12:00:00Z")); localStorage.clear(); sessionStorage.clear(); window.scrollTo = jest.fn(); });
afterEach(() => { cleanup(); jest.useRealTimers(); });

test("canonical league picks ignore the viewing player, local boosts and account order", () => {
  const shared = { users, league, predictionsByUserId: cloud };
  const phil = buildLeaguePredictionSources({ ...shared, currentUserId: "phil-id", predictions: { "tin-id": {} } });
  const tin = buildLeaguePredictionSources({ ...shared, users: [...users].reverse(), currentUserId: "tin-id", predictions: { "phil-id": {} } });
  expect(phil).toEqual(tin);
  expect(phil.userIdByKey.Phil).toBe("phil-id");
  expect(Object.fromEntries(phil.keys.map(key => [key, Object.entries(results).reduce((total, [id, result]) => total + getFixturePredictionPoints(phil.predictionsByKey[key][id], result), 0)])))
    .toEqual({ Phil: 21, "tin-id": 16 });
  expect(getFixturePredictionPoints({ homeGoals: 2, awayGoals: 1, isDouble: true, isTriple: true }, results[560602])).toBe(21);
});

test("two signed-in viewers see the same league and Studio totals despite different local caches", async () => {
  jest.setSystemTime(Date.parse("2026-10-17T20:00:00Z"));
  const originalFetch = global.fetch;
  let viewerId = "phil-id";
  let remote = JSON.parse(JSON.stringify(cloud));
  let requests = 0;
  global.fetch = jest.fn(async url => {
    const path = String(url);
    let data = {};
    if (path.includes("/api/avatar/all")) data = { "phil-id": { seed: "phil-profile", style: "bottts" }, "tin-id": { seed: "tin-profile", style: "lorelei" } };
    if (path.includes("/api/leagues/my?")) data = { leagues: [league] };
    if (path.includes("/api/predictions/league/")) { requests += 1; data = { users, predictionsByUserId: remote }; }
    if (path.includes("/api/predictions/my")) data = { predictions: remote[viewerId] };
    if (path.includes("/api/results/snapshot")) data = results;
    if (path.includes("/api/results?")) data = Object.entries(results).map(([id, result]) => ({ id: Number(id), status: "FINISHED", minute: 90, utcDate: "2026-10-17T14:00:00Z", score: { fullTime: { home: result.homeGoals, away: result.awayGoals } } }));
    if (path.includes("/api/match-states/snapshot")) data = Object.fromEntries(Object.entries(results).map(([id, result]) => [id, { ...result, status: "FINISHED", minute: 90, utcDate: "2026-10-17T14:00:00Z" }]));
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  const flush = async () => { await act(async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); }); await act(async () => { jest.advanceTimersByTime(600); for (let i = 0; i < 20; i++) await Promise.resolve(); }); };
  const readLeague = () => Object.fromEntries([...document.querySelectorAll('[role="button"][aria-expanded]')].map(row => [row.children[2]?.querySelector("span[title]")?.getAttribute("title"), Number(row.children[3]?.textContent)]));
  const readStudio = () => Object.fromEntries([...document.querySelector("aside").children].slice(1).map(row => [row.children[1]?.textContent, Number(row.children[2]?.textContent.replace(" pts", ""))]));
  try {
    for (const viewer of [{ id: "phil-id", name: "Phil" }, { id: "tin-id", name: "Tin Tin" }]) {
      viewerId = viewer.id;
      localStorage.clear(); sessionStorage.clear();
      localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: viewer.id, username: viewer.name }));
      localStorage.setItem("activeView", "league");
      localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 7 }));
      localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 7, results, predictions: {
        [viewer.id]: { 560602: { homeGoals: 9, awayGoals: 9, isDouble: true, isTriple: true }, 560603: { homeGoals: 0, awayGoals: 0, isDouble: true } },
        Phil: { 560602: { homeGoals: 9, awayGoals: 9 } },
      } }));
      render(<App />); await flush();
      expect(readLeague()).toEqual({ Phil: 21, "Tin Tin": 16 });
      const buttons = screen.getAllByRole("button", { name: "Live Studio" });
      await act(async () => { buttons[0].click(); }); await flush();
      expect(readStudio()).toEqual({ Phil: 21, "Tin Tin": 16 });
      const philUpdate = screen.getAllByRole("region", { name: "Phil's studio update" })[0];
      const tinUpdate = screen.getAllByRole("region", { name: "Tin Tin's studio update" })[0];
      expect(philUpdate).not.toBe(tinUpdate);
      expect(within(philUpdate).getByText("Phil", { selector: "strong" })).toBeInTheDocument();
      expect(within(philUpdate).getByAltText("Phil's profile avatar").getAttribute("src")).toContain("bottts/svg?seed=phil-profile");
      expect(within(tinUpdate).getByAltText("Tin Tin's profile avatar").getAttribute("src")).toContain("lorelei/svg?seed=tin-profile");
      expect(within(philUpdate).getByLabelText("14 prediction points")).toHaveTextContent("14 pts");
      expect(within(tinUpdate).getByLabelText("12 prediction points")).toHaveTextContent("12 pts");
      expect(philUpdate.querySelector("p")).toBeNull();
      expect(tinUpdate.style.borderTop).toContain("1px solid");
      expect(philUpdate.textContent).not.toContain("At the prediction desk:");
      expect(tinUpdate.textContent).not.toContain("At the prediction desk:");
      const before = requests;
      remote["tin-id"][560603] = { homeGoals: 0, awayGoals: 0 };
      await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 50; i++) await Promise.resolve(); }); await flush();
      expect(requests).toBeGreaterThan(before);
      expect(readStudio()).toEqual({ Phil: 21, "Tin Tin": 19 });
      cleanup(); remote = JSON.parse(JSON.stringify(cloud));
    }
  } finally { global.fetch = originalFetch; }
});


test("both viewers apply the same one-captain rule to the reported conflicting records", () => {
  const picks = {
    "tin-id": {
      560610: { homeGoals: 3, awayGoals: 1, isDouble: true, updatedAt: 1792238035217 },
      560611: { homeGoals: 1, awayGoals: 2, isDouble: true, updatedAt: 1792238035232 },
    },
  };
  const shared = buildLeaguePredictionSources({ users, league, predictionsByUserId: picks });
  const normalized = shared.predictionsByKey["tin-id"];
  expect(normalized[560610].isDouble).toBe(false);
  expect(normalized[560611].isDouble).toBe(true);
  expect(103 + 8 + getFixturePredictionPoints(normalized[560610], { homeGoals: 3, awayGoals: 2 })
    + getFixturePredictionPoints(normalized[560611], { homeGoals: 1, awayGoals: 2 })).toBe(127);
});

test("refresh cannot restore a locked captain from stale local storage", () => {
  const fixture = { id: 560610, gameweek: 7, kickoff: "2026-10-17T14:00:00Z" };
  const remote = { 560610: { homeGoals: 3, awayGoals: 1, isDouble: false } };
  const local = { 560610: { homeGoals: 3, awayGoals: 1, isDouble: true } };
  expect(mergeCloudPredictionsPreservingLocalBoosts(remote, local, [fixture])).toEqual(remote);
  expect(mergeCloudPredictionsPreservingLocalBoosts({}, local, [fixture])).toEqual({});
});
