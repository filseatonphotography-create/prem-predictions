import React from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import App from "./App";

const leagues = [
  { id: "friends", name: "Friends", members: ["viewer", "alice"] },
  { id: "work", name: "Work", members: ["viewer", "bob"] },
];
const leaders = {
  friends: { userId: "alice", player: "Alice", profit: 48.75 },
  work: { userId: "bob", player: "Bob", profit: -2.5 },
};
let originalFetch;

beforeEach(() => {
  jest.useFakeTimers();
  jest.setSystemTime(Date.parse("2026-10-18T12:00:00Z"));
  localStorage.clear();
  sessionStorage.clear();
  window.scrollTo = jest.fn();
  originalFetch = global.fetch;
});

afterEach(() => {
  cleanup();
  global.fetch = originalFetch;
  jest.useRealTimers();
});

test.each([
  ["friends", "Alice", "+48.75 coins"],
  ["work", "Bob", "-2.50 coins"],
])("Summary shows the coins leader for the selected %s mini-league", async (leagueId, player, profit) => {
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "viewer", username: "Viewer" }));
  localStorage.setItem("activeView", "summary");
  localStorage.setItem("prediction_selected_mini_league_v1", JSON.stringify({ "viewer:premier": leagueId }));
  global.fetch = jest.fn(async url => {
    const path = String(url);
    let data = {};
    if (path.includes("/api/leagues/my?")) data = { leagues };
    if (path.includes("/api/predictions/league/")) data = { users: [], predictionsByUserId: {} };
    if (path.includes("/api/results?")) data = [];
    if (path.includes("/api/coins/leaderboard?")) {
      const selected = new URL(path, "http://localhost").searchParams.get("leagueId");
      data = { leaderboard: [leaders[selected] || { player: "Global Leader", profit: 999 }] };
    }
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });

  render(<App />);
  await act(async () => {
    for (let i = 0; i < 60; i++) await Promise.resolve();
  });
  const card = screen.getByText("💰 Best Gambler").parentElement;
  expect(within(card).getByText(player)).toBeInTheDocument();
  expect(within(card).getByText(profit)).toBeInTheDocument();
  expect(card).not.toHaveTextContent("Global Leader");
  expect(global.fetch.mock.calls.some(([url]) => String(url).includes(`leagueId=${leagueId}&mode=premier`))).toBe(true);
});
