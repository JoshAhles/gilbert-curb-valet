import * as THREE from "three";

// Chunky toon look: flat 3-step shading plus an ink outline (inverted hull).
export const INK = 0x3b2416;

let gradient;
function gradientMap() {
  if (gradient) return gradient;
  const data = new Uint8Array([90, 170, 255]);
  gradient = new THREE.DataTexture(data, 3, 1, THREE.RedFormat);
  gradient.minFilter = gradient.magFilter = THREE.NearestFilter;
  gradient.needsUpdate = true;
  return gradient;
}

const toonCache = new Map();
export function toon(color) {
  if (!toonCache.has(color)) toonCache.set(color, new THREE.MeshToonMaterial({ color, gradientMap: gradientMap() }));
  return toonCache.get(color);
}
const inkMat = new THREE.MeshBasicMaterial({ color: INK, side: THREE.BackSide });

// A mesh with an ink outline shell. `thick` is the outline width in world units.
export function inked(geometry, color, thick = 0.035, { outline = true } = {}) {
  const g = new THREE.Group();
  const m = new THREE.Mesh(geometry, toon(color));
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  if (outline) {
    geometry.computeBoundingBox();
    const s = new THREE.Vector3();
    geometry.boundingBox.getSize(s);
    const shell = new THREE.Mesh(geometry, inkMat);
    shell.scale.set(1 + (2 * thick) / Math.max(s.x, 1e-3), 1 + (2 * thick) / Math.max(s.y, 1e-3), 1 + (2 * thick) / Math.max(s.z, 1e-3));
    g.add(shell);
  }
  return g;
}

function taperedBox(w, h, d, bottomScale) {
  const geo = new THREE.BoxGeometry(w, h, d, 1, 1, 1);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    if (pos.getY(i) < 0) { pos.setX(i, pos.getX(i) * bottomScale); pos.setZ(i, pos.getZ(i) * bottomScale); }
  }
  geo.computeVertexNormals();
  return geo;
}

// A Town-style roll cart. Front faces +z. Wheels and hinge at the back (-z).
export function makeCart({ body, lid }) {
  const cart = new THREE.Group();
  const W = 0.66, H = 1.0, D = 0.74;

  const shell = inked(taperedBox(W, H, D, 0.86), body, 0.03);
  shell.position.y = H / 2 + 0.08;
  cart.add(shell);

  // Lid pivots on the back top edge.
  const lidPivot = new THREE.Group();
  lidPivot.name = "lid";
  lidPivot.position.set(0, H + 0.08, -D / 2 - 0.02);
  const lidMesh = inked(new THREE.BoxGeometry(W + 0.08, 0.07, D + 0.08), lid, 0.025);
  lidMesh.position.set(0, 0.035, D / 2 + 0.02);
  lidPivot.add(lidMesh);
  cart.add(lidPivot);

  // Handle bar across the back.
  const handle = inked(new THREE.CylinderGeometry(0.035, 0.035, W + 0.06, 10), lid, 0.02);
  handle.rotation.z = Math.PI / 2;
  handle.position.set(0, H + 0.02, -D / 2 - 0.09);
  cart.add(handle);

  for (const [name, x] of [["wheelL", -W / 2 + 0.02], ["wheelR", W / 2 - 0.02]]) {
    const wheel = new THREE.Group();
    wheel.name = name;
    const tire = inked(new THREE.CylinderGeometry(0.13, 0.13, 0.09, 18), 0x2b2b2b, 0.02);
    tire.rotation.z = Math.PI / 2;
    wheel.add(tire);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.1, 10), toon(0x9a9a9a));
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);
    wheel.position.set(x * 1.12, 0.13, -D / 2 + 0.04);
    cart.add(wheel);
  }
  return cart;
}

function paloVerde() {
  const tree = new THREE.Group();
  const trunkColor = 0x8fae4f; // palo verde means "green stick"
  const trunk = inked(new THREE.CylinderGeometry(0.09, 0.14, 1.2, 8), trunkColor, 0.025);
  trunk.position.y = 0.6;
  trunk.rotation.z = 0.12;
  tree.add(trunk);
  for (const [x, z, r, a] of [[-0.45, 0.1, 0.06, 0.7], [0.4, -0.1, 0.06, -0.6]]) {
    const b = inked(new THREE.CylinderGeometry(r * 0.7, r, 0.9, 6), trunkColor, 0.02);
    b.position.set(x * 0.6, 1.35, z);
    b.rotation.z = a;
    tree.add(b);
  }
  const leaf = 0xc7d36b;
  for (const [x, y, z, r] of [[0, 1.95, 0, 0.62], [-0.65, 1.75, 0.15, 0.46], [0.62, 1.8, -0.1, 0.5], [0.15, 2.25, -0.2, 0.42]]) {
    const c = inked(new THREE.IcosahedronGeometry(r, 1), leaf, 0.03);
    c.position.set(x, y, z);
    c.scale.y = 0.72;
    tree.add(c);
  }
  return tree;
}

function barrelCactus() {
  const c = inked(new THREE.SphereGeometry(0.22, 12, 8), 0x6f9a4a, 0.025);
  c.scale.y = 1.15;
  c.position.y = 0.22;
  const g = new THREE.Group();
  g.add(c);
  const flower = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 6), toon(0xf2a03d));
  flower.position.y = 0.48;
  g.add(flower);
  return g;
}

// The yard: house wall with garage, driveway, gravel, curb, street. Driveway runs along z, street along x.
export function makeYard({ lite = false } = {}) {
  const yard = new THREE.Group();

  const ground = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), toon(0xe9cfa3));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  yard.add(ground);

  const street = new THREE.Mesh(new THREE.PlaneGeometry(40, 4.2), toon(0x6d6470));
  street.rotation.x = -Math.PI / 2;
  street.position.set(0, 0.005, 5.6);
  street.receiveShadow = true;
  yard.add(street);
  for (let x = -14; x < 14; x += 2.4) {
    const dash = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.1), toon(0xf3e3b8));
    dash.rotation.x = -Math.PI / 2;
    dash.position.set(x, 0.01, 5.8);
    yard.add(dash);
  }

  const curb = inked(new THREE.BoxGeometry(40, 0.14, 0.32), 0xd9cfc1, 0.02);
  curb.position.set(0, 0.07, 3.4);
  yard.add(curb);
  const sidewalk = new THREE.Mesh(new THREE.BoxGeometry(40, 0.06, 1.2), toon(0xe4dccd));
  sidewalk.position.set(0, 0.03, 2.65);
  sidewalk.receiveShadow = true;
  yard.add(sidewalk);

  const drive = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.05, 7), toon(0xddd2c0));
  drive.position.set(0.6, 0.025, -0.9);
  drive.receiveShadow = true;
  yard.add(drive);

  // House: stucco wall, flat roof edge, garage door.
  const house = new THREE.Group();
  const wall = inked(new THREE.BoxGeometry(9, 3.1, 1), 0xf1d2ad, 0.04);
  wall.position.set(0.2, 1.55, -5);
  house.add(wall);
  const parapet = inked(new THREE.BoxGeometry(9.3, 0.3, 1.2), 0xd9a77c, 0.03);
  parapet.position.set(0.2, 3.2, -5);
  house.add(parapet);
  const door = inked(new THREE.BoxGeometry(2.8, 2.1, 0.08), 0xfaf0e2, 0.03);
  door.position.set(0.6, 1.05, -4.48);
  house.add(door);
  for (let i = 1; i < 4; i++) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.03, 0.02), new THREE.MeshBasicMaterial({ color: 0xc9b9a2 }));
    line.position.set(0.6, i * 0.52, -4.43);
    house.add(line);
  }
  const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.3, 0.12), new THREE.MeshBasicMaterial({ color: 0xffd98a }));
  lamp.name = "lamp";
  lamp.position.set(-1.1, 2.0, -4.44);
  house.add(lamp);
  yard.add(house);

  // Low block wall on the left with a cap.
  const block = inked(new THREE.BoxGeometry(0.35, 1.0, 6.2), 0xe6c49c, 0.03);
  block.position.set(-4.3, 0.5, -1.6);
  yard.add(block);

  const tree = paloVerde();
  tree.position.set(-2.4, 0, -1.2);
  yard.add(tree);

  const cactus = barrelCactus();
  cactus.position.set(-1.4, 0, 0.9);
  yard.add(cactus);
  const cactus2 = barrelCactus();
  cactus2.scale.setScalar(0.75);
  cactus2.position.set(3.1, 0, -2.6);
  yard.add(cactus2);

  // Gravel: small flat stones scattered in the yard (fewer on phones).
  const stones = lite ? 60 : 140;
  const stoneGeo = new THREE.IcosahedronGeometry(0.05, 0);
  const stoneMesh = new THREE.InstancedMesh(stoneGeo, toon(0xc9a87a), stones);
  const m = new THREE.Matrix4();
  let seed = 7;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < stones; i++) {
    let x, z;
    do { x = -4 + rnd() * 9; z = -4.3 + rnd() * 6.5; } while (x > -1.1 && x < 2.3);
    m.makeScale(1 + rnd(), 0.4, 1 + rnd());
    m.setPosition(x, 0.01, z);
    stoneMesh.setMatrixAt(i, m);
  }
  yard.add(stoneMesh);

  return yard;
}

// A simple, unbranded side-loader truck shape.
export function makeTruck() {
  const t = new THREE.Group();
  const body = inked(new THREE.BoxGeometry(3.2, 1.7, 1.6), 0xf4efe6, 0.04);
  body.position.set(-0.4, 1.25, 0);
  t.add(body);
  const cab = inked(new THREE.BoxGeometry(1.2, 1.4, 1.6), 0x3c8f6b, 0.04);
  cab.position.set(1.8, 1.1, 0);
  t.add(cab);
  const glass = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.5, 1.3), new THREE.MeshBasicMaterial({ color: 0x9fd0e6 }));
  glass.position.set(2.42, 1.45, 0);
  t.add(glass);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(3.22, 0.18, 1.62), toon(0x3c8f6b));
  stripe.position.set(-0.4, 0.75, 0);
  t.add(stripe);
  for (const x of [-1.4, 0.3, 1.8]) for (const z of [-0.75, 0.75]) {
    const w = inked(new THREE.CylinderGeometry(0.34, 0.34, 0.25, 16), 0x2b2b2b, 0.03);
    w.rotation.x = Math.PI / 2;
    w.position.set(x, 0.34, z);
    t.add(w);
  }
  return t;
}

// Gilbert's landmark: an old elevated water tower. Four splayed legs, cross braces, a round tank with a cone roof.
export function makeWaterTower() {
  const t = new THREE.Group();
  const leg = 0x9aa6ad, tank = 0xe8eef0;
  const H = 5.2;
  for (const [x, z] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
    const l = inked(new THREE.CylinderGeometry(0.07, 0.09, H + 0.1, 6), leg, 0.02);
    l.position.set(x * 0.95, H / 2, z * 0.95);
    l.rotation.z = -x * 0.08;
    l.rotation.x = z * 0.08;
    t.add(l);
  }
  for (const y of [1.6, 3.3]) {
    const s = 1 - y / (H * 6);
    for (const [ax, rx] of [[0, 0], [Math.PI / 2, 0]]) {
      const b = new THREE.Mesh(new THREE.BoxGeometry(2.3 * s * 1.15, 0.06, 0.06), toon(leg));
      b.position.y = y;
      b.rotation.y = ax;
      b.position.z = ax ? 0 : 0.98 * s * 1.1;
      b.position.x = ax ? 0.98 * s * 1.1 : 0;
      t.add(b);
      const b2 = b.clone();
      if (ax) b2.position.x *= -1; else b2.position.z *= -1;
      t.add(b2);
      void rx;
    }
  }
  const body = inked(new THREE.CylinderGeometry(1.45, 1.45, 1.7, 28), tank, 0.04);
  body.position.y = H + 0.85;
  t.add(body);
  const bottom = inked(new THREE.SphereGeometry(1.45, 28, 10, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), tank, 0.03);
  bottom.scale.y = 0.4;
  bottom.position.y = H;
  t.add(bottom);
  const roof = inked(new THREE.ConeGeometry(1.55, 0.95, 28), 0xd5dde1, 0.04);
  roof.position.y = H + 1.7 + 0.47;
  t.add(roof);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), toon(leg));
  cap.position.y = H + 2.7;
  t.add(cap);
  const rail = new THREE.Mesh(new THREE.TorusGeometry(1.62, 0.04, 6, 36), toon(leg));
  rail.rotation.x = Math.PI / 2;
  rail.position.y = H + 0.25;
  t.add(rail);
  const band = new THREE.Mesh(new THREE.CylinderGeometry(1.47, 1.47, 0.22, 28, 1, true), toon(0x6f9fc2));
  band.position.y = H + 0.95;
  t.add(band);
  return t;
}
