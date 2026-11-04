import { readCompetitionMode, readCompetitionAuth, CHAMPIONS, PREMIER, WORLD_CUP, COMPETITION_MODE_KEY, COMPETITIONS } from './competitionModes';
afterEach(() => { localStorage.clear(); window.history.replaceState({}, '', '/'); });
test('Champions League has a separate namespace with predictions disabled', () => {
  expect(COMPETITIONS[CHAMPIONS].apiKey).toBe('champions');
  expect(COMPETITIONS[CHAMPIONS].predictionsEnabled).toBe(false);
  expect(COMPETITIONS[PREMIER].predictionsEnabled).toBe(true);
});
test('saved Champions mode survives reload without changing the existing prediction mode', () => {
  localStorage.setItem(COMPETITION_MODE_KEY, CHAMPIONS);
  localStorage.setItem('prediction_game_mode_v1', WORLD_CUP);
  expect(readCompetitionMode()).toBe(CHAMPIONS);
  expect(localStorage.getItem('prediction_game_mode_v1')).toBe(WORLD_CUP);
});
test.each(['/?competition=champions&studio=coverage', '/?fixtureId=cl:77', '/?view=championsLeagueTable', '/?mode=champions'])('Champions links select their mode: %s', path => {
  window.history.replaceState({}, '', path); expect(readCompetitionMode()).toBe(CHAMPIONS);
});
test('explicit Premier or World Cup links override saved Champions mode', () => {
  localStorage.setItem(COMPETITION_MODE_KEY, CHAMPIONS);
  window.history.replaceState({}, '', '/?mode=premier'); expect(readCompetitionMode()).toBe(PREMIER);
  window.history.replaceState({}, '', '/?mode=worldcup'); expect(readCompetitionMode()).toBe(WORLD_CUP);
});
test('legacy mode and invalid authentication are handled', () => {
  localStorage.setItem('prediction_game_mode_v1', WORLD_CUP); expect(readCompetitionMode()).toBe(WORLD_CUP);
  localStorage.setItem('pl_prediction_auth_v1', 'broken'); expect(readCompetitionAuth()).toBeNull();
});
