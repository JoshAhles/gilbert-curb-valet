// Viewport screenshots at real scroll positions on the built site. Usage: node scripts/shoot-scroll.mjs W H
import puppeteer from "puppeteer-core";
import { spawn, execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4396, BASE = `http://localhost:${PORT}/`;
const [w, h] = process.argv.slice(2).map(Number);
execSync("npx astro build", { stdio: "ignore" });
const srv = spawn("npx", ["astro", "preview", "--port", String(PORT)], { stdio: "ignore" });
try {
  for (let i = 0; i < 60; i++) { try { await fetch(BASE); break; } catch { await sleep(500); } }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage();
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 768, hasTouch: w < 768 });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.__sceneReady === true, { timeout: 20000 });
  const total = await page.evaluate(() => document.documentElement.scrollHeight - innerHeight);
  const n = 16;
  for (let i = 0; i <= n; i++) {
    // Step in small increments so the scrubbed scene catches up like real scrolling.
    await page.evaluate((y) => scrollTo(0, y), (total * i) / n);
    await sleep(700);
    await page.screenshot({ path: `checks/scroll-${w}-${String(i).padStart(2, "0")}.png` });
  }
  await browser.close();
} finally { srv.kill(); }
