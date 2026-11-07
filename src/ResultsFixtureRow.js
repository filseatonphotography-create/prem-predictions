import React, { useId, useState } from "react";
import FixturePointsBox from "./FixturePointsBox";
import "./ResultsFixtureRow.css";

function Team({ team, away = false }) {
  const badge = team.flag ? (
    <span className="results-fixture-flag" aria-label={team.name}>{team.flag}</span>
  ) : team.badgeSrc ? (
    <img className="results-fixture-badge" src={team.badgeSrc} alt={team.name} />
  ) : null;
  const name = <span className="results-fixture-team-code">{team.code}</span>;
  return <div className="results-fixture-team">{away ? name : badge}{away ? badge : name}</div>;
}

export default function ResultsFixtureRow({ home, away, score, scoreLabel, stageLabel, points, prediction, bet, betsLoading = false, betsError = "", live, isMobile, theme, inputStyle }) {
  const [expanded, setExpanded] = useState(false);
  const detailsId = useId();
  const hasPrediction = [prediction?.homeGoals, prediction?.awayGoals].every(value =>
    value !== null && value !== undefined && String(value).trim() !== "" && Number.isInteger(Number(value)) && Number(value) >= 0
  );
  const hasBet = Number(bet?.stake) > 0;
  const selection = bet?.side === "H" ? `${home.name} to win` : bet?.side === "A" ? `${away.name} to win` : bet?.side === "D" ? "Draw" : "Selection unavailable";
  const price = Number(bet?.oddsSnapshot?.[{ H: "home", D: "draw", A: "away" }[bet?.side]]);
  const toggle = () => setExpanded(value => !value);
  return (
    <div
      className="results-fixture-card"
      style={{ background: theme.panelHi, borderColor: live ? "#22c55e" : "rgba(255,255,255,0.3)", "--results-muted": theme.muted, "--results-accent": theme.accent }}
    >
      <div
        className="results-fixture-toggle"
        role="button"
        tabIndex={0}
        aria-label={`${home.name} vs ${away.name} prediction and bets`}
        aria-expanded={expanded}
        aria-controls={detailsId}
        onClick={toggle}
        onKeyDown={event => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            toggle();
          }
        }}
      >
        {(scoreLabel || stageLabel) && (
          <div className="results-fixture-meta">
            {scoreLabel && <span style={{ color: live ? "#22c55e" : theme.muted }}>{scoreLabel}</span>}
            {stageLabel && <span className="results-fixture-stage">{stageLabel}</span>}
          </div>
        )}
        <div className="results-fixture-sections">
          <Team team={home} />
          <div className="results-fixture-score" aria-label={`${home.name} ${score.homeGoals ?? "–"}, ${away.name} ${score.awayGoals ?? "–"}`}>
            <span>{score.homeGoals ?? "–"}</span>
            <span className="results-fixture-score-divider">–</span>
            <span>{score.awayGoals ?? "–"}</span>
          </div>
          <Team team={away} away />
          <div className="results-fixture-points">
            <FixturePointsBox
              points={points}
              prediction={prediction}
              live={live}
              isMobile={isMobile}
              theme={theme}
              inputStyle={{ ...inputStyle, width: "var(--results-points-size)", minHeight: "var(--results-row-height)", fontSize: "var(--results-score-size)", padding: "6px" }}
            />
          </div>
        </div>
        <div className="results-fixture-disclosure" style={{ color: theme.muted }}>
          Prediction & bets <span aria-hidden="true">{expanded ? "▲" : "▼"}</span>
        </div>
      </div>
      <div id={detailsId} hidden={!expanded} className="results-fixture-details" style={{ borderColor: theme.line, color: theme.text }}>
        <div>
          <div className="results-fixture-detail-label" style={{ color: theme.muted }}>Prediction</div>
          {hasPrediction ? <>
            <div>{home.name} <strong>{prediction.homeGoals} – {prediction.awayGoals}</strong> {away.name}</div>
            {prediction.isTriple ? <div className="results-fixture-boost">Triple captain · 3× points</div>
              : prediction.isDouble ? <div className="results-fixture-boost">Captain · 2× points</div> : null}
          </> : <div>No prediction made.</div>}
        </div>
        <div>
          <div className="results-fixture-detail-label" style={{ color: theme.muted }}>Coin bet</div>
          {betsLoading ? <div role="status">Loading bets…</div>
            : betsError ? <div role="status">Bets could not be loaded. Please try again later.</div>
            : hasBet ? <>
              <div><strong>{bet.stake} {Number(bet.stake) === 1 ? "coin" : "coins"}</strong> on {selection}</div>
              {Number.isFinite(price) && price > 0 && <div>Odds: {price.toFixed(2)} · Possible return: {(Number(bet.stake) * price).toFixed(2)} coins</div>}
            </> : <div>No bet placed.</div>}
        </div>
      </div>
    </div>
  );
}
