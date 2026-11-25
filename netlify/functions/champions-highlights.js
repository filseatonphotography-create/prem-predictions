const UEFA = 'https://www.uefa.com';
const COMPETITION = '/uefachampionsleague/';

function readHighlightCards(html) {
  const cards = new Map();
  const anchors = /<a\b[^>]*\bhref="(\/uefachampionsleague\/video\/highlights\/[\da-f-]+--[a-z\d-]+\/)"[^>]*>([\s\S]*?)<\/a>/gi;
  for (const [, path, content] of html.matchAll(anchors)) {
    const date = content.match(/&quot;targetDate&quot;\s*:\s*&quot;([^"&]*(?:&#x2B;|&#43;)?[^"&]*)&quot;/i)?.[1];
    const publishedAt = Date.parse(date?.replace(/&#(?:x2b|43);/gi, '+'));
    if (!Number.isFinite(publishedAt)) continue;
    const thumbnail = content.match(/\bdata-srcset="(https:\/\/editorial\.uefa\.com\/resources\/[^"\s,]+)/)?.[1];
    cards.set(path, { path, publishedAt, thumbnail });
  }
  return [...cards.values()];
}

exports.handler = async () => {
  const headers = { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 6500);
  try {
    const response = await fetch(UEFA + COMPETITION, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error('UEFA highlights unavailable');
    const highlights = readHighlightCards(await response.text());
    if (!highlights.length) throw new Error('No published video cards found');
    return { statusCode: 200, headers: { ...headers, 'Cache-Control': 'public, max-age=300, s-maxage=600' },
      body: JSON.stringify({ highlights }) };
  } catch {
    return { statusCode: 502, headers: { ...headers, 'Cache-Control': 'no-store' }, body: JSON.stringify({ highlights: [] }) };
  } finally { clearTimeout(timer); }
};

exports.readHighlightCards = readHighlightCards;
