// Renders the hero poster stills (from the real 3D scene) and the share image.
import puppeteer from "puppeteer-core";
import sharp from "sharp";
import { spawn } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { statSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4399, BASE = `http://localhost:${PORT}`;
const POSTER_BEAT = 0.7; // carts at the curb, morning, lids open
const LIMIT = 120 * 1024;

const dev = spawn("npx", ["astro", "dev", "--port", String(PORT)], { stdio: "ignore" });
try {
  for (let i = 0; i < 60; i++) { try { await fetch(BASE); break; } catch { await sleep(500); } }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist"] });
  const page = await browser.newPage();

  async function poster(name, width, height, dpr) {
    await page.setViewport({ width, height, deviceScaleFactor: dpr });
    await page.goto(`${BASE}/?beat=${POSTER_BEAT}`, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.__sceneReady === true, { timeout: 20000 });
    await sleep(400);
    await page.evaluate(() => {
      document.querySelector("astro-dev-toolbar")?.remove();
      // Bake only the scene, not the frame: the page draws its own border around the poster.
      Object.assign(document.querySelector("[data-hero-scene]").style, { border: "0", borderRadius: "0", boxShadow: "none" });
    });
    await sleep(200);
    // Screenshot the container, not the canvas: the canvas is transparent over the sky gradient.
    const full = await (await page.$("[data-hero-scene]")).screenshot();
    for (const ext of ["avif", "webp"]) {
      const out = `public/images/hero-poster-${name}.${ext}`;
      let q = ext === "avif" ? 50 : 72;
      for (;;) {
        await (ext === "avif" ? sharp(full).avif({ quality: q }) : sharp(full).webp({ quality: q })).toFile(out);
        if (statSync(out).size <= LIMIT || q <= 30) break;
        q -= 8;
      }
      console.log(out, Math.round(statSync(out).size / 1024) + " KB");
    }
  }

  await poster("desktop", 1400, 1000, 1);
  await poster("mobile", 390, 844, 2);

  await page.setViewport({ width: 1200, height: 630, deviceScaleFactor: 1 });
  await page.goto(`${BASE}/og`, { waitUntil: "networkidle0" });
  await page.evaluate(() => document.fonts.ready);
  await page.evaluate(() => document.querySelector("astro-dev-toolbar")?.remove());
  await page.screenshot({ path: "public/og-image.png", clip: { x: 0, y: 0, width: 1200, height: 630 } });
  console.log("public/og-image.png", Math.round(statSync("public/og-image.png").size / 1024) + " KB");
  await browser.close();
} finally {
  dev.kill();
}
