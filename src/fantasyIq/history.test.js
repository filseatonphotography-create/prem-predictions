import {
  FANTASY_IQ_HISTORY_CATEGORY_KEYS,
  FANTASY_IQ_HISTORY_SCHEMA_VERSION,
  FANTASY_IQ_HISTORY_STORAGE_PREFIX,
  buildFantasyIqTrendData,
  buildFantasyIqTrendSummary,
  clearFantasyIqHistory,
  compareFantasyIqSnapshots,
  createFantasyIqSnapshot,
  deleteFantasyIqSnapshot,
  exportFantasyIqHistory,
  findFantasyIqDuplicateSnapshot,
  formatFantasyIqSnapshotGameweek,
  getFantasyIqHistoryStorageKey,
  getFantasyIqHistoryVerdict,
  getLatestFantasyIqSnapshot,
  getPreviousFantasyIqSnapshot,
  loadFantasyIqHistory,
  normaliseFantasyIqHistory,
  orderFantasyIqSnapshots,
  resolveFantasyIqSnapshotGameweek,
  saveFantasyIqHistory,
  upsertFantasyIqSnapshot,
  validateFantasyIqSnapshot,
} from "./history";

function makeStorage(initial = {}) {
  const state = { ...initial };
  return {
    getItem: jest.fn((key) => state[key] || null),
    setItem: jest.fn((key, value) => {
      state[key] = value;
    }),
    removeItem: jest.fn((key) => {
      delete state[key];
    }),
    state,
  };
}

function makeSquad(options = {}) {
  const starters = new Set(options.starters || ["p1", "p2", "p3"]);
  return {
    formation: options.formation || "3-4-3",
    source: options.source || "manual",
    captainPlayerId: options.captainPlayerId || "p1",
    viceCaptainPlayerId: options.viceCaptainPlayerId || "p2",
    screenshotObjectUrl: "blob:screenshot-secret",
    players: ["p1", "p2", "p3", "p4"].map((id, index) => ({
      id,
      canonicalPlayerId: id,
      name: options.names?.[id] || `Player ${index + 1}`,
      displayName: options.names?.[id] || `Player ${index + 1}`,
      teamCode: options.teams?.[id] || (index % 2 ? "LIV" : "ARS"),
      position: index === 0 ? "GK" : index === 1 ? "DEF" : index === 2 ? "MID" : "FWD",
      squadRole: starters.has(id) ? "starter" : "bench",
      isCaptain: id === (options.captainPlayerId || "p1"),
      isViceCaptain: id === (options.viceCaptainPlayerId || "p2"),
      ocrText: "raw OCR text",
      authToken: "secret",
    })),
  };
}

function makeReport(options = {}) {
  const baseScore = options.score ?? 70;
  return {
    overallScore: baseScore,
    confidence: options.confidence || "medium",
    confidenceScore: options.confidenceScore,
    transferPriority: options.transferPriority || "Medium priority",
    categories: {
      fixtureOutlook: baseScore,
      attackOutlook: baseScore + 1,
      defenceOutlook: baseScore - 1,
      captaincyOutlook: baseScore + 2,
      squadBalance: baseScore - 2,
      predictionAlignment: options.predictionAlignment === undefined ? baseScore : options.predictionAlignment,
      benchStrength: baseScore - 3,
      ...(options.categories || {}),
    },
    strengths: options.strengths || ["Strong captain"],
    concerns: options.concerns || ["Weak bench"],
    predictionConflicts: [{ playerId: "p1", label: "Player 1", detail: "Conflict" }],
    diagnostics: { secret: "debug" },
  };
}

function makeSnapshot(options = {}) {
  return createFantasyIqSnapshot({
    squad: makeSquad(options.squad || {}),
    report: makeReport(options.report || {}),
    gameweekContext: {
      gameweek: options.gameweek ?? 1,
      label: options.gameweek == null ? "Unassigned" : `GW ${options.gameweek ?? 1}`,
      season: options.season || "2026/27",
      source: options.source || "fixture-gameweek",
    },
    metadata: {
      fantasyIqModelVersion: options.modelVersion || "fantasy-iq-v1",
      lineupIqModelVersion: "lineup-iq-v1",
      transferIqModelVersion: "transfer-iq-v1",
      fixtureModelVersion: "fixture-model-v1",
      scoreConfigVersion: "score-v1",
      playerDataSource: "test",
      playerDataUpdatedAt: "2026-08-05T00:00:00.000Z",
      password: "secret",
    },
    timestamp: options.timestamp || `2026-08-${String(options.gameweek ?? 1).padStart(2, "0")}T00:00:00.000Z`,
    idFactory: () => options.id || `snapshot-${options.gameweek ?? "unassigned"}`,
  });
}

describe("Fantasy IQ history storage and snapshots", () => {
  test("empty history loads safely", () => {
    expect(loadFantasyIqHistory("u1", makeStorage()).snapshots).toEqual([]);
  });

  test("malformed history JSON loads safely", () => {
    const storage = makeStorage({ [getFantasyIqHistoryStorageKey("u1")]: "not-json" });
    expect(loadFantasyIqHistory("u1", storage).diagnostics.rejectedSnapshotCount).toBe(1);
  });

  test("valid snapshot passes validation", () => {
    expect(validateFantasyIqSnapshot(makeSnapshot())).toBe(true);
  });

  test("invalid snapshot is rejected", () => {
    expect(validateFantasyIqSnapshot({ ...makeSnapshot(), id: "" })).toBe(false);
  });

  test("one malformed snapshot does not remove valid snapshots", () => {
    const history = normaliseFantasyIqHistory({ snapshots: [makeSnapshot({ gameweek: 1 }), { id: "" }] });
    expect(history.snapshots).toHaveLength(1);
    expect(history.diagnostics.rejectedSnapshotCount).toBe(1);
  });

  test("per-user storage keys do not collide", () => {
    expect(getFantasyIqHistoryStorageKey("alice")).toBe(`${FANTASY_IQ_HISTORY_STORAGE_PREFIX}:alice`);
    expect(getFantasyIqHistoryStorageKey("alice")).not.toBe(getFantasyIqHistoryStorageKey("bob"));
  });

  test("snapshot saves current report values", () => {
    const snapshot = makeSnapshot({ report: { score: 84 } });
    expect(snapshot.report.overallScore).toBe(84);
  });

  test.each([
    ["screenshot data", /screenshot|blob:/i],
    ["OCR text", /raw OCR text/i],
    ["authentication data", /secret|token|password/i],
    ["development diagnostics", /diagnostics/i],
  ])("%s is not saved", (_label, pattern) => {
    expect(JSON.stringify(makeSnapshot())).not.toMatch(pattern);
  });

  test("one snapshot per gameweek is enforced", () => {
    const history = normaliseFantasyIqHistory({ snapshots: [makeSnapshot({ gameweek: 1, id: "a" }), makeSnapshot({ gameweek: 1, id: "b", timestamp: "2026-08-07T00:00:00.000Z" })] });
    expect(history.snapshots).toHaveLength(1);
    expect(history.diagnostics.duplicateSnapshotCount).toBe(1);
  });

  test("existing gameweek snapshot can be updated while preserving createdAt", () => {
    const first = makeSnapshot({ gameweek: 2, id: "a", timestamp: "2026-08-02T00:00:00.000Z" });
    const next = makeSnapshot({ gameweek: 2, id: "b", timestamp: "2026-08-09T00:00:00.000Z", report: { score: 88 } });
    const result = upsertFantasyIqSnapshot({ snapshots: [first] }, next, { mode: "update" });
    expect(result.status).toBe("updated");
    expect(result.snapshot.id).toBe("a");
    expect(result.snapshot.createdAt).toBe(first.createdAt);
    expect(result.snapshot.report.overallScore).toBe(88);
  });

  test("duplicate insert returns duplicate status", () => {
    const first = makeSnapshot({ gameweek: 2, id: "a" });
    const result = upsertFantasyIqSnapshot({ snapshots: [first] }, makeSnapshot({ gameweek: 2, id: "b" }));
    expect(result.status).toBe("duplicate");
    expect(result.duplicate.id).toBe("a");
  });

  test("keep existing leaves history unchanged", () => {
    const first = makeSnapshot({ gameweek: 2, id: "a" });
    const result = upsertFantasyIqSnapshot({ snapshots: [first] }, makeSnapshot({ gameweek: 2, id: "b" }), { mode: "keep-existing" });
    expect(result.status).toBe("kept-existing");
    expect(result.history.snapshots[0].id).toBe("a");
  });

  test("unassigned snapshots are deduped", () => {
    const history = normaliseFantasyIqHistory({ snapshots: [makeSnapshot({ gameweek: null, id: "a" }), makeSnapshot({ gameweek: null, id: "b", timestamp: "2026-08-09T00:00:00.000Z" })] });
    expect(history.snapshots).toHaveLength(1);
  });

  test("delete removes only the targeted snapshot", () => {
    const history = deleteFantasyIqSnapshot({ snapshots: [makeSnapshot({ gameweek: 1 }), makeSnapshot({ gameweek: 2 })] }, "snapshot-1");
    expect(history.snapshots.map((snapshot) => snapshot.id)).toEqual(["snapshot-2"]);
  });

  test("clear removes all snapshots", () => {
    expect(clearFantasyIqHistory({ snapshots: [makeSnapshot()] }).snapshots).toEqual([]);
  });

  test("save writes schema version and snapshots", () => {
    const storage = makeStorage();
    const saved = saveFantasyIqHistory("u1", { snapshots: [makeSnapshot()] }, storage);
    expect(saved.schemaVersion).toBe(FANTASY_IQ_HISTORY_SCHEMA_VERSION);
    expect(JSON.parse(storage.state[getFantasyIqHistoryStorageKey("u1")]).snapshots).toHaveLength(1);
  });

  test("export is privacy safe", () => {
    const exported = exportFantasyIqHistory({ snapshots: [makeSnapshot()] });
    expect(exported).toMatch(/fantasy-iq-history-v1/);
    expect(exported).not.toMatch(/data:image|base64|OCR|secret|token|password/i);
  });
});

describe("Fantasy IQ gameweek resolution", () => {
  test("uses explicitly current FPL event first", () => {
    expect(resolveFantasyIqSnapshotGameweek({ events: [{ id: 6, is_current: true, deadline_time: "2026-09-01T11:00:00Z" }], selectedGameweek: 2 }).gameweek).toBe(6);
  });

  test("uses upcoming event when no current event exists", () => {
    expect(resolveFantasyIqSnapshotGameweek({ events: [{ id: 7, is_next: true, deadline_time: "2026-09-08T11:00:00Z" }], currentDate: "2026-09-01T00:00:00Z" }).source).toBe("event-next");
  });

  test("falls back to selected gameweek", () => {
    expect(resolveFantasyIqSnapshotGameweek({ selectedGameweek: 4, fixtures: [{ gameweek: 9 }] }).gameweek).toBe(4);
  });

  test("falls back to fixture gameweek", () => {
    expect(resolveFantasyIqSnapshotGameweek({ fixtures: [{ gameweek: 9 }] }).gameweek).toBe(9);
  });

  test("allows unassigned snapshot", () => {
    expect(resolveFantasyIqSnapshotGameweek({}).label).toBe("Unassigned");
  });

  test.each([
    [{ gameweek: 6 }, "GW 6"],
    [{ gameweek: 0, gameweekLabel: "Pre-season" }, "Pre-season"],
    [{ gameweek: null }, "Unassigned"],
  ])("formats %j as %s", (snapshot, label) => {
    expect(formatFantasyIqSnapshotGameweek(snapshot)).toBe(label);
  });
});

describe("Fantasy IQ history comparison and trend", () => {
  test.each([
    [10, "Major improvement"],
    [6, "Good improvement"],
    [2, "Small improvement"],
    [0, "No meaningful change"],
    [-2, "Small reduction"],
    [-6, "Notable reduction"],
    [-10, "Major reduction"],
  ])("verdict for %+d is %s", (delta, verdict) => {
    expect(getFantasyIqHistoryVerdict(delta)).toBe(verdict);
  });

  test("mixed verdict is used for opposing major category changes", () => {
    expect(getFantasyIqHistoryVerdict(1, { attackOutlook: { delta: 14 }, defenceOutlook: { delta: -12 } })).toBe("Mixed change");
  });

  test("compares overall and category deltas", () => {
    const comparison = compareFantasyIqSnapshots(makeSnapshot({ gameweek: 1, report: { score: 70 } }), makeSnapshot({ gameweek: 2, report: { score: 76 } }));
    expect(comparison.overallDelta).toBe(6);
    expect(comparison.categoryDeltas.attackOutlook.delta).toBe(6);
  });

  test("missing categories are unavailable instead of artificial deltas", () => {
    const comparison = compareFantasyIqSnapshots(
      makeSnapshot({ gameweek: 1, report: { score: 70, predictionAlignment: null } }),
      makeSnapshot({ gameweek: 2, report: { score: 76 } })
    );
    expect(comparison.categoryDeltas.predictionAlignment.delta).toBeNull();
    expect(comparison.categoryDeltas.predictionAlignment.label).toBe("Newly available");
  });

  test("formation, captain and vice changes are detected", () => {
    const comparison = compareFantasyIqSnapshots(
      makeSnapshot({ gameweek: 1, squad: { formation: "3-4-3", captainPlayerId: "p1", viceCaptainPlayerId: "p2" } }),
      makeSnapshot({ gameweek: 2, squad: { formation: "4-4-2", captainPlayerId: "p3", viceCaptainPlayerId: "p1" } })
    );
    expect(comparison.formationChange.changed).toBe(true);
    expect(comparison.captainChange.changed).toBe(true);
    expect(comparison.viceCaptainChange.changed).toBe(true);
  });

  test("starter and bench moves are detected", () => {
    const comparison = compareFantasyIqSnapshots(
      makeSnapshot({ gameweek: 1, squad: { starters: ["p1", "p2", "p3"] } }),
      makeSnapshot({ gameweek: 2, squad: { starters: ["p1", "p2", "p4"] } })
    );
    expect(comparison.startersAdded.map((player) => player.id)).toContain("p4");
    expect(comparison.benchAdded.map((player) => player.id)).toContain("p3");
  });

  test("squad additions and removals are detected", () => {
    const previous = makeSnapshot({ gameweek: 1 });
    const current = makeSnapshot({ gameweek: 2 });
    current.squad.players = current.squad.players.filter((player) => player.id !== "p4");
    current.squad.players.push({ id: "p5", name: "Player 5", teamCode: "MCI", position: "MID", squadRole: "bench" });
    const comparison = compareFantasyIqSnapshots(previous, current);
    expect(comparison.squadAdded.map((player) => player.id)).toContain("p5");
    expect(comparison.squadRemoved.map((player) => player.id)).toContain("p4");
  });

  test("club exposure changes are shown without judgement", () => {
    const comparison = compareFantasyIqSnapshots(
      makeSnapshot({ gameweek: 1, squad: { teams: { p4: "ARS" } } }),
      makeSnapshot({ gameweek: 2, squad: { teams: { p4: "MCI" } } })
    );
    expect(comparison.clubExposureChanges.some((row) => row.teamCode === "MCI")).toBe(true);
  });

  test("strengths and concerns changes are deterministic", () => {
    const comparison = compareFantasyIqSnapshots(
      makeSnapshot({ gameweek: 1, report: { strengths: ["A"], concerns: ["B", "C"] } }),
      makeSnapshot({ gameweek: 2, report: { strengths: ["A", "D"], concerns: ["C", "E"] } })
    );
    expect(comparison.strengthsAdded).toEqual(["D"]);
    expect(comparison.concernsAdded).toEqual(["E"]);
    expect(comparison.concernsResolved).toEqual(["B"]);
  });

  test("model version changes are flagged", () => {
    const comparison = compareFantasyIqSnapshots(makeSnapshot({ modelVersion: "v1" }), makeSnapshot({ gameweek: 2, modelVersion: "v2" }));
    expect(comparison.modelVersionChanged).toBe(true);
  });

  test("trend data sorts by season, gameweek and createdAt", () => {
    const trend = buildFantasyIqTrendData([
      makeSnapshot({ gameweek: 3, id: "gw3" }),
      makeSnapshot({ gameweek: 1, id: "gw1" }),
      makeSnapshot({ gameweek: 2, id: "gw2" }),
    ]);
    expect(trend.map((row) => row.gameweek)).toEqual([1, 2, 3]);
  });

  test("trend summary handles zero, one and many snapshots", () => {
    expect(buildFantasyIqTrendSummary([]).snapshotCount).toBe(0);
    expect(buildFantasyIqTrendSummary([makeSnapshot({ report: { score: 80 } })]).currentScore).toBe(80);
    expect(buildFantasyIqTrendSummary([makeSnapshot({ gameweek: 1, report: { score: 70 } }), makeSnapshot({ gameweek: 2, report: { score: 80 } })])).toMatchObject({ highestScore: 80, lowestScore: 70, averageScore: 75, changeFromFirst: 10 });
  });

  test("latest and previous snapshots use ordered history", () => {
    const snapshots = [makeSnapshot({ gameweek: 1 }), makeSnapshot({ gameweek: 3 }), makeSnapshot({ gameweek: 2 })];
    const latest = getLatestFantasyIqSnapshot(snapshots);
    expect(latest.gameweek).toBe(3);
    expect(getPreviousFantasyIqSnapshot(snapshots, latest).gameweek).toBe(2);
  });

  test("duplicate lookup uses season and gameweek", () => {
    const existing = makeSnapshot({ gameweek: 5, season: "2026/27" });
    expect(findFantasyIqDuplicateSnapshot({ snapshots: [existing] }, makeSnapshot({ gameweek: 5, season: "2026/27", id: "next" })).id).toBe(existing.id);
  });

  test("retention caps snapshots per season and total", () => {
    const snapshots = Array.from({ length: 120 }, (_, index) => makeSnapshot({ gameweek: index + 1, id: `s${index + 1}` }));
    const history = normaliseFantasyIqHistory({ snapshots });
    expect(history.snapshots.length).toBeLessThanOrEqual(100);
  });

  test.each(FANTASY_IQ_HISTORY_CATEGORY_KEYS)("trend includes %s", (key) => {
    expect(buildFantasyIqTrendData([makeSnapshot()])[0]).toHaveProperty(key);
  });

  test.each([
    ["overallScore", { score: 101 }, 100],
    ["fixtureOutlook", { categories: { fixtureOutlook: -1 } }, 0],
    ["attackOutlook", { categories: { attackOutlook: 44.6 } }, 45],
  ])("%s is normalised", (field, report, expected) => {
    const snapshot = makeSnapshot({ report });
    const value = field === "overallScore" ? snapshot.report.overallScore : snapshot.report.categories[field];
    expect(value).toBe(expected);
  });
});
