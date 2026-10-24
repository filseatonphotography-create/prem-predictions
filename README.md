# Getting Started with Create React App

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can't go back!**

If you aren't satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you're on your own.

You don't have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn't feel obligated to use this feature. However we understand that this tool wouldn't be useful if you couldn't customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

### Code Splitting

This section has moved here: [https://facebook.github.io/create-react-app/docs/code-splitting](https://facebook.github.io/create-react-app/docs/code-splitting)

### Analyzing the Bundle Size

This section has moved here: [https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size](https://facebook.github.io/create-react-app/docs/analyzing-the-bundle-size)

### Making a Progressive Web App

This section has moved here: [https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app](https://facebook.github.io/create-react-app/docs/making-a-progressive-web-app)

### Advanced Configuration

This section has moved here: [https://facebook.github.io/create-react-app/docs/advanced-configuration](https://facebook.github.io/create-react-app/docs/advanced-configuration)

### Deployment

This section has moved here: [https://facebook.github.io/create-react-app/docs/deployment](https://facebook.github.io/create-react-app/docs/deployment)

### `npm run build` fails to minify

This section has moved here: [https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify](https://facebook.github.io/create-react-app/docs/troubleshooting#npm-run-build-fails-to-minify)

## Local Development: Fixing Login/Token Issues

**IMPORTANT:** To ensure login and avatar saving works locally, you must set a fixed `SESSION_SECRET` so tokens remain valid across backend restarts.

1. Copy `.env.example` to `.env` in your project root:
   ```sh
   cp .env.example .env
   ```
2. Edit `.env` and set a strong value for `SESSION_SECRET` (any long random string).
3. Start your backend with environment variables loaded. If you use `npm start` or `node server.js`, use:
   ```sh
   SESSION_SECRET=your-very-secret-key node server.js
   ```
   Or use a tool like [dotenv](https://www.npmjs.com/package/dotenv) to load from `.env` automatically.

If you change the secret, you must log in again to get a new token.

## Background push notifications on Render

The Node server runs deadline and live match notification timers. It must stay
running when browsers are closed. Use a paid Render service for this backend.
An accepted push means the push provider accepted the request; it does not prove
the phone displayed it.

Saved subscriptions, preferences and delivery logs live in `DATA_DIR`, which
defaults to the repository's `data/` directory. A paid service still needs a
persistent disk to retain these files across restarts and deployments. To move
an existing installation, back up and copy **all current backend data files**
to the disk before setting `DATA_DIR` to that directory (for example,
`/var/data/prem-predictions`). Do not switch an existing service to an empty
directory: users, predictions and subscriptions share this storage location.
Keep the existing VAPID keys stable across deployments.

Settings → Notifications → Check live notification status shows the worker's
last poll, provider errors, registered device count, live alert preference and
last push delivery outcome. Inspect this before using the test notification,
which replaces the last delivery record. A background check must also confirm
receipt with the app closed; a successful foreground test alone is insufficient.
Use “Test with app closed (15 seconds)” to schedule a server-side test, then
close the app and lock the phone before it sends. Check delivery status after
reopening. This short test is held in server memory and requires the server to
remain running for those 15 seconds.

Each push connection has a 12-second overall deadline. Transient connection
failures get one retry over IPv4. The diagnostic report retains the test's
scheduled/sending/final state separately from live delivery and includes error
codes and messages. Keep the phone locked for one minute when testing, allowing
time for the initial delay and both connection attempts.

Live Studio alerts also include a one-time line-up announcement once the
provider supplies both starting XIs within 90 minutes before kick-off. These
use the existing Live Studio preference or fixture bell, link to that fixture
in Live Studio, and retry failed sends on subsequent pre-match polls. Repeated
polls and later lineup amendments do not resend an accepted announcement.
Tapping a line-up notification selects its competition and gameweek, waits for
the matching line-up post, then scrolls to and highlights that post.

Goal-disallowed alerts require an explicit provider event. A score decrease or
missing score never creates a cancellation or a VAR claim. Legacy inferred
cancellations are filtered from match events and unverified saved Studio posts.

Studio visits use match-clock marks at 15, 20, 60, 75 and 85 minutes. The
85-minute “Watching the clock” visit is scheduled even after recent action.
Cancelled stats checks (including saved copies) and the superseded 25-minute
visit are removed. Kick-off cards retain their red styling when highlighted.
Recent public match events and their confirmed kick-off overrides are cached
for up to six hours, so reopening retains goals and bookings while fresh data
loads; private commentary remains scoped to its account, league and gameweek.

Studio player rundowns explain each prediction against that post's recorded
score: protecting an exact score, goals needed for Bingpot, or the result needed
to retain or rescue points. Finished fixtures use settled language. Goal
reactions include ordinary points swings and retain loaded prediction context
through partial responses. Historical league tables are rebuilt at their
original match moment when the complete roster arrives, keeping every member
and the original score/time instead of freezing the initial founder-only rows.

Scheduled check-ins compare their recorded scores with the preceding Studio
visit. With the same fixtures/scores and no intervening goal, they display a
brief collective prediction summary instead of repeating every player's rundown
or the score panel. A changed score restores detailed player updates. Half-time
and full-time retain their fuller reports; saved prediction context remains
available and the concise presentation is restored after reopening.

Late-loaded kick-off posts are anchored to the match start, beneath subsequent
play. The order ledger repairs previously misplaced kick-offs once and repairs
them again if their confirmed start time changes, preserving other arrival
positions. Detailed Studio rundowns are grouped under a heading for each game,
with brief player lines showing that game's points and immediate prediction
outlook instead of one cumulative paragraph spanning every fixture.

Premier League kick-off cards include both teams' latest-five form with a
varied introduction. They share the league table's form calculation and visual
strip (W/D/L colours, opponent codes, and home/away markers). The kickoff guide
uses only results from fixtures before that match's start, keeping its own
result and subsequent fixtures out of the pre-match form after reopening.
