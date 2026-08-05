const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");

const outDir = path.join(__dirname, "..", "src", "fantasyIq", "fixtures", "screenshot-import");
fs.mkdirSync(outDir, { recursive: true });

const chromeCandidates = [
  "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
  "/Applications/Chromium.app/Contents/MacOS/Chromium",
  "google-chrome",
  "chromium",
  "chrome",
];

function findChrome() {
  for (const candidate of chromeCandidates) {
    try {
      execFileSync(candidate, ["--version"], { stdio: "ignore" });
      return candidate;
    } catch {}
  }
  return "";
}

const basePlayers = [
  ["Raya", "ARS", "GK", ""],
  ["Gabriel", "ARS", "DEF", ""],
  ["Van Dijk", "LIV", "DEF", ""],
  ["Trippier", "NEW", "DEF", ""],
  ["Saka", "ARS", "MID", "C"],
  ["Salah", "LIV", "MID", "VC"],
  ["Foden", "MCI", "MID", ""],
  ["Gordon", "NEW", "MID", ""],
  ["Haaland", "MCI", "FWD", ""],
  ["Watkins", "AVL", "FWD", ""],
  ["Jo&#227;o F&#233;lix", "CHE", "FWD", ""],
  ["Areola", "EVE", "GK", ""],
  ["Smith-Rowe", "FUL", "MID", ""],
  ["Senesi", "BOU", "DEF", ""],
  ["Damsgaard", "BRE", "DEF", ""],
];

const fixtures = [
  { id: "mobile-portrait-full-squad", width: 900, height: 1600, theme: "light", columns: 1 },
  { id: "desktop-squad-layout", width: 1600, height: 950, theme: "dark", columns: 3 },
  { id: "high-resolution-light", width: 1800, height: 2600, theme: "light", columns: 1 },
  { id: "moderate-resolution-dark", width: 900, height: 1300, theme: "dark", columns: 1 },
  { id: "cropped-bench", width: 900, height: 1150, theme: "light", columns: 1, cropBench: true },
  { id: "missing-captain-marker", width: 900, height: 1500, theme: "light", columns: 1, removeCaptain: true },
  { id: "intentionally-blurred", width: 900, height: 1500, theme: "dark", columns: 1, blur: true },
  { id: "unusual-names-accents-hyphens", width: 1000, height: 1500, theme: "light", columns: 1 },
];

function card(player, index, fixture) {
  const [name, team, position, marker] = player;
  const role = index < 11 ? "XI" : "BENCH";
  const col = fixture.columns === 3 ? index % 3 : 0;
  const row = fixture.columns === 3 ? Math.floor(index / 3) : index;
  const cardWidth = fixture.columns === 3 ? 460 : fixture.width - 120;
  const x = 60 + col * 500;
  const y = 120 + row * (fixture.columns === 3 ? 135 : 82);
  if (fixture.cropBench && index > 12) return "";
  const shownMarker = fixture.removeCaptain && marker === "C" ? "" : marker;
  return `
    <g ${fixture.blur ? 'filter="url(#softBlur)"' : ""}>
      <rect x="${x}" y="${y}" width="${cardWidth}" height="58" rx="6" fill="${fixture.theme === "dark" ? "#14213d" : "#ffffff"}" stroke="${fixture.theme === "dark" ? "#7dd3fc" : "#0f766e"}" />
      <text x="${x + 18}" y="${y + 36}" font-family="Arial, Helvetica, sans-serif" font-size="28" font-weight="700" fill="${fixture.theme === "dark" ? "#f8fafc" : "#111827"}">${name}</text>
      <text x="${x + cardWidth - 190}" y="${y + 36}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${fixture.theme === "dark" ? "#bae6fd" : "#0f766e"}">${team}</text>
      <text x="${x + cardWidth - 116}" y="${y + 36}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="${fixture.theme === "dark" ? "#facc15" : "#92400e"}">${position}</text>
      <text x="${x + cardWidth - 50}" y="${y + 36}" font-family="Arial, Helvetica, sans-serif" font-size="24" font-weight="700" fill="#ef4444">${shownMarker}</text>
      <text x="${x + 18}" y="${y + 52}" font-family="Arial, Helvetica, sans-serif" font-size="12" fill="${fixture.theme === "dark" ? "#94a3b8" : "#64748b"}">${role}</text>
    </g>`;
}

const chrome = findChrome();

for (const fixture of fixtures) {
  const bg = fixture.theme === "dark" ? "#0f172a" : "#e0f2fe";
  const text = fixture.theme === "dark" ? "#f8fafc" : "#111827";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${fixture.width}" height="${fixture.height}" viewBox="0 0 ${fixture.width} ${fixture.height}">
  <defs><filter id="softBlur"><feGaussianBlur stdDeviation="1.4"/></filter></defs>
  <rect width="100%" height="100%" fill="${bg}"/>
  <text x="60" y="70" font-family="Arial, Helvetica, sans-serif" font-size="34" font-weight="800" fill="${text}">Fantasy IQ Mock Squad</text>
  ${basePlayers.map((player, index) => card(player, index, fixture)).join("\n")}
</svg>`;
  const svgPath = path.join(outDir, `${fixture.id}.svg`);
  const pngPath = path.join(outDir, `${fixture.id}.png`);
  const conversionPath = path.join(outDir, `${fixture.id}.conversion.txt`);
  fs.writeFileSync(svgPath, svg);
  if (fs.existsSync(conversionPath)) fs.unlinkSync(conversionPath);
  if (fs.existsSync(pngPath)) fs.unlinkSync(pngPath);
  try {
    if (!chrome) throw new Error("Chrome headless is unavailable.");
    execFileSync(chrome, [
      "--headless=new",
      "--disable-gpu",
      "--hide-scrollbars",
      `--window-size=${fixture.width},${fixture.height}`,
      `--screenshot=${pngPath}`,
      `file://${svgPath}`,
    ], { stdio: "ignore" });
  } catch (error) {
    fs.writeFileSync(conversionPath, `PNG conversion skipped; SVG fixture remains available. ${error.message}\n`);
  }
}
