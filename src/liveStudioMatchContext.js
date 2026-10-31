// Event-time facts only: no wall-clock guesses and no live result treated as form.
function pick(seed, choices) {
  let hash = 2166136261;
  for (const character of String(seed)) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return choices[(hash >>> 0) % choices.length];
}
function number(value) {
  return value !== null && value !== undefined && value !== "" && Number.isFinite(Number(value)) ? Number(value) : null;
}
export function getCommentaryPhase(event = {}) {
  const minute = number(event.minute);
  if (event.estimatedMinute || minute == null) return "";
  if (minute > 90 || minute === 90 && number(event.injuryTime) > 0) return "injury-time";
  if (minute >= 85) return "late";
  if (minute >= 80) return "closing";
  if (minute >= 46 && minute <= 55) return "restart";
  if (minute >= 40 && minute <= 45) return "half-time";
  if (minute >= 0 && minute <= 10) return "early";
  return "";
}
function validScore(score) {
  return score && number(score.homeGoals) != null && number(score.awayGoals) != null
    && Number(score.homeGoals) >= 0 && Number(score.awayGoals) >= 0;
}
function difference(score, side) {
  return (Number(score.homeGoals) - Number(score.awayGoals)) * (side === "home" ? 1 : -1);
}
function facts({ score, previousScore, side }) {
  if (!side || !validScore(score) || !validScore(previousScore)) return null;
  const scored = side === "home" ? "homeGoals" : "awayGoals", other = side === "home" ? "awayGoals" : "homeGoals";
  if (Number(score[scored]) - Number(previousScore[scored]) !== 1 || Number(score[other]) !== Number(previousScore[other])) return null;
  return { before: difference(previousScore, side), after: difference(score, side) };
}
function streak(form, outcome) {
  let count = 0;
  for (const match of form || []) {
    if ((typeof match === "string" ? match : match.outcome) !== outcome) break;
    count += 1;
  }
  return count;
}
function background({ team, opponent, side, score, probabilities, form = [], seed, red = false }) {
  if (!side || !team || !validScore(score)) return "";
  const margin = difference(score, side), otherSide = side === "home" ? "away" : "home";
  const chance = number(probabilities?.[side]), otherChance = number(probabilities?.[otherSide]);
  const chances = [probabilities?.home, probabilities?.draw, probabilities?.away].map(number);
  const validProbabilities = chances.every(value => value != null && value >= 0 && value <= 100)
    && Math.abs(chances.reduce((total, value) => total + value, 0) - 100) < 1;
  const options = [];
  if (!red && margin >= 0 && validProbabilities && chance <= 30 && otherChance >= 50) {
    options.push(...(margin > 0 ? [
      `A possible upset is brewing: ${team} were the underdogs in the pre-match model.`,
      `The pre-match model favoured ${opponent}. ${team} clearly have other ideas!`,
      `${team}, the model's underdogs, are threatening to turn the script upside down.`,
    ] : [
      `The underdogs are level! The pre-match model gave ${team} the tougher task.`,
      `${team} are giving the pre-match favourites something to think about.`,
    ]));
  }
  if (red && validProbabilities && chance >= 55 && otherChance <= 30) options.push(
    `${team} were the pre-match favourites. The dismissal has given ${opponent} an opening.`,
    `The model favoured ${team} before kick-off. This red card gives ${opponent} something to work with.`);
  if (red && validProbabilities && chance <= 30 && otherChance >= 50) options.push(
    `The pre-match model already had ${team} as underdogs. Now they must do it the hard way.`);
  const wins = streak(form, "W"), losses = streak(form, "L");
  if (wins >= 3) options.push(...(!red && margin > 0 ? [
    `${team} could make it ${wins + 1} wins in a row this season if they hold this lead.`,
    `After ${wins} straight wins, ${team} are on course to keep that run going. Still work to do!`,
    `The winning habit is hard to shake: ${wins} straight victories coming in, and ${team} are ahead again.`,
  ] : margin <= 0 || red ? [
    `${team} arrived with ${wins} straight wins. That run has a real test on its hands now.`,
    `A run of ${wins} consecutive wins is on the line for ${team}. This has made life interesting.`,
  ] : []));
  if (losses >= 3) options.push(...(!red && margin > 0 ? [
    `After ${losses} straight defeats, ${team} have a chance to get back to winning ways.`,
    `${team} have lost their last ${losses}. A lead to protect at last—can they finish the job?`,
    `There could be some relief for ${team}: ${losses} straight losses coming in, but they are ahead here.`,
  ] : [
    `${losses} straight defeats coming into this for ${team}. They badly need something to change.`,
    `After losing their last ${losses}, ${team} can hardly afford another result like that.`,
  ]));
  if (!options.length && !red && margin > 0 && form.length >= 5) {
    const recent = form.slice(0, 5).map(match => typeof match === "string" ? match : match.outcome);
    const defeats = recent.filter(outcome => outcome === "L").length;
    if (recent.every(outcome => ["W", "D", "L"].includes(outcome)) && defeats >= 3)
      options.push(`${team} have lost ${defeats} of their last five. This could be the start of a much-needed response.`);
  }
  return options.length ? pick(`${seed}:background`, options) : "";
}
function hadEarlierLead(events, event, side) {
  const time = item => number(item.sortMinute) ?? (number(item.minute) || 0) + (number(item.injuryTime) || 0) / 100;
  return (events || []).some(past => past.type === "GOAL" && !past.synthetic && validScore(past)
    && time(past) < time(event) && difference(past, side) > 0
    && !events.some(decision => decision.type === "GOAL_DISALLOWED" && time(decision) >= time(past) && time(decision) < time(event)
      && (Number(decision.previousHomeGoals) === Number(past.homeGoals) && Number(decision.previousAwayGoals) === Number(past.awayGoals)
        || validScore(decision) && (Number(past.homeGoals) - Number(decision.homeGoals) === 1 && Number(past.awayGoals) === Number(decision.awayGoals)
          || Number(past.awayGoals) - Number(decision.awayGoals) === 1 && Number(past.homeGoals) === Number(decision.homeGoals)))));
}
export function buildGoalMatchContext(options = {}) {
  const { event = {}, team, opponent, side, events = [], seed = "goal" } = options;
  const phase = getCommentaryPhase(event), change = facts(options);
  let moment = "", phaseCovered = false;
  if (change && team && opponent) {
    if (change.before < 0 && change.after === 0) {
      phaseCovered = phase === "late" || phase === "injury-time";
      moment = pick(`${seed}:equaliser`, phaseCovered ? [
        `A ${phase === "injury-time" ? "stoppage-time" : "late"} equaliser for ${team}! ${opponent} were so close to seeing this out.`,
        `Heartbreak for ${opponent}! ${team} have dragged themselves level ${phase === "injury-time" ? "in injury time" : "with the clock running down"}.`,
        `Do not go anywhere! ${team} have found a ${phase === "injury-time" ? "stoppage-time" : "late"} equaliser, and ${opponent}'s lead has gone.`,
      ] : [
        `An equaliser for ${team}! All square again, and ${opponent} have to start over.`,
        `${team} are back on terms! That lead did not survive.`,
        `Level again! ${team} have found a way back into this.`,
      ]);
    } else if (change.before === 0 && change.after > 0) {
      phaseCovered = phase === "late" || phase === "injury-time";
      const back = hadEarlierLead(events, event, side);
      moment = pick(`${seed}:lead`, phaseCovered ? [
        `Heartbreak for ${opponent}! ${team} may have found a ${phase === "injury-time" ? "stoppage-time" : "late"} winner. Can they hold on?`,
        `${team} ${back ? "are back in front" : "take the lead"} ${phase === "injury-time" ? "in injury time" : "right at the business end"}! That could be the decisive blow.`,
        `What a moment for ${team}! A possible ${phase === "injury-time" ? "injury-time" : "late"} winner, and ${opponent} are running out of time to respond.`,
      ] : back ? [
        `${team} are back in front! ${opponent} had hauled them back, but the lead has changed again.`,
        `The advantage swings back to ${team}! This match will not sit still.`,
        `${team} retake the lead! Another twist for ${opponent} to deal with.`,
      ] : [
        `${team} take the lead! Now ${opponent} have a different problem to solve.`,
        `The breakthrough for ${team}! The pressure is back on ${opponent}.`,
        `${team} move in front! A big shift in the mood of this one.`,
      ]);
    } else if (change.before > 0 && change.after > change.before) moment = pick(`${seed}:extend`, [
      `${team} stretch their lead! A little breathing room, and a much steeper climb for ${opponent}.`,
      `Another blow for ${opponent}! ${team} have given themselves a bigger cushion.`,
      `${team} pull further clear. That comeback is getting harder by the minute.`,
    ]);
    else if (change.after < 0) moment = pick(`${seed}:response`, [
      `${team} pull one back, but ${opponent} still lead. A lifeline rather than a rescue—yet.`,
      `A response from ${team}! There is still a deficit to erase.`,
      `${team} have cut the gap. ${opponent} cannot switch off just yet.`,
    ]);
  }
  const timings = {
    early: ["An early goal, and the game plan already needs a rewrite!", "What a start! Barely settled in, and there is already a goal to deal with.", "An early jolt to this match. So much for easing into the afternoon!"],
    "half-time": ["Right on the brink of half-time—a lovely moment to score!", "Just before the break! That changes the mood of both team talks.", "A goal to take into the dressing room. The half-time team talk just got rewritten."],
    restart: ["An early goal in the second half! Someone came out of the dressing room with a point to prove.", "What a start to the second half! The team talk has barely worn off.", "Straight back into the action after the break. No time for a quiet restart!"],
    closing: ["Into the closing stages, and the tension goes up another notch.", "A goal as this match heads towards its finish. Time to find out who can keep their nerve."],
    late: ["A late twist! There is not much time left to put this right.", "Right in the closing stages! Every remaining minute matters now.", "The clock is running down, and this match has another sting in it."],
    "injury-time": ["In injury time! This match is refusing to go quietly.", "Into stoppage time, and there is still drama left!"] };
  if (!phaseCovered && timings[phase]) moment = [moment, pick(`${seed}:timing`, timings[phase])].filter(Boolean).join(" ");
  return [moment, background(options)].filter(Boolean).join(" ");
}
export function buildRedCardMatchContext(options = {}) {
  const { event = {}, team, opponent, side, score, seed = "red" } = options;
  const phase = getCommentaryPhase(event);
  const timings = {
    early: ["An early red card! That is a long time to play short-handed.", "The game has barely got going, and the plan is in pieces already.", "An early dismissal. The rest of this match just became harder."],
    "half-time": ["Right before half-time! The manager's team talk just became a rescue plan.", "A red card on the brink of the break. No quiet dressing room after that.", "Almost at half-time, and now there is a tactical headache to take inside."],
    restart: ["An early red card in the second half! Whatever was said at the break, this was not the plan.", "Barely back out after half-time, and the game changes completely.", "A second-half restart to forget. The team talk needs another rewrite."],
    closing: ["A red card as the game enters its closing stages. A serious test of nerve now.", "Heading towards the finish, and the tactical plan has just gone out of the window."],
    late: ["A late red card! That is a desperate complication with the clock running down.", "A dismissal in the closing stages. Every remaining minute just got longer.", "A late twist, and nobody needed that kind of excitement."],
    "injury-time": ["A sending-off in injury time! This finish has lost all sense of calm.", "Stoppage-time drama! Even now, this match has another twist."] };
  const lines = timings[phase] ? [pick(`${seed}:timing`, timings[phase])] : [];
  if (team && opponent && side && validScore(score)) {
    const margin = difference(score, side);
    lines.push(pick(`${seed}:score`, margin > 0 ? [
      `${team} still have the lead, but protecting it just became a much bigger job.`,
      `${opponent} will sense an opening now. Can ${team} hang on to their lead?`,
    ] : margin === 0 ? [
      `All square, and ${team} are short-handed. Can ${opponent} take control?`,
      `${team} were level. Now they must find a way to stay in this while short-handed.`,
    ] : [
      `${team} are already behind. Chasing ${opponent} just became harder still.`,
      `Behind on the scoreboard and now short-handed. ${team} have a mountain to climb.`,
    ]));
  }
  lines.push(background({ ...options, red: true }));
  return lines.filter(Boolean).join(" ");
}
