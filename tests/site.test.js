import { test } from "node:test";
import assert from "node:assert/strict";
import { SITE } from "../src/data/site.js";

test("SITE holds the core business facts", () => {
  assert.equal(SITE.name, "Gilbert Curb Valet");
  assert.equal(SITE.priceFirstMonth, 29);
  assert.equal(SITE.priceMonthly, 39);
  assert.equal(SITE.maxCarts, 2);
  assert.ok(SITE.url.startsWith("https://"));
});
