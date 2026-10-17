import React from "react";
import { act, render, screen, cleanup } from "@testing-library/react";
import App from "./App";

jest.setTimeout(30000);
test("the full app puts new updates first and combines half-time into one studio post", async () => {
  jest.useFakeTimers({ now: Date.parse("2026-10-17T17:12:00Z") });
  window.scrollTo = jest.fn();
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "diagnostic-token", userId: "diagnostic", username: "Diagnostic" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 7 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 7, predictions: { diagnostic: { 560607: { homeGoals: 0, awayGoals: 1 } } } }));
  let scored = false;
  let paused = false;
  let minuteOverride = null;
  let finalHomeGoals = 2;
  const finishedRaw = () => ({ id: 560602, homeTeam: { name: "Fulham FC" }, awayTeam: { name: "Hull City AFC" }, utcDate: "2026-10-17T14:00:00Z", status: "FINISHED", minute: 90, lastUpdated: "2026-10-17T19:00:00Z", score: { fullTime: { home: finalHomeGoals, away: 1 } }, goals: [] });
  const raw = () => ({ id: 560607, homeTeam: { name: "Newcastle United FC" }, awayTeam: { name: "Aston Villa FC" }, utcDate: "2026-10-17T16:30:00Z", status: paused ? "PAUSED" : "IN_PLAY", minute: minuteOverride ?? (paused ? 45 : scored ? 41 : 1), lastUpdated: scored ? "2026-10-17T19:11:00Z" : "2026-10-17T18:31:00Z", score: { fullTime: { home: 0, away: scored ? 1 : 0 } }, goals: scored ? [{ type: "REGULAR", minute: 36, scorer: { name: "Johan Manzambi" }, team: { name: "Aston Villa FC" }, score: { home: 0, away: 1 } }] : [] });
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async url => {
    let data = {};
    if (String(url).includes("/api/results?")) data = [raw(), finishedRaw()];
    if (String(url).includes("/api/results/snapshot")) data = { 560607: { homeGoals: 0, awayGoals: scored ? 1 : 0 } };
    if (String(url).includes("/api/match-states/snapshot")) data = { 560607: { status: raw().status, utcDate: raw().utcDate, minute: raw().minute, homeGoals: 0, awayGoals: scored ? 1 : 0, lastUpdated: raw().lastUpdated, goalEvents: raw().goals, matchEvents: raw().goals }, 560602: {
      status: "FINISHED", minute: 90, utcDate: finishedRaw().utcDate, homeGoals: finalHomeGoals, awayGoals: 1,
      finishedAt: finishedRaw().lastUpdated, lastUpdated: finishedRaw().lastUpdated, observedAt: "2026-10-17T16:00:00Z", goalEvents: [], matchEvents: [],
    } };
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  try {
    render(<App />);
    await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); });

    scored = true;
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });


    expect(screen.getByText(/Johan Manzambi.*scor|Johan Manzambi.*net|Johan Manzambi.*name|Johan Manzambi has/)).toBeInTheDocument();
    let cards = document.querySelectorAll('article[data-live-studio-fixture-id]');
    expect(cards[0]).toHaveTextContent(/Goal for AVL/);
    finalHomeGoals = 3;
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    cards = document.querySelectorAll('article[data-live-studio-fixture-id]');
    expect(cards[0]).toHaveTextContent(/Full time!.*3-1/);
    paused = true;
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    expect(screen.getByText("Half-time around the grounds")).toBeInTheDocument();
    expect(screen.getAllByText("Back in the studio")).toHaveLength(1);
    expect(screen.queryByText("Half-time check")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Half time!/)).not.toBeInTheDocument();
    paused = false;
    minuteOverride = 70;
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    expect(document.querySelector("article")).toHaveTextContent("70-minute studio check-in");
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});
