import React from "react";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import App from "./App";
import FIXTURES from "./fixtures";

test("a live 2-0 prediction is the ninth exact score until the final whistle, including with a premature saved badge", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-31T14:10:00Z"));
  const pause = jest.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  const play = jest.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
  window.scrollTo = jest.fn(); localStorage.clear(); sessionStorage.clear();
  const completed = FIXTURES.filter(fixture => fixture.gameweek === 1);
  const chelsea = FIXTURES.find(fixture => fixture.id === 560626);
  const fixtures = [...completed, chelsea];
  const results = Object.fromEntries(fixtures.map(fixture => [fixture.id, { homeGoals: 2, awayGoals: 0 }]));
  const predictions = Object.fromEntries(fixtures.map((fixture, index) => [fixture.id,
    { homeGoals: index === completed.length - 1 ? 0 : 2, awayGoals: index === completed.length - 1 ? 1 : 0 }]));
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "badge-test", username: "BadgeTest" }));
  localStorage.setItem("activeView", "badges");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 9 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 9, results, predictions: { "badge-test": predictions, BadgeTest: predictions } }));
  localStorage.setItem("prediction_seen_badges_v1", JSON.stringify({ "badge-test": ["sharpShooter", "sniper"] }));
  const previousFetch = global.fetch;
  let finished = false;
  const states = () => Object.fromEntries(fixtures.map(fixture => [fixture.id, {
    status: fixture.id !== chelsea.id || finished ? "FINISHED" : "IN_PLAY",
    minute: fixture.id === chelsea.id && !finished ? 85 : 90,
    utcDate: fixture.id === chelsea.id ? "2026-10-31T12:30:00Z" : fixture.kickoff,
    homeGoals: 2, awayGoals: 0, lastUpdated: new Date().toISOString(), observedAt: new Date().toISOString(),
    matchEvents: fixture.id === chelsea.id ? [
      { type: "PENALTY_REVIEW", minute: 60, teamName: "Chelsea FC" },
      { type: "PENALTY_AWARDED", minute: 60, teamName: "Chelsea FC", takerName: "Cole Palmer" },
    ] : [],
  }]));
  global.fetch = jest.fn(async url => {
    let data = {};
    if (String(url).includes("/api/leagues/my?")) data = { leagues: [{ id: "badge-league", name: "Badge test league", members: ["badge-test"] }] };
    if (String(url).includes("/api/predictions/league/")) data = { users: [{ username: "BadgeTest", userId: "badge-test" }], predictionsByUserId: { "badge-test": predictions } };
    if (String(url).includes("/api/predictions/my")) data = { predictions };
    if (String(url).includes("/api/results/snapshot")) data = results;
    if (String(url).includes("/api/match-states/snapshot")) data = states();
    if (String(url).includes("/api/results?")) data = fixtures.map(fixture => ({ id: fixture.id, ...states()[fixture.id],
      homeTeam: { name: fixture.homeTeam }, awayTeam: { name: fixture.awayTeam }, score: { fullTime: { home: 2, away: 0 } } }));
    if (String(url).includes("/api/history/badges")) data = [{ id: "premier-badge-test-2026/27", userId: "badge-test", player: "BadgeTest",
      mode: "premier", seasonLabel: "2026/27", playedSeason: true, exactScores: 10, earnedBadgeIds: ["sharpShooter", "sniper"] }];
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  const flush = async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); };
  try {
    render(<App />); await act(flush);
    expect(screen.getByText("9/10 season exact scores")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("prediction_seen_badges_v1"))["badge-test"]).not.toContain("sniper");
    finished = true;
    await act(async () => { jest.advanceTimersByTime(30000); await flush(); });
    expect(screen.getByText("10/10 season exact scores")).toBeInTheDocument();
    expect(JSON.parse(localStorage.getItem("prediction_seen_badges_v1"))["badge-test"]).toContain("sniper");
    await act(async () => { fireEvent.click(screen.getAllByRole("button", { name: "Live Studio" })[0]); await flush(); });
    expect(screen.getByRole("region", { name: "Badges earned at full-time" })).toHaveTextContent("BadgeTest · Sniper · 10 exact scores");
    expect(screen.getByText("Penalty under review · Chelsea FC")).toBeInTheDocument();
    expect(screen.getByText("Penalty awarded · Chelsea FC")).toBeInTheDocument();
  } finally { cleanup(); global.fetch = previousFetch; pause.mockRestore(); play.mockRestore(); jest.useRealTimers(); }
});
