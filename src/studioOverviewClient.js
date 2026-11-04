async function boundedOverview(url, parentSignal, timeoutMs) {
  const controller = new AbortController();
  let timer, abort;
  const deadline = new Promise((_, reject) => {
    abort = () => { controller.abort(); reject(new DOMException('Aborted', 'AbortError')); };
    parentSignal?.addEventListener('abort', abort, { once: true });
    if (parentSignal?.aborted) abort();
    timer = setTimeout(() => { controller.abort(); reject(new Error('Fixtures are taking longer to load. Please retry.')); }, timeoutMs);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetch(url, { signal: controller.signal });
      const data = await response.json();
      if (!response.ok || !Array.isArray(data.matches)) throw new Error('Fixture updates are temporarily unavailable.');
      return data;
    })()]);
  } finally { clearTimeout(timer); parentSignal?.removeEventListener('abort', abort); }
}

export async function fetchStudioOverview(base, { signal, timeoutMs = 10000, preferSameOrigin = !['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) } = {}) {
  const backend = `${base}/api/live-studio/matches?competition=champions&summary=1`;
  const endpoints = preferSameOrigin ? ['/.netlify/functions/studio-overview', backend] : [backend];
  let error;
  for (const url of endpoints) {
    try { return await boundedOverview(url, signal, timeoutMs); }
    catch (err) { if (signal?.aborted) throw err; error = err; }
  }
  throw error;
}
