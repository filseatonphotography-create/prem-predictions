import React from "react";
import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import FixturePointsBox from "./FixturePointsBox";
import { getFixturePredictionPoints } from "./App";

const theme = { panel: "#111827", text: "#ffffff", muted: "#94a3b8" };
const props = { theme, isMobile: true, inputStyle: { width: 34, borderRadius: 8 } };
const prediction = { homeGoals: 2, awayGoals: 1 };

test("updates points and colour as the live score changes", () => {
  const { rerender } = render(<FixturePointsBox {...props} prediction={prediction} live points={getFixturePredictionPoints(prediction, { homeGoals: 1, awayGoals: 1 })} />);
  expect(screen.getByRole("status")).toHaveTextContent("0");
  expect(screen.getByRole("status")).toHaveStyle({ background: "#e74c3c" });
  expect(screen.getByText("LIVE POINTS")).toBeInTheDocument();

  rerender(<FixturePointsBox {...props} prediction={prediction} live points={getFixturePredictionPoints(prediction, { homeGoals: 2, awayGoals: 1 })} />);
  expect(screen.getByRole("status")).toHaveTextContent("7");
  expect(screen.getByRole("status")).toHaveStyle({ background: "#2ecc71" });
  expect(screen.getByRole("status")).toHaveAccessibleName("7 live points");

  rerender(<FixturePointsBox {...props} prediction={prediction} points={7} />);
  expect(screen.getByText("POINTS")).toBeInTheDocument();
  expect(screen.getByRole("status")).toHaveAccessibleName("7 points");
});

test.each([
  [{ isDouble: true }, 14, "#C0C0C0"],
  [{ isTriple: true }, 21, "#ffd700"],
])("applies the same boosted total and colour as Predictions", (boost, total, background) => {
  const pred = { ...prediction, ...boost };
  const points = getFixturePredictionPoints(pred, { homeGoals: 2, awayGoals: 1 });
  render(<FixturePointsBox {...props} prediction={pred} live points={points} />);
  expect(points).toBe(total);
  expect(screen.getByRole("status")).toHaveTextContent(String(total));
  expect(screen.getByRole("status")).toHaveStyle({ background, color: "#000" });
});

test.each([
  [undefined, { homeGoals: 0, awayGoals: 0 }],
  [{ homeGoals: "", awayGoals: "" }, { homeGoals: 0, awayGoals: 0 }],
  [prediction, {}],
  [prediction, { homeGoals: null, awayGoals: null }],
])("shows a neutral placeholder when a prediction or score is unavailable", (pred, score) => {
  const points = getFixturePredictionPoints(pred, score);
  expect(points).toBeNull();
  render(<FixturePointsBox {...props} prediction={pred} points={points} />);
  expect(screen.getByRole("status")).toHaveTextContent("—");
  expect(screen.getByRole("status")).toHaveStyle({ background: theme.panel });
  expect(screen.getByRole("status")).toHaveAccessibleName("Points not available yet");
});

test("treats a valid live goalless score as score data", () => {
  expect(getFixturePredictionPoints({ homeGoals: 0, awayGoals: 0 }, { homeGoals: 0, awayGoals: 0 })).toBe(7);
});
