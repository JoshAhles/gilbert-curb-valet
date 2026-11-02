import { buildPayload, buildStreetPayload, validateEmail, looksLikeBot, shouldSendStreet, submit as realSubmit } from "../lib/signup.js";

export const SUCCESS = "You're on the list. We'll email you when your street opens.";
const STREET_THANKS = "Thanks. That helps us plan routes.";

const emit = (type, source) => document.dispatchEvent(new CustomEvent("gcv:form", { detail: { type, source } }));

// deps are injectable so tests can fake the network and the clock.
export function wire(form, deps = {}) {
  if (form.dataset.wired) return;
  form.dataset.wired = "1";
  // Elapsed time counts from page start (performance.now), not from when this script ran.
  const { submit = realSubmit, now = () => performance.now(), startedAt = 0, endpoint = "" } = deps;
  const source = form.dataset.source;
  const email = form.querySelector('input[name="email"]');
  const gotcha = form.querySelector('input[name="_gotcha"]');
  const btn = form.querySelector("button[type=submit]");
  const label = btn.querySelector("[data-label]");
  const msg = form.querySelector("[data-msg]");
  const step = form.querySelector("[data-street-step]");
  const street = step?.querySelector('input[name="street"]');
  const streetSend = step?.querySelector("[data-street-send]");
  let started = false;
  let sending = false;
  let droppedAsBot = false;
  let savedEmail = "";

  const setMsg = (text, tone) => {
    msg.textContent = text;
    msg.dataset.tone = tone || "";
  };
  const done = () => {
    label.textContent = "Spot saved";
    btn.disabled = true;
    email.value = "";
    setMsg(SUCCESS, "ok");
    if (step) step.hidden = false;
  };

  email.addEventListener("input", () => {
    if (!started) { started = true; emit("start", source); }
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (sending) return;
    if (!validateEmail(email.value)) {
      setMsg("Enter a valid email address.", "err");
      email.focus?.();
      return;
    }
    if (looksLikeBot({ gotcha: gotcha?.value, elapsedMs: now() - startedAt })) {
      // Look successful so bots learn nothing; send nothing.
      droppedAsBot = true;
      done();
      return;
    }
    sending = true;
    btn.disabled = true;
    label.textContent = "Sending…";
    const payload = buildPayload({ email: email.value, source, gotcha: gotcha?.value });
    const res = await submit(endpoint, payload);
    sending = false;
    if (res.ok) {
      savedEmail = payload.email;
      done();
      emit("success", source);
    } else {
      btn.disabled = false;
      label.textContent = "Save my spot";
      setMsg(res.error, "err");
      emit("error", source);
    }
  });

  const sendStreet = async () => {
    if (!droppedAsBot && !street.value.trim()) {
      setMsg("Type your street name, or skip this. You're already on the list.", "");
      street.focus?.();
      return;
    }
    if (!shouldSendStreet({ droppedAsBot, street: street.value })) {
      step.hidden = true;
      setMsg(STREET_THANKS, "ok");
      return;
    }
    streetSend.disabled = true;
    const res = await submit(endpoint, buildStreetPayload({ email: savedEmail, street: street.value }));
    if (res.ok) {
      step.hidden = true;
      setMsg(STREET_THANKS, "ok");
      emit("street", source);
    } else {
      streetSend.disabled = false;
      setMsg(res.error, "err");
    }
  };
  streetSend?.addEventListener("click", sendStreet);
  // The main button is locked after success, so Enter/Go in the street field would do nothing on its own.
  street?.addEventListener("keydown", (e) => {
    if (e.key === "Enter") { e.preventDefault(); sendStreet(); }
  });
}
