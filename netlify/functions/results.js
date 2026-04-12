export async function handler() {
  try {
    const token = process.env.FOOTBALL_DATA_TOKEN;
    if (!token) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Missing FOOTBALL_DATA_TOKEN" }),
      };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    const res = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches",
      {
        headers: { "X-Auth-Token": token },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!res.ok) {
      const errorText = await res.text().catch(() => "");
      return {
        statusCode: res.status,
        body: JSON.stringify({ error: "Football-Data API error", details: errorText }),
      };
    }

    const data = await res.json();
    const matches = Array.isArray(data.matches) ? data.matches : [];

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-store",
      },
      body: JSON.stringify(matches),
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
