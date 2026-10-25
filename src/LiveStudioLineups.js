import React from "react";

export function lineupPositionOrder(position = "") {
  const text = String(position).toLowerCase().replace(/[_-]/g, " ").trim();
  if (/goalkeep|keeper/.test(text) || text === "gk") return 0;
  if (/defen[cd]|back|sweeper/.test(text) || /^(cb|lb|rb|lwb|rwb)$/.test(text)) {
    return /midfield/.test(text) ? 2 : 1;
  }
  if (/midfield|wing back/.test(text) || /^(dm|cm|am|lm|rm|cdm|cam)$/.test(text)) return 2;
  if (/forward|striker|attack|offen[cs]|winger|wing/.test(text) || /^(fw|cf|st|lw|rw)$/.test(text)) return 3;
  return 4;
}

export function sortLineupPlayers(players = []) {
  return players.map((player, index) => ({ player, index }))
    .sort((a, b) => lineupPositionOrder(a.player.position) - lineupPositionOrder(b.player.position) || a.index - b.index)
    .map(({ player }) => player);
}

export default function LiveStudioLineups({ teams, theme, isMobile = false }) {
  return (
    <div className="live-studio-lineups" style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: isMobile ? 10 : 20, marginTop: 12 }}>
      {teams.map((team, side) => (
        <section key={side} aria-label={`${team.name} starting XI`} style={{ minWidth: 0, padding: isMobile ? 8 : 12, borderRadius: 10, background: "rgba(255,255,255,0.04)", border: `1px solid ${theme.line}` }}>
          <div style={{ display: "grid", justifyItems: "center", gap: 7, textAlign: "center", marginBottom: 12 }}>
            {team.badge ? <img src={team.badge} alt={`${team.name} badge`} style={{ width: isMobile ? 42 : 54, height: isMobile ? 42 : 54, objectFit: "contain" }} />
              : <span aria-hidden="true" style={{ fontSize: 32 }}>{team.flag || "⚽"}</span>}
            <div style={{ color: theme.text, fontSize: isMobile ? 13 : 16, fontWeight: 950, overflowWrap: "anywhere" }}>{team.name}</div>
            {team.formation && <div style={{ color: theme.accent2, fontSize: 12, fontWeight: 800 }}>{team.formation}</div>}
          </div>
          {team.lineup?.length ? <ol style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 7 }}>
            {sortLineupPlayers(team.lineup).map((player, index, players) => {
              const position = lineupPositionOrder(player.position);
              const groupStart = index === 0 || position !== lineupPositionOrder(players[index - 1].position);
              return <li key={player.id || `${player.name}:${index}`}>
                {groupStart && <div style={{ color: theme.muted, fontSize: 9, fontWeight: 900, letterSpacing: 0.6, textTransform: "uppercase", borderTop: index ? `1px solid ${theme.line}` : undefined, paddingTop: index ? 8 : 0, marginBottom: 6 }}>
                  {["Goalkeeper", "Defence", "Midfield", "Attack", "Starting XI"][position]}
                </div>}
                <div style={{ display: "grid", gridTemplateColumns: "22px minmax(0, 1fr)", gap: 5, alignItems: "baseline" }}>
                  <span style={{ color: theme.accent2, fontSize: 11, fontWeight: 900, fontVariantNumeric: "tabular-nums" }}>{player.shirtNumber > 0 ? player.shirtNumber : "—"}</span>
                  <span style={{ color: theme.text, fontSize: isMobile ? 12 : 14, lineHeight: 1.4, overflowWrap: "anywhere" }}>{player.name}</span>
                </div>
              </li>;
            })}
          </ol> : <div style={{ color: theme.muted, fontSize: 12 }}>Awaiting confirmed starting XI.</div>}
        </section>
      ))}
    </div>
  );
}
