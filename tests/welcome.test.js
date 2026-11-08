import { test } from "node:test";
import assert from "node:assert/strict";
import { welcomeFor } from "../src/scripts/welcome.js";

test("postcard QR link gets the greeting", () => {
  assert.equal(welcomeFor("?utm_source=postcard"), "Got our postcard? Welcome, neighbor.");
});

test("no greeting for other visitors", () => {
  assert.equal(welcomeFor(""), null);
  assert.equal(welcomeFor("?utm_source=google"), null);
});
