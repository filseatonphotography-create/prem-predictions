import React from "react";
import { act, cleanup, render, screen } from "@testing-library/react";
import App from "./App";

test("Studio shows the actual stoppage-time equaliser and first-half red-card context and retains it on reload", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-31T14:25:00Z"));
  localStorage.clear(); sessionStorage.clear(); window.scrollTo = jest.fn();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "context-test", username: "ContextTest" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 9 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 9, predictions: {} }));
  const goal = (minute, homeGoals, awayGoals, teamName, scorerName, injuryTime = null) => ({ type: "GOAL", minute,
    injuryTime, homeGoals, awayGoals, teamName, scorerName });
  const goals = [goal(10, 1, 0, "Chelsea FC", "Palmer"), goal(20, 2, 0, "Chelsea FC", "Neto"),
    goal(60, 2, 1, "Manchester United FC", "Cunha"), goal(90, 2, 2, "Manchester United FC", "Bruno Fernandes", 3)];
  const red = { type: "RED_CARD", minute: 45, injuryTime: 2, teamName: "Chelsea FC", playerName: "Chelsea defender" };
  const state = { status: "IN_PLAY", minute: 90, utcDate: "2026-10-31T12:30:00Z", homeGoals: 2, awayGoals: 2,
    halfTimeAt: "2026-10-31T13:19:00Z", secondHalfAt: "2026-10-31T13:35:00Z", observedAt: "2026-10-31T14:25:00Z",
    lastUpdated: "2026-10-31T14:25:00Z", goalEvents: goals, matchEvents: [...goals, red] };
  const previousFetch = global.fetch;
  global.fetch = jest.fn(async url => {
    const path = String(url); let data = {};
    if (path.includes("/api/match-states/snapshot")) data = { 560626: state };
    if (path.includes("/api/results?")) data = [{ id: 560626, ...state, homeTeam: { name: "Chelsea FC" },
      awayTeam: { name: "Manchester United FC" }, score: { fullTime: { home: 2, away: 2 } }, goals }];
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
  const latestGoal = () => screen.getAllByText(/^Goal for MUN!/).map(heading => heading.closest("article"))
    .find(card => card.firstElementChild.textContent.includes("90+3"));
  try {
    render(<App />); await act(flush);
    const card = latestGoal();
    expect(card).toHaveTextContent(/equaliser|level/i);
    expect(card).toHaveTextContent(/injury time|stoppage-time/i);
    expect(card).not.toHaveTextContent(/possible.*winner|may have found.*winner/i);
    const redCard = screen.getByText(/^Red card!/).closest("article");
    expect(redCard).toHaveTextContent(/half-time|break/i);
    expect(redCard).toHaveTextContent(/lead/);
    const original = card.textContent;
    cleanup(); render(<App />); await act(flush);
    expect(latestGoal().textContent).toBe(original);
  } finally { cleanup(); global.fetch = previousFetch; jest.useRealTimers(); }
});
