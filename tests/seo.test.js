import { test } from "node:test";
import assert from "node:assert/strict";
import { TITLE, DESCRIPTION, buildJsonLd } from "../src/lib/seo.js";
import { SITE } from "../src/data/site.js";

test("title and description", () => {
  assert.equal(TITLE, "Trash Can Valet in Gilbert, AZ | Gilbert Curb Valet");
  assert.ok(DESCRIPTION.length <= 160, `description is ${DESCRIPTION.length} chars`);
});

test("LocalBusiness JSON-LD has no address or phone, serves Gilbert, offers $39", () => {
  const j = buildJsonLd(SITE);
  assert.equal(j["@type"], "LocalBusiness");
  assert.equal(j.name, "Gilbert Curb Valet");
  assert.ok(!("address" in j));
  assert.ok(!("telephone" in j));
  assert.equal(j.areaServed.name, "Gilbert, AZ");
  assert.equal(j.makesOffer.price, "39");
  assert.match(j.makesOffer.description, /\$29/);
  assert.ok(!/neely/i.test(JSON.stringify(j)));
});
