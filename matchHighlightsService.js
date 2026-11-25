const { canShowMatchHighlights } = require("./src/matchHighlights");

// Official club channels for Premier League matches.
const CHANNELS = [
  { id: "UC6yW44UGJJBvYTlfC7CRg2Q", name: "Manchester United", handle: "ManUtd" },
  { id: "UCpryVRk_VDudG8SHXgWcG0w", name: "Arsenal", handle: "Arsenal" },
  { id: "UCkzCjdRMrW2vXLx8mvPVLdQ", name: "Manchester City", handle: "mancity" },
  { id: "UC2VLfz92cTT8jHIFOecC-LA", name: "Fulham", handle: "fulhamfc" },
  { id: "UCtK4QAczAN2mt2ow_jlGinQ", name: "Everton", handle: "everton" },
  { id: "UC9LQwHZoucFT94I2h6JOcjw", name: "Liverpool", handle: "LiverpoolFC" },
  { id: "UCICNP0mvtr0prFwGUQIABfQ", name: "Aston Villa", handle: "avfcofficial" },
  { id: "UCf-cpC9WAdOsas19JHipukA", name: "Brighton & Hove Albion", handle: "officialbhafc" },
  { id: "UCAalMUm3LIf504ItA3rqfug", name: "Brentford", handle: "BrentfordFC" },
  { id: "UCU2PacFf99vhb3hNiYDmxww", name: "Chelsea", handle: "ChelseaFC" },
  { id: "UCWB9N0012fG6bGyj486Qxmg", name: "Crystal Palace", handle: "OfficialCPFC" },
  { id: "UCch_NWdo3JWKngAyO9XlycA", name: "Coventry City", handle: "CoventryCityFC" },
  { id: "UC8MRV5E-Bi5qWomGjOF0ZQg", name: "Hull City", handle: "hullcityofficial" },
  { id: "UCjNwxJec96lMWgCXjEDhXgQ", name: "Ipswich Town", handle: "IpswichTown" },
  { id: "UCyQcJHDN4uYfPa1DHzKVSnw", name: "Leeds United", handle: "LeedsUnited" },
  { id: "UCywGl_BPp9QhD0uAcP2HsJw", name: "Newcastle United", handle: "NUFC" },
  { id: "UCyAxjuAr8f_BFDGCO3Htbxw", name: "Nottingham Forest", handle: "NottinghamForestFC" },
  { id: "UCrw-7k6yJc0EMJdf-0BAkoQ", name: "Sunderland", handle: "SunderlandAFC" },
  { id: "UCEg25rdRZXg32iwai6N6l0w", name: "Tottenham Hotspur", handle: "TottenhamHotspur" },
  { id: "UCeOCuVSSweaEj6oVtJZEKQw", name: "Bournemouth", handle: "afcbournemouth" },
];
const CHAMPIONS_CHANNELS = [
  { id: "UCWV3obpZVGgJ3j9FVhEjF2Q", name: "Real Madrid" },
  { id: "UC_2ynsXrRrKP8zYrU7Hc06A", name: "PSV" },
  { id: "UC14UlmYlSNiQCBe9Eookf_A", name: "Barcelona" },
  { id: "UCZkcxFIsqW5htimoUQKA0iA", name: "Bayern München" },
  { id: "UCt9a_qP9CqHCNwilf-iULag", name: "Paris Saint-Germain" },
  { id: "UCvXzEblUa0cfny4HAJ_ZOWw", name: "Inter" },
  { id: "UCK8rTVgp3-MebXkmeJcQb1Q", name: "Borussia Dortmund" },
  { id: "UCET00YnetHT7tOpu12v8jxg", name: "CBS Sports Golazo", broadcaster: true, english: true },
  { id: "UC4i_9WvfPRTuRWEaWyfKuFw", name: "TNT Sports Football", broadcaster: true, english: true },
];
const allChannels = [...CHANNELS, ...CHAMPIONS_CHANNELS];
const REFRESH_MS = 30 * 60 * 1000;
const RETENTION_MS = 28 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[øØ]/g, "o")
    .toLowerCase().replace(/&amp;/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
}

function teamAliases(name, champions = false) {
  const team = normalize(name)
    .replace(champions ? /\b(afc|cf|club|fc|fk|kv|osc|sk|ssc|vfb)\b/g : /\b(fc|afc)\b/g, "")
    .replace(/\s+/g, " ").trim();
  const aliases = {
    "manchester united": ["man utd", "man united"], "manchester city": ["man city"],
    "tottenham hotspur": ["tottenham", "spurs"], "wolverhampton wanderers": ["wolves"],
    "nottingham forest": ["nottm forest", "nott m forest"], "newcastle united": ["newcastle"],
    "west ham united": ["west ham"], "brighton hove albion": ["brighton", "brighton and hove albion"],
    "brighton and hove albion": ["brighton"], "leeds united": ["leeds"],
    "ipswich town": ["ipswich"], "coventry city": ["coventry"], "hull city": ["hull"],
  };
  const europeanAliases = {
    "as roma": ["roma"], "atletico de madrid": ["atletico madrid", "atleti"],
    "bayern munchen": ["bayern munich", "bayern"], "borussia dortmund": ["dortmund", "b dortmund"],
    "como 1907": ["como"], "feyenoord rotterdam": ["feyenoord"],
    "internazionale milano": ["inter milan", "inter"], "lask linz": ["lask"],
    "pae aek": ["aek athens", "aek"], "paris saint germain": ["psg", "paris"],
    "psv": ["psv eindhoven"],
    "racing de lens": ["lens", "rc lens"], "rb leipzig": ["leipzig"],
    "real betis balompie": ["real betis", "betis"], "slovan bratislava": ["s bratislava"],
    "sporting clube de portugal": ["sporting cp", "sporting lisbon", "sporting"],
    "villarreal": ["villareal"],
  };
  return [team, ...(aliases[team] || []), ...(champions ? europeanAliases[team] || [] : [])].filter(Boolean);
}

const europeanHighlightTitle = /\b(highlights?|resumen|resumo|samenvatting|hoogtepunten|ozet|zusammenfassung)\b/;
function matchesFixture(video, fixture) {
  const champions = fixture.competition === "champions";
  const channel = (champions ? allChannels : CHANNELS).find(channel => channel.id === video.channelId);
  const homeAliases = teamAliases(fixture.homeTeam, champions), awayAliases = teamAliases(fixture.awayTeam, champions);
  if (!channel || (!channel.broadcaster && ![...homeAliases, ...awayAliases].includes(normalize(channel.name)))) return false;
  const publishedMs = Date.parse(video.publishedAt), kickoffMs = Date.parse(fixture.kickoff);
  if (!Number.isFinite(publishedMs) || !Number.isFinite(kickoffMs)
    || publishedMs < kickoffMs + 90 * 60 * 1000 || publishedMs > kickoffMs + 3 * DAY_MS) return false;
  const rawTitle = String(video.title || "");
  const title = normalize(champions ? rawTitle.replace(/(\p{L})\s+[-–—]\s+(?=\p{L})/gu, "$1 v ") : rawTitle);
  if (!(champions ? europeanHighlightTitle : /\bhighlights?\b/).test(title)
    || /\b(women|womens|ladies|wsl|u18|u19|u21|u23|under 18|under 21|youth|academy|classic|classics|retro|throwback|friendly|friendlies|preseason|simulation|efootball|fifa|preview|prediction|predictions|watchalong|first half|half time)\b/.test(title)) return false;
  // Require a fixture-style pairing, rather than just both clubs appearing
  // somewhere in a roundup or an interview title.
  return homeAliases.some(home => awayAliases.some(away => {
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

function isPublicVideo(video, nowMs) {
  const availability = video.availability;
  return availability && Number.isFinite(availability.checkedAt)
    && nowMs - availability.checkedAt < DAY_MS && availability.checkedAt <= nowMs
    && availability.privacyStatus === "public" && availability.uploadStatus === "processed"
    && !availability.ageRestricted;
}

function isPlayableInCountry(video, country, nowMs) {
  if (!isPublicVideo(video, nowMs)) return false;
  const restrictions = video.availability.regionRestriction || {};
  if (Array.isArray(restrictions.allowed) && !restrictions.allowed.includes(country)) return false;
  return !Array.isArray(restrictions.blocked) || !restrictions.blocked.includes(country);
}

function isEnglishHighlight(video) {
  const { audioLanguage, titleLanguage } = video.availability;
  if (typeof audioLanguage !== "string") return false;
  const english = language => /^en(?:[-_]|$)/i.test(language);
  if (audioLanguage) return english(audioLanguage);
  if (titleLanguage && !english(titleLanguage)) return false;
  return CHANNELS.some(channel => channel.id === video.channelId)
    || CHAMPIONS_CHANNELS.some(channel => channel.id === video.channelId && channel.english);
}

function pickChampionsVideo(candidates, viewerCountry, nowMs) {
  const country = /^[A-Z]{2}$/.test(viewerCountry) ? viewerCountry : "";
  const unrestricted = video => {
    const { allowed, blocked } = video.availability.regionRestriction || {};
    return !Array.isArray(allowed) && !blocked?.length;
  };
  const eligible = candidates.filter(video => video.availability?.ageRestricted === false
    && isPublicVideo(video, nowMs) && isEnglishHighlight(video)
    && (country ? isPlayableInCountry(video, country, nowMs) : unrestricted(video)));
  return eligible.find(unrestricted) || eligible[0];
}

function createMatchHighlightsService({ apiKey = "", country = "VN", fetchImpl = global.fetch, readCache = () => ({}), writeCache = () => {}, now = Date.now } = {}) {
  const saved = readCache() || {};
  let videos = Array.isArray(saved.videos) ? saved.videos : [];
  let checkedAt = 0, pending = null, failed = false, championsFailed = false;
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
    return videos.filter(video => allChannels.some(channel => channel.id === video.channelId)
      && Number(video.retrievedAt) > cutoff && /^[\w-]{11}$/.test(video.videoId || ""));
  }

  async function refresh() {
    if (!apiKey) return;
    if (pending) return pending;
    if (checkedAt && now() - checkedAt < REFRESH_MS) return;
    pending = (async () => {
      const collected = [];
      let clubErrors = 0, championsErrors = 0;
      try {
        if (playlists.size !== allChannels.length) {
          const channels = await api("channels", { part: "contentDetails", id: allChannels.map(channel => channel.id).join(",") });
          channels.forEach(channel => {
            if (allChannels.some(allowed => allowed.id === channel.id) && channel.contentDetails?.relatedPlaylists?.uploads) {
              playlists.set(channel.id, channel.contentDetails.relatedPlaylists.uploads);
            }
          });
        }
        const results = await Promise.allSettled(allChannels.map(async channel => {
          const playlistId = playlists.get(channel.id);
          if (!playlistId) throw new Error("Official uploads playlist unavailable");
          const items = await api("playlistItems", { part: "snippet,contentDetails", playlistId, maxResults: 50 });
          return items.map(item => normalizeVideo(item, channel, now())).filter(Boolean);
        }));
        results.forEach((result, index) => {
          if (result.status === "fulfilled") collected.push(...result.value);
          else if (index < CHANNELS.length) clubErrors += 1;
          else championsErrors += 1;
        });
        const catalogue = new Map(currentVideos().map(video => [video.videoId, video]));
        collected.filter(video => europeanHighlightTitle.test(normalize(video.title))).forEach(video => {
          catalogue.set(video.videoId, { ...catalogue.get(video.videoId), ...video });
        });
        const candidates = [...catalogue.values()];
        const batches = [];
        for (let index = 0; index < candidates.length; index += 50) batches.push(candidates.slice(index, index + 50));
        // YouTube reports country allow/block lists on the videos resource.
        // Unknown availability is never treated as confirmation of playback.
        const checks = await Promise.allSettled(batches.map(async batch => {
          const details = await api("videos", {
            part: "contentDetails,status,snippet",
            fields: "items(id,contentDetails(contentRating,regionRestriction),status(privacyStatus,uploadStatus),snippet(defaultAudioLanguage,defaultLanguage))",
            id: batch.map(video => video.videoId).join(","),
          });
          const byId = new Map(details.map(detail => [detail.id, detail]));
          batch.forEach(video => {
            const detail = byId.get(video.videoId);
            video.availability = { checkedAt: now(), privacyStatus: detail?.status?.privacyStatus || "unavailable",
              uploadStatus: detail?.status?.uploadStatus || "unavailable",
              ageRestricted: detail?.contentDetails?.contentRating?.ytRating === "ytAgeRestricted",
              audioLanguage: detail?.snippet?.defaultAudioLanguage || "",
              titleLanguage: detail?.snippet?.defaultLanguage || "",
              regionRestriction: detail?.contentDetails?.regionRestriction || {} };
          });
        }));
        const availabilityFailed = checks.some(result => result.status === "rejected");
        videos = candidates
          .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt)).slice(0, 2000);
        // Keep the recent catalogue across restarts, and expire API metadata
        // within 30 days. A transient source failure preserves unexpired items.
        writeCache({ videos });
        failed = clubErrors > 0 || availabilityFailed;
        championsFailed = failed || championsErrors > 0;
      } catch {
        failed = true;
        championsFailed = true;
      } finally {
        checkedAt = now();
      }
    })();
    try { await pending; } finally { pending = null; }
  }

  async function forFixture(fixture, score = {}, state = {}, { viewerCountry = "" } = {}) {
    if (!canShowMatchHighlights(fixture, score, state, now())) return { status: "pending", videos: [] };
    if (!apiKey) return { status: "unavailable", videos: [] };
    await refresh();
    const effectiveFixture = { ...fixture, kickoff: state.utcDate || fixture.kickoff };
    const candidates = currentVideos().filter(video => matchesFixture(video, effectiveFixture));
    const champions = fixture.competition === "champions";
    const clip = champions ? pickChampionsVideo(candidates, viewerCountry, now()) : null;
    const matched = champions
      ? clip ? [{ videoId: clip.videoId, title: clip.title, channelName: clip.channelName, language: "en" }] : []
      : candidates.filter(video => isPlayableInCountry(video, String(country).toUpperCase(), now())).slice(0, 1)
        .map(({ videoId, title, channelName }) => ({ videoId, title, channelName }));
    const lookupFailed = fixture.competition === "champions" ? championsFailed : failed;
    return { status: matched.length ? "available" : lookupFailed ? "error" : "empty", videos: matched };
  }

  return { forFixture, refresh };
}

module.exports = { CHANNELS, CHAMPIONS_CHANNELS, matchesFixture, normalizeVideo, isPlayableInCountry, createMatchHighlightsService };
