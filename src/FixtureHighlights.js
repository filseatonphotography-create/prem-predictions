import React, { useEffect, useState } from "react";

function OfficialHighlightLink({ href, thumbnail, title, source, action, theme }) {
  return <a className="results-highlights-link" style={{ color: theme.text, borderColor: theme.line }}
    href={href} target="_blank" rel="noopener noreferrer">
    {thumbnail && <img src={thumbnail} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} />}
    <span><strong>{title}</strong><span className="results-highlights-source" style={{ color: theme.muted }}>{source}</span>
      {action && <span style={{ color: theme.accent }}>{action}</span>}</span>
  </a>;
}

function regionLabel(regions) {
  if (!regions) return "";
  const names = typeof Intl.DisplayNames === "function" ? new Intl.DisplayNames(["en"], { type: "region" }) : null;
  const list = regions.allowed || regions.blocked;
  if (!Array.isArray(list) || !list.length) return "";
  const countries = list.filter(code => /^[A-Z]{2}$/.test(code));
  const detail = countries.map(code => names?.of(code) || code).join(", ");
  if (!detail || countries.length > 6) return "Regional restrictions apply";
  return regions.allowed ? `Available in ${detail}` : `Unavailable in ${detail}`;
}

export default function FixtureHighlights({ fixtureId, finished, active, base = "", theme, searchQuery }) {
  const [state, setState] = useState({ status: "loading", videos: [] });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!active || !finished || !fixtureId) return undefined;
    const controller = new AbortController();
    let cancelled = false;
    setState({ status: "loading", videos: [] });
    const timeout = setTimeout(() => controller.abort(), 15000);
    (async () => {
      try {
        const response = await fetch(`${base}/api/fixtures/${encodeURIComponent(fixtureId)}/highlights`, { signal: controller.signal });
        if (!response.ok) throw new Error("Highlights unavailable");
        const data = await response.json();
        const videos = (Array.isArray(data.videos) ? data.videos : []).filter(video => /^[\w-]{11}$/.test(video.videoId || "")).slice(0, searchQuery ? 4 : 1);
        if (!cancelled) setState({ status: videos.length ? "available" : data.status === "error" ? "error" : "empty", videos });
      } catch {
        if (!cancelled) setState({ status: "error", videos: [] });
      } finally { clearTimeout(timeout); }
    })();
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [active, finished, fixtureId, base, attempt, searchQuery]);

  return <div>
    <div className="results-fixture-detail-label" style={{ color: theme.muted }}>Official highlights</div>
    {!finished ? <div>Highlights will appear after full time, when available.</div>
      : state.status === "loading" ? <div role="status">Checking for highlights…</div>
      : state.status === "error" ? <div>Highlights could not be loaded. <button type="button" className="results-highlights-retry" style={{ color: theme.accent }} onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
      : state.videos.length ? <>
        <div className="results-highlights-list">{state.videos.map(video => <OfficialHighlightLink key={video.videoId}
          href={`https://www.youtube.com/watch?v=${video.videoId}`} thumbnail={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
          title={video.title} source={[video.channelName, searchQuery && regionLabel(video.regions)].filter(Boolean).join(" · ")}
          action="▶ Watch on YouTube ↗" theme={theme} />)}</div>
        {!searchQuery && <div style={{ color: theme.muted, fontSize: 11 }}>Availability may vary by country.</div>}
      </> : <div>Official highlights are not available yet.</div>}
    {searchQuery && (state.status === "empty" || state.status === "error"
      || (state.status === "available" && state.videos.every(video => video.regions))) && (
      <a href={`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`} target="_blank" rel="noopener noreferrer"
        style={{ color: theme.accent }}>Search YouTube for this match ↗</a>
    )}
  </div>;
}
