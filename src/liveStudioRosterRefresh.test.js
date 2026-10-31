import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import App from "./App";

test("refresh restores all ten Originals rows and points while league requests are still pending", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-31T14:20:00Z"));
  window.scrollTo = jest.fn(); localStorage.clear(); sessionStorage.clear();
  const names = ["Tom", "Emma", "Phil", "Steve", "Dave", "Ian", "Anthony", "Zoe", "Liam", "Tin Tin"];
  const users = names.map(username => ({ username, userId: `${username.toLowerCase()}-id` }));
  const league = { id: "originals-test", name: "The Originals", members: users.map(user => user.userId) };
  const predictionsByUserId = Object.fromEntries(users.map(user => [user.userId, { 560626: { homeGoals: 2, awayGoals: 0 } }]));
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "phil-id", username: "Phil" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 9 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 9, predictions: {} }));
  const state = { status: "FINISHED", minute: 90, utcDate: "2026-10-31T12:30:00Z", homeGoals: 2, awayGoals: 0,
    finishedAt: "2026-10-31T14:15:00Z", observedAt: "2026-10-31T14:16:00Z", lastUpdated: "2026-10-31T14:16:00Z" };
  const oldFetch = global.fetch;
  let delay = false, resolveLeagues, resolvePredictions;
  global.fetch = jest.fn(async url => {
    const path = String(url); let data = {};
    if (path.includes("/api/leagues/my?")) data = delay ? await new Promise(resolve => { resolveLeagues = resolve; }) : { leagues: [league] };
    if (path.includes("/api/predictions/league/")) data = delay ? await new Promise(resolve => { resolvePredictions = resolve; }) : { users, predictionsByUserId };
    if (path.includes("/api/match-states/snapshot")) data = { 560626: state };
    if (path.includes("/api/results?")) data = [{ id: 560626, ...state, homeTeam: { name: "Chelsea FC" }, awayTeam: { name: "Manchester United FC" }, score: { fullTime: { home: 2, away: 0 } } }];
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  const flush = async () => { for (let i = 0; i < 70; i++) await Promise.resolve(); };
  const card = () => screen.getByText("Full-time around the grounds").closest("article");
  const ranks = () => [...card().querySelectorAll("span")].filter(span => /^#\d+$/.test(span.textContent));
  try {
    render(<App />); await act(flush);
    expect(ranks()).toHaveLength(10);
    const before = card().textContent;
    cleanup(); delay = true;
    render(<App />); await act(flush);
    expect(resolveLeagues).toEqual(expect.any(Function));
    expect(resolvePredictions).toEqual(expect.any(Function));
    expect(ranks()).toHaveLength(10);
    for (const name of names) expect(card().textContent).toContain(name);
    expect(card().textContent).toBe(before);
    await act(async () => { resolveLeagues({ leagues: [league] }); resolvePredictions({ users, predictionsByUserId }); await flush(); });
    expect(ranks()).toHaveLength(10);
  } finally { cleanup(); global.fetch = oldFetch; jest.useRealTimers(); }
});
