import React from "react";
import { act, render, screen, cleanup, within } from "@testing-library/react";
import App from "./App";

jest.setTimeout(30000);
test("the full app puts new updates first and combines half-time into one studio post", async () => {
  jest.useFakeTimers({ now: Date.parse("2026-10-17T17:12:00Z") });
  window.scrollTo = jest.fn();
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "diagnostic-token", userId: "diagnostic", username: "Diagnostic" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 7 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 7, predictions: { diagnostic: { 560607: { homeGoals: 0, awayGoals: 1 } }, Dave: { 560607: { homeGoals: 0, awayGoals: 1, isDouble: true } }, Emma: { 560607: { homeGoals: 0, awayGoals: 0 } } } }));
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
    const kickoffCard = screen.getByText("Kick off!").closest("article");
    expect(kickoffCard.style.border).toMatch(/239,\s*68,\s*68/);
    expect(screen.getByText("Kick off!").parentElement).toHaveStyle({ color: "#f87171" });
    let cards = document.querySelectorAll('article[data-live-studio-fixture-id]');
    expect(cards[0]).toHaveTextContent(/Goal for AVL/);
    finalHomeGoals = 3;
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    cards = document.querySelectorAll('article[data-live-studio-fixture-id]');
    expect(cards[0]).toHaveTextContent(/Goal for AVL/);
    expect(screen.queryByText(/Full time!.*3-1/)).not.toBeInTheDocument();
    expect(screen.queryByText("Result confirmed")).not.toBeInTheDocument();
    paused = true;
    jest.setSystemTime(Date.parse("2026-10-17T17:20:00Z"));
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    expect(screen.getByText("Half-time around the grounds")).toBeInTheDocument();
    expect(screen.getAllByText("Back in the studio")).toHaveLength(1);
    expect(screen.queryByText("Half-time check")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Half time!/)).not.toBeInTheDocument();
    const halfCard = screen.getByText("Half-time around the grounds").closest("article");
    expect(within(halfCard).getByText(/Dave.*14 prediction points/)).toBeInTheDocument();
    expect(within(halfCard).getByText(/Emma.*0 prediction points/)).toBeInTheDocument();
    expect(screen.getByText("Half-time around the grounds").parentElement).toHaveStyle({ color: "#f59e0b" });
    paused = false;
    minuteOverride = 70;
    jest.setSystemTime(Date.parse("2026-10-17T18:00:00Z"));
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    const checkInCard = document.querySelector("article");
    expect(checkInCard).toHaveTextContent("Watching the clock");
    expect(checkInCard.style.border).toBe(halfCard.style.border);
    expect(checkInCard.style.background).toBe(halfCard.style.background);
    expect(screen.getByText("Watching the clock").parentElement).toHaveStyle({ color: "#f59e0b" });
    expect(within(checkInCard).getByText(/Dave.*14 prediction points/)).toBeInTheDocument();
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});

test("a returning viewer sees all phases in order while old results and studio history load", async () => {
  jest.useFakeTimers({ now: Date.parse("2026-10-17T17:46:00Z") });
  window.scrollTo = jest.fn();
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "diagnostic-token", userId: "diagnostic", username: "Diagnostic" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 7 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 7 }));
  const scope = "diagnostic:premierLeague:7:global:2026-10-17";
  sessionStorage.setItem(`live-studio-commentary:v1:${scope}`, JSON.stringify([
    { id: "studio:half-time:2026-10-17T14:00:00Z", title: "Earlier games at half time", momentMs: Date.parse("2026-10-17T17:30:00Z"), lines: ["Old half-time scores"] },
    { id: "studio:half-time:2026-10-17T16:30:00Z", title: "Half-time around the grounds", momentMs: Date.parse("2026-10-17T17:18:46Z"), lines: ["Newcastle 0–1 Aston Villa (HT)"] },
    { id: "studio:checkpoint:2026-10-17T14:00:00Z:70", title: "Earlier games at 70 minutes", momentMs: Date.parse("2026-10-17T15:25:00Z"), lines: ["Old studio scores"] },
  ]));
  sessionStorage.setItem(`live-studio-order:v1:${scope}`, JSON.stringify({ counter: 900, updates: { "560603:full-time": { sequence: 900 } } }));
  const goal = { type: "GOAL", minute: 36, scorerName: "Johan Manzambi", teamName: "Aston Villa FC", homeGoals: 0, awayGoals: 1 };
  const states = {
    560607: { status: "IN_PLAY", utcDate: "2026-10-17T16:30:00Z", minute: 57, homeGoals: 0, awayGoals: 1,
      observedAt: "2026-10-17T17:44:56Z", halfTimeAt: "2026-10-17T17:18:46Z", secondHalfAt: "2026-10-17T17:34:10Z", lastUpdated: "2026-10-17T19:44:44Z",
      lineups: { home: { name: "Newcastle", lineup: [{ name: "Nick Pope", position: "Goalkeeper" }] }, away: { name: "Aston Villa", lineup: [{ name: "Emiliano Martinez", position: "Goalkeeper" }] } },
      goalEvents: [goal], matchEvents: [goal, { type: "YELLOW_CARD", minute: 55, playerName: "Test player", teamName: "Newcastle United FC" }] },
    560602: { status: "FINISHED", utcDate: "2026-10-17T14:00:00Z", minute: 90, homeGoals: 1, awayGoals: 0, finishedAt: "2026-10-17T17:55:57Z", observedAt: "2026-10-17T17:44:56Z", goalEvents: [], matchEvents: [] },
    560603: { status: "FINISHED", utcDate: "2026-10-17T11:30:00Z", minute: 90, homeGoals: 0, awayGoals: 2, finishedAt: "2026-10-17T15:35:41Z", observedAt: "2026-10-17T17:44:56Z", goalEvents: [], matchEvents: [] },
  };
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async url => {
    let data = {};
    if (String(url).includes("/api/results?")) data = Object.entries(states).map(([id, state]) => ({ id: Number(id), ...state,
      score: { fullTime: { home: state.homeGoals, away: state.awayGoals } },
    }));
    if (String(url).includes("/api/match-states/snapshot")) data = states;
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  try {
    render(<App />);
    await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); });
    const checkOrder = () => {
      const articles = [...document.querySelectorAll("article")];
      const index = text => articles.findIndex(card => card.textContent.includes(text));
      const labels = ["Booking Test player", "Second half!", "Half-time around the grounds", "Goal for AVL!", "Kick off!", "Line-ups confirmed:"];
      expect(screen.queryByText("Result confirmed")).not.toBeInTheDocument();
      const positions = labels.map(index);
      expect(labels.filter((label, i) => positions[i] < 0)).toEqual([]);
      expect(positions).toEqual([...positions].sort((a, b) => a - b));
      expect(index("Watching the clock")).toBeGreaterThan(index("Kick off!"));
      expect(index("Earlier games at half time")).toBeGreaterThan(index("Watching the clock"));
    };
    checkOrder();
    // League/points information and result corrections enrich old cards; they
    // must never make earlier football jump above the current game.
    states[560602].homeGoals = 2;
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    checkOrder();
    cleanup();
    render(<App />);
    await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); });
    checkOrder();
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});
