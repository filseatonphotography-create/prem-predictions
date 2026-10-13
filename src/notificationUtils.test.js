const {
  buildGoalAlertBody,
  buildPredictionImpactLine,
  getLatestGoalEvent,
  normalizeGoalEvents,
  normalizeLineups,
} = require("../notificationUtils");

describe("goal alert details", () => {
  const fixture = { homeTeam: "Arsenal", awayTeam: "Chelsea" };

  test("formats scorer without an unreliable minute when a goal event is available", () => {
    const match = {
      homeTeam: { id: 57, name: "Arsenal FC" },
      awayTeam: { id: 61, name: "Chelsea FC" },
      goals: [
        {
          minute: 14,
          team: { id: 57, name: "Arsenal FC" },
          scorer: { name: "Bukayo Saka" },
          score: { home: 1, away: 0 },
        },
        {
          minute: 67,
          injuryTime: 2,
          team: { id: 61, name: "Chelsea FC" },
          scorer: { name: "Cole Palmer" },
          score: { home: 1, away: 1 },
        },
      ],
    };

    const goal = getLatestGoalEvent({
      match,
      fixture,
      prevHome: 1,
      prevAway: 0,
      nextHome: 1,
      nextAway: 1,
    });

    expect(buildGoalAlertBody(fixture, 1, 1, goal)).toBe("Cole Palmer");
  });

  test("omits fallback scoreline body text when scorer data is unavailable", () => {
    expect(buildGoalAlertBody(fixture, 2, 1, null)).toBe("");
  });

  test("uses the latest known goal when there was no previous score", () => {
    const goal = getLatestGoalEvent({
      match: {
        goals: [
          { minute: 8, scorerName: "Home One", score: { home: 1, away: 0 } },
          { minute: 55, scorerName: "Away Two", score: { home: 2, away: 1 } },
        ],
      },
      fixture,
      prevHome: null,
      prevAway: null,
      nextHome: 2,
      nextAway: 1,
    });

    expect(goal.scorerName).toBe("Away Two");
  });

  test("normalizes goal events forwarded by the frontend snapshot", () => {
    expect(
      normalizeGoalEvents({
        goalEvents: [{ playerName: "Marta", time: 44, teamName: "Brazil" }],
      })
    ).toEqual([
      {
        scorerName: "Marta",
        assistName: "",
        teamName: "Brazil",
        teamId: "",
        minute: 44,
        injuryTime: null,
        homeGoals: null,
        awayGoals: null,
        type: "",
      },
    ]);
  });

  test("normalizes starting lineups and benches from football-data", () => {
    expect(
      normalizeLineups({
        homeTeam: {
          id: 57,
          name: "Arsenal FC",
          formation: "4-3-3",
          coach: { name: "Renee Slegers" },
          lineup: [{ id: 1, name: "Home Starter", position: "Forward", shirtNumber: 9 }],
          bench: [{ id: 2, name: "Home Sub", position: "Midfield", shirtNumber: 14 }],
        },
        awayTeam: {
          id: 61,
          name: "Chelsea FC",
          formation: "4-2-3-1",
          lineup: [{ id: 3, name: "Away Starter", position: "Goalkeeper", shirtNumber: 1 }],
        },
      })
    ).toEqual({
      home: {
        teamId: "57",
        teamName: "Arsenal FC",
        formation: "4-3-3",
        coachName: "Renee Slegers",
        lineup: [{ id: "1", name: "Home Starter", position: "Forward", shirtNumber: 9 }],
        bench: [{ id: "2", name: "Home Sub", position: "Midfield", shirtNumber: 14 }],
      },
      away: {
        teamId: "61",
        teamName: "Chelsea FC",
        formation: "4-2-3-1",
        coachName: "",
        lineup: [{ id: "3", name: "Away Starter", position: "Goalkeeper", shirtNumber: 1 }],
        bench: [],
      },
    });
  });

  test("describes when a goal moves the user onto prediction points", () => {
    expect(
      buildPredictionImpactLine(
        { homeGoals: 2, awayGoals: 1 },
        { homeGoals: 1, awayGoals: 1 },
        { homeGoals: 2, awayGoals: 1 }
      )
    ).toBe("That goal moves you onto Bingpot (7 pts).");
  });

  test("describes when a goal removes prediction points", () => {
    expect(
      buildPredictionImpactLine(
        { homeGoals: 1, awayGoals: 1 },
        { homeGoals: 1, awayGoals: 1 },
        { homeGoals: 2, awayGoals: 1 }
      )
    ).toBe("That goal drops you from 7 pts to 0.");
  });

  test("nudges when the live score is one goal from Bingpot", () => {
    expect(
      buildPredictionImpactLine(
        { homeGoals: 2, awayGoals: 2 },
        { homeGoals: 2, awayGoals: 0 },
        { homeGoals: 2, awayGoals: 1 }
      )
    ).toBe("You're one goal away from Bingpot.");
  });
});
