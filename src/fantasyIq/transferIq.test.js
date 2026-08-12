import {
  FANTASY_TRANSFER_IQ_VERSION,
  buildFantasyIqTransferSquad,
  compareFantasyIqReports,
  createFantasyTransferIqComparison,
  createFantasyTransferIqRecommendations,
  getFantasyTransferLegalBlocker,
  requiresFantasyTransferAvailabilityAcknowledgement,
} from "./transferIq";

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

const players = {
  gk1: { id: "p1", name: "Keeper One", displayName: "Keeper One", teamCode: "ARS", position: "GK", squadRole: "starter", isCaptain: false, isViceCaptain: false },
  def1: { id: "p2", name: "Def One", displayName: "Def One", teamCode: "ARS", position: "DEF", squadRole: "starter", isCaptain: false, isViceCaptain: true },
  def2: { id: "p3", name: "Def Two", displayName: "Def Two", teamCode: "LIV", position: "DEF", squadRole: "starter", isCaptain: false, isViceCaptain: false },
  def3: { id: "p4", name: "Def Three", displayName: "Def Three", teamCode: "MCI", position: "DEF", squadRole: "starter", isCaptain: false, isViceCaptain: false },
  mid1: { id: "p5", name: "Mid One", displayName: "Mid One", teamCode: "ARS", position: "MID", squadRole: "starter", isCaptain: true, isViceCaptain: false },
  mid2: { id: "p6", name: "Mid Two", displayName: "Mid Two", teamCode: "LIV", position: "MID", squadRole: "starter", isCaptain: false, isViceCaptain: false },
  mid3: { id: "p7", name: "Mid Three", displayName: "Mid Three", teamCode: "MCI", position: "MID", squadRole: "starter", isCaptain: false, isViceCaptain: false },
  mid4: { id: "p8", name: "Mid Four", displayName: "Mid Four", teamCode: "NEW", position: "MID", squadRole: "starter", isCaptain: false, isViceCaptain: false },
  fwd1: { id: "p9", name: "Fwd One", displayName: "Fwd One", teamCode: "LIV", position: "FWD", squadRole: "starter", isCaptain: false, isViceCaptain: false },
  fwd2: { id: "p10", name: "Fwd Two", displayName: "Fwd Two", teamCode: "NEW", position: "FWD", squadRole: "starter", isCaptain: false, isViceCaptain: false },
  gk2: { id: "p11", name: "Keeper Two", displayName: "Keeper Two", teamCode: "MCI", position: "GK", squadRole: "bench", isCaptain: false, isViceCaptain: false },
  def4: { id: "p12", name: "Def Four", displayName: "Def Four", teamCode: "NEW", position: "DEF", squadRole: "starter", isCaptain: false, isViceCaptain: false },
  def5: { id: "p13", name: "Def Five", displayName: "Def Five", teamCode: "BOU", position: "DEF", squadRole: "bench", isCaptain: false, isViceCaptain: false },
  mid5: { id: "p14", name: "Mid Five", displayName: "Mid Five", teamCode: "BOU", position: "MID", squadRole: "bench", isCaptain: false, isViceCaptain: false },
  fwd3: { id: "p15", name: "Fwd Three", displayName: "Fwd Three", teamCode: "BOU", position: "FWD", squadRole: "bench", isCaptain: false, isViceCaptain: false },
};

function makeSquad(overrides = {}) {
  return {
    source: "manual",
    confirmed: true,
    players: Object.values(players).map((player) => ({ ...player })),
    captainPlayerId: "p5",
    viceCaptainPlayerId: "p2",
    updatedAt: "2026-08-05T00:00:00.000Z",
    ...overrides,
  };
}

function normaliseSquad(squad) {
  return clone({
    ...squad,
    players: (squad.players || []).map((player) => ({
      ...player,
      isCaptain: player.id === squad.captainPlayerId,
      isViceCaptain: player.id === squad.viceCaptainPlayerId,
    })),
  });
}

function validateSquad(squad) {
  const errors = [];
  const squadPlayers = squad.players || [];
  const starters = squadPlayers.filter((player) => player.squadRole === "starter");
  const bench = squadPlayers.filter((player) => player.squadRole === "bench");
  const clubCounts = squadPlayers.reduce((out, player) => {
    out[player.teamCode] = (out[player.teamCode] || 0) + 1;
    return out;
  }, {});
  const counts = squadPlayers.reduce((out, player) => {
    out[player.position] = (out[player.position] || 0) + 1;
    return out;
  }, {});
  if (squadPlayers.length !== 15) errors.push("Squad must contain 15 players.");
  if (new Set(squadPlayers.map((player) => player.id)).size !== squadPlayers.length) errors.push("Duplicate player selected.");
  if (starters.length !== 11) errors.push("Starting XI must contain 11 players.");
  if (bench.length !== 4) errors.push("Bench must contain 4 players.");
  if (counts.GK !== 2 || counts.DEF !== 5 || counts.MID !== 5 || counts.FWD !== 3) errors.push("Squad position composition is invalid.");
  if (Object.values(clubCounts).some((count) => count > 3)) errors.push("No more than 3 players from one club.");
  const captain = squadPlayers.find((player) => player.id === squad.captainPlayerId);
  const vice = squadPlayers.find((player) => player.id === squad.viceCaptainPlayerId);
  if (!captain) errors.push("Captain missing.");
  if (!vice) errors.push("Vice-captain missing.");
  if (captain && vice && captain.id === vice.id) errors.push("Captain and vice-captain cannot be the same player.");
  if (captain && captain.squadRole !== "starter") errors.push("Captain must be a starter.");
  if (vice && vice.squadRole !== "starter") errors.push("Vice-captain must be a starter.");
  return {
    isValid: errors.length === 0,
    valid: errors.length === 0,
    errors,
    messages: errors,
    summary: { clubCounts },
  };
}

function makeReport(overrides = {}) {
  return {
    overallScore: 70,
    confidence: "medium",
    categories: {
      fixtureOutlook: 70,
      attackOutlook: 70,
      defenceOutlook: 70,
      captaincyOutlook: 70,
      squadBalance: 70,
      predictionAlignment: 70,
      benchStrength: 70,
    },
    strengths: [],
    concerns: [],
    recommendations: [],
    predictionConflicts: [],
    transferPriority: "Medium priority",
    ...overrides,
  };
}

const incomingMid = { id: "in-mid", name: "Incoming Mid", displayName: "Incoming Mid", teamCode: "CHE", teamName: "Chelsea", position: "MID", active: true, availabilityStatus: "available" };
const incomingDef = { id: "in-def", name: "Incoming Def", displayName: "Incoming Def", teamCode: "CHE", teamName: "Chelsea", position: "DEF", active: true, availabilityStatus: "available" };
const incomingGk = { id: "in-gk", name: "Incoming GK", displayName: "Incoming GK", teamCode: "CHE", teamName: "Chelsea", position: "GK", active: true, availabilityStatus: "available" };
const doubtfulMid = { ...incomingMid, id: "in-doubt", availabilityStatus: "doubtful" };
const recommendationPool = [
  { ...incomingMid, id: "in-mid-a", displayName: "Incoming Mid A", price: 7.2, priceTenths: 72, teamCode: "CHE", externalMetadata: { form: "7", pointsPerGame: "6", starts: 10, minutes: 900, selectedByPercent: "18" } },
  { ...incomingMid, id: "in-mid-b", displayName: "Incoming Mid B", price: 6.4, priceTenths: 64, teamCode: "TOT", externalMetadata: { form: "6", pointsPerGame: "5", starts: 9, minutes: 820, selectedByPercent: "12" } },
  { ...incomingDef, id: "in-def-a", displayName: "Incoming Def A", price: 5.1, priceTenths: 51, teamCode: "CHE", externalMetadata: { form: "6", pointsPerGame: "5", starts: 10, minutes: 900, selectedByPercent: "15" } },
  { ...incomingDef, id: "in-def-b", displayName: "Incoming Def B", price: 4.8, priceTenths: 48, teamCode: "TOT", externalMetadata: { form: "5", pointsPerGame: "4", starts: 8, minutes: 760, selectedByPercent: "10" } },
];

describe("Transfer IQ squad building", () => {
  test("valid same-position replacement creates a proposed squad", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p6", incomingPlayer: incomingMid, normaliseSquad, validateSquad });
    expect(result.status).toBe("ready");
    expect(result.proposedSquad.players.some((player) => player.id === "in-mid")).toBe(true);
  });

  test("different-position replacement is rejected", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p6", incomingPlayer: incomingDef, normaliseSquad, validateSquad });
    expect(result.validation.isValid).toBe(false);
    expect(result.validation.errors.join(" ")).toMatch(/midfielder/);
  });

  test("incoming player already owned is rejected", () => {
    const blocker = getFantasyTransferLegalBlocker({ currentSquad: makeSquad(), outgoingPlayerId: "p6", incomingPlayer: players.mid1 });
    expect(blocker).toBe("This player is already in your squad.");
  });

  test("fourth player from one club is rejected", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p6", incomingPlayer: { ...incomingMid, teamCode: "ARS" }, normaliseSquad, validateSquad });
    expect(result.validation.errors.join(" ")).toMatch(/three ARS players/);
  });

  test("current squad is never mutated", () => {
    const squad = makeSquad();
    const before = clone(squad);
    buildFantasyIqTransferSquad({ currentSquad: squad, outgoingPlayerId: "p6", incomingPlayer: incomingMid, normaliseSquad, validateSquad });
    expect(squad).toEqual(before);
  });

  test("proposed player inherits starter role", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p6", incomingPlayer: incomingMid, normaliseSquad, validateSquad });
    expect(result.proposedSquad.players.find((player) => player.id === "in-mid").squadRole).toBe("starter");
  });

  test("proposed player inherits bench role", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p14", incomingPlayer: incomingMid, normaliseSquad, validateSquad });
    expect(result.proposedSquad.players.find((player) => player.id === "in-mid").squadRole).toBe("bench");
  });

  test("removing non-captain preserves captain and vice-captain", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p6", incomingPlayer: incomingMid, normaliseSquad, validateSquad });
    expect(result.proposedSquad.captainPlayerId).toBe("p5");
    expect(result.proposedSquad.viceCaptainPlayerId).toBe("p2");
  });

  test("removing captain requires a replacement captain", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p5", incomingPlayer: incomingMid, normaliseSquad, validateSquad });
    expect(result.validation.errors.join(" ")).toMatch(/replacement captain/);
  });

  test("removing vice-captain requires a replacement vice-captain", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p2", incomingPlayer: incomingDef, normaliseSquad, validateSquad });
    expect(result.validation.errors.join(" ")).toMatch(/replacement vice-captain/);
  });

  test("replacement captain must be a starter", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p5", incomingPlayer: incomingMid, captainPlayerId: "p14", normaliseSquad, validateSquad });
    expect(result.validation.errors.join(" ")).toMatch(/starter/);
  });

  test("captain and vice-captain must remain different", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p5", incomingPlayer: incomingMid, captainPlayerId: "p2", normaliseSquad, validateSquad });
    expect(result.validation.errors.join(" ")).toMatch(/different/);
  });

  test("proposed squad runs through canonical squad validation", () => {
    const validate = jest.fn(validateSquad);
    buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p6", incomingPlayer: incomingMid, normaliseSquad, validateSquad: validate });
    expect(validate).toHaveBeenCalledTimes(1);
  });

  test("inactive canonical players are rejected", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad(), outgoingPlayerId: "p6", incomingPlayer: { ...incomingMid, active: false }, normaliseSquad, validateSquad });
    expect(result.validation.errors.join(" ")).toMatch(/not active/);
  });

  test("hypothetical squad source metadata is transfer iq only", () => {
    const result = buildFantasyIqTransferSquad({ currentSquad: makeSquad({ source: "screenshot" }), outgoingPlayerId: "p6", incomingPlayer: incomingMid, normaliseSquad, validateSquad });
    expect(result.proposedSquad.source).toBe("transfer-iq");
    expect(result.proposedSquad.transferIqVersion).toBe(FANTASY_TRANSFER_IQ_VERSION);
  });
});

describe("Transfer IQ report comparison", () => {
  test("current and proposed squads use the same scoring engine", () => {
    const scoreReport = jest
      .fn()
      .mockReturnValueOnce(makeReport({ overallScore: 70 }))
      .mockReturnValueOnce(makeReport({ overallScore: 76 }));
    const result = createFantasyTransferIqComparison({
      currentSquad: makeSquad(),
      outgoingPlayerId: "p6",
      incomingPlayer: incomingMid,
      normaliseSquad,
      validateSquad,
      scoreReport,
      scoreContext: { clubOutlooks: { CHE: {} }, predictionOutlooks: {} },
      idFactory: () => "comparison-1",
      timestamp: "2026-08-05T00:00:00.000Z",
    });
    expect(scoreReport).toHaveBeenCalledTimes(2);
    expect(result.impact.overallDelta).toBe(6);
  });

  test("overall delta is calculated correctly", () => {
    const impact = compareFantasyIqReports(makeReport({ overallScore: 78 }), makeReport({ overallScore: 84 }));
    expect(impact.overallDelta).toBe(6);
  });

  test("all category deltas are calculated correctly", () => {
    const impact = compareFantasyIqReports(makeReport(), makeReport({ categories: { fixtureOutlook: 72, attackOutlook: 73, defenceOutlook: 74, captaincyOutlook: 75, squadBalance: 76, predictionAlignment: 77, benchStrength: 78 } }));
    expect(impact.categoryDeltas.fixtureOutlook.delta).toBe(2);
    expect(impact.categoryDeltas.benchStrength.delta).toBe(8);
  });

  test("null Prediction Alignment remains null", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, predictionAlignment: null } }), makeReport({ categories: { ...makeReport().categories, predictionAlignment: null } }));
    expect(impact.categoryDeltas.predictionAlignment.delta).toBeNull();
  });

  test("newly available category is represented safely", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, predictionAlignment: null } }), makeReport());
    expect(impact.categoryDeltas.predictionAlignment.status).toBe("newly-available");
    expect(impact.categoryDeltas.predictionAlignment.delta).toBeNull();
  });

  test("score increase produces an improvement verdict", () => {
    const impact = compareFantasyIqReports(makeReport({ overallScore: 70 }), makeReport({ overallScore: 78 }));
    expect(impact.verdict).toBe("Strong improvement");
  });

  test("score decrease produces a reduction verdict", () => {
    const impact = compareFantasyIqReports(makeReport({ overallScore: 70 }), makeReport({ overallScore: 66 }));
    expect(impact.verdict).toBe("Significant reduction");
  });

  test("large opposing category changes produce mixed trade-off", () => {
    const impact = compareFantasyIqReports(
      makeReport({ overallScore: 70, categories: { ...makeReport().categories, attackOutlook: 60, defenceOutlook: 80 } }),
      makeReport({ overallScore: 71, categories: { ...makeReport().categories, attackOutlook: 74, defenceOutlook: 69 } })
    );
    expect(impact.verdict).toBe("Mixed trade-off");
  });

  test("zero delta produces broadly neutral", () => {
    const impact = compareFantasyIqReports(makeReport({ overallScore: 70 }), makeReport({ overallScore: 70 }));
    expect(impact.verdict).toBe("Broadly neutral");
  });

  test("category impacts are sorted by absolute size", () => {
    const impact = compareFantasyIqReports(
      makeReport({ categories: { ...makeReport().categories, fixtureOutlook: 50, attackOutlook: 50, defenceOutlook: 50 } }),
      makeReport({ categories: { ...makeReport().categories, fixtureOutlook: 55, attackOutlook: 70, defenceOutlook: 42 } })
    );
    expect(impact.sortedCategoryImpacts.slice(0, 3).map((row) => row.key)).toEqual(["attackOutlook", "defenceOutlook", "fixtureOutlook"]);
  });

  test("positive explanations use actual category evidence", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, attackOutlook: 50 } }), makeReport({ categories: { ...makeReport().categories, attackOutlook: 61 } }), { incomingPlayer: incomingMid });
    expect(impact.strengthsAdded.join(" ")).toMatch(/Attack Outlook improves by 11 points/);
  });

  test("negative explanations use actual category evidence", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, defenceOutlook: 70 } }), makeReport({ categories: { ...makeReport().categories, defenceOutlook: 62 } }), { incomingPlayer: incomingDef });
    expect(impact.concernsAdded.join(" ")).toMatch(/Defence Outlook reduces by 8 points/);
  });

  test("no guarantee language is generated", () => {
    const impact = compareFantasyIqReports(makeReport({ overallScore: 70 }), makeReport({ overallScore: 76 }), { incomingPlayer: incomingMid });
    const text = JSON.stringify(impact);
    expect(text).not.toMatch(/will score more points|guarantee/i);
  });

  test("GK comparison emphasises defence", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, defenceOutlook: 60 } }), makeReport({ categories: { ...makeReport().categories, defenceOutlook: 72 } }), { incomingPlayer: incomingGk });
    expect(impact.strengthsAdded.join(" ")).toMatch(/Defence Outlook/);
  });

  test("DEF comparison emphasises defence", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, defenceOutlook: 60 } }), makeReport({ categories: { ...makeReport().categories, defenceOutlook: 72 } }), { incomingPlayer: incomingDef });
    expect(impact.strengthsAdded.join(" ")).toMatch(/Defence Outlook/);
  });

  test("MID comparison emphasises attack", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, attackOutlook: 60 } }), makeReport({ categories: { ...makeReport().categories, attackOutlook: 72 } }), { incomingPlayer: incomingMid });
    expect(impact.strengthsAdded.join(" ")).toMatch(/Attack Outlook/);
  });

  test("FWD comparison emphasises attack", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, attackOutlook: 60 } }), makeReport({ categories: { ...makeReport().categories, attackOutlook: 72 } }), { incomingPlayer: { ...incomingMid, position: "FWD" } });
    expect(impact.strengthsAdded.join(" ")).toMatch(/Attack Outlook/);
  });

  test("Prediction Alignment improvement is identified", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, predictionAlignment: 50 } }), makeReport({ categories: { ...makeReport().categories, predictionAlignment: 62 } }));
    expect(impact.strengthsAdded.join(" ")).toMatch(/Prediction Alignment improves/);
  });

  test("Prediction Alignment reduction is identified", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, predictionAlignment: 62 } }), makeReport({ categories: { ...makeReport().categories, predictionAlignment: 50 } }));
    expect(impact.concernsAdded.join(" ")).toMatch(/Prediction Alignment reduces/);
  });

  test("incomplete predictions do not crash comparison", () => {
    const impact = compareFantasyIqReports(makeReport({ categories: { ...makeReport().categories, predictionAlignment: null } }), makeReport());
    expect(impact.recommendationSummary.join(" ")).toMatch(/Prediction Alignment|comparison/);
  });

  test("missing fixture data lowers confidence safely", () => {
    const impact = compareFantasyIqReports(makeReport({ confidence: "high" }), makeReport({ confidence: "low" }));
    expect(impact.confidenceDelta).toMatchObject({ changed: true, direction: "down" });
  });

  test("doubtful availability shows warning but does not alter score", () => {
    const impact = compareFantasyIqReports(makeReport({ overallScore: 70 }), makeReport({ overallScore: 70 }), { incomingPlayer: doubtfulMid });
    expect(requiresFantasyTransferAvailabilityAcknowledgement(doubtfulMid)).toBe(true);
    expect(impact.overallDelta).toBe(0);
    expect(impact.concernsAdded.join(" ")).toMatch(/availability marker/);
  });

  test("comparison data structure contains the expected temporary fields", () => {
    const result = createFantasyTransferIqComparison({
      currentSquad: makeSquad(),
      outgoingPlayerId: "p6",
      incomingPlayer: incomingMid,
      normaliseSquad,
      validateSquad,
      scoreReport: jest.fn(() => makeReport()),
      idFactory: () => "comparison-1",
      timestamp: "2026-08-05T00:00:00.000Z",
    });
    expect(result).toMatchObject({
      id: "comparison-1",
      createdAt: "2026-08-05T00:00:00.000Z",
      outgoingPlayerId: "p6",
      incomingPlayerId: "in-mid",
      version: FANTASY_TRANSFER_IQ_VERSION,
      status: "compared",
    });
  });

  test("discarding transfer can leave squad unchanged by ignoring proposed squad", () => {
    const squad = makeSquad();
    const result = createFantasyTransferIqComparison({ currentSquad: squad, outgoingPlayerId: "p6", incomingPlayer: incomingMid, normaliseSquad, validateSquad, scoreReport: jest.fn(() => makeReport()) });
    expect(squad.players.some((player) => player.id === "in-mid")).toBe(false);
    expect(result.proposedSquad.players.some((player) => player.id === "in-mid")).toBe(true);
  });

  test("applying transfer persists the proposed squad when caller saves it", () => {
    const saved = [];
    const result = createFantasyTransferIqComparison({ currentSquad: makeSquad(), outgoingPlayerId: "p6", incomingPlayer: incomingMid, normaliseSquad, validateSquad, scoreReport: jest.fn(() => makeReport()) });
    saved.push({ ...result.proposedSquad, confirmed: true });
    expect(saved[0].confirmed).toBe(true);
    expect(saved[0].players.some((player) => player.id === "in-mid")).toBe(true);
  });

  test("applying transfer allows Fantasy IQ to regenerate through the caller scorer", () => {
    const scoreReport = jest.fn(() => makeReport());
    createFantasyTransferIqComparison({ currentSquad: makeSquad(), outgoingPlayerId: "p6", incomingPlayer: incomingMid, normaliseSquad, validateSquad, scoreReport });
    expect(scoreReport).toHaveBeenCalledTimes(2);
  });
});

describe("Transfer IQ recommendations", () => {
  test("generates legal budget-aware multi-transfer suggestions", () => {
    const scoreReport = jest.fn(({ squad }) => {
      const hasBestMid = squad.players.some((player) => player.id === "in-mid-a");
      const hasBestDef = squad.players.some((player) => player.id === "in-def-a");
      return makeReport({ overallScore: 70 + (hasBestMid ? 8 : 0) + (hasBestDef ? 5 : 0) });
    });
    const result = createFantasyTransferIqRecommendations({
      currentSquad: makeSquad(),
      availablePlayers: recommendationPool,
      transferCount: "2",
      normaliseSquad,
      validateSquad,
      scoreReport,
      scoreContext: {
        clubOutlooks: {
          CHE: { overallScore: 86, attackScore: 88, defenceScore: 84 },
          TOT: { overallScore: 78, attackScore: 77, defenceScore: 79 },
        },
      },
    });
    expect(result.status).toBe("ready");
    expect(result.recommendations[0].actualCount).toBe(2);
    expect(result.recommendations[0].validation.isValid).toBe(true);
    expect(result.recommendations[0].proposedSquad.players).toHaveLength(15);
    expect(result.recommendations[0].impact.overallDelta).toBeGreaterThan(0);
  });

  test("does not suggest transferring out captaincy players automatically", () => {
    const result = createFantasyTransferIqRecommendations({
      currentSquad: makeSquad(),
      availablePlayers: recommendationPool,
      transferCount: "1",
      normaliseSquad,
      validateSquad,
      scoreReport: jest.fn(() => makeReport()),
    });
    const outgoingIds = result.recommendations.flatMap((recommendation) =>
      recommendation.transfers.map((transfer) => transfer.outgoingPlayerId)
    );
    expect(outgoingIds).not.toContain("p5");
    expect(outgoingIds).not.toContain("p2");
  });
});
