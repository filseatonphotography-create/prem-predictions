import React, { useEffect, useRef, useState } from 'react';
import LeagueTableRow from './LeagueTableRow';
import TeamFormStrip from './TeamFormStrip';
import { readChampionsStandings, fetchChampionsStandings } from './championsStandingsClient';

export default function ChampionsLeagueTable({ base, theme, isMobile = false, resolveBadge }) {
  const [data, setData] = useState(() => readChampionsStandings(base));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [expandedTeam, setExpandedTeam] = useState('');
  const refreshRef = useRef(null);
  useEffect(() => {
    const controller = new AbortController();
    let timer, pending = false;
    const refresh = async () => {
      if (pending) return;
      pending = true; setLoading(true);
      try {
        const next = await fetchChampionsStandings(base);
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
  return <>
    <h2 style={{ marginTop: 0, fontSize: 18, textAlign: 'center', fontFamily: 'inherit', color: theme.text }}>Champions League Table</h2>
    <div style={{ marginTop: -2, marginBottom: 10, textAlign: 'center', fontSize: 12, color: theme.muted }}>Click team for form and statistics.</div>
    <div style={{ display: 'flex', justifyContent: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
      <select aria-label="Champions League season" value="current" style={{ width: isMobile ? '100%' : 260, padding: '9px 10px', borderRadius: 8, border: '1.5px solid #ffffff', background: theme.panelHi, color: theme.text, fontWeight: 700, fontSize: 13 }} onChange={() => {}}>
        <option value="current">{first && last ? `${first}/${last} Season` : 'Current season'}</option>
      </select>
      <button type="button" style={button} disabled={loading} onClick={() => refreshRef.current?.()}>{loading ? 'Refreshing…' : 'Refresh table'}</button>
    </div>
    {data?.updatedAt && <p style={{ textAlign: 'center', color: theme.muted, fontSize: 12 }}>Updated {new Date(data.updatedAt).toLocaleString()}. Standings may lag live scores.</p>}
    {loading && !data && <p role="status">Loading Champions League standings…</p>}
    {error && <p role="status" style={{ color: '#fbbf24' }}>{error}{data && !data.stale ? ' Showing the last received standings.' : ''}</p>}
    {leaguePhase && <p style={{ textAlign: 'center', fontSize: 12, color: theme.muted }}><span style={{ color: '#22c55e' }}>1–8: Round of 16</span> · <span style={{ color: '#fbbf24' }}>9–24: Knockout play-offs</span> · Positions are provisional.</p>}
    {!loading && !error && !groups.some(group => group.table.length) && <p role="status" style={{ color: theme.muted }}>Champions League standings have not been published yet.</p>}
    {groups.map((group, index) => <div key={`${group.stage}:${group.group}:${index}`} role="group" aria-label={group.group || 'League phase'} style={{ display: 'grid', gap: 8 }}>
      {[...group.table].sort((a, b) => a.position - b.position).map(row => {
        const team = row.team || {}, name = team.name || team.shortName || team.tla || 'Unknown team';
        const key = String(team.id || name), expanded = expandedTeam === key;
        const border = row.position === 1 ? '#FFD700' : leaguePhase && row.position <= 8 ? '#22c55e' : leaguePhase && row.position <= 24 ? '#fbbf24' : theme.line;
        const form = Array.isArray(row.form) ? row.form : String(row.form || '').split(',').filter(outcome => ['W', 'D', 'L'].includes(outcome)).reverse().slice(0, 5).map((outcome, i) => ({ fixtureId: `${key}:${i}`, outcome, opponentCode: '', venue: '' }));
        return <LeagueTableRow key={key} row={row} teamName={name} badgeSrc={resolveBadge?.(team.name) || team.crest} borderColor={border} first={row.position === 1} expanded={expanded} onToggle={() => setExpandedTeam(expanded ? '' : key)} isMobile={isMobile} theme={theme}>
          {expanded && <div style={{ borderTop: `1px solid ${theme.line}`, padding: isMobile ? '10px 12px 12px' : '12px 14px 14px', display: 'grid', gap: 8, background: 'rgba(255,255,255,0.02)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '58px minmax(0, 1fr)' : '68px minmax(0, 1fr)', gap: 8, alignItems: 'center' }}>
              <div style={{ fontSize: 11, fontWeight: 800, color: theme.muted, textTransform: 'uppercase', letterSpacing: 0.5 }}>Form</div>
              <TeamFormStrip form={form} emptyLabel="Champions League form is unavailable." isMobile={isMobile} theme={theme} />
            </div>
            <div style={{ fontSize: 12, color: theme.muted }}>Goals for {row.goalsFor ?? 0} · Goals against {row.goalsAgainst ?? 0} · Goal difference {row.goalDifference ?? 0}</div>
          </div>}
        </LeagueTableRow>;
      })}
    </div>)}
  </>;
}
