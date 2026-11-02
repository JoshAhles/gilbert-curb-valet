import { test } from "node:test";
import assert from "node:assert/strict";
import { parseHTML } from "linkedom";

const FORM = `
<form data-signup data-source="hero" novalidate>
  <input type="email" name="email" />
  <input name="_gotcha" />
  <button type="submit"><span data-label>Save my spot</span></button>
  <p data-msg aria-live="polite">Free to join.</p>
  <div data-street-step hidden>
    <input name="street" />
    <button type="button" data-street-send>Send</button>
  </div>
</form>`;

async function setup({ elapsed = 5000, submitImpl } = {}) {
  const { window, document } = parseHTML(`<html><body>${FORM}</body></html>`);
  globalThis.window = window;
  globalThis.document = document;
  globalThis.CustomEvent = window.CustomEvent;
  const { wire } = await import("../src/scripts/signup-form.js");
  const calls = [];
  const submit = submitImpl ?? (async (_e, payload) => { calls.push(payload); return { ok: true }; });
  const now = () => elapsed; // ms since page start
  const form = document.querySelector("form");
  wire(form, { submit: async (e, p) => { calls.push(p); return submit === undefined ? { ok: true } : submitImpl ? submitImpl(e, p) : { ok: true }; }, now, startedAt: 0, track: () => {}, endpoint: "https://f" });
  const fire = () => form.dispatchEvent(new window.Event("submit", { cancelable: true }));
  return { form, calls, fire, document, window };
}
const tick = () => new Promise((r) => setTimeout(r, 0));

test("double submit while pending sends once", async () => {
  let release;
  const { form, calls, fire } = await setup({ submitImpl: () => new Promise((r) => { release = () => r({ ok: true }); }) });
  form.querySelector("[name=email]").value = "jo@ex.com";
  fire(); fire();
  await tick();
  assert.equal(calls.length, 1);
  release(); await tick();
});

test("failed submit keeps email and shows the error", async () => {
  const { form, fire } = await setup({ submitImpl: async () => ({ ok: false, error: "Network error. Check your connection and try again." }) });
  form.querySelector("[name=email]").value = "jo@ex.com";
  fire(); await tick(); await tick();
  assert.equal(form.querySelector("[name=email]").value, "jo@ex.com");
  assert.match(form.querySelector("[data-msg]").textContent, /Network error/);
});

test("bot-dropped sign-up never posts, even the street", async () => {
  const { form, calls, fire } = await setup({ elapsed: 100 });
  form.querySelector("[name=email]").value = "jo@ex.com";
  fire(); await tick();
  assert.equal(calls.length, 0);
  assert.match(form.querySelector("[data-msg]").textContent, /You're on the list/);
  form.querySelector("[name=street]").value = "W Main St";
  form.querySelector("[data-street-send]").click(); await tick();
  assert.equal(calls.length, 0);
});

test("real success shows street step and sends street once", async () => {
  const { form, calls, fire } = await setup();
  form.querySelector("[name=email]").value = "Jo@Ex.com";
  fire(); await tick(); await tick();
  assert.equal(calls.length, 1);
  assert.equal(form.querySelector("[data-street-step]").hidden, false);
  form.querySelector("[name=street]").value = " W Main St ";
  form.querySelector("[data-street-send]").click(); await tick(); await tick();
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1], { email: "jo@ex.com", street: "W Main St", _subject: "Gilbert Curb Valet street" });
});

test("invalid email does not submit", async () => {
  const { form, calls, fire } = await setup();
  form.querySelector("[name=email]").value = "nope";
  fire(); await tick();
  assert.equal(calls.length, 0);
  assert.match(form.querySelector("[data-msg]").textContent, /valid email/);
});

test("Enter in the street field sends the street", async () => {
  const { form, calls, fire, window } = await setup();
  form.querySelector("[name=email]").value = "jo@ex.com";
  fire(); await tick(); await tick();
  const st = form.querySelector("[name=street]");
  st.value = "W Elm St";
  const ev = new window.Event("keydown", { bubbles: true, cancelable: true });
  ev.key = "Enter"; // linkedom has no KeyboardEvent
  st.dispatchEvent(ev);
  await tick(); await tick();
  assert.equal(calls.length, 2);
});

test("empty street Send gives a hint", async () => {
  const { form, calls, fire } = await setup();
  form.querySelector("[name=email]").value = "jo@ex.com";
  fire(); await tick(); await tick();
  form.querySelector("[data-street-send]").click(); await tick();
  assert.equal(calls.length, 1);
  assert.match(form.querySelector("[data-msg]").textContent, /street/i);
});

test("success announces gcv:form success", async () => {
  const { form, fire, document } = await setup();
  const seen = [];
  document.addEventListener("gcv:form", (e) => seen.push(e.detail.type));
  form.querySelector("[name=email]").value = "jo@ex.com";
  fire(); await tick(); await tick();
  assert.ok(seen.includes("success"));
});
