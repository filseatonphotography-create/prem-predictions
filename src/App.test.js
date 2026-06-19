import {
  normalizeTeamName,
  findFixtureForApiMatch,
  buildFixtureSyncPayload,
  sortFixturesByOrderOfPlay,
  normalizeCaptainsByGameweek,
  mergeCloudPredictionsPreservingLocalBoosts,
  setOnlyCaptainForFixtureRound,
} from "./App";

describe("World Cup sync helpers", () => {
  const fixtures = [
    {
      id: 101,
      gameweek: 1,
      homeTeam: "Bosnia and Herzegovina",
      awayTeam: "South Korea",
      kickoff: "2026-06-12T23:59:00Z",
      kickoffTimeConfirmed: false,
    },
    {
      id: 102,
      gameweek: 1,
      homeTeam: "United States",
      awayTeam: "Türkiye",
      kickoff: "2026-06-13T23:59:00Z",
      kickoffTimeConfirmed: false,
    },
  ];

  test("normalizes World Cup aliases used by the live feed", () => {
    expect(normalizeTeamName("Bosnia-Herzegovina")).toBe(
      normalizeTeamName("Bosnia and Herzegovina")
    );
    expect(normalizeTeamName("Korea Republic")).toBe(
      normalizeTeamName("South Korea")
    );
    expect(normalizeTeamName("USA")).toBe(normalizeTeamName("United States"));
    expect(normalizeTeamName("Turkey")).toBe(normalizeTeamName("Türkiye"));
  });

  test("matches a live API match to the correct local World Cup fixture", () => {
    const match = {
      homeTeam: { name: "Bosnia-Herzegovina" },
      awayTeam: { name: "Korea Republic" },
      matchday: 1,
      utcDate: "2026-06-12T19:00:00Z",
    };

    expect(findFixtureForApiMatch(match, fixtures)).toEqual(fixtures[0]);
  });

  test("builds kickoff overrides and results from live matches", () => {
    const payload = buildFixtureSyncPayload(
      [
        {
          homeTeam: { name: "USA" },
          awayTeam: { name: "Turkey" },
          matchday: 1,
          utcDate: "2026-06-13T17:00:00Z",
          status: "FINISHED",
          score: {
            fullTime: { home: 2, away: 1 },
            halfTime: { home: 1, away: 1 },
          },
        },
      ],
      fixtures
    );

    expect(payload.matchedCount).toBe(1);
    expect(payload.updatedResults).toEqual({
      102: { homeGoals: 2, awayGoals: 1 },
    });
    expect(payload.fixtureOverrides).toEqual({
      102: {
        kickoff: "2026-06-13T17:00:00Z",
        kickoffTimeConfirmed: true,
      },
    });
    expect(payload.matchStateUpdates).toEqual({
      102: {
        status: "FINISHED",
        homeGoals: 2,
        awayGoals: 1,
        halfTimeHomeGoals: 1,
        halfTimeAwayGoals: 1,
        utcDate: "2026-06-13T17:00:00Z",
      },
    });
  });

  test("sorts fixtures by updated kickoff time while preserving same-time order", () => {
    const unsortedFixtures = [
      { id: "late", kickoff: "2026-05-17T16:30:00Z" },
      { id: "same-1", kickoff: "2026-05-17T14:00:00Z" },
      { id: "early", kickoff: "2026-05-16T11:30:00Z" },
      { id: "same-2", kickoff: "2026-05-17T14:00:00Z" },
    ];

    expect(sortFixturesByOrderOfPlay(unsortedFixtures).map((f) => f.id)).toEqual([
      "early",
      "same-1",
      "same-2",
      "late",
    ]);
  });

  test("keeps captains on different World Cup matchdays", () => {
    const preds = {
      920033: { isDouble: true, updatedAt: 1 },
      920037: { isDouble: true, updatedAt: 2 },
    };
    const fixtures = [
      { id: 920033, gameweek: 10 },
      { id: 920037, gameweek: 11 },
    ];

    expect(normalizeCaptainsByGameweek(preds, fixtures)).toEqual(preds);
  });

  test("does not collapse Premier League and World Cup rounds with the same number", () => {
    const preds = {
      101: { isDouble: true, updatedAt: 1 },
      920033: { isDouble: true, updatedAt: 2 },
    };
    const premierFixtures = [{ id: 101, gameweek: 10 }];
    const worldCupFixtures = [{ id: 920033, gameweek: 10 }];

    const normalized = normalizeCaptainsByGameweek(
      normalizeCaptainsByGameweek(preds, premierFixtures),
      worldCupFixtures
    );

    expect(normalized[101].isDouble).toBe(true);
    expect(normalized[920033].isDouble).toBe(true);
  });

  test("preserves local captain flags when cloud data is stale", () => {
    const fixture = {
      id: 920028,
      gameweek: 8,
      kickoff: "2026-06-19T01:00:00Z",
      kickoffTimeConfirmed: true,
    };
    const cloudPreds = {
      920028: { homeGoals: "2", awayGoals: "1", isDouble: false, isTriple: false },
    };
    const localPreds = {
      920028: { homeGoals: "2", awayGoals: "1", isDouble: true, isTriple: false },
    };

    const merged = mergeCloudPredictionsPreservingLocalBoosts(
      cloudPreds,
      localPreds,
      [fixture]
    );

    expect(merged[920028].isDouble).toBe(true);
  });

  test("preserves local captain flags for unlocked future fixtures too", () => {
    const fixture = {
      id: 920040,
      gameweek: 11,
      kickoff: "2999-06-22T01:00:00Z",
      kickoffTimeConfirmed: true,
    };
    const cloudPreds = {
      920040: { homeGoals: "1", awayGoals: "1", isDouble: false, isTriple: false },
    };
    const localPreds = {
      920040: { homeGoals: "1", awayGoals: "1", isDouble: true, isTriple: false },
    };

    const merged = mergeCloudPredictionsPreservingLocalBoosts(
      cloudPreds,
      localPreds,
      [fixture]
    );

    expect(merged[920040].isDouble).toBe(true);
  });

  test("selecting a captain in one World Cup matchday keeps captains in other matchdays", () => {
    const fixtures = [
      { id: 920033, gameweek: 10 },
      { id: 920035, gameweek: 10 },
      { id: 920038, gameweek: 11 },
    ];
    const preds = {
      920035: { isDouble: true, isTriple: false },
      920038: { isDouble: true, isTriple: false },
    };

    const updated = setOnlyCaptainForFixtureRound(preds, 920038, fixtures);

    expect(updated[920035].isDouble).toBe(true);
    expect(updated[920038].isDouble).toBe(true);
  });

  test("selecting a captain clears only the previous captain in the same World Cup matchday", () => {
    const fixtures = [
      { id: 920033, gameweek: 10 },
      { id: 920035, gameweek: 10 },
      { id: 920038, gameweek: 11 },
    ];
    const preds = {
      920033: { isDouble: false, isTriple: false },
      920035: { isDouble: true, isTriple: false },
      920038: { isDouble: true, isTriple: false },
    };

    const updated = setOnlyCaptainForFixtureRound(preds, 920033, fixtures);

    expect(updated[920033].isDouble).toBe(true);
    expect(updated[920035].isDouble).toBe(false);
    expect(updated[920038].isDouble).toBe(true);
  });
});
