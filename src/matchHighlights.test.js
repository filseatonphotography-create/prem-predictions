const { canShowMatchHighlights } = require("./matchHighlights");
const { CHANNELS, matchesFixture, normalizeVideo, createMatchHighlightsService } = require("../matchHighlightsService");

const kickoff = "2026-11-07T15:00:00Z";
const nowMs = Date.parse("2026-11-08T12:00:00Z");
const fixture = { id: 1, homeTeam: "Manchester United FC", awayTeam: "Arsenal FC", kickoff };
const video = { videoId: "Abcdef123_-", channelId: CHANNELS[0].id, channelName: CHANNELS[0].name,
  title: "Man Utd 2-1 Arsenal | Premier League HIGHLIGHTS", publishedAt: "2026-11-07T18:00:00Z", retrievedAt: nowMs };
const finished = { status: "FINISHED" };
const score = { homeGoals: 2, awayGoals: 1 };
const response = items => ({ ok: true, json: async () => ({ items }) });
function youtubeMock() {
  return jest.fn(async url => {
    const parsed = new URL(url);
    if (parsed.pathname.endsWith("/channels")) return response(CHANNELS.map((channel, i) => ({ id: channel.id, contentDetails: { relatedPlaylists: { uploads: `uploads-${i}` } } })));
    const index = Number(parsed.searchParams.get("playlistId").split("-")[1]);
    return response(index === 0 ? [{ snippet: { title: video.title, videoOwnerChannelId: CHANNELS[0].id }, contentDetails: { videoId: video.videoId, videoPublishedAt: video.publishedAt } }] : []);
  });
}

test.each([video.title, "Arsenal v Manchester United | Highlights", "EXTENDED HIGHLIGHTS: Manchester United 2 – 1 Arsenal"])("matches the fixture using both teams and publication time: %s", title => {
  expect(matchesFixture({ ...video, title }, fixture)).toBe(true);
});

test.each([
  { title: "Man City 2-1 Arsenal | Highlights" },
  { title: "Man Utd and Arsenal interviews | Highlights roundup" },
  { title: "Man Utd 2-1 Arsenal | Women's highlights" },
  { title: "Man Utd 2-1 Arsenal | WSL highlights" },
  { title: "Man Utd v Arsenal | First half highlights" },
  { title: "Man Utd 2-1 Arsenal | U21 highlights" },
  { title: "Man Utd 2-1 Arsenal | Classic highlights" },
  { title: "Man Utd 2-1 Arsenal | Friendly highlights" },
  { title: "Man Utd v Arsenal | Preview" },
  { channelId: "untrusted-channel" },
  { publishedAt: "2026-11-07T14:00:00Z" },
  { publishedAt: "2026-11-12T18:00:00Z" },
  { publishedAt: "invalid" },
])("rejects unrelated, unofficial or incorrectly dated videos: %p", changes => {
  expect(matchesFixture({ ...video, ...changes }, fixture)).toBe(false);
});

test("live and postponed scores do not count as full time, while old recorded results can", () => {
  expect(canShowMatchHighlights(fixture, score, { status: "IN_PLAY" }, nowMs)).toBe(false);
  expect(canShowMatchHighlights(fixture, score, { status: "POSTPONED" }, nowMs)).toBe(false);
  expect(canShowMatchHighlights(fixture, score, {}, nowMs)).toBe(true);
  expect(canShowMatchHighlights(fixture, {}, {}, nowMs)).toBe(false);
  expect(canShowMatchHighlights(fixture, score, {}, Date.parse(kickoff) + 60000)).toBe(false);
});

test("video metadata must belong to the official publisher and have a usable YouTube ID", () => {
  expect(normalizeVideo({ snippet: { videoOwnerChannelId: "other" }, contentDetails: { videoId: video.videoId } }, CHANNELS[0], nowMs)).toBeNull();
  expect(normalizeVideo({ snippet: { videoOwnerChannelId: CHANNELS[0].id }, contentDetails: { videoId: "javascript:alert(1)" } }, CHANNELS[0], nowMs)).toBeNull();
});

test("concurrent fixture requests share one catalogue fetch, cache it and persist it without credentials", async () => {
  const fetchImpl = youtubeMock(), writeCache = jest.fn();
  const service = createMatchHighlightsService({ apiKey: "test-only-key", fetchImpl, writeCache, now: () => nowMs });
  const [first, second] = await Promise.all([service.forFixture(fixture, score, finished), service.forFixture(fixture, score, finished)]);
  expect(first.status).toBe("available");
  expect(second).toEqual(first);
  expect(first.videos[0]).toEqual({ videoId: video.videoId, title: video.title, channelName: video.channelName });
  expect(fetchImpl).toHaveBeenCalledTimes(4);
  await service.forFixture(fixture, score, finished);
  expect(fetchImpl).toHaveBeenCalledTimes(4);
  expect(JSON.stringify(writeCache.mock.calls)).not.toContain("test-only-key");
  expect(JSON.stringify(first)).not.toContain("test-only-key");
  expect(fetchImpl.mock.calls.every(([url]) => !url.includes("/search"))).toBe(true);
});

test("no API calls are made before full time or without a configured key", async () => {
  const fetchImpl = jest.fn();
  const disabled = createMatchHighlightsService({ fetchImpl, now: () => nowMs });
  expect(await disabled.forFixture(fixture, score, finished)).toEqual({ status: "unavailable", videos: [] });
  const enabled = createMatchHighlightsService({ apiKey: "test-only", fetchImpl, now: () => nowMs });
  expect(await enabled.forFixture(fixture, score, { status: "IN_PLAY" })).toEqual({ status: "pending", videos: [] });
  expect(fetchImpl).not.toHaveBeenCalled();
});

test("source failure preserves unexpired saved highlights and backs off repeated requests", async () => {
  const fetchImpl = jest.fn(async () => { throw new Error("Network failure"); });
  const service = createMatchHighlightsService({ apiKey: "test-only", fetchImpl, readCache: () => ({ videos: [video] }), now: () => nowMs });
  expect((await service.forFixture(fixture, score, finished)).status).toBe("available");
  await service.forFixture(fixture, score, finished);
  expect(fetchImpl).toHaveBeenCalledTimes(1);
});

test("expired API metadata is never returned on source failure", async () => {
  const service = createMatchHighlightsService({ apiKey: "test-only", fetchImpl: async () => ({ ok: false, status: 403 }),
    readCache: () => ({ videos: [{ ...video, retrievedAt: nowMs - 29 * 86400000 }] }), now: () => nowMs });
  expect(await service.forFixture(fixture, score, finished)).toEqual({ status: "error", videos: [] });
});

test("kickoff overrides are used when matching rescheduled fixtures", async () => {
  const service = createMatchHighlightsService({ apiKey: "test-only", fetchImpl: youtubeMock(), now: () => nowMs });
  const moved = { ...fixture, kickoff: "2026-10-01T15:00:00Z" };
  expect((await service.forFixture(moved, score, { ...finished, utcDate: kickoff })).status).toBe("available");
});

test("the public endpoint resolves fixtures on the server and returns a cacheable highlights response", async () => {
  const fs = require("fs"), vm = require("vm");
  const source = fs.readFileSync("server.js", "utf8");
  const start = source.indexOf("const highlightsService = createMatchHighlightsService(");
  const end = source.indexOf("// Public: return latest results snapshot", start);
  let route, handler;
  const forFixture = jest.fn(async () => ({ status: "available", videos: [video] }));
  vm.runInNewContext(source.slice(start, end), {
    app: { get: (path, callback) => { route = path; handler = callback; } },
    createMatchHighlightsService: () => ({ forFixture }), process: { env: {} },
    loadFixturesFromSrc: () => [fixture], loadResults: () => ({ 1: score }), loadMatchStates: () => ({ 1: finished }),
  });
  const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis(), setHeader: jest.fn() };
  expect(route).toBe("/api/fixtures/:fixtureId/highlights");
  await handler({ params: { fixtureId: "999" } }, res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(forFixture).not.toHaveBeenCalled();
  await handler({ params: { fixtureId: "1" } }, res);
  expect(forFixture).toHaveBeenCalledWith(fixture, score, finished);
  expect(res.setHeader).toHaveBeenCalledWith("Cache-Control", "public, max-age=300");
  forFixture.mockRejectedValueOnce(new Error("Failure"));
  await handler({ params: { fixtureId: "1" } }, res);
  expect(res.status).toHaveBeenCalledWith(503);
});
