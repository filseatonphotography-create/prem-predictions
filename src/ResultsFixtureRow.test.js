import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
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
