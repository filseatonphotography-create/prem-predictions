# Official match highlights

Premier League fixture dropdowns include official highlights beneath predictions
and coin bets. Each card opens the publisher's video on YouTube in a new tab.
Videos are linked, rather than downloaded or hosted by this app.

## Enable automatic discovery

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **YouTube Data API v3** and create an API key restricted to that API.
3. Add `YOUTUBE_API_KEY` to the backend service's environment settings (Render),
   then restart/deploy the backend. Keep the key out of frontend environment
   variables, source files and chat.

This uses the API's default free quota. No paid football data subscription or
quota extension is needed. The existing football statistics plan is unchanged.
The backend reads three official channels' uploads playlists every 30 minutes,
sharing that catalogue across all visitors. A normal day uses about 144 playlist
requests plus the channel lookup at startup, rather than a search per fixture.
If a request fails, the service waits for the next refresh interval.

Sources: Sky Sports Premier League, NBC Sports and Premier League. Channel IDs
are fixed in `matchHighlightsService.js` and were checked against their official
YouTube channel pages. Additional publishers require an explicit code change.

## Matching and availability

- The match must have finished. For historical scores without a recorded match
  status, a three-hour buffer after kickoff is used. Explicit live or postponed
  states do not use this fallback.
- The title must identify both teams as a fixture pairing and say “highlights”.
  Publication must be between 90 minutes and three days after kickoff.
- Known youth, women's, friendly, retro and simulation markers are excluded.
- Only the latest 50 uploads per source are fetched. Older fixtures may have no
  match, particularly when this integration is first enabled. Coverage is not
  guaranteed, and a video's availability can vary by country or change later.
- Recent API metadata is retained in `DATA_DIR/youtube-highlights-cache.json`
  across restarts and expires after 28 days unless refreshed from YouTube.
- World Cup and Champions League results are outside this initial integration.

Without a configured key, the dropdown shows that official highlights are not
available yet. API errors have a retry action. The key is never sent to browsers.

Reference: [YouTube API setup and quota](https://developers.google.com/youtube/v3/getting-started),
[uploads playlist items](https://developers.google.com/youtube/v3/docs/playlistItems/list).
