import React from "react";
import { act, cleanup, render, screen, fireEvent, within } from "@testing-library/react";
import App from "./App";
import FIXTURES from "./fixtures";
import ResultsFixtureRow from "./ResultsFixtureRow";

const props = {
  home: { name: "Arsenal", code: "ARS" },
  away: { name: "Chelsea", code: "CHE" },
  score: { homeGoals: 1, awayGoals: 0 },
  points: 4,
  theme: { panel: "#111", panelHi: "#222", muted: "#aaa", text: "#fff", line: "#444", accent: "#ff0" },
};

test("fixture toggles saved prediction and bet details by click and keyboard", () => {
  render(<ResultsFixtureRow {...props} prediction={{ homeGoals: "2", awayGoals: "1", isDouble: true }} bet={{ stake: 3, side: "H", oddsSnapshot: { home: 2.5 } }} />);
  const toggle = screen.getByRole("button", { name: "Arsenal vs Chelsea prediction and bets" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  expect(screen.getByText("2 – 1")).not.toBeVisible();
  fireEvent.click(toggle);
  expect(toggle).toHaveAttribute("aria-expanded", "true");
  expect(document.getElementById(toggle.getAttribute("aria-controls"))).toBeVisible();
  expect(screen.getByText("2 – 1")).toBeVisible();
  expect(screen.getByText("Captain · 2× points")).toBeVisible();
  expect(screen.getByText(/on Arsenal to win/)).toHaveTextContent("3 coins on Arsenal to win");
  expect(screen.getByText(/Possible return: 7.50 coins/)).toBeVisible();
  fireEvent.keyDown(toggle, { key: "Enter" });
  expect(toggle).toHaveAttribute("aria-expanded", "false");
  fireEvent.keyDown(toggle, { key: " " });
  expect(toggle).toHaveAttribute("aria-expanded", "true");
});

test.each([undefined, {}, { homeGoals: "", awayGoals: "0" }, { homeGoals: null, awayGoals: 1 }])("missing or incomplete prediction has a clear empty state: %p", prediction => {
  render(<ResultsFixtureRow {...props} prediction={prediction} bet={{ stake: 0, side: "D" }} />);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("No prediction made.")).toBeVisible();
  expect(screen.getByText("No bet placed.")).toBeVisible();
});

test.each([["D", "Draw"], ["A", "Chelsea to win"]])("shows %s selection and accepts a zero score", (side, label) => {
  render(<ResultsFixtureRow {...props} prediction={{ homeGoals: 0, awayGoals: 0, isTriple: true }} bet={{ stake: 1, side }} />);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("0 – 0")).toBeVisible();
  expect(screen.getByText("Triple captain · 3× points")).toBeVisible();
  expect(screen.getByText(`on ${label}`, { exact: false })).toHaveTextContent(`1 coin on ${label}`);
  expect(screen.queryByText(/Possible return/)).not.toBeInTheDocument();
});

test("pending or failed bets never display an old bet as current", () => {
  const { rerender } = render(<ResultsFixtureRow {...props} betsLoading bet={{ stake: 3, side: "H" }} />);
  fireEvent.click(screen.getByRole("button"));
  expect(screen.getByText("Loading bets…")).toBeVisible();
  expect(screen.queryByText(/on Arsenal to win/)).not.toBeInTheDocument();
  rerender(<ResultsFixtureRow {...props} betsError="Network failure" bet={{ stake: 3, side: "H" }} />);
  expect(screen.getByText(/Bets could not be loaded/)).toBeVisible();
  expect(screen.queryByText(/on Arsenal to win/)).not.toBeInTheDocument();
});

test("the results page shows the updated local kick-off before play and score labels after play starts", async () => {
  const [final, live, upcoming, postponed] = FIXTURES.filter(fixture => fixture.gameweek === 8);
  const kickoff = new Date(Date.parse(upcoming.kickoff) + 90 * 60000);
  jest.useFakeTimers();
  jest.setSystemTime(new Date(Date.parse(final.kickoff) - 24 * 60 * 60000));
  const states = {
    [final.id]: { status: "FINISHED", utcDate: final.kickoff, homeGoals: 1, awayGoals: 0 },
    [live.id]: { status: "IN_PLAY", utcDate: live.kickoff, homeGoals: 0, awayGoals: 0 },
    [upcoming.id]: { status: "TIMED", utcDate: kickoff.toISOString() },
    [postponed.id]: { status: "POSTPONED", utcDate: postponed.kickoff },
  };
  const originalFetch = global.fetch;
  localStorage.clear();
  window.history.replaceState({}, "", "/?mode=premier&view=results");
  localStorage.setItem("pl_prediction_auth_v1", JSON.stringify({ token: "test-only", userId: "user", username: "Example" }));
  localStorage.setItem("prediction_gameweeks_by_mode_v1", JSON.stringify({ premierLeague: 8 }));
  window.scrollTo = jest.fn();
  global.fetch = jest.fn(async url => ({ ok: true, status: 200, headers: { get: () => null },
    json: async () => String(url).includes("/api/match-states/snapshot") ? states : {},
  }));
  const match = fixture => within(screen.getByRole("button", { name: `${fixture.homeTeam} vs ${fixture.awayTeam} prediction and bets` }));
  try {
    render(<App />);
    await act(async () => { for (let i = 0; i < 70; i++) await Promise.resolve(); });
    const date = new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short" }).format(kickoff);
    const time = new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit" }).format(kickoff);
    expect(match(upcoming).getByText(`${date} ${time}`)).toBeVisible();
    expect(match(live).getByText("LIVE SCORE")).toBeVisible();
    expect(match(final).getByText("FINAL SCORE")).toBeVisible();
    expect(match(postponed).getByText("Postponed")).toBeVisible();
  } finally {
    cleanup();
    jest.useRealTimers();
    global.fetch = originalFetch;
    localStorage.clear();
    window.history.replaceState({}, "", "/");
  }
});
