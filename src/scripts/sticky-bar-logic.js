// Show the phone bar when both page forms are out of view, or while someone is typing in it.
// Never after they've joined.
export function barVisible({ heroFormInView, finalFormInView, isPhone, joined = false, typing = false }) {
  if (!isPhone || joined) return false;
  return typing || (!heroFormInView && !finalFormInView);
}
