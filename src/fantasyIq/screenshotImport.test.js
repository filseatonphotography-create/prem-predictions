import {
  addFantasyScreenshotReviewPlayer,
  buildFantasyScreenshotReview,
  calculateFantasyScreenshotImportConfidence,
  convertFantasyScreenshotReviewToSquad,
  correctFantasyTeamCodeFromOcr,
  decodeFantasyScreenshotImage,
  getFantasyScreenshotCombinedConfidence,
  mergeDuplicateFantasyScreenshotCandidates,
  normaliseOcrBlocks,
  parseFantasyScreenshotCandidates,
  removeFantasyScreenshotReviewSlot,
  updateFantasyScreenshotReviewSlot,
  validateFantasyScreenshotDimensions,
  validateFantasyScreenshotFile,
} from "./screenshotImport";

const players = [
  {
    id: "fpl:101",
    sourceId: 101,
    firstName: "Bukayo",
    lastName: "Saka",
    displayName: "Bukayo Saka",
    name: "Bukayo Saka",
    webName: "Saka",
    normalisedName: "bukayo saka",
    teamCode: "ARS",
    teamName: "Arsenal",
    position: "MID",
    positionId: 3,
    dataSource: "official-fpl-bootstrap",
  },
  {
    id: "fpl:102",
    sourceId: 102,
    firstName: "Gabriel",
    lastName: "Magalhaes",
    displayName: "Gabriel Magalhaes",
    name: "Gabriel Magalhaes",
    webName: "Gabriel",
    normalisedName: "gabriel magalhaes",
    teamCode: "ARS",
    teamName: "Arsenal",
    position: "DEF",
    positionId: 2,
    dataSource: "official-fpl-bootstrap",
  },
  {
    id: "fpl:201",
    sourceId: 201,
    firstName: "Mohamed",
    lastName: "Salah",
    displayName: "Mohamed Salah",
    name: "Mohamed Salah",
    webName: "Salah",
    normalisedName: "mohamed salah",
    teamCode: "LIV",
    teamName: "Liverpool",
    position: "MID",
    positionId: 3,
    dataSource: "official-fpl-bootstrap",
  },
  {
    id: "fpl:202",
    sourceId: 202,
    firstName: "John",
    lastName: "Saka",
    displayName: "John Saka",
    name: "John Saka",
    webName: "Saka",
    normalisedName: "john saka",
    teamCode: "LIV",
    teamName: "Liverpool",
    position: "MID",
    positionId: 3,
    dataSource: "official-fpl-bootstrap",
  },
];

function makeFile({ name = "squad.png", type = "image/png", size = 1200 } = {}) {
  return { name, type, size };
}

describe("Fantasy screenshot file and image validation", () => {
  test("accepts supported image files", () => {
    expect(validateFantasyScreenshotFile(makeFile()).valid).toBe(true);
    expect(validateFantasyScreenshotFile(makeFile({ name: "team.webp", type: "image/webp" })).valid).toBe(true);
  });

  test("rejects unsupported file types", () => {
    const result = validateFantasyScreenshotFile(makeFile({ name: "team.gif", type: "image/gif" }));
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/PNG, JPEG or WebP/);
  });

  test("rejects oversized files", () => {
    const result = validateFantasyScreenshotFile(makeFile({ size: 11 * 1024 * 1024 }));
    expect(result.valid).toBe(false);
    expect(result.errors.join(" ")).toMatch(/10 MB/);
  });

  test("rejects zero-size files", () => {
    expect(validateFantasyScreenshotFile(makeFile({ size: 0 })).valid).toBe(false);
  });

  test("validates image dimensions", () => {
    expect(validateFantasyScreenshotDimensions({ width: 1200, height: 1800 }).valid).toBe(true);
    expect(validateFantasyScreenshotDimensions({ width: 100, height: 100 }).valid).toBe(false);
    expect(validateFantasyScreenshotDimensions({ width: 9000, height: 10000 }).valid).toBe(false);
  });

  test("object URLs are revoked through the decode cleanup contract", async () => {
    const originalImage = global.Image;
    const originalCreateObjectURL = URL.createObjectURL;
    const originalRevokeObjectURL = URL.revokeObjectURL;
    URL.createObjectURL = jest.fn(() => "blob:test");
    URL.revokeObjectURL = jest.fn();
    global.Image = class {
      constructor() {
        this.naturalWidth = 1200;
        this.naturalHeight = 1800;
      }

      set src(value) {
        this._src = value;
        setTimeout(() => this.onload(), 0);
      }
    };
    const decoded = await decodeFantasyScreenshotImage(makeFile());
    decoded.revoke();
    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith("blob:test");
    global.Image = originalImage;
    URL.createObjectURL = originalCreateObjectURL;
    URL.revokeObjectURL = originalRevokeObjectURL;
  });
});

describe("Fantasy screenshot OCR parsing", () => {
  test("normalises malformed OCR result safely", () => {
    expect(normaliseOcrBlocks({})).toEqual([]);
    expect(normaliseOcrBlocks({ data: { text: "Bukayo Saka ARS MID" } })).toHaveLength(1);
  });

  test("detects team-code OCR corrections", () => {
    expect(correctFantasyTeamCodeFromOcr("AR5").normalisedCode).toBe("ARS");
    expect(correctFantasyTeamCodeFromOcr("MC1").normalisedCode).toBe("MCI");
  });

  test("returns ambiguous or unmatched team-code corrections safely", () => {
    const result = correctFantasyTeamCodeFromOcr("ZZZ");
    expect(["ambiguous", "unmatched"]).toContain(result.status);
    expect(result.normalisedCode).toBeNull();
  });

  test("parses player candidates from mocked OCR blocks", () => {
    const blocks = [
      { text: "Bukayo Saka ARS MID C", confidence: 0.91, boundingBox: { x: 10, y: 100, width: 120, height: 30 } },
      { text: "Mohamed Salah LIV MID VC", confidence: 0.88, boundingBox: { x: 20, y: 200, width: 130, height: 30 } },
    ];
    const candidates = parseFantasyScreenshotCandidates(blocks, { imageHeight: 1200 });
    expect(candidates).toHaveLength(2);
    expect(candidates[0]).toMatchObject({ rawName: "Bukayo Saka", rawTeamCode: "ARS", rawPosition: "MID", rawSquadRole: "starter", rawCaptainMarker: "C" });
    expect(candidates[1].rawViceCaptainMarker).toBe("VC");
  });

  test("infers bench role from lower image region", () => {
    const candidates = parseFantasyScreenshotCandidates([
      { text: "Gabriel ARS DEF", confidence: 0.8, boundingBox: { x: 0, y: 900, width: 120, height: 30 } },
    ], { imageHeight: 1000 });
    expect(candidates[0].rawSquadRole).toBe("bench");
  });

  test("unknown role remains editable", () => {
    const candidates = parseFantasyScreenshotCandidates([
      { text: "Gabriel ARS DEF", confidence: 0.8, boundingBox: { x: 0, y: 0, width: 0, height: 0 } },
    ]);
    expect(candidates[0].rawSquadRole).toBe("unknown");
  });

  test("merges duplicate OCR candidates and retains an issue", () => {
    const duplicate = {
      rawName: "Bukayo Saka",
      rawTeamCode: "ARS",
      rawPosition: "MID",
      sourceRegion: { boundingBox: { x: 0, y: 0, width: 100, height: 20 } },
      extractionConfidence: 0.8,
    };
    const result = mergeDuplicateFantasyScreenshotCandidates([
      duplicate,
      { ...duplicate, extractionConfidence: 0.7 },
    ]);
    expect(result.candidates).toHaveLength(1);
    expect(result.duplicateIssues).toHaveLength(1);
  });
});

describe("Fantasy screenshot review and import conversion", () => {
  const extracted = [
    {
      rawName: "Bukayo Saka",
      rawTeamCode: "ARS",
      rawPosition: "MID",
      rawSquadRole: "starter",
      rawCaptainMarker: "C",
      rawViceCaptainMarker: "",
      extractionConfidence: 0.9,
    },
    {
      rawName: "Saka",
      rawTeamCode: "",
      rawPosition: "MID",
      rawSquadRole: "starter",
      rawCaptainMarker: "",
      rawViceCaptainMarker: "",
      extractionConfidence: 0.7,
    },
    {
      rawName: "Unknown Player",
      rawTeamCode: "ARS",
      rawPosition: "MID",
      rawSquadRole: "bench",
      rawCaptainMarker: "",
      rawViceCaptainMarker: "",
      extractionConfidence: 0.4,
    },
  ];

  test("exact player matching appears on mandatory review", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [extracted[0]], players });
    expect(review.status).toBe("needs-review");
    expect(review.extractedSlots[0]).toMatchObject({ status: "matched", selectedPlayerId: "fpl:101" });
  });

  test("ambiguous matching is retained for review", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [extracted[1]], players });
    expect(review.extractedSlots[0].status).toBe("ambiguous");
    expect(review.extractedSlots[0].selectedPlayerId).toBeNull();
  });

  test("unmatched players remain unresolved", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [extracted[2]], players });
    expect(review.extractedSlots[0].status).toBe("unmatched");
    expect(review.unresolvedCount).toBe(1);
  });

  test("combined confidence calculation is weighted", () => {
    expect(getFantasyScreenshotCombinedConfidence(0.5, 1)).toBe(80);
  });

  test("import confidence includes low-quality recovery reasons", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: extracted, players });
    expect(review.confidence.score).toBeGreaterThanOrEqual(0);
    expect(review.confidence.reasons.join(" ")).toMatch(/need review|Captain/);
  });

  test("review slot can be corrected to a canonical player", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [extracted[2]], players });
    const updated = updateFantasyScreenshotReviewSlot(review, review.extractedSlots[0].id, { selectedPlayerId: "fpl:201" }, players);
    expect(updated.extractedSlots[0]).toMatchObject({ selectedPlayerId: "fpl:201", status: "matched", confirmedByUser: true });
  });

  test("missing player can be added manually", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [], players });
    const updated = addFantasyScreenshotReviewPlayer(review, players[0], "starter");
    expect(updated.extractedSlots).toHaveLength(1);
    expect(updated.extractedSlots[0].selectedPlayerId).toBe("fpl:101");
  });

  test("false detection can be removed", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [extracted[0], extracted[2]], players });
    const updated = removeFantasyScreenshotReviewSlot(review, review.extractedSlots[1].id);
    expect(updated.extractedSlots).toHaveLength(1);
  });

  test("review converts to canonical screenshot squad without image bytes", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [extracted[0]], players });
    const squad = convertFantasyScreenshotReviewToSquad(review);
    expect(squad.source).toBe("screenshot");
    expect(squad.players[0]).toMatchObject({ id: "fpl:101", teamCode: "ARS", position: "MID", importSource: "screenshot" });
    expect(JSON.stringify(squad)).not.toMatch(/data:image|base64|OCR/);
  });

  test("invalid import cannot be considered complete", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [extracted[2]], players });
    const squad = convertFantasyScreenshotReviewToSquad(review);
    expect(squad.players).toHaveLength(0);
  });

  test("valid corrected review can produce fifteen players", () => {
    const fifteenPlayers = Array.from({ length: 15 }, (_, index) => ({
      ...players[index % players.length],
      id: `fpl:${1000 + index}`,
      sourceId: 1000 + index,
      displayName: `Player ${index}`,
      name: `Player ${index}`,
      normalisedName: `player ${index}`,
      teamCode: ["ARS", "LIV", "MCI", "NEW", "CHE"][index % 5],
      teamName: `Team ${index % 5}`,
      position: index < 2 ? "GK" : index < 7 ? "DEF" : index < 12 ? "MID" : "FWD",
      positionId: index < 2 ? 1 : index < 7 ? 2 : index < 12 ? 3 : 4,
    }));
    const review = fifteenPlayers.reduce(
      (current, player, index) => addFantasyScreenshotReviewPlayer(current, player, index < 11 ? "starter" : "bench"),
      buildFantasyScreenshotReview({ extractedSlots: [], players: fifteenPlayers })
    );
    review.extractedSlots[0].isCaptain = true;
    review.extractedSlots[1].isViceCaptain = true;
    const squad = convertFantasyScreenshotReviewToSquad(review);
    expect(squad.players).toHaveLength(15);
    expect(squad.captainPlayerId).toBe(squad.players[0].id);
    expect(squad.viceCaptainPlayerId).toBe(squad.players[1].id);
  });

  test("confidence helper handles empty import without NaN", () => {
    const confidence = calculateFantasyScreenshotImportConfidence([]);
    expect(confidence.score).toBe(0);
    expect(Number.isFinite(confidence.score)).toBe(true);
  });
});
