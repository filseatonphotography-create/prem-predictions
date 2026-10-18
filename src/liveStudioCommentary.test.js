import {
  buildLiveStudioEventHeader,
  buildLiveStudioRevealLine,
  buildLiveStudioEventLine,
  buildLiveStudioFullTimeSummary,
  buildLiveStudioAside,
  buildLiveStudioStakesLine,
  buildLiveStudioTableImpactLine,
  getLiveStudioChangedTableSnapshot,
  getLiveStudioPreviousScore,
  buildLiveStudioLateLine,
  getLiveStudioClockMinute,
  buildLiveStudioDeskEntries,
  buildLiveStudioClosingVerdict,
  buildLiveStudioEntryLines,
} from "./App";

const fixture = { id: 17, homeTeam: "Arsenal", awayTeam: "Coventry" };
const goal = (minute, scorerName = "Saka") => ({
  type: "GOAL", minute, scorerName, teamName: "Arsenal",
});

describe("Live Studio commentary", () => {
  test("keeps scorer and team in prose, with the score only in the header", () => {
    const event = { ...goal(61), homeGoals: 2, awayGoals: 1 };
    const score = { homeGoals: 2, awayGoals: 1 };
    expect(buildLiveStudioEventHeader({ fixture, event, score })).toContain("2-1");
    const line = buildLiveStudioRevealLine(fixture, score, event);
    expect(line).toContain("Saka");
    expect(line).toContain("Arsenal");
    expect(line).not.toMatch(/2\s*[-–]\s*1/);
    expect(buildLiveStudioRevealLine(fixture, score, event)).toBe(line);
  });

  test.each(["HT", "SH", "FT"])("puts the %s score in the header", (statusLabel) => {
    expect(buildLiveStudioEventHeader({ fixture, event: {}, score: { homeGoals: 1, awayGoals: 2 }, statusLabel })).toContain("1-2");
  });

  test("does not repeat the final score or reverse an away win in the prose", () => {
    const line = buildLiveStudioFullTimeSummary({
      fixture, score: { homeGoals: 1, awayGoals: 2 },
      probabilities: { home: 70, draw: 20, away: 10 }, venue: "the Emirates Stadium", seed: "final",
    });
    expect(line).toContain("Coventry");
    expect(line).not.toMatch(/1-2|2-1/);
  });

  test("uses the score delta to credit a consolation goal to the team that scored", () => {
    const score = { homeGoals: 3, awayGoals: 1 };
    const event = { type: "GOAL", scorerName: "Away striker", previousHomeGoals: 3, previousAwayGoals: 0, ...score };
    const line = buildLiveStudioRevealLine(fixture, score, event);
    expect(line).toContain("Away striker has scored for Coventry");
    expect(buildLiveStudioEventHeader({ fixture, event, score })).toContain("Goal for COV");
    const unknown = buildLiveStudioRevealLine(fixture, score, { type: "GOAL" });
    expect(unknown).not.toContain("goal for Arsenal");
  });

  test("announces a sending-off with its team and the opposing team's advantage", () => {
    const event = { type: "RED_CARD", playerName: "Smith", teamName: "Coventry", minute: 68 };
    for (let index = 0; index < 20; index += 1) {
      const line = buildLiveStudioEventLine({ fixture, event, seed: `red:${index}` });
      expect(line).toContain("Red card for Coventry");
      expect(line).toContain("Smith");
      expect(line).not.toContain("Coventry an advantage");
    }
  });

  test("counts only this scorer's recorded goals up to the event for milestones", () => {
    const first = goal(10), second = goal(35), third = goal(75);
    const events = [first, second, third, goal(20, "Rice"), { ...goal(30), type: "OWN_GOAL" }];
    expect(buildLiveStudioAside({ fixture, event: second, events })).toContain("On for a hat-trick");
    expect(buildLiveStudioAside({ fixture, event: third, events })).toContain("That's the hat-trick");
    expect(buildLiveStudioAside({ fixture, event: second, events: [...events, second] })).toContain("On for a hat-trick");
  });

  test("does not count an earlier goal that was subsequently ruled out", () => {
    const first = goal(10), second = goal(35), third = goal(75);
    const cancelled = { ...goal(36), type: "GOAL_DISALLOWED" };
    expect(buildLiveStudioAside({ fixture, event: third, events: [first, second, cancelled, third] })).toContain("On for a hat-trick");
  });

  test("keeps silly asides occasional and stable across refreshes", () => {
    const lines = Array.from({ length: 120 }, (_, index) => {
      const event = goal(index + 1);
      const line = buildLiveStudioAside({ fixture, event });
      expect(buildLiveStudioAside({ fixture, event })).toBe(line);
      return line;
    }).filter(Boolean);
    expect(lines.length).toBeGreaterThan(0);
    expect(lines.length).toBeLessThan(24);
    expect(new Set(lines).size).toBeGreaterThan(3);
  });

  test("calls out a lost Bingpot using the before and after score", () => {
    const line = buildLiveStudioStakesLine({ fixture, event: goal(70),
      previousScore: { homeGoals: 1, awayGoals: 0 }, score: { homeGoals: 2, awayGoals: 0 },
      picks: [{ username: "Phil", prediction: { homeGoals: 1, awayGoals: 0 } }], seed: "lost",
    });
    expect(line).toContain("Phil");
    expect(line).toMatch(/Bingpot|slipped away/);
  });

  test("a boosted Correcto is not mistaken for a Bingpot", () => {
    const line = buildLiveStudioStakesLine({ fixture, event: goal(60),
      previousScore: { homeGoals: 1, awayGoals: 0 }, score: { homeGoals: 2, awayGoals: 0 },
      picks: [{ username: "Phil", prediction: { homeGoals: 3, awayGoals: 1, isTriple: true } }], seed: "boost",
    });
    expect(line).toBe("");
  });

  test("reports real coin pressure when a goal turns a winning bet against its owner", () => {
    const line = buildLiveStudioStakesLine({ fixture, event: goal(84),
      previousScore: { homeGoals: 1, awayGoals: 0 }, score: { homeGoals: 1, awayGoals: 1 },
      picks: [{ username: "Phil", bet: { side: "H", stake: 4 } }], seed: "coins",
    });
    expect(line).toContain("Phil");
    expect(line).toContain("4 coins");
  });

  test("VAR restores the prior scoreboard for comparing prediction swings", () => {
    const event = { ...goal(81), type: "GOAL_DISALLOWED" };
    const score = { homeGoals: 1, awayGoals: 1 };
    expect(getLiveStudioPreviousScore(fixture, event, score)).toEqual({ homeGoals: 2, awayGoals: 1 });
    expect(buildLiveStudioRevealLine(fixture, score, event)).not.toContain("1-1");
  });
});

describe("Live Studio inline table visibility", () => {
  const previousRows = [
    { userId: "p", username: "Phil", position: 1, points: 20 },
    { userId: "d", username: "Dave", position: 2, points: 18 },
  ];
  test("hides a table when only points have changed", () => {
    const currentRows = previousRows.map((row) => ({ ...row, points: row.points + 7 }));
    expect(getLiveStudioChangedTableSnapshot(previousRows, currentRows)).toBeNull();
    expect(buildLiveStudioTableImpactLine({ previousRows, currentRows })).toBe("");
  });
  test("shows a table when a position changes and names the selected league", () => {
    const currentRows = [{ ...previousRows[1], position: 1, points: 25 }, { ...previousRows[0], position: 2 }];
    expect(getLiveStudioChangedTableSnapshot(previousRows, currentRows)).toEqual({ previousRows, currentRows });
    const line = buildLiveStudioTableImpactLine({ previousRows, currentRows, leagueName: "The Originals", seed: "table" });
    expect(line).toContain("The Originals");
    expect(line).toContain("Dave");
  });
  test("does not treat a new row or a missing rank as an overtake", () => {
    expect(getLiveStudioChangedTableSnapshot([], previousRows)).toBeNull();
    expect(getLiveStudioChangedTableSnapshot([{ username: "Phil" }], previousRows)).toBeNull();
  });
});

describe("Live Studio ongoing stories", () => {
  const exactPick = { username: "Phil", prediction: { homeGoals: 1, awayGoals: 0 } };
  const first = { ...goal(20), homeGoals: 1, awayGoals: 0 };
  const equaliser = { ...goal(50, "Away striker"), teamName: "Coventry", homeGoals: 1, awayGoals: 1 };
  const reversal = { ...equaliser, type: "GOAL_DISALLOWED", minute: 52, homeGoals: 1, awayGoals: 0, previousHomeGoals: 1, previousAwayGoals: 1 };

  test("remembers a Bingpot that was lost and restored, including after a reload", () => {
    const options = { fixture, event: reversal, score: { homeGoals: 1, awayGoals: 0 },
      previousScore: { homeGoals: 1, awayGoals: 1 }, picks: [exactPick], history: [first, equaliser, reversal], seed: "comeback" };
    const line = buildLiveStudioStakesLine(options);
    expect(line).toContain("Phil");
    expect(line).toMatch(/back|returned|full circle/);
    expect(buildLiveStudioStakesLine(JSON.parse(JSON.stringify(options)))).toBe(line);
  });

  test("remembers a goalless prediction that was live from kickoff", () => {
    const event = { ...first, type: "GOAL_DISALLOWED", minute: 22, homeGoals: 0, awayGoals: 0 };
    const line = buildLiveStudioStakesLine({ fixture, event, score: { homeGoals: 0, awayGoals: 0 },
      previousScore: { homeGoals: 1, awayGoals: 0 }, picks: [{ username: "Phil", prediction: { homeGoals: 0, awayGoals: 0 } }],
      history: [first], seed: "goalless-comeback" });
    expect(line).toContain("Phil");
    expect(line).toMatch(/back|returned|full circle/);
  });

  test("does not invent a callback from future events or incomplete history", () => {
    const options = { fixture, event: first, score: { homeGoals: 1, awayGoals: 0 },
      previousScore: { homeGoals: 0, awayGoals: 0 }, picks: [exactPick], history: [first, equaliser, reversal], seed: "new" };
    expect(buildLiveStudioStakesLine(options)).not.toMatch(/back on|back!|Remember|returned|full circle/);
  });

  test("combines the joy and heartbreak of two players in one reaction", () => {
    const line = buildLiveStudioStakesLine({ fixture, event: equaliser, score: { homeGoals: 1, awayGoals: 1 },
      previousScore: { homeGoals: 1, awayGoals: 0 }, picks: [exactPick, { username: "Emma", prediction: { homeGoals: 1, awayGoals: 1 } }], seed: "conflict" });
    expect(line).toContain("Phil");
    expect(line).toContain("Emma");
    expect(line).toContain("Bingpot");
    expect(line).not.toMatch(/1-0|1-1/);
  });

  test("a restored Bingpot can also cost a rival theirs", () => {
    const line = buildLiveStudioStakesLine({ fixture, event: reversal, score: { homeGoals: 1, awayGoals: 0 },
      previousScore: { homeGoals: 1, awayGoals: 1 }, picks: [exactPick, { username: "Emma", prediction: { homeGoals: 1, awayGoals: 1 } }],
      history: [first, equaliser], seed: "reverse-conflict" });
    expect(line).toContain("Phil's Bingpot is back");
    expect(line).toContain("Emma");
  });
});

describe("Live Studio pacing and quiet periods", () => {
  const kickoff = Date.parse("2026-10-16T12:00:00Z");
  const matchFixture = { ...fixture, kickoff: new Date(kickoff).toISOString() };
  const pick = { username: "Dave", prediction: { homeGoals: 1, awayGoals: 1 } };
  const match = { fixture: matchFixture, score: { homeGoals: 1, awayGoals: 1 }, live: true, paused: false, finished: false,
    minute: 87, lastNewsAt: kickoff + 75 * 60000, picks: [pick], events: [] };
  const nowMs = kickoff + 100 * 60000;

  test("adds late tension only in the final ten minutes, without repeating a score", () => {
    const options = { ...match, seed: "late" };
    expect(buildLiveStudioLateLine({ ...options, minute: 79 })).toBe("");
    expect(buildLiveStudioLateLine({ ...options, minute: null })).toBe("");
    const line = buildLiveStudioLateLine(options);
    expect(line).toContain("Dave");
    expect(line).not.toContain("1-1");
    expect(buildLiveStudioLateLine({ ...options, picks: [] })).toBe("");
  });

  test("the fallback clock allows for half-time and never uses an old event as the current clock", () => {
    expect(getLiveStudioClockMinute(matchFixture, { status: "IN_PLAY" }, kickoff + 90 * 60000)).toBe(75);
    expect(getLiveStudioClockMinute(matchFixture, { status: "PAUSED" }, nowMs)).toBe(45);
    expect(getLiveStudioClockMinute(matchFixture, { status: "SCHEDULED" }, nowMs)).toBeNull();
    expect(getLiveStudioClockMinute(matchFixture, { status: "IN_PLAY", minute: 87 }, nowMs)).toBe(87);
  });

  test("suppresses studio filler straight after news breaks", () => {
    expect(buildLiveStudioDeskEntries({ matches: [{ ...match, lastNewsAt: nowMs - 60000 }], nowMs })).toEqual([]);
  });

  test("produces one stable late-match studio card and does not show an unchanged table", () => {
    const entries = buildLiveStudioDeskEntries({ matches: [match], nowMs });
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("Watching the clock");
    expect(entries[0].lines.join(" ")).toContain("Dave");
    expect(entries[0].tableSnapshot).toBeUndefined();
    expect(buildLiveStudioDeskEntries({ matches: [match], nowMs: nowMs + 1000 })).toEqual(entries);
  });

  test("quiet periods do not add an unscheduled studio roundup", () => {
    const other = { ...match, fixture: { ...matchFixture, id: 18, homeTeam: "Liverpool" }, minute: 65 };
    const entries = buildLiveStudioDeskEntries({ matches: [{ ...match, minute: 40 }, other, { ...match, live: false, finished: true }], nowMs });
    expect(entries).toEqual([]);
    expect(buildLiveStudioDeskEntries({ matches: [{ ...match, live: false }], nowMs })).toEqual([]);
  });

  test("routine events get one line; big personal moments suppress extra jokes", () => {
    const options = { revealLine: "The event", stakesLine: "Phil loses Bingpot", aside: "A silly joke", tableImpactLine: "Phil drops to second" };
    expect(buildLiveStudioEntryLines({ ...options, entryKind: "yellow-card" })).toEqual(["The event"]);
    expect(buildLiveStudioEntryLines({ ...options, entryKind: "substitution" })).toEqual(["The event"]);
    expect(buildLiveStudioEntryLines({ ...options, entryKind: "goal" })).toEqual(["The event", "Phil loses Bingpot", "Phil drops to second"]);
    expect(buildLiveStudioEntryLines({ ...options, entryKind: "goal", aside: "Hat-trick for Saka", isMilestone: true })).toContain("Hat-trick for Saka");
  });
});

describe("Live Studio closing verdict", () => {
  const kickoff = Date.parse("2026-10-16T12:00:00Z");
  const match = {
    fixture: { ...fixture, kickoff: new Date(kickoff).toISOString() }, score: { homeGoals: 2, awayGoals: 0 }, finished: true,
    picks: [{ userId: "p", username: "Phil", prediction: { homeGoals: 1, awayGoals: 0 } },
      { userId: "e", username: "Emma", prediction: { homeGoals: 2, awayGoals: 0, isTriple: true } }],
    events: [{ ...goal(89), homeGoals: 2, awayGoals: 0, previousHomeGoals: 1, previousAwayGoals: 0 }],
  };
  const nowMs = kickoff + 110 * 60000;

  test("names the best points return, the lost Bingpot, and an evidenced table swing", () => {
    const before = [{ username: "Phil", position: 1 }, { username: "Emma", position: 2 }];
    const after = [{ username: "Emma", position: 1 }, { username: "Phil", position: 2 }];
    const lines = buildLiveStudioClosingVerdict({ matches: [match], leagueName: "The Originals",
      tableSwings: [{ fixture: match.fixture, event: match.events[0], previousRows: before, currentRows: after }] });
    expect(lines[0]).toContain("Emma");
    expect(lines[0]).toContain("21 prediction points");
    expect(lines[1]).toContain("Phil");
    expect(lines[2]).toContain("Saka");
    expect(lines[2]).toContain("The Originals");
    expect(lines.join(" ")).not.toContain("2-0");
  });

  test("shares credit for ties, and does not invent a table swing", () => {
    const picks = [{ username: "Phil", prediction: { homeGoals: 2, awayGoals: 0 } }, { username: "Emma", prediction: { homeGoals: 2, awayGoals: 0 } }];
    const lines = buildLiveStudioClosingVerdict({ matches: [{ ...match, picks }] });
    expect(lines).toHaveLength(1);
    expect(lines[0]).toContain("Honours shared");
    expect(lines[0]).toContain("7 prediction points each");
  });

  test("waits for matches in play to finish without delaying for the next kickoff", () => {
    expect(buildLiveStudioDeskEntries({ matches: [match], nowMs, nextKickoffMs: nowMs + 30 * 60000 })).toHaveLength(1);
    expect(buildLiveStudioClosingVerdict({ matches: [match, { ...match, finished: false }] })).toEqual([]);
    const entries = buildLiveStudioDeskEntries({ matches: [match], nowMs });
    expect(entries).toHaveLength(1);
    expect(entries[0].verdictLabel).toBe("Back in the studio");
    expect(entries[0].tableSnapshot).toBeNull();
  });

  test("does not claim heartbreak from a goal that was superseded", () => {
    const lines = buildLiveStudioClosingVerdict({ matches: [{ ...match, score: { homeGoals: 3, awayGoals: 0 } }] });
    expect(lines.join(" ")).not.toContain("Cruellest finish");
  });
});
