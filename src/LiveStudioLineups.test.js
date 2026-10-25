import React from "react";
import { render, screen, within } from "@testing-library/react";
import LiveStudioLineups, { sortLineupPlayers } from "./LiveStudioLineups";
import { buildLiveStudioEventHeader } from "./App";

const theme = { text: "white", muted: "grey", line: "grey", accent2: "green" };
const home = { name: "Liverpool", badge: "/badges/liverpool.png", formation: "4-3-3", lineup: [
  { name: "Striker", position: "Centre-Forward", shirtNumber: 9 },
  { name: "Midfielder", position: "Defensive Midfield", shirtNumber: 6 },
  { name: "Keeper", position: "Goalkeeper", shirtNumber: 1 },
  { name: "Defender", position: "Centre-Back", shirtNumber: 4 },
] };
const away = { name: "Chelsea", badge: "/badges/chelsea.png", lineup: [{ name: "Away keeper", position: "GK" }] };

test("shows two team columns with badges above the team and players from keeper to striker", () => {
  const { container } = render(<LiveStudioLineups teams={[home, away]} theme={theme} isMobile />);
  expect(container.querySelector(".live-studio-lineups")).toHaveStyle({ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" });
  const team = screen.getByRole("region", { name: "Liverpool starting XI" });
  expect(within(team).getByRole("img", { name: "Liverpool badge" })).toBeInTheDocument();
  expect(within(team).getByText("4-3-3")).toBeInTheDocument();
  expect(within(team).getAllByRole("listitem").map(row => row.textContent)).toEqual([
    "Goalkeeper1Keeper", "Defence4Defender", "Midfield6Midfielder", "Attack9Striker",
  ]);
  expect(screen.getByRole("region", { name: "Chelsea starting XI" })).toBeInTheDocument();
});

test("preserves provider order within a position and does not invent missing positions", () => {
  const players = [{ name: "Right back", position: "RB" }, { name: "Left back", position: "LB" }, { name: "TBC" }];
  expect(sortLineupPlayers(players)).toEqual(players);
});

test("a line-up announcement never shows a score, including 0-0 before kickoff", () => {
  const fixture = { homeTeam: "Liverpool", awayTeam: "Chelsea" };
  for (const score of [null, { homeGoals: 0, awayGoals: 0 }, { homeGoals: 2, awayGoals: 1 }]) {
    const title = buildLiveStudioEventHeader({ fixture, event: { type: "LINEUPS" }, score });
    expect(title).toBe("Line-ups confirmed: Liverpool v Chelsea");
    expect(title).not.toMatch(/\d\s*[-–]\s*\d/);
  }
});
