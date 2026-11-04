export const COMPETITION_MODE_KEY = 'prediction_competition_mode_v1';
export const PREDICTION_MODE_KEY = 'prediction_game_mode_v1';
export const AUTH_KEY = 'pl_prediction_auth_v1';
export const PREMIER = 'premierLeague';
export const CHAMPIONS = 'championsLeague';
export const WORLD_CUP = 'worldCup';
export const COMPETITIONS = {
  [PREMIER]: { label: 'Premier League', apiKey: 'premier', predictionsEnabled: true },
  [CHAMPIONS]: { label: 'Champions League', apiKey: 'champions', predictionsEnabled: false },
  [WORLD_CUP]: { label: 'World Cup', apiKey: 'worldcup', predictionsEnabled: true },
};
export function readCompetitionMode() {
  try {
    const params = new URLSearchParams(window.location.search), mode = params.get('mode');
    if (mode === 'champions') return CHAMPIONS;
    if (mode === 'premier') return PREMIER;
    if (mode === 'worldcup') return WORLD_CUP;
    if (params.get('competition') === 'champions' || params.get('fixtureId')?.startsWith('cl:') || params.get('view') === 'championsLeagueTable') return CHAMPIONS;
    const saved = localStorage.getItem(COMPETITION_MODE_KEY);
    if (COMPETITIONS[saved]) return saved;
    if (localStorage.getItem('activeView') === 'championsLeagueTable') return CHAMPIONS;
    return localStorage.getItem(PREDICTION_MODE_KEY) === WORLD_CUP ? WORLD_CUP : PREMIER;
  } catch { return PREMIER; }
}
export function readCompetitionAuth() {
  try { const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || 'null'); return auth?.token && auth?.userId && auth?.username ? auth : null; } catch { return null; }
}
