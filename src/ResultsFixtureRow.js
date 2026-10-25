import React from "react";
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

export default function ResultsFixtureRow({ home, away, score, scoreLabel, stageLabel, points, prediction, live, isMobile, theme, inputStyle }) {
  return (
    <div
      className="results-fixture-card"
      style={{ background: theme.panelHi, borderColor: live ? "#22c55e" : "rgba(255,255,255,0.3)", "--results-muted": theme.muted, "--results-accent": theme.accent }}
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
    </div>
  );
}
