// CommonJS for the browser bundle, Node backend and Netlify fixture feed.
function hasStudioLineups(state = {}) {
  if (state.lineupsAvailable === true) return true;
  const complete = team => Array.isArray(team && team.lineup) && team.lineup.filter(player => String(player && player.name || '').trim()).length >= 11;
  return complete(state.lineups && state.lineups.home || state.homeTeam) && complete(state.lineups && state.lineups.away || state.awayTeam);
}
function lineupTimeKey(fixture) { return `${fixture.id}|${fixture.kickoff}`; }
function getStudioLineupTime(fixture, state = {}, saved, now = Date.now()) {
  const kickoff = Date.parse(fixture.kickoff);
  const candidates = [state.lineupsAnnouncedAt, state.recordedState && state.recordedState.lineupsAnnouncedAt, saved]
    .map(value => Date.parse(value || '')).filter(time => Number.isFinite(time) && time >= kickoff - 90 * 60000 && time <= kickoff && time <= now);
  return candidates.length ? new Date(Math.min(...candidates)).toISOString() : '';
}

function pickPrematchPhrase(seed, choices) {
  let hash = 2166136261;
  for (const character of seed) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return choices[(hash >>> 0) % choices.length];
}

function recentOutcomes(matches) {
  const outcomes = [];
  for (const match of (matches || []).slice(0, 5)) {
    if (!['W', 'D', 'L'].includes(match.outcome)) break;
    outcomes.push(match.outcome);
  }
  return outcomes;
}

function countUnbeaten(outcomes) {
  const firstLoss = outcomes.indexOf('L');
  return firstLoss < 0 ? outcomes.length : firstLoss;
}

function buildStudioFormNote(fixture, form, teamNames = [fixture.homeTeam, fixture.awayTeam]) {
  const seed = lineupTimeKey(fixture);
  const stories = ['home', 'away'].map((side, index) => {
    const team = teamNames[index];
    const outcomes = recentOutcomes(form[side]);
    if (!team || !outcomes.length) return null;

    const latest = outcomes[0];
    const changedAt = outcomes.findIndex(outcome => outcome !== latest);
    const streak = changedAt < 0 ? outcomes.length : changedAt;
    if (streak >= 2 && latest === 'W') return {
      weight: 5 + streak,
      lines: streak === 5 ? [
        `${team} have won their last five and will want to keep that run going.`,
        `Five wins in the form guide for ${team}, who have a chance to extend the run here.`,
      ] : [
        `${team} are hoping to make it ${streak + 1} wins in a row.`,
        `That's ${streak} straight wins for ${team}, and another would extend the run.`,
        `Can ${team} follow up ${streak} consecutive wins with another here?`,
      ],
    };
    if (streak >= 2 && latest === 'L') return {
      weight: 5 + streak,
      lines: [
        `${team} need a win to get back on track after ${streak} straight defeats.`,
        `It's been ${streak} defeats in a row for ${team}, who will be looking for a response here.`,
        `Can ${team} put an end to a run of ${streak} straight defeats?`,
      ],
    };
    if (streak >= 2 && latest === 'D') return {
      weight: 4 + streak,
      lines: [
        `${team} have drawn their last ${streak} and will be looking to go one better here.`,
        `After ${streak} draws on the bounce, can ${team} turn a point into three?`,
      ],
    };
    if (outcomes.length >= 3 && !outcomes.includes('L')) return {
      weight: 5,
      lines: [`${team} are unbeaten in their last ${outcomes.length} and will look to extend that run.`],
    };
    if (outcomes.length >= 3 && !outcomes.includes('W')) return {
      weight: 5,
      lines: [`${team} are looking for a first win after ${outcomes.length} matches without one.`],
    };
    return { weight: 1, lines: [{
      W: `${team} won last time out and will want to build on that result.`,
      D: `${team} drew last time out and will be looking to go one better here.`,
      L: `${team} lost last time out and have a chance to bounce back here.`,
    }[latest]] };
  }).filter(Boolean);
  if (!stories.length) return '';
  const strongest = Math.max(...stories.map(story => story.weight));
  return pickPrematchPhrase(`${seed}:note`, stories.filter(story => story.weight === strongest).flatMap(story => story.lines));
}

function buildStudioBuildupPreview(fixture, { form = {}, probabilities, teamNames = [fixture.homeTeam, fixture.awayTeam] } = {}) {
  const [home, away] = teamNames;
  const homeForm = recentOutcomes(form.home);
  const awayForm = recentOutcomes(form.away);
  const pick = choices => pickPrematchPhrase(`${lineupTimeKey(fixture)}:buildup`, choices);
  const opening = pick([
    'Watch the first few minutes. Who can get on the front foot?',
    'The line-ups are in. Which side will settle first and set the tempo?',
    'One early chance could change the feel of this one. Which side will create it?',
    'Almost time. Will either side take the initiative from the first whistle?',
  ]);

  if (probabilities && [probabilities.home, probabilities.draw, probabilities.away].every(value => Number.isFinite(value) && value >= 0 && value <= 100)) {
    const homeAhead = probabilities.home >= probabilities.away;
    const [favourite, challenger] = homeAhead ? [home, away] : [away, home];
    const [favouriteForm, challengerForm] = homeAhead ? [homeForm, awayForm] : [awayForm, homeForm];
    const winChance = Math.round(Math.max(probabilities.home, probabilities.away));
    const gap = Math.round(Math.abs(probabilities.home - probabilities.away));
    if (Math.round(probabilities.draw) > winChance) return [
      `A draw is the pre-match model's most likely result (${Math.round(probabilities.draw)}%).`,
      pick(['Who can find a way to break the deadlock?', 'An early goal would change the picture. Which side will take the first risk?']),
    ];
    if (gap <= 5) return [
      'The pre-match model has almost nothing between these two sides.',
      homeForm[0] === 'W' && awayForm[0] === 'L' ? `Can ${home} carry the momentum from their last win into the opening exchanges?`
        : awayForm[0] === 'W' && homeForm[0] === 'L' ? `Can ${away} carry the momentum from their last win into the opening exchanges?` : opening,
    ];
    const challengerUnbeaten = countUnbeaten(challengerForm);
    return [
      gap >= 15 ? `The pre-match model makes ${favourite} favourites with a ${winChance}% chance of winning.`
        : `The pre-match model gives ${favourite} a slight edge at ${winChance}% to win.`,
      challengerUnbeaten >= 3 ? `Can ${challenger}, unbeaten in their last ${challengerUnbeaten} matches, put that forecast under pressure?`
        : favouriteForm[0] === 'L' && favouriteForm[1] === 'L' ? `Can ${favourite} shake off back-to-back defeats and take charge early?`
        : pick([
          `Can ${challenger} get at them early and turn the pressure around?`,
          `Watch how ${challenger} start. An early chance could put a different spin on this one.`,
          `The first goal could change the shape of this. Can ${challenger} get it?`,
        ]),
    ];
  }

  if (homeForm[0] === 'W' && awayForm[0] === 'W') return [
    pick([
      'Both teams won last time out. Who can turn that confidence into an early advantage?',
      'Both sides come in off a win. Let’s see who takes the initiative first.',
    ]),
  ];
  const inForm = [[home, away, homeForm, awayForm], [away, home, awayForm, homeForm]]
    .find(([, , teamForm, opponentForm]) => teamForm[0] === 'W' && (teamForm[1] === 'W' || opponentForm[0] === 'L'));
  if (inForm) {
    const [team, opponent] = inForm;
    return [pick([
      `Can ${team} bring their winning momentum into the opening exchanges, or will ${opponent} set the tempo?`,
      `Keep an eye on the opening minutes. Can ${opponent} wrestle the initiative away from an in-form ${team}?`,
    ])];
  }
  const homeUnbeaten = countUnbeaten(homeForm);
  const awayUnbeaten = countUnbeaten(awayForm);
  if (Math.max(homeUnbeaten, awayUnbeaten) >= 3) {
    if (homeUnbeaten >= 3 && awayUnbeaten >= 3) return ['Both sides are on unbeaten runs. Who can put the other under pressure from the first whistle?'];
    const [team, opponent, unbeaten] = homeUnbeaten > awayUnbeaten ? [home, away, homeUnbeaten] : [away, home, awayUnbeaten];
    return [`${team} are unbeaten in their last ${unbeaten} matches. What can ${opponent} do to unsettle them early?`];
  }
  return [opening];
}

function buildStudioPrematchCards({ fixture, state = {}, now = Date.now(), announcedAt, form = null }) {
  const kickoff = Date.parse(fixture.kickoff), announced = Date.parse(announcedAt || state.lineupsAnnouncedAt || '');
  if (!hasStudioLineups(state) || !['TIMED', 'SCHEDULED', 'LIVE', 'IN_PLAY', 'PAUSED', 'EXTRA_TIME', 'PENALTY_SHOOTOUT', 'FINISHED'].includes(String(state.status || '').toUpperCase())
    || !Number.isFinite(kickoff) || !Number.isFinite(announced) || now - kickoff > 8 * 3600000 || kickoff - now > 90 * 60000 || announced > now) return [];
  const cards = [];
  const add = (kind, moment, title, lines, extra) => {
    if (moment > now || moment >= kickoff) return;
    const key = `${fixture.id}:pre-match-${kind}:${kickoff}`;
    cards.push(Object.assign({ id: key, updateKey: key, fixtureId: fixture.id, fixture,
      competitionLabel: fixture.competitionLabel || 'Premier League', minute: 'PRE', momentMs: moment, title, lines,
      tone: 'live', prematch: true, footballOnly: fixture.competition === 'champions' }, extra));
  };
  const league = fixture.competition === 'champions' ? 'Champions League' : 'Premier League';
  add('form', announced + 30 * 60000, 'The pre-match form guide', [
    pickPrematchPhrase(`${lineupTimeKey(fixture)}:intro`, [
      `Before the first whistle, here's how both sides have been doing in the ${league}.`,
      `How are these two coming into kick-off? Here's their recent ${league} form.`,
      `While we wait for kick-off, let's see what their latest ${league} results tell us.`,
      `Let's check the recent ${league} results as both teams get ready to go.`,
      `Time to see how these two have fared lately in the ${league}.`,
    ]),
  ], { icon: '📊', formCard: true, championsForm: form });
  const buildupAt = Math.max(kickoff - 15 * 60000, announced);
  const minutes = Math.ceil((kickoff - buildupAt) / 60000);
  if (buildupAt <= now && buildupAt < kickoff) {
    const teamNames = [fixture.homeTeam, fixture.awayTeam].map(team => String(team || '').replace(/\s+(FC|AFC)$/i, ''));
    add('buildup', buildupAt, 'The countdown is on', [
      `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} to kick-off: ${teamNames.join(' v ')}.`,
    ].concat(buildStudioBuildupPreview(fixture, { form: form || {}, teamNames })), { icon: '⏳', buildupCard: true });
  }
  return cards;
}
module.exports = { hasStudioLineups, lineupTimeKey, getStudioLineupTime, buildStudioPrematchCards, buildStudioFormNote, buildStudioBuildupPreview };
