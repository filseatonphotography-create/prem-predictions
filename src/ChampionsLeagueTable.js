import React, { useEffect, useRef, useState } from 'react';
import StudioTeamBadge from './StudioTeamBadge';

export default function ChampionsLeagueTable({ base, theme, resolveBadge }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const refreshRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer, pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true; setLoading(true);
      try {
        const response = await fetch(`${base}/api/champions-league/standings`, { signal: controller.signal });
        const next = await response.json();
        if (!response.ok || !Array.isArray(next.standings)) throw new Error('Champions League standings are temporarily unavailable.');
        if (next.competition?.code && next.competition.code !== 'CL') throw new Error('Champions League standings are temporarily unavailable.');
        if (!controller.signal.aborted) { setData(next); setError(next.stale ? 'Updates are delayed. Showing the last received standings.' : ''); }
      } catch (err) { if (!controller.signal.aborted) setError(err.message); }
      finally { pending = false; if (!controller.signal.aborted) setLoading(false); }
    };
    const tick = async () => { await refresh(); if (!controller.signal.aborted) timer = setTimeout(tick, 60000); };
    refreshRef.current = refresh; tick();
    return () => { controller.abort(); clearTimeout(timer); refreshRef.current = null; };
  }, [base]);
  const groups = (data?.standings || []).filter(group => group.type === 'TOTAL' && Array.isArray(group.table));
  const leaguePhase = groups.some(group => group.stage === 'LEAGUE_STAGE' || group.table.length === 36);
  const first = data?.season?.startDate?.slice(0, 4), last = data?.season?.endDate?.slice(2, 4);
  const button = { padding: '8px 12px', borderRadius: 8, border: `1px solid ${theme.line}`, background: theme.panelHi, color: theme.text, cursor: 'pointer' };
  const cell = { padding: '10px 8px', textAlign: 'center', borderBottom: `1px solid ${theme.line}`, fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' };
  return <>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
      <div><h2 style={{ margin: 0, fontSize: 20 }}>Champions League Table</h2>
        <p style={{ margin: '5px 0', color: theme.muted, fontSize: 12 }}>{first && last ? `${first}/${last} · ` : ''}{leaguePhase ? 'League phase' : 'Competition standings'}</p></div>
      <button type="button" style={button} disabled={loading} onClick={() => refreshRef.current?.()}>{loading ? 'Refreshing…' : 'Refresh table'}</button>
    </div>
    {data?.updatedAt && <p style={{ color: theme.muted, fontSize: 12 }}>Updated {new Date(data.updatedAt).toLocaleString()}. Standings follow provider updates and may lag live scores.</p>}
    {loading && !data && <p role="status">Loading Champions League standings…</p>}
    {error && <p role="status" style={{ color: '#fbbf24' }}>{error}{data && !data.stale ? ' Showing the last received standings.' : ''}</p>}
    {leaguePhase && <p style={{ fontSize: 12, color: theme.muted }}><span style={{ color: '#22c55e' }}>1–8: Round of 16</span> · <span style={{ color: '#fbbf24' }}>9–24: Knockout play-offs</span> · 25–36: Outside qualification places. Positions are provisional.</p>}
    {!loading && !error && !groups.some(group => group.table.length) && <p role="status" style={{ color: theme.muted }}>Champions League standings have not been published yet.</p>}
    {groups.map((group, index) => <div key={`${group.stage}:${group.group}:${index}`} style={{ overflowX: 'auto', marginTop: 12 }}>
      <table style={{ borderCollapse: 'collapse', width: '100%', minWidth: 570, color: theme.text, fontSize: 13 }}>
        <caption style={{ textAlign: 'left', fontWeight: 850, marginBottom: 8 }}>{group.group || (leaguePhase ? 'League phase' : 'Champions League standings')}</caption>
        <thead><tr>{['Pos', 'Team', 'P', 'W', 'D', 'L', 'GF', 'GA', 'GD', 'Pts'].map(heading => <th key={heading} scope="col" style={{ ...cell, textAlign: heading === 'Team' ? 'left' : 'center', color: theme.muted }}>{heading}</th>)}</tr></thead>
        <tbody>{[...group.table].sort((a, b) => a.position - b.position).map(row => {
          const team = row.team || {}, name = team.shortName || team.name || team.tla || 'Unknown team';
          const border = leaguePhase ? row.position <= 8 ? '#22c55e' : row.position <= 24 ? '#fbbf24' : theme.line : theme.line;
          return <tr key={team.id || row.position} style={{ background: theme.panelHi }}>
            <td style={{ ...cell, borderLeft: `3px solid ${border}`, fontWeight: 850 }}>{row.position}</td>
            <th scope="row" style={{ ...cell, textAlign: 'left' }}><span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><StudioTeamBadge src={resolveBadge?.(team.name) || team.crest} team={name} decorative size={22} />{name}</span></th>
            {['playedGames', 'won', 'draw', 'lost', 'goalsFor', 'goalsAgainst', 'goalDifference', 'points'].map(key => <td key={key} style={{ ...cell, fontWeight: key === 'points' ? 950 : 500 }}>{row[key] ?? '—'}</td>)}
          </tr>;
        })}</tbody>
      </table>
    </div>)}
  </>;
}
