import {
  addFantasyScreenshotReviewPlayer,
  buildFantasyScreenshotReviewDisplaySlots,
  buildFantasyScreenshotReview,
  calculateFantasyScreenshotImportConfidence,
  createFantasyScreenshotFeedbackSummary,
  createFantasyScreenshotImportSummary,
  convertFantasyScreenshotReviewToSquad,
  correctFantasyTeamCodeFromOcr,
  decodeFantasyScreenshotImage,
  detectFantasyScreenshotNameLayoutSlots,
  getFantasyScreenshotFormationLayoutSlots,
  getFantasyScreenshotFormationReviewLayout,
  getFantasyScreenshotCombinedConfidence,
  getFantasyScreenshotTesseractOptions,
  hasExternalTesseractAssetPaths,
  inferFantasyScreenshotFormationFromLayoutSlots,
  mergeDuplicateFantasyScreenshotCandidates,
  normaliseOcrBlocks,
  parseFantasyScreenshotCandidates,
  removeFantasyScreenshotReviewSlot,
  runFantasyScreenshotOcr,
  runFantasyScreenshotSlotOcr,
  runFantasyScreenshotOcrWithFallback,
  selectBestFantasyScreenshotOcrAttempt,
  scoreFantasyScreenshotOcrQuality,
  updateFantasyScreenshotReviewSlot,
  validateFantasyScreenshotDimensions,
  validateFantasyScreenshotFile,
} from "./screenshotImport";

const mockTerminate = jest.fn();
const mockRecognize = jest.fn();
const mockSetParameters = jest.fn();
const mockCreateWorker = jest.fn();

jest.mock("tesseract.js", () => ({
  createWorker: (...args) => mockCreateWorker(...args),
}));

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

beforeEach(() => {
  mockTerminate.mockReset().mockResolvedValue(undefined);
  mockSetParameters.mockReset().mockResolvedValue(undefined);
  mockRecognize.mockReset().mockResolvedValue({
    data: {
      text: "Bukayo Saka ARS MID",
      confidence: 88,
      words: [
        { text: "Bukayo", confidence: 90, bbox: { x0: 0, y0: 0, x1: 40, y1: 20 } },
        { text: "Saka", confidence: 90, bbox: { x0: 45, y0: 0, x1: 80, y1: 20 } },
        { text: "ARS", confidence: 90, bbox: { x0: 85, y0: 0, x1: 115, y1: 20 } },
        { text: "MID", confidence: 90, bbox: { x0: 120, y0: 0, x1: 150, y1: 20 } },
      ],
    },
  });
  mockCreateWorker.mockReset().mockResolvedValue({
    setParameters: mockSetParameters,
    recognize: mockRecognize,
    terminate: mockTerminate,
  });
});

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

  test("groups nearby OCR words into player-name candidates", () => {
    const blocks = normaliseOcrBlocks({
      data: {
        words: [
          { text: "Van", confidence: 91, bbox: { x0: 10, y0: 100, x1: 38, y1: 118 } },
          { text: "Dijk", confidence: 92, bbox: { x0: 44, y0: 100, x1: 78, y1: 118 } },
          { text: "Salah", confidence: 93, bbox: { x0: 180, y0: 100, x1: 230, y1: 118 } },
          { text: "Joao", confidence: 90, bbox: { x0: 12, y0: 180, x1: 50, y1: 198 } },
          { text: "Felix", confidence: 90, bbox: { x0: 57, y0: 180, x1: 95, y1: 198 } },
        ],
      },
    });

    expect(blocks.map((block) => block.text)).toEqual(["Van Dijk", "Salah", "Joao Felix"]);
    expect(parseFantasyScreenshotCandidates(blocks, { imageHeight: 1000 }).map((candidate) => candidate.rawName)).toEqual(["Van Dijk", "Salah", "Joao Felix"]);
  });

  test("prefers grouped words over coarse OCR rows when they reveal more players", () => {
    const blocks = normaliseOcrBlocks({
      data: {
        blocks: [
          {
            paragraphs: [
              {
                lines: [
                  { text: "Raya Gabriel Van Dijk Trippier", confidence: 80, bbox: { x0: 0, y0: 100, x1: 300, y1: 120 } },
                ],
              },
            ],
          },
        ],
        words: [
          { text: "Raya", confidence: 90, bbox: { x0: 10, y0: 100, x1: 48, y1: 118 } },
          { text: "Gabriel", confidence: 91, bbox: { x0: 110, y0: 100, x1: 170, y1: 118 } },
          { text: "Van", confidence: 91, bbox: { x0: 230, y0: 100, x1: 258, y1: 118 } },
          { text: "Dijk", confidence: 92, bbox: { x0: 264, y0: 100, x1: 298, y1: 118 } },
          { text: "Trippier", confidence: 91, bbox: { x0: 360, y0: 100, x1: 420, y1: 118 } },
        ],
      },
    });

    expect(blocks.map((block) => block.text)).toEqual(["Raya", "Gabriel", "Van Dijk", "Trippier"]);
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

  test("drops sponsor and venue OCR words instead of treating them as player names", () => {
    const candidates = parseFantasyScreenshotCandidates([
      { text: "EXPRESS", confidence: 0.9, boundingBox: { x: 0, y: 20, width: 120, height: 30 } },
      { text: "AMERICAN EXPRESS", confidence: 0.9, boundingBox: { x: 0, y: 60, width: 180, height: 30 } },
      { text: "EMIRATES", confidence: 0.9, boundingBox: { x: 0, y: 100, width: 120, height: 30 } },
      { text: "Bukayo Saka ARS MID", confidence: 0.91, boundingBox: { x: 0, y: 140, width: 140, height: 30 } },
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].rawName).toBe("Bukayo Saka");
  });

  test("drops noisy sponsor, letter and numbered-position OCR fragments", () => {
    const candidates = parseFantasyScreenshotCandidates([
      { text: "LAA LL LL", confidence: 0.52, boundingBox: { x: 0, y: 20, width: 120, height: 30 } },
      { text: "Snapdragon", confidence: 0.9, boundingBox: { x: 0, y: 60, width: 120, height: 30 } },
      { text: "Snopdragon", confidence: 0.87, boundingBox: { x: 0, y: 100, width: 120, height: 30 } },
      { text: "HYBEER", confidence: 0.84, boundingBox: { x: 0, y: 140, width: 120, height: 30 } },
      { text: "OHNOOSED", confidence: 0.8, boundingBox: { x: 0, y: 160, width: 120, height: 30 } },
      { text: "AYBEITER", confidence: 0.8, boundingBox: { x: 0, y: 170, width: 120, height: 30 } },
      { text: "SEEESEE", confidence: 0.8, boundingBox: { x: 0, y: 175, width: 120, height: 30 } },
      { text: "Substitutes", confidence: 0.9, boundingBox: { x: 0, y: 176, width: 120, height: 30 } },
      { text: "1.MID", confidence: 0.82, boundingBox: { x: 0, y: 180, width: 80, height: 30 } },
      { text: "2.DEF", confidence: 0.82, boundingBox: { x: 0, y: 220, width: 80, height: 30 } },
      { text: "Erling Haaland MCI FWD", confidence: 0.93, boundingBox: { x: 0, y: 260, width: 150, height: 30 } },
    ]);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].rawName).toBe("Erling Haaland");
  });

  test("matches screenshot names without treating fixture codes as player clubs", () => {
    const fixturePlayers = [
      ...players,
      {
        id: "fpl:999",
        sourceId: 999,
        firstName: "Erling",
        lastName: "Haaland",
        displayName: "Erling Haaland",
        name: "Erling Haaland",
        webName: "Haaland",
        normalisedName: "erling haaland",
        teamCode: "MCI",
        teamName: "Manchester City",
        position: "FWD",
        positionId: 4,
        dataSource: "test",
      },
    ];
    const review = buildFantasyScreenshotReview({
      extractedSlots: [{ rawName: "Erling Haaland", rawTeamCode: "ARS", rawPosition: "FWD", extractionConfidence: 0.92 }],
      players: fixturePlayers,
    });
    expect(review.extractedSlots[0]).toMatchObject({ selectedPlayerId: "fpl:999", status: "likely" });
  });

  test("matches truncated hyphenated player names from screenshots", () => {
    const fixturePlayers = [
      {
        id: "fpl:998",
        sourceId: 998,
        firstName: "Dominic",
        lastName: "Calvert-Lewin",
        displayName: "Dominic Calvert-Lewin",
        name: "Dominic Calvert-Lewin",
        webName: "Calvert-Lewin",
        normalisedName: "dominic calvert lewin",
        teamCode: "LEE",
        teamName: "Leeds United",
        position: "FWD",
        positionId: 4,
        dataSource: "test",
      },
    ];
    const review = buildFantasyScreenshotReview({
      extractedSlots: [{ rawName: "Calvert-L", rawTeamCode: "", rawPosition: "", extractionConfidence: 0.78 }],
      players: fixturePlayers,
    });
    expect(review.extractedSlots[0]).toMatchObject({ selectedPlayerId: "fpl:998", status: "likely" });
  });

  test("infers bench role from lower image region", () => {
    const candidates = parseFantasyScreenshotCandidates([
      { text: "Gabriel ARS DEF", confidence: 0.8, boundingBox: { x: 0, y: 900, width: 120, height: 30 } },
    ], { imageHeight: 1000 });
    expect(candidates[0].rawSquadRole).toBe("bench");
  });

  test("keeps slot OCR fixture labels as review candidates without player matches", () => {
    const layoutSlots = getFantasyScreenshotFormationLayoutSlots("5-4-1", 1080, 2340);
    const candidates = parseFantasyScreenshotCandidates([
      { text: "Van de Ven BRE A", confidence: 0.84, strictSlotOcr: true, lineIndex: 1 },
      { text: "Richarlison BRE A", confidence: 0.81, strictSlotOcr: true, lineIndex: 10 },
      { text: "Dovin ARS A", confidence: 0.79, strictSlotOcr: true, lineIndex: 11 },
    ], { imageHeight: 2340, layoutSlots, players: [] });

    expect(candidates.map((candidate) => candidate.rawName)).toEqual(["Van de Ven", "Richarlison", "Dovin"]);
    expect(candidates.map((candidate) => candidate.rawSquadRole)).toEqual(["starter", "starter", "bench"]);
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

  test("name and position matching appears on mandatory review", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [extracted[0]], players });
    expect(review.status).toBe("needs-review");
    expect(review.extractedSlots[0]).toMatchObject({ status: "likely", selectedPlayerId: "fpl:101" });
  });

  test("ambiguous matching is retained for review", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [extracted[1]], players });
    expect(review.extractedSlots[0].status).toBe("ambiguous");
    expect(review.extractedSlots[0].selectedPlayerId).toBeNull();
  });

  test("unique exact name-only matches become likely review selections", () => {
    const review = buildFantasyScreenshotReview({
      extractedSlots: [{ ...extracted[0], rawTeamCode: "", rawPosition: "" }],
      players,
    });
    expect(review.extractedSlots[0]).toMatchObject({ status: "likely", selectedPlayerId: "fpl:101" });
  });

  test("unmatched players remain unresolved", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [extracted[2]], players });
    expect(review.extractedSlots[0].status).toBe("unmatched");
    expect(review.unresolvedCount).toBe(1);
  });

  test("review display keeps missing screenshot slots inline", () => {
    const slots = [
      {
        id: "slot-gk",
        role: "starter",
        selectedPlayerId: "gk",
        selectedPlayer: { id: "gk", position: "GK" },
        extracted: { rawPosition: "GK", rawSquadRole: "starter", sourceRegion: { id: "starter-gk-1" } },
      },
      {
        id: "slot-def-left",
        role: "starter",
        selectedPlayerId: "def-left",
        selectedPlayer: { id: "def-left", position: "DEF" },
        extracted: { rawPosition: "DEF", rawSquadRole: "starter", sourceRegion: { id: "starter-def-1" } },
      },
      {
        id: "slot-def-right",
        role: "starter",
        selectedPlayerId: "def-right",
        selectedPlayer: { id: "def-right", position: "DEF" },
        extracted: { rawPosition: "DEF", rawSquadRole: "starter", sourceRegion: { id: "starter-def-3" } },
      },
    ];

    const display = buildFantasyScreenshotReviewDisplaySlots(slots);

    expect(display.slice(0, 4).map((item) => item.type === "slot" ? item.slot.id : item.id)).toEqual([
      "slot-gk",
      "slot-def-left",
      "missing-review-slot-starter-def-2",
      "slot-def-right",
    ]);
  });

  test("review display keeps detected optional wide slots inline without empty optional placeholders", () => {
    const slots = [
      {
        id: "slot-gk",
        role: "starter",
        selectedPlayerId: "gk",
        selectedPlayer: { id: "gk", position: "GK" },
        extracted: { rawPosition: "GK", rawSquadRole: "starter", sourceRegion: { id: "starter-gk-1" } },
      },
      {
        id: "slot-wide-mid",
        role: "starter",
        selectedPlayerId: "mid-wide",
        selectedPlayer: { id: "mid-wide", position: "MID" },
        extracted: { rawPosition: "MID", rawSquadRole: "starter", sourceRegion: { id: "starter-mid-wide-5" } },
      },
    ];

    const display = buildFantasyScreenshotReviewDisplaySlots(slots);
    const ids = display.map((item) => item.type === "slot" ? item.slot.id : item.id);

    expect(ids).toContain("slot-wide-mid");
    expect(ids.indexOf("slot-wide-mid")).toBeGreaterThan(ids.indexOf("missing-review-slot-starter-mid-4"));
    expect(ids.some((id) => id === "missing-review-slot-starter-mid-wide-5")).toBe(false);
  });

  test("manual review additions are assigned back into layout order", () => {
    const slots = [
      {
        id: "manual-mid",
        role: "starter",
        selectedPlayerId: "mid",
        selectedPlayer: { id: "mid", position: "MID" },
        extracted: { rawPosition: "MID", rawSquadRole: "starter", sourceRegion: null },
      },
    ];

    const display = buildFantasyScreenshotReviewDisplaySlots(slots);
    const manualIndex = display.findIndex((item) => item.type === "slot" && item.slot.id === "manual-mid");

    expect(display[manualIndex].layoutSlot.id).toBe("starter-mid-1");
    expect(manualIndex).toBeGreaterThan(display.findIndex((item) => item.id === "missing-review-slot-starter-def-3"));
    expect(manualIndex).toBeLessThan(display.findIndex((item) => item.id === "missing-review-slot-starter-mid-2"));
  });

  test("cleans noisy OCR review into fifteen ordered squad selections", () => {
    const names = [
      ["Raya", "ARS", "GK"],
      ["Gabriel", "ARS", "DEF"],
      ["Van Dijk", "LIV", "DEF"],
      ["Trippier", "NEW", "DEF"],
      ["Saka", "ARS", "MID"],
      ["Salah", "LIV", "MID"],
      ["Foden", "MCI", "MID"],
      ["Gordon", "NEW", "MID"],
      ["Haaland", "MCI", "FWD"],
      ["Watkins", "AVL", "FWD"],
      ["Joao Felix", "CHE", "FWD"],
      ["Areola", "EVE", "GK"],
      ["Smith-Rowe", "FUL", "MID"],
      ["Senesi", "BOU", "DEF"],
      ["Damsgaard", "BRE", "DEF"],
    ];
    const fixturePlayers = names.map(([name, teamCode, position], index) => ({
      id: `fpl:${index + 1}`,
      sourceId: index + 1,
      firstName: name,
      lastName: "",
      displayName: name,
      name,
      webName: name,
      normalisedName: name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
      teamCode,
      teamName: teamCode,
      position,
      positionId: position === "GK" ? 1 : position === "DEF" ? 2 : position === "MID" ? 3 : 4,
      dataSource: "test",
    }));
    const extractedSlots = [
      { rawName: "Fantasy Mock Squad", rawTeamCode: "IPS", rawPosition: "", rawSquadRole: "starter", extractionConfidence: 0.8, sourceRegion: { boundingBox: { y: 10 } } },
      ...names.map(([name], index) => ({
        rawName: name === "Joao Felix" ? "Jodo Félix" : name,
        rawTeamCode: "",
        rawPosition: "",
        rawSquadRole: index < 13 ? "starter" : "bench",
        extractionConfidence: 0.86,
        sourceRegion: { boundingBox: { y: 100 + index * 40 } },
      })),
      { rawName: "ve", rawTeamCode: "", rawPosition: "", rawSquadRole: "starter", extractionConfidence: 0.7, sourceRegion: { boundingBox: { y: 300 } } },
    ];
    const review = buildFantasyScreenshotReview({ extractedSlots, players: fixturePlayers });
    const squad = convertFantasyScreenshotReviewToSquad(review);
    expect(review.extractedSlots).toHaveLength(15);
    expect(review.extractedSlots.some((slot) => slot.extracted.rawName === "Fantasy Mock Squad")).toBe(false);
    expect(review.extractedSlots.some((slot) => slot.extracted.rawName === "ve")).toBe(false);
    expect(review.extractedSlots.find((slot) => slot.extracted.rawName === "Jodo Félix")).toMatchObject({ selectedPlayerId: "fpl:11", status: "likely" });
    expect(squad.players).toHaveLength(15);
    expect(squad.players.filter((player) => player.squadRole === "starter")).toHaveLength(11);
    expect(squad.players.filter((player) => player.squadRole === "bench")).toHaveLength(4);
  });

  test("cleans crowded starting-XI screenshots without keeping UI fragments", () => {
    const names = [
      ["Raya", "ARS", "GK"],
      ["Gabriel", "ARS", "DEF"],
      ["Van Dijk", "LIV", "DEF"],
      ["Trippier", "NEW", "DEF"],
      ["Saka", "ARS", "MID"],
      ["Salah", "LIV", "MID"],
      ["Foden", "MCI", "MID"],
      ["Gordon", "NEW", "MID"],
      ["Haaland", "MCI", "FWD"],
      ["Watkins", "AVL", "FWD"],
      ["Isak", "NEW", "FWD"],
    ];
    const fixturePlayers = names.map(([name, teamCode, position], index) => ({
      id: `xi:${index + 1}`,
      sourceId: index + 1,
      firstName: name,
      lastName: "",
      displayName: name,
      name,
      webName: name,
      normalisedName: name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
      teamCode,
      teamName: teamCode,
      position,
      positionId: position === "GK" ? 1 : position === "DEF" ? 2 : position === "MID" ? 3 : 4,
      dataSource: "test",
    }));
    const noiseNames = [
      "Fantasy Mock Squad",
      "Prediction Addiction",
      "Gameweek Points",
      "Possible Players",
      "Strong Matches",
      "Need Review",
      "Not Matched",
      "Bench",
      "Captain Vice",
      "Select Team",
      "Save Squad",
      "Fixture Difficulty",
      "Total Score",
      "Confirmed Players",
      "League",
      "Club",
      "gw",
      "11",
      "C",
      "VC",
      "vs",
      "Tap to choose",
      "Import Screenshot",
    ];
    const extractedSlots = [
      ...names.map(([name], index) => ({
        rawName: name,
        rawTeamCode: "",
        rawPosition: "",
        rawSquadRole: index > 8 ? "bench" : "starter",
        extractionConfidence: 0.84,
        sourceRegion: { boundingBox: { y: 120 + index * 44 } },
      })),
      ...noiseNames.map((name, index) => ({
        rawName: name,
        rawTeamCode: "",
        rawPosition: "",
        rawSquadRole: "starter",
        extractionConfidence: index % 3 === 0 ? 0.68 : 0.82,
        sourceRegion: { boundingBox: { y: 20 + index * 18 } },
      })),
    ];

    const review = buildFantasyScreenshotReview({ extractedSlots, players: fixturePlayers });
    const squad = convertFantasyScreenshotReviewToSquad(review);
    expect(review.diagnostics.rawPlayerCandidateCount).toBe(34);
    expect(review.extractedSlots).toHaveLength(11);
    expect(review.extractedSlots.every((slot) => slot.selectedPlayerId)).toBe(true);
    expect(review.extractedSlots.every((slot) => slot.role === "starter")).toBe(true);
    expect(review.extractedSlots.some((slot) => /Fantasy|Prediction|Possible|Review/i.test(slot.extracted.rawName))).toBe(false);
    expect(squad.players).toHaveLength(11);
    expect(squad.players.filter((player) => player.squadRole === "starter")).toHaveLength(11);
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

describe("Fantasy screenshot OCR runtime and privacy safeguards", () => {
  test("local Tesseract asset paths are configured without external CDN URLs", () => {
    const options = getFantasyScreenshotTesseractOptions();
    expect(options.workerPath).toBe("/vendor/tesseract/7.0.0/worker/worker.min.js");
    expect(options.corePath).toBe("/vendor/tesseract/7.0.0/core");
    expect(options.langPath).toBe("/vendor/tesseract/7.0.0/lang/eng/4.0.0_best_int");
    expect(options.workerBlobURL).toBe(false);
    expect(hasExternalTesseractAssetPaths(options)).toBe(false);
  });

  test("external Tesseract paths are detected", () => {
    expect(hasExternalTesseractAssetPaths({ workerPath: "https://cdn.example/worker.js" })).toBe(true);
  });

  test("OCR worker uses local asset options and remains lazily created", async () => {
    expect(mockCreateWorker).not.toHaveBeenCalled();
    await runFantasyScreenshotOcr("data:image/png;base64,test");
    expect(mockCreateWorker).toHaveBeenCalledWith("eng", 1, expect.objectContaining({
      workerPath: "/vendor/tesseract/7.0.0/worker/worker.min.js",
      corePath: "/vendor/tesseract/7.0.0/core",
      langPath: "/vendor/tesseract/7.0.0/lang/eng/4.0.0_best_int",
      workerBlobURL: false,
    }));
  });

  test("worker terminates after successful OCR", async () => {
    await runFantasyScreenshotOcr("fixture.png");
    expect(mockSetParameters).toHaveBeenCalledWith(expect.objectContaining({ tessedit_pageseg_mode: "11" }));
    expect(mockRecognize).toHaveBeenCalledWith("fixture.png", {}, { text: true, blocks: true });
    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });

  test("slot OCR reads each fixed label rectangle with one worker", async () => {
    mockRecognize
      .mockResolvedValueOnce({ data: { text: "Raya", confidence: 92, words: [] } })
      .mockResolvedValueOnce({ data: { text: "Gabriel", confidence: 90, words: [] } });
    const result = await runFantasyScreenshotSlotOcr("fixture.png", [
      { id: "slot-1", boundingBox: { x: 10, y: 20, width: 100, height: 30 } },
      { id: "slot-2", boundingBox: { x: 140, y: 20, width: 110, height: 30 } },
    ]);

    expect(mockSetParameters).toHaveBeenCalledWith(expect.objectContaining({ tessedit_pageseg_mode: "7" }));
    expect(mockRecognize).toHaveBeenNthCalledWith(1, "fixture.png", { rectangle: { left: 10, top: 20, width: 100, height: 30 } }, { text: true, blocks: true });
    expect(mockRecognize).toHaveBeenNthCalledWith(2, "fixture.png", { rectangle: { left: 140, top: 20, width: 110, height: 30 } }, { text: true, blocks: true });
    expect(result.blocks.map((block) => block.text)).toEqual(["Raya", "Gabriel"]);
    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });

  test("slot OCR can retry the same missing slot with multiple page segmentation modes", async () => {
    mockRecognize
      .mockResolvedValueOnce({ data: { text: "", confidence: 15, words: [] } })
      .mockResolvedValueOnce({ data: { text: "Richarlison", confidence: 88, words: [] } });
    const result = await runFantasyScreenshotSlotOcr("fixture.png", [
      { id: "slot-1", boundingBox: { x: 10, y: 20, width: 150, height: 54 } },
    ], { pageSegMode: ["6", "7"] });

    expect(mockSetParameters).toHaveBeenCalledWith(expect.objectContaining({ tessedit_pageseg_mode: "6" }));
    expect(mockSetParameters).toHaveBeenCalledWith(expect.objectContaining({ tessedit_pageseg_mode: "7" }));
    expect(mockRecognize).toHaveBeenCalledTimes(2);
    expect(result.blocks.map((block) => block.text)).toEqual(["Richarlison"]);
    expect(result.blocks[0].slotOcrPageSegMode).toBe("7");
  });

  test("detects shifted white FPL name labels instead of using shirt-area boxes", () => {
    const canvas = { width: 1200, height: 1800 };
    const labelY = 500;
    const labelHeight = 58;
    const context = {
      canvas,
      getImageData: jest.fn((x, y, width, height) => {
        const isLabelRow = y >= labelY && y <= labelY + labelHeight;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let index = 0; index < data.length; index += 4) {
          data[index] = isLabelRow ? 245 : 20;
          data[index + 1] = isLabelRow ? 245 : 140;
          data[index + 2] = isLabelRow ? 245 : 70;
          data[index + 3] = 255;
        }
        return { data };
      }),
    };

    const slots = detectFantasyScreenshotNameLayoutSlots(canvas, context);
    const gkSlot = slots.find((slot) => slot.id === "starter-gk-1");

    expect(gkSlot.detectedLabel).toBe(true);
    expect(gkSlot.boundingBox.y).toBeGreaterThan(labelY - 2);
    expect(gkSlot.boundingBox.y).toBeLessThan(510);
    expect(gkSlot.ocrFallbackBoundingBox.y).toBeLessThan(labelY);
    expect(gkSlot.ocrFallbackBoundingBox.height).toBeGreaterThan(labelHeight);
  });

  test("detects name labels in a top-cropped tall mobile screenshot", () => {
    const canvas = { width: 945, height: 1700 };
    const labelY = 108;
    const labelHeight = 48;
    const context = {
      canvas,
      getImageData: jest.fn((x, y, width, height) => {
        const isLabelRow = y >= labelY && y <= labelY + labelHeight;
        const isPitchRow = y >= 0 && y <= 930;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let index = 0; index < data.length; index += 4) {
          data[index] = isLabelRow ? 248 : isPitchRow ? 20 : 45;
          data[index + 1] = isLabelRow ? 248 : isPitchRow ? 150 : 15;
          data[index + 2] = isLabelRow ? 248 : isPitchRow ? 70 : 50;
          data[index + 3] = 255;
        }
        return { data };
      }),
    };

    const slots = detectFantasyScreenshotNameLayoutSlots(canvas, context);
    const gkSlot = slots.find((slot) => slot.id === "starter-gk-1");

    expect(gkSlot.detectedLabel).toBe(true);
    expect(gkSlot.boundingBox.y).toBeGreaterThan(labelY - 2);
    expect(gkSlot.boundingBox.y).toBeLessThan(120);
    expect(gkSlot.ocrFallbackBoundingBox.y).toBeLessThan(labelY);
    expect(gkSlot.ocrFallbackBoundingBox.height).toBeGreaterThan(labelHeight);
    expect(gkSlot.boundingBox.y).toBeLessThan(Math.round(canvas.height * 0.216));
  });

  test("detects optional wide formation name labels for far-right players", () => {
    const canvas = { width: 1200, height: 1800 };
    const context = {
      canvas,
      getImageData: jest.fn((x, y, width, height) => {
        const isWideMidSearch = x >= 920 && y >= 800 && y <= 980;
        const data = new Uint8ClampedArray(width * height * 4);
        for (let index = 0; index < data.length; index += 4) {
          data[index] = isWideMidSearch ? 246 : 20;
          data[index + 1] = isWideMidSearch ? 246 : 140;
          data[index + 2] = isWideMidSearch ? 246 : 70;
          data[index + 3] = 255;
        }
        return { data };
      }),
    };

    const slots = detectFantasyScreenshotNameLayoutSlots(canvas, context);
    const wideMidSlot = slots.find((slot) => slot.id === "starter-mid-wide-5");

    expect(wideMidSlot.detectedLabel).toBe(true);
    expect(wideMidSlot.optional).toBe(true);
    expect(wideMidSlot.boundingBox.x).toBeGreaterThan(900);
  });

  test("formation layouts cover every supplied FPL pitch formation in screenshot order", () => {
    const expected = {
      "3-4-3": ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD", "GK", "MID", "DEF", "DEF"],
      "3-5-2": ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "FWD", "GK", "FWD", "DEF", "DEF"],
      "4-3-3": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "FWD", "GK", "MID", "MID", "DEF"],
      "4-4-2": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD", "GK", "MID", "FWD", "DEF"],
      "4-5-1": ["GK", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "MID", "FWD", "GK", "FWD", "FWD", "DEF"],
      "5-3-2": ["GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "FWD", "FWD", "GK", "FWD", "MID", "MID"],
      "5-4-1": ["GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "GK", "FWD", "FWD", "MID"],
    };

    Object.entries(expected).forEach(([formation, positions]) => {
      const slots = getFantasyScreenshotFormationLayoutSlots(formation, 945, 2048);
      expect(slots).toHaveLength(15);
      expect(slots.map((slot) => slot.position)).toEqual(positions);
      expect(slots.slice(0, 11).map((slot) => slot.role).every((role) => role === "starter")).toBe(true);
      expect(slots.slice(11).map((slot) => slot.role).every((role) => role === "bench")).toBe(true);
      expect(slots.map((slot) => slot.boundingBox).every((box) => box.x >= 0 && box.x + box.width <= 945)).toBe(true);
    });
  });

  test("formation layouts explicitly include far-right starter labels", () => {
    const fiveDef = getFantasyScreenshotFormationLayoutSlots("5-4-1", 945, 2048);
    const fiveMid = getFantasyScreenshotFormationLayoutSlots("4-5-1", 945, 2048);
    const threeFwd = getFantasyScreenshotFormationLayoutSlots("3-4-3", 945, 2048);

    expect(fiveDef.find((slot) => slot.id === "starter-def-5").boundingBox.x).toBeGreaterThan(730);
    expect(fiveMid.find((slot) => slot.id === "starter-mid-5").boundingBox.x).toBeGreaterThan(730);
    expect(threeFwd.find((slot) => slot.id === "starter-fwd-3").boundingBox.x).toBeGreaterThan(650);
  });

  test("review display can use the detected 5-4-1 formation layout", () => {
    const layout = getFantasyScreenshotFormationReviewLayout("5-4-1");
    const display = buildFantasyScreenshotReviewDisplaySlots([
      {
        id: "review-richarlison",
        extracted: {
          rawName: "Richarlison",
          rawPosition: "FWD",
          rawSquadRole: "starter",
          sourceRegion: { id: "starter-fwd-1" },
        },
        selectedPlayerId: "fpl:richarlison",
        selectedPlayer: { id: "fpl:richarlison", position: "FWD", displayName: "Richarlison" },
        role: "starter",
        status: "matched",
      },
    ], layout);

    expect(layout).toHaveLength(15);
    expect(layout.slice(0, 11).map((slot) => slot.position)).toEqual(["GK", "DEF", "DEF", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD"]);
    expect(display.filter((item) => item.type === "missing")).toHaveLength(14);
    expect(display.find((item) => item.type === "slot").layoutSlot.id).toBe("starter-fwd-1");
    expect(display.filter((item) => item.role === "starter" && item.position === "FWD")).toHaveLength(1);
  });

  test("review display does not add extra missing forwards when formation count is filled", () => {
    const layout = getFantasyScreenshotFormationReviewLayout("5-4-1");
    const display = buildFantasyScreenshotReviewDisplaySlots([
      {
        id: "review-richarlison",
        extracted: {
          rawName: "Richarlison",
          rawPosition: "FWD",
          rawSquadRole: "starter",
          sourceRegion: { id: "starter-fwd-1" },
        },
        selectedPlayerId: "fpl:richarlison",
        selectedPlayer: { id: "fpl:richarlison", position: "FWD", displayName: "Richarlison" },
        role: "starter",
        status: "matched",
      },
    ], layout);

    expect(display.filter((item) => item.type === "missing" && item.role === "starter" && item.position === "FWD")).toHaveLength(0);
    expect(display.filter((item) => item.role === "starter" && item.position === "FWD")).toHaveLength(1);
  });

  test("detected wide labels infer the matching formation for targeted OCR", () => {
    const layoutSlots = [
      ...getFantasyScreenshotFormationLayoutSlots("5-4-1", 945, 2048).slice(0, 11).map((slot) => ({ ...slot, detectedLabel: true })),
      ...getFantasyScreenshotFormationLayoutSlots("5-4-1", 945, 2048).slice(11),
    ];

    expect(inferFantasyScreenshotFormationFromLayoutSlots(layoutSlots)).toBe("5-4-1");
  });

  test("worker terminates after OCR failure", async () => {
    mockRecognize.mockRejectedValueOnce(new Error("language data failed"));
    await expect(runFantasyScreenshotOcr("fixture.png")).rejects.toThrow(/language data failed/);
    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });

  test("worker terminates after cancellation", async () => {
    const controller = new AbortController();
    mockRecognize.mockImplementationOnce(() => {
      controller.abort();
      return Promise.resolve({ data: { text: "", words: [] } });
    });
    await expect(runFantasyScreenshotOcr("fixture.png", { signal: controller.signal })).rejects.toThrow(/OCR cancelled/);
    expect(mockTerminate).toHaveBeenCalledTimes(1);
  });

  test("quality scoring uses matched-player evidence", () => {
    const review = buildFantasyScreenshotReview({
      extractedSlots: [
        { rawName: "Bukayo Saka", rawTeamCode: "ARS", rawPosition: "MID", extractionConfidence: 0.9 },
        { rawName: "Mohamed Salah", rawTeamCode: "LIV", rawPosition: "MID", extractionConfidence: 0.9 },
      ],
      players,
    });
    const quality = scoreFantasyScreenshotOcrQuality({
      blocks: [{ confidence: 0.9 }, { confidence: 0.8 }],
      candidates: review.extractedSlots.map((slot) => slot.extracted),
      review,
    });
    expect(quality.matchedPlayerCount).toBe(2);
    expect(quality.score).toBeGreaterThan(0);
  });

  test("best OCR variant selection is deterministic and prefers matched players", () => {
    const best = selectBestFantasyScreenshotOcrAttempt([
      { variant: "primary", quality: { score: 80, candidateCount: 12, matchedPlayerCount: 3 } },
      { variant: "fallback", quality: { score: 60, candidateCount: 10, matchedPlayerCount: 8 } },
    ]);
    expect(best.variant).toBe("fallback");
  });

  test("best OCR variant prefers fewer unmatched rows when matched count ties", () => {
    const best = selectBestFantasyScreenshotOcrAttempt([
      { variant: "noisy", quality: { score: 80, candidateCount: 12, matchedPlayerCount: 7 }, review: { extractedSlots: [{}, {}, {}] } },
      { variant: "clean", quality: { score: 70, candidateCount: 7, matchedPlayerCount: 7 }, review: { extractedSlots: [] } },
    ]);
    expect(best.variant).toBe("clean");
  });

  test("tiny partial fixed-layout OCR does not beat a stronger broad fallback", () => {
    const best = selectBestFantasyScreenshotOcrAttempt([
      { variant: "layout", layout: "fpl-pitch", quality: { score: 30, candidateCount: 2, matchedPlayerCount: 2 }, review: { extractedSlots: [] } },
      { variant: "full", layout: null, quality: { score: 70, candidateCount: 10, matchedPlayerCount: 9 }, review: { extractedSlots: [] } },
    ]);
    expect(best.variant).toBe("full");
  });

  test("partial fixed-layout OCR keeps trying broad fallback passes", async () => {
    const fixturePlayers = ["Raya", "Gabriel"].map((name, index) => ({
      id: `layout-stop:${index + 1}`,
      sourceId: index + 1,
      firstName: name,
      lastName: "",
      displayName: name,
      name,
      webName: name,
      normalisedName: name.toLowerCase(),
      teamCode: "ARS",
      teamName: "Test",
      position: index === 0 ? "GK" : "DEF",
      positionId: index === 0 ? 1 : 2,
      dataSource: "test",
    }));
    const ocrRunner = jest.fn()
      .mockResolvedValueOnce({ blocks: [], raw: null })
      .mockResolvedValueOnce({
        blocks: [
          { text: "Raya", confidence: 0.9, boundingBox: { x: Math.round(1200 * 0.41), y: Math.round(1800 * 0.216), width: 120, height: 28 } },
          { text: "Gabriel", confidence: 0.9, boundingBox: { x: Math.round(1200 * 0.11), y: Math.round(1800 * 0.344), width: 120, height: 28 } },
        ],
        raw: null,
      })
      .mockResolvedValue({ blocks: [{ text: "Rio Cardines", confidence: 0.95, boundingBox: { x: 0, y: 0, width: 120, height: 24 } }], raw: null });

    const best = await runFantasyScreenshotOcrWithFallback(
      { url: "fixture.png", width: 1200, height: 1800 },
      { players: fixturePlayers, imageMetadata: { width: 1200, height: 1800 }, ocrRunner }
    );

    expect(ocrRunner).toHaveBeenCalledTimes(7);
    expect(best.region).toBe("fpl-name-labels-threshold");
    expect(best.review.extractedSlots.map((slot) => slot.extracted.rawName)).toEqual(["Raya", "Gabriel"]);
  });

  test("targeted slot recovery rechecks only missing layout locations", async () => {
    const fixturePlayers = [
      ["Raya", "GK"],
      ["Gabriel", "DEF"],
      ["Saliba", "DEF"],
    ].map(([name, position], index) => ({
      id: `targeted:${index + 1}`,
      sourceId: index + 1,
      firstName: name,
      lastName: "",
      displayName: name,
      name,
      webName: name,
      normalisedName: name.toLowerCase(),
      teamCode: "ARS",
      teamName: "Test",
      position,
      positionId: position === "GK" ? 1 : 2,
      dataSource: "test",
    }));
    const boxFor = (slot) => ({
      x: Math.round(1200 * slot.box.x),
      y: Math.round(1800 * slot.box.y),
      width: Math.round(1200 * slot.box.width),
      height: Math.round(1800 * slot.box.height),
    });
    const slotCalls = [];
    const slotOcrRunner = jest.fn(async (imageSource, layoutSlots) => {
      slotCalls.push(layoutSlots.map((slot) => slot.id));
      const blockFor = (slotId, text) => {
        const slot = [
          { id: "starter-gk-1", box: { x: 0.41, y: 0.216, width: 0.18, height: 0.02 } },
          { id: "starter-def-1", box: { x: 0.11, y: 0.344, width: 0.18, height: 0.02 } },
          { id: "starter-def-2", box: { x: 0.41, y: 0.344, width: 0.18, height: 0.02 } },
        ].find((item) => item.id === slotId);
        return { text, confidence: 0.9, strictSlotOcr: true, boundingBox: boxFor(slot) };
      };
      if (slotCalls.length === 1) {
        return { blocks: [blockFor("starter-gk-1", "Raya"), blockFor("starter-def-1", "Gabriel")], raw: null };
      }
      if (slotCalls.length === 2) {
        return { blocks: [blockFor("starter-def-2", "Saliba")], raw: null };
      }
      return { blocks: [], raw: null };
    });
    const ocrRunner = jest.fn().mockResolvedValue({ blocks: [], raw: null });

    const best = await runFantasyScreenshotOcrWithFallback(
      { url: "fixture.png", width: 1200, height: 1800 },
      { players: fixturePlayers, imageMetadata: { width: 1200, height: 1800 }, ocrRunner, slotOcrRunner }
    );

    expect(slotOcrRunner).toHaveBeenCalled();
    expect(slotCalls[1]).toContain("starter-def-2");
    expect(slotCalls[1]).not.toContain("starter-gk-1");
    expect(best.region).toContain("targeted-slots");
    expect(best.review.extractedSlots.map((slot) => slot.extracted.rawName)).toEqual(expect.arrayContaining(["Raya", "Gabriel", "Saliba"]));
  });

  test("slot OCR starts with expanded plausible slots when formation cannot be inferred", async () => {
    const slotCalls = [];
    const slotOcrRunner = jest.fn(async (imageSource, layoutSlots) => {
      slotCalls.push(layoutSlots.map((slot) => slot.id));
      return { blocks: [], raw: null };
    });
    const ocrRunner = jest.fn().mockResolvedValue({ blocks: [], raw: null });

    await runFantasyScreenshotOcrWithFallback(
      { url: "fixture.png", width: 1200, height: 1800 },
      { players: [], imageMetadata: { width: 1200, height: 1800 }, ocrRunner, slotOcrRunner }
    );

    expect(slotCalls[0].length).toBeGreaterThan(15);
    expect(slotCalls[0]).toEqual(expect.arrayContaining(["starter-def-wide-5", "starter-mid-wide-5"]));
  });

  test("primary quality below threshold requests fallback", () => {
    const quality = scoreFantasyScreenshotOcrQuality({ blocks: [], candidates: [], review: { extractedSlots: [] } });
    expect(quality.needsFallback).toBe(true);
  });

  test("layout OCR attempt reads fixed FPL name labels and ignores sponsor text", async () => {
    const fixtureNames = [
      "Raya",
      "Gabriel",
      "Shaw",
      "Gvardiol",
      "Gross",
      "Szoboszlai",
      "B.Fernandes",
      "Garnacho",
      "Calvert-Lewin",
      "Haaland",
      "Gyokeres",
      "Dubravka",
      "Hughes",
      "Diop",
      "Thomas",
    ];
    const layoutPositions = ["GK", "DEF", "DEF", "DEF", "MID", "MID", "MID", "MID", "FWD", "FWD", "FWD", "GK", "MID", "DEF", "DEF"];
    const fixturePlayers = fixtureNames.map((name, index) => ({
      id: `layout:${index + 1}`,
      sourceId: index + 1,
      firstName: name,
      lastName: "",
      displayName: name,
      name,
      webName: name,
      normalisedName: name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(),
      teamCode: ["ARS", "LIV", "MCI", "NEW"][index % 4],
      teamName: "Test",
      position: layoutPositions[index],
      positionId: layoutPositions[index] === "GK" ? 1 : layoutPositions[index] === "DEF" ? 2 : layoutPositions[index] === "MID" ? 3 : 4,
      dataSource: "test",
    }));
    const availablePlayers = [
      ...fixturePlayers,
      {
        id: "layout:enzo",
        sourceId: 99,
        firstName: "Enzo",
        lastName: "Le Fee",
        displayName: "Enzo Le Fee",
        name: "Enzo Le Fee",
        webName: "Enzo Le Fee",
        normalisedName: "enzo le fee",
        teamCode: "SUN",
        teamName: "Test",
        position: "MID",
        positionId: 3,
        dataSource: "test",
      },
    ];
    const layoutBoxes = [
      { x: 0.41, y: 0.216, width: 0.18, height: 0.032 },
      { x: 0.11, y: 0.344, width: 0.18, height: 0.033 },
      { x: 0.41, y: 0.344, width: 0.18, height: 0.033 },
      { x: 0.705, y: 0.344, width: 0.18, height: 0.033 },
      { x: 0.055, y: 0.473, width: 0.18, height: 0.034 },
      { x: 0.29, y: 0.473, width: 0.18, height: 0.034 },
      { x: 0.529, y: 0.473, width: 0.18, height: 0.034 },
      { x: 0.767, y: 0.473, width: 0.18, height: 0.034 },
      { x: 0.116, y: 0.6, width: 0.18, height: 0.034 },
      { x: 0.41, y: 0.6, width: 0.18, height: 0.034 },
      { x: 0.706, y: 0.6, width: 0.18, height: 0.034 },
      { x: 0.063, y: 0.771, width: 0.18, height: 0.034 },
      { x: 0.294, y: 0.771, width: 0.18, height: 0.034 },
      { x: 0.527, y: 0.771, width: 0.18, height: 0.034 },
      { x: 0.754, y: 0.771, width: 0.18, height: 0.034 },
    ];
    const ocrRunner = jest.fn().mockResolvedValueOnce({
      blocks: [
        { text: "Snapdragon", confidence: 0.9, boundingBox: { x: 500, y: 840, width: 90, height: 24 } },
        { text: "Emirat", confidence: 0.88, boundingBox: { x: 136, y: 620, width: 70, height: 18 } },
        { text: "[Eensse}", confidence: 0.75, boundingBox: { x: Math.round(1200 * 0.705), y: Math.round(1800 * 0.344), width: 120, height: 28 } },
        {
          text: "szoboslai B.Fernan",
          confidence: 0.86,
          boundingBox: {
            x: Math.round(1200 * layoutBoxes[5].x),
            y: Math.round(1800 * layoutBoxes[5].y),
            width: Math.round(1200 * layoutBoxes[5].width),
            height: Math.round(1800 * layoutBoxes[5].height),
          },
        },
        ...fixturePlayers.filter((player) => !["Szoboszlai", "B.Fernandes"].includes(player.displayName)).map((player) => {
          const index = fixturePlayers.indexOf(player);
          const box = layoutBoxes[index];
          return {
            text: player.displayName,
            confidence: 0.9,
            boundingBox: {
              x: Math.round(1200 * box.x),
              y: Math.round(1800 * box.y),
              width: Math.round(1200 * box.width),
              height: Math.round(1800 * box.height),
            },
          };
        }),
      ],
      raw: null,
    });

    const best = await runFantasyScreenshotOcrWithFallback(
      { url: "fixture.png", width: 1200, height: 1800 },
      { players: availablePlayers, imageMetadata: { width: 1200, height: 1800 }, ocrRunner }
    );

    expect(ocrRunner).toHaveBeenCalledTimes(1);
    expect(best.region).toBe("fpl-name-labels");
    expect(best.review.extractedSlots.filter((slot) => slot.selectedPlayerId)).toHaveLength(15);
    expect(best.review.extractedSlots.some((slot) => slot.extracted.rawName === "Snapdragon")).toBe(false);
    expect(best.review.extractedSlots.some((slot) => slot.selectedPlayerId === "layout:enzo")).toBe(false);
    expect(best.review.extractedSlots.map((slot) => slot.extracted.rawName)).toEqual(expect.arrayContaining(["Szoboszlai", "B.Fernandes"]));
    expect(best.review.extractedSlots.filter((slot) => slot.role === "bench")).toHaveLength(4);
  });

  test("strict slot OCR does not correct short names into different real players", () => {
    const candidates = parseFantasyScreenshotCandidates([
      {
        text: "Raya",
        confidence: 0.9,
        strictSlotOcr: true,
        boundingBox: { x: Math.round(1200 * 0.41), y: Math.round(1800 * 0.216), width: 120, height: 24 },
      },
      {
        text: "COV (H)",
        confidence: 0.9,
        strictSlotOcr: true,
        boundingBox: { x: Math.round(1200 * 0.11), y: Math.round(1800 * 0.344), width: 120, height: 24 },
      },
    ], {
      imageHeight: 1800,
      layoutSlots: [
        { id: "starter-gk-1", role: "starter", position: "GK", boundingBox: { x: Math.round(1200 * 0.41), y: Math.round(1800 * 0.216), width: 120, height: 24 } },
        { id: "starter-def-1", role: "starter", position: "DEF", boundingBox: { x: Math.round(1200 * 0.11), y: Math.round(1800 * 0.344), width: 120, height: 24 } },
      ],
      players: [{
        id: "layout:rayan",
        sourceId: 88,
        firstName: "Rayan",
        lastName: "",
        displayName: "Rayan",
        name: "Rayan",
        webName: "Rayan",
        normalisedName: "rayan",
        teamCode: "WOL",
        teamName: "Test",
        position: "DEF",
        positionId: 2,
        dataSource: "test",
      }],
    });

    expect(candidates).toEqual([]);
  });

  test("strict slot OCR can recover longer player names with minor OCR errors", () => {
    const candidates = parseFantasyScreenshotCandidates([
      {
        text: "De Cuypar AVL H",
        confidence: 0.82,
        strictSlotOcr: true,
        boundingBox: { x: Math.round(1200 * 0.795), y: Math.round(1800 * 0.344), width: 180, height: 56 },
      },
    ], {
      imageHeight: 1800,
      layoutSlots: [
        { id: "starter-def-5", role: "starter", position: "DEF", boundingBox: { x: Math.round(1200 * 0.795), y: Math.round(1800 * 0.344), width: 180, height: 56 } },
      ],
      players: [{
        id: "layout:de-cuyper",
        sourceId: 89,
        firstName: "Maxim",
        lastName: "De Cuyper",
        displayName: "Maxim De Cuyper",
        name: "Maxim De Cuyper",
        webName: "De Cuyper",
        normalisedName: "maxim de cuyper",
        teamCode: "BHA",
        teamName: "Test",
        position: "DEF",
        positionId: 2,
        dataSource: "test",
      }],
    });

    expect(candidates).toHaveLength(1);
    expect(candidates[0].rawName).toBe("De Cuyper");
  });

  test("duplicate selected players are not kept in multiple screenshot slots", () => {
    const fixturePlayers = [{
      id: "layout:hughes-1",
      sourceId: 1,
      firstName: "Will",
      lastName: "Hughes",
      displayName: "Will Hughes",
      name: "Will Hughes",
      webName: "Hughes",
      normalisedName: "will hughes",
      teamCode: "CRY",
      teamName: "Test",
      position: "MID",
      positionId: 3,
      dataSource: "test",
    }, {
      id: "layout:hughes-2",
      sourceId: 2,
      firstName: "Other",
      lastName: "Hughes",
      displayName: "Other Hughes",
      name: "Other Hughes",
      webName: "Hughes",
      normalisedName: "other hughes",
      teamCode: "SUN",
      teamName: "Test",
      position: "MID",
      positionId: 3,
      dataSource: "test",
    }];
    const review = buildFantasyScreenshotReview({
      extractedSlots: [
        { rawName: "Hughes", rawPosition: "MID", rawSquadRole: "bench", extractionConfidence: 0.9, sourceRegion: { boundingBox: { y: 100 } } },
        { rawName: "Other Hughes", rawPosition: "MID", rawSquadRole: "bench", extractionConfidence: 0.85, sourceRegion: { boundingBox: { y: 160 } } },
      ],
      players: fixturePlayers,
    });
    expect(review.extractedSlots.filter((slot) => slot.selectedPlayerId)).toHaveLength(1);
    expect(review.extractedSlots.filter((slot) => !slot.selectedPlayerId)).toHaveLength(1);
  });

  test("review cleanup removes partial duplicate names and tiny OCR fragments", () => {
    const fixturePlayers = [{
      id: "fpl:van-de-ven",
      sourceId: 1,
      firstName: "Micky",
      lastName: "van de Ven",
      displayName: "Micky van de Ven",
      name: "Micky van de Ven",
      webName: "Van de Ven",
      normalisedName: "micky van de ven",
      teamCode: "TOT",
      teamName: "Tottenham",
      position: "DEF",
      positionId: 2,
      dataSource: "test",
    }];
    const review = buildFantasyScreenshotReview({
      extractedSlots: [
        { rawName: "Van de Ven", rawPosition: "DEF", rawSquadRole: "starter", extractionConfidence: 0.94, sourceRegion: { boundingBox: { x: 40, y: 300, width: 180, height: 42 } } },
        { rawName: "de Ven", rawPosition: "DEF", rawSquadRole: "starter", extractionConfidence: 0.62, sourceRegion: { boundingBox: { x: 42, y: 304, width: 150, height: 36 } } },
        { rawName: "aw", rawPosition: "DEF", rawSquadRole: "starter", extractionConfidence: 0.8, sourceRegion: { boundingBox: { x: 500, y: 300, width: 100, height: 42 } } },
      ],
      players: fixturePlayers,
    });

    expect(review.extractedSlots).toHaveLength(1);
    expect(review.extractedSlots[0]).toMatchObject({ selectedPlayerId: "fpl:van-de-ven" });
  });

  test("debug summary excludes screenshot data, OCR text and player contents", () => {
    const review = buildFantasyScreenshotReview({ extractedSlots: [{ rawName: "Bukayo Saka", rawTeamCode: "ARS", rawPosition: "MID", extractionConfidence: 0.9 }], players });
    const summary = createFantasyScreenshotImportSummary({
      imageMetadata: { width: 1200, height: 1800, source: "data:image/png;base64,secret" },
      processingDurationMs: 1234.4,
      review,
      manuallyCorrectedCount: 2,
      finalValidSquad: true,
    });
    const serialised = JSON.stringify(summary);
    expect(summary).toMatchObject({
      importVersion: "chunk-5.6-local-ocr-v1",
      imageWidth: 1200,
      imageHeight: 1800,
      processingDurationMs: 1234,
      detectedCandidateCount: 1,
      manuallyCorrectedCount: 2,
      finalValidSquad: true,
    });
    expect(serialised).not.toMatch(/data:image|base64|Bukayo|OCR|secret/);
  });

  test("feedback summary excludes screenshot data and raw OCR text", () => {
    const feedback = createFantasyScreenshotFeedbackSummary({
      rating: "I corrected 1-2 players",
      note: "OCR read a team code incorrectly data:image/png;base64,secret",
      importSummary: {
        importVersion: "chunk-5.5-local-ocr-v1",
        processingDurationMs: 123,
        detectedCandidateCount: 14,
        exactMatchCount: 10,
        likelyMatchCount: 2,
        ambiguousCount: 1,
        unmatchedCount: 1,
        manuallyCorrectedCount: 2,
        finalValidSquad: true,
        errorCode: null,
        ocrText: "raw player text",
      },
    });
    const serialised = JSON.stringify(feedback);
    expect(feedback.importSummary.detectedCandidateCount).toBe(14);
    expect(serialised).not.toMatch(/raw player text|data:image|base64|secret/);
  });
});
