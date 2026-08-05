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

function safeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
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
  const words = rawResult?.data?.words || rawResult?.words || [];
  if (Array.isArray(words) && words.length) {
    return words
      .map((word, index) => {
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
      })
      .filter((word) => word.text);
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
    const code = correctFantasyTeamCodeFromOcr(token);
    if (code.normalisedCode) return false;
    if (inferPositionFromText(token)) return false;
    if (/^(C|VC|CAP|VICE|BENCH|SUB|START|XI)$/i.test(token)) return false;
    return /[a-zA-Z]/.test(token);
  });
}

export function parseFantasyScreenshotCandidates(ocrBlocks = [], options = {}) {
  const imageHeight = Number(options.imageHeight || 0);
  return (ocrBlocks || [])
    .map((block, index) => {
      const text = safeText(block.text);
      if (!text) return null;
      const tokens = text.split(/\s+/).filter(Boolean);
      const teamCodeResult = tokens
        .map((token) => correctFantasyTeamCodeFromOcr(token, options.teams || []))
        .find((result) => result.normalisedCode);
      const rawPosition = inferPositionFromText(text);
      const role = inferRoleFromBlock(block, imageHeight);
      const marker = detectCaptainMarker(text);
      const name = stripNonNameTokens(tokens).join(" ");
      if (!name || normaliseFantasyPlayerName(name).length < 2) return null;
      return {
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
      };
    })
    .filter(Boolean);
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
  const slots = merged.candidates.map((extracted, index) => {
    const matchResult = matchFantasyPlayerCandidate({
      rawName: extracted.rawName,
      rawTeamCode: extracted.rawTeamCode,
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

export async function preprocessFantasyScreenshotImage(decoded) {
  if (!decoded?.image || typeof document === "undefined") return { source: decoded?.url, variant: "original" };
  const canvas = document.createElement("canvas");
  const scale = Math.min(1, FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.maxCanvasWidth / decoded.width);
  canvas.width = Math.max(1, Math.round(decoded.width * scale));
  canvas.height = Math.max(1, Math.round(decoded.height * scale));
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return { source: decoded.url, variant: "original" };
  context.drawImage(decoded.image, 0, 0, canvas.width, canvas.height);
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const contrast = FANTASY_SCREENSHOT_IMPORT_CONFIG.preprocessing.contrast;
  for (let index = 0; index < data.length; index += 4) {
    const grey = data[index] * 0.299 + data[index + 1] * 0.587 + data[index + 2] * 0.114;
    const adjusted = Math.max(0, Math.min(255, (grey - 128) * contrast + 128));
    data[index] = adjusted;
    data[index + 1] = adjusted;
    data[index + 2] = adjusted;
  }
  context.putImageData(imageData, 0, 0);
  return {
    source: canvas.toDataURL("image/png"),
    variant: "grayscale-contrast",
    width: canvas.width,
    height: canvas.height,
  };
}

export async function runFantasyScreenshotOcr(imageSource, { onStatus = () => {}, signal } = {}) {
  onStatus("Loading OCR worker");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker("eng", 1, {
    logger: (message) => {
      if (message?.status) onStatus(message.status);
    },
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
    const result = await worker.recognize(imageSource);
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
