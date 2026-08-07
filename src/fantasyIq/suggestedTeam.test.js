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
  return { overallScore: Math.round(average), categories: {}, players: squad.players };
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
});
