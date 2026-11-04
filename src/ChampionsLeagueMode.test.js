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
