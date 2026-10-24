import React from "react";
import { act, render, screen, cleanup, within, fireEvent } from "@testing-library/react";
import App from "./App";

jest.setTimeout(30000);
test("the full app puts new updates first and combines half-time into one studio post", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-17T17:12:00Z"));
  window.scrollTo = jest.fn();
  localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "diagnostic-token", userId: "diagnostic", username: "Diagnostic" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 7 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 7, predictions: { diagnostic: { 560607: { homeGoals: 0, awayGoals: 1 } }, Dave: { 560607: { homeGoals: 0, awayGoals: 1, isDouble: true } }, Emma: { 560607: { homeGoals: 0, awayGoals: 0 } } } }));
  let scored = false;
  let nextLineups = false;
  let ended = false;
  let paused = false;
  let minuteOverride = null;
  let finalHomeGoals = 2;
  const finishedRaw = () => ({ id: 560602, homeTeam: { name: "Fulham FC" }, awayTeam: { name: "Hull City AFC" }, utcDate: "2026-10-17T14:00:00Z", status: "FINISHED", minute: 90, lastUpdated: "2026-10-17T19:00:00Z", score: { fullTime: { home: finalHomeGoals, away: 1 } }, goals: [] });
  const raw = () => ({ id: 560607, homeTeam: { name: "Newcastle United FC" }, awayTeam: { name: "Aston Villa FC" }, utcDate: "2026-10-17T16:30:00Z", status: ended ? "FINISHED" : paused ? "PAUSED" : "IN_PLAY", minute: minuteOverride ?? (paused ? 45 : scored ? 41 : 1), lastUpdated: scored ? "2026-10-17T19:11:00Z" : "2026-10-17T18:31:00Z", score: { fullTime: { home: 0, away: scored ? 1 : 0 } }, goals: scored ? [{ type: "REGULAR", minute: 36, scorer: { name: "Johan Manzambi" }, team: { name: "Aston Villa FC" }, score: { home: 0, away: 1 } }] : [] });
  const nextFixture = { id: 560608, status: "TIMED", utcDate: "2026-10-17T18:30:00Z", homeTeam: { name: "Nottingham Forest FC" }, awayTeam: { name: "Arsenal FC" }, score: {},
    lineups: { home: { lineup: [{ name: "Next home keeper", position: "Goalkeeper" }] }, away: { lineup: [{ name: "Next away keeper", position: "Goalkeeper" }] } } };
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async url => {
    let data = {};
    if (String(url).includes("/api/results?")) data = [raw(), finishedRaw(), ...(nextLineups ? [nextFixture] : [])];
    if (String(url).includes("/api/results/snapshot")) data = { 560607: { homeGoals: 0, awayGoals: scored ? 1 : 0 } };
    if (String(url).includes("/api/match-states/snapshot")) data = { 560607: { status: raw().status, utcDate: raw().utcDate, minute: raw().minute, homeGoals: 0, awayGoals: scored ? 1 : 0, lastUpdated: raw().lastUpdated, goalEvents: raw().goals, matchEvents: raw().goals }, 560602: {
      status: "FINISHED", minute: 90, utcDate: finishedRaw().utcDate, homeGoals: finalHomeGoals, awayGoals: 1,
      finishedAt: finishedRaw().lastUpdated, lastUpdated: finishedRaw().lastUpdated, observedAt: "2026-10-17T16:00:00Z", goalEvents: [], matchEvents: [],
    } };
    if (String(url).includes("/api/match-states/snapshot") && nextLineups) data[560608] = nextFixture;
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  try {
    render(<App />);
    await act(async () => { for (let i = 0; i < 30; i++) await Promise.resolve(); });

    nextLineups = true;
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    expect(document.querySelector("article")).toHaveTextContent("Line-ups confirmed: Nottingham Forest v Arsenal");
    scored = true;
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });


    expect(screen.getByText(/Johan Manzambi.*scor|Johan Manzambi.*net|Johan Manzambi.*name|Johan Manzambi has/)).toBeInTheDocument();
    const kickoffHeading = screen.getAllByText("Kick off!").find(heading => heading.closest("article").getAttribute("data-live-studio-fixture-id") === "560607");
    const kickoffCard = kickoffHeading.closest("article");
    expect(kickoffCard.style.border).toMatch(/239,\s*68,\s*68/);
    expect(kickoffHeading.parentElement).toHaveStyle({ color: "#f87171" });
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
    expect(screen.queryByText("Half-time check")).not.toBeInTheDocument();
    expect(screen.queryByText(/^Half time!/)).not.toBeInTheDocument();
    const halfCard = screen.getByText("Half-time around the grounds").closest("article");
    expect(within(halfCard).getAllByText("Back in the studio")).toHaveLength(1);
    expect(within(halfCard).getByText(/Dave.*14 prediction points/)).toBeInTheDocument();
    expect(within(halfCard).getByText(/Emma.*0 prediction points/)).toBeInTheDocument();
    const halfScores = within(halfCard).getByRole("list", { name: "Scores around the grounds" });
    expect(within(halfScores).getByRole("listitem", { name: "Newcastle United 0, Aston Villa 1, HT" })).toBeInTheDocument();
    expect(within(halfScores).getByTitle("Newcastle United")).toHaveTextContent("NEW");
    expect(within(halfScores).getByTitle("Aston Villa")).toHaveTextContent("AVL");
    expect(within(halfCard).getAllByText(/Dave.*14 prediction points/)).toHaveLength(1);
    expect(within(halfCard).queryByText("Newcastle United 0–1 Aston Villa (HT)")).not.toBeInTheDocument();
    expect(screen.getByText("Half-time around the grounds").parentElement).toHaveStyle({ color: "#f59e0b" });
    paused = false;
    minuteOverride = 75;
    jest.setSystemTime(Date.parse("2026-10-17T18:00:00Z"));
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 30; i++) await Promise.resolve(); });
    const checkInCard = document.querySelector("article");
    expect(checkInCard).toHaveTextContent("75-minute studio check-in");
    expect(checkInCard.style.border).toBe(halfCard.style.border);
    expect(checkInCard.style.background).toBe(halfCard.style.background);
    expect(screen.getByText("75-minute studio check-in").parentElement).toHaveStyle({ color: "#f59e0b" });
    expect(within(checkInCard).getByText(/Dave.*14 prediction points/)).toBeInTheDocument();
    ended = true; minuteOverride = 90;
    jest.setSystemTime(Date.parse("2026-10-17T18:20:00Z"));
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 50; i++) await Promise.resolve(); });
    const finalCard = screen.getByText("Full-time around the grounds").closest("article");
    const finalScores = within(finalCard).getByRole("list", { name: "Scores around the grounds" });
    expect(within(finalScores).getAllByRole("listitem")).toHaveLength(2);
    expect(within(finalScores).getByRole("listitem", { name: "Newcastle United 0, Aston Villa 1, FT" })).toBeInTheDocument();
    expect(within(finalCard).getAllByText(/Dave.*14 prediction points/)).toHaveLength(1);
    expect(within(finalCard).queryByText(/^Best return/)).not.toBeInTheDocument();
    expect(within(finalCard).getByText("Mini-league: first kick-off to full time")).toBeInTheDocument();
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});

test("a returning viewer keeps restored history and new updates in their original arrival order", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-17T17:46:00Z"));
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
    { id: "studio:checkpoint:2026-10-17T14:00:00Z:75", title: "Earlier games at 75 minutes", momentMs: Date.parse("2026-10-17T15:25:00Z"), lines: ["Old studio scores"] },
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
    let firstOrder;
    const checkOrder = () => {
      const articles = [...document.querySelectorAll("article")];
      const index = text => articles.findIndex(card => card.textContent.includes(text));
      const labels = ["Booking Test player", "Second half!", "Half-time around the grounds", "Goal for AVL!", "Kick off!", "Line-ups confirmed:"];
      expect(screen.queryByText("Result confirmed")).not.toBeInTheDocument();
      const positions = labels.map(index);
      expect(labels.filter((label, i) => positions[i] < 0)).toEqual([]);
      const displayed = [...labels, "Earlier games at 75 minutes", "Earlier games at half time"].sort((a, b) => index(a) - index(b));
      if (!firstOrder) firstOrder = displayed;
      expect(displayed).toEqual(firstOrder);
      expect(index("Booking Test player")).toBe(0);
      expect(index("Earlier games at 75 minutes")).toBeGreaterThan(index("Kick off!"));
      expect(index("Earlier games at half time")).toBeGreaterThan(index("Earlier games at 75 minutes"));
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

test("confirmed half-time appears while the detailed provider response is still pending", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-17T17:14:00Z"));
  window.scrollTo = jest.fn(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "diagnostic", username: "Diagnostic" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 7 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 7, predictions: {}, results: {} }));
  const originalFetch = global.fetch;
  let paused = false, finishProvider;
  const response = data => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => data });
  const state = () => ({ status: paused ? "PAUSED" : "IN_PLAY", minute: paused ? 45 : 44, utcDate: "2026-10-17T16:30:00Z", homeGoals: 0, awayGoals: 0,
    observedAt: paused ? "2026-10-17T17:20:00Z" : "2026-10-17T17:14:00Z", lastUpdated: "2026-10-17T17:14:00Z",
    ...(paused ? { halfTimeAt: "2026-10-17T17:20:00Z" } : {}), matchEvents: [], goalEvents: [] });
  global.fetch = jest.fn(async url => {
    const path = String(url);
    if (path.includes("/api/results?")) return paused ? new Promise(resolve => { finishProvider = () => resolve(response([])); }) : response([]);
    if (path.includes("/api/match-states/snapshot")) return response({ 560607: state() });
    return response({});
  });
  try {
    render(<App />);
    await act(async () => { for (let i = 0; i < 50; i++) await Promise.resolve(); });
    expect(screen.queryByText("Half-time around the grounds")).not.toBeInTheDocument();
    paused = true; jest.setSystemTime(Date.parse("2026-10-17T17:20:00Z"));
    await act(async () => { screen.getByRole("button", { name: "Refresh studio" }).click(); for (let i = 0; i < 50; i++) await Promise.resolve(); });
    expect(finishProvider).toEqual(expect.any(Function));
    expect(screen.getByText("Half-time around the grounds")).toBeInTheDocument();
    await act(async () => { finishProvider(); for (let i = 0; i < 50; i++) await Promise.resolve(); });
    expect(screen.getAllByText("Half-time around the grounds")).toHaveLength(1);
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});

test("a second-half phase reconstructed at 84 minutes does not jump above existing goals or next-game lineups", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-17T18:10:00Z"));
  window.scrollTo = jest.fn(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "diagnostic", username: "Diagnostic" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 7 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 7 }));
  let minute = 45;
  const goal = { type: "GOAL", minute: 80, scorerName: "Current scorer", teamName: "Aston Villa FC", homeGoals: 0, awayGoals: 1 };
  const states = () => ({
    560607: { status: "IN_PLAY", minute, utcDate: "2026-10-17T16:30:00Z", homeTeam: { name: "Newcastle United FC" }, awayTeam: { name: "Aston Villa FC" }, homeGoals: 0, awayGoals: 1, goalEvents: [goal], matchEvents: [goal] },
    560608: { status: "TIMED", utcDate: "2026-10-17T18:30:00Z", homeTeam: { name: "Nottingham Forest FC" }, awayTeam: { name: "Arsenal FC" }, lineupsAnnouncedAt: "2026-10-17T17:45:00Z",
      lineups: { home: { lineup: [{ name: "Home keeper", position: "Goalkeeper" }] }, away: { lineup: [{ name: "Away keeper", position: "Goalkeeper" }] } } },
  });
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async url => {
    let data = {};
    if (String(url).includes("/api/match-states/snapshot")) data = states();
    if (String(url).includes("/api/results?")) data = Object.entries(states()).map(([id, state]) => ({ id: Number(id), ...state, score: state.status === "IN_PLAY" ? { fullTime: { home: 0, away: 1 } } : {} }));
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  try {
    render(<App />);
    await act(async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); });
    expect(document.querySelector("article")).toHaveTextContent("Goal for AVL!");
    minute = 84;
    await act(async () => { screen.getByRole("button", { name: "Refresh studio" }).click(); for (let i = 0; i < 60; i++) await Promise.resolve(); });
    const cards = [...document.querySelectorAll("article")];
    expect(cards[0]).toHaveTextContent("Goal for AVL!");
    const lineupIndex = cards.findIndex(card => card.textContent.includes("Line-ups confirmed:"));
    const restartIndex = cards.findIndex(card => card.textContent.includes("Second half!"));
    expect(restartIndex).toBeGreaterThan(lineupIndex);
    expect(cards[restartIndex].firstElementChild).toHaveTextContent("2H");
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});

test("a late startup snapshot cannot replace the newer state already shown by a Studio refresh", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-17T18:00:00Z"));
  window.scrollTo = jest.fn(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "diagnostic", username: "Diagnostic" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 7 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 7, predictions: {} }));
  const goal = { type: "GOAL", minute: 10, homeGoals: 0, awayGoals: 1, scorerName: "Villa scorer", teamName: "Aston Villa FC" };
  const latest = { status: "IN_PLAY", minute: 75, utcDate: "2026-10-17T16:30:00Z", homeGoals: 0, awayGoals: 1,
    observedAt: "2026-10-17T18:00:00Z", lastUpdated: "2026-10-17T19:59:00Z", goalEvents: [goal], matchEvents: [goal] };
  const stale = { ...latest, status: "PAUSED", minute: 45, observedAt: "2026-10-17T17:20:00Z", lastUpdated: latest.lastUpdated };
  let resolveStartup;
  const startup = new Promise(resolve => { resolveStartup = resolve; });
  let snapshots = 0;
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async url => {
    let data = {};
    if (String(url).includes("/api/match-states/snapshot")) data = ++snapshots === 1 ? await startup : { 560607: latest };
    if (String(url).includes("/api/results?")) data = [{ id: 560607, ...latest,
      homeTeam: { name: "Newcastle United FC" }, awayTeam: { name: "Aston Villa FC" }, goals: [goal], score: { fullTime: { home: 0, away: 1 } } }];
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  try {
    render(<App />);
    await act(async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); });
    expect(document.querySelector("article")).toHaveTextContent("75-minute studio check-in");
    const before = [...document.querySelectorAll("article")].map(card => card.id);
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Refresh studio" })); for (let i = 0; i < 40; i++) await Promise.resolve(); });
    expect([...document.querySelectorAll("article")].map(card => card.id)).toEqual(before);
    await act(async () => { jest.advanceTimersByTime(30000); for (let i = 0; i < 40; i++) await Promise.resolve(); });
    expect([...document.querySelectorAll("article")].map(card => card.id)).toEqual(before);
    await act(async () => { resolveStartup({ 560607: stale }); for (let i = 0; i < 40; i++) await Promise.resolve(); });
    expect(document.querySelector("article")).toHaveTextContent("75-minute studio check-in");
    // A recovered half-time card is historical; the stale response must neither
    // move it above the current visit nor duplicate it.
    expect(screen.getAllByText("Half-time around the grounds")).toHaveLength(1);
    expect([...document.querySelectorAll("article")].map(card => card.id)).toEqual(before);
    cleanup(); render(<App />);
    await act(async () => { for (let i = 0; i < 40; i++) await Promise.resolve(); });
    // Restoring the public event timeline can additionally recover older studio
    // visits. Every existing match post must still occur once and in order.
    const restoredIds = [...document.querySelectorAll("article")].map(card => card.id).filter(Boolean);
    expect(restoredIds).toEqual(before.filter(Boolean));
    expect(screen.getAllByText("75-minute studio check-in")).toHaveLength(1);
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});

test("AVL's goal and Guéhi booking survive reopening before any network response with the corrected kickoff", async () => {
  jest.useFakeTimers(); jest.setSystemTime(Date.parse("2026-10-24T12:08:00Z"));
  window.scrollTo = jest.fn(); localStorage.clear(); sessionStorage.clear();
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "diagnostic", username: "Diagnostic" }));
  localStorage.setItem("activeView", "liveStudio");
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 8 }));
  localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 8, predictions: {} }));
  const goal = { type: "GOAL", minute: 6, homeGoals: 1, awayGoals: 0, scorerName: "Nicolas Jackson", teamName: "Aston Villa FC" };
  const booking = { type: "YELLOW_CARD", minute: 32, playerName: "Marc Guéhi", teamName: "Manchester City FC", card: "YELLOW" };
  const state = { status: "IN_PLAY", minute: 36, utcDate: "2026-10-24T11:30:00Z", homeGoals: 1, awayGoals: 0, observedAt: "2026-10-24T12:08:00Z", goalEvents: [goal], matchEvents: [goal, booking] };
  const originalFetch = global.fetch;
  global.fetch = jest.fn(async url => {
    let data = {};
    if (String(url).includes("/api/match-states/snapshot")) data = { 560614: state };
    if (String(url).includes("/api/results?")) data = [{ id: 560614, ...state, goalEvents: [], matchEvents: [], homeTeam: { name: "Aston Villa FC" }, awayTeam: { name: "Manchester City FC" }, score: { fullTime: { home: 1, away: 0 } } }];
    return { ok: true, status: 200, headers: { get: () => null }, json: async () => data };
  });
  const verify = () => {
    const cards = [...document.querySelectorAll("article")];
    expect(cards.filter(card => card.textContent.includes("Goal for AVL!"))).toHaveLength(1);
    expect(cards.filter(card => card.textContent.includes("Guéhi"))).toHaveLength(1);
    expect(screen.getAllByText("20-minute studio check-in")).toHaveLength(1);
    const kickoffCard = cards.find(card => /Kick[ -]off!/.test(card.textContent));
    expect(kickoffCard).toBeDefined();
    expect(kickoffCard.style.border.replace(/\s/g, "")).toContain("239,68,68");
    expect(cards.some(card => /Stats check/i.test(card.textContent))).toBe(false);
  };
  try {
    render(<App />);
    await act(async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); });
    verify();
    cleanup();
    global.fetch = jest.fn(() => new Promise(() => {}));
    render(<App />);
    await act(async () => { for (let i = 0; i < 60; i++) await Promise.resolve(); });
    verify();
  } finally { cleanup(); global.fetch = originalFetch; jest.useRealTimers(); }
});
