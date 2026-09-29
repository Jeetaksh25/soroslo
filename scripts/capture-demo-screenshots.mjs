import { readFileSync, mkdirSync } from "node:fs";
import { chromium } from "@playwright/test";

const manifest = JSON.parse(
  readFileSync("acceptance/demo-manifest.json", "utf8")
);
const baseURL = process.env.SOROSLO_DEMO_URL ?? "http://127.0.0.1:3300";

mkdirSync("docs/assets", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1440, height: 1050 },
  deviceScaleFactor: 1
});

async function capture(path, output) {
  await page.goto(`${baseURL}${path}`, { waitUntil: "networkidle" });
  await page.screenshot({
    path: `docs/assets/${output}`,
    fullPage: true
  });
}

await capture("/", "soroslo-overview-testnet.png");
await capture(
  `/checks/${encodeURIComponent(manifest.healthyCheckId)}`,
  "soroslo-check-testnet.png"
);

if (manifest.runId) {
  await capture(
    `/runs/${encodeURIComponent(manifest.runId)}`,
    "soroslo-run-testnet.png"
  );
}

if (manifest.incidentId) {
  await capture(
    `/incidents/${encodeURIComponent(manifest.incidentId)}`,
    "soroslo-incident-testnet.png"
  );
}

await browser.close();
