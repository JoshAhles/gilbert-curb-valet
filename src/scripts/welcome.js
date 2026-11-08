// The postcard QR code links to ?utm_source=postcard. Greet those visitors so the page matches the card
// they're holding. Kept general (no neighborhood) so the same card works on any route.
export function welcomeFor(search) {
  return new URLSearchParams(search).get("utm_source")?.toLowerCase() === "postcard" ? "Got our postcard? Welcome, neighbor." : null;
}
