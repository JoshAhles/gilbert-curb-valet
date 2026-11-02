import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, statSync } from "node:fs";
const require_fs = { statSync };
import { join } from "node:path";
import { parseHTML } from "linkedom";

const dist = new URL("../dist/", import.meta.url).pathname;
const html = existsSync(join(dist, "index.html")) ? readFileSync(join(dist, "index.html"), "utf8") : "";
const { document } = parseHTML(html);

test("dist exists (run npm run build first)", () => assert.ok(html.length > 0));

test("page copy and structure", () => {
  assert.equal(document.querySelectorAll("h1").length, 1);
  assert.equal(document.querySelector(".lede").textContent.trim(), "Gilbert Curb Valet is Gilbert's trash can valet. We roll your trash and recycling carts to the curb the night before pickup, then bring them back that evening. $29 for the first month, then $39 a month.");
  assert.ok(html.includes("Gilbert Curb Valet is a service of CodeBucky LLC. Not affiliated with the Town of Gilbert."));
  assert.ok(html.includes("not the Town of Gilbert or your HOA"));
  assert.ok(!/neely/i.test(html));
  assert.equal(document.querySelectorAll("#faq details").length, 10);
});

test("forms carry honeypot and noscript", () => {
  const forms = document.querySelectorAll("form[data-signup]");
  assert.ok(forms.length >= 2);
  for (const f of forms) assert.ok(f.querySelector("input[name=_gotcha]"), `form ${f.dataset.source} lacks _gotcha`);
  assert.ok(html.includes("<noscript"));
});

test("no analytics tag when PUBLIC_GA_ID is unset", () => {
  if (process.env.PUBLIC_GA_ID) return;
  assert.ok(!html.includes("googletagmanager"));
});

test("first-load JS stays small; three and gsap only load later", async () => {
  const { gzipSync } = await import("node:zlib");
  assert.ok(!/three\.|gsap\./.test(html.match(/<head>[\s\S]*<\/head>/)?.[0] ?? ""), "three/gsap must not be preloaded");
  let total = 0;
  for (const m of html.matchAll(/<script[^>]*src="([^"]+)"/g)) total += gzipSync(readFileSync(join(dist, m[1]))).length;
  for (const m of html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)) if (!m[0].includes("ld+json")) total += gzipSync(m[1]).length;
  assert.ok(total <= 15 * 1024, `first-load JS is ${total} bytes gzipped`);
});

test("legal pages, sitemap, posters", () => {
  for (const p of ["privacy/index.html", "terms/index.html", "sitemap-index.xml", "robots.txt", "og-image.png", "favicon.svg"]) assert.ok(existsSync(join(dist, p)), p);
  const sm = readFileSync(join(dist, "sitemap-0.xml"), "utf8");
  assert.ok(!sm.includes("/og"));
  for (const f of ["desktop.avif", "desktop.webp", "mobile.avif", "mobile.webp"]) {
    const { statSync } = require_fs;
    assert.ok(statSync(join(dist, "images", `hero-poster-${f}`)).size <= 120 * 1024, f);
  }
});
