const https = require("https");

function pushFailureDetails(error) {
  const codes = new Set();
  const visit = (item, depth = 0) => {
    if (!item || depth > 3) return;
    if (typeof item.code === "string" && /^[A-Z0-9_]+$/.test(item.code)) codes.add(item.code);
    if (/socket timeout/i.test(item.message || "")) codes.add("ETIMEDOUT");
    if (Array.isArray(item.errors)) item.errors.forEach(child => visit(child, depth + 1));
    visit(item.cause, depth + 1);
  };
  visit(error);
  const message = String(error?.message || "Unknown push error")
    .replace(/https?:\/\/\S+/g, "[endpoint]")
    .replace(/[A-Za-z0-9_-]{40,}/g, "[redacted]")
    .slice(0, 200);
  return {
    statusCode: error?.statusCode || null,
    code: [...codes].join(",") || (error?.statusCode ? `HTTP_${error.statusCode}` : "PUSH_ERROR"),
    message,
    attempts: error?.attempts || 1,
  };
}

function isTransientPushFailure(error) {
  if (error?.statusCode) return error.statusCode === 429 || error.statusCode >= 500;
  const details = pushFailureDetails(error);
  return details.code.split(",").some(code => [
    "ETIMEDOUT", "ECONNRESET", "ECONNREFUSED", "EPIPE", "EAI_AGAIN",
    "ENETUNREACH", "EHOSTUNREACH", "ENOTFOUND",
  ].includes(code));
}

// The library's socket timeout doesn't bound the entire DNS/connect/request
// lifecycle. Own each attempt's agent so a deadline can close its connections.
async function deliverWebPush(client, device, payload, options, {
  createAgent = settings => new https.Agent(settings),
  deadlineMs = 12000,
} = {}) {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const agent = createAgent(attempt === 1 ? { keepAlive: false } : { keepAlive: false, family: 4 });
    let deadline;
    try {
      return await Promise.race([
        Promise.resolve().then(() => client.sendNotification(device, payload, { ...options, agent })),
        new Promise((_resolve, reject) => {
          deadline = setTimeout(() => {
            const error = new Error("Push connection deadline exceeded");
            error.code = "ETIMEDOUT";
            reject(error);
          }, deadlineMs);
        }),
      ]);
    } catch (error) {
      if (attempt === 2 || !isTransientPushFailure(error)) {
        error.attempts = attempt;
        throw error;
      }
    } finally {
      clearTimeout(deadline);
      agent.destroy();
    }
  }
}

module.exports = { deliverWebPush, pushFailureDetails, isTransientPushFailure };
