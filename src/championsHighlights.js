export const UEFA_HIGHLIGHTS = 'https://www.uefa.com/uefachampionsleague/video/highlights/';
const videoPath = /^\/uefachampionsleague\/video\/highlights\/[\da-f]+(?:-[\da-f]+)+--([^/]+)\/$/i;
const clubAliases = {
  'atletico-de-madrid': ['atleti', 'atletico-madrid'],
  'bayern-munchen': ['bayern', 'bayern-munich'],
  'borussia-dortmund': ['b-dortmund', 'dortmund'],
  'como-1907': ['como'],
  'feyenoord-rotterdam': ['feyenoord'],
  'internazionale-milano': ['inter', 'inter-milan'],
  'lask-linz': ['lask'],
  'manchester-city': ['man-city'],
  'manchester-united': ['man-utd', 'man-united'],
  'pae-aek': ['aek', 'aek-athens'],
  'paris-saint-germain': ['paris', 'psg'],
  'racing-de-lens': ['lens', 'rc-lens'],
  'rb-leipzig': ['leipzig'],
  'real-betis-balompie': ['real-betis', 'betis'],
  'slovan-bratislava': ['s-bratislava'],
  'sporting-clube-de-portugal': ['sporting', 'sporting-cp'],
};
function aliases(name) {
  const slug = String(name || '').toLowerCase().replace(/ø/g, 'o').normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '').replace(/\b(?:afc|cf|club|fc|fk|kv|osc|sk|ssc|vfb)\b/g, '')
    .trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  return slug ? [slug, ...(clubAliases[slug] || [])] : [];
}

export function findChampionsHighlight(highlights, match) {
  const kickOff = Date.parse(match.utcDate);
  if (!Number.isFinite(kickOff)) return null;
  const home = aliases(match.homeTeam?.name), away = aliases(match.awayTeam?.name);
  for (const clip of highlights) {
    const elapsed = clip.publishedAt - kickOff;
    if (!Number.isFinite(elapsed) || elapsed < 90 * 60000 || elapsed > 3 * 86400000) continue;
    const slug = clip.path?.match(videoPath)?.[1]?.replace(/^champions?-league-highlights-/, '');
    if (!slug) continue;
    const paired = home.some(first => away.some(second =>
      new RegExp(`^${first}-(?:\\d+-\\d+|vs?|versus)-${second}$`).test(slug)));
    if (paired) return {
      url: new URL(clip.path, UEFA_HIGHLIGHTS).href,
      thumbnail: /^https:\/\/editorial\.uefa\.com\/resources\//.test(clip.thumbnail || '') ? clip.thumbnail : '',
    };
  }
  return null;
}

let cached, pending;
export function loadChampionsHighlights() {
  if (cached && Date.now() < cached.expires) return Promise.resolve(cached.highlights);
  if (!pending) {
    const endpoint = '/.netlify/functions/champions-highlights';
    const local = ['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 10000);
    pending = fetch(local ? `https://predictionaddiction.net${endpoint}` : endpoint, { signal: controller.signal })
      .then(async response => {
        if (!response.ok) throw new Error('Highlights unavailable');
        const { highlights } = await response.json();
        if (!Array.isArray(highlights)) throw new Error('Invalid highlights response');
        cached = { highlights, expires: Date.now() + 5 * 60000 };
        return highlights;
      })
      .finally(() => { clearTimeout(timer); pending = null; });
  }
  return pending;
}
