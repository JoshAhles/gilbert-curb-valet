import { shouldRunScene } from "./should-run.js";

function hasWebGL() {
  try {
    const c = document.createElement("canvas");
    return Boolean(c.getContext("webgl2") || c.getContext("webgl"));
  } catch {
    return false;
  }
}

function start() {
  const el = document.querySelector("[data-hero-scene]");
  if (!el) return;
  const ok = shouldRunScene({
    reducedMotion: matchMedia("(prefers-reduced-motion: reduce)").matches,
    webgl: hasWebGL(),
    saveData: Boolean(navigator.connection?.saveData),
    cores: navigator.hardwareConcurrency,
  });
  if (!ok) {
    document.body.classList.add("no-scene");
    return;
  }
  import("./mount.js").then((m) => m.mount(el)).catch(() => document.body.classList.add("no-scene"));
}

const idle = (fn) => ("requestIdleCallback" in window ? requestIdleCallback(fn, { timeout: 2000 }) : setTimeout(fn, 1200));
if (document.readyState === "complete") idle(start);
else addEventListener("load", () => idle(start), { once: true });
