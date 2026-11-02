// Runs only when LAUNCH=1 (the deploy workflow sets it). Blocks a deploy with blank launch facts.
import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE } from "../src/data/site.js";

test("launch facts are filled in", { skip: process.env.LAUNCH !== "1" }, () => {
  assert.match(SITE.formspreeEndpoint, /^https:\/\/formspree\.io\/f\/\w+$/, "set formspreeEndpoint in src/data/site.js");
  assert.match(SITE.contactEmail, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, "set contactEmail in src/data/site.js");
});
