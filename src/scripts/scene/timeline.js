// Scroll progress (0..1) → what the scene looks like. Pure, so it is tested in Node.
export const BEATS = [
  { from: 0, to: 0.3 }, // roll out to the curb (evening)
  { from: 0.3, to: 0.5 }, // night
  { from: 0.5, to: 0.75 }, // truck passes, lids pop
  { from: 0.75, to: 1 }, // roll back (morning)
];

const clamp01 = (x) => Math.min(1, Math.max(0, x));
const smooth = (t) => { t = clamp01(t); return t * t * (3 - 2 * t); };
const seg = (p, a, b) => (p - a) / (b - a);

// Piecewise-linear lookup over [p, value] points.
function lerpPoints(points, p) {
  for (let i = 1; i < points.length; i++) {
    const [p0, v0] = points[i - 1];
    const [p1, v1] = points[i];
    if (p <= p1) return v0 + (v1 - v0) * clamp01(seg(p, p0, p1));
  }
  return points[points.length - 1][1];
}

const DAY = [[0, 0], [0.3, 0.4], [0.4, 0.5], [0.5, 0.6], [0.75, 0.85], [1, 1]];
const WHEEL_TURNS = 9; // radians of wheel spin for one full driveway trip

export function beatIndex(p) {
  p = clamp01(p);
  return BEATS.findIndex((b, i) => p < b.to || i === BEATS.length - 1);
}

export function sceneStateAt(rawP) {
  const p = clamp01(Number(rawP) || 0);
  let cartZ;
  if (p <= 0.3) cartZ = smooth(seg(p, 0, 0.3));
  else if (p <= 0.75) cartZ = 1;
  else cartZ = 1 - smooth(seg(p, 0.75, 1));

  let truckX = -1.2;
  let lidOpen = 0;
  if (p >= 0.75) truckX = 1.2;
  else if (p > 0.5) {
    const t = seg(p, 0.5, 0.75);
    truckX = Math.min(1.2, -1.2 + 2.4 * (t / 0.6)); // truck passes first
    if (t > 0.55 && t < 0.95) lidOpen = Math.sin((Math.PI * (t - 0.55)) / 0.4); // then the lids pop
  }

  return { cartZ, wheelTurn: cartZ * WHEEL_TURNS, lidOpen, dayPhase: lerpPoints(DAY, p), truckX };
}
