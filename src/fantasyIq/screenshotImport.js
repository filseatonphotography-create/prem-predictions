import {
  matchFantasyPlayerCandidate,
  normaliseFantasyPlayerName,
  normalisePremierLeagueTeamCode,
} from "./playerData";

export const FANTASY_SCREENSHOT_IMPORT_CONFIG = {
  acceptedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  acceptedExtensions: [".png", ".jpg", ".jpeg", ".webp"],
  maxFileSizeBytes: 10 * 1024 * 1024,
  minWidth: 450,
  minHeight: 650,
  maxWidth: 6000,
  maxHeight: 9000,
  preprocessing: {
    maxCanvasWidth: 1800,
    contrast: 1.18,
    grayscale: true,
    primaryVariant: "grayscale-contrast",
    fallbackVariant: "threshold-sharpened",
  },
  qualityThresholds: {
    minimumCandidates: 5,
    minimumMatchedPlayers: 7,
    minimumScoreForSinglePass: 54,
  },
  confidenceWeights: {
    extraction: 0.4,
    match: 0.6,
  },
  importConfidence: {
    high: 78,
    medium: 52,
  },
};

export const FANTASY_SCREENSHOT_TESSERACT_ASSETS = {
  workerPath: "/vendor/tesseract/7.0.0/worker/worker.min.js",
  corePath: "/vendor/tesseract/7.0.0/core",
  langPath: "/vendor/tesseract/7.0.0/lang/eng/4.0.0_best_int",
};

export const FANTASY_SCREENSHOT_IMPORT_VERSION = "chunk-5.5-local-ocr-v1";

const FPL_PITCH_SCREENSHOT_ROW_X = {
  1: [0.41],
  2: [0.205, 0.607],
  3: [0.11, 0.41, 0.705],
  4: [0.055, 0.29, 0.529, 0.767],
  5: [0.016, 0.205, 0.41, 0.607, 0.795],
};

const FPL_PITCH_SCREENSHOT_ROW_Y = {
  GK: 0.216,
  DEF: 0.344,
  MID: 0.473,
  FWD: 0.6,
};

const FPL_PITCH_SCREENSHOT_FORMATIONS = [
  { label: "3-4-3", counts: { DEF: 3, MID: 4, FWD: 3 } },
  { label: "3-5-2", counts: { DEF: 3, MID: 5, FWD: 2 } },
  { label: "4-3-3", counts: { DEF: 4, MID: 3, FWD: 3 } },
  { label: "4-4-2", counts: { DEF: 4, MID: 4, FWD: 2 } },
  { label: "4-5-1", counts: { DEF: 4, MID: 5, FWD: 1 } },
  { label: "5-3-2", counts: { DEF: 5, MID: 3, FWD: 2 } },
  { label: "5-4-1", counts: { DEF: 5, MID: 4, FWD: 1 } },
];

function makeStarterLayoutRow(position, count) {
  return (FPL_PITCH_SCREENSHOT_ROW_X[count] || []).map((x, index) => ({
    id: `starter-${position.toLowerCase()}-${index + 1}`,
    role: "starter",
    position,
    box: { x, y: FPL_PITCH_SCREENSHOT_ROW_Y[position], width: 0.18, height: 0.02 },
  }));
}

function makeFormationNameLayout(formation) {
  return [
    { id: "starter-gk-1", role: "starter", position: "GK", box: { x: 0.41, y: 0.216, width: 0.18, height: 0.02 } },
    ...makeStarterLayoutRow("DEF", formation.counts.DEF),
    ...makeStarterLayoutRow("MID", formation.counts.MID),
    ...makeStarterLayoutRow("FWD", formation.counts.FWD),
  ];
}

const FPL_PITCH_SCREENSHOT_FORMATION_BENCH_POSITIONS = {
  "3-4-3": ["GK", "MID", "DEF", "DEF"],
  "3-5-2": ["GK", "FWD", "DEF", "DEF"],
  "4-3-3": ["GK", "MID", "MID", "DEF"],
  "4-4-2": ["GK", "MID", "FWD", "DEF"],
  "4-5-1": ["GK", "FWD", "FWD", "DEF"],
  "5-3-2": ["GK", "FWD", "MID", "MID"],
  "5-4-1": ["GK", "FWD", "FWD", "MID"],
};

function makeFormationBenchLayout(formation) {
  const positions = FPL_PITCH_SCREENSHOT_FORMATION_BENCH_POSITIONS[formation.label] || FPL_PITCH_SCREENSHOT_FORMATION_BENCH_POSITIONS["3-4-3"];
  const xValues = [0.063, 0.294, 0.527, 0.754];
  return positions.map((position, index) => ({
    id: `bench-${position.toLowerCase()}-${positions.slice(0, index + 1).filter((item) => item === position).length}`,
    role: "bench",
    position,
    box: { x: xValues[index], y: 0.771, width: 0.18, height: 0.02 },
  }));
}

const FPL_PITCH_SCREENSHOT_FORMATION_NAME_LAYOUTS = Object.fromEntries(
  FPL_PITCH_SCREENSHOT_FORMATIONS.map((formation) => [formation.label, makeFormationNameLayout(formation)])
);

const FPL_PITCH_SCREENSHOT_FORMATION_BENCH_LAYOUTS = Object.fromEntries(
  FPL_PITCH_SCREENSHOT_FORMATIONS.map((formation) => [formation.label, makeFormationBenchLayout(formation)])
);

const FPL_PITCH_SCREENSHOT_NAME_LAYOUT = [
  ...FPL_PITCH_SCREENSHOT_FORMATION_NAME_LAYOUTS["3-4-3"],
  ...FPL_PITCH_SCREENSHOT_FORMATION_BENCH_LAYOUTS["3-4-3"],
];

const FPL_PITCH_SCREENSHOT_OPTIONAL_NAME_LAYOUT = [
  { id: "starter-def-wide-1", role: "starter", position: "DEF", optional: true, box: { x: 0.016, y: 0.344, width: 0.18, height: 0.02 } },
  { id: "starter-def-wide-2", role: "starter", position: "DEF", optional: true, box: { x: 0.205, y: 0.344, width: 0.18, height: 0.02 } },
  { id: "starter-def-wide-4", role: "starter", position: "DEF", optional: true, box: { x: 0.607, y: 0.344, width: 0.18, height: 0.02 } },
  { id: "starter-def-wide-5", role: "starter", position: "DEF", optional: true, box: { x: 0.795, y: 0.344, width: 0.18, height: 0.02 } },
  { id: "starter-mid-wide-1", role: "starter", position: "MID", optional: true, box: { x: 0.016, y: 0.473, width: 0.18, height: 0.02 } },
  { id: "starter-mid-wide-2", role: "starter", position: "MID", optional: true, box: { x: 0.205, y: 0.473, width: 0.18, height: 0.02 } },
  { id: "starter-mid-wide-3", role: "starter", position: "MID", optional: true, box: { x: 0.41, y: 0.473, width: 0.18, height: 0.02 } },
  { id: "starter-mid-wide-4", role: "starter", position: "MID", optional: true, box: { x: 0.607, y: 0.473, width: 0.18, height: 0.02 } },
  { id: "starter-mid-wide-5", role: "starter", position: "MID", optional: true, box: { x: 0.795, y: 0.473, width: 0.18, height: 0.02 } },
];

const FPL_PITCH_SCREENSHOT_EXPANDED_NAME_LAYOUT = [
  ...FPL_PITCH_SCREENSHOT_NAME_LAYOUT,
  ...FPL_PITCH_SCREENSHOT_OPTIONAL_NAME_LAYOUT,
];

function makeCardSearchLayout(slot) {
  return {
    ...slot,
    box: {
      x: Math.max(0, slot.box.x - 0.02),
      y: Math.max(0, slot.box.y - 0.024),
      width: Math.min(0.24, slot.box.width + 0.04),
      height: slot.role === "bench" ? 0.12 : 0.11,
    },
  };
}

const FPL_PITCH_SCREENSHOT_CARD_SEARCH_LAYOUT = [
  ...FPL_PITCH_SCREENSHOT_FORMATION_NAME_LAYOUTS["3-4-3"].map(makeCardSearchLayout),
  { id: "bench-gk-1", role: "bench", position: "GK", box: { x: 0.043, y: 0.75, width: 0.22, height: 0.12 } },
  { id: "bench-mid-1", role: "bench", position: "MID", box: { x: 0.274, y: 0.75, width: 0.22, height: 0.12 } },
  { id: "bench-def-1", role: "bench", position: "DEF", box: { x: 0.507, y: 0.75, width: 0.22, height: 0.12 } },
  { id: "bench-def-2", role: "bench", position: "DEF", box: { x: 0.734, y: 0.75, width: 0.22, height: 0.12 } },
];

const FPL_PITCH_SCREENSHOT_OPTIONAL_CARD_SEARCH_LAYOUT = FPL_PITCH_SCREENSHOT_OPTIONAL_NAME_LAYOUT.map(makeCardSearchLayout);

const FPL_PITCH_SCREENSHOT_EXPANDED_CARD_SEARCH_LAYOUT = [
  ...FPL_PITCH_SCREENSHOT_CARD_SEARCH_LAYOUT,
  ...FPL_PITCH_SCREENSHOT_OPTIONAL_CARD_SEARCH_LAYOUT,
];

export const FANTASY_SCREENSHOT_REVIEW_SLOT_LAYOUT = FPL_PITCH_SCREENSHOT_EXPANDED_NAME_LAYOUT.map((slot) => ({
  id: slot.id,
  role: slot.role,
  position: slot.position,
  optional: !!slot.optional,
  box: slot.box,
}));

export const FANTASY_SCREENSHOT_IMPORT_STATES = {
  idle: "idle",
  selected: "image selected",
  validating: "validating",
  preprocessing: "preprocessing",
  extracting: "extracting text",
  matching: "matching players",
  review: "needs review",
  ready: "ready to import",
  importing: "importing",
  completed: "completed",
  cancelled: "cancelled",
  failed: "failed",
};

export function getFantasyScreenshotTesseractOptions(overrides = {}) {
  return {
    ...FANTASY_SCREENSHOT_TESSERACT_ASSETS,
    workerBlobURL: false,
    gzip: true,
    cacheMethod: "write",
    ...overrides,
  };
}

export function hasExternalTesseractAssetPaths(options = getFantasyScreenshotTesseractOptions()) {
  return ["workerPath", "corePath", "langPath"].some((key) => /^https?:\/\//i.test(String(options[key] || "")));
}

const POSITION_WORDS = {
  GK: ["gk", "gkp", "goalkeeper", "keeper"],
  DEF: ["def", "defender", "defenders"],
  MID: ["mid", "midfielder", "midfielders"],
  FWD: ["fwd", "for", "forward", "forwards", "striker"],
};

const OCR_CODE_CORRECTIONS = {
  "0": "O",
  "1": "I",
  "8": "B",
  "5": "S",
};

const SCREENSHOT_NON_PLAYER_WORDS = new Set([
  "american",
  "better",
  "emirates",
  "emirat",
  "emirat",
  "express",
  "fiybetter",
  "hybeer",
  "aybeiter",
  "ohnoosed",
  "opponent",
  "pitch",
  "pod",
  "seee see",
  "seeesee",
  "eensse",
  "snapdragon",
  "snapdragor",
  "snopdragon",
  "substitutes",
  "temporal",
  "wv",
]);

function safeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

function scrubScreenshotLikeContent(value) {
  return safeText(value)
    .replace(/data:image\/[a-z0-9.+-]+;base64,[a-z0-9+/=._-]+/gi, "[image data removed]")
    .replace(/\bbase64\b/gi, "[encoded data removed]");
}

function getFileExtension(name = "") {
  const match = String(name).toLowerCase().match(/\.[a-z0-9]+$/);
  return match ? match[0] : "";
}

export function validateFantasyScreenshotFile(file, config = FANTASY_SCREENSHOT_IMPORT_CONFIG) {
  const errors = [];
  if (!file) errors.push("Select a screenshot image.");
  if (file && !config.acceptedMimeTypes.includes(file.type)) {
    errors.push("Use a PNG, JPEG or WebP screenshot.");
  }
  if (file) {
    const extension = getFileExtension(file.name);
    if (extension && !config.acceptedExtensions.includes(extension)) {
      errors.push("The screenshot file extension is not supported.");
    }
    if (!Number(file.size)) errors.push("The screenshot file is empty.");
    if (Number(file.size) > config.maxFileSizeBytes) errors.push("The screenshot must be 10 MB or smaller.");
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function validateFantasyScreenshotDimensions({ width, height } = {}, config = FANTASY_SCREENSHOT_IMPORT_CONFIG) {
  const numericWidth = Number(width);
  const numericHeight = Number(height);
  const errors = [];
  if (!Number.isFinite(numericWidth) || !Number.isFinite(numericHeight) || numericWidth <= 0 || numericHeight <= 0) {
    errors.push("The screenshot could not be decoded.");
  } else {
    if (numericWidth < config.minWidth || numericHeight < config.minHeight) {
      errors.push("The screenshot is too small to read reliably.");
    }
    if (numericWidth > config.maxWidth || numericHeight > config.maxHeight) {
      errors.push("The screenshot dimensions are too large.");
    }
  }
  return {
    valid: errors.length === 0,
    errors,
  };
}

export function correctFantasyTeamCodeFromOcr(rawCode, teams = []) {
  const raw = safeText(rawCode).toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (!raw) return { rawCode: rawCode || "", normalisedCode: null, status: "unmatched", candidates: [], confidence: 0 };
  const exact = normalisePremierLeagueTeamCode(raw);
  if (exact) return { rawCode: raw, normalisedCode: exact, status: "exact", candidates: [exact], confidence: 1 };

  const validCodes = Array.from(
    new Set([
      ...(teams || []).map((team) => team.code || team.teamCode),
      "ARS", "AVL", "BOU", "BRE", "BHA", "BUR", "CHE", "COV", "CRY", "EVE",
      "FUL", "HUL", "IPS", "LEE", "LEI", "LIV", "MCI", "MUN", "NEW", "NFO",
      "SOU", "SUN", "TOT", "WHU", "WOL",
    ].map(normalisePremierLeagueTeamCode).filter(Boolean))
  );
  const substituted = raw
    .split("")
    .map((char) => OCR_CODE_CORRECTIONS[char] || char)
    .join("");
  const substitutedExact = normalisePremierLeagueTeamCode(substituted);
  if (substitutedExact) {
    return { rawCode: raw, normalisedCode: substitutedExact, status: "corrected", candidates: [substitutedExact], confidence: 0.86 };
  }
  const candidates = validCodes.filter((code) => {
    if (Math.abs(code.length - raw.length) > 1) return false;
    let mismatches = 0;
    for (let index = 0; index < Math.min(code.length, raw.length); index += 1) {
      if (code[index] !== raw[index]) mismatches += 1;
    }
    return mismatches <= 1;
  });
  if (candidates.length === 1) {
    return { rawCode: raw, normalisedCode: candidates[0], status: "corrected", candidates, confidence: 0.72 };
  }
  return { rawCode: raw, normalisedCode: null, status: candidates.length ? "ambiguous" : "unmatched", candidates, confidence: 0 };
}

export function normaliseOcrBlocks(rawResult = {}) {
  const normaliseWord = (word, index) => {
    const bbox = word.bbox || {};
    const x0 = Number(bbox.x0 ?? bbox.left ?? word.left ?? 0);
    const y0 = Number(bbox.y0 ?? bbox.top ?? word.top ?? 0);
    const x1 = Number(bbox.x1 ?? x0 + Number(bbox.width || 0));
    const y1 = Number(bbox.y1 ?? y0 + Number(bbox.height || 0));
    return {
      text: safeText(word.text),
      confidence: Math.max(0, Math.min(1, Number(word.confidence ?? 0) / 100)),
      boundingBox: {
        x: x0,
        y: y0,
        width: Math.max(0, x1 - x0),
        height: Math.max(0, y1 - y0),
      },
      lineIndex: Number(word.lineIndex ?? word.line?.baseline?.y0 ?? 0),
      wordIndex: index,
    };
  };

  const groupWordsIntoNearbyTextBlocks = (words = []) => {
    const normalisedWords = words.map(normaliseWord).filter((word) => word.text);
    if (!normalisedWords.length) return [];
    const positionedWords = normalisedWords.filter((word) => word.boundingBox.width || word.boundingBox.height || word.boundingBox.x || word.boundingBox.y);
    if (positionedWords.length < 2) return normalisedWords;
    const averageHeight = positionedWords.reduce((sum, word) => sum + Math.max(1, Number(word.boundingBox.height || 0)), 0) / positionedWords.length;
    const rowTolerance = Math.max(10, averageHeight * 0.75);
    const rows = [];
    positionedWords
      .slice()
      .sort((a, b) => (a.boundingBox.y + a.boundingBox.height / 2) - (b.boundingBox.y + b.boundingBox.height / 2) || a.boundingBox.x - b.boundingBox.x)
      .forEach((word) => {
        const centerY = word.boundingBox.y + word.boundingBox.height / 2;
        const row = rows.find((item) => Math.abs(item.centerY - centerY) <= rowTolerance);
        if (row) {
          row.words.push(word);
          row.centerY = row.words.reduce((sum, item) => sum + item.boundingBox.y + item.boundingBox.height / 2, 0) / row.words.length;
        } else {
          rows.push({ centerY, words: [word] });
        }
      });

    return rows.flatMap((row, rowIndex) => {
      const sorted = row.words.slice().sort((a, b) => a.boundingBox.x - b.boundingBox.x);
      const groups = [];
      let current = [];
      sorted.forEach((word) => {
        const previous = current[current.length - 1];
        const gap = previous ? word.boundingBox.x - (previous.boundingBox.x + previous.boundingBox.width) : 0;
        const joinGap = Math.max(12, Math.min(38, averageHeight * 1.45));
        if (previous && gap > joinGap) {
          groups.push(current);
          current = [word];
          return;
        }
        current.push(word);
      });
      if (current.length) groups.push(current);
      return groups.map((group, groupIndex) => {
        const x0 = Math.min(...group.map((word) => word.boundingBox.x));
        const y0 = Math.min(...group.map((word) => word.boundingBox.y));
        const x1 = Math.max(...group.map((word) => word.boundingBox.x + word.boundingBox.width));
        const y1 = Math.max(...group.map((word) => word.boundingBox.y + word.boundingBox.height));
        return {
          text: group.map((word) => word.text).join(" "),
          confidence: group.reduce((sum, word) => sum + word.confidence, 0) / group.length,
          boundingBox: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 },
          lineIndex: rowIndex,
          wordIndex: groupIndex,
        };
      });
    });
  };

  const structuredBlocks = rawResult?.data?.blocks || rawResult?.blocks || [];
  if (Array.isArray(structuredBlocks) && structuredBlocks.length) {
    const lines = [];
    structuredBlocks.forEach((block) => {
      (block.paragraphs || block.lines ? [block] : []).forEach((blockLike) => {
        const paragraphs = blockLike.paragraphs || [blockLike];
        paragraphs.forEach((paragraph) => {
          (paragraph.lines || []).forEach((line) => lines.push(line));
        });
      });
    });
    if (lines.length) {
      const lineBlocks = lines.map((line, index) => {
        const words = line.words || [];
        const text = safeText(line.text || words.map((word) => word.text).join(" "));
        const bbox = line.bbox || words.reduce((box, word) => {
          const wordBox = word.bbox || {};
          const x0 = Number(wordBox.x0 ?? wordBox.left ?? word.left ?? 0);
          const y0 = Number(wordBox.y0 ?? wordBox.top ?? word.top ?? 0);
          const x1 = Number(wordBox.x1 ?? x0 + Number(wordBox.width || 0));
          const y1 = Number(wordBox.y1 ?? y0 + Number(wordBox.height || 0));
          return {
            x0: Math.min(box.x0, x0),
            y0: Math.min(box.y0, y0),
            x1: Math.max(box.x1, x1),
            y1: Math.max(box.y1, y1),
          };
        }, { x0: Infinity, y0: Infinity, x1: 0, y1: 0 });
        const x0 = Number.isFinite(Number(bbox.x0)) ? Number(bbox.x0) : 0;
        const y0 = Number.isFinite(Number(bbox.y0)) ? Number(bbox.y0) : 0;
        const x1 = Number.isFinite(Number(bbox.x1)) ? Number(bbox.x1) : x0;
        const y1 = Number.isFinite(Number(bbox.y1)) ? Number(bbox.y1) : y0;
        return {
          text,
          confidence: Math.max(0, Math.min(1, Number(line.confidence ?? 50) / 100)),
          boundingBox: {
            x: x0,
            y: y0,
            width: Math.max(0, x1 - x0),
            height: Math.max(0, y1 - y0),
          },
          lineIndex: index,
          wordIndex: 0,
        };
      }).filter((line) => line.text);
      const wordBlocks = groupWordsIntoNearbyTextBlocks(rawResult?.data?.words || rawResult?.words || []);
      return wordBlocks.length >= lineBlocks.length + 3 ? wordBlocks : lineBlocks;
    }
  }

  const words = rawResult?.data?.words || rawResult?.words || [];
  if (Array.isArray(words) && words.length) {
    return groupWordsIntoNearbyTextBlocks(words);
  }

  const text = safeText(rawResult?.data?.text || rawResult?.text);
  return text
    ? text.split(/\n+/).map((line, index) => ({
        text: safeText(line),
        confidence: 0.5,
        boundingBox: { x: 0, y: index * 20, width: 0, height: 0 },
        lineIndex: index,
        wordIndex: 0,
      }))
    : [];
}

export function scoreFantasyScreenshotOcrQuality({ blocks = [], candidates = [], review = null } = {}) {
  const recognisedTeamCodes = new Set((candidates || []).map((candidate) => candidate.rawTeamCode).filter(Boolean));
  const matchedPlayers = review?.extractedSlots?.filter((slot) => slot.selectedPlayerId && ["matched", "likely"].includes(slot.status)).length || 0;
  const likelyCandidates = review?.extractedSlots?.filter((slot) => ["matched", "likely", "ambiguous"].includes(slot.status)).length || candidates.length;
  const averageOcrConfidence = blocks.length
    ? blocks.reduce((sum, block) => sum + Math.max(0, Math.min(1, Number(block.confidence) || 0)), 0) / blocks.length
    : 0;
  const thresholds = FANTASY_SCREENSHOT_IMPORT_CONFIG.qualityThresholds;
  const score = Math.round(
    Math.min(100,
      Math.min(15, likelyCandidates) * 3 +
        matchedPlayers * 4 +
        averageOcrConfidence * 15
    )
  );
  const needsFallback =
    score < thresholds.minimumScoreForSinglePass ||
    candidates.length < thresholds.minimumCandidates ||
    matchedPlayers < thresholds.minimumMatchedPlayers;
  return {
    score,
    needsFallback,
    recognisedTeamCodeCount: recognisedTeamCodes.size,
    candidateCount: candidates.length,
    likelyCandidateCount: likelyCandidates,
    matchedPlayerCount: matchedPlayers,
    averageOcrConfidence: Number(averageOcrConfidence.toFixed(3)),
    reasons: [
      candidates.length < thresholds.minimumCandidates ? "Few player candidates detected." : "",
      matchedPlayers < thresholds.minimumMatchedPlayers ? "Few players matched confidently." : "",
    ].filter(Boolean),
  };
}

function inferPositionFromText(text = "") {
  const normalised = safeText(text).toLowerCase();
  for (const [position, words] of Object.entries(POSITION_WORDS)) {
    if (words.some((word) => new RegExp(`(^|\\s)${word}(\\s|$)`, "i").test(normalised))) return position;
  }
  return "";
}

function inferRoleFromBlock(block, imageHeight = 0) {
  const text = safeText(block.text).toLowerCase();
  if (/\b(bench|sub|subs|substitutes)\b/.test(text)) return "bench";
  if (/\b(start|starting|xi)\b/.test(text)) return "starter";
  const y = Number(block.boundingBox?.y || 0);
  if (imageHeight && y > imageHeight * 0.74) return "bench";
  if (imageHeight && y < imageHeight * 0.74) return "starter";
  return "unknown";
}

function detectCaptainMarker(text = "") {
  const cleaned = safeText(text).toUpperCase();
  if (/\b(VC|V\/C|VICE)\b/.test(cleaned)) return { captain: false, viceCaptain: true };
  if (/\b(C|CAP|CAPTAIN)\b/.test(cleaned)) return { captain: true, viceCaptain: false };
  return { captain: false, viceCaptain: false };
}

function stripNonNameTokens(tokens = [], { keepTeamCodeLikeTokens = false } = {}) {
  return tokens.filter((token) => {
    const normalisedToken = normaliseFantasyPlayerName(token);
    if (SCREENSHOT_NON_PLAYER_WORDS.has(normalisedToken)) return false;
    if (/^\d+\s*[\W_]*(GK|GKP|DEF|MID|FWD|FOR)$/i.test(token)) return false;
    if (!keepTeamCodeLikeTokens) {
      const code = correctFantasyTeamCodeFromOcr(token);
      if (code.normalisedCode) return false;
    }
    if (inferPositionFromText(token)) return false;
    if (/^(C|VC|CAP|VICE|BENCH|SUB|START|XI)$/i.test(token)) return false;
    return /[a-zA-Z]/.test(token);
  });
}

function getAbsoluteLayoutBox(box = {}, width = 0, height = 0) {
  return {
    x: Math.round(Number(box.x || 0) * width),
    y: Math.round(Number(box.y || 0) * height),
    width: Math.round(Number(box.width || 0) * width),
    height: Math.round(Number(box.height || 0) * height),
  };
}

function getFantasyScreenshotNameLayoutSlots(width = 0, height = 0) {
  const numericWidth = Number(width || 0);
  const numericHeight = Number(height || 0);
  if (!numericWidth || !numericHeight) return [];
  return FPL_PITCH_SCREENSHOT_EXPANDED_NAME_LAYOUT.map((slot) => ({
    ...slot,
    boundingBox: getAbsoluteLayoutBox(slot.box, numericWidth, numericHeight),
  }));
}

export function getFantasyScreenshotFormationLayoutSlots(formationLabel = "3-4-3", width = 0, height = 0) {
  const numericWidth = Number(width || 0);
  const numericHeight = Number(height || 0);
  const starterLayout = FPL_PITCH_SCREENSHOT_FORMATION_NAME_LAYOUTS[formationLabel] || FPL_PITCH_SCREENSHOT_FORMATION_NAME_LAYOUTS["3-4-3"];
  const benchLayout = FPL_PITCH_SCREENSHOT_FORMATION_BENCH_LAYOUTS[formationLabel] || FPL_PITCH_SCREENSHOT_FORMATION_BENCH_LAYOUTS["3-4-3"];
  if (!numericWidth || !numericHeight) return [];
  return [
    ...starterLayout,
    ...benchLayout,
  ].map((slot) => ({
    ...slot,
    formation: formationLabel,
    boundingBox: getAbsoluteLayoutBox(slot.box, numericWidth, numericHeight),
  }));
}

function getDetectedStarterRowCounts(layoutSlots = []) {
  return ["DEF", "MID", "FWD"].reduce((out, position) => {
    const detectedCount = layoutSlots.filter((slot) =>
      slot.role === "starter" &&
      slot.position === position &&
      slot.detectedLabel
    ).length;
    out[position] = detectedCount;
    return out;
  }, {});
}

export function inferFantasyScreenshotFormationFromLayoutSlots(layoutSlots = []) {
  const counts = getDetectedStarterRowCounts(layoutSlots);
  const detectedOutfieldCount = counts.DEF + counts.MID + counts.FWD;
  if (detectedOutfieldCount < 8) return null;
  return FPL_PITCH_SCREENSHOT_FORMATIONS
    .map((formation) => {
      const distance = Math.abs(formation.counts.DEF - counts.DEF) +
        Math.abs(formation.counts.MID - counts.MID) +
        Math.abs(formation.counts.FWD - counts.FWD);
      const rightEdgeBonus = ["DEF", "MID", "FWD"].reduce((sum, position) => {
        const requiredCount = formation.counts[position];
        const rightMostSlot = FPL_PITCH_SCREENSHOT_FORMATION_NAME_LAYOUTS[formation.label]
          ?.filter((slot) => slot.position === position)
          ?.sort((a, b) => b.box.x - a.box.x)[0];
        const detectedRightMost = layoutSlots.some((slot) =>
          slot.detectedLabel &&
          slot.position === position &&
          Math.abs(Number(slot.box?.x || 0) - Number(rightMostSlot?.box?.x || 0)) < 0.025 &&
          requiredCount >= 4
        );
        return sum + (detectedRightMost ? 0.25 : 0);
      }, 0);
      return { label: formation.label, distance: distance - rightEdgeBonus };
    })
    .sort((a, b) => a.distance - b.distance || a.label.localeCompare(b.label))[0]?.label || null;
}

function getBestFantasyScreenshotLayoutSlots(layoutSlots = [], width = 0, height = 0) {
  const inferredFormation = inferFantasyScreenshotFormationFromLayoutSlots(layoutSlots);
  if (!inferredFormation) return getFantasyScreenshotFormationLayoutSlots("3-4-3", width, height);
  const byId = new Map((layoutSlots || []).map((slot) => [slot.id, slot]));
  return getFantasyScreenshotFormationLayoutSlots(inferredFormation, width, height).map((slot) => ({
    ...slot,
    detectedLabel: byId.get(slot.id)?.detectedLabel || false,
    boundingBox: byId.get(slot.id)?.detectedLabel ? byId.get(slot.id).boundingBox : slot.boundingBox,
  }));
}

function getAverageBrightPixelRatio(context, box = {}, rowY = 0, rowHeight = 2) {
  const canvas = context.canvas || {};
  const x = Math.max(0, Math.round(Number(box.x || 0)));
  const y = Math.max(0, Math.round(rowY));
  const width = Math.max(1, Math.min(Math.round(Number(box.width || 0)), Number(canvas.width || x + 1) - x));
  const height = Math.max(1, Math.min(Math.round(rowHeight), Number(canvas.height || y + 1) - y));
  const imageData = context.getImageData(x, y, width, height);
  const data = imageData.data;
  let bright = 0;
  const total = Math.max(1, data.length / 4);
  for (let index = 0; index < data.length; index += 4) {
    const red = data[index];
    const green = data[index + 1];
    const blue = data[index + 2];
    if (red >= 215 && green >= 215 && blue >= 215) bright += 1;
  }
  return bright / total;
}

function detectWhiteNameLabelBox(context, searchBox = {}) {
  const rowStep = Math.max(2, Math.round(Number(searchBox.height || 0) / 42));
  const minimumRunHeight = Math.max(8, Math.round(Number(searchBox.height || 0) * 0.14));
  const runs = [];
  let current = null;
  const startY = Math.max(0, Math.round(Number(searchBox.y || 0)));
  const endY = Math.max(startY, Math.round(Number(searchBox.y || 0) + Number(searchBox.height || 0)));
  for (let y = startY; y <= endY; y += rowStep) {
    const ratio = getAverageBrightPixelRatio(context, searchBox, y, rowStep);
    if (ratio >= 0.42) {
      if (!current) current = { y0: y, y1: y + rowStep, peak: ratio };
      current.y1 = y + rowStep;
      current.peak = Math.max(current.peak, ratio);
    } else if (current) {
      if (current.y1 - current.y0 >= minimumRunHeight) runs.push(current);
      current = null;
    }
  }
  if (current && current.y1 - current.y0 >= minimumRunHeight) runs.push(current);
  const bestRun = runs
    .filter((run) => run.peak >= 0.55 || run.y1 - run.y0 >= minimumRunHeight * 1.5)
    .sort((a, b) => (b.y1 - b.y0) - (a.y1 - a.y0) || b.peak - a.peak)[0];
  if (!bestRun) return null;
  const labelHeight = Math.max(10, bestRun.y1 - bestRun.y0);
  const nameTop = bestRun.y0 + Math.round(labelHeight * 0.03);
  const nameHeight = Math.max(12, Math.round(labelHeight * 0.48));
  const insetX = Math.max(4, Math.round(Number(searchBox.width || 0) * 0.08));
  return {
    x: Math.max(0, Math.round(Number(searchBox.x || 0) + insetX)),
    y: Math.max(0, nameTop),
    width: Math.max(1, Math.round(Number(searchBox.width || 0) - insetX * 2)),
    height: nameHeight,
  };
}

export function detectFantasyScreenshotNameLayoutSlots(canvas, context) {
  if (!canvas || !context) return [];
  return FPL_PITCH_SCREENSHOT_EXPANDED_CARD_SEARCH_LAYOUT.map((slot) => {
    const searchBox = getAbsoluteLayoutBox(slot.box, canvas.width, canvas.height);
    const detectedBox = detectWhiteNameLabelBox(context, searchBox);
    return {
      id: slot.id,
      role: slot.role,
      position: slot.position,
      optional: !!slot.optional,
      boundingBox: detectedBox || getAbsoluteLayoutBox(
        FPL_PITCH_SCREENSHOT_EXPANDED_NAME_LAYOUT.find((item) => item.id === slot.id)?.box || slot.box,
        canvas.width,
        canvas.height
      ),
      detectedLabel: !!detectedBox,
    };
  });
}

function getBlockCenter(block = {}) {
  const box = block.boundingBox || {};
  return {
    x: Number(box.x || 0) + Number(box.width || 0) / 2,
    y: Number(box.y || 0) + Number(box.height || 0) / 2,
  };
}

function getBoxIntersectionArea(a = {}, b = {}) {
  const ax1 = Number(a.x || 0);
  const ay1 = Number(a.y || 0);
  const ax2 = ax1 + Number(a.width || 0);
  const ay2 = ay1 + Number(a.height || 0);
  const bx1 = Number(b.x || 0);
  const by1 = Number(b.y || 0);
  const bx2 = bx1 + Number(b.width || 0);
  const by2 = by1 + Number(b.height || 0);
  const width = Math.max(0, Math.min(ax2, bx2) - Math.max(ax1, bx1));
  const height = Math.max(0, Math.min(ay2, by2) - Math.max(ay1, by1));
  return width * height;
}

function findLayoutSlotForOcrBlock(block = {}, layoutSlots = []) {
  const center = getBlockCenter(block);
  return (layoutSlots || []).find((slot) => {
    const box = slot.boundingBox || {};
    return center.x >= Number(box.x || 0) &&
      center.x <= Number(box.x || 0) + Number(box.width || 0) &&
      center.y >= Number(box.y || 0) &&
      center.y <= Number(box.y || 0) + Number(box.height || 0);
  }) || null;
}

function findLayoutSlotsForOcrBlock(block = {}, layoutSlots = []) {
  const blockBox = block.boundingBox || {};
  const blockArea = Math.max(1, Number(blockBox.width || 0) * Number(blockBox.height || 0));
  const centerSlot = findLayoutSlotForOcrBlock(block, layoutSlots);
  const overlapping = (layoutSlots || [])
    .map((slot) => {
      const area = getBoxIntersectionArea(blockBox, slot.boundingBox || {});
      return { slot, ratio: area / blockArea };
    })
    .filter((item) => item.ratio >= 0.08 || item.slot.id === centerSlot?.id)
    .sort((a, b) => Number(a.slot.boundingBox?.x || 0) - Number(b.slot.boundingBox?.x || 0))
    .map((item) => item.slot);
  return overlapping.length ? overlapping : centerSlot ? [centerSlot] : [];
}

function getLayoutRowSlotsForBlock(block = {}, layoutSlots = []) {
  const center = getBlockCenter(block);
  const centerSlot = findLayoutSlotForOcrBlock(block, layoutSlots);
  const referenceBox = centerSlot?.boundingBox || block.boundingBox || {};
  const referenceY = centerSlot
    ? Number(referenceBox.y || 0) + Number(referenceBox.height || 0) / 2
    : center.y;
  const rowTolerance = Math.max(18, Number(referenceBox.height || 0) * 1.2);
  return (layoutSlots || [])
    .filter((slot) => {
      const box = slot.boundingBox || {};
      const slotCenterY = Number(box.y || 0) + Number(box.height || 0) / 2;
      return Math.abs(slotCenterY - referenceY) <= rowTolerance;
    })
    .sort((a, b) => Number(a.boundingBox?.x || 0) - Number(b.boundingBox?.x || 0));
}

function expandLayoutSlotsForMergedText(block = {}, layoutSlots = [], minimumCount = 1) {
  const directSlots = findLayoutSlotsForOcrBlock(block, layoutSlots);
  if (directSlots.length >= minimumCount) return directSlots;
  const rowSlots = getLayoutRowSlotsForBlock(block, layoutSlots);
  if (rowSlots.length <= directSlots.length) return directSlots;
  const blockX = Number(block.boundingBox?.x || 0);
  const startIndex = Math.max(0, rowSlots.findIndex((slot) => {
    const box = slot.boundingBox || {};
    return Number(box.x || 0) + Number(box.width || 0) >= blockX;
  }));
  const resolvedStart = startIndex < 0 ? 0 : startIndex;
  const expanded = rowSlots.slice(resolvedStart, resolvedStart + minimumCount);
  if (expanded.length >= minimumCount) return expanded;
  return rowSlots.slice(Math.max(0, rowSlots.length - minimumCount));
}

function getPlayerMentionSearchNames(player = {}) {
  return [
    player.webName,
    player.displayName,
    player.name,
  ]
    .map((name) => normaliseFantasyPlayerName(name))
    .filter((name, index, names) => name && name.length >= 4 && names.indexOf(name) === index);
}

function compactEditDistance(left = "", right = "") {
  if (left === right) return 0;
  if (!left) return right.length;
  if (!right) return left.length;
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index);
  const current = Array(right.length + 1).fill(0);
  for (let i = 1; i <= left.length; i += 1) {
    current[0] = i;
    for (let j = 1; j <= right.length; j += 1) {
      const cost = left[i - 1] === right[j - 1] ? 0 : 1;
      current[j] = Math.min(current[j - 1] + 1, previous[j] + 1, previous[j - 1] + cost);
    }
    for (let j = 0; j <= right.length; j += 1) previous[j] = current[j];
  }
  return previous[right.length];
}

function findApproximateCompactNameIndex(text = "", search = "") {
  if (!text || !search || search.length < 5 || text.length < 5) return -1;
  const searchLength = Math.min(search.length, text.length);
  const minLength = Math.max(5, searchLength - 2);
  for (let start = 0; start <= text.length - minLength; start += 1) {
    for (let length = searchLength + 1; length >= minLength; length -= 1) {
      if (start + length > text.length) continue;
      const slice = text.slice(start, start + length);
      const distance = compactEditDistance(slice, search.slice(0, length));
      if (distance <= (length >= 8 ? 2 : 1)) return start;
    }
  }
  return -1;
}

function findPlayerMentionsInLayoutText(text = "", players = [], position = "", { allowLoose = true } = {}) {
  const normalisedText = normaliseFantasyPlayerName(text);
  if (!normalisedText) return [];
  const compactText = normalisedText.replace(/\s+/g, "");
  return (players || [])
    .filter((player) => !position || String(player.position || "").toUpperCase() === position)
    .flatMap((player) => getPlayerMentionSearchNames(player).map((name) => {
      const compactName = name.replace(/\s+/g, "");
      const index = compactText.indexOf(compactName);
      const prefixIndex = compactName.length >= 7
        ? compactText.indexOf(compactName.slice(0, Math.max(6, Math.floor(compactName.length * 0.72))))
        : -1;
      const fuzzyPrefixIndex = allowLoose && compactName.length >= 8
        ? compactText.indexOf(compactName.slice(0, Math.max(5, Math.floor(compactName.length * 0.58))))
        : -1;
      const approximateIndex = allowLoose && index < 0 && prefixIndex < 0 && fuzzyPrefixIndex < 0
        ? findApproximateCompactNameIndex(compactText, compactName)
        : -1;
      const matchIndex = index >= 0 ? index : prefixIndex >= 0 ? prefixIndex : fuzzyPrefixIndex >= 0 ? fuzzyPrefixIndex : approximateIndex;
      if (matchIndex < 0) return null;
      const confidence = index >= 0 ? 0.96 : prefixIndex >= 0 ? 0.86 : fuzzyPrefixIndex >= 0 ? 0.76 : 0.72;
      return { player, index: matchIndex, confidence };
    }))
    .filter(Boolean)
    .sort((a, b) => a.index - b.index || b.confidence - a.confidence);
}

function createLayoutCandidate({ rawName, slot, block, confidence = 0.62, issue = "" } = {}) {
  const cleanedName = safeText(rawName);
  if (!cleanedName) return null;
  return {
    rawName: cleanedName,
    rawTeamCode: "",
    rawPosition: slot?.position || "",
    rawSquadRole: slot?.role || "unknown",
    rawCaptainMarker: "",
    rawViceCaptainMarker: "",
    sourceRegion: {
      id: slot?.id || block?.sourceRegion?.id || "",
      boundingBox: slot?.boundingBox || block?.boundingBox || null,
      textPreview: safeText(block?.text).slice(0, 80),
    },
    extractionConfidence: Math.max(0, Math.min(1, Number(confidence) || 0.5)),
    issues: issue ? [issue] : [],
  };
}

function createLayoutCandidatesFromOcrBlocks(ocrBlocks = [], layoutSlots = [], players = []) {
  const candidatesBySlotId = new Map();
  (ocrBlocks || []).forEach((block) => {
    const text = safeText(block.text);
    if (!text) return;
    const tokens = stripNonNameTokens(text.split(/\s+/).filter(Boolean), { keepTeamCodeLikeTokens: true });
    const cleanedText = tokens.join(" ");
    if (/^[A-Z]{2,3}\s*\([HA]\)$/i.test(cleanedText) || /^[HA]$/i.test(cleanedText)) return;
    if (!isLikelyFantasyScreenshotPlayerName(cleanedText, { hasPosition: true })) return;

    const strictSlotOcr = !!block.strictSlotOcr;
    const mentions = findPlayerMentionsInLayoutText(cleanedText, players, "", { allowLoose: !strictSlotOcr });
    const slots = expandLayoutSlotsForMergedText(block, layoutSlots, Math.max(1, mentions.length));
    if (!slots.length || !mentions.length) return;
    const orderedSlots = slots.slice().sort((a, b) => Number(a.boundingBox?.x || 0) - Number(b.boundingBox?.x || 0));
    const positionMentionsBySlot = orderedSlots.map((slot) =>
      findPlayerMentionsInLayoutText(cleanedText, players, slot.position, { allowLoose: !strictSlotOcr })
    );
    orderedSlots.forEach((slot, slotIndex) => {
      const slotMentions = positionMentionsBySlot[slotIndex];
      const orderedMention = slots.length > 1 ? mentions[slotIndex] : null;
      const mention = orderedMention && (!slot.position || orderedMention.player.position === slot.position)
        ? orderedMention
        : slotMentions[slotIndex] || slotMentions[0] || null;
      const candidate = mention
        ? createLayoutCandidate({
            rawName: mention.player.webName || mention.player.displayName || mention.player.name,
            slot,
            block,
            confidence: Math.max(Number(block.confidence || 0.6), mention.confidence),
            issue: mentions.length > 1 ? "Player name split from a merged OCR label row." : "",
          })
        : null;
      if (!candidate) return;
      const existing = candidatesBySlotId.get(slot.id);
      if (!existing || Number(candidate.extractionConfidence || 0) > Number(existing.extractionConfidence || 0)) {
        candidatesBySlotId.set(slot.id, candidate);
      }
    });
  });
  return layoutSlots
    .map((slot) => candidatesBySlotId.get(slot.id))
    .filter(Boolean);
}

function isLikelyFantasyScreenshotPlayerName(rawName = "", { hasTeamCode = false, hasPosition = false } = {}) {
  const normalised = normaliseFantasyPlayerName(rawName);
  if (!normalised || normalised.length < 2) return false;
  const tokens = normalised.split(/\s+/).filter(Boolean);
  if (!tokens.length) return false;
  if (tokens.some((token) => SCREENSHOT_NON_PLAYER_WORDS.has(token))) return false;
  if (/\b\d+\s*(gk|gkp|def|mid|fwd|for)\b/i.test(normalised)) return false;
  if (!hasTeamCode && !hasPosition) {
    const repeatedLetterTokens = tokens.filter((token) => /^([a-z])\1{1,}$/.test(token));
    if (tokens.length >= 2 && repeatedLetterTokens.length >= Math.ceil(tokens.length / 2)) return false;
    if (tokens.length >= 3 && tokens.filter((token) => token.length <= 2).length >= tokens.length - 1) return false;
  }
  return true;
}

export function parseFantasyScreenshotCandidates(ocrBlocks = [], options = {}) {
  const imageHeight = Number(options.imageHeight || 0);
  const layoutSlots = options.layoutSlots || [];
  if (layoutSlots.length) {
    return createLayoutCandidatesFromOcrBlocks(ocrBlocks, layoutSlots, options.players || []);
  }
  return (ocrBlocks || [])
    .map((block, index) => {
      const text = safeText(block.text);
      if (!text) return null;
      const layoutSlot = findLayoutSlotForOcrBlock(block, layoutSlots);
      if (layoutSlots.length && !layoutSlot) return null;
      const tokens = text.split(/\s+/).filter(Boolean);
      const teamCodeResult = layoutSlot ? null : tokens
        .map((token) => correctFantasyTeamCodeFromOcr(token, options.teams || []))
        .find((result) => result.normalisedCode);
      const rawPosition = layoutSlot?.position || inferPositionFromText(text);
      const role = layoutSlot?.role || inferRoleFromBlock(block, imageHeight);
      const marker = detectCaptainMarker(text);
      const name = stripNonNameTokens(tokens, { keepTeamCodeLikeTokens: !!layoutSlot }).join(" ");
      if (!isLikelyFantasyScreenshotPlayerName(name, {
        hasTeamCode: !!teamCodeResult?.normalisedCode,
        hasPosition: !!rawPosition,
      })) return null;
      return {
        rawName: name,
        rawTeamCode: teamCodeResult?.normalisedCode || "",
        rawPosition,
        rawSquadRole: role,
        rawCaptainMarker: marker.captain ? "C" : "",
        rawViceCaptainMarker: marker.viceCaptain ? "VC" : "",
        sourceRegion: {
          id: layoutSlot?.id || `ocr-line-${index}`,
          boundingBox: layoutSlot?.boundingBox || block.boundingBox || null,
          textPreview: text.slice(0, 80),
        },
        extractionConfidence: Number.isFinite(Number(block.confidence)) ? Number(block.confidence) : 0.5,
      };
    })
    .filter(Boolean);
}

function getReviewSlotQuality(slot = {}) {
  const statusWeight =
    slot.status === "matched"
      ? 4
      : slot.status === "likely"
      ? 3
      : slot.status === "ambiguous"
      ? 2
      : 0;
  return statusWeight * 100 + Number(slot.combinedConfidence || 0);
}

function getReviewSlotY(slot = {}) {
  return Number(slot.extracted?.sourceRegion?.boundingBox?.y ?? 0);
}

function sortReviewSlotsByPosition(a = {}, b = {}) {
  const ay = getReviewSlotY(a);
  const by = getReviewSlotY(b);
  if (ay !== by) return ay - by;
  return String(a.id).localeCompare(String(b.id));
}

const FANTASY_SCREENSHOT_NOISE_WORDS = new Set([
  "addiction",
  "american",
  "analyse",
  "aybeiter",
  "bench",
  "better",
  "captain",
  "club",
  "clubs",
  "confirm",
  "confirmed",
  "difficulty",
  "emirates",
  "express",
  "fantasy",
  "fixture",
  "fiybetter",
  "gameweek",
  "gw",
  "help",
  "hybeer",
  "import",
  "league",
  "matched",
  "matches",
  "mock",
  "not",
  "ohnoosed",
  "opponent",
  "pitch",
  "pod",
  "points",
  "possible",
  "prediction",
  "predictions",
  "review",
  "save",
  "score",
  "select",
  "selected",
  "eensse",
  "seee",
  "seeesee",
  "snapdragon",
  "snapdragor",
  "snopdragon",
  "squad",
  "starter",
  "starters",
  "subs",
  "substitutes",
  "tap",
  "team",
  "temporal",
  "to",
  "total",
  "vice",
  "wv",
]);

function isCrowdedOcrNoiseSlot(slot = {}) {
  if (slot.selectedPlayerId || slot.status === "ambiguous") return false;
  if ((slot.matchResult?.candidates || []).length) return false;
  const extracted = slot.extracted || {};
  if (extracted.rawTeamCode || extracted.rawPosition) return false;
  const normalisedName = normaliseFantasyPlayerName(extracted.rawName);
  if (!normalisedName) return true;
  const words = normalisedName.split(/\s+/).filter(Boolean);
  if (words.some((word) => FANTASY_SCREENSHOT_NOISE_WORDS.has(word))) return true;
  if (words.length > 4) return true;
  if (normalisedName.length < 3) return true;
  const rawName = safeText(extracted.rawName);
  const letterCount = (rawName.match(/[a-z]/gi) || []).length;
  const nonLetterCount = (rawName.match(/[^a-z\s'-]/gi) || []).length;
  if (letterCount > 0 && nonLetterCount > letterCount) return true;
  return words.length === 1 && normalisedName.length <= 4 && Number(extracted.extractionConfidence || 0) < 0.72;
}

function filterCrowdedScreenshotNoiseSlots(slots = []) {
  const usefulSlots = slots.filter((slot) =>
    slot.selectedPlayerId ||
    slot.status === "ambiguous" ||
    (slot.matchResult?.candidates || []).length ||
    slot.extracted?.rawTeamCode ||
    slot.extracted?.rawPosition
  );
  const noisyCount = slots.filter(isCrowdedOcrNoiseSlot).length;
  const shouldTrim = slots.length > Math.max(18, usefulSlots.length + 8) && usefulSlots.length >= 4 && noisyCount >= 6;
  if (!shouldTrim) return slots;

  const usefulIds = new Set(usefulSlots.map((slot) => slot.id));
  const retainedUnmatched = slots
    .filter((slot) => !usefulIds.has(slot.id) && !isCrowdedOcrNoiseSlot(slot))
    .sort((a, b) => getReviewSlotQuality(b) - getReviewSlotQuality(a))
    .slice(0, Math.max(0, 15 - usefulSlots.length));

  return [...usefulSlots, ...retainedUnmatched].sort(sortReviewSlotsByPosition);
}

function recoverLikelySingleCandidateSlot(slot = {}) {
  const candidate = slot.matchResult?.candidates?.length === 1 ? slot.matchResult.candidates[0] : null;
  if (!candidate || slot.selectedPlayerId || Number(slot.matchResult?.confidence || 0) < 0.62) return slot;
  return {
    ...slot,
    selectedPlayerId: candidate.id,
    selectedPlayer: candidate,
    status: "likely",
    issues: [...(slot.issues || []).filter((issue) => !/Player match needs review/i.test(issue)), "Recovered from a noisy OCR name. Check this player before importing."],
  };
}

function trimScreenshotNoiseSlots(slots = []) {
  const recovered = filterCrowdedScreenshotNoiseSlots(slots.map(recoverLikelySingleCandidateSlot));
  const selected = recovered.filter((slot) => slot.selectedPlayerId);
  if (selected.length < 15) return recovered;

  const selectedKeys = new Set(selected
    .sort((a, b) => getReviewSlotQuality(b) - getReviewSlotQuality(a))
    .slice(0, 15)
    .map((slot) => slot.id));
  return recovered
    .filter((slot) => selectedKeys.has(slot.id))
    .sort(sortReviewSlotsByPosition);
}

function dedupeSelectedScreenshotPlayers(slots = []) {
  const bestSlotByPlayerKey = new Map();
  const getSelectedPlayerKey = (slot = {}) => {
    const player = slot.selectedPlayer || {};
    return normaliseFantasyPlayerName(player.webName || player.displayName || player.name || slot.selectedPlayerId);
  };
  (slots || []).forEach((slot) => {
    if (!slot.selectedPlayerId) return;
    const key = getSelectedPlayerKey(slot);
    if (!key) return;
    const existing = bestSlotByPlayerKey.get(key);
    if (!existing || getReviewSlotQuality(slot) > getReviewSlotQuality(existing)) {
      bestSlotByPlayerKey.set(key, slot);
    }
  });
  const retainedSlotIds = new Set(Array.from(bestSlotByPlayerKey.values()).map((slot) => slot.id));
  return (slots || []).map((slot) => {
    if (!slot.selectedPlayerId || retainedSlotIds.has(slot.id)) return slot;
    return {
      ...slot,
      selectedPlayerId: null,
      selectedPlayer: null,
      status: "unmatched",
      combinedConfidence: 0,
      issues: [...(slot.issues || []), "Duplicate player detection ignored. Search this slot manually."],
    };
  });
}

function rebalanceScreenshotRoles(slots = []) {
  const selected = slots.filter((slot) => slot.selectedPlayerId);
  if (selected.length !== 11 && selected.length !== 15) return slots;
  const starterCount = selected.filter((slot) => slot.role === "starter").length;
  const benchCount = selected.filter((slot) => slot.role === "bench").length;
  if (selected.length === 11 && starterCount === 11 && benchCount === 0) return slots;
  if (starterCount === 11 && benchCount === 4) return slots;

  let selectedIndex = 0;
  return slots.map((slot) => {
    if (!slot.selectedPlayerId) return slot;
    const nextRole = selected.length === 11 || selectedIndex < 11 ? "starter" : "bench";
    selectedIndex += 1;
    if (slot.role === nextRole) return slot;
    return {
      ...slot,
      role: nextRole,
      issues: [...(slot.issues || []), "Starter/bench role inferred from screenshot order."],
    };
  });
}

function normaliseFantasyScreenshotReviewSlots(slots = []) {
  return rebalanceScreenshotRoles(dedupeSelectedScreenshotPlayers(trimScreenshotNoiseSlots(slots)));
}

function boxesOverlap(a = {}, b = {}) {
  const ax1 = Number(a.x || 0);
  const ay1 = Number(a.y || 0);
  const ax2 = ax1 + Number(a.width || 0);
  const ay2 = ay1 + Number(a.height || 0);
  const bx1 = Number(b.x || 0);
  const by1 = Number(b.y || 0);
  const bx2 = bx1 + Number(b.width || 0);
  const by2 = by1 + Number(b.height || 0);
  return ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1;
}

export function mergeDuplicateFantasyScreenshotCandidates(candidates = []) {
  const merged = [];
  const duplicateIssues = [];
  (candidates || []).forEach((candidate) => {
    const key = [
      normaliseFantasyPlayerName(candidate.rawName),
      candidate.rawTeamCode || "",
      candidate.rawPosition || "",
    ].join("|");
    const existingIndex = merged.findIndex((item) => {
      const itemKey = [
        normaliseFantasyPlayerName(item.rawName),
        item.rawTeamCode || "",
        item.rawPosition || "",
      ].join("|");
      return itemKey === key || boxesOverlap(item.sourceRegion?.boundingBox, candidate.sourceRegion?.boundingBox);
    });
    if (existingIndex < 0) {
      merged.push(candidate);
      return;
    }
    const existing = merged[existingIndex];
    duplicateIssues.push({ kept: existing.rawName, duplicate: candidate.rawName });
    if (Number(candidate.extractionConfidence || 0) > Number(existing.extractionConfidence || 0)) {
      merged[existingIndex] = { ...candidate, issues: [...(candidate.issues || []), "Duplicate OCR candidate replaced a weaker duplicate."] };
    } else {
      merged[existingIndex] = { ...existing, issues: [...(existing.issues || []), "Duplicate OCR candidate ignored."] };
    }
  });
  return { candidates: merged, duplicateIssues };
}

export function buildFantasyScreenshotReview({
  extractedSlots = [],
  players = [],
  teams = [],
  createdAt = new Date().toISOString(),
  imageMetadata = null,
} = {}) {
  const merged = mergeDuplicateFantasyScreenshotCandidates(extractedSlots);
  const rawSlots = merged.candidates.map((extracted, index) => {
    const matchResult = matchFantasyPlayerCandidate({
      rawName: extracted.rawName,
      rawTeamCode: "",
      rawPosition: extracted.rawPosition,
      players,
    });
    const status =
      matchResult.status === "exact"
        ? "matched"
        : matchResult.status === "high-confidence"
        ? "likely"
        : matchResult.status === "ambiguous"
        ? "ambiguous"
        : "unmatched";
    const combinedConfidence = getFantasyScreenshotCombinedConfidence(
      extracted.extractionConfidence,
      matchResult.confidence
    );
    return {
      id: `review-slot-${index}-${normaliseFantasyPlayerName(extracted.rawName).replace(/\s/g, "-")}`,
      extracted,
      matchResult,
      selectedPlayerId: matchResult.player?.id || null,
      selectedPlayer: matchResult.player || null,
      confirmedByUser: false,
      role: ["starter", "bench"].includes(extracted.rawSquadRole) ? extracted.rawSquadRole : "unknown",
      isCaptain: extracted.rawCaptainMarker === "C",
      isViceCaptain: extracted.rawViceCaptainMarker === "VC",
      status,
      combinedConfidence,
      issues: [
        ...(extracted.issues || []),
        ...(status === "ambiguous" ? ["Player match needs review."] : []),
        ...(status === "unmatched" ? ["No player match found."] : []),
      ],
    };
  });
  const slots = normaliseFantasyScreenshotReviewSlots(rawSlots);
  const matchStatusCounts = slots.reduce((out, slot) => {
    out[slot.status] = (out[slot.status] || 0) + 1;
    return out;
  }, {});
  const confidence = calculateFantasyScreenshotImportConfidence(slots);
  return {
    id: `fantasy-screenshot-import:${Date.now()}`,
    source: "screenshot",
    createdAt,
    imageMetadata,
    extractedSlots: slots,
    unresolvedCount: slots.filter((slot) => !slot.selectedPlayerId || ["ambiguous", "unmatched"].includes(slot.status)).length,
    ambiguousCount: matchStatusCounts.ambiguous || 0,
    confirmedCount: slots.filter((slot) => slot.confirmedByUser).length,
    status: slots.length ? "needs-review" : "pending",
    confidence,
    diagnostics: {
      ocrTextBlockCount: extractedSlots.length,
      recognisedTeamCodes: Array.from(new Set(slots.map((slot) => slot.extracted.rawTeamCode).filter(Boolean))),
      rawPlayerCandidateCount: extractedSlots.length,
      duplicateCandidateCount: merged.duplicateIssues.length,
      matchStatusCounts,
      duplicateIssues: merged.duplicateIssues,
    },
  };
}

export function getFantasyScreenshotCombinedConfidence(extractionConfidence = 0, matchConfidence = 0) {
  const extraction = Math.max(0, Math.min(1, Number(extractionConfidence) || 0));
  const match = Math.max(0, Math.min(1, Number(matchConfidence) || 0));
  const weights = FANTASY_SCREENSHOT_IMPORT_CONFIG.confidenceWeights;
  return Math.round((extraction * weights.extraction + match * weights.match) * 100);
}

export function calculateFantasyScreenshotImportConfidence(slots = []) {
  if (!slots.length) return { score: 0, label: "low", reasons: ["No player candidates were detected."] };
  const selectedCount = slots.filter((slot) => slot.selectedPlayerId).length;
  const unresolvedCount = slots.filter((slot) => !slot.selectedPlayerId || ["ambiguous", "unmatched"].includes(slot.status)).length;
  const roleCount = slots.filter((slot) => ["starter", "bench"].includes(slot.role)).length;
  const captainCount = slots.filter((slot) => slot.isCaptain).length;
  const viceCaptainCount = slots.filter((slot) => slot.isViceCaptain).length;
  const averageConfidence = slots.reduce((sum, slot) => sum + Number(slot.combinedConfidence || 0), 0) / slots.length;
  const score = Math.max(
    0,
    Math.min(
      100,
      averageConfidence * 0.45 +
        (selectedCount / 15) * 30 +
        (roleCount / Math.max(1, slots.length)) * 15 +
        (captainCount === 1 ? 5 : 0) +
        (viceCaptainCount === 1 ? 5 : 0) -
        unresolvedCount * 5
    )
  );
  return {
    score: Math.round(score),
    label:
      score >= FANTASY_SCREENSHOT_IMPORT_CONFIG.importConfidence.high
        ? "high"
        : score >= FANTASY_SCREENSHOT_IMPORT_CONFIG.importConfidence.medium
        ? "medium"
        : "low",
    reasons: [
      `${selectedCount} player selections found.`,
      unresolvedCount ? `${unresolvedCount} selections need review.` : "All detected selections are resolved.",
      captainCount !== 1 ? "Captain marker needs confirmation." : "Captain marker detected.",
      viceCaptainCount !== 1 ? "Vice-captain marker needs confirmation." : "Vice-captain marker detected.",
    ],
  };
}

export function updateFantasyScreenshotReviewSlot(review, slotId, patch = {}, players = []) {
  const slots = (review?.extractedSlots || []).map((slot) => {
    if (slot.id !== slotId) return slot;
    const selectedPlayer = patch.selectedPlayerId
      ? players.find((player) => player.id === patch.selectedPlayerId) || slot.selectedPlayer
      : patch.selectedPlayerId === null
      ? null
      : slot.selectedPlayer;
    return {
      ...slot,
      ...patch,
      selectedPlayerId: patch.selectedPlayerId !== undefined ? patch.selectedPlayerId : slot.selectedPlayerId,
      selectedPlayer,
      status: selectedPlayer ? "matched" : patch.status || slot.status,
      confirmedByUser: patch.confirmedByUser ?? (selectedPlayer ? true : slot.confirmedByUser),
      issues: selectedPlayer ? [] : slot.issues,
    };
  });
  return {
    ...review,
    extractedSlots: slots,
    unresolvedCount: slots.filter((slot) => !slot.selectedPlayerId || ["ambiguous", "unmatched"].includes(slot.status)).length,
    ambiguousCount: slots.filter((slot) => slot.status === "ambiguous").length,
    confirmedCount: slots.filter((slot) => slot.confirmedByUser).length,
    confidence: calculateFantasyScreenshotImportConfidence(slots),
  };
}

export function addFantasyScreenshotReviewPlayer(review, player, role = "unknown") {
  if (!player) return review;
  const slot = {
    id: `manual-review-slot-${player.id}-${Date.now()}`,
    extracted: {
      rawName: player.displayName || player.name,
      rawTeamCode: player.teamCode,
      rawPosition: player.position,
      rawSquadRole: role,
      rawCaptainMarker: "",
      rawViceCaptainMarker: "",
      sourceRegion: null,
      extractionConfidence: 1,
    },
    matchResult: { status: "exact", player, candidates: [player], confidence: 1, reasons: ["Added manually during review."] },
    selectedPlayerId: player.id,
    selectedPlayer: player,
    confirmedByUser: true,
    role,
    isCaptain: false,
    isViceCaptain: false,
    status: "matched",
    combinedConfidence: 100,
    issues: [],
  };
  const slots = [...(review?.extractedSlots || []), slot];
  return {
    ...review,
    extractedSlots: slots,
    unresolvedCount: slots.filter((item) => !item.selectedPlayerId).length,
    confirmedCount: slots.filter((item) => item.confirmedByUser).length,
    confidence: calculateFantasyScreenshotImportConfidence(slots),
  };
}

export function removeFantasyScreenshotReviewSlot(review, slotId) {
  const slots = (review?.extractedSlots || []).filter((slot) => slot.id !== slotId);
  return {
    ...review,
    extractedSlots: slots,
    unresolvedCount: slots.filter((slot) => !slot.selectedPlayerId).length,
    ambiguousCount: slots.filter((slot) => slot.status === "ambiguous").length,
    confirmedCount: slots.filter((slot) => slot.confirmedByUser).length,
    confidence: calculateFantasyScreenshotImportConfidence(slots),
  };
}

export function buildFantasyScreenshotReviewDisplaySlots(slots = [], layout = FANTASY_SCREENSHOT_REVIEW_SLOT_LAYOUT) {
  const layoutSlots = (layout || []).map((slot, index) => ({ ...slot, index }));
  const assignedSlotIds = new Set();
  const assignedLayoutIds = new Set();
  const slotByExplicitLayoutId = new Map();

  (slots || []).forEach((slot) => {
    const layoutId = slot?.extracted?.sourceRegion?.id;
    if (!layoutId || slotByExplicitLayoutId.has(layoutId)) return;
    if (!layoutSlots.some((layoutSlot) => layoutSlot.id === layoutId)) return;
    slotByExplicitLayoutId.set(layoutId, slot);
  });

  const items = layoutSlots.map((layoutSlot) => {
    const explicitSlot = slotByExplicitLayoutId.get(layoutSlot.id);
    if (explicitSlot) {
      assignedSlotIds.add(explicitSlot.id);
      assignedLayoutIds.add(layoutSlot.id);
      return { type: "slot", id: explicitSlot.id, slot: explicitSlot, layoutSlot };
    }
    if (layoutSlot.optional) return null;
    return { type: "missing", id: `missing-review-slot-${layoutSlot.id}`, role: layoutSlot.role, position: layoutSlot.position, layoutSlot };
  }).filter(Boolean);

  (slots || []).forEach((slot) => {
    if (!slot?.id || assignedSlotIds.has(slot.id)) return;
    const slotRole = ["starter", "bench"].includes(slot.role) ? slot.role : slot.extracted?.rawSquadRole;
    const slotPosition = slot.selectedPlayer?.position || slot.extracted?.rawPosition;
    const itemIndex = items.findIndex((item) => {
      if (item.type !== "missing" || assignedLayoutIds.has(item.layoutSlot.id)) return false;
      if (slotRole && item.role !== slotRole) return false;
      return !slotPosition || item.position === slotPosition;
    });
    if (itemIndex < 0) {
      items.push({ type: "slot", id: slot.id, slot, layoutSlot: null });
      assignedSlotIds.add(slot.id);
      return;
    }
    assignedLayoutIds.add(items[itemIndex].layoutSlot.id);
    assignedSlotIds.add(slot.id);
    items[itemIndex] = { type: "slot", id: slot.id, slot, layoutSlot: items[itemIndex].layoutSlot };
  });

  const orderedItems = items.slice().sort((a, b) => {
    const aBox = a.layoutSlot?.box || a.slot?.extracted?.sourceRegion?.boundingBox || {};
    const bBox = b.layoutSlot?.box || b.slot?.extracted?.sourceRegion?.boundingBox || {};
    const ay = Number(aBox.y ?? 999);
    const by = Number(bBox.y ?? 999);
    if (ay !== by) return ay - by;
    const ax = Number(aBox.x ?? 999);
    const bx = Number(bBox.x ?? 999);
    if (ax !== bx) return ax - bx;
    return String(a.id).localeCompare(String(b.id));
  });

  const positionCounts = {};
  return orderedItems.map((item) => {
    const position = item.type === "missing" ? item.position : item.layoutSlot?.position || item.slot?.selectedPlayer?.position || item.slot?.extracted?.rawPosition || "";
    if (position) positionCounts[position] = (positionCounts[position] || 0) + 1;
    return {
      ...item,
      position,
      positionNumber: position ? positionCounts[position] : null,
    };
  });
}

function getFantasyScreenshotRecoveryLayoutSlots(review = {}, layoutSlots = []) {
  if (!review || !(layoutSlots || []).length) return [];
  const layoutById = new Map((layoutSlots || []).map((slot) => [slot.id, slot]));
  const recoverySlots = buildFantasyScreenshotReviewDisplaySlots(review.extractedSlots || [], layoutSlots)
    .filter((item) => {
      if (!item.layoutSlot?.id) return false;
      if (item.type === "missing") return true;
      return !item.slot?.selectedPlayerId || ["ambiguous", "unmatched"].includes(item.slot?.status);
    })
    .map((item) => layoutById.get(item.layoutSlot.id))
    .filter((slot) => slot?.boundingBox && Number(slot.boundingBox.width) && Number(slot.boundingBox.height));
  const starterCount = (review.extractedSlots || []).filter((slot) => slot.role === "starter" && slot.selectedPlayerId).length;
  if (starterCount >= 11) return recoverySlots;
  if (starterCount < 8) return recoverySlots;
  const seenLayoutIds = new Set((review.extractedSlots || []).map((slot) => slot.extracted?.sourceRegion?.id).filter(Boolean));
  const recoveryIds = new Set(recoverySlots.map((slot) => slot.id));
  (layoutSlots || [])
    .filter((slot) => slot.optional && slot.role === "starter")
    .filter((slot) => !seenLayoutIds.has(slot.id) && !recoveryIds.has(slot.id))
    .filter((slot) => slot?.boundingBox && Number(slot.boundingBox.width) && Number(slot.boundingBox.height))
    .forEach((slot) => {
      recoveryIds.add(slot.id);
      recoverySlots.push(slot);
    });
  return recoverySlots;
}

async function recoverFantasyScreenshotMissingLayoutSlots({
  attempt,
  imageSource,
  layoutSlots = [],
  players = [],
  teams = [],
  parseHeight = 0,
  onStatus = () => {},
  signal,
  slotOcrRunner = null,
  canUseDefaultSlotOcr = true,
  pageSegMode = "7",
} = {}) {
  const missingLayoutSlots = getFantasyScreenshotRecoveryLayoutSlots(attempt?.review, layoutSlots);
  if (!missingLayoutSlots.length) return attempt;
  if (!slotOcrRunner && !canUseDefaultSlotOcr) return attempt;

  onStatus(`Rechecking ${missingLayoutSlots.length} missing screenshot ${missingLayoutSlots.length === 1 ? "slot" : "slots"}`);
  const recoveryOcr = await (slotOcrRunner || runFantasyScreenshotSlotOcr)(imageSource, missingLayoutSlots, {
    onStatus,
    signal,
    pageSegMode,
  });
  const combinedBlocks = [...(attempt?.ocr?.blocks || []), ...(recoveryOcr.blocks || [])];
  const candidates = parseFantasyScreenshotCandidates(combinedBlocks, {
    players,
    teams,
    imageHeight: parseHeight,
    layoutSlots,
  });
  const review = buildFantasyScreenshotReview({
    extractedSlots: candidates,
    players,
    teams,
    imageMetadata: {
      ...(attempt?.review?.imageMetadata || {}),
      targetedRecoverySlotCount: missingLayoutSlots.length,
      targetedRecoveryTextBlockCount: recoveryOcr.blocks?.length || 0,
      ocrTextBlockCount: combinedBlocks.length,
    },
  });
  const quality = scoreFantasyScreenshotOcrQuality({ blocks: combinedBlocks, candidates, review });
  const recoveredAttempt = {
    ...attempt,
    region: `${attempt.region}+targeted-slots`,
    ocr: {
      ...(attempt?.ocr || {}),
      blocks: combinedBlocks,
      raw: {
        ...(attempt?.ocr?.raw || {}),
        targetedRecovery: recoveryOcr.raw || null,
      },
    },
    candidates,
    review,
    quality,
    targetedRecovery: {
      slotCount: missingLayoutSlots.length,
      textBlockCount: recoveryOcr.blocks?.length || 0,
    },
  };
  return selectBestFantasyScreenshotOcrAttempt([attempt, recoveredAttempt]);
}

export function convertFantasyScreenshotReviewToSquad(review = {}) {
  const slots = review.extractedSlots || [];
  return {
    source: "screenshot",
    formation: null,
    gameweek: null,
    players: slots
      .filter((slot) => slot.selectedPlayer)
      .map((slot) => ({
        id: slot.selectedPlayer.id,
        sourceId: slot.selectedPlayer.sourceId,
        name: slot.selectedPlayer.displayName || slot.selectedPlayer.name,
        displayName: slot.selectedPlayer.displayName || slot.selectedPlayer.name,
        webName: slot.selectedPlayer.webName || "",
        normalisedName: slot.selectedPlayer.normalisedName,
        teamId: slot.selectedPlayer.teamId,
        teamCode: slot.selectedPlayer.teamCode,
        teamName: slot.selectedPlayer.teamName,
        position: slot.selectedPlayer.position,
        positionId: slot.selectedPlayer.positionId,
        price: slot.selectedPlayer.price ?? null,
        priceTenths: slot.selectedPlayer.priceTenths ?? slot.selectedPlayer.externalMetadata?.nowCost ?? null,
        squadRole: ["starter", "bench"].includes(slot.role) ? slot.role : "bench",
        isCaptain: !!slot.isCaptain,
        isViceCaptain: !!slot.isViceCaptain,
        confidence: 1,
        manuallyConfirmed: true,
        active: slot.selectedPlayer.active !== false,
        availabilityStatus: slot.selectedPlayer.availabilityStatus || "unknown",
        externalMetadata: slot.selectedPlayer.externalMetadata || {},
        dataSource: slot.selectedPlayer.dataSource,
        dataUpdatedAt: slot.selectedPlayer.dataUpdatedAt,
        canonicalPlayerId: slot.selectedPlayer.id,
        reconciliationStatus: "matched",
        reconciliationConfidence: 1,
        importSource: "screenshot",
      })),
    captainPlayerId: slots.find((slot) => slot.isCaptain)?.selectedPlayerId || null,
    viceCaptainPlayerId: slots.find((slot) => slot.isViceCaptain)?.selectedPlayerId || null,
    importedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmed: true,
    schemaVersion: 1,
  };
}

export async function decodeFantasyScreenshotImage(file) {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.decoding = "async";
    const loaded = new Promise((resolve, reject) => {
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("The screenshot could not be decoded."));
    });
    image.src = url;
    await loaded;
    return {
      url,
      width: image.naturalWidth,
      height: image.naturalHeight,
      revoke: () => URL.revokeObjectURL(url),
      image,
    };
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
}

function getPreparedScreenshotCanvas(decoded) {
  if (!decoded?.image || typeof document === "undefined") return { source: decoded?.url, variant: "original" };
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.maxCanvasWidth / decoded.width);
  canvas.width = Math.max(1, Math.round(decoded.width * scale));
  canvas.height = Math.max(1, Math.round(decoded.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { source: decoded.url, variant: "original" };
  context.drawImage(decoded.image, 0, 0, canvas.width, canvas.height);
  return { canvas, context };
}

function disposeCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 1;
  canvas.height = 1;
}

function applyGrayscaleContrast(imageData, contrast = FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.contrast) {
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const grey = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const adjusted = Math.max(0, Math.min(255, (grey - 128) * contrast + 128));
    data[index] = adjusted;
    data[index + 1] = adjusted;
    data[index + 2] = adjusted;
  }
  return imageData;
}

function applyThresholdSharpen(imageData, contrast = 1.35) {
  const data = imageData.data;
  for (let index = 0; index < data.length; index += 4) {
    const grey = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const contrasted = Math.max(0, Math.min(255, (grey - 128) * contrast + 128));
    const thresholded = contrasted > 148 ? 255 : contrasted < 96 ? 0 : contrasted;
    data[index] = thresholded;
    data[index + 1] = thresholded;
    data[index + 2] = thresholded;
  }
  return imageData;
}

function applyScreenshotRegionMask(canvas, context, regions = []) {
  const absoluteRegions = (regions || [])
    .map((region) => getAbsoluteLayoutBox(region, canvas.width, canvas.height))
    .filter((region) => region.width > 0 && region.height > 0);
  if (!absoluteRegions.length || typeof document === "undefined") return { canvas, context };

  const maskedCanvas = document.createElement("canvas");
  maskedCanvas.width = canvas.width;
  maskedCanvas.height = canvas.height;
  const maskedContext = maskedCanvas.getContext("2d", { willReadFrequently: true });
  if (!maskedContext) return { canvas, context };

  maskedContext.fillStyle = "#ffffff";
  maskedContext.fillRect(0, 0, maskedCanvas.width, maskedCanvas.height);
  absoluteRegions.forEach((region) => {
    const paddingX = Math.max(2, Math.round(region.width * 0.04));
    const paddingY = Math.max(1, Math.round(region.height * 0.12));
    const sx = Math.max(0, region.x - paddingX);
    const sy = Math.max(0, region.y - paddingY);
    const sw = Math.min(canvas.width - sx, region.width + paddingX * 2);
    const sh = Math.min(canvas.height - sy, region.height + paddingY * 2);
    maskedContext.drawImage(canvas, sx, sy, sw, sh, sx, sy, sw, sh);
  });
  disposeCanvas(canvas);
  return { canvas: maskedCanvas, context: maskedContext };
}

export async function preprocessFantasyScreenshotImage(decoded, variant = FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.primaryVariant, crop = null, maskRegions = [], detectLayout = false) {
  const prepared = getPreparedScreenshotCanvas(decoded);
  if (!prepared?.canvas || !prepared?.context) return { source: decoded?.url, variant: "original", cleanup: () => {} };
  let { canvas, context } = prepared;
  if (crop && typeof document !== "undefined") {
    const cropCanvas = document.createElement("canvas");
    const sx = Math.max(0, Math.round(canvas.width * Number(crop.x || 0)));
    const sy = Math.max(0, Math.round(canvas.height * Number(crop.y || 0)));
    const sw = Math.max(1, Math.min(canvas.width - sx, Math.round(canvas.width * Number(crop.width || 1))));
    const sh = Math.max(1, Math.min(canvas.height - sy, Math.round(canvas.height * Number(crop.height || 1))));
    cropCanvas.width = sw;
    cropCanvas.height = sh;
    const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });
    if (cropContext) {
      cropContext.drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
      disposeCanvas(canvas);
      canvas = cropCanvas;
      context = cropContext;
    }
  }
  if (maskRegions?.length) {
    const masked = applyScreenshotRegionMask(canvas, context, maskRegions);
    canvas = masked.canvas;
    context = masked.context;
  }
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const processed = variant === "threshold-sharpened"
    ? applyThresholdSharpen(imageData)
    : variant === "original-resized"
    ? imageData
    : applyGrayscaleContrast(imageData);
  context.putImageData(processed, 0, 0);
  const layoutSlots = detectLayout ? detectFantasyScreenshotNameLayoutSlots(canvas, context) : [];
  return {
    source: canvas.toDataURL("image/png"),
    variant,
    crop,
    width: canvas.width,
    height: canvas.height,
    layoutSlots,
    cleanup: () => disposeCanvas(canvas),
  };
}

export async function runFantasyScreenshotOcr(imageSource, { onStatus = () => {}, signal, tesseractOptions = {}, pageSegMode = "11" } = {}) {
  onStatus("Loading OCR worker");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    ...getFantasyScreenshotTesseractOptions(tesseractOptions),
    logger: (message) => {
      if (message?.status) onStatus(message.status);
    },
  });
  await worker.setParameters?.({
    tessedit_pageseg_mode: String(pageSegMode || "11"),
    preserve_interword_spaces: "1",
  });
  let terminated = false;
  const terminateWorker = async () => {
    if (terminated) return;
    terminated = true;
    await worker.terminate();
  };
  const abortHandler = () => {
    terminateWorker();
  };
  signal?.addEventListener?.("abort", abortHandler, { once: true });
  if (signal?.aborted) {
    await terminateWorker();
    throw new DOMException("OCR cancelled", "AbortError");
  }
  try {
    onStatus("Reading player names");
    const result = await worker.recognize(imageSource, {}, { text: true, blocks: true });
    if (signal?.aborted) throw new DOMException("OCR cancelled", "AbortError");
    return {
      blocks: normaliseOcrBlocks(result),
      raw: process.env.NODE_ENV === "development"
        ? {
            confidence: result?.data?.confidence ?? null,
            wordCount: result?.data?.words?.length || 0,
            textLength: safeText(result?.data?.text).length,
          }
        : null,
    };
  } finally {
    signal?.removeEventListener?.("abort", abortHandler);
    onStatus("Stopping OCR worker");
    await terminateWorker();
  }
}

export async function runFantasyScreenshotSlotOcr(imageSource, layoutSlots = [], { onStatus = () => {}, signal, tesseractOptions = {}, pageSegMode = "7" } = {}) {
  onStatus("Loading slot OCR worker");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    ...getFantasyScreenshotTesseractOptions(tesseractOptions),
    logger: (message) => {
      if (message?.status) onStatus(message.status);
    },
  });
  await worker.setParameters?.({
    tessedit_pageseg_mode: String(pageSegMode || "7"),
    preserve_interword_spaces: "1",
    tessedit_char_whitelist: "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.'- ",
  });
  let terminated = false;
  const terminateWorker = async () => {
    if (terminated) return;
    terminated = true;
    await worker.terminate();
  };
  const abortHandler = () => {
    terminateWorker();
  };
  signal?.addEventListener?.("abort", abortHandler, { once: true });
  if (signal?.aborted) {
    await terminateWorker();
    throw new DOMException("OCR cancelled", "AbortError");
  }
  try {
    const blocks = [];
    for (let index = 0; index < (layoutSlots || []).length; index += 1) {
      const slot = layoutSlots[index];
      const box = slot.boundingBox || {};
      if (!Number(box.width) || !Number(box.height)) continue;
      if (signal?.aborted) throw new DOMException("OCR cancelled", "AbortError");
      onStatus(`Reading player slot ${index + 1} of ${layoutSlots.length}`);
      const result = await worker.recognize(imageSource, {
        rectangle: {
          left: Math.max(0, Math.round(Number(box.x || 0))),
          top: Math.max(0, Math.round(Number(box.y || 0))),
          width: Math.max(1, Math.round(Number(box.width || 0))),
          height: Math.max(1, Math.round(Number(box.height || 0))),
        },
      }, { text: true, blocks: true });
      const text = safeText(result?.data?.text || normaliseOcrBlocks(result).map((block) => block.text).join(" "));
      if (!text) continue;
      blocks.push({
        text,
        confidence: Math.max(0, Math.min(1, Number(result?.data?.confidence ?? 55) / 100)),
        boundingBox: box,
        strictSlotOcr: true,
        lineIndex: index,
        wordIndex: 0,
      });
    }
    return {
      blocks,
      raw: process.env.NODE_ENV === "development"
        ? {
            slotCount: layoutSlots.length,
            textLength: blocks.reduce((sum, block) => sum + safeText(block.text).length, 0),
          }
        : null,
    };
  } finally {
    signal?.removeEventListener?.("abort", abortHandler);
    onStatus("Stopping slot OCR worker");
    await terminateWorker();
  }
}

export async function runFantasyScreenshotOcrWithFallback(decoded, {
  players = [],
  teams = [],
  imageMetadata = null,
  onStatus = () => {},
  signal,
  ocrRunner = runFantasyScreenshotOcr,
  slotOcrRunner = null,
} = {}) {
  const attemptPlans = [
    {
      variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.primaryVariant,
      region: "fpl-slot-lines",
      pageSegMode: "7",
      layout: "fpl-pitch",
      slotLayout: true,
    },
    {
      variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.primaryVariant,
      region: "fpl-name-labels",
      pageSegMode: "11",
      maskRegions: FPL_PITCH_SCREENSHOT_EXPANDED_NAME_LAYOUT.map((slot) => slot.box),
      layout: "fpl-pitch",
    },
    {
      variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.fallbackVariant,
      region: "fpl-name-labels-threshold",
      pageSegMode: "11",
      maskRegions: FPL_PITCH_SCREENSHOT_EXPANDED_NAME_LAYOUT.map((slot) => slot.box),
      layout: "fpl-pitch",
    },
    { variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.primaryVariant, region: "full", pageSegMode: "11" },
    { variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.fallbackVariant, region: "full", pageSegMode: "11" },
    { variant: "original-resized", region: "full", pageSegMode: "6" },
    { variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.primaryVariant, region: "squad-area", pageSegMode: "11", crop: { x: 0, y: 0.08, width: 1, height: 0.66 } },
    { variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.fallbackVariant, region: "bench-area", pageSegMode: "6", crop: { x: 0, y: 0.58, width: 1, height: 0.42 } },
  ];
  const attempts = [];
  for (let index = 0; index < attemptPlans.length; index += 1) {
    const plan = attemptPlans[index];
    if (plan.slotLayout && ocrRunner !== runFantasyScreenshotOcr && !slotOcrRunner) continue;
    const preprocessed = await preprocessFantasyScreenshotImage(decoded, plan.variant, plan.crop, plan.maskRegions, plan.layout === "fpl-pitch");
    try {
      onStatus(index === 0 ? "Reading player names" : `Trying ${plan.region} image cleanup`);
      const parseWidth = preprocessed.width || imageMetadata?.width || decoded?.width;
      const parseHeight = preprocessed.height || imageMetadata?.height || decoded?.height;
      const rawLayoutSlots = plan.layout === "fpl-pitch"
        ? (preprocessed.layoutSlots?.length ? preprocessed.layoutSlots : getFantasyScreenshotNameLayoutSlots(parseWidth, parseHeight))
        : [];
      const layoutSlots = plan.layout === "fpl-pitch"
        ? getBestFantasyScreenshotLayoutSlots(rawLayoutSlots, parseWidth, parseHeight)
        : [];
      const parseLayoutSlots = plan.slotLayout
        ? layoutSlots
        : layoutSlots.filter((slot) => !slot.optional);
      const ocr = plan.slotLayout
        ? await (slotOcrRunner || runFantasyScreenshotSlotOcr)(preprocessed.source || decoded?.url, layoutSlots, { onStatus, signal, pageSegMode: plan.pageSegMode })
        : await ocrRunner(preprocessed.source || decoded?.url, { onStatus, signal, pageSegMode: plan.pageSegMode });
      const candidates = parseFantasyScreenshotCandidates(ocr.blocks, {
        players,
        teams,
        imageHeight: parseHeight,
        layoutSlots: parseLayoutSlots,
      });
      const review = buildFantasyScreenshotReview({
        extractedSlots: candidates,
        players,
        teams,
        imageMetadata: {
          ...imageMetadata,
          preprocessingVariant: preprocessed.variant,
          ocrRegion: plan.region,
          pageSegMode: plan.pageSegMode,
          screenshotLayout: plan.layout || null,
          ocrTextBlockCount: ocr.blocks.length,
          ocrDebug: ocr.raw,
          inferredFormation: inferFantasyScreenshotFormationFromLayoutSlots(rawLayoutSlots),
        },
      });
      const quality = scoreFantasyScreenshotOcrQuality({ blocks: ocr.blocks, candidates, review });
      let attempt = { variant: preprocessed.variant, region: plan.region, layout: plan.layout || null, ocr, candidates, review, quality };
      if (plan.layout === "fpl-pitch") {
        attempt = await recoverFantasyScreenshotMissingLayoutSlots({
          attempt,
          imageSource: preprocessed.source || decoded?.url,
          layoutSlots: inferFantasyScreenshotFormationFromLayoutSlots(rawLayoutSlots) ? layoutSlots : rawLayoutSlots,
          players,
          teams,
          parseHeight,
          onStatus,
          signal,
          slotOcrRunner,
          canUseDefaultSlotOcr: ocrRunner === runFantasyScreenshotOcr,
          pageSegMode: "7",
        });
      }
      attempts.push(attempt);
      if (plan.slotLayout && (attempt.quality?.matchedPlayerCount || 0) >= 11) return attempt;
      const layoutAttemptCount = attempts.filter((attemptItem) => attemptItem.layout === "fpl-pitch").length;
      if (layoutAttemptCount >= 2) {
        const bestLayout = selectBestFantasyScreenshotOcrAttempt(attempts);
        if ((bestLayout?.quality?.matchedPlayerCount || 0) >= 11) return bestLayout;
      }
      if (!quality.needsFallback && quality.matchedPlayerCount >= 11) {
        return selectBestFantasyScreenshotOcrAttempt(attempts);
      }
    } finally {
      preprocessed.cleanup?.();
    }
  }
  return selectBestFantasyScreenshotOcrAttempt(attempts);
}

export function selectBestFantasyScreenshotOcrAttempt(attempts = []) {
  const sortAttempts = (items = []) => [...items].sort((a, b) => {
    const aMatched = a.quality?.matchedPlayerCount || 0;
    const bMatched = b.quality?.matchedPlayerCount || 0;
    if (bMatched !== aMatched) return bMatched - aMatched;
    const aUnmatched = a.review?.extractedSlots?.filter((slot) => !slot.selectedPlayerId).length || 0;
    const bUnmatched = b.review?.extractedSlots?.filter((slot) => !slot.selectedPlayerId).length || 0;
    if (aUnmatched !== bUnmatched) return aUnmatched - bUnmatched;
    const aCandidates = a.quality?.candidateCount || 0;
    const bCandidates = b.quality?.candidateCount || 0;
    if (bCandidates !== aCandidates) return bCandidates - aCandidates;
    return (b.quality?.score || 0) - (a.quality?.score || 0);
  });
  const layoutAttempts = sortAttempts((attempts || []).filter((attempt) => attempt.layout === "fpl-pitch"));
  const bestLayout = layoutAttempts[0] || null;
  if (
    (bestLayout?.quality?.matchedPlayerCount || 0) >= FANTASY_SCREENSHOT_IMPORT_CONFIG.qualityThresholds.minimumMatchedPlayers ||
    (bestLayout?.quality?.candidateCount || 0) >= FANTASY_SCREENSHOT_IMPORT_CONFIG.qualityThresholds.minimumCandidates
  ) {
    return bestLayout;
  }
  return sortAttempts(attempts)[0] || null;
}

export function createFantasyScreenshotImportSummary({
  appVersion = process.env.REACT_APP_VERSION || "local",
  timestamp = new Date().toISOString(),
  imageMetadata = {},
  processingDurationMs = 0,
  review = null,
  manuallyCorrectedCount = 0,
  finalValidSquad = false,
  errorCode = null,
} = {}) {
  const slots = review?.extractedSlots || [];
  return {
    appVersion,
    importVersion: FANTASY_SCREENSHOT_IMPORT_VERSION,
    timestamp,
    imageWidth: Number(imageMetadata?.width || 0),
    imageHeight: Number(imageMetadata?.height || 0),
    processingDurationMs: Math.max(0, Math.round(Number(processingDurationMs) || 0)),
    detectedCandidateCount: slots.length,
    exactMatchCount: slots.filter((slot) => slot.status === "matched").length,
    likelyMatchCount: slots.filter((slot) => slot.status === "likely").length,
    ambiguousCount: slots.filter((slot) => slot.status === "ambiguous").length,
    unmatchedCount: slots.filter((slot) => slot.status === "unmatched").length,
    manuallyCorrectedCount: Math.max(0, Number(manuallyCorrectedCount) || 0),
    finalValidSquad: !!finalValidSquad,
    errorCode: errorCode || null,
  };
}

export function createFantasyScreenshotFeedbackSummary({
  rating = "",
  note = "",
  importSummary = null,
} = {}) {
  return {
    rating: scrubScreenshotLikeContent(rating).slice(0, 80),
    note: scrubScreenshotLikeContent(note).slice(0, 300),
    importSummary: importSummary
      ? {
          importVersion: importSummary.importVersion,
          processingDurationMs: importSummary.processingDurationMs,
          detectedCandidateCount: importSummary.detectedCandidateCount,
          exactMatchCount: importSummary.exactMatchCount,
          likelyMatchCount: importSummary.likelyMatchCount,
          ambiguousCount: importSummary.ambiguousCount,
          unmatchedCount: importSummary.unmatchedCount,
          manuallyCorrectedCount: importSummary.manuallyCorrectedCount,
          finalValidSquad: importSummary.finalValidSquad,
          errorCode: importSummary.errorCode,
        }
      : null,
  };
}
