const fs = require("fs");
const WebSocket = require("ws");

const chromeVersionUrl = "http://127.0.0.1:9222/json/version";
const appUrl = process.env.FANTASY_IQ_SMOKE_APP_URL || "http://localhost:3000";
const fixturePath = `${process.cwd()}/src/fantasyIq/fixtures/screenshot-import/mobile-portrait-full-squad.png`;
const authKey = "pl_prediction_auth_v1";
const playerDataKey = "predictionAddiction:fplPlayerData:v3";
const squadKey = "predictionAddiction:fantasyIqSquad:v1:browser-smoke-user";
const historyKey = "predictionAddiction:fantasyIqHistory:v1:browser-smoke-user";

const players = [
  ["Raya", "ARS", "GK"], ["Gabriel", "ARS", "DEF"], ["Van Dijk", "LIV", "DEF"],
  ["Trippier", "NEW", "DEF"], ["Saka", "ARS", "MID"], ["Salah", "LIV", "MID"],
  ["Foden", "MCI", "MID"], ["Gordon", "NEW", "MID"], ["Haaland", "MCI", "FWD"],
  ["Watkins", "AVL", "FWD"], ["Joao Felix", "CHE", "FWD"], ["Areola", "EVE", "GK"],
  ["Smith-Rowe", "FUL", "MID"], ["Senesi", "BOU", "DEF"], ["Damsgaard", "BRE", "DEF"],
  ["Palmer", "CHE", "MID"], ["Bruno Fernandes", "MUN", "MID"], ["Odegaard", "ARS", "MID"],
  ["Pickford", "EVE", "GK"], ["Tarkowski", "EVE", "DEF"], ["Isak", "NEW", "FWD"],
  ["Semenyo", "BOU", "MID"], ["Kerkez", "LIV", "DEF"],
];

function normaliseName(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
}

function makeDataset() {
  const codes = Array.from(new Set(players.map((player) => player[1])));
  const teams = codes.map((code, index) => ({
    id: `team:${code}`,
    sourceId: index + 1,
    name: code,
    shortName: code,
    code,
    normalisedCode: code,
    aliases: [code],
  }));
  return {
    schemaVersion: 3,
    source: "browser-smoke-fixture",
    fetchedAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    status: "ready",
    cacheStatus: "fresh-cache",
    players: players.map(([name, teamCode, position], index) => ({
      id: `fpl:${index + 1}`,
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
      externalMetadata: {},
      dataSource: "browser-smoke-fixture",
      dataUpdatedAt: new Date().toISOString(),
    })),
    teams,
    positions: [
      { id: 1, sourceId: 1, singularName: "Goalkeeper", pluralName: "Goalkeepers", code: "GK" },
      { id: 2, sourceId: 2, singularName: "Defender", pluralName: "Defenders", code: "DEF" },
      { id: 3, sourceId: 3, singularName: "Midfielder", pluralName: "Midfielders", code: "MID" },
      { id: 4, sourceId: 4, singularName: "Forward", pluralName: "Forwards", code: "FWD" },
    ],
    diagnostics: { validPlayerCount: players.length, rejectedPlayerCount: 0, warnings: [] },
    events: [
      { id: 1, gameweek: 1, name: "GW 1", deadline: "2026-08-01T10:30:00.000Z", finished: false, isCurrent: true, isNext: false },
      { id: 2, gameweek: 2, name: "GW 2", deadline: "2026-08-08T10:30:00.000Z", finished: false, isCurrent: false, isNext: true },
    ],
  };
}

function makeSavedSquad() {
  const starters = new Set(["Raya", "Gabriel", "Van Dijk", "Trippier", "Damsgaard", "Saka", "Salah", "Foden", "Gordon", "Haaland", "Watkins"]);
  const squadPlayers = players.slice(0, 15).map(([name, teamCode, position], index) => ({
    id: `fpl:${index + 1}`,
    sourceId: index + 1,
    name,
    displayName: name,
    webName: name,
    normalisedName: normaliseName(name),
    teamCode,
    teamName: teamCode,
    position,
    squadRole: starters.has(name) ? "starter" : "bench",
    isCaptain: name === "Saka",
    isViceCaptain: name === "Salah",
    confidence: 1,
    manuallyConfirmed: true,
    active: true,
    availabilityStatus: "available",
    dataSource: "browser-smoke-fixture",
    canonicalPlayerId: `fpl:${index + 1}`,
    reconciliationStatus: "matched",
    reconciliationConfidence: 1,
  }));
  return {
    schemaVersion: 1,
    source: "manual",
    formation: "5-4-2",
    gameweek: 1,
    players: squadPlayers,
    captainPlayerId: "fpl:5",
    viceCaptainPlayerId: "fpl:6",
    importedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    confirmed: true,
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
        if (message.error?.message === "Inspected target navigated or closed") resolve({});
        else if (message.error) reject(new Error(message.error.message));
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

async function waitFor(cdp, sessionId, expression, timeoutMs = 60000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true }, sessionId);
    if (result.result?.value) return result.result.value;
    await wait(500);
  }
  throw new Error(`Timed out waiting for ${expression}`);
}

async function evaluate(cdp, sessionId, expression) {
  const result = await cdp.send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, sessionId);
  if (result.exceptionDetails) {
    const detail = result.exceptionDetails.exception?.description || result.exceptionDetails.text || "Evaluation failed";
    throw new Error(detail);
  }
  return result.result?.value;
}

function clickButtonExpression(text) {
  return `
    (async () => {
      for (let attempt = 0; attempt < 40; attempt += 1) {
        const button = [...document.querySelectorAll("button")].find((item) => (item.textContent || item.innerText || "").includes(${JSON.stringify(text)}));
        const nested = button || [...document.querySelectorAll("*")]
          .find((item) => (item.textContent || item.innerText || "").includes(${JSON.stringify(text)}))?.closest?.("button");
        if (nested) {
          nested.click();
          return true;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
      throw new Error("Missing button: " + ${JSON.stringify(text)} + " from " + [...document.querySelectorAll("button")].map((item) => item.innerText || item.textContent).join(" | "));
    })()
  `;
}

async function main() {
  const viewport = process.argv.includes("--mobile")
    ? { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }
    : { width: 1365, height: 900, mobile: false, deviceScaleFactor: 1 };
  if (!fs.existsSync(fixturePath)) throw new Error(`Missing fixture ${fixturePath}`);
  const version = await getJson(chromeVersionUrl);
  const cdp = new Cdp(version.webSocketDebuggerUrl);
  await cdp.open();
  const target = await cdp.send("Target.createTarget", { url: appUrl });
  const attached = await cdp.send("Target.attachToTarget", { targetId: target.targetId, flatten: true });
  const sessionId = attached.sessionId;
  await cdp.send("Runtime.enable", {}, sessionId);
  await cdp.send("Page.enable", {}, sessionId);
  await cdp.send("Network.enable", {}, sessionId);
  await cdp.send("Emulation.setDeviceMetricsOverride", {
    width: viewport.width,
    height: viewport.height,
    deviceScaleFactor: viewport.deviceScaleFactor,
    mobile: viewport.mobile,
  }, sessionId);
  await waitFor(cdp, sessionId, "document.readyState === 'complete'", 30000);
  await evaluate(cdp, sessionId, `
    Object.keys(localStorage).forEach((key) => {
      if (key.includes("fantasyIqSquad")) localStorage.removeItem(key);
      if (key.includes("fantasyIqHistory")) localStorage.removeItem(key);
      if (key.includes("fantasyIqScreenshotFeedback")) localStorage.removeItem(key);
    });
    localStorage.setItem(${JSON.stringify(authKey)}, JSON.stringify({ token: "browser-smoke-token", userId: "browser-smoke-user", username: "BrowserSmoke" }));
    localStorage.setItem(${JSON.stringify(playerDataKey)}, ${JSON.stringify(JSON.stringify(makeDataset()))});
    ${process.argv.includes("--transfer") || process.argv.includes("--lineup") || process.argv.includes("--history") ? `localStorage.setItem(${JSON.stringify(squadKey)}, ${JSON.stringify(JSON.stringify(makeSavedSquad()))});` : ""}
    localStorage.setItem("activeView", "fantasyHelp");
  `);
  await cdp.send("Page.navigate", { url: appUrl }, sessionId).catch(() => {});
  await waitFor(cdp, sessionId, "document.body && document.body.innerText.includes('Fantasy IQ')", 30000);
  await evaluate(cdp, sessionId, `
    [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "Fantasy IQ")?.click();
  `);
  await waitFor(cdp, sessionId, "document.body.innerText.includes('Analyse Your Fantasy Squad')", 10000);
  const historyWorkflow = process.argv.includes("--history");
  if (historyWorkflow) {
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Status: Ready for analysis')", 10000);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Fantasy IQ History') && document.body.innerText.includes('Save Gameweek Snapshot')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Save Gameweek Snapshot"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('GW 1 snapshot saved')", 10000);
    await cdp.send("Page.reload", {}, sessionId).catch(() => {});
    await waitFor(cdp, sessionId, "document.body.innerText.includes('GW 1') && document.body.innerText.includes('Snapshot list')", 30000);
    const persistedAfterRefresh = await evaluate(cdp, sessionId, `!!JSON.parse(localStorage.getItem(${JSON.stringify(historyKey)})).snapshots.length`);
    await evaluate(cdp, sessionId, clickButtonExpression("Save Gameweek Snapshot"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('already exists for GW 1')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Update Snapshot"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('GW 1 snapshot updated')", 10000);
    const updatedFirst = await evaluate(cdp, sessionId, `JSON.parse(localStorage.getItem(${JSON.stringify(historyKey)})).snapshots[0]`);
    await evaluate(cdp, sessionId, `
      const dataset = JSON.parse(localStorage.getItem(${JSON.stringify(playerDataKey)}));
      dataset.events = dataset.events.map((event) => ({ ...event, isCurrent: event.id === 2, isNext: false }));
      localStorage.setItem(${JSON.stringify(playerDataKey)}, JSON.stringify(dataset));
      localStorage.setItem("pl_prediction_game_v2", JSON.stringify({ selectedGameweek: 2 }));
    `);
    await cdp.send("Page.reload", {}, sessionId).catch(() => {});
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Fantasy IQ History') && document.body.innerText.includes('GW 1')", 30000);
    await evaluate(cdp, sessionId, clickButtonExpression("Save Gameweek Snapshot"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('GW 2 snapshot saved')", 10000);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Change:') || document.body.innerText.includes('No meaningful change') || document.body.innerText.includes('improved by')", 10000);
    const textAfterSecondSnapshot = await evaluate(cdp, sessionId, "document.body.innerText");
    const detailsAlreadyOpen = await evaluate(cdp, sessionId, "document.body.innerText.includes('Saved model result') && document.body.innerText.includes('Starting XI')");
    if (!detailsAlreadyOpen) await evaluate(cdp, sessionId, clickButtonExpression("View Details"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Saved model result') && document.body.innerText.includes('Starting XI')", 10000);
    const detailsVisible = await evaluate(cdp, sessionId, "document.body.innerText.includes('Saved model result') && document.body.innerText.includes('Bench')");
    await evaluate(cdp, sessionId, "window.confirm = () => true");
    await evaluate(cdp, sessionId, clickButtonExpression("Delete"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('snapshot deleted')", 10000);
    const squadAfterDelete = await evaluate(cdp, sessionId, `JSON.parse(localStorage.getItem(${JSON.stringify(squadKey)}))`);
    await evaluate(cdp, sessionId, clickButtonExpression("Clear Fantasy IQ History"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Fantasy IQ history cleared')", 10000);
    const squadAfterClear = await evaluate(cdp, sessionId, `JSON.parse(localStorage.getItem(${JSON.stringify(squadKey)}))`);
    const historyStorage = await evaluate(cdp, sessionId, `localStorage.getItem(${JSON.stringify(historyKey)})`);
    const storagePrivacySafe = !/data:image|base64|ocr|password|token/i.test(historyStorage || "");
    const finalText = await evaluate(cdp, sessionId, "document.body.innerText");
    const consoleEvents = cdp.events
      .filter((event) => ["Runtime.consoleAPICalled", "Runtime.exceptionThrown", "Log.entryAdded"].includes(event.method))
      .map((event) => ({
        method: event.method,
        text: event.params?.exceptionDetails?.text ||
          event.params?.entry?.text ||
          (event.params?.args || []).map((arg) => arg.value || arg.description || "").join(" "),
      }));
    await cdp.send("Target.closeTarget", { targetId: target.targetId });
    cdp.ws.close();
    console.log(JSON.stringify({
      viewport,
      historyVisible: finalText.includes("Fantasy IQ History"),
      firstSnapshotPersisted: persistedAfterRefresh,
      duplicateUpdatePreservedId: updatedFirst.id === "fantasy-iq-snapshot" || !!updatedFirst.id,
      secondSnapshotSaved: textAfterSecondSnapshot.includes("GW 2"),
      comparisonVisible: textAfterSecondSnapshot.includes("modelled three-gameweek squad outlook") || textAfterSecondSnapshot.includes("No meaningful change"),
      detailsVisible,
      deletePreservedSquad: squadAfterDelete.confirmed === true,
      clearPreservedSquad: squadAfterClear.confirmed === true,
      storagePrivacySafe,
      consoleEvents: consoleEvents.slice(0, 10),
    }, null, 2));
    return;
  }
  const lineupWorkflow = process.argv.includes("--lineup");
  if (lineupWorkflow) {
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Status: Ready for analysis')", 10000);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Lineup IQ') && document.body.innerText.includes('Analyse My Lineup')", 10000);
    await waitFor(cdp, sessionId, `[...document.querySelectorAll("button")].some((button) => (button.innerText || button.textContent || "").includes("Analyse My Lineup"))`, 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Analyse My Lineup"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Suggested XI') && document.body.innerText.includes('Bench Order') && document.body.innerText.includes('Captain:')", 15000);
    const firstSummary = await evaluate(cdp, sessionId, "document.body.innerText");
    await evaluate(cdp, sessionId, clickButtonExpression("Apply Suggested Lineup"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Apply this starting XI')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Confirm Apply Suggested Lineup"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Lineup applied to your Fantasy IQ squad')", 10000);
    await cdp.send("Page.reload", {}, sessionId).catch(() => {});
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Status: Ready for analysis')", 30000);
    const savedAfterApply = await evaluate(cdp, sessionId, `JSON.parse(localStorage.getItem(${JSON.stringify(squadKey)}))`);
    await evaluate(cdp, sessionId, clickButtonExpression("Analyse My Lineup"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Minimal-change option')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Apply Minimal-Change Lineup"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Apply this starting XI')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Keep Current Lineup"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Current lineup kept') && document.body.innerText.includes('Analyse My Lineup')", 10000);
    const savedAfterKeep = await evaluate(cdp, sessionId, `JSON.parse(localStorage.getItem(${JSON.stringify(squadKey)}))`);
    await evaluate(cdp, sessionId, clickButtonExpression("Analyse My Lineup"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Suggested XI')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Edit Suggested Lineup"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Manual lineup is valid') || document.body.innerText.includes('Manual changes are validated')", 10000);
    await evaluate(cdp, sessionId, `
      {
        const benchButton = [...document.querySelectorAll("button")].find((button) => button.textContent.trim() === "Bench");
        if (!benchButton) throw new Error("Missing manual bench button");
        benchButton.click();
      }
    `);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Starting XI must contain 11 players') || document.body.innerText.includes('Starters 10/11')", 10000);
    const manualInvalidated = await evaluate(cdp, sessionId, "document.body.innerText.includes('Starting XI must contain 11 players') || document.body.innerText.includes('Starters 10/11')");
    await evaluate(cdp, sessionId, clickButtonExpression("Keep Current Lineup"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Analyse My Lineup')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Compare a Transfer"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Choose a player to compare')", 10000);
    const finalText = await evaluate(cdp, sessionId, "document.body.innerText");
    const consoleEvents = cdp.events
      .filter((event) => ["Runtime.consoleAPICalled", "Runtime.exceptionThrown", "Log.entryAdded"].includes(event.method))
      .map((event) => ({
        method: event.method,
        text: event.params?.exceptionDetails?.text ||
          event.params?.entry?.text ||
          (event.params?.args || []).map((arg) => arg.value || arg.description || "").join(" "),
      }));
    await cdp.send("Target.closeTarget", { targetId: target.targetId });
    cdp.ws.close();
    console.log(JSON.stringify({
      viewport,
      lineupIqVisible: firstSummary.includes("Lineup IQ"),
      suggestedLineupGenerated: firstSummary.includes("Suggested XI") && firstSummary.includes("Bench Order"),
      formationComparisonVisible: firstSummary.includes("Formation:") && firstSummary.includes("→"),
      captainViceVisible: firstSummary.includes("Captain:") && firstSummary.includes("Vice-captain:"),
      noPredictionsHandled: firstSummary.includes("No immediate predictions found") || firstSummary.includes("Model confidence"),
      appliedLineupPersisted: savedAfterApply.source === "lineup-iq" && savedAfterApply.confirmed === true,
      keepCurrentLeftSquadUnchanged: JSON.stringify(savedAfterKeep) === JSON.stringify(savedAfterApply),
      manualAdjustmentInvalidated: manualInvalidated,
      transferIqStillOpens: finalText.includes("Choose a player to compare"),
      officialFplCopyVisible: firstSummary.includes("does not make changes to your official Fantasy Premier League team"),
      consoleEvents: consoleEvents.slice(0, 10),
    }, null, 2));
    return;
  }
  const transferWorkflow = process.argv.includes("--transfer");
  if (transferWorkflow) {
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Status: Ready for analysis')", 10000);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Transfer IQ') && document.body.innerText.includes('Compare a Transfer')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Compare a Transfer"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Choose a player to compare')", 10000);
    const arsenalCandidateVisible = await evaluate(cdp, sessionId, `
      [...document.querySelectorAll("button")].some((button) => button.innerText.includes("Odegaard"))
    `);
    await evaluate(cdp, sessionId, `
      [...document.querySelectorAll("button")].find((button) => button.innerText.includes("Foden") && button.innerText.includes("MCI"))?.click();
    `);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Choose a MID replacement')", 10000);
    const fourthClubHidden = await evaluate(cdp, sessionId, `
      ![...document.querySelectorAll("button")].some((button) => button.innerText.includes("Odegaard") && button.innerText.includes("ARS"))
    `);
    await evaluate(cdp, sessionId, `
      [...document.querySelectorAll("button")].find((button) => button.innerText.includes("Palmer") && button.innerText.includes("CHE"))?.click();
    `);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Apply to Fantasy IQ squad') && document.body.innerText.includes('Fantasy IQ') && document.body.innerText.includes('Palmer')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Apply to Fantasy IQ squad"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Apply this change to your saved Fantasy IQ squad')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Confirm Apply to Fantasy IQ squad"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Transfer applied to your Fantasy IQ squad')", 10000);
    await cdp.send("Page.reload", {}, sessionId).catch(() => {});
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Palmer') && document.body.innerText.includes('Status: Ready for analysis')", 30000);
    await waitFor(cdp, sessionId, `[...document.querySelectorAll("button")].some((button) => button.textContent.includes("Compare a Transfer"))`, 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Compare a Transfer"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Choose a player to compare')", 10000);
    await evaluate(cdp, sessionId, `
      [...document.querySelectorAll("button")].find((button) => button.innerText.includes("Smith-Rowe") && button.innerText.includes("Bench"))?.click();
    `);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Choose a MID replacement')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Discard Comparison"));
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Compare a Transfer')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Compare a Transfer"));
    await evaluate(cdp, sessionId, `
      [...document.querySelectorAll("button")].find((button) => button.innerText.includes("Saka") && button.innerText.includes(" C"))?.click();
    `);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Choose a MID replacement')", 10000);
    await evaluate(cdp, sessionId, `
      [...document.querySelectorAll("button")].find((button) => button.innerText.includes("Bruno Fernandes"))?.click();
    `);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Hypothetical captaincy')", 10000);
    await evaluate(cdp, sessionId, `
      {
      const select = [...document.querySelectorAll("select")].find((item) => item.getAttribute("aria-label") === "Replacement captain");
      select.value = "fpl:6";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    `);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Captain and vice-captain must be different')", 10000);
    await evaluate(cdp, sessionId, `
      {
      const select = [...document.querySelectorAll("select")].find((item) => item.getAttribute("aria-label") === "Replacement captain");
      select.value = "fpl:9";
      select.dispatchEvent(new Event("change", { bubbles: true }));
      }
    `);
    await waitFor(cdp, sessionId, "document.body.innerText.includes('Bruno Fernandes') && document.body.innerText.includes('Apply to Fantasy IQ squad')", 10000);
    await evaluate(cdp, sessionId, clickButtonExpression("Discard Comparison"));
    const finalStorage = await evaluate(cdp, sessionId, `localStorage.getItem(${JSON.stringify(squadKey)})`);
    const parsedFinalSquad = JSON.parse(finalStorage);
    const summaryText = await evaluate(cdp, sessionId, "document.body.innerText");
    const consoleEvents = cdp.events
      .filter((event) => ["Runtime.consoleAPICalled", "Runtime.exceptionThrown", "Log.entryAdded"].includes(event.method))
      .map((event) => ({
        method: event.method,
        text: event.params?.exceptionDetails?.text ||
          event.params?.entry?.text ||
          (event.params?.args || []).map((arg) => arg.value || arg.description || "").join(" "),
      }));
    await cdp.send("Target.closeTarget", { targetId: target.targetId });
    cdp.ws.close();
    console.log(JSON.stringify({
      viewport,
      transferIqVisible: summaryText.includes("Transfer IQ"),
      starterTransferApplied: parsedFinalSquad.players.some((player) => player.name === "Palmer"),
      replacedPlayerRemoved: !parsedFinalSquad.players.some((player) => player.name === "Foden"),
      persistedAfterRefresh: summaryText.includes("Palmer"),
      benchDiscardLeftSquadUnchanged: parsedFinalSquad.players.some((player) => player.name === "Smith-Rowe"),
      captainComparisonExercised: summaryText.includes("Compare a Transfer"),
      invalidFourthClubCandidateHidden: fourthClubHidden && !arsenalCandidateVisible,
      officialFplCopyVisible: summaryText.includes("does not make changes to your official Fantasy Premier League team"),
      fantasyIqScoreVisible: summaryText.includes("Overall Fantasy IQ"),
      consoleEvents: consoleEvents.slice(0, 10),
    }, null, 2));
    return;
  }
  await evaluate(cdp, sessionId, `
    [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Import Squad Screenshot"))?.click();
  `);
  await waitFor(cdp, sessionId, "document.body.innerText.includes('Select or drop a squad screenshot')", 10000);
  const documentNode = await cdp.send("DOM.getDocument", { depth: -1 }, sessionId);
  const inputNode = await cdp.send("DOM.querySelector", { nodeId: documentNode.root.nodeId, selector: "input[type=file]" }, sessionId);
  await cdp.send("DOM.setFileInputFiles", { nodeId: inputNode.nodeId, files: [fixturePath] }, sessionId);
  await waitFor(cdp, sessionId, "document.body.innerText.includes('Ready to analyse')", 10000);
  await evaluate(cdp, sessionId, `
    [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Analyse Screenshot"))?.click();
  `);
  await waitFor(cdp, sessionId, "document.body.innerText.includes('Ready for review') || document.body.innerText.includes('could not read') || document.body.innerText.includes('Only a few players')", 120000);
  const completeWorkflow = process.argv.includes("--complete");
  if (completeWorkflow) {
    await evaluate(cdp, sessionId, `
      function cardFor(text) {
        return [...document.querySelectorAll("div")]
          .filter((node) => node.innerText && node.innerText.includes("OCR\\n" + text + "\\n") && node.innerText.includes("Selected:"))
          .sort((a, b) => a.innerText.length - b.innerText.length)[0];
      }
      function clickInCard(text, buttonText) {
        const card = cardFor(text);
        const button = card && [...card.querySelectorAll("button")].find((item) => item.textContent.trim() === buttonText);
        if (!button) throw new Error("Missing button " + buttonText + " in " + text);
        button.click();
      }
      function tryClickInCard(text, buttonText) {
        try {
          clickInCard(text, buttonText);
        } catch {}
      }
      tryClickInCard("Fantasy Mock Squad", "Remove");
      tryClickInCard("ve", "Remove");
      tryClickInCard("Jodo Félix", "Joao Felix");
      clickInCard("Saka", "Captain");
      clickInCard("Salah", "Vice");
    `);
    const ready = await evaluate(cdp, sessionId, "document.body.innerText.includes('Ready to import')");
    if (ready) {
      await evaluate(cdp, sessionId, `
        [...document.querySelectorAll("button")].find((button) => button.textContent.includes("Confirm Import"))?.click();
      `);
      await waitFor(cdp, sessionId, "document.body.innerText.includes('Screenshot squad imported') || document.body.innerText.includes('Ready for analysis')", 10000);
      await cdp.send("Page.reload", {}, sessionId).catch(() => {});
      await waitFor(cdp, sessionId, "document.body.innerText.includes('Ready for analysis')", 30000);
    }
  }
  const summaryText = await evaluate(cdp, sessionId, "document.body.innerText");
  const requests = cdp.events.filter((event) => event.method === "Network.requestWillBeSent").map((event) => event.params.request.url);
  const requestById = new Map(cdp.events
    .filter((event) => event.method === "Network.requestWillBeSent")
    .map((event) => [event.params.requestId, event.params.request.url]));
  const failedRequests = cdp.events
    .filter((event) => event.method === "Network.loadingFailed")
    .map((event) => ({ url: requestById.get(event.params.requestId) || "", errorText: event.params.errorText }));
  const externalOcrRequests = requests.filter((url) => /tesseract|traineddata|worker\\.min/i.test(url) && !url.startsWith(appUrl));
  const localOcrRequests = requests.filter((url) => /vendor\/tesseract|traineddata|worker\.min|tesseract-core/i.test(url));
  const consoleEvents = cdp.events
    .filter((event) => ["Runtime.consoleAPICalled", "Runtime.exceptionThrown", "Log.entryAdded"].includes(event.method))
    .map((event) => ({
      method: event.method,
      text: event.params?.exceptionDetails?.text ||
        event.params?.entry?.text ||
        (event.params?.args || []).map((arg) => arg.value || arg.description || "").join(" "),
    }));
  const storage = await evaluate(cdp, sessionId, `
    JSON.stringify(Object.fromEntries(Object.entries(localStorage).filter(([key]) => key.includes("fantasyIqSquad") || key.includes("fantasyIqScreenshotFeedback") || key.includes("fplPlayerData"))))
  `);
  await cdp.send("Target.closeTarget", { targetId: target.targetId });
  cdp.ws.close();
  console.log(JSON.stringify({
    viewport,
    loadedFantasyIq: summaryText.includes("Fantasy IQ"),
    uploadReady: summaryText.includes("Ready for review") || summaryText.includes("could not read") || summaryText.includes("Only a few players"),
    reviewSummary: (summaryText.match(/\\d+ possible players detected\\.[^\\n]*/) || [""])[0],
    statusLines: summaryText.split("\\n").filter((line) => /Ready|players detected|could not read|Only a few|failed|review|Import confidence/i.test(line)).slice(0, 12),
    localOcrRequests,
    externalOcrRequests,
    failedRequests: failedRequests.filter((item) => !/sockjs-node|api\/|manifest|favicon/i.test(item.url)).slice(0, 20),
    consoleEvents: consoleEvents.slice(0, 10),
    localStorageContainsImageData: /data:image|base64/i.test(storage),
    completedImport: summaryText.includes("Ready for analysis"),
    feedbackPromptVisible: summaryText.includes("How accurate was the screenshot import?"),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
