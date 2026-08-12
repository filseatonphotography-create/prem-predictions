const fs = require("fs");
const path = require("path");
const WebSocket = require("ws");

const chromeVersionUrl = process.env.CHROME_DEBUG_URL || "http://127.0.0.1:9222/json/version";
const appUrl = process.env.FANTASY_IQ_SMOKE_APP_URL || "http://localhost:3000";
const screenshotDir = process.env.FANTASY_IQ_SCREENSHOT_DIR || "/Users/pse2/Downloads/screenshotformations";
const verboseOutput = /^(1|true|yes)$/i.test(String(process.env.FANTASY_IQ_VERBOSE || ""));
const useSampleData = !/^(0|false|no)$/i.test(String(process.env.FANTASY_IQ_USE_SAMPLE_DATA || "true"));
const authKey = "pl_prediction_auth_v1";
const playerDataKey = "predictionAddiction:fplPlayerData:v4";

const expectedByFormation = {
  "3-4-3": ["Vicario", "Van de Ven", "Ballard", "De Cuyper", "Wirtz", "Foden", "Palmer", "Gakpo", "Osula", "Wood", "Richarlison", "Dovin", "Rice", "Thiaw", "Henry"],
  "3-5-2": ["Vicario", "Van de Ven", "Ballard", "De Cuyper", "Wirtz", "Foden", "Palmer", "Gakpo", "Rice", "Richarlison", "Wood", "Dovin", "Osula", "Thiaw", "Henry"],
  "4-3-3": ["Vicario", "Van de Ven", "Ballard", "De Cuyper", "Thiaw", "Wirtz", "Foden", "Palmer", "Osula", "Wood", "Richarlison", "Dovin", "Rice", "Gakpo", "Henry"],
  "4-4-2": ["Vicario", "Van de Ven", "Ballard", "De Cuyper", "Thiaw", "Wirtz", "Foden", "Palmer", "Gakpo", "Osula", "Wood", "Dovin", "Rice", "Richarlison", "Henry"],
  "4-5-1": ["Vicario", "Van de Ven", "Ballard", "De Cuyper", "Thiaw", "Wirtz", "Foden", "Palmer", "Gakpo", "Rice", "Wood", "Dovin", "Osula", "Richarlison", "Henry"],
  "5-3-2": ["Vicario", "Van de Ven", "Ballard", "De Cuyper", "Thiaw", "Henry", "Wirtz", "Foden", "Palmer", "Richarlison", "Wood", "Dovin", "Osula", "Rice", "Gakpo"],
  "5-4-1": ["Vicario", "Van de Ven", "Ballard", "De Cuyper", "Thiaw", "Henry", "Wirtz", "Foden", "Rice", "Palmer", "Richarlison", "Dovin", "Osula", "Wood", "Gakpo"],
};

if (process.env.FANTASY_IQ_EXPECTED_NAMES) {
  expectedByFormation["3-4-3"] = process.env.FANTASY_IQ_EXPECTED_NAMES.split(",").map((name) => name.trim()).filter(Boolean);
}

const defaultSamplePlayers = [
  ["Vicario", "TOT", "GK"], ["Dovin", "COV", "GK"],
  ["Van de Ven", "TOT", "DEF"], ["Ballard", "SUN", "DEF"], ["De Cuyper", "BHA", "DEF"], ["Thiaw", "NEW", "DEF"], ["Henry", "BRE", "DEF"],
  ["Wirtz", "LIV", "MID"], ["Foden", "MCI", "MID"], ["Palmer", "CHE", "MID"], ["Gakpo", "LIV", "MID"], ["Rice", "ARS", "MID"],
  ["Richarlison", "TOT", "FWD"], ["Osula", "NEW", "FWD"], ["Wood", "NFO", "FWD"],
];
const samplePlayers = process.env.FANTASY_IQ_SAMPLE_PLAYERS
  ? process.env.FANTASY_IQ_SAMPLE_PLAYERS.split(",").map((row) => row.split("|").map((item) => item.trim())).filter((row) => row.length >= 3)
  : defaultSamplePlayers;

function normaliseName(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function makeDataset() {
  const teams = Array.from(new Set(samplePlayers.map((player) => player[1]))).map((code, index) => ({
    id: `team:${code}`,
    sourceId: index + 1,
    name: code,
    shortName: code,
    code,
    normalisedCode: code,
    aliases: [code],
  }));
  return {
    schemaVersion: 4,
    source: "screenshot-recognition-check",
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    status: "ready",
    cacheStatus: "fresh-cache",
    players: samplePlayers.map(([name, teamCode, position], index) => ({
      id: `sample:${index + 1}`,
      sourceId: index + 1,
      firstName: name,
      lastName: "",
      displayName: name,
      name,
      webName: name,
      normalisedName: normaliseName(name),
      teamId: `team:${teamCode}`,
      teamCode,
      teamName: teamCode,
      position,
      positionId: position === "GK" ? 1 : position === "DEF" ? 2 : position === "MID" ? 3 : 4,
      active: true,
      availabilityStatus: "available",
      chanceOfPlayingNextRound: 100,
      chanceOfPlayingThisRound: 100,
      externalMetadata: {
        selectedByPercent: 8,
        nowCost: position === "GK" ? 55 : position === "DEF" ? 55 : position === "MID" ? 80 : 75,
        startsLast5: 5,
        startsLast8: 7,
        minutesPerStartLast8: 88,
        startsTailTrend: 1,
      },
      dataSource: "screenshot-recognition-check",
      dataUpdatedAt: new Date().toISOString(),
    })),
    teams,
    positions: [
      { id: 1, sourceId: 1, singularName: "Goalkeeper", pluralName: "Goalkeepers", code: "GK" },
      { id: 2, sourceId: 2, singularName: "Defender", pluralName: "Defenders", code: "DEF" },
      { id: 3, sourceId: 3, singularName: "Midfielder", pluralName: "Midfielders", code: "MID" },
      { id: 4, sourceId: 4, singularName: "Forward", pluralName: "Forwards", code: "FWD" },
    ],
    diagnostics: { validPlayerCount: samplePlayers.length, rejectedPlayerCount: 0, warnings: [] },
    events: [
      { id: 1, gameweek: 1, name: "GW 1", deadline: "2026-08-01T10:30:00.000Z", finished: false, isCurrent: true, isNext: false },
    ],
  };
}

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} failed with ${res.status}`);
  return res.json();
}

class Cdp {
  constructor(url) {
    this.ws = new WebSocket(url);
    this.nextId = 1;
    this.pending = new Map();
    this.events = [];
    this.ws.on("message", (raw) => {
      const message = JSON.parse(raw);
      if (message.id && this.pending.has(message.id)) {
        const { resolve, reject } = this.pending.get(message.id);
        this.pending.delete(message.id);
        if (message.error) reject(new Error(message.error.message));
        else resolve(message.result || {});
      } else if (message.method) {
        this.events.push(message);
      }
    });
  }

  open() {
    return new Promise((resolve, reject) => {
      this.ws.once("open", resolve);
      this.ws.once("error", reject);
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
}

async function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Evaluation failed";
    throw new Error(detail);
  }
  return result.result?.value;
}

async function waitFor(cdp, sessionId, expression, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const value = await evaluate(cdp, sessionId, expression).catch(() => false);
    if (value) return value;
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

function clickButtonExpression(text) {
  return `
    (() => {
      const button = [...document.querySelectorAll("button")]
        .find((item) => (item.innerText || item.textContent || "").includes(${JSON.stringify(text)}));
      if (!button) return false;
      button.click();
      return true;
    })()
  `;
}

function getScreenshotPaths() {
  if (process.env.FANTASY_IQ_SCREENSHOT) return [process.env.FANTASY_IQ_SCREENSHOT];
  return fs.readdirSync(screenshotDir)
    .filter((file) => /\.jpe?g$/i.test(file))
    .map((file) => path.join(screenshotDir, file))
    .filter((file) => expectedByFormation[path.basename(file, path.extname(file))]);
}

function getFormationFromPath(filePath) {
  return path.basename(filePath, path.extname(filePath));
}

function summariseReview(review, expectedNames) {
  const slots = review?.extractedSlots || [];
  const selectedNames = slots
    .map((slot) => slot.selectedPlayer?.webName || slot.selectedPlayer?.displayName || slot.selectedPlayer?.name || slot.rawName)
    .filter(Boolean);
  const selectedKey = new Set(selectedNames.map(normaliseName));
  const missing = expectedNames.filter((name) => !selectedKey.has(normaliseName(name)));
  const summary = {
    selectedCount: selectedNames.length,
    selectedNames,
    captain: slots.find((slot) => slot.isCaptain)?.selectedPlayer?.webName ||
      slots.find((slot) => slot.isCaptain)?.selectedPlayer?.displayName ||
      slots.find((slot) => slot.isCaptain)?.selectedPlayer?.name ||
      slots.find((slot) => slot.isCaptain)?.extracted?.rawName ||
      null,
    viceCaptain: slots.find((slot) => slot.isViceCaptain)?.selectedPlayer?.webName ||
      slots.find((slot) => slot.isViceCaptain)?.selectedPlayer?.displayName ||
      slots.find((slot) => slot.isViceCaptain)?.selectedPlayer?.name ||
      slots.find((slot) => slot.isViceCaptain)?.extracted?.rawName ||
      null,
    missing,
    unresolvedCount: review?.unresolvedCount || 0,
    inferredFormation: review?.imageMetadata?.inferredFormation || null,
    ocrTextBlockCount: review?.diagnostics?.ocrTextBlockCount || 0,
    targetedRecoverySlotCount: review?.imageMetadata?.targetedRecoverySlotCount || 0,
    targetedRecoveryTextBlockCount: review?.imageMetadata?.targetedRecoveryTextBlockCount || 0,
    confidence: review?.confidence?.label || null,
    ocrRegion: review?.imageMetadata?.ocrRegion || null,
    pageSegMode: review?.imageMetadata?.pageSegMode || null,
    preprocessingVariant: review?.imageMetadata?.preprocessingVariant || null,
  };
  if (verboseOutput || missing.length) {
    summary.slots = slots.map((slot) => ({
      id: slot.extracted?.sourceRegion?.id || slot.id,
      rawName: slot.extracted?.rawName || "",
      selectedName: slot.selectedPlayer?.webName || slot.selectedPlayer?.displayName || slot.selectedPlayer?.name || "",
      position: slot.selectedPlayer?.position || slot.extracted?.rawPosition || "",
      role: slot.role || slot.extracted?.rawSquadRole || "",
      status: slot.status || "",
      isCaptain: !!slot.isCaptain,
      isViceCaptain: !!slot.isViceCaptain,
      textPreview: slot.extracted?.sourceRegion?.textPreview || "",
      issues: slot.issues || [],
    }));
    summary.slotTextPreviews = [
      ...(review?.imageMetadata?.ocrDebug?.slotTextPreviews || []),
      ...(review?.imageMetadata?.ocrDebug?.targetedRecovery?.slotTextPreviews || []),
    ];
    summary.slotAttempts = [
      ...(review?.imageMetadata?.ocrDebug?.slotAttempts || []),
      ...(review?.imageMetadata?.ocrDebug?.targetedRecovery?.slotAttempts || []),
    ];
  }
  return summary;
}

function summarisePageText(text = "", expectedNames = []) {
  const normalisedText = normaliseName(text);
  const selectedNames = expectedNames.filter((name) => normalisedText.includes(normaliseName(name)));
  return {
    selectedCount: selectedNames.length,
    selectedNames,
    missing: expectedNames.filter((name) => !selectedNames.includes(name)),
    unresolvedCount: null,
    inferredFormation: null,
    ocrTextBlockCount: null,
    targetedRecoverySlotCount: null,
    targetedRecoveryTextBlockCount: null,
    confidence: null,
  };
}

async function runScreenshot(cdp, sessionId, screenshotPath) {
  const formation = getFormationFromPath(screenshotPath);
  const expectedNames = expectedByFormation[formation];
  if (!expectedNames) throw new Error(`No expected-name map for ${formation}`);
  if (!fs.existsSync(screenshotPath)) throw new Error(`Missing screenshot ${screenshotPath}`);

  await cdp.send("Page.navigate", { url: appUrl }, sessionId).catch(() => {});
  await waitFor(cdp, sessionId, "document.readyState === 'complete'", 30000);
  await evaluate(cdp, sessionId, `
    Object.keys(localStorage).forEach((key) => {
      if (key.includes("fantasyIqSquad")) localStorage.removeItem(key);
      if (key.includes("fantasyIqHistory")) localStorage.removeItem(key);
      if (key.includes("fantasyIqScreenshotFeedback")) localStorage.removeItem(key);
    });
    localStorage.removeItem(${JSON.stringify(playerDataKey)});
    localStorage.setItem(${JSON.stringify(authKey)}, JSON.stringify({ token: "screenshot-check-token", userId: "screenshot-check-user", username: "ScreenshotCheck" }));
    if (${JSON.stringify(useSampleData)}) {
      localStorage.setItem(${JSON.stringify(playerDataKey)}, ${JSON.stringify(JSON.stringify(makeDataset()))});
    }
    localStorage.setItem("activeView", "fantasyHelp");
  `);
  await cdp.send("Page.navigate", { url: appUrl }, sessionId).catch(() => {});
  await waitFor(cdp, sessionId, "document.body && document.body.innerText.includes('Fantasy IQ')", 30000);
  await evaluate(cdp, sessionId, clickButtonExpression("Fantasy IQ"));
  await waitFor(cdp, sessionId, "document.body.innerText.includes('Analyse Your Fantasy Team') || document.body.innerText.includes('Analyse Your Fantasy Squad')", 15000);
  await evaluate(cdp, sessionId, clickButtonExpression("Analyse Your Fantasy Team"));
  await waitFor(cdp, sessionId, "document.body.innerText.includes('Import Squad Screenshot')", 15000);
  await evaluate(cdp, sessionId, clickButtonExpression("Import Squad Screenshot"));
  await waitFor(cdp, sessionId, "document.body.innerText.includes('Select or drop a squad screenshot')", 10000);
  const documentNode = await cdp.send("DOM.getDocument", { depth: -1 }, sessionId);
  const inputNode = await cdp.send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: "input[type=file]" }, sessionId);
  if (!inputNode.nodeId) throw new Error("Missing screenshot file input");
  await cdp.send("DOM.setFileInputFiles", { nodeId: inputNode.nodeId, files: [screenshotPath] }, sessionId);
  await waitFor(cdp, sessionId, "document.body.innerText.includes('Ready to analyse')", 10000);
  await evaluate(cdp, sessionId, clickButtonExpression("Analyse Screenshot"));
  await waitFor(cdp, sessionId, "window.__predictionAddictionFantasyScreenshotImportState === 'needs review' || window.__predictionAddictionFantasyScreenshotImportState === 'failed' || document.body.innerText.includes('Ready for review') || document.body.innerText.includes('could not read') || document.body.innerText.includes('Only a few players')", 180000);

  const review = await evaluate(cdp, sessionId, "window.__predictionAddictionFantasyScreenshotReview");
  const text = await evaluate(cdp, sessionId, "document.body.innerText");
  const summary = review ? summariseReview(review, expectedNames) : summarisePageText(text, expectedNames);
  summary.formation = formation;
  summary.screenshot = screenshotPath;
  summary.statusLines = String(text || "")
    .split("\n")
    .filter((line) => /players selected|Formation|Ready for review|Only a few|could not read|Debug:/i.test(line))
    .slice(0, 8);
  return summary;
}

async function main() {
  const screenshots = getScreenshotPaths();
  if (!screenshots.length) throw new Error(`No screenshots found. Set FANTASY_IQ_SCREENSHOT or add JPGs to ${screenshotDir}.`);
  const version = await getJson(chromeVersionUrl);
  const cdp = new Cdp(version.webSocketDebuggerUrl);
  await cdp.open();
  const target = await cdp.send("Target.createTarget", { url: appUrl });
  const attached = await cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("DOM.enable", {}, sessionId);
  await cdp.send("Page.addScriptToEvaluateOnNewDocument", {
    source: `
      try {
        Object.keys(localStorage).forEach((key) => {
          if (key.includes("fantasyIqSquad")) localStorage.removeItem(key);
          if (key.includes("fantasyIqHistory")) localStorage.removeItem(key);
          if (key.includes("fantasyIqScreenshotFeedback")) localStorage.removeItem(key);
        });
        localStorage.removeItem(${JSON.stringify(playerDataKey)});
        localStorage.setItem(${JSON.stringify(authKey)}, JSON.stringify({ token: "screenshot-check-token", userId: "screenshot-check-user", username: "ScreenshotCheck" }));
        if (${JSON.stringify(useSampleData)}) {
          localStorage.setItem(${JSON.stringify(playerDataKey)}, ${JSON.stringify(JSON.stringify(makeDataset()))});
        }
        localStorage.setItem("activeView", "fantasyHelp");
      } catch (error) {}
    `,
  }, sessionId);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  }, sessionId);

  const results = [];
  try {
    for (const screenshot of screenshots) {
      results.push(await runScreenshot(cdp, sessionId, screenshot));
    }
  } finally {
    await cdp.send("Target.closeTarget", { targetId: target.targetId }).catch(() => {});
    cdp.ws.close();
  }

  console.log(JSON.stringify(results, null, 2));
  const failures = results.filter((result) => result.missing.length || result.selectedCount !== 15);
  if (failures.length) {
    console.error(`Screenshot recognition failed for ${failures.length} sample(s).`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
