import { test } from "node:test";
import assert from "node:assert/strict";
import { barVisible } from "../src/scripts/sticky-bar-logic.js";

test("bar only on phones with both forms out of view", () => {
  for (const heroFormInView of [true, false])
    for (const finalFormInView of [true, false])
      for (const isPhone of [true, false]) {
        for (const joined of [true, false]) for (const typing of [true, false]) {
          const want = isPhone && !joined && (typing || (!heroFormInView && !finalFormInView));
          assert.equal(barVisible({ heroFormInView, finalFormInView, isPhone, joined, typing }), want);
        }
      }
});
