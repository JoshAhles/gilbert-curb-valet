// Sign-up logic. Pure functions so they can be tested in Node.
// Measured from page start. Low enough for a person using email autofill, high enough to stop instant bot posts.
export const MIN_FILL_MS = 1500;
export const TIMEOUT_MS = 15000;

const clean = (s) => String(s ?? "").trim();

export function validateEmail(str) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(clean(str));
}

export function buildPayload({ email, source, gotcha }) {
  return { email: clean(email).toLowerCase(), source, _subject: "Gilbert Curb Valet sign-up", _gotcha: gotcha ?? "" };
}

export function buildStreetPayload({ email, street }) {
  return { email: clean(email).toLowerCase(), street: clean(street).slice(0, 120), _subject: "Gilbert Curb Valet street" };
}

// Honeypot filled, or sent faster than a person can type an email.
export function looksLikeBot({ gotcha, elapsedMs }) {
  return Boolean(clean(gotcha)) || Number(elapsedMs) < MIN_FILL_MS;
}

export function shouldSendStreet({ droppedAsBot, street }) {
  return !droppedAsBot && clean(street).length > 0;
}

export async function submit(endpoint, payload, fetchImpl = globalThis.fetch, timeoutMs = TIMEOUT_MS) {
  if (!endpoint) return { ok: false, error: "Sign-ups aren't open quite yet. Please check back soon." };
  try {
    const res = await fetchImpl(endpoint, {
      method: "POST",
      signal: AbortSignal.timeout(timeoutMs),
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(payload),
    });
    if (res.ok) return { ok: true };
    let msg = "Something went wrong. Try again.";
    try {
      const data = await res.json();
      msg = data?.errors?.[0]?.message || msg;
    } catch {}
    return { ok: false, error: msg };
  } catch {
    return { ok: false, error: "Network error. Check your connection and try again." };
  }
}
