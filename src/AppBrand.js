import React from "react";

export default function AppBrand({ isMobile, tagline }) {
  return <>
<h1
  style={{
    marginTop: "0.8rem",
    marginBottom: "0.5rem",
    fontSize: isMobile ? "1.5rem" : "3rem",
    fontWeight: 700,
    letterSpacing: "0.5px",
    maxWidth: "100%",
    overflow: "visible",
  }}
>

  Predicti
  <span
  className="football-icon"
  role="img"
  aria-label="football"
  style={{
    fontSize: isMobile ? "1.5rem" : "3rem",
    position: "relative",
    top: "-1px",
  }}
>
    ⚽
  </span>
  n Addicti
  <span
  className="football-icon"
  role="img"
  aria-label="football"
  style={{
    fontSize: isMobile ? "1.5rem" : "3rem",
    position: "relative",
    top: "-1px",
  }}
>
    ⚽
  </span>
  n
</h1>
<p style={{ margin: 0, fontSize: "0.9rem", opacity: 0.9 }}>
  {tagline}
</p>
  </>;
}
