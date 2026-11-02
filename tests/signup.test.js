import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MIN_FILL_MS, validateEmail, buildPayload, buildStreetPayload, looksLikeBot, shouldSendStreet, submit,
} from "../src/lib/signup.js";

test("validateEmail trims and checks shape", () => {
  assert.equal(validateEmail("  Jo@Ex.com \n"), true);
  assert.equal(validateEmail("jo@ex"), false);
  assert.equal(validateEmail(""), false);
});

test("buildPayload trims and lowercases email", () => {
  const p = buildPayload({ email: " Jo@Ex.com ", source: "hero", gotcha: "" });
  assert.deepEqual(p, { email: "jo@ex.com", source: "hero", _subject: "Gilbert Curb Valet sign-up", _gotcha: "" });
});

test("looksLikeBot: honeypot or too fast", () => {
  assert.equal(MIN_FILL_MS, 1500);
  assert.equal(looksLikeBot({ gotcha: "x", elapsedMs: 9999 }), true);
  assert.equal(looksLikeBot({ gotcha: "", elapsedMs: 1000 }), true);
  assert.equal(looksLikeBot({ gotcha: "", elapsedMs: 2000 }), false);
  assert.equal(looksLikeBot({ gotcha: "", elapsedMs: 3000 }), false);
});

test("shouldSendStreet", () => {
  assert.equal(shouldSendStreet({ droppedAsBot: true, street: "Main" }), false);
  assert.equal(shouldSendStreet({ droppedAsBot: false, street: "   " }), false);
  assert.equal(shouldSendStreet({ droppedAsBot: false, street: "W Main St" }), true);
});

test("buildStreetPayload trims and caps at 120", () => {
  const p = buildStreetPayload({ email: " A@B.co ", street: "  " + "x".repeat(200) });
  assert.equal(p.street.length, 120);
  assert.equal(p.email, "a@b.co");
  assert.equal(p._subject, "Gilbert Curb Valet street");
});

test("submit with empty endpoint never fetches", async () => {
  let called = 0;
  const r = await submit("", {}, async () => { called++; });
  assert.equal(called, 0);
  assert.equal(r.ok, false);
  assert.ok(!/email us/i.test(r.error), "must not tell people to email when there may be no address");
});

test("submit returns Formspree error message", async () => {
  const r = await submit("https://f", {}, async () => ({ ok: false, json: async () => ({ errors: [{ message: "bad email" }] }) }));
  assert.deepEqual(r, { ok: false, error: "bad email" });
});

test("submit ok and network error", async () => {
  assert.deepEqual(await submit("https://f", {}, async () => ({ ok: true })), { ok: true });
  const r = await submit("https://f", {}, async () => { throw new Error("x"); });
  assert.equal(r.ok, false);
  assert.match(r.error, /Network error/);
});

test("submit times out a hung request", async () => {
  const hung = (_u, opts) => new Promise((_, rej) => opts.signal.addEventListener("abort", () => rej(new Error("aborted"))));
  const keepAlive = setTimeout(() => {}, 1000); // AbortSignal.timeout timers are unref'd in Node
  const r = await submit("https://f", {}, hung, 30);
  clearTimeout(keepAlive);
  assert.equal(r.ok, false);
  assert.match(r.error, /Network error/);
});
