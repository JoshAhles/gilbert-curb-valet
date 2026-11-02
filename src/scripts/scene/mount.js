import * as THREE from "three";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { makeCart, makeYard, makeTruck, makeWaterTower } from "./models.js";
import { sceneStateAt, beatIndex } from "./timeline.js";

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const C = (hex) => new THREE.Color(hex);
// Sky colors at dusk (0), night (0.5), morning (1): [top, bottom].
const SKY = [[C(0xf59a6b), C(0xffd8a8)], [C(0x1d1840), C(0x4a2f5e)], [C(0xffb88a), C(0xfff1d6)]];
const SUN = [C(0xffb27a), C(0x8f9cff), C(0xfff0d8)];

function mix3(stops, phase) {
  const t = phase * 2;
  return t <= 1 ? stops[0].clone().lerp(stops[1], t) : stops[1].clone().lerp(stops[2], t - 1);
}

const CART_FROM = -3.2, CART_TO = 4.0, CURB_Z = 3.4;

export function mount(el) {
  const lite = matchMedia("(max-width: 767px)").matches;
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(devicePixelRatio, lite ? 1.5 : 2));
  renderer.setClearColor(0x000000, 0);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  el.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const target = new THREE.Vector3(0.4, 1.5, 0.9);

  const hemi = new THREE.HemisphereLight(0xfff3e0, 0xc89a6a, 1.1);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.castShadow = true;
  sun.shadow.mapSize.set(lite ? 512 : 1024, lite ? 512 : 1024);
  Object.assign(sun.shadow.camera, { left: -9, right: 9, top: 9, bottom: -9, near: 0.5, far: 40 });
  sun.shadow.bias = -0.0008;
  scene.add(sun, sun.target);

  const yard = makeYard({ lite });
  scene.add(yard);
  const lamp = yard.getObjectByName("lamp");

  // Gilbert's water tower stands off in the distance behind the house.
  const tower = makeWaterTower();
  // Placed so the tank peeks over the roofline on desktop (checked by projecting to screen).
  tower.position.set(-4, 0, -20);
  tower.scale.setScalar(0.62);
  tower.traverse((o) => { if (o.isMesh) o.castShadow = false; });
  scene.add(tower);

  const trash = makeCart({ body: 0x2c2c2e, lid: 0x3d3d40 });
  const recycle = makeCart({ body: 0x2f6fd0, lid: 0x3f86e6 });
  const carts = [
    { obj: trash, x: 0.05, lag: 0 },
    { obj: recycle, x: 1.15, lag: 0.035 },
  ];
  for (const c of carts) scene.add(c.obj);

  const truck = makeTruck();
  truck.position.z = 5.9;
  truck.traverse((o) => { if (o.isMesh) o.castShadow = !lite; });
  scene.add(truck);

  const starGeo = new THREE.BufferGeometry();
  const pts = [];
  let seed = 3;
  const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  for (let i = 0; i < 90; i++) pts.push(-16 + rnd() * 32, 5 + rnd() * 9, -14 - rnd() * 4);
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(pts, 3));
  const starMat = new THREE.PointsMaterial({ color: 0xfff6d8, size: 0.09, transparent: true, opacity: 0 });
  scene.add(new THREE.Points(starGeo, starMat));

  // Sun sets behind the house at dusk and rises on the right in the morning; a moon shows at night.
  const sunDisc = new THREE.Mesh(new THREE.CircleGeometry(1.1, 32), new THREE.MeshBasicMaterial({ color: 0xffe6a8, transparent: true }));
  const moon = new THREE.Mesh(new THREE.CircleGeometry(0.6, 32), new THREE.MeshBasicMaterial({ color: 0xfff6e0, transparent: true, opacity: 0 }));
  moon.position.set(3.5, 7.2, -16);
  scene.add(sunDisc, moon);

  const steps = [...document.querySelectorAll("[data-beat]")];
  const stage = document.querySelector("[data-stage]");

  function apply(p) {
    const s = sceneStateAt(p);
    for (const c of carts) {
      const cs = c.lag ? sceneStateAt(Math.max(0, p - c.lag)) : s;
      const z = CART_FROM + (CART_TO - CART_FROM) * cs.cartZ;
      const bump = 0.16 * Math.max(0, 1 - Math.abs(z - CURB_Z) / 0.35);
      const moving = Math.min(1, 4 * Math.min(cs.cartZ, 1 - cs.cartZ));
      c.obj.position.set(c.x, bump, z);
      c.obj.rotation.x = -0.3 * moving;
      c.obj.getObjectByName("lid").rotation.x = -1.3 * s.lidOpen;
      c.obj.getObjectByName("wheelL").rotation.x = cs.wheelTurn;
      c.obj.getObjectByName("wheelR").rotation.x = cs.wheelTurn;
    }
    truck.position.x = s.truckX * 9;

    const night = Math.max(0, 1 - Math.abs(s.dayPhase - 0.5) * 4);
    const top = mix3(SKY.map((x) => x[0]), s.dayPhase);
    const bottom = mix3(SKY.map((x) => x[1]), s.dayPhase);
    // The whole stage wears the scene's sky, so the scene reads as the page, not a box on it.
    stage.style.setProperty("--stage-top", `#${top.getHexString()}`);
    stage.style.setProperty("--stage-bottom", `#${bottom.getHexString()}`);
    // Flip to light text where the sky gets dark enough (average relative luminance; THREE colors are linear).
    const lum = (c) => 0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b;
    if ((lum(top) + lum(bottom)) / 2 < 0.2) stage.setAttribute("data-night", "");
    else stage.removeAttribute("data-night");
    sun.color.copy(mix3(SUN, s.dayPhase));
    sun.intensity = 2.4 - 1.7 * night;
    hemi.intensity = 1.15 - 0.55 * night;
    const ang = Math.PI * (0.15 + 0.7 * (1 - s.dayPhase));
    sun.position.set(Math.cos(ang) * 12, 6 + 6 * Math.sin(ang * 0.5) - 3 * night, 8);
    starMat.opacity = night;
    moon.material.opacity = night;
    const dist = Math.abs(s.dayPhase - 0.5) * 2; // 1 at dusk/morning, 0 at midnight
    sunDisc.position.set(s.dayPhase < 0.5 ? -4 : 4.5, -1 + 9 * dist, -16);
    sunDisc.material.color.setHex(s.dayPhase < 0.5 ? 0xffc27a : 0xffe6a8);
    sunDisc.lookAt(camera.position);
    moon.lookAt(camera.position);
    lamp.material.color.setHex(night > 0.2 ? 0xffe9a8 : 0xf6d79a);

    const bi = beatIndex(p);
    const active = bi === 0 ? 1 : bi === 3 ? 3 : 2;
    steps.forEach((st) => st.classList.toggle("is-active", Number(st.dataset.beat) === active));
  }

  function resize() {
    const w = el.clientWidth, h = el.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Wide screens: push the yard to the right, text lives on the left.
    // Phones: push it down, text lives in the sky above.
    // Phones show the scene in a card: center it.
    const far = lite ? 10 / Math.max(Math.min(camera.aspect, 1), 0.6) : 12.5;
    camera.position.set(target.x + 0.42 * far, target.y + 0.2 * far, target.z + 0.88 * far);
    camera.lookAt(target);
    if (lite) camera.clearViewOffset();
    else camera.setViewOffset(w, h, -w * 0.2, h * 0.08, w, h);
    camera.updateProjectionMatrix();
  }

  let progress = 0;
  let first = true;
  const render = () => {
    apply(progress);
    renderer.render(scene, camera);
    if (first) { first = false; el.classList.add("live"); document.body.classList.add("scene-on"); window.__sceneReady = true; }
  };

  resize();
  const ro = new ResizeObserver(() => { resize(); render(); });
  ro.observe(el);

  const forced = import.meta.env.DEV ? new URLSearchParams(location.search).get("beat") : null;
  let trigger;
  if (forced !== null) {
    progress = Number(forced);
  } else {
    let queued = false;
    const schedule = () => { if (!queued) { queued = true; requestAnimationFrame(() => { queued = false; render(); }); } };
    // Desktop: the whole stage drives the scene. Phones: the steps under the sticky card do.
    const range = lite
      ? { trigger: "#how", start: "top 60%", end: "bottom bottom" }
      : { trigger: stage, start: "top top", end: "bottom bottom" };
    // A tween on a proxy lets GSAP's scrub smooth out jumpy wheel and trackpad scrolling.
    const proxy = { p: 0 };
    const tween = gsap.to(proxy, {
      p: 1,
      ease: "none",
      scrollTrigger: { ...range, scrub: 0.4 },
      onUpdate: () => { progress = proxy.p; schedule(); },
    });
    trigger = tween.scrollTrigger;
    progress = proxy.p;
  }
  render();

  return () => {
    trigger?.kill();
    ro.disconnect();
    renderer.dispose();
    renderer.domElement.remove();
  };
}
