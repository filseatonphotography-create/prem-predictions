import {
  normalizeTeamName,
  getTeamCode,
  isValidSeasonWinnerRecord,
  isFixtureLive,
  findFixtureForApiMatch,
  buildFixtureSyncPayload,
  mergeFixtureOverrides,
  getWorldCupStageLabel,
  getWorldCupStageForGameweek,
  sortFixturesByOrderOfPlay,
  normalizeCaptainsByGameweek,
  mergeCloudPredictionsPreservingLocalBoosts,
  setOnlyCaptainForFixtureRound,
  buildFixtureModel,
  buildGeneratedModelOdds,
  buildWeightedNextFixtureOutlook,
  buildPremierLeagueTableRows,
  buildFantasyIqScoredReport,
  buildFantasyIqClubOutlooks,
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

describe("Fantasy IQ scoring", () => {
  const squadPlayers = [
    ["p1", "Goalkeeper One", "ARS", "GK", "starter"],
    ["p2", "Defender One", "ARS", "DEF", "starter"],
    ["p3", "Defender Two", "CHE", "DEF", "starter"],
    ["p4", "Defender Three", "LIV", "DEF", "starter"],
    ["p5", "Midfielder One", "MCI", "MID", "starter"],
    ["p6", "Midfielder Two", "NEW", "MID", "starter"],
    ["p7", "Midfielder Three", "AVL", "MID", "starter"],
    ["p8", "Midfielder Four", "BHA", "MID", "starter"],
    ["p9", "Forward One", "TOT", "FWD", "starter"],
    ["p10", "Forward Two", "MUN", "FWD", "starter"],
    ["p11", "Forward Three", "BOU", "FWD", "starter"],
    ["p12", "Bench Goalkeeper", "EVE", "GK", "bench"],
    ["p13", "Bench Defender", "FUL", "DEF", "bench"],
    ["p14", "Bench Midfielder", "BRE", "MID", "bench"],
    ["p15", "Bench Forward", "CRY", "FWD", "bench"],
  ];

  function makeFantasyIqSquad(playerOverrides = {}) {
    return {
      confirmed: true,
      captainPlayerId: "p5",
      viceCaptainPlayerId: "p9",
      players: squadPlayers.map(([id, name, teamCode, position, squadRole]) => ({
        id,
        name,
        displayName: name,
        teamCode,
        teamName: teamCode,
        position,
        squadRole,
        availabilityStatus: "available",
        price: 5,
        priceTenths: 50,
        ...(playerOverrides[id] || {}),
      })),
    };
  }

  function makeFantasyIqValidation() {
    return {
      isValid: true,
      errors: [],
      warnings: [],
      summary: {
        starterPositionCounts: { GK: 1, DEF: 3, MID: 4, FWD: 3 },
        clubCounts: Object.fromEntries(squadPlayers.map(([, , teamCode]) => [teamCode, 1])),
        budget: { complete: true, totalCost: 75, remaining: 25, budgetLimit: 100, pricedPlayerCount: 15, totalPlayers: 15 },
      },
    };
  }

  function makeClubOutlooks(score) {
    return Object.fromEntries(
      squadPlayers.map(([, , teamCode]) => [
        teamCode,
        {
          teamCode,
          overallScore: score,
          attackScore: score,
          defenceScore: score,
          confidenceScore: 80,
          fixtures: [{ overallScore: score, attackScore: score, defenceScore: score }],
        },
      ])
    );
  }

  test("spreads strong and weak squads away from the middle", () => {
    const validation = makeFantasyIqValidation();
    const strong = buildFantasyIqScoredReport({
      squad: makeFantasyIqSquad(),
      validation,
      clubOutlooks: makeClubOutlooks(78),
      playerDataStatus: { status: "ready", source: "test" },
    });
    const weak = buildFantasyIqScoredReport({
      squad: makeFantasyIqSquad(),
      validation,
      clubOutlooks: makeClubOutlooks(28),
      playerDataStatus: { status: "ready", source: "test" },
    });

    expect(strong.overallScore).toBeGreaterThan(70);
    expect(weak.overallScore).toBeLessThan(45);
    expect(strong.overallScore - weak.overallScore).toBeGreaterThan(30);
  });

  test("penalises unavailable and doubtful players in the main score", () => {
    const validation = makeFantasyIqValidation();
    const healthy = buildFantasyIqScoredReport({
      squad: makeFantasyIqSquad(),
      validation,
      clubOutlooks: makeClubOutlooks(72),
      playerDataStatus: { status: "ready", source: "test" },
    });
    const injured = buildFantasyIqScoredReport({
      squad: makeFantasyIqSquad({
        p5: {
          availabilityStatus: "unavailable",
          externalMetadata: { chanceOfPlayingNextRound: 0, news: "Injured" },
        },
        p9: {
          availabilityStatus: "doubtful",
          externalMetadata: { chanceOfPlayingNextRound: 50, news: "Knock" },
        },
      }),
      validation,
      clubOutlooks: makeClubOutlooks(72),
      playerDataStatus: { status: "ready", source: "test" },
    });

    expect(healthy.overallScore - injured.overallScore).toBeGreaterThanOrEqual(5);
    expect(injured.concerns.join(" ")).toMatch(/Availability risk/);
    expect(injured.diagnostics.availabilityRisks).toBe(2);
  });

  test("vague unavailable status without injury evidence does not crush strong squads", () => {
    const clubOutlooks = buildFantasyIqClubOutlooks(FIXTURES, {}, {});
    const strongTeams = ["ARS", "ARS", "LIV", "MCI", "MCI", "LIV", "CHE", "MCI", "ARS", "CHE", "LIV", "NEW", "FUL", "BOU", "AVL"];
    const strongSquad = makeFantasyIqSquad(
      Object.fromEntries(
        squadPlayers.map(([id], index) => [
          id,
          {
            teamCode: strongTeams[index],
            teamName: strongTeams[index],
            availabilityStatus: "unavailable",
            externalMetadata: { rawStatus: "u", news: "", chanceOfPlayingNextRound: null, chanceOfPlayingThisRound: null },
          },
        ])
      )
    );
    const report = buildFantasyIqScoredReport({
      squad: strongSquad,
      validation: makeFantasyIqValidation(),
      clubOutlooks,
      playerDataStatus: { status: "ready", source: "test" },
    });

    expect(report.overallScore).toBeGreaterThan(50);
    expect(report.categories.attackOutlook).toBeGreaterThan(50);
    expect(report.diagnostics.availabilityRisks).toBe(0);
  });

  test("elite nailed premium squads can score at the top end", () => {
    const clubOutlooks = buildFantasyIqClubOutlooks(FIXTURES, {}, {});
    const eliteTeams = ["ARS", "ARS", "LIV", "MCI", "MCI", "LIV", "CHE", "MCI", "ARS", "CHE", "LIV", "NEW", "FUL", "BOU", "AVL"];
    const squad = makeFantasyIqSquad(
      Object.fromEntries(
        squadPlayers.map(([id, , , position], index) => [
          id,
          {
            teamCode: eliteTeams[index],
            teamName: eliteTeams[index],
            price: position === "GK" ? 5.5 : position === "DEF" ? 7 : position === "MID" ? 12 : 13,
            priceTenths: position === "GK" ? 55 : position === "DEF" ? 70 : position === "MID" ? 120 : 130,
            externalMetadata: {
              form: 9,
              pointsPerGame: 8,
              selectedByPercent: 45,
              minutes: 900,
              starts: 10,
              totalPoints: 155,
            },
          },
        ])
      )
    );
    const report = buildFantasyIqScoredReport({
      squad,
      validation: makeFantasyIqValidation(),
      clubOutlooks,
      playerDataStatus: { status: "ready", source: "test" },
    });

    expect(report.overallScore).toBeGreaterThanOrEqual(90);
    expect(report.categories.attackOutlook).toBeGreaterThan(70);
  });

  test("injured low-form squads can score at the bottom end", () => {
    const clubOutlooks = buildFantasyIqClubOutlooks(FIXTURES, {}, {});
    const weakTeams = ["HUL", "HUL", "COV", "IPS", "COV", "HUL", "IPS", "COV", "HUL", "IPS", "COV", "EVE", "BRE", "FUL", "CRY"];
    const squad = makeFantasyIqSquad(
      Object.fromEntries(
        squadPlayers.map(([id], index) => [
          id,
          {
            teamCode: weakTeams[index],
            teamName: weakTeams[index],
            availabilityStatus: "unavailable",
            externalMetadata: {
              rawStatus: "i",
              news: "Injured",
              chanceOfPlayingNextRound: 0,
              form: 0,
              pointsPerGame: 0,
              selectedByPercent: 0,
              minutes: 0,
              starts: 0,
              totalPoints: 0,
            },
          },
        ])
      )
    );
    const report = buildFantasyIqScoredReport({
      squad,
      validation: makeFantasyIqValidation(),
      clubOutlooks,
      playerDataStatus: { status: "ready", source: "test" },
    });

    expect(report.overallScore).toBeLessThanOrEqual(10);
    expect(report.diagnostics.availabilityRisks).toBe(15);
  });

  test("does not convert missing fixture outlooks into a fake low score", () => {
    const report = buildFantasyIqScoredReport({
      squad: makeFantasyIqSquad(),
      validation: makeFantasyIqValidation(),
      clubOutlooks: {},
      playerDataStatus: { status: "ready", source: "test" },
    });

    expect(report.overallScore).toBeNull();
    expect(report.categories.fixtureOutlook).toBeNull();
    expect(report.categories.attackOutlook).toBeNull();
    expect(report.categories.defenceOutlook).toBeNull();
    expect(report.transferPriority).toBe("Locked");
    expect(report.diagnostics.scoredPlayers).toBe(0);
    expect(report.diagnostics.unmatchedFixtureClubCodes).toContain("ARS");
    expect(report.concerns.join(" ")).toMatch(/locked until enough squad players/i);
    expect(report.concerns.join(" ")).toMatch(/Fixture outlook missing/);
  });

  test("real fixture model gives attacking clubs usable attack outlooks", () => {
    const outlooks = buildFantasyIqClubOutlooks(FIXTURES, {}, {});

    expect(outlooks.MCI.attackScore).toBeGreaterThan(45);
    expect(outlooks.ARS.attackScore).toBeGreaterThan(45);
    expect(outlooks.MCI.attackScore).toBeGreaterThan(outlooks.HUL.attackScore);
    expect(outlooks.ARS.attackScore).toBeGreaterThan(outlooks.COV.attackScore);
  });

  test("real fixture model separates strong attacking squads from weak attacking squads", () => {
    const outlooks = buildFantasyIqClubOutlooks(FIXTURES, {}, {});
    const makeSquadFromTeams = (teams) =>
      makeFantasyIqSquad(
        Object.fromEntries(
          squadPlayers.map(([id], index) => [id, { teamCode: teams[index], teamName: teams[index] }])
        )
      );
    const validation = makeFantasyIqValidation();
    const strong = buildFantasyIqScoredReport({
      squad: makeSquadFromTeams(["ARS", "ARS", "LIV", "MCI", "MCI", "LIV", "CHE", "MCI", "ARS", "CHE", "LIV", "NEW", "FUL", "BOU", "AVL"]),
      validation,
      clubOutlooks: outlooks,
      playerDataStatus: { status: "ready", source: "test" },
    });
    const weak = buildFantasyIqScoredReport({
      squad: makeSquadFromTeams(["HUL", "HUL", "COV", "IPS", "COV", "HUL", "IPS", "COV", "HUL", "IPS", "COV", "EVE", "BRE", "FUL", "CRY"]),
      validation,
      clubOutlooks: outlooks,
      playerDataStatus: { status: "ready", source: "test" },
    });

    expect(strong.categories.attackOutlook).toBeGreaterThan(weak.categories.attackOutlook + 15);
    expect(strong.overallScore).toBeGreaterThan(weak.overallScore + 10);
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

  test("uses the selected World Cup matchday stage instead of the next kickoff", () => {
    const stageFixtures = [
      { id: 1, gameweek: 17, group: "J" },
      { id: 2, gameweek: 18, knockoutStage: "Round of 32" },
    ];

    expect(getWorldCupStageForGameweek(stageFixtures, 17)).toBe("Group Stage");
    expect(getWorldCupStageForGameweek(stageFixtures, 18)).toBe("Round of 32");
  });

  test("generates knockout probabilities from resolved teams instead of TBA placeholders", () => {
    const knockoutFixtures = [
      { id: 201, homeTeam: "France", awayTeam: "Senegal" },
      { id: 202, homeTeam: "Jordan", awayTeam: "Argentina" },
    ];

    const odds = buildGeneratedModelOdds(knockoutFixtures);

    expect(odds[201]).not.toEqual(odds[202]);
    expect(odds[201].home).toBeLessThan(odds[202].home);
    expect(odds[202].away).toBeLessThan(odds[201].away);
  });

  test("keeps Premier League fixture odds decisive for clear difficulty gaps", () => {
    const fixtures = [
      { id: 301, homeTeam: "Arsenal FC", awayTeam: "Coventry City FC" },
      { id: 302, homeTeam: "Fulham FC", awayTeam: "Chelsea FC" },
      { id: 303, homeTeam: "Manchester City FC", awayTeam: "AFC Bournemouth" },
    ];

    const odds = buildGeneratedModelOdds(fixtures);

    expect(odds[301].home).toBeLessThan(1.4);
    expect(odds[301].away).toBeGreaterThan(8);
    expect(odds[302].away).toBeLessThan(odds[302].home);
    expect(odds[302].draw).toBeGreaterThan(odds[302].away);
    expect(odds[303].home).toBeLessThan(1.4);
    expect(odds[303].away).toBeGreaterThan(7);
  });

  test("uses prior-season standings and promoted-team status in fixture odds", () => {
    const fixtures = [
      { id: 304, homeTeam: "Everton FC", awayTeam: "Coventry City FC" },
      { id: 305, homeTeam: "Everton FC", awayTeam: "Hull City AFC" },
      { id: 306, homeTeam: "Crystal Palace FC", awayTeam: "Sunderland AFC" },
    ];

    const odds = buildGeneratedModelOdds(fixtures);

    expect(odds[305].home).toBeLessThan(odds[304].home);
    expect(odds[305].away).toBeGreaterThan(odds[304].away);
    expect(odds[306].away).toBeLessThan(odds[306].home);
  });

  test("applies a modest home advantage to evenly matched fixtures", () => {
    const fixtures = [
      { id: 307, homeTeam: "Chelsea FC", awayTeam: "Fulham FC" },
      { id: 308, homeTeam: "Fulham FC", awayTeam: "Chelsea FC" },
    ];

    const odds = buildGeneratedModelOdds(fixtures);

    expect(odds[307].home).toBeLessThan(odds[308].away);
    expect(odds[308].home).toBeLessThan(odds[307].away);
    expect(Math.abs(odds[307].home - odds[308].away)).toBeLessThan(0.75);
  });

  test("keeps fixture model probabilities normalised and difficulty derived from expected points", () => {
    const model = buildFixtureModel({
      id: 309,
      homeTeam: "Chelsea FC",
      awayTeam: "Fulham FC",
    });

    expect(model.homeProb + model.drawProb + model.awayProb).toBeCloseTo(1, 8);
    expect(model.scorelineMatrixTotal).toBeCloseTo(1, 8);
    expect(model.homeExpectedPoints).toBeCloseTo(model.homeProb * 3 + model.drawProb, 8);
    expect(model.awayExpectedPoints).toBeCloseTo(model.awayProb * 3 + model.drawProb, 8);
    expect(model.homeProb).toBeGreaterThan(model.awayProb);
    expect(model.homeDifficultyScore).toBeLessThanOrEqual(model.awayDifficultyScore);
    expect(model.homeDifficultyScore).toBe(3);
  });

  test("rates strong home fixtures as easier overall and better for attack", () => {
    const model = buildFixtureModel({
      id: 310,
      homeTeam: "Arsenal FC",
      awayTeam: "Hull City AFC",
    });

    expect(model.homeProb).toBeGreaterThan(model.awayProb);
    expect(model.homeDifficultyScore).toBeLessThan(model.awayDifficultyScore);
    expect(model.homeAttackDifficultyScore).toBeLessThanOrEqual(2);
    expect(model.awayDefenceDifficultyScore).toBeGreaterThanOrEqual(4);
    expect(model.homeExpectedGoals).toBeGreaterThan(model.awayExpectedGoals);
  });

  test("allows strong away teams to overcome home advantage", () => {
    const model = buildFixtureModel({
      id: 311,
      homeTeam: "Hull City AFC",
      awayTeam: "Arsenal FC",
    });

    expect(model.awayProb).toBeGreaterThan(model.homeProb);
    expect(model.awayDifficultyScore).toBeLessThan(model.homeDifficultyScore);
  });

  test("handles missing fixture data without invalid numbers and records fallbacks", () => {
    const model = buildFixtureModel({
      id: 312,
      homeTeam: "Unknown Home",
      awayTeam: "Unknown Away",
    });
    const numericValues = [
      model.homeProb,
      model.drawProb,
      model.awayProb,
      model.homeExpectedGoals,
      model.awayExpectedGoals,
      model.homeCleanSheetProb,
      model.awayCleanSheetProb,
    ];

    expect(numericValues.every((value) => Number.isFinite(value) && value >= 0)).toBe(true);
    expect(model.homeProb + model.drawProb + model.awayProb).toBeCloseTo(1, 8);
    expect(model.fallbacksUsed.length).toBeGreaterThan(0);
  });

  test("uses exact model probabilities for generated odds output", () => {
    const fixture = { id: 313, homeTeam: "Arsenal FC", awayTeam: "Hull City AFC" };
    const model = buildFixtureModel(fixture);
    const odds = buildGeneratedModelOdds([fixture]);

    expect(odds[313].modelProbabilities.home).toBeCloseTo(model.homeProb * 100, 8);
    expect(odds[313].modelProbabilities.draw).toBeCloseTo(model.drawProb * 100, 8);
    expect(odds[313].modelProbabilities.away).toBeCloseTo(model.awayProb * 100, 8);
  });

  test("weights next-three fixture outlooks 50/30/20 and renormalises shorter runs", () => {
    const three = buildWeightedNextFixtureOutlook([
      { difficultyScore: 1, attackDifficultyScore: 2, defenceDifficultyScore: 3, expectedGoals: 2, cleanSheetProbability: 0.4, scoreTwoPlusProbability: 0.5, winProbability: 0.6 },
      { difficultyScore: 3, attackDifficultyScore: 4, defenceDifficultyScore: 5, expectedGoals: 1, cleanSheetProbability: 0.2, scoreTwoPlusProbability: 0.3, winProbability: 0.4 },
      { difficultyScore: 5, attackDifficultyScore: 1, defenceDifficultyScore: 2, expectedGoals: 3, cleanSheetProbability: 0.6, scoreTwoPlusProbability: 0.7, winProbability: 0.8 },
    ]);
    const two = buildWeightedNextFixtureOutlook([
      { difficultyScore: 1, attackDifficultyScore: 2, defenceDifficultyScore: 3, expectedGoals: 2, cleanSheetProbability: 0.4, scoreTwoPlusProbability: 0.5, winProbability: 0.6 },
      { difficultyScore: 3, attackDifficultyScore: 4, defenceDifficultyScore: 5, expectedGoals: 1, cleanSheetProbability: 0.2, scoreTwoPlusProbability: 0.3, winProbability: 0.4 },
    ]);

    expect(three.overallDifficulty).toBeCloseTo(2.4, 8);
    expect(three.attackDifficulty).toBeCloseTo(2.4, 8);
    expect(two.overallDifficulty).toBeCloseTo(1.75, 8);
    expect(two.attackDifficulty).toBeCloseTo(2.75, 8);
  });

  test("builds the current Premier League table from released fixtures", () => {
    const rows = buildPremierLeagueTableRows(FIXTURES, {});
    const teamKeys = new Set(rows.map((row) => normalizeTeamName(row.team.name)));

    expect(rows).toHaveLength(20);
    expect(teamKeys.has(normalizeTeamName("Coventry City FC"))).toBe(true);
    expect(teamKeys.has(normalizeTeamName("Hull City AFC"))).toBe(true);
    expect(teamKeys.has(normalizeTeamName("Ipswich Town FC"))).toBe(true);
    expect(teamKeys.has(normalizeTeamName("West Ham United FC"))).toBe(false);
    expect(teamKeys.has(normalizeTeamName("Wolverhampton Wanderers FC"))).toBe(false);
    expect(rows.every((row) => row.playedGames === 0 && row.points === 0)).toBe(true);
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
    expect(isPushTypeEnabled("badgeEarned", {})).toBe(true);
    expect(isPushTypeEnabled("badgeEarned", { badgeEarned: false })).toBe(false);
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
