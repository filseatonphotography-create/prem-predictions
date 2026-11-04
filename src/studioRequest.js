export async function studioRequest(url, { timeoutMs = 8000, signal, ...options } = {}) {
  const controller = new AbortController();
  let timer, abort;
  const deadline = new Promise((_, reject) => {
    abort = () => { controller.abort(); reject(new DOMException('Aborted', 'AbortError')); };
    signal?.addEventListener('abort', abort, { once: true });
    if (signal?.aborted) abort();
    timer = setTimeout(() => {
      controller.abort();
      const error = new Error(options.method === 'POST' ? 'The server has not confirmed this change. Please retry.' : 'The notification service is taking too long. Please retry.');
      error.unconfirmed = options.method === 'POST'; reject(error);
    }, timeoutMs);
  });
  try {
    return await Promise.race([deadline, (async () => {
      const response = await fetch(url, { ...options, signal: controller.signal });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) { const error = new Error(data.error || 'The notification service could not complete this request.'); error.status = response.status; throw error; }
      return data;
    })()]);
  } finally { clearTimeout(timer); signal?.removeEventListener('abort', abort); }
}
