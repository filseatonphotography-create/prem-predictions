import React from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import App, { buildLiveStudioPlayerRoundup, buildLiveStudioStakesLine, mergeLiveStudioDeskHistory, refreshLiveStudioSavedSnapshot } from "./App";

const fixture = { id: 560614, homeTeam: "Aston Villa FC", awayTeam: "Manchester City FC", kickoff: "2026-10-24T11:30:00Z" };
const pick = (username, homeGoals, awayGoals) => ({ username, prediction: { homeGoals, awayGoals } });

test("each player's rundown explains their own route to points or the result they need to protect", () => {
  const lines = buildLiveStudioPlayerRoundup({ seed: "20", matches: [{ fixture, live: true,
    score: { homeGoals: 1, awayGoals: 0 }, picks: [pick("Exact", 1, 0), pick("Nearly", 2, 0), pick("Draw", 1, 1), pick("Rescue", 0, 2), pick("Ambitious", 3, 2)] }] });
  expect(lines.find(line => line.includes("Exact"))).toMatch(/exact score|perfect score|Bingpot/);
  expect(lines.find(line => line.includes("Nearly"))).toMatch(/one Aston Villa FC goal|One Aston Villa FC goal/);
  expect(lines.find(line => line.includes("Draw"))).toContain("Manchester City FC goal");
  expect(lines.find(line => line.includes("Rescue"))).toMatch(/exact score .*out of reach|exact score has gone/);
  expect(lines.find(line => line.includes("Rescue"))).toContain("Manchester City win");
  expect(lines.find(line => line.includes("Ambitious"))).toContain("2 more Aston Villa goals and 2 more Manchester City goals");
  expect(lines.join(" ")).not.toContain("payday");
});

test("goals react to ordinary result-point swings and unchanged points without inventing Bingpots", () => {
  const line = buildLiveStudioStakesLine({ fixture, event: { type: "GOAL", minute: 6 },
    previousScore: { homeGoals: 0, awayGoals: 0 }, score: { homeGoals: 1, awayGoals: 0 }, picks: [pick("Zoe", 4, 2)], seed: "ordinary" });
  expect(line).toContain("Zoe");
  expect(line).toMatch(/prediction points/);
  expect(line).not.toContain("on Bingpot");
  const unchanged = buildLiveStudioStakesLine({ fixture, event: { type: "GOAL", minute: 10 },
    previousScore: { homeGoals: 2, awayGoals: 0 }, score: { homeGoals: 3, awayGoals: 0 }, picks: [pick("Zoe", 5, 1)], seed: "unchanged" });
  expect(unchanged).toContain("Zoe");
  expect(unchanged).toContain("2 more Aston Villa goals and 1 more Manchester City goal");
});

test("late roster loading fills every historical table and preserves its original score snapshot", () => {
  const originalRows = Array.from({ length: 7 }, (_, index) => ({ username: `Founder${index}`, points: 0, position: index + 1 }));
  const fullRows = [...originalRows, { username: "Zoe", points: 7 }, { username: "Liam", points: 4 }];
  const original = { id: "studio:half-time:test", momentMs: Date.parse("2026-10-24T12:18:00Z"), kickoffMs: Date.parse(fixture.kickoff),
    lines: ["Original half-time post"], tableSnapshot: { previousRows: originalRows, currentRows: originalRows },
    roundupMatches: [{ fixture, score: { homeGoals: 1, awayGoals: 0 }, scoreLabel: "HT", picks: [] }] };
  const getTableRows = jest.fn(() => fullRows);
  const refreshed = refreshLiveStudioSavedSnapshot(original, { getTableRows, getPicks: () => [pick("Zoe", 1, 0)] });
  const [merged] = mergeLiveStudioDeskHistory([original], [refreshed]);
  expect(merged.tableSnapshot.currentRows).toHaveLength(9);
  expect(merged.roundupMatches[0].score).toEqual({ homeGoals: 1, awayGoals: 0 });
  expect(merged.momentMs).toBe(original.momentMs);
  expect(merged.lines).toEqual(original.lines);
  expect(getTableRows).toHaveBeenLastCalledWith(original.momentMs, { scoresByFixtureId: { 560614: { homeGoals: 1, awayGoals: 0 } } });
  const thin = refreshLiveStudioSavedSnapshot(merged, { getTableRows: () => originalRows, getPicks: () => [] });
  expect(thin.tableSnapshot.currentRows).toHaveLength(9);
});

test("the full Studio repairs a seven-founder half-time snapshot when the Originals roster arrives", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-24T12:20:00Z"));
  window.scrollTo = jest.fn(); localStorage.clear(); sessionStorage.clear();
  const names = ["Tom", "Emma", "Phil", "Steve", "Dave", "Ian", "Anthony", "Zoe", "Liam"];
  const users = names.map(username => ({ username, userId: `${username.toLowerCase()}-id` }));
  const league = { id: "originals-test", name: "The Originals", members: users.map(user => user.userId) };
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "phil-id", username: "Phil" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 8 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 8, predictions: {} }));
  const goal = { type: "GOAL", minute: 6, homeGoals: 1, awayGoals: 0, scorerName: "Jackson", teamName: fixture.homeTeam };
  const state = { status: "PAUSED", minute: 45, utcDate: fixture.kickoff, homeGoals: 1, awayGoals: 0,
    halfTimeHomeGoals: 1, halfTimeAwayGoals: 0, halfTimeAt: "2026-10-24T12:18:00Z", goalEvents: [goal], matchEvents: [goal] };
  let finishLeague;
  const leagueData = new Promise(resolve => { finishLeague = resolve; });
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async url => {
    const path = String(url); let data = {};
    if (path.includes("/api/leagues/my?")) data = { leagues: [league] };
    if (path.includes("/api/predictions/league/")) data = await leagueData;
    if (path.includes("/api/match-states/snapshot")) data = { 560614: state };
    if (path.includes("/api/results?")) data = [{ id: 560614, ...state, homeTeam: { name: fixture.homeTeam }, awayTeam: { name: fixture.awayTeam }, score: { fullTime: { home: 1, away: 0 } } }];
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  const flush = async () => act(async () => { for (let i = 0; i < 70; i++) await Promise.resolve(); });
  try {
    render(<App />); await flush();
    const halfCard = () => screen.getByText("Half-time around the grounds").closest("article");
    expect(halfCard().textContent).not.toContain("Zoe");
    await act(async () => { finishLeague({ users, predictionsByUserId: Object.fromEntries(users.map(user => [user.userId,
      { 560614: { homeGoals: user.username === "Zoe" ? 1 : 0, awayGoals: user.username === "Zoe" ? 0 : 3 } }])) }); });
    await flush();
    for (const name of names) expect(halfCard().textContent).toContain(name);
    expect([...halfCard().querySelectorAll("span")].filter(span => /^#\d+$/.test(span.textContent))).toHaveLength(9);
    const goalCard = screen.getByText(/Goal for AVL!/).closest("article");
    expect(goalCard.textContent).toContain("Zoe");
    expect(goalCard.textContent).toContain("Bingpot");
    cleanup(); render(<App />); await flush();
    for (const name of names) expect(halfCard().textContent).toContain(name);
    const zoe = within(halfCard()).getByRole("region", { name: "Zoe's studio update" });
    expect(within(zoe).getByLabelText("Prediction 1–0")).toHaveTextContent("1–0");
    expect(within(zoe).getByLabelText("7 prediction points")).toHaveTextContent("7 pts");
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});

test("a partial prediction refresh cannot strip the named goal reaction or full table", () => {
  const context = { fixture, event: { type: "GOAL", minute: 6 }, entryKind: "goal", revealLine: "Jackson scores!",
    score: { homeGoals: 1, awayGoals: 0 }, previousScore: { homeGoals: 0, awayGoals: 0 },
    picks: [pick("Zoe", 1, 0)], seed: "goal" };
  const original = { id: "560614:goal", updateKey: "560614:goal:1-0", momentMs: 123,
    goalCommentary: context, tableSnapshot: { currentRows: [{ username: "Zoe", points: 7 }] } };
  const [full] = mergeLiveStudioDeskHistory([], [original]);
  expect(full.lines.join(" ")).toContain("Zoe");
  const thin = { ...original, tableSnapshot: null, goalCommentary: { ...context, picks: [] } };
  const [refreshed] = mergeLiveStudioDeskHistory([full], [thin]);
  expect(refreshed.lines).toEqual(full.lines);
  expect(refreshed.tableSnapshot).toEqual(original.tableSnapshot);
});
