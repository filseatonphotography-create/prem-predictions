import {
  FANTASY_SUGGESTED_TEAM_CONFIG,
  createFantasySuggestedTeam,
} from "./suggestedTeam";

function makePlayer(id, position, teamCode, price = 5, options = {}) {
  return {
    id,
    sourceId: id,
    name: `${teamCode} ${position} ${id}`,
    displayName: `${teamCode} ${position} ${id}`,
    webName: id,
    teamCode,
    teamName: teamCode,
    position,
    price,
    priceTenths: Math.round(price * 10),
    active: true,
    availabilityStatus: "available",
    externalMetadata: {
      form: 5,
      pointsPerGame: 4,
      selectedByPercent: 8,
      minutes: 650,
      starts: 7,
    },
    dataSource: "test",
    ...options,
  };
}

function makePool() {
  const teams = ["ARS", "MCI", "LIV", "CHE", "NEW", "AVL", "BOU", "FUL", "BRE", "CRY"];
  const positions = { GK: 2, DEF: 5, MID: 5, FWD: 3 };
  return teams.flatMap((team, teamIndex) =>
    Object.entries(positions).flatMap(([position, count]) =>
      Array.from({ length: count }, (_, index) =>
        makePlayer(`${team}-${position}-${index}`, position, team, 4.5 + (index % 3) * 0.5 + (position === "FWD" ? 1 : 0), {
          externalMetadata: {
            form: Math.max(1, 8 - teamIndex * 0.35 - index * 0.1),
            pointsPerGame: Math.max(1, 6 - teamIndex * 0.25),
            selectedByPercent: Math.max(1, 25 - teamIndex),
            minutes: 800 - index * 35,
            starts: 8 - (index % 2),
          },
        })
      )
    )
  );
}

function makeOutlooks() {
  return Object.fromEntries(
    ["ARS", "MCI", "LIV", "CHE", "NEW", "AVL", "BOU", "FUL", "BRE", "CRY"].map((team, index) => [
      team,
      {
        overallScore: 82 - index * 4,
        attackScore: 84 - index * 4,
        defenceScore: 80 - index * 3,
        fixtureCount: 3,
        fixtures: [{ overallScore: 82 - index * 4, attackScore: 84 - index * 4, defenceScore: 80 - index * 3 }],
      },
    ])
  );
}

function validateSquad(squad) {
  const players = squad.players || [];
  const counts = players.reduce((out, player) => {
    out.positions[player.position] = (out.positions[player.position] || 0) + 1;
    out.clubs[player.teamCode] = (out.clubs[player.teamCode] || 0) + 1;
    if (player.squadRole === "starter") out.starters += 1;
    if (player.squadRole === "bench") out.bench += 1;
    return out;
  }, { positions: {}, clubs: {}, starters: 0, bench: 0 });
  const errors = [];
  Object.entries(FANTASY_SUGGESTED_TEAM_CONFIG.positions).forEach(([position, expected]) => {
    if ((counts.positions[position] || 0) !== expected) errors.push(position);
  });
  if (players.reduce((sum, player) => sum + player.price, 0) > 100) errors.push("budget");
  if (Object.values(counts.clubs).some((count) => count > 3)) errors.push("club");
  if (counts.starters !== 11 || counts.bench !== 4) errors.push("roles");
  if (!squad.captainPlayerId || !squad.viceCaptainPlayerId) errors.push("captains");
  return { isValid: errors.length === 0, errors };
}

function scoreReport({ squad }) {
  const average = (squad.players || []).reduce((sum, player) => sum + Number(player.suggestedTeamScore || 0), 0) / squad.players.length;
  return { overallScore: Math.round(Math.min(100, average + 25)), categories: {}, players: squad.players };
}

function spendByGroup(players = []) {
  return players.reduce((out, player) => {
    const key = ["GK", "DEF"].includes(player.position) ? "defensive" : "attacking";
    out[key] += Number(player.price || 0);
    return out;
  }, { defensive: 0, attacking: 0 });
}

describe("Prediction Addiction suggested team", () => {
  test("builds a legal 15-player squad under budget and club limits", () => {
    const suggestion = createFantasySuggestedTeam({
      players: makePool(),
      clubOutlooks: makeOutlooks(),
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
    });

    expect(suggestion.status).toBe("ready");
    expect(suggestion.players).toHaveLength(15);
    expect(suggestion.validation.isValid).toBe(true);
    expect(suggestion.totalCost).toBeLessThanOrEqual(100);
    expect(Math.max(...Object.values(suggestion.clubCounts))).toBeLessThanOrEqual(3);
    expect(suggestion.starters).toHaveLength(11);
    expect(suggestion.bench).toHaveLength(4);
    expect(suggestion.captain).toBeTruthy();
    expect(suggestion.viceCaptain).toBeTruthy();
  });

  test("excludes actionable availability risks from recommendations", () => {
    const injuredStar = makePlayer("injured-star", "FWD", "ARS", 6, {
      availabilityStatus: "unavailable",
      externalMetadata: {
        rawStatus: "i",
        news: "Injured",
        chanceOfPlayingNextRound: 0,
        form: 10,
        pointsPerGame: 10,
        selectedByPercent: 50,
        minutes: 900,
        starts: 10,
      },
    });
    const suggestion = createFantasySuggestedTeam({
      players: [injuredStar, ...makePool()],
      clubOutlooks: makeOutlooks(),
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
    });

    expect(suggestion.status).toBe("ready");
    expect(suggestion.players.some((player) => player.id === injuredStar.id)).toBe(false);
    expect(suggestion.warnings.join(" ")).toMatch(/availability risk/i);
  });

  test("uses budget for premium players when they have stronger role and upside", () => {
    const premiumPlayers = [
      makePlayer("premium-fwd", "FWD", "ARS", 13, {
        externalMetadata: { form: 9, pointsPerGame: 8, selectedByPercent: 45, minutes: 900, starts: 10 },
      }),
      makePlayer("premium-mid", "MID", "MCI", 12, {
        externalMetadata: { form: 8.5, pointsPerGame: 7.5, selectedByPercent: 42, minutes: 890, starts: 10 },
      }),
      makePlayer("premium-def", "DEF", "LIV", 7.5, {
        externalMetadata: { form: 7.5, pointsPerGame: 6.5, selectedByPercent: 35, minutes: 880, starts: 10 },
      }),
    ];
    const suggestion = createFantasySuggestedTeam({
      players: [...premiumPlayers, ...makePool()],
      clubOutlooks: makeOutlooks(),
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
    });

    expect(suggestion.status).toBe("ready");
    expect(suggestion.totalCost).toBeGreaterThanOrEqual(85);
    expect(suggestion.players.map((player) => player.id)).toEqual(expect.arrayContaining(["premium-fwd", "premium-mid"]));
  });

  test("does not start players with weak starting evidence", () => {
    const rotationRisk = makePlayer("rotation-risk", "MID", "ARS", 12, {
      externalMetadata: { form: 9, pointsPerGame: 8, selectedByPercent: 25, minutes: 90, starts: 1 },
    });
    const suggestion = createFantasySuggestedTeam({
      players: [rotationRisk, ...makePool()],
      clubOutlooks: makeOutlooks(),
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
    });

    expect(suggestion.status).toBe("ready");
    expect(suggestion.starters.some((player) => player.id === rotationRisk.id)).toBe(false);
  });

  test("excludes available forwards with Gabriel Jesus-style rotation evidence", () => {
    const gabrielJesusProfile = makePlayer("gabriel-jesus", "FWD", "ARS", 6, {
      availabilityStatus: "available",
      externalMetadata: {
        form: 0,
        pointsPerGame: 1.7,
        selectedByPercent: 0.4,
        minutes: 418,
        starts: 3,
        totalPoints: 24,
      },
    });
    const suggestion = createFantasySuggestedTeam({
      players: [gabrielJesusProfile, ...makePool()],
      clubOutlooks: makeOutlooks(),
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
    });

    expect(suggestion.status).toBe("ready");
    expect(suggestion.players.some((player) => player.id === gabrielJesusProfile.id)).toBe(false);
  });

  test("attacking and defensive styles prefer different starting shapes", () => {
    const players = makePool();
    const clubOutlooks = makeOutlooks();
    const attacking = createFantasySuggestedTeam({
      players,
      clubOutlooks,
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
      style: "attacking",
    });
    const defensive = createFantasySuggestedTeam({
      players,
      clubOutlooks,
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
      style: "defensive",
    });
    const attackingCounts = attacking.starters.reduce((out, player) => ({ ...out, [player.position]: (out[player.position] || 0) + 1 }), {});
    const defensiveCounts = defensive.starters.reduce((out, player) => ({ ...out, [player.position]: (out[player.position] || 0) + 1 }), {});

    expect(attacking.status).toBe("ready");
    expect(defensive.status).toBe("ready");
    expect(attacking.style).toBe("attacking");
    expect(defensive.style).toBe("defensive");
    expect(attacking.formation).toBe("3-4-3");
    expect(["5-4-1", "5-3-2"]).toContain(defensive.formation);
    expect(attackingCounts.FWD).toBeGreaterThanOrEqual(defensiveCounts.FWD);
    expect(defensiveCounts.DEF).toBeGreaterThanOrEqual(attackingCounts.DEF);
  });

  test("style changes where the budget is concentrated", () => {
    const players = [
      ...makePool(),
      makePlayer("premium-att-mid", "MID", "MCI", 12, {
        externalMetadata: { form: 9, pointsPerGame: 8, selectedByPercent: 40, minutes: 900, starts: 10 },
      }),
      makePlayer("premium-att-fwd", "FWD", "LIV", 13, {
        externalMetadata: { form: 9, pointsPerGame: 8, selectedByPercent: 40, minutes: 900, starts: 10 },
      }),
      makePlayer("premium-def-gk", "GK", "NEW", 6.5, {
        externalMetadata: { form: 9, pointsPerGame: 8, selectedByPercent: 35, minutes: 900, starts: 10 },
      }),
      makePlayer("premium-def-def", "DEF", "AVL", 7.5, {
        externalMetadata: { form: 9, pointsPerGame: 8, selectedByPercent: 35, minutes: 900, starts: 10 },
      }),
    ];
    const clubOutlooks = makeOutlooks();
    const attacking = createFantasySuggestedTeam({
      players,
      clubOutlooks,
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
      style: "attacking",
    });
    const defensive = createFantasySuggestedTeam({
      players,
      clubOutlooks,
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
      style: "defensive",
    });
    const attackingSpend = spendByGroup(attacking.players);
    const defensiveSpend = spendByGroup(defensive.players);

    expect(attackingSpend.attacking).toBeGreaterThan(defensiveSpend.attacking);
    expect(defensiveSpend.defensive).toBeGreaterThan(attackingSpend.defensive);
  });

  test("starting XI requires stronger minutes evidence than bench", () => {
    const benchCover = makePlayer("bench-cover", "MID", "MCI", 4.5, {
      externalMetadata: { form: 8, pointsPerGame: 6, selectedByPercent: 10, minutes: 450, starts: 5 },
    });
    const basePool = makePool();
    const highMids = Array.from(
      basePool
        .filter((player) => player.position === "MID")
        .reduce((map, player) => (map.has(player.teamCode) ? map : map.set(player.teamCode, player)), new Map())
        .values()
    ).slice(0, 4);
    const players = [
      benchCover,
      ...basePool.filter((player) => player.position !== "MID"),
      ...highMids,
    ];
    const suggestion = createFantasySuggestedTeam({
      players,
      clubOutlooks: makeOutlooks(),
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
      style: "balanced",
    });

    expect(suggestion.players.some((player) => player.id === benchCover.id)).toBe(true);
    expect(suggestion.starters.some((player) => player.id === benchCover.id)).toBe(false);
  });

  test("attacking style can carry one cheap non-starting outfield bench enabler", () => {
    const expensivePool = makePool().map((player) => ({
      ...player,
      price: player.position === "GK" ? 5 : player.position === "DEF" ? 6 : player.position === "MID" ? 8 : 9,
    }));
    const benchEnabler = makePlayer("cheap-attacking-enabler", "MID", "CRY", 4, {
      externalMetadata: { form: 0, pointsPerGame: 1, selectedByPercent: 0.2, minutes: 0, starts: 0 },
    });
    const tightConfig = {
      ...FANTASY_SUGGESTED_TEAM_CONFIG,
      budget: 107,
      preferredMinimumSpend: 100,
      softPlayersPerClub: 3,
    };
    const validateTightSquad = (squad) => {
      const validation = validateSquad(squad);
      return {
        ...validation,
        isValid: validation.errors.filter((error) => error !== "budget").length === 0 &&
          squad.players.reduce((sum, player) => sum + player.price, 0) <= tightConfig.budget,
        errors: validation.errors.filter((error) => error !== "budget"),
      };
    };

    const balanced = createFantasySuggestedTeam({
      players: [benchEnabler, ...expensivePool],
      clubOutlooks: makeOutlooks(),
      validateSquad: validateTightSquad,
      scoreReport: () => ({ overallScore: 90, categories: {}, players: [] }),
      playerDataStatus: { status: "ready", cacheStatus: "live" },
      style: "balanced",
      config: tightConfig,
    });
    const attacking = createFantasySuggestedTeam({
      players: [benchEnabler, ...expensivePool],
      clubOutlooks: makeOutlooks(),
      validateSquad: validateTightSquad,
      scoreReport: () => ({ overallScore: 90, categories: {}, players: [] }),
      playerDataStatus: { status: "ready", cacheStatus: "live" },
      style: "attacking",
      config: tightConfig,
    });

    expect(balanced.status).toBe("ready");
    expect(balanced.players.some((player) => player.id === benchEnabler.id)).toBe(false);
    expect(attacking.status).toBe("ready");
    expect(attacking.players.filter((player) => player.suggestedBenchEnablerEligible)).toHaveLength(1);
    expect(attacking.bench.some((player) => player.id === benchEnabler.id)).toBe(true);
    expect(attacking.starters.some((player) => player.id === benchEnabler.id)).toBe(false);
    expect(attacking.reasons.join(" ")).toMatch(/cheap outfield bench enabler/);
  });

  test("avoids tripling up on clubs when comparable alternatives exist", () => {
    const suggestion = createFantasySuggestedTeam({
      players: makePool(),
      clubOutlooks: makeOutlooks(),
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
      style: "balanced",
    });

    expect(suggestion.status).toBe("ready");
    expect(Math.max(...Object.values(suggestion.clubCounts))).toBeLessThanOrEqual(2);
  });

  test("allows a third club player when the outlook clearly warrants it", () => {
    const standoutPlayers = [
      makePlayer("ars-premium-fwd", "FWD", "ARS", 13, {
        externalMetadata: { form: 10, pointsPerGame: 8, selectedByPercent: 55, minutes: 900, starts: 10 },
      }),
      makePlayer("ars-premium-mid", "MID", "ARS", 12, {
        externalMetadata: { form: 10, pointsPerGame: 8, selectedByPercent: 55, minutes: 900, starts: 10 },
      }),
      makePlayer("ars-premium-def", "DEF", "ARS", 7.5, {
        externalMetadata: { form: 10, pointsPerGame: 8, selectedByPercent: 55, minutes: 900, starts: 10 },
      }),
    ];
    const outlooks = {
      ...makeOutlooks(),
      ARS: { overallScore: 100, attackScore: 100, defenceScore: 100, fixtureCount: 3, fixtures: [{ overallScore: 100, attackScore: 100, defenceScore: 100 }] },
    };
    const suggestion = createFantasySuggestedTeam({
      players: [...standoutPlayers, ...makePool()],
      clubOutlooks: outlooks,
      validateSquad,
      scoreReport,
      playerDataStatus: { status: "ready", cacheStatus: "live" },
      style: "balanced",
    });

    expect(suggestion.status).toBe("ready");
    expect(suggestion.clubCounts.ARS).toBe(3);
  });

  test("does not present sub-85 drafts as strong recommendations", () => {
    const suggestion = createFantasySuggestedTeam({
      players: makePool(),
      clubOutlooks: makeOutlooks(),
      validateSquad,
      scoreReport: ({ squad }) => ({ overallScore: 72, categories: {}, players: squad.players }),
      playerDataStatus: { status: "ready", cacheStatus: "live" },
      style: "balanced",
    });

    expect(suggestion.status).toBe("review");
    expect(suggestion.overallScore).toBe(72);
    expect(suggestion.warnings.join(" ")).toMatch(/No strong 85\+/);
  });
});
