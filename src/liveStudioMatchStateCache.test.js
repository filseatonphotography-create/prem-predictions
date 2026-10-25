import { readLiveStudioMatchStates, writeLiveStudioMatchStates } from "./liveStudioMatchStateCache";
const now = Date.parse("2026-10-24T12:08:00Z");
const fixtures = [{ id: 560614, kickoff: "2026-10-24T14:00:00Z" }];
const goal = { type: "GOAL", minute: 6, homeGoals: 1, awayGoals: 0, scorerName: "Nicolas Jackson" };
const card = { type: "YELLOW_CARD", minute: 32, playerName: "Marc Guéhi" };
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); });

test("reopening retains the goal, booking and actual kickoff even after a thin response", () => {
  writeLiveStudioMatchStates("premierLeague", { 560614: { utcDate: "2026-10-24T11:30:00Z", status: "IN_PLAY", minute: 36, goalEvents: [goal], matchEvents: [goal, card] } }, fixtures, now);
  writeLiveStudioMatchStates("premierLeague", { 560614: { status: "IN_PLAY", minute: 37, goalEvents: [], matchEvents: [] } }, fixtures, now);
  expect(readLiveStudioMatchStates("premierLeague", now)[560614]).toMatchObject({ utcDate: "2026-10-24T11:30:00Z", minute: 37, goalEvents: [goal], matchEvents: [goal, card] });
  expect(readLiveStudioMatchStates("worldCup", now)).toEqual({});
  expect(readLiveStudioMatchStates("premierLeague", now + 7 * 3600000)).toEqual({});
});
