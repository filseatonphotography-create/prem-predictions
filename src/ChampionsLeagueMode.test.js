import React from 'react';
import { render, screen, fireEvent, act, cleanup } from '@testing-library/react';
import App from './App';
import { championsTheme } from './ChampionsLeagueMode';
const original = global.fetch;
const flush = async () => { for (let i = 0; i < 70; i++) await Promise.resolve(); };
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); window.scrollTo = jest.fn();
  window.history.replaceState({}, '', '/?mode=champions&view=liveStudio');
  localStorage.setItem('pl_prediction_auth_v1', JSON.stringify({ token: 'test-only', userId: 'user', username: 'Example' }));
  global.fetch = jest.fn(async url => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => String(url).includes('/matches?') ? { matches: [] } : { prefs: {} } }));
});
afterEach(() => { cleanup(); global.fetch = original; localStorage.clear(); window.history.replaceState({}, '', '/'); });
test('Champions mode uses its own palette and never requests prediction or coin data', async () => {
  render(<App />); await act(flush);
  expect(screen.getByText('Champions League Mode')).toBeInTheDocument();
  expect(screen.getByRole('main')).toHaveStyle({ color: championsTheme.text });
  expect(championsTheme.accent).toBe('#60a5fa');
  expect(global.fetch.mock.calls.map(([url]) => String(url)).some(url => /predictions|coins|mini-league/.test(url))).toBe(false);
  fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
  expect(screen.getByRole('button', { name: 'Champions League Table' })).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Premier League Table' })).not.toBeInTheDocument();
});
test.each([['Back to Premier League', 'premierLeague', 'premier'], ['World Cup Mode', 'worldCup', 'worldcup']])('switching from Champions to %s opens its existing game', async (label, stored, query) => {
  render(<App />); await act(flush);
  const championsTitle = screen.getByRole('heading', { level: 1 }).outerHTML;
  fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
  expect(screen.getByRole('button', { name: 'Back to Premier League' }).parentElement.firstElementChild).toBe(screen.getByRole('button', { name: 'Back to Premier League' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: label })); await flush(); });
  expect(localStorage.getItem('prediction_game_mode_v1')).toBe(stored);
  expect(new URLSearchParams(window.location.search).get('mode')).toBe(query);
  expect(screen.getByText(stored === 'premierLeague' ? 'Premier League Mode' : 'World Cup Mode')).toBeInTheDocument();
  expect(screen.getByRole('heading', { level: 1 }).outerHTML).toBe(championsTitle);
  fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
  expect(screen.queryByRole('button', { name: 'Champions League Table' })).not.toBeInTheDocument();
  const championsButton = screen.getByRole('button', { name: 'Champions League Mode' });
  expect(championsButton).toHaveStyle({ color: championsTheme.accent });
  const previousMode = stored === 'premierLeague' ? 'World Cup Mode' : 'Back to Premier League';
  expect(screen.getByRole('button', { name: previousMode }).nextElementSibling).toBe(championsButton);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Champions League Mode' })); await flush(); });
  expect(screen.getByText('Champions League Mode')).toBeInTheDocument();
  expect(localStorage.getItem('prediction_game_mode_v1')).toBe(stored);
});

test('the league menu opens Champions League when browser storage is full', async () => {
  window.history.replaceState({}, '', '/?mode=premier&view=predictionIq');
  render(<App />); await act(flush);
  const setItem = window.Storage.prototype.setItem;
  const storage = jest.spyOn(window.Storage.prototype, 'setItem').mockImplementation(function (key, value) {
    if (this === window.localStorage && this.getItem(key) !== String(value)) {
      throw new window.DOMException('Storage quota exceeded', 'QuotaExceededError');
    }
    return setItem.call(this, key, value);
  });
  try {
    fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Champions League Mode' })); await flush(); });
    expect(screen.getByRole('navigation', { name: 'Champions League navigation' })).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('mode')).toBe('champions');
    fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Champions League Table' })); await flush(); });
    expect(screen.getByRole('heading', { name: 'Champions League Table' })).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('view')).toBe('championsLeagueTable');
    fireEvent.click(screen.getByRole('button', { name: 'Leagues ▾' }));
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Back to Premier League' })); await flush(); });
    expect(screen.getByText('Premier League Mode')).toBeInTheDocument();
    expect(new URLSearchParams(window.location.search).get('mode')).toBe('premier');
  } finally { storage.mockRestore(); }
});

test('Live Scores & Results shows live scores, future fixtures and past results without prediction controls', async () => {
  const fixture = (id, status, home, away, score, dayOffset) => ({
    id, status, homeTeam: { name: home }, awayTeam: { name: away }, score,
    utcDate: new Date(Date.now() + dayOffset * 86400000).toISOString(),
  });
  const matches = [
    { ...fixture(1, 'IN_PLAY', 'Inter', 'Lyon', { fullTime: { home: 0, away: 0 } }, 0), minute: 18 },
    fixture(2, 'TIMED', 'Ajax', 'Porto', { fullTime: { home: null, away: null } }, 14),
    fixture(3, 'FINISHED', 'Benfica', 'Celtic', { duration: 'PENALTY_SHOOTOUT',
      fullTime: { home: 5, away: 4 }, regularTime: { home: 1, away: 1 },
      extraTime: { home: 0, away: 0 }, penalties: { home: 4, away: 3 } }, -14),
    fixture(4, 'FINISHED', 'Madrid', 'Milan', { fullTime: { home: 2, away: 1 } }, -21),
  ];
  let highlightsAvailable = true;
  global.fetch = jest.fn(async url => ({
    ok: true, status: 200, headers: { get: () => null },
    json: async () => String(url).includes('/api/champions/highlights') ? { status: 'ready', videosByFixtureId: highlightsAvailable ? {
      3: { videoId: 'Abcdef123_-', title: 'Benfica vs Celtic', channelName: 'Official channel', language: 'en' },
      4: { videoId: 'Gbcdef123_-', title: 'Madrid vs Milan in Vietnamese', channelName: 'Another channel', language: 'vi' },
    } : {} } : String(url).includes('scope=fixtures') ? { scope: 'fixtures', matches }
      : String(url).includes('/matches?') ? { matches: [] } : {},
  }));
  render(<App />); await act(flush);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Live Scores & Results' })); await flush(); });
  expect(screen.getByRole('heading', { name: 'Champions League scores & fixtures' })).toBeInTheDocument();
  expect(new URLSearchParams(window.location.search).get('view')).toBe('championsLeagueScores');
  expect(screen.getByRole('heading', { name: 'Live now' })).toBeInTheDocument();
  expect(screen.getByText('18′').closest('li')).toHaveTextContent('0–0');
  expect(screen.getByText('Ajax').closest('li')).not.toHaveTextContent('0–0');
  expect(screen.getByText('Porto')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /Highlights for/ })).not.toBeInTheDocument();
  expect(screen.queryByText('Benfica')).not.toBeInTheDocument();
  expect(screen.queryByRole('button', { name: 'Predictions' })).not.toBeInTheDocument();
  expect(global.fetch.mock.calls.some(([url]) => url.includes('/highlights'))).toBe(false);
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Results' })); await flush(); });
  expect(screen.getByText('Benfica').closest('li')).toHaveTextContent('FT1–1Pens 4–3');
  expect(global.fetch.mock.calls.filter(([url]) => url.includes('/highlights'))).toHaveLength(1);
  fireEvent.click(screen.getByRole('button', { name: 'Highlights for Benfica vs Celtic' }));
  const clip = await screen.findByRole('link', { name: /Watch on YouTube/ });
  expect(clip).toHaveAttribute('href', 'https://www.youtube.com/watch?v=Abcdef123_-');
  expect(screen.queryByRole('button', { name: 'Highlights for Madrid vs Milan' })).not.toBeInTheDocument();
  expect(global.fetch.mock.calls.filter(([url]) => url.includes('/highlights'))).toHaveLength(1);
  expect(screen.getAllByRole('link', { name: /YouTube/ })).toHaveLength(1);
  expect(screen.queryByText('Ajax')).not.toBeInTheDocument();
  expect(global.fetch.mock.calls.some(([url]) => /predictions|coins/.test(url))).toBe(false);
  highlightsAvailable = false;
  fireEvent.click(screen.getByRole('button', { name: 'Fixtures' }));
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Results' })); await flush(); });
  expect(screen.getByText('No English YouTube highlights are available in your region yet.')).toBeVisible();
  expect(screen.queryByRole('button', { name: /Highlights for/ })).not.toBeInTheDocument();
});

test('mobile coverage uses the shared brand and compact coverage heading and toggles match focus without an All selected games button', async () => {
  const previousWidth = window.innerWidth; window.innerWidth = 375;
  window.history.replaceState({}, '', '/?mode=champions&view=liveStudio&studio=coverage&competition=champions&games=cl:77');
  const match = { id: 77, utcDate: new Date(Date.now() - 30 * 60000).toISOString(), status: 'IN_PLAY', minute: 30,
    homeTeam: { name: 'RB Leipzig' }, awayTeam: { name: 'Liverpool FC' }, score: { fullTime: { home: 1, away: 1 } } };
  global.fetch = jest.fn(async url => ({ ok: true, status: 200, headers: { get: () => null }, json: async () => String(url).includes('/matches?') ? { matches: [match] } : { prefs: {} } }));
  try {
    render(<App />); await act(flush);
    expect(screen.getByRole('heading', { level: 1 })).toHaveStyle({ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '0.5px' });
    expect(screen.getByRole('heading', { name: 'Live coverage' })).toHaveStyle({ fontSize: 18, letterSpacing: 0 });
    expect(screen.queryByRole('button', { name: 'All selected games' })).not.toBeInTheDocument();
    const game = screen.getByRole('button', { name: /RB Leipzig 1–1 Liverpool/ });
    fireEvent.click(game); expect(game).toHaveAttribute('aria-pressed', 'true');
    fireEvent.click(game); expect(game).toHaveAttribute('aria-pressed', 'false');
  } finally { window.innerWidth = previousWidth; }
});
