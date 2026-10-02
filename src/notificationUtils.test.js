const {
  buildGoalAlertBody,
  getLatestGoalEvent,
  normalizeGoalEvents,
} = require("../notificationUtils");

describe("goal alert details", () => {
  const fixture = { homeTeam: "Arsenal", awayTeam: "Chelsea" };

  test("formats scorer and minute when a goal event is available", () => {
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

    expect(buildGoalAlertBody(fixture, 1, 1, goal)).toBe(
      "Cole Palmer 67+2' - Arsenal 1-1 Chelsea"
    );
  });

  test("falls back to the scoreline when scorer data is unavailable", () => {
    expect(buildGoalAlertBody(fixture, 2, 1, null)).toBe("Arsenal 2-1 Chelsea");
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
});
