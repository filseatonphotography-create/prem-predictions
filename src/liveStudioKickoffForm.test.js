import React from "react";
import { act, cleanup, render, screen, within } from "@testing-library/react";
import App, { buildPremierTeamForm } from "./App";
import FIXTURES from "./fixtures";

const fixture = FIXTURES.find(game => game.id === 560616);
const before = Date.parse(fixture.kickoff);
const previousGames = FIXTURES.filter(game => Date.parse(game.kickoff) < before
  && [fixture.homeTeam, fixture.awayTeam].some(team => game.homeTeam === team || game.awayTeam === team));
const results = Object.fromEntries(previousGames.map(game => [game.id, { homeGoals: 2, awayGoals: 0 }]));

test("kickoff form uses the league table's latest-five order and excludes this game and future results", () => {
  const future = FIXTURES.find(game => Date.parse(game.kickoff) > before && game.homeTeam === fixture.homeTeam);
  const withLaterResults = { ...results, [fixture.id]: { homeGoals: 8, awayGoals: 0 }, [future.id]: { homeGoals: 9, awayGoals: 0 } };
  const form = buildPremierTeamForm(fixture.homeTeam, withLaterResults, before);
  const expected = previousGames.filter(game => game.homeTeam === fixture.homeTeam || game.awayTeam === fixture.homeTeam)
    .sort((a, b) => Date.parse(b.kickoff) - Date.parse(a.kickoff)).slice(0, 5);
  expect(form.map(item => item.fixtureId)).toEqual(expected.map(game => game.id));
  expect(form).toEqual(buildPremierTeamForm(fixture.homeTeam, results));
  expect(form.map(item => item.outcome)).toEqual(expected.map(game => game.homeTeam === fixture.homeTeam ? "W" : "L"));
  expect(form.map(item => item.venue)).toEqual(expected.map(game => game.homeTeam === fixture.homeTeam ? "H" : "A"));
  expect(form.every(item => item.opponentCode && item.scoreText)).toBe(true);
});

test("the full app shows both teams' table-style form strips on a kickoff card without opening Leagues", async () => {
  jest.useFakeTimers(); jest.setSystemTime(before + 60000);
  localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, "", "/?view=liveStudio&studio=coverage&competition=premier"); window.scrollTo = jest.fn();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "diagnostic", username: "Diagnostic" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 8 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 8, predictions: {} }));
  const state = { status: "IN_PLAY", minute: 1, utcDate: fixture.kickoff, homeGoals: 0, awayGoals: 0, matchEvents: [], goalEvents: [] };
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async url => {
    const path = String(url); let data = {};
    if (path.includes("/api/results/snapshot")) data = results;
    if (path.includes("/api/results?")) data = [
      ...previousGames.map(game => ({ id: game.id, status: "FINISHED", utcDate: game.kickoff,
        score: { fullTime: { home: 2, away: 0 } } })),
      { id: fixture.id, ...state, homeTeam: { name: fixture.homeTeam }, awayTeam: { name: fixture.awayTeam }, score: { fullTime: { home: 0, away: 0 } } },
    ];
    if (path.includes("/api/match-states/snapshot")) data = { [fixture.id]: state };
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  try {
    render(<App />);
    await act(async () => { for (let i = 0; i < 70; i++) await Promise.resolve(); });
    const formSection = screen.getByRole("region", { name: "Team form at kick-off" });
    expect(formSection.closest("article")).toHaveTextContent("Kick off!");
    for (const name of ["Arsenal", "Everton"]) {
      const group = within(formSection).getByRole("group", { name: `${name} form` });
      const expected = buildPremierTeamForm(name, results);
      const outcomes = within(group).getAllByText(/^[WDL]$/);
      expect(outcomes.map(node => node.textContent)).toEqual(expected.map(item => item.outcome));
      outcomes.forEach((node, index) => {
        expect(node.parentElement).toHaveStyle({ background: expected[index].outcome === "W" ? "#22c55e" : expected[index].outcome === "D" ? "#eab308" : "#ef4444" });
        expect(node.parentElement).toHaveTextContent(expected[index].opponentCode);
        expect(node.parentElement).toHaveTextContent(expected[index].venue);
      });
    }
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});

test('Champions League kickoff cards render both teams’ competition-only form', async () => {
  const { buildChampionsForm } = require('./studioCompetitions');
  jest.useFakeTimers(); jest.setSystemTime(Date.parse('2026-11-04T18:14:00Z'));
  localStorage.clear(); sessionStorage.clear(); window.history.replaceState({}, "", "/?view=liveStudio&studio=coverage&competition=champions"); window.scrollTo = jest.fn();
  localStorage.setItem('pl_prediction_auth_v1', JSON.stringify({ token: 'test-only', userId: 'diagnostic', username: 'Diagnostic' }));
  localStorage.setItem('activeView', 'liveStudio');
  localStorage.setItem('live-studio-selection:v1:diagnostic', JSON.stringify({ 'cl:77': true }));
  const raw = { id: 77, utcDate: '2026-11-04T17:45:00Z', status: 'IN_PLAY', minute: 29,
    homeTeam: { id: 1, name: 'Fenerbahçe SK' }, awayTeam: { id: 2, name: 'Liverpool FC' }, score: { fullTime: { home: 1, away: 1 } } };
  const prior = { id: 66, utcDate: '2026-10-20T18:00:00Z', status: 'FINISHED', competition: { code: 'CL' }, homeTeam: raw.homeTeam, awayTeam: raw.awayTeam, score: { fullTime: { home: 2, away: 0 } } };
  raw.form = buildChampionsForm(raw, [prior]);
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async url => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => String(url).includes('/api/live-studio/matches?') ? { matches: [raw] } : {} }));
  try {
    render(<App />); await act(async () => { for (let i = 0; i < 70; i++) await Promise.resolve(); });
    const section = screen.getByRole('region', { name: 'Team form at kick-off' });
    expect(section).toHaveTextContent('Champions League form this season');
    expect(within(section).getByRole('group', { name: 'Fenerbahçe SK form' })).toHaveTextContent('W');
    expect(within(section).getByRole('group', { name: 'Liverpool form' })).toHaveTextContent('L');
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});

test.each(['premier', 'champions'])('the %s feed shows scheduled form and build-up cards before kickoff with confirmed lineups', async competition => {
  const kickoff = Date.parse(fixture.kickoff);
  jest.useFakeTimers(); jest.setSystemTime(kickoff - 14 * 60000);
  localStorage.clear(); sessionStorage.clear(); window.scrollTo = jest.fn();
  window.history.replaceState({}, '', `/?view=liveStudio&studio=coverage&competition=${competition}`);
  localStorage.setItem('pl_prediction_auth_v1', JSON.stringify({ token: 'test-only', userId: 'diagnostic', username: 'Diagnostic' }));
  localStorage.setItem('activeView', 'liveStudio');
  localStorage.setItem('prediction_gameweeks_by_mode_v1', JSON.stringify({ premierLeague: fixture.gameweek }));
  localStorage.setItem('live-studio-selection:v1:diagnostic', JSON.stringify({ 'cl:77': true }));
  const lineup = Array.from({ length: 11 }, (_, id) => ({ id, name: `Player ${id}` }));
  const state = { status: 'TIMED', utcDate: fixture.kickoff, lineupsAnnouncedAt: new Date(kickoff - 75 * 60000).toISOString(), lineups: { home: { lineup }, away: { lineup } } };
  const raw = { id: 77, ...state, homeTeam: { id: 1, name: 'Fenerbahçe SK' }, awayTeam: { id: 2, name: 'Liverpool FC' }, score: {}, form: { home: [], away: [] } };
  const original = global.fetch;
  global.fetch = jest.fn(async url => {
    let data = {};
    if (String(url).includes('/api/live-studio/matches?')) data = { matches: [raw] };
    if (String(url).includes('/api/match-states/snapshot')) data = { [fixture.id]: state };
    if (String(url).includes('/api/results?')) data = [{ id: fixture.id, ...state, homeTeam: { name: fixture.homeTeam, lineup }, awayTeam: { name: fixture.awayTeam, lineup }, score: {} }];
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  try {
    render(<App />); await act(async () => { for (let i = 0; i < 70; i++) await Promise.resolve(); });
    expect(screen.getByText('The pre-match form guide')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Team form before kick-off' })).toBeInTheDocument();
    expect(screen.getByText('The countdown is on')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Live Studio' })).toHaveClass('live-studio-live-button');
  } finally { cleanup(); global.fetch = original; jest.useRealTimers(); window.history.replaceState({}, '', '/'); }
});
