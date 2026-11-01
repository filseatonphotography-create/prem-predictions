import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import App from "./App";

test("Studio folds Mateta's replaced yellow into the red decision and keeps it on reload", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-31T19:45:00Z"));
  localStorage.clear(); sessionStorage.clear(); window.scrollTo = jest.fn();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "card-test", username: "CardTest" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 9 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 9, predictions: {} }));
  const yellow = { type: "YELLOW_CARD", card: "YELLOW", minute: 12,
    player: { id: 641, name: "Jean-Philippe Mateta" }, team: { id: 354, name: "Crystal Palace FC" } };
  const red = { ...yellow, type: "RED_CARD", card: "RED", minute: 13 };
  const other = { ...yellow, minute: 15, player: { id: 177040, name: "Archie Gray" }, team: { id: 73, name: "Tottenham Hotspur FC" } };
  const state = { status: "FINISHED", minute: 90, utcDate: "2026-10-31T17:30:00Z", homeGoals: 2, awayGoals: 0,
    lastUpdated: "2026-10-31T19:40:00Z", matchEvents: [yellow, red, other] };
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async url => {
    const path = String(url); let data = {};
    if (path.includes("/api/match-states/snapshot")) data = { 560627: state };
    if (path.includes("/api/results?")) data = [{ id: 560627, ...state, matchEvents: undefined,
      homeTeam: { name: "Tottenham Hotspur FC" }, awayTeam: { name: "Crystal Palace FC" },
      score: { fullTime: { home: 2, away: 0 } }, bookings: [red, other] }];
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
  try {
    render(<App />); await act(flush);
    const check = () => {
      const headings = screen.getAllByText(/^Card decision: yellow upgraded to red/);
      expect(headings).toHaveLength(1);
      expect(headings[0].closest("article")).toHaveTextContent(/original yellow \(12′\).*straight red/);
      expect(screen.queryByText(/^Booking.*Mateta/)).not.toBeInTheDocument();
      expect(screen.getByText(/^Booking.*Archie Gray/)).toBeInTheDocument();
    };
    check(); cleanup(); render(<App />); await act(flush); check();
  } finally { cleanup(); global.fetch = previousFetch; jest.useRealTimers(); }
});
