const fs = require("fs");
const vm = require("vm");
const { shouldPushMatchEvent, isMeaningfulFixturePush, numeric } = require("./liveMatchEvents");

function dispatcher() {
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("async function sendFixtureUpdateNotification(");
  const end = source.indexOf("\nfunction findFixtureById(", start);
  const send = jest.fn(async () => true);
  const reserve = jest.fn(() => true);
  const finish = jest.fn();
  const context = {
    shouldPushMatchEvent, isMeaningfulFixturePush,
    isPushTypeEnabled: () => true, getPushNotificationPrefs: () => ({}), hasFixtureNotificationEnabled: () => true,
    reserveFixtureNotificationEvent: reserve, finishFixtureNotificationEvent: finish,
    maybeApplyNoSpoilerFixturePayload: (_user, _fixture, _kind, _key, payload) => payload,
    buildLiveStudioUrl: () => "/?view=liveStudio", sendPushNotification: send,
  };
  vm.createContext(context);
  vm.runInContext(`${source.slice(start, end)}; this.dispatch = sendFixtureUpdateNotification;`, context);
  return { dispatch: context.dispatch, send, reserve, finish };
}

test.each(["substitution", "yellow-card", "red-card"])("the actual notification dispatcher blocks %s for both subscriber paths", async kind => {
  const { dispatch, send, reserve } = dispatcher();
  expect(await dispatch("user", "57", kind, "event", { title: "Should not send" })).toBe(false);
  expect(send).not.toHaveBeenCalled();
  expect(reserve).not.toHaveBeenCalled();
});

test("the dispatcher still sends goals and links them to Live Studio", async () => {
  const { dispatch, send } = dispatcher();
  expect(await dispatch("user", "57", "goal", "1-0", { title: "Goal", body: "Saka · 26'" })).toBe(true);
  expect(send).toHaveBeenCalledWith("user", "liveUpdates", expect.objectContaining({ body: "Saka · 26'", url: "/?view=liveStudio" }));
});


test("blocks the reported vague Maeda update without reserving or sending it", async () => {
  const { dispatch, send, reserve } = dispatcher();
  const payload = { title: "Update Daizen Maeda Manchester City FC null-null", body: "Manchester City FC v Ipswich Town FC has a new update 21'" };
  expect(await dispatch("user", "560610", "update", "21", payload)).toBe(false);
  expect(send).not.toHaveBeenCalled();
  expect(reserve).not.toHaveBeenCalled();
});

test.each([
  { title: "Goal MCI 1-null IPS", body: "Maeda" },
  { title: "Goal MCI null-null IPS", body: "Maeda" },
  { title: "", body: "" },
  { title: "Goal", body: "" },
])("blocks malformed or empty goal pushes", async payload => {
  const { dispatch, send } = dispatcher();
  expect(await dispatch("user", "560610", "goal", "event", payload)).toBe(false);
  expect(send).not.toHaveBeenCalled();
});

test("the actual score formatter never turns missing scores into null-null", () => {
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("function formatLivePushScore(");
  const end = source.indexOf("\nfunction getLivePushTeamCode(", start);
  const context = { numeric };
  vm.createContext(context);
  vm.runInContext(`${source.slice(start, end)}; this.format = formatLivePushScore;`, context);
  const fixture = { homeTeam: "Manchester City FC", awayTeam: "Ipswich Town FC" };
  expect(context.format(fixture, null, null)).toBe("Manchester City FC v Ipswich Town FC");
  expect(context.format(fixture, 1, 0)).toBe("Manchester City FC 1-0 Ipswich Town FC");
});


test.each(["goal", "goal-disallowed"])("spoiler-free %s alerts still describe the actual event", kind => {
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("function maybeApplyNoSpoilerFixturePayload(");
  const end = source.indexOf("\nfunction getLivePushEventKind(", start);
  const context = {
    getPushNotificationPrefs: () => ({ noSpoilerFixtureUpdates: true }),
    findFixtureById: () => ({ homeTeam: "Man City", awayTeam: "Ipswich" }),
    buildLiveStudioUrl: () => "/?view=liveStudio",
  };
  vm.createContext(context);
  vm.runInContext(`${source.slice(start, end)}; this.transform = maybeApplyNoSpoilerFixturePayload;`, context);
  const payload = context.transform("user", "57", kind, "event", { title: "Goal for MCI 1-0", body: "Maeda · 21'" });
  expect(payload.title).toMatch(/Goal/);
  expect(payload.body).toMatch(kind === "goal" ? /been a goal/ : /ruled out/);
  expect(payload.body).not.toMatch(/Maeda|1-0|Something has happened/);
});


test.each([false, "throw"])("a failed push (%s) releases its reservation for a later retry", async failure => {
  const { dispatch, send, finish } = dispatcher();
  if (failure === "throw") send.mockRejectedValueOnce(new Error("Push service unavailable"));
  else send.mockResolvedValueOnce(false);
  expect(await dispatch("user", "57", "full-time", "2-1", { title: "Full time", body: "Arsenal 2-1 Chelsea" })).toBe(false);
  expect(finish).toHaveBeenCalledWith("user", "57:full-time:2-1", true, false);
});

test("notification reservations retry failed or interrupted sends, and permanently deduplicate accepted sends", () => {
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("function reserveFixtureNotificationEvent(");
  const end = source.indexOf("\nfunction getPushNotificationPrefs(", start);
  let data = {}, now = 1000;
  const context = { PUSH_SUBSCRIPTIONS_FILE: "unused", Date: { now: () => now },
    loadJson: () => JSON.parse(JSON.stringify(data)), saveJson: (_file, next) => { data = next; } };
  vm.runInNewContext(`${source.slice(start, end)}; this.reserve = reserveFixtureNotificationEvent; this.finish = finishFixtureNotificationEvent;`, context);
  const first = context.reserve("user", "ft");
  expect(context.reserve("user", "ft")).toBe(false);
  context.finish("user", "ft", first, false);
  expect(context.reserve("user", "ft")).toBeTruthy();
  now += 61000;
  const retry = context.reserve("user", "ft");
  expect(retry).toBeTruthy();
  context.finish("user", "ft", first, true); // A stale completion cannot claim the newer reservation.
  expect(data.user.notifLog.fixtureUpdates.ft.state).toBe("pending");
  context.finish("user", "ft", retry, true);
  expect(context.reserve("user", "ft")).toBe(false);
});
