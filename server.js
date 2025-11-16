// server.js
const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch"); // use node-fetch v2 for compatibility

const app = express();
const PORT = process.env.PORT || 5001;

// === TOKENS ===
// Keep these real in your deployed code, but DO NOT share them publicly.
const FOOTBALL_DATA_TOKEN = "18351cddefba4334a5edb3a60ea84ba3"; // your existing football-data.org token
const ODDS_API_KEY = "72209b9a1ab8337b046a7a1a3996f1bc"; // your Odds API key

app.use(cors());

// Simple health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// --- PREMIER LEAGUE RESULTS (football-data.org) ---
app.get("/api/results", async (req, res) => {
  try {
    console.log("Incoming /api/results request");

    const apiRes = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches",
      {
        headers: {
          "X-Auth-Token": FOOTBALL_DATA_TOKEN,
        },
      }
    );

    console.log("Football-Data status:", apiRes.status);

    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => "");
      console.error(
        "Football-Data API error:",
        apiRes.status,
        errorText || "<no body>"
      );
      return res
        .status(apiRes.status)
        .json({ error: "Football-Data API error", status: apiRes.status });
    }

    const data = await apiRes.json();
    const matches = Array.isArray(data.matches) ? data.matches : [];

    console.log("Returning", matches.length, "matches to frontend");
    res.json(matches);
  } catch (err) {
    console.error("Server error in /api/results:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// --- EPL ODDS (The Odds API) ---
app.get("/api/odds", async (req, res) => {
  try {
    console.log("Incoming /api/odds request");

    const url = new URL(
      "https://api.the-odds-api.com/v4/sports/soccer_epl/odds"
    );
    url.searchParams.set("apiKey", ODDS_API_KEY);
    url.searchParams.set("regions", "uk"); // UK bookmakers
    url.searchParams.set("markets", "h2h"); // head-to-head (1X2)
    url.searchParams.set("oddsFormat", "decimal"); // decimal odds

    const apiRes = await fetch(url.toString());
    console.log("The Odds API status:", apiRes.status);

    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => "");
      console.error(
        "The Odds API error:",
        apiRes.status,
        errorText || "<no body>"
      );
      return res
        .status(apiRes.status)
        .json({ error: "The Odds API error", status: apiRes.status });
    }

    const data = await apiRes.json();

    const markets = [];

    if (Array.isArray(data)) {
      data.forEach((event) => {
        const homeTeam = event.home_team;
        const awayTeam = event.away_team;

        if (!homeTeam || !awayTeam || !Array.isArray(event.bookmakers)) {
          return;
        }

        const firstBookmaker = event.bookmakers[0];
        if (!firstBookmaker || !Array.isArray(firstBookmaker.markets)) {
          return;
        }

        const h2hMarket = firstBookmaker.markets.find(
          (m) => m.key === "h2h"
        );
        if (!h2hMarket || !Array.isArray(h2hMarket.outcomes)) {
          return;
        }

        let homeOdds = null;
        let awayOdds = null;
        let drawOdds = null;

        h2hMarket.outcomes.forEach((o) => {
          if (!o || typeof o.name !== "string") return;
          const name = o.name;
          const price = o.price;

          if (name === homeTeam) {
            homeOdds = price;
          } else if (name === awayTeam) {
            awayOdds = price;
          } else if (name.toLowerCase() === "draw") {
            drawOdds = price;
          }
        });

        if (
          typeof homeOdds === "number" &&
          typeof awayOdds === "number" &&
          typeof drawOdds === "number"
        ) {
          markets.push({
            homeTeam,
            awayTeam,
            homeOdds,
            drawOdds,
            awayOdds,
          });
        }
      });
    }

    console.log("Returning odds for", markets.length, "fixtures");
    res.json(markets);
  } catch (err) {
    console.error("Server error in /api/odds:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});