import React, { useLayoutEffect, useState } from "react";
import "./AppBrand.css";

const INTRO_DURATION_MS = 1600;
// Share the intro's start time so an auth/mode handoff can finish the same intro.
// A refresh resets it; a successful login explicitly starts a new one.
let introStartedAt = null;

export function restartBrandIntro() {
  introStartedAt = null;
}

export default function AppBrand({ isMobile, tagline }) {
  const [elapsedMs] = useState(() => introStartedAt === null ? 0 : Math.max(0, Date.now() - introStartedAt));
  const showIntro = elapsedMs < INTRO_DURATION_MS;

  useLayoutEffect(() => {
    if (introStartedAt === null) introStartedAt = Date.now();
  }, []);

  return (
    <div
      className={`app-brand${isMobile ? " app-brand--compact" : ""}${showIntro ? " app-brand--intro" : ""}`}
      style={showIntro ? { "--brand-intro-delay": `-${elapsedMs}ms` } : undefined}
    >
      <h1 className="app-brand__logo" aria-label="Prediction Addiction">
        <span className="app-brand__crest" aria-hidden="true">
          <img src="/icon_180.png" alt="" width="180" height="180" />
        </span>
        <span className="app-brand__wordmark" aria-hidden="true">
          <span className="app-brand__prediction">Prediction</span>
          <span className="app-brand__addiction">Addiction</span>
          <span className="app-brand__light" />
        </span>
      </h1>
      {tagline && <p className="app-brand__tagline">{tagline}</p>}
    </div>
  );
}
