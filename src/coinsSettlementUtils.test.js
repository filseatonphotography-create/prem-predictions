const {
  buildSettledFixtureIdSet,
  recoverFinishedResults,
} = require("./coinsSettlementUtils");

describe("coins settlement", () => {
  const fixtures = [
    { id: 1, kickoff: "2026-06-20T12:00:00Z" },
    { id: 2, kickoff: "2026-06-20T15:00:00Z" },
  ];

  test("settles a fixture as soon as its match state is final", () => {
    const settled = buildSettledFixtureIdSet(
      fixtures,
      { 1: { homeGoals: 2, awayGoals: 1 } },
      { 1: { status: "FINISHED" } },
      { nowMs: Date.parse("2026-06-20T12:01:00Z") }
    );

    expect([...settled]).toEqual(["1"]);
  });

  test("does not settle a timed or in-play fixture with a score", () => {
    const settled = buildSettledFixtureIdSet(
      fixtures,
      {
        1: { homeGoals: 0, awayGoals: 0 },
        2: { homeGoals: 1, awayGoals: 0 },
      },
      { 1: { status: "TIMED" }, 2: { status: "IN_PLAY" } },
      { nowMs: Date.parse("2026-06-21T12:00:00Z") }
    );

    expect([...settled]).toEqual([]);
  });

  test("recovers a missing score from a finished match state without overwriting data", () => {
    const recovered = recoverFinishedResults(
      { 1: { homeGoals: 3, awayGoals: 0 } },
      {
        1: { status: "FINISHED", homeGoals: 9, awayGoals: 9 },
        2: { status: "FINISHED", homeGoals: 2, awayGoals: 2 },
        3: { status: "IN_PLAY", homeGoals: 1, awayGoals: 0 },
      }
    );

    expect(recovered.results).toEqual({
      1: { homeGoals: 3, awayGoals: 0 },
      2: { homeGoals: 2, awayGoals: 2 },
    });
    expect(recovered.recoveredFixtureIds).toEqual(["2"]);
  });
});
