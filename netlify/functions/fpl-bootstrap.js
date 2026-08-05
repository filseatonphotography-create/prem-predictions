export async function handler() {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    const res = await fetch("https://fantasy.premierleague.com/api/bootstrap-static/", {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: "FPL player data error", details: errorText.slice(0, 500) }),
      };
    }

    const text = await res.text();
    if (text.length > 3_000_000) {
      return {
        statusCode: 502,
        body: JSON.stringify({ error: "FPL player data response exceeded size limit" }),
      };
    }

    JSON.parse(text);

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=3600",
        "Access-Control-Allow-Origin": "*",
      },
      body: text,
    };
  } catch (err) {
    const isTimeout = err?.name === "AbortError";
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: isTimeout ? "Upstream timeout" : "Internal server error",
      }),
    };
  }
}
