const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

const backendUrl = String(process.env.RENDER_BACKEND_URL || "").replace(/\/+$/, "");
const adminKey = process.env.ADMIN_KEY || "prem-admin-reset";
const outputPath = path.join(__dirname, "..", "data", "player-emails.csv");

if (!backendUrl) {
  console.error(
    "Set RENDER_BACKEND_URL first, for example: RENDER_BACKEND_URL=https://predictionaddiction-backend.onrender.com npm run export:emails"
  );
  process.exit(1);
}

async function main() {
  const res = await fetch(`${backendUrl}/api/admin/users/emails.csv`, {
    headers: { "x-admin-key": adminKey },
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Email export failed: ${res.status} ${body}`);
  }

  const csv = await res.text();
  fs.writeFileSync(outputPath, csv);
  const emailCount = Math.max(0, csv.trim().split(/\r?\n/).length - 1);
  console.log(`Saved ${emailCount} emails to ${outputPath}`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
