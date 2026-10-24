import React from "react";
import { act, render, screen, cleanup } from "@testing-library/react";
import App from "./App";

jest.setTimeout(30000);

test("a lineup notification waits for its exact post and opens the correct gameweek", async () => {
  jest.useFakeTimers();
  jest.setSystemTime(Date.parse("2026-10-17T19:00:00Z"));
  window.scrollTo = jest.fn();
  const previousScroll = HTMLElement.prototype.scrollIntoView;
  const scroll = jest.fn();
  HTMLElement.prototype.scrollIntoView = scroll;
  const originalFetch = global.fetch;
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "diagnostic", userId: "diagnostic", username: "Diagnostic" }));
  localStorage.setItem("activeView", "predictions");
  localStorage.setItem("prediction_game_mode_v1", "worldCup");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 6 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 6, predictions: {} }));
  window.history.replaceState({}, "", "/?view=liveStudio&fixtureId=560608&update=560608%3Alineup%3Aconfirmed");
  let includeLineups = false;
  const players = side => Array.from({ length: 11 }, (_, index) => ({ name: `${side} player ${index + 1}` }));
  const raw = () => ({ id: 560608, status: "IN_PLAY", minute: 25, utcDate: "2026-10-17T18:30:00Z",
    homeTeam: { name: "Nottingham Forest FC", ...(includeLineups ? { lineup: players("Home") } : {}) },
    awayTeam: { name: "Arsenal FC", ...(includeLineups ? { lineup: players("Away") } : {}) },
    score: { fullTime: { home: 0, away: 1 } },
    goals: [{ type: "REGULAR", minute: 20, scorer: { name: "Test scorer" }, team: { name: "Arsenal FC" }, score: { home: 0, away: 1 } }],
  });
  global.fetch = jest.fn(async url => {
    let data = {};
    if (String(url).includes("/api/results?")) data = [raw()];
    if (String(url).includes("/api/results/snapshot")) data = { 560608: { homeGoals: 0, awayGoals: 1 } };
    if (String(url).includes("/api/match-states/snapshot")) data = { 560608: {
      status: "IN_PLAY", minute: 25, utcDate: raw().utcDate, homeGoals: 0, awayGoals: 1,
      goalEvents: raw().goals, matchEvents: raw().goals,
      ...(includeLineups ? { lineups: { home: { lineup: players("Home") }, away: { lineup: players("Away") } } } : {}),
    } };
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  const settle = async (ms = 100) => {
    await act(async () => { for (let tick = 0; tick < 40; tick += 1) await Promise.resolve(); });
    await act(async () => { jest.advanceTimersByTime(ms); for (let tick = 0; tick < 40; tick += 1) await Promise.resolve(); });
  };
  try {
    render(<App />);
    await settle();
    await settle();
    expect(document.querySelector('article[data-live-studio-fixture-id="560608"]')).toBeInTheDocument();
    expect(scroll).not.toHaveBeenCalled();
    expect(new URLSearchParams(window.location.search).get("update")).toBe("560608:lineup:confirmed");

    includeLineups = true;
    await settle(30000);
    await settle();
    const post = screen.getByText("Line-ups confirmed: Nottingham Forest v Arsenal").closest("article");
    expect(post.id).toBe("live-studio-update-560608-lineup-confirmed");
    expect(scroll).toHaveBeenCalledTimes(1);
    expect(scroll.mock.instances[0]).toBe(post);
    expect(scroll).toHaveBeenCalledWith({ behavior: "smooth", block: "center" });
    expect(new URLSearchParams(window.location.search).has("update")).toBe(false);
    await settle(30000);
    expect(scroll).toHaveBeenCalledTimes(1);
  } finally {
    cleanup(); global.fetch = originalFetch;
    HTMLElement.prototype.scrollIntoView = previousScroll;
    window.history.replaceState({}, "", "/");
    localStorage.clear(); sessionStorage.clear();
    jest.useRealTimers();
  }
});
