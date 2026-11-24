import React from "react";
import { OUTCOMES, POINT_TIERS } from "./predictionIqReview";
import "./PredictionIqReview.css";

const percentage = (count, total) => total ? Math.round(100 * count / total) : 0;
const scoreLabel = score => `${Number(score.homeGoals)}–${Number(score.awayGoals)}`;
const fixtureCount = count => `${count} finished ${count === 1 ? "match" : "matches"}`;

function OutcomeRate({ count, total, color }) {
  if (!total) return <span className="prediction-iq-muted">—</span>;
  return (
    <>
      <span className="prediction-iq-rate" aria-hidden="true">
        <span style={{ width: `${percentage(count, total)}%`, background: color }} />
      </span>
      <span>{count}/{total}</span>
    </>
  );
}

export default function PredictionIqReview({ week, recent, theme, resolveTeamBadge, children }) {
  if (!week.rows.length) {
    return (
      <>
        <p className="prediction-iq-empty" style={{ color: theme.muted }}>Your gameweek review will appear when the first final score is confirmed.</p>
        {children}
      </>
    );
  }

  const tierColors = [theme.accent2, theme.accent, theme.warn, theme.line];
  const pickAccuracy = percentage(week.correctResults, week.picks);
  const recentAccuracy = percentage(recent.correctResults, recent.picks);
  const accuracyChange = pickAccuracy - recentAccuracy;
  const miss = recent.recurringMiss;
  const missedOutcome = miss && OUTCOMES.find(outcome => outcome.key === miss.actual);
  const backedOutcome = miss && OUTCOMES.find(outcome => outcome.key === miss.predicted);
  const goals = total => (total / week.picks).toFixed(1);
  const teamName = name => {
    const badge = resolveTeamBadge(name);
    return (
      <span className="prediction-iq-team">
        {badge && <img src={badge} alt="" width="18" height="18" />}
        {name}
      </span>
    );
  };

  return (
    <div className="prediction-iq-review" style={{
      "--iq-panel": theme.panelHi,
      "--iq-line": theme.line,
      "--iq-muted": theme.muted,
      "--iq-accent": theme.accent,
    }}>
      <div className="prediction-iq-review-grid">
        <section className="prediction-iq-panel">
          <h3>How your points added up</h3>
          <div className="prediction-iq-total">
            <strong>{week.points} <small>pts</small></strong>
            {week.boostPoints > 0 && <span>+{week.boostPoints} from captain boosts</span>}
          </div>
          <p>{week.picks} picks across {fixtureCount(week.rows.length)}</p>
          {week.picks > 0 && (
            <div className="prediction-iq-tiers" aria-hidden="true">
              {POINT_TIERS.map(({ points }, index) => (
                <span key={points} style={{ flexGrow: week.tierCounts[points], background: tierColors[index] }} />
              ))}
            </div>
          )}
          <dl className="prediction-iq-tier-list">
            {POINT_TIERS.map(({ points, label }, index) => (
              <div key={points}>
                <dt><span style={{ background: tierColors[index] }} /> {label}</dt>
                <dd>{week.tierCounts[points]} × {points} pts</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="prediction-iq-panel">
          <h3>Result accuracy</h3>
          <div className="prediction-iq-total">
            <strong>{week.picks ? `${pickAccuracy}%` : "—"}</strong>
            {!!week.picks && !!recent.picks && (
              <span>{accuracyChange === 0 ? "Level with recent form" : `${Math.abs(accuracyChange)} percentage points ${accuracyChange > 0 ? "above" : "below"} recent form`}</span>
            )}
          </div>
          <p>{week.picks ? `${week.correctResults} of ${week.picks} results called` : "No saved picks for the finished matches"}</p>
          <table className="prediction-iq-outcomes" aria-label="Correct picks by actual result">
            <thead>
              <tr><th scope="col">Actual result</th><th scope="col">This week</th><th scope="col">Prior 5 GWs</th></tr>
            </thead>
            <tbody>
              {OUTCOMES.map(({ key, label }) => (
                <tr key={key}>
                  <th scope="row">{label}</th>
                  <td><OutcomeRate count={week.outcomes[key].correct} total={week.outcomes[key].total} color={theme.accent} /></td>
                  <td><OutcomeRate count={recent.outcomes[key].correct} total={recent.outcomes[key].total} color={theme.muted} /></td>
                </tr>
              ))}
            </tbody>
          </table>
          <p>{recent.picks ? `Recent form: ${recentAccuracy}% across ${recent.picks} settled picks.` : "Recent form will appear once you have picks from earlier gameweeks."}</p>
          {miss && (
            <p className="prediction-iq-pattern">
              <strong>Most common recent miss</strong>
              <br />You picked {backedOutcome.pick} in {miss.count} of {recent.outcomes[miss.actual].total} matches that {missedOutcome.result}.
            </p>
          )}
        </section>
      </div>

      {children}

      <section className="prediction-iq-panel">
        <h3>Fixture review</h3>
        {week.picks > 0 && (
          <p>
            {week.oneGoalAway} {week.oneGoalAway === 1 ? "pick was" : "picks were"} one goal off the exact score.
            {" "}Across your picks, you predicted {goals(week.predictedGoals)} goals per match and the matches averaged {goals(week.actualGoals)}.
          </p>
        )}
        <table className="prediction-iq-fixtures" aria-label="Finished fixtures and prediction points">
          <thead>
            <tr><th scope="col">Fixture</th><th scope="col">Pick</th><th scope="col">Final</th><th scope="col">Pts</th></tr>
          </thead>
          <tbody>
            {week.rows.map(({ fixture, prediction, result, points, basePoints, boost }) => {
              const tierIndex = POINT_TIERS.findIndex(tier => tier.points === basePoints);
              return (
                <tr key={fixture.id}>
                  <th scope="row">
                    {teamName(fixture.homeTeam)}
                    {teamName(fixture.awayTeam)}
                    <span className="prediction-iq-fixture-detail">
                      {prediction ? POINT_TIERS[tierIndex].label : "No pick"}
                      {boost > 1 && <span className="prediction-iq-boost">{boost}×</span>}
                    </span>
                  </th>
                  <td>{prediction ? scoreLabel(prediction) : "—"}</td>
                  <td>{scoreLabel(result)}</td>
                  <td style={{ color: points ? tierColors[tierIndex] : theme.muted }}>{prediction ? points : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>
    </div>
  );
}
