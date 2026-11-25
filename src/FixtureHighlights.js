import React, { useEffect, useState } from "react";

function OfficialHighlightLink({ href, thumbnail, title, source, action, theme }) {
  return <a className="results-highlights-link" style={{ color: theme.text, borderColor: theme.line }}
    href={href} target="_blank" rel="noopener noreferrer">
    {thumbnail && <img src={thumbnail} alt="" loading="lazy" onError={event => { event.currentTarget.style.display = "none"; }} />}
    <span><strong>{title}</strong><span className="results-highlights-source" style={{ color: theme.muted }}>{source}</span>
      {action && <span style={{ color: theme.accent }}>{action}</span>}</span>
  </a>;
}

export default function FixtureHighlights({ fixtureId, finished, active, base = "", theme, englishOnly = false }) {
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
        const id = encodeURIComponent(fixtureId);
        const local = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);
        const endpoint = englishOnly && !local
          ? `/.netlify/functions/champions-highlight?fixtureId=${id}`
          : `${base}/api/fixtures/${id}/highlights`;
        const response = await fetch(endpoint, { signal: controller.signal });
        if (!response.ok) throw new Error("Highlights unavailable");
        const data = await response.json();
        const videos = (Array.isArray(data.videos) ? data.videos : [])
          .filter(video => /^[\w-]{11}$/.test(video.videoId || "") && (!englishOnly || video.language === "en"))
          .slice(0, 1);
        if (!cancelled) setState({ status: videos.length ? "available" : data.status === "error" ? "error" : "empty", videos });
      } catch {
        if (!cancelled) setState({ status: "error", videos: [] });
      } finally { clearTimeout(timeout); }
    })();
    return () => { cancelled = true; clearTimeout(timeout); controller.abort(); };
  }, [active, finished, fixtureId, base, attempt, englishOnly]);

  return <div>
    <div className="results-fixture-detail-label" style={{ color: theme.muted }}>Official highlights</div>
    {!finished ? <div>Highlights will appear after full time, when available.</div>
      : state.status === "loading" ? <div role="status">Checking for highlights…</div>
      : state.status === "error" ? <div>Highlights could not be loaded. <button type="button" className="results-highlights-retry" style={{ color: theme.accent }} onClick={() => setAttempt(value => value + 1)}>Try again</button></div>
      : state.videos.length ? <>
        <div className="results-highlights-list">{state.videos.map(video => <OfficialHighlightLink key={video.videoId}
          href={`https://www.youtube.com/watch?v=${video.videoId}`} thumbnail={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
          title={video.title} source={video.channelName}
          action="▶ Watch on YouTube ↗" theme={theme} />)}</div>
        {!englishOnly && <div style={{ color: theme.muted, fontSize: 11 }}>Availability may vary by country.</div>}
      </> : <div>{englishOnly ? "No verified English highlight is available in your region yet." : "Official highlights are not available yet."}</div>}
  </div>;
}
