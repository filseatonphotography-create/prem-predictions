const { canShowMatchHighlights } = require("./src/matchHighlights");

// Verified against the official channel pages. Only these publishers can appear
// as official highlights; never search across arbitrary YouTube uploads.
const CHANNELS = [
  { id: "UCNAf1k0yIjyGu3k9BwAg3lg", name: "Sky Sports Premier League" },
  { id: "UCqZQlzSHbVJrwrn5XvzrzcA", name: "NBC Sports" },
  { id: "UCG5qGWdu8nIRZqJ_GgDwQ-w", name: "Premier League" },
];
const REFRESH_MS = 30 * 60 * 1000;
const RETENTION_MS = 28 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/&amp;/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function teamAliases(name) {
  const team = normalize(name).replace(/\b(fc|afc)\b/g, "").replace(/\s+/g, " ").trim();
  const aliases = {
    "manchester united": ["man utd", "man united"], "manchester city": ["man city"],
    "tottenham hotspur": ["tottenham", "spurs"], "wolverhampton wanderers": ["wolves"],
    "nottingham forest": ["nottm forest", "nott m forest"], "newcastle united": ["newcastle"],
    "west ham united": ["west ham"], "brighton hove albion": ["brighton", "brighton and hove albion"],
    "brighton and hove albion": ["brighton"], "leeds united": ["leeds"],
    "ipswich town": ["ipswich"], "coventry city": ["coventry"], "hull city": ["hull"],
  };
  return [team, ...(aliases[team] || [])].filter(Boolean);
}

function matchesFixture(video, fixture) {
  if (!CHANNELS.some(channel => channel.id === video.channelId)) return false;
  const publishedMs = Date.parse(video.publishedAt), kickoffMs = Date.parse(fixture.kickoff);
  if (!Number.isFinite(publishedMs) || !Number.isFinite(kickoffMs)
    || publishedMs < kickoffMs + 90 * 60 * 1000 || publishedMs > kickoffMs + 3 * DAY_MS) return false;
  const title = normalize(video.title);
  if (!/\bhighlights?\b/.test(title)
    || /\b(women|womens|ladies|wsl|u18|u19|u21|u23|under 18|under 21|youth|academy|classic|classics|retro|throwback|friendly|friendlies|preseason|simulation|efootball|fifa|preview|prediction|predictions|watchalong|first half|half time)\b/.test(title)) return false;
  // Require a fixture-style pairing, rather than just both clubs appearing
  // somewhere in a roundup or an interview title.
  return teamAliases(fixture.homeTeam).some(home => teamAliases(fixture.awayTeam).some(away => {
    const separator = "(?:v|vs|versus|[0-9]+(?: [0-9]+)?)";
    return new RegExp(`\\b(?:${home} ${separator} ${away}|${away} ${separator} ${home})\\b`).test(title);
  }));
}

function normalizeVideo(item, channel, retrievedAt) {
  const snippet = item.snippet || {}, details = item.contentDetails || {};
  const videoId = details.videoId || snippet.resourceId?.videoId;
  if (!/^[\w-]{11}$/.test(videoId || "") || snippet.videoOwnerChannelId !== channel.id) return null;
  return { videoId, channelId: channel.id, channelName: channel.name, title: String(snippet.title || ""),
    publishedAt: details.videoPublishedAt || snippet.publishedAt, retrievedAt };
}

function createMatchHighlightsService({ apiKey = "", fetchImpl = global.fetch, readCache = () => ({}), writeCache = () => {}, now = Date.now } = {}) {
  const saved = readCache() || {};
  let videos = Array.isArray(saved.videos) ? saved.videos : [];
  let checkedAt = 0, pending = null, failed = false;
  const playlists = new Map();

  async function api(resource, params) {
    const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
    Object.entries({ ...params, key: apiKey }).forEach(([key, value]) => url.searchParams.set(key, value));
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6000);
    try {
      const response = await fetchImpl(url.href, { signal: controller.signal });
      if (!response.ok) throw new Error(`YouTube request failed (${response.status})`);
      const data = await response.json();
      if (!Array.isArray(data.items)) throw new Error("Invalid YouTube response");
      return data.items;
    } finally { clearTimeout(timer); }
  }

  function currentVideos() {
    const cutoff = now() - RETENTION_MS;
    return videos.filter(video => Number(video.retrievedAt) > cutoff && /^[\w-]{11}$/.test(video.videoId || ""));
  }

  async function refresh() {
    if (!apiKey) return;
    if (pending) return pending;
    if (checkedAt && now() - checkedAt < REFRESH_MS) return;
    pending = (async () => {
      const collected = [];
      let errors = 0;
      try {
        if (playlists.size !== CHANNELS.length) {
          const channels = await api("channels", { part: "contentDetails", id: CHANNELS.map(channel => channel.id).join(",") });
          channels.forEach(channel => {
            if (CHANNELS.some(allowed => allowed.id === channel.id) && channel.contentDetails?.relatedPlaylists?.uploads) {
              playlists.set(channel.id, channel.contentDetails.relatedPlaylists.uploads);
            }
          });
        }
        const results = await Promise.allSettled(CHANNELS.map(async channel => {
          const playlistId = playlists.get(channel.id);
          if (!playlistId) throw new Error("Official uploads playlist unavailable");
          const items = await api("playlistItems", { part: "snippet,contentDetails", playlistId, maxResults: 50 });
          return items.map(item => normalizeVideo(item, channel, now())).filter(Boolean);
        }));
        results.forEach(result => {
          if (result.status === "fulfilled") collected.push(...result.value);
          else errors += 1;
        });
        videos = [...new Map([...currentVideos(), ...collected].map(video => [video.videoId, video])).values()]
          .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 2000);
        // Keep the recent catalogue across restarts, and expire API metadata
        // within 30 days. A transient source failure preserves unexpired items.
        writeCache({ videos });
        failed = errors > 0;
      } catch {
        failed = true;
      } finally {
        checkedAt = now();
      }
    })();
    try { await pending; } finally { pending = null; }
  }

  async function forFixture(fixture, score = {}, state = {}) {
    if (!canShowMatchHighlights(fixture, score, state, now())) return { status: "pending", videos: [] };
    if (!apiKey) return { status: "unavailable", videos: [] };
    await refresh();
    const effectiveFixture = { ...fixture, kickoff: state.utcDate || fixture.kickoff };
    const matched = currentVideos().filter(video => matchesFixture(video, effectiveFixture)).slice(0, 3)
      .map(({ videoId, title, channelName }) => ({ videoId, title, channelName }));
    return { status: matched.length ? "available" : failed ? "error" : "empty", videos: matched };
  }

  return { forFixture, refresh };
}

module.exports = { CHANNELS, matchesFixture, normalizeVideo, createMatchHighlightsService };
