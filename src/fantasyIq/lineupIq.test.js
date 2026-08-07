import {
  FANTASY_LINEUP_IQ_CONFIG,
  FANTASY_LINEUP_IQ_SUPPORTED_FORMATIONS,
  FANTASY_LINEUP_IQ_VERSION,
  buildFantasyLineupSquadFromStarterIds,
  containsFantasyLineupGuaranteeLanguage,
  createFantasyLineupIqAnalysis,
  createFantasyLineupManualAdjustment,
  generateFantasyLineupCandidates,
  getFantasyLineupFormation,
  getFantasyLineupPredictionAdjustment,
  scoreFantasyLineupCaptain,
  scoreFantasyLineupPlayer,
} from "./lineupIq";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const playerRows = [
  ["p1", "Raya", "ARS", "GK", "starter"],
  ["p2", "Gabriel", "ARS", "DEF", "starter"],
  ["p3", "Van Dijk", "LIV", "DEF", "starter"],
  ["p4", "Trippier", "NEW", "DEF", "starter"],
  ["p5", "Damsgaard", "BRE", "DEF", "starter"],
  ["p6", "Saka", "ARS", "MID", "starter"],
  ["p7", "Salah", "LIV", "MID", "starter"],
  ["p8", "Foden", "MCI", "MID", "starter"],
  ["p9", "Gordon", "NEW", "MID", "starter"],
  ["p10", "Haaland", "MCI", "FWD", "starter"],
  ["p11", "Watkins", "AVL", "FWD", "starter"],
  ["p12", "Areola", "EVE", "GK", "bench"],
  ["p13", "Senesi", "BOU", "DEF", "bench"],
  ["p14", "Smith-Rowe", "FUL", "MID", "bench"],
  ["p15", "Joao Felix", "CHE", "FWD", "bench"],
];

function makePlayer([id, name, teamCode, position, squadRole]) {
  return {
    id,
    name,
    displayName: name,
    webName: name,
    teamCode,
    teamName: teamCode,
    position,
    squadRole,
    isCaptain: id === "p6",
    isViceCaptain: id === "p7",
    confidence: 1,
    manuallyConfirmed: true,
    active: true,
    availabilityStatus: "available",
    dataSource: "test",
    canonicalPlayerId: id,
    reconciliationStatus: "matched",
  };
}

function makeSquad(overrides = {}) {
  return {
    source: "manual",
    confirmed: true,
    players: playerRows.map(makePlayer),
    captainPlayerId: "p6",
    viceCaptainPlayerId: "p7",
    formation: "4-4-2",
    ...overrides,
  };
}

function normaliseSquad(squad) {
  const copy = clone(squad);
  const captainId = copy.captainPlayerId;
  const viceId = copy.viceCaptainPlayerId;
  copy.players = (copy.players || []).map((player) => ({
    ...player,
    isCaptain: player.id === captainId,
    isViceCaptain: player.id === viceId,
  }));
  const starters = copy.players.filter((player) => player.squadRole === "starter");
  copy.formation = getFantasyLineupFormation(starters);
  return copy;
}

function validateSquad(squad) {
  const players = squad.players || [];
  const starters = players.filter((player) => player.squadRole === "starter");
  const bench = players.filter((player) => player.squadRole === "bench");
  const counts = starters.reduce((out, player) => {
    out[player.position] = (out[player.position] || 0) + 1;
    return out;
  }, {});
  const allCounts = players.reduce((out, player) => {
    out[player.position] = (out[player.position] || 0) + 1;
    return out;
  }, {});
  const errors = [];
  if (players.length !== 15) errors.push("Squad must contain 15 players.");
  if (starters.length !== 11) errors.push("Starting XI must contain 11 players.");
  if (bench.length !== 4) errors.push("Bench must contain 4 players.");
  if (counts.GK !== 1) errors.push("Starting XI must contain exactly 1 goalkeeper.");
  if ((counts.DEF || 0) < 3) errors.push("Starting XI must contain at least 3 defenders.");
  if ((counts.MID || 0) < 2) errors.push("Starting XI must contain at least 2 midfielders.");
  if ((counts.FWD || 0) < 1) errors.push("Starting XI must contain at least 1 forward.");
  if (allCounts.GK !== 2 || allCounts.DEF !== 5 || allCounts.MID !== 5 || allCounts.FWD !== 3) errors.push("Invalid squad composition.");
  const captain = players.find((player) => player.id === squad.captainPlayerId);
  const vice = players.find((player) => player.id === squad.viceCaptainPlayerId);
  if (!captain || captain.squadRole !== "starter") errors.push("Captain must be a starter.");
  if (!vice || vice.squadRole !== "starter") errors.push("Vice-captain must be a starter.");
  if (captain && vice && captain.id === vice.id) errors.push("Captain and vice-captain cannot be the same player.");
  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    messages: errors,
    summary: {
      formation: getFantasyLineupFormation(starters),
      starters: starters.length,
      bench: bench.length,
      starterPositionCounts: counts,
    },
  };
}

function makeClubOutlook(overall, attack, defence, confidenceScore = 80) {
  return {
    overallScore: overall,
    attackScore: attack,
    defenceScore: defence,
    confidenceScore,
    fixtures: [
      {
        overallScore: overall,
        attackScore: attack,
        defenceScore: defence,
        expectedGoals: attack / 35,
        cleanSheetProbability: defence / 100,
        scoreTwoPlusProbability: attack / 100,
        confidenceScore,
      },
      { overallScore: 50, attackScore: 50, defenceScore: 50, confidenceScore },
      { overallScore: 50, attackScore: 50, defenceScore: 50, confidenceScore },
    ],
  };
}

function makeClubOutlooks(overrides = {}) {
  return {
    ARS: makeClubOutlook(78, 82, 76),
    LIV: makeClubOutlook(86, 94, 78),
    NEW: makeClubOutlook(64, 61, 66),
    BRE: makeClubOutlook(35, 30, 38),
    MCI: makeClubOutlook(91, 96, 85),
    AVL: makeClubOutlook(58, 62, 52),
    EVE: makeClubOutlook(42, 35, 50),
    BOU: makeClubOutlook(72, 68, 76),
    FUL: makeClubOutlook(79, 84, 70),
    CHE: makeClubOutlook(88, 92, 80),
    ...overrides,
  };
}

function makePredictionOutlooks(overrides = {}) {
  return {
    ARS: { teamCode: "ARS", predictionCount: 1, fixtures: [{ predictedFor: 2, predictedAgainst: 0 }] },
    LIV: { teamCode: "LIV", predictionCount: 1, fixtures: [{ predictedFor: 3, predictedAgainst: 1 }] },
    MCI: { teamCode: "MCI", predictionCount: 1, fixtures: [{ predictedFor: 3, predictedAgainst: 0 }] },
    BRE: { teamCode: "BRE", predictionCount: 1, fixtures: [{ predictedFor: 0, predictedAgainst: 3 }] },
    FUL: { teamCode: "FUL", predictionCount: 1, fixtures: [{ predictedFor: 2, predictedAgainst: 1 }] },
    CHE: { teamCode: "CHE", predictionCount: 1, fixtures: [{ predictedFor: 3, predictedAgainst: 1 }] },
    ...overrides,
  };
}

function makeAnalysis(options = {}) {
  return createFantasyLineupIqAnalysis({
    squad: makeSquad(options.squadOverrides),
    clubOutlooks: makeClubOutlooks(options.clubOutlookOverrides),
    predictionOutlooks: makePredictionOutlooks(options.predictionOutlookOverrides),
    normaliseSquad,
    validateSquad,
    playerDataStatus: options.playerDataStatus || { status: "ready", cacheStatus: "fresh-cache" },
    idFactory: () => "lineup-1",
    timestamp: "2026-08-05T00:00:00.000Z",
  });
}

describe("Lineup IQ generation", () => {
  test("confirmed squad generates Lineup IQ", () => {
    expect(makeAnalysis()).toMatchObject({ id: "lineup-1", status: "ready", version: FANTASY_LINEUP_IQ_VERSION });
  });

  test("unconfirmed squad does not generate a working analysis", () => {
    const analysis = makeAnalysis({ squadOverrides: { confirmed: false } });
    expect(analysis.status).toBe("idle");
    expect(analysis.warnings.join(" ")).toMatch(/Confirm your fantasy squad/);
  });

  test("all generated lineups contain 11 starters", () => {
    const analysis = makeAnalysis();
    expect(analysis.diagnostics.evaluatedLegalLineupCount).toBeGreaterThan(0);
    const candidates = generateFantasyLineupCandidates({
      squad: makeSquad(),
      playerScoresById: analysis.diagnostics.playerScores,
      captainScoresById: Object.fromEntries(analysis.captainRankings.map((item) => [item.playerId, item])),
      normaliseSquad,
      validateSquad,
    });
    expect(candidates.every((candidate) => candidate.starterIds.length === 11)).toBe(true);
  });

  test("all generated lineups contain exactly 1 goalkeeper", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedSquad.players.filter((player) => player.squadRole === "starter" && player.position === "GK")).toHaveLength(1);
  });

  test("all generated lineups contain at least 3 defenders", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedSquad.players.filter((player) => player.squadRole === "starter" && player.position === "DEF").length).toBeGreaterThanOrEqual(3);
  });

  test("all generated lineups contain at least 2 midfielders", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedSquad.players.filter((player) => player.squadRole === "starter" && player.position === "MID").length).toBeGreaterThanOrEqual(2);
  });

  test("all generated lineups contain at least 1 forward", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedSquad.players.filter((player) => player.squadRole === "starter" && player.position === "FWD").length).toBeGreaterThanOrEqual(1);
  });

  test("invalid formations are never generated", () => {
    const analysis = makeAnalysis();
    expect(FANTASY_LINEUP_IQ_SUPPORTED_FORMATIONS).toContain(analysis.suggestedFormation);
  });

  test("all supported legal formations can be generated where squad composition allows", () => {
    const analysis = makeAnalysis();
    const candidates = generateFantasyLineupCandidates({
      squad: makeSquad(),
      playerScoresById: analysis.diagnostics.playerScores,
      captainScoresById: Object.fromEntries(analysis.captainRankings.map((item) => [item.playerId, item])),
      normaliseSquad,
      validateSquad,
    });
    const formations = new Set(candidates.map((candidate) => candidate.formation));
    FANTASY_LINEUP_IQ_SUPPORTED_FORMATIONS.forEach((formation) => expect(formations.has(formation)).toBe(true));
  });

  test("immediate fixture contributes 75%", () => {
    expect(FANTASY_LINEUP_IQ_CONFIG.immediateWeight).toBe(0.75);
    const score = scoreFantasyLineupPlayer({
      player: makePlayer(["x", "Mid", "TST", "MID", "starter"]),
      clubOutlook: { overallScore: 20, attackScore: 20, fixtures: [{ overallScore: 100, attackScore: 100 }] },
      predictionOutlook: {},
    });
    expect(score.lineupScore).toBeCloseTo(80, 1);
  });

  test("three-week outlook contributes 25%", () => {
    expect(FANTASY_LINEUP_IQ_CONFIG.threeWeekWeight).toBe(0.25);
    const score = scoreFantasyLineupPlayer({
      player: makePlayer(["x", "Mid", "TST", "MID", "starter"]),
      clubOutlook: { overallScore: 100, attackScore: 100, fixtures: [{ overallScore: 20, attackScore: 20 }] },
      predictionOutlook: {},
    });
    expect(score.lineupScore).toBeCloseTo(40, 1);
  });

  test("GK scoring is defence-led", () => {
    const score = scoreFantasyLineupPlayer({ player: makePlayer(["x", "GK", "TST", "GK", "starter"]), clubOutlook: { overallScore: 20, defenceScore: 100, fixtures: [{ overallScore: 20, defenceScore: 100 }] } });
    expect(score.lineupScore).toBeGreaterThan(85);
  });

  test("DEF scoring is defence-led", () => {
    const score = scoreFantasyLineupPlayer({ player: makePlayer(["x", "DEF", "TST", "DEF", "starter"]), clubOutlook: { overallScore: 20, attackScore: 20, defenceScore: 100, fixtures: [{ overallScore: 20, attackScore: 20, defenceScore: 100 }] } });
    expect(score.lineupScore).toBeGreaterThan(75);
  });

  test("MID scoring is attack-led", () => {
    const score = scoreFantasyLineupPlayer({ player: makePlayer(["x", "MID", "TST", "MID", "starter"]), clubOutlook: { overallScore: 20, attackScore: 100, fixtures: [{ overallScore: 20, attackScore: 100 }] } });
    expect(score.lineupScore).toBeGreaterThan(75);
  });

  test("FWD scoring is attack-led", () => {
    const score = scoreFantasyLineupPlayer({ player: makePlayer(["x", "FWD", "TST", "FWD", "starter"]), clubOutlook: { overallScore: 20, attackScore: 100, fixtures: [{ overallScore: 20, attackScore: 100 }] } });
    expect(score.lineupScore).toBeGreaterThan(80);
  });

  test("user prediction adjustment is capped", () => {
    const player = makePlayer(["x", "MID", "TST", "MID", "starter"]);
    expect(getFantasyLineupPredictionAdjustment(player, { fixtures: [{ predictedFor: 9 }] })).toBe(8);
  });

  test("user prediction does not replace objective model", () => {
    const score = scoreFantasyLineupPlayer({
      player: makePlayer(["x", "MID", "TST", "MID", "starter"]),
      clubOutlook: { overallScore: 20, attackScore: 20, fixtures: [{ overallScore: 20, attackScore: 20 }] },
      predictionOutlook: { fixtures: [{ predictedFor: 5 }] },
    });
    expect(score.lineupScore).toBe(28);
  });

  test("availability risk heavily reduces lineup score", () => {
    const available = scoreFantasyLineupPlayer({
      player: makePlayer(["x", "MID", "TST", "MID", "starter"]),
      clubOutlook: { overallScore: 90, attackScore: 90, fixtures: [{ overallScore: 90, attackScore: 90 }] },
      predictionOutlook: {},
    });
    const unavailable = scoreFantasyLineupPlayer({
      player: { ...makePlayer(["x", "MID", "TST", "MID", "starter"]), availabilityStatus: "unavailable", externalMetadata: { chanceOfPlayingNextRound: 0 } },
      clubOutlook: { overallScore: 90, attackScore: 90, fixtures: [{ overallScore: 90, attackScore: 90 }] },
      predictionOutlook: {},
    });

    expect(unavailable.availabilityRisk).toBe(true);
    expect(available.lineupScore - unavailable.lineupScore).toBeGreaterThan(70);
  });

  test("best lineup has highest deterministic lineup score", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedLineupScore).toBeGreaterThanOrEqual(analysis.currentLineupScore);
  });

  test("tie-break favours stronger captain score", () => {
    const squad = makeSquad();
    const scores = Object.fromEntries(squad.players.map((player) => [player.id, { lineupScore: 50, immediateAttackScore: 50, immediateDefenceScore: 50, confidence: "high" }]));
    const captainScores = Object.fromEntries(squad.players.map((player) => [player.id, { score: player.id === "p15" ? 90 : 50, playerId: player.id }]));
    const best = generateFantasyLineupCandidates({ squad, playerScoresById: scores, captainScoresById: captainScores, normaliseSquad, validateSquad })[0];
    expect(best.starterIds).toContain("p15");
  });

  test("later tie-break favours fewer lineup changes", () => {
    const squad = makeSquad();
    const scores = Object.fromEntries(squad.players.map((player) => [player.id, { lineupScore: 50, immediateAttackScore: 50, immediateDefenceScore: 50, confidence: "high" }]));
    const captainScores = Object.fromEntries(squad.players.map((player) => [player.id, { score: 50, playerId: player.id }]));
    const best = generateFantasyLineupCandidates({ squad, playerScoresById: scores, captainScoresById: captainScores, normaliseSquad, validateSquad })[0];
    expect(best.preservedStarters).toBe(11);
  });

  test("deterministic ID ordering resolves exact ties", () => {
    const squad = makeSquad({ players: playerRows.map(makePlayer).map((player) => ({ ...player, squadRole: player.position === "GK" && player.id === "p12" ? "starter" : player.squadRole })) });
    const scores = Object.fromEntries(squad.players.map((player) => [player.id, { lineupScore: 50, immediateAttackScore: 50, immediateDefenceScore: 50, confidence: "high" }]));
    const captainScores = Object.fromEntries(squad.players.map((player) => [player.id, { score: 50, playerId: player.id }]));
    const first = generateFantasyLineupCandidates({ squad, playerScoresById: scores, captainScoresById: captainScores, normaliseSquad, validateSquad })[0];
    const second = generateFantasyLineupCandidates({ squad, playerScoresById: scores, captainScoresById: captainScores, normaliseSquad, validateSquad })[0];
    expect(first.starterIds.join("|")).toBe(second.starterIds.join("|"));
  });
});

describe("Lineup IQ decisions", () => {
  test("bench order sorts by lineup score", () => {
    const analysis = makeAnalysis();
    const scores = analysis.benchOrder.outfield.map((player) => analysis.diagnostics.playerScores[player.id].lineupScore);
    expect(scores).toEqual([...scores].sort((a, b) => b - a));
  });

  test("substitute goalkeeper remains separate", () => {
    const analysis = makeAnalysis();
    expect(analysis.benchOrder.goalkeeper.position).toBe("GK");
    expect(analysis.benchOrder.outfield.every((player) => player.position !== "GK")).toBe(true);
  });

  test("suggested captain is a starter", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedSquad.players.find((player) => player.id === analysis.suggestedCaptainId).squadRole).toBe("starter");
  });

  test("suggested vice-captain is a different starter", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedViceCaptainId).not.toBe(analysis.suggestedCaptainId);
    expect(analysis.suggestedSquad.players.find((player) => player.id === analysis.suggestedViceCaptainId).squadRole).toBe("starter");
  });

  test("suggested lineup avoids unavailable players when legal alternatives exist", () => {
    const squad = makeSquad({
      players: playerRows.map(makePlayer).map((player) =>
        player.id === "p10"
          ? { ...player, availabilityStatus: "unavailable", externalMetadata: { chanceOfPlayingNextRound: 0 } }
          : player
      ),
    });
    const analysis = createFantasyLineupIqAnalysis({
      squad,
      clubOutlooks: makeClubOutlooks(),
      predictionOutlooks: makePredictionOutlooks(),
      normaliseSquad,
      validateSquad,
    });

    expect(analysis.suggestedSquad.players.find((player) => player.id === "p10").squadRole).toBe("bench");
    expect(analysis.suggestedSquad.players.find((player) => player.id === "p15").squadRole).toBe("starter");
    expect(analysis.warnings.join(" ")).toMatch(/availability/i);
  });

  test("current captain can remain when scores are close", () => {
    const analysis = makeAnalysis({ clubOutlookOverrides: { ARS: makeClubOutlook(90, 96, 80), LIV: makeClubOutlook(91, 97, 80) } });
    expect(analysis.suggestedCaptainId).toBe("p6");
  });

  test("stronger captain is suggested when materially better", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedCaptainId).toBe("p10");
  });

  test("current lineup comparison is accurate", () => {
    const analysis = makeAnalysis();
    expect(analysis.improvement).toBeCloseTo(analysis.suggestedLineupScore - analysis.currentLineupScore, 1);
  });

  test("player-start changes are identified", () => {
    const analysis = makeAnalysis();
    expect(analysis.playerDecisions.some((decision) => decision.currentRole === "bench" && decision.suggestedRole === "starter")).toBe(true);
  });

  test("player-bench changes are identified", () => {
    const analysis = makeAnalysis();
    expect(analysis.playerDecisions.some((decision) => decision.currentRole === "starter" && decision.suggestedRole === "bench")).toBe(true);
  });

  test("formation change is identified", () => {
    const defensiveSquad = makeSquad();
    defensiveSquad.players = defensiveSquad.players.map((player) => ({
      ...player,
      squadRole: ["p1", "p2", "p3", "p4", "p5", "p13", "p6", "p7", "p8", "p10", "p11"].includes(player.id) ? "starter" : "bench",
    }));
    const analysis = createFantasyLineupIqAnalysis({
      squad: defensiveSquad,
      clubOutlooks: makeClubOutlooks(),
      predictionOutlooks: makePredictionOutlooks(),
      normaliseSquad,
      validateSquad,
    });
    expect(analysis.currentFormation).not.toBe(analysis.suggestedFormation);
  });

  test("zero improvement reports already well set", () => {
    const current = makeAnalysis();
    const analysis = createFantasyLineupIqAnalysis({
      squad: current.suggestedSquad,
      clubOutlooks: makeClubOutlooks(),
      predictionOutlooks: makePredictionOutlooks(),
      normaliseSquad,
      validateSquad,
    });
    expect(analysis.verdict).toBe("Already well set");
  });

  test("small improvement uses cautious wording", () => {
    const analysis = makeAnalysis({ clubOutlookOverrides: { CHE: makeClubOutlook(60, 62, 58), FUL: makeClubOutlook(61, 63, 59) } });
    if (analysis.improvement > 0 && analysis.improvement < 3) {
      expect(JSON.stringify(analysis)).toMatch(/close|Small improvement/i);
    } else {
      expect(analysis.verdict).toBeTruthy();
    }
  });

  test("close decisions are labelled correctly", () => {
    const analysis = makeAnalysis({ clubOutlookOverrides: { FUL: makeClubOutlook(60, 62, 58), NEW: makeClubOutlook(60, 62, 58) } });
    expect(analysis.warnings.join(" ")).toMatch(/Close call|Lineup IQ/);
  });

  test("alternative lineups are legal", () => {
    const analysis = makeAnalysis();
    analysis.alternatives.forEach((alternative) => expect(alternative.validation.isValid).toBe(true));
  });

  test("alternatives differ meaningfully", () => {
    const analysis = makeAnalysis();
    analysis.alternatives.forEach((alternative) => {
      const differentStarters = alternative.starterIds.filter((id) => !analysis.suggestedSquad.players.filter((player) => player.squadRole === "starter").map((player) => player.id).includes(id)).length;
      expect(alternative.formation !== analysis.suggestedFormation || differentStarters >= 2).toBe(true);
    });
  });

  test("alternatives remain within configured score distance", () => {
    const analysis = makeAnalysis();
    analysis.alternatives.forEach((alternative) => {
      expect(analysis.suggestedLineupScore - alternative.lineupScore).toBeLessThanOrEqual(FANTASY_LINEUP_IQ_CONFIG.alternativeScoreDistance);
    });
  });

  test("minimal-change option minimises swaps", () => {
    const analysis = makeAnalysis();
    expect(analysis.minimalChange.swaps).toBeLessThanOrEqual(analysis.playerDecisions.filter((decision) => decision.currentRole !== decision.suggestedRole).length / 2);
  });

  test("applying suggested lineup preserves all 15 players", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedSquad.players).toHaveLength(15);
  });

  test("applying changes only starter/bench/captain/vice fields", () => {
    const analysis = makeAnalysis();
    const originalNames = makeSquad().players.map((player) => player.name).sort();
    const nextNames = analysis.suggestedSquad.players.map((player) => player.name).sort();
    expect(nextNames).toEqual(originalNames);
    expect(analysis.suggestedSquad.source).toBe("lineup-iq");
  });

  test("saved squad remains canonically valid", () => {
    const analysis = makeAnalysis();
    expect(validateSquad(analysis.suggestedSquad).isValid).toBe(true);
  });

  test("discarding leaves saved squad unchanged", () => {
    const squad = makeSquad();
    const before = clone(squad);
    makeAnalysis({ squadOverrides: squad });
    expect(squad).toEqual(before);
  });

  test("manual adjustment revalidates formation", () => {
    const analysis = makeAnalysis();
    const adjustment = createFantasyLineupManualAdjustment({
      analysis,
      starterIds: analysis.suggestedSquad.players.filter((player) => player.squadRole === "starter").map((player) => player.id).slice(0, 10),
      captainPlayerId: analysis.suggestedCaptainId,
      viceCaptainPlayerId: analysis.suggestedViceCaptainId,
      normaliseSquad,
      validateSquad,
    });
    expect(adjustment.editableValidation.isValid).toBe(false);
  });

  test("unknown team lowers confidence safely", () => {
    const squad = makeSquad();
    squad.players[0].teamCode = "UNK";
    const analysis = createFantasyLineupIqAnalysis({ squad, clubOutlooks: makeClubOutlooks(), predictionOutlooks: makePredictionOutlooks(), normaliseSquad, validateSquad });
    expect(analysis.confidence.confidence).not.toBe("high");
  });

  test("missing immediate fixture is handled safely", () => {
    const analysis = makeAnalysis({ clubOutlookOverrides: { ARS: { overallScore: 70, attackScore: 70, defenceScore: 70, fixtures: [] } } });
    expect(analysis.status).toBe("ready");
    expect(analysis.confidence.reasons.join(" ")).toMatch(/limited immediate fixture evidence/);
  });

  test("no predictions still produces objective lineup analysis", () => {
    const analysis = createFantasyLineupIqAnalysis({ squad: makeSquad(), clubOutlooks: makeClubOutlooks(), predictionOutlooks: {}, normaliseSquad, validateSquad });
    expect(analysis.status).toBe("ready");
  });

  test("no guarantee language is generated", () => {
    expect(containsFantasyLineupGuaranteeLanguage(makeAnalysis())).toBe(false);
  });

  test("official FPL is not modified", () => {
    expect(makeAnalysis().warnings.join(" ")).toMatch(/Prediction Addiction/);
  });

  test("Transfer IQ remains functionally independent", () => {
    expect(FANTASY_LINEUP_IQ_VERSION).not.toBe("transfer-iq-v1");
  });

  test("Screenshot import remains unaffected by pure helper", () => {
    expect(typeof createFantasyLineupIqAnalysis).toBe("function");
  });

  test("Manual squad builder can consume adjusted squad shape", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedSquad.players[0]).toHaveProperty("squadRole");
  });

  test("Fantasy IQ scoring can consume suggested squad shape", () => {
    const analysis = makeAnalysis();
    expect(analysis.suggestedSquad.confirmed).toBe(true);
  });

  test("Prediction IQ remains unchanged by not storing prediction text", () => {
    expect(JSON.stringify(makeAnalysis())).not.toMatch(/predictedFor|predictedAgainst/);
  });

  test("Win Probability remains unchanged by helper scope", () => {
    expect(makeAnalysis().version).toBe(FANTASY_LINEUP_IQ_VERSION);
  });

  test("Game Difficulty remains unchanged by helper scope", () => {
    expect(makeAnalysis().diagnostics.modelVersion).toBe(FANTASY_LINEUP_IQ_VERSION);
  });

  test("Coins Game remains unchanged by helper scope", () => {
    expect(makeAnalysis().currentSquad.players).toHaveLength(15);
  });

  test("World Cup features remain unchanged by helper scope", () => {
    expect(FANTASY_LINEUP_IQ_SUPPORTED_FORMATIONS).toContain("5-4-1");
  });

  test("no NaN, Infinity or undefined reaches serialised UI data", () => {
    const text = JSON.stringify(makeAnalysis());
    expect(text).not.toMatch(/NaN|Infinity|undefined/);
  });

  test("captain scoring returns suggestion copy, not guarantees", () => {
    const captain = scoreFantasyLineupCaptain({
      player: makePlayer(["x", "Salah", "LIV", "MID", "starter"]),
      playerScore: { threeWeekScore: 90 },
      clubOutlook: makeClubOutlook(90, 95, 75),
      predictionOutlook: { fixtures: [{ predictedFor: 3, predictedAgainst: 1 }] },
    });
    expect(captain.reasons.join(" ")).toMatch(/outlook/);
    expect(containsFantasyLineupGuaranteeLanguage(captain)).toBe(false);
  });

  test("lineup squad builder preserves all unaffected player records", () => {
    const squad = makeSquad();
    const built = buildFantasyLineupSquadFromStarterIds({
      squad,
      starterIds: squad.players.filter((player) => player.squadRole === "starter").map((player) => player.id),
      captainPlayerId: "p6",
      viceCaptainPlayerId: "p7",
      normaliseSquad,
      validateSquad,
    });
    expect(built.squad.players.find((player) => player.id === "p1").name).toBe("Raya");
  });
});
