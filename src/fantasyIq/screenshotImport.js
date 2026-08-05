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
  "emirates",
  "express",
  "hybeer",
  "aybeiter",
  "ohnoosed",
  "seee see",
  "seeesee",
  "snapdragon",
  "snopdragon",
  "substitutes",
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

function stripNonNameTokens(tokens = []) {
  return tokens.filter((token) => {
    const normalisedToken = normaliseFantasyPlayerName(token);
    if (SCREENSHOT_NON_PLAYER_WORDS.has(normalisedToken)) return false;
    if (/^\d+\s*[\W_]*(GK|GKP|DEF|MID|FWD|FOR)$/i.test(token)) return false;
    const code = correctFantasyTeamCodeFromOcr(token);
    if (code.normalisedCode) return false;
    if (inferPositionFromText(token)) return false;
    if (/^(C|VC|CAP|VICE|BENCH|SUB|START|XI)$/i.test(token)) return false;
    return /[a-zA-Z]/.test(token);
  });
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

function normalisedContainsTokenSequence(textTokens = [], searchTokens = []) {
  if (!textTokens.length || !searchTokens.length || searchTokens.length > textTokens.length) return false;
  for (let index = 0; index <= textTokens.length - searchTokens.length; index += 1) {
    if (searchTokens.every((token, tokenIndex) => textTokens[index + tokenIndex] === token)) return true;
  }
  return false;
}

function getPlayerMentionTokens(player = {}) {
  return [
    normaliseFantasyPlayerName(player.webName),
    normaliseFantasyPlayerName(player.displayName || player.name),
  ]
    .map((name) => name.split(/\s+/).filter(Boolean))
    .filter((tokens) => tokens.length && tokens.join("").length >= 4);
}

function findKnownFantasyPlayerMentions(block = {}, players = [], imageHeight = 0) {
  const normalisedText = normaliseFantasyPlayerName(block.text);
  const textTokens = normalisedText.split(/\s+/).filter(Boolean);
  if (!textTokens.length || !Array.isArray(players) || !players.length) return [];
  const matches = [];
  players.forEach((player) => {
    const mentionTokens = getPlayerMentionTokens(player);
    if (mentionTokens.some((tokens) => normalisedContainsTokenSequence(textTokens, tokens))) {
      matches.push(player);
    }
  });
  return matches.slice(0, 15).map((player, index) => {
    const box = block.boundingBox || {};
    const width = Number(box.width || 0);
    const segmentWidth = matches.length ? width / matches.length : width;
    return {
      rawName: player.webName || player.displayName || player.name,
      rawTeamCode: "",
      rawPosition: player.position || "",
      rawSquadRole: inferRoleFromBlock(block, imageHeight),
      rawCaptainMarker: "",
      rawViceCaptainMarker: "",
      sourceRegion: {
        id: `known-player-${index}`,
        boundingBox: {
          ...box,
          x: Number(box.x || 0) + segmentWidth * index,
          width: segmentWidth || Number(box.width || 0),
        },
        textPreview: safeText(block.text).slice(0, 80),
      },
      extractionConfidence: Math.max(0.45, Math.min(1, Number(block.confidence || 0.6) * 0.92)),
      issues: ["Player name recovered from a combined OCR row."],
    };
  });
}

export function parseFantasyScreenshotCandidates(ocrBlocks = [], options = {}) {
  const imageHeight = Number(options.imageHeight || 0);
  return (ocrBlocks || [])
    .flatMap((block, index) => {
      const text = safeText(block.text);
      if (!text) return [];
      const tokens = text.split(/\s+/).filter(Boolean);
      const teamCodeResult = tokens
        .map((token) => correctFantasyTeamCodeFromOcr(token, options.teams || []))
        .find((result) => result.normalisedCode);
      const rawPosition = inferPositionFromText(text);
      const role = inferRoleFromBlock(block, imageHeight);
      const marker = detectCaptainMarker(text);
      const name = stripNonNameTokens(tokens).join(" ");
      const knownPlayerMentions = findKnownFantasyPlayerMentions(block, options.players || [], imageHeight);
      const baseCandidate = isLikelyFantasyScreenshotPlayerName(name, {
        hasTeamCode: !!teamCodeResult?.normalisedCode,
        hasPosition: !!rawPosition,
      }) ? {
        rawName: name,
        rawTeamCode: teamCodeResult?.normalisedCode || "",
        rawPosition,
        rawSquadRole: role,
        rawCaptainMarker: marker.captain ? "C" : "",
        rawViceCaptainMarker: marker.viceCaptain ? "VC" : "",
        sourceRegion: {
          id: `ocr-line-${index}`,
          boundingBox: block.boundingBox || null,
          textPreview: text.slice(0, 80),
        },
        extractionConfidence: Number.isFinite(Number(block.confidence)) ? Number(block.confidence) : 0.5,
      } : null;
      if (knownPlayerMentions.length > 1) return knownPlayerMentions;
      return [baseCandidate, ...knownPlayerMentions].filter(Boolean);
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
  "points",
  "possible",
  "prediction",
  "predictions",
  "review",
  "save",
  "score",
  "select",
  "selected",
  "seee",
  "seeesee",
  "snapdragon",
  "snopdragon",
  "squad",
  "starter",
  "starters",
  "subs",
  "substitutes",
  "tap",
  "team",
  "to",
  "total",
  "vice",
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
  return rebalanceScreenshotRoles(trimScreenshotNoiseSlots(slots));
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

export async function preprocessFantasyScreenshotImage(decoded, variant = FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.primaryVariant, crop = null) {
  const prepared = getPreparedScreenshotCanvas(decoded);
  if (!prepared?.canvas || !prepared?.context) return { source: decoded?.url, variant: "original", cleanup: () => {} };
  let { canvas, context } = prepared;
  if (crop) {
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
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const processed = variant === "threshold-sharpened"
    ? applyThresholdSharpen(imageData)
    : variant === "original-resized"
    ? imageData
    : applyGrayscaleContrast(imageData);
  context.putImageData(processed, 0, 0);
  return {
    source: canvas.toDataURL("image/png"),
    variant,
    crop,
    width: canvas.width,
    height: canvas.height,
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

export async function runFantasyScreenshotOcrWithFallback(decoded, {
  players = [],
  teams = [],
  imageMetadata = null,
  onStatus = () => {},
  signal,
  ocrRunner = runFantasyScreenshotOcr,
} = {}) {
  const attemptPlans = [
    { variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.primaryVariant, region: "full", pageSegMode: "11" },
    { variant: "original-resized", region: "full", pageSegMode: "6" },
    { variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.primaryVariant, region: "squad-area", pageSegMode: "11", crop: { x: 0, y: 0.12, width: 1, height: 0.62 } },
    { variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.fallbackVariant, region: "bench-area", pageSegMode: "6", crop: { x: 0, y: 0.62, width: 1, height: 0.38 } },
    { variant: FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.fallbackVariant, region: "full", pageSegMode: "11" },
  ];
  const attempts = [];
  const makeCombinedAttempt = () => {
    const combinedCandidates = mergeDuplicateFantasyScreenshotCandidates(
      attempts.flatMap((item) => item.candidates || [])
    ).candidates;
    const combinedReview = buildFantasyScreenshotReview({
      extractedSlots: combinedCandidates,
      players,
      teams,
      imageMetadata: {
        ...imageMetadata,
        preprocessingVariant: "combined",
        ocrTextBlockCount: attempts.reduce((sum, item) => sum + (item.ocr?.blocks?.length || 0), 0),
        ocrDebug: null,
      },
    });
    const combinedQuality = scoreFantasyScreenshotOcrQuality({ blocks: attempts.flatMap((item) => item.ocr?.blocks || []), candidates: combinedCandidates, review: combinedReview });
    return {
      variant: "combined",
      region: "merged",
      ocr: null,
      candidates: combinedCandidates,
      review: combinedReview,
      quality: combinedQuality,
    };
  };

  for (let index = 0; index < attemptPlans.length; index += 1) {
    const plan = attemptPlans[index];
    const preprocessed = await preprocessFantasyScreenshotImage(decoded, plan.variant, plan.crop);
    try {
      onStatus(index === 0 ? "Reading player names" : `Trying ${plan.region} cleanup`);
      const ocr = await ocrRunner(preprocessed.source || decoded?.url, { onStatus, signal, pageSegMode: plan.pageSegMode });
      const candidates = parseFantasyScreenshotCandidates(ocr.blocks, {
        players,
        teams,
        imageHeight: preprocessed.height || imageMetadata?.height || decoded?.height,
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
          ocrTextBlockCount: ocr.blocks.length,
          ocrDebug: ocr.raw,
        },
      });
      const quality = scoreFantasyScreenshotOcrQuality({ blocks: ocr.blocks, candidates, review });
      const attempt = { variant: preprocessed.variant, region: plan.region, ocr, candidates, review, quality };
      attempts.push(attempt);
      const combinedAttempt = makeCombinedAttempt();
      if (combinedAttempt.quality?.matchedPlayerCount >= 15 || (!quality.needsFallback && index >= 1)) {
        return selectBestFantasyScreenshotOcrAttempt([...attempts, combinedAttempt]);
      }
    } finally {
      preprocessed.cleanup?.();
    }
  }
  return selectBestFantasyScreenshotOcrAttempt([...attempts, makeCombinedAttempt()]);
}

export function selectBestFantasyScreenshotOcrAttempt(attempts = []) {
  return [...attempts].sort((a, b) => {
    const aMatched = a.quality?.matchedPlayerCount || 0;
    const bMatched = b.quality?.matchedPlayerCount || 0;
    if (bMatched !== aMatched) return bMatched - aMatched;
    const aCandidates = a.quality?.candidateCount || 0;
    const bCandidates = b.quality?.candidateCount || 0;
    if (bCandidates !== aCandidates) return bCandidates - aCandidates;
    return (b.quality?.score || 0) - (a.quality?.score || 0);
  })[0] || null;
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
