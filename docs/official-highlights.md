# Official match highlights

Premier League fixture dropdowns include official highlights beneath predictions
and coin bets. Champions League results have a highlights dropdown after full
time. Each video card opens the publisher's video on YouTube in a new tab.
Videos are linked, rather than downloaded or hosted by this app.

## Enable automatic discovery

1. Create or select a project in [Google Cloud Console](https://console.cloud.google.com/).
2. Enable **YouTube Data API v3** and create an API key restricted to that API.
3. Add `YOUTUBE_API_KEY` to the backend service's environment settings (Render),
   then restart/deploy the backend. Keep the key out of frontend environment
   variables, source files and chat.

This uses the API's default free quota. No paid football data subscription or
quota extension is needed. The existing football statistics plan is unchanged.
The backend reads the configured clubs' and broadcasters' official uploads
playlists every 30 minutes, sharing that catalogue across all visitors. A normal
day uses about 1,440 playlist requests, plus the channel lookup at startup and batched video
availability checks. This stays within the default free quota; there is no search
per fixture.
If a request fails, the service waits for the next refresh interval.

Sources are the clubs themselves, including Fulham (`@fulhamfc`), Manchester City
(`@mancity`) and Everton (`@everton`). Channel IDs and handles are fixed in
`matchHighlightsService.js` and were checked against their official YouTube
channel pages. Premier League results use uploads from one of the two clubs
playing. Champions League results also use configured official broadcasters.

## Matching and availability

- The match must have finished. For historical scores without a recorded match
  status, a three-hour buffer after kickoff is used. Explicit live or postponed
  states do not use this fallback.
- The title must identify both teams as a fixture pairing and say “highlights”.
  Publication must be between 90 minutes and three days after kickoff.
- Known youth, women's, friendly, retro and simulation markers are excluded.
- YouTube's video status and country restrictions are checked in batches. Premier
  League results use the existing Vietnam availability filter. Missing video
  details, deleted/private videos, and availability checks older than 24 hours
  are excluded from both competitions. If YouTube temporarily
  fails, only previously checked videos with checks less than 24 hours old can be
  shown. Playback itself is still controlled by YouTube and the publisher.
- Only the latest 50 uploads per source are fetched. Older fixtures may have no
  match, particularly when this integration is first enabled. Coverage is not
  guaranteed, and a video's availability can vary by country or change later.
- Recent API metadata is retained in `DATA_DIR/youtube-highlights-cache.json`
  across restarts and expires after 28 days unless refreshed from YouTube.
- Champions League results put public, processed clips without listed country
  restrictions first. Other eligible clips show their regional restrictions.
  Age-restricted clips are excluded. If no unrestricted match clip is listed,
  the dropdown also offers a YouTube search for the fixture.

Without a configured key, the dropdown shows that official highlights are not
available yet. API errors have a retry action. The key is never sent to browsers.

Reference: [YouTube API setup and quota](https://developers.google.com/youtube/v3/getting-started),
[uploads playlist items](https://developers.google.com/youtube/v3/docs/playlistItems/list).
