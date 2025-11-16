// server.js
const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 5001;

// === YOUR FOOTBALL-DATA.ORG TOKEN ===
// (Keep this as your real token)
const API_TOKEN = "18351cddefba4334a5edb3a60ea84ba3";

// === YOUR THE ODDS API TOKEN ===
// (You gave me this key)
const ODDS_API_KEY = "72209b9a1ab8337b046a7a1a3996f1bc";

app.use(cors());

// Simple health check
app.get("/", (req, res) => {
  res.send("Backend is running");
});

// --- MAIN ENDPOINT: RETURN PL MATCHES AS AN ARRAY ---
app.get("/api/results", async (req, res) => {
  try {
    console.log("Incoming /api/results request");

    // Use Node's built-in fetch (Node 18+ has global fetch)
    const apiRes = await fetch(
      "https://api.football-data.org/v4/competitions/PL/matches",
      {
        headers: {
          "X-Auth-Token": API_TOKEN,
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

// --- NEW ENDPOINT: RETURN EPL ODDS (HOME/DRAW/AWAY) ---
app.get("/api/odds", async (req, res) => {
  try {
    console.log("Incoming /api/odds request");

    if (!ODDS_API_KEY) {
      console.error("No ODDS_API_KEY configured");
      return res
        .status(500)
        .json({ error: "No ODDS_API_KEY configured on the server." });
    }

    const url =
      "https://api.the-odds-api.com/v4/sports/soccer_epl/odds" +
      `?regions=uk&markets=h2h&oddsFormat=decimal&apiKey=${ODDS_API_KEY}`;

    const apiRes = await fetch(url);

    console.log("The Odds API status:", apiRes.status);

    if (!apiRes.ok) {
      const errorText = await apiRes.text().catch(() => "");
      console.error(
        "The Odds API error:",
        apiRes.status,
        errorText || "<no body>"
      );
      return res
        .status(500)
        .json({ error: "The Odds API error", status: apiRes.status });
    }

    const data = await apiRes.json(); // array of events

    // Simplify for the frontend
    const simplified = data
      .map((event) => {
        const bookmaker =
          Array.isArray(event.bookmakers) && event.bookmakers.length > 0
            ? event.bookmakers[0]
            : null;
        if (!bookmaker) return null;

        const h2h = Array.isArray(bookmaker.markets)
          ? bookmaker.markets.find((m) => m.key === "h2h")
          : null;
        if (!h2h) return null;

        const outcomes = Array.isArray(h2h.outcomes) ? h2h.outcomes : [];

        let homeOdds = null;
        let awayOdds = null;
        let drawOdds = null;

        outcomes.forEach((o) => {
          const name = (o.name || "").toLowerCase();
          const homeName = (event.home_team || "").toLowerCase();
          const awayName = (event.away_team || "").toLowerCase();

          if (name === homeName) homeOdds = o.price;
          else if (name === awayName) awayOdds = o.price;
          else if (name === "draw") drawOdds = o.price;
        });

        if (!homeOdds || !awayOdds || !drawOdds) return null;

        return {
          homeTeam: event.home_team,
          awayTeam: event.away_team,
          homeOdds,
          drawOdds,
          awayOdds,
        };
      })
      .filter(Boolean);

    console.log("Returning", simplified.length, "odds rows to frontend");
    res.json(simplified);
  } catch (err) {
    console.error("Server error in /api/odds:", err);
    res.status(500).json({ error: "Internal server error (odds)" });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});