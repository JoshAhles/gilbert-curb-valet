// Builds, serves the built site, and checks layout, sticky bar, dark mode contrast,
// reduced motion and Lighthouse budgets. Writes screenshots + checks/report.json.
import puppeteer from "puppeteer-core";
import { AxePuppeteer } from "@axe-core/puppeteer";
import { spawn, execSync } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { mkdirSync, writeFileSync, readFileSync } from "node:fs";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const PORT = 4398, BASE = `http://localhost:${PORT}/`;
const report = [];
const rec = (c, pass, detail = "") => { report.push({ case: c, pass, detail }); console.log(`${pass ? "PASS" : "FAIL"}  ${c}${detail ? "  — " + detail : ""}`); };

mkdirSync("checks", { recursive: true });
execSync("npx astro build", { stdio: "ignore" });
const srv = spawn("npx", ["astro", "preview", "--port", String(PORT)], { stdio: "ignore" });
try {
  for (let i = 0; i < 60; i++) { try { await fetch(BASE); break; } catch { await sleep(500); } }
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ["--use-gl=angle", "--enable-webgl", "--ignore-gpu-blocklist", "--use-mock-keychain", "--password-store=basic"] });
  const page = await browser.newPage();

  // 1. Phone first view
  await page.setViewport({ width: 375, height: 667, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  const fold = await page.evaluate(() => {
    const b = (sel) => document.querySelector(sel).getBoundingClientRect().bottom;
    return { sw: document.documentElement.scrollWidth, h1: b("h1"), lede: b(".lede"), email: b('form[data-source="hero"] input[type=email]') };
  });
  rec("375x667 no sideways scroll", fold.sw <= 375, `scrollWidth ${fold.sw}`);
  rec("375x667 H1, lede, email above fold", Math.max(fold.h1, fold.lede, fold.email) <= 667, JSON.stringify(fold));
  await page.screenshot({ path: "checks/phone-light.png" });
  await page.screenshot({ path: "checks/phone-light-full.png", fullPage: true });

  // 3. Sticky bar
  const barAt = async (y) => { await page.evaluate((y) => scrollTo(0, y), y); await sleep(400); return page.evaluate(() => !document.querySelector("[data-sticky-bar]").hidden); };
  const midY = await page.evaluate(() => document.querySelector("#faq").offsetTop);
  const finalY = await page.evaluate(() => document.querySelector('form[data-source="final"]').getBoundingClientRect().top + scrollY - 200);
  const shown = await barAt(midY);
  await page.screenshot({ path: "checks/phone-sticky.png" });
  const hiddenAtFinal = !(await barAt(finalY));
  const hiddenAtTop = !(await barAt(0));
  rec("sticky bar shows mid-page, hides at hero and final form", shown && hiddenAtFinal && hiddenAtTop, JSON.stringify({ shown, hiddenAtFinal, hiddenAtTop }));

  // 2. Short phone, scene never blank while scrolling
  await page.setViewport({ width: 375, height: 560, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  await page.goto(BASE, { waitUntil: "networkidle0" });
  await page.waitForFunction(() => window.__sceneReady === true || document.body.classList.contains("no-scene"), { timeout: 20000 });
  const sw2 = await page.evaluate(() => document.documentElement.scrollWidth);
  rec("375x560 no sideways scroll", sw2 <= 375, `scrollWidth ${sw2}`);
  const total = await page.evaluate(() => document.querySelector("#how").getBoundingClientRect().bottom + scrollY);
  for (let i = 0; i <= 10; i += 3) {
    await page.evaluate((y) => scrollTo(0, y), (total * i) / 10);
    await sleep(250);
    await page.screenshot({ path: `checks/phone-scroll-${i}.png` });
  }
  const phone = await page.evaluate(() => ({
    sceneHidden: getComputedStyle(document.querySelector("[data-hero-scene]").parentElement).display === "none",
    noCanvas: !document.querySelector("[data-hero-scene] canvas"),
    logoPx: document.querySelector(".hero .logo img").getBoundingClientRect().width,
  }));
  rec("375x560 phone shows the big logo, no 3D scene", phone.sceneHidden && phone.noCanvas && phone.logoPx >= 100, JSON.stringify(phone));

  // 4. Dark mode + contrast
  for (const [w, h] of [[375, 667], [1400, 900]]) {
    await page.setViewport({ width: w, height: h, deviceScaleFactor: 1, isMobile: w < 768 });
    await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "dark" }]);
    await page.goto(BASE, { waitUntil: "networkidle0" });
    await page.screenshot({ path: `checks/dark-${w}.png` });
    const res = await new AxePuppeteer(page).withRules(["color-contrast"]).analyze();
    rec(`dark ${w} contrast`, res.violations.length === 0, res.violations.flatMap((v) => v.nodes.map((n) => n.target.join(" "))).slice(0, 5).join(", "));
  }
  await page.emulateMediaFeatures([{ name: "prefers-color-scheme", value: "light" }]);
  {
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
    await page.goto(BASE, { waitUntil: "networkidle0" });
    await page.screenshot({ path: "checks/desktop-light.png" });
    await page.screenshot({ path: "checks/desktop-light-full.png", fullPage: true });
    const res = await new AxePuppeteer(page).analyze();
    const serious = res.violations.filter((v) => ["serious", "critical"].includes(v.impact));
    rec("light 1400 axe (serious/critical)", serious.length === 0, serious.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).slice(0, 3).join(", ")}`).join(" | "));
  }

  // 5. Reduced motion: no three.js
  {
    const p2 = await browser.newPage();
    await p2.emulateMediaFeatures([{ name: "prefers-reduced-motion", value: "reduce" }]);
    const urls = [];
    p2.on("request", (r) => urls.push(r.url()));
    await p2.setViewport({ width: 1400, height: 900 });
    await p2.goto(BASE, { waitUntil: "networkidle0" });
    await sleep(2500);
    const posterVisible = await p2.evaluate(() => { const i = document.querySelector("[data-poster]"); return i.complete && i.naturalWidth > 0 && getComputedStyle(i).opacity === "1"; });
    rec("reduced motion: no three.js, poster visible", !urls.some((u) => /three|gsap|mount/.test(u)) && posterVisible, `poster ${posterVisible}`);
    await p2.close();
  }

  // 6. Desktop scroll beats (real scroll, not forced)
  {
    await page.setViewport({ width: 1400, height: 900, deviceScaleFactor: 1 });
    await page.goto(BASE, { waitUntil: "networkidle0" });
    await page.waitForFunction(() => window.__sceneReady === true, { timeout: 20000 });
    const len = await page.evaluate(() => { const s = document.querySelector("[data-stage]"); return s.offsetHeight - innerHeight; });
    for (const b of [0.1, 0.4, 0.7, 0.92]) {
      await page.evaluate((y) => scrollTo(0, y), len * b);
      await sleep(500);
      await page.screenshot({ path: `checks/desktop-scroll-${b}.png` });
    }
    rec("desktop scroll shots taken", true);
  }
  await browser.close();

  // 7. Lighthouse (mobile preset)
  try {
    execSync(`npx -y lighthouse@12 ${BASE} --quiet --chrome-path="${CHROME}" --chrome-flags="--headless=new" --only-categories=performance,accessibility,seo,best-practices --output=json --output-path=checks/lighthouse.json`, { stdio: "ignore", timeout: 240000 });
    const lh = JSON.parse(readFileSync("checks/lighthouse.json", "utf8"));
    const s = Object.fromEntries(Object.entries(lh.categories).map(([k, v]) => [k, Math.round(v.score * 100)]));
    const ok = s.performance >= 90 && s.accessibility >= 95 && s.seo === 100 && s["best-practices"] >= 95;
    rec("lighthouse mobile budgets", ok, JSON.stringify(s) + ` LCP ${lh.audits["largest-contentful-paint"].displayValue}`);
  } catch (e) {
    rec("lighthouse mobile budgets", false, "lighthouse failed to run: " + String(e.message).slice(0, 120));
  }
} finally {
  srv.kill();
  writeFileSync("checks/report.json", JSON.stringify(report, null, 2));
  const fails = report.filter((r) => !r.pass).length;
  console.log(`\n${report.length - fails}/${report.length} checks passed`);
  process.exitCode = fails ? 1 : 0;
}
