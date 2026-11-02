// Full-viewport screenshots at forced scene progress. Usage: node scripts/shoot-beats.mjs [w] [h] [scrollFraction]
import puppeteer from "puppeteer-core";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4397, BASE = `http://localhost:${PORT}`;
const [w = 1400, h = 900] = process.argv.slice(2).map(Number);
const dev = spawn("npx", ["astro", "dev", "--port", String(PORT)], { stdio: "ignore" });
try {
  for (let i = 0; i < 60; i++) { try { await fetch(BASE); break; } catch { await sleep(500); } }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage();
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 768 });
  for (const b of [0, 0.4, 0.7, 0.92]) {
    await page.goto(`${BASE}/?beat=${b}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.__sceneReady === true, { timeout: 20000 });
    await page.evaluate((b) => {
      document.querySelector("astro-dev-toolbar")?.remove();
      // Scroll to the step that matches this beat so text and scene line up like a real visit.
      const steps = document.querySelectorAll("[data-beat]");
      const target = b === 0 ? null : b < 0.5 ? steps[0] : b < 0.75 ? steps[1] : steps[2];
      if (target) target.scrollIntoView({ block: "center" });
    }, b);
    await sleep(500);
    await page.screenshot({ path: `checks/beat-${b}-${w}.png` });
  }
  await browser.close();
  console.log("ok");
} finally { dev.kill(); }
