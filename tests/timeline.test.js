import { test } from "node:test";
import assert from "node:assert/strict";
import { sceneStateAt, BEATS } from "../src/scripts/scene/timeline.js";
import { shouldRunScene } from "../src/scripts/scene/should-run.js";

const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test("beats", () => {
  assert.deepEqual(BEATS, [{ from: 0, to: 0.3 }, { from: 0.3, to: 0.5 }, { from: 0.5, to: 0.75 }, { from: 0.75, to: 1 }]);
});

test("carts: garage → curb → garage", () => {
  assert.ok(near(sceneStateAt(0).cartZ, 0));
  assert.ok(near(sceneStateAt(0.3).cartZ, 1));
  assert.ok(near(sceneStateAt(0.6).cartZ, 1));
  assert.ok(near(sceneStateAt(1).cartZ, 0));
});

test("clamps", () => {
  assert.deepEqual(sceneStateAt(-5), sceneStateAt(0));
  assert.deepEqual(sceneStateAt(9), sceneStateAt(1));
});

test("night in the middle", () => {
  assert.ok(near(sceneStateAt(0.4).dayPhase, 0.5));
});

test("lid pops during truck beat only", () => {
  let peak = 0;
  for (let p = 0.5; p <= 0.75; p += 0.005) peak = Math.max(peak, sceneStateAt(p).lidOpen);
  assert.ok(peak > 0.8);
  assert.equal(sceneStateAt(0.2).lidOpen, 0);
  assert.equal(sceneStateAt(0.9).lidOpen, 0);
});

test("truck off-screen outside its beat", () => {
  assert.ok(sceneStateAt(0.45).truckX <= -1);
  assert.ok(sceneStateAt(0.8).truckX >= 1);
});

test("wheels turn only while carts move", () => {
  assert.ok(sceneStateAt(0.2).wheelTurn > sceneStateAt(0.1).wheelTurn);
  assert.ok(near(sceneStateAt(0.3).wheelTurn, sceneStateAt(0.75).wheelTurn));
  assert.ok(sceneStateAt(0.9).wheelTurn < sceneStateAt(0.75).wheelTurn);
});

test("shouldRunScene", () => {
  const ok = { reducedMotion: false, webgl: true, saveData: false, cores: 8, phone: false };
  assert.equal(shouldRunScene(ok), true);
  assert.equal(shouldRunScene({ ...ok, reducedMotion: true }), false);
  assert.equal(shouldRunScene({ ...ok, webgl: false }), false);
  assert.equal(shouldRunScene({ ...ok, saveData: true }), false);
  assert.equal(shouldRunScene({ ...ok, cores: 2 }), false);
  // Phones show the logo instead of the 3D scene.
  assert.equal(shouldRunScene({ ...ok, phone: true }), false);
});
