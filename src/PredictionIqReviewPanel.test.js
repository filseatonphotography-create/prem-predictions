import React from "react";
import { render, screen, within } from "@testing-library/react";
import { getTeamCode } from "./App";
import PredictionIqReview from "./PredictionIqReviewPanel";
import { buildPredictionIqReview } from "./predictionIqReview";

const score = (homeGoals, awayGoals) => ({ homeGoals, awayGoals });
const fixtures = [
  { id: 1, homeTeam: "Arsenal", awayTeam: "Everton" },
  { id: 2, homeTeam: "Fulham", awayTeam: "Chelsea" },
  { id: 3, homeTeam: "Villa", awayTeam: "Wolves" },
  { id: 4, homeTeam: "Brentford", awayTeam: "Brighton" },
  { id: 5, homeTeam: "Liverpool", awayTeam: "Burnley" },
];
const results = { 1: score(2, 1), 2: score(1, 1), 3: score(3, 0), 4: score(1, 2), 5: score(0, 0) };
const picks = {
  1: { ...score("2", "1"), isTriple: true },
  2: score(0, 0),
  3: score(2, 0),
  4: score(2, 1),
  5: score("", null),
};
const week = buildPredictionIqReview(fixtures, picks, results);
const recent = buildPredictionIqReview(fixtures.slice(2, 4), { 3: score(0, 1), 4: score(0, 1) }, results);

test("scores each tier with the shared rules and excludes incomplete picks from accuracy", () => {
  expect(week).toMatchObject({
    picks: 4,
    correctResults: 3,
    exactScores: 1,
    points: 27,
    boostPoints: 14,
    oneGoalAway: 1,
    tierCounts: { 7: 1, 4: 1, 2: 1, 0: 1 },
    outcomes: { H: { correct: 2, total: 2 }, D: { correct: 1, total: 1 }, A: { correct: 0, total: 1 } },
  });
});

test("shows each final score with its pick and points and compares accuracy with recent picks", () => {
  render(<PredictionIqReview week={week} recent={recent} theme={{ danger: "#ff0000", muted: "#999999" }} resolveTeamBadge={() => ""} getTeamCode={getTeamCode} />);
  expect(screen.getByText("75%")).toBeInTheDocument();
  expect(screen.getByText("25 percentage points above recent form")).toBeInTheDocument();
  expect(screen.getByText("1 pick was one goal off the exact score.", { exact: false })).toBeInTheDocument();
  const drawRow = screen.getByRole("row", { name: /Draws/ });
  expect(within(drawRow).getByText("1/1")).toBeInTheDocument();
  expect(within(drawRow).getByText("—")).toBeInTheDocument();
  const exact = screen.getByRole("row", { name: /ARS v EVE/ });
  expect(within(exact).getByText("ARS")).toHaveAttribute("title", "Arsenal");
  expect(within(exact).getByText("ARS").closest(".prediction-iq-matchup-line")).toContainElement(within(exact).getByText("v"));
  expect(within(exact).getByText("EVE").closest(".prediction-iq-matchup-line")).not.toContainElement(within(exact).getByText("v"));
  expect(within(exact).queryByText("Arsenal")).not.toBeInTheDocument();
  expect(within(exact).getByText("3×")).toBeInTheDocument();
  expect(within(exact).getByText("21")).toBeInTheDocument();
  const wrongPick = screen.getByRole("row", { name: /BRE v BHA/ });
  expect(within(wrongPick).getByText("0")).toHaveStyle("color: #ff0000");
  expect(within(wrongPick).getByRole("rowheader")).toHaveTextContent(/^BREvBHA$/);
  const missing = screen.getByRole("row", { name: /LIV v BUR/ });
  expect(within(missing).getByText("No pick")).toBeInTheDocument();
  expect(within(missing).getByText("0–0")).toBeInTheDocument();
  expect(within(missing).getAllByText("—").at(-1)).toHaveStyle("color: #999999");
});

test("describes the most frequent repeated miss using the actual-outcome denominator", () => {
  const earlier = buildPredictionIqReview(fixtures, {
    1: score(0, 1), 2: score(0, 0), 3: score(0, 1), 4: score(2, 1),
  }, results);
  render(<PredictionIqReview week={week} recent={earlier} theme={{}} resolveTeamBadge={() => ""} getTeamCode={getTeamCode} />);
  expect(screen.getByText("You picked an away win in 2 of 2 matches that ended in a home win.")).toBeInTheDocument();
});

test("shows an appropriate empty state before results settle", () => {
  const empty = buildPredictionIqReview([], picks, results);
  render(<PredictionIqReview week={empty} recent={recent} theme={{}} resolveTeamBadge={() => ""} getTeamCode={getTeamCode} />);
  expect(screen.getByText(/when the first final score is confirmed/)).toBeInTheDocument();
  expect(screen.queryByRole("table")).not.toBeInTheDocument();
});
