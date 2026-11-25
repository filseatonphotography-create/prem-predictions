const backend = 'https://prem-predictions-1.onrender.com';
const headers = { 'Cache-Control': 'private, no-store' };

export default async function handler(request, context) {
  const fixtureId = new URL(request.url).searchParams.get('fixtureId');
  if (!/^cl:\d+$/.test(fixtureId || '')) {
    return Response.json({ status: 'error', videos: [] }, { status: 400, headers });
  }
  const url = new URL(`/api/fixtures/${encodeURIComponent(fixtureId)}/highlights`, backend);
  const country = context.geo?.country?.code;
  if (/^[A-Z]{2}$/.test(country || '')) url.searchParams.set('country', country);
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error('Highlights unavailable');
    return Response.json(await response.json(), { headers });
  } catch {
    return Response.json({ status: 'error', videos: [] }, { status: 502, headers });
  }
}
