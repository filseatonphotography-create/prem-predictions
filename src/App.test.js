import {
  normalizeTeamName,
  getTeamCode,
  isValidSeasonWinnerRecord,
  isFixtureLive,
  findFixtureForApiMatch,
  buildFixtureSyncPayload,
  mergeFixtureOverrides,
  getWorldCupStageLabel,
  sortFixturesByOrderOfPlay,
  normalizeCaptainsByGameweek,
  mergeCloudPredictionsPreservingLocalBoosts,
  setOnlyCaptainForFixtureRound,
} from "./App";
import FIXTURES from "./fixtures";
import WORLD_CUP_FIXTURES from "./worldCupFixtures";
const { getMatchScoreForPrediction } = require("./matchScoreUtils");
const fs = require("fs");
const {
  didGoalCountIncrease,
  normalizeInternationalTeamName,
  normalizeFootballTeamName,
  parseFixtureArraySource,
  getDeviceSubscriptions,
  getPreviousLiveScore,
  isPushTypeEnabled,
} = require("../notificationUtils");

describe("push notification subscriptions", () => {
  test("supports legacy single-device records", () => {
    const subscription = { endpoint: "https://push.example/device-1" };
    expect(getDeviceSubscriptions({ subscription })).toEqual([subscription]);
  });

  test("deduplicates multi-device records by endpoint", () => {
    const latest = { endpoint: "https://push.example/device-1", keys: { auth: "new" } };
    const second = { endpoint: "https://push.example/device-2" };
    expect(
      getDeviceSubscriptions({
        subscriptions: [
          { endpoint: "https://push.example/device-1", keys: { auth: "old" } },
          latest,
          second,
        ],
      })
    ).toEqual([latest, second]);
  });
});

describe("2026/27 Premier League data", () => {
  test("contains 38 complete gameweeks and 20 clubs", () => {
    expect(FIXTURES).toHaveLength(380);
    expect(new Set(FIXTURES.map((fixture) => fixture.id)).size).toBe(380);
    expect(new Set(FIXTURES.map((fixture) => fixture.gameweek)).size).toBe(38);
    expect(
      new Set(FIXTURES.flatMap((fixture) => [fixture.homeTeam, fixture.awayTeam])).size
    ).toBe(20);

    for (let gameweek = 1; gameweek <= 38; gameweek += 1) {
      expect(FIXTURES.filter((fixture) => fixture.gameweek === gameweek)).toHaveLength(10);
    }
  });

  test("supports the promoted clubs and their three-letter codes", () => {
    expect(normalizeTeamName("Coventry")).toBe(
      normalizeTeamName("Coventry City FC")
    );
    expect(normalizeTeamName("Hull")).toBe(normalizeTeamName("Hull City AFC"));
    expect(normalizeTeamName("Ipswich")).toBe(
      normalizeTeamName("Ipswich Town FC")
    );
    expect(getTeamCode("Coventry City FC")).toBe("COV");
    expect(getTeamCode("Hull City AFC")).toBe("HUL");
    expect(getTeamCode("Ipswich Town FC")).toBe("IPS");
  });
});

describe("season winner history", () => {
  test("rejects malformed Premier League season spans", () => {
    expect(
      isValidSeasonWinnerRecord({ mode: "premierLeague", seasonLabel: "2025/26" })
    ).toBe(true);
    expect(
      isValidSeasonWinnerRecord({ mode: "premierLeague", seasonLabel: "2025/27" })
    ).toBe(false);
    expect(
      isValidSeasonWinnerRecord({ mode: "premierLeague", seasonLabel: "2025/2027" })
    ).toBe(false);
  });
});

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

  test("labels group and knockout prediction stages from their fixtures", () => {
    expect(getWorldCupStageLabel({ group: "A" })).toBe("Group Stage");
    expect(getWorldCupStageLabel({ knockoutStage: "Round of 32" })).toBe("Round of 32");
    expect(getWorldCupStageLabel({ knockoutStage: "Quarter-final" })).toBe("Quarter-final");
  });

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
        homeTeam: "United States",
        awayTeam: "Türkiye",
        halfTimeHomeGoals: 1,
        halfTimeAwayGoals: 1,
        utcDate: "2026-06-13T17:00:00Z",
      },
    });
  });

  test("does not create results for fixtures that have not started", () => {
    const payload = buildFixtureSyncPayload(
      [
        {
          homeTeam: { name: "USA" },
          awayTeam: { name: "Turkey" },
          matchday: 1,
          utcDate: "2026-06-13T17:00:00Z",
          status: "TIMED",
          score: {
            fullTime: { home: 0, away: 0 },
            halfTime: { home: null, away: null },
          },
        },
        {
          homeTeam: { name: "Bosnia-Herzegovina" },
          awayTeam: { name: "Korea Republic" },
          matchday: 1,
          utcDate: "2026-06-12T19:00:00Z",
          status: "SCHEDULED",
          score: {
            fullTime: { home: null, away: null },
          },
        },
      ],
      fixtures
    );

    expect(payload.matchedCount).toBe(0);
    expect(payload.updatedResults).toEqual({});
    expect(payload.matchStateUpdates[102]).toMatchObject({
      status: "TIMED",
      homeGoals: null,
      awayGoals: null,
    });
    expect(payload.matchStateUpdates[101]).toMatchObject({
      status: "SCHEDULED",
      homeGoals: null,
      awayGoals: null,
    });
  });

  test("includes knockout prediction matchdays with TBA teams", () => {
    const knockoutFixtures = WORLD_CUP_FIXTURES.filter((fixture) => fixture.knockoutStage);

    expect(WORLD_CUP_FIXTURES).toHaveLength(104);
    expect(knockoutFixtures).toHaveLength(32);
    expect(new Set(knockoutFixtures.map((fixture) => fixture.id)).size).toBe(32);
    expect(Math.max(...knockoutFixtures.map((fixture) => fixture.gameweek))).toBe(34);
    expect(
      knockoutFixtures.every(
        (fixture) => fixture.homeTeam === "TBA" && fixture.awayTeam === "TBA"
      )
    ).toBe(true);
  });

  test("replaces knockout TBA teams when the live feed confirms participants", () => {
    const knockoutFixture = WORLD_CUP_FIXTURES.find((fixture) => fixture.matchNumber === 73);
    const payload = buildFixtureSyncPayload(
      [
        {
          id: knockoutFixture.id,
          homeTeam: { name: "Korea Republic" },
          awayTeam: { name: "USA" },
          utcDate: knockoutFixture.kickoff,
          status: "TIMED",
          score: { fullTime: { home: null, away: null } },
        },
      ],
      WORLD_CUP_FIXTURES
    );

    expect(payload.fixtureOverrides[knockoutFixture.id]).toMatchObject({
      homeTeam: "South Korea",
      awayTeam: "United States",
    });
    expect(payload.matchStateUpdates[knockoutFixture.id]).toMatchObject({
      homeTeam: "South Korea",
      awayTeam: "United States",
    });
  });

  test("retains confirmed knockout teams on later fixture refreshes", () => {
    const knockoutFixture = WORLD_CUP_FIXTURES.find((fixture) => fixture.matchNumber === 73);
    const populatedFixture = {
      ...knockoutFixture,
      homeTeam: "South Korea",
      awayTeam: "United States",
    };
    const payload = buildFixtureSyncPayload(
      [
        {
          id: knockoutFixture.id,
          homeTeam: { name: "Korea Republic" },
          awayTeam: { name: "USA" },
          utcDate: knockoutFixture.kickoff,
          status: "TIMED",
          score: { fullTime: { home: null, away: null } },
        },
      ],
      [populatedFixture]
    );

    expect(payload.fixtureOverrides[knockoutFixture.id]).toMatchObject({
      homeTeam: "South Korea",
      awayTeam: "United States",
    });
  });

  test("merges partial fixture refreshes without deleting qualified teams", () => {
    expect(
      mergeFixtureOverrides(
        {
          537417: {
            homeTeam: "South Africa",
            awayTeam: "Canada",
            kickoff: "old",
          },
        },
        { 537417: { kickoff: "new" } }
      )
    ).toEqual({
      537417: {
        homeTeam: "South Africa",
        awayTeam: "Canada",
        kickoff: "new",
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

describe("server fixture source parsing", () => {
  test("loads JavaScript World Cup fixture source", () => {
    const raw = fs.readFileSync("src/worldCupFixtures.js", "utf8");
    const parsed = parseFixtureArraySource(raw, "WORLD_CUP_FIXTURES");
    expect(parsed).toHaveLength(WORLD_CUP_FIXTURES.length);
    expect(parsed[0]).toMatchObject({
      id: 920001,
      homeTeam: "Mexico",
      awayTeam: "South Africa",
    });
  });

  test("loads JSON-style Premier League fixture source", () => {
    const raw = fs.readFileSync("src/fixtures.js", "utf8");
    const parsed = parseFixtureArraySource(raw, "FIXTURES");
    expect(parsed).toHaveLength(FIXTURES.length);
    expect(parsed[0].id).toBe(FIXTURES[0].id);
  });
});

describe("live fixture styling", () => {
  test("treats in-play and half-time matches as live", () => {
    expect(isFixtureLive({ status: "IN_PLAY" })).toBe(true);
    expect(isFixtureLive({ status: "LIVE" })).toBe(true);
    expect(isFixtureLive({ status: "PAUSED" })).toBe(true);
    expect(isFixtureLive({ status: "FINISHED" })).toBe(false);
    expect(isFixtureLive({ status: "TIMED" })).toBe(false);
  });
});

describe("goal notification detection", () => {
  test("scores knockout matches after extra time and excludes penalties", () => {
    expect(
      getMatchScoreForPrediction({
        status: "FINISHED",
        score: {
          duration: "EXTRA_TIME",
          regularTime: { home: 1, away: 1 },
          fullTime: { home: 2, away: 1 },
          penalties: { home: 0, away: 0 },
        },
      })
    ).toMatchObject({ homeGoals: 2, awayGoals: 1, source: "fullTime" });

    expect(
      getMatchScoreForPrediction({
        status: "FINISHED",
        score: {
          duration: "PENALTY_SHOOTOUT",
          regularTime: { home: 1, away: 1 },
          fullTime: { home: 1, away: 1 },
          penalties: { home: 5, away: 4 },
        },
      })
    ).toMatchObject({ homeGoals: 1, awayGoals: 1, source: "regularTime" });
  });

  test("normalizes World Cup API and local team names for server matching", () => {
    expect(normalizeFootballTeamName("Mexico")).toBe(
      normalizeFootballTeamName("Mexico")
    );
    expect(normalizeFootballTeamName("South Korea")).toBe(
      normalizeFootballTeamName("Korea Republic")
    );
    expect(normalizeFootballTeamName("Cote d'Ivoire")).toBe(
      normalizeFootballTeamName("Ivory Coast")
    );
    expect(normalizeFootballTeamName("IR Iran")).toBe(
      normalizeFootballTeamName("Iran")
    );
  });

  test("fixture bell alerts are not blocked by invisible global prefs", () => {
    expect(isPushTypeEnabled("fixtureUpdates", { fixtureUpdates: false })).toBe(true);
    expect(isPushTypeEnabled("bingpot", { bingpot: false })).toBe(false);
  });

  test("uses previous live match state before persisted results", () => {
    expect(
      getPreviousLiveScore(
        { homeGoals: 0, awayGoals: 0 },
        { homeGoals: 1, awayGoals: 0 }
      )
    ).toEqual({ hadScoreBefore: true, prevHome: 0, prevAway: 0 });
  });

  test("falls back to persisted results when no live state exists", () => {
    expect(getPreviousLiveScore({}, { homeGoals: 2, awayGoals: 1 })).toEqual({
      hadScoreBefore: true,
      prevHome: 2,
      prevAway: 1,
    });
  });

  test("sends a catch-up alert when the first live score already contains a goal", () => {
    expect(didGoalCountIncrease(null, null, 0, 1)).toBe(true);
    expect(didGoalCountIncrease(null, null, 0, 0)).toBe(false);
  });

  test("alerts only when the observed goal total increases", () => {
    expect(didGoalCountIncrease(1, 0, 1, 1)).toBe(true);
    expect(didGoalCountIncrease(1, 1, 1, 1)).toBe(false);
    expect(didGoalCountIncrease(2, 1, 1, 1)).toBe(false);
  });

  test("matches World Cup country aliases used by the upstream feed", () => {
    expect(normalizeInternationalTeamName("turkey")).toBe("turkiye");
    expect(normalizeInternationalTeamName("ivory coast")).toBe("cote divoire");
    expect(normalizeInternationalTeamName("korea republic")).toBe("south korea");
    expect(normalizeInternationalTeamName("iran")).toBe("ir iran");
  });
});
